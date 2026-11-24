import { describe, expect, it } from 'vitest'
import { compactList, describeCron, fromSimple, isCronError, nextRuns, parseCron, toSimple, DEFAULT_SIMPLE, type CronParsed, type CronTextLabels } from '@/components/library/shared/cron'

const ok = (expr: string) => {
  const r = parseCron(expr)
  if (isCronError(r)) throw new Error(`bad ${expr}`)
  return r
}
const fmt = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`

describe('cron', () => {
  it('parseCron：數字、範圍、清單、間隔、名稱、7 = 星期日', () => {
    const p = ok('*/15 9-17/4 1,15 JAN-MAR mon-fri')
    expect(p.minute).toEqual([0, 15, 30, 45])
    expect(p.hour).toEqual([9, 13, 17])
    expect(p.dom).toEqual([1, 15])
    expect(p.month).toEqual([1, 2, 3])
    expect(p.dow).toEqual([1, 2, 3, 4, 5])
    expect(p.any).toEqual({ minute: false, hour: false, dom: false, month: false, dow: false })
    expect(ok('5/20 * * * 7').minute).toEqual([5, 25, 45])
    expect(ok('0 0 * * 0,7').dow).toEqual([0])
    expect(ok('0 0 ? * *').any.dom).toBe(true)
    expect(ok('  0   12  *  * * ').parts).toEqual(['0', '12', '*', '*', '*'])
  })

  it('parseCron：錯誤指出欄位', () => {
    expect(parseCron('0 12 * *')).toEqual({ error: { field: 'count', token: '4' } })
    expect(parseCron('61 * * * *')).toEqual({ error: { field: 'minute', token: '61' } })
    expect(parseCron('0 5-3 * * *')).toEqual({ error: { field: 'hour', token: '5-3' } })
    expect(parseCron('0 0 0 * *')).toEqual({ error: { field: 'dom', token: '0' } })
    expect(parseCron('0 0 * FOO *')).toEqual({ error: { field: 'month', token: 'FOO' } })
    expect(parseCron('0 0 * * 8')).toEqual({ error: { field: 'dow', token: '8' } })
    expect(parseCron('*/0 * * * *')).toEqual({ error: { field: 'minute', token: '*/0' } })
    expect(parseCron('a/b * * * *')).toEqual({ error: { field: 'minute', token: 'a/b' } })
    expect(parseCron('1-x * * * *')).toEqual({ error: { field: 'minute', token: '1-x' } })
    expect(parseCron('0 0 L * *')).toEqual({ error: { field: 'dom', token: 'L' } })
  })

  it('nextRuns：每天、平日、日或週、跨月、找不到', () => {
    const from = new Date(2026, 10, 24, 8, 30, 20) // 週二 08:30:20
    expect(nextRuns(ok('30 8 * * *'), from, 2).map(fmt)).toEqual(['2026-11-25 8:30', '2026-11-26 8:30'])
    expect(nextRuns(ok('*/20 * * * *'), from, 3).map(fmt)).toEqual(['2026-11-24 8:40', '2026-11-24 9:00', '2026-11-24 9:20'])
    expect(nextRuns(ok('0 9 * * 1-5'), new Date(2026, 10, 27, 10, 0), 2).map(fmt)).toEqual(['2026-11-30 9:00', '2026-12-1 9:00'])
    // 日與週都有限制：其一符合（1 日或星期日）
    expect(nextRuns(ok('0 0 1 * 0'), new Date(2026, 10, 24), 3).map(fmt)).toEqual(['2026-11-29 0:00', '2026-12-1 0:00', '2026-12-6 0:00'])
    // 只限日
    expect(nextRuns(ok('0 2 31 * *'), new Date(2026, 10, 1), 2).map(fmt)).toEqual(['2026-12-31 2:00', '2027-1-31 2:00'])
    // 2 月 30 日不存在
    expect(nextRuns(ok('0 0 30 2 *'), from, 1)).toEqual([])
  })

  it('toSimple / fromSimple 互轉', () => {
    expect(toSimple('*/10 * * * *')).toMatchObject({ mode: 'minutes', every: 10 })
    expect(toSimple('15 * * * *')).toMatchObject({ mode: 'hourly', minute: 15 })
    expect(toSimple('30 8 * * *')).toMatchObject({ mode: 'daily', minute: 30, hour: 8 })
    expect(toSimple('30 8 * * 1-5')).toMatchObject({ mode: 'weekly', weekdays: [1, 2, 3, 4, 5] })
    expect(toSimple('0 2 1,15 * *')).toMatchObject({ mode: 'monthly', days: [1, 15] })
    for (const custom of ['*/10 9-17 * * 1-5', '0 0 1 1 *', '0 9-17 * * *', '0 0 1 * 1', 'bad', '*/5 1 * * *']) expect(toSimple(custom).mode).toBe('custom')
    expect(fromSimple({ ...DEFAULT_SIMPLE, mode: 'minutes', every: 99 })).toBe('*/59 * * * *')
    expect(fromSimple({ ...DEFAULT_SIMPLE, mode: 'minutes', every: 0 })).toBe('*/1 * * * *')
    expect(fromSimple({ ...DEFAULT_SIMPLE, mode: 'hourly', minute: 5 })).toBe('5 * * * *')
    expect(fromSimple({ ...DEFAULT_SIMPLE, mode: 'daily' })).toBe('0 8 * * *')
    expect(fromSimple({ ...DEFAULT_SIMPLE, mode: 'weekly', weekdays: [5, 1, 1] })).toBe('0 8 * * 1,5')
    expect(fromSimple({ ...DEFAULT_SIMPLE, mode: 'weekly', weekdays: [] })).toBe('0 8 * * *')
    expect(fromSimple({ ...DEFAULT_SIMPLE, mode: 'monthly', days: [15, 1] })).toBe('0 8 1,15 * *')
    expect(fromSimple({ ...DEFAULT_SIMPLE, mode: 'custom' })).toBeNull()
  })

  it('compactList', () => {
    expect(compactList([1, 2, 3, 5, 6, 8])).toEqual(['1–3', '5', '6', '8'])
    expect(compactList([0, 1, 2], (v) => `d${v}`)).toEqual(['d0–d2'])
    expect(compactList([])).toEqual([])
  })

  it('describeCron', () => {
    const l: CronTextLabels = {
      everyMinute: 'every minute',
      everyNMinutes: (n) => `every ${n} min`,
      everyNMinutesInHours: (n, h) => `every ${n} min in ${h}`,
      atMinuteEveryHour: (m) => `at :${m} hourly`,
      at: (t) => `at ${t.join('/')}`,
      minutesOfHours: (m, h) => `min ${m} of ${h}`,
      everyDay: 'daily',
      weekdays: (n) => `on ${n.join('/')}`,
      monthDays: (d) => `day ${d.join('/')}`,
      months: (n) => `in ${n.join('/')}`,
      dayOrWeek: (a, b) => `${a} or ${b}`,
      join: (p) => p.join('; '),
      weekdayNames: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
      monthNames: ['Ja', 'Fe', 'Mr', 'Ap', 'My', 'Jn', 'Jl', 'Au', 'Se', 'Oc', 'No', 'De'],
    }
    const d = (e: string) => describeCron(ok(e) as CronParsed, l)
    expect(d('* * * * *')).toBe('every minute')
    expect(d('*/5 * * * *')).toBe('every 5 min')
    expect(d('*/10 9-17 * * 1-5')).toBe('every 10 min in 9–17; on Mo–Fr')
    expect(d('7 * * * *')).toBe('at :7 hourly')
    expect(d('30 8 * * *')).toBe('at 08:30; daily')
    expect(d('0,30 8,12 * * *')).toBe('at 08:00/08:30/12:00/12:30; daily')
    expect(d('0,15,30,45 8,9 * * *')).toBe('min 0/15/30/45 of 8/9; daily'.replace('0/15/30/45', '0, 15, 30, 45').replace('8/9', '8, 9'))
    expect(d('0 2 1,15 * *')).toBe('at 02:00; day 1/15')
    expect(d('0 0 1 * 0')).toBe('at 00:00; day 1 or on Su')
    expect(d('0 0 1 1,4,7,10 *')).toBe('at 00:00; day 1; in Ja/Ap/Jl/Oc')
    expect(d('0 0 * 12 *')).toBe('at 00:00; in De')
  })
})
