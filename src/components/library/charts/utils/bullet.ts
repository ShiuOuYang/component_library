/**
 * BulletChart / YieldFunnel 的純計算
 */

import type { GaugeBand } from '../GaugeChart.vue'

// === 子彈圖 ===

export interface BandSegment {
  band: GaugeBand
  /** 0～1，相對整條軌道 */
  from: number
  to: number
}

/** 數值在 [min, max] 之間的比例（夾在 0～1；min = max 時為 0） */
export function ratioOf(value: number, min: number, max: number): number {
  if (!(max > min) || !Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, (value - min) / (max - min)))
}

/** 由小到大的區間 → 軌道上的區段（第一段從 min 開始；超出範圍的部分截掉） */
export function bandSegments(bands: GaugeBand[] | null | undefined, min: number, max: number): BandSegment[] {
  const sorted = [...(bands ?? [])].filter((b) => Number.isFinite(b.to)).sort((a, b) => a.to - b.to)
  const out: BandSegment[] = []
  let from = min
  for (const band of sorted) {
    const a = ratioOf(from, min, max)
    const b = ratioOf(band.to, min, max)
    if (b > a) out.push({ band, from: a, to: b })
    from = band.to
  }
  return out
}

/** 數值落在哪個區間（超過最後一個時算最後一個；沒有區間時為 null） */
export function bandOf(bands: GaugeBand[] | null | undefined, value: number | null | undefined): GaugeBand | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  const sorted = [...(bands ?? [])].filter((b) => Number.isFinite(b.to)).sort((a, b) => a.to - b.to)
  if (!sorted.length) return null
  return sorted.find((b) => value <= b.to) ?? sorted[sorted.length - 1]
}

/** 軌道上限：沒指定時取數值、目標、最後一個區間的最大值，再取「好看」的整數 */
export function niceMax(values: Array<number | null | undefined>): number {
  const max = Math.max(0, ...values.filter((v): v is number => v !== null && v !== undefined && Number.isFinite(v)))
  if (max <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(max))
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= max) return m * p
  return 10 * p
}

// === 良率漏斗 ===

export interface FunnelStep {
  /** 站別 / 製程名稱 */
  label: string
  /** 通過這一站後剩下的數量（第一站是投入數） */
  count: number
  key?: string | number
}

export interface FunnelRow {
  key: string
  label: string
  count: number
  /** 這一站的良率（本站 / 上一站）；第一站為 null */
  stepYield: number | null
  /** 累計良率（本站 / 投入） */
  cumulative: number | null
  /** 這一站損失的數量（上一站 − 本站，不小於 0） */
  loss: number
  /** 佔總損失的比例 */
  lossShare: number
}

export interface FunnelResult {
  rows: FunnelRow[]
  /** 直通率（最後一站 / 投入） */
  rty: number | null
  totalLoss: number
  /** 損失最多的那一站（同數量時取良率較低的）；沒有損失時為 -1 */
  worstIndex: number
}

export function computeFunnel(steps: FunnelStep[]): FunnelResult {
  const clean = steps.map((s, i) => ({ ...s, count: Number.isFinite(s.count) ? Math.max(0, s.count) : 0, key: String(s.key ?? i) }))
  const first = clean[0]?.count ?? 0
  const rows: FunnelRow[] = clean.map((s, i) => {
    const prev = i > 0 ? clean[i - 1].count : null
    return {
      key: s.key,
      label: s.label,
      count: s.count,
      stepYield: prev === null ? null : prev > 0 ? s.count / prev : null,
      cumulative: first > 0 ? s.count / first : null,
      loss: prev === null ? 0 : Math.max(0, prev - s.count),
      lossShare: 0,
    }
  })
  const totalLoss = rows.reduce((sum, r) => sum + r.loss, 0)
  let worstIndex = -1
  rows.forEach((r, i) => {
    r.lossShare = totalLoss > 0 ? r.loss / totalLoss : 0
    if (r.loss <= 0) return
    const w = rows[worstIndex]
    if (worstIndex < 0 || r.loss > w.loss || (r.loss === w.loss && (r.stepYield ?? 1) < (w.stepYield ?? 1))) worstIndex = i
  })
  const last = clean[clean.length - 1]?.count
  return { rows, rty: first > 0 && last !== undefined ? last / first : null, totalLoss, worstIndex }
}
