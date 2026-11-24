<template>
  <div class="scheduler flex flex-col overflow-hidden rounded-lg border border-stroke-default bg-surface-primary text-sm">
    <!-- 工具列 -->
    <div class="flex flex-wrap items-center gap-2 border-b border-stroke-light px-3 py-2">
      <div class="inline-flex items-center gap-1">
        <button type="button" :class="navBtn" :aria-label="t.scheduler.prev" @click="step(-1)">
          <span class="material-symbols-outlined text-lg" aria-hidden="true">chevron_left</span>
        </button>
        <button type="button" :class="[navBtn, 'px-2.5 text-xs']" @click="goTo(nowMs)">{{ t.scheduler.today }}</button>
        <button type="button" :class="navBtn" :aria-label="t.scheduler.next" @click="step(1)">
          <span class="material-symbols-outlined text-lg" aria-hidden="true">chevron_right</span>
        </button>
      </div>
      <h3 class="min-w-0 truncate text-sm font-semibold text-content-primary" aria-live="polite">{{ rangeTitle }}</h3>
      <div class="ml-auto inline-flex overflow-hidden rounded-md border border-stroke-default" role="group" :aria-label="t.scheduler.viewLabel">
        <button
          v-for="v in (['week', 'day'] as const)"
          :key="v"
          type="button"
          class="whitespace-nowrap px-3 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus"
          :class="curView === v ? 'bg-accent-solid text-white' : 'bg-surface-primary text-content-secondary hover:bg-surface-secondary'"
          :aria-pressed="curView === v"
          @click="setView(v)"
        >
          {{ t.scheduler.views[v] }}
        </button>
      </div>
    </div>

    <!-- 時間格 -->
    <div ref="scrollEl" class="overflow-auto" :style="{ maxHeight: px(props.height) }">
      <div class="grid" :style="{ gridTemplateColumns: `3.5rem repeat(${columns.length}, minmax(${props.minColumnWidth}px, 1fr))` }">
        <!-- 表頭 -->
        <div class="sticky left-0 top-0 z-30 border-b border-r border-stroke-light bg-surface-primary" />
        <div
          v-for="col in columns"
          :key="`h-${col.key}`"
          class="sticky top-0 z-20 flex min-w-0 items-center justify-center gap-1 border-b border-r border-stroke-light bg-surface-primary px-1 py-1.5 text-xs"
          :class="col.isToday ? 'font-semibold text-accent-on-subtle' : 'text-content-secondary'"
        >
          <button
            v-if="curView === 'week'"
            type="button"
            class="truncate rounded px-1 hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
            :aria-label="t.scheduler.openDay(col.label)"
            @click="openDay(col.day)"
          >
            {{ col.label }}
          </button>
          <template v-else>
            <span v-if="col.color" class="h-2 w-2 shrink-0 rounded-full" :style="{ background: col.color }" aria-hidden="true" />
            <span class="truncate">{{ col.label }}</span>
          </template>
        </div>

        <!-- 時間刻度 -->
        <div class="sticky left-0 z-10 border-r border-stroke-light bg-surface-primary" :style="{ height: px(bodyHeight) }" aria-hidden="true">
          <div class="relative h-full">
            <span
              v-for="h in hours"
              :key="h"
              class="absolute right-1.5 -translate-y-1/2 text-[11px] tabular-nums text-content-tertiary"
              :style="{ top: px((h - props.dayStart) * props.hourHeight) }"
            >
              {{ h === props.dayStart ? '' : `${pad(h)}:00` }}
            </span>
          </div>
        </div>

        <!-- 欄 -->
        <div
          v-for="(col, ci) in columns"
          :key="col.key"
          :ref="(el) => (colEls[ci] = el as HTMLElement | null)"
          class="relative touch-none border-r border-stroke-light"
          :class="props.readonly ? '' : 'cursor-cell'"
          :style="{
            height: px(bodyHeight),
            backgroundImage: gridLines,
            backgroundSize: `100% ${props.hourHeight}px`,
            backgroundColor: col.isToday && curView === 'week' ? 'color-mix(in srgb, rgb(var(--t-accent-solid)) 5%, transparent)' : undefined,
          }"
          :data-col="ci"
          @pointerdown="onGridDown($event, ci)"
        >
          <!-- 事件 -->
          <button
            v-for="p in placed[ci]"
            :key="p.event.id"
            :ref="(el) => (eventEls[p.event.id] = el as HTMLElement | null)"
            type="button"
            class="sched-event absolute flex flex-col overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-xs leading-tight text-content-primary shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
            :class="[
              selectedId === p.event.id ? 'z-[5] ring-2 ring-stroke-focus' : 'z-[2]',
              drag && dragId === p.event.id ? 'opacity-90 shadow-md' : '',
              canEdit(p.event) ? 'cursor-grab' : 'cursor-pointer',
            ]"
            :style="eventStyle(p)"
            :aria-label="eventAria(p)"
            :aria-pressed="selectedId === p.event.id"
            :data-id="p.event.id"
            @pointerdown.stop="onEventDown($event, p.event, ci)"
            @click="onEventClick(p.event)"
            @keydown="onEventKey($event, p.event, ci)"
          >
            <span class="flex min-w-0 items-center gap-0.5 font-medium">
              <span v-if="conflictIds.has(p.event.id)" class="material-symbols-outlined shrink-0 text-danger" style="font-size: 13px" aria-hidden="true">warning</span>
              <span v-if="p.event.locked" class="material-symbols-outlined shrink-0 text-content-tertiary" style="font-size: 13px" aria-hidden="true">lock</span>
              <span class="truncate">{{ p.event.title }}</span>
            </span>
            <span v-if="p.end - p.start >= 45 * MIN_MS" class="truncate tabular-nums text-content-secondary">{{ timeRange(p.start, p.end) }}</span>
            <span
              v-if="canEdit(p.event) && !p.clippedEnd"
              class="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
              data-resize
              :aria-label="t.scheduler.resize"
              @pointerdown.stop="onResizeDown($event, p.event, ci)"
            />
          </button>

          <!-- 拖曳建立中 -->
          <div
            v-if="createGhost && createGhost.col === ci"
            class="pointer-events-none absolute inset-x-1 z-[6] rounded-md border-2 border-dashed border-accent bg-accent-subtle px-1.5 py-0.5 text-xs text-accent-on-subtle"
            :style="{ top: pct(createGhost.top), height: pct(createGhost.height) }"
            data-ghost
          >
            {{ t.scheduler.newEvent }} {{ timeRange(createGhost.start, createGhost.end) }}
          </div>

          <!-- 現在時間 -->
          <div v-if="nowTop[ci] !== null" class="pointer-events-none absolute inset-x-0 z-[7] h-0.5" :style="{ top: pct(nowTop[ci]!), background: 'rgb(var(--t-danger-solid))' }" data-now>
            <span class="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full" :style="{ background: 'rgb(var(--t-danger-solid))' }" />
          </div>
        </div>
      </div>
    </div>
    <p class="border-t border-stroke-light px-3 py-1.5 text-[11px] text-content-tertiary">{{ props.readonly ? t.scheduler.readonlyHint : t.scheduler.hint }}</p>
  </div>
