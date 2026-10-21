<template>
  <div
    ref="containerRef"
    class="status-scatter-map"
    :style="autoResize ? { width: '100%', height: '100%' } : { width: `${width}px`, height: `${height}px` }"
  >
    <!-- 標題與圖例（HTML：圖例要能用鍵盤切換） -->
    <div class="absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-1 px-2 pt-1">
      <p v-if="title" class="text-sm font-semibold text-content-primary">{{ title }}</p>
      <div v-if="showLegend" class="flex flex-wrap justify-center gap-x-4 gap-y-1" role="group" aria-label="狀態圖例">
        <button
          v-for="item in legendItems"
          :key="item.value"
          type="button"
          class="inline-flex items-center gap-1.5 rounded px-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          :aria-pressed="!item.hidden"
          :title="item.hidden ? `顯示 ${item.label}` : `隱藏 ${item.label}`"
          @click="toggleStatus(item.value)"
        >
          <span class="h-3 w-10 shrink-0 rounded-sm" :style="{ background: item.color, opacity: item.hidden ? 0.35 : 1 }" aria-hidden="true"></span>
          <span :class="item.hidden ? 'text-content-tertiary line-through' : 'text-content-secondary'">
            {{ item.label }}<template v-if="showCounts"> ({{ item.count.toLocaleString() }})</template>
          </span>
        </button>
      </div>
    </div>

    <!-- 底層：格線與座標軸 -->
    <svg
      class="ssm-layer"
      :width="effectiveWidth"
      :height="effectiveHeight"
      role="img"
      :aria-label="ariaSummary"
    >
      <g :transform="`translate(${plot.left}, ${plot.top})`">
        <g ref="gridRef" class="ssm-grid"></g>
        <g ref="xAxisRef" class="ssm-x-axis" :transform="`translate(0, ${plot.height})`"></g>
        <g ref="yAxisRef" class="ssm-y-axis"></g>
        <text
          v-if="xAxisLabel"
          class="ssm-axis-label"
          :x="plot.width / 2"
          :y="plot.height + 40"
          text-anchor="middle"
        >{{ xAxisLabel }}</text>
        <text
          v-if="yAxisLabel"
          class="ssm-axis-label"
          :transform="`translate(${-margin.left + 14}, ${plot.height / 2}) rotate(-90)`"
          text-anchor="middle"
        >{{ yAxisLabel }}</text>
      </g>
    </svg>

    <!-- 中層：資料點畫在 Canvas 上（探針點動輒數萬個，SVG 節點撐不住） -->
    <canvas
      ref="canvasRef"
      class="ssm-canvas"
      :style="{ left: `${plot.left}px`, top: `${plot.top}px` }"
      aria-hidden="true"
    ></canvas>

    <!-- 上層：高亮、hover 標記與縮放／滑鼠事件 -->
    <svg class="ssm-layer" :width="effectiveWidth" :height="effectiveHeight" aria-hidden="true">
      <defs>
        <clipPath :id="clipId">
          <rect :width="Math.max(0, plot.width)" :height="Math.max(0, plot.height)" />
        </clipPath>
      </defs>
      <g :transform="`translate(${plot.left}, ${plot.top})`">
        <g :clip-path="`url(#${clipId})`">
          <g ref="highlightRef" class="ssm-highlight"></g>
          <g ref="hoverRef" class="ssm-hover"></g>
        </g>
        <rect
          ref="surfaceRef"
          class="ssm-surface"
          :class="{ 'is-zoomed': isZoomed }"
          :width="Math.max(0, plot.width)"
          :height="Math.max(0, plot.height)"
        />
      </g>
    </svg>

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
        class="pointer-events-none absolute z-30 min-w-32 rounded-md border border-stroke-light bg-surface-primary px-2.5 py-1.5 text-xs text-content-primary shadow-lg"
        role="tooltip"
        :style="tooltipStyle"
      >
        <div class="mb-0.5 flex items-center gap-1.5 font-semibold">
          <span class="h-2.5 w-2.5 rounded-full" :style="{ background: tooltipData.color }" aria-hidden="true"></span>
          {{ tooltipData.statusLabel }}
        </div>
        <div v-for="line in tooltipLines" :key="line" class="whitespace-pre text-content-secondary">{{ line }}</div>
      </div>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, toRaw, useId, watch, watchEffect } from 'vue'
