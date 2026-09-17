<template>
  <button
    :type="props.type"
    @click="handleClick"
    :class="buttonClasses"
    :disabled="props.disabled || props.loading"
    :aria-busy="props.loading"
  >
    <ChptIcon v-if="props.icon" :color="props.iconColor">{{ props.icon }}</ChptIcon>

    <ChptSpinner v-if="props.loading" loading :size="16" />

    <span v-if="props.label && !props.loading">{{ props.label }}</span>

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
import { ref, computed, watch, onUnmounted } from 'vue'
import ChptIcon from './ChptIcon.vue'
import ChptSpinner from './ChptSpinner.vue'
import type { ButtonNativeType } from '@/components/library/shared/types/ui.types'

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
  /**
   * 尺寸（高度 24 / 32 / 40 / 48px，見 tokens.js 的 control）。
   * `3xs` 與 `2xs` 已過時：原本只有 8px / 10px，點不到，現與 `xs` 等同。
   */
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
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

/** 尺寸對應 class */
/**
 * 尺寸對應的幾何，全部來自 design tokens 的 control（24 / 32 / 40 / 48px）。
 *
 * 高度用 h-control-*（固定高），工具列上並排的按鈕才會對齊；文字靠
 * base class 的 inline-flex + items-center 垂直居中，所以不需要 py-*。
 *
 * ⚠️ 原本這裡是各自寫死的 padding，sm 只有 24px（全庫 47 處在用，
 *    就是「按鈕都很矮」的來源），另外還有 3xs=8px、2xs=10px、xs=16px ——
 *    8px 高的按鈕點不到，也低於 WCAG 2.5.8 的 24×24 最小點擊目標。
 *    現在 3xs / 2xs 一律對映到 xs（24px），保留這兩個值只為不讓既有
 *    呼叫端直接壞掉。
 */
const SIZE_CLASS: Record<NonNullable<ChptButtonProps['size']>, string> = {
  '3xs': 'h-control-xs px-2 text-xs',
  '2xs': 'h-control-xs px-2 text-xs',
  xs: 'h-control-xs px-2 text-xs',
  sm: 'h-control-sm px-3 text-sm',
  md: 'h-control-md px-4 text-base',
  lg: 'h-control-lg px-6 text-lg',
}

const sizeClass = computed(() => SIZE_CLASS[props.size] ?? SIZE_CLASS.md)

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
      solid: 'bg-primary-500 border-primary-500 text-white hover:bg-primary-600 active:bg-primary-700',
      outline: 'bg-white/80 text-primary-600 border border-primary-500 hover:bg-primary-500 hover:text-white',
    },
    secondary: {
      solid: 'bg-secondary-500 border-secondary-500 text-white hover:bg-secondary-600 active:bg-secondary-700',
      outline: 'bg-white/80 text-secondary-600 border border-secondary-500 hover:bg-secondary-500 hover:text-white',
    },
    success: {
      solid: 'bg-success-500 border-success-500 text-white hover:bg-success-600 active:bg-success-700',
      outline: 'bg-white/80 text-success-600 border border-success-500 hover:bg-success-500 hover:text-white',
    },
    danger: {
      solid: 'bg-danger-500 border-danger-500 text-white hover:bg-danger-600 active:bg-danger-700',
      outline: 'bg-white/80 text-danger-600 border border-danger-500 hover:bg-danger-500 hover:text-white',
    },
    warning: {
      solid: 'bg-warning-500 border-warning-500 text-white hover:bg-warning-600 active:bg-warning-700',
      outline: 'bg-white/80 text-warning-600 border border-warning-500 hover:bg-warning-500 hover:text-white',
    },
  }

  const mode = props.isOutline ? 'outline' : 'solid'
  return colorMap[props.color]?.[mode] ?? colorMap.primary[mode]
})

/** 最終按鈕 class 組合 */
const buttonClasses = computed(() => [
  // focus-visible:* 這組是必要的：focus:outline-none 會蓋掉 base.css 的全域
  // :focus-visible 外框，沒有替代樣式的話鍵盤使用者完全看不到焦點位置。
  'flex items-center transition-all duration-300 relative',
  'focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500',
  sizeClass.value,
  colorClass.value,
  roundedClass.value,
  gapClass.value,
  { 'flex-row-reverse': props.iconPosition === 'right' },
  { 'opacity-50 cursor-not-allowed': props.disabled || props.loading },
  { 'cursor-progress': props.loading },
  props.class,
])

/**
 * 圖示與文字的間距。
 * 原本 icon 加 mr-2、text 再加 ml-2，兩者相加變成兩倍間距；
 * 改用容器層的 gap，只出現一次。
 */
const gapClass = computed(() => (props.icon && props.label ? 'gap-2' : ''))

/** 角標樣式 */
const badgeClass = computed(() => {
  const bgColorMap: Record<string, string> = {
    primary: 'bg-primary-500',
    secondary: 'bg-secondary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
    info: 'bg-info-500',
  }
  const bg = bgColorMap[props.badgeBgColor] ?? 'bg-danger-500'
  const text = props.badgeTextColor === 'black' ? 'text-black' : 'text-white'
  return `${bg} ${text} rounded-full`
})

/** 角標動畫（數字變更時閃動） */
const displayedBadgeText = ref<string | number>(props.badgeText)
const animationClass = ref('')

/** 角標動畫的計時器；連續變更時要先取消上一個，卸載時也要清掉 */
let badgeTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => props.badgeText,
  (newValue) => {
    animationClass.value = 'opacity-0 -translate-y-1/2'
    clearTimeout(badgeTimer)
    badgeTimer = setTimeout(() => {
      displayedBadgeText.value = newValue
      animationClass.value = 'opacity-100'
    }, 200)
  }
)

onUnmounted(() => clearTimeout(badgeTimer))

/** 點擊行為：禁用或載入中時忽略 */
function handleClick(event: MouseEvent): void {
  if (props.disabled || props.loading) return
  emit('click', event)
}
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
