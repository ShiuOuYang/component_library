/**
 * 排班表（ChptShiftRoster）的資料處理：日期、人力覆蓋、排班規則、統計
 *
 * 班表資料：{ [人員 id]: { 'YYYY-MM-DD': 班別代碼 } }；沒排的日子沒有 key（或為 null）。
 */

export interface RosterShift {
  /** 班別代碼（D、E、N、OFF…） */
  code: string
  label: string
  /** 顏色（任何 CSS 顏色）；不給時依序用圖表色 */
  color?: string
  /** 上下班時間 'HH:mm'；下班時間 ≤ 上班時間表示跨夜。休假不用給 */
  start?: string
  end?: string
  /** 休假（不算上班、不算人力） */
  off?: boolean
  /** 鍵盤快捷鍵（單一字元）；不給時用代碼第一個字 */
  key?: string
}

export interface RosterPerson {
  id: string
  name: string
  /** 組別 / 職務（顯示在名字下面） */
  group?: string
}

export type Roster = Record<string, Record<string, string | null | undefined> | undefined>

/** 每天每個班別需要幾個人：固定數字，或依日期決定（例如週末少一點） */
export type ShiftRequirement = Record<string, number> | ((date: string, code: string) => number)

const pad = (n: number) => String(n).padStart(2, '0')
export const dateKeyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** 從 start 開始連續 days 天的日期 key（本地日期） */
export function rosterDates(start: string | Date, days: number): string[] {
  const s = typeof start === 'string' ? new Date(`${start.slice(0, 10)}T00:00:00`) : new Date(start.getFullYear(), start.getMonth(), start.getDate())
  return Array.from({ length: Math.max(0, days) }, (_, i) => dateKeyOf(new Date(s.getFullYear(), s.getMonth(), s.getDate() + i)))
}

export const shiftOf = (roster: Roster, personId: string, date: string): string | null => roster[personId]?.[date] ?? null

/** 每天每個班別排了幾個人（休假不算） */
export function coverage(roster: Roster, people: RosterPerson[], dates: string[], shifts: RosterShift[]): Record<string, Record<string, number>> {
  const work = shifts.filter((s) => !s.off)
  const out: Record<string, Record<string, number>> = {}
  for (const d of dates) {
    out[d] = Object.fromEntries(work.map((s) => [s.code, 0]))
    for (const p of people) {
      const c = shiftOf(roster, p.id, d)
      if (c !== null && c in out[d]) out[d][c]++
    }
  }
  return out
}

export const required = (req: ShiftRequirement | undefined, date: string, code: string): number =>
  !req ? 0 : typeof req === 'function' ? req(date, code) : req[code] ?? 0

/** 人力不足的格子：{ date, code, have, need } */
export function shortages(cov: Record<string, Record<string, number>>, req: ShiftRequirement | undefined): Array<{ date: string; code: string; have: number; need: number }> {
  const out: Array<{ date: string; code: string; have: number; need: number }> = []
  for (const [date, byCode] of Object.entries(cov))
    for (const [code, have] of Object.entries(byCode)) {
      const need = required(req, date, code)
      if (have < need) out.push({ date, code, have, need })
    }
  return out
}

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

export interface RosterRules {
  /** 兩班之間至少休息幾小時（例如夜班接隔天早班）；0 為不檢查 */
  minRestHours?: number
  /** 最多連續上班幾天；0 為不檢查 */
  maxConsecutive?: number
}

export type RosterWarning =
  | { kind: 'rest'; personId: string; date: string; hours: number }
  | { kind: 'consecutive'; personId: string; date: string; days: number }

/**
 * 排班規則檢查：
 *   - rest：前一天下班到這一天上班不到 minRestHours（標在「這一天」）
 *   - consecutive：連續上班超過 maxConsecutive 天（標在超過的那一天起每一天）
 */
export function rosterWarnings(roster: Roster, people: RosterPerson[], dates: string[], shifts: RosterShift[], rules: RosterRules = {}): RosterWarning[] {
  const minRest = rules.minRestHours ?? 11
  const maxRun = rules.maxConsecutive ?? 6
  const byCode = new Map(shifts.map((s) => [s.code, s]))
  const out: RosterWarning[] = []
  for (const p of people) {
    let run = 0
    dates.forEach((d, i) => {
      const s = byCode.get(shiftOf(roster, p.id, d) ?? '')
      const working = !!s && !s.off
      run = working ? run + 1 : 0
      if (maxRun > 0 && run > maxRun) out.push({ kind: 'consecutive', personId: p.id, date: d, days: run })
      if (!working || i === 0 || minRest <= 0) return
      const prev = byCode.get(shiftOf(roster, p.id, dates[i - 1]) ?? '')
      if (!prev || prev.off || !prev.start || !prev.end || !s.start) return
      // 前一天的下班時間（跨夜時是這一天的凌晨）到這一天的上班時間
      const prevEnd = minutes(prev.end) + (minutes(prev.end) <= minutes(prev.start) ? 1440 : 0)
      const rest = (1440 + minutes(s.start) - prevEnd) / 60
      if (rest < minRest) out.push({ kind: 'rest', personId: p.id, date: d, hours: rest })
    })
  }
  return out
}

/** 每個人的統計：上班天數、各班別天數 */
export function personStats(roster: Roster, personId: string, dates: string[], shifts: RosterShift[]): { work: number; byCode: Record<string, number> } {
  const byCode: Record<string, number> = Object.fromEntries(shifts.map((s) => [s.code, 0]))
  let work = 0
  for (const d of dates) {
    const c = shiftOf(roster, personId, d)
    if (c === null || !(c in byCode)) continue
    byCode[c]++
    if (!shifts.find((s) => s.code === c)!.off) work++
  }
  return { work, byCode }
}

/** 設定一格（不改原物件）；code 為 null 時清除 */
export function setShift(roster: Roster, personId: string, date: string, code: string | null): Roster {
  const row = { ...(roster[personId] ?? {}) }
  if (code === null) delete row[date]
  else row[date] = code
  return { ...roster, [personId]: row }
}

/** 同一個人一段日期都設成 code（拖曳填入、Shift + 點） */
export function fillRange(roster: Roster, personId: string, dates: string[], from: string, to: string, code: string | null): Roster {
  const a = dates.indexOf(from)
  const b = dates.indexOf(to)
  if (a < 0 || b < 0) return roster
  let next = roster
  for (let i = Math.min(a, b); i <= Math.max(a, b); i++) next = setShift(next, personId, dates[i], code)
  return next
}

/** 同一天兩個人互換班別 */
export function swapShifts(roster: Roster, date: string, personA: string, personB: string): Roster {
  const a = shiftOf(roster, personA, date)
  const b = shiftOf(roster, personB, date)
  return setShift(setShift(roster, personA, date, b), personB, date, a)
}
