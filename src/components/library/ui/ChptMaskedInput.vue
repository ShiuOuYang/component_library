<template>
  <div class="flex flex-col gap-1" :class="props.fullWidth ? 'w-full' : ''">
    <label v-if="props.label" :for="id" class="text-sm text-content-secondary whitespace-nowrap">
      {{ props.label }}
    </label>

    <div class="relative flex items-center" :class="props.fullWidth ? 'w-full' : 'self-start'">
      <ChptIcon v-if="props.prefixIcon" :size="16" class="absolute left-2 z-[1] pointer-events-none">
        {{ props.prefixIcon }}
      </ChptIcon>

      <!--
        不綁 :value：每次重新渲染時 Vue 會把 value 寫回輸入框，游標會跳到最後、輸入法組字也會被打斷。
        改由 writeInput() 在格式化後手動寫入並放好游標。
      -->
      <input
        :id="id"
        ref="inputRef"
        type="text"
        :inputmode="inputMode"
        :placeholder="showGhost ? '' : placeholderText"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :size="inputSize"
        autocomplete="off"
        spellcheck="false"
        :aria-invalid="isInvalid ? 'true' : undefined"
        :aria-describedby="[describedBy, hintId].filter(Boolean).join(' ')"
        :aria-required="required || undefined"
        class="border rounded-md shadow-sm focus:outline-none focus:ring-1 transition-colors"
        :class="[
          sizeClass,
          padClass,
          fontClass,
          props.fullWidth ? 'w-full' : '',
          flash
            ? 'border-warning focus:border-warning focus:ring-warning'
            : isInvalid
              ? 'border-danger focus:border-danger focus:ring-danger'
              : 'border-stroke-default focus:border-stroke-focus focus:ring-stroke-focus',
          props.disabled ? 'bg-surface-tertiary cursor-not-allowed text-content-disabled' : 'bg-surface-primary text-content-primary',
        ]"
        data-masked-input
        @input="onInput"
        @keydown="onKeydown"
        @focus="onFocus"
        @blur="onBlur"
        @scroll="syncScroll"
        @compositionstart="composing = true"
        @compositionend="onCompositionEnd"
      />

      <!-- 還沒填的位置：和輸入框同樣排版，已填的部分透明，只顯示後面的底線與分隔符號 -->
      <div
        v-if="showGhost"
        ref="ghostRef"
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre border border-transparent"
        :class="[sizeClass, padClass, fontClass]"
        data-ghost
      ><span class="text-transparent">{{ state.value }}</span><span class="text-content-tertiary">{{ ghostRest }}</span></div>

      <button
        v-if="props.clearable && state.value && !props.disabled && !props.readonly"
        type="button"
        :aria-label="t.clear"
        class="absolute right-2 z-[1] text-content-tertiary hover:text-content-primary"
        @click="clear"
      >
        <ChptIcon :size="16">close</ChptIcon>
      </button>
    </div>

    <span :id="hintId" class="sr-only">{{ t.maskedInput.format(template) }}</span>
    <span class="sr-only" aria-live="polite" data-live>{{ announcement }}</span>

    <p v-if="props.errorText" :id="errorId" role="alert" class="text-xs text-danger">
      {{ props.errorText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from 'vue'
import { resolveSize, useConfig, useLocale } from '../shared/config'
import { useFormField } from '../shared/formContext'
import {
  DEFAULT_MASK_TOKENS,
  applyMask,
  caretForRaw,
  deleteRange,
  isNumericMask,
  maskTemplate,
  parseMask,
  pickMask,
  type MaskItem,
  type MaskResult,
  type MaskTokenDef,
} from '../shared/inputMask'
import type { ComponentSize } from '../shared/types/ui.types'
import ChptIcon from './ChptIcon.vue'

/**
 * ChptMaskedInput - 格式化輸入
 *
 * 序號、MAC、IP、電話、料號、日期碼這類固定格式：分隔符號自動補上、不合格式的字元擋掉，
 * 貼上時清掉多餘符號，刪除時跳過分隔符號。格式語法見 shared/inputMask.ts。
 */

export interface MaskedValue {
  /** 格式化後的值 */
  masked: string
  /** 只有填入的字元 */
  raw: string
  /** 必填的位置都填了（且通過 validate） */
  complete: boolean
}

export interface ChptMaskedInputProps {
  /** v-model：預設是格式化後的值；unmask 時是只有填入字元的值 */
  modelValue?: string
  /** 格式；給陣列時依輸入長度自動選（例如市話 / 手機） */
  mask: string | readonly string[]
  /** 自訂 / 覆寫格式字元 */
  tokens?: Record<string, MaskTokenDef>
  /** v-model 用只有填入字元的值（例如電話只存數字） */
  unmask?: boolean
  /** 英文字母轉大寫 */
  uppercase?: boolean
  /** 輸入時顯示還沒填的位置（底線） */
  showMask?: boolean
  /** 還沒填的位置用的字元 */
  placeholderChar?: string
  /** 額外檢查（例如 IP 每段 ≤ 255）；填完但不通過時標紅、不送出 complete */
  validate?: (masked: string, raw: string) => boolean
  /** 等寬字型（字元對齊比較好讀） */
  mono?: boolean
  label?: string
  /** 預設為格式樣板（例如 SN-____-____） */
  placeholder?: string
  size?: ComponentSize
  disabled?: boolean
  readonly?: boolean
  clearable?: boolean
  fullWidth?: boolean
  prefixIcon?: string
  errorText?: string
}

const props = withDefaults(defineProps<ChptMaskedInputProps>(), {
  modelValue: '',
  tokens: undefined,
  unmask: false,
  uppercase: false,
  showMask: true,
  placeholderChar: '_',
  validate: undefined,
  mono: true,
  label: '',
  placeholder: undefined,
  size: undefined,
  disabled: false,
  readonly: false,
  clearable: false,
  fullWidth: false,
  prefixIcon: '',
  errorText: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  /** 使用者每次改動 */
  (e: 'accept', value: MaskedValue): void
  /** 剛填完（且通過 validate） */
  (e: 'complete', value: MaskedValue): void
  /** 有字元不符合格式被擋掉 */
  (e: 'reject', info: { char: string; kind?: string }): void
  /** 按 Enter（掃描槍通常會送 Enter） */
  (e: 'enter', value: MaskedValue): void
  (e: 'clear'): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

const t = useLocale()
const config = useConfig()
const size = computed(() => resolveSize(props.size, config, 'sm'))
const { id, errorId, invalid, describedBy, required } = useFormField(() => props.errorText)
const hintId = `${useId()}-hint`

const inputRef = ref<HTMLInputElement | null>(null)
const ghostRef = ref<HTMLElement | null>(null)

const masks = computed<MaskItem[][]>(() => {
  const tokens = { ...DEFAULT_MASK_TOKENS, ...props.tokens }
  const list = typeof props.mask === 'string' ? [props.mask] : [...props.mask]
  return (list.length ? list : ['']).map((m) => parseMask(m, tokens))
})

const empty: MaskResult = { value: '', raw: '', slots: [], complete: false, next: 0, rejected: [] }
const state = shallowRef<MaskResult>(empty)
const maskIndex = ref(0)
const focused = ref(false)
const composing = ref(false)

function run(text: string, fromRaw: boolean) {
  return pickMask(text, masks.value, { fromRaw, uppercase: props.uppercase })
}

const items = computed(() => masks.value[maskIndex.value] ?? masks.value[0])
/** 用最長的格式當樣板（placeholder、寬度、螢幕閱讀器提示） */
const template = computed(() => {
  const all = masks.value.map((m) => maskTemplate(m, props.placeholderChar))
  return all.reduce((a, b) => (b.length > a.length ? b : a), all[0] ?? '')
})
const placeholderText = computed(() => props.placeholder ?? (props.showMask ? template.value : ''))
const showGhost = computed(() => props.showMask && !props.disabled && (focused.value || !!state.value.value) && !composing.value)
// 填完後不再顯示（IP 之類可省略的位置不必補滿）
const ghostRest = computed(() => (state.value.complete ? '' : maskTemplate(items.value.slice(state.value.next), props.placeholderChar)))
const inputSize = computed(() => Math.max(4, template.value.length, placeholderText.value.length) + 1)
const inputMode = computed(() => (masks.value.every(isNumericMask) ? 'numeric' : 'text'))

const valid = computed(() => !props.validate || !state.value.complete || props.validate(state.value.value, state.value.raw))
const isInvalid = computed(() => invalid.value || !valid.value)
const current = (): MaskedValue => ({
  masked: state.value.value,
  raw: state.value.raw,
  complete: state.value.complete && valid.value,
})
const modelOf = (r: MaskResult) => (props.unmask ? r.raw : r.value)

const sizeClass = computed(() => {
  const map: Record<ComponentSize, string> = {
    xs: 'text-xs h-control-xs',
    sm: 'text-sm h-control-sm',
    md: 'text-base h-control-md',
    lg: 'text-lg h-control-lg',
    xl: 'text-xl h-control-xl',
  }
  return map[size.value]
})
const padClass = computed(() => {
  const px: Record<ComponentSize, [string, string]> = {
    xs: ['pl-2', 'pr-2'],
    sm: ['pl-3', 'pr-3'],
    md: ['pl-4', 'pr-4'],
    lg: ['pl-6', 'pr-6'],
    xl: ['pl-5', 'pr-5'],
  }
  const [l, r] = px[size.value]
  return [props.prefixIcon ? 'pl-8' : l, props.clearable && state.value.value ? 'pr-8' : r]
})
const fontClass = computed(() => (props.mono ? 'font-mono tabular-nums tracking-normal' : ''))

// ---- 寫回輸入框 ----
function writeInput(caret?: number) {
  const el = inputRef.value
  if (!el) return
  if (el.value !== state.value.value) el.value = state.value.value
  if (caret !== undefined && document.activeElement === el) {
    const p = Math.min(caret, el.value.length)
    el.setSelectionRange(p, p)
  }
  syncScroll()
}

function syncScroll() {
  if (ghostRef.value && inputRef.value) ghostRef.value.scrollLeft = inputRef.value.scrollLeft
}

// ---- 外部改 v-model ----
watch(
  () => [props.modelValue, masks.value, props.unmask, props.uppercase] as const,
  () => {
    const v = props.modelValue ?? ''
    if (v === modelOf(state.value)) return
    const { index, result } = run(v, props.unmask)
    maskIndex.value = index
    state.value = result
    writeInput()
  },
  { immediate: true }
)
onMounted(() => writeInput())

// ---- 使用者輸入 ----
const announcement = ref('')
const flash = ref(false)
let flashTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(flashTimer))

function kindLabel(kind?: string): string {
  const k = t.value.maskedInput.kinds as Record<string, string>
  return (kind && k[kind]) || kind || k.any
}

/**
 * 套用使用者改過的字串：text 為輸入框裡的新內容，caret 為新游標位置（或游標前應有幾個填入字元），
 * rejected 為新打的字裡被擋掉的。
 */
function commit(text: string, caret: { raw: number } | { pos: number }, rejected: MaskResult['rejected'] = []) {
  const before = state.value
  const wasComplete = current().complete
  const { index, result } = run(text, false)
  maskIndex.value = index
  state.value = result
  writeInput('pos' in caret ? caret.pos : caretForRaw(result.slots, Math.min(caret.raw, result.raw.length)))

  if (rejected.length) {
    const r = rejected[0]
    emit('reject', r)
    announcement.value = t.value.maskedInput.rejected(kindLabel(r.kind))
    flash.value = true
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => (flash.value = false), 600)
  }

  const model = modelOf(result)
  if (model !== modelOf(before) || before.value !== result.value) {
    if (model !== (props.modelValue ?? '')) emit('update:modelValue', model)
    const now = current()
    emit('accept', now)
    if (now.complete && !wasComplete) {
      emit('complete', now)
      announcement.value = t.value.maskedInput.complete
    }
  }
}

function onInput(e: Event) {
  if (composing.value) return
  const el = e.target as HTMLInputElement
  const text = el.value
  const caret = el.selectionStart ?? text.length
  // 游標前的部分單獨套一次格式（結果一定是整串結果的開頭）；新打的字都在游標前，
  // 所以也只看這段有沒有被擋掉的字（後面被擠出去的不算使用者打錯）
  // （用整串選到的格式來算：長度跨過格式時，舊格式可能放不下游標前的字）
  const chosen = masks.value[run(text, false).index]
  const before = applyMask(text.slice(0, caret), chosen, { uppercase: props.uppercase })
  // 游標前那段格式化後的長度就是新的游標位置（使用者自己打的分隔符號也算進去）
  commit(text, { pos: before.value.length }, before.rejected)
}

function onCompositionEnd(e: Event) {
  composing.value = false
  onInput(e)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    emit('enter', current())
    return
  }
  if (composing.value || e.isComposing || props.readonly || props.disabled) return
  if ((e.key !== 'Backspace' && e.key !== 'Delete') || e.ctrlKey || e.metaKey || e.altKey) return
  const el = e.target as HTMLInputElement
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? start
  e.preventDefault()
  const del = deleteRange(state.value.value, state.value.slots, start, end, e.key === 'Backspace' ? 'back' : 'forward')
  if (!del) return
  commit(del.text, { raw: del.caretRaw })
}

function onFocus(e: FocusEvent) {
  focused.value = true
  emit('focus', e)
}

function onBlur(e: FocusEvent) {
  focused.value = false
  emit('blur', e)
}

function clear() {
  const had = !!state.value.value
  state.value = empty
  maskIndex.value = 0
  writeInput()
  if (had && (props.modelValue ?? '') !== '') emit('update:modelValue', '')
  emit('clear')
  inputRef.value?.focus()
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  clear,
  /** 目前格式化後的值、只有填入字元的值、是否完成 */
  value: current,
  /** 給陣列格式時，目前用的是第幾個 */
  maskIndex: () => maskIndex.value,
  input: inputRef,
})

// 格式本身改變時，提示的位置也要跟著換
watch(items, () => nextTick(syncScroll))
</script>
