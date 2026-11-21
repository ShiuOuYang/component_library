import { describe, expect, it } from 'vitest'
import {
  checklistSummary,
  groupChecklist,
  itemIssue,
  itemStatus,
  judgeMeasure,
  updateResult,
  type ChecklistItem,
} from '@/components/library/shared/checklist'

const items: ChecklistItem[] = [
  { id: 'c1', label: '安全門', section: 'A' },
  { id: 'c2', label: '刮刀', section: 'A', required: false },
  { id: 'm1', label: '壓力', type: 'measure', lsl: 4.5, usl: 6.5, section: 'B' },
  { id: 't1', label: '批號', type: 'text' },
  { id: 'c3', label: '清潔', section: 'A' },
]

describe('checklist', () => {
  it('judgeMeasure：含等於界限；單邊界限；沒有值為 null', () => {
    expect([judgeMeasure(4.5, 4.5, 6.5), judgeMeasure(6.5, 4.5, 6.5), judgeMeasure(4.49, 4.5, 6.5), judgeMeasure(6.51, 4.5, 6.5)]).toEqual(['ok', 'ok', 'ng', 'ng'])
    expect([judgeMeasure(100, 4), judgeMeasure(3, 4), judgeMeasure(-5, undefined, 0), judgeMeasure(1)]).toEqual(['ok', 'ng', 'ok', 'ok'])
    expect([judgeMeasure(null, 1, 2), judgeMeasure(undefined), judgeMeasure(Number.NaN)]).toEqual([null, null, null])
  })

  it('itemStatus：check 看選擇、measure 看數值（不看存的 status）、text 看內容', () => {
    expect(itemStatus(items[0], { status: 'na' })).toBe('na')
    expect(itemStatus(items[0], undefined)).toBeNull()
    expect(itemStatus(items[2], { value: 7, status: 'ok' })).toBe('ng')
    expect(itemStatus(items[3], { text: '  ' })).toBeNull()
    expect(itemStatus(items[3], { text: 'LOT-1' })).toBe('ok')
  })

  it('itemIssue：必填未填、不合格缺原因；非必填未填沒問題；可關閉原因必填', () => {
    expect(itemIssue(items[0], undefined)).toBe('missing')
    expect(itemIssue(items[1], undefined)).toBeNull()
    expect(itemIssue(items[0], { status: 'ng' })).toBe('noteRequired')
    expect(itemIssue(items[0], { status: 'ng', note: '  ' })).toBe('noteRequired')
    expect(itemIssue(items[0], { status: 'ng', note: '已修' })).toBeNull()
    expect(itemIssue(items[0], { status: 'ng' }, false)).toBeNull()
  })

  it('checklistSummary', () => {
    const s = checklistSummary(items, { c1: { status: 'ok' }, c2: { status: 'na' }, m1: { value: 9 }, c3: { status: 'ng', note: 'x' } })
    expect(s).toEqual({ total: 5, done: 4, ok: 1, ng: 2, na: 1, missing: ['t1'], noteRequired: ['m1'], complete: false })
    const done = checklistSummary(items, { c1: { status: 'ok' }, m1: { value: 5 }, t1: { text: 'L' }, c3: { status: 'ok' } })
    expect(done.complete).toBe(true)
  })

  it('updateResult：不改原物件；measure / text 重算 status；記下時間', () => {
    const now = () => new Date('2026-11-21T01:02:03Z')
    const before = { m1: { value: 5, status: 'ok' as const, note: 'n' } }
    const after = updateResult(items[2], before, { value: 8 }, now)
    expect(before.m1.value).toBe(5)
    expect(after.m1).toEqual({ value: 8, status: 'ng', note: 'n', at: '2026-11-21T01:02:03.000Z' })
    expect(updateResult(items[3], {}, { text: 'A' }, now).t1!.status).toBe('ok')
    expect(updateResult(items[0], {}, { status: 'na' }, now).c1!.status).toBe('na')
    expect(updateResult(items[0], {}, { status: 'ok' }).c1!.at).toMatch(/T/)
  })

  it('groupChecklist：照出現順序，同名 section 合併，沒有 section 的一組', () => {
    expect(groupChecklist(items).map((g) => [g.section, g.items.map((i) => i.id)])).toEqual([
      ['A', ['c1', 'c2', 'c3']],
      ['B', ['m1']],
      [null, ['t1']],
    ])
  })
})
