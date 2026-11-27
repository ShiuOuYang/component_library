/**
 * FMEA 分析表（ChptFmeaTable）的資料模型與計算。
 *
 * 每一列是一個失效模式：嚴重度 S、發生度 O、偵測度 D 各 1–10。
 * - RPN = S × O × D（傳統做法，1–1000）
 * - AP（Action Priority，AIAG-VDA FMEA 手冊 2019）：依 S、O、D 的組合查表得 H / M / L。
 *   RPN 的問題是不同組合乘出同樣的數字（例如 S10 O1 D10 與 S1 O10 D10 都是 100），
 *   AP 先看嚴重度、再看發生度、最後才看偵測度，嚴重度高的失效不會被低分數掩蓋。
 * 改善對策（actions）完成後重新評分（revised），可以看改善前後的 RPN / AP。
 */
import { toTime } from './storage'

export type FmeaPriority = 'H' | 'M' | 'L'

export interface FmeaRatings {
  /** 嚴重度 1–10 */
  severity: number
  /** 發生度 1–10 */
  occurrence: number
  /** 偵測度 1–10（越難偵測越高） */
  detection: number
}

export interface FmeaAction {
  id: string
  /** 對策內容 */
  text: string
  /** 負責人 */
  owner?: string
  /** 期限（YYYY-MM-DD、epoch ms 或 Date） */
  due?: string | number | Date | null
  /** 已完成 */
  done?: boolean
}

export interface FmeaRow extends FmeaRatings {
  id: string
  /** 製程步驟 / 功能 */
  item: string
  /** 失效模式 */
  failureMode: string
  /** 失效影響 */
  effect?: string
  /** 失效原因 */
  cause?: string
  /** 現行預防管制 */
  prevention?: string
  /** 現行偵測管制 */
  detectionControl?: string
  /** 特殊特性：CC 關鍵（安全 / 法規）、SC 重要 */
  special?: 'CC' | 'SC' | null
  /** 改善對策 */
  actions?: FmeaAction[]
  /** 對策完成後的重新評分 */
  revised?: FmeaRatings | null
}

/** 評分限制在 1–10 的整數（缺值當 1：未評分時不讓 RPN 變成 0 或 NaN） */
export function clampRating(v: unknown): number {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : 1
}

export function rpnOf(r: FmeaRatings): number {
  return clampRating(r.severity) * clampRating(r.occurrence) * clampRating(r.detection)
}

/**
 * AIAG-VDA 的 AP 表。列：嚴重度區間；欄：發生度區間；值：依偵測度 [7–10, 5–6, 2–4, 1] 的優先等級。
 * 發生度區間順序：[8–10, 6–7, 4–5, 2–3, 1]。
 */
const AP_TABLE: Record<'s9' | 's7' | 's4' | 's2', FmeaPriority[][]> = {
  s9: [
    ['H', 'H', 'H', 'H'],
    ['H', 'H', 'H', 'H'],
    ['H', 'H', 'H', 'M'],
    ['H', 'M', 'L', 'L'],
    ['L', 'L', 'L', 'L'],
  ],
  s7: [
    ['H', 'H', 'H', 'H'],
    ['H', 'H', 'H', 'M'],
    ['H', 'M', 'M', 'M'],
    ['M', 'M', 'L', 'L'],
    ['L', 'L', 'L', 'L'],
  ],
  s4: [
    ['H', 'H', 'M', 'M'],
    ['M', 'M', 'M', 'L'],
    ['M', 'L', 'L', 'L'],
    ['L', 'L', 'L', 'L'],
    ['L', 'L', 'L', 'L'],
  ],
  s2: [
    ['M', 'M', 'L', 'L'],
    ['L', 'L', 'L', 'L'],
    ['L', 'L', 'L', 'L'],
    ['L', 'L', 'L', 'L'],
    ['L', 'L', 'L', 'L'],
  ],
}

