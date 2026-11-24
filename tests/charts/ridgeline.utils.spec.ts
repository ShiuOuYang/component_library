import { describe, expect, it } from 'vitest'
import {
  cleanValues,
  densityOnGrid,
  linearGrid,
  outOfSpec,
  ridgeBandwidth,
  ridgelineDomain,
  ridgelineGroups,
  sortRidgelineGroups,
} from '@/components/library/charts/utils/ridgeline'
import { boxStats } from '@/components/library/charts/utils/boxPlot'

describe('ridgeline', () => {
  it('cleanValues / linearGrid', () => {
    expect(cleanValues([3, null, 1, Number.NaN, undefined, Infinity, 2])).toEqual([1, 2, 3])
    expect(linearGrid(0, 10, 3)).toEqual([0, 5, 10])
    expect(linearGrid(0, 1, 1)).toEqual([0, 1])
    expect(linearGrid(5, 5, 3)).toEqual([5, 5, 5])
  })

  it('ridgeBandwidth：數字、silverman、scott、退回值', () => {
    const s = boxStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])!
    expect(ridgeBandwidth(s, 0.7, 9)).toBe(0.7)
    expect(ridgeBandwidth(s, -1, 9)).toBe(1)
    expect(ridgeBandwidth(s, 'silverman', 9)).toBeCloseTo(0.9 * Math.min(s.sd, s.iqr / 1.34) * 10 ** -0.2)
    expect(ridgeBandwidth(s, 'scott', 9)).toBeCloseTo(1.06 * s.sd * 10 ** -0.2)
    expect(ridgeBandwidth(boxStats([4, 4, 4]), 'silverman', 0)).toBe(1)
    expect(ridgeBandwidth(boxStats([4, 4, 4]), 'scott', 20)).toBe(1)
    expect(ridgeBandwidth(null, 'silverman', 0)).toBe(1)
  })

  it('densityOnGrid：積分約為 1、峰在資料中心、沒資料為 0', () => {
    const vals = [9, 10, 10, 10, 11]
    const grid = linearGrid(0, 20, 401)
    const d = densityOnGrid(vals, 1, grid)
    const area = d.reduce((s, v) => s + v * 0.05, 0)
    expect(area).toBeCloseTo(1, 2)
    expect(grid[d.indexOf(Math.max(...d))]).toBeCloseTo(10)
    expect(densityOnGrid([], 1, [0, 1])).toEqual([0, 0])
    expect(densityOnGrid([1], 0, [0, 1])).toEqual([0, 0])
  })

  it('outOfSpec / ridgelineDomain', () => {
    expect(outOfSpec([1, 2, 3, 4], { lsl: 2, usl: 3.5 })).toEqual({ below: 0.25, above: 0.25 })
    expect(outOfSpec([1, 2], { usl: 1.5 })).toEqual({ below: null, above: 0.5 })
    expect(outOfSpec([], { lsl: 1 })).toEqual({ below: null, above: null })
    expect(ridgelineDomain([{ sorted: [2, 8], bandwidth: 1 }, { sorted: [], bandwidth: 5 }])).toEqual([0, 10])
    expect(ridgelineDomain([{ sorted: [2, 8], bandwidth: 1 }], { lsl: -5, usl: 20, target: Number.NaN })).toEqual([-7, 22])
    expect(ridgelineDomain([{ sorted: [3, 3], bandwidth: 0 }])).toEqual([2, 4])
    expect(ridgelineDomain([])).toEqual([0, 1])
  })

  it('ridgelineGroups：統計、共用格點、峰值、規格外；指定範圍與解析度', () => {
    const r = ridgelineGroups(
      [
        { name: 'A', values: [9, 10, 10, 11, null], color: 'red' },
        { name: 'B', values: [19, 20, 21, 22] },
        { name: 'C', values: [] },
      ],
      { spec: { usl: 20.5 }, resolution: 50 }
    )
    expect(r.grid).toHaveLength(50)
    expect(r.domain[0]).toBeLessThan(9)
    expect(r.domain[1]).toBeGreaterThan(22)
    const [a, b, c] = r.groups
    expect(a).toMatchObject({ name: 'A', color: 'red', index: 0, sorted: [9, 10, 10, 11], belowLsl: null, aboveUsl: 0 })
    expect(a.stats!.median).toBe(10)
    expect(a.peak).toBeGreaterThan(0)
    expect(b.aboveUsl).toBe(0.5)
    expect(c).toMatchObject({ stats: null, peak: 0, aboveUsl: null })
    expect(c.density.every((v) => v === 0)).toBe(true)
    const fixed = ridgelineGroups([{ name: 'A', values: [1, 2, 3] }], { domain: [0, 4], bandwidth: 'scott', method: 'exclusive' })
    expect(fixed.domain).toEqual([0, 4])
    expect(fixed.grid).toHaveLength(120)
  })

  it('sortRidgelineGroups', () => {
    const { groups } = ridgelineGroups([
      { name: 'b', values: [5, 6, 7] },
      { name: 'a', values: [1, 2, 30] },
      { name: 'c', values: [] },
      { name: 'd', values: [5, 6, 7] },
    ])
    const names = (gs: typeof groups) => gs.map((g) => g.name).join('')
    expect(names(sortRidgelineGroups(groups, 'none'))).toBe('bacd')
    expect(names(sortRidgelineGroups(groups, 'median'))).toBe('bdac')
    expect(names(sortRidgelineGroups(groups, 'median', false))).toBe('abdc')
    expect(names(sortRidgelineGroups(groups, 'mean'))).toBe('abdc')
    expect(names(sortRidgelineGroups(groups, 'sd'))).toBe('abdc')
    expect(names(sortRidgelineGroups(groups, 'name'))).toBe('abcd')
    expect(names(sortRidgelineGroups(groups, 'name', false))).toBe('dcba')
    expect(names(sortRidgelineGroups([groups[2], { ...groups[2], name: 'e', index: 9 }], 'median'))).toBe('ce')
  })
})
