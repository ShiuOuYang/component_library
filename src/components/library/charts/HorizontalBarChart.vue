<template>
  <div ref="containerRef" class="horizontal-bar-chart" :style="containerStyle">
    <p v-if="title" class="hbc-title text-sm font-semibold text-content-primary">{{ title }}</p>

    <svg
      class="hbc-svg"
      :width="effectiveWidth"
      :height="svgHeight"
      role="list"
      :aria-label="ariaSummary"
    >
      <!-- 數值軸（選用）與格線：髮絲線、實線、退到背景 -->
      <g v-if="showAxis" class="hbc-axis" :transform="`translate(0, ${rowsTop + rowsHeight})`" aria-hidden="true">
        <g v-for="t in axisTicks" :key="t.value">
          <line v-if="showGrid" class="hbc-grid" :x1="t.x" :x2="t.x" :y1="-rowsHeight" :y2="0" />
          <text class="hbc-tick" :x="t.x" :y="16" text-anchor="middle">{{ t.label }}</text>
        </g>
      </g>

      <!-- 基線（有負值時才看得出需要；全是正值時就是長條的起點） -->
      <line
        v-if="items.length"
        class="hbc-baseline"
        :x1="baselineX" :x2="baselineX" :y1="rowsTop" :y2="rowsTop + rowsHeight"
        aria-hidden="true"
      />

      <!-- 參考線（例如目標值）：畫在長條底下，不會蓋住數值 -->
      <g v-for="(line, i) in referenceViews" :key="`ref-${i}`" class="hbc-reference" aria-hidden="true">
        <line :x1="line.x" :x2="line.x" :y1="rowsTop - 4" :y2="rowsTop + rowsHeight" :style="{ stroke: line.color }" />
        <text v-if="line.label" :x="line.x" :y="rowsTop - 8" text-anchor="middle">{{ line.label }}</text>
      </g>

      <g
        v-for="row in rows"
        :key="row.item.key"
        class="hbc-row"
        :class="{ 'is-hovered': hoverKey === row.item.key, 'is-dimmed': row.dimmed }"
        role="listitem"
        :tabindex="enableTooltip ? 0 : undefined"
        :aria-label="row.ariaLabel"
        :data-key="row.item.key"
        @mouseenter="onRowEnter(row, $event)"
        @mousemove="onRowMove(row, $event)"
        @mouseleave="clearHover"
        @focus="onRowFocus(row)"
        @blur="clearHover"
        @click="onRowClick(row)"
      >
        <!-- 整列都是滑鼠目標（比長條大，短長條也點得到） -->
        <rect class="hbc-hit" x="0" :y="row.bandY" :width="effectiveWidth" :height="row.bandH" />
        <text
          class="hbc-label"
          :x="labelRight"
          :y="row.cy"
          text-anchor="end"
          dominant-baseline="central"
        >
          <title>{{ row.item.label }}</title>{{ row.labelText }}
        </text>
        <path class="hbc-bar" :d="row.path" :style="{ fill: row.color }" />
        <text
          v-if="showValues"
          class="hbc-value"
          :x="row.valueX"
          :y="row.cy"
          :text-anchor="row.item.value < 0 ? 'end' : 'start'"
          dominant-baseline="central"
        >{{ row.valueText }}</text>
      </g>

    </svg>

    <p v-if="!items.length" class="absolute inset-0 flex items-center justify-center text-sm text-content-tertiary">
      {{ emptyText }}
    </p>

    <!-- Tooltip：數值在前（主角），名稱在後 -->
    <slot name="tooltip" :tooltip-data="tooltipData" :tooltip-visible="tooltipVisible">
      <div
        v-if="tooltipVisible && tooltipData && enableTooltip"
        class="pointer-events-none absolute z-30 min-w-28 rounded-md border border-stroke-light bg-surface-primary px-2.5 py-1.5 text-xs shadow-lg"
        role="tooltip"
        :style="tooltipStyle"
      >
        <div class="flex items-center gap-1.5">
          <span class="h-0.5 w-3 rounded-full" :style="{ background: tooltipData.color }" aria-hidden="true"></span>
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
import { chartPalette, chartTheme } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { estimateTextWidth } from './utils/chartText'
import { barPath, prepareRanking, truncateText, type RankItem } from './utils/horizontalBar'
import { tooltipPlacement } from './utils/tooltipPlacement'

