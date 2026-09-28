/**
 * 儲存格值的型別判斷與顯示規則（Excel 的「通用」格式）
 *
 * 編輯器把使用者輸入的內容存成字串（"42"），公式的結果才是 number。
 * 凡是要依「這是不是數字」決定行為的地方 —— 顯示格式、對齊、匯出、
 * 自動填入 —— 都必須用同一套判斷，否則同一個 42 在不同地方被當成不同東西：
 *
 * ⚠️ 原本顯示格式只套在 typeof v === 'number' 上，於是
 *      手打 42 套「0.00」 → 顯示 42        （格式無效）
 *      公式 =40+2 套「0.00」→ 顯示 42.00
 *    兩者在使用者眼中是同一種東西。
 */

/** 看起來像數字的字串：前後不能有空白，允許正負號、小數與科學記號（與 Excel 輸入時的判斷一致） */
export const NUMERIC_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/

/** 數字或數字字串 → number；其他 → null */
export function asNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && NUMERIC_RE.test(v)) return Number(v)
  return null
}

/** Excel 的錯誤值 */
export const ERROR_VALUES = ['#NULL!', '#DIV/0!', '#VALUE!', '#REF!', '#NAME?', '#NUM!', '#N/A'] as const

export function isErrorValue(v: unknown): boolean {
  return typeof v === 'string' && (ERROR_VALUES as readonly string[]).includes(v)
}

export function isBooleanValue(v: unknown): boolean {
  return typeof v === 'string' && /^(TRUE|FALSE)$/i.test(v)
}

export type CellAlign = 'left' | 'center' | 'right'

/**
 * 沒有指定對齊時的對齊方式（Excel「通用」格式）：
 *   數字靠右、文字靠左、錯誤值與布林值置中。
 *
 * ⚠️ 原本一律靠左 —— 一欄金額全部貼左邊，位數對不齊，是一眼就看得出
 *    「這不是 Excel」的地方。
 */
export function generalAlign(v: unknown): CellAlign {
  if (asNumber(v) !== null) return 'right'
  if (isErrorValue(v) || isBooleanValue(v)) return 'center'
  return 'left'
}

/** 套用數字格式；非數字原樣回傳 */
export function formatValue(v: string | number, fmt: string | undefined): string | number {
  if (!fmt) return v
  const n = asNumber(v)
  if (n === null) return v
  switch (fmt) {
    case '0':
      return Math.round(n).toString()
    case '0.0':
      return n.toFixed(1)
    case '0.00':
      return n.toFixed(2)
    case '#,##0':
      return Math.round(n).toLocaleString('en-US')
    case '#,##0.00':
      return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    case '0%':
      return (n * 100).toFixed(0) + '%'
    case '0.00%':
      return (n * 100).toFixed(2) + '%'
    default:
      return v
  }
}

/** 排序時的型別順位（升冪）：數字 < 文字 < 布林 < 錯誤值 */
function sortRank(v: string | number): number {
  if (asNumber(v) !== null) return 0
  if (isErrorValue(v)) return 3
  if (isBooleanValue(v)) return 2
  return 1
}

/**
 * Excel 的排序比較。
 *
 * ⚠️ 原本用 Number(a) - Number(b)，而 Number('') 是 0 —— 空白格被當成 0，
 *    排在正數與負數之間。Excel 的規則是：
 *      - 升冪：數字 → 文字（不分大小寫）→ 布林（FALSE、TRUE）→ 錯誤值
 *      - 降冪：上面整個反過來
 *      - **空白不論升降冪都排在最後**
 */
export function sortCompare(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  direction: 'asc' | 'desc' = 'asc'
): number {
  const blankA = a === '' || a === null || a === undefined
  const blankB = b === '' || b === null || b === undefined
  if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1

  const ra = sortRank(a!)
  const rb = sortRank(b!)
  let order: number
  if (ra !== rb) {
    order = ra - rb
  } else if (ra === 0) {
    order = asNumber(a)! - asNumber(b)!
  } else if (ra === 2) {
    // FALSE < TRUE
    order = Number(String(a).toUpperCase() === 'TRUE') - Number(String(b).toUpperCase() === 'TRUE')
  } else if (ra === 3) {
    order = 0
  } else {
    order = String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })
  }
  return direction === 'desc' ? -order : order
}
