/**
 * 平行座標圖（ParallelCoordinatesChart）的刻度與篩選
 *
 *   - 每個參數一條垂直軸，各自的範圍（不給時依資料，取整）；reverse 讓「越小越好」的軸反過來
 *   - 每一筆資料是一條折線，經過每條軸上自己的值
 *   - 框選（brush）：在軸上框出一段範圍，所有軸的條件都符合的線才算「選到」
 */

import * as d3 from 'd3'

export interface ParallelAxis {
  key: string
  label: string
  unit?: string
  /** 範圍；不給時依資料取整 */
  domain?: [number, number]
  /** 反轉（小的在上面） */
  reverse?: boolean
}

export type ParallelRow = Record<string, unknown>

/** 數值：數字或可轉成數字的字串；null、空字串、其他都不算（Number(null) 是 0，不能直接用） */
export const toNum = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}

/** 每條軸的範圍：[下, 上]（數值） */
export function axisDomains(rows: ParallelRow[], axes: ParallelAxis[]): Record<string, [number, number]> {
  const out: Record<string, [number, number]> = {}
  for (const a of axes) {
    if (a.domain) {
      out[a.key] = a.domain
      continue
    }
    const vals = rows.map((r) => toNum(r[a.key])).filter((n): n is number => n !== null)
    const [lo, hi] = vals.length ? (d3.extent(vals) as [number, number]) : [0, 1]
    const pad = lo === hi ? Math.abs(lo) * 0.1 || 1 : 0
    out[a.key] = d3
      .scaleLinear()
      .domain([lo - pad, hi + pad])
      .nice()
      .domain() as [number, number]
  }
  return out
}

/** 值在軸上的比例：0 = 底、1 = 頂（reverse 時相反）；非數值回傳 null */
export function axisRatio(v: unknown, domain: [number, number], reverse = false): number | null {
  const n = toNum(v)
  if (n === null) return null
  const [lo, hi] = domain
  const r = hi === lo ? 0.5 : (n - lo) / (hi - lo)
  return reverse ? 1 - r : r
}

export type Brushes = Record<string, [number, number]>

/** 這一筆是否符合所有框選（沒有值的軸不符合） */
export function passesBrushes(row: ParallelRow, brushes: Brushes): boolean {
  for (const [key, [a, b]] of Object.entries(brushes)) {
    const n = toNum(row[key])
    if (n === null || n < Math.min(a, b) || n > Math.max(a, b)) return false
  }
  return true
}

/** 軸換位置：把 from 移到 to（不改原陣列） */
export function moveAxis(order: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || from >= order.length) return order
  const next = [...order]
  const [x] = next.splice(from, 1)
  next.splice(Math.max(0, Math.min(next.length, to)), 0, x)
  return next
}

/** 拖曳軸到 x（像素）時應該排到第幾個：依其他軸的位置 */
export function indexAtX(x: number, positions: number[]): number {
  let i = 0
  while (i < positions.length && x > positions[i]) i++
  return i
}
