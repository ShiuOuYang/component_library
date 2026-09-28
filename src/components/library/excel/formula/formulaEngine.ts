/**
 * 試算表公式引擎
 *
 * 解析（parser.ts）→ 語法樹 → 這裡求值；函式在 functions.ts。
 * 值的型別與轉換規則在 value.ts。
 *
 * 純函式：吃工作表資料，不碰 DOM 也不碰 Vue，因此可以單獨測試。
 */
import { cellRef } from './cellRef'
import { FormulaSyntaxError, parseFormula, type Node, type RefEnd } from './parser'
import {
  BLANK,
  FormulaError,
  cleanNumber,
  compareValues,
  err,
  isError,
  literalValue,
  toNumber,
  toScalar,
  toText,
  type RangeValue,
  type Scalar,
  type Value,
} from './value'
import { FUNCTIONS, type FunctionContext } from './functions'

/** 引擎需要的工作表最小形狀（以 "A1" 為鍵） */
export interface FormulaSheet {
  cells: Record<string, { raw?: string | number } | undefined>
}

/** 公式結果：數字、文字；布林是 'TRUE' / 'FALSE'，錯誤是 '#DIV/0!' 這類字串 */
export type FormulaValue = string | number

export interface EvaluateOptions {
  /** 跨工作表參照（Sheet2!A1）時依名稱找工作表；找不到是 #REF! */
  resolveSheet?: (name: string) => FormulaSheet | undefined
}

/**
 * 迴圈參照的深度上限。
 *
 * ⚠️ 原本沒有任何保護：A1 填 `=B1`、B1 填 `=A1` 就會互相遞迴到堆疊爆掉，
 *    整個瀏覽器分頁卡死。這裡在求值過程中記住「正在算哪些格」，遇到自己就中止。
 */
const MAX_DEPTH = 256

interface Context {
  sheet: FormulaSheet
  options: EvaluateOptions
  /** 正在求值的儲存格（偵測循環），鍵是 "工作表id!A1" */
  visiting: Set<string>
  /** 本次求值已算過的公式格 */
  cache: Map<string, Scalar>
  depth: number
}

// ---------------------------------------------------------------------------
// 解析結果快取：編輯器每次重繪都會求值每一個公式格，同一條公式不必每次重新解析
// ---------------------------------------------------------------------------

const PARSE_CACHE_LIMIT = 2000
const parseCache = new Map<string, Node | FormulaSyntaxError>()

function parseCached(formula: string): Node | FormulaSyntaxError {
  let node = parseCache.get(formula)
  if (node === undefined) {
    try {
      node = parseFormula(formula)
    } catch (e) {
      if (!(e instanceof FormulaSyntaxError)) throw e
      node = e
    }
    if (parseCache.size >= PARSE_CACHE_LIMIT) parseCache.delete(parseCache.keys().next().value!)
    parseCache.set(formula, node)
  }
  return node
}

// ---------------------------------------------------------------------------
// 儲存格與範圍
// ---------------------------------------------------------------------------

const sheetIds = new WeakMap<FormulaSheet, number>()
let nextSheetId = 1
function sheetId(sheet: FormulaSheet): number {
  let id = sheetIds.get(sheet)
  if (id === undefined) {
    id = nextSheetId++
    sheetIds.set(sheet, id)
  }
  return id
}

function cellValue(sheet: FormulaSheet, r: number, c: number, ctx: Context): Scalar {
  const ref = cellRef(r, c)
  const raw = sheet.cells[ref]?.raw
  if (typeof raw !== 'string' || !raw.startsWith('=')) return literalValue(raw)

  const key = sheetId(sheet) + '!' + ref
  const cached = ctx.cache.get(key)
  if (cached !== undefined) return cached
  // 循環參照：Excel 會警告並顯示 0
  if (ctx.visiting.has(key) || ctx.depth >= MAX_DEPTH) return 0

  const node = parseCached(raw.slice(1))
  // 語法錯誤的公式格被參照時：Excel 不允許輸入這種公式，這裡當成 #NAME?
  if (node instanceof FormulaSyntaxError) return err('#NAME?')

  ctx.visiting.add(key)
  try {
    const value = toScalar(evaluate(node, { ...ctx, sheet, depth: ctx.depth + 1 }))
    // 公式結果若是空白（=A1 而 A1 是空的）顯示 0
    const result = value === BLANK ? 0 : value
    ctx.cache.set(key, result)
    return result
  } catch (e) {
    // 被參照的格子公式引數個數不對：只讓那一格失效，不要讓整條公式跟著失效
    if (e instanceof FormulaSyntaxError) return err('#NAME?')
    throw e
  } finally {
    ctx.visiting.delete(key)
  }
}

/** 工作表實際使用到的最大列 / 欄（整欄 A:A、整列 1:1 只掃到這裡） */
function usedExtent(sheet: FormulaSheet): { rows: number; cols: number } {
  let rows = 0
  let cols = 0
  for (const key in sheet.cells) {
    const m = key.match(/^([A-Z]+)(\d+)$/)
    if (!m) continue
    const r = Number(m[2])
    let c = 0
    for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64
    if (r > rows) rows = r
    if (c > cols) cols = c
  }
  return { rows, cols }
}

