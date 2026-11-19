<template>
  <div
    ref="root"
    class="chpt-dashboard-grid relative"
    :class="{ 'is-stacked': stacked, 'is-dragging': !!drag }"
    role="region"
    :aria-label="props.ariaLabel ?? t.dashboardGrid.label"
    :style="stacked ? { display: 'flex', flexDirection: 'column', gap: `${props.gap}px` } : { height: `${containerHeight}px` }"
  >
    <!-- 拖曳中：目標位置的預覽框 -->
    <div v-if="drag && placeholder && !stacked" class="grid-placeholder absolute rounded-lg" :style="boxStyle(placeholder)" aria-hidden="true"></div>

    <section
      v-for="item in renderItems"
      :key="item.id"
      class="chpt-grid-item flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-stroke-light bg-surface-primary shadow-sm"
      :class="[stacked ? 'relative' : 'absolute', drag?.id === item.id ? 'is-active z-20 shadow-xl' : '']"
      :style="itemStyle(item)"
      :data-grid-id="item.id"
      :aria-labelledby="item.title ? `${uid}-${item.id}-title` : undefined"
    >
      <header v-if="item.title || $slots.actions || canEdit(item)" class="flex shrink-0 items-center gap-2 border-b border-stroke-light px-3 py-2">
        <button
          v-if="canEdit(item)"
          type="button"
          class="grid-drag-handle -ml-1 inline-flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-content-tertiary hover:bg-surface-tertiary hover:text-content-primary active:cursor-grabbing"
          :aria-label="t.dashboardGrid.drag(titleOf(item))"
          :title="t.dashboardGrid.drag(titleOf(item))"
          @pointerdown="startDrag($event, item, 'move')"
          @keydown="onHandleKey($event, item)"
        >
          <ChptIcon :size="18" color="current">drag_indicator</ChptIcon>
        </button>
        <h3 v-if="item.title" :id="`${uid}-${item.id}-title`" class="min-w-0 flex-1 truncate text-sm font-semibold text-content-primary">{{ item.title }}</h3>
        <span v-else class="flex-1"></span>
        <slot name="actions" :item="item"></slot>
      </header>
      <div class="min-h-0 flex-1 overflow-auto p-3">
        <slot :name="item.id" :item="item">
          <slot :item="item"></slot>
        </slot>
      </div>
      <span
        v-if="canEdit(item)"
        class="grid-resize-handle absolute bottom-0 right-0 size-4 cursor-se-resize"
        :title="t.dashboardGrid.resize(titleOf(item))"
        aria-hidden="true"
        @pointerdown="startDrag($event, item, 'resize')"
      ></span>
    </section>

    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, useTemplateRef, watch, type CSSProperties } from 'vue'
import ChptIcon from './ChptIcon.vue'
import { bottom, clampItem, compact as compactLayout, moveItem, sameLayout, sortLayout, type GridCompact, type GridItem } from '../shared/gridLayout'
import { useLocale } from '../shared/config'

/**
 * ChptDashboardGrid（CHPT 主題） - 可拖曳排列的儀表板格線
 *
 * 戰情室、產線看板這類「每個人想看的東西不一樣」的頁面：使用者可以自己拖動區塊、調整大小，
 * 版面可以記在 localStorage（persistKey）或由你存到後端（v-model）。
 *
 * - 拖標題列左側的把手移動、拖右下角調整大小；別的區塊會被推開，放開後全部往上靠攏
 * - 鍵盤：Tab 到把手，方向鍵移動一格、Shift + 方向鍵調整大小，結果以 aria-live 念出；Escape 取消拖曳
 * - 寬度小於 stackBelow（預設 640px）時改成一欄由上到下排列（手機），這時不能編輯
 * - static 的區塊固定不動
 */

export interface DashboardItem extends GridItem {
  title?: string
}

interface ChptDashboardGridProps {
  /** 版面（v-model）：每個區塊的 id、位置 x / y、大小 w / h（以格為單位） */
  modelValue: DashboardItem[]
  /** 欄數 */
  cols?: number
  /** 一列的高度（px） */
  rowHeight?: number
  /** 區塊間距（px） */
  gap?: number
  /** 可以拖曳、調整大小 */
  editable?: boolean
  /** 往上靠攏（vertical）或保留空位（none） */
  compact?: GridCompact
  /** 容器寬度小於這個值時改成一欄（px）；0 為不切換 */
  stackBelow?: number
  /** 把版面記在 localStorage（鍵 chpt-dashboard:{persistKey}） */
  persistKey?: string
  ariaLabel?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptDashboardGridProps>(), {
  cols: 12,
  rowHeight: 72,
  gap: 12,
  editable: false,
  compact: 'vertical',
  stackBelow: 640,
  persistKey: undefined,
  ariaLabel: undefined,
})

const emit = defineEmits<{
  (e: 'update:modelValue', layout: DashboardItem[]): void
  /** 拖曳或調整大小結束（版面有變時） */
  (e: 'layout-change', layout: DashboardItem[]): void
}>()

