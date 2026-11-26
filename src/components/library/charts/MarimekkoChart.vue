<template>
  <div class="marimekko-chart flex flex-col gap-2" :style="props.autoResize ? { width: '100%' } : { width: `${props.width}px`, maxWidth: '100%' }">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-secondary">
      <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
      <span v-if="data.total" data-total>{{ t.total(fmtValue(data.total), data.columns.length) }}</span>
      <span v-if="props.mode === 'residual'" class="text-content-tertiary" data-mode>{{ t.residualHint }}</span>
    </div>

    <!-- 圖例：段（點選標示）或殘差色階 -->
    <div v-if="data.segments.length" class="flex flex-wrap items-center gap-2 text-xs" data-legend>
      <template v-if="props.mode === 'share'">
        <button
          v-for="(s, k) in data.segments"
          :key="s"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5"
          :class="selectedSeg === s ? 'border-stroke-focus bg-surface-secondary text-content-primary' : 'border-stroke-light text-content-secondary hover:bg-surface-secondary'"
          :aria-pressed="selectedSeg === s"
          :data-seg="s"
          @click="toggleSeg(s)"
          @mouseenter="hoverSeg = s"
          @mouseleave="hoverSeg = null"
        >
          <span class="inline-block h-2.5 w-2.5 rounded-sm" :style="{ background: segColor(k) }" aria-hidden="true" />
          {{ s }}
        </button>
      </template>
      <span v-else class="inline-flex items-center gap-2 text-content-secondary">
        {{ t.fewer }}
        <span class="inline-block h-2.5 w-28 rounded-sm" :style="{ background: `linear-gradient(to right, ${resColor(-props.residualMax)}, ${resColor(0)}, ${resColor(props.residualMax)})` }" aria-hidden="true" />
        {{ t.more }}
      </span>
    </div>

    <div ref="containerRef" class="relative" :style="{ height: `${props.height}px` }">
      <p v-if="!data.columns.length" class="flex h-full items-center justify-center text-sm text-content-tertiary">{{ props.emptyText ?? t.empty }}</p>
      <svg
        v-else
        :width="svgW"
        :height="props.height"
        class="block rounded outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
        role="group"
        tabindex="0"
        :aria-label="ariaLabel"
        :aria-describedby="hintId"
        @keydown="onKey"
        @focus="onFocus"
        @blur="onBlur"
        @mouseleave="onLeave"
      >
        <g :transform="`translate(${M.l},${M.t})`">
          <!-- y 軸（欄內比例） -->
          <g aria-hidden="true">
            <template v-for="tk in [0, 0.25, 0.5, 0.75, 1]" :key="tk">
              <line :x1="-4" :x2="0" :y1="tk * plotH" :y2="tk * plotH" :style="{ stroke: chartTheme.axis }" />
              <text :x="-6" :y="tk * plotH" dy="0.35em" text-anchor="end" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ Math.round((1 - tk) * 100) }}%</text>
            </template>
          </g>
          <!-- 格子 -->
          <g
            v-for="r in layout.rects"
            :key="`${r.col}-${r.seg}`"
            :data-cell="`${r.cell.x}|${r.cell.y}`"
            class="cursor-pointer"
            :style="{ opacity: dimCell(r) ? 0.25 : 1 }"
            @mouseenter="active = { col: r.col, seg: r.seg }"
            @click="onCellClick(r)"
          >
            <rect
              :x="r.x"
              :y="plotH - r.y - r.h"
              :width="Math.max(0, r.w)"
              :height="Math.max(0, r.h)"
              :style="{ fill: cellFill(r), stroke: chartTheme.surface }"
              stroke-width="1"
            />
            <text
              v-if="r.w >= 34 && r.h >= 16"
              :x="r.x + r.w / 2"
              :y="plotH - r.y - r.h / 2"
              dy="0.35em"
              text-anchor="middle"
              font-size="10"
              font-weight="600"
              :style="{ fill: labelFill(r), pointerEvents: 'none' }"
            >{{ fmtPct(r.cell.share) }}</text>
          </g>
          <!-- 目前格子外框 -->
          <rect
            v-if="activeRect"
            :x="activeRect.x + 1"
            :y="plotH - activeRect.y - activeRect.h + 1"
            :width="Math.max(0, activeRect.w - 2)"
            :height="Math.max(0, activeRect.h - 2)"
            fill="none"
            stroke-width="2"
            :style="{ stroke: chartTheme.text, pointerEvents: 'none' }"
            data-active
          />
          <!-- 欄標題：名稱與占比 -->
          <g aria-hidden="true">
            <template v-for="(c, i) in data.columns" :key="c.key">
              <text v-if="layout.columns[i].w >= 24" :x="layout.columns[i].x + layout.columns[i].w / 2" :y="plotH + 14" text-anchor="middle" font-size="11" :style="{ fill: chartTheme.text }">{{ shortText(c.key, layout.columns[i].w) }}</text>
              <text v-if="layout.columns[i].w >= 24" :x="layout.columns[i].x + layout.columns[i].w / 2" :y="plotH + 27" text-anchor="middle" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ fmtPct(c.share) }}</text>
            </template>
          </g>
        </g>
      </svg>

      <div
        v-if="tip"
        class="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border px-2 py-1 text-xs shadow-md"
        :style="{ ...tip.style, background: chartTheme.surface, borderColor: chartTheme.border, color: chartTheme.text }"
        data-export-ignore
        data-tip
      >
        <div v-for="(line, k) in tip.lines" :key="k" :class="k === 0 ? 'font-medium' : 'text-content-secondary'">{{ line }}</div>
      </div>
    </div>

    <table class="sr-only">
      <caption>{{ props.title || t.title }}</caption>
      <thead>
        <tr>
          <th scope="col">{{ t.column }}</th>
          <th v-for="s in data.segments" :key="s" scope="col">{{ s }}</th>
          <th scope="col">{{ t.sum }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in data.columns" :key="c.key">
          <th scope="row">{{ c.key }}</th>
          <td v-for="cell in c.cells" :key="cell.y">{{ t.cell(fmtValue(cell.value), fmtPct(cell.share)) }}</td>
          <td>{{ fmtValue(c.total) }}</td>
        </tr>
      </tbody>
    </table>
    <p :id="hintId" class="sr-only">{{ t.hint }}</p>
    <span class="sr-only" aria-live="polite" data-live>{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import * as d3 from 'd3'
import { chartPalette, chartTheme } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { tooltipPlacement } from './utils/tooltipPlacement'
import { buildMekko, mekkoLayout, type MekkoCell, type MekkoInput, type MekkoRect } from './utils/marimekko'
import { useLocale } from '../shared/config'

/**
 * MarimekkoChart —— 馬賽克圖
 *
 * 兩個維度的組成：欄寬是各欄的總量（例如各產線的不良數），欄內高度是各類別的比例（例如不良類型）。
 * 寬的欄是「量大的」，同一種顏色在各欄高低不同就是「組成不同」。
 * mode="residual" 改用 Pearson 殘差上色：紅色 = 比預期多、藍色 = 比預期少，一眼找出特別的組合。
 */

export interface MarimekkoChartProps {
  data: MekkoInput[]
  mode?: 'share' | 'residual'
  sortColumns?: 'input' | 'total'
  sortSegments?: 'input' | 'total'
  /** 最多幾段，其餘併成「其他」 */
  maxSegments?: number
  /** 標示的段（v-model:selected） */
  selected?: string | null
  /** 殘差色階的上限（超過的顏色一樣深） */
  residualMax?: number
  colors?: string[] | null
  width?: number
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  title?: string
  unit?: string
  valueFormat?: ((v: number) => string) | null
  emptyText?: string
}

const i18n = useLocale()
const t = computed(() => i18n.value.marimekko)
const props = withDefaults(defineProps<MarimekkoChartProps>(), {
  mode: 'share',
  sortColumns: 'input',
  sortSegments: 'input',
  maxSegments: 8,
  selected: null,
  residualMax: 4,
  colors: null,
  width: 720,
  height: 360,
  autoResize: false,
  debounceDelay: 100,
  title: '',
  unit: '',
  valueFormat: null,
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'update:selected', segment: string | null): void
  (e: 'cell-click', cell: MekkoCell): void
  (e: 'chart-resize', size: { width: number; height: number }): void
}>()

const hintId = `${useId()}-hint`
const containerRef = ref<HTMLElement | null>(null)
const { effectiveWidth } = useAutoResize(containerRef, props as unknown as { width: number; height: number; autoResize: boolean; debounceDelay: number }, (s) => emit('chart-resize', s))

const data = computed(() =>
  buildMekko(props.data, { sortColumns: props.sortColumns, sortSegments: props.sortSegments, maxSegments: props.maxSegments, otherLabel: t.value.other })
)
const M = { l: 40, r: 8, t: 6, b: 34 }
const svgW = computed(() => Math.max(200, effectiveWidth.value))
const plotW = computed(() => svgW.value - M.l - M.r)
const plotH = computed(() => props.height - M.t - M.b)
const layout = computed(() => mekkoLayout(data.value, plotW.value, plotH.value, 2))
const rectAt = (col: number, seg: number) => layout.value.rects.find((r) => r.col === col && r.seg === seg)

// ---- 顏色 ----
const segColor = (k: number) => {
  const list = props.colors ?? chartPalette.categorical
  const s = data.value.segments[k]
  if (data.value.folded.length && s === t.value.other && !props.colors) return chartPalette.other
  return list[k % list.length]
}
/** 殘差：負 → 強調色（藍），正 → 危險色（紅），0 → 底色 */
function resColor(r: number): string {
  const v = Math.max(-1, Math.min(1, r / props.residualMax))
  const base = v >= 0 ? 'var(--t-danger-solid)' : 'var(--t-accent)'
  const a = Math.abs(v) * 0.85 + 0.06
  return `rgb(${base} / ${a.toFixed(2)})`
}
const cellFill = (r: MekkoRect) => (props.mode === 'residual' ? resColor(r.cell.residual) : segColor(r.seg))
const labelFill = (r: MekkoRect) => (props.mode === 'residual' ? (Math.abs(r.cell.residual) > props.residualMax * 0.55 ? '#fff' : chartTheme.text) : '#fff')

// ---- 文字 ----
const fmtValue = (v: number) => {
  const s = props.valueFormat ? props.valueFormat(v) : d3.format(',~d')(Math.round(v * 100) / 100)
  return props.unit ? `${s} ${props.unit}` : s
}
const fmtPct = (v: number) => `${d3.format('.1f')(v * 100)}%`
function shortText(s: string, room: number): string {
  const budget = Math.max(2, Math.floor((room - 2) / 6.5))
  let used = 0
  let out = ''
  for (const ch of s) {
    used += ch.charCodeAt(0) < 256 ? 1 : 2
    if (used > budget) return `${out}…`
    out += ch
  }
  return out
}
const ariaLabel = computed(() => t.value.ariaLabel(props.title || t.value.title, data.value.columns.length, data.value.segments.length))
function cellLines(r: MekkoRect): string[] {
  const s = t.value
  const c = r.cell
  const lines = [`${c.x} · ${c.y}`, fmtValue(c.value), s.shares(fmtPct(c.share), c.x, fmtPct(c.shareTotal))]
  if (props.mode === 'residual') lines.push(s.residualLine(d3.format('+.2f')(c.residual), fmtValue(Math.round(c.expected * 10) / 10)))
  return lines
}

// ---- 互動 ----
const active = ref<{ col: number; seg: number } | null>(null)
const activeRect = computed(() => (active.value ? rectAt(active.value.col, active.value.seg) : undefined))
const hoverSeg = ref<string | null>(null)
const selectedSeg = ref<string | null>(props.selected)
watch(
  () => props.selected,
  (v) => (selectedSeg.value = v)
)
watch(data, (d) => {
  if (selectedSeg.value && !d.segments.includes(selectedSeg.value)) selectedSeg.value = null
})
const focusSeg = computed(() => hoverSeg.value ?? selectedSeg.value)
// 殘差模式沒有類別圖例，不淡化（避免看不出顏色、也無從取消）
const dimCell = (r: MekkoRect) => props.mode === 'share' && focusSeg.value !== null && r.cell.y !== focusSeg.value
function toggleSeg(s: string): void {
  selectedSeg.value = selectedSeg.value === s ? null : s
  emit('update:selected', selectedSeg.value)
}
function onCellClick(r: MekkoRect): void {
  emit('cell-click', r.cell)
}
const tip = computed(() => {
  const r = activeRect.value
  if (!r) return null
  const lines = cellLines(r)
  return { lines, style: tooltipPlacement(M.l + r.x + r.w / 2, M.t + plotH.value - r.y - r.h / 2, svgW.value, props.height, 200, 18 * lines.length + 10) }
})
function onLeave(): void {
  if (!kbActive) active.value = null
}

// ---- 鍵盤：←→ 欄、↑↓ 段 ----
let kbActive = false
const announcement = ref('')
function announce(): void {
  const r = activeRect.value
  if (r) announcement.value = cellLines(r).join(t.value.sep)
}
function onFocus(): void {
  kbActive = true
  if (!active.value) active.value = { col: 0, seg: 0 }
  announce()
}
function onBlur(): void {
  kbActive = false
  active.value = null
}
function onKey(e: KeyboardEvent): void {
  const a = active.value ?? { col: 0, seg: 0 }
  const nc = data.value.columns.length
  const ns = data.value.segments.length
  const next: Record<string, { col: number; seg: number }> = {
    ArrowRight: { col: Math.min(nc - 1, a.col + 1), seg: a.seg },
    ArrowLeft: { col: Math.max(0, a.col - 1), seg: a.seg },
    ArrowUp: { col: a.col, seg: Math.min(ns - 1, a.seg + 1) },
    ArrowDown: { col: a.col, seg: Math.max(0, a.seg - 1) },
    Home: { col: 0, seg: a.seg },
    End: { col: nc - 1, seg: a.seg },
  }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    const r = rectAt(a.col, a.seg)
    if (r) emit('cell-click', r.cell)
    return
  }
  if (e.key === 'Escape') {
    if (selectedSeg.value !== null) toggleSeg(selectedSeg.value)
    return
  }
  if (!next[e.key]) return
  e.preventDefault()
  active.value = next[e.key]
  announce()
}

defineExpose({
  /** 欄、段、各格的值、比例與殘差 */
  result: () => data.value,
})
</script>
