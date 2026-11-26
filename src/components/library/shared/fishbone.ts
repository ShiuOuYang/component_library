/**
 * 魚骨圖（特性要因圖，ChptFishbone）的資料操作與版面
 *
 * 資料：問題（魚頭）+ 分類（大骨，預設 5M1E）+ 原因（最多 3 層：原因 → 次要原因 → 再次要原因）。
 * 原因可以標記：已驗證（verified）、主要原因（primary）、已排除（ruledOut）。
 * 所有操作都回傳新的物件（不改動傳入的資料），可以直接配合 v-model。
 */

export interface FishCause {
  id: string
  text: string
  verified?: boolean
  primary?: boolean
  ruledOut?: boolean
  /** 備註（例如驗證方式、負責人） */
  note?: string
  children?: FishCause[]
}

export interface FishCategory {
  id: string
  label: string
  causes: FishCause[]
}

export interface FishboneData {
  problem: string
  categories: FishCategory[]
}

/** 5M1E：人、機、料、法、環、測 */
export const FISHBONE_5M1E = ['man', 'machine', 'material', 'method', 'environment', 'measurement'] as const
export type Fishbone5M1E = (typeof FISHBONE_5M1E)[number]

/** 最多幾層原因 */
export const FISHBONE_MAX_DEPTH = 3

