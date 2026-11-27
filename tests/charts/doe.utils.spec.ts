import { describe, expect, it } from 'vitest'
import { analyzeDoe, codeDesign, doeTerms, factorLetter, interactionMeans, mainEffectMeans, tCrit975, type DoeRun } from '@/components/library/charts/utils/doe'

/** 2² 全因子、重複 2 次：y = 10 + 2A + 1B + 0.5AB（效果 = 2 × 係數），加一點組內差異 */
const RUNS: DoeRun[] = []
for (const A of [-1, 1]) for (const B of [-1, 1]) for (const d of [-0.1, 0.1]) RUNS.push({ x: [A, B], y: 10 + 2 * A + B + 0.5 * A * B + d })

describe('doe', () => {
  it('編碼：自動高低水準（數字由小到大）、指定水準、略過中心點與非數值', () => {
    const data = [
      { T: 250, M: 'B', y: 1 },
      { T: 240, M: 'A', y: 2 },
      { T: 245, M: 'A', y: 3 }, // 中心點
      { T: 240, M: 'B', y: null },
    ]
    const d = codeDesign(data, ['T', 'M'], 'y', { T: [240, 250] })
    expect(d.levels).toEqual([[240, 250], ['A', 'B']])
    expect(d.runs).toEqual([{ x: [1, 1], y: 1 }, { x: [-1, -1], y: 2 }])
    expect(d.dropped).toBe(2)
    expect(d.invalidFactors).toEqual([])
    // 自動判斷：三個水準 → 無法分析
    const bad = codeDesign(data, ['T'], 'y')
    expect(bad.invalidFactors).toEqual([0])
    expect(bad.runs).toEqual([])
    // 已編碼的 −1 / +1
    expect(codeDesign([{ A: 1, y: 2 }, { A: -1, y: 1 }], ['A'], 'y').runs).toEqual([{ x: [1], y: 2 }, { x: [-1], y: 1 }])
    // 空值忽略、字串水準自然排序
    expect(codeDesign([{ F: 'L10', y: 1 }, { F: 'L2', y: 2 }, { F: '', y: 3 }], ['F'], 'y').levels).toEqual([['L2', 'L10']])
  })

  it('項目：主效果在前、交互作用在後', () => {
    expect(doeTerms(3).map((t) => t.key)).toEqual(['A', 'B', 'C', 'AB', 'AC', 'BC'])
    expect(doeTerms(3, 3).map((t) => t.key)).toEqual(['A', 'B', 'C', 'AB', 'AC', 'BC', 'ABC'])
    expect(doeTerms(2, 1).map((t) => t.key)).toEqual(['A', 'B'])
    expect(factorLetter(25)).toBe('F26')
  })

  it('有重複：效果、係數、組內變異的 t 值與顯著性', () => {
    const a = analyzeDoe(RUNS, 2)
    expect(a.method).toBe('replicates')
    expect(a.df).toBe(4) // 8 次 − 4 個組合
    expect(a.tCrit).toBeCloseTo(2.776, 3)
    const by = Object.fromEntries(a.effects.map((e) => [e.term.key, e]))
    expect(by.A.effect).toBeCloseTo(4, 10)
    expect(by.B.effect).toBeCloseTo(2, 10)
    expect(by.AB.effect).toBeCloseTo(1, 10)
    expect(by.AB.coef).toBeCloseTo(0.5, 10)
    // 組內：每組 ±0.1 → s² = 4 × 0.02 / 4 = 0.02；SE = 2s/√8
    expect(a.se).toBeCloseTo((2 * Math.sqrt(0.02)) / Math.sqrt(8), 10)
    expect(by.A.t).toBeCloseTo(4 / a.se, 8)
    expect(a.effects.every((e) => e.significant)).toBe(true)
    expect(a.mean).toBeCloseTo(10, 10)
    expect(a.n).toBe(8)
  })

  it('沒有重複：Lenth 法（PSE 與 df = 項目數 / 3）', () => {
    // 2³ 不重複，A = 10 的大效果，其他接近 0
    const runs: DoeRun[] = []
    const noise = [0.3, -0.2, 0.1, -0.4, 0.2, 0.05, -0.1, 0.15]
    let i = 0
    for (const A of [-1, 1]) for (const B of [-1, 1]) for (const C of [-1, 1]) runs.push({ x: [A, B, C], y: 5 * A + noise[i++] })
    const a = analyzeDoe(runs, 3, 3)
    expect(a.method).toBe('lenth')
    expect(a.df).toBeCloseTo(7 / 3, 10)
    expect(a.tCrit).toBeCloseTo(tCrit975(7 / 3), 10)
    const abs = a.effects.map((e) => Math.abs(e.effect)).sort((p, q) => p - q)
    const s0 = 1.5 * abs[3]
    const trimmed = abs.filter((v) => v < 2.5 * s0)
    const med = trimmed.length % 2 ? trimmed[(trimmed.length - 1) / 2] : (trimmed[trimmed.length / 2 - 1] + trimmed[trimmed.length / 2]) / 2
    expect(a.se).toBeCloseTo(1.5 * med, 10)
    expect(a.effects.filter((e) => e.significant).map((e) => e.term.key)).toEqual(['A'])
  })

  it('無法估計誤差：太少次或效果全 0', () => {
    expect(analyzeDoe([{ x: [-1], y: 1 }, { x: [1], y: 2 }], 1).method).toBe('none')
    const flat = analyzeDoe([{ x: [-1, -1], y: 1 }, { x: [1, -1], y: 1 }, { x: [-1, 1], y: 1 }, { x: [1, 1], y: 1 }], 2)
    expect(flat.method).toBe('none')
    expect(flat.effects.every((e) => !e.significant && Number.isNaN(e.t))).toBe(true)
    // 某一項只有一邊（不平衡）：略過該項
    expect(analyzeDoe([{ x: [1, 1], y: 1 }, { x: [1, -1], y: 2 }], 2).effects.map((e) => e.term.key)).toEqual(['B', 'AB'])
  })

  it('t 臨界值內插、主效果與交互作用平均', () => {
    expect(tCrit975(2)).toBeCloseTo(4.303, 3)
    expect(tCrit975(2.5)).toBeCloseTo((4.303 + 3.182) / 2, 3)
    expect(tCrit975(0.5)).toBeNaN()
    const m = mainEffectMeans(RUNS, 2)
    expect(m[0].low).toBeCloseTo(8, 10)
    expect(m[0].high).toBeCloseTo(12, 10)
    const im = interactionMeans(RUNS, 0, 1)
    expect(im[0][0]).toBeCloseTo(10 - 2 - 1 + 0.5, 10) // A−B−
    expect(im[1][1]).toBeCloseTo(10 + 2 + 1 + 0.5, 10) // A+B+
  })
})
