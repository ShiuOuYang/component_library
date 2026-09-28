/**
 * 公式函式庫
 *
 * ⚠️ 原本只有 SUM / AVERAGE / MIN / MAX / COUNT / IF 六個。
 *    業務試算表最常用的 VLOOKUP、SUMIF、COUNTIF、IFERROR、ROUND、LEFT… 都會顯示公式原文。
 *
 * 每個函式拿到的是「還沒求值的引數語法樹」，自己決定要不要求值 ——
 * IF / IFERROR / AND 這類函式因此可以只算需要的那一支（與 Excel 相同），
 * 也不會因為沒走到的分支裡有錯誤就整條出錯。
 *
 * 型別規則照 Excel（見 value.ts）：
 *   - 彙總函式（SUM、AVERAGE…）對「範圍」只取數字，略過文字、布林與空白；
 *     直接寫在引數裡的值則會轉型："3" 算 3、TRUE 算 1、"abc" 是 #VALUE!
 *   - 範圍裡有錯誤值時，彙總結果就是那個錯誤
 */
import type { Node } from './parser'
import {
  addMonths,
  dateToSerial,
  endOfMonth,
  formatSerial,
  isDateFormat,
  MAX_SERIAL,
  nowSerial,
  parseDateText,
  serialToParts,
  timeToFraction,
  todaySerial,
} from './dates'
import {
  BLANK,
  cleanNumber,
  compareValues,
  err,
  isError,
  isRange,
  rangeItems,
  rangeOf,
  toBoolean,
  toNumber,
  toText,
  type FormulaError,
  type RangeValue,
  type Scalar,
  type Value,
} from './value'

export interface FunctionContext {
  evaluate: (node: Node) => Value
  scalar: (node: Node) => Scalar
}

export interface FunctionDef {
  min: number
  max?: number
  call: (args: Node[], ctx: FunctionContext) => Value
}

// ---------------------------------------------------------------------------
// 引數輔助
// ---------------------------------------------------------------------------

const isMissing = (n: Node | undefined) => n === undefined || n.type === 'missing'

function num(ctx: FunctionContext, node: Node | undefined, fallback = 0): number | FormulaError {
  if (isMissing(node)) return fallback
  return toNumber(ctx.scalar(node!))
}

function text(ctx: FunctionContext, node: Node | undefined, fallback = ''): string | FormulaError {
  if (isMissing(node)) return fallback
  return toText(ctx.scalar(node!))
}

function bool(ctx: FunctionContext, node: Node | undefined, fallback: boolean): boolean | FormulaError {
  if (isMissing(node)) return fallback
  return toBoolean(ctx.scalar(node!))
}

/** 單一值也當成 1×1 的範圍 */
function asRange(v: Value): RangeValue {
  if (isRange(v)) return v
  return rangeOf(1, 1, () => v)
}

/** 要當成範圍的引數；本身就是錯誤值時把錯誤傳出去（不是當成一格裝著錯誤的範圍） */
function rangeArg(ctx: FunctionContext, node: Node): RangeValue | FormulaError {
  const v = ctx.evaluate(node)
  return isError(v) ? v : asRange(v)
}

/** 取第一個錯誤；全部都不是錯誤時回傳 null */
function firstError(...vs: unknown[]): FormulaError | null {
  for (const v of vs) if (isError(v)) return v
  return null
}

/**
 * 彙總函式的數字收集（SUM、AVERAGE、MIN、MAX、PRODUCT…）
 *   範圍：只取數字，錯誤值往外傳
 *   直接的值：轉成數字，轉不了是 #VALUE!
 */
function collectNumbers(args: Node[], ctx: FunctionContext): number[] | FormulaError {
  const out: number[] = []
  for (const arg of args) {
    if (arg.type === 'missing') {
      out.push(0)
      continue
    }
    const v = ctx.evaluate(arg)
    if (isRange(v)) {
      for (const item of rangeItems(v)) {
        if (isError(item)) return item
        if (typeof item === 'number') out.push(item)
      }
    } else {
      const n = toNumber(v)
      if (isError(n)) return n
      out.push(n)
    }
  }
  return out
}

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0)

function aggregate(fn: (ns: number[]) => number | FormulaError): FunctionDef {
  return {
    min: 1,
    call: (args, ctx) => {
      const ns = collectNumbers(args, ctx)
      return isError(ns) ? ns : fn(ns)
    },
  }
}

// ---------------------------------------------------------------------------
// 條件（COUNTIF、SUMIF…）
// ---------------------------------------------------------------------------

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Excel 的萬用字元：* 任意字串、? 單一字元、~ 跳脫 */
function wildcardRegExp(pattern: string): RegExp {
  let re = ''
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]
    if (ch === '~' && i + 1 < pattern.length && '*?~'.includes(pattern[i + 1])) {
      re += escapeRegExp(pattern[++i])
    } else if (ch === '*') re += '[\\s\\S]*'
    else if (ch === '?') re += '[\\s\\S]'
    else re += escapeRegExp(ch)
  }
  return new RegExp('^' + re + '$', 'i')
}

const hasWildcard = (s: string) => /[*?~]/.test(s)

/**
 * 把條件（">5"、"<>完成"、"蘋果*"、5）轉成判斷函式。
 * 規則照 Excel：
 *   - 數字條件只比對數字格
 *   - 文字條件不分大小寫、支援萬用字元
 *   - ""   比對空白格；"<>" 比對非空白格
 */
