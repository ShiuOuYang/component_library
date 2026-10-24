<template>
  <div ref="containerRef" class="pie-chart" :style="containerStyle">
    <p v-if="title" class="pie-title text-sm font-semibold text-content-primary">{{ title }}</p>

    <div class="pie-body" :class="legendPosition === 'bottom' ? 'flex-col' : 'flex-row'">
      <div class="pie-figure" :style="{ width: `${diameter}px`, height: `${diameter}px` }">
        <svg :width="diameter" :height="diameter" role="list" :aria-label="ariaSummary">
          <g :transform="`translate(${diameter / 2}, ${diameter / 2})`">
            <g
              v-for="arc in arcs"
              :key="arc.slice.key"
              class="pie-slice"
              :class="{ 'is-active': activeKey === arc.slice.key, 'is-dimmed': arc.dimmed }"
              :transform="activeKey === arc.slice.key ? arc.lift : undefined"
              role="listitem"
              :tabindex="enableTooltip ? 0 : undefined"
              :aria-label="arc.ariaLabel"
              :data-key="arc.slice.key"
              @mouseenter="onSliceEnter(arc, $event)"
              @mousemove="onSliceMove(arc, $event)"
              @mouseleave="clearHover"
              @focus="onSliceFocus(arc)"
              @blur="clearHover"
              @click="onSliceClick(arc)"
            >
              <path class="pie-arc" :d="arc.d" :style="{ fill: arc.color }" />
              <text
                v-if="arc.labelText"
                class="pie-slice-label"
                :x="arc.labelX"
                :y="arc.labelY"
                text-anchor="middle"
                dominant-baseline="central"
                :style="{ fill: arc.textColor }"
              >{{ arc.labelText }}</text>
            </g>
          </g>
        </svg>

        <!-- 環圈中央：總數；滑過某一塊時換成那一塊 -->
        <div v-if="centerShown" class="pie-center" aria-hidden="true">
          <slot name="center" :total="visibleTotal" :active="activeEvent">
            <span class="pie-center-value">{{ centerValue }}</span>
            <span class="pie-center-label">{{ centerText }}</span>
          </slot>
        </div>

        <p v-if="!visibleSlices.length" class="absolute inset-0 flex items-center justify-center text-sm text-content-tertiary">
          {{ emptyText }}
        </p>
      </div>

      <!-- 圖例：顏色之外一定有名稱與數值（不能只靠顏色辨認） -->
      <ul
        v-if="legendPosition !== 'none' && legendItems.length"
        class="pie-legend"
        :class="legendPosition === 'bottom' ? 'is-bottom' : 'is-right'"
        :style="legendPosition === 'right' ? { width: `${legendWidth}px` } : undefined"
        aria-label="圖例"
      >
        <li v-for="item in legendItems" :key="item.key">
          <button
            type="button"
            class="pie-legend-item focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
            :class="{ 'is-hidden': item.hidden, 'is-active': activeKey === item.key }"
            :aria-pressed="!item.hidden"
            :title="item.hidden ? `顯示 ${item.label}` : `隱藏 ${item.label}`"
            @click="toggleSlice(item.key)"
            @mouseenter="legendHover = item.key"
            @mouseleave="legendHover = null"
          >
            <span class="pie-swatch" :style="{ background: item.color }" aria-hidden="true"></span>
            <span class="pie-legend-label">{{ item.label }}</span>
            <span v-if="showLegendValues" class="pie-legend-value">
              {{ item.valueText }}<template v-if="item.percentText"> · {{ item.percentText }}</template>
            </span>
          </button>
        </li>
      </ul>
    </div>

    <slot name="tooltip" :tooltip-data="tooltipData" :tooltip-visible="tooltipVisible">
      <!-- 環圈中央已經顯示滑過的那一塊：不再另外跳提示框蓋住它 -->
      <div
        v-if="tooltipVisible && tooltipData && enableTooltip && !centerShown"
        class="pointer-events-none absolute z-30 min-w-28 rounded-md border border-stroke-light bg-surface-primary px-2.5 py-1.5 text-xs shadow-lg"
        role="tooltip"
        :style="tooltipStyle"
      >
        <div class="flex items-center gap-1.5">
          <span class="h-0.5 w-3 rounded-full" :style="{ background: tooltipData.color }" aria-hidden="true"></span>
          <span class="text-sm font-semibold text-content-primary">{{ tooltipData.valueText }}</span>
          <span class="text-content-secondary">{{ fmtPercent(tooltipData.share) }}</span>
        </div>
        <div class="text-content-secondary">{{ tooltipData.label }}</div>
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
import { estimateTextWidth, readableTextColor } from './utils/chartText'
import { resolveCanvasColor } from './utils/largeData'
import { preparePie, type PieSlice } from './utils/pie'
import { tooltipPlacement } from './utils/tooltipPlacement'

