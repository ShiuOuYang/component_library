<template>
  <div ref="container" class="wafer-map flex flex-col gap-2" :class="props.autoResize ? 'h-full w-full' : ''">
    <div v-if="props.title || (props.showYield && summary.yield !== null)" class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
      <p v-if="props.showYield && summary.yield !== null" class="wafer-yield text-sm text-content-secondary tabular-nums">
        {{ i18n.waferMap.yieldLabel }}
        <strong class="text-base text-content-primary">{{ formatPct(summary.yield) }}</strong>
        <span class="text-xs text-content-tertiary">{{ i18n.waferMap.yieldCount(summary.pass, summary.total) }}</span>
      </p>
    </div>

    <div
      ref="plotBox"
      class="wafer-plot relative"
      :class="props.autoResize ? 'min-h-0 flex-1' : ''"
      :style="props.autoResize ? undefined : { width: `${props.width}px`, height: `${props.height}px` }"
    >
      <p v-if="!dies.length" class="absolute inset-0 flex items-center justify-center text-sm text-content-tertiary">
        {{ props.emptyText ?? i18n.waferMap.empty }}
      </p>
      <template v-else>
        <canvas ref="canvas" class="absolute left-0 top-0" :style="{ width: `${size.width}px`, height: `${size.height}px` }" aria-hidden="true"></canvas>
        <svg class="pointer-events-none absolute left-0 top-0 overflow-visible" :width="size.width" :height="size.height" aria-hidden="true">
          <!-- 外框：晶圓為圓、面板為矩形 -->
          <circle
            v-if="layout && layout.shape === 'wafer'"
            class="wafer-frame"
            :cx="layout.cx"
            :cy="layout.cy"
            :r="layout.radius"
            fill="none"
            :style="{ stroke: chartTheme.axis }"
            stroke-width="1.5"
          />
          <rect
            v-else-if="layout"
            class="wafer-frame"
            :x="layout.frame.x - 2"
            :y="layout.frame.y - 2"
            :width="layout.frame.width + 4"
            :height="layout.frame.height + 4"
            rx="3"
            fill="none"
            :style="{ stroke: chartTheme.axis }"
            stroke-width="1.5"
          />
          <polygon v-if="notch" class="wafer-notch" :points="notch" :style="{ fill: chartTheme.surface, stroke: chartTheme.axis }" stroke-width="1.5" />
          <!-- 分區良率的同心圓 -->
          <g v-if="ringCircles.length" class="wafer-rings">
            <circle
              v-for="r in ringCircles"
              :key="r"
              :cx="gridCenter.x"
              :cy="gridCenter.y"
              :r="r"
              fill="none"
              :style="{ stroke: chartTheme.text }"
              stroke-opacity="0.7"
              stroke-dasharray="5 3"
              stroke-width="1.5"
            />
          </g>
          <rect
            v-if="highlightRect"
            class="wafer-highlight"
            :x="highlightRect.x - 1"
            :y="highlightRect.y - 1"
            :width="highlightRect.width + 2"
            :height="highlightRect.height + 2"
            fill="none"
            :style="{ stroke: chartTheme.text }"
            stroke-width="2"
          />
          <rect
            v-if="cursorRect"
            class="wafer-cursor"
            :x="cursorRect.x - 1.5"
            :y="cursorRect.y - 1.5"
            :width="cursorRect.width + 3"
            :height="cursorRect.height + 3"
            fill="none"
            :style="{ stroke: chartTheme.accent }"
            stroke-width="2"
          />
        </svg>
        <!-- 互動層：滑鼠與鍵盤都在這裡 -->
        <div
          class="wafer-hit absolute inset-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--t-stroke-focus))]"
          tabindex="0"
          role="application"
          :aria-label="ariaLabel"
          @mousemove="onMove"
          @mouseleave="onLeave"
          @click="onClick"
          @keydown="onKey"
          @blur="cursor = null"
        ></div>
        <div
          v-if="tooltip"
          class="wafer-tooltip pointer-events-none absolute z-10 whitespace-nowrap rounded-md border px-2 py-1 text-xs shadow-md"
          :style="{ left: `${tooltip.left}px`, top: `${tooltip.top}px`, background: chartTheme.surface, borderColor: chartTheme.border, color: chartTheme.text }"
          data-export-ignore
        >
          <div v-for="(line, i) in tooltip.lines" :key="i" :class="i === 0 ? 'font-medium' : 'text-content-secondary'">{{ line }}</div>
        </div>
      </template>
    </div>

    <!-- 圖例：bin 模式列出各 bin 與顆數；數值模式畫色階 -->
    <div v-if="props.showLegend && dies.length && !isValueMode" class="flex flex-wrap gap-1" role="group" :aria-label="i18n.waferMap.legend">
      <button
        v-for="b in legendBins"
        :key="b.value"
        type="button"
        class="wafer-legend-item inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs text-content-secondary hover:bg-surface-tertiary"
        :class="hiddenSet.has(b.value) ? 'opacity-45 line-through' : ''"
        :aria-pressed="!hiddenSet.has(b.value)"
        @click="toggleBin(b.value)"
      >
        <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" :style="{ background: b.color }"></span>
        <span>{{ b.label }}</span>
        <span v-if="b.pass && b.label !== i18n.waferMap.pass" class="text-content-tertiary">· {{ i18n.waferMap.pass }}</span>
        <span class="tabular-nums text-content-tertiary">{{ b.count.toLocaleString() }}</span>
      </button>
    </div>
    <div v-else-if="props.showLegend && dies.length && isValueMode" class="wafer-scale flex items-center gap-2 text-xs text-content-secondary tabular-nums">
      <span>{{ formatValue(valueDomain[0]) }}</span>
      <span class="h-2.5 min-w-24 flex-1 rounded-sm" :style="{ background: gradientCss }" aria-hidden="true"></span>
      <span>{{ formatValue(valueDomain[1]) }}</span>
    </div>

    <dl v-if="ringStats.length" class="wafer-ring-yield flex flex-wrap gap-x-4 gap-y-1 text-xs text-content-secondary">
      <dt class="sr-only">{{ i18n.waferMap.ringYield }}</dt>
      <div v-for="r in ringStats" :key="r.ring" class="flex gap-1">
        <dt>{{ i18n.waferMap.ring(r.ring, ringStats.length) }}</dt>
        <dd class="tabular-nums text-content-primary">{{ r.yield === null ? '—' : formatPct(r.yield) }}</dd>
      </div>
    </dl>

    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import * as d3 from 'd3'
