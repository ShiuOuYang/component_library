<template>
  <div ref="root" class="chpt-kanban flex items-start gap-3 overflow-x-auto pb-2" role="region" :aria-label="props.ariaLabel ?? t.kanban.label">
    <section
      v-for="col in props.columns"
      :key="col.id"
      class="kanban-column flex shrink-0 flex-col rounded-lg border bg-surface-secondary"
      :class="[
        isOver(col) ? 'border-[rgb(var(--t-danger-solid))]' : 'border-stroke-light',
        targetColumn === col.id && !targetAllowed ? 'is-blocked' : '',
        targetColumn === col.id && targetAllowed && dragging ? 'is-target' : '',
      ]"
      :style="{ width: `${props.columnWidth}px` }"
      :data-column="col.id"
      :aria-labelledby="`${uid}-${col.id}-title`"
    >
      <header class="flex items-center gap-2 px-3 pb-1 pt-2.5">
        <span v-if="col.color" class="size-2.5 shrink-0 rounded-full" :style="{ background: col.color }" aria-hidden="true"></span>
        <h3 :id="`${uid}-${col.id}-title`" class="min-w-0 flex-1 truncate text-sm font-semibold text-content-primary">
          <slot name="column-header" :column="col" :cards="columnCards(col.id)">{{ col.title }}</slot>
        </h3>
        <span
          class="kanban-count shrink-0 rounded-full px-2 text-xs tabular-nums"
          :class="isOver(col) ? 'bg-danger-subtle text-danger-on-subtle font-semibold' : 'bg-surface-tertiary text-content-secondary'"
          :title="isOver(col) ? t.kanban.overLimit(col.limit!) : undefined"
        >
          {{ columnCards(col.id).length }}<template v-if="col.limit !== undefined"> / {{ col.limit }}</template>
          <span v-if="isOver(col)" class="sr-only">{{ t.kanban.overLimit(col.limit!) }}</span>
        </span>
      </header>

      <ul class="kanban-list flex min-h-16 flex-col gap-2 overflow-y-auto p-2" :style="props.maxHeight ? { maxHeight: `${props.maxHeight}px` } : undefined">
        <li v-for="card in columnCards(col.id)" :key="keyOf(card)">
          <div
            class="kanban-card rounded-md border bg-surface-primary p-2.5 text-sm text-content-primary shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--t-stroke-focus))]"
            :class="[
              keyOf(card) === activeKey ? 'is-moving border-dashed border-[rgb(var(--t-accent))] opacity-60' : 'border-stroke-light',
              props.disabled || isLocked(card) ? '' : 'cursor-grab select-none touch-none',
            ]"
            :data-card-key="keyOf(card)"
            tabindex="0"
            :aria-describedby="props.disabled || isLocked(card) ? undefined : helpId"
            @pointerdown="onPointerDown($event, card)"
            @keydown="onCardKey($event, card)"
          >
            <slot name="card" :card="card" :column="col">{{ titleOf(card) }}</slot>
          </div>
        </li>
        <li v-if="!columnCards(col.id).length" class="py-4 text-center text-xs text-content-tertiary">
          <slot name="empty" :column="col">{{ props.emptyText ?? t.kanban.empty }}</slot>
        </li>
      </ul>
      <slot name="column-footer" :column="col" :cards="columnCards(col.id)"></slot>
    </section>

    <!-- 滑鼠拖曳中的卡片（跟著游標） -->
    <div
      v-if="ghost"
      class="kanban-ghost pointer-events-none fixed z-50 rotate-2 rounded-md border border-stroke-default bg-surface-primary p-2.5 text-sm text-content-primary shadow-xl"
      :style="{ left: `${ghost.x}px`, top: `${ghost.y}px`, width: `${ghost.width}px` }"
      aria-hidden="true"
    >
      <slot name="card" :card="ghost.card" :column="columnById(String(ghost.card[props.columnField]))">{{ titleOf(ghost.card) }}</slot>
    </div>

    <span :id="helpId" class="sr-only">{{ t.kanban.help }}</span>
    <span class="sr-only" aria-live="assertive">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, useId, useTemplateRef } from 'vue'
import { dropIndex, groupCards, indexInColumn, moveCard } from '../shared/kanban'
import { useLocale } from '../shared/config'

