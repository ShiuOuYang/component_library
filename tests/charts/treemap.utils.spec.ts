import { describe, expect, it } from 'vitest'
import { buildHierarchy, findByPath, labelFit, layoutTreemap, metricColor, metricOf, metricRatio, nodeKey, pathOf, type TreemapNode } from '@/components/library/charts/utils/treemap'

const data: TreemapNode = {
  name: 'root',
  children: [
    { name: 'A', children: [{ name: 'a1', value: 30, metric: 2 }, { name: 'a2', value: 10, metric: 6 }] },
    { id: 'b', name: 'B', value: 999, children: [{ name: 'b1', value: 20 }] },
    { name: 'C', value: 40, metric: 1 },
    { name: 'D', value: -5 },
    { name: 'E', value: Number.NaN },
  ],
}

describe('treemap utils', () => {
  it('buildHierarchy：群組加總（忽略群組自己的 value）、負值與非有限值當 0、由大到小排序', () => {
    const root = buildHierarchy(data)
    expect(root.value).toBe(100)
    expect(root.children!.map((c) => [c.data.name, c.value])).toEqual([
      ['A', 40],
      ['C', 40],
      ['B', 20],
      ['D', 0],
      ['E', 0],
    ])
  })

  it('nodeKey / findByPath / pathOf：id 優先；找不到的部分停在最深一層', () => {
    const root = buildHierarchy(data)
    expect(nodeKey({ name: 'x' })).toBe('x')
    expect(nodeKey({ id: 'i', name: 'x' })).toBe('i')
    const b1 = findByPath(root, ['b', 'b1'])
    expect(b1.data.name).toBe('b1')
    expect(pathOf(b1)).toEqual(['b', 'b1'])
    expect(findByPath(root, ['A', 'nope', 'x']).data.name).toBe('A')
    expect(findByPath(root, []).data.name).toBe('root')
    expect(pathOf(root)).toEqual([])
  })

  it('metricOf：自己的指標優先；群組依葉節點 value 加權平均；都沒有時為 null', () => {
    const root = buildHierarchy(data)
    expect(metricOf(findByPath(root, ['A']))).toBe(3) // (30·2 + 10·6) / 40
    expect(metricOf(findByPath(root, ['C']))).toBe(1)
    expect(metricOf(findByPath(root, ['b']))).toBeNull()
    expect(metricOf(findByPath(root, ['D']))).toBeNull()
  })

  it('layoutTreemap：一層時只有子節點、面積依值、值為 0 的不畫；鋪滿畫面', () => {
    const root = buildHierarchy(data)
    const tiles = layoutTreemap(root, 200, 100, { padding: 0 })
    expect(tiles.map((t) => t.node.data.name)).toEqual(['A', 'C', 'B'])
    expect(tiles.every((t) => t.depth === 1)).toBe(true)
    const area = (t: (typeof tiles)[number]) => (t.x1 - t.x0) * (t.y1 - t.y0)
    expect(tiles.reduce((s, t) => s + area(t), 0)).toBeCloseTo(20000, -2)
    expect(area(tiles[0]) / area(tiles[2])).toBeCloseTo(2, 0)
    expect(tiles[1].key).toBe('C')
  })

  it('layoutTreemap：兩層時第一層留標題列、第二層在第一層裡面；鑽取後以目前節點排版', () => {
    const root = buildHierarchy(data)
    const tiles = layoutTreemap(root, 400, 300, { levels: 2, headerHeight: 20, padding: 2 })
    const a = tiles.find((t) => t.node.data.name === 'A')!
    const a1 = tiles.find((t) => t.node.data.name === 'a1')!
    expect(a1.depth).toBe(2)
    expect(a1.key).toBe('A/a1')
    expect(a1.y0).toBeGreaterThanOrEqual(a.y0 + 20)
    expect(a1.x0).toBeGreaterThanOrEqual(a.x0)
    expect(a1.x1).toBeLessThanOrEqual(a.x1)
    // 第一層排在前面（先畫），第二層在後
    expect(tiles.findIndex((t) => t.depth === 2)).toBeGreaterThan(tiles.findLastIndex((t) => t.depth === 1))
    const inA = layoutTreemap(findByPath(root, ['A']), 100, 100)
    expect(inA.map((t) => [t.key, t.depth])).toEqual([
      ['A/a1', 1],
      ['A/a2', 1],
    ])
    // 葉節點作為目前節點：沒有方塊
    expect(layoutTreemap(findByPath(root, ['C']), 100, 100)).toEqual([])
    // 大小為 0 時不出錯
    expect(layoutTreemap(root, 0, 0).length).toBeGreaterThan(0)
  })

  it('metricRatio：連續與發散；範圍為 0 時', () => {
    expect(metricRatio(5, [0, 10], null)).toBe(0.5)
    expect(metricRatio(-5, [0, 10], null)).toBe(0)
    expect(metricRatio(20, [0, 10], null)).toBe(1)
    expect(metricRatio(3, [3, 3], null)).toBe(1)
    expect(metricRatio(750, [100, 1000], 500)).toBe(0.5)
    expect(metricRatio(300, [100, 1000], 500)).toBe(-0.5)
    expect(metricRatio(50, [100, 1000], 500)).toBe(-1)
    expect(metricRatio(600, [500, 500], 500)).toBe(0)
    expect(metricRatio(400, [500, 500], 500)).toBe(0)
  })

  it('metricColor：color-mix；連續至少 12%', () => {
    const c = { low: 'blue', high: 'red', base: 'white' }
    expect(metricColor(0, c, false)).toBe('color-mix(in srgb, red 12%, white)')
    expect(metricColor(1, c, false)).toBe('color-mix(in srgb, red 100%, white)')
    expect(metricColor(-1, c, true)).toBe('color-mix(in srgb, blue 85%, white)')
    expect(metricColor(0.5, c, true)).toBe('color-mix(in srgb, red 43%, white)')
  })

  it('labelFit：放得下名稱 + 數值、只有名稱、都放不下', () => {
    expect(labelFit(120, 60, 'SMT 一線', '554 片')).toBe('full')
    expect(labelFit(120, 24, 'SMT 一線', '554 片')).toBe('name')
    expect(labelFit(40, 60, 'SMT 一線', '554 片')).toBe('none')
    expect(labelFit(20, 60, 'A', '1')).toBe('none')
    expect(labelFit(100, 10, 'A', '1')).toBe('none')
    expect(labelFit(60, 60, 'AB', '1,234,567,890 片')).toBe('name')
  })

  it('nodeKey 與路徑：同名不同層不衝突', () => {
    const root = buildHierarchy({ name: 'r', children: [{ name: 'x', children: [{ name: 'x', value: 1 }] }] })
    expect(pathOf(findByPath(root, ['x', 'x']))).toEqual(['x', 'x'])
  })
})
