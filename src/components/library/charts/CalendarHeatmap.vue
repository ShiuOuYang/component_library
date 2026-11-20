<template>
  <div class="calendar-heatmap flex flex-col gap-2">
    <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
    <div class="flex max-w-full">
      <!-- 星期標籤在捲動區外面：範圍很長、捲到最近的日子時仍看得到 -->
      <svg v-if="props.showWeekdays" :width="WEEKDAY_W" :height="layout.height" class="flex-shrink-0" aria-hidden="true">
        <text
          v-for="r in weekdayRows"
          :key="r"
          :x="0"
          :y="layout.top + r * pitch + props.cellSize - 3"
          font-size="10"
          :style="{ fill: chartTheme.textMuted }"
        >{{ weekdayLabel(r) }}</text>
      </svg>
      <div ref="scroller" class="relative min-w-0 overflow-x-auto">
        <svg
          ref="svg"
          :width="layout.width"
          :height="layout.height"
          class="block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--t-stroke-focus))]"
          tabindex="0"
          role="application"
          :aria-label="ariaLabel"
          @keydown="onKey"
          @blur="cursor = null"
          @mouseleave="cursor = null"
        >
          <!-- 月份 -->
          <g v-if="props.showMonths">
            <text
              v-for="m in calendar.months"
              :key="m.col"
              :x="layout.left + m.col * pitch"
              :y="10"
              font-size="11"
              :style="{ fill: chartTheme.textMuted }"
            >{{ monthLabel(m.date) }}</text>
          </g>
          <!-- 每天一格 -->
          <rect
            v-for="(c, i) in calendar.cells"
            :key="c.key"
            :x="layout.left + c.col * pitch"
            :y="layout.top + c.row * pitch"
            :width="props.cellSize"
            :height="props.cellSize"
            :rx="Math.min(3, props.cellSize / 4)"
            :style="cellStyle(c)"
            :class="clickable ? 'cursor-pointer' : ''"
            :data-date="c.key"
            @mouseenter="cursor = i"
            @click="clickCell(i)"
          />
          <!-- 目前的格子（滑鼠或鍵盤） -->
          <rect
            v-if="cursorCell"
            :x="layout.left + cursorCell.col * pitch - 1.5"
            :y="layout.top + cursorCell.row * pitch - 1.5"
            :width="props.cellSize + 3"
            :height="props.cellSize + 3"
            :rx="Math.min(4, props.cellSize / 3)"
            fill="none"
            :style="{ stroke: chartTheme.accent }"
            stroke-width="2"
            pointer-events="none"
          />
        </svg>
        <div
          v-if="cursorCell"
          class="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border px-2 py-1 text-xs shadow-md"
          :style="{ ...tooltipStyle, background: chartTheme.surface, borderColor: chartTheme.border, color: chartTheme.text }"
          data-export-ignore
        >
          <div class="font-medium">{{ fullDate(cursorCell.date) }}</div>
          <div class="text-content-secondary">{{ valueText(cursorCell.value) }}</div>
        </div>
      </div>
    </div>

    <!-- 圖例：少 → 多，每一格滑過顯示範圍 -->
    <div v-if="props.showLegend" class="flex flex-wrap items-center gap-1 text-xs text-content-secondary" role="group" :aria-label="i18n.calendarHeatmap.legend">
      <span class="mr-0.5">{{ i18n.calendarHeatmap.less }}</span>
      <span
        v-for="(color, i) in palette"
        :key="i"
        class="inline-block rounded-sm"
        :style="{ width: `${props.cellSize}px`, height: `${props.cellSize}px`, background: color }"
        role="img"
        :aria-label="rangeText(i)"
        :title="rangeText(i)"
      ></span>
      <span class="ml-0.5">{{ i18n.calendarHeatmap.more }}</span>
      <span class="ml-3 inline-block rounded-sm border" :style="{ width: `${props.cellSize}px`, height: `${props.cellSize}px`, borderColor: chartTheme.border }" aria-hidden="true"></span>
      <span>{{ i18n.calendarHeatmap.noData }}</span>
    </div>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, ref, watch } from 'vue'
import * as d3 from 'd3'
import { chartTheme } from './chartTheme'
import { useLocale } from '../shared/config'
import { tooltipPlacement } from './utils/tooltipPlacement'
import {
  buildCalendar,
  calendarRange,
  dateKey,
  evenThresholds,
  levelOf,
  levelRange,
  valuesByDay,
  type CalendarCell,
  type CalendarDatum,
} from './utils/calendarHeatmap'

