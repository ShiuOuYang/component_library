import { describe, expect, it } from 'vitest'
import {
  countItems,
  findItem,
  flattenTree,
  insertItem,
  isDescendant,
  keyboardMove,
  moveItem,
  projectDrop,
  removeItem,
  sameStructure,
  type SortItem,
} from '@/components/library/shared/sortableList'

const tree = (): SortItem[] => [
  { id: 'a', label: 'A' },
  {
    id: 'b',
    label: 'B',
    children: [
      { id: 'b1', label: 'B1' },
      { id: 'b2', label: 'B2', children: [{ id: 'b2x', label: 'B2X' }] },
    ],
  },
  { id: 'c', label: 'C', leaf: true },
  { id: 'd', label: 'D' },
]
const ids = (items: SortItem[]): string => items.map((x) => (x.children?.length ? `${x.id}(${ids(x.children)})` : x.id)).join(' ')

describe('sortableList', () => {
  it('flattenTree：深度、父項、位置、收合、略過', () => {
    const rows = flattenTree(tree())
    expect(rows.map((r) => `${r.item.id}:${r.depth}:${r.parentId}:${r.index}/${r.siblings}`)).toEqual([
      'a:0:null:0/4',
      'b:0:null:1/4',
      'b1:1:b:0/2',
      'b2:1:b:1/2',
      'b2x:2:b2:0/1',
      'c:0:null:2/4',
      'd:0:null:3/4',
    ])
    expect(rows[1].hasChildren).toBe(true)
    expect(flattenTree(tree(), new Set(['b'])).map((r) => r.item.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(flattenTree(tree(), new Set(), 'b').map((r) => r.item.id)).toEqual(['a', 'c', 'd'])
  })

  it('findItem / isDescendant / countItems / sameStructure', () => {
    expect(findItem(tree(), 'b2x')).toMatchObject({ index: 0, parentId: 'b2' })
    expect(findItem(tree(), 'zzz')).toBeNull()
    expect(isDescendant(tree(), 'b', 'b2x')).toBe(true)
    expect(isDescendant(tree(), 'b', 'b')).toBe(true)
    expect(isDescendant(tree(), 'b', 'c')).toBe(false)
    expect(isDescendant(tree(), 'zzz', 'a')).toBe(false)
    expect(countItems(tree())).toBe(7)
    expect(sameStructure(tree(), tree())).toBe(true)
    expect(sameStructure(tree(), tree().slice(1))).toBe(false)
    expect(sameStructure(tree(), moveItem(tree(), 'b1', { parentId: 'b', index: 1 }))).toBe(false)
  })

  it('removeItem / insertItem', () => {
    const { tree: t, item } = removeItem(tree(), 'b2')
    expect(item!.id).toBe('b2')
    expect(ids(t)).toBe('a b(b1) c d')
    expect(removeItem(tree(), 'zzz').item).toBeNull()
    expect(ids(insertItem(t, item!, { parentId: null, index: 0 }))).toBe('b2(b2x) a b(b1) c d')
    expect(ids(insertItem(t, item!, { parentId: 'd', index: 5 }))).toBe('a b(b1) c d(b2(b2x))')
    expect(ids(insertItem(t, item!, { parentId: 'nope', index: 0 }))).toBe('a b(b1) c d b2(b2x)')
    // 原陣列沒被改
    const orig = tree()
    removeItem(orig, 'b1')
    expect(ids(orig)).toBe('a b(b1 b2(b2x)) c d')
  })

  it('moveItem：同層、換層、不能移進自己或子孫、不能移進 leaf', () => {
    expect(ids(moveItem(tree(), 'a', { parentId: null, index: 2 }))).toBe('b(b1 b2(b2x)) c a d')
    expect(ids(moveItem(tree(), 'd', { parentId: 'b', index: 0 }))).toBe('a b(d b1 b2(b2x)) c')
    expect(ids(moveItem(tree(), 'b2x', { parentId: null, index: 0 }))).toBe('b2x a b(b1 b2) c d')
    const t = tree()
    expect(moveItem(t, 'b', { parentId: 'b2', index: 0 })).toBe(t)
    expect(moveItem(t, 'a', { parentId: 'c', index: 0 })).toBe(t)
    expect(moveItem(t, 'a', { parentId: 'zzz', index: 0 })).toBe(t)
    expect(moveItem(t, 'zzz', { parentId: null, index: 0 })).toBe(t)
  })

  it('projectDrop：依前後列限制深度、找父項與位置', () => {
    const rows = flattenTree(tree(), new Set(), 'a')
    // rows: b(0) b1(1) b2(1) b2x(2) c(0) d(0)
    expect(projectDrop(rows, 0, 3)).toEqual({ target: { parentId: null, index: 0 }, depth: 0 })
    // 插在 b1 之前：只能是 b 的第一個子項（下一列深度 1）
    expect(projectDrop(rows, 1, 0)).toEqual({ target: { parentId: 'b', index: 0 }, depth: 1 })
    // 插在 c 之前：可以是 0（最上層）、1（b 的最後）、2（b2 的最後）、3（b2x 的子項）
    expect(projectDrop(rows, 4, 0)).toEqual({ target: { parentId: null, index: 1 }, depth: 0 })
    expect(projectDrop(rows, 4, 1)).toEqual({ target: { parentId: 'b', index: 2 }, depth: 1 })
    expect(projectDrop(rows, 4, 2)).toEqual({ target: { parentId: 'b2', index: 1 }, depth: 2 })
    expect(projectDrop(rows, 4, 9)).toEqual({ target: { parentId: 'b2x', index: 0 }, depth: 3 })
    // maxDepth 限制
    expect(projectDrop(rows, 4, 9, 2)).toEqual({ target: { parentId: 'b', index: 2 }, depth: 1 })
    // leaf 不收子項：插在 d 之前、前一列是 c（leaf）
    expect(projectDrop(rows, 5, 1)).toEqual({ target: { parentId: null, index: 2 }, depth: 0 })
    // 最後
    expect(projectDrop(rows, 99, 0)).toEqual({ target: { parentId: null, index: 3 }, depth: 0 })
    expect(projectDrop([], 0, 2)).toEqual({ target: { parentId: null, index: 0 }, depth: 0 })
  })

  it('keyboardMove：上下、到頭跳出、縮排、取消縮排', () => {
    expect(ids(keyboardMove(tree(), 'c', 'up'))).toBe('a c b(b1 b2(b2x)) d')
    expect(ids(keyboardMove(tree(), 'a', 'down'))).toBe('b(b1 b2(b2x)) a c d')
    const t = tree()
    expect(keyboardMove(t, 'a', 'up')).toBe(t)
    expect(keyboardMove(t, 'd', 'down')).toBe(t)
    // 子清單到頭：移到父項的前 / 後
    expect(ids(keyboardMove(tree(), 'b1', 'up'))).toBe('a b1 b(b2(b2x)) c d')
    expect(ids(keyboardMove(tree(), 'b2', 'down'))).toBe('a b(b1) b2(b2x) c d')
    // 縮排：成為上一個兄弟的最後一個子項
    expect(ids(keyboardMove(tree(), 'c', 'indent'))).toBe('a b(b1 b2(b2x) c) d')
    expect(ids(keyboardMove(tree(), 'b2', 'indent'))).toBe('a b(b1(b2(b2x))) c d')
    expect(keyboardMove(t, 'b2', 'indent', 2)).toBe(t)
    expect(keyboardMove(t, 'a', 'indent')).toBe(t)
    expect(keyboardMove(t, 'd', 'indent')).toBe(t) // 上一個是 leaf
    expect(keyboardMove(t, 'c', 'indent', 1)).toBe(t) // 超過層數
    // 取消縮排
    expect(ids(keyboardMove(tree(), 'b1', 'outdent'))).toBe('a b(b2(b2x)) b1 c d')
    expect(keyboardMove(t, 'a', 'outdent')).toBe(t)
    expect(keyboardMove(t, 'zzz', 'up')).toBe(t)
  })
})