export function actionPriority(r: FmeaRatings): FmeaPriority {
  const s = clampRating(r.severity)
  const o = clampRating(r.occurrence)
  const d = clampRating(r.detection)
  if (s === 1) return 'L'
  const band = s >= 9 ? 's9' : s >= 7 ? 's7' : s >= 4 ? 's4' : 's2'
  const oi = o >= 8 ? 0 : o >= 6 ? 1 : o >= 4 ? 2 : o >= 2 ? 3 : 4
  const di = d >= 7 ? 0 : d >= 5 ? 1 : d >= 2 ? 2 : 3
  return AP_TABLE[band][oi][di]
}

const PRIORITY_RANK: Record<FmeaPriority, number> = { H: 3, M: 2, L: 1 }

export type FmeaActionState = 'none' | 'open' | 'overdue' | 'done'

/**
 * 日期 → 當地日曆日的鍵（yyyymmdd）。只有日期的字串（YYYY-MM-DD）當成當地日期：
 * Date.parse 會把它當 UTC 午夜，台灣早上 8 點前會差一天。
 */
export function localDayKey(v: string | number | Date | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim())
    if (m) return Number(m[1]) * 10000 + Number(m[2]) * 100 + Number(m[3])
  }
  const t = toTime(v)
  if (t === null) return null
  const d = new Date(t)
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

/** 對策是否逾期：未完成且期限早於 today 那天（期限當天不算逾期） */
export function actionOverdue(a: FmeaAction, today: number | string | Date = Date.now()): boolean {
  if (a.done) return false
  const due = localDayKey(a.due)
  const now = localDayKey(today)
  return due !== null && now !== null && due < now
}

/** 一列的對策狀態：沒有對策 / 有未完成 / 有逾期 / 全部完成 */
export function actionState(row: FmeaRow, today?: number | string | Date): FmeaActionState {
  const list = row.actions ?? []
  if (!list.length) return 'none'
  if (list.some((a) => actionOverdue(a, today))) return 'overdue'
  return list.every((a) => a.done) ? 'done' : 'open'
}

export interface FmeaSummary {
  total: number
  byPriority: Record<FmeaPriority, number>
  /** RPN 達門檻的列數 */
  overThreshold: number
  maxRpn: number
  /** 未完成的對策數 */
  openActions: number
  overdueActions: number
  /** AP 為 H 但還沒有任何對策的列數（需要處理卻沒人處理） */
  highWithoutAction: number
  /** 有重新評分的列，改善前後 RPN 合計 */
  rpnBefore: number
  rpnAfter: number
}

export function fmeaSummary(rows: FmeaRow[], options: { threshold?: number; today?: number | string | Date } = {}): FmeaSummary {
  const threshold = options.threshold ?? Infinity
  const s: FmeaSummary = {
    total: rows.length,
    byPriority: { H: 0, M: 0, L: 0 },
    overThreshold: 0,
    maxRpn: 0,
    openActions: 0,
    overdueActions: 0,
    highWithoutAction: 0,
    rpnBefore: 0,
    rpnAfter: 0,
  }
  for (const r of rows) {
    const ap = actionPriority(r)
    const rpn = rpnOf(r)
    s.byPriority[ap]++
    if (rpn >= threshold) s.overThreshold++
    s.maxRpn = Math.max(s.maxRpn, rpn)
    const actions = r.actions ?? []
    if (ap === 'H' && !actions.length) s.highWithoutAction++
    for (const a of actions) {
      if (!a.done) s.openActions++
      if (actionOverdue(a, options.today)) s.overdueActions++
    }
    if (r.revised) {
      s.rpnBefore += rpn
      s.rpnAfter += rpnOf(r.revised)
    }
  }
  return s
}

export type FmeaSortKey = 'none' | 'ap' | 'rpn' | 'severity'

