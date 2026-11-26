<template>
  <div class="json-viewer flex flex-col gap-2 text-sm">
    <!-- 工具列 -->
    <div v-if="props.toolbar" class="flex flex-wrap items-center gap-2">
      <h3 v-if="props.title" class="text-base font-semibold text-content-primary">{{ props.title }}</h3>
      <form v-if="props.searchable" role="search" class="flex min-w-0 flex-1 basis-48 items-center gap-1.5" @submit.prevent="step(1)">
        <label class="relative min-w-0 flex-1">
          <span class="sr-only">{{ t.jsonViewer.search }}</span>
          <span class="material-symbols-outlined pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-lg text-content-tertiary" aria-hidden="true">search</span>
          <input
            v-model="query"
            type="search"
            :placeholder="t.jsonViewer.search"
            class="h-control-sm w-full rounded-md border border-stroke-default bg-surface-primary pl-8 pr-2 text-sm text-content-primary placeholder:text-content-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          />
        </label>
        <template v-if="query.trim()">
          <span class="whitespace-nowrap text-xs tabular-nums text-content-secondary" aria-live="polite">{{ t.jsonViewer.found(hitIndex, hits.length) }}</span>
          <ChptButton size="xs" is-outline icon="keyboard_arrow_up" :disabled="!hits.length" :aria-label="t.jsonViewer.prev" @click="step(-1)" />
          <ChptButton size="xs" is-outline icon="keyboard_arrow_down" :disabled="!hits.length" :aria-label="t.jsonViewer.next" @click="step(1)" />
        </template>
      </form>
      <span class="ml-auto flex flex-wrap gap-1.5">
        <ChptButton size="xs" is-outline icon="unfold_more" @click="expandAll()">{{ t.jsonViewer.expandAll }}</ChptButton>
        <ChptButton size="xs" is-outline icon="unfold_less" @click="collapseAll()">{{ t.jsonViewer.collapseAll }}</ChptButton>
        <ChptButton v-if="props.copyable" size="xs" is-outline icon="content_copy" @click="copy(JSON.stringify(props.data, null, 2), 'all')">{{ t.jsonViewer.copyAll }}</ChptButton>
      </span>
    </div>
    <div v-if="diff" class="flex flex-wrap gap-x-3 text-xs">
      <span :style="{ color: role('success') }">{{ t.jsonViewer.added(diff.count.added) }}</span>
      <span :style="{ color: role('danger') }">{{ t.jsonViewer.removed(diff.count.removed) }}</span>
      <span :style="{ color: role('warning') }">{{ t.jsonViewer.changed(diff.count.changed) }}</span>
    </div>

    <!-- 樹 -->
    <ul
      ref="listRef"
      class="overflow-auto rounded-lg border border-stroke-light bg-surface-primary py-1 font-mono text-[13px] leading-6"
      :style="{ maxHeight: props.maxHeight ? `${props.maxHeight}px` : undefined }"
      role="tree"
      :aria-label="props.title || t.jsonViewer.title"
    >
      <li
        v-for="(r, i) in viewRows"
        :key="r.key + (r.removed ? '#removed' : '')"
        :data-row="i"
        :role="r.more ? 'none' : 'treeitem'"
        :aria-level="r.more ? undefined : r.depth + 1"
        :aria-expanded="r.more || r.removed || !isContainer(r) ? undefined : r.expanded"
        :aria-selected="r.key === currentHit || undefined"
        :tabindex="r.more ? undefined : i === focusIndex ? 0 : -1"
        class="group flex min-w-max items-start gap-1 pr-3 focus:outline-none focus-visible:bg-surface-secondary"
        :class="rowClass(r)"
        :style="{ paddingLeft: `${8 + r.depth * 16}px` }"
        @click="onRowClick(r, i)"
        @keydown="onKeydown($event, r, i)"
        @focus="focusIndex = i"
      >
        <template v-if="r.more">
          <button
            type="button"
            class="rounded px-1 text-xs text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
            @click.stop="showMore(r.more.parentKey)"
          >{{ t.jsonViewer.more(r.more.remaining) }}</button>
        </template>
        <template v-else>
          <span class="inline-flex w-4 shrink-0 justify-center text-content-tertiary" aria-hidden="true">
            <span v-if="isContainer(r) && !r.removed" class="material-symbols-outlined text-base leading-6">{{ r.expanded ? 'expand_more' : 'chevron_right' }}</span>
          </span>
          <span v-if="r.name !== null" class="shrink-0" :style="{ color: typeof r.name === 'number' ? role('content-tertiary') : role('content-primary') }">{{ typeof r.name === 'number' ? r.name : JSON.stringify(r.name) }}</span>
          <span v-if="r.name !== null" class="shrink-0 text-content-tertiary">:</span>
          <!-- 值 -->
          <span v-if="isContainer(r)" class="text-content-tertiary">
            {{ r.type === 'array' ? '[' : '{' }}<template v-if="!r.expanded || r.removed"><span class="px-1 text-xs">{{ t.jsonViewer.items(r.size, r.type === 'array') }}</span>{{ r.type === 'array' ? ']' : '}' }}</template>
          </span>
          <span v-else class="whitespace-pre-wrap break-all" :style="{ color: typeColor(r.type) }">
            {{ expandedStrings.has(r.key) ? JSON.stringify(r.value) : previewValue(r.value, props.maxStringLength).text }}
            <button
              v-if="!expandedStrings.has(r.key) && previewValue(r.value, props.maxStringLength).truncated"
              type="button"
              class="ml-1 rounded px-1 font-sans text-xs text-accent hover:underline"
              @click.stop="expandString(r.key)"
            >{{ t.jsonViewer.showFull }}</button>
          </span>
          <span v-if="changeOf(r)" class="ml-2 shrink-0 rounded px-1.5 font-sans text-[11px] font-medium" :class="changeClass(changeOf(r)!)">{{ t.jsonViewer.changes[changeOf(r)!] }}</span>
          <!-- 複製 -->
          <span v-if="props.copyable && !r.removed" class="ml-2 hidden shrink-0 gap-1 font-sans group-hover:inline-flex group-focus:inline-flex">
            <button type="button" tabindex="-1" class="rounded px-1 text-xs text-content-secondary hover:bg-surface-tertiary" @click.stop="copy(valueText(r.value), 'value')">{{ t.jsonViewer.copyValue }}</button>
            <button type="button" tabindex="-1" class="rounded px-1 text-xs text-content-secondary hover:bg-surface-tertiary" @click.stop="copy(pathString(r.path, props.rootName), 'path')">{{ t.jsonViewer.copyPath }}</button>
          </span>
        </template>
      </li>
    </ul>
    <p class="text-xs text-content-tertiary">{{ t.jsonViewer.hint }}</p>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * ChptJsonViewer JSON 檢視器 —— 看 API 回應、設定檔、記錄內容。
 * 樹狀展開 / 收合、依型別上色、搜尋並展開到符合的位置、複製值或路徑（data.items[3].name）；
 * 很長的陣列分段顯示、很長的字串截斷；給 compare 時標出新增、刪除、變更。
 */
