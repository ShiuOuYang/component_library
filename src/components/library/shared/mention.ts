/**
 * 提及輸入（ChptMentionInput）的文字處理。
 *
 * 值（v-model）是帶標記的字串：一般文字 + `@[顯示名稱](id)`（觸發字元可以是 @、# 等）。
 * 輸入框裡看到的是「純文字」：標記換成 `@顯示名稱`。
 * 使用者在純文字上編輯，這裡把編輯換算回標記字串：
 * - 刪除碰到提及時，整個提及一起刪掉（不會留下半個名字）
 * - 在提及中間打字時，這個提及變回一般文字（保留文字，只是不再是提及）
 */

export interface MentionOption {
  id: string
  label: string
  /** 次要說明（部門、工單狀態…） */
  description?: string
  [key: string]: unknown
}

export interface Mention {
  trigger: string
  id: string
  label: string
  /** 在純文字中的範圍（含觸發字元） */
  start: number
  end: number
  /** 在標記字串中的範圍 */
  mStart: number
  mEnd: number
}

export interface ParsedMentions {
  plain: string
  mentions: Mention[]
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** 標記裡的 ] ) \ 要跳脫 */
const escapePart = (s: string) => s.replace(/[\\\])]/g, (c) => `\\${c}`)
const unescapePart = (s: string) => s.replace(/\\(.)/g, '$1')

export function mentionMarkup(trigger: string, label: string, id: string): string {
  return `${trigger}[${escapePart(label)}](${escapePart(id)})`
}

function markupRegex(triggers: readonly string[]): RegExp | null {
  if (!triggers.length) return null
  const t = triggers.map(escapeRe).join('|')
  return new RegExp(`(${t})\\[((?:\\\\.|[^\\]\\\\])*)\\]\\(((?:\\\\.|[^)\\\\])*)\\)`, 'g')
}

/** 標記字串 → 純文字與提及清單 */
export function parseMentions(value: string, triggers: readonly string[]): ParsedMentions {
  const re = markupRegex(triggers)
  if (!re) return { plain: value, mentions: [] }
  let plain = ''
  let last = 0
  const mentions: Mention[] = []
  for (let m = re.exec(value); m; m = re.exec(value)) {
    plain += value.slice(last, m.index)
    const label = unescapePart(m[2])
    const start = plain.length
    plain += m[1] + label
    mentions.push({ trigger: m[1], id: unescapePart(m[3]), label, start, end: plain.length, mStart: m.index, mEnd: m.index + m[0].length })
    last = m.index + m[0].length
  }
  plain += value.slice(last)
  return { plain, mentions }
}

/** 純文字的位置 → 標記字串的位置（位置不在提及裡面時） */
function plainToMarkup(pos: number, mentions: readonly Mention[]): number {
  let shift = 0
  for (const m of mentions) {
    if (m.end <= pos) shift += m.mEnd - m.mStart - (m.end - m.start)
    else break
  }
  return pos + shift
}

/** 把指定的提及換成一般文字 */
function dissolve(value: string, which: readonly Mention[]): string {
  let out = value
  for (const m of [...which].sort((a, b) => b.mStart - a.mStart)) out = out.slice(0, m.mStart) + m.trigger + m.label + out.slice(m.mEnd)
  return out
}

/**
 * 使用者在純文字上改成 nextPlain：換算成新的標記字串。
 * 依「共同前綴 / 後綴」找出改動的範圍。
 */
export function applyPlainEdit(value: string, nextPlain: string, triggers: readonly string[]): string {
  let parsed = parseMentions(value, triggers)
  const prev = parsed.plain
  if (prev === nextPlain) return value
  let p = 0
  const maxP = Math.min(prev.length, nextPlain.length)
  while (p < maxP && prev[p] === nextPlain[p]) p++
  let s = 0
  const maxS = Math.min(prev.length, nextPlain.length) - p
  while (s < maxS && prev[prev.length - 1 - s] === nextPlain[nextPlain.length - 1 - s]) s++
  let start = p
  let end = prev.length - s
  const inserted = nextPlain.slice(p, nextPlain.length - s)

  const touched = parsed.mentions.filter((m) => (start < end ? m.start < end && m.end > start : m.start < start && start < m.end))
  if (touched.length) {
    if (!inserted) {
      // 純刪除：整個提及一起刪
      start = Math.min(start, ...touched.map((m) => m.start))
      end = Math.max(end, ...touched.map((m) => m.end))
    } else {
      // 在提及裡打字 / 取代：提及變回一般文字，再套用改動
      value = dissolve(value, touched)
      parsed = parseMentions(value, triggers)
    }
  }
  const ms = plainToMarkup(start, parsed.mentions)
  const me = plainToMarkup(end, parsed.mentions)
  return value.slice(0, ms) + inserted + value.slice(me)
}

