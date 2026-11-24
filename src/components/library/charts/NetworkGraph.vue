<template>
  <div class="network-graph flex flex-col gap-2" :style="props.autoResize ? { width: '100%', height: '100%' } : { width: `${props.width}px`, maxWidth: '100%' }">
    <div class="flex flex-wrap items-center gap-2">
      <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
      <!-- 群組圖例：點一下隱藏 / 顯示 -->
      <div v-if="graph.groups.length > 1" class="flex flex-wrap gap-1" role="group" :aria-label="i18n.network.legend">
        <button
          v-for="g in graph.groups"
          :key="g"
          type="button"
          class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          :class="hiddenGroups.has(g) ? 'border-stroke-light text-content-tertiary line-through' : 'border-stroke-default text-content-secondary'"
          :aria-pressed="!hiddenGroups.has(g)"
          @click="toggleGroup(g)"
        >
          <span class="h-2.5 w-2.5 rounded-full" :style="{ background: groupColor(g), opacity: hiddenGroups.has(g) ? 0.35 : 1 }" aria-hidden="true" />
          {{ g }}
        </button>
      </div>
      <div class="ml-auto inline-flex gap-1">
        <button v-for="b in zoomButtons" :key="b.icon" type="button" :class="iconBtn" :aria-label="b.label" @click="b.run()">
          <span class="material-symbols-outlined text-base" aria-hidden="true">{{ b.icon }}</span>
        </button>
      </div>
    </div>

    <div
      ref="containerRef"
      class="relative min-h-0 flex-1 overflow-hidden rounded-md border border-stroke-light"
      :style="props.autoResize ? undefined : { height: `${props.height}px` }"
    >
      <p v-if="!graph.nodes.length" class="flex h-full items-center justify-center text-sm text-content-tertiary">
        {{ props.emptyText ?? i18n.network.empty }}
      </p>
      <template v-else>
        <canvas
          v-if="useCanvas"
          ref="canvasRef"
          class="block touch-none"
          :class="dragging ? 'cursor-grabbing' : hoverId ? 'cursor-pointer' : 'cursor-grab'"
          :style="{ width: `${viewW}px`, height: `${viewH}px` }"
          role="img"
          :aria-label="ariaLabel"
          @pointerdown="onCanvasDown"
          @pointermove="onCanvasHover"
          @pointerleave="hoverId = null"
          @dblclick="onCanvasDblClick"
          @wheel="onWheel"
        />
        <svg
          v-else
          :width="viewW"
          :height="viewH"
          class="block touch-none select-none"
          :class="dragging ? 'cursor-grabbing' : 'cursor-grab'"
          role="group"
          :aria-label="ariaLabel"
          @pointerdown="onBackgroundDown"
          @wheel="onWheel"
        >
          <defs v-if="props.directed">
            <marker :id="`${uid}-arrow`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
              <path d="M0,0 L10,5 L0,10 z" :style="{ fill: chartTheme.textMuted }" />
            </marker>
          </defs>
          <g :transform="`translate(${view.x},${view.y}) scale(${view.k})`">
            <g fill="none" stroke-linecap="round">
              <line
                v-for="l in shownLinks"
                :key="`l${l.index}`"
                v-bind="linkCoords(l)"
                :style="{ stroke: linkActive(l) ? chartTheme.text : chartTheme.axis, strokeWidth: linkStroke(l) / view.k, opacity: linkOpacity(l) }"
                :marker-end="props.directed ? `url(#${uid}-arrow)` : undefined"
                data-link
              />
            </g>
            <g
              v-for="n in shownNodes"
              :key="n.id"
              :ref="(el) => setNodeEl(n.id, el as SVGGElement | null)"
              :transform="`translate(${n.x},${n.y})`"
              role="button"
              :tabindex="n.id === tabStop ? 0 : -1"
              :aria-label="nodeAria(n)"
              :aria-pressed="selectedId === n.id"
              class="cursor-pointer outline-none"
              :data-node="n.id"
              :style="{ opacity: nodeOpacity(n) }"
              @pointerdown.stop="onNodeDown($event, n)"
              @mouseenter="hoverId = n.id"
              @mouseleave="hoverId = null"
              @focus="onNodeFocus($event, n)"
              @blur="onNodeBlur"
              @keydown="onNodeKey($event, n)"
              @click="onNodeClick($event, n)"
              @dblclick="unpin(n)"
            >
              <circle
                v-if="selectedId === n.id || keyboardFocus === n.id || pathSet?.has(n.id)"
                :r="radius(n) + 4 / view.k"
                fill="none"
                :style="{ stroke: chartTheme.accent, strokeWidth: 2 / view.k }"
              />
              <circle :r="radius(n)" :style="{ fill: nodeColor(n), stroke: chartTheme.surface, strokeWidth: 1.5 / view.k }" />
              <circle v-if="n.fx != null" :r="2 / view.k" :style="{ fill: chartTheme.surface }" data-pin />
              <text
                v-if="labelShown(n)"
                :y="radius(n) + 11 / view.k"
                text-anchor="middle"
                :font-size="11 / view.k"
                pointer-events="none"
                :style="{ fill: chartTheme.text, paintOrder: 'stroke', stroke: chartTheme.surface, strokeWidth: 3 / view.k, strokeLinejoin: 'round' }"
              >
                {{ n.label }}
              </text>
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
    <p v-if="pathInfo" class="text-xs text-content-secondary" data-path>{{ pathInfo }}</p>

    <!-- 給螢幕閱讀器的資料表：每一條連線 -->
    <table class="sr-only">
      <caption>{{ props.title || i18n.network.title }}</caption>
      <thead>
        <tr><th scope="col">{{ i18n.network.source }}</th><th scope="col">{{ i18n.network.target }}</th><th scope="col">{{ i18n.network.weight }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="l in graph.links" :key="`t${l.index}`"><td>{{ l.source.label }}</td><td>{{ l.target.label }}</td><td>{{ fmt(l.value) }}</td></tr>
      </tbody>
    </table>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from 'vue'
import * as d3 from 'd3'
import { chartPalette, chartTheme } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { tooltipPlacement } from './utils/tooltipPlacement'
import { resolveCanvasColor, wheelModifierPressed, type WheelZoomModifier } from './utils/largeData'
import {
  buildNetwork,
  createNetworkSimulation,
  fitTransform,
  networkBounds,
  shortestPath,
  trimSegment,
  type NetworkLink,
  type NetworkLinkInput,
  type NetworkNode,
  type NetworkNodeInput,
} from './utils/network'
import { useLocale } from '../shared/config'

/**
 * NetworkGraph —— 關係圖（力導向網路圖）
 *
 * 用途：設備與子系統的相依關係、物料共用、人員協作、警報之間的關聯。節點大小 = 數值（或連線數）、
 * 線寬 = 權重、顏色 = 群組（同群組會聚在一起）。
 *
 * - 滑過 / 點選節點：高亮它與相鄰節點、其他淡化；點選後 Shift + 點另一個節點：顯示兩者間最短路徑
 * - 拖曳節點：鄰居跟著調整，放開後釘住（雙擊取消）；拖曳空白處平移、Ctrl + 滾輪縮放、按鈕放大縮小與全覽
 * - 點圖例隱藏某個群組；節點多時（canvasThreshold）改用 Canvas 繪製
 * - 鍵盤：Tab 進入後方向鍵依連線數順序移動、Enter 選取、Escape 取消；附隱藏的資料表給螢幕閱讀器
 */

interface NetworkGraphProps {
  nodes: NetworkNodeInput[]
  links: NetworkLinkInput[]
  width?: number
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  title?: string
  /** 有方向（畫箭頭；重複連線依方向分開合併） */
  directed?: boolean
  /** 節點大小依據：auto = 有 value 用 value，否則用連線數 */
  sizeBy?: 'auto' | 'value' | 'degree' | 'none'
  /** 節點半徑範圍 [最小, 最大] */
  nodeSize?: [number, number]
  /** 線寬範圍 [最小, 最大] */
  linkWidth?: [number, number]
  /** 名稱：auto = 大節點、放大或高亮時顯示 */
  labels?: 'auto' | 'always' | 'never'
  /** 群組顏色（沒給的用類別色） */
  groupColors?: Record<string, string>
  /** 同群組聚集的力道（0 不聚集） */
  groupPull?: number
  /** 連線基本長度 */
  linkDistance?: number
  /** 版面計算次數 */
  iterations?: number
  /** 節點數超過時改用 Canvas */
  canvasThreshold?: number
  /** 選取的節點（v-model:selected） */
  selected?: string | null
  /** 滾輪縮放要按住的鍵 */
  wheelZoomModifier?: WheelZoomModifier
  /** 數值格式 */
  valueFormat?: ((value: number) => string) | null
  emptyText?: string
}

const i18n = useLocale()
const props = withDefaults(defineProps<NetworkGraphProps>(), {
  width: 720,
  height: 440,
  autoResize: false,
  debounceDelay: 100,
  title: '',
  directed: false,
  sizeBy: 'auto',
  nodeSize: () => [4, 16],
  linkWidth: () => [1, 6],
  labels: 'auto',
  groupColors: () => ({}),
  groupPull: 0.08,
  linkDistance: 50,
  iterations: 300,
  canvasThreshold: 400,
  selected: null,
  wheelZoomModifier: 'ctrl',
  valueFormat: null,
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'node-click', node: { id: string; label: string; group: string | null; value: number; degree: number }): void
  (e: 'update:selected', id: string | null): void
  /** Shift + 點選找到的最短路徑（不連通時為 null） */
  (e: 'path', path: string[] | null): void
  /** 端點不存在、自己連自己而略過的連線 */
  (e: 'dropped-links', links: NetworkLinkInput[]): void
  (e: 'chart-resize', size: { width: number; height: number }): void
}>()

const uid = useId()
const iconBtn =
  'inline-flex h-7 w-7 items-center justify-center rounded-md border border-stroke-default bg-surface-primary text-content-secondary hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus'
const containerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const { effectiveWidth, effectiveHeight } = useAutoResize(containerRef, props, (size) => emit('chart-resize', size))
/** 外框 border 各 1px */
const viewW = computed(() => Math.max(40, effectiveWidth.value - 2))
const viewH = computed(() => Math.max(40, effectiveHeight.value - 2))

// ---- 資料與版面 ----
const graph = shallowRef(buildNetwork([], []))
/** 位置改變時 +1（d3 直接改節點物件，Vue 看不到） */
const version = ref(0)
let sim: d3.Simulation<NetworkNode, NetworkLink> | null = null

const sizeMode = computed(() => (props.sizeBy !== 'auto' ? props.sizeBy : props.nodes.some((n) => Number.isFinite(n.value)) ? 'value' : 'degree'))
const radiusScale = computed(() => {
  const g = graph.value
  const metric = (n: NetworkNode) => (sizeMode.value === 'value' ? n.value : n.degree)
  const max = d3.max(g.nodes, metric) ?? 0
  const [r0, r1] = props.nodeSize
  if (sizeMode.value === 'none' || !(max > 0)) return () => (r0 + r1) / 2.5
  const s = d3.scaleSqrt().domain([0, max]).range([r0, r1])
  return (n: NetworkNode) => s(metric(n))
})
const radius = (n: NetworkNode) => radiusScale.value(n)

function rebuild(): void {
  sim?.stop()
  const g = buildNetwork(props.nodes, props.links, props.directed)
  // 保留舊位置（資料小改時版面不要整個跳掉）與釘住的節點
  const old = new Map(graph.value.nodes.map((n) => [n.id, n]))
  graph.value = g
  sim = createNetworkSimulation(g, { width: viewW.value, height: viewH.value, radius: radiusScale.value, linkDistance: props.linkDistance, groupPull: props.groupPull })
  let kept = 0
  for (const n of g.nodes) {
    const o = old.get(n.id)
    if (!o) continue
    kept++
    n.x = o.x
    n.y = o.y
    n.fx = o.fx
    n.fy = o.fy
  }
  // 大部分節點都留著時只微調
  sim.alpha(kept > g.nodes.length / 2 ? 0.3 : 1)
  sim.tick(kept > g.nodes.length / 2 ? Math.min(60, props.iterations) : props.iterations)
  if (g.dropped.length) void nextTick(() => emit('dropped-links', g.dropped))
  // 使用者還沒自己平移 / 縮放：每次排版後都重新全覽（例如 autoResize 量到實際大小後）
  if (!userView) fit()
  version.value++
}
onBeforeUnmount(() => sim?.stop())

// ---- 顯示 ----
const hiddenGroups = ref(new Set<string>())
function toggleGroup(g: string): void {
  const next = new Set(hiddenGroups.value)
  if (next.has(g)) next.delete(g)
  else next.add(g)
  hiddenGroups.value = next
}
const visible = (n: NetworkNode) => n.group === null || !hiddenGroups.value.has(n.group)
const shownNodes = computed(() => {
  void version.value
  // 大的先畫、小的疊在上面（才點得到）
  return graph.value.nodes.filter(visible).sort((a, b) => radius(b) - radius(a))
})
const shownLinks = computed(() => {
  void version.value
  return graph.value.links.filter((l) => visible(l.source) && visible(l.target))
})
const useCanvas = computed(() => graph.value.nodes.length > props.canvasThreshold)

function groupColor(g: string): string {
  const i = graph.value.groups.indexOf(g)
  return props.groupColors[g] ?? (i < chartPalette.categorical.length ? chartPalette.categorical[i] : chartPalette.other)
}
const nodeColor = (n: NetworkNode) => n.color ?? (n.group !== null ? groupColor(n.group) : chartPalette.primary)
const maxLinkValue = computed(() => d3.max(graph.value.links, (l) => l.value) ?? 1)
function linkStroke(l: NetworkLink): number {
  const [w0, w1] = props.linkWidth
  const min = d3.min(graph.value.links, (x) => x.value) ?? 0
  if (maxLinkValue.value === min) return (w0 + w1) / 4 + w0 / 2
  return w0 + ((w1 - w0) * l.value) / maxLinkValue.value
}
function linkCoords(l: NetworkLink) {
  const [x1, y1, x2, y2] = props.directed ? trimSegment(l.source.x, l.source.y, l.target.x, l.target.y, radius(l.source), radius(l.target) + 1) : [l.source.x, l.source.y, l.target.x, l.target.y]
  return { x1, y1, x2, y2 }
}

// ---- 高亮：滑過 > 鍵盤焦點 > 選取；路徑另外標 ----
const hoverId = ref<string | null>(null)
const selectedId = ref<string | null>(props.selected)
watch(
  () => props.selected,
  (v) => (selectedId.value = v)
)
const pathIds = ref<string[] | null>(null)
const pathSet = computed(() => (pathIds.value ? new Set(pathIds.value) : null))
const pathLinks = computed(() => {
  const p = pathIds.value
  if (!p) return null
  const keys = new Set<string>()
  for (let i = 1; i < p.length; i++) keys.add([p[i - 1], p[i]].sort().join('\u0000'))
  return keys
})
const focusId = computed(() => hoverId.value ?? selectedId.value)
const focusSet = computed(() => {
  const id = focusId.value
  if (!id || !graph.value.byId.has(id)) return null
  return new Set([id, ...graph.value.neighbors.get(id)!])
})
const linkKey = (l: NetworkLink) => [l.source.id, l.target.id].sort().join('\u0000')
function linkActive(l: NetworkLink): boolean {
  if (pathLinks.value) return pathLinks.value.has(linkKey(l))
  const id = focusId.value
  return !!id && (l.source.id === id || l.target.id === id)
}
function linkOpacity(l: NetworkLink): number {
  if (pathLinks.value) return pathLinks.value.has(linkKey(l)) ? 0.9 : 0.06
  if (!focusSet.value) return 0.45
  return linkActive(l) ? 0.85 : 0.06
}
function nodeOpacity(n: NetworkNode): number {
  if (pathSet.value) return pathSet.value.has(n.id) ? 1 : 0.2
  return !focusSet.value || focusSet.value.has(n.id) ? 1 : 0.2
}
function labelShown(n: NetworkNode): boolean {
  if (props.labels === 'never') return false
  if (props.labels === 'always') return true
  if (focusSet.value?.has(n.id) || pathSet.value?.has(n.id)) return true
  return radius(n) * view.value.k >= 9 || view.value.k >= 1.6
}

// ---- 文字 ----
const fmt = (v: number) => (props.valueFormat ? props.valueFormat(v) : d3.format(',~f')(Number(v.toPrecision(6))))
function nodeLines(n: NetworkNode): string[] {
  const s = i18n.value.network
  const lines = [n.label]
  if (n.group !== null) lines.push(s.group(n.group))
  lines.push(s.degree(n.degree))
  if (sizeMode.value === 'value') lines.push(s.value(fmt(n.value)))
  return lines
}
const nodeAria = (n: NetworkNode) => [...nodeLines(n), ...(n.fx != null ? [i18n.value.network.pinned] : [])].join(i18n.value.network.separator)
const ariaLabel = computed(() => i18n.value.network.ariaLabel(props.title || i18n.value.network.title, graph.value.nodes.length, graph.value.links.length))
const tip = computed(() => {
  void version.value
  const id = hoverId.value
  const n = id ? graph.value.byId.get(id) : undefined
  if (!n || dragging.value) return null
  const v = view.value
  return { lines: nodeLines(n), style: tooltipPlacement(v.x + n.x * v.k + radius(n) * v.k, v.y + n.y * v.k, viewW.value, viewH.value, 180, 80) }
})
const pathInfo = computed(() => {
  const p = pathIds.value
  if (!p) return ''
  const s = i18n.value.network
  return s.pathText(p.map((id) => graph.value.byId.get(id)?.label ?? id).join(' → '), p.length - 1)
})

// ---- 縮放與平移 ----
const view = ref({ k: 1, x: 0, y: 0 })
/** 使用者自己平移或縮放過（之後重新排版不自動全覽） */
let userView = false
function fit(): void {
  userView = false
  const nodes = graph.value.nodes.filter(visible)
  view.value = fitTransform(networkBounds(nodes, radius), viewW.value, viewH.value)
}
function zoomBy(factor: number, cx = viewW.value / 2, cy = viewH.value / 2): void {
  const v = view.value
  userView = true
  const k = Math.max(0.1, Math.min(8, v.k * factor))
  const r = k / v.k
  view.value = { k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r }
}
const zoomButtons = computed(() => [
  { icon: 'add', label: i18n.value.network.zoomIn, run: () => zoomBy(1.3) },
  { icon: 'remove', label: i18n.value.network.zoomOut, run: () => zoomBy(1 / 1.3) },
  { icon: 'fit_screen', label: i18n.value.network.fit, run: fit },
])
function localPoint(e: { clientX: number; clientY: number }): [number, number] {
  const r = (canvasRef.value ?? containerRef.value)?.getBoundingClientRect()
  return [e.clientX - (r?.left ?? 0), e.clientY - (r?.top ?? 0)]
}
const toGraph = (px: number, py: number): [number, number] => [(px - view.value.x) / view.value.k, (py - view.value.y) / view.value.k]
function onWheel(e: WheelEvent): void {
  if (!wheelModifierPressed(e, props.wheelZoomModifier)) return
  e.preventDefault()
  const [px, py] = localPoint(e)
  zoomBy(Math.exp(-e.deltaY * 0.002), px, py)
}

// ---- 拖曳：節點（鄰居跟著動、放開後釘住）或空白處（平移） ----
type Drag = { kind: 'pan'; x: number; y: number; vx: number; vy: number; moved: boolean } | { kind: 'node'; node: NetworkNode; moved: boolean; x: number; y: number }
const drag = shallowRef<Drag | null>(null)
const dragging = computed(() => !!drag.value?.moved)
const isPrimary = (e: PointerEvent) => !(e.pointerType === 'mouse' && e.button !== 0)
function onBackgroundDown(e: PointerEvent): void {
  if (!isPrimary(e)) return
  drag.value = { kind: 'pan', x: e.clientX, y: e.clientY, vx: view.value.x, vy: view.value.y, moved: false }
  listen()
}
function onNodeDown(e: PointerEvent, n: NetworkNode): void {
  if (!isPrimary(e)) return
  drag.value = { kind: 'node', node: n, moved: false, x: e.clientX, y: e.clientY }
  listen()
}
function onMove(e: PointerEvent): void {
  const d = drag.value
  if (!d) return
  if (!d.moved && Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) < 3) return
  if (!d.moved) drag.value = { ...d, moved: true }
  if (d.kind === 'pan') {
    userView = true
    view.value = { ...view.value, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y }
    return
  }
  const [gx, gy] = toGraph(...localPoint(e))
  d.node.fx = gx
  d.node.fy = gy
  d.node.x = gx
  d.node.y = gy
  sim?.alpha(0.25).tick(3)
  version.value++
}
let suppressClick = false
function onUp(): void {
  const d = drag.value
  unlisten()
  drag.value = null
  if (d?.moved) {
    suppressClick = true
    setTimeout(() => (suppressClick = false))
  } else if (d?.kind === 'node' && useCanvas.value) activate(d.node, false)
  else if (d?.kind === 'pan' && useCanvas.value) select(null)
}
function listen(): void {
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}
function unlisten(): void {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onUp)
}
onBeforeUnmount(unlisten)
function unpin(n: NetworkNode): void {
  n.fx = null
  n.fy = null
  sim?.alpha(0.3).tick(30)
  version.value++
}

