<template>
  <div class="bump-chart flex flex-col gap-2" :style="props.autoResize ? { width: '100%' } : { width: `${props.width}px`, maxWidth: '100%' }">
    <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
    <div ref="containerRef" class="relative overflow-x-auto overflow-y-hidden" :style="{ height: `${chartHeight + 2}px` }">
      <p v-if="!rows.length || !props.periods.length" class="flex h-full items-center justify-center text-sm text-content-tertiary">{{ props.emptyText ?? i18n.bump.empty }}</p>
      <svg v-else :width="chartWidth" :height="chartHeight" class="block overflow-visible" role="group" :aria-label="ariaLabel" @mouseleave="hoverName = null; hoverPoint = null">
        <!-- 期別與格線 -->
        <g aria-hidden="true">
          <g v-for="(p, i) in props.periods" :key="`p${i}`">
            <line :x1="x(i)" :x2="x(i)" :y1="M.top - 4" :y2="plotBottom" :style="{ stroke: chartTheme.grid }" />
            <text :x="x(i)" :y="M.top - 12" text-anchor="middle" font-size="11" :style="{ fill: chartTheme.textMuted }">{{ p }}</text>
          </g>
          <template v-if="props.display === 'value'">
            <text v-for="tk in valueTicks" :key="`v${tk}`" x="0" :y="y(tk)" dy="0.35em" text-anchor="start" font-size="10" :style="{ fill: chartTheme.textMuted }" data-tick>{{ fmt(tk) }}</text>
          </template>
        </g>

        <!-- 序列（DOM 順序固定：重排會讓鍵盤焦點掉失；高亮的另外疊一份在最上面） -->
        <g
          v-for="r in rows"
          :key="r.index"
          :ref="(el) => setRowEl(r.name, el as SVGGElement | null)"
          role="button"
          :tabindex="r.name === tabStop ? 0 : -1"
          :aria-label="seriesAria(r)"
          :aria-pressed="selectedName === r.name"
          class="cursor-pointer outline-none"
          :data-series="r.name"
          @mouseenter="hoverName = r.name"
          @focus="onFocus($event, r)"
          @blur="onBlur"
          @keydown="onKey($event, r)"
          @click="toggle(r)"
        >
          <path :d="linePath(r)" fill="none" :stroke-width="emphasis(r) === 'on' ? 4 : 2.5" stroke-linecap="round" :style="{ stroke: lineColor(r), opacity: emphasis(r) === 'off' ? 0.35 : 1 }" data-line />
          <!-- 加粗的透明線：好點 -->
          <path :d="linePath(r)" fill="none" stroke="transparent" stroke-width="14" />
          <template v-for="(rank, p) in r.ranks" :key="p">
            <g v-if="rank !== null && pointY(r, p) !== null" :transform="`translate(${x(p)}, ${pointY(r, p)})`" :data-point="p" @mouseenter="hoverPoint = { name: r.name, p }">
              <circle :r="dotR" :style="{ fill: lineColor(r), stroke: chartTheme.surface, opacity: emphasis(r) === 'off' ? 0.45 : 1 }" stroke-width="2" />
              <text v-if="rankInDot" dy="0.35em" text-anchor="middle" font-size="10" font-weight="600" :style="{ fill: chartTheme.surface, opacity: emphasis(r) === 'off' ? 0.6 : 1 }">{{ rank }}</text>
            </g>
          </template>
          <rect
            v-if="kbFocus === r.name"
            :x="x(0) - dotR - 4"
            :y="(pointY(r, firstIdx(r)) ?? M.top) - dotR - 4"
            :width="dotR * 2 + 8"
            :height="dotR * 2 + 8"
            rx="6"
            fill="none"
            :style="{ stroke: chartTheme.accent }"
            stroke-width="2"
          />
          <!-- 兩端標籤 -->
          <text
            v-if="r.first !== null"
            :x="x(firstIdx(r)) - dotR - 6"
            :y="labelY(r, firstIdx(r))"
            dy="0.35em"
            text-anchor="end"
            font-size="12"
            :font-weight="emphasis(r) === 'on' ? 600 : 400"
            :style="{ fill: chartTheme.text, opacity: emphasis(r) === 'off' ? 0.5 : 1 }"
            data-label="start"
          >
            {{ shortLabel(r.name) }}
          </text>
          <text
            v-if="r.last !== null"
            :x="x(lastIdx(r)) + dotR + 6"
            :y="labelY(r, lastIdx(r))"
            dy="0.35em"
            font-size="12"
            :font-weight="emphasis(r) === 'on' ? 600 : 400"
            :style="{ fill: chartTheme.text, opacity: emphasis(r) === 'off' ? 0.5 : 1 }"
            data-label="end"
          >
            {{ shortLabel(r.name) }}
            <tspan v-if="r.change !== null" :style="{ fill: changeColor(r.change) }" font-size="11">{{ changeText(r.change) }}</tspan>
          </text>
        </g>
        <!-- 高亮的序列疊在最上面（只是畫面，不接收操作） -->
        <g v-if="focusRow" aria-hidden="true" pointer-events="none" data-overlay>
          <path :d="linePath(focusRow)" fill="none" stroke-width="4" stroke-linecap="round" :style="{ stroke: colorOf(focusRow) }" />
          <template v-for="(rank, p) in focusRow.ranks" :key="p">
            <g v-if="rank !== null && pointY(focusRow, p) !== null" :transform="`translate(${x(p)}, ${pointY(focusRow, p)})`">
              <circle :r="dotR" :style="{ fill: colorOf(focusRow), stroke: chartTheme.surface }" stroke-width="2" />
              <text v-if="rankInDot" dy="0.35em" text-anchor="middle" font-size="10" font-weight="600" :style="{ fill: chartTheme.surface }">{{ rank }}</text>
            </g>
          </template>
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
      <caption>{{ props.title || i18n.bump.title }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ i18n.bump.colName }}</th>
          <th v-for="(p, i) in props.periods" :key="i" scope="col">{{ p }}</th>
          <th scope="col">{{ i18n.bump.colChange }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in byLast" :key="r.index">
          <th scope="row">{{ r.name }}</th>
          <td v-for="(rank, p) in r.ranks" :key="p">{{ rank === null ? i18n.bump.noData : cellText(r, p) }}</td>
          <td>{{ r.change === null ? i18n.bump.noData : changeWords(r.change) }}</td>
        </tr>
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
import { bumpRows, maxRank, sortByLastRank, tieOffsets, type BumpRow, type BumpSeriesInput } from './utils/bump'
import { dodgeLabels } from './utils/dumbbell'
import { useLocale } from '../shared/config'
import { clipText } from '../shared/textClip'

/**
 * BumpChart —— 排名變化圖
 *
 * 用途：排名怎麼隨時間變 —— 各線每月良率排名、供應商評分排名、各站停機時間排名。
 * 每期依數值排名（order：越大越前或越小越前，同分同名次），名次 1 在最上面；每個點裡寫名次，右側標出首末期的名次變化（▲ 進步、▼ 退步）。
 *
 * - display：顯示名次（等距）或實際值（看差距多大）
 * - 點一條線高亮（v-model:selected），滑過也會高亮；缺期的地方斷開
 * - 鍵盤：Tab 進入後 ↑↓ 換序列、←→ 換期、Enter 高亮、Esc 取消；附隱藏的名次表
 */

interface BumpChartProps {
  series: BumpSeriesInput[]
  /** 期別（x 軸標籤），長度決定期數 */
  periods: string[]
  /** desc：數值大的排第 1；asc：數值小的排第 1 */
  order?: 'desc' | 'asc'
  /** values 是數值（自動排名）或已經是名次 */
  valueType?: 'value' | 'rank'
  /** y 軸：名次或實際值 */
  display?: 'rank' | 'value'
  /** 高亮的序列（v-model:selected） */
  selected?: string | null
  curve?: 'bump' | 'linear'
  width?: number
  /** 高度；0 = 依名次數自動 */
  height?: number
  /** 每個名次的間距（px） */
  rowGap?: number
  autoResize?: boolean
  debounceDelay?: number
  title?: string
  unit?: string
  valueFormat?: ((value: number) => string) | null
  emptyText?: string
}

const i18n = useLocale()
const props = withDefaults(defineProps<BumpChartProps>(), {
  order: 'desc',
  valueType: 'value',
  display: 'rank',
  selected: null,
  curve: 'bump',
  width: 720,
  height: 0,
  rowGap: 30,
  autoResize: false,
  debounceDelay: 100,
  title: '',
  unit: '',
  valueFormat: null,
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'update:selected', name: string | null): void
  (e: 'series-click', row: BumpRow): void
  (e: 'chart-resize', size: { width: number; height: number }): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const { effectiveWidth } = useAutoResize(containerRef, props as unknown as { width: number; height: number; autoResize: boolean; debounceDelay: number }, (s) => emit('chart-resize', s))

// ---- 資料 ----
const rows = computed(() => bumpRows(props.series, { periods: props.periods.length, order: props.order, valueType: props.valueType }))
const byLast = computed(() => sortByLastRank(rows.value))
const maxR = computed(() => maxRank(rows.value))
const firstIdx = (r: BumpRow) => r.ranks.findIndex((x) => x !== null)
const lastIdx = (r: BumpRow) => {
  for (let i = r.ranks.length - 1; i >= 0; i--) if (r.ranks[i] !== null) return i
  return -1
}

// ---- 版面 ----
const M = { top: 28, bottom: 14 }
const labelW = computed(() => {
  const units = d3.max(rows.value, (r) => [...r.name].reduce((n, ch) => n + (ch.charCodeAt(0) < 256 ? 1 : 2), 0)) ?? 4
  return Math.min(Math.max(240, effectiveWidth.value) * 0.22, Math.max(36, units * 6.5 + 8))
})
const dotR = computed(() => (props.display === 'rank' ? 10 : 4.5))
/** 每期至少要有的寬度；放不下時圖變寬、在容器內左右捲動 */
const minStep = computed(() => Math.max(32, dotR.value * 2 + 12))
const chartWidth = computed(() => {
  const side = (labelW.value + dotR.value) * 2 + 50 + (props.display === 'value' ? 40 : 0)
  return Math.max(240, effectiveWidth.value, side + Math.max(0, props.periods.length - 1) * minStep.value)
})
const rankInDot = computed(() => props.display === 'rank')
/** 數值模式時最左邊留給刻度 */
const plotLeft = computed(() => labelW.value + dotR.value + 10 + (props.display === 'value' ? 40 : 0))
const plotRight = computed(() => chartWidth.value - labelW.value - dotR.value - 40)
const autoHeight = computed(() => M.top + (maxR.value - 1) * props.rowGap + M.bottom + 2 * dotR.value + 4)
const chartHeight = computed(() => (props.height > 0 ? props.height : autoHeight.value))
const plotTop = computed(() => M.top + dotR.value + 2)
const plotBottom = computed(() => chartHeight.value - M.bottom - dotR.value)
const xScale = computed(() =>
  d3
    .scalePoint<number>()
    .domain(props.periods.map((_, i) => i))
    .range([plotLeft.value, Math.max(plotLeft.value + 1, plotRight.value)])
)
const x = (i: number) => xScale.value(i) ?? plotLeft.value
const rankY = computed(() => d3.scaleLinear().domain([1, Math.max(2, maxR.value)]).range([plotTop.value, plotBottom.value]))
const valueExtent = computed(() => {
  const vs = rows.value.flatMap((r) => r.values.filter((v): v is number => v !== null))
  const lo = d3.min(vs) ?? 0
  const hi = d3.max(vs) ?? 1
  return lo === hi ? [lo - 1, hi + 1] : [lo, hi]
})
const valueY = computed(() => {
  const [lo, hi] = valueExtent.value
  // 名次 1 在上：desc 時大的在上、asc 時小的在上
  return d3.scaleLinear().domain(props.order === 'desc' ? [hi, lo] : [lo, hi]).range([plotTop.value, plotBottom.value]).nice()
})
const valueTicks = computed(() => valueY.value.ticks(5))
const y = (v: number) => (props.display === 'rank' ? rankY.value(v) : valueY.value(v))
/** 某序列第 p 期的 y（名次模式用名次、數值模式用數值；值模式下沒有數值時為 null） */
function pointY(r: BumpRow, p: number): number | null {
  if (props.display === 'rank') return r.ranks[p] === null ? null : rankY.value(r.ranks[p]!)
  return r.values[p] === null ? null : valueY.value(r.values[p]!)
}
function linePath(r: BumpRow): string {
  const pts = r.ranks.map((_, p) => [p, pointY(r, p)] as const)
  return (
    d3
      .line<readonly [number, number | null]>()
      .defined((d) => d[1] !== null)
      .x((d) => x(d[0]))
      .y((d) => d[1]!)
      .curve(props.curve === 'bump' ? d3.curveBumpX : d3.curveLinear)(pts) ?? ''
  )
}
/** 同名次的標籤上下錯開 */
const ties = computed(() => {
  const m = new Map<number, Map<string, { k: number; n: number }>>()
  props.periods.forEach((_, p) => m.set(p, tieOffsets(rows.value, p)))
  return m
})
/** 數值模式：同一期的標籤依位置避開重疊（間距 13px） */
const dodged = computed(() => {
  const out = new Map<string, number>()
  if (props.display !== 'value') return out
  const groups = new Map<number, { key: string; y: number }[]>()
  for (const r of rows.value) {
    for (const p of [firstIdx(r), lastIdx(r)]) {
      const yy = p >= 0 ? pointY(r, p) : null
      if (yy === null) continue
      const g = groups.get(p) ?? []
      if (!g.some((x) => x.key === `${r.name}@${p}`)) g.push({ key: `${r.name}@${p}`, y: yy })
      groups.set(p, g)
    }
  }
  for (const g of groups.values()) {
    const ys = dodgeLabels(
      g.map((x) => x.y),
      13,
      plotTop.value - dotR.value,
      plotBottom.value + dotR.value
    )
    g.forEach((x, k) => out.set(x.key, ys[k]))
  }
  return out
})
function labelY(r: BumpRow, p: number): number {
  const base = pointY(r, p) ?? plotTop.value
  if (props.display === 'value') return dodged.value.get(`${r.name}@${p}`) ?? base
  const t = ties.value.get(p)?.get(r.name)
  return t && t.n > 1 ? base + (t.k - (t.n - 1) / 2) * 13 : base
}

// ---- 顏色與文字 ----
const colorOf = (r: BumpRow) => r.color ?? (r.index < chartPalette.categorical.length ? chartPalette.categorical[r.index] : chartPalette.other)
const fmt = (v: number) => (props.valueFormat ? props.valueFormat(v) : d3.format(',~f')(Number(v.toPrecision(5))))
const withUnit = (v: number) => (props.unit ? `${fmt(v)} ${props.unit}` : fmt(v))
const changeText = (c: number) => (c > 0 ? ` ▲${c}` : c < 0 ? ` ▼${-c}` : ' =')
/** 變化標示是文字：用文字色（深色模式會變亮），不用填色 */
const changeColor = (c: number) => (c > 0 ? chartTheme.success : c < 0 ? chartTheme.danger : chartTheme.textMuted)
const changeWords = (c: number) => (c > 0 ? i18n.value.bump.up(c) : c < 0 ? i18n.value.bump.down(-c) : i18n.value.bump.same)
function cellText(r: BumpRow, p: number): string {
  const s = i18n.value.bump
  const v = r.values[p]
  return props.valueType === 'value' && v !== null ? `${s.rank(r.ranks[p]!)}（${withUnit(v)}）` : s.rank(r.ranks[p]!)
}
function seriesAria(r: BumpRow): string {
  const s = i18n.value.bump
  const parts = [r.name]
  if (r.first !== null) parts.push(s.fromTo(props.periods[firstIdx(r)], r.first, props.periods[lastIdx(r)], r.last!))
  if (r.change !== null) parts.push(changeWords(r.change))
  if (r.best !== null) parts.push(s.best(r.best))
  return parts.join(s.separator)
}
function pointLines(r: BumpRow, p: number): string[] {
  const s = i18n.value.bump
  const v = r.values[p]
  const lines = [r.name, props.periods[p]]
  if (r.ranks[p] === null) lines.push(s.noData)
  else lines.push(s.rank(r.ranks[p]!))
  if (props.valueType === 'value' && v !== null) lines.push(withUnit(v))
  return lines
}
function shortLabel(s: string): string {
  return clipText(s, labelW.value - 4, { min: 3 })
}
const ariaLabel = computed(() => i18n.value.bump.ariaLabel(props.title || i18n.value.bump.title, rows.value.length, props.periods.length))

// ---- 高亮 ----
const hoverName = ref<string | null>(null)
const hoverPoint = ref<{ name: string; p: number } | null>(null)
const selectedName = ref<string | null>(props.selected)
watch(
  () => props.selected,
  (v) => (selectedName.value = v)
)
const focusName = computed(() => hoverName.value ?? selectedName.value)
const emphasis = (r: BumpRow): 'on' | 'off' | 'normal' => (focusName.value === null ? 'normal' : focusName.value === r.name ? 'on' : 'off')
const lineColor = (r: BumpRow) => (emphasis(r) === 'off' ? chartPalette.muted : colorOf(r))
const focusRow = computed(() => rows.value.find((r) => r.name === focusName.value) ?? null)
function toggle(r: BumpRow): void {
  selectedName.value = selectedName.value === r.name ? null : r.name
  emit('update:selected', selectedName.value)
  emit('series-click', r)
}
const tip = computed(() => {
  const hp = hoverPoint.value
  if (!hp) return null
  const r = rows.value.find((x) => x.name === hp.name)
  const py = r ? pointY(r, hp.p) : null
  if (!r || py === null) return null
  return { lines: pointLines(r, hp.p), style: tooltipPlacement(x(hp.p), py, chartWidth.value, chartHeight.value, 160, 70) }
})

// ---- 鍵盤 ----
const rowEls = new Map<string, SVGGElement>()
function setRowEl(name: string, el: SVGGElement | null): void {
  if (el) rowEls.set(name, el)
  else rowEls.delete(name)
}
const focusKey = ref<string | null>(null)
const kbFocus = ref<string | null>(null)
const tabStop = computed(() => (focusKey.value && rows.value.some((r) => r.name === focusKey.value) ? focusKey.value : (byLast.value[0]?.name ?? null)))
const announcement = ref('')
function onFocus(e: FocusEvent, r: BumpRow): void {
  focusKey.value = r.name
  kbFocus.value = (e.currentTarget as Element).matches?.(':focus-visible') ? r.name : null
  hoverName.value = r.name
  announcement.value = seriesAria(r)
}
function onBlur(): void {
  kbFocus.value = null
  hoverName.value = null
  hoverPoint.value = null
}
function onKey(e: KeyboardEvent, r: BumpRow): void {
  const list = byLast.value
  const i = list.findIndex((x) => x.name === r.name)
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const next = list[Math.max(0, Math.min(list.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]
    focusKey.value = next.name
    const name = next.name
    void nextTick(() => rowEls.get(name)?.focus())
    return
  }
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault()
    const n = props.periods.length
    const cur = hoverPoint.value?.name === r.name ? hoverPoint.value.p : e.key === 'ArrowRight' ? -1 : n
    const p = Math.max(0, Math.min(n - 1, cur + (e.key === 'ArrowRight' ? 1 : -1)))
    hoverPoint.value = { name: r.name, p }
    announcement.value = pointLines(r, p).join(i18n.value.bump.separator)
    return
  }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    toggle(r)
  } else if (e.key === 'Escape') {
    hoverPoint.value = null
    if (selectedName.value !== null) {
      selectedName.value = null
      emit('update:selected', null)
    }
  }
}

defineExpose({
  /** 各序列的名次與變化 */
  rows: () => rows.value,
})
</script>
