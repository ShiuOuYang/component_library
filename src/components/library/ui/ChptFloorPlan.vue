<template>
  <div class="flex flex-col gap-2">
    <div
      ref="frame"
      class="relative overflow-hidden rounded-md border border-stroke-light bg-surface-secondary"
      :style="{ height: `${frameHeight}px`, touchAction: 'none' }"
    >
      <svg
        class="block h-full w-full select-none"
        :class="dragging ? 'cursor-grabbing' : 'cursor-grab'"
        role="group"
        :aria-label="props.label || t.floorPlan.label"
        :aria-describedby="`${uid}-hint`"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @wheel="onWheel"
      >
        <g :transform="`translate(${view.tx},${view.ty}) scale(${view.k})`">
          <!-- 背景：平面圖片或外框 -->
          <image v-if="props.backgroundSrc" :href="props.backgroundSrc" x="0" y="0" :width="props.planWidth" :height="props.planHeight" preserveAspectRatio="none" />
          <rect
            v-else
            x="0"
            y="0"
            :width="props.planWidth"
            :height="props.planHeight"
            :style="{ fill: role('surface-primary'), stroke: role('stroke-default') }"
            vector-effect="non-scaling-stroke"
          />
          <!-- 區域 -->
          <g v-for="z in props.zones" :key="z.id">
            <rect
              :x="z.x"
              :y="z.y"
              :width="z.w"
              :height="z.h"
              :rx="0.4"
              :style="{ fill: z.color ?? role('surface-tertiary'), stroke: role('stroke-default'), strokeDasharray: '4 3' }"
              vector-effect="non-scaling-stroke"
            />
            <text v-if="z.h * view.k >= 40" :x="z.x + 0.6" :y="z.y + 12 / view.k" :font-size="11 / view.k" font-weight="600" :style="{ fill: role('content-secondary') }">{{ z.label }}</text>
          </g>
          <!-- 機台 -->
          <g
            v-for="item in props.items"
            :key="item.id"
            :ref="(el) => setItemEl(item.id, el as SVGGElement | null)"
            role="button"
            :tabindex="item.id === tabStop ? 0 : -1"
            :aria-label="itemLabel(item)"
            :aria-pressed="item.id === selectedId"
            class="cursor-pointer outline-none"
            :style="{ opacity: dimmed(item) ? 0.25 : 1 }"
            @pointerdown.stop
            @click="select(item)"
            @focus="onItemFocus($event, item)"
            @blur="keyboardFocus = null"
            @keydown="onItemKeydown($event, item)"
          >
            <!-- 停機：外圈閃動（減少動態效果時不閃） -->
            <rect
              v-if="item.status === 'down'"
              :x="item.x - 0.5"
              :y="item.y - 0.5"
              :width="w(item) + 1"
              :height="h(item) + 1"
              rx="0.8"
              fill="none"
              :style="{ stroke: EQUIPMENT_STATUS_COLOR.down }"
              stroke-width="3"
              vector-effect="non-scaling-stroke"
              class="motion-safe:animate-pulse"
            />
            <rect
              :x="item.x"
              :y="item.y"
              :width="w(item)"
              :height="h(item)"
              rx="0.5"
              :style="{ fill: `color-mix(in srgb, ${EQUIPMENT_STATUS_COLOR[item.status]} 22%, ${role('surface-primary')})`, stroke: EQUIPMENT_STATUS_COLOR[item.status] }"
              :stroke-width="item.id === selectedId ? 3 : 1.5"
              vector-effect="non-scaling-stroke"
            />
            <circle :cx="item.x + 0.7" :cy="item.y + 0.7" :r="0.35" :style="{ fill: EQUIPMENT_STATUS_COLOR[item.status] }" />
            <text
              :x="item.x + w(item) / 2"
              :y="item.y + h(item) / 2"
              dy="0.35em"
              text-anchor="middle"
              :font-size="Math.min(11 / view.k, h(item) * 0.42)"
              font-weight="600"
              :style="{ fill: role('content-primary') }"
              pointer-events="none"
            >{{ fitLabel(item) }}</text>
            <rect
              v-if="keyboardFocus === item.id"
              :x="item.x - 0.8"
              :y="item.y - 0.8"
              :width="w(item) + 1.6"
              :height="h(item) + 1.6"
              rx="1"
              fill="none"
              :style="{ stroke: role('stroke-focus') }"
              stroke-width="2"
              vector-effect="non-scaling-stroke"
            />
          </g>
        </g>
      </svg>

      <!-- 縮放按鈕 -->
      <div class="absolute bottom-2 right-2 flex flex-col overflow-hidden rounded-md border border-stroke-default bg-surface-primary shadow-sm">
        <button type="button" class="flex h-8 w-8 items-center justify-center text-content-secondary hover:bg-surface-tertiary" :aria-label="t.floorPlan.zoomIn" @click="zoomBy(1.4)">
          <span class="material-symbols-outlined text-lg" aria-hidden="true">add</span>
        </button>
        <button type="button" class="flex h-8 w-8 items-center justify-center border-y border-stroke-light text-content-secondary hover:bg-surface-tertiary" :aria-label="t.floorPlan.zoomOut" @click="zoomBy(1 / 1.4)">
          <span class="material-symbols-outlined text-lg" aria-hidden="true">remove</span>
        </button>
        <button type="button" class="flex h-8 w-8 items-center justify-center text-content-secondary hover:bg-surface-tertiary" :aria-label="t.floorPlan.fit" @click="fit">
          <span class="material-symbols-outlined text-lg" aria-hidden="true">fit_screen</span>
        </button>
      </div>

      <!-- 選取的機台：明細卡 -->
      <div
        v-if="selected"
        class="absolute left-2 top-2 w-64 max-w-[calc(100%-4rem)] rounded-md border border-stroke-light bg-surface-primary p-3 text-sm shadow-lg"
        role="dialog"
        :aria-label="selected.name"
      >
        <div class="mb-1 flex items-start justify-between gap-2">
          <span class="font-semibold text-content-primary">{{ selected.name }}</span>
          <button type="button" class="rounded p-0.5 text-content-tertiary hover:bg-surface-tertiary" :aria-label="t.floorPlan.close" @click="clearSelection">
            <span class="material-symbols-outlined text-base" aria-hidden="true">close</span>
          </button>
        </div>
        <slot name="detail" :item="selected">
          <div class="flex items-center gap-1.5 text-xs text-content-secondary">
            <span class="material-symbols-outlined text-sm" :style="{ color: EQUIPMENT_STATUS_COLOR[selected.status] }" aria-hidden="true">{{ EQUIPMENT_STATUS_ICON[selected.status] }}</span>
            {{ t.equipment.status[selected.status] }}<template v-if="sinceText(selected)"> · {{ sinceText(selected) }}</template>
          </div>
          <p v-if="selected.alarm" class="mt-1 text-xs font-medium" :class="selected.status === 'down' ? 'text-danger' : 'text-content-secondary'">{{ selected.alarm }}</p>
          <p v-if="selected.workOrder || selected.product" class="mt-1 text-xs text-content-tertiary">{{ [selected.workOrder, selected.product].filter(Boolean).join(' · ') }}</p>
          <p v-if="typeof selected.utilization === 'number'" class="mt-1 text-xs text-content-secondary">{{ t.equipment.utilization }} {{ Math.round(selected.utilization) }}%</p>
        </slot>
      </div>
    </div>

    <!-- 圖例：各狀態數量；點了只突顯該狀態 -->
    <div v-if="props.showLegend" class="flex flex-wrap items-center gap-1.5" role="group" :aria-label="t.equipment.filterLabel">
      <button
        v-for="s in EQUIPMENT_STATUSES"
        :key="s"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors"
        :class="focusStatuses.includes(s) ? 'border-stroke-focus bg-accent-subtle text-accent-on-subtle' : 'border-stroke-default bg-surface-primary text-content-secondary hover:bg-surface-tertiary'"
        :aria-pressed="focusStatuses.includes(s)"
        @click="toggleStatus(s)"
      >
        <span class="material-symbols-outlined text-sm" :style="{ color: EQUIPMENT_STATUS_COLOR[s] }" aria-hidden="true">{{ EQUIPMENT_STATUS_ICON[s] }}</span>
        {{ t.equipment.status[s] }}
        <span class="font-semibold tabular-nums text-content-primary">{{ counts[s] }}</span>
      </button>
      <span :id="`${uid}-hint`" class="ml-auto text-xs text-content-tertiary">{{ t.floorPlan.hint }}</span>
    </div>
    <span v-else :id="`${uid}-hint`" class="sr-only">{{ t.floorPlan.hint }}</span>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { useLocale } from '../shared/config'
