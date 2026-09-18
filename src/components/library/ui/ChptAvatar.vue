<template>
  <span
    class="relative inline-flex align-middle"
    :class="sizeClass"
  >
    <!-- 圖片頭像 -->
    <img
      v-if="props.src"
      :src="props.src"
      :alt="props.alt || props.name"
      class="block h-full w-full object-cover"
      :class="shapeClass"
    />
    <!-- 文字頭像（無圖時顯示姓名縮寫） -->
    <span
      v-else
      class="flex h-full w-full items-center justify-center font-medium select-none"
      :class="[shapeClass, variantBgClass, variantTextClass]"
      aria-hidden="true"
    >
      {{ initials }}
    </span>

    <!-- 線上狀態圓點 -->
    <span
      v-if="props.showStatus"
      class="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-surface-primary"
      :class="statusColorClass"
    ></span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * ChptAvatar（CHPT 主題）- 大頭貼 / 頭像元件
 *
 * 特性：
 * - 支援圖片（src）或文字縮寫（name）兩種模式
 * - 尺寸 / 形狀（圓形、圓角方形）
 * - 可選線上狀態圓點
 * - 完整 Props 型別定義
 */

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type AvatarShape = 'circle' | 'square'
type AvatarVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface ChptAvatarProps {
  /** 圖片來源 */
  src?: string
  /** 圖片替代文字 */
  alt?: string
  /** 名稱（無圖時取縮寫） */
  name?: string
  /** 尺寸 */
  size?: AvatarSize
  /** 形狀 */
  shape?: AvatarShape
  /** 文字頭像配色語意 */
  variant?: AvatarVariant
  /** 是否顯示狀態圓點 */
  showStatus?: boolean
  /** 狀態圓點色 class */
  statusColor?: string
}

const props = withDefaults(defineProps<ChptAvatarProps>(), {
  src: '',
  alt: '',
  name: '',
  size: 'md',
  shape: 'circle',
  variant: 'neutral',
  showStatus: false,
  statusColor: '',
})

/** 尺寸 class */
const sizeClass = computed(() => {
  const map: Record<AvatarSize, string> = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-14 w-14 text-lg',
    xl: 'h-20 w-20 text-xl',
  }
  return map[props.size] ?? map.md
})

/** 形狀 class */
const shapeClass = computed(() =>
  props.shape === 'square' ? 'rounded-lg' : 'rounded-full'
)

/** 文字頭像背景色 */
const variantBgClass = computed(() => {
  const map: Record<AvatarVariant, string> = {
    primary: 'bg-accent-subtle',
    secondary: 'bg-secondary-100',
    success: 'bg-success-subtle-hover',
    warning: 'bg-warning-subtle-hover',
    danger: 'bg-danger-subtle-hover',
    info: 'bg-info-subtle-hover',
    neutral: 'bg-surface-tertiary',
  }
  return map[props.variant] ?? map.neutral
})

/** 文字頭像文字色 */
const variantTextClass = computed(() => {
  const map: Record<AvatarVariant, string> = {
    primary: 'text-accent-strong',
    secondary: 'text-secondary-600',
    success: 'text-success',
    warning: 'text-warning-on-subtle',
    danger: 'text-danger',
    info: 'text-info',
    neutral: 'text-content-primary',
  }
  return map[props.variant] ?? map.neutral
})

/** 狀態圓點色 */
const statusColorClass = computed(
  () => props.statusColor || 'bg-success-solid'
)

/** 名稱縮寫（最多取前兩個詞的首字母） */
const initials = computed(() => {
  const trimmed = props.name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return trimmed.slice(0, 2).toUpperCase()
})
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