import * as d3 from 'd3'
import { chartTheme } from './chartTheme'
import { resolveCanvasColor } from './utils/largeData'
import {
  equalAspectRect,
  extentWithPadding,
  groupByStatus,
  makeDotStamp,
  nearestInDrawOrder,
  stampDots,
  ticksWithEnds,
  type DotStamp,
  type PlotRect,
} from './utils/statusScatter'

/**
 * StatusScatterMap —— 依狀態著色的座標散佈圖（探針點／量測點分佈）
 *
 * - 每筆資料是一個 (x, y) 位置與一個狀態（PASS / NEARFAIL / FAIL…），狀態決定顏色
 * - X、Y 預設等比例：座標是實體位置時，圖形不會被拉扁
 * - 資料點畫在 Canvas：數萬點也順；hover / 點擊用座標命中測試
 * - 圖例點一下隱藏 / 顯示該狀態；滾輪以游標為中心縮放、拖曳平移、雙擊重設
 * - highlightKey：外部（例如表格選取）指定一筆資料，在圖上標出位置
 */

/** 一種狀態的顯示設定 */
export interface StatusDef {
  /** 資料中的狀態值 */
  value: string
  /** 圖例與提示框顯示的文字（預設同 value） */
  label?: string
  /** 點的顏色 */
  color: string
}

/** 滑鼠提示的資料 */
export interface StatusScatterTooltip {
  datum: Record<string, unknown>
  key: string
  status: string
  statusLabel: string
  color: string
  x: number
  y: number
  /** 相對圖表容器的位置 */
  position: { containerX: number; containerY: number; pageX: number; pageY: number }
}

type Row = Record<string, unknown>

interface StatusScatterMapProps {
  // === 基礎配置 ===
  width?: number
  height?: number
  /** 跟著容器大小調整（容器需有高度） */
  autoResize?: boolean
  /** ResizeObserver 防抖延遲（毫秒） */
  debounceDelay?: number
  margin?: { top: number; right: number; bottom: number; left: number }

  // === 數據配置 ===
  data: Row[]

  // === 欄位映射（支援任意資料結構）===
  xField?: string
  yField?: string
  statusField?: string
  /** 資料鍵的欄位（highlightKey、事件的 key）；沒有此欄位時用索引 */
  keyField?: string
  /** 自訂資料鍵；優先於 keyField */
  keyFn?: ((datum: Row, index: number) => string) | null

  // === 狀態配置 ===
  /** 狀態清單；順序就是繪製順序，後面的畫在上層 */
  statuses?: StatusDef[]
  /** 不在 statuses 裡的狀態用的顏色 */
  otherColor?: string
  /** 隱藏的狀態（可用 v-model:hidden-statuses 雙向綁定） */
  hiddenStatuses?: string[]

  // === 軸配置 ===
  /** X 範圍；未指定時依資料（含 padding） */
  xDomain?: [number, number] | null
  yDomain?: [number, number] | null
  /** 自動範圍兩端外推的比例 */
  domainPadding?: number
  /** X、Y 每單位像素相同（實體座標建議開啟） */
  equalAspect?: boolean
  xAxisLabel?: string
  yAxisLabel?: string
  /** 一般刻度格式 */
  tickFormat?: ((value: number) => string) | null
  /** 範圍端點刻度格式（預設一位小數，如 15,643.0） */
  endTickFormat?: ((value: number) => string) | null
  /** 在軸的兩端標出範圍端點值 */
  showEndTicks?: boolean

  // === 視覺配置 ===
  title?: string
  pointRadius?: number
  pointOpacity?: number
  showGrid?: boolean
  showLegend?: boolean
  /** 圖例顯示各狀態筆數 */
  showCounts?: boolean

  // === 互動配置 ===
  enableTooltip?: boolean
  /** 滾輪縮放、拖曳平移、雙擊重設 */
  enableZoom?: boolean
  /** 要按住哪個鍵才用滾輪縮放（'ctrl' 也接受 Mac 的 ⌘） */
  wheelZoomModifier?: 'none' | 'ctrl' | 'alt'
  maxZoomScale?: number
  showResetButton?: boolean
  /** 要標出的資料鍵（對應 keyFn / keyField） */
  highlightKey?: string | number | null

  // === 企業級擴展點 ===
  customRenderers?: {
    /** 自訂點的形狀：在 Canvas 上畫一個點 */
    point?: (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, datum: Row) => void
    /** 自訂提示框內容（每行一個字串） */
    tooltip?: (datum: Row, info: { x: number; y: number; status: string; key: string }) => string[]
  }
}

