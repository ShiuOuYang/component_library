/**
 * 儲存格座標工具
 *
 * 純座標運算，與工作表內容無關。抽出來讓公式引擎與編輯器共用，
 * 也才測得到（原本整包埋在 ChptExcelEditor.vue 裡）。
 */

/** 欄索引（1-based）→ 欄名："A"、"Z"、"AA" */
export function colName(c: number): string {
  let n = c
  let s = ''
  while (n > 0) {
    const mod = (n - 1) % 26
    s = String.fromCharCode(65 + mod) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

/** (列, 欄) → "A1" */
export function cellRef(r: number, c: number): string {
  return colName(c) + r
}

/** 一個儲存格座標（皆為 1-based） */
export interface CellPos {
  r: number
  c: number
}

/** "A1" 是否為合法的儲存格參照 */
export function isCellRef(ref: string): boolean {
  return /^[A-Za-z]+\d+$/.test(ref.trim())
}

/**
 * "A1" → { r: 1, c: 1 }
 *
 * 格式不合法時回傳左上角 —— 呼叫端在解析公式時無從中止，
 * 給一個確定的座標比拋錯更容易處理。需要區分合法性時請先用 isCellRef()。
 */
export function parseRef(ref: string): CellPos {
  const m = ref.trim().match(/^([A-Za-z]+)(\d+)$/)
  if (!m) return { r: 1, c: 1 }

  let col = 0
  for (const ch of m[1].toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64)
  return { r: parseInt(m[2], 10), c: col }
}

/** "A1:B3" 是否為合法的範圍 */
export function isRangeRef(token: string): boolean {
  const t = token.trim()
  if (!t.includes(':')) return isCellRef(t)
  const parts = t.split(':')
  return parts.length === 2 && parts.every(isCellRef)
}

/**
 * 解析範圍字串 "A1:B3" 或單格 "A1"，回傳涵蓋的所有座標。
 *
 * 兩端點順序顛倒（"B3:A1"）也能正確展開。
 * 格式不合法時回傳空陣列 —— 原本會把 "A3)+SUM(B1" 這種破碎的字串
 * 硬解成 A1，靜默算出錯誤的結果。
 */
export function resolveRange(token: string): CellPos[] {
  const t = token.trim().toUpperCase()
  if (!isRangeRef(t)) return []

  if (!t.includes(':')) return [parseRef(t)]

  const [a, b] = t.split(':')
  const p1 = parseRef(a)
  const p2 = parseRef(b)
  const r1 = Math.min(p1.r, p2.r)
  const r2 = Math.max(p1.r, p2.r)
  const c1 = Math.min(p1.c, p2.c)
  const c2 = Math.max(p1.c, p2.c)

  const cells: CellPos[] = []
  for (let rr = r1; rr <= r2; rr++) {
    for (let cc = c1; cc <= c2; cc++) cells.push({ r: rr, c: cc })
  }
  return cells
}
