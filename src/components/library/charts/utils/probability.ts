/**
 * 機率圖（常態 / 對數常態 / Weibull）：繪圖位置、配適線、信賴帶、Anderson-Darling 檢定。
 * 演算法與 Minitab 預設相同：中位秩 (i − 0.3) / (n + 0.4)；常態與對數常態用平均與樣本標準差；Weibull 用最小平方（X 對 Y 迴歸）。
 */

export type ProbabilityDistribution = 'normal' | 'lognormal' | 'weibull'

/** 標準常態累積機率；用 erfc（Numerical Recipes erfcc，相對誤差 < 1.2e-7），尾端也準 */
export function normCdf(z: number): number {
  if (Number.isNaN(z)) return NaN
  if (!Number.isFinite(z)) return z > 0 ? 1 : 0
  const x = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + 0.5 * x)
  const erfc =
    t *
    Math.exp(
      -x * x -
        1.26551223 +
        t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))
    )
  return z >= 0 ? 1 - erfc / 2 : erfc / 2
}

/** 標準常態分位數 Φ⁻¹(p)（Acklam，相對誤差 < 1.2e-9） */
export function normInv(p: number): number {
  if (!(p > 0 && p < 1)) return p === 0 ? -Infinity : p === 1 ? Infinity : NaN
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239]
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572]
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416]
  const lo = 0.02425
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  if (p > 1 - lo) {
    const q = Math.sqrt(-2 * Math.log(1 - p))
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  const q = p - 0.5
  const r = q * q
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
}

/** 中位秩（Benard）：(i − 0.3) / (n + 0.4)，i 從 1 起算 */
export const medianRank = (i: number, n: number) => (i - 0.3) / (n + 0.4)

/** 機率 → 圖上的縱座標（常態 / 對數常態：Φ⁻¹(p)；Weibull：ln(−ln(1 − p))） */
export function probToY(p: number, dist: ProbabilityDistribution): number {
  return dist === 'weibull' ? Math.log(-Math.log(1 - p)) : normInv(p)
}
/** 縱座標 → 機率 */
export function yToProb(y: number, dist: ProbabilityDistribution): number {
  return dist === 'weibull' ? 1 - Math.exp(-Math.exp(y)) : normCdf(y)
}

/** 資料值 → 橫座標的線性空間（對數常態與 Weibull 取 ln） */
export const valueToX = (v: number, dist: ProbabilityDistribution) => (dist === 'normal' ? v : Math.log(v))
export const xToValue = (x: number, dist: ProbabilityDistribution) => (dist === 'normal' ? x : Math.exp(x))

export interface ProbabilityPoint {
  /** 原始值 */
  value: number
  /** 原始資料的索引 */
  index: number
  /** 排序後的秩（1 起算） */
  rank: number
  /** 繪圖位置（中位秩） */
  p: number
}

export interface ProbabilityFit {
  dist: ProbabilityDistribution
  n: number
  /** 常態：平均 / 標準差；對數常態：ln 的平均 / 標準差（location / scale）；Weibull：shape / scale */
  params: { location?: number; scale: number; shape?: number }
  /** 平均 / 標準差（原始資料） */
  mean: number
  sd: number
  /** Anderson-Darling 統計量 A² 與 p 值（Weibull 為查表近似：p 只到 0.01–0.25 的範圍，外面回傳邊界） */
  ad: number
  pValue: number
  /** p 值是否為邊界（例如 > 0.25 或 < 0.01） */
  pBound: 'gt' | 'lt' | null
  points: ProbabilityPoint[]
  /** 排除的值（≤ 0 的值不適用於對數常態與 Weibull；非數字） */
  excluded: number
}

/** 配適線在縱座標 y 的橫座標（線性空間） */
export function fitX(fit: ProbabilityFit, y: number): number {
  if (fit.dist === 'weibull') return Math.log(fit.params.scale) + y / fit.params.shape!
  return fit.params.location! + fit.params.scale * y
}