/**
 * PieChart —— 圓餅圖／環圈圖（佔比）
 *
 * - innerRadiusRatio 0 是圓餅、預設 0.6 是環圈，中央顯示總數（滑過某一塊時換成那一塊）
 * - 一眼看佔比用：最多 maxSlices 塊（預設 6），其餘最小的幾塊併成「其他」
 * - 顏色跟著項目走（依資料順序），不跟大小排名：隱藏某一塊、數值變動，其他塊不會換色
 * - 圖例一定有名稱、數值與百分比；點圖例隱藏／顯示（可 v-model:hidden-keys）
 * - 只在夠大的扇形上標百分比；值要比較接近時，請改用水平長條圖
 */

/** 扇形事件的 payload */
export interface PieSliceEvent {
  /** 原始資料；「其他」為 null */
  datum: Record<string, unknown> | null
  key: string
  label: string
  value: number
  /** 佔目前顯示中總數的比例（0～1） */
  share: number
  isOthers: boolean
  members: Record<string, unknown>[]
}

export interface PieTooltip extends PieSliceEvent {
  valueText: string
  color: string
  position: { containerX: number; containerY: number }
}

type Row = Record<string, unknown>

interface PieChartProps {
  // === 基礎配置 ===
  width?: number
  height?: number
  /** 跟著容器大小調整（容器需有高度） */
  autoResize?: boolean
  debounceDelay?: number
  margin?: { top: number; right: number; bottom: number; left: number }

  // === 數據配置 ===
  data: Row[]

  // === 欄位映射（支援任意資料結構）===
  labelField?: string
  valueField?: string
  /** 資料鍵的欄位（hiddenKeys、colorMap、事件的 key）；沒有時用名稱 */
  keyField?: string
  keyFn?: ((datum: Row, index: number) => string) | null

  // === 分組配置 ===
  /** 最多幾塊（含「其他」）；超過時最小的幾塊併成「其他」 */
  maxSlices?: number
  othersLabel?: string
  /** 'desc'：從 12 點鐘方向起由大到小；'none'：照資料順序 */
  sort?: 'desc' | 'none'

  // === 色階配置 ===
  /** 類別色（依資料順序取用，不循環）；未指定時用 8 色預設色 */
  colors?: string[] | null
  /** 指定某些項目的顏色（鍵 → 顏色），優先於 colors */
  colorMap?: Record<string, string> | null

  // === 元素樣式配置 ===
  /** 內半徑比例：0 為圓餅，0.6 為環圈 */
  innerRadiusRatio?: number
  /** 扇形之間的縫（px） */
  gap?: number

  // === 視覺配置 ===
  title?: string
  /** 扇形上的文字：百分比、數值或不顯示（只在夠大的扇形上標） */
  sliceLabel?: 'percent' | 'value' | 'none'
  legendPosition?: 'right' | 'bottom' | 'none'
  /** 右側圖例的寬度 */
  legendWidth?: number
  /** 圖例顯示數值與百分比 */
  showLegendValues?: boolean
  /** 環圈中央顯示總數 */
  showCenter?: boolean
  /** 中央總數下方的文字 */
  centerLabel?: string
  valueFormat?: ((value: number) => string) | null
  emptyText?: string

  // === 互動配置 ===
  enableTooltip?: boolean
  /** 隱藏的項目（可 v-model:hidden-keys） */
  hiddenKeys?: string[]
  /** 強調某一塊（突出並讓其他塊變淡） */
  highlightKey?: string | number | null

  // === 企業級擴展點 ===
  customRenderers?: {
    /** 自訂扇形顏色（回傳 null 用預設） */
    sliceColor?: (datum: Row | null, slice: PieSliceEvent) => string | null | undefined
    /** 自訂提示框內容（每行一個字串，數值與名稱之下） */
    tooltip?: (datum: Row | null, slice: PieSliceEvent) => string[]
  }
}

const props = withDefaults(defineProps<PieChartProps>(), {
  width: 480,
  height: 280,
  autoResize: false,
  debounceDelay: 150,
  margin: () => ({ top: 8, right: 8, bottom: 8, left: 8 }),
  labelField: 'label',
  valueField: 'value',
  keyField: 'id',
  keyFn: null,
  maxSlices: 6,
  othersLabel: '其他',
  sort: 'desc',
  colors: null,
  colorMap: null,
  innerRadiusRatio: 0.6,
  gap: 2,
  title: '',
  sliceLabel: 'percent',
  legendPosition: 'right',
  legendWidth: 200,
  showLegendValues: true,
  showCenter: true,
  centerLabel: '總計',
  valueFormat: null,
  emptyText: '沒有資料',
  enableTooltip: true,
  hiddenKeys: () => [],
  highlightKey: null,
  customRenderers: () => ({}),
})

