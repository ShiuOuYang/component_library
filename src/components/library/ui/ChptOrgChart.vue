<template>
  <div class="org-chart flex flex-col gap-2">
    <!-- 工具列 -->
    <div class="flex flex-wrap items-center gap-2">
      <div v-if="props.searchable" class="flex items-center gap-1">
        <div class="relative">
          <span class="material-symbols-outlined pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[16px] text-content-tertiary" aria-hidden="true">search</span>
          <input
            v-model="query"
            type="search"
            class="h-control-sm w-48 rounded-md border border-stroke-default bg-surface-primary pl-7 pr-2 text-sm text-content-primary focus:border-stroke-focus focus:outline-none focus:ring-1 focus:ring-stroke-focus"
            :placeholder="props.searchPlaceholder ?? t.orgChart.searchPlaceholder"
            :aria-label="props.searchPlaceholder ?? t.orgChart.searchPlaceholder"
            data-search
            @keydown.enter.prevent="gotoMatch($event.shiftKey ? -1 : 1)"
          />
        </div>
        <template v-if="query.trim()">
          <span class="min-w-[3.5rem] text-center text-xs tabular-nums" :class="matches.length ? 'text-content-secondary' : 'text-danger'" data-match-count>
            {{ matches.length ? t.orgChart.matchCount(matchPos + 1, matches.length) : t.orgChart.noMatch }}
          </span>
          <button type="button" class="tool-btn" :disabled="!matches.length" :aria-label="t.orgChart.prevMatch" @click="gotoMatch(-1)">
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">keyboard_arrow_up</span>
          </button>
          <button type="button" class="tool-btn" :disabled="!matches.length" :aria-label="t.orgChart.nextMatch" @click="gotoMatch(1)">
            <span class="material-symbols-outlined text-[18px]" aria-hidden="true">keyboard_arrow_down</span>
          </button>
        </template>
      </div>
      <div class="ml-auto flex flex-wrap items-center gap-1">
        <button type="button" class="tool-btn" :title="t.orgChart.expandAll" :aria-label="t.orgChart.expandAll" data-action="expand-all" @click="expandAll">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">unfold_more</span>
        </button>
        <button type="button" class="tool-btn" :title="t.orgChart.collapseAll" :aria-label="t.orgChart.collapseAll" data-action="collapse-all" @click="collapseAll">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">unfold_less</span>
        </button>
        <span class="mx-1 h-5 w-px bg-stroke-light" aria-hidden="true" />
        <button type="button" class="tool-btn" :title="t.orgChart.zoomOut" :aria-label="t.orgChart.zoomOut" data-action="zoom-out" @click="zoomBy(1 / 1.25)">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">remove</span>
        </button>
        <span class="w-11 text-center text-xs tabular-nums text-content-secondary" data-zoom>{{ Math.round(view.k * 100) }}%</span>
        <button type="button" class="tool-btn" :title="t.orgChart.zoomIn" :aria-label="t.orgChart.zoomIn" data-action="zoom-in" @click="zoomBy(1.25)">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
        </button>
        <button type="button" class="tool-btn" :title="t.orgChart.fit" :aria-label="t.orgChart.fit" data-action="fit" @click="fitAll">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">fit_screen</span>
        </button>
        <button v-if="props.exportable" type="button" class="tool-btn" :title="t.orgChart.exportPng" :aria-label="t.orgChart.exportPng" data-action="export" @click="download">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">download</span>
        </button>
      </div>
    </div>

    <!-- 畫布 -->
    <div
      ref="frame"
      class="relative select-none overflow-hidden rounded-md border border-stroke-light bg-surface-secondary"
      :class="panning ? 'cursor-grabbing' : 'cursor-grab'"
      :style="{ height: `${props.height}px`, touchAction: 'none' }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel="onWheel"
      @click.capture="onClickCapture"
    >
      <p v-if="!layout.nodes.length" class="flex h-full items-center justify-center text-sm text-content-tertiary">{{ props.emptyText ?? t.orgChart.empty }}</p>
      <div
        v-else
        class="absolute left-0 top-0 origin-top-left"
        :style="{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.k})`, width: `${layout.width}px`, height: `${layout.height}px` }"
        data-canvas
      >
        <svg class="pointer-events-none absolute left-0 top-0 overflow-visible" :width="layout.width" :height="layout.height" aria-hidden="true">
          <path
            v-for="l in layout.links"
            :key="`${l.from}-${l.to}`"
            :d="l.path"
            fill="none"
            stroke-width="1.5"
            :style="{ stroke: pathActive(l) ? 'rgb(var(--t-accent))' : 'rgb(var(--t-stroke-dark))' }"
            :data-link="`${l.from}-${l.to}`"
          />
        </svg>
        <div role="tree" :aria-label="props.label || t.orgChart.label" :aria-describedby="hintId">
          <div
            v-for="n in layout.nodes"
            :key="n.id"
            :ref="(el) => setNodeEl(n.id, el as HTMLElement | null)"
            role="treeitem"
            :aria-level="n.entry.depth + 1"
            :aria-setsize="setSize(n)"
            :aria-posinset="n.entry.index + 1"
            :aria-expanded="n.entry.childIds.length ? n.expanded : undefined"
            :aria-selected="selectedKey === n.id"
            :aria-label="nodeAria(n)"
            :tabindex="n.id === tabStop ? 0 : -1"
            class="absolute outline-none"
            :style="{ left: `${n.x}px`, top: `${n.y}px`, width: `${props.nodeWidth}px`, height: `${props.nodeHeight}px` }"
            :data-node="n.id"
            @click="select(n.id)"
            @keydown="onKey($event, n.id)"
            @focus="onNodeFocus(n.id)"
          >
            <slot name="node" :node="n.entry.node" :depth="n.entry.depth" :expanded="n.expanded" :selected="selectedKey === n.id" :match="matchSet.has(n.id)" :descendants="n.entry.descendants">
              <div
                class="flex h-full w-full cursor-pointer items-center gap-2 overflow-hidden rounded-lg border bg-surface-primary px-2.5 shadow-sm transition-shadow"
                :class="[
                  selectedKey === n.id ? 'border-accent ring-2 ring-accent' : currentMatch === n.id ? 'border-warning ring-2 ring-warning' : matchSet.has(n.id) ? 'border-warning' : 'border-stroke-default hover:shadow-md',
                  focusVisible === n.id ? 'outline outline-2 outline-offset-2 outline-stroke-focus' : '',
                ]"
                :style="{ borderTop: `4px solid ${n.entry.node.color ?? 'rgb(var(--t-stroke-light))'}` }"
              >
                <img v-if="n.entry.node.avatar" :src="n.entry.node.avatar" alt="" class="h-9 w-9 shrink-0 rounded-full object-cover" draggable="false" />
                <span v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-tertiary text-xs font-semibold text-content-secondary" aria-hidden="true">{{ orgInitials(n.entry.node.label) }}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-content-primary">{{ n.entry.node.label }}</span>
                  <span v-if="n.entry.node.title" class="block truncate text-xs text-content-secondary">{{ n.entry.node.title }}</span>
                </span>
              </div>
            </slot>
            <button
              v-if="n.entry.childIds.length"
              type="button"
              tabindex="-1"
              class="absolute z-[1] flex h-5 min-w-[20px] items-center justify-center rounded-full border border-stroke-default bg-surface-primary px-1 text-[10px] font-semibold leading-none text-content-secondary shadow-sm hover:border-stroke-focus hover:text-content-primary"
              :class="props.orientation === 'vertical' ? 'left-1/2 top-full -translate-x-1/2 -translate-y-1/2' : 'left-full top-1/2 -translate-x-1/2 -translate-y-1/2'"
              :aria-label="n.expanded ? t.orgChart.collapse : t.orgChart.expand(n.entry.descendants)"
              :data-toggle="n.id"
              @click.stop="toggle(n.id)"
              @pointerdown.stop
            >
              {{ n.expanded ? '−' : n.entry.descendants }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <p :id="hintId" class="sr-only">{{ t.orgChart.hint }}</p>
    <span class="sr-only" aria-live="polite" data-live>{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useLocale } from '../shared/config'
import { clampPan, fitTransform, zoomAt, type ViewTransform } from '../shared/floorPlan'
import {
  ancestorsOf,
  expandedToDepth,
  indexOrg,
  layoutOrg,
  orgInitials,
  orgKey,
  orgNeighbor,
  orgRoots,
  searchOrg,
  type OrgDirection,
  type OrgLaidNode,
  type OrgLink,
  type OrgNode,
} from '../shared/orgChart'
import { resolveCanvasColor } from '../charts/utils/largeData'

/**
 * ChptOrgChart - 組織圖
 *
 * 組織架構、產線責任歸屬、簽核層級。由上往下（vertical）或由左往右（horizontal）的樹狀版面；
 * 節點可展開收合（顯示底下有幾個）、拖曳平移、Ctrl + 滾輪 / 雙指 / 按鈕縮放；
 * 搜尋會展開上層並把結果移到畫面中央；方向鍵沿著樹移動；可匯出 PNG。節點內容可用 #node slot 自訂。
 */

export interface ChptOrgChartProps {
  /** 樹狀資料（可以有多個根節點）；平面清單請先用 orgFromFlat() 轉換 */
  data: OrgNode | OrgNode[]
  orientation?: 'vertical' | 'horizontal'
  /** 選取的節點 id（v-model:selected） */
  selected?: string | number | null
  /** 一開始展開到第幾層（0 = 只有根節點） */
  defaultExpandDepth?: number
  nodeWidth?: number
  nodeHeight?: number
  /** 兄弟節點之間的距離 */
  gapX?: number
  /** 上下層之間的距離 */
  gapY?: number
  /** 畫布高度（px） */
  height?: number
  searchable?: boolean
  searchPlaceholder?: string
  /** 搜尋比對的欄位 */
  searchFields?: string[]
  /** 顯示下載 PNG 按鈕 */
  exportable?: boolean
  /** 下載的檔名（不含副檔名） */
  exportName?: string
  minZoom?: number
  maxZoom?: number
  /** 組織圖名稱（螢幕閱讀器） */
  label?: string
  emptyText?: string
}

const props = withDefaults(defineProps<ChptOrgChartProps>(), {
  orientation: 'vertical',
  selected: null,
  defaultExpandDepth: Infinity,
  nodeWidth: 200,
  nodeHeight: 64,
  gapX: 20,
  gapY: 44,
  height: 480,
  searchable: true,
  searchPlaceholder: undefined,
  searchFields: () => ['label', 'title'],
  exportable: true,
  exportName: 'org-chart',
  minZoom: 0.2,
  maxZoom: 2,
  label: '',
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'update:selected', id: string | number | null): void
  (e: 'node-click', node: OrgNode): void
  (e: 'expand', node: OrgNode): void
  (e: 'collapse', node: OrgNode): void
}>()

const t = useLocale()
const hintId = `${useId()}-hint`
const frame = ref<HTMLElement | null>(null)

// ---- 資料與版面 ----
const roots = computed(() => (Array.isArray(props.data) ? props.data : props.data ? [props.data] : []))
const index = computed(() => indexOrg(roots.value))
const expanded = ref<Set<string>>(new Set())
watch(
  [index, () => props.defaultExpandDepth],
  () => {
    expanded.value = expandedToDepth(index.value, props.defaultExpandDepth)
  },
  { immediate: true }
)
const layout = computed(() =>
  layoutOrg(index.value, expanded.value, {
    nodeWidth: props.nodeWidth,
    nodeHeight: props.nodeHeight,
    gapX: props.gapX,
    gapY: props.gapY,
    orientation: props.orientation,
  })
)
const setSize = (n: OrgLaidNode) => (n.entry.parentId === null ? orgRoots(index.value).length : index.value.get(n.entry.parentId)!.childIds.length)

// ---- 選取 ----
const selectedKey = ref<string | null>(props.selected === null ? null : orgKey(props.selected))
watch(
  () => props.selected,
  (v) => {
    selectedKey.value = v === null ? null : orgKey(v)
    if (selectedKey.value) revealPath(selectedKey.value)
  }
)
/** 選取節點到根節點的連線標成強調色 */
const selectedPath = computed(() => {
  const id = selectedKey.value
  if (!id || !index.value.has(id)) return new Set<string>()
  return new Set([...ancestorsOf(index.value, id), id])
})
const pathActive = (l: OrgLink) => selectedPath.value.has(l.from) && selectedPath.value.has(l.to)

function select(id: string): void {
  if (suppressClick) return
  const entry = index.value.get(id)!
  selectedKey.value = id
  emit('update:selected', entry.node.id)
  emit('node-click', entry.node)
  tabStopId.value = id
}

// ---- 展開 / 收合（被點的節點在畫面上的位置不動） ----
function keepAnchor(id: string, change: () => void): void {
  const before = layout.value.byId.get(id)
  const v = view.value
  change()
  const after = layout.value.byId.get(id)
  if (before && after) setView({ k: v.k, tx: v.tx + (before.x - after.x) * v.k, ty: v.ty + (before.y - after.y) * v.k })
}
function setExpanded(id: string, open: boolean): void {
  const entry = index.value.get(id)
  if (!entry || !entry.childIds.length || expanded.value.has(id) === open) return
  keepAnchor(id, () => {
    const next = new Set(expanded.value)
    if (open) next.add(id)
    else next.delete(id)
    expanded.value = next
  })
  if (open) emit('expand', entry.node)
  else emit('collapse', entry.node)
  announcement.value = open ? t.value.orgChart.expanded(entry.node.label, entry.childIds.length) : t.value.orgChart.collapsed(entry.node.label)
}
const toggle = (id: string) => setExpanded(id, !expanded.value.has(id))
function expandAll(): void {
  expanded.value = expandedToDepth(index.value, Infinity)
  userView.value = null
}
function collapseAll(): void {
  expanded.value = new Set()
  userView.value = null
  if (tabStopId.value && index.value.get(tabStopId.value)?.parentId !== null) tabStopId.value = null
}
/** 展開上層讓節點看得到，並移到畫面中央 */
function revealPath(id: string): void {
  if (!index.value.has(id)) return
  const anc = ancestorsOf(index.value, id)
  if (anc.some((a) => !expanded.value.has(a))) {
    const next = new Set(expanded.value)
    anc.forEach((a) => next.add(a))
    expanded.value = next
  }
  centerOn(id)
}

// ---- 檢視（平移 / 縮放） ----
const size = ref({ w: 0, h: props.height })
let observer: ResizeObserver | undefined
function measure(): void {
  const el = frame.value
  if (el) size.value = { w: el.clientWidth || size.value.w, h: el.clientHeight || props.height }
}
onMounted(() => {
  measure()
  // 一開始就有選取的節點：展開上層並移到畫面中央
  if (selectedKey.value) revealPath(selectedKey.value)
  if (typeof ResizeObserver !== 'undefined' && frame.value) {
    observer = new ResizeObserver(() => measure())
    observer.observe(frame.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())

const userView = ref<ViewTransform | null>(null)
/** 預設檢視：放得下就置中；放不下時縮小（最多到 75%，再小字就看不清楚），根節點置中、貼上緣 */
const autoView = computed<ViewTransform>(() => {
  const L = layout.value
  const { w, h } = size.value
  if (!L.nodes.length || !w) return { k: 1, tx: 16, ty: 16 }
  const fit = fitTransform(L.width, L.height, w, h, 16)
  const k = Math.min(1, Math.max(0.75, fit.k))
  if (L.width * k <= w - 32 && L.height * k <= h - 32) return { k, tx: (w - L.width * k) / 2, ty: (h - L.height * k) / 2 }
  const root = L.byId.get(orgRoots(index.value)[0])!
  if (props.orientation === 'vertical') {
    const tx = L.width * k <= w - 32 ? (w - L.width * k) / 2 : w / 2 - (root.x + props.nodeWidth / 2) * k
    return { k, tx, ty: 16 }
  }
  const ty = L.height * k <= h - 32 ? (h - L.height * k) / 2 : h / 2 - (root.y + props.nodeHeight / 2) * k
  return { k, tx: 16, ty }
})
const view = computed(() => userView.value ?? autoView.value)
function setView(v: ViewTransform): void {
  userView.value = clampPan(v, layout.value.width, layout.value.height, size.value.w || 1, size.value.h, 60)
}
function zoomBy(factor: number, cx = size.value.w / 2, cy = size.value.h / 2): void {
  setView(zoomAt(view.value, factor, cx, cy, props.minZoom, props.maxZoom))
}
function fitAll(): void {
  const L = layout.value
  const f = fitTransform(L.width, L.height, size.value.w || 1, size.value.h, 16)
  const k = Math.min(props.maxZoom, Math.max(props.minZoom, Math.min(1, f.k)))
  userView.value = { k, tx: ((size.value.w || 1) - L.width * k) / 2, ty: (size.value.h - L.height * k) / 2 }
}
function centerOn(id: string): void {
  const n = layout.value.byId.get(id)
  if (!n) return
  const k = view.value.k
  setView({ k, tx: (size.value.w || 1) / 2 - (n.x + props.nodeWidth / 2) * k, ty: size.value.h / 2 - (n.y + props.nodeHeight / 2) * k })
}
/** 節點在畫面外時，最小幅度地平移讓它整個看得到 */
function ensureVisible(id: string): void {
  const n = layout.value.byId.get(id)
  if (!n || !size.value.w) return
  const v = view.value
  const pad = 16
  const x1 = n.x * v.k + v.tx
  const y1 = n.y * v.k + v.ty
  const x2 = x1 + props.nodeWidth * v.k
  const y2 = y1 + props.nodeHeight * v.k
  let dx = 0
  let dy = 0
  if (x1 < pad) dx = pad - x1
  else if (x2 > size.value.w - pad) dx = size.value.w - pad - x2
  if (y1 < pad) dy = pad - y1
  else if (y2 > size.value.h - pad) dy = size.value.h - pad - y2
  if (dx || dy) setView({ k: v.k, tx: v.tx + dx, ty: v.ty + dy })
}

// ---- 拖曳平移、雙指縮放、Ctrl + 滾輪 ----
const pointers = new Map<number, { x: number; y: number }>()
const panning = ref(false)
let pinchDist = 0
let moved = 0
let suppressClick = false
function local(e: { clientX: number; clientY: number }) {
  const r = frame.value!.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}
function onPointerDown(e: PointerEvent): void {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  pointers.set(e.pointerId, local(e))
  moved = 0
  suppressClick = false
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
  }
}
function onPointerMove(e: PointerEvent): void {
  const prev = pointers.get(e.pointerId)
  if (!prev) return
  const p = local(e)
  pointers.set(e.pointerId, p)
  moved += Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y)
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    if (pinchDist > 0) zoomBy(d / pinchDist, (a.x + b.x) / 2, (a.y + b.y) / 2)
    pinchDist = d
    return
  }
  if (moved < 4) return
  if (!panning.value) {
    panning.value = true
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }
  const v = view.value
  setView({ k: v.k, tx: v.tx + p.x - prev.x, ty: v.ty + p.y - prev.y })
}
function onPointerUp(e: PointerEvent): void {
  pointers.delete(e.pointerId)
  if (pointers.size < 2) pinchDist = 0
  if (!pointers.size) {
    // 拖曳過就不算點擊（避免放開時選到節點）
    suppressClick = moved >= 4
    panning.value = false
  }
}
function onClickCapture(e: MouseEvent): void {
  if (suppressClick) {
    e.stopPropagation()
    suppressClick = false
  }
}
function onWheel(e: WheelEvent): void {
  // 不按 Ctrl / ⌘ 時讓頁面照常捲動
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  const p = local(e)
  zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y)
}