function criterion(c: Scalar): ((cell: Scalar) => boolean) | FormulaError {
  if (isError(c)) return c
  if (typeof c === 'number') return (cell) => typeof cell === 'number' && cell === c
  if (typeof c === 'boolean') return (cell) => cell === c
  if (c === BLANK) return (cell) => cell === BLANK || cell === ''

  const m = c.match(/^(<=|>=|<>|<|>|=)?([\s\S]*)$/)!
  const op = m[1] ?? ''
  const operand = m[2]
  const asNum = operand.trim() !== '' && !Number.isNaN(Number(operand)) ? Number(operand) : null
  const upper = operand.toUpperCase()

  if (asNum !== null) {
    const test = (cell: Scalar) => {
      if (typeof cell !== 'number') return null
      const d = cell - asNum
      switch (op) {
        case '<':
          return d < 0
        case '>':
          return d > 0
        case '<=':
          return d <= 0
        case '>=':
          return d >= 0
        default:
          return d === 0
      }
    }
    if (op === '<>') return (cell) => !(typeof cell === 'number' && cell === asNum)
    return (cell) => test(cell) === true
  }

  if (upper === 'TRUE' || upper === 'FALSE') {
    const b = upper === 'TRUE'
    if (op === '<>') return (cell) => cell !== b
    if (op === '' || op === '=') return (cell) => cell === b
  }

  if (operand === '') {
    if (op === '<>') return (cell) => cell !== BLANK && cell !== ''
    if (op === '=') return (cell) => cell === BLANK
    if (op === '') return (cell) => cell === BLANK || cell === ''
  }

  if (op === '' || op === '=' || op === '<>') {
    const re = wildcardRegExp(operand)
    const match = (cell: Scalar) => typeof cell === 'string' && re.test(cell)
    return op === '<>' ? (cell) => !match(cell) : match
  }

  // 文字的大小比較
  const lower = operand.toLowerCase()
  return (cell) => {
    if (typeof cell !== 'string') return false
    const l = cell.toLowerCase()
    switch (op) {
      case '<':
        return l < lower
      case '>':
        return l > lower
      case '<=':
        return l <= lower
      default:
        return l >= lower
    }
  }
}

/**
 * *IFS 系列共用：回傳符合所有條件的位置（依列展開的索引）。
 * 每個條件範圍都要與第一個同樣大小，否則是 #VALUE!
 */
function matchingIndexes(
  pairs: [Node, Node][],
  ctx: FunctionContext,
  shape?: RangeValue
): { indexes: number[]; rows: number; cols: number } | FormulaError {
  let rows = shape?.rows ?? -1
  let cols = shape?.cols ?? -1
  let indexes: number[] | null = null
  for (const [rangeNode, critNode] of pairs) {
    const range = rangeArg(ctx, rangeNode)
    if (isError(range)) return range
    if (rows === -1) {
      rows = range.rows
      cols = range.cols
    } else if (range.rows !== rows || range.cols !== cols) return err('#VALUE!')
    const test = criterion(ctx.scalar(critNode))
    if (isError(test)) return test
    const hits: number[] = []
    const candidates = indexes ?? Array.from({ length: rows * cols }, (_, i) => i)
    for (const idx of candidates) {
      if (test(range.at(Math.floor(idx / cols), idx % cols))) hits.push(idx)
    }
    indexes = hits
  }
  return { indexes: indexes ?? [], rows, cols }
}

function pairsFrom(args: Node[], start: number): [Node, Node][] | FormulaError {
  if ((args.length - start) % 2 !== 0) return err('#VALUE!')
  const pairs: [Node, Node][] = []
  for (let i = start; i < args.length; i += 2) pairs.push([args[i], args[i + 1]])
  return pairs
}

/** SUMIFS / AVERAGEIFS / MAXIFS / MINIFS：第一個引數是要彙總的範圍 */
function conditionalOver(fn: (ns: number[]) => number | FormulaError): FunctionDef {
  return {
    min: 3,
    call: (args, ctx) => {
      const target = rangeArg(ctx, args[0])
      if (isError(target)) return target
      const pairs = pairsFrom(args, 1)
      if (isError(pairs)) return pairs
      const hit = matchingIndexes(pairs, ctx, target)
      if (isError(hit)) return hit
      const ns: number[] = []
      for (const idx of hit.indexes) {
        const v = target.at(Math.floor(idx / hit.cols), idx % hit.cols)
        if (isError(v)) return v
        if (typeof v === 'number') ns.push(v)
      }
      return fn(ns)
    },
  }
}

/** SUMIF / AVERAGEIF：(條件範圍, 條件, [要彙總的範圍]) */
function conditionalSingle(fn: (ns: number[]) => number | FormulaError): FunctionDef {
  return {
    min: 2,
    max: 3,
    call: (args, ctx) => {
      const range = rangeArg(ctx, args[0])
      if (isError(range)) return range
      const target = isMissing(args[2]) ? range : rangeArg(ctx, args[2])
      if (isError(target)) return target
      const test = criterion(ctx.scalar(args[1]))
      if (isError(test)) return test
      const ns: number[] = []
      for (let i = 0; i < range.rows; i++) {
        for (let j = 0; j < range.cols; j++) {
          if (!test(range.at(i, j))) continue
          // 要彙總的範圍依條件範圍的大小對齊左上角（Excel 的行為）
          const v = target.at(i, j)
          if (isError(v)) return v
          if (typeof v === 'number') ns.push(v)
        }
      }
      return fn(ns)
    },
  }
}

const average = (ns: number[]) => (ns.length ? sum(ns) / ns.length : err('#DIV/0!'))

// ---------------------------------------------------------------------------
// 查閱
// ---------------------------------------------------------------------------

/** 精確比對：型別要相同（5 不等於 "5"），文字不分大小寫，可選擇支援萬用字元 */
function exactMatch(target: Scalar, cell: Scalar, wildcard: boolean): boolean {
  if (cell === BLANK || isError(cell) || isError(target)) return false
  if (wildcard && typeof target === 'string' && typeof cell === 'string' && hasWildcard(target)) {
    return wildcardRegExp(target).test(cell)
  }
  if (typeof target !== typeof cell) return false
  return compareValues(target as Exclude<Scalar, FormulaError>, cell) === 0
}

/**
 * 在一維序列裡找位置（0 起算）；找不到回傳 -1。
 *   mode  0：精確（支援萬用字元）
 *   mode  1：精確，否則小於它的最大值（序列需遞增，與 Excel 的 MATCH / VLOOKUP 近似比對相同）
 *   mode -1：精確，否則大於它的最小值（序列需遞減）
 */
