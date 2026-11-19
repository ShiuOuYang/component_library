/**
 * 日期區間快捷選項（純函式，ChptDatePicker 用，也可以單獨使用）
 *
 * 報表篩選最常點的就是這幾個：今天、本週、近 7 天、本月、上一班…
 * 每個快捷算出 [開始, 結束]：
 *   - 以「日」為單位的區間：開始為當天 00:00:00.000、結束為當天 23:59:59.999（含當天）
 *   - 班別：開始為班別起始時刻、結束為下一班開始前 1ms（夜班跨午夜也正確）
 * 「近 7 天」含今天（今天往前推 6 天），和多數報表系統一致。
 */

export type DatePresetKey =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'last7Days'
  | 'last30Days'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'thisYear'
  | 'currentShift'
  | 'previousShift'

/** 自訂快捷：value 可以是固定區間，或每次點選時才計算的函式 */
export interface CustomDatePreset {
  label: string
  value: [Date, Date] | ((now: Date) => [Date, Date])
}

export type DatePreset = DatePresetKey | CustomDatePreset

/** 班別：name 給畫面顯示，start 為 'HH:mm'；依起始時間排序，最後一班延續到隔天第一班開始 */
export interface ShiftDef {
  name: string
  start: string
}

export interface DatePresetOptions {
  /** 一週的第一天（0 = 週日、1 = 週一） */
  weekStart?: number
  shifts?: ShiftDef[]
}

/** 預設快捷（不含班別；班別要有 shifts 才有意義） */
export const DEFAULT_DATE_PRESETS: DatePresetKey[] = ['today', 'yesterday', 'thisWeek', 'last7Days', 'thisMonth', 'lastMonth']

/** 兩班制的預設班別 */
export const DEFAULT_SHIFTS: ShiftDef[] = [
  { name: 'Day', start: '08:00' },
  { name: 'Night', start: '20:00' },
]

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

function startOfWeek(d: Date, weekStart: number): Date {
  const diff = (d.getDay() - weekStart + 7) % 7
  return addDays(startOfDay(d), -diff)
}

function parseHm(hm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim())
  if (!m) throw new Error(`Invalid shift start "${hm}" (expected HH:mm)`)
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) throw new Error(`Invalid shift start "${hm}"`)
  return h * 60 + min
}

/**
 * 某個時刻所在的班別，與它的起訖時間。
 * offset = -1 為上一班、0 為本班。
 */
export function shiftRange(now: Date, shifts: ShiftDef[], offset = 0): { shift: ShiftDef; range: [Date, Date] } {
  if (!shifts.length) throw new Error('shifts is empty')
  const sorted = shifts.map((s) => ({ shift: s, minute: parseHm(s.start) })).sort((a, b) => a.minute - b.minute)
  const n = sorted.length
  // 把班別展開成「昨天、今天、明天」三天的時間軸，找出 now 所在的那一段
  const day0 = startOfDay(now)
  const starts: { shift: ShiftDef; at: Date }[] = []
  for (const d of [-1, 0, 1]) {
    const base = addDays(day0, d)
    for (const s of sorted) starts.push({ shift: s.shift, at: new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, s.minute) })
  }
  let i = starts.findIndex((s, k) => k + 1 < starts.length && s.at <= now && now < starts[k + 1].at)
  i += offset
  // offset 讓索引超出三天的範圍時，往前補一天（上一班最多跨一天）
  while (i < 0) i += n
  const start = starts[i].at
  const next = starts[i + 1]?.at ?? new Date(start.getTime() + 24 * 3600_000)
  return { shift: starts[i].shift, range: [start, new Date(next.getTime() - 1)] }
}

/** 算出內建快捷的區間 */
export function resolveDatePreset(key: DatePresetKey, now: Date = new Date(), options: DatePresetOptions = {}): [Date, Date] {
  const weekStart = options.weekStart ?? 1
  const today = startOfDay(now)
  switch (key) {
    case 'today':
      return [today, endOfDay(now)]
    case 'yesterday': {
      const y = addDays(today, -1)
      return [y, endOfDay(y)]
    }
    case 'thisWeek': {
      const s = startOfWeek(now, weekStart)
      return [s, endOfDay(addDays(s, 6))]
    }
    case 'lastWeek': {
      const s = addDays(startOfWeek(now, weekStart), -7)
      return [s, endOfDay(addDays(s, 6))]
    }
    case 'last7Days':
      return [addDays(today, -6), endOfDay(now)]
    case 'last30Days':
      return [addDays(today, -29), endOfDay(now)]
    case 'thisMonth':
      return [new Date(now.getFullYear(), now.getMonth(), 1), endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0))]
    case 'lastMonth':
      return [new Date(now.getFullYear(), now.getMonth() - 1, 1), endOfDay(new Date(now.getFullYear(), now.getMonth(), 0))]
    case 'thisQuarter': {
      const q = Math.floor(now.getMonth() / 3) * 3
      return [new Date(now.getFullYear(), q, 1), endOfDay(new Date(now.getFullYear(), q + 3, 0))]
    }
    case 'thisYear':
      return [new Date(now.getFullYear(), 0, 1), endOfDay(new Date(now.getFullYear(), 11, 31))]
    case 'currentShift':
      return shiftRange(now, options.shifts ?? DEFAULT_SHIFTS, 0).range
    case 'previousShift':
      return shiftRange(now, options.shifts ?? DEFAULT_SHIFTS, -1).range
  }
}

/** 自訂或內建快捷的區間 */
export function resolvePresetValue(preset: DatePreset, now: Date = new Date(), options: DatePresetOptions = {}): [Date, Date] {
  if (typeof preset === 'string') return resolveDatePreset(preset, now, options)
  return typeof preset.value === 'function' ? preset.value(now) : preset.value
}