import { chartPalette, chartTheme } from './chartTheme'
import { resolveCanvasColor } from './utils/largeData'
import {
  cellAt,
  cellKey,
  centerCell,
  dieRect,
  farthestCorner,
  gridOf,
  layoutWafer,
  notchPath,
  ringYields,
  stepCell,
  summarizeBins,
  type WaferGrid,
  type WaferNotch,
  type WaferShape,
} from './utils/waferMap'
import { useLocale } from '../shared/config'

/**
 * WaferMap —— 晶圓圖／面板圖
 *
 * 每筆資料是一顆晶粒（die）：行列座標 (x, y) 加上 bin（分類）或量測值。
 * - bin 模式：每個 bin 一個顏色，標題列顯示良率；圖例點一下把該 bin 淡化（不移除 —— 位置分佈本身就是資訊）
 * - 數值模式（給 valueField）：依數值上連續色階，看參數在晶圓上的分佈（中心高、邊緣低…）
 * - rings：把晶圓分成幾圈同心環，各圈分別算良率（邊緣良率損失一眼看出來）
 * - 晶粒畫在 Canvas（數萬顆也順），外框、缺口、游標畫在 SVG
 * - 鍵盤：Tab 進入後方向鍵逐顆移動（跳過空格）、Enter 等同點擊，目前晶粒以 aria-live 念出
 */

type Row = Record<string, unknown>

/** 一個 bin 的顯示設定 */
export interface WaferBin {
  value: string | number
  label?: string
  color: string
  /** 算良品；不設定時看 passBins */
  pass?: boolean
}

/** 晶粒的資訊（事件與提示框用） */
export interface WaferDieInfo {
  x: number
  y: number
  bin: string
  binLabel: string
  value: number | null
  pass: boolean
  datum: Row
  index: number
}

