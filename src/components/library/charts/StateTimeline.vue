<template>
  <div ref="containerRef" class="state-timeline" :style="containerStyle">
    <div v-if="title || showLegend" class="stl-head">
      <p v-if="title" class="stl-title text-sm font-semibold text-content-primary">{{ title }}</p>
      <!-- 圖例：顏色一定配文字 -->
      <ul v-if="showLegend" class="stl-legend" aria-label="狀態圖例">
        <li v-for="s in legendItems" :key="s.value">
          <span class="stl-swatch" :style="{ background: s.color }" aria-hidden="true"></span>{{ s.label }}
        </li>
      </ul>
      <button
        v-if="isZoomed"
        type="button"
        class="ml-auto rounded-md border border-stroke-light bg-surface-primary/80 px-2.5 py-1 text-xs text-content-secondary shadow-sm hover:bg-surface-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
        @click="resetZoom"
      >
        重設縮放
      </button>
    </div>

    <svg
      ref="svgRef"
      class="stl-svg"
      :class="{ 'is-zoomable': enableZoom }"
      :width="effectiveWidth"
      :height="svgHeight"
      role="img"
      tabindex="0"
      :aria-label="ariaSummary"
      @mousemove="onMouseMove"
      @mouseleave="clearHover"
      @click="onClick"
      @keydown="onKeydown"
      @blur="clearHover"
      @wheel="onWheel"
    >
      <!-- 時間軸：上層日期、下層時刻 -->
      <g class="stl-axis" :transform="`translate(${plotLeft}, 0)`" aria-hidden="true">
        <g v-for="u in upperTicks" :key="`u${u.start}`">
          <line class="stl-upper-line" :x1="u.x" :x2="u.x" :y1="0" :y2="AXIS_H + rowsHeight" />
          <text v-if="u.showLabel" class="stl-upper" :x="u.labelX" :y="13">{{ u.label }}</text>
        </g>
        <g v-for="t in lowerTicks" :key="`l${t.value}`">
          <line class="stl-grid" :x1="t.x" :x2="t.x" :y1="AXIS_H - 6" :y2="AXIS_H + rowsHeight" />
          <text v-if="t.showLabel" class="stl-tick" :x="t.x + 3" :y="AXIS_H - 8">{{ t.label }}</text>
        </g>
      </g>

      <!-- 統計欄標題 -->
      <g v-if="showSummary" class="stl-summary-head" aria-hidden="true">
        <text :x="summaryLeft + 8" :y="AXIS_H - 8">稼動率</text>
        <text :x="effectiveWidth - margin.right" :y="AXIS_H - 8" text-anchor="end">停機</text>
      </g>

      <g v-for="row in rowViews" :key="row.key" class="stl-row" :class="{ 'is-hovered': hover?.row === row.index }">
        <rect class="stl-row-bg" :x="0" :y="row.y" :width="effectiveWidth" :height="rowHeight" />
        <text class="stl-label" :x="labelRight" :y="row.cy" text-anchor="end" dominant-baseline="central">
          <title>{{ row.label }}</title>{{ row.labelText }}
        </text>
        <!-- 依像素合併後的狀態段 -->
        <g :transform="`translate(${plotLeft}, ${row.barY})`">
          <rect
            v-for="(r, i) in row.runs"
            :key="i"
            class="stl-run"
            :x="r.x0"
            :y="0"
            :width="r.x1 - r.x0"
            :height="barHeight"
            :style="{ fill: colorOf(r.state) }"
          />
        </g>
        <!-- 統計：數字 + 圖示 + 文字，不只靠顏色 -->
        <g v-if="showSummary && row.summary" class="stl-summary">
          <g v-if="row.status" class="stl-status" :class="`is-${row.status.level}`">
            <circle :cx="summaryLeft + 15" :cy="row.cy" r="7" />
            <text class="stl-status-icon" :x="summaryLeft + 15" :y="row.cy" text-anchor="middle" dominant-baseline="central">{{ row.status.icon }}</text>
          </g>
          <text class="stl-util" :x="summaryLeft + 28" :y="row.cy" dominant-baseline="central">
            {{ row.utilText }}<tspan v-if="row.status" class="stl-status-label" dx="4">{{ row.status.label }}</tspan>
          </text>
          <text class="stl-down" :x="effectiveWidth - margin.right" :y="row.cy" text-anchor="end" dominant-baseline="central">{{ row.downText }}</text>
        </g>
      </g>

      <!-- 滑鼠或鍵盤指到的那一段：外框 -->
      <rect
        v-if="hoverBox"
        class="stl-hover-box"
        :x="hoverBox.x"
        :y="hoverBox.y"
        :width="hoverBox.w"
        :height="barHeight"
        aria-hidden="true"
      />
      <line
        v-if="nowX !== null"
        class="stl-now"
        :x1="nowX" :x2="nowX" :y1="AXIS_H - 4" :y2="AXIS_H + rowsHeight"
        aria-hidden="true"
      />
    </svg>

    <p v-if="!rowViews.length" class="stl-empty text-sm text-content-tertiary">{{ emptyText }}</p>
    <p class="sr-only" aria-live="polite">{{ liveText }}</p>

    <slot name="tooltip" :tooltip-data="tooltipData" :tooltip-visible="tooltipVisible">
      <div
        v-if="tooltipVisible && tooltipData && enableTooltip"
        class="pointer-events-none absolute z-30 min-w-36 rounded-md border border-stroke-light bg-surface-primary px-2.5 py-1.5 text-xs shadow-lg"
        role="tooltip"
        :style="tooltipStyle"
      >
        <div class="flex items-center gap-1.5">
          <span class="h-2.5 w-2.5 rounded-sm" :style="{ background: tooltipData.color }" aria-hidden="true"></span>
          <span class="text-sm font-semibold text-content-primary">{{ tooltipData.stateLabel }}</span>
          <span class="text-content-secondary">{{ tooltipData.durationText }}</span>
        </div>
        <div class="text-content-secondary">{{ tooltipData.rowLabel }}</div>
        <div class="text-content-tertiary">{{ tooltipData.rangeText }}</div>
        <div v-for="line in tooltipLines" :key="line" class="text-content-tertiary">{{ line }}</div>
      </div>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, toRaw, watch } from 'vue'
