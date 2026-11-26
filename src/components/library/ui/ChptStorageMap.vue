<template>
  <div class="storage-map flex flex-col gap-3" @keydown.esc="cancelMove()">
    <!-- 工具列 -->
    <div class="flex flex-wrap items-center gap-2 text-sm">
      <h3 v-if="props.title" class="text-base font-semibold text-content-primary">{{ props.title }}</h3>
      <form role="search" class="flex min-w-0 flex-1 basis-56 items-center gap-1.5" @submit.prevent="locate(query)">
        <label class="relative min-w-0 flex-1">
          <span class="sr-only">{{ t.storage.search }}</span>
          <span class="material-symbols-outlined pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-lg text-content-tertiary" aria-hidden="true">search</span>
          <input
            v-model="query"
            type="search"
            :placeholder="t.storage.searchPlaceholder"
            class="h-control-sm w-full rounded-md border border-stroke-default bg-surface-primary pl-8 pr-2 text-sm text-content-primary placeholder:text-content-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          />
        </label>
        <template v-if="query.trim()">
          <span class="whitespace-nowrap tabular-nums text-content-secondary" aria-live="polite">{{ t.storage.found(hitList.length) }}</span>
          <ChptButton size="xs" is-outline icon="chevron_left" :disabled="hitList.length < 2" :aria-label="t.storage.prevHit" @click="stepHit(-1)" />
          <ChptButton size="xs" is-outline icon="chevron_right" :disabled="hitList.length < 2" :aria-label="t.storage.nextHit" @click="stepHit(1)" />
        </template>
      </form>
      <div class="inline-flex overflow-hidden rounded-md border border-stroke-default" role="group" :aria-label="t.storage.colorBy">
        <button
          v-for="m in modes"
          :key="m"
          type="button"
          class="px-2.5 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus"
          :class="colorMode === m ? 'bg-accent-solid text-white' : 'bg-surface-primary text-content-secondary hover:bg-surface-secondary'"
          :aria-pressed="colorMode === m"
          @click="setMode(m)"
        >
          {{ t.storage.modes[m] }}
        </button>
      </div>
    </div>

    <!-- 摘要與圖例 -->
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-content-secondary">
      <span class="tabular-nums">{{ t.storage.used(summary.used, summary.bins) }}</span>
      <span v-if="summary.ratio !== null" class="tabular-nums">{{ t.storage.utilization(pct(summary.ratio)) }}</span>
      <span v-if="summary.expired" class="font-medium tabular-nums" :style="{ color: role('danger-solid') }">{{ t.storage.expiredCount(summary.expired) }}</span>
      <span v-if="summary.soon" class="font-medium tabular-nums" :style="{ color: role('warning-solid') }">{{ t.storage.soonCount(summary.soon, props.warnDays) }}</span>
      <span v-if="summary.blocked" class="tabular-nums">{{ t.storage.blockedCount(summary.blocked) }}</span>
      <span class="ml-auto flex flex-wrap items-center gap-x-2.5 gap-y-1" :aria-label="t.storage.legend">
        <span v-for="l in legend" :key="l.label" class="inline-flex items-center gap-1">
          <span class="inline-block h-3 w-3 rounded-sm border border-stroke-default" :style="{ background: l.color }" aria-hidden="true"></span>{{ l.label }}
        </span>
      </span>
    </div>

    <div v-if="moving" class="flex flex-wrap items-center gap-2 rounded-md bg-accent-subtle px-3 py-2 text-sm text-content-primary" role="status">
      <span class="material-symbols-outlined text-lg" aria-hidden="true">move_item</span>
      <span class="flex-1">{{ t.storage.pickTarget(movingLabel) }}</span>
      <ChptButton size="xs" is-outline icon="close" @click="cancelMove()">{{ t.storage.cancel }}</ChptButton>
    </div>
    <p v-if="notice" class="rounded-md bg-warning-subtle px-3 py-2 text-sm text-warning-on-subtle" role="alert">{{ notice }}</p>

    <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
      <!-- 儲位圖 -->
      <div class="flex min-w-0 flex-1 flex-col gap-4">
        <section v-for="z in layout" :key="z.zone" :aria-label="z.zone">
          <h4 class="mb-2 text-sm font-semibold text-content-secondary">{{ z.zone }}</h4>
          <div class="flex flex-wrap gap-4">
            <figure v-for="r in z.racks" :key="r.rack" class="max-w-full">
              <figcaption class="mb-1 text-xs font-medium text-content-primary">{{ r.rack }}</figcaption>
              <div class="overflow-x-auto pb-1">
                <div
                  class="grid gap-1"
                  role="grid"
                  :aria-label="r.rack"
                  :style="{ gridTemplateColumns: `1.5rem repeat(${r.positions.length}, minmax(2.75rem, 4rem))` }"
                >
                  <!-- 每一層包成 role="row"（display: contents，不影響 grid 排版）；原本 rowheader / gridcell 直接放在 grid 底下 -->
                  <div v-for="lv in r.levels" :key="lv" role="row" class="contents">
                    <span class="flex items-center justify-center text-[10px] tabular-nums text-content-tertiary" role="rowheader">{{ t.storage.levelShort(lv) }}</span>
                    <template v-for="pos in r.positions" :key="pos">
                      <button
                        v-if="r.cells.get(cellKey(lv, pos))"
                        type="button"
                        role="gridcell"
                        class="relative flex h-10 min-w-0 flex-col items-center justify-center overflow-hidden rounded border text-[11px] leading-tight transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                        :data-bin="r.cells.get(cellKey(lv, pos))!.id"
                        :style="cellStyle(r.cells.get(cellKey(lv, pos))!)"
                        :aria-label="cellLabel(r.cells.get(cellKey(lv, pos))!)"
                        :aria-selected="selectedId === r.cells.get(cellKey(lv, pos))!.id"
                        :draggable="canDragBin(r.cells.get(cellKey(lv, pos))!)"
                        @click="onCellClick(r.cells.get(cellKey(lv, pos))!)"
                        @keydown="onCellKey($event, r, lv, pos)"
                        @dragstart="onBinDragStart($event, r.cells.get(cellKey(lv, pos))!)"
                        @dragover="onDragOver($event, r.cells.get(cellKey(lv, pos))!)"
                        @dragleave="dropTarget = null"
                        @drop="onDrop($event, r.cells.get(cellKey(lv, pos))!)"
                        @dragend="endDrag()"
                      >
                        <span v-if="colorMode === 'utilization'" class="absolute inset-x-0 bottom-0" :style="fillStyle(r.cells.get(cellKey(lv, pos))!)" aria-hidden="true"></span>
                        <span class="relative max-w-full truncate px-0.5 font-medium tabular-nums">{{ cellText(r.cells.get(cellKey(lv, pos))!) }}</span>
                        <span
                          v-if="colorMode !== 'expiry' && ['soon', 'expired'].includes(stateOf(r.cells.get(cellKey(lv, pos))!).expiry)"
                          class="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full"
                          :style="{ background: role(stateOf(r.cells.get(cellKey(lv, pos))!).expiry === 'expired' ? 'danger-solid' : 'warning-solid') }"
                          aria-hidden="true"
                        ></span>
                      </button>
                      <span v-else class="h-10" role="gridcell" aria-hidden="true"></span>
                    </template>
                  </div>
                  <span aria-hidden="true"></span>
                  <span v-for="pos in r.positions" :key="`p${pos}`" class="text-center text-[10px] tabular-nums text-content-tertiary" aria-hidden="true">{{ pos }}</span>
                </div>
              </div>
            </figure>
          </div>
        </section>
        <p v-if="!layout.length" class="py-6 text-center text-sm text-content-tertiary">{{ t.storage.noBins }}</p>
      </div>

      <!-- 儲位明細 -->
      <aside class="flex flex-col gap-2 rounded-lg border border-stroke-light bg-surface-primary p-3 text-sm lg:sticky lg:top-4 lg:w-72" :aria-label="t.storage.detail">
        <template v-if="selectedBin">
          <div class="flex items-start gap-2">
            <div class="min-w-0 flex-1">
              <strong class="block font-mono text-base text-content-primary">{{ selectedBin.id }}</strong>
              <span class="block text-xs text-content-secondary">{{ t.storage.where(selectedBin.zone, selectedBin.rack, selectedBin.level, selectedBin.position) }}</span>
            </div>
            <span v-if="selectedBin.blocked" class="rounded-full bg-surface-tertiary px-2 py-0.5 text-xs text-content-secondary">{{ t.storage.blocked }}</span>
          </div>
          <div v-if="selectedBin.capacity" class="flex flex-col gap-1">
            <span class="flex justify-between text-xs text-content-secondary">
              <span>{{ t.storage.capacity }}</span>
              <span class="tabular-nums">{{ t.storage.capacityUsage(fmt(selectedState!.qty), fmt(selectedBin.capacity), pct(selectedState!.ratio!)) }}</span>
            </span>
            <span class="h-1.5 overflow-hidden rounded-full bg-surface-tertiary">
              <span class="block h-full rounded-full" :style="{ width: `${Math.min(100, selectedState!.ratio! * 100)}%`, background: ratioBarColor(selectedState!.ratio!) }"></span>
            </span>
          </div>
          <ul v-if="selectedStocks.length" class="flex flex-col divide-y divide-stroke-light">
            <li
              v-for="s in selectedStocks"
              :key="s.id"
              class="flex flex-wrap items-center gap-x-2 gap-y-0.5 py-2"
              :draggable="!props.readonly"
              @dragstart="onStockDragStart($event, [s.id])"
              @dragend="endDrag()"
            >
              <span v-if="!props.readonly" class="material-symbols-outlined cursor-grab text-base text-content-tertiary" aria-hidden="true">drag_indicator</span>
              <span class="inline-block h-2.5 w-2.5 rounded-full" :style="{ background: itemColor(s.item) }" aria-hidden="true"></span>
              <strong class="font-mono text-content-primary">{{ s.item }}</strong>
              <span class="ml-auto tabular-nums text-content-primary">{{ fmt(s.qty) }}<span v-if="s.unit" class="ml-1 text-xs text-content-secondary">{{ s.unit }}</span></span>
              <span v-if="s.name" class="basis-full truncate text-xs text-content-secondary">{{ s.name }}</span>
              <span v-if="s.lot" class="text-xs text-content-tertiary">{{ t.storage.lot(s.lot) }}</span>
              <span v-if="expiryOf(s) !== 'none'" class="rounded px-1.5 text-xs" :class="expiryBadgeClass(s)">{{ expiryText(s) }}</span>
              <ChptButton v-if="!props.readonly" class="ml-auto" size="xs" is-outline icon="move_item" :aria-label="t.storage.moveOne(s.item)" @click="startMove([s.id])">{{ t.storage.move }}</ChptButton>
            </li>
          </ul>
          <p v-else class="text-content-tertiary">{{ t.storage.emptyBin }}</p>
          <ChptButton v-if="!props.readonly && selectedStocks.length > 1" size="xs" is-outline icon="move_item" @click="startMove(selectedStocks.map((s) => s.id))">{{ t.storage.moveAll }}</ChptButton>
        </template>
        <p v-else class="text-content-tertiary">{{ t.storage.pickBin }}</p>
      </aside>
    </div>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * ChptStorageMap 儲位圖 —— 區 → 料架 → 層 → 格。依使用率、料號或效期上色；搜尋料號 / 批號 / 儲位定位；
 * 拖曳（或按「移動」再點目的儲位）移庫，檢查停用與容量；快到期 / 已過期標示。
 */
