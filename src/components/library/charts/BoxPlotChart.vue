<template>
  <div ref="containerRef" class="box-plot-chart" :style="containerStyle">
    <p v-if="title" class="bpc-title text-sm font-semibold text-content-primary">{{ title }}</p>

    <svg
      class="bpc-svg"
      :width="effectiveWidth"
      :height="svgHeight"
      role="img"
      tabindex="0"
      :aria-label="ariaSummary"
      @keydown="onKeydown"
      @blur="clearHover"
    >
      <g :transform="`translate(${plotLeft}, ${margin.top})`">
        <!-- 數值軸與格線 -->
        <g class="bpc-axis" aria-hidden="true">
          <g v-for="t in yTicks" :key="t.value">
            <line class="bpc-grid" :x1="0" :x2="plotWidth" :y1="t.y" :y2="t.y" />
            <text class="bpc-tick" :x="-8" :y="t.y" text-anchor="end" dominant-baseline="central">{{ t.label }}</text>
          </g>
          <text v-if="yLabel" class="bpc-ylabel" :transform="`translate(${-plotLeft + 12}, ${plotHeight / 2}) rotate(-90)`" text-anchor="middle">{{ yLabel }}</text>
          <line class="bpc-baseline" :x1="0" :x2="plotWidth" :y1="plotHeight" :y2="plotHeight" />
        </g>

        <!-- 參考線（規格上下限、目標）：畫在箱子底下 -->
        <g v-for="(r, i) in referenceViews" :key="`ref-${i}`" class="bpc-reference" aria-hidden="true">
          <line :x1="0" :x2="plotWidth" :y1="r.y" :y2="r.y" :style="{ stroke: r.color }" />
          <text :x="plotWidth" :y="r.y - 4" text-anchor="end">{{ r.label }}</text>
        </g>

        <g
          v-for="g in groupViews"
          :key="g.key"
          class="bpc-group"
          :class="{ 'is-hovered': hoverIndex === g.index && hoverPoint === null, 'is-dimmed': g.dimmed }"
          :data-key="g.key"
          @mouseenter="onGroupEnter(g.index, $event)"
          @mousemove="onGroupMove(g.index, $event)"
          @mouseleave="clearHover"
          @click="emit('group-click', eventOf(g.index))"
        >
          <!-- 整欄都是滑鼠目標 -->
          <rect class="bpc-hit" :x="g.x0" :y="0" :width="g.bandW" :height="plotHeight" />
          <text class="bpc-label" :x="g.cx" :y="plotHeight + 16" text-anchor="middle">
            <title>{{ g.label }}</title>{{ g.labelText }}
          </text>
          <text v-if="showCount" class="bpc-count" :x="g.cx" :y="plotHeight + 31" text-anchor="middle">n = {{ g.stats?.n ?? 0 }}</text>

          <template v-if="g.stats">
            <!-- 資料點：離群值或全部；畫在最底下，不蓋住箱子 -->
            <circle
              v-for="p in g.points"
              :key="p.i"
              class="bpc-point"
              :class="{ 'is-outlier': p.outlier, 'is-hovered': hoverIndex === g.index && hoverPoint === p.i }"
              :cx="p.x"
              :cy="p.y"
              :r="p.outlier ? 3.5 : 2.5"
              :style="{ stroke: g.color, fill: p.outlier ? 'none' : g.color }"
              @mouseenter.stop="onPointEnter(g.index, p.i, $event)"
              @mouseleave="hoverPoint = null"
              @click.stop="emit('point-click', pointEventOf(g.index, p.i))"
            />
            <!-- 小提琴（密度） -->
            <path v-if="g.violinPath" class="bpc-violin" :d="g.violinPath" :style="{ fill: g.color, stroke: g.color }" />
            <!-- 鬚 -->
            <g v-if="g.box" class="bpc-whisker" :style="{ stroke: g.color }">
              <line :x1="g.cx" :x2="g.cx" :y1="g.box.whiskerHigh" :y2="g.box.q3" />
              <line :x1="g.cx" :x2="g.cx" :y1="g.box.q1" :y2="g.box.whiskerLow" />
              <line :x1="g.cx - g.capW / 2" :x2="g.cx + g.capW / 2" :y1="g.box.whiskerHigh" :y2="g.box.whiskerHigh" />
              <line :x1="g.cx - g.capW / 2" :x2="g.cx + g.capW / 2" :y1="g.box.whiskerLow" :y2="g.box.whiskerLow" />
            </g>
            <!-- 箱子：Q1～Q3，中位數用粗線 -->
            <rect
              v-if="g.box"
              class="bpc-box"
              :x="g.cx - g.boxW / 2"
              :y="g.box.q3"
              :width="g.boxW"
              :height="Math.max(1, g.box.q1 - g.box.q3)"
              :style="{ stroke: g.color, fill: g.color }"
            />
            <line
              v-if="g.box"
              class="bpc-median"
              :x1="g.cx - g.boxW / 2" :x2="g.cx + g.boxW / 2" :y1="g.box.median" :y2="g.box.median"
            />
            <!-- 平均：菱形 -->
            <path v-if="showMean && g.box" class="bpc-mean" :d="diamond(g.cx, g.box.mean, 4)" />
          </template>
        </g>
      </g>
    </svg>

    <p v-if="!groupViews.length" class="absolute inset-0 flex items-center justify-center text-sm text-content-tertiary">{{ emptyText }}</p>
    <p class="sr-only" aria-live="polite">{{ liveText }}</p>

    <slot name="tooltip" :tooltip-data="tooltipData" :tooltip-visible="tooltipVisible">
      <div
        v-if="tooltipVisible && tooltipData && enableTooltip"
        class="pointer-events-none absolute z-30 min-w-36 rounded-md border border-stroke-light bg-surface-primary px-2.5 py-1.5 text-xs shadow-lg"
        role="tooltip"
        :style="tooltipStyle"
      >
        <template v-if="tooltipData.point">
          <div class="text-sm font-semibold text-content-primary">{{ fmt(tooltipData.point.value) }}</div>
          <div class="text-content-secondary">{{ tooltipData.label }}{{ tooltipData.point.outlier ? '・離群值' : '' }}</div>
          <div v-if="tooltipData.point.name" class="text-content-tertiary">{{ tooltipData.point.name }}</div>
        </template>
        <template v-else>
          <div class="text-sm font-semibold text-content-primary">{{ tooltipData.label }}</div>
          <dl class="bpc-tip-stats">
            <template v-for="row in tooltipRows" :key="row[0]">
              <dt>{{ row[0] }}</dt>
              <dd>{{ row[1] }}</dd>
            </template>
          </dl>
        </template>
      </div>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import * as d3 from 'd3'
