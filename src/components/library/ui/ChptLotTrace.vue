<template>
  <div class="flex flex-col gap-3">
    <!-- 工具列：方向、檢視方式、搜尋、摘要 -->
    <div class="flex flex-wrap items-center gap-2">
      <ChptSegmented v-model="direction" :options="directionOptions" :aria-label="t.lotTrace.direction" size="xs" />
      <ChptSegmented v-model="view" :options="viewOptions" :aria-label="t.lotTrace.view" size="xs" />
      <label class="relative">
        <span class="sr-only">{{ t.lotTrace.search }}</span>
        <span class="material-symbols-outlined pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-base text-content-tertiary" aria-hidden="true">search</span>
        <input
          v-model="query"
          type="search"
          :placeholder="t.lotTrace.search"
          class="h-control-sm w-48 rounded-md border border-stroke-default bg-surface-primary pl-8 pr-2 text-sm text-content-primary outline-none placeholder:text-content-disabled focus:border-stroke-focus focus:ring-1 focus:ring-stroke-focus"
        />
      </label>
      <span class="text-xs text-content-secondary" aria-live="polite">{{ summaryText }}</span>
    </div>

    <!-- 圖形檢視 -->
    <div v-if="view === 'graph'" class="relative max-w-full overflow-auto rounded-md border border-stroke-light bg-surface-secondary">
      <svg
        :width="layout.width + PAD * 2"
        :height="layout.height + PAD * 2"
        class="block"
        role="group"
        :aria-label="t.lotTrace.graphLabel(labelOf(props.rootId))"
      >
        <g :transform="`translate(${PAD},${PAD})`">
          <!-- 連線 -->
          <g fill="none">
            <g v-for="(l, i) in links" :key="`l${i}`">
              <path
                :d="edgePath(l)"
                :style="{ stroke: path.links.has(l) ? chartAccent : edgeColor, strokeWidth: path.links.has(l) ? 2.5 : 1.5, opacity: dimmed(l.from) && dimmed(l.to) ? 0.25 : 1 }"
              />
              <text
                v-if="props.showQty && l.qty !== undefined"
                :x="edgeMid(l).x"
                :y="edgeMid(l).y - 4"
                text-anchor="middle"
                font-size="10"
                :style="{ fill: textMuted, paintOrder: 'stroke', stroke: bgColor, strokeWidth: 3 }"
              >{{ fmtQty(l) }}</text>
            </g>
          </g>
          <!-- 節點 -->
          <g
            v-for="id in nodeIds"
            :key="id"
            :ref="(el) => setNodeEl(id, el as SVGGElement | null)"
            :transform="`translate(${layout.pos.get(id)!.x},${layout.pos.get(id)!.y})`"
            role="button"
            :tabindex="id === activeId ? 0 : -1"
            :aria-label="nodeAriaLabel(id)"
            :aria-pressed="id === selectedId"
            class="cursor-pointer outline-none"
            :style="{ opacity: dimmed(id) ? 0.35 : 1 }"
            @click="select(id)"
            @focus="onNodeFocus($event, id)"
            @blur="focusedId = null"
            @keydown="onNodeKeydown($event, id)"
          >
            <rect
              :width="NODE_W"
              :height="NODE_H"
              rx="6"
              :style="{ fill: nodeFill(id), stroke: nodeStroke(id), strokeWidth: id === props.rootId || id === selectedId ? 2.5 : 1.5, strokeDasharray: nodeOf(id)?.status === 'suspect' ? '5 3' : undefined }"
            />
            <rect :width="5" :height="NODE_H" rx="2" :style="{ fill: kindColor(nodeOf(id)?.kind) }" />
            <text :x="14" :y="20" font-size="13" font-weight="600" :style="{ fill: textColor }">{{ clip(labelOf(id), 17) }}</text>
            <text :x="14" :y="38" font-size="11" :style="{ fill: textMuted }">{{ clip(subOf(id), 21) }}</text>
            <g v-if="nodeOf(id)?.status === 'hold' || nodeOf(id)?.status === 'suspect'" :transform="`translate(${NODE_W - 44},6)`">
              <rect width="38" height="16" rx="3" :style="{ fill: nodeOf(id)?.status === 'hold' ? dangerColor : warningColor }" />
              <text x="19" y="12" font-size="10" font-weight="700" text-anchor="middle" fill="#fff">{{ nodeOf(id)?.status === 'hold' ? 'HOLD' : '?' }}</text>
            </g>
            <!-- 鍵盤焦點框（SVG 的 g 沒有 focus-visible 外框） -->
            <rect v-if="focusedId === id" x="-4" y="-4" :width="NODE_W + 8" :height="NODE_H + 8" rx="9" fill="none" :style="{ stroke: focusColor }" stroke-width="2" />
          </g>
        </g>
      </svg>
    </div>

    <!-- 清單檢視：上游、下游各一棵樹 -->
    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div v-if="direction !== 'forward'" class="min-w-0">
        <h4 class="mb-1 text-sm font-semibold text-content-primary">{{ t.lotTrace.upstream }}</h4>
        <ChptTree
          :data="treeBackward"
          :model-value="treeSelectedKey"
          selectable
          default-expand-all
          :filter-text="query"
          :aria-label="t.lotTrace.upstream"
          size="sm"
          @select="(n: TreeNode) => select(String(n.traceId))"
        >
          <template #label="{ node }">
            <span class="inline-flex min-w-0 items-center gap-1.5">
              <span class="h-2.5 w-2.5 flex-shrink-0 rounded-full" :style="{ background: kindColor(nodeOf(String(node.traceId))?.kind) }" aria-hidden="true"></span>
              <span class="truncate">{{ node.label }}</span>
              <span v-if="statusLabel(String(node.traceId))" class="rounded px-1 text-[10px] font-bold text-white" :style="{ background: nodeOf(String(node.traceId))?.status === 'hold' ? dangerColor : warningColor }">{{ statusLabel(String(node.traceId)) }}</span>
              <span v-if="node.link" class="text-xs text-content-tertiary">{{ fmtQty(node.link as TraceLink) }}</span>
              <span v-if="node.repeat" class="text-xs text-content-tertiary">{{ t.lotTrace.repeat }}</span>
            </span>
          </template>
        </ChptTree>
      </div>
      <div v-if="direction !== 'backward'" class="min-w-0">
        <h4 class="mb-1 text-sm font-semibold text-content-primary">{{ t.lotTrace.downstream }}</h4>
        <ChptTree
          :data="treeForward"
          :model-value="treeSelectedKey"
          selectable
          default-expand-all
          :filter-text="query"
          :aria-label="t.lotTrace.downstream"
          size="sm"
          @select="(n: TreeNode) => select(String(n.traceId))"
        >
          <template #label="{ node }">
            <span class="inline-flex min-w-0 items-center gap-1.5">
              <span class="h-2.5 w-2.5 flex-shrink-0 rounded-full" :style="{ background: kindColor(nodeOf(String(node.traceId))?.kind) }" aria-hidden="true"></span>
              <span class="truncate">{{ node.label }}</span>
              <span v-if="statusLabel(String(node.traceId))" class="rounded px-1 text-[10px] font-bold text-white" :style="{ background: nodeOf(String(node.traceId))?.status === 'hold' ? dangerColor : warningColor }">{{ statusLabel(String(node.traceId)) }}</span>
              <span v-if="node.link" class="text-xs text-content-tertiary">{{ fmtQty(node.link as TraceLink) }}</span>
              <span v-if="node.repeat" class="text-xs text-content-tertiary">{{ t.lotTrace.repeat }}</span>
            </span>
          </template>
        </ChptTree>
      </div>
    </div>

    <!-- 圖例 -->
    <div v-if="kindList.length" class="flex flex-wrap gap-3 text-xs text-content-secondary" role="group" :aria-label="t.lotTrace.legend">
      <span v-for="k in kindList" :key="k.key" class="inline-flex items-center gap-1.5">
        <span class="h-2.5 w-2.5 rounded-sm" :style="{ background: k.color }" aria-hidden="true"></span>{{ k.label }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import ChptSegmented from './ChptSegmented.vue'
import ChptTree, { type TreeNode } from './ChptTree.vue'
import { useLocale } from '../shared/config'
import {
  layoutTrace,
  traceLayers,
  tracePath,
  traceTree,
  visibleLinks,
  type TraceDirection,
  type TraceLink,
  type TraceNode,
} from '../shared/lotTrace'

/**
 * ChptLotTrace（CHPT 主題） - 批號追溯圖
 *
 * 用途：客訴、召回、異常調查 —— 從一個批號往上游追到用了哪些料，或往下游找出做成了哪些產品、出給誰。
 *   - 圖形：查詢的批號在中間，上游在左、下游在右；連線上標用量；點一個批號高亮它和查詢批號之間的所有路徑
 *   - 清單：上游、下游各一棵樹（同一個批號被多個產品用到時會在多個分支出現）
 *   - hold（隔離）紅色標記、suspect（可疑）虛線框與黃色標記；搜尋時其他批號變淡
 *   - 鍵盤：Tab 進入圖形後方向鍵移動（←→ 上下游、↑↓ 同一欄），Enter 選取
 */

interface KindDef {
  label: string
  color?: string
}

interface ChptLotTraceProps {
  nodes: TraceNode[]
  links: TraceLink[]
  /** 查詢的批號 */
  rootId: string
  /** v-model:selected：選取的批號 */
  selected?: string | null
  /** 追溯方向：backward 上游、forward 下游、both 雙向 */
  defaultDirection?: TraceDirection
  /** 預設檢視方式 */
  defaultView?: 'graph' | 'list'
  /** 最多追幾層 */
  maxDepth?: number
  /** 種類的名稱與顏色（key 對應 node.kind） */
  kinds?: Record<string, KindDef>
  /** 連線上顯示用量 */
  showQty?: boolean
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptLotTraceProps>(), {
  selected: null,
  defaultDirection: 'both',
  defaultView: 'graph',
  maxDepth: Infinity,
  kinds: () => ({}),
  showQty: true,
})

const emit = defineEmits<{
  (e: 'update:selected', id: string | null): void
  /** 點選（或 Enter）一個批號 */
  (e: 'node-click', node: TraceNode): void
}>()

const NODE_W = 180
const NODE_H = 52
const PAD = 16
const role = (name: string) => `rgb(var(--t-${name}))`
const textColor = role('content-primary')
const textMuted = role('content-secondary')
const edgeColor = role('stroke-medium')
const bgColor = role('surface-secondary')
const chartAccent = role('accent')
const focusColor = role('stroke-focus')
const dangerColor = role('danger-solid')
const warningColor = role('warning-solid')

const direction = ref<TraceDirection>(props.defaultDirection)
const view = ref<'graph' | 'list'>(props.defaultView)
const query = ref('')
const directionOptions = computed(() => [
  { label: t.value.lotTrace.backward, value: 'backward', icon: 'west' },
  { label: t.value.lotTrace.both, value: 'both', icon: 'swap_horiz' },
  { label: t.value.lotTrace.forward, value: 'forward', icon: 'east' },
])
const viewOptions = computed(() => [
  { label: t.value.lotTrace.graph, value: 'graph', icon: 'account_tree' },
  { label: t.value.lotTrace.list, value: 'list', icon: 'list' },
])

const byId = computed(() => new Map(props.nodes.map((n) => [n.id, n])))
const nodeOf = (id: string) => byId.value.get(id)
const labelOf = (id: string) => nodeOf(id)?.label ?? id

// ---- 種類顏色 ----
const kindList = computed(() => {
  const seen = [...new Set(props.nodes.map((n) => n.kind).filter((k): k is string => !!k))]
  return seen.map((key, i) => ({ key, label: props.kinds[key]?.label ?? key, color: props.kinds[key]?.color ?? role(`chart-${(i % 8) + 1}`) }))
})
const kindColor = (kind?: string) => kindList.value.find((k) => k.key === kind)?.color ?? role('stroke-dark')
const subOf = (id: string) => {
  const n = nodeOf(id)
  return [n?.kind ? (props.kinds[n.kind]?.label ?? n.kind) : '', n?.sublabel ?? ''].filter(Boolean).join(' · ')
}
const statusLabel = (id: string) => (nodeOf(id)?.status === 'hold' ? t.value.lotTrace.hold : nodeOf(id)?.status === 'suspect' ? t.value.lotTrace.suspect : '')

// ---- 範圍與版面 ----
const layers = computed(() => traceLayers(props.links, props.rootId, direction.value, props.maxDepth))
const links = computed(() => visibleLinks(props.links, layers.value))
const layout = computed(() =>
  layoutTrace(layers.value, links.value, { nodeWidth: NODE_W, nodeHeight: NODE_H, colGap: 72, rowGap: 18, order: props.nodes.map((n) => n.id) })
)
const nodeIds = computed(() => [...layers.value.keys()])

function edgePath(l: TraceLink): string {
  const a = layout.value.pos.get(l.from)!
  const b = layout.value.pos.get(l.to)!
  const x1 = a.x + NODE_W
  const y1 = a.y + NODE_H / 2
  const x2 = b.x
  const y2 = b.y + NODE_H / 2
  const mx = (x1 + x2) / 2
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`
}
function edgeMid(l: TraceLink): { x: number; y: number } {
  const a = layout.value.pos.get(l.from)!
  const b = layout.value.pos.get(l.to)!
  return { x: (a.x + NODE_W + b.x) / 2, y: (a.y + b.y) / 2 + NODE_H / 2 }
}
const fmtQty = (l: TraceLink) => (l.qty === undefined ? '' : `${l.qty.toLocaleString()}${l.unit ? ` ${l.unit}` : ''}`)
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

// ---- 選取、路徑、搜尋 ----
const innerSelected = ref<string | null>(props.selected)
watch(
  () => props.selected,
  (v) => (innerSelected.value = v)
)
const selectedId = computed(() => innerSelected.value)
const path = computed(() => (selectedId.value ? tracePath(links.value, props.rootId, selectedId.value) : { nodes: new Set<string>(), links: new Set<TraceLink>() }))
function select(id: string): void {
  innerSelected.value = id
  emit('update:selected', id)
  const n = nodeOf(id)
  if (n) emit('node-click', n)
}
const q = computed(() => query.value.trim().toLowerCase())
const matches = (id: string) => !q.value || labelOf(id).toLowerCase().includes(q.value) || id.toLowerCase().includes(q.value)
/** 選取的批號在目前的圖裡（換了查詢批號或方向後可能不在） */
const selectedInView = computed(() => !!selectedId.value && layers.value.has(selectedId.value))
/** 變淡：搜尋時不符合的；選取（而且在圖裡）時不在路徑上的 */
const dimmed = (id: string) => (q.value ? !matches(id) : selectedInView.value ? !path.value.nodes.has(id) : false)

function nodeFill(id: string): string {
  if (id === props.rootId) return role('accent-subtle')
  return role('surface-primary')
}
function nodeStroke(id: string): string {
  const st = nodeOf(id)?.status
  if (st === 'hold') return dangerColor
  if (st === 'suspect') return warningColor
  if (id === props.rootId || id === selectedId.value) return chartAccent
  return role('stroke-default')
}

function nodeAriaLabel(id: string): string {
  const l = layers.value.get(id) ?? 0
  const where = l === 0 ? t.value.lotTrace.root : l < 0 ? t.value.lotTrace.upLevel(-l) : t.value.lotTrace.downLevel(l)
  return [labelOf(id), subOf(id), statusLabel(id), where].filter(Boolean).join(', ')
}

const summaryText = computed(() => {
  let up = 0
  let down = 0
  let hold = 0
  for (const [id, l] of layers.value) {
    if (l < 0) up++
    else if (l > 0) down++
    if (nodeOf(id)?.status === 'hold') hold++
  }
  return t.value.lotTrace.summary(up, down, hold)
})

// ---- 清單 ----
const toTree = (n: ReturnType<typeof traceTree>): TreeNode => ({
  key: n.key,
  label: n.label,
  traceId: n.traceId,
  link: n.link,
  repeat: n.repeat,
  children: n.children?.map(toTree),
})
const treeBackward = computed(() => [toTree(traceTree(props.links, props.rootId, 'backward', labelOf, props.maxDepth))])
const treeForward = computed(() => [toTree(traceTree(props.links, props.rootId, 'forward', labelOf, props.maxDepth))])
/** 樹的選取用位置 key：選了批號時標出它第一次出現的位置 */
const treeSelectedKey = computed(() => {
  if (!selectedId.value) return null
  const find = (nodes: TreeNode[]): string | null => {
    for (const n of nodes) {
      if (n.traceId === selectedId.value) return String(n.key)
      const c = find(n.children ?? [])
      if (c) return c
    }
    return null
  }
  return find(treeBackward.value) ?? find(treeForward.value)
})

// ---- 鍵盤（圖形） ----
const nodeEls = new Map<string, SVGGElement>()
function setNodeEl(id: string, el: SVGGElement | null): void {
  if (el) nodeEls.set(id, el)
  else nodeEls.delete(id)
}
const activeId = ref<string>(props.rootId)
const focusedId = ref<string | null>(null)
watch(
  () => [props.rootId, nodeIds.value] as const,
  () => {
    if (!layers.value.has(activeId.value)) activeId.value = props.rootId
  }
)
function onNodeKeydown(event: KeyboardEvent, id: string): void {
  const p = layout.value.pos.get(id)!
  const col = (k: number) => layout.value.columns.get(k) ?? []
  let next: string | undefined
  if (event.key === 'ArrowUp') next = col(p.layer)[p.row - 1]
  else if (event.key === 'ArrowDown') next = col(p.layer)[p.row + 1]
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    // 往左右：優先有連線的鄰居，再取同一高度附近的
    const k = p.layer + (event.key === 'ArrowLeft' ? -1 : 1)
    const linked = links.value.filter((l) => (event.key === 'ArrowLeft' ? l.to === id : l.from === id)).map((l) => (event.key === 'ArrowLeft' ? l.from : l.to))
    const candidates = linked.length ? linked : col(k)
    next = candidates.slice().sort((a, b) => Math.abs(layout.value.pos.get(a)!.y - p.y) - Math.abs(layout.value.pos.get(b)!.y - p.y))[0]
  } else if (event.key === 'Home') next = props.rootId
  else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    select(id)
    return
  } else return
  event.preventDefault()
  if (!next) return
  activeId.value = next
  void nextTick(() => nodeEls.get(next!)?.focus())
}
/** 只有鍵盤聚焦（:focus-visible）時畫焦點框；點滑鼠不畫 */
function onNodeFocus(event: FocusEvent, id: string): void {
  activeId.value = id
  const el = event.currentTarget as Element
  focusedId.value = el.matches?.(':focus-visible') ? id : null
}

function clearSelection(): void {
  innerSelected.value = null
  emit('update:selected', null)
}

defineExpose({
  /** 選取某個批號（null 取消選取） */
  select: (id: string | null) => (id ? select(id) : clearSelection()),
})
</script>
