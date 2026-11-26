<template>
  <div class="dumbbell-chart flex flex-col gap-2" :style="props.autoResize ? { width: '100%' } : { width: `${props.width}px`, maxWidth: '100%' }">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-secondary">
      <h3 v-if="props.title" class="mr-1 text-sm font-semibold text-content-primary">{{ props.title }}</h3>
      <span class="inline-flex items-center gap-1" data-legend="before">
        <svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" :style="{ fill: chartTheme.surface, stroke: beforeColor, strokeWidth: 2 }" /></svg>
        {{ beforeName }}
      </span>
      <span class="inline-flex items-center gap-1" data-legend="after">
        <svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" :style="{ fill: props.direction === 'none' ? chartPalette.primary : chartTheme.textMuted }" /></svg>
        {{ afterName }}
      </span>
      <span v-if="props.direction !== 'none' && rows.length" class="inline-flex flex-wrap items-center gap-2" data-summary>
        <span class="inline-flex items-center gap-0.5" :style="{ color: chartTheme.success }"><span aria-hidden="true">▲</span>{{ i18n.dumbbell.better }} {{ summary.better }}</span>
        <span class="inline-flex items-center gap-0.5" :style="{ color: chartTheme.danger }"><span aria-hidden="true">▼</span>{{ i18n.dumbbell.worse }} {{ summary.worse }}</span>
        <span v-if="summary.same" class="inline-flex items-center gap-0.5"><span aria-hidden="true">=</span>{{ i18n.dumbbell.same }} {{ summary.same }}</span>
      </span>
    </div>

    <div ref="containerRef" class="relative" :style="{ height: `${chartHeight}px` }">
      <p v-if="!rows.length" class="flex h-full items-center justify-center text-sm text-content-tertiary">{{ props.emptyText ?? i18n.dumbbell.empty }}</p>
      <svg v-else :width="chartWidth" :height="chartHeight" class="block overflow-visible" role="group" :aria-label="ariaLabel" @mouseleave="hover = null">
        <!-- ===== 啞鈴 ===== -->
        <template v-if="props.mode === 'dumbbell'">
          <g aria-hidden="true">
            <g v-for="t in ticks" :key="`t${t}`">
              <line :x1="x(t)" :x2="x(t)" :y1="M.top" :y2="chartHeight - M.bottom" :style="{ stroke: chartTheme.grid }" />
              <text :x="x(t)" :y="chartHeight - M.bottom + 14" text-anchor="middle" font-size="11" :style="{ fill: chartTheme.textMuted }">{{ fmt(t) }}</text>
            </g>
            <text v-if="showChangeCol" :x="chartWidth - 4" :y="M.top - 8" text-anchor="end" font-size="11" :style="{ fill: chartTheme.textMuted }">{{ i18n.dumbbell.change }}</text>
          </g>
          <g
            v-for="(r, i) in sorted"
            :key="r.index"
            :ref="(el) => setRowEl(i, el as SVGGElement | null)"
            role="button"
            :tabindex="i === tabStop ? 0 : -1"
            :aria-label="rowAria(r)"
            class="cursor-pointer outline-none"
            :data-row="r.label"
            :style="{ opacity: dim(i) ? 0.35 : 1 }"
            @mouseenter="hover = i"
            @focus="onFocus($event, i)"
            @blur="onBlur"
            @keydown="onKey($event, i)"
            @click="emitClick(r)"
          >
            <rect :x="0" :y="rowY(i) - rowH / 2" :width="chartWidth" :height="rowH" :style="{ fill: hover === i ? chartTheme.surfaceMuted : 'transparent' }" />
            <rect v-if="kbFocus === i" :x="1" :y="rowY(i) - rowH / 2 + 1" :width="chartWidth - 2" :height="rowH - 2" rx="3" fill="none" :style="{ stroke: chartTheme.accent }" stroke-width="2" />
            <text :x="M.left - 10" :y="rowY(i)" dy="0.35em" text-anchor="end" font-size="12" :style="{ fill: chartTheme.text }">{{ shortLabel(r.label) }}</text>
            <line
              v-if="r.before !== null && r.after !== null"
              :x1="x(r.before)"
              :x2="x(r.after)"
              :y1="rowY(i)"
              :y2="rowY(i)"
              stroke-width="3"
              stroke-linecap="round"
              :style="{ stroke: lineColor(r), strokeOpacity: 0.55 }"
              data-bar
            />
            <circle v-if="r.before !== null" :cx="x(r.before)" :cy="rowY(i)" r="5" :style="{ fill: chartTheme.surface, stroke: beforeColor, strokeWidth: 2 }" data-before />
            <circle v-if="r.after !== null" :cx="x(r.after)" :cy="rowY(i)" r="6" :style="{ fill: afterColor(r), stroke: chartTheme.surface, strokeWidth: 1.5 }" data-after />
            <template v-if="props.showValues">
              <text v-if="valuePos(r, 'before', i)" v-bind="valuePos(r, 'before', i)" font-size="11" :style="{ fill: chartTheme.textMuted }" data-value>{{ fmt(r.before!) }}</text>
              <text v-if="valuePos(r, 'after', i)" v-bind="valuePos(r, 'after', i)" font-size="11" font-weight="600" :style="{ fill: chartTheme.text }" data-value>{{ fmt(r.after!) }}</text>
            </template>
            <text v-if="showChangeCol" :x="chartWidth - 4" :y="rowY(i)" dy="0.35em" text-anchor="end" font-size="11" font-weight="600" :style="{ fill: statusColor(r) }" data-change>
              {{ changeText(r) }}
            </text>
          </g>
          <g v-if="props.reference !== null" aria-hidden="true">
            <line :x1="x(props.reference)" :x2="x(props.reference)" :y1="M.top - 4" :y2="chartHeight - M.bottom" stroke-dasharray="4 3" :style="{ stroke: chartTheme.danger }" data-reference />
            <text :x="x(props.reference)" :y="M.top - 8" text-anchor="middle" font-size="11" :style="{ fill: chartTheme.danger }">{{ props.referenceLabel || fmt(props.reference) }}</text>
          </g>
        </template>

        <!-- ===== 斜率 ===== -->
        <template v-else>
          <g aria-hidden="true">
            <line v-for="sx in [slopeX0, slopeX1]" :key="sx" :x1="sx" :x2="sx" :y1="M.top" :y2="chartHeight - M.bottom" :style="{ stroke: chartTheme.axis }" />
            <text :x="slopeX0" :y="M.top - 10" text-anchor="middle" font-size="12" font-weight="600" :style="{ fill: chartTheme.text }">{{ beforeName }}</text>
            <text :x="slopeX1" :y="M.top - 10" text-anchor="middle" font-size="12" font-weight="600" :style="{ fill: chartTheme.text }">{{ afterName }}</text>
            <line
              v-if="props.reference !== null"
              :x1="slopeX0"
              :x2="slopeX1"
              :y1="y(props.reference)"
              :y2="y(props.reference)"
              stroke-dasharray="4 3"
              :style="{ stroke: chartTheme.danger }"
              data-reference
            />
          </g>
          <g
            v-for="(r, i) in sorted"
            :key="r.index"
            :ref="(el) => setRowEl(i, el as SVGGElement | null)"
            role="button"
            :tabindex="i === tabStop ? 0 : -1"
            :aria-label="rowAria(r)"
            class="cursor-pointer outline-none"
            :data-row="r.label"
            :style="{ opacity: dim(i) ? 0.2 : 1 }"
            @mouseenter="hover = i"
            @focus="onFocus($event, i)"
            @blur="onBlur"
            @keydown="onKey($event, i)"
            @click="emitClick(r)"
          >
            <line
              v-if="r.before !== null && r.after !== null"
              :x1="slopeX0"
              :x2="slopeX1"
              :y1="y(r.before)"
              :y2="y(r.after)"
              :stroke-width="hover === i || kbFocus === i ? 3.5 : 2"
              :style="{ stroke: lineColor(r) }"
              data-bar
            />
            <!-- 讓細線也好點 -->
            <line v-if="r.before !== null && r.after !== null" :x1="slopeX0" :x2="slopeX1" :y1="y(r.before)" :y2="y(r.after)" stroke-width="12" stroke="transparent" />
            <circle v-if="r.before !== null" :cx="slopeX0" :cy="y(r.before)" r="4" :style="{ fill: chartTheme.surface, stroke: beforeColor, strokeWidth: 2 }" data-before />
            <circle v-if="r.after !== null" :cx="slopeX1" :cy="y(r.after)" r="5" :style="{ fill: afterColor(r) }" data-after />
            <text v-if="r.before !== null" :x="slopeX0 - 8" :y="slopeLabels.left[i]" dy="0.35em" text-anchor="end" font-size="11" :style="{ fill: chartTheme.text }">
              {{ shortLabel(r.label) }} <tspan v-if="props.showValues" :style="{ fill: chartTheme.textMuted }">{{ fmt(r.before) }}</tspan>
            </text>
            <text v-if="r.after !== null" :x="slopeX1 + 8" :y="slopeLabels.right[i]" dy="0.35em" text-anchor="start" font-size="11" :style="{ fill: chartTheme.text }">
              <tspan v-if="props.showValues" font-weight="600">{{ fmt(r.after) }}</tspan> {{ shortLabel(r.label) }}
            </text>
          </g>
        </template>
      </svg>

      <div
        v-if="tip"
        class="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border px-2 py-1 text-xs shadow-md"
        :style="{ ...tip.style, background: chartTheme.surface, borderColor: chartTheme.border, color: chartTheme.text }"
        data-export-ignore
      >
        <div v-for="(line, i) in tip.lines" :key="i" :class="i === 0 ? 'font-medium' : 'text-content-secondary'">{{ line }}</div>
      </div>
    </div>

    <table class="sr-only">
      <caption>{{ props.title || i18n.dumbbell.title }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ i18n.dumbbell.item }}</th>
          <th scope="col">{{ beforeName }}</th>
          <th scope="col">{{ afterName }}</th>
          <th scope="col">{{ i18n.dumbbell.change }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in sorted" :key="r.index">
          <th scope="row">{{ r.label }}</th>
          <td>{{ valueText(r.before) }}</td>
          <td>{{ valueText(r.after) }}</td>
          <td>{{ changeText(r) }} {{ statusText(r) }}</td>
        </tr>
      </tbody>
    </table>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import * as d3 from 'd3'
import { chartPalette, chartTheme } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { tooltipPlacement } from './utils/tooltipPlacement'
import {
  dodgeLabels,
  dumbbellDomain,
  dumbbellRows,
  dumbbellSummary,
  sortDumbbellRows,
  type DumbbellDatum,
  type DumbbellDirection,
  type DumbbellRow,
  type DumbbellSort,
} from './utils/dumbbell'
import { useLocale } from '../shared/config'
import { clipText } from '../shared/textClip'

/**
 * DumbbellChart —— 啞鈴圖 / 斜率圖
 *
 * 用途：每個項目「前 vs 後」—— 改善前後的不良率、上月與本月的產能、目標與實際、兩條線的同一指標。
 * 一列兩個點（空心 = 前、實心 = 後），中間的線就是變化；依 direction 判斷變好（綠 ▲）或變差（紅 ▼），
 * 右側列出變化量。mode = 'slope' 改成斜率圖：左右兩條軸，每個項目一條線，看排名與趨勢交錯。
 *
 * - sort 依變化量（改善最多的在上）、變化幅度、前值、後值或名稱排序
 * - 滑過 / 鍵盤焦點：tooltip 顯示前、後、變化量與百分比，其他列淡化
 * - 鍵盤：Tab 進入後 ↑↓ 移動、Home / End、Enter 等同點擊；附隱藏的資料表給螢幕閱讀器
 */

interface DumbbellChartProps {
  data: DumbbellDatum[]
  /** 圖例與斜率圖軸上的名稱 */
  beforeLabel?: string
  afterLabel?: string
  /** 越大越好 / 越小越好 / 不判斷好壞 */
  direction?: DumbbellDirection
  /** 變化量的絕對值 ≤ 它視為持平 */
  tolerance?: number
  sort?: DumbbellSort
  /** 排序方向：true = 由大到小（change 為改善最多的在上） */
  sortDescending?: boolean
  mode?: 'dumbbell' | 'slope'
  width?: number
  /** 高度；0 = 依列數自動（啞鈴圖每列 rowHeight） */
  height?: number
  rowHeight?: number
  autoResize?: boolean
  debounceDelay?: number
  title?: string
  unit?: string
  valueFormat?: ((value: number) => string) | null
  /** 顯示數值 */
  showValues?: boolean
  /** 右側變化欄：數值、百分比或不顯示（只用於啞鈴圖） */
  showChange?: 'value' | 'percent' | 'none'
  /** 參考線（例如目標值） */
  reference?: number | null
  referenceLabel?: string
  /** 數值範圍；不給時依資料（與參考線） */
  domain?: [number, number] | null
  /** 範圍包含 0 */
  includeZero?: boolean
  emptyText?: string
}

const i18n = useLocale()
const props = withDefaults(defineProps<DumbbellChartProps>(), {
  beforeLabel: '',
  afterLabel: '',
  direction: 'higher',
  tolerance: 0,
  sort: 'none',
  sortDescending: true,
  mode: 'dumbbell',
  width: 640,
  height: 0,
  rowHeight: 28,
  autoResize: false,
  debounceDelay: 100,
  title: '',
  unit: '',
  valueFormat: null,
  showValues: true,
  showChange: 'value',
  reference: null,
  referenceLabel: '',
  domain: null,
  includeZero: false,
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'item-click', row: DumbbellRow): void
  (e: 'chart-resize', size: { width: number; height: number }): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const { effectiveWidth, effectiveHeight } = useAutoResize(containerRef, props, (size) => emit('chart-resize', size))
const beforeName = computed(() => props.beforeLabel || i18n.value.dumbbell.before)
const afterName = computed(() => props.afterLabel || i18n.value.dumbbell.after)

// ---- 資料 ----
const rows = computed(() => dumbbellRows(props.data, props.direction, props.tolerance))
const sorted = computed(() => sortDumbbellRows(rows.value, props.sort, props.direction, props.sortDescending))
const summary = computed(() => dumbbellSummary(rows.value))

// ---- 尺寸 ----
const chartWidth = computed(() => Math.max(160, effectiveWidth.value))
const showChangeCol = computed(() => props.mode === 'dumbbell' && props.showChange !== 'none')
/** 名稱欄寬：依最長的名稱估計（寬字元算 2），最多佔 35% */
const labelUnits = (s: string) => [...s].reduce((n, ch) => n + (ch.charCodeAt(0) < 256 ? 1 : 2), 0)
const labelW = computed(() => {
  const longest = d3.max(sorted.value, (r) => labelUnits(r.label)) ?? 4
  return Math.min(chartWidth.value * (props.mode === 'slope' ? 0.28 : 0.35), Math.max(48, longest * 6.5 + 12))
})
const M = computed(() =>
  props.mode === 'dumbbell'
    ? { top: 22, bottom: 22, left: labelW.value + 10, right: showChangeCol.value ? 64 : 20 }
    : { top: 28, bottom: 12, left: 8, right: 8 }
)
const autoHeight = computed(() =>
  props.mode === 'dumbbell' ? M.value.top + M.value.bottom + Math.max(1, sorted.value.length) * props.rowHeight : Math.max(220, sorted.value.length * 18 + 60)
)
const chartHeight = computed(() => (props.height > 0 ? (props.autoResize ? effectiveHeight.value : props.height) : autoHeight.value))

// ---- 比例尺 ----
const dom = computed<[number, number]>(() => {
  if (props.domain) return props.domain
  const extra = [...(props.reference !== null ? [props.reference] : []), ...(props.includeZero ? [0] : [])]
  return dumbbellDomain(rows.value, extra)
})
const xScale = computed(() => d3.scaleLinear().domain(dom.value).range([M.value.left, chartWidth.value - M.value.right]).nice())
const x = (v: number) => xScale.value(v)
const ticks = computed(() => xScale.value.ticks(Math.max(2, Math.floor((chartWidth.value - M.value.left - M.value.right) / 80))))
const rowH = computed(() => (chartHeight.value - M.value.top - M.value.bottom) / Math.max(1, sorted.value.length))
const rowY = (i: number) => M.value.top + rowH.value * (i + 0.5)

const slopeX0 = computed(() => M.value.left + labelW.value + 40)
const slopeX1 = computed(() => chartWidth.value - M.value.right - labelW.value - 40)
const yScale = computed(() => d3.scaleLinear().domain(dom.value).range([chartHeight.value - M.value.bottom - 6, M.value.top + 6]))
const y = (v: number) => yScale.value(v)
const slopeLabels = computed(() => {
  const top = M.value.top
  const bottom = chartHeight.value - M.value.bottom
  const side = (key: 'before' | 'after') => {
    const pos = sorted.value.map((r) => (r[key] === null ? NaN : y(r[key]!)))
    const valid = pos.map((p, i) => ({ p, i })).filter((o) => !Number.isNaN(o.p))
    const dodged = dodgeLabels(
      valid.map((o) => o.p),
      13,
      top,
      bottom
    )
    const out: number[] = new Array(pos.length).fill(0)
    valid.forEach((o, k) => (out[o.i] = dodged[k]))
    return out
  }
  return { left: side('before'), right: side('after') }
})

// ---- 顏色與文字 ----
const beforeColor = computed(() => chartTheme.textMuted)
function statusColor(r: DumbbellRow): string {
  if (r.status === 'better') return chartPalette.good
  if (r.status === 'worse') return chartPalette.critical
  return chartTheme.textMuted
}
const lineColor = (r: DumbbellRow) => (r.status === 'neutral' ? r.color ?? chartPalette.primary : statusColor(r))
const afterColor = (r: DumbbellRow) => r.color ?? (r.status === 'neutral' ? chartPalette.primary : statusColor(r))
const defaultFormat = d3.format(',~f')
const fmt = (v: number) => (props.valueFormat ? props.valueFormat(v) : defaultFormat(Number(v.toPrecision(6))))
const withUnit = (s: string) => (props.unit ? `${s} ${props.unit}` : s)
const valueText = (v: number | null) => (v === null ? i18n.value.dumbbell.noValue : withUnit(fmt(v)))
const signed = (s: string, v: number) => (v > 0 ? `+${s}` : s)
function pctText(r: DumbbellRow): string {
  return r.pct === null ? '' : `${signed(d3.format('.1f')(r.pct * 100), r.pct)}%`
}
function changeText(r: DumbbellRow): string {
  if (r.delta === null) return i18n.value.dumbbell.noValue
  const icon = r.status === 'better' ? '▲' : r.status === 'worse' ? '▼' : ''
  const body = props.showChange === 'percent' ? pctText(r) || signed(fmt(r.delta), r.delta) : signed(fmt(r.delta), r.delta)
  return `${icon}${body}`
}
function statusText(r: DumbbellRow): string {
  const s = i18n.value.dumbbell
  return r.status === 'better' ? s.better : r.status === 'worse' ? s.worse : r.status === 'same' ? s.same : ''
}
/** 值的位置：前值放在遠離後值的一側；會壓到名稱欄或變化欄時不顯示（tooltip 仍有） */
function valuePos(r: DumbbellRow, which: 'before' | 'after', i: number) {
  const v = r[which]
  if (v === null) return null
  const other = which === 'before' ? r.after : r.before
  const left = other === null ? which === 'before' : which === 'before' ? v <= other : v < other
  const tx = x(v) + (left ? -9 : 9)
  const w = fmt(v).length * 6.5
  if (left ? tx - w < M.value.left - 4 : tx + w > chartWidth.value - M.value.right + 4) return null
  return { x: tx, y: rowY(i), dy: '0.35em', 'text-anchor': left ? 'end' : 'start' }
}
function shortLabel(s: string): string {
  return clipText(s, labelW.value - 4, { min: 3 })
}
function tipLines(r: DumbbellRow): string[] {
  const s = i18n.value.dumbbell
  const lines = [r.label, s.pair(beforeName.value, valueText(r.before)), s.pair(afterName.value, valueText(r.after))]
  if (r.delta !== null) lines.push(s.pair(s.change, [withUnit(signed(fmt(r.delta), r.delta)), pctText(r) && `(${pctText(r)})`, statusText(r)].filter(Boolean).join(' ')))
  return lines
}
const rowAria = (r: DumbbellRow) => tipLines(r).join(i18n.value.dumbbell.separator)
const ariaLabel = computed(() => {
  const s = i18n.value.dumbbell
  const sum = summary.value
  return s.ariaLabel(props.title || s.title, rows.value.length, props.direction === 'none' ? '' : s.summary(sum.better, sum.worse, sum.same))
})

// ---- 互動 ----
const hover = ref<number | null>(null)
const kbFocus = ref<number | null>(null)
const focusIndex = ref(0)
const tabStop = computed(() => Math.min(focusIndex.value, Math.max(0, sorted.value.length - 1)))
const dim = (i: number) => hover.value !== null && hover.value !== i
const tip = computed(() => {
  const i = hover.value
  const r = i === null ? undefined : sorted.value[i]
  if (!r) return null
  let px: number
  let py: number
  if (props.mode === 'dumbbell') {
    px = x(Math.max(r.before ?? -Infinity, r.after ?? -Infinity))
    py = rowY(i!)
  } else {
    px = (slopeX0.value + slopeX1.value) / 2
    py = y(((r.before ?? r.after!) + (r.after ?? r.before!)) / 2)
  }
  return { lines: tipLines(r), style: tooltipPlacement(px, py, chartWidth.value, chartHeight.value, 200, 80) }
})
const announcement = ref('')
const rowEls = new Map<number, SVGGElement>()
function setRowEl(i: number, el: SVGGElement | null): void {
  if (el) rowEls.set(i, el)
  else rowEls.delete(i)
}
function onFocus(e: FocusEvent, i: number): void {
  focusIndex.value = i
  kbFocus.value = (e.currentTarget as Element).matches?.(':focus-visible') ? i : null
  hover.value = i
  announcement.value = rowAria(sorted.value[i])
}
function onBlur(): void {
  kbFocus.value = null
  hover.value = null
}
function onKey(e: KeyboardEvent, i: number): void {
  const n = sorted.value.length
  let next: number | null = null
  if (e.key === 'ArrowDown') next = Math.min(n - 1, i + 1)
  else if (e.key === 'ArrowUp') next = Math.max(0, i - 1)
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = n - 1
  else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emitClick(sorted.value[i])
    return
  } else if (e.key === 'Escape') {
    hover.value = null
    return
  } else return
  e.preventDefault()
  focusIndex.value = next
  void nextTick(() => rowEls.get(next!)?.focus())
}
function emitClick(r: DumbbellRow): void {
  emit('item-click', r)
}

defineExpose({
  /** 排序後的列（含變化量與好壞） */
  rows: () => sorted.value,
  /** 改善 / 變差 / 持平的數量與平均變化 */
  summary: () => summary.value,
})
</script>
