import { describe, expect, it } from 'vitest'
import { bumpRows, maxRank, rankPeriod, sortByLastRank, tieOffsets } from '@/components/library/charts/utils/bump'

describe('bump', () => {
  it('rankPeriod：大的第 1 / 小的第 1、同分同名次跳號、缺值', () => {
    expect(rankPeriod([10, 30, 20])).toEqual([3, 1, 2])
    expect(rankPeriod([10, 30, 20], 'asc')).toEqual([1, 3, 2])
    expect(rankPeriod([5, 9, 9, 1])).toEqual([3, 1, 1, 4])
    expect(rankPeriod([5, null, undefined, Number.NaN, 7])).toEqual([2, null, null, null, 1])
  })

  it('bumpRows：各期名次、首末、最佳最差、變化；直接給名次', () => {
    const rows = bumpRows(
      [
        { name: 'A', values: [10, 20, 30] },
        { name: 'B', values: [30, 25, 10], color: 'red' },
        { name: 'C', values: [null, 22, null] },
        { name: 'D', values: [] },
      ],
      { periods: 3 }
    )
    expect(rows[0]).toMatchObject({ ranks: [2, 3, 1], first: 2, last: 1, best: 1, worst: 3, change: 1 })
    expect(rows[1]).toMatchObject({ color: 'red', ranks: [1, 1, 2], change: -1 })
    expect(rows[2]).toMatchObject({ ranks: [null, 2, null], first: 2, last: 2, change: null })
    expect(rows[3]).toMatchObject({ ranks: [null, null, null], first: null, last: null, best: null, change: null })
    const given = bumpRows([{ name: 'X', values: [3, 1.4, 0] }], { periods: 3, valueType: 'rank' })
    expect(given[0].ranks).toEqual([3, 1, 1])
    expect(bumpRows([{ name: 'Y', values: [5, 1] }, { name: 'Z', values: [1, 5] }], { periods: 2, order: 'asc' })[0].ranks).toEqual([2, 1])
  })

  it('maxRank / sortByLastRank / tieOffsets', () => {
    const rows = bumpRows(
      [
        { name: 'A', values: [1, 5] },
        { name: 'B', values: [1, 9] },
        { name: 'C', values: [3, null] },
        { name: 'D', values: [null, null] },
      ],
      { periods: 2 }
    )
    // 第 0 期：C=3 第 1、A / B 都是 1 並列第 2；第 1 期：B 第 1、A 第 2
    expect(maxRank(rows)).toBe(2)
    expect(maxRank([])).toBe(1)
    expect(sortByLastRank(rows).map((r) => r.name)).toEqual(['B', 'C', 'A', 'D'])
    const t0 = tieOffsets(rows, 0)
    expect(t0.get('A')).toEqual({ k: 0, n: 2 })
    expect(t0.get('B')).toEqual({ k: 1, n: 2 })
    expect(t0.get('C')).toEqual({ k: 0, n: 1 })
    const tie = bumpRows([{ name: 'P', values: [7] }, { name: 'Q', values: [7] }], { periods: 1 })
    expect([...tieOffsets(tie, 0).values()]).toEqual([{ k: 0, n: 2 }, { k: 1, n: 2 }])
    expect(tieOffsets(rows, 1).has('D')).toBe(false)
  })
})
