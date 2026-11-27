import { describe, expect, it } from 'vitest'
import {
  auditFields,
  auditSnapshot,
  auditUsers,
  compareSnapshots,
  filterAudit,
  groupAuditByDay,
  sameValue,
  sortAudit,
  type AuditEntry,
} from '@/components/library/shared/auditTrail'

const E: AuditEntry[] = [
  { id: 'b', at: '2026-11-24T14:30:00', user: 'Lin', action: 'update', changes: [{ field: 'peak', from: 245, to: 250 }, { field: 'soak', from: 90, to: 75 }], note: 'BGA' },
  { id: 'a', at: '2026-11-20T09:12:00', user: 'Lin', action: 'create', target: 'R-102', changes: [{ field: 'peak', to: 245 }, { field: 'soak', to: 90 }] },
  { id: 'c', at: new Date(2026, 10, 24, 20, 0), user: 'Chen', changes: [{ field: 'ok', label: '核准', from: false, to: true }] },
  { id: 'd', at: Date.UTC(2026, 10, 26), user: 'Wang', action: 'update', changes: [{ field: 'cfg', from: { a: 1 }, to: { a: 2 } }] },
]

describe('auditTrail', () => {
  it('排序：新到舊 / 舊到新，同時間維持原順序', () => {
    expect(sortAudit(E).map((e) => e.id)).toEqual(['d', 'c', 'b', 'a'])
    expect(sortAudit(E, 'asc').map((e) => e.id)).toEqual(['a', 'b', 'c', 'd'])
    const same = [{ id: 'x', at: 1, user: 'u' }, { id: 'y', at: 1, user: 'u' }]
    expect(sortAudit(same).map((e) => e.id)).toEqual(['x', 'y'])
    expect(sortAudit([{ id: 'z', at: 'bad', user: 'u' }])[0].id).toBe('z')
  })

  it('篩選：人員、欄位、關鍵字（含欄位名稱與值）、日期區間', () => {
    expect(filterAudit(E, { users: ['Chen'] }).map((e) => e.id)).toEqual(['c'])
    expect(filterAudit(E, { fields: ['soak'] }).map((e) => e.id)).toEqual(['b', 'a'])
    expect(filterAudit(E, { query: 'bga' }).map((e) => e.id)).toEqual(['b'])
    expect(filterAudit(E, { query: '250' }).map((e) => e.id)).toEqual(['b'])
    expect(filterAudit(E, { query: '溫度' }, (f) => (f === 'peak' ? '峰值溫度' : f)).map((e) => e.id)).toEqual(['b', 'a'])
    expect(filterAudit(E, { query: '"a":2' }).map((e) => e.id)).toEqual(['d'])
    expect(filterAudit(E, { from: '2026-11-24', to: '2026-11-24' }).map((e) => e.id)).toEqual(['b', 'c'])
    expect(filterAudit(E, { from: '2026-11-25' }).map((e) => e.id)).toEqual(['d'])
    expect(filterAudit([{ id: 'x', at: 'bad', user: 'u' }], { from: '2026-01-01' })).toEqual([])
    expect(filterAudit(E, { users: [], fields: [] })).toHaveLength(4)
    // 無法序列化的物件（循環參照）也不會讓搜尋出錯
    const loop: Record<string, unknown> = {}
    loop.self = loop
    expect(filterAudit([{ id: 'x', at: 1, user: 'u', changes: [{ field: 'f', to: loop }] }], { query: 'object' })).toHaveLength(1)
  })

  it('依日期分組、人員與欄位清單', () => {
    const days = groupAuditByDay(sortAudit(E))
    expect(days.map((d) => [d.date, d.entries.map((e) => e.id)])).toEqual([
      [expect.stringMatching(/^2026-11-2[56]$/), ['d']],
      ['2026-11-24', ['c', 'b']],
      ['2026-11-20', ['a']],
    ])
    expect(groupAuditByDay([{ id: 'x', at: 'bad', user: 'u' }])[0].date).toBe('0000-00-00')
    expect(auditUsers(E)).toEqual(['Lin', 'Chen', 'Wang'])
    expect(auditFields(E)).toEqual([{ field: 'peak', label: undefined }, { field: 'soak', label: undefined }, { field: 'ok', label: '核准' }, { field: 'cfg', label: undefined }])
  })

  it('快照：初始值來自最早的 from，依時間套用到指定紀錄', () => {
    expect(auditSnapshot(E, null)).toEqual({ peak: undefined, soak: undefined, ok: false, cfg: { a: 1 } })
    expect(auditSnapshot(E, 'a')).toEqual({ peak: 245, soak: 90, ok: false, cfg: { a: 1 } })
    expect(auditSnapshot(E, 'b')).toEqual({ peak: 250, soak: 75, ok: false, cfg: { a: 1 } })
    expect(auditSnapshot(E, 'd')).toEqual({ peak: 250, soak: 75, ok: true, cfg: { a: 2 } })
    expect(auditSnapshot(E, 'nope')).toEqual(auditSnapshot(E, 'd')) // 找不到就套用全部
  })

  it('比較快照與值相等判斷', () => {
    const rows = compareSnapshots(auditSnapshot(E, 'a'), auditSnapshot(E, 'd'))
    expect(rows.filter((r) => r.changed).map((r) => r.field)).toEqual(['peak', 'soak', 'ok', 'cfg'])
    expect(compareSnapshots({ x: 1 }, { y: 2 }, ['y'])).toEqual([{ field: 'y', a: undefined, b: 2, changed: true }])
    expect(compareSnapshots({ x: 1 }, { y: 2 }).map((r) => r.field)).toEqual(['x', 'y'])
    expect(sameValue(NaN, NaN)).toBe(true)
    expect(sameValue(new Date(1), new Date(1))).toBe(true)
    expect(sameValue({ a: 1 }, { a: 1 })).toBe(true)
    expect(sameValue({ a: 1 }, null)).toBe(false)
    expect(sameValue(1, '1')).toBe(false)
  })
})
