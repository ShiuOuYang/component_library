/**
 * 一維條碼編碼（Code 128、Code 39）：純函式，輸出「黑白交替的模組寬度」
 *
 * 輸出的 widths 從第一條黑線開始，黑、白交替；每個數字是幾個模組寬（窄 = 1）。
 * 畫圖時把黑線畫出來、白的跳過即可（ChptBarcode 用 SVG 畫）。
 */

export type BarcodeFormat = 'code128' | 'code39'

export interface BarcodeResult {
  /** 黑白交替的模組寬度（第一個是黑線） */
  widths: number[]
  /** 總模組數（不含左右靜區） */
  modules: number
  /** 實際印在條碼下方的文字（Code 39 加了檢查碼時包含檢查碼） */
  text: string
}

export class BarcodeError extends Error {
  /** 無法編碼的字元（去重後） */
  readonly invalidChars: string[]
  constructor(message: string, invalidChars: string[] = []) {
    super(message)
    this.name = 'BarcodeError'
    this.invalidChars = invalidChars
  }
}

// === Code 128 ===

/**
 * Code 128 的 107 個圖樣（值 0～105，106 是結束碼），每個數字是黑白交替的模組寬度。
 * 0～105 每個 6 段、共 11 模組；結束碼 7 段、共 13 模組。
 */
export const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
]

const START_A = 103
const START_B = 104
const START_C = 105
const CODE_A = 101 // 在 B / C 裡切到 A
const CODE_B = 100 // 在 A / C 裡切到 B
const CODE_C = 99 // 在 A / B 裡切到 C
const STOP = 106

type Code128Set = 'A' | 'B' | 'C'

const isDigit = (c: number) => c >= 48 && c <= 57

/** 從 i 開始連續幾個數字 */
function digitRun(codes: number[], i: number): number {
  let n = 0
  while (i + n < codes.length && isDigit(codes[i + n])) n++
  return n
}

/** 這個字元在 A / B 裡的值；不在該字集時為 -1 */
function valueIn(set: 'A' | 'B', c: number): number {
  if (set === 'A') {
    if (c >= 32 && c <= 95) return c - 32
    if (c >= 0 && c <= 31) return c + 64
    return -1
  }
  return c >= 32 && c <= 127 ? c - 32 : -1
}

/** 接下來要用 A 還是 B：先遇到控制字元（0～31）用 A，先遇到小寫等（96～127）用 B */
function preferAorB(codes: number[], i: number): 'A' | 'B' {
  for (let k = i; k < codes.length; k++) {
    if (codes[k] < 32) return 'A'
    if (codes[k] >= 96) return 'B'
  }
  return 'B'
}

/**
 * Code 128 的符號值序列（含開始碼、檢查碼、結束碼）。
 * 自動切換字集：連續 4 個以上的數字（開頭或結尾 2 個以上）用 C（兩位一組，條碼短很多）。
 */
export function code128Values(text: string): number[] {
  const codes = [...text].map((ch) => ch.codePointAt(0)!)
  const invalid = [...new Set([...text].filter((ch) => ch.codePointAt(0)! > 127))]
  if (invalid.length) throw new BarcodeError('Code 128 can only encode ASCII characters', invalid)
  if (!codes.length) throw new BarcodeError('Empty value')

  const values: number[] = []
  let set: Code128Set
  const leadDigits = digitRun(codes, 0)
  // 開頭：整串都是數字且至少 2 位，或開頭有 4 位以上數字 → C
  if ((leadDigits === codes.length && leadDigits >= 2) || leadDigits >= 4) {
    set = 'C'
    values.push(START_C)
  } else {
    set = preferAorB(codes, 0)
    values.push(set === 'A' ? START_A : START_B)
  }

  let i = 0
  while (i < codes.length) {
    if (set === 'C') {
      if (digitRun(codes, i) >= 2) {
        values.push((codes[i] - 48) * 10 + (codes[i + 1] - 48))
        i += 2
        continue
      }
      set = preferAorB(codes, i)
      values.push(set === 'A' ? CODE_A : CODE_B)
      continue
    }
    // A / B：遇到夠長的數字串就切到 C（奇數個時先用目前的字集編一個數字）
    const run = digitRun(codes, i)
    if (run >= 4) {
      if (run % 2 === 1) {
        values.push(valueIn(set, codes[i]))
        i++
      }
      set = 'C'
      values.push(CODE_C)
      continue
    }
    let v = valueIn(set, codes[i])
    if (v < 0) {
      set = set === 'A' ? 'B' : 'A'
      values.push(set === 'A' ? CODE_A : CODE_B)
      v = valueIn(set, codes[i])
    }
    values.push(v)
    i++
  }

  // 檢查碼：開始碼 + Σ(值 × 位置) mod 103
  const checksum = values.reduce((sum, v, k) => sum + v * (k === 0 ? 1 : k), 0) % 103
  values.push(checksum, STOP)
  return values
}