let seq = 0
export function fishId(prefix = 'c'): string {
  seq = (seq + 1) % 1e9
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}`
}

export function createFishbone(problem: string, categories: { id: string; label: string }[]): FishboneData {
  return { problem, categories: categories.map((c) => ({ id: c.id, label: c.label, causes: [] })) }
}

export interface FishLocation {
  cause: FishCause
  category: FishCategory
  /** 0 = 直接接在大骨上的原因 */
  depth: number
  parentId: string | null
  /** 在兄弟中的位置 */
  index: number
}

export function findCause(data: FishboneData, id: string): FishLocation | null {
  for (const category of data.categories) {
    const walk = (list: FishCause[], depth: number, parentId: string | null): FishLocation | null => {
      for (let i = 0; i < list.length; i++) {
        const cause = list[i]
        if (cause.id === id) return { cause, category, depth, parentId, index: i }
        const hit = walk(cause.children ?? [], depth + 1, cause.id)
        if (hit) return hit
      }
      return null
    }
    const hit = walk(category.causes, 0, null)
    if (hit) return hit
  }
  return null
}

/** 依閱讀順序（分類 → 原因深度優先）列出所有原因 */
export function flattenCauses(data: FishboneData): FishLocation[] {
  const out: FishLocation[] = []
  for (const category of data.categories) {
    const walk = (list: FishCause[], depth: number, parentId: string | null) =>
      list.forEach((cause, index) => {
        out.push({ cause, category, depth, parentId, index })
        walk(cause.children ?? [], depth + 1, cause.id)
      })
    walk(category.causes, 0, null)
  }
  return out
}

function mapCauses(list: FishCause[], fn: (c: FishCause) => FishCause | null): FishCause[] {
  const out: FishCause[] = []
  for (const c of list) {
    const mapped = fn(c)
    if (!mapped) continue
    out.push(mapped.children ? { ...mapped, children: mapCauses(mapped.children, fn) } : mapped)
  }
  return out
}

/**
 * 新增原因：parentId 為分類 id（接在大骨上）或原因 id（次要原因，超過最大層數時回傳 null）。
 * 回傳新資料與新原因的 id。
 */
export function addCause(data: FishboneData, parentId: string, text: string, id = fishId()): { data: FishboneData; id: string } | null {
  const cause: FishCause = { id, text }
  const cat = data.categories.find((c) => c.id === parentId)
  if (cat) {
    return { id, data: { ...data, categories: data.categories.map((c) => (c === cat ? { ...c, causes: [...c.causes, cause] } : c)) } }
  }
  const loc = findCause(data, parentId)
  if (!loc || loc.depth >= FISHBONE_MAX_DEPTH - 1) return null
  return {
    id,
    data: {
      ...data,
      categories: data.categories.map((c) =>
        c === loc.category ? { ...c, causes: mapCauses(c.causes, (x) => (x.id === parentId ? { ...x, children: [...(x.children ?? []), cause] } : x)) } : c
      ),
    },
  }
}

export function updateCause(data: FishboneData, id: string, patch: Partial<Omit<FishCause, 'id' | 'children'>>): FishboneData {
  return {
    ...data,
    categories: data.categories.map((c) => ({ ...c, causes: mapCauses(c.causes, (x) => (x.id === id ? { ...x, ...patch } : x)) })),
  }
}

/** 刪除原因（連同底下的次要原因） */
export function removeCause(data: FishboneData, id: string): FishboneData {
  return { ...data, categories: data.categories.map((c) => ({ ...c, causes: mapCauses(c.causes, (x) => (x.id === id ? null : x)) })) }
}

export function updateCategory(data: FishboneData, id: string, label: string): FishboneData {
  return { ...data, categories: data.categories.map((c) => (c.id === id ? { ...c, label } : c)) }
}

export interface FishStats {
  categories: number
  causes: number
  primary: number
  verified: number
  ruledOut: number
}

export function fishStats(data: FishboneData): FishStats {
  const all = flattenCauses(data).map((l) => l.cause)
  return {
    categories: data.categories.length,
    causes: all.length,
    primary: all.filter((c) => c.primary).length,
    verified: all.filter((c) => c.verified).length,
    ruledOut: all.filter((c) => c.ruledOut).length,
  }
}

/** 匯出成縮排的文字大綱（貼到 8D 報告） */
export function fishboneOutline(data: FishboneData, marks: { primary: string; verified: string; ruledOut: string } = { primary: '★', verified: '✓', ruledOut: '✗' }): string {
  const lines = [data.problem]
  for (const cat of data.categories) {
    lines.push(`- ${cat.label}`)
    const walk = (list: FishCause[], depth: number) =>
      list.forEach((c) => {
        const flags = [c.primary ? marks.primary : '', c.verified ? marks.verified : '', c.ruledOut ? marks.ruledOut : ''].filter(Boolean).join('')
        lines.push(`${'  '.repeat(depth + 1)}- ${c.text}${flags ? ` ${flags}` : ''}${c.note ? ` (${c.note})` : ''}`)
        walk(c.children ?? [], depth + 1)
      })
    walk(cat.causes, 0)
  }
  return lines.join('\n')
}

// ===== 版面 =====

export interface FishLayoutOptions {
  /** 每一列原因的高度 */
  rowH?: number
  /** 第一層原因線的長度 */
  branchW?: number
  /** 每深一層往左縮排 */
  indent?: number
  /** 分類標籤的大小 */
  labelW?: number
  labelH?: number
  /** 魚頭的大小 */
  headW?: number
  headH?: number
  /** 每個大骨至少保留幾列（新增按鈕的位置） */
  minRows?: number
}

export interface FishBone {
  category: FishCategory
  side: 'top' | 'bottom'
  /** 大骨：從脊椎上的點（x1, y1）到標籤端（x2, y2） */
  x1: number
  y1: number
  x2: number
  y2: number
  label: { x: number; y: number; w: number; h: number }
  /** 下一個新原因的位置（新增按鈕） */
  addAt: { x: number; y: number }
}

export interface FishRow {
  location: FishLocation
  /** 原因線 */
  x1: number
  x2: number
  y: number
  /** 次要原因連到上一層的垂直線（第一層為 null） */
  link: { x: number; y1: number; y2: number } | null
}

export interface FishLayout {
  width: number
  height: number
  spineY: number
  spineX1: number
  spineX2: number
  head: { x: number; y: number; w: number; h: number }
  bones: FishBone[]
  rows: FishRow[]
}

export function layoutFishbone(data: FishboneData, o: FishLayoutOptions = {}): FishLayout {
  const rowH = o.rowH ?? 24
  const branchW = o.branchW ?? 170
  const indent = o.indent ?? 18
  const labelW = o.labelW ?? 110
  const labelH = o.labelH ?? 28
  const headW = o.headW ?? 170
  const headH = o.headH ?? 72
  const minRows = o.minRows ?? 2
  const pad = 16
  const flat = flattenCauses(data)
  const rowsOf = (cat: FishCategory) => flat.filter((l) => l.category === cat)
  const nCols = Math.max(1, Math.ceil(data.categories.length / 2))
  const maxRows = Math.max(minRows, ...data.categories.map((c) => rowsOf(c).length + 1))
  // 大骨的垂直長度與斜率（往左上 / 左下）
  const boneV = maxRows * rowH + 12
  const slope = 0.42
  const boneH = boneV * slope
  const colW = branchW + indent * (FISHBONE_MAX_DEPTH - 1) + 24
  const halfH = labelH + boneV + 6
  const height = Math.max(headH + pad * 2, halfH * 2 + pad * 2)
  const spineY = height / 2
  const spineX1 = pad
  const width = pad + colW * nCols + boneH + headW + pad + 12
  const spineX2 = width - pad - headW
  const head = { x: spineX2, y: spineY - headH / 2, w: headW, h: headH }

  const bones: FishBone[] = []
  const rows: FishRow[] = []
  data.categories.forEach((category, k) => {
    const col = Math.floor(k / 2)
    const side: 'top' | 'bottom' = k % 2 === 0 ? 'top' : 'bottom'
    const sgn = side === 'top' ? -1 : 1
    const x1 = spineX2 - 20 - col * colW
    const y1 = spineY
    const x2 = x1 - boneH
    const y2 = spineY + sgn * boneV
    // 大骨上 y 位置對應的 x
    const boneX = (y: number) => x1 - boneH * (Math.abs(y - spineY) / boneV)
    const lr = rowsOf(category)
    // 上半部：第一個原因靠標籤（由上往下讀）；下半部：第一個原因靠脊椎（也是由上往下讀）
    const rowY = (r: number) => (side === 'top' ? y2 + 6 + (r + 1) * rowH : spineY + 6 + (r + 1) * rowH)
    const lastY = new Map<string, number>()
    lr.forEach((location, r) => {
      const y = rowY(r)
      const right = boneX(y) - indent * location.depth
      lastY.set(location.cause.id, y)
      rows.push({
        location,
        x1: right - (branchW - 0),
        x2: right,
        y,
        link: location.parentId ? { x: right + 6, y1: lastY.get(location.parentId)!, y2: y } : null,
      })
    })
    const nextY = rowY(lr.length)
    bones.push({
      category,
      side,
      x1,
      y1,
      x2,
      y2,
      label: { x: x2 - labelW / 2, y: side === 'top' ? y2 - labelH : y2, w: labelW, h: labelH },
      addAt: { x: boneX(nextY) - 10, y: nextY - 8 },
    })
  })
  return { width, height, spineY, spineX1, spineX2, head, bones, rows }
}

/** 依可用寬度（px）截斷文字：中日韓字元算 2 個單位 */
export function fitText(text: string, px: number, unit = 6.4): string {
  const budget = Math.max(2, Math.floor(px / unit))
  let used = 0
  let out = ''
  for (const ch of text) {
    used += ch.charCodeAt(0) <= 0x24f ? 1 : 2
    if (used > budget) return `${out}…`
    out += ch
  }
  return out
}
