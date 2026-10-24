<template>
  <div ref="containerRef" class="gantt-chart flex flex-col" :style="containerStyle">
    <!-- 標題與圖例（HTML：圖例要能用鍵盤切換） -->
    <div v-if="title || legendVisible" class="flex flex-none flex-col items-center gap-1 pb-2">
      <p v-if="title" class="text-sm font-semibold text-content-primary">{{ title }}</p>
      <div v-if="legendVisible" class="flex flex-wrap justify-center gap-x-4 gap-y-1" role="group" aria-label="狀態圖例">
        <button
          v-for="item in legendItems"
          :key="item.value"
          type="button"
          class="inline-flex items-center gap-1.5 rounded px-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          :aria-pressed="!item.hidden"
          :title="item.hidden ? `顯示 ${item.label}` : `隱藏 ${item.label}`"
          @click="toggleStatus(item.value)"
        >
          <span class="h-3 w-6 shrink-0 rounded-sm" :style="{ background: item.color, opacity: item.hidden ? 0.35 : 1 }" aria-hidden="true"></span>
          <span :class="item.hidden ? 'text-content-tertiary line-through' : 'text-content-secondary'">
            {{ item.label }}<template v-if="showCounts"> ({{ item.count.toLocaleString() }})</template>
          </span>
        </button>
      </div>
    </div>

    <!-- 時間軸：放在捲動區外面，列往下捲時一直看得到 -->
    <div class="flex flex-none border-b border-stroke-default" :style="{ height: `${AXIS_HEIGHT}px`, paddingRight: `${gutter}px` }">
      <div
        class="flex flex-none items-end truncate px-2 pb-1 text-xs font-semibold text-content-secondary"
        :style="{ width: `${labelWidth}px` }"
      >{{ labelHeader }}</div>
      <svg class="gantt-axis block flex-none" :width="plotWidth" :height="AXIS_HEIGHT" aria-hidden="true">
        <g class="gantt-upper-axis">
          <line
            v-for="seg in upperTicks"
            :key="`u${seg.start}`"
            :x1="seg.x" :x2="seg.x" :y1="0" :y2="AXIS_HEIGHT"
            class="gantt-axis-line"
          />
          <text
            v-for="seg in upperTicks"
            v-show="seg.showLabel"
            :key="`ul${seg.start}`"
            :x="seg.labelX"
            :y="15"
            class="gantt-upper-label"
          >{{ seg.label }}</text>
        </g>
        <g class="gantt-lower-axis">
          <line
            v-for="t in lowerTicks"
            :key="`l${t.value}`"
            :x1="t.x" :x2="t.x" :y1="AXIS_HEIGHT - 6" :y2="AXIS_HEIGHT"
            class="gantt-axis-line"
          />
          <text
            v-for="t in lowerTicks"
            v-show="t.showLabel"
            :key="`ll${t.value}`"
            :x="t.x + 4"
            :y="AXIS_HEIGHT - 9"
            class="gantt-lower-label"
          >{{ t.label }}</text>
        </g>
        <g v-if="todayX !== null" class="gantt-today-marker">
          <rect :x="todayX - 16" :y="AXIS_HEIGHT - 18" width="32" height="16" rx="3" />
          <text :x="todayX" :y="AXIS_HEIGHT - 6" text-anchor="middle">今天</text>
        </g>
      </svg>
    </div>

    <!-- 列：可垂直捲動，只畫看得到的列（上千列也順） -->
    <div ref="bodyRef" class="gantt-body relative" :class="{ 'is-scrollable': !autoHeight }" :style="bodyStyle" @scroll.passive="onScroll">
      <div class="relative" :style="{ height: `${contentHeight}px` }">
        <!-- 列名 -->
        <div
          v-for="r in visibleRows"
          :key="`label-${r.def.value}`"
          class="gantt-row-label absolute left-0 flex items-center border-b border-stroke-light px-2 text-sm text-content-primary"
          :class="{ 'bg-surface-secondary': r.index % 2 === 1 }"
          :style="{ top: `${r.y}px`, height: `${rowHeight}px`, width: `${labelWidth}px` }"
          @click="onRowClick(r.index)"
        >
          <slot name="row-label" :row="r.def" :index="r.index" :tasks="rowData(r.index)">
            <span class="truncate" :title="r.def.label">{{ r.def.label }}</span>
          </slot>
        </div>

        <!-- 任務 -->
        <svg
          ref="plotRef"
          class="gantt-plot absolute top-0"
          :class="{ 'is-zoomed': isZoomed }"
          :style="{ left: `${labelWidth}px` }"
          :width="plotWidth"
          :height="contentHeight"
          role="img"
          :aria-label="ariaSummary"
        >
          <defs>
            <clipPath :id="clipId">
              <rect :width="plotWidth" :height="contentHeight" />
            </clipPath>
          </defs>
          <!-- 空白處也要接得到拖曳平移 -->
          <rect class="gantt-surface" :width="plotWidth" :height="contentHeight" />
          <g class="gantt-rows">
            <rect
              v-for="r in visibleRows"
              v-show="r.index % 2 === 1"
              :key="`stripe-${r.def.value}`"
              class="gantt-stripe"
              :y="r.y" :width="plotWidth" :height="rowHeight"
            />
            <line
              v-for="r in visibleRows"
              :key="`sep-${r.def.value}`"
              class="gantt-row-sep"
              :x1="0" :x2="plotWidth" :y1="r.y + rowHeight - 0.5" :y2="r.y + rowHeight - 0.5"
            />
          </g>
          <g v-if="showGrid" class="gantt-grid">
            <line v-for="t in lowerTicks" :key="`g${t.value}`" :x1="t.x" :x2="t.x" :y1="0" :y2="contentHeight" />
            <line
              v-for="seg in upperTicks"
              :key="`gu${seg.start}`"
              class="is-major"
              :x1="seg.x" :x2="seg.x" :y1="0" :y2="contentHeight"
            />
          </g>
          <g :clip-path="`url(#${clipId})`">
            <g
              v-for="bar in visibleBars"
              :key="bar.task.key + ':' + bar.task.index"
              class="gantt-task"
              :class="{ 'is-hovered': hoverIndex === bar.taskIndex, 'is-highlighted': bar.highlighted }"
              :data-key="bar.task.key"
              @mouseenter="onBarEnter(bar.taskIndex, $event)"
              @mousemove="onBarMove(bar.taskIndex, $event)"
              @mouseleave="clearHover"
              @click="onBarClick(bar.taskIndex)"
            >
              <template v-if="bar.task.milestone">
                <path class="gantt-milestone" :d="bar.diamond" :style="{ fill: bar.color }" />
              </template>
              <template v-else>
                <rect
                  class="gantt-bar"
                  :x="bar.x" :y="bar.y" :width="bar.w" :height="barHeight"
                  :rx="barRadius"
                  :style="{ fill: bar.color }"
                />
                <template v-if="bar.progressW !== null">
                  <rect
                    class="gantt-progress-track"
                    :x="bar.x + 3" :y="bar.y + barHeight - 4.5" :width="Math.max(0, bar.w - 6)" height="2.5" rx="1.25"
                    :style="{ fill: bar.textColor }"
                  />
                  <rect
                    class="gantt-progress"
                    :x="bar.x + 3" :y="bar.y + barHeight - 4.5" :width="bar.progressW" height="2.5" rx="1.25"
                    :style="{ fill: bar.textColor }"
                  />
                </template>
              </template>
              <text
                v-if="bar.labelX !== null"
                class="gantt-bar-label"
                :x="bar.labelX"
                :y="bar.y + barHeight / 2 - (bar.progressW !== null && bar.labelInside ? 3 : 0)"
                dominant-baseline="central"
                :style="{ fill: bar.labelInside ? bar.textColor : chartTheme.text }"
              >{{ bar.labelText }}</text>
            </g>
            <line
              v-if="todayX !== null"
              class="gantt-today"
              :x1="todayX" :x2="todayX" :y1="0" :y2="contentHeight"
            />
          </g>
        </svg>
      </div>

      <p v-if="!tasks.length" class="absolute inset-0 flex items-center justify-center text-sm text-content-tertiary">
        {{ emptyText }}
      </p>
    </div>

    <button
      v-if="isZoomed && showResetButton"
      type="button"
      class="absolute right-2 top-2 z-20 rounded-md border border-stroke-light bg-surface-primary/80 px-2.5 py-1 text-xs text-content-secondary shadow-sm backdrop-blur hover:bg-surface-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
      @click="resetZoom"
    >
      重設縮放
    </button>

    <!-- Tooltip：插槽可完全自訂；沒給插槽時用預設樣式 -->
    <slot name="tooltip" :tooltip-data="tooltipData" :tooltip-visible="tooltipVisible">
      <div
        v-if="tooltipVisible && tooltipData && enableTooltip"
        class="pointer-events-none absolute z-30 min-w-40 rounded-md border border-stroke-light bg-surface-primary px-2.5 py-1.5 text-xs text-content-primary shadow-lg"
        role="tooltip"
        :style="tooltipStyle"
      >
        <div class="mb-0.5 flex items-center gap-1.5 font-semibold">
          <span class="h-2.5 w-2.5 rounded-sm" :style="{ background: tooltipData.color }" aria-hidden="true"></span>
          {{ tooltipData.label || tooltipData.key }}
        </div>
        <div v-for="line in tooltipLines" :key="line" class="whitespace-pre text-content-secondary">{{ line }}</div>
      </div>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, toRaw, watch } from 'vue'