</template>

<script setup lang="ts">
/**
 * ChptScheduler 週 / 日行事曆 —— 設備預約、會議室、保養排程。
 * 週檢視 7 天、日檢視可依資源（機台、會議室、人）分欄；時間重疊的事件並排；
 * 空白處拖曳建立（emit create）、拖曳事件移動（可換天 / 換資源）、拉下緣調整長度；同一資源時間衝突標 ⚠。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useLocale } from '../shared/config'
import {
  MIN_MS,
  addDays,
  conflictsOf,
  layoutColumn,
  moveEvent,
  resizeEvent,
  snap,
  startOfDay,
  toMs,
  weekDays,
  type PlacedEvent,
  type SchedEvent,
  type SchedResource,
} from '../shared/scheduler'

export type SchedulerView = 'week' | 'day'

export interface ChptSchedulerProps {
  /** 事件（v-model:events） */
  events?: SchedEvent[]
  /** 週 / 日（v-model:view） */
  view?: SchedulerView
  /** 顯示哪一天（所在的週）；v-model:date；不給時為今天 */
  date?: number | string | Date | null
  /** 日檢視依資源分欄 */
  resources?: SchedResource[]
  /** 可見時段（時） */
  dayStart?: number
  dayEnd?: number
  /** 拖曳吸附（分鐘） */
  snapMinutes?: number
  /** 點一下空白處建立的預設長度（分鐘） */
  defaultDuration?: number
  /** 一小時的高度（px） */
  hourHeight?: number
  /** 時間格最大高度（超過可捲動） */
  height?: number | string
  /** 每欄最小寬度（px；太窄時左右捲動） */
  minColumnWidth?: number
  /** 一週從星期幾開始（0 = 日、1 = 一） */
  weekStartsOn?: 0 | 1
  /** 一開始捲到幾點 */
  initialHour?: number
  /** 「現在」；不給時用現在並每分鐘更新 */
  now?: number | Date | null
  readonly?: boolean
}

