/**
 * 參數比對（ChptDiffViewer）：比對兩組巢狀參數（配方 A / B、機台設定修改前後、兩條線的參數）
 *
 *   - 巢狀物件、陣列攤平成路徑：`oven.zones[2].temp`
 *   - 每一個路徑的狀態：added（右邊才有）、removed（左邊才有）、changed、within（數值差在容許範圍內）、same
 *   - 數值容許差：全域 tolerance，或依路徑指定（`oven.zones[*].temp`、`oven.*`）
 *   - 再組回樹狀：每個群組記下底下各狀態的數量，摺疊時也看得出哪裡有變
 */

export type ParamValue = string | number | boolean | null | undefined | ParamValue[] | { [key: string]: ParamValue }
export type ParamObject = { [key: string]: ParamValue }

export type DiffStatus = 'added' | 'removed' | 'changed' | 'within' | 'same'
export const DIFF_STATUSES: DiffStatus[] = ['changed', 'added', 'removed', 'within', 'same']

/** 葉節點的值（基本型別，或空物件 / 空陣列） */
export type LeafValue = string | number | boolean | null | Record<string, never> | never[]

const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const hasChildren = (v: unknown) => (Array.isArray(v) ? v.length > 0 : isPlainObject(v) && Object.keys(v).length > 0)

/** 路徑接上一段：物件 key 用 `.`、陣列 index 用 `[i]`；key 含特殊字元時用 `["…"]` */
export const joinPath = (base: string, key: string | number): string =>
  typeof key === 'number' ? `${base}[${key}]` : /^[A-Za-z_$][\w$-]*$/.test(key) ? (base ? `${base}.${key}` : key) : `${base}[${JSON.stringify(key)}]`

/** 攤平成「路徑 → 葉節點值」（保留順序：先左後右第一次出現的位置） */
export function flattenParams(value: ParamValue, base = '', out = new Map<string, LeafValue>()): Map<string, LeafValue> {
  if (hasChildren(value)) {
    if (Array.isArray(value)) value.forEach((v, i) => flattenParams(v, joinPath(base, i), out))
    else for (const [k, v] of Object.entries(value as Record<string, ParamValue>)) if (v !== undefined) flattenParams(v, joinPath(base, k), out)
  } else if (base) out.set(base, (value === undefined ? null : value) as LeafValue)
  return out
}

/** 容許差：全域數字，或依路徑（`*` 對任何一段；結尾 `.*` 也對底下所有路徑） */
export type ToleranceMap = Record<string, number>

function patternToRegex(pattern: string): RegExp {
  const esc = pattern.replace(/[.+?^${}()|\\]/g, '\\$&').replace(/\[/g, '\\[').replace(/\]/g, '\\]')
  // `\[*\]` → 任何 index；`*` → 任何一段（不含 . 與 [）
  const re = esc.replace(/\\\[\*\\\]/g, '\\[\\d+\\]').replace(/\*/g, '[^.[]+')
  return new RegExp(`^${re}$`)
}

/** 依路徑找設定值（容許差、單位）：完全相符優先，其次是有萬用字元的（越長越優先） */
export function lookupPath<T>(path: string, map: Record<string, T> | undefined): T | undefined {
  if (!map) return undefined
  if (path in map) return map[path]
  const hits = Object.keys(map)
    .filter((p) => p.includes('*') && (patternToRegex(p).test(path) || (p.endsWith('.*') && path.startsWith(p.slice(0, -1)))))
    .sort((a, b) => b.length - a.length)
  return hits.length ? map[hits[0]] : undefined
}

/** 某個路徑的容許差：依路徑的設定優先，否則用全域 tolerance */
export const toleranceFor = (path: string, tolerance: number | undefined, map: ToleranceMap | undefined): number => lookupPath(path, map) ?? tolerance ?? 0

export interface DiffRow {
  path: string
  left: LeafValue | undefined
  right: LeafValue | undefined
  status: DiffStatus
  /** 兩邊都是數字時：右 − 左 */
  delta?: number
  /** 兩邊都是數字且左邊不為 0 時：變化百分比 */
  pct?: number
}

const same = (a: LeafValue, b: LeafValue) => (typeof a === 'object' && a !== null ? JSON.stringify(a) === JSON.stringify(b) : Object.is(a, b) || a === b)

