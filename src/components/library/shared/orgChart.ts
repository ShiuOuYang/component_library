/**
 * 組織圖（ChptOrgChart）的資料整理、版面與導覽
 *
 * 版面：每個節點固定大小；子樹的寬度 = 子節點子樹寬度的總和（加間距），父節點置中在子節點上方。
 * 收合的節點當成葉節點。vertical 由上往下、horizontal 由左往右（同一套計算，最後交換座標軸）。
 */

export interface OrgNode {
  id: string | number
  /** 名稱（姓名、部門） */
  label: string
  /** 職稱 / 說明 */
  title?: string
  /** 頭像網址 */
  avatar?: string
  /** 節點頂端的色條 */
  color?: string
  children?: OrgNode[]
  [key: string]: unknown
}

export interface OrgEntry {
  node: OrgNode
  id: string
  parentId: string | null
  depth: number
  /** 在兄弟中的位置 */
  index: number
  childIds: string[]
  /** 所有後代的數量 */
  descendants: number
}

export type OrgIndex = Map<string, OrgEntry>

export const orgKey = (id: string | number) => String(id)

/** 平面清單（含 parentId）轉成樹；找不到上層的當成根節點 */
export function orgFromFlat<T extends Record<string, unknown>>(
  rows: readonly T[],
  o: { id?: keyof T; parent?: keyof T; label?: keyof T; title?: keyof T } = {}
): OrgNode[] {
  const idKey = (o.id ?? 'id') as keyof T
  const parentKey = (o.parent ?? 'parentId') as keyof T
  const labelKey = (o.label ?? 'label') as keyof T
  const titleKey = (o.title ?? 'title') as keyof T
  const nodes = new Map<string, OrgNode>()
  for (const r of rows) {
    const id = r[idKey] as string | number
    nodes.set(orgKey(id), { ...r, id, label: String(r[labelKey] ?? id), title: r[titleKey] === undefined ? undefined : String(r[titleKey]), children: [] })
  }
  const roots: OrgNode[] = []
  for (const r of rows) {
    const node = nodes.get(orgKey(r[idKey] as string | number))!
    const pid = r[parentKey]
    const parent = pid === undefined || pid === null || pid === '' ? undefined : nodes.get(orgKey(pid as string | number))
    if (parent && parent !== node) parent.children!.push(node)
    else roots.push(node)
  }
  return roots
}

/** 建立 id → 節點資訊的索引（深度優先順序） */
export function indexOrg(roots: readonly OrgNode[]): OrgIndex {
  const map: OrgIndex = new Map()
  const visit = (node: OrgNode, parentId: string | null, depth: number, index: number): number => {
    const id = orgKey(node.id)
    if (map.has(id)) return 0 // 重複 id 或循環：只取第一次出現
    const entry: OrgEntry = { node, id, parentId, depth, index, childIds: [], descendants: 0 }
    map.set(id, entry)
    let count = 0
    for (const c of node.children ?? []) {
      const before = map.size
      count += visit(c, id, depth + 1, entry.childIds.length)
      if (map.size > before) {
        entry.childIds.push(orgKey(c.id))
        count++
      }
    }
    entry.descendants = count
    return count
  }
  roots.forEach((r, i) => visit(r, null, 0, i))
  // 根節點的 index：依出現順序重新編號
  let k = 0
  for (const e of map.values()) if (e.parentId === null) e.index = k++
  return map
}

export const orgRoots = (index: OrgIndex) => [...index.values()].filter((e) => e.parentId === null).map((e) => e.id)

/** 預設展開到第幾層（0 = 只有根節點，Infinity = 全部） */
export function expandedToDepth(index: OrgIndex, depth: number): Set<string> {
  const out = new Set<string>()
  for (const e of index.values()) if (e.childIds.length && e.depth < depth) out.add(e.id)
  return out
}

export function ancestorsOf(index: OrgIndex, id: string): string[] {
  const out: string[] = []
  let cur = index.get(id)?.parentId ?? null
  while (cur !== null) {
    out.unshift(cur)
    cur = index.get(cur)?.parentId ?? null
  }
  return out
}

/** 目前看得到的節點（上層都展開了） */
export function isVisible(index: OrgIndex, expanded: ReadonlySet<string>, id: string): boolean {
  return index.has(id) && ancestorsOf(index, id).every((a) => expanded.has(a))
}

export interface OrgLayoutOptions {
  nodeWidth: number
  nodeHeight: number
  /** 兄弟之間的距離 */
  gapX: number
  /** 上下層之間的距離 */
  gapY: number
  orientation: 'vertical' | 'horizontal'
}

export interface OrgLaidNode {
  id: string
  entry: OrgEntry
  /** 節點左上角 */
  x: number
  y: number
  expanded: boolean
}

export interface OrgLink {
  from: string
  to: string
  path: string
}

export interface OrgLayout {
  nodes: OrgLaidNode[]
  links: OrgLink[]
  width: number
  height: number
  byId: Map<string, OrgLaidNode>
}

