<template>
  <div class="flex flex-col gap-1" :class="props.fullWidth ? 'w-full' : ''">
    <label v-if="props.label" :for="id" class="text-sm text-content-secondary whitespace-nowrap">
      {{ props.label }}
    </label>

    <div class="relative flex items-center" :class="props.fullWidth ? 'w-full' : 'self-start'">
      <ChptIcon
        v-if="props.prefixIcon"
        :size="16"
        class="absolute left-2 pointer-events-none"
      >{{ props.prefixIcon }}</ChptIcon>

      <input
        :id="id"
        ref="input"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-expanded="isOpen"
        :aria-controls="listId"
        :aria-activedescendant="activeIndex >= 0 ? optionId(activeIndex) : undefined"
        :aria-invalid="invalid ? 'true' : undefined"
        :aria-describedby="describedBy"
        :aria-required="required || undefined"
        :value="props.modelValue"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        class="border rounded-md shadow-sm focus:outline-none focus:ring-1 transition-colors"
        :class="[
          sizeClass,
          props.fullWidth ? 'w-full' : '',
          props.prefixIcon ? 'pl-8' : '',
          props.clearable && props.modelValue ? 'pr-8' : '',
          invalid
            ? 'border-danger focus:border-danger focus:ring-danger'
            : 'border-stroke-default focus:border-stroke-focus focus:ring-stroke-focus',
          props.disabled ? 'bg-surface-tertiary cursor-not-allowed text-content-disabled' : 'bg-surface-primary text-content-primary',
        ]"
        @input="onInput"
        @keydown="onKeydown"
        @focus="onFocus"
        @blur="onBlur"
        @click="onFocus"
      />

      <button
        v-if="props.clearable && props.modelValue && !props.disabled"
        type="button"
        tabindex="-1"
        aria-label="清除"
        class="absolute right-2 inline-flex text-content-tertiary hover:text-content-primary"
        @mousedown.prevent
        @click="clear"
      >
        <ChptIcon :size="16" color="current">close</ChptIcon>
      </button>

      <!-- 建議清單：listbox 一直存在於 DOM（aria-controls 要指得到），沒開時隱藏 -->
      <ul
        :id="listId"
        role="listbox"
        :aria-label="props.label || props.placeholder || '建議'"
        :aria-busy="loading || undefined"
        class="absolute left-0 top-full z-dropdown mt-1 max-h-64 w-full min-w-[12rem] overflow-auto rounded-lg border border-stroke-light bg-surface-primary py-1 shadow-lg"
        :class="isOpen ? '' : 'hidden'"
        @mousedown.prevent
      >
        <li
          v-for="(item, index) in suggestions"
          :id="optionId(index)"
          :key="`${item.value}-${index}`"
          role="option"
          :aria-selected="index === activeIndex"
          :aria-disabled="item.disabled || undefined"
          class="flex cursor-pointer flex-col justify-center px-3 py-1.5 text-sm"
          :class="[
            item.disabled
              ? 'cursor-not-allowed text-content-disabled'
              : index === activeIndex
                ? 'bg-accent-subtle text-accent-on-subtle'
                : 'text-content-primary hover:bg-surface-tertiary',
          ]"
          @click="choose(index)"
          @mousemove="!item.disabled && (activeIndex = index)"
        >
          <slot name="option" :item="item" :query="props.modelValue">
            <span class="truncate">
              <template v-for="(part, i) in highlight(item.label)" :key="i">
                <mark v-if="part.match" class="bg-transparent font-semibold text-current">{{ part.text }}</mark>
                <template v-else>{{ part.text }}</template>
              </template>
            </span>
            <span v-if="item.description" class="truncate text-xs text-content-tertiary">{{ item.description }}</span>
          </slot>
        </li>
        <li v-if="loading" role="presentation" class="px-3 py-1.5 text-sm text-content-tertiary">{{ props.loadingText }}</li>
        <li
          v-else-if="!suggestions.length && props.modelValue"
          role="presentation"
          class="px-3 py-1.5 text-sm text-content-tertiary"
        >{{ props.emptyText }}</li>
      </ul>
    </div>

    <!-- 螢幕閱讀器：建議數量變動時唸出來（清單本身不會被主動報讀） -->
    <span class="sr-only" aria-live="polite">{{ liveMessage }}</span>

    <p v-if="props.errorText" :id="errorId" role="alert" class="text-xs text-danger">{{ props.errorText }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, useId, useTemplateRef } from 'vue'
