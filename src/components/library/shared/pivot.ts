/**
 * 樞紐分析表（ChptPivotTable）的計算
 *
 *   - 列（rows）、欄（cols）是分組欄位，可以多層：列「廠 → 線」、欄「月份」
 *   - 值（values）是彙總：加總、平均、計數、最小、最大、不重複計數
 *   - 每一層列都有小計；欄只展開到最後一層（另加一欄總計）
 *   - 一次掃過資料，把每筆加到「每一層列前綴 × 欄（含總計欄）」的累加器裡
 */

export type PivotAgg = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'countDistinct'
export const PIVOT_AGGS: PivotAgg[] = ['sum', 'avg', 'count', 'min', 'max', 'countDistinct']

export interface PivotField {
  key: string
  label: string
  /** dimension 可以拖到列 / 欄；measure 可以拖到值（count 任何欄位都可以） */
  kind?: 'dimension' | 'measure'
  /** 分組值的排序：自訂順序（例如班別 D、E、N） */
  order?: string[]
  /** 數值格式（值欄位） */
  format?: (v: number) => string
}

export interface PivotValue {
  field: string
  agg: PivotAgg
}

export interface PivotConfig {
  rows: string[]
  cols: string[]
  values: PivotValue[]
}

export type PivotRecord = Record<string, unknown>

/** 分組值的文字（null / undefined / 空字串顯示成「（空白）」由元件處理，這裡統一成 ''） */
export const groupKey = (v: unknown): string => (v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : String(v))

/**
 * 路徑 → key：每一段後面加結尾符號，[] 與 [''] （空白分組）才分得開
 */
const END = '\u0003'
export const joinKey = (parts: string[]) => parts.map((p) => `${p}${END}`).join('')
const SEP = '\u0001'

interface Acc {
  sum: number
  count: number
  /** 有數值的筆數（avg 的分母） */
  n: number
  min: number
  max: number
  distinct: Set<string> | null
}
const newAcc = (distinct: boolean): Acc => ({ sum: 0, count: 0, n: 0, min: Infinity, max: -Infinity, distinct: distinct ? new Set() : null })

function addTo(acc: Acc, raw: unknown): void {
  acc.count++
  if (acc.distinct) acc.distinct.add(groupKey(raw))
  const v = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN
  if (!Number.isFinite(v)) return
  acc.n++
  acc.sum += v
  if (v < acc.min) acc.min = v
  if (v > acc.max) acc.max = v
}

function resultOf(acc: Acc | undefined, agg: PivotAgg): number | null {
  if (!acc) return null
  switch (agg) {
    case 'count':
      return acc.count
    case 'countDistinct':
      return acc.distinct?.size ?? 0
    case 'sum':
      return acc.n ? acc.sum : null
    case 'avg':
      return acc.n ? acc.sum / acc.n : null
    case 'min':
      return acc.n ? acc.min : null
    case 'max':
      return acc.n ? acc.max : null
  }
}

/** 分組值排序：自訂順序優先；數字依大小；其他依語系字串；空白排最後 */
export function compareGroup(a: string, b: string, order?: string[]): number {
  if (order) {
    const ia = order.indexOf(a)
    const ib = order.indexOf(b)
    if (ia !== ib) return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib)
  }
  if (a === '' || b === '') return a === b ? 0 : a === '' ? 1 : -1
  const na = Number(a)
  const nb = Number(b)
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
  return a.localeCompare(b, undefined, { numeric: true })
}

export interface PivotRowNode {
  /** 這一列的分組值（從第一層到這一層） */
  path: string[]
  key: string
  depth: number
  /** 最後一層（沒有子列） */
  leaf: boolean
  children: PivotRowNode[]
}

export interface PivotResult {
  /** 列的樹（不含總計） */
  rowTree: PivotRowNode[]
  /** 欄的組合（每一個都是完整的欄位值，依排序） */
  colKeys: string[][]
  /** 取值：rowPath 為 [] 時是總計列；colKey 為 null 時是總計欄 */
  value: (rowPath: string[], colKey: string[] | null, valueIndex: number) => number | null
  /** 參與計算的筆數 */
  count: number
}

