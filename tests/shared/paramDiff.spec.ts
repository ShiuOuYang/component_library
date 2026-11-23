import { describe, expect, it } from 'vitest'
import {
  buildDiffTree,
  countDiff,
  diffParams,
  flattenParams,
  formatParam,
  hasChanges,
  joinPath,
  lookupPath,
  splitPath,
  toleranceFor,
} from '@/components/library/shared/paramDiff'

describe('paramDiff', () => {
  it('joinPath / splitPath：物件 key、陣列 index、特殊字元的 key', () => {
    expect(joinPath('', 'oven')).toBe('oven')
    expect(joinPath('oven', 'zones')).toBe('oven.zones')
    expect(joinPath('oven.zones', 2)).toBe('oven.zones[2]')
    expect(joinPath('a', 'x y')).toBe('a["x y"]')
    expect(joinPath('', '1st')).toBe('["1st"]')
    expect(splitPath('oven.zones[2].temp')).toEqual(['oven', 'zones', '[2]', 'temp'])
    expect(splitPath('a["x y"]')).toEqual(['a', '["x y"]'])
    expect(splitPath('')).toEqual([''])
  })

  it('flattenParams：攤平；空物件 / 空陣列是葉節點；undefined 略過', () => {
    const m = flattenParams({ a: 1, b: { c: [1, { d: 'x' }], e: {}, f: [] }, g: null, h: undefined })
    expect([...m.entries()]).toEqual([
      ['a', 1],
      ['b.c[0]', 1],
      ['b.c[1].d', 'x'],
      ['b.e', {}],
      ['b.f', []],
      ['g', null],
    ])
    // 最上層就是基本型別：沒有路徑
    expect(flattenParams(5).size).toBe(0)
    expect(flattenParams([undefined]).get('[0]')).toBeNull()
  })

  it('lookupPath / toleranceFor：完全相符優先，萬用字元越長越優先，結尾 .* 對底下所有路徑', () => {
    const map = { 'oven.zones[*].temp': 2, 'oven.*': 5, 'oven.zones[1].temp': 1, 'a.*.c': 7 }
    expect(lookupPath('oven.zones[1].temp', map)).toBe(1)
    expect(lookupPath('oven.zones[3].temp', map)).toBe(2)
    expect(lookupPath('oven.speed', map)).toBe(5)
    expect(lookupPath('oven.deep.inside[2]', map)).toBe(5)
    expect(lookupPath('a.b.c', map)).toBe(7)
    expect(lookupPath('a.b.d', map)).toBeUndefined()
    expect(lookupPath('x', undefined)).toBeUndefined()
    expect(toleranceFor('x', 0.5, map)).toBe(0.5)
    expect(toleranceFor('x', undefined, undefined)).toBe(0)
  })

  it('diffParams：新增、刪除、變更、容許內、相同；差值與百分比', () => {
    const rows = diffParams(
      { a: 1, b: 'x', c: { d: 10, e: 0 }, f: [1, 2], g: true, h: {} },
      { a: 1, b: 'y', c: { d: 10.5, e: 3 }, f: [1, 2, 3], g: true, h: {}, z: null },
      { tolerance: 0.5 }
    )
    const by = Object.fromEntries(rows.map((r) => [r.path, r]))
    expect(by.a.status).toBe('same')
    expect(by.b.status).toBe('changed')
    expect(by['c.d']).toMatchObject({ status: 'within', delta: 0.5, pct: 5 })
    expect(by['c.e']).toMatchObject({ status: 'changed', delta: 3, pct: undefined })
    expect(by['f[2]']).toMatchObject({ status: 'added', left: undefined, right: 3 })
    expect(by.g.status).toBe('same')
    expect(by.h.status).toBe('same')
    expect(by.z.status).toBe('added')
    const removed = diffParams({ a: 1, b: 2 }, { a: 1 })
    expect(removed[1]).toMatchObject({ path: 'b', status: 'removed', right: undefined })
    // 浮點誤差不算超出
    expect(diffParams({ v: 0.1 }, { v: 0.1 + 0.2 - 0.2 + 0.2 }, { tolerance: 0.2 })[0].status).toBe('within')
    // 型別不同
    expect(diffParams({ v: 1 }, { v: '1' })[0].status).toBe('changed')
    expect(diffParams({ v: [] }, { v: {} })[0].status).toBe('changed')
  })

  it('diffParams：右邊新的路徑插在前一個共同路徑之後', () => {
    const rows = diffParams({ a: 1, c: 3 }, { x: 0, a: 1, b: 2, c: 3, d: 4 })
    expect(rows.map((r) => r.path)).toEqual(['x', 'a', 'b', 'c', 'd'])
  })

  it('diffParams：依路徑的容許差', () => {
    const rows = diffParams({ z: [{ t: 100 }, { t: 100 }], s: 10 }, { z: [{ t: 102 }, { t: 103 }], s: 10.4 }, { tolerances: { 'z[*].t': 2 }, tolerance: 0.5 })
    expect(rows.map((r) => r.status)).toEqual(['within', 'changed', 'within'])
  })

  it('countDiff / hasChanges', () => {
    const c = countDiff(diffParams({ a: 1, b: 2, c: 3 }, { a: 1, b: 5, d: 4 }))
    expect(c).toEqual({ added: 1, removed: 1, changed: 1, within: 0, same: 1 })
    expect(hasChanges(c)).toBe(true)
    expect(hasChanges({ added: 0, removed: 0, changed: 0, within: 3, same: 1 })).toBe(false)
  })

  it('buildDiffTree：群組計數；只有一個子節點的群組合併成一列；depth 重算', () => {
    const rows = diffParams(
      { oven: { zones: [{ temp: 150 }, { temp: 175 }], speed: 80 }, only: { one: { deep: 1 } }, top: 1 },
      { oven: { zones: [{ temp: 150 }, { temp: 180 }], speed: 80 }, only: { one: { deep: 2 } }, top: 1 }
    )
    const tree = buildDiffTree(rows)
    expect(tree.map((n) => n.key)).toEqual(['oven', 'only.one.deep', 'top'])
    const oven = tree[0]
    expect(oven.counts).toMatchObject({ changed: 1, same: 2 })
    expect(oven.children.map((n) => [n.key, n.depth])).toEqual([
      ['zones', 1],
      ['speed', 1],
    ])
    expect(oven.children[0].children.map((n) => [n.key, n.depth, n.row?.status])).toEqual([
      ['[0].temp', 2, 'same'],
      ['[1].temp', 2, 'changed'],
    ])
    expect(tree[1]).toMatchObject({ path: 'only.one.deep', depth: 0 })
    expect(tree[1].row?.status).toBe('changed')
  })

  it('formatParam', () => {
    expect(formatParam(undefined)).toBe('')
    expect(formatParam('a')).toBe('"a"')
    expect(formatParam(null)).toBe('null')
    expect(formatParam(1.5)).toBe('1.5')
    expect(formatParam(false)).toBe('false')
    expect(formatParam([])).toBe('[]')
    expect(formatParam({})).toBe('{}')
  })
})
