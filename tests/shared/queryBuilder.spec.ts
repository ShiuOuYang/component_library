import { describe, expect, it } from 'vitest'
import {
  appendNode,
  countRules,
  createGroup,
  createRule,
  defaultValue,
  depthOf,
  describeQuery,
  evaluateQuery,
  findNode,
  isGroup,
  moveNode,
  operatorsFor,
  qbId,
  removeNode,
  updateNode,
  validateQuery,
  valueArity,
  type QbField,
  type QbGroup,
  type QbTextLabels,
} from '@/components/library/shared/queryBuilder'

const fields: QbField[] = [
  { key: 'name', label: '名稱', type: 'text' },
  { key: 'qty', label: '數量', type: 'number' },
  { key: 'due', label: '交期', type: 'date' },
  { key: 'line', label: '線別', type: 'select', options: [{ label: 'A 線', value: 'A' }, { label: 'B 線', value: 'B' }] },
  { key: 'urgent', label: '急單', type: 'boolean' },
  { key: 'code', label: '代碼', type: 'text', operators: ['eq'] },
]
const q = (): QbGroup => ({
  id: 'root',
  combinator: 'and',
  rules: [
    { id: 'r1', field: 'qty', op: 'gt', value: 10 },
    {
      id: 'g1',
      combinator: 'or',
      rules: [
        { id: 'r2', field: 'line', op: 'eq', value: 'A' },
        { id: 'r3', field: 'urgent', op: 'eq', value: true },
      ],
    },
  ],
})

