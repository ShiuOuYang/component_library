<template>
  <span ref="containerRef" class="relative inline-flex">
    <slot />

    <!-- 圓點 / 計數徽章 -->
    <span
      v-if="showBadge"
      class="absolute inline-flex items-center justify-center rounded-full font-medium text-white"
      :class="[
        positionClass,
        sizeClass,
        colorClass,
        props.isDot && props.count === undefined ? 'w-2.5 h-2.5' : '',
      ]"
    >
      <template v-if="!props.isDot">{{ displayCount }}</template>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * ChptBadge（CHPT 主題） - 徽章 / 角標元件
 *
 * 特性：
 * - 環繞內容右下角顯示徽章
 * - 支援計數、圓點、溢出上限
 * - 可自訂顏色、位置
 * - 完整 Props 型別定義
 */

type BadgeStatus = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'dark'

interface ChptBadgeProps {
  /** 顯示數量 */
  count?: number
  /** 是否為純圓點 */
  isDot?: boolean
  /** 顯示上限（超過顯示 max+） */
  max?: number
  /** 是否顯示（0 時可隱藏） */
  showZero?: boolean
  /** 狀態色 */
  status?: BadgeStatus
  /** 位置：右上角 */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  /** 偏移量（px） */
  offset?: number
  /** 自訂背景色 */
  color?: string
}

const props = withDefaults(defineProps<ChptBadgeProps>(), {
  count: undefined,
  isDot: false,
  max: 99,
  showZero: false,
  status: 'danger',
  position: 'top-right',
  offset: 0,
  color: '',
})

/** 是否顯示徽章 */
const showBadge = computed(() => {
  if (props.isDot) return true
  if (props.count === undefined) return false
  return props.showZero || props.count > 0
})

/** 顯示的計數 */
const displayCount = computed(() => {
  const count = props.count ?? 0
  return count > props.max ? `${props.max}+` : String(count)
})

/** 位置 class */
const positionClass = computed(() => {
  const map: Record<string, string> = {
    'top-right': `top-[-${props.offset}px] right-[-${props.offset}px]`,
    'top-left': `top-[-${props.offset}px] left-[-${props.offset}px]`,
    'bottom-right': `bottom-[-${props.offset}px] right-[-${props.offset}px]`,
    'bottom-left': `bottom-[-${props.offset}px] left-[-${props.offset}px]`,
  }
  return map[props.position]
})

/** 尺寸（非圓點時） */
const sizeClass = computed(() => {
  if (props.isDot) return ''
  return 'min-w-[16px] h-[16px] px-1 text-[10px] leading-none'
})

/** 顏色 */
const colorClass = computed(() => {
  if (props.color) return props.color
  const map: Record<BadgeStatus, string> = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
    info: 'bg-info-500',
    dark: 'bg-neutral-700',
  }
  return map[props.status] ?? map.danger
})
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