import { computed, nextTick, ref, watch } from 'vue'
import ChptButton from './ChptButton.vue'
import { useLocale } from '../shared/config'
import { chartPalette } from '../charts/chartTheme'
import {
  binState,
  buildLayout,
  cellKey,
  checkMove,
  daysToExpiry,
  expiryStatus,
  moveStocks,
  searchBins,
  stocksByBin,
  storageSummary,
  type BinState,
  type MoveCheck,
  type RackLayout,
  type StorageBin,
  type StorageStock,
} from '../shared/storage'

export type StorageColorMode = 'utilization' | 'item' | 'expiry'

export interface StorageMoveEvent {
  /** 移動後的庫存 */
  stocks: StorageStock[]
  /** 原儲位（每筆庫存各自的） */
  from: string[]
  to: string
}

export interface ChptStorageMapProps {
  bins: StorageBin[]
  stocks?: StorageStock[]
  /** 上色方式：使用率、料號、效期 */
  mode?: StorageColorMode
  /** 選取的儲位 id */
  selected?: string | null
  /** 幾天內到期算「快到期」 */
  warnDays?: number
  /** 計算效期用的現在時間；不給時用 Date.now() */
  now?: number | Date | null
  /** 允許移入後超過容量 */
  allowOverCapacity?: boolean
  /** 只看（不能移庫） */
  readonly?: boolean
  /** 自訂料號顏色（料號 → CSS 顏色）；沒給的依序取類別色 */
  itemColors?: Record<string, string>
  title?: string
}

