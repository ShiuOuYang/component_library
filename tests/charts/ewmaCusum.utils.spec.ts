import { describe, expect, it } from 'vitest'
import { baseline, cusum, ewma, extractSeries } from '@/components/library/charts/utils/ewmaCusum'

describe('ewmaCusum', () => {
  it('基準：有給用給的，沒給用平均與移動全距', () => {
    expect(baseline([1, 2, 3], 5, 2)).toEqual({ mu0: 5, sigma: 2 })
    const b = baseline([10, 12, 11, 13])
    expect(b.mu0).toBe(11.5)
    expect(b.sigma).toBeCloseTo(((2 + 1 + 2) / 3) / 1.128, 10)
    expect(baseline([1], null, -1).sigma).toBeNaN()
    expect(baseline([1, 1], 0, 0).sigma).toBe(0) // σ = 0 時用估計值（也是 0）
  })

  it('EWMA：遞推、隨點數展開的界限、穩態界限、訊號', () => {
    const r = ewma([11, 10, 12], { lambda: 0.5, L: 3, target: 10, sigma: 1 })
    expect(r.points.map((p) => p.z)).toEqual([10.5, 10.25, 11.125])
    // i = 1：L·σ·√(λ/(2−λ)·(1 − (1−λ)²)) = 3 · √(1/3 · 0.75) = 1.5
    expect(r.points[0].ucl).toBeCloseTo(11.5, 10)
    expect(r.points[0].lcl).toBeCloseTo(8.5, 10)
    expect(r.points[2].ucl).toBeLessThan(r.steadyUcl)
    expect(r.steadyUcl).toBeCloseTo(10 + 3 * Math.sqrt(1 / 3), 10)
    expect(r.firstSignal).toBeNull()
    // 持續偏高 2σ → 訊號（偏 1σ 時 z 只會逼近穩態 UCL = 10 + 3·√(0.2/1.8) = 11，不會超過）
    const s = ewma(Array(20).fill(12), { lambda: 0.2, L: 3, target: 10, sigma: 1 })
    expect(s.firstSignal).not.toBeNull()
    expect(s.points[s.firstSignal!].signal).toBe(true)
    // λ 限制在 0.01～1
    expect(ewma([1, 2], { lambda: 5 }).lambda).toBe(1)
    expect(ewma([1, 2], { lambda: 0 }).lambda).toBe(0.01)
    // σ 無法估計（只有一點）：不判訊號
    expect(ewma([5]).points[0].signal).toBe(false)
  })

  it('CUSUM：上下累積和、決策界限、偏移開始與新平均', () => {
    // μ0 = 10、σ = 1、k = 0.5、h = 2 → K = 0.5、H = 2
    const r = cusum([10, 10, 11, 12, 11.5, 12], { target: 10, sigma: 1, k: 0.5, h: 2 })
    expect(r.points.map((p) => p.cPlus)).toEqual([0, 0, 0.5, 2, 3, 4.5])
    expect(r.points.map((p) => p.nPlus)).toEqual([0, 0, 1, 2, 3, 4])
    expect(r.points.map((p) => p.signal)).toEqual([null, null, null, null, 'up', 'up'])
    expect(r.shift).toEqual({ signalAt: 4, onset: 2, direction: 'up', newMean: 10 + 0.5 + 3 / 3 })
    expect([r.K, r.H]).toEqual([0.5, 2])

    const d = cusum([10, 8, 8, 8], { target: 10, sigma: 1, k: 0.5, h: 2 })
    expect(d.points.map((p) => p.cMinus)).toEqual([0, 1.5, 3, 4.5])
    expect(d.shift).toMatchObject({ signalAt: 2, onset: 1, direction: 'down', newMean: 10 - 0.5 - 3 / 2 })
    expect(cusum([10, 10.2, 9.9], { target: 10, sigma: 1 }).shift).toBeNull()
    expect(cusum([5]).points[0].signal).toBeNull() // σ 無法估計
  })

  it('從資料列取出數值與標籤', () => {
    expect(extractSeries([1, 2, NaN, 3])).toEqual({ values: [1, 2, 3], labels: ['1', '2', '3'], rows: [0, 1, 3] })
    const rows = [{ v: 1, t: 'a' }, { v: null, t: 'b' }, { v: '2', t: 'c' }, { v: 3 }]
    expect(extractSeries(rows, 'v', 't')).toEqual({ values: [1, 2, 3], labels: ['a', 'c', '3'], rows: [0, 2, 3] })
  })
})
