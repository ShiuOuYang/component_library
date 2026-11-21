/**
 * 流向圖（SankeyChart）的版面計算
 *
 * 不引入 d3-sankey（多一個相依只為了一個圖）：自己算，步驟與 d3-sankey 相同 ——
 *   1. 欄：從「沒有流入的節點」開始的最長路徑（justify 時沒有流出的節點推到最後一欄）
 *   2. 節點高度：max(流入總量, 流出總量) × 比例；比例取「最擠的那一欄剛好放得下」
 *   3. 垂直位置：先依資料順序堆疊，再來回幾輪「往相連節點的加權中心靠」，每輪後解開重疊
 *   4. 連線：在節點上依對面節點的高低排列，從上往下分配起點 / 終點
 *
 * 有循環的連線（A → B → A）無法畫成由左往右的流向，會被略過（cycles 回傳被略過的連線）。
 */

export interface SankeyNodeInput {
  id: string
  label?: string
  color?: string
}

export interface SankeyLinkInput {
  source: string
  target: string
  value: number
}

export interface SankeyNode {
  id: string
  label: string
  color?: string
  index: number
  column: number
  value: number
  x0: number
  x1: number
  y0: number
  y1: number
  /** 流入 / 流出的連線（已排好上下順序） */
  incoming: SankeyLink[]
  outgoing: SankeyLink[]
}

export interface SankeyLink {
  source: SankeyNode
  target: SankeyNode
  value: number
  /** 線寬（px） */
  width: number
  /** 在來源節點右側、目標節點左側的中心 y */
  y0: number
  y1: number
  index: number
}

export interface SankeyLayout {
  nodes: SankeyNode[]
  links: SankeyLink[]
  columns: number
  /** 因為形成循環而略過的連線 */
  cycles: SankeyLinkInput[]
}

export interface SankeyOptions {
  width: number
  height: number
  nodeWidth?: number
  nodePadding?: number
  /** justify：沒有流出的節點放最後一欄；left：每個節點放在最早的欄 */
  align?: 'justify' | 'left'
  iterations?: number
}