const root = useTemplateRef<HTMLElement>('root')
const uid = useId()
const announcement = ref('')

const titleOf = (item: DashboardItem) => item.title || t.value.dashboardGrid.untitled
const canEdit = (item: DashboardItem) => props.editable && !item.static && !stacked.value

// === 寬度：一欄模式 ===

const width = ref(0)
let observer: ResizeObserver | null = null
onMounted(() => {
  if (!root.value || typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver((entries) => {
    width.value = entries[entries.length - 1]?.contentRect.width ?? 0
  })
  observer.observe(root.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  stopDrag()
})
/** 量不到寬度（測試環境、還沒排版）時當成寬螢幕 */
const stacked = computed(() => props.stackBelow > 0 && width.value > 0 && width.value < props.stackBelow)

// === 版面 ===

function normalize(layout: DashboardItem[]): DashboardItem[] {
  return compactLayout(layout.map((it) => clampItem(it, props.cols)), props.compact)
}

function commit(layout: DashboardItem[]): void {
  if (sameLayout(layout, props.modelValue)) return
  emit('update:modelValue', layout)
  emit('layout-change', layout)
  save(layout)
}

// 記住的版面：掛載時套用（只套用位置與大小，id 以目前的區塊為準）
function storageKey() {
  return `chpt-dashboard:${props.persistKey}`
}
function save(layout: DashboardItem[]): void {
  if (!props.persistKey) return
  try {
    localStorage.setItem(storageKey(), JSON.stringify(layout.map(({ id, x, y, w, h }) => ({ id, x, y, w, h }))))
  } catch {
    /* 無痕模式或空間不足：只是記不住 */
  }
}
onMounted(() => {
  if (!props.persistKey) return
  let saved: Array<Pick<GridItem, 'id' | 'x' | 'y' | 'w' | 'h'>> = []
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey()) ?? '[]')
    saved = Array.isArray(raw) ? raw : []
  } catch {
    return
  }
  const byId = new Map(saved.filter((s) => s && typeof s.id === 'string').map((s) => [s.id, s]))
  if (!byId.size) return
  const merged = props.modelValue.map((it) => {
    const s = byId.get(it.id)
    if (!s || it.static) return it
    const pick = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
    return { ...it, x: pick(s.x, it.x), y: pick(s.y, it.y), w: pick(s.w, it.w), h: pick(s.h, it.h) }
  })
  const next = normalize(merged)
  if (!sameLayout(next, props.modelValue)) emit('update:modelValue', next)
})

/** 畫面上的版面：拖曳中用預覽，否則用 v-model（整理過的） */
const committed = computed(() => normalize(props.modelValue))
const preview = ref<DashboardItem[] | null>(null)
const current = computed(() => preview.value ?? committed.value)
/** 一欄模式依位置由上到下、由左到右 */
const renderItems = computed(() => (stacked.value ? (sortLayout(current.value) as DashboardItem[]) : current.value))
const containerHeight = computed(() => {
  const rows = bottom(current.value)
  return rows ? rows * (props.rowHeight + props.gap) - props.gap : 0
})

// === 定位 ===

/** 用 calc() 依容器寬度定位：不必量寬度就能畫，縮放視窗時也不用重算 */
function boxStyle(it: GridItem): CSSProperties {
  const { cols, gap, rowHeight } = props
  const col = `((100% - ${gap * (cols - 1)}px) / ${cols})`
  return {
    left: `calc(${col} * ${it.x} + ${gap * it.x}px)`,
    width: `calc(${col} * ${it.w} + ${gap * (it.w - 1)}px)`,
    top: `${it.y * (rowHeight + gap)}px`,
    height: `${it.h * rowHeight + (it.h - 1) * gap}px`,
  }
}

function itemStyle(item: DashboardItem): CSSProperties {
  if (stacked.value) return { minHeight: `${item.h * props.rowHeight + (item.h - 1) * props.gap}px` }
  // 拖曳中的區塊跟著游標走（像素），其他區塊照格線排
  if (drag.value?.id === item.id && drag.value.live) return { ...boxStyle(drag.value.origin), ...drag.value.live }
  return boxStyle(item)
}

// === 拖曳 / 調整大小 ===

interface DragState {
  id: string
  mode: 'move' | 'resize'
  origin: DashboardItem
  base: DashboardItem[]
  startX: number
  startY: number
  colWidth: number
  pointerId: number
  live: CSSProperties | null
}
const drag = ref<DragState | null>(null)
const placeholder = computed(() => (drag.value ? current.value.find((it) => it.id === drag.value!.id) ?? null : null))

