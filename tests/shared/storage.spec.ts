import { describe, expect, it } from 'vitest'
import {
  binState,
  buildLayout,
  cellKey,
  checkMove,
  daysToExpiry,
  expiryStatus,
  moveStocks,
  searchBins,
  stocksByBin,
  storageSummary,
  toTime,
  type StorageBin,
  type StorageStock,
} from '@/components/library/shared/storage'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 0, 10)
const bin = (id: string, rack: string, level: number, position: number, extra: Partial<StorageBin> = {}): StorageBin => ({ id, zone: 'A', rack, level, position, ...extra })
const stock = (id: string, binId: string, item: string, qty: number, extra: Partial<StorageStock> = {}): StorageStock => ({ id, bin: binId, item, qty, ...extra })

describe('storage', () => {
  it('toTime：數字、字串、Date、空值、無效', () => {
    expect(toTime(5)).toBe(5)
    expect(toTime('2026-01-10T00:00:00Z')).toBe(NOW)
    expect(toTime(new Date(NOW))).toBe(NOW)
    expect(toTime(null)).toBeNull()
    expect(toTime(undefined)).toBeNull()
    expect(toTime('')).toBeNull()
    expect(toTime('nope')).toBeNull()
    expect(toTime(Number.NaN)).toBeNull()
  })

  it('expiryStatus 與 daysToExpiry', () => {
    expect(expiryStatus({}, NOW, 30)).toBe('none')
    expect(expiryStatus({ expiry: NOW }, NOW, 30)).toBe('expired')
    expect(expiryStatus({ expiry: NOW + 30 * DAY }, NOW, 30)).toBe('soon')
    expect(expiryStatus({ expiry: NOW + 31 * DAY }, NOW, 30)).toBe('ok')
    expect(daysToExpiry({ expiry: NOW + 1.2 * DAY }, NOW)).toBe(2)
    expect(daysToExpiry({ expiry: NOW - 3 * DAY }, NOW)).toBe(-3)
    expect(daysToExpiry({ expiry: null }, NOW)).toBeNull()
  })

  it('stocksByBin 與 binState：數量、使用率、料號、最嚴重的效期', () => {
    const b = bin('A-1-1', 'R', 1, 1, { capacity: 100 })
    const list = [
      stock('1', 'A-1-1', 'X', 30, { expiry: NOW + 100 * DAY }),
      stock('2', 'A-1-1', 'Y', 50, { expiry: NOW + 5 * DAY }),
      stock('3', 'A-1-1', 'X', 40, { expiry: NOW - DAY }),
    ]
    expect(stocksByBin([...list, stock('4', 'B', 'Z', 1)]).get('A-1-1')).toHaveLength(3)
    expect(binState(b, list, NOW, 30)).toEqual({ qty: 120, ratio: 1.2, items: ['X', 'Y'], expiry: 'expired' })
    expect(binState(b, list.slice(0, 2), NOW, 30).expiry).toBe('soon')
    expect(binState(bin('n', 'R', 1, 1), list, NOW, 30).ratio).toBeNull()
    expect(binState(bin('n', 'R', 1, 1, { capacity: 0 }), [], NOW, 30)).toEqual({ qty: 0, ratio: null, items: [], expiry: 'none' })
  })

  it('buildLayout：區 / 料架依出現順序、層由高到低、缺的格位留空', () => {
    const z = buildLayout([
      bin('a', 'R1', 1, 1),
      bin('b', 'R1', 2, 3),
      { ...bin('c', 'R2', 1, 1), zone: 'B' },
      bin('d', 'R1', 1, 2),
    ])
    expect(z.map((x) => x.zone)).toEqual(['A', 'B'])
    const r1 = z[0].racks[0]
    expect(r1.rack).toBe('R1')
    expect(r1.levels).toEqual([2, 1])
    expect(r1.positions).toEqual([1, 2, 3])
    expect(r1.cells.get(cellKey(2, 3))?.id).toBe('b')
    expect(r1.cells.get(cellKey(2, 1))).toBeUndefined()
    expect(buildLayout([])).toEqual([])
  })

  it('searchBins：儲位、料架、料號、品名、批號；多個詞都要符合；空白查詢', () => {
    const bins = [bin('A-01-1-1', 'A-01', 1, 1), bin('A-01-1-2', 'A-01', 1, 2), bin('B-01-1-1', 'B-01', 1, 1)]
    const stocks = [stock('1', 'A-01-1-1', 'PCB-A12', 1, { name: '主板', lot: 'L2310' }), stock('2', 'B-01-1-1', 'SOLDER', 1)]
    expect([...searchBins(bins, stocks, 'pcb')]).toEqual(['A-01-1-1'])
    expect([...searchBins(bins, stocks, '主板')]).toEqual(['A-01-1-1'])
    expect([...searchBins(bins, stocks, 'l2310')]).toEqual(['A-01-1-1'])
    expect([...searchBins(bins, stocks, 'a-01')]).toEqual(['A-01-1-1', 'A-01-1-2'])
    expect([...searchBins(bins, stocks, 'a-01 pcb')]).toEqual(['A-01-1-1'])
    expect([...searchBins(bins, stocks, 'zzz')]).toEqual([])
    expect(searchBins(bins, stocks, '   ').size).toBe(0)
  })

  it('checkMove：同一格、停用、容量、允許超過、找不到', () => {
    const bins = [bin('a', 'R', 1, 1, { capacity: 100 }), bin('b', 'R', 1, 2, { capacity: 100 }), bin('c', 'R', 1, 3, { blocked: true }), bin('d', 'R', 1, 4)]
    const stocks = [stock('1', 'a', 'X', 60), stock('2', 'b', 'Y', 50), stock('3', 'a', 'Z', 10)]
    expect(checkMove(bins, stocks, ['1'], 'a')).toBe('same')
    expect(checkMove(bins, stocks, ['1'], 'c')).toBe('blocked')
    expect(checkMove(bins, stocks, ['1'], 'b')).toBe('overCapacity')
    expect(checkMove(bins, stocks, ['1'], 'b', true)).toBe('ok')
    expect(checkMove(bins, stocks, ['3'], 'b')).toBe('ok')
    expect(checkMove(bins, stocks, ['1', '3'], 'd')).toBe('ok')
    expect(checkMove(bins, stocks, ['1'], 'zz')).toBe('unknown')
    expect(checkMove(bins, stocks, ['nope'], 'b')).toBe('unknown')
  })

  it('moveStocks：不改原陣列', () => {
    const stocks = [stock('1', 'a', 'X', 1), stock('2', 'b', 'Y', 1)]
    const next = moveStocks(stocks, ['1', '2'], 'b')
    expect(next.map((s) => s.bin)).toEqual(['b', 'b'])
    expect(next[1]).toBe(stocks[1])
    expect(stocks[0].bin).toBe('a')
  })

  it('storageSummary', () => {
    const bins = [bin('a', 'R', 1, 1, { capacity: 100 }), bin('b', 'R', 1, 2, { capacity: 100, blocked: true }), bin('c', 'R', 1, 3)]
    const stocks = [stock('1', 'a', 'X', 50, { expiry: NOW - 1 }), stock('2', 'c', 'Y', 500, { expiry: NOW + DAY }), stock('3', 'c', 'Y', 5, { expiry: NOW + 90 * DAY })]
    expect(storageSummary(bins, stocks, NOW, 30)).toEqual({ bins: 3, used: 2, blocked: 1, ratio: 0.25, expired: 1, soon: 1 })
    expect(storageSummary([bin('x', 'R', 1, 1)], [], NOW, 30).ratio).toBeNull()
  })
})
