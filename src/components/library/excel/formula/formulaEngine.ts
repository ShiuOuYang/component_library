/**
 * 試算表公式引擎
 *
 * 支援 SUM / AVERAGE / AVG / MIN / MAX / COUNT / IF、儲存格參照與範圍、
 * 四則運算與比較運算。
 *
 * 純函式：吃一份工作表資料，不碰 DOM 也不碰 Vue，因此可以單獨測試 ——
 * 一個沒有測試的公式引擎是整個編輯器最禁不起改動的地方。
 */
import { cellRef, parseRef, resolveRange, isRangeRef } from './cellRef'
import { evaluateArithmetic } from './arithmetic'
import { hasRefError, stripAbsolute } from './refRewrite'

/** 引擎需要的工作表最小形狀（以 "A1" 為鍵） */
export interface FormulaSheet {
  cells: Record<string, { raw?: string | number } | undefined>
}

export type FormulaValue = string | number

/** 支援的彙總函式 */
const AGGREGATE_FNS = ['SUM', 'AVERAGE', 'AVG', 'MIN', 'MAX', 'COUNT'] as const
const FN_NAME_PATTERN = [...AGGREGATE_FNS, 'IF'].join('|')

/**
 * 迴圈參照的深度上限。
 *
 * ⚠️ 原本沒有任何保護：A1 填 `=B1`、B1 填 `=A1` 就會讓 refValue 與
 *    evaluateFormula 互相遞迴到堆疊爆掉，整個瀏覽器分頁卡死。
 *    這裡改為在求值過程中記住「正在算哪些格」，遇到自己就中止。
 */
const MAX_DEPTH = 64

/** 一次求值的上下文：追蹤遞迴中的儲存格以偵測迴圈參照 */
interface EvalContext {
  sheet: FormulaSheet
  /** 正在求值的儲存格鍵（"A1"），用來偵測循環 */
  visiting: Set<string>
  depth: number
}

/** 取得數值（失敗回 NaN） */
export function toNumber(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v)
  return NaN
}

/** Excel 的真假判定：0 與空字串為假，'FALSE' 也視為假 */
export function truthy(v: unknown): boolean {
  if (typeof v === 'number') return v !== 0
  return !!v && String(v).toLowerCase() !== 'false'
}

/**
 * 分割函式引數，括號內的逗號不算分隔。
 * 例：IF(A1>1,SUM(B1,B2),0) → ['A1>1', 'SUM(B1,B2)', '0']
 */
export function splitArgs(s: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''

  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur.trim() !== '') out.push(cur)
  return out
}

/** 依上下文取得儲存格的值；空格視為 0 */
function refValue(r: number, c: number, ctx: EvalContext): FormulaValue {
  const key = cellRef(r, c)

  // 迴圈參照：這一格已經在求值堆疊裡
  if (ctx.visiting.has(key)) return 0

  const cell = ctx.sheet.cells[key]
  if (!cell) return 0

  const raw = cell.raw
  if (typeof raw === 'string' && raw.startsWith('=')) {
    ctx.visiting.add(key)
    try {
      const v = evaluate(raw.slice(1), ctx)
      return v === null ? 0 : v
    } finally {
      ctx.visiting.delete(key)
    }
  }
  return raw ?? 0
}

/**
 * 收集引數中的所有數值（參照範圍 / 單格 / 字面數值 / 運算式）。
 *
 * ⚠️ 原本只認「參照」與「字面數值」兩種，因此
 *    SUM(MAX(A1:A3),MIN(A1:A3)) 的兩個引數都被判為非數值而丟掉，
 *    整條公式靜默算出 0。現在其餘情況會走一次完整求值，
 *    巢狀函式與 SUM(A1*2,3) 這種運算式引數都能正確取到值。
 */
function collectNumericValues(arg: string, ctx: EvalContext): number[] {
  const t = arg.trim()
  if (t === '') return []

  // 參照或範圍
  if (isRangeRef(t)) {
    return resolveRange(t)
      .map(({ r, c }) => toNumber(refValue(r, c, ctx)))
      .filter((v) => !Number.isNaN(v))
  }

  // 字面數值
  const literal = toNumber(t)
  if (!Number.isNaN(literal)) return [literal]

  // 其餘（巢狀函式、運算式）交給完整求值
  const evaluated = evaluate(t, ctx)
  if (evaluated === null) return []
  const n = toNumber(evaluated)
  return Number.isNaN(n) ? [] : [n]
}

