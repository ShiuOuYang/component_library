import { describe, expect, it } from 'vitest'
import { labelAnchor, radarPoint, radarRatio, radarScales, seriesPolygon } from '@/components/library/charts/utils/radar'

const axes = [
  { key: 'q', label: '品質', max: 100 },
  { key: 'ppm', label: '不良率', lowerIsBetter: true },
  { key: 'x', label: 'X', min: 10 },
]
const series = [
  { name: 'A', values: { q: 80, ppm: 300, x: 12 } },
  { name: 'B', values: { q: 60, ppm: 900, x: null } },
]

describe('radar utils', () => {
  it('radarScales：軸自己的 max 優先、其次共用 max、否則取整；max ≤ min 時修正', () => {
    expect(radarScales(axes, series)).toEqual({ q: { min: 0, max: 100 }, ppm: { min: 0, max: 1000 }, x: { min: 10, max: 12 } })
    expect(radarScales(axes, series, 50)).toEqual({ q: { min: 0, max: 100 }, ppm: { min: 0, max: 50 }, x: { min: 10, max: 50 } })
    expect(radarScales([{ key: 'z', label: 'Z', min: 5, max: 5 }], [])).toEqual({ z: { min: 5, max: 6 } })
  })

  it('radarRatio：比例、夾住範圍、越小越好反轉、沒有值為 null', () => {
    const s = { min: 0, max: 200 }
    expect(radarRatio(50, s)).toBe(0.25)
    expect(radarRatio(500, s)).toBe(1)
    expect(radarRatio(-5, s)).toBe(0)
    expect(radarRatio(50, s, true)).toBe(0.75)
    expect(radarRatio(null, s)).toBeNull()
    expect(radarRatio(Number.NaN, s)).toBeNull()
  })

  it('radarPoint：第一軸朝上、順時針；labelAnchor', () => {
    const top = radarPoint(0, 4, 1, 100, 200, 200)
    expect([Math.round(top.x), Math.round(top.y)]).toEqual([200, 100])
    const right = radarPoint(1, 4, 0.5, 100, 200, 200)
    expect([Math.round(right.x), Math.round(right.y)]).toEqual([250, 200])
    expect(radarPoint(0, 0, 1, 10, 0, 0).y).toBe(-10)
    expect([labelAnchor(0, 4), labelAnchor(1, 4), labelAnchor(2, 4), labelAnchor(3, 4)]).toEqual(['middle', 'start', 'middle', 'end'])
    expect(labelAnchor(0, 0)).toBe('middle')
  })

  it('seriesPolygon：沒有值的軸畫在中心並標記；沒有軸時路徑為空', () => {
    const scales = radarScales(axes, series)
    const poly = seriesPolygon(series[1], axes, scales, 100, 0, 0)
    expect(poly.points.map((p) => p.ratio)).toEqual([0.6, 0.09999999999999998, null])
    expect(poly.points[2]).toMatchObject({ x: 0, y: 0 })
    expect(poly.path.startsWith('M0.00,-60.00L')).toBe(true)
    expect(poly.path.endsWith('Z')).toBe(true)
    expect(seriesPolygon(series[0], [], scales, 100, 0, 0).path).toBe('')
  })
})
