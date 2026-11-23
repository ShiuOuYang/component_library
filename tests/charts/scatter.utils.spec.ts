import { describe, expect, it } from 'vitest'
import { bandHalfWidth, bandPoints, formatEquation, indicesInRect, linearRegression, predict, tQuantile975 } from '@/components/library/charts/utils/scatter'

describe('scatter utils', () => {
  it('linearRegression：完全線性時 R² = 1、殘差 0', () => {
    const reg = linearRegression([1, 2, 3, 4].map((x) => ({ x, y: 2 * x + 1 })))!
    expect(reg.slope).toBeCloseTo(2)
    expect(reg.intercept).toBeCloseTo(1)
    expect(reg.r2).toBeCloseTo(1)
    expect(reg.r).toBeCloseTo(1)
    expect(reg.se).toBeCloseTo(0)
    expect(reg).toMatchObject({ n: 4, meanX: 2.5, sxx: 5, xMin: 1, xMax: 4 })
  })

  it('linearRegression：已知資料（與統計軟體一致）', () => {
    // x: 1..5, y: 2, 4, 5, 4, 5 → slope 0.6, intercept 2.2, R² 0.6
    const reg = linearRegression([2, 4, 5, 4, 5].map((y, i) => ({ x: i + 1, y })))!
    expect(reg.slope).toBeCloseTo(0.6)
    expect(reg.intercept).toBeCloseTo(2.2)
    expect(reg.r2).toBeCloseTo(0.6)
    expect(reg.r).toBeCloseTo(Math.sqrt(0.6))
    // SSE = 2.4 → se = √(2.4 / 3)
    expect(reg.se).toBeCloseTo(Math.sqrt(0.8))
    expect(predict(reg, 6)).toBeCloseTo(5.8)
  })

  it('linearRegression：略過非有限值；少於 2 點或 x 都相同時為 null；y 都相同時 R² = 1', () => {
    expect(linearRegression([{ x: 1, y: 1 }, { x: Number.NaN, y: 2 }])).toBeNull()
    expect(linearRegression([{ x: 1, y: 1 }, { x: 1, y: 3 }])).toBeNull()
    expect(linearRegression([])).toBeNull()
    const flat = linearRegression([{ x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: Infinity }])!
    expect(flat).toMatchObject({ slope: 0, intercept: 5, r2: 1, r: 0, n: 3 })
    // 兩點：沒有自由度，se = 0
    expect(linearRegression([{ x: 0, y: 0 }, { x: 1, y: 2 }])!.se).toBe(0)
    // 負相關
    expect(linearRegression([{ x: 0, y: 3 }, { x: 1, y: 2 }, { x: 2, y: 0 }])!.r).toBeLessThan(0)
  })

  it('tQuantile975：查表與大自由度的近似', () => {
    expect(tQuantile975(1)).toBe(12.706)
    expect(tQuantile975(10)).toBe(2.228)
    expect(tQuantile975(30)).toBe(2.042)
    expect(tQuantile975(40)).toBeCloseTo(2.021, 3)
    expect(tQuantile975(120)).toBeCloseTo(1.98, 2)
    expect(tQuantile975(1e6)).toBeCloseTo(1.96, 2)
    expect(tQuantile975(0)).toBeNaN()
    expect(tQuantile975(Number.NaN)).toBeNaN()
  })

  it('bandHalfWidth / bandPoints：中心最窄、兩端較寬；n ≤ 2 時為 0', () => {
    const reg = linearRegression([2, 4, 5, 4, 5].map((y, i) => ({ x: i + 1, y })))!
    const mid = bandHalfWidth(reg, reg.meanX)
    expect(mid).toBeCloseTo(3.182 * Math.sqrt(0.8) * Math.sqrt(1 / 5), 6)
    expect(bandHalfWidth(reg, 1)).toBeGreaterThan(mid)
    const pts = bandPoints(reg, 1, 5, 4)
    expect(pts).toHaveLength(5)
    expect(pts[2].x).toBe(3)
    expect(pts[2].hi - pts[2].y).toBeCloseTo(mid)
    expect(pts[0].lo).toBeLessThan(pts[0].y)
    const two = linearRegression([{ x: 0, y: 0 }, { x: 1, y: 2 }])!
    expect(bandHalfWidth(two, 0.5)).toBe(0)
    expect(bandPoints(reg, 1, 5)).toHaveLength(41)
  })

  it('indicesInRect：任意兩角、含邊界', () => {
    const px = [0, 5, 10, 15]
    const py = [0, 5, 10, 15]
    expect(indicesInRect(px, py, 4, 4, 10, 10)).toEqual([1, 2])
    expect(indicesInRect(px, py, 10, 10, 4, 4)).toEqual([1, 2])
    expect(indicesInRect(px, py, 20, 20, 30, 30)).toEqual([])
    expect(indicesInRect([1, 2], [1], 0, 0, 5, 5)).toEqual([0])
  })

  it('formatEquation：截距的正負號', () => {
    const f = (n: number) => n.toFixed(2)
    expect(formatEquation({ slope: 1.5, intercept: -2 } as never, f)).toBe('y = 1.50x − 2.00')
    expect(formatEquation({ slope: -0.5, intercept: 3 } as never, f)).toBe('y = -0.50x + 3.00')
  })
})