const t = useLocale()
const props = withDefaults(defineProps<ChptSchedulerProps>(), {
  events: () => [],
  view: 'week',
  date: null,
  resources: () => [],
  dayStart: 0,
  dayEnd: 24,
  snapMinutes: 15,
  defaultDuration: 60,
  hourHeight: 48,
  height: 520,
  minColumnWidth: 96,
  weekStartsOn: 1,
  initialHour: 8,
  now: null,
  readonly: false,
})

const emit = defineEmits<{
  (e: 'update:events', events: SchedEvent[]): void
  (e: 'update:view', view: SchedulerView): void
  (e: 'update:date', day: number): void
  /** 拖曳或點擊空白處：要建立的時段（元件不會自己新增，由使用端決定） */
  (e: 'create', slot: { start: number; end: number; resource?: string }): void
  (e: 'select', event: SchedEvent): void
  /** 移動或調整後 */
  (e: 'change', payload: { event: SchedEvent; previous: SchedEvent; kind: 'move' | 'resize' }): void
  /** 選取的事件按 Delete */
  (e: 'delete', event: SchedEvent): void
}>()

const pad = (n: number) => String(n).padStart(2, '0')
const px = (v: number | string) => (typeof v === 'number' ? `${v}px` : v)
const pct = (v: number) => `${v * 100}%`
const navBtn =
  'inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-stroke-default bg-surface-primary text-content-secondary hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus'
const gridLines = 'linear-gradient(to bottom, rgb(var(--t-stroke-light)) 1px, transparent 1px)'

// ---- 現在 ----
const clock = ref(Date.now())
const timer = setInterval(() => (clock.value = Date.now()), 60_000)
onBeforeUnmount(() => clearInterval(timer))
const nowMs = computed(() => (props.now === null ? clock.value : toMs(props.now)))

// ---- 檢視與日期（可受控也可不受控） ----
const curView = ref<SchedulerView>(props.view)
watch(
  () => props.view,
  (v) => (curView.value = v)
)
const curDay = ref(startOfDay(props.date === null ? nowMs.value : toMs(props.date)))
watch(
  () => props.date,
  (v) => {
    if (v !== null) curDay.value = startOfDay(toMs(v))
  }
)
function setView(v: SchedulerView): void {
  curView.value = v
  emit('update:view', v)
}
function goTo(t0: number): void {
  curDay.value = startOfDay(t0)
  emit('update:date', curDay.value)
}
function step(dir: 1 | -1): void {
  goTo(addDays(curDay.value, curView.value === 'week' ? 7 * dir : dir))
}
function openDay(day: number): void {
  goTo(day)
  setView('day')
}

