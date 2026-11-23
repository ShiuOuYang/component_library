import { describe, expect, it } from 'vitest'
import { axisDomains, axisRatio, indexAtX, moveAxis, passesBrushes, toNum } from '@/components/library/charts/utils/parallel'

describe('parallel utils', () => {
  it('axisDomains：依資料取整、給定範圍優先、單一值與沒有資料', () => {
    const rows = [{ a: 3, b: 5, c: 'x' }, { a: 97, b: 5 }, { a: '42', b: null }]
    const d = axisDomains(rows, [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B' },
      { key: 'c', label: 'C' },
      { key: 'd', label: 'D', domain: [0, 10] },
    ])
    expect(d.a).toEqual([0, 100])
    expect(d.b[0]).toBeLessThan(5)
    expect(d.b[1]).toBeGreaterThan(5)
    expect(d.c).toEqual([0, 1])
    expect(d.d).toEqual([0, 10])
    expect(axisDomains([{ z: 0 }], [{ key: 'z', label: 'Z' }]).z).toEqual([-1, 1])
  })

  it('axisRatio：0 = 底、1 = 頂；reverse；字串數字；非數值為 null', () => {
    expect(axisRatio(25, [0, 100])).toBe(0.25)
    expect(axisRatio(25, [0, 100], true)).toBe(0.75)
    expect(axisRatio('50', [0, 100])).toBe(0.5)
    expect(axisRatio(5, [5, 5])).toBe(0.5)
    expect(axisRatio('', [0, 1])).toBeNull()
    expect(axisRatio(null, [0, 1])).toBeNull()
    expect(axisRatio('abc', [0, 1])).toBeNull()
  })

  it('passesBrushes：所有條件都要符合；範圍順序不拘；沒有值的不符合', () => {
    const row = { a: 5, b: 10, c: null, d: '' }
    expect(passesBrushes(row, {})).toBe(true)
    expect(passesBrushes(row, { a: [0, 10] })).toBe(true)
    expect(passesBrushes(row, { a: [10, 0], b: [9, 11] })).toBe(true)
    expect(passesBrushes(row, { a: [6, 10] })).toBe(false)
    expect(passesBrushes(row, { c: [0, 1] })).toBe(false)
    expect(passesBrushes(row, { d: [0, 1] })).toBe(false)
    expect(passesBrushes(row, { x: [0, 1] })).toBe(false)
  })

  it('toNum：null、空字串不是 0', () => {
    expect(toNum(null)).toBeNull()
    expect(toNum('')).toBeNull()
    expect(toNum(' ')).toBeNull()
    expect(toNum(undefined)).toBeNull()
    expect(toNum('3.5')).toBe(3.5)
    expect(toNum(0)).toBe(0)
    expect(toNum(Number.NaN)).toBeNull()
  })

  it('moveAxis / indexAtX', () => {
    expect(moveAxis(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveAxis(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(moveAxis(['a', 'b', 'c'], 1, 9)).toEqual(['a', 'c', 'b'])
    const same = ['a', 'b']
    expect(moveAxis(same, 1, 1)).toBe(same)
    expect(moveAxis(same, 5, 0)).toBe(same)
    expect(indexAtX(-5, [0, 100, 200])).toBe(0)
    expect(indexAtX(150, [0, 100, 200])).toBe(2)
    expect(indexAtX(500, [0, 100, 200])).toBe(3)
  })
})
