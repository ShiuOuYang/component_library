<template>
  <div ref="containerRef" class="waterfall-chart" :style="containerStyle">
    <div v-if="title || showLegend" class="wfc-head">
      <p v-if="title" class="wfc-title text-sm font-semibold text-content-primary">{{ title }}</p>
      <!-- 圖例：增減的顏色配上 ▲▼ 與文字，不只靠顏色 -->
      <ul v-if="showLegend" class="wfc-legend" aria-label="圖例">
        <li v-for="l in legendItems" :key="l.kind">
          <span class="wfc-swatch" :style="{ background: l.color }" aria-hidden="true"></span>{{ l.icon }} {{ l.label }}
        </li>
      </ul>
    </div>

    <svg
      class="wfc-svg"
      :width="effectiveWidth"
      :height="svgHeight"
      role="img"
      tabindex="0"
      :aria-label="ariaSummary"
      @keydown="onKeydown"
      @blur="clearHover"
    >
      <g :transform="`translate(${plotLeft}, ${margin.top})`">
        <g class="wfc-axis" aria-hidden="true">
          <g v-for="t in yTicks" :key="t.value">
            <line class="wfc-grid" :x1="0" :x2="plotWidth" :y1="t.y" :y2="t.y" />
            <text class="wfc-tick" :x="-8" :y="t.y" text-anchor="end" dominant-baseline="central">{{ t.label }}</text>
          </g>
          <line class="wfc-zero" :x1="0" :x2="plotWidth" :y1="zeroY" :y2="zeroY" />
        </g>

        <!-- 連接線：前一根的結束接到下一根的開始 -->
        <g v-if="showConnectors" class="wfc-connectors" aria-hidden="true">
          <line v-for="c in connectors" :key="c.key" :x1="c.x1" :x2="c.x2" :y1="c.y" :y2="c.y" />
        </g>

        <g
          v-for="b in barViews"
          :key="b.item.key"
          class="wfc-bar-group"
          :class="{ 'is-hovered': hoverIndex === b.index }"
          :data-key="b.item.key"
          @mouseenter="onEnter(b.index, $event)"
          @mousemove="onMove(b.index, $event)"
          @mouseleave="clearHover"
          @click="emit('bar-click', eventOf(b.index))"
        >
          <rect class="wfc-hit" :x="b.x0" :y="0" :width="b.bandW" :height="plotHeight" />
          <!-- 懸空的長條沒有基線，兩端都是小圓角 -->
          <rect class="wfc-bar" :x="b.barX" :y="b.barY" :width="b.barW" :height="b.barH" rx="2" :style="{ fill: b.color }" />
          <!-- 截斷記號：軸不是從 0 開始，這根長條的長度不能直接比 -->
          <path
            v-if="b.broken"
            class="wfc-break"
            :d="`M${b.barX - 2},${plotHeight - 10} l${(b.barW + 4) / 4},-4 l${(b.barW + 4) / 2},8 l${(b.barW + 4) / 4},-4`"
            aria-hidden="true"
          />
          <text
            v-if="showValues"
            class="wfc-value"
            :class="{ 'is-total': b.isTotal }"
            :x="b.cx"
            :y="b.valueY"
            text-anchor="middle"
            :dominant-baseline="b.valueBelow ? 'hanging' : 'auto'"
          >{{ b.valueText }}</text>
          <text class="wfc-label" :x="b.cx" :y="plotHeight + 16" text-anchor="middle">
            <title>{{ b.item.label }}</title>
            <tspan v-for="(line, li) in b.labelLines" :key="li" :x="b.cx" :dy="li ? 14 : 0">{{ line }}</tspan>
          </text>
        </g>
      </g>
    </svg>

    <p v-if="!barViews.length" class="absolute inset-0 flex items-center justify-center text-sm text-content-tertiary">{{ emptyText }}</p>
    <p class="sr-only" aria-live="polite">{{ liveText }}</p>

    <slot name="tooltip" :tooltip-data="tooltipData" :tooltip-visible="tooltipVisible">
      <div
        v-if="tooltipVisible && tooltipData && enableTooltip"
        class="pointer-events-none absolute z-30 min-w-32 rounded-md border border-stroke-light bg-surface-primary px-2.5 py-1.5 text-xs shadow-lg"
        role="tooltip"
        :style="tooltipStyle"
      >
        <div class="flex items-center gap-1.5">
          <span class="h-2.5 w-2.5 rounded-sm" :style="{ background: tooltipData.color }" aria-hidden="true"></span>
          <span class="text-sm font-semibold text-content-primary">{{ tooltipData.valueText }}</span>
        </div>
        <div class="text-content-secondary">{{ tooltipData.label }}</div>
        <div v-for="line in tooltipLines" :key="line" class="text-content-tertiary">{{ line }}</div>
      </div>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRaw } from 'vue'
