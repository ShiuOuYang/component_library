/**
 * 變更紀錄（ChptAuditTrail）的資料模型與計算。
 *
 * 每筆紀錄：誰（user）在何時（at）對什麼（target）做了什麼（action），以及欄位層級的變更（from → to）。
 * - 依時間排序、依人員 / 欄位 / 關鍵字 / 日期區間篩選、依日期分組
 * - 版本快照：從最早的 from 推回初始值，再依序套用每筆變更，得到「某一筆之後」的完整欄位值
 * - 比較兩個版本：列出每個欄位在兩版的值與是否不同
 */
import { toTime } from './storage'
import { localDayKey } from './fmea'

export interface AuditChange {
  /** 欄位 key */
  field: string
  /** 欄位顯示名稱（不給時用元件的 fieldLabels 或 key） */
  label?: string
  from?: unknown
  to?: unknown
}

export interface AuditEntry {
  id: string
  /** 時間（epoch ms、ISO 字串或 Date） */
  at: number | string | Date
  /** 操作者 */
  user: string
  /** 動作：create / update / delete，或自訂字串 */
  action?: string
  /** 對象（例如「配方 R-102」） */
  target?: string
  changes?: AuditChange[]
  /** 備註 / 變更原因 */
  note?: string
}

const timeOf = (e: AuditEntry): number => toTime(e.at) ?? 0

/** 依時間排序（不改原陣列）；同一時間維持原順序 */
export function sortAudit(entries: AuditEntry[], order: 'asc' | 'desc' = 'desc'): AuditEntry[] {
  const dir = order === 'asc' ? 1 : -1
  return entries
    .map((e, i) => ({ e, i, t: timeOf(e) }))
    .sort((a, b) => (a.t - b.t) * dir || a.i - b.i)
    .map((x) => x.e)
}

export interface AuditFilter {
  users?: string[]
  fields?: string[]
  /** 比對操作者、對象、動作、備註、欄位名稱與新舊值 */
  query?: string
  /** 起訖日期（含當天；YYYY-MM-DD、epoch ms 或 Date） */
  from?: string | number | Date | null
  to?: string | number | Date | null
}

const text = (v: unknown): string => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v)
    } catch {
      return String(v)
    }
  }
  return String(v)
}

export function filterAudit(entries: AuditEntry[], filter: AuditFilter, labelOf: (field: string) => string = (f) => f): AuditEntry[] {
  const users = filter.users?.length ? new Set(filter.users) : null
  const fields = filter.fields?.length ? new Set(filter.fields) : null
  const q = (filter.query ?? '').trim().toLowerCase()
  const fromKey = localDayKey(filter.from)
  const toKey = localDayKey(filter.to)
  return entries.filter((e) => {
    if (users && !users.has(e.user)) return false
    if (fields && !(e.changes ?? []).some((c) => fields.has(c.field))) return false
    if (fromKey !== null || toKey !== null) {
      const k = localDayKey(e.at)
      if (k === null) return false
      if (fromKey !== null && k < fromKey) return false
      if (toKey !== null && k > toKey) return false
    }
    if (!q) return true
    const hay = [e.user, e.target, e.action, e.note, ...(e.changes ?? []).flatMap((c) => [c.field, c.label, labelOf(c.field), text(c.from), text(c.to)])]
    return hay.some((v) => typeof v === 'string' && v.toLowerCase().includes(q))
  })
}

export interface AuditDay {
  /** yyyymmdd（當地日期） */
  key: number
  /** YYYY-MM-DD */
  date: string
  entries: AuditEntry[]
}

/** 依當地日期分組（保持傳入順序） */
export function groupAuditByDay(entries: AuditEntry[]): AuditDay[] {
  const out: AuditDay[] = []
  for (const e of entries) {
    const key = localDayKey(e.at) ?? 0
    let day = out[out.length - 1]
    if (!day || day.key !== key) {
      const s = String(key).padStart(8, '0')
      day = { key, date: `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`, entries: [] }
      out.push(day)
    }
    day.entries.push(e)
  }
  return out
}

/** 出現過的操作者與欄位（依第一次出現的順序） */
export function auditUsers(entries: AuditEntry[]): string[] {
  return [...new Set(entries.map((e) => e.user))]
}
export function auditFields(entries: AuditEntry[]): { field: string; label?: string }[] {
  const seen = new Map<string, string | undefined>()
  for (const e of entries) for (const c of e.changes ?? []) if (!seen.has(c.field) || (!seen.get(c.field) && c.label)) seen.set(c.field, c.label)
  return [...seen].map(([field, label]) => ({ field, label }))
}

/**
 * 某一筆紀錄「之後」的完整欄位值。
 * 先用每個欄位最早一筆變更的 from 當初始值，再依時間順序套用 to，直到 uptoId（含）。
 * uptoId 為 null 時回傳初始狀態（任何變更之前）。
 */
export function auditSnapshot(entries: AuditEntry[], uptoId: string | null): Record<string, unknown> {
  const ordered = sortAudit(entries, 'asc')
  const snap: Record<string, unknown> = {}
  for (const e of ordered) for (const c of e.changes ?? []) if (!(c.field in snap)) snap[c.field] = c.from
  if (uptoId === null) return snap
  for (const e of ordered) {
    for (const c of e.changes ?? []) snap[c.field] = c.to
    if (e.id === uptoId) break
  }
  return snap
}

export interface AuditDiffRow {
  field: string
  a: unknown
  b: unknown
  changed: boolean
}

/** 兩個快照逐欄位比較（欄位順序依 fields；不給時依 a、b 出現的順序） */
export function compareSnapshots(a: Record<string, unknown>, b: Record<string, unknown>, fields?: string[]): AuditDiffRow[] {
  const keys = fields ?? [...new Set([...Object.keys(a), ...Object.keys(b)])]
  return keys.map((field) => ({ field, a: a[field], b: b[field], changed: !sameValue(a[field], b[field]) }))
}

export function sameValue(x: unknown, y: unknown): boolean {
  if (Object.is(x, y)) return true
  if (x instanceof Date && y instanceof Date) return x.getTime() === y.getTime()
  if (typeof x === 'object' && typeof y === 'object' && x !== null && y !== null) return text(x) === text(y)
  return false
}