/**
 * ChptKanban（CHPT 主題） - 看板
 *
 * 工單、異常單、改善提案這類「有狀態流程」的清單：每一欄是一個狀態，卡片拖到下一欄就是推進流程。
 *
 * - 卡片是一個扁平陣列（v-model），每張卡片的 columnField 記錄它在哪一欄；同一欄的順序就是陣列順序
 * - 滑鼠：拖曳卡片換欄、調整順序；目標位置即時預覽
 * - 鍵盤：空白鍵拿起卡片 → 方向鍵（左右換欄、上下換位置）→ 空白鍵放下；Escape 取消；每一步以 aria-live 念出
 * - 欄的 limit 是在製上限（WIP）：超過時欄框與數字變紅；enforceLimit 時不能放進已滿的欄
 * - canMove(card, from, to) 自訂規則（例如不能跳過品檢直接結案）；不允許的欄拖過去時顯示禁止
 */

export interface KanbanColumn {
  id: string
  title: string
  /** 在製上限（WIP） */
  limit?: number
  /** 標題前的小色點 */
  color?: string
}

export interface KanbanMoveEvent<T> {
  card: T
  from: string
  to: string
  /** 在目標欄的位置（0 起） */
  index: number
}

interface ChptKanbanProps<T> {
  modelValue: T[]
  columns: KanbanColumn[]
  /** 卡片唯一鍵的欄位 */
  keyField?: string
  /** 卡片所在欄的欄位 */
  columnField?: string
  /** 預設卡片內容用的標題欄位（有 #card 插槽時不用） */
  titleField?: string
  /** 自訂移動規則；回傳 false 表示不能從 from 移到 to */
  canMove?: ((card: T, from: string, to: string) => boolean) | null
  /** 不能放進已達在製上限的欄 */
  enforceLimit?: boolean
  /** 不能拖曳的卡片 */
  isLocked?: ((card: T) => boolean) | null
  disabled?: boolean
  columnWidth?: number
  /** 每一欄卡片區的最大高度（px；超過時捲動） */
  maxHeight?: number
  emptyText?: string
  ariaLabel?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptKanbanProps<T>>(), {
  keyField: 'id',
  columnField: 'status',
  titleField: 'title',
  canMove: null,
  enforceLimit: false,
  isLocked: null,
  disabled: false,
  columnWidth: 272,
  maxHeight: undefined,
  emptyText: undefined,
  ariaLabel: undefined,
})

const emit = defineEmits<{
  (e: 'update:modelValue', cards: T[]): void
  (e: 'move', payload: KanbanMoveEvent<T>): void
  /** 點擊卡片（沒有拖曳）或按 Enter */
  (e: 'card-click', card: T): void
}>()

const root = useTemplateRef<HTMLElement>('root')
const uid = useId()
const helpId = `${uid}-help`
const announcement = ref('')
const opts = computed(() => ({ keyField: props.keyField, columnField: props.columnField }))

const keyOf = (card: T) => card[props.keyField] as string | number
const titleOf = (card: T) => String(card[props.titleField] ?? card[props.keyField] ?? t.value.kanban.card)
const columnById = (id: string) => props.columns.find((c) => c.id === id) ?? { id, title: id }
const isLocked = (card: T) => !!props.isLocked?.(card)

// === 畫面上的卡片：移動中用預覽 ===

const preview = shallowRef<T[] | null>(null)
const cards = computed(() => preview.value ?? props.modelValue)
const grouped = computed(() => groupCards(cards.value, props.columns.map((c) => c.id), props.columnField))
const columnCards = (id: string) => grouped.value.get(id) ?? []
const isOver = (col: KanbanColumn) => col.limit !== undefined && columnCards(col.id).length > col.limit

/** 移動中的卡片 key（滑鼠或鍵盤） */
const activeKey = ref<string | number | null>(null)
const targetColumn = ref<string | null>(null)
const targetAllowed = ref(true)
const dragging = ref(false)

function allowed(card: T, from: string, to: string): boolean {
  if (props.canMove && from !== to && !props.canMove(card, from, to)) return false
  if (props.enforceLimit && from !== to) {
    const col = props.columns.find((c) => c.id === to)
    const count = props.modelValue.filter((c) => String(c[props.columnField]) === to).length
    if (col?.limit !== undefined && count >= col.limit) return false
  }
  return true
}

