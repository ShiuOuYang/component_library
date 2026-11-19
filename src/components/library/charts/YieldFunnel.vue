<template>
  <div class="yield-funnel flex flex-col gap-3" :style="props.autoResize ? { width: '100%' } : { width: `${props.width}px` }">
    <div v-if="props.title || result.rty !== null" class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h3 v-if="props.title" class="text-sm font-semibold text-content-primary">{{ props.title }}</h3>
      <p v-if="result.rty !== null" class="funnel-rty text-sm text-content-secondary">
        {{ i18n.funnel.rty }}
        <strong class="text-base tabular-nums text-content-primary">{{ pctText(result.rty) }}</strong>
      </p>
    </div>

    <p v-if="!result.rows.length" class="py-6 text-center text-sm text-content-tertiary">{{ props.emptyText ?? i18n.funnel.empty }}</p>

    <ol v-else class="flex flex-col">
      <li v-for="(row, i) in result.rows" :key="row.key" class="funnel-step">
        <!-- 兩站之間：這一站的良率與損失 -->
        <div
          v-if="i > 0"
          class="funnel-link flex items-center gap-2 py-1 text-xs tabular-nums"
          :style="{ paddingLeft: props.align === 'center' ? undefined : `${props.labelWidth + 12}px`, justifyContent: props.align === 'center' ? 'center' : undefined }"
        >
          <span aria-hidden="true" class="text-content-tertiary">↓</span>
          <span class="text-content-secondary">{{ i18n.funnel.stepYield }} {{ row.stepYield === null ? '—' : pctText(row.stepYield) }}</span>
          <span v-if="row.loss > 0" :class="isWorst(i) ? 'font-medium' : 'text-content-tertiary'" :style="isWorst(i) ? { color: chartPalette.critical } : undefined">
            {{ i18n.funnel.loss(fmt(row.loss)) }}
          </span>
          <span
            v-if="isWorst(i)"
            class="funnel-worst rounded px-1.5 py-px text-[11px] font-medium"
            :style="{ color: chartPalette.critical, boxShadow: `inset 0 0 0 1px ${chartPalette.critical}` }"
          >{{ i18n.funnel.worst }}</span>
        </div>

        <component
          :is="clickable ? 'button' : 'div'"
          :type="clickable ? 'button' : undefined"
          class="funnel-row grid w-full items-center gap-x-3 rounded-sm text-left"
          :class="clickable ? 'cursor-pointer hover:bg-surface-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--t-stroke-focus))]' : ''"
          :style="{ gridTemplateColumns: `${props.labelWidth}px minmax(0, 1fr) auto` }"
          :aria-label="rowLabel(row, i)"
          @click="clickable && emit('step-click', props.steps[i], row)"
        >
          <span class="truncate text-sm text-content-primary" :title="row.label">{{ row.label }}</span>
          <span class="relative flex" :style="{ height: `${props.barHeight}px`, justifyContent: props.align === 'center' ? 'center' : 'flex-start' }" aria-hidden="true">
            <span
              class="funnel-bar block h-full rounded-sm"
              :style="{ width: pct(row.count / maxCount), background: barColor, minWidth: row.count > 0 ? '2px' : '0' }"
            ></span>
          </span>
          <span class="flex min-w-[5.5rem] flex-col items-end leading-tight tabular-nums">
            <span class="text-sm font-semibold text-content-primary">{{ fmt(row.count) }}<span v-if="props.unit" class="ml-0.5 text-xs font-normal text-content-tertiary">{{ props.unit }}</span></span>
            <span v-if="i > 0" class="text-xs text-content-tertiary">{{ i18n.funnel.cumulative }} {{ row.cumulative === null ? '—' : pctText(row.cumulative) }}</span>
          </span>
        </component>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'
import * as d3 from 'd3'
import { chartPalette } from './chartTheme'
import { computeFunnel, type FunnelRow, type FunnelStep } from './utils/bullet'
import { useLocale } from '../shared/config'

/**
 * YieldFunnel —— 良率漏斗（各站剩下多少）
 *
 * 依製程順序列出每一站通過後的數量：長條寬度是數量、兩站之間標出站良率與損失數，
 * 標題列是直通率（RTY = 最後一站 / 投入）。損失最多的那一站以紅字與「最大損失」標籤標出 ——
 * 改善要先從那一站下手。
 *
 * - align：'left' 長條靠左（好比較長度）；'center' 置中（漏斗外觀）
 * - 綁 @step-click 時每一站變成按鈕（點下去看該站的不良明細）
 */

interface YieldFunnelProps {
  /** 依製程順序；第一站的 count 是投入數 */
  steps: FunnelStep[]
  title?: string
  unit?: string
  align?: 'left' | 'center'
  /** 標出損失最多的站 */
  highlightWorst?: boolean
  /** 長條顏色；不給時用主色 */
  color?: string
  width?: number
  autoResize?: boolean
  labelWidth?: number
  barHeight?: number
  /** 百分比小數位數 */
  percentDigits?: number
  valueFormat?: ((value: number) => string) | null
  emptyText?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const i18n = useLocale()
const props = withDefaults(defineProps<YieldFunnelProps>(), {
  title: '',
  unit: '',
  align: 'left',
  highlightWorst: true,
  color: undefined,
  width: 520,
  autoResize: false,
  labelWidth: 96,
  barHeight: 24,
  percentDigits: 1,
  valueFormat: null,
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'step-click', step: FunnelStep, row: FunnelRow): void
}>()

const instance = getCurrentInstance()
const clickable = computed(() => !!instance?.vnode.props?.onStepClick)

const result = computed(() => computeFunnel(props.steps))
const maxCount = computed(() => Math.max(1, ...result.value.rows.map((r) => r.count)))

const isWorst = (i: number) => props.highlightWorst && i === result.value.worstIndex

/** 所有長條同一個顏色：寬度才是重點；最大損失用文字與標籤標出，不靠長條換色 */
const barColor = computed(() => props.color ?? chartPalette.primary)

const defaultFormat = d3.format(',~f')
const fmt = (v: number) => (props.valueFormat ? props.valueFormat(v) : defaultFormat(v))
const pct = (r: number) => `${(Math.max(0, Math.min(1, r)) * 100).toFixed(3)}%`
const pctText = (r: number) => `${(r * 100).toFixed(props.percentDigits)}%`

function rowLabel(row: FunnelRow, i: number): string {
  const parts = [row.label, `${fmt(row.count)}${props.unit}`]
  if (row.stepYield !== null) parts.push(`${i18n.value.funnel.stepYield} ${pctText(row.stepYield)}`)
  if (row.loss > 0) parts.push(i18n.value.funnel.loss(fmt(row.loss)))
  if (row.cumulative !== null && row.stepYield !== null) parts.push(`${i18n.value.funnel.cumulative} ${pctText(row.cumulative)}`)
  if (isWorst(i)) parts.push(i18n.value.funnel.worst)
  return parts.join(', ')
}
</script>