import * as d3 from 'd3'
import { chartPalette } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { estimateTextWidth } from './utils/chartText'
import { formatDuration, parseTime, timeTiers, upperSegments } from './utils/gantt'
import { truncateText } from './utils/horizontalBar'
import {
  dominantSegment,
  normalizeStates,
  rasterizeRow,
  segmentAt,
  summarizeRow,
  type StateDef,
  type StateSegment,
  type StateSummary,
} from './utils/stateTimeline'
import { tooltipPlacement } from './utils/tooltipPlacement'

/**
 * StateTimeline —— 機台狀態時間軸
 *
 * - 每台機台一列，用顏色畫出實際發生過的狀態（運轉、待機、故障、保養…）
 * - 紀錄可以只有開始時間：下一筆開始就是這一筆結束；最後一筆畫到「現在」
 * - 資料量大也不卡：每列依像素合併，一列最多畫「寬度」個矩形；
 *   一個像素裡有故障就畫故障（priority），短暫停機不會被運轉蓋掉
 * - 右側統計稼動率與停機（次數、時間），可依稼動率或停機時間排序，看哪台停最久
 * - Ctrl + 滾輪縮放、拖曳平移；統計跟著目前看到的範圍（summaryScope="view"）
 */

/** 段落事件的 payload */
export interface StateTimelineEvent {
  datum: Record<string, unknown>
  row: string
  rowLabel: string
  state: string
  stateLabel: string
  start: Date
  end: Date
  /** 毫秒 */
  duration: number
  /** 結束時間是推算的（下一筆的開始，或還在進行中） */
  openEnded: boolean
}

/** 提示框的資料 */
export interface StateTimelineTooltip extends StateTimelineEvent {
  color: string
  durationText: string
  rangeText: string
  position: { containerX: number; containerY: number }
}

/** 列的設定：字串就是機台代號；物件可另給顯示文字 */
export type StateTimelineRowInput = string | number | { value: string | number; label?: string }

type Row = Record<string, unknown>
type TimeInput = Date | number | string

interface StateTimelineProps {
  // === 基礎配置 ===
  width?: number
  /** 只在 autoResize 時用來量容器；圖高依機台數決定（rowHeight × 列數） */
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  margin?: { top: number; right: number; bottom: number; left: number }

  // === 數據配置 ===
  data: Row[]
  rowField?: string
  stateField?: string
  startField?: string
  /** 結束時間欄位；沒有（null）或某筆空白時，用同一台下一筆的開始時間 */
  endField?: string | null
  /** 列的順序與顯示文字；沒列到的機台依出現順序接在後面 */
  rows?: StateTimelineRowInput[]
  /** 狀態的顏色與文字 */
  states?: StateDef[]
  /** 不在 states 裡的狀態用的顏色 */
  unknownStateColor?: string

  // === 時間配置 ===
  /** 顯示的時間範圍；未指定時用資料的範圍 */
  timeDomain?: [TimeInput, TimeInput] | null
  /** 每台最後一筆沒有結束時間時畫到哪裡；未指定時用 timeDomain 的結束，再沒有就用現在 */
  openEndTime?: TimeInput | null
  /** 畫一條「現在」的線 */
  showNow?: boolean
  /** 現在的時間（測試或重播用）；未指定時用 Date.now() */
  now?: TimeInput | null
  /** 下層刻度的格式；未指定時依縮放程度自動決定 */
  timeFormat?: ((d: Date) => string) | null