export function layoutOrg(index: OrgIndex, expanded: ReadonlySet<string>, o: OrgLayoutOptions): OrgLayout {
  const vertical = o.orientation === 'vertical'
  // 沿著兄弟方向的大小（breadth）與層的方向（depth）
  const breadth = vertical ? o.nodeWidth : o.nodeHeight
  const along = vertical ? o.nodeHeight : o.nodeWidth
  const gapB = o.gapX
  const gapD = o.gapY
  const span = new Map<string, number>()
  const kids = (id: string) => (expanded.has(id) ? index.get(id)!.childIds : [])
  const measure = (id: string): number => {
    const c = kids(id)
    const w = c.length ? Math.max(breadth, c.reduce((s, k) => s + measure(k), 0) + gapB * (c.length - 1)) : breadth
    span.set(id, w)
    return w
  }
  const pos = new Map<string, { b: number; d: number }>()
  const place = (id: string, start: number, depth: number) => {
    const w = span.get(id)!
    const c = kids(id)
    const childTotal = c.reduce((s, k) => s + span.get(k)!, 0) + gapB * Math.max(0, c.length - 1)
    let cursor = start + (w - childTotal) / 2
    for (const k of c) {
      place(k, cursor, depth + 1)
      cursor += span.get(k)! + gapB
    }
    pos.set(id, { b: start + (w - breadth) / 2, d: depth * (along + gapD) })
  }
  let cursor = 0
  let maxDepth = 0
  for (const r of orgRoots(index)) {
    const w = measure(r)
    place(r, cursor, 0)
    cursor += w + gapB
  }
  const nodes: OrgLaidNode[] = []
  for (const [id, p] of pos) {
    const entry = index.get(id)!
    maxDepth = Math.max(maxDepth, entry.depth)
    nodes.push({ id, entry, x: vertical ? p.b : p.d, y: vertical ? p.d : p.b, expanded: expanded.has(id) && entry.childIds.length > 0 })
  }
  // 依深度優先順序排（DOM 與 Tab 順序跟著資料）
  const order = new Map([...index.keys()].map((k, i) => [k, i]))
  nodes.sort((a, b) => order.get(a.id)! - order.get(b.id)!)
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const links: OrgLink[] = []
  for (const n of nodes) {
    if (!n.expanded) continue
    for (const cid of n.entry.childIds) {
      const c = byId.get(cid)!
      links.push({ from: n.id, to: cid, path: orgLinkPath(n, c, o) })
    }
  }
  const totalB = Math.max(0, cursor - gapB)
  const totalD = nodes.length ? (maxDepth + 1) * along + maxDepth * gapD : 0
  return { nodes, links, width: vertical ? totalB : totalD, height: vertical ? totalD : totalB, byId }
}

/** 直角連線：從父節點底邊（或右邊）中點，到子節點頂邊（或左邊）中點 */
export function orgLinkPath(p: { x: number; y: number }, c: { x: number; y: number }, o: Pick<OrgLayoutOptions, 'nodeWidth' | 'nodeHeight' | 'orientation'>): string {
  if (o.orientation === 'vertical') {
    const x1 = p.x + o.nodeWidth / 2
    const y1 = p.y + o.nodeHeight
    const x2 = c.x + o.nodeWidth / 2
    const y2 = c.y
    const my = (y1 + y2) / 2
    return `M${x1},${y1}V${my}H${x2}V${y2}`
  }
  const x1 = p.x + o.nodeWidth
  const y1 = p.y + o.nodeHeight / 2
  const x2 = c.x
  const y2 = c.y + o.nodeHeight / 2
  const mx = (x1 + x2) / 2
  return `M${x1},${y1}H${mx}V${y2}H${x2}`
}

/** 搜尋：名稱、職稱與指定欄位包含關鍵字（不分大小寫）；依深度優先順序 */
export function searchOrg(index: OrgIndex, query: string, fields: readonly string[] = ['label', 'title']): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const out: string[] = []
  for (const e of index.values()) {
    if (fields.some((f) => String(e.node[f] ?? '').toLowerCase().includes(q))) out.push(e.id)
  }
  return out
}

export type OrgDirection = 'parent' | 'child' | 'prev' | 'next' | 'first' | 'last'

/** 鍵盤導覽：上一層 / 第一個下層（已展開時）/ 上一個、下一個兄弟 / 第一個、最後一個看得到的 */
export function orgNeighbor(index: OrgIndex, expanded: ReadonlySet<string>, id: string, dir: OrgDirection): string | null {
  const e = index.get(id)
  if (!e) return null
  if (dir === 'parent') return e.parentId
  if (dir === 'child') return expanded.has(id) && e.childIds.length ? e.childIds[0] : null
  if (dir === 'first' || dir === 'last') {
    const visible = [...index.keys()].filter((k) => isVisible(index, expanded, k))
    return dir === 'first' ? visible[0] : visible[visible.length - 1]
  }
  const siblings = e.parentId === null ? orgRoots(index) : index.get(e.parentId)!.childIds
  const i = siblings.indexOf(id) + (dir === 'next' ? 1 : -1)
  return i >= 0 && i < siblings.length ? siblings[i] : null
}

/** 名字的縮寫（頭像）：中文取最後兩個字，英文取前兩個字首 */
export function orgInitials(label: string): string {
  const s = label.trim()
  if (!s) return '?'
  if (/[^\u0020-\u024f\s]/.test(s)) return [...s.replace(/\s+/g, '')].slice(-2).join('')
  const words = s.split(/\s+/)
  return (words.length > 1 ? words[0][0] + words[1][0] : s.slice(0, 2)).toUpperCase()
}
