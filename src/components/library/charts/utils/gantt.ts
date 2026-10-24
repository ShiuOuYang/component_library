/**
 * GanttChart 的純函式：時間解析、任務整理、時間軸分層、文字寬度估算
 *
 * 抽出來是為了能直接測 —— 這些都是不看畫面就能判斷對錯的邏輯。
 */

import * as d3 from 'd3'

// 文字量測與文字色已移到 chartText（其他圖表也要用）；這裡保留匯出，舊的 import 不會壞
export { estimateTextWidth, readableTextColor } from './chartText'

/** 一天的毫秒數 */
export const DAY = 86_400_000
const HOUR = 3_600_000
const MINUTE = 60_000

/** 只有日期、沒有時間的字串：2026-10-24、2026/10/24 */
const DATE_ONLY = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/

/** 時間值是否為「只有日期」的字串 */
export function isDateOnly(value: unknown): boolean {
  return typeof value === 'string' && DATE_ONLY.test(value.trim())
}

/**
 * 把任務的時間值轉成毫秒；不合法時回傳 NaN。
 *
 * 🔧 'YYYY-MM-DD' 交給 Date.parse 會被當成 UTC 午夜 —— 在台灣變成早上 8 點，
 *    整條任務往右偏 8 小時、日格線也對不齊。只有日期的字串一律當成本地時間的午夜。
 */
export function parseTime(value: unknown): number {
  if (value === null || value === undefined || value === '') return NaN
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN
  if (typeof value === 'string') {
    const s = value.trim()
    const m = DATE_ONLY.exec(s)
    if (m) {
      const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      // 2026-02-31 這種不存在的日期：Date 會自動進位，視為不合法
      return d.getMonth() === Number(m[2]) - 1 ? d.getTime() : NaN
    }
    const t = Date.parse(s)
    return Number.isFinite(t) ? t : NaN
  }
  return NaN
}

/** 一列（泳道） */
export interface GanttRowDef {
  value: string
  label: string
}

/** 整理後的任務 */
export interface GanttTask {
  /** 在原始資料中的索引 */
  index: number
  key: string
  row: string
  label: string
  start: number
  /** 長條結束的時間點（只寫日期且 inclusiveEndDate 時是隔天 00:00） */
  end: number
  /** 給人看的結束時間（只寫日期且 inclusiveEndDate 時就是那一天，不是隔天） */
  displayEnd: number
  /** 0～1；沒有給進度時為 null */
  progress: number | null
  status: string
  milestone: boolean
}

export interface NormalizeOptions {
  keyField: string
  keyFn: ((datum: Record<string, unknown>, index: number) => string) | null
  rowField: string
  labelField: string
  startField: string
  endField: string
  progressField: string
  statusField: string
  milestoneField: string
  /** 結束時間只寫日期時，算到那一天結束 */
  inclusiveEndDate: boolean
}

/** 進度：接受 0～100 的百分比；超出範圍夾回 0～100，不是數字時視為沒有進度 */
function toProgress(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.min(1, Math.max(0, n / 100))
}

/**
 * 把原始資料整理成任務清單。
 *
 * - 開始時間不合法的任務略過（回傳 skipped 筆數，讓呼叫端知道有資料沒畫出來）
 * - 沒有結束時間、或 milestoneField 為真 → 里程碑（畫成菱形）
 * - 結束早於開始 → 兩者互換（畫成負寬度什麼都看不到，更難發現資料錯誤）
 * - 沒有列欄位的任務自成一列（以任務名稱為列名）
 */
