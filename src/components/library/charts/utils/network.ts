/**
 * 關係圖（NetworkGraph）的資料整理與力導向版面。
 *
 * - buildNetwork：整理節點與連線（重複的連線合併權重、端點不存在或自己連自己的略過並回報），算出度數與鄰居
 * - createNetworkSimulation：d3-force 模擬（連線拉近、節點互斥、群組聚集、不重疊）；初始位置用向日葵排列，
 *   不用亂數 —— 同樣的資料每次排出來都一樣
 * - shortestPath：兩個節點之間最少跳數的路徑（不看方向）
 */
import * as d3 from 'd3'

export interface NetworkNodeInput {
  id: string
  label?: string
  /** 群組（同群組同色、會聚在一起） */
  group?: string
  /** 數值（決定節點大小） */
  value?: number
  color?: string
}

export interface NetworkLinkInput {
  source: string
  target: string
  /** 權重（決定線寬、越大拉得越近）；預設 1 */
  value?: number
}

export interface NetworkNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  group: string | null
  value: number
  color?: string
  index: number
  degree: number
  /** 連線權重總和 */
  strength: number
  x: number
  y: number
}

export interface NetworkLink extends d3.SimulationLinkDatum<NetworkNode> {
  source: NetworkNode
  target: NetworkNode
  value: number
  index: number
}

export interface NetworkGraphData {
  nodes: NetworkNode[]
  links: NetworkLink[]
  byId: Map<string, NetworkNode>
  /** 每個節點的鄰居 id */
  neighbors: Map<string, Set<string>>
  /** 每個節點連到的連線 */
  incident: Map<string, NetworkLink[]>
  groups: string[]
  /** 端點不存在、自己連自己而略過的連線 */
  dropped: NetworkLinkInput[]
}

export function buildNetwork(nodes: readonly NetworkNodeInput[], links: readonly NetworkLinkInput[], directed = false): NetworkGraphData {
  const byId = new Map<string, NetworkNode>()
  const groups: string[] = []
  for (const n of nodes) {
    if (byId.has(n.id)) continue
    const group = n.group ?? null
    if (group !== null && !groups.includes(group)) groups.push(group)
    byId.set(n.id, {
      id: n.id,
      label: n.label ?? n.id,
      group,
      value: Number.isFinite(n.value) ? Math.max(0, n.value!) : 1,
      color: n.color,
      index: byId.size,
      degree: 0,
      strength: 0,
      x: 0,
      y: 0,
    })
  }
  const dropped: NetworkLinkInput[] = []
  const merged = new Map<string, NetworkLink>()
  for (const l of links) {
    const s = byId.get(l.source)
    const t = byId.get(l.target)
    if (!s || !t || s === t) {
      dropped.push(l)
      continue
    }
    const v = Number.isFinite(l.value) ? Math.max(0, l.value!) : 1
    const key = directed || s.index < t.index ? `${s.id}\u0000${t.id}` : `${t.id}\u0000${s.id}`
    const ex = merged.get(key)
    if (ex) ex.value += v
    else merged.set(key, { source: s, target: t, value: v, index: merged.size })
  }
  const neighbors = new Map<string, Set<string>>([...byId.keys()].map((id) => [id, new Set<string>()]))
  const incident = new Map<string, NetworkLink[]>([...byId.keys()].map((id) => [id, []]))
  const outLinks = [...merged.values()]
  for (const l of outLinks) {
    neighbors.get(l.source.id)!.add(l.target.id)
    neighbors.get(l.target.id)!.add(l.source.id)
    incident.get(l.source.id)!.push(l)
    incident.get(l.target.id)!.push(l)
    l.source.strength += l.value
    l.target.strength += l.value
  }
  for (const n of byId.values()) n.degree = neighbors.get(n.id)!.size
  return { nodes: [...byId.values()], links: outLinks, byId, neighbors, incident, groups, dropped }
}

export interface NetworkLayoutOptions {
  width: number
  height: number
  /** 節點半徑 */
  radius: (n: NetworkNode) => number
  /** 連線基本長度 */
  linkDistance?: number
  /** 互斥力（負值，預設 -180） */
  charge?: number
  /** 同群組聚集的力道（0 不聚集） */
  groupPull?: number
}

/** 群組的聚集中心：沿著一個圓排開 */
export function groupCenters(groups: readonly string[], width: number, height: number): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>()
  const r = Math.min(width, height) * 0.28
  groups.forEach((g, i) => {
    const a = (i / groups.length) * Math.PI * 2 - Math.PI / 2
    out.set(g, groups.length === 1 ? { x: width / 2, y: height / 2 } : { x: width / 2 + r * Math.cos(a), y: height / 2 + r * Math.sin(a) })
  })
  return out
}

/**
 * 建立（停住的）力導向模擬並放好初始位置；呼叫端用 sim.tick(n) 同步跑完，拖曳時再小量 tick。
 */