  // === 統計配置 ===
  showSummary?: boolean
  /** 統計的範圍：目前看到的範圍（view）或全部資料（all） */
  summaryScope?: 'view' | 'all'
  /** 算「運轉」的狀態 */
  runStates?: string[]
  /** 算「停機」的狀態 */
  downStates?: string[]
  /** 不列入稼動率分母的狀態（例如計畫保養） */
  excludeStates?: string[]
  /** 稼動率門檻 [尚可, 達標]：低於第一個為「偏低」 */
  utilizationThresholds?: [number, number]
  /** 列的排序：原順序、稼動率由低到高、停機時間由多到少 */
  sortRows?: 'none' | 'utilization' | 'downTime'

  // === 版面配置 ===
  rowHeight?: number
  /** 左側機台名稱欄寬；未指定時依最長的名稱（最多圖寬的 25%） */
  labelWidth?: number | null
  summaryWidth?: number

  // === 視覺配置 ===
  title?: string
  showLegend?: boolean
  emptyText?: string

  // === 互動配置 ===
  enableTooltip?: boolean
  enableZoom?: boolean
  /** 滾輪縮放要按住的鍵（none 時直接滾就縮放，頁面會捲不動） */
  wheelZoomModifier?: 'none' | 'ctrl' | 'alt'
  /** 最多放大到畫面只剩這麼長的時間（毫秒） */
  minVisibleSpan?: number

  // === 企業級擴展點 ===
  customRenderers?: {
    /** 自訂提示框內容（每行一個字串，加在時間範圍之下） */
    tooltip?: (event: StateTimelineEvent) => string[]
  }
}

const props = withDefaults(defineProps<StateTimelineProps>(), {
  width: 800,
  height: 320,
  autoResize: false,
  debounceDelay: 150,
  margin: () => ({ top: 4, right: 12, bottom: 8, left: 8 }),
  rowField: 'machine',
  stateField: 'state',
  startField: 'start',
  endField: 'end',
  rows: () => [],
  states: () => [
    { value: 'run', label: '運轉', color: chartPalette.good, priority: 0 },
    { value: 'idle', label: '待機', color: chartPalette.warning, priority: 1 },
    { value: 'maintenance', label: '保養', color: 'rgb(var(--t-info-solid))', priority: 2 },
    { value: 'down', label: '故障', color: chartPalette.critical, priority: 3 },
  ],
  unknownStateColor: chartPalette.other,
  timeDomain: null,
  openEndTime: null,
  showNow: false,
  now: null,
  timeFormat: null,
  showSummary: true,
  summaryScope: 'view',
  runStates: () => ['run'],
  downStates: () => ['down'],
  excludeStates: () => ['maintenance'],
  utilizationThresholds: () => [0.6, 0.85],
  sortRows: 'none',
  rowHeight: 28,
  labelWidth: null,
  summaryWidth: 240,
  title: '',
  showLegend: true,
  emptyText: '沒有資料',
  enableTooltip: true,
  enableZoom: true,
  wheelZoomModifier: 'ctrl',
  minVisibleSpan: 10 * 60_000,
  customRenderers: () => ({}),
})

const emit = defineEmits<{
  'chart-ready': [payload: { width: number; height: number }]
  'chart-resize': [payload: { width: number; height: number }]
  'segment-hover': [payload: StateTimelineEvent]
  'segment-click': [payload: StateTimelineEvent]
  'summary-change': [payload: StateSummary[]]
  'zoom-change': [payload: { timeDomain: [Date, Date] }]
  'zoom-reset': []
  'tooltip-show': [payload: StateTimelineTooltip]
  'tooltip-hide': []
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)

const { effectiveWidth } = useAutoResize(containerRef, props, (size) => emit('chart-resize', size))

// === 狀態定義 ===

const stateMap = computed(() => new Map(props.states.map((s) => [s.value, s])))
const colorOf = (state: string) => stateMap.value.get(state)?.color ?? props.unknownStateColor
const labelOf = (state: string) => stateMap.value.get(state)?.label ?? (state || '（未知）')
const priorityOf = (state: string) => stateMap.value.get(state)?.priority ?? 0

// === 資料 ===

const nowTime = ref(Date.now())
let nowTimer: ReturnType<typeof setInterval> | null = null
const currentNow = computed(() => {
  const t = parseTime(props.now)
  return Number.isFinite(t) ? t : nowTime.value
})

/**
 * 範圍的數值沒變時沿用上一個陣列。
 * 🔧 呼叫端常寫 :time-domain="[start, end]"，每次重新渲染都是新陣列 —— 不沿用的話整張圖跟著重算，
 *    父層若在 summary-change 裡改了自己的狀態，就會一直重繪下去
 */
function keepRange(prev: [number, number] | null | undefined, next: [number, number] | null): [number, number] | null {
  return prev && next && prev[0] === next[0] && prev[1] === next[1] ? prev : next
}

const fixedDomain = computed<[number, number] | null>((prev) => {
  if (!props.timeDomain) return null
  const a = parseTime(props.timeDomain[0])
  const b = parseTime(props.timeDomain[1])
  return keepRange(prev, Number.isFinite(a) && Number.isFinite(b) && b > a ? [a, b] : null)
})