import * as d3 from 'd3'
import { chartTheme } from './chartTheme'
import { resolveCanvasColor } from './utils/largeData'
import { zoomBounds } from './utils/statusScatter'
import {
  buildRows,
  estimateTextWidth,
  formatDuration,
  groupByRow,
  normalizeTasks,
  parseTime,
  readableTextColor,
  timeExtent,
  timeTiers,
  upperSegments,
  type GanttRowDef,
  type GanttTask,
} from './utils/gantt'

/**
 * GanttChart —— 甘特圖（唯讀）
 *
 * - 每筆資料是一個任務：開始、結束、所在的列（機台、工單、負責人…）、狀態、進度
 * - 同一列可以有多個任務（例如一台機台一天排好幾張工單）
 * - 沒有結束時間的任務畫成里程碑（菱形）
 * - 時間軸分上下兩層（月／日、日／時…），依縮放程度自動切換
 * - 滾輪捲動列；Ctrl（⌘）+ 滾輪或觸控板捏合縮放時間軸，拖曳平移、雙擊重設
 * - 只畫看得到的列：上千列、上萬筆任務也能順暢捲動
 */

/** 一種狀態的顯示設定 */
export interface GanttStatusDef {
  /** 資料中的狀態值 */
  value: string
  /** 圖例與提示框顯示的文字（預設同 value） */
  label?: string
  /** 長條顏色 */
  color: string
}

/** 列的設定：字串就是列值；物件可另給顯示文字 */
export type GanttRowInput = string | number | { value: string | number; label?: string }

/** 任務事件（task-hover、task-click）的 payload */
export interface GanttTaskEvent {
  datum: Record<string, unknown>
  key: string
  /** 所在列的值 */
  row: string
  /** 長條開始的時間點 */
  start: Date
  /** 長條結束的時間點（只寫日期且 inclusiveEndDate 時是隔天 00:00） */
  end: Date
  status: string
  milestone: boolean
  /** 0～1；沒有進度時為 null */
  progress: number | null
}

/** 滑鼠提示的資料 */
export interface GanttTooltip extends GanttTaskEvent {
  label: string
  rowLabel: string
  statusLabel: string
  color: string
  /** 相對圖表容器的位置 */
  position: { containerX: number; containerY: number; pageX: number; pageY: number }
}

type Row = Record<string, unknown>

