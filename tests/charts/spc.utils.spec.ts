import { describe, expect, it } from 'vitest'
import {
  buildSamples,
  c4,
  checkRules,
  computeCapability,
  computeLimits,
  controlConstants,
  d2,
  mean,
  normalCdf,
  normalPdf,
  stdev,
  withinSigma,
  type LimitSeries,
  type SampleOptions,
} from '@/components/library/charts/utils/spc'

const OPTS: SampleOptions = {
  valueField: 'value',
  labelField: 'label',
  subgroupField: 'subgroup',
  subgroupSize: 5,
  defectsField: 'defects',
  sizeField: 'size',
}

describe('管制常數（對照教科書表列值）', () => {
  it.each([
    // n, A2, D3, D4, A3, B3, B4, c4
    [2, 1.88, 0, 3.267, 2.659, 0, 3.267, 0.7979],
    [5, 0.577, 0, 2.114, 1.427, 0, 2.089, 0.94],
    [7, 0.419, 0.076, 1.924, 1.182, 0.118, 1.882, 0.9594],
    [10, 0.308, 0.223, 1.777, 0.975, 0.284, 1.716, 0.9727],
  ])('n = %i', (n, A2, D3, D4, A3, B3, B4, c) => {
    const k = controlConstants(n)
    expect(k.A2).toBeCloseTo(A2, 2)
    expect(k.D3).toBeCloseTo(D3, 2)
    expect(k.D4).toBeCloseTo(D4, 2)
    expect(k.A3).toBeCloseTo(A3, 2)
    expect(k.B3).toBeCloseTo(B3, 2)
    expect(k.B4).toBeCloseTo(B4, 2)
    expect(c4(n)).toBeCloseTo(c, 3)
  })

  it('c4 對大子組也算得出（X̄-S 用）；超出表格範圍的 d2 為 NaN', () => {
    expect(c4(25)).toBeCloseTo(0.9896, 3)
    expect(c4(1)).toBeNaN()
    expect(d2(11)).toBeNaN()
  })
})

describe('基本統計', () => {
  it('平均、樣本標準差（n − 1）', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5)
    expect(mean([])).toBeNaN()
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3)
    expect(stdev([1])).toBeNaN()
  })

  it('常態分配', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6)
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 4)
    expect(normalCdf(-3)).toBeCloseTo(0.00135, 5)
    expect(normalCdf(Infinity)).toBe(1)
    expect(normalCdf(-Infinity)).toBe(0)
    expect(normalPdf(0, 0, 1)).toBeCloseTo(0.3989, 4)
  })
})

describe('buildSamples', () => {
  it('I-MR：移動全距；缺值斷開', () => {
    const s = buildSamples('imr', [{ value: 10 }, { value: 12 }, { value: '' }, { value: 11 }, { value: 13, label: 'L5' }], OPTS)
    expect(s.map((x) => x.value)).toEqual([10, 12, null, 11, 13])
    expect(s.map((x) => x.secondary)).toEqual([null, 2, null, null, 2])
    expect(s.map((x) => x.label)).toEqual(['1', '2', '3', '4', 'L5'])
  })

  it('X̄：有子組欄位時依第一次出現的順序分組；全距與標準差', () => {
    const rows = [
      { subgroup: 'B', value: 1 },
      { subgroup: 'A', value: 4 },
      { subgroup: 'B', value: 3 },
      { subgroup: 'A', value: 6 },
      { subgroup: 'A', value: 8 },
    ]
    const r = buildSamples('xbar-r', rows, OPTS)
    expect(r.map((x) => [x.label, x.value, x.secondary, x.n])).toEqual([
      ['B', 2, 2, 2],
      ['A', 6, 4, 3],
    ])
    expect(buildSamples('xbar-s', rows, OPTS)[1].secondary).toBeCloseTo(2)
  })

  it('X̄：沒有子組欄位時依 subgroupSize 依序切，不完整的最後一組不算', () => {
    const rows = Array.from({ length: 7 }, (_, i) => ({ value: i, label: `R${i}` }))
    const s = buildSamples('xbar-r', rows, { ...OPTS, subgroupSize: 3 })
    expect(s.map((x) => [x.label, x.value, x.n])).toEqual([
      ['R0', 1, 3],
      ['R3', 4, 3],
    ])
  })

  it('p／u：不良數 ÷ 樣本數；樣本數 0 為缺值', () => {
    const s = buildSamples('p', [{ defects: 3, size: 100 }, { defects: 1, size: 0 }, { size: 50 }], OPTS)
    expect(s.map((x) => [x.value, x.n])).toEqual([[0.03, 100], [null, 0], [null, 50]])
  })
})

