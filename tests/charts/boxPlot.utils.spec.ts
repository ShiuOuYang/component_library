import { describe, expect, it } from 'vitest'
import {
  boxStats,
  groupValues,
  jitter,
  kernelDensity,
  quantileSorted,
  silvermanBandwidth,
} from '@/components/library/charts/utils/boxPlot'

const ONE_TO_EIGHT = [1, 2, 3, 4, 5, 6, 7, 8]

describe('quantileSorted', () => {
  it('inclusive 與 Excel QUARTILE.INC 相同', () => {
    expect(quantileSorted(ONE_TO_EIGHT, 0.25)).toBe(2.75)
    expect(quantileSorted(ONE_TO_EIGHT, 0.5)).toBe(4.5)
    expect(quantileSorted(ONE_TO_EIGHT, 0.75)).toBe(6.25)
  })

  it('exclusive 與 Minitab、Excel QUARTILE.EXC 相同', () => {
    expect(quantileSorted(ONE_TO_EIGHT, 0.25, 'exclusive')).toBe(2.25)
    expect(quantileSorted(ONE_TO_EIGHT, 0.5, 'exclusive')).toBe(4.5)
    expect(quantileSorted(ONE_TO_EIGHT, 0.75, 'exclusive')).toBe(6.75)
  })

  it('邊界：空陣列 NaN、一筆就是它、位置超出時取最小或最大', () => {
    expect(quantileSorted([], 0.5)).toBeNaN()
    expect(quantileSorted([7], 0.25)).toBe(7)
    expect(quantileSorted([1, 2, 3], 0.1, 'exclusive')).toBe(1)
    expect(quantileSorted([1, 2, 3], 0.9, 'exclusive')).toBe(3)
    expect(quantileSorted([1, 2, 3], 0)).toBe(1)
    expect(quantileSorted([1, 2, 3], 1)).toBe(3)
  })
})

describe('boxStats', () => {
  it('四分位數、平均、樣本標準差；1.5 倍 IQR 外是離群值', () => {
    const s = boxStats([1, 2, 3, 4, 5, 6, 7, 8, 30])!
    expect(s.n).toBe(9)
    expect(s.q1).toBe(3)
    expect(s.median).toBe(5)
    expect(s.q3).toBe(7)
    expect(s.iqr).toBe(4)
    expect(s.upperFence).toBe(13)
    expect(s.lowerFence).toBe(-3)
    expect(s.outliers).toEqual([30])
    expect(s.whiskerLow).toBe(1)
    expect(s.whiskerHigh).toBe(8)
    expect(s.mean).toBeCloseTo(66 / 9)
    // 樣本標準差（n − 1）
    const mean = 66 / 9
    const ss = [1, 2, 3, 4, 5, 6, 7, 8, 30].reduce((a, v) => a + (v - mean) ** 2, 0)
    expect(s.sd).toBeCloseTo(Math.sqrt(ss / 8))
    expect(s.min).toBe(1)
    expect(s.max).toBe(30)
  })

  it("whisker='minmax' 沒有離群值；whisker 數字可以調整", () => {
    expect(boxStats([1, 2, 3, 4, 5, 6, 7, 8, 30], { whisker: 'minmax' })!.outliers).toEqual([])
    expect(boxStats([1, 2, 3, 4, 5, 6, 7, 8, 30], { whisker: 'minmax' })!.whiskerHigh).toBe(30)
    expect(boxStats([1, 2, 3, 4, 5, 6, 7, 8, 12], { whisker: 1 })!.outliers).toEqual([12])
  })

  it('一筆資料：標準差 0，鬚等於那一筆；沒有資料時為 null', () => {
    const s = boxStats([5])!
    expect(s).toMatchObject({ n: 1, q1: 5, median: 5, q3: 5, sd: 0, whiskerLow: 5, whiskerHigh: 5, outliers: [] })
    expect(boxStats([])).toBeNull()
  })

  it('大半資料相同（IQR 0）時，鬚不會縮進箱子裡', () => {
    const s = boxStats([0, 5, 5, 5, 5, 5, 5, 5, 9])!
    expect(s.iqr).toBe(0)
    expect(s.outliers).toEqual([0, 9])
    expect(s.whiskerLow).toBe(5)
    expect(s.whiskerHigh).toBe(5)
  })
})

