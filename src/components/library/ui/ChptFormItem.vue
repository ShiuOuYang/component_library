<template>
  <div
    ref="root"
    class="chpt-form-item min-w-0"
    :class="isLeft ? 'sm:grid sm:items-start sm:gap-x-4 flex flex-col gap-1' : 'flex flex-col gap-1'"
    :style="isLeft ? { '--chpt-label-width': labelWidth } : undefined"
    :role="isGroup ? 'group' : undefined"
    :aria-labelledby="isGroup && props.label ? labelId : undefined"
    @focusout="onFocusOut"
  >
    <component
      :is="isGroup ? 'span' : 'label'"
      v-if="props.label || $slots.label"
      :id="labelId"
      :for="isGroup ? undefined : controlId"
      class="text-sm text-content-secondary"
      :class="isLeft ? 'sm:pt-1.5 sm:text-right' : ''"
    >
      <slot name="label">{{ props.label }}</slot>
      <span v-if="isRequired" class="ml-0.5 text-danger" aria-hidden="true">*</span>
    </component>

    <div class="min-w-0 flex flex-col gap-1" :class="isLeft && !props.label && !$slots.label ? 'sm:col-start-2' : ''">
      <div ref="control" class="min-w-0">
        <slot :error="error" :invalid="!!error"></slot>
      </div>
      <p v-if="error && props.showMessage" :id="errorId" role="alert" class="text-xs text-danger">{{ error }}</p>
      <p v-else-if="props.hint" :id="hintId" class="text-xs text-content-tertiary">{{ props.hint }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, provide, ref, useId, useTemplateRef, watch } from 'vue'
import { FORM_ITEM_KEY } from '@/components/library/shared/formContext'
import {
  getByPath,
  setByPath,
  toRuleList,
  validateValue,
  type FormRule,
} from '@/components/library/shared/formValidation'
import { FORM_KEY, type FormItemHandle } from './chptFormKeys'

/**
 * ChptFormItem（CHPT 主題） - 表單欄位
 *
 * 一個欄位 = 標籤 + 輸入元件 + 錯誤訊息（或說明文字）。放在 ChptForm 裡面，用 prop 指定欄位。
 *
 * 裡面放 ChptInput / ChptSelect / ChptTextarea / ChptInputNumber 時會自動連線：
 * 點標籤會聚焦輸入框、錯誤時輸入框變紅並帶 aria-invalid / aria-describedby。
 * 放原生的 <input> / <select> / <textarea> 也可以（只有一個時自動補上 id 與 aria 屬性）。
 * 放多個控制項（單選群組、日期區間）時，整個欄位以 role="group" 並由標籤命名。
 *
 * 驗證時機：
 *   - 離開欄位（focusout）時檢查
 *   - 值改變時只檢查 trigger: 'change' 的規則；但已經顯示錯誤時會完整重新檢查，
 *     讓使用者一改對錯誤就消失，而不是要再離開一次欄位
 */

interface ChptFormItemProps {
  /** 欄位路徑（對應 ChptForm 的 model 與 rules，可用 a.b.c） */
  prop?: string
  /** 標籤 */
  label?: string
  /** 必填；不設定時由規則裡有沒有 required 決定 */
  required?: boolean
  /** 額外規則（與 ChptForm 的 rules[prop] 合併） */
  rules?: FormRule | FormRule[]
  /** 說明文字（沒有錯誤時顯示在下方） */
  hint?: string
  /** 標籤寬度（標籤在左側時；預設跟 ChptForm） */
  labelWidth?: string
  /** 是否顯示錯誤訊息文字 */
  showMessage?: boolean
}

const props = withDefaults(defineProps<ChptFormItemProps>(), {
  prop: undefined,
  label: '',
  required: undefined,
  rules: undefined,
  hint: '',
  labelWidth: '',
  showMessage: true,
})

const form = inject(FORM_KEY, null)

const root = useTemplateRef<HTMLElement>('root')
const control = useTemplateRef<HTMLElement>('control')

const uid = useId()
const controlId = `${uid}-control`
const labelId = `${uid}-label`
const errorId = `${uid}-error`
const hintId = `${uid}-hint`

const error = ref('')
/** 有沒有輸入元件認領了 controlId（或原生控制項被補上 id）；沒有時整欄當成 group */
const claimed = ref(false)
const isGroup = ref(false)

const isLeft = computed(() => form?.labelPosition() === 'left')
const labelWidth = computed(() => props.labelWidth || form?.labelWidth() || '8rem')

const ruleList = computed<FormRule[]>(() => {
  const fromForm = props.prop && form ? toRuleList(form.rules()[props.prop]) : []
  const list = [...fromForm, ...toRuleList(props.rules)]
  if (props.required && !list.some((r) => r.required)) list.unshift({ required: true })
  return list
})

const isRequired = computed(() => props.required ?? ruleList.value.some((r) => r.required))

