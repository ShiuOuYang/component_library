/**
 * 算式求值（遞迴下降解析器）
 *
 * ⚠️ 這裡原本是 `new Function('"use strict";return (' + s + ');')`。
 *    公式字串來自使用者輸入，也可能來自上傳的 .xlsx —— 等於把試算表內容
 *    當成 JavaScript 執行。一個內容是
 *    `=constructor.constructor('…')()` 的儲存格，只要被開啟就會在瀏覽器
 *    裡跑任意程式碼。因此改為自己解析，只認數字與運算子，
 *    語法之外的東西一律回傳 null（顯示原始公式）。
 *
 * 支援：+ - * / % ^、一元正負、括號、比較運算（> < >= <= = <>）。
 */

/** 比較運算的結果沿用 Excel 的字面值 */
export type ComparisonResult = 'TRUE' | 'FALSE'

export type ArithmeticResult = number | ComparisonResult

type TokenType = 'number' | 'op' | 'lparen' | 'rparen'

interface Token {
  type: TokenType
  value: string
}

const COMPARISON_OPS = ['>=', '<=', '<>', '>', '<', '='] as const

/** 把算式切成 token；遇到無法辨識的字元就放棄（回傳 null） */
function tokenize(input: string): Token[] | null {
  const tokens: Token[] = []
  let i = 0

  while (i < input.length) {
    const ch = input[i]

    if (ch === ' ' || ch === '\t') {
      i++
      continue
    }

    // 數字（含小數與科學記號）
    if (/[0-9.]/.test(ch)) {
      const m = input.slice(i).match(/^\d*\.?\d+(?:[eE][+-]?\d+)?/)
      if (!m) return null
      tokens.push({ type: 'number', value: m[0] })
      i += m[0].length
      continue
    }

    // 比較運算子（兩字元的要先比對）
    const twoChar = input.slice(i, i + 2)
    const cmp = COMPARISON_OPS.find((op) => op.length === 2 && op === twoChar)
    if (cmp) {
      tokens.push({ type: 'op', value: cmp })
      i += 2
      continue
    }

    if ('+-*/%^'.includes(ch) || '><='.includes(ch)) {
      tokens.push({ type: 'op', value: ch })
      i++
      continue
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen', value: ch })
      i++
      continue
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ch })
      i++
      continue
    }

    // 其他字元（字母、引號、逗號…）不屬於算式，交給呼叫端處理
    return null
  }

  return tokens
}

/**
 * 遞迴下降解析。
 *
 * 優先序（低 → 高）：
 *   比較 → 加減 → 乘除餘 → 一元正負 → 次方 → 括號 / 數字
 * 次方為右結合（2^3^2 = 2^9），與 Excel 一致的其餘為左結合。
 */
class Parser {
  private pos = 0

  constructor(private readonly tokens: Token[]) {}

  /** 解析完整算式；有剩餘 token 代表語法錯誤 */
  parse(): ArithmeticResult | null {
    const value = this.parseComparison()
    if (value === null || this.pos !== this.tokens.length) return null
    return value
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private eatOp(...ops: string[]): string | null {
    const t = this.peek()
    if (t && t.type === 'op' && ops.includes(t.value)) {
      this.pos++
      return t.value
    }
    return null
  }

  private parseComparison(): ArithmeticResult | null {
    const left = this.parseAdditive()
    if (left === null) return null

    const op = this.eatOp(...COMPARISON_OPS)
    if (!op) return left

    const right = this.parseAdditive()
    if (right === null) return null

    switch (op) {
      case '>': return left > right ? 'TRUE' : 'FALSE'
      case '<': return left < right ? 'TRUE' : 'FALSE'
      case '>=': return left >= right ? 'TRUE' : 'FALSE'
      case '<=': return left <= right ? 'TRUE' : 'FALSE'
      case '=': return left === right ? 'TRUE' : 'FALSE'
      case '<>': return left !== right ? 'TRUE' : 'FALSE'
      default: return null
    }
  }

  private parseAdditive(): number | null {
    let left = this.parseMultiplicative()
    if (left === null) return null

    for (;;) {
      const op = this.eatOp('+', '-')
      if (!op) return left

      const right = this.parseMultiplicative()
      if (right === null) return null
      left = op === '+' ? left + right : left - right
    }
  }

  private parseMultiplicative(): number | null {
    let left = this.parseUnary()
    if (left === null) return null

    for (;;) {
      const op = this.eatOp('*', '/', '%')
      if (!op) return left

      const right = this.parseUnary()
      if (right === null) return null

      if (op === '*') left = left * right
      else if (op === '/') {
        // 除以零在 Excel 是 #DIV/0!；這裡沒有錯誤值型別，回 null 讓呼叫端顯示原式
        if (right === 0) return null
        left = left / right
      } else {
        if (right === 0) return null
        left = left % right
      }
    }
  }

  private parseUnary(): number | null {
    const op = this.eatOp('+', '-')
    if (op) {
      const value = this.parseUnary()
      if (value === null) return null
      return op === '-' ? -value : value
    }
    return this.parsePower()
  }

  private parsePower(): number | null {
    const base = this.parsePrimary()
    if (base === null) return null

    if (!this.eatOp('^')) return base

    // 右結合：交給 parseUnary 才能吃到 2^-1 這種寫法
    const exponent = this.parseUnary()
    if (exponent === null) return null

    const result = base ** exponent
    return Number.isFinite(result) ? result : null
  }

  private parsePrimary(): number | null {
    const t = this.peek()
    if (!t) return null

    if (t.type === 'number') {
      this.pos++
      return Number(t.value)
    }

    if (t.type === 'lparen') {
      this.pos++
      const value = this.parseComparison()
      if (value === null) return null
      // 括號裡若是比較結果（TRUE / FALSE），無法再參與四則運算
      if (typeof value !== 'number') return null
      if (!this.peek() || this.peek()!.type !== 'rparen') return null
      this.pos++
      return value
    }

    return null
  }
}

/**
 * 求值一段只含數字與運算子的算式。
 *
 * 呼叫端必須先把儲存格參照換成數值。無法解析時回傳 null。
 */
export function evaluateArithmetic(expr: string): ArithmeticResult | null {
  const tokens = tokenize(expr)
  if (tokens === null || tokens.length === 0) return null
  return new Parser(tokens).parse()
}