import * as d3 from 'd3'
import { chartPalette } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { estimateTextWidth } from './utils/chartText'
import { truncateText } from './utils/horizontalBar'
import { tooltipPlacement } from './utils/tooltipPlacement'
import { buildWaterfall, shareOfStart, waterfallExtent, type WaterfallItem, type WaterfallKind } from './utils/waterfall'

/**
 * WaterfallChart —— 瀑布圖
 *
 * - 良率損失拆解：投入數 → 各站報廢 → 良品數；月營收、成本的增減分析
 * - 每根長條從前一根結束的地方開始，「每一步加減多少」一眼看出來
 * - 種類：start（起點）、delta（增減）、subtotal（小計）、total（總計）；totalLabel 自動補最後的總計
 * - 增減用 ▲▼ 與正負號標示，不只靠顏色；increaseIsGood 決定增加是好（綠）還是壞（紅）
 */

/** 長條的事件 payload */
export interface WaterfallEvent {
  key: string
  label: string
  kind: WaterfallKind
  /** start：絕對值；delta：增減；subtotal/total：累計值 */
  value: number
  from: number
  to: number
  /** 佔起點的比例（例如這一站報廢了投入數的幾 %；總計就是良率）；沒有起點時為 null */
  shareOfStart: number | null
  /** 原始資料；自動加上的總計為 null */
  datum: Record<string, unknown> | null
}

/** 提示框的資料 */
export interface WaterfallTooltip extends WaterfallEvent {
  valueText: string
  color: string
  position: { containerX: number; containerY: number }
}

type Row = Record<string, unknown>

interface WaterfallChartProps {
  // === 基礎配置 ===
  width?: number
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  margin?: { top: number; right: number; bottom: number; left: number }

  // === 數據配置 ===
  data: Row[]
  labelField?: string
  valueField?: string
  /** 種類欄位（'start' | 'delta' | 'subtotal' | 'total'）；沒有時第一項是起點，其餘是增減 */
  kindField?: string | null
  keyField?: string | null
  /** 沒有種類欄位時，第一項當起點 */
  firstIsStart?: boolean
  /** 最後自動加一根總計（例如「良品」）；null 時不加 */
  totalLabel?: string | null

  // === 視覺配置 ===
  /** 增加是好事（營收）還是壞事（成本）：決定增加用綠色還是紅色 */
  increaseIsGood?: boolean
  /** 起點、小計、總計的顏色；未指定時用類別色第 1 號 */
  totalColor?: string | null
  /**
   * Y 軸從 0 開始（預設）。起點很大、增減很小時（投入一萬片、每站報廢幾十片）可以關掉：
   * 軸改從資料附近開始，起點與合計的長條底部畫截斷記號，提醒長度不是從 0 量起
   */
  zeroBaseline?: boolean
  /** 長條最寬（px） */
  barMaxWidth?: number
  showConnectors?: boolean
  showValues?: boolean
  /** 增減的數值後面加上佔起點的比例 */
  showPercent?: boolean
  showLegend?: boolean
  valueFormat?: ((value: number) => string) | null
  title?: string
  emptyText?: string

  // === 互動配置 ===
  enableTooltip?: boolean

  // === 企業級擴展點 ===
  customRenderers?: {
    /** 自訂長條顏色（回傳 null 用預設） */
    barColor?: (event: WaterfallEvent) => string | null | undefined
    /** 自訂提示框內容（每行一個字串，數值與名稱之下） */
    tooltip?: (event: WaterfallEvent) => string[]
  }
}

const props = withDefaults(defineProps<WaterfallChartProps>(), {
  width: 640,
  height: 360,
  autoResize: false,
  debounceDelay: 150,
  margin: () => ({ top: 20, right: 16, bottom: 8, left: 8 }),
  labelField: 'label',
  valueField: 'value',
  kindField: 'type',
  keyField: 'id',
  firstIsStart: true,
  totalLabel: null,
  increaseIsGood: true,
  totalColor: null,
  zeroBaseline: true,
  barMaxWidth: 40,
  showConnectors: true,
  showValues: true,
  showPercent: false,
  showLegend: true,
  valueFormat: null,
  title: '',
  emptyText: '沒有資料',
  enableTooltip: true,
  customRenderers: () => ({}),
})

