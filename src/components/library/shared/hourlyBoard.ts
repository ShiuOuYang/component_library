/**
 * 逐時產出看板（ChptHourlyBoard）的計算：時段、計畫、累計、達成率、班別預估。
 * 時間用一天中的分鐘數；跨午夜的班別（例如 20:00–08:00）自動把凌晨的時間加 24 小時。
 */

/** 一個時段 */
export interface HourlySlot {
  id: string
  /** 'HH:mm' */
  start: string
  /** 'HH:mm' */
  end: string
  /** 計畫數量 */
  plan: number
  /** 實際數量；還沒填為 null */
  actual?: number | null
  /** 這個時段裡的休息分鐘數（計畫已扣掉） */
  breakMinutes?: number
  /** 落後原因代碼 */
  reason?: string | null
  note?: string
}

export interface HourlyBreak {
  start: string
  end: string
}

export type SlotState = 'past' | 'current' | 'future'

/** 'HH:mm' → 分鐘；格式錯誤回傳 NaN */
export function toMinutes(t: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim())
  if (!m) return NaN
  const h = Number(m[1])
  const min = Number(m[2])
  return h <= 24 && min < 60 ? h * 60 + min : NaN
}

/** 分鐘 → 'HH:mm'（超過 24 小時取餘數） */
export function fromMinutes(m: number): string {
  const v = ((Math.round(m) % 1440) + 1440) % 1440
  return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`
}

/** 以班別開始為基準展開成連續的分鐘數（跨午夜時凌晨的時間 + 1440） */
export function shiftMinutes(t: string, shiftStart: string): number {
  const m = toMinutes(t)
  const s = toMinutes(shiftStart)
  return m < s ? m + 1440 : m
}

export interface BuildSlotsOptions {
  /** 班別開始 'HH:mm' */
  start: string
  /** 班別結束 'HH:mm'（早於開始時視為隔天） */
  end: string
  /** 每小時產能（件 / 小時）；計畫 = 產能 × 工作分鐘 / 60，四捨五入 */
  rate: number
  breaks?: HourlyBreak[]
  /** 時段長度（分鐘），預設 60 */
  interval?: number
}

/** 依班別、休息與產能產生時段 */
export function buildHourlySlots(o: BuildSlotsOptions): HourlySlot[] {
  const s = toMinutes(o.start)
  let e = toMinutes(o.end)
  if (Number.isNaN(s) || Number.isNaN(e)) return []
  if (e <= s) e += 1440
  const step = Math.max(5, o.interval ?? 60)
  const breaks = (o.breaks ?? []).map((b) => [shiftMinutes(b.start, o.start), shiftMinutes(b.end, o.start)] as const)
  const slots: HourlySlot[] = []
  for (let t = s; t < e; t += step) {
    const t1 = Math.min(e, t + step)
    let off = 0
    for (const [b0, b1] of breaks) off += Math.max(0, Math.min(t1, b1 > b0 ? b1 : b1 + 1440) - Math.max(t, b0))
    const work = t1 - t - off
    slots.push({
      id: fromMinutes(t),
      start: fromMinutes(t),
      end: fromMinutes(t1),
      plan: Math.round((o.rate * work) / 60),
      actual: null,
      ...(off ? { breakMinutes: off } : {}),
    })
  }
  return slots
}

/** 班別是否跨午夜（有時段的開始早於班別開始、或結束不晚於班別開始） */
export function crossesMidnight(slots: readonly HourlySlot[], shiftStart: string): boolean {
  const s = toMinutes(shiftStart)
  return slots.some((x) => toMinutes(x.start) < s || toMinutes(x.end) <= s)
}

/** 現在時間換成班別的連續分鐘（跨午夜的班別，凌晨 + 1440） */
const wrapNow = (nowMin: number, shiftStart: string, crosses: boolean) => (crosses && nowMin < toMinutes(shiftStart) ? nowMin + 1440 : nowMin)

/** 時段狀態：nowMin 是「一天中的分鐘數」；crosses 為班別是否跨午夜 */
export function slotState(slot: HourlySlot, nowMin: number, shiftStart: string, crosses = false): SlotState {
  const now = wrapNow(nowMin, shiftStart, crosses)
  const a = shiftMinutes(slot.start, shiftStart)
  let b = shiftMinutes(slot.end, shiftStart)
  if (b <= a) b += 1440
  if (now >= b) return 'past'
  return now >= a ? 'current' : 'future'
}

/** 目前時段已經過的比例（0–1；扣掉休息，休息平均分在時段裡） */
export function slotElapsed(slot: HourlySlot, nowMin: number, shiftStart: string, crosses = false): number {
  const now = wrapNow(nowMin, shiftStart, crosses)
  const a = shiftMinutes(slot.start, shiftStart)
  let b = shiftMinutes(slot.end, shiftStart)
  if (b <= a) b += 1440
  return Math.min(1, Math.max(0, (now - a) / (b - a)))
}

export interface HourlyRow {
  slot: HourlySlot
  state: SlotState
  diff: number | null
  cumPlan: number
  cumActual: number | null
  cumDiff: number | null
  /** 落後但沒填原因 */
  needsReason: boolean
}

export interface HourlySummary {
  rows: HourlyRow[]
  /** 整班計畫 */
  totalPlan: number
  /** 目前為止應該做到的數量（已過時段 + 目前時段依時間比例） */
  planToNow: number
  /** 目前為止實際 */
  actualToNow: number
  /** 達成率（實際 / 應做）；還沒開始為 null */
  achievement: number | null
  /** 照目前效率，班別結束時預估做到的數量 */
  forecast: number | null
  /** 待填原因的時段數 */
  missingReasons: number
  /** 是否只算已填的時段（沒有 now 時） */
  hasNow: boolean
}

/**
 * 逐列累計與摘要。nowMin 為 null 時：有填實際的時段都算「已過」，不預估。
 */
export function hourlySummary(slots: readonly HourlySlot[], nowMin: number | null, shiftStart: string): HourlySummary {
  let cumPlan = 0
  let cumActual = 0
  let planToNow = 0
  let actualToNow = 0
  let missing = 0
  let started = false
  const crosses = crossesMidnight(slots, shiftStart)
  const rows: HourlyRow[] = slots.map((slot) => {
    const actual = slot.actual ?? null
    const state: SlotState = nowMin === null ? (actual !== null ? 'past' : 'future') : slotState(slot, nowMin, shiftStart, crosses)
    cumPlan += slot.plan
    if (actual !== null) {
      cumActual += actual
      started = true
    }
    if (state === 'past') planToNow += slot.plan
    else if (state === 'current' && nowMin !== null) planToNow += slot.plan * slotElapsed(slot, nowMin, shiftStart, crosses)
    if (state !== 'future' && actual !== null) actualToNow += actual
    const diff = actual === null ? null : actual - slot.plan
    const needsReason = state === 'past' && diff !== null && diff < 0 && !slot.reason
    if (needsReason) missing++
    const show = started && state !== 'future'
    return { slot, state, diff, cumPlan, cumActual: show ? cumActual : null, cumDiff: show ? cumActual - cumPlan : null, needsReason }
  })
  const totalPlan = cumPlan
  const achievement = planToNow > 0 ? actualToNow / planToNow : null
  const remaining = totalPlan - planToNow
  const forecast = nowMin !== null && achievement !== null ? Math.round(actualToNow + remaining * achievement) : null
  return { rows, totalPlan, planToNow, actualToNow, achievement, forecast, missingReasons: missing, hasNow: nowMin !== null }
}

/** 更新某個時段（不改原陣列） */
export function patchSlot(slots: readonly HourlySlot[], id: string, patch: Partial<HourlySlot>): HourlySlot[] {
  return slots.map((s) => (s.id === id ? { ...s, ...patch } : s))
}
