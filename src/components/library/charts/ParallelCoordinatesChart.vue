<template>
  <div class="parallel-chart flex flex-col gap-2" :style="props.autoResize ? { width: '100%', height: '100%' } : { width: `${props.width}px` }">
    <div class="flex flex-wrap items-center gap-2">
      <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
      <p class="ml-auto flex items-center gap-2 text-xs text-content-secondary" aria-live="polite">
        {{ i18n.parallel.selected(selectedIdx.length, finiteRows.length) }}
        <button
          v-if="hasBrushes"
          type="button"
          class="rounded border border-stroke-default px-1.5 py-0.5 text-content-primary hover:bg-surface-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          @click="setBrushes({})"
        >{{ i18n.parallel.clear }}</button>
      </p>
    </div>
    <div ref="containerRef" class="relative min-h-0 flex-1" :style="props.autoResize ? undefined : { height: `${props.height}px` }">
      <p v-if="!props.data.length || props.axes.length < 2" class="flex h-full items-center justify-center text-sm text-content-tertiary">
        {{ props.emptyText ?? i18n.parallel.empty }}
      </p>
      <template v-else>
        <canvas
          v-if="useCanvas"
          ref="canvasRef"
          class="pointer-events-none absolute"
          :style="{ left: `${M.left}px`, top: `${M.top}px`, width: `${plotW}px`, height: `${plotH}px` }"
          aria-hidden="true"
        ></canvas>
        <svg :width="effectiveWidth" :height="effectiveHeight" class="absolute left-0 top-0 block select-none" role="group" :aria-label="ariaLabel">
          <g :transform="`translate(${M.left},${M.top})`">
            <!-- 線（少量時用 SVG，可以滑過） -->
            <g v-if="!useCanvas" fill="none" @pointerleave="hoverIdx = -1">
              <path
                v-for="i in drawOrder"
                :key="i"
                :d="pathOf(i)"
                :style="{
                  stroke: selectedSet.has(i) ? colorOf(i) : chartPalette.muted,
                  strokeOpacity: hoverIdx === i ? 1 : selectedSet.has(i) ? props.lineOpacity : 0.5,
                }"
                :stroke-width="hoverIdx === i ? 2.5 : 1.25"
                @pointerenter="hoverIdx = i"
                @click="emit('line-click', props.data[i])"
              />
            </g>
            <path v-if="useCanvas && hoverIdx >= 0" :d="pathOf(hoverIdx)" fill="none" :style="{ stroke: chartTheme.text }" stroke-width="2" />
            <!-- 軸 -->
            <g
              v-for="(a, i) in orderedAxes"
              :key="a.key"
              :transform="`translate(${axisX(i)},0)`"
              :style="{ transition: draggingAxis === a.key ? 'none' : 'transform 150ms' }"
            >
              <line y1="0" :y2="plotH" :style="{ stroke: chartTheme.axis }" />
              <g font-size="10" :style="{ fill: chartTheme.textMuted }">
                <g v-for="tk in ticksOf(a)" :key="tk" :transform="`translate(0,${yOf(a, tk)})`">
                  <line x1="-3" x2="0" :style="{ stroke: chartTheme.axis }" />
                  <text x="-5" dy="0.32em" text-anchor="end" paint-order="stroke" stroke-width="3" :style="{ stroke: chartTheme.surface }">{{ fmt(tk) }}</text>
                </g>
              </g>
              <!-- 框選 -->
              <rect
                v-if="brushOf(a.key)"
                x="-7"
                width="14"
                :y="brushY(a)[0]"
                :height="Math.max(2, brushY(a)[1] - brushY(a)[0])"
                rx="2"
                :style="{ fill: chartTheme.accent, fillOpacity: 0.18, stroke: chartTheme.accent }"
                pointer-events="none"
              />
              <!-- 拖曳區：在軸上拖曳框選、拖動已框選的範圍 -->
              <rect
                x="-12"
                width="24"
                y="-4"
                :height="plotH + 8"
                fill="transparent"
                class="cursor-crosshair"
                style="touch-action: none"
                @pointerdown="onAxisDown($event, a)"
                @pointermove="onAxisMove($event, a)"
                @pointerup="onAxisUp($event, a)"
                @pointercancel="onAxisCancel"
              />
              <!-- 軸名稱：拖曳換位置；鍵盤 ←→ 換位置、Delete 清除框選 -->
              <g
                role="button"
                tabindex="0"
                :aria-label="axisLabel(a)"
                class="cursor-grab outline-none"
                :transform="`translate(0,${titleY(i)})`"
                @pointerdown="onTitleDown($event, a)"
                @pointermove="onTitleMove"
                @pointerup="onTitleUp"
                @pointercancel="onTitleUp"
                @keydown="onTitleKeydown($event, a, i)"
                @focus="focusAxis = a.key"
                @blur="focusAxis = null"
              >
                <rect :x="-titleWidth(a) / 2 - 4" y="-11" :width="titleWidth(a) + 8" height="20" rx="4" :style="{ fill: focusAxis === a.key ? chartTheme.surfaceMuted : 'transparent', stroke: focusAxis === a.key ? chartTheme.accent : 'none' }" />
                <text text-anchor="middle" dy="0.32em" font-size="12" font-weight="600" :style="{ fill: chartTheme.text }">
                  {{ a.label }}<tspan v-if="a.reverse" :style="{ fill: chartTheme.textMuted }"> ↓</tspan>
                </text>
              </g>
              <text v-if="a.unit" :y="plotH + 16" text-anchor="middle" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ a.unit }}</text>
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
      </template>
    </div>

    <!-- 顏色說明 -->
    <div v-if="props.colorBy && finiteRows.length" class="flex flex-wrap items-center justify-center gap-2 text-xs text-content-secondary">
      <span>{{ colorTitle }}</span>
      <template v-if="colorMode === 'numeric'">
        <span>{{ fmt(colorDomain[0]) }}</span>
        <span class="h-2.5 w-32 rounded-sm" :style="{ background: `linear-gradient(to right, ${props.colorRange[0]}, ${props.colorRange[1]})` }" aria-hidden="true"></span>
        <span>{{ fmt(colorDomain[1]) }}</span>
      </template>
      <template v-else>
        <span v-for="c in categories" :key="c" class="inline-flex items-center gap-1">
          <span class="h-2.5 w-2.5 rounded-full" :style="{ background: categoryColor(c) }" aria-hidden="true"></span>{{ c }}
        </span>
      </template>
    </div>
    <p class="text-xs text-content-tertiary">{{ i18n.parallel.hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import * as d3 from 'd3'
import { chartPalette, chartTheme } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { tooltipPlacement } from './utils/tooltipPlacement'
import { resolveCanvasColor } from './utils/largeData'
import { estimateTextWidth } from './utils/chartText'
import { axisDomains, axisRatio, indexAtX, moveAxis, passesBrushes, toNum, type Brushes, type ParallelAxis, type ParallelRow } from './utils/parallel'
import { useLocale } from '../shared/config'

/**
 * ParallelCoordinatesChart —— 平行座標圖
 *
 * 用途：多參數的製程視窗 —— 哪些「溫度 + 速度 + 壓力」的組合良率高。每個參數一條垂直軸，每一筆資料是一條折線。
 *   - 在軸上拖曳框出範圍（可以好幾條軸一起框）：所有條件都符合的線保留顏色，其他變淡；v-model:brushes、select 事件
 *   - 拖動已框選的範圍可以平移；在軸上點一下（不拖）清除那條軸的框選
 *   - 拖曳軸名稱換位置（v-model:order）；相鄰的軸最好比較
 *   - colorBy：依某個欄位上色（數值用連續色階、文字用類別色）
 *   - 線多於 canvasThreshold 時改畫在 Canvas
 *   - 鍵盤：Tab 到軸名稱，←→ 換位置、Delete 清除那條軸的框選
 */

interface ParallelChartProps {
  data: ParallelRow[]
  axes: ParallelAxis[]
  width?: number
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  title?: string
  /** 依這個欄位上色（數值：連續色階；文字：類別色） */
  colorBy?: string
  colorLabel?: string
  /** 連續色階的兩端（任何 CSS 顏色） */
  colorRange?: [string, string]
  /** v-model:brushes：每條軸的框選範圍（資料單位） */
  brushes?: Brushes
  /** v-model:order：軸的順序（key） */
  order?: string[] | null
  /** 提示裡的名稱欄位（批號） */
  labelKey?: string
  lineOpacity?: number
  canvasThreshold?: number
  valueFormat?: ((v: number) => string) | null
  emptyText?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const i18n = useLocale()
const props = withDefaults(defineProps<ParallelChartProps>(), {
  width: 720,
  height: 380,
  autoResize: false,
  debounceDelay: 100,
  title: '',
  colorBy: '',
  colorLabel: '',
  colorRange: () => ['rgb(var(--t-chart-1))', 'rgb(var(--t-danger-solid))'],
  brushes: () => ({}),
  order: null,
  labelKey: '',
  lineOpacity: 0.55,
  canvasThreshold: 800,
  valueFormat: null,
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'update:brushes', value: Brushes): void
  (e: 'update:order', value: string[]): void
  /** 框選後符合條件的資料 */
  (e: 'select', rows: ParallelRow[]): void
  (e: 'line-click', row: ParallelRow): void
  (e: 'chart-resize', size: { width: number; height: number }): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const { effectiveWidth, effectiveHeight } = useAutoResize(containerRef, props, (size) => emit('chart-resize', size))

// ---- 軸 ----
const order = ref<string[]>(props.order ?? props.axes.map((a) => a.key))
watch(
  () => [props.order, props.axes.map((a) => a.key).join('\u0001')] as const,
  ([o]) => {
    const keys = props.axes.map((a) => a.key)
    const base = (o ?? order.value).filter((k) => keys.includes(k))
    order.value = [...base, ...keys.filter((k) => !base.includes(k))]
  }
)
const orderedAxes = computed(() => order.value.map((k) => props.axes.find((a) => a.key === k)!).filter(Boolean))
const domains = computed(() => axisDomains(props.data, props.axes))

const titleWidth = (a: ParallelAxis) => estimateTextWidth(a.label, 12) + (a.reverse ? 12 : 0)
/** 軸距放不下名稱時，名稱上下交錯排（手機上不會疊在一起） */
const stagger = computed(() => {
  const n = orderedAxes.value.length
  if (n < 2) return false
  const widest = Math.max(...orderedAxes.value.map(titleWidth))
  return (effectiveWidth.value - 80) / (n - 1) < widest + 10
})
const titleY = (i: number) => (stagger.value && i % 2 === 1 ? -40 : -22)
const M = computed(() => {
  const first = orderedAxes.value[0]
  const last = orderedAxes.value[orderedAxes.value.length - 1]
  const half = (a?: ParallelAxis) => (a ? titleWidth(a) / 2 + 8 : 30)
  return { top: stagger.value ? 52 : 34, right: Math.max(24, half(last)), bottom: 24, left: Math.max(44, half(first)) }
})
const plotW = computed(() => Math.max(10, effectiveWidth.value - M.value.left - M.value.right))
const plotH = computed(() => Math.max(10, effectiveHeight.value - M.value.top - M.value.bottom))
const step = computed(() => (orderedAxes.value.length > 1 ? plotW.value / (orderedAxes.value.length - 1) : 0))
const dragX = ref<number | null>(null)
const draggingAxis = ref<string | null>(null)
const axisX = (i: number) => (draggingAxis.value === orderedAxes.value[i]?.key && dragX.value !== null ? dragX.value : i * step.value)
const yOf = (a: ParallelAxis, v: number) => {
  const r = axisRatio(v, domains.value[a.key], a.reverse)
  return r === null ? 0 : plotH.value * (1 - r)
}
const valueAtY = (a: ParallelAxis, y: number) => {
  const [lo, hi] = domains.value[a.key]
  let r = 1 - y / plotH.value
  if (a.reverse) r = 1 - r
  return lo + Math.min(1, Math.max(0, r)) * (hi - lo)
}
const ticksOf = (a: ParallelAxis) => d3.scaleLinear().domain(domains.value[a.key]).ticks(Math.max(2, Math.floor(plotH.value / 45)))
const fmt = (v: number) => (props.valueFormat ? props.valueFormat(v) : d3.format(',~r')(Number(v.toPrecision(4))))

// ---- 資料、篩選 ----
const finiteRows = computed(() => props.data.map((_, i) => i))
const brushes = shallowRef<Brushes>(props.brushes)
watch(
  () => props.brushes,
  (v) => (brushes.value = v)
)
const hasBrushes = computed(() => Object.keys(brushes.value).length > 0)
const brushOf = (key: string) => brushes.value[key]
const brushY = (a: ParallelAxis): [number, number] => {
  const [p, q] = brushes.value[a.key]
  const ys = [yOf(a, p), yOf(a, q)]
  return [Math.min(...ys), Math.max(...ys)]
}
const selectedIdx = computed(() => finiteRows.value.filter((i) => passesBrushes(props.data[i], brushes.value)))
const selectedSet = computed(() => new Set(selectedIdx.value))
/** 選到的畫在上面 */
const drawOrder = computed(() => [...finiteRows.value.filter((i) => !selectedSet.value.has(i)), ...selectedIdx.value])
function setBrushes(next: Brushes): void {
  brushes.value = next
  emit('update:brushes', next)
  emit('select', selectedIdx.value.map((i) => props.data[i]))
}

const lineGen = d3
  .line<[number, number] | null>()
  .defined((p) => p !== null)
  .x((p) => p![0])
  .y((p) => p![1])
function pathOf(i: number): string {
  const row = props.data[i]
  const pts = orderedAxes.value.map((a, k) => {
    const r = axisRatio(row[a.key], domains.value[a.key], a.reverse)
    return r === null ? null : ([axisX(k), plotH.value * (1 - r)] as [number, number])
  })
  return lineGen(pts) ?? ''
}

// ---- 顏色 ----
const colorMode = computed<'numeric' | 'category' | 'none'>(() => {
  if (!props.colorBy) return 'none'
  const vals = props.data.map((r) => r[props.colorBy]).filter((v) => v !== null && v !== undefined && v !== '')
  return vals.length && vals.every((v) => toNum(v) !== null) ? 'numeric' : 'category'
})
const colorDomain = computed<[number, number]>(() => {
  const vals = props.data.map((r) => toNum(r[props.colorBy])).filter((n): n is number => n !== null)
  return vals.length ? (d3.extent(vals) as [number, number]) : [0, 1]
})
const categories = computed(() => [...new Set(props.data.map((r) => String(r[props.colorBy] ?? '')))].filter(Boolean))
const categoryColor = (c: string) => {
  const i = categories.value.indexOf(c)
  return i >= 0 && i < chartPalette.categorical.length ? chartPalette.categorical[i] : chartPalette.other
}
// 連續色階要實際的顏色才能內插：借 DOM 算出 CSS 變數的值（主題改變時重算）
const themeTick = ref(0)
const interp = computed(() => {
  void themeTick.value
  const host = containerRef.value
  return d3.interpolateRgb(resolveCanvasColor(props.colorRange[0], host), resolveCanvasColor(props.colorRange[1], host))
})
function colorOf(i: number): string {
  const row = props.data[i]
  if (colorMode.value === 'none') return chartPalette.primary
  if (colorMode.value === 'category') return categoryColor(String(row[props.colorBy] ?? ''))
  const [lo, hi] = colorDomain.value
  const n = toNum(row[props.colorBy])
  return n !== null ? interp.value(hi === lo ? 1 : (n - lo) / (hi - lo)) : chartPalette.other
}
const colorTitle = computed(() => props.colorLabel || props.axes.find((a) => a.key === props.colorBy)?.label || props.colorBy)

// ---- 框選 ----
type BrushDrag = { key: string; mode: 'new' | 'move'; startY: number; startRange?: [number, number]; moved: boolean; pointer: number }
let brushDrag: BrushDrag | null = null
const localY = (e: PointerEvent) => {
  const svg = (e.currentTarget as SVGElement).ownerSVGElement ?? (e.currentTarget as SVGElement)
  return e.clientY - svg.getBoundingClientRect().top - M.value.top
}
function onAxisDown(e: PointerEvent, a: ParallelAxis): void {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  const y = localY(e)
  const b = brushOf(a.key)
  const inside = b && y >= brushY(a)[0] && y <= brushY(a)[1]
  brushDrag = { key: a.key, mode: inside ? 'move' : 'new', startY: y, startRange: b, moved: false, pointer: e.pointerId }
}
function onAxisMove(e: PointerEvent, a: ParallelAxis): void {
  const d = brushDrag
  if (!d || d.pointer !== e.pointerId || d.key !== a.key) {
    hoverIdx.value = -1
    return
  }
  const y = Math.min(plotH.value, Math.max(0, localY(e)))
  if (Math.abs(y - d.startY) < 3 && !d.moved) return
  d.moved = true
  if (d.mode === 'new') {
    brushes.value = { ...brushes.value, [a.key]: [valueAtY(a, d.startY), valueAtY(a, y)].sort((p, q) => p - q) as [number, number] }
  } else if (d.startRange) {
    const [lo, hi] = domains.value[a.key]
    const delta = valueAtY(a, y) - valueAtY(a, d.startY)
    const [p, q] = d.startRange
    const shift = Math.min(hi - Math.max(p, q), Math.max(lo - Math.min(p, q), delta))
    brushes.value = { ...brushes.value, [a.key]: [p + shift, q + shift] }
  }
}
function onAxisUp(e: PointerEvent, a: ParallelAxis): void {
  const d = brushDrag
  brushDrag = null
  if (!d || d.pointer !== e.pointerId) return
  if (!d.moved) {
    // 點一下（沒拖）：清除這條軸的框選
    if (!brushOf(a.key)) return
    const next = { ...brushes.value }
    delete next[a.key]
    setBrushes(next)
    return
  }
  setBrushes(brushes.value)
}
function onAxisCancel(): void {
  brushDrag = null
  brushes.value = props.brushes
}

// ---- 換軸的位置 ----
let titleDrag: { key: string; pointer: number; startX: number; startIndex: number; moved: boolean } | null = null
const localX = (e: PointerEvent) => {
  const svg = (e.currentTarget as SVGElement).ownerSVGElement!
  return e.clientX - svg.getBoundingClientRect().left - M.value.left
}
function onTitleDown(e: PointerEvent, a: ParallelAxis): void {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  titleDrag = { key: a.key, pointer: e.pointerId, startX: localX(e), startIndex: order.value.indexOf(a.key), moved: false }
}
function onTitleMove(e: PointerEvent): void {
  const d = titleDrag
  if (!d || d.pointer !== e.pointerId) return
  const x = localX(e)
  if (!d.moved && Math.abs(x - d.startX) < 4) return
  d.moved = true
  draggingAxis.value = d.key
  dragX.value = Math.min(plotW.value, Math.max(0, x))
}
function onTitleUp(e: PointerEvent): void {
  const d = titleDrag
  titleDrag = null
  if (!d || d.pointer !== e.pointerId) return
  if (d.moved && dragX.value !== null) {
    const others = order.value.filter((k) => k !== d.key)
    const positions = others.map((k) => order.value.indexOf(k) * step.value)
    const to = indexAtX(dragX.value, positions)
    setOrder([...others.slice(0, to), d.key, ...others.slice(to)])
  }
  draggingAxis.value = null
  dragX.value = null
}
function setOrder(next: string[]): void {
  order.value = next
  emit('update:order', next)
}
const focusAxis = ref<string | null>(null)
function onTitleKeydown(e: KeyboardEvent, a: ParallelAxis, i: number): void {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault()
    const to = i + (e.key === 'ArrowLeft' ? -1 : 1)
    if (to < 0 || to >= order.value.length) return
    setOrder(moveAxis(order.value, i, to))
    const target = e.currentTarget as SVGGElement
    void nextTick(() => target.focus())
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && brushOf(a.key)) {
    e.preventDefault()
    const next = { ...brushes.value }
    delete next[a.key]
    setBrushes(next)
  }
}
function axisLabel(a: ParallelAxis): string {
  const [lo, hi] = domains.value[a.key]
  const b = brushOf(a.key)
  return i18n.value.parallel.axis(a.label, fmt(lo), fmt(hi), b ? i18n.value.parallel.brushed(fmt(Math.min(...b)), fmt(Math.max(...b))) : '')
}

// ---- 滑過 ----
const hoverIdx = ref(-1)
const tip = computed(() => {
  const i = hoverIdx.value
  if (i < 0 || !props.data[i]) return null
  const row = props.data[i]
  const lines = [props.labelKey ? String(row[props.labelKey] ?? '') : i18n.value.parallel.row(i + 1)]
  for (const a of orderedAxes.value) {
    const n = toNum(row[a.key])
    lines.push(i18n.value.parallel.value(a.label, n !== null ? `${fmt(n)}${a.unit ? ` ${a.unit}` : ''}` : '—'))
  }
  return { lines, style: tooltipPlacement(M.value.left + plotW.value / 2, M.value.top + 10, effectiveWidth.value, effectiveHeight.value, 180, 18 * lines.length + 8) }
})

// ---- Canvas ----
const useCanvas = computed(() => props.data.length > props.canvasThreshold)
function draw(): void {
  const canvas = canvasRef.value
  if (!useCanvas.value || !canvas) return
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  canvas.width = Math.round(plotW.value * dpr)
  canvas.height = Math.round(plotH.value * dpr)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, plotW.value, plotH.value)
  const host = containerRef.value
  const cache = new Map<string, string>()
  const resolve = (c: string) => cache.get(c) ?? (cache.set(c, resolveCanvasColor(c, host)), cache.get(c)!)
  ctx.lineWidth = 1
  for (const i of drawOrder.value) {
    const sel = selectedSet.value.has(i)
    ctx.strokeStyle = resolve(sel ? colorOf(i) : chartPalette.muted)
    ctx.globalAlpha = sel ? props.lineOpacity : 0.35
    ctx.stroke(new Path2D(pathOf(i)))
  }
  ctx.globalAlpha = 1
}
watch([useCanvas, drawOrder, orderedAxes, plotW, plotH, interp, dragX], () => nextTick(draw), { flush: 'post', immediate: true })
let themeObserver: MutationObserver | null = null
onMounted(() => {
  if (typeof MutationObserver !== 'undefined') {
    themeObserver = new MutationObserver(() => themeTick.value++)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })
  }
})
onBeforeUnmount(() => themeObserver?.disconnect())

const ariaLabel = computed(() =>
  i18n.value.parallel.ariaLabel(
    props.title || i18n.value.parallel.title,
    orderedAxes.value.map((a) => a.label),
    props.data.length,
    selectedIdx.value.length
  )
)

defineExpose({
  /** 清除所有框選 */
  clearBrushes: () => setBrushes({}),
  /** 設定某條軸的框選（null 清除） */
  setBrush: (key: string, range: [number, number] | null) => {
    const next = { ...brushes.value }
    if (range) next[key] = range
    else delete next[key]
    setBrushes(next)
  },
  /** 目前符合框選的資料 */
  selected: computed(() => selectedIdx.value.map((i) => props.data[i])),
})
</script>
