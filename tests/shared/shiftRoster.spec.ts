import { describe, expect, it } from 'vitest'
import {
  coverage,
  dateKeyOf,
  fillRange,
  personStats,
  required,
  rosterDates,
  rosterWarnings,
  setShift,
  shiftOf,
  shortages,
  swapShifts,
  type RosterShift,
} from '@/components/library/shared/shiftRoster'

const shifts: RosterShift[] = [
  { code: 'D', label: '早', start: '06:00', end: '14:00' },
  { code: 'E', label: '中', start: '14:00', end: '22:00' },
  { code: 'N', label: '夜', start: '22:00', end: '06:00' },
  { code: 'X', label: '無時間' },
  { code: 'O', label: '休', off: true },
]
const people = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
]
const dates = rosterDates('2026-11-23', 3)

describe('shiftRoster', () => {
  it('rosterDates：字串或 Date、跨月；0 天', () => {
    expect(dates).toEqual(['2026-11-23', '2026-11-24', '2026-11-25'])
    expect(rosterDates(new Date(2026, 10, 30, 15), 2)).toEqual(['2026-11-30', '2026-12-01'])
    expect(rosterDates('2026-01-01', 0)).toEqual([])
    expect(dateKeyOf(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('coverage / required / shortages（固定數字或函式）', () => {
    const roster = { a: { '2026-11-23': 'D', '2026-11-24': 'O' }, b: { '2026-11-23': 'D', '2026-11-24': 'Z' } }
    const cov = coverage(roster, people, dates, shifts)
    expect(cov['2026-11-23']).toEqual({ D: 2, E: 0, N: 0, X: 0 })
    expect(cov['2026-11-24'].D).toBe(0)
    expect(required(undefined, '2026-11-23', 'D')).toBe(0)
    expect(required({ D: 2 }, '2026-11-23', 'E')).toBe(0)
    expect(shortages(cov, { D: 2 })).toEqual([
      { date: '2026-11-24', code: 'D', have: 0, need: 2 },
      { date: '2026-11-25', code: 'D', have: 0, need: 2 },
    ])
    expect(shortages(cov, (d, c) => (c === 'N' && d === '2026-11-25' ? 1 : 0))).toEqual([{ date: '2026-11-25', code: 'N', have: 0, need: 1 }])
  })

  it('rosterWarnings：休息不足（含跨夜）、連續上班；0 為不檢查；休假或沒有時間不檢查', () => {
    const r = { a: { '2026-11-23': 'N', '2026-11-24': 'D', '2026-11-25': 'E' }, b: { '2026-11-23': 'E', '2026-11-24': 'D', '2026-11-25': 'X' } }
    expect(rosterWarnings(r, people, dates, shifts)).toEqual([
      { kind: 'rest', personId: 'a', date: '2026-11-24', hours: 0 },
      { kind: 'rest', personId: 'b', date: '2026-11-24', hours: 8 },
    ])
    expect(rosterWarnings(r, people, dates, shifts, { minRestHours: 0 })).toEqual([])
    const long = rosterDates('2026-11-23', 4)
    const run = { a: Object.fromEntries(long.map((d) => [d, 'D'])) }
    expect(rosterWarnings(run, people, long, shifts, { maxConsecutive: 2 })).toEqual([
      { kind: 'consecutive', personId: 'a', date: '2026-11-25', days: 3 },
      { kind: 'consecutive', personId: 'a', date: '2026-11-26', days: 4 },
    ])
    expect(rosterWarnings(run, people, long, shifts, { maxConsecutive: 0 })).toEqual([])
    const off = { a: { '2026-11-23': 'O', '2026-11-24': 'D' } }
    expect(rosterWarnings(off, people, dates, shifts)).toEqual([])
  })

  it('personStats', () => {
    const r = { a: { '2026-11-23': 'D', '2026-11-24': 'O', '2026-11-25': 'N', '2026-11-26': 'D' } }
    expect(personStats(r, 'a', dates, shifts)).toEqual({ work: 2, byCode: { D: 1, E: 0, N: 1, X: 0, O: 1 } })
    expect(personStats({ a: { '2026-11-23': '?' } }, 'a', dates, shifts).work).toBe(0)
  })

  it('setShift / fillRange / swapShifts 不改原物件', () => {
    const r0 = { a: { '2026-11-23': 'D' } }
    const r1 = setShift(r0, 'a', '2026-11-24', 'E')
    expect(r0.a).toEqual({ '2026-11-23': 'D' })
    expect(shiftOf(r1, 'a', '2026-11-24')).toBe('E')
    expect(shiftOf(setShift(r1, 'a', '2026-11-23', null), 'a', '2026-11-23')).toBeNull()
    expect(shiftOf(r0, 'zzz', '2026-11-23')).toBeNull()
    const r2 = fillRange(r0, 'b', dates, '2026-11-25', '2026-11-23', 'N')
    expect(r2.b).toEqual({ '2026-11-23': 'N', '2026-11-24': 'N', '2026-11-25': 'N' })
    expect(fillRange(r0, 'b', dates, 'nope', '2026-11-23', 'N')).toBe(r0)
    const r3 = swapShifts(r2, '2026-11-23', 'a', 'b')
    expect([shiftOf(r3, 'a', '2026-11-23'), shiftOf(r3, 'b', '2026-11-23')]).toEqual(['N', 'D'])
    const r4 = swapShifts(r0, '2026-11-23', 'a', 'b')
    expect([shiftOf(r4, 'a', '2026-11-23'), shiftOf(r4, 'b', '2026-11-23')]).toEqual([null, 'D'])
  })
})