// ---- 欄 ----
interface Column {
  key: string
  day: number
  resource?: string
  label: string
  color?: string
  isToday: boolean
}
const dayLabel = (d: number) => {
  const x = new Date(d)
  return t.value.scheduler.dayHeader(`${x.getMonth() + 1}/${x.getDate()}`, t.value.scheduler.weekdayShort[x.getDay()])
}
const days = computed(() => (curView.value === 'week' ? weekDays(curDay.value, props.weekStartsOn) : [curDay.value]))
const columns = computed<Column[]>(() => {
  const today = startOfDay(nowMs.value)
  if (curView.value === 'day' && props.resources.length)
    return props.resources.map((r) => ({ key: r.id, day: curDay.value, resource: r.id, label: r.name, color: r.color, isToday: curDay.value === today }))
  return days.value.map((d) => ({ key: String(d), day: d, label: dayLabel(d), isToday: d === today }))
})
const colFrom = (c: Column) => new Date(c.day).setHours(props.dayStart, 0, 0, 0)
const colTo = (c: Column) => (props.dayEnd >= 24 ? addDays(c.day, 1) : new Date(c.day).setHours(props.dayEnd, 0, 0, 0))
const hours = computed(() => Array.from({ length: props.dayEnd - props.dayStart }, (_, i) => props.dayStart + i))
const bodyHeight = computed(() => (props.dayEnd - props.dayStart) * props.hourHeight)

const rangeTitle = computed(() => {
  const s = t.value.scheduler
  const ymd = (d: number) => {
    const x = new Date(d)
    return `${x.getFullYear()}/${x.getMonth() + 1}/${x.getDate()}`
  }
  if (curView.value === 'day') return s.dayTitle(ymd(curDay.value), s.weekdayShort[new Date(curDay.value).getDay()])
  const [a, b] = [days.value[0], days.value[6]]
  const eb = new Date(b)
  return s.weekTitle(ymd(a), new Date(a).getFullYear() === eb.getFullYear() ? `${eb.getMonth() + 1}/${eb.getDate()}` : ymd(b))
})

// ---- 拖曳中的預覽：把正在拖的事件換成預覽版本 ----
type Drag =
  | { kind: 'create'; col: number; anchor: number; cur: number; x: number; y: number; moved: boolean }
  | { kind: 'move'; original: SchedEvent; preview: SchedEvent; offset: number; x: number; y: number; moved: boolean }
  | { kind: 'resize'; original: SchedEvent; preview: SchedEvent; moved: boolean }
const drag = ref<Drag | null>(null)
const dragId = computed(() => (drag.value && drag.value.kind !== 'create' ? drag.value.original.id : null))
const shown = computed(() => {
  const d = drag.value
  if (!d || d.kind === 'create') return props.events
  return props.events.map((e) => (e.id === d.original.id ? d.preview : e))
})

const placed = computed<PlacedEvent[][]>(() =>
  columns.value.map((c) => {
    const list = c.resource === undefined ? shown.value : shown.value.filter((e) => e.resource === c.resource)
    return layoutColumn(list, colFrom(c), colTo(c))
  })
)

const conflictIds = computed(() => {
  const ids = new Set<string>()
  for (const e of shown.value) if (e.resource !== undefined && conflictsOf(e, shown.value).length) ids.add(e.id)
  return ids
})

const nowTop = computed(() =>
  columns.value.map((c) => {
    const from = colFrom(c)
    const to = colTo(c)
    return nowMs.value >= from && nowMs.value <= to ? (nowMs.value - from) / (to - from) : null
  })
)

const createGhost = computed(() => {
  const d = drag.value
  if (!d || d.kind !== 'create' || !d.moved) return null
  const c = columns.value[d.col]
  const from = colFrom(c)
  const span = colTo(c) - from
  const start = Math.min(d.anchor, d.cur)
  const end = Math.max(d.anchor, d.cur)
  return { col: d.col, start, end, top: (start - from) / span, height: (end - start) / span }
})