/**
 * CalendarHeatmap —— 日曆熱圖（每天一格，顏色深淺代表數值）
 *
 * 用途：看「哪幾天特別多 / 特別少」與週期性 —— 每日異常件數、停機分鐘、良率、出勤。
 * 一欄一週、一列一個星期幾，所以「每週一都特別多」這種規律一眼就看得出來，折線圖反而看不出來。
 *
 * - 分級：預設把最小～最大值等分成 5 級（同一個色系由淺到深）；可給 thresholds 指定門檻、colors 指定顏色
 * - 沒有資料的日子只畫外框（和「值是 0」的最淺色不同，深色模式也分得出來）；今天加粗外框
 * - 範圍比容器寬時可水平捲動，一開始捲到最右邊（最近的日子）
 * - 同一天有多筆時加總
 * - 鍵盤：Tab 進入後 ↑↓ 前後一天、←→ 前後一週、Home / End 第一天 / 最後一天、Enter 等同點擊；目前的格子以 aria-live 念出
 */

interface CalendarHeatmapProps {
  data: CalendarDatum[]
  /** 起始日；不給時取資料最早的一天 */
  start?: string | Date | null
  /** 結束日；不給時取資料最晚的一天（都沒有時為今天往前 12 週） */
  end?: string | Date | null
  /** 一週從星期幾開始：1 週一、0 週日 */
  weekStart?: 0 | 1
  /** 格子大小（px） */
  cellSize?: number
  /** 格子間距（px） */
  cellGap?: number
  /** 分幾級（沒給 thresholds / colors 時） */
  levels?: number
  /** 分級門檻（遞增）：值 < 第一個為最淺，>= 最後一個為最深；共 thresholds.length + 1 級 */
  thresholds?: number[] | null
  /** 各級顏色（由少到多）；不給時用主色由淺到深 */
  colors?: string[] | null
  /** 自動分級的範圍；不給時取資料的最小～最大值 */
  domain?: [number, number] | null
  title?: string
  /** 單位（tooltip 與念出的數值後面） */
  unit?: string
  valueFormat?: ((value: number) => string) | null
  showLegend?: boolean
  showMonths?: boolean
  showWeekdays?: boolean
  /** 今天加外框 */
  markToday?: boolean
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const i18n = useLocale()
const props = withDefaults(defineProps<CalendarHeatmapProps>(), {
  start: null,
  end: null,
  weekStart: 1,
  cellSize: 14,
  cellGap: 3,
  levels: 5,
  thresholds: null,
  colors: null,
  domain: null,
  title: '',
  unit: '',
  valueFormat: null,
  showLegend: true,
  showMonths: true,
  showWeekdays: true,
  markToday: true,
})

const emit = defineEmits<{
  /** 點擊（或按 Enter）某一天；date 為 'YYYY-MM-DD' */
  (e: 'cell-click', cell: { date: string; value: number | null }): void
}>()

/** 有綁 @cell-click 時格子顯示手形游標 */
const instance = getCurrentInstance()
const clickable = computed(() => !!instance?.vnode.props?.onCellClick)

const todayKey = dateKey(new Date())
const pitch = computed(() => props.cellSize + props.cellGap)
const values = computed(() => valuesByDay(props.data))
const range = computed(() => calendarRange(props.data, props.start, props.end))
const calendar = computed(() => buildCalendar(range.value.start, range.value.end, props.weekStart, values.value))

const layout = computed(() => {
  const left = 0
  const top = props.showMonths ? 16 : 0
  return {
    left,
    top,
    width: left + Math.max(1, calendar.value.weeks) * pitch.value - props.cellGap,
    height: top + 7 * pitch.value - props.cellGap,
  }
})

// ---- 分級與顏色 ----
const thresholds = computed(() => {
  if (props.thresholds?.length) return [...props.thresholds].sort((a, b) => a - b)
  const levels = props.colors?.length || props.levels
  const vs = [...values.value.values()]
  const [min, max] = props.domain ?? (vs.length ? [Math.min(...vs), Math.max(...vs)] : [0, 1])
  return evenThresholds(min, max, Math.max(2, levels))
})
const palette = computed(() => {
  const n = thresholds.value.length + 1
  return Array.from({ length: n }, (_, i) => props.colors?.[i] ?? `rgb(var(--t-chart-1) / ${(0.25 + (0.75 * i) / Math.max(1, n - 1)).toFixed(2)})`)
})
function cellStyle(c: CalendarCell): Record<string, string | number> {
  const today = props.markToday && c.key === todayKey
  if (c.value === null) return { fill: 'transparent', stroke: today ? chartTheme.text : chartTheme.border, strokeWidth: today ? 1.5 : 1 }
  return { fill: palette.value[levelOf(c.value, thresholds.value)], stroke: today ? chartTheme.text : 'none', strokeWidth: 1.5 }
}

// ---- 文字 ----
const defaultFormat = d3.format(',~f')
const fmt = (v: number) => (props.valueFormat ? props.valueFormat(v) : defaultFormat(Number(v.toPrecision(6))))
const valueText = (v: number | null) => (v === null ? i18n.value.calendarHeatmap.noData : `${fmt(v)}${props.unit ? ` ${props.unit}` : ''}`)
const fullDate = (d: Date) => i18n.value.calendar.fullDate(d.getFullYear(), d.getMonth() + 1, d.getDate(), i18n.value.calendar.weekdaysLong[d.getDay()])
const monthLabel = (d: Date) => new Intl.DateTimeFormat(i18n.value.code, { month: 'short' }).format(d)
/** 星期標籤欄的寬度 */
const WEEKDAY_W = 24
const weekdayLabel = (row: number) => i18n.value.calendar.weekdaysShort[(row + props.weekStart) % 7]
/** 標一、三、五（隔一列標一個，避免擠） */
const weekdayRows = computed(() => (props.weekStart === 1 ? [0, 2, 4] : [1, 3, 5]))
function rangeText(i: number): string {
  const { from, to } = levelRange(i, thresholds.value)
  return i18n.value.calendarHeatmap.range(from === null ? null : fmt(from), to === null ? null : fmt(to))
}
const ariaLabel = computed(() => {
  const days = calendar.value.cells.filter((c) => c.value !== null).length
  return i18n.value.calendarHeatmap.ariaLabel(props.title, fullDate(range.value.start), fullDate(range.value.end), days)
})

// ---- 游標（滑鼠、鍵盤）與 tooltip ----
const svg = ref<SVGSVGElement | null>(null)
const cursor = ref<number | null>(null)
const cursorCell = computed(() => (cursor.value === null ? null : calendar.value.cells[cursor.value] ?? null))
const announcement = computed(() => (cursorCell.value ? i18n.value.calendarHeatmap.cell(fullDate(cursorCell.value.date), valueText(cursorCell.value.value)) : ''))
const tooltipStyle = computed(() => {
  const c = cursorCell.value!
  const x = layout.value.left + c.col * pitch.value + props.cellSize
  const y = layout.value.top + c.row * pitch.value + props.cellSize
  return tooltipPlacement(x - 6, y - 6, layout.value.width, Math.max(layout.value.height, 120), 180, 60)
})

function clickCell(i: number): void {
  const c = calendar.value.cells[i]
  if (c) emit('cell-click', { date: c.key, value: c.value })
}

function onKey(event: KeyboardEvent): void {
  const cells = calendar.value.cells
  if (!cells.length) return
  const cur = cursor.value
  const move = (days: number) => {
    const base = cur === null ? 0 : cur
    return Math.min(cells.length - 1, Math.max(0, base + days))
  }
  let next: number | null = null
  switch (event.key) {
    case 'ArrowDown':
      next = cur === null ? 0 : move(1)
      break
    case 'ArrowUp':
      next = cur === null ? 0 : move(-1)
      break
    case 'ArrowRight':
      next = cur === null ? 0 : move(7)
      break
    case 'ArrowLeft':
      next = cur === null ? 0 : move(-7)
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = cells.length - 1
      break
    case 'Enter':
    case ' ':
      if (cur !== null) {
        event.preventDefault()
        clickCell(cur)
      }
      return
    case 'Escape':
      cursor.value = null
      return
    default:
      return
  }
  event.preventDefault()
  cursor.value = next
  revealCursor()
}

// ---- 水平捲動：一開始捲到最近的日子；鍵盤移動時讓游標保持在可見範圍 ----
const scroller = ref<HTMLDivElement | null>(null)
function scrollToEnd(): void {
  if (scroller.value) scroller.value.scrollLeft = scroller.value.scrollWidth
}
function revealCursor(): void {
  const el = scroller.value
  const c = cursorCell.value
  if (!el || !c) return
  const x = layout.value.left + c.col * pitch.value
  if (x < el.scrollLeft + layout.value.left) el.scrollLeft = x - layout.value.left
  else if (x + props.cellSize > el.scrollLeft + el.clientWidth) el.scrollLeft = x + props.cellSize - el.clientWidth
}
onMounted(scrollToEnd)
watch(range, () => void nextTick(scrollToEnd))

defineExpose({
  /** 把游標移到某一天（'YYYY-MM-DD'）；不在範圍內時不動，回傳是否成功 */
  focusDate(date: string): boolean {
    const i = calendar.value.cells.findIndex((c) => c.key === date)
    if (i < 0) return false
    cursor.value = i
    svg.value?.focus()
    return true
  },
})

</script>
