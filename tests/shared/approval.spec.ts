import { describe, expect, it } from 'vitest'
import {
  act,
  actingApprover,
  delegate,
  flowStatus,
  isOverdue,
  stepDuration,
  stepFinishedAt,
  stepOutcome,
  stepStartedAt,
  stepStatuses,
  toMs,
  type ApprovalFlowData,
} from '@/components/library/shared/approval'

const H = 3_600_000
const T0 = Date.UTC(2026, 10, 23, 0, 0)

const flow = (): ApprovalFlowData => ({
  submittedAt: T0,
  steps: [
    { id: 's1', name: '主管', approvers: [{ id: 'a', name: 'A', status: 'approved', actedAt: T0 + 2 * H }], slaHours: 4 },
    {
      id: 's2',
      name: '會簽',
      mode: 'all',
      slaHours: 8,
      approvers: [
        { id: 'b', name: 'B', status: 'approved', actedAt: T0 + 5 * H },
        { id: 'c', name: 'C', delegatedTo: { id: 'd', name: 'D' } },
        { id: 'e', name: 'E' },
      ],
    },
    { id: 's3', name: '或簽', mode: 'any', approvers: [{ id: 'f', name: 'F' }, { id: 'g', name: 'G' }] },
  ],
})

describe('approval', () => {
  it('toMs', () => {
    expect(toMs(T0)).toBe(T0)
    expect(toMs(new Date(T0))).toBe(T0)
    expect(toMs(new Date(T0).toISOString())).toBe(T0)
    expect(toMs(undefined)).toBeNull()
    expect(toMs(null)).toBeNull()
    expect(toMs('')).toBeNull()
    expect(toMs('x')).toBeNull()
  })

  it('stepOutcome：單人、會簽、或簽；任一人退回；沒有簽核人視為通過', () => {
    expect(stepOutcome({ id: 'x', name: '', approvers: [{ id: '1', name: '', status: 'approved' }] })).toBe('approved')
    expect(stepOutcome({ id: 'x', name: '', approvers: [{ id: '1', name: '', status: 'approved' }, { id: '2', name: '' }] })).toBe('pending') // 多人預設會簽
    expect(stepOutcome({ id: 'x', name: '', mode: 'any', approvers: [{ id: '1', name: '', status: 'approved' }, { id: '2', name: '' }] })).toBe('approved')
    expect(stepOutcome({ id: 'x', name: '', mode: 'any', approvers: [{ id: '1', name: '', status: 'rejected' }, { id: '2', name: '', status: 'approved' }] })).toBe('rejected')
    expect(stepOutcome({ id: 'x', name: '', approvers: [] })).toBe('approved')
    expect(stepOutcome({ id: 'x', name: '', approvers: [{ id: '1', name: '' }] })).toBe('pending')
  })

  it('stepStatuses / flowStatus：current 之後 upcoming；退回之後 cancelled', () => {
    const f = flow()
    expect(stepStatuses(f)).toEqual(['approved', 'current', 'upcoming'])
    expect(flowStatus(f)).toBe('in-progress')
    f.steps[1].approvers[2].status = 'rejected'
    expect(stepStatuses(f)).toEqual(['approved', 'rejected', 'cancelled'])
    expect(flowStatus(f)).toBe('rejected')
    const done = flow()
    done.steps[1].approvers.forEach((a) => (a.status = 'approved'))
    done.steps[2].approvers[1].status = 'approved'
    expect(stepStatuses(done)).toEqual(['approved', 'approved', 'approved'])
    expect(flowStatus(done)).toBe('approved')
  })

  it('stepFinishedAt / stepStartedAt / stepDuration / isOverdue', () => {
    const f = flow()
    expect(stepFinishedAt(f.steps[0])).toBe(T0 + 2 * H)
    expect(stepFinishedAt(f.steps[1])).toBeNull()
    expect(stepStartedAt(f, 0)).toBe(T0)
    expect(stepStartedAt(f, 1)).toBe(T0 + 2 * H)
    expect(stepStartedAt(f, 2)).toBeNull()
    expect(stepDuration(f, 0, T0 + 100 * H)).toBe(2 * H)
    expect(stepDuration(f, 1, T0 + 12 * H)).toBe(10 * H)
    expect(stepDuration(f, 2, T0 + 12 * H)).toBeNull()
    expect(isOverdue(f, 0, T0 + 100 * H)).toBe(false)
    expect(isOverdue(f, 1, T0 + 9 * H)).toBe(false)
    expect(isOverdue(f, 1, T0 + 11 * H)).toBe(true)
    expect(isOverdue(f, 2, T0 + 100 * H)).toBe(false)
    // 會簽：最後一個同意的時間；或簽：第一個同意；退回：第一個退回
    expect(stepFinishedAt({ id: 'x', name: '', mode: 'all', approvers: [{ id: '1', name: '', status: 'approved', actedAt: 5 }, { id: '2', name: '', status: 'approved', actedAt: 9 }] })).toBe(9)
    expect(stepFinishedAt({ id: 'x', name: '', mode: 'any', approvers: [{ id: '1', name: '', status: 'approved', actedAt: 5 }, { id: '2', name: '', status: 'approved', actedAt: 9 }] })).toBe(5)
    expect(stepFinishedAt({ id: 'x', name: '', approvers: [{ id: '1', name: '', status: 'rejected', actedAt: 7 }, { id: '2', name: '', status: 'rejected', actedAt: 3 }] })).toBe(3)
    // 沒有時間
    expect(stepFinishedAt({ id: 'x', name: '', approvers: [{ id: '1', name: '', status: 'approved' }] })).toBeNull()
    expect(stepStartedAt({ submittedAt: 'bad', steps: [] }, 0)).toBeNull()
  })

  it('actingApprover：只有目前關卡、待簽的本人或代理人；委託出去的本人不能簽', () => {
    const f = flow()
    expect(actingApprover(f, 'e')).toMatchObject({ stepIndex: 1, approver: { id: 'e' } })
    expect(actingApprover(f, 'd')).toMatchObject({ stepIndex: 1, approver: { id: 'c' } })
    expect(actingApprover(f, 'c')).toBeNull()
    expect(actingApprover(f, 'b')).toBeNull() // 已簽
    expect(actingApprover(f, 'f')).toBeNull() // 還沒輪到
    expect(actingApprover(f, '')).toBeNull()
    f.steps[1].approvers[2].status = 'rejected'
    expect(actingApprover(f, 'd')).toBeNull() // 沒有目前關卡
  })

  it('act：同意 / 退回（不改原物件），意見去空白；不能簽時回傳 null', () => {
    const f = flow()
    const next = act(f, 'd', 'approved', '  OK  ', T0 + 6 * H)!
    expect(next.steps[1].approvers[1]).toMatchObject({ status: 'approved', actedAt: T0 + 6 * H, comment: 'OK', delegatedTo: { id: 'd' } })
    expect(f.steps[1].approvers[1].status).toBeUndefined()
    expect(next.steps[0]).toBe(f.steps[0])
    const rejected = act(next, 'e', 'rejected', '', T0 + 7 * H)!
    expect(rejected.steps[1].approvers[2]).toMatchObject({ status: 'rejected', comment: undefined })
    expect(flowStatus(rejected)).toBe('rejected')
    expect(act(f, 'zz', 'approved', '', 0)).toBeNull()
  })

  it('delegate：委託給別人；不能委託給自己、同一關的人、已委託的不能再委託', () => {
    const f = flow()
    const next = delegate(f, 'e', { id: 'x', name: 'X' }, T0 + 6 * H)!
    expect(next.steps[1].approvers[2]).toMatchObject({ delegatedTo: { id: 'x' }, delegatedAt: T0 + 6 * H })
    expect(actingApprover(next, 'x')?.approver.id).toBe('e')
    expect(delegate(f, 'e', { id: 'e', name: 'E' }, 0)).toBeNull()
    expect(delegate(f, 'e', { id: 'b', name: 'B' }, 0)).toBeNull()
    expect(delegate(f, 'e', { id: 'd', name: 'D' }, 0)).toBeNull() // D 已經是這一關的代理人
    expect(delegate(f, 'd', { id: 'y', name: 'Y' }, 0)).toBeNull() // C 已經委託給 D
    expect(delegate(f, 'zz', { id: 'y', name: 'Y' }, 0)).toBeNull()
  })
})