export function normalizeTasks(rows: Record<string, unknown>[], o: NormalizeOptions): { tasks: GanttTask[]; skipped: number } {
  const tasks: GanttTask[] = []
  let skipped = 0
  for (let i = 0; i < rows.length; i++) {
    const d = rows[i] ?? {}
    const start = parseTime(d[o.startField])
    if (!Number.isFinite(start)) {
      skipped++
      continue
    }
    const rawEnd = d[o.endField]
    let end = parseTime(rawEnd)
    const explicitMilestone = Boolean(d[o.milestoneField])
    const milestone = explicitMilestone || !Number.isFinite(end)
    let shift = 0
    if (milestone) end = start
    else if (o.inclusiveEndDate && isDateOnly(rawEnd)) shift = DAY
    const rawKey = o.keyFn ? o.keyFn(d, i) : d[o.keyField]
    const key = rawKey === null || rawKey === undefined || rawKey === '' ? String(i) : String(rawKey)
    const label = String(d[o.labelField] ?? '')
    const rawRow = d[o.rowField]
    const row = rawRow === null || rawRow === undefined || rawRow === '' ? label || key : String(rawRow)
    tasks.push({
      index: i,
      key,
      row,
      label,
      start: Math.min(start, end),
      end: Math.max(start, end) + shift,
      displayEnd: Math.max(start, end),
      progress: milestone ? null : toProgress(d[o.progressField]),
      status: String(d[o.statusField] ?? ''),
      milestone,
    })
  }
  return { tasks, skipped }
}

/**
 * 決定列的順序。
 * 有給 rows 時照給的順序（資料裡有、清單沒列到的列接在後面，不會讓任務消失）；
 * 沒給時照資料第一次出現的順序。
 */
export function buildRows(
  tasks: GanttTask[],
  rows: Array<string | number | { value: string | number; label?: string }> | null
): GanttRowDef[] {
  const out: GanttRowDef[] = []
  const seen = new Set<string>()
  for (const r of rows ?? []) {
    const value = String(typeof r === 'object' && r !== null ? r.value : r)
    if (seen.has(value)) continue
    seen.add(value)
    const label = typeof r === 'object' && r !== null && r.label !== undefined ? r.label : value
    out.push({ value, label })
  }
  for (const t of tasks) {
    if (seen.has(t.row)) continue
    seen.add(t.row)
    out.push({ value: t.row, label: t.row })
  }
  return out
}

/** 任務的時間範圍（含兩端外推）；沒有任務時以 today 為中心前後一週 */
export function timeExtent(tasks: GanttTask[], padRatio: number, today: number): [number, number] {
  if (!tasks.length) return [today - 7 * DAY, today + 7 * DAY]
  let lo = Infinity
  let hi = -Infinity
  for (const t of tasks) {
    if (t.start < lo) lo = t.start
    if (t.end > hi) hi = t.end
  }
  // 🔧 只有一個里程碑（或所有任務同一時刻）時範圍是 0：前後各留一天，比例尺才不會壞
  if (hi - lo <= 0) return [lo - DAY, hi + DAY]
  const pad = (hi - lo) * Math.max(0, padRatio)
  return [lo - pad, hi + pad]
}

/** 時間軸的上下兩層 */
export interface TimeTiers {
  /** 下層（主要刻度）的格式 */
  lowerFormat: (d: Date) => string
  /** 上層（較大單位）的區間與格式；刻度已經是年時沒有上層 */
  upper: { interval: d3.CountableTimeInterval; format: (d: Date) => string } | null
}

/**
 * 依刻度間距決定兩層時間軸的單位：
 * 小時刻度 → 上層是日期；日刻度 → 上層是月；月刻度 → 上層是年；年刻度 → 只有一層。
 * d3 預設的多尺度格式是英文（"October"、"Wed 07"），這裡改成中文慣用的寫法。
 */
export function timeTiers(step: number): TimeTiers {
  if (step < MINUTE) {
    return { lowerFormat: d3.timeFormat('%H:%M:%S'), upper: { interval: d3.timeDay, format: d3.timeFormat('%Y/%m/%d') } }
  }
  if (step < DAY) {
    return { lowerFormat: d3.timeFormat('%H:%M'), upper: { interval: d3.timeDay, format: d3.timeFormat('%Y/%m/%d') } }
  }
  if (step < 28 * DAY) {
    return { lowerFormat: d3.timeFormat('%-d'), upper: { interval: d3.timeMonth, format: d3.timeFormat('%Y 年 %-m 月') } }
  }
  if (step < 365 * DAY) {
    return { lowerFormat: d3.timeFormat('%-m 月'), upper: { interval: d3.timeYear, format: d3.timeFormat('%Y 年') } }
  }
  return { lowerFormat: d3.timeFormat('%Y'), upper: null }
}