import { chartPalette, chartTheme } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { estimateTextWidth } from './utils/chartText'
import { truncateText } from './utils/horizontalBar'
import {
  boxStats,
  groupValues,
  jitter,
  kernelDensity,
  silvermanBandwidth,
  type BoxStats,
  type QuartileMethod,
} from './utils/boxPlot'
import { tooltipPlacement } from './utils/tooltipPlacement'

/**
 * BoxPlotChart —— 箱型圖（可加小提琴圖）
 *
 * - 比較不同機台、班別、批次的分布：中位數、離散程度（IQR）、離群值一張圖看完
 * - mode="violin" 畫出密度形狀，看得出雙峰或偏態（箱型圖看不出來）
 * - quartileMethod="exclusive" 與 Minitab 的四分位數一致
 * - referenceLines 畫規格上下限，和 SPC、Cpk 一起看
 */

/** 組的事件 payload */
export interface BoxPlotGroupEvent {
  key: string
  label: string
  /** 沒有數值的組為 null */
  stats: BoxStats | null
  /** 這一組的原始資料（依數值由小到大） */
  rows: Record<string, unknown>[]
}

/** 資料點的事件 payload */
export interface BoxPlotPointEvent {
  group: string
  groupLabel: string
  value: number
  outlier: boolean
  datum: Record<string, unknown>
}

