<template>
  <form ref="formEl" novalidate :aria-busy="submitting || undefined" @submit.prevent="onSubmit" @reset.prevent="resetFields()">
    <!-- fieldset disabled：一次停用裡面所有原生輸入框與按鈕（瀏覽器原生行為，不必每個元件各自處理） -->
    <fieldset :disabled="props.disabled || undefined" class="m-0 min-w-0 border-0 p-0 flex flex-col" :class="gapClass">
      <slot :validate="validate" :reset-fields="resetFields" :submitting="submitting"></slot>
    </fieldset>
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, provide, ref, useTemplateRef } from 'vue'
import { FORM_KEY, type FormContext, type FormItemHandle } from './chptFormKeys'
import type { FormRules } from '@/components/library/shared/formValidation'

/**
 * ChptForm（CHPT 主題） - 表單
 *
 * 搭配 ChptFormItem 使用：Form 管資料與規則，FormItem 管單一欄位的標籤、錯誤訊息與驗證時機。
 *
 * 做了哪些手刻表單常漏掉的事：
 *   - 送出時驗證全部欄位，失敗就把焦點移到「畫面上第一個」錯誤欄位並捲到可見
 *     （只顯示紅字而焦點留在送出鈕，鍵盤與螢幕閱讀器使用者不知道哪裡錯了）
 *   - 錯誤訊息以 aria-describedby 連到輸入框、輸入框帶 aria-invalid / aria-required
 *   - 離開欄位時驗證；已經顯示錯誤的欄位在修正時即時消掉錯誤
 *   - async 驗證（例如查帳號是否重複）只採用最後一次的結果
 *   - novalidate：關掉瀏覽器原生的驗證泡泡，避免同一個錯誤出現兩種樣式
 *   - Enter 送出、<button type="reset"> 還原成初始值
 */

interface ChptFormProps {
  /** 表單資料（reactive 物件）；欄位以 ChptFormItem 的 prop 指定，可用 a.b.c 路徑 */
  model: Record<string, unknown>
  /** 驗證規則，鍵是欄位路徑 */
  rules?: FormRules
  /** 標籤位置 */
  labelPosition?: 'top' | 'left'
  /** 標籤在左側時的寬度 */
  labelWidth?: string
  /** 欄位之間的間距 */
  gap?: 'sm' | 'md' | 'lg'
  /** 停用整個表單 */
  disabled?: boolean
}

const props = withDefaults(defineProps<ChptFormProps>(), {
  rules: () => ({}),
  labelPosition: 'top',
  labelWidth: '8rem',
  gap: 'md',
  disabled: false,
})

const emit = defineEmits<{
  /** 驗證通過後送出（帶表單資料） */
  (e: 'submit', model: Record<string, unknown>): void
  /** 驗證失敗（帶各欄位的錯誤訊息） */
  (e: 'invalid', errors: Record<string, string>): void
}>()

const formEl = useTemplateRef<HTMLFormElement>('formEl')
const items = new Set<FormItemHandle>()
const submitting = ref(false)

const gapClass = computed(() => ({ sm: 'gap-3', md: 'gap-4', lg: 'gap-6' })[props.gap] ?? 'gap-4')

const context: FormContext = {
  model: () => props.model,
  rules: () => props.rules,
  labelPosition: () => props.labelPosition,
  labelWidth: () => props.labelWidth,
  register: (item) => items.add(item),
  unregister: (item) => items.delete(item),
}
provide(FORM_KEY, context)

/** 依畫面順序排列（Set 的順序是掛載順序，v-if 切換後會亂） */
function inDomOrder(list: FormItemHandle[]): FormItemHandle[] {
  return [...list].sort((a, b) => {
    const ea = a.el()
    const eb = b.el()
    if (!ea || !eb) return 0
    return ea.compareDocumentPosition(eb) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  })
}

function targets(fields?: string | string[]): FormItemHandle[] {
  const all = [...items].filter((i) => i.prop())
  if (!fields) return all
  const wanted = new Set(Array.isArray(fields) ? fields : [fields])
  return all.filter((i) => wanted.has(i.prop()!))
}

/**
 * 驗證（不給 fields 就是全部）。
 * 回傳 { valid, errors }；失敗時把焦點移到畫面上第一個錯誤欄位。
 */
async function validate(fields?: string | string[], options: { focus?: boolean } = {}) {
  const list = targets(fields)
  const results = await Promise.all(list.map(async (item) => [item, await item.validate()] as const))
  const errors: Record<string, string> = {}
  for (const [item, message] of results) if (message) errors[item.prop()!] = message
  const valid = Object.keys(errors).length === 0

  if (!valid && options.focus !== false) {
    const firstInvalid = inDomOrder(results.filter(([, m]) => m).map(([i]) => i))[0]
    await nextTick()
    firstInvalid?.focus()
  }
  return { valid, errors }
}

function resetFields(fields?: string | string[]): void {
  for (const item of targets(fields)) item.reset()
}

function clearValidate(fields?: string | string[]): void {
  for (const item of targets(fields)) item.clear()
}

async function onSubmit(): Promise<void> {
  if (submitting.value) return
  submitting.value = true
  try {
    const { valid, errors } = await validate()
    if (valid) emit('submit', props.model)
    else emit('invalid', errors)
  } finally {
    submitting.value = false
  }
}

defineExpose({
  validate,
  validateField: (field: string) => validate(field, { focus: false }),
  resetFields,
  clearValidate,
  /** 以程式送出（等同按下送出鈕） */
  submit: onSubmit,
  el: () => formEl.value,
})
</script>
