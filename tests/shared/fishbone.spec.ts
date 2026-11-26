import { describe, expect, it } from 'vitest'
import {
  FISHBONE_5M1E,
  FISHBONE_MAX_DEPTH,
  addCause,
  createFishbone,
  findCause,
  fishId,
  fishStats,
  fishboneOutline,
  fitText,
  flattenCauses,
  layoutFishbone,
  removeCause,
  updateCategory,
  updateCause,
  type FishboneData,
} from '@/components/library/shared/fishbone'

const base = (): FishboneData => ({
  problem: '錫橋',
  categories: [
    { id: 'man', label: '人員', causes: [{ id: 'a', text: 'A', verified: true, children: [{ id: 'a1', text: 'A1', children: [{ id: 'a11', text: 'A11' }] }] }] },
    { id: 'machine', label: '機器', causes: [{ id: 'b', text: 'B', primary: true, note: '量測過' }, { id: 'c', text: 'C', ruledOut: true }] },
    { id: 'method', label: '方法', causes: [] },
  ],
})

describe('fishbone', () => {
  it('createFishbone、5M1E、fishId 不重複', () => {
    expect(FISHBONE_5M1E).toHaveLength(6)
    expect(FISHBONE_MAX_DEPTH).toBe(3)
    const d = createFishbone('P', [{ id: 'x', label: 'X' }])
    expect(d).toEqual({ problem: 'P', categories: [{ id: 'x', label: 'X', causes: [] }] })
    expect(new Set(Array.from({ length: 50 }, () => fishId())).size).toBe(50)
    expect(fishId('z').startsWith('z')).toBe(true)
  })

  it('findCause / flattenCauses：深度、上層、位置、閱讀順序', () => {
    const d = base()
    expect(findCause(d, 'a11')).toMatchObject({ depth: 2, parentId: 'a1', index: 0, category: { id: 'man' } })
    expect(findCause(d, 'c')).toMatchObject({ depth: 0, parentId: null, index: 1 })
    expect(findCause(d, 'nope')).toBeNull()
    expect(flattenCauses(d).map((l) => l.cause.id)).toEqual(['a', 'a1', 'a11', 'b', 'c'])
  })

  it('addCause：接在分類、接在原因、超過層數、找不到、不改動原資料', () => {
    const d = base()
    const r1 = addCause(d, 'method', '新原因', 'n1')!
    expect(r1.id).toBe('n1')
    expect(r1.data.categories[2].causes).toEqual([{ id: 'n1', text: '新原因' }])
    expect(d.categories[2].causes).toEqual([])
    const r2 = addCause(d, 'b', '次要')!
    expect(findCause(r2.data, r2.id)).toMatchObject({ depth: 1, parentId: 'b' })
    const r3 = addCause(d, 'a1', '第三層')!
    expect(findCause(r3.data, r3.id)!.depth).toBe(2)
    expect(addCause(d, 'a11', '第四層')).toBeNull()
    expect(addCause(d, 'nope', 'x')).toBeNull()
  })

  it('updateCause / removeCause / updateCategory', () => {
    const d = base()
    const u = updateCause(d, 'a1', { text: 'A1!', primary: true })
    expect(findCause(u, 'a1')!.cause).toMatchObject({ text: 'A1!', primary: true })
    expect(findCause(u, 'a11')!.cause.text).toBe('A11')
    expect(findCause(d, 'a1')!.cause.text).toBe('A1')
    const r = removeCause(d, 'a1')
    expect(findCause(r, 'a1')).toBeNull()
    expect(findCause(r, 'a11')).toBeNull() // 連同底下
    expect(findCause(r, 'a')!.cause.children).toEqual([])
    expect(updateCategory(d, 'man', '人').categories[0].label).toBe('人')
  })

  it('fishStats / fishboneOutline', () => {
    const d = base()
    expect(fishStats(d)).toEqual({ categories: 3, causes: 5, primary: 1, verified: 1, ruledOut: 1 })
    expect(fishboneOutline(d).split('\n')).toEqual(['錫橋', '- 人員', '  - A ✓', '    - A1', '      - A11', '- 機器', '  - B ★ (量測過)', '  - C ✗', '- 方法'])
    expect(fishboneOutline(d, { primary: '[P]', verified: '[V]', ruledOut: '[X]' })).toContain('B [P]')
  })

  it('layoutFishbone：脊椎、魚頭、上下交錯的大骨、原因列、次要原因連線', () => {
    const d = base()
    const L = layoutFishbone(d, { rowH: 20, branchW: 100, indent: 10, labelW: 80, labelH: 20, headW: 120, headH: 60, minRows: 2 })
    expect(L.bones.map((b) => [b.category.id, b.side])).toEqual([['man', 'top'], ['machine', 'bottom'], ['method', 'top']])
    expect(L.spineY).toBe(L.height / 2)
    expect(L.head).toMatchObject({ x: L.spineX2, w: 120, h: 60, y: L.spineY - 30 })
    // 同一欄的上下大骨接在脊椎同一點；第二欄往左
    expect(L.bones[0].x1).toBe(L.bones[1].x1)
    expect(L.bones[2].x1).toBeLessThan(L.bones[0].x1)
    expect(L.bones[0].y2).toBeLessThan(L.spineY)
    expect(L.bones[1].y2).toBeGreaterThan(L.spineY)
    expect(L.bones[0].label).toMatchObject({ w: 80, h: 20, y: L.bones[0].y2 - 20 })
    expect(L.bones[1].label.y).toBe(L.bones[1].y2)
    expect(L.rows.map((r) => r.location.cause.id)).toEqual(['a', 'a1', 'a11', 'b', 'c'])
    const [a, a1, a11, b, c] = L.rows
    expect(a.link).toBeNull()
    expect(a1.link).toMatchObject({ y1: a.y, y2: a1.y })
    expect(a11.link!.y1).toBe(a1.y)
    // 越深越往左縮、列往下排
    expect(a1.x2).toBeLessThan(a.x2)
    expect(a1.y - a.y).toBe(20)
    expect(a.x2 - a.x1).toBe(100)
    // 下半部：第一個原因靠脊椎
    expect(b.y).toBeGreaterThan(L.spineY)
    expect(c.y - b.y).toBe(20)
    // 新增按鈕在下一列
    expect(L.bones[2].addAt.y).toBeGreaterThan(L.bones[2].y2)
    // 預設選項、空資料
    const E = layoutFishbone({ problem: '', categories: [] })
    expect(E.bones).toEqual([])
    expect(E.width).toBeGreaterThan(0)
    expect(layoutFishbone(d).rows).toHaveLength(5)
  })

  it('fitText：依寬度截斷，中文算兩個單位', () => {
    expect(fitText('abc', 100)).toBe('abc')
    expect(fitText('abcdefghij', 32)).toBe('abcde…')
    expect(fitText('一二三四五', 32)).toBe('一二…')
    expect(fitText('abc', 0)).toBe('ab…')
  })
})
