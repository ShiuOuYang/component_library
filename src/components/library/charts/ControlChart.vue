<template>
  <div ref="containerRef" class="control-chart" :style="containerStyle">
    <p v-if="title" class="cc-title text-sm font-semibold text-content-primary">{{ title }}</p>

    <svg
      ref="svgRef"
      class="cc-svg"
      :width="effectiveWidth"
      :height="svgHeight"
      role="img"
      tabindex="0"
      :aria-label="ariaSummary"
      @mousemove="onMove"
      @mouseleave="clearHover"
      @click="onClick"
      @keydown="onKeydown"
      @blur="clearHover"
    >
      <g v-for="(panel, pi) in panels" :key="panel.key" :transform="`translate(${margin.left}, ${panel.top})`">
        <!-- 格線與 Y 軸刻度 -->
        <g class="cc-grid" aria-hidden="true">
          <g v-for="t in panel.ticks" :key="t.value">
            <line :x1="0" :x2="plotWidth" :y1="t.y" :y2="t.y" />
            <text class="cc-tick" :x="-8" :y="t.y" text-anchor="end" dominant-baseline="central">{{ t.label }}</text>
          </g>
        </g>
        <text class="cc-panel-label" x="4" y="-6">{{ panel.label }}</text>

        <!-- ±1σ、±2σ 區帶 -->
        <g v-if="showZones" class="cc-zones" aria-hidden="true">
          <path v-for="z in panel.zones" :key="z.key" :d="z.d" />
        </g>

        <!-- 規格界限（主圖） -->
        <g v-for="sp in panel.specs" :key="sp.key" class="cc-spec" aria-hidden="true">
          <line :x1="0" :x2="plotWidth" :y1="sp.y" :y2="sp.y" />
        </g>

        <!-- 管制界限 -->
        <path class="cc-limit is-ucl" :d="panel.uclPath" aria-hidden="true" />
        <path class="cc-limit is-lcl" :d="panel.lclPath" aria-hidden="true" />
        <path class="cc-cl" :d="panel.clPath" aria-hidden="true" />

        <!-- 資料 -->
        <path class="cc-line" :d="panel.linePath" :style="{ stroke: lineColor }" aria-hidden="true" />
        <template v-if="panel.showPoints">
          <circle
            v-for="p in panel.points"
            v-show="!p.violation"
            :key="p.index"
            class="cc-point"
            :cx="p.x" :cy="p.y" r="3.5"
            :style="{ fill: lineColor }"
          />
        </template>
        <!-- 異常點：紅色菱形 + 規則編號（不只靠顏色） -->
        <g v-for="p in panel.points.filter((q) => q.violation)" :key="`v${p.index}`" class="cc-violation" aria-hidden="true">
          <path :d="diamond(p.x, p.y, 6)" />
          <text :x="p.x" :y="p.y - 11" text-anchor="middle">{{ p.violation }}</text>
        </g>

        <!-- 滑鼠所在的點 -->
        <g v-if="hoverMarks[pi]" class="cc-hover" aria-hidden="true">
          <line :x1="hoverMarks[pi]!.x" :x2="hoverMarks[pi]!.x" :y1="0" :y2="panel.height" />
          <circle v-if="hoverMarks[pi]!.y !== null" :cx="hoverMarks[pi]!.x" :cy="hoverMarks[pi]!.y!" r="5" :style="{ fill: lineColor }" />
        </g>

        <!-- 右側的界限數值 -->
        <text
          v-for="lab in panel.labels"
          :key="lab.key"
          class="cc-limit-label"
          :class="lab.kind"
          :x="plotWidth + 6"
          :y="lab.y"
          dominant-baseline="central"
        >{{ lab.text }}</text>
      </g>

      <!-- X 軸（樣本） -->
      <g :transform="`translate(${margin.left}, ${xAxisTop})`" class="cc-x-axis" aria-hidden="true">
        <text v-for="t in xTicks" :key="t.index" :x="t.x" y="14" text-anchor="middle">{{ t.label }}</text>
      </g>
    </svg>

    <p v-if="!samples.length" class="absolute inset-0 flex items-center justify-center text-sm text-content-tertiary">{{ emptyText }}</p>

    <!-- 讀螢幕：方向鍵移動時唸出目前的點 -->
    <p class="sr-only" aria-live="polite">{{ liveText }}</p>

    <slot name="tooltip" :tooltip-data="tooltipData" :tooltip-visible="tooltipVisible">
      <div
        v-if="tooltipVisible && tooltipData && enableTooltip"
        class="pointer-events-none absolute z-30 min-w-40 max-w-72 rounded-md border border-stroke-light bg-surface-primary px-2.5 py-1.5 text-xs shadow-lg"
        role="tooltip"
        :style="tooltipStyle"
      >
        <div class="flex items-baseline gap-1.5">
          <span class="text-sm font-semibold text-content-primary">{{ tooltipData.valueText }}</span>
          <span class="text-content-secondary">{{ tooltipData.label }}</span>
        </div>
        <div v-for="line in tooltipLines" :key="line" class="text-content-secondary">{{ line }}</div>
        <div v-for="r in tooltipData.violations" :key="r" class="mt-0.5 flex items-start gap-1 text-content-primary">
          <span class="cc-tip-icon" aria-hidden="true">!</span>
          <span>規則 {{ r }}：{{ ruleText(r) }}</span>
        </div>
      </div>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import * as d3 from 'd3'
