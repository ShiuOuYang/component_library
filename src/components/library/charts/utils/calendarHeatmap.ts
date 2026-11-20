/**
 * 日曆熱圖（CalendarHeatmap）的版面與分級
 *
 * 版面：一欄一週、一列一個星期幾（週一或週日開始）。
 * 日期一律用「本地時間的年月日」計算（new Date(y, m, d)），不用毫秒加減：
 * 遇到日光節約時間的那一天不是 24 小時，用毫秒算會少一天或重複一天。
 */

export interface CalendarDatum {
  /** 'YYYY-MM-DD' 或 Date */
  date: string | Date
  value: number | null
}

export interface CalendarCell {
  /** 'YYYY-MM-DD' */
  key: string
  date: Date
  /** 第幾週（欄） */
  col: number
  /** 星期幾的列（0 = 一週的第一天） */
  row: number
  value: number | null
}

/** Date → 'YYYY-MM-DD'（本地時間） */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 'YYYY-MM-DD' 或 Date → 本地時間當天 00:00；格式不對時為 null */
export function toDay(input: string | Date): Date | null {
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : new Date(input.getFullYear(), input.getMonth(), input.getDate())
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(input)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return d.getMonth() === Number(m[2]) - 1 ? d : null
}

export const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** 這一天在一週裡的第幾列（weekStart 1 = 週一開始） */
export const weekRow = (d: Date, weekStart: 0 | 1): number => (d.getDay() - weekStart + 7) % 7

/** 資料 → 每天一個值（同一天有多筆時加總；null 的筆略過） */
export function valuesByDay(data: CalendarDatum[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const d of data) {
    const day = toDay(d.date)
    if (!day || d.value === null || d.value === undefined || !Number.isFinite(d.value)) continue
    const k = dateKey(day)
    map.set(k, (map.get(k) ?? 0) + d.value)
  }
  return map
}

/** 範圍：有給 start / end 用給的；否則取資料的最早與最晚；都沒有時為最近 12 週 */
export function calendarRange(data: CalendarDatum[], start?: string | Date | null, end?: string | Date | null, today = new Date()): { start: Date; end: Date } {
  const days = data.map((d) => toDay(d.date)).filter((d): d is Date => !!d)
  const first = days.length ? new Date(Math.min(...days.map((d) => d.getTime()))) : null
  const last = days.length ? new Date(Math.max(...days.map((d) => d.getTime()))) : null
  const e = (end && toDay(end)) || last || toDay(today)!
  const s = (start && toDay(start)) || first || addDays(e, -83)
  return s <= e ? { start: s, end: e } : { start: e, end: s }
}

/** 版面：每天一格（欄 = 週、列 = 星期幾），以及每個月第一週的欄（放月份標籤） */
export function buildCalendar(
  start: Date,
  end: Date,
  weekStart: 0 | 1,
  values: Map<string, number>
): { cells: CalendarCell[]; weeks: number; months: Array<{ col: number; date: Date }> } {
  const cells: CalendarCell[] = []
  const months: Array<{ col: number; date: Date }> = []
  const offset = weekRow(start, weekStart)
  let i = 0
  for (let d = start; d <= end; d = addDays(d, 1), i++) {
    const col = Math.floor((i + offset) / 7)
    const key = dateKey(d)
    cells.push({ key, date: d, col, row: weekRow(d, weekStart), value: values.get(key) ?? null })
    // 月份標籤放在「這個月第一天所在的週」；第一個月不足一週時往右一欄，避免和下個月的標籤擠在一起
    if (d.getDate() === 1 || i === 0) months.push({ col: i === 0 && weekRow(d, weekStart) > 3 ? col + 1 : col, date: d })
  }
  const weeks = cells.length ? cells[cells.length - 1].col + 1 : 0
  // 兩個月份標籤太近（不到兩欄，文字會疊在一起）時只留後面那個
  const deduped = months.filter((m, k) => !months.slice(k + 1).some((n) => n.col - m.col < 2))
  return { cells, weeks, months: deduped }
}

/**
 * 分級門檻：把 [min, max] 等分成 levels 級，回傳 levels - 1 個門檻。
 * 值 < thresholds[0] 為第 0 級，>= 最後一個門檻為最高級。
 */
export function evenThresholds(min: number, max: number, levels: number): number[] {
  if (levels < 2) return []
  if (!(max > min)) return Array.from({ length: levels - 1 }, () => max)
  const step = (max - min) / levels
  return Array.from({ length: levels - 1 }, (_, i) => min + step * (i + 1))
}

/** 值落在第幾級（0 起算） */
export function levelOf(value: number, thresholds: number[]): number {
  let lv = 0
  while (lv < thresholds.length && value >= thresholds[lv]) lv++
  return lv
}

/** 第 i 級的範圍文字用的上下界（[下界, 上界)；第一級沒有下界、最後一級沒有上界） */
export function levelRange(i: number, thresholds: number[]): { from: number | null; to: number | null } {
  return { from: i === 0 ? null : thresholds[i - 1], to: i >= thresholds.length ? null : thresholds[i] }
}
