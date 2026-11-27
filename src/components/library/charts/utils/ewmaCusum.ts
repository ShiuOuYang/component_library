/**
 * EWMA 與 CUSUM 管制圖（小偏移偵測）的計算。
 *
 * 一般的個別值管制圖（I-MR）對 1.5σ 以下的偏移反應很慢；EWMA 與 CUSUM 會累積過去的資訊，
 * 平均偏移 0.5～1σ 時也能在十幾點內發出訊號。
 *
 * - EWMA：z_i = λ·x_i + (1 − λ)·z_{i−1}，z_0 = μ0。
 *   管制界限隨點數展開：μ0 ± L·σ·√(λ / (2 − λ) · (1 − (1 − λ)^{2i}))，點數多了以後趨近穩定值。
 * - 表格式 CUSUM（Montgomery）：K = k·σ、H = h·σ
 *   C⁺_i = max(0, x_i − (μ0 + K) + C⁺_{i−1})，C⁻_i = max(0, (μ0 − K) − x_i + C⁻_{i−1})，超過 H 即訊號。
 *   訊號時往回找累積和最後一次為 0 的點，就是偏移開始的估計；新平均 ≈ μ0 + K + C⁺/N⁺（或 μ0 − K − C⁻/N⁻）。
 *
 * μ0 不給時用資料平均；σ 不給時用移動全距估計（MR̄ / d2，與個別值管制圖相同），不受偏移本身影響太多。
 */
import { mean, withinSigma } from './spc'

export interface EwmaOptions {
  /** 平滑係數 λ（0 < λ ≤ 1），預設 0.2；越小越能抓小偏移，但反應越慢 */
  lambda?: number
  /** 管制界限寬度 L（σ 倍數），預設 3；λ = 0.2 時 L = 2.86 對應 ARL₀ ≈ 500 */
  L?: number
  /** 目標值 μ0（預設資料平均） */
  target?: number | null
  /** 製程標準差 σ（預設 MR̄ / d2） */
  sigma?: number | null
}

export interface CusumOptions {
  /** 參考值 k（σ 倍數），預設 0.5：用來偵測 1σ 的偏移 */
  k?: number
  /** 決策界限 h（σ 倍數），預設 5 */
  h?: number
  target?: number | null
  sigma?: number | null
}

export interface EwmaPoint {
  index: number
  x: number
  z: number
  ucl: number
  lcl: number
  /** z 超出界限 */
  signal: boolean
}

export interface CusumPoint {
  index: number
  x: number
  cPlus: number
  cMinus: number
  /** 連續累積的點數（C 從 0 開始算起） */
  nPlus: number
  nMinus: number
  signal: 'up' | 'down' | null
}

export interface ShiftEstimate {
  /** 第一個訊號點 */
  signalAt: number
  /** 偏移開始的估計（累積和最後一次為 0 之後的那一點） */
  onset: number
  direction: 'up' | 'down'
  /** 估計的新平均 */
  newMean: number
}

export interface EwmaResult {
  mu0: number
  sigma: number
  lambda: number
  L: number
  points: EwmaPoint[]
  /** 第一個超出界限的點；沒有為 null */
  firstSignal: number | null
  /** 穩態界限（點數很多時） */
  steadyUcl: number
  steadyLcl: number
}

export interface CusumResult {
  mu0: number
  sigma: number
  k: number
  h: number
  /** K、H 換算成量測單位 */
  K: number
  H: number
  points: CusumPoint[]
  shift: ShiftEstimate | null
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** μ0 與 σ：有給用給的，沒給從資料估 */
export function baseline(values: number[], target?: number | null, sigma?: number | null): { mu0: number; sigma: number } {
  const mu0 = finite(target) ? target : mean(values)
  const s = finite(sigma) && sigma > 0 ? sigma : values.length >= 2 ? withinSigma(values, 1) : NaN
  return { mu0, sigma: s }
}

export function ewma(values: number[], options: EwmaOptions = {}): EwmaResult {
  const lambda = Math.min(1, Math.max(0.01, options.lambda ?? 0.2))
  const L = options.L ?? 3
  const { mu0, sigma } = baseline(values, options.target, options.sigma)
  const points: EwmaPoint[] = []
  let z = mu0
  let firstSignal: number | null = null
  const ratio = lambda / (2 - lambda)
  values.forEach((x, i) => {
    z = lambda * x + (1 - lambda) * z
    const w = L * sigma * Math.sqrt(ratio * (1 - (1 - lambda) ** (2 * (i + 1))))
    const ucl = mu0 + w
    const lcl = mu0 - w
    const signal = Number.isFinite(w) && (z > ucl || z < lcl)
    if (signal && firstSignal === null) firstSignal = i
    points.push({ index: i, x, z, ucl, lcl, signal })
  })
  const steady = L * sigma * Math.sqrt(ratio)
  return { mu0, sigma, lambda, L, points, firstSignal, steadyUcl: mu0 + steady, steadyLcl: mu0 - steady }
}

export function cusum(values: number[], options: CusumOptions = {}): CusumResult {
  const k = options.k ?? 0.5
  const h = options.h ?? 5
  const { mu0, sigma } = baseline(values, options.target, options.sigma)
  const K = k * sigma
  const H = h * sigma
  const points: CusumPoint[] = []
  let cp = 0
  let cm = 0
  let np = 0
  let nm = 0
  let shift: ShiftEstimate | null = null
  values.forEach((x, i) => {
    cp = Math.max(0, x - (mu0 + K) + cp)
    cm = Math.max(0, mu0 - K - x + cm)
    np = cp > 0 ? np + 1 : 0
    nm = cm > 0 ? nm + 1 : 0
    const up = Number.isFinite(H) && cp > H
    const down = Number.isFinite(H) && cm > H
    const signal = up ? 'up' : down ? 'down' : null
    if (signal && !shift) {
      shift =
        signal === 'up'
          ? { signalAt: i, onset: i - np + 1, direction: 'up', newMean: mu0 + K + cp / np }
          : { signalAt: i, onset: i - nm + 1, direction: 'down', newMean: mu0 - K - cm / nm }
    }
    points.push({ index: i, x, cPlus: cp, cMinus: cm, nPlus: np, nMinus: nm, signal })
  })
  return { mu0, sigma, k, h, K, H, points, shift }
}

/** 從資料列取出數值（略過非數字），同時保留原始列的索引對應 */
export function extractSeries(data: (number | Record<string, unknown>)[], value = 'value', label?: string): { values: number[]; labels: string[]; rows: number[] } {
  const values: number[] = []
  const labels: string[] = []
  const rows: number[] = []
  data.forEach((d, i) => {
    const v = typeof d === 'number' ? d : Number((d as Record<string, unknown>)[value])
    if (!Number.isFinite(v) || (typeof d === 'object' && (d as Record<string, unknown>)[value] === null)) return
    values.push(v)
    const lb = typeof d === 'object' && label ? (d as Record<string, unknown>)[label] : undefined
    labels.push(lb === undefined || lb === null ? String(values.length) : String(lb))
    rows.push(i)
  })
  return { values, labels, rows }
}
