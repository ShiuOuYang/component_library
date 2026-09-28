import type { InjectionKey } from 'vue'
import type { FormRules } from '@/components/library/shared/formValidation'

/** ChptForm 提供給 ChptFormItem 的 context */
export interface FormContext {
  model: () => Record<string, unknown>
  rules: () => FormRules
  labelPosition: () => 'top' | 'left'
  labelWidth: () => string
  register: (item: FormItemHandle) => void
  unregister: (item: FormItemHandle) => void
}

/** ChptFormItem 註冊到 ChptForm 的操作介面 */
export interface FormItemHandle {
  prop: () => string | undefined
  /** 驗證並顯示結果；回傳錯誤訊息（通過為空字串） */
  validate: () => Promise<string>
  /** 還原成掛載時的值並清除錯誤 */
  reset: () => void
  /** 清除錯誤訊息 */
  clear: () => void
  /** 聚焦到這個欄位的輸入元件並捲到可見 */
  focus: () => void
  el: () => HTMLElement | null
}

export const FORM_KEY: InjectionKey<FormContext> = Symbol('chpt-form')