// ---- 搜尋 ----
const query = ref('')
const matches = computed(() => searchOrg(index.value, query.value, props.searchFields))
const matchSet = computed(() => new Set(matches.value))
const matchPos = ref(0)
const currentMatch = computed(() => (query.value.trim() && matches.value.length ? matches.value[matchPos.value] : null))
watch(matches, (m) => {
  matchPos.value = 0
  if (m.length) revealPath(m[0])
})
function gotoMatch(step: number): void {
  const n = matches.value.length
  if (!n) return
  matchPos.value = (matchPos.value + step + n) % n
  const id = matches.value[matchPos.value]
  revealPath(id)
  announcement.value = t.value.orgChart.found(index.value.get(id)!.node.label, matchPos.value + 1, n)
}

// ---- 鍵盤 ----
const nodeEls = new Map<string, HTMLElement>()
function setNodeEl(id: string, el: HTMLElement | null): void {
  if (el) nodeEls.set(id, el)
  else nodeEls.delete(id)
}
const tabStopId = ref<string | null>(null)
const tabStop = computed(() => {
  const id = tabStopId.value ?? selectedKey.value
  return id && layout.value.byId.has(id) ? id : (layout.value.nodes[0]?.id ?? null)
})
const focusVisible = ref<string | null>(null)
const announcement = ref('')
function onNodeFocus(id: string): void {
  tabStopId.value = id
  const el = nodeEls.get(id)
  focusVisible.value = el?.matches?.(':focus-visible') ? id : null
  ensureVisible(id)
}
const KEYMAP: Record<'vertical' | 'horizontal', Record<string, OrgDirection>> = {
  vertical: { ArrowUp: 'parent', ArrowDown: 'child', ArrowLeft: 'prev', ArrowRight: 'next', Home: 'first', End: 'last' },
  horizontal: { ArrowLeft: 'parent', ArrowRight: 'child', ArrowUp: 'prev', ArrowDown: 'next', Home: 'first', End: 'last' },
}
function onKey(e: KeyboardEvent, id: string): void {
  if (e.key === 'Enter') {
    e.preventDefault()
    select(id)
    return
  }
  if (e.key === ' ') {
    e.preventDefault()
    toggle(id)
    return
  }
  if (e.key === '*') {
    // WAI tree：展開所有兄弟
    const p = index.value.get(id)!.parentId
    const sibs = p === null ? orgRoots(index.value) : index.value.get(p)!.childIds
    sibs.forEach((s) => setExpanded(s, true))
    return
  }
  const dir = KEYMAP[props.orientation][e.key]
  if (!dir) return
  e.preventDefault()
  let next = orgNeighbor(index.value, expanded.value, id, dir)
  // 往下層但還沒展開：先展開
  if (dir === 'child' && !next && index.value.get(id)!.childIds.length) {
    setExpanded(id, true)
    next = orgNeighbor(index.value, expanded.value, id, dir)
  }
  if (!next) return
  tabStopId.value = next
  void nextTick(() => nodeEls.get(next!)?.focus())
}