const openEnd = computed(() => {
  const t = parseTime(props.openEndTime)
  if (Number.isFinite(t)) return t
  return fixedDomain.value ? fixedDomain.value[1] : currentNow.value
})

const rowInputs = computed(() =>
  props.rows.map((r) => (typeof r === 'object' && r !== null ? { value: String(r.value), label: r.label } : { value: String(r), label: undefined }))
)

const normalized = computed(() =>
  normalizeStates(props.data ?? [], {
    rowField: props.rowField,
    stateField: props.stateField,
    startField: props.startField,
    endField: props.endField,
    openEnd: openEnd.value,
    rows: rowInputs.value.map((r) => r.value),
  })
)

const rowLabelOf = (key: string) => rowInputs.value.find((r) => r.value === key)?.label ?? key

/** 資料的時間範圍 */
const baseDomain = computed<[number, number]>((prev) => keepRange(prev, computeBaseDomain())!)

function computeBaseDomain(): [number, number] {
  if (fixedDomain.value) return fixedDomain.value
  let lo = Infinity
  let hi = -Infinity
  for (const list of normalized.value.byRow) {
    if (!list.length) continue
    lo = Math.min(lo, list[0].start)
    hi = Math.max(hi, list[list.length - 1].end)
  }
  if (!Number.isFinite(lo)) {
    const t = currentNow.value
    return [t - 86_400_000, t]
  }
  return hi > lo ? [lo, hi] : [lo, lo + 3_600_000]
}

// === 版面 ===

const AXIS_H = 34
const LABEL_FONT = 12

const labelColumn = computed(() => {
  if (props.labelWidth !== null) return props.labelWidth
  let max = 0
  for (const key of normalized.value.rows) max = Math.max(max, estimateTextWidth(rowLabelOf(key), LABEL_FONT))
  return Math.min(Math.max(48, Math.ceil(max) + 16), Math.floor(effectiveWidth.value * 0.25))
})

const labelRight = computed(() => props.margin.left + labelColumn.value - 8)
const plotLeft = computed(() => props.margin.left + labelColumn.value)
const summaryLeft = computed(() => effectiveWidth.value - props.margin.right - (props.showSummary ? props.summaryWidth : 0))
const plotWidth = computed(() => Math.max(0, Math.floor(summaryLeft.value - plotLeft.value - (props.showSummary ? 8 : 0))))

const rowsHeight = computed(() => normalized.value.rows.length * props.rowHeight)
const svgHeight = computed(() => AXIS_H + rowsHeight.value + props.margin.bottom)
/** 色帶粗細：列與列之間留縫，看得出是不同機台 */
const barHeight = computed(() => Math.max(4, props.rowHeight - 8))

const containerStyle = computed(() => ({ width: props.autoResize ? '100%' : `${props.width}px` }))

// === 縮放 ===

/** 目前看到的範圍；null = 全覽 */
const viewDomain = shallowRef<[number, number] | null>(null)
const isZoomed = computed(() => viewDomain.value !== null)
const domain = computed<[number, number]>(() => viewDomain.value ?? baseDomain.value)

const xScale = computed(() => d3.scaleTime().domain(domain.value.map((t) => new Date(t))).range([0, plotWidth.value]))

function setView(next: [number, number] | null): void {
  const [b0, b1] = baseDomain.value
  if (next) {
    let [a, b] = next
    const minSpan = Math.min(props.minVisibleSpan, b1 - b0)
    if (b - a < minSpan) {
      const mid = (a + b) / 2
      a = mid - minSpan / 2
      b = mid + minSpan / 2
    }
    // 不平移到資料範圍外
    const span = Math.min(b - a, b1 - b0)
    a = Math.min(Math.max(a, b0), b1 - span)
    b = a + span
    next = b - a >= (b1 - b0) * (1 - 1e-9) ? null : [a, b]
  }
  const prev = viewDomain.value
  if (prev === next || (prev && next && prev[0] === next[0] && prev[1] === next[1])) return
  viewDomain.value = next
  if (next) emit('zoom-change', { timeDomain: [new Date(next[0]), new Date(next[1])] })
  else emit('zoom-reset')
}

function resetZoom(): void {
  setView(null)
}

/** 縮放到某個時間範圍 */
function zoomTo(start: TimeInput, end: TimeInput): void {
  const a = parseTime(start)
  const b = parseTime(end)
  if (Number.isFinite(a) && Number.isFinite(b) && b > a) setView([a, b])
}

function wheelModifierPressed(event: WheelEvent): boolean {
  if (props.wheelZoomModifier === 'ctrl') return event.ctrlKey || event.metaKey
  if (props.wheelZoomModifier === 'alt') return event.altKey
  return true
}

