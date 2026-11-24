/**
 * Cron 表達式（5 欄：分 時 日 月 週）：解析、下次執行時間、可讀描述、與「每天 / 每週 / 每月」設定互轉。
 *
 * 支援：*、數字、範圍 a-b、清單 a,b、間隔 * / n 與 a-b/n、月份 JAN–DEC、星期 SUN–SAT（0 與 7 都是星期日）。
 * 日與週都有限制時，兩者符合其一即可（與 Vixie cron 相同）。
 */

export type CronFieldName = 'minute' | 'hour' | 'dom' | 'month' | 'dow'
export const CRON_FIELDS: CronFieldName[] = ['minute', 'hour', 'dom', 'month', 'dow']
const RANGES: Record<CronFieldName, [number, number]> = { minute: [0, 59], hour: [0, 23], dom: [1, 31], month: [1, 12], dow: [0, 7] }
const NAMES: Partial<Record<CronFieldName, string[]>> = {
  month: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  dow: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
}

export interface CronParsed {
  minute: number[]
  hour: number[]
  dom: number[]
  month: number[]
  /** 0–6（7 已轉成 0） */
  dow: number[]
  /** 該欄是不是 *（決定日 / 週的 OR 規則） */
  any: Record<CronFieldName, boolean>
  /** 原始的五欄 */
  parts: string[]
}

export type CronError = { field: CronFieldName | 'count'; token: string }

function parseNumber(token: string, field: CronFieldName): number | null {
  const names = NAMES[field]
  if (names) {
    const i = names.indexOf(token.toUpperCase())
    if (i >= 0) return field === 'month' ? i + 1 : i
  }
  return /^\d+$/.test(token) ? Number(token) : null
}

function parseField(text: string, field: CronFieldName): number[] | null {
  const [lo, hi] = RANGES[field]
  const out = new Set<number>()
  for (const part of text.split(',')) {
    const m = /^([^/]+)(?:\/(\d+))?$/.exec(part)
    if (!m) return null
    const step = m[2] === undefined ? 1 : Number(m[2])
    if (!(step >= 1)) return null
    let a: number
    let b: number
    if (m[1] === '*' || m[1] === '?') {
      a = lo
      b = hi
    } else if (m[1].includes('-')) {
      const [x, y] = m[1].split('-')
      const px = parseNumber(x, field)
      const py = parseNumber(y, field)
      if (px === null || py === null || px > py) return null
      a = px
      b = py
    } else {
      const v = parseNumber(m[1], field)
      if (v === null) return null
      a = v
      // 「5/15」表示從 5 開始每 15
      b = m[2] === undefined ? v : hi
    }
    if (a < lo || b > hi) return null
    for (let v = a; v <= b; v += step) out.add(field === 'dow' && v === 7 ? 0 : v)
  }
  return [...out].sort((x, y) => x - y)
}

/** 解析；錯誤時回傳哪一欄、哪個片段 */
export function parseCron(expr: string): CronParsed | { error: CronError } {
  const parts = expr.trim().split(/\s+/).filter(Boolean)
  if (parts.length !== 5) return { error: { field: 'count', token: String(parts.length) } }
  const result: Partial<CronParsed> = { parts, any: {} as Record<CronFieldName, boolean> }
  for (let i = 0; i < 5; i++) {
    const f = CRON_FIELDS[i]
    const values = parseField(parts[i], f)
    if (!values || !values.length) return { error: { field: f, token: parts[i] } }
    result[f] = values
    result.any![f] = parts[i] === '*' || parts[i] === '?'
  }
  return result as CronParsed
}

export const isCronError = (r: CronParsed | { error: CronError }): r is { error: CronError } => 'error' in r

function dayMatches(p: CronParsed, d: Date): boolean {
  if (!p.month.includes(d.getMonth() + 1)) return false
  const domOk = p.dom.includes(d.getDate())
  const dowOk = p.dow.includes(d.getDay())
  if (p.any.dom && p.any.dow) return true
  if (p.any.dom) return dowOk
  if (p.any.dow) return domOk
  return domOk || dowOk
}

/** 從 from 之後（不含）的下 n 次執行時間（本地時間）；找不到（例如 2 月 30 日）時回傳較少筆 */
export function nextRuns(p: CronParsed, from: Date, n: number): Date[] {
  const out: Date[] = []
  const d = new Date(from.getTime())
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() + 1)
  const limit = from.getTime() + 5 * 366 * 86_400_000
  while (out.length < n && d.getTime() <= limit) {
    if (!dayMatches(p, d)) {
      d.setDate(d.getDate() + 1)
      d.setHours(0, 0, 0, 0)
      continue
    }
    if (!p.hour.includes(d.getHours())) {
      d.setHours(d.getHours() + 1, 0, 0, 0)
      continue
    }
    if (!p.minute.includes(d.getMinutes())) {
      d.setMinutes(d.getMinutes() + 1, 0, 0)
      continue
    }
    out.push(new Date(d.getTime()))
    d.setMinutes(d.getMinutes() + 1, 0, 0)
  }
  return out
}

// ---- 簡易設定（每 N 分鐘 / 每小時 / 每天 / 每週 / 每月）互轉 ----

export type CronMode = 'minutes' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom'