function refValue(node: Extract<Node, { type: 'ref' }>, ctx: Context): Value {
  let sheet = ctx.sheet
  if (node.sheet !== null) {
    const found = ctx.options.resolveSheet?.(node.sheet)
    if (!found) return err('#REF!')
    sheet = found
  }
  const end: RefEnd = node.end ?? node.start
  let r1 = node.start.r
  let r2 = end.r
  let c1 = node.start.c
  let c2 = end.c
  if (r1 === null || r2 === null || c1 === null || c2 === null) {
    const extent = usedExtent(sheet)
    if (r1 === null || r2 === null) {
      r1 = 1
      r2 = Math.max(1, extent.rows)
    }
    if (c1 === null || c2 === null) {
      c1 = 1
      c2 = Math.max(1, extent.cols)
    }
  }
  const top = Math.min(r1, r2)
  const left = Math.min(c1, c2)
  const rows = Math.abs(r2 - r1) + 1
  const cols = Math.abs(c2 - c1) + 1
  if (!node.end) return cellValue(sheet, top, left, ctx)
  const range: RangeValue = {
    kind: 'range',
    rows,
    cols,
    at: (i, j) => cellValue(sheet, top + i, left + j, ctx),
  }
  return range
}

// ---------------------------------------------------------------------------
// 運算子
// ---------------------------------------------------------------------------

function arithmetic(op: string, a: number, b: number): Scalar {
  let n: number
  switch (op) {
    case '+':
      n = a + b
      break
    case '-':
      n = a - b
      break
    case '*':
      n = a * b
      break
    case '/':
      if (b === 0) return err('#DIV/0!')
      n = a / b
      break
    case '^':
      if (a === 0 && b === 0) return err('#NUM!')
      if (a === 0 && b < 0) return err('#DIV/0!')
      n = a ** b
      break
    default:
      return err('#VALUE!')
  }
  return Number.isFinite(n) ? n : err('#NUM!')
}

function binary(node: Extract<Node, { type: 'binary' }>, ctx: Context): Scalar {
  // 由左至右，先遇到的錯誤先傳出（與 Excel 相同）
  const a = toScalar(evaluate(node.left, ctx))
  if (isError(a)) return a
  const b = toScalar(evaluate(node.right, ctx))
  if (isError(b)) return b

  switch (node.op) {
    case '&': {
      const x = toText(a)
      const y = toText(b)
      return isError(x) ? x : isError(y) ? y : x + y
    }
    case '=':
    case '<>':
    case '<':
    case '>':
    case '<=':
    case '>=': {
      const d = compareValues(a, b)
      switch (node.op) {
        case '=':
          return d === 0
        case '<>':
          return d !== 0
        case '<':
          return d < 0
        case '>':
          return d > 0
        case '<=':
          return d <= 0
        default:
          return d >= 0
      }
    }
    default: {
      const x = toNumber(a)
      if (isError(x)) return x
      const y = toNumber(b)
      if (isError(y)) return y
      return arithmetic(node.op, x, y)
    }
  }
}

function evaluate(node: Node, ctx: Context): Value {
  switch (node.type) {
    case 'number':
    case 'string':
    case 'boolean':
      return node.value
    case 'error':
      return err(node.code)
    case 'missing':
      return BLANK
    case 'name':
      // 沒有定義名稱的功能：任何名稱都是 #NAME?（Excel 打錯函式名、忘了加引號時的結果）
      return err('#NAME?')
    case 'ref':
      return refValue(node, ctx)
    case 'unary': {
      const v = toNumber(toScalar(evaluate(node.operand, ctx)))
      if (isError(v)) return v
      return node.op === '-' ? -v : v
    }
    case 'percent': {
      const v = toNumber(toScalar(evaluate(node.operand, ctx)))
      return isError(v) ? v : v / 100
    }
    case 'binary':
      return binary(node, ctx)
    case 'call': {
      const fn = FUNCTIONS[node.name]
      if (!fn) return err('#NAME?')
      if (node.args.length < fn.min || node.args.length > (fn.max ?? Infinity)) {
        throw new FormulaSyntaxError(`${node.name} 的引數個數不對`)
      }
      const fctx: FunctionContext = {
        evaluate: (n) => evaluate(n, ctx),
        scalar: (n) => toScalar(evaluate(n, ctx)),
      }
      return fn.call(node.args, fctx)
    }
  }
}

/** 內部值 → 對外的顯示值 */
function toFormulaValue(v: Value): FormulaValue {
  const s = toScalar(v)
  if (s === BLANK) return 0
  if (typeof s === 'number') return cleanNumber(s)
  if (typeof s === 'boolean') return s ? 'TRUE' : 'FALSE'
  if (s instanceof FormulaError) return s.code
  return s
}

/**
 * 求值一條公式（不含前導 `=`）。
 *
 * 語法錯誤時回傳 null —— 呼叫端據此顯示原始公式字串。
 * 其餘情況都有值：算不出來的是 Excel 的錯誤值（'#DIV/0!'、'#NAME?' …）。
 */
export function evaluateFormula(
  expr: string,
  sheet: FormulaSheet,
  options: EvaluateOptions = {}
): FormulaValue | null {
  if (expr.trim() === '') return null
  const node = parseCached(expr)
  if (node instanceof FormulaSyntaxError) return null
  try {
    return toFormulaValue(
      evaluate(node, { sheet, options, visiting: new Set(), cache: new Map(), depth: 0 })
    )
  } catch (e) {
    if (e instanceof FormulaSyntaxError) return null
    throw e
  }
}

/** 引擎支援的函式名稱（給自動完成與測試用） */
export const SUPPORTED_FUNCTIONS = Object.keys(FUNCTIONS)
