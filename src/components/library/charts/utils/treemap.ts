/**
 * 矩形樹圖（TreemapChart）的版面、鑽取與配色
 *
 *   - 樹狀資料：葉節點給 value，群組的值是子節點加總（群組自己給的 value 會被忽略）
 *   - 一次只畫「目前所在節點」底下的一（或兩）層；點有子節點的方塊往下鑽，麵包屑回上層
 *   - 顏色：依分組（每個第一層節點一個類別色）或依指標（metric，例如不良率）的連續色階
 *     色階用 CSS color-mix 在主題色之間混色，亮色 / 暗色主題都不用另外算
 */

import * as d3 from 'd3'

export interface TreemapNode {
  /** 識別碼；不給時用 name（同一層的 name 要不重複） */
  id?: string
  name: string
  /** 葉節點的大小（面積）；群組自動加總 */
  value?: number
  /** 上色用的指標（colorBy='metric'），例如不良率；群組不給時用子節點依 value 加權平均 */
  metric?: number
  /** 指定顏色（任何 CSS 顏色） */
  color?: string
  children?: TreemapNode[]
}

export const nodeKey = (n: TreemapNode) => n.id ?? n.name

/** 建立 d3 階層：值加總、依值由大到小排序；負值與非有限值當 0 */
export function buildHierarchy(root: TreemapNode): d3.HierarchyNode<TreemapNode> {
  return d3
    .hierarchy(root, (d) => d.children)
    .sum((d) => (d.children?.length ? 0 : Number.isFinite(d.value) && (d.value as number) > 0 ? (d.value as number) : 0))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
}

/** 依路徑（每層的 key）找到節點；找不到的部分停在最深的那一層 */
export function findByPath(root: d3.HierarchyNode<TreemapNode>, path: string[]): d3.HierarchyNode<TreemapNode> {
  let cur = root
  for (const k of path) {
    const next = cur.children?.find((c) => nodeKey(c.data) === k)
    if (!next) break
    cur = next
  }
  return cur
}

/** 節點的路徑（不含根） */
export const pathOf = (n: d3.HierarchyNode<TreemapNode>): string[] => n.ancestors().reverse().slice(1).map((a) => nodeKey(a.data))

/** 指標：自己有就用自己的；群組用葉節點依 value 加權平均（沒有任何葉節點有指標時為 null） */
export function metricOf(n: d3.HierarchyNode<TreemapNode>): number | null {
  if (Number.isFinite(n.data.metric)) return n.data.metric as number
  if (!n.children?.length) return null
  let sum = 0
  let weight = 0
  for (const leaf of n.leaves()) {
    const m = leaf.data.metric
    const w = leaf.value ?? 0
    if (Number.isFinite(m) && w > 0) {
      sum += (m as number) * w
      weight += w
    }
  }
  return weight > 0 ? sum / weight : null
}

export interface TreemapTile {
  node: d3.HierarchyNode<TreemapNode>
  key: string
  /** 相對於目前節點的深度（1 = 直接子節點） */
  depth: number
  x0: number
  y0: number
  x1: number
  y1: number
}

/**
 * 版面：focus 底下 levels 層。兩層時第一層留出 headerHeight 的標題列。
 * 回傳的方塊依「先畫第一層、再畫第二層」排序（第二層畫在上面）。
 */
export function layoutTreemap(
  focus: d3.HierarchyNode<TreemapNode>,
  width: number,
  height: number,
  opts: { levels?: 1 | 2; padding?: number; headerHeight?: number } = {}
): TreemapTile[] {
  const levels = opts.levels ?? 1
  const padding = opts.padding ?? 2
  const header = opts.headerHeight ?? 18
  // 另建一個只到 levels 層的階層來排版：節點包著原本的節點（事件、鑽取要用原本的）
  interface LayoutNode {
    src: d3.HierarchyNode<TreemapNode>
    children?: LayoutNode[]
  }
  const wrap = (n: d3.HierarchyNode<TreemapNode>, depth: number): LayoutNode => ({
    src: n,
    children: depth < levels && n.children?.length ? n.children.map((c) => wrap(c, depth + 1)) : undefined,
  })
  const h = d3
    .hierarchy<LayoutNode>(wrap(focus, 0), (d) => d.children)
    // 排版上的葉節點可能是原本的群組（第二層以下被摺起來）：用原本加總好的值
    .sum((d) => (d.children ? 0 : d.src.value ?? 0))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
  const laid = d3
    .treemap<LayoutNode>()
    .size([Math.max(1, width), Math.max(1, height)])
    .tile(d3.treemapSquarify.ratio(1))
    .paddingInner(padding)
    .paddingTop((n) => (levels === 2 && n.depth === 1 ? header : 0))
    .paddingRight((n) => (levels === 2 && n.depth === 1 ? padding : 0))
    .paddingBottom((n) => (levels === 2 && n.depth === 1 ? padding : 0))
    .paddingLeft((n) => (levels === 2 && n.depth === 1 ? padding : 0))
    .round(true)(h)
  const out: TreemapTile[] = []
  laid.each((n) => {
    if (n.depth === 0 || (n.value ?? 0) <= 0) return
    const node = n.data.src
    out.push({ node, key: pathOf(node).join('/'), depth: n.depth, x0: n.x0, y0: n.y0, x1: n.x1, y1: n.y1 })
  })
  return out.sort((a, b) => a.depth - b.depth)
}

/** 指標換成 0–1：sequential 依 [min, max]；diverging 依 [min, center, max] 換成 −1–1 */
export function metricRatio(v: number, domain: [number, number], center: number | null): number {
  const [lo, hi] = domain
  if (center === null) return hi === lo ? 1 : Math.min(1, Math.max(0, (v - lo) / (hi - lo)))
  if (v >= center) return hi === center ? 0 : Math.min(1, (v - center) / (hi - center))
  return lo === center ? 0 : -Math.min(1, (center - v) / (center - lo))
}

/**
 * 依比例混色（CSS color-mix）：
 *   sequential：底色 → high（至少 12%，最低值也看得出不是空白）
 *   diverging：負的往 low、正的往 high，中間是底色
 */
export function metricColor(ratio: number, colors: { low: string; high: string; base: string }, diverging: boolean): string {
  if (!diverging) return `color-mix(in srgb, ${colors.high} ${Math.round(12 + ratio * 88)}%, ${colors.base})`
  const target = ratio < 0 ? colors.low : colors.high
  return `color-mix(in srgb, ${target} ${Math.round(Math.abs(ratio) * 85)}%, ${colors.base})`
}

/** 方塊放得下哪些文字：名稱 + 數值、只有名稱、都放不下 */
export function labelFit(w: number, h: number, name: string, valueText: string, fontSize = 12): 'full' | 'name' | 'none' {
  const width = (s: string) => [...s].reduce((sum, ch) => sum + (ch.charCodeAt(0) > 255 ? fontSize : fontSize * 0.58), 0)
  if (w < 24 || h < fontSize + 6) return 'none'
  const nameFits = width(name) <= w - 8
  if (nameFits && h >= fontSize * 2 + 12 && width(valueText) <= w - 8) return 'full'
  return nameFits ? 'name' : 'none'
}