describe('核密度', () => {
  it('Silverman 頻寬：0.9 × min(sd, IQR/1.34) × n^(−1/5)；IQR 為 0 時用標準差', () => {
    const s = boxStats(ONE_TO_EIGHT)!
    expect(silvermanBandwidth(s)).toBeCloseTo(0.9 * Math.min(s.sd, s.iqr / 1.34) * Math.pow(8, -0.2))
    const flat = boxStats([0, 5, 5, 5, 5, 5, 5, 5, 9])!
    expect(silvermanBandwidth(flat)).toBeCloseTo(0.9 * flat.sd * Math.pow(9, -0.2))
  })

  it('範圍只到資料的最小、最大值；密度大致積分為 1（扣掉兩端截掉的部分）', () => {
    const values = Array.from({ length: 200 }, (_, i) => Math.sin(i) * 3 + 10).sort((a, b) => a - b)
    const s = boxStats(values)!
    const pts = kernelDensity(values, silvermanBandwidth(s), 101)
    expect(pts).toHaveLength(101)
    expect(pts[0].value).toBe(s.min)
    expect(pts[100].value).toBe(s.max)
    const dx = (s.max - s.min) / 100
    const area = pts.reduce((a, p) => a + p.density * dx, 0)
    expect(area).toBeGreaterThan(0.75)
    expect(area).toBeLessThan(1.01)
  })

  it('雙峰資料的密度中間比兩邊低', () => {
    const values = [...Array.from({ length: 50 }, (_, i) => 10 + (i % 5) * 0.1), ...Array.from({ length: 50 }, (_, i) => 20 + (i % 5) * 0.1)]
    values.sort((a, b) => a - b)
    const pts = kernelDensity(values, 1, 51)
    const mid = pts[25].density
    expect(mid).toBeLessThan(pts[0].density)
    expect(mid).toBeLessThan(pts[50].density)
  })

  it('頻寬 0（全部相同）或沒有資料時回傳空陣列；點數至少 2', () => {
    expect(kernelDensity([3, 3, 3], 0)).toEqual([])
    expect(kernelDensity([], 1)).toEqual([])
    expect(kernelDensity([1, 2], 1, 1)).toHaveLength(2)
  })
})

describe('groupValues', () => {
  it('依組別分組、排序；groups 決定順序與名稱；不是數字或沒有組別的略過', () => {
    const { groups, skipped } = groupValues(
      [
        { g: 'B', v: 3 },
        { g: 'A', v: '2' },
        { g: 'A', v: 1 },
        { g: 'B', v: 'x' },
        { g: '', v: 1 },
        { g: 'C', v: '' },
        { g: 'B', v: null },
      ],
      { groupField: 'g', valueField: 'v', groups: [{ value: 'A', label: 'A 線' }, { value: 'Z' }] }
    )
    expect(groups.map((g) => [g.key, g.label, g.values])).toEqual([
      ['A', 'A 線', [1, 2]],
      ['Z', 'Z', []],
      ['B', 'B', [3]],
    ])
    expect(groups[0].rows[0]).toEqual({ g: 'A', v: 1 })
    expect(skipped).toBe(4)
  })
})

describe('jitter', () => {
  it('固定在 −0.5～0.5 之間，同一個索引每次都一樣', () => {
    for (let i = 0; i < 100; i++) {
      expect(jitter(i)).toBeGreaterThanOrEqual(-0.5)
      expect(jitter(i)).toBeLessThan(0.5)
    }
    expect(jitter(7)).toBe(jitter(7))
  })
})
