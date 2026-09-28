import { computed, inject, useId, type ComputedRef, type InjectionKey, type Ref } from 'vue'

/**
 * ChptForm / ChptFormItem 與輸入元件之間的連線
 *
 * ChptFormItem 提供一個 context，裡面的第一個輸入元件（ChptInput / ChptSelect /
 * ChptTextarea / ChptInputNumber）「認領」它之後：
 *   - 用 FormItem 給的 id → FormItem 的 <label for> 點下去會聚焦到這個輸入框
 *   - 驗證失敗時自己變紅框，並以 aria-invalid / aria-describedby 指向錯誤訊息
 *   - 必填欄位帶 aria-required
 *
 * 沒有這層的話，表單的錯誤訊息只是畫在旁邊的一段紅字：螢幕閱讀器不知道它屬於哪個欄位，
 * 輸入框本身也不會變紅。
 */

export interface FormItemContext {
  /** 給被認領的輸入元件用的 id（<label for> 指向它） */
  controlId: string
  /**
   * FormItem 標籤的 id（沒有標籤時為 undefined）。
   * <label for> 只能命名原生控制項；星等（radiogroup）這類以 div 組成的控制項
   * 要用 aria-labelledby 指向它才有名稱。
   */
  labelId?: Ref<string | undefined>
  /** 給輸入元件的 aria-describedby（錯誤訊息與說明文字的 id） */
  describedBy: Ref<string | undefined>
  /** 目前的錯誤訊息（空字串表示沒有錯誤） */
  error: Ref<string>
  /** 是否必填 */
  required: Ref<boolean>
  /** 第一個呼叫的輸入元件得到 true，之後的都是 false（同一個 id 不能給兩個元素） */
  claim: () => boolean
}

export const FORM_ITEM_KEY: InjectionKey<FormItemContext> = Symbol('chpt-form-item')

export interface FormField {
  id: string
  errorId: string
  invalid: ComputedRef<boolean>
  describedBy: ComputedRef<string | undefined>
  required: ComputedRef<boolean>
  /** 所在 FormItem 標籤的 id（只有認領到時才有） */
  labelledBy: ComputedRef<string | undefined>
}

/**
 * 輸入元件用：取得 id 與錯誤狀態。
 * 元件自己的 errorText 優先；沒有時才用所在 ChptFormItem 的驗證結果。
 */
export function useFormField(ownError: () => string | undefined): FormField {
  const item = inject(FORM_ITEM_KEY, null)
  const ownId = useId()
  const claimed = item ? item.claim() : false
  const id = claimed ? item!.controlId : ownId
  const errorId = `${ownId}-error`

  const itemError = () => (claimed ? item!.error.value : '')

  return {
    id,
    errorId,
    invalid: computed(() => !!ownError() || !!itemError()),
    describedBy: computed(() => (ownError() ? errorId : claimed ? item!.describedBy.value : undefined)),
    required: computed(() => claimed && item!.required.value),
    labelledBy: computed(() => (claimed ? item!.labelId?.value : undefined)),
  }
}
