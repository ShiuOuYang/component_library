import { describe, expect, it } from 'vitest'
import {
  boardsLeft,
  feederStock,
  feederSummary,
  findSlot,
  groupSlots,
  matchesSlot,
  parseReelCode,
  reelInUse,
  type FeederLoad,
  type FeederSlot,
} from '@/components/library/shared/feeder'

const load = (partNo: string, qty: number, reelId = 'R1'): FeederLoad => ({ reelId, partNo, qty, loadedAt: 0 })

describe('feeder', () => {
  it('parseReelCode：預設格式、各種分隔符、批號、錯誤格式', () => {
    expect(parseReelCode('RC0402-10K|5000|R-1')).toEqual({ partNo: 'RC0402-10K', qty: 5000, reelId: 'R-1' })
    expect(parseReelCode(' RC0402-10K ; 5000 ; R-1 ; L1 ')).toEqual({ partNo: 'RC0402-10K', qty: 5000, reelId: 'R-1', lot: 'L1' })
    expect(parseReelCode('A,0,B')).toEqual({ partNo: 'A', qty: 0, reelId: 'B' })
    expect(parseReelCode('A\t10\tB')).toEqual({ partNo: 'A', qty: 10, reelId: 'B' })
    expect(parseReelCode('A|10')).toBeNull()
    expect(parseReelCode('A|1.5|B')).toBeNull()
    expect(parseReelCode('A|x|B')).toBeNull()
    expect(parseReelCode('|10|B')).toBeNull()
    expect(parseReelCode('A|10|')).toBeNull()
    expect(parseReelCode('M1-F-01')).toBeNull()
  })

  it('matchesSlot：料號與代用料，不分大小寫', () => {
    const s: FeederSlot = { id: 'S', partNo: 'CC0402-100N', alternates: ['GRM155-100N'] }
    expect(matchesSlot(s, 'cc0402-100n')).toBe(true)
    expect(matchesSlot(s, ' GRM155-100N ')).toBe(true)
    expect(matchesSlot(s, 'CC0402-10N')).toBe(false)
    expect(matchesSlot({ id: 'S', partNo: 'A' }, 'A')).toBe(true)
  })

  it('findSlot：不分大小寫、忽略空白', () => {
    const slots: FeederSlot[] = [{ id: 'M1-F-01', partNo: 'A' }]
    expect(findSlot(slots, ' m1-f-01 ')?.id).toBe('M1-F-01')
    expect(findSlot(slots, 'M1-F-02')).toBeUndefined()
  })

  it('feederStock 與 boardsLeft', () => {
    expect(feederStock(undefined, 100)).toBe('unloaded')
    expect(feederStock(load('A', 0), 100)).toBe('empty')
    expect(feederStock(load('A', -5), 100)).toBe('empty')
    expect(feederStock(load('A', 100), 100)).toBe('low')
    expect(feederStock(load('A', 101), 100)).toBe('ok')
    const s: FeederSlot = { id: 'S', partNo: 'A', perBoard: 4 }
    expect(boardsLeft(s, load('A', 10))).toBe(2)
    expect(boardsLeft(s, load('A', -1))).toBe(0)
    expect(boardsLeft(s, undefined)).toBeNull()
    expect(boardsLeft({ id: 'S', partNo: 'A' }, load('A', 10))).toBeNull()
    expect(boardsLeft({ id: 'S', partNo: 'A', perBoard: 0 }, load('A', 10))).toBeNull()
  })

  it('reelInUse：同一盤在別的站位', () => {
    const loads = { A: load('X', 1, 'R1'), B: load('Y', 1, 'R2') }
    expect(reelInUse(loads, 'R1', 'B')).toBe('A')
    expect(reelInUse(loads, 'R1', 'A')).toBeNull()
    expect(reelInUse(loads, 'R9', 'A')).toBeNull()
  })

  it('feederSummary：上料、低料、用完、錯料、可生產片數、是否備齊', () => {
    const slots: FeederSlot[] = [
      { id: 'A', partNo: 'P1', perBoard: 10 },
      { id: 'B', partNo: 'P2', perBoard: 5 },
      { id: 'C', partNo: 'P3' },
      { id: 'D', partNo: 'P4' },
    ]
    expect(feederSummary(slots, { A: load('P1', 1000), B: load('P2', 50), C: load('X', 500) }, 100)).toEqual({
      total: 4,
      loaded: 3,
      unloaded: 1,
      low: 1,
      empty: 0,
      wrong: 1,
      ready: false,
      minBoards: 10,
    })
    const all = { A: load('P1', 1000), B: load('P2', 500), C: load('P3', 500), D: load('P4', 500) }
    expect(feederSummary(slots, all, 100)).toMatchObject({ ready: true, minBoards: 100, low: 0 })
    expect(feederSummary(slots, { ...all, D: load('P4', 0) }, 100)).toMatchObject({ ready: false, empty: 1 })
    expect(feederSummary([], {}, 100)).toMatchObject({ ready: false, minBoards: null })
  })

  it('groupSlots：依 group 分區、保持順序', () => {
    const g = groupSlots([
      { id: '1', partNo: 'a', group: 'F' },
      { id: '2', partNo: 'b', group: 'R' },
      { id: '3', partNo: 'c', group: 'F' },
      { id: '4', partNo: 'd' },
    ])
    expect(g.map((x) => [x.group, x.slots.map((s) => s.id)])).toEqual([
      ['F', ['1', '3']],
      ['R', ['2']],
      ['', ['4']],
    ])
  })
})
