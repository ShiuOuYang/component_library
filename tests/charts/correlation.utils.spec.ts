import { describe, expect, it } from 'vitest'
import { clusterOrder, correlationMatrix, correlationPValue, incompleteBeta, pearson, ranks, toNum } from '@/components/library/charts/utils/correlation'

describe('correlation utils', () => {
  it('toNum', () => {
    expect(toNum(null)).toBeNull()
    expect(toNum('')).toBeNull()
    expect(toNum('2.5')).toBe(2.5)
    expect(toNum(Infinity)).toBeNull()
  })

  it('ranks：同分取平均排名', () => {
    expect(ranks([10, 20, 20, 30])).toEqual([1, 2.5, 2.5, 4])
    expect(ranks([3, 1, 2])).toEqual([3, 1, 2])
    expect(ranks([])).toEqual([])
  })

  it('pearson：完全正 / 負相關、已知資料、沒有變異或太少時為 null', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1)
    expect(pearson([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1)
    // x: 1..5, y: 2,4,5,4,5 → r = √0.6
    expect(pearson([1, 2, 3, 4, 5], [2, 4, 5, 4, 5])).toBeCloseTo(Math.sqrt(0.6))
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull()
    expect(pearson([1], [1])).toBeNull()
  })

  it('incompleteBeta：邊界與已知值', () => {
    expect(incompleteBeta(0, 2, 3)).toBe(0)
    expect(incompleteBeta(1, 2, 3)).toBe(1)
    expect(incompleteBeta(0.5, 1, 1)).toBeCloseTo(0.5)
    expect(incompleteBeta(0.5, 2, 2)).toBeCloseTo(0.5)
    // I_0.3(2, 5) = 0.579825
    expect(incompleteBeta(0.3, 2, 5)).toBeCloseTo(0.579825, 5)
    expect(incompleteBeta(0.9, 2, 5)).toBeCloseTo(0.999945, 5)
  })

  it('correlationPValue：與 t 分配表一致', () => {
    // r = 0.5, n = 20 → t = 2.449, df = 18 → p ≈ 0.0248
    expect(correlationPValue(0.5, 20)!).toBeCloseTo(0.0248, 3)
    // r = 0.3, n = 50 → t = 2.182, df = 48 → p ≈ 0.0340
    expect(correlationPValue(-0.3, 50)!).toBeCloseTo(0.034, 3)
    expect(correlationPValue(0, 30)).toBeCloseTo(1)
    expect(correlationPValue(1, 10)).toBe(0)
    expect(correlationPValue(0.9, 2)).toBeNull()
  })

  it('correlationMatrix：成對完整、對角線、Spearman 對單調非線性關係為 1', () => {
    const rows = [
      { a: 1, b: 1, c: 5, d: null },
      { a: 2, b: 8, c: 4, d: 1 },
      { a: 3, b: 27, c: 3, d: 'x' },
      { a: 4, b: 64, c: 2, d: 2 },
      { a: 5, b: 125, c: 1, d: 3 },
    ]
    const m = correlationMatrix(rows, ['a', 'b', 'c', 'd'], 'spearman')
    expect(m[0][0]).toEqual({ r: 1, n: 5, p: 0 })
    expect(m[0][1].r).toBeCloseTo(1)
    expect(m[0][2].r).toBeCloseTo(-1)
    expect(m[0][3].n).toBe(3)
    const pm = correlationMatrix(rows, ['a', 'b'], 'pearson')
    expect(pm[0][1].r).toBeLessThan(1)
    expect(pm[0][1].r).toBeGreaterThan(0.9)
    expect(pm[0][1].p).toBeLessThan(0.05)
    // 沒有資料的欄位
    const empty = correlationMatrix([{ a: 1 }], ['a', 'z'])
    expect(empty[1][1]).toEqual({ r: null, n: 0, p: null })
    expect(empty[0][1].r).toBeNull()
  })

  it('clusterOrder：相關的排在一起', () => {
    const rows = Array.from({ length: 30 }, (_, i) => {
      const u = Math.sin(i * 1.7)
      const v = Math.cos(i * 2.3)
      return { a: u, x: v, b: u * 2 + 0.01 * i, y: v * 3, c: -u }
    })
    const keys = ['a', 'x', 'b', 'y', 'c']
    const order = clusterOrder(correlationMatrix(rows, keys)).map((i) => keys[i])
    const pos = (k: string) => order.indexOf(k)
    expect(Math.abs(pos('x') - pos('y'))).toBe(1)
    expect(Math.max(pos('a'), pos('b'), pos('c')) - Math.min(pos('a'), pos('b'), pos('c'))).toBe(2)
    expect(clusterOrder([])).toEqual([])
  })
})
