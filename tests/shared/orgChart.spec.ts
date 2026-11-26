import { describe, expect, it } from 'vitest'
import {
  ancestorsOf,
  expandedToDepth,
  indexOrg,
  isVisible,
  layoutOrg,
  orgFromFlat,
  orgInitials,
  orgLinkPath,
  orgNeighbor,
  orgRoots,
  searchOrg,
  type OrgNode,
} from '@/components/library/shared/orgChart'

const tree: OrgNode = {
  id: 'r',
  label: 'Root',
  title: 'CEO',
  children: [
    { id: 'a', label: '王小明', title: '製造', children: [{ id: 'a1', label: 'A1' }, { id: 'a2', label: 'A2', title: 'Line lead' }] },
    { id: 'b', label: 'B', children: [{ id: 'b1', label: 'B1', children: [{ id: 'b11', label: 'B11' }] }] },
    { id: 'c', label: 'C' },
  ],
}
const opts = { nodeWidth: 100, nodeHeight: 40, gapX: 10, gapY: 20, orientation: 'vertical' as const }

describe('orgChart', () => {
  it('orgFromFlat：parentId 組樹、自訂欄位、找不到上層的當根、自己指自己', () => {
    const roots = orgFromFlat([
      { id: 1, parentId: null, label: '廠長', title: 'GM' },
      { id: 2, parentId: 1, label: '經理' },
      { id: 3, parentId: 99, label: '孤兒' },
      { id: 4, parentId: '', label: '空字串上層' },
      { id: 5, parentId: 5, label: '自己' },
    ])
    expect(roots.map((r) => r.label)).toEqual(['廠長', '孤兒', '空字串上層', '自己'])
    expect(roots[0].children!.map((c) => c.label)).toEqual(['經理'])
    expect(roots[0].title).toBe('GM')
    expect(roots[0].children![0].title).toBeUndefined()
    const custom = orgFromFlat([{ key: 'x', boss: undefined, name: 'X', job: 'J' }, { key: 'y', boss: 'x' }], { id: 'key', parent: 'boss', label: 'name', title: 'job' })
    expect(custom[0]).toMatchObject({ id: 'x', label: 'X', title: 'J' })
    expect(custom[0].children![0].label).toBe('y') // 沒有名稱時用 id
  })

  it('indexOrg：深度、兄弟位置、後代數、重複 id 只取第一個', () => {
    const idx = indexOrg([tree, { id: 'r2', label: 'Second root', children: [{ id: 'a', label: 'dup' }] }])
    expect(idx.get('r')).toMatchObject({ depth: 0, parentId: null, descendants: 7, childIds: ['a', 'b', 'c'], index: 0 })
    expect(idx.get('b11')).toMatchObject({ depth: 3, parentId: 'b1' })
    expect(idx.get('c')!.index).toBe(2)
    expect(idx.get('a')!.node.label).toBe('王小明')
    expect(idx.get('r2')).toMatchObject({ childIds: [], descendants: 0, index: 1 })
    expect(orgRoots(idx)).toEqual(['r', 'r2'])
    expect(ancestorsOf(idx, 'b11')).toEqual(['r', 'b', 'b1'])
    expect(ancestorsOf(idx, 'nope')).toEqual([])
  })

  it('expandedToDepth / isVisible', () => {
    const idx = indexOrg([tree])
    expect([...expandedToDepth(idx, 0)]).toEqual([])
    expect([...expandedToDepth(idx, 1)]).toEqual(['r'])
    expect([...expandedToDepth(idx, Infinity)].sort()).toEqual(['a', 'b', 'b1', 'r'])
    const e = expandedToDepth(idx, 1)
    expect(isVisible(idx, e, 'a')).toBe(true)
    expect(isVisible(idx, e, 'a1')).toBe(false)
    expect(isVisible(idx, e, 'zz')).toBe(false)
  })

  it('layoutOrg vertical：父節點置中、子樹不重疊、收合的當葉、寬高', () => {
    const idx = indexOrg([tree])
    const L = layoutOrg(idx, expandedToDepth(idx, Infinity), opts)
    const at = (id: string) => L.byId.get(id)!
    // 葉層：a1 a2 | b11 | c
    expect(at('a1')).toMatchObject({ x: 0, y: 120 })
    expect(at('a2').x).toBe(110)
    expect(at('a').x).toBe(55) // 兩個子節點的中間
    expect(at('b11').x).toBe(220)
    expect(at('b').x).toBe(220)
    expect(at('c')).toMatchObject({ x: 330, y: 60 })
    expect(at('r').x).toBe(165)
    expect(L.width).toBe(430)
    expect(L.height).toBe(4 * 40 + 3 * 20)
    expect(L.nodes.map((n) => n.id)).toEqual(['r', 'a', 'a1', 'a2', 'b', 'b1', 'b11', 'c'])
    expect(L.links).toHaveLength(7)
    expect(L.links[0]).toEqual({ from: 'r', to: 'a', path: 'M215,40V50H105V60' })
    expect(at('r').expanded).toBe(true)
    expect(at('c').expanded).toBe(false)
    // 收合 b：b1 不見、寬度變小
    const e = expandedToDepth(idx, Infinity)
    e.delete('b')
    const L2 = layoutOrg(idx, e, opts)
    expect(L2.byId.has('b1')).toBe(false)
    expect(L2.links).toHaveLength(5)
    // 只有一個很寬的父節點：子樹寬度至少是節點寬
    const wide = indexOrg([{ id: 'p', label: 'P', children: [{ id: 'q', label: 'Q' }] }])
    expect(layoutOrg(wide, new Set(['p']), opts).width).toBe(100)
  })

  it('layoutOrg horizontal、多個根節點、空資料', () => {
    const idx = indexOrg([tree, { id: 'z', label: 'Z' }])
    const L = layoutOrg(idx, expandedToDepth(idx, 1), { ...opts, orientation: 'horizontal' })
    // 水平：x 是層、y 是兄弟方向（節點高 40）
    expect(L.byId.get('a')).toMatchObject({ x: 120, y: 0 })
    expect(L.byId.get('b')!.y).toBe(50)
    expect(L.byId.get('r')).toMatchObject({ x: 0, y: 50 })
    expect(L.byId.get('z')).toMatchObject({ x: 0, y: 150 })
    expect(L.width).toBe(100 * 2 + 20)
    expect(L.height).toBe(190)
    expect(L.links[0].path).toBe('M100,70H110V20H120')
    const empty = layoutOrg(indexOrg([]), new Set(), opts)
    expect(empty).toMatchObject({ width: 0, height: 0, nodes: [], links: [] })
  })

  it('orgLinkPath 兩個方向', () => {
    expect(orgLinkPath({ x: 0, y: 0 }, { x: 0, y: 100 }, opts)).toBe('M50,40V70H50V100')
    expect(orgLinkPath({ x: 0, y: 0 }, { x: 200, y: 0 }, { ...opts, orientation: 'horizontal' })).toBe('M100,20H150V20H200')
  })

  it('searchOrg：名稱、職稱、自訂欄位、不分大小寫、空字串', () => {
    const idx = indexOrg([tree])
    expect(searchOrg(idx, 'b1')).toEqual(['b1', 'b11'])
    expect(searchOrg(idx, 'LINE')).toEqual(['a2'])
    expect(searchOrg(idx, '王')).toEqual(['a'])
    expect(searchOrg(idx, '  ')).toEqual([])
    expect(searchOrg(idx, 'r', ['id'])).toEqual(['r'])
  })

  it('orgNeighbor：上層、下層（展開時）、兄弟、第一個與最後一個看得到的', () => {
    const idx = indexOrg([tree, { id: 'z', label: 'Z' }])
    const e = expandedToDepth(idx, 1)
    expect(orgNeighbor(idx, e, 'a', 'parent')).toBe('r')
    expect(orgNeighbor(idx, e, 'r', 'parent')).toBeNull()
    expect(orgNeighbor(idx, e, 'r', 'child')).toBe('a')
    expect(orgNeighbor(idx, e, 'a', 'child')).toBeNull() // a 收合
    expect(orgNeighbor(idx, e, 'a', 'next')).toBe('b')
    expect(orgNeighbor(idx, e, 'a', 'prev')).toBeNull()
    expect(orgNeighbor(idx, e, 'c', 'next')).toBeNull()
    expect(orgNeighbor(idx, e, 'r', 'next')).toBe('z') // 根節點之間
    expect(orgNeighbor(idx, e, 'b', 'first')).toBe('r')
    expect(orgNeighbor(idx, e, 'b', 'last')).toBe('z')
    expect(orgNeighbor(idx, e, 'nope', 'next')).toBeNull()
  })

  it('orgInitials：中文取最後兩字、英文取字首、空白', () => {
    expect(orgInitials('王小明')).toBe('小明')
    expect(orgInitials('歐陽 小芬')).toBe('小芬')
    expect(orgInitials('Amy Chen')).toBe('AC')
    expect(orgInitials('ken')).toBe('KE')
    expect(orgInitials('  ')).toBe('?')
  })
})
