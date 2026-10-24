/**
 * GanttChart 的純函式：時間解析、任務整理、時間軸分層、文字寬度估算
 *
 * 抽出來是為了能直接測 —— 這些都是不看畫面就能判斷對錯的邏輯。
 */

import * as d3 from 'd3'

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

/**
 * 估算文字寬度（px）。jsdom 與 SSR 沒有 measureText，用字元寬度近似：
 * 中日韓全形字約一個字高、其他約 0.6 個字高。用來判斷任務名稱放不放得進長條。
 */
export function estimateTextWidth(text: string, fontSize = 12): number {
  let w = 0
  for (const ch of text) {
    w += /[⺀-鿿가-힯豈-﫿＀-￯]/.test(ch) ? fontSize : fontSize * 0.6
  }
  return w
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

/**
 * 長條上的文字要用深色還是白色：依底色的相對亮度（WCAG）選對比較高的那個。
 * 解析不了的顏色（例如沒解開的 CSS 變數）回傳白色。
 */
export function readableTextColor(background: string): '#ffffff' | '#111827' {
  const c = d3.color(background)?.rgb()
  if (!c) return '#ffffff'
  const lin = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const L = 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
  // 白字對比 (1.05) / (L + 0.05)；深字（#111827，L≈0.012）對比 (L + 0.05) / 0.062
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.062 ? '#ffffff' : '#111827'
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
