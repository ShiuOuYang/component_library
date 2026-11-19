import { describe, expect, it } from 'vitest'
import { dropIndex, groupCards, indexInColumn, moveCard } from '@/components/library/shared/kanban'

const cards = () => [
  { id: 1, s: 'todo' },
  { id: 2, s: 'doing' },
  { id: 3, s: 'todo' },
  { id: 4, s: 'done' },
  { id: 5, s: 'todo' },
]
const opts = { keyField: 'id', columnField: 's' }
const ids = (list: Array<{ id: number }>) => list.map((c) => c.id)
const col = (list: Array<{ id: number; s: string }>, s: string) => ids(list.filter((c) => c.s === s))

describe('kanban', () => {
  it('groupCards：依欄分組並保持順序；不認識的欄略過', () => {
    const g = groupCards([...cards(), { id: 9, s: 'x' }], ['todo', 'doing', 'done'], 's')
    expect(ids(g.get('todo')!)).toEqual([1, 3, 5])
    expect(ids(g.get('doing')!)).toEqual([2])
    expect(g.has('x')).toBe(false)
  })

  it('moveCard：換欄到指定位置、放最後、移到空欄；被移的卡片換成新物件', () => {
    const list = cards()
    let next = moveCard(list, 1, 'doing', 0, opts)
    expect(col(next, 'doing')).toEqual([1, 2])
    expect(col(next, 'todo')).toEqual([3, 5])
    expect(next.find((c) => c.id === 1)).not.toBe(list[0])
    expect(next.find((c) => c.id === 2)).toBe(list[1])
    next = moveCard(list, 1, 'done', 99, opts)
    expect(col(next, 'done')).toEqual([4, 1])
    next = moveCard(list, 1, 'empty', 0, opts)
    expect(col(next, 'empty')).toEqual([1])
    expect(next.at(-1)!.id).toBe(1)
  })

  it('moveCard：同一欄調整順序；負的位置當 0；找不到時原樣', () => {
    expect(col(moveCard(cards(), 5, 'todo', 0, opts), 'todo')).toEqual([5, 1, 3])
    expect(col(moveCard(cards(), 1, 'todo', 1, opts), 'todo')).toEqual([3, 1, 5])
    expect(col(moveCard(cards(), 1, 'todo', 2, opts), 'todo')).toEqual([3, 5, 1])
    expect(col(moveCard(cards(), 3, 'todo', -4, opts), 'todo')).toEqual([3, 1, 5])
    expect(ids(moveCard(cards(), 99, 'todo', 0, opts))).toEqual([1, 2, 3, 4, 5])
  })

  it('indexInColumn / dropIndex', () => {
    expect(indexInColumn(cards(), 5, opts)).toBe(2)
    expect(indexInColumn(cards(), 99, opts)).toBe(-1)
    expect(dropIndex([10, 30, 50], 5)).toBe(0)
    expect(dropIndex([10, 30, 50], 31)).toBe(2)
    expect(dropIndex([10, 30, 50], 60)).toBe(3)
    expect(dropIndex([], 0)).toBe(0)
  })
})
