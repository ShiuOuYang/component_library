<template>
  <span
    v-if="props.loading"
    role="status"
    :aria-label="props.text || '載入中'"
    class="inline-flex items-center justify-center"
    :class="[props.fullWidth ? 'w-full' : '', props.center ? 'flex-col gap-2' : 'gap-2']"
  >
    <svg
      class="animate-spin"
      :style="{ width: `${props.size}px`, height: `${props.size}px` }"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    <span
      v-if="props.text"
      :class="['text-content-tertiary', textSizeClass]"
    >
      {{ props.text }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * ChptSpinner（CHPT 主題） - 載入指示器
 *
 * 特性：
 * - 可調尺寸、顏色、可選文字
 * - loading 為 false 時不渲染
 * - 完整 Props 型別定義
 */

interface ChptSpinnerProps {
  /** 是否載入中 */
  loading?: boolean
  /** 尺寸（px） */
  size?: number | string
  /** 可選文字 */
  text?: string
  /** 顏色 class */
  color?: string
  /** 是否全寬 */
  fullWidth?: boolean
  /** 置中顯示（文字在圖示下方） */
  center?: boolean
}

const props = withDefaults(defineProps<ChptSpinnerProps>(), {
  loading: false,
  size: 24,
  text: '',
  color: 'primary-500',
  fullWidth: false,
  center: false,
})

/** size 允許 number 或 string（例如 "32"），比較前一律正規化為數值 */
const numericSize = computed(() => Number(props.size) || 0)

const textSizeClass = computed(() =>
  numericSize.value >= 40 ? 'text-sm' : numericSize.value >= 28 ? 'text-xs' : 'text-base'
)
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
