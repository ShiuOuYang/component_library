<template>
  <div
    class="chpt-calendar flex flex-col rounded-lg border border-stroke-light bg-surface-primary"
    :class="props.compact ? 'w-fit p-3' : 'w-full'"
  >
    <!-- 標頭：年月 + 切換 -->
    <div class="flex items-center gap-1" :class="props.compact ? 'mb-2' : 'border-b border-stroke-light px-3 py-2'">
      <h2 :id="titleId" class="flex-1 whitespace-nowrap text-sm font-semibold text-content-primary" aria-live="polite">
        <slot name="header" :year="view.year" :month="view.month">{{ view.year }} 年 {{ view.month }} 月</slot>
      </h2>
      <button
        v-for="nav in navButtons"
        :key="nav.label"
        type="button"
        :aria-label="nav.label"
        :title="nav.label"
        class="inline-flex h-control-xs min-w-control-xs items-center justify-center rounded text-content-secondary hover:bg-surface-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
        @click="nav.action"
      >
        <ChptIcon :size="18" color="current">{{ nav.icon }}</ChptIcon>
      </button>
      <button
        v-if="props.showToday"
        type="button"
        class="ml-1 inline-flex h-control-xs items-center rounded border border-stroke-default px-2 text-xs text-content-primary hover:bg-surface-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
        @click="goToday"
      >今天</button>
    </div>

    <table
      ref="grid"
      role="grid"
      :aria-labelledby="titleId"
      class="table-fixed border-collapse"
      :class="props.compact ? '' : 'w-full'"
      @keydown="onKeydown"
    >
      <thead>
        <tr>
          <th
            v-for="w in weekdays"
            :key="w.index"
            scope="col"
            :abbr="`星期${w.short}`"
            class="pb-1 text-xs font-normal text-content-tertiary"
            :class="props.compact ? 'size-9' : 'px-2 py-1.5 text-right'"
          >{{ w.short }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(week, wi) in weeks" :key="wi">
          <td
            v-for="cell in week"
            :key="cell.key"
            :tabindex="cell.key === focusedKey ? 0 : -1"
            :aria-selected="cell.selected"
            :aria-current="cell.today ? 'date' : undefined"
            :aria-disabled="cell.disabled || undefined"
            :data-date="cell.key"
            class="focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus"
            :class="[
              props.compact ? 'size-9 rounded-md p-0 text-center text-sm' : 'h-24 border border-stroke-light p-1 align-top',
              cellClass(cell),
            ]"
            @click="onCellClick(cell)"
          >
            <span class="sr-only">{{ cell.fullLabel }}</span>
            <span
              aria-hidden="true"
              class="inline-flex items-center justify-center tabular-nums"
              :class="props.compact ? '' : ['float-right size-6 rounded-full text-sm', cell.today && !cell.selected ? 'bg-accent-solid text-content-on-solid' : '']"
            >{{ cell.day }}</span>
            <div v-if="!props.compact && $slots['date-cell']" class="clear-both mt-0.5 min-w-0 overflow-hidden text-xs">
              <slot
                name="date-cell"
                :date="cell.date"
                :date-string="cell.key"
                :day="cell.day"
                :is-today="cell.today"
                :is-selected="cell.selected"
                :in-month="cell.inMonth"
              ></slot>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import ChptIcon from './ChptIcon.vue'

/**
 * ChptCalendar（CHPT 主題） - 月曆
 *
 * 兩種用途：
 *   - 預設（大格子）：排程、值班表、每日產量 —— 用 #date-cell 插槽在每一天放內容
 *   - compact：小月曆，只拿來選日期（放在側欄、卡片裡）
 *
 * 值用 'YYYY-MM-DD' 字串（valueType="date" 時改用 Date），一律以本地時區計算，
 * 避免 new Date('2026-09-01') 被當成 UTC 午夜、在 UTC+8 以外的時區差一天。
 *
 * 無障礙照 WAI-ARIA grid（日期選擇器的月曆）：
 *   - 整個月曆只有一個 Tab 停駐點（目前聚焦的那天）
 *   - ← → 前後一天、↑ ↓ 前後一週、Home / End 本週頭尾、
 *     PageUp / PageDown 上 / 下個月、Shift+PageUp / PageDown 上 / 下一年、Enter / Space 選取
 *   - 今天帶 aria-current="date"，選取的帶 aria-selected；每格有完整日期給螢幕閱讀器
 *   - 年月標題是 live region：切換月份時會唸出來
 */