import { chartPalette } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import {
  NELSON_RULES,
  buildSamples,
  checkRules,
  computeLimits,
  type ControlAnalysis,
  type ControlChartType,
  type FixedLimits,
  type LimitSeries,
  type SpcSample,
  type Violation,
} from './utils/spc'
import { tooltipPlacement } from './utils/tooltipPlacement'

/**
 * ControlChart —— SPC 管制圖
 *
 * - I-MR、X̄-R、X̄-S、p、u 五種；計量值圖下方有副圖（移動全距／全距／標準差）
 * - 自動計算中心線與 ±3σ 管制界限；子組大小或樣本數不同時，界限逐點計算
 * - Nelson 判異規則（可選），異常點畫成紅色菱形並標上規則編號
 * - baselineCount：用前 N 點建立界限（第一階段），之後的點拿來監控
 * - limits：直接指定已核定的界限
 */

type Row = Record<string, unknown>

/** 點的事件 payload */
export interface ControlChartPoint {
  index: number
  label: string
  /** 主圖的值（量測值、子組平均、不良率…） */
  value: number | null
  /** 副圖的值（移動全距、全距、標準差） */
  secondary: number | null
  /** 子組大小或樣本數 */
  n: number
  /** 這一點的原始資料（子組時是多筆） */
  rows: Row[]
  /** 觸發的判異規則編號 */
  violations: number[]
  ucl: number
  cl: number
  lcl: number
}

export interface ControlChartTooltip extends ControlChartPoint {
  valueText: string
  position: { containerX: number; containerY: number }
}

/** analysis-change 的 payload */
export interface ControlChartAnalysis {
  type: ControlChartType
  /** 主圖的界限（樣本數不同時取最後一點） */
  limits: { cl: number; ucl: number; lcl: number }
  secondaryLimits: { cl: number; ucl: number; lcl: number } | null
  /** 估計的製程標準差（計量值圖） */
  sigma: number | null
  /** 主圖的異常點 */
  violations: Violation[]
  /** 副圖的異常點（只檢查規則 1） */
  secondaryViolations: Violation[]
}

/** 規格界限 */
export interface ControlChartSpec {
  lsl?: number | null
  usl?: number | null
  target?: number | null
}

interface ControlChartProps {
  // === 基礎配置 ===
  width?: number
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  /** 右邊要留給界限數值 */
  margin?: { top: number; right: number; bottom: number; left: number }

  // === 數據配置 ===
  /** 量測資料（I-MR、X̄ 圖）或每批的不良數（p、u 圖）；I-MR 也可以直接給數字陣列 */
  data: Array<Row | number>

  // === 欄位映射（支援任意資料結構）===
  valueField?: string
  labelField?: string
  /** X̄ 圖：子組欄位（同值的列為一組）；沒有此欄位時依 subgroupSize 依序切 */
  subgroupField?: string
  subgroupSize?: number
  /** p、u 圖：不良數（缺點數）與樣本數（檢驗單位數）欄位 */
  defectsField?: string
  sizeField?: string

