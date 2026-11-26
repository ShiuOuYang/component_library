import { describe, expect, it } from 'vitest'
import { analyzeGage, fPValue, gageVerdict, outsideFraction, type GageRow } from '@/components/library/charts/utils/gageRR'
import { gageInteraction, gageNoInteraction } from './fixtures/gageData'

const close = (a: number | null | undefined, b: number, digits = 6) => expect(a).toBeCloseTo(b, digits)

describe('gageRR', () => {
  it('fPValue：與 scipy.stats.f.sf 一致、邊界', () => {
    close(fPValue(0.8272089028306779, 18, 60), 0.6621482716623388, 8)
    close(fPValue(3.783067282169798, 2, 18), 0.04250763197836119, 8)
    expect(fPValue(0, 2, 10)).toBe(1)
    expect(fPValue(Infinity, 2, 10)).toBe(0)
    expect(fPValue(2, 0, 10)).toBeNull()
    expect(fPValue(Number.NaN, 2, 10)).toBeNull()
  })

  it('交互作用不顯著：併入誤差後的變異成分（對照 statsmodels）', () => {
    const { result: r, error } = analyzeGage(gageNoInteraction, { tolerance: 0.5 })
    expect(error).toBeNull()
    expect(r!.parts).toHaveLength(10)
    expect(r!.operators).toEqual(['A', 'B', 'C'])
    expect(r!.trials).toBe(3)
    expect(r!.trimmed).toBe(false)
    const [p, o, po, e] = r!.anova
    close(p.ss, 2.402838933333333)
    close(o.ss, 0.018956688888888833)
    close(po.ss, 0.004430199999999971)
    close(e.ss, 0.017851999999999965)
    expect([p.df, o.df, po.df, e.df, r!.anova[4].df]).toEqual([9, 2, 18, 60, 89])
    close(p.f, 1084.7541570734275, 4)
    close(o.f, 38.51072186357289, 6)
    close(po.f, 0.8272089028306779, 8)
    close(r!.interactionP, 0.6621482716623388, 8)
    expect(r!.interactionPooled).toBe(true)
    const red = r!.anovaReduced!
    close(red[0].f, 934.5847397873166, 4)
    close(red[1].f, 33.17943769765403, 6)
    close(red[1].p, 3.74449617305179e-11, 15)
    expect(red[2].df).toBe(78)
    const c = Object.fromEntries(r!.components.map((x) => [x.source, x]))
    expect(c.interaction).toBeUndefined()
    close(c.repeatability.variance, 0.00028566923076922996, 10)
    close(c.operator.variance, 0.0003064225071225062, 10)
    close(c.part.variance, 0.029632937163659383, 10)
    close(c.grr.variance, 0.0005920917378917361, 10)
    close(c.grr.contribution, 1.9589451504588984, 6)
    close(c.grr.pctStudyVar, 13.99623217319182, 6)
    close(c.grr.pctTolerance, 29.19952230027231, 6)
    close(c.total.contribution, 100)
    close(c.grr.studyVar, 6 * Math.sqrt(0.0005920917378917361))
    expect(r!.ndc).toBe(10)
    // 有公差：依 %Tolerance 判定
    expect(r!.basis).toBe('tolerance')
    close(r!.grrPercent, 29.19952230027231, 6)
    expect(r!.verdict).toBe('marginal')
    // 管制界限：R̄ × D4（n = 3：2.574）、x̄ ± A2 R̄（1.023）
    expect(r!.rLimits.ucl / r!.rBar).toBeCloseTo(2.574, 3)
    expect(r!.rLimits.lcl).toBe(0)
    expect((r!.xLimits.ucl - r!.grandMean) / r!.rBar).toBeCloseTo(1.023, 3)
    expect(outsideFraction(r!)).toBeGreaterThan(0.5)
  })

  it('交互作用顯著：保留交互作用項', () => {
    const { result: r } = analyzeGage(gageInteraction, { tolerance: 0.5, basis: 'studyVar', multiplier: 5.15 })
    close(r!.anova[2].p, 9.818987473802092e-6, 12)
    close(r!.anova[0].p, 1.3338460390474141e-14, 20)
    close(r!.anova[1].p, 0.04250763197836119, 8)
    expect(r!.interactionPooled).toBe(false)
    expect(r!.anovaReduced).toBeNull()
    const c = Object.fromEntries(r!.components.map((x) => [x.source, x]))
    close(c.repeatability.variance, 0.0004108222222222222, 10)
    close(c.interaction.variance, 0.0004520473251028824, 10)
    close(c.operator.variance, 0.00016391934156378583, 10)
    close(c.reproducibility.variance, 0.00016391934156378583 + 0.0004520473251028824, 10)
    close(c.part.variance, 0.02590516255144036, 10)
    close(c.grr.pctStudyVar, 19.52570253913956, 6)
    close(c.grr.contribution, 3.81253059646961, 6)
    close(c.grr.studyVar, 5.15 * Math.sqrt(0.0010267888888888905))
    expect(r!.ndc).toBe(7)
    expect(r!.basis).toBe('studyVar')
    expect(r!.verdict).toBe('marginal')
    // 交互作用的 α 調高到 0.00001 → 併入
    expect(analyzeGage(gageInteraction, { interactionAlpha: 0.000001 }).result!.interactionPooled).toBe(true)
  })

  it('判定、沒有公差時用 %StudyVar、basis 指定 tolerance 但沒給公差', () => {
    expect(gageVerdict(9.9)).toBe('acceptable')
    expect(gageVerdict(30)).toBe('marginal')
    expect(gageVerdict(30.1)).toBe('unacceptable')
    const r = analyzeGage(gageNoInteraction).result!
    expect(r.basis).toBe('studyVar')
    expect(r.components[0].pctTolerance).toBeNull()
    expect(analyzeGage(gageNoInteraction, { basis: 'tolerance' }).result!.basis).toBe('studyVar')
    expect(analyzeGage(gageNoInteraction, { basis: 'tolerance', tolerance: 2 }).result!.verdict).toBe('acceptable')
  })

  it('資料問題：空的、零件太少、缺格、次數不足、不平衡時捨去多的', () => {
    expect(analyzeGage([]).error).toBe('empty')
    expect(analyzeGage([{ part: 1, operator: 'A', value: Number.NaN }]).error).toBe('empty')
    expect(analyzeGage([{ part: 1, operator: 'A', value: 1 }, { part: 1, operator: 'A', value: 2 }]).error).toBe('parts')
    const base: GageRow[] = []
    for (const part of [1, 2]) for (const operator of ['A', 'B']) for (const v of [1, 2]) base.push({ part, operator, value: v + part })
    expect(analyzeGage(base.filter((r) => !(r.part === 2 && r.operator === 'B'))).error).toBe('missing')
    expect(analyzeGage(base.filter((r, i) => i % 2 === 0)).error).toBe('trials')
    const extra = analyzeGage([...base, { part: 1, operator: 'A', value: 99 }]).result!
    expect(extra.trimmed).toBe(true)
    expect(extra.trials).toBe(2)
    expect(extra.cells[0].values).toEqual([2, 3])
    expect(extra.parts).toEqual(['1', '2'])
  })

  it('只有一位作業員：沒有再現性，零件對誤差檢定；量測完全一致', () => {
    const one: GageRow[] = []
    for (const part of ['a', 'b', 'c']) for (const v of [0, 0.1]) one.push({ part, operator: 'X', value: { a: 1, b: 2, c: 3 }[part]! + v })
    const r = analyzeGage(one).result!
    expect(r.anova[1].ms).toBeNull()
    expect(r.anova[1].f).toBeNull()
    expect(r.anova[2].f).toBeNull()
    expect(r.anova[0].f).toBeGreaterThan(100)
    expect(r.components.map((c) => c.source)).toEqual(['grr', 'repeatability', 'reproducibility', 'operator', 'part', 'total'])
    expect(r.components[2].variance).toBe(0)
    // 重複量測完全一樣：重複性 0 → ndc 無限大、F 為 Infinity
    const exact: GageRow[] = []
    for (const part of ['a', 'b']) for (const operator of ['A', 'B']) for (let t = 0; t < 2; t++) exact.push({ part, operator, value: part === 'a' ? 1 : 2 })
    const x = analyzeGage(exact).result!
    expect(x.ndc).toBe(Infinity)
    expect(x.anova[0].f).toBe(Infinity) // 零件 MS > 0、交互作用 MS = 0
    expect(x.anova[0].p).toBe(0)
    expect(x.components[0].pctStudyVar).toBe(0)
    // 全部一樣：總變異 0
    const flat = analyzeGage(exact.map((r) => ({ ...r, value: 5 }))).result!
    expect(flat.components[0].contribution).toBe(0)
    expect(flat.anova[0].f).toBeNull() // 0 / 0
    expect(outsideFraction({ ...flat, cells: [] })).toBe(0)
  })
})