function commit(card: T, from: string, to: string, index: number): void {
  const next = moveCard(props.modelValue, keyOf(card), to, index, opts.value)
  // 放回原位（順序與所在欄都沒變）時不送事件；被移的卡片是新物件，所以比鍵與欄，不比物件
  const same = next.every((c, i) => keyOf(c) === keyOf(props.modelValue[i]) && c[props.columnField] === props.modelValue[i][props.columnField])
  preview.value = null
  if (same) return
  emit('update:modelValue', next)
  emit('move', { card: next.find((c) => keyOf(c) === keyOf(card))!, from, to, index })
}

// === 滑鼠拖曳 ===

interface PointerState {
  card: T
  from: string
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  width: number
  pointerId: number
  to: string
  index: number
  /** 原本的位置（拖到不允許的欄時預覽回到這裡） */
  origIndex: number
}
let pointer: PointerState | null = null
const ghost = shallowRef<{ card: T; x: number; y: number; width: number } | null>(null)

function onPointerDown(e: PointerEvent, card: T): void {
  if (e.button !== 0 || props.disabled || kbd.value) return
  const el = e.currentTarget as HTMLElement
  // 卡片裡的按鈕、連結、輸入框照常運作，不開始拖曳
  if ((e.target as HTMLElement).closest('button, a, input, select, textarea') && e.target !== el) return
  // 擋掉瀏覽器原生的選取文字與拖曳（否則會中斷 pointer 事件）；焦點自己給
  e.preventDefault()
  el.focus({ preventScroll: true })
  const rect = el.getBoundingClientRect()
  const from = String(card[props.columnField])
  const origIndex = indexInColumn(props.modelValue, keyOf(card), opts.value)
  pointer = {
    card,
    from,
    startX: e.clientX,
    startY: e.clientY,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
    width: rect.width,
    pointerId: e.pointerId,
    to: from,
    index: origIndex,
    origIndex,
  }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', cancelPointer)
  window.addEventListener('keydown', onPointerKey)
}

function onPointerMove(e: PointerEvent): void {
  const p = pointer
  if (!p || e.pointerId !== p.pointerId) return
  if (!dragging.value) {
    // 移動超過 5px 才算拖曳（否則是點擊）；鎖住的卡片不能拖
    if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) < 5 || isLocked(p.card)) return
    dragging.value = true
    activeKey.value = keyOf(p.card)
  }
  ghost.value = { card: p.card, x: e.clientX - p.offsetX, y: e.clientY - p.offsetY, width: p.width }

  // 游標在哪一欄（只看水平位置）、該欄的哪個位置
  const columns = [...(root.value?.querySelectorAll<HTMLElement>('[data-column]') ?? [])]
  const colEl = columns.find((c) => {
    const r = c.getBoundingClientRect()
    return e.clientX >= r.left && e.clientX <= r.right
  })
  if (!colEl) return
  const to = colEl.dataset.column!
  const mids = [...colEl.querySelectorAll<HTMLElement>('[data-card-key]')]
    .filter((el) => el.dataset.cardKey !== String(keyOf(p.card)))
    .map((el) => {
      const r = el.getBoundingClientRect()
      return r.top + r.height / 2
    })
  const index = dropIndex(mids, e.clientY)
  targetColumn.value = to
  targetAllowed.value = allowed(p.card, p.from, to)
  if (!targetAllowed.value) {
    // 不允許的欄：預覽回到原位（停在上一個經過的欄會誤以為放得下）
    p.to = p.from
    p.index = p.origIndex
    preview.value = null
    return
  }
  if (to === p.to && index === p.index && preview.value) return
  p.to = to
  p.index = index
  preview.value = moveCard(props.modelValue, keyOf(p.card), to, index, opts.value)
}

function onPointerUp(e: PointerEvent): void {
  const p = pointer
  if (!p || e.pointerId !== p.pointerId) return
  const wasDragging = dragging.value
  const ok = targetAllowed.value
  const target = targetColumn.value ?? p.to
  stopPointer()
  if (!wasDragging) {
    emit('card-click', p.card)
    return
  }
  if (ok) {
    commit(p.card, p.from, p.to, p.index)
    announcement.value = t.value.kanban.dropped(titleOf(p.card), columnById(p.to).title, p.index + 1)
  } else {
    announcement.value = t.value.kanban.blocked(titleOf(p.card), columnById(target).title)
  }
}

