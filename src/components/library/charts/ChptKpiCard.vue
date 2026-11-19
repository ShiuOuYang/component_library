<template>
  <div
    class="chpt-kpi-card relative flex w-full min-w-0 flex-col gap-2 overflow-hidden rounded-xl border border-stroke-light bg-surface-primary text-left"
    :class="[props.size === 'sm' ? 'p-3' : 'p-4', { 'is-clickable transition-shadow hover:shadow-md': props.clickable }]"
  >
    <!--
      可點：鋪一顆填滿整張卡片的透明按鈕（「延伸點擊區」）。
      不把整張卡片做成 <button>：按鈕裡不能放 <div>，actions 插槽裡的按鈕也會變成「按鈕裡的按鈕」，鍵盤與螢幕閱讀器都會壞掉
    -->
    <button
      v-if="props.clickable"
      type="button"
      class="absolute inset-0 z-[1] rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus"
      :aria-label="ariaLabel"
      @click="onClick"
    ></button>
    <!-- 狀態色條：顏色之外，狀態也一定有圖示與文字（右上角） -->
    <span v-if="status" class="absolute inset-y-0 left-0 w-1" :class="STATUS_STYLE[status].bar" aria-hidden="true"></span>

    <ChptStatistic
      :title="props.title"
      :value="props.value"
      :precision="props.precision"
      :group-separator="props.groupSeparator"
      :prefix="props.prefix"
      :suffix="props.suffix"
      :delta="deltaValue"
      :delta-suffix="deltaSuffixText"
      :delta-precision="props.deltaPrecision"
      :higher-is-better="props.higherIsBetter"
      :description="comparisonText"
      :size="props.size === 'sm' ? 'sm' : 'md'"
      :loading="props.loading"
    >
      <template #title>
        <span class="min-w-0 flex-1 truncate">
          <slot name="title">{{ props.title }}</slot>
        </span>
        <span
          v-if="status && !props.loading"
          class="inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium"
          :class="STATUS_STYLE[status].badge"
        >
          <ChptIcon :size="12" :weight="600" color="current">{{ STATUS_STYLE[status].icon }}</ChptIcon>
          {{ statusLabel }}
        </span>
        <span v-if="$slots.actions" class="relative z-[2] shrink-0">
          <slot name="actions"></slot>
        </span>
      </template>

      <template #footer>
        <div v-if="hasTrend" class="mt-1" :class="props.size === 'sm' ? 'h-6' : 'h-9'">
          <SparklineChart
            :data="props.trend"
            :type="props.trendType"
            :value-field="props.trendValueField"
            :label-field="props.trendLabelField"
            :title="trendTitle"
            :reference-value="props.showTargetLine ? props.target : null"
            :accent-color="status ? STATUS_STYLE[status].color : null"
            :value-format="props.trendFormat ?? undefined"
            :enable-tooltip="!props.clickable"
            :auto-resize="true"
          />
        </div>
        <p v-if="targetText" class="text-xs text-content-tertiary">{{ targetText }}</p>
        <slot name="footer"></slot>
      </template>
    </ChptStatistic>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChptStatistic from '../ui/ChptStatistic.vue'
import ChptIcon from '../ui/ChptIcon.vue'
import SparklineChart from './SparklineChart.vue'
import { chartPalette } from './chartTheme'
import { useLocale } from '../shared/config'

/**
 * ChptKpiCard（CHPT 主題） - KPI 卡片
 *
 * 儀表板最上面那一排：數字 + 與前期比較 + 趨勢線 + 是否達標。
 * 組合 ChptStatistic 與 SparklineChart，把每張卡片都要自己湊的部分做好：
 *   - 給 previous 就自動算出變化（百分比或差值），不必自己算 delta
 *   - 給 target（與 thresholds）就判定達標 / 接近 / 未達標：左側色條 + 圖示 + 文字（不只靠顏色），
 *     目標同時畫成趨勢線上的參考線
 *   - 「好壞」跟著 higherIsBetter：不良率下降是好事，顯示綠色
 *   - clickable 時整張卡片是一顆按鈕（點了看明細），鍵盤可操作
 */

export type KpiStatus = 'good' | 'warning' | 'critical'

export interface ChptKpiCardProps {
  title: string
  value?: number | string | null
  precision?: number
  groupSeparator?: boolean
  prefix?: string
  suffix?: string
  /** 數值越高越好（良率、產出）；不良率、停機時間這類請設 false */
  higherIsBetter?: boolean
  size?: 'sm' | 'md'
  loading?: boolean

  // ===== 與前期比較 =====
  /** 前期數值：給了就自動算出 delta（delta 有給時以 delta 為準） */
  previous?: number | null
  /** 自動計算的變化：percent（相對變化 %）或 absolute（差值，單位同數值） */
  deltaMode?: 'percent' | 'absolute'
  /** 直接指定變化量（不用 previous 計算） */
  delta?: number | null
  /** 變化量的單位；不給時 percent 為 '%'、absolute 為 suffix */
  deltaSuffix?: string
  deltaPrecision?: number
  /** 比較基準的說明（例如「較上週」） */
  comparisonLabel?: string

  // ===== 目標與狀態 =====
  /** 目標值：顯示「目標 …」、畫在趨勢線上，並用來判定狀態 */
  target?: number | null
  /**
   * 判定狀態的門檻 [接近, 達標]（以數值本身比較）。不給時只看 target：達到為達標、否則未達標。
   * higherIsBetter 為 false 時反過來：數值 ≤ 達標門檻為達標，≤ 接近門檻為接近
   */
  thresholds?: [number, number] | null
  /** 直接指定狀態（優先於 target / thresholds）；null 不顯示狀態 */
  status?: KpiStatus | null
  /** 目標的顯示格式；不給時用 precision、prefix、suffix */
  targetFormat?: ((value: number) => string) | null
  /** 目標畫成趨勢線上的參考線 */
  showTargetLine?: boolean

