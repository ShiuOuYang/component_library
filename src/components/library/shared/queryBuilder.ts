/**
 * 條件建構器（ChptQueryBuilder）的資料模型：欄位、運算子、巢狀 AND / OR 群組；驗證、評估（前端篩選）與結構操作。
 */

export type QbFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean'

export type QbOperator =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in'
  | 'notIn'
  | 'empty'
  | 'notEmpty'

export interface QbOption {
  label: string
  value: string | number | boolean
}

export interface QbField {
  key: string
  label: string
  type: QbFieldType
  /** select 的選項 */
  options?: QbOption[]
  /** 限定可用的運算子；不給時依型別 */
  operators?: QbOperator[]
}

export interface QbRule {
  id: string
  field: string
  op: QbOperator
  value?: unknown
}

export interface QbGroup {
  id: string
  combinator: 'and' | 'or'
  /** 整組取反 */
  not?: boolean
  rules: QbNode[]
}

export type QbNode = QbRule | QbGroup

export const isGroup = (n: QbNode): n is QbGroup => 'rules' in n

const OPS: Record<QbFieldType, QbOperator[]> = {
  text: ['eq', 'neq', 'contains', 'notContains', 'startsWith', 'endsWith', 'empty', 'notEmpty'],
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'empty', 'notEmpty'],
  date: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'empty', 'notEmpty'],
  select: ['eq', 'neq', 'in', 'notIn', 'empty', 'notEmpty'],
  boolean: ['eq'],
}

/** 欄位可用的運算子 */
export function operatorsFor(field: QbField): QbOperator[] {
  return field.operators?.length ? field.operators : OPS[field.type]
}

/** 這個運算子需要幾個值：0（empty）、1、2（between）、'list'（in） */
export function valueArity(op: QbOperator): 0 | 1 | 2 | 'list' {
  if (op === 'empty' || op === 'notEmpty') return 0
  if (op === 'between') return 2
  if (op === 'in' || op === 'notIn') return 'list'
  return 1
}

/** 運算子對應的預設值 */
export function defaultValue(field: QbField, op: QbOperator): unknown {
  const a = valueArity(op)
  if (a === 0) return undefined
  if (a === 2) return [null, null]
  if (a === 'list') return []
  if (field.type === 'boolean') return true
  return null
}

let seq = 0
/** 產生 id（不需要全域唯一，同一棵樹內不重複即可） */
export const qbId = () => `qb${Date.now().toString(36)}${(seq++).toString(36)}`

export function createRule(field: QbField): QbRule {
  const op = operatorsFor(field)[0]
  return { id: qbId(), field: field.key, op, value: defaultValue(field, op) }
}

export function createGroup(rules: QbNode[] = [], combinator: 'and' | 'or' = 'and'): QbGroup {
  return { id: qbId(), combinator, rules }
}

// ---- 結構操作（都不改原物件） ----

/** 改一個節點（規則或群組） */
export function updateNode(root: QbGroup, id: string, patch: Partial<QbRule> | Partial<QbGroup>): QbGroup {
  const walk = (g: QbGroup): QbGroup => {
    if (g.id === id) return { ...g, ...(patch as Partial<QbGroup>) }
    return { ...g, rules: g.rules.map((n) => (n.id === id ? ({ ...n, ...patch } as QbNode) : isGroup(n) ? walk(n) : n)) }
  }
  return walk(root)
}

/** 移除節點（根群組不能移除） */
export function removeNode(root: QbGroup, id: string): QbGroup {
  const walk = (g: QbGroup): QbGroup => ({ ...g, rules: g.rules.filter((n) => n.id !== id).map((n) => (isGroup(n) ? walk(n) : n)) })
  return walk(root)
}

/** 在某個群組最後加一個節點 */
export function appendNode(root: QbGroup, groupId: string, node: QbNode): QbGroup {
  const walk = (g: QbGroup): QbGroup => (g.id === groupId ? { ...g, rules: [...g.rules, node] } : { ...g, rules: g.rules.map((n) => (isGroup(n) ? walk(n) : n)) })
  return walk(root)
}

