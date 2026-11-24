import { describe, expect, it } from 'vitest'
import { AQL_LEVELS, aqlVerdict, codeLetter, normalPlan, sampleSizeOf, switchingAdvice } from '@/components/library/shared/aql'

describe('aql（Z1.4 正常檢驗）', () => {
  it('表 I：批量 × 檢驗水準 → 樣本代字', () => {
    expect(codeLetter(1000, 'II')).toBe('J')
    expect(codeLetter(500, 'II')).toBe('H')
    expect(codeLetter(501, 'II')).toBe('J')
    expect(codeLetter(8, 'II')).toBe('A')
    expect(codeLetter(9, 'II')).toBe('B')
    expect(codeLetter(3200, 'I')).toBe('H')
    expect(codeLetter(3200, 'III')).toBe('L')
    expect(codeLetter(10_000, 'S-4')).toBe('G')
    expect(codeLetter(600_000, 'S-1')).toBe('D')
    expect(codeLetter(600_000, 'III')).toBe('R')
    expect(codeLetter(1, 'II')).toBeNull()
    expect(codeLetter(Number.NaN, 'II')).toBeNull()
    expect(AQL_LEVELS).toHaveLength(7)
    expect(sampleSizeOf('J')).toBe(80)
    expect(sampleSizeOf('R')).toBe(2000)
  })

  it('表 II-A：常見方案', () => {
    const plan = (lot: number, aql: number) => {
      const p = normalPlan(lot, 'II', aql)!
      return [p.planLetter, p.sampleSize, p.ac, p.re, p.arrow]
    }
    // 批量 1000 → J（80）
    expect(plan(1000, 1)).toEqual(['J', 80, 2, 3, null])
    expect(plan(1000, 2.5)).toEqual(['J', 80, 5, 6, null])
    expect(plan(1000, 4)).toEqual(['J', 80, 7, 8, null])
    expect(plan(1000, 0.65)).toEqual(['J', 80, 1, 2, null])
    expect(plan(1000, 6.5)).toEqual(['J', 80, 10, 11, null])
    expect(plan(1000, 10)).toEqual(['J', 80, 14, 15, null])
    // 箭頭：往下到 K（125）、往上到 H（50）
    expect(plan(1000, 0.4)).toEqual(['K', 125, 1, 2, 'down'])
    expect(plan(1000, 0.25)).toEqual(['H', 50, 0, 1, 'up'])
    expect(plan(1000, 0.065)).toEqual(['L', 200, 0, 1, 'down'])
    // 批量 500 → H（50）
    expect(plan(500, 1.5)).toEqual(['H', 50, 2, 3, null])
    // 批量 3200 → K（125）
    expect(plan(3200, 0.65)).toEqual(['K', 125, 2, 3, null])
    expect(plan(3200, 10)).toEqual(['K', 125, 21, 22, null])
    expect(plan(3200, 15)).toEqual(['J', 80, 21, 22, 'up'])
  })

  it('A–E 才有 30/31、44/45；A 列的 ↑ 改為 ↓；超出表格往反方向', () => {
    const p = (lot: number, level: 'S-1' | 'II' | 'III', aql: number) => {
      const r = normalPlan(lot, level, aql)!
      return [r.planLetter, r.ac, r.re]
    }
    expect(p(5, 'II', 1000)).toEqual(['A', 30, 31])
    expect(p(10, 'II', 1000)).toEqual(['B', 44, 45])
    expect(p(30, 'II', 1000)).toEqual(['B', 44, 45])
    // F 列 d=25：往上
    expect(p(100, 'II', 100)).toEqual(['E', 21, 22])
    expect(p(100, 'II', 150)).toEqual(['E', 30, 31])
    // A 列 AQL 10（d = 15）：往下到 C 的 1/2
    expect(p(5, 'II', 10)).toEqual(['C', 1, 2])
    // R 列（III、大批量）AQL 0.015：往下超出 → 往上找
    const r = normalPlan(600_000, 'III', 0.015)!
    expect([r.planLetter, r.ac]).toEqual(['P', 0])
    expect(normalPlan(600_000, 'III', 0.01)!.planLetter).toBe('Q')
  })

  it('全數檢驗、不合法的 AQL 與批量', () => {
    const full = normalPlan(60, 'II', 0.065)!
    expect(full).toMatchObject({ letter: 'E', planLetter: 'L', sampleSize: 60, fullInspection: true, ac: 0, re: 1 })
    expect(normalPlan(1000, 'II', 0.3)).toBeNull()
    expect(normalPlan(1, 'II', 1)).toBeNull()
  })

  it('aqlVerdict：達 Re 立刻拒收；檢完且 ≤ Ac 允收', () => {
    const plan = { sampleSize: 80, ac: 2, re: 3 }
    expect(aqlVerdict(plan, 10, 3)).toBe('reject')
    expect(aqlVerdict(plan, 50, 2)).toBe('pending')
    expect(aqlVerdict(plan, 80, 2)).toBe('accept')
    expect(aqlVerdict(plan, 90, 0)).toBe('accept')
  })

  it('switchingAdvice：轉換規則', () => {
    expect(switchingAdvice([true, false, true, true, false], 'normal')).toBe('toTightened')
    expect(switchingAdvice([false, true, true, true, true, false], 'normal')).toBeNull()
    expect(switchingAdvice(Array(10).fill(true), 'normal')).toBe('toReduced')
    expect(switchingAdvice(Array(9).fill(true), 'normal')).toBeNull()
    expect(switchingAdvice([false, true, true, true, true, true], 'tightened')).toBe('toNormal')
    expect(switchingAdvice([false, true, false, true, false, false, false], 'tightened')).toBe('discontinue')
    expect(switchingAdvice([true, true, true], 'tightened')).toBeNull()
    expect(switchingAdvice([true, false], 'reduced')).toBe('toNormal')
    expect(switchingAdvice([true], 'reduced')).toBeNull()
    expect(switchingAdvice([], 'reduced')).toBeNull()
  })
})
