/**
 * 公式解析器：字串 → 語法樹（AST）
 *
 * ⚠️ 原本的引擎是「用正規式把函式與參照換成數字字串，再算四則運算」。
 *    這個模型本身擋住了很多事：
 *      - 沒有字串：=IF(A1>0,"達標","未達") 算不出來，畫面顯示公式原文
 *      - 沒有 & 串接、沒有錯誤值（除以零顯示公式原文，不是 #DIV/0!）
 *      - 函式只能是固定的 6 個，因為「找到函式」靠的是一條寫死名稱的正規式
 *      - 範圍在運算式裡被默默換成總和：=A1:A3*2 算成「總和 × 2」
 *    改成先切 token、再依 Excel 的運算子優先序建成語法樹，
 *    求值（evaluator.ts）與函式（functions.ts）都建立在這棵樹上。
 *
 * 安全：只認得 Excel 公式的語法。任何其他東西（JavaScript 的 . [] ` ; 等）
 *       都是語法錯誤，不會被執行。
 *
 * Excel 的運算子優先序（高 → 低），與一般程式語言不同的地方標 ★：
 *   :            範圍（在 token 階段就合成一個範圍參照）
 *   - +          一元負號 ★ 比 ^ 還高，所以 -2^2 = 4
 *   %            百分比（後置）★ 不是餘數：50% = 0.5
 *   ^            次方 ★ 左結合：2^3^2 = 64
 *   * /
 *   + -
 *   &            字串串接
 *   = <> < > <= >=
 */

export type ErrorCode = '#NULL!' | '#DIV/0!' | '#VALUE!' | '#REF!' | '#NAME?' | '#NUM!' | '#N/A'

export const ERROR_CODES: readonly ErrorCode[] = ['#NULL!', '#DIV/0!', '#VALUE!', '#REF!', '#NAME?', '#NUM!', '#N/A']

/** 範圍的一端；整欄（A:A）的列、整列（1:1）的欄是 null */
export interface RefEnd {
  r: number | null
  c: number | null
}

export type Node =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'error'; code: ErrorCode }
  | { type: 'ref'; sheet: string | null; start: RefEnd; end: RefEnd | null }
  | { type: 'name'; name: string }
  | { type: 'call'; name: string; args: Node[] }
  | { type: 'missing' }
  | { type: 'unary'; op: '-' | '+'; operand: Node }
  | { type: 'percent'; operand: Node }
  | { type: 'binary'; op: BinaryOp; left: Node; right: Node }

export type BinaryOp = '+' | '-' | '*' | '/' | '^' | '&' | '=' | '<>' | '<' | '>' | '<=' | '>='

export class FormulaSyntaxError extends Error {}

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

type Token =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'error'; code: ErrorCode }
  | { type: 'ref'; sheet: string | null; start: RefEnd; end: RefEnd | null }
  | { type: 'ident'; name: string }
  | { type: 'op'; value: string }
  | { type: '(' | ')' | ',' }

function colIndex(letters: string): number {
  let c = 0
  for (const ch of letters.toUpperCase()) c = c * 26 + (ch.charCodeAt(0) - 64)
  return c
}

/** 16384 欄（XFD）× 1048576 列，與 Excel 相同；超過的「參照」其實是名稱（例如 LOG10） */
const MAX_COL = 16384
const MAX_ROW = 1048576