function findIndex(target: Scalar, items: Scalar[], mode: 0 | 1 | -1): number {
  if (mode === 0) return items.findIndex((cell) => exactMatch(target, cell, true))
  let found = -1
  for (let i = 0; i < items.length; i++) {
    const cell = items[i]
    if (cell === BLANK || isError(cell) || typeof cell !== typeof target) continue
    const d = compareValues(cell, target as Exclude<Scalar, FormulaError>)
    if (mode === 1) {
      if (d <= 0) found = i
      else break
    } else {
      if (d >= 0) found = i
      else break
    }
  }
  return found
}

function lookupTable(orientation: 'v' | 'h'): FunctionDef {
  return {
    min: 3,
    max: 4,
    call: (args, ctx) => {
      const target = ctx.scalar(args[0])
      if (isError(target)) return target
      const table = rangeArg(ctx, args[1])
      if (isError(table)) return table
      const index = num(ctx, args[2])
      if (isError(index)) return index
      const approx = bool(ctx, args[3], true)
      if (isError(approx)) return approx
      const k = Math.trunc(index)
      const span = orientation === 'v' ? table.cols : table.rows
      if (k < 1) return err('#VALUE!')
      if (k > span) return err('#REF!')
      const length = orientation === 'v' ? table.rows : table.cols
      const keys = Array.from({ length }, (_, i) => (orientation === 'v' ? table.at(i, 0) : table.at(0, i)))
      const i = findIndex(target, keys, approx ? 1 : 0)
      if (i === -1) return err('#N/A')
      return orientation === 'v' ? table.at(i, k - 1) : table.at(k - 1, i)
    },
  }
}

function vector(range: RangeValue): Scalar[] | FormulaError {
  if (range.rows !== 1 && range.cols !== 1) return err('#N/A')
  return [...rangeItems(range)]
}

// ---------------------------------------------------------------------------
// 日期引數
// ---------------------------------------------------------------------------

/** 日期引數：數字（序號）或日期文字；超出 Excel 日期範圍是 #NUM! */
function dateArg(ctx: FunctionContext, node: Node | undefined): number | FormulaError {
  const n = num(ctx, node)
  if (isError(n)) return n
  if (n < 0 || n > MAX_SERIAL + 1) return err('#NUM!')
  return n
}

function datePart(pick: (p: ReturnType<typeof serialToParts>) => number): FunctionDef {
  return {
    min: 1,
    max: 1,
    call: (args, ctx) => {
      const d = dateArg(ctx, args[0])
      return isError(d) ? d : pick(serialToParts(d))
    },
  }
}

/** 假日清單（範圍或單一值）→ 序號集合 */
function holidayArg(ctx: FunctionContext, node: Node | undefined): Set<number> | FormulaError {
  const out = new Set<number>()
  if (isMissing(node)) return out
  const range = rangeArg(ctx, node!)
  if (isError(range)) return range
  for (const v of rangeItems(range)) {
    if (v === BLANK) continue
    if (isError(v)) return v
    const n = toNumber(v)
    if (isError(n)) return n
    out.add(Math.floor(n))
  }
  return out
}

function isWorkday(serial: number, holidays: Set<number>): boolean {
  const w = serialToParts(serial).weekday
  return w !== 0 && w !== 6 && !holidays.has(serial)
}

// ---------------------------------------------------------------------------
// 數字格式（TEXT）
// ---------------------------------------------------------------------------

/**
 * TEXT 的數字格式：支援 0、#、千分位逗號、小數位數與百分比（"0.00"、"#,##0"、"0.0%"）。
 * 日期格式（yyyy、mm、dd、hh、ss…）走 dates.ts 的 formatSerial。
 */