/**
 * 排序（不改原陣列）。ap：先 AP、再嚴重度、再 RPN；rpn：RPN 由高到低；severity：嚴重度、再 RPN。
 * 同分維持原順序（穩定排序）。
 */
export function sortFmea(rows: FmeaRow[], key: FmeaSortKey): FmeaRow[] {
  if (key === 'none') return rows.slice()
  const score = (r: FmeaRow): number[] => {
    const rpn = rpnOf(r)
    const s = clampRating(r.severity)
    if (key === 'ap') return [PRIORITY_RANK[actionPriority(r)], s, rpn]
    if (key === 'rpn') return [rpn, s]
    return [s, rpn]
  }
  return rows
    .map((r, i) => ({ r, i, k: score(r) }))
    .sort((a, b) => {
      for (let j = 0; j < a.k.length; j++) if (a.k[j] !== b.k[j]) return b.k[j] - a.k[j]
      return a.i - b.i
    })
    .map((x) => x.r)
}

export interface FmeaFilter {
  /** 只看這些 AP */
  priorities?: FmeaPriority[]
  /** 關鍵字：比對步驟、失效模式、影響、原因、管制與對策 */
  query?: string
}

export function filterFmea(rows: FmeaRow[], filter: FmeaFilter): FmeaRow[] {
  const q = (filter.query ?? '').trim().toLowerCase()
  const pri = filter.priorities?.length ? new Set(filter.priorities) : null
  return rows.filter((r) => {
    if (pri && !pri.has(actionPriority(r))) return false
    if (!q) return true
    const hay = [r.item, r.failureMode, r.effect, r.cause, r.prevention, r.detectionControl, ...(r.actions ?? []).flatMap((a) => [a.text, a.owner])]
    return hay.some((v) => typeof v === 'string' && v.toLowerCase().includes(q))
  })
}

let seq = 0
/** 產生列 / 對策的 id（只在用戶端互動時呼叫，不影響 SSR） */
export function fmeaId(prefix = 'f'): string {
  seq += 1
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}`
}

/** 新的一列（評分預設 5 / 5 / 5：中間值，提醒使用者要評，又不會被當成已經很安全） */
export function createFmeaRow(partial: Partial<FmeaRow> = {}): FmeaRow {
  return { id: fmeaId('r'), item: '', failureMode: '', severity: 5, occurrence: 5, detection: 5, actions: [], revised: null, ...partial }
}

/** 一列的部分欄位換成新值（不可變更新） */
export function updateFmeaRow(rows: FmeaRow[], id: string, patch: Partial<FmeaRow>): FmeaRow[] {
  return rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
}

/** 匯出用的平面資料：每列一筆，對策合併成一格（換行分隔） */
export function fmeaExportRows(rows: FmeaRow[], formatDate: (v: FmeaAction['due']) => string = (v) => (v === null || v === undefined ? '' : String(v))): Record<string, unknown>[] {
  return rows.map((r) => ({
    item: r.item,
    failureMode: r.failureMode,
    effect: r.effect ?? '',
    special: r.special ?? '',
    severity: clampRating(r.severity),
    cause: r.cause ?? '',
    prevention: r.prevention ?? '',
    occurrence: clampRating(r.occurrence),
    detectionControl: r.detectionControl ?? '',
    detection: clampRating(r.detection),
    rpn: rpnOf(r),
    ap: actionPriority(r),
    actions: (r.actions ?? [])
      .map((a) => [a.done ? '[x]' : '[ ]', a.text, a.owner, formatDate(a.due)].filter(Boolean).join(' '))
      .join('\n'),
    revisedSeverity: r.revised ? clampRating(r.revised.severity) : '',
    revisedOccurrence: r.revised ? clampRating(r.revised.occurrence) : '',
    revisedDetection: r.revised ? clampRating(r.revised.detection) : '',
    revisedRpn: r.revised ? rpnOf(r.revised) : '',
    revisedAp: r.revised ? actionPriority(r.revised) : '',
  }))
}
