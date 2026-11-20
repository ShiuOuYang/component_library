<template>
  <div
    ref="root"
    role="group"
    :aria-label="props.label || t.numpad.label"
    :aria-disabled="props.disabled || undefined"
    :tabindex="props.disabled ? -1 : 0"
    class="inline-flex flex-col gap-2 rounded-lg border border-stroke-light bg-surface-primary p-3 outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
    :class="[props.fullWidth ? 'w-full' : sizeClass.width, props.disabled ? 'opacity-60' : '']"
    @keydown="onKeydown"
  >
    <!-- 顯示區 -->
    <div class="rounded-md border bg-surface-secondary px-3 py-2" :class="errorText ? 'border-danger' : 'border-stroke-default'">
      <div v-if="props.label" class="truncate text-xs text-content-secondary">{{ props.label }}</div>
      <div class="flex min-w-0 items-baseline justify-end gap-1">
        <output
          class="min-w-0 truncate text-right font-mono tabular-nums"
          :class="[sizeClass.display, text ? 'text-content-primary' : 'text-content-disabled']"
          aria-live="polite"
        >
          <span :class="fresh && text ? 'rounded bg-accent-subtle px-1 text-accent-on-subtle' : ''">{{ text || props.placeholder || '0' }}</span>
        </output>
        <span v-if="props.unit" class="flex-shrink-0 text-sm text-content-tertiary">{{ props.unit }}</span>
      </div>
      <p v-if="errorText || rangeHint" class="mt-0.5 text-right text-xs" :class="errorText ? 'text-danger' : 'text-content-tertiary'">
        {{ errorText || rangeHint }}
      </p>
    </div>
    <span class="sr-only" role="alert">{{ errorText }}</span>

    <!-- 常用值 -->
    <div v-if="props.quickValues.length" class="flex flex-wrap gap-1.5">
      <button
        v-for="v in props.quickValues"
        :key="v"
        type="button"
        tabindex="-1"
        class="flex-1 rounded-md border border-stroke-default bg-surface-primary px-2 py-1.5 text-sm tabular-nums text-content-primary transition-colors hover:bg-surface-tertiary disabled:cursor-not-allowed"
        :disabled="inert"
        @pointerdown="keepFocus"
        @click="setQuick(v)"
      >
        {{ v }}
      </button>
    </div>

    <!-- 按鍵：4 欄。數字 3×3，右側刪除 / 清除 / 確定，最下排 ± 0 . -->
    <div class="grid grid-cols-4 gap-1.5">
      <button
        v-for="(d, i) in digitRows"
        :key="d"
        type="button"
        tabindex="-1"
        :class="[keyClass, pressed === d ? 'bg-surface-tertiary' : '']"
        :style="{ gridColumn: String((i % 3) + 1), gridRow: String(Math.floor(i / 3) + 1) }"
        :disabled="inert"
        @pointerdown="keepFocus"
        @click="press(d)"
      >
        {{ d }}
      </button>

      <button
        type="button"
        tabindex="-1"
        :class="[keyClass, pressed === 'backspace' ? 'bg-surface-tertiary' : '']"
        :style="{ gridColumn: '4', gridRow: props.showConfirm ? '1' : '1 / span 2' }"
        :aria-label="t.numpad.backspace"
        :disabled="inert"
        @pointerdown="keepFocus"
        @click="press('backspace')"
      >
        <span class="material-symbols-outlined" aria-hidden="true">backspace</span>
      </button>
      <button
        type="button"
        tabindex="-1"
        :class="[keyClass, 'text-base', pressed === 'clear' ? 'bg-surface-tertiary' : '']"
        :style="{ gridColumn: '4', gridRow: props.showConfirm ? '2' : '3 / span 2' }"
        :disabled="inert"
        @pointerdown="keepFocus"
        @click="press('clear')"
      >
        {{ t.numpad.clear }}
      </button>
      <button
        v-if="props.showConfirm"
        type="button"
        tabindex="-1"
        class="flex items-center justify-center rounded-md bg-accent-solid font-semibold text-white transition-colors active:bg-accent-solid-hover disabled:cursor-not-allowed"
        :class="[sizeClass.text, pressed === 'confirm' ? 'bg-accent-solid-hover' : '']"
        :style="{ gridColumn: '4', gridRow: '3 / span 2' }"
        :disabled="inert"
        @pointerdown="keepFocus"
        @click="confirm()"
      >
        {{ props.confirmText || t.numpad.confirm }}
      </button>

      <button
        v-if="canNegate"
        type="button"
        tabindex="-1"
        :class="[keyClass, pressed === 'negate' ? 'bg-surface-tertiary' : '']"
        style="grid-row: 4"
        :aria-label="t.numpad.negate"
        :disabled="inert"
        @pointerdown="keepFocus"
        @click="press('negate')"
      >±</button>
      <button
        type="button"
        tabindex="-1"
        :class="[keyClass, pressed === '0' ? 'bg-surface-tertiary' : '']"
        :style="{ gridRow: '4', gridColumn: `span ${zeroSpan}` }"
        :disabled="inert"
        @pointerdown="keepFocus"
        @click="press('0')"
      >0</button>
      <button
        v-if="canDecimal"
        type="button"
        tabindex="-1"
        :class="[keyClass, pressed === '.' ? 'bg-surface-tertiary' : '']"
        style="grid-row: 4"
        :aria-label="t.numpad.decimal"
        :disabled="inert"
        @pointerdown="keepFocus"
        @click="press('.')"
      >.</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useLocale } from '../shared/config'