interface GanttChartProps {
  // === 基礎配置 ===
  width?: number
  height?: number
  /** 跟著容器大小調整（容器需有高度；autoHeight 時只跟寬度） */
  autoResize?: boolean
  /** 高度依列數撐開，不捲動（忽略 height） */
  autoHeight?: boolean
  /** ResizeObserver 防抖延遲（毫秒） */
  debounceDelay?: number
  /** 圖表四周的留白 */
  margin?: { top: number; right: number; bottom: number; left: number }

  // === 數據配置 ===
  data: Row[]
  /** 列的順序與顯示文字；沒給時照資料出現的順序。清單外的列接在後面 */
  rows?: GanttRowInput[] | null

  // === 欄位映射（支援任意資料結構）===
  /** 資料鍵的欄位（highlightKey、事件的 key）；沒有此欄位時用索引 */
  keyField?: string
  /** 自訂資料鍵；優先於 keyField */
  keyFn?: ((datum: Row, index: number) => string) | null
  /** 所在列的欄位；空白時任務自成一列 */
  rowField?: string
  /** 任務名稱的欄位 */
  labelField?: string
  /** 開始時間的欄位（Date、毫秒數或日期字串） */
  startField?: string
  /** 結束時間的欄位；空白時畫成里程碑 */
  endField?: string
  /** 進度的欄位（0～100） */
  progressField?: string
  statusField?: string
  /** 為真時畫成里程碑 */
  milestoneField?: string

  // === 狀態配置 ===
  /** 狀態清單（決定顏色與圖例順序） */
  statuses?: GanttStatusDef[]
  /** 不在 statuses 裡的狀態用的顏色 */
  otherColor?: string
  /** 隱藏的狀態（可用 v-model:hidden-statuses 雙向綁定） */
  hiddenStatuses?: string[]

  // === 時間軸配置 ===
  /** 預設顯示的時間範圍；未指定時依資料（含 domainPadding） */
  timeDomain?: [Date | number | string, Date | number | string] | null
  /** 自動範圍兩端外推的比例 */
  domainPadding?: number
  /** 結束時間只寫日期（2026-10-24）時，算到那一天結束 */
  inclusiveEndDate?: boolean
  /** 下層刻度的格式；未指定時依縮放程度自動選 */
  timeFormat?: ((date: Date) => string) | null

  // === 版面配置 ===
  /** 每列高度（px） */
  rowHeight?: number
  /** 長條高度（px） */
  barHeight?: number
  /** 左側列名欄寬（px） */
  labelWidth?: number
  /** 列名欄的標題（時間軸左邊） */
  labelHeader?: string

  // === 元素樣式配置 ===
  /** 長條圓角 */
  barRadius?: number

  // === 視覺配置 ===
  title?: string
  showLegend?: boolean
  /** 圖例顯示各狀態筆數 */
  showCounts?: boolean
  showGrid?: boolean
  /** 標出今天 */
  showToday?: boolean
  /** 「今天」的時間；未指定時用現在時間（每分鐘更新） */
  today?: Date | number | string | null
  /** 在長條上（放不下時在右邊）顯示任務名稱 */
  showBarLabels?: boolean
  /** 在長條底部畫出進度（0% 與 100% 不畫） */
  showProgress?: boolean
  /** 沒有任務時的提示 */
  emptyText?: string

  // === 互動配置 ===
  enableTooltip?: boolean
  /** 縮放時間軸、拖曳平移、雙擊重設 */
  enableZoom?: boolean
  /** 要按住哪個鍵才用滾輪縮放；預設 'ctrl'，一般滾輪留給列的捲動（'ctrl' 也接受 ⌘ 與觸控板捏合） */
  wheelZoomModifier?: 'none' | 'ctrl' | 'alt'
  /** 最大放大倍率 */
  maxZoomScale?: number
  showResetButton?: boolean
  /** 要標出的任務鍵（對應 keyFn / keyField） */
  highlightKey?: string | number | null

  // === 企業級擴展點 ===
  customRenderers?: {
    /** 自訂長條顏色（優先於 statuses） */
    barColor?: (datum: Row, task: GanttTaskEvent) => string | null | undefined
    /** 自訂長條上的文字 */
    barLabel?: (datum: Row, task: GanttTaskEvent) => string
    /** 自訂提示框內容（每行一個字串，標題列之下） */
    tooltip?: (datum: Row, task: GanttTaskEvent) => string[]
  }
}

const props = withDefaults(defineProps<GanttChartProps>(), {
  width: 960,
  height: 420,
  autoResize: false,
  autoHeight: false,
  debounceDelay: 150,
  margin: () => ({ top: 8, right: 16, bottom: 8, left: 8 }),
  rows: null,
  keyField: 'id',
  keyFn: null,
  rowField: 'row',
  labelField: 'name',
  startField: 'start',
  endField: 'end',
  progressField: 'progress',
  statusField: 'status',
  milestoneField: 'milestone',
  // 預設四種狀態；顏色挑過，白字在上面的對比都在 4.5:1 以上
  statuses: () => [
    { value: 'planned', label: '計畫', color: '#64748b' },
    { value: 'running', label: '進行中', color: '#2563eb' },
    { value: 'done', label: '完成', color: '#047857' },
    { value: 'delayed', label: '延遲', color: '#dc2626' },
  ],
  otherColor: '#6b7280',
  hiddenStatuses: () => [],
  timeDomain: null,
  domainPadding: 0.02,
  inclusiveEndDate: true,
  timeFormat: null,
  rowHeight: 36,
  barHeight: 22,
  labelWidth: 160,
  labelHeader: '',
  barRadius: 3,
  title: '',
  showLegend: true,
  showCounts: false,
  showGrid: true,
  showToday: true,
  today: null,
  showBarLabels: true,
  showProgress: true,
  emptyText: '沒有任務',
  enableTooltip: true,
  enableZoom: true,
  wheelZoomModifier: 'ctrl',
  maxZoomScale: 500,
  showResetButton: true,
  highlightKey: null,
  customRenderers: () => ({}),
})

