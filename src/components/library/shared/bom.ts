/**
 * 多階 BOM（ChptBomTree）：展開、用量連乘、依庫存算缺料（可扣抵半成品庫存）、反查（where-used）、兩個版次的差異。
 */

export interface BomItem {
  /** 同一層要不重複；不給時用料號 */
  id?: string
  partNo: string
  name?: string
  /** 每一個上階要用幾個（根節點忽略） */
  qty: number
  unit?: string
  /** 關鍵料（長交期、獨家供應） */
  critical?: boolean
  /** 位置號（例如 R1, R2, C5） */
  ref?: string
  children?: BomItem[]
}

export const bomKeyOf = (item: BomItem) => item.id ?? item.partNo

export interface BomRow {
  /** 路徑（根到這一層的 key，用 / 串起來） */
  key: string
  item: BomItem
  /** 0 = 根 */
  level: number
  parentKey: string | null
  hasChildren: boolean
  /** 從根到這一層的用量連乘（一台成品要幾個） */
  perUnit: number
}

/** 依展開狀態攤平成列（根一定顯示） */
export function flattenBom(root: BomItem, expanded: ReadonlySet<string>): BomRow[] {
  const rows: BomRow[] = []
  const walk = (item: BomItem, level: number, parentKey: string | null, perUnit: number) => {
    const key = parentKey === null ? bomKeyOf(item) : `${parentKey}/${bomKeyOf(item)}`
    const kids = item.children ?? []
    rows.push({ key, item, level, parentKey, hasChildren: kids.length > 0, perUnit })
    if (kids.length && expanded.has(key)) for (const c of kids) walk(c, level + 1, key, perUnit * c.qty)
  }
  walk(root, 0, null, 1)
  return rows
}

/** 全部節點的 key（展開全部用）；maxLevel 限制深度 */
export function allBomKeys(root: BomItem, maxLevel = Infinity): string[] {
  const keys: string[] = []
  const walk = (item: BomItem, level: number, parentKey: string | null) => {
    const key = parentKey === null ? bomKeyOf(item) : `${parentKey}/${bomKeyOf(item)}`
    if (item.children?.length && level < maxLevel) {
      keys.push(key)
      for (const c of item.children) walk(c, level + 1, key)
    }
  }
  walk(root, 0, null)
  return keys
}

export interface BomNeed {
  /** 毛需求（不扣庫存） */
  gross: number
  /** 這一層用掉的庫存 */
  fromStock: number
  /** 淨需求（扣掉庫存後還要的） */
  net: number
}

export interface BomPartNeed {
  partNo: string
  name?: string
  unit?: string
  critical: boolean
  /** 合計需求（淨需求的合計；netting=false 時為毛需求） */
  required: number
  stock: number
  shortage: number
}

/**
 * 依生產數量展開需求。
 * netting=true：依深度優先順序扣庫存（半成品有庫存時，下階少用）；同料號多處使用時共用庫存。
 * 缺料只算葉節點（採購件）：netting 時為各處淨需求的合計，否則為毛需求合計 − 庫存。
 */
export function explodeBom(
  root: BomItem,
  buildQty: number,
  stock: Readonly<Record<string, number>>,
  netting = true
): { needs: Map<string, BomNeed>; parts: BomPartNeed[] } {
  const pool = new Map(Object.entries(stock).map(([k, v]) => [k, Math.max(0, v)]))
  const needs = new Map<string, BomNeed>()
  const parts = new Map<string, BomPartNeed>()
  const walk = (item: BomItem, parentKey: string | null, need: number) => {
    const key = parentKey === null ? bomKeyOf(item) : `${parentKey}/${bomKeyOf(item)}`
    const isRoot = parentKey === null
    let fromStock = 0
    if (netting && !isRoot) {
      fromStock = Math.min(need, pool.get(item.partNo) ?? 0)
      pool.set(item.partNo, (pool.get(item.partNo) ?? 0) - fromStock)
    }
    const net = need - fromStock
    needs.set(key, { gross: need, fromStock, net })
    const kids = item.children ?? []
    if (kids.length) {
      for (const c of kids) walk(c, key, net * c.qty)
    } else if (!isRoot) {
      const p = parts.get(item.partNo) ?? { partNo: item.partNo, name: item.name, unit: item.unit, critical: false, required: 0, stock: Math.max(0, stock[item.partNo] ?? 0), shortage: 0 }
      p.required += need
      p.shortage += net
      p.critical ||= !!item.critical
      parts.set(item.partNo, p)
    }
  }
  walk(root, null, Math.max(0, buildQty))
  if (!netting) for (const p of parts.values()) p.shortage = Math.max(0, p.required - p.stock)
  return { needs, parts: [...parts.values()] }
}

