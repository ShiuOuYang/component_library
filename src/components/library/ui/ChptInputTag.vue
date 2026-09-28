<template>
  <div class="flex flex-col gap-1" :class="props.fullWidth ? 'w-full' : ''">
    <label v-if="props.label" :for="id" class="text-sm text-content-secondary whitespace-nowrap">
      {{ props.label }}
    </label>

    <!-- 點外框任何地方都聚焦到輸入框（與原生輸入框的點擊範圍一致） -->
    <div
      class="flex flex-wrap items-center gap-1 rounded-md border px-1.5 py-1 shadow-sm transition-colors focus-within:ring-1"
      :class="[
        props.fullWidth ? 'w-full' : 'w-80 max-w-full',
        minHeightClass,
        invalid
          ? 'border-danger focus-within:border-danger focus-within:ring-danger'
          : 'border-stroke-default focus-within:border-stroke-focus focus-within:ring-stroke-focus',
        props.disabled ? 'cursor-not-allowed bg-surface-tertiary' : 'cursor-text bg-surface-primary',
      ]"
      @click="focusInput"
    >
      <ul v-if="props.modelValue.length" role="list" class="contents" :aria-label="`${props.label || '標籤'}（${props.modelValue.length} 個）`">
        <li
          v-for="(tag, index) in props.modelValue"
          :key="tag"
          class="inline-flex max-w-full items-center gap-1 rounded bg-accent-subtle px-1.5 py-0.5 text-xs text-accent-on-subtle"
          :class="{ 'ring-2 ring-stroke-focus': pendingRemove === index }"
        >
          <span class="truncate" :title="tag">{{ tag }}</span>
          <button
            v-if="!props.disabled && !props.readonly"
            type="button"
            class="relative inline-flex h-4 w-4 items-center justify-center rounded before:absolute before:-inset-1 before:content-[''] hover:bg-accent-subtle-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
            :aria-label="`移除 ${tag}`"
            @click.stop="removeAt(index)"
          >
            <span class="material-symbols-outlined text-[14px] leading-none" aria-hidden="true">close</span>
          </button>
        </li>
      </ul>

      <input
        :id="id"
        ref="inputRef"
        v-model="draft"
        type="text"
        class="min-w-[6rem] flex-1 bg-transparent px-1 text-content-primary outline-none placeholder:text-content-disabled disabled:cursor-not-allowed"
        :class="textSizeClass"
        :placeholder="props.modelValue.length ? '' : props.placeholder"
        :disabled="props.disabled"
        :readonly="props.readonly || atMax"
        :aria-invalid="invalid ? 'true' : undefined"
        :aria-describedby="[describedBy, hintId].filter(Boolean).join(' ') || undefined"
        :aria-required="required || undefined"
        @keydown="onKeydown"
        @paste="onPaste"
        @blur="onBlur"
      />
    </div>

    <p :id="hintId" class="text-xs text-content-tertiary" :class="{ 'sr-only': !showHint }">
      {{ hintText }}
    </p>
    <!-- 新增 / 移除 / 被擋下的原因：禮貌報讀 -->
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    <p v-if="props.errorText" :id="errorId" role="alert" class="text-xs text-danger">
      {{ props.errorText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue'
import { useFormField } from '@/components/library/shared/formContext'
import { resolveSize, useConfig } from '@/components/library/shared/config'
import type { ComponentSize } from '@/components/library/shared/types/ui.types'

/**
 * ChptInputTag —— 輸入多個值成為標籤（序號、Email、關鍵字）
 *
 * - Enter 或分隔字元（預設逗號、分號、換行）加入；失焦時把打到一半的也加入（addOnBlur）
 * - 貼上「A001, A002; A003」一次拆成多個
 * - 輸入框空白時 Backspace：第一次標記最後一個、第二次才刪（避免連按刪過頭）
 * - 重複值、超過 max、validate 不通過時不加入，並以 aria-live 說明原因
 */
interface ChptInputTagProps {
  modelValue?: string[]
  label?: string
  placeholder?: string
  /** 最多幾個 */
  max?: number
  /** 分隔字元：輸入或貼上時遇到就切開 */
  separators?: string[]
  /** 允許重複 */
  allowDuplicates?: boolean
  /** 自訂檢查：回傳錯誤訊息字串表示拒絕 */
  validate?: (value: string) => string | true | undefined
  /** 失焦時把打到一半的文字也加入 */
  addOnBlur?: boolean
  disabled?: boolean
  readonly?: boolean
  size?: ComponentSize
  fullWidth?: boolean
  errorText?: string
}

const props = withDefaults(defineProps<ChptInputTagProps>(), {
  modelValue: () => [],
  label: '',
  placeholder: '輸入後按 Enter',
  max: undefined,
  separators: () => [',', '，', ';', '；', '\n'],
  allowDuplicates: false,
  validate: undefined,
  addOnBlur: true,
  disabled: false,
  readonly: false,
  size: undefined,
  fullWidth: false,
  errorText: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  add: [value: string]
  remove: [value: string]
  reject: [value: string, reason: string]
}>()

const config = useConfig()
const size = computed(() => resolveSize(props.size, config, 'sm'))
const { id, errorId, invalid, describedBy, required } = useFormField(() => props.errorText)
const hintId = `${useId()}-hint`

const inputRef = ref<HTMLInputElement | null>(null)
const draft = ref('')
const announcement = ref('')
/** Backspace 第一次按下時標記的標籤 */
const pendingRemove = ref<number | null>(null)

const atMax = computed(() => props.max !== undefined && props.modelValue.length >= props.max)
const showHint = computed(() => props.max !== undefined)
const hintText = computed(() =>
  props.max !== undefined ? `${props.modelValue.length} / ${props.max}` : '按 Enter 或逗號加入，Backspace 刪除最後一個'
)

const textSizeClass = computed(() => ({ xs: 'text-xs', sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl' })[size.value])
const minHeightClass = computed(() => ({ xs: 'min-h-control-xs', sm: 'min-h-control-sm', md: 'min-h-control-md', lg: 'min-h-control-lg', xl: 'min-h-control-lg' })[size.value])

function focusInput() {
  inputRef.value?.focus()
}

function splitBySeparators(text: string): string[] {
  let parts = [text]
  for (const sep of props.separators) parts = parts.flatMap((p) => p.split(sep))
  return parts.map((p) => p.trim()).filter(Boolean)
}

/** 依序嘗試加入；回傳實際加入的值 */
function addValues(values: string[]): string[] {
  const next = [...props.modelValue]
  const added: string[] = []
  const rejected: string[] = []
  for (const value of values) {
    let reason = ''
    if (props.max !== undefined && next.length >= props.max) reason = `最多 ${props.max} 個`
    else if (!props.allowDuplicates && next.includes(value)) reason = '已經有了'
    else {
      const result = props.validate?.(value)
      if (typeof result === 'string') reason = result
    }
    if (reason) {
      rejected.push(`${value}：${reason}`)
      emit('reject', value, reason)
      continue
    }
    next.push(value)
    added.push(value)
    emit('add', value)
  }
  if (added.length) emit('update:modelValue', next)
  announcement.value = [
    added.length ? `已加入 ${added.join('、')}` : '',
    rejected.length ? `未加入 ${rejected.join('；')}` : '',
  ].filter(Boolean).join('。')
  return added
}

function commitDraft() {
  const values = splitBySeparators(draft.value)
  if (!values.length) {
    draft.value = ''
    return
  }
  addValues(values)
  draft.value = ''
}

function removeAt(index: number) {
  const value = props.modelValue[index]
  if (value === undefined) return
  const next = props.modelValue.filter((_, i) => i !== index)
  pendingRemove.value = null
  emit('update:modelValue', next)
  emit('remove', value)
  announcement.value = `已移除 ${value}`
  nextTick(focusInput)
}

function onKeydown(event: KeyboardEvent) {
  if (event.isComposing) return // 中文輸入法選字時的 Enter 不是送出
  if (event.key === 'Enter' || props.separators.includes(event.key)) {
    if (draft.value.trim()) {
      event.preventDefault()
      commitDraft()
    } else if (event.key !== 'Enter') {
      event.preventDefault() // 空白時打逗號不留下逗號
    }
    return
  }
  if (event.key === 'Backspace' && draft.value === '' && props.modelValue.length) {
    const last = props.modelValue.length - 1
    if (pendingRemove.value === last) {
      removeAt(last)
    } else {
      pendingRemove.value = last
      announcement.value = `再按一次 Backspace 移除 ${props.modelValue[last]}`
    }
    return
  }
  if (event.key === 'Escape') {
    pendingRemove.value = null
    return
  }
  pendingRemove.value = null
}

function onPaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData('text') ?? ''
  if (!props.separators.some((sep) => text.includes(sep))) return // 單一值：交給瀏覽器照常貼上
  event.preventDefault()
  addValues(splitBySeparators(draft.value + text))
  draft.value = ''
}

function onBlur() {
  pendingRemove.value = null
  if (props.addOnBlur && draft.value.trim()) commitDraft()
}

defineExpose({ focus: focusInput })
</script>