const CELL = /^\$?([A-Za-z]{1,3})\$?(\d+)/
const COL_ONLY = /^\$?([A-Za-z]{1,3})/
const ROW_ONLY = /^\$?(\d+)/
/** 參照後面不能緊接這些字元，否則是名稱或函式（A1B、LOG10(） */
const NAME_CONTINUES = /^[A-Za-z0-9_.(]/

/** 無引號的工作表名稱：Sheet2!、銷售!（Excel 允許非 ASCII 字元不加引號） */
const UNQUOTED_SHEET = /^([A-Za-z_À-￿][A-Za-z0-9_.À-￿]*)!/

/**
 * 從 s 的開頭讀一個參照（A1、A1:B3、A:A、1:1），不含工作表前綴。
 * 讀不到回傳 null。
 */
function readRef(s: string): { start: RefEnd; end: RefEnd | null; length: number } | null {
  const cell = s.match(CELL)
  if (cell && !NAME_CONTINUES.test(s.slice(cell[0].length))) {
    const start = { r: Number(cell[2]), c: colIndex(cell[1]) }
    if (start.c > MAX_COL || start.r < 1 || start.r > MAX_ROW) return null
    let length = cell[0].length
    let end: RefEnd | null = null
    if (s[length] === ':') {
      const rest = s.slice(length + 1)
      const cell2 = rest.match(CELL)
      if (cell2 && !NAME_CONTINUES.test(rest.slice(cell2[0].length))) {
        end = { r: Number(cell2[2]), c: colIndex(cell2[1]) }
        length += 1 + cell2[0].length
      }
    }
    return { start, end, length }
  }

  // 整欄 A:A、$A:$C
  const col = s.match(COL_ONLY)
  if (col && s[col[0].length] === ':') {
    const rest = s.slice(col[0].length + 1)
    const col2 = rest.match(COL_ONLY)
    if (col2 && !NAME_CONTINUES.test(rest.slice(col2[0].length))) {
      return {
        start: { r: null, c: colIndex(col[1]) },
        end: { r: null, c: colIndex(col2[1]) },
        length: col[0].length + 1 + col2[0].length,
      }
    }
  }

  // 整列 1:1、$2:$5
  const row = s.match(ROW_ONLY)
  if (row && s[row[0].length] === ':') {
    const rest = s.slice(row[0].length + 1)
    const row2 = rest.match(ROW_ONLY)
    if (row2 && !/^[0-9A-Za-z.]/.test(rest.slice(row2[0].length))) {
      return {
        start: { r: Number(row[1]), c: null },
        end: { r: Number(row2[1]), c: null },
        length: row[0].length + 1 + row2[0].length,
      }
    }
  }
  return null
}

const OPERATORS = ['<>', '<=', '>=', '+', '-', '*', '/', '^', '&', '=', '<', '>', '%']

export function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < input.length) {
    const ch = input[i]
    const rest = input.slice(i)

    // 空白（Excel 的空白其實是「交集」運算子，這裡不支援，當成分隔）
    if (/\s/.test(ch)) {
      i++
      continue
    }

    // 字串："" 代表一個引號
    if (ch === '"') {
      let j = i + 1
      let value = ''
      for (;;) {
        if (j >= input.length) throw new FormulaSyntaxError('字串沒有結尾的引號')
        if (input[j] === '"') {
          if (input[j + 1] === '"') {
            value += '"'
            j += 2
            continue
          }
          break
        }
        value += input[j++]
      }
      tokens.push({ type: 'string', value })
      i = j + 1
      continue
    }

    // 錯誤值
    if (ch === '#') {
      const code = ERROR_CODES.find((e) => rest.toUpperCase().startsWith(e))
      if (!code) throw new FormulaSyntaxError(`無法辨識的錯誤值：${rest}`)
      tokens.push({ type: 'error', code })
      i += code.length
      continue
    }

    // 帶引號的工作表名稱：'My Sheet'!A1（'' 代表一個單引號）
    if (ch === "'") {
      let j = i + 1
      let name = ''
      for (;;) {
        if (j >= input.length) throw new FormulaSyntaxError('工作表名稱沒有結尾的引號')
        if (input[j] === "'") {
          if (input[j + 1] === "'") {
            name += "'"
            j += 2
            continue
          }
          break
        }
        name += input[j++]
      }
      if (input[j + 1] !== '!') throw new FormulaSyntaxError('工作表名稱後面要接 !')
      const ref = readRef(input.slice(j + 2))
      if (!ref) throw new FormulaSyntaxError('工作表名稱後面要接儲存格參照')
      tokens.push({ type: 'ref', sheet: name, start: ref.start, end: ref.end })
      i = j + 2 + ref.length
      continue
    }

    // 工作表名稱!參照
    const sheet = rest.match(UNQUOTED_SHEET)
    if (sheet) {
      const ref = readRef(rest.slice(sheet[0].length))
      if (!ref) throw new FormulaSyntaxError('工作表名稱後面要接儲存格參照')
      tokens.push({ type: 'ref', sheet: sheet[1], start: ref.start, end: ref.end })
      i += sheet[0].length + ref.length
      continue
    }

    // 參照要比數字先判斷（1:1 是整列），也要比名稱先判斷（A1 不是名稱）
    if (/[$A-Za-z0-9]/.test(ch)) {
      const ref = readRef(rest)
      if (ref) {
        tokens.push({ type: 'ref', sheet: null, start: ref.start, end: ref.end })
        i += ref.length
        continue
      }
    }

    // 數字
    const num = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/)
    if (num) {
      tokens.push({ type: 'number', value: Number(num[0]) })
      i += num[0].length
      continue
    }

    // 名稱 / 函式名（可含 . 與數字：STDEV.S、LOG10）
    const ident = rest.match(/^[A-Za-z_][A-Za-z0-9_.]*/)
    if (ident) {
      tokens.push({ type: 'ident', name: ident[0] })
      i += ident[0].length
      continue
    }

    if (ch === '(' || ch === ')' || ch === ',') {
      tokens.push({ type: ch })
      i++
      continue
    }

    const op = OPERATORS.find((o) => rest.startsWith(o))
    if (op) {
      tokens.push({ type: 'op', value: op })
      i += op.length
      continue
    }

    throw new FormulaSyntaxError(`無法辨識的字元：${ch}`)
  }
  return tokens
}