const props = withDefaults(defineProps<StatusScatterMapProps>(), {
  width: 640,
  height: 560,
  autoResize: false,
  debounceDelay: 150,
  margin: () => ({ top: 40, right: 32, bottom: 40, left: 72 }),
  xField: 'x',
  yField: 'y',
  statusField: 'status',
  keyField: 'id',
  keyFn: null,
  // 預設：良品綠、臨界黃、不良紅；FAIL 最後畫，不會被大量的 PASS 蓋住
  statuses: () => [
    { value: 'PASS', label: 'PASS', color: '#0f9d75' },
    { value: 'NEARFAIL', label: 'NEARFAIL', color: '#fbd45b' },
    { value: 'FAIL', label: 'FAIL', color: '#ef4565' },
  ],
  otherColor: '#9ca3af',
  hiddenStatuses: () => [],
  xDomain: null,
  yDomain: null,
  domainPadding: 0.05,
  equalAspect: true,
  xAxisLabel: '',
  yAxisLabel: '',
  tickFormat: null,
  endTickFormat: null,
  showEndTicks: true,
  title: '',
  pointRadius: 3.5,
  pointOpacity: 1,
  showGrid: true,
  showLegend: true,
  showCounts: false,
  enableTooltip: true,
  enableZoom: true,
  wheelZoomModifier: 'none',
  maxZoomScale: 50,
  showResetButton: true,
  highlightKey: null,
  customRenderers: () => ({}),
})

const emit = defineEmits<{
  'chart-ready': [payload: { width: number; height: number }]
  'chart-resize': [payload: { width: number; height: number }]
  'point-hover': [payload: Omit<StatusScatterTooltip, 'position' | 'color' | 'statusLabel'>]
  'point-click': [payload: Omit<StatusScatterTooltip, 'position' | 'color' | 'statusLabel'>]
  'tooltip-show': [payload: StatusScatterTooltip]
  'tooltip-hide': []
  'zoom-change': [payload: { xDomain: [number, number]; yDomain: [number, number]; scale: number }]
  'zoom-reset': []
  'legend-toggle': [payload: { status: string; hidden: boolean }]
  'update:hiddenStatuses': [value: string[]]
}>()

// === Refs ===
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const gridRef = ref<SVGGElement | null>(null)
const xAxisRef = ref<SVGGElement | null>(null)
const yAxisRef = ref<SVGGElement | null>(null)
const highlightRef = ref<SVGGElement | null>(null)
const hoverRef = ref<SVGGElement | null>(null)
const surfaceRef = ref<SVGRectElement | null>(null)

/** clip-path 的 id 每個實例唯一，同頁多張圖才不會互相覆蓋 */
const clipId = `ssm-clip-${useId()}`

// === 響應式尺寸 ===
const observedWidth = ref(props.width)
const observedHeight = ref(props.height)
let resizeObserver: ResizeObserver | null = null
let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null

const effectiveWidth = computed(() => (props.autoResize ? observedWidth.value : props.width))
const effectiveHeight = computed(() => (props.autoResize ? observedHeight.value : props.height))

/** 有標題時上方多留一行 */
const marginTop = computed(() => props.margin.top + (props.title ? 22 : 0))

// === 資料解析（與縮放無關，資料不變就不重算） ===

/**
 * 把資料攤成平坦陣列。
 * ✅ 先讀 length（push 仍會觸發重算），再用原始陣列掃描：不經 Vue Proxy，數萬筆也快
 */
const parsed = computed(() => {
  void props.data.length
  const rows = toRaw(props.data) ?? []
  const n = rows.length
  const xs = new Float64Array(n)
  const ys = new Float64Array(n)
  const status = new Array<string>(n)
  for (let i = 0; i < n; i++) {
    const d = rows[i] ?? {}
    const x = d[props.xField]
    const y = d[props.yField]
    xs[i] = x === null || x === undefined || x === '' ? NaN : Number(x)
    ys[i] = y === null || y === undefined || y === '' ? NaN : Number(y)
    status[i] = String(d[props.statusField] ?? '')
  }
  return { rows, xs, ys, status }
})

/** 依狀態分組；other（未知狀態）最先畫，statuses 依序畫在上面 */
const grouping = computed(() => groupByStatus(parsed.value.status, props.statuses.map((s) => s.value)))

