<template>
  <div class="upset-chart flex flex-col gap-2" :style="props.autoResize ? { width: '100%' } : { width: `${props.width}px`, maxWidth: '100%' }">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-secondary">
      <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
      <span>{{ props.mode === 'exclusive' ? i18n.upset.modeExclusive : i18n.upset.modeInclusive }}</span>
      <span v-if="filtered.hidden" data-hidden>{{ i18n.upset.hidden(filtered.hidden) }}</span>
    </div>
    <div ref="containerRef" class="relative overflow-x-auto" :style="{ height: `${chartHeight + 2}px` }">
      <p v-if="!cols.length" class="flex h-full items-center justify-center text-sm text-content-tertiary">{{ props.emptyText ?? i18n.upset.empty }}</p>
      <svg v-else :width="svgWidth" :height="chartHeight" class="block" role="group" :aria-label="ariaLabel" @mouseleave="onLeave">
        <!-- 交集長條 -->
        <g aria-hidden="true">
          <line v-for="tk in barTicks" :key="`g${tk}`" :x1="matrixX" :x2="matrixX + cols.length * cellW" :y1="barY(tk)" :y2="barY(tk)" :style="{ stroke: chartTheme.grid }" />
          <text v-for="tk in barTicks" :key="`t${tk}`" :x="matrixX - 6" :y="barY(tk)" dy="0.35em" text-anchor="end" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ fmt(tk) }}</text>
          <text :x="matrixX - 6" :y="TOP - 6" text-anchor="end" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ i18n.upset.count }}</text>
        </g>

        <!-- 集合列的底色與名稱、集合大小 -->
        <g v-for="(s, r) in setList" :key="`s${s.name}`" class="cursor-pointer" :data-set="s.name" @mouseenter="onSetEnter(r)" @click="emit('set-click', s)">
          <rect :x="0" :y="rowY(r) - ROW / 2" :width="matrixX + cols.length * cellW" :height="ROW" :style="{ fill: r % 2 === 0 ? chartTheme.surfaceMuted : 'transparent', opacity: hoverSet === r ? 1 : 0.7 }" />
          <rect
            :x="SETBAR - setBarLen(s.size)"
            :y="rowY(r) - 7"
            :width="setBarLen(s.size)"
            height="14"
            rx="2"
            :style="{ fill: hoverSet === r ? chartTheme.accent : barColor, opacity: dimSet(r) ? 0.35 : 1 }"
            data-setbar
          />
          <text :x="SETBAR - setBarLen(s.size) - 4" :y="rowY(r)" dy="0.35em" text-anchor="end" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ fmt(s.size) }}</text>
          <text :x="SETBAR + 8" :y="rowY(r)" dy="0.35em" font-size="12" :style="{ fill: chartTheme.text, fontWeight: hoverSet === r ? 600 : 400 }">{{ shortLabel(s.name) }}</text>
        </g>

        <!-- 每個組合：長條 + 矩陣的點 -->
        <g
          v-for="(c, i) in cols"
          :key="c.key"
          :ref="(el) => setColEl(i, el as SVGGElement | null)"
          role="button"
          :tabindex="i === tabStop ? 0 : -1"
          :aria-label="comboAria(c)"
          :aria-pressed="selectedKey === c.key"
          class="cursor-pointer outline-none"
          :data-combo="c.sets.join('+') || '∅'"
          :style="{ opacity: dimCol(i, c) ? 0.3 : 1 }"
          @mouseenter="onColEnter(i)"
          @focus="onFocus($event, i)"
          @blur="onBlur"
          @keydown="onKey($event, i)"
          @click="toggle(c)"
        >
          <rect :x="colX(i) - cellW / 2" :y="TOP - 14" :width="cellW" :height="matrixBottom - TOP + 14" :style="{ fill: selectedKey === c.key ? chartTheme.accent : hoverCol === i ? chartTheme.grid : 'transparent', opacity: selectedKey === c.key ? 0.12 : 0.6 }" />
          <rect v-if="kbFocus === i" :x="colX(i) - cellW / 2 + 1" :y="TOP - 13" :width="cellW - 2" :height="matrixBottom - TOP + 12" rx="3" fill="none" :style="{ stroke: chartTheme.accent }" stroke-width="2" />
          <rect :x="colX(i) - barW / 2" :y="barY(c.count)" :width="barW" :height="Math.max(1, barY(0) - barY(c.count))" rx="2" :style="{ fill: selectedKey === c.key || hoverCol === i ? chartTheme.accent : barColor }" data-bar />
          <text :x="colX(i)" :y="barY(c.count) - 4" text-anchor="middle" font-size="10" :style="{ fill: chartTheme.text }">{{ fmt(c.count) }}</text>
          <line
            v-if="c.degree > 1"
            :x1="colX(i)"
            :x2="colX(i)"
            :y1="rowY(minRow(c))"
            :y2="rowY(maxRow(c))"
            stroke-width="2.5"
            :style="{ stroke: selectedKey === c.key || hoverCol === i ? chartTheme.accent : chartTheme.text }"
          />
          <circle
            v-for="(s, r) in setList"
            :key="s.name"
            :cx="colX(i)"
            :cy="rowY(r)"
            :r="dotR"
            :style="{ fill: member(c, s.name) ? (selectedKey === c.key || hoverCol === i ? chartTheme.accent : chartTheme.text) : chartTheme.grid }"
            :data-dot="member(c, s.name) ? 'on' : 'off'"
          />
        </g>
      </svg>

      <div
        v-if="tip"
        class="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border px-2 py-1 text-xs shadow-md"
        :style="{ ...tip.style, background: chartTheme.surface, borderColor: chartTheme.border, color: chartTheme.text }"
        data-export-ignore
      >
        <div v-for="(line, k) in tip.lines" :key="k" :class="k === 0 ? 'font-medium' : 'text-content-secondary'">{{ line }}</div>
      </div>
    </div>

    <table class="sr-only">
      <caption>{{ props.title || i18n.upset.title }}</caption>
      <thead>
        <tr><th scope="col">{{ i18n.upset.colCombo }}</th><th scope="col">{{ i18n.upset.colDegree }}</th><th scope="col">{{ i18n.upset.count }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="c in cols" :key="c.key"><th scope="row">{{ comboName(c) }}</th><td>{{ c.degree }}</td><td>{{ fmtCount(c.count) }}</td></tr>
      </tbody>
    </table>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import * as d3 from 'd3'
import { chartPalette, chartTheme } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { tooltipPlacement } from './utils/tooltipPlacement'
import { buildUpset, filterCombos, sortCombos, upsetCombos, type UpsetCombo, type UpsetItemInput, type UpsetSet, type UpsetSetInput, type UpsetSort } from './utils/upset'
import { useLocale } from '../shared/config'
import { clipText } from '../shared/textClip'

/**
 * UpSetChart —— 集合交集圖
 *
 * 用途：哪些缺陷 / 警報 / 不良原因常常一起出現 —— 三個以上的集合用文氏圖畫不清楚，UpSet 把每一種組合排成一欄：
 * 上方長條是這個組合的數量，下方矩陣的實心點表示包含哪些集合；左側是每個集合的總數。
 *
 * - mode：exclusive 剛好是這幾個（加起來等於總數）、inclusive 至少有這幾個
 * - sort 依數量 / 組合大小 / 集合順序；minCount、degree 範圍、limit 篩選
 * - 滑過組合看數量與比例、滑過集合高亮包含它的組合；點一欄選取（v-model:selected），送出該組合的項目
 * - 鍵盤：Tab 進入後 ←→ 移動、Enter 選取、Esc 取消；附隱藏的資料表
 */

interface UpSetChartProps {
  /** 每個項目屬於哪些集合 */
  items?: UpsetItemInput[]
  /** 或：每個集合有哪些項目 */
  sets?: UpsetSetInput[]
  mode?: 'exclusive' | 'inclusive'
  sort?: UpsetSort
  /** 集合（列）的順序：依大小或照輸入 */
  setOrder?: 'size' | 'input'
  /** 數量少於它的組合不顯示 */
  minCount?: number
  minDegree?: number
  maxDegree?: number
  /** 最多顯示幾欄 */
  limit?: number
  /** 顯示「不屬於任何集合」 */
  includeEmpty?: boolean
  /** 選取的組合鍵（v-model:selected） */
  selected?: string | null
  width?: number
  autoResize?: boolean
  debounceDelay?: number
  /** 上方長條區高度 */
  barHeight?: number
  title?: string
  /** 數量單位（例如「片」） */
  unit?: string
  color?: string | null
  valueFormat?: ((value: number) => string) | null
  emptyText?: string
}

const i18n = useLocale()
const props = withDefaults(defineProps<UpSetChartProps>(), {
  items: () => [],
  sets: () => [],
  mode: 'exclusive',
  sort: 'count',
  setOrder: 'size',
  minCount: 1,
  minDegree: 0,
  maxDegree: Infinity,
  limit: 30,
  includeEmpty: false,
  selected: null,
  width: 720,
  autoResize: false,
  debounceDelay: 100,
  barHeight: 150,
  title: '',
  unit: '',
  color: null,
  valueFormat: null,
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'update:selected', key: string | null): void
  (e: 'combo-click', combo: UpsetCombo): void
  (e: 'set-click', set: UpsetSet): void
  (e: 'chart-resize', size: { width: number; height: number }): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const { effectiveWidth } = useAutoResize(containerRef, props as unknown as { width: number; height: number; autoResize: boolean; debounceDelay: number }, (s) => emit('chart-resize', s))

// ---- 資料 ----
const data = computed(() => buildUpset({ items: props.items, sets: props.sets }, props.setOrder))
const setList = computed(() => data.value.sets)
const filtered = computed(() =>
  filterCombos(sortCombos(upsetCombos(data.value, props.mode), props.sort, setList.value), {
    minCount: props.minCount,
    minDegree: props.minDegree,
    maxDegree: props.maxDegree,
    limit: props.limit,
    includeEmpty: props.includeEmpty,
  })
)
const cols = computed(() => filtered.value.combos)
const member = (c: UpsetCombo, name: string) => c.sets.includes(name)
const rowOf = computed(() => new Map(setList.value.map((s, i) => [s.name, i])))
const minRow = (c: UpsetCombo) => Math.min(...c.sets.map((s) => rowOf.value.get(s)!))
const maxRow = (c: UpsetCombo) => Math.max(...c.sets.map((s) => rowOf.value.get(s)!))

// ---- 版面 ----
const TOP = 22
const ROW = 24
const SETBAR = 72
const labelW = computed(() => {
  const units = d3.max(setList.value, (s) => [...s.name].reduce((n, ch) => n + (ch.charCodeAt(0) < 256 ? 1 : 2), 0)) ?? 4
  return Math.min(160, Math.max(48, units * 6.5 + 12))
})
const matrixX = computed(() => SETBAR + labelW.value + 12)
const cellW = computed(() => {
  const avail = effectiveWidth.value - matrixX.value - 8
  return Math.max(18, Math.min(40, avail / Math.max(1, cols.value.length)))
})
const svgWidth = computed(() => Math.max(effectiveWidth.value, matrixX.value + cols.value.length * cellW.value + 8))
const barW = computed(() => Math.max(8, cellW.value * 0.62))
const dotR = computed(() => Math.min(6, cellW.value * 0.22))
const matrixTop = computed(() => TOP + props.barHeight + 10)
const rowY = (r: number) => matrixTop.value + ROW * r + ROW / 2
const matrixBottom = computed(() => matrixTop.value + ROW * setList.value.length)
const chartHeight = computed(() => matrixBottom.value + 8)
const colX = (i: number) => matrixX.value + i * cellW.value + cellW.value / 2

const maxCount = computed(() => d3.max(cols.value, (c) => c.count) ?? 1)
const barScale = computed(() => d3.scaleLinear().domain([0, maxCount.value]).nice(4).range([TOP + props.barHeight, TOP]))
const barY = (v: number) => barScale.value(v)
const barTicks = computed(() => barScale.value.ticks(4))
const maxSet = computed(() => d3.max(setList.value, (s) => s.size) ?? 1)
const setBarLen = (size: number) => (maxSet.value ? (size / maxSet.value) * (SETBAR - 26) : 0)
const barColor = computed(() => props.color ?? chartPalette.primary)

// ---- 文字 ----
const fmt = (v: number) => (props.valueFormat ? props.valueFormat(v) : d3.format(',~d')(v))
const fmtCount = (v: number) => (props.unit ? `${fmt(v)} ${props.unit}` : fmt(v))
const pct = (v: number) => (data.value.total ? `${d3.format('.1f')((v / data.value.total) * 100)}%` : '')
const comboName = (c: UpsetCombo) => (c.degree ? c.sets.join(i18n.value.upset.joiner) : i18n.value.upset.none)
const comboAria = (c: UpsetCombo) =>
  i18n.value.upset.comboAria(comboName(c), props.mode === 'exclusive', fmtCount(c.count), pct(c.count))
function shortLabel(s: string): string {
  return clipText(s, labelW.value - 4, { min: 3 })
}
const ariaLabel = computed(() => i18n.value.upset.ariaLabel(props.title || i18n.value.upset.title, setList.value.length, cols.value.length))

// ---- 互動 ----
const hoverCol = ref<number | null>(null)
const hoverSet = ref<number | null>(null)
const selectedKey = ref<string | null>(props.selected)
watch(
  () => props.selected,
  (v) => (selectedKey.value = v)
)
const dimCol = (i: number, c: UpsetCombo) => {
  if (hoverSet.value !== null) return !member(c, setList.value[hoverSet.value].name)
  return hoverCol.value !== null && hoverCol.value !== i
}
const dimSet = (r: number) => {
  const i = hoverCol.value
  if (i === null) return false
  return !member(cols.value[i], setList.value[r].name)
}
function onLeave(): void {
  hoverCol.value = null
  hoverSet.value = null
}
function onSetEnter(r: number): void {
  hoverSet.value = r
  hoverCol.value = null
}
function onColEnter(i: number): void {
  hoverCol.value = i
  hoverSet.value = null
}
function toggle(c: UpsetCombo): void {
  selectedKey.value = selectedKey.value === c.key ? null : c.key
  emit('update:selected', selectedKey.value)
  emit('combo-click', c)
}
const tip = computed(() => {
  const s = i18n.value.upset
  if (hoverCol.value !== null && cols.value[hoverCol.value]) {
    const c = cols.value[hoverCol.value]
    const lines = [comboName(c), props.mode === 'exclusive' ? s.onlyThese : s.atLeastThese, `${fmtCount(c.count)}（${pct(c.count)}）`]
    return { lines, style: tooltipPlacement(colX(hoverCol.value), barY(c.count), svgWidth.value, chartHeight.value, 180, 70) }
  }
  if (hoverSet.value !== null) {
    const st = setList.value[hoverSet.value]
    return { lines: [st.name, s.setSize, `${fmtCount(st.size)}（${pct(st.size)}）`], style: tooltipPlacement(SETBAR + labelW.value, rowY(hoverSet.value), svgWidth.value, chartHeight.value, 180, 70) }
  }
  return null
})

// ---- 鍵盤 ----
const colEls = new Map<number, SVGGElement>()
function setColEl(i: number, el: SVGGElement | null): void {
  if (el) colEls.set(i, el)
  else colEls.delete(i)
}
const focusIndex = ref(0)
const kbFocus = ref<number | null>(null)
const tabStop = computed(() => Math.min(focusIndex.value, Math.max(0, cols.value.length - 1)))
const announcement = ref('')
function onFocus(e: FocusEvent, i: number): void {
  focusIndex.value = i
  kbFocus.value = (e.currentTarget as Element).matches?.(':focus-visible') ? i : null
  hoverCol.value = i
  hoverSet.value = null
  announcement.value = comboAria(cols.value[i])
}
function onBlur(): void {
  kbFocus.value = null
  hoverCol.value = null
}
function onKey(e: KeyboardEvent, i: number): void {
  const n = cols.value.length
  let next: number | null = null
  if (e.key === 'ArrowRight') next = Math.min(n - 1, i + 1)
  else if (e.key === 'ArrowLeft') next = Math.max(0, i - 1)
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = n - 1
  else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    toggle(cols.value[i])
    return
  } else if (e.key === 'Escape') {
    if (selectedKey.value !== null) {
      selectedKey.value = null
      emit('update:selected', null)
    }
    return
  } else return
  e.preventDefault()
  focusIndex.value = next
  void nextTick(() => colEls.get(next!)?.focus())
}

defineExpose({
  /** 目前顯示的組合（排序、篩選後） */
  combos: () => cols.value,
  /** 集合與大小 */
  sets: () => setList.value,
  /** 選取組合的項目 */
  selectedItems: () => cols.value.find((c) => c.key === selectedKey.value)?.items ?? [],
})
</script>
