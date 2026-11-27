<template>
  <div class="ewma-cusum-chart flex flex-col gap-2" :style="props.autoResize ? { width: '100%' } : { width: `${props.width}px`, maxWidth: '100%' }">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-secondary">
      <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
      <span v-if="series.values.length" class="tabular-nums" data-baseline>{{ t.baseline(fmt(ew.mu0), fmt(ew.sigma)) }}</span>
      <span v-if="showEwma && series.values.length" class="tabular-nums">{{ t.ewmaParams(fmtNum(ew.lambda), fmtNum(ew.L)) }}</span>
      <span v-if="showCusum && series.values.length" class="tabular-nums">{{ t.cusumParams(fmtNum(cs.k), fmtNum(cs.h)) }}</span>
    </div>

    <!-- 訊號摘要 -->
    <div v-if="series.values.length" class="flex flex-wrap gap-2 text-xs" data-summary>
      <span
        v-if="showEwma"
        class="rounded-md px-2 py-0.5"
        :class="ew.firstSignal !== null ? 'bg-danger-subtle text-danger-on-subtle font-medium' : 'bg-success-subtle text-success-on-subtle'"
        data-ewma-summary
      >
        {{ ew.firstSignal !== null ? t.ewmaSignal(labelAt(ew.firstSignal)) : t.ewmaOk }}
      </span>
      <span
        v-if="showCusum"
        class="rounded-md px-2 py-0.5"
        :class="cs.shift ? 'bg-danger-subtle text-danger-on-subtle font-medium' : 'bg-success-subtle text-success-on-subtle'"
        data-cusum-summary
      >
        {{ cs.shift ? t.cusumSignal(labelAt(cs.shift.signalAt), labelAt(cs.shift.onset), t.directions[cs.shift.direction], fmt(cs.shift.newMean)) : t.cusumOk }}
      </span>
    </div>

    <div ref="containerRef" class="relative overflow-x-auto" :style="{ height: `${props.height + 2}px` }">
      <p v-if="!series.values.length" class="flex h-full items-center justify-center text-sm text-content-tertiary">{{ props.emptyText ?? t.empty }}</p>
      <svg
        v-else
        :width="svgWidth"
        :height="props.height"
        class="block rounded outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
        role="slider"
        tabindex="0"
        :aria-label="ariaLabel"
        :aria-valuemin="1"
        :aria-valuemax="n"
        :aria-valuenow="kbIndex + 1"
        :aria-valuetext="pointText(kbIndex)"
        @keydown="onKey"
        @focus="onFocus"
        @blur="onLeave"
        @mousemove="onMove"
        @mouseleave="onLeave"
        @click="onClick"
      >
        <!-- ===== EWMA ===== -->
        <g v-if="showEwma" data-panel="ewma">
          <text :x="M.l" :y="ewPanel.top - 6" font-size="11" font-weight="600" :style="{ fill: chartTheme.text }" aria-hidden="true">EWMA</text>
          <g aria-hidden="true">
            <template v-for="tk in ewTicks" :key="`et${tk}`">
              <line :x1="M.l" :x2="svgWidth - M.r" :y1="ewY(tk)" :y2="ewY(tk)" :style="{ stroke: chartTheme.grid }" />
              <text :x="M.l - 6" :y="ewY(tk)" dy="0.35em" text-anchor="end" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ fmt(tk) }}</text>
            </template>
            <text v-if="props.unit" :x="M.l - 6" :y="ewPanel.top - 6" text-anchor="end" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ props.unit }}</text>
            <!-- 中心線與界限（界限隨點數展開） -->
            <line :x1="M.l" :x2="svgWidth - M.r" :y1="ewY(ew.mu0)" :y2="ewY(ew.mu0)" :style="{ stroke: chartTheme.textMuted }" data-center />
            <path :d="limitPath('ucl')" fill="none" stroke-dasharray="5 3" :style="{ stroke: chartPalette.critical }" data-ucl />
            <path :d="limitPath('lcl')" fill="none" stroke-dasharray="5 3" :style="{ stroke: chartPalette.critical }" data-lcl />
            <text :x="svgWidth - M.r + 4" :y="ewY(lastPoint.ucl)" dy="0.35em" font-size="9" :style="{ fill: chartTheme.danger }">UCL {{ fmt(lastPoint.ucl) }}</text>
            <text :x="svgWidth - M.r + 4" :y="ewY(ew.mu0)" dy="0.35em" font-size="9" :style="{ fill: chartTheme.textMuted }">μ0 {{ fmt(ew.mu0) }}</text>
            <text :x="svgWidth - M.r + 4" :y="ewY(lastPoint.lcl)" dy="0.35em" font-size="9" :style="{ fill: chartTheme.danger }">LCL {{ fmt(lastPoint.lcl) }}</text>
          </g>
          <!-- 原始量測值（淡） -->
          <g v-if="props.showData" aria-hidden="true">
            <circle v-for="p in ew.points" :key="`x${p.index}`" :cx="x(p.index)" :cy="ewY(p.x)" r="2" :style="{ fill: chartTheme.textMuted, opacity: 0.45 }" data-raw />
          </g>
          <path :d="ewmaPath" fill="none" stroke-width="2" :style="{ stroke: chartPalette.primary }" aria-hidden="true" data-ewma-line />
          <g aria-hidden="true">
            <circle
              v-for="p in ew.points"
              :key="`z${p.index}`"
              :cx="x(p.index)"
              :cy="ewY(p.z)"
              :r="p.signal ? 4 : 2.5"
              :style="{ fill: p.signal ? chartPalette.critical : chartPalette.primary, stroke: chartTheme.surface }"
              stroke-width="1"
              :data-ewma-signal="p.signal || undefined"
            />
          </g>
        </g>

        <!-- ===== CUSUM ===== -->
        <g v-if="showCusum" data-panel="cusum">
          <text :x="M.l" :y="csPanel.top - 6" font-size="11" font-weight="600" :style="{ fill: chartTheme.text }" aria-hidden="true">CUSUM</text>
          <g aria-hidden="true">
            <line :x1="M.l" :x2="svgWidth - M.r" :y1="csY(0)" :y2="csY(0)" :style="{ stroke: chartTheme.textMuted }" />
            <line :x1="M.l" :x2="svgWidth - M.r" :y1="csY(cs.H)" :y2="csY(cs.H)" stroke-dasharray="5 3" :style="{ stroke: chartPalette.critical }" data-h-plus />
            <line :x1="M.l" :x2="svgWidth - M.r" :y1="csY(-cs.H)" :y2="csY(-cs.H)" stroke-dasharray="5 3" :style="{ stroke: chartPalette.critical }" data-h-minus />
            <text :x="svgWidth - M.r + 4" :y="csY(cs.H)" dy="0.35em" font-size="9" :style="{ fill: chartTheme.danger }">+H {{ fmt(cs.H) }}</text>
            <text :x="svgWidth - M.r + 4" :y="csY(-cs.H)" dy="0.35em" font-size="9" :style="{ fill: chartTheme.danger }">−H</text>
            <text :x="M.l - 6" :y="csY(cs.H)" dy="0.35em" text-anchor="end" font-size="10" :style="{ fill: chartTheme.textMuted }">C⁺</text>
            <text :x="M.l - 6" :y="csY(-cs.H)" dy="0.35em" text-anchor="end" font-size="10" :style="{ fill: chartTheme.textMuted }">C⁻</text>
            <!-- 偏移開始 -->
            <g v-if="cs.shift" data-onset>
              <line :x1="x(cs.shift.onset)" :x2="x(cs.shift.onset)" :y1="csPanel.top" :y2="csPanel.bottom" stroke-dasharray="3 3" :style="{ stroke: chartTheme.warning }" />
              <text :x="x(cs.shift.onset) + 4" :y="csPanel.top + 10" font-size="9" :style="{ fill: chartTheme.warning }">{{ t.onset }}</text>
            </g>
          </g>
          <path :d="cusumPath('cPlus')" fill="none" stroke-width="1.75" :style="{ stroke: chartPalette.categorical[0] }" aria-hidden="true" data-cplus />
          <path :d="cusumPath('cMinus')" fill="none" stroke-width="1.75" :style="{ stroke: chartPalette.categorical[1] }" aria-hidden="true" data-cminus />
          <g aria-hidden="true">
            <template v-for="p in cs.points" :key="`c${p.index}`">
              <circle v-if="p.signal" :cx="x(p.index)" :cy="csY(p.signal === 'up' ? p.cPlus : -p.cMinus)" r="3.5" :style="{ fill: chartPalette.critical, stroke: chartTheme.surface }" data-cusum-signal />
            </template>
          </g>
        </g>

        <!-- x 軸 -->
        <g aria-hidden="true">
          <text v-for="i in xTicks" :key="`xt${i}`" :x="x(i)" :y="props.height - M.b + 14" text-anchor="middle" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ shortLabel(series.labels[i]) }}</text>
        </g>
        <!-- 游標 -->
        <g v-if="active !== null" aria-hidden="true">
          <line :x1="x(active)" :x2="x(active)" :y1="M.t" :y2="props.height - M.b" :style="{ stroke: chartTheme.accent, opacity: 0.5 }" data-cursor />
          <rect v-if="kbFocus" :x="x(active) - 6" :y="M.t" width="12" :height="props.height - M.b - M.t" rx="3" fill="none" stroke-width="2" :style="{ stroke: chartTheme.accent }" />
        </g>
      </svg>
      <div
        v-if="tip"
        class="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border px-2 py-1 text-xs shadow-md"
        :style="{ ...tip.style, background: chartTheme.surface, borderColor: chartTheme.border, color: chartTheme.text }"
        data-export-ignore
        data-tip
      >
        <div v-for="(line, li) in tip.lines" :key="li" :class="li === 0 ? 'font-medium' : 'text-content-secondary'">{{ line }}</div>
      </div>
    </div>

    <table class="sr-only">
      <caption>{{ props.title || t.title }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ t.sample }}</th>
          <th scope="col">{{ t.value }}</th>
          <th v-if="showEwma" scope="col">EWMA</th>
          <th v-if="showEwma" scope="col">UCL / LCL</th>
          <th v-if="showCusum" scope="col">C⁺</th>
          <th v-if="showCusum" scope="col">C⁻</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(v, i) in series.values" :key="i">
          <td>{{ series.labels[i] }}</td>
          <td>{{ fmt(v) }}</td>
          <td v-if="showEwma">{{ fmt(ew.points[i].z) }}{{ ew.points[i].signal ? ` ${t.outOfControl}` : '' }}</td>
          <td v-if="showEwma">{{ fmt(ew.points[i].ucl) }} / {{ fmt(ew.points[i].lcl) }}</td>
          <td v-if="showCusum">{{ fmt(cs.points[i].cPlus) }}</td>
          <td v-if="showCusum">{{ fmt(cs.points[i].cMinus) }}{{ cs.points[i].signal ? ` ${t.outOfControl}` : '' }}</td>
        </tr>
      </tbody>
    </table>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import * as d3 from 'd3'
