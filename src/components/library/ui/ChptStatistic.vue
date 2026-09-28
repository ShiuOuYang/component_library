<template>
  <div class="flex flex-col gap-1 min-w-0">
    <div class="flex items-center gap-1.5 text-sm text-content-secondary">
      <slot name="title">{{ props.title }}</slot>
    </div>

    <div v-if="props.loading" class="flex flex-col gap-2 py-1" aria-busy="true" aria-live="polite">
      <span class="block h-8 w-32 rounded bg-surface-tertiary animate-pulse"></span>
      <span class="sr-only">載入中</span>
    </div>

    <template v-else>
      <div class="flex items-baseline gap-1 flex-wrap text-content-primary">
        <span v-if="props.prefix || $slots.prefix" class="text-content-secondary" :class="affixSize">
          <slot name="prefix">{{ props.prefix }}</slot>
        </span>
        <span class="font-semibold tabular-nums tracking-tight" :class="valueSize">
          {{ formattedValue }}
        </span>
        <span v-if="props.suffix || $slots.suffix" class="text-content-secondary" :class="affixSize">
          <slot name="suffix">{{ props.suffix }}</slot>
        </span>
      </div>

      <div v-if="hasDelta || props.description" class="flex items-center gap-2 text-xs">
        <span v-if="hasDelta" class="inline-flex items-center gap-0.5 font-medium tabular-nums" :class="trendClass">
          <ChptIcon :size="14" :weight="500" color="current">{{ trendIcon }}</ChptIcon>
          <span aria-hidden="true">{{ formattedDelta }}</span>
          <!-- 顏色與箭頭之外也要有文字：色盲與螢幕閱讀器使用者才知道是升是降、是好是壞 -->
          <span class="sr-only">{{ trendSpoken }}</span>
        </span>
        <span v-if="props.description" class="text-content-tertiary">{{ props.description }}</span>
      </div>

      <slot name="footer"></slot>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChptIcon from './ChptIcon.vue'

/**
 * ChptStatistic（CHPT 主題） - 統計數值（KPI）
 *
 * 用途：儀表板上的關鍵數字 —— 良率、產出、不良數、稼動率 —— 以及它和前期相比的變化。
 *
 * 重點是「變化的好壞」不一定等於「升降」：良率上升是好事，不良率上升是壞事。
 * 用 higherIsBetter=false 讓「下降」顯示成綠色；只看箭頭方向配色的 KPI 卡片
 * 會把「不良率 +2%」畫成綠色，這是很常見也很危險的錯誤。
 */

interface ChptStatisticProps {
  /** 標題 */
  title?: string
  /** 數值；字串原樣顯示（例如 'N/A'） */
  value?: number | string | null
  /** 小數位數（四捨五入，遠離零） */
  precision?: number
  /** 千分位分隔 */
  groupSeparator?: boolean
  /** 前綴（例如 $） */
  prefix?: string
  /** 後綴（例如 %、pcs） */
  suffix?: string
  /** 與前期相比的變化量；null 表示不顯示 */
  delta?: number | null
  /** 變化量的單位：'%'（百分點 / 百分比）或 ''（與數值同單位） */
  deltaSuffix?: string
  /** 變化量的小數位數 */
  deltaPrecision?: number
  /** 數值越高越好（良率、產出）；不良率、停機時間這類請設 false */
  higherIsBetter?: boolean
  /** 補充說明（例如「較上週」） */
  description?: string
  /** 數值的顏色 class（例如 text-danger）；預設跟主題文字色 */
  valueClass?: string
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg'
  /** 載入中（顯示骨架） */
  loading?: boolean
}

const props = withDefaults(defineProps<ChptStatisticProps>(), {
  title: '',
  value: null,
  precision: undefined,
  groupSeparator: true,
  prefix: '',
  suffix: '',
  delta: null,
  deltaSuffix: '%',
  deltaPrecision: 1,
  higherIsBetter: true,
  description: '',
  valueClass: '',
  size: 'md',
  loading: false,
})

const valueSize = computed(
  () => [({ sm: 'text-xl', md: 'text-3xl', lg: 'text-4xl' } as Record<string, string>)[props.size] ?? 'text-3xl', props.valueClass]
)
const affixSize = computed(() => ({ sm: 'text-sm', md: 'text-base', lg: 'text-lg' } as Record<string, string>)[props.size] ?? 'text-base')

/** 四捨五入到指定位數（遠離零；避開 1.005 這種二進位誤差） */
function roundTo(n: number, digits: number): number {
  const f = 10 ** digits
  return (Math.sign(n) * Math.round(Number((Math.abs(n) * f).toPrecision(15)))) / f
}

function formatNumber(n: number, digits: number | undefined, grouping: boolean): string {
  if (digits === undefined) {
    return Number(n.toPrecision(15)).toLocaleString('en-US', { useGrouping: grouping, maximumFractionDigits: 15 })
  }
  return roundTo(n, digits).toLocaleString('en-US', {
    useGrouping: grouping,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

const formattedValue = computed(() => {
  const v = props.value
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'string') return v
  if (!Number.isFinite(v)) return '—'
  return formatNumber(v, props.precision, props.groupSeparator)
})

const hasDelta = computed(() => typeof props.delta === 'number' && Number.isFinite(props.delta))

const direction = computed<'up' | 'down' | 'flat'>(() => {
  const d = props.delta ?? 0
  const rounded = roundTo(d, props.deltaPrecision)
  return rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
})

/** 這個變化是好是壞 */
const quality = computed<'good' | 'bad' | 'neutral'>(() => {
  if (direction.value === 'flat') return 'neutral'
  const up = direction.value === 'up'
  return up === props.higherIsBetter ? 'good' : 'bad'
})

const trendClass = computed(
  () => ({ good: 'text-success', bad: 'text-danger', neutral: 'text-content-tertiary' })[quality.value]
)

const trendIcon = computed(
  () => ({ up: 'arrow_upward', down: 'arrow_downward', flat: 'remove' })[direction.value]
)

const formattedDelta = computed(() => {
  const d = Math.abs(props.delta ?? 0)
  const sign = direction.value === 'up' ? '+' : direction.value === 'down' ? '−' : ''
  return sign + formatNumber(d, props.deltaPrecision, props.groupSeparator) + props.deltaSuffix
})

const trendSpoken = computed(() => {
  const d = formatNumber(Math.abs(props.delta ?? 0), props.deltaPrecision, props.groupSeparator) + props.deltaSuffix
  const verb = { up: `上升 ${d}`, down: `下降 ${d}`, flat: '持平' }[direction.value]
  const judge = { good: '（表現較佳）', bad: '（表現較差）', neutral: '' }[quality.value]
  return `${verb}${judge}`
})
</script>
