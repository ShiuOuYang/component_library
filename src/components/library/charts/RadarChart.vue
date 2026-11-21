<template>
  <div class="radar-chart flex flex-col gap-2" :style="props.autoResize ? { width: '100%', height: '100%' } : { width: `${props.width}px` }">
    <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
    <div ref="containerRef" class="relative min-h-0 flex-1" :style="props.autoResize ? undefined : { height: `${props.height}px` }">
      <p v-if="!props.axes.length || !props.series.length" class="flex h-full items-center justify-center text-sm text-content-tertiary">
        {{ props.emptyText ?? i18n.radar.empty }}
      </p>
      <svg v-else :width="effectiveWidth" :height="effectiveHeight" class="block overflow-visible" role="img" :aria-label="ariaLabel" @mouseleave="hover = null">
        <!-- 網格：同心多邊形 + 軸線 -->
        <g :style="{ stroke: chartTheme.grid }" fill="none">
          <polygon v-for="lv in levelRatios" :key="lv" :points="ringPoints(lv)" />
          <line v-for="(a, i) in props.axes" :key="a.key" :x1="cx" :y1="cy" :x2="axisEnd(i).x" :y2="axisEnd(i).y" />
        </g>
        <!-- 軸名稱 -->
        <g>
          <text
            v-for="(a, i) in props.axes"
            :key="a.key"
            :x="labelPos(i).x"
            :y="labelPos(i).y"
            :text-anchor="labelAnchor(i, props.axes.length)"
            dy="0.35em"
            font-size="12"
            :style="{ fill: chartTheme.text }"
          >
            {{ a.label }}<tspan v-if="a.lowerIsBetter" font-size="10" :style="{ fill: chartTheme.textMuted }"> ↓</tspan>
          </text>
        </g>
        <!-- 系列 -->
        <g v-for="s in shown" :key="s.series.name" :style="{ opacity: dimmed(s.series.name) ? 0.15 : 1 }" class="transition-opacity">
          <path
            :d="s.poly.path"
            :style="{ fill: s.color, fillOpacity: props.fillOpacity, stroke: s.color }"
            stroke-width="2"
            stroke-linejoin="round"
            @mouseenter="hover = { series: s.series.name, axis: null }"
          />
          <circle
            v-for="pt in s.poly.points.filter((p) => p.ratio !== null)"
            :key="pt.axis.key"
            :cx="pt.x"
            :cy="pt.y"
            r="4"
            :style="{ fill: s.color, stroke: chartTheme.surface }"
            stroke-width="1.5"
            @mouseenter="hover = { series: s.series.name, axis: pt.axis.key }"
          />
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

    <!-- 圖例：點了顯示 / 隱藏，滑過突顯 -->
    <div v-if="props.showLegend && props.series.length > 0" class="flex flex-wrap justify-center gap-1.5" role="group" :aria-label="i18n.radar.legend">
      <button
        v-for="(s, i) in props.series"
        :key="s.name"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border border-stroke-default px-2.5 py-0.5 text-xs transition-colors hover:bg-surface-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
        :class="hidden.has(s.name) ? 'text-content-tertiary line-through' : 'text-content-primary'"
        :aria-pressed="!hidden.has(s.name)"
        @click="toggle(s.name)"
        @mouseenter="hover = { series: s.name, axis: null }"
        @mouseleave="hover = null"
        @focus="hover = { series: s.name, axis: null }"
        @blur="hover = null"
      >
        <span class="h-2.5 w-2.5 rounded-full" :style="{ background: colorOf(s, i) }" aria-hidden="true"></span>{{ s.name }}
      </button>
    </div>

    <!-- 給螢幕閱讀器的資料表 -->
    <table class="sr-only">
      <caption>{{ props.title || i18n.radar.title }}</caption>
      <thead>
        <tr><th scope="col">{{ i18n.radar.metric }}</th><th v-for="s in props.series" :key="s.name" scope="col">{{ s.name }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="a in props.axes" :key="a.key">
          <th scope="row">{{ a.lowerIsBetter ? i18n.radar.lowerIsBetterLabel(a.label) : a.label }}</th>
          <td v-for="s in props.series" :key="s.name">{{ valueText(s.values[a.key], a) }}</td>
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
import { tooltipPlacement } from './utils/tooltipPlacement'
import { labelAnchor, radarPoint, radarScales, seriesPolygon, type RadarAxis, type RadarSeries } from './utils/radar'
import { useLocale } from '../shared/config'

/**
 * RadarChart —— 雷達圖
 *
 * 用途：同時比較幾個對象在多個指標上的表現 —— 供應商評分（品質 / 交期 / 成本 / 服務）、各線的 OEE 三率、人員技能。
 * 一個對象一個多邊形，「哪一項特別弱」一眼看出來。
 *
 * - 每一軸有自己的範圍（min / max）；不給時從 0 到最大值取整，`max` 可讓所有軸用同一個刻度
 * - lowerIsBetter：越小越好的指標（不良率、交期天數）反轉方向，越好越靠外圈，軸名稱標 ↓
 * - 滑過點看數值；滑過圖例突顯該系列，點圖例顯示 / 隱藏
 * - 附隱藏的資料表（指標 × 系列）給螢幕閱讀器；圖例按鈕是 aria-pressed 開關
 * - 指標超過 8 個或系列超過 4 個時建議改用長條圖：多邊形會擠在一起看不出差異
 */

interface RadarChartProps {
  axes: RadarAxis[]
  series: RadarSeries[]
  width?: number
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  title?: string
  /** 網格圈數 */
  levels?: number
  /** 所有軸共用的最大值（軸自己的 max 優先） */
  max?: number | null
  /** 填色透明度 */
  fillOpacity?: number
  showLegend?: boolean
  valueFormat?: ((value: number, axis: RadarAxis) => string) | null
  emptyText?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const i18n = useLocale()
const props = withDefaults(defineProps<RadarChartProps>(), {
  width: 480,
  height: 400,
  autoResize: false,
  debounceDelay: 100,
  title: '',
  levels: 4,
  max: null,
  fillOpacity: 0.18,
  showLegend: true,
  valueFormat: null,
  emptyText: undefined,
})

const emit = defineEmits<{
  /** 圖例切換後目前顯示的系列名稱 */
  (e: 'visibility-change', visible: string[]): void
  (e: 'chart-resize', size: { width: number; height: number }): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const { effectiveWidth, effectiveHeight } = useAutoResize(containerRef, props, (size) => emit('chart-resize', size))

// 軸名稱需要的空間：左右較寬（文字橫向）、上下較窄
const LABEL_X = 72
const LABEL_Y = 26
const cx = computed(() => effectiveWidth.value / 2)
const cy = computed(() => effectiveHeight.value / 2)
const radius = computed(() => Math.max(10, Math.min(effectiveWidth.value / 2 - LABEL_X, effectiveHeight.value / 2 - LABEL_Y)))

const scales = computed(() => radarScales(props.axes, props.series, props.max))
const levelRatios = computed(() => Array.from({ length: Math.max(1, props.levels) }, (_, i) => (i + 1) / Math.max(1, props.levels)))
const ringPoints = (r: number) => props.axes.map((_, i) => radarPoint(i, props.axes.length, r, radius.value, cx.value, cy.value)).map((p) => `${p.x},${p.y}`).join(' ')
const axisEnd = (i: number) => radarPoint(i, props.axes.length, 1, radius.value, cx.value, cy.value)
const labelPos = (i: number) => radarPoint(i, props.axes.length, 1, radius.value + 12, cx.value, cy.value)

const colorOf = (s: RadarSeries, i: number) => s.color ?? chartPalette.categorical[i % chartPalette.categorical.length]
const hidden = ref(new Set<string>())
function toggle(name: string): void {
  const next = new Set(hidden.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  hidden.value = next
  emit('visibility-change', props.series.map((s) => s.name).filter((n) => !next.has(n)))
}
const shown = computed(() =>
  props.series
    .map((s, i) => ({ series: s, color: colorOf(s, i), poly: seriesPolygon(s, props.axes, scales.value, radius.value, cx.value, cy.value) }))
    .filter((s) => !hidden.value.has(s.series.name))
)

// ---- 滑過 ----
const hover = ref<{ series: string; axis: string | null } | null>(null)
const dimmed = (name: string) => !!hover.value && hover.value.series !== name

const defaultFormat = d3.format(',~f')
function valueText(v: number | null | undefined, a: RadarAxis): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  const s = props.valueFormat ? props.valueFormat(v, a) : defaultFormat(Number(v.toPrecision(6)))
  return a.unit ? `${s} ${a.unit}` : s
}
const tip = computed(() => {
  const h = hover.value
  if (!h || !h.axis) return null
  const s = shown.value.find((x) => x.series.name === h.series)
  const pt = s?.poly.points.find((p) => p.axis.key === h.axis)
  if (!s || !pt) return null
  return {
    lines: [h.series, i18n.value.radar.point(pt.axis.label, valueText(s.series.values[pt.axis.key], pt.axis))],
    style: tooltipPlacement(pt.x, pt.y, effectiveWidth.value, effectiveHeight.value, 180, 50),
  }
})

const ariaLabel = computed(() => i18n.value.radar.ariaLabel(props.title || i18n.value.radar.title, props.axes.map((a) => a.label), props.series.map((s) => s.name)))
</script>