const emit = defineEmits<{
  'chart-ready': [payload: { width: number; height: number }]
  'chart-resize': [payload: { width: number; height: number }]
  'bar-hover': [payload: WaterfallEvent]
  'bar-click': [payload: WaterfallEvent]
  'tooltip-show': [payload: WaterfallTooltip]
  'tooltip-hide': []
}>()

const containerRef = ref<HTMLDivElement | null>(null)

const { effectiveWidth, effectiveHeight } = useAutoResize(containerRef, props, (size) => emit('chart-resize', size))

// === 資料 ===

const items = computed<WaterfallItem[]>(() =>
  buildWaterfall(props.data ?? [], {
    labelField: props.labelField,
    valueField: props.valueField,
    kindField: props.kindField,
    keyField: props.keyField,
    firstIsStart: props.firstIsStart,
    totalLabel: props.totalLabel,
  })
)

function eventOf(index: number): WaterfallEvent {
  const it = items.value[index]
  return {
    key: it.key,
    label: it.label,
    kind: it.kind,
    value: it.value,
    from: it.from,
    to: it.to,
    shareOfStart: shareOfStart(items.value, index),
    datum: it.datum ? toRaw(it.datum) : null,
  }
}

const defaultFormat = d3.format(',~f')
const fmt = (v: number) => (props.valueFormat ?? defaultFormat)(v)
const fmtPercent = d3.format('.1%')
/** 增減帶正負號（負號用真正的減號，跟連字號區分） */
const signed = (v: number) => (v > 0 ? `+${fmt(v)}` : v < 0 ? `−${fmt(-v)}` : fmt(0))

const isTotalKind = (k: WaterfallKind) => k !== 'delta'

const colors = computed(() => ({
  increase: props.increaseIsGood ? chartPalette.good : chartPalette.critical,
  decrease: props.increaseIsGood ? chartPalette.critical : chartPalette.good,
  total: props.totalColor || chartPalette.primary,
}))

function colorOf(index: number): string {
  const it = items.value[index]
  const custom = props.customRenderers.barColor?.(eventOf(index))
  if (custom) return custom
  if (isTotalKind(it.kind)) return colors.value.total
  return it.value < 0 ? colors.value.decrease : colors.value.increase
}

function valueTextOf(index: number): string {
  const it = items.value[index]
  if (isTotalKind(it.kind)) return fmt(it.value)
  const base = signed(it.value)
  const share = props.showPercent ? shareOfStart(items.value, index) : null
  return share === null ? base : `${base}（${fmtPercent(Math.abs(share))}）`
}

const legendItems = computed(() => {
  const kinds = new Set<string>(items.value.map((it) => (isTotalKind(it.kind) ? 'total' : it.value < 0 ? 'decrease' : 'increase')))
  return [
    { kind: 'increase', icon: '▲', label: '增加', color: colors.value.increase },
    { kind: 'decrease', icon: '▼', label: '減少', color: colors.value.decrease },
    { kind: 'total', icon: '■', label: '起點／合計', color: colors.value.total },
  ].filter((l) => kinds.has(l.kind))
})

// === 版面 ===

const HEAD_H = 28
const LABEL_LINE = 14

const containerStyle = computed(() => ({
  width: props.autoResize ? '100%' : `${props.width}px`,
  height: props.autoResize ? '100%' : `${props.height}px`,
}))

const svgHeight = computed(() => Math.max(0, effectiveHeight.value - (props.title || props.showLegend ? HEAD_H : 0)))

/** 組名最多兩行 */
const LABEL_H = 16 + LABEL_LINE + 6

const yScale = computed(() => {
  const h = Math.max(0, svgHeight.value - props.margin.top - props.margin.bottom - LABEL_H)
  return d3.scaleLinear().domain(waterfallExtent(items.value, props.zeroBaseline)).range([h, 0]).nice()
})

/** 軸沒有從 0 開始（起點、合計的長條被截斷） */
const truncated = computed(() => {
  const [d0, d1] = yScale.value.domain()
  return d0 > 0 || d1 < 0
})

const plotHeight = computed(() => yScale.value.range()[0])
const zeroY = computed(() => yScale.value(Math.min(Math.max(0, yScale.value.domain()[0]), yScale.value.domain()[1])))

const compact = d3.format('~s')