import { chartPalette, chartTheme } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { tooltipPlacement } from './utils/tooltipPlacement'
import { cusum, ewma, extractSeries, type CusumPoint, type EwmaPoint } from './utils/ewmaCusum'
import { useLocale } from '../shared/config'
import { clipText } from '../shared/textClip'

/**
 * EwmaCusumChart —— 小偏移管制圖
 *
 * 一般的個別值管制圖對 1.5σ 以下的偏移反應很慢；EWMA（指數加權移動平均）與 CUSUM（累積和）
 * 會累積過去的資訊，0.5～1σ 的偏移也能在十幾點內發出訊號。上半部是 EWMA 與隨點數展開的管制界限，
 * 下半部是表格式 CUSUM 的上下累積和（C⁻ 畫在 0 下方）與決策界限 ±H；訊號時估計偏移開始的位置與新平均。
 */
export interface EwmaCusumChartProps {
  /** 數值陣列，或資料列（用 value 指定欄位） */
  data: (number | Record<string, unknown>)[]
  /** 量測值欄位 */
  value?: string
  /** x 軸標籤欄位（預設序號） */
  label?: string
  /** 顯示哪些圖 */
  mode?: 'both' | 'ewma' | 'cusum'
  /** EWMA 平滑係數 λ */
  lambda?: number
  /** EWMA 管制界限寬度 L（σ 倍數） */
  limitWidth?: number
  /** CUSUM 參考值 k（σ 倍數） */
  k?: number
  /** CUSUM 決策界限 h（σ 倍數） */
  h?: number
  /** 目標值 μ0（預設資料平均；有歷史基準時建議指定） */
  target?: number | null
  /** 製程標準差 σ（預設移動全距估計） */
  sigma?: number | null
  /** EWMA 圖上畫出原始量測值 */
  showData?: boolean
  width?: number
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  title?: string
  unit?: string
  valueFormat?: ((v: number) => string) | null
  emptyText?: string
}

