<template>
  <div ref="rootEl" class="sortable-list relative" :data-sortable-group="props.group || undefined">
    <TransitionGroup
      tag="ul"
      :role="isTree ? 'tree' : 'list'"
      :aria-label="props.label || t.sortable.label"
      class="flex min-h-10 flex-col gap-1 rounded-md"
      :class="dropActive ? 'outline outline-2 outline-offset-2 outline-[rgb(var(--t-accent))]' : ''"
      move-class="transition-transform duration-200 motion-reduce:transition-none"
    >
      <li
        v-for="(row, i) in rows"
        :key="row.item.id"
        :ref="(el) => setRowEl(row.item.id, el as HTMLElement | null)"
        :role="isTree ? 'treeitem' : 'listitem'"
        :aria-level="isTree ? row.depth + 1 : undefined"
        :aria-setsize="isTree ? row.siblings : undefined"
        :aria-posinset="isTree ? row.index + 1 : undefined"
        :aria-expanded="isTree && row.hasChildren ? !collapsed.has(row.item.id) : undefined"
        :data-id="row.item.id"
        :style="{ marginLeft: `${row.depth * props.indent}px` }"
      >
        <div
          class="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
          :class="[
            dragId === row.item.id || draggingSubtree.has(row.item.id) ? 'opacity-40' : '',
            grabbedId === row.item.id ? 'border-accent bg-accent-subtle shadow-md' : 'border-stroke-default bg-surface-primary',
            !props.handle && canDrag(row.item) ? 'cursor-grab touch-none select-none' : '',
          ]"
          :tabindex="props.handle ? undefined : i === tabStop ? 0 : -1"
          :aria-label="props.handle ? undefined : gripLabel(row)"
          :aria-describedby="props.handle ? undefined : `${uid}-hint`"
          :data-grip="props.handle ? undefined : row.item.id"
          @pointerdown="props.handle ? undefined : onDown($event, row)"
          @keydown="props.handle ? undefined : onKey($event, row, i)"
          @focus="props.handle ? undefined : (focusIndex = i)"
        >
          <button
            v-if="props.handle"
            type="button"
            class="-ml-1 inline-flex h-7 w-6 shrink-0 touch-none items-center justify-center rounded text-content-tertiary hover:text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:cursor-not-allowed disabled:opacity-40"
            :class="canDrag(row.item) ? 'cursor-grab' : ''"
            :tabindex="i === tabStop ? 0 : -1"
            :aria-label="gripLabel(row)"
            :aria-describedby="`${uid}-hint`"
            :aria-pressed="grabbedId === row.item.id"
            :aria-disabled="!canDrag(row.item) || undefined"
            :data-grip="row.item.id"
            @pointerdown="onDown($event, row)"
            @keydown="onKey($event, row, i)"
            @focus="focusIndex = i"
          >
            <span class="material-symbols-outlined text-lg" aria-hidden="true">drag_indicator</span>
          </button>
          <button
            v-if="row.hasChildren"
            type="button"
            class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-content-secondary hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
            tabindex="-1"
            :aria-label="collapsed.has(row.item.id) ? t.sortable.expand(row.item.label) : t.sortable.collapse(row.item.label)"
            @click="toggle(row.item.id)"
          >
            <span class="material-symbols-outlined text-lg transition-transform" :class="collapsed.has(row.item.id) ? '-rotate-90' : ''" aria-hidden="true">expand_more</span>
          </button>
          <div class="min-w-0 flex-1">
            <slot name="item" :item="row.item" :depth="row.depth" :dragging="dragId === row.item.id" :grabbed="grabbedId === row.item.id">
              <div class="truncate text-content-primary">{{ row.item.label }}</div>
              <div v-if="row.item.description" class="truncate text-xs text-content-secondary">{{ row.item.description }}</div>
            </slot>
          </div>
          <span v-if="row.item.locked" class="material-symbols-outlined text-base text-content-tertiary" :aria-label="t.sortable.locked" role="img">lock</span>
          <span v-if="collapsed.has(row.item.id)" class="shrink-0 rounded-full bg-surface-secondary px-1.5 text-[11px] tabular-nums text-content-secondary">{{ countItems(row.item.children ?? []) }}</span>
        </div>
      </li>
    </TransitionGroup>
    <p
      v-if="!rows.length"
      class="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md border border-dashed border-stroke-default text-xs text-content-tertiary"
    >
      {{ props.emptyText ?? t.sortable.empty }}
    </p>

    <!-- 放置位置 -->
    <div
      v-if="indicator"
      class="pointer-events-none absolute right-0 z-10 h-0.5 rounded-full"
      :style="{ top: `${indicator.y}px`, left: `${indicator.depth * props.indent}px`, background: 'rgb(var(--t-accent-solid))' }"
      data-indicator
    >
      <span class="absolute -left-1 -top-[3px] h-2 w-2 rounded-full" :style="{ background: 'rgb(var(--t-accent-solid))' }" />
    </div>

    <Teleport to="body">
      <div
        v-if="ghost"
        class="pointer-events-none fixed z-[1000] flex max-w-xs items-center gap-2 rounded-md border border-accent bg-surface-primary px-3 py-1.5 text-sm text-content-primary shadow-lg"
        :style="{ left: `${ghost.x}px`, top: `${ghost.y}px` }"
        data-ghost
      >
        <span class="material-symbols-outlined text-base text-content-tertiary" aria-hidden="true">drag_indicator</span>
        <span class="truncate">{{ ghost.label }}</span>
        <span v-if="ghost.count > 1" class="rounded-full bg-accent-subtle px-1.5 text-[11px] text-accent-on-subtle">+{{ ghost.count - 1 }}</span>
      </div>
    </Teleport>

    <p :id="`${uid}-hint`" class="sr-only">{{ isTree ? t.sortable.hintTree : t.sortable.hint }}</p>
    <span class="sr-only" aria-live="assertive">{{ announcement }}</span>
  </div>