interface ChptCalendarProps {
  /** v-model：選取的日期 */
  modelValue?: string | Date | null
  /** v-model:month：顯示的月份 'YYYY-MM'（不綁時由元件自己管理） */
  month?: string
  /** 一週從星期幾開始（0 = 星期日） */
  firstDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** 不能選的日期 */
  disabledDate?: (date: Date) => boolean
  /** 小月曆 */
  compact?: boolean
  /** 顯示「今天」按鈕 */
  showToday?: boolean
  /** v-model 的型別 */
  valueType?: 'string' | 'date'
}

const props = withDefaults(defineProps<ChptCalendarProps>(), {
  modelValue: null,
  month: undefined,
  firstDayOfWeek: 0,
  disabledDate: undefined,
  compact: false,
  showToday: true,
  valueType: 'string',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | Date): void
  (e: 'update:month', value: string): void
  (e: 'select', date: Date, dateString: string): void
}>()

const titleId = `${useId()}-title`
const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六']

// ---- 日期工具（全部本地時區） ----

const pad = (n: number) => String(n).padStart(2, '0')
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
function parse(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/.exec(value)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3] ?? 1))
}
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
/** 加 n 個月，日期超過該月天數時收到月底（1/31 + 1 月 = 2/28） */
function addMonths(d: Date, n: number): Date {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), last))
}
const today = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

// ---- 狀態 ----

const selected = computed(() => parse(props.modelValue))
const selectedKey = computed(() => (selected.value ? toKey(selected.value) : ''))

/** 鍵盤焦點所在的日期；顯示的月份永遠是它所在的月份 */
const focused = ref<Date>(parse(props.month) ?? selected.value ?? today())
const focusedKey = computed(() => toKey(focused.value))
const view = computed(() => ({ year: focused.value.getFullYear(), month: focused.value.getMonth() + 1 }))
const monthKey = computed(() => `${view.value.year}-${pad(view.value.month)}`)

watch(monthKey, (key) => {
  if (key !== props.month) emit('update:month', key)
})
watch(
  () => props.month,
  (m) => {
    const d = parse(m)
    if (d && m !== monthKey.value) focused.value = new Date(d.getFullYear(), d.getMonth(), 1)
  }
)
// 選取值從外面改到別的月份時跟過去
watch(selectedKey, () => {
  if (selected.value && toKey(selected.value).slice(0, 7) !== monthKey.value) focused.value = selected.value
})

const weekdays = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const index = (props.firstDayOfWeek + i) % 7
    return { index, short: WEEKDAY[index] }
  })
)

interface Cell {
  key: string
  date: Date
  day: number
  inMonth: boolean
  today: boolean
  selected: boolean
  disabled: boolean
  fullLabel: string
}

/** 固定 6 週（42 格）：切換月份時高度不會跳 */
const weeks = computed<Cell[][]>(() => {
  const first = new Date(view.value.year, view.value.month - 1, 1)
  const offset = (first.getDay() - props.firstDayOfWeek + 7) % 7
  const start = addDays(first, -offset)
  const todayKey = toKey(today())
  const rows: Cell[][] = []
  for (let w = 0; w < 6; w++) {
    const row: Cell[] = []
    for (let i = 0; i < 7; i++) {
      const date = addDays(start, w * 7 + i)
      const key = toKey(date)
      row.push({
        key,
        date,
        day: date.getDate(),
        inMonth: date.getMonth() === view.value.month - 1,
        today: key === todayKey,
        selected: key === selectedKey.value,
        disabled: !!props.disabledDate?.(date),
        fullLabel: `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日 星期${WEEKDAY[date.getDay()]}`,
      })
    }
    rows.push(row)
  }
  return rows
})