const i18n = useLocale()
const t = computed(() => i18n.value.ewmaCusum)

const props = withDefaults(defineProps<EwmaCusumChartProps>(), {
  value: 'value',
  label: undefined,
  mode: 'both',
  lambda: 0.2,
  limitWidth: 3,
  k: 0.5,
  h: 5,
  target: null,
  sigma: null,
  showData: true,
  width: 760,
  height: 420,
  autoResize: false,
  debounceDelay: 100,
  title: '',
  unit: '',
  valueFormat: null,
  emptyText: undefined,
})

export interface EwmaCusumPointEvent {
  index: number
  label: string
  value: number
  ewma: EwmaPoint | null
  cusum: CusumPoint | null
}

const emit = defineEmits<{
  (e: 'chart-resize', size: { width: number; height: number }): void
  (e: 'point-click', point: EwmaCusumPointEvent): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const { effectiveWidth } = useAutoResize(containerRef, props as unknown as { width: number; height: number; autoResize: boolean; debounceDelay: number }, (s) => emit('chart-resize', s))

// ---- 資料 ----
const series = computed(() => extractSeries(props.data, props.value, props.label))
const n = computed(() => series.value.values.length)
const ew = computed(() => ewma(series.value.values, { lambda: props.lambda, L: props.limitWidth, target: props.target, sigma: props.sigma }))
const cs = computed(() => cusum(series.value.values, { k: props.k, h: props.h, target: props.target, sigma: props.sigma }))
const showEwma = computed(() => props.mode !== 'cusum')
const showCusum = computed(() => props.mode !== 'ewma')
const lastPoint = computed(() => ew.value.points[ew.value.points.length - 1] ?? { ucl: ew.value.mu0, lcl: ew.value.mu0 })
const labelAt = (i: number) => series.value.labels[i] ?? String(i + 1)

// ---- 版面 ----
const M = { l: 52, r: 64, t: 22, b: 24 }
const PANEL_GAP = 30
const MIN_STEP = 6
const svgWidth = computed(() => Math.max(effectiveWidth.value, M.l + M.r + n.value * MIN_STEP))
const x = (i: number) => M.l + (n.value <= 1 ? (svgWidth.value - M.l - M.r) / 2 : (i * (svgWidth.value - M.l - M.r)) / (n.value - 1))
const panels = computed(() => {
  const top = M.t
  const bottom = props.height - M.b
  if (!showEwma.value || !showCusum.value) return { ew: { top, bottom }, cs: { top, bottom } }
  const split = top + (bottom - top - PANEL_GAP) * 0.56
  return { ew: { top, bottom: split }, cs: { top: split + PANEL_GAP, bottom } }
})
const ewPanel = computed(() => panels.value.ew)
const csPanel = computed(() => panels.value.cs)

const ewScale = computed(() => {
  const vals: number[] = [ew.value.mu0]
  for (const p of ew.value.points) {
    vals.push(p.z)
    if (Number.isFinite(p.ucl)) vals.push(p.ucl, p.lcl)
    if (props.showData) vals.push(p.x)
  }
  const [lo, hi] = d3.extent(vals.filter(Number.isFinite)) as [number, number]
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.06
  return d3.scaleLinear().domain([lo - pad, hi + pad]).range([ewPanel.value.bottom, ewPanel.value.top]).nice()
})
const ewY = (v: number) => ewScale.value(v)
const ewTicks = computed(() => ewScale.value.ticks(Math.max(2, Math.floor((ewPanel.value.bottom - ewPanel.value.top) / 40))))
const csScale = computed(() => {
  const H = Number.isFinite(cs.value.H) ? cs.value.H : 1
  const up = Math.max(H, ...cs.value.points.map((p) => p.cPlus)) * 1.1
  const down = Math.max(H, ...cs.value.points.map((p) => p.cMinus)) * 1.1
  return d3.scaleLinear().domain([-down, up]).range([csPanel.value.bottom, csPanel.value.top])
})
const csY = (v: number) => csScale.value(v)

const ewmaPath = computed(() => d3.line<EwmaPoint>().x((p) => x(p.index)).y((p) => ewY(p.z))(ew.value.points) ?? '')
const limitPath = (which: 'ucl' | 'lcl') =>
  d3
    .line<EwmaPoint>()
    .defined((p) => Number.isFinite(p[which]))
    .x((p) => x(p.index))
    .y((p) => ewY(p[which]))
    .curve(d3.curveStepAfter)(ew.value.points) ?? ''
const cusumPath = (which: 'cPlus' | 'cMinus') => d3.line<CusumPoint>().x((p) => x(p.index)).y((p) => csY(which === 'cPlus' ? p.cPlus : -p.cMinus))(cs.value.points) ?? ''

/** x 軸刻度：大約每 60px 一個 */
const xTicks = computed(() => {
  const every = Math.max(1, Math.ceil(n.value / Math.max(2, Math.floor((svgWidth.value - M.l - M.r) / 60))))
  const out: number[] = []
  for (let i = 0; i < n.value; i += every) out.push(i)
  return out
})
const shortLabel = (s: string | undefined) => clipText(s ?? '', 56)

// ---- 數字格式 ----
const fmt = (v: number) => {
  if (!Number.isFinite(v)) return '—'
  if (props.valueFormat) return props.valueFormat(v)
  const a = Math.abs(v)
  return d3.format(a >= 1000 ? ',.0f' : a >= 10 ? '.2f' : '.3f')(v)
}
const fmtNum = (v: number) => String(Number(v.toFixed(3)))

// ---- 互動：滑鼠、鍵盤（slider） ----
const hoverIndex = ref<number | null>(null)
const kbIndex = ref(0)
const kbFocus = ref(false)
const announcement = ref('')
const active = computed(() => (kbFocus.value ? kbIndex.value : hoverIndex.value))

function indexAt(px: number): number {
  if (n.value <= 1) return 0
  const step = (svgWidth.value - M.l - M.r) / (n.value - 1)
  return Math.min(n.value - 1, Math.max(0, Math.round((px - M.l) / step)))
}
function onMove(e: MouseEvent) {
  const box = (e.currentTarget as SVGElement).getBoundingClientRect()
  hoverIndex.value = indexAt(e.clientX - box.left)
}
function onLeave() {
  hoverIndex.value = null
  kbFocus.value = false
}
function onFocus() {
  kbFocus.value = true
}
function eventOf(i: number): EwmaCusumPointEvent {
  return { index: series.value.rows[i], label: labelAt(i), value: series.value.values[i], ewma: ew.value.points[i] ?? null, cusum: cs.value.points[i] ?? null }
}
function onClick(e: MouseEvent) {
  onMove(e)
  if (hoverIndex.value !== null) emit('point-click', eventOf(hoverIndex.value))
}
function onKey(e: KeyboardEvent) {
  const map: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }
  let next = kbIndex.value
  if (e.key in map) next = kbIndex.value + map[e.key]
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = n.value - 1
  else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('point-click', eventOf(kbIndex.value))
    return
  } else return
  e.preventDefault()
  kbFocus.value = true
  kbIndex.value = Math.min(n.value - 1, Math.max(0, next))
  announcement.value = pointText(kbIndex.value)
}