import { computed, nextTick, ref, watch } from 'vue'
import ChptButton from './ChptButton.vue'
import { useLocale } from '../shared/config'
import {
  ancestorPathKeys,
  containerKeys,
  diffJson,
  flattenJson,
  pathKey,
  pathString,
  previewValue,
  searchJson,
  type JsonChange,
  type JsonPath,
  type JsonRow,
  type JsonType,
} from '../shared/jsonViewer'

export interface ChptJsonViewerProps {
  /** 要顯示的資料（任何可 JSON 化的值） */
  data: unknown
  /** 舊版資料；給了就顯示差異 */
  compare?: unknown
  /** 一開始展開幾層（0 = 只有根） */
  expandDepth?: number
  /** 複製路徑時的開頭，例如 'data' → data.items[0] */
  rootName?: string
  /** 字串超過這個長度時截斷 */
  maxStringLength?: number
  /** 陣列 / 物件一次顯示幾個子項 */
  pageSize?: number
  toolbar?: boolean
  searchable?: boolean
  copyable?: boolean
  title?: string
  maxHeight?: number | null
}

const t = useLocale()
const props = withDefaults(defineProps<ChptJsonViewerProps>(), {
  compare: undefined,
  expandDepth: 1,
  rootName: '',
  maxStringLength: 120,
  pageSize: 100,
  toolbar: true,
  searchable: true,
  copyable: true,
  title: '',
  maxHeight: null,
})