describe('computeLimits', () => {
  it('I-MR：σ̂ = MR̄ / 1.128，與 x̄ ± 2.66 MR̄ 相同', () => {
    const samples = buildSamples('imr', [10, 12, 11, 13, 12].map((value) => ({ value })), OPTS)
    const a = computeLimits('imr', samples)
    // MR̄ = 1.5
    expect(a.sigmaHat).toBeCloseTo(1.5 / 1.128, 6)
    expect(a.main.cl[0]).toBeCloseTo(11.6)
    expect(a.main.ucl[0]).toBeCloseTo(11.6 + 2.66 * 1.5, 1)
    expect(a.main.lcl[0]).toBeCloseTo(11.6 - 2.66 * 1.5, 1)
    expect(a.secondary!.cl[0]).toBeCloseTo(1.5)
    expect(a.secondary!.ucl[0]).toBeCloseTo(3.267 * 1.5, 1)
    expect(a.secondary!.lcl[0]).toBe(0)
  })

  it('X̄-R：與 X̿ ± A2 R̄、D3 R̄～D4 R̄ 相同', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ value: 10 + ((i * 7) % 5) * 0.1 + (i % 3) * 0.05 }))
    const samples = buildSamples('xbar-r', rows, OPTS)
    const a = computeLimits('xbar-r', samples)
    const xbb = mean(samples.map((s) => s.value as number))
    const rbar = mean(samples.map((s) => s.secondary as number))
    const k = controlConstants(5)
    expect(a.main.ucl[0]).toBeCloseTo(xbb + k.A2 * rbar, 6)
    expect(a.main.lcl[0]).toBeCloseTo(xbb - k.A2 * rbar, 6)
    expect(a.secondary!.ucl[0]).toBeCloseTo(k.D4 * rbar, 6)
    expect(a.secondary!.lcl[0]).toBeCloseTo(k.D3 * rbar, 6)
    expect(a.secondary!.cl[0]).toBeCloseTo(rbar, 6)
  })

  it('X̄-S：與 X̿ ± A3 s̄、B3 s̄～B4 s̄ 相同', () => {
    const rows = Array.from({ length: 24 }, (_, i) => ({ value: 5 + Math.sin(i) }))
    const samples = buildSamples('xbar-s', rows, { ...OPTS, subgroupSize: 6 })
    const a = computeLimits('xbar-s', samples)
    const xbb = mean(samples.map((s) => s.value as number))
    const sbar = mean(samples.map((s) => s.secondary as number))
    const k = controlConstants(6)
    expect(a.main.ucl[0]).toBeCloseTo(xbb + k.A3 * sbar, 6)
    expect(a.secondary!.ucl[0]).toBeCloseTo(k.B4 * sbar, 6)
    expect(a.secondary!.lcl[0]).toBeCloseTo(k.B3 * sbar, 6)
  })

  it('子組大小不同：界限依各子組大小（n 越大越窄）', () => {
    const rows = [
      ...[1, 2, 3].map((value) => ({ subgroup: 'a', value })),
      ...[1, 2, 3, 2, 1, 3].map((value) => ({ subgroup: 'b', value })),
    ]
    const a = computeLimits('xbar-r', buildSamples('xbar-r', rows, OPTS))
    expect(a.main.ucl[1] - a.main.cl[1]).toBeLessThan(a.main.ucl[0] - a.main.cl[0])
  })

  it('p 圖：p̄ = Σ不良 / Σ樣本數；LCL 不小於 0；樣本數不同時界限逐點不同', () => {
    const rows = [
      { defects: 2, size: 100 },
      { defects: 3, size: 100 },
      { defects: 1, size: 100 },
      { defects: 4, size: 400 },
    ]
    const a = computeLimits('p', buildSamples('p', rows, OPTS))
    expect(a.main.cl[0]).toBeCloseTo(10 / 700)
    const s100 = Math.sqrt(((10 / 700) * (1 - 10 / 700)) / 100)
    expect(a.main.ucl[0]).toBeCloseTo(10 / 700 + 3 * s100)
    expect(a.main.lcl[0]).toBe(0)
    expect(a.main.ucl[3]).toBeLessThan(a.main.ucl[0])
    expect(a.secondary).toBeNull()
  })

  it('u 圖：ū = Σ缺點 / Σ單位數', () => {
    const a = computeLimits('u', buildSamples('u', [{ defects: 6, size: 2 }, { defects: 2, size: 2 }], OPTS))
    expect(a.main.cl[0]).toBe(2)
    expect(a.main.ucl[0]).toBeCloseTo(2 + 3 * Math.sqrt(2 / 2))
  })

  it('baseline：只用前 N 點估計界限', () => {
    const samples = buildSamples('imr', [10, 11, 10, 11, 30, 40].map((value) => ({ value })), OPTS)
    const all = computeLimits('imr', samples)
    const base = computeLimits('imr', samples, 4)
    expect(base.main.cl[0]).toBeCloseTo(10.5)
    expect(base.main.ucl[5]).toBeLessThan(all.main.ucl[5])
  })

  it('指定固定界限：σ 由 (UCL − CL) / 3 推得', () => {
    const samples = buildSamples('imr', [1, 2, 3].map((value) => ({ value })), OPTS)
    const a = computeLimits('imr', samples, null, { main: { cl: 10, ucl: 16, lcl: 4 }, secondary: { cl: 1, ucl: 3, lcl: 0 } })
    expect(a.main.cl).toEqual([10, 10, 10])
    expect(a.main.sigma[0]).toBe(2)
    expect(a.secondary!.ucl[0]).toBe(3)
  })
})

