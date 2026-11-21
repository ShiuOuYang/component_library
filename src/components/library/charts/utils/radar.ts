/**
 * 雷達圖（RadarChart）的刻度與座標
 *
 * 每一軸有自己的範圍（品質分數 0–100、交期天數 0–30…），值換算成 0–1 的比例再畫。
 * 「越小越好」的軸（不良率、交期天數）可以反轉：越好越靠外圈，整張圖「越大越好」才一致。
 */

import { niceMax } from './bullet'

export interface RadarAxis {
  key: string
  label: string
  /** 範圍；不給時 min 為 0、max 取所有系列在這一軸的最大值再取整 */
  min?: number
  max?: number
  unit?: string
  /** 越小越好：反轉方向（小的值畫在外圈） */
  lowerIsBetter?: boolean
}

export interface RadarSeries {
  name: string
  values: Record<string, number | null | undefined>
  color?: string
}

export interface AxisScale {
  min: number
  max: number
}

/** 每一軸的範圍；global 有給時沒指定 max 的軸都用它（同一單位的指標比較時刻度一致） */
export function radarScales(axes: RadarAxis[], series: RadarSeries[], global?: number | null): Record<string, AxisScale> {
  const out: Record<string, AxisScale> = {}
  for (const a of axes) {
    const min = a.min ?? 0
    const max = a.max ?? global ?? niceMax(series.map((s) => s.values[a.key]))
    out[a.key] = { min, max: max > min ? max : min + 1 }
  }
  return out
}

/** 值 → 0–1 的比例（超出範圍夾住；越小越好時反轉）；沒有值為 null */
export function radarRatio(value: number | null | undefined, scale: AxisScale, lowerIsBetter = false): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  const r = Math.min(1, Math.max(0, (value - scale.min) / (scale.max - scale.min)))
  return lowerIsBetter ? 1 - r : r
}

/** 第 i 軸（共 n 軸）比例 r 的座標：第一軸朝正上方，順時針 */
export function radarPoint(i: number, n: number, r: number, radius: number, cx: number, cy: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, n)
  return { x: cx + Math.cos(angle) * r * radius, y: cy + Math.sin(angle) * r * radius }
}

/** 軸名稱的對齊方式：左半邊靠右對齊、右半邊靠左、正上下置中 */
export function labelAnchor(i: number, n: number): 'start' | 'middle' | 'end' {
  const x = Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, n))
  if (Math.abs(x) < 0.2) return 'middle'
  return x > 0 ? 'start' : 'end'
}

/** 一個系列的多邊形頂點；沒有值的軸當作 0（畫在中心），同時回傳哪些軸沒有值 */
export function seriesPolygon(
  series: RadarSeries,
  axes: RadarAxis[],
  scales: Record<string, AxisScale>,
  radius: number,
  cx: number,
  cy: number
): { points: Array<{ x: number; y: number; ratio: number | null; axis: RadarAxis }>; path: string } {
  const points = axes.map((a, i) => {
    const ratio = radarRatio(series.values[a.key], scales[a.key], a.lowerIsBetter)
    return { ...radarPoint(i, axes.length, ratio ?? 0, radius, cx, cy), ratio, axis: a }
  })
  const path = points.length ? `M${points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join('L')}Z` : ''
  return { points, path }
}
