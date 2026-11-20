import { describe, expect, it } from 'vitest'
import {
  averageUtilization,
  countEquipment,
  durationParts,
  filterEquipment,
  groupEquipment,
  neighborIndex,
  sortEquipment,
  toTime,
  type EquipmentItem,
} from '@/components/library/shared/equipment'

const items: EquipmentItem[] = [
  { id: 'a', name: 'SMT-10', group: 'L1', status: 'run', utilization: 90, workOrder: 'WO-1' },
  { id: 'b', name: 'SMT-2', group: 'L1', status: 'down', utilization: 50, product: 'PCB-A12' },
  { id: 'c', name: 'AOI', status: 'idle' },
  { id: 'd', name: 'SMT-3', group: 'L2', status: 'down', utilization: null },
  { id: 'e', name: 'ICT', group: 'L2', status: 'offline' },
]

describe('equipment', () => {
  it('filterEquipment：狀態、關鍵字（名稱、id、工單、料號，不分大小寫）', () => {
    expect(filterEquipment(items, ['down']).map((i) => i.id)).toEqual(['b', 'd'])
    expect(filterEquipment(items, [], 'wo-1').map((i) => i.id)).toEqual(['a'])
    expect(filterEquipment(items, null, 'pcb').map((i) => i.id)).toEqual(['b'])
    expect(filterEquipment(items, null, ' E ').map((i) => i.id)).toEqual(['e'])
    expect(filterEquipment(items, ['run'], 'aoi')).toEqual([])
  })

  it('sortEquipment：none / status（同狀態保持原順序）/ name（自然排序）', () => {
    expect(sortEquipment(items, 'none')).toBe(items)
    expect(sortEquipment(items, 'status').map((i) => i.id)).toEqual(['b', 'd', 'c', 'e', 'a'])
    expect(sortEquipment(items, 'name').map((i) => i.name)).toEqual(['AOI', 'ICT', 'SMT-2', 'SMT-3', 'SMT-10'])
    const same = [
      { id: 'x', name: 'A', status: 'run' as const },
      { id: 'y', name: 'a', status: 'run' as const },
    ]
    expect(sortEquipment(same, 'name').map((i) => i.id)).toEqual(['x', 'y'])
  })

  it('groupEquipment：照出現順序，沒有 group 的在最後', () => {
    expect(groupEquipment(items).map((g) => [g.key, g.items.map((i) => i.id)])).toEqual([
      ['L1', ['a', 'b']],
      ['L2', ['d', 'e']],
      [null, ['c']],
    ])
  })

  it('countEquipment / averageUtilization', () => {
    expect(countEquipment(items)).toEqual({ run: 1, idle: 1, maintenance: 0, down: 2, offline: 1 })
    expect(averageUtilization(items)).toBe(70)
    expect(averageUtilization([{ id: 'z', name: 'z', status: 'run' }])).toBeNull()
  })

  it('durationParts / toTime', () => {
    expect(durationParts(((26 * 60 + 5) * 60 + 59) * 1000)).toEqual({ d: 1, h: 2, m: 5 })
    expect(durationParts(30_000)).toEqual({ d: 0, h: 0, m: 0 })
    expect(durationParts(-1)).toBeNull()
    expect(durationParts(Number.NaN)).toBeNull()
    expect(toTime(null)).toBeNull()
    expect(toTime('')).toBeNull()
    expect(toTime('nope')).toBeNull()
    expect(toTime(1000)).toBe(1000)
    expect(toTime(new Date(5000))).toBe(5000)
    expect(toTime('2026-11-20T00:00:00Z')).toBe(Date.UTC(2026, 10, 20))
  })

  it('neighborIndex：左右前後一張；上下找最近一列裡水平最近的；找不到時不動', () => {
    // 兩列：第一列 3 張、第二列 2 張（第二列靠左）
    const R = (left: number, top: number) => ({ left, top, width: 100, height: 80 })
    const rects = [R(0, 0), R(110, 0), R(220, 0), R(0, 90), R(110, 90), R(0, 180)]
    expect(neighborIndex(rects, 0, 'left')).toBe(0)
    expect(neighborIndex(rects, 2, 'right')).toBe(3)
    expect(neighborIndex(rects, 5, 'right')).toBe(5)
    expect(neighborIndex(rects, 2, 'down')).toBe(4) // 最右邊往下：下一列水平最近的是第二張
    expect(neighborIndex(rects, 1, 'down')).toBe(4)
    expect(neighborIndex(rects, 4, 'up')).toBe(1)
    expect(neighborIndex(rects, 0, 'up')).toBe(0)
    expect(neighborIndex(rects, 3, 'down')).toBe(5) // 跳過更遠的列
  })
})
