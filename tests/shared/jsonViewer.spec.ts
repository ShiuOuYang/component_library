import { describe, expect, it } from 'vitest'
import {
  ancestorPathKeys,
  childrenOf,
  containerKeys,
  diffJson,
  flattenJson,
  jsonType,
  pathKey,
  pathString,
  previewValue,
  searchJson,
} from '@/components/library/shared/jsonViewer'

const data = { a: 1, list: [10, { x: 'hello' }], 'b-c': null, flag: true }

describe('jsonViewer', () => {
  it('jsonType / childrenOf', () => {
    expect([null, [], {}, 's', 1, true, undefined, () => 1].map(jsonType)).toEqual(['null', 'array', 'object', 'string', 'number', 'boolean', 'undefined', 'other'])
    expect(childrenOf([5, 6])).toEqual([[0, 5], [1, 6]])
    expect(childrenOf({ k: 1 })).toEqual([['k', 1]])
    expect(childrenOf(3)).toEqual([])
  })

  it('pathString / pathKey / ancestorPathKeys', () => {
    expect(pathString(['list', 1, 'x'])).toBe('list[1].x')
    expect(pathString(['b-c'], 'data')).toBe('data["b-c"]')
    expect(pathString([0, 'a'])).toBe('[0].a')
    expect(pathString([], 'root')).toBe('root')
    expect(pathKey(['a', 1])).toBe('["a",1]')
    expect(ancestorPathKeys(['list', 1, 'x'])).toEqual(['[]', '["list"]', '["list",1]'])
  })

  it('flattenJson：展開狀態、深度、分段顯示', () => {
    expect(flattenJson(data, new Set()).map((r) => r.key)).toEqual(['[]'])
    const all = new Set(containerKeys(data))
    expect([...all]).toEqual(['[]', '["list"]', '["list",1]'])
    const rows = flattenJson(data, all)
    expect(rows.map((r) => [r.name, r.depth, r.type, r.size, r.expanded])).toEqual([
      [null, 0, 'object', 4, true],
      ['a', 1, 'number', 0, false],
      ['list', 1, 'array', 2, true],
      [0, 2, 'number', 0, false],
      [1, 2, 'object', 1, true],
      ['x', 3, 'string', 0, false],
      ['b-c', 1, 'null', 0, false],
      ['flag', 1, 'boolean', 0, false],
    ])
    expect(containerKeys(data, 0)).toEqual(['[]'])
    // 分段：每次 2 個，已多顯示到 4 個
    const big = { arr: [1, 2, 3, 4, 5] }
    const paged = flattenJson(big, new Set(['[]', '["arr"]']), { pageSize: 2 })
    expect(paged.map((r) => r.name ?? (r.more ? `more${r.more.remaining}` : null))).toEqual([null, 'arr', 0, 1, 'more3'])
    const more = flattenJson(big, new Set(['[]', '["arr"]']), { pageSize: 2, shown: new Map([['["arr"]', 4]]) })
    expect(more.at(-1)!.more).toEqual({ remaining: 1, parentKey: '["arr"]' })
  })

  it('searchJson：鍵名與基本值，不分大小寫', () => {
    expect(searchJson(data, 'HELLO')).toEqual([['list', 1, 'x']])
    expect(searchJson(data, 'list')).toEqual([['list']])
    expect(searchJson(data, '10')).toEqual([['list', 0]])
    expect(searchJson(data, 'null')).toEqual([['b-c']])
    expect(searchJson(data, '  ')).toEqual([])
  })

  it('diffJson：新增、刪除、變更，上層標成變更', () => {
    const before = { a: 1, list: [10, 20], old: 'x', same: { k: 1 }, t: 'str', n: Number.NaN }
    const after = { a: 2, list: [10, 20, 30], same: { k: 1 }, t: 5, added: true, n: Number.NaN }
    const d = diffJson(before, after)
    expect(d.count).toEqual({ added: 2, removed: 1, changed: 2 })
    expect(d.changes.get('["a"]')).toBe('changed')
    expect(d.changes.get('["t"]')).toBe('changed')
    expect(d.changes.get('["list",2]')).toBe('added')
    expect(d.changes.get('["list"]')).toBe('changed')
    expect(d.changes.get('["added"]')).toBe('added')
    expect(d.changes.get('[]')).toBe('changed')
    expect(d.changes.has('["same"]')).toBe(false)
    expect(d.changes.has('["n"]')).toBe(false)
    expect(d.removed).toEqual([{ parentKey: '[]', path: ['old'], name: 'old', value: 'x' }])
    // 只有刪除時上層也標成變更
    const onlyRemoved = diffJson({ o: { a: 1, b: 2 } }, { o: { a: 1 } })
    expect(onlyRemoved.changes.get('["o"]')).toBe('changed')
    expect(diffJson(1, 1).count).toEqual({ added: 0, removed: 0, changed: 0 })
  })

  it('previewValue：截斷長字串', () => {
    expect(previewValue('abcdef', 3)).toEqual({ text: '"abc…"', truncated: true })
    expect(previewValue('ab', 3)).toEqual({ text: '"ab"', truncated: false })
    expect(previewValue(5, 3).text).toBe('5')
    expect(previewValue(undefined, 3).text).toBe('undefined')
    expect(previewValue(() => 1, 3).text).toContain('=>')
    expect(previewValue(null, 3).text).toBe('null')
  })
})