/** 滑鼠在繪圖區的 X（px）；不在繪圖區時 null */
function plotXOf(event: MouseEvent): number | null {
  const svg = svgRef.value
  if (!svg) return null
  const rect = svg.getBoundingClientRect()
  const x = event.clientX - rect.left - plotLeft.value
  return x >= 0 && x <= plotWidth.value ? x : null
}

/** Ctrl + 滾輪：以游標為中心縮放；左右滑（或 Shift + 滾輪）：平移 */
function onWheel(event: WheelEvent): void {
  if (!props.enableZoom) return
  const x = plotXOf(event)
  if (x === null) return
  const [d0, d1] = domain.value
  const span = d1 - d0
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1
  const horizontal = event.shiftKey && event.deltaX === 0 ? event.deltaY : Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0
  if (horizontal !== 0) {
    if (!isZoomed.value) return
    event.preventDefault()
    const shift = (horizontal * unit / Math.max(1, plotWidth.value)) * span
    setView([d0 + shift, d1 + shift])
    return
  }
  if (!wheelModifierPressed(event)) return
  const k = Math.exp(event.deltaY * unit * 0.002)
  // 全覽時往外縮沒有作用：交還給頁面
  if (k > 1 && !isZoomed.value) return
  event.preventDefault()
  const anchor = d0 + (x / Math.max(1, plotWidth.value)) * span
  setView([anchor - (anchor - d0) * k, anchor + (d1 - anchor) * k])
}

// 拖曳平移
let drag: { x: number; domain: [number, number]; moved: boolean } | null = null
const isPanning = ref(false)

function onMouseDown(event: MouseEvent): void {
  if (!props.enableZoom || event.button !== 0 || !isZoomed.value || plotXOf(event) === null) return
  event.preventDefault()
  drag = { x: event.clientX, domain: domain.value, moved: false }
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup', onDragEnd)
}

function onDragMove(event: MouseEvent): void {
  if (!drag) return
  const dx = event.clientX - drag.x
  if (!drag.moved && Math.abs(dx) < 3) return
  if (!drag.moved) {
    drag.moved = true
    isPanning.value = true
    clearHover()
  }
  const [d0, d1] = drag.domain
  const shift = (-dx / Math.max(1, plotWidth.value)) * (d1 - d0)
  setView([d0 + shift, d1 + shift])
}

function onDragEnd(): void {
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
  // 拖曳結束後的那一次 click 不算點擊段落
  setTimeout(() => {
    drag = null
    isPanning.value = false
  }, 0)
}

// 範圍改變（換資料）時，看到的範圍超出新資料就回到全覽
watch(baseDomain, () => {
  if (viewDomain.value) setView(viewDomain.value)
})

// === 時間軸 ===

const lowerTicks = computed(() => {
  const xs = xScale.value
  const w = plotWidth.value
  if (w <= 0) return []
  const ticks = xs.ticks(Math.max(2, Math.floor(w / 70)))
  const [d0, d1] = domain.value
  const step = ticks.length >= 2 ? ticks[1].getTime() - ticks[0].getTime() : d1 - d0
  const fmt = props.timeFormat ?? timeTiers(step).lowerFormat
  return ticks.map((t, i) => {
    const x = xs(t)
    const label = fmt(t)
    const nextX = i + 1 < ticks.length ? xs(ticks[i + 1]) : w
    return { value: t.getTime(), x, label, showLabel: nextX - x >= estimateTextWidth(label, 11) + 6 }
  })
})

const upperTicks = computed(() => {
  const xs = xScale.value
  if (plotWidth.value <= 0) return []
  const ticks = lowerTicks.value
  const step = ticks.length >= 2 ? ticks[1].value - ticks[0].value : domain.value[1] - domain.value[0]
  return upperSegments(domain.value, timeTiers(step)).map((seg) => {
    const x = xs(new Date(seg.start))
    const x2 = xs(new Date(seg.end))
    const labelX = Math.max(x, 0) + 4
    return { ...seg, x, labelX, showLabel: x2 - labelX >= estimateTextWidth(seg.label, 11) + 4 }
  })
})

const nowX = computed(() => {
  if (!props.showNow || plotWidth.value <= 0) return null
  const x = xScale.value(new Date(currentNow.value))
  return x >= 0 && x <= plotWidth.value ? plotLeft.value + x : null
})

// === 統計 ===

const summaryWindow = computed<[number, number]>(() => (props.summaryScope === 'all' ? baseDomain.value : domain.value))

const summaries = computed<StateSummary[]>(() =>
  normalized.value.rows.map((key, i) =>
    summarizeRow(key, normalized.value.byRow[i], summaryWindow.value, {
      runStates: props.runStates,
      downStates: props.downStates,
      excludeStates: props.excludeStates,
    })
  )
)

// 掛載時也送一次：呼叫端不必另外呼叫 getSummary()。
// 內容沒變就不重送（例如 rows 寫成行內陣列，每次重新渲染都會重算一次）
let lastSummary = ''
watch(
  summaries,
  (list) => {
    const key = JSON.stringify(list)
    if (key === lastSummary) return
    lastSummary = key
    emit('summary-change', list.map((s) => ({ ...s, durations: { ...s.durations } })))
  },
  { immediate: true }
)

