import { describe, expect, it } from 'vitest'
import {
  DAY_MS,
  MIN_MS,
  addDays,
  conflictsOf,
  layoutColumn,
  moveEvent,
  overlaps,
  resizeEvent,
  sameDay,
  snap,
  startOfDay,
  toMs,
  weekDays,
  type SchedEvent,
} from '@/components/library/shared/scheduler'

const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime()
const ev = (id: string, start: number, end: number, extra: Partial<SchedEvent> = {}): SchedEvent => ({ id, title: id, start, end, ...extra })

describe('scheduler', () => {
  it('日期工具：toMs、startOfDay、addDays、weekDays、sameDay、snap', () => {
    const t = at(24, 10, 37)
    expect(toMs(t)).toBe(t)
    expect(toMs(new Date(t))).toBe(t)
    expect(toMs(new Date(t).toISOString())).toBe(t)
    expect(startOfDay(t)).toBe(at(24, 0))
    expect(startOfDay(new Date(t))).toBe(at(24, 0))
    expect(addDays(at(24, 0), 7)).toBe(new Date(2026, 11, 1).getTime())
    expect(addDays(at(24, 0), 1) - at(24, 0)).toBe(DAY_MS)
    // 2026-11-24 是星期二
    expect(weekDays(t).map((d) => new Date(d).getDate())).toEqual([23, 24, 25, 26, 27, 28, 29])
    expect(weekDays(t, 0).map((d) => new Date(d).getDate())).toEqual([22, 23, 24, 25, 26, 27, 28])
    expect(weekDays(at(22, 9)).map((d) => new Date(d).getDate())[0]).toBe(16) // 週日屬於前一週（週一開始）
    expect(sameDay(at(24, 1), at(24, 23))).toBe(true)
    expect(sameDay(at(24, 23), at(25, 0))).toBe(false)
    expect(snap(t, 15)).toBe(at(24, 10, 30))
    expect(snap(at(24, 10, 38), 15)).toBe(at(24, 10, 45))
    expect(snap(at(24, 23, 55), 30)).toBe(at(25, 0))
  })

  it('layoutColumn：重疊的事件並排，不重疊的另成一群', () => {
    const from = at(24, 8)
    const to = at(24, 18)
    const placed = layoutColumn(
      [
        ev('a', at(24, 9), at(24, 11)),
        ev('b', at(24, 10), at(24, 12)),
        ev('c', at(24, 11), at(24, 13)), // a 結束後可回到第 0 欄
        ev('d', at(24, 14), at(24, 15)), // 新的一群：只有 1 欄
      ],
      from,
      to
    )
    const by = Object.fromEntries(placed.map((p) => [p.event.id, p]))
    expect([by.a.col, by.b.col, by.c.col]).toEqual([0, 1, 0])
    expect([by.a.cols, by.b.cols, by.c.cols]).toEqual([2, 2, 2])
    expect([by.d.col, by.d.cols]).toEqual([0, 1])
    expect(by.a.top).toBeCloseTo(0.1)
    expect(by.a.height).toBeCloseTo(0.2)
    expect(by.d.clippedStart || by.d.clippedEnd).toBe(false)
  })

  it('layoutColumn：超出可見時段裁切、過短補到 15 分鐘、壞資料與範圍外略過、同時開始長的在前', () => {
    const from = at(24, 8)
    const to = at(24, 18)
    const placed = layoutColumn(
      [
        ev('early', at(24, 6), at(24, 9)),
        ev('late', at(24, 17), at(25, 1)),
        ev('tiny', at(24, 12), at(24, 12, 5)),
        ev('bad', Number.NaN, at(24, 9)),
        ev('out', at(23, 9), at(23, 10)),
        ev('short', at(24, 15), at(24, 15, 30)),
        ev('long', at(24, 15), at(24, 16, 30)),
      ],
      from,
      to
    )
    const by = Object.fromEntries(placed.map((p) => [p.event.id, p]))
    expect(Object.keys(by).sort()).toEqual(['early', 'late', 'long', 'short', 'tiny'])
    expect(by.early).toMatchObject({ clippedStart: true, clippedEnd: false, top: 0 })
    expect(by.early.height).toBeCloseTo(0.1)
    expect(by.late).toMatchObject({ clippedStart: false, clippedEnd: true })
    expect(by.late.top + by.late.height).toBeCloseTo(1)
    expect(by.tiny.end - by.tiny.start).toBe(15 * MIN_MS)
    expect([by.long.col, by.short.col]).toEqual([0, 1])
  })

  it('moveEvent / resizeEvent / overlaps / conflictsOf', () => {
    const e = ev('a', at(24, 9), at(24, 10, 30), { resource: 'm1' })
    expect(moveEvent(e, at(25, 13))).toMatchObject({ start: at(25, 13), end: at(25, 14, 30), resource: 'm1' })
    expect(moveEvent(e, at(25, 13), 'm2').resource).toBe('m2')
    expect(resizeEvent(e, at(24, 12)).end).toBe(at(24, 12))
    expect(resizeEvent(e, at(24, 8)).end).toBe(at(24, 9, 15))
    expect(resizeEvent(e, at(24, 8), 30).end).toBe(at(24, 9, 30))
    const b = ev('b', at(24, 10), at(24, 11), { resource: 'm1' })
    const c = ev('c', at(24, 10), at(24, 11), { resource: 'm2' })
    const d = ev('d', at(24, 10, 30), at(24, 11), { resource: 'm1' }) // 剛好接在 a 後面
    expect(overlaps(e, b)).toBe(true)
    expect(overlaps(e, c)).toBe(false)
    expect(overlaps(e, d)).toBe(false)
    expect(overlaps(ev('x', at(24, 9), at(24, 10)), ev('y', at(24, 9, 30), at(24, 11)))).toBe(true)
    expect(conflictsOf(e, [e, b, c, d]).map((x) => x.id)).toEqual(['b'])
  })
})
