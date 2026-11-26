<template>
  <div class="flex flex-col gap-3">
    <!-- 工具列：各狀態數量（也是篩選）、搜尋、平均稼動率 -->
    <div v-if="props.showToolbar" class="flex flex-wrap items-center gap-2">
      <div class="flex flex-wrap gap-1.5" role="group" :aria-label="t.equipment.filterLabel">
        <button
          v-for="s in EQUIPMENT_STATUSES"
          :key="s"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors"
          :class="statusFilter.includes(s) ? 'border-stroke-focus bg-accent-subtle text-accent-on-subtle' : 'border-stroke-default bg-surface-primary text-content-secondary hover:bg-surface-tertiary'"
          :aria-pressed="statusFilter.includes(s)"
          @click="toggleStatus(s)"
        >
          <span class="material-symbols-outlined text-sm" :style="{ color: STATUS_COLOR[s] }" aria-hidden="true">{{ STATUS_ICON[s] }}</span>
          {{ t.equipment.status[s] }}
          <span class="font-semibold tabular-nums text-content-primary">{{ counts[s] }}</span>
        </button>
      </div>
      <label v-if="props.searchable" class="relative ml-auto">
        <span class="sr-only">{{ t.equipment.search }}</span>
        <span class="material-symbols-outlined pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-base text-content-tertiary" aria-hidden="true">search</span>
        <input
          v-model="query"
          type="search"
          :placeholder="t.equipment.search"
          class="h-control-sm w-52 rounded-md border border-stroke-default bg-surface-primary pl-8 pr-2 text-sm text-content-primary outline-none placeholder:text-content-disabled focus:border-stroke-focus focus:ring-1 focus:ring-stroke-focus"
        />
      </label>
      <span v-if="avgUtil !== null" class="text-xs text-content-secondary" :class="props.searchable ? '' : 'ml-auto'">
        {{ t.equipment.avgUtilization }} <strong class="tabular-nums text-content-primary">{{ Math.round(avgUtil) }}%</strong>
      </span>
    </div>

    <p v-if="!visible.length" class="rounded-md border border-dashed border-stroke-default p-6 text-center text-sm text-content-tertiary">
      {{ t.equipment.empty }}
    </p>

    <section v-for="g in groups" :key="g.key ?? '__none__'" class="flex flex-col gap-2" :aria-label="g.label">
      <h3 v-if="showGroups" class="flex items-baseline gap-2 text-sm font-semibold text-content-primary">
        {{ g.label }}
        <span class="text-xs font-normal text-content-tertiary">{{ g.summary }}</span>
      </h3>
      <div class="grid gap-2" :style="{ gridTemplateColumns: `repeat(auto-fill, minmax(${props.minCardWidth}px, 1fr))` }">
        <component
          :is="clickable ? 'button' : 'div'"
          v-for="item in g.items"
          :key="item.id"
          :ref="(el: unknown) => setCardEl(item.id, el)"
          :type="clickable ? 'button' : undefined"
          :role="clickable ? undefined : 'group'"
          :tabindex="item.id === activeId ? 0 : -1"
          :aria-label="cardLabel(item)"
          class="equipment-card relative flex flex-col gap-1 overflow-hidden rounded-md border border-stroke-light bg-surface-primary text-left shadow-sm outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-stroke-focus"
          :class="[props.density === 'compact' ? 'p-2 pl-3' : 'p-3 pl-4', clickable ? 'cursor-pointer hover:shadow-md' : '']"
          :style="cardStyle(item)"
          :data-status="item.status"
          @focus="activeId = item.id"
          @keydown="onCardKeydown($event, item)"
          @click="clickable && emit('item-click', item)"
        >
          <!-- 左側狀態色條 -->
          <span class="absolute inset-y-0 left-0 w-1" :style="{ background: STATUS_COLOR[item.status] }" aria-hidden="true"></span>
          <div class="flex items-start justify-between gap-2">
            <!-- 名稱是最重要的資訊：換行而不截斷 -->
            <span class="min-w-0 break-words font-semibold leading-snug text-content-primary" :class="props.density === 'compact' ? 'text-sm' : 'text-base'">{{ item.name }}</span>
            <span class="inline-flex flex-shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-content-primary" :style="{ background: tint(item.status, 18) }">
              <span class="material-symbols-outlined text-sm" :style="{ color: STATUS_COLOR[item.status] }" aria-hidden="true">{{ STATUS_ICON[item.status] }}</span>
              {{ t.equipment.status[item.status] }}
            </span>
          </div>
          <span v-if="sinceText(item)" class="text-xs tabular-nums text-content-secondary">{{ sinceText(item) }}</span>
          <span v-if="item.alarm" class="flex items-start gap-1 text-xs font-medium" :class="item.status === 'down' ? 'text-danger' : 'text-content-secondary'">
            <span class="material-symbols-outlined text-sm leading-4" aria-hidden="true">warning</span>
            <span class="min-w-0 break-words">{{ item.alarm }}</span>
          </span>
          <template v-if="props.density !== 'compact'">
            <span v-if="item.workOrder || item.product" class="truncate text-xs text-content-secondary">
              {{ [item.workOrder, item.product].filter(Boolean).join(' · ') }}
            </span>
            <div v-if="typeof item.utilization === 'number'" class="mt-0.5 flex items-center gap-2">
              <span class="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-tertiary" aria-hidden="true">
                <span class="block h-full rounded-full" :style="{ width: `${clampPct(item.utilization)}%`, background: STATUS_COLOR.run }"></span>
              </span>
              <span class="text-xs tabular-nums text-content-secondary">{{ Math.round(item.utilization) }}%</span>
            </div>
            <dl v-if="item.metrics?.length" class="mt-0.5 grid grid-cols-3 gap-1 text-xs">
              <div v-for="m in item.metrics.slice(0, 3)" :key="m.label" class="min-w-0">
                <dt class="truncate text-content-tertiary">{{ m.label }}</dt>
                <dd class="truncate font-medium tabular-nums text-content-primary">{{ m.value }}<span v-if="m.unit" class="ml-0.5 font-normal text-content-tertiary">{{ m.unit }}</span></dd>
              </div>
            </dl>
          </template>
          <slot name="extra" :item="item"></slot>
        </component>
      </div>
    </section>

    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useLocale } from '../shared/config'
