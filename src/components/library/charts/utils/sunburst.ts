/**
 * 旭日圖（SunburstChart）的版面：從目前節點往外畫幾圈，角度依數值分配。資料格式與 TreemapChart 相同。
 */
import type * as d3 from 'd3'
import { pathOf, type TreemapNode } from './treemap'

export interface SunburstArc {
  node: d3.HierarchyNode<TreemapNode>
  /** 路徑字串（唯一） */
  key: string
  /** 相對於目前節點的深度（1 = 最內圈） */
  depth: number
  a0: number
  a1: number
  r0: number
  r1: number
  /** 最內圈祖先（決定顏色） */
  top: d3.HierarchyNode<TreemapNode>
}

/**
 * 從 focus 往外畫 levels 圈。
 * innerRatio：中心圓佔半徑的比例；中心圓放目前節點的名稱與合計。
 */
export function layoutSunburst(
  focus: d3.HierarchyNode<TreemapNode>,
  radius: number,
  levels: number,
  innerRatio = 0.24
): { arcs: SunburstArc[]; inner: number; ring: number } {
  const inner = radius * innerRatio
  const ring = levels > 0 ? (radius - inner) / levels : 0
  const arcs: SunburstArc[] = []
  const walk = (node: d3.HierarchyNode<TreemapNode>, a0: number, a1: number, depth: number, top: d3.HierarchyNode<TreemapNode> | null) => {
    const kids = node.children ?? []
    const total = node.value ?? 0
    if (depth > levels || !kids.length || total <= 0) return
    let a = a0
    for (const c of kids) {
      const span = ((c.value ?? 0) / total) * (a1 - a0)
      if (span <= 0) continue
      const t = top ?? c
      arcs.push({ node: c, key: pathOf(c).join('/'), depth, a0: a, a1: a + span, r0: inner + (depth - 1) * ring, r1: inner + depth * ring, top: t })
      walk(c, a, a + span, depth + 1, t)
      a += span
    }
  }
  walk(focus, 0, 2 * Math.PI, 1, null)
  return { arcs, inner, ring }
}

/** 弧中心點（角度 0 在正上方、順時針） */
export function arcCentroid(a: Pick<SunburstArc, 'a0' | 'a1' | 'r0' | 'r1'>): [number, number] {
  const ang = (a.a0 + a.a1) / 2
  const r = (a.r0 + a.r1) / 2
  return [Math.sin(ang) * r, -Math.cos(ang) * r]
}

/**
 * 弧上的文字：沿半徑方向擺放（左半邊翻轉，字不會倒過來）。
 * 放不下（徑向長度不夠、或弧太窄放不下一行字）時回傳 null。
 */
export function arcLabel(
  a: Pick<SunburstArc, 'a0' | 'a1' | 'r0' | 'r1'>,
  textWidth: number,
  fontSize = 11
): { x: number; y: number; rotate: number } | null {
  const radial = a.r1 - a.r0 - 6
  const mid = (a.r0 + a.r1) / 2
  const arcLen = (a.a1 - a.a0) * mid
  if (textWidth > radial || arcLen < fontSize + 2) return null
  const [x, y] = arcCentroid(a)
  const deg = (((a.a0 + a.a1) / 2) * 180) / Math.PI
  // 角度 0 在上方：文字方向沿半徑 → 旋轉 deg − 90；左半邊（180–360）再轉 180 度
  const rotate = deg < 180 ? deg - 90 : deg + 90
  return { x, y, rotate }
}

/** 依角度找同一圈的上一個 / 下一個弧（循環） */
export function siblingArc(arcs: readonly SunburstArc[], cur: SunburstArc, dir: 1 | -1): SunburstArc {
  const ring = arcs.filter((a) => a.depth === cur.depth).sort((p, q) => p.a0 - q.a0)
  const i = ring.indexOf(cur)
  return ring[(i + dir + ring.length) % ring.length]
}