/** 提示框的資料 */
export interface BoxPlotTooltip extends BoxPlotGroupEvent {
  /** 指到資料點時才有 */
  point: (BoxPlotPointEvent & { name: string }) | null
  position: { containerX: number; containerY: number }
}

/** 參考線（規格上下限、目標） */
export interface BoxPlotReferenceLine {
  value: number
  label?: string
  color?: string
}

/** 組的設定：字串就是組的值；物件可另給顯示文字 */
export type BoxPlotGroupInput = string | number | { value: string | number; label?: string }

type Row = Record<string, unknown>

interface BoxPlotChartProps {
  // === 基礎配置 ===
  width?: number
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  margin?: { top: number; right: number; bottom: number; left: number }

  // === 數據配置 ===
  data: Row[]
  groupField?: string
  valueField?: string
  /** 資料點提示框顯示的名稱欄位（例如批號、序號） */
  nameField?: string | null
  /** 組的順序與顯示文字；沒列到的組依出現順序接在後面 */
  groups?: BoxPlotGroupInput[]
  /** 組的排序：原順序、中位數由小到大、由大到小 */
  sort?: 'none' | 'median-asc' | 'median-desc'

  // === 統計配置 ===
  /** 四分位數算法：inclusive（Excel、R）或 exclusive（Minitab） */
  quartileMethod?: QuartileMethod
  /** 鬚的長度：k 倍 IQR；'minmax' 時鬚畫到最小、最大值 */
  whisker?: number | 'minmax'

  // === 視覺配置 ===
  /** box：箱型圖；violin：小提琴圖（中間有窄的箱子） */
  mode?: 'box' | 'violin'
  /** 畫出平均（菱形） */
  showMean?: boolean
  /** 畫出資料點：只畫離群值、全部、都不畫 */
  showPoints?: 'outliers' | 'all' | 'none'
  /** 組名下方標出筆數 */
  showCount?: boolean
  /** 參考線（規格上下限、目標） */
  referenceLines?: BoxPlotReferenceLine[]
  /** 數值範圍；未指定時涵蓋所有資料與參考線 */
  valueDomain?: [number, number] | null
  valueFormat?: ((value: number) => string) | null
  /** Y 軸名稱（單位） */
  yLabel?: string
  title?: string
  /** 箱子顏色；未指定時用類別色第 1 號 */
  color?: string | null
  /** 強調這一組，其餘轉灰 */
  highlightKey?: string | number | null
  emptyText?: string

  // === 互動配置 ===
  enableTooltip?: boolean

  // === 企業級擴展點 ===
  customRenderers?: {
    /** 自訂組的提示框內容（每行 [名稱, 值]） */
    tooltip?: (event: BoxPlotGroupEvent) => [string, string][]
  }
}

const props = withDefaults(defineProps<BoxPlotChartProps>(), {
  width: 640,
  height: 360,
  autoResize: false,
  debounceDelay: 150,
  margin: () => ({ top: 16, right: 16, bottom: 8, left: 8 }),
  groupField: 'group',
  valueField: 'value',
  nameField: null,
  groups: () => [],
  sort: 'none',
  quartileMethod: 'inclusive',
  whisker: 1.5,
  mode: 'box',
  showMean: true,
  showPoints: 'outliers',
  showCount: true,
  referenceLines: () => [],
  valueDomain: null,
  valueFormat: null,
  yLabel: '',
  title: '',
  color: null,
  highlightKey: null,
  emptyText: '沒有資料',
  enableTooltip: true,
  customRenderers: () => ({}),
})

const emit = defineEmits<{
  'chart-ready': [payload: { width: number; height: number }]
  'chart-resize': [payload: { width: number; height: number }]
  'group-hover': [payload: BoxPlotGroupEvent]
  'group-click': [payload: BoxPlotGroupEvent]
  'point-hover': [payload: BoxPlotPointEvent]
  'point-click': [payload: BoxPlotPointEvent]
  'stats-change': [payload: BoxPlotGroupEvent[]]
  'tooltip-show': [payload: BoxPlotTooltip]
  'tooltip-hide': []
}>()

