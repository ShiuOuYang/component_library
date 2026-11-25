import { describe, expect, it } from 'vitest'
import {
  bandFraction,
  bandSize,
  horizonExtent,
  horizonRows,
  horizonTimes,
  pointAt,
  sortHorizonRows,
  toTime,
  typicalStep,
} from '@/components/library/charts/utils/horizon'

const series = [
  { name: 'B', data: [{ t: 30, v: 12 }, { t: 10, v: 8 }, { t: 20, v: null }], baseline: 10 },
  { name: 'A', data: [{ t: '1970-01-01T00:00:00.040Z', v: -6 }, { t: new Date(50), v: 2 }, { t: 'bad', v: 1 }] },
  { name: 'C', data: [] },
]

describe('horizon', () => {
  it('toTime', () => {
    expect(toTime(5)).toBe(5)
    expect(toTime(new Date(7))).toBe(7)
    expect(toTime('1970-01-01T00:00:00.009Z')).toBe(9)
  })

  it('horizonRows：排序、基準線、偏離、統計、壞時間略過、平均基準', () => {
    const rows = horizonRows(series)
    expect(rows[0].points).toEqual([
      { t: 10, v: 8, d: -2 },
      { t: 20, v: null, d: null },
      { t: 30, v: 12, d: 2 },
    ])
    expect(rows[0].stats).toEqual({ min: 8, max: 12, mean: 10, last: 12, maxAbs: 2, n: 2 })
    expect(rows[1].baseline).toBe(0)
    expect(rows[1].points.map((p) => p.t)).toEqual([40, 50])
    expect(rows[1].stats!.maxAbs).toBe(6)
    expect(rows[2].stats).toBeNull()
    const mean = horizonRows(series, 'mean')
    expect(mean[1].baseline).toBe(-2)
    expect(mean[0].baseline).toBe(10) // 序列自己的 baseline 優先
    expect(mean[2].baseline).toBe(0)
    // 最後一筆是缺值：last 取最後一個有效值
    expect(horizonRows([{ name: 'x', data: [{ t: 1, v: 3 }, { t: 2, v: null }] }])[0].stats!.last).toBe(3)
  })

  it('horizonExtent / horizonTimes / typicalStep', () => {
    const rows = horizonRows(series)
    expect(horizonExtent(rows)).toEqual([10, 50])
    expect(horizonExtent(horizonRows([{ name: 'e', data: [] }]))).toBeNull()
    expect(horizonTimes(rows)).toEqual([10, 20, 30, 40, 50])
    expect(typicalStep(rows[0].points)).toBe(10)
    expect(typicalStep(rows[1].points.slice(0, 1))).toBe(Infinity)
  })

  it('bandSize / bandFraction：正負兩邊、各層、缺值', () => {
    expect(bandSize(9, 3)).toBe(3)
    expect(bandSize(0, 3)).toBe(1)
    expect(bandSize(5, 0)).toBe(5)
    // d = 7、層高 3：第 0 層滿、第 1 層滿、第 2 層 1/3
    expect([0, 1, 2].map((b) => bandFraction(7, b, 3, 1))).toEqual([1, 1, 1 / 3])
    expect([0, 1, 2].map((b) => bandFraction(7, b, 3, -1))).toEqual([0, 0, 0])
    expect([0, 1].map((b) => bandFraction(-4, b, 3, -1))).toEqual([1, 1 / 3])
    expect(bandFraction(null, 0, 3, 1)).toBeNull()
  })

  it('pointAt：二分搜尋最近點、距離上限', () => {
    const pts = horizonRows([{ name: 'p', data: [{ t: 0, v: 1 }, { t: 10, v: 2 }, { t: 20, v: 3 }] }])[0].points
    expect(pointAt(pts, 4)!.t).toBe(0)
    expect(pointAt(pts, 6)!.t).toBe(10)
    expect(pointAt(pts, 99)!.t).toBe(20)
    expect(pointAt(pts, -5)!.t).toBe(0)
    expect(pointAt(pts, 35, 10)).toBeNull()
    expect(pointAt([], 0)).toBeNull()
  })

  it('sortHorizonRows', () => {
    const rows = horizonRows(series)
    const names = (rs: typeof rows) => rs.map((r) => r.name).join('')
    expect(names(sortHorizonRows(rows, 'none'))).toBe('BAC')
    expect(names(sortHorizonRows(rows, 'name'))).toBe('ABC')
    expect(names(sortHorizonRows(rows, 'maxAbs'))).toBe('ABC')
    expect(names(sortHorizonRows(rows, 'mean'))).toBe('BAC')
    expect(names(sortHorizonRows(rows, 'last'))).toBe('BAC') // 最新偏離都是 +2：同分依原順序
    const tie = horizonRows([{ name: 'x', data: [{ t: 1, v: 1 }] }, { name: 'y', data: [{ t: 1, v: 1 }] }, { name: 'z', data: [] }, { name: 'w', data: [] }])
    expect(names(sortHorizonRows(tie, 'maxAbs'))).toBe('xyzw')
  })
})
