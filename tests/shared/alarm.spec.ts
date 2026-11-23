import { describe, expect, it, vi } from 'vitest'
import {
  ackAlarms,
  alarmState,
  countUnacked,
  escalateAlarms,
  filterAlarms,
  playAlarmTone,
  shelveAlarms,
  sortAlarms,
  toMs,
  unshelveAlarms,
  type AlarmItem,
} from '@/components/library/shared/alarm'

const NOW = Date.UTC(2026, 10, 23, 8, 0)
const ago = (min: number) => NOW - min * 60_000

const list = (): AlarmItem[] => [
  { id: 'a', title: 'Vacuum low', severity: 'critical', code: 'E-1', source: 'SMT-02', raisedAt: ago(20) },
  { id: 'b', title: 'Temp high', severity: 'major', source: 'Oven', raisedAt: ago(5), cleared: true },
  { id: 'c', title: 'Feeder empty', severity: 'minor', raisedAt: ago(2) },
  { id: 'd', title: 'Comm lost', severity: 'major', raisedAt: ago(8), acked: true, ackedBy: 'Chen', ackedAt: ago(4) },
  { id: 'e', title: 'PM due', severity: 'info', raisedAt: ago(90), acked: true, cleared: true },
  { id: 'f', title: 'False calls', severity: 'minor', raisedAt: ago(40), shelvedUntil: NOW + 30 * 60_000 },
  { id: 'g', title: 'Old shelve', severity: 'critical', raisedAt: ago(60), shelvedUntil: ago(1) },
]

describe('alarm', () => {
  it('toMs：字串、數字、Date；空值與無效值為 null', () => {
    expect(toMs(NOW)).toBe(NOW)
    expect(toMs(new Date(NOW))).toBe(NOW)
    expect(toMs(new Date(NOW).toISOString())).toBe(NOW)
    expect(toMs(null)).toBeNull()
    expect(toMs(undefined)).toBeNull()
    expect(toMs('')).toBeNull()
    expect(toMs('not a date')).toBeNull()
  })

  it('alarmState：暫停時間到了回到原本狀態；已恢復但未確認仍是未確認', () => {
    const [a, b, , d, e, f, g] = list()
    expect(alarmState(a, NOW)).toBe('unacked')
    expect(alarmState(b, NOW)).toBe('unacked')
    expect(alarmState(d, NOW)).toBe('acked')
    expect(alarmState(e, NOW)).toBe('closed')
    expect(alarmState(f, NOW)).toBe('shelved')
    expect(alarmState(g, NOW)).toBe('unacked')
  })

  it('sortAlarms：狀態 → 嚴重度 → 新到舊；不改原陣列', () => {
    const src = list()
    const ids = sortAlarms(src, NOW).map((x) => x.id)
    expect(ids).toEqual(['a', 'g', 'b', 'c', 'd', 'f', 'e'])
    expect(src.map((x) => x.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
    // 沒有時間的排在同組最後
    const noTime = sortAlarms([{ id: 'x', title: 'x', severity: 'minor', raisedAt: '' }, { id: 'y', title: 'y', severity: 'minor', raisedAt: ago(1) }], NOW)
    expect(noTime.map((x) => x.id)).toEqual(['y', 'x'])
  })

  it('filterAlarms：view、嚴重度、搜尋（訊息、代碼、來源，不分大小寫）', () => {
    const ids = (...args: Parameters<typeof filterAlarms> extends [unknown, unknown, ...infer R] ? R : never) =>
      filterAlarms(list(), NOW, ...args).map((x) => x.id)
    expect(ids('open', null)).toEqual(['a', 'b', 'c', 'd', 'g'])
    expect(ids('unacked', null)).toEqual(['a', 'b', 'c', 'g'])
    expect(ids('shelved', null)).toEqual(['f'])
    expect(ids('all', null)).toHaveLength(7)
    expect(ids('all', ['minor'])).toEqual(['c', 'f'])
    expect(ids('all', [])).toHaveLength(7)
    expect(ids('all', null, 'e-1')).toEqual(['a'])
    expect(ids('all', null, '  oven ')).toEqual(['b'])
    expect(ids('all', null, 'feeder')).toEqual(['c'])
  })

  it('countUnacked：各嚴重度未確認數量', () => {
    expect(countUnacked(list(), NOW)).toEqual({ critical: 2, major: 1, minor: 1, info: 0 })
  })

  it('ackAlarms：記下確認人與時間；已確認的不覆蓋；不改原陣列', () => {
    const src = list()
    const next = ackAlarms(src, ['a', 'd'], 'Wang', NOW)
    expect(next[0]).toMatchObject({ acked: true, ackedBy: 'Wang', ackedAt: NOW })
    expect(next[3]).toBe(src[3])
    expect(next[1]).toBe(src[1])
    expect(src[0].acked).toBeUndefined()
    // 已恢復 + 確認 = 結束
    expect(alarmState(ackAlarms(src, ['b'], undefined, NOW)[1], NOW)).toBe('closed')
  })

  it('shelve / unshelve / escalate', () => {
    const shelved = shelveAlarms(list(), ['a'], 15, NOW)
    expect(shelved[0].shelvedUntil).toBe(NOW + 15 * 60_000)
    expect(alarmState(shelved[0], NOW)).toBe('shelved')
    expect(alarmState(shelved[0], NOW + 16 * 60_000)).toBe('unacked')
    expect(unshelveAlarms(shelved, ['a'])[0].shelvedUntil).toBeNull()
    const esc = escalateAlarms(escalateAlarms(list(), ['a']), ['a', 'b'])
    expect(esc[0].escalated).toBe(2)
    expect(esc[1].escalated).toBe(1)
  })

  it('playAlarmTone：嚴重兩聲、其他一聲；暫停時恢復；例外不往外丟', () => {
    const oscs: Array<{ start: ReturnType<typeof vi.fn>; frequency: { value: number } }> = []
    const ctx = {
      state: 'suspended',
      currentTime: 1,
      destination: {},
      resume: vi.fn(() => Promise.resolve()),
      createOscillator: () => {
        const o = { type: '', frequency: { value: 0 }, connect: (g: unknown) => g, start: vi.fn(), stop: vi.fn() }
        oscs.push(o)
        return o
      },
      createGain: () => ({ gain: { value: 0 }, connect: vi.fn() }),
    } as unknown as AudioContext
    playAlarmTone(ctx, 'critical')
    expect(ctx.resume).toHaveBeenCalled()
    expect(oscs.map((o) => o.frequency.value)).toEqual([880, 660])
    expect(oscs[1].start).toHaveBeenCalledWith(1.22)
    oscs.length = 0
    playAlarmTone(ctx, 'major')
    expect(oscs).toHaveLength(1)
    expect(() => playAlarmTone(null)).not.toThrow()
    const broken = { state: 'running', createOscillator: () => { throw new Error('x') } } as unknown as AudioContext
    expect(() => playAlarmTone(broken)).not.toThrow()
  })
})