// ---- 呈現 ----
const resourceById = computed(() => new Map(props.resources.map((r) => [r.id, r])))
function colorOf(e: SchedEvent): string {
  return e.color ?? (e.resource !== undefined ? resourceById.value.get(e.resource)?.color : undefined) ?? 'rgb(var(--t-accent-solid))'
}
function eventStyle(p: PlacedEvent) {
  const c = colorOf(p.event)
  return {
    top: pct(p.top),
    height: `max(${pct(p.height)}, 18px)`,
    left: `calc(${pct(p.col / p.cols)} + 2px)`,
    width: `calc(${pct(1 / p.cols)} - 4px)`,
    borderLeftColor: c,
    background: `color-mix(in srgb, ${c} 16%, rgb(var(--t-surface-primary)))`,
  }
}
const hm = (t0: number) => {
  const d = new Date(t0)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const timeRange = (a: number, b: number) => `${hm(a)}–${hm(b)}`
function eventAria(p: PlacedEvent): string {
  const s = t.value.scheduler
  const parts = [s.eventLabel(p.event.title, `${dayLabel(startOfDay(p.start))} ${timeRange(p.start, p.end)}`)]
  if (p.event.resource !== undefined) parts.push(resourceById.value.get(p.event.resource)?.name ?? p.event.resource)
  if (conflictIds.value.has(p.event.id)) parts.push(s.conflict)
  if (p.event.locked) parts.push(s.locked)
  return parts.join(s.separator)
}

// ---- 選取 ----
const selectedId = ref<string | null>(null)
const canEdit = (e: SchedEvent) => !props.readonly && !e.locked
function onEventClick(e: SchedEvent): void {
  if (suppressClick) {
    suppressClick = false
    return
  }
  selectedId.value = e.id
  emit('select', e)
}

// ---- 指標座標 → 時間 / 欄 ----
const colEls: (HTMLElement | null)[] = []
const eventEls: Record<string, HTMLElement | null> = {}
const scrollEl = ref<HTMLElement | null>(null)
function colIndexAt(x: number): number {
  const first = colEls[0]
  if (!first) return 0
  const r = first.getBoundingClientRect()
  const w = r.width || 1
  return Math.max(0, Math.min(columns.value.length - 1, Math.floor((x - r.left) / w)))
}
function timeAt(y: number, ci: number): number {
  const el = colEls[ci] ?? colEls[0]
  const c = columns.value[ci]
  const from = colFrom(c)
  const to = colTo(c)
  if (!el) return from
  const r = el.getBoundingClientRect()
  const f = Math.max(0, Math.min(1, (y - r.top) / (r.height || 1)))
  return from + f * (to - from)
}
const snapTo = (t0: number) => snap(t0, props.snapMinutes)
const isPrimary = (e: PointerEvent) => !(e.pointerType === 'mouse' && e.button !== 0)

function onGridDown(e: PointerEvent, ci: number): void {
  if (props.readonly || !isPrimary(e)) return
  const at = snapTo(timeAt(e.clientY, ci))
  drag.value = { kind: 'create', col: ci, anchor: at, cur: at, x: e.clientX, y: e.clientY, moved: false }
  listen()
}
function onEventDown(e: PointerEvent, ev: SchedEvent, ci: number): void {
  if (!canEdit(ev) || !isPrimary(e)) return
  drag.value = { kind: 'move', original: ev, preview: ev, offset: timeAt(e.clientY, ci) - toMs(ev.start), x: e.clientX, y: e.clientY, moved: false }
  listen()
}
function onResizeDown(e: PointerEvent, ev: SchedEvent, ci: number): void {
  if (!canEdit(ev) || !isPrimary(e)) return
  drag.value = { kind: 'resize', original: ev, preview: ev, moved: false }
  resizeCol = ci
  listen()
}
let resizeCol = 0
let suppressClick = false

function onMove(e: PointerEvent): void {
  const d = drag.value
  if (!d) return
  if (d.kind === 'create') {
    d.cur = snapTo(timeAt(e.clientY, d.col))
    if (Math.abs(e.clientY - d.y) > 4) d.moved = true
  } else if (d.kind === 'move') {
    if (!d.moved && Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) < 4) return
    d.moved = true
    const ci = colIndexAt(e.clientX)
    const col = columns.value[ci]
    const start = snapTo(timeAt(e.clientY, ci) - d.offset)
    d.preview = moveEvent(d.original, start, col.resource)
  } else {
    d.moved = true
    d.preview = resizeEvent(d.original, snapTo(timeAt(e.clientY, resizeCol)), props.snapMinutes)
  }
}
function onUp(): void {
  const d = drag.value
  unlisten()
  drag.value = null
  if (!d) return
  if (d.kind === 'create') {
    const col = columns.value[d.col]
    let start = Math.min(d.anchor, d.cur)
    let end = Math.max(d.anchor, d.cur)
    if (!d.moved || end - start < props.snapMinutes * MIN_MS) {
      start = d.anchor
      end = start + props.defaultDuration * MIN_MS
    }
    emit('create', col.resource === undefined ? { start, end } : { start, end, resource: col.resource })
    return
  }
  if (!d.moved) return
  suppressClick = true
  setTimeout(() => (suppressClick = false))
  commit(d.original, d.preview, d.kind)
}
function commit(previous: SchedEvent, next: SchedEvent, kind: 'move' | 'resize'): void {
  if (toMs(next.start) === toMs(previous.start) && toMs(next.end) === toMs(previous.end) && next.resource === previous.resource) return
  emit(
    'update:events',
    props.events.map((e) => (e.id === previous.id ? next : e))
  )
  emit('change', { event: next, previous, kind })
}
function listen(): void {
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onCancel)
}
function unlisten(): void {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onCancel)
}
function onCancel(): void {
  unlisten()
  drag.value = null
}
onBeforeUnmount(unlisten)

