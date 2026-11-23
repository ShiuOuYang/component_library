/**
 * 散佈圖（ScatterChart）的迴歸與選取
 *
 *   - 最小平方法直線迴歸：斜率、截距、R²、殘差標準誤
 *   - 平均反應的 95% 信賴帶：ŷ ± t(0.975, n−2) · s · √(1/n + (x − x̄)² / Sxx)
 *     —— 是「這條線」的不確定範圍（點越少、越靠兩端越寬），不是個別點的預測區間
 *   - 框選：哪些點落在框裡
 */

export interface ScatterPoint {
  x: number
  y: number
  /** 分類（不同顏色、可分別做迴歸） */
  category?: string
  /** 提示裡顯示的名稱（批號、序號） */
  label?: string
  id?: string | number
}

export interface Regression {
  slope: number
  intercept: number
  /** 決定係數 */
  r2: number
  /** 相關係數（含正負號） */
  r: number
  n: number
  meanX: number
  /** Σ(x − x̄)² */
  sxx: number
  /** 殘差標準誤 √(SSE / (n − 2)) */
  se: number
  xMin: number
  xMax: number
}

/** 直線迴歸；有限數值的點少於 2 個、或 x 全部相同時回傳 null */
export function linearRegression(points: Array<{ x: number; y: number }>): Regression | null {
  const pts = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  const n = pts.length
  if (n < 2) return null
  let sx = 0
  let sy = 0
  for (const p of pts) {
    sx += p.x
    sy += p.y
  }
  const meanX = sx / n
  const meanY = sy / n
  let sxx = 0
  let sxy = 0
  let syy = 0
  let xMin = Infinity
  let xMax = -Infinity
  for (const p of pts) {
    const dx = p.x - meanX
    const dy = p.y - meanY
    sxx += dx * dx
    sxy += dx * dy
    syy += dy * dy
    if (p.x < xMin) xMin = p.x
    if (p.x > xMax) xMax = p.x
  }
  if (sxx === 0) return null
  const slope = sxy / sxx
  const intercept = meanY - slope * meanX
  // y 全部相同：完全由 x 解釋（水平線），R² 定為 1
  const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy)
  const r = syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy)
  const sse = Math.max(0, syy - slope * sxy)
  const se = n > 2 ? Math.sqrt(sse / (n - 2)) : 0
  return { slope, intercept, r2, r, n, meanX, sxx, se, xMin, xMax }
}

/** t 分配的 97.5% 分位數（雙尾 95%）；df ≤ 30 查表，更大時用 Cornish–Fisher 展開（誤差 < 0.001） */
const T975 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042]
export function tQuantile975(df: number): number {
  if (!(df >= 1)) return NaN
  if (df <= 30) return T975[Math.floor(df) - 1]
  const z = 1.959963985
  const z3 = z ** 3
  const z5 = z ** 5
  return z + (z3 + z) / (4 * df) + (5 * z5 + 16 * z3 + 3 * z) / (96 * df * df)
}

export const predict = (reg: Regression, x: number) => reg.intercept + reg.slope * x

/** 信賴帶在 x 的半寬；n ≤ 2 時沒有自由度，回傳 0 */
export function bandHalfWidth(reg: Regression, x: number): number {
  if (reg.n <= 2) return 0
  return tQuantile975(reg.n - 2) * reg.se * Math.sqrt(1 / reg.n + ((x - reg.meanX) ** 2) / reg.sxx)
}

/** 信賴帶的取樣點（x0 到 x1 均分 steps 段） */
export function bandPoints(reg: Regression, x0: number, x1: number, steps = 40): Array<{ x: number; y: number; lo: number; hi: number }> {
  const out = []
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps
    const y = predict(reg, x)
    const h = bandHalfWidth(reg, x)
    out.push({ x, y, lo: y - h, hi: y + h })
  }
  return out
}

/** 落在框（像素座標，任意兩角）裡的點的索引 */
export function indicesInRect(px: ArrayLike<number>, py: ArrayLike<number>, x0: number, y0: number, x1: number, y1: number): number[] {
  const [l, r] = x0 < x1 ? [x0, x1] : [x1, x0]
  const [t, b] = y0 < y1 ? [y0, y1] : [y1, y0]
  const out: number[] = []
  const n = Math.min(px.length, py.length)
  for (let i = 0; i < n; i++) if (px[i] >= l && px[i] <= r && py[i] >= t && py[i] <= b) out.push(i)
  return out
}

/** 迴歸式的文字：y = 1.23x − 4.5 */
export function formatEquation(reg: Regression, fmt: (n: number) => string): string {
  const b = reg.intercept
  return `y = ${fmt(reg.slope)}x ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b))}`
}
