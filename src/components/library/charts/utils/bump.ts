/**
 * 排名變化圖（BumpChart）的計算：每一期的名次（同分同名次）、各序列的名次走勢與變化。
 */

export interface BumpSeriesInput {
  name: string
  /** 每一期的數值（或名次，見 valueType）；null 為缺期 */
  values: readonly (number | null | undefined)[]
  color?: string
}

export interface BumpRow {
  name: string
  color?: string
  index: number
  values: (number | null)[]
  ranks: (number | null)[]
  /** 第一個 / 最後一個有名次的期 */
  first: number | null
  last: number | null
  best: number | null
  worst: number | null
  /** 名次變化：第一期名次 − 最後一期名次（正的 = 進步） */
  change: number | null
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/**
 * 一期的名次：order 'desc' 數值大的第 1（良率）、'asc' 數值小的第 1（不良率）；
 * 同分同名次，下一名跳號（1、1、3）。缺值為 null。
 */
export function rankPeriod(values: readonly (number | null | undefined)[], order: 'desc' | 'asc' = 'desc'): (number | null)[] {
  const vs = values.map(num)
  const sorted = vs.filter((v): v is number => v !== null).sort((a, b) => (order === 'desc' ? b - a : a - b))
  return vs.map((v) => (v === null ? null : sorted.indexOf(v) + 1))
}

export interface BumpOptions {
  periods: number
  order?: 'desc' | 'asc'
  /** values 本身就是名次 */
  valueType?: 'value' | 'rank'
}

export function bumpRows(series: readonly BumpSeriesInput[], o: BumpOptions): BumpRow[] {
  const values = series.map((s) => Array.from({ length: o.periods }, (_, p) => num(s.values[p])))
  const ranks: (number | null)[][] = series.map(() => [])
  for (let p = 0; p < o.periods; p++) {
    const col = o.valueType === 'rank' ? values.map((v) => (v[p] !== null ? Math.max(1, Math.round(v[p]!)) : null)) : rankPeriod(values.map((v) => v[p]), o.order)
    col.forEach((r, i) => (ranks[i][p] = r))
  }
  return series.map((s, index) => {
    const rs = ranks[index]
    const valid = rs.filter((r): r is number => r !== null)
    const firstIdx = rs.findIndex((r) => r !== null)
    let lastIdx = -1
    for (let i = rs.length - 1; i >= 0; i--) {
      if (rs[i] !== null) {
        lastIdx = i
        break
      }
    }
    const first = firstIdx >= 0 ? rs[firstIdx] : null
    const last = lastIdx >= 0 ? rs[lastIdx] : null
    return {
      name: s.name,
      color: s.color,
      index,
      values: values[index],
      ranks: rs,
      first,
      last,
      best: valid.length ? Math.min(...valid) : null,
      worst: valid.length ? Math.max(...valid) : null,
      change: first !== null && last !== null && firstIdx !== lastIdx ? first - last : null,
    }
  })
}

/** 最大名次（y 軸範圍） */
export function maxRank(rows: readonly BumpRow[]): number {
  let m = 0
  for (const r of rows) for (const x of r.ranks) if (x !== null && x > m) m = x
  return Math.max(1, m)
}

/** 依最後一期名次排序（沒有名次的在最後），鍵盤順序與資料表用 */
export function sortByLastRank(rows: readonly BumpRow[]): BumpRow[] {
  return [...rows].sort((a, b) => {
    if (a.last === null || b.last === null) return a.last === b.last ? a.index - b.index : a.last === null ? 1 : -1
    return a.last - b.last || a.index - b.index
  })
}

/** 同一期、同名次的序列（標籤錯開用）：回傳每個序列在該組中的位置與該組大小 */
export function tieOffsets(rows: readonly BumpRow[], period: number): Map<string, { k: number; n: number }> {
  const groups = new Map<number, BumpRow[]>()
  for (const r of rows) {
    const rank = r.ranks[period]
    if (rank === null || rank === undefined) continue
    const g = groups.get(rank)
    if (g) g.push(r)
    else groups.set(rank, [r])
  }
  const out = new Map<string, { k: number; n: number }>()
  for (const g of groups.values()) g.forEach((r, k) => out.set(r.name, { k, n: g.length }))
  return out
}
