<template>
  <div
    class="flex flex-col items-center justify-center text-center py-10 px-6"
    :class="props.fullWidth ? 'w-full' : ''"
  >
    <ChptIcon
      :size="props.iconSize"
      :color="props.iconColor"
      class="mb-3"
    >
      {{ props.icon }}
    </ChptIcon>

    <p class="text-content-tertiary font-medium mb-1" :class="textSizeClass">
      <slot>{{ props.title }}</slot>
    </p>

    <p v-if="props.description" class="text-sm text-content-disabled max-w-md">
      {{ props.description }}
    </p>

    <div v-if="$slots.action" class="mt-4 flex items-center gap-3">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChptIcon from './ChptIcon.vue'

/**
 * ChptEmpty（CHPT 主題） - 空狀態元件
 *
 * 特性：
 * - 可自訂圖示、標題、說明
 * - 支援 action 插槽放置操作按鈕
 * - 完整 Props 型別定義
 */

interface ChptEmptyProps {
  /** 圖示（Material Symbols） */
  icon?: string
  /** 標題 */
  title?: string
  /** 說明文字 */
  description?: string
  /** 圖示尺寸（px） */
  iconSize?: number | string
  /** 圖示顏色 class */
  iconColor?: string
  /** 是否全寬 */
  fullWidth?: boolean
}

const props = withDefaults(defineProps<ChptEmptyProps>(), {
  icon: 'inbox',
  title: '暫無資料',
  description: '',
  iconSize: 48,
  iconColor: 'neutral-300',
  fullWidth: false,
})

/** iconSize 允許 number 或 string，比較前正規化為數值 */
const numericIconSize = computed(() => Number(props.iconSize) || 0)

const textSizeClass = computed(() => (numericIconSize.value >= 64 ? 'text-lg' : 'text-base'))
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
