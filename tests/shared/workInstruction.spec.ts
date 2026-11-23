import { describe, expect, it } from 'vitest'
import { blockers, formatClock, inSpec, patchRecord, summarize, type WiStep } from '@/components/library/shared/workInstruction'

describe('workInstruction', () => {
  it('inSpec：上下限、單邊、沒有值', () => {
    expect(inSpec(1.2, 1.1, 1.3)).toBe(true)
    expect(inSpec(1.1, 1.1, 1.3)).toBe(true)
    expect(inSpec(1.31, 1.1, 1.3)).toBe(false)
    expect(inSpec(1.0, 1.1)).toBe(false)
    expect(inSpec(99, undefined, 100)).toBe(true)
    expect(inSpec(5)).toBe(true)
    expect(inSpec(null)).toBe(false)
    expect(inSpec(undefined)).toBe(false)
    expect(inSpec(Number.NaN)).toBe(false)
  })

  it('blockers：確認、量測、超出規格、停留時間', () => {
    const confirm: WiStep = { id: 'a', title: 'A', check: { kind: 'confirm', label: 'ok' } }
    expect(blockers(confirm, undefined, 0)).toEqual(['confirm'])
    expect(blockers(confirm, { confirmed: true }, 0)).toEqual([])
    const measure: WiStep = { id: 'b', title: 'B', check: { kind: 'measure', label: 'm', lsl: 1, usl: 2 }, minSeconds: 3 }
    expect(blockers(measure, undefined, 0)).toEqual(['measure', 'wait'])
    expect(blockers(measure, { value: null }, 5000)).toEqual(['measure'])
    expect(blockers(measure, { value: 5 }, 5000)).toEqual(['outOfSpec'])
    expect(blockers(measure, { value: 1.5 }, 2999)).toEqual(['wait'])
    expect(blockers(measure, { value: 1.5 }, 3000)).toEqual([])
    expect(blockers({ id: 'c', title: 'C' }, undefined, 0)).toEqual([])
  })

  it('patchRecord：不改原物件', () => {
    const r = { a: { startedAt: 1 } }
    const n = patchRecord(r, 'a', { completedAt: 5 })
    expect(n).toEqual({ a: { startedAt: 1, completedAt: 5 } })
    expect(r.a).toEqual({ startedAt: 1 })
    expect(patchRecord({}, 'b', { confirmed: true })).toEqual({ b: { confirmed: true } })
  })

  it('summarize：總時間、每一步時間、量測值與確認；未全部完成時 completedAt 為 null', () => {
    const steps: WiStep[] = [
      { id: 'a', title: 'A', check: { kind: 'confirm', label: '' } },
      { id: 'b', title: 'B', check: { kind: 'measure', label: '' } },
      { id: 'c', title: 'C' },
    ]
    const all = summarize(steps, {
      a: { startedAt: 100, completedAt: 200, confirmed: true },
      b: { startedAt: 200, completedAt: 450, value: 1.2, ok: true },
      c: { startedAt: 450, completedAt: 500 },
    })
    expect(all).toEqual({
      startedAt: 100,
      completedAt: 500,
      durationMs: 400,
      steps: [
        { id: 'a', title: 'A', durationMs: 100, confirmed: true },
        { id: 'b', title: 'B', durationMs: 250, value: 1.2, ok: true },
        { id: 'c', title: 'C', durationMs: 50 },
      ],
    })
    const partial = summarize(steps, { a: { startedAt: 100 } })
    expect(partial).toMatchObject({ startedAt: 100, completedAt: null, durationMs: null })
    expect(partial.steps[1]).toEqual({ id: 'b', title: 'B', durationMs: null, value: null, ok: undefined })
    expect(summarize([], {})).toEqual({ startedAt: null, completedAt: null, durationMs: null, steps: [] })
  })

  it('formatClock', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(61_000)).toBe('01:01')
    expect(formatClock(3_600_000)).toBe('1:00:00')
    expect(formatClock(-1)).toBe('00:00')
  })
})
