<template>
  <div class="bom-tree flex flex-col gap-3 text-sm">
    <!-- 工具列 -->
    <div class="flex flex-wrap items-center gap-2">
      <h3 v-if="props.title" class="text-base font-semibold text-content-primary">{{ props.title }}</h3>
      <label class="relative">
        <span class="sr-only">{{ t.bom.search }}</span>
        <span class="material-symbols-outlined pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-lg text-content-tertiary" aria-hidden="true">search</span>
        <input
          v-model="query"
          type="search"
          :placeholder="t.bom.search"
          class="h-control-sm w-52 rounded-md border border-stroke-default bg-surface-primary pl-8 pr-2 text-sm text-content-primary placeholder:text-content-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
        />
      </label>
      <label class="inline-flex items-center gap-1.5 text-content-secondary">
        {{ t.bom.buildQty }}
        <input
          type="number"
          inputmode="numeric"
          min="0"
          class="h-control-sm w-24 rounded-md border border-stroke-default bg-surface-primary px-2 text-right tabular-nums text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          :value="qty"
          @change="onQty(($event.target as HTMLInputElement).value)"
        />
      </label>
      <label v-if="hasStock" class="inline-flex cursor-pointer items-center gap-1.5 text-content-secondary">
        <input v-model="shortOnly" type="checkbox" class="h-4 w-4 accent-[rgb(var(--t-accent-solid))]" />
        {{ t.bom.shortOnly }}
      </label>
      <span class="ml-auto flex flex-wrap gap-1.5">
        <ChptButton size="xs" is-outline icon="unfold_more" @click="expandAll()">{{ t.bom.expandAll }}</ChptButton>
        <ChptButton size="xs" is-outline icon="unfold_less" @click="collapseAll()">{{ t.bom.collapseAll }}</ChptButton>
        <ChptButton size="xs" is-outline icon="download" @click="exportCsv()">{{ t.bom.exportCsv }}</ChptButton>
      </span>
    </div>

    <!-- 摘要 -->
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-secondary">
      <span class="tabular-nums">{{ t.bom.partCount(explosion.parts.length) }}</span>
      <template v-if="hasStock">
        <span class="font-medium tabular-nums" :style="{ color: shortParts.length ? role('danger-solid') : role('success-solid') }">
          {{ shortParts.length ? t.bom.shortCount(shortParts.length) : t.bom.noShortage }}
        </span>
        <span v-if="criticalShort" class="font-medium tabular-nums" :style="{ color: role('danger-solid') }">{{ t.bom.criticalShort(criticalShort) }}</span>
        <span v-if="props.netting" class="text-content-tertiary">{{ t.bom.nettingNote }}</span>
      </template>
      <template v-if="diff">
        <span class="tabular-nums" :style="{ color: role('success-solid') }">{{ t.bom.added(diffCount.added) }}</span>
        <span class="tabular-nums" :style="{ color: role('danger-solid') }">{{ t.bom.removed(diff.removed.length) }}</span>
        <span class="tabular-nums" :style="{ color: role('warning-solid') }">{{ t.bom.qtyChanged(diffCount.qty) }}</span>
      </template>
    </div>

    <!-- 反查 -->
    <div v-if="query.trim()" class="rounded-md border border-stroke-light bg-surface-secondary px-3 py-2 text-xs" aria-live="polite">
      <strong class="text-content-primary">{{ t.bom.found(hits.size) }}</strong>
      <ul v-if="used.length" class="mt-1 flex flex-col gap-0.5 text-content-secondary">
        <li v-for="u in used" :key="u.key" class="truncate">
          <span class="text-content-tertiary">{{ t.bom.usedIn }}</span>
          {{ u.path.slice(0, -1).map((p) => p.partNo).join(' › ') }}
          <span class="tabular-nums">{{ t.bom.perUnitShort(fmt(u.perUnit)) }}</span>
        </li>
      </ul>
    </div>

    <!-- 樹狀表格 -->
    <div class="overflow-auto rounded-lg border border-stroke-light" :style="{ maxHeight: props.maxHeight ? `${props.maxHeight}px` : undefined }">
      <table ref="tableRef" class="w-full whitespace-nowrap" role="treegrid" :aria-label="props.title || t.bom.title">
        <thead class="sticky top-0 z-10 bg-surface-secondary text-left text-xs text-content-secondary">
          <tr>
            <th scope="col" class="bg-surface-secondary px-3 py-2 font-medium">{{ t.bom.partNo }}</th>
            <th scope="col" class="bg-surface-secondary px-3 py-2 font-medium">{{ t.bom.name }}</th>
            <th v-if="props.showRef" scope="col" class="bg-surface-secondary px-3 py-2 font-medium">{{ t.bom.ref }}</th>
            <th scope="col" class="bg-surface-secondary px-3 py-2 text-right font-medium">{{ t.bom.qty }}</th>
            <th scope="col" class="bg-surface-secondary px-3 py-2 text-right font-medium">{{ t.bom.perUnit }}</th>
            <th scope="col" class="bg-surface-secondary px-3 py-2 text-right font-medium">{{ t.bom.required(fmt(qty)) }}</th>
            <th v-if="hasStock" scope="col" class="bg-surface-secondary px-3 py-2 text-right font-medium">{{ t.bom.stock }}</th>
            <th v-if="hasStock" scope="col" class="bg-surface-secondary px-3 py-2 text-right font-medium">{{ t.bom.shortage }}</th>
            <th v-if="diff" scope="col" class="bg-surface-secondary px-3 py-2 font-medium">{{ t.bom.change }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stroke-light">
          <tr
            v-for="(r, i) in visibleRows"
            :key="r.key + (r.removed ? '#removed' : '')"
            :data-row="i"
            :tabindex="i === focusIndex ? 0 : -1"
            :aria-level="r.level + 1"
            :aria-expanded="r.hasChildren ? expanded.has(r.key) : undefined"
            :aria-selected="hits.has(r.key) || undefined"
            class="focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus"
            :class="[
              r.removed ? 'bg-danger-subtle text-content-tertiary line-through' : hits.has(r.key) ? 'bg-accent-subtle' : 'bg-surface-primary',
              r.level === 0 ? 'font-semibold' : '',
            ]"
            @click="onRowClick(r, i)"
            @keydown="onKeydown($event, r, i)"
            @focus="focusIndex = i"
          >
            <td class="px-3 py-1.5 text-content-primary">
              <span class="inline-flex items-center gap-1" :style="{ paddingLeft: `${r.level * 18}px` }">
                <button
                  v-if="r.hasChildren && !r.removed"
                  type="button"
                  tabindex="-1"
                  class="flex h-5 w-5 items-center justify-center rounded text-content-secondary hover:bg-surface-tertiary"
                  :aria-label="expanded.has(r.key) ? t.bom.collapse(r.item.partNo) : t.bom.expand(r.item.partNo)"
                  @click.stop="toggle(r.key)"
                >
                  <span class="material-symbols-outlined text-base" aria-hidden="true">{{ expanded.has(r.key) ? 'expand_more' : 'chevron_right' }}</span>
                </button>
                <span v-else class="inline-block w-5" aria-hidden="true"></span>
                <span class="font-mono">{{ r.item.partNo }}</span>
                <span v-if="r.item.critical" class="material-symbols-outlined text-base" :style="{ color: role('warning-solid') }" :title="t.bom.critical" :aria-label="t.bom.critical">priority_high</span>
              </span>
            </td>
            <td class="max-w-52 truncate px-3 py-1.5 text-content-secondary" :title="r.item.name">{{ r.item.name ?? '' }}</td>
            <td v-if="props.showRef" class="max-w-28 truncate px-3 py-1.5 font-mono text-xs text-content-tertiary" :title="r.item.ref">{{ r.item.ref ?? '' }}</td>
            <td class="px-3 py-1.5 text-right tabular-nums">{{ r.level === 0 ? '' : `${fmt(r.item.qty)}${r.item.unit ? ` ${r.item.unit}` : ''}` }}</td>
            <td class="px-3 py-1.5 text-right tabular-nums">{{ r.level === 0 || r.removed ? '' : fmt(r.perUnit) }}</td>
            <td class="px-3 py-1.5 text-right tabular-nums">{{ r.removed ? '' : fmt(need(r)?.gross ?? 0) }}</td>
            <td v-if="hasStock" class="px-3 py-1.5 text-right tabular-nums text-content-secondary">{{ r.level === 0 || r.removed ? '' : fmt(props.stock![r.item.partNo] ?? 0) }}</td>
            <td v-if="hasStock" class="px-3 py-1.5 text-right tabular-nums">
              <template v-if="r.level > 0 && !r.removed">
                <span v-if="!r.hasChildren && (need(r)?.net ?? 0) > 0" class="font-semibold" :style="{ color: role('danger-solid') }">{{ fmt(need(r)!.net) }}</span>
                <span v-else-if="r.hasChildren && (need(r)?.fromStock ?? 0) > 0" class="text-xs text-content-tertiary">{{ t.bom.fromStock(fmt(need(r)!.fromStock)) }}</span>
              </template>
            </td>
            <td v-if="diff" class="px-3 py-1.5">
              <span v-if="changeOf(r) !== 'same'" class="rounded px-1.5 py-0.5 text-xs font-medium no-underline" :class="changeClass(changeOf(r))">
                {{ changeText(r) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ChptBomTree BOM 結構 —— 多階 BOM 的樹狀表格。
 * 用量逐階連乘（每台用量）、依生產數量算需求；給了庫存時算缺料（可扣抵半成品庫存），標出關鍵料；
 * 搜尋料號 / 品名 / 位置號並反查用在哪裡；給舊版次時標出新增、刪除、用量變更。
 */
import { computed, nextTick, ref, watch } from 'vue'
import ChptButton from './ChptButton.vue'
import { useLocale } from '../shared/config'
import { csvBlob, downloadBlob } from '../charts/utils/chartExport'
import {
  allBomKeys,
  ancestorKeys,
  bomKeyOf,
  diffBom,
  explodeBom,
  flattenBom,
  searchBom,
  whereUsed,
  type BomChange,
  type BomItem,
  type BomRow,
} from '../shared/bom'

export interface ChptBomTreeProps {
  /** 成品（根節點）與各階子件 */
  data: BomItem
  /** v-model:buildQty 生產數量 */
  buildQty?: number
  /** 料號 → 庫存；給了才顯示庫存與缺料 */
  stock?: Record<string, number> | null
  /** 扣抵半成品庫存（半成品有庫存時下階少用） */
  netting?: boolean
  /** 舊版次；給了就顯示差異 */
  compare?: BomItem | null
  /** 一開始展開幾階 */
  expandDepth?: number
  showRef?: boolean
  title?: string
  /** 表格最大高度（px） */
  maxHeight?: number | null
  /** 匯出檔名（不含副檔名） */
  filename?: string
}

const t = useLocale()
const props = withDefaults(defineProps<ChptBomTreeProps>(), {
  buildQty: 1,
  stock: null,
  netting: true,
  compare: null,
  expandDepth: 2,
  showRef: true,
  title: '',
  maxHeight: null,
  filename: 'bom',
})

const emit = defineEmits<{
  (e: 'update:buildQty', qty: number): void
  (e: 'row-click', item: BomItem, key: string): void
}>()

const role = (name: string) => `rgb(var(--t-${name}))`
const fmt = (n: number) => Number(n.toPrecision(10)).toLocaleString()

// ---- 數量與需求 ----
const localQty = ref(props.buildQty)
watch(
  () => props.buildQty,
  (v) => (localQty.value = v)
)
const qty = computed(() => localQty.value)
function onQty(raw: string): void {
  const n = Math.max(0, Math.round(Number(raw)) || 0)
  localQty.value = n
  emit('update:buildQty', n)
}
const hasStock = computed(() => props.stock !== null)
const explosion = computed(() => explodeBom(props.data, qty.value, props.stock ?? {}, hasStock.value && props.netting))
const need = (r: BomRow) => explosion.value.needs.get(r.key)
const shortParts = computed(() => explosion.value.parts.filter((p) => p.shortage > 0))
const criticalShort = computed(() => shortParts.value.filter((p) => p.critical).length)

// ---- 展開 ----
const expanded = ref(new Set(allBomKeys(props.data, props.expandDepth)))
watch(
  () => props.data,
  (d) => (expanded.value = new Set(allBomKeys(d, props.expandDepth)))
)
function toggle(key: string): void {
  const next = new Set(expanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = next
}
const expandAll = () => (expanded.value = new Set(allBomKeys(props.data)))
const collapseAll = () => (expanded.value = new Set())

// ---- 搜尋與反查 ----
const query = ref('')
const hits = computed(() => searchBom(props.data, query.value))
const used = computed(() => whereUsed(props.data, query.value))
watch(hits, (h) => {
  if (!h.size) return
  const next = new Set(expanded.value)
  for (const k of h) for (const a of ancestorKeys(k)) next.add(a)
  expanded.value = next
})

// ---- 版次差異 ----
const diff = computed(() => (props.compare ? diffBom(props.compare, props.data) : null))
const diffCount = computed(() => {
  const c = { added: 0, qty: 0 }
  for (const v of diff.value?.changes.values() ?? []) {
    if (v.status === 'added') c.added++
    else if (v.status === 'qty') c.qty++
  }
  return c
})
type ViewRow = BomRow & { removed?: boolean }
const changeOf = (r: ViewRow): BomChange => (r.removed ? 'removed' : diff.value?.changes.get(r.key)?.status ?? 'same')
function changeText(r: ViewRow): string {
  const s = changeOf(r)
  if (s === 'qty') return t.value.bom.changes.qty(fmt(diff.value!.changes.get(r.key)!.oldQty!), fmt(r.item.qty))
  return t.value.bom.changes[s as 'added' | 'removed']
}
const changeClass = (s: BomChange) =>
  s === 'added' ? 'bg-success-subtle text-success-on-subtle' : s === 'removed' ? 'bg-danger-subtle text-danger-on-subtle' : 'bg-warning-subtle text-warning-on-subtle'

// ---- 列 ----
const visibleRows = computed<ViewRow[]>(() => {
  let rows: ViewRow[] = flattenBom(props.data, expanded.value)
  // 刪除的節點放在上階的子件最後
  if (diff.value?.removed.length) {
    const out: ViewRow[] = []
    rows.forEach((r, i) => {
      out.push(r)
      const next = rows[i + 1]
      // 這一列是某個上階的最後一個後代時，補上那個上階被刪除的子件
      const closing = [r.key, ...ancestorKeys(r.key)].filter((k) => expanded.value.has(k) && !(next && (next.key === k || next.key.startsWith(`${k}/`))))
      for (const k of closing.sort((a, b) => b.length - a.length))
        for (const d of diff.value!.removed.filter((x) => x.parentKey === k))
          out.push({ key: d.key, item: d.item, level: k.split('/').length, parentKey: k, hasChildren: !!d.item.children?.length, perUnit: 0, removed: true })
    })
    rows = out
  }
  if (shortOnly.value && hasStock.value) {
    const keep = new Set<string>()
    for (const [key, n] of explosion.value.needs) {
      const r = rows.find((x) => x.key === key)
      if (n.net > 0 && r && !r.hasChildren) [key, ...ancestorKeys(key)].forEach((k) => keep.add(k))
    }
    // 收合的上階裡有缺料時也保留上階
    for (const [key, n] of explosion.value.needs) if (n.net > 0) ancestorKeys(key).forEach((k) => keep.add(k))
    keep.add(bomKeyOf(props.data))
    rows = rows.filter((r) => !r.removed && keep.has(r.key))
  }
  return rows
})
const shortOnly = ref(false)

// ---- 互動與鍵盤 ----
const tableRef = ref<HTMLTableElement | null>(null)
const focusIndex = ref(0)
function focusRow(i: number): void {
  focusIndex.value = Math.max(0, Math.min(visibleRows.value.length - 1, i))
  void nextTick(() => tableRef.value?.querySelector<HTMLElement>(`[data-row="${focusIndex.value}"]`)?.focus())
}
function onRowClick(r: ViewRow, i: number): void {
  focusIndex.value = i
  if (!r.removed) emit('row-click', r.item, r.key)
}
function onKeydown(e: KeyboardEvent, r: ViewRow, i: number): void {
  const parentIndex = () => visibleRows.value.findIndex((x) => x.key === r.parentKey && !x.removed)
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      return focusRow(i + 1)
    case 'ArrowUp':
      e.preventDefault()
      return focusRow(i - 1)
    case 'Home':
      e.preventDefault()
      return focusRow(0)
    case 'End':
      e.preventDefault()
      return focusRow(visibleRows.value.length - 1)
    case 'ArrowRight':
      e.preventDefault()
      if (r.hasChildren && !r.removed && !expanded.value.has(r.key)) toggle(r.key)
      else if (r.hasChildren && !r.removed) focusRow(i + 1)
      return
    case 'ArrowLeft':
      e.preventDefault()
      if (r.hasChildren && !r.removed && expanded.value.has(r.key)) toggle(r.key)
      else if (r.parentKey !== null) focusRow(parentIndex())
      return
    case 'Enter':
      e.preventDefault()
      if (r.hasChildren && !r.removed) toggle(r.key)
      else onRowClick(r, i)
  }
}

// ---- 匯出：全部展開的攤平表 ----
function exportCsv(): void {
  const b = t.value.bom
  const rows = flattenBom(props.data, new Set(allBomKeys(props.data))).map((r) => {
    const n = explosion.value.needs.get(r.key)
    return {
      level: r.level,
      partNo: r.item.partNo,
      name: r.item.name ?? '',
      ref: r.item.ref ?? '',
      qty: r.level === 0 ? '' : r.item.qty,
      unit: r.item.unit ?? '',
      perUnit: r.level === 0 ? '' : r.perUnit,
      required: n?.gross ?? 0,
      stock: hasStock.value && r.level > 0 ? props.stock![r.item.partNo] ?? 0 : '',
      shortage: hasStock.value && r.level > 0 && !r.hasChildren ? n?.net ?? 0 : '',
      critical: r.item.critical ? 'Y' : '',
    }
  })
  const columns = [
    { key: 'level', title: b.level },
    { key: 'partNo', title: b.partNo },
    { key: 'name', title: b.name },
    { key: 'ref', title: b.ref },
    { key: 'qty', title: b.qty },
    { key: 'unit', title: b.unit },
    { key: 'perUnit', title: b.perUnit },
    { key: 'required', title: b.required(fmt(qty.value)) },
    { key: 'stock', title: b.stock },
    { key: 'shortage', title: b.shortage },
    { key: 'critical', title: b.critical },
  ]
  downloadBlob(csvBlob(rows, columns), `${props.filename}.csv`)
}

defineExpose({
  expandAll,
  collapseAll,
  exportCsv,
  /** 各採購件的需求、庫存、缺料 */
  parts: computed(() => explosion.value.parts),
})
</script>
