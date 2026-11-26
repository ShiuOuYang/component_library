/**
 * 馬賽克圖（MarimekkoChart）的計算
 *
 * 欄寬 = 該欄總量占全部的比例（例如各產線的產量 / 不良數），欄內各段高度 = 該欄內各類別的比例（例如不良類型組成）。
 * 另外算出每一格的 Pearson 殘差 (觀察 − 期望) / √期望：期望 = 欄總量 × 類別總量 ÷ 全部，
 * 殘差大的格子代表「這條線的這種不良比別人多」。
 */

export interface MekkoInput {
  /** 欄（例如產線） */
  x: string | number
  /** 段（例如不良類型） */
  y: string | number
  value: number
}

export interface MekkoCell {
  x: string
  y: string
  value: number
  /** 欄內比例（0～1） */
  share: number
  /** 占全部的比例 */
  shareTotal: number
  expected: number
  /** Pearson 殘差 (觀察 − 期望) / √期望 */
  residual: number
}

export interface MekkoColumn {
  key: string
  total: number
  /** 欄寬比例 */
  share: number
  cells: MekkoCell[]
}

export interface MekkoData {
  columns: MekkoColumn[]
  /** 段的順序（含「其他」） */
  segments: string[]
  segmentTotals: Map<string, number>
  total: number
  /** 被併成「其他」的類別 */
  folded: string[]
}

export interface MekkoOptions {
  /** 欄排序：照輸入 / 總量由大到小 */
  sortColumns?: 'input' | 'total'
  /** 段排序：照輸入 / 總量由大到小 */
  sortSegments?: 'input' | 'total'
  /** 最多幾段，其餘併成 otherLabel（依總量取前幾名） */
  maxSegments?: number
  otherLabel?: string
}

const key = (v: unknown) => String(v)

export function buildMekko(rows: readonly MekkoInput[], o: MekkoOptions = {}): MekkoData {
  const clean = rows.filter((r) => r && Number.isFinite(r.value) && r.value > 0)
  const colOrder: string[] = []
  const segOrder: string[] = []
  const segTotals = new Map<string, number>()
  for (const r of clean) {
    const x = key(r.x)
    const y = key(r.y)
    if (!colOrder.includes(x)) colOrder.push(x)
    if (!segOrder.includes(y)) segOrder.push(y)
    segTotals.set(y, (segTotals.get(y) ?? 0) + r.value)
  }
  // 併成「其他」：依總量取前 maxSegments − 1 名
  const max = o.maxSegments ?? Infinity
  const other = o.otherLabel ?? 'Other'
  let folded: string[] = []
  const rename = new Map<string, string>()
  if (segOrder.length > max && max >= 2) {
    const keep = new Set([...segOrder].sort((a, b) => segTotals.get(b)! - segTotals.get(a)!).slice(0, max - 1))
    folded = segOrder.filter((s) => !keep.has(s))
    for (const s of folded) rename.set(s, other)
  }
  const values = new Map<string, Map<string, number>>()
  const segmentTotals = new Map<string, number>()
  let total = 0
  for (const r of clean) {
    const x = key(r.x)
    const y = rename.get(key(r.y)) ?? key(r.y)
    const m = values.get(x) ?? new Map<string, number>()
    m.set(y, (m.get(y) ?? 0) + r.value)
    values.set(x, m)
    segmentTotals.set(y, (segmentTotals.get(y) ?? 0) + r.value)
    total += r.value
  }
  let segments = segOrder.filter((s) => !rename.has(s))
  if (folded.length) segments.push(other)
  if (o.sortSegments === 'total') {
    // 「其他」固定在最後
    const named = segments.filter((s) => !(folded.length && s === other)).sort((a, b) => segmentTotals.get(b)! - segmentTotals.get(a)!)
    segments = folded.length ? [...named, other] : named
  }
  // 只收正值，所以有欄時欄總量、全部與期望值都大於 0
  let columns: MekkoColumn[] = colOrder.map((x) => {
    const m = values.get(x)!
    const colTotal = [...m.values()].reduce((s, v) => s + v, 0)
    return {
      key: x,
      total: colTotal,
      share: colTotal / total,
      cells: segments.map((y) => {
        const value = m.get(y) ?? 0
        const expected = (colTotal * segmentTotals.get(y)!) / total
        return { x, y, value, share: value / colTotal, shareTotal: value / total, expected, residual: (value - expected) / Math.sqrt(expected) }
      }),
    }
  })
  if (o.sortColumns === 'total') columns = [...columns].sort((a, b) => b.total - a.total)
  return { columns, segments, segmentTotals, total, folded }
}

export interface MekkoRect {
  cell: MekkoCell
  col: number
  seg: number
  x: number
  y: number
  w: number
  h: number
}

/** 版面：欄由左到右、段由上到下；欄之間留 gap px */
export function mekkoLayout(data: MekkoData, width: number, height: number, gap = 2): { rects: MekkoRect[]; columns: { x: number; w: number }[] } {
  const n = data.columns.length
  const usable = Math.max(0, width - gap * Math.max(0, n - 1))
  const columns: { x: number; w: number }[] = []
  const rects: MekkoRect[] = []
  let x = 0
  data.columns.forEach((c, ci) => {
    const w = usable * c.share
    columns.push({ x, w })
    let y = 0
    c.cells.forEach((cell, si) => {
      const h = height * cell.share
      rects.push({ cell, col: ci, seg: si, x, y, w, h })
      y += h
    })
    x += w + gap
  })
  return { rects, columns }
}

/** 卡方統計量與自由度（看整體組成是否有差異） */
export function mekkoChiSquare(data: MekkoData): { chi2: number; df: number } {
  let chi2 = 0
  for (const c of data.columns) for (const cell of c.cells) chi2 += cell.residual ** 2
  return { chi2, df: Math.max(0, data.columns.length - 1) * Math.max(0, data.segments.length - 1) }
}