  // === 管制圖配置 ===
  type?: ControlChartType
  /** 指定主圖的界限（已核定的界限）；優先於計算值 */
  limits?: FixedLimits | null
  /** 指定副圖的界限 */
  secondaryLimits?: FixedLimits | null
  /** 只用前 N 點計算界限（第一階段建立界限、之後監控） */
  baselineCount?: number | null
  /** 要檢查的 Nelson 判異規則（1～8） */
  rules?: number[]
  /** 規格界限（畫在主圖上，與管制界限不同） */
  specLimits?: ControlChartSpec | null

  // === 視覺配置 ===
  title?: string
  valueFormat?: ((value: number) => string) | null
  /** 畫出 ±1σ、±2σ 區帶 */
  showZones?: boolean
  /** 計量值圖顯示副圖 */
  showSecondary?: boolean
  /** 副圖佔的高度比例 */
  secondaryRatio?: number
  /** 畫出每一點；null 時點數少於 80 才畫 */
  showPoints?: boolean | null
  emptyText?: string

  // === 互動配置 ===
  enableTooltip?: boolean

  // === 企業級擴展點 ===
  customRenderers?: {
    /** 自訂提示框內容（每行一個字串，數值與標籤之下、異常規則之上） */
    tooltip?: (point: ControlChartPoint) => string[]
  }
}

const props = withDefaults(defineProps<ControlChartProps>(), {
  width: 800,
  height: 440,
  autoResize: false,
  debounceDelay: 150,
  margin: () => ({ top: 20, right: 84, bottom: 28, left: 56 }),
  valueField: 'value',
  labelField: 'label',
  subgroupField: 'subgroup',
  subgroupSize: 5,
  defectsField: 'defects',
  sizeField: 'size',
  type: 'imr',
  limits: null,
  secondaryLimits: null,
  baselineCount: null,
  rules: () => [1, 2, 3, 5, 6],
  specLimits: null,
  title: '',
  valueFormat: null,
  showZones: false,
  showSecondary: true,
  secondaryRatio: 0.32,
  showPoints: null,
  emptyText: '沒有資料',
  enableTooltip: true,
  customRenderers: () => ({}),
})

