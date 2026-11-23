<template>
  <div ref="rootRef" class="correlation-matrix flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
      <template v-if="props.showControls">
        <ChptSegmented :model-value="method" :options="methodOptions" :aria-label="i18n.correlation.method" size="xs" @update:model-value="(v) => setMethod(v as CorrelationMethod)" />
        <ChptSwitch :model-value="clustered" :label="i18n.correlation.cluster" size="sm" @update:model-value="setClustered" />
      </template>
    </div>

    <p v-if="props.fields.length < 2 || !props.data.length" class="rounded-md border border-dashed border-stroke-default p-6 text-center text-sm text-content-tertiary">
      {{ props.emptyText ?? i18n.correlation.empty }}
    </p>
    <div v-else class="overflow-x-auto">
      <table class="border-separate" style="border-spacing: 2px" role="grid" :aria-label="props.title || i18n.correlation.title" @keydown="onKeydown">
        <thead>
          <tr>
            <td></td>
            <th
              v-for="(c, j) in ordered"
              :key="c.key"
              scope="col"
              class="align-bottom text-xs font-medium"
              :class="j === active.col ? 'text-content-primary' : 'text-content-secondary'"
              :style="{ width: `${cell}px` }"
            >
              <span class="mx-auto block max-h-32 overflow-hidden text-ellipsis whitespace-nowrap py-1" style="writing-mode: vertical-rl">{{ c.label }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(rowF, i) in ordered" :key="rowF.key">
            <th
              scope="row"
              class="whitespace-nowrap pr-2 text-right text-xs font-medium"
              :class="i === active.row ? 'text-content-primary' : 'text-content-secondary'"
            >{{ rowF.label }}</th>
            <td
              v-for="(colF, j) in ordered"
              :key="colF.key"
              :ref="(el) => setCellEl(i, j, el as HTMLElement | null)"
              role="gridcell"
              :tabindex="visibleCell(i, j) ? (i === active.row && j === active.col ? 0 : -1) : undefined"
              :aria-label="visibleCell(i, j) ? cellLabel(i, j) : undefined"
              :aria-selected="visibleCell(i, j) ? isSelected(i, j) : undefined"
              class="rounded-sm p-0 text-center align-middle text-[11px] tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
              :class="visibleCell(i, j) ? 'cursor-pointer' : ''"
              :style="cellStyle(i, j)"
              @click="visibleCell(i, j) && select(i, j)"
              @mouseenter="visibleCell(i, j) && (hover = { row: i, col: j })"
              @mouseleave="hover = null"
              @focus="active = { row: i, col: j }"
            >
              <span v-if="visibleCell(i, j) && props.showValues && cell >= 30 && i !== j" :style="{ color: textColor(i, j) }">{{ rText(at(i, j).r) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 色階與目前這一格的說明 -->
    <div v-if="props.fields.length >= 2 && props.data.length" class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-content-secondary">
      <span class="flex items-center gap-1.5">
        −1
        <span class="h-2.5 w-28 rounded-sm" :style="{ background: gradient }" aria-hidden="true"></span>
        +1
      </span>
      <span v-if="props.alpha > 0" class="text-content-tertiary">{{ i18n.correlation.faded(props.alpha) }}</span>
      <span class="min-w-0 basis-full text-content-primary sm:basis-auto" aria-live="polite">{{ detail }}</span>
    </div>

    <!-- 點一格：兩個參數的散佈圖 -->
    <div v-if="props.showScatter && pair" class="rounded-md border border-stroke-light p-2">
      <div class="mb-1 flex items-center justify-between gap-2">
        <span class="text-xs font-medium text-content-primary">{{ i18n.correlation.pair(pair.x.label, pair.y.label) }}</span>
        <button
          type="button"
          class="rounded px-1.5 py-0.5 text-xs text-content-secondary hover:bg-surface-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          @click="pair = null"
        >{{ i18n.correlation.closePair }}</button>
      </div>
      <div :style="{ height: `${props.scatterHeight}px` }">
        <ScatterChart :data="pairPoints" :x-label="pair.x.label" :y-label="pair.y.label" regression="all" :show-legend="false" :auto-resize="true" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ScatterChart from './ScatterChart.vue'
import ChptSegmented from '../ui/ChptSegmented.vue'
import ChptSwitch from '../ui/ChptSwitch.vue'
import { chartTheme } from './chartTheme'
import { clusterOrder, correlationMatrix, toNum, type CorrelationMethod } from './utils/correlation'
import { useLocale } from '../shared/config'

/**
 * CorrelationMatrix —— 相關矩陣
 *
 * 用途：找出哪些參數彼此相關、哪些跟良率有關 —— 先看全貌，再點一格看兩個參數的散佈圖。
 *   - Pearson（線性）或 Spearman（等級，對離群值較穩）；成對完整（只用兩個值都有的資料）
 *   - 發散色階：負相關一色、正相關一色，越深越強；不顯著（p ≥ alpha）的格子淡化
 *   - 依相關性排序（聚類）：相關的參數排在一起，區塊一目了然
 *   - 點一格（或 Enter）在下方畫這兩個參數的散佈圖與迴歸線
 *   - 鍵盤：方向鍵在格子間移動、Home / End 到列頭尾
 */

interface CorrelationField {
  key: string
  label: string
}

interface CorrelationMatrixProps {
  data: Record<string, unknown>[]
  fields: CorrelationField[]
  title?: string
  /** v-model:method */
  method?: CorrelationMethod
  /** v-model:clustered：依相關性排序 */
  clustered?: boolean
  /** 只畫下三角（不重複） */
  triangle?: 'full' | 'lower'
  /** 顯著水準；p ≥ alpha 的格子淡化（0 為不淡化） */
  alpha?: number
  showValues?: boolean
  showControls?: boolean
  /** 點一格時在下方畫散佈圖 */
  showScatter?: boolean
  scatterHeight?: number
  /** 負 / 正相關的顏色（任何 CSS 顏色） */
  colors?: { negative?: string; positive?: string }
  /** 格子的最大 / 最小邊長（px） */
  maxCell?: number
  minCell?: number
  emptyText?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const i18n = useLocale()
const props = withDefaults(defineProps<CorrelationMatrixProps>(), {
  title: '',
  method: 'pearson',
  clustered: false,
  triangle: 'full',
  alpha: 0.05,
  showValues: true,
  showControls: true,
  showScatter: true,
  scatterHeight: 260,
  colors: () => ({}),
  maxCell: 56,
  minCell: 22,
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'update:method', value: CorrelationMethod): void
  (e: 'update:clustered', value: boolean): void
  (e: 'cell-click', payload: { x: string; y: string; r: number | null; n: number; p: number | null }): void
}>()

// ---- 設定 ----
const method = ref<CorrelationMethod>(props.method)
const clustered = ref(props.clustered)
watch(
  () => props.method,
  (v) => (method.value = v)
)
watch(
  () => props.clustered,
  (v) => (clustered.value = v)
)
function setMethod(v: CorrelationMethod): void {
  method.value = v
  emit('update:method', v)
}
function setClustered(v: boolean): void {
  clustered.value = v
  emit('update:clustered', v)
}
const methodOptions = computed(() => [
  { label: i18n.value.correlation.pearson, value: 'pearson' },
  { label: i18n.value.correlation.spearman, value: 'spearman' },
])

// ---- 計算 ----
const matrix = computed(() =>
  correlationMatrix(
    props.data,
    props.fields.map((f) => f.key),
    method.value
  )
)
const orderIdx = computed(() => (clustered.value ? clusterOrder(matrix.value) : props.fields.map((_, i) => i)))
const ordered = computed(() => orderIdx.value.map((i) => props.fields[i]))
const at = (i: number, j: number) => matrix.value[orderIdx.value[i]][orderIdx.value[j]]
const visibleCell = (i: number, j: number) => props.triangle === 'full' || j <= i

// ---- 版面：格子大小跟著寬度 ----
const rootRef = ref<HTMLElement | null>(null)
const width = ref(640)
let observer: ResizeObserver | null = null
onMounted(() => {
  if (rootRef.value?.clientWidth) width.value = rootRef.value.clientWidth
  if (typeof ResizeObserver !== 'undefined' && rootRef.value) {
    observer = new ResizeObserver(() => rootRef.value?.clientWidth && (width.value = rootRef.value.clientWidth))
    observer.observe(rootRef.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())
const cell = computed(() => {
  const labelW = Math.min(140, Math.max(...props.fields.map((f) => [...f.label].reduce((s, ch) => s + (ch.charCodeAt(0) > 255 ? 12 : 7), 0)), 30) + 12)
  const k = Math.max(1, props.fields.length)
  return Math.round(Math.max(props.minCell, Math.min(props.maxCell, (width.value - labelW - 2 * k) / k)))
})

// ---- 顏色 ----
const negColor = computed(() => props.colors.negative ?? 'rgb(var(--t-chart-1))')
const posColor = computed(() => props.colors.positive ?? 'rgb(var(--t-danger-solid))')
const significant = (i: number, j: number) => {
  const p = at(i, j).p
  return props.alpha <= 0 || (p !== null && p < props.alpha)
}
function cellStyle(i: number, j: number) {
  const base = { width: `${cell.value}px`, height: `${cell.value}px` }
  if (!visibleCell(i, j)) return base
  const r = at(i, j).r
  if (i === j || r === null) return { ...base, background: chartTheme.surfaceMuted }
  const pct = Math.round(Math.abs(r) * 90)
  return {
    ...base,
    background: `color-mix(in srgb, ${r < 0 ? negColor.value : posColor.value} ${pct}%, ${chartTheme.surfaceMuted})`,
    ...(significant(i, j) ? {} : { opacity: 0.35 }),
  }
}
/** 深色的格子用白字，淺的用主要文字色 */
const textColor = (i: number, j: number) => (Math.abs(at(i, j).r ?? 0) > 0.6 ? '#fff' : chartTheme.text)
const gradient = computed(() => `linear-gradient(to right, ${negColor.value}, ${chartTheme.surfaceMuted}, ${posColor.value})`)

// ---- 文字 ----
const rText = (r: number | null) => (r === null ? '' : r.toFixed(2).replace(/^(-?)0\./, '$1.').replace('-', '−'))
function pText(p: number | null): string {
  if (p === null) return '—'
  return p < 0.001 ? '< 0.001' : p.toFixed(3)
}
function cellLabel(i: number, j: number): string {
  const c = at(i, j)
  const a = ordered.value[i].label
  const b = ordered.value[j].label
  if (i === j) return i18n.value.correlation.self(a)
  if (c.r === null) return i18n.value.correlation.noData(a, b, c.n)
  return i18n.value.correlation.cell(a, b, c.r.toFixed(2), c.n, pText(c.p), significant(i, j))
}

// ---- 互動 ----
const active = ref({ row: 0, col: 0 })
const hover = ref<{ row: number; col: number } | null>(null)
const detail = computed(() => {
  const h = hover.value ?? active.value
  if (!ordered.value[h.row] || !ordered.value[h.col]) return ''
  return cellLabel(h.row, h.col)
})
const cellEls = new Map<string, HTMLElement>()
function setCellEl(i: number, j: number, el: HTMLElement | null): void {
  if (el) cellEls.set(`${i},${j}`, el)
  else cellEls.delete(`${i},${j}`)
}
function onKeydown(e: KeyboardEvent): void {
  const k = props.fields.length
  let { row, col } = active.value
  if (e.key === 'ArrowRight') col++
  else if (e.key === 'ArrowLeft') col--
  else if (e.key === 'ArrowDown') row++
  else if (e.key === 'ArrowUp') row--
  else if (e.key === 'Home') col = 0
  else if (e.key === 'End') col = props.triangle === 'lower' ? row : k - 1
  else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    select(row, col)
    return
  } else return
  e.preventDefault()
  row = Math.max(0, Math.min(k - 1, row))
  col = Math.max(0, Math.min(k - 1, col))
  if (!visibleCell(row, col)) col = row
  active.value = { row, col }
  void nextTick(() => cellEls.get(`${row},${col}`)?.focus())
}

// ---- 散佈圖 ----
const pair = ref<{ x: CorrelationField; y: CorrelationField } | null>(null)
const isSelected = (i: number, j: number) => !!pair.value && pair.value.x.key === ordered.value[j].key && pair.value.y.key === ordered.value[i].key
function select(i: number, j: number): void {
  active.value = { row: i, col: j }
  const c = at(i, j)
  emit('cell-click', { x: ordered.value[j].key, y: ordered.value[i].key, r: c.r, n: c.n, p: c.p })
  if (i !== j) pair.value = { x: ordered.value[j], y: ordered.value[i] }
}
const pairPoints = computed(() => {
  const p = pair.value
  if (!p) return []
  const out: Array<{ x: number; y: number }> = []
  for (const r of props.data) {
    const x = toNum(r[p.x.key])
    const y = toNum(r[p.y.key])
    if (x !== null && y !== null) out.push({ x, y })
  }
  return out
})
watch(
  () => props.fields.map((f) => f.key).join('\u0001'),
  () => {
    pair.value = null
    active.value = { row: 0, col: 0 }
  }
)

defineExpose({
  /** 相關矩陣（依 fields 原本的順序）：[i][j] = { r, n, p } */
  matrix,
})
</script>