import {
  EQUIPMENT_STATUSES,
  EQUIPMENT_STATUS_COLOR,
  EQUIPMENT_STATUS_ICON,
  countEquipment,
  durationParts,
  neighborIndex,
  toTime,
  type EquipmentStatus,
} from '../shared/equipment'
import {
  DEFAULT_ITEM_SIZE,
  centerOn,
  clampPan,
  fitTransform,
  isVisible,
  zoomAt,
  type FloorPlanItem,
  type FloorZone,
  type ViewTransform,
} from '../shared/floorPlan'

/**
 * ChptFloorPlan（CHPT 主題） - 廠區配置圖
 *
 * 用途：把機台畫在廠區平面圖上 —— 一眼看出停機的在哪一區、哪幾台擠在一起出問題。
 * 狀態資料與 ChptEquipmentWall 相同（EquipmentItem 加上 x / y 位置），同一份資料可以兩種方式看。
 *   - 平面圖：背景圖片（backgroundSrc）或區域（zones），座標用自己的單位（公尺、格）
 *   - 機台：狀態色（顏色 + 圖示 + 文字）；停機的外圈閃動（減少動態效果時不閃）
 *   - 縮放：Ctrl + 滾輪、兩指縮放、右下角按鈕；拖曳平移；重設回整張
 *   - 點機台看明細卡（detail 插槽可自訂）；圖例的狀態可點選只突顯該狀態
 *   - 鍵盤：Tab 進入後方向鍵依位置移到最近的機台（移到畫面外時自動平移）、Enter 開明細、Esc 關閉、+ / − / 0 縮放
 */

