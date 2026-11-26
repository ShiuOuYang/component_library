<template>
  <div ref="containerRef" class="gage-rr-chart flex flex-col gap-3" :style="props.autoResize ? { width: '100%' } : { width: `${props.width}px`, maxWidth: '100%' }">
    <!-- 標題與結論 -->
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
      <template v-if="res">
        <span
          class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          :class="verdictClass"
          data-verdict
          :data-value="res.verdict"
        >
          <span class="material-symbols-outlined text-[14px] leading-none" aria-hidden="true">{{ verdictIcon }}</span>
          {{ t.verdict[res.verdict] }}
        </span>
        <span class="text-xs text-content-secondary" data-summary>
          {{ t.grrLabel(res.basis) }} <strong class="text-content-primary tabular-nums">{{ fmtPct(res.grrPercent) }}</strong>
          <span class="mx-1 text-content-tertiary">·</span>
          {{ t.ndc }} <strong class="tabular-nums" :class="res.ndc >= 5 ? 'text-content-primary' : 'text-danger'">{{ fmtNdc(res.ndc) }}</strong>
          <span class="text-content-tertiary">{{ t.ndcHint }}</span>
        </span>
        <span class="text-xs text-content-tertiary">{{ t.study(res.parts.length, res.operators.length, res.trials) }}</span>
      </template>
    </div>
    <p v-if="res" class="-mt-1 text-xs text-content-tertiary" data-notes>
      {{ res.interactionP === null ? '' : res.interactionPooled ? t.pooled(fmtP(res.interactionP)) : t.interactionKept(fmtP(res.interactionP)) }}
      <span v-if="res.trimmed" class="text-warning" data-trimmed>{{ t.trimmed(res.trials) }}</span>
    </p>

    <p v-if="!res" class="flex items-center justify-center rounded-md border border-dashed border-stroke-default py-10 text-sm text-content-tertiary" data-error>
      {{ props.emptyText && error === 'empty' ? props.emptyText : t.errors[error!] }}
    </p>

    <template v-else>
      <!-- 作業員圖例：點一下標示該作業員 -->
      <div class="flex flex-wrap items-center gap-2 text-xs" role="group" :aria-label="t.operatorToggle">
        <span class="text-content-secondary">{{ t.operator }}</span>
        <button
          v-for="(op, j) in res.operators"
          :key="op"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 transition-colors"
          :class="pinnedOp === op ? 'border-stroke-focus bg-surface-secondary text-content-primary' : 'border-stroke-light text-content-secondary hover:bg-surface-secondary'"
          :aria-pressed="pinnedOp === op"
          :data-op="op"
          @click="pinnedOp = pinnedOp === op ? null : op"
          @mouseenter="hoverOp = op"
          @mouseleave="hoverOp = null"
        >
          <span class="inline-block h-2.5 w-2.5 rounded-full" :style="{ background: opColor(j) }" aria-hidden="true" />
          {{ op }}
        </button>
      </div>

      <div class="grid gap-4" :style="{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }">
        <figure v-for="pk in shownPanels" :key="pk" class="relative m-0 rounded-md border border-stroke-light bg-surface-primary p-2" :data-panel="pk">
          <figcaption class="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-content-primary">
            {{ t.panels[pk] }}
            <span v-if="pk === 'components'" class="flex flex-wrap gap-2 font-normal text-content-secondary">
              <span v-for="s in compSeries" :key="s.key" class="inline-flex items-center gap-1"><span class="inline-block h-2 w-2.5 rounded-sm" :style="{ background: s.color }" />{{ s.label }}</span>
            </span>
            <span v-else-if="pk === 'mean'" class="font-normal text-content-tertiary">{{ t.outside(fmtPct(outsidePct)) }}</span>
            <span v-else-if="pk === 'byPart'" class="font-normal text-content-tertiary">{{ t.partHint }}</span>
          </figcaption>

          <svg
            :width="panelW"
            :height="props.panelHeight"
            class="block outline-none"
            :role="pk === 'byPart' ? 'slider' : 'img'"
            :tabindex="pk === 'byPart' ? 0 : undefined"
            :aria-label="panelAria(pk)"
            :aria-valuetext="pk === 'byPart' ? partText : undefined"
            :aria-valuemin="pk === 'byPart' ? 1 : undefined"
            :aria-valuemax="pk === 'byPart' ? res.parts.length : undefined"
            :aria-valuenow="pk === 'byPart' ? kbPart + 1 : undefined"
            :class="pk === 'byPart' ? 'focus-visible:ring-2 focus-visible:ring-stroke-focus rounded' : ''"
            @mouseleave="onLeave"
            @keydown="pk === 'byPart' ? onPartKey($event) : undefined"
            @focus="pk === 'byPart' ? onPartFocus() : undefined"
            @blur="pk === 'byPart' ? onLeave() : undefined"
          >
            <!-- y 軸 -->
            <g aria-hidden="true">
              <template v-for="tk in yTicks(pk)" :key="tk">
                <line :x1="M.l" :x2="panelW - rOf(pk)" :y1="yOf(pk, tk)" :y2="yOf(pk, tk)" :style="{ stroke: chartTheme.grid }" />
                <text :x="M.l - 4" :y="yOf(pk, tk)" dy="0.35em" text-anchor="end" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ pk === 'components' ? `${tk}%` : fmt(tk) }}</text>
              </template>
            </g>

            <!-- ① 變異成分 -->
            <g v-if="pk === 'components'">
              <g v-for="lv in [10, 30]" :key="lv" aria-hidden="true">
                <line :x1="M.l" :x2="panelW - M.r" :y1="yOf(pk, lv)" :y2="yOf(pk, lv)" stroke-dasharray="4 3" :style="{ stroke: lv === 10 ? chartPalette.good : chartPalette.critical }" />
                <text :x="panelW - M.r + 4" :y="yOf(pk, lv) + (lv === 10 ? 4 : -2)" dy="0.35em" font-size="9" :style="{ fill: chartTheme.textMuted }">{{ lv }}%</text>
              </g>
              <g v-for="(g, gi) in compGroups" :key="g.source" :data-comp="g.source">
                <rect
                  v-for="(s, si) in compSeries"
                  :key="s.key"
                  :x="compX(gi, si)"
                  :y="yOf(pk, s.value(g))"
                  :width="compBarW"
                  :height="Math.max(0, yOf(pk, 0) - yOf(pk, s.value(g)))"
                  :style="{ fill: s.color }"
                  :data-series="s.key"
                  @mouseenter="showTip(pk, compX(gi, si) + compBarW / 2, yOf(pk, s.value(g)), [t.sources[g.source], t.labeled(s.label, fmtPct(s.value(g)))])"
                />
                <text :x="bandX(gi, compGroups.length)" :y="props.panelHeight - 8" text-anchor="middle" font-size="10" :style="{ fill: chartTheme.textMuted }" aria-hidden="true">{{ t.short[g.source] }}</text>
              </g>
            </g>

            <!-- ② R 圖、③ X̄ 圖：依作業員分段 -->
            <g v-else-if="pk === 'range' || pk === 'mean'">
              <g aria-hidden="true">
                <line v-for="(lim, li) in limitsOf(pk)" :key="li" :x1="M.l" :x2="panelW - M.r" :y1="yOf(pk, lim.v)" :y2="yOf(pk, lim.v)" :stroke-dasharray="lim.center ? undefined : '4 3'" :style="{ stroke: lim.center ? chartTheme.axis : chartTheme.danger }" />
                <text v-for="(lim, li) in limitLabels(pk)" :key="`l${li}`" :x="panelW - M.r + 4" :y="lim.y" dy="0.35em" font-size="9" :style="{ fill: lim.center ? chartTheme.textMuted : chartTheme.danger }">{{ lim.label }}</text>
                <line v-for="j in res.operators.length - 1" :key="`sep${j}`" :x1="cellX(j * res.parts.length) - cellStep / 2" :x2="cellX(j * res.parts.length) - cellStep / 2" :y1="M.t" :y2="props.panelHeight - M.b" :style="{ stroke: chartTheme.border }" />
              </g>
              <g v-for="(op, j) in res.operators" :key="op" :data-op-series="op" :style="{ opacity: dimOp(op) ? 0.25 : 1 }">
                <path :d="cellPath(pk, j)" fill="none" stroke-width="1.5" :style="{ stroke: opColor(j) }" />
                <circle
                  v-for="(c, i) in cellsOf(op)"
                  :key="c.part"
                  :cx="cellX(j * res.parts.length + i)"
                  :cy="yOf(pk, pk === 'range' ? c.range : c.mean)"
                  :r="activePart === c.part ? 4.5 : 3"
                  :style="{ fill: pk === 'range' && c.range > res.rLimits.ucl ? chartTheme.danger : opColor(j), stroke: chartTheme.surface, opacity: dimPart(c.part) ? 0.35 : 1 }"
                  stroke-width="1"
                  :data-cell="`${c.part}|${op}`"
                  @mouseenter="onCell(pk, c, j * res.parts.length + i)"
                />
                <text :x="(cellX(j * res.parts.length) + cellX((j + 1) * res.parts.length - 1)) / 2" :y="props.panelHeight - 8" text-anchor="middle" font-size="10" :style="{ fill: chartTheme.textMuted }" aria-hidden="true">{{ op }}</text>
              </g>
            </g>

            <!-- ④ 依零件 -->
            <g v-else-if="pk === 'byPart'">
              <rect v-if="activePart !== null" :x="partX(partIdx(activePart)) - partStep / 2" :y="M.t" :width="partStep" :height="props.panelHeight - M.t - M.b" :style="{ fill: chartTheme.accent, opacity: 0.08 }" aria-hidden="true" />
              <g v-for="(pt, i) in res.parts" :key="pt" :data-part="pt" @mouseenter="onPart(pk, pt)">
                <rect :x="partX(i) - partStep / 2" :y="M.t" :width="partStep" :height="props.panelHeight - M.t - M.b" fill="transparent" />
                <circle
                  v-for="(v, k) in partValues(pt)"
                  :key="k"
                  :cx="partX(i) + v.dx"
                  :cy="yOf(pk, v.value)"
                  r="2.2"
                  :style="{ fill: opColor(v.opIndex), opacity: dimOp(v.op) ? 0.15 : 0.6 }"
                />
                <text :x="partX(i)" :y="props.panelHeight - 8" text-anchor="middle" font-size="10" :style="{ fill: activePart === pt ? chartTheme.text : chartTheme.textMuted, fontWeight: activePart === pt ? 600 : 400 }" aria-hidden="true">{{ shortPart(pt) }}</text>
              </g>
              <path :d="meanPath(res.parts.map((pt, i) => [partX(i), yOf(pk, res!.partMeans.get(pt)!)]))" fill="none" stroke-width="2" :style="{ stroke: chartTheme.text }" aria-hidden="true" />
              <circle v-for="(pt, i) in res.parts" :key="`m${pt}`" :cx="partX(i)" :cy="yOf(pk, res.partMeans.get(pt)!)" r="3.5" :style="{ fill: chartTheme.text, stroke: chartTheme.surface }" aria-hidden="true" />
            </g>

            <!-- ⑤ 依作業員：盒鬚 + 平均 -->
            <g v-else-if="pk === 'byOperator'">
              <g v-for="(op, j) in res.operators" :key="op" :data-op-box="op" :style="{ opacity: dimOp(op) ? 0.3 : 1 }" @mouseenter="onOpBox(pk, op, j)">
                <rect :x="opX(j) - opStep / 2" :y="M.t" :width="opStep" :height="props.panelHeight - M.t - M.b" fill="transparent" />
                <line :x1="opX(j)" :x2="opX(j)" :y1="yOf(pk, opStats[j].min)" :y2="yOf(pk, opStats[j].max)" :style="{ stroke: chartTheme.axis }" />
                <rect
                  :x="opX(j) - boxW / 2"
                  :y="yOf(pk, opStats[j].q3)"
                  :width="boxW"
                  :height="Math.max(1, yOf(pk, opStats[j].q1) - yOf(pk, opStats[j].q3))"
                  rx="2"
                  :style="{ fill: opColor(j), fillOpacity: 0.25, stroke: opColor(j) }"
                />
                <line :x1="opX(j) - boxW / 2" :x2="opX(j) + boxW / 2" :y1="yOf(pk, opStats[j].median)" :y2="yOf(pk, opStats[j].median)" stroke-width="2" :style="{ stroke: opColor(j) }" />
                <text :x="opX(j)" :y="props.panelHeight - 8" text-anchor="middle" font-size="10" :style="{ fill: chartTheme.textMuted }" aria-hidden="true">{{ op }}</text>
              </g>
              <path :d="meanPath(res.operators.map((op, j) => [opX(j), yOf(pk, res!.operatorMeans.get(op)!)]))" fill="none" stroke-width="1.5" :style="{ stroke: chartTheme.text }" aria-hidden="true" />
              <circle v-for="(op, j) in res.operators" :key="`m${op}`" :cx="opX(j)" :cy="yOf(pk, res.operatorMeans.get(op)!)" r="3.5" :style="{ fill: chartTheme.text, stroke: chartTheme.surface }" aria-hidden="true" />
            </g>

            <!-- ⑥ 交互作用 -->
            <g v-else-if="pk === 'interaction'">
              <g v-for="(op, j) in res.operators" :key="op" :data-op-line="op" :style="{ opacity: dimOp(op) ? 0.2 : 1 }">
                <path :d="meanPath(res.parts.map((pt, i) => [partX(i), yOf(pk, cell(pt, op).mean)]))" fill="none" stroke-width="2" :style="{ stroke: opColor(j) }" />
                <circle
                  v-for="(pt, i) in res.parts"
                  :key="pt"
                  :cx="partX(i)"
                  :cy="yOf(pk, cell(pt, op).mean)"
                  :r="activePart === pt ? 4.5 : 3"
                  :style="{ fill: opColor(j), stroke: chartTheme.surface }"
                  @mouseenter="onCell(pk, cell(pt, op), null, i)"
                />
              </g>
              <text v-for="(pt, i) in res.parts" :key="`x${pt}`" :x="partX(i)" :y="props.panelHeight - 8" text-anchor="middle" font-size="10" :style="{ fill: activePart === pt ? chartTheme.text : chartTheme.textMuted }" aria-hidden="true">{{ shortPart(pt) }}</text>
            </g>
          </svg>

          <div
            v-if="tip && tip.panel === pk"
            class="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border px-2 py-1 text-xs shadow-md"
            :style="{ ...tip.style, background: chartTheme.surface, borderColor: chartTheme.border, color: chartTheme.text }"
            data-export-ignore
            data-tip
          >
            <div v-for="(line, k) in tip.lines" :key="k" :class="k === 0 ? 'font-medium' : 'text-content-secondary'">{{ line }}</div>
          </div>
        </figure>
      </div>

      <!-- 數值表 -->
      <div v-if="props.showTables" class="grid gap-4" :style="{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }">
        <div class="overflow-x-auto">
          <table class="w-full text-xs tabular-nums" data-table="components">
            <caption class="mb-1 text-left text-xs font-medium text-content-primary">{{ t.tableComponents }}</caption>
            <thead>
              <tr class="border-b border-stroke-default text-content-secondary">
                <th scope="col" class="whitespace-nowrap py-1 pr-2 text-left font-medium">{{ t.cols.source }}</th>
                <th scope="col" class="whitespace-nowrap px-2 py-1 text-right font-medium">{{ t.cols.contribution }}</th>
                <th scope="col" class="whitespace-nowrap px-2 py-1 text-right font-medium">{{ t.cols.sd }}</th>
                <th scope="col" class="whitespace-nowrap px-2 py-1 text-right font-medium">{{ t.cols.studyVar(props.multiplier) }}</th>
                <th scope="col" class="whitespace-nowrap px-2 py-1 text-right font-medium">{{ t.cols.pctStudyVar }}</th>
                <th v-if="hasTol" scope="col" class="whitespace-nowrap py-1 pl-2 text-right font-medium">{{ t.cols.pctTolerance }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in res.components" :key="c.source" class="border-b border-stroke-light" :class="c.source === 'grr' ? 'font-semibold text-content-primary' : 'text-content-secondary'">
                <th scope="row" class="whitespace-nowrap py-1 pr-2 text-left font-[inherit]" :class="['operator', 'interaction'].includes(c.source) ? 'pl-6' : ['repeatability', 'reproducibility'].includes(c.source) ? 'pl-3' : ''">{{ t.sources[c.source] }}</th>
                <td class="px-2 py-1 text-right">{{ fmtPct(c.contribution) }}</td>
                <td class="px-2 py-1 text-right">{{ fmt(c.sd) }}</td>
                <td class="px-2 py-1 text-right">{{ fmt(c.studyVar) }}</td>
                <td class="px-2 py-1 text-right">{{ fmtPct(c.pctStudyVar) }}</td>
                <td v-if="hasTol" class="py-1 pl-2 text-right">{{ c.pctTolerance === null ? '' : fmtPct(c.pctTolerance) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs tabular-nums" data-table="anova">
            <caption class="mb-1 text-left text-xs font-medium text-content-primary">{{ res.anovaReduced ? t.tableAnovaReduced : t.tableAnova }}</caption>
            <thead>
              <tr class="border-b border-stroke-default text-content-secondary">
                <th scope="col" class="whitespace-nowrap py-1 pr-2 text-left font-medium">{{ t.cols.source }}</th>
                <th scope="col" class="whitespace-nowrap px-2 py-1 text-right font-medium">{{ t.cols.df }}</th>
                <th scope="col" class="whitespace-nowrap px-2 py-1 text-right font-medium">SS</th>
                <th scope="col" class="whitespace-nowrap px-2 py-1 text-right font-medium">MS</th>
                <th scope="col" class="whitespace-nowrap px-2 py-1 text-right font-medium">F</th>
                <th scope="col" class="whitespace-nowrap py-1 pl-2 text-right font-medium">P</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in res.anovaReduced ?? res.anova" :key="a.source" class="border-b border-stroke-light text-content-secondary">
                <th scope="row" class="whitespace-nowrap py-1 pr-2 text-left font-normal">{{ t.anovaSources[a.source] }}</th>
                <td class="px-2 py-1 text-right">{{ a.df }}</td>
                <td class="px-2 py-1 text-right">{{ fmt(a.ss) }}</td>
                <td class="px-2 py-1 text-right">{{ a.ms === null ? '' : fmt(a.ms) }}</td>
                <td class="px-2 py-1 text-right">{{ a.f === null ? '' : fmtF(a.f) }}</td>
                <td class="py-1 pl-2 text-right">{{ a.p === null ? '' : fmtP(a.p) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import * as d3 from 'd3'
import { chartPalette, chartTheme } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { tooltipPlacement } from './utils/tooltipPlacement'
import { analyzeGage, outsideFraction, type GageCell, type GageComponent, type GageResult, type GageRow } from './utils/gageRR'
import { useLocale } from '../shared/config'

/**
 * GageRRChart —— 量測系統分析圖（Gage R&R，交叉設計、ANOVA 法）
 *
 * 一次給出量測系統分析的六張標準圖與數值表：
 * ① 變異成分（% 貢獻度 / % 研究變異 / % 公差，10% 與 30% 參考線）
 * ② R 管制圖（依作業員）：點超出 UCL 代表該作業員量測不穩定
 * ③ X̄ 管制圖（依作業員）：大部分點要在界限「外」—— 代表量測能分辨零件
 * ④ 依零件：每個零件的所有量測值與平均
 * ⑤ 依作業員：盒鬚圖與平均（作業員之間的偏差）
 * ⑥ 作業員 × 零件交互作用：線不平行代表某些人量某些零件特別有偏差
 *
 * 判定：%GRR < 10% 可接受、10～30% 視用途而定、> 30% 不可接受；ndc ≥ 5。
 */

export type GagePanel = 'components' | 'range' | 'mean' | 'byPart' | 'byOperator' | 'interaction'

export interface GageRRChartProps {
  /** 量測資料：{ part, operator, value }，每位作業員對每個零件量 2 次以上 */
  data: GageRow[]
  /** 公差（USL − LSL），給了才算 %公差 */
  tolerance?: number | null
  /** 研究變異倍數（6 或 5.15） */
  multiplier?: number
  /** 交互作用 p 值大於它就併入誤差 */
  interactionAlpha?: number
  /** 判定依據：auto = 有公差用 %公差，否則 %研究變異 */
  basis?: 'auto' | 'studyVar' | 'tolerance'
  /** 要顯示的圖與順序 */
  panels?: GagePanel[]
  /** 顯示變異成分與 ANOVA 表 */
  showTables?: boolean
  width?: number
  autoResize?: boolean
  debounceDelay?: number
  /** 每張小圖的高度 */
  panelHeight?: number
  title?: string
  valueFormat?: ((value: number) => string) | null
  emptyText?: string
}

const ALL_PANELS: GagePanel[] = ['components', 'range', 'mean', 'byPart', 'byOperator', 'interaction']

const i18n = useLocale()
const t = computed(() => i18n.value.gageRR)
const props = withDefaults(defineProps<GageRRChartProps>(), {
  tolerance: null,
  multiplier: 6,
  interactionAlpha: 0.05,
  basis: 'auto',
  panels: () => ['components', 'range', 'mean', 'byPart', 'byOperator', 'interaction'],
  showTables: true,
  width: 900,
  autoResize: false,
  debounceDelay: 100,
  panelHeight: 200,
  title: '',
  valueFormat: null,
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'chart-resize', size: { width: number; height: number }): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const { effectiveWidth } = useAutoResize(containerRef, props as unknown as { width: number; height: number; autoResize: boolean; debounceDelay: number }, (s) => emit('chart-resize', s))

// ---- 計算 ----
const analysis = computed(() =>
  analyzeGage(props.data, { tolerance: props.tolerance, multiplier: props.multiplier, interactionAlpha: props.interactionAlpha, basis: props.basis })
)
const res = computed<GageResult | null>(() => analysis.value.result)
const error = computed(() => analysis.value.error)
const hasTol = computed(() => !!res.value && res.value.components[0].pctTolerance !== null)
const outsidePct = computed(() => (res.value ? outsideFraction(res.value) * 100 : 0))
const shownPanels = computed(() => props.panels.filter((p) => ALL_PANELS.includes(p)))
const cellMap = computed(() => new Map((res.value?.cells ?? []).map((c) => [`${c.part}\u0000${c.operator}`, c])))
const cell = (pt: string, op: string) => cellMap.value.get(`${pt}\u0000${op}`)!
const cellsOf = (op: string) => res.value!.parts.map((pt) => cell(pt, op))
const partIdx = (pt: string) => res.value!.parts.indexOf(pt)

// ---- 版面 ----
const GAP = 16
const M = { l: 48, r: 60, t: 10, b: 24 }
const gridCols = computed(() => (effectiveWidth.value >= 760 ? 2 : 1))
const panelW = computed(() => Math.max(220, Math.floor((effectiveWidth.value - GAP * (gridCols.value - 1)) / gridCols.value) - 18))
/** 有界限 / 參考線標籤的圖（變異成分、R、X̄）右側留空間放標籤，其他圖用窄邊 */
const LABELED: GagePanel[] = ['components', 'range', 'mean']
const NARROW_R = 12
const rOf = (pk: GagePanel) => (LABELED.includes(pk) ? M.r : NARROW_R)
const innerW = computed(() => panelW.value - M.l - M.r)
const innerWide = computed(() => panelW.value - M.l - NARROW_R)
const bandX = (i: number, n: number) => M.l + ((i + 0.5) * innerW.value) / n
const wideX = (i: number, n: number) => M.l + ((i + 0.5) * innerWide.value) / n

const nCells = computed(() => (res.value ? res.value.cells.length : 1))
const cellStep = computed(() => innerW.value / nCells.value)
const cellX = (i: number) => M.l + (i + 0.5) * cellStep.value
const partStep = computed(() => innerWide.value / (res.value?.parts.length || 1))
const partX = (i: number) => wideX(i, res.value?.parts.length || 1)
const opStep = computed(() => innerWide.value / (res.value?.operators.length || 1))
const opX = (j: number) => wideX(j, res.value?.operators.length || 1)
const boxW = computed(() => Math.min(36, opStep.value * 0.4))

/** 每張圖的 y 比例尺 */
const scales = computed(() => {
  const r = res.value
  const out = new Map<GagePanel, d3.ScaleLinear<number, number>>()
  if (!r) return out
  const range = [props.panelHeight - M.b, M.t]
  const lin = (lo: number, hi: number, pad = 0.08) => {
    const span = hi - lo || Math.abs(hi) || 1
    return d3.scaleLinear().domain([lo - span * pad, hi + span * pad]).nice(5).range(range)
  }
  const pcts = compGroups.value.flatMap((g) => compSeries.value.map((s) => s.value(g)))
  out.set('components', d3.scaleLinear().domain([0, Math.max(100, d3.max(pcts) ?? 0)]).nice(5).range(range))
  out.set('range', d3.scaleLinear().domain([0, Math.max(r.rLimits.ucl, d3.max(r.cells, (c) => c.range) ?? 0) * 1.1 || 1]).nice(5).range(range))
  const means = r.cells.map((c) => c.mean)
  out.set('mean', lin(Math.min(r.xLimits.lcl, ...means), Math.max(r.xLimits.ucl, ...means)))
  const values = r.cells.flatMap((c) => c.values)
  const all = lin(Math.min(...values), Math.max(...values))
  out.set('byPart', all)
  out.set('byOperator', all)
  out.set('interaction', lin(Math.min(...means), Math.max(...means)))
  return out
})
const yOf = (pk: GagePanel, v: number) => scales.value.get(pk)!(v)
const yTicks = (pk: GagePanel) => scales.value.get(pk)?.ticks(4) ?? []

// ---- 變異成分 ----
type CompSource = 'grr' | 'repeatability' | 'reproducibility' | 'part'
const compGroups = computed(() => {
  const by = new Map((res.value?.components ?? []).map((c) => [c.source, c]))
  return (['grr', 'repeatability', 'reproducibility', 'part'] as CompSource[]).map((s) => by.get(s)!).filter(Boolean) as (GageComponent & { source: CompSource })[]
})
const compSeries = computed(() => {
  const cat = chartPalette.categorical
  const list = [
    { key: 'contribution', label: t.value.series.contribution, color: cat[0], value: (g: GageComponent) => g.contribution },
    { key: 'studyVar', label: t.value.series.studyVar, color: cat[1], value: (g: GageComponent) => g.pctStudyVar },
  ]
  if (hasTol.value) list.push({ key: 'tolerance', label: t.value.series.tolerance, color: cat[2], value: (g: GageComponent) => g.pctTolerance ?? 0 })
  return list
})
const compGroupW = computed(() => innerW.value / Math.max(1, compGroups.value.length))
const compBarW = computed(() => Math.max(4, Math.min(22, (compGroupW.value * 0.7) / compSeries.value.length)))
const compX = (gi: number, si: number) => bandX(gi, compGroups.value.length) - (compBarW.value * compSeries.value.length) / 2 + si * compBarW.value

// ---- 管制界限 ----
function limitsOf(pk: GagePanel) {
  const r = res.value!
  if (pk === 'range') {
    return [
      { v: r.rLimits.ucl, label: `UCL ${fmt(r.rLimits.ucl)}`, center: false },
      { v: r.rBar, label: `R̄ ${fmt(r.rBar)}`, center: true },
      { v: r.rLimits.lcl, label: `LCL ${fmt(r.rLimits.lcl)}`, center: false },
    ]
  }
  return [
    { v: r.xLimits.ucl, label: `UCL ${fmt(r.xLimits.ucl)}`, center: false },
    { v: r.grandMean, label: `X̄ ${fmt(r.grandMean)}`, center: true },
    { v: r.xLimits.lcl, label: `LCL ${fmt(r.xLimits.lcl)}`, center: false },
  ]
}
/** 界限標籤放在右側空白，太近時上下推開（至少 10px） */
function limitLabels(pk: GagePanel) {
  const items = limitsOf(pk).map((l) => ({ ...l, y: yOf(pk, l.v) }))
  const GAPY = 10
  for (let i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < GAPY) items[i].y = items[i - 1].y + GAPY
  const over = items[items.length - 1].y - (props.panelHeight - M.b + 4)
  if (over > 0) for (const it of items) it.y -= over
  return items
}
const meanPath = (pts: [number, number][]) => d3.line()(pts) ?? ''
function cellPath(pk: GagePanel, j: number): string {
  const op = res.value!.operators[j]
  const n = res.value!.parts.length
  return meanPath(cellsOf(op).map((c, i) => [cellX(j * n + i), yOf(pk, pk === 'range' ? c.range : c.mean)]))
}

// ---- 依零件 / 作業員 ----
function partValues(pt: string) {
  const r = res.value!
  const spread = Math.min(10, partStep.value * 0.3)
  return r.operators.flatMap((op, j) => {
    const dx = r.operators.length > 1 ? (j / (r.operators.length - 1) - 0.5) * spread : 0
    return cell(pt, op).values.map((value) => ({ value, op, opIndex: j, dx }))
  })
}
const opStats = computed(() =>
  (res.value?.operators ?? []).map((op) => {
    const v = res.value!.cells.filter((c) => c.operator === op).flatMap((c) => c.values).sort(d3.ascending)
    return { min: v[0], max: v[v.length - 1], q1: d3.quantileSorted(v, 0.25)!, median: d3.quantileSorted(v, 0.5)!, q3: d3.quantileSorted(v, 0.75)! }
  })
)

// ---- 顏色 / 文字 ----
const opColor = (j: number) => chartPalette.categorical[j % 8]
const fmt = (v: number) => (props.valueFormat ? props.valueFormat(v) : d3.format('.4~g')(v))
const fmtPct = (v: number) => `${d3.format('.2f')(v)}%`
const fmtF = (v: number) => (Number.isFinite(v) ? d3.format('.4~g')(v) : '∞')
const fmtP = (p: number) => (p < 0.001 ? '< 0.001' : d3.format('.3f')(p))
const fmtNdc = (n: number) => (Number.isFinite(n) ? String(n) : '∞')
const shortPart = (pt: string) => {
  const room = Math.max(2, Math.floor(partStep.value / 6))
  return pt.length > room ? `${pt.slice(0, Math.max(1, room - 1))}…` : pt
}
const verdictClass = computed(() => {
  const v = res.value?.verdict
  return v === 'acceptable' ? 'bg-success-subtle text-success-on-subtle' : v === 'marginal' ? 'bg-warning-subtle text-warning-on-subtle' : 'bg-danger-subtle text-danger-on-subtle'
})
const verdictIcon = computed(() => ({ acceptable: 'check_circle', marginal: 'error', unacceptable: 'cancel' })[res.value?.verdict ?? 'unacceptable'])

function panelAria(pk: GagePanel): string {
  const r = res.value!
  const s = t.value
  if (pk === 'components') return s.labeled(s.panels.components, s.list(compGroups.value.map((g) => `${s.sources[g.source]} ${fmtPct(g.pctStudyVar)}`)))
  if (pk === 'range') return s.labeled(s.panels.range, s.clauses([`R̄ ${fmt(r.rBar)}`, `UCL ${fmt(r.rLimits.ucl)}`, s.overUcl(r.cells.filter((c) => c.range > r.rLimits.ucl).length)]))
  if (pk === 'mean') return s.labeled(s.panels.mean, s.outside(fmtPct(outsidePct.value)))
  if (pk === 'byOperator') return s.labeled(s.panels.byOperator, s.list(r.operators.map((op) => `${op} ${fmt(r.operatorMeans.get(op)!)}`)))
  if (pk === 'interaction') return s.labeled(s.panels.interaction, r.interactionP === null ? '' : `p = ${fmtP(r.interactionP)}`)
  return s.clauses([s.panels.byPart, s.partHint])
}

// ---- 互動 ----
const hoverOp = ref<string | null>(null)
const pinnedOp = ref<string | null>(null)
const hoverPart = ref<string | null>(null)
const activePart = computed(() => hoverPart.value)
const activeOp = computed(() => hoverOp.value ?? pinnedOp.value)
const dimOp = (op: string) => activeOp.value !== null && activeOp.value !== op
const dimPart = (pt: string) => activePart.value !== null && activePart.value !== pt
watch(res, (r) => {
  if (pinnedOp.value && !r?.operators.includes(pinnedOp.value)) pinnedOp.value = null
})

const tip = ref<{ panel: GagePanel; style: Record<string, string | undefined>; lines: string[] } | null>(null)
function showTip(panel: GagePanel, x: number, y: number, lines: string[]): void {
  tip.value = { panel, style: tooltipPlacement(x, y, panelW.value, props.panelHeight, 170, 18 * lines.length + 10), lines }
}
function onLeave(): void {
  tip.value = null
  hoverPart.value = null
}
function onCell(pk: GagePanel, c: GageCell, flatIndex: number | null, partIndex?: number): void {
  hoverPart.value = c.part
  const s = t.value
  const x = flatIndex !== null ? cellX(flatIndex) : partX(partIndex!)
  const y = yOf(pk, pk === 'range' ? c.range : c.mean)
  showTip(pk, x, y, [`${s.part} ${c.part} · ${s.operator} ${c.operator}`, s.clauses([`${s.mean} ${fmt(c.mean)}`, `${s.range} ${fmt(c.range)}`]), c.values.map(fmt).join(' / ')])
}
function partLines(pt: string): string[] {
  const s = t.value
  const vals = res.value!.cells.filter((c) => c.part === pt).flatMap((c) => c.values)
  return [`${s.part} ${pt}`, `${s.mean} ${fmt(res.value!.partMeans.get(pt)!)}`, s.between(fmt(Math.min(...vals)), fmt(Math.max(...vals)))]
}
function onPart(pk: GagePanel, pt: string): void {
  hoverPart.value = pt
  showTip(pk, partX(partIdx(pt)), yOf(pk, res.value!.partMeans.get(pt)!), partLines(pt))
}
function onOpBox(pk: GagePanel, op: string, j: number): void {
  const st = opStats.value[j]
  const s = t.value
  showTip(pk, opX(j), yOf(pk, st.q3), [`${s.operator} ${op}`, `${s.mean} ${fmt(res.value!.operatorMeans.get(op)!)}`, `${s.median} ${fmt(st.median)}`, s.between(fmt(st.min), fmt(st.max))])
}

// ---- 鍵盤：依零件圖 ←→ 切換零件 ----
const kbPart = ref(0)
const announcement = ref('')
const partText = computed(() => {
  const pt = res.value?.parts[kbPart.value]
  return pt === undefined ? '' : t.value.clauses(partLines(pt))
})
function selectPart(i: number): void {
  const r = res.value!
  kbPart.value = Math.max(0, Math.min(r.parts.length - 1, i))
  const pt = r.parts[kbPart.value]
  onPart('byPart', pt)
  announcement.value = partText.value
}
function onPartFocus(): void {
  selectPart(Math.min(kbPart.value, (res.value?.parts.length ?? 1) - 1))
}
function onPartKey(e: KeyboardEvent): void {
  const n = res.value!.parts.length
  const map: Record<string, number> = { ArrowRight: kbPart.value + 1, ArrowLeft: kbPart.value - 1, Home: 0, End: n - 1 }
  if (!(e.key in map)) return
  e.preventDefault()
  selectPart(map[e.key])
}

defineExpose({
  /** 完整的分析結果（變異成分、ANOVA、ndc、判定、管制界限）；資料有問題時為 null */
  result: () => res.value,
  /** 資料問題：empty / parts / operators / trials / missing */
  error: () => error.value,
})
</script>