function onPointerKey(e: KeyboardEvent): void {
  if (e.key === 'Escape' && dragging.value) {
    e.preventDefault()
    const p = pointer
    cancelPointer()
    if (p) announcement.value = t.value.kanban.cancelled(titleOf(p.card))
  }
}

function cancelPointer(): void {
  stopPointer()
}

function stopPointer(): void {
  pointer = null
  dragging.value = false
  ghost.value = null
  preview.value = null
  activeKey.value = null
  targetColumn.value = null
  targetAllowed.value = true
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', cancelPointer)
  window.removeEventListener('keydown', onPointerKey)
}
onBeforeUnmount(stopPointer)

// === 鍵盤 ===

/** 鍵盤移動中：shallowRef，卡片物件保持原樣（不包成響應式代理，emit 出去的仍是原物件） */
const kbd = shallowRef<{ card: T; from: string; to: string; index: number } | null>(null)

function focusCard(key: string | number): void {
  nextTick(() => root.value?.querySelector<HTMLElement>(`[data-card-key="${CSS.escape(String(key))}"]`)?.focus())
}

function announceMove(prefix: 'grabbed' | 'moved'): void {
  const k = kbd.value!
  const total = columnCards(k.to).length
  announcement.value = t.value.kanban[prefix](titleOf(k.card), columnById(k.to).title, k.index + 1, total)
}

function onCardKey(e: KeyboardEvent, card: T): void {
  if (e.target !== e.currentTarget) return // 卡片裡的按鈕、連結自己處理
  const k = kbd.value
  if (e.key === 'Enter' && !k) {
    e.preventDefault()
    emit('card-click', card)
    return
  }
  if (props.disabled || isLocked(card)) return
  if (e.key === ' ') {
    e.preventDefault()
    if (!k) {
      const from = String(card[props.columnField])
      kbd.value = { card, from, to: from, index: indexInColumn(props.modelValue, keyOf(card), opts.value) }
      activeKey.value = keyOf(card)
      announceMove('grabbed')
    } else {
      kbd.value = null
      activeKey.value = null
      commit(k.card, k.from, k.to, k.index)
      announcement.value = t.value.kanban.dropped(titleOf(k.card), columnById(k.to).title, k.index + 1)
      focusCard(keyOf(k.card))
    }
    return
  }
  if (!k) return
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    kbd.value = null
    activeKey.value = null
    preview.value = null
    announcement.value = t.value.kanban.cancelled(titleOf(k.card))
    focusCard(keyOf(k.card))
    return
  }
  let { to, index } = k
  if (e.key === 'ArrowUp') index--
  else if (e.key === 'ArrowDown') index++
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const ids = props.columns.map((c) => c.id)
    const step = e.key === 'ArrowLeft' ? -1 : 1
    let i = ids.indexOf(to) + step
    // 跳過不允許的欄
    while (i >= 0 && i < ids.length && !allowed(k.card, k.from, ids[i])) i += step
    if (i < 0 || i >= ids.length) {
      e.preventDefault()
      const blockedId = ids[ids.indexOf(to) + step]
      if (blockedId) announcement.value = t.value.kanban.blocked(titleOf(k.card), columnById(blockedId).title)
      return
    }
    to = ids[i]
    index = Math.min(index, props.modelValue.filter((c) => String(c[props.columnField]) === to && keyOf(c) !== keyOf(k.card)).length)
  } else return
  e.preventDefault()
  const max = props.modelValue.filter((c) => String(c[props.columnField]) === to && keyOf(c) !== keyOf(k.card)).length
  index = Math.max(0, Math.min(max, index))
  kbd.value = { ...k, to, index }
  preview.value = moveCard(props.modelValue, keyOf(k.card), to, index, opts.value)
  announceMove('moved')
  focusCard(keyOf(k.card))
}
</script>

<style scoped>
.kanban-column.is-target {
  border-color: rgb(var(--t-accent));
}

.kanban-column.is-blocked {
  cursor: not-allowed;
  opacity: 0.6;
}

.kanban-card.cursor-grab:active {
  cursor: grabbing;
}
</style>