// === 隱藏狀態（可受控） ===
const hidden = ref(new Set(props.hiddenStatuses))
watch(
  () => props.hiddenStatuses,
  (list) => {
    hidden.value = new Set(list)
  }
)

/** 未知狀態的圖例 key */
const OTHER = '__other__'

const legendItems = computed(() => {
  const items = props.statuses.map((s, i) => ({
    value: s.value,
    label: s.label ?? s.value,
    color: s.color,
    count: grouping.value.groups[i].length,
    hidden: hidden.value.has(s.value),
  }))
  if (grouping.value.other.length) {
    items.unshift({
      value: OTHER,
      label: '其他',
      color: props.otherColor,
      count: grouping.value.other.length,
      hidden: hidden.value.has(OTHER),
    })
  }
  return items
})

function toggleStatus(value: string): void {
  const next = new Set(hidden.value)
  const nowHidden = !next.has(value)
  if (nowHidden) next.add(value)
  else next.delete(value)
  hidden.value = next
  emit('legend-toggle', { status: value, hidden: nowHidden })
  emit('update:hiddenStatuses', [...next])
}

/** 讀螢幕報讀用的摘要：各狀態筆數 */
const ariaSummary = computed(() => {
  const parts = legendItems.value.map((it) => `${it.label} ${it.count} 筆`)
  return `${props.title || '狀態散佈圖'}：${parts.join('、')}`
})

// === 比例尺 ===

const baseXDomain = computed<[number, number]>(
  () => props.xDomain ?? extentWithPadding(parsed.value.xs, props.domainPadding)
)
const baseYDomain = computed<[number, number]>(
  () => props.yDomain ?? extentWithPadding(parsed.value.ys, props.domainPadding)
)

/** 繪圖區（相對 SVG 左上角）；等比例時水平置中、貼齊上方（緊接圖例，多出的高度留在下面） */
const plot = computed<PlotRect>(() => {
  const availW = effectiveWidth.value - props.margin.left - props.margin.right
  const availH = effectiveHeight.value - marginTop.value - props.margin.bottom
  const [x0, x1] = baseXDomain.value
  const [y0, y1] = baseYDomain.value
  const rect = props.equalAspect
    ? equalAspectRect(availW, availH, Math.abs(x1 - x0), Math.abs(y1 - y0))
    : { left: 0, top: 0, width: Math.max(0, availW), height: Math.max(0, availH) }
  return { ...rect, left: rect.left + props.margin.left, top: marginTop.value }
})

/** 目前的縮放（d3.zoom 的 transform） */
const zoomTransform = shallowRef<d3.ZoomTransform>(d3.zoomIdentity)
const isZoomed = computed(() => zoomTransform.value.k > 1 + 1e-9)

const baseX = computed(() => d3.scaleLinear().domain(baseXDomain.value).range([0, plot.value.width]))
const baseY = computed(() => d3.scaleLinear().domain(baseYDomain.value).range([plot.value.height, 0]))
const xScale = computed(() => zoomTransform.value.rescaleX(baseX.value))
const yScale = computed(() => zoomTransform.value.rescaleY(baseY.value))

// === 資料鍵 ===

function keyOf(i: number): string {
  const d = parsed.value.rows[i]
  if (props.keyFn) return String(props.keyFn(d, i))
  const v = d?.[props.keyField]
  return v === null || v === undefined || v === '' ? String(i) : String(v)
}

function statusInfo(i: number): { value: string; label: string; color: string } {
  const value = parsed.value.status[i]
  const def = props.statuses.find((s) => s.value === value)
  return def
    ? { value, label: def.label ?? def.value, color: def.color }
    : { value, label: value || '其他', color: props.otherColor }
}

// === 渲染 ===

/** 這一輪的像素座標（命中測試用）；被隱藏的狀態為 NaN */
let px = new Float32Array(0)
let py = new Float32Array(0)
/** 依繪製順序排列、目前可見的索引群組 */
let drawOrder: number[][] = []

const defaultTickFormat = d3.format(',')
const defaultEndFormat = d3.format(',.1f')

