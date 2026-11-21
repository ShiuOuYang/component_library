/**
 * 批號追溯（ChptLotTrace）的圖形計算
 *
 * 資料是「投入 → 產出」的關係：link.from 是被用掉的批號（原料、半成品），link.to 是做出來的批號。
 *   - 往上游（backward）：這個批號用了哪些料 —— 客訴時追原因
 *   - 往下游（forward）：這個批號做成了哪些產品、出給哪些客戶 —— 召回時找範圍
 *
 * 版面：以查詢的批號為第 0 欄，上游往左（-1、-2…）、下游往右（1、2…），同一欄由上往下排；
 * 用「鄰居平均位置」（barycenter）排兩輪，減少連線交叉。
 */

export interface TraceNode {
  id: string
  label: string
  /** 種類（原料、半成品、成品、出貨…），對應 kinds 的顏色與名稱 */
  kind?: string
  /** 狀態：hold（隔離）、suspect（可疑）以外框與標記顯示 */
  status?: 'normal' | 'hold' | 'suspect'
  /** 第二行小字（料號、日期、數量…） */
  sublabel?: string
  [extra: string]: unknown
}

export interface TraceLink {
  /** 投入的批號 */
  from: string
  /** 產出的批號 */
  to: string
  qty?: number
  unit?: string
}

export type TraceDirection = 'backward' | 'forward' | 'both'

function adjacency(links: TraceLink[]) {
  const out = new Map<string, TraceLink[]>()
  const inn = new Map<string, TraceLink[]>()
  for (const l of links) {
    if (!out.has(l.from)) out.set(l.from, [])
    if (!inn.has(l.to)) inn.set(l.to, [])
    out.get(l.from)!.push(l)
    inn.get(l.to)!.push(l)
  }
  return { out, inn }
}

/** 從 start 沿一個方向能到的所有節點與距離（含自己，距離 0）；maxDepth 限制層數 */
function reach(start: string, next: (id: string) => string[], maxDepth = Infinity): Map<string, number> {
  const dist = new Map<string, number>([[start, 0]])
  let frontier = [start]
  for (let d = 1; frontier.length && d <= maxDepth; d++) {
    const nf: string[] = []
    for (const id of frontier)
      for (const n of next(id))
        if (!dist.has(n)) {
          dist.set(n, d)
          nf.push(n)
        }
    frontier = nf
  }
  return dist
}

/** 每個節點在第幾欄：上游為負、下游為正；不在範圍內的節點不會出現 */
export function traceLayers(links: TraceLink[], rootId: string, direction: TraceDirection = 'both', maxDepth = Infinity): Map<string, number> {
  const { out, inn } = adjacency(links)
  const layers = new Map<string, number>([[rootId, 0]])
  if (direction !== 'forward')
    for (const [id, d] of reach(rootId, (x) => (inn.get(x) ?? []).map((l) => l.from), maxDepth)) if (d) layers.set(id, -d)
  if (direction !== 'backward')
    for (const [id, d] of reach(rootId, (x) => (out.get(x) ?? []).map((l) => l.to), maxDepth)) if (d && !layers.has(id)) layers.set(id, d)
  return layers
}

/** 範圍內的連線（兩端都在 layers 裡，而且方向是由左往右） */
export function visibleLinks(links: TraceLink[], layers: Map<string, number>): TraceLink[] {
  return links.filter((l) => layers.has(l.from) && layers.has(l.to) && layers.get(l.from)! < layers.get(l.to)!)
}

export interface TraceLayout {
  /** 每個節點的左上角 */
  pos: Map<string, { x: number; y: number; layer: number; row: number }>
  /** 每一欄由上往下的節點 */
  columns: Map<number, string[]>
  width: number
  height: number
}

