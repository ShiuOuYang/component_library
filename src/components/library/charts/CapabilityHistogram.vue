<template>
  <div ref="containerRef" class="capability-histogram" :style="containerStyle">
    <p v-if="title" class="ch-title text-sm font-semibold text-content-primary">{{ title }}</p>

    <div class="ch-body" :class="showStats && statsPosition === 'bottom' ? 'flex-col' : 'flex-row'">
      <svg
        class="ch-svg"
        :width="chartWidth"
        :height="chartHeight"
        role="img"
        tabindex="0"
        :aria-label="ariaSummary"
        @keydown="onKeydown"
        @blur="clearHover"
      >
        <g :transform="`translate(${margin.left}, ${margin.top})`">
          <!-- 格線與刻度 -->
          <g class="ch-grid" aria-hidden="true">
            <g v-for="t in yTicks" :key="`y${t.value}`">
              <line :x1="0" :x2="plotWidth" :y1="t.y" :y2="t.y" />
              <text class="ch-tick" :x="-8" :y="t.y" text-anchor="end" dominant-baseline="central">{{ t.label }}</text>
            </g>
            <text v-for="t in xTicks" :key="`x${t.value}`" class="ch-tick" :x="t.x" :y="plotHeight + 16" text-anchor="middle">{{ t.label }}</text>
            <line class="ch-baseline" :x1="0" :x2="plotWidth" :y1="plotHeight" :y2="plotHeight" />
          </g>

          <!-- 長條：規格外的組用紅色 -->
          <g
            v-for="(b, i) in barViews"
            :key="i"
            class="ch-bin"
            :class="{ 'is-hovered': hoverIndex === i, 'is-out': b.out }"
            @mouseenter="onBinEnter(i, $event)"
            @mousemove="onBinMove(i, $event)"
            @mouseleave="clearHover"
            @click="onBinClick(i)"
          >
            <!-- 整欄都是滑鼠目標（矮的長條也指得到） -->
            <rect class="ch-hit" :x="b.x" :y="0" :width="b.slotW" :height="plotHeight" />
            <path class="ch-bar" :d="b.path" :style="{ fill: b.color }" />
          </g>

          <!-- 常態曲線 -->
          <path v-if="showCurve && curvePath" class="ch-curve" :d="curvePath" aria-hidden="true" />
          <path v-if="showWithinCurve && withinCurvePath" class="ch-curve is-within" :d="withinCurvePath" aria-hidden="true" />

          <!-- 規格、目標、平均 -->
          <g v-for="m in markerViews" :key="m.key" class="ch-marker" :class="m.kind" aria-hidden="true">
            <line :x1="m.x" :x2="m.x" :y1="-4" :y2="plotHeight" />
            <text :x="m.x" :y="m.labelY" text-anchor="middle">{{ m.text }}</text>
          </g>
        </g>
      </svg>

      <!-- 統計：指標一定有數字與文字，不只靠顏色 -->
      <dl
        v-if="showStats"
        class="ch-stats"
        :class="statsPosition === 'bottom' ? 'is-bottom' : 'is-right'"
        :style="statsPosition === 'right' ? { width: `${statsWidth}px` } : undefined"
      >
        <div v-for="row in statRows" :key="row.key" class="ch-stat" :class="{ 'is-key': row.key === 'cpk' }">
          <dt>{{ row.label }}</dt>
          <dd>
            {{ row.value }}
            <span v-if="row.key === 'cpk' && cpkStatus" class="ch-status" :class="`is-${cpkStatus.level}`">
              <span class="ch-status-icon" aria-hidden="true">{{ cpkStatus.icon }}</span>{{ cpkStatus.label }}
            </span>
          </dd>
        </div>
      </dl>
    </div>

    <p v-if="!values.length" class="absolute inset-0 flex items-center justify-center text-sm text-content-tertiary">{{ emptyText }}</p>
    <p class="sr-only" aria-live="polite">{{ liveText }}</p>

    <slot name="tooltip" :tooltip-data="tooltipData" :tooltip-visible="tooltipVisible">
      <div
        v-if="tooltipVisible && tooltipData && enableTooltip"
        class="pointer-events-none absolute z-30 min-w-32 rounded-md border border-stroke-light bg-surface-primary px-2.5 py-1.5 text-xs shadow-lg"
        role="tooltip"
        :style="tooltipStyle"
      >
        <div class="flex items-baseline gap-1.5">
          <span class="text-sm font-semibold text-content-primary">{{ tooltipData.count }} 筆</span>
          <span class="text-content-secondary">{{ (tooltipData.share * 100).toFixed(1) }}%</span>
        </div>
        <div class="text-content-secondary">{{ fmt(tooltipData.x0) }} ～ {{ fmt(tooltipData.x1) }}</div>
        <div v-for="line in tooltipLines" :key="line" class="text-content-tertiary">{{ line }}</div>
      </div>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import * as d3 from 'd3'