const containerRef = ref<HTMLDivElement | null>(null)

const { effectiveWidth, effectiveHeight } = useAutoResize(containerRef, props, (size) => emit('chart-resize', size))

// === 資料 ===

const groupInputs = computed(() =>
  props.groups.map((g) => (typeof g === 'object' && g !== null ? { value: String(g.value), label: g.label } : { value: String(g) }))
)

interface GroupData {
  key: string
  label: string
  values: number[]
  rows: Row[]
  stats: BoxStats | null
}

const groups = computed<GroupData[]>(() => {
  const { groups: list } = groupValues(props.data ?? [], {
    groupField: props.groupField,
    valueField: props.valueField,
    groups: groupInputs.value,
  })
  const out = list.map((g) => ({ ...g, stats: boxStats(g.values, { method: props.quartileMethod, whisker: props.whisker }) }))
  if (props.sort !== 'none') {
    const dir = props.sort === 'median-asc' ? 1 : -1
    // 沒有數值的組放最後
    out.sort((a, b) => (a.stats && b.stats ? dir * (a.stats.median - b.stats.median) : a.stats ? -1 : b.stats ? 1 : 0))
  }
  return out
})

function eventOf(index: number): BoxPlotGroupEvent {
  const g = groups.value[index]
  return { key: g.key, label: g.label, stats: g.stats ? { ...g.stats, outliers: [...g.stats.outliers] } : null, rows: g.rows.map((r) => toRaw(r)) }
}

// 掛載時也送一次
watch(groups, (list) => emit('stats-change', list.map((_, i) => eventOf(i))), { immediate: true })

const defaultFormat = d3.format(',.4~f')
const fmt = (v: number) => (props.valueFormat ?? defaultFormat)(v)

// === 版面 ===

const TITLE_H = 24
const containerStyle = computed(() => ({
  width: props.autoResize ? '100%' : `${props.width}px`,
  height: props.autoResize ? '100%' : `${props.height}px`,
}))

const svgHeight = computed(() => Math.max(0, effectiveHeight.value - (props.title ? TITLE_H : 0)))

const domain = computed<[number, number]>(() => {
  if (props.valueDomain) return props.valueDomain
  let lo = Infinity
  let hi = -Infinity
  for (const g of groups.value) {
    if (!g.stats) continue
    lo = Math.min(lo, g.stats.min)
    hi = Math.max(hi, g.stats.max)
  }
  for (const r of props.referenceLines) {
    if (!Number.isFinite(r.value)) continue
    lo = Math.min(lo, r.value)
    hi = Math.max(hi, r.value)
  }
  if (!Number.isFinite(lo)) return [0, 1]
  if (lo === hi) return [lo - 1, hi + 1]
  const pad = (hi - lo) * 0.05
  return [lo - pad, hi + pad]
})

/** 先用暫定的高度算刻度，量出最寬的刻度文字當左邊界 */
const yScale = computed(() => {
  const bottom = (props.showCount ? 36 : 22) + props.margin.bottom
  const h = Math.max(0, svgHeight.value - props.margin.top - bottom)
  return d3.scaleLinear().domain(domain.value).range([h, 0]).nice()
})

const plotHeight = computed(() => yScale.value.range()[0])

const yTicks = computed(() => {
  const ys = yScale.value
  const count = Math.max(2, Math.floor(plotHeight.value / 40))
  return ys.ticks(count).map((v) => ({ value: v, y: ys(v), label: fmt(v) }))
})

const plotLeft = computed(() => {
  let w = 0
  for (const t of yTicks.value) w = Math.max(w, estimateTextWidth(t.label, 11))
  return props.margin.left + Math.ceil(w) + 12 + (props.yLabel ? 18 : 0)
})

const plotWidth = computed(() => Math.max(0, effectiveWidth.value - plotLeft.value - props.margin.right))