export interface MentionQuery {
  trigger: string
  query: string
  /** 觸發字元在純文字中的位置 */
  start: number
}

/**
 * 游標前是不是正在輸入提及：觸發字元在開頭或空白 / 標點之後，之後到游標之間沒有換行，
 * （allowSpaces 為 false 時也沒有空白），長度不超過 maxLength，而且不在既有的提及裡。
 */
export function findMentionQuery(
  plain: string,
  caret: number,
  triggers: readonly string[],
  mentions: readonly Mention[] = [],
  o: { allowSpaces?: boolean; maxLength?: number } = {}
): MentionQuery | null {
  const maxLength = o.maxLength ?? 30
  if (mentions.some((m) => caret > m.start && caret <= m.end)) return null
  for (let i = caret - 1; i >= 0 && caret - i <= maxLength + 1; i--) {
    const ch = plain[i]
    if (ch === '\n') return null
    if (!o.allowSpaces && /\s/.test(ch)) return null
    if (triggers.includes(ch)) {
      const before = plain[i - 1]
      // 前面要是開頭、空白或標點（含全形「『（，。、；：！？）
      if (i > 0 && !/[\s([{'",.;:!?\u300c\u300e\uff08\uff0c\u3002\u3001\uff1b\uff1a\uff01\uff1f]/.test(before)) continue
      if (mentions.some((m) => i >= m.start && i < m.end)) return null
      return { trigger: ch, query: plain.slice(i + 1, caret), start: i }
    }
  }
  return null
}

/**
 * 把純文字 [start, caret) 這段（觸發字元 + 查詢字）換成提及；後面補一個空白。
 * 回傳新的標記字串與新游標位置（純文字）。
 */
export function insertMention(value: string, start: number, caret: number, trigger: string, option: MentionOption, triggers: readonly string[]): { value: string; caret: number } {
  const parsed = parseMentions(value, triggers)
  const ms = plainToMarkup(start, parsed.mentions)
  const me = plainToMarkup(caret, parsed.mentions)
  const after = value.slice(me)
  const space = after.startsWith(' ') ? '' : ' '
  const next = value.slice(0, ms) + mentionMarkup(trigger, option.label, option.id) + space + after
  return { value: next, caret: start + trigger.length + option.label.length + 1 }
}

/** 依名稱 / id / 說明過濾（不分大小寫），名稱開頭符合的排前面 */
export function filterMentionOptions(options: readonly MentionOption[], query: string, limit = 8): MentionOption[] {
  const q = query.trim().toLowerCase()
  if (!q) return options.slice(0, limit)
  const scored = options
    .map((o) => {
      const label = o.label.toLowerCase()
      const score = label.startsWith(q) ? 0 : label.includes(q) ? 1 : o.id.toLowerCase().includes(q) || (o.description ?? '').toLowerCase().includes(q) ? 2 : -1
      return { o, score }
    })
    .filter((x) => x.score >= 0)
  scored.sort((a, b) => a.score - b.score)
  return scored.slice(0, limit).map((x) => x.o)
}

/** 提及的增減（以 trigger + id 比對，同一個人提到兩次算兩個） */
export function diffMentions(before: readonly Mention[], after: readonly Mention[]): { added: Mention[]; removed: Mention[] } {
  const key = (m: Mention) => `${m.trigger}\u0000${m.id}`
  const minus = (a: readonly Mention[], b: readonly Mention[]) => {
    const left = new Map<string, number>()
    for (const m of b) left.set(key(m), (left.get(key(m)) ?? 0) + 1)
    return a.filter((m) => {
      const n = left.get(key(m)) ?? 0
      if (n > 0) {
        left.set(key(m), n - 1)
        return false
      }
      return true
    })
  }
  return { added: minus(after, before), removed: minus(before, after) }
}