function pointLines(i: number): string[] {
  const lines = [`${t.value.sample} ${labelAt(i)}`, `${t.value.value} ${fmt(series.value.values[i])}`]
  const ep = ew.value.points[i]
  const cp = cs.value.points[i]
  if (showEwma.value && ep) lines.push(t.value.ewmaLine(fmt(ep.z), fmt(ep.lcl), fmt(ep.ucl)) + (ep.signal ? ` ${t.value.outOfControl}` : ''))
  if (showCusum.value && cp) lines.push(t.value.cusumLine(fmt(cp.cPlus), fmt(cp.cMinus)) + (cp.signal ? ` ${t.value.outOfControl}` : ''))
  return lines
}
const pointText = (i: number) => (n.value ? pointLines(i).join(', ') : '')
const tip = computed(() => {
  const i = active.value
  if (i === null || !n.value) return null
  const yRef = showEwma.value ? ewY(ew.value.points[i].z) : csY(cs.value.points[i].cPlus)
  return { lines: pointLines(i), style: tooltipPlacement(x(i), yRef, svgWidth.value, props.height, 230, 90) }
})
const ariaLabel = computed(() => {
  const parts = [props.title || t.value.title, t.value.pointsCount(n.value)]
  if (showEwma.value) parts.push(ew.value.firstSignal !== null ? t.value.ewmaSignal(labelAt(ew.value.firstSignal)) : t.value.ewmaOk)
  if (showCusum.value) parts.push(cs.value.shift ? t.value.cusumSignal(labelAt(cs.value.shift.signalAt), labelAt(cs.value.shift.onset), t.value.directions[cs.value.shift.direction], fmt(cs.value.shift.newMean)) : t.value.cusumOk)
  parts.push(t.value.keyHint)
  return parts.join('. ')
})

defineExpose({
  /** EWMA 計算結果 */
  ewma: () => ew.value,
  /** CUSUM 計算結果（含偏移估計） */
  cusum: () => cs.value,
})
</script>