// ---- 選取與路徑 ----
function select(id: string | null): void {
  selectedId.value = id
  pathIds.value = null
  emit('update:selected', id)
}
function activate(n: NetworkNode, shift: boolean): void {
  if (shift && selectedId.value && selectedId.value !== n.id) {
    pathIds.value = shortestPath(graph.value, selectedId.value, n.id)
    emit('path', pathIds.value)
    announcement.value = pathInfo.value || i18n.value.network.noPath
    return
  }
  select(selectedId.value === n.id ? null : n.id)
  emit('node-click', { id: n.id, label: n.label, group: n.group, value: n.value, degree: n.degree })
}
function onNodeClick(e: MouseEvent, n: NetworkNode): void {
  if (suppressClick) {
    suppressClick = false
    return
  }
  activate(n, e.shiftKey)
}

// ---- Canvas（大量節點） ----
function nodeAt(px: number, py: number): NetworkNode | null {
  const [gx, gy] = toGraph(px, py)
  let best: NetworkNode | null = null
  let bestD = Infinity
  for (const n of shownNodes.value) {
    const d = Math.hypot(n.x - gx, n.y - gy)
    if (d <= radius(n) + 3 / view.value.k && d < bestD) {
      best = n
      bestD = d
    }
  }
  return best
}
function onCanvasDown(e: PointerEvent): void {
  const n = nodeAt(...localPoint(e))
  if (n) onNodeDown(e, n)
  else onBackgroundDown(e)
}
function onCanvasHover(e: PointerEvent): void {
  if (drag.value) return
  hoverId.value = nodeAt(...localPoint(e))?.id ?? null
}
function onCanvasDblClick(e: MouseEvent): void {
  const n = nodeAt(...localPoint(e))
  if (n) unpin(n)
}
const themeTick = ref(0)
let themeObserver: MutationObserver | null = null
function draw(): void {
  const canvas = canvasRef.value
  if (!useCanvas.value || !canvas) return
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const w = viewW.value
  const h = viewH.value
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const cache = new Map<string, string>()
  const resolve = (c: string) => cache.get(c) ?? (cache.set(c, resolveCanvasColor(c, containerRef.value)), cache.get(c)!)
  const v = view.value
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  ctx.translate(v.x, v.y)
  ctx.scale(v.k, v.k)
  ctx.lineCap = 'round'
  for (const l of shownLinks.value) {
    ctx.globalAlpha = linkOpacity(l)
    ctx.strokeStyle = resolve(linkActive(l) ? chartTheme.text : chartTheme.axis)
    ctx.lineWidth = linkStroke(l) / v.k
    ctx.beginPath()
    ctx.moveTo(l.source.x, l.source.y)
    ctx.lineTo(l.target.x, l.target.y)
    ctx.stroke()
  }
  for (const n of shownNodes.value) {
    ctx.globalAlpha = nodeOpacity(n)
    ctx.fillStyle = resolve(nodeColor(n))
    ctx.beginPath()
    ctx.arc(n.x, n.y, radius(n), 0, Math.PI * 2)
    ctx.fill()
    if (selectedId.value === n.id || pathSet.value?.has(n.id)) {
      ctx.strokeStyle = resolve(chartTheme.accent)
      ctx.lineWidth = 2 / v.k
      ctx.beginPath()
      ctx.arc(n.x, n.y, radius(n) + 4 / v.k, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = resolve(chartTheme.text)
  ctx.textAlign = 'center'
  ctx.font = `${11 / v.k}px sans-serif`
  for (const n of shownNodes.value) if (labelShown(n)) ctx.fillText(n.label, n.x, n.y + radius(n) + 11 / v.k)
}
watch([useCanvas, shownNodes, shownLinks, view, hoverId, selectedId, pathIds, themeTick, viewW, viewH], () => nextTick(draw), { flush: 'post' })
onMounted(() => {
  nextTick(draw)
  if (typeof MutationObserver !== 'undefined') themeObserver = new MutationObserver(() => themeTick.value++)
  themeObserver?.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] })
})
onBeforeUnmount(() => themeObserver?.disconnect())

