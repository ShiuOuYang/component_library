import { describe, expect, it } from 'vitest'
import { lineBalanceMax, lineBalanceSummary, moveElement, stationLoads, type LbElement, type LbStation } from '@/components/library/charts/utils/lineBalance'

const stations: LbStation[] = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B', operators: 2 },
  { id: 'c', name: 'C', operators: 0 },
]
const elements: LbElement[] = [
  { id: '1', name: 'x', station: 'a', time: 30 },
  { id: '2', name: 'y', station: 'b', time: 50 },
  { id: '3', name: 'z', station: 'a', time: 10 },
  { id: '4', name: 'w', station: 'b', time: 30 },
  { id: '5', name: 'q', station: 'c', time: -5 },
  { id: '6', name: 'orphan', station: 'zz', time: 99 },
]

describe('lineBalance', () => {
  it('stationLoads：工時、人數、週期；負的工時算 0、不在工站的元素略過', () => {
    const l = stationLoads(stations, elements)
    expect(l.map((x) => [x.station.id, x.elements.map((e) => e.id), x.load, x.operators, x.cycle])).toEqual([
      ['a', ['1', '3'], 40, 1, 40],
      ['b', ['2', '4'], 80, 2, 40],
      ['c', ['5'], 0, 1, 0],
    ])
  })

  it('lineBalanceSummary：瓶頸、平衡率、超過節拍、理論最少人數、平均', () => {
    const l = stationLoads(stations, elements)
    expect(lineBalanceSummary(l, 35)).toEqual({
      totalWork: 120,
      bottleneck: 40,
      bottleneckId: 'a',
      operators: 4,
      balanceRate: 0.75,
      overTakt: ['a', 'b'],
      minOperators: 4,
      average: 30,
    })
    const noTakt = lineBalanceSummary(l, null)
    expect(noTakt.overTakt).toEqual([])
    expect(noTakt.minOperators).toBeNull()
    expect(lineBalanceSummary(l, 40).overTakt).toEqual([])
    expect(lineBalanceSummary(l, 40).minOperators).toBe(3)
    expect(lineBalanceSummary([], 30)).toEqual({
      totalWork: 0,
      bottleneck: 0,
      bottleneckId: null,
      operators: 0,
      balanceRate: null,
      overTakt: [],
      minOperators: 0,
      average: null,
    })
    expect(lineBalanceSummary(stationLoads([{ id: 'e', name: 'E' }], []), 0).balanceRate).toBeNull()
  })

  it('moveElement：放到目標站最上方、指定位置；目標站是空的；找不到', () => {
    const ids = (els: LbElement[], st: string) => els.filter((e) => e.station === st).map((e) => e.id)
    const top = moveElement(elements, '1', 'b')
    expect(ids(top, 'b')).toEqual(['2', '4', '1'])
    expect(ids(top, 'a')).toEqual(['3'])
    expect(top.find((e) => e.id === '1')!.station).toBe('b')
    expect(elements[0].station).toBe('a')
    expect(ids(moveElement(elements, '1', 'b', 0), 'b')).toEqual(['1', '2', '4'])
    expect(ids(moveElement(elements, '1', 'b', 1), 'b')).toEqual(['2', '1', '4'])
    expect(ids(moveElement(elements, '1', 'b', -3), 'b')).toEqual(['1', '2', '4'])
    const empty = moveElement(elements, '3', 'new')
    expect(empty.map((e) => e.id)).toEqual(['1', '2', '3', '4', '5', '6'])
    expect(empty[2].station).toBe('new')
    expect(moveElement(elements, 'nope', 'b')).toEqual(elements)
  })

  it('lineBalanceMax', () => {
    const l = stationLoads(stations, elements)
    expect(lineBalanceMax(l, 30)).toBeCloseTo(46)
    expect(lineBalanceMax(l, 60)).toBeCloseTo(69)
    expect(lineBalanceMax([], null)).toBe(1)
  })
})