export function findNode(root: QbGroup, id: string): QbNode | null {
  if (root.id === id) return root
  for (const n of root.rules) {
    if (n.id === id) return n
    if (isGroup(n)) {
      const hit = findNode(n, id)
      if (hit) return hit
    }
  }
  return null
}

/** 移動節點到某個群組的第 index 個位置；不能把群組移到自己裡面 */
export function moveNode(root: QbGroup, id: string, toGroupId: string, index: number): QbGroup {
  const node = findNode(root, id)
  if (!node || node.id === root.id) return root
  if (isGroup(node) && (node.id === toGroupId || findNode(node, toGroupId))) return root
  const without = removeNode(root, id)
  const walk = (g: QbGroup): QbGroup => {
    if (g.id === toGroupId) {
      const rules = [...g.rules]
      rules.splice(Math.max(0, Math.min(index, rules.length)), 0, node)
      return { ...g, rules }
    }
    return { ...g, rules: g.rules.map((n) => (isGroup(n) ? walk(n) : n)) }
  }
  return walk(without)
}

/** 群組的深度（根 = 1） */
export function depthOf(root: QbGroup, id: string): number {
  const walk = (g: QbGroup, d: number): number => {
    if (g.id === id) return d
    for (const n of g.rules) {
      if (n.id === id) return d + (isGroup(n) ? 1 : 0)
      if (isGroup(n)) {
        const r = walk(n, d + 1)
        if (r) return r
      }
    }
    return 0
  }
  return walk(root, 1)
}

export function countRules(root: QbGroup): number {
  return root.rules.reduce((s, n) => s + (isGroup(n) ? countRules(n) : 1), 0)
}

// ---- 驗證 ----

export type QbError = 'field' | 'value' | 'range' | 'emptyGroup'

const blank = (v: unknown) => v === null || v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v))

/** 驗證：回傳節點 id → 錯誤（沒有錯誤時是空的 Map） */
export function validateQuery(root: QbGroup, fields: readonly QbField[]): Map<string, QbError> {
  const errors = new Map<string, QbError>()
  const walk = (g: QbGroup) => {
    if (!g.rules.length) errors.set(g.id, 'emptyGroup')
    for (const n of g.rules) {
      if (isGroup(n)) {
        walk(n)
        continue
      }
      const f = fields.find((x) => x.key === n.field)
      if (!f || !operatorsFor(f).includes(n.op)) {
        errors.set(n.id, 'field')
        continue
      }
      const a = valueArity(n.op)
      if (a === 1 && blank(n.value)) errors.set(n.id, 'value')
      else if (a === 'list' && !(Array.isArray(n.value) && n.value.length)) errors.set(n.id, 'value')
      else if (a === 2) {
        const [lo, hi] = Array.isArray(n.value) ? n.value : [null, null]
        if (blank(lo) || blank(hi)) errors.set(n.id, 'value')
        else if (compare(lo, hi, f.type) > 0) errors.set(n.id, 'range')
      }
    }
  }
  walk(root)
  return errors
}

// ---- 評估（前端篩選） ----

function toComparable(v: unknown, type: QbFieldType): number | string | boolean | null {
  if (blank(v)) return null
  if (type === 'number') {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : null
  }
  if (type === 'date') {
    const t = v instanceof Date ? v.getTime() : typeof v === 'number' ? v : Date.parse(String(v))
    return Number.isFinite(t) ? t : null
  }
  if (type === 'boolean') return typeof v === 'boolean' ? v : v === 'true' || v === 1
  return v as string | number
}

function compare(a: unknown, b: unknown, type: QbFieldType): number {
  const x = toComparable(a, type)
  const y = toComparable(b, type)
  if (x === null || y === null) return NaN
  if (typeof x === 'number' && typeof y === 'number') return x - y
  return String(x).localeCompare(String(y))
}