// ---- 鍵盤：方向鍵依連線數順序移動（同數量依名稱） ----
const nodeEls = new Map<string, SVGGElement>()
function setNodeEl(id: string, el: SVGGElement | null): void {
  if (el) nodeEls.set(id, el)
  else nodeEls.delete(id)
}
const order = computed(() => [...shownNodes.value].sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label)))
const kbId = ref<string | null>(null)
const keyboardFocus = ref<string | null>(null)
const announcement = ref('')
const tabStop = computed(() => (kbId.value && order.value.some((n) => n.id === kbId.value) ? kbId.value : (order.value[0]?.id ?? null)))
function onNodeFocus(e: FocusEvent, n: NetworkNode): void {
  kbId.value = n.id
  keyboardFocus.value = (e.currentTarget as Element).matches?.(':focus-visible') ? n.id : null
  hoverId.value = n.id
  const nbs = [...graph.value.neighbors.get(n.id)!].map((id) => graph.value.byId.get(id)!.label)
  announcement.value = `${nodeAria(n)}${i18n.value.network.separator}${i18n.value.network.neighbors(nbs.join(i18n.value.network.listSeparator))}`
}
function onNodeBlur(): void {
  keyboardFocus.value = null
  hoverId.value = null
}
function onNodeKey(e: KeyboardEvent, n: NetworkNode): void {
  const list = order.value
  const i = list.indexOf(n)
  let next: NetworkNode | undefined
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = list[i + 1]
  else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = list[i - 1]
  else if (e.key === 'Home') next = list[0]
  else if (e.key === 'End') next = list[list.length - 1]
  else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    activate(n, e.shiftKey)
    return
  } else if (e.key === 'Escape') {
    select(null)
    return
  } else return
  e.preventDefault()
  if (!next) return
  kbId.value = next.id
  const id = next.id
  void nextTick(() => nodeEls.get(id)?.focus())
}

// 宣告都完成後才第一次排版（rebuild 會用到上面的 view、hiddenGroups）
watch([() => props.nodes, () => props.links, () => props.directed, viewW, viewH, () => props.linkDistance, () => props.groupPull, () => props.sizeBy, () => props.nodeSize], rebuild, {
  immediate: true,
})

defineExpose({
  /** 縮放到看得到全部節點 */
  fit,
  /** 放大（> 1）或縮小（< 1） */
  zoomBy,
  /** 兩個節點間最短路徑並高亮；不連通時回傳 null */
  showPath: (from: string, to: string) => {
    pathIds.value = shortestPath(graph.value, from, to)
    return pathIds.value
  },
  /** 重新排版（清掉釘住的位置） */
  relayout: () => {
    graph.value = buildNetwork([], [])
    rebuild()
  },
  /** 目前的節點與連線（含位置） */
  graph: () => graph.value,
  /** 目前的縮放與位移（畫面座標 = 節點座標 × k + x / y） */
  view: () => view.value,
})
</script>