const yTicks = computed(() => {
  const ys = yScale.value
  const ticks = ys.ticks(Math.max(2, Math.floor(plotHeight.value / 44)))
  // 同一個軸用同一種格式：最大的刻度上萬時全部用 12k 這種寫法
  const useCompact = ticks.some((v) => Math.abs(v) >= 10000)
  return ticks.map((v) => ({ value: v, y: ys(v), label: useCompact ? compact(v) : fmt(v) }))
})

const plotLeft = computed(() => {
  let w = 0
  for (const t of yTicks.value) w = Math.max(w, estimateTextWidth(t.label, 11))
  return props.margin.left + Math.ceil(w) + 12
})

const plotWidth = computed(() => Math.max(0, effectiveWidth.value - plotLeft.value - props.margin.right))

/** 名稱依寬度斷成最多兩行；第二行放不下時加省略號 */
function wrapLabel(text: string, maxW: number): string[] {
  const measure = (t: string) => estimateTextWidth(t, 12)
  if (measure(text) <= maxW) return [text]
  let cut = 0
  let w = 0
  for (const ch of text) {
    const cw = measure(ch)
    if (w + cw > maxW) break
    w += cw
    cut += ch.length
  }
  const first = text.slice(0, Math.max(1, cut))
  return [first, truncateText(text.slice(first.length), maxW, measure)]
}

interface BarView {
  item: WaterfallItem
  index: number
  x0: number
  bandW: number
  cx: number
  barX: number
  barY: number
  barW: number
  barH: number
  color: string
  isTotal: boolean
  valueText: string
  valueY: number
  valueBelow: boolean
  labelLines: string[]
  /** 長條被截斷（畫截斷記號） */
  broken: boolean
}

const barViews = computed<BarView[]>(() => {
  const n = items.value.length
  if (!n) return []
  const ys = yScale.value
  const bandW = plotWidth.value / n
  const barW = Math.max(2, Math.min(props.barMaxWidth, bandW * 0.6))
  return items.value.map((item, i) => {
    const x0 = i * bandW
    const cx = x0 + bandW / 2
    // 軸被截斷時，從 0 起算的長條畫到繪圖區邊緣為止
    const clampY = (y: number) => Math.min(Math.max(y, 0), plotHeight.value)
    const y0 = clampY(ys(item.from))
    const y1 = clampY(ys(item.to))
    const top = Math.min(y0, y1)
    const h = Math.max(1, Math.abs(y1 - y0))
    // 總計在 0 以下（虧損）時數值放在長條下方
    const valueBelow = isTotalKind(item.kind) && item.to < 0
    return {
      item,
      index: i,
      x0,
      bandW,
      cx,
      barX: cx - barW / 2,
      barY: top,
      barW,
      barH: h,
      color: colorOf(i),
      isTotal: isTotalKind(item.kind),
      valueText: valueTextOf(i),
      valueY: valueBelow ? top + h + 4 : top - 6,
      valueBelow,
      labelLines: wrapLabel(item.label, bandW - 6),
      broken: truncated.value && isTotalKind(item.kind),
    }
  })
})

/** 連接線：第 i 根的結束（to）接到第 i+1 根 */
const connectors = computed(() => {
  const bars = barViews.value
  const ys = yScale.value
  const out: { key: string; x1: number; x2: number; y: number }[] = []
  for (let i = 0; i + 1 < bars.length; i++) {
    const a = bars[i]
    const b = bars[i + 1]
    out.push({ key: a.item.key, x1: a.barX + a.barW, x2: b.barX, y: ys(a.item.to) })
  }
  return out
})

const ariaSummary = computed(() => {
  const name = props.title || '瀑布圖'
  const list = items.value
  if (!list.length) return `${name}：沒有資料`
  const deltas = list.map((it, i) => ({ it, i })).filter(({ it }) => it.kind === 'delta')
  const biggest = [...deltas].sort((a, b) => Math.abs(b.it.value) - Math.abs(a.it.value))[0]
  const last = list[list.length - 1]
  const tail = biggest ? `，變化最大的是 ${biggest.it.label}（${signed(biggest.it.value)}）` : ''
  return `${name}：從 ${fmt(list[0].kind === 'delta' ? list[0].from : list[0].to)} 到 ${fmt(last.to)}${tail}。可用左右鍵逐項查看`
})

// === 提示框 ===

const hoverIndex = ref<number | null>(null)
const tooltipData = ref<WaterfallTooltip | null>(null)
const tooltipVisible = ref(false)
const liveText = ref('')

