<template>
  <div ref="containerRef" class="sparkline-chart" :style="containerStyle">
    <svg
      ref="svgRef"
      :width="effectiveWidth"
      :height="effectiveHeight"
      role="img"
      :aria-label="ariaSummary"
      @mousemove="onMove"
      @mouseleave="clearHover"
    >
      <!-- 參考線（例如目標值）：髮絲線 -->
      <line
        v-if="referenceY !== null"
        class="spark-reference"
        :x1="margin.left" :x2="effectiveWidth - margin.right" :y1="referenceY" :y2="referenceY"
      />

      <template v-if="type === 'bar'">
        <rect
          v-for="b in bars"
          :key="b.index"
          class="spark-bar"
          :x="b.x" :y="b.y" :width="b.w" :height="b.h"
          :style="{ fill: b.accent ? accentFill : lineColor }"
          :class="{ 'is-hovered': hoverIndex === b.index }"
        />
      </template>
      <template v-else>
        <path v-if="type === 'area' && areaPath" class="spark-area" :d="areaPath" :style="{ fill: lineColor }" />
        <path v-if="linePath" class="spark-line" :d="linePath" :style="{ stroke: lineColor }" />
        <!-- 最高、最低點 -->
        <circle
          v-for="p in minMaxPoints"
          :key="`mm-${p.index}`"
          class="spark-dot is-minmax"
          :cx="p.x" :cy="p.y" r="2.5"
          :style="{ fill: lineColor }"
        />
        <!-- 最新一點用強調色：這一期才是重點 -->
        <circle
          v-if="showLastPoint && lastPoint"
          class="spark-dot is-last"
          :cx="lastPoint.x" :cy="lastPoint.y" r="4"
          :style="{ fill: accentFill }"
        />
      </template>

      <!-- 滑鼠：垂直髮絲線對到最近的一點 -->
      <g v-if="hoverPoint" class="spark-hover" aria-hidden="true">
        <line :x1="hoverPoint.x" :x2="hoverPoint.x" :y1="margin.top" :y2="effectiveHeight - margin.bottom" />
        <circle v-if="type !== 'bar'" :cx="hoverPoint.x" :cy="hoverPoint.y" r="4" :style="{ fill: accentFill }" />
      </g>
    </svg>

    <slot name="tooltip" :tooltip-data="tooltipData" :tooltip-visible="tooltipVisible">
      <div
        v-if="tooltipVisible && tooltipData && enableTooltip"
        class="spark-tooltip pointer-events-none absolute z-30 whitespace-nowrap rounded-md border border-stroke-light bg-surface-primary px-2 py-1 text-xs shadow-lg"
        role="tooltip"
        :style="tooltipStyle"
      >
        <span class="font-semibold text-content-primary">{{ tooltipData.valueText }}</span>
        <span v-if="tooltipData.label" class="ml-1.5 text-content-secondary">{{ tooltipData.label }}</span>
      </div>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRaw } from 'vue'
import * as d3 from 'd3'
import { chartPalette } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'

/**
 * SparklineChart —— 迷你趨勢線（放在 KPI 數字旁邊）
 *
 * - 線、面積或長條三種；沒有軸，只看走勢
 * - 走勢用淡化色，最新一點用強調色（這一期才是重點）
 * - 可標出最高／最低點、目標參考線
 * - 滑鼠移動時，垂直線對到最近的一點並顯示數值
 * - 資料可以是數字陣列，或物件陣列（valueField / labelField）；null 會斷開線段
 */

/** 一個點的事件 payload */
export interface SparklinePoint {
  index: number
  value: number | null
  /** labelField 的值（例如日期） */
  label: string
  datum: unknown
}

export interface SparklineTooltip extends SparklinePoint {
  valueText: string
}

interface SparklineChartProps {
  // === 基礎配置 ===
  width?: number
  height?: number
  /** 跟著容器大小調整（容器需有寬高） */
  autoResize?: boolean
  debounceDelay?: number
  /** 預留給端點圓點的空間 */
  margin?: { top: number; right: number; bottom: number; left: number }

  // === 數據配置 ===
  /** 數字陣列，或物件陣列（用 valueField / labelField 取值） */
  data: Array<number | null | Record<string, unknown>>

  // === 欄位映射（支援任意資料結構）===
  valueField?: string
  /** 提示框顯示的標籤（例如日期） */
  labelField?: string

  // === 圖表類型 ===
  type?: 'line' | 'area' | 'bar'

  // === 軸配置 ===
  /** 數值範圍；未指定時依資料（長條圖一定含 0） */
  yDomain?: [number, number] | null

  // === 視覺配置 ===
  /** 用在讀螢幕的摘要（畫面上不顯示） */
  title?: string
  /** 走勢的顏色；未指定時用淡化色 */
  color?: string | null
  /** 最新一點（或最後一根長條）的顏色；未指定時用類別色第 1 號 */
  accentColor?: string | null
  showLastPoint?: boolean
  /** 標出最高與最低點 */
  showMinMax?: boolean
  /** 參考線（例如目標值） */
  referenceValue?: number | null
  valueFormat?: ((value: number) => string) | null