const t = useLocale()
const props = withDefaults(defineProps<ChptStorageMapProps>(), {
  stocks: () => [],
  mode: 'utilization',
  selected: null,
  warnDays: 30,
  now: null,
  allowOverCapacity: false,
  readonly: false,
  itemColors: () => ({}),
  title: '',
})

const emit = defineEmits<{
  (e: 'update:stocks', stocks: StorageStock[]): void
  (e: 'update:mode', mode: StorageColorMode): void
  (e: 'update:selected', id: string | null): void
  /** 移庫完成 */
  (e: 'move', detail: StorageMoveEvent): void
  /** 移庫被拒絕（停用、超過容量） */
  (e: 'move-reject', detail: { reason: Exclude<MoveCheck, 'ok' | 'same'>; to: string; stockIds: string[] }): void
}>()

const role = (name: string) => `rgb(var(--t-${name}))`
const fmt = (n: number) => n.toLocaleString()
const pct = (r: number) => `${Math.round(r * 100)}%`
const nowMs = computed(() => (props.now === null ? Date.now() : props.now instanceof Date ? props.now.getTime() : props.now))

// ---- 資料 ----
const layout = computed(() => buildLayout(props.bins))
const byBin = computed(() => stocksByBin(props.stocks))
const states = computed(() => {
  const map = new Map<string, BinState>()
  for (const b of props.bins) map.set(b.id, binState(b, byBin.value.get(b.id) ?? [], nowMs.value, props.warnDays))
  return map
})
const stateOf = (b: StorageBin) => states.value.get(b.id)!
const summary = computed(() => storageSummary(props.bins, props.stocks, nowMs.value, props.warnDays))