/** 上層時間軸的一段（例如「2026 年 10 月」） */
export interface UpperSegment {
  start: number
  end: number
  label: string
}

/** 把畫面範圍切成上層單位的區段；兩端的區段截到畫面範圍內 */
export function upperSegments(domain: [number, number], tiers: TimeTiers, limit = 500): UpperSegment[] {
  if (!tiers.upper) return []
  const [d0, d1] = domain
  const { interval, format } = tiers.upper
  const out: UpperSegment[] = []
  let cursor = interval.floor(new Date(d0))
  while (cursor.getTime() < d1 && out.length < limit) {
    const next = interval.offset(cursor, 1)
    out.push({ start: Math.max(d0, cursor.getTime()), end: Math.min(d1, next.getTime()), label: format(cursor) })
    cursor = next
  }
  return out
}

/** 期間的中文寫法：3 天 4 小時、2 小時 30 分、45 分 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0 分'
  const days = Math.floor(ms / DAY)
  const hours = Math.floor((ms % DAY) / HOUR)
  const minutes = Math.round((ms % HOUR) / MINUTE)
  if (days > 0) return hours > 0 ? `${days} 天 ${hours} 小時` : `${days} 天`
  if (hours > 0) return minutes > 0 ? `${hours} 小時 ${minutes} 分` : `${hours} 小時`
  return `${Math.max(1, minutes)} 分`
}

/** 依列分組任務索引（列順序對應 rows） */
export function groupByRow(tasks: GanttTask[], rows: GanttRowDef[]): number[][] {
  const pos = new Map(rows.map((r, i) => [r.value, i]))
  const groups = rows.map(() => [] as number[])
  tasks.forEach((t, i) => {
    const r = pos.get(t.row)
    if (r !== undefined) groups[r].push(i)
  })
  return groups
}

// === 編輯：吸附 ===

/** 吸附設定：'auto' 依縮放程度自動選；數字是毫秒；null 不吸附 */
export type GanttSnap = 'auto' | 'minute' | 'hour' | 'day' | number | null

const SNAP_UNITS: Record<'minute' | 'hour' | 'day', number> = { minute: MINUTE, hour: HOUR, day: DAY }
/** auto 的候選單位，由小到大 */
const AUTO_UNITS = [MINUTE, 5 * MINUTE, 15 * MINUTE, HOUR, DAY]

/**
 * 吸附單位（毫秒；0 = 不吸附）。
 * auto：挑畫面上至少 8px 寬的最小單位 —— 看日的時候以天為單位，放大到小時就以 15 分、5 分為單位，
 * 滑鼠才拖得準（太細的單位一個像素就跳好幾格）。
 */
export function resolveSnap(snap: GanttSnap, msPerPx: number): number {
  if (snap === null) return 0
  if (typeof snap === 'number') return Number.isFinite(snap) && snap > 0 ? snap : 0
  if (snap !== 'auto') return SNAP_UNITS[snap]
  for (const unit of AUTO_UNITS) if (unit / msPerPx >= 8) return unit
  return DAY
}

/** 位移量吸附（移動任務：保留原本的時刻，例如 08:00 開始的工單往後拖一天還是 08:00） */
export function snapDelta(dt: number, unit: number): number {
  return unit > 0 ? Math.round(dt / unit) * unit : dt
}

/**
 * 時間點吸附（拉長縮短：邊緣對齊整點、整天）。
 * 以本地時間對齊 —— 直接 Math.round(t / DAY) 會對齊 UTC 午夜，在台灣變成早上 8 點。
 */
