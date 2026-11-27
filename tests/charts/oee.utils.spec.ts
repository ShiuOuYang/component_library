import { describe, expect, it } from 'vitest'
import { OEE_LOSSES, computeOee, oeeFromCounts } from '@/components/library/charts/utils/oee'

describe('oee', () => {
  it('六大損失 → 稼動、淨稼動、有效時間與 A × P × Q', () => {
    const r = computeOee({ plannedTime: 480, losses: { breakdown: 30, setup: 18, minorStops: 20, reducedSpeed: 12.8, startupRejects: 2, productionRejects: 6 } })
    expect(r.runTime).toBe(432)
    expect(r.netRunTime).toBeCloseTo(399.2, 10)
    expect(r.valuable).toBeCloseTo(391.2, 10)
    expect(r.availability).toBeCloseTo(0.9, 10)
    expect(r.performance).toBeCloseTo(399.2 / 432, 10)
    expect(r.quality).toBeCloseTo(391.2 / 399.2, 10)
    expect(r.oee).toBeCloseTo(r.availability * r.performance * r.quality, 12)
    expect(r.oee).toBeCloseTo(391.2 / 480, 12)
    expect(r.groupLoss).toEqual({ availability: 48, performance: 32.8, quality: 8 })
    expect(r.biggestLoss).toBe('breakdown')
    // 瀑布：總計從 0 起，損失浮在上一段的高度
    expect(r.steps.map((s) => `${s.kind}:${s.key}`)).toEqual([
      'total:planned', 'loss:breakdown', 'loss:setup', 'total:runTime', 'loss:minorStops', 'loss:reducedSpeed', 'total:netRunTime', 'loss:startupRejects', 'loss:productionRejects', 'total:valuable',
    ])
    expect(r.steps[1]).toMatchObject({ from: 450, to: 480, value: 30, group: 'availability' })
    expect(r.steps[2]).toMatchObject({ from: 432, to: 450 })
    expect(r.steps[3]).toMatchObject({ from: 0, to: 432 })
  })

  it('損失超過計畫時間時依序截掉；缺值、負值當 0；計畫時間 0', () => {
    const r = computeOee({ plannedTime: 100, losses: { breakdown: 70, setup: 50, minorStops: 10, productionRejects: -3 } })
    expect(r.losses).toEqual({ breakdown: 70, setup: 30, minorStops: 0, reducedSpeed: 0, startupRejects: 0, productionRejects: 0 })
    expect(r.valuable).toBe(0)
    expect(r.performance).toBe(0) // 稼動時間 0：比例定義為 0
    const z = computeOee({ plannedTime: 0, losses: {} })
    expect([z.oee, z.availability, z.biggestLoss]).toEqual([0, 0, null])
    expect(computeOee({ plannedTime: 10, losses: undefined as never }).oee).toBe(1)
    expect(OEE_LOSSES).toHaveLength(6)
  })

  it('由數量換算：理想週期、總數、良品數、啟動不良', () => {
    // 計畫 480、停機 30 + 25 → 稼動 425；理想 24 秒 × 1000 = 400 分；良品 985 → 不良 15 片 = 6 分（啟動 5 片 = 2 分）
    const l = oeeFromCounts({ plannedTime: 480, breakdown: 30, setup: 25, minorStops: 15, idealCycleTime: 24, totalCount: 1000, goodCount: 985, startupRejects: 5 })
    expect(l.plannedTime).toBe(480)
    expect(l.losses.minorStops).toBe(15)
    expect(l.losses.reducedSpeed).toBeCloseTo(10, 10)
    expect(l.losses.startupRejects).toBeCloseTo(2, 10)
    expect(l.losses.productionRejects).toBeCloseTo(4, 10)
    const r = computeOee(l)
    expect(r.oee).toBeCloseTo((24 * 985) / 60 / 480, 10)
    // 小停機大於性能損失、啟動不良大於總不良、良品大於總數、產量超過稼動時間
    const odd = oeeFromCounts({ plannedTime: 100, idealCycleTime: 60, totalCount: 200, goodCount: 300, minorStops: 50, startupRejects: 9 })
    expect(odd.losses).toMatchObject({ minorStops: 0, reducedSpeed: 0, startupRejects: 0, productionRejects: 0 })
    expect(computeOee(odd).oee).toBe(1)
  })
})