/** 座標軸與格線 */
function renderAxes(): void {
  const xs = xScale.value
  const ys = yScale.value
  const { width: w, height: h } = plot.value
  if (w <= 0 || h <= 0) return
  const fmt = props.tickFormat ?? defaultTickFormat
  const endFmt = props.endTickFormat ?? defaultEndFormat

  const xTicks = props.showEndTicks
    ? ticksWithEnds(xs.ticks(Math.max(2, Math.floor(w / 90))), xs.domain() as [number, number], xs, 56)
    : xs.ticks(Math.max(2, Math.floor(w / 90))).map((value) => ({ value, isEnd: false }))
  const yTicks = props.showEndTicks
    ? ticksWithEnds(ys.ticks(Math.max(2, Math.floor(h / 50))), ys.domain() as [number, number], ys, 22)
    : ys.ticks(Math.max(2, Math.floor(h / 50))).map((value) => ({ value, isEnd: false }))
  const label = (t: { value: number; isEnd: boolean }) => (t.isEnd ? endFmt(t.value) : fmt(t.value))

  if (xAxisRef.value) {
    const axis = d3.axisBottom(xs).tickValues(xTicks.map((t) => t.value)).tickFormat((v) => label(xTicks.find((t) => t.value === +v)!))
    d3.select(xAxisRef.value).call(axis)
  }
  if (yAxisRef.value) {
    const axis = d3.axisLeft(ys).tickValues(yTicks.map((t) => t.value)).tickFormat((v) => label(yTicks.find((t) => t.value === +v)!))
    d3.select(yAxisRef.value).call(axis)
  }

  if (gridRef.value) {
    const g = d3.select(gridRef.value)
    const vLines = props.showGrid ? xTicks : []
    const hLines = props.showGrid ? yTicks : []
    g.selectAll('line.ssm-grid-v')
      .data(vLines)
      .join('line')
      .attr('class', 'ssm-grid-v')
      .attr('x1', (t) => xs(t.value))
      .attr('x2', (t) => xs(t.value))
      .attr('y1', 0)
      .attr('y2', h)
      .style('stroke', chartTheme.grid)
    g.selectAll('line.ssm-grid-h')
      .data(hLines)
      .join('line')
      .attr('class', 'ssm-grid-h')
      .attr('x1', 0)
      .attr('x2', w)
      .attr('y1', (t) => ys(t.value))
      .attr('y2', (t) => ys(t.value))
      .style('stroke', chartTheme.grid)
  }
}

/** 圓點遮罩依半徑快取（半徑或裝置像素比改變才重建） */
let dotStamp: DotStamp | null = null
let dotStampRadius = -1
/** 重複使用的像素緩衝區（尺寸改變才重新配置） */
let pixelBuffer: ImageData | null = null