export function encodeCode128(text: string): BarcodeResult {
  const values = code128Values(text)
  const widths = values.flatMap((v) => [...CODE128_PATTERNS[v]].map(Number))
  // 結束碼後面還有一條 2 模組寬的終止線（已含在 2331112 裡）
  return { widths, modules: widths.reduce((a, b) => a + b, 0), text }
}

// === Code 39 ===

/** Code 39 的字元表：9 段（黑白交替），1 為寬、0 為窄，每個字元 3 段寬 */
export const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000', '4': '000110001',
  '5': '100110000', '6': '001110000', '7': '000100101', '8': '100100100', '9': '001100100',
  A: '100001001', B: '001001001', C: '101001000', D: '000011001', E: '100011000',
  F: '001011000', G: '000001101', H: '100001100', I: '001001100', J: '000011100',
  K: '100000011', L: '001000011', M: '101000010', N: '000010011', O: '100010010',
  P: '001010010', Q: '000000111', R: '100000110', S: '001000110', T: '000010110',
  U: '110000001', V: '011000001', W: '111000000', X: '010010001', Y: '110010000',
  Z: '011010000', '-': '010000101', '.': '110000100', ' ': '011000100', $: '010101000',
  '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100',
}

/** 檢查碼用的字元順序（值 0～42） */
const CODE39_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%'

/** Code 39 的 mod 43 檢查碼 */
export function code39CheckChar(text: string): string {
  const sum = [...text].reduce((s, ch) => s + CODE39_CHARSET.indexOf(ch), 0)
  return CODE39_CHARSET[sum % 43]
}

/**
 * Code 39：只有大寫英數與 - . 空白 $ / + %（小寫自動轉大寫）。
 * 前後加起訖符號 *；寬窄比 3:1；字元之間有一個窄的間隔。
 */
export function encodeCode39(input: string, options: { checkDigit?: boolean; ratio?: number } = {}): BarcodeResult {
  const ratio = options.ratio ?? 3
  const text = input.toUpperCase()
  if (!text.length) throw new BarcodeError('Empty value')
  const invalid = [...new Set([...text].filter((ch) => !CODE39_CHARSET.includes(ch)))]
  if (invalid.length) throw new BarcodeError('Code 39 can only encode A-Z, 0-9, space and - . $ / + %', invalid)
  const printed = options.checkDigit ? text + code39CheckChar(text) : text
  const widths: number[] = []
  const chars = ['*', ...printed, '*']
  chars.forEach((ch, k) => {
    for (const bit of CODE39_PATTERNS[ch]) widths.push(bit === '1' ? ratio : 1)
    if (k < chars.length - 1) widths.push(1) // 字元間隔（白）
  })
  return { widths, modules: widths.reduce((a, b) => a + b, 0), text: printed }
}

export function encodeBarcode(text: string, format: BarcodeFormat, options: { checkDigit?: boolean } = {}): BarcodeResult {
  return format === 'code39' ? encodeCode39(text, options) : encodeCode128(text)
}