const emit = defineEmits<{
  'chart-ready': [payload: { width: number; height: number }]
  'chart-resize': [payload: { width: number; height: number }]
  'point-hover': [payload: ControlChartPoint]
  'point-click': [payload: ControlChartPoint]
  'tooltip-show': [payload: ControlChartTooltip]
  'tooltip-hide': []
  'analysis-change': [payload: ControlChartAnalysis]
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const { effectiveWidth, effectiveHeight } = useAutoResize(containerRef, props, (size) => emit('chart-resize', size))

const containerStyle = computed(() =>
  props.autoResize ? { width: '100%', height: '100%' } : { width: `${props.width}px`, height: `${props.height}px` }
)

// === 計算 ===

const rows = computed<Row[]>(() =>
  (props.data ?? []).map((d) => (typeof d === 'number' ? { [props.valueField]: d } : (toRaw(d) as Row)))
)

const samples = computed<SpcSample[]>(() =>
  buildSamples(props.type, rows.value, {
    valueField: props.valueField,
    labelField: props.labelField,
    subgroupField: props.subgroupField,
    subgroupSize: props.subgroupSize,
    defectsField: props.defectsField,
    sizeField: props.sizeField,
  })
)

const analysis = computed<ControlAnalysis>(() =>
  computeLimits(props.type, samples.value, props.baselineCount, { main: props.limits, secondary: props.secondaryLimits })
)

const violations = computed(() =>
  checkRules(
    samples.value.map((s) => s.value),
    analysis.value.main,
    props.rules.filter((r) => r >= 1 && r <= 8)
  )
)

const secondaryViolations = computed(() =>
  analysis.value.secondary ? checkRules(samples.value.map((s) => s.secondary), analysis.value.secondary, [1]) : []
)

const violationMap = computed(() => new Map(violations.value.map((v) => [v.index, v.rules])))
const secondaryViolationMap = computed(() => new Map(secondaryViolations.value.map((v) => [v.index, v.rules])))

const hasSecondary = computed(() => props.showSecondary && analysis.value.secondary !== null)

const last = <T,>(arr: T[]) => arr[arr.length - 1]

const analysisPayload = computed<ControlChartAnalysis>(() => {
  const a = analysis.value
  const pick = (l: LimitSeries) => ({ cl: last(l.cl), ucl: last(l.ucl), lcl: last(l.lcl) })
  return {
    type: a.type,
    limits: pick(a.main),
    secondaryLimits: a.secondary ? pick(a.secondary) : null,
    sigma: a.sigmaHat,
    violations: violations.value,
    secondaryViolations: secondaryViolations.value,
  }
})

watch(analysisPayload, (p) => emit('analysis-change', p))

// === 格式 ===

const TYPE_LABELS: Record<ControlChartType, [string, string]> = {
  imr: ['個別值（I）', '移動全距（MR）'],
  'xbar-r': ['平均（X̄）', '全距（R）'],
  'xbar-s': ['平均（X̄）', '標準差（S）'],
  p: ['不良率（p）', ''],
  u: ['單位缺點數（u）', ''],
}

const percent = d3.format('.2%')
const decimal = d3.format(',.4~f')
function fmt(v: number): string {
  if (props.valueFormat) return props.valueFormat(v)
  return props.type === 'p' ? percent(v) : decimal(v)
}

function ruleText(rule: number): string {
  return NELSON_RULES[rule] ?? ''
}

// === 版面 ===

const TITLE_H = 24
const PANEL_GAP = 30

const svgHeight = computed(() => Math.max(0, effectiveHeight.value - (props.title ? TITLE_H : 0)))
const plotWidth = computed(() => Math.max(0, effectiveWidth.value - props.margin.left - props.margin.right))
const plotHeight = computed(() => Math.max(0, svgHeight.value - props.margin.top - props.margin.bottom))

const xScale = computed(() =>
  d3
    .scalePoint<number>()
    .domain(d3.range(samples.value.length))
    .range([0, plotWidth.value])
    .padding(0.5)
)

const pointsVisible = computed(() => props.showPoints ?? samples.value.length <= 80)

const lineColor = computed(() => chartPalette.primary)

/** 菱形路徑 */
function diamond(x: number, y: number, r: number): string {
  return `M${x},${y - r} L${x + r},${y} L${x},${y + r} L${x - r},${y} Z`
}

/** 逐點的界限畫成折線；全部相同時就是一條直線（樣本數不同時是階梯） */
function stepPath(values: number[], ys: d3.ScaleLinear<number, number>): string {
  const xs = xScale.value
  const n = values.length
  if (!n) return ''
  const half = n > 1 ? xs.step() / 2 : plotWidth.value / 2
  let d = ''
  for (let i = 0; i < n; i++) {
    const v = values[i]
    if (!Number.isFinite(v)) continue
    const x = xs(i) ?? 0
    const y = ys(v)
    const x0 = i === 0 ? 0 : x - half
    const x1 = i === n - 1 ? plotWidth.value : x + half
    d += `${d && Number.isFinite(values[i - 1]) ? 'L' : 'M'}${x0},${y} H${x1}`
  }
  return d
}

interface PanelView {
  key: string
  label: string
  top: number
  height: number
  ticks: { value: number; y: number; label: string }[]
  uclPath: string
  lclPath: string
  clPath: string
  linePath: string
  zones: { key: string; d: string }[]
  specs: { key: string; y: number }[]
  points: { index: number; x: number; y: number; violation: string }[]
  showPoints: boolean
  labels: { key: string; y: number; text: string; kind: string }[]
  values: (number | null)[]
  yScale: d3.ScaleLinear<number, number>
}

function buildPanel(
  key: string,
  label: string,
  top: number,
  height: number,
  values: (number | null)[],
  limits: LimitSeries,
  vmap: Map<number, number[]>,
  specs: { kind: string; value: number; text: string }[]
): PanelView {
  // Y 範圍：資料、界限與規格線都要放得下，上下留一點
  const all: number[] = []
  for (const v of values) if (v !== null && Number.isFinite(v)) all.push(v)
  for (const arr of [limits.ucl, limits.lcl, limits.cl]) for (const v of arr) if (Number.isFinite(v)) all.push(v)
  for (const s of specs) all.push(s.value)
  let lo = all.length ? Math.min(...all) : 0
  let hi = all.length ? Math.max(...all) : 1
  if (lo === hi) {
    lo -= 1
    hi += 1
  }
  const pad = (hi - lo) * 0.08
  const ys = d3.scaleLinear().domain([lo - pad, hi + pad]).range([height, 0])
  const xs = xScale.value
  const tickCount = Math.max(2, Math.floor(height / 40))

  const line = d3
    .line<number | null>()
    .defined((v) => v !== null && Number.isFinite(v))
    .x((_, i) => xs(i) ?? 0)
    .y((v) => ys(v as number))

  const zones: { key: string; d: string }[] = []
  for (const m of [-2, -1, 1, 2]) {
    zones.push({ key: `z${m}`, d: stepPath(limits.cl.map((c, i) => c + m * limits.sigma[i]), ys) })
  }

  // 右側數值：太近時往外推開，不疊在一起
  const raw = [
    { key: 'ucl', value: last(limits.ucl), text: `UCL ${fmt(last(limits.ucl))}`, kind: 'is-ucl' },
    { key: 'cl', value: last(limits.cl), text: `CL ${fmt(last(limits.cl))}`, kind: 'is-cl' },
    { key: 'lcl', value: last(limits.lcl), text: `LCL ${fmt(last(limits.lcl))}`, kind: 'is-lcl' },
    ...specs.map((s) => ({ key: s.kind, value: s.value, text: `${s.text} ${fmt(s.value)}`, kind: 'is-spec' })),
  ]
    .filter((l) => Number.isFinite(l.value))
    .map((l) => ({ ...l, y: ys(l.value) }))
    .sort((a, b) => a.y - b.y)
  for (let i = 1; i < raw.length; i++) {
    if (raw[i].y - raw[i - 1].y < 12) raw[i].y = raw[i - 1].y + 12
  }

  return {
    key,
    label,
    top,
    height,
    ticks: ys.ticks(tickCount).map((v) => ({ value: v, y: ys(v), label: fmt(v) })),
    uclPath: stepPath(limits.ucl, ys),
    lclPath: stepPath(limits.lcl, ys),
    clPath: stepPath(limits.cl, ys),
    linePath: line(values) ?? '',
    zones,
    specs: specs.map((s) => ({ key: s.kind, y: ys(s.value) })),
    points: values
      .map((v, i) => ({ v, i }))
      .filter((p) => p.v !== null && Number.isFinite(p.v))
      .map((p) => ({ index: p.i, x: xs(p.i) ?? 0, y: ys(p.v as number), violation: (vmap.get(p.i) ?? []).join(',') })),
    showPoints: pointsVisible.value,
    labels: raw.map(({ key: k, y, text, kind }) => ({ key: k, y, text, kind })),
    values,
    yScale: ys,
  }
}

const panels = computed<PanelView[]>(() => {
  if (!samples.value.length || plotWidth.value <= 0 || plotHeight.value <= 0) return []
  const a = analysis.value
  const [mainLabel, secLabel] = TYPE_LABELS[props.type]
  const total = plotHeight.value
  const secH = hasSecondary.value ? Math.max(40, (total - PANEL_GAP) * Math.min(0.6, Math.max(0.15, props.secondaryRatio))) : 0
  const mainH = hasSecondary.value ? total - PANEL_GAP - secH : total
  const spec = props.specLimits
  const specs = [
    { kind: 'usl', value: spec?.usl, text: 'USL' },
    { kind: 'target', value: spec?.target, text: '目標' },
    { kind: 'lsl', value: spec?.lsl, text: 'LSL' },
  ].filter((s): s is { kind: string; value: number; text: string } => typeof s.value === 'number' && Number.isFinite(s.value))
  const out = [
    buildPanel('main', mainLabel, props.margin.top, mainH, samples.value.map((s) => s.value), a.main, violationMap.value, specs),
  ]
  if (hasSecondary.value && a.secondary) {
    out.push(
      buildPanel('secondary', secLabel, props.margin.top + mainH + PANEL_GAP, secH, samples.value.map((s) => s.secondary), a.secondary, secondaryViolationMap.value, [])
    )
  }
  return out
})

/**
 * 滑鼠所在的點（每個面板一個）。
 * ✅ 與面板分開算：滑鼠移動只重算這幾個座標，不重畫整條線與所有點
 */
const hoverMarks = computed(() =>
  panels.value.map((p) => {
    const i = hoverIndex.value
    if (i < 0) return null
    const v = p.values[i]
    return { x: xScale.value(i) ?? 0, y: v !== null && v !== undefined && Number.isFinite(v) ? p.yScale(v) : null }
  })
)

const xAxisTop = computed(() => props.margin.top + plotHeight.value + 4)

/** X 軸標籤：依寬度抽樣，標籤之間至少 56px */
const xTicks = computed(() => {
  const n = samples.value.length
  if (!n || plotWidth.value <= 0) return []
  const xs = xScale.value
  const every = Math.max(1, Math.ceil(56 / Math.max(1, xs.step())))
  const out: { index: number; x: number; label: string }[] = []
  for (let i = 0; i < n; i += every) out.push({ index: i, x: xs(i) ?? 0, label: samples.value[i].label })
  return out
})

const ariaSummary = computed(() => {
  const p = analysisPayload.value
  const name = props.title || `管制圖（${TYPE_LABELS[props.type][0]}）`
  if (!samples.value.length) return `${name}：沒有資料`
  const outCount = violations.value.length + secondaryViolations.value.length
  return `${name}：${samples.value.length} 點，CL ${fmt(p.limits.cl)}、UCL ${fmt(p.limits.ucl)}、LCL ${fmt(p.limits.lcl)}；${outCount ? `${outCount} 點異常` : '沒有異常點'}。可用方向鍵逐點查看`
})

// === 互動 ===

const hoverIndex = ref(-1)
const tooltipData = ref<ControlChartTooltip | null>(null)
const tooltipVisible = ref(false)
const liveText = ref('')

function pointOf(i: number): ControlChartPoint {
  const s = samples.value[i]
  const m = analysis.value.main
  return {
    index: i,
    label: s.label,
    value: s.value,
    secondary: s.secondary,
    n: s.n,
    rows: s.rows,
    violations: [...new Set([...(violationMap.value.get(i) ?? []), ...(secondaryViolationMap.value.get(i) ?? [])])].sort(),
    ucl: m.ucl[i],
    cl: m.cl[i],
    lcl: m.lcl[i],
  }
}

const tooltipLines = computed(() => {
  const t = tooltipData.value
  if (!t) return []
  if (props.customRenderers.tooltip) return props.customRenderers.tooltip(t)
  const lines: string[] = []
  const secLabel = TYPE_LABELS[props.type][1]
  if (t.secondary !== null && secLabel) lines.push(`${secLabel}：${fmt(t.secondary)}`)
  if (props.type !== 'imr') lines.push(props.type === 'p' || props.type === 'u' ? `樣本數：${t.n}` : `子組大小：${t.n}`)
  lines.push(`UCL ${fmt(t.ucl)} · CL ${fmt(t.cl)} · LCL ${fmt(t.lcl)}`)
  return lines
})

const tooltipStyle = computed(() => {
  const t = tooltipData.value
  if (!t) return {}
  return tooltipPlacement(t.position.containerX, t.position.containerY, effectiveWidth.value, effectiveHeight.value, 240, 120)
})

function show(i: number, x: number, y: number): void {
  if (i < 0 || i >= samples.value.length) return
  const changed = i !== hoverIndex.value
  hoverIndex.value = i
  const p = pointOf(i)
  tooltipData.value = { ...p, valueText: p.value === null ? '—' : fmt(p.value), position: { containerX: x, containerY: y } }
  tooltipVisible.value = true
  if (changed) {
    emit('point-hover', p)
    emit('tooltip-show', tooltipData.value)
    liveText.value = `${p.label}：${tooltipData.value.valueText}${p.violations.length ? `，異常（規則 ${p.violations.join('、')}）` : ''}`
  }
}

/** 游標最近的樣本點 */
function nearestIndex(mx: number): number {
  const n = samples.value.length
  if (!n) return -1
  const step = xScale.value.step()
  const i = Math.round(mx / step - 0.5)
  return Math.min(n - 1, Math.max(0, i))
}

function onMove(event: MouseEvent): void {
  if (!svgRef.value || !samples.value.length) return
  const [sx, sy] = d3.pointer(event, svgRef.value)
  const mx = sx - props.margin.left
  if (mx < 0 || mx > plotWidth.value || sy < props.margin.top || sy > props.margin.top + plotHeight.value) {
    clearHover()
    return
  }
  const rect = containerRef.value?.getBoundingClientRect()
  show(nearestIndex(mx), event.clientX - (rect?.left ?? 0), event.clientY - (rect?.top ?? 0))
}

function onClick(): void {
  if (hoverIndex.value >= 0) emit('point-click', pointOf(hoverIndex.value))
}

/** 方向鍵逐點移動（Home／End 跳到頭尾），Enter 等同點擊 */
function onKeydown(event: KeyboardEvent): void {
  const n = samples.value.length
  if (!n) return
  let i = hoverIndex.value
  if (event.key === 'ArrowRight') i = i < 0 ? 0 : Math.min(n - 1, i + 1)
  else if (event.key === 'ArrowLeft') i = i < 0 ? n - 1 : Math.max(0, i - 1)
  else if (event.key === 'Home') i = 0
  else if (event.key === 'End') i = n - 1
  else if (event.key === 'Enter' && i >= 0) {
    emit('point-click', pointOf(i))
    return
  } else if (event.key === 'Escape') {
    clearHover()
    return
  } else return
  event.preventDefault()
  const x = props.margin.left + (xScale.value(i) ?? 0)
  const v = samples.value[i].value
  const y = (props.title ? TITLE_H : 0) + props.margin.top + (v !== null && panels.value[0] ? panels.value[0].yScale(v) : 0)
  show(i, x, y)
}

function clearHover(): void {
  if (hoverIndex.value < 0) return
  hoverIndex.value = -1
  tooltipVisible.value = false
  emit('tooltip-hide')
}

/** 目前的分析結果（界限與異常點） */
function getAnalysis(): ControlChartAnalysis {
  return analysisPayload.value
}

onMounted(() => {
  emit('analysis-change', analysisPayload.value)
  emit('chart-ready', { width: effectiveWidth.value, height: effectiveHeight.value })
})

defineExpose({ getAnalysis, containerRef })
</script>

<style scoped>
.control-chart {
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.cc-title {
  height: 24px;
  line-height: 24px;
  padding: 0 8px;
}

.cc-svg {
  display: block;
  overflow: visible;
  outline: none;
}

.cc-svg:focus-visible {
  outline: 2px solid rgb(var(--t-stroke-focus));
  outline-offset: 2px;
  border-radius: 4px;
}

.cc-grid line {
  stroke: rgb(var(--t-stroke-light));
  shape-rendering: crispEdges;
}

.cc-tick,
.cc-x-axis text {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  fill: rgb(var(--t-content-tertiary));
}

.cc-panel-label {
  font-size: 11px;
  font-weight: 600;
  fill: rgb(var(--t-content-secondary));
}

.cc-zones path {
  fill: none;
  stroke: rgb(var(--t-stroke-default));
  stroke-width: 1;
}

.cc-spec line {
  stroke: rgb(var(--t-warning-solid));
  stroke-width: 1.5;
}

/* 管制界限：門檻線用虛線，中心線用實線 */
.cc-limit {
  fill: none;
  stroke: rgb(var(--t-danger-solid));
  stroke-width: 1.5;
  stroke-dasharray: 6 4;
}

.cc-cl {
  fill: none;
  stroke: rgb(var(--t-content-secondary));
  stroke-width: 1.5;
}

.cc-line {
  fill: none;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.cc-point {
  stroke: rgb(var(--t-surface-primary));
  stroke-width: 2;
}

.cc-violation path {
  fill: rgb(var(--t-danger-solid));
  stroke: rgb(var(--t-surface-primary));
  stroke-width: 2;
}

.cc-violation text {
  font-size: 10px;
  font-weight: 600;
  fill: rgb(var(--t-content-primary));
}

.cc-hover line {
  stroke: rgb(var(--t-stroke-medium));
  stroke-width: 1;
  shape-rendering: crispEdges;
}

.cc-hover circle {
  stroke: rgb(var(--t-surface-primary));
  stroke-width: 2;
}

.cc-limit-label {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  fill: rgb(var(--t-content-secondary));
}

.cc-limit-label.is-ucl,
.cc-limit-label.is-lcl {
  fill: rgb(var(--t-danger));
}

.cc-tip-icon {
  display: inline-flex;
  height: 14px;
  width: 14px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: rgb(var(--t-danger-solid));
  color: rgb(var(--t-content-on-solid));
  font-size: 10px;
  font-weight: 700;
}
</style>