/** 在 Canvas 上畫所有可見的點，並算出命中測試用的像素座標 */
function renderPoints(): void {
  const { xs, ys, rows } = parsed.value
  const n = xs.length
  const sx = xScale.value
  const sy = yScale.value
  const { width: w, height: h } = plot.value

  // 繪製順序：未知狀態最先，statuses 依序在上
  const visibleGroups: { indices: number[]; color: string }[] = []
  if (!hidden.value.has(OTHER)) visibleGroups.push({ indices: grouping.value.other, color: props.otherColor })
  props.statuses.forEach((s, i) => {
    if (!hidden.value.has(s.value)) visibleGroups.push({ indices: grouping.value.groups[i], color: s.color })
  })
  drawOrder = visibleGroups.map((g) => g.indices)

  px = new Float32Array(n).fill(NaN)
  py = new Float32Array(n).fill(NaN)
  for (const group of drawOrder) {
    for (const i of group) {
      px[i] = sx(xs[i])
      py[i] = sy(ys[i])
    }
  }

  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
  const pw = Math.round(Math.max(0, w) * dpr)
  const ph = Math.round(Math.max(0, h) * dpr)
  // ✅ 只有尺寸變了才重設寬高（重設會重新配置整塊畫布）；否則清空即可
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw
    canvas.height = ph
    canvas.style.width = `${Math.max(0, w)}px`
    canvas.style.height = `${Math.max(0, h)}px`
  }
  const ctx = canvas.getContext?.('2d')
  if (!ctx) return
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, pw, ph)
  const r = props.pointRadius
  const custom = props.customRenderers.point
  // ✅ 畫面外的點不畫（放大後大部分的點都在畫面外）
  const inView = (i: number) => px[i] >= -r && px[i] <= w + r && py[i] >= -r && py[i] <= h + r

  // ✅ 預設：直接寫像素（見 stampDots 的說明），一次 putImageData
  if (!custom && typeof ctx.createImageData === 'function' && typeof ctx.putImageData === 'function') {
    if (!pixelBuffer || pixelBuffer.width !== pw || pixelBuffer.height !== ph) pixelBuffer = ctx.createImageData(pw, ph)
    pixelBuffer.data.fill(0)
    if (!dotStamp || dotStampRadius !== r * dpr) {
      dotStamp = makeDotStamp(r * dpr)
      dotStampRadius = r * dpr
    }
    for (const group of visibleGroups) {
      const rgb = d3.color(resolveCanvasColor(group.color, containerRef.value))?.rgb() ?? { r: 0, g: 0, b: 0 }
      stampDots(pixelBuffer.data, pw, ph, group.indices, px, py, dpr, dotStamp, rgb, props.pointOpacity)
    }
    ctx.putImageData(pixelBuffer, 0, 0)
    return
  }

  ctx.globalAlpha = props.pointOpacity
  for (const group of visibleGroups) {
    const color = resolveCanvasColor(group.color, containerRef.value)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (custom) {
      for (const i of group.indices) {
        if (inView(i)) custom(ctx, px[i], py[i], r, color, rows[i])
      }
      continue
    }
    // 不支援 ImageData 的環境：方塊路徑（比 arc 快得多）
    ctx.fillStyle = color
    ctx.beginPath()
    for (const i of group.indices) {
      if (inView(i)) ctx.rect(px[i] - r, py[i] - r, r * 2, r * 2)
    }
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/**
 * 目前的高亮鍵（一般變數）。
 * ✅ 主渲染讀它不會建立依賴：呼叫端常把 point-hover 的 key 回填成 highlightKey，
 *    若因此整張圖重繪，重繪又會清掉 hover，提示框就會閃個不停
 */
let highlightTarget: string | null = null

/** highlightKey 對到的點畫上光圈（被隱藏的狀態不畫） */
function renderHighlight(): void {
  if (!highlightRef.value) return
  const target = highlightTarget
  const marks: { x: number; y: number; color: string }[] = []
  if (target !== null) {
    for (let i = 0; i < px.length; i++) {
      if (!Number.isFinite(px[i]) || !Number.isFinite(py[i])) continue
      if (keyOf(i) === target) marks.push({ x: px[i], y: py[i], color: statusInfo(i).color })
    }
  }
  const g = d3.select(highlightRef.value)
  const r = props.pointRadius
  g.selectAll('circle.ssm-highlight-ring')
    .data(marks)
    .join('circle')
    .attr('class', 'ssm-highlight-ring')
    .attr('cx', (m) => m.x)
    .attr('cy', (m) => m.y)
    .attr('r', r + 6)
    .attr('fill', 'none')
    .style('stroke', chartTheme.text)
    .attr('stroke-width', 2)
  g.selectAll('circle.ssm-highlight-dot')
    .data(marks)
    .join('circle')
    .attr('class', 'ssm-highlight-dot')
    .attr('cx', (m) => m.x)
    .attr('cy', (m) => m.y)
    .attr('r', r + 1.5)
    .attr('fill', (m) => m.color)
    .style('stroke', chartTheme.surface)
    .attr('stroke-width', 1.5)
}

watch(
  () => props.highlightKey,
  (key) => {
    highlightTarget = key === null || key === undefined || key === '' ? null : String(key)
    renderHighlight()
  },
  { immediate: true }
)

// === 滑鼠提示與點擊 ===

const tooltipData = ref<StatusScatterTooltip | null>(null)
const tooltipVisible = ref(false)
let hoverIndex = -1

const tooltipLines = computed(() => {
  const t = tooltipData.value
  if (!t) return []
  if (props.customRenderers.tooltip) {
    return props.customRenderers.tooltip(t.datum, { x: t.x, y: t.y, status: t.status, key: t.key })
  }
  const lines = [`X：${defaultTickFormat(t.x)}`, `Y：${defaultTickFormat(t.y)}`]
  const keyValue = props.keyFn ? t.key : t.datum[props.keyField]
  if (keyValue !== undefined && keyValue !== null && keyValue !== '') lines.unshift(String(keyValue))
  return lines
})

/** 提示框放在游標右下；靠近右緣或下緣時翻到另一側 */
const tooltipStyle = computed(() => {
  const t = tooltipData.value
  if (!t) return {}
  const { containerX: x, containerY: y } = t.position
  const flipX = x > effectiveWidth.value - 180
  const flipY = y > effectiveHeight.value - 90
  return {
    left: flipX ? undefined : `${x + 14}px`,
    right: flipX ? `${effectiveWidth.value - x + 14}px` : undefined,
    top: flipY ? undefined : `${y + 14}px`,
    bottom: flipY ? `${effectiveHeight.value - y + 14}px` : undefined,
  }
})

/** 游標下的資料點索引（繪圖區座標） */
function hitAt(event: MouseEvent): number {
  if (!surfaceRef.value) return -1
  const [mx, my] = d3.pointer(event, surfaceRef.value)
  return nearestInDrawOrder(px, py, drawOrder, mx, my, Math.max(6, props.pointRadius + 3))
}

function pointPayload(i: number) {
  const { rows, xs, ys } = parsed.value
  return { datum: rows[i], key: keyOf(i), status: parsed.value.status[i], x: xs[i], y: ys[i] }
}

function onSurfaceMove(event: MouseEvent): void {
  const i = hitAt(event)
  if (i < 0) {
    clearHover()
    return
  }
  const rect = containerRef.value?.getBoundingClientRect()
  const position = {
    pageX: event.clientX,
    pageY: event.clientY,
    containerX: event.clientX - (rect?.left ?? 0),
    containerY: event.clientY - (rect?.top ?? 0),
  }
  const info = statusInfo(i)
  tooltipData.value = { ...pointPayload(i), statusLabel: info.label, color: info.color, position }
  tooltipVisible.value = true
  if (i !== hoverIndex) {
    hoverIndex = i
    drawHover(i, info.color)
    emit('point-hover', pointPayload(i))
    emit('tooltip-show', tooltipData.value)
  }
}

function clearHover(): void {
  if (hoverIndex < 0) return
  hoverIndex = -1
  tooltipVisible.value = false
  drawHover(-1, '')
  emit('tooltip-hide')
}

function drawHover(i: number, color: string): void {
  if (!hoverRef.value) return
  d3.select(hoverRef.value)
    .selectAll('circle')
    .data(i >= 0 ? [i] : [])
    .join('circle')
    .attr('cx', px[i])
    .attr('cy', py[i])
    .attr('r', props.pointRadius + 2.5)
    .attr('fill', color)
    .style('stroke', chartTheme.surface)
    .attr('stroke-width', 2)
}

function onSurfaceClick(event: MouseEvent): void {
  const i = hitAt(event)
  if (i >= 0) emit('point-click', pointPayload(i))
}

// 主渲染（放在 hover 狀態宣告之後：第一次執行就會呼叫 clearHover）：資料、尺寸、縮放、隱藏狀態任一改變就重畫
watchEffect(() => {
  renderAxes()
  renderPoints()
  renderHighlight()
  // 重畫後原本的 hover 位置已失效
  clearHover()
})

// === 縮放（d3.zoom：滾輪縮放、拖曳平移） ===

let zoomBehavior: d3.ZoomBehavior<SVGRectElement, unknown> | null = null

function wheelModifierPressed(event: WheelEvent): boolean {
  if (props.wheelZoomModifier === 'ctrl') return event.ctrlKey || event.metaKey
  if (props.wheelZoomModifier === 'alt') return event.altKey
  return true
}

function setupZoom(): void {
  const el = surfaceRef.value
  if (!el) return
  const { width: w, height: h } = plot.value
  // d3.zoom 把目前的 transform 存在元素的 __zoom 上，重新綁定時不會清掉 —— 手動歸零
  d3.select(el).property('__zoom', d3.zoomIdentity)
  zoomBehavior = d3
    .zoom<SVGRectElement, unknown>()
    .scaleExtent([1, Math.max(1, props.maxZoomScale)])
    .extent([[0, 0], [w, h]])
    .translateExtent([[0, 0], [w, h]])
    // ✅ 已在全覽還往外滾時 d3.zoom 不會攔截，頁面照常捲動
    .filter((event: Event) => {
      if (!props.enableZoom) return false
      if (event.type === 'wheel') return wheelModifierPressed(event as WheelEvent)
      if (event.type === 'dblclick') return false // 雙擊改為重設縮放
      return !(event as MouseEvent).button
    })
    .on('zoom', (event: d3.D3ZoomEvent<SVGRectElement, unknown>) => {
      zoomTransform.value = event.transform
      emit('zoom-change', {
        xDomain: xScale.value.domain() as [number, number],
        yDomain: yScale.value.domain() as [number, number],
        scale: event.transform.k,
      })
    })
  d3.select(el).call(zoomBehavior).on('dblclick.zoom', null)
}

/** 回到全覽 */
function resetZoom(): void {
  if (surfaceRef.value && zoomBehavior) {
    d3.select(surfaceRef.value).call(zoomBehavior.transform, d3.zoomIdentity)
  }
  zoomTransform.value = d3.zoomIdentity
  emit('zoom-reset')
}

// 繪圖區大小或範圍改變：舊的 transform 是像素位移，已經對不上 —— 回到全覽並重設邊界
watch(
  () => [plot.value.width, plot.value.height, baseXDomain.value[0], baseXDomain.value[1], baseYDomain.value[0], baseYDomain.value[1]],
  () => {
    if (!surfaceRef.value) return
    if (zoomBehavior) d3.select(surfaceRef.value).on('.zoom', null)
    zoomTransform.value = d3.zoomIdentity
    setupZoom()
  }
)

// === 生命週期 ===

/** 註冊監聽的元素（卸載時 template ref 已是 null，要記住元素本身才移除得掉） */
let surfaceEl: SVGRectElement | null = null

onMounted(() => {
  if (props.autoResize && containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer)
      resizeDebounceTimer = setTimeout(() => {
        if (!containerRef.value) return
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          observedWidth.value = Math.floor(width)
          observedHeight.value = Math.floor(height)
          emit('chart-resize', { width: observedWidth.value, height: observedHeight.value })
        }
      }, props.debounceDelay)
    })
    resizeObserver.observe(containerRef.value)
  }

  surfaceEl = surfaceRef.value
  surfaceEl?.addEventListener('mousemove', onSurfaceMove)
  surfaceEl?.addEventListener('mouseleave', clearHover)
  surfaceEl?.addEventListener('click', onSurfaceClick)
  surfaceEl?.addEventListener('dblclick', resetZoom)
  setupZoom()

  emit('chart-ready', { width: effectiveWidth.value, height: effectiveHeight.value })
})

