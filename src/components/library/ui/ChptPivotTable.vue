<template>
  <div class="flex flex-col gap-2">
    <!-- 工具列 -->
    <div class="flex flex-wrap items-center gap-2">
      <ChptButton
        v-if="props.configurable"
        size="xs"
        is-outline
        icon="tune"
        :aria-expanded="panelOpen"
        :aria-controls="`${uid}-panel`"
        @click="panelOpen = !panelOpen"
      >{{ t.pivot.configure }}</ChptButton>
      <ChptButton size="xs" is-outline icon="unfold_more" :disabled="!hasGroups" @click="expandAll()">{{ t.pivot.expandAll }}</ChptButton>
      <ChptButton size="xs" is-outline icon="unfold_less" :disabled="!hasGroups" @click="collapseAll()">{{ t.pivot.collapseAll }}</ChptButton>
      <ChptSwitch v-model="heat" :label="t.pivot.heatmap" size="sm" />
      <span class="ml-auto text-xs text-content-tertiary">{{ t.pivot.summary(result.count, leafRowCount, result.colKeys.length) }}</span>
      <ChptButton size="xs" is-outline icon="download" :disabled="!config.values.length" @click="exportCsv()">{{ t.pivot.exportCsv }}</ChptButton>
    </div>

    <!-- 欄位設定：拖曳或用按鈕把欄位放到列 / 欄 / 值 -->
    <div v-if="props.configurable && panelOpen" :id="`${uid}-panel`" class="grid grid-cols-1 gap-2 rounded-md border border-stroke-light bg-surface-secondary p-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.4fr]">
      <section
        v-for="zone in ZONES"
        :key="zone"
        class="flex min-h-[4.5rem] flex-col gap-1.5 rounded border border-dashed p-2 transition-colors"
        :class="dropZone === zone ? 'border-stroke-focus bg-accent-subtle' : 'border-stroke-default bg-surface-primary'"
        :aria-label="t.pivot.zone[zone]"
        @dragover.prevent="dropZone = zone"
        @dragleave="dropZone = dropZone === zone ? null : dropZone"
        @drop.prevent="onDrop(zone)"
      >
        <h4 class="text-xs font-medium text-content-secondary">{{ t.pivot.zone[zone] }}</h4>
        <p v-if="!chipsOf(zone).length" class="text-xs text-content-tertiary">{{ t.pivot.dropHere }}</p>
        <ul class="flex flex-wrap gap-1.5">
          <li
            v-for="(chip, i) in chipsOf(zone)"
            :key="`${chip.field}-${i}`"
            draggable="true"
            class="inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-stroke-default bg-surface-primary py-0.5 pl-1.5 pr-1 text-xs text-content-primary"
            @dragstart="onDragStart($event, zone, i)"
            @dragend="dragging = null; dropZone = null"
          >
            <span class="material-symbols-outlined cursor-grab text-sm text-content-tertiary" aria-hidden="true">drag_indicator</span>
            <span class="max-w-[9rem] truncate">{{ labelOf(chip.field) }}</span>
            <!-- 值：彙總方式 -->
            <select
              v-if="zone === 'values'"
              :value="chip.agg"
              class="max-w-[6.5rem] rounded border border-stroke-light bg-surface-primary px-1 text-xs text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
              :aria-label="t.pivot.aggFor(labelOf(chip.field))"
              @change="setAgg(i, ($event.target as HTMLSelectElement).value as PivotAgg)"
            >
              <option v-for="a in aggsFor(chip.field)" :key="a" :value="a">{{ t.pivot.agg[a] }}</option>
            </select>
            <!-- 可用欄位：加到列 / 欄 / 值 -->
            <template v-if="zone === 'available'">
              <button
                v-for="to in targetsFor(chip.field)"
                :key="to"
                type="button"
                class="rounded px-1 text-accent hover:bg-accent-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                :aria-label="t.pivot.addTo(labelOf(chip.field), t.pivot.zone[to])"
                :title="t.pivot.addTo(labelOf(chip.field), t.pivot.zone[to])"
                @click="move(chip.field, to)"
              >{{ t.pivot.zoneShort[to] }}</button>
            </template>
            <template v-else>
              <button type="button" :class="iconBtn" :aria-label="t.pivot.moveEarlier(labelOf(chip.field))" :disabled="i === 0" @click="shift(zone, i, -1)">
                <span class="material-symbols-outlined text-sm" aria-hidden="true">chevron_left</span>
              </button>
              <button type="button" :class="iconBtn" :aria-label="t.pivot.moveLater(labelOf(chip.field))" :disabled="i === chipsOf(zone).length - 1" @click="shift(zone, i, 1)">
                <span class="material-symbols-outlined text-sm" aria-hidden="true">chevron_right</span>
              </button>
              <button type="button" :class="iconBtn" :aria-label="t.pivot.remove(labelOf(chip.field))" @click="remove(zone, i)">
                <span class="material-symbols-outlined text-sm" aria-hidden="true">close</span>
              </button>
            </template>
          </li>
        </ul>
      </section>
    </div>

    <!-- 表格 -->
    <p v-if="!config.values.length" class="rounded-md border border-dashed border-stroke-default p-6 text-center text-sm text-content-tertiary">{{ t.pivot.noValues }}</p>
    <p v-else-if="!props.data.length" class="rounded-md border border-dashed border-stroke-default p-6 text-center text-sm text-content-tertiary">{{ t.pivot.empty }}</p>
    <div
      v-else
      ref="scroller"
      class="overflow-auto rounded-md border border-stroke-light"
      :style="props.maxHeight ? { maxHeight: `${props.maxHeight}px` } : undefined"
      @scroll="onScroll"
    >
      <table class="min-w-full border-separate border-spacing-0 text-sm" :aria-label="props.label || t.pivot.label" :aria-rowcount="rows.length + headerRowCount + 1">
        <thead class="sticky top-0 z-[2] bg-surface-secondary text-xs text-content-secondary">
          <tr v-for="(level, li) in headerLevels" :key="li">
            <th
              v-if="li === 0"
              scope="col"
              :rowspan="headerRowCount"
              class="sticky left-0 z-[3] border-b border-r border-stroke-light bg-surface-secondary px-3 py-1.5 text-left align-bottom font-medium"
            >{{ config.rows.map(labelOf).join(' / ') || t.pivot.grandTotal }}</th>
            <th
              v-for="g in level"
              :key="g.key"
              scope="colgroup"
              :colspan="g.span"
              class="whitespace-nowrap border-b border-r border-stroke-light px-3 py-1.5 font-medium"
              :class="g.span > config.values.length ? 'text-left' : 'text-center'"
            >{{ g.label }}</th>
            <th
              v-if="li === 0 && config.cols.length"
              scope="colgroup"
              :rowspan="config.cols.length"
              :colspan="config.values.length"
              class="whitespace-nowrap border-b border-stroke-light px-3 py-1.5 text-center font-semibold text-content-primary"
            >{{ t.pivot.total }}</th>
          </tr>
          <!-- 值的名稱（每一欄底下） -->
          <tr v-if="showValueHeader">
            <th
              v-if="!headerLevels.length"
              scope="col"
              class="sticky left-0 z-[3] border-b border-r border-stroke-light bg-surface-secondary px-3 py-1.5 text-left font-medium"
            >{{ config.rows.map(labelOf).join(' / ') || t.pivot.grandTotal }}</th>
            <th v-for="(c, ci) in valueColumns" :key="ci" scope="col" class="whitespace-nowrap border-b border-r border-stroke-light px-3 py-1.5 text-right font-medium last:border-r-0">
              {{ valueLabel(config.values[c.vi]) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="windowed.top > 0" aria-hidden="true"><td :colspan="valueColumns.length + 1" :style="{ height: `${windowed.top}px`, padding: 0 }"></td></tr>
          <tr v-for="row in windowed.rows" :key="row.key" :class="row.leaf ? '' : 'font-medium'" :style="{ height: `${ROW_H}px` }">
            <th
              scope="row"
              class="sticky left-0 z-[1] whitespace-nowrap border-b border-r border-stroke-light px-3 text-left"
              :class="row.leaf ? 'bg-surface-primary font-normal text-content-primary' : 'bg-surface-secondary text-content-primary'"
              :style="{ paddingLeft: `${12 + row.depth * 18}px` }"
            >
              <button
                v-if="!row.leaf"
                type="button"
                class="-ml-1 inline-flex items-center gap-0.5 rounded px-0.5 hover:bg-surface-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                :aria-expanded="!collapsed.has(row.key)"
                @click="toggle(row.key)"
              >
                <span class="material-symbols-outlined text-base text-content-tertiary transition-transform" :class="collapsed.has(row.key) ? '' : 'rotate-90'" aria-hidden="true">chevron_right</span>
                {{ groupText(row.path[row.depth]) }}
              </button>
              <span v-else>{{ row === TOTAL_ROW ? t.pivot.grandTotal : groupText(row.path[row.depth]) }}</span>
            </th>
            <td
              v-for="(c, ci) in valueColumns"
              :key="ci"
              class="whitespace-nowrap border-b border-r border-stroke-light px-3 text-right tabular-nums last:border-r-0"
              :class="[c.total ? 'font-medium' : '', row.leaf ? '' : 'bg-surface-secondary']"
              :style="heatStyle(row, c)"
            >
              <!-- 有監聽 cell-click 時格子內容是按鈕（鍵盤可以按）；沒有時維持純文字，不多出 Tab 停駐點 -->
              <button v-if="hasCellClick" type="button" class="block w-full rounded-sm text-right tabular-nums hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus" @click="onCellClick(row.path, c)">{{ cellText(row.path, c) }}</button>
              <template v-else>{{ cellText(row.path, c) }}</template>
            </td>
          </tr>
          <tr v-if="windowed.bottom > 0" aria-hidden="true"><td :colspan="valueColumns.length + 1" :style="{ height: `${windowed.bottom}px`, padding: 0 }"></td></tr>
        </tbody>
        <tfoot v-if="props.showTotals && config.rows.length" class="sticky bottom-0 z-[2] font-semibold">
          <tr>
            <th scope="row" class="sticky left-0 z-[3] whitespace-nowrap border-t border-r border-stroke-default bg-surface-tertiary px-3 py-1.5 text-left text-content-primary">{{ t.pivot.grandTotal }}</th>
            <td
              v-for="(c, ci) in valueColumns"
              :key="ci"
              class="whitespace-nowrap border-t border-r border-stroke-default bg-surface-tertiary px-3 py-1.5 text-right tabular-nums text-content-primary last:border-r-0"
            >
              <button v-if="hasCellClick" type="button" class="block w-full rounded-sm text-right tabular-nums hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus" @click="onCellClick([], c)">{{ cellText([], c) }}</button>
              <template v-else>{{ cellText([], c) }}</template>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, ref, shallowRef, useId, useTemplateRef, watch } from 'vue'
import ChptButton from './ChptButton.vue'
import ChptSwitch from './ChptSwitch.vue'
import { useLocale } from '../shared/config'
import { csvBlob, downloadBlob } from '../charts/utils/chartExport'
import {
  PIVOT_AGGS,
  computePivot,
  moveField,
  reorder,
  visibleRows,
  type PivotAgg,
  type PivotConfig,
  type PivotField,
  type PivotRecord,
  type PivotRowNode,
  type PivotValue,
} from '../shared/pivot'

/**
 * ChptPivotTable（CHPT 主題） - 樞紐分析表
 *
 * 用途：交叉分析 —— 不良數依「線 × 不良代碼」、產量依「日期 × 機台」、工時依「部門 × 月份」。
 *   - 欄位拖到列、欄、值（或用按鈕；鍵盤可操作），v-model:config 記住目前的設定
 *   - 值：加總、平均、計數、最小、最大、不重複計數；可以同時好幾個值
 *   - 列可以多層，每一層有小計、可展開 / 收合；欄展開到最後一層，另有總計欄與總計列
 *   - 熱度：依數值深淺上色（每個值欄位各自比較）
 *   - 匯出 CSV（最後一層的列 + 總計）；列很多時只畫看得到的部分
 */

interface ChptPivotTableProps {
  /** 原始資料（每筆一個物件） */
  data: PivotRecord[]
  /** 可用的欄位 */
  fields: PivotField[]
  /** v-model:config：列、欄、值 */
  config?: PivotConfig
  /** 顯示欄位設定 */
  configurable?: boolean
  /** 熱度上色 */
  heatmap?: boolean
  showTotals?: boolean
  /** 表格最大高度（px）；0 為不限（不限時不做虛擬捲動） */
  maxHeight?: number
  /** 預設展開幾層（Infinity 全部展開） */
  defaultExpandDepth?: number
  /** 匯出檔名（不含副檔名） */
  filename?: string
  label?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptPivotTableProps>(), {
  config: () => ({ rows: [], cols: [], values: [] }),
  configurable: true,
  heatmap: false,
  showTotals: true,
  maxHeight: 520,
  defaultExpandDepth: Infinity,
  filename: 'pivot',
  label: '',
})

const emit = defineEmits<{
  (e: 'update:config', value: PivotConfig): void
  (e: 'cell-click', payload: { rowPath: string[]; colKey: string[] | null; value: PivotValue; result: number | null }): void
}>()

const uid = useId()
const ROW_H = 32
const iconBtn =
  'flex h-5 w-5 items-center justify-center rounded text-content-tertiary hover:bg-surface-tertiary hover:text-content-primary disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus'

// ---- 設定 ----
const config = shallowRef<PivotConfig>(props.config)
watch(
  () => props.config,
  (v) => (config.value = v)
)
function setConfig(next: PivotConfig): void {
  config.value = next
  emit('update:config', next)
}
const panelOpen = ref(true)
const heat = ref(props.heatmap)
watch(
  () => props.heatmap,
  (v) => (heat.value = v)
)

const fieldOf = computed(() => new Map(props.fields.map((f) => [f.key, f])))
const labelOf = (key: string) => fieldOf.value.get(key)?.label ?? key
const isMeasure = (key: string) => fieldOf.value.get(key)?.kind === 'measure'
/** 數值欄位可以用所有彙總；分組欄位只能計數 */
const aggsFor = (key: string): PivotAgg[] => (isMeasure(key) ? PIVOT_AGGS : ['count', 'countDistinct'])
const targetsFor = (key: string): Array<'rows' | 'cols' | 'values'> => (isMeasure(key) ? ['values'] : ['rows', 'cols', 'values'])

type Zone = 'available' | 'rows' | 'cols' | 'values'
const ZONES: Zone[] = ['available', 'rows', 'cols', 'values']
function chipsOf(zone: Zone): Array<{ field: string; agg?: PivotAgg }> {
  const c = config.value
  if (zone === 'rows') return c.rows.map((field) => ({ field }))
  if (zone === 'cols') return c.cols.map((field) => ({ field }))
  if (zone === 'values') return c.values.map((v) => ({ field: v.field, agg: v.agg }))
  const used = new Set([...c.rows, ...c.cols])
  return props.fields.filter((f) => !used.has(f.key)).map((f) => ({ field: f.key }))
}
function move(field: string, to: Zone, index?: number): void {
  const agg: PivotAgg = isMeasure(field) ? 'sum' : 'count'
  setConfig(moveField(config.value, field, to === 'available' ? 'none' : to, index, agg))
}
function remove(zone: Zone, i: number): void {
  const c = config.value
  if (zone === 'values') setConfig({ ...c, values: c.values.filter((_, k) => k !== i) })
  else if (zone === 'rows' || zone === 'cols') move(c[zone][i], 'available')
}
function shift(zone: Zone, i: number, delta: number): void {
  const c = config.value
  if (zone === 'rows') setConfig({ ...c, rows: reorder(c.rows, i, delta) })
  else if (zone === 'cols') setConfig({ ...c, cols: reorder(c.cols, i, delta) })
  else if (zone === 'values') setConfig({ ...c, values: reorder(c.values, i, delta) })
}
function setAgg(i: number, agg: PivotAgg): void {
  setConfig({ ...config.value, values: config.value.values.map((v, k) => (k === i ? { ...v, agg } : v)) })
}

// ---- 拖曳 ----
const dragging = ref<{ zone: Zone; index: number } | null>(null)
const dropZone = ref<Zone | null>(null)
function onDragStart(e: DragEvent, zone: Zone, index: number): void {
  dragging.value = { zone, index }
  e.dataTransfer?.setData('text/plain', chipsOf(zone)[index].field)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onDrop(zone: Zone): void {
  const d = dragging.value
  dragging.value = null
  dropZone.value = null
  if (!d || d.zone === zone) return
  const field = chipsOf(d.zone)[d.index]?.field
  if (!field) return
  // 數值欄位只能放到值；從值拖走就是移除
  if (zone !== 'values' && zone !== 'available' && isMeasure(field)) return
  if (d.zone === 'values') {
    remove('values', d.index)
    if (zone !== 'available') move(field, zone)
    return
  }
  move(field, zone)
}

// ---- 計算 ----
const result = computed(() => computePivot(props.data, config.value, props.fields))
const hasGroups = computed(() => config.value.rows.length > 1)
const collapsed = ref(new Set<string>())
function initCollapsed(): void {
  const out = new Set<string>()
  const walk = (nodes: PivotRowNode[]) =>
    nodes.forEach((n) => {
      if (n.leaf) return
      if (n.depth + 1 >= props.defaultExpandDepth) out.add(n.key)
      walk(n.children)
    })
  walk(result.value.rowTree)
  collapsed.value = out
}
watch(() => config.value.rows.join('\u0001'), initCollapsed, { immediate: true })
function toggle(key: string): void {
  const next = new Set(collapsed.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  collapsed.value = next
}
function expandAll(): void {
  collapsed.value = new Set()
}
function collapseAll(): void {
  const out = new Set<string>()
  const walk = (nodes: PivotRowNode[]) => nodes.forEach((n) => (n.leaf ? null : (out.add(n.key), walk(n.children))))
  walk(result.value.rowTree)
  collapsed.value = out
}
/** 沒有列欄位時只有一列「總計」（不另外畫總計列） */
const TOTAL_ROW: PivotRowNode = { path: [], key: '\u0000total', depth: 0, leaf: true, children: [] }
const rows = computed<PivotRowNode[]>(() => (config.value.rows.length ? visibleRows(result.value.rowTree, collapsed.value) : [TOTAL_ROW]))
const leafRowCount = computed(() => {
  let n = 0
  const walk = (nodes: PivotRowNode[]) => nodes.forEach((x) => (x.leaf ? n++ : walk(x.children)))
  walk(result.value.rowTree)
  return n
})

// ---- 欄 ----
interface ValueColumn {
  colKey: string[] | null
  vi: number
  total: boolean
}
const valueColumns = computed<ValueColumn[]>(() => {
  const vs = config.value.values.map((_, vi) => vi)
  if (!config.value.cols.length) return vs.map((vi) => ({ colKey: null, vi, total: false }))
  const out: ValueColumn[] = []
  for (const ck of result.value.colKeys) for (const vi of vs) out.push({ colKey: ck, vi, total: false })
  if (props.showTotals) for (const vi of vs) out.push({ colKey: null, vi, total: true })
  return out
})
/** 欄位標題的每一層：相同前綴的連續欄合併 */
const headerLevels = computed(() => {
  const keys = result.value.colKeys
  const nv = config.value.values.length
  return config.value.cols.map((_, level) => {
    const groups: Array<{ key: string; label: string; span: number }> = []
    const prefixOf = (ck: string[]) => JSON.stringify(ck.slice(0, level + 1))
    keys.forEach((ck, i) => {
      if (i > 0 && prefixOf(keys[i - 1]) === prefixOf(ck)) groups[groups.length - 1].span += nv
      else groups.push({ key: `${level}-${i}`, label: groupText(ck[level]), span: nv })
    })
    return groups
  })
})
const showValueHeader = computed(() => config.value.values.length > 1 || !config.value.cols.length)
const headerRowCount = computed(() => headerLevels.value.length + (showValueHeader.value ? 1 : 0))

// ---- 文字 ----
const groupText = (v: string | undefined) => (v === undefined || v === '' ? t.value.pivot.blank : v)
const valueLabel = (v: PivotValue) => t.value.pivot.valueLabel(t.value.pivot.agg[v.agg], labelOf(v.field))
function format(n: number | null, v: PivotValue): string {
  if (n === null) return ''
  const f = fieldOf.value.get(v.field)?.format
  if (f && v.agg !== 'count' && v.agg !== 'countDistinct') return f(n)
  return n.toLocaleString(t.value.code, { maximumFractionDigits: v.agg === 'avg' ? 2 : 4 })
}
const cellValue = (rowPath: string[], c: ValueColumn) => result.value.value(rowPath, c.colKey, c.vi)
const cellText = (rowPath: string[], c: ValueColumn) => format(cellValue(rowPath, c), config.value.values[c.vi])

// ---- 熱度：每個值欄位依最後一層的列 × 欄比較 ----
const heatMax = computed(() => {
  if (!heat.value) return []
  const out = config.value.values.map(() => 0)
  const leaves: string[][] = []
  const walk = (nodes: PivotRowNode[]) => nodes.forEach((n) => (n.leaf ? leaves.push(n.path) : walk(n.children)))
  walk(result.value.rowTree)
  const cols = config.value.cols.length ? result.value.colKeys : [null]
  for (const p of leaves)
    for (const ck of cols)
      config.value.values.forEach((_, vi) => {
        const v = result.value.value(p, ck, vi)
        if (v !== null && Math.abs(v) > out[vi]) out[vi] = Math.abs(v)
      })
  return out
})
function heatStyle(row: PivotRowNode, c: ValueColumn) {
  if (!heat.value || !row.leaf || c.total) return undefined
  const v = cellValue(row.path, c)
  const max = heatMax.value[c.vi]
  if (v === null || !max) return undefined
  return { background: `color-mix(in srgb, rgb(var(--t-accent)) ${Math.round((Math.abs(v) / max) * 45)}%, transparent)` }
}

const instance = getCurrentInstance()
const hasCellClick = computed(() => !!instance?.vnode.props?.onCellClick)
function onCellClick(rowPath: string[], c: ValueColumn): void {
  emit('cell-click', { rowPath, colKey: c.colKey, value: config.value.values[c.vi], result: cellValue(rowPath, c) })
}

// ---- 虛擬捲動：列多時只畫看得到的部分 ----
const scroller = useTemplateRef<HTMLDivElement>('scroller')
const scrollTop = ref(0)
const onScroll = () => (scrollTop.value = scroller.value?.scrollTop ?? 0)
const windowed = computed(() => {
  const all = rows.value
  if (!props.maxHeight || all.length <= 200) return { rows: all, top: 0, bottom: 0 }
  const header = headerRowCount.value * ROW_H
  const first = Math.max(0, Math.floor((scrollTop.value - header) / ROW_H) - 20)
  const count = Math.ceil(props.maxHeight / ROW_H) + 40
  const last = Math.min(all.length, first + count)
  return { rows: all.slice(first, last), top: first * ROW_H, bottom: (all.length - last) * ROW_H }
})

// ---- 匯出 ----
function exportCsv(): void {
  const c = config.value
  const columns = [
    ...c.rows.map((f, i) => ({ key: `r${i}`, title: labelOf(f) })),
    ...valueColumns.value.map((col, i) => ({
      key: `v${i}`,
      title: [...(col.colKey ?? (c.cols.length ? [t.value.pivot.total] : [])).map(groupText), valueLabel(c.values[col.vi])].join(' / '),
    })),
  ]
  const leaves: string[][] = []
  const walk = (nodes: PivotRowNode[]) => nodes.forEach((n) => (n.leaf ? leaves.push(n.path) : walk(n.children)))
  walk(result.value.rowTree)
  const toRow = (path: string[], head: string[]) =>
    Object.fromEntries([...head.map((h, i) => [`r${i}`, h]), ...valueColumns.value.map((col, i) => [`v${i}`, cellValue(path, col) ?? ''])])
  const out = c.rows.length ? leaves.map((p) => toRow(p, p.map(groupText))) : []
  if (props.showTotals || !c.rows.length) out.push(toRow([], c.rows.length ? [t.value.pivot.grandTotal, ...c.rows.slice(1).map(() => '')] : []))
  downloadBlob(csvBlob(out, columns), `${props.filename}.csv`)
}

defineExpose({ expandAll, collapseAll, exportCsv })
</script>
