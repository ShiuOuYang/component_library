import { describe, expect, it } from 'vitest'
import {
  adNormalPValue,
  adWeibullPValue,
  andersonDarling,
  bandHalfWidth,
  fitCdf,
  fitProbability,
  fitQuantile,
  fitX,
  medianRank,
  normCdf,
  normInv,
  probToY,
  probabilityTicks,
  valueToX,
  xToValue,
  yToProb,
} from '@/components/library/charts/utils/probability'

const data = [4.4, 2.1, 5.9, 3.3, 7.5, 2.9, 4.7, 3.6, 5.2, 4.0]

describe('probability', () => {
  it('normCdf / normInv：已知值、尾端、往返、邊界', () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 7)
    expect(normCdf(1.959963984540054)).toBeCloseTo(0.975, 6)
    expect(normCdf(-3)).toBeCloseTo(0.0013498980316301, 8)
    expect(normCdf(-8) / 6.22096057427178e-16).toBeCloseTo(1, 4)
    expect(normCdf(Infinity)).toBe(1)
    expect(normCdf(-Infinity)).toBe(0)
    expect(normCdf(NaN)).toBeNaN()
    expect(normInv(0.975)).toBeCloseTo(1.959963984540054, 7)
    expect(normInv(0.5)).toBeCloseTo(0, 9)
    expect(normInv(0.001)).toBeCloseTo(-3.090232306167813, 7)
    expect(normInv(0.999)).toBeCloseTo(3.090232306167813, 7)
    for (const p of [0.01, 0.2, 0.7, 0.99]) expect(normCdf(normInv(p))).toBeCloseTo(p, 6)
    expect(normInv(0)).toBe(-Infinity)
    expect(normInv(1)).toBe(Infinity)
    expect(normInv(1.5)).toBeNaN()
  })

  it('中位秩與座標轉換', () => {
    expect(medianRank(1, 10)).toBeCloseTo(0.7 / 10.4)
    expect(yToProb(probToY(0.3, 'normal'), 'normal')).toBeCloseTo(0.3, 6)
    expect(yToProb(probToY(0.3, 'weibull'), 'weibull')).toBeCloseTo(0.3, 12)
    expect(probToY(1 - Math.exp(-1), 'weibull')).toBeCloseTo(0, 12)
    expect(valueToX(5, 'normal')).toBe(5)
    expect(valueToX(Math.E, 'lognormal')).toBeCloseTo(1)
    expect(xToValue(1, 'weibull')).toBeCloseTo(Math.E)
    expect(xToValue(3, 'normal')).toBe(3)
  })

  it('常態配適：平均、標準差、A²（對照獨立計算）、p 值', () => {
    const f = fitProbability(data, 'normal')!
    expect(f.n).toBe(10)
    expect(f.params.location).toBeCloseTo(4.36, 10)
    expect(f.params.scale).toBeCloseTo(1.5678718768516204, 10)
    expect(f.mean).toBeCloseTo(4.36)
    expect(f.ad).toBeCloseTo(0.1648707949571495, 5)
    const a = 0.1648707949571495 * (1 + 0.075 + 0.0225)
    expect(f.pValue).toBeCloseTo(1 - Math.exp(-13.436 + 101.14 * a - 223.73 * a * a), 4)
    expect(f.pBound).toBeNull()
    expect(f.points.map((p) => p.value)).toEqual([...data].sort((x, y) => x - y))
    expect(f.points[0]).toMatchObject({ value: 2.1, index: 1, rank: 1 })
    expect(fitQuantile(f, 0.5)).toBeCloseTo(4.36)
    expect(fitX(f, 1)).toBeCloseTo(4.36 + 1.5678718768516204)
    expect(fitCdf(f, 4.36)).toBeCloseTo(0.5)
    expect(bandHalfWidth(f, 0)).toBeCloseTo((1.959963984540054 * 1.5678718768516204) / Math.sqrt(10))
  })

  it('對數常態與 Weibull 配適（對照獨立計算）；≤ 0 與非數字排除', () => {
    const ln = fitProbability([...data, 0, -1, 'x', null], 'lognormal')!
    expect(ln.excluded).toBe(4)
    expect(ln.params.location).toBeCloseTo(1.4135479803457742, 10)
    expect(ln.params.scale).toBeCloseTo(0.366579157801901, 10)
    expect(ln.ad).toBeCloseTo(0.09635493242556237, 5)
    expect(fitCdf(ln, 0)).toBe(0)
    expect(fitCdf(ln, Math.exp(1.4135479803457742))).toBeCloseTo(0.5)
    const wb = fitProbability(data, 'weibull')!
    expect(wb.params.shape).toBeCloseTo(3.067613079423614, 8)
    expect(wb.params.scale).toBeCloseTo(4.874783856088524, 8)
    expect(wb.ad).toBeCloseTo(0.15404178588525674, 5)
    expect(wb.pBound).toBe('gt')
    expect(wb.pValue).toBe(0.25)
    expect(fitQuantile(wb, 1 - Math.exp(-1))).toBeCloseTo(4.874783856088524, 8)
    expect(fitCdf(wb, -1)).toBe(0)
    expect(bandHalfWidth(wb, 0)).toBeGreaterThan(0)
    // 字串數字可以
    expect(fitProbability(['1', '2', '3.5'], 'normal')!.n).toBe(3)
  })

  it('資料不足、全部相同（退化）', () => {
    expect(fitProbability([1, 2], 'normal')).toBeNull()
    expect(fitProbability([1, 2, undefined, ''], 'normal')).toBeNull()
    const same = fitProbability([3, 3, 3, 3], 'normal')!
    expect(same.ad).toBeNaN()
    expect(same.pValue).toBeNaN()
    const sameW = fitProbability([3, 3, 3, 3], 'weibull')!
    expect(sameW.ad).toBeNaN()
  })

  it('p 值：各區段、邊界；Weibull 查表內插', () => {
    // A* 落在各區段
    expect(adNormalPValue(0.1, 1e9)).toBeCloseTo(1 - Math.exp(-13.436 + 10.114 - 2.2373), 6)
    expect(adNormalPValue(0.3, 1e9)).toBeCloseTo(1 - Math.exp(-8.318 + 42.796 * 0.3 - 59.938 * 0.09), 6)
    expect(adNormalPValue(0.5, 1e9)).toBeCloseTo(Math.exp(0.9177 - 4.279 * 0.5 - 1.38 * 0.25), 6)
    expect(adNormalPValue(1, 1e9)).toBeCloseTo(Math.exp(1.2937 - 5.709 + 0.0186), 6)
    expect(adNormalPValue(0, 1e9)).toBeCloseTo(1, 5)
    expect(adNormalPValue(50, 1e9)).toBeGreaterThanOrEqual(0)
    expect(adWeibullPValue(0.3, 1e12)).toEqual({ p: 0.25, bound: 'gt' })
    expect(adWeibullPValue(2, 1e12)).toEqual({ p: 0.01, bound: 'lt' })
    expect(adWeibullPValue(0.757, 1e12).p).toBeCloseTo(0.05, 6)
    const mid = adWeibullPValue(0.7, 1e12)
    expect(mid.bound).toBeNull()
    expect(mid.p).toBeLessThan(0.1)
    expect(mid.p).toBeGreaterThan(0.05)
    // 常態 p 很小時顯示 < 0.005
    const skew = fitProbability([1, 1.1, 1.2, 1.1, 1, 1.3, 1.2, 9, 12, 30, 1, 1.1, 1.05, 1.2, 50], 'normal')!
    expect(skew.pBound).toBe('lt')
    expect(skew.pValue).toBe(0.005)
  })

  it('andersonDarling：CDF 到 0 或 1 也不會無限大', () => {
    expect(Number.isFinite(andersonDarling([1, 2, 3], () => 0))).toBe(true)
    expect(Number.isFinite(andersonDarling([1, 2, 3], () => 1))).toBe(true)
  })

  it('常態資料的 p 值通常不小、指數資料的 p 值很小', () => {
    let s = 7
    const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
    const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-12)) * Math.cos(2 * Math.PI * rand())
    let rejected = 0
    for (let k = 0; k < 40; k++) if (fitProbability(Array.from({ length: 50 }, gauss), 'normal')!.pValue < 0.05) rejected++
    expect(rejected).toBeLessThanOrEqual(6)
    const expo = Array.from({ length: 60 }, () => -Math.log(rand() || 1e-12))
    expect(fitProbability(expo, 'normal')!.pValue).toBeLessThan(0.01)
    expect(fitProbability(expo, 'weibull')!.pValue).toBeGreaterThan(0.05)
  })

  it('probabilityTicks：只保留資料範圍附近、精簡版', () => {
    expect(probabilityTicks('normal', 10, false)).toEqual([0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95])
    expect(probabilityTicks('normal', 1000, false)[0]).toBe(0.001)
    expect(probabilityTicks('normal', 30, true)).toEqual([0.01, 0.05, 0.2, 0.5, 0.8, 0.95, 0.99])
    expect(probabilityTicks('weibull', 10, false)).toContain(0.632)
    expect(probabilityTicks('weibull', 10, true)).toEqual([0.05, 0.1, 0.3, 0.632, 0.9, 0.99])
  })
})