const emit = defineEmits<{
  'chart-ready': [payload: { width: number; height: number }]
  'chart-resize': [payload: { width: number; height: number }]
  'task-hover': [payload: GanttTaskEvent]
  'task-click': [payload: GanttTaskEvent]
  'row-click': [payload: { row: string; label: string; tasks: Row[] }]
  'tooltip-show': [payload: GanttTooltip]
  'tooltip-hide': []
  'zoom-change': [payload: { timeDomain: [Date, Date]; scale: number }]
  'zoom-reset': []
  'legend-toggle': [payload: { status: string; hidden: boolean }]
  'update:hiddenStatuses': [value: string[]]
}>()

/** 時間軸高度：上層（月、日）+ 下層（日、時） */
const AXIS_HEIGHT = 44
/** 視窗上下多畫幾列，快速捲動時不會先看到空白 */
const ROW_BUFFER = 3

// === Refs ===
const containerRef = ref<HTMLDivElement | null>(null)
const bodyRef = ref<HTMLDivElement | null>(null)
const plotRef = ref<SVGSVGElement | null>(null)

/** clip-path 的 id 每個實例唯一，同頁多張圖才不會互相覆蓋（不用 useId：不同 app 實例之間會重複） */
const clipId = `gantt-clip-${Math.random().toString(36).slice(2, 11)}`

// === 響應式尺寸 ===
const observedWidth = ref(props.width)
const observedHeight = ref(props.height)
let resizeObserver: ResizeObserver | null = null
let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null

const effectiveWidth = computed(() => (props.autoResize ? observedWidth.value : props.width))
const effectiveHeight = computed(() => (props.autoResize ? observedHeight.value : props.height))

/** 捲軸佔掉的寬度（掛載與尺寸改變時量）；時間軸右側補同樣的寬度，刻度才會和長條對齊 */
const gutter = ref(0)

function measureGutter(): void {
  const el = bodyRef.value
  gutter.value = el && !props.autoHeight ? Math.max(0, el.offsetWidth - el.clientWidth) : 0
}

const plotWidth = computed(() =>
  Math.max(0, Math.floor(effectiveWidth.value - props.margin.left - props.margin.right - props.labelWidth - gutter.value))
)

const containerStyle = computed(() => {
  const m = props.margin
  const padding = `${m.top}px ${m.right}px ${m.bottom}px ${m.left}px`
  if (props.autoResize) return { width: '100%', height: props.autoHeight ? 'auto' : '100%', padding }
  return { width: `${props.width}px`, height: props.autoHeight ? 'auto' : `${props.height}px`, padding }
})

// === 資料解析 ===

/**
 * 整理任務。
 * ✅ 先讀 length（push 仍會觸發重算），再用原始陣列掃描：不經 Vue Proxy，上萬筆也快
 */
const parsed = computed(() => {
  void props.data.length
  return normalizeTasks(toRaw(props.data) ?? [], {
    keyField: props.keyField,
    keyFn: props.keyFn,
    rowField: props.rowField,
    labelField: props.labelField,
    startField: props.startField,
    endField: props.endField,
    progressField: props.progressField,
    statusField: props.statusField,
    milestoneField: props.milestoneField,
    inclusiveEndDate: props.inclusiveEndDate,
  })
})
const tasks = computed<GanttTask[]>(() => parsed.value.tasks)

watch(
  () => parsed.value.skipped,
  (skipped) => {
    if (import.meta.env.DEV && skipped > 0) {
      console.warn(`[GanttChart] ${skipped} 筆任務的開始時間（${props.startField}）不是合法的時間，沒有畫出來`)
    }
  },
  { immediate: true }
)

const rowDefs = computed<GanttRowDef[]>(() => buildRows(tasks.value, props.rows))

/** 每列的任務索引，依開始時間排序（判斷名稱放不放得下要看下一個任務在哪） */
const rowGroups = computed(() => {
  const groups = groupByRow(tasks.value, rowDefs.value)
  const ts = tasks.value
  for (const g of groups) g.sort((a, b) => ts[a].start - ts[b].start || ts[a].end - ts[b].end)
  return groups
})

const contentHeight = computed(() => Math.max(1, rowDefs.value.length * props.rowHeight))

const bodyStyle = computed(() =>
  props.autoHeight
    ? { height: `${contentHeight.value}px`, overflow: 'hidden' }
    : { flex: '1 1 0%', minHeight: '0px' }
)

// === 狀態與隱藏 ===

const hidden = ref(new Set(props.hiddenStatuses))
watch(
  () => props.hiddenStatuses,
  (list) => {
    hidden.value = new Set(list)
  }
)

/** 未知狀態的圖例 key */
const OTHER = '__other__'

const statusIndex = computed(() => new Map(props.statuses.map((s, i) => [s.value, i])))

function statusKey(status: string): string {
  return statusIndex.value.has(status) ? status : OTHER
}