/** 逐一比對；回傳順序依左邊的順序，右邊才有的接在它前一個路徑之後 */
export function diffParams(left: ParamValue, right: ParamValue, opts: { tolerance?: number; tolerances?: ToleranceMap } = {}): DiffRow[] {
  const L = flattenParams(left)
  const R = flattenParams(right)
  // 合併順序：以左邊為主，右邊新的插在前一個共同路徑之後
  const order = [...L.keys()]
  let insertAt = 0
  for (const k of R.keys()) {
    const i = order.indexOf(k)
    if (i >= 0) insertAt = i + 1
    else order.splice(insertAt++, 0, k)
  }
  return order.map((path) => {
    const inL = L.has(path)
    const inR = R.has(path)
    const l = L.get(path)
    const r = R.get(path)
    if (!inL) return { path, left: undefined, right: r, status: 'added' }
    if (!inR) return { path, left: l, right: undefined, status: 'removed' }
    if (typeof l === 'number' && typeof r === 'number') {
      const delta = r - l
      const row: DiffRow = { path, left: l, right: r, status: 'same', delta, pct: l !== 0 ? (delta / Math.abs(l)) * 100 : undefined }
      if (delta === 0) return row
      // 加一點點誤差，0.1 + 0.2 這類浮點數不會被算成超出
      const tol = toleranceFor(path, opts.tolerance, opts.tolerances)
      row.status = Math.abs(delta) <= tol + 1e-9 ? 'within' : 'changed'
      return row
    }
    return { path, left: l, right: r, status: same(l as LeafValue, r as LeafValue) ? 'same' : 'changed' }
  })
}

export type DiffCounts = Record<DiffStatus, number>
export function countDiff(rows: DiffRow[]): DiffCounts {
  const out: DiffCounts = { added: 0, removed: 0, changed: 0, within: 0, same: 0 }
  for (const r of rows) out[r.status]++
  return out
}

/** 路徑拆成段：`a.b[2]["x y"]` → ['a', 'b', '[2]', '["x y"]'] */
export function splitPath(path: string): string[] {
  return path.match(/\[[^\]]*\]|[^.[\]]+/g) ?? [path]
}

export interface DiffTreeNode {
  /** 這個節點的完整路徑 */
  path: string
  /** 顯示的名稱（最後一段） */
  key: string
  depth: number
  /** 葉節點才有 */
  row?: DiffRow
  children: DiffTreeNode[]
  /** 底下（含自己）各狀態的數量 */
  counts: DiffCounts
}

/** 組成樹狀 */
export function buildDiffTree(rows: DiffRow[]): DiffTreeNode[] {
  const root: DiffTreeNode = { path: '', key: '', depth: -1, children: [], counts: countDiff([]) }
  const index = new Map<string, DiffTreeNode>([['', root]])
  for (const row of rows) {
    const segs = splitPath(row.path)
    let parent = root
    let path = ''
    segs.forEach((seg, i) => {
      path = seg.startsWith('[') ? `${path}${seg}` : path ? `${path}.${seg}` : seg
      let node = index.get(path)
      if (!node) {
        node = { path, key: seg, depth: i, children: [], counts: countDiff([]) }
        index.set(path, node)
        parent.children.push(node)
      }
      node.counts[row.status]++
      if (i === segs.length - 1) node.row = row
      parent = node
    })
  }
  // 只有一個子節點的群組併成一列（zones › [1] › temp → zones › [1].temp），不會一層一層點開才看到一個值
  const compact = (n: DiffTreeNode): DiffTreeNode => {
    n.children = n.children.map(compact)
    if (n.row || n.children.length !== 1) return n
    const c = n.children[0]
    return { ...c, key: c.key.startsWith('[') ? `${n.key}${c.key}` : `${n.key}.${c.key}` }
  }
  const setDepth = (n: DiffTreeNode, d: number) => {
    n.depth = d
    n.children.forEach((c) => setDepth(c, d + 1))
  }
  const out = root.children.map(compact)
  out.forEach((n) => setDepth(n, 0))
  return out
}

/** 一個節點底下有沒有「不一樣」（changed / added / removed；within 不算） */
export const hasChanges = (c: DiffCounts) => c.changed + c.added + c.removed > 0

/** 顯示用的值：字串加引號、null 顯示 null、空物件 / 陣列 {} / [] */
export function formatParam(v: LeafValue | undefined): string {
  if (v === undefined) return ''
  if (typeof v === 'string') return JSON.stringify(v)
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}