const fmtPercent = d3.format('.1%')

/** 統計欄的停機時間：一小時以上用小數的小時（欄寬固定，「11 小時 40 分」太長） */
function compactDuration(ms: number): string {
  return ms >= 3_600_000 ? `${(ms / 3_600_000).toFixed(1)} 小時` : formatDuration(ms)
}

function statusOf(u: number | null): { level: 'good' | 'warning' | 'critical'; icon: string; label: string } | null {
  if (u === null) return null
  const [ok, good] = props.utilizationThresholds
  if (u >= good) return { level: 'good', icon: '✓', label: '達標' }
  if (u >= ok) return { level: 'warning', icon: '!', label: '尚可' }
  return { level: 'critical', icon: '✕', label: '偏低' }
}

/** 列的顯示順序（索引） */
const order = computed(() => {
  const idx = normalized.value.rows.map((_, i) => i)
  const s = summaries.value
  if (props.sortRows === 'utilization') {
    // 沒有稼動率的（沒有資料）放最後
    idx.sort((a, b) => (s[a].utilization ?? Infinity) - (s[b].utilization ?? Infinity))
  } else if (props.sortRows === 'downTime') {
    idx.sort((a, b) => s[b].downTime - s[a].downTime)
  }
  return idx
})

interface RowView {
  key: string
  index: number
  label: string
  labelText: string
  y: number
  cy: number
  barY: number
  runs: ReturnType<typeof rasterizeRow>
  summary: StateSummary
  status: ReturnType<typeof statusOf>
  utilText: string
  downText: string
}

const rowViews = computed<RowView[]>(() => {
  const { rows, byRow } = normalized.value
  const w = plotWidth.value
  const labelMax = labelColumn.value - 16
  return order.value.map((i, pos) => {
    const key = rows[i]
    const label = rowLabelOf(key)
    const y = AXIS_H + pos * props.rowHeight
    const summary = summaries.value[i]
    return {
      key,
      index: i,
      label,
      labelText: truncateText(label, labelMax, (t) => estimateTextWidth(t, LABEL_FONT)),
      y,
      cy: y + props.rowHeight / 2,
      barY: y + (props.rowHeight - barHeight.value) / 2,
      runs: rasterizeRow(byRow[i], domain.value, w, priorityOf),
      summary,
      status: statusOf(summary.utilization),
      utilText: summary.utilization === null ? '—' : fmtPercent(summary.utilization),
      downText: summary.downCount ? `${compactDuration(summary.downTime)}（${summary.downCount} 次）` : '—',
    }
  })
})

const legendItems = computed(() => {
  const seen = new Set<string>()
  for (const list of normalized.value.byRow) for (const s of list) seen.add(s.state)
  const defined = props.states.map((s) => ({ value: s.value, label: s.label ?? s.value, color: s.color }))
  const extra = [...seen].filter((v) => !stateMap.value.has(v)).map((v) => ({ value: v, label: labelOf(v), color: props.unknownStateColor }))
  return [...defined, ...extra]
})

const ariaSummary = computed(() => {
  const name = props.title || '機台狀態時間軸'
  const n = normalized.value.rows.length
  if (!n) return `${name}：沒有資料`
  const worst = [...summaries.value].filter((s) => s.utilization !== null).sort((a, b) => a.utilization! - b.utilization!)[0]
  const tail = worst ? `，稼動率最低的是 ${rowLabelOf(worst.row)}（${fmtPercent(worst.utilization!)}）` : ''
  return `${name}：${n} 台機台${tail}。可用上下鍵切換機台、左右鍵逐段查看`
})

// === 提示框 ===

const hover = shallowRef<{ row: number; segment: StateSegment } | null>(null)
const tooltipData = ref<StateTimelineTooltip | null>(null)
const tooltipVisible = ref(false)
const liveText = ref('')

const timeFormatFull = d3.timeFormat('%Y/%m/%d %H:%M')
const timeFormatClock = d3.timeFormat('%H:%M')

function rangeText(start: number, end: number): string {
  const sameDay = new Date(start).toDateString() === new Date(end).toDateString()
  return `${timeFormatFull(new Date(start))} ～ ${sameDay ? timeFormatClock(new Date(end)) : timeFormatFull(new Date(end))}`
}

function eventOf(row: number, s: StateSegment): StateTimelineEvent {
  const key = normalized.value.rows[row]
  return {
    datum: toRaw(s.datum),
    row: key,
    rowLabel: rowLabelOf(key),
    state: s.state,
    stateLabel: labelOf(s.state),
    start: new Date(s.start),
    end: new Date(s.end),
    duration: s.end - s.start,
    openEnded: s.openEnded,
  }
}

