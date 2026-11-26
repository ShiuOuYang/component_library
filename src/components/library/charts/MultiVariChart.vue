<template>
  <div class="multi-vari-chart flex flex-col gap-2" :style="props.autoResize ? { width: '100%' } : { width: `${props.width}px`, maxWidth: '100%' }">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-secondary">
      <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
      <span v-if="data.dominant" data-dominant>
        {{ t.dominant(nameOf(data.dominant), fmtPct(data.sources.find((s) => s.source === data.dominant)!.pct)) }}
      </span>
    </div>

    <!-- 變異來源（平方和占比） -->
    <div v-if="props.showSummary && data.all.n" class="flex flex-wrap items-center gap-2 text-xs" :aria-label="t.sourcesTitle" role="list" data-sources>
      <span
        v-for="s in data.sources"
        :key="s.source"
        role="listitem"
        class="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5"
        :class="s.source === data.dominant ? 'border-accent bg-accent-subtle text-accent-on-subtle font-semibold' : 'border-stroke-light text-content-secondary'"
        :data-source="s.source"
      >
        {{ nameOf(s.source) }}
        <span class="inline-block h-1.5 w-12 overflow-hidden rounded-full bg-surface-tertiary" aria-hidden="true">
          <span class="block h-full rounded-full" :style="{ width: `${s.pct}%`, background: s.source === data.dominant ? chartTheme.accent : chartTheme.textMuted }" />
        </span>
        <span class="tabular-nums">{{ fmtPct(s.pct) }}</span>
      </span>
    </div>

    <!-- 最內層圖例 -->
    <div v-if="data.innerLevels.length" class="flex flex-wrap items-center gap-2 text-xs" data-legend>
      <span class="text-content-secondary">{{ nameOf(innerFactor!) }}</span>
      <button
        v-for="(lv, k) in data.innerLevels"
        :key="lv"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5"
        :class="pinnedInner === lv ? 'border-stroke-focus bg-surface-secondary text-content-primary' : 'border-stroke-light text-content-secondary hover:bg-surface-secondary'"
        :aria-pressed="pinnedInner === lv"
        :data-inner="lv"
        @click="pinnedInner = pinnedInner === lv ? null : lv"
        @mouseenter="hoverInner = lv"
        @mouseleave="hoverInner = null"
      >
        <span class="inline-block h-2.5 w-2.5 rounded-full" :style="{ background: innerColor(k) }" aria-hidden="true" />
        {{ lv }}
      </button>
    </div>

    <div ref="containerRef" class="relative overflow-x-auto" :style="{ height: `${props.height + 2}px` }">
      <p v-if="!positions.length" class="flex h-full items-center justify-center text-sm text-content-tertiary">{{ props.emptyText ?? t.empty }}</p>
      <svg
        v-else
        :width="svgWidth"
        :height="props.height"
        class="block outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus rounded"
        role="slider"
        tabindex="0"
        :aria-label="ariaLabel"
        :aria-valuemin="1"
        :aria-valuemax="positions.length"
        :aria-valuenow="kbPos + 1"
        :aria-valuetext="posText(kbPos)"
        @keydown="onKey"
        @focus="onFocus"
        @blur="onLeave"
        @mouseleave="onLeave"
      >
        <!-- 區塊底色與標題 -->
        <g v-for="(pn, i) in data.panels" :key="`p${i}`" aria-hidden="true">
          <rect :x="panelX(i)" :y="M.t" :width="panelWidth(i)" :height="plotBottom - M.t" :style="{ fill: i % 2 === 0 ? chartTheme.surfaceMuted : 'transparent' }" />
          <text v-if="pn.level !== null" :x="panelX(i) + panelWidth(i) / 2" :y="M.t - 8" text-anchor="middle" font-size="11" font-weight="600" :style="{ fill: chartTheme.text }">{{ shortText(pn.level, panelWidth(i)) }}</text>
        </g>
        <!-- y 軸 -->
        <g aria-hidden="true">
          <template v-for="tk in yTicks" :key="tk">
            <line :x1="M.l" :x2="svgWidth - M.r" :y1="y(tk)" :y2="y(tk)" :style="{ stroke: chartTheme.grid }" />
            <text :x="M.l - 6" :y="y(tk)" dy="0.35em" text-anchor="end" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ fmt(tk) }}</text>
          </template>
          <text v-if="props.unit" :x="M.l - 6" :y="M.t - 8" text-anchor="end" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ props.unit }}</text>
        </g>
        <!-- 規格線 -->
        <g aria-hidden="true">
          <template v-for="sp in specs" :key="sp.key">
            <line :x1="M.l" :x2="svgWidth - M.r" :y1="y(sp.v)" :y2="y(sp.v)" stroke-dasharray="5 3" :style="{ stroke: sp.color }" :data-spec="sp.key" />
            <text :x="svgWidth - M.r + 4" :y="y(sp.v)" dy="0.35em" font-size="9" :style="{ fill: sp.color }">{{ sp.label }} {{ fmt(sp.v) }}</text>
          </template>
        </g>

        <g v-for="(pn, i) in data.panels" :key="`d${i}`">
          <!-- 區塊平均 -->
          <line
            v-if="pn.level !== null"
            :x1="panelX(i) + 4"
            :x2="panelX(i) + panelWidth(i) - 4"
            :y1="y(pn.cell.mean)"
            :y2="y(pn.cell.mean)"
            stroke-dasharray="2 3"
            stroke-width="1.5"
            :style="{ stroke: chartTheme.textMuted }"
            aria-hidden="true"
            data-panel-mean
          />
          <!-- 位置平均連線 -->
          <path :d="meanPath(i)" fill="none" stroke-width="2" :style="{ stroke: chartTheme.text }" aria-hidden="true" data-mean-line />
          <g
            v-for="(ps, j) in pn.positions"
            :key="ps.cell.key"
            :data-pos="ps.cell.path.join('/')"
            class="cursor-pointer"
            @mouseenter="onPos(flatIndex(i, j))"
            @click="emit('position-click', ps)"
          >
            <rect :x="posX(i, j) - bandW / 2" :y="M.t" :width="bandW" :height="plotBottom - M.t" :style="{ fill: activePos === flatIndex(i, j) ? chartTheme.accent : 'transparent', opacity: 0.08 }" />
            <rect v-if="kbFocus && activePos === flatIndex(i, j)" :x="posX(i, j) - bandW / 2 + 1" :y="M.t + 1" :width="bandW - 2" :height="plotBottom - M.t - 2" rx="3" fill="none" stroke-width="2" :style="{ stroke: chartTheme.accent }" />
            <!-- 個別量測值 -->
            <template v-if="props.showPoints">
              <circle
                v-for="(pt, k) in pointsOf(ps)"
                :key="k"
                :cx="pt.x"
                :cy="y(pt.v)"
                r="2"
                :style="{ fill: pt.color, opacity: dimInner(pt.inner) ? 0.08 : 0.35 }"
              />
            </template>
            <!-- 最內層平均：連成一條線 -->
            <template v-if="ps.inner.length">
              <path :d="innerPath(i, j, ps)" fill="none" stroke-width="1.5" :style="{ stroke: chartTheme.axis }" />
              <circle
                v-for="c in ps.inner"
                :key="c.key"
                :cx="innerX(i, j, c.path[c.path.length - 1])"
                :cy="y(c.mean)"
                :r="4"
                :style="{ fill: innerColor(innerIdx(c.path[c.path.length - 1])), stroke: chartTheme.surface, opacity: dimInner(c.path[c.path.length - 1]) ? 0.2 : 1 }"
                stroke-width="1.5"
                :data-inner-mean="c.path.join('/')"
              />
            </template>
            <!-- 位置平均 -->
            <rect :x="posX(i, j) - 4.5" :y="y(ps.cell.mean) - 4.5" width="9" height="9" :transform="`rotate(45 ${posX(i, j)} ${y(ps.cell.mean)})`" :style="{ fill: chartTheme.text, stroke: chartTheme.surface }" data-pos-mean />
            <text :x="posX(i, j)" :y="plotBottom + 14" text-anchor="middle" font-size="10" :style="{ fill: activePos === flatIndex(i, j) ? chartTheme.text : chartTheme.textMuted, fontWeight: activePos === flatIndex(i, j) ? 600 : 400 }" aria-hidden="true">{{ shortText(ps.level, bandW) }}</text>
          </g>
        </g>
        <text :x="M.l + (svgWidth - M.l - M.r) / 2" :y="props.height - 4" text-anchor="middle" font-size="10" :style="{ fill: chartTheme.textMuted }" aria-hidden="true">{{ nameOf(posFactor!) }}</text>
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
          <th v-for="f in data.factors" :key="f" scope="col">{{ nameOf(f) }}</th>
          <th scope="col">n</th>
          <th scope="col">{{ t.mean }}</th>
          <th scope="col">{{ t.range }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in leafCells" :key="c.key">
          <td v-for="(p, k) in c.path" :key="k">{{ p }}</td>
          <td>{{ c.n }}</td>
          <td>{{ fmt(c.mean) }}</td>
          <td>{{ fmt(c.max - c.min) }}</td>
        </tr>
      </tbody>
    </table>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import * as d3 from 'd3'
import { chartPalette, chartTheme } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { tooltipPlacement } from './utils/tooltipPlacement'
import { buildMultiVari, multiVariPositions, type MVCell, type MVPosition } from './utils/multiVari'
import { useLocale } from '../shared/config'
import { clipText } from '../shared/textClip'

/**
 * MultiVariChart —— 多變異圖
 *
 * 把變異拆成兩到三層因子來看：例如「日期 → 機台 → 模穴」。最外層是並排的區塊、中間層是 x 位置、
 * 最內層在同一位置錯開並連成一條線；菱形是位置平均、虛線是區塊平均。
 * 一眼看出變異主要來自位置內（模穴之間）、位置間（機台之間）還是時間（日期之間），上方並列出各來源的平方和占比。
 */

export interface MultiVariChartProps {
  data: Record<string, unknown>[]
  /** 量測值欄位 */
  value?: string
  /** 因子欄位，由外到內（1～3 個） */
  factors: string[]
  /** 因子的顯示名稱 */
  factorLabels?: Record<string, string>
  levelOrder?: 'appearance' | 'natural'
  /** 畫出個別量測值 */
  showPoints?: boolean
  /** 顯示變異來源占比 */
  showSummary?: boolean
  lsl?: number | null
  usl?: number | null
  target?: number | null
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
const t = computed(() => i18n.value.multiVari)
const props = withDefaults(defineProps<MultiVariChartProps>(), {
  value: 'value',
  factorLabels: () => ({}),
  levelOrder: 'appearance',
  showPoints: true,
  showSummary: true,
  lsl: null,
  usl: null,
  target: null,
  width: 760,
  height: 320,
  autoResize: false,
  debounceDelay: 100,
  title: '',
  unit: '',
  valueFormat: null,
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'chart-resize', size: { width: number; height: number }): void
  (e: 'position-click', position: MVPosition): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const { effectiveWidth } = useAutoResize(containerRef, props as unknown as { width: number; height: number; autoResize: boolean; debounceDelay: number }, (s) => emit('chart-resize', s))

// ---- 資料 ----
const data = computed(() => buildMultiVari(props.data, { value: props.value, factors: props.factors, levelOrder: props.levelOrder }))
const positions = computed(() => multiVariPositions(data.value))
const L = computed(() => data.value.factors.length)
const innerFactor = computed(() => (L.value >= 2 ? data.value.factors[L.value - 1] : null))
const posFactor = computed(() => (L.value === 1 ? data.value.factors[0] : data.value.factors[L.value - 2]))
const leafCells = computed<MVCell[]>(() => (L.value >= 2 ? positions.value.flatMap((p) => p.inner) : positions.value.map((p) => p.cell)))
const nameOf = (f: string) => (f === 'within' ? t.value.within : (props.factorLabels[f] ?? f))
const innerIdx = (lv: string) => data.value.innerLevels.indexOf(lv)
const innerColor = (k: number) => (k < 8 ? chartPalette.categorical[k] : chartPalette.other)

// ---- 版面 ----
// 有規格線時右側留空間放標籤（不壓到資料點）
const M = computed(() => ({ l: 52, r: specs.value.length ? 60 : 12, t: data.value.panels[0]?.level !== null && data.value.panels.length ? 24 : 12, b: 34 }))
const plotBottom = computed(() => props.height - M.value.b)
const PANEL_GAP = 8
const minBand = computed(() => Math.max(28, data.value.innerLevels.length * 10 + 12))
const nPos = computed(() => positions.value.length || 1)
const svgWidth = computed(() => {
  const need = M.value.l + M.value.r + nPos.value * minBand.value + PANEL_GAP * Math.max(0, data.value.panels.length - 1)
  return Math.max(effectiveWidth.value, need)
})
const innerW = computed(() => svgWidth.value - M.value.l - M.value.r - PANEL_GAP * Math.max(0, data.value.panels.length - 1))
/** 每個位置一樣寬；區塊寬度依位置數 */
const bandW = computed(() => innerW.value / nPos.value)
const panelStart = computed(() => {
  const out: number[] = []
  let x = M.value.l
  for (const p of data.value.panels) {
    out.push(x)
    x += p.positions.length * bandW.value + PANEL_GAP
  }
  return out
})
const panelX = (i: number) => panelStart.value[i]
const panelWidth = (i: number) => bandW.value * data.value.panels[i].positions.length
const posX = (i: number, j: number) => panelX(i) + (j + 0.5) * bandW.value
const spread = computed(() => Math.min(bandW.value * 0.62, Math.max(0, data.value.innerLevels.length - 1) * 14))
function innerX(i: number, j: number, lv: string): number {
  const m = data.value.innerLevels.length
  if (m <= 1) return posX(i, j)
  return posX(i, j) - spread.value / 2 + (spread.value * innerIdx(lv)) / (m - 1)
}
const flatIndex = (i: number, j: number) => data.value.panels.slice(0, i).reduce((s, p) => s + p.positions.length, 0) + j

const specs = computed(() => {
  const out: { key: string; v: number; label: string; color: string }[] = []
  if (props.usl !== null && Number.isFinite(props.usl)) out.push({ key: 'usl', v: props.usl, label: t.value.usl, color: chartTheme.danger })
  if (props.target !== null && Number.isFinite(props.target)) out.push({ key: 'target', v: props.target, label: t.value.target, color: chartTheme.accent })
  if (props.lsl !== null && Number.isFinite(props.lsl)) out.push({ key: 'lsl', v: props.lsl, label: t.value.lsl, color: chartTheme.danger })
  return out
})
const yScale = computed(() => {
  const vals = props.showPoints ? positions.value.flatMap((p) => p.cell.values) : leafCells.value.map((c) => c.mean)
  const all = [...vals, ...specs.value.map((s) => s.v)]
  let lo = d3.min(all) ?? 0
  let hi = d3.max(all) ?? 1
  if (lo === hi) {
    lo -= Math.abs(lo) * 0.05 || 1
    hi += Math.abs(hi) * 0.05 || 1
  }
  const pad = (hi - lo) * 0.06
  return d3.scaleLinear().domain([lo - pad, hi + pad]).nice(5).range([plotBottom.value, M.value.t + 4])
})
const y = (v: number) => yScale.value(v)
const yTicks = computed(() => yScale.value.ticks(5))

function meanPath(i: number): string {
  const pn = data.value.panels[i]
  return d3.line()(pn.positions.map((p, j) => [posX(i, j), y(p.cell.mean)])) ?? ''
}
function innerPath(i: number, j: number, ps: MVPosition): string {
  return d3.line()(ps.inner.map((c) => [innerX(i, j, c.path[c.path.length - 1]), y(c.mean)])) ?? ''
}
function pointsOf(ps: MVPosition) {
  const [i, j] = locate(ps)
  if (!ps.inner.length) return ps.cell.values.map((v) => ({ v, x: posX(i, j), color: chartTheme.textMuted, inner: null as string | null }))
  return ps.inner.flatMap((c) => {
    const lv = c.path[c.path.length - 1]
    return c.values.map((v) => ({ v, x: innerX(i, j, lv), color: innerColor(innerIdx(lv)), inner: lv as string | null }))
  })
}
function locate(ps: MVPosition): [number, number] {
  const i = data.value.panels.findIndex((p) => p.positions.includes(ps))
  return [i, data.value.panels[i].positions.indexOf(ps)]
}

// ---- 文字 ----
const fmt = (v: number) => (props.valueFormat ? props.valueFormat(v) : d3.format('.4~g')(v))
const fmtPct = (v: number) => `${d3.format('.1f')(v)}%`
function shortText(s: string, room: number): string {
  return clipText(s, room - 4)
}
const ariaLabel = computed(() => {
  const d = data.value.dominant
  return t.value.ariaLabel(props.title || t.value.title, positions.value.length, d ? nameOf(d) : '')
})
function posLines(idx: number): string[] {
  const p = positions.value[idx]
  if (!p) return []
  const s = t.value
  const lines = [p.cell.path.join(' / '), s.stats(p.cell.n, fmt(p.cell.mean), fmt(p.cell.max - p.cell.min))]
  for (const c of p.inner) lines.push(s.innerLine(c.path[c.path.length - 1], fmt(c.mean), c.n))
  return lines
}
const posText = (idx: number) => posLines(idx).join(t.value.sep)

// ---- 互動 ----
const hoverInner = ref<string | null>(null)
const pinnedInner = ref<string | null>(null)
const activeInner = computed(() => hoverInner.value ?? pinnedInner.value)
const dimInner = (lv: string | null) => activeInner.value !== null && lv !== null && lv !== activeInner.value
watch(data, (d) => {
  if (pinnedInner.value && !d.innerLevels.includes(pinnedInner.value)) pinnedInner.value = null
})
const activePos = ref<number | null>(null)
const kbFocus = ref(false)
const tip = computed(() => {
  const idx = activePos.value
  if (idx === null || !positions.value[idx]) return null
  const p = positions.value[idx]
  const [i, j] = locate(p)
  const lines = posLines(idx)
  return { lines, style: tooltipPlacement(posX(i, j), y(p.cell.max), svgWidth.value, props.height, 190, 18 * lines.length + 10) }
})
function onPos(idx: number): void {
  activePos.value = idx
}
function onLeave(): void {
  activePos.value = null
  kbFocus.value = false
}

// ---- 鍵盤 ----
const kbPos = ref(0)
const announcement = ref('')
function selectPos(idx: number): void {
  kbPos.value = Math.max(0, Math.min(positions.value.length - 1, idx))
  activePos.value = kbPos.value
  announcement.value = posText(kbPos.value)
}
function onFocus(e: FocusEvent): void {
  kbFocus.value = !!(e.currentTarget as Element).matches?.(':focus-visible')
  selectPos(Math.min(kbPos.value, positions.value.length - 1))
}
function onKey(e: KeyboardEvent): void {
  const n = positions.value.length
  const map: Record<string, number> = { ArrowRight: kbPos.value + 1, ArrowLeft: kbPos.value - 1, Home: 0, End: n - 1 }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    emit('position-click', positions.value[kbPos.value])
    return
  }
  if (!(e.key in map)) return
  e.preventDefault()
  kbFocus.value = true
  selectPos(map[e.key])
}

defineExpose({
  /** 分組結果與各來源的平方和占比 */
  result: () => data.value,
})
</script>
