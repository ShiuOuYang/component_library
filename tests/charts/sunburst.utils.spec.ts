import { describe, expect, it } from 'vitest'
import { buildHierarchy, findByPath, type TreemapNode } from '@/components/library/charts/utils/treemap'
import { arcCentroid, arcLabel, layoutSunburst, siblingArc } from '@/components/library/charts/utils/sunburst'

const data: TreemapNode = {
  name: 'root',
  children: [
    { name: 'A', children: [{ name: 'a1', value: 30 }, { name: 'a2', children: [{ name: 'x', value: 10 }] }] },
    { name: 'B', value: 60 },
    { name: 'Z', value: 0 },
  ],
}

describe('sunburst', () => {
  it('layoutSunburst：角度依數值、半徑依深度、最內圈祖先、零值略過', () => {
    const root = buildHierarchy(data)
    const { arcs, inner, ring } = layoutSunburst(root, 200, 3)
    expect(inner).toBeCloseTo(48)
    expect(ring).toBeCloseTo((200 - 48) / 3)
    expect(arcs.map((a) => [a.key, a.depth, a.top.data.name])).toEqual([
      ['B', 1, 'B'],
      ['A', 1, 'A'],
      ['A/a1', 2, 'A'],
      ['A/a2', 2, 'A'],
      ['A/a2/x', 3, 'A'],
    ])
    const b = arcs[0]
    expect(b.a1 - b.a0).toBeCloseTo((60 / 100) * 2 * Math.PI)
    expect(b.r0).toBeCloseTo(48)
    expect(arcs[4].r1).toBeCloseTo(200)
    // 只畫兩圈
    expect(layoutSunburst(root, 200, 2).arcs.map((a) => a.key)).toEqual(['B', 'A', 'A/a1', 'A/a2'])
    // 從子節點開始
    const a = findByPath(root, ['A'])
    expect(layoutSunburst(a, 100, 3).arcs.map((x) => x.key)).toEqual(['A/a1', 'A/a2', 'A/a2/x'])
    // 沒有子節點、或總和為 0
    expect(layoutSunburst(findByPath(root, ['B']), 100, 3).arcs).toEqual([])
    expect(layoutSunburst(buildHierarchy({ name: 'r', children: [{ name: 'z', value: 0 }] }), 100, 3).arcs).toEqual([])
    expect(layoutSunburst(root, 100, 0).ring).toBe(0)
  })

  it('arcCentroid：角度 0 在上方、順時針', () => {
    const [x0, y0] = arcCentroid({ a0: 0, a1: 0, r0: 10, r1: 30 })
    expect(x0).toBeCloseTo(0)
    expect(y0).toBeCloseTo(-20)
    const [x1, y1] = arcCentroid({ a0: Math.PI / 2, a1: Math.PI / 2, r0: 10, r1: 30 })
    expect(x1).toBeCloseTo(20)
    expect(y1).toBeCloseTo(0)
  })

  it('arcLabel：放得下才放、右半邊 deg − 90、左半邊翻轉', () => {
    const right = arcLabel({ a0: Math.PI / 2 - 0.3, a1: Math.PI / 2 + 0.3, r0: 50, r1: 100 }, 30)!
    expect(right.rotate).toBeCloseTo(0)
    expect(right.x).toBeCloseTo(75)
    const left = arcLabel({ a0: (3 * Math.PI) / 2 - 0.3, a1: (3 * Math.PI) / 2 + 0.3, r0: 50, r1: 100 }, 30)!
    expect(left.rotate).toBeCloseTo(360)
    // 太長、太窄
    expect(arcLabel({ a0: 0, a1: 1, r0: 50, r1: 70 }, 30)).toBeNull()
    expect(arcLabel({ a0: 0, a1: 0.05, r0: 50, r1: 100 }, 20)).toBeNull()
  })

  it('siblingArc：同一圈依角度循環', () => {
    const { arcs } = layoutSunburst(buildHierarchy(data), 200, 3)
    const [b, a] = arcs
    expect(siblingArc(arcs, b, 1)).toBe(a)
    expect(siblingArc(arcs, a, 1)).toBe(b)
    expect(siblingArc(arcs, b, -1)).toBe(a)
  })
})
