<template>
  <div class="gauge-chart" :style="containerStyle">
    <svg
      :viewBox="`0 0 ${VB_W} ${geometry.height}`"
      :width="autoResize ? '100%' : width"
      :height="autoResize ? undefined : (width * geometry.height) / VB_W"
      role="meter"
      :aria-label="title || '儀表'"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuenow="hasValue ? (value as number) : undefined"
      :aria-valuetext="ariaValueText"
    >
      <g :transform="`translate(${CX}, ${geometry.cy})`">
        <!-- 區間（外圈細環）：看得出門檻在哪 -->
        <g v-if="showBands && bandArcs.length" class="gauge-bands" aria-hidden="true">
          <path v-for="b in bandArcs" :key="b.key" :d="b.d" :style="{ fill: b.color }" />
        </g>
        <!-- 軌道：同色系的淡色，整條都看得出是哪個狀態 -->
        <path class="gauge-track" :d="trackPath" :style="{ fill: fillColor }" />
        <path v-if="valuePath" class="gauge-value" :d="valuePath" :style="{ fill: fillColor }" />

        <!-- 目標：弧上的刻度；文字放在中央（放弧外面在窄卡片裡會被切掉） -->
        <g v-if="targetView" class="gauge-target" aria-hidden="true">
          <line :x1="targetView.x1" :y1="targetView.y1" :x2="targetView.x2" :y2="targetView.y2" />
          <text x="0" :y="geometry.targetY" text-anchor="middle" dominant-baseline="central">{{ targetView.label }}</text>
        </g>

        <!-- 中央數值 -->
        <text class="gauge-value-text" x="0" :y="geometry.valueY" text-anchor="middle" dominant-baseline="central">
          {{ valueText }}<tspan v-if="unit && hasValue" class="gauge-unit" dx="2">{{ unit }}</tspan>
        </text>
        <text v-if="title" class="gauge-title" x="0" :y="geometry.titleY" text-anchor="middle" dominant-baseline="central">{{ title }}</text>

        <!-- 狀態：圖示 + 文字（不能只靠顏色） -->
        <g v-if="currentBand?.label" class="gauge-status" :transform="`translate(${-statusWidth / 2}, ${geometry.statusY})`">
          <g :style="{ color: fillColor }" aria-hidden="true">
            <circle v-if="currentBand.status !== 'warning'" cx="6" cy="0" r="6" fill="currentColor" />
            <path v-else d="M6,-6 L12,5 L0,5 Z" fill="currentColor" />
            <path v-if="currentBand.status === 'good'" d="M3,0 L5.2,2.2 L9,-2" class="gauge-icon-stroke" />
            <path v-else-if="currentBand.status === 'critical'" d="M3.5,-2.5 L8.5,2.5 M8.5,-2.5 L3.5,2.5" class="gauge-icon-stroke" />
            <path v-else-if="currentBand.status === 'warning'" d="M6,-2.5 L6,1.2 M6,3 L6,3.2" class="gauge-icon-stroke" />
          </g>
          <text x="17" y="0" dominant-baseline="central">{{ currentBand.label }}</text>
        </g>

        <!-- 兩端的最小、最大值 -->
        <template v-if="showMinMax">
          <text class="gauge-minmax" :x="geometry.startX" :y="geometry.endY + 14" text-anchor="middle">{{ fmt(min) }}</text>
          <text class="gauge-minmax" :x="-geometry.startX" :y="geometry.endY + 14" text-anchor="middle">{{ fmt(max) }}</text>
        </template>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import * as d3 from 'd3'
import { chartPalette } from './chartTheme'
import { estimateTextWidth } from './utils/chartText'

/**
 * GaugeChart —— 儀表（單一數值對照目標或區間）
 *
 * - 填色代表目前落在哪個區間（例如未達標 / 注意 / 達標），軌道是同色的淡色
 * - 狀態一定同時顯示圖示與文字，不只靠顏色
 * - 外圈細環標出各區間的範圍；target 畫出目標刻度
 * - 用 viewBox 縮放：autoResize 時寬度跟著容器，高度依比例
 */

