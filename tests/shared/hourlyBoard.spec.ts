import { describe, expect, it } from 'vitest'
import {
  buildHourlySlots,
  crossesMidnight,
  fromMinutes,
  hourlySummary,
  patchSlot,
  shiftMinutes,
  slotElapsed,
  slotState,
  toMinutes,
  type HourlySlot,
} from '@/components/library/shared/hourlyBoard'

describe('hourlyBoard', () => {
  it('toMinutes / fromMinutes / shiftMinutes', () => {
    expect(toMinutes('08:30')).toBe(510)
    expect(toMinutes(' 7:05 ')).toBe(425)
    expect(toMinutes('24:00')).toBe(1440)
    expect(toMinutes('25:00')).toBeNaN()
    expect(toMinutes('08:60')).toBeNaN()
    expect(toMinutes('nope')).toBeNaN()
    expect(fromMinutes(510)).toBe('08:30')
    expect(fromMinutes(1440 + 65)).toBe('01:05')
    expect(fromMinutes(-30)).toBe('23:30')
    expect(shiftMinutes('02:00', '20:00')).toBe(26 * 60)
    expect(shiftMinutes('21:00', '20:00')).toBe(21 * 60)
  })

  it('buildHourlySlots：扣休息、跨午夜、時段長度、格式錯誤', () => {
    const day = buildHourlySlots({ start: '08:00', end: '12:30', rate: 120, breaks: [{ start: '10:00', end: '10:10' }] })
    expect(day.map((s) => [s.start, s.end, s.plan, s.breakMinutes ?? 0])).toEqual([
      ['08:00', '09:00', 120, 0],
      ['09:00', '10:00', 120, 0],
      ['10:00', '11:00', 100, 10],
      ['11:00', '12:00', 120, 0],
      ['12:00', '12:30', 60, 0],
    ])
    expect(day[0]).toMatchObject({ id: '08:00', actual: null })
    expect(day[0]).not.toHaveProperty('breakMinutes')
    const night = buildHourlySlots({ start: '22:00', end: '02:00', rate: 60, breaks: [{ start: '23:50', end: '00:20' }] })
    expect(night.map((s) => [s.start, s.plan])).toEqual([
      ['22:00', 60],
      ['23:00', 50],
      ['00:00', 40],
      ['01:00', 60],
    ])
    expect(buildHourlySlots({ start: '08:00', end: '09:00', rate: 60, interval: 30 })).toHaveLength(2)
    expect(buildHourlySlots({ start: '08:00', end: '08:20', rate: 60, interval: 1 })).toHaveLength(4)
    expect(buildHourlySlots({ start: 'x', end: '09:00', rate: 60 })).toEqual([])
  })

  it('slotState / slotElapsed（含跨午夜）', () => {
    const s: HourlySlot = { id: 'a', start: '09:00', end: '10:00', plan: 10 }
    expect(slotState(s, 8 * 60, '08:00')).toBe('future')
    expect(slotState(s, 9 * 60 + 30, '08:00')).toBe('current')
    expect(slotState(s, 10 * 60, '08:00')).toBe('past')
    expect(slotElapsed(s, 9 * 60 + 15, '08:00')).toBeCloseTo(0.25)
    expect(slotElapsed(s, 7 * 60, '08:00')).toBe(0)
    const n: HourlySlot = { id: 'n', start: '23:00', end: '00:00', plan: 10 }
    expect(crossesMidnight([n], '22:00')).toBe(true)
    expect(crossesMidnight([s], '08:00')).toBe(false)
    expect(slotState(n, 23 * 60 + 30, '22:00', true)).toBe('current')
    expect(slotState(n, 30, '22:00', true)).toBe('past')
    expect(slotElapsed(n, 23 * 60 + 30, '22:00', true)).toBeCloseTo(0.5)
    const early: HourlySlot = { id: 'e', start: '01:00', end: '02:00', plan: 10 }
    expect(slotState(early, 23 * 60, '22:00', true)).toBe('future')
    expect(slotState(early, 90, '22:00', true)).toBe('current')
    // 白天班：班別開始前都是未來
    expect(slotState(s, 7 * 60, '08:00')).toBe('future')
  })

  it('hourlySummary：累計、應做（目前時段依比例）、達成率、預估、待填原因', () => {
    const slots: HourlySlot[] = [
      { id: '1', start: '08:00', end: '09:00', plan: 100, actual: 90 },
      { id: '2', start: '09:00', end: '10:00', plan: 100, actual: 80, reason: 'X' },
      { id: '3', start: '10:00', end: '11:00', plan: 100, actual: 110 },
      { id: '4', start: '11:00', end: '12:00', plan: 100, actual: 30 },
      { id: '5', start: '12:00', end: '13:00', plan: 100, actual: null },
    ]
    const s = hourlySummary(slots, 11 * 60 + 30, '08:00')
    expect(s.rows.map((r) => r.state)).toEqual(['past', 'past', 'past', 'current', 'future'])
    expect(s.rows.map((r) => r.diff)).toEqual([-10, -20, 10, -70, null])
    expect(s.rows.map((r) => r.cumDiff)).toEqual([-10, -30, -20, -90, null])
    expect(s.rows.map((r) => r.needsReason)).toEqual([true, false, false, false, false])
    expect(s.totalPlan).toBe(500)
    expect(s.planToNow).toBe(350)
    expect(s.actualToNow).toBe(310)
    expect(s.achievement).toBeCloseTo(310 / 350)
    expect(s.forecast).toBe(Math.round(310 + 150 * (310 / 350)))
    expect(s.missingReasons).toBe(1)
    expect(s.hasNow).toBe(true)
  })

  it('hourlySummary：沒有 now 時以有填的時段為準、不預估；還沒開始', () => {
    const slots: HourlySlot[] = [
      { id: '1', start: '08:00', end: '09:00', plan: 100, actual: 100 },
      { id: '2', start: '09:00', end: '10:00', plan: 100 },
    ]
    const s = hourlySummary(slots, null, '08:00')
    expect(s.rows.map((r) => r.state)).toEqual(['past', 'future'])
    expect(s.achievement).toBe(1)
    expect(s.forecast).toBeNull()
    const before = hourlySummary(slots, 7 * 60, '08:00')
    expect(before.achievement).toBeNull()
    expect(before.forecast).toBeNull()
    expect(before.rows[0].cumActual).toBeNull()
    // 夜班：凌晨的時間接在前一天後面
    const night: HourlySlot[] = [
      { id: 'a', start: '22:00', end: '23:00', plan: 60, actual: 60 },
      { id: 'b', start: '23:00', end: '00:00', plan: 60, actual: 30 },
      { id: 'c', start: '00:00', end: '01:00', plan: 60 },
    ]
    const ns = hourlySummary(night, 30, '22:00')
    expect(ns.rows.map((r) => r.state)).toEqual(['past', 'past', 'current'])
    expect(ns.planToNow).toBe(150)
  })

  it('patchSlot：不改原陣列', () => {
    const slots: HourlySlot[] = [{ id: '1', start: '08:00', end: '09:00', plan: 1 }]
    const next = patchSlot(slots, '1', { actual: 5 })
    expect(next[0].actual).toBe(5)
    expect(slots[0].actual).toBeUndefined()
    expect(patchSlot(slots, 'x', { actual: 1 })[0]).toBe(slots[0])
  })
})
