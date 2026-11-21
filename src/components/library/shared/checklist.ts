/**
 * 點檢表（ChptChecklist）的判定、完成度與檢查
 *
 * 三種項目：
 *   - check：目視 / 動作確認，選合格（ok）、不合格（ng）、不適用（na）
 *   - measure：量測值，依上下限（lsl / usl）自動判定合格或不合格 —— 作業員不用、也不能自己選
 *   - text：記錄文字（序號、批號、備註），填了就算完成
 */

export type ChecklistItemType = 'check' | 'measure' | 'text'
export type ChecklistStatus = 'ok' | 'ng' | 'na'

export interface ChecklistItem {
  id: string
  label: string
  /** 說明（方法、位置、判定標準） */
  description?: string
  /** 分組（外觀、電性…）；同一組連續排列時顯示組標題 */
  section?: string
  /** 預設 check */
  type?: ChecklistItemType
  /** 必填；預設 true */
  required?: boolean
  /** check：可以選「不適用」；預設 true */
  allowNA?: boolean
  /** 這一項可以附照片；不設定時看元件的 allowPhotos（text 項目預設不附） */
  photos?: boolean
  /** measure：下限 / 上限 / 目標值 / 單位 / 小數位數 */
  lsl?: number
  usl?: number
  target?: number
  unit?: string
  precision?: number
}

export interface ChecklistResult {
  /** check：選的結果；measure：依數值自動判定；text：填了為 ok */
  status?: ChecklistStatus | null
  /** measure 的數值 */
  value?: number | null
  /** text 的內容 */
  text?: string
  /** 備註；不合格時通常必填（原因、處置） */
  note?: string
  /** 照片（data URL 或網址） */
  photos?: string[]
  /** 最後填寫時間（ISO） */
  at?: string
}

export type ChecklistResults = Record<string, ChecklistResult | undefined>

/** 量測值判定：在 [lsl, usl] 內為 ok（含等於界限）；沒有界限的一邊不限；沒有值為 null */
export function judgeMeasure(value: number | null | undefined, lsl?: number, usl?: number): 'ok' | 'ng' | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  if (lsl !== undefined && value < lsl) return 'ng'
  if (usl !== undefined && value > usl) return 'ng'
  return 'ok'
}

/** 這一項目前的結果（measure 與 text 由內容推導，不看存的 status） */
export function itemStatus(item: ChecklistItem, result: ChecklistResult | undefined): ChecklistStatus | null {
  const type = item.type ?? 'check'
  if (type === 'measure') return judgeMeasure(result?.value, item.lsl, item.usl)
  if (type === 'text') return result?.text?.trim() ? 'ok' : null
  return result?.status ?? null
}

/** 這一項有沒有問題：未填（必填時）、不合格但沒寫原因（requireNoteOnNG 時） */
export function itemIssue(
  item: ChecklistItem,
  result: ChecklistResult | undefined,
  requireNoteOnNG = true
): 'missing' | 'noteRequired' | null {
  const status = itemStatus(item, result)
  if (status === null) return item.required === false ? null : 'missing'
  if (status === 'ng' && requireNoteOnNG && !result?.note?.trim()) return 'noteRequired'
  return null
}

export interface ChecklistSummary {
  total: number
  /** 已經有結果的項目數 */
  done: number
  ok: number
  ng: number
  na: number
  /** 必填但還沒填 */
  missing: string[]
  /** 不合格但沒寫原因 */
  noteRequired: string[]
  /** 沒有任何問題（可以送出） */
  complete: boolean
}

export function checklistSummary(items: ChecklistItem[], results: ChecklistResults, requireNoteOnNG = true): ChecklistSummary {
  const s: ChecklistSummary = { total: items.length, done: 0, ok: 0, ng: 0, na: 0, missing: [], noteRequired: [], complete: false }
  for (const item of items) {
    const r = results[item.id]
    const status = itemStatus(item, r)
    if (status) {
      s.done++
      s[status]++
    }
    const issue = itemIssue(item, r, requireNoteOnNG)
    if (issue === 'missing') s.missing.push(item.id)
    else if (issue === 'noteRequired') s.noteRequired.push(item.id)
  }
  s.complete = !s.missing.length && !s.noteRequired.length
  return s
}

/** 把結果寫回（不改原物件）；measure / text 依內容重算 status，並記下填寫時間 */
export function updateResult(
  item: ChecklistItem,
  results: ChecklistResults,
  patch: Partial<ChecklistResult>,
  now: () => Date = () => new Date()
): ChecklistResults {
  const next: ChecklistResult = { ...results[item.id], ...patch, at: now().toISOString() }
  const type = item.type ?? 'check'
  if (type !== 'check') next.status = itemStatus(item, next)
  return { ...results, [item.id]: next }
}

/** 依 section 分組（照出現順序；同名但不連續的 section 會合併成一組） */
export function groupChecklist(items: ChecklistItem[]): Array<{ section: string | null; items: ChecklistItem[] }> {
  const groups: Array<{ section: string | null; items: ChecklistItem[] }> = []
  for (const item of items) {
    const key = item.section ?? null
    let g = groups.find((x) => x.section === key)
    if (!g) groups.push((g = { section: key, items: [] }))
    g.items.push(item)
  }
  return groups
}