/** 區間；from 是前一個區間的 to（第一個從 min 開始） */
export interface GaugeBand {
  /** 區間上限（含） */
  to: number
  /** 顏色；未指定時依 status，再沒有就用類別色第 1 號 */
  color?: string
  /** 狀態文字（例如「達標」）；有給才會顯示 */
  label?: string
  /** 狀態：決定預設顏色與圖示 */
  status?: 'good' | 'warning' | 'critical'
}

interface GaugeChartProps {
  // === 基礎配置 ===
  /** 寬度（px）；高度依掃描角度自動算 */
  width?: number
  /** 寬度跟著容器（高度依比例） */
  autoResize?: boolean

  // === 數據配置 ===
  value: number | null
  min?: number
  max?: number

  // === 區間配置 ===
  /** 由小到大的區間 */
  bands?: GaugeBand[] | null
  /** 目標值（畫一條刻度） */
  target?: number | null
  targetLabel?: string

  // === 元素樣式配置 ===
  /** 掃描角度（度）：180 是半圓，240 是常見的儀表 */
  sweep?: number
  /** 弧的粗細（以 200 寬為基準） */
  thickness?: number

  // === 視覺配置 ===
  /** 數值下方的名稱（也是讀螢幕的名稱） */
  title?: string
  /** 單位（接在數值後面，例如 %、pcs） */
  unit?: string
  valueFormat?: ((value: number) => string) | null
  showMinMax?: boolean
  /** 外圈顯示各區間 */
  showBands?: boolean
}

const props = withDefaults(defineProps<GaugeChartProps>(), {
  width: 200,
  autoResize: false,
  min: 0,
  max: 100,
  bands: null,
  target: null,
  targetLabel: '目標',
  sweep: 240,
  thickness: 14,
  title: '',
  unit: '',
  valueFormat: null,
  showMinMax: true,
  showBands: true,
})

const emit = defineEmits<{
  'chart-ready': [payload: { width: number; height: number }]
}>()

/** viewBox 的寬度與圓心 x */
const VB_W = 200
const CX = VB_W / 2
const R = 72

const containerStyle = computed(() => (props.autoResize ? { width: '100%' } : { width: `${props.width}px` }))

const hasValue = computed(() => props.value !== null && props.value !== undefined && Number.isFinite(props.value))

/** 掃描角度夾在 90～300 度 */
const half = computed(() => (Math.min(300, Math.max(90, props.sweep)) / 2) * (Math.PI / 180))

/** 依掃描角度算圓心與高度：中央的幾行文字、兩端標籤都要放得下 */
const geometry = computed(() => {
  const cy = R + 10 // 上方留給外圈區間
  const endY = -R * Math.cos(half.value) // 弧端點相對圓心的 y（> 0 在圓心下方）
  const valueY = half.value > Math.PI / 2 ? 0 : -16 // 半圓時數值往上放
  // 數值下方依序：名稱、狀態、目標（有才佔一行）
  let y = valueY + 4
  const titleY = (y += props.title ? 18 : 0)
  const statusY = (y += props.bands?.some((b) => b.label) ? 18 : 0)
  const targetY = (y += props.target !== null && props.target !== undefined ? 16 : 0)
  const bottom = Math.max(targetY + 12, endY + 22)
  return { cy, endY, valueY, titleY, statusY, targetY, startX: R * Math.sin(-half.value), height: Math.ceil(cy + bottom) }
})

const domainMin = computed(() => Math.min(props.min, props.max))
const domainMax = computed(() => (props.max === props.min ? props.min + 1 : Math.max(props.min, props.max)))

const angle = computed(() =>
  d3.scaleLinear().domain([domainMin.value, domainMax.value]).range([-half.value, half.value]).clamp(true)
)

const innerR = computed(() => R - props.thickness)

const arc = d3.arc<{ startAngle: number; endAngle: number }>().cornerRadius(2)

const trackPath = computed(
  () => arc.innerRadius(innerR.value).outerRadius(R)({ startAngle: -half.value, endAngle: half.value }) ?? ''
)