import {
  EQUIPMENT_STATUSES,
  EQUIPMENT_STATUS_COLOR,
  EQUIPMENT_STATUS_ICON,
  averageUtilization,
  countEquipment,
  durationParts,
  filterEquipment,
  groupEquipment,
  neighborIndex,
  sortEquipment,
  toTime,
  type EquipmentItem,
  type EquipmentStatus,
} from '../shared/equipment'

/**
 * ChptEquipmentWall（CHPT 主題） - 機台狀態牆
 *
 * 用途：產線看板、值班畫面 —— 一眼看出哪幾台停了、停多久、為什麼。
 *   - 每台一張卡：狀態（顏色 + 圖示 + 文字，不只靠顏色）、已持續多久、警報原因、工單、稼動率、其他數值
 *   - 工具列：各狀態數量（點了就是篩選）、搜尋（名稱、編號、工單、料號）、平均稼動率
 *   - 依 group（產線、區域）分組；sortBy="status" 把停機的排前面
 *   - 狀態改變時卡片閃一下外框；變成停機時以 aria-live 念出（「SMT-03 停機：吸嘴異常」）
 *   - 鍵盤：整面牆一個 Tab 停駐點，方向鍵在卡片間移動（上下找視覺上的上一列 / 下一列），Home / End
 */

interface ChptEquipmentWallProps {
  items: EquipmentItem[]
  /** 依 group 分組顯示；不設定時有任何一台有 group 就分組 */
  groupBy?: boolean
  /** 排序：none 保持原順序、status 停機排前面、name 依名稱 */
  sortBy?: 'none' | 'status' | 'name'
  /** 卡片最小寬度（px），欄數依容器寬度自動決定 */
  minCardWidth?: number
  /** 密度：compact 只顯示名稱、狀態、時間與警報 */
  density?: 'comfortable' | 'compact'
  /** 顯示工具列（狀態篩選、搜尋、平均稼動率） */
  showToolbar?: boolean
  /** 可以搜尋 */
  searchable?: boolean
  /** 變成這些狀態時以 aria-live 念出 */
  announceStatuses?: EquipmentStatus[]
  /** 計算「已持續多久」用的現在時間；不給時元件每 30 秒自己更新 */
  now?: number | Date | null
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptEquipmentWallProps>(), {
  groupBy: undefined,
  sortBy: 'none',
  minCardWidth: 200,
  density: 'comfortable',
  showToolbar: true,
  searchable: true,
  announceStatuses: () => ['down'],
  now: null,
})

const emit = defineEmits<{
  /** 點擊（或 Enter）一台機台 */
  (e: 'item-click', item: EquipmentItem): void
}>()

/** 有綁 @item-click 時卡片是按鈕 */
const instance = getCurrentInstance()
const clickable = computed(() => !!instance?.vnode.props?.onItemClick)

// 狀態顏色與圖示與 ChptFloorPlan 共用（shared/equipment.ts）
const STATUS_COLOR = EQUIPMENT_STATUS_COLOR
const STATUS_ICON = EQUIPMENT_STATUS_ICON
const tint = (s: EquipmentStatus, pct: number) => `color-mix(in srgb, ${STATUS_COLOR[s]} ${pct}%, transparent)`
const clampPct = (v: number) => Math.min(100, Math.max(0, v))

// ---- 篩選、排序、分組 ----
const statusFilter = ref<EquipmentStatus[]>([])
const query = ref('')
function toggleStatus(s: EquipmentStatus): void {
  statusFilter.value = statusFilter.value.includes(s) ? statusFilter.value.filter((x) => x !== s) : [...statusFilter.value, s]
}
const counts = computed(() => countEquipment(props.items))
const avgUtil = computed(() => averageUtilization(props.items))
const visible = computed(() => sortEquipment(filterEquipment(props.items, statusFilter.value, query.value), props.sortBy))
const showGroups = computed(() => props.groupBy ?? props.items.some((it) => it.group))
const groups = computed(() => {
  const list = showGroups.value ? groupEquipment(visible.value) : visible.value.length ? [{ key: null, items: visible.value }] : []
  return list.map((g) => {
    const c = countEquipment(g.items)
    const summary = EQUIPMENT_STATUSES.filter((s) => c[s]).map((s) => `${t.value.equipment.status[s]} ${c[s]}`).join(' · ')
    return { ...g, label: g.key ?? t.value.equipment.ungrouped, summary }
  })
})
/** 畫面上的順序（跨組），鍵盤移動用 */
const flat = computed(() => groups.value.flatMap((g) => g.items))

