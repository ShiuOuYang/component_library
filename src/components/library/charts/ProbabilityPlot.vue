<template>
  <div class="probability-plot flex flex-col gap-2" :style="props.autoResize ? { width: '100%', height: '100%' } : { width: `${props.width}px` }">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
      <div v-if="props.showPicker" class="ml-auto inline-flex overflow-hidden rounded-md border border-stroke-default" role="group" :aria-label="i18n.probability.distribution">
        <button
          v-for="d in dists"
          :key="d"
          type="button"
          class="px-2.5 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus"
          :class="dist === d ? 'bg-accent-solid text-white' : 'bg-surface-primary text-content-secondary hover:bg-surface-secondary'"
          :aria-pressed="dist === d"
          @click="setDist(d)"
        >
          {{ i18n.probability.dists[d] }}
        </button>
      </div>
    </div>

    <div ref="containerRef" class="relative min-h-0 flex-1" :style="props.autoResize ? undefined : { height: `${props.height}px` }">
      <p v-if="!fits.length" class="flex h-full items-center justify-center text-sm text-content-tertiary">{{ props.emptyText ?? i18n.probability.empty }}</p>
      <svg v-else :width="effectiveWidth" :height="effectiveHeight" class="block select-none" role="img" :aria-label="ariaLabel" @mouseleave="hover = null">
        <!-- 格線與刻度 -->
        <g>
          <g v-for="t in yTickList" :key="`y${t}`">
            <line :x1="M.left" :x2="effectiveWidth - M.right" :y1="y(probToY(t, dist))" :y2="y(probToY(t, dist))" :style="{ stroke: chartTheme.grid }" />
            <text :x="M.left - 6" :y="y(probToY(t, dist))" dy="0.32em" text-anchor="end" font-size="11" :style="{ fill: chartTheme.textMuted }">{{ pctTick(t) }}</text>
          </g>
          <g v-for="t in xTickList" :key="`x${t}`">
            <line :x1="x(valueToX(t, dist))" :x2="x(valueToX(t, dist))" :y1="M.top" :y2="M.top + plotH" :style="{ stroke: chartTheme.grid }" />
            <text :x="x(valueToX(t, dist))" :y="M.top + plotH + 16" text-anchor="middle" font-size="11" :style="{ fill: chartTheme.textMuted }">{{ fmt(t) }}</text>
          </g>
          <text :x="M.left - 6" :y="M.top - 14" text-anchor="end" font-size="11" :style="{ fill: chartTheme.textMuted }">%</text>
          <text v-if="props.unit" :x="effectiveWidth - M.right" :y="M.top + plotH + 32" text-anchor="end" font-size="11" :style="{ fill: chartTheme.textMuted }">{{ props.unit }}</text>
        </g>

        <defs>
          <clipPath :id="clipId"><rect :x="M.left" :y="M.top" :width="Math.max(0, effectiveWidth - M.left - M.right)" :height="plotH" /></clipPath>
        </defs>
        <g v-for="(f, si) in fits" :key="f.name">
          <!-- 信賴帶 -->
          <path v-if="props.showBand && f.fit.ad === f.fit.ad" :clip-path="`url(#${clipId})`" :d="bandPath(f.fit)" :style="{ fill: 'none', stroke: f.color }" stroke-width="1" stroke-dasharray="4 3" opacity="0.8" />
          <!-- 配適線 -->
          <path v-if="f.fit.ad === f.fit.ad" :clip-path="`url(#${clipId})`" :d="linePath(f.fit)" :style="{ fill: 'none', stroke: f.color }" stroke-width="1.75" />
          <!-- 點 -->
          <g v-for="pt in f.fit.points" :key="pt.index">
            <circle
              :cx="x(valueToX(pt.value, dist))"
              :cy="y(probToY(pt.p, dist))"
              :r="hover && hover.si === si && hover.index === pt.index ? 5.5 : 3.5"
              :style="{ fill: outside(f.fit, pt) ? chartPalette.critical : f.color, stroke: chartTheme.surface }"
              stroke-width="1"
              class="cursor-pointer"
              @mouseenter="hover = { si, index: pt.index }"
              @click="emit('point-click', { series: f.name, value: pt.value, index: pt.index, rank: pt.rank, p: pt.p })"
            />
          </g>
        </g>
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

    <!-- 統計 -->
    <div v-if="props.showStats && fits.length" class="overflow-x-auto">
      <table class="w-full whitespace-nowrap text-xs">
        <caption class="sr-only">{{ i18n.probability.statsCaption(i18n.probability.dists[dist]) }}</caption>
        <thead class="text-left text-content-secondary">
          <tr>
            <th v-if="fits.length > 1 || props.series" scope="col" class="px-2 py-1 font-medium"></th>
            <th scope="col" class="px-2 py-1 text-right font-medium">N</th>
            <th scope="col" class="px-2 py-1 text-right font-medium">{{ dist === 'weibull' ? i18n.probability.shape : i18n.probability.mean }}</th>
            <th scope="col" class="px-2 py-1 text-right font-medium">{{ dist === 'weibull' ? i18n.probability.scale : i18n.probability.sd }}</th>
            <th scope="col" class="px-2 py-1 text-right font-medium">AD</th>
            <th scope="col" class="px-2 py-1 text-right font-medium">{{ i18n.probability.pValue }}</th>
            <th scope="col" class="px-2 py-1 font-medium">{{ i18n.probability.verdict }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stroke-light">
          <tr v-for="f in fits" :key="f.name" class="text-content-primary">
            <th v-if="fits.length > 1 || props.series" scope="row" class="whitespace-nowrap px-2 py-1 text-left font-medium">
              <span class="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" :style="{ background: f.color }" aria-hidden="true"></span>{{ f.name }}
            </th>
            <td class="px-2 py-1 text-right tabular-nums">{{ f.fit.n }}<span v-if="f.fit.excluded" class="text-content-tertiary">{{ i18n.probability.excluded(f.fit.excluded) }}</span></td>
            <td class="px-2 py-1 text-right tabular-nums">{{ dist === 'weibull' ? num(f.fit.params.shape!) : sig(f.fit.mean) }}</td>
            <td class="px-2 py-1 text-right tabular-nums">{{ dist === 'weibull' ? sig(f.fit.params.scale) : sig(f.fit.sd) }}</td>
            <td class="px-2 py-1 text-right tabular-nums">{{ num(f.fit.ad) }}</td>
            <td class="px-2 py-1 text-right tabular-nums">{{ pText(f.fit) }}</td>
            <td class="px-2 py-1" :style="{ color: verdictOk(f.fit) ? chartTheme.textMuted : chartTheme.danger }">
              {{ f.fit.ad !== f.fit.ad ? '—' : verdictOk(f.fit) ? i18n.probability.fits : i18n.probability.notFits }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="fits.length" class="text-xs text-content-tertiary">{{ i18n.probability.hint(String(props.alpha)) }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import * as d3 from 'd3'
import { chartPalette, chartTheme } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { tooltipPlacement } from './utils/tooltipPlacement'
import {
  bandHalfWidth,
  fitProbability,
  fitX,
  probToY,
  probabilityTicks,
  valueToX,
  xToValue,
  type ProbabilityDistribution,
  type ProbabilityFit,
  type ProbabilityPoint,
} from './utils/probability'
import { useLocale } from '../shared/config'

/**
 * ProbabilityPlot —— 機率圖（常態 / 對數常態 / Weibull）
 *
 * 用途：做製程能力（Cpk）或管制圖之前，先確認資料是否符合假設的分配。點落在直線附近 = 符合；
 * 彎曲、S 形、尾巴翹起 = 不符合（偏態、雙峰、離群）。附 Anderson-Darling 檢定的 p 值（p < α 判定不符合）。
 *
 * - 縱軸是累積機率（%），依分配換算座標；對數常態與 Weibull 的橫軸是對數
 * - 實線是配適的分配，虛線是 95% 信賴帶；落在帶外的點標紅
 * - series 可以同時比較多組（例如兩條線、兩個模具）
 * - 統計表：N、平均 / 標準差（Weibull 為形狀 / 尺度）、AD、p 值、判定
 */

export interface ProbabilitySeries {
  name: string
  values: unknown[]
  color?: string
}

interface ProbabilityPlotProps {
  /** 單一組資料（與 series 二擇一） */
  values?: unknown[]
  /** 多組資料 */
  series?: ProbabilitySeries[] | null
  /** v-model:distribution */
  distribution?: ProbabilityDistribution
  /** 顯示分配切換 */
  showPicker?: boolean
  /** 95% 信賴帶 */
  showBand?: boolean
  /** 統計表 */
  showStats?: boolean
  /** 顯著水準：p < alpha 判定不符合 */
  alpha?: number
  title?: string
  unit?: string
  width?: number
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  valueFormat?: ((value: number) => string) | null
  emptyText?: string
}

const i18n = useLocale()
const props = withDefaults(defineProps<ProbabilityPlotProps>(), {
  values: () => [],
  series: null,
  distribution: 'normal',
  showPicker: true,
  showBand: true,
  showStats: true,
  alpha: 0.05,
  title: '',
  unit: '',
  width: 560,
  height: 380,
  autoResize: false,
  debounceDelay: 100,
  valueFormat: null,
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'update:distribution', d: ProbabilityDistribution): void
  (e: 'point-click', detail: { series: string; value: number; index: number; rank: number; p: number }): void
  (e: 'chart-resize', size: { width: number; height: number }): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const { effectiveWidth, effectiveHeight } = useAutoResize(containerRef, props, (size) => emit('chart-resize', size))

// ---- 分配 ----
const dists: ProbabilityDistribution[] = ['normal', 'lognormal', 'weibull']
const localDist = ref<ProbabilityDistribution>(props.distribution)
watch(
  () => props.distribution,
  (d) => (localDist.value = d)
)
const dist = computed(() => localDist.value)
function setDist(d: ProbabilityDistribution): void {
  localDist.value = d
  hover.value = null
  emit('update:distribution', d)
}

// ---- 配適 ----
const fits = computed(() => {
  const list: ProbabilitySeries[] = props.series ?? [{ name: props.title || i18n.value.probability.data, values: props.values }]
  return list
    .map((s, i) => ({ name: s.name, color: s.color ?? chartPalette.categorical[i] ?? chartPalette.other, fit: fitProbability(s.values, dist.value) }))
    .filter((f): f is { name: string; color: string; fit: ProbabilityFit } => f.fit !== null)
})

// ---- 版面 ----
const M = { top: 26, right: 14, bottom: 40, left: 46 }
const clipId = `pp-clip-${useId()}`
const plotH = computed(() => Math.max(10, effectiveHeight.value - M.top - M.bottom))
const maxN = computed(() => Math.max(3, ...fits.value.map((f) => f.fit.n)))
const yTickList = computed(() => probabilityTicks(dist.value, maxN.value, plotH.value < 220))
const yDomain = computed(() => {
  const ys = yTickList.value.map((t) => probToY(t, dist.value))
  return [Math.min(...ys), Math.max(...ys)] as [number, number]
})
const y = computed(() => d3.scaleLinear().domain(yDomain.value).range([M.top + plotH.value, M.top]))
const xDomain = computed<[number, number]>(() => {
  const xs = fits.value.flatMap((f) => f.fit.points.map((p) => valueToX(p.value, dist.value)))
  // 配適線在縱軸兩端的位置也要放得下
  for (const f of fits.value) if (f.fit.ad === f.fit.ad) xs.push(fitX(f.fit, yDomain.value[0]), fitX(f.fit, yDomain.value[1]))
  const finite = xs.filter(Number.isFinite)
  let [lo, hi] = d3.extent(finite) as [number, number]
  if (lo === hi) {
    lo -= 1
    hi += 1
  }
  const pad = (hi - lo) * 0.04
  return [lo - pad, hi + pad]
})
const x = computed(() => d3.scaleLinear().domain(xDomain.value).range([M.left, effectiveWidth.value - M.right]))
const xTickList = computed(() => {
  const count = Math.max(2, Math.floor((effectiveWidth.value - M.left - M.right) / 70))
  const [a, b] = xDomain.value
  if (dist.value === 'normal') return d3.scaleLinear().domain([a, b]).ticks(count)
  const ticks = d3.scaleLog().domain([xToValue(a, 'lognormal'), xToValue(b, 'lognormal')]).ticks(count)
  // 對數刻度：太多時只留 1、2、5 開頭的
  return ticks.length > count * 1.5 ? ticks.filter((t) => /^[125]/.test(String(t).replace(/^0\.0*/, ''))) : ticks
})

function linePath(fit: ProbabilityFit): string {
  const [y0, y1] = yDomain.value
  return `M${x.value(fitX(fit, y0))},${y.value(y0)}L${x.value(fitX(fit, y1))},${y.value(y1)}`
}
function bandPath(fit: ProbabilityFit): string {
  const [y0, y1] = yDomain.value
  const ys = d3.range(41).map((i) => y0 + ((y1 - y0) * i) / 40)
  const side = (sign: 1 | -1) => ys.map((yy, i) => `${i ? 'L' : 'M'}${x.value(fitX(fit, yy) + sign * bandHalfWidth(fit, yy))},${y.value(yy)}`).join('')
  return side(-1) + side(1)
}
function outside(fit: ProbabilityFit, pt: ProbabilityPoint): boolean {
  if (!props.showBand || fit.ad !== fit.ad) return false
  const yy = probToY(pt.p, dist.value)
  return Math.abs(valueToX(pt.value, dist.value) - fitX(fit, yy)) > bandHalfWidth(fit, yy)
}

// ---- 文字 ----
const defaultFormat = d3.format(',~f')
const fmt = (v: number) => (props.valueFormat ? props.valueFormat(v) : defaultFormat(Number(v.toPrecision(4))))
const sig = (v: number) => defaultFormat(Number(v.toPrecision(4)))
const num = (v: number) => (Number.isFinite(v) ? d3.format('.3f')(v) : '—')
const pct = (p: number) => `${Number((p * 100).toPrecision(3))}%`
const pctTick = (p: number) => String(Number((p * 100).toPrecision(3)))
const verdictOk = (fit: ProbabilityFit) => fit.ad !== fit.ad || fit.pValue >= props.alpha
function pText(fit: ProbabilityFit): string {
  if (fit.ad !== fit.ad) return '—'
  const v = d3.format('.3f')(fit.pValue)
  return fit.pBound === 'gt' ? `> ${v}` : fit.pBound === 'lt' ? `< ${v}` : v
}

// ---- 提示 ----
const hover = ref<{ si: number; index: number } | null>(null)
const tip = computed(() => {
  const h = hover.value
  if (!h) return null
  const f = fits.value[h.si]
  const pt = f?.fit.points.find((p) => p.index === h.index)
  if (!pt) return null
  const lines = [props.unit ? `${fmt(pt.value)} ${props.unit}` : fmt(pt.value), i18n.value.probability.rank(pt.rank, f.fit.n, pct(pt.p))]
  if (fits.value.length > 1) lines.unshift(f.name)
  if (outside(f.fit, pt)) lines.push(i18n.value.probability.outside)
  return { lines, style: tooltipPlacement(x.value(valueToX(pt.value, dist.value)), y.value(probToY(pt.p, dist.value)), effectiveWidth.value, effectiveHeight.value, 180, 18 * lines.length + 8) }
})

const ariaLabel = computed(() => {
  const d = i18n.value.probability.dists[dist.value]
  const parts = fits.value.map((f) => i18n.value.probability.seriesLabel(f.name, f.fit.n, pText(f.fit), verdictOk(f.fit) ? i18n.value.probability.fits : i18n.value.probability.notFits))
  return i18n.value.probability.ariaLabel(props.title || i18n.value.probability.title, d, parts)
})

defineExpose({
  /** 各組的配適結果 */
  fits: computed(() => fits.value.map((f) => ({ name: f.name, ...f.fit }))),
})
</script>
