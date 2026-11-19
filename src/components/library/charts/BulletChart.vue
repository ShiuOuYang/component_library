<template>
  <div class="bullet-chart flex flex-col gap-1" :style="props.autoResize ? { width: '100%' } : { width: `${props.width}px` }">
    <h3 v-if="props.title" class="mb-1 text-sm font-semibold text-content-primary">{{ props.title }}</h3>
    <ul class="flex flex-col" :style="{ gap: `${props.rowGap}px` }">
      <li
        v-for="row in rows"
        :key="row.key"
        class="bullet-row grid items-center gap-x-3"
        :style="{ gridTemplateColumns: `${props.labelWidth}px minmax(0, 1fr) auto` }"
      >
        <div class="min-w-0">
          <div class="truncate text-sm text-content-primary" :title="row.item.label">{{ row.item.label }}</div>
          <div v-if="row.item.sublabel" class="truncate text-xs text-content-tertiary">{{ row.item.sublabel }}</div>
        </div>

        <component
          :is="clickable ? 'button' : 'div'"
          :type="clickable ? 'button' : undefined"
          class="bullet-track relative w-full rounded-sm text-left"
          :class="clickable ? 'cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--t-stroke-focus))]' : ''"
          :style="{ height: `${props.barHeight}px`, background: chartTheme.surfaceMuted }"
          role="meter"
          :aria-label="row.item.label"
          :aria-valuemin="row.min"
          :aria-valuemax="row.max"
          :aria-valuenow="row.hasValue ? row.item.value! : undefined"
          :aria-valuetext="row.valueText"
          @click="clickable && emit('item-click', row.item)"
        >
          <!-- 區間：同一色系由淺到深（傳統子彈圖）；有指定 color 時用指定的 -->
          <span
            v-for="(seg, i) in row.segments"
            :key="i"
            class="bullet-band absolute inset-y-0"
            :style="{ left: pct(seg.from), width: pct(seg.to - seg.from), background: seg.band.color || bandShade(i, row.segments.length) }"
            aria-hidden="true"
          ></span>
          <!-- 實際值：中間較細的長條 -->
          <span
            v-if="row.hasValue"
            class="bullet-value absolute left-0 rounded-[1px]"
            :style="{ width: pct(row.ratio), top: '30%', bottom: '30%', background: row.color }"
            aria-hidden="true"
          ></span>
          <!-- 前期值：細線（對照用） -->
          <span
            v-if="row.previousRatio !== null"
            class="bullet-previous absolute"
            :style="{ left: `calc(${pct(row.previousRatio)} - 1px)`, top: '20%', bottom: '20%', width: '2px', background: chartPalette.deemphasis }"
            aria-hidden="true"
          ></span>
          <!-- 目標：比長條高的直線 -->
          <span
            v-if="row.targetRatio !== null"
            class="bullet-target absolute"
            :style="{ left: `calc(${pct(row.targetRatio)} - 1.5px)`, top: '8%', bottom: '8%', width: '3px', background: chartTheme.text }"
            aria-hidden="true"
          ></span>
        </component>

        <div class="flex min-w-[4.5rem] flex-col items-end leading-tight">
          <span class="bullet-value-text text-sm font-semibold tabular-nums text-content-primary">
            {{ row.hasValue ? fmt(row.item.value!) : '—' }}<span v-if="row.item.unit" class="ml-0.5 text-xs font-normal text-content-tertiary">{{ row.item.unit }}</span>
          </span>
          <span v-if="row.band?.label" class="bullet-status inline-flex items-center gap-1 text-xs" :style="{ color: row.color }">
            <span aria-hidden="true">{{ STATUS_ICON[row.band.status ?? 'good'] }}</span>
            <span class="text-content-secondary">{{ row.band.label }}</span>
          </span>
          <span v-else-if="row.targetRatio !== null" class="text-xs tabular-nums text-content-tertiary">{{ i18n.bullet.target(fmt(row.item.target!)) }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'
import * as d3 from 'd3'
import { chartPalette, chartTheme } from './chartTheme'
import type { GaugeBand } from './GaugeChart.vue'
import { bandOf, bandSegments, niceMax, ratioOf } from './utils/bullet'
import { useLocale } from '../shared/config'

/**
 * BulletChart —— 子彈圖（實際值 vs 目標 vs 區間）
 *
 * 一列一個指標：粗的底色是區間（差 / 普通 / 好），中間細長條是實際值，直線是目標。
 * 比儀表省空間，好幾個指標上下排在一起就能一眼比較 —— 各站稼動率、各線產出達成率、各機台 OEE。
 *
 * - 區間（bands）與 GaugeChart 相同格式；有 label 時在右側顯示狀態（圖示 + 文字，不只靠顏色）
 * - 實際值長條的顏色：區間有 status 時用狀態色，否則用主色
 * - previous：前期值畫一條淡色細線
 * - 每一列是 role="meter"，念出數值、目標與狀態
 */

export interface BulletItem {
  key?: string | number
  label: string
  /** 第二行小字（例如單位、站別） */
  sublabel?: string
  value: number | null
  target?: number | null
  /** 前期值（淡色細線） */
  previous?: number | null
  min?: number
  /** 軌道上限；不給時依數值、目標與區間自動取整 */
  max?: number
  bands?: GaugeBand[] | null
  unit?: string
}

interface BulletChartProps {
  items: BulletItem[]
  /** 所有列共用的區間（各列的 bands 優先） */
  bands?: GaugeBand[] | null
  /** 所有列共用的上限（各列的 max 優先）；比較同一單位的指標時讓刻度一致 */
  max?: number | null
  width?: number
  autoResize?: boolean
  title?: string
  labelWidth?: number
  barHeight?: number
  rowGap?: number
  valueFormat?: ((value: number) => string) | null
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const i18n = useLocale()
const props = withDefaults(defineProps<BulletChartProps>(), {
  bands: null,
  max: null,
  width: 480,
  autoResize: false,
  title: '',
  labelWidth: 112,
  barHeight: 22,
  rowGap: 12,
  valueFormat: null,
})

const emit = defineEmits<{
  (e: 'item-click', item: BulletItem): void
}>()

/** 有綁 @item-click 時每一列變成按鈕（可用 Tab 聚焦、Enter 觸發） */
const instance = getCurrentInstance()
const clickable = computed(() => !!instance?.vnode.props?.onItemClick)

const STATUS_COLOR = { good: chartPalette.good, warning: chartPalette.warning, critical: chartPalette.critical }
const STATUS_ICON = { good: '●', warning: '▲', critical: '✕' }

const defaultFormat = d3.format(',~f')
const fmt = (v: number) => (props.valueFormat ? props.valueFormat(v) : defaultFormat(Number(v.toPrecision(6))))
const pct = (r: number) => `${(r * 100).toFixed(3)}%`

/** 傳統子彈圖的區間：同一個灰階由淺到深（第一段最深 = 最差） */
function bandShade(i: number, n: number): string {
  const strength = n <= 1 ? 0.35 : 0.5 - (0.35 * i) / (n - 1)
  return `rgb(var(--t-content-primary) / ${strength.toFixed(2)})`
}

const rows = computed(() =>
  props.items.map((item, index) => {
    const bands = item.bands ?? props.bands
    const min = item.min ?? 0
    const hasValue = item.value !== null && item.value !== undefined && Number.isFinite(item.value)
    const max = item.max ?? props.max ?? niceMax([item.value, item.target, item.previous, ...(bands ?? []).map((b) => b.to)])
    const band = hasValue ? bandOf(bands, item.value) : null
    const color = band ? band.color || (band.status ? STATUS_COLOR[band.status] : chartPalette.primary) : chartPalette.primary
    const target = item.target !== null && item.target !== undefined && Number.isFinite(item.target) ? item.target : null
    const previous = item.previous !== null && item.previous !== undefined && Number.isFinite(item.previous) ? item.previous : null
    const parts = [hasValue ? `${fmt(item.value!)}${item.unit ?? ''}` : '—']
    if (target !== null) parts.push(i18n.value.bullet.target(`${fmt(target)}${item.unit ?? ''}`))
    if (band?.label) parts.push(band.label)
    return {
      key: String(item.key ?? index),
      item,
      min,
      max,
      hasValue,
      ratio: hasValue ? ratioOf(item.value!, min, max) : 0,
      targetRatio: target === null ? null : ratioOf(target, min, max),
      previousRatio: previous === null ? null : ratioOf(previous, min, max),
      segments: bandSegments(bands, min, max),
      band,
      color,
      valueText: parts.join(', '),
    }
  })
)
</script>
