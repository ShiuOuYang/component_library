import { describe, expect, it } from 'vitest'
import { buildUpset, filterCombos, sortCombos, upsetCombos } from '@/components/library/charts/utils/upset'

const items = [
  { id: '1', sets: ['A', 'B'] },
  { id: '2', sets: ['A', 'B'] },
  { id: '3', sets: ['A'] },
  { id: '4', sets: ['B', 'C'] },
  { id: '5', sets: ['A', 'B', 'C'] },
  { id: '6', sets: [] },
]

describe('upset', () => {
  it('buildUpset：兩種輸入合併、集合大小、依大小或照輸入排序', () => {
    const d = buildUpset({ items })
    expect(d.total).toBe(6)
    expect(d.sets.map((s) => `${s.name}${s.size}`)).toEqual(['A4', 'B4', 'C2'])
    const mixed = buildUpset({ items: [{ id: 'x', sets: ['C'] }], sets: [{ name: 'Z', items: ['x', 'y'] }, { name: 'C', items: ['y'] }] }, 'input')
    expect(mixed.sets.map((s) => `${s.name}${s.size}`)).toEqual(['C2', 'Z2'])
    expect([...mixed.membership.get('y')!]).toEqual(['Z', 'C'])
    // setNames 固定順序，沒資料的集合大小 0
    expect(buildUpset({ items: [], setNames: ['Q'] }, 'input').sets).toEqual([{ name: 'Q', size: 0, index: 0 }])
    // 同一個集合重複列：只算一次
    expect(buildUpset({ items: [{ id: 'a', sets: ['A', 'A'] }] }).sets[0].size).toBe(1)
  })

  it('upsetCombos：exclusive 加總等於總數；inclusive 算「至少」', () => {
    const d = buildUpset({ items })
    const ex = upsetCombos(d)
    const byKey = (cs: typeof ex) => Object.fromEntries(cs.map((c) => [c.sets.join('+') || '-', c.count]))
    expect(byKey(ex)).toEqual({ 'A+B': 2, A: 1, 'B+C': 1, 'A+B+C': 1, '-': 1 })
    expect(ex.reduce((n, c) => n + c.count, 0)).toBe(6)
    expect(ex.find((c) => c.sets.join() === 'A,B')!.items).toEqual(['1', '2'])
    const inc = upsetCombos(d, 'inclusive')
    expect(byKey(inc)).toEqual({ 'A+B': 3, A: 4, 'B+C': 2, 'A+B+C': 1, '-': 1 })
    // 集合在組合中依集合順序排列（大小）
    expect(upsetCombos(buildUpset({ items: [{ id: 'z', sets: ['C', 'A'] }, { id: 'y', sets: ['A'] }] })).find((c) => c.degree === 2)!.sets).toEqual(['A', 'C'])
  })

  it('sortCombos：數量、組合大小、集合順序', () => {
    const d = buildUpset({ items })
    const ex = upsetCombos(d)
    const names = (cs: typeof ex) => cs.map((c) => c.sets.join('') || '-')
    expect(names(sortCombos(ex, 'count', d.sets))).toEqual(['AB', '-', 'A', 'BC', 'ABC'])
    expect(names(sortCombos(ex, 'degree', d.sets))).toEqual(['-', 'A', 'AB', 'BC', 'ABC'])
    expect(names(sortCombos(ex, 'sets', d.sets))).toEqual(['-', 'A', 'AB', 'ABC', 'BC'])
  })

  it('filterCombos：空組合、數量、組合大小、上限、略過數', () => {
    const d = buildUpset({ items })
    const ex = sortCombos(upsetCombos(d), 'count', d.sets)
    expect(filterCombos(ex).combos.map((c) => c.sets.join(''))).toEqual(['AB', 'A', 'BC', 'ABC'])
    expect(filterCombos(ex, { includeEmpty: true }).combos).toHaveLength(5)
    expect(filterCombos(ex, { minCount: 2 }).combos.map((c) => c.sets.join(''))).toEqual(['AB'])
    expect(filterCombos(ex, { minDegree: 2, maxDegree: 2 }).combos.map((c) => c.sets.join(''))).toEqual(['AB', 'BC'])
    expect(filterCombos(ex, { limit: 2 })).toMatchObject({ hidden: 3 })
  })
})
