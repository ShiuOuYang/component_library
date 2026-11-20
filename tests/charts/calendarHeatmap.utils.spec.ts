import { describe, expect, it } from 'vitest'
import {
  addDays,
  buildCalendar,
  calendarRange,
  dateKey,
  evenThresholds,
  levelOf,
  levelRange,
  toDay,
  valuesByDay,
  weekRow,
} from '@/components/library/charts/utils/calendarHeatmap'

describe('calendarHeatmap utils', () => {
  it('dateKey / toDay：本地時間年月日；格式錯或不存在的日期為 null', () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(dateKey(toDay('2026-3-9')!)).toBe('2026-03-09')
    expect(dateKey(toDay('2026-11-20T10:00:00')!)).toBe('2026-11-20')
    expect(toDay('2026-02-30')).toBeNull()
    expect(toDay('11/20/2026')).toBeNull()
    expect(toDay(new Date('nope'))).toBeNull()
    expect(dateKey(toDay(new Date(2026, 4, 1, 15))!)).toBe('2026-05-01')
  })

  it('addDays 跨月、跨年；weekRow 依一週開始日', () => {
    expect(dateKey(addDays(new Date(2026, 11, 31), 1))).toBe('2027-01-01')
    expect(dateKey(addDays(new Date(2026, 2, 1), -1))).toBe('2026-02-28')
    const fri = new Date(2026, 10, 20) // 星期五
    expect(weekRow(fri, 1)).toBe(4)
    expect(weekRow(fri, 0)).toBe(5)
    expect(weekRow(new Date(2026, 10, 22), 1)).toBe(6) // 星期日在週一開始時是最後一列
  })

  it('valuesByDay：同一天加總，略過 null、非有限數與錯誤日期', () => {
    const m = valuesByDay([
      { date: '2026-11-20', value: 3 },
      { date: new Date(2026, 10, 20, 18), value: 4 },
      { date: '2026-11-21', value: null },
      { date: '2026-11-22', value: Number.NaN },
      { date: 'bad', value: 1 },
    ])
    expect([...m.entries()]).toEqual([['2026-11-20', 7]])
  })

  it('calendarRange：給的優先、否則資料範圍、都沒有時今天往前 12 週；顛倒時對調', () => {
    const data = [
      { date: '2026-03-10', value: 1 },
      { date: '2026-01-02', value: 1 },
    ]
    let r = calendarRange(data)
    expect([dateKey(r.start), dateKey(r.end)]).toEqual(['2026-01-02', '2026-03-10'])
    r = calendarRange(data, '2026-02-01', null)
    expect([dateKey(r.start), dateKey(r.end)]).toEqual(['2026-02-01', '2026-03-10'])
    r = calendarRange([], null, null, new Date(2026, 10, 20))
    expect([dateKey(r.start), dateKey(r.end)]).toEqual(['2026-08-29', '2026-11-20'])
    r = calendarRange([], '2026-05-01', '2026-04-01')
    expect([dateKey(r.start), dateKey(r.end)]).toEqual(['2026-04-01', '2026-05-01'])
  })

  it('buildCalendar：欄 = 週、列 = 星期幾；月份標籤；值', () => {
    const values = new Map([['2026-11-03', 5]])
    // 2026-10-29 是星期四
    const { cells, weeks, months } = buildCalendar(new Date(2026, 9, 29), new Date(2026, 10, 10), 1, values)
    expect(cells).toHaveLength(13)
    expect(cells[0]).toMatchObject({ key: '2026-10-29', col: 0, row: 3, value: null })
    expect(cells.find((c) => c.key === '2026-11-02')).toMatchObject({ col: 1, row: 0 })
    expect(cells.find((c) => c.key === '2026-11-03')!.value).toBe(5)
    expect(weeks).toBe(3)
    // 10 月只有一欄的尾巴、11 月 1 日（週日）也在第 0 欄 → 太近，只留 11 月
    expect(months.map((m) => [m.col, dateKey(m.date)])).toEqual([[0, '2026-11-01']])
  })

  it('buildCalendar：第一個月從週末開始時標籤往右一欄；週日開始的版面', () => {
    // 2026-08-29 星期六（週一開始時是第 5 列 > 3）
    const r = buildCalendar(new Date(2026, 7, 29), new Date(2026, 9, 31), 1, new Map())
    expect(r.months.map((m) => [m.col, m.date.getMonth() + 1])).toEqual([
      [1, 9],
      [5, 10],
    ])
    const s = buildCalendar(new Date(2026, 10, 1), new Date(2026, 10, 7), 0, new Map())
    expect(s.cells.map((c) => c.row)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(s.weeks).toBe(1)
    expect(buildCalendar(new Date(2026, 1, 2), new Date(2026, 1, 1), 1, new Map()).weeks).toBe(0)
  })

  it('evenThresholds / levelOf / levelRange', () => {
    expect(evenThresholds(0, 10, 5)).toEqual([2, 4, 6, 8])
    expect(evenThresholds(3, 3, 3)).toEqual([3, 3])
    expect(evenThresholds(0, 10, 1)).toEqual([])
    const th = [2, 4, 6, 8]
    expect([levelOf(0, th), levelOf(2, th), levelOf(7.9, th), levelOf(8, th), levelOf(99, th)]).toEqual([0, 1, 3, 4, 4])
    expect(levelRange(0, th)).toEqual({ from: null, to: 2 })
    expect(levelRange(2, th)).toEqual({ from: 4, to: 6 })
    expect(levelRange(4, th)).toEqual({ from: 8, to: null })
  })
})
