<template>
  <div ref="root" class="flex flex-col gap-2">
    <!-- 摘要：各狀態數量（也是篩選） -->
    <div class="flex flex-wrap items-center gap-1.5">
      <div class="flex flex-wrap gap-1.5" role="group" :aria-label="t.diffViewer.filterLabel">
        <button
          v-for="s in DIFF_STATUSES"
          :key="s"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          :class="statusFilter.includes(s) ? 'border-stroke-focus bg-accent-subtle text-accent-on-subtle' : 'border-stroke-default bg-surface-primary text-content-secondary hover:bg-surface-tertiary'"
          :aria-pressed="statusFilter.includes(s)"
          @click="toggleStatus(s)"
        >
          <span class="material-symbols-outlined text-sm" :style="{ color: STATUS_COLOR[s] }" aria-hidden="true">{{ STATUS_ICON[s] }}</span>
          {{ t.diffViewer.status[s] }}
          <span class="font-semibold tabular-nums text-content-primary">{{ counts[s] }}</span>
        </button>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <ChptSwitch :model-value="onlyDiff" :label="t.diffViewer.onlyDiff" :disabled="statusFilter.length > 0" @update:model-value="setOnlyDiff" />
      <div class="flex items-center gap-1">
        <ChptButton size="xs" is-outline icon="unfold_more" @click="expandAll()">{{ t.diffViewer.expandAll }}</ChptButton>
        <ChptButton size="xs" is-outline icon="unfold_less" @click="collapseAll()">{{ t.diffViewer.collapseAll }}</ChptButton>
      </div>
      <label v-if="props.searchable" class="relative ml-auto">
        <span class="sr-only">{{ t.diffViewer.search }}</span>
        <span class="material-symbols-outlined pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-base text-content-tertiary" aria-hidden="true">search</span>
        <input
          v-model="query"
          type="search"
          :placeholder="t.diffViewer.search"
          class="h-control-sm w-52 rounded-md border border-stroke-default bg-surface-primary pl-8 pr-2 text-sm text-content-primary outline-none placeholder:text-content-disabled focus:border-stroke-focus focus:ring-1 focus:ring-stroke-focus"
        />
      </label>
    </div>

    <div
      class="overflow-auto rounded-md border border-stroke-light"
      :style="props.maxHeight ? { maxHeight: `${props.maxHeight}px` } : undefined"
    >
      <table class="w-full table-fixed border-collapse text-sm" :aria-label="props.label || t.diffViewer.label">
        <colgroup>
          <col :style="{ width: narrow ? '45%' : '34%' }" />
          <template v-if="!narrow"><col style="width: 24%" /><col style="width: 24%" /><col style="width: 18%" /></template>
          <col v-else />
        </colgroup>
        <thead class="sticky top-0 z-[1] bg-surface-secondary text-left text-xs text-content-secondary">
          <tr>
            <th scope="col" class="px-3 py-2 font-medium">{{ t.diffViewer.param }}</th>
            <template v-if="!narrow">
              <th scope="col" class="px-3 py-2 font-medium">{{ leftName }}</th>
              <th scope="col" class="px-3 py-2 font-medium">{{ rightName }}</th>
              <th scope="col" class="px-3 py-2 font-medium">{{ t.diffViewer.diff }}</th>
            </template>
            <th v-else scope="col" class="px-3 py-2 font-medium">{{ leftName }} → {{ rightName }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!lines.length">
            <td :colspan="narrow ? 2 : 4" class="px-3 py-6 text-center text-content-tertiary">
              {{ rows.length === 0 ? t.diffViewer.empty : onlyDiff && !query && !statusFilter.length ? t.diffViewer.noDiff : t.diffViewer.noMatch }}
            </td>
          </tr>
          <tr
            v-for="line in lines"
            :key="line.node.path"
            class="border-t border-stroke-light align-top"
            :style="line.node.row ? rowStyle(line.node.row.status) : undefined"
          >
            <!-- 參數名稱（樹狀縮排） -->
            <th
              scope="row"
              :colspan="line.node.row ? 1 : narrow ? 2 : 4"
              class="px-3 py-1.5 text-left font-normal"
              :style="{ paddingLeft: `${12 + line.node.depth * 16}px` }"
            >
              <button
                v-if="!line.node.row"
                type="button"
                class="-ml-1 inline-flex items-center gap-1 rounded px-1 text-left font-medium text-content-primary hover:bg-surface-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                :aria-expanded="line.open"
                @click="toggle(line.node.path)"
              >
                <span class="material-symbols-outlined text-base text-content-tertiary transition-transform" :class="line.open ? 'rotate-90' : ''" aria-hidden="true">chevron_right</span>
                <span class="break-words">{{ displayKey(line.node) }}</span>
                <span v-if="hasChanges(line.node.counts)" class="ml-1 whitespace-nowrap rounded px-1 text-[11px] font-medium text-content-secondary" style="background: color-mix(in srgb, rgb(var(--t-warning-solid)) 16%, transparent)">
                  {{ t.diffViewer.groupChanges(line.node.counts.changed + line.node.counts.added + line.node.counts.removed) }}
                </span>
              </button>
              <span v-else class="flex items-start gap-1.5">
                <span class="material-symbols-outlined text-base leading-4" :style="{ color: STATUS_COLOR[line.node.row.status] }" :aria-label="t.diffViewer.status[line.node.row.status]" role="img">{{ STATUS_ICON[line.node.row.status] }}</span>
                <span class="min-w-0 [overflow-wrap:anywhere]">
                  <span class="block font-mono text-xs leading-4 text-content-primary">{{ displayKey(line.node) }}</span>
                  <span v-if="props.labels?.[line.node.path]" class="block text-xs text-content-secondary">{{ props.labels[line.node.path] }}</span>
                </span>
              </span>
            </th>
            <td v-if="line.node.row && narrow" class="px-3 py-1.5 font-mono text-xs">
              <span class="[overflow-wrap:anywhere]" :class="line.node.row.status === 'removed' ? 'text-content-primary line-through' : 'text-content-secondary'">{{ valueText(line.node.row, 'left') }}</span>
              <span class="text-content-tertiary" aria-hidden="true"> → </span>
              <span class="[overflow-wrap:anywhere]" :class="isDiff(line.node.row) ? 'font-semibold text-content-primary' : 'text-content-secondary'">{{ valueText(line.node.row, 'right') }}</span>
              <span v-if="deltaText(line.node.row)" class="block font-sans" :class="isDiff(line.node.row) ? 'text-content-primary' : 'text-content-tertiary'">{{ deltaText(line.node.row) }}</span>
            </td>
            <template v-else-if="line.node.row">
              <td class="px-3 [overflow-wrap:anywhere] py-1.5 font-mono text-xs" :class="line.node.row.status === 'removed' ? 'text-content-primary line-through' : 'text-content-secondary'">
                {{ valueText(line.node.row, 'left') }}
              </td>
              <td class="px-3 [overflow-wrap:anywhere] py-1.5 font-mono text-xs" :class="isDiff(line.node.row) ? 'font-semibold text-content-primary' : 'text-content-secondary'">
                {{ valueText(line.node.row, 'right') }}
              </td>
              <td class="whitespace-nowrap px-3 py-1.5 text-xs" :class="isDiff(line.node.row) ? 'text-content-primary' : 'text-content-tertiary'">
                {{ deltaText(line.node.row) }}
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import ChptButton from './ChptButton.vue'
import ChptSwitch from './ChptSwitch.vue'
import { useLocale } from '../shared/config'
import {
  DIFF_STATUSES,
  buildDiffTree,
  countDiff,
  diffParams,
  formatParam,
  hasChanges,
  lookupPath,
  type DiffRow,
  type DiffStatus,
  type DiffTreeNode,
  type ParamValue,
  type ToleranceMap,
} from '../shared/paramDiff'

/**
 * ChptDiffViewer（CHPT 主題） - 參數比對
 *
 * 用途：比對兩組巢狀參數 —— 配方 A / B、機台設定修改前後、兩條線同一台機的參數。
 *   - 巢狀物件、陣列攤平比對；狀態：變更、新增（右邊才有）、刪除（左邊才有）、容許內（數值差在容許範圍）、相同
 *   - 數值顯示差值與百分比；tolerance / tolerances 設定容許差（`oven.zones[*].temp: 2`）
 *   - 樹狀顯示，群組摺疊時也標出底下有幾處不同；預設只顯示差異
 *   - 上方各狀態數量也是篩選；搜尋比對路徑、顯示名稱與值
 */

interface ChptDiffViewerProps {
  /** 左邊（基準）的參數 */
  left: ParamValue
  /** 右邊（比對）的參數 */
  right: ParamValue
  leftLabel?: string
  rightLabel?: string
  /** 數值的容許差（絕對值）；差在範圍內算「容許內」 */
  tolerance?: number
  /** 依路徑指定容許差：`{ 'oven.zones[*].temp': 2, 'speed.*': 0.5 }` */
  tolerances?: ToleranceMap
  /** 依路徑指定單位（同樣可用 *） */
  units?: Record<string, string>
  /** 路徑的顯示名稱（完整路徑 → 名稱） */
  labels?: Record<string, string>
  /** v-model:only-diff：只顯示有差異的（變更、新增、刪除、容許內） */
  onlyDiff?: boolean
  searchable?: boolean
  /** 最大高度（px），超過時捲動；0 為不限 */
  maxHeight?: number
  /** 預設展開幾層（Infinity 全部展開） */
  defaultExpandDepth?: number
  label?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptDiffViewerProps>(), {
  leftLabel: '',
  rightLabel: '',
  tolerance: 0,
  tolerances: undefined,
  units: undefined,
  labels: undefined,
  onlyDiff: true,
  searchable: true,
  maxHeight: 0,
  defaultExpandDepth: Infinity,
  label: '',
})

const emit = defineEmits<{
  (e: 'update:onlyDiff', value: boolean): void
}>()

const role = (name: string) => `rgb(var(--t-${name}))`
const STATUS_COLOR: Record<DiffStatus, string> = {
  changed: role('warning-solid'),
  added: role('success-solid'),
  removed: role('danger-solid'),
  within: role('info-solid'),
  same: role('stroke-dark'),
}
const STATUS_ICON: Record<DiffStatus, string> = { changed: 'change_circle', added: 'add_circle', removed: 'remove_circle', within: 'check_circle', same: 'radio_button_unchecked' }
const rowStyle = (s: DiffStatus) =>
  s === 'same' || s === 'within' ? undefined : { background: `color-mix(in srgb, ${STATUS_COLOR[s]} 9%, transparent)`, boxShadow: `inset 3px 0 0 ${STATUS_COLOR[s]}` }
const isDiff = (r: DiffRow) => r.status !== 'same'

// ---- 窄畫面（手機）：參數 | 「基準 → 比對」兩欄，不用左右捲動 ----
const root = useTemplateRef<HTMLDivElement>('root')
const narrow = ref(false)
let observer: ResizeObserver | null = null
const measure = () => (narrow.value = (root.value?.clientWidth ?? 9999) < 560)
onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && root.value) {
    observer = new ResizeObserver(measure)
    observer.observe(root.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())
const leftName = computed(() => props.leftLabel || t.value.diffViewer.left)
const rightName = computed(() => props.rightLabel || t.value.diffViewer.right)

// ---- 比對 ----
const rows = computed(() => diffParams(props.left, props.right, { tolerance: props.tolerance, tolerances: props.tolerances }))
const counts = computed(() => countDiff(rows.value))
const tree = computed(() => buildDiffTree(rows.value))

// ---- 篩選 ----
const onlyDiff = ref(props.onlyDiff)
watch(() => props.onlyDiff, (v) => (onlyDiff.value = v))
function setOnlyDiff(v: boolean): void {
  onlyDiff.value = v
  emit('update:onlyDiff', v)
}
const statusFilter = ref<DiffStatus[]>([])
function toggleStatus(s: DiffStatus): void {
  statusFilter.value = statusFilter.value.includes(s) ? statusFilter.value.filter((x) => x !== s) : [...statusFilter.value, s]
}
const query = ref('')
function rowVisible(r: DiffRow): boolean {
  if (statusFilter.value.length) {
    if (!statusFilter.value.includes(r.status)) return false
  } else if (onlyDiff.value && r.status === 'same') return false
  const q = query.value.trim().toLowerCase()
  if (!q) return true
  return [r.path, props.labels?.[r.path], formatParam(r.left), formatParam(r.right)].some((v) => v?.toLowerCase().includes(q))
}

// ---- 摺疊 ----
const collapsed = ref(new Set<string>())
function initCollapsed(): void {
  const out = new Set<string>()
  const walk = (nodes: DiffTreeNode[]) =>
    nodes.forEach((n) => {
      if (n.row) return
      if (n.depth >= props.defaultExpandDepth) out.add(n.path)
      walk(n.children)
    })
  walk(tree.value)
  collapsed.value = out
}
watch(tree, initCollapsed, { immediate: true })
function toggle(path: string): void {
  const next = new Set(collapsed.value)
  if (next.has(path)) next.delete(path)
  else next.add(path)
  collapsed.value = next
}
function expandAll(): void {
  collapsed.value = new Set()
}
function collapseAll(): void {
  const out = new Set<string>()
  const walk = (nodes: DiffTreeNode[]) => nodes.forEach((n) => (n.row ? null : (out.add(n.path), walk(n.children))))
  walk(tree.value)
  collapsed.value = out
}

/** 要畫的列：群組底下有看得到的列才顯示；搜尋時不管摺疊、全部展開 */
const lines = computed(() => {
  const out: Array<{ node: DiffTreeNode; open: boolean }> = []
  const searching = !!query.value.trim()
  const visibleUnder = (n: DiffTreeNode): boolean => (n.row ? rowVisible(n.row) : n.children.some(visibleUnder))
  const walk = (nodes: DiffTreeNode[]) => {
    for (const n of nodes) {
      if (!visibleUnder(n)) continue
      const open = searching || !collapsed.value.has(n.path)
      out.push({ node: n, open })
      if (!n.row && open) walk(n.children)
    }
  }
  walk(tree.value)
  return out
})

// ---- 顯示 ----
const displayKey = (n: DiffTreeNode) => n.key
const unitOf = (path: string) => lookupPath(path, props.units)
function valueText(r: DiffRow, side: 'left' | 'right'): string {
  const v = side === 'left' ? r.left : r.right
  if (v === undefined) return '—'
  const u = typeof v === 'number' ? unitOf(r.path) : undefined
  return u ? `${formatParam(v)} ${u}` : formatParam(v)
}
const signed = (n: number, digits: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString(t.value.code, { maximumFractionDigits: digits })}`
function deltaText(r: DiffRow): string {
  if (r.status === 'added') return t.value.diffViewer.status.added
  if (r.status === 'removed') return t.value.diffViewer.status.removed
  if (r.delta !== undefined && r.delta !== 0) {
    const u = unitOf(r.path)
    const parts = [`${signed(r.delta, 6)}${u ? ` ${u}` : ''}`]
    if (r.pct !== undefined) parts.push(`(${signed(r.pct, 1)}%)`)
    if (r.status === 'within') parts.push(t.value.diffViewer.status.within)
    return parts.join(' ')
  }
  return r.status === 'changed' ? t.value.diffViewer.status.changed : ''
}

defineExpose({
  expandAll,
  collapseAll,
  /** 比對結果（全部的列，含相同） */
  rows,
})
</script>