/**
 * HorizontalBarChart —— 水平長條圖（排行榜）
 *
 * - 不良原因 Top 10、機台產量排名、客戶出貨量…：類別名稱橫向排開，再長也讀得完整
 * - 預設由大到小排序；topN 只取前幾名，showOthers 把其餘併成「其他」
 * - 數值標在長條末端（預留了空間，不會被裁掉）；也可以改用數值軸
 * - highlightKey：強調一列，其餘轉灰（「這一項」才是重點時用）
 * - 負值從基線往左長
 */

/** 列的事件 payload */
export interface HorizontalBarEvent {
  /** 原始資料；「其他」為 null */
  datum: Record<string, unknown> | null
  key: string
  label: string
  value: number
  /** 第幾名（從 1 開始；「其他」為 null） */
  rank: number | null
  /** 佔總數的比例（0～1；有負值時為 null） */
  share: number | null
  isOthers: boolean
  /** 併進「其他」的原始資料 */
  members: Record<string, unknown>[]
}

/** 提示框的資料 */
export interface HorizontalBarTooltip extends HorizontalBarEvent {
  valueText: string
  color: string
  position: { containerX: number; containerY: number }
}

/** 參考線（例如目標值） */
export interface HorizontalBarReferenceLine {
  value: number
  label?: string
  color?: string
}

type Row = Record<string, unknown>

interface HorizontalBarChartProps {
  // === 基礎配置 ===
  width?: number
  height?: number
  /** 跟著容器寬度調整（容器需有高度；autoHeight 時只跟寬度） */
  autoResize?: boolean
  /** 高度依列數撐開（每列 rowHeight），忽略 height */
  autoHeight?: boolean
  /** ResizeObserver 防抖延遲（毫秒） */
  debounceDelay?: number
  margin?: { top: number; right: number; bottom: number; left: number }

  // === 數據配置 ===
  data: Row[]

  // === 欄位映射（支援任意資料結構）===
  labelField?: string
  valueField?: string
  /** 資料鍵的欄位（highlightKey、事件的 key）；沒有時用名稱 */
  keyField?: string
  keyFn?: ((datum: Row, index: number) => string) | null

  // === 排序與分組 ===
  sort?: 'desc' | 'asc' | 'none'
  /** 只顯示前 N 名 */
  topN?: number | null
  /** 把前 N 名以外的併成一列 */
  showOthers?: boolean
  othersLabel?: string

  // === 軸配置 ===
  /** 數值範圍；未指定時 [min(0, 最小值), max(0, 最大值)] */
  valueDomain?: [number, number] | null
  /** 數值格式（長條末端、提示框） */
  valueFormat?: ((value: number) => string) | null
  /** 顯示底部數值軸 */
  showAxis?: boolean
  /** 數值軸的格線（showAxis 時） */
  showGrid?: boolean

  // === 版面配置 ===
  /** 左側名稱欄寬；未指定時依最長的名稱（最多圖寬的 40%） */
  labelWidth?: number | null
  /** 長條粗細（px，最多 24：細長條比粗色塊好讀） */
  barThickness?: number
  /** autoHeight 時每列高度 */
  rowHeight?: number

  // === 視覺配置 ===
  title?: string
  /** 長條顏色；未指定時用類別色第 1 號 */
  color?: string | null
  /** 在長條末端標出數值 */
  showValues?: boolean
  /** 數值後面加上佔總數的比例 */
  showPercent?: boolean
  /** 名稱前加上名次 */
  showRank?: boolean
  /** 參考線（例如目標值） */
  referenceLines?: HorizontalBarReferenceLine[]
  emptyText?: string

  // === 互動配置 ===
  enableTooltip?: boolean
  /** 強調這一列，其餘轉灰 */
  highlightKey?: string | number | null

  // === 企業級擴展點 ===
  customRenderers?: {
    /** 自訂長條顏色（回傳 null 用預設） */
    barColor?: (datum: Row | null, item: HorizontalBarEvent) => string | null | undefined
    /** 自訂末端的數值文字 */
    valueLabel?: (datum: Row | null, item: HorizontalBarEvent) => string
    /** 自訂提示框內容（每行一個字串，數值與名稱之下） */
    tooltip?: (datum: Row | null, item: HorizontalBarEvent) => string[]
  }
}