// ---- 上色 ----
const modes: StorageColorMode[] = ['utilization', 'item', 'expiry']
const localMode = ref<StorageColorMode>(props.mode)
watch(() => props.mode, (m) => (localMode.value = m))
const colorMode = computed(() => localMode.value)
function setMode(m: StorageColorMode): void {
  localMode.value = m
  emit('update:mode', m)
}

/** 料號 → 顏色：自訂優先，其他依數量多寡取前 8 個類別色，其餘為「其他」 */
const itemColorMap = computed(() => {
  const totals = new Map<string, number>()
  for (const s of props.stocks) totals.set(s.item, (totals.get(s.item) ?? 0) + s.qty)
  const ranked = [...totals.keys()].filter((k) => !props.itemColors[k]).sort((a, b) => totals.get(b)! - totals.get(a)! || a.localeCompare(b))
  const map = new Map<string, string>(Object.entries(props.itemColors))
  ranked.forEach((k, i) => map.set(k, chartPalette.categorical[i] ?? chartPalette.other))
  return { map, ranked, others: ranked.length > chartPalette.categorical.length }
})
const itemColor = (item: string) => itemColorMap.value.map.get(item) ?? chartPalette.other

const legend = computed(() => {
  const s = t.value.storage
  if (colorMode.value === 'utilization')
    return [
      { label: s.empty, color: role('surface-primary') },
      { label: s.filled, color: `color-mix(in srgb, ${role('accent-solid')} 28%, ${role('surface-primary')})` },
      { label: s.over, color: `color-mix(in srgb, ${role('danger-solid')} 35%, ${role('surface-primary')})` },
    ]
  if (colorMode.value === 'expiry')
    return [
      { label: s.expiryState.ok, color: role('success-subtle') },
      { label: s.expiryState.soon, color: role('warning-solid') },
      { label: s.expiryState.expired, color: role('danger-solid') },
    ]
  const { ranked, others } = itemColorMap.value
  const named = Object.keys(props.itemColors).filter((k) => props.stocks.some((x) => x.item === k))
  const shown = [...named, ...ranked.slice(0, chartPalette.categorical.length)]
  return [...shown.map((k) => ({ label: k, color: itemColor(k) })), ...(others ? [{ label: s.others, color: chartPalette.other }] : [])]
})

const ratioBarColor = (r: number) => (r > 1 ? role('danger-solid') : r >= 0.9 ? role('warning-solid') : role('accent-solid'))

