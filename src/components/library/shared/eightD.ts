/**
 * 8D 報告（Chpt8DReport）的資料模型與檢查。
 *
 * D0 準備 → D1 成立團隊 → D2 問題描述（5W2H）→ D3 暫時對策 → D4 根本原因（發生 / 流出各一條 5 Why）
 * → D5 永久對策 → D6 執行與效果確認 → D7 預防再發（文件與水平展開）→ D8 結案。
 * 每一步要填的東西不一樣；標記完成前先檢查必填（eightDMissing），沒填齊不能完成。
 */
import { localDayKey } from './fmea'

export const EIGHT_D_STEPS = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'] as const
export type EightDStepKey = (typeof EIGHT_D_STEPS)[number]

export const FIVE_W2H = ['what', 'where', 'when', 'who', 'why', 'how', 'howMany'] as const
export type FiveW2HKey = (typeof FIVE_W2H)[number]

/** D7 預防再發的標準檢查項目 */
export const PREVENTION_ITEMS = ['fmea', 'controlPlan', 'sop', 'training', 'horizontal'] as const
export type PreventionItem = (typeof PREVENTION_ITEMS)[number]

export interface EightDMember {
  id: string
  name: string
  /** 職務 / 部門 */
  role?: string
  /** 組長 */
  leader?: boolean
}

export interface EightDAction {
  id: string
  text: string
  owner?: string
  due?: string | number | Date | null
  done?: boolean
}

export interface EightDStep {
  /** 已完成（經過必填檢查） */
  done?: boolean
  /** 完成日期（YYYY-MM-DD） */
  completedAt?: string | null
  /** 這一步的負責人 */
  owner?: string
  /** 這一步的期限 */
  due?: string | number | Date | null
  /** 說明（每一步都有） */
  text?: string
  /** D1 團隊成員 */
  members?: EightDMember[]
  /** D2 5W2H */
  fiveW2H?: Partial<Record<FiveW2HKey, string>>
  /** D3 / D5 / D6 對策 */
  actions?: EightDAction[]
  /** D4：發生原因與流出原因各一條 5 Why */
  whys?: { occurrence?: string[]; escape?: string[] }
  /** D4：根本原因（發生 / 流出）與是否已驗證 */
  rootCause?: { occurrence?: string; escape?: string; verified?: boolean }
  /** D7 預防再發項目 */
  prevention?: Partial<Record<PreventionItem, boolean>>
}

export interface EightDReport {
  /** 8D 編號 */
  number?: string
  /** 問題主旨 */
  title: string
  steps: Partial<Record<EightDStepKey, EightDStep>>
}

export type EightDMissing =
  | 'text'
  | 'members'
  | 'leader'
  | 'what'
  | 'howMany'
  | 'actions'
  | 'actionsDone'
  | 'occurrenceRoot'
  | 'escapeRoot'
  | 'verified'
  | 'prevention'

const filled = (v: unknown) => typeof v === 'string' && v.trim() !== ''
const hasActions = (s: EightDStep) => (s.actions ?? []).some((a) => filled(a.text))

/** 標記完成前要補的欄位 */
export function eightDMissing(key: EightDStepKey, step: EightDStep | undefined): EightDMissing[] {
  const s = step ?? {}
  const miss: EightDMissing[] = []
  switch (key) {
    case 'd0':
    case 'd6':
    case 'd8':
      if (!filled(s.text)) miss.push('text')
      if (key === 'd6' && hasActions(s) && (s.actions ?? []).some((a) => filled(a.text) && !a.done)) miss.push('actionsDone')
      break
    case 'd1': {
      const members = (s.members ?? []).filter((m) => filled(m.name))
      if (members.length < 2) miss.push('members')
      if (!members.some((m) => m.leader)) miss.push('leader')
      break
    }
    case 'd2':
      if (!filled(s.fiveW2H?.what)) miss.push('what')
      if (!filled(s.fiveW2H?.howMany)) miss.push('howMany')
      break
    case 'd3':
    case 'd5':
      if (!hasActions(s)) miss.push('actions')
      break
    case 'd4':
      if (!filled(s.rootCause?.occurrence)) miss.push('occurrenceRoot')
      if (!filled(s.rootCause?.escape)) miss.push('escapeRoot')
      if (!s.rootCause?.verified) miss.push('verified')
      break
    case 'd7':
      if (!PREVENTION_ITEMS.some((k) => s.prevention?.[k])) miss.push('prevention')
      break
  }
  return miss
}

export type EightDStepState = 'done' | 'inProgress' | 'empty'