describe('Nelson 判異規則', () => {
  /** CL 0、σ 1 的界限 */
  const unit = (n: number): LimitSeries => ({
    cl: Array(n).fill(0),
    ucl: Array(n).fill(3),
    lcl: Array(n).fill(-3),
    sigma: Array(n).fill(1),
  })
  const run = (values: (number | null)[], rules: number[]) => checkRules(values, unit(values.length), rules)
  const flagged = (values: (number | null)[], rule: number) => run(values, [rule]).map((v) => v.index)

  it('規則 1：超出 ±3σ', () => {
    expect(flagged([0, 3.5, -0.2, -3.1], 1)).toEqual([1, 3])
  })

  it('規則 2：連續 9 點在同一側（標在第 9 點起）', () => {
    expect(flagged(Array(10).fill(0.4), 2)).toEqual([8, 9])
    expect(flagged([...Array(8).fill(0.4), -0.1, 0.4], 2)).toEqual([])
  })

  it('規則 3：連續 6 點持續上升或下降', () => {
    expect(flagged([0, 0.1, 0.2, 0.3, 0.4, 0.5], 3)).toEqual([5])
    expect(flagged([1, 0.8, 0.6, 0.4, 0.2, 0], 3)).toEqual([5])
    expect(flagged([0, 0.1, 0.2, 0.2, 0.4, 0.5], 3)).toEqual([])
  })

  it('規則 4：連續 14 點上下交錯', () => {
    const alt = Array.from({ length: 14 }, (_, i) => (i % 2 ? 0.5 : -0.5))
    expect(flagged(alt, 4)).toEqual([13])
    expect(flagged(alt.slice(0, 13), 4)).toEqual([])
  })

  it('規則 5：3 點中 2 點在同一側 2σ 之外（標在超出的那一點）', () => {
    expect(flagged([2.5, 0.1, 2.4], 5)).toEqual([2])
    expect(flagged([2.5, 0.1, -2.4], 5)).toEqual([])
  })

  it('規則 6：5 點中 4 點在同一側 1σ 之外', () => {
    expect(flagged([1.5, 1.2, 0.2, 1.4, 1.1], 6)).toEqual([4])
  })

  it('規則 7：連續 15 點都在 1σ 之內', () => {
    expect(flagged(Array.from({ length: 15 }, (_, i) => (i % 3) * 0.2 - 0.2), 7)).toEqual([14])
  })

  it('規則 8：連續 8 點都在 1σ 之外、兩側都有', () => {
    expect(flagged([1.5, -1.5, 1.2, -1.3, 1.4, -1.6, 1.8, -1.2], 8)).toEqual([7])
    expect(flagged(Array(8).fill(1.5), 8)).toEqual([])
  })

  it('缺值中斷連續計數；同一點可觸發多條規則；沒開的規則不檢查', () => {
    expect(flagged([...Array(5).fill(0.4), null, ...Array(4).fill(0.4)], 2)).toEqual([])
    const v = run([2.5, 2.6, 3.5], [1, 5, 6])
    expect(v).toEqual([
      { index: 1, rules: [5] },
      { index: 2, rules: [1, 5] },
    ])
    expect(run([3.5], [2])).toEqual([])
  })

  it('規則 1 看實際界限（p 圖的 UCL 被夾在 1 以內）', () => {
    const limits: LimitSeries = { cl: [0.5], ucl: [0.6], lcl: [0.4], sigma: [1] }
    expect(checkRules([0.7], limits, [1])).toEqual([{ index: 0, rules: [1] }])
  })
})

