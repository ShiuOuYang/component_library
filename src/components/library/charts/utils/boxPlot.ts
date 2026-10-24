/**
 * BoxPlotChart（箱型圖、小提琴圖）的純函式：分組、四分位數、鬚與離群值、核密度估計
 */

/**
 * 四分位數的算法：
 * - inclusive：(n − 1)p，Excel QUARTILE.INC、R 預設（type 7）
 * - exclusive：(n + 1)p，Minitab、Excel QUARTILE.EXC（type 6）—— 要跟 Minitab 對數字時用這個
 */
export type QuartileMethod = 'inclusive' | 'exclusive'

/** 已排序的數值取分位數 */
export function quantileSorted(sorted: number[], p: number, method: QuartileMethod = 'inclusive'): number {
  const n = sorted.length
  if (n === 0) return NaN
  if (n === 1) return sorted[0]
  // 位置（從 0 起算）
  const h = method === 'exclusive' ? (n + 1) * p - 1 : (n - 1) * p
  if (h <= 0) return sorted[0]
  if (h >= n - 1) return sorted[n - 1]
  const lo = Math.floor(h)
  return sorted[lo] + (h - lo) * (sorted[lo + 1] - sorted[lo])
}

/** 一組數值的統計 */
export interface BoxStats {
  n: number
  min: number
  max: number
  q1: number
  median: number
  q3: number
  iqr: number
  mean: number
  /** 樣本標準差（n − 1）；只有一筆時為 0 */
  sd: number
  /** 離群值的門檻：Q1 − k·IQR、Q3 + k·IQR */
  lowerFence: number
  upperFence: number
  /** 鬚的兩端：門檻內最遠的資料點 */
  whiskerLow: number
  whiskerHigh: number
  /** 門檻外的值（由小到大） */
  outliers: number[]
}

export interface BoxStatsOptions {
  method?: QuartileMethod
  /** 鬚的長度：k 倍 IQR；'minmax' 時鬚畫到最小、最大值（沒有離群值） */
  whisker?: number | 'minmax'
}

/** 計算箱型圖的統計；values 必須已由小到大排序 */
export function boxStats(sorted: number[], o: BoxStatsOptions = {}): BoxStats | null {
  const n = sorted.length
  if (n === 0) return null
  const method = o.method ?? 'inclusive'
  const q1 = quantileSorted(sorted, 0.25, method)
  const median = quantileSorted(sorted, 0.5, method)
  const q3 = quantileSorted(sorted, 0.75, method)
  const iqr = q3 - q1
  let sum = 0
  for (const v of sorted) sum += v
  const mean = sum / n
  let ss = 0
  for (const v of sorted) ss += (v - mean) ** 2
  const sd = n > 1 ? Math.sqrt(ss / (n - 1)) : 0
  const k = o.whisker === 'minmax' ? Infinity : o.whisker ?? 1.5
  const lowerFence = k === Infinity ? -Infinity : q1 - k * iqr
  const upperFence = k === Infinity ? Infinity : q3 + k * iqr
  const outliers: number[] = []
  let whiskerLow = q1
  let whiskerHigh = q3
  let foundLow = false
  for (const v of sorted) {
    if (v < lowerFence || v > upperFence) {
      outliers.push(v)
      continue
    }
    if (!foundLow) {
      whiskerLow = v
      foundLow = true
    }
    whiskerHigh = v
  }
  return {
    n,
    min: sorted[0],
    max: sorted[n - 1],
    q1,
    median,
    q3,
    iqr,
    mean,
    sd,
    lowerFence,
    upperFence,
    // 鬚不會縮進箱子裡（分位數是內插出來的，可能比最近的資料點更外面）
    whiskerLow: Math.min(whiskerLow, q1),
    whiskerHigh: Math.max(whiskerHigh, q3),
    outliers,
  }
}

/** 核密度曲線上的一點 */
export interface DensityPoint {
  value: number
  density: number
}

/**
 * Silverman 經驗法則的頻寬：0.9 × min(標準差, IQR ÷ 1.34) × n^(−1/5)。
 * IQR 為 0（大半資料相同）時改用標準差；全部相同時為 0
 */
export function silvermanBandwidth(stats: BoxStats): number {
  const spread = stats.iqr > 0 ? Math.min(stats.sd, stats.iqr / 1.34) : stats.sd
  return 0.9 * spread * Math.pow(stats.n, -0.2)
}

/**
 * 高斯核密度估計，範圍只到資料的最小、最大值（小提琴不畫出沒有資料的地方）。
 * 全部相同（頻寬 0）時回傳空陣列。
 */
export function kernelDensity(sorted: number[], bandwidth: number, points = 60): DensityPoint[] {
  const n = sorted.length
  if (n === 0 || !(bandwidth > 0)) return []
  const lo = sorted[0]
  const hi = sorted[n - 1]
  const steps = Math.max(2, points)
  const out: DensityPoint[] = []
  const norm = 1 / (n * bandwidth * Math.sqrt(2 * Math.PI))
  // 只加總 4 個頻寬以內的點（更遠的貢獻小於 0.04%）
  const reach = 4 * bandwidth
  let start = 0
  for (let i = 0; i < steps; i++) {
    const x = lo + ((hi - lo) * i) / (steps - 1)
    while (start < n && sorted[start] < x - reach) start++
    let sum = 0
    for (let j = start; j < n && sorted[j] <= x + reach; j++) {
      const u = (x - sorted[j]) / bandwidth
      sum += Math.exp(-0.5 * u * u)
    }
    out.push({ value: x, density: sum * norm })
  }
  return out
}

/** 一組資料 */
export interface BoxGroup {
  key: string
  label: string
  /** 由小到大排序的數值 */
  values: number[]
  /** 與 values 對應的原始資料 */
  rows: Record<string, unknown>[]
}

export interface GroupOptions {
  groupField: string
  valueField: string
  /** 組的順序與顯示文字；沒列到的組依出現順序接在後面 */
  groups?: { value: string; label?: string }[]
}

/** 依組別欄位分組、濾掉不是數字的值、每組由小到大排序 */
export function groupValues(data: Record<string, unknown>[], o: GroupOptions): { groups: BoxGroup[]; skipped: number } {
  const index = new Map<string, number>()
  const groups: { key: string; label: string; items: { v: number; d: Record<string, unknown> }[] }[] = []
  const ensure = (key: string, label?: string) => {
    let i = index.get(key)
    if (i === undefined) {
      i = groups.length
      index.set(key, i)
      groups.push({ key, label: label ?? key, items: [] })
    }
    return i
  }
  for (const g of o.groups ?? []) ensure(String(g.value), g.label)
  let skipped = 0
  for (const d of data) {
    const raw = d?.[o.valueField]
    const v = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN
    const g = d?.[o.groupField]
    if (!Number.isFinite(v) || g === null || g === undefined || g === '') {
      skipped++
      continue
    }
    groups[ensure(String(g))].items.push({ v, d })
  }
  return {
    groups: groups.map((g) => {
      const items = g.items.sort((a, b) => a.v - b.v)
      return { key: g.key, label: g.label, values: items.map((i) => i.v), rows: items.map((i) => i.d) }
    }),
    skipped,
  }
}

/**
 * 「全部數值」模式的點要左右散開，才不會疊成一條線。
 * 用固定的偽亂數（依索引），每次重畫位置都一樣
 */
export function jitter(index: number): number {
  const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x) - 0.5
}