const tooltipLines = computed(() => {
  const t = tooltipData.value
  if (!t) return []
  if (props.customRenderers.tooltip) return props.customRenderers.tooltip(t)
  return t.openEnded && t.end.getTime() >= openEnd.value ? ['（仍在進行中）'] : []
})

const tooltipStyle = computed(() => {
  const t = tooltipData.value
  if (!t) return {}
  const height = containerRef.value?.clientHeight ?? svgHeight.value
  return tooltipPlacement(t.position.containerX, t.position.containerY, effectiveWidth.value, height, 220, 90)
})

/** 指到的那一段的外框（像素） */
const hoverBox = computed(() => {
  const h = hover.value
  if (!h) return null
  const pos = order.value.indexOf(h.row)
  if (pos < 0) return null
  const xs = xScale.value
  const x0 = Math.max(0, xs(new Date(h.segment.start)))
  const x1 = Math.min(plotWidth.value, xs(new Date(h.segment.end)))
  if (x1 < 0 || x0 > plotWidth.value) return null
  return {
    x: plotLeft.value + x0,
    y: AXIS_H + pos * props.rowHeight + (props.rowHeight - barHeight.value) / 2,
    // 不到一個像素的段落也要框得到
    w: Math.max(2, x1 - x0),
  }
})

function show(row: number, segment: StateSegment, x: number, y: number): void {
  const changed = hover.value?.segment !== segment
  hover.value = { row, segment }
  const ev = eventOf(row, segment)
  tooltipData.value = {
    ...ev,
    color: colorOf(segment.state),
    durationText: formatDuration(ev.duration),
    rangeText: rangeText(segment.start, segment.end),
    position: { containerX: x, containerY: y },
  }
  tooltipVisible.value = true
  if (changed) {
    emit('segment-hover', ev)
    emit('tooltip-show', tooltipData.value)
  }
}

function clearHover(): void {
  if (!hover.value && !tooltipVisible.value) return
  hover.value = null
  tooltipVisible.value = false
  emit('tooltip-hide')
}

/** 滑鼠位置對到的列與段落 */
function hitTest(event: MouseEvent): { row: number; segment: StateSegment } | null {
  const svg = svgRef.value
  if (!svg) return null
  const rect = svg.getBoundingClientRect()
  const y = event.clientY - rect.top - AXIS_H
  const pos = Math.floor(y / props.rowHeight)
  if (y < 0 || pos >= order.value.length) return null
  const x = plotXOf(event)
  if (x === null) return null
  const row = order.value[pos]
  const col = Math.floor(x)
  const xs = xScale.value
  const ta = xs.invert(col).getTime()
  const tb = xs.invert(col + 1).getTime()
  // 這一格是什麼顏色，就說明那一段（短暫停機在全覽時只佔一個像素）
  const segment = dominantSegment(normalized.value.byRow[row], ta, tb, priorityOf) ?? segmentAt(normalized.value.byRow[row], (ta + tb) / 2)
  return segment ? { row, segment } : null
}

function onMouseMove(event: MouseEvent): void {
  if (isPanning.value) return
  const hit = hitTest(event)
  if (!hit) {
    clearHover()
    return
  }
  const rect = containerRef.value?.getBoundingClientRect()
  show(hit.row, hit.segment, event.clientX - (rect?.left ?? 0), event.clientY - (rect?.top ?? 0))
}

function onClick(event: MouseEvent): void {
  if (drag?.moved) return
  const hit = hitTest(event)
  if (hit) emit('segment-click', eventOf(hit.row, hit.segment))
}