import { chartPalette } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { estimateTextWidth } from './utils/chartText'
import { computeCapability, normalPdf, type CapabilityResult } from './utils/spc'
import { tooltipPlacement } from './utils/tooltipPlacement'

/**
 * CapabilityHistogram —— 直方圖 + 製程能力（Cp、Cpk、Pp、Ppk）
 *
 * - 量測值的分布，標出規格上下限（LSL／USL）、目標與平均；疊上常態曲線
 * - Cp、Cpk 用組內標準差（移動全距或子組全距），Pp、Ppk 用整體標準差
 * - Cpk 依門檻顯示「達標／尚可／不足」（圖示 + 文字）
 * - 完全落在規格外的組畫成紅色；規格外的 PPM（實際與常態預估）
 */

type Row = Record<string, unknown>

/** 一個組（長條）的事件 payload */
export interface HistogramBin {
  index: number
  /** 組的下界（含） */
  x0: number
  /** 組的上界（不含；最後一組含） */
  x1: number
  count: number
  /** 佔全部的比例（0～1） */
  share: number
  /** 整組都在規格外 */
  outOfSpec: boolean
  /** 這一組的數值 */
  values: number[]
}

export interface HistogramTooltip extends HistogramBin {
  position: { containerX: number; containerY: number }
}

interface CapabilityHistogramProps {
  // === 基礎配置 ===
  width?: number
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  margin?: { top: number; right: number; bottom: number; left: number }

  // === 數據配置 ===
  /** 量測值：數字陣列，或物件陣列（valueField） */
  data: Array<number | Row>

  // === 欄位映射 ===
  valueField?: string

  // === 規格配置 ===
  lsl?: number | null
  usl?: number | null
  target?: number | null

  // === 計算配置 ===
  /** 組內標準差的子組大小：1 用移動全距、2～10 用全距、更大用標準差（資料要依生產順序排列） */
  subgroupSize?: number
  /** 組數；未指定時依 Freedman–Diaconis 自動決定（5～60 組） */
  binCount?: number | null
  /** Cpk 的門檻：[尚可, 達標]，預設 [1.0, 1.33] */
  cpkThresholds?: [number, number]

  // === 視覺配置 ===
  title?: string
  valueFormat?: ((value: number) => string) | null
  /** 疊上整體常態曲線 */
  showCurve?: boolean
  /** 疊上組內常態曲線（虛線） */
  showWithinCurve?: boolean
  showStats?: boolean
  statsPosition?: 'right' | 'bottom'
  statsWidth?: number
  emptyText?: string

  // === 互動配置 ===
  enableTooltip?: boolean

  // === 企業級擴展點 ===
  customRenderers?: {
    /** 自訂長條顏色（回傳 null 用預設） */
    barColor?: (bin: HistogramBin) => string | null | undefined
    /** 自訂提示框內容（每行一個字串，筆數與範圍之下） */
    tooltip?: (bin: HistogramBin) => string[]
  }
}

const props = withDefaults(defineProps<CapabilityHistogramProps>(), {
  width: 760,
  height: 340,
  autoResize: false,
  debounceDelay: 150,
  margin: () => ({ top: 30, right: 16, bottom: 28, left: 44 }),
  valueField: 'value',
  lsl: null,
  usl: null,
  target: null,
  subgroupSize: 1,
  binCount: null,
  cpkThresholds: () => [1.0, 1.33],
  title: '',
  valueFormat: null,
  showCurve: true,
  showWithinCurve: false,
  showStats: true,
  statsPosition: 'right',
  statsWidth: 210,
  emptyText: '沒有資料',
  enableTooltip: true,
  customRenderers: () => ({}),
})