const tooltipLines = computed(() => {
  const t = tooltipData.value
  if (!t) return []
  if (props.customRenderers.tooltip) return props.customRenderers.tooltip(t)
  const lines: string[] = []
  if (t.kind === 'delta') lines.push(`${fmt(t.from)} → ${fmt(t.to)}`)
  else if (t.kind !== 'start') lines.push(t.kind === 'total' ? '總計' : '小計')
  if (t.shareOfStart !== null && t.kind !== 'start') lines.push(`佔起點 ${fmtPercent(t.kind === 'delta' ? Math.abs(t.shareOfStart) : t.shareOfStart)}`)
  return lines
})

const tooltipStyle = computed(() => {
  const t = tooltipData.value
  if (!t) return {}
  return tooltipPlacement(t.position.containerX, t.position.containerY, effectiveWidth.value, effectiveHeight.value, 180, 90)
})

function show(index: number, x: number, y: number): void {
  const changed = hoverIndex.value !== index || !tooltipVisible.value
  hoverIndex.value = index
  tooltipData.value = { ...eventOf(index), valueText: valueTextOf(index), color: colorOf(index), position: { containerX: x, containerY: y } }
  tooltipVisible.value = true
  if (changed) {
    emit('bar-hover', eventOf(index))
    emit('tooltip-show', tooltipData.value)
  }
}

function relative(event: MouseEvent): { x: number; y: number } {
  const rect = containerRef.value?.getBoundingClientRect()
  return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
}

function onEnter(index: number, event: MouseEvent): void {
  const p = relative(event)
  show(index, p.x, p.y)
}

function onMove(index: number, event: MouseEvent): void {
  const p = relative(event)
  show(index, p.x, p.y)
}

function clearHover(): void {
  if (hoverIndex.value === null && !tooltipVisible.value) return
  hoverIndex.value = null
  tooltipVisible.value = false
  emit('tooltip-hide')
}

/** 鍵盤：左右逐項、Home／End、Enter 等同點擊 */
function onKeydown(event: KeyboardEvent): void {
  const n = items.value.length
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
      if (cur !== null) emit('bar-click', eventOf(cur))
      event.preventDefault()
      return
    case 'Escape':
      clearHover()
      return
    default:
      return
  }
  event.preventDefault()
  const b = barViews.value[next]
  const headH = props.title || props.showLegend ? HEAD_H : 0
  show(next, plotLeft.value + b.cx + 12, headH + props.margin.top + b.valueY)
  const ev = eventOf(next)
  liveText.value = `${ev.label}：${valueTextOf(next)}${ev.kind === 'delta' ? `，${fmt(ev.from)} 到 ${fmt(ev.to)}` : ''}`
}

onMounted(() => {
  emit('chart-ready', { width: effectiveWidth.value, height: effectiveHeight.value })
})

defineExpose({ containerRef })
</script>

<style scoped>
.waterfall-chart {
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.wfc-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 16px;
  height: 28px;
  padding: 0 8px;
}

.wfc-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 12px;
  color: rgb(var(--t-content-secondary));
}

.wfc-legend li {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.wfc-swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.wfc-svg {
  display: block;
  overflow: visible;
  outline: none;
}

.wfc-svg:focus-visible {
  box-shadow: 0 0 0 2px rgb(var(--t-stroke-focus));
  border-radius: 4px;
}

.wfc-grid {
  stroke: rgb(var(--t-stroke-light));
  shape-rendering: crispEdges;
}

.wfc-zero {
  stroke: rgb(var(--t-stroke-medium));
  shape-rendering: crispEdges;
}

.wfc-tick {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  fill: rgb(var(--t-content-tertiary));
}

.wfc-connectors line {
  stroke: rgb(var(--t-content-tertiary));
  stroke-width: 1;
  stroke-dasharray: 3 2;
  shape-rendering: crispEdges;
}

.wfc-break {
  fill: none;
  stroke: rgb(var(--t-surface-primary));
  stroke-width: 3;
}

.wfc-hit {
  fill: transparent;
}

.wfc-bar-group {
  cursor: pointer;
}

.wfc-bar-group.is-hovered .wfc-hit {
  fill: rgb(var(--t-surface-secondary));
}

.wfc-label {
  font-size: 12px;
  fill: rgb(var(--t-content-primary));
}

/* 數值用文字色，不用長條的顏色 */
.wfc-value {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  fill: rgb(var(--t-content-secondary));
}

.wfc-value.is-total {
  font-weight: 600;
  fill: rgb(var(--t-content-primary));
}

.wfc-bar-group.is-hovered .wfc-value {
  fill: rgb(var(--t-content-primary));
}
</style>