import {
  applyNumpadKey,
  numpadKeyFromKeyboard,
  numpadRangeError,
  numpadText,
  parseNumpad,
  type NumpadKey,
} from '../shared/numpad'

/**
 * ChptNumpad（CHPT 主題） - 螢幕數字鍵盤
 *
 * 用途：產線平板、觸控工作站輸入數量、重量、溫度 —— 沒有實體鍵盤，或戴手套點不準系統鍵盤的小按鍵。
 *   - 大按鍵（size 決定高度，lg 適合戴手套）；數字排列可選計算機式（789 在上）或電話式（123 在上）
 *   - 打開時現有的值是「選取」狀態：直接按數字會取代，按刪除才是修改
 *   - 按「確定」（或 Enter）才送出 v-model 並檢查範圍；超出範圍時顯示原因、不送出，也不偷偷夾到範圍內
 *     （數量打錯就該讓作業員看到，而不是被改成上限後照常過站）
 *   - 實體鍵盤也能用：聚焦後數字、小數點、Backspace、Delete（清除）、Enter（確定）、Esc（還原）
 *   - 整組只佔一個 Tab 停駐點；點按鍵不會把焦點搶走，接著用實體鍵盤也可以
 */

interface ChptNumpadProps {
  /** v-model 值（按確定才更新）；空白為 null */
  modelValue?: number | null
  /** 最小值 */
  min?: number
  /** 最大值 */
  max?: number
  /** 最多幾位小數；0 = 只能整數（不顯示小數點鍵）；不設定為不限 */
  precision?: number
  /** 可以輸入負數（顯示 ± 鍵）；不設定時有設 min 且 min < 0 才可以（沒設 min 時預設不能輸入負數） */
  allowNegative?: boolean
  /** 最多幾位數字（不含負號與小數點） */
  maxDigits?: number
  /** 可以確定空白（送出 null） */
  allowEmpty?: boolean
  /** 標籤（顯示在數值上方，也是整組的 aria-label） */
  label?: string
  /** 單位（顯示在數值右側） */
  unit?: string
  /** 空白時顯示的文字 */
  placeholder?: string
  /** 常用值（一排快速按鈕，按了填入、不會直接確定） */
  quickValues?: number[]
  /** 數字排列：calculator（789 在上，同實體數字鍵盤）、phone（123 在上） */
  layout?: 'calculator' | 'phone'
  /** 按鍵大小：sm 48px、md 56px、lg 72px（戴手套） */
  size?: 'sm' | 'md' | 'lg'
  /** 顯示確定鍵；不顯示時用 Enter 或 ref 的 confirm() */
  showConfirm?: boolean
  /** 確定鍵文字 */
  confirmText?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 唯讀（顯示值、按鍵無作用） */
  readonly?: boolean
  /** 是否全寬 */
  fullWidth?: boolean
  /** 掛載時聚焦（放在 Popover / Drawer 裡打開就能用實體鍵盤輸入） */
  autofocus?: boolean
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptNumpadProps>(), {
  modelValue: null,
  min: -Infinity,
  max: Infinity,
  precision: undefined,
  allowNegative: undefined,
  maxDigits: 15,
  allowEmpty: false,
  label: '',
  unit: '',
  placeholder: '',
  quickValues: () => [],
  layout: 'calculator',
  size: 'md',
  showConfirm: true,
  confirmText: undefined,
  disabled: false,
  readonly: false,
  fullWidth: false,
  autofocus: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | null): void
  /** 按確定且通過檢查時（值沒變也會送） */
  (e: 'confirm', value: number | null): void
  /** 輸入中的值改變時（還沒確定；打到「12.」時為 12、只有負號時為 null） */
  (e: 'input', value: number | null): void
  /** 按 Esc 還原時 */
  (e: 'cancel'): void
}>()