const emit = defineEmits<{
  'chart-ready': [payload: { width: number; height: number }]
  'chart-resize': [payload: { width: number; height: number }]
  'slice-hover': [payload: PieSliceEvent]
  'slice-click': [payload: PieSliceEvent]
  'tooltip-show': [payload: PieTooltip]
  'tooltip-hide': []
  'legend-toggle': [payload: { key: string; hidden: boolean }]
  'update:hiddenKeys': [value: string[]]
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const { effectiveWidth, effectiveHeight } = useAutoResize(containerRef, props, (size) => emit('chart-resize', size))

// === 資料 ===

const prepared = computed(() =>
  preparePie(props.data ?? [], {
    labelField: props.labelField,
    valueField: props.valueField,
    keyField: props.keyField,
    keyFn: props.keyFn,
    maxSlices: props.maxSlices,
    othersLabel: props.othersLabel,
    sort: props.sort,
  })
)
const slices = computed<PieSlice[]>(() => prepared.value.slices)

const hidden = ref(new Set(props.hiddenKeys))
watch(
  () => props.hiddenKeys,
  (keys) => {
    hidden.value = new Set(keys)
  }
)

const visibleSlices = computed(() => slices.value.filter((s) => !hidden.value.has(s.key)))
const visibleTotal = computed(() => visibleSlices.value.reduce((sum, s) => sum + s.value, 0))

const defaultFormat = d3.format(',~f')
const fmt = (v: number) => (props.valueFormat ?? defaultFormat)(v)
const percentFormat = d3.format('.1%')
const fmtPercent = (v: number) => percentFormat(v)

/** 事件送出原始物件（不是 Vue 的響應式代理），呼叫端才能用 === 比對自己的資料 */
function eventOf(s: PieSlice): PieSliceEvent {
  return {
    datum: s.datum ? toRaw(s.datum) : null,
    key: s.key,
    label: s.label,
    value: s.value,
    share: visibleTotal.value > 0 && !hidden.value.has(s.key) ? s.value / visibleTotal.value : 0,
    isOthers: s.isOthers,
    members: s.members.map((m) => toRaw(m)),
  }
}

/** 顏色：colorMap > 自訂 > 類別色（依資料順序）；「其他」用中性灰 */
function colorOf(s: PieSlice): string {
  const mapped = props.colorMap?.[s.key]
  if (mapped) return mapped
  const custom = props.customRenderers.sliceColor?.(s.datum, eventOf(s))
  if (custom) return custom
  if (s.isOthers) return chartPalette.other
  const palette = props.colors?.length ? props.colors : chartPalette.categorical
  return palette[s.colorIndex] ?? chartPalette.other
}

// === 版面 ===

const TITLE_H = 24
const isDonut = computed(() => props.innerRadiusRatio > 0)
const centerShown = computed(() => isDonut.value && props.showCenter && visibleSlices.value.length > 0)

/** 下方圖例的估計高度（一行約 24px，依寬度換行） */
const bottomLegendHeight = computed(() => {
  if (props.legendPosition !== 'bottom' || !slices.value.length) return 0
  const innerW = effectiveWidth.value - props.margin.left - props.margin.right
  const perRow = Math.max(1, Math.floor(innerW / 170))
  return Math.ceil(slices.value.length / perRow) * 24 + 8
})

const diameter = computed(() => {
  const innerW = effectiveWidth.value - props.margin.left - props.margin.right
  const innerH = effectiveHeight.value - props.margin.top - props.margin.bottom - (props.title ? TITLE_H : 0)
  const legendW = props.legendPosition === 'right' ? props.legendWidth + 16 : 0
  return Math.max(0, Math.floor(Math.min(innerW - legendW, innerH - bottomLegendHeight.value)))
})

const containerStyle = computed(() => {
  const m = props.margin
  return {
    width: props.autoResize ? '100%' : `${props.width}px`,
    height: props.autoResize ? '100%' : `${props.height}px`,
    padding: `${m.top}px ${m.right}px ${m.bottom}px ${m.left}px`,
  }
})

// === 扇形 ===

/** 滑過或聚焦中的那一塊 */
const hoverKey = ref<string | null>(null)
/** 滑過圖例的那一項 */
const legendHover = ref<string | null>(null)

const highlightTarget = computed(() => {
  const k = props.highlightKey
  return k === null || k === undefined || k === '' ? null : String(k)
})

const activeKey = computed(() => hoverKey.value ?? legendHover.value ?? highlightTarget.value)

interface ArcView {
  slice: PieSlice
  d: string
  color: string
  textColor: string
  labelText: string
  labelX: number
  labelY: number
  /** 突出時的位移 */
  lift: string
  dimmed: boolean
  ariaLabel: string
  centroid: [number, number]
}

const arcs = computed<ArcView[]>(() => {
  const outer = diameter.value / 2 - 6 // 留給突出的空間
  if (outer <= 0 || !visibleSlices.value.length) return []
  const inner = outer * Math.min(0.9, Math.max(0, props.innerRadiusRatio))
  const single = visibleSlices.value.length === 1
  // 🔧 縫用固定寬度（padRadius × padAngle = gap px），內外圈的縫一樣寬；只有一塊時不留縫
  const padAngle = single ? 0 : props.gap / outer
  const pie = d3
    .pie<PieSlice>()
    .sort(null)
    .value((s) => s.value)
    .padAngle(padAngle)
  const arc = d3.arc<d3.PieArcDatum<PieSlice>>().innerRadius(inner).outerRadius(outer).padRadius(outer).cornerRadius(single ? 0 : 2)
  const labelArc = d3.arc<d3.PieArcDatum<PieSlice>>().innerRadius(inner === 0 ? outer * 0.6 : (inner + outer) / 2).outerRadius(inner === 0 ? outer * 0.6 : (inner + outer) / 2)
  const thickness = outer - inner
  const target = activeKey.value
  return pie(visibleSlices.value).map((p) => {
    const s = p.data
    const ev = eventOf(s)
    const color = colorOf(s)
    const [lx, ly] = labelArc.centroid(p)
    const mid = (p.startAngle + p.endAngle) / 2
    const angle = p.endAngle - p.startAngle
    let labelText = ''
    if (props.sliceLabel !== 'none') {
      const text = props.sliceLabel === 'percent' ? fmtPercent(ev.share) : fmt(s.value)
      // 只在放得下的扇形上標：弧長夠寬、環夠厚
      const arcLen = angle * (inner === 0 ? outer * 0.6 : (inner + outer) / 2)
      if (arcLen >= estimateTextWidth(text, 11) + 8 && (inner === 0 || thickness >= 18)) labelText = text
    }
    return {
      slice: s,
      d: arc(p) ?? '',
      color,
      textColor: textColorFor(color),
      labelText,
      labelX: lx,
      labelY: ly,
      lift: `translate(${Math.sin(mid) * 4}, ${-Math.cos(mid) * 4})`,
      dimmed: target !== null && target !== s.key,
      ariaLabel: `${s.label}：${fmt(s.value)}（${fmtPercent(ev.share)}）`,
      centroid: arc.centroid(p) as [number, number],
    }
  })
})

/** 扇形上的文字色：依底色亮度選白或深色（CSS 變數要先解開） */
function textColorFor(color: string): string {
  const resolved = color.includes('var(') ? resolveCanvasColor(color, containerRef.value) : color
  return readableTextColor(resolved)
}

const legendItems = computed(() =>
  slices.value.map((s) => {
    const ev = eventOf(s)
    const isHidden = hidden.value.has(s.key)
    return {
      key: s.key,
      label: s.label,
      color: colorOf(s),
      hidden: isHidden,
      valueText: fmt(s.value),
      percentText: isHidden ? '' : fmtPercent(ev.share),
    }
  })
)

function toggleSlice(key: string): void {
  const next = new Set(hidden.value)
  const nowHidden = !next.has(key)
  if (nowHidden) next.add(key)
  else next.delete(key)
  hidden.value = next
  clearHover()
  emit('legend-toggle', { key, hidden: nowHidden })
  emit('update:hiddenKeys', [...next])
}

// === 中央文字 ===

const activeEvent = computed<PieSliceEvent | null>(() => {
  const key = activeKey.value
  const s = key === null ? undefined : visibleSlices.value.find((x) => x.key === key)
  return s ? eventOf(s) : null
})

const centerValue = computed(() => (activeEvent.value ? fmt(activeEvent.value.value) : fmt(visibleTotal.value)))
const centerText = computed(() =>
  activeEvent.value ? `${activeEvent.value.label} · ${fmtPercent(activeEvent.value.share)}` : props.centerLabel
)

const ariaSummary = computed(() => {
  const name = props.title || '圓餅圖'
  const parts = visibleSlices.value.map((s) => `${s.label} ${fmtPercent(eventOf(s).share)}`)
  return parts.length ? `${name}：${parts.join('、')}` : `${name}：沒有資料`
})

// === 提示框 ===

const tooltipData = ref<PieTooltip | null>(null)
const tooltipVisible = ref(false)

const tooltipLines = computed(() => {
  const t = tooltipData.value
  if (!t) return []
  if (props.customRenderers.tooltip) return props.customRenderers.tooltip(t.datum, t)
  return t.isOthers ? [`合計 ${t.members.length} 項`] : []
})

const tooltipStyle = computed(() => {
  const t = tooltipData.value
  if (!t) return {}
  return tooltipPlacement(t.position.containerX, t.position.containerY, effectiveWidth.value, effectiveHeight.value, 180, 80)
})

function showTooltip(a: ArcView, x: number, y: number): void {
  tooltipData.value = { ...eventOf(a.slice), valueText: fmt(a.slice.value), color: a.color, position: { containerX: x, containerY: y } }
  tooltipVisible.value = true
}

function enter(a: ArcView, x: number, y: number): void {
  hoverKey.value = a.slice.key
  showTooltip(a, x, y)
  emit('slice-hover', eventOf(a.slice))
  if (tooltipData.value) emit('tooltip-show', tooltipData.value)
}

function pointerPosition(event: MouseEvent): { x: number; y: number } {
  const rect = containerRef.value?.getBoundingClientRect()
  return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
}

function onSliceEnter(a: ArcView, event: MouseEvent): void {
  const p = pointerPosition(event)
  enter(a, p.x, p.y)
}

function onSliceMove(a: ArcView, event: MouseEvent): void {
  const p = pointerPosition(event)
  if (hoverKey.value !== a.slice.key) enter(a, p.x, p.y)
  else showTooltip(a, p.x, p.y)
}

/** 鍵盤聚焦：提示框放在扇形中心（與滑鼠看到的一樣） */
function onSliceFocus(a: ArcView): void {
  const offset = props.margin.left + diameter.value / 2
  const top = props.margin.top + (props.title ? TITLE_H : 0) + diameter.value / 2
  enter(a, offset + a.centroid[0], top + a.centroid[1])
}

function clearHover(): void {
  if (hoverKey.value === null) return
  hoverKey.value = null
  tooltipVisible.value = false
  emit('tooltip-hide')
}

function onSliceClick(a: ArcView): void {
  emit('slice-click', eventOf(a.slice))
}

onMounted(() => {
  emit('chart-ready', { width: effectiveWidth.value, height: effectiveHeight.value })
})

defineExpose({ containerRef })
</script>

<style scoped>
.pie-chart {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.pie-title {
  height: 24px;
  line-height: 24px;
}

.pie-body {
  display: flex;
  flex: 1 1 0%;
  min-height: 0;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.pie-figure {
  position: relative;
  flex: none;
}

.pie-figure svg {
  display: block;
  overflow: visible;
}

.pie-slice {
  cursor: pointer;
  outline: none;
  transition: opacity 0.15s ease;
}

.pie-slice.is-dimmed {
  opacity: 0.35;
}

.pie-slice:focus-visible .pie-arc {
  stroke: rgb(var(--t-stroke-focus));
  stroke-width: 2;
}

.pie-slice-label {
  font-size: 11px;
  font-weight: 600;
  pointer-events: none;
}

.pie-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  text-align: center;
  padding: 0 20%;
}

.pie-center-value {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
  color: rgb(var(--t-content-primary));
}

.pie-center-label {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: rgb(var(--t-content-secondary));
}

.pie-legend {
  display: flex;
  gap: 2px 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pie-legend.is-right {
  flex: none;
  flex-direction: column;
  max-height: 100%;
  overflow-y: auto;
}

.pie-legend.is-bottom {
  flex-wrap: wrap;
  justify-content: center;
}

.pie-legend.is-bottom .pie-legend-item {
  width: auto;
}

.pie-legend-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 12px;
  text-align: left;
}

.pie-legend-item:hover,
.pie-legend-item.is-active {
  background: rgb(var(--t-surface-secondary));
}

.pie-swatch {
  width: 10px;
  height: 10px;
  flex: none;
  border-radius: 2px;
}

.pie-legend-label {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgb(var(--t-content-primary));
}

.pie-legend-value {
  flex: none;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--t-content-secondary));
}

.pie-legend-item.is-hidden .pie-swatch {
  opacity: 0.3;
}

.pie-legend-item.is-hidden .pie-legend-label,
.pie-legend-item.is-hidden .pie-legend-value {
  color: rgb(var(--t-content-tertiary));
  text-decoration: line-through;
}
</style>