function formatNumber(n: number, fmt: string): string {
  const m = fmt.match(/^([^0#,.%]*)([#0,]*)(?:\.(0+|#+))?(%?)([^0#,.%]*)$/)
  if (!m || (m[2] === '' && !m[3])) return String(cleanNumber(n))
  const [, prefix, intPart, decimals = '', percent, suffix] = m
  let v = percent ? n * 100 : n
  const digits = decimals.length
  v = roundHalfAway(v, digits)
  const grouping = intPart.includes(',')
  const minInt = (intPart.match(/0/g) ?? []).length
  let s = Math.abs(v).toLocaleString('en-US', {
    minimumFractionDigits: decimals.startsWith('#') ? 0 : digits,
    maximumFractionDigits: digits,
    useGrouping: grouping,
    minimumIntegerDigits: Math.max(1, minInt),
  })
  if (minInt === 0 && s.startsWith('0.')) s = s.slice(1)
  if (minInt === 0 && s === '0') s = ''
  return (v < 0 ? '-' : '') + prefix + s + percent + suffix
}

/** Excel 的四捨五入：遠離零（-2.5 → -3），並避開 1.005 這種二進位誤差 */
function roundHalfAway(n: number, digits: number): number {
  const f = 10 ** digits
  const scaled = Number((Math.abs(n) * f).toPrecision(15))
  return (Math.sign(n) * Math.round(scaled)) / f
}

function roundWith(mode: 'round' | 'up' | 'down'): FunctionDef {
  return {
    min: 1,
    max: 2,
    call: (args, ctx) => {
      const n = num(ctx, args[0])
      const d = num(ctx, args[1])
      if (isError(n)) return n
      if (isError(d)) return d
      const digits = Math.trunc(d)
      if (mode === 'round') return roundHalfAway(n, digits)
      const f = 10 ** digits
      const scaled = Number((Math.abs(n) * f).toPrecision(15))
      const r = mode === 'up' ? Math.ceil(scaled) : Math.floor(scaled)
      return (Math.sign(n) * r) / f
    },
  }
}

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------

function unaryNumber(fn: (n: number) => Scalar): FunctionDef {
  return {
    min: 1,
    max: 1,
    call: (args, ctx) => {
      const n = num(ctx, args[0])
      return isError(n) ? n : fn(n)
    },
  }
}

function unaryText(fn: (s: string) => Scalar): FunctionDef {
  return {
    min: 1,
    max: 1,
    call: (args, ctx) => {
      const s = text(ctx, args[0])
      return isError(s) ? s : fn(s)
    },
  }
}

function isFn(test: (v: Scalar) => boolean): FunctionDef {
  return { min: 1, max: 1, call: (args, ctx) => test(ctx.scalar(args[0])) }
}

function variance(ns: number[], sample: boolean): number | FormulaError {
  const n = ns.length
  if (n === 0 || (sample && n === 1)) return err('#DIV/0!')
  const mean = sum(ns) / n
  return ns.reduce((a, x) => a + (x - mean) ** 2, 0) / (sample ? n - 1 : n)
}

function sqrtOf(v: number | FormulaError): number | FormulaError {
  return isError(v) ? v : Math.sqrt(v)
}

function nth(pick: 'large' | 'small'): FunctionDef {
  return {
    min: 2,
    max: 2,
    call: (args, ctx) => {
      const ns = collectNumbers([args[0]], ctx)
      if (isError(ns)) return ns
      const k = num(ctx, args[1])
      if (isError(k)) return k
      const idx = Math.ceil(k) - 1
      if (idx < 0 || idx >= ns.length) return err('#NUM!')
      const sorted = [...ns].sort((a, b) => (pick === 'large' ? b - a : a - b))
      return sorted[idx]
    },
  }
}

const rank: FunctionDef = {
  min: 2,
  max: 3,
  call: (args, ctx) => {
    const n = num(ctx, args[0])
    if (isError(n)) return n
    const ns = collectNumbers([args[1]], ctx)
    if (isError(ns)) return ns
    const order = num(ctx, args[2])
    if (isError(order)) return order
    if (!ns.includes(n)) return err('#N/A')
    return 1 + ns.filter((x) => (order ? x < n : x > n)).length
  },
}

// ---------------------------------------------------------------------------
// 函式表
// ---------------------------------------------------------------------------

export const FUNCTIONS: Record<string, FunctionDef> = {
  // ---- 數學與統計 ----
  SUM: aggregate(sum),
  AVERAGE: aggregate(average),
  /** 這個編輯器的舊別名；匯出時轉成 AVERAGE */
  AVG: aggregate(average),
  MIN: aggregate((ns) => (ns.length ? Math.min(...ns) : 0)),
  MAX: aggregate((ns) => (ns.length ? Math.max(...ns) : 0)),
  PRODUCT: aggregate((ns) => (ns.length ? ns.reduce((a, b) => a * b, 1) : 0)),
  MEDIAN: aggregate((ns) => {
    if (!ns.length) return err('#NUM!')
    const s = [...ns].sort((a, b) => a - b)
    const mid = s.length >> 1
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
  }),
  'STDEV.S': aggregate((ns) => sqrtOf(variance(ns, true))),
  STDEV: aggregate((ns) => sqrtOf(variance(ns, true))),
  'STDEV.P': aggregate((ns) => sqrtOf(variance(ns, false))),
  'VAR.S': aggregate((ns) => variance(ns, true)),
  VAR: aggregate((ns) => variance(ns, true)),
  'VAR.P': aggregate((ns) => variance(ns, false)),
  LARGE: nth('large'),
  SMALL: nth('small'),
  RANK: rank,
  'RANK.EQ': rank,

  /** COUNT：範圍裡的數字；直接的值則是「轉得成數字的」（錯誤不算、不往外傳） */
  COUNT: {
    min: 1,
    call: (args, ctx) => {
      let n = 0
      for (const arg of args) {
        if (arg.type === 'missing') continue
        const v = ctx.evaluate(arg)
        if (isRange(v)) {
          for (const item of rangeItems(v)) if (typeof item === 'number') n++
        } else if (!isError(toNumber(v)) && v !== BLANK) n++
      }
      return n
    },
  },
  COUNTA: {
    min: 1,
    call: (args, ctx) => {
      let n = 0
      for (const arg of args) {
        if (arg.type === 'missing') continue
        const v = ctx.evaluate(arg)
        if (isRange(v)) {
          for (const item of rangeItems(v)) if (item !== BLANK) n++
        } else n++
      }
      return n
    },
  },
  COUNTBLANK: {
    min: 1,
    max: 1,
    call: (args, ctx) => {
      let n = 0
      for (const item of rangeItems(asRange(ctx.evaluate(args[0])))) if (item === BLANK || item === '') n++
      return n
    },
  },
  COUNTIF: {
    min: 2,
    max: 2,
    call: (args, ctx) => {
      const hit = matchingIndexes([[args[0], args[1]]], ctx)
      return isError(hit) ? hit : hit.indexes.length
    },
  },
  COUNTIFS: {
    min: 2,
    call: (args, ctx) => {
      const pairs = pairsFrom(args, 0)
      if (isError(pairs)) return pairs
      const hit = matchingIndexes(pairs, ctx)
      return isError(hit) ? hit : hit.indexes.length
    },
  },
  SUMIF: conditionalSingle(sum),
  AVERAGEIF: conditionalSingle(average),
  SUMIFS: conditionalOver(sum),
  AVERAGEIFS: conditionalOver(average),
  MAXIFS: conditionalOver((ns) => (ns.length ? Math.max(...ns) : 0)),
  MINIFS: conditionalOver((ns) => (ns.length ? Math.min(...ns) : 0)),
  SUMPRODUCT: {
    min: 1,
    call: (args, ctx) => {
      const ranges = args.map((a) => asRange(ctx.evaluate(a)))
      const { rows, cols } = ranges[0]
      if (ranges.some((r) => r.rows !== rows || r.cols !== cols)) return err('#VALUE!')
      let total = 0
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          let p = 1
          for (const r of ranges) {
            const v = r.at(i, j)
            if (isError(v)) return v
            p *= typeof v === 'number' ? v : 0
          }
          total += p
        }
      }
      return total
    },
  },

  ROUND: roundWith('round'),
  ROUNDUP: roundWith('up'),
  ROUNDDOWN: roundWith('down'),
  INT: unaryNumber(Math.floor),
  TRUNC: roundWith('down'),
  ABS: unaryNumber(Math.abs),
  SIGN: unaryNumber(Math.sign),
  SQRT: unaryNumber((n) => (n < 0 ? err('#NUM!') : Math.sqrt(n))),
  PI: { min: 0, max: 0, call: () => Math.PI },
  /** MOD 的結果與除數同號（Excel）：MOD(-3,2) = 1，JavaScript 的 % 是 -1 */
  MOD: {
    min: 2,
    max: 2,
    call: (args, ctx) => {
      const n = num(ctx, args[0])
      const d = num(ctx, args[1])
      const e = firstError(n, d)
      if (e) return e
      if (d === 0) return err('#DIV/0!')
      return (n as number) - (d as number) * Math.floor((n as number) / (d as number))
    },
  },
  POWER: {
    min: 2,
    max: 2,
    call: (args, ctx) => {
      const a = num(ctx, args[0])
      const b = num(ctx, args[1])
      const e = firstError(a, b)
      if (e) return e
      const r = (a as number) ** (b as number)
      return Number.isFinite(r) ? r : err('#NUM!')
    },
  },
  CEILING: {
    min: 1,
    max: 2,
    call: (args, ctx) => {
      const n = num(ctx, args[0])
      const s = num(ctx, args[1], 1)
      const e = firstError(n, s)
      if (e) return e
      if (s === 0) return 0
      return Math.ceil(cleanNumber((n as number) / (s as number))) * (s as number)
    },
  },
  FLOOR: {
    min: 1,
    max: 2,
    call: (args, ctx) => {
      const n = num(ctx, args[0])
      const s = num(ctx, args[1], 1)
      const e = firstError(n, s)
      if (e) return e
      if (s === 0) return err('#DIV/0!')
      return Math.floor(cleanNumber((n as number) / (s as number))) * (s as number)
    },
  },

  // ---- 邏輯 ----
  IF: {
    min: 1,
    max: 3,
    call: (args, ctx) => {
      const cond = toBoolean(ctx.scalar(args[0]))
      if (isError(cond)) return cond
      const branch = cond ? args[1] : args[2]
      // 省略的分支：IF(FALSE, 1) 是 FALSE；IF(TRUE, , 1) 是 0
      if (branch === undefined) return false
      if (branch.type === 'missing') return 0
      return ctx.evaluate(branch)
    },
  },
  IFS: {
    min: 2,
    call: (args, ctx) => {
      if (args.length % 2) return err('#N/A')
      for (let i = 0; i < args.length; i += 2) {
        const cond = toBoolean(ctx.scalar(args[i]))
        if (isError(cond)) return cond
        if (cond) return ctx.evaluate(args[i + 1])
      }
      return err('#N/A')
    },
  },
  SWITCH: {
    min: 3,
    call: (args, ctx) => {
      const target = ctx.scalar(args[0])
      if (isError(target)) return target
      let i = 1
      for (; i + 1 < args.length; i += 2) {
        const v = ctx.scalar(args[i])
        if (!isError(v) && exactMatch(target, v, false)) return ctx.evaluate(args[i + 1])
      }
      return i < args.length ? ctx.evaluate(args[i]) : err('#N/A')
    },
  },
  CHOOSE: {
    min: 2,
    call: (args, ctx) => {
      const i = num(ctx, args[0])
      if (isError(i)) return i
      const k = Math.trunc(i)
      if (k < 1 || k >= args.length) return err('#VALUE!')
      return ctx.evaluate(args[k])
    },
  },
  IFERROR: {
    min: 2,
    max: 2,
    call: (args, ctx) => {
      const v = ctx.evaluate(args[0])
      return isError(v) ? ctx.evaluate(args[1]) : v
    },
  },
  IFNA: {
    min: 2,
    max: 2,
    call: (args, ctx) => {
      const v = ctx.evaluate(args[0])
      return isError(v) && v.code === '#N/A' ? ctx.evaluate(args[1]) : v
    },
  },
  AND: logical((vs) => vs.every(Boolean)),
  OR: logical((vs) => vs.some(Boolean)),
  XOR: logical((vs) => vs.filter(Boolean).length % 2 === 1),
  NOT: {
    min: 1,
    max: 1,
    call: (args, ctx) => {
      const b = toBoolean(ctx.scalar(args[0]))
      return isError(b) ? b : !b
    },
  },
  TRUE: { min: 0, max: 0, call: () => true },
  FALSE: { min: 0, max: 0, call: () => false },

  // ---- 查閱 ----
  VLOOKUP: lookupTable('v'),
  HLOOKUP: lookupTable('h'),
  INDEX: {
    min: 2,
    max: 3,
    call: (args, ctx) => {
      const range = rangeArg(ctx, args[0])
      if (isError(range)) return range
      let r = num(ctx, args[1])
      let c = num(ctx, args[2], isMissing(args[2]) ? -1 : 0)
      const e = firstError(r, c)
      if (e) return e
      // 只有一列的範圍只給一個索引時，那是欄號：INDEX(A1:E1, 3) 是 C1
      if (c === -1) {
        if (range.rows === 1 && range.cols > 1) {
          c = r
          r = 1
        } else c = range.cols === 1 ? 1 : 0
      }
      const ri = Math.trunc(r as number)
      const ci = Math.trunc(c as number)
      if (ri < 0 || ci < 0 || ri > range.rows || ci > range.cols) return err('#REF!')
      // 0 代表整欄 / 整列
      if (ri === 0 && ci === 0) return range
      if (ri === 0) return rangeOf(range.rows, 1, (i) => range.at(i, ci - 1))
      if (ci === 0) return rangeOf(1, range.cols, (_, j) => range.at(ri - 1, j))
      return range.at(ri - 1, ci - 1)
    },
  },
  MATCH: {
    min: 2,
    max: 3,
    call: (args, ctx) => {
      const target = ctx.scalar(args[0])
      if (isError(target)) return target
      const source = rangeArg(ctx, args[1])
      if (isError(source)) return source
      const items = vector(source)
      if (isError(items)) return items
      const type = num(ctx, args[2], 1)
      if (isError(type)) return type
      const mode = type > 0 ? 1 : type < 0 ? -1 : 0
      const i = findIndex(target, items, mode)
      return i === -1 ? err('#N/A') : i + 1
    },
  },
  XLOOKUP: {
    min: 3,
    max: 6,
    call: (args, ctx) => {
      const target = ctx.scalar(args[0])
      if (isError(target)) return target
      const lookup = rangeArg(ctx, args[1])
      if (isError(lookup)) return lookup
      const items = vector(lookup)
      if (isError(items)) return err('#VALUE!')
      const ret = rangeArg(ctx, args[2])
      if (isError(ret)) return ret
      const matchMode = num(ctx, args[4], 0)
      const searchMode = num(ctx, args[5], 1)
      const e = firstError(matchMode, searchMode)
      if (e) return e

      const order = Array.from({ length: items.length }, (_, i) => i)
      if ((searchMode as number) < 0) order.reverse()
      let hit = -1
      for (const i of order) {
        if (exactMatch(target, items[i], matchMode === 2)) {
          hit = i
          break
        }
      }
      // -1：找不到就取比它小的最大值；1：比它大的最小值
      if (hit === -1 && (matchMode === -1 || matchMode === 1)) {
        for (const i of order) {
          const cell = items[i]
          if (cell === BLANK || isError(cell) || typeof cell !== typeof target) continue
          const d = compareValues(cell, target as Exclude<Scalar, FormulaError>)
          if (matchMode === -1 ? d > 0 : d < 0) continue
          if (hit === -1) {
            hit = i
            continue
          }
          const best = compareValues(cell, items[hit] as Exclude<Scalar, FormulaError>)
          if (matchMode === -1 ? best > 0 : best < 0) hit = i
        }
      }
      if (hit === -1) return isMissing(args[3]) ? err('#N/A') : ctx.evaluate(args[3])
      // 查閱範圍是一欄 → 回傳傳回範圍的第 hit 列（可能是一整列）
      if (lookup.cols === 1) {
        if (hit >= ret.rows) return err('#VALUE!')
        return ret.cols === 1 ? ret.at(hit, 0) : rangeOf(1, ret.cols, (_, j) => ret.at(hit, j))
      }
      if (hit >= ret.cols) return err('#VALUE!')
      return ret.rows === 1 ? ret.at(0, hit) : rangeOf(ret.rows, 1, (i) => ret.at(i, hit))
    },
  },
  ROWS: { min: 1, max: 1, call: (args, ctx) => asRange(ctx.evaluate(args[0])).rows },
  COLUMNS: { min: 1, max: 1, call: (args, ctx) => asRange(ctx.evaluate(args[0])).cols },
  ROW: {
    min: 1,
    max: 1,
    call: (args) => (args[0].type === 'ref' && args[0].start.r !== null ? args[0].start.r : err('#VALUE!')),
  },
  COLUMN: {
    min: 1,
    max: 1,
    call: (args) => (args[0].type === 'ref' && args[0].start.c !== null ? args[0].start.c : err('#VALUE!')),
  },

  // ---- 文字 ----
  LEN: unaryText((s) => [...s].length),
  UPPER: unaryText((s) => s.toUpperCase()),
  LOWER: unaryText((s) => s.toLowerCase()),
  PROPER: unaryText((s) => s.toLowerCase().replace(/(^|[^A-Za-z])([a-z])/g, (_, p, ch) => p + ch.toUpperCase())),
  /** TRIM：去掉頭尾空白，中間連續空白縮成一個（Excel 的 TRIM 與 JavaScript 的 trim 不同） */
  TRIM: unaryText((s) => s.replace(/ +/g, ' ').trim()),
  VALUE: {
    min: 1,
    max: 1,
    call: (args, ctx) => {
      const v = ctx.scalar(args[0])
      return typeof v === 'boolean' ? err('#VALUE!') : toNumber(v)
    },
  },
  LEFT: sliceText((s, n) => [...s].slice(0, n).join('')),
  RIGHT: sliceText((s, n) => (n === 0 ? '' : [...s].slice(-n).join(''))),
  MID: {
    min: 3,
    max: 3,
    call: (args, ctx) => {
      const s = text(ctx, args[0])
      const start = num(ctx, args[1])
      const n = num(ctx, args[2])
      const e = firstError(s, start, n)
      if (e) return e
      if ((start as number) < 1 || (n as number) < 0) return err('#VALUE!')
      const st = Math.trunc(start as number) - 1
      return [...(s as string)].slice(st, st + Math.trunc(n as number)).join('')
    },
  },
  REPT: {
    min: 2,
    max: 2,
    call: (args, ctx) => {
      const s = text(ctx, args[0])
      const n = num(ctx, args[1])
      const e = firstError(s, n)
      if (e) return e
      if ((n as number) < 0) return err('#VALUE!')
      return (s as string).repeat(Math.trunc(n as number))
    },
  },
  CONCATENATE: {
    min: 1,
    call: (args, ctx) => {
      let out = ''
      for (const a of args) {
        const s = text(ctx, a)
        if (isError(s)) return s
        out += s
      }
      return out
    },
  },
  /** CONCAT 與 CONCATENATE 不同：可以吃整個範圍 */
  CONCAT: {
    min: 1,
    call: (args, ctx) => {
      let out = ''
      for (const a of args) {
        const v = ctx.evaluate(a)
        for (const item of isRange(v) ? rangeItems(v) : [v as Scalar]) {
          const s = toText(item)
          if (isError(s)) return s
          out += s
        }
      }
      return out
    },
  },
  TEXTJOIN: {
    min: 3,
    call: (args, ctx) => {
      const delim = text(ctx, args[0])
      const ignoreEmpty = bool(ctx, args[1], true)
      const e = firstError(delim, ignoreEmpty)
      if (e) return e
      const parts: string[] = []
      for (const a of args.slice(2)) {
        const v = ctx.evaluate(a)
        for (const item of isRange(v) ? rangeItems(v) : [v as Scalar]) {
          const s = toText(item)
          if (isError(s)) return s
          if (ignoreEmpty && s === '') continue
          parts.push(s)
        }
      }
      return parts.join(delim as string)
    },
  },
  SUBSTITUTE: {
    min: 3,
    max: 4,
    call: (args, ctx) => {
      const s = text(ctx, args[0])
      const from = text(ctx, args[1])
      const to = text(ctx, args[2])
      const e = firstError(s, from, to)
      if (e) return e
      if (from === '') return s
      if (isMissing(args[3])) return (s as string).split(from as string).join(to as string)
      const nth = num(ctx, args[3])
      if (isError(nth)) return nth
      if (nth < 1) return err('#VALUE!')
      let idx = -1
      for (let k = 0; k < Math.trunc(nth); k++) {
        idx = (s as string).indexOf(from as string, idx + 1)
        if (idx === -1) return s
      }
      return (s as string).slice(0, idx) + to + (s as string).slice(idx + (from as string).length)
    },
  },
  REPLACE: {
    min: 4,
    max: 4,
    call: (args, ctx) => {
      const s = text(ctx, args[0])
      const start = num(ctx, args[1])
      const n = num(ctx, args[2])
      const to = text(ctx, args[3])
      const e = firstError(s, start, n, to)
      if (e) return e
      if ((start as number) < 1 || (n as number) < 0) return err('#VALUE!')
      const chars = [...(s as string)]
      chars.splice(Math.trunc(start as number) - 1, Math.trunc(n as number), to as string)
      return chars.join('')
    },
  },
  FIND: findText(false),
  SEARCH: findText(true),
  EXACT: {
    min: 2,
    max: 2,
    call: (args, ctx) => {
      const a = text(ctx, args[0])
      const b = text(ctx, args[1])
      const e = firstError(a, b)
      return e ?? a === b
    },
  },
  TEXT: {
    min: 2,
    max: 2,
    call: (args, ctx) => {
      const v = ctx.scalar(args[0])
      const fmt = text(ctx, args[1])
      if (isError(fmt)) return fmt
      if (isError(v)) return v
      const n = toNumber(v)
      if (isError(n) || typeof v === 'boolean') return toText(v)
      // 日期格式（"yyyy-mm-dd"、"hh:mm"）：原本不支援，TEXT(TODAY(),"yyyy/mm/dd") 只會吐出數字
      if (isDateFormat(fmt)) {
        if (n < 0 || n > MAX_SERIAL + 1) return err('#VALUE!')
        return formatSerial(n, fmt)
      }
      return formatNumber(n, fmt)
    },
  },

  // ---- 日期與時間（值是 Excel 日期序號，見 dates.ts） ----
  TODAY: { min: 0, max: 0, call: () => todaySerial() },
  NOW: { min: 0, max: 0, call: () => nowSerial() },
  DATE: {
    min: 3,
    max: 3,
    call: (args, ctx) => {
      const [y, m, d] = [num(ctx, args[0]), num(ctx, args[1]), num(ctx, args[2])]
      const e = firstError(y, m, d)
      if (e) return e
      return dateToSerial(y as number, m as number, d as number) ?? err('#NUM!')
    },
  },
  TIME: {
    min: 3,
    max: 3,
    call: (args, ctx) => {
      const [h, m, s] = [num(ctx, args[0]), num(ctx, args[1]), num(ctx, args[2])]
      const e = firstError(h, m, s)
      if (e) return e
      if ((h as number) < 0 || (m as number) < 0 || (s as number) < 0) return err('#NUM!')
      return timeToFraction(h as number, m as number, s as number)
    },
  },
  DATEVALUE: {
    min: 1,
    max: 1,
    call: (args, ctx) => {
      const t = text(ctx, args[0])
      if (isError(t)) return t
      const serial = parseDateText(t)
      return serial === null ? err('#VALUE!') : Math.floor(serial)
    },
  },
  TIMEVALUE: {
    min: 1,
    max: 1,
    call: (args, ctx) => {
      const t = text(ctx, args[0])
      if (isError(t)) return t
      const serial = parseDateText(t)
      return serial === null ? err('#VALUE!') : serial - Math.floor(serial)
    },
  },
  YEAR: datePart((p) => p.year),
  MONTH: datePart((p) => p.month),
  DAY: datePart((p) => p.day),
  HOUR: datePart((p) => p.hour),
  MINUTE: datePart((p) => p.minute),
  SECOND: datePart((p) => p.second),
  WEEKDAY: {
    min: 1,
    max: 2,
    call: (args, ctx) => {
      const d = dateArg(ctx, args[0])
      const type = num(ctx, args[1], 1)
      const e = firstError(d, type)
      if (e) return e
      const w = serialToParts(d as number).weekday // 0 = 週日
      switch (type) {
        case 1: return w + 1 // 週日 = 1 … 週六 = 7
        case 2: return w === 0 ? 7 : w // 週一 = 1 … 週日 = 7
        case 3: return w === 0 ? 6 : w - 1 // 週一 = 0 … 週日 = 6
        default: return err('#NUM!')
      }
    },
  },
  WEEKNUM: {
    min: 1,
    max: 2,
    call: (args, ctx) => {
      const d = dateArg(ctx, args[0])
      const type = num(ctx, args[1], 1)
      const e = firstError(d, type)
      if (e) return e
      if (type !== 1 && type !== 2) return err('#NUM!')
      const p = serialToParts(d as number)
      const jan1 = dateToSerial(p.year, 1, 1)!
      const jan1Weekday = serialToParts(jan1).weekday
      // type 1：週日開始一週；type 2：週一開始
      const offset = type === 1 ? jan1Weekday : (jan1Weekday + 6) % 7
      return Math.floor((Math.floor(d as number) - jan1 + offset) / 7) + 1
    },
  },
  EDATE: {
    min: 2,
    max: 2,
    call: (args, ctx) => {
      const d = dateArg(ctx, args[0])
      const m = num(ctx, args[1])
      const e = firstError(d, m)
      if (e) return e
      return addMonths(d as number, m as number) ?? err('#NUM!')
    },
  },
  EOMONTH: {
    min: 2,
    max: 2,
    call: (args, ctx) => {
      const d = dateArg(ctx, args[0])
      const m = num(ctx, args[1])
      const e = firstError(d, m)
      if (e) return e
      return endOfMonth(d as number, m as number) ?? err('#NUM!')
    },
  },
  DAYS: {
    min: 2,
    max: 2,
    call: (args, ctx) => {
      const end = dateArg(ctx, args[0])
      const start = dateArg(ctx, args[1])
      const e = firstError(end, start)
      if (e) return e
      return Math.floor(end as number) - Math.floor(start as number)
    },
  },
  DATEDIF: {
    min: 3,
    max: 3,
    call: (args, ctx) => {
      const start = dateArg(ctx, args[0])
      const end = dateArg(ctx, args[1])
      const unit = text(ctx, args[2])
      const e = firstError(start, end, unit)
      if (e) return e
      const a = Math.floor(start as number)
      const b = Math.floor(end as number)
      if (a > b) return err('#NUM!')
      const pa = serialToParts(a)
      const pb = serialToParts(b)
      // 完整的月數：日還沒到就少算一個月
      let months = (pb.year - pa.year) * 12 + (pb.month - pa.month)
      if (pb.day < pa.day) months -= 1
      switch ((unit as string).toUpperCase()) {
        case 'Y': return Math.floor(months / 12)
        case 'M': return months
        case 'D': return b - a
        case 'YM': return months % 12
        case 'MD': {
          if (pb.day >= pa.day) return pb.day - pa.day
          // 借上個月的天數
          const prevMonthEnd = endOfMonth(b, -1)!
          return serialToParts(prevMonthEnd).day - pa.day + pb.day
        }
        case 'YD': {
          // 把起日搬到終日那一年（或前一年）後相差的天數
          let anniversary = dateToSerial(pb.year, pa.month, pa.day)!
          if (anniversary > b) anniversary = dateToSerial(pb.year - 1, pa.month, pa.day)!
          return b - anniversary
        }
        default:
          return err('#NUM!')
      }
    },
  },
  NETWORKDAYS: {
    min: 2,
    max: 3,
    call: (args, ctx) => {
      const start = dateArg(ctx, args[0])
      const end = dateArg(ctx, args[1])
      const holidays = holidayArg(ctx, args[2])
      const e = firstError(start, end, holidays)
      if (e) return e
      let a = Math.floor(start as number)
      let b = Math.floor(end as number)
      const sign = a <= b ? 1 : -1
      if (sign < 0) [a, b] = [b, a]
      let count = 0
      for (let d = a; d <= b; d++) if (isWorkday(d, holidays as Set<number>)) count++
      return sign * count
    },
  },
  WORKDAY: {
    min: 2,
    max: 3,
    call: (args, ctx) => {
      const start = dateArg(ctx, args[0])
      const days = num(ctx, args[1])
      const holidays = holidayArg(ctx, args[2])
      const e = firstError(start, days, holidays)
      if (e) return e
      let d = Math.floor(start as number)
      let left = Math.trunc(days as number)
      const step = left >= 0 ? 1 : -1
      while (left !== 0) {
        d += step
        if (d < 1 || d > MAX_SERIAL) return err('#NUM!')
        if (isWorkday(d, holidays as Set<number>)) left -= step
      }
      return d
    },
  },

  // ---- 資訊 ----
  ISBLANK: isFn((v) => v === BLANK),
  ISNUMBER: isFn((v) => typeof v === 'number'),
  ISTEXT: isFn((v) => typeof v === 'string'),
  ISNONTEXT: isFn((v) => typeof v !== 'string'),
  ISLOGICAL: isFn((v) => typeof v === 'boolean'),
  ISERROR: isFn(isError),
  ISERR: isFn((v) => isError(v) && v.code !== '#N/A'),
  ISNA: isFn((v) => isError(v) && v.code === '#N/A'),
  NA: { min: 0, max: 0, call: () => err('#N/A') },
}

function logical(fn: (vs: boolean[]) => boolean): FunctionDef {
  return {
    min: 1,
    call: (args, ctx) => {
      const vs: boolean[] = []
      for (const arg of args) {
        if (arg.type === 'missing') continue
        const v = ctx.evaluate(arg)
        if (isRange(v)) {
          // 範圍裡的文字與空白略過
          for (const item of rangeItems(v)) {
            if (isError(item)) return item
            if (typeof item === 'boolean') vs.push(item)
            else if (typeof item === 'number') vs.push(item !== 0)
          }
        } else {
          const b = toBoolean(v)
          if (isError(b)) return b
          vs.push(b)
        }
      }
      return vs.length ? fn(vs) : err('#VALUE!')
    },
  }
}

function sliceText(fn: (s: string, n: number) => string): FunctionDef {
  return {
    min: 1,
    max: 2,
    call: (args, ctx) => {
      const s = text(ctx, args[0])
      const n = num(ctx, args[1], 1)
      const e = firstError(s, n)
      if (e) return e
      if ((n as number) < 0) return err('#VALUE!')
      return fn(s as string, Math.trunc(n as number))
    },
  }
}

/** FIND 分大小寫、不支援萬用字元；SEARCH 不分大小寫、支援萬用字元 */
function findText(insensitive: boolean): FunctionDef {
  return {
    min: 2,
    max: 3,
    call: (args, ctx) => {
      const needle = text(ctx, args[0])
      const hay = text(ctx, args[1])
      const start = num(ctx, args[2], 1)
      const e = firstError(needle, hay, start)
      if (e) return e
      const st = Math.trunc(start as number)
      if (st < 1 || st > (hay as string).length + 1) return err('#VALUE!')
      if (!insensitive) {
        const i = (hay as string).indexOf(needle as string, st - 1)
        return i === -1 ? err('#VALUE!') : i + 1
      }
      const source = hasWildcard(needle as string)
        ? wildcardRegExp(needle as string).source.slice(1, -1)
        : escapeRegExp(needle as string)
      const re = new RegExp(source, 'i')
      const m = re.exec((hay as string).slice(st - 1))
      return m ? m.index + st : err('#VALUE!')
    },
  }
}
