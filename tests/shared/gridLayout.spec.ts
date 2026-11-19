import { describe, expect, it } from 'vitest'
import { bottom, clampItem, collides, compact, findSpace, moveItem, sameLayout, sortLayout, type GridItem } from '@/components/library/shared/gridLayout'

const box = (id: string, x: number, y: number, w = 1, h = 1, extra: Partial<GridItem> = {}): GridItem => ({ id, x, y, w, h, ...extra })
const pos = (layout: GridItem[]) => Object.fromEntries(layout.map((it) => [it.id, [it.x, it.y, it.w, it.h]]))

describe('collides / bottom / sortLayout', () => {
  it('重疊判斷（邊貼邊不算）；同一個 id 不算', () => {
    expect(collides(box('a', 0, 0, 2, 2), box('b', 1, 1))).toBe(true)
    expect(collides(box('a', 0, 0, 2, 2), box('b', 2, 0))).toBe(false)
    expect(collides(box('a', 0, 0, 2, 2), box('b', 0, 2))).toBe(false)
    expect(collides(box('a', 0, 0), box('a', 0, 0))).toBe(false)
  })
  it('bottom、sortLayout', () => {
    expect(bottom([box('a', 0, 0, 1, 3), box('b', 1, 2, 1, 4)])).toBe(6)
    expect(bottom([])).toBe(0)
    expect(sortLayout([box('a', 3, 1), box('b', 0, 1), box('c', 5, 0)]).map((i) => i.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('clampItem', () => {
  it('限制在欄數與 min / max 之內、取整數', () => {
    expect(clampItem(box('a', 10, -2, 5, 0), 12)).toMatchObject({ x: 7, y: 0, w: 5, h: 1 })
    expect(clampItem(box('a', 0, 1.6, 20, 9, { minW: 2, maxW: 6, minH: 2, maxH: 4 }), 12)).toMatchObject({ x: 0, y: 2, w: 6, h: 4 })
    expect(clampItem(box('a', 0, 0, 1, 1, { minW: 3 }), 12).w).toBe(3)
  })
})

describe('compact', () => {
  it('往上靠攏；被 static 擋住時停在它下面（不會跳過）', () => {
    const layout = [box('s', 0, 1, 2, 1, { static: true }), box('a', 0, 5, 2, 1), box('b', 2, 4, 1, 2)]
    expect(pos(compact(layout))).toEqual({ s: [0, 1, 2, 1], a: [0, 2, 2, 1], b: [2, 0, 1, 2] })
  })
  it('靠攏後若被 static 擋住就往下找空位；none 不動', () => {
    const layout = [box('s', 0, 0, 2, 1, { static: true }), box('a', 0, 0, 2, 2)]
    expect(pos(compact(layout)).a).toEqual([0, 1, 2, 2])
    expect(pos(compact([box('a', 0, 3)], 'none')).a).toEqual([0, 3, 1, 1])
  })
})

describe('moveItem', () => {
  // a b
  // c
  const base = () => [box('a', 0, 0, 2, 1), box('b', 2, 0, 2, 1), box('c', 0, 1, 2, 1)]

  it('移到別人的位置：被擋到的往下推，其他往上靠攏', () => {
    const next = moveItem(base(), 'c', { x: 2, y: 0 }, 4)
    // c 佔了 b 的位置；b 被推到 c 下面；a 不動
    expect(pos(next)).toEqual({ a: [0, 0, 2, 1], b: [2, 1, 2, 1], c: [2, 0, 2, 1] })
  })

  it('連鎖推開', () => {
    const layout = [box('a', 0, 0, 1, 1), box('b', 0, 1, 1, 1), box('c', 0, 2, 1, 1), box('x', 1, 0, 1, 1)]
    const next = moveItem(layout, 'x', { x: 0, y: 0 }, 2)
    expect(pos(next)).toEqual({ x: [0, 0, 1, 1], a: [0, 1, 1, 1], b: [0, 2, 1, 1], c: [0, 3, 1, 1] })
  })

  it('調整大小也會推開別人；限制在欄數內', () => {
    const next = moveItem(base(), 'a', { w: 9, h: 2 }, 4)
    expect(pos(next).a).toEqual([0, 0, 4, 2])
    expect(pos(next).b[1]).toBeGreaterThanOrEqual(2)
    expect(pos(next).c[1]).toBeGreaterThanOrEqual(2)
    expect(next.filter((v) => v.id !== 'a').every((v) => !collides(v, next[0]))).toBe(true)
  })

  it('static：不能移動、不會被推、別人不能蓋上去（被推下去時繞過它）', () => {
    const layout = [box('s', 0, 1, 2, 1, { static: true }), box('a', 0, 0, 2, 1), box('b', 2, 0, 2, 1)]
    expect(pos(moveItem(layout, 's', { x: 2 }, 4))).toEqual(pos(layout))
    // b 想移到 s 的位置：放到 s 下面
    expect(pos(moveItem(layout, 'b', { x: 0, y: 1 }, 4)).b).toEqual([0, 2, 2, 1])
    // b 移到 a 的位置：a 被推下去，但 s 擋在 y=1 → a 到 y=2
    const next = moveItem(layout, 'b', { x: 0, y: 0 }, 4)
    expect(pos(next).b).toEqual([0, 0, 2, 1])
    expect(pos(next).a).toEqual([0, 2, 2, 1])
    expect(pos(next).s).toEqual([0, 1, 2, 1])
  })

  it('compact=none：不往上靠攏；找不到 id 時原樣回傳', () => {
    const next = moveItem([box('a', 0, 0), box('b', 0, 3)], 'a', { y: 1 }, 4, 'none')
    expect(pos(next)).toEqual({ a: [0, 1, 1, 1], b: [0, 3, 1, 1] })
    expect(pos(moveItem(base(), 'zzz', { x: 1 }, 4))).toEqual(pos(base()))
  })

  it('兩個方塊被推到同一列時不會互推到無限循環', () => {
    // a 變大後同時壓到 b 與 c；b、c 被推到同一列且彼此重疊
    const layout = [box('a', 0, 0, 4, 2), box('b', 4, 0, 4, 2), box('c', 0, 2, 8, 2)]
    const next = moveItem(layout, 'a', { w: 6, h: 3 }, 12)
    expect(pos(next).a).toEqual([0, 0, 6, 3])
    for (const x of next) for (const y of next) expect(collides(x, y)).toBe(false)
  })

  it('不改動原本的陣列', () => {
    const layout = base()
    const snapshot = JSON.stringify(layout)
    moveItem(layout, 'c', { x: 2, y: 0 }, 4)
    expect(JSON.stringify(layout)).toBe(snapshot)
  })
})

describe('findSpace / sameLayout', () => {
  it('找第一個放得下的位置；放不下就接在最下面', () => {
    const layout = [box('a', 0, 0, 2, 1), box('b', 3, 0, 1, 1)]
    expect(findSpace(layout, 1, 1, 4)).toEqual({ x: 2, y: 0 })
    expect(findSpace(layout, 2, 1, 4)).toEqual({ x: 0, y: 1 })
    expect(findSpace([box('a', 0, 0, 4, 1)], 9, 1, 4)).toEqual({ x: 0, y: 1 })
  })
  it('sameLayout 只比位置與大小', () => {
    expect(sameLayout([box('a', 0, 0)], [{ ...box('a', 0, 0), static: true }])).toBe(true)
    expect(sameLayout([box('a', 0, 0)], [box('a', 0, 1)])).toBe(false)
    expect(sameLayout([box('a', 0, 0)], [box('b', 0, 0)])).toBe(false)
    expect(sameLayout([box('a', 0, 0)], [])).toBe(false)
  })
})
