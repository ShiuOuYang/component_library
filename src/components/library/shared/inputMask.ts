/**
 * 格式化輸入（ChptMaskedInput）的格式解析與套用：序號、MAC、IP、電話、日期碼……
 *
 * 格式字串：
 * - `#` 數字、`A` 英文字母、`X` 英數字、`H` 十六進位、`*` 任意非空白字元（可用 tokens 自訂 / 覆寫）
 * - 字元後面加 `?` 表示可省略（例如 IP 的 `##?#?`：1～3 位數）
 * - `\` 跳脫：`\#` 是固定的 `#`
 * - 其他字元都是固定字元（分隔符號），使用者不用自己打，打了也會被接受
 *
 * 固定字元是「延遲」加上的：要等到它後面的字元被填入才出現（刪除時不會卡在分隔符號上）。
 */

export interface MaskTokenDef {
  /** 單一字元要符合的規則 */
  pattern: RegExp
  /** 填入前轉換（大寫 / 小寫 / 自訂） */
  transform?: 'upper' | 'lower' | ((c: string) => string)
  /** 拒絕時的說明種類（語系用）：digit / letter / alnum / hex / any，或自訂文字 */
  kind?: string
}

export const DEFAULT_MASK_TOKENS: Readonly<Record<string, MaskTokenDef>> = Object.freeze({
  '#': { pattern: /\d/, kind: 'digit' },
  A: { pattern: /[A-Za-z]/, kind: 'letter' },
  X: { pattern: /[0-9A-Za-z]/, kind: 'alnum' },
  H: { pattern: /[0-9A-Fa-f]/, kind: 'hex' },
  '*': { pattern: /\S/, kind: 'any' },
})

/** 常用格式 */
export const MASK_PRESETS = Object.freeze({
  /** IPv4：每段 1～3 位數（數值範圍用 validIPv4 檢查） */
  ipv4: '##?#?.##?#?.##?#?.##?#?',
  /** MAC 位址（搭配 uppercase） */
  mac: 'HH:HH:HH:HH:HH:HH',
  date: '####-##-##',
  time: '##:##',
  /** 台灣手機 */
  twMobile: '09##-###-###',
  /** 台灣身分證字號（搭配 uppercase） */
  twId: 'A#########',
})

export type MaskItem =
  | { type: 'slot'; token: string; def: MaskTokenDef; optional: boolean }
  | { type: 'literal'; char: string }

export function parseMask(mask: string, tokens: Readonly<Record<string, MaskTokenDef>> = DEFAULT_MASK_TOKENS): MaskItem[] {
  const items: MaskItem[] = []
  for (let i = 0; i < mask.length; i++) {
    const c = mask[i]
    if (c === '\\' && i + 1 < mask.length) {
      items.push({ type: 'literal', char: mask[++i] })
      continue
    }
    const def = tokens[c]
    if (def) {
      const optional = mask[i + 1] === '?'
      if (optional) i++
      items.push({ type: 'slot', token: c, def, optional })
    } else items.push({ type: 'literal', char: c })
  }
  return items
}

export interface MaskResult {
  /** 格式化後的字串 */
  value: string
  /** 只有使用者填入的字元（不含固定字元） */
  raw: string
  /** value 每個字元是不是填入的字元（false = 固定字元），游標換算用 */
  slots: boolean[]
  /** 必填的位置都填了 */
  complete: boolean
  /** 第一個還沒輸出的格式項目（提示底線從這裡開始） */
  next: number
  /** 被拒絕的字元（不是分隔符號、也不是空白） */
  rejected: { char: string; kind?: string }[]
}

export interface ApplyMaskOptions {
  /** 輸入只有填入字元（v-model 是 raw 時），不會拿來比對固定字元 */
  fromRaw?: boolean
  /** 英文字母一律轉大寫 */
  uppercase?: boolean
}

const sameChar = (a: string, b: string) => a === b || a.toLowerCase() === b.toLowerCase()

function transformChar(c: string, def: MaskTokenDef, uppercase: boolean): string {
  const t = def.transform
  let out = t === 'upper' ? c.toUpperCase() : t === 'lower' ? c.toLowerCase() : typeof t === 'function' ? t(c) : c
  if (uppercase) out = out.toUpperCase()
  return out
}

const testChar = (def: MaskTokenDef, c: string) => {
  def.pattern.lastIndex = 0
  return def.pattern.test(c)
}