function startDrag(e: PointerEvent, item: DashboardItem, mode: 'move' | 'resize'): void {
  if (!canEdit(item) || e.button !== 0) return
  e.preventDefault()
  const rect = root.value?.getBoundingClientRect()
  const total = rect?.width || width.value || props.cols * 80
  const colWidth = (total - props.gap * (props.cols - 1)) / props.cols
  const origin = committed.value.find((it) => it.id === item.id)!
  drag.value = { id: item.id, mode, origin, base: committed.value, startX: e.clientX, startY: e.clientY, colWidth, pointerId: e.pointerId, live: null }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', cancelDrag)
  window.addEventListener('keydown', onDragKey)
}

function onPointerMove(e: PointerEvent): void {
  const d = drag.value
  if (!d || e.pointerId !== d.pointerId) return
  const dx = e.clientX - d.startX
  const dy = e.clientY - d.startY
  const stepX = d.colWidth + props.gap
  const stepY = props.rowHeight + props.gap
  const o = d.origin
  if (d.mode === 'move') {
    preview.value = moveItem(d.base, d.id, { x: o.x + Math.round(dx / stepX), y: o.y + Math.round(dy / stepY) }, props.cols, props.compact)
    d.live = { transform: `translate(${dx}px, ${dy}px)` }
  } else {
    preview.value = moveItem(d.base, d.id, { w: o.w + Math.round(dx / stepX), h: o.h + Math.round(dy / stepY) }, props.cols, props.compact)
    const box = boxStyle(o)
    d.live = { width: `calc(${box.width} + ${dx}px)`, height: `${o.h * props.rowHeight + (o.h - 1) * props.gap + dy}px` }
  }
}

function onPointerUp(e: PointerEvent): void {
  if (!drag.value || e.pointerId !== drag.value.pointerId) return
  const next = preview.value
  const d = drag.value
  stopDrag()
  if (next) {
    commit(next)
    announce(d, next)
  }
}

function cancelDrag(): void {
  stopDrag()
}

function onDragKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    cancelDrag()
  }
}

function stopDrag(): void {
  drag.value = null
  preview.value = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', cancelDrag)
  window.removeEventListener('keydown', onDragKey)
}

function announce(d: { id: string; mode: 'move' | 'resize' }, layout: DashboardItem[]): void {
  const it = layout.find((v) => v.id === d.id)
  if (!it) return
  announcement.value =
    d.mode === 'move' ? t.value.dashboardGrid.moved(titleOf(it), it.x + 1, it.y + 1) : t.value.dashboardGrid.resized(titleOf(it), it.w, it.h)
}

// === 鍵盤 ===

const KEYS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }

function onHandleKey(e: KeyboardEvent, item: DashboardItem): void {
  const dir = KEYS[e.key]
  if (!dir || !canEdit(item)) return
  e.preventDefault()
  const it = committed.value.find((v) => v.id === item.id)!
  const [dx, dy] = dir
  const mode = e.shiftKey ? 'resize' : 'move'
  const next =
    mode === 'move'
      ? moveItem(committed.value, item.id, { x: it.x + dx, y: Math.max(0, it.y + dy) }, props.cols, props.compact)
      : moveItem(committed.value, item.id, { w: it.w + dx, h: it.h + dy }, props.cols, props.compact)
  commit(next)
  announce({ id: item.id, mode }, next)
}

// 欄數改變時把超出的區塊拉回來
watch(
  () => props.cols,
  () => {
    const next = normalize(props.modelValue)
    if (!sameLayout(next, props.modelValue)) emit('update:modelValue', next)
  }
)

defineExpose({
  /** 目前（整理過的）版面 */
  layout: () => committed.value,
  /** 清掉 persistKey 記住的版面（不改目前的版面） */
  clearSaved: () => {
    if (!props.persistKey) return
    try {
      localStorage.removeItem(storageKey())
    } catch {
      /* 忽略 */
    }
  },
})
</script>

<style scoped>
.chpt-grid-item {
  transition:
    left 150ms ease,
    top 150ms ease,
    width 150ms ease,
    height 150ms ease;
}

.chpt-grid-item.is-active,
.is-stacked .chpt-grid-item {
  transition: none;
}

.grid-placeholder {
  background-color: rgb(var(--t-accent) / 0.12);
  border: 2px dashed rgb(var(--t-accent) / 0.6);
  transition:
    left 100ms ease,
    top 100ms ease,
    width 100ms ease,
    height 100ms ease;
}

.grid-resize-handle {
  background: linear-gradient(135deg, transparent 50%, rgb(var(--t-content-tertiary) / 0.5) 50%, rgb(var(--t-content-tertiary) / 0.5) 60%, transparent 60%, transparent 70%, rgb(var(--t-content-tertiary) / 0.5) 70%, rgb(var(--t-content-tertiary) / 0.5) 80%, transparent 80%);
}

.grid-drag-handle:focus-visible {
  outline: 2px solid rgb(var(--t-stroke-focus));
  outline-offset: 1px;
}

@media (prefers-reduced-motion: reduce) {
  .chpt-grid-item,
  .grid-placeholder {
    transition: none;
  }
}
</style>
