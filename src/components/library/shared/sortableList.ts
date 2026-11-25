/**
 * 拖曳排序清單（ChptSortableList）的樹狀資料操作：攤平、移動、拖曳時的放置位置推算、鍵盤移動。
 * 所有函式都不改原陣列，回傳新的樹。
 */

export interface SortItem {
  id: string
  label: string
  /** 次要說明 */
  description?: string
  children?: SortItem[]
  /** 不能拖曳（例如固定的第一步） */
  locked?: boolean
  /** 不能有子項 */
  leaf?: boolean
  [key: string]: unknown
}

export interface SortRow {
  item: SortItem
  depth: number
  parentId: string | null
  /** 在父層中的位置 */
  index: number
  /** 同一層有幾個 */
  siblings: number
  hasChildren: boolean
}

/** 放置位置：父項（null 為最上層）與在父項子清單中的位置 */
export interface SortTarget {
  parentId: string | null
  index: number
}

/** 攤平成畫面上的列；collapsed 裡的項目不展開子項，skip 的項目連同子項略過 */
export function flattenTree(items: readonly SortItem[], collapsed: ReadonlySet<string> = new Set(), skip: string | null = null): SortRow[] {
  const out: SortRow[] = []
  const walk = (list: readonly SortItem[], depth: number, parentId: string | null) => {
    list.forEach((item, index) => {
      if (item.id === skip) return
      const hasChildren = !!item.children?.length
      out.push({ item, depth, parentId, index, siblings: list.length, hasChildren })
      if (hasChildren && !collapsed.has(item.id)) walk(item.children!, depth + 1, item.id)
    })
  }
  walk(items, 0, null)
  return out
}

/** 找到項目：所在的子清單、位置、父項 id */
export function findItem(items: readonly SortItem[], id: string): { list: readonly SortItem[]; index: number; parentId: string | null; item: SortItem } | null {
  const walk = (list: readonly SortItem[], parentId: string | null): ReturnType<typeof findItem> => {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) return { list, index: i, parentId, item: list[i] }
      if (list[i].children) {
        const r = walk(list[i].children!, list[i].id)
        if (r) return r
      }
    }
    return null
  }
  return walk(items, null)
}

/** 是否為 ancestor 的子孫（含自己） */
export function isDescendant(items: readonly SortItem[], ancestorId: string, id: string): boolean {
  const a = findItem(items, ancestorId)
  if (!a) return false
  if (ancestorId === id) return true
  const walk = (list: readonly SortItem[] | undefined): boolean => !!list?.some((x) => x.id === id || walk(x.children))
  return walk(a.item.children)
}

/** 取出項目（連同子項），回傳新的樹與被取出的項目 */
export function removeItem(items: readonly SortItem[], id: string): { tree: SortItem[]; item: SortItem | null } {
  let removed: SortItem | null = null
  const walk = (list: readonly SortItem[]): SortItem[] =>
    list.flatMap((x) => {
      if (x.id === id) {
        removed = x
        return []
      }
      return x.children ? [{ ...x, children: walk(x.children) }] : [x]
    })
  const tree = walk(items)
  return { tree, item: removed }
}

/** 插入到 target；父項不存在時放最上層的最後 */
export function insertItem(items: readonly SortItem[], item: SortItem, target: SortTarget): SortItem[] {
  if (target.parentId === null) {
    const out = [...items]
    out.splice(Math.max(0, Math.min(target.index, out.length)), 0, item)
    return out
  }
  let done = false
  const walk = (list: readonly SortItem[]): SortItem[] =>
    list.map((x) => {
      if (x.id === target.parentId) {
        done = true
        const children = [...(x.children ?? [])]
        children.splice(Math.max(0, Math.min(target.index, children.length)), 0, item)
        return { ...x, children }
      }
      return x.children ? { ...x, children: walk(x.children) } : x
    })
  const out = walk(items)
  return done ? out : [...items, item]
}

