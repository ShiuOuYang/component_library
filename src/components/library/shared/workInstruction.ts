/**
 * 作業指導書（ChptWorkInstruction）的步驟、確認條件與紀錄
 *
 *   - 每一步：標題、說明、圖片（可加編號標記）、注意事項、規格（扭力、溫度…）
 *   - 前進條件（check）：勾選確認，或輸入量測值（有上下限時要在範圍內）；minSeconds 至少停留幾秒（避免沒看就跳過）
 *   - 紀錄：每一步的開始 / 完成時間、量測值、是否合格 —— 完成時整份交給後端（追溯誰、什麼時候、量到多少）
 */

export interface WiMark {
  /** 在圖片上的位置（0–1，相對寬高） */
  x: number
  y: number
  label?: string
}

export interface WiSpec {
  label: string
  value: string | number
  unit?: string
}

export type WiCheck =
  | { kind: 'confirm'; label: string }
  | { kind: 'measure'; label: string; unit?: string; lsl?: number; usl?: number; precision?: number }

export interface WiStep {
  id: string
  title: string
  body?: string
  image?: string
  imageAlt?: string
  marks?: WiMark[]
  cautions?: string[]
  specs?: WiSpec[]
  check?: WiCheck
  /** 至少停留幾秒才能下一步 */
  minSeconds?: number
}

export interface WiStepRecord {
  startedAt?: number
  completedAt?: number
  confirmed?: boolean
  value?: number | null
  /** 量測是否在規格內（沒有上下限時為 true） */
  ok?: boolean
}

export type WiRecord = Record<string, WiStepRecord>

/** 量測值是否在規格內 */
export function inSpec(value: number | null | undefined, lsl?: number, usl?: number): boolean {
  if (value === null || value === undefined || !Number.isFinite(value)) return false
  if (lsl !== undefined && value < lsl) return false
  if (usl !== undefined && value > usl) return false
  return true
}

export type WiBlock = 'confirm' | 'measure' | 'outOfSpec' | 'wait'

/**
 * 還不能下一步的原因（空陣列表示可以）
 * @param elapsedMs 這一步已經停留多久
 */
export function blockers(step: WiStep, rec: WiStepRecord | undefined, elapsedMs: number): WiBlock[] {
  const out: WiBlock[] = []
  const c = step.check
  if (c?.kind === 'confirm' && !rec?.confirmed) out.push('confirm')
  if (c?.kind === 'measure') {
    const v = rec?.value
    if (v === null || v === undefined || !Number.isFinite(v)) out.push('measure')
    else if (!inSpec(v, c.lsl, c.usl)) out.push('outOfSpec')
  }
  if (step.minSeconds && elapsedMs < step.minSeconds * 1000) out.push('wait')
  return out
}

/** 更新一步的紀錄（不改原物件） */
export const patchRecord = (record: WiRecord, stepId: string, patch: Partial<WiStepRecord>): WiRecord => ({
  ...record,
  [stepId]: { ...(record[stepId] ?? {}), ...patch },
})

/** 完成時的摘要 */
export interface WiSummary {
  startedAt: number | null
  completedAt: number | null
  durationMs: number | null
  steps: Array<{ id: string; title: string; durationMs: number | null; value?: number | null; ok?: boolean; confirmed?: boolean }>
}

export function summarize(steps: WiStep[], record: WiRecord): WiSummary {
  const starts = steps.map((s) => record[s.id]?.startedAt).filter((t): t is number => t !== undefined)
  const ends = steps.map((s) => record[s.id]?.completedAt).filter((t): t is number => t !== undefined)
  const startedAt = starts.length ? Math.min(...starts) : null
  const completedAt = ends.length === steps.length && ends.length ? Math.max(...ends) : null
  return {
    startedAt,
    completedAt,
    durationMs: startedAt !== null && completedAt !== null ? completedAt - startedAt : null,
    steps: steps.map((s) => {
      const r = record[s.id] ?? {}
      return {
        id: s.id,
        title: s.title,
        durationMs: r.startedAt !== undefined && r.completedAt !== undefined ? r.completedAt - r.startedAt : null,
        ...(s.check?.kind === 'measure' ? { value: r.value ?? null, ok: r.ok } : {}),
        ...(s.check?.kind === 'confirm' ? { confirmed: !!r.confirmed } : {}),
      }
    }),
  }
}

/** 計時文字：mm:ss，超過一小時 h:mm:ss */
export function formatClock(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}