/** 鍵盤：上下切換機台、左右逐段、Home／End 第一段與最後一段、Enter 等同點擊 */
function onKeydown(event: KeyboardEvent): void {
  const rows = order.value
  if (!rows.length) return
  const byRow = normalized.value.byRow
  const cur = hover.value
  let pos = cur ? rows.indexOf(cur.row) : 0
  let segment: StateSegment | null = cur?.segment ?? null
  const mid = (domain.value[0] + domain.value[1]) / 2
  const nearest = (row: number, t: number) => segmentAt(byRow[row], t) ?? byRow[row].find((s) => s.start >= t) ?? byRow[row][byRow[row].length - 1] ?? null

  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowUp': {
      pos = Math.min(rows.length - 1, Math.max(0, pos + (event.key === 'ArrowDown' ? 1 : -1)))
      const t = segment ? (Math.max(segment.start, domain.value[0]) + Math.min(segment.end, domain.value[1])) / 2 : mid
      segment = nearest(rows[pos], t)
      break
    }
    case 'ArrowRight':
    case 'ArrowLeft': {
      const list = byRow[rows[pos]]
      if (!segment) segment = nearest(rows[pos], mid)
      else {
        const i = list.indexOf(segment) + (event.key === 'ArrowRight' ? 1 : -1)
        segment = list[Math.min(list.length - 1, Math.max(0, i))] ?? segment
      }
      break
    }
    case 'Home':
      segment = byRow[rows[pos]][0] ?? null
      break
    case 'End':
      segment = byRow[rows[pos]][byRow[rows[pos]].length - 1] ?? null
      break
    case 'Enter':
    case ' ':
      if (cur) emit('segment-click', eventOf(cur.row, cur.segment))
      event.preventDefault()
      return
    case 'Escape':
      clearHover()
      return
    default:
      return
  }
  event.preventDefault()
  if (!segment) return
  const row = rows[pos]
  // 段落在畫面外：把畫面移過去（保持目前的縮放）
  const [d0, d1] = domain.value
  if (isZoomed.value && (segment.end <= d0 || segment.start >= d1)) {
    const span = d1 - d0
    const c = (segment.start + segment.end) / 2
    setView([c - span / 2, c + span / 2])
  }
  const xs = xScale.value
  const x = plotLeft.value + (Math.max(0, xs(new Date(segment.start))) + Math.min(plotWidth.value, xs(new Date(segment.end)))) / 2
  const svgTop = (containerRef.value?.querySelector('.stl-svg') as SVGSVGElement | null)?.getBoundingClientRect().top ?? 0
  const boxTop = containerRef.value?.getBoundingClientRect().top ?? 0
  const y = svgTop - boxTop + AXIS_H + pos * props.rowHeight + props.rowHeight / 2
  show(row, segment, x, y)
  const ev = eventOf(row, segment)
  liveText.value = `${ev.rowLabel}，${ev.stateLabel}，${rangeText(segment.start, segment.end)}，共 ${formatDuration(ev.duration)}`
}

// === 對外方法 ===

/** 目前統計範圍內每台機台的統計 */
function getSummary(): StateSummary[] {
  return summaries.value.map((s) => ({ ...s, durations: { ...s.durations } }))
}

onMounted(() => {
  svgRef.value?.addEventListener('mousedown', onMouseDown)
  // 沒有指定 now 時，每分鐘更新一次「現在」（進行中的那一段跟著變長）
  if (!Number.isFinite(parseTime(props.now))) nowTimer = setInterval(() => (nowTime.value = Date.now()), 60_000)
  emit('chart-ready', { width: effectiveWidth.value, height: svgHeight.value })
})

onUnmounted(() => {
  svgRef.value?.removeEventListener('mousedown', onMouseDown)
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup', onDragEnd)
  if (nowTimer) clearInterval(nowTimer)
})

defineExpose({ containerRef, getSummary, resetZoom, zoomTo })
</script>

<style scoped>
.state-timeline {
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.stl-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 16px;
  min-height: 28px;
  padding: 0 8px 4px;
}

.stl-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 12px;
  color: rgb(var(--t-content-secondary));
}

.stl-legend li {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.stl-swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.stl-svg {
  display: block;
  outline: none;
  user-select: none;
}

.stl-svg:focus-visible {
  box-shadow: 0 0 0 2px rgb(var(--t-stroke-focus));
  border-radius: 4px;
}

.stl-svg.is-zoomable {
  cursor: crosshair;
}

.stl-row-bg {
  fill: transparent;
}

.stl-row.is-hovered .stl-row-bg {
  fill: rgb(var(--t-surface-secondary));
}

.stl-label {
  font-size: 12px;
  fill: rgb(var(--t-content-primary));
}

.stl-run {
  shape-rendering: crispEdges;
}

.stl-hover-box {
  fill: none;
  stroke: rgb(var(--t-content-primary));
  stroke-width: 2;
  pointer-events: none;
}

.stl-grid {
  stroke: rgb(var(--t-stroke-light));
  shape-rendering: crispEdges;
}

.stl-upper-line {
  stroke: rgb(var(--t-stroke-medium));
  shape-rendering: crispEdges;
}

.stl-tick {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  fill: rgb(var(--t-content-tertiary));
}

.stl-upper {
  font-size: 11px;
  font-weight: 600;
  fill: rgb(var(--t-content-secondary));
}

.stl-now {
  stroke: rgb(var(--t-accent));
  stroke-width: 1.5;
  stroke-dasharray: 3 3;
}

.stl-summary-head text {
  font-size: 11px;
  fill: rgb(var(--t-content-tertiary));
}

.stl-util,
.stl-down {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.stl-util {
  font-weight: 600;
  fill: rgb(var(--t-content-primary));
}

.stl-down {
  fill: rgb(var(--t-content-secondary));
}

.stl-status-label {
  font-size: 11px;
  font-weight: 400;
  fill: rgb(var(--t-content-secondary));
}

.stl-status-icon {
  font-size: 9px;
  font-weight: 700;
  fill: rgb(var(--t-content-on-solid));
}

.stl-status.is-good circle {
  fill: rgb(var(--t-success-solid));
}

.stl-status.is-warning circle {
  fill: rgb(var(--t-warning-solid));
}

.stl-status.is-critical circle {
  fill: rgb(var(--t-danger-solid));
}

.stl-empty {
  padding: 24px 0;
  text-align: center;
}
</style>