function cellStyle(b: StorageBin): Record<string, string> {
  const st = stateOf(b)
  const style: Record<string, string> = { borderColor: role('stroke-default'), background: role('surface-primary'), color: role('content-primary') }
  if (b.blocked) {
    style.background = `repeating-linear-gradient(135deg, ${role('surface-tertiary')} 0 4px, ${role('surface-primary')} 4px 8px)`
    style.color = role('content-tertiary')
  } else if (st.qty > 0 || st.items.length) {
    if (colorMode.value === 'item') {
      const c = st.items.length > 1 ? chartPalette.other : itemColor(st.items[0])
      style.background = `color-mix(in srgb, ${c} 30%, ${role('surface-primary')})`
      style.borderColor = c
    } else if (colorMode.value === 'expiry') {
      const e = st.expiry
      if (e === 'expired') Object.assign(style, { background: role('danger-solid'), borderColor: role('danger-solid'), color: '#fff' })
      else if (e === 'soon') Object.assign(style, { background: role('warning-subtle'), borderColor: role('warning-solid'), color: role('warning-on-subtle') })
      else if (e === 'ok') Object.assign(style, { background: role('success-subtle'), borderColor: role('success-solid'), color: role('success-on-subtle') })
    } else if (st.ratio !== null && st.ratio > 1) {
      style.borderColor = role('danger-solid')
    }
  }
  const dim = (hits.value.size && !hits.value.has(b.id)) || (moving.value && !canDrop(b))
  if (dim) style.opacity = '0.35'
  const rings: string[] = []
  if (selectedId.value === b.id) rings.push(`0 0 0 2px ${role('content-primary')}`)
  else if (hits.value.has(b.id)) rings.push(`0 0 0 2px ${role('accent-solid')}`)
  if (dropTarget.value === b.id) rings.push(`0 0 0 3px ${role('success-solid')}`)
  if (rings.length) style.boxShadow = rings.join(', ')
  return style
}
function fillStyle(b: StorageBin): Record<string, string> {
  const st = stateOf(b)
  if (b.blocked || st.ratio === null || st.qty <= 0) return { display: 'none' }
  return { height: `${Math.min(100, st.ratio * 100)}%`, background: st.ratio > 1 ? `color-mix(in srgb, ${role('danger-solid')} 35%, transparent)` : `color-mix(in srgb, ${role('accent-solid')} 28%, transparent)` }
}
function cellText(b: StorageBin): string {
  const st = stateOf(b)
  if (b.blocked) return '—'
  if (!st.items.length) return ''
  if (colorMode.value === 'item') return st.items.length > 1 ? t.value.storage.mixed(st.items.length) : st.items[0]
  if (colorMode.value === 'expiry') {
    const d = soonestDays(b)
    return d === null ? '' : t.value.storage.daysShort(d)
  }
  return st.ratio === null ? fmt(st.qty) : pct(st.ratio)
}
function soonestDays(b: StorageBin): number | null {
  const ds = (byBin.value.get(b.id) ?? []).map((s) => daysToExpiry(s, nowMs.value)).filter((d): d is number => d !== null)
  return ds.length ? Math.min(...ds) : null
}
function cellLabel(b: StorageBin): string {
  const s = t.value.storage
  const st = stateOf(b)
  const parts = [b.id]
  if (b.blocked) parts.push(s.blocked)
  if (!st.items.length) parts.push(s.empty)
  else {
    parts.push(st.items.join(' / '))
    parts.push(st.ratio === null ? fmt(st.qty) : t.value.storage.utilization(pct(st.ratio)))
    if (st.expiry === 'expired' || st.expiry === 'soon') parts.push(s.expiryState[st.expiry])
  }
  return s.cellLabel(parts)
}

const expiryOf = (s: StorageStock) => expiryStatus(s, nowMs.value, props.warnDays)
function expiryText(s: StorageStock): string {
  const d = daysToExpiry(s, nowMs.value)!
  return expiryOf(s) === 'expired' ? t.value.storage.expiredAgo(-d) : t.value.storage.expiresIn(d)
}
const expiryBadgeClass = (s: StorageStock) =>
  ({ expired: 'bg-danger-subtle text-danger-on-subtle', soon: 'bg-warning-subtle text-warning-on-subtle', ok: 'bg-surface-tertiary text-content-secondary', none: '' })[expiryOf(s)]

// ---- 選取 ----
const localSelected = ref<string | null>(props.selected)
watch(() => props.selected, (v) => (localSelected.value = v))
const selectedId = computed(() => localSelected.value)
const selectedBin = computed(() => props.bins.find((b) => b.id === selectedId.value) ?? null)
const selectedStocks = computed(() => (selectedBin.value ? byBin.value.get(selectedBin.value.id) ?? [] : []))
const selectedState = computed(() => (selectedBin.value ? stateOf(selectedBin.value) : null))
function select(id: string | null): void {
  localSelected.value = id
  emit('update:selected', id)
}