interface WaferMapProps {
  data: Row[]
  width?: number
  height?: number
  /** 跟著容器大小調整（容器需有高度） */
  autoResize?: boolean
  debounceDelay?: number

  xField?: string
  yField?: string
  binField?: string
  /** 給了就是數值模式：依這個欄位的數值上色 */
  valueField?: string
  /** 資料鍵的欄位（highlightKey 用）；沒有時用索引 */
  keyField?: string

  /** 外形：晶圓（圓）或面板（矩形） */
  shape?: WaferShape
  /** 定位缺口的位置（只有晶圓有） */
  notch?: WaferNotch
  /** y 往上增加（預設往下，第 0 列在最上面） */
  flipY?: boolean
  /** 晶粒寬高比（寬 / 高） */
  dieAspect?: number
  /** 晶粒之間的間隙（像素）；晶粒小於 4px 時自動不留 */
  dieGap?: number
  /** 固定格線範圍（多片晶圓並排比較時讓大小一致）；不給時依資料 */
  grid?: WaferGrid | null

  /** bin 設定；資料裡有但沒設定的 bin 自動配色 */
  bins?: WaferBin[]
  /** 沒有在 bins 指定 pass 時，哪些 bin 算良品 */
  passBins?: Array<string | number>
  /** 淡化的 bin（v-model:hidden-bins） */
  hiddenBins?: Array<string | number>

  /** 數值模式的色階範圍；不給時依資料 */
  valueDomain?: [number, number] | null
  /** 數值模式的色階（兩個以上的顏色，低 → 高）；不給時用 viridis */
  valueColors?: string[] | null
  valueFormat?: ((v: number) => string) | null