function evalRule(rule: QbRule, row: Record<string, unknown>, field: QbField): boolean {
  const raw = row[rule.field]
  const v = rule.value
  const text = (x: unknown) => (blank(x) ? '' : String(x).toLowerCase())
  switch (rule.op) {
    case 'empty':
      return blank(raw) || (Array.isArray(raw) && !raw.length)
    case 'notEmpty':
      return !(blank(raw) || (Array.isArray(raw) && !raw.length))
    case 'contains':
      return text(raw).includes(text(v))
    case 'notContains':
      return !text(raw).includes(text(v))
    case 'startsWith':
      return text(raw).startsWith(text(v))
    case 'endsWith':
      return text(raw).endsWith(text(v))
    case 'in':
      return Array.isArray(v) && v.some((x) => compare(raw, x, field.type) === 0)
    case 'notIn':
      return !(Array.isArray(v) && v.some((x) => compare(raw, x, field.type) === 0))
    case 'between': {
      const [lo, hi] = Array.isArray(v) ? v : []
      return compare(raw, lo, field.type) >= 0 && compare(raw, hi, field.type) <= 0
    }
    default: {
      const c = field.type === 'text' ? text(raw).localeCompare(text(v)) : field.type === 'boolean' ? (toComparable(raw, 'boolean') === toComparable(v, 'boolean') ? 0 : 1) : compare(raw, v, field.type)
      if (Number.isNaN(c)) return rule.op === 'neq'
      return { eq: c === 0, neq: c !== 0, gt: c > 0, gte: c >= 0, lt: c < 0, lte: c <= 0 }[rule.op as 'eq']
    }
  }
}

/** 某一列是否符合條件；空群組視為符合，未知欄位的規則略過 */
export function evaluateQuery(root: QbGroup, row: Record<string, unknown>, fields: readonly QbField[]): boolean {
  const walk = (g: QbGroup): boolean => {
    const results = g.rules
      .map((n) => {
        if (isGroup(n)) return n.rules.length ? walk(n) : null
        const f = fields.find((x) => x.key === n.field)
        return f ? evalRule(n, row, f) : null
      })
      .filter((r): r is boolean => r !== null)
    const r = !results.length ? true : g.combinator === 'and' ? results.every(Boolean) : results.some(Boolean)
    return g.not ? !r : r
  }
  return walk(root)
}

// ---- 文字描述 ----

export interface QbTextLabels {
  and: string
  or: string
  not: string
  ops: Record<QbOperator, string>
  between: (lo: string, hi: string) => string
  list: (items: string[]) => string
  yes: string
  no: string
  empty: string
}

/** 可讀的條件文字（巢狀群組加括號） */
export function describeQuery(root: QbGroup, fields: readonly QbField[], l: QbTextLabels): string {
  const valueText = (f: QbField, v: unknown): string => {
    if (f.type === 'boolean') return v ? l.yes : l.no
    if (f.type === 'select') return f.options?.find((o) => o.value === v)?.label ?? String(v ?? '')
    return blank(v) ? '?' : String(v)
  }
  const rule = (n: QbRule): string => {
    const f = fields.find((x) => x.key === n.field)
    if (!f) return '?'
    const a = valueArity(n.op)
    const head = `${f.label} ${l.ops[n.op]}`
    if (a === 0) return head
    if (a === 2) {
      const [lo, hi] = Array.isArray(n.value) ? n.value : []
      return `${f.label} ${l.between(valueText(f, lo), valueText(f, hi))}`
    }
    if (a === 'list') return `${head} ${l.list((Array.isArray(n.value) ? n.value : []).map((v) => valueText(f, v)))}`
    return `${head} ${valueText(f, n.value)}`
  }
  const group = (g: QbGroup, top: boolean): string => {
    const parts = g.rules.map((n) => (isGroup(n) ? group(n, false) : rule(n))).filter(Boolean)
    if (!parts.length) return top ? l.empty : ''
    let s = parts.join(` ${g.combinator === 'and' ? l.and : l.or} `)
    if (!top && parts.length > 1) s = `(${s})`
    if (g.not) s = `${l.not}${top && parts.length > 1 ? `(${s})` : s.startsWith('(') ? s : `(${s})`}`
    return s
  }
  return group(root, true)
}