const legendItems = computed(() => {
  const counts = new Map<string, number>()
  for (const t of tasks.value) {
    const k = statusKey(t.status)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const items = props.statuses.map((s) => ({
    value: s.value,
    label: s.label ?? s.value,
    color: s.color,
    count: counts.get(s.value) ?? 0,
    hidden: hidden.value.has(s.value),
  }))
  if (counts.get(OTHER)) {
    items.push({ value: OTHER, label: '其他', color: props.otherColor, count: counts.get(OTHER)!, hidden: hidden.value.has(OTHER) })
  }
  return items
})

const legendVisible = computed(() => props.showLegend && legendItems.value.length > 0)

function toggleStatus(value: string): void {
  const next = new Set(hidden.value)
  const nowHidden = !next.has(value)
  if (nowHidden) next.add(value)
  else next.delete(value)
  hidden.value = next
  clearHover()
  emit('legend-toggle', { status: value, hidden: nowHidden })
  emit('update:hiddenStatuses', [...next])
}

function statusInfo(status: string): { label: string; color: string } {
  const i = statusIndex.value.get(status)
  if (i === undefined) return { label: status || '其他', color: props.otherColor }
  const def = props.statuses[i]
  return { label: def.label ?? def.value, color: def.color }
}

const ariaSummary = computed(() => {
  const name = props.title || '甘特圖'
  return `${name}：${rowDefs.value.length} 列、${tasks.value.length} 筆任務`
})

// === 今天 ===

const now = ref(Date.now())
let nowTimer: ReturnType<typeof setInterval> | null = null

const todayTime = computed(() => {
  const t = parseTime(props.today)
  return Number.isFinite(t) ? t : now.value
})

// === 比例尺 ===

const baseDomain = computed<[number, number]>(() => {
  const d = props.timeDomain
  if (d) {
    const a = parseTime(d[0])
    const b = parseTime(d[1])
    if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return [Math.min(a, b), Math.max(a, b)]
  }
  return timeExtent(tasks.value, props.domainPadding, todayTime.value)
})

/** 所有任務的起訖（縮放邊界用） */
const allTimes = computed(() => {
  const ts = tasks.value
  const out = new Float64Array(ts.length * 2)
  ts.forEach((t, i) => {
    out[i * 2] = t.start
    out[i * 2 + 1] = t.end
  })
  return out
})

/**
 * 縮放邊界：設定的範圍與任務實際範圍的聯集。
 * timeDomain 只是預設視窗 —— 任務超出時往外縮或平移仍看得到
 */
const zoomLimits = computed(() => zoomBounds(baseDomain.value, allTimes.value, props.domainPadding))

/** 目前的縮放（只用 X 方向） */
const zoomTransform = shallowRef<d3.ZoomTransform>(d3.zoomIdentity)
const isZoomed = computed(() => {
  const t = zoomTransform.value
  return Math.abs(t.k - 1) > 1e-9 || Math.abs(t.x) > 1e-6
})

const baseX = computed(() => d3.scaleTime().domain(baseDomain.value).range([0, plotWidth.value]))
const xScale = computed(() => zoomTransform.value.rescaleX(baseX.value))

// === 時間軸 ===

const lowerTicks = computed(() => {
  const xs = xScale.value
  const w = plotWidth.value
  if (w <= 0) return []
  const ticks = xs.ticks(Math.max(2, Math.floor(w / 70)))
  const [d0, d1] = xs.domain().map((d) => d.getTime())
  const step = ticks.length >= 2 ? ticks[1].getTime() - ticks[0].getTime() : d1 - d0
  const tiers = timeTiers(step)
  const fmt = props.timeFormat ?? tiers.lowerFormat
  return ticks.map((t, i) => {
    const x = xs(t)
    const label = fmt(t)
    const nextX = i + 1 < ticks.length ? xs(ticks[i + 1]) : w
    return { value: t.getTime(), x, label, showLabel: nextX - x >= estimateTextWidth(label, 11) + 6 && x + 4 < w }
  })
})

const upperTicks = computed(() => {
  const xs = xScale.value
  const w = plotWidth.value
  if (w <= 0) return []
  const ticks = lowerTicks.value
  const domain = xs.domain().map((d) => d.getTime()) as [number, number]
  const step = ticks.length >= 2 ? ticks[1].value - ticks[0].value : domain[1] - domain[0]
  return upperSegments(domain, timeTiers(step)).map((seg) => {
    const x = xs(new Date(seg.start))
    const x2 = xs(new Date(seg.end))
    // ✅ 區段開頭被捲出畫面時，文字貼著左緣（像固定的標題）
    const labelX = Math.max(x, 0) + 4
    return { ...seg, x, labelX, showLabel: x2 - labelX >= estimateTextWidth(seg.label, 12) + 4 }
  })
})

const todayX = computed(() => {
  if (!props.showToday || plotWidth.value <= 0) return null
  const x = xScale.value(new Date(todayTime.value))
  return x >= 0 && x <= plotWidth.value ? x : null
})

// === 只畫看得到的列 ===

const scrollTop = ref(0)

function onScroll(): void {
  if (!bodyRef.value) return
  scrollTop.value = bodyRef.value.scrollTop
  clearHover()
}

/**
 * 目前看得到的列。
 * 視窗高度用整張圖的高度估（比實際的捲動區大一點，多畫幾列無妨）：
 * jsdom 與 SSR 量不到 clientHeight，用估計值才不會一列都不畫
 */
const visibleRange = computed(() => {
  const n = rowDefs.value.length
  if (!n) return [0, -1] as const
  if (props.autoHeight) return [0, n - 1] as const
  const h = props.rowHeight
  const first = Math.max(0, Math.floor(scrollTop.value / h) - ROW_BUFFER)
  const last = Math.min(n - 1, Math.ceil((scrollTop.value + effectiveHeight.value) / h) + ROW_BUFFER)
  return [first, last] as const
})

const visibleRows = computed(() => {
  const [first, last] = visibleRange.value
  const out: { def: GanttRowDef; index: number; y: number }[] = []
  for (let i = first; i <= last; i++) out.push({ def: rowDefs.value[i], index: i, y: i * props.rowHeight })
  return out
})

// === 任務長條 ===

function eventPayload(i: number): GanttTaskEvent {
  const t = tasks.value[i]
  return {
    datum: parsedRows()[t.index],
    key: t.key,
    row: t.row,
    start: new Date(t.start),
    end: new Date(t.end),
    status: t.status,
    milestone: t.milestone,
    progress: t.progress,
  }
}

function parsedRows(): Row[] {
  return toRaw(props.data) ?? []
}

/** 非 CSS 變數的顏色 → 文字色（同一個顏色只算一次） */
const textColorCache = new Map<string, '#ffffff' | '#111827'>()

function textColorFor(color: string): '#ffffff' | '#111827' {
  // CSS 變數會隨深淺色模式改變，不快取
  if (color.includes('var(')) return readableTextColor(resolveCanvasColor(color, containerRef.value))
  let c = textColorCache.get(color)
  if (!c) {
    c = readableTextColor(color)
    textColorCache.set(color, c)
  }
  return c
}

/** 目前的高亮鍵 */
const highlightTarget = computed(() => {
  const k = props.highlightKey
  return k === null || k === undefined || k === '' ? null : String(k)
})

interface BarView {
  taskIndex: number
  task: GanttTask
  x: number
  y: number
  w: number
  color: string
  textColor: string
  diamond: string
  progressW: number | null
  labelText: string
  labelX: number | null
  labelInside: boolean
  highlighted: boolean
}

const visibleBars = computed<BarView[]>(() => {
  const xs = xScale.value
  const w = plotWidth.value
  const ts = tasks.value
  const groups = rowGroups.value
  const [first, last] = visibleRange.value
  const bh = props.barHeight
  const custom = props.customRenderers
  const out: BarView[] = []
  if (w <= 0) return out
  for (let r = first; r <= last; r++) {
    const y = r * props.rowHeight + (props.rowHeight - bh) / 2
    // 只看這一列可見的任務，名稱才不會被藏起來的任務擋住
    const group = groups[r].filter((i) => !hidden.value.has(statusKey(ts[i].status)))
    for (let g = 0; g < group.length; g++) {
      const i = group[g]
      const t = ts[i]
      const x0 = xs(new Date(t.start))
      const x1 = t.milestone ? x0 : xs(new Date(t.end))
      const half = bh / 2
      // ✅ 完全在畫面外的任務不畫
      if (x1 + half < -2 || x0 - half > w + 2) continue
      const payload = custom.barColor || custom.barLabel ? eventPayload(i) : null
      const color = (payload && custom.barColor?.(payload.datum, payload)) || statusInfo(t.status).color
      const textColor = textColorFor(color)
      const bw = t.milestone ? 0 : Math.max(2, x1 - x0)
      const labelText = props.showBarLabels ? (payload && custom.barLabel ? custom.barLabel(payload.datum, payload) : t.label) : ''

      // 名稱：長條裡放得下就放裡面（被捲出左緣時貼著左緣）；放不下就放右邊，
      // 但右邊要有空間 —— 不能壓到同一列的下一個任務
      let labelX: number | null = null
      let labelInside = false
      if (labelText) {
        const tw = estimateTextWidth(labelText)
        const visibleStart = Math.max(x0, 0)
        const visibleEnd = Math.min(x0 + bw, w)
        const nextIndex = group[g + 1]
        const nextStart = nextIndex === undefined ? Infinity : xs(new Date(ts[nextIndex].start)) - (ts[nextIndex].milestone ? half : 0)
        const outsideX = (t.milestone ? x0 + half : x0 + bw) + 6
        if (!t.milestone && visibleEnd - visibleStart >= tw + 12) {
          labelX = visibleStart + 6
          labelInside = true
        } else if (outsideX + tw + 6 <= Math.min(nextStart, w)) {
          labelX = outsideX
        }
      }

      out.push({
        taskIndex: i,
        task: t,
        x: x0,
        y,
        w: bw,
        color,
        textColor,
        diamond: `M${x0},${y} L${x0 + half},${y + half} L${x0},${y + bh} L${x0 - half},${y + half} Z`,
        // 0% 與 100% 不畫：狀態已經說明了，每條都畫一條線反而雜亂
        progressW: props.showProgress && t.progress !== null && t.progress > 0 && t.progress < 1 && bw > 12 ? (bw - 6) * t.progress : null,
        labelText,
        labelX,
        labelInside,
        highlighted: highlightTarget.value !== null && t.key === highlightTarget.value,
      })
    }
  }
  return out
})

function rowData(r: number): Row[] {
  const rows = parsedRows()
  return (rowGroups.value[r] ?? []).map((i) => rows[tasks.value[i].index])
}

function onRowClick(r: number): void {
  const def = rowDefs.value[r]
  if (def) emit('row-click', { row: def.value, label: def.label, tasks: rowData(r) })
}

// === 滑鼠提示與點擊 ===

const tooltipData = ref<GanttTooltip | null>(null)
const tooltipVisible = ref(false)
const hoverIndex = ref(-1)

const fmtDate = d3.timeFormat('%Y/%m/%d')
const fmtDateTime = d3.timeFormat('%Y/%m/%d %H:%M')

/** 剛好是午夜的時間只顯示日期 */
function formatTime(ms: number): string {
  const d = new Date(ms)
  return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 ? fmtDate(d) : fmtDateTime(d)
}

const tooltipLines = computed(() => {
  const t = tooltipData.value
  if (!t) return []
  if (props.customRenderers.tooltip) return props.customRenderers.tooltip(t.datum, t)
  const task = tasks.value[hoverIndex.value]
  const lines: string[] = []
  if (t.rowLabel && t.rowLabel !== t.label) lines.push(`列：${t.rowLabel}`)
  if (t.status) lines.push(`狀態：${t.statusLabel}`)
  if (!task || t.milestone) {
    lines.push(`時間：${formatTime(t.start.getTime())}`)
    return lines
  }
  lines.push(`開始：${formatTime(task.start)}`, `結束：${formatTime(task.displayEnd)}`, `工期：${formatDuration(task.end - task.start)}`)
  if (t.progress !== null) lines.push(`進度：${Math.round(t.progress * 100)}%`)
  return lines
})

/** 提示框放在游標右下；靠近右緣或下緣時翻到另一側 */
const tooltipStyle = computed(() => {
  const t = tooltipData.value
  if (!t) return {}
  const { containerX: x, containerY: y } = t.position
  const box = containerRef.value?.getBoundingClientRect()
  const w = box?.width || effectiveWidth.value
  const h = box?.height || effectiveHeight.value
  const flipX = x > w - 220
  const flipY = y > h - 120
  return {
    left: flipX ? undefined : `${x + 14}px`,
    right: flipX ? `${w - x + 14}px` : undefined,
    top: flipY ? undefined : `${y + 14}px`,
    bottom: flipY ? `${h - y + 14}px` : undefined,
  }
})

/** 拖曳平移中不顯示提示 */
let panning = false

function showTooltip(i: number, event: MouseEvent): void {
  const t = tasks.value[i]
  if (!t) return
  const rect = containerRef.value?.getBoundingClientRect()
  const position = {
    pageX: event.clientX,
    pageY: event.clientY,
    containerX: event.clientX - (rect?.left ?? 0),
    containerY: event.clientY - (rect?.top ?? 0),
  }
  const payload = eventPayload(i)
  const info = statusInfo(t.status)
  const rowDef = rowDefs.value.find((r) => r.value === t.row)
  const color = (props.customRenderers.barColor?.(payload.datum, payload)) || info.color
  tooltipData.value = { ...payload, label: t.label, rowLabel: rowDef?.label ?? t.row, statusLabel: info.label, color, position }
  tooltipVisible.value = true
}

function onBarEnter(i: number, event: MouseEvent): void {
  if (panning) return
  hoverIndex.value = i
  showTooltip(i, event)
  emit('task-hover', eventPayload(i))
  if (tooltipData.value) emit('tooltip-show', tooltipData.value)
}

function onBarMove(i: number, event: MouseEvent): void {
  if (panning) return
  // 平移結束後游標還在長條上：mouseenter 不會再來，從 mousemove 接回來
  if (hoverIndex.value !== i) onBarEnter(i, event)
  else showTooltip(i, event)
}

function clearHover(): void {
  if (hoverIndex.value < 0) return
  hoverIndex.value = -1
  tooltipVisible.value = false
  emit('tooltip-hide')
}

function onBarClick(i: number): void {
  emit('task-click', eventPayload(i))
}

// === 縮放（d3.zoom，只用 X 方向） ===

let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null

function wheelModifierPressed(event: WheelEvent): boolean {
  if (props.wheelZoomModifier === 'ctrl') return event.ctrlKey || event.metaKey
  if (props.wheelZoomModifier === 'alt') return event.altKey
  return true
}

/** 以水平為主的滾輪（觸控板左右滑、Shift + 滾輪）：平移時間軸，不縮放 */
function horizontalDelta(event: WheelEvent): number {
  if (event.shiftKey && event.deltaX === 0) return event.deltaY
  return Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : 0
}

function setupZoom(): void {
  const el = plotRef.value
  if (!el) return
  const w = plotWidth.value
  const h = contentHeight.value
  const [b0, b1] = zoomLimits.value.map((v) => baseX.value(new Date(v)))
  const tx0 = Math.min(0, b0)
  const tx1 = Math.max(w, b1)
  // 最小倍率：整個邊界剛好放得進繪圖區（任務都在預設範圍內時為 1）
  const kMin = Math.min(1, w > 0 ? w / (tx1 - tx0) : 1)
  // d3.zoom 把 transform 存在元素的 __zoom 上，重新綁定時不會清掉 —— 手動歸零
  d3.select(el).property('__zoom', d3.zoomIdentity)
  zoomBehavior = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([kMin, Math.max(1, props.maxZoomScale)])
    .extent([[0, 0], [w, h]])
    .translateExtent([[tx0, 0], [tx1, h]])
    // 🔧 d3 預設按住 Ctrl 時滾輪量 ×10（為了觸控板捏合的小增量），但這裡的滾輪縮放本來就要按 Ctrl ——
    //    一般滑鼠滾一格就放大 4 倍。只有小增量（捏合）才 ×10
    .wheelDelta((event: WheelEvent) => {
      const unit = event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002
      const pinch = event.ctrlKey && event.deltaMode === 0 && Math.abs(event.deltaY) < 50
      return -event.deltaY * unit * (pinch ? 10 : 1)
    })
    .filter((event: Event) => {
      if (!props.enableZoom) return false
      if (event.type === 'wheel') {
        const we = event as WheelEvent
        return horizontalDelta(we) === 0 && wheelModifierPressed(we)
      }
      if (event.type === 'dblclick') return false // 雙擊改為重設縮放
      return !(event as MouseEvent).button
    })
    .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      // 拖曳平移中不顯示提示（只是點一下不算，點擊時提示框照常留著）
      if (event.sourceEvent?.type === 'mousemove') {
        panning = true
        clearHover()
      }
      // 只取 X 方向：列的位置由垂直捲動決定
      zoomTransform.value = d3.zoomIdentity.translate(event.transform.x, 0).scale(event.transform.k)
      emit('zoom-change', { timeDomain: xScale.value.domain() as [Date, Date], scale: event.transform.k })
    })
    .on('end', () => {
      panning = false
    })
  d3.select(el).call(zoomBehavior).on('dblclick.zoom', null)
}