const props = withDefaults(defineProps<HorizontalBarChartProps>(), {
  width: 560,
  height: 320,
  autoResize: false,
  autoHeight: false,
  debounceDelay: 150,
  margin: () => ({ top: 8, right: 16, bottom: 8, left: 8 }),
  labelField: 'label',
  valueField: 'value',
  keyField: 'id',
  keyFn: null,
  sort: 'desc',
  topN: null,
  showOthers: false,
  othersLabel: '其他',
  valueDomain: null,
  valueFormat: null,
  showAxis: false,
  showGrid: true,
  labelWidth: null,
  barThickness: 20,
  rowHeight: 32,
  title: '',
  color: null,
  showValues: true,
  showPercent: false,
  showRank: false,
  referenceLines: () => [],
  emptyText: '沒有資料',
  enableTooltip: true,
  highlightKey: null,
  customRenderers: () => ({}),
})

const emit = defineEmits<{
  'chart-ready': [payload: { width: number; height: number }]
  'chart-resize': [payload: { width: number; height: number }]
  'bar-hover': [payload: HorizontalBarEvent]
  'bar-click': [payload: HorizontalBarEvent]
  'tooltip-show': [payload: HorizontalBarTooltip]
  'tooltip-hide': []
}>()

const containerRef = ref<HTMLDivElement | null>(null)

const { effectiveWidth, effectiveHeight } = useAutoResize(containerRef, props, (size) => emit('chart-resize', size))

// === 資料 ===

const prepared = computed(() =>
  prepareRanking(props.data ?? [], {
    labelField: props.labelField,
    valueField: props.valueField,
    keyField: props.keyField,
    keyFn: props.keyFn,
    sort: props.sort,
    topN: props.topN,
    showOthers: props.showOthers,
    othersLabel: props.othersLabel,
  })
)
const items = computed<RankItem[]>(() => prepared.value.items)

/** 佔比的分母：全部資料（含 topN 以外的）；有負值時佔比沒有意義 */
const total = computed(() => {
  let sum = 0
  for (const d of props.data ?? []) {
    const v = Number(d?.[props.valueField])
    if (!Number.isFinite(v)) continue
    if (v < 0) return null
    sum += v
  }
  return sum > 0 ? sum : null
})

const defaultFormat = d3.format(',~f')
const fmt = (v: number) => (props.valueFormat ?? defaultFormat)(v)
const fmtPercent = d3.format('.1%')

/** 事件送出原始物件（不是 Vue 的響應式代理），呼叫端才能用 === 比對自己的資料 */
function eventOf(item: RankItem, index: number): HorizontalBarEvent {
  return {
    datum: item.datum ? toRaw(item.datum) : null,
    key: item.key,
    label: item.label,
    value: item.value,
    rank: item.isOthers ? null : index + 1,
    share: total.value === null ? null : item.value / total.value,
    isOthers: item.isOthers,
    members: item.members.map((m) => toRaw(m)),
  }
}

function valueTextOf(item: RankItem, ev: HorizontalBarEvent): string {
  if (props.customRenderers.valueLabel) return props.customRenderers.valueLabel(item.datum, ev)
  const base = fmt(item.value)
  return props.showPercent && ev.share !== null ? `${base}（${fmtPercent(ev.share)}）` : base
}

// === 版面 ===

const TITLE_H = 24
const AXIS_H = 24
/** 有參考線時，上方留一行放參考線的文字 */
const referenceTop = computed(() => (props.referenceLines.length ? 18 : 0))

const rowsTop = computed(() => props.margin.top + referenceTop.value)

const rowsHeight = computed(() => {
  if (props.autoHeight) return items.value.length * props.rowHeight
  const chrome = props.margin.top + props.margin.bottom + referenceTop.value + (props.title ? TITLE_H : 0) + (props.showAxis ? AXIS_H : 0)
  return Math.max(0, effectiveHeight.value - chrome)
})

const svgHeight = computed(() => rowsTop.value + rowsHeight.value + (props.showAxis ? AXIS_H : 0) + props.margin.bottom)

const containerStyle = computed(() => {
  const height = props.autoHeight ? 'auto' : props.autoResize ? '100%' : `${props.height}px`
  return { width: props.autoResize ? '100%' : `${props.width}px`, height }
})

const labelPrefix = (i: number, item: RankItem) => (props.showRank && !item.isOthers ? `${i + 1}. ` : '')

/** 名稱欄寬：依最長的名稱，最多圖寬的 40% */
const labelColumn = computed(() => {
  if (props.labelWidth !== null) return props.labelWidth
  let max = 0
  items.value.forEach((it, i) => {
    max = Math.max(max, estimateTextWidth(labelPrefix(i, it) + it.label, 12))
  })
  return Math.min(Math.max(48, Math.ceil(max) + 12), Math.floor(effectiveWidth.value * 0.4))
})