const highlightTarget = computed(() => {
  const k = props.highlightKey
  return k === null || k === undefined || k === '' ? null : String(k)
})

const diamond = (x: number, y: number, r: number) => `M${x},${y - r}L${x + r},${y}L${x},${y + r}L${x - r},${y}Z`

interface PointView {
  i: number
  x: number
  y: number
  outlier: boolean
}

interface GroupView {
  key: string
  index: number
  label: string
  labelText: string
  x0: number
  bandW: number
  cx: number
  boxW: number
  capW: number
  color: string
  dimmed: boolean
  stats: BoxStats | null
  box: { q1: number; median: number; q3: number; whiskerLow: number; whiskerHigh: number; mean: number } | null
  violinPath: string | null
  points: PointView[]
}

const groupViews = computed<GroupView[]>(() => {
  const n = groups.value.length
  if (!n) return []
  const ys = yScale.value
  const bandW = plotWidth.value / n
  const violin = props.mode === 'violin'
  // 箱子最寬 56px；小提琴時中間的箱子窄一點
  const boxW = Math.max(4, Math.min(bandW * (violin ? 0.14 : 0.5), violin ? 14 : 56))
  const violinHalf = Math.min(bandW * 0.42, 80)
  const hasHighlight = highlightTarget.value !== null && groups.value.some((g) => g.key === highlightTarget.value)

  // 小提琴：各組用同一個密度比例（寬度可以比較），以最大密度撐滿
  const densities = groups.value.map((g) => (violin && g.stats ? kernelDensity(g.values, silvermanBandwidth(g.stats)) : []))
  let maxDensity = 0
  for (const d of densities) for (const p of d) maxDensity = Math.max(maxDensity, p.density)

  return groups.value.map((g, i) => {
    const x0 = i * bandW
    const cx = x0 + bandW / 2
    const dimmed = hasHighlight && g.key !== highlightTarget.value
    const color = dimmed ? chartPalette.muted : props.color || chartPalette.primary
    const s = g.stats
    let violinPath: string | null = null
    if (violin && densities[i].length && maxDensity > 0) {
      const w = (d: number) => (d / maxDensity) * violinHalf
      const right = densities[i].map((p) => `${cx + w(p.density)},${ys(p.value)}`)
      const left = densities[i].map((p) => `${cx - w(p.density)},${ys(p.value)}`).reverse()
      violinPath = `M${right.join('L')}L${left.join('L')}Z`
    }
    const points: PointView[] = []
    if (s && props.showPoints !== 'none') {
      const spread = Math.min(bandW * 0.3, 24)
      g.values.forEach((v, j) => {
        const outlier = v < s.lowerFence || v > s.upperFence
        if (props.showPoints === 'outliers' && !outlier) return
        points.push({ i: j, x: props.showPoints === 'all' ? cx + jitter(j) * spread : cx, y: ys(v), outlier })
      })
    }
    return {
      key: g.key,
      index: i,
      label: g.label,
      labelText: truncateText(g.label, bandW - 4, (t) => estimateTextWidth(t, 12)),
      x0,
      bandW,
      cx,
      boxW,
      capW: Math.max(4, boxW * 0.5),
      color,
      dimmed,
      stats: s,
      box: s
        ? { q1: ys(s.q1), median: ys(s.median), q3: ys(s.q3), whiskerLow: ys(s.whiskerLow), whiskerHigh: ys(s.whiskerHigh), mean: ys(s.mean) }
        : null,
      violinPath,
      points,
    }
  })
})

const referenceViews = computed(() =>
  props.referenceLines
    .filter((r) => Number.isFinite(r.value))
    .map((r) => ({ y: yScale.value(r.value), label: r.label ?? fmt(r.value), color: r.color ?? chartTheme.danger }))
)

const ariaSummary = computed(() => {
  const name = props.title || '箱型圖'
  const list = groups.value.filter((g) => g.stats)
  if (!list.length) return `${name}：沒有資料`
  const widest = [...list].sort((a, b) => b.stats!.iqr - a.stats!.iqr)[0]
  return `${name}：${groups.value.length} 組，四分位距最大的是 ${widest.label}（${fmt(widest.stats!.iqr)}）。可用左右鍵逐組查看`
})