/**
 * 把整段公式中的函式呼叫換成它的結果。
 *
 * 由內而外處理：每一輪只替換「括號內不再有括號」的呼叫，
 * 因此巢狀函式（SUM(MAX(A1,A2),3)）也能正確收斂。
 */
function substituteFunctions(expr: string, ctx: EvalContext): string | null {
  const innermost = new RegExp(`(${FN_NAME_PATTERN})\\(([^()]*)\\)`, 'i')

  let s = expr
  // 每輪至少消掉一個呼叫，因此輪數以公式長度為上限即足夠
  for (let guard = 0; guard <= expr.length; guard++) {
    const m = s.match(innermost)
    if (!m) return s

    const value = applyFunction(m[1].toUpperCase(), m[2], ctx)
    if (value === null) return null
    s = s.slice(0, m.index!) + String(value) + s.slice(m.index! + m[0].length)
  }
  return s
}

/** 執行單一函式呼叫 */
function applyFunction(
  fnName: string,
  argsText: string,
  ctx: EvalContext
): FormulaValue | null {
  const args = splitArgs(argsText)

  if (fnName === 'IF') {
    if (args.length < 3) return null
    const cond = evaluate(args[0], ctx)
    const trueVal = evaluate(args[1], ctx)
    const falseVal = evaluate(args[2], ctx)
    const chosen = truthy(cond) ? trueVal : falseVal
    return chosen === null ? null : chosen
  }

  const values = args.flatMap((arg) => collectNumericValues(arg, ctx))

  switch (fnName) {
    case 'SUM':
      return values.reduce((a, b) => a + b, 0)
    case 'AVERAGE':
    case 'AVG':
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
    case 'MIN':
      return values.length ? Math.min(...values) : 0
    case 'MAX':
      return values.length ? Math.max(...values) : 0
    case 'COUNT':
      return values.length
    default:
      return null
  }
}

/** 把儲存格參照與範圍換成數值（範圍取總和，與原行為一致） */
function substituteReferences(expr: string, ctx: EvalContext): string {
  return expr.replace(/\b[A-Za-z]+\d+(?::[A-Za-z]+\d+)?\b/g, (tok) => {
    if (tok.includes(':')) {
      const nums = resolveRange(tok)
        .map(({ r, c }) => toNumber(refValue(r, c, ctx)))
        .filter((v) => !Number.isNaN(v))
      return String(nums.length ? nums.reduce((a, b) => a + b, 0) : 0)
    }
    const { r, c } = parseRef(tok)
    const v = toNumber(refValue(r, c, ctx))
    return String(Number.isNaN(v) ? 0 : v)
  })
}

/** 內部求值（共用同一個上下文，以便偵測迴圈參照） */
function evaluate(expr: string, ctx: EvalContext): FormulaValue | null {
  const formula = expr.trim()
  if (formula === '') return null
  if (ctx.depth >= MAX_DEPTH) return null

  const inner: EvalContext = { ...ctx, depth: ctx.depth + 1 }

  // 整條就是單一函式呼叫時直接套用，才能支援 IF 回傳字串
  const whole = formula.match(new RegExp(`^(${FN_NAME_PATTERN})\\((.*)\\)$`, 'i'))
  if (whole && isBalanced(whole[2])) {
    return applyFunction(whole[1].toUpperCase(), whole[2], inner)
  }

  // 否則先把函式換成值，再把參照換成值，最後算算式
  const withoutFns = substituteFunctions(formula, inner)
  if (withoutFns === null) return null

  return evaluateArithmetic(substituteReferences(withoutFns, inner))
}

/** 括號是否成對（用來判斷 `SUM(A1)+SUM(B1)` 不是單一呼叫） */
function isBalanced(s: string): boolean {
  let depth = 0
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (depth < 0) return false
  }
  return depth === 0
}

/**
 * 求值一條公式（不含前導 `=`）。
 *
 * 無法求值時回傳 null —— 呼叫端據此顯示原始公式字串，
 * 而不是顯示 undefined 或 NaN。
 */
export function evaluateFormula(expr: string, sheet: FormulaSheet): FormulaValue | null {
  // 刪除列欄後被改寫成 #REF! 的公式：與 Excel 一樣直接顯示錯誤值，
  // 而不是退回顯示公式原文（使用者會看不出它已經壞了）
  if (hasRefError(expr)) return '#REF!'
  // $A$1 / A$1 / $A1 求值時與 A1 相同；$ 只影響複製與填充時的位移
  return evaluate(stripAbsolute(expr), { sheet, visiting: new Set(), depth: 0 })
}
