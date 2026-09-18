<template>
  <div
    class="flex items-center gap-3"
    :class="[props.direction === 'horizontal' ? 'w-full' : 'h-full flex-col']"
  >
    <div
      v-if="props.direction === 'horizontal'"
      class="flex-1 border-t"
      :class="lineColorClass"
    />
    <div
      v-else
      class="flex-1 border-l"
      :class="lineColorClass"
    />

    <slot>
      <span v-if="props.text" class="text-sm text-content-disabled whitespace-nowrap">{{ props.text }}</span>
    </slot>

    <div
      v-if="props.direction === 'horizontal'"
      class="flex-1 border-t"
      :class="lineColorClass"
    />
    <div
      v-else
      class="flex-1 border-l"
      :class="lineColorClass"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DividerDirection } from '@/components/library/shared/types/ui.types'

/**
 * ChptDivider（CHPT 主題） - 分隔線元件
 *
 * 特性：
 * - 支援水平 / 垂直方向
 * - 中間可放置文字或自訂插槽
 * - 完整 Props 型別定義
 */

interface ChptDividerProps {
  /** 方向 */
  direction?: DividerDirection
  /** 中間文字 */
  text?: string
  /** 線條顏色 class */
  color?: string
}

const props = withDefaults(defineProps<ChptDividerProps>(), {
  direction: 'horizontal',
  text: '',
  color: 'neutral-200',
})

const lineColorClass = computed(() => `border-${props.color}`)
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
