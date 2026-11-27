import { describe, expect, it } from 'vitest'
import { DEFAULT_AVAILABLE_TIME, inventoryDays, processLoad, taktTime, vsmMetrics, type VsmProcess } from '@/components/library/shared/valueStream'

const customer = { name: 'C', demand: 600, availableTime: 27000 } // 節拍 45 秒

const procs: VsmProcess[] = [
  { id: 'a', name: 'A', cycleTime: 38, inventoryBefore: { qty: 1200 } }, // 2 天
  { id: 'b', name: 'B', cycleTime: 52, inventoryBefore: { days: 0.5 } },
  { id: 'c', name: 'C', cycleTime: 30 }, // 前面沒有庫存
]

describe('valueStream', () => {
  it('節拍時間：可用時間 ÷ 需求；預設可用時間；不合理時為 null', () => {
    expect(taktTime(customer)).toBe(45)
    expect(taktTime({ name: 'x', demand: 270 })).toBe(DEFAULT_AVAILABLE_TIME / 270)
    expect(taktTime({ name: 'x', demand: 0 })).toBeNull()
    expect(taktTime({ name: 'x', demand: 10, availableTime: -1 })).toBeNull()
  })

  it('庫存天數：days 優先，否則數量 ÷ 需求', () => {
    expect(inventoryDays({ qty: 1200 }, 600)).toBe(2)
    expect(inventoryDays({ qty: 1200, days: 3 }, 600)).toBe(3)
    expect(inventoryDays({ days: -2 }, 600)).toBe(0)
    expect(inventoryDays({ qty: 100 }, 0)).toBe(0)
    expect(inventoryDays({}, 600)).toBe(0)
    expect(inventoryDays(null, 600)).toBe(0)
  })

  it('前置時間、加值時間、流程效率、瓶頸與超過節拍', () => {
    const m = vsmMetrics(procs, customer, { qty: 300 }) // 成品 0.5 天
    expect(m.takt).toBe(45)
    expect(m.valueAddedSeconds).toBe(120)
    // 庫存 2 + 0.5 + 0.5 = 3 天；加值 120 秒
    expect(m.leadTimeDays).toBeCloseTo(3 + 120 / 27000, 10)
    expect(m.pce).toBeCloseTo(120 / (3 * 27000 + 120), 10)
    expect(m.bottleneck).toBe('b')
    expect(m.overTakt).toEqual(['b'])
    expect(m.totalInventory).toBe(1500)
    expect(m.steps.map((s) => `${s.kind}:${s.id}`)).toEqual(['inventory:a', 'process:a', 'inventory:b', 'process:b', 'process:c', 'inventory:finished'])
  })

  it('沒有工站、沒有需求', () => {
    const empty = vsmMetrics([], customer)
    expect(empty).toMatchObject({ bottleneck: null, valueAddedSeconds: 0, pce: 0, leadTimeDays: 0, steps: [] })
    const noDemand = vsmMetrics(procs, { name: 'x', demand: 0, availableTime: 0 })
    expect(noDemand.takt).toBeNull()
    expect(noDemand.overTakt).toEqual([])
    expect(noDemand.availableTime).toBe(DEFAULT_AVAILABLE_TIME)
  })

  it('負荷：週期時間 ÷ 節拍', () => {
    expect(processLoad(procs[1], 45)).toBeCloseTo(52 / 45)
    expect(processLoad(procs[1], null)).toBeNull()
    expect(processLoad({ id: 'x', name: 'x', cycleTime: NaN }, 45)).toBe(0)
  })
})
