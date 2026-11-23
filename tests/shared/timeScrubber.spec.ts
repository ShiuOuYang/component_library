import { describe, expect, it } from 'vitest'
import { adjacentEvent, advance, clampTime, niceStep, snap, toMs } from '@/components/library/shared/timeScrubber'

describe('timeScrubber', () => {
  it('toMs / clampTime', () => {
    expect(toMs(5)).toBe(5)
    expect(toMs(new Date(7))).toBe(7)
    expect(toMs('1970-01-01T00:00:00.010Z')).toBe(10)
    expect(toMs(null)).toBeNull()
    expect(toMs(undefined)).toBeNull()
    expect(toMs('')).toBeNull()
    expect(toMs('nope')).toBeNull()
    expect(clampTime(5, 0, 10)).toBe(5)
    expect(clampTime(-5, 0, 10)).toBe(0)
    expect(clampTime(50, 0, 10)).toBe(10)
  })

  it('advance：依倍速前進；到結尾停止或循環；不會小於起點', () => {
    expect(advance(0, 100, 60, 0, 1e6)).toEqual({ t: 6000, ended: false })
    expect(advance(990, 100, 1, 0, 1000)).toEqual({ t: 1000, ended: true })
    expect(advance(990, 100, 1, 0, 1000, true)).toEqual({ t: 90, ended: false })
    expect(advance(-50, 10, 1, 0, 1000)).toEqual({ t: 0, ended: false })
    // 範圍為 0 時循環也直接結束
    expect(advance(5, 10, 1, 5, 5, true)).toEqual({ t: 5, ended: true })
  })

  it('adjacentEvent：上一個 / 下一個；差不到 eps 的算同一點', () => {
    const times = [1000, 5000, 9000]
    expect(adjacentEvent(times, 5000, 1)).toBe(9000)
    expect(adjacentEvent(times, 5000, -1)).toBe(1000)
    expect(adjacentEvent(times, 5200, -1)).toBe(1000)
    expect(adjacentEvent(times, 5600, -1)).toBe(5000)
    expect(adjacentEvent(times, 9000, 1)).toBeNull()
    expect(adjacentEvent(times, 0, -1)).toBeNull()
    expect(adjacentEvent([], 0, 1)).toBeNull()
    expect(adjacentEvent(times, 0, 1, 0)).toBe(1000)
  })

  it('niceStep：總長度約 1/100、取好讀的單位', () => {
    expect(niceStep(60_000)).toBe(1_000)
    expect(niceStep(3_600_000)).toBe(60_000)
    expect(niceStep(8 * 3_600_000)).toBe(300_000)
    expect(niceStep(24 * 3_600_000)).toBe(1_800_000)
    expect(niceStep(365 * 86_400_000)).toBe(86_400_000)
  })

  it('snap', () => {
    expect(snap(1499, 1000)).toBe(1000)
    expect(snap(1500, 1000)).toBe(2000)
    expect(snap(1700, 1000, 200)).toBe(2200)
    expect(snap(1234, 0)).toBe(1234)
  })
})
