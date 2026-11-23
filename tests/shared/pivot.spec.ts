import { describe, expect, it } from 'vitest'
import { compareGroup, computePivot, groupKey, joinKey, moveField, reorder, visibleRows, type PivotRecord } from '@/components/library/shared/pivot'

const data: PivotRecord[] = [
  { plant: 'A', line: 'L1', month: '08', qty: 5, code: 'x' },
  { plant: 'A', line: 'L1', month: '09', qty: 3, code: 'y' },
  { plant: 'A', line: 'L2', month: '08', qty: 2, code: 'x' },
  { plant: 'B', line: 'L5', month: '09', qty: 10, code: 'x' },
  { plant: 'B', line: 'L5', month: '09', qty: 'n/a', code: 'z' },
  { plant: '', line: 'L9', month: '08', qty: '4', code: 'x' },
]

describe('pivot', () => {
  it('groupKey / joinKey：null 與空白；[] 與 [""] 不同', () => {
    expect(groupKey(null)).toBe('')
    expect(groupKey(undefined)).toBe('')
    expect(groupKey(3)).toBe('3')
    expect(groupKey(new Date(Date.UTC(2026, 0, 1)))).toBe('2026-01-01T00:00:00.000Z')
    expect(joinKey([])).not.toBe(joinKey(['']))
  })

  it('compareGroup：自訂順序、數字、字串（數字感知）、空白最後', () => {
    expect(['b', 'a', 'c'].sort((a, b) => compareGroup(a, b, ['c', 'a']))).toEqual(['c', 'a', 'b'])
    expect(['10', '9', '2'].sort((a, b) => compareGroup(a, b))).toEqual(['2', '9', '10'])
    expect(['L10', 'L2'].sort((a, b) => compareGroup(a, b))).toEqual(['L2', 'L10'])
    expect(['', 'a', ''].sort((a, b) => compareGroup(a, b))).toEqual(['a', '', ''])
  })

  it('computePivot：兩層列、欄、小計、總計欄與總計列', () => {
    const r = computePivot(data, { rows: ['plant', 'line'], cols: ['month'], values: [{ field: 'qty', agg: 'sum' }] })
    expect(r.count).toBe(6)
    expect(r.colKeys).toEqual([['08'], ['09']])
    expect(r.rowTree.map((n) => n.path)).toEqual([['A'], ['B'], ['']])
    expect(r.rowTree[0].children.map((n) => [n.path, n.leaf, n.depth])).toEqual([
      [['A', 'L1'], true, 1],
      [['A', 'L2'], true, 1],
    ])
    expect(r.value(['A', 'L1'], ['08'], 0)).toBe(5)
    expect(r.value(['A'], ['08'], 0)).toBe(7)
    expect(r.value(['A'], null, 0)).toBe(10)
    expect(r.value([], ['09'], 0)).toBe(13)
    expect(r.value([], null, 0)).toBe(24) // '4' 字串也算、'n/a' 不算
    expect(r.value([''], null, 0)).toBe(4) // 空白分組與總計分得開
    expect(r.value(['A', 'L2'], ['09'], 0)).toBeNull()
    expect(r.value([], null, 5)).toBeNull()
  })

  it('彙總：avg、count、min、max、countDistinct；沒有數值時為 null', () => {
    const values = (['sum', 'avg', 'count', 'min', 'max', 'countDistinct'] as const).map((agg) => ({ field: 'qty', agg }))
    const r = computePivot(data, { rows: ['plant'], cols: [], values })
    const at = (p: string) => values.map((_, i) => r.value([p], null, i))
    expect(at('A')).toEqual([10, 10 / 3, 3, 2, 5, 3])
    expect(at('B')).toEqual([10, 10, 2, 10, 10, 2])
    const codes = computePivot(data, { rows: [], cols: [], values: [{ field: 'code', agg: 'sum' }, { field: 'code', agg: 'countDistinct' }] })
    expect(codes.value([], null, 0)).toBeNull()
    expect(codes.value([], null, 1)).toBe(3)
    expect(codes.colKeys).toEqual([])
    expect(codes.rowTree).toEqual([])
  })

  it('自訂順序；多層欄依每一層排序', () => {
    const r = computePivot(data, { rows: ['plant'], cols: ['month', 'code'], values: [{ field: 'qty', agg: 'count' }] }, [
      { key: 'plant', label: '', order: ['B', 'A'] },
      { key: 'code', label: '', order: ['z', 'y', 'x'] },
    ])
    expect(r.rowTree.map((n) => n.path[0])).toEqual(['B', 'A', ''])
    expect(r.colKeys).toEqual([
      ['08', 'x'],
      ['09', 'z'],
      ['09', 'y'],
      ['09', 'x'],
    ])
  })

  it('visibleRows：收起的列不展開子列', () => {
    const r = computePivot(data, { rows: ['plant', 'line'], cols: [], values: [{ field: 'qty', agg: 'sum' }] })
    expect(visibleRows(r.rowTree, new Set()).map((n) => n.path.join('/'))).toEqual(['A', 'A/L1', 'A/L2', 'B', 'B/L5', '', '/L9'])
    expect(visibleRows(r.rowTree, new Set([r.rowTree[0].key])).map((n) => n.path.join('/'))).toEqual(['A', 'B', 'B/L5', '', '/L9'])
  })

  it('moveField / reorder', () => {
    const c = { rows: ['a'], cols: ['b'], values: [{ field: 'q', agg: 'sum' as const }] }
    expect(moveField(c, 'b', 'rows')).toEqual({ rows: ['a', 'b'], cols: [], values: c.values })
    expect(moveField(c, 'a', 'cols', 0)).toEqual({ rows: [], cols: ['a', 'b'], values: c.values })
    expect(moveField(c, 'a', 'none')).toEqual({ rows: [], cols: ['b'], values: c.values })
    expect(moveField(c, 'q', 'values', 0, 'avg').values).toEqual([{ field: 'q', agg: 'avg' }, { field: 'q', agg: 'sum' }])
    expect(moveField(c, 'x', 'values').values).toHaveLength(2)
    expect(reorder([1, 2, 3], 0, 1)).toEqual([2, 1, 3])
    expect(reorder([1, 2, 3], 2, -2)).toEqual([3, 1, 2])
    const same = [1, 2]
    expect(reorder(same, 0, -1)).toBe(same)
    expect(reorder(same, 1, 1)).toBe(same)
  })
})
