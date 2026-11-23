/**
 * 相關矩陣（CorrelationMatrix）的統計
 *
 *   - Pearson：線性相關；Spearman：等級相關（先換成排名，同分取平均排名），對離群值與非線性的單調關係較穩
 *   - 成對完整：每一對參數只用兩個值都有的資料（缺值不會讓整筆被丟掉）
 *   - p 值：t = r √((n − 2) / (1 − r²))，自由度 n − 2 的雙尾機率（不完全 Beta 函數）
 *   - 聚類排序：距離 1 − |r|、平均連結的階層式聚類，相關的參數會排在一起
 */

export type CorrelationMethod = 'pearson' | 'spearman'

export const toNum = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}

/** 排名（1 起算），同分取平均排名 */
export function ranks(values: number[]): number[] {
  const idx = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0])
  const out = new Array<number>(values.length)
  let i = 0
  while (i < idx.length) {
    let j = i
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++
    const r = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) out[idx[k][1]] = r
    i = j + 1
  }
  return out
}

/** Pearson 相關係數；少於 2 筆或其中一邊沒有變異時為 null */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length)
  if (n < 2) return null
  let mx = 0
  let my = 0
  for (let i = 0; i < n; i++) {
    mx += xs[i]
    my += ys[i]
  }
  mx /= n
  my /= n
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx
    const dy = ys[i] - my
    sxy += dx * dy
    sxx += dx * dx
    syy += dy * dy
  }
  if (sxx === 0 || syy === 0) return null
  return Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)))
}

// ---- p 值：不完全 Beta 函數（Numerical Recipes 的連分數） ----
function logGamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941678, 24.01409824083091, -1.231739572450155, 0.001208650973866179, -0.5395239384953e-5]
  let y = x
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5)
  let ser = 1.000000000190015
  for (const k of c) ser += k / ++y
  return -tmp + Math.log((Math.sqrt(2 * Math.PI) * ser) / x)
}
function betacf(a: number, b: number, x: number): number {
  const EPS = 3e-14
  const FPMIN = 1e-300
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return h
}
/** 正規化不完全 Beta 函數 I_x(a, b) */
export function incompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x))
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b
}

/** 相關係數 r（n 筆）是否為 0 的雙尾 p 值 */
export function correlationPValue(r: number, n: number): number | null {
  if (n < 3) return null
  if (Math.abs(r) >= 1) return 0
  const df = n - 2
  const t2 = (r * r * df) / (1 - r * r)
  return incompleteBeta(df / (df + t2), df / 2, 0.5)
}

export interface CorrelationCell {
  r: number | null
  n: number
  p: number | null
}

/** 相關矩陣（成對完整） */
export function correlationMatrix(rows: Record<string, unknown>[], keys: string[], method: CorrelationMethod = 'pearson'): CorrelationCell[][] {
  const cols = keys.map((k) => rows.map((r) => toNum(r[k])))
  return keys.map((_, i) =>
    keys.map((__, j) => {
      const xs: number[] = []
      const ys: number[] = []
      for (let k = 0; k < rows.length; k++) {
        const a = cols[i][k]
        const b = cols[j][k]
        if (a !== null && b !== null) {
          xs.push(a)
          ys.push(b)
        }
      }
      const n = xs.length
      const r = i === j ? (n >= 2 ? 1 : null) : method === 'spearman' ? pearson(ranks(xs), ranks(ys)) : pearson(xs, ys)
      return { r, n, p: r === null ? null : i === j ? 0 : correlationPValue(r, n) }
    })
  )
}

/**
 * 聚類排序：距離 1 − |r|（沒有 r 時視為 1），平均連結，回傳排序後的索引。
 * 參數數量通常不超過幾十個，O(k³) 就夠了。
 */
export function clusterOrder(matrix: CorrelationCell[][]): number[] {
  const k = matrix.length
  const dist = (i: number, j: number) => {
    const r = matrix[i][j].r
    return r === null ? 1 : 1 - Math.abs(r)
  }
  let clusters: number[][] = Array.from({ length: k }, (_, i) => [i])
  while (clusters.length > 1) {
    let best = Infinity
    let bi = 0
    let bj = 1
    for (let a = 0; a < clusters.length; a++)
      for (let b = a + 1; b < clusters.length; b++) {
        let sum = 0
        for (const i of clusters[a]) for (const j of clusters[b]) sum += dist(i, j)
        const d = sum / (clusters[a].length * clusters[b].length)
        if (d < best) {
          best = d
          bi = a
          bj = b
        }
      }
    const merged = [...clusters[bi], ...clusters[bj]]
    clusters = clusters.filter((_, idx) => idx !== bi && idx !== bj)
    clusters.splice(bi, 0, merged)
  }
  return clusters[0] ?? []
}