import ChptIcon from './ChptIcon.vue'
import { useFormField } from '@/components/library/shared/formContext'
import type { ComponentSize } from '@/components/library/shared/types/ui.types'

/**
 * ChptAutocomplete（CHPT 主題） - 自動完成輸入框
 *
 * 可以自由輸入的文字框，打字時在下方列出建議（料號、客戶名稱、最近搜尋…）。
 * 值就是文字本身：選建議只是幫忙填字，不選也可以。
 * 只能從清單裡選時請用 ChptSelect。
 *
 * 建議來源二擇一：
 *   - options：固定清單，元件依輸入文字過濾（預設不分大小寫的「包含」）
 *   - fetchSuggestions(query)：自己查（可 async），元件負責 debounce 與丟棄過期結果
 *
 * 無障礙照 WAI-ARIA combobox（list autocomplete）：
 *   - 焦點一直留在輸入框，清單裡的「目前項目」以 aria-activedescendant 表示
 *   - ↓ / ↑ 在建議間移動（頭尾循環），Enter 選取，Escape 關閉（清單已關時清空）
 *   - Alt+↓ 只打開清單不移動；建議數量以 live region 報讀
 */

export type AutocompleteSuggestion =
  | string
  | { value: string; label?: string; description?: string; disabled?: boolean; [key: string]: unknown }

interface NormalizedSuggestion {
  value: string
  label: string
  description?: string
  disabled?: boolean
  raw: AutocompleteSuggestion
}

interface ChptAutocompleteProps {
  /** v-model 值（輸入框文字） */
  modelValue?: string
  /** 固定建議清單 */
  options?: AutocompleteSuggestion[]
  /** 自訂查詢（回傳建議或 Promise）；設定後 options 不再使用 */
  fetchSuggestions?: (query: string) => AutocompleteSuggestion[] | Promise<AutocompleteSuggestion[]>
  /** 自訂過濾（只作用在 options） */
  filter?: (item: { value: string; label: string }, query: string) => boolean
  /** fetchSuggestions 的 debounce（ms） */
  debounce?: number
  /** 聚焦時就列出建議（輸入框是空的也列） */
  openOnFocus?: boolean
  /** 最多列幾筆 */
  maxItems?: number
  /** 自動把第一筆設為目前項目（Enter 直接選它） */
  autoHighlight?: boolean
  label?: string
  placeholder?: string
  prefixIcon?: string
  size?: ComponentSize
  disabled?: boolean
  clearable?: boolean
  fullWidth?: boolean
  errorText?: string
  emptyText?: string
  loadingText?: string
}