const describedBy = computed(() => (error.value && props.showMessage ? errorId : props.hint ? hintId : undefined))

provide(FORM_ITEM_KEY, {
  controlId,
  describedBy,
  error,
  required: isRequired,
  claim: () => {
    if (claimed.value) return false
    claimed.value = true
    return true
  },
})

// ---------------------------------------------------------------------------
// 驗證
// ---------------------------------------------------------------------------

const value = computed(() => (props.prop && form ? getByPath(form.model(), props.prop) : undefined))

/** async 驗證只採用最後一次呼叫的結果（先打的請求晚回來時不能蓋掉新的結果） */
let token = 0

async function run(trigger?: 'change'): Promise<string> {
  if (!props.prop || !form) return ''
  const mine = ++token
  const message = await validateValue(ruleList.value, value.value, form.model(), {
    label: props.label || undefined,
    trigger,
  })
  if (mine === token) error.value = message
  return message
}

/** reset 還原值時不要觸發驗證（否則剛清掉的錯誤又冒出來） */
let skipNextChange = false

/** 值改變：已有錯誤時完整重驗（改對了就消失）；否則只跑 trigger: 'change' 的規則 */
watch(value, () => {
  if (skipNextChange) {
    skipNextChange = false
    return
  }
  if (error.value) run()
  else if (ruleList.value.some((r) => r.trigger === 'change')) run('change')
}, { deep: true })

function onFocusOut(event: FocusEvent): void {
  // 焦點仍在這個欄位裡（例如從起日跳到迄日）不算離開
  const next = event.relatedTarget as Node | null
  if (next && root.value?.contains(next)) return
  // 等輸入元件在自己的 blur 裡把值送出去（ChptInputNumber 在 blur 時才提交）
  nextTick(() => run())
}

// ---------------------------------------------------------------------------
// 原生控制項的後援：沒有 Chpt 元件認領時，替唯一的原生輸入框補上 id 與 aria
// ---------------------------------------------------------------------------

/** 可以被 <label for> 指到的原生元素（button 也是：ChptSwitch 這類開關用它） */
const NATIVE = 'input:not([type="hidden"]), select, textarea, button'

function nativeControl(): HTMLElement | null {
  const found = control.value?.querySelectorAll<HTMLElement>(NATIVE) ?? []
  return found.length === 1 ? found[0] : null
}

function syncNativeAria(): void {
  if (claimed.value) return
  const el = nativeControl()
  if (!el || el.id !== controlId) return
  if (error.value) el.setAttribute('aria-invalid', 'true')
  else el.removeAttribute('aria-invalid')
  if (describedBy.value) el.setAttribute('aria-describedby', describedBy.value)
  else el.removeAttribute('aria-describedby')
  if (isRequired.value) el.setAttribute('aria-required', 'true')
  else el.removeAttribute('aria-required')
}

watch([error, describedBy, isRequired], () => nextTick(syncNativeAria))

// ---------------------------------------------------------------------------
// 註冊到 ChptForm
// ---------------------------------------------------------------------------

let initialValue: unknown

function clone<T>(v: T): T {
  if (v === null || typeof v !== 'object') return v
  try {
    return structuredClone(v)
  } catch {
    return JSON.parse(JSON.stringify(v))
  }
}

function focusControl(): void {
  const el =
    (root.value?.querySelector<HTMLElement>(`#${CSS.escape(controlId)}`) ?? null) ||
    control.value?.querySelector<HTMLElement>('input:not([type="hidden"]):not([disabled]), select, textarea, button, [tabindex="0"]') ||
    null
  if (!el) return
  el.focus()
  el.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
}

const handle: FormItemHandle = {
  prop: () => props.prop,
  validate: () => run(),
  reset: () => {
    if (props.prop && form) {
      const before = value.value
      setByPath(form.model(), props.prop, clone(initialValue))
      // 值真的有變才會觸發 watch；沒變時不能留著旗標，否則會吃掉下一次真正的修改
      skipNextChange = before !== value.value
    }
    token++
    error.value = ''
  },
  clear: () => {
    token++
    error.value = ''
  },
  focus: focusControl,
  el: () => root.value,
}

onMounted(() => {
  initialValue = clone(value.value)
  if (!claimed.value) {
    const el = nativeControl()
    if (el && !el.id) {
      el.id = controlId
      syncNativeAria()
    } else if (!el) {
      // 沒有單一輸入框（單選群組、多個輸入框）：以 group 呈現，標籤改成群組名稱
      isGroup.value = !!control.value?.querySelector(NATIVE)
    }
  }
  form?.register(handle)
})

onBeforeUnmount(() => form?.unregister(handle))

defineExpose({ validate: () => run(), clearValidate: handle.clear, resetField: handle.reset })
</script>

<style scoped>
@media (min-width: 640px) {
  .chpt-form-item.sm\:grid {
    grid-template-columns: var(--chpt-label-width) minmax(0, 1fr);
  }
}
</style>