// ---- 鍵盤：上下移動、Shift + 上下調整長度、左右換天 / 換資源、Delete ----
function onEventKey(e: KeyboardEvent, ev: SchedEvent, ci: number): void {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (!canEdit(ev)) return
    e.preventDefault()
    emit('delete', ev)
    return
  }
  const dir = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -1, ArrowRight: 1 }[e.key]
  if (dir === undefined || !canEdit(ev)) return
  e.preventDefault()
  const stepMs = props.snapMinutes * MIN_MS
  let next: SchedEvent
  let kind: 'move' | 'resize' = 'move'
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    if (e.shiftKey) {
      next = resizeEvent(ev, toMs(ev.end) + dir * stepMs, props.snapMinutes)
      kind = 'resize'
    } else next = moveEvent(ev, toMs(ev.start) + dir * stepMs)
  } else {
    const target = columns.value[ci + dir]
    if (!target) return
    const cur = columns.value[ci]
    if (target.resource !== undefined) next = moveEvent(ev, toMs(ev.start), target.resource)
    else next = moveEvent(ev, addDays(toMs(ev.start), Math.round((target.day - cur.day) / 86_400_000)))
  }
  selectedId.value = ev.id
  commit(ev, next, kind)
  // 換欄後元素會重建：把焦點移回同一個事件
  void nextTick(() => eventEls[ev.id]?.focus())
}

// ---- 捲動 ----
function scrollToHour(h: number): void {
  if (scrollEl.value) scrollEl.value.scrollTop = Math.max(0, (h - props.dayStart) * props.hourHeight)
}
onMounted(() => scrollToHour(props.initialHour))

defineExpose({
  /** 捲到某個小時 */
  scrollToHour,
  /** 跳到某天（所在的週） */
  goTo,
  /** 同一資源時間重疊的事件 id */
  conflicts: computed(() => [...conflictIds.value]),
})
</script>