const props = withDefaults(defineProps<ChptAutocompleteProps>(), {
  modelValue: '',
  options: () => [],
  fetchSuggestions: undefined,
  filter: undefined,
  debounce: 200,
  openOnFocus: true,
  maxItems: 50,
  autoHighlight: false,
  label: '',
  placeholder: '',
  prefixIcon: '',
  size: 'sm',
  disabled: false,
  clearable: false,
  fullWidth: false,
  errorText: '',
  emptyText: '沒有符合的建議',
  loadingText: '載入中…',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', item: AutocompleteSuggestion): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

const { id, errorId, invalid, describedBy, required } = useFormField(() => props.errorText)
const uid = useId()
const listId = `${uid}-listbox`
const optionId = (index: number) => `${uid}-option-${index}`

const input = useTemplateRef<HTMLInputElement>('input')

const isOpen = ref(false)
const activeIndex = ref(-1)
const loading = ref(false)
const fetched = shallowRef<NormalizedSuggestion[]>([])

function normalize(item: AutocompleteSuggestion): NormalizedSuggestion {
  if (typeof item === 'string') return { value: item, label: item, raw: item }
  return { value: item.value, label: item.label ?? item.value, description: item.description, disabled: item.disabled, raw: item }
}

const defaultFilter = (item: { label: string }, query: string) => item.label.toLowerCase().includes(query.toLowerCase())

const suggestions = computed<NormalizedSuggestion[]>(() => {
  if (props.fetchSuggestions) return fetched.value.slice(0, props.maxItems)
  const query = props.modelValue.trim()
  const list = props.options.map(normalize)
  const filtered = query ? list.filter((item) => (props.filter ?? defaultFilter)(item, query)) : list
  return filtered.slice(0, props.maxItems)
})

const liveMessage = computed(() => {
  if (!isOpen.value || loading.value) return ''
  return suggestions.value.length ? `有 ${suggestions.value.length} 個建議，用上下鍵選擇` : ''
})

// ---- 非同步查詢：debounce + 只採用最後一次 ----

let timer: ReturnType<typeof setTimeout> | undefined
let token = 0
onBeforeUnmount(() => clearTimeout(timer))

function query(text: string, immediate = false): void {
  if (!props.fetchSuggestions) return
  clearTimeout(timer)
  const run = async () => {
    const mine = ++token
    loading.value = true
    try {
      const result = await props.fetchSuggestions!(text)
      if (mine !== token) return
      fetched.value = (result ?? []).map(normalize)
    } catch {
      if (mine === token) fetched.value = []
    } finally {
      if (mine === token) {
        loading.value = false
        activeIndex.value = props.autoHighlight ? firstEnabled() : -1
      }
    }
  }
  if (immediate || props.debounce <= 0) run()
  else timer = setTimeout(run, props.debounce)
}

function firstEnabled(): number {
  return suggestions.value.findIndex((s) => !s.disabled)
}

function openList(): void {
  if (props.disabled) return
  isOpen.value = true
}

function closeList(): void {
  isOpen.value = false
  activeIndex.value = -1
}

function onInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
  openList()
  if (props.fetchSuggestions) query(value)
  // 過濾結果要等父層把新值送回來才會更新，所以在下一個 tick 決定目前項目
  activeIndex.value = -1
  if (props.autoHighlight) queueMicrotask(() => (activeIndex.value = firstEnabled()))
}

function onFocus(event: FocusEvent | MouseEvent): void {
  if (event.type === 'focus') emit('focus', event as FocusEvent)
  if (!props.openOnFocus || isOpen.value) return
  openList()
  if (props.fetchSuggestions) query(props.modelValue, true)
}

function onBlur(event: FocusEvent): void {
  closeList()
  emit('blur', event)
}

function move(dir: 1 | -1): void {
  const list = suggestions.value
  if (!list.length) return
  let index = activeIndex.value
  for (let step = 0; step < list.length; step++) {
    index = index === -1 ? (dir === 1 ? 0 : list.length - 1) : (index + dir + list.length) % list.length
    if (!list[index].disabled) break
  }
  if (list[index]?.disabled) return
  activeIndex.value = index
  document.getElementById(optionId(index))?.scrollIntoView?.({ block: 'nearest' })
}

function choose(index: number): void {
  const item = suggestions.value[index]
  if (!item || item.disabled) return
  emit('update:modelValue', item.value)
  emit('select', item.raw)
  // 先聚焦再關：反過來的話 focus 事件（openOnFocus）會把剛關掉的清單又打開
  input.value?.focus()
  closeList()
}

function clear(): void {
  emit('update:modelValue', '')
  activeIndex.value = -1
  if (props.fetchSuggestions) query('')
  input.value?.focus()
}

function onKeydown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (!isOpen.value) {
        openList()
        if (props.fetchSuggestions && !fetched.value.length) query(props.modelValue, true)
        if (event.altKey) return
      }
      move(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      if (!isOpen.value) openList()
      move(-1)
      break
    case 'Enter':
      if (isOpen.value && activeIndex.value >= 0) {
        event.preventDefault() // 在表單裡時不要順便送出
        choose(activeIndex.value)
      } else {
        closeList()
      }
      break
    case 'Escape':
      if (isOpen.value) {
        event.preventDefault()
        event.stopPropagation()
        closeList()
      } else if (props.clearable && props.modelValue) {
        event.preventDefault()
        clear()
      }
      break
    case 'Tab':
      closeList()
      break
  }
}

/** 把輸入文字在建議裡標粗（只標第一個出現的位置） */
function highlight(label: string): { text: string; match: boolean }[] {
  const q = props.modelValue.trim()
  if (!q) return [{ text: label, match: false }]
  const at = label.toLowerCase().indexOf(q.toLowerCase())
  if (at === -1) return [{ text: label, match: false }]
  return [
    { text: label.slice(0, at), match: false },
    { text: label.slice(at, at + q.length), match: true },
    { text: label.slice(at + q.length), match: false },
  ].filter((p) => p.text)
}

const sizeClass = computed(() => {
  const map: Record<ComponentSize, string> = {
    xs: 'text-xs h-control-xs px-2',
    sm: 'text-sm h-control-sm px-3',
    md: 'text-base h-control-md px-4',
    lg: 'text-lg h-control-lg px-6',
    xl: 'text-xl h-control-xl px-5',
  }
  return map[props.size]
})

defineExpose({ focus: () => input.value?.focus(), close: closeList })
</script>