function cellClass(cell: Cell): string {
  if (props.compact) {
    if (cell.disabled) return 'cursor-not-allowed text-content-disabled line-through'
    if (cell.selected) return 'cursor-pointer bg-accent-solid font-semibold text-content-on-solid'
    const base = 'cursor-pointer hover:bg-surface-tertiary'
    if (cell.today) return `${base} font-semibold text-accent ring-1 ring-inset ring-accent`
    return `${base} ${cell.inMonth ? 'text-content-primary' : 'text-content-tertiary'}`
  }
  const tone = cell.inMonth ? 'text-content-primary' : 'bg-surface-secondary text-content-tertiary'
  if (cell.disabled) return `cursor-not-allowed ${tone} opacity-60`
  if (cell.selected) return 'cursor-pointer bg-accent-subtle text-accent-on-subtle'
  return `cursor-pointer ${tone} hover:bg-surface-tertiary`
}

// ---- 操作 ----

const grid = useTemplateRef<HTMLTableElement>('grid')

/** 移動焦點日期；moveDomFocus 時把瀏覽器焦點也移過去（鍵盤操作） */
async function moveTo(date: Date, moveDomFocus: boolean): Promise<void> {
  focused.value = date
  if (!moveDomFocus) return
  await nextTick()
  // 用 data-date 找：換月時同一天會搬到別的週（別的 <tr>），元素是重建的
  grid.value?.querySelector<HTMLElement>(`td[data-date="${focusedKey.value}"]`)?.focus()
}

function select(cell: Cell): void {
  if (cell.disabled) return
  emit('update:modelValue', props.valueType === 'date' ? cell.date : cell.key)
  emit('select', cell.date, cell.key)
}

function onCellClick(cell: Cell): void {
  if (cell.disabled) return
  moveTo(cell.date, true)
  select(cell)
}

function goToday(): void {
  moveTo(today(), false)
}

const navButtons = computed(() => [
  { label: '上一年', icon: 'keyboard_double_arrow_left', action: () => moveTo(addMonths(focused.value, -12), false) },
  { label: '上個月', icon: 'chevron_left', action: () => moveTo(addMonths(focused.value, -1), false) },
  { label: '下個月', icon: 'chevron_right', action: () => moveTo(addMonths(focused.value, 1), false) },
  { label: '下一年', icon: 'keyboard_double_arrow_right', action: () => moveTo(addMonths(focused.value, 12), false) },
])

function onKeydown(event: KeyboardEvent): void {
  const d = focused.value
  let next: Date | null = null
  switch (event.key) {
    case 'ArrowLeft':
      next = addDays(d, -1)
      break
    case 'ArrowRight':
      next = addDays(d, 1)
      break
    case 'ArrowUp':
      next = addDays(d, -7)
      break
    case 'ArrowDown':
      next = addDays(d, 7)
      break
    case 'Home':
      next = addDays(d, -((d.getDay() - props.firstDayOfWeek + 7) % 7))
      break
    case 'End':
      next = addDays(d, 6 - ((d.getDay() - props.firstDayOfWeek + 7) % 7))
      break
    case 'PageUp':
      next = addMonths(d, event.shiftKey ? -12 : -1)
      break
    case 'PageDown':
      next = addMonths(d, event.shiftKey ? 12 : 1)
      break
    case 'Enter':
    case ' ': {
      event.preventDefault()
      const cell = weeks.value.flat().find((c) => c.key === focusedKey.value)
      if (cell) select(cell)
      return
    }
    default:
      return
  }
  event.preventDefault()
  moveTo(next, true)
}

defineExpose({
  /** 跳到某一天所在的月份（不改選取值） */
  goTo: (value: string | Date) => {
    const d = parse(value)
    if (d) moveTo(d, false)
  },
})
</script>
