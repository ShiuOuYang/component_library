import { describe, expect, it } from 'vitest'
import { layoutTrace, traceLayers, tracePath, traceTree, visibleLinks, type TraceLink } from '@/components/library/shared/lotTrace'

// 原料 M1、M2 → 半成品 W1；M2 → W2；W1 + M3 → 成品 F1；W2 → F2；F1 → 出貨 S1、S2
const links: TraceLink[] = [
  { from: 'M1', to: 'W1', qty: 10 },
  { from: 'M2', to: 'W1', qty: 5 },
  { from: 'M2', to: 'W2' },
  { from: 'W1', to: 'F1' },
  { from: 'M3', to: 'F1' },
  { from: 'W2', to: 'F2' },
  { from: 'F1', to: 'S1' },
  { from: 'F1', to: 'S2' },
]

describe('lotTrace', () => {
  it('traceLayers：上游為負、下游為正；方向與層數限制', () => {
    const both = traceLayers(links, 'W1')
    expect(Object.fromEntries(both)).toEqual({ W1: 0, M1: -1, M2: -1, F1: 1, S1: 2, S2: 2 })
    expect([...traceLayers(links, 'W1', 'backward').keys()].sort()).toEqual(['M1', 'M2', 'W1'])
    expect([...traceLayers(links, 'W1', 'forward').keys()].sort()).toEqual(['F1', 'S1', 'S2', 'W1'])
    expect(Object.fromEntries(traceLayers(links, 'F1', 'backward', 1))).toEqual({ F1: 0, W1: -1, M3: -1 })
    expect(Object.fromEntries(traceLayers(links, 'X'))).toEqual({ X: 0 })
  })

  it('visibleLinks：只留兩端都在範圍內、由左往右的', () => {
    const layers = traceLayers(links, 'W1')
    expect(visibleLinks(links, layers).map((l) => `${l.from}>${l.to}`)).toEqual(['M1>W1', 'M2>W1', 'W1>F1', 'F1>S1', 'F1>S2'])
  })

  it('layoutTrace：欄依層排序、垂直置中、尺寸；依鄰居排序減少交叉', () => {
    const layers = traceLayers(links, 'F1')
    const vis = visibleLinks(links, layers)
    const lay = layoutTrace(layers, vis, { nodeWidth: 100, nodeHeight: 40, colGap: 20, rowGap: 10 })
    expect([...lay.columns.keys()].sort((a, b) => a - b)).toEqual([-2, -1, 0, 1])
    expect(lay.width).toBe(4 * 100 + 3 * 20)
    expect(lay.height).toBe(2 * 40 + 10)
    expect(lay.pos.get('F1')).toMatchObject({ x: 240, layer: 0, row: 0, y: 25 })
    expect(lay.pos.get('M1')!.x).toBe(0)
    // W1 的投入（M1、M2）排在 W1 那一側：M3 沒有上游，W1 在 M3 之上或之下都依初始順序
    const order = ['M3', 'W1', 'M2', 'M1']
    const l2 = layoutTrace(layers, vis, { nodeWidth: 10, nodeHeight: 10, colGap: 0, rowGap: 0, order })
    expect(l2.columns.get(-1)).toEqual(['M3', 'W1'])
    expect(l2.columns.get(-2)).toEqual(['M2', 'M1'])
  })

  it('layoutTrace：barycenter 把下一欄排成和鄰居相同的順序', () => {
    const ls: TraceLink[] = [
      { from: 'A', to: 'R' },
      { from: 'B', to: 'R' },
      { from: 'R', to: 'Y' },
      { from: 'R', to: 'X' },
      { from: 'X', to: 'X2' },
      { from: 'Y', to: 'Y2' },
    ]
    const layers = traceLayers(ls, 'R')
    const lay = layoutTrace(layers, visibleLinks(ls, layers), { nodeWidth: 10, nodeHeight: 10, colGap: 0, rowGap: 0, order: ['R', 'A', 'B', 'X', 'Y', 'Y2', 'X2'] })
    expect(lay.columns.get(1)).toEqual(['X', 'Y'])
    expect(lay.columns.get(2)).toEqual(['X2', 'Y2'])
  })

  it('tracePath：上游、下游、自己、沒有關係', () => {
    const p1 = tracePath(links, 'F1', 'M2')
    expect([...p1.nodes].sort()).toEqual(['F1', 'M2', 'W1'])
    expect([...p1.links].map((l) => `${l.from}>${l.to}`)).toEqual(['M2>W1', 'W1>F1'])
    const p2 = tracePath(links, 'M2', 'S1')
    expect([...p2.nodes].sort()).toEqual(['F1', 'M2', 'S1', 'W1'])
    expect([...tracePath(links, 'F1', 'F1').nodes]).toEqual(['F1'])
    expect(tracePath(links, 'F1', 'F2').nodes.size).toBe(0)
  })

  it('traceTree：上游 / 下游樹、唯一的 key、層數限制、循環只展開一次', () => {
    const up = traceTree(links, 'F1', 'backward', (id) => `#${id}`)
    expect(up.label).toBe('#F1')
    expect(up.children!.map((c) => c.traceId)).toEqual(['W1', 'M3'])
    expect(up.children![0].children!.map((c) => [c.key, c.link?.qty])).toEqual([
      ['backward:F1/0/0', 10],
      ['backward:F1/0/1', 5],
    ])
    expect(traceTree(links, 'F1', 'backward', String, 1).children![0].children).toBeUndefined()
    const down = traceTree(links, 'M2', 'forward', String)
    expect(down.children!.map((c) => c.traceId)).toEqual(['W1', 'W2'])
    const cyc = traceTree([{ from: 'A', to: 'B' }, { from: 'B', to: 'A' }], 'A', 'forward', String)
    expect(cyc.children![0].children![0]).toMatchObject({ traceId: 'A', repeat: true })
    expect(cyc.children![0].children![0].children).toBeUndefined()
  })
})
