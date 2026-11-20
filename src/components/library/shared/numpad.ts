/**
 * 數字鍵盤（ChptNumpad）的輸入緩衝：按鍵 → 文字
 *
 * 用文字而不是數字存正在輸入的值：打到「12.」或「-」時還不是一個完整的數字，
 * 存成 number 會把小數點、負號吃掉。確定（confirm）時才轉成數字並檢查範圍。
 */

/** 數字鍵盤上的按鍵 */
export type NumpadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'negate' | 'backspace' | 'clear'

export interface NumpadBufferOptions {
  /** 最多幾位小數；0 = 只能整數（小數點鍵無效） */
  precision?: number
  /** 可以輸入負數（負號鍵有效） */
  allowNegative?: boolean
  /** 最多幾位數字（不含負號與小數點）；預設 15（再多 JS number 就不精確了） */
  maxDigits?: number
}

/** 這個按鍵是不是數字 0–9 */
export const isDigitKey = (key: string): key is Exclude<NumpadKey, '.' | 'negate' | 'backspace' | 'clear'> => /^[0-9]$/.test(key)

/**
 * 在目前的文字上按一個鍵，回傳新的文字；按了沒有作用（超過位數、重複小數點…）時回傳原文字。
 *   - 開頭的 0 會被取代：「0」按 5 →「5」；「-0」按 5 →「-5」
 *   - 空白時按小數點 →「0.」
 *   - 負號鍵切換開頭的「-」（空白時也可以先按負號）
 */
export function applyNumpadKey(text: string, key: NumpadKey, options: NumpadBufferOptions = {}): string {
  const precision = options.precision ?? Infinity
  const maxDigits = options.maxDigits ?? 15
  const negative = text.startsWith('-')
  const body = negative ? text.slice(1) : text
  const sign = negative ? '-' : ''

  switch (key) {
    case 'clear':
      return ''
    case 'backspace':
      return text.slice(0, -1)
    case 'negate':
      if (!options.allowNegative) return text
      return negative ? body : `-${body}`
    case '.':
      if (precision <= 0 || body.includes('.')) return text
      return `${sign}${body === '' ? '0' : body}.`
    default: {
      if (!isDigitKey(key)) return text
      const dot = body.indexOf('.')
      if (dot >= 0 && body.length - dot - 1 >= precision) return text
      if (body.replace('.', '').length >= maxDigits && body !== '0') return text
      // 開頭只有一個 0 時，再按數字是取代而不是變成「05」
      return body === '0' ? `${sign}${key}` : `${sign}${body}${key}`
    }
  }
}

/** 文字 → 數字；空白、只有負號或小數點時為 null。「12.」為 12，「-0」為 0 */
export function parseNumpad(text: string): number | null {
  if (!/\d/.test(text)) return null
  const n = Number(text.endsWith('.') ? text.slice(0, -1) : text)
  if (!Number.isFinite(n)) return null
  return Object.is(n, -0) ? 0 : n
}

/** 數字 → 開始編輯時的文字（不補零：5 → 「5」，即使 precision 是 2） */
export function numpadText(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  // 避開 1e-7 這種科學記號
  const s = String(value)
  return /e/i.test(s) ? value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 }) : s
}

/** 範圍檢查：小於 min 為 'below'、大於 max 為 'above'，在範圍內為 null */
export function numpadRangeError(value: number, min = -Infinity, max = Infinity): 'below' | 'above' | null {
  if (value < min) return 'below'
  if (value > max) return 'above'
  return null
}

/**
 * 實體鍵盤的 key → 數字鍵盤的按鍵（沒有對應時為 null）。
 * 逗號也當小數點（有些語系的數字鍵盤小數點鍵送出的是逗號）。
 */
export function numpadKeyFromKeyboard(key: string): NumpadKey | null {
  if (isDigitKey(key)) return key
  switch (key) {
    case '.':
    case ',':
    case 'Decimal':
      return '.'
    case '-':
    case 'Subtract':
      return 'negate'
    case 'Backspace':
      return 'backspace'
    case 'Delete':
      return 'clear'
    default:
      return null
  }
}