/** 水平滾輪平移；已經到底（平移不動）時不攔截，交還給頁面 */
function onWheel(event: WheelEvent): void {
  if (!props.enableZoom || !zoomBehavior || !plotRef.value) return
  const dx = horizontalDelta(event)
  if (dx === 0) return
  const before = zoomTransform.value.x
  d3.select(plotRef.value).call(zoomBehavior.translateBy, -dx / zoomTransform.value.k, 0)
  if (zoomTransform.value.x !== before) event.preventDefault()
}

/** 回到預設範圍 */
function resetZoom(): void {
  if (plotRef.value && zoomBehavior) {
    d3.select(plotRef.value).call(zoomBehavior.transform, d3.zoomIdentity)
  }
  zoomTransform.value = d3.zoomIdentity
  emit('zoom-reset')
}

// 繪圖區大小或範圍改變：舊的 transform 是像素位移，已經對不上 —— 回到預設範圍並重設邊界
watch(
  () => [plotWidth.value, contentHeight.value, baseDomain.value[0], baseDomain.value[1], zoomLimits.value[0], zoomLimits.value[1]],
  () => {
    if (!plotRef.value) return
    if (zoomBehavior) d3.select(plotRef.value).on('.zoom', null)
    zoomTransform.value = d3.zoomIdentity
    setupZoom()
  }
)