  /** 分成幾圈算分區良率（0 為不分） */
  rings?: number
  title?: string
  showYield?: boolean
  showLegend?: boolean
  enableTooltip?: boolean
  /** 自訂提示框內容（每行一個字串） */
  tooltipFormatter?: ((info: WaferDieInfo) => string[]) | null
  /** 要框起來的晶粒（對應 keyField） */
  highlightKey?: string | number | null
  emptyText?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const i18n = useLocale()
const props = withDefaults(defineProps<WaferMapProps>(), {
  width: 360,
  height: 360,
  autoResize: false,
  debounceDelay: 100,
  xField: 'x',
  yField: 'y',
  binField: 'bin',
  valueField: undefined,
  keyField: undefined,
  shape: 'wafer',
  notch: 'bottom',
  flipY: false,
  dieAspect: 1,
  dieGap: 1,
  grid: null,
  bins: () => [],
  passBins: () => [1, '1', 'PASS', 'Pass', 'OK', 'P'],
  hiddenBins: undefined,
  valueDomain: null,
  valueColors: null,
  valueFormat: null,
  rings: 0,
  title: '',
  showYield: true,
  showLegend: true,
  enableTooltip: true,
  tooltipFormatter: null,
  highlightKey: null,
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'die-click', info: WaferDieInfo): void
  (e: 'die-hover', info: WaferDieInfo | null): void
  (e: 'update:hiddenBins', bins: string[]): void
}>()

const container = useTemplateRef<HTMLElement>('container')
const plotBox = useTemplateRef<HTMLElement>('plotBox')
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')

// === 資料 ===

interface Die {
  x: number
  y: number
  bin: string
  value: number
  datum: Row
  index: number
  key: string
}

const isValueMode = computed(() => !!props.valueField)

const dies = computed<Die[]>(() => {
  const out: Die[] = []
  props.data.forEach((datum, index) => {
    const x = Number(datum[props.xField])
    const y = Number(datum[props.yField])
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    const raw = props.valueField ? datum[props.valueField] : NaN
    out.push({
      x,
      y,
      bin: String(datum[props.binField] ?? ''),
      value: raw === null || raw === undefined || raw === '' ? NaN : Number(raw),
      datum,
      index,
      key: props.keyField ? String(datum[props.keyField]) : String(index),
    })
  })
  return out
})

const lookup = computed(() => {
  const m = new Map<string, Die>()
  for (const d of dies.value) m.set(cellKey(d.x, d.y), d)
  return m
})

const grid = computed<WaferGrid | null>(() => props.grid ?? gridOf(dies.value))

// === bin ===

interface ResolvedBin {
  value: string
  label: string
  color: string
  pass: boolean
  count: number
}

const passSet = computed(() => new Set(props.passBins.map(String)))

const resolvedBins = computed<Map<string, ResolvedBin>>(() => {
  const map = new Map<string, ResolvedBin>()
  for (const b of props.bins) {
    const v = String(b.value)
    map.set(v, { value: v, label: b.label ?? v, color: b.color, pass: b.pass ?? passSet.value.has(v), count: 0 })
  }
  // 資料裡有、設定裡沒有的 bin：良品用「好」的狀態色，其他依序取類別色（超過 8 種併成「其他」色）
  const extra = [...new Set(dies.value.map((d) => d.bin))].filter((v) => !map.has(v))
  extra.sort((a, b) => {
    const na = Number(a)
    const nb = Number(b)
    return Number.isFinite(na) && Number.isFinite(nb) ? na - nb : a.localeCompare(b)
  })
  let next = 1 // 類別色 1 號留給良品之外的第一個 bin（0 號與「好」的綠色相近時容易混淆）
  for (const v of extra) {
    const pass = passSet.value.has(v)
    const color = pass ? chartPalette.good : (chartPalette.categorical[next++] ?? chartPalette.other)
    map.set(v, { value: v, label: v === '' ? i18n.value.chart.others : v, color, pass, count: 0 })
  }
  for (const d of dies.value) {
    const b = map.get(d.bin)
    if (b) b.count++
  }
  return map
})

const legendBins = computed(() => [...resolvedBins.value.values()])

const isPass = (bin: string) => resolvedBins.value.get(bin)?.pass ?? passSet.value.has(bin)

const summary = computed(() => {
  if (isValueMode.value) return { total: dies.value.length, pass: 0, yield: null as number | null, counts: [] }
  return summarizeBins(dies.value.map((d) => d.bin), isPass)
})

// 淡化的 bin：受控（hiddenBins）或內部狀態
const innerHidden = ref<string[]>([])
const hiddenSet = computed(() => new Set((props.hiddenBins ?? innerHidden.value).map(String)))
function toggleBin(value: string): void {
  const next = new Set(hiddenSet.value)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  innerHidden.value = [...next]
  emit('update:hiddenBins', [...next])
}

// === 數值色階 ===

const valueDomain = computed<[number, number]>(() => {
  if (props.valueDomain) return props.valueDomain
  const ext = d3.extent(dies.value.map((d) => d.value).filter(Number.isFinite)) as [number | undefined, number | undefined]
  if (ext[0] === undefined || ext[1] === undefined) return [0, 1]
  return ext[0] === ext[1] ? [ext[0] - 1, ext[1] + 1] : [ext[0], ext[1]]
})

const colorOfValue = computed<(v: number) => string>(() => {
  const [lo, hi] = valueDomain.value
  const colors = props.valueColors && props.valueColors.length >= 2 ? props.valueColors : null
  if (!colors) {
    const s = d3.scaleSequential(d3.interpolateViridis).domain([lo, hi]).clamp(true)
    return (v) => s(v)
  }
  const stops = colors.map((_, i) => lo + ((hi - lo) * i) / (colors.length - 1))
  const s = d3.scaleLinear<string>().domain(stops).range(colors).interpolate(d3.interpolateRgb).clamp(true)
  return (v) => s(v)
})

const gradientCss = computed(() => {
  const [lo, hi] = valueDomain.value
  const steps = 8
  const parts = Array.from({ length: steps + 1 }, (_, i) => `${colorOfValue.value(lo + ((hi - lo) * i) / steps)} ${(i / steps) * 100}%`)
  return `linear-gradient(to right, ${parts.join(', ')})`
})

const formatValue = (v: number) => (props.valueFormat ? props.valueFormat(v) : d3.format('~r')(Number(v.toPrecision(4))))
const formatPct = (v: number) => `${(v * 100).toFixed(1)}%`

// === 排版 ===

const observed = ref({ width: props.width, height: props.height })
const size = computed(() => (props.autoResize ? observed.value : { width: props.width, height: props.height }))

const layout = computed(() => {
  if (!grid.value || size.value.width <= 0 || size.value.height <= 0) return null
  return layoutWafer({
    width: size.value.width,
    height: size.value.height,
    grid: grid.value,
    shape: props.shape,
    dieAspect: props.dieAspect,
    flipY: props.flipY,
    // 固定 grid 時（多片並排）大小只看行列數，才會每片一致；否則依實際晶粒，剛好放進圓內
    reach: props.grid ? null : farthestCorner(dies.value, grid.value, props.dieAspect),
  })
})

const notch = computed(() => {
  if (!layout.value) return ''
  const pts = notchPath(layout.value, props.notch)
  return pts ? pts.map(([x, y]) => `${x},${y}`).join(' ') : ''
})

const gridCenter = computed(() => {
  const l = layout.value
  if (!l) return { x: 0, y: 0 }
  const cols = l.grid.maxX - l.grid.minX + 1
  const rows = l.grid.maxY - l.grid.minY + 1
  return { x: l.originX + (cols * l.pitchX) / 2, y: l.originY + (rows * l.pitchY) / 2 }
})

const ringResult = computed(() => {
  if (!props.rings || isValueMode.value || !grid.value || !dies.value.length) return null
  return ringYields(dies.value.map((d) => ({ x: d.x, y: d.y, pass: isPass(d.bin) })), grid.value, props.rings, props.dieAspect)
})
const ringStats = computed(() => ringResult.value?.rings ?? [])
/** 各圈的分界（像素半徑）；最外圈的外緣不畫（就是晶圓邊） */
const ringCircles = computed(() => {
  const r = ringResult.value
  const l = layout.value
  if (!r || !l || r.rings.length < 2) return []
  // 分界落在兩圈晶粒中心之間；加半顆讓圈線不壓在最遠那顆晶粒的中心上
  const maxPx = (r.maxRadius + 0.5) * l.pitchY
  return r.rings.slice(0, -1).map((ring) => ring.outer * maxPx)
})

// === 繪製 ===

function draw(): void {
  const el = canvas.value
  const l = layout.value
  if (!el || !l) return
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const { width, height } = size.value
  el.width = Math.round(width * dpr)
  el.height = Math.round(height * dpr)
  const ctx = el.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)

