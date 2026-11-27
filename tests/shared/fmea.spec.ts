import { describe, expect, it } from 'vitest'
import {
  actionOverdue,
  actionPriority,
  actionState,
  clampRating,
  createFmeaRow,
  filterFmea,
  fmeaExportRows,
  fmeaId,
  fmeaSummary,
  localDayKey,
  rpnOf,
  sortFmea,
  updateFmeaRow,
  type FmeaRow,
} from '@/components/library/shared/fmea'

const r = (id: string, s: number, o: number, d: number, extra: Partial<FmeaRow> = {}): FmeaRow => ({
  id,
  item: 'step',
  failureMode: `fm-${id}`,
  severity: s,
  occurrence: o,
  detection: d,
  ...extra,
})

describe('fmea', () => {
  it('評分限制在 1–10、RPN', () => {
    expect(clampRating(0)).toBe(1)
    expect(clampRating(11)).toBe(10)
    expect(clampRating(6.6)).toBe(7)
    expect(clampRating('x')).toBe(1)
    expect(clampRating(undefined)).toBe(1)
    expect(rpnOf({ severity: 8, occurrence: 6, detection: 3 })).toBe(144)
    expect(rpnOf({ severity: 0, occurrence: 6, detection: 3 })).toBe(18)
  })

  it('AP 查表（AIAG-VDA）：各嚴重度區間的代表格', () => {
    const ap = (s: number, o: number, d: number) => actionPriority({ severity: s, occurrence: o, detection: d })
    // 嚴重度 9–10
    expect(ap(10, 8, 1)).toBe('H')
    expect(ap(9, 4, 1)).toBe('M')
    expect(ap(9, 2, 7)).toBe('H')
    expect(ap(9, 2, 5)).toBe('M')
    expect(ap(9, 3, 2)).toBe('L')
    expect(ap(10, 1, 10)).toBe('L')
    // 嚴重度 7–8
    expect(ap(8, 6, 1)).toBe('M')
    expect(ap(7, 6, 2)).toBe('H')
    expect(ap(7, 4, 8)).toBe('H')
    expect(ap(7, 4, 5)).toBe('M')
    expect(ap(8, 2, 7)).toBe('M')
    expect(ap(8, 2, 3)).toBe('L')
    // 嚴重度 4–6
    expect(ap(6, 9, 7)).toBe('H')
    expect(ap(6, 9, 3)).toBe('M')
    expect(ap(5, 6, 1)).toBe('L')
    expect(ap(4, 5, 8)).toBe('M')
    expect(ap(4, 5, 6)).toBe('L')
    expect(ap(6, 2, 10)).toBe('L')
    // 嚴重度 2–3、1
    expect(ap(3, 8, 6)).toBe('M')
    expect(ap(2, 8, 3)).toBe('L')
    expect(ap(3, 7, 10)).toBe('L')
    expect(ap(1, 10, 10)).toBe('L')
  })

  it('RPN 一樣、AP 不同：嚴重度高的不會被掩蓋', () => {
    // 都是 RPN 100
    expect(actionPriority({ severity: 10, occurrence: 5, detection: 2 })).toBe('H')
    expect(actionPriority({ severity: 2, occurrence: 5, detection: 10 })).toBe('L')
  })

  it('當地日期鍵：只有日期的字串當當地日期', () => {
    expect(localDayKey('2026-11-27')).toBe(20261127)
    expect(localDayKey(new Date(2026, 0, 5, 23, 59))).toBe(20260105)
    expect(localDayKey(new Date(2026, 0, 5).getTime())).toBe(20260105)
    expect(localDayKey('2026-01-05T10:00:00')).toBe(20260105)
    expect(localDayKey('nope')).toBeNull()
    expect(localDayKey('')).toBeNull()
    expect(localDayKey(null)).toBeNull()
  })

  it('對策逾期與狀態', () => {
    const today = '2026-11-27'
    expect(actionOverdue({ id: 'a', text: '', due: '2026-11-26' }, today)).toBe(true)
    expect(actionOverdue({ id: 'a', text: '', due: '2026-11-27' }, today)).toBe(false) // 當天不算
    expect(actionOverdue({ id: 'a', text: '', due: '2026-11-26', done: true }, today)).toBe(false)
    expect(actionOverdue({ id: 'a', text: '' }, today)).toBe(false)
    expect(actionOverdue({ id: 'a', text: '', due: '2000-01-01' })).toBe(true) // 預設今天
    expect(actionState(r('1', 5, 5, 5), today)).toBe('none')
    expect(actionState(r('1', 5, 5, 5, { actions: [{ id: 'a', text: '', due: '2026-12-01' }] }), today)).toBe('open')
    expect(actionState(r('1', 5, 5, 5, { actions: [{ id: 'a', text: '', due: '2026-11-01' }] }), today)).toBe('overdue')
    expect(actionState(r('1', 5, 5, 5, { actions: [{ id: 'a', text: '', done: true }] }), today)).toBe('done')
  })

  it('摘要：AP 統計、門檻、對策、改善前後', () => {
    const rows = [
      r('1', 10, 8, 5), // H, 400
      r('2', 7, 4, 5, { actions: [{ id: 'a', text: 'x', due: '2026-11-01' }, { id: 'b', text: 'y', done: true }] }), // M
      r('3', 3, 2, 2, { revised: { severity: 3, occurrence: 1, detection: 2 } }), // L, 12 → 6
    ]
    const s = fmeaSummary(rows, { threshold: 100, today: '2026-11-27' })
    expect(s.byPriority).toEqual({ H: 1, M: 1, L: 1 })
    expect(s.total).toBe(3)
    expect(s.overThreshold).toBe(2) // 400 與 140
    expect(s.maxRpn).toBe(400)
    expect(s.openActions).toBe(1)
    expect(s.overdueActions).toBe(1)
    expect(s.highWithoutAction).toBe(1)
    expect([s.rpnBefore, s.rpnAfter]).toEqual([12, 6])
    expect(fmeaSummary([]).overThreshold).toBe(0)
  })

  it('排序：AP / RPN / 嚴重度，同分維持原順序；不改原陣列', () => {
    const rows = [r('a', 3, 9, 9), r('b', 9, 4, 1), r('c', 9, 6, 2), r('d', 3, 9, 9)]
    expect(sortFmea(rows, 'none').map((x) => x.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(sortFmea(rows, 'ap').map((x) => x.id)).toEqual(['c', 'b', 'a', 'd'])
    expect(sortFmea(rows, 'rpn').map((x) => x.id)).toEqual(['a', 'd', 'c', 'b'])
    expect(sortFmea(rows, 'severity').map((x) => x.id)).toEqual(['c', 'b', 'a', 'd'])
    expect(rows.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('篩選：AP 與關鍵字（含對策與負責人）', () => {
    const rows = [
      r('1', 10, 8, 5, { cause: '鋼板堵塞' }),
      r('2', 2, 2, 2, { actions: [{ id: 'a', text: '加真空', owner: 'Lin' }] }),
    ]
    expect(filterFmea(rows, { priorities: ['H'] }).map((x) => x.id)).toEqual(['1'])
    expect(filterFmea(rows, { priorities: [] }).length).toBe(2)
    expect(filterFmea(rows, { query: '堵塞' }).map((x) => x.id)).toEqual(['1'])
    expect(filterFmea(rows, { query: 'lin' }).map((x) => x.id)).toEqual(['2'])
    expect(filterFmea(rows, { query: 'fm-2', priorities: ['H'] })).toEqual([])
    expect(filterFmea(rows, {}).length).toBe(2)
  })

  it('新增、更新列與 id', () => {
    const row = createFmeaRow({ item: '印刷' })
    expect(row).toMatchObject({ item: '印刷', severity: 5, occurrence: 5, detection: 5, actions: [], revised: null })
    expect(fmeaId('x')).not.toBe(fmeaId('x'))
    const rows = updateFmeaRow([row, r('2', 1, 1, 1)], row.id, { severity: 9 })
    expect(rows[0].severity).toBe(9)
    expect(rows[1].severity).toBe(1)
  })

  it('匯出資料：對策合併、改善後欄位', () => {
    const [a, b] = fmeaExportRows([
      r('1', 8, 6, 3, { special: 'SC', actions: [{ id: 'a', text: '擦拭', owner: 'Lin', due: '2026-12-05', done: true }, { id: 'b', text: '加真空' }], revised: { severity: 8, occurrence: 2, detection: 3 } }),
      r('2', 2, 2, 2),
    ])
    expect(a).toMatchObject({ rpn: 144, ap: 'H', special: 'SC', revisedRpn: 48, revisedAp: 'L' })
    expect(a.actions).toBe('[x] 擦拭 Lin 2026-12-05\n[ ] 加真空')
    expect(b).toMatchObject({ effect: '', special: '', actions: '', revisedRpn: '', revisedAp: '' })
    const [c] = fmeaExportRows([r('1', 5, 5, 5, { actions: [{ id: 'a', text: 'x', due: 1 }] })], () => 'D')
    expect(c.actions).toBe('[ ] x D')
  })
})
