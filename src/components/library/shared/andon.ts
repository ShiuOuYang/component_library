/**
 * 安東看板（ChptAndonBoard）的呼叫狀態與升級
 *
 *   - 呼叫（call）：某一站因某種原因（維修、缺料、品質、主管…）呼叫支援
 *   - 狀態：open（還沒人回應）→ responding（有人回應、處理中）→ resolved（處理完）
 *   - 升級：還沒人回應時依「等了多久」、處理中時依「處理了多久」分成 0（正常）/ 1（黃）/ 2（紅）
 */

export interface AndonCallType {
  key: string
  label: string
  /** Material Symbols 圖示名稱 */
  icon?: string
}

export const DEFAULT_ANDON_TYPES: AndonCallType[] = [
  { key: 'maintenance', label: '', icon: 'build' },
  { key: 'material', label: '', icon: 'inventory_2' },
  { key: 'quality', label: '', icon: 'fact_check' },
  { key: 'supervisor', label: '', icon: 'support_agent' },
]

export interface AndonStation {
  id: string
  name: string
  /** 分組（產線、區域） */
  group?: string
}

export interface AndonCall {
  id: string
  station: string
  type: string
  raisedAt: string | number | Date
  /** 誰呼叫的 */
  by?: string
  note?: string
  respondedAt?: string | number | Date | null
  responder?: string
  resolvedAt?: string | number | Date | null
}

export type AndonStatus = 'open' | 'responding' | 'resolved'
export type AndonLevel = 0 | 1 | 2

/** 升級門檻（分鐘）：[黃, 紅] */
export interface AndonThresholds {
  respond: [number, number]
  resolve: [number, number]
}
export const DEFAULT_ANDON_THRESHOLDS: AndonThresholds = { respond: [3, 10], resolve: [20, 45] }

export const toMs = (t: string | number | Date | null | undefined): number | null => {
  if (t === null || t === undefined || t === '') return null
  const v = t instanceof Date ? t.getTime() : typeof t === 'number' ? t : new Date(t).getTime()
  return Number.isFinite(v) ? v : null
}

export function callStatus(c: AndonCall): AndonStatus {
  if (toMs(c.resolvedAt) !== null) return 'resolved'
  return toMs(c.respondedAt) !== null ? 'responding' : 'open'
}

/** 目前這個階段已經多久（毫秒）：未回應時從呼叫算起、處理中從回應算起、已完成為總時間 */
export function callElapsed(c: AndonCall, now: number): number {
  const raised = toMs(c.raisedAt) ?? now
  const responded = toMs(c.respondedAt)
  const resolved = toMs(c.resolvedAt)
  if (resolved !== null) return Math.max(0, resolved - raised)
  return Math.max(0, now - (responded ?? raised))
}

export function callLevel(c: AndonCall, now: number, t: AndonThresholds = DEFAULT_ANDON_THRESHOLDS): AndonLevel {
  const s = callStatus(c)
  if (s === 'resolved') return 0
  const [yellow, red] = s === 'open' ? t.respond : t.resolve
  const min = callElapsed(c, now) / 60_000
  return min >= red ? 2 : min >= yellow ? 1 : 0
}

/** 一站的目前狀態：進行中的呼叫（未回應的、等最久的在前）與最嚴重的等級 */
export function stationSummary(stationId: string, calls: AndonCall[], now: number, t?: AndonThresholds) {
  const active = calls
    .filter((c) => c.station === stationId && callStatus(c) !== 'resolved')
    .sort((a, b) => {
      const sa = callStatus(a) === 'open' ? 0 : 1
      const sb = callStatus(b) === 'open' ? 0 : 1
      return sa - sb || (toMs(a.raisedAt) ?? 0) - (toMs(b.raisedAt) ?? 0)
    })
  const level = active.reduce<AndonLevel>((m, c) => Math.max(m, callLevel(c, now, t)) as AndonLevel, 0)
  return { active, level, hasOpen: active.some((c) => callStatus(c) === 'open') }
}

let seq = 0
/** 新增呼叫（不改原陣列）；同一站同一種原因已經有進行中的呼叫時不重複 */
export function raiseCall(calls: AndonCall[], station: string, type: string, now: number, by?: string, note?: string): AndonCall[] {
  if (calls.some((c) => c.station === station && c.type === type && callStatus(c) !== 'resolved')) return calls
  return [...calls, { id: `andon-${now}-${++seq}`, station, type, raisedAt: now, by, note }]
}

export const respondCall = (calls: AndonCall[], id: string, responder: string | undefined, now: number): AndonCall[] =>
  calls.map((c) => (c.id === id && callStatus(c) === 'open' ? { ...c, respondedAt: now, responder } : c))

export const resolveCall = (calls: AndonCall[], id: string, now: number): AndonCall[] =>
  calls.map((c) => (c.id === id && callStatus(c) !== 'resolved' ? { ...c, respondedAt: c.respondedAt ?? now, resolvedAt: now } : c))

/** 計時文字：mm:ss，超過一小時 h:mm:ss */
export function formatClock(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}