const emit = defineEmits<{
  /** 點一列 */
  (e: 'select', detail: { path: JsonPath; pathText: string; value: unknown }): void
  /** 複製了什麼 */
  (e: 'copy', detail: { text: string; kind: 'value' | 'path' | 'all' }): void
}>()

const role = (name: string) => `rgb(var(--t-${name}))`
const isContainer = (r: Pick<JsonRow, 'type'>) => r.type === 'object' || r.type === 'array'
const typeColor = (type: JsonType) =>
  ({ string: role('success'), number: role('info'), boolean: role('warning'), null: role('content-tertiary'), undefined: role('content-tertiary') })[type as 'string'] ??
  role('content-primary')

// ---- 展開 ----
const initial = () => new Set(containerKeys(props.data, props.expandDepth - 1))
const expanded = ref(initial())
watch(
  () => props.data,
  () => {
    expanded.value = initial()
    shown.value = new Map()
  }
)
function toggle(key: string): void {
  const next = new Set(expanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = next
}
const expandAll = () => (expanded.value = new Set(containerKeys(props.data)))
const collapseAll = () => (expanded.value = new Set())
const shown = ref(new Map<string, number>())
function showMore(parentKey: string): void {
  const next = new Map(shown.value)
  next.set(parentKey, (next.get(parentKey) ?? props.pageSize) + props.pageSize)
  shown.value = next
}
const expandedStrings = ref(new Set<string>())
const expandString = (key: string) => (expandedStrings.value = new Set([...expandedStrings.value, key]))

// ---- 差異 ----
const diff = computed(() => (props.compare === undefined ? null : diffJson(props.compare, props.data)))
type ViewRow = JsonRow & { removed?: boolean }
const changeOf = (r: ViewRow): JsonChange | null => (r.removed ? 'removed' : diff.value?.changes.get(r.key) ?? null)
const changeClass = (c: JsonChange) =>
  c === 'added' ? 'bg-success-subtle text-success-on-subtle' : c === 'removed' ? 'bg-danger-subtle text-danger-on-subtle' : 'bg-warning-subtle text-warning-on-subtle'

// ---- 列 ----
const rows = computed(() => flattenJson(props.data, expanded.value, { pageSize: props.pageSize, shown: shown.value }))
const viewRows = computed<ViewRow[]>(() => {
  const list: ViewRow[] = rows.value
  if (!diff.value?.removed.length) return list
  // 刪除的項目放在它的容器最後（容器展開時）
  const out: ViewRow[] = [...list]
  for (const d of diff.value.removed) {
    if (!expanded.value.has(d.parentKey)) continue
    let at = -1
    out.forEach((r, i) => {
      if (r.key === d.parentKey || isUnder(r.path, d.parentKey)) at = i
    })
    if (at < 0) continue
    out.splice(at + 1, 0, { path: d.path, key: pathKey(d.path), name: d.name, depth: d.path.length, type: typeOf(d.value), value: d.value, size: 0, expanded: false, removed: true })
  }
  return out
})
const isUnder = (path: JsonPath, key: string) => {
  const p = JSON.parse(key) as JsonPath
  return path.length > p.length && p.every((x, i) => path[i] === x)
}
const typeOf = (v: unknown): JsonType => (v === null ? 'null' : Array.isArray(v) ? 'array' : (typeof v as JsonType))
function rowClass(r: ViewRow): string[] {
  const c = changeOf(r)
  const cls = [r.key === currentHit.value ? 'bg-accent-subtle' : hitKeys.value.has(r.key) ? 'bg-warning-subtle' : '']
  if (r.removed) cls.push('line-through opacity-70')
  if (c === 'added') cls.push('bg-success-subtle')
  else if (c === 'removed') cls.push('bg-danger-subtle')
  if (isContainer(r) && !r.removed) cls.push('cursor-pointer')
  return cls
}

// ---- 搜尋 ----
const query = ref('')
const hits = computed(() => searchJson(props.data, query.value))
const hitKeys = computed(() => new Set(hits.value.map(pathKey)))
const hitIndex = ref(0)
const currentHit = computed(() => (hits.value.length && hitIndex.value > 0 ? pathKey(hits.value[hitIndex.value - 1]) : null))
watch(hits, (h) => {
  hitIndex.value = h.length ? 1 : 0
  if (h.length) reveal(h[0])
})
function reveal(path: JsonPath): void {
  const next = new Set(expanded.value)
  for (const k of ancestorPathKeys(path)) next.add(k)
  expanded.value = next
  void nextTick(() => {
    const i = viewRows.value.findIndex((r) => r.key === pathKey(path))
    listRef.value?.querySelector<HTMLElement>(`[data-row="${i}"]`)?.scrollIntoView?.({ block: 'nearest' })
  })
}
function step(dir: 1 | -1): void {
  const n = hits.value.length
  if (!n) return
  hitIndex.value = ((hitIndex.value - 1 + dir + n) % n) + 1
  reveal(hits.value[hitIndex.value - 1])
}

// ---- 互動 ----
const listRef = ref<HTMLUListElement | null>(null)
const focusIndex = ref(0)
const announcement = ref('')
function onRowClick(r: ViewRow, i: number): void {
  if (r.more || r.removed) return
  focusIndex.value = i
  if (isContainer(r)) toggle(r.key)
  emit('select', { path: r.path, pathText: pathString(r.path, props.rootName), value: r.value })
}
function focusRow(i: number): void {
  focusIndex.value = Math.max(0, Math.min(viewRows.value.length - 1, i))
  void nextTick(() => listRef.value?.querySelector<HTMLElement>(`[data-row="${focusIndex.value}"]`)?.focus())
}
function onKeydown(e: KeyboardEvent, r: ViewRow, i: number): void {
  const parent = () => viewRows.value.findIndex((x) => x.key === pathKey(r.path.slice(0, -1)))
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      return focusRow(i + 1)
    case 'ArrowUp':
      e.preventDefault()
      return focusRow(i - 1)
    case 'ArrowRight':
      e.preventDefault()
      if (isContainer(r) && !r.removed && !r.expanded) toggle(r.key)
      else if (isContainer(r) && r.expanded) focusRow(i + 1)
      return
    case 'ArrowLeft':
      e.preventDefault()
      if (isContainer(r) && r.expanded) toggle(r.key)
      else if (r.path.length) focusRow(parent())
      return
    case 'Enter':
      e.preventDefault()
      return onRowClick(r, i)
    case 'c':
      if (props.copyable && !r.removed && !e.ctrlKey && !e.metaKey) copy(valueText(r.value), 'value')
  }
}

// ---- 複製 ----
const valueText = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2) ?? String(v))
async function copy(text: string, kind: 'value' | 'path' | 'all'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    announcement.value = t.value.jsonViewer.copied[kind]
  } catch {
    announcement.value = t.value.jsonViewer.copyFailed
  }
  emit('copy', { text, kind })
}

defineExpose({ expandAll, collapseAll, reveal })
</script>