// ---- 搜尋 ----
const query = ref('')
const hits = computed(() => searchBins(props.bins, props.stocks, query.value))
const hitList = computed(() => props.bins.filter((b) => hits.value.has(b.id)).map((b) => b.id))
const hitIndex = ref(0)
const announcement = ref('')
function focusBin(id: string): void {
  void nextTick(() => {
    const el = document.querySelector<HTMLElement>(`.storage-map [data-bin="${CSS.escape(id)}"]`)
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    el?.focus()
  })
}
/** 搜尋並選取第一個符合的儲位；回傳符合的儲位 id */
function locate(q: string): string[] {
  query.value = q
  const list = hitList.value
  hitIndex.value = 0
  announcement.value = t.value.storage.found(list.length)
  if (list.length) {
    select(list[0])
    focusBin(list[0])
  }
  return list
}
function stepHit(dir: 1 | -1): void {
  const list = hitList.value
  hitIndex.value = (hitIndex.value + dir + list.length) % list.length
  select(list[hitIndex.value])
  focusBin(list[hitIndex.value])
}

// ---- 移庫 ----
const moving = ref<string[] | null>(null)
const dropTarget = ref<string | null>(null)
const notice = ref('')
const movingLabel = computed(() => {
  const list = props.stocks.filter((s) => moving.value?.includes(s.id))
  return list.map((s) => s.item).join(' / ')
})
function startMove(ids: string[]): void {
  if (props.readonly || !ids.length) return
  moving.value = ids
  notice.value = ''
  announcement.value = t.value.storage.pickTarget(movingLabel.value)
}
function cancelMove(): void {
  moving.value = null
  dropTarget.value = null
}
const canDrop = (b: StorageBin) => !!moving.value && checkMove(props.bins, props.stocks, moving.value, b.id, props.allowOverCapacity) === 'ok'

function doMove(ids: string[], to: string): void {
  const res = checkMove(props.bins, props.stocks, ids, to, props.allowOverCapacity)
  cancelMove()
  if (res === 'same') return
  if (res !== 'ok') {
    notice.value = t.value.storage.reject[res](to)
    emit('move-reject', { reason: res, to, stockIds: ids })
    return
  }
  const from = props.stocks.filter((s) => ids.includes(s.id)).map((s) => s.bin)
  const next = moveStocks(props.stocks, ids, to)
  notice.value = ''
  emit('update:stocks', next)
  emit('move', { stocks: next.filter((s) => ids.includes(s.id)), from, to })
  announcement.value = t.value.storage.moved(to)
  select(to)
}

function onCellClick(b: StorageBin): void {
  if (moving.value) return doMove(moving.value, b.id)
  select(selectedId.value === b.id ? null : b.id)
}

// 拖曳
const DND_TYPE = 'application/x-chpt-storage'
let dragging: string[] | null = null
const canDragBin = (b: StorageBin) => !props.readonly && (byBin.value.get(b.id)?.length ?? 0) > 0
function onStockDragStart(e: DragEvent, ids: string[]): void {
  dragging = ids
  e.dataTransfer?.setData(DND_TYPE, JSON.stringify(ids))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onBinDragStart(e: DragEvent, b: StorageBin): void {
  if (!canDragBin(b)) return
  onStockDragStart(e, (byBin.value.get(b.id) ?? []).map((s) => s.id))
}
function onDragOver(e: DragEvent, b: StorageBin): void {
  if (!dragging) return
  e.preventDefault()
  dropTarget.value = b.id
}
function onDrop(e: DragEvent, b: StorageBin): void {
  e.preventDefault()
  const ids = dragging
  endDrag()
  if (ids) doMove(ids, b.id)
}
function endDrag(): void {
  dragging = null
  dropTarget.value = null
}

// ---- 鍵盤：方向鍵在同一個料架裡移動 ----
function onCellKey(e: KeyboardEvent, r: RackLayout, lv: number, pos: number): void {
  const step: Record<string, [number, number]> = { ArrowUp: [1, 0], ArrowDown: [-1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
  const d = step[e.key]
  if (!d) return
  e.preventDefault()
  let l = lv + d[0]
  let p = pos + d[1]
  while (r.levels.includes(l) && r.positions.includes(p)) {
    const b = r.cells.get(cellKey(l, p))
    if (b) return focusBin(b.id)
    l += d[0]
    p += d[1]
  }
}

defineExpose({ locate, select, startMove, cancelMove })
</script>