// === 對外方法 ===

/** 捲到某一列（放在最上面）；找不到時回傳 false */
function scrollToRow(row: string | number): boolean {
  const r = rowDefs.value.findIndex((d) => d.value === String(row))
  if (r < 0) return false
  if (bodyRef.value) {
    bodyRef.value.scrollTop = r * props.rowHeight
    scrollTop.value = bodyRef.value.scrollTop
  }
  return true
}

/**
 * 讓某個任務出現在畫面上：列捲進視窗；任務在目前的時間範圍外時，把它移到中間。
 * 找不到時回傳 false。
 */
function scrollToTask(key: string | number): boolean {
  const i = tasks.value.findIndex((t) => t.key === String(key))
  if (i < 0) return false
  const t = tasks.value[i]
  const r = rowDefs.value.findIndex((d) => d.value === t.row)
  const body = bodyRef.value
  if (body && r >= 0) {
    const top = r * props.rowHeight
    const viewH = body.clientHeight || effectiveHeight.value
    if (top < body.scrollTop || top + props.rowHeight > body.scrollTop + viewH) {
      body.scrollTop = Math.max(0, top - (viewH - props.rowHeight) / 2)
      scrollTop.value = body.scrollTop
    }
  }
  const [d0, d1] = xScale.value.domain().map((d) => d.getTime())
  if ((t.end < d0 || t.start > d1) && plotRef.value && zoomBehavior) {
    const mid = baseX.value(new Date((t.start + t.end) / 2))
    d3.select(plotRef.value).call(zoomBehavior.translateTo, mid, contentHeight.value / 2)
  }
  return true
}