// === 提示框 ===

const hoverIndex = ref<number | null>(null)
const hoverPoint = ref<number | null>(null)
const tooltipData = ref<BoxPlotTooltip | null>(null)
const tooltipVisible = ref(false)
const liveText = ref('')

const tooltipRows = computed<[string, string][]>(() => {
  const t = tooltipData.value
  if (!t) return []
  if (props.customRenderers.tooltip) return props.customRenderers.tooltip(t)
  const s = t.stats
  if (!s) return [['筆數', '0']]
  const rows: [string, string][] = [
    ['筆數', String(s.n)],
    ['最大', fmt(s.max)],
    ['Q3', fmt(s.q3)],
    ['中位數', fmt(s.median)],
    ['Q1', fmt(s.q1)],
    ['最小', fmt(s.min)],
    ['平均', fmt(s.mean)],
    ['標準差', fmt(s.sd)],
    ['四分位距', fmt(s.iqr)],
  ]
  if (s.outliers.length) rows.push(['離群值', `${s.outliers.length} 個`])
  return rows
})

const tooltipStyle = computed(() => {
  const t = tooltipData.value
  if (!t) return {}
  return tooltipPlacement(t.position.containerX, t.position.containerY, effectiveWidth.value, effectiveHeight.value, 180, 200)
})

function pointEventOf(index: number, j: number): BoxPlotPointEvent {
  const g = groups.value[index]
  const v = g.values[j]
  const s = g.stats!
  return { group: g.key, groupLabel: g.label, value: v, outlier: v < s.lowerFence || v > s.upperFence, datum: toRaw(g.rows[j]) }
}

function relative(event: MouseEvent): { x: number; y: number } {
  const rect = containerRef.value?.getBoundingClientRect()
  return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
}

function showGroup(index: number, x: number, y: number): void {
  const changed = hoverIndex.value !== index || hoverPoint.value !== null || !tooltipVisible.value
  hoverIndex.value = index
  hoverPoint.value = null
  tooltipData.value = { ...eventOf(index), point: null, position: { containerX: x, containerY: y } }
  tooltipVisible.value = true
  if (changed) {
    emit('group-hover', eventOf(index))
    emit('tooltip-show', tooltipData.value)
  }
}

function onGroupEnter(index: number, event: MouseEvent): void {
  const p = relative(event)
  showGroup(index, p.x, p.y)
}

function onGroupMove(index: number, event: MouseEvent): void {
  // 指在資料點上時，提示框留給那一點
  if (hoverPoint.value !== null && hoverIndex.value === index) return
  const p = relative(event)
  showGroup(index, p.x, p.y)
}

function onPointEnter(index: number, j: number, event: MouseEvent): void {
  const p = relative(event)
  hoverIndex.value = index
  hoverPoint.value = j
  const ev = pointEventOf(index, j)
  const name = props.nameField ? String(ev.datum[props.nameField] ?? '') : ''
  tooltipData.value = { ...eventOf(index), point: { ...ev, name }, position: { containerX: p.x, containerY: p.y } }
  tooltipVisible.value = true
  emit('point-hover', ev)
  emit('tooltip-show', tooltipData.value)
}

function clearHover(): void {
  if (hoverIndex.value === null && !tooltipVisible.value) return
  hoverIndex.value = null
  hoverPoint.value = null
  tooltipVisible.value = false
  emit('tooltip-hide')
}

