/**
 * 地平線圖（HorizonChart）的計算。
 *
 * 每條序列畫在一列很矮的高度裡：數值減掉基準線（0、平均或設定值）後，
 * 正的一邊、負的一邊各自切成 bands 層，每層摺疊到同一列、顏色一層比一層深 ——
 * 同樣的高度能看出比一般折線圖大好幾倍的變化。
 */

export type HorizonTime = number | string | Date

export interface HorizonPointInput {
  t: HorizonTime
  v: number | null | undefined
}

export interface HorizonSeriesInput {
  name: string
  data: readonly HorizonPointInput[]
  /** 基準線（設定值）；不給時用圖表的 baseline */
  baseline?: number
  unit?: string
}

export interface HorizonPoint {
  t: number
  v: number | null
  /** v − baseline */
  d: number | null
}

export interface HorizonStats {
  min: number
  max: number
  mean: number
  last: number | null
  /** 偏離基準線的最大絕對值 */
  maxAbs: number
  /** 有效筆數 */
  n: number
}

export interface HorizonRow {
  name: string
  unit?: string
  index: number
  baseline: number
  points: HorizonPoint[]
  stats: HorizonStats | null
}

export const toTime = (t: HorizonTime): number => (t instanceof Date ? t.getTime() : typeof t === 'number' ? t : Date.parse(t))

/** 整理序列：時間排序、基準線、統計；baseline 為 'mean' 時每條用自己的平均 */
export function horizonRows(series: readonly HorizonSeriesInput[], baseline: number | 'mean' = 0): HorizonRow[] {
  return series.map((s, index) => {
    const raw = s.data
      .map((p) => ({ t: toTime(p.t), v: typeof p.v === 'number' && Number.isFinite(p.v) ? p.v : null }))
      .filter((p) => Number.isFinite(p.t))
      .sort((a, b) => a.t - b.t)
    const vals = raw.filter((p) => p.v !== null).map((p) => p.v!)
    const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    const base = s.baseline ?? (baseline === 'mean' ? mean : baseline)
    const points = raw.map((p) => ({ ...p, d: p.v === null ? null : p.v - base }))
    let stats: HorizonStats | null = null
    if (vals.length) {
      let lastV: number | null = null
      for (let i = raw.length - 1; i >= 0; i--) {
        if (raw[i].v !== null) {
          lastV = raw[i].v
          break
        }
      }
      stats = {
        min: Math.min(...vals),
        max: Math.max(...vals),
        mean,
        last: lastV,
        maxAbs: Math.max(...points.filter((p) => p.d !== null).map((p) => Math.abs(p.d!))),
        n: vals.length,
      }
    }
    return { name: s.name, unit: s.unit, index, baseline: base, points, stats }
  })
}

/** 所有序列的時間範圍 */
export function horizonExtent(rows: readonly HorizonRow[]): [number, number] | null {
  let lo = Infinity
  let hi = -Infinity
  for (const r of rows) {
    if (!r.points.length) continue
    lo = Math.min(lo, r.points[0].t)
    hi = Math.max(hi, r.points[r.points.length - 1].t)
  }
  return lo === Infinity ? null : [lo, hi]
}

/** 一層的高度（數值單位）：最大偏離 ÷ 層數；全為 0 時為 1 */
export function bandSize(maxAbs: number, bands: number): number {
  return maxAbs > 0 ? maxAbs / Math.max(1, bands) : 1
}

/**
 * 某一層、某一邊（正 / 負）的填滿比例（0–1）：
 * 偏離量落在這層的部分 ÷ 層高。缺值為 null（畫成斷開）。
 */
export function bandFraction(d: number | null, band: number, size: number, side: 1 | -1): number | null {
  if (d === null) return null
  const x = d * side - band * size
  return Math.max(0, Math.min(1, x / size))
}

/** 最接近 t 的資料點（maxGap 內；超過時為 null） */
export function pointAt(points: readonly HorizonPoint[], t: number, maxGap = Infinity): HorizonPoint | null {
  if (!points.length) return null
  let lo = 0
  let hi = points.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (points[mid].t < t) lo = mid + 1
    else hi = mid
  }
  const cands = [points[lo], points[lo - 1]].filter(Boolean)
  const best = cands.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a))
  return Math.abs(best.t - t) <= maxGap ? best : null
}

/** 所有序列出現過的時間（排序、去重），鍵盤移動十字線用 */
export function horizonTimes(rows: readonly HorizonRow[]): number[] {
  const set = new Set<number>()
  for (const r of rows) for (const p of r.points) set.add(p.t)
  return [...set].sort((a, b) => a - b)
}

/** 資料點的典型間隔（中位數），用來判斷十字線附近有沒有資料 */
export function typicalStep(points: readonly HorizonPoint[]): number {
  if (points.length < 2) return Infinity
  const gaps = points.slice(1).map((p, i) => p.t - points[i].t).sort((a, b) => a - b)
  return gaps[Math.floor(gaps.length / 2)]
}

export type HorizonSort = 'none' | 'name' | 'maxAbs' | 'mean' | 'last'

/** 排序：maxAbs / mean / last 由大到小（沒資料的在最後）、name 依名稱 */
export function sortHorizonRows(rows: readonly HorizonRow[], sort: HorizonSort): HorizonRow[] {
  if (sort === 'none') return [...rows]
  if (sort === 'name') return [...rows].sort((a, b) => a.name.localeCompare(b.name) || a.index - b.index)
  const key = (r: HorizonRow): number | null => {
    if (!r.stats) return null
    if (sort === 'maxAbs') return r.stats.maxAbs
    if (sort === 'mean') return r.stats.mean - r.baseline
    return r.stats.last === null ? null : r.stats.last - r.baseline
  }
  return [...rows].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    if (ka === null || kb === null) return ka === kb ? a.index - b.index : ka === null ? 1 : -1
    return kb - ka || a.index - b.index
  })
}