/** 把輸入（使用者打的、貼上的、或編輯後的整串）套上格式 */
export function applyMask(input: string, items: readonly MaskItem[], o: ApplyMaskOptions = {}): MaskResult {
  const literals = new Set(items.filter((it) => it.type === 'literal').map((it) => (it as { char: string }).char.toLowerCase()))
  let value = ''
  let raw = ''
  const slots: boolean[] = []
  const rejected: MaskResult['rejected'] = []
  let pending = ''
  let mi = 0
  let ii = 0
  let next = 0
  const flush = () => {
    for (const c of pending) {
      value += c
      slots.push(false)
    }
    pending = ''
  }
  while (ii < input.length && mi < items.length) {
    const item = items[mi]
    const ch = input[ii]
    if (item.type === 'literal') {
      if (!o.fromRaw && sameChar(ch, item.char)) {
        // 使用者自己打了分隔符號：立刻輸出
        pending += item.char
        flush()
        ii++
        mi++
        next = mi
      } else {
        pending += item.char
        mi++
      }
      continue
    }
    if (testChar(item.def, ch)) {
      flush()
      const c = transformChar(ch, item.def, !!o.uppercase)
      value += c
      raw += c
      slots.push(true)
      ii++
      mi++
      next = mi
      continue
    }
    if (item.optional) {
      // 可省略的位置：這個字元能給後面用（下一個固定字元或下一個位置）才跳過，否則丟掉這個字元
      let k = mi
      while (k < items.length && items[k].type === 'slot' && (items[k] as { optional: boolean }).optional) k++
      const after = items[k]
      const usable = after && (after.type === 'literal' ? !o.fromRaw && sameChar(ch, after.char) : testChar(after.def, ch))
      if (usable) {
        mi = k
        continue
      }
    }
    ii++
    if (ch.trim() && !literals.has(ch.toLowerCase())) rejected.push({ char: ch, kind: item.def.kind })
  }
  // 所有必填位置都填了；結尾剩下的固定字元（例如 %）直接補上
  const rest = items.slice(next)
  const complete = rest.every((it) => it.type === 'literal' || it.optional)
  if (complete && raw && rest.length && rest.every((it) => it.type === 'literal')) {
    pending = rest.map((it) => (it as { char: string }).char).join('')
    flush()
    next = items.length
  }
  return { value, raw, slots, complete: complete && !!raw, next, rejected }
}

/** 多個格式（例如市話 / 手機）：選能放進最多字元的那個；一樣多時選已完成的，再一樣選前面的 */
export function pickMask(input: string, masks: readonly (readonly MaskItem[])[], o: ApplyMaskOptions = {}): { index: number; result: MaskResult } {
  let best = { index: 0, result: applyMask(input, masks[0] ?? [], o) }
  for (let i = 1; i < masks.length; i++) {
    const r = applyMask(input, masks[i], o)
    const b = best.result
    if (r.raw.length > b.raw.length || (r.raw.length === b.raw.length && r.complete && !b.complete)) best = { index: i, result: r }
  }
  return best
}

/** 位置 pos 之前有幾個填入的字元 */
export function rawIndexAt(slots: readonly boolean[], pos: number): number {
  let n = 0
  for (let i = 0; i < Math.min(pos, slots.length); i++) if (slots[i]) n++
  return n
}

/** 第 n 個填入字元之後的位置（n = 0：第一個填入位置之前） */
export function caretForRaw(slots: readonly boolean[], n: number): number {
  if (n <= 0) {
    const first = slots.indexOf(true)
    return first < 0 ? slots.length : first
  }
  let count = 0
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] && ++count === n) return i + 1
  }
  return slots.length
}

/**
 * 刪除（Backspace / Delete）：游標沒選取時跳過分隔符號、刪掉最近的填入字元。
 * 回傳刪除後的字串（再交給 applyMask）與刪除後游標前應有的填入字元數；沒東西可刪時回傳 null。
 */
export function deleteRange(value: string, slots: readonly boolean[], start: number, end: number, dir: 'back' | 'forward'): { text: string; caretRaw: number } | null {
  if (start !== end) return { text: value.slice(0, start) + value.slice(end), caretRaw: rawIndexAt(slots, start) }
  let i = -1
  if (dir === 'back') {
    for (let k = Math.min(start, slots.length) - 1; k >= 0; k--) {
      if (slots[k]) {
        i = k
        break
      }
    }
  } else {
    for (let k = start; k < slots.length; k++) {
      if (slots[k]) {
        i = k
        break
      }
    }
  }
  if (i < 0) return null
  return { text: value.slice(0, i) + value.slice(i + 1), caretRaw: rawIndexAt(slots, i) }
}

/** 提示用的樣板：填入位置換成 placeholderChar */
export function maskTemplate(items: readonly MaskItem[], placeholderChar = '_'): string {
  return items.map((it) => (it.type === 'literal' ? it.char : placeholderChar)).join('')
}

/** 填入位置是不是都只收數字（手機跳數字鍵盤） */
export function isNumericMask(items: readonly MaskItem[]): boolean {
  const slots = items.filter((it): it is Extract<MaskItem, { type: 'slot' }> => it.type === 'slot')
  return slots.length > 0 && slots.every((s) => ['1', '5', '9'].every((d) => testChar(s.def, d)) && !testChar(s.def, 'a'))
}

/** 一次完成：字串格式（或多個格式）套到值上 */
export function formatMask(
  value: string,
  mask: string | readonly string[],
  o: ApplyMaskOptions & { tokens?: Readonly<Record<string, MaskTokenDef>> } = {}
): MaskResult & { maskIndex: number } {
  const tokens = { ...DEFAULT_MASK_TOKENS, ...o.tokens }
  const masks = (typeof mask === 'string' ? [mask] : mask).map((m) => parseMask(m, tokens))
  const { index, result } = pickMask(value, masks, o)
  return { ...result, maskIndex: index }
}

/** IPv4 每段 0～255、沒有多餘的前導 0 */
export function validIPv4(s: string): boolean {
  const parts = s.split('.')
  return parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255 && (p === '0' || !p.startsWith('0')))
}