export interface CronSimple {
  mode: CronMode
  /** 每幾分鐘（minutes） */
  every: number
  minute: number
  hour: number
  /** 星期（weekly，0 = 日） */
  weekdays: number[]
  /** 日（monthly） */
  days: number[]
}

export const DEFAULT_SIMPLE: CronSimple = { mode: 'daily', every: 15, minute: 0, hour: 8, weekdays: [1, 2, 3, 4, 5], days: [1] }

const single = (s: string) => /^\d+$/.test(s)

/** 表達式 → 簡易設定；看不出來時是 custom */
export function toSimple(expr: string): CronSimple {
  const p = parseCron(expr)
  const base = { ...DEFAULT_SIMPLE, mode: 'custom' as CronMode }
  if (isCronError(p)) return base
  const [mi, ho, dom, mo, dow] = p.parts
  const everyM = /^\*\/(\d+)$/.exec(mi)
  if (everyM && ho === '*' && dom === '*' && mo === '*' && dow === '*') return { ...base, mode: 'minutes', every: Number(everyM[1]) }
  if (!single(mi)) return base
  const minute = Number(mi)
  if (ho === '*' && dom === '*' && mo === '*' && dow === '*') return { ...base, mode: 'hourly', minute }
  if (!single(ho) || mo !== '*') return base
  const hour = Number(ho)
  if (dom === '*' && dow === '*') return { ...base, mode: 'daily', minute, hour }
  if (dom === '*' && p.any.dom) return { ...base, mode: 'weekly', minute, hour, weekdays: p.dow }
  if (dow === '*') return { ...base, mode: 'monthly', minute, hour, days: p.dom }
  return base
}

/** 簡易設定 → 表達式（custom 回傳 null） */
export function fromSimple(s: CronSimple): string | null {
  const list = (v: number[]) => (v.length ? [...new Set(v)].sort((a, b) => a - b).join(',') : '*')
  switch (s.mode) {
    case 'minutes':
      return `*/${Math.max(1, Math.min(59, Math.round(s.every)))} * * * *`
    case 'hourly':
      return `${s.minute} * * * *`
    case 'daily':
      return `${s.minute} ${s.hour} * * *`
    case 'weekly':
      return `${s.minute} ${s.hour} * * ${list(s.weekdays)}`
    case 'monthly':
      return `${s.minute} ${s.hour} ${list(s.days)} * *`
    default:
      return null
  }
}

// ---- 可讀描述 ----

export interface CronTextLabels {
  everyMinute: string
  everyNMinutes: (n: number) => string
  everyNMinutesInHours: (n: number, hours: string) => string
  atMinuteEveryHour: (m: number) => string
  at: (times: string[]) => string
  minutesOfHours: (minutes: string, hours: string) => string
  everyDay: string
  weekdays: (names: string[]) => string
  monthDays: (days: string[]) => string
  months: (names: string[]) => string
  dayOrWeek: (dom: string, dow: string) => string
  join: (parts: string[]) => string
  weekdayNames: string[]
  monthNames: string[]
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 數字清單縮成範圍：連續 3 個以上寫成 a–b（1,2,3,5 → ['1–3', '5']） */
export function compactList(values: number[], fmt: (v: number) => string = String): string[] {
  const out: string[] = []
  let i = 0
  while (i < values.length) {
    let j = i
    while (j + 1 < values.length && values[j + 1] === values[j] + 1) j++
    if (j - i >= 2) out.push(`${fmt(values[i])}–${fmt(values[j])}`)
    else for (let k = i; k <= j; k++) out.push(fmt(values[k]))
    i = j + 1
  }
  return out
}

export function describeCron(p: CronParsed, l: CronTextLabels): string {
  const [mi] = p.parts
  const allMin = p.any.minute
  const allHour = p.any.hour
  let time: string
  // 一天裡的固定時刻才需要說「每天」；每 N 分鐘、每小時本身就是重複的
  let fixedTimes = false
  const step = /^\*\/(\d+)$/.exec(mi)
  const hours = compactList(p.hour).join(', ')
  if (allMin && allHour) time = l.everyMinute
  else if (step && allHour) time = l.everyNMinutes(Number(step[1]))
  else if (step) time = l.everyNMinutesInHours(Number(step[1]), hours)
  else if (p.minute.length === 1 && allHour) time = l.atMinuteEveryHour(p.minute[0])
  else {
    fixedTimes = true
    time = p.minute.length * p.hour.length <= 6 ? l.at(p.hour.flatMap((h) => p.minute.map((m) => `${pad(h)}:${pad(m)}`))) : l.minutesOfHours(compactList(p.minute).join(', '), hours)
  }

  const parts = [time]
  const dowText = l.weekdays(compactList(p.dow, (d) => l.weekdayNames[d]))
  const domText = l.monthDays(compactList(p.dom))
  if (!p.any.dom && !p.any.dow) parts.push(l.dayOrWeek(domText, dowText))
  else if (!p.any.dow) parts.push(dowText)
  else if (!p.any.dom) parts.push(domText)
  else if (p.any.month && fixedTimes) parts.push(l.everyDay)
  if (!p.any.month) parts.push(l.months(compactList(p.month, (m) => l.monthNames[m - 1])))
  return l.join(parts)
}