/** 名稱文字的右緣 */
const labelRight = computed(() => props.margin.left + labelColumn.value - 8)

/** 數值文字要預留的寬度（長條末端外面；不夠放就被裁掉是最糟的情況） */
const valueSpace = computed(() => {
  if (!props.showValues) return { pos: 0, neg: 0 }
  let pos = 0
  let neg = 0
  items.value.forEach((it, i) => {
    const w = estimateTextWidth(valueTextOf(it, eventOf(it, i)), 12) + 8
    if (it.value < 0) neg = Math.max(neg, w)
    else pos = Math.max(pos, w)
  })
  return { pos, neg }
})

const domain = computed<[number, number]>(() => {
  if (props.valueDomain) return props.valueDomain
  let lo = 0
  let hi = 0
  for (const it of items.value) {
    lo = Math.min(lo, it.value)
    hi = Math.max(hi, it.value)
  }
  // 🔧 全部是 0（或沒有資料）時給一個範圍，比例尺才不會壞
  return lo === hi ? [0, 1] : [lo, hi]
})

const xScale = computed(() => {
  const left = props.margin.left + labelColumn.value + valueSpace.value.neg
  const right = effectiveWidth.value - props.margin.right - valueSpace.value.pos
  return d3.scaleLinear().domain(domain.value).range([left, Math.max(left, right)])
})

const baselineX = computed(() => xScale.value(Math.min(Math.max(0, domain.value[0]), domain.value[1])))

const highlightTarget = computed(() => {
  const k = props.highlightKey
  return k === null || k === undefined || k === '' ? null : String(k)
})

interface RowView {
  item: RankItem
  index: number
  bandY: number
  bandH: number
  cy: number
  path: string
  color: string
  dimmed: boolean
  labelText: string
  valueText: string
  valueX: number
  ariaLabel: string
}

const rows = computed<RowView[]>(() => {
  const n = items.value.length
  if (!n) return []
  const band = rowsHeight.value / n
  // 長條最粗 24px，而且上下至少留 2px 縫：細長條比塞滿的色塊好讀
  const thickness = Math.max(1, Math.min(props.barThickness, 24, band - 4))
  const xs = xScale.value
  const x0 = baselineX.value
  const hasHighlight = highlightTarget.value !== null && items.value.some((it) => it.key === highlightTarget.value)
  const labelMax = labelColumn.value - 12
  return items.value.map((item, i) => {
    const ev = eventOf(item, i)
    const bandY = rowsTop.value + i * band
    const cy = bandY + band / 2
    const x1 = xs(Math.min(Math.max(item.value, domain.value[0]), domain.value[1]))
    const custom = props.customRenderers.barColor?.(item.datum, ev)
    const base = custom || (item.isOthers ? chartPalette.other : props.color || chartPalette.primary)
    const dimmed = hasHighlight && item.key !== highlightTarget.value
    const valueText = valueTextOf(item, ev)
    const label = labelPrefix(i, item) + item.label
    return {
      item,
      index: i,
      bandY,
      bandH: band,
      cy,
      path: barPath(x0, x1, cy - thickness / 2, thickness),
      color: dimmed ? chartPalette.muted : base,
      dimmed,
      labelText: truncateText(label, labelMax, (s) => estimateTextWidth(s, 12)),
      valueText,
      valueX: item.value < 0 ? x1 - 6 : x1 + 6,
      ariaLabel: `${label}：${valueText}`,
    }
  })
})

const compact = d3.format('~s')

const axisTicks = computed(() => {
  const xs = xScale.value
  const [r0, r1] = xs.range()
  const count = Math.max(2, Math.floor((r1 - r0) / 80))
  return xs.ticks(count).map((v) => ({ value: v, x: xs(v), label: Math.abs(v) >= 1000 ? compact(v) : fmt(v) }))
})

const referenceViews = computed(() =>
  props.referenceLines
    .filter((l) => Number.isFinite(l.value))
    .map((l) => ({
      x: xScale.value(Math.min(Math.max(l.value, domain.value[0]), domain.value[1])),
      label: l.label ?? fmt(l.value),
      color: l.color ?? chartTheme.textMuted,
    }))
)

const ariaSummary = computed(() => {
  const name = props.title || '水平長條圖'
  const first = items.value[0]
  return first ? `${name}：共 ${items.value.length} 項，第一名 ${first.label} ${fmt(first.value)}` : `${name}：沒有資料`
})

// === 提示框 ===