export function sankeyLayout(nodesIn: SankeyNodeInput[], linksIn: SankeyLinkInput[], opts: SankeyOptions): SankeyLayout {
  const nodeWidth = opts.nodeWidth ?? 14
  const padding = opts.nodePadding ?? 14
  const iterations = opts.iterations ?? 6

  // 連線裡出現、但 nodes 沒列的節點也要有（用 id 當名稱）
  const order: SankeyNodeInput[] = [...nodesIn]
  for (const l of linksIn) for (const id of [l.source, l.target]) if (!order.some((n) => n.id === id)) order.push({ id })
  const nodes: SankeyNode[] = order.map((n, index) => ({
    id: n.id,
    label: n.label ?? n.id,
    color: n.color,
    index,
    column: 0,
    value: 0,
    x0: 0,
    x1: 0,
    y0: 0,
    y1: 0,
    incoming: [],
    outgoing: [],
  }))
  const byId = new Map(nodes.map((n) => [n.id, n]))

  // 略過會形成循環的連線：依序加入，加入前檢查 target 是否已能走到 source
  const reaches = (from: SankeyNode, to: SankeyNode): boolean => {
    const seen = new Set<SankeyNode>()
    const stack = [from]
    while (stack.length) {
      const n = stack.pop()!
      if (n === to) return true
      if (seen.has(n)) continue
      seen.add(n)
      for (const l of n.outgoing) stack.push(l.target)
    }
    return false
  }
  const links: SankeyLink[] = []
  const cycles: SankeyLinkInput[] = []
  for (const l of linksIn) {
    const s = byId.get(l.source)!
    const t = byId.get(l.target)!
    if (!(l.value > 0)) continue
    if (s === t || reaches(t, s)) {
      cycles.push(l)
      continue
    }
    const link: SankeyLink = { source: s, target: t, value: l.value, width: 0, y0: 0, y1: 0, index: links.length }
    links.push(link)
    s.outgoing.push(link)
    t.incoming.push(link)
  }

  // 1. 欄：最長路徑（DAG 的拓撲順序）
  const indeg = new Map(nodes.map((n) => [n, n.incoming.length]))
  const queue = nodes.filter((n) => !n.incoming.length)
  while (queue.length) {
    const n = queue.shift()!
    for (const l of n.outgoing) {
      l.target.column = Math.max(l.target.column, n.column + 1)
      indeg.set(l.target, indeg.get(l.target)! - 1)
      if (!indeg.get(l.target)) queue.push(l.target)
    }
  }
  const columns = nodes.length ? Math.max(...nodes.map((n) => n.column)) + 1 : 0
  if (opts.align !== 'left') for (const n of nodes) if (!n.outgoing.length && n.incoming.length) n.column = columns - 1

  // 2. 節點值與比例
  const sum = (ls: SankeyLink[]) => ls.reduce((s, l) => s + l.value, 0)
  for (const n of nodes) n.value = Math.max(sum(n.incoming), sum(n.outgoing))
  const cols: SankeyNode[][] = Array.from({ length: columns }, () => [])
  for (const n of nodes) cols[n.column].push(n)
  const ky = Math.min(
    ...cols.filter((c) => c.length).map((c) => (opts.height - (c.length - 1) * padding) / Math.max(1e-9, c.reduce((s, n) => s + n.value, 0)))
  )
  const scale = Number.isFinite(ky) && ky > 0 ? ky : 0
  const step = columns > 1 ? (opts.width - nodeWidth) / (columns - 1) : 0
  for (const n of nodes) {
    n.x0 = n.column * step
    n.x1 = n.x0 + nodeWidth
  }
  for (const l of links) l.width = l.value * scale

  // 3. 垂直位置
  for (const c of cols) {
    let y = 0
    for (const n of c) {
      n.y0 = y
      n.y1 = y + n.value * scale
      y = n.y1 + padding
    }
    // 整欄置中
    const shift = (opts.height - (y - padding)) / 2
    for (const n of c) {
      n.y0 += shift
      n.y1 += shift
    }
  }
  const center = (n: SankeyNode) => (n.y0 + n.y1) / 2
  const relax = (c: SankeyNode[], alpha: number, dir: 'in' | 'out') => {
    for (const n of c) {
      const ls = dir === 'in' ? n.incoming : n.outgoing
      if (!ls.length) continue
      const w = sum(ls)
      const target = ls.reduce((s, l) => s + center(dir === 'in' ? l.source : l.target) * l.value, 0) / w
      const dy = (target - center(n)) * alpha
      n.y0 += dy
      n.y1 += dy
    }
  }
  const resolve = (c: SankeyNode[]) => {
    c.sort((a, b) => a.y0 - b.y0 || a.index - b.index)
    // 往下推開重疊，最後一個超出底部時再往上推
    let y = 0
    for (const n of c) {
      const dy = y - n.y0
      if (dy > 0) {
        n.y0 += dy
        n.y1 += dy
      }
      y = n.y1 + padding
    }
    let bottom = opts.height
    for (let i = c.length - 1; i >= 0; i--) {
      const n = c[i]
      const dy = n.y1 - bottom
      if (dy > 0) {
        n.y0 -= dy
        n.y1 -= dy
      }
      bottom = n.y0 - padding
    }
  }
  for (let i = 0; i < iterations; i++) {
    const alpha = Math.pow(0.99, i)
    for (const c of cols.slice(1)) {
      relax(c, alpha, 'in')
      resolve(c)
    }
    for (const c of cols.slice(0, -1).reverse()) {
      relax(c, alpha, 'out')
      resolve(c)
    }
  }

  // 4. 連線在節點上的位置：依對面節點的高低排序，避免同一個節點上的線互相交叉
  for (const n of nodes) {
    n.outgoing.sort((a, b) => a.target.y0 - b.target.y0 || a.index - b.index)
    n.incoming.sort((a, b) => a.source.y0 - b.source.y0 || a.index - b.index)
    let y = n.y0
    for (const l of n.outgoing) {
      l.y0 = y + l.width / 2
      y += l.width
    }
    y = n.y0
    for (const l of n.incoming) {
      l.y1 = y + l.width / 2
      y += l.width
    }
  }

  return { nodes, links, columns, cycles }
}

/** 連線的路徑（中心線，搭配 stroke-width = link.width 畫成帶狀） */
export function sankeyLinkPath(l: SankeyLink): string {
  const x0 = l.source.x1
  const x1 = l.target.x0
  const mx = (x0 + x1) / 2
  return `M${x0},${l.y0}C${mx},${l.y0} ${mx},${l.y1} ${x1},${l.y1}`
}
