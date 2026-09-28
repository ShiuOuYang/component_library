/**
 * 表單驗證規則（純函式，ChptForm 用，也可以單獨使用）
 *
 * 一個欄位可以有多條規則，依序檢查，回傳第一個錯誤訊息。
 * 沒有填的欄位只檢查 required —— 選填欄位留白不該出現「格式錯誤」。
 */

export interface FormRule {
  /** 必填（空字串、只有空白、null、undefined、空陣列都算沒填） */
  required?: boolean
  /** 內建格式 */
  type?: 'email' | 'url' | 'number' | 'integer'
  /** 字串 / 陣列：最短長度；數字：最小值 */
  min?: number
  /** 字串 / 陣列：最長長度；數字：最大值 */
  max?: number
  /** 正規式 */
  pattern?: RegExp
  /**
   * 自訂驗證：通過回傳 true（或空字串），失敗回傳錯誤訊息。可以是 async（例如查帳號是否重複）。
   * 第二個參數是整份表單資料，用來比對「確認密碼」這類跨欄位規則。
   */
  validator?: (value: unknown, model: Record<string, unknown>) => true | string | Promise<true | string>
  /** 錯誤訊息；不給時用預設訊息 */
  message?: string
  /** 何時檢查：離開欄位（預設）或值一改變就檢查 */
  trigger?: 'blur' | 'change'
}

export type FormRules = Record<string, FormRule | FormRule[]>

export function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  return false
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i

function lengthOf(v: unknown): number | null {
  if (typeof v === 'string' || Array.isArray(v)) return v.length
  return null
}

/** 檢查一條規則；通過回傳 ''，失敗回傳訊息 */
export async function checkRule(
  rule: FormRule,
  value: unknown,
  model: Record<string, unknown>,
  label = '此欄位'
): Promise<string> {
  const fail = (fallback: string) => rule.message || fallback

  const runValidator = async (): Promise<string> => {
    if (!rule.validator) return ''
    const result = await rule.validator(value, model)
    return result === true || result === '' ? '' : result || fail('驗證失敗')
  }

  if (isEmptyValue(value)) {
    if (rule.required) return fail(`請輸入${label}`)
    // 選填欄位留白：格式、長度都不檢查（自訂 validator 仍會執行，由它自己決定空值算不算錯）
    return runValidator()
  }

  if (rule.type) {
    const s = String(value)
    if (rule.type === 'email' && !EMAIL.test(s)) return fail('電子郵件格式不正確')
    if (rule.type === 'url' && !URL_RE.test(s)) return fail('網址格式不正確（需以 http:// 或 https:// 開頭）')
    if (rule.type === 'number' && !(typeof value === 'number' ? Number.isFinite(value) : /^[+-]?(\d+\.?\d*|\.\d+)$/.test(s.trim())))
      return fail('請輸入數字')
    if (rule.type === 'integer' && !(typeof value === 'number' ? Number.isInteger(value) : /^[+-]?\d+$/.test(s.trim())))
      return fail('請輸入整數')
  }

  const len = lengthOf(value)
  if (rule.min !== undefined) {
    if (len !== null && len < rule.min) return fail(Array.isArray(value) ? `至少選擇 ${rule.min} 項` : `至少 ${rule.min} 個字`)
    if (typeof value === 'number' && value < rule.min) return fail(`不能小於 ${rule.min}`)
  }
  if (rule.max !== undefined) {
    if (len !== null && len > rule.max) return fail(Array.isArray(value) ? `最多選擇 ${rule.max} 項` : `最多 ${rule.max} 個字`)
    if (typeof value === 'number' && value > rule.max) return fail(`不能大於 ${rule.max}`)
  }

  if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) return fail('格式不正確')

  return runValidator()
}

/** 依序檢查多條規則，回傳第一個錯誤；trigger 指定時只檢查該時機的規則 */
export async function validateValue(
  rules: FormRule[],
  value: unknown,
  model: Record<string, unknown>,
  options: { label?: string; trigger?: 'blur' | 'change' } = {}
): Promise<string> {
  for (const rule of rules) {
    if (options.trigger && (rule.trigger ?? 'blur') !== options.trigger) continue
    const error = await checkRule(rule, value, model, options.label)
    if (error) return error
  }
  return ''
}

/** 以 "a.b.c" 路徑讀取巢狀欄位 */
export function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string, unknown>)[k]), obj)
}

/** 以 "a.b.c" 路徑寫入巢狀欄位（中間層不存在時不寫） */
export function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.')
  let o: Record<string, unknown> = obj
  for (const k of keys.slice(0, -1)) {
    if (o[k] == null || typeof o[k] !== 'object') return
    o = o[k] as Record<string, unknown>
  }
  o[keys[keys.length - 1]] = value
}

export function toRuleList(rules: FormRule | FormRule[] | undefined): FormRule[] {
  if (!rules) return []
  return Array.isArray(rules) ? rules : [rules]
}
