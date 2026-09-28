/**
 * 公式求值時的值與 Excel 的型別轉換規則。
 *
 * 公式內部的值有五種：數字、文字、布林、空白、錯誤，外加「範圍」（還沒展開的一塊儲存格）。
 * 每個運算子與函式該怎麼轉換型別都照 Excel：
 *   - "3"+1 = 4（數字文字在運算中轉成數字），"abc"+1 = #VALUE!
 *   - TRUE+1 = 2；空白在數字運算中是 0、在文字運算中是 ""
 *   - 錯誤會一路往外傳：#DIV/0! + 1 仍是 #DIV/0!
 */
import type { ErrorCode } from './parser'
import { parseDateText } from './dates'

export class FormulaError {
  constructor(readonly code: ErrorCode) {}
}

/** 空白儲存格（與 "" 不同：=A1 在 A1 空白時是 0，=A1&"" 是 ""） */
export const BLANK = Symbol('blank')
export type Blank = typeof BLANK

export type Scalar = number | string | boolean | Blank | FormulaError

/** 一塊儲存格；values 依列展開（rows × cols） */
export interface RangeValue {
  kind: 'range'
  rows: number
  cols: number
  /** 第 i 列、第 j 欄（皆從 0 起算）的值 */
  at: (i: number, j: number) => Scalar
}

export type Value = Scalar | RangeValue

export const err = (code: ErrorCode) => new FormulaError(code)

export function isError(v: unknown): v is FormulaError {
  return v instanceof FormulaError
}

export function isRange(v: Value): v is RangeValue {
  return typeof v === 'object' && v !== null && (v as RangeValue).kind === 'range'
}

/** 陣列包成範圍（INDEX、XLOOKUP 回傳一整欄時用） */
export function rangeOf(rows: number, cols: number, at: (i: number, j: number) => Scalar): RangeValue {
  return { kind: 'range', rows, cols, at }
}

/** 依列展開範圍內的所有值 */
export function* rangeItems(v: RangeValue): Generator<Scalar> {
  for (let i = 0; i < v.rows; i++) for (let j = 0; j < v.cols; j++) yield v.at(i, j)
}

/**
 * 範圍用在需要單一值的地方：1×1 取那一格，其他是 #VALUE!
 * （舊版 Excel 的行為；新版會「溢出」到鄰格，這個編輯器沒有溢出）
 */
export function toScalar(v: Value): Scalar {
  if (!isRange(v)) return v
  if (v.rows === 1 && v.cols === 1) return v.at(0, 0)
  return err('#VALUE!')
}

/** 看起來像數字的文字（前後空白可忽略，與 Excel 在運算時的轉換一致） */
const NUMERIC_TEXT = /^\s*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?\s*$/
const PERCENT_TEXT = /^\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*%\s*$/

/** 轉成數字；轉不了回傳錯誤 */
export function toNumber(v: Scalar): number | FormulaError {
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  if (v === BLANK) return 0
  if (isError(v)) return v
  if (NUMERIC_TEXT.test(v)) return Number(v)
  const pct = v.match(PERCENT_TEXT)
  if (pct) return Number(pct[1]) / 100
  // 日期 / 時間文字轉成序號（Excel：="2026-09-28"+7 = 46300）
  const date = parseDateText(v)
  if (date !== null) return date
  return err('#VALUE!')
}

/**
 * 數字轉成文字時的樣子（Excel「通用」格式）：最多 15 位有效數字。
 * 0.1+0.2 在 JavaScript 是 0.30000000000000004，Excel 顯示 0.3。
 */
export function cleanNumber(n: number): number {
  if (n === 0) return 0 // 去掉 -0
  return Number(n.toPrecision(15))
}

export function toText(v: Scalar): string | FormulaError {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(cleanNumber(v))
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (v === BLANK) return ''
  return v
}

export function toBoolean(v: Scalar): boolean | FormulaError {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (v === BLANK) return false
  if (isError(v)) return v
  const upper = v.toUpperCase()
  if (upper === 'TRUE') return true
  if (upper === 'FALSE') return false
  return err('#VALUE!')
}

/** Excel 比較時的型別順位：數字 < 文字 < 布林 */
function typeRank(v: number | string | boolean): number {
  return typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : 2
}

/**
 * Excel 的比較（=、<、> …）：
 *   - 不同型別不轉換，依「數字 < 文字 < 布林」比較（所以 "10">9 是 TRUE）
 *   - 文字不分大小寫
 *   - 空白跟誰比就當成誰的「零值」：0、""、FALSE
 * 回傳負數 / 0 / 正數。
 */
export function compareValues(a: Exclude<Scalar, FormulaError>, b: Exclude<Scalar, FormulaError>): number {
  const zeroLike = (other: Scalar) =>
    typeof other === 'string' ? '' : typeof other === 'boolean' ? false : 0
  const x = a === BLANK ? zeroLike(b) : a
  const y = b === BLANK ? zeroLike(a) : b
  const rx = typeRank(x)
  const ry = typeRank(y)
  if (rx !== ry) return rx - ry
  if (typeof x === 'string') {
    const lx = x.toLowerCase()
    const ly = (y as string).toLowerCase()
    return lx < ly ? -1 : lx > ly ? 1 : 0
  }
  return Number(x) - Number(y)
}

/**
 * 儲存格裡存的原始輸入 → 值。
 * 編輯器把使用者輸入存成字串，"42" 要當數字、"TRUE" 要當布林、"#N/A" 要當錯誤值，
 * 與 Excel 輸入時的判斷相同。
 */
export function literalValue(raw: string | number | undefined): Scalar {
  if (raw === undefined || raw === '') return BLANK
  if (typeof raw === 'number') return raw
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw)) return Number(raw)
  const upper = raw.toUpperCase()
  if (upper === 'TRUE') return true
  if (upper === 'FALSE') return false
  if (/^#(NULL!|DIV\/0!|VALUE!|REF!|NAME\?|NUM!|N\/A)$/.test(upper)) return err(upper as FormulaError['code'])
  return raw
}