onUnmounted(() => {
  // 1. ResizeObserver 與防抖計時器
  resizeObserver?.disconnect()
  resizeObserver = null
  if (resizeDebounceTimer) {
    clearTimeout(resizeDebounceTimer)
    resizeDebounceTimer = null
  }
  // 2. d3.zoom（實例事件）
  if (surfaceEl) d3.select(surfaceEl).on('.zoom', null)
  zoomBehavior = null
  // 3. DOM 事件
  surfaceEl?.removeEventListener('mousemove', onSurfaceMove)
  surfaceEl?.removeEventListener('mouseleave', clearHover)
  surfaceEl?.removeEventListener('click', onSurfaceClick)
  surfaceEl?.removeEventListener('dblclick', resetZoom)
  surfaceEl = null
})

defineExpose({ resetZoom, containerRef })
</script>

<style scoped>
.status-scatter-map {
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* 三層疊在一起：底層 SVG（格線、軸）→ Canvas（資料點）→ 上層 SVG（標記、事件） */
.ssm-layer {
  position: absolute;
  left: 0;
  top: 0;
  display: block;
  overflow: visible;
}

.ssm-canvas {
  position: absolute;
  display: block;
  pointer-events: none;
}

.ssm-surface {
  fill: transparent;
  pointer-events: all;
}

.ssm-surface.is-zoomed {
  cursor: grab;
}

.ssm-surface.is-zoomed:active {
  cursor: grabbing;
}

:deep(.ssm-x-axis) text,
:deep(.ssm-y-axis) text {
  font-size: 12px;
  fill: rgb(var(--t-content-secondary));
}

:deep(.ssm-x-axis) path,
:deep(.ssm-y-axis) path,
:deep(.ssm-x-axis) line,
:deep(.ssm-y-axis) line {
  stroke: rgb(var(--t-stroke-medium));
}

.ssm-axis-label {
  font-size: 12px;
  fill: rgb(var(--t-content-secondary));
}

:deep(.ssm-grid) line {
  stroke-width: 1;
  shape-rendering: crispEdges;
}

:deep(.ssm-highlight),
:deep(.ssm-hover) {
  pointer-events: none;
}
</style>