  const host = container.value
  const cache = new Map<string, string>()
  const resolve = (c: string) => {
    let v = cache.get(c)
    if (v === undefined) cache.set(c, (v = resolveCanvasColor(c, host)))
    return v
  }
  const muted = resolve(chartPalette.muted)
  const other = resolve(chartPalette.other)
  const gap = Math.min(l.pitchX, l.pitchY) < 4 ? 0 : props.dieGap

  for (const d of dies.value) {
    let color: string
    if (isValueMode.value) {
      color = Number.isFinite(d.value) ? colorOfValue.value(d.value) : muted
    } else if (hiddenSet.value.has(d.bin)) {
      color = muted
    } else {
      const b = resolvedBins.value.get(d.bin)
      color = b ? resolve(b.color) : other
    }
    const r = dieRect(l, d.x, d.y)
    ctx.fillStyle = color
    ctx.fillRect(r.x + gap / 2, r.y + gap / 2, Math.max(0.5, r.width - gap), Math.max(0.5, r.height - gap))
  }
}

watch([dies, layout, resolvedBins, hiddenSet, colorOfValue, () => props.dieGap], () => nextTick(draw), { flush: 'post' })

let observer: ResizeObserver | null = null
let timer: ReturnType<typeof setTimeout> | null = null
onMounted(() => {
  draw()
  if (!props.autoResize || !plotBox.value || typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver((entries) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      const rect = entries[entries.length - 1]?.contentRect
      if (!rect || !plotBox.value) return
      observed.value = { width: Math.floor(rect.width), height: Math.floor(rect.height) }
    }, props.debounceDelay)
  })
  observer.observe(plotBox.value)
})
onUnmounted(() => {
  observer?.disconnect()
  if (timer) clearTimeout(timer)
})

// === 互動 ===

function infoOf(d: Die): WaferDieInfo {
  const b = resolvedBins.value.get(d.bin)
  return {
    x: d.x,
    y: d.y,
    bin: d.bin,
    binLabel: b?.label ?? d.bin,
    value: Number.isFinite(d.value) ? d.value : null,
    pass: !isValueMode.value && isPass(d.bin),
    datum: d.datum,
    index: d.index,
  }
}

