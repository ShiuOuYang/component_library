/**
 * JSON 檢視器（ChptJsonViewer）：攤平成列、路徑字串、搜尋、全部展開、差異比對。
 */

export type JsonType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'other'
export type JsonPath = (string | number)[]

export function jsonType(v: unknown): JsonType {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  const t = typeof v
  if (t === 'object') return 'object'
  if (t === 'string' || t === 'number' || t === 'boolean' || t === 'undefined') return t
  return 'other'
}

const isContainer = (v: unknown) => jsonType(v) === 'object' || jsonType(v) === 'array'

/** 子項（物件依鍵的原順序、陣列依索引） */
export function childrenOf(v: unknown): [string | number, unknown][] {
  if (Array.isArray(v)) return v.map((x, i) => [i, x])
  if (jsonType(v) === 'object') return Object.entries(v as Record<string, unknown>)
  return []
}

/** 路徑 → 可貼回程式的字串：data.items[3]["a-b"] */
export function pathString(path: JsonPath, root = ''): string {
  let s = root
  for (const p of path) {
    if (typeof p === 'number') s += `[${p}]`
    else if (/^[A-Za-z_$][\w$]*$/.test(p)) s += s ? `.${p}` : p
    else s += `[${JSON.stringify(p)}]`
  }
  return s
}

/** 路徑的唯一鍵（內部用；與 pathString 不同，不會有歧義） */
export const pathKey = (path: JsonPath) => JSON.stringify(path)

export interface JsonRow {
  path: JsonPath
  key: string
  /** 鍵（根為 null） */
  name: string | number | null
  depth: number
  type: JsonType
  value: unknown
  /** 物件 / 陣列的子項數 */
  size: number
  expanded: boolean
  /** 「還有 N 項」的列（陣列很長時） */
  more?: { remaining: number; parentKey: string }
}

/**
 * 依展開狀態攤平。pageSize：每個容器最多先顯示幾個子項（其餘收成「還有 N 項」，shown 記錄已經多顯示到哪）。
 */
export function flattenJson(
  value: unknown,
  expanded: ReadonlySet<string>,
  opts: { pageSize?: number; shown?: ReadonlyMap<string, number> } = {}
): JsonRow[] {
  const pageSize = opts.pageSize ?? 100
  const rows: JsonRow[] = []
  const walk = (v: unknown, path: JsonPath, name: string | number | null, depth: number) => {
    const key = pathKey(path)
    const type = jsonType(v)
    const kids = childrenOf(v)
    const open = isContainer(v) && expanded.has(key)
    rows.push({ path, key, name, depth, type, value: v, size: kids.length, expanded: open })
    if (!open) return
    const limit = opts.shown?.get(key) ?? pageSize
    kids.slice(0, limit).forEach(([k, c]) => walk(c, [...path, k], k, depth + 1))
    if (kids.length > limit) rows.push({ path: [...path, '…'], key: `${key}…more`, name: null, depth: depth + 1, type: 'other', value: null, size: 0, expanded: false, more: { remaining: kids.length - limit, parentKey: key } })
  }
  walk(value, [], null, 0)
  return rows
}

/** 全部容器的鍵（展開全部用）；maxDepth 限制深度（根 = 0） */
export function containerKeys(value: unknown, maxDepth = Infinity): string[] {
  const keys: string[] = []
  const walk = (v: unknown, path: JsonPath, depth: number) => {
    if (!isContainer(v) || depth > maxDepth) return
    keys.push(pathKey(path))
    for (const [k, c] of childrenOf(v)) walk(c, [...path, k], depth + 1)
  }
  walk(value, [], 0)
  return keys
}

/** 搜尋鍵名或基本型別的值（不分大小寫）→ 符合的路徑 */
export function searchJson(value: unknown, query: string): JsonPath[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const hits: JsonPath[] = []
  const walk = (v: unknown, path: JsonPath) => {
    const name = path[path.length - 1]
    const own = (name !== undefined && String(name).toLowerCase().includes(q)) || (!isContainer(v) && String(v).toLowerCase().includes(q))
    if (own) hits.push(path)
    for (const [k, c] of childrenOf(v)) walk(c, [...path, k])
  }
  walk(value, [])
  return hits
}

/** 某條路徑的所有上層鍵（展開到看得到用） */
export function ancestorPathKeys(path: JsonPath): string[] {
  return path.map((_, i) => pathKey(path.slice(0, i)))
}

export type JsonChange = 'added' | 'removed' | 'changed'

export interface JsonDiff {
  /** 新版的路徑鍵 → 變更（changed 也標在上層容器上） */
  changes: Map<string, JsonChange>
  /** 舊版有、新版沒有的項目（掛在新版的哪個容器下） */
  removed: { parentKey: string; path: JsonPath; name: string | number; value: unknown }[]
  count: { added: number; removed: number; changed: number }
}

/** 比對兩份 JSON（物件依鍵、陣列依索引） */
export function diffJson(before: unknown, after: unknown): JsonDiff {
  const changes = new Map<string, JsonChange>()
  const removed: JsonDiff['removed'] = []
  const count = { added: 0, removed: 0, changed: 0 }
  const mark = (path: JsonPath, c: JsonChange) => {
    changes.set(pathKey(path), c)
    count[c]++
    // 上層容器標成有變更（只在還沒標記時）
    for (const k of ancestorPathKeys(path)) if (!changes.has(k)) changes.set(k, 'changed')
  }
  const walk = (a: unknown, b: unknown, path: JsonPath) => {
    const ta = jsonType(a)
    const tb = jsonType(b)
    if (ta !== tb || !isContainer(b)) {
      if (ta !== tb || a !== b) {
        if (!(Number.isNaN(a) && Number.isNaN(b))) mark(path, 'changed')
      }
      return
    }
    const aMap = new Map(childrenOf(a))
    for (const [k, c] of childrenOf(b)) {
      if (!aMap.has(k)) mark([...path, k], 'added')
      else walk(aMap.get(k), c, [...path, k])
    }
    const bKeys = new Set(childrenOf(b).map(([k]) => k))
    for (const [k, c] of childrenOf(a)) {
      if (bKeys.has(k)) continue
      removed.push({ parentKey: pathKey(path), path: [...path, k], name: k, value: c })
      count.removed++
      for (const key of [...ancestorPathKeys([...path, k])]) if (!changes.has(key)) changes.set(key, 'changed')
    }
  }
  walk(before, after, [])
  return { changes, removed, count }
}

/** 值的簡短預覽（給收合的容器與長字串） */
export function previewValue(v: unknown, maxLength: number): { text: string; truncated: boolean } {
  const t = jsonType(v)
  if (t === 'string') {
    const s = v as string
    return s.length > maxLength ? { text: JSON.stringify(s.slice(0, maxLength)).slice(0, -1) + '…"', truncated: true } : { text: JSON.stringify(s), truncated: false }
  }
  if (t === 'undefined') return { text: 'undefined', truncated: false }
  if (t === 'other') return { text: String(v), truncated: false }
  return { text: JSON.stringify(v), truncated: false }
}