export function snapEdge(t: number, unit: number): number {
  if (unit <= 0) return t
  if (unit >= DAY) return d3.timeDay.round(new Date(t)).getTime()
  const base = d3.timeDay.floor(new Date(t)).getTime()
  return base + Math.round((t - base) / unit) * unit
}

// === 相依關係 ===

/** 一條相依（前置任務 → 後續任務，完成才開始） */
export interface GanttLink {
  /** 前置任務在 tasks 中的索引 */
  from: number
  /** 後續任務在 tasks 中的索引 */
  to: number
}

/** 前置任務欄位的值：單一鍵、鍵的陣列，或以逗號分隔的字串 */
function predecessorKeys(value: unknown): string[] {
  if (value === null || value === undefined || value === '') return []
  if (Array.isArray(value)) return value.filter((v) => v !== null && v !== undefined && v !== '').map(String)
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * 整理相依關係：任務自己的前置欄位 + 另外給的清單。
 * 找不到的鍵、自己指向自己、重複的關係都略過。
 */
export function buildLinks(
  tasks: GanttTask[],
  rows: Record<string, unknown>[],
  dependencyField: string,
  extra: { from: string | number; to: string | number }[] | null
): GanttLink[] {
  const byKey = new Map<string, number>()
  tasks.forEach((t, i) => {
    if (!byKey.has(t.key)) byKey.set(t.key, i)
  })
  const out: GanttLink[] = []
  const seen = new Set<string>()
  const add = (fromKey: string, to: number) => {
    const from = byKey.get(fromKey)
    if (from === undefined || from === to) return
    const id = `${from}>${to}`
    if (seen.has(id)) return
    seen.add(id)
    out.push({ from, to })
  }
  tasks.forEach((t, i) => {
    for (const k of predecessorKeys(rows[t.index]?.[dependencyField])) add(k, i)
  })
  for (const link of extra ?? []) {
    const to = byKey.get(String(link.to))
    if (to !== undefined) add(String(link.from), to)
  }
  return out
}

/**
 * 相依箭頭的路徑（直角折線）：從前置任務的右端出發，到後續任務的左端。
 * 後續任務在右邊夠遠時只轉一次彎；太近或在左邊時，先往右出去、走到兩列之間的縫，再繞回來。
 */
export function linkPath(x1: number, y1: number, x2: number, y2: number, rowHeight: number): string {
  const gap = 8
  if (x2 - x1 >= gap * 2) return `M${x1},${y1} H${x2 - gap} V${y2} H${x2}`
  const midY = y2 > y1 ? y2 - rowHeight / 2 : y2 < y1 ? y2 + rowHeight / 2 : y1 + rowHeight / 2
  return `M${x1},${y1} H${x1 + gap} V${midY} H${x2 - gap} V${y2} H${x2}`
}

// === 非工作時段 ===

/**
 * 畫面範圍內的非工作日區段（連續的非工作日合併成一段）。
 * @param weekdays 非工作的星期（0 = 星期日）
 * @param holidays 假日（當天 00:00 的毫秒數）
 * @param limit 最多掃幾天（縮到看好幾年時不畫）
 */
export function nonWorkingRanges(
  domain: [number, number],
  weekdays: Set<number>,
  holidays: Set<number>,
  limit = 2000
): [number, number][] {
  if (!weekdays.size && !holidays.size) return []
  const days = d3.timeDay.range(d3.timeDay.floor(new Date(domain[0])), new Date(domain[1]))
  if (days.length > limit) return []
  const out: [number, number][] = []
  for (const d of days) {
    const t = d.getTime()
    if (!weekdays.has(d.getDay()) && !holidays.has(t)) continue
    const next = d3.timeDay.offset(d, 1).getTime()
    const last = out[out.length - 1]
    if (last && last[1] === t) last[1] = next
    else out.push([t, next])
  }
  return out
}
