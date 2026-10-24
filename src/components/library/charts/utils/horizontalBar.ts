/**
 * HorizontalBarChart 的純函式：整理排行資料、長條路徑
 */

/** 整理後的一列 */
export interface RankItem {
  key: string
  label: string
  value: number
  /** 原始資料；「其他」為 null */
  datum: Record<string, unknown> | null
  /** 「其他」：topN 之外的項目加總 */
  isOthers: boolean
  /** 併進「其他」的原始資料 */
  members: Record<string, unknown>[]
}

export interface RankOptions {
  labelField: string
  valueField: string
  keyField: string
  keyFn: ((datum: Record<string, unknown>, index: number) => string) | null
  sort: 'desc' | 'asc' | 'none'
  topN: number | null
  showOthers: boolean
  othersLabel: string
}

/**
 * 整理排行：取值、排序、取前 N 名，其餘可併成「其他」（排在最後，不參與排序）。
 * 數值不是有限數字的列略過（回傳 skipped 筆數）。
 */
export function prepareRanking(rows: Record<string, unknown>[], o: RankOptions): { items: RankItem[]; skipped: number } {
  const items: RankItem[] = []
  let skipped = 0
  rows.forEach((d, i) => {
    const raw = d?.[o.valueField]
    const value = raw === null || raw === undefined || raw === '' ? NaN : Number(raw)
    if (!Number.isFinite(value)) {
      skipped++
      return
    }
    const rawKey = o.keyFn ? o.keyFn(d, i) : d[o.keyField]
    const label = String(d[o.labelField] ?? '')
    const key = rawKey === null || rawKey === undefined || rawKey === '' ? label || String(i) : String(rawKey)
    items.push({ key, label, value, datum: d, isOthers: false, members: [] })
  })
  if (o.sort === 'desc') items.sort((a, b) => b.value - a.value)
  else if (o.sort === 'asc') items.sort((a, b) => a.value - b.value)

  const n = o.topN !== null && o.topN > 0 ? Math.floor(o.topN) : null
  if (n === null || items.length <= n) return { items, skipped }
  const kept = items.slice(0, n)
  const rest = items.slice(n)
  if (o.showOthers) {
    kept.push({
      key: '__others__',
      label: `${o.othersLabel}（${rest.length} 項）`,
      value: rest.reduce((s, r) => s + r.value, 0),
      datum: null,
      isOthers: true,
      members: rest.map((r) => r.datum!),
    })
  }
  return { items: kept, skipped }
}

/**
 * 水平長條的路徑：資料端 4px 圓角、基線端方角（長條從同一條基線長出來）。
 * x0 是基線、x1 是資料端；x1 < x0 時（負值）圓角在左邊。
 */
export function barPath(x0: number, x1: number, y: number, h: number, radius = 4): string {
  const w = Math.abs(x1 - x0)
  if (w === 0 || h <= 0) return ''
  const r = Math.max(0, Math.min(radius, h / 2, w))
  if (x1 >= x0) {
    return `M${x0},${y} H${x1 - r} A${r},${r} 0 0 1 ${x1},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x1 - r},${y + h} H${x0} Z`
  }
  return `M${x0},${y} H${x1 + r} A${r},${r} 0 0 0 ${x1},${y + r} V${y + h - r} A${r},${r} 0 0 0 ${x1 + r},${y + h} H${x0} Z`
}

/** 依估計寬度截斷文字，超出時補「…」 */
export function truncateText(text: string, maxWidth: number, measure: (s: string) => number): string {
  if (measure(text) <= maxWidth) return text
  const chars = Array.from(text)
  let lo = 0
  let hi = chars.length
  // 二分找最長的前綴
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (measure(chars.slice(0, mid).join('') + '…') <= maxWidth) lo = mid
    else hi = mid - 1
  }
  return lo > 0 ? chars.slice(0, lo).join('') + '…' : ''
}
