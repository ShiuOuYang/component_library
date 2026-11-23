import { describe, expect, it } from 'vitest'
import {
  callElapsed,
  callLevel,
  callStatus,
  formatClock,
  raiseCall,
  resolveCall,
  respondCall,
  stationSummary,
  toMs,
  type AndonCall,
} from '@/components/library/shared/andon'

const MIN = 60_000
const NOW = Date.UTC(2026, 10, 23, 9, 0)

describe('andon', () => {
  it('toMs', () => {
    expect(toMs(NOW)).toBe(NOW)
    expect(toMs(new Date(NOW))).toBe(NOW)
    expect(toMs(null)).toBeNull()
    expect(toMs('')).toBeNull()
    expect(toMs('bad')).toBeNull()
  })

  it('callStatus / callElapsed：未回應從呼叫算、處理中從回應算、完成為總時間', () => {
    const open: AndonCall = { id: 'a', station: 's', type: 't', raisedAt: NOW - 5 * MIN }
    const resp: AndonCall = { ...open, respondedAt: NOW - 2 * MIN }
    const done: AndonCall = { ...resp, resolvedAt: NOW - MIN }
    expect([callStatus(open), callStatus(resp), callStatus(done)]).toEqual(['open', 'responding', 'resolved'])
    expect(callElapsed(open, NOW)).toBe(5 * MIN)
    expect(callElapsed(resp, NOW)).toBe(2 * MIN)
    expect(callElapsed(done, NOW)).toBe(4 * MIN)
    expect(callElapsed({ ...open, raisedAt: NOW + MIN }, NOW)).toBe(0)
  })

  it('callLevel：依門檻升級；完成為 0', () => {
    const t = { respond: [3, 10] as [number, number], resolve: [20, 45] as [number, number] }
    const at = (m: number, responded?: number) => callLevel({ id: 'a', station: 's', type: 't', raisedAt: NOW - m * MIN, respondedAt: responded === undefined ? null : NOW - responded * MIN }, NOW, t)
    expect([at(1), at(3), at(10)]).toEqual([0, 1, 2])
    expect([at(30, 10), at(30, 20), at(60, 50)]).toEqual([0, 1, 2])
    expect(callLevel({ id: 'a', station: 's', type: 't', raisedAt: 0, resolvedAt: NOW }, NOW)).toBe(0)
    // 預設門檻
    expect(callLevel({ id: 'a', station: 's', type: 't', raisedAt: NOW - 11 * MIN }, NOW)).toBe(2)
  })

  it('stationSummary：只看進行中的、未回應的在前、最嚴重的等級', () => {
    const calls: AndonCall[] = [
      { id: '1', station: 's1', type: 'a', raisedAt: NOW - 30 * MIN, respondedAt: NOW - 25 * MIN },
      { id: '2', station: 's1', type: 'b', raisedAt: NOW - 4 * MIN },
      { id: '3', station: 's1', type: 'c', raisedAt: NOW - 50 * MIN, resolvedAt: NOW - 40 * MIN },
      { id: '4', station: 's2', type: 'a', raisedAt: NOW },
      { id: '5', station: 's1', type: 'd', raisedAt: NOW - 2 * MIN },
    ]
    const s = stationSummary('s1', calls, NOW)
    expect(s.active.map((c) => c.id)).toEqual(['2', '5', '1'])
    expect(s.level).toBe(1)
    expect(s.hasOpen).toBe(true)
    expect(stationSummary('s3', calls, NOW)).toEqual({ active: [], level: 0, hasOpen: false })
  })

  it('raise / respond / resolve：不改原陣列；同站同原因進行中時不重複；已完成不能再操作', () => {
    const a = raiseCall([], 's1', 'maint', NOW, '林', '真空異常')
    expect(a).toHaveLength(1)
    expect(a[0]).toMatchObject({ station: 's1', type: 'maint', raisedAt: NOW, by: '林', note: '真空異常' })
    expect(raiseCall(a, 's1', 'maint', NOW)).toBe(a)
    const b = raiseCall(a, 's1', 'material', NOW)
    expect(b).toHaveLength(2)
    expect(b[0].id).not.toBe(b[1].id)
    const r = respondCall(b, a[0].id, '陳', NOW + MIN)
    expect(r[0]).toMatchObject({ respondedAt: NOW + MIN, responder: '陳' })
    expect(respondCall(r, a[0].id, '王', NOW + 2 * MIN)[0].responder).toBe('陳')
    const d = resolveCall(r, a[0].id, NOW + 5 * MIN)
    expect(d[0].resolvedAt).toBe(NOW + 5 * MIN)
    expect(resolveCall(d, a[0].id, NOW + 9 * MIN)[0].resolvedAt).toBe(NOW + 5 * MIN)
    // 沒回應直接完成：回應時間補成完成時間
    const quick = resolveCall(b, b[1].id, NOW + MIN)
    expect(quick[1]).toMatchObject({ respondedAt: NOW + MIN, resolvedAt: NOW + MIN })
    // 完成後同原因可以再呼叫
    expect(raiseCall(d, 's1', 'maint', NOW + 10 * MIN)).toHaveLength(3)
  })

  it('formatClock', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(65_000)).toBe('01:05')
    expect(formatClock(3_725_000)).toBe('1:02:05')
    expect(formatClock(-5)).toBe('00:00')
  })
})