  // === 互動配置 ===
  enableTooltip?: boolean
}

const props = withDefaults(defineProps<SparklineChartProps>(), {
  width: 120,
  height: 32,
  autoResize: false,
  debounceDelay: 150,
  margin: () => ({ top: 6, right: 6, bottom: 6, left: 2 }),
  valueField: 'value',
  labelField: 'label',
  type: 'line',
  yDomain: null,
  title: '',
  color: null,
  accentColor: null,
  showLastPoint: true,
  showMinMax: false,
  referenceValue: null,
  valueFormat: null,
  enableTooltip: true,
})

const emit = defineEmits<{
  'chart-ready': [payload: { width: number; height: number }]
  'chart-resize': [payload: { width: number; height: number }]
  'point-hover': [payload: SparklinePoint]
  'tooltip-show': [payload: SparklineTooltip]
  'tooltip-hide': []
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const { effectiveWidth, effectiveHeight } = useAutoResize(containerRef, props, (size) => emit('chart-resize', size))

const containerStyle = computed(() =>
  props.autoResize ? { width: '100%', height: '100%' } : { width: `${props.width}px`, height: `${props.height}px` }
)

const lineColor = computed(() => props.color || chartPalette.deemphasis)
const accentFill = computed(() => props.accentColor || chartPalette.primary)

// === 資料 ===

const points = computed<SparklinePoint[]>(() =>
  (props.data ?? []).map((d, index) => {
    const isObject = d !== null && typeof d === 'object'
    const raw = isObject ? (d as Record<string, unknown>)[props.valueField] : d
    const n = raw === null || raw === undefined || raw === '' ? NaN : Number(raw)
    const label = isObject ? String((d as Record<string, unknown>)[props.labelField] ?? '') : ''
    return { index, value: Number.isFinite(n) ? n : null, label, datum: isObject ? toRaw(d) : d }
  })
)

const values = computed(() => points.value.map((p) => p.value).filter((v): v is number => v !== null))

const domain = computed<[number, number]>(() => {
  if (props.yDomain) return props.yDomain
  const vs = values.value
  if (!vs.length) return [0, 1]
  let lo = Math.min(...vs)
  let hi = Math.max(...vs)
  if (props.referenceValue !== null && Number.isFinite(props.referenceValue)) {
    lo = Math.min(lo, props.referenceValue)
    hi = Math.max(hi, props.referenceValue)
  }
  // 長條要從 0 長出來，否則長短會騙人
  if (props.type === 'bar') {
    lo = Math.min(0, lo)
    hi = Math.max(0, hi)
  }
  // 🔧 全部同一個值：上下各留一點，線才會在中間而不是貼邊
  if (lo === hi) return lo === 0 ? [-1, 1] : [lo - Math.abs(lo) * 0.1, hi + Math.abs(hi) * 0.1]
  return [lo, hi]
})

const xScale = computed(() => {
  const n = points.value.length
  const m = props.margin
  if (props.type === 'bar') {
    return d3.scaleBand<number>().domain(d3.range(n)).range([m.left, effectiveWidth.value - m.right]).paddingInner(0.25)
  }
  return d3.scalePoint<number>().domain(d3.range(n)).range([m.left, effectiveWidth.value - m.right])
})

const yScale = computed(() =>
  d3.scaleLinear().domain(domain.value).range([effectiveHeight.value - props.margin.bottom, props.margin.top])
)

function xOf(i: number): number {
  const xs = xScale.value
  const x = xs(i) ?? 0
  return props.type === 'bar' ? x + (xs as d3.ScaleBand<number>).bandwidth() / 2 : x
}

const linePath = computed(() => {
  if (values.value.length < 1) return ''
  const line = d3
    .line<SparklinePoint>()
    .defined((p) => p.value !== null)
    .x((p) => xOf(p.index))
    .y((p) => yScale.value(p.value as number))
  return line(points.value) ?? ''
})

const areaPath = computed(() => {
  if (values.value.length < 2) return ''
  const base = yScale.value(Math.max(domain.value[0], Math.min(0, domain.value[1])))
  const area = d3
    .area<SparklinePoint>()
    .defined((p) => p.value !== null)
    .x((p) => xOf(p.index))
    .y0(base)
    .y1((p) => yScale.value(p.value as number))
  return area(points.value) ?? ''
})

const lastIndex = computed(() => {
  for (let i = points.value.length - 1; i >= 0; i--) if (points.value[i].value !== null) return i
  return -1
})

const lastPoint = computed(() => {
  const i = lastIndex.value
  return i < 0 ? null : { x: xOf(i), y: yScale.value(points.value[i].value as number) }
})

const minMaxPoints = computed(() => {
  if (!props.showMinMax || values.value.length < 2) return []
  const vs = points.value.filter((p) => p.value !== null)
  const min = vs.reduce((a, b) => ((b.value as number) < (a.value as number) ? b : a))
  const max = vs.reduce((a, b) => ((b.value as number) > (a.value as number) ? b : a))
  return [min, max]
    .filter((p, i, arr) => arr.indexOf(p) === i && p.index !== lastIndex.value)
    .map((p) => ({ index: p.index, x: xOf(p.index), y: yScale.value(p.value as number) }))
})

const bars = computed(() => {
  if (props.type !== 'bar') return []
  const xs = xScale.value as d3.ScaleBand<number>
  const ys = yScale.value
  const zero = ys(Math.max(domain.value[0], Math.min(0, domain.value[1])))
  return points.value
    .filter((p) => p.value !== null)
    .map((p) => {
      const y = ys(p.value as number)
      return {
        index: p.index,
        x: xs(p.index) ?? 0,
        w: Math.max(1, xs.bandwidth()),
        y: Math.min(y, zero),
        h: Math.max(1, Math.abs(zero - y)),
        accent: p.index === lastIndex.value && props.showLastPoint,
      }
    })
})

const referenceY = computed(() =>
  props.referenceValue !== null && Number.isFinite(props.referenceValue) ? yScale.value(props.referenceValue) : null
)

const defaultFormat = d3.format(',~f')
const fmt = (v: number) => (props.valueFormat ?? defaultFormat)(v)

const ariaSummary = computed(() => {
  const name = props.title || '趨勢'
  const vs = values.value
  if (!vs.length) return `${name}：沒有資料`
  const first = vs[0]
  const last = vs[vs.length - 1]
  return `${name}：${vs.length} 筆，從 ${fmt(first)} 到 ${fmt(last)}，最高 ${fmt(Math.max(...vs))}，最低 ${fmt(Math.min(...vs))}`
})

// === 滑鼠 ===

const hoverIndex = ref(-1)
const tooltipData = ref<SparklineTooltip | null>(null)
const tooltipVisible = ref(false)

const hoverPoint = computed(() => {
  const p = points.value[hoverIndex.value]
  if (!p || p.value === null) return null
  return { x: xOf(p.index), y: yScale.value(p.value) }
})

const tooltipStyle = computed(() => {
  const h = hoverPoint.value
  if (!h) return {}
  // 迷你圖很矮：提示框放在上方，靠右緣時往左翻
  const flip = h.x > effectiveWidth.value - 60
  return {
    bottom: `${effectiveHeight.value + 4}px`,
    left: flip ? undefined : `${Math.max(0, h.x - 12)}px`,
    right: flip ? `${Math.max(0, effectiveWidth.value - h.x - 12)}px` : undefined,
  }
})

/** 游標最近的一點（略過沒有值的點） */
function nearestIndex(x: number): number {
  let best = -1
  let bestD = Infinity
  for (const p of points.value) {
    if (p.value === null) continue
    const d = Math.abs(xOf(p.index) - x)
    if (d < bestD) {
      bestD = d
      best = p.index
    }
  }
  return best
}

function onMove(event: MouseEvent): void {
  if (!props.enableTooltip || !svgRef.value) return
  const [x] = d3.pointer(event, svgRef.value)
  const i = nearestIndex(x)
  if (i < 0 || i === hoverIndex.value) return
  hoverIndex.value = i
  const p = points.value[i]
  tooltipData.value = { ...p, valueText: fmt(p.value as number) }
  tooltipVisible.value = true
  emit('point-hover', p)
  emit('tooltip-show', tooltipData.value)
}

function clearHover(): void {
  if (hoverIndex.value < 0) return
  hoverIndex.value = -1
  tooltipVisible.value = false
  emit('tooltip-hide')
}

onMounted(() => {
  emit('chart-ready', { width: effectiveWidth.value, height: effectiveHeight.value })
})

defineExpose({ containerRef })
</script>

<style scoped>
.sparkline-chart {
  position: relative;
  display: inline-block;
  vertical-align: middle;
}

.sparkline-chart svg {
  display: block;
  overflow: visible;
}

.spark-line {
  fill: none;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

/* 面積是同色的淡淡一層，不是飽和色塊 */
.spark-area {
  opacity: 0.1;
}

/* 圓點外圈：背景色的 2px 環，壓在線上也看得清楚 */
.spark-dot {
  stroke: rgb(var(--t-surface-primary));
  stroke-width: 2;
}

.spark-bar.is-hovered {
  opacity: 0.8;
}

.spark-reference {
  stroke: rgb(var(--t-stroke-medium));
  stroke-width: 1;
  stroke-dasharray: 3 2;
  shape-rendering: crispEdges;
}

.spark-hover line {
  stroke: rgb(var(--t-stroke-medium));
  stroke-width: 1;
  shape-rendering: crispEdges;
}

.spark-hover circle {
  stroke: rgb(var(--t-surface-primary));
  stroke-width: 2;
}
</style>