interface ChptFloorPlanProps {
  items: FloorPlanItem[]
  /** 平面圖的寬、高（自己的單位） */
  planWidth: number
  planHeight: number
  zones?: FloorZone[]
  /** 背景圖片（平面圖、CAD 匯出的圖） */
  backgroundSrc?: string
  /** 高度（px） */
  height?: number
  minZoom?: number
  maxZoom?: number
  showLegend?: boolean
  /** 計算持續時間用的現在時間；不給時每 30 秒更新 */
  now?: number | Date | null
  label?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptFloorPlanProps>(), {
  zones: () => [],
  backgroundSrc: '',
  height: 420,
  minZoom: 0.5,
  maxZoom: 8,
  showLegend: true,
  now: null,
  label: '',
})

const emit = defineEmits<{
  (e: 'item-click', item: FloorPlanItem): void
}>()

const uid = useId()
const role = (name: string) => `rgb(var(--t-${name}))`
const w = (i: FloorPlanItem) => i.w ?? DEFAULT_ITEM_SIZE.w
const h = (i: FloorPlanItem) => i.h ?? DEFAULT_ITEM_SIZE.h

// ---- 畫面大小與縮放 ----
const frame = useTemplateRef<HTMLDivElement>('frame')
const size = ref({ w: 600, h: props.height })
const base = computed(() => fitTransform(props.planWidth, props.planHeight, size.value.w, size.value.h))
/** 使用者的縮放 / 平移；null 為「整張放進畫面」（畫面大小改變時跟著重算） */
const userView = shallowRef<ViewTransform | null>(null)
const view = computed(() => userView.value ?? base.value)
/**
 * 框的高度：不超過 height，也不超過「平面圖照寬度縮放後的高度」——
 * 手機上寬的平面圖不會在 420px 高的框裡縮成中間一小條
 */
