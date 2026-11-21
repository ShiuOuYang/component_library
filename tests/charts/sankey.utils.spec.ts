import { describe, expect, it } from 'vitest'
import { sankeyLayout, sankeyLinkPath } from '@/components/library/charts/utils/sankey'

const nodes = [{ id: 'a', label: 'A' }, { id: 'b' }, { id: 'c', color: 'red' }, { id: 'd' }]
const links = [
  { source: 'a', target: 'b', value: 30 },
  { source: 'a', target: 'c', value: 10 },
  { source: 'b', target: 'd', value: 20 },
  { source: 'c', target: 'd', value: 10 },
]
const opts = { width: 400, height: 200, nodeWidth: 10, nodePadding: 10 }

describe('sankeyLayout', () => {
  it('欄（最長路徑）、x 位置、節點值與名稱', () => {
    const L = sankeyLayout(nodes, links, opts)
    expect(L.columns).toBe(3)
    const by = Object.fromEntries(L.nodes.map((n) => [n.id, n]))
    expect([by.a.column, by.b.column, by.c.column, by.d.column]).toEqual([0, 1, 1, 2])
    expect([by.a.x0, by.b.x0, by.d.x0, by.d.x1]).toEqual([0, 195, 390, 400])
    expect([by.a.value, by.b.value, by.c.value, by.d.value]).toEqual([40, 30, 10, 30])
    expect([by.a.label, by.b.label, by.c.color]).toEqual(['A', 'b', 'red'])
  })

  it('高度比例取最擠的欄；節點不重疊、不超出範圍；連線寬度 = 值 × 比例', () => {
    const L = sankeyLayout(nodes, links, opts)
    const by = Object.fromEntries(L.nodes.map((n) => [n.id, n]))
    // 第 1 欄：30 + 10 + 間距 10 = 200 → 比例 190 / 40
    const ky = 190 / 40
    expect(by.a.y1 - by.a.y0).toBeCloseTo(40 * ky)
    for (const n of L.nodes) {
      expect(n.y0).toBeGreaterThanOrEqual(-1e-9)
      expect(n.y1).toBeLessThanOrEqual(200 + 1e-9)
    }
    expect(Math.abs(by.b.y1 - by.c.y0) >= 10 - 1e-9 || Math.abs(by.c.y1 - by.b.y0) >= 10 - 1e-9).toBe(true)
    expect(L.links[0].width).toBeCloseTo(30 * ky)
  })

  it('連線在節點上依對面節點高低排列、連續不重疊', () => {
    const L = sankeyLayout(nodes, links, opts)
    const a = L.nodes.find((n) => n.id === 'a')!
    const [first, second] = a.outgoing
    expect(first.target.y0).toBeLessThan(second.target.y0)
    expect(first.y0 - first.width / 2).toBeCloseTo(a.y0)
    expect(second.y0 - second.width / 2).toBeCloseTo(first.y0 + first.width / 2)
    const d = L.nodes.find((n) => n.id === 'd')!
    expect(d.incoming[0].y1 - d.incoming[0].width / 2).toBeCloseTo(d.y0)
  })

  it('justify：沒有流出的節點放最後一欄；left：留在最早的欄', () => {
    const ls = [...links, { source: 'a', target: 'x', value: 5 }]
    expect(sankeyLayout(nodes, ls, opts).nodes.find((n) => n.id === 'x')!.column).toBe(2)
    expect(sankeyLayout(nodes, ls, { ...opts, align: 'left' }).nodes.find((n) => n.id === 'x')!.column).toBe(1)
  })

  it('循環與自我連線被略過；值 ≤ 0 的略過；連線裡出現但沒列的節點自動補上', () => {
    const L = sankeyLayout(
      [{ id: 'a' }],
      [
        { source: 'a', target: 'b', value: 5 },
        { source: 'b', target: 'a', value: 2 },
        { source: 'b', target: 'b', value: 1 },
        { source: 'a', target: 'c', value: 0 },
      ],
      opts
    )
    expect(L.nodes.map((n) => n.id)).toEqual(['a', 'b', 'c'])
    expect(L.links).toHaveLength(1)
    expect(L.cycles.map((c) => `${c.source}>${c.target}`)).toEqual(['b>a', 'b>b'])
  })

  it('沒有資料、只有一欄、全部值為 0 時不出錯', () => {
    expect(sankeyLayout([], [], opts)).toMatchObject({ nodes: [], links: [], columns: 0 })
    const one = sankeyLayout([{ id: 'solo' }], [], opts)
    expect(one.columns).toBe(1)
    expect(one.nodes[0].x0).toBe(0)
    expect(one.nodes[0].y1 - one.nodes[0].y0).toBe(0)
  })

  it('預設的節點寬度、間距與迭代次數；欄太擠時從底部往上推', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ source: 's', target: `t${i}`, value: i === 0 ? 100 : 1 }))
    const L = sankeyLayout([], many, { width: 300, height: 120 })
    expect(L.nodes[0].x1 - L.nodes[0].x0).toBe(14)
    const col = L.nodes.filter((n) => n.column === 1).sort((a, b) => a.y0 - b.y0)
    for (let i = 1; i < col.length; i++) expect(col[i].y0 - col[i - 1].y1).toBeGreaterThanOrEqual(14 - 1e-6)
    expect(Math.max(...col.map((n) => n.y1))).toBeLessThanOrEqual(120 + 1e-6)
  })

  it('sankeyLinkPath：從來源右邊到目標左邊的三次曲線', () => {
    const L = sankeyLayout(nodes, links, opts)
    const l = L.links[0]
    expect(sankeyLinkPath(l)).toBe(`M10,${l.y0}C102.5,${l.y0} 102.5,${l.y1} 195,${l.y1}`)
  })
})