</template>

<script lang="ts">
import type { SortItem, SortTarget } from '../shared/sortableList'

/** 同一個 group 的清單可以互相拖曳：每個清單註冊自己的命中判斷與接收方法 */
interface ListApi {
  group: string
  put: boolean
  el: () => HTMLElement | null
  project: (x: number, y: number, drag: DragInfo) => Projection | null
  receive: (item: SortItem, target: SortTarget) => void
  setIndicator: (p: Projection | null) => void
}
interface DragInfo {
  id: string
  item: SortItem
  source: ListApi
  startX: number
  startDepth: number
}
interface Projection {
  target: SortTarget
  depth: number
  y: number
}
const registry = new Set<ListApi>()
</script>

<script setup lang="ts">
/**
 * ChptSortableList 拖曳排序清單 —— 製程步驟順序、點檢項目、選單設定。
 * 拖曳把手排序；maxDepth > 1 時可以巢狀（往右拖成為上一項的子項）；同一個 group 的清單之間可以互相拖曳。
 * 鍵盤：空白鍵拿起、方向鍵移動（←→ 調整層級）、空白鍵放下、Esc 取消。觸控也能拖。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId } from 'vue'
import { useLocale } from '../shared/config'
import { countItems, findItem, flattenTree, insertItem, isDescendant, keyboardMove, moveItem, projectDrop, removeItem, sameStructure, type SortRow } from '../shared/sortableList'

export interface SortChange {
  item: SortItem
  from: SortTarget
  to: SortTarget
}

export interface ChptSortableListProps {
  /** 項目（v-model；巢狀時用 children） */
  modelValue?: SortItem[]
  /** 最多幾層（1 = 平面清單） */
  maxDepth?: number
  /** 每層縮排（px） */
  indent?: number
  /** 只能用把手拖曳；false 時整列都可以拖 */
  handle?: boolean
  /** 同名的清單之間可以互相拖曳 */
  group?: string
  /** 接受從其他清單拖進來 */
  put?: boolean
  /** 自訂規則：能不能放到 parent 底下（null 為最上層） */
  canDrop?: ((item: SortItem, parent: SortItem | null) => boolean) | null
  /** 清單名稱（螢幕閱讀器） */
  label?: string
  emptyText?: string
  disabled?: boolean
}