describe('queryBuilder', () => {
  it('運算子與預設值', () => {
    expect(operatorsFor(fields[0])).toContain('contains')
    expect(operatorsFor(fields[1])).toContain('between')
    expect(operatorsFor(fields[3])).toContain('in')
    expect(operatorsFor(fields[4])).toEqual(['eq'])
    expect(operatorsFor(fields[5])).toEqual(['eq'])
    expect(valueArity('empty')).toBe(0)
    expect(valueArity('between')).toBe(2)
    expect(valueArity('notIn')).toBe('list')
    expect(valueArity('eq')).toBe(1)
    expect(defaultValue(fields[1], 'between')).toEqual([null, null])
    expect(defaultValue(fields[3], 'in')).toEqual([])
    expect(defaultValue(fields[4], 'eq')).toBe(true)
    expect(defaultValue(fields[0], 'empty')).toBeUndefined()
    expect(defaultValue(fields[0], 'eq')).toBeNull()
    expect(createRule(fields[1])).toMatchObject({ field: 'qty', op: 'eq', value: null })
    expect(createGroup()).toMatchObject({ combinator: 'and', rules: [] })
    expect(qbId()).not.toBe(qbId())
  })

  it('結構操作：update / remove / append / find / move / depth / count', () => {
    const root = q()
    const u = updateNode(root, 'r2', { value: 'B' })
    expect((findNode(u, 'r2') as { value: string }).value).toBe('B')
    expect((findNode(root, 'r2') as { value: string }).value).toBe('A')
    expect(updateNode(root, 'root', { combinator: 'or' }).combinator).toBe('or')
    expect(updateNode(root, 'g1', { not: true }).rules[1]).toMatchObject({ not: true })
    expect(countRules(removeNode(root, 'r3'))).toBe(2)
    expect(countRules(removeNode(root, 'g1'))).toBe(1)
    const ap = appendNode(root, 'g1', { id: 'r4', field: 'name', op: 'contains', value: 'x' })
    expect((findNode(ap, 'g1') as QbGroup).rules.map((n) => n.id)).toEqual(['r2', 'r3', 'r4'])
    expect(findNode(root, 'nope')).toBeNull()
    expect(findNode(root, 'root')).toBe(root)
    // 移動：到別的群組、群組內、不能移到自己裡面、根不能移
    const m1 = moveNode(root, 'r1', 'g1', 1)
    expect((findNode(m1, 'g1') as QbGroup).rules.map((n) => n.id)).toEqual(['r2', 'r1', 'r3'])
    expect(m1.rules.map((n) => n.id)).toEqual(['g1'])
    const m2 = moveNode(root, 'r3', 'root', 0)
    expect(m2.rules.map((n) => n.id)).toEqual(['r3', 'r1', 'g1'])
    expect(moveNode(root, 'g1', 'g1', 0)).toBe(root)
    const nested = appendNode(root, 'g1', { id: 'g2', combinator: 'and', rules: [] })
    expect(moveNode(nested, 'g1', 'g2', 0)).toBe(nested)
    expect(moveNode(root, 'root', 'g1', 0)).toBe(root)
    expect(moveNode(root, 'nope', 'g1', 0)).toBe(root)
    expect(moveNode(root, 'r1', 'g1', 99).rules[0].id).toBe('g1')
    expect(depthOf(root, 'root')).toBe(1)
    expect(depthOf(root, 'g1')).toBe(2)
    expect(depthOf(nested, 'g2')).toBe(3)
    expect(depthOf(root, 'r1')).toBe(1)
    expect(depthOf(root, 'nope')).toBe(0)
    expect(isGroup(root.rules[1])).toBe(true)
  })

  it('validateQuery：欄位、值、範圍、空群組', () => {
    expect(validateQuery(q(), fields).size).toBe(0)
    const bad: QbGroup = {
      id: 'root',
      combinator: 'and',
      rules: [
        { id: 'a', field: 'nope', op: 'eq', value: 1 },
        { id: 'b', field: 'urgent', op: 'gt', value: 1 },
        { id: 'c', field: 'name', op: 'eq', value: '' },
        { id: 'd', field: 'line', op: 'in', value: [] },
        { id: 'e', field: 'qty', op: 'between', value: [5, null] },
        { id: 'f', field: 'qty', op: 'between', value: [9, 2] },
        { id: 'g', field: 'due', op: 'between', value: ['2026-02-01', '2026-01-01'] },
        { id: 'h', field: 'name', op: 'empty' },
        { id: 'i', field: 'qty', op: 'eq', value: Number.NaN },
        { id: 'j', field: 'qty', op: 'between', value: 'x' },
        { id: 'k', combinator: 'or', rules: [] },
      ],
    }
    expect(Object.fromEntries(validateQuery(bad, fields))).toEqual({
      a: 'field',
      b: 'field',
      c: 'value',
      d: 'value',
      e: 'value',
      f: 'range',
      g: 'range',
      i: 'value',
      j: 'value',
      k: 'emptyGroup',
    })
  })

  it('evaluateQuery：各運算子、AND / OR / NOT、空群組、未知欄位', () => {
    const row = { name: 'Alpha Board', qty: 12, due: '2026-03-10', line: 'B', urgent: true, tags: [] as string[] }
    const one = (rule: Record<string, unknown>, r: Record<string, unknown> = row) =>
      evaluateQuery({ id: 'x', combinator: 'and', rules: [{ id: 'r', ...rule } as never] }, r, [...fields, { key: 'tags', label: 'T', type: 'text' }])
    expect(one({ field: 'name', op: 'contains', value: 'BOARD' })).toBe(true)
    expect(one({ field: 'name', op: 'notContains', value: 'x' })).toBe(true)
    expect(one({ field: 'name', op: 'startsWith', value: 'al' })).toBe(true)
    expect(one({ field: 'name', op: 'endsWith', value: 'board' })).toBe(true)
    expect(one({ field: 'name', op: 'eq', value: 'alpha board' })).toBe(true)
    expect(one({ field: 'name', op: 'neq', value: 'x' })).toBe(true)
    expect(one({ field: 'qty', op: 'gt', value: 10 })).toBe(true)
    expect(one({ field: 'qty', op: 'gte', value: 12 })).toBe(true)
    expect(one({ field: 'qty', op: 'lt', value: 12 })).toBe(false)
    expect(one({ field: 'qty', op: 'lte', value: '12' })).toBe(true)
    expect(one({ field: 'qty', op: 'between', value: [10, 12] })).toBe(true)
    expect(one({ field: 'qty', op: 'between', value: 'bad' })).toBe(false)
    expect(one({ field: 'due', op: 'gt', value: '2026-03-01' })).toBe(true)
    expect(one({ field: 'due', op: 'between', value: [new Date('2026-03-01'), Date.parse('2026-03-31')] })).toBe(true)
    expect(one({ field: 'line', op: 'in', value: ['A', 'B'] })).toBe(true)
    expect(one({ field: 'line', op: 'notIn', value: ['A'] })).toBe(true)
    expect(one({ field: 'line', op: 'in', value: 'A' })).toBe(false)
    expect(one({ field: 'line', op: 'notIn', value: 'A' })).toBe(true)
    expect(one({ field: 'urgent', op: 'eq', value: true })).toBe(true)
    expect(one({ field: 'urgent', op: 'eq', value: 'true' })).toBe(true)
    expect(one({ field: 'urgent', op: 'eq', value: false })).toBe(false)
    expect(one({ field: 'tags', op: 'empty' })).toBe(true)
    expect(one({ field: 'tags', op: 'notEmpty' })).toBe(false)
    expect(one({ field: 'name', op: 'empty' }, { name: '' })).toBe(true)
    // 沒有值的比較：neq 為真、其他為假
    expect(one({ field: 'qty', op: 'neq', value: 5 }, { qty: null })).toBe(true)
    expect(one({ field: 'qty', op: 'eq', value: 5 }, { qty: 'abc' })).toBe(false)
    expect(one({ field: 'due', op: 'eq', value: '2026-01-01' }, { due: 'not a date' })).toBe(false)
    // 群組
    expect(evaluateQuery(q(), { qty: 20, line: 'B', urgent: true }, fields)).toBe(true)
    expect(evaluateQuery(q(), { qty: 20, line: 'B', urgent: false }, fields)).toBe(false)
    expect(evaluateQuery({ ...q(), not: true }, { qty: 20, line: 'B', urgent: false }, fields)).toBe(true)
    expect(evaluateQuery({ id: 'e', combinator: 'and', rules: [] }, {}, fields)).toBe(true)
    expect(evaluateQuery({ id: 'e', combinator: 'or', rules: [{ id: 'z', field: 'zzz', op: 'eq', value: 1 }, { id: 'g', combinator: 'and', rules: [] }] }, {}, fields)).toBe(true)
  })

  it('describeQuery：巢狀括號、NOT、各種值', () => {
    const l: QbTextLabels = {
      and: 'AND',
      or: 'OR',
      not: 'NOT',
      ops: { eq: '=', neq: '!=', contains: '~', notContains: '!~', startsWith: '^', endsWith: '$', gt: '>', gte: '>=', lt: '<', lte: '<=', between: 'between', in: 'in', notIn: 'not in', empty: 'is empty', notEmpty: 'not empty' },
      between: (a, b) => `between ${a}..${b}`,
      list: (items) => `[${items.join(', ')}]`,
      yes: 'yes',
      no: 'no',
      empty: '(none)',
    }
    expect(describeQuery(q(), fields, l)).toBe('數量 > 10 AND (線別 = A 線 OR 急單 = yes)')
    expect(describeQuery({ ...q(), not: true }, fields, l)).toBe('NOT(數量 > 10 AND (線別 = A 線 OR 急單 = yes))')
    const g: QbGroup = {
      id: 'r',
      combinator: 'or',
      rules: [
        { id: 'a', field: 'qty', op: 'between', value: [1, 5] },
        { id: 'b', field: 'line', op: 'in', value: ['A', 'X'] },
        { id: 'c', field: 'name', op: 'empty' },
        { id: 'd', field: 'urgent', op: 'eq', value: false },
        { id: 'e', field: 'nope', op: 'eq', value: 1 },
        { id: 'f', field: 'name', op: 'eq', value: null },
        { id: 'g', combinator: 'and', not: true, rules: [{ id: 'h', field: 'qty', op: 'gt', value: 1 }] },
        { id: 'i', combinator: 'and', rules: [] },
        { id: 'j', field: 'qty', op: 'between', value: 'x' },
        { id: 'k', field: 'line', op: 'in', value: 'x' },
      ],
    }
    expect(describeQuery(g, fields, l)).toBe(
      '數量 between 1..5 OR 線別 in [A 線, X] OR 名稱 is empty OR 急單 = no OR ? OR 名稱 = ? OR NOT(數量 > 1) OR 數量 between ?..? OR 線別 in []'
    )
    expect(describeQuery({ id: 'e', combinator: 'and', rules: [] }, fields, l)).toBe('(none)')
    expect(describeQuery({ id: 'n', combinator: 'and', not: true, rules: [{ id: 'g', combinator: 'or', rules: [{ id: 'a', field: 'qty', op: 'gt', value: 1 }, { id: 'b', field: 'qty', op: 'lt', value: 0 }] }] }, fields, l)).toBe(
      'NOT(數量 > 1 OR 數量 < 0)'
    )
  })
})
