import { describe, expect, it } from 'vitest'
import {
  buildNetwork,
  createNetworkSimulation,
  fitTransform,
  groupCenters,
  networkBounds,
  shortestPath,
  trimSegment,
  type NetworkNode,
} from '@/components/library/charts/utils/network'

const nodes = [
  { id: 'a', label: 'A', group: 'g1', value: 5 },
  { id: 'b', group: 'g1' },
  { id: 'c', group: 'g2', value: -3 },
  { id: 'd', group: 'g2', color: 'red' },
  { id: 'e' },
  { id: 'a', label: '重複' },
]
const links = [
  { source: 'a', target: 'b', value: 2 },
  { source: 'b', target: 'a', value: 3 },
  { source: 'b', target: 'c' },
  { source: 'c', target: 'd', value: Number.NaN },
  { source: 'a', target: 'a' },
  { source: 'a', target: 'zzz' },
]

describe('network', () => {
  it('buildNetwork：重複節點忽略、連線合併、略過壞連線、度數與鄰居', () => {
    const g = buildNetwork(nodes, links)
    expect(g.nodes.map((n) => n.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(g.byId.get('a')).toMatchObject({ label: 'A', value: 5, degree: 1, strength: 5 })
    expect(g.byId.get('b')).toMatchObject({ label: 'b', value: 1, degree: 2, strength: 6 })
    expect(g.byId.get('c')!.value).toBe(0)
    expect(g.byId.get('d')!.color).toBe('red')
    expect(g.byId.get('e')).toMatchObject({ group: null, degree: 0 })
    expect(g.groups).toEqual(['g1', 'g2'])
    expect(g.links.map((l) => `${l.source.id}-${l.target.id}:${l.value}`)).toEqual(['a-b:5', 'b-c:1', 'c-d:1'])
    expect([...g.neighbors.get('b')!]).toEqual(['a', 'c'])
    expect(g.incident.get('c')!.map((l) => l.index)).toEqual([1, 2])
    expect(g.dropped).toEqual([links[4], links[5]])
    // 有方向：A→B 與 B→A 分開
    const d = buildNetwork(nodes, links, true)
    expect(d.links.map((l) => `${l.source.id}-${l.target.id}:${l.value}`)).toEqual(['a-b:2', 'b-a:3', 'b-c:1', 'c-d:1'])
    expect(d.byId.get('a')!.degree).toBe(1)
  })

  it('groupCenters：一個群組在中央、多個沿圓排開', () => {
    expect(groupCenters(['x'], 200, 100).get('x')).toEqual({ x: 100, y: 50 })
    const c = groupCenters(['p', 'q'], 200, 100)
    expect(c.get('p')!.x).toBeCloseTo(100)
    expect(c.get('p')!.y).toBeCloseTo(50 - 28)
    expect(c.get('q')!.y).toBeCloseTo(50 + 28)
  })

  it('createNetworkSimulation：決定性、同群組靠在一起、連線拉近', () => {
    const many = Array.from({ length: 24 }, (_, i) => ({ id: `n${i}`, group: i < 12 ? 'L' : 'R' }))
    const ls = many.slice(1).map((n, i) => ({ source: n.id, target: i < 11 ? 'n0' : i === 11 ? 'n0' : 'n12', value: i % 3 + 1 }))
    const run = () => {
      const g = buildNetwork(many, ls)
      const sim = createNetworkSimulation(g, { width: 600, height: 300, radius: () => 5 })
      sim.tick(200)
      return g
    }
    const a = run()
    const b = run()
    expect(a.nodes.map((n) => [n.x, n.y])).toEqual(b.nodes.map((n) => [n.x, n.y]))
    const mean = (g: typeof a, grp: string) => {
      const ns = g.nodes.filter((n) => n.group === grp)
      return [ns.reduce((s, n) => s + n.x, 0) / ns.length, ns.reduce((s, n) => s + n.y, 0) / ns.length]
    }
    const [lx] = mean(a, 'L')
    const [rx] = mean(a, 'R')
    const [, ly] = mean(a, 'L')
    const [, ry] = mean(a, 'R')
    expect(Math.hypot(lx - rx, ly - ry)).toBeGreaterThan(40)
    // 沒有群組：往中央聚
    const solo = buildNetwork([{ id: 'x' }, { id: 'y' }], [{ source: 'x', target: 'y' }])
    const sim = createNetworkSimulation(solo, { width: 400, height: 400, radius: () => 4, charge: -30, linkDistance: 20, groupPull: 0.2 })
    sim.tick(300)
    const [x, y] = solo.nodes
    expect(Math.hypot(x.x - y.x, y.y - x.y)).toBeLessThan(60)
    expect(Math.abs((x.x + y.x) / 2 - 200)).toBeLessThan(20)
    // 空圖也能建立
    expect(createNetworkSimulation(buildNetwork([], []), { width: 10, height: 10, radius: () => 1 }).nodes()).toEqual([])
  })

  it('networkBounds / fitTransform', () => {
    expect(networkBounds([], () => 1)).toBeNull()
    const ns = [
      { x: 0, y: 0 },
      { x: 100, y: 50 },
    ] as NetworkNode[]
    const b = networkBounds(ns, () => 10)!
    expect(b).toEqual({ x0: -10, y0: -10, x1: 110, y1: 60 })
    expect(fitTransform(null, 100, 100)).toEqual({ k: 1, x: 0, y: 0 })
    const t = fitTransform(b, 500, 300, 20)
    expect(t.k).toBeCloseTo(2) // (500-40)/120 = 3.8、(300-40)/70 = 3.7 → 上限 2
    expect(t.x + t.k * 50).toBeCloseTo(250)
    expect(t.y + t.k * 25).toBeCloseTo(150)
    expect(fitTransform(b, 70, 300, 5).k).toBeCloseTo(60 / 120)
    expect(fitTransform({ x0: 0, y0: 0, x1: 0, y1: 0 }, 100, 100, 10, 50).k).toBe(50)
  })

  it('shortestPath', () => {
    const g = buildNetwork(nodes, links)
    expect(shortestPath(g, 'a', 'd')).toEqual(['a', 'b', 'c', 'd'])
    expect(shortestPath(g, 'd', 'a')).toEqual(['d', 'c', 'b', 'a'])
    expect(shortestPath(g, 'a', 'a')).toEqual(['a'])
    expect(shortestPath(g, 'a', 'e')).toBeNull()
    expect(shortestPath(g, 'a', 'nope')).toBeNull()
  })

  it('trimSegment', () => {
    expect(trimSegment(0, 0, 10, 0, 2, 3)).toEqual([2, 0, 7, 0])
    const [x1, y1, x2, y2] = trimSegment(0, 0, 30, 40, 5, 10)
    expect([x1, y1, x2, y2].map((v) => Math.round(v))).toEqual([3, 4, 24, 32])
    expect(trimSegment(0, 0, 3, 0, 2, 2)).toEqual([0, 0, 3, 0])
  })
})