const valuePath = computed(() => {
  if (!hasValue.value) return ''
  const end = angle.value(props.value as number)
  if (end <= -half.value) return ''
  return arc.innerRadius(innerR.value).outerRadius(R)({ startAngle: -half.value, endAngle: end }) ?? ''
})

// === 區間 ===

const STATUS_COLOR = { good: chartPalette.good, warning: chartPalette.warning, critical: chartPalette.critical }

const sortedBands = computed(() => [...(props.bands ?? [])].filter((b) => Number.isFinite(b.to)).sort((a, b) => a.to - b.to))

function bandColor(b: GaugeBand): string {
  return b.color || (b.status ? STATUS_COLOR[b.status] : chartPalette.primary)
}

/** 目前數值落在哪個區間（超過最後一個區間時算最後一個） */
const currentBand = computed<GaugeBand | null>(() => {
  if (!hasValue.value || !sortedBands.value.length) return null
  const v = props.value as number
  return sortedBands.value.find((b) => v <= b.to) ?? sortedBands.value[sortedBands.value.length - 1]
})

const fillColor = computed(() => (currentBand.value ? bandColor(currentBand.value) : chartPalette.primary))

const bandArcs = computed(() => {
  const ring = d3.arc<{ startAngle: number; endAngle: number }>().innerRadius(R + 3).outerRadius(R + 6)
  let from = domainMin.value
  return sortedBands.value.map((b, i) => {
    const a0 = angle.value(from)
    const a1 = angle.value(b.to)
    from = b.to
    return { key: `${i}-${b.to}`, d: a1 > a0 ? (ring({ startAngle: a0, endAngle: a1 }) ?? '') : '', color: bandColor(b) }
  })
})

const targetView = computed(() => {
  if (props.target === null || props.target === undefined || !Number.isFinite(props.target)) return null
  const a = angle.value(props.target)
  const sin = Math.sin(a)
  const cos = Math.cos(a)
  const r0 = innerR.value - 3
  const r1 = R + 8
  return {
    x1: r0 * sin,
    y1: -r0 * cos,
    x2: r1 * sin,
    y2: -r1 * cos,
    label: `${props.targetLabel} ${fmt(props.target)}`,
  }
})

// === 文字 ===

const defaultFormat = d3.format(',~f')
function fmt(v: number): string {
  return (props.valueFormat ?? defaultFormat)(v)
}

const valueText = computed(() => (hasValue.value ? fmt(props.value as number) : '—'))

const statusWidth = computed(() => (currentBand.value?.label ? 17 + estimateTextWidth(currentBand.value.label, 12) : 0))

const ariaValueText = computed(() => {
  if (!hasValue.value) return '沒有資料'
  const base = `${fmt(props.value as number)}${props.unit}`
  return currentBand.value?.label ? `${base}，${currentBand.value.label}` : base
})

onMounted(() => {
  emit('chart-ready', { width: props.width, height: (props.width * geometry.value.height) / VB_W })
})
</script>

<style scoped>
.gauge-chart {
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.gauge-chart svg {
  display: block;
  overflow: visible;
}

/* 軌道是填色的淡色版：同色系，整條都看得出狀態 */
.gauge-track {
  opacity: 0.16;
}

.gauge-bands path {
  opacity: 0.55;
}

.gauge-value-text {
  font-size: 28px;
  font-weight: 600;
  fill: rgb(var(--t-content-primary));
}

.gauge-unit {
  font-size: 14px;
  font-weight: 500;
  fill: rgb(var(--t-content-secondary));
}

.gauge-title {
  font-size: 12px;
  fill: rgb(var(--t-content-secondary));
}

.gauge-status text {
  font-size: 12px;
  font-weight: 600;
  fill: rgb(var(--t-content-primary));
}

.gauge-icon-stroke {
  fill: none;
  stroke: rgb(var(--t-content-on-solid));
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.gauge-target line {
  stroke: rgb(var(--t-content-primary));
  stroke-width: 2;
  stroke-linecap: round;
}

.gauge-target text,
.gauge-minmax {
  font-size: 10px;
  fill: rgb(var(--t-content-tertiary));
}
</style>