const hoverKey = ref<string | null>(null)
const tooltipData = ref<HorizontalBarTooltip | null>(null)
const tooltipVisible = ref(false)

const tooltipLines = computed(() => {
  const t = tooltipData.value
  if (!t) return []
  if (props.customRenderers.tooltip) return props.customRenderers.tooltip(t.datum, t)
  const lines: string[] = []
  if (t.rank !== null) lines.push(`第 ${t.rank} 名`)
  if (t.share !== null) lines.push(`佔總數 ${fmtPercent(t.share)}`)
  if (t.isOthers) lines.push(`合計 ${t.members.length} 項`)
  return lines
})

const tooltipStyle = computed(() => {
  const t = tooltipData.value
  if (!t) return {}
  return tooltipPlacement(t.position.containerX, t.position.containerY, effectiveWidth.value, svgHeight.value, 180, 90)
})

function showTooltip(row: RowView, x: number, y: number): void {
  const ev = eventOf(row.item, row.index)
  tooltipData.value = { ...ev, valueText: row.valueText, color: row.color, position: { containerX: x, containerY: y } }
  tooltipVisible.value = true
}

function enter(row: RowView, x: number, y: number): void {
  hoverKey.value = row.item.key
  showTooltip(row, x, y)
  emit('bar-hover', eventOf(row.item, row.index))
  if (tooltipData.value) emit('tooltip-show', tooltipData.value)
}

function pointerPosition(event: MouseEvent): { x: number; y: number } {
  const rect = containerRef.value?.getBoundingClientRect()
  return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
}

function onRowEnter(row: RowView, event: MouseEvent): void {
  const p = pointerPosition(event)
  enter(row, p.x, p.y)
}

function onRowMove(row: RowView, event: MouseEvent): void {
  const p = pointerPosition(event)
  if (hoverKey.value !== row.item.key) enter(row, p.x, p.y)
  else showTooltip(row, p.x, p.y)
}

/** 鍵盤聚焦：提示框放在長條末端（與滑鼠看到的一樣） */
function onRowFocus(row: RowView): void {
  enter(row, row.valueX, row.cy)
}

function clearHover(): void {
  if (hoverKey.value === null) return
  hoverKey.value = null
  tooltipVisible.value = false
  emit('tooltip-hide')
}

function onRowClick(row: RowView): void {
  emit('bar-click', eventOf(row.item, row.index))
}

onMounted(() => {
  emit('chart-ready', { width: effectiveWidth.value, height: svgHeight.value })
})

defineExpose({ containerRef })
</script>

<style scoped>
.horizontal-bar-chart {
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.hbc-title {
  height: 24px;
  line-height: 24px;
  padding: 0 8px;
}

.hbc-svg {
  display: block;
  overflow: visible;
}

.hbc-hit {
  fill: transparent;
}

.hbc-row {
  cursor: pointer;
  outline: none;
}

.hbc-row.is-hovered .hbc-hit,
.hbc-row:focus-visible .hbc-hit {
  fill: rgb(var(--t-surface-secondary));
}

.hbc-row:focus-visible .hbc-bar {
  stroke: rgb(var(--t-stroke-focus));
  stroke-width: 2;
}

.hbc-label {
  font-size: 12px;
  fill: rgb(var(--t-content-primary));
}

.hbc-row.is-dimmed .hbc-label {
  fill: rgb(var(--t-content-tertiary));
}

/* 數值用文字色，不用長條的顏色（淺色長條的顏色當文字看不清楚） */
.hbc-value {
  font-size: 12px;
  /* 背景色的外框：壓在參考線上也看得清楚 */
  paint-order: stroke;
  stroke: rgb(var(--t-surface-primary));
  stroke-width: 3px;
  stroke-linejoin: round;
  font-variant-numeric: tabular-nums;
  fill: rgb(var(--t-content-secondary));
}

.hbc-row.is-hovered .hbc-value {
  fill: rgb(var(--t-content-primary));
  font-weight: 600;
}

.hbc-baseline {
  stroke: rgb(var(--t-stroke-medium));
  shape-rendering: crispEdges;
}

.hbc-grid {
  stroke: rgb(var(--t-stroke-light));
  shape-rendering: crispEdges;
}

.hbc-tick {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  fill: rgb(var(--t-content-tertiary));
}

.hbc-reference line {
  stroke-width: 1.5;
  stroke-dasharray: 4 3;
}

.hbc-reference text {
  font-size: 11px;
  fill: rgb(var(--t-content-secondary));
}
</style>