/** 鍵盤：左右逐組、Home／End、Enter 等同點擊 */
function onKeydown(event: KeyboardEvent): void {
  const n = groups.value.length
  if (!n) return
  const cur = hoverIndex.value
  let next: number
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      next = cur === null ? 0 : Math.min(n - 1, cur + 1)
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      next = cur === null ? 0 : Math.max(0, cur - 1)
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = n - 1
      break
    case 'Enter':
    case ' ':
      if (cur !== null) emit('group-click', eventOf(cur))
      event.preventDefault()
      return
    case 'Escape':
      clearHover()
      return
    default:
      return
  }
  event.preventDefault()
  const g = groupViews.value[next]
  const svgTop = props.title ? TITLE_H : 0
  showGroup(next, plotLeft.value + g.cx + g.boxW, svgTop + props.margin.top + (g.box?.median ?? plotHeight.value / 2))
  const s = g.stats
  liveText.value = s
    ? `${g.label}：${s.n} 筆，中位數 ${fmt(s.median)}，Q1 ${fmt(s.q1)}，Q3 ${fmt(s.q3)}${s.outliers.length ? `，離群值 ${s.outliers.length} 個` : ''}`
    : `${g.label}：沒有資料`
}

// === 對外方法 ===

/** 每組的統計 */
function getStats(): BoxPlotGroupEvent[] {
  return groups.value.map((_, i) => eventOf(i))
}

onMounted(() => {
  emit('chart-ready', { width: effectiveWidth.value, height: effectiveHeight.value })
})

defineExpose({ containerRef, getStats })
</script>

<style scoped>
.box-plot-chart {
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.bpc-title {
  height: 24px;
  line-height: 24px;
  padding: 0 8px;
}

.bpc-svg {
  display: block;
  overflow: visible;
  outline: none;
}

.bpc-svg:focus-visible {
  box-shadow: 0 0 0 2px rgb(var(--t-stroke-focus));
  border-radius: 4px;
}

.bpc-grid {
  stroke: rgb(var(--t-stroke-light));
  shape-rendering: crispEdges;
}

.bpc-baseline {
  stroke: rgb(var(--t-stroke-medium));
  shape-rendering: crispEdges;
}

.bpc-tick {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  fill: rgb(var(--t-content-tertiary));
}

.bpc-ylabel {
  font-size: 11px;
  fill: rgb(var(--t-content-secondary));
}

.bpc-hit {
  fill: transparent;
}

.bpc-group {
  cursor: pointer;
}

.bpc-group.is-hovered .bpc-hit {
  fill: rgb(var(--t-surface-secondary));
}

.bpc-label {
  font-size: 12px;
  fill: rgb(var(--t-content-primary));
}

.bpc-count {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  fill: rgb(var(--t-content-tertiary));
}

.bpc-group.is-dimmed .bpc-label {
  fill: rgb(var(--t-content-tertiary));
}

.bpc-violin {
  fill-opacity: 0.18;
  stroke-width: 1;
}

.bpc-whisker line {
  stroke-width: 1.5;
}

.bpc-box {
  fill-opacity: 0.22;
  stroke-width: 1.5;
}

/* 中位數用文字色的粗線：深淺主題下都比箱子的顏色明顯 */
.bpc-median {
  stroke: rgb(var(--t-content-primary));
  stroke-width: 2.5;
}

.bpc-mean {
  fill: rgb(var(--t-surface-primary));
  stroke: rgb(var(--t-content-primary));
  stroke-width: 1.5;
}

.bpc-point {
  stroke-width: 1.5;
  fill-opacity: 0.55;
}

.bpc-point.is-hovered {
  stroke-width: 2.5;
  stroke: rgb(var(--t-content-primary)) !important;
}

.bpc-reference line {
  stroke-width: 1.5;
  stroke-dasharray: 4 3;
}

.bpc-reference text {
  font-size: 11px;
  paint-order: stroke;
  stroke: rgb(var(--t-surface-primary));
  stroke-width: 3px;
  stroke-linejoin: round;
  fill: rgb(var(--t-content-secondary));
}

.bpc-tip-stats {
  display: grid;
  grid-template-columns: auto auto;
  gap: 0 12px;
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}

.bpc-tip-stats dt {
  color: rgb(var(--t-content-tertiary));
}

.bpc-tip-stats dd {
  text-align: right;
  color: rgb(var(--t-content-primary));
}
</style>
