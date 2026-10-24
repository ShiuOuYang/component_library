/**
 * WaterfallChart（瀑布圖）的純函式：把起點、增減、小計整理成每根長條的起訖
 */

/**
 * 項目種類：
 * - start：起點（絕對值，例如投入數、期初）
 * - delta：增減（正數往上、負數往下）
 * - subtotal：小計（畫到目前的累計值；資料的數值會被忽略）
 * - total：總計（同小計，通常放最後）
 */
export type WaterfallKind = 'start' | 'delta' | 'subtotal' | 'total'

export interface WaterfallItem {
  key: string
  label: string
  kind: WaterfallKind
  /** 這一項的數值：start 是絕對值、delta 是增減、subtotal/total 是累計值 */
  value: number
  /** 長條的兩端（累計值），from 是前一項結束的位置 */
  from: number
  to: number
  /** 原始資料；自動加上的總計為 null */
  datum: Record<string, unknown> | null
}

export interface WaterfallOptions {
  labelField: string
  valueField: string
  /** 種類欄位；沒有這個欄位時第一項當起點（firstIsStart），其餘當增減 */
  kindField?: string | null
  keyField?: string | null
  /** 沒有種類欄位時，第一項是起點（絕對值） */
  firstIsStart?: boolean
  /** 最後自動加一根總計（資料裡最後一項已經是 total 時不加） */
  totalLabel?: string | null
}

const KINDS = new Set<WaterfallKind>(['start', 'delta', 'subtotal', 'total'])

/** 整理成每根長條的起訖 */
export function buildWaterfall(data: Record<string, unknown>[], o: WaterfallOptions): WaterfallItem[] {
  const out: WaterfallItem[] = []
  let running = 0
  const usedKeys = new Set<string>()
  data.forEach((d, i) => {
    const rawKind = o.kindField ? d?.[o.kindField] : undefined
    let kind: WaterfallKind
    if (typeof rawKind === 'string' && KINDS.has(rawKind as WaterfallKind)) kind = rawKind as WaterfallKind
    else kind = i === 0 && (o.firstIsStart ?? true) ? 'start' : 'delta'
    const raw = Number(d?.[o.valueField])
    const label = String(d?.[o.labelField] ?? '')
    let key = o.keyField && d?.[o.keyField] !== undefined ? String(d[o.keyField]) : label || String(i)
    // 名稱重複時 key 加上序號，畫面的 v-for 不會撞
    if (usedKeys.has(key)) key = `${key}#${i}`
    usedKeys.add(key)

    if (kind === 'subtotal' || kind === 'total') {
      out.push({ key, label, kind, value: running, from: 0, to: running, datum: d })
      return
    }
    // 不是數字的增減當 0（保留這一項，名稱還看得到）
    const v = Number.isFinite(raw) ? raw : 0
    if (kind === 'start') {
      running = v
      out.push({ key, label, kind, value: v, from: 0, to: v, datum: d })
      return
    }
    out.push({ key, label, kind, value: v, from: running, to: running + v, datum: d })
    running += v
  })
  const last = out[out.length - 1]
  if (o.totalLabel && out.length && last.kind !== 'total') {
    let key = o.totalLabel
    if (usedKeys.has(key)) key = `${key}#total`
    out.push({ key, label: o.totalLabel, kind: 'total', value: running, from: 0, to: running, datum: null })
  }
  return out
}

/**
 * 數值範圍：涵蓋所有長條的兩端。
 * zeroBased 時一定包含 0；否則只看增減的兩端與合計的頂端，下方多留 15% 讓最低的長條看得出長度
 */
export function waterfallExtent(items: WaterfallItem[], zeroBased = true): [number, number] {
  let lo = zeroBased ? 0 : Infinity
  let hi = zeroBased ? 0 : -Infinity
  for (const it of items) {
    // 合計從 0 畫起：不從 0 開始時只看頂端
    const ends = zeroBased || it.kind === 'delta' ? [it.from, it.to] : [it.to]
    for (const v of ends) {
      lo = Math.min(lo, v)
      hi = Math.max(hi, v)
    }
  }
  if (!Number.isFinite(lo)) return [0, 1]
  if (lo === hi) return zeroBased ? [0, 1] : [lo - 1, hi + 1]
  if (zeroBased) return [lo, hi]
  const pad = (hi - lo) * 0.15
  // 不要因為留白跨過 0（全部是正數時軸不該出現負數）
  return [lo > 0 ? Math.max(0, lo - pad) : lo - pad, hi < 0 ? Math.min(0, hi + pad) : hi]
}

/**
 * 增減佔起點的比例（良率損失：這一站報廢了投入數的幾 %）；
 * 前面沒有起點、或起點是 0 時為 null
 */
export function shareOfStart(items: WaterfallItem[], index: number): number | null {
  let start: number | null = null
  for (let i = 0; i <= index; i++) if (items[i].kind === 'start') start = items[i].value
  if (start === null || start === 0) return null
  return items[index].value / start
}