/** 這一步是否已經開始填（任何欄位有內容） */
function touched(s: EightDStep | undefined): boolean {
  if (!s) return false
  return (
    filled(s.text) ||
    filled(s.owner) ||
    (s.members ?? []).some((m) => filled(m.name)) ||
    Object.values(s.fiveW2H ?? {}).some(filled) ||
    hasActions(s) ||
    [...(s.whys?.occurrence ?? []), ...(s.whys?.escape ?? [])].some(filled) ||
    filled(s.rootCause?.occurrence) ||
    filled(s.rootCause?.escape) ||
    Object.values(s.prevention ?? {}).some(Boolean)
  )
}

export function stepState(step: EightDStep | undefined): EightDStepState {
  if (step?.done) return 'done'
  return touched(step) ? 'inProgress' : 'empty'
}

/** 未完成且期限早於今天 */
export function stepOverdue(step: EightDStep | undefined, today: string | number | Date = Date.now()): boolean {
  if (!step || step.done) return false
  const due = localDayKey(step.due)
  const now = localDayKey(today)
  return due !== null && now !== null && due < now
}

export interface EightDProgress {
  done: number
  total: number
  /** 第一個還沒完成的步驟；全部完成時為 null */
  current: EightDStepKey | null
  overdue: EightDStepKey[]
  closed: boolean
}

export function eightDProgress(report: EightDReport, today?: string | number | Date): EightDProgress {
  const steps = report.steps ?? {}
  const done = EIGHT_D_STEPS.filter((k) => steps[k]?.done).length
  return {
    done,
    total: EIGHT_D_STEPS.length,
    current: EIGHT_D_STEPS.find((k) => !steps[k]?.done) ?? null,
    overdue: EIGHT_D_STEPS.filter((k) => stepOverdue(steps[k], today)),
    closed: done === EIGHT_D_STEPS.length,
  }
}

/** 不可變更新某一步 */
export function updateStep(report: EightDReport, key: EightDStepKey, patch: Partial<EightDStep>): EightDReport {
  return { ...report, steps: { ...report.steps, [key]: { ...(report.steps?.[key] ?? {}), ...patch } } }
}

export function createEightD(title = ''): EightDReport {
  return { title, steps: {} }
}

export interface EightDTextLabels {
  steps: Record<EightDStepKey, string>
  fiveW2H: Record<FiveW2HKey, string>
  prevention: Record<PreventionItem, string>
  owner: string
  due: string
  leader: string
  occurrence: string
  escape: string
  rootCause: string
  verified: string
  done: string
  why: (n: number) => string
}

const dateText = (v: unknown): string => {
  const k = localDayKey(v as string)
  if (k === null) return ''
  const s = String(k)
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

/** 8D 報告的純文字（Markdown）版本：存檔、貼到信件、交給 AI 摘要都方便 */
export function eightDText(report: EightDReport, L: EightDTextLabels): string {
  const out: string[] = [`# ${report.number ? `${report.number} ` : ''}${report.title}`]
  for (const key of EIGHT_D_STEPS) {
    const s = report.steps?.[key] ?? {}
    out.push('', `## ${L.steps[key]}${s.done ? ` [${L.done}${s.completedAt ? ` ${s.completedAt}` : ''}]` : ''}`)
    const meta = [s.owner ? `${L.owner}: ${s.owner}` : '', dateText(s.due) ? `${L.due}: ${dateText(s.due)}` : ''].filter(Boolean)
    if (meta.length) out.push(meta.join(' / '))
    for (const m of s.members ?? []) if (filled(m.name)) out.push(`- ${m.name}${m.role ? ` (${m.role})` : ''}${m.leader ? ` [${L.leader}]` : ''}`)
    for (const k of FIVE_W2H) if (filled(s.fiveW2H?.[k])) out.push(`- ${L.fiveW2H[k]}: ${s.fiveW2H![k]}`)
    for (const side of ['occurrence', 'escape'] as const) {
      const whys = (s.whys?.[side] ?? []).filter(filled)
      const root = s.rootCause?.[side]
      if (!whys.length && !filled(root)) continue
      out.push(`### ${side === 'occurrence' ? L.occurrence : L.escape}`)
      whys.forEach((w, i) => out.push(`${i + 1}. ${L.why(i + 1)}: ${w}`))
      if (filled(root)) out.push(`- ${L.rootCause}: ${root}`)
    }
    if (s.rootCause?.verified) out.push(`- ${L.verified}`)
    for (const a of s.actions ?? []) {
      if (!filled(a.text)) continue
      out.push(`- [${a.done ? 'x' : ' '}] ${a.text}${a.owner ? ` / ${a.owner}` : ''}${dateText(a.due) ? ` / ${dateText(a.due)}` : ''}`)
    }
    for (const k of PREVENTION_ITEMS) if (s.prevention?.[k]) out.push(`- [x] ${L.prevention[k]}`)
    if (filled(s.text)) out.push('', s.text!.trim())
  }
  return out.join('\n') + '\n'
}
