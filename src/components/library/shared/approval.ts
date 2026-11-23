/**
 * 簽核流程（ChptApprovalFlow）的狀態與操作
 *
 *   - 關卡（step）依序進行；每關的簽核方式：
 *       single：一個人簽
 *       all（會簽）：所有人都要同意
 *       any（或簽）：任一人同意就通過
 *     任何一人退回 → 這一關退回 → 整個流程退回
 *   - 委託（代理）：簽核人把這一關交給另一個人，由代理人決定；原簽核人顯示「已委託」
 *   - 等待時間：這一關從「上一關完成」（第一關從送出）開始算；超過 slaHours 標示逾時
 */

export type ApprovalAction = 'approved' | 'rejected'
export type ApproverStatus = 'pending' | ApprovalAction

export interface Delegate {
  id: string
  name: string
  title?: string
}

export interface Approver {
  id: string
  name: string
  /** 職稱 */
  title?: string
  status?: ApproverStatus
  actedAt?: string | number | Date
  comment?: string
  /** 委託給誰（由代理人決定；status / actedAt / comment 記的是代理人的決定） */
  delegatedTo?: Delegate
  delegatedAt?: string | number | Date
}

export type StepMode = 'single' | 'all' | 'any'

export interface ApprovalStep {
  id: string
  name: string
  mode?: StepMode
  approvers: Approver[]
  /** 這一關應在幾小時內完成 */
  slaHours?: number
}

export interface ApprovalFlowData {
  /** 送出時間 */
  submittedAt: string | number | Date
  submitter?: string
  steps: ApprovalStep[]
}

export type StepStatus = 'approved' | 'rejected' | 'current' | 'upcoming' | 'cancelled'
export type FlowStatus = 'approved' | 'rejected' | 'in-progress'

export const toMs = (t: string | number | Date | null | undefined): number | null => {
  if (t === null || t === undefined || t === '') return null
  const v = t instanceof Date ? t.getTime() : typeof t === 'number' ? t : new Date(t).getTime()
  return Number.isFinite(v) ? v : null
}

const statusOf = (a: Approver): ApproverStatus => a.status ?? 'pending'

/** 這一關自己的結果（不看前後關）：approved / rejected / pending */
export function stepOutcome(step: ApprovalStep): ApproverStatus {
  const list = step.approvers.map(statusOf)
  if (list.includes('rejected')) return 'rejected'
  if (!list.length) return 'approved'
  const mode = step.mode ?? (step.approvers.length > 1 ? 'all' : 'single')
  if (mode === 'any' ? list.includes('approved') : list.every((s) => s === 'approved')) return 'approved'
  return 'pending'
}

/** 每一關的狀態：前面都通過的第一個未完成關卡是 current；退回之後的關卡是 cancelled */
export function stepStatuses(flow: ApprovalFlowData): StepStatus[] {
  const out: StepStatus[] = []
  let blocked: 'rejected' | 'pending' | null = null
  for (const step of flow.steps) {
    if (blocked === 'rejected') {
      out.push('cancelled')
      continue
    }
    if (blocked === 'pending') {
      out.push('upcoming')
      continue
    }
    const o = stepOutcome(step)
    if (o === 'approved') out.push('approved')
    else if (o === 'rejected') {
      out.push('rejected')
      blocked = 'rejected'
    } else {
      out.push('current')
      blocked = 'pending'
    }
  }
  return out
}

export function flowStatus(flow: ApprovalFlowData): FlowStatus {
  const s = stepStatuses(flow)
  if (s.includes('rejected')) return 'rejected'
  return s.every((x) => x === 'approved') ? 'approved' : 'in-progress'
}

