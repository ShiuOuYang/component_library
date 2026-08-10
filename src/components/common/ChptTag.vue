<template>
  <span
    class="inline-flex items-center gap-1 rounded-full font-medium transition-all"
    :class="[sizeClass, colorClass]"
  >
    <slot name="icon">
      <ChptIcon v-if="props.icon" :size="iconSize" :class="iconColorClass">{{ props.icon }}</ChptIcon>
    </slot>

    <slot>{{ props.label }}</slot>

    <button
      v-if="props.closable"
      type="button"
      class="flex items-center cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
      :aria-label="`關閉 ${props.label}`"
      @click="handleClose"
    >
      <ChptIcon :size="closeSize">close</ChptIcon>
    </button>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChptIcon from './ChptIcon.vue'
import type { ComponentSize, ColorVariant } from './types/ui.types'

/**
 * ChptTag（CHPT 主題） - 標籤 / 膠囊元件
 *
 * 特性：
 * - 多種顏色語意、尺寸、可選圖示
 * - 支援可關閉（closable）與關閉事件
 * - 完整 Props / Emits 型別定義
 */

interface ChptTagProps {
  /** 標籤文字 */
  label?: string
  /** 顏色語意 */
  color?: ColorVariant | 'primary'
  /** 是否為輪廓樣式 */
  isOutline?: boolean
  /** 尺寸 */
  size?: ComponentSize
  /** 前置圖示（Material Symbols） */
  icon?: string
  /** 是否可關閉 */
  closable?: boolean
}

const props = withDefaults(defineProps<ChptTagProps>(), {
  label: '',
  color: 'primary',
  isOutline: false,
  size: 'sm',
  icon: '',
  closable: false,
})

const emit = defineEmits<{
  (e: 'close', event: MouseEvent): void
}>()

/** 尺寸對應 class */
const sizeClass = computed(() => {
  const map: Record<ComponentSize, string> = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
    xl: 'text-lg px-3.5 py-2',
  }
  return map[props.size]
})

/** 顏色對應 class（solid / outline） */
const colorClass = computed(() => {
  const solidMap: Record<string, string> = {
    primary: 'bg-blue-100 text-blue-700',
    secondary: 'bg-gray-100 text-gray-600',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-sky-100 text-sky-700',
    dark: 'bg-gray-700 text-gray-100',
    light: 'bg-gray-50 text-gray-600 border border-gray-200',
  }
  const outlineMap: Record<string, string> = {
    primary: 'bg-transparent text-blue-600 border border-blue-400',
    secondary: 'bg-transparent text-gray-600 border border-gray-300',
    success: 'bg-transparent text-green-600 border border-green-400',
    warning: 'bg-transparent text-yellow-700 border border-yellow-400',
    danger: 'bg-transparent text-red-600 border border-red-400',
    info: 'bg-transparent text-sky-600 border border-sky-400',
    dark: 'bg-transparent text-gray-700 border border-gray-500',
    light: 'bg-transparent text-gray-500 border border-gray-300',
  }
  const map = props.isOutline ? outlineMap : solidMap
  return map[props.color] ?? map.primary
})

/** 圖示尺寸 */
const iconSize = computed(() =>
  ({ xs: 12, sm: 14, md: 16, lg: 18, xl: 20 })[props.size] ?? 14
)

/** 關閉紐尺寸 */
const closeSize = computed(() =>
  ({ xs: 10, sm: 12, md: 14, lg: 16, xl: 18 })[props.size] ?? 12
)

/** 有圖示時的文字色彩 */
const iconColorClass = computed(() => 'text-current')

/** 關閉事件 */
function handleClose(event: MouseEvent): void {
  emit('close', event)
}
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
