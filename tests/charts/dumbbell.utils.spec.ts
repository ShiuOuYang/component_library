import { describe, expect, it } from 'vitest'
import { dodgeLabels, dumbbellDomain, dumbbellRows, dumbbellSummary, sortDumbbellRows } from '@/components/library/charts/utils/dumbbell'

const data = [
  { label: 'A', before: 10, after: 15 },
  { label: 'B', before: 20, after: 12 },
  { label: 'C', before: 5, after: 5.2 },
  { label: 'D', before: 0, after: 3, color: 'red' },
  { label: 'E', before: null, after: 7 },
  { label: 'F', before: 8, after: Number.NaN },
]

describe('dumbbell', () => {
  it('dumbbellRows：變化量、百分比、好壞（含容許誤差與缺值）', () => {
    const r = dumbbellRows(data, 'higher', 0.5)
    expect(r[0]).toMatchObject({ delta: 5, pct: 0.5, status: 'better', index: 0 })
    expect(r[1]).toMatchObject({ delta: -8, pct: -0.4, status: 'worse' })
    expect(r[2].status).toBe('same')
    expect(r[3]).toMatchObject({ delta: 3, pct: null, color: 'red', status: 'better' })
    expect(r[4]).toMatchObject({ before: null, delta: null, pct: null, status: 'neutral' })
    expect(r[5]).toMatchObject({ after: null, delta: null })
    expect(dumbbellRows(data, 'lower').map((x) => x.status)).toEqual(['worse', 'better', 'worse', 'worse', 'neutral', 'neutral'])
    expect(dumbbellRows(data, 'none').every((x) => x.status === 'neutral')).toBe(true)
    expect(dumbbellRows([{ label: 'n', before: -10, after: -5 }])[0].pct).toBe(0.5)
    expect(dumbbellRows(data)[2].status).toBe('better') // 預設容許 0
  })

  it('sortDumbbellRows：改善量（依方向）、幅度、前後值、名稱、缺值在最後、反向', () => {
    const r = dumbbellRows(data, 'higher')
    const ids = (rows: ReturnType<typeof dumbbellRows>) => rows.map((x) => x.label).join('')
    expect(ids(sortDumbbellRows(r, 'none'))).toBe('ABCDEF')
    expect(ids(sortDumbbellRows(r, 'change'))).toBe('ADCBEF')
    expect(ids(sortDumbbellRows(r, 'change', 'lower'))).toBe('BCDAEF')
    expect(ids(sortDumbbellRows(r, 'change', 'higher', false))).toBe('BCDAEF')
    expect(ids(sortDumbbellRows(r, 'absChange'))).toBe('BADCEF')
    expect(ids(sortDumbbellRows(r, 'before'))).toBe('BAFCDE')
    expect(ids(sortDumbbellRows(r, 'after'))).toBe('ABECDF')
    expect(ids(sortDumbbellRows(r, 'label', 'higher', false))).toBe('FEDCBA')
    expect(ids(sortDumbbellRows(dumbbellRows([{ label: 'b', before: 1, after: 1 }, { label: 'a', before: 1, after: 1 }, { label: 'a', before: 2, after: 2 }]), 'label'))).toBe('aab')
    // 相同值依原順序
    expect(ids(sortDumbbellRows(dumbbellRows([{ label: 'x', before: 1, after: 2 }, { label: 'y', before: 3, after: 4 }]), 'change'))).toBe('xy')
  })

  it('dumbbellDomain：涵蓋所有值與 extra、留白不跨到負值、單一值、全缺值', () => {
    const r = dumbbellRows(data)
    const [lo, hi] = dumbbellDomain(r)
    expect(lo).toBe(0)
    expect(hi).toBeCloseTo(20 + 1)
    expect(dumbbellDomain(r, [30])[1]).toBeCloseTo(31.5)
    const neg = dumbbellDomain(dumbbellRows([{ label: 'a', before: -10, after: 10 }]))
    expect(neg).toEqual([-11, 11])
    expect(dumbbellDomain(dumbbellRows([{ label: 'a', before: 50, after: 50 }]), [], 0)).toEqual([45, 55])
    expect(dumbbellDomain(dumbbellRows([{ label: 'a', before: 0, after: 0 }]), [], 0)).toEqual([-1, 1])
    expect(dumbbellDomain([])).toEqual([0, 1])
    expect(dumbbellDomain(dumbbellRows([{ label: 'a', before: 100, after: 120 }]))).toEqual([99, 121])
  })

  it('dumbbellSummary', () => {
    expect(dumbbellSummary(dumbbellRows(data, 'higher', 0.5))).toEqual({ better: 2, worse: 1, same: 1, compared: 4, meanDelta: (5 - 8 + 0.2 + 3) / 4 })
    expect(dumbbellSummary([])).toEqual({ better: 0, worse: 0, same: 0, compared: 0, meanDelta: null })
  })

  it('dodgeLabels：不重疊、盡量靠近原位、在範圍內、順序與輸入相同', () => {
    expect(dodgeLabels([0, 50, 100], 10)).toEqual([0, 50, 100])
    expect(dodgeLabels([50, 52], 10)).toEqual([46, 56])
    // 三個擠在一起，再跟下一個合併
    const out = dodgeLabels([100, 100, 100, 112], 10)
    // 四個合併成一群，以平均 103 為中心：88、98、108、118
    expect(out).toEqual([88, 98, 108, 118])
    // 範圍限制
    expect(dodgeLabels([0, 1], 10, 0, 100)).toEqual([0, 10])
    expect(dodgeLabels([99, 100], 10, 0, 100)).toEqual([90, 100])
    // 輸入順序不影響
    expect(dodgeLabels([52, 50], 10)).toEqual([56, 46])
    expect(dodgeLabels([], 10)).toEqual([])
  })
})
