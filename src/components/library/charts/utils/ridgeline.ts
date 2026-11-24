/**
 * 山脊圖（RidgelineChart）的計算：每組的統計、在共用 X 格點上的核密度、排序、規格外比例。
 * 四分位數與 Silverman 頻寬沿用箱型圖（boxPlot.ts）。
 */
import { boxStats, silvermanBandwidth, type BoxStats, type QuartileMethod } from './boxPlot'

export interface RidgelineSeries {
  name: string
  values: readonly (number | null | undefined)[]
  color?: string
}

export interface RidgelineSpec {
  lsl?: number | null
  usl?: number | null
  target?: number | null
}

export type RidgelineSort = 'none' | 'median' | 'mean' | 'sd' | 'name'

export interface RidgelineGroup {
  name: string
  color?: string
  /** 原本的位置 */
  index: number
  /** 由小到大排序的有效數值 */
  sorted: number[]
  stats: BoxStats | null
  bandwidth: number
  /** 與格點對應的密度 */
  density: number[]
  /** 密度最大值 */
  peak: number
  /** 低於 LSL / 高於 USL 的比例（沒有規格時為 null） */
  belowLsl: number | null
  aboveUsl: number | null
}

/** 有效數值（濾掉 null、NaN、Infinity）並排序 */
export function cleanValues(values: readonly (number | null | undefined)[]): number[] {
  return values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b)
}

/** 頻寬：數字直接用；silverman / scott 依資料；資料全相同時退回範圍的 1/20（再不行用 1） */
export function ridgeBandwidth(stats: BoxStats | null, method: number | 'silverman' | 'scott', fallbackSpan: number): number {
  if (typeof method === 'number') return method > 0 ? method : 1
  let bw = 0
  if (stats) bw = method === 'scott' ? 1.06 * stats.sd * Math.pow(stats.n, -0.2) : silvermanBandwidth(stats)
  if (bw > 0) return bw
  return fallbackSpan > 0 ? fallbackSpan / 20 : 1
}

/** 在等距格點上的高斯核密度（只加總 4 個頻寬以內的資料） */
export function densityOnGrid(sorted: readonly number[], bandwidth: number, grid: readonly number[]): number[] {
  const n = sorted.length
  if (!n || !(bandwidth > 0)) return grid.map(() => 0)
  const norm = 1 / (n * bandwidth * Math.sqrt(2 * Math.PI))
  const reach = 4 * bandwidth
  let start = 0
  return grid.map((x) => {
    while (start < n && sorted[start] < x - reach) start++
    let sum = 0
    for (let j = start; j < n && sorted[j] <= x + reach; j++) {
      const u = (x - sorted[j]) / bandwidth
      sum += Math.exp(-0.5 * u * u)
    }
    return sum * norm
  })
}

/** 從 lo 到 hi 的 count 個等距點 */
export function linearGrid(lo: number, hi: number, count: number): number[] {
  const n = Math.max(2, Math.round(count))
  if (!(hi > lo)) return Array.from({ length: n }, () => lo)
  return Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1))
}

/** 規格外比例 */
export function outOfSpec(sorted: readonly number[], spec: RidgelineSpec): { below: number | null; above: number | null } {
  const n = sorted.length
  const lsl = spec.lsl ?? null
  const usl = spec.usl ?? null
  return {
    below: lsl === null || !n ? null : sorted.filter((v) => v < lsl).length / n,
    above: usl === null || !n ? null : sorted.filter((v) => v > usl).length / n,
  }
}

/** 全部資料（與規格線）的範圍，左右各多 pad 個頻寬讓曲線收尾 */
export function ridgelineDomain(groups: readonly { sorted: number[]; bandwidth: number }[], spec: RidgelineSpec = {}, pad = 2): [number, number] {
  let lo = Infinity
  let hi = -Infinity
  let bw = 0
  for (const g of groups) {
    if (!g.sorted.length) continue
    lo = Math.min(lo, g.sorted[0])
    hi = Math.max(hi, g.sorted[g.sorted.length - 1])
    bw = Math.max(bw, g.bandwidth)
  }
  for (const v of [spec.lsl, spec.usl, spec.target]) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      lo = Math.min(lo, v)
      hi = Math.max(hi, v)
    }
  }
  if (lo === Infinity) return [0, 1]
  if (lo === hi) return [lo - 1, hi + 1]
  return [lo - pad * bw, hi + pad * bw]
}

export interface RidgelineOptions {
  bandwidth?: number | 'silverman' | 'scott'
  /** 格點數 */
  resolution?: number
  domain?: [number, number] | null
  spec?: RidgelineSpec
  method?: QuartileMethod
}

/** 每組的統計與密度（共用同一組格點） */
export function ridgelineGroups(series: readonly RidgelineSeries[], o: RidgelineOptions = {}): { groups: RidgelineGroup[]; grid: number[]; domain: [number, number] } {
  const spec = o.spec ?? {}
  const prepared = series.map((s, index) => {
    const sorted = cleanValues(s.values)
    const stats = boxStats(sorted, { method: o.method })
    const span = sorted.length ? sorted[sorted.length - 1] - sorted[0] : 0
    return { name: s.name, color: s.color, index, sorted, stats, bandwidth: ridgeBandwidth(stats, o.bandwidth ?? 'silverman', span) }
  })
  const domain = o.domain ?? ridgelineDomain(prepared, spec)
  const grid = linearGrid(domain[0], domain[1], o.resolution ?? 120)
  const groups = prepared.map((p) => {
    const density = densityOnGrid(p.sorted, p.bandwidth, grid)
    const { below, above } = outOfSpec(p.sorted, spec)
    return { ...p, density, peak: Math.max(0, ...density), belowLsl: below, aboveUsl: above }
  })
  return { groups, grid, domain }
}

/** 排序：median / mean / sd 依數值（預設由大到小）、name 依名稱；沒有資料的組在最後 */
export function sortRidgelineGroups(groups: readonly RidgelineGroup[], sort: RidgelineSort, descending = true): RidgelineGroup[] {
  if (sort === 'none') return [...groups]
  if (sort === 'name') {
    const out = [...groups].sort((a, b) => a.name.localeCompare(b.name) || a.index - b.index)
    return descending ? out : out.reverse()
  }
  return [...groups].sort((a, b) => {
    if (!a.stats || !b.stats) return a.stats === b.stats ? a.index - b.index : a.stats ? -1 : 1
    const ka = a.stats[sort]
    const kb = b.stats[sort]
    return (descending ? kb - ka : ka - kb) || a.index - b.index
  })
}