const frameHeight = computed(() => Math.max(160, Math.min(props.height, Math.round((size.value.w * props.planHeight) / props.planWidth) + 32)))
const minK = computed(() => base.value.k * props.minZoom)
const maxK = computed(() => base.value.k * props.maxZoom)
let observer: ResizeObserver | null = null
function measure(): void {
  const el = frame.value
  if (!el) return
  const width = el.clientWidth || 600
  size.value = { w: width, h: el.clientHeight || props.height }
}
onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && frame.value) {
    observer = new ResizeObserver(() => measure())
    observer.observe(frame.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())

function setView(v: ViewTransform): void {
  userView.value = clampPan(v, props.planWidth, props.planHeight, size.value.w, size.value.h)
}
function zoomBy(factor: number, cx = size.value.w / 2, cy = size.value.h / 2): void {
  setView(zoomAt(view.value, factor, cx, cy, minK.value, maxK.value))
}
function fit(): void {
  userView.value = null
}

// ---- 拖曳平移、兩指縮放、Ctrl + 滾輪 ----
const pointers = new Map<number, { x: number; y: number }>()
const dragging = ref(false)
let pinchDist = 0
function local(e: { clientX: number; clientY: number }) {
  const r = frame.value!.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}
function onPointerDown(e: PointerEvent): void {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  pointers.set(e.pointerId, local(e))
  dragging.value = true
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
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    if (pinchDist > 0) zoomBy(d / pinchDist, (a.x + b.x) / 2, (a.y + b.y) / 2)
    pinchDist = d
    return
  }
  const v = view.value
  setView({ k: v.k, tx: v.tx + p.x - prev.x, ty: v.ty + p.y - prev.y })
}
function onPointerUp(e: PointerEvent): void {
  pointers.delete(e.pointerId)
  if (pointers.size < 2) pinchDist = 0
  if (!pointers.size) dragging.value = false
}
function onWheel(e: WheelEvent): void {
  // 不按 Ctrl 時讓頁面照常捲動（不攔截滾輪）
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  const p = local(e)
  zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y)
}

// ---- 名稱放不下時：先只留第一段（「SMT-05 印刷機」→「SMT-05」），還放不下就截斷；放大後就看得到全名 ----
/** 估計文字寬度（px，字級 11）：寬字元約 11px、其他約 6.5px */
const textWidth = (s: string) => [...s].reduce((sum, ch) => sum + (ch.charCodeAt(0) > 255 ? 11 : 6.5), 0)
function fitLabel(item: FloorPlanItem): string {
  const room = w(item) * view.value.k - 6
  if (textWidth(item.name) <= room) return item.name
  const short = item.name.split(/\s+/)[0]
  if (textWidth(short) <= room) return short
  let out = ''
  for (const ch of short) {
    if (textWidth(`${out}${ch}…`) > room) break
    out += ch
  }
  return out ? `${out}…` : ''
}

// ---- 狀態、篩選 ----
const counts = computed(() => countEquipment(props.items))
const focusStatuses = ref<EquipmentStatus[]>([])
function toggleStatus(s: EquipmentStatus): void {
  focusStatuses.value = focusStatuses.value.includes(s) ? focusStatuses.value.filter((x) => x !== s) : [...focusStatuses.value, s]
}
const dimmed = (item: FloorPlanItem) => focusStatuses.value.length > 0 && !focusStatuses.value.includes(item.status)

