/**
 * PieChart 的純函式：整理扇形、指定顏色
 */

/** 整理後的一個扇形 */
export interface PieSlice {
  key: string
  label: string
  value: number
  /** 原始資料；「其他」為 null */
  datum: Record<string, unknown> | null
  isOthers: boolean
  /** 併進「其他」的原始資料 */
  members: Record<string, unknown>[]
  /** 類別色的序號（依資料順序；「其他」為 -1） */
  colorIndex: number
}

export interface PieOptions {
  labelField: string
  valueField: string
  keyField: string
  keyFn: ((datum: Record<string, unknown>, index: number) => string) | null
  /** 最多幾塊（含「其他」）；超過時最小的幾塊併成「其他」 */
  maxSlices: number
  othersLabel: string
  sort: 'desc' | 'none'
}

/**
 * 整理扇形。
 *
 * - 數值不是正數的略過（扇形沒有負的或零的面積），回傳 skipped
 * - 超過 maxSlices 時，最小的幾塊併成「其他」（放最後）
 * - 🔧 顏色依「資料順序」指定，不依大小排名：數值變了、排名換了，同一個項目還是同一個顏色
 */
export function preparePie(rows: Record<string, unknown>[], o: PieOptions): { slices: PieSlice[]; skipped: number } {
  const all: PieSlice[] = []
  let skipped = 0
  rows.forEach((d, i) => {
    const raw = d?.[o.valueField]
    const value = raw === null || raw === undefined || raw === '' ? NaN : Number(raw)
    if (!Number.isFinite(value) || value <= 0) {
      skipped++
      return
    }
    const rawKey = o.keyFn ? o.keyFn(d, i) : d[o.keyField]
    const label = String(d[o.labelField] ?? '')
    const key = rawKey === null || rawKey === undefined || rawKey === '' ? label || String(i) : String(rawKey)
    all.push({ key, label, value, datum: d, isOthers: false, members: [], colorIndex: 0 })
  })

  const limit = Math.max(2, Math.floor(o.maxSlices))
  let kept = all
  let others: PieSlice | null = null
  if (all.length > limit) {
    // 留下最大的 limit − 1 塊，其餘併成「其他」
    const byValue = [...all].sort((a, b) => b.value - a.value)
    const keepSet = new Set(byValue.slice(0, limit - 1))
    kept = all.filter((s) => keepSet.has(s))
    const rest = all.filter((s) => !keepSet.has(s))
    others = {
      key: '__others__',
      label: o.othersLabel,
      value: rest.reduce((sum, s) => sum + s.value, 0),
      datum: null,
      isOthers: true,
      members: rest.map((s) => s.datum!),
      colorIndex: -1,
    }
  }
  kept.forEach((s, i) => {
    s.colorIndex = i
  })
  const ordered = o.sort === 'desc' ? [...kept].sort((a, b) => b.value - a.value) : kept
  return { slices: others ? [...ordered, others] : ordered, skipped }
}