const emit = defineEmits<{
  'chart-ready': [payload: { width: number; height: number }]
  'chart-resize': [payload: { width: number; height: number }]
  'bin-hover': [payload: HistogramBin]
  'bin-click': [payload: HistogramBin]
  'tooltip-show': [payload: HistogramTooltip]
  'tooltip-hide': []
  'capability-change': [payload: CapabilityResult]
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const { effectiveWidth, effectiveHeight } = useAutoResize(containerRef, props, (size) => emit('chart-resize', size))

const containerStyle = computed(() =>
  props.autoResize ? { width: '100%', height: '100%' } : { width: `${props.width}px`, height: `${props.height}px` }
)

// === 資料與指標 ===

const values = computed<number[]>(() =>
  (props.data ?? [])
    .map((d) => (typeof d === 'number' ? d : Number((toRaw(d) as Row)[props.valueField])))
    .filter((v) => Number.isFinite(v))
)

const spec = (v: number | null | undefined) => (v !== null && v !== undefined && Number.isFinite(v) ? v : null)

const capability = computed<CapabilityResult>(() =>
  computeCapability({ values: values.value, lsl: spec(props.lsl), usl: spec(props.usl), subgroupSize: props.subgroupSize })
)

watch(capability, (c) => emit('capability-change', c))

const decimal = d3.format(',.4~f')
const fmt = (v: number) => (props.valueFormat ?? decimal)(v)
const fmtIndex = (v: number | null) => (v === null ? '—' : v.toFixed(2))
const fmtPpm = (v: number) => (v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(1))

/** Cpk 的判定：圖示 + 文字（狀態色不單獨表達意思） */
const cpkStatus = computed(() => {
  const k = capability.value.cpk
  if (k === null) return null
  const [ok, good] = props.cpkThresholds
  if (k >= good) return { level: 'good', label: '達標', icon: '✓' }
  if (k >= ok) return { level: 'warning', label: '尚可', icon: '!' }
  return { level: 'critical', label: '不足', icon: '✕' }
})

const statRows = computed(() => {
  const c = capability.value
  const n = c.n
  return [
    { key: 'n', label: '樣本數', value: n.toLocaleString() },
    { key: 'mean', label: '平均', value: n ? fmt(c.mean) : '—' },
    { key: 'sOverall', label: '標準差（整體）', value: Number.isFinite(c.sigmaOverall) ? fmt(c.sigmaOverall) : '—' },
    { key: 'sWithin', label: '標準差（組內）', value: Number.isFinite(c.sigmaWithin) ? fmt(c.sigmaWithin) : '—' },
    { key: 'cp', label: 'Cp', value: fmtIndex(c.cp) },
    { key: 'cpk', label: 'Cpk', value: fmtIndex(c.cpk) },
    { key: 'pp', label: 'Pp', value: fmtIndex(c.pp) },
    { key: 'ppk', label: 'Ppk', value: fmtIndex(c.ppk) },
    { key: 'ppmObs', label: '規格外 PPM（實際）', value: fmtPpm(c.ppmObserved.total) },
    { key: 'ppmExp', label: '規格外 PPM（預估）', value: fmtPpm(c.ppmExpected.total) },
  ]
})

// === 版面 ===

const TITLE_H = 24

const chartWidth = computed(() => {
  const w = effectiveWidth.value
  return Math.max(0, props.showStats && props.statsPosition === 'right' ? w - props.statsWidth - 16 : w)
})
const chartHeight = computed(() => {
  const h = effectiveHeight.value - (props.title ? TITLE_H : 0)
  return Math.max(0, props.showStats && props.statsPosition === 'bottom' ? h - 96 : h)
})
const plotWidth = computed(() => Math.max(0, chartWidth.value - props.margin.left - props.margin.right))
const plotHeight = computed(() => Math.max(0, chartHeight.value - props.margin.top - props.margin.bottom))

// === 分組 ===

/** 自動組數：Freedman–Diaconis（四分位距為 0 時用 Sturges），夾在 5～60 */
function autoBinCount(vs: number[]): number {
  const n = vs.length
  if (n < 2) return 5
  const sorted = [...vs].sort((a, b) => a - b)
  const iqr = (d3.quantileSorted(sorted, 0.75) ?? 0) - (d3.quantileSorted(sorted, 0.25) ?? 0)
  const range = sorted[n - 1] - sorted[0]
  const fd = iqr > 0 && range > 0 ? Math.ceil(range / (2 * iqr * Math.cbrt(1 / n))) : Math.ceil(Math.log2(n) + 1)
  return Math.min(60, Math.max(5, fd))
}

const bins = computed<HistogramBin[]>(() => {
  const vs = values.value
  if (!vs.length) return []
  const lo = Math.min(...vs)
  const hi = Math.max(...vs)
  const count = props.binCount && props.binCount > 0 ? Math.floor(props.binCount) : autoBinCount(vs)
  // 🔧 所有值都一樣時給一點寬度，否則只有一個寬度 0 的組
  const [a, b] = lo === hi ? [lo - 0.5, hi + 0.5] : [lo, hi]
  const width = (b - a) / count
  const thresholds = d3.range(1, count).map((i) => a + i * width)
  const groups = d3.bin().domain([a, b]).thresholds(thresholds)(vs)
  const l = spec(props.lsl)
  const u = spec(props.usl)
  return groups.map((g, index) => {
    const x0 = g.x0 ?? a
    const x1 = g.x1 ?? b
    return {
      index,
      x0,
      x1,
      count: g.length,
      share: g.length / vs.length,
      outOfSpec: (l !== null && x1 <= l) || (u !== null && x0 >= u),
      values: [...g],
    }
  })
})

/** X 範圍：資料、規格、目標與平均 ±3σ 都要放得下 */
const xDomain = computed<[number, number]>(() => {
  const c = capability.value
  const pts = [...values.value]
  for (const v of [spec(props.lsl), spec(props.usl), spec(props.target)]) if (v !== null) pts.push(v)
  if (Number.isFinite(c.mean) && Number.isFinite(c.sigmaOverall)) pts.push(c.mean - 3 * c.sigmaOverall, c.mean + 3 * c.sigmaOverall)
  if (!pts.length) return [0, 1]
  let lo = Math.min(...pts)
  let hi = Math.max(...pts)
  if (lo === hi) {
    lo -= 1
    hi += 1
  }
  const pad = (hi - lo) * 0.03
  return [lo - pad, hi + pad]
})

const xScale = computed(() => d3.scaleLinear().domain(xDomain.value).range([0, plotWidth.value]))

/** 曲線（期望筆數）與長條同一個尺度：n × 組寬 × 機率密度 */
function curve(sigma: number): string {
  const c = capability.value
  const bw = bins.value.length ? bins.value[0].x1 - bins.value[0].x0 : 0
  if (!c.n || !(sigma > 0) || !(bw > 0) || plotWidth.value <= 0) return ''
  const [d0, d1] = xDomain.value
  const pts = d3.range(0, 121).map((i) => d0 + ((d1 - d0) * i) / 120)
  const line = d3
    .line<number>()
    .x((x) => xScale.value(x))
    .y((x) => yScale.value(c.n * bw * normalPdf(x, c.mean, sigma)))
  return line(pts) ?? ''
}

const yScale = computed(() => {
  const c = capability.value
  const bw = bins.value.length ? bins.value[0].x1 - bins.value[0].x0 : 0
  let max = d3.max(bins.value, (b) => b.count) ?? 1
  // 曲線的峰值也要放得下
  for (const s of [c.sigmaOverall, props.showWithinCurve ? c.sigmaWithin : NaN]) {
    if (s > 0 && bw > 0) max = Math.max(max, c.n * bw * normalPdf(c.mean, c.mean, s))
  }
  return d3.scaleLinear().domain([0, Math.max(1, max) * 1.05]).range([plotHeight.value, 0]).nice()
})

const curvePath = computed(() => curve(capability.value.sigmaOverall))
const withinCurvePath = computed(() => curve(capability.value.sigmaWithin))

const yTicks = computed(() =>
  yScale.value
    .ticks(Math.max(2, Math.floor(plotHeight.value / 40)))
    .filter((v) => Number.isInteger(v))
    .map((v) => ({ value: v, y: yScale.value(v), label: v.toLocaleString() }))
)

const xTicks = computed(() =>
  xScale.value.ticks(Math.max(2, Math.floor(plotWidth.value / 80))).map((v) => ({ value: v, x: xScale.value(v), label: fmt(v) }))
)

/** 長條：上緣 2px 圓角、基線方角；相鄰長條之間留縫 */
const barViews = computed(() => {
  const xs = xScale.value
  const ys = yScale.value
  return bins.value.map((b) => {
    const x0 = xs(b.x0)
    const slotW = Math.max(0, xs(b.x1) - x0)
    const gap = slotW >= 6 ? 2 : slotW >= 3 ? 1 : 0
    const w = Math.max(0, slotW - gap)
    const x = x0 + gap / 2
    const top = ys(b.count)
    const h = plotHeight.value - top
    const r = Math.min(2, w / 2, h)
    const path =
      h > 0 && w > 0
        ? `M${x},${plotHeight.value} V${top + r} A${r},${r} 0 0 1 ${x + r},${top} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${top + r} V${plotHeight.value} Z`
        : ''
    const custom = props.customRenderers.barColor?.(b)
    return { x: x0, slotW, path, out: b.outOfSpec, color: custom || (b.outOfSpec ? chartPalette.critical : chartPalette.primary) }
  })
})

/** 規格線、目標、平均；文字太近時錯開成兩排 */
const markerViews = computed(() => {
  const c = capability.value
  const items = [
    { key: 'lsl', kind: 'is-spec', value: spec(props.lsl), text: 'LSL' },
    { key: 'usl', kind: 'is-spec', value: spec(props.usl), text: 'USL' },
    { key: 'target', kind: 'is-target', value: spec(props.target), text: '目標' },
    { key: 'mean', kind: 'is-mean', value: c.n ? c.mean : null, text: '平均' },
  ]
    .filter((m): m is { key: string; kind: string; value: number; text: string } => m.value !== null && Number.isFinite(m.value))
    .map((m) => {
      const text = `${m.text} ${fmt(m.value)}`
      return { ...m, text, x: xScale.value(m.value), w: estimateTextWidth(text, 11) }
    })
    .sort((a, b) => a.x - b.x)
  let prevEnd = -Infinity
  let prevRow = 1
  return items.map((m) => {
    const row = m.x - m.w / 2 < prevEnd + 4 && prevRow === 0 ? 1 : 0
    prevEnd = m.x + m.w / 2
    prevRow = row
    return { ...m, labelY: row === 0 ? -10 : -22 }
  })
})

const ariaSummary = computed(() => {
  const c = capability.value
  const name = props.title || '製程能力直方圖'
  if (!c.n) return `${name}：沒有資料`
  const status = cpkStatus.value ? `（${cpkStatus.value.label}）` : ''
  return `${name}：${c.n} 筆，平均 ${fmt(c.mean)}，Cpk ${fmtIndex(c.cpk)}${status}，Ppk ${fmtIndex(c.ppk)}。可用方向鍵逐組查看`
})

// === 互動 ===

const hoverIndex = ref(-1)
const tooltipData = ref<HistogramTooltip | null>(null)
const tooltipVisible = ref(false)
const liveText = ref('')

const tooltipLines = computed(() => {
  const t = tooltipData.value
  if (!t) return []
  if (props.customRenderers.tooltip) return props.customRenderers.tooltip(t)
  return t.outOfSpec ? ['超出規格'] : []
})

const tooltipStyle = computed(() => {
  const t = tooltipData.value
  if (!t) return {}
  return tooltipPlacement(t.position.containerX, t.position.containerY, effectiveWidth.value, effectiveHeight.value, 180, 80)
})

function show(i: number, x: number, y: number): void {
  const b = bins.value[i]
  if (!b) return
  const changed = i !== hoverIndex.value
  hoverIndex.value = i
  tooltipData.value = { ...b, position: { containerX: x, containerY: y } }
  tooltipVisible.value = true
  if (changed) {
    emit('bin-hover', b)
    emit('tooltip-show', tooltipData.value)
    liveText.value = `${fmt(b.x0)} 到 ${fmt(b.x1)}：${b.count} 筆${b.outOfSpec ? '，超出規格' : ''}`
  }
}

function pointer(event: MouseEvent): { x: number; y: number } {
  const rect = containerRef.value?.getBoundingClientRect()
  return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
}

function onBinEnter(i: number, event: MouseEvent): void {
  const p = pointer(event)
  show(i, p.x, p.y)
}

function onBinMove(i: number, event: MouseEvent): void {
  const p = pointer(event)
  show(i, p.x, p.y)
}

function onBinClick(i: number): void {
  const b = bins.value[i]
  if (b) emit('bin-click', b)
}

function onKeydown(event: KeyboardEvent): void {
  const n = bins.value.length
  if (!n) return
  let i = hoverIndex.value
  if (event.key === 'ArrowRight') i = i < 0 ? 0 : Math.min(n - 1, i + 1)
  else if (event.key === 'ArrowLeft') i = i < 0 ? n - 1 : Math.max(0, i - 1)
  else if (event.key === 'Home') i = 0
  else if (event.key === 'End') i = n - 1
  else if (event.key === 'Enter' && i >= 0) {
    onBinClick(i)
    return
  } else if (event.key === 'Escape') {
    clearHover()
    return
  } else return
  event.preventDefault()
  const v = barViews.value[i]
  show(i, props.margin.left + v.x + v.slotW / 2, (props.title ? TITLE_H : 0) + props.margin.top + yScale.value(bins.value[i].count))
}

function clearHover(): void {
  if (hoverIndex.value < 0) return
  hoverIndex.value = -1
  tooltipVisible.value = false
  emit('tooltip-hide')
}

/** 目前的製程能力指標 */
function getCapability(): CapabilityResult {
  return capability.value
}

onMounted(() => {
  emit('capability-change', capability.value)
  emit('chart-ready', { width: effectiveWidth.value, height: effectiveHeight.value })
})

defineExpose({ getCapability, containerRef })
</script>

<style scoped>
.capability-histogram {
  position: relative;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.ch-title {
  height: 24px;
  line-height: 24px;
  padding: 0 8px;
}

.ch-body {
  display: flex;
  min-height: 0;
  flex: 1 1 0%;
  gap: 16px;
}

.ch-svg {
  display: block;
  flex: none;
  overflow: visible;
  outline: none;
}

.ch-svg:focus-visible {
  outline: 2px solid rgb(var(--t-stroke-focus));
  outline-offset: 2px;
  border-radius: 4px;
}

.ch-grid line {
  stroke: rgb(var(--t-stroke-light));
  shape-rendering: crispEdges;
}

.ch-grid .ch-baseline {
  stroke: rgb(var(--t-stroke-medium));
}

.ch-tick {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  fill: rgb(var(--t-content-tertiary));
}

.ch-hit {
  fill: transparent;
}

.ch-bin {
  cursor: pointer;
}

.ch-bin.is-hovered .ch-hit {
  fill: rgb(var(--t-surface-secondary));
}

.ch-curve {
  fill: none;
  stroke: rgb(var(--t-content-primary));
  stroke-width: 2;
  stroke-linejoin: round;
  pointer-events: none;
}

.ch-curve.is-within {
  stroke: rgb(var(--t-content-secondary));
  stroke-dasharray: 5 4;
}

.ch-marker line {
  stroke-width: 1.5;
}

.ch-marker text {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  fill: rgb(var(--t-content-secondary));
}

.ch-marker.is-spec line {
  stroke: rgb(var(--t-danger-solid));
  stroke-width: 2;
}

.ch-marker.is-spec text {
  fill: rgb(var(--t-danger));
  font-weight: 600;
}

.ch-marker.is-target line {
  stroke: rgb(var(--t-content-secondary));
  stroke-dasharray: 4 3;
}

.ch-marker.is-mean line {
  stroke: rgb(var(--t-content-primary));
  stroke-width: 1;
}

.ch-stats {
  margin: 0;
  display: grid;
  align-content: start;
  gap: 2px;
  font-size: 12px;
}

.ch-stats.is-right {
  flex: none;
}

.ch-stats.is-bottom {
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  column-gap: 16px;
}

.ch-stat {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 0;
  border-bottom: 1px solid rgb(var(--t-stroke-light));
}

.ch-stat dt {
  color: rgb(var(--t-content-secondary));
}

.ch-stat dd {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--t-content-primary));
}

.ch-stat.is-key dd {
  font-size: 14px;
  font-weight: 600;
}

.ch-status {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--t-content-primary));
}

.ch-status-icon {
  display: inline-flex;
  height: 14px;
  width: 14px;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  font-size: 9px;
  color: rgb(var(--t-content-on-solid));
}

.ch-status.is-good .ch-status-icon {
  background: rgb(var(--t-success-solid));
}

.ch-status.is-warning .ch-status-icon {
  background: rgb(var(--t-warning-solid));
}

.ch-status.is-critical .ch-status-icon {
  background: rgb(var(--t-danger-solid));
}
</style>