const root = useTemplateRef<HTMLDivElement>('root')

/** 正在輸入的文字 */
const text = ref(numpadText(props.modelValue))
/** 目前的文字是「原本的值」：按數字會取代、按刪除才修改 */
const fresh = ref(true)
/** 在「選取」狀態按了 ±：接著按數字時保留負號（± 2 0 → -20） */
let signTouched = false
/** 按確定時沒通過檢查的原因（再按任何鍵就清掉） */
const error = ref<'empty' | 'below' | 'above' | null>(null)
/** 實體鍵盤按下的鍵，短暫顯示按下的樣子 */
const pressed = ref<NumpadKey | 'confirm' | null>(null)
let pressedTimer: ReturnType<typeof setTimeout> | null = null

const inert = computed(() => props.disabled || props.readonly)
const canNegate = computed(() => props.allowNegative ?? (Number.isFinite(props.min) && props.min < 0))
const canDecimal = computed(() => props.precision === undefined || props.precision > 0)
const zeroSpan = computed(() => 3 - Number(canNegate.value) - Number(canDecimal.value))

const digitRows = computed<NumpadKey[]>(() =>
  props.layout === 'phone' ? ['1', '2', '3', '4', '5', '6', '7', '8', '9'] : ['7', '8', '9', '4', '5', '6', '1', '2', '3']
)

const sizeClass = computed(
  () =>
    ({
      sm: { width: 'w-60', key: 'h-12 text-lg', text: 'text-base', display: 'text-2xl' },
      md: { width: 'w-72', key: 'h-14 text-xl', text: 'text-lg', display: 'text-3xl' },
      lg: { width: 'w-96', key: 'h-[72px] text-2xl', text: 'text-xl', display: 'text-4xl' },
    })[props.size] ?? { width: 'w-72', key: 'h-14 text-xl', text: 'text-lg', display: 'text-3xl' }
)
const keyClass = computed(
  () =>
    `flex items-center justify-center rounded-md border border-stroke-default bg-surface-primary tabular-nums text-content-primary transition-colors hover:bg-surface-tertiary active:bg-surface-tertiary disabled:cursor-not-allowed disabled:text-content-disabled ${sizeClass.value.key}`
)

const withUnit = (n: number) => (props.unit ? `${n} ${props.unit}` : String(n))
const rangeHint = computed(() => {
  const hasMin = Number.isFinite(props.min)
  const hasMax = Number.isFinite(props.max)
  if (hasMin && hasMax) return t.value.numpad.range(withUnit(props.min), withUnit(props.max))
  if (hasMin) return t.value.numpad.min(withUnit(props.min))
  if (hasMax) return t.value.numpad.max(withUnit(props.max))
  return ''
})
const errorText = computed(() => {
  switch (error.value) {
    case 'empty':
      return t.value.numpad.empty
    case 'below':
      return t.value.numpad.below(withUnit(props.min))
    case 'above':
      return t.value.numpad.above(withUnit(props.max))
    default:
      return ''
  }
})