/**
 * 移動項目到 target（target.index 是「移出之後」的位置）。
 * 不能移進自己或自己的子孫、不能移進 leaf 項目；不合法時回傳原陣列。
 */
export function moveItem(items: SortItem[], id: string, target: SortTarget): SortItem[] {
  const found = findItem(items, id)
  if (!found) return items
  if (target.parentId !== null) {
    if (isDescendant(items, id, target.parentId)) return items
    const parent = findItem(items, target.parentId)
    if (!parent || parent.item.leaf) return items
  }
  const { tree, item } = removeItem(items, id)
  return insertItem(tree, item!, target)
}

/** 兩棵樹的項目順序與結構是否相同（只看 id） */
export function sameStructure(a: readonly SortItem[], b: readonly SortItem[]): boolean {
  if (a.length !== b.length) return false
  return a.every((x, i) => x.id === b[i].id && sameStructure(x.children ?? [], b[i].children ?? []))
}

/**
 * 拖曳時的放置位置：插在畫面上第 overIndex 列之前（rows 已排除被拖的項目與其子項），
 * 想要的深度 depth 會限制在前一列能接受的範圍內（前一列深度 + 1，leaf 不收子項；不小於下一列的深度）。
 */
export function projectDrop(rows: readonly SortRow[], overIndex: number, depth: number, maxDepth = Infinity): { target: SortTarget; depth: number } {
  const i = Math.max(0, Math.min(overIndex, rows.length))
  const prev = rows[i - 1]
  const next = rows[i]
  const hi = Math.min(maxDepth - 1, prev ? prev.depth + (prev.item.leaf ? 0 : 1) : 0)
  const lo = next ? Math.min(next.depth, hi) : 0
  const d = Math.max(lo, Math.min(hi, Math.round(depth)))
  // 父項：往回找深度 d − 1 的列
  let parentId: string | null = null
  if (d > 0) {
    for (let k = i - 1; k >= 0; k--) {
      if (rows[k].depth === d - 1) {
        parentId = rows[k].item.id
        break
      }
    }
  }
  // 在父項中的位置：前面有幾個同層的兄弟
  let index = 0
  for (let k = i - 1; k >= 0; k--) {
    if (rows[k].depth < d) break
    if (rows[k].depth === d) index++
  }
  return { target: { parentId, index }, depth: d }
}

/** 鍵盤移動：上 / 下（同層交換，到頭時跳到上一層的鄰居前後）、縮排（成為上一個兄弟的最後一個子項）、取消縮排（成為父項的下一個兄弟） */
export function keyboardMove(items: SortItem[], id: string, dir: 'up' | 'down' | 'indent' | 'outdent', maxDepth = Infinity): SortItem[] {
  const f = findItem(items, id)
  if (!f) return items
  const depthOf = (pid: string | null): number => {
    let d = 0
    let cur = pid
    while (cur !== null) {
      d++
      cur = findItem(items, cur)!.parentId
    }
    return d
  }
  if (dir === 'up' || dir === 'down') {
    const j = f.index + (dir === 'up' ? -1 : 1)
    if (j >= 0 && j < f.list.length) return moveItem(items, id, { parentId: f.parentId, index: j })
    // 到頭：移到父項的前面 / 後面
    if (f.parentId === null) return items
    const p = findItem(items, f.parentId)!
    return moveItem(items, id, { parentId: p.parentId, index: p.index + (dir === 'up' ? 0 : 1) })
  }
  if (dir === 'indent') {
    const prev = f.list[f.index - 1]
    if (!prev || prev.leaf || depthOf(f.parentId) + 1 >= maxDepth) return items
    return moveItem(items, id, { parentId: prev.id, index: prev.children?.length ?? 0 })
  }
  if (f.parentId === null) return items
  const p = findItem(items, f.parentId)!
  return moveItem(items, id, { parentId: p.parentId, index: p.index + 1 })
}

/** 項目數（含子項） */
export function countItems(items: readonly SortItem[]): number {
  return items.reduce((n, x) => n + 1 + countItems(x.children ?? []), 0)
}
