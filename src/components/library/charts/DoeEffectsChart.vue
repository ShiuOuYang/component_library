<template>
  <div class="doe-effects-chart flex flex-col gap-2" :style="props.autoResize ? { width: '100%' } : { width: `${props.width}px`, maxWidth: '100%' }">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
      <div class="ml-auto inline-flex overflow-hidden rounded-md border border-stroke-default" role="group" :aria-label="t.viewLabel">
        <button
          v-for="v in VIEWS"
          :key="v"
          type="button"
          class="h-7 px-2.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus"
          :class="view === v ? 'bg-accent-subtle text-accent-on-subtle' : 'bg-surface-primary text-content-secondary hover:bg-surface-secondary'"
          :aria-pressed="view === v"
          :data-view="v"
          @click="setView(v)"
        >
          {{ t.views[v] }}
        </button>
      </div>
    </div>

    <p v-if="invalidText" class="rounded-md bg-warning-subtle px-3 py-2 text-xs text-warning-on-subtle" role="alert" data-invalid>{{ invalidText }}</p>
    <template v-if="ready">
      <!-- 因子對照與分析方法 -->
      <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-content-secondary" data-legend>
        <span v-for="(f, i) in props.factors" :key="f" class="tabular-nums">
          <strong class="text-content-primary">{{ factorLetter(i) }}</strong> {{ t.factorLegend(nameOf(f), levelText(i, 0), levelText(i, 1)) }}
        </span>
      </div>
      <p class="text-xs text-content-secondary" data-method>
        {{ methodText }}
        <span v-if="significant.length" class="ml-1 font-medium" :style="{ color: chartTheme.text }">{{ t.significant(significant.map(termText).join(t.listSep)) }}</span>
        <span v-else-if="analysis.method !== 'none'" class="ml-1">{{ t.noneSignificant }}</span>
      </p>
    </template>

    <div ref="containerRef" class="relative overflow-x-auto">
      <p v-if="!ready" class="py-10 text-center text-sm text-content-tertiary">{{ props.emptyText ?? t.empty }}</p>

      <!-- 標準化效果柏拉圖 -->
      <svg v-else-if="view === 'pareto'" :width="svgWidth" :height="paretoHeight" class="block" role="img" :aria-label="paretoLabel" data-chart="pareto">
        <g aria-hidden="true">
          <template v-for="tk in paretoTicks" :key="tk">
            <line :x1="px(tk)" :x2="px(tk)" :y1="PM.t" :y2="paretoHeight - PM.b" :style="{ stroke: chartTheme.grid }" />
            <text :x="px(tk)" :y="paretoHeight - PM.b + 14" text-anchor="middle" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ fmtNum(tk) }}</text>
          </template>
          <text :x="(PM.l + svgWidth - PM.r) / 2" :y="paretoHeight - 4" text-anchor="middle" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ hasT ? t.axisT : t.axisEffect }}</text>
        </g>
        <g v-for="(e, i) in sortedEffects" :key="e.term.key" :data-term="e.term.key" :data-significant="e.significant || undefined">
          <text :x="PM.l - 8" :y="rowY(i) + ROW / 2" dy="0.35em" text-anchor="end" font-size="11" :style="{ fill: chartTheme.text, fontWeight: e.significant ? 600 : 400 }" aria-hidden="true">{{ clipText(termText(e), PM.l - 12) }}</text>
          <rect :x="PM.l" :y="rowY(i) + 4" :width="Math.max(1, px(barValue(e)) - PM.l)" :height="ROW - 8" rx="2" :style="{ fill: e.significant ? chartPalette.primary : chartPalette.deemphasis }" />
          <text :x="px(barValue(e)) + 4" :y="rowY(i) + ROW / 2" dy="0.35em" font-size="10" :style="{ fill: chartTheme.textMuted }" aria-hidden="true">{{ signed(e.effect) }}</text>
        </g>
        <g v-if="hasT" aria-hidden="true" data-tcrit>
          <line :x1="px(analysis.tCrit)" :x2="px(analysis.tCrit)" :y1="PM.t - 6" :y2="paretoHeight - PM.b" stroke-dasharray="5 3" :style="{ stroke: chartPalette.critical }" />
          <text :x="px(analysis.tCrit)" :y="PM.t - 9" text-anchor="middle" font-size="10" :style="{ fill: chartTheme.danger }">{{ fmtNum(analysis.tCrit) }}</text>
        </g>
      </svg>

      <!-- 主效果圖 -->
      <svg v-else-if="view === 'main'" :width="svgWidth" :height="props.height" class="block" role="img" :aria-label="mainLabel" data-chart="main">
        <g aria-hidden="true">
          <template v-for="tk in meanTicks" :key="tk">
            <line :x1="MM.l" :x2="svgWidth - MM.r" :y1="my(tk)" :y2="my(tk)" :style="{ stroke: chartTheme.grid }" />
            <text :x="MM.l - 6" :y="my(tk)" dy="0.35em" text-anchor="end" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ fmt(tk) }}</text>
          </template>
          <text v-if="props.unit" :x="MM.l - 6" :y="MM.t - 10" text-anchor="end" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ props.unit }}</text>
          <line :x1="MM.l" :x2="svgWidth - MM.r" :y1="my(analysis.mean)" :y2="my(analysis.mean)" stroke-dasharray="4 3" :style="{ stroke: chartTheme.textMuted }" />
        </g>
        <g v-for="(m, i) in mains" :key="i" :data-factor="i" aria-hidden="true">
          <rect v-if="i % 2 === 0" :x="panelX(i)" :y="MM.t" :width="panelW" :height="props.height - MM.t - MM.b" :style="{ fill: chartTheme.surfaceMuted }" />
          <text :x="panelX(i) + panelW / 2" :y="MM.t - 8" text-anchor="middle" font-size="11" font-weight="600" :style="{ fill: chartTheme.text }">{{ factorLetter(i) }} {{ clipText(nameOf(props.factors[i]), panelW - 20) }}</text>
          <line :x1="lowX(i)" :x2="highX(i)" :y1="my(m.low)" :y2="my(m.high)" stroke-width="2" :style="{ stroke: isMainSignificant(i) ? chartPalette.primary : chartPalette.deemphasis }" />
          <circle :cx="lowX(i)" :cy="my(m.low)" r="4" :style="{ fill: isMainSignificant(i) ? chartPalette.primary : chartPalette.deemphasis }" />
          <circle :cx="highX(i)" :cy="my(m.high)" r="4" :style="{ fill: isMainSignificant(i) ? chartPalette.primary : chartPalette.deemphasis }" />
          <text :x="lowX(i)" :y="props.height - MM.b + 14" text-anchor="middle" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ clipText(levelText(i, 0), panelW / 2) }}</text>
          <text :x="highX(i)" :y="props.height - MM.b + 14" text-anchor="middle" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ clipText(levelText(i, 1), panelW / 2) }}</text>
        </g>
      </svg>

      <!-- 交互作用圖 -->
      <svg v-else :width="svgWidth" :height="interHeight" class="block" role="img" :aria-label="interLabel" data-chart="interaction">
        <g v-for="(p, pi) in pairs" :key="`${p.a}-${p.b}`" :data-pair="`${factorLetter(p.a)}${factorLetter(p.b)}`" aria-hidden="true">
          <rect :x="ipx(pi)" :y="ipy(pi)" :width="iW" :height="iH" :style="{ fill: chartTheme.surfaceMuted }" />
          <text :x="ipx(pi) + iW / 2" :y="ipy(pi) + 14" text-anchor="middle" font-size="11" font-weight="600" :style="{ fill: chartTheme.text }">
            {{ factorLetter(p.a) }}{{ factorLetter(p.b) }}{{ isInterSignificant(p.a, p.b) ? ' *' : '' }}
          </text>
          <template v-for="(line, li) in p.means" :key="li">
            <line
              :x1="ipx(pi) + 24"
              :x2="ipx(pi) + iW - 24"
              :y1="iy(pi, line[0])"
              :y2="iy(pi, line[1])"
              stroke-width="2"
              :stroke-dasharray="li === 0 ? '5 3' : undefined"
              :style="{ stroke: chartPalette.categorical[li] }"
            />
            <circle :cx="ipx(pi) + 24" :cy="iy(pi, line[0])" r="3" :style="{ fill: chartPalette.categorical[li] }" />
            <circle :cx="ipx(pi) + iW - 24" :cy="iy(pi, line[1])" r="3" :style="{ fill: chartPalette.categorical[li] }" />
          </template>
          <text :x="ipx(pi) + 24" :y="ipy(pi) + iH - 6" text-anchor="middle" font-size="9" :style="{ fill: chartTheme.textMuted }">{{ factorLetter(p.a) }}−</text>
          <text :x="ipx(pi) + iW - 24" :y="ipy(pi) + iH - 6" text-anchor="middle" font-size="9" :style="{ fill: chartTheme.textMuted }">{{ factorLetter(p.a) }}+</text>
          <text :x="ipx(pi) + iW - 6" :y="ipy(pi) + 14" text-anchor="end" font-size="9" :style="{ fill: chartPalette.categorical[0] }">{{ factorLetter(p.b) }}− - -</text>
          <text :x="ipx(pi) + iW - 6" :y="ipy(pi) + 26" text-anchor="end" font-size="9" :style="{ fill: chartPalette.categorical[1] }">{{ factorLetter(p.b) }}+ —</text>
        </g>
      </svg>
    </div>
    <p v-if="ready && view === 'interaction'" class="text-xs text-content-tertiary">{{ t.interactionHint }}</p>

    <table v-if="ready" class="sr-only">
      <caption>{{ props.title || t.title }}</caption>
      <thead>
        <tr><th scope="col">{{ t.term }}</th><th scope="col">{{ t.effect }}</th><th scope="col">{{ t.coef }}</th><th scope="col">{{ t.axisT }}</th><th scope="col">{{ t.significantCol }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="e in sortedEffects" :key="e.term.key">
          <th scope="row">{{ termText(e) }}</th>
          <td>{{ signed(e.effect) }}</td>
          <td>{{ signed(e.coef) }}</td>
          <td>{{ Number.isFinite(e.t) ? fmtNum(e.t) : '—' }}</td>
          <td>{{ e.significant ? t.yes : t.no }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import * as d3 from 'd3'
import { chartPalette, chartTheme } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { analyzeDoe, codeDesign, factorLetter, interactionMeans, mainEffectMeans, type DoeEffect } from './utils/doe'
import { useLocale } from '../shared/config'
import { clipText } from '../shared/textClip'

/**
 * DoeEffectsChart —— 實驗設計（2^k 因子實驗）效果圖
 *
 * 三種圖：標準化效果柏拉圖（哪些因子與交互作用顯著，虛線是 t 臨界值）、主效果圖（每個因子低 / 高水準的平均）、
 * 交互作用圖（兩條線不平行就是有交互作用）。有重複實驗時用組內變異判斷顯著，沒有重複時用 Lenth 法。
 */
export interface DoeEffectsChartProps {
  /** 每一列一次實驗（runs） */
  data: Record<string, unknown>[]
  /** 因子欄位（2～6 個；每個剛好兩個水準） */
  factors: string[]
  /** 反應值欄位 */
  response: string
  /** 因子顯示名稱 */
  factorLabels?: Record<string, string>
  /** 指定各因子的 [低, 高] 水準（不給時用出現的兩個值，數字由小到大） */
  levels?: Record<string, [unknown, unknown]>
  /** 分析到幾階交互作用（2 或 3） */
  maxOrder?: number
  /** 顯示哪張圖（v-model:view） */
  view?: 'pareto' | 'main' | 'interaction'
  width?: number
  /** 主效果圖高度（柏拉圖與交互作用圖依項目數自動決定） */
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  title?: string
  unit?: string
  valueFormat?: ((v: number) => string) | null
  emptyText?: string
}

const i18n = useLocale()
const t = computed(() => i18n.value.doe)

const props = withDefaults(defineProps<DoeEffectsChartProps>(), {
  factorLabels: () => ({}),
  levels: () => ({}),
  maxOrder: 2,
  view: undefined,
  width: 760,
  height: 280,
  autoResize: false,
  debounceDelay: 100,
  title: '',
  unit: '',
  valueFormat: null,
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'update:view', view: 'pareto' | 'main' | 'interaction'): void
  (e: 'chart-resize', size: { width: number; height: number }): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const { effectiveWidth } = useAutoResize(containerRef, props as unknown as { width: number; height: number; autoResize: boolean; debounceDelay: number }, (s) => emit('chart-resize', s))

const VIEWS = ['pareto', 'main', 'interaction'] as const
type View = (typeof VIEWS)[number]
const innerView = ref<View>('pareto')
const view = computed<View>(() => props.view ?? innerView.value)
function setView(v: View) {
  innerView.value = v
  emit('update:view', v)
}

// ---- 分析 ----
const k = computed(() => props.factors.length)
const design = computed(() => codeDesign(props.data, props.factors, props.response, props.levels))
const ready = computed(() => k.value >= 1 && design.value.runs.length >= 2)
const analysis = computed(() => analyzeDoe(design.value.runs, k.value, Math.min(3, Math.max(1, props.maxOrder))))
const sortedEffects = computed(() => [...analysis.value.effects].sort((a, b) => Math.abs(barValue(b)) - Math.abs(barValue(a))))
const significant = computed(() => sortedEffects.value.filter((e) => e.significant))
const hasT = computed(() => analysis.value.method !== 'none')
const mains = computed(() => mainEffectMeans(design.value.runs, k.value))
const pairs = computed(() => {
  const out: { a: number; b: number; means: [[number, number], [number, number]] }[] = []
  for (let a = 0; a < k.value; a++) for (let b = a + 1; b < k.value; b++) out.push({ a, b, means: interactionMeans(design.value.runs, a, b) })
  return out
})
const invalidText = computed(() =>
  design.value.invalidFactors.length ? t.value.invalidFactors(design.value.invalidFactors.map((i) => nameOf(props.factors[i])).join(t.value.listSep)) : '',
)

const nameOf = (f: string) => props.factorLabels[f] ?? f
const levelText = (i: number, side: 0 | 1) => String(design.value.levels[i]?.[side] ?? '')
/** 項目名稱：主效果附因子名稱，交互作用只用字母 */
const termText = (e: DoeEffect) => (e.term.factors.length === 1 ? `${e.term.key} ${nameOf(props.factors[e.term.factors[0]])}` : e.term.key)
const isMainSignificant = (i: number) => analysis.value.effects.some((e) => e.significant && e.term.factors.length === 1 && e.term.factors[0] === i)
const isInterSignificant = (a: number, b: number) => analysis.value.effects.some((e) => e.significant && e.term.factors.length === 2 && e.term.factors[0] === a && e.term.factors[1] === b)
const barValue = (e: DoeEffect) => Math.abs(hasT.value ? e.t : e.effect)

// ---- 格式 ----
const fmt = (v: number) => {
  if (!Number.isFinite(v)) return '—'
  if (props.valueFormat) return props.valueFormat(v)
  return d3.format(Math.abs(v) >= 100 ? ',.1f' : '.3~g')(v)
}
const fmtNum = (v: number) => d3.format('.3~g')(v)
const signed = (v: number) => (v > 0 ? `+${fmt(v)}` : fmt(v))
const methodText = computed(() => {
  const a = analysis.value
  if (a.method === 'replicates') return t.value.methodReplicates(a.n, fmtNum(a.df), fmtNum(a.tCrit))
  if (a.method === 'lenth') return t.value.methodLenth(fmt(a.se), fmtNum(a.df), fmtNum(a.tCrit))
  return t.value.methodNone
})

// ---- 柏拉圖 ----
const ROW = 26
const PM = computed(() => ({ l: Math.min(180, Math.max(90, ...props.factors.map((f) => 30 + nameOf(f).length * 12))), r: 56, t: 20, b: 32 }))
const svgWidth = computed(() => Math.max(effectiveWidth.value, 360))
const paretoHeight = computed(() => PM.value.t + PM.value.b + Math.max(1, sortedEffects.value.length) * ROW)
const rowY = (i: number) => PM.value.t + i * ROW
const paretoMax = computed(() => Math.max(hasT.value ? analysis.value.tCrit * 1.15 : 0, ...sortedEffects.value.map(barValue), 1e-9))
const paretoScale = computed(() => d3.scaleLinear().domain([0, paretoMax.value]).range([PM.value.l, svgWidth.value - PM.value.r]).nice())
const px = (v: number) => paretoScale.value(v)
const paretoTicks = computed(() => paretoScale.value.ticks(5))

// ---- 主效果 ----
const MM = { l: 52, r: 12, t: 26, b: 24 }
const panelW = computed(() => (svgWidth.value - MM.l - MM.r) / Math.max(1, k.value))
const panelX = (i: number) => MM.l + i * panelW.value
const lowX = (i: number) => panelX(i) + panelW.value * 0.25
const highX = (i: number) => panelX(i) + panelW.value * 0.75
const meanScale = computed(() => {
  const vals = mains.value.flatMap((m) => [m.low, m.high]).concat(pairs.value.flatMap((p) => p.means.flat()), [analysis.value.mean]).filter(Number.isFinite)
  const [lo, hi] = d3.extent(vals) as [number, number]
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.1
  return d3.scaleLinear().domain([lo - pad, hi + pad]).nice()
})
const myScale = computed(() => meanScale.value.copy().range([props.height - MM.b, MM.t]))
const my = (v: number) => myScale.value(v)
const meanTicks = computed(() => myScale.value.ticks(5))

// ---- 交互作用（小圖排成格子，共用 y 範圍） ----
const iCols = computed(() => Math.max(1, Math.min(3, pairs.value.length, Math.floor(svgWidth.value / 200))))
const iW = computed(() => (svgWidth.value - (iCols.value - 1) * 10) / iCols.value)
const iH = 150
const interHeight = computed(() => Math.max(1, Math.ceil(pairs.value.length / iCols.value)) * (iH + 10))
const ipx = (pi: number) => (pi % iCols.value) * (iW.value + 10)
const ipy = (pi: number) => Math.floor(pi / iCols.value) * (iH + 10)
const iy = (pi: number, v: number) => {
  const [d0, d1] = meanScale.value.domain()
  const top = ipy(pi) + 32
  const bottom = ipy(pi) + iH - 18
  return bottom - ((v - d0) / (d1 - d0 || 1)) * (bottom - top)
}

// ---- 報讀 ----
const paretoLabel = computed(() => `${props.title || t.value.title}: ${t.value.views.pareto}. ${methodText.value}. ${significant.value.length ? t.value.significant(significant.value.map(termText).join(t.value.listSep)) : t.value.noneSignificant}`)
const mainLabel = computed(() =>
  `${t.value.views.main}: ` + mains.value.map((m, i) => t.value.mainItem(`${factorLetter(i)} ${nameOf(props.factors[i])}`, fmt(m.low), fmt(m.high))).join(t.value.listSep),
)
const interLabel = computed(() => `${t.value.views.interaction}. ${t.value.interactionHint}`)

defineExpose({
  /** 分析結果（效果、t 值、顯著性、方法） */
  analysis: () => analysis.value,
})
</script>