const t = useLocale()
const props = withDefaults(defineProps<ChptSortableListProps>(), {
  modelValue: () => [],
  maxDepth: 1,
  indent: 24,
  handle: true,
  group: '',
  put: true,
  canDrop: null,
  label: '',
  emptyText: undefined,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', items: SortItem[]): void
  /** 在這個清單內移動 */
  (e: 'change', change: SortChange): void
  /** 從別的清單拖進來 */
  (e: 'add', change: SortChange): void
  /** 拖到別的清單 */
  (e: 'remove', change: SortChange): void
}>()

const uid = useId()
const rootEl = ref<HTMLElement | null>(null)
const collapsed = ref(new Set<string>())
/** 鍵盤拿起時的暫存樹（放下才送出） */
const working = shallowRef<SortItem[] | null>(null)
const items = computed(() => working.value ?? props.modelValue)
const rows = computed(() => flattenTree(items.value, collapsed.value))
const isTree = computed(() => props.maxDepth > 1 || props.modelValue.some((x) => x.children?.length))
const canDrag = (item: SortItem) => !props.disabled && !item.locked

function toggle(id: string): void {
  const next = new Set(collapsed.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  collapsed.value = next
}
const positionText = (id: string, tree = items.value) => {
  const f = findItem(tree, id)!
  const parent = f.parentId ? findItem(tree, f.parentId)!.item.label : null
  return t.value.sortable.position(f.index + 1, f.list.length, parent ?? '')
}
const gripLabel = (row: SortRow) => t.value.sortable.handleLabel(row.item.label, row.index + 1, row.siblings)

// ---- 列的元素（命中判斷用） ----
const rowEls = new Map<string, HTMLElement>()
function setRowEl(id: string, el: HTMLElement | null): void {
  if (el) rowEls.set(id, el)
  else rowEls.delete(id)
}

// ---- 拖曳（指標） ----
const dragId = ref<string | null>(null)
const draggingSubtree = computed(() => {
  const id = dragId.value
  if (!id) return new Set<string>()
  const f = findItem(props.modelValue, id)
  const out = new Set<string>()
  const walk = (list?: SortItem[]) => list?.forEach((x) => (out.add(x.id), walk(x.children)))
  walk(f?.item.children)
  return out
})
const indicator = ref<Projection | null>(null)
const dropActive = ref(false)
const ghost = ref<{ x: number; y: number; label: string; count: number } | null>(null)
const announcement = ref('')
let pending: { row: SortRow; x: number; y: number; pointerId: number } | null = null
let drag: DragInfo | null = null
let over: { list: ListApi; p: Projection } | null = null

const api: ListApi = {
  get group() {
    return props.group
  },
  get put() {
    return props.put && !props.disabled
  },
  el: () => rootEl.value,
  project,
  receive(item, target) {
    const next = insertItem(props.modelValue, item, target)
    emit('update:modelValue', next)
    // from 的位置是在來源清單裡，這裡不知道：index 為 -1
    emit('add', { item, from: { parentId: null, index: -1 }, to: target })
    announcement.value = t.value.sortable.dropped(item.label, positionText(item.id, next))
  },
  setIndicator(p) {
    indicator.value = p
    dropActive.value = !!p
  },
}
onMounted(() => registry.add(api))
onBeforeUnmount(() => {
  registry.delete(api)
  unlisten()
})

/** 游標在這個清單上時的放置位置；不在範圍內或不允許時為 null */
function project(x: number, y: number, d: DragInfo): Projection | null {
  const root = rootEl.value
  if (!root) return null
  const box = root.getBoundingClientRect()
  const same = d.source === api
  if (x < box.left || x > box.right || y < box.top - 8 || y > box.bottom + 8) return null
  if (!same && (!props.group || !api.put)) return null
  const visible = flattenTree(props.modelValue, collapsed.value, same ? d.id : null)
  let overIndex = 0
  for (const r of visible) {
    const rect = rowEls.get(r.item.id)?.getBoundingClientRect()
    if (rect && y > rect.top + rect.height / 2) overIndex++
  }
  const wanted = same ? d.startDepth + (x - d.startX) / props.indent : (x - box.left) / props.indent
  const { target, depth } = projectDrop(visible, overIndex, Math.floor(wanted + 0.5), props.maxDepth)
  const parent = target.parentId ? findItem(props.modelValue, target.parentId)!.item : null
  if (props.canDrop && !props.canDrop(d.item, parent)) return null
  // 指示線位置：下一列的上緣（沒有下一列時接在最後一列下面）
  const nextRow = visible[overIndex]
  const prevRow = visible[overIndex - 1]
  let lineY = 0
  if (nextRow) lineY = (rowEls.get(nextRow.item.id)?.getBoundingClientRect().top ?? box.top) - box.top - 3
  else if (prevRow) lineY = (rowEls.get(prevRow.item.id)?.getBoundingClientRect().bottom ?? box.top) - box.top + 1
  return { target, depth, y: lineY }
}

function onDown(e: PointerEvent, row: SortRow): void {
  if (!canDrag(row.item) || (e.pointerType === 'mouse' && e.button !== 0) || working.value) return
  pending = { row, x: e.clientX, y: e.clientY, pointerId: e.pointerId }
  listen()
}
function onMove(e: PointerEvent): void {
  if (!pending) return
  if (!drag) {
    if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) < 4) return
    const r = pending.row
    drag = { id: r.item.id, item: r.item, source: api, startX: pending.x, startDepth: r.depth }
    dragId.value = r.item.id
    // 拖曳中不要選到頁面文字
    document.body.style.userSelect = 'none'
    window.getSelection?.()?.removeAllRanges()
  }
  e.preventDefault?.()
  ghost.value = { x: e.clientX + 12, y: e.clientY + 8, label: drag.item.label, count: 1 + countItems(drag.item.children ?? []) }
  let hit: { list: ListApi; p: Projection } | null = null
  for (const l of registry) {
    if (l !== api && (!props.group || l.group !== props.group)) continue
    const p = l.project(e.clientX, e.clientY, drag)
    if (p) {
      hit = { list: l, p }
      break
    }
  }
  if (over && over.list !== hit?.list) over.list.setIndicator(null)
  over = hit
  hit?.list.setIndicator(hit.p)
}
function onUp(): void {
  const d = drag
  const o = over
  finish()
  if (!d || !o) return
  const from = findItem(props.modelValue, d.id)!
  const fromTarget = { parentId: from.parentId, index: from.index }
  if (o.list === api) {
    const next = moveItem(props.modelValue, d.id, o.p.target)
    if (sameStructure(next, props.modelValue)) return
    emit('update:modelValue', next)
    emit('change', { item: d.item, from: fromTarget, to: o.p.target })
    announcement.value = t.value.sortable.dropped(d.item.label, positionText(d.id, next))
  } else {
    emit('update:modelValue', removeItem(props.modelValue, d.id).tree)
    emit('remove', { item: d.item, from: fromTarget, to: o.p.target })
    o.list.receive(d.item, o.p.target)
  }
}
function finish(): void {
  if (drag) document.body.style.userSelect = ''
  if (over) over.list.setIndicator(null)
  over = null
  drag = null
  pending = null
  dragId.value = null
  ghost.value = null
  unlisten()
}
function onCancelKey(e: KeyboardEvent): void {
  if (e.key === 'Escape' && drag) {
    finish()
    announcement.value = t.value.sortable.cancelled
  }
}
function listen(): void {
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', finish)
  window.addEventListener('keydown', onCancelKey)
}
function unlisten(): void {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', finish)
  window.removeEventListener('keydown', onCancelKey)
}

