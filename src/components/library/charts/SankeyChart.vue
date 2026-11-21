<template>
  <div class="sankey-chart flex flex-col gap-2" :style="props.autoResize ? { width: '100%', height: '100%' } : { width: `${props.width}px` }">
    <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
    <div ref="containerRef" class="relative min-h-0 flex-1" :style="props.autoResize ? undefined : { height: `${props.height}px` }">
      <p v-if="!layout.links.length" class="flex h-full items-center justify-center text-sm text-content-tertiary">
        {{ props.emptyText ?? i18n.sankey.empty }}
      </p>
      <svg
        v-else
        :width="effectiveWidth"
        :height="chartHeight"
        class="block overflow-visible"
        role="group"
        :aria-label="props.title || i18n.sankey.title"
        @mouseleave="active = null"
      >
        <g :transform="`translate(${MARGIN.left},${MARGIN.top})`">
          <!-- 連線：中心線 + 線寬 = 流量 -->
          <g fill="none">
            <path
              v-for="l in layout.links"
              :key="`l${l.index}`"
              :d="sankeyLinkPath(l)"
              :style="{ stroke: linkStroke(l), strokeWidth: Math.max(1, l.width), strokeOpacity: linkOpacity(l) }"
              class="sankey-link"
              :class="clickable ? 'cursor-pointer' : ''"
              @mouseenter="active = { kind: 'link', link: l }"
              @click="emitLink(l)"
            />
          </g>
          <!-- 節點 -->
          <g
            v-for="n in layout.nodes"
            :key="n.id"
            :ref="(el) => setNodeEl(n.id, el as SVGGElement | null)"
            role="button"
            :tabindex="n.id === tabStop ? 0 : -1"
            :aria-label="nodeLabel(n)"
            class="outline-none"
            :class="clickable ? 'cursor-pointer' : ''"
            @mouseenter="active = { kind: 'node', node: n }"
            @focus="onNodeFocus($event, n)"
            @blur="onNodeBlur"
            @keydown="onNodeKeydown($event, n)"
            @click="emitNode(n)"
          >
            <rect
              :x="n.x0"
              :y="n.y0"
              :width="n.x1 - n.x0"
              :height="Math.max(1, n.y1 - n.y0)"
              rx="2"
              :style="{ fill: nodeColor(n), opacity: nodeOpacity(n) }"
            />
            <rect
              v-if="keyboardFocus === n.id"
              :x="n.x0 - 3"
              :y="n.y0 - 3"
              :width="n.x1 - n.x0 + 6"
              :height="Math.max(1, n.y1 - n.y0) + 6"
              rx="4"
              fill="none"
              :style="{ stroke: chartTheme.accent }"
              stroke-width="2"
            />
            <text
              :x="labelRight(n) ? n.x1 + 6 : n.x0 - 6"
              :y="(n.y0 + n.y1) / 2"
              dy="0.35em"
              :text-anchor="labelRight(n) ? 'start' : 'end'"
              font-size="12"
              :style="{ fill: chartTheme.text, opacity: nodeOpacity(n), paintOrder: 'stroke', stroke: chartTheme.surface, strokeWidth: 3, strokeLinejoin: 'round' }"
              pointer-events="none"
            >
              {{ shortLabel(n) }}<tspan v-if="props.showValues && !narrow" :style="{ fill: chartTheme.textMuted }" font-size="11"> {{ fmtValue(n.value) }}</tspan>
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
    </div>

    <!-- 給螢幕閱讀器的資料表：每一條流向 -->
    <table class="sr-only">
      <caption>{{ props.title || i18n.sankey.title }}</caption>
      <thead>
        <tr><th scope="col">{{ i18n.sankey.source }}</th><th scope="col">{{ i18n.sankey.target }}</th><th scope="col">{{ i18n.sankey.value }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="l in layout.links" :key="`t${l.index}`"><td>{{ l.source.label }}</td><td>{{ l.target.label }}</td><td>{{ fmtValue(l.value) }}</td></tr>
      </tbody>
    </table>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, ref, shallowRef } from 'vue'
