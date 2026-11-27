import { describe, expect, it } from 'vitest'
import {
  EIGHT_D_STEPS,
  createEightD,
  eightDMissing,
  eightDProgress,
  eightDText,
  stepOverdue,
  stepState,
  updateStep,
  type EightDReport,
} from '@/components/library/shared/eightD'

const L = {
  steps: Object.fromEntries(EIGHT_D_STEPS.map((k) => [k, k.toUpperCase()])) as Record<(typeof EIGHT_D_STEPS)[number], string>,
  fiveW2H: { what: 'What', where: 'Where', when: 'When', who: 'Who', why: 'Why', how: 'How', howMany: 'How many' },
  prevention: { fmea: 'FMEA', controlPlan: 'CP', sop: 'SOP', training: 'Training', horizontal: 'Horizontal' },
  owner: 'Owner',
  due: 'Due',
  leader: 'Leader',
  occurrence: 'Occurrence',
  escape: 'Escape',
  rootCause: 'Root',
  verified: 'Verified',
  done: 'Done',
  why: (n: number) => `Why ${n}`,
}

describe('eightD', () => {
  it('必填檢查：每一步各自的規則', () => {
    expect(eightDMissing('d0', undefined)).toEqual(['text'])
    expect(eightDMissing('d0', { text: ' ' })).toEqual(['text'])
    expect(eightDMissing('d8', { text: '結案' })).toEqual([])
    expect(eightDMissing('d1', { members: [{ id: '1', name: 'A' }] })).toEqual(['members', 'leader'])
    expect(eightDMissing('d1', { members: [{ id: '1', name: 'A', leader: true }, { id: '2', name: 'B' }] })).toEqual([])
    expect(eightDMissing('d1', { members: [{ id: '1', name: '', leader: true }, { id: '2', name: 'B' }, { id: '3', name: 'C' }] })).toEqual(['leader'])
    expect(eightDMissing('d2', { fiveW2H: { what: 'x' } })).toEqual(['howMany'])
    expect(eightDMissing('d2', {})).toEqual(['what', 'howMany'])
    expect(eightDMissing('d3', { actions: [{ id: 'a', text: '' }] })).toEqual(['actions'])
    expect(eightDMissing('d5', { actions: [{ id: 'a', text: 'x' }] })).toEqual([])
    expect(eightDMissing('d4', { rootCause: { occurrence: 'x' } })).toEqual(['escapeRoot', 'verified'])
    expect(eightDMissing('d4', { rootCause: { occurrence: 'x', escape: 'y', verified: true } })).toEqual([])
    expect(eightDMissing('d6', { text: 'ok', actions: [{ id: 'a', text: 'x', done: false }] })).toEqual(['actionsDone'])
    expect(eightDMissing('d6', { text: 'ok', actions: [{ id: 'a', text: 'x', done: true }] })).toEqual([])
    expect(eightDMissing('d6', { text: 'ok' })).toEqual([])
    expect(eightDMissing('d7', { prevention: { sop: false } })).toEqual(['prevention'])
    expect(eightDMissing('d7', { prevention: { sop: true } })).toEqual([])
  })

  it('狀態與逾期', () => {
    expect(stepState(undefined)).toBe('empty')
    expect(stepState({})).toBe('empty')
    expect(stepState({ done: true })).toBe('done')
    for (const s of [
      { text: 'x' },
      { owner: 'x' },
      { members: [{ id: '1', name: 'A' }] },
      { fiveW2H: { where: 'x' } },
      { actions: [{ id: 'a', text: 'x' }] },
      { whys: { escape: ['', 'x'] } },
      { rootCause: { escape: 'x' } },
      { rootCause: { occurrence: 'x' } },
      { prevention: { fmea: true } },
    ]) expect(stepState(s)).toBe('inProgress')
    expect(stepOverdue({ due: '2026-11-20' }, '2026-11-27')).toBe(true)
    expect(stepOverdue({ due: '2026-11-27' }, '2026-11-27')).toBe(false)
    expect(stepOverdue({ due: '2026-11-20', done: true }, '2026-11-27')).toBe(false)
    expect(stepOverdue(undefined)).toBe(false)
    expect(stepOverdue({ due: '2000-01-01' })).toBe(true)
  })

  it('進度、更新與新報告', () => {
    let r: EightDReport = createEightD('客訴')
    expect(r).toEqual({ title: '客訴', steps: {} })
    expect(eightDProgress(r)).toMatchObject({ done: 0, total: 9, current: 'd0', closed: false, overdue: [] })
    r = updateStep(r, 'd0', { done: true })
    r = updateStep(r, 'd2', { due: '2026-11-01' })
    r = updateStep(r, 'd2', { owner: 'A' })
    expect(r.steps.d2).toEqual({ due: '2026-11-01', owner: 'A' })
    expect(eightDProgress(r, '2026-11-27')).toMatchObject({ done: 1, current: 'd1', overdue: ['d2'] })
    for (const k of EIGHT_D_STEPS) r = updateStep(r, k, { done: true })
    expect(eightDProgress(r)).toMatchObject({ done: 9, current: null, closed: true })
    expect(createEightD().title).toBe('')
  })

  it('Markdown 文字', () => {
    const r: EightDReport = {
      number: '8D-1',
      title: '空焊',
      steps: {
        d1: { done: true, completedAt: '2026-11-18', owner: 'Chen', due: '2026-11-18', members: [{ id: '1', name: 'Chen', role: 'QA', leader: true }, { id: '2', name: 'Lin' }, { id: '3', name: '' }] },
        d2: { fiveW2H: { what: 'BGA 空焊', howMany: '12 片' } },
        d4: { whys: { occurrence: ['錫量不足', '', '鋼板堵塞'], escape: [] }, rootCause: { occurrence: '擦拭頻率', escape: '', verified: true } },
        d5: { actions: [{ id: 'a', text: '每 3 片擦拭', owner: 'Lin', due: '2026-12-01', done: true }, { id: 'b', text: '' }, { id: 'c', text: '加 X-ray' }] },
        d7: { prevention: { fmea: true, sop: false } },
        d8: { done: true, text: ' 結案 ' },
      },
    }
    const md = eightDText(r, L)
    expect(md.startsWith('# 8D-1 空焊\n')).toBe(true)
    expect(md).toContain('## D1 [Done 2026-11-18]')
    expect(md).toContain('Owner: Chen / Due: 2026-11-18')
    expect(md).toContain('- Chen (QA) [Leader]\n- Lin\n')
    expect(md).toContain('- What: BGA 空焊\n- How many: 12 片')
    expect(md).toContain('### Occurrence\n1. Why 1: 錫量不足\n2. Why 2: 鋼板堵塞\n- Root: 擦拭頻率')
    expect(md).not.toContain('### Escape')
    expect(md).toContain('- Verified')
    expect(md).toContain('- [x] 每 3 片擦拭 / Lin / 2026-12-01\n- [ ] 加 X-ray')
    expect(md).toContain('- [x] FMEA')
    expect(md).not.toContain('SOP')
    expect(md).toContain('## D8 [Done]\n\n結案\n')
    expect(eightDText({ title: 'x', steps: undefined as never }, L)).toContain('## D0')
  })
})