/** 計算樞紐 */
export function computePivot(data: PivotRecord[], config: PivotConfig, fields: PivotField[] = []): PivotResult {
  const fieldOf = new Map(fields.map((f) => [f.key, f]))
  const R = config.rows.length
  const needDistinct = config.values.map((v) => v.agg === 'countDistinct')
  // key = 列前綴 SEP 欄（總計欄為 '*'）；每個 value 一個累加器
  const accs = new Map<string, Acc[]>()
  const colSet = new Map<string, string[]>()
  const rowChildren = new Map<string, Set<string>>() // 列前綴 → 下一層的值
  const get = (k: string) => {
    let a = accs.get(k)
    if (!a) accs.set(k, (a = needDistinct.map((d) => newAcc(d))))
    return a
  }
  for (const rec of data) {
    const r = config.rows.map((f) => groupKey(rec[f]))
    const c = config.cols.map((f) => groupKey(rec[f]))
    const cKey = joinKey(c)
    if (config.cols.length && !colSet.has(cKey)) colSet.set(cKey, c)
    for (let i = 0; i <= R; i++) {
      const prefix = joinKey(r.slice(0, i))
      if (i < R) {
        let set = rowChildren.get(prefix)
        if (!set) rowChildren.set(prefix, (set = new Set()))
        set.add(r[i])
      }
      const targets = config.cols.length ? [`${prefix}${SEP}${cKey}`, `${prefix}${SEP}*`] : [`${prefix}${SEP}*`]
      for (const t of targets) {
        const a = get(t)
        config.values.forEach((v, vi) => addTo(a[vi], rec[v.field]))
      }
    }
  }

  // 列的樹
  const build = (prefix: string[], depth: number): PivotRowNode[] => {
    if (depth >= R) return []
    const vals = [...(rowChildren.get(joinKey(prefix)) ?? [])].sort((a, b) => compareGroup(a, b, fieldOf.get(config.rows[depth])?.order))
    return vals.map((v) => {
      const path = [...prefix, v]
      return { path, key: joinKey(path), depth, leaf: depth === R - 1, children: build(path, depth + 1) }
    })
  }
  const rowTree = build([], 0)

  const colKeys = [...colSet.values()].sort((a, b) => {
    for (let i = 0; i < a.length; i++) {
      const d = compareGroup(a[i], b[i], fieldOf.get(config.cols[i])?.order)
      if (d) return d
    }
    return 0
  })

  return {
    rowTree,
    colKeys,
    count: data.length,
    value: (rowPath, colKey, vi) => {
      const v = config.values[vi]
      if (!v) return null
      const k = `${joinKey(rowPath)}${SEP}${colKey ? joinKey(colKey) : '*'}`
      return resultOf(accs.get(k)?.[vi], v.agg)
    },
  }
}

/** 依目前展開狀態攤平成要畫的列；collapsed 是收起來的列 key */
export function visibleRows(tree: PivotRowNode[], collapsed: Set<string>): PivotRowNode[] {
  const out: PivotRowNode[] = []
  const walk = (nodes: PivotRowNode[]) => {
    for (const n of nodes) {
      out.push(n)
      if (!n.leaf && !collapsed.has(n.key)) walk(n.children)
    }
  }
  walk(tree)
  return out
}

/** 把欄位從一個區移到另一個區（不改原物件）；同一個欄位不會同時在列與欄 */
export function moveField(config: PivotConfig, field: string, to: 'rows' | 'cols' | 'values' | 'none', index?: number, agg: PivotAgg = 'sum'): PivotConfig {
  const rows = config.rows.filter((f) => f !== field)
  const cols = config.cols.filter((f) => f !== field)
  let values = config.values
  if (to === 'rows') rows.splice(index ?? rows.length, 0, field)
  if (to === 'cols') cols.splice(index ?? cols.length, 0, field)
  if (to === 'values') values = [...values.slice(0, index ?? values.length), { field, agg }, ...values.slice(index ?? values.length)]
  return { rows, cols, values }
}

/** 同一區裡往前 / 往後移一格 */
export function reorder<T>(list: T[], from: number, delta: number): T[] {
  const to = from + delta
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  const [x] = next.splice(from, 1)
  next.splice(to, 0, x)
  return next
}
