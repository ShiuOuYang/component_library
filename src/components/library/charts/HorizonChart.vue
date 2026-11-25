<template>
  <div class="horizon-chart flex flex-col gap-2" :style="props.autoResize ? { width: '100%' } : { width: `${props.width}px`, maxWidth: '100%' }">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-content-secondary">
      <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
      <span class="inline-flex items-center gap-1" data-legend="above">
        <span class="inline-flex" aria-hidden="true"><span v-for="b in props.bands" :key="b" class="h-2.5 w-2.5" :style="{ background: bandColor(1, b - 1) }" /></span>
        {{ i18n.horizon.above }}
      </span>
      <span class="inline-flex items-center gap-1" data-legend="below">
        <span class="inline-flex" aria-hidden="true"><span v-for="b in props.bands" :key="b" class="h-2.5 w-2.5" :style="{ background: bandColor(-1, b - 1) }" /></span>
        {{ i18n.horizon.below }}
      </span>
      <span v-if="rows.length">{{ props.scale === 'shared' ? i18n.horizon.perBand(fmtValue(sharedBand)) : i18n.horizon.perRow }}</span>
    </div>

    <div ref="containerRef" class="relative" :style="{ height: `${chartHeight}px` }">
      <p v-if="!rows.length" class="flex h-full items-center justify-center text-sm text-content-tertiary">{{ props.emptyText ?? i18n.horizon.empty }}</p>
      <svg
        v-else
        :width="chartWidth"
        :height="chartHeight"
        class="block overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
        role="group"
        tabindex="0"
        :aria-label="ariaLabel"
        :aria-describedby="`${uid}-hint`"
        @pointermove="onPointer"
        @pointerleave="onLeave"
        @keydown="onKey"
        @blur="kbActive = false"
      >
        <defs>
          <clipPath :id="`${uid}-clip`"><rect :x="plotLeft" :y="0" :width="plotWidth" :height="chartHeight" /></clipPath>
        </defs>
        <!-- 時間刻度 -->
        <g aria-hidden="true">
          <g v-for="tk in ticks" :key="tk">
            <line :x1="x(tk)" :x2="x(tk)" :y1="M.top" :y2="axisY" :style="{ stroke: chartTheme.grid }" />
            <text :x="x(tk)" :y="axisY + 14" text-anchor="middle" font-size="11" :style="{ fill: chartTheme.textMuted }">{{ fmtTick(tk) }}</text>
          </g>
        </g>

        <g
          v-for="(r, i) in ordered"
          :key="r.index"
          :transform="`translate(0, ${rowTop(i)})`"
          :data-row="r.name"
          :style="{ opacity: activeRow !== null && activeRow !== i ? 0.45 : 1 }"
          class="cursor-pointer"
          @pointerenter="activeRow = i"
          @click="emit('row-click', r)"
        >
          <rect :x="plotLeft" :y="0" :width="plotWidth" :height="props.rowHeight" :style="{ fill: chartTheme.surfaceMuted }" />
          <g :clip-path="`url(#${uid}-clip)`">
            <template v-for="side in ([1, -1] as const)" :key="side">
              <path v-for="b in props.bands" :key="b" :d="bandPath(r, side, b - 1)" :style="{ fill: bandColor(side, b - 1) }" :data-band="`${side > 0 ? 'p' : 'n'}${b - 1}`" />
            </template>
          </g>
          <text :x="plotLeft - 8" :y="props.rowHeight / 2" dy="0.35em" text-anchor="end" font-size="12" :style="{ fill: chartTheme.text }">{{ shortLabel(r.name) }}</text>
          <text
            v-if="props.showValues && readout(r)"
            :x="chartWidth - 4"
            :y="props.rowHeight / 2"
            dy="0.35em"
            text-anchor="end"
            font-size="11"
            font-weight="600"
            :style="{ fill: readout(r)!.color }"
            data-readout
          >
            {{ readout(r)!.text }}
          </text>
          <rect v-if="kbActive && activeRow === i" :x="plotLeft - 1" :y="-1" :width="plotWidth + 2" :height="props.rowHeight + 2" fill="none" :style="{ stroke: chartTheme.accent }" stroke-width="2" />
        </g>

        <!-- 十字線 -->
        <line v-if="crossT !== null && inDomain(crossT)" :x1="x(crossT)" :x2="x(crossT)" :y1="M.top - 2" :y2="axisY" :style="{ stroke: chartTheme.text }" stroke-width="1" pointer-events="none" data-crosshair />
      </svg>

      <div
        v-if="tip"
        class="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border px-2 py-1 text-xs shadow-md"
        :style="{ ...tip.style, background: chartTheme.surface, borderColor: chartTheme.border, color: chartTheme.text }"
        data-export-ignore
      >
        <div v-for="(line, k) in tip.lines" :key="k" :class="k === 0 ? 'font-medium' : 'text-content-secondary'">{{ line }}</div>
      </div>
    </div>

    <table class="sr-only">
      <caption>{{ props.title || i18n.horizon.title }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ i18n.horizon.colName }}</th>
          <th scope="col">{{ i18n.horizon.colBaseline }}</th>
          <th scope="col">{{ i18n.horizon.colMin }}</th>
          <th scope="col">{{ i18n.horizon.colMax }}</th>
          <th scope="col">{{ i18n.horizon.colMean }}</th>
          <th scope="col">{{ i18n.horizon.colLast }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in ordered" :key="r.index">
          <th scope="row">{{ r.name }}</th>
          <td>{{ fmtValue(r.baseline, r.unit) }}</td>
          <template v-if="r.stats">
            <td>{{ fmtValue(r.stats.min, r.unit) }}</td>
            <td>{{ fmtValue(r.stats.max, r.unit) }}</td>
            <td>{{ fmtValue(r.stats.mean, r.unit) }}</td>
            <td>{{ r.stats.last === null ? i18n.horizon.noData : fmtValue(r.stats.last, r.unit) }}</td>
          </template>
          <td v-else colspan="4">{{ i18n.horizon.noData }}</td>
        </tr>
      </tbody>
    </table>
    <p :id="`${uid}-hint`" class="sr-only">{{ i18n.horizon.hint }}</p>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import * as d3 from 'd3'
import { chartPalette, chartTheme } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { tooltipPlacement } from './utils/tooltipPlacement'
import {
  bandFraction,
  bandSize,
  horizonExtent,
  horizonRows,
  horizonTimes,
  pointAt,
  sortHorizonRows,
  toTime,
  typicalStep,
  type HorizonPoint,
  type HorizonRow,
  type HorizonSeriesInput,
  type HorizonSort,
  type HorizonTime,
} from './utils/horizon'
import type { XDomain } from './types/chart.types'
import { useLocale } from '../shared/config'

/**
 * HorizonChart —— 地平線圖（大量時間序列）
 *
 * 用途：幾十個感測器 / 機台的趨勢放在同一張圖比較 —— 每條只佔一列（約 28px），數值減掉基準線（0、平均或設定值）後，
 * 高於基準的一種顏色、低於基準的另一種顏色，切成幾層摺疊、越深代表偏離越多。哪台什麼時候偏高、偏低一眼看出。
 *
 * - 十字線：滑過時所有列對齊同一時間、右側列出該時間的值；可用 useChartSync 跟其他圖表同步（crosshair / crosshairValue）
 * - scale：每列各自比例（看每條的形狀）或共用比例（比較誰偏離最多）；sort 依最大偏離 / 平均 / 最新值 / 名稱排序
 * - 鍵盤：Tab 進入後 ←→ 移動時間、↑↓ 換列、Home / End、Esc；附隱藏的統計表
 */

interface HorizonChartProps {
  series: HorizonSeriesInput[]
  width?: number
  /** 每列高度（px） */
  rowHeight?: number
  autoResize?: boolean
  debounceDelay?: number
  title?: string
  /** 層數（每一邊） */
  bands?: number
  /** 基準線：數字或每條用自己的平均；各序列的 baseline 優先 */
  baseline?: number | 'mean'
  /** 每列各自比例或共用比例 */
  scale?: 'row' | 'shared'
  sort?: HorizonSort
  /** 高於 / 低於基準線的顏色 */
  positiveColor?: string
  negativeColor?: string
  /** 顯示的時間範圍（可跟 useChartSync 的 xDomain 同步） */
  xDomain?: XDomain | null
  /** 十字線 */
  crosshair?: boolean
  /** 外部的十字線位置（useChartSync） */
  crosshairValue?: HorizonTime | null
  /** 右側顯示十字線（或最新）時間的值 */
  showValues?: boolean
  /** 預設單位（序列自己的 unit 優先） */
  unit?: string
  valueFormat?: ((value: number) => string) | null
  timeFormat?: ((t: Date) => string) | null
  emptyText?: string
}

const i18n = useLocale()
const props = withDefaults(defineProps<HorizonChartProps>(), {
  width: 720,
  rowHeight: 28,
  autoResize: false,
  debounceDelay: 100,
  title: '',
  bands: 3,
  baseline: 0,
  scale: 'row',
  sort: 'none',
  positiveColor: chartPalette.critical,
  negativeColor: chartPalette.primary,
  xDomain: null,
  crosshair: true,
  crosshairValue: null,
  showValues: true,
  unit: '',
  valueFormat: null,
  timeFormat: null,
  emptyText: undefined,
})

const emit = defineEmits<{
  /** 十字線移動（離開時為 null）；給 useChartSync 用 */
  (e: 'crosshair-move', value: Date | null): void
  (e: 'row-click', row: HorizonRow): void
  (e: 'chart-resize', size: { width: number; height: number }): void
}>()

const uid = useId()
const containerRef = ref<HTMLElement | null>(null)
// 高度由列數決定，只跟著容器寬度（height 不會用到）
const { effectiveWidth } = useAutoResize(containerRef, props as unknown as { width: number; height: number; autoResize: boolean; debounceDelay: number }, (s) => emit('chart-resize', s))

// ---- 資料 ----
const rows = computed(() => horizonRows(props.series, props.baseline))
const ordered = computed(() => sortHorizonRows(rows.value, props.sort))
const sharedMax = computed(() => Math.max(0, ...rows.value.map((r) => r.stats?.maxAbs ?? 0)))
const sharedBand = computed(() => bandSize(sharedMax.value, props.bands))
const bandOf = (r: HorizonRow) => (props.scale === 'shared' ? sharedBand.value : bandSize(r.stats?.maxAbs ?? 0, props.bands))
const times = computed(() => horizonTimes(rows.value))

// ---- 版面 ----
const GAP = 2
const M = { top: 4, bottom: 22 }
const chartWidth = computed(() => Math.max(200, effectiveWidth.value))
const labelW = computed(() => {
  const units = d3.max(rows.value, (r) => [...r.name].reduce((n, ch) => n + (ch.charCodeAt(0) < 256 ? 1 : 2), 0)) ?? 4
  return Math.min(chartWidth.value * 0.28, Math.max(40, units * 6.5 + 10))
})
const plotLeft = computed(() => labelW.value + 8)
const valueW = computed(() => (props.showValues ? 68 : 8))
const plotWidth = computed(() => Math.max(20, chartWidth.value - plotLeft.value - valueW.value))
const chartHeight = computed(() => M.top + Math.max(1, ordered.value.length) * (props.rowHeight + GAP) - GAP + M.bottom)
const axisY = computed(() => chartHeight.value - M.bottom)
const rowTop = (i: number) => M.top + i * (props.rowHeight + GAP)

const domain = computed<[number, number]>(() => {
  const d = props.xDomain
  if (d && d.length === 2 && typeof d[0] !== 'string') {
    const a = toTime(d[0] as number | Date)
    const b = toTime(d[1] as number | Date)
    if (Number.isFinite(a) && Number.isFinite(b) && b > a) return [a, b]
  }
  const e = horizonExtent(rows.value)
  return e && e[1] > e[0] ? e : e ? [e[0] - 1, e[0] + 1] : [0, 1]
})
const xScale = computed(() => d3.scaleLinear().domain(domain.value).range([plotLeft.value, plotLeft.value + plotWidth.value]))
const x = (t: number) => xScale.value(t)
const inDomain = (t: number) => t >= domain.value[0] && t <= domain.value[1]
const ticks = computed(() => {
  const n = Math.max(2, Math.floor(plotWidth.value / 110))
  return d3.scaleTime().domain(domain.value).ticks(n).map((d) => d.getTime())
})

// ---- 層 ----
function bandPath(r: HorizonRow, side: 1 | -1, band: number): string {
  const size = bandOf(r)
  const h = props.rowHeight
  return (
    d3
      .area<HorizonPoint>()
      .defined((p) => p.d !== null)
      .x((p) => x(p.t))
      .y0(h)
      .y1((p) => h - bandFraction(p.d, band, size, side)! * h)(r.points) ?? ''
  )
}
/** 第 band 層的顏色：越外層越深 */
function bandColor(side: 1 | -1, band: number): string {
  const c = side > 0 ? props.positiveColor : props.negativeColor
  const pct = Math.round(30 + (70 * (band + 1)) / Math.max(1, props.bands))
  return `color-mix(in srgb, ${c} ${pct}%, rgb(var(--t-surface-primary)))`
}

// ---- 文字 ----
const fmt = (v: number) => (props.valueFormat ? props.valueFormat(v) : d3.format(',~f')(Number(v.toPrecision(4))))
const fmtValue = (v: number, unit?: string) => {
  const u = unit ?? props.unit
  return u ? `${fmt(v)} ${u}` : fmt(v)
}
const span = computed(() => domain.value[1] - domain.value[0])
const DAY = 86_400_000
function fmtTick(t: number): string {
  const d = new Date(t)
  if (props.timeFormat) return props.timeFormat(d)
  if (span.value <= 2 * DAY) return d3.timeFormat(d.getHours() === 0 && d.getMinutes() === 0 ? '%m/%d' : '%H:%M')(d)
  return d3.timeFormat('%m/%d')(d)
}
function fmtTime(t: number): string {
  const d = new Date(t)
  if (props.timeFormat) return props.timeFormat(d)
  return d3.timeFormat(span.value <= 2 * DAY ? '%m/%d %H:%M' : '%Y-%m-%d %H:%M')(d)
}
const signed = (v: number, unit?: string) => (v > 0 ? `+${fmtValue(v, unit)}` : fmtValue(v, unit))
function shortLabel(s: string): string {
  const budget = Math.max(3, Math.floor((labelW.value - 4) / 6.5))
  let used = 0
  let out = ''
  for (const ch of s) {
    used += ch.charCodeAt(0) < 256 ? 1 : 2
    if (used > budget) return `${out}…`
    out += ch
  }
  return out
}

// ---- 十字線 ----
const hoverT = ref<number | null>(null)
const externalT = computed(() => {
  const v = props.crosshairValue
  if (v === null || v === undefined) return null
  const t = toTime(v)
  return Number.isFinite(t) ? t : null
})
const crossT = computed(() => (props.crosshair ? (hoverT.value ?? externalT.value) : null))
const activeRow = ref<number | null>(null)
const kbActive = ref(false)

function valueAt(r: HorizonRow, t: number): HorizonPoint | null {
  const p = pointAt(r.points, t, typicalStep(r.points) * 1.5)
  return p && p.v !== null ? p : null
}
function readout(r: HorizonRow): { text: string; color: string } | null {
  const t = crossT.value
  const p = t === null ? (r.stats?.last != null ? { v: r.stats.last, d: r.stats.last - r.baseline } : null) : valueAt(r, t)
  if (!p || p.v === null) return null
  return { text: fmtValue(p.v, r.unit), color: p.d! > 0 ? chartTheme.danger : p.d! < 0 ? chartTheme.accent : chartTheme.textMuted }
}
function lines(r: HorizonRow, t: number | null): string[] {
  const s = i18n.value.horizon
  const out = [r.name]
  const p = t === null ? null : valueAt(r, t)
  if (t !== null) out.push(fmtTime(p?.t ?? t))
  if (p) out.push(fmtValue(p.v!, r.unit), s.deviation(signed(p.d!, r.unit), fmtValue(r.baseline, r.unit)))
  else out.push(s.noData)
  return out
}
const tip = computed(() => {
  const i = activeRow.value
  const r = i === null ? undefined : ordered.value[i]
  const t = crossT.value
  if (!r || t === null || (!hoverT.value && !kbActive.value)) return null
  return { lines: lines(r, t), style: tooltipPlacement(x(t), rowTop(i!) + props.rowHeight, chartWidth.value, chartHeight.value, 200, 76) }
})

function onPointer(e: PointerEvent): void {
  if (!props.crosshair) return
  const svg = e.currentTarget as SVGSVGElement
  const box = svg.getBoundingClientRect()
  const px = e.clientX - box.left
  const py = e.clientY - box.top
  if (px < plotLeft.value || px > plotLeft.value + plotWidth.value || py > axisY.value) {
    if (hoverT.value !== null) onLeave()
    return
  }
  hoverT.value = xScale.value.invert(px)
  const row = Math.floor((py - M.top) / (props.rowHeight + GAP))
  if (row >= 0 && row < ordered.value.length) activeRow.value = row
  emit('crosshair-move', new Date(hoverT.value))
}
function onLeave(): void {
  hoverT.value = null
  activeRow.value = null
  emit('crosshair-move', null)
}

// ---- 鍵盤 ----
const announcement = ref('')
function onKey(e: KeyboardEvent): void {
  const ts = times.value.filter(inDomain)
  if (!ts.length) return
  const n = ordered.value.length
  let t = crossT.value
  let row = activeRow.value ?? 0
  const idx = t === null ? -1 : d3.bisectLeft(ts, t)
  if (e.key === 'ArrowRight') t = ts[Math.min(ts.length - 1, t === null ? 0 : ts[idx] === t ? idx + 1 : idx)]
  else if (e.key === 'ArrowLeft') t = ts[Math.max(0, t === null ? ts.length - 1 : idx - 1)]
  else if (e.key === 'Home') t = ts[0]
  else if (e.key === 'End') t = ts[ts.length - 1]
  else if (e.key === 'ArrowDown') row = Math.min(n - 1, row + 1)
  else if (e.key === 'ArrowUp') row = Math.max(0, row - 1)
  else if (e.key === 'Escape') {
    kbActive.value = false
    onLeave()
    return
  } else return
  e.preventDefault()
  kbActive.value = true
  t ??= ts[ts.length - 1]
  hoverT.value = t
  activeRow.value = row
  emit('crosshair-move', new Date(t))
  announcement.value = lines(ordered.value[row], t).join(i18n.value.horizon.separator)
}

const ariaLabel = computed(() => i18n.value.horizon.ariaLabel(props.title || i18n.value.horizon.title, rows.value.length))

defineExpose({
  /** 排序後的列（含基準線與統計） */
  rows: () => ordered.value,
})
</script>