// ---- 鍵盤 ----
const grabbedId = ref<string | null>(null)
const focusIndex = ref(0)
const tabStop = computed(() => Math.min(focusIndex.value, Math.max(0, rows.value.length - 1)))
function focusItem(id: string): void {
  const i = rows.value.findIndex((r) => r.item.id === id)
  if (i >= 0) focusIndex.value = i
  void nextTick(() => rootEl.value?.querySelector<HTMLElement>(`[data-grip="${CSS.escape(id)}"]`)?.focus())
}
function onKey(e: KeyboardEvent, row: SortRow, i: number): void {
  const id = row.item.id
  if (grabbedId.value) {
    const g = grabbedId.value
    const dirs: Record<string, 'up' | 'down' | 'indent' | 'outdent'> = { ArrowUp: 'up', ArrowDown: 'down', ArrowRight: 'indent', ArrowLeft: 'outdent' }
    if (dirs[e.key]) {
      e.preventDefault()
      if ((dirs[e.key] === 'indent' || dirs[e.key] === 'outdent') && props.maxDepth <= 1) return
      const next = keyboardMove(working.value!, g, dirs[e.key], props.maxDepth)
      const f = findItem(next, g)!
      const parent = f.parentId ? findItem(next, f.parentId)!.item : null
      if (next === working.value || (props.canDrop && !props.canDrop(row.item, parent))) return
      // 移進收合的父項時先展開
      if (f.parentId && collapsed.value.has(f.parentId)) toggle(f.parentId)
      working.value = next
      announcement.value = t.value.sortable.moved(positionText(g, next))
      focusItem(g)
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      drop()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      working.value = null
      grabbedId.value = null
      announcement.value = t.value.sortable.cancelled
      focusItem(g)
    } else if (e.key === 'Tab') {
      drop()
    }
    return
  }
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    if (!canDrag(row.item)) {
      announcement.value = t.value.sortable.cannotMove(row.item.label)
      return
    }
    working.value = props.modelValue
    grabbedId.value = id
    announcement.value = t.value.sortable.grabbed(row.item.label, positionText(id))
    return
  }
  let next = -1
  if (e.key === 'ArrowDown') next = Math.min(rows.value.length - 1, i + 1)
  else if (e.key === 'ArrowUp') next = Math.max(0, i - 1)
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = rows.value.length - 1
  else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && row.hasChildren) {
    const isCollapsed = collapsed.value.has(id)
    if ((e.key === 'ArrowRight') === isCollapsed) toggle(id)
    e.preventDefault()
    return
  } else return
  e.preventDefault()
  focusItem(rows.value[next].item.id)
}
function drop(): void {
  const g = grabbedId.value!
  const next = working.value!
  const before = findItem(props.modelValue, g)!
  const after = findItem(next, g)!
  working.value = null
  grabbedId.value = null
  announcement.value = t.value.sortable.dropped(after.item.label, positionText(g, next))
  if (sameStructure(next, props.modelValue)) return
  emit('update:modelValue', next)
  emit('change', { item: after.item, from: { parentId: before.parentId, index: before.index }, to: { parentId: after.parentId, index: after.index } })
  focusItem(g)
}

defineExpose({
  /** 收合 / 展開某一項 */
  toggle,
  /** 全部展開 */
  expandAll: () => (collapsed.value = new Set()),
  /** 全部收合（有子項的） */
  collapseAll: () => (collapsed.value = new Set(flattenTree(props.modelValue).filter((r) => r.hasChildren).map((r) => r.item.id))),
  /** item 是否在 ancestor 底下（含自己） */
  isDescendant: (ancestorId: string, id: string) => isDescendant(props.modelValue, ancestorId, id),
})
</script>