/** 這一關完成的時間：通過 / 退回時，最後一個（或決定性的）動作時間 */
export function stepFinishedAt(step: ApprovalStep): number | null {
  const o = stepOutcome(step)
  if (o === 'pending') return null
  const times = step.approvers
    .filter((a) => (o === 'rejected' ? statusOf(a) === 'rejected' : statusOf(a) === 'approved'))
    .map((a) => toMs(a.actedAt))
    .filter((t): t is number => t !== null)
  if (!times.length) return null
  // 或簽：第一個同意的人就通過；會簽：最後一個同意的人；退回：第一個退回的人
  const mode = step.mode ?? (step.approvers.length > 1 ? 'all' : 'single')
  return o === 'approved' && mode !== 'any' ? Math.max(...times) : Math.min(...times)
}

/** 每一關開始的時間：第一關從送出，之後從上一關完成 */
export function stepStartedAt(flow: ApprovalFlowData, index: number): number | null {
  if (index === 0) return toMs(flow.submittedAt)
  return stepFinishedAt(flow.steps[index - 1])
}

/** 這一關花了（或已經等了）多久，毫秒；還沒開始為 null */
export function stepDuration(flow: ApprovalFlowData, index: number, now: number): number | null {
  const start = stepStartedAt(flow, index)
  if (start === null) return null
  const end = stepFinishedAt(flow.steps[index]) ?? now
  return Math.max(0, end - start)
}

/** 逾時（超過 slaHours）：進行中的關卡用現在時間算，完成的用完成時間算 */
export function isOverdue(flow: ApprovalFlowData, index: number, now: number): boolean {
  const sla = flow.steps[index].slaHours
  const d = stepDuration(flow, index, now)
  return !!sla && d !== null && d > sla * 3_600_000
}

/** operator 在目前關卡可以簽的那一位（自己是簽核人且沒委託出去，或自己是代理人），沒有時為 null */
export function actingApprover(flow: ApprovalFlowData, operatorId: string): { stepIndex: number; approver: Approver } | null {
  if (!operatorId) return null
  const statuses = stepStatuses(flow)
  const i = statuses.indexOf('current')
  if (i < 0) return null
  const a = flow.steps[i].approvers.find(
    (x) => statusOf(x) === 'pending' && (x.delegatedTo ? x.delegatedTo.id === operatorId : x.id === operatorId)
  )
  return a ? { stepIndex: i, approver: a } : null
}

function patchApprover(flow: ApprovalFlowData, stepIndex: number, approverId: string, fn: (a: Approver) => Approver): ApprovalFlowData {
  return {
    ...flow,
    steps: flow.steps.map((s, i) => (i === stepIndex ? { ...s, approvers: s.approvers.map((a) => (a.id === approverId ? fn(a) : a)) } : s)),
  }
}

/** 同意 / 退回（不改原物件）；只能簽目前關卡、自己（或代理）的那一位 */
export function act(flow: ApprovalFlowData, operatorId: string, action: ApprovalAction, comment: string, now: number): ApprovalFlowData | null {
  const target = actingApprover(flow, operatorId)
  if (!target) return null
  return patchApprover(flow, target.stepIndex, target.approver.id, (a) => ({ ...a, status: action, actedAt: now, comment: comment.trim() || undefined }))
}

/** 這一關已經在簽的人：簽核人與代理人 */
export const inStep = (step: ApprovalStep): Set<string> => new Set(step.approvers.flatMap((a) => (a.delegatedTo ? [a.id, a.delegatedTo.id] : [a.id])))

/** 委託給另一個人（不改原物件）；已經委託出去的不能再委託、不能委託給自己或這一關已經在簽的人（含代理人） */
export function delegate(flow: ApprovalFlowData, operatorId: string, to: Delegate, now: number): ApprovalFlowData | null {
  const target = actingApprover(flow, operatorId)
  if (!target || target.approver.delegatedTo || to.id === operatorId) return null
  if (inStep(flow.steps[target.stepIndex]).has(to.id)) return null
  return patchApprover(flow, target.stepIndex, target.approver.id, (a) => ({ ...a, delegatedTo: to, delegatedAt: now }))
}
