/**
 * 指令面板的搜尋與快捷鍵：純函式，不碰 DOM
 */

export interface CommandMatch {
  /** 分數越高越前面；0 表示不符合 */
  score: number
  /** 標籤裡符合的字元位置（給畫面標出來） */
  indices: number[]
}

const lower = (s: string) => s.toLocaleLowerCase()

/** 字是否在「詞的開頭」：字串開頭，或前一個字是空白 / 符號 / 中英交界 */
function isWordStart(text: string, i: number): boolean {
  if (i === 0) return true
  const prev = text[i - 1]
  const cur = text[i]
  if (/[\s\-_/.:()[\]·、，]/.test(prev)) return true
  // camelCase：小寫接大寫
  if (/[a-z]/.test(prev) && /[A-Z]/.test(cur)) return true
  // 中英交界（例如「SPC管制圖」的「管」）
  const ascii = (c: string) => /[A-Za-z0-9]/.test(c)
  return ascii(prev) !== ascii(cur)
}

/**
 * 模糊比對：查詢的每個字依序出現在文字裡即算符合（子序列）。
 * 分數：整段相符 > 開頭相符 > 從詞首開始的連續相符 > 縮寫（每個字都在詞首）> 詞中間的連續相符 > 分散的子序列；
 * 越短的文字分數越高。
 */
export function fuzzyMatch(query: string, text: string): CommandMatch {
  const q = lower(query.trim())
  if (!q) return { score: 1, indices: [] }
  const t = lower(text)
  if (!t) return { score: 0, indices: [] }

  // 連續子字串：直接取最好的位置
  const at = t.indexOf(q)
  if (at >= 0) {
    const indices = Array.from({ length: q.length }, (_, k) => at + k)
    let score = 100
    if (t === q) score = 1000
    else if (at === 0) score = 500
    else if (isWordStart(text, at)) score = 300
    return { score: score - Math.min(50, t.length - q.length) * 0.5, indices }
  }

  // 子序列：貪婪地找，優先跳到詞首
  const indices: number[] = []
  let ti = 0
  let score = 0
  let prev = -2
  let allWordStarts = true
  for (const ch of q) {
    if (ch === ' ') continue
    let found = -1
    // 先找下一個詞首的這個字，找不到再找任何位置
    for (let j = ti; j < t.length; j++) {
      if (t[j] === ch && isWordStart(text, j)) {
        found = j
        break
      }
    }
    if (found < 0) found = t.indexOf(ch, ti)
    if (found < 0) return { score: 0, indices: [] }
    const start = isWordStart(text, found)
    if (!start) allWordStarts = false
    score += found === prev + 1 ? 8 : start ? 6 : 1
    indices.push(found)
    prev = found
    ti = found + 1
  }
  // 每個字都落在詞首（縮寫，例如 dm → dark mode）：排在詞中間的連續子字串（admin）之前
  if (allWordStarts) score += 200
  return { score: score - Math.min(50, t.length - q.length) * 0.2, indices }
}

export interface SearchableCommand {
  label: string
  keywords?: string[]
  group?: string
  description?: string
}

/**
 * 一個指令的分數：標籤最重要，其次是關鍵字、群組與說明。
 * 查詢以空白分成多個詞時，每個詞都要在某個欄位找到（AND）。
 */
export function scoreCommand(query: string, cmd: SearchableCommand): CommandMatch {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return { score: 1, indices: [] }
  let total = 0
  const labelIndices = new Set<number>()
  for (const term of terms) {
    const inLabel = fuzzyMatch(term, cmd.label)
    let best = inLabel.score
    if (inLabel.score > 0) inLabel.indices.forEach((i) => labelIndices.add(i))
    for (const k of cmd.keywords ?? []) best = Math.max(best, fuzzyMatch(term, k).score * 0.8)
    if (cmd.group) best = Math.max(best, fuzzyMatch(term, cmd.group).score * 0.4)
    if (cmd.description) best = Math.max(best, fuzzyMatch(term, cmd.description).score * 0.3)
    if (best <= 0) return { score: 0, indices: [] }
    total += best
  }
  return { score: total, indices: [...labelIndices].sort((a, b) => a - b) }
}

/** 把文字依符合的位置切段，給畫面加粗 */
export function highlightParts(text: string, indices: number[]): Array<{ text: string; match: boolean }> {
  if (!indices.length) return [{ text, match: false }]
  const set = new Set(indices)
  const out: Array<{ text: string; match: boolean }> = []
  for (let i = 0; i < text.length; i++) {
    const match = set.has(i)
    const last = out[out.length - 1]
    if (last && last.match === match) last.text += text[i]
    else out.push({ text: text[i], match })
  }
  return out
}

// === 快捷鍵 ===

export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '')

interface ParsedHotkey {
  mod: boolean
  ctrl: boolean
  meta: boolean
  alt: boolean
  shift: boolean
  key: string
}

/** 'mod+k'、'ctrl+shift+p'、'alt+/' → 結構；mod 是 Mac 的 ⌘、其他平台的 Ctrl */
export function parseHotkey(hotkey: string): ParsedHotkey {
  const parts = hotkey.toLowerCase().split('+').map((p) => p.trim())
  const key = parts.pop() ?? ''
  const has = (k: string) => parts.includes(k)
  return { mod: has('mod'), ctrl: has('ctrl'), meta: has('meta') || has('cmd'), alt: has('alt') || has('option'), shift: has('shift'), key }
}

/** 鍵盤事件是否符合快捷鍵 */
export function matchHotkey(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>, hotkey: string, mac = isMac()): boolean {
  const h = parseHotkey(hotkey)
  const wantCtrl = h.ctrl || (h.mod && !mac)
  const wantMeta = h.meta || (h.mod && mac)
  return (
    (e.key ?? '').toLowerCase() === h.key &&
    e.ctrlKey === wantCtrl &&
    e.metaKey === wantMeta &&
    e.altKey === h.alt &&
    e.shiftKey === h.shift
  )
}

/** 顯示用：Mac 用符號（⌘K），其他平台用文字（Ctrl+K） */
export function formatHotkey(hotkey: string, mac = isMac()): string[] {
  const h = parseHotkey(hotkey)
  const keys: string[] = []
  if (h.ctrl) keys.push(mac ? '⌃' : 'Ctrl')
  if (h.mod) keys.push(mac ? '⌘' : 'Ctrl')
  if (h.meta && !h.mod) keys.push(mac ? '⌘' : 'Win')
  if (h.alt) keys.push(mac ? '⌥' : 'Alt')
  if (h.shift) keys.push(mac ? '⇧' : 'Shift')
  const named: Record<string, string> = { enter: '↵', escape: 'Esc', arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→', ' ': 'Space', space: 'Space' }
  keys.push(named[h.key] ?? (h.key.length === 1 ? h.key.toUpperCase() : h.key[0].toUpperCase() + h.key.slice(1)))
  return keys
}