describe('製程能力', () => {
  const values = [9.8, 10.0, 10.2, 10.0, 9.9, 10.1]

  it('Cp、Cpk（組內：移動全距）與 Pp、Ppk（整體）', () => {
    const c = computeCapability({ values, lsl: 9.5, usl: 10.5, subgroupSize: 1 })
    expect(c.n).toBe(6)
    expect(c.mean).toBeCloseTo(10)
    expect(c.sigmaOverall).toBeCloseTo(Math.sqrt(0.1 / 5), 6)
    // MR = .2 .2 .2 .1 .2 → 0.18 / 1.128
    expect(c.sigmaWithin).toBeCloseTo(0.18 / 1.128, 6)
    expect(c.cp).toBeCloseTo(1 / (6 * (0.18 / 1.128)), 4)
    expect(c.cpk).toBeCloseTo(c.cp!, 6)
    expect(c.pp).toBeCloseTo(1 / (6 * Math.sqrt(0.02)), 4)
    expect(c.ppk).toBeCloseTo(c.pp!, 6)
  })

  it('平均偏一邊時 Cpk 取較近的那一側', () => {
    const c = computeCapability({ values: values.map((v) => v + 0.2), lsl: 9.5, usl: 10.5, subgroupSize: 1 })
    expect(c.cpu!).toBeLessThan(c.cpl!)
    expect(c.cpk).toBe(c.cpu)
  })

  it('單邊規格：Cp、Pp 沒有定義，Cpk 取有規格的那一側', () => {
    const c = computeCapability({ values, lsl: null, usl: 10.5, subgroupSize: 1 })
    expect(c.cp).toBeNull()
    expect(c.pp).toBeNull()
    expect(c.cpl).toBeNull()
    expect(c.cpk).toBe(c.cpu)
  })

  it('PPM：實際落在規格外的比例與常態預估', () => {
    const c = computeCapability({ values: [...values, 11, 9], lsl: 9.5, usl: 10.5, subgroupSize: 1 })
    expect(c.ppmObserved).toEqual({ below: 125000, above: 125000, total: 250000 })
    expect(c.ppmExpected.total).toBeGreaterThan(0)
    expect(c.ppmExpected.below).toBeCloseTo(c.ppmExpected.above, -2)
  })

  it('資料不足：指標為 null，不會出錯', () => {
    const c = computeCapability({ values: [10], lsl: 9, usl: 11, subgroupSize: 1 })
    expect(c.cpk).toBeNull()
    expect(c.ppk).toBeNull()
    expect(c.ppmExpected.total).toBe(0)
  })

  it('組內標準差：子組 2～10 用 R̄ / d2，更大用 s̄ / c4', () => {
    const v = Array.from({ length: 24 }, (_, i) => 10 + Math.sin(i * 1.3))
    const groups4 = [0, 4, 8, 12, 16, 20].map((s) => v.slice(s, s + 4))
    expect(withinSigma(v, 4)).toBeCloseTo(mean(groups4.map((g) => Math.max(...g) - Math.min(...g))) / d2(4), 6)
    const groups12 = [v.slice(0, 12), v.slice(12, 24)]
    expect(withinSigma(v, 12)).toBeCloseTo(mean(groups12.map((g) => stdev(g))) / c4(12), 6)
  })
})
