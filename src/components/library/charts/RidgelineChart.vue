<template>
  <div class="ridgeline-chart flex flex-col gap-2" :style="props.autoResize ? { width: '100%' } : { width: `${props.width}px`, maxWidth: '100%' }">
    <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
    <div ref="containerRef" class="relative" :style="{ height: `${chartHeight}px` }">
      <p v-if="!series.groups.length" class="flex h-full items-center justify-center text-sm text-content-tertiary">{{ props.emptyText ?? i18n.ridgeline.empty }}</p>
      <svg v-else :width="chartWidth" :height="chartHeight" class="block overflow-visible" role="group" :aria-label="ariaLabel" @mouseleave="hover = null">
        <!-- 刻度 -->
        <g aria-hidden="true">
          <g v-for="t in ticks" :key="`t${t}`">
            <line :x1="x(t)" :x2="x(t)" :y1="M.top - overlapH" :y2="plotBottom" :style="{ stroke: chartTheme.grid }" />
            <text :x="x(t)" :y="plotBottom + 15" text-anchor="middle" font-size="11" :style="{ fill: chartTheme.textMuted }">{{ fmt(t) }}</text>
          </g>
        </g>

        <!-- 每一組：由上往下畫，下面的疊在上面的前面 -->
        <g
          v-for="(g, i) in ordered"
          :key="g.index"
          :ref="(el) => setRowEl(i, el as SVGGElement | null)"
          role="button"
          :tabindex="i === tabStop ? 0 : -1"
          :aria-label="groupAria(g)"
          class="cursor-pointer outline-none"
          :data-group="g.name"
          :style="{ opacity: hover !== null && hover !== i ? 0.3 : 1 }"
          @mouseenter="hover = i"
          @focus="onFocus($event, i)"
          @blur="onBlur"
          @keydown="onKey($event, i)"
          @click="emitClick(g)"
        >
          <line :x1="M.left" :x2="chartWidth - M.right" :y1="baseline(i)" :y2="baseline(i)" :style="{ stroke: chartTheme.axis }" />
          <path v-if="g.stats" :d="ridgePath(g, i)" :style="{ fill: colorOf(g), fillOpacity: props.fillOpacity, stroke: chartTheme.surface, strokeWidth: 1.5 }" data-ridge />
          <path v-if="g.stats" :d="ridgeLine(g, i)" fill="none" :style="{ stroke: colorOf(g), strokeWidth: 1.25 }" />
          <template v-if="g.stats && props.showQuartiles">
            <line
              v-for="q in quartileMarks(g, i)"
              :key="q.key"
              :x1="q.x"
              :x2="q.x"
              :y1="baseline(i)"
              :y2="q.top"
              :stroke-width="q.key === 'median' ? 2 : 1"
              :stroke-dasharray="q.key === 'median' ? undefined : '2 2'"
              :style="{ stroke: chartTheme.surface }"
              :data-q="q.key"
            />
          </template>
          <!-- 名稱（擋住刻度線） -->
          <text :x="M.left - 8" :y="baseline(i) - 4" text-anchor="end" font-size="12" :style="{ fill: chartTheme.text }">{{ shortLabel(g.name) }}</text>
          <text v-if="!g.stats" :x="M.left + 6" :y="baseline(i) - 4" font-size="11" :style="{ fill: chartTheme.textMuted }">{{ i18n.ridgeline.noData }}</text>
          <text v-if="specOut(g)" :x="chartWidth - 2" :y="baseline(i) - 4" text-anchor="end" font-size="11" font-weight="600" :style="{ fill: chartTheme.danger }" data-out>
            {{ specOut(g) }}
          </text>
          <rect v-if="kbFocus === i" :x="1" :y="baseline(i) - rowH" :width="chartWidth - 2" :height="rowH" rx="3" fill="none" :style="{ stroke: chartTheme.accent }" stroke-width="2" />
          <!-- 滑過的感應區：這一列的高度 -->
          <rect :x="0" :y="baseline(i) - rowH" :width="chartWidth" :height="rowH" fill="transparent" />
        </g>

        <!-- 規格線 -->
        <g aria-hidden="true">
          <g v-for="s in specLines" :key="s.key" :data-spec="s.key">
            <line :x1="x(s.value)" :x2="x(s.value)" :y1="M.top - overlapH - 4" :y2="plotBottom" stroke-dasharray="5 3" :style="{ stroke: s.color }" stroke-width="1.5" />
            <text :x="x(s.value)" :y="M.top - overlapH - 8" text-anchor="middle" font-size="11" font-weight="600" :style="{ fill: s.color }">{{ s.label }}</text>
          </g>
        </g>
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
      <caption>{{ props.title || i18n.ridgeline.title }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ i18n.ridgeline.group }}</th>
          <th v-for="c in tableCols" :key="c" scope="col">{{ c }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="g in ordered" :key="g.index">
          <th scope="row">{{ g.name }}</th>
          <td v-for="(v, k) in tableRow(g)" :key="k">{{ v }}</td>
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
import { ridgelineGroups, sortRidgelineGroups, type RidgelineGroup, type RidgelineSeries, type RidgelineSort, type RidgelineSpec } from './utils/ridgeline'
import type { QuartileMethod } from './utils/boxPlot'
import { useLocale } from '../shared/config'

/**
 * RidgelineChart —— 山脊圖（多組分佈）
 *
 * 用途：比較很多組的分佈形狀 —— 各機台 / 各班 / 各批的量測值、每天的週期時間。每組一條核密度曲線，
 * 上下錯開並部分重疊，一眼看出哪組偏移、變寬、雙峰。給 spec（LSL / USL / 目標）時畫規格線，並標出每組規格外比例。
 *
 * - 曲線內：中位數（實線）與 Q1 / Q3（虛線）
 * - sort 依中位數、平均、標準差或名稱排序；normalize 決定每組各自放大到同高（看形狀）或共用比例（看集中程度）
 * - 滑過 / 鍵盤焦點：tooltip 顯示 n、平均 ± 標準差、中位數、Q1–Q3、範圍、規格外比例
 * - 鍵盤：Tab 進入後 ↑↓ 移動、Home / End、Enter 等同點擊；附隱藏的統計表給螢幕閱讀器
 */

interface RidgelineChartProps {
  series: RidgelineSeries[]
  width?: number
  /** 高度；0 = 依組數自動 */
  height?: number
  /** 每組佔的高度（px） */
  rowHeight?: number
  /** 重疊程度：曲線最高可以伸進上面幾列（0 = 不重疊） */
  overlap?: number
  autoResize?: boolean
  debounceDelay?: number
  title?: string
  unit?: string
  valueFormat?: ((value: number) => string) | null
  /** 頻寬：數字或經驗法則 */
  bandwidth?: number | 'silverman' | 'scott'
  /** 密度曲線的取樣點數 */
  resolution?: number
  /** X 範圍；不給時依資料與規格 */
  domain?: [number, number] | null
  sort?: RidgelineSort
  sortDescending?: boolean
  /** each：每組最高點同高（比形狀）；shared：共用比例（比集中程度） */
  normalize?: 'each' | 'shared'
  showQuartiles?: boolean
  /** 規格：LSL、USL、目標 */
  spec?: RidgelineSpec | null
  /** 所有組用同一個顏色（不給時依序用類別色） */
  color?: string | null
  fillOpacity?: number
  /** 四分位數算法 */
  quartileMethod?: QuartileMethod
  emptyText?: string
}

const i18n = useLocale()
const props = withDefaults(defineProps<RidgelineChartProps>(), {
  width: 720,
  height: 0,
  rowHeight: 36,
  overlap: 1,
  autoResize: false,
  debounceDelay: 100,
  title: '',
  unit: '',
  valueFormat: null,
  bandwidth: 'silverman',
  resolution: 120,
  domain: null,
  sort: 'none',
  sortDescending: true,
  normalize: 'each',
  showQuartiles: true,
  spec: null,
  color: null,
  fillOpacity: 0.75,
  quartileMethod: 'inclusive',
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'group-click', group: RidgelineGroup): void
  (e: 'chart-resize', size: { width: number; height: number }): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const { effectiveWidth, effectiveHeight } = useAutoResize(containerRef, props, (size) => emit('chart-resize', size))

// ---- 資料 ----
const spec = computed<RidgelineSpec>(() => props.spec ?? {})
const series = computed(() =>
  ridgelineGroups(props.series, { bandwidth: props.bandwidth, resolution: props.resolution, domain: props.domain, spec: spec.value, method: props.quartileMethod })
)
const ordered = computed(() => sortRidgelineGroups(series.value.groups, props.sort, props.sortDescending))
const maxPeak = computed(() => Math.max(0, ...series.value.groups.map((g) => g.peak)))

// ---- 尺寸 ----
const chartWidth = computed(() => Math.max(160, effectiveWidth.value))
const hasSpec = computed(() => spec.value.lsl != null || spec.value.usl != null)
const labelW = computed(() => {
  const units = d3.max(ordered.value, (g) => [...g.name].reduce((n, ch) => n + (ch.charCodeAt(0) < 256 ? 1 : 2), 0)) ?? 4
  return Math.min(chartWidth.value * 0.3, Math.max(40, units * 6.5 + 8))
})
const overlapH = computed(() => props.rowHeight * Math.max(0, props.overlap))
const M = computed(() => ({ top: overlapH.value + 22, bottom: 22, left: labelW.value + 8, right: hasSpec.value ? 52 : 12 }))
const autoHeight = computed(() => M.value.top + M.value.bottom + Math.max(1, ordered.value.length) * props.rowHeight)
const chartHeight = computed(() => (props.height > 0 ? (props.autoResize ? effectiveHeight.value : props.height) : autoHeight.value))
const rowH = computed(() => (chartHeight.value - M.value.top - M.value.bottom) / Math.max(1, ordered.value.length))
const plotBottom = computed(() => chartHeight.value - M.value.bottom)
const baseline = (i: number) => M.value.top + rowH.value * (i + 1)
/** 曲線最高點的高度 */
const ridgeH = computed(() => rowH.value + rowH.value * Math.max(0, props.overlap))

const xScale = computed(() => d3.scaleLinear().domain(series.value.domain).range([M.value.left, chartWidth.value - M.value.right]))
const x = (v: number) => xScale.value(v)
const ticks = computed(() => xScale.value.ticks(Math.max(2, Math.floor((chartWidth.value - M.value.left - M.value.right) / 80))))

// ---- 曲線 ----
const scaleOf = (g: RidgelineGroup) => (props.normalize === 'shared' ? maxPeak.value : g.peak) || 1
function points(g: RidgelineGroup, i: number): [number, number][] {
  const grid = series.value.grid
  const k = ridgeH.value / scaleOf(g)
  return g.density.map((d, j) => [x(grid[j]), baseline(i) - d * k])
}
function ridgePath(g: RidgelineGroup, i: number): string {
  return d3.area<[number, number]>().x((p) => p[0]).y0(baseline(i)).y1((p) => p[1]).curve(d3.curveBasis)(points(g, i)) ?? ''
}
function ridgeLine(g: RidgelineGroup, i: number): string {
  return d3.line<[number, number]>().curve(d3.curveBasis)(points(g, i)) ?? ''
}
/** 某個值在曲線上的高度（格點之間線性內插） */
function curveTop(g: RidgelineGroup, i: number, v: number): number {
  const grid = series.value.grid
  const k = ridgeH.value / scaleOf(g)
  const step = (grid[grid.length - 1] - grid[0]) / (grid.length - 1) || 1
  const f = (v - grid[0]) / step
  const lo = Math.max(0, Math.min(grid.length - 1, Math.floor(f)))
  const hi = Math.min(grid.length - 1, lo + 1)
  const t = Math.max(0, Math.min(1, f - lo))
  const d = g.density[lo] * (1 - t) + g.density[hi] * t
  return baseline(i) - d * k
}
function quartileMarks(g: RidgelineGroup, i: number) {
  const s = g.stats!
  return (['q1', 'median', 'q3'] as const).map((key) => ({ key, x: x(s[key]), top: curveTop(g, i, s[key]) }))
}

// ---- 顏色與文字 ----
const colorOf = (g: RidgelineGroup) => props.color ?? g.color ?? chartPalette.categorical[g.index % chartPalette.categorical.length]
const defaultFormat = d3.format(',~f')
const fmt = (v: number) => (props.valueFormat ? props.valueFormat(v) : defaultFormat(Number(v.toPrecision(5))))
const withUnit = (s: string) => (props.unit ? `${s} ${props.unit}` : s)
const pct = (p: number) => `${d3.format('.1f')(p * 100)}%`
function specOut(g: RidgelineGroup): string {
  const total = (g.belowLsl ?? 0) + (g.aboveUsl ?? 0)
  return hasSpec.value && g.stats && total > 0 ? pct(total) : ''
}
const specLines = computed(() => {
  const s = spec.value
  const t = i18n.value.ridgeline
  const out: { key: string; value: number; label: string; color: string }[] = []
  if (s.lsl != null) out.push({ key: 'lsl', value: s.lsl, label: `${t.lsl} ${fmt(s.lsl)}`, color: chartTheme.danger })
  if (s.target != null) out.push({ key: 'target', value: s.target, label: `${t.target} ${fmt(s.target)}`, color: chartTheme.textMuted })
  if (s.usl != null) out.push({ key: 'usl', value: s.usl, label: `${t.usl} ${fmt(s.usl)}`, color: chartTheme.danger })
  return out
})
function groupLines(g: RidgelineGroup): string[] {
  const t = i18n.value.ridgeline
  const s = g.stats
  if (!s) return [g.name, t.noData]
  const lines = [
    g.name,
    t.n(s.n),
    t.mean(withUnit(fmt(s.mean)), fmt(s.sd)),
    t.median(withUnit(fmt(s.median))),
    t.quartiles(fmt(s.q1), fmt(s.q3)),
    t.range(fmt(s.min), fmt(s.max)),
  ]
  // 細項只列有超出的那一側
  if (hasSpec.value) lines.push(t.outOfSpec(pct((g.belowLsl ?? 0) + (g.aboveUsl ?? 0)), g.belowLsl ? pct(g.belowLsl) : '', g.aboveUsl ? pct(g.aboveUsl) : ''))
  return lines
}
const groupAria = (g: RidgelineGroup) => groupLines(g).join(i18n.value.ridgeline.separator)
const ariaLabel = computed(() => i18n.value.ridgeline.ariaLabel(props.title || i18n.value.ridgeline.title, ordered.value.length))
const tableCols = computed(() => {
  const t = i18n.value.ridgeline
  return [t.colN, t.colMean, t.colSd, t.colMedian, t.colQ1, t.colQ3, t.colMin, t.colMax, ...(hasSpec.value ? [t.colOut] : [])]
})
function tableRow(g: RidgelineGroup): string[] {
  const s = g.stats
  if (!s) return tableCols.value.map(() => i18n.value.ridgeline.noData)
  return [String(s.n), fmt(s.mean), fmt(s.sd), fmt(s.median), fmt(s.q1), fmt(s.q3), fmt(s.min), fmt(s.max), ...(hasSpec.value ? [pct((g.belowLsl ?? 0) + (g.aboveUsl ?? 0))] : [])]
}
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

// ---- 互動 ----
const hover = ref<number | null>(null)
const kbFocus = ref<number | null>(null)
const focusIndex = ref(0)
const tabStop = computed(() => Math.min(focusIndex.value, Math.max(0, ordered.value.length - 1)))
const tip = computed(() => {
  const i = hover.value
  const g = i === null ? undefined : ordered.value[i]
  if (!g) return null
  const px = g.stats ? x(g.stats.median) : M.value.left
  return { lines: groupLines(g), style: tooltipPlacement(px, baseline(i!) - rowH.value, chartWidth.value, chartHeight.value, 210, 130) }
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
  announcement.value = groupAria(ordered.value[i])
}
function onBlur(): void {
  kbFocus.value = null
  hover.value = null
}
function onKey(e: KeyboardEvent, i: number): void {
  const n = ordered.value.length
  let next: number | null = null
  if (e.key === 'ArrowDown') next = Math.min(n - 1, i + 1)
  else if (e.key === 'ArrowUp') next = Math.max(0, i - 1)
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = n - 1
  else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emitClick(ordered.value[i])
    return
  } else if (e.key === 'Escape') {
    hover.value = null
    return
  } else return
  e.preventDefault()
  focusIndex.value = next
  void nextTick(() => rowEls.get(next!)?.focus())
}
function emitClick(g: RidgelineGroup): void {
  emit('group-click', g)
}

defineExpose({
  /** 排序後的各組（統計、頻寬、密度、規格外比例） */
  groups: () => ordered.value,
  /** 密度的取樣格點 */
  grid: () => series.value.grid,
})
</script>
