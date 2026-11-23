<template>
  <div class="scatter-chart flex flex-col gap-2" :style="props.autoResize ? { width: '100%', height: '100%' } : { width: `${props.width}px` }">
    <div v-if="props.title || selection.length" class="flex flex-wrap items-center gap-2">
      <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
      <p v-if="selection.length" class="ml-auto flex items-center gap-2 text-xs text-content-secondary" aria-live="polite">
        {{ selectionText }}
        <button
          type="button"
          class="rounded border border-stroke-default px-1.5 py-0.5 text-content-primary hover:bg-surface-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          @click="clearSelection()"
        >{{ i18n.scatter.clearSelection }}</button>
      </p>
    </div>
    <div ref="containerRef" class="relative min-h-0 flex-1" :style="props.autoResize ? undefined : { height: `${props.height}px` }">
      <p v-if="!finite.length" class="flex h-full items-center justify-center text-sm text-content-tertiary">
        {{ props.emptyText ?? i18n.scatter.empty }}
      </p>
      <template v-else>
        <!-- 底層：格線、軸、信賴帶 -->
        <svg :width="effectiveWidth" :height="effectiveHeight" class="absolute left-0 top-0 block" role="img" :aria-label="ariaLabel">
          <g :transform="`translate(${M.left},${M.top})`">
            <g :style="{ stroke: chartTheme.grid }">
              <line v-for="t in xTicks" :key="`gx${t}`" :x1="xScale(t)" :x2="xScale(t)" y1="0" :y2="plotH" />
              <line v-for="t in yTicks" :key="`gy${t}`" x1="0" :x2="plotW" :y1="yScale(t)" :y2="yScale(t)" />
            </g>
            <g font-size="11" :style="{ fill: chartTheme.textMuted }">
              <text v-for="t in xTicks" :key="`tx${t}`" :x="xScale(t)" :y="plotH + 16" text-anchor="middle">{{ xTickFormat(t) }}</text>
              <text v-for="t in yTicks" :key="`ty${t}`" x="-8" :y="yScale(t)" text-anchor="end" dy="0.32em">{{ yTickFormat(t) }}</text>
            </g>
            <line x1="0" :x2="plotW" :y1="plotH" :y2="plotH" :style="{ stroke: chartTheme.axis }" />
            <line x1="0" x2="0" y1="0" :y2="plotH" :style="{ stroke: chartTheme.axis }" />
            <text v-if="xAxisTitle" :x="plotW / 2" :y="plotH + 36" text-anchor="middle" font-size="12" :style="{ fill: chartTheme.text }">{{ xAxisTitle }}</text>
            <text v-if="yAxisTitle" :transform="`translate(${-M.left + 14},${plotH / 2}) rotate(-90)`" text-anchor="middle" font-size="12" :style="{ fill: chartTheme.text }">
              {{ yAxisTitle }}
            </text>
            <g :clip-path="`url(#${uid}-clip)`">
              <path v-for="f in fits" v-show="props.showBand && f.band" :key="`b${f.key}`" :d="f.band ?? ''" :style="{ fill: f.color, fillOpacity: 0.14 }" />
            </g>
          </g>
        </svg>

        <!-- 大量點：Canvas -->
        <canvas
          v-if="useCanvas"
          ref="canvasRef"
          class="pointer-events-none absolute"
          :style="{ left: `${M.left}px`, top: `${M.top}px`, width: `${plotW}px`, height: `${plotH}px` }"
          aria-hidden="true"
        ></canvas>

        <!-- 上層：點（少量時）、迴歸線、選取、滑過、框選 -->
        <svg :width="effectiveWidth" :height="effectiveHeight" class="absolute left-0 top-0 block" aria-hidden="true">
          <defs>
            <clipPath :id="`${uid}-clip`"><rect x="0" y="0" :width="plotW" :height="plotH" /></clipPath>
          </defs>
          <g :transform="`translate(${M.left},${M.top})`">
            <g v-if="!useCanvas" :clip-path="`url(#${uid}-clip)`">
              <circle
                v-for="i in visible"
                :key="i"
                :cx="px[i]"
                :cy="py[i]"
                :r="props.pointRadius"
                :style="{ fill: colorOfIndex(i), fillOpacity: dimPoint(i) ? 0.15 : 0.75, stroke: chartTheme.surface }"
                stroke-width="0.75"
              />
            </g>
            <g :clip-path="`url(#${uid}-clip)`">
              <line
                v-for="f in fits"
                :key="`l${f.key}`"
                :x1="xScale(f.x0)"
                :y1="yScale(f.y0)"
                :x2="xScale(f.x1)"
                :y2="yScale(f.y1)"
                :style="{ stroke: f.color }"
                stroke-width="2"
                :stroke-dasharray="f.key === ALL ? '6 4' : undefined"
              />
            </g>
            <!-- 選取的點（Canvas 模式時另外畫外框） -->
            <g v-if="useCanvas && selection.length <= 2000">
              <circle v-for="i in selection" :key="`s${i}`" :cx="px[i]" :cy="py[i]" :r="props.pointRadius + 1.5" fill="none" :style="{ stroke: chartTheme.text }" stroke-width="1" />
            </g>
            <circle v-if="hoverIndex >= 0" :cx="px[hoverIndex]" :cy="py[hoverIndex]" :r="props.pointRadius + 3" fill="none" :style="{ stroke: chartTheme.text }" stroke-width="1.5" />
            <rect
              v-if="brush"
              :x="Math.min(brush.x0, brush.x1)"
              :y="Math.min(brush.y0, brush.y1)"
              :width="Math.abs(brush.x1 - brush.x0)"
              :height="Math.abs(brush.y1 - brush.y0)"
              :style="{ fill: chartTheme.accent, fillOpacity: 0.12, stroke: chartTheme.accent }"
              stroke-dasharray="4 3"
            />
            <rect
              x="0"
              y="0"
              :width="plotW"
              :height="plotH"
              fill="transparent"
              :style="{ cursor: props.brushable ? 'crosshair' : 'default', touchAction: props.brushable ? 'pan-y' : 'auto' }"
              @pointerdown="onDown"
              @pointermove="onMove"
              @pointerup="onUp"
              @pointercancel="onCancel"
              @pointerleave="onLeave"
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
      </template>
    </div>

    <!-- 圖例（分類：點了顯示 / 隱藏）與迴歸式 -->
    <div v-if="finite.length && (showCategoryLegend || fits.length)" class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs">
      <div v-if="showCategoryLegend" class="flex flex-wrap justify-center gap-1.5" role="group" :aria-label="i18n.scatter.legend">
        <button
          v-for="c in categories"
          :key="c"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full border border-stroke-default px-2.5 py-0.5 transition-colors hover:bg-surface-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          :class="hidden.has(c) ? 'text-content-tertiary line-through' : 'text-content-primary'"
          :aria-pressed="!hidden.has(c)"
          @click="toggle(c)"
        >
          <span class="h-2.5 w-2.5 rounded-full" :style="{ background: colorOf(c) }" aria-hidden="true"></span>{{ c }}
        </button>
      </div>
      <ul v-if="fits.length" class="flex flex-wrap justify-center gap-x-3 gap-y-1 text-content-secondary">
        <li v-for="f in fits" :key="f.key" class="inline-flex items-center gap-1.5">
          <svg width="18" height="6" aria-hidden="true"><line x1="0" y1="3" x2="18" y2="3" :style="{ stroke: f.color }" stroke-width="2" :stroke-dasharray="f.key === ALL ? '6 4' : undefined" /></svg>
          <span>{{ i18n.scatter.fitText(f.key === ALL ? null : f.key, equation(f.reg), f.reg.r2.toFixed(3), f.reg.n) }}</span>
        </li>
      </ul>
    </div>

    <!-- 給螢幕閱讀器：各迴歸的統計 -->
    <table v-if="fits.length" class="sr-only">
      <caption>{{ i18n.scatter.statsCaption(props.title || i18n.scatter.title) }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ i18n.scatter.group }}</th>
          <th scope="col">n</th>
          <th scope="col">{{ i18n.scatter.equation }}</th>
          <th scope="col">R²</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="f in fits" :key="f.key">
          <th scope="row">{{ f.key === ALL ? i18n.scatter.all : f.key }}</th>
          <td>{{ f.reg.n }}</td>
          <td>{{ equation(f.reg) }}</td>
          <td>{{ f.reg.r2.toFixed(3) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from 'vue'
import * as d3 from 'd3'
import { chartPalette, chartTheme } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { tooltipPlacement } from './utils/tooltipPlacement'
import { nearestPointIndex, resolveCanvasColor } from './utils/largeData'
import { bandPoints, formatEquation, indicesInRect, linearRegression, predict, type Regression, type ScatterPoint } from './utils/scatter'
import { useLocale } from '../shared/config'

/**
 * ScatterChart —— 散佈圖與迴歸
 *
 * 用途：看兩個變數的關係 —— 爐溫與空焊率、錫膏厚度與良率、機台速度與拋料率。
 *   - 分類（category）用不同顏色，圖例可顯示 / 隱藏
 *   - 直線迴歸：regression='all' 全部一條（虛線）、'category' 每個分類一條；顯示迴歸式、R²、n
 *   - 平均反應的 95% 信賴帶（showBand）：點越少、越靠兩端越寬
 *   - 框選（brushable）：拖曳框出一群點 → select 事件；沒選到的變淡；點一下空白處取消
 *     （觸控時上下滑動仍是捲動頁面，左右拖曳才框選）
 *   - 點多於 canvasThreshold 時改畫在 Canvas（10 萬點也順），滑過仍可看單點
 *   - 隱藏的統計表給螢幕閱讀器（各組的 n、迴歸式、R²）
 */

interface ScatterChartProps {
  data: ScatterPoint[]
  width?: number
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  title?: string
  xLabel?: string
  yLabel?: string
  xUnit?: string
  yUnit?: string
  /** 軸範圍；不給時依資料（留一點邊再取整） */
  xDomain?: [number, number] | null
  yDomain?: [number, number] | null
  /** 分類顏色；不給時依出現順序用圖表色 */
  categoryColors?: Record<string, string>
  /** 迴歸線：none 不畫、all 全部一條、category 每個分類一條 */
  regression?: 'none' | 'all' | 'category'
  /** 迴歸的 95% 信賴帶 */
  showBand?: boolean
  /** 拖曳框選 */
  brushable?: boolean
  pointRadius?: number
  /** 點數超過這個值時改用 Canvas */
  canvasThreshold?: number
  showLegend?: boolean
  valueFormat?: ((value: number, axis: 'x' | 'y') => string) | null
  emptyText?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const i18n = useLocale()
const props = withDefaults(defineProps<ScatterChartProps>(), {
  width: 640,
  height: 400,
  autoResize: false,
  debounceDelay: 100,
  title: '',
  xLabel: '',
  yLabel: '',
  xUnit: '',
  yUnit: '',
  xDomain: null,
  yDomain: null,
  categoryColors: undefined,
  regression: 'all',
  showBand: true,
  brushable: true,
  pointRadius: 3.5,
  canvasThreshold: 3000,
  showLegend: true,
  valueFormat: null,
  emptyText: undefined,
})

const emit = defineEmits<{
  /** 框選完成（取消時為空陣列） */
  (e: 'select', points: ScatterPoint[]): void
  (e: 'point-click', point: ScatterPoint): void
  /** 圖例切換後目前顯示的分類 */
  (e: 'visibility-change', visible: string[]): void
  (e: 'chart-resize', size: { width: number; height: number }): void
}>()

const uid = useId()
const ALL = '\u0000all'
const containerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const { effectiveWidth, effectiveHeight } = useAutoResize(containerRef, props, (size) => emit('chart-resize', size))

// ---- 版面 ----
const xAxisTitle = computed(() => i18n.value.scatter.axisTitle(props.xLabel, props.xUnit))
const yAxisTitle = computed(() => i18n.value.scatter.axisTitle(props.yLabel, props.yUnit))
const M = computed(() => ({ top: 12, right: 16, bottom: xAxisTitle.value ? 46 : 28, left: yAxisTitle.value ? 64 : 48 }))
const plotW = computed(() => Math.max(10, effectiveWidth.value - M.value.left - M.value.right))
const plotH = computed(() => Math.max(10, effectiveHeight.value - M.value.top - M.value.bottom))

// ---- 資料 ----
const finite = computed(() => props.data.map((_, i) => i).filter((i) => Number.isFinite(props.data[i].x) && Number.isFinite(props.data[i].y)))
const categories = computed(() => {
  const seen = new Set<string>()
  for (const i of finite.value) {
    const c = props.data[i].category
    if (c !== undefined) seen.add(c)
  }
  return [...seen]
})
const showCategoryLegend = computed(() => props.showLegend && categories.value.length > 0)
const colorOf = (c: string | undefined) => {
  if (c === undefined) return chartPalette.categorical[0]
  if (props.categoryColors?.[c]) return props.categoryColors[c]
  const i = categories.value.indexOf(c)
  return i >= 0 && i < chartPalette.categorical.length ? chartPalette.categorical[i] : chartPalette.other
}
const colorOfIndex = (i: number) => colorOf(props.data[i].category)

const hidden = ref(new Set<string>())
function toggle(c: string): void {
  const next = new Set(hidden.value)
  if (next.has(c)) next.delete(c)
  else next.add(c)
  hidden.value = next
  emit('visibility-change', categories.value.filter((x) => !next.has(x)))
}
const visible = computed(() => finite.value.filter((i) => props.data[i].category === undefined || !hidden.value.has(props.data[i].category!)))
const useCanvas = computed(() => visible.value.length > props.canvasThreshold)

// ---- 刻度 ----
function domainOf(axis: 'x' | 'y', given: [number, number] | null): [number, number] {
  if (given) return given
  const vals = finite.value.map((i) => props.data[i][axis])
  const [lo, hi] = d3.extent(vals) as [number, number]
  if (lo === undefined) return [0, 1]
  const pad = hi === lo ? Math.abs(lo) * 0.1 || 1 : (hi - lo) * 0.05
  return [lo - pad, hi + pad]
}
const xScale = computed(() => {
  const s = d3.scaleLinear().domain(domainOf('x', props.xDomain)).range([0, plotW.value])
  return props.xDomain ? s : s.nice()
})
const yScale = computed(() => {
  const s = d3.scaleLinear().domain(domainOf('y', props.yDomain)).range([plotH.value, 0])
  return props.yDomain ? s : s.nice()
})
const xTicks = computed(() => xScale.value.ticks(Math.max(2, Math.floor(plotW.value / 80))))
const yTicks = computed(() => yScale.value.ticks(Math.max(2, Math.floor(plotH.value / 50))))
const xTickFormat = (v: number) => (props.valueFormat ? props.valueFormat(v, 'x') : xScale.value.tickFormat(xTicks.value.length)(v))
const yTickFormat = (v: number) => (props.valueFormat ? props.valueFormat(v, 'y') : yScale.value.tickFormat(yTicks.value.length)(v))

/** 每一點的像素座標（索引同 data） */
const px = computed(() => {
  const out = new Float64Array(props.data.length).fill(NaN)
  const s = xScale.value
  for (const i of finite.value) out[i] = s(props.data[i].x)
  return out
})
const py = computed(() => {
  const out = new Float64Array(props.data.length).fill(NaN)
  const s = yScale.value
  for (const i of finite.value) out[i] = s(props.data[i].y)
  return out
})

// ---- 迴歸 ----
interface Fit {
  key: string
  color: string
  reg: Regression
  x0: number
  y0: number
  x1: number
  y1: number
  band: string | null
}
const fits = computed<Fit[]>(() => {
  if (props.regression === 'none') return []
  const groups: Array<{ key: string; color: string; idx: number[] }> =
    props.regression === 'all' || !categories.value.length
      ? [{ key: ALL, color: chartTheme.text, idx: visible.value }]
      : categories.value.filter((c) => !hidden.value.has(c)).map((c) => ({ key: c, color: colorOf(c), idx: visible.value.filter((i) => props.data[i].category === c) }))
  const out: Fit[] = []
  for (const g of groups) {
    const reg = linearRegression(g.idx.map((i) => props.data[i]))
    if (!reg) continue
    const pts = bandPoints(reg, reg.xMin, reg.xMax, 48)
    const area = d3
      .area<{ x: number; lo: number; hi: number }>()
      .x((d) => xScale.value(d.x))
      .y0((d) => yScale.value(d.lo))
      .y1((d) => yScale.value(d.hi))
    out.push({ key: g.key, color: g.color, reg, x0: reg.xMin, y0: predict(reg, reg.xMin), x1: reg.xMax, y1: predict(reg, reg.xMax), band: reg.n > 2 ? area(pts) : null })
  }
  return out
})
const numFmt = (n: number) => d3.format(',~r')(Number(n.toPrecision(4)))
const equation = (reg: Regression) => formatEquation(reg, numFmt)

// ---- 選取 ----
const selection = shallowRef<number[]>([])
const selectedSet = computed(() => new Set(selection.value))
const dimPoint = (i: number) => selection.value.length > 0 && !selectedSet.value.has(i)
function clearSelection(): void {
  if (!selection.value.length) return
  selection.value = []
  emit('select', [])
}
watch(
  () => props.data,
  () => (selection.value = [])
)
const selectionText = computed(() => {
  const pts = selection.value.map((i) => props.data[i])
  const mean = (k: 'x' | 'y') => d3.mean(pts, (p) => p[k]) ?? 0
  return i18n.value.scatter.selected(pts.length, fmtValue(mean('x'), 'x', 4), fmtValue(mean('y'), 'y', 4))
})

// ---- 滑過、框選、點擊 ----
const hoverIndex = ref(-1)
const brush = ref<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
let brushPointer: number | null = null
const local = (e: PointerEvent) => {
  const r = (e.currentTarget as Element).getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}
function hitTest(x: number, y: number): number {
  const vis = visible.value
  const vx = new Float64Array(vis.length)
  const vy = new Float64Array(vis.length)
  vis.forEach((i, k) => ((vx[k] = px.value[i]), (vy[k] = py.value[i])))
  const k = nearestPointIndex(vx, vy, x, y, Math.max(8, props.pointRadius + 4))
  return k < 0 ? -1 : vis[k]
}
function onDown(e: PointerEvent): void {
  if (!props.brushable || (e.pointerType === 'mouse' && e.button !== 0)) return
  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  brushPointer = e.pointerId
  const p = local(e)
  brush.value = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }
}
function onMove(e: PointerEvent): void {
  const p = local(e)
  if (brush.value && brushPointer === e.pointerId) {
    brush.value = { ...brush.value, x1: Math.min(plotW.value, Math.max(0, p.x)), y1: Math.min(plotH.value, Math.max(0, p.y)) }
    hoverIndex.value = -1
    return
  }
  hoverIndex.value = hitTest(p.x, p.y)
}
function onUp(e: PointerEvent): void {
  const p = local(e)
  const b = brush.value
  brush.value = null
  brushPointer = null
  if (b && (Math.abs(b.x1 - b.x0) > 4 || Math.abs(b.y1 - b.y0) > 4)) {
    const vis = visible.value
    const vx = vis.map((i) => px.value[i])
    const vy = vis.map((i) => py.value[i])
    selection.value = indicesInRect(vx, vy, b.x0, b.y0, b.x1, b.y1).map((k) => vis[k])
    emit('select', selection.value.map((i) => props.data[i]))
    return
  }
  // 沒拖動：當作點擊
  const hit = hitTest(p.x, p.y)
  if (hit >= 0) emit('point-click', props.data[hit])
  else clearSelection()
}
function onCancel(): void {
  brush.value = null
  brushPointer = null
}
function onLeave(): void {
  if (!brush.value) hoverIndex.value = -1
}

/** 數值文字；digits 是有效位數（平均值用 4 位就夠） */
const fmtValue = (v: number, axis: 'x' | 'y', digits = 6) => {
  const s = props.valueFormat ? props.valueFormat(v, axis) : d3.format(',~f')(Number(v.toPrecision(digits)))
  const u = axis === 'x' ? props.xUnit : props.yUnit
  return u ? `${s} ${u}` : s
}
const tip = computed(() => {
  const i = hoverIndex.value
  if (i < 0 || !props.data[i]) return null
  const d = props.data[i]
  const head = [d.label, d.category].filter(Boolean).join(' · ') || i18n.value.scatter.point
  return {
    lines: [head, i18n.value.scatter.tipLine(props.xLabel || 'X', fmtValue(d.x, 'x')), i18n.value.scatter.tipLine(props.yLabel || 'Y', fmtValue(d.y, 'y'))],
    style: tooltipPlacement(px.value[i] + M.value.left, py.value[i] + M.value.top, effectiveWidth.value, effectiveHeight.value, 180, 64),
  }
})

// ---- Canvas ----
let themeObserver: MutationObserver | null = null
const themeTick = ref(0)
function draw(): void {
  const canvas = canvasRef.value
  if (!useCanvas.value || !canvas) return
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const w = plotW.value
  const h = plotH.value
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  const host = containerRef.value
  const cache = new Map<string, string>()
  const resolve = (c: string) => cache.get(c) ?? (cache.set(c, resolveCanvasColor(c, host)), cache.get(c)!)
  const r = props.pointRadius
  // 依顏色分批畫，減少切換 fillStyle
  const byColor = new Map<string, number[]>()
  for (const i of visible.value) {
    const c = colorOfIndex(i)
    let arr = byColor.get(c)
    if (!arr) byColor.set(c, (arr = []))
    arr.push(i)
  }
  for (const [c, idx] of byColor) {
    ctx.fillStyle = resolve(c)
    for (const dim of [true, false]) {
      ctx.globalAlpha = dim ? 0.15 : 0.7
      ctx.beginPath()
      for (const i of idx) {
        if (dimPoint(i) !== dim) continue
        ctx.moveTo(px.value[i] + r, py.value[i])
        ctx.arc(px.value[i], py.value[i], r, 0, Math.PI * 2)
      }
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}
watch([useCanvas, visible, px, py, selection, plotW, plotH, themeTick, () => props.pointRadius, () => props.categoryColors], () => nextTick(draw), { flush: 'post' })
onMounted(() => {
  nextTick(draw)
  if (typeof MutationObserver !== 'undefined')
    themeObserver = new MutationObserver(() => themeTick.value++)
  themeObserver?.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })
})
onBeforeUnmount(() => themeObserver?.disconnect())

const ariaLabel = computed(() =>
  i18n.value.scatter.ariaLabel(
    props.title || i18n.value.scatter.title,
    visible.value.length,
    props.xLabel || 'X',
    props.yLabel || 'Y',
    fits.value.map((f) => `${f.key === ALL ? '' : `${f.key} `}R² ${f.reg.r2.toFixed(2)}`)
  )
)

defineExpose({
  clearSelection,
  /** 目前框選的點 */
  selected: computed(() => selection.value.map((i) => props.data[i])),
  /** 各組的迴歸結果 */
  regressions: computed(() => fits.value.map((f) => ({ group: f.key === ALL ? null : f.key, ...f.reg }))),
})
</script>
