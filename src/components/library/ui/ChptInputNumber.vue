<template>
  <div class="flex flex-col gap-1" :class="props.fullWidth ? 'w-full' : ''">
    <label v-if="props.label" :for="id" class="text-sm text-content-secondary whitespace-nowrap">
      {{ props.label }}
    </label>

    <div
      class="inline-flex items-stretch border rounded-md shadow-sm transition-colors overflow-hidden focus-within:ring-1"
      :class="[
        sizeClass.height,
        props.fullWidth ? 'w-full' : 'w-40',
        invalid
          ? 'border-danger focus-within:border-danger focus-within:ring-danger'
          : 'border-stroke-default focus-within:border-stroke-focus focus-within:ring-stroke-focus',
        props.disabled ? 'bg-surface-tertiary' : 'bg-surface-primary',
      ]"
    >
      <button
        v-if="props.controls"
        type="button"
        tabindex="-1"
        aria-label="減少"
        class="inline-flex items-center justify-center flex-shrink-0 border-r border-stroke-light text-content-secondary transition-colors hover:bg-surface-tertiary hover:text-content-primary disabled:cursor-not-allowed disabled:text-content-disabled disabled:hover:bg-transparent"
        :class="sizeClass.button"
        :disabled="!canDecrease"
        @mousedown.prevent
        @click="stepBy(-1)"
      >
        −
      </button>

      <input
        :id="id"
        ref="inputRef"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        role="spinbutton"
        :value="displayText"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :aria-valuenow="props.modelValue ?? undefined"
        :aria-valuemin="Number.isFinite(props.min) ? props.min : undefined"
        :aria-valuemax="Number.isFinite(props.max) ? props.max : undefined"
        :aria-invalid="invalid ? 'true' : undefined"
        :aria-describedby="describedBy"
        :aria-required="required || undefined"
        class="min-w-0 flex-1 bg-transparent text-center tabular-nums text-content-primary outline-none placeholder:text-content-disabled disabled:cursor-not-allowed disabled:text-content-disabled"
        :class="sizeClass.text"
        @focus="onFocus"
        @blur="onBlur"
        @input="onInput"
        @keydown="onKeydown"
      />

      <span
        v-if="props.unit"
        class="inline-flex items-center pr-2 text-content-tertiary select-none"
        :class="sizeClass.text"
      >{{ props.unit }}</span>

      <button
        v-if="props.controls"
        type="button"
        tabindex="-1"
        aria-label="增加"
        class="inline-flex items-center justify-center flex-shrink-0 border-l border-stroke-light text-content-secondary transition-colors hover:bg-surface-tertiary hover:text-content-primary disabled:cursor-not-allowed disabled:text-content-disabled disabled:hover:bg-transparent"
        :class="sizeClass.button"
        :disabled="!canIncrease"
        @mousedown.prevent
        @click="stepBy(1)"
      >
        +
      </button>
    </div>

    <p v-if="props.errorText" :id="errorId" role="alert" class="text-xs text-danger">
      {{ props.errorText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFormField } from '@/components/library/shared/formContext'
import type { ComponentSize } from '@/components/library/shared/types/ui.types'

/**
 * ChptInputNumber（CHPT 主題） - 數字輸入框
 *
 * 用途：數量、門檻值、百分比這類「只能是數字、有上下限」的欄位。
 * 用一般的 ChptInput type="number" 會遇到的問題這裡都處理了：
 *   - 打字途中不夾限：要輸入 15 而 min=10 時，打出第一個「1」不會被改成 10
 *     （離開欄位或按 Enter 才驗證、夾到範圍內）
 *   - 小數步進沒有浮點誤差：0.1 + 0.2 顯示 0.3，不是 0.30000000000000004
 *   - 鍵盤：↑↓ 加減一步、PageUp / PageDown 十步、Home / End 跳到上下限
 *   - 打錯字（「abc」）時還原成原本的值，而不是變成 NaN
 *   - 螢幕閱讀器：role="spinbutton" 並帶目前值與上下限
 */

interface ChptInputNumberProps {
  /** v-model 值；空白時為 null */
  modelValue?: number | null
  /** 最小值 */
  min?: number
  /** 最大值 */
  max?: number
  /** 每一步的增減量 */
  step?: number
  /** 小數位數（固定顯示幾位）；不設定時依輸入與 step 自動決定 */
  precision?: number
  /** 標籤 */
  label?: string
  /** 佔位符 */
  placeholder?: string
  /** 單位（顯示在數字右側，例如 %、pcs） */
  unit?: string
  /** 尺寸（高度與按鈕、輸入框同一套 control token） */
  size?: ComponentSize
  /** 是否顯示 − / + 按鈕 */
  controls?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 是否唯讀 */
  readonly?: boolean
  /** 是否全寬 */
  fullWidth?: boolean
  /** 錯誤訊息 */
  errorText?: string
}

const props = withDefaults(defineProps<ChptInputNumberProps>(), {
  modelValue: null,
  min: -Infinity,
  max: Infinity,
  step: 1,
  precision: undefined,
  label: '',
  placeholder: '',
  unit: '',
  size: 'sm',
  controls: true,
  disabled: false,
  readonly: false,
  fullWidth: false,
  errorText: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void
  /** 值確定改變時（離開欄位、按 Enter、按按鈕或方向鍵）；帶新值與舊值 */
  (e: 'change', value: number | null, oldValue: number | null): void
  (e: 'blur', event: FocusEvent): void
  (e: 'focus', event: FocusEvent): void
}>()

/**
 * id 與錯誤狀態：放在 ChptFormItem 裡時用 FormItem 給的 id（它的 <label for> 才指得到），
 * 驗證失敗時自動變紅框並以 aria-describedby 指向 FormItem 的錯誤訊息。
 */
const { id, errorId, invalid, describedBy, required } = useFormField(() => props.errorText)
const inputRef = ref<HTMLInputElement | null>(null)

/** 編輯中的文字；null 表示沒在編輯（顯示格式化後的值） */
const editingText = ref<string | null>(null)

const sizeClass = computed(() => {
  const map: Record<ComponentSize, { height: string; text: string; button: string }> = {
    xs: { height: 'h-control-xs', text: 'text-xs', button: 'min-w-control-xs text-sm' },
    sm: { height: 'h-control-sm', text: 'text-sm', button: 'min-w-control-sm text-base' },
    md: { height: 'h-control-md', text: 'text-base', button: 'min-w-control-md text-lg' },
    lg: { height: 'h-control-lg', text: 'text-lg', button: 'min-w-control-lg text-xl' },
    xl: { height: 'h-control-xl', text: 'text-xl', button: 'min-w-control-xl text-2xl' },
  }
  return map[props.size] ?? map.sm
})

/** 小數位數：a 與 b 取較多者（0.1 + 0.02 要保留兩位） */
function decimals(n: number): number {
  if (!Number.isFinite(n)) return 0
  const s = String(n)
  if (s.includes('e-')) return Number(s.split('e-')[1])
  return s.includes('.') ? s.split('.')[1].length : 0
}

/** 四捨五入到指定位數（遠離零，並避開 1.005 這種二進位誤差） */
function roundTo(n: number, digits: number): number {
  const f = 10 ** digits
  return (Math.sign(n) * Math.round(Number((Math.abs(n) * f).toPrecision(15)))) / f
}

/** 夾到範圍內並依精度四捨五入 */
function normalize(n: number): number {
  const clamped = Math.min(props.max, Math.max(props.min, n))
  const digits = props.precision ?? Math.max(decimals(clamped), decimals(props.step))
  return roundTo(clamped, digits)
}

function format(n: number | null): string {
  if (n === null || n === undefined || Number.isNaN(n)) return ''
  return props.precision !== undefined ? n.toFixed(props.precision) : String(n)
}

const displayText = computed(() => editingText.value ?? format(props.modelValue))

const canDecrease = computed(
  () => !props.disabled && !props.readonly && (props.modelValue === null || props.modelValue > props.min)
)
const canIncrease = computed(
  () => !props.disabled && !props.readonly && (props.modelValue === null || props.modelValue < props.max)
)

/** 把值送出去（有變才送） */
function commitValue(next: number | null): void {
  const prev = props.modelValue ?? null
  if (next !== prev) {
    emit('update:modelValue', next)
    emit('change', next, prev)
  }
}

/** 解析文字：接受千分位逗號與前後空白；空白是 null；不是數字回傳 undefined */
function parse(text: string): number | null | undefined {
  const t = text.replace(/,/g, '').trim()
  if (t === '') return null
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(t)) return undefined
  return Number(t)
}

/** 提交編輯中的文字 */
function commitText(): void {
  if (editingText.value === null) return
  const parsed = parse(editingText.value)
  editingText.value = null
  // 打錯字：還原成原本的值（displayText 回到格式化的 modelValue）
  if (parsed === undefined) return
  commitValue(parsed === null ? null : normalize(parsed))
}

/** 增減 n 步（以目前輸入框裡的值為準，打到一半按 ↑ 也對） */
function stepBy(n: number): void {
  if (props.disabled || props.readonly) return
  const typed = editingText.value !== null ? parse(editingText.value) : undefined
  const base = typeof typed === 'number' ? typed : props.modelValue
  let next: number
  if (base === null || base === undefined) {
    // 沒有值時從 0（或最接近 0 的界限）開始
    next = normalize(0)
  } else {
    const digits = props.precision ?? Math.max(decimals(base), decimals(props.step))
    next = normalize(roundTo(base + n * props.step, digits))
  }
  editingText.value = null
  commitValue(next)
}

function onInput(event: Event): void {
  editingText.value = (event.target as HTMLInputElement).value
}

function onFocus(event: FocusEvent): void {
  emit('focus', event)
}

function onBlur(event: FocusEvent): void {
  commitText()
  emit('blur', event)
}

function onKeydown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault()
      stepBy(1)
      break
    case 'ArrowDown':
      event.preventDefault()
      stepBy(-1)
      break
    case 'PageUp':
      event.preventDefault()
      stepBy(10)
      break
    case 'PageDown':
      event.preventDefault()
      stepBy(-10)
      break
    case 'Home':
      if (Number.isFinite(props.min)) {
        event.preventDefault()
        editingText.value = null
        commitValue(normalize(props.min))
      }
      break
    case 'End':
      if (Number.isFinite(props.max)) {
        event.preventDefault()
        editingText.value = null
        commitValue(normalize(props.max))
      }
      break
    case 'Enter':
      commitText()
      break
    case 'Escape':
      // 放棄編輯中的文字
      if (editingText.value !== null) {
        event.preventDefault()
        editingText.value = null
      }
      break
  }
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
})
</script>
