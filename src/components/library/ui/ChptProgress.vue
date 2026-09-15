<template>
  <div class="flex items-center gap-3">
    <div
      ref="trackRef"
      class="flex-1 rounded-full overflow-hidden"
      :style="{ height: `${props.strokeWidth}px`, backgroundColor: trackColorClass }"
      :class="props.trackColor"
    >
      <div
        class="h-full rounded-full transition-all duration-500"
        :style="{ width: `${displayPercent}%` }"
        :class="barColorClass"
      />
    </div>

    <span v-if="props.showLabel" class="text-xs text-neutral-600 tabular-nums whitespace-nowrap">
      {{ displayPercent }}%
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * ChptProgress（CHPT 主題） - 進度條元件
 *
 * 特性：
 * - v-model 支援（百分比 0~100）
 * - 多種語意色、可調粗細
 * - 可選百分比標籤
 * - 完整 Props / Emits 型別定義
 */

type ProgressStatus = 'primary' | 'success' | 'warning' | 'danger' | 'info'

interface ChptProgressProps {
  /** v-model 值（0~100） */
  modelValue?: number
  /** 狀態色 */
  status?: ProgressStatus
  /** 進度條粗細（px） */
  strokeWidth?: number
  /** 軌道底色 class */
  trackColor?: string
  /** 是否顯示百分比標籤 */
  showLabel?: boolean
}

const props = withDefaults(defineProps<ChptProgressProps>(), {
  modelValue: 0,
  status: 'primary',
  strokeWidth: 8,
  trackColor: '',
  showLabel: true,
})

// 註：本元件為純顯示，modelValue 是單向輸入，不會回寫。
// 原本宣告的 update:modelValue 從未 emit，留著只會誤導使用端，故移除。

/** 限制在 0~100 */
const displayPercent = computed(() =>
  Math.max(0, Math.min(100, Number(props.modelValue) || 0))
)

/** 進度條顏色 */
const barColorClass = computed(() => {
  const map: Record<ProgressStatus, string> = {





    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
    info: 'bg-info-500',
  }
  return map[props.status] ?? map.primary
})

/** 軌道預設色 */
const trackColorClass = computed(() => props.trackColor || 'bg-neutral-100')
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