export function createNetworkSimulation(data: NetworkGraphData, o: NetworkLayoutOptions): d3.Simulation<NetworkNode, NetworkLink> {
  const { width, height } = o
  const centers = groupCenters(data.groups, width, height)
  // 寬的畫面讓水平方向拉得鬆一點（排出來接近畫面比例）
  const aspect = Math.max(0.5, Math.min(2.5, width / Math.max(1, height)))
  // 向日葵排列：決定性的初始位置
  const golden = Math.PI * (3 - Math.sqrt(5))
  const spread = Math.min(width, height) / 2.5 / Math.sqrt(Math.max(1, data.nodes.length))
  data.nodes.forEach((n, i) => {
    const c = (n.group !== null && centers.get(n.group)) || { x: width / 2, y: height / 2 }
    const r = spread * Math.sqrt(i + 0.5)
    n.x = c.x + r * Math.cos(i * golden) * Math.sqrt(aspect)
    n.y = c.y + r * Math.sin(i * golden)
    n.vx = 0
    n.vy = 0
  })
  const maxW = d3.max(data.links, (l) => l.value) ?? 1
  const base = o.linkDistance ?? 60
  const pull = o.groupPull ?? 0.08
  const sim = d3
    .forceSimulation<NetworkNode, NetworkLink>(data.nodes)
    .stop()
    .force(
      'link',
      d3
        .forceLink<NetworkNode, NetworkLink>(data.links)
        .id((n) => n.id)
        // 權重越大越近；兩端節點越大越遠
        .distance((l) => base * (1.25 - 0.5 * (l.value / maxW)) + o.radius(l.source) + o.radius(l.target))
    )
    .force('charge', d3.forceManyBody<NetworkNode>().strength(o.charge ?? -180))
    .force('collide', d3.forceCollide<NetworkNode>((n) => o.radius(n) + 8))
    .force('x', d3.forceX<NetworkNode>((n) => (n.group !== null ? centers.get(n.group)!.x : width / 2)).strength(pull / aspect))
    .force('y', d3.forceY<NetworkNode>((n) => (n.group !== null ? centers.get(n.group)!.y : height / 2)).strength(pull * aspect))
  return sim
}

/** 所有節點的外框（含半徑） */
export function networkBounds(nodes: readonly NetworkNode[], radius: (n: NetworkNode) => number): { x0: number; y0: number; x1: number; y1: number } | null {
  if (!nodes.length) return null
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const n of nodes) {
    const r = radius(n)
    x0 = Math.min(x0, n.x - r)
    y0 = Math.min(y0, n.y - r)
    x1 = Math.max(x1, n.x + r)
    y1 = Math.max(y1, n.y + r)
  }
  return { x0, y0, x1, y1 }
}

/** 讓外框剛好放進 width × height（留 padding）的縮放與位移；最多放大到 maxScale */
export function fitTransform(
  b: { x0: number; y0: number; x1: number; y1: number } | null,
  width: number,
  height: number,
  padding = 24,
  maxScale = 2
): { k: number; x: number; y: number } {
  if (!b) return { k: 1, x: 0, y: 0 }
  const w = Math.max(1, b.x1 - b.x0)
  const h = Math.max(1, b.y1 - b.y0)
  const k = Math.min(maxScale, Math.max(0.05, Math.min((width - padding * 2) / w, (height - padding * 2) / h)))
  return { k, x: width / 2 - k * (b.x0 + w / 2), y: height / 2 - k * (b.y0 + h / 2) }
}

/** 兩點之間最少跳數的路徑（節點 id 陣列，含頭尾）；不連通回傳 null */
export function shortestPath(data: NetworkGraphData, from: string, to: string): string[] | null {
  if (!data.byId.has(from) || !data.byId.has(to)) return null
  if (from === to) return [from]
  const prev = new Map<string, string>([[from, from]])
  const queue = [from]
  while (queue.length) {
    const cur = queue.shift()!
    for (const nb of data.neighbors.get(cur)!) {
      if (prev.has(nb)) continue
      prev.set(nb, cur)
      if (nb === to) {
        const path = [to]
        let p = to
        while (p !== from) {
          p = prev.get(p)!
          path.unshift(p)
        }
        return path
      }
      queue.push(nb)
    }
  }
  return null
}

/** 從 (x1,y1) 指向 (x2,y2) 的線段，兩端各縮短 r1 / r2（畫箭頭不要被節點蓋住） */
export function trimSegment(x1: number, y1: number, x2: number, y2: number, r1: number, r2: number): [number, number, number, number] {
  const dx = x2 - x1
  const dy = y2 - y1
  const d = Math.hypot(dx, dy)
  if (d < r1 + r2 + 1e-6) return [x1, y1, x2, y2]
  const ux = dx / d
  const uy = dy / d
  return [x1 + ux * r1, y1 + uy * r1, x2 - ux * r2, y2 - uy * r2]
}
