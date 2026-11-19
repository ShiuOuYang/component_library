/**
 * 儀表板格線的版面計算（ChptDashboardGrid 用）：碰撞、推開、往上靠攏、限制範圍
 *
 * 全部是純函式：傳入版面、回傳新的版面（不改動原本的陣列與物件）。
 * 座標以「格」為單位：x 是第幾欄（0 起）、y 是第幾列，w / h 是佔幾欄幾列。
 */

export interface GridItem {
  id: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
  /** 固定不動：不能拖、不能調整大小，也不會被推開 */
  static?: boolean
}

export type GridCompact = 'vertical' | 'none'

/** 兩個方塊是否重疊（同一個 id 不算） */
export function collides(a: GridItem, b: GridItem): boolean {
  if (a.id === b.id) return false
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/** 版面最下緣（列數） */
export function bottom(layout: GridItem[]): number {
  return layout.reduce((max, it) => Math.max(max, it.y + it.h), 0)
}

/** 依 y、再依 x 排序（由上到下、由左到右） */
export function sortLayout(layout: GridItem[]): GridItem[] {
  return [...layout].sort((a, b) => a.y - b.y || a.x - b.x)
}

/** 把大小與位置限制在欄數、minW / maxW 之內 */
export function clampItem<T extends GridItem>(item: T, cols: number): T {
  const minW = Math.max(1, item.minW ?? 1)
  const maxW = Math.min(cols, item.maxW ?? cols)
  const minH = Math.max(1, item.minH ?? 1)
  const maxH = item.maxH ?? Infinity
  const w = Math.max(minW, Math.min(maxW, Math.round(item.w)))
  const h = Math.max(minH, Math.min(maxH, Math.round(item.h)))
  const x = Math.max(0, Math.min(cols - w, Math.round(item.x)))
  const y = Math.max(0, Math.round(item.y))
  return { ...item, x, y, w, h }
}

/**
 * 往上靠攏：每個方塊盡量往上移，直到碰到別的方塊或頂端。
 * static 的方塊不動，其他方塊會繞過它。
 */
export function compact<T extends GridItem>(layout: T[], mode: GridCompact = 'vertical'): T[] {
  if (mode === 'none') return layout.map((it) => ({ ...it }))
  const placed: T[] = layout.filter((it) => it.static).map((it) => ({ ...it }))
  const out = new Map<string, T>(placed.map((it) => [it.id, it]))
  for (const item of sortLayout(layout) as T[]) {
    if (item.static) continue
    const next = { ...item }
    while (next.y > 0 && !placed.some((p) => collides({ ...next, y: next.y - 1 }, p))) next.y--
    // 起始位置就跟已放好的方塊重疊（例如被 static 擋住）：往下找空位
    while (placed.some((p) => collides(next, p))) next.y++
    placed.push(next)
    out.set(next.id, next)
  }
  return layout.map((it) => out.get(it.id)!)
}

/**
 * 把一個方塊移到 (x, y)（或改成 w × h），擋到的方塊往下推（連鎖推開），最後依 compact 靠攏。
 * 被拖的方塊優先：它停在指定的位置，其他方塊讓開。
 * static 的方塊不會被推；要移進 static 方塊的位置時，被拖的方塊放到它下面。
 */
export function moveItem<T extends GridItem>(
  layout: T[],
  id: string,
  to: Partial<Pick<GridItem, 'x' | 'y' | 'w' | 'h'>>,
  cols: number,
  mode: GridCompact = 'vertical'
): T[] {
  const target = layout.find((it) => it.id === id)
  if (!target || target.static) return layout.map((it) => ({ ...it }))
  let moved = clampItem({ ...target, ...to }, cols)
  // 不能蓋到 static 的方塊
  const statics = layout.filter((it) => it.static)
  while (statics.some((s) => collides(moved, s))) moved = { ...moved, y: moved.y + 1 }

  const items = new Map<string, T>(layout.map((it) => [it.id, { ...it }]))
  items.set(id, moved)

  // 依序把撞到的方塊往下推到不撞為止（推過去的方塊再去推下面的）
  // 🔧 只用「目前的位置」去推：佇列裡過時的副本要跳過 —— 兩個方塊被推到同一列、又用舊位置互推時會無限循環
  const queue: T[] = [moved]
  let guard = 0
  while (queue.length && guard++ < 10_000) {
    const pusher = queue.shift()!
    if (items.get(pusher.id) !== pusher) continue
    const victims = sortLayout([...items.values()]).filter((it) => it.id !== id && it.id !== pusher.id && !it.static && collides(pusher, it)) as T[]
    for (const v of victims) {
      const pushed = { ...v, y: pusher.y + pusher.h }
      // 推下去時也不能壓到 static 的方塊
      while (statics.some((st) => collides(pushed, st))) pushed.y++
      items.set(v.id, pushed)
      queue.push(pushed)
    }
  }

  // 被拖的方塊固定在原處，其他的往上靠攏（但不能穿過它）
  const result = layout.map((it) => items.get(it.id)!)
  if (mode === 'none') return result
  const pinned = result.map((it) => (it.id === id ? { ...it, static: true } : it))
  return compact(pinned, mode).map((it) => (it.id === id ? { ...it, static: target.static } : it)) as T[]
}

/** 找第一個放得下 w × h 的位置（由上到下、由左到右）；新增方塊時用 */
export function findSpace(layout: GridItem[], w: number, h: number, cols: number): { x: number; y: number } {
  const width = Math.min(cols, Math.max(1, w))
  for (let y = 0; y <= bottom(layout); y++) {
    for (let x = 0; x + width <= cols; x++) {
      const probe = { id: '\0probe', x, y, w: width, h }
      if (!layout.some((it) => collides(probe, it))) return { x, y }
    }
  }
  return { x: 0, y: bottom(layout) }
}

/** 版面是否相同（位置與大小） */
export function sameLayout(a: GridItem[], b: GridItem[]): boolean {
  if (a.length !== b.length) return false
  const map = new Map(b.map((it) => [it.id, it]))
  return a.every((it) => {
    const o = map.get(it.id)
    return !!o && o.x === it.x && o.y === it.y && o.w === it.w && o.h === it.h
  })
}
