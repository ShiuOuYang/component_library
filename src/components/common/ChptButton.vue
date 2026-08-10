<template>
  <button
    :type="props.type"
    @click="handleClick"
    :class="buttonClasses"
    :disabled="props.disabled || props.loading"
  >
    <ChptIcon v-if="props.icon" :color="props.iconColor" :class="iconClass">{{ props.icon }}</ChptIcon>

    <template v-if="props.loading">
      <i class="fas fa-spinner fa-spin"></i>
    </template>

    <span v-if="props.label && !props.loading" :class="textClass">{{ props.label }}</span>

    <!-- 角標 -->
    <span
      v-if="props.hasBadge && (props.badgeText === 0 || props.badgeText)"
      class="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2"
      :class="badgeClass"
    >
      <p class="transition-all text-xs px-2 py-1" :class="animationClass">
        {{ displayedBadgeText }}
      </p>
    </span>

    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ChptIcon from './ChptIcon.vue'
import type { ButtonNativeType } from './types/ui.types'

/**
 * ChptButton（CHPT 主題） - 通用按鈕元件
 *
 * 特性：
 * - 完整 Props 型別定義（interface + withDefaults）
 * - 支援顏色、尺寸、圓角、輪廓樣式
 * - 內建 loading / disabled / badge 狀態
 * - 前後置圖示（Material Symbols）
 */

interface ChptButtonProps {
  /** 按鈕文字 */
  label?: string
  /** 圖示名稱（Material Symbols） */
  icon?: string
  /** 圖示位置 */
  iconPosition?: 'left' | 'right'
  /** 圖示顏色 class */
  iconColor?: string
  /** 顏色 */
  color?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning'
  /** 尺寸 */
  size?: '3xs' | '2xs' | 'xs' | 'sm' | 'md' | 'lg'
  /** 圓角 */
  rounded?: 'sm' | 'md' | 'lg' | 'full'
  /** 原生 button type */
  type?: ButtonNativeType
  /** 是否為輪廓樣式 */
  isOutline?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 是否載入中 */
  loading?: boolean
  /** 是否顯示角標 */
  hasBadge?: boolean
  /** 角標文字 */
  badgeText?: string | number
  /** 角標背景色 */
  badgeBgColor?: string
  /** 角標文字色 */
  badgeTextColor?: string
  /** 文字色 class */
  textColor?: string
  /** 自訂 class */
  class?: string
}

const props = withDefaults(defineProps<ChptButtonProps>(), {
  label: '',
  icon: '',
  iconPosition: 'left',
  iconColor: '',
  color: 'primary',
  size: 'md',
  rounded: 'md',
  type: 'button',
  isOutline: false,
  disabled: false,
  loading: false,
  hasBadge: false,
  badgeText: 0,
  badgeBgColor: 'danger',
  badgeTextColor: 'white',
  textColor: 'white',
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

/** 尺寸對應 class */
const sizeClass = computed(() => {
  const map: Record<string, string> = {
    '3xs': 'px-0.5 py-0 text-[6px] h-[8px] leading-none min-w-[12px]',
    '2xs': 'px-1 py-0 text-[8px] h-[10px] leading-none min-w-[16px]',
    xs: 'px-1.5 py-0 text-[10px] h-4 leading-tight',
    sm: 'px-2 py-0.5 text-xs h-6',
    md: 'px-4 py-2 text-base h-10',
    lg: 'px-6 py-3 text-lg h-12',
  }
  return map[props.size] ?? map.md
})

/** 圓角對應 class */
const roundedClass = computed(() => {
  const map: Record<string, string> = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }
  return map[props.rounded] ?? 'rounded-md'
})

/** 顏色對應 class（solid / outline 完整類名） */
const colorClass = computed(() => {
  const colorMap: Record<string, { solid: string; outline: string }> = {
    primary: {
      solid: 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600 active:bg-blue-700',
      outline: 'bg-white/80 text-blue-600 border border-blue-500 hover:bg-blue-500 hover:text-white',
    },
    secondary: {
      solid: 'bg-gray-500 border-gray-500 text-white hover:bg-gray-600 active:bg-gray-700',
      outline: 'bg-white/80 text-gray-700 border border-gray-500 hover:bg-gray-500 hover:text-white',
    },
    success: {
      solid: 'bg-green-500 border-green-500 text-white hover:bg-green-600 active:bg-green-700',
      outline: 'bg-white/80 text-green-600 border border-green-500 hover:bg-green-500 hover:text-white',
    },
    danger: {
      solid: 'bg-red-500 border-red-500 text-white hover:bg-red-600 active:bg-red-700',
      outline: 'bg-white/80 text-red-600 border border-red-500 hover:bg-red-500 hover:text-white',
    },
    warning: {
      solid: 'bg-yellow-500 border-yellow-500 text-white hover:bg-yellow-600 active:bg-yellow-700',
      outline: 'bg-white/80 text-yellow-600 border border-yellow-500 hover:bg-yellow-500 hover:text-white',
    },
  }

  const mode = props.isOutline ? 'outline' : 'solid'
  return colorMap[props.color]?.[mode] ?? colorMap.primary[mode]
})

/** 最終按鈕 class 組合 */
const buttonClasses = computed(() => [
  'flex items-center transition-all duration-300 focus:outline-none relative',
  sizeClass.value,
  colorClass.value,
  roundedClass.value,
  { 'flex-row-reverse': props.iconPosition === 'right' },
  { 'opacity-50 cursor-not-allowed': props.disabled || props.loading },
  { 'cursor-progress': props.loading },
  props.class,
])

/** 圖示間距 class */
const iconClass = computed(() =>
  props.label ? (props.iconPosition === 'left' ? 'mr-2' : 'ml-2') : ''
)

/** 文字間距 class */
const textClass = computed(() => {
  if (!props.icon) return ''
  return props.iconPosition === 'left' ? 'ml-2' : 'mr-2'
})

/** 角標樣式 */
const badgeClass = computed(() => {
  const bgColorMap: Record<string, string> = {
    primary: 'bg-blue-500',
    secondary: 'bg-gray-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-blue-400',
  }
  const bg = bgColorMap[props.badgeBgColor] ?? 'bg-red-500'
  const text = props.badgeTextColor === 'black' ? 'text-black' : 'text-white'
  return `${bg} ${text} rounded-full`
})

/** 角標動畫（數字變更時閃動） */
const displayedBadgeText = ref<string | number>(props.badgeText)
const animationClass = ref('')

watch(
  () => props.badgeText,
  (newValue) => {
    animationClass.value = 'opacity-0 -translate-y-1/2'
    setTimeout(() => {
      displayedBadgeText.value = newValue
      animationClass.value = 'opacity-100'
    }, 200)
  }
)

/** 點擊行為：禁用或載入中時忽略 */
function handleClick(event: MouseEvent): void {
  if (props.disabled || props.loading) return
  emit('click', event)
}
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