/** 反查：料號用在哪些地方（每條路徑是根到該料號的品名 / 料號） */
export function whereUsed(root: BomItem, partNo: string): { key: string; path: BomItem[]; perUnit: number }[] {
  const q = partNo.trim().toUpperCase()
  if (!q) return []
  const hits: { key: string; path: BomItem[]; perUnit: number }[] = []
  const walk = (item: BomItem, parentKey: string | null, path: BomItem[], perUnit: number) => {
    const key = parentKey === null ? bomKeyOf(item) : `${parentKey}/${bomKeyOf(item)}`
    const here = [...path, item]
    if (parentKey !== null && item.partNo.toUpperCase() === q) hits.push({ key, path: here, perUnit })
    for (const c of item.children ?? []) walk(c, key, here, perUnit * c.qty)
  }
  walk(root, null, [], 1)
  return hits
}

/** 搜尋（料號、品名、位置號，不分大小寫的部分比對）→ 符合的 key */
export function searchBom(root: BomItem, query: string): Set<string> {
  const q = query.trim().toLowerCase()
  const hits = new Set<string>()
  if (!q) return hits
  const walk = (item: BomItem, parentKey: string | null) => {
    const key = parentKey === null ? bomKeyOf(item) : `${parentKey}/${bomKeyOf(item)}`
    if ([item.partNo, item.name ?? '', item.ref ?? ''].some((t) => t.toLowerCase().includes(q))) hits.add(key)
    for (const c of item.children ?? []) walk(c, key)
  }
  walk(root, null)
  return hits
}

/** key 的所有上階 key（展開到看得到用） */
export function ancestorKeys(key: string): string[] {
  const segs = key.split('/')
  return segs.slice(0, -1).map((_, i) => segs.slice(0, i + 1).join('/'))
}

export type BomChange = 'added' | 'removed' | 'qty' | 'same'

export interface BomDiff {
  /** 新版每個節點的變更（key → 狀態與舊用量） */
  changes: Map<string, { status: BomChange; oldQty?: number }>
  /** 舊版有、新版沒有的節點（掛在新版的哪個上階下面） */
  removed: { parentKey: string; key: string; item: BomItem }[]
}

/** 比對兩個版次（依 key 路徑對應） */
export function diffBom(oldRoot: BomItem, newRoot: BomItem): BomDiff {
  const index = (root: BomItem) => {
    const map = new Map<string, BomItem>()
    const walk = (item: BomItem, parentKey: string | null) => {
      const key = parentKey === null ? bomKeyOf(item) : `${parentKey}/${bomKeyOf(item)}`
      map.set(key, item)
      for (const c of item.children ?? []) walk(c, key)
    }
    walk(root, null)
    return map
  }
  // 根的 key 以新版為準（版次不同時根料號可能不同）
  const oldMap = new Map([...index(oldRoot)].map(([k, v]) => [k.replace(/^[^/]+/, bomKeyOf(newRoot)), v]))
  const newMap = index(newRoot)
  const changes = new Map<string, { status: BomChange; oldQty?: number }>()
  for (const [key, item] of newMap) {
    const old = oldMap.get(key)
    if (!old) changes.set(key, { status: 'added' })
    else if (key !== bomKeyOf(newRoot) && old.qty !== item.qty) changes.set(key, { status: 'qty', oldQty: old.qty })
    else changes.set(key, { status: 'same' })
  }
  const removed: BomDiff['removed'] = []
  for (const [key, item] of oldMap) {
    if (newMap.has(key)) continue
    const parentKey = key.split('/').slice(0, -1).join('/')
    // 上階也被刪掉時只列最上面那一個
    if (newMap.has(parentKey)) removed.push({ parentKey, key, item })
  }
  return { changes, removed }
}
