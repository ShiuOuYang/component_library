/**
 * 啞鈴圖 / 斜率圖（DumbbellChart）的計算：每一列前後兩個值、變化量、變好或變差、排序、數值範圍，
 * 以及斜率圖兩側標籤的避讓。
 */

export interface DumbbellDatum {
  label: string
  /** 改善前 / 上期 / 目標 */
  before: number | null | undefined
  /** 改善後 / 本期 / 實際 */
  after: number | null | undefined
  color?: string
}

/** 越大越好、越小越好、或不判斷好壞 */
export type DumbbellDirection = 'higher' | 'lower' | 'none'
export type DumbbellSort = 'none' | 'change' | 'absChange' | 'before' | 'after' | 'label'
export type DumbbellStatus = 'better' | 'worse' | 'same' | 'neutral'

export interface DumbbellRow {
  label: string
  before: number | null
  after: number | null
  /** after − before（任一缺值時為 null） */
  delta: number | null
  /** 變化百分比（before 為 0 或缺值時為 null） */
  pct: number | null
  status: DumbbellStatus
  color?: string
  /** 原本的位置 */
  index: number
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** 整理每一列：變化量、百分比、變好或變差（|delta| ≤ tolerance 視為持平） */
export function dumbbellRows(data: readonly DumbbellDatum[], direction: DumbbellDirection = 'higher', tolerance = 0): DumbbellRow[] {
  return data.map((d, index) => {
    const before = num(d.before)
    const after = num(d.after)
    const delta = before !== null && after !== null ? after - before : null
    const pct = delta !== null && before !== 0 ? delta / Math.abs(before!) : null
    let status: DumbbellStatus = 'neutral'
    if (direction !== 'none' && delta !== null) {
      if (Math.abs(delta) <= tolerance) status = 'same'
      else status = (delta > 0) === (direction === 'higher') ? 'better' : 'worse'
    }
    return { label: d.label, before, after, delta, pct, status, color: d.color, index }
  })
}

/**
 * 排序：change 依變化量（改善最多的在上；direction 為 none 時由大到小）、absChange 依變化幅度、
 * before / after 依值由大到小、label 依名稱。缺值的列排最後。descending = false 時反過來（缺值仍在最後）。
 */
export function sortDumbbellRows(rows: readonly DumbbellRow[], sort: DumbbellSort, direction: DumbbellDirection = 'higher', descending = true): DumbbellRow[] {
  if (sort === 'none') return [...rows]
  if (sort === 'label') {
    const out = [...rows].sort((a, b) => a.label.localeCompare(b.label) || a.index - b.index)
    return descending ? out : out.reverse()
  }
  const key = (r: DumbbellRow): number | null => {
    if (sort === 'before') return r.before
    if (sort === 'after') return r.after
    if (r.delta === null) return null
    if (sort === 'absChange') return Math.abs(r.delta)
    // 改善量：越小越好時，下降越多越好
    return direction === 'lower' ? -r.delta : r.delta
  }
  return [...rows].sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    if (ka === null || kb === null) return ka === kb ? a.index - b.index : ka === null ? 1 : -1
    return (descending ? kb - ka : ka - kb) || a.index - b.index
  })
}

/** 數值範圍：涵蓋所有值（與 extra，例如參考線、0），兩邊留一點空間；全部缺值時回傳 [0, 1] */
export function dumbbellDomain(rows: readonly DumbbellRow[], extra: readonly number[] = [], padding = 0.05): [number, number] {
  const vals = [...rows.flatMap((r) => [r.before, r.after]), ...extra].filter((v): v is number => v !== null && Number.isFinite(v))
  if (!vals.length) return [0, 1]
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  if (lo === hi) {
    const d = Math.abs(lo) * 0.1 || 1
    lo -= d
    hi += d
  }
  const pad = (hi - lo) * padding
  // 不要因為留白讓全為正的資料跨到負的
  return [lo >= 0 && lo - pad < 0 ? 0 : lo - pad, hi + pad]
}

export interface DumbbellSummary {
  better: number
  worse: number
  same: number
  /** 有前後兩個值的列數 */
  compared: number
  /** 平均變化量 */
  meanDelta: number | null
}

export function dumbbellSummary(rows: readonly DumbbellRow[]): DumbbellSummary {
  const done = rows.filter((r) => r.delta !== null)
  return {
    better: rows.filter((r) => r.status === 'better').length,
    worse: rows.filter((r) => r.status === 'worse').length,
    same: rows.filter((r) => r.status === 'same').length,
    compared: done.length,
    meanDelta: done.length ? done.reduce((s, r) => s + r.delta!, 0) / done.length : null,
  }
}

/**
 * 標籤避讓（斜率圖兩側）：輸入每個標籤想放的位置，輸出不重疊（間距 ≥ gap）、盡量靠近原位、
 * 且在 [min, max] 範圍內的位置；順序與輸入相同。
 */
export function dodgeLabels(positions: readonly number[], gap: number, min = -Infinity, max = Infinity): number[] {
  const order = positions.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p || a.i - b.i)
  // 依序合併重疊的群組，每群以平均位置為中心排開
  type Cluster = { start: number; items: number[]; sum: number }
  const clusters: Cluster[] = []
  for (const { p, i } of order) {
    clusters.push({ start: p, items: [i], sum: p })
    for (;;) {
      const c = clusters[clusters.length - 1]
      const n = c.items.length
      c.start = Math.min(max - (n - 1) * gap, Math.max(min, c.sum / n - ((n - 1) * gap) / 2))
      const prev = clusters[clusters.length - 2]
      if (!prev || prev.start + prev.items.length * gap <= c.start + 1e-9) break
      prev.items.push(...c.items)
      prev.sum += c.sum
      clusters.pop()
    }
  }
  const out = new Array<number>(positions.length)
  for (const c of clusters) c.items.forEach((i, k) => (out[i] = c.start + k * gap))
  return out
}