/** 某機率的分位數（原始單位） */
export function fitQuantile(fit: ProbabilityFit, p: number): number {
  return xToValue(fitX(fit, probToY(p, fit.dist)), fit.dist)
}

/** 配適分配的 CDF（原始單位） */
export function fitCdf(fit: ProbabilityFit, v: number): number {
  if (fit.dist === 'normal') return normCdf((v - fit.params.location!) / fit.params.scale)
  if (v <= 0) return 0
  if (fit.dist === 'lognormal') return normCdf((Math.log(v) - fit.params.location!) / fit.params.scale)
  return 1 - Math.exp(-((v / fit.params.scale) ** fit.params.shape!))
}

/**
 * 95% 信賴帶（線性空間的半寬）。常態 / 對數常態：Var(μ̂ + zσ̂) ≈ σ²/n · (1 + z²/2)；
 * Weibull：依迴歸的殘差標準誤近似（在 ln 空間）。
 */
export function bandHalfWidth(fit: ProbabilityFit, y: number, z975 = 1.959963984540054): number {
  const n = fit.n
  if (fit.dist === 'weibull') {
    const s = fit.params.scale
    const b = 1 / fit.params.shape!
    const ys = fit.points.map((pt) => probToY(pt.p, 'weibull'))
    const my = ys.reduce((a, v) => a + v, 0) / n
    const sxx = ys.reduce((a, v) => a + (v - my) ** 2, 0)
    const resid = fit.points.reduce((a, pt, i) => a + (Math.log(pt.value) - (Math.log(s) + b * ys[i])) ** 2, 0)
    const se = Math.sqrt(resid / Math.max(1, n - 2))
    return z975 * se * Math.sqrt(1 / n + (y - my) ** 2 / (sxx || 1))
  }
  return (z975 * fit.params.scale * Math.sqrt(1 + (y * y) / 2)) / Math.sqrt(n)
}

/** Anderson-Darling 常態檢定的 p 值（D'Agostino & Stephens，用調整後的 A*） */
export function adNormalPValue(a2: number, n: number): number {
  const a = a2 * (1 + 0.75 / n + 2.25 / (n * n))
  let p: number
  if (a >= 0.6) p = Math.exp(1.2937 - 5.709 * a + 0.0186 * a * a)
  else if (a >= 0.34) p = Math.exp(0.9177 - 4.279 * a - 1.38 * a * a)
  else if (a >= 0.2) p = 1 - Math.exp(-8.318 + 42.796 * a - 59.938 * a * a)
  else p = 1 - Math.exp(-13.436 + 101.14 * a - 223.73 * a * a)
  return Math.min(1, Math.max(0, p))
}

/** Weibull 的 A-D p 值（Lockhart & Stephens 臨界值，A* = A²(1 + 0.2/√n)，在表內以對數內插） */
export function adWeibullPValue(a2: number, n: number): { p: number; bound: 'gt' | 'lt' | null } {
  const a = a2 * (1 + 0.2 / Math.sqrt(n))
  const table: [number, number][] = [
    [0.474, 0.25],
    [0.637, 0.1],
    [0.757, 0.05],
    [0.877, 0.025],
    [1.038, 0.01],
  ]
  if (a <= table[0][0]) return { p: 0.25, bound: 'gt' }
  if (a >= table[table.length - 1][0]) return { p: 0.01, bound: 'lt' }
  const i = table.findIndex(([c]) => c > a)
  const [c0, p0] = table[i - 1]
  const [c1, p1] = table[i]
  const t = (a - c0) / (c1 - c0)
  return { p: Math.exp(Math.log(p0) + t * (Math.log(p1) - Math.log(p0))), bound: null }
}

/** A² 統計量（給定配適的 CDF，資料已排序） */
export function andersonDarling(sorted: readonly number[], cdf: (v: number) => number): number {
  const n = sorted.length
  const eps = 1e-300
  let s = 0
  for (let i = 0; i < n; i++) {
    const f = Math.min(1 - 1e-16, Math.max(eps, cdf(sorted[i])))
    const g = Math.min(1 - 1e-16, Math.max(eps, cdf(sorted[n - 1 - i])))
    s += (2 * i + 1) * (Math.log(f) + Math.log(1 - g))
  }
  return -n - s / n
}

