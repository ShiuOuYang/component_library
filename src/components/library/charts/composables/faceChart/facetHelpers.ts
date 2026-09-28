import type { ChartDatum, ChartLayer, TooltipPayload } from '../../types/chart.types'

/**
 * 分面圖（FacetedChart / GridFacetChart）共用的小工具：
 * 共用圖例、預設 tooltip 的內容、X 值的讀數格式。
 */

/** 圖層在圖例 / tooltip 上的名稱 */
export function layerLabel(layer: ChartLayer): string {
  return layer.legend?.label || layer.name || ({ bar: '長條', 'stacked-bar': '堆疊長條', line: '折線', area: '面積', scatter: '散點', 'trigger-line': '參考線' } as Record<string, string>)[layer.type] || layer.type
}

/** 圖層的代表色（圖例色塊用） */
export function layerColor(layer: ChartLayer): string {
  return layer.lineColor || layer.color || layer.dotColor || 'currentColor'
}

export interface LegendEntry {
  label: string
  color: string
  type: ChartLayer['type']
}

/**
 * 所有分面的圖層合成一份圖例（同名只列一次）。
 * 堆疊長條以 stackKeys 各段為單位（顏色取 colorScale）。
 */
export function collectLegend(layerGroups: (ChartLayer[] | undefined)[]): LegendEntry[] {
  const seen = new Map<string, LegendEntry>()
  for (const layers of layerGroups) {
    for (const layer of layers ?? []) {
      if (layer.legend?.show === false || layer.type === 'trigger-line') continue
      if (layer.type === 'stacked-bar' && layer.stackKeys?.length) {
        for (const key of layer.stackKeys) {
          if (!seen.has(key)) seen.set(key, { label: key, color: layer.colorScale?.(key) ?? layerColor(layer), type: layer.type })
        }
        continue
      }
      const label = layerLabel(layer)
      if (!seen.has(label)) seen.set(label, { label, color: layerColor(layer), type: layer.type })
    }
  }
  return [...seen.values()]
}

/**
 * 依共用圖例的顯示狀態處理某個分面的圖層：
 *   - 被隱藏的圖層拿掉
 *   - 各分面自己的圖例關掉（已經有共用圖例，不必每一格都畫一份）
 */
export function applySharedLegend(layers: ChartLayer[] | undefined, hidden: Set<string>, sharedLegend: boolean): ChartLayer[] {
  if (!layers) return []
  if (!sharedLegend) return layers
  return layers
    .filter((layer) => layer.type === 'trigger-line' || !hidden.has(layerLabel(layer)))
    .map((layer) => ({ ...layer, legend: { ...layer.legend, show: false } }))
}

/** X 值的讀數：有 formatter 用 formatter，日期用本地格式，其餘轉字串 */
export function formatXValue(value: unknown, format?: ((value: never) => string) | null): string {
  if (value === null || value === undefined) return ''
  if (format) {
    try {
      return format(value as never)
    } catch {
      /* formatter 不接受這個型別時退回預設格式 */
    }
  }
  if (value instanceof Date) {
    const hasTime = value.getHours() || value.getMinutes() || value.getSeconds()
    return hasTime
      ? value.toLocaleString('zh-TW', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      : value.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2)
  return String(value)
}

export interface TooltipRow {
  label: string
  value: string
  color: string
}

/**
 * 預設 tooltip 的內容：X 值 + 這一筆在該圖層的值（依左右軸的格式化函式）。
 *
 * 原本只取 layers[0] 的 yValue —— 滑到第二個圖層（例如右軸的良率折線）時，
 * 顯示的卻是第一個圖層的數字；沒有 yValue 的圖層（堆疊長條）則直接印出整筆 JSON。
 */
export function tooltipRows(
  payload: TooltipPayload,
  formats: { yLeft?: (v: number) => string; yRight?: (v: number) => string }
): { x: string | null; rows: TooltipRow[]; xRaw: unknown } {
  const { data, layer, seriesKey } = payload
  const datum = data as ChartDatum
  const xRaw = layer?.xValue ? layer.xValue(datum) : null
  const fmt = layer?.yAxis === 'right' ? formats.yRight : formats.yLeft
  const show = (v: unknown) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return String(v ?? '')
    return fmt ? fmt(n) : Number.isInteger(n) ? n.toLocaleString('zh-TW') : n.toLocaleString('zh-TW', { maximumFractionDigits: 2 })
  }

  const rows: TooltipRow[] = []
  if (layer?.type === 'stacked-bar' && layer.stackKeys?.length) {
    const keys = seriesKey ? [seriesKey] : layer.stackKeys
    for (const key of keys) {
      rows.push({ label: key, value: show(datum[key]), color: layer.colorScale?.(key) ?? layerColor(layer) })
    }
  } else if (layer?.yValue) {
    rows.push({ label: layerLabel(layer), value: show(layer.yValue(datum)), color: layerColor(layer) })
  }
  return { x: xRaw === null ? null : String(xRaw), rows, xRaw }
}

/** tooltip 用 position: fixed（pageX / pageY 其實是視窗座標）；靠右邊或下邊時翻到游標另一側 */
export function fixedTooltipStyle(position: { pageX: number; pageY: number }, width = 240, height = 120): Record<string, string> {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080
  const left = position.pageX + 14 + width > vw ? position.pageX - 14 - width : position.pageX + 14
  const top = position.pageY + 14 + height > vh ? position.pageY - 14 - height : position.pageY + 14
  return { position: 'fixed', left: `${Math.max(8, left)}px`, top: `${Math.max(8, top)}px` }
}
