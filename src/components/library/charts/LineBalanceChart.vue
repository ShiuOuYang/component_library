<template>
  <div class="line-balance-chart flex flex-col gap-2" :style="props.autoResize ? { width: '100%', height: '100%' } : { width: `${props.width}px` }">
    <!-- 標題與摘要 -->
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
      <template v-if="loads.length">
        <span v-if="props.takt" class="tabular-nums text-content-secondary">{{ i18n.lineBalance.takt(fmt(props.takt)) }}</span>
        <span class="tabular-nums" :style="{ color: overTaktSet.size ? chartPalette.critical : chartTheme.text }">
          {{ i18n.lineBalance.bottleneck(bottleneckName, fmt(summary.bottleneck)) }}
        </span>
        <span v-if="summary.balanceRate !== null" class="tabular-nums text-content-secondary">{{ i18n.lineBalance.balanceRate(pct(summary.balanceRate)) }}</span>
        <span class="tabular-nums text-content-secondary">{{ i18n.lineBalance.totalWork(fmt(summary.totalWork)) }}</span>
        <span class="tabular-nums text-content-secondary">{{
          summary.minOperators === null ? i18n.lineBalance.operators(summary.operators) : i18n.lineBalance.operatorsMin(summary.operators, summary.minOperators)
        }}</span>
        <span v-if="overTaktSet.size" class="font-medium tabular-nums" :style="{ color: chartPalette.critical }">{{ i18n.lineBalance.overTakt(overTaktSet.size) }}</span>
      </template>
    </div>

    <div ref="containerRef" class="relative min-h-0 flex-1" :style="props.autoResize ? undefined : { height: `${props.height}px` }">
      <p v-if="!loads.length" class="flex h-full items-center justify-center text-sm text-content-tertiary">{{ props.emptyText ?? i18n.lineBalance.empty }}</p>
      <svg
        v-else
        ref="svgRef"
        :width="effectiveWidth"
        :height="effectiveHeight"
        class="block select-none"
        role="group"
        :aria-label="ariaLabel"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="cancelDrag"
        @mouseleave="hoverId = null"
      >
        <!-- y 軸格線 -->
        <g>
          <g v-for="t in yTicks" :key="t">
            <line :x1="M.left" :x2="effectiveWidth - M.right" :y1="y(t)" :y2="y(t)" :style="{ stroke: chartTheme.grid }" />
            <text :x="M.left - 6" :y="y(t)" dy="0.32em" text-anchor="end" font-size="11" :style="{ fill: chartTheme.textMuted }">{{ fmt(t) }}</text>
          </g>
          <text v-if="props.unit" :x="M.left - 6" :y="M.top - 8" text-anchor="end" font-size="11" :style="{ fill: chartTheme.textMuted }">{{ props.unit }}</text>
        </g>

        <!-- 拖曳時的目標欄 -->
        <rect
          v-if="drag && drag.moved && dropStation"
          :x="(x(dropStation) ?? 0) - x.step() * x.paddingInner() / 2"
          :y="M.top"
          :width="x.step()"
          :height="plotH"
          :style="{ fill: `color-mix(in srgb, ${chartPalette.primary} 10%, transparent)` }"
          data-export-ignore
        />

        <!-- 各站 -->
        <g v-for="l in loads" :key="l.station.id">
          <g
            v-for="seg in segments(l)"
            :key="seg.el.id"
            :ref="(el) => setSegEl(seg.el.id, el as SVGGElement | null)"
            role="button"
            :tabindex="seg.el.id === activeId ? 0 : -1"
            :aria-label="segLabel(seg.el, l)"
            :aria-pressed="props.draggable ? grabbedId === seg.el.id : undefined"
            class="outline-none"
            :class="props.draggable ? (drag ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'"
            @pointerdown="onPointerDown($event, seg.el)"
            @mouseenter="hoverId = seg.el.id"
            @focus="activeId = seg.el.id; focusId = seg.el.id"
            @blur="focusId = null"
            @keydown="onKeydown($event, seg.el)"
            @click="onSegClick(seg.el)"
          >
            <rect
              :x="x(l.station.id)"
              :y="seg.y"
              :width="x.bandwidth()"
              :height="Math.max(0, seg.h)"
              :style="{
                fill: colorOf(seg.el),
                stroke: isHot(seg.el.id) ? chartTheme.text : chartTheme.surface,
                opacity: drag && drag.id !== seg.el.id && drag.moved ? 0.75 : 1,
              }"
              :stroke-width="isHot(seg.el.id) ? 2 : 1"
              :stroke-dasharray="grabbedId === seg.el.id ? '4 2' : undefined"
            />
            <text
              v-if="seg.h >= 16 && segText(seg.el, x.bandwidth())"
              :x="(x(l.station.id) ?? 0) + x.bandwidth() / 2"
              :y="seg.y + seg.h / 2"
              dy="0.32em"
              text-anchor="middle"
              font-size="11"
              pointer-events="none"
              paint-order="stroke"
              stroke-width="3"
              stroke-linejoin="round"
              :style="{ fill: chartTheme.text, stroke: chartTheme.surface }"
            >{{ segText(seg.el, x.bandwidth()) }}</text>
          </g>
          <!-- 週期 -->
          <text
            :x="(x(l.station.id) ?? 0) + x.bandwidth() / 2"
            :y="y(l.cycle) - 6"
            text-anchor="middle"
            font-size="12"
            font-weight="600"
            :style="{ fill: overTaktSet.has(l.station.id) ? chartPalette.critical : chartTheme.text }"
          >{{ fmt(l.cycle) }}</text>
          <!-- 站名 -->
          <text
            :x="(x(l.station.id) ?? 0) + x.bandwidth() / 2"
            :y="M.top + plotH + 16"
            text-anchor="middle"
            font-size="12"
            :font-weight="l.station.id === summary.bottleneckId ? 600 : 400"
            :style="{ fill: chartTheme.text }"
          >{{ fitText(l.station.name, x.step() - 4, 12) }}</text>
          <text
            v-if="l.operators > 1"
            :x="(x(l.station.id) ?? 0) + x.bandwidth() / 2"
            :y="M.top + plotH + 31"
            text-anchor="middle"
            font-size="11"
            :style="{ fill: chartTheme.textMuted }"
          >{{ i18n.lineBalance.operatorsShort(l.operators) }}</text>
        </g>

        <!-- 平均 -->
        <g v-if="props.showAverage && summary.average !== null">
          <line :x1="M.left" :x2="effectiveWidth - M.right" :y1="y(summary.average)" :y2="y(summary.average)" stroke-dasharray="2 3" :style="{ stroke: chartTheme.textMuted }" />
        </g>
        <!-- 節拍 -->
        <g v-if="props.takt">
          <line :x1="M.left" :x2="effectiveWidth - M.right" :y1="y(props.takt)" :y2="y(props.takt)" stroke-width="2" stroke-dasharray="6 4" :style="{ stroke: chartPalette.critical }" />
          <text
            :x="effectiveWidth - M.right"
            :y="y(props.takt) - 5"
            text-anchor="end"
            font-size="11"
            font-weight="600"
            paint-order="stroke"
            stroke-width="3"
            stroke-linejoin="round"
            :style="{ fill: chartPalette.critical, stroke: chartTheme.surface }"
          >{{ i18n.lineBalance.takt(fmt(props.takt)) }}</text>
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

    <!-- 圖例 -->
    <div v-if="kindList.length || props.showAverage" class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-content-secondary">
      <span v-for="k in kindList" :key="k.key" class="inline-flex items-center gap-1">
        <span class="inline-block h-2.5 w-2.5 rounded-sm" :style="{ background: k.color }" aria-hidden="true"></span>{{ k.label }}
      </span>
      <span v-if="props.showAverage && summary.average !== null" class="inline-flex items-center gap-1 tabular-nums">
        <span class="inline-block w-4 border-t-2 border-dotted" :style="{ borderColor: chartTheme.textMuted }" aria-hidden="true"></span>{{ i18n.lineBalance.average(fmt(summary.average)) }}
      </span>
    </div>
    <p v-if="props.draggable && loads.length" class="text-xs text-content-tertiary">{{ i18n.lineBalance.hint }}</p>

    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
    <table class="sr-only">
      <caption>{{ props.title || i18n.lineBalance.title }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ i18n.lineBalance.station }}</th>
          <th scope="col">{{ i18n.lineBalance.operatorsCol }}</th>
          <th scope="col">{{ i18n.lineBalance.load }}</th>
          <th scope="col">{{ i18n.lineBalance.cycle }}</th>
          <th v-if="props.takt" scope="col">{{ i18n.lineBalance.status }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="l in loads" :key="l.station.id">
          <th scope="row">{{ l.station.name }}</th>
          <td>{{ l.operators }}</td>
          <td>{{ fmt(l.load) }}</td>
          <td>{{ fmt(l.cycle) }}</td>
          <td v-if="props.takt">{{ overTaktSet.has(l.station.id) ? i18n.lineBalance.over : i18n.lineBalance.ok }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import * as d3 from 'd3'
import { chartPalette, chartTheme } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { tooltipPlacement } from './utils/tooltipPlacement'
import { estimateTextWidth } from './utils/chartText'
import { lineBalanceMax, lineBalanceSummary, moveElement, stationLoads, type LbElement, type LbStation, type LbStationLoad } from './utils/lineBalance'
import { useLocale } from '../shared/config'

/**
 * LineBalanceChart —— 線平衡圖（山積圖 / Yamazumi）
 *
 * 用途：找瓶頸站、算平衡率、試排作業元素。每站一根堆疊長條（每段是一個作業元素，依分類上色），
 * 疊上節拍時間（takt）線，超過的站標紅。上方摘要：瓶頸、平衡率、總工時、理論最少人數。
 *
 * - 多人站：週期 = 工時 / 人數（長條高度是週期）
 * - draggable：拖曳作業元素到別站，即時重新堆疊；送出 v-model:elements 與 move
 * - 鍵盤：Tab 進入後方向鍵在作業元素間移動；draggable 時 Enter / 空白鍵拿起、← → 換站、再按 Enter 放下（Esc 取消）
 * - 附隱藏的資料表（各站人數、工時、週期、是否超過節拍）
 */

export interface LineBalanceKind {
  key: string
  label: string
  color?: string
}

interface LineBalanceChartProps {
  stations: LbStation[]
  /** 作業元素（v-model:elements） */
  elements: LbElement[]
  /** 節拍時間；null 不畫 */
  takt?: number | null
  /** 作業分類（顏色與圖例），例如加工 / 搬運 / 等待 */
  kinds?: LineBalanceKind[]
  /** 時間單位（軸與提示） */
  unit?: string
  /** 可以拖曳作業元素到別站 */
  draggable?: boolean
  /** 畫平均週期線（依人數加權） */
  showAverage?: boolean
  title?: string
  width?: number
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  valueFormat?: ((value: number) => string) | null
  emptyText?: string
}

const i18n = useLocale()
const props = withDefaults(defineProps<LineBalanceChartProps>(), {
  takt: null,
  kinds: () => [],
  unit: 's',
  draggable: false,
  showAverage: false,
  title: '',
  width: 720,
  height: 360,
  autoResize: false,
  debounceDelay: 100,
  valueFormat: null,
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'update:elements', elements: LbElement[]): void
  /** 作業元素換站 */
  (e: 'move', detail: { element: LbElement; from: string; to: string; elements: LbElement[] }): void
  (e: 'element-click', element: LbElement, station: LbStation): void
  (e: 'chart-resize', size: { width: number; height: number }): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const { effectiveWidth, effectiveHeight } = useAutoResize(containerRef, props, (size) => emit('chart-resize', size))

// ---- 資料（拖曳中用預覽的排列） ----
const drag = ref<{ id: string; from: string; startX: number; startY: number; moved: boolean; pointerId: number } | null>(null)
const dropStation = ref<string | null>(null)
const grabbedId = ref<string | null>(null)
const grabStation = ref<string | null>(null)
const previewElements = computed(() => {
  const id = drag.value?.moved ? drag.value.id : grabbedId.value
  const to = drag.value?.moved ? dropStation.value : grabStation.value
  if (!id || !to) return props.elements
  const cur = props.elements.find((e) => e.id === id)
  return cur && cur.station !== to ? moveElement(props.elements, id, to) : props.elements
})
const loads = computed(() => stationLoads(props.stations, previewElements.value))
const summary = computed(() => lineBalanceSummary(loads.value, props.takt))
const overTaktSet = computed(() => new Set(summary.value.overTakt))
const bottleneckName = computed(() => props.stations.find((s) => s.id === summary.value.bottleneckId)?.name ?? '')

// ---- 版面 ----
const M = { top: 22, right: 12, bottom: 40, left: 44 }
const plotH = computed(() => Math.max(10, effectiveHeight.value - M.top - M.bottom))
const x = computed(() =>
  d3
    .scaleBand<string>()
    .domain(props.stations.map((s) => s.id))
    .range([M.left, Math.max(M.left + 10, effectiveWidth.value - M.right)])
    .paddingInner(0.3)
    .paddingOuter(0.2)
)
const yMax = computed(() => lineBalanceMax(loads.value, props.takt))
const y = computed(() => d3.scaleLinear().domain([0, yMax.value]).nice().range([M.top + plotH.value, M.top]))
const yTicks = computed(() => y.value.ticks(Math.max(2, Math.floor(plotH.value / 50))))

function segments(l: LbStationLoad) {
  let acc = 0
  return l.elements.map((el) => {
    const v = Math.max(0, el.time) / l.operators
    const y1 = y.value(acc)
    acc += v
    const y0 = y.value(acc)
    return { el, y: y0, h: y1 - y0 }
  })
}

// ---- 顏色與文字 ----
const kindList = computed(() => props.kinds.map((k, i) => ({ ...k, color: k.color ?? chartPalette.categorical[i] ?? chartPalette.other })))
const kindMap = computed(() => new Map(kindList.value.map((k) => [k.key, k])))
const colorOf = (el: LbElement) => (el.kind && kindList.value.length ? kindMap.value.get(el.kind)?.color ?? chartPalette.other : chartPalette.primary)
const defaultFormat = d3.format(',~f')
const fmt = (v: number) => (props.valueFormat ? props.valueFormat(v) : defaultFormat(Number(v.toPrecision(4))))
const pct = (r: number) => `${d3.format('.1f')(r * 100)}%`
const withUnit = (v: number) => (props.unit ? `${fmt(v)} ${props.unit}` : fmt(v))
function fitText(text: string, width: number, size: number): string {
  if (estimateTextWidth(text, size) <= width) return text
  let s = text
  while (s.length > 1 && estimateTextWidth(`${s}…`, size) > width) s = s.slice(0, -1)
  return s.length > 1 ? `${s}…` : ''
}
const segText = (el: LbElement, w: number) => fitText(el.name, w - 6, 11)
const stationOf = (id: string) => props.stations.find((s) => s.id === id)!
const kindLabel = (el: LbElement) => (el.kind ? kindMap.value.get(el.kind)?.label ?? el.kind : '')
function segLabel(el: LbElement, l: LbStationLoad): string {
  return i18n.value.lineBalance.segLabel(el.name, withUnit(el.time), l.station.name, kindLabel(el))
}

// ---- 提示 ----
const hoverId = ref<string | null>(null)
const focusId = ref<string | null>(null)
const activeId = ref<string | null>(null)
watch(
  () => props.elements,
  (els) => {
    if (!els.some((e) => e.id === activeId.value)) activeId.value = els.find((e) => props.stations.some((s) => s.id === e.station))?.id ?? null
  },
  { immediate: true }
)
const isHot = (id: string) => hoverId.value === id || focusId.value === id || grabbedId.value === id || drag.value?.id === id
const tip = computed(() => {
  if (drag.value?.moved) return null
  const id = hoverId.value ?? focusId.value
  if (!id) return null
  for (const l of loads.value) {
    const seg = segments(l).find((s) => s.el.id === id)
    if (!seg) continue
    const lb = i18n.value.lineBalance
    const lines = [seg.el.name, withUnit(seg.el.time)]
    const k = kindLabel(seg.el)
    if (k) lines.push(k)
    lines.push(lb.stationLine(l.station.name, withUnit(l.cycle)))
    const cx = (x.value(l.station.id) ?? 0) + x.value.bandwidth()
    return { lines, style: tooltipPlacement(cx, seg.y, effectiveWidth.value, effectiveHeight.value, 180, 18 * lines.length + 8) }
  }
  return null
})

const ariaLabel = computed(() =>
  i18n.value.lineBalance.ariaLabel(
    props.title || i18n.value.lineBalance.title,
    loads.value.length,
    bottleneckName.value,
    summary.value.balanceRate === null ? '—' : pct(summary.value.balanceRate)
  )
)

// ---- 互動：點擊、拖曳 ----
let suppressClick = false
function onSegClick(el: LbElement): void {
  if (suppressClick) {
    suppressClick = false
    return
  }
  emit('element-click', el, stationOf(el.station))
}
function stationAt(px: number): string | null {
  const sc = x.value
  const ids = sc.domain()
  if (!ids.length) return null
  const i = Math.floor((px - sc.range()[0] - sc.step() * sc.paddingOuter() + (sc.step() * sc.paddingInner()) / 2) / sc.step())
  return ids[Math.max(0, Math.min(ids.length - 1, i))]
}
function localX(e: PointerEvent): number {
  const r = svgRef.value!.getBoundingClientRect()
  return e.clientX - r.left
}
function onPointerDown(e: PointerEvent, el: LbElement): void {
  suppressClick = false
  if (!props.draggable || e.button !== 0) return
  drag.value = { id: el.id, from: el.station, startX: e.clientX, startY: e.clientY, moved: false, pointerId: e.pointerId }
  dropStation.value = el.station
  svgRef.value?.setPointerCapture?.(e.pointerId)
}
function onPointerMove(e: PointerEvent): void {
  const d = drag.value
  if (!d) return
  if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 4) return
  d.moved = true
  hoverId.value = null
  dropStation.value = stationAt(localX(e))
}
function onPointerUp(e: PointerEvent): void {
  const d = drag.value
  if (!d) return
  svgRef.value?.releasePointerCapture?.(d.pointerId)
  const to = d.moved ? stationAt(localX(e)) : null
  drag.value = null
  dropStation.value = null
  if (!d.moved) return
  suppressClick = true
  if (to && to !== d.from) commitMove(d.id, to)
}
function cancelDrag(): void {
  drag.value = null
  dropStation.value = null
}
function commitMove(id: string, to: string): void {
  const el = props.elements.find((e) => e.id === id)
  if (!el || el.station === to) return
  const next = moveElement(props.elements, id, to)
  emit('update:elements', next)
  emit('move', { element: next.find((e) => e.id === id)!, from: el.station, to, elements: next })
  announcement.value = i18n.value.lineBalance.moved(el.name, stationOf(to).name)
}

// ---- 鍵盤 ----
const announcement = ref('')
const segEls = new Map<string, SVGGElement>()
function setSegEl(id: string, el: SVGGElement | null): void {
  if (el) segEls.set(id, el)
  else segEls.delete(id)
}
function focusSeg(id: string): void {
  activeId.value = id
  void nextTick(() => segEls.get(id)?.focus())
}
function onKeydown(e: KeyboardEvent, el: LbElement): void {
  const stIds = props.stations.map((s) => s.id)
  // 拿起中：← → 換站、Enter / 空白放下、Esc 取消
  if (grabbedId.value === el.id) {
    const cur = stIds.indexOf(grabStation.value!)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      const next = stIds[Math.max(0, Math.min(stIds.length - 1, cur + (e.key === 'ArrowLeft' ? -1 : 1)))]
      grabStation.value = next
      announcement.value = i18n.value.lineBalance.grabMove(el.name, stationOf(next).name)
      focusSeg(el.id)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const to = grabStation.value!
      grabbedId.value = null
      grabStation.value = null
      commitMove(el.id, to)
      focusSeg(el.id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      grabbedId.value = null
      grabStation.value = null
      announcement.value = i18n.value.lineBalance.cancelled
      focusSeg(el.id)
    }
    return
  }
  if ((e.key === 'Enter' || e.key === ' ') && props.draggable) {
    e.preventDefault()
    grabbedId.value = el.id
    grabStation.value = el.station
    announcement.value = i18n.value.lineBalance.grabbed(el.name)
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    emit('element-click', el, stationOf(el.station))
    return
  }
  // 方向鍵：↑↓ 同站上下、← → 鄰站
  const l = loads.value.find((x) => x.station.id === el.station)!
  const i = l.elements.findIndex((x) => x.id === el.id)
  let target: LbElement | undefined
  if (e.key === 'ArrowUp') target = l.elements[i + 1]
  else if (e.key === 'ArrowDown') target = l.elements[i - 1]
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const dir = e.key === 'ArrowLeft' ? -1 : 1
    let si = stIds.indexOf(el.station) + dir
    while (si >= 0 && si < stIds.length) {
      const els = loads.value[si].elements
      if (els.length) {
        target = els[Math.min(i, els.length - 1)]
        break
      }
      si += dir
    }
  } else return
  e.preventDefault()
  if (target) focusSeg(target.id)
}

defineExpose({
  /** 目前的各站工時與摘要 */
  summary,
  loads,
})
</script>