/** 配適：至少要 3 個有效值，否則回傳 null */
export function fitProbability(values: readonly unknown[], dist: ProbabilityDistribution): ProbabilityFit | null {
  const valid: { value: number; index: number }[] = []
  let excluded = 0
  values.forEach((raw, index) => {
    const v = typeof raw === 'number' ? raw : raw === null || raw === undefined || raw === '' ? NaN : Number(raw)
    if (!Number.isFinite(v) || (dist !== 'normal' && v <= 0)) excluded++
    else valid.push({ value: v, index })
  })
  const n = valid.length
  if (n < 3) return null
  valid.sort((a, b) => a.value - b.value || a.index - b.index)
  const points = valid.map((v, i) => ({ ...v, rank: i + 1, p: medianRank(i + 1, n) }))
  const raw = points.map((p) => p.value)
  const mean = raw.reduce((a, v) => a + v, 0) / n
  const sd = Math.sqrt(raw.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1))

  let params: ProbabilityFit['params']
  if (dist === 'weibull') {
    // 最小平方：ln(x) = ln(η) + y / β，y = ln(−ln(1 − p))
    const xs = raw.map(Math.log)
    const ys = points.map((pt) => probToY(pt.p, 'weibull'))
    const mx = xs.reduce((a, v) => a + v, 0) / n
    const my = ys.reduce((a, v) => a + v, 0) / n
    let sxy = 0
    let syy = 0
    for (let i = 0; i < n; i++) {
      sxy += (ys[i] - my) * (xs[i] - mx)
      syy += (ys[i] - my) ** 2
    }
    const slope = sxy / syy
    params = slope > 0 ? { shape: 1 / slope, scale: Math.exp(mx - slope * my) } : { shape: Infinity, scale: Math.exp(mx) }
  } else {
    const xs = dist === 'lognormal' ? raw.map(Math.log) : raw
    const m = xs.reduce((a, v) => a + v, 0) / n
    const s = Math.sqrt(xs.reduce((a, v) => a + (v - m) ** 2, 0) / (n - 1))
    params = { location: m, scale: s }
  }

  const fit: ProbabilityFit = { dist, n, params, mean, sd, ad: NaN, pValue: NaN, pBound: null, points, excluded }
  const degenerate = dist === 'weibull' ? !Number.isFinite(params.shape!) : !(params.scale > 0)
  if (degenerate) return fit
  fit.ad = andersonDarling(raw, (v) => fitCdf(fit, v))
  if (dist === 'weibull') {
    const r = adWeibullPValue(fit.ad, n)
    fit.pValue = r.p
    fit.pBound = r.bound
  } else {
    fit.pValue = adNormalPValue(fit.ad, n)
    fit.pBound = fit.pValue < 0.005 ? 'lt' : null
    if (fit.pBound) fit.pValue = 0.005
  }
  return fit
}

/** 縱軸的機率刻度（百分比）：依高度挑合適的一組 */
export function probabilityTicks(dist: ProbabilityDistribution, n: number, compact: boolean): number[] {
  const full = dist === 'weibull' ? [1, 2, 3, 5, 10, 20, 30, 50, 63.2, 80, 90, 95, 99] : [0.1, 1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 99.9]
  const small = dist === 'weibull' ? [1, 5, 10, 30, 63.2, 90, 99] : [1, 5, 20, 50, 80, 95, 99]
  const ticks = (compact ? small : full).map((t) => t / 100)
  // 只保留資料範圍附近（最外面的點再往外一格）
  const lo = medianRank(1, n)
  const hi = medianRank(n, n)
  const inner = ticks.filter((t) => t >= lo && t <= hi)
  const below = ticks.filter((t) => t < lo).slice(-1)
  const above = ticks.filter((t) => t > hi).slice(0, 1)
  return [...below, ...inner, ...above]
}
