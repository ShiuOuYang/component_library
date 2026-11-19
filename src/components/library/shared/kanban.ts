/**
 * 看板（ChptKanban）的資料計算：卡片是一個扁平陣列，每張卡片有一個欄位記錄它在哪一欄，
 * 同一欄裡的順序就是陣列裡的先後順序。全部是純函式，回傳新的陣列。
 */

export type KanbanCardLike = Record<string, unknown>

/** 依欄分組（保持陣列順序） */
export function groupCards<T extends KanbanCardLike>(cards: T[], columnIds: string[], columnField: string): Map<string, T[]> {
  const map = new Map<string, T[]>(columnIds.map((id) => [id, []]))
  for (const c of cards) {
    const col = String(c[columnField])
    map.get(col)?.push(c)
  }
  return map
}

/**
 * 把一張卡片移到 toColumn 的第 toIndex 個位置（以「移走之後」的那一欄計算；超過就放最後）。
 * 回傳新陣列；卡片物件換成新的（欄位已更新），其他卡片沿用原物件。
 */
export function moveCard<T extends KanbanCardLike>(
  cards: T[],
  key: unknown,
  toColumn: string,
  toIndex: number,
  options: { keyField: string; columnField: string }
): T[] {
  const { keyField, columnField } = options
  const from = cards.findIndex((c) => c[keyField] === key)
  if (from < 0) return [...cards]
  const rest = cards.filter((_, i) => i !== from)
  const moved = { ...cards[from], [columnField]: toColumn } as T
  // 目標欄裡（移走之後）每張卡片在整個陣列中的位置
  const positions: number[] = []
  rest.forEach((c, i) => {
    if (String(c[columnField]) === toColumn) positions.push(i)
  })
  const index = Math.max(0, Math.floor(toIndex))
  let insertAt: number
  if (index < positions.length) insertAt = positions[index]
  else if (positions.length) insertAt = positions[positions.length - 1] + 1
  else insertAt = rest.length
  rest.splice(insertAt, 0, moved)
  return rest
}

/** 卡片在自己那一欄的位置（0 起）；找不到時為 -1 */
export function indexInColumn<T extends KanbanCardLike>(cards: T[], key: unknown, options: { keyField: string; columnField: string }): number {
  const card = cards.find((c) => c[options.keyField] === key)
  if (!card) return -1
  return cards.filter((c) => c[options.columnField] === card[options.columnField]).indexOf(card)
}

/**
 * 依游標的 Y 決定插入位置：第一張「中線在游標下面」的卡片之前。
 * mids 是該欄每張卡片（不含正在拖的那張）的中線 Y。
 */
export function dropIndex(mids: number[], y: number): number {
  const i = mids.findIndex((m) => y < m)
  return i < 0 ? mids.length : i
}