// ---- 時間 ----
const clock = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  if (props.now === null) timer = setInterval(() => (clock.value = Date.now()), 30_000)
})
onBeforeUnmount(() => timer && clearInterval(timer))
const nowMs = computed(() => (props.now === null ? clock.value : props.now instanceof Date ? props.now.getTime() : props.now))

function sinceText(item: EquipmentItem): string {
  const start = toTime(item.since)
  if (start === null) return ''
  const p = durationParts(nowMs.value - start)
  if (!p) return ''
  return t.value.equipment.since(t.value.equipment.status[item.status], t.value.equipment.duration(p.d, p.h, p.m))
}

function cardLabel(item: EquipmentItem): string {
  const parts = [item.name, t.value.equipment.status[item.status]]
  const since = sinceText(item)
  if (since) parts.push(since)
  if (item.alarm) parts.push(item.alarm)
  if (item.workOrder) parts.push(`${t.value.equipment.workOrder} ${item.workOrder}`)
  if (typeof item.utilization === 'number') parts.push(`${t.value.equipment.utilization} ${Math.round(item.utilization)}%`)
  return parts.join(', ')
}

// ---- 狀態改變：閃一下外框、念出 ----
const flashing = ref(new Set<string>())
const announcement = ref('')
const flashTimers = new Map<string, ReturnType<typeof setTimeout>>()
let lastStatus = new Map(props.items.map((it) => [it.id, it.status]))
watch(
  () => props.items,
  (items) => {
    const changedToAnnounce: string[] = []
    for (const it of items) {
      const before = lastStatus.get(it.id)
      if (before === undefined || before === it.status) continue
      flashing.value = new Set(flashing.value).add(it.id)
      const old = flashTimers.get(it.id)
      if (old) clearTimeout(old)
      flashTimers.set(
        it.id,
        setTimeout(() => {
          const next = new Set(flashing.value)
          next.delete(it.id)
          flashing.value = next
          flashTimers.delete(it.id)
        }, 2500)
      )
      if (props.announceStatuses.includes(it.status)) changedToAnnounce.push(t.value.equipment.changed(it.name, t.value.equipment.status[it.status], it.alarm ?? ''))
    }
    if (changedToAnnounce.length) announcement.value = changedToAnnounce.join(t.value.equipment.separator)
    lastStatus = new Map(items.map((it) => [it.id, it.status]))
  },
  { deep: true }
)
onBeforeUnmount(() => flashTimers.forEach((tm) => clearTimeout(tm)))

function cardStyle(item: EquipmentItem): Record<string, string> {
  const style: Record<string, string> = {}
  // 停機的卡片整張帶一點紅：一整面牆裡最先被看到
  if (item.status === 'down') style.background = `color-mix(in srgb, ${STATUS_COLOR.down} 8%, rgb(var(--t-surface-primary)))`
  if (flashing.value.has(item.id)) style.boxShadow = `0 0 0 3px ${STATUS_COLOR[item.status]}`
  return style
}

// ---- 鍵盤：整面牆一個 Tab 停駐點（roving tabindex） ----
const cardEls = new Map<string, HTMLElement>()
function setCardEl(id: string, el: unknown): void {
  const node = (el as { $el?: HTMLElement } | null)?.$el ?? (el as HTMLElement | null)
  if (node) cardEls.set(id, node)
  else cardEls.delete(id)
}
const activeId = ref<string | null>(null)
// 目前的卡片被篩掉時，Tab 停駐點換到第一張
watch(
  flat,
  (list) => {
    if (!list.some((it) => it.id === activeId.value)) activeId.value = list[0]?.id ?? null
  },
  { immediate: true }
)

function onCardKeydown(event: KeyboardEvent, item: EquipmentItem): void {
  const dirs: Record<string, 'left' | 'right' | 'up' | 'down'> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }
  const list = flat.value
  const index = list.findIndex((it) => it.id === item.id)
  let next = index
  if (dirs[event.key]) {
    const rects = list.map((it) => cardEls.get(it.id)?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 })
    next = neighborIndex(rects, index, dirs[event.key])
  } else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = list.length - 1
  else return
  event.preventDefault()
  const target = list[next]
  activeId.value = target.id
  void nextTick(() => cardEls.get(target.id)?.focus())
}

defineExpose({
  /** 設定狀態篩選（空陣列為全部） */
  setStatusFilter: (statuses: EquipmentStatus[]) => (statusFilter.value = [...statuses]),
  /** 設定搜尋文字 */
  setQuery: (q: string) => (query.value = q),
})
</script>
