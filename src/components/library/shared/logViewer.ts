/**
 * 設備日誌（ChptLogViewer）的解析、搜尋與輸出
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'
export const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal']

export interface LogEntry {
  id?: string | number
  /** 時間（ISO 字串、毫秒或 Date） */
  time: string | number | Date
  level: LogLevel
  message: string
  /** 來源（機台、模組、執行緒） */
  source?: string
}

const LEVEL_ALIASES: Record<string, LogLevel> = {
  TRACE: 'debug',
  DEBUG: 'debug',
  DBG: 'debug',
  INFO: 'info',
  INF: 'info',
  NOTICE: 'info',
  WARN: 'warn',
  WARNING: 'warn',
  WRN: 'warn',
  ERROR: 'error',
  ERR: 'error',
  FATAL: 'fatal',
  CRIT: 'fatal',
  CRITICAL: 'fatal',
}

/**
 * 解析一行文字日誌。認得常見格式：
 *   2026-11-21 08:30:01.123 [WARN] (SMT-02) 吸嘴真空低
 *   2026-11-21T08:30:01Z ERROR SMT-02: 卡料
 * 認不出等級時當作 info；認不出時間時 time 為 null（呼叫端可用收到的時間代替）。
 */
export function parseLogLine(line: string): { time: string | null; level: LogLevel; source?: string; message: string } {
  let rest = line.trim()
  let time: string | null = null
  const tm = /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s*/.exec(rest)
  if (tm) {
    time = tm[1].replace(',', '.')
    rest = rest.slice(tm[0].length)
  }
  let level: LogLevel = 'info'
  const lv = /^[[(<]?([A-Za-z]{3,8})[\])>]?[:\s]\s*/.exec(rest)
  if (lv && LEVEL_ALIASES[lv[1].toUpperCase()]) {
    level = LEVEL_ALIASES[lv[1].toUpperCase()]
    rest = rest.slice(lv[0].length)
  }
  let source: string | undefined
  const src = /^(?:\(([^)]+)\)|\[([^\]]+)\]|([\w.-]+):)\s*/.exec(rest)
  if (src) {
    source = src[1] ?? src[2] ?? src[3]
    rest = rest.slice(src[0].length)
  }
  return { time, level, source, message: rest }
}

export interface LogMatcher {
  /** 這段文字符不符合（沒有搜尋條件時永遠符合） */
  test: (text: string) => boolean
  /** 文字拆成「符合 / 不符合」片段，用來標示關鍵字 */
  segments: (text: string) => Array<{ text: string; match: boolean }>
  /** /.../ 寫法的正規式有錯時的訊息 */
  error: string | null
  active: boolean
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * 搜尋條件：一般文字（不分大小寫）；寫成 /pattern/flags 時當正規式。
 * 正規式寫錯時 error 有訊息，並退回當一般文字搜尋 —— 不要打到一半整個清單變空。
 */
export function compileSearch(query: string): LogMatcher {
  const q = query.trim()
  if (!q) return { test: () => true, segments: (text) => [{ text, match: false }], error: null, active: false }
  let re: RegExp
  let error: string | null = null
  const m = /^\/(.+)\/([a-z]*)$/.exec(q)
  try {
    re = m ? new RegExp(m[1], m[2].includes('i') ? 'gi' : 'g') : new RegExp(escapeRe(q), 'gi')
  } catch (e) {
    error = (e as Error).message
    // 退回一般文字搜尋：用斜線裡面的文字（使用者要找的是那段字，不是斜線）
    re = new RegExp(escapeRe(m ? m[1] : q), 'gi')
  }
  const test = (text: string) => {
    re.lastIndex = 0
    return re.test(text)
  }
  const segments = (text: string) => {
    const out: Array<{ text: string; match: boolean }> = []
    let last = 0
    re.lastIndex = 0
    for (const hit of text.matchAll(re)) {
      if (!hit[0]) continue // 空字串的符合（例如 /a*/）不標示
      if (hit.index! > last) out.push({ text: text.slice(last, hit.index), match: false })
      out.push({ text: hit[0], match: true })
      last = hit.index! + hit[0].length
    }
    if (last < text.length) out.push({ text: text.slice(last), match: false })
    return out.length ? out : [{ text, match: false }]
  }
  return { test, segments, error, active: true }
}

/** 依等級與搜尋篩選（搜尋比對訊息與來源） */
export function filterLogs(entries: LogEntry[], levels: LogLevel[] | null, matcher: LogMatcher): LogEntry[] {
  const set = levels ? new Set(levels) : null
  return entries.filter((e) => (!set || set.has(e.level)) && (!matcher.active || matcher.test(e.message) || (e.source ? matcher.test(e.source) : false)))
}

export function countLevels(entries: LogEntry[]): Record<LogLevel, number> {
  const out: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 }
  for (const e of entries) out[e.level]++
  return out
}

export const toDate = (t: LogEntry['time']): Date => (t instanceof Date ? t : new Date(t))

/** 時間 → HH:mm:ss.SSS（本地時間）；無效時間為空字串 */
export function formatLogTime(t: LogEntry['time']): string {
  const d = toDate(t)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
}

/** 一筆 → 一行文字（複製、下載用）：ISO 時間 [LEVEL] (source) message */
export function formatLogLine(e: LogEntry): string {
  const d = toDate(e.time)
  const time = Number.isNaN(d.getTime()) ? String(e.time) : d.toISOString()
  return `${time} [${e.level.toUpperCase()}]${e.source ? ` (${e.source})` : ''} ${e.message}`
}
