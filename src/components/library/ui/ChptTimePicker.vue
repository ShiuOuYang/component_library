<template>
  <div ref="root" class="relative flex flex-col gap-1" :class="props.fullWidth ? 'w-full' : 'w-fit'">
    <label v-if="props.label" :for="id" class="text-sm text-content-secondary whitespace-nowrap">{{ props.label }}</label>

    <!-- self-start：外框貼齊輸入框寬度（標籤比輸入框寬時，右側的 ✕ 與時鐘鈕才會在輸入框裡） -->
    <div class="relative flex items-center" :class="props.fullWidth ? 'w-full' : 'self-start'">
      <input
        :id="id"
        ref="input"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        :value="draft"
        :placeholder="props.placeholder || format"
        :disabled="props.disabled"
        :aria-invalid="invalid ? 'true' : undefined"
        :aria-describedby="describedBy"
        :aria-required="required || undefined"
        class="rounded-md border pr-16 font-mono tabular-nums shadow-sm transition-colors focus:outline-none focus:ring-1"
        :class="[
          sizeClass,
          props.fullWidth ? 'w-full' : props.showSeconds ? 'w-36' : 'w-32',
          invalid
            ? 'border-danger focus:border-danger focus:ring-danger'
            : 'border-stroke-default focus:border-stroke-focus focus:ring-stroke-focus',
          props.disabled ? 'cursor-not-allowed bg-surface-tertiary text-content-disabled' : 'bg-surface-primary text-content-primary',
        ]"
        @input="draft = ($event.target as HTMLInputElement).value"
        @blur="commitDraft"
        @keydown="onInputKeydown"
      />
      <div class="absolute right-1 flex items-center">
        <button
          v-if="props.clearable && props.modelValue && !props.disabled"
          type="button"
          aria-label="清除"
          class="inline-flex h-control-xs min-w-control-xs items-center justify-center rounded text-content-disabled hover:text-content-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          @click="clear"
        >
          <ChptIcon :size="16" color="current">close</ChptIcon>
        </button>
        <button
          ref="toggleButton"
          type="button"
          :disabled="props.disabled"
          :aria-label="props.label ? `選擇${props.label}` : '選擇時間'"
          aria-haspopup="dialog"
          :aria-expanded="isOpen"
          :aria-controls="isOpen ? panelId : undefined"
          class="inline-flex h-control-xs min-w-control-xs items-center justify-center rounded text-content-tertiary hover:text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:cursor-not-allowed"
          @click="toggle"
        >
          <ChptIcon :size="18" color="current">schedule</ChptIcon>
        </button>
      </div>
    </div>

    <div
      v-if="isOpen"
      :id="panelId"
      role="dialog"
      :aria-label="props.label ? `選擇${props.label}` : '選擇時間'"
      class="absolute left-0 top-full z-dropdown mt-1 flex flex-col rounded-lg border border-stroke-light bg-surface-primary shadow-lg"
      @keydown="onPanelKeydown"
    >
      <div class="flex divide-x divide-stroke-light">
        <ul
          v-for="(col, ci) in columns"
          :key="col.unit"
          :ref="(el) => setColumnRef(ci, el as HTMLElement | null)"
          role="listbox"
          :aria-label="col.label"
          class="chpt-time-column h-56 w-14 overflow-y-auto py-1"
        >
          <li
            v-for="opt in col.options"
            :key="opt.value"
            role="option"
            :data-value="opt.value"
            :tabindex="focusCol === ci && opt.value === focusValue(ci) ? 0 : -1"
            :aria-selected="opt.value === parts[col.unit]"
            :aria-disabled="opt.disabled || undefined"
            class="mx-1 flex h-control-xs cursor-pointer items-center justify-center rounded font-mono text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus"
            :class="
              opt.disabled
                ? 'cursor-not-allowed text-content-disabled'
                : opt.value === parts[col.unit]
                  ? 'bg-accent-subtle font-semibold text-accent-on-subtle'
                  : 'text-content-primary hover:bg-surface-tertiary'
            "
            @click="pick(ci, opt.value, opt.disabled)"
          >{{ pad(opt.value) }}</li>
        </ul>
      </div>
      <div class="flex items-center justify-between gap-2 border-t border-stroke-light px-2 py-1.5">
        <button
          type="button"
          class="h-control-xs rounded px-2 text-xs text-accent hover:bg-surface-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          @click="setNow"
        >現在</button>
        <button
          type="button"
          class="h-control-xs rounded bg-accent-solid px-3 text-xs font-medium text-content-on-solid hover:bg-accent-solid-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus focus-visible:ring-offset-1"
          @click="close(true)"
        >確定</button>
      </div>
    </div>

    <p v-if="props.errorText" :id="errorId" role="alert" class="text-xs text-danger">{{ props.errorText }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import ChptIcon from './ChptIcon.vue'
import { useFormField } from '@/components/library/shared/formContext'
import type { ComponentSize } from '@/components/library/shared/types/ui.types'

/**
 * ChptTimePicker（CHPT 主題） - 時間選擇
 *
 * v-model 是 'HH:mm'（showSeconds 時 'HH:mm:ss'）或 null。
 *
 * 兩種輸入方式都要順：
 *   - 直接打字：接受 930、0930、9:30、21:5 這類寫法，離開欄位或按 Enter 時正規化成 09:30；
 *     打錯（25:00、abc）會還原成原本的值，不會存進奇怪的東西
 *   - 面板：時 / 分 / 秒三欄，各是一個 listbox；點選或 ↑ ↓ 立刻生效，← → 換欄，
 *     Enter / Escape 關閉並把焦點還給輸入框
 *
 * min / max 限制可選範圍（面板中範圍外的選項停用，打字超出範圍也會還原）。
 * minuteStep / secondStep 控制面板的間隔（打字不受限）。
 */

type Unit = 'h' | 'm' | 's'

interface ChptTimePickerProps {
  modelValue?: string | null
  showSeconds?: boolean
  minuteStep?: number
  secondStep?: number
  /** 可選的最早 / 最晚時間（'HH:mm' 或 'HH:mm:ss'） */
  min?: string
  max?: string
  label?: string
  placeholder?: string
  clearable?: boolean
  disabled?: boolean
  size?: ComponentSize
  fullWidth?: boolean
  errorText?: string
}

const props = withDefaults(defineProps<ChptTimePickerProps>(), {
  modelValue: null,
  showSeconds: false,
  minuteStep: 1,
  secondStep: 1,
  min: '',
  max: '',
  label: '',
  placeholder: '',
  clearable: true,
  disabled: false,
  size: 'sm',
  fullWidth: false,
  errorText: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
  (e: 'change', value: string | null): void
}>()

const { id, errorId, invalid, describedBy, required } = useFormField(() => props.errorText)
const panelId = `${useId()}-panel`
const root = useTemplateRef<HTMLElement>('root')
const input = useTemplateRef<HTMLInputElement>('input')

const format = computed(() => (props.showSeconds ? 'HH:mm:ss' : 'HH:mm'))
const pad = (n: number) => String(n).padStart(2, '0')

// ---- 解析與格式化 ----

/** 秒數（一天中的第幾秒）；無法解析回傳 null */
function parse(text: string | null | undefined): number | null {
  if (!text) return null
  const s = text.trim().replace(/[：.]/g, ':')
  let h: number, m: number, sec = 0
  const withColon = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(s)
  if (withColon) {
    h = +withColon[1]
    m = +withColon[2]
    sec = withColon[3] ? +withColon[3] : 0
  } else if (/^\d{1,6}$/.test(s)) {
    // 純數字：9 → 09:00、930 → 09:30、0930 → 09:30、93015 → 09:30:15
    const digits = s.length % 2 ? `0${s}` : s
    h = +digits.slice(0, 2)
    m = digits.length >= 4 ? +digits.slice(2, 4) : 0
    sec = digits.length >= 6 ? +digits.slice(4, 6) : 0
  } else {
    return null
  }
  if (h > 23 || m > 59 || sec > 59) return null
  return h * 3600 + m * 60 + sec
}

function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return props.showSeconds ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}`
}

const minSec = computed(() => parse(props.min) ?? 0)
const maxSec = computed(() => parse(props.max) ?? 24 * 3600 - 1)
const inRange = (t: number) => t >= minSec.value && t <= maxSec.value

const valueSec = computed(() => parse(props.modelValue))
const parts = computed<Record<Unit, number | null>>(() => {
  const v = valueSec.value
  if (v === null) return { h: null, m: null, s: null }
  return { h: Math.floor(v / 3600), m: Math.floor((v % 3600) / 60), s: v % 60 }
})

// ---- 輸入框 ----

const draft = ref('')
watch(
  () => [props.modelValue, props.showSeconds],
  () => {
    draft.value = valueSec.value === null ? '' : formatSeconds(valueSec.value)
  },
  { immediate: true }
)

function update(total: number | null): void {
  const next = total === null ? null : formatSeconds(total)
  draft.value = next ?? ''
  if (next === props.modelValue) return
  emit('update:modelValue', next)
  emit('change', next)
}

function commitDraft(): void {
  if (!draft.value.trim()) {
    if (props.modelValue !== null) update(null)
    return
  }
  const t = parse(draft.value)
  if (t === null || !inRange(t)) {
    // 打錯或超出範圍：還原
    draft.value = valueSec.value === null ? '' : formatSeconds(valueSec.value)
    return
  }
  update(props.showSeconds ? t : t - (t % 60))
}

function clear(): void {
  update(null)
  input.value?.focus()
}

// ---- 面板 ----

const isOpen = ref(false)
const focusCol = ref(0)
const columnEls: (HTMLElement | null)[] = []
function setColumnRef(i: number, el: HTMLElement | null): void {
  columnEls[i] = el
}

function range(count: number, step: number): number[] {
  const out: number[] = []
  for (let i = 0; i < count; i += Math.max(1, step)) out.push(i)
  return out
}

const columns = computed(() => {
  const { h, m } = parts.value
  const hh = h ?? Math.floor(minSec.value / 3600)
  const mm = m ?? 0
  const cols: { unit: Unit; label: string; options: { value: number; disabled: boolean }[] }[] = [
    {
      unit: 'h',
      label: '時',
      // 整個小時都在範圍外才停用
      options: range(24, 1).map((v) => ({ value: v, disabled: v * 3600 + 3599 < minSec.value || v * 3600 > maxSec.value })),
    },
    {
      unit: 'm',
      label: '分',
      options: range(60, props.minuteStep).map((v) => {
        const start = hh * 3600 + v * 60
        return { value: v, disabled: start + 59 < minSec.value || start > maxSec.value }
      }),
    },
  ]
  if (props.showSeconds) {
    cols.push({
      unit: 's',
      label: '秒',
      options: range(60, props.secondStep).map((v) => ({ value: v, disabled: !inRange(hh * 3600 + mm * 60 + v) })),
    })
  }
  return cols
})

/** 每一欄的停駐點：已選的值；沒有時是第一個可選的 */
function focusValue(ci: number): number {
  const col = columns.value[ci]
  const selected = parts.value[col.unit]
  if (selected !== null && col.options.some((o) => o.value === selected)) return selected
  return col.options.find((o) => !o.disabled)?.value ?? 0
}

function optionEl(ci: number, value: number): HTMLElement | null {
  return columnEls[ci]?.querySelector<HTMLElement>(`[data-value="${value}"]`) ?? null
}

/** 把每一欄已選的值捲到最上面 */
function scrollColumns(): void {
  columns.value.forEach((_, ci) => {
    const el = optionEl(ci, focusValue(ci))
    const col = columnEls[ci]
    if (el && col) col.scrollTop = el.offsetTop - 4
  })
}

async function open(focusPanel = false): Promise<void> {
  if (props.disabled || isOpen.value) return
  isOpen.value = true
  await nextTick()
  scrollColumns()
  if (focusPanel) {
    focusCol.value = 0
    optionEl(0, focusValue(0))?.focus()
  }
}

function close(returnFocus = false): void {
  if (!isOpen.value) return
  isOpen.value = false
  if (returnFocus) input.value?.focus()
}

function toggle(): void {
  if (isOpen.value) close()
  else open(false)
}

/** 選某一欄的值：其他欄沿用目前值（還沒有值時從範圍的起點開始），結果夾在 min / max 內 */
function pick(ci: number, value: number, disabled = false): void {
  if (disabled) return
  const unit = columns.value[ci].unit
  const base = valueSec.value ?? minSec.value
  const cur = { h: Math.floor(base / 3600), m: Math.floor((base % 3600) / 60), s: props.showSeconds ? base % 60 : 0 }
  cur[unit] = value
  let total = cur.h * 3600 + cur.m * 60 + cur.s
  total = Math.min(maxSec.value, Math.max(minSec.value, total))
  focusCol.value = ci
  update(total)
}

function setNow(): void {
  const now = new Date()
  const total = now.getHours() * 3600 + now.getMinutes() * 60 + (props.showSeconds ? now.getSeconds() : 0)
  update(Math.min(maxSec.value, Math.max(minSec.value, total)))
  nextTick(scrollColumns)
}

function onInputKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitDraft()
    close()
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    commitDraft()
    open(true).then(() => {
      if (isOpen.value) optionEl(0, focusValue(0))?.focus()
    })
  } else if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    event.stopPropagation()
    close()
  }
}

async function moveFocus(ci: number, value: number): Promise<void> {
  await nextTick()
  optionEl(ci, value)?.focus()
  optionEl(ci, value)?.scrollIntoView?.({ block: 'nearest' })
}

function onPanelKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement
  if (target.getAttribute('role') !== 'option') {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close(true)
    }
    return
  }
  const ci = focusCol.value
  const col = columns.value[ci]
  const enabled = col.options.filter((o) => !o.disabled).map((o) => o.value)
  const current = Number(target.dataset.value)
  const pos = enabled.indexOf(current)
  const go = (value: number | undefined) => {
    if (value === undefined) return
    pick(ci, value)
    moveFocus(ci, value)
  }
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      go(enabled[(pos + 1) % enabled.length])
      break
    case 'ArrowUp':
      event.preventDefault()
      go(enabled[(pos - 1 + enabled.length) % enabled.length])
      break
    case 'Home':
      event.preventDefault()
      go(enabled[0])
      break
    case 'End':
      event.preventDefault()
      go(enabled[enabled.length - 1])
      break
    case 'ArrowRight':
    case 'ArrowLeft': {
      event.preventDefault()
      const next = ci + (event.key === 'ArrowRight' ? 1 : -1)
      if (next < 0 || next >= columns.value.length) return
      focusCol.value = next
      moveFocus(next, focusValue(next))
      break
    }
    case ' ':
      event.preventDefault()
      pick(ci, current)
      break
    case 'Enter':
    case 'Escape':
      event.preventDefault()
      event.stopPropagation()
      close(true)
      break
  }
}

onClickOutside(root, () => close())

const sizeClass = computed(() => {
  const map: Record<ComponentSize, string> = {
    xs: 'text-xs h-control-xs pl-2',
    sm: 'text-sm h-control-sm pl-3',
    md: 'text-base h-control-md pl-4',
    lg: 'text-lg h-control-lg pl-5',
    xl: 'text-xl h-control-xl pl-5',
  }
  return map[props.size]
})

defineExpose({ open: () => open(true), close: () => close(), focus: () => input.value?.focus() })
</script>

<style scoped>
/* 欄位捲軸細一點（三欄並排時預設捲軸會吃掉太多寬度） */
.chpt-time-column {
  scrollbar-width: thin;
}
</style>