function describe(d: Die): string[] {
  const info = infoOf(d)
  if (props.tooltipFormatter) return props.tooltipFormatter(info)
  const lines = [i18n.value.waferMap.coord(d.x, d.y)]
  if (isValueMode.value) lines.push(`${i18n.value.waferMap.value}: ${info.value === null ? '—' : formatValue(info.value)}`)
  else lines.push(`${i18n.value.waferMap.bin} ${info.binLabel}${info.pass ? ` · ${i18n.value.waferMap.pass}` : ''}`)
  return lines
}

const hover = ref<Die | null>(null)
const cursor = ref<Die | null>(null)
const announcement = ref('')
const tooltip = ref<{ left: number; top: number; lines: string[] } | null>(null)

function dieAtEvent(e: MouseEvent): Die | null {
  const l = layout.value
  const box = plotBox.value
  if (!l || !box) return null
  const rect = box.getBoundingClientRect()
  const cell = cellAt(l, e.clientX - rect.left, e.clientY - rect.top)
  return cell ? (lookup.value.get(cellKey(cell.x, cell.y)) ?? null) : null
}

function showTooltipFor(d: Die | null): void {
  const l = layout.value
  if (!d || !l || !props.enableTooltip) {
    tooltip.value = null
    return
  }
  const r = dieRect(l, d.x, d.y)
  // 放在晶粒右上方；靠右邊時改放左邊
  const right = r.x + r.width + 8
  const left = right + 160 > size.value.width ? Math.max(0, r.x - 168) : right
  tooltip.value = { left, top: Math.max(0, r.y - 8), lines: describe(d) }
}

function onMove(e: MouseEvent): void {
  const d = dieAtEvent(e)
  if (d === hover.value) return
  hover.value = d
  showTooltipFor(d)
  emit('die-hover', d ? infoOf(d) : null)
}

function onLeave(): void {
  if (!hover.value) return
  hover.value = null
  tooltip.value = cursor.value ? tooltip.value : null
  emit('die-hover', null)
}

function onClick(e: MouseEvent): void {
  const d = dieAtEvent(e)
  if (d) emit('die-click', infoOf(d))
}

const KEYS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }

function moveCursorTo(d: Die): void {
  cursor.value = d
  showTooltipFor(d)
  announcement.value = describe(d).join(', ')
}

function onKey(e: KeyboardEvent): void {
  const g = grid.value
  if (!g) return
  if (e.key in KEYS) {
    e.preventDefault()
    if (!cursor.value) {
      const start = centerCell(dies.value, g)
      if (start) moveCursorTo(start)
      return
    }
    const [dx, dy] = KEYS[e.key]
    const to = stepCell((x, y) => lookup.value.has(cellKey(x, y)), g, cursor.value, dx, dy, props.flipY)
    const d = lookup.value.get(cellKey(to.x, to.y))
    if (d && d !== cursor.value) moveCursorTo(d)
  } else if ((e.key === 'Enter' || e.key === ' ') && cursor.value) {
    e.preventDefault()
    emit('die-click', infoOf(cursor.value))
  } else if (e.key === 'Escape' && cursor.value) {
    cursor.value = null
    tooltip.value = null
  }
}

const cursorRect = computed(() => (cursor.value && layout.value ? dieRect(layout.value, cursor.value.x, cursor.value.y) : null))

const highlightRect = computed(() => {
  if (props.highlightKey === null || props.highlightKey === undefined || !layout.value) return null
  const d = dies.value.find((v) => v.key === String(props.highlightKey))
  return d ? dieRect(layout.value, d.x, d.y) : null
})

const ariaLabel = computed(() => {
  const s = summary.value
  const text = i18n.value.waferMap.ariaLabel(s.total, s.yield === null ? '' : formatPct(s.yield))
  return props.title ? i18n.value.chart.titled(props.title, text) : text
})

defineExpose({
  /** 重新繪製（容器以外的原因改變大小時） */
  redraw: draw,
  /** 目前的良率統計 */
  summary: () => summary.value,
})
</script>
