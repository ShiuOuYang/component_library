<template>
  <div class="oee-chart flex flex-col gap-3" :style="props.autoResize ? { width: '100%' } : { width: `${props.width}px`, maxWidth: '100%' }">
    <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
      <span v-if="current" class="text-sm text-content-secondary" data-current>{{ current.name }}</span>
    </div>

    <p v-if="!current" class="py-8 text-center text-sm text-content-tertiary">{{ props.emptyText ?? t.empty }}</p>
    <template v-else>
      <!-- A × P × Q = OEE -->
      <dl class="grid grid-cols-2 gap-2 sm:grid-cols-4" data-kpis>
        <div v-for="k in KPIS" :key="k" class="rounded-lg border border-stroke-light bg-surface-secondary px-3 py-2" :data-kpi="k">
          <dt class="text-xs text-content-secondary">{{ t.metrics[k] }}</dt>
          <dd class="text-2xl font-semibold tabular-nums" :class="k === 'oee' ? '' : 'text-content-primary'" :style="kpiStyle(k)">{{ pct(result![k]) }}</dd>
          <dd v-if="target(k) !== null" class="text-[11px] tabular-nums" :style="{ color: meets(k) ? chartTheme.success : chartTheme.warning }">
            {{ t.target(pct(target(k)!)) }}{{ meets(k) ? '' : ` ${t.belowTarget}` }}
          </dd>
        </div>
      </dl>
      <p v-if="result!.biggestLoss" class="text-xs text-content-secondary" data-biggest>
        {{ t.biggestLoss(t.losses[result!.biggestLoss], num(result!.losses[result!.biggestLoss]), unitText, pct(result!.losses[result!.biggestLoss] / (result!.planned || 1))) }}
      </p>

      <!-- 圖例 -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-secondary" aria-hidden="true">
        <span v-for="g in GROUPS" :key="g" class="inline-flex items-center gap-1"><span class="inline-block size-2.5 rounded-sm" :style="{ background: groupColor(g) }"></span>{{ t.groups[g] }}</span>
        <span class="inline-flex items-center gap-1"><span class="inline-block size-2.5 rounded-sm" :style="{ background: chartPalette.good }"></span>{{ t.totals.valuable }}</span>
      </div>

      <!-- 瀑布圖 -->
      <div ref="containerRef" class="relative overflow-x-auto">
        <svg :width="svgWidth" :height="props.height" class="block" role="img" :aria-label="t.waterfallLabel(current.name, pct(result!.oee))" @mouseleave="hover = null">
          <g aria-hidden="true">
            <template v-for="tk in yTicks" :key="tk">
              <line :x1="M.l" :x2="svgWidth - M.r" :y1="y(tk)" :y2="y(tk)" :style="{ stroke: chartTheme.grid }" />
              <text :x="M.l - 6" :y="y(tk)" dy="0.35em" text-anchor="end" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ num(tk) }}</text>
            </template>
            <text :x="M.l - 6" :y="M.t - 10" text-anchor="end" font-size="10" :style="{ fill: chartTheme.textMuted }">{{ unitText }}</text>
          </g>
          <g v-for="(s, i) in result!.steps" :key="s.key" :data-step="s.key" @mouseenter="hover = i">
            <!-- 連接線：上一段的結束高度 -->
            <line v-if="i > 0" :x1="barX(i - 1) + bandW * 0.8" :x2="barX(i)" :y1="y(levelBefore(i))" :y2="y(levelBefore(i))" stroke-dasharray="2 2" :style="{ stroke: chartTheme.axis }" aria-hidden="true" />
            <rect
              :x="barX(i)"
              :y="y(s.to)"
              :width="bandW * 0.8"
              :height="Math.max(s.value > 0 ? 1 : 0, y(s.from) - y(s.to))"
              rx="2"
              :style="{ fill: stepColor(s), opacity: hover === null || hover === i ? 1 : 0.55 }"
            />
            <text :x="barX(i) + bandW * 0.4" :y="y(s.to) - 5" text-anchor="middle" font-size="10" font-weight="600" :style="{ fill: chartTheme.text }" aria-hidden="true">
              {{ s.kind === 'loss' ? `−${num(s.value)}` : num(s.value) }}
            </text>
            <text :x="barX(i) + bandW * 0.4" :y="props.height - M.b + 14" text-anchor="middle" font-size="10" :style="{ fill: s.kind === 'total' ? chartTheme.text : chartTheme.textMuted, fontWeight: s.kind === 'total' ? 600 : 400 }" aria-hidden="true">
              {{ clipText(stepName(s), bandW) }}
            </text>
          </g>
        </svg>
        <div
          v-if="hover !== null"
          class="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border px-2 py-1 text-xs shadow-md"
          :style="{ ...tipStyle, background: chartTheme.surface, borderColor: chartTheme.border, color: chartTheme.text }"
          data-export-ignore
          data-tip
        >
          <div class="font-medium">{{ stepName(result!.steps[hover]) }}</div>
          <div class="text-content-secondary">{{ num(result!.steps[hover].value) }} {{ unitText }} · {{ t.ofPlanned(pct(result!.steps[hover].value / (result!.planned || 1))) }}</div>
          <div v-if="result!.steps[hover].group" class="text-content-secondary">{{ t.groups[result!.steps[hover].group!] }}</div>
        </div>
      </div>

      <table class="sr-only">
        <caption>{{ t.waterfallLabel(current.name, pct(result!.oee)) }}</caption>
        <thead>
          <tr><th scope="col">{{ t.item }}</th><th scope="col">{{ unitText }}</th><th scope="col">{{ t.share }}</th></tr>
        </thead>
        <tbody>
          <tr v-for="s in result!.steps" :key="s.key">
            <th scope="row">{{ stepName(s) }}{{ s.group ? ` (${t.groups[s.group]})` : '' }}</th>
            <td>{{ s.kind === 'loss' ? `−${num(s.value)}` : num(s.value) }}</td>
            <td>{{ pct(s.value / (result!.planned || 1)) }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- 多台設備比較 -->
    <section v-if="props.items.length > 1" :aria-labelledby="`${uid}-cmp`" class="flex flex-col gap-1.5">
      <h4 :id="`${uid}-cmp`" class="text-xs font-semibold text-content-secondary">{{ t.compareTitle }}</h4>
      <ul class="flex flex-col gap-1">
        <li v-for="row in compareRows" :key="row.item.id">
          <button
            type="button"
            class="grid w-full grid-cols-[minmax(5rem,9rem)_minmax(0,1fr)_3.5rem] items-center gap-2 rounded-md px-2 py-1 text-left text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
            :class="row.item.id === current?.id ? 'bg-accent-subtle' : 'hover:bg-surface-secondary'"
            :aria-pressed="row.item.id === current?.id"
            :aria-label="t.compareRow(row.item.name, pct(row.r.oee), pct(row.r.availability), pct(row.r.performance), pct(row.r.quality))"
            :data-item="row.item.id"
            @click="select(row.item)"
          >
            <span class="truncate font-medium text-content-primary">{{ row.item.name }}</span>
            <span class="flex h-3 overflow-hidden rounded-sm bg-surface-tertiary" aria-hidden="true">
              <span :style="{ width: share(row.r.valuable, row.r.planned), background: chartPalette.good }"></span>
              <span v-for="g in GROUPS" :key="g" :style="{ width: share(row.r.groupLoss[g], row.r.planned), background: groupColor(g) }"></span>
            </span>
            <span class="text-right font-semibold tabular-nums text-content-primary">{{ pct(row.r.oee) }}</span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import * as d3 from 'd3'
import { chartPalette, chartTheme } from './chartTheme'
import { useAutoResize } from './composables/useAutoResize'
import { tooltipPlacement } from './utils/tooltipPlacement'
import { OEE_WORLD_CLASS, computeOee, type OeeInput, type OeeLossGroup, type OeeStep } from './utils/oee'
import { useLocale } from '../shared/config'
import { clipText } from '../shared/textClip'

/**
 * OeeChart —— OEE（設備綜合效率）損失瀑布
 *
 * 從計畫生產時間依序扣掉六大損失：設備故障、換線調整（稼動）→ 小停機、速度降低（性能）→ 啟動不良、製程不良（品質），
 * 剩下的就是有效時間。上方列出 OEE = 稼動率 × 性能稼動率 × 良率，並與世界級水準（85%）比較；
 * 多台設備時下方並排比較，點一台看它的瀑布圖。
 */
export interface OeeChartProps {
  /** 設備 / 產線 / 班別（每筆一個瀑布圖） */
  items: OeeInput[]
  /** 目前顯示的 id（v-model:selected；不給時顯示第一筆） */
  selected?: string | null
  /** 時間單位的顯示文字（預設「分」） */
  unit?: string
  /** 目標值；false 不比較。預設世界級水準：OEE 85%、稼動率 90%、性能 95%、良率 99.9% */
  benchmark?: Partial<typeof OEE_WORLD_CLASS> | false
  width?: number
  /** 瀑布圖高度 */
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  title?: string
  valueFormat?: ((v: number) => string) | null
  emptyText?: string
}

const i18n = useLocale()
const t = computed(() => i18n.value.oee)

const props = withDefaults(defineProps<OeeChartProps>(), {
  selected: undefined,
  unit: '',
  benchmark: () => ({ ...OEE_WORLD_CLASS }),
  width: 760,
  height: 300,
  autoResize: false,
  debounceDelay: 100,
  title: '',
  valueFormat: null,
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'update:selected', id: string | null): void
  (e: 'select', item: OeeInput): void
  (e: 'chart-resize', size: { width: number; height: number }): void
}>()

const uid = useId()
const containerRef = ref<HTMLElement | null>(null)
const { effectiveWidth } = useAutoResize(containerRef, props as unknown as { width: number; height: number; autoResize: boolean; debounceDelay: number }, (s) => emit('chart-resize', s))

const KPIS = ['oee', 'availability', 'performance', 'quality'] as const
type Kpi = (typeof KPIS)[number]
const GROUPS: OeeLossGroup[] = ['availability', 'performance', 'quality']

// ---- 選取 ----
const inner = ref<string | null>(null)
const selectedId = computed(() => (props.selected !== undefined ? props.selected : inner.value))
const current = computed(() => props.items.find((it) => it.id === selectedId.value) ?? props.items[0] ?? null)
const result = computed(() => (current.value ? computeOee(current.value) : null))
const compareRows = computed(() => props.items.map((item) => ({ item, r: computeOee(item) })))
function select(item: OeeInput) {
  inner.value = item.id
  emit('update:selected', item.id)
  emit('select', item)
}

// ---- 目標 ----
const target = (k: Kpi): number | null => (props.benchmark === false ? null : (props.benchmark[k] ?? null))
const meets = (k: Kpi) => {
  const tg = target(k)
  return tg === null || (result.value?.[k] ?? 0) >= tg - 1e-9
}
const kpiStyle = (k: Kpi) => (k === 'oee' ? { color: target(k) === null ? chartTheme.text : meets(k) ? chartTheme.success : chartTheme.warning } : undefined)

// ---- 格式 ----
const unitText = computed(() => props.unit || t.value.minutes)
const num = (v: number) => (props.valueFormat ? props.valueFormat(v) : d3.format(Math.abs(v) >= 100 ? ',.0f' : '.1~f')(v))
const pct = (r: number) => `${d3.format('.1~f')(r * 100)}%`
const share = (v: number, total: number) => `${total > 0 ? (v / total) * 100 : 0}%`
function stepName(s: OeeStep): string {
  return s.kind === 'total' ? t.value.totals[s.key as keyof typeof t.value.totals] : t.value.losses[s.key as keyof typeof t.value.losses]
}
const groupColor = (g: OeeLossGroup) => (g === 'availability' ? chartPalette.critical : g === 'performance' ? chartPalette.warning : chartPalette.categorical[4])
const stepColor = (s: OeeStep) => (s.kind === 'loss' ? groupColor(s.group!) : s.key === 'valuable' ? chartPalette.good : chartPalette.primary)

// ---- 版面 ----
const M = { l: 52, r: 12, t: 24, b: 26 }
const n = computed(() => result.value?.steps.length ?? 0)
const svgWidth = computed(() => Math.max(effectiveWidth.value, M.l + M.r + n.value * 56))
const bandW = computed(() => (svgWidth.value - M.l - M.r) / Math.max(1, n.value))
const barX = (i: number) => M.l + i * bandW.value + bandW.value * 0.1
const yScale = computed(() =>
  d3
    .scaleLinear()
    .domain([0, Math.max(1, result.value?.planned ?? 1)])
    .range([props.height - M.b, M.t])
    .nice(),
)
const y = (v: number) => yScale.value(v)
const yTicks = computed(() => yScale.value.ticks(5))
/** 第 i 段開始前的高度（連接線用）：總計段從上一段的底部接過來 */
const levelBefore = (i: number) => {
  const prev = result.value!.steps[i - 1]
  return prev.kind === 'total' ? prev.to : prev.from
}

// ---- 提示 ----
const hover = ref<number | null>(null)
const tipStyle = computed(() => {
  if (hover.value === null || !result.value) return {}
  const s = result.value.steps[hover.value]
  return tooltipPlacement(barX(hover.value) + bandW.value * 0.4, y(s.to), svgWidth.value, props.height, 200, 70)
})

defineExpose({
  /** 目前設備的計算結果 */
  result: () => result.value,
})
</script>