import * as d3 from 'd3'
import { chartPalette, chartTheme } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { tooltipPlacement } from './utils/tooltipPlacement'
import { sankeyLayout, sankeyLinkPath, type SankeyLink, type SankeyLinkInput, type SankeyNode, type SankeyNodeInput } from './utils/sankey'
import { useLocale } from '../shared/config'

/**
 * SankeyChart —— 流向圖（桑基圖）
 *
 * 用途：數量「從哪裡流到哪裡」—— 投入在各站之間的流向與損失、不良品的處置去向（重工 / 報廢 / 讓步放行）、
 * 物料從倉庫到各線。線寬就是數量，一眼看出大宗流向與漏掉的部分。
 *
 * - 欄依流向自動排（最長路徑），垂直位置來回調整減少交叉；有循環的連線會被略過（cycle 事件回報）
 * - 滑過節點：高亮經過它的所有上下游流向；滑過連線：高亮它與它的上下游
 * - tooltip 顯示數量與佔來源流出的比例
 * - 鍵盤：Tab 進入後 ↑↓ 同一欄、←→ 沿最大流量到上下游，Enter 等同點擊；目前的節點以 aria-live 念出
 * - 附一份隱藏的資料表給螢幕閱讀器（每一條流向）
 */

interface SankeyChartProps {
  nodes: SankeyNodeInput[]
  links: SankeyLinkInput[]
  width?: number
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  title?: string
  /** 單位（tooltip 與數值後面） */
  unit?: string
  valueFormat?: ((value: number) => string) | null
  nodeWidth?: number
  nodePadding?: number
  /** justify：終點都放最後一欄；left：每個節點放最早能放的欄 */
  align?: 'justify' | 'left'
  /** 連線顏色：跟來源、跟目標、或一律中性灰 */
  linkColor?: 'source' | 'target' | 'neutral'
  /** 節點名稱後面顯示數量 */
  showValues?: boolean
  emptyText?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const i18n = useLocale()
const props = withDefaults(defineProps<SankeyChartProps>(), {
  width: 720,
  height: 360,
  autoResize: false,
  debounceDelay: 100,
  title: '',
  unit: '',
  valueFormat: null,
  nodeWidth: 14,
  nodePadding: 14,
  align: 'justify',
  linkColor: 'source',
  showValues: true,
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'node-click', node: { id: string; label: string; value: number }): void
  (e: 'link-click', link: { source: string; target: string; value: number }): void
  /** 因為形成循環而無法畫出的連線 */
  (e: 'cycle', links: SankeyLinkInput[]): void
  (e: 'chart-resize', size: { width: number; height: number }): void
}>()

const instance = getCurrentInstance()
const clickable = computed(() => !!(instance?.vnode.props?.onNodeClick || instance?.vnode.props?.onLinkClick))

const MARGIN = { top: 6, right: 4, bottom: 6, left: 4 }
const containerRef = ref<HTMLElement | null>(null)
const { effectiveWidth, effectiveHeight } = useAutoResize(containerRef, props, (size) => emit('chart-resize', size))
const chartHeight = computed(() => Math.max(40, effectiveHeight.value))

const layout = computed(() => {
  const res = sankeyLayout(props.nodes, props.links, {
    width: Math.max(10, effectiveWidth.value - MARGIN.left - MARGIN.right),
    height: Math.max(10, chartHeight.value - MARGIN.top - MARGIN.bottom),
    nodeWidth: props.nodeWidth,
    nodePadding: props.nodePadding,
    align: props.align,
  })
  if (res.cycles.length) void nextTick(() => emit('cycle', res.cycles))
  return res
})

// ---- 顏色 ----
const nodeColor = (n: SankeyNode) => n.color ?? chartPalette.categorical[n.index % chartPalette.categorical.length]
function linkStroke(l: SankeyLink): string {
  if (props.linkColor === 'neutral') return chartPalette.other
  return nodeColor(props.linkColor === 'target' ? l.target : l.source)
}

// ---- 高亮：經過滑過的節點 / 連線的所有上下游流向 ----
type Active = { kind: 'node'; node: SankeyNode } | { kind: 'link'; link: SankeyLink } | null
// shallowRef：節點與連線物件要原樣放進來 —— ref 會包成 Proxy，之後 Set.has(原物件) 永遠找不到
const active = shallowRef<Active>(null)
const highlighted = computed(() => {
  const a = active.value
  if (!a) return null
  const links = new Set<SankeyLink>()
  const nodes = new Set<SankeyNode>()
  const up = (n: SankeyNode) => {
    nodes.add(n)
    for (const l of n.incoming) {
      if (links.has(l)) continue
      links.add(l)
      up(l.source)
    }
  }
  const down = (n: SankeyNode) => {
    nodes.add(n)
    for (const l of n.outgoing) {
      if (links.has(l)) continue
      links.add(l)
      down(l.target)
    }
  }
  if (a.kind === 'node') {
    up(a.node)
    down(a.node)
  } else {
    links.add(a.link)
    up(a.link.source)
    down(a.link.target)
  }
  return { links, nodes }
})
const linkOpacity = (l: SankeyLink) => (!highlighted.value ? 0.38 : highlighted.value.links.has(l) ? 0.65 : 0.08)
const nodeOpacity = (n: SankeyNode) => (!highlighted.value || highlighted.value.nodes.has(n) ? 1 : 0.35)
/** 欄距：名稱最多能用的寬度（放不下時截斷，完整名稱在 tooltip 與 aria-label） */
const columnStep = computed(() => {
  const ns = layout.value.nodes
  const xs = [...new Set(ns.map((n) => n.x0))].sort((a, b) => a - b)
  return xs.length > 1 ? xs[1] - xs[0] : Infinity
})
const narrow = computed(() => columnStep.value < 180)
function shortLabel(n: SankeyNode): string {
  // 倒數第二欄的名稱往右、最後一欄的往左，兩邊共用同一段欄距：各分一半
  const cols = layout.value.columns
  const shared = cols >= 2 && n.column >= cols - 2
  const room = (columnStep.value - props.nodeWidth - 16) / (shared ? 2 : 1)
  if (!Number.isFinite(room)) return n.label
  // 中文字約 12px、英數約 7px：用「寬字元算 2」估計
  const budget = Math.max(2, Math.floor(room / 6.5))
  let used = 0
  let out = ''
  for (const ch of n.label) {
    used += ch.charCodeAt(0) < 256 ? 1 : 2
    if (used > budget) return `${out}…`
    out += ch
  }
  return out
}
/** 最後一欄的名稱放在節點左側（右邊沒有空間） */
const labelRight = (n: SankeyNode) => n.column < layout.value.columns - 1 || layout.value.columns === 1

// ---- 文字 ----
const defaultFormat = d3.format(',~f')
const fmt = (v: number) => (props.valueFormat ? props.valueFormat(v) : defaultFormat(Number(v.toPrecision(6))))
const fmtValue = (v: number) => `${fmt(v)}${props.unit ? ` ${props.unit}` : ''}`
const outTotal = (n: SankeyNode) => n.outgoing.reduce((s, l) => s + l.value, 0)
const inTotal = (n: SankeyNode) => n.incoming.reduce((s, l) => s + l.value, 0)
const share = (l: SankeyLink) => {
  const total = outTotal(l.source)
  return total ? `${((l.value / total) * 100).toFixed(1)}%` : ''
}
function nodeLines(n: SankeyNode): string[] {
  const lines = [n.label]
  if (n.incoming.length) lines.push(i18n.value.sankey.inflow(fmtValue(inTotal(n))))
  if (n.outgoing.length) lines.push(i18n.value.sankey.outflow(fmtValue(outTotal(n))))
  return lines
}
const linkLines = (l: SankeyLink) => [`${l.source.label} → ${l.target.label}`, fmtValue(l.value), i18n.value.sankey.share(l.source.label, share(l))]
const nodeLabel = (n: SankeyNode) => nodeLines(n).join(', ')

const tip = computed(() => {
  const a = active.value
  if (!a) return null
  const w = effectiveWidth.value
  const h = chartHeight.value
  if (a.kind === 'node') {
    const n = a.node
    const x = MARGIN.left + (labelRight(n) ? n.x1 : n.x0)
    const y = MARGIN.top + (n.y0 + n.y1) / 2
    return { lines: nodeLines(n), style: tooltipPlacement(x, y, w, h, 200, 70) }
  }
  const l = a.link
  const x = MARGIN.left + (l.source.x1 + l.target.x0) / 2
  const y = MARGIN.top + (l.y0 + l.y1) / 2
  return { lines: linkLines(l), style: tooltipPlacement(x, y, w, h, 220, 70) }
})

function emitNode(n: SankeyNode): void {
  emit('node-click', { id: n.id, label: n.label, value: n.value })
}
function emitLink(l: SankeyLink): void {
  emit('link-click', { source: l.source.id, target: l.target.id, value: l.value })
}

// ---- 鍵盤 ----
const nodeEls = new Map<string, SVGGElement>()
function setNodeEl(id: string, el: SVGGElement | null): void {
  if (el) nodeEls.set(id, el)
  else nodeEls.delete(id)
}
const focusId = ref<string | null>(null)
const keyboardFocus = ref<string | null>(null)
const announcement = ref('')
const firstNodeId = computed(() => [...layout.value.nodes].sort((a, b) => a.column - b.column || a.y0 - b.y0)[0]?.id ?? null)
// Tab 停駐點：目前的節點還在就留著，否則是第一欄最上面的
const tabStop = computed(() => (focusId.value && layout.value.nodes.some((n) => n.id === focusId.value) ? focusId.value : firstNodeId.value))

function onNodeFocus(event: FocusEvent, n: SankeyNode): void {
  focusId.value = n.id
  keyboardFocus.value = (event.currentTarget as Element).matches?.(':focus-visible') ? n.id : null
  active.value = { kind: 'node', node: n }
  announcement.value = nodeLabel(n)
}
/** 焦點離開節點時收起 tooltip（不然鍵盤使用者離開圖表後 tooltip 還留在畫面上） */
function onNodeBlur(): void {
  keyboardFocus.value = null
  if (active.value?.kind === 'node') active.value = null
}
function onNodeKeydown(event: KeyboardEvent, n: SankeyNode): void {
  const col = layout.value.nodes.filter((x) => x.column === n.column).sort((a, b) => a.y0 - b.y0)
  const i = col.indexOf(n)
  let next: SankeyNode | undefined
  if (event.key === 'ArrowUp') next = col[i - 1]
  else if (event.key === 'ArrowDown') next = col[i + 1]
  else if (event.key === 'ArrowRight') next = [...n.outgoing].sort((a, b) => b.value - a.value)[0]?.target
  else if (event.key === 'ArrowLeft') next = [...n.incoming].sort((a, b) => b.value - a.value)[0]?.source
  else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emitNode(n)
    return
  } else if (event.key === 'Escape') {
    active.value = null
    return
  } else return
  event.preventDefault()
  if (!next) return
  focusId.value = next.id
  const id = next.id
  void nextTick(() => nodeEls.get(id)?.focus())
}

defineExpose({
  /** 目前的版面（節點與連線的位置），自訂繪製或測試用 */
  layout: () => layout.value,
})
</script>
