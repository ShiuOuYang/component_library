/**
 * 集合交集圖（UpSetChart）的計算。
 *
 * 資料可以用兩種方式給：
 * - items：每個項目屬於哪些集合（每片板子出現了哪些缺陷）
 * - sets：每個集合有哪些項目（每種缺陷出現在哪些板子）
 *
 * 交集有兩種算法：
 * - exclusive（預設）：剛好是這幾個集合（不含其他）—— 每個項目只算在一個組合裡，加起來等於總數
 * - inclusive：至少有這幾個集合（可以還有其他）—— 例如「有錫橋的板子裡同時有偏移的有幾片」
 */

export interface UpsetItemInput {
  id: string
  sets: readonly string[]
}

export interface UpsetSetInput {
  name: string
  items: readonly string[]
}

export interface UpsetSet {
  name: string
  /** 項目數 */
  size: number
  /** 原本的順序 */
  index: number
}

export interface UpsetCombo {
  /** 組合鍵（集合名稱依集合順序以 \u0000 串起來；空組合為空字串） */
  key: string
  sets: string[]
  degree: number
  count: number
  items: string[]
}

export interface UpsetData {
  sets: UpsetSet[]
  /** 每個項目屬於哪些集合 */
  membership: Map<string, Set<string>>
  total: number
}

/** 整理輸入：兩種寫法合併；setOrder 為 'size' 時集合依大小（大到小）排 */
export function buildUpset(o: { items?: readonly UpsetItemInput[]; sets?: readonly UpsetSetInput[]; setNames?: readonly string[] }, setOrder: 'size' | 'input' = 'size'): UpsetData {
  const membership = new Map<string, Set<string>>()
  const order: string[] = [...(o.setNames ?? [])]
  const addSet = (name: string) => {
    if (!order.includes(name)) order.push(name)
  }
  const add = (id: string, set: string | null) => {
    let m = membership.get(id)
    if (!m) membership.set(id, (m = new Set()))
    if (set !== null) {
      m.add(set)
      addSet(set)
    }
  }
  for (const it of o.items ?? []) {
    add(it.id, null)
    for (const s of it.sets) add(it.id, s)
  }
  for (const s of o.sets ?? []) {
    addSet(s.name)
    for (const id of s.items) add(id, s.name)
  }
  const sizes = new Map(order.map((n) => [n, 0]))
  for (const m of membership.values()) for (const s of m) sizes.set(s, sizes.get(s)! + 1)
  let sets = order.map((name, index) => ({ name, size: sizes.get(name)!, index }))
  if (setOrder === 'size') sets = [...sets].sort((a, b) => b.size - a.size || a.index - b.index)
  return { sets, membership, total: membership.size }
}

const keyOf = (sets: readonly string[]) => sets.join('\u0000')

/** 交集：每個出現過的組合與它的數量 */
export function upsetCombos(data: UpsetData, mode: 'exclusive' | 'inclusive' = 'exclusive'): UpsetCombo[] {
  const rank = new Map(data.sets.map((s, i) => [s.name, i]))
  const groups = new Map<string, UpsetCombo>()
  for (const [id, m] of data.membership) {
    const sets = [...m].sort((a, b) => rank.get(a)! - rank.get(b)!)
    const key = keyOf(sets)
    let g = groups.get(key)
    if (!g) groups.set(key, (g = { key, sets, degree: sets.length, count: 0, items: [] }))
    g.count++
    g.items.push(id)
  }
  const combos = [...groups.values()]
  if (mode === 'exclusive') return combos
  // inclusive：同樣的組合，但算「至少有這幾個集合」的項目
  return combos.map((c) => {
    const items: string[] = []
    for (const [id, m] of data.membership) if (c.sets.every((s) => m.has(s)) && (c.degree > 0 || m.size === 0)) items.push(id)
    return { ...c, count: items.length, items }
  })
}

export type UpsetSort = 'count' | 'degree' | 'sets'

/**
 * 排序：count 依數量（大到小，同數量時組合小的在前）、degree 依組合大小（小到大，再依數量）、
 * sets 依集合順序（像二進位：先第一個集合的組合）。
 */
export function sortCombos(combos: readonly UpsetCombo[], sort: UpsetSort, sets: readonly UpsetSet[]): UpsetCombo[] {
  const rank = new Map(sets.map((s, i) => [s.name, i]))
  const firstDiff = (a: UpsetCombo, b: UpsetCombo) => {
    const ra = a.sets.map((s) => rank.get(s)!)
    const rb = b.sets.map((s) => rank.get(s)!)
    for (let i = 0; i < Math.min(ra.length, rb.length); i++) if (ra[i] !== rb[i]) return ra[i] - rb[i]
    return ra.length - rb.length
  }
  const out = [...combos]
  if (sort === 'count') out.sort((a, b) => b.count - a.count || a.degree - b.degree || firstDiff(a, b))
  else if (sort === 'degree') out.sort((a, b) => a.degree - b.degree || b.count - a.count || firstDiff(a, b))
  else out.sort(firstDiff)
  return out
}

export interface UpsetFilter {
  minCount?: number
  minDegree?: number
  maxDegree?: number
  /** 只留前幾個（排序後） */
  limit?: number
  /** 含「不屬於任何集合」的組合 */
  includeEmpty?: boolean
}

/** 篩選；回傳留下的組合與被略過的數量 */
export function filterCombos(combos: readonly UpsetCombo[], f: UpsetFilter = {}): { combos: UpsetCombo[]; hidden: number } {
  const kept = combos.filter(
    (c) => (f.includeEmpty || c.degree > 0) && c.count >= (f.minCount ?? 1) && c.degree >= (f.minDegree ?? 0) && c.degree <= (f.maxDegree ?? Infinity)
  )
  const limited = f.limit && f.limit > 0 ? kept.slice(0, f.limit) : kept
  return { combos: limited, hidden: combos.length - limited.length }
}
