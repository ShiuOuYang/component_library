/**
 * 缺陷標註（ChptDefectAnnotator）的資料與座標計算
 *
 * 座標一律存成 0–1 的比例（相對於圖片寬高），不存像素：
 * 同一筆標註在縮圖、全螢幕、列印時都落在同一個位置，圖片換了解析度也不用轉換。
 */

export interface DefectMark {
  id: string
  /** 點：位置；框：左上角（0–1） */
  x: number
  y: number
  /** 框的寬高（0–1）；點沒有 */
  w?: number
  h?: number
  /** 缺陷類型（對應 defectTypes 的 value） */
  type: string
  /** 備註 */
  note?: string
}

export interface DefectType {
  value: string
  label: string
  /** 標記顏色（任何 CSS 顏色） */
  color: string
}

export const clamp01 = (n: number): number => Math.min(1, Math.max(0, n))

/** 兩個角（任意方向拖曳）→ 左上角 + 寬高，並限制在圖片內 */
export function rectFromCorners(x0: number, y0: number, x1: number, y1: number): { x: number; y: number; w: number; h: number } {
  const ax = clamp01(Math.min(x0, x1))
  const ay = clamp01(Math.min(y0, y1))
  const bx = clamp01(Math.max(x0, x1))
  const by = clamp01(Math.max(y0, y1))
  return { x: ax, y: ay, w: bx - ax, h: by - ay }
}

/** 移動一個標記（框整個留在圖片內，不會被壓扁） */
export function moveMark(mark: DefectMark, dx: number, dy: number): DefectMark {
  const w = mark.w ?? 0
  const h = mark.h ?? 0
  return { ...mark, x: Math.min(1 - w, Math.max(0, mark.x + dx)), y: Math.min(1 - h, Math.max(0, mark.y + dy)) }
}

/** 下一個不重複的 id（d1、d2…；刪掉中間的也不會重複使用） */
export function nextMarkId(marks: DefectMark[]): string {
  let max = 0
  for (const m of marks) {
    const n = /^d(\d+)$/.exec(m.id)?.[1]
    if (n) max = Math.max(max, Number(n))
  }
  return `d${max + 1}`
}

/** 各類型的數量（照 defectTypes 的順序；不在清單裡的類型排在最後） */
export function countByType(marks: DefectMark[], types: DefectType[]): Array<{ type: string; label: string; color: string; count: number }> {
  const counts = new Map<string, number>()
  for (const m of marks) counts.set(m.type, (counts.get(m.type) ?? 0) + 1)
  const known = types.map((t) => ({ type: t.value, label: t.label, color: t.color, count: counts.get(t.value) ?? 0 }))
  const extra = [...counts.keys()]
    .filter((k) => !types.some((t) => t.value === k))
    .map((k) => ({ type: k, label: k, color: '', count: counts.get(k)! }))
  return [...known, ...extra]
}

/** 標記的中心（點就是自己；框是框的中心）—— 編號圓點放的位置 */
export function markCenter(mark: DefectMark): { x: number; y: number } {
  return { x: mark.x + (mark.w ?? 0) / 2, y: mark.y + (mark.h ?? 0) / 2 }
}