// ---------------------------------------------------------------------------
// 遞迴下降
// ---------------------------------------------------------------------------

class Parser {
  private pos = 0
  constructor(private readonly tokens: Token[]) {}

  parse(): Node {
    if (this.tokens.length === 0) throw new FormulaSyntaxError('空公式')
    const node = this.comparison()
    if (this.pos !== this.tokens.length) throw new FormulaSyntaxError('公式結尾有多餘的內容')
    return node
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private op(...ops: string[]): string | null {
    const t = this.peek()
    if (t?.type === 'op' && ops.includes(t.value)) {
      this.pos++
      return t.value
    }
    return null
  }

  private binaryLevel(ops: string[], next: () => Node): Node {
    let left = next()
    for (;;) {
      const op = this.op(...ops)
      if (!op) return left
      left = { type: 'binary', op: op as BinaryOp, left, right: next() }
    }
  }

  private comparison = (): Node => this.binaryLevel(['=', '<>', '<', '>', '<=', '>='], this.concat)
  private concat = (): Node => this.binaryLevel(['&'], this.additive)
  private additive = (): Node => this.binaryLevel(['+', '-'], this.multiplicative)
  private multiplicative = (): Node => this.binaryLevel(['*', '/'], this.power)
  private power = (): Node => this.binaryLevel(['^'], this.percent)

  private percent = (): Node => {
    let node = this.prefix()
    while (this.op('%')) node = { type: 'percent', operand: node }
    return node
  }

  private prefix = (): Node => {
    const op = this.op('-', '+')
    if (op) return { type: 'unary', op: op as '-' | '+', operand: this.prefix() }
    return this.primary()
  }

  private primary(): Node {
    const t = this.peek()
    if (!t) throw new FormulaSyntaxError('公式不完整')
    this.pos++
    switch (t.type) {
      case 'number':
        return { type: 'number', value: t.value }
      case 'string':
        return { type: 'string', value: t.value }
      case 'error':
        return { type: 'error', code: t.code }
      case 'ref':
        return { type: 'ref', sheet: t.sheet, start: t.start, end: t.end }
      case '(': {
        const inner = this.comparison()
        if (this.peek()?.type !== ')') throw new FormulaSyntaxError('括號沒有成對')
        this.pos++
        return inner
      }
      case 'ident': {
        if (this.peek()?.type === '(') {
          this.pos++
          return { type: 'call', name: t.name.toUpperCase(), args: this.args() }
        }
        const upper = t.name.toUpperCase()
        if (upper === 'TRUE' || upper === 'FALSE') return { type: 'boolean', value: upper === 'TRUE' }
        return { type: 'name', name: t.name }
      }
      default:
        throw new FormulaSyntaxError('公式語法錯誤')
    }
  }

  /** 函式引數；允許省略（IF(A1,,0)） */
  private args(): Node[] {
    const args: Node[] = []
    if (this.peek()?.type === ')') {
      this.pos++
      return args
    }
    for (;;) {
      const t = this.peek()
      if (t?.type === ',' || t?.type === ')') args.push({ type: 'missing' })
      else args.push(this.comparison())
      const sep = this.peek()
      this.pos++
      if (sep?.type === ')') return args
      if (sep?.type !== ',') throw new FormulaSyntaxError('函式的括號沒有成對')
    }
  }
}

/** 解析一條公式（不含前導 =）；語法錯誤丟出 FormulaSyntaxError */
export function parseFormula(formula: string): Node {
  return new Parser(tokenize(formula)).parse()
}