const clock = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  if (props.now === null) timer = setInterval(() => (clock.value = Date.now()), 30_000)
})
onBeforeUnmount(() => timer && clearInterval(timer))
const nowMs = computed(() => (props.now === null ? clock.value : props.now instanceof Date ? props.now.getTime() : props.now))
function sinceText(item: FloorPlanItem): string {
  const start = toTime(item.since)
  const p = start === null ? null : durationParts(nowMs.value - start)
  return p ? t.value.equipment.since(t.value.equipment.status[item.status], t.value.equipment.duration(p.d, p.h, p.m)) : ''
}
function itemLabel(item: FloorPlanItem): string {
  return [item.name, t.value.equipment.status[item.status], sinceText(item), item.alarm ?? ''].filter(Boolean).join(', ')
}

// ---- 選取 ----
const selectedId = ref<string | null>(null)
const selected = computed(() => props.items.find((i) => i.id === selectedId.value) ?? null)
function select(item: FloorPlanItem): void {
  selectedId.value = item.id
  emit('item-click', item)
}
function clearSelection(): void {
  const id = selectedId.value
  selectedId.value = null
  if (id) void nextTick(() => itemEls.get(id)?.focus())
}

// ---- 鍵盤 ----
const itemEls = new Map<string, SVGGElement>()
function setItemEl(id: string, el: SVGGElement | null): void {
  if (el) itemEls.set(id, el)
  else itemEls.delete(id)
}
const activeId = ref<string | null>(null)
const tabStop = computed(() => (activeId.value && props.items.some((i) => i.id === activeId.value) ? activeId.value : props.items[0]?.id ?? null))
const keyboardFocus = ref<string | null>(null)
const announcement = ref('')
watch(
  () => props.items.map((i) => i.id).join(','),
  () => {
    if (selectedId.value && !selected.value) selectedId.value = null
  }
)
function onItemFocus(e: FocusEvent, item: FloorPlanItem): void {
  activeId.value = item.id
  keyboardFocus.value = (e.currentTarget as Element).matches?.(':focus-visible') ? item.id : null
}
function onItemKeydown(e: KeyboardEvent, item: FloorPlanItem): void {
  const dirs: Record<string, 'left' | 'right' | 'up' | 'down'> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }
  if (dirs[e.key]) {
    e.preventDefault()
    // 依平面上的位置找鄰居：左右是同一列最近的，上下是上一列 / 下一列水平最近的
    const ordered = [...props.items].sort((a, b) => a.y - b.y || a.x - b.x)
    const rects = ordered.map((i) => ({ left: i.x, top: i.y, width: w(i), height: h(i) }))
    const idx = ordered.indexOf(item)
    let nextIdx = idx
    if (dirs[e.key] === 'left' || dirs[e.key] === 'right') {
      const row = ordered.filter((i) => Math.abs(i.y + h(i) / 2 - (item.y + h(item) / 2)) < h(item) / 2)
      const sorted = row.sort((a, b) => a.x - b.x)
      const at = sorted.indexOf(item)
      const n = sorted[at + (dirs[e.key] === 'right' ? 1 : -1)]
      nextIdx = n ? ordered.indexOf(n) : idx
    } else nextIdx = neighborIndex(rects, idx, dirs[e.key])
    const next = ordered[nextIdx]
    if (next === item) return
    activeId.value = next.id
    if (!isVisible(view.value, next, size.value.w, size.value.h)) setView(centerOn(view.value, next, size.value.w, size.value.h))
    announcement.value = itemLabel(next)
    void nextTick(() => itemEls.get(next.id)?.focus())
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    select(item)
  } else if (e.key === 'Escape' && selectedId.value) {
    e.preventDefault()
    clearSelection()
  } else if (e.key === '+' || e.key === '=') zoomBy(1.4)
  else if (e.key === '-') zoomBy(1 / 1.4)
  else if (e.key === '0') fit()
}

defineExpose({
  /** 回到整張平面圖 */
  fit,
  /** 選取（並聚焦）某一台；null 關閉明細 */
  select: (id: string | null) => {
    const item = props.items.find((i) => i.id === id)
    if (item) {
      select(item)
      void nextTick(() => itemEls.get(item.id)?.focus())
    } else clearSelection()
  },
})
</script>