function nodeAria(n: OrgLaidNode): string {
  const node = n.entry.node
  const s = t.value.orgChart
  return s.nodeAria(node.label, node.title ?? '', n.entry.childIds.length)
}

// ---- 匯出 PNG（以預設節點樣式畫在 canvas 上，自訂 slot 的內容不會出現） ----
function exportCanvas(scale = 2): HTMLCanvasElement | null {
  const L = layout.value
  if (!L.nodes.length || typeof document === 'undefined') return null
  const pad = 24
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil((L.width + pad * 2) * scale)
  canvas.height = Math.ceil((L.height + pad * 2) * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const host = frame.value
  const c = (v: string) => resolveCanvasColor(`rgb(var(--t-${v}))`, host)
  const col = { bg: c('surface-secondary'), card: c('surface-primary'), border: c('stroke-default'), line: c('stroke-dark'), text: c('content-primary'), muted: c('content-secondary'), chip: c('surface-tertiary'), stripe: c('stroke-light') }
  ctx.scale(scale, scale)
  ctx.fillStyle = col.bg
  ctx.fillRect(0, 0, L.width + pad * 2, L.height + pad * 2)
  ctx.translate(pad, pad)
  ctx.strokeStyle = col.line
  ctx.lineWidth = 1.5
  // 連線只有 M / H / V 三種指令（orgLinkPath）
  for (const l of L.links) {
    ctx.beginPath()
    let x = 0
    let y = 0
    for (const [, cmd, a, b] of l.path.matchAll(/([MHV])([-\d.e]+)(?:,([-\d.e]+))?/g)) {
      if (cmd === 'M') {
        x = Number(a)
        y = Number(b)
        ctx.moveTo(x, y)
        continue
      }
      if (cmd === 'H') x = Number(a)
      else y = Number(a)
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  const W = props.nodeWidth
  const H = props.nodeHeight
  const fit = (text: string, max: number) => {
    if (ctx.measureText(text).width <= max) return text
    let s = text
    while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1)
    return `${s}…`
  }
  for (const n of L.nodes) {
    const node = n.entry.node
    ctx.fillStyle = col.card
    ctx.strokeStyle = col.border
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect?.(n.x, n.y, W, H, 8)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = node.color ? resolveCanvasColor(node.color, host) : col.stripe
    ctx.fillRect(n.x + 1, n.y + 1, W - 2, 4)
    const cx = n.x + 10 + 18
    const cy = n.y + H / 2 + 2
    ctx.fillStyle = col.chip
    ctx.beginPath()
    ctx.arc(cx, cy, 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = col.muted
    ctx.font = '600 12px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(orgInitials(node.label), cx, cy)
    ctx.textAlign = 'left'
    const tx = cx + 26
    const maxW = n.x + W - 10 - tx
    ctx.fillStyle = col.text
    ctx.font = '600 13px system-ui, sans-serif'
    ctx.fillText(fit(node.label, maxW), tx, node.title ? cy - 8 : cy)
    if (node.title) {
      ctx.fillStyle = col.muted
      ctx.font = '12px system-ui, sans-serif'
      ctx.fillText(fit(node.title, maxW), tx, cy + 9)
    }
    if (n.entry.childIds.length && !n.expanded) {
      const bx = props.orientation === 'vertical' ? n.x + W / 2 : n.x + W
      const by = props.orientation === 'vertical' ? n.y + H : n.y + H / 2
      ctx.fillStyle = col.card
      ctx.strokeStyle = col.border
      ctx.beginPath()
      ctx.arc(bx, by, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = col.muted
      ctx.font = '600 10px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(String(n.entry.descendants), bx, by)
      ctx.textAlign = 'left'
    }
  }
  return canvas
}
function exportPng(scale = 2): Promise<Blob | null> {
  const canvas = exportCanvas(scale)
  if (!canvas) return Promise.resolve(null)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}
async function download(): Promise<void> {
  const blob = await exportPng()
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.exportName}.png`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // 太早撤銷網址時，有些瀏覽器會改用預設檔名或下載失敗
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

defineExpose({
  expandAll,
  collapseAll,
  /** 展開上層並把節點移到畫面中央 */
  reveal: (id: string | number) => revealPath(orgKey(id)),
  expand: (id: string | number) => setExpanded(orgKey(id), true),
  collapse: (id: string | number) => setExpanded(orgKey(id), false),
  fit: fitAll,
  zoomIn: () => zoomBy(1.25),
  zoomOut: () => zoomBy(1 / 1.25),
  /** 以預設節點樣式輸出 PNG */
  exportPng,
  /** 目前的版面（節點位置、連線） */
  layout: () => layout.value,
  /** 目前展開的節點 id */
  expandedKeys: () => [...expanded.value],
})
</script>

<style scoped>
.tool-btn {
  @apply inline-flex h-control-sm w-8 items-center justify-center rounded-md text-content-secondary hover:bg-surface-tertiary hover:text-content-primary disabled:cursor-not-allowed disabled:opacity-40;
}
</style>
