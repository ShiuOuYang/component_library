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

    <span v-if="props.showLabel" class="text-xs text-gray-600 tabular-nums whitespace-nowrap">
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

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

/** 限制在 0~100 */
const displayPercent = computed(() =>
  Math.max(0, Math.min(100, Number(props.modelValue) || 0))
)

/** 進度條顏色 */
const barColorClass = computed(() => {
  const map: Record<ProgressStatus, string> = {
    primary: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
    info: 'bg-sky-500',
  }
  return map[props.status] ?? map.primary
})

/** 軌道預設色 */
const trackColorClass = computed(() => props.trackColor || 'bg-gray-100')
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
