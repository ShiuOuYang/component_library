import { describe, expect, it } from 'vitest'
import { buildMekko, mekkoChiSquare, mekkoLayout } from '@/components/library/charts/utils/marimekko'

const rows = [
  { x: 'L1', y: 'A', value: 30 },
  { x: 'L1', y: 'B', value: 10 },
  { x: 'L2', y: 'A', value: 10 },
  { x: 'L2', y: 'B', value: 30 },
  { x: 'L2', y: 'B', value: 20 }, // 同一格加總
  { x: 'L3', y: 'C', value: 0 }, // 0 略過
  { x: 'L3', y: 'A', value: -5 }, // 負值略過
  { x: 'L3', y: 'A', value: Number.NaN },
]

describe('marimekko', () => {
  it('欄寬比例、欄內比例、期望值與殘差', () => {
    const d = buildMekko(rows)
    expect(d.total).toBe(100)
    expect(d.columns.map((c) => [c.key, c.total, c.share])).toEqual([['L1', 40, 0.4], ['L2', 60, 0.6]])
    expect(d.segments).toEqual(['A', 'B'])
    const [a, b] = d.columns[0].cells
    expect(a).toMatchObject({ x: 'L1', y: 'A', value: 30, share: 0.75, shareTotal: 0.3, expected: 16 })
    expect(a.residual).toBeCloseTo((30 - 16) / 4)
    expect(b.expected).toBe(24)
    expect(d.columns[1].cells[1].value).toBe(50)
    expect(d.segmentTotals.get('B')).toBe(60)
    expect(d.folded).toEqual([])
  })

  it('排序：欄依總量、段依總量；缺格補 0', () => {
    const d = buildMekko(rows, { sortColumns: 'total', sortSegments: 'total' })
    expect(d.columns.map((c) => c.key)).toEqual(['L2', 'L1'])
    expect(d.segments).toEqual(['B', 'A'])
    const sparse = buildMekko([{ x: 1, y: 'p', value: 5 }, { x: 2, y: 'q', value: 5 }])
    expect(sparse.columns[0].cells.map((c) => c.value)).toEqual([5, 0])
    expect(sparse.columns[0].key).toBe('1')
  })

  it('maxSegments：依總量保留前幾名，其餘併成「其他」並固定在最後', () => {
    const many = ['a', 'b', 'c', 'd', 'e'].flatMap((y, i) => [{ x: 'X', y, value: 10 - i }, { x: 'Y', y, value: 1 + i }])
    const d = buildMekko(many, { maxSegments: 3, otherLabel: '其他' })
    // 總量：a 12、b 12、c 12、d 12、e 12 → 一樣多時依出現順序保留 a、b
    expect(d.segments).toEqual(['a', 'b', '其他'])
    expect(d.folded).toEqual(['c', 'd', 'e'])
    expect(d.columns[0].cells[2].value).toBe(8 + 7 + 6)
    const sorted = buildMekko([...many, { x: 'X', y: 'e', value: 100 }], { maxSegments: 3, sortSegments: 'total' })
    expect(sorted.segments).toEqual(['e', 'a', 'Other'])
    // maxSegments < 2 或沒超過時不併
    expect(buildMekko(many, { maxSegments: 1 }).folded).toEqual([])
    expect(buildMekko(many, { maxSegments: 9 }).segments).toHaveLength(5)
  })

  it('mekkoLayout：欄寬依比例並扣掉間隔、格高依欄內比例', () => {
    const d = buildMekko(rows)
    const L = mekkoLayout(d, 102, 200, 2)
    expect(L.columns).toEqual([{ x: 0, w: 40 }, { x: 42, w: 60 }])
    expect(L.rects).toHaveLength(4)
    expect(L.rects[0]).toMatchObject({ col: 0, seg: 0, x: 0, y: 0, w: 40, h: 150 })
    expect(L.rects[1]).toMatchObject({ y: 150, h: 50 })
    expect(L.rects[3]).toMatchObject({ col: 1, seg: 1, x: 42, h: (50 / 60) * 200 })
    expect(mekkoLayout(buildMekko([]), 100, 100).rects).toEqual([])
  })

  it('卡方與空資料', () => {
    const d = buildMekko(rows)
    const { chi2, df } = mekkoChiSquare(d)
    const expected = d.columns.flatMap((c) => c.cells).reduce((s, c) => s + (c.value - c.expected) ** 2 / c.expected, 0)
    expect(chi2).toBeCloseTo(expected)
    expect(df).toBe(1)
    const e = buildMekko([])
    expect(e).toMatchObject({ total: 0, columns: [], segments: [] })
    expect(mekkoChiSquare(e)).toEqual({ chi2: 0, df: 0 })
    // 只有一格：觀察 = 期望，殘差 0
    const z = buildMekko([{ x: 'a', y: 'p', value: 1 }])
    expect(z.columns[0].cells[0].residual).toBe(0)
    // 空的列（null）會略過
    expect(buildMekko([null as unknown as { x: string; y: string; value: number }, { x: 'a', y: 'p', value: 2 }]).total).toBe(2)
  })
})