export function layoutTrace(
  layers: Map<string, number>,
  links: TraceLink[],
  opts: { nodeWidth: number; nodeHeight: number; colGap: number; rowGap: number; order?: string[] }
): TraceLayout {
  const columns = new Map<number, string[]>()
  // 初始順序：照節點清單的順序（資料通常已經有意義的排序）
  const rank = new Map((opts.order ?? [...layers.keys()]).map((id, i) => [id, i]))
  for (const [id, l] of [...layers].sort((a, b) => (rank.get(a[0]) ?? 1e9) - (rank.get(b[0]) ?? 1e9))) {
    if (!columns.has(l)) columns.set(l, [])
    columns.get(l)!.push(id)
  }
  const keys = [...columns.keys()].sort((a, b) => a - b)
  const neighbors = new Map<string, string[]>()
  for (const l of links) {
    if (!neighbors.has(l.from)) neighbors.set(l.from, [])
    if (!neighbors.has(l.to)) neighbors.set(l.to, [])
    neighbors.get(l.from)!.push(l.to)
    neighbors.get(l.to)!.push(l.from)
  }
  const rowOf = () => {
    const m = new Map<string, number>()
    for (const ids of columns.values()) ids.forEach((id, i) => m.set(id, i))
    return m
  }
  // 由第 0 欄往兩側掃：每一欄依「靠近第 0 欄那一側的鄰居」平均位置排序
  for (let pass = 0; pass < 2; pass++) {
    for (const side of [1, -1]) {
      for (const k of keys.filter((x) => x * side > 0).sort((a, b) => Math.abs(a) - Math.abs(b))) {
        const rows = rowOf()
        const ids = columns.get(k)!
        const bary = (id: string) => {
          const ns = (neighbors.get(id) ?? []).filter((n) => layers.get(n) === k - side)
          return ns.length ? ns.reduce((s, n) => s + rows.get(n)!, 0) / ns.length : rows.get(id)!
        }
        const score = new Map(ids.map((id) => [id, bary(id)]))
        ids.sort((a, b) => score.get(a)! - score.get(b)!)
      }
    }
  }
  const maxRows = Math.max(1, ...[...columns.values()].map((c) => c.length))
  const height = maxRows * opts.nodeHeight + (maxRows - 1) * opts.rowGap
  const pos = new Map<string, { x: number; y: number; layer: number; row: number }>()
  keys.forEach((k, ci) => {
    const ids = columns.get(k)!
    // 每一欄垂直置中
    const colH = ids.length * opts.nodeHeight + (ids.length - 1) * opts.rowGap
    const top = (height - colH) / 2
    ids.forEach((id, r) => pos.set(id, { x: ci * (opts.nodeWidth + opts.colGap), y: top + r * (opts.nodeHeight + opts.rowGap), layer: k, row: r }))
  })
  return { pos, columns, width: keys.length * opts.nodeWidth + (keys.length - 1) * opts.colGap, height }
}

/** 查詢批號與選取批號之間的所有路徑（節點與連線）；沒有關係時為空 */
export function tracePath(links: TraceLink[], rootId: string, selectedId: string): { nodes: Set<string>; links: Set<TraceLink> } {
  const { out, inn } = adjacency(links)
  const down = (id: string) => reach(id, (x) => (out.get(x) ?? []).map((l) => l.to))
  const up = (id: string) => reach(id, (x) => (inn.get(x) ?? []).map((l) => l.from))
  // 選取的是上游：選取 →…→ 查詢；是下游：查詢 →…→ 選取
  const rootUp = up(rootId)
  let nodes = new Set([...down(selectedId).keys()].filter((id) => rootUp.has(id)))
  if (nodes.size < 2) {
    const selUp = up(selectedId)
    nodes = new Set([...down(rootId).keys()].filter((id) => selUp.has(id)))
  }
  if (nodes.size < 2) return { nodes: new Set(selectedId === rootId ? [rootId] : []), links: new Set() }
  return { nodes, links: new Set(links.filter((l) => nodes.has(l.from) && nodes.has(l.to))) }
}

export interface TraceTreeNode {
  /** 樹上的位置（同一個批號可能出現在好幾個分支，key 要唯一） */
  key: string
  label: string
  traceId: string
  /** 這個批號在這條分支上已經出現過（循環資料），不再往下展開 */
  repeat?: boolean
  link?: TraceLink
  children?: TraceTreeNode[]
}

/** 轉成樹（清單檢視用）：上游樹的子節點是投入的料，下游樹的子節點是產出 */
export function traceTree(
  links: TraceLink[],
  rootId: string,
  dir: 'backward' | 'forward',
  labelOf: (id: string) => string,
  maxDepth = Infinity
): TraceTreeNode {
  const { out, inn } = adjacency(links)
  const build = (id: string, path: string[], key: string, link: TraceLink | undefined, depth: number): TraceTreeNode => {
    const node: TraceTreeNode = { key, label: labelOf(id), traceId: id, link }
    if (path.includes(id)) return { ...node, repeat: true }
    const next = dir === 'backward' ? inn.get(id) ?? [] : out.get(id) ?? []
    if (next.length && depth < maxDepth)
      node.children = next.map((l, i) => build(dir === 'backward' ? l.from : l.to, [...path, id], `${key}/${i}`, l, depth + 1))
    return node
  }
  return build(rootId, [], `${dir}:${rootId}`, undefined, 0)
}