// 外部改了值（或確定後父層傳回來）：顯示新值，回到「選取」狀態
watch(
  () => props.modelValue,
  (v) => {
    if (fresh.value || parseNumpad(text.value) !== (v ?? null)) {
      text.value = numpadText(v)
      fresh.value = true
      signTouched = false
      error.value = null
    }
  }
)

function setText(next: string): void {
  const before = parseNumpad(text.value)
  text.value = next
  error.value = null
  const after = parseNumpad(next)
  if (after !== before) emit('input', after)
}

/** 按一個鍵（畫面按鍵、實體鍵盤共用） */
function press(key: NumpadKey): void {
  if (inert.value) return
  const options = { precision: props.precision, allowNegative: canNegate.value, maxDigits: props.maxDigits }
  if (fresh.value && key === 'negate') {
    // 選取狀態按 ±：翻轉目前的值，仍保持選取（直接確定 = 變號；接著打數字 = 新的負數）
    signTouched = !signTouched
    setText(applyNumpadKey(text.value, key, options))
    return
  }
  // 原本的值在「選取」狀態：數字與小數點從空白（或剛按的負號）開始打
  let base = text.value
  if (fresh.value && (/^[0-9]$/.test(key) || key === '.')) base = signTouched && text.value.startsWith('-') ? '-' : ''
  fresh.value = false
  signTouched = false
  setText(applyNumpadKey(base, key, options))
}

function setQuick(v: number): void {
  if (inert.value) return
  setText(numpadText(v))
  fresh.value = true
  signTouched = false
}

/** 確定：檢查空白與範圍，通過才送出；回傳是否送出 */
function confirm(): boolean {
  if (inert.value) return false
  const value = parseNumpad(text.value)
  if (value === null) {
    if (!props.allowEmpty) {
      error.value = 'empty'
      return false
    }
  } else {
    error.value = numpadRangeError(value, props.min, props.max)
    if (error.value) return false
  }
  text.value = numpadText(value)
  fresh.value = true
  signTouched = false
  if (value !== (props.modelValue ?? null)) emit('update:modelValue', value)
  emit('confirm', value)
  return true
}

/** 還原成目前的 v-model 值 */
function cancel(): void {
  text.value = numpadText(props.modelValue)
  fresh.value = true
  signTouched = false
  error.value = null
  emit('cancel')
}

function flash(key: NumpadKey | 'confirm'): void {
  pressed.value = key
  if (pressedTimer) clearTimeout(pressedTimer)
  pressedTimer = setTimeout(() => (pressed.value = null), 120)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey || event.metaKey || event.altKey || inert.value) return
  if (event.key === 'Enter') {
    event.preventDefault()
    flash('confirm')
    confirm()
    return
  }
  if (event.key === 'Escape') {
    // 有改過才攔下 Esc；沒改過時讓外層（例如 Modal）照常關閉
    if (error.value || text.value !== numpadText(props.modelValue)) {
      event.preventDefault()
      event.stopPropagation()
      cancel()
    }
    return
  }
  const key = numpadKeyFromKeyboard(event.key)
  if (!key) return
  event.preventDefault()
  flash(key)
  press(key)
}

/** 點按鍵時不把焦點移到按鍵上：焦點留在整組，接著用實體鍵盤也可以 */
function keepFocus(event: PointerEvent): void {
  event.preventDefault()
  root.value?.focus({ preventScroll: true })
}

onMounted(() => {
  if (props.autofocus && !props.disabled) root.value?.focus({ preventScroll: true })
})

defineExpose({
  focus: () => root.value?.focus(),
  confirm,
  clear: () => press('clear'),
  cancel,
})
</script>