// === 生命週期 ===

/** 註冊監聽的元素（卸載時 template ref 已是 null，要記住元素本身才移除得掉） */
let plotEl: SVGSVGElement | null = null

onMounted(() => {
  if (props.autoResize && containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer)
      resizeDebounceTimer = setTimeout(() => {
        if (!containerRef.value) return
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          // contentRect 不含 padding（margin），要加回來才是整張圖的大小
          observedWidth.value = Math.floor(width + props.margin.left + props.margin.right)
          observedHeight.value = Math.floor(height + props.margin.top + props.margin.bottom)
          measureGutter()
          emit('chart-resize', { width: observedWidth.value, height: observedHeight.value })
        }
      }, props.debounceDelay)
    })
    resizeObserver.observe(containerRef.value)
  }

  measureGutter()
  if (props.showToday && !Number.isFinite(parseTime(props.today))) {
    nowTimer = setInterval(() => {
      now.value = Date.now()
    }, 60_000)
  }

  plotEl = plotRef.value
  plotEl?.addEventListener('dblclick', resetZoom)
  plotEl?.addEventListener('wheel', onWheel, { passive: false })
  setupZoom()

  emit('chart-ready', { width: effectiveWidth.value, height: effectiveHeight.value })
})

onUnmounted(() => {
  // 1. ResizeObserver、防抖與「今天」的計時器
  resizeObserver?.disconnect()
  resizeObserver = null
  if (resizeDebounceTimer) {
    clearTimeout(resizeDebounceTimer)
    resizeDebounceTimer = null
  }
  if (nowTimer) {
    clearInterval(nowTimer)
    nowTimer = null
  }
  // 2. d3.zoom（實例事件）
  if (plotEl) d3.select(plotEl).on('.zoom', null)
  zoomBehavior = null
  // 3. DOM 事件
  plotEl?.removeEventListener('dblclick', resetZoom)
  plotEl?.removeEventListener('wheel', onWheel)
  plotEl = null
})

defineExpose({ resetZoom, scrollToRow, scrollToTask, containerRef })
</script>

<style scoped>
.gantt-chart {
  position: relative;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.gantt-body.is-scrollable {
  overflow-x: hidden;
  overflow-y: auto;
  /* 捲軸寬度固定保留：有沒有捲軸，時間軸和長條都對得齊 */
  scrollbar-gutter: stable;
}

.gantt-axis,
.gantt-plot {
  overflow: hidden;
}

.gantt-surface {
  fill: transparent;
}

.gantt-plot.is-zoomed {
  cursor: grab;
}

.gantt-plot.is-zoomed:active {
  cursor: grabbing;
}

.gantt-axis-line {
  stroke: rgb(var(--t-stroke-medium));
  shape-rendering: crispEdges;
}

.gantt-upper-label {
  font-size: 12px;
  font-weight: 600;
  fill: rgb(var(--t-content-primary));
}

.gantt-lower-label {
  font-size: 11px;
  fill: rgb(var(--t-content-secondary));
}

.gantt-stripe {
  fill: rgb(var(--t-surface-secondary));
}

.gantt-row-sep {
  stroke: rgb(var(--t-stroke-light));
  shape-rendering: crispEdges;
}

.gantt-grid line {
  stroke: rgb(var(--t-stroke-light));
  shape-rendering: crispEdges;
}

.gantt-grid line.is-major {
  stroke: rgb(var(--t-stroke-medium));
}

.gantt-task {
  cursor: pointer;
}

.gantt-bar,
.gantt-milestone {
  stroke: transparent;
  stroke-width: 2;
}

.gantt-task.is-hovered .gantt-bar,
.gantt-task.is-hovered .gantt-milestone {
  stroke: rgb(var(--t-content-secondary));
}

.gantt-task.is-highlighted .gantt-bar,
.gantt-task.is-highlighted .gantt-milestone {
  stroke: rgb(var(--t-content-primary));
  stroke-width: 2.5;
}

.gantt-progress-track {
  opacity: 0.3;
}

.gantt-progress {
  opacity: 0.9;
}

.gantt-bar-label {
  font-size: 12px;
  pointer-events: none;
  user-select: none;
}

.gantt-today {
  stroke: rgb(var(--t-danger));
  stroke-width: 1.5;
  stroke-dasharray: 4 3;
  pointer-events: none;
}

.gantt-today-marker rect {
  fill: rgb(var(--t-danger-solid));
}

.gantt-today-marker text {
  font-size: 10px;
  fill: rgb(var(--t-content-on-solid));
}

.gantt-row-label {
  box-sizing: border-box;
}
</style>