  // ===== 趨勢 =====
  /** 趨勢資料（數字陣列，或物件陣列配合 trendValueField / trendLabelField） */
  trend?: Array<number | null | Record<string, unknown>>
  trendType?: 'line' | 'area' | 'bar'
  trendValueField?: string
  trendLabelField?: string
  /** 趨勢的讀螢幕說明（例如「近 12 週」）；畫面上不顯示 */
  trendLabel?: string
  trendFormat?: ((value: number) => string) | null

  /** 整張卡片可點（送出 click）；會變成一顆按鈕 */
  clickable?: boolean
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptKpiCardProps>(), {
  value: null,
  precision: undefined,
  groupSeparator: true,
  prefix: '',
  suffix: '',
  higherIsBetter: true,
  size: 'md',
  loading: false,
  previous: null,
  deltaMode: 'percent',
  delta: undefined,
  deltaSuffix: undefined,
  deltaPrecision: 1,
  comparisonLabel: '',
  target: null,
  thresholds: null,
  status: undefined,
  targetFormat: null,
  showTargetLine: true,
  trend: () => [],
  trendType: 'line',
  trendValueField: 'value',
  trendLabelField: 'label',
  trendLabel: '',
  trendFormat: null,
  clickable: false,
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const STATUS_STYLE: Record<KpiStatus, { icon: string; badge: string; bar: string; color: string }> = {
  good: { icon: 'check_circle', badge: 'bg-success-subtle text-success-on-subtle', bar: 'bg-success-solid', color: chartPalette.good },
  warning: { icon: 'error', badge: 'bg-warning-subtle text-warning-on-subtle', bar: 'bg-warning-solid', color: chartPalette.warning },
  critical: { icon: 'cancel', badge: 'bg-danger-subtle text-danger-on-subtle', bar: 'bg-danger-solid', color: chartPalette.critical },
}

const numericValue = computed(() =>
  typeof props.value === 'number' && Number.isFinite(props.value) ? props.value : null
)

/** 變化量：delta 有給用 delta；否則由 previous 計算。前期為 0 時沒有百分比可言 */
const deltaValue = computed<number | null>(() => {
  if (props.delta !== undefined) return props.delta
  const v = numericValue.value
  const p = props.previous
  if (v === null || p === null || p === undefined || !Number.isFinite(p)) return null
  if (props.deltaMode === 'absolute') return v - p
  return p === 0 ? null : ((v - p) / Math.abs(p)) * 100
})

const deltaSuffixText = computed(() => {
  if (props.deltaSuffix !== undefined) return props.deltaSuffix
  if (props.delta !== undefined) return '%'
  return props.deltaMode === 'absolute' ? props.suffix : '%'
})

const comparisonText = computed(() => (deltaValue.value === null ? '' : props.comparisonLabel))

/** 狀態：指定的優先；其次依 thresholds；再其次只看 target */
const status = computed<KpiStatus | null>(() => {
  if (props.status !== undefined) return props.status
  const v = numericValue.value
  if (v === null) return null
  const better = (a: number, b: number) => (props.higherIsBetter ? a >= b : a <= b)
  if (props.thresholds) {
    const [near, good] = props.thresholds
    if (better(v, good)) return 'good'
    if (better(v, near)) return 'warning'
    return 'critical'
  }
  if (props.target === null || props.target === undefined) return null
  return better(v, props.target) ? 'good' : 'critical'
})

const statusLabel = computed(() => (status.value ? t.value.kpiCard[status.value] : ''))

function formatTarget(v: number): string {
  if (props.targetFormat) return props.targetFormat(v)
  const n =
    props.precision !== undefined
      ? v.toLocaleString(t.value.code, { minimumFractionDigits: props.precision, maximumFractionDigits: props.precision, useGrouping: props.groupSeparator })
      : v.toLocaleString(t.value.code, { useGrouping: props.groupSeparator })
  return `${props.prefix}${n}${props.suffix ? ` ${props.suffix}`.replace(/^ (%)$/, '$1') : ''}`
}

const targetText = computed(() =>
  props.target === null || props.target === undefined || props.loading ? '' : t.value.kpiCard.target(formatTarget(props.target))
)

const hasTrend = computed(() => !props.loading && (props.trend?.length ?? 0) > 0)
const trendTitle = computed(() => t.value.kpiCard.trend(props.title, props.trendLabel))

/** 可點時整張卡片是按鈕：名稱要把數字、變化、狀態一起念出來（按鈕內容不會被逐一朗讀） */
const ariaLabel = computed(() => {
  const parts = [props.title]
  if (props.value !== null && props.value !== undefined) parts.push(`${props.prefix}${props.value}${props.suffix}`)
  if (statusLabel.value) parts.push(statusLabel.value)
  if (targetText.value) parts.push(targetText.value)
  return parts.join(t.value.chart.clauseSeparator)
})

function onClick(event: MouseEvent): void {
  if (props.clickable) emit('click', event)
}

defineExpose({
  /** 目前的狀態（依 status / thresholds / target 判定） */
  status,
  /** 實際顯示的變化量（delta 或由 previous 算出） */
  delta: deltaValue,
})
</script>
