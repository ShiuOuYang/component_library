<template>
  <div
    v-if="props.loading"
    class="flex flex-col gap-3"
    :class="props.fullWidth ? 'w-full' : ''"
  >
    <div
      v-for="i in props.rows"
      :key="i"
      class="animate-pulse rounded-md"
      :style="rowStyle(i)"
    />
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * ChptSkeleton（CHPT 主題） - 骨架屏 / 載入佔位元件
 *
 * 特性：
 * - loading 為 true 時顯示骨架列，可調整數量與寬度
 * - loading 為 false 時顯示預設插槽內容
 * - 完整 Props 型別定義
 */

interface ChptSkeletonProps {
  /** 是否載入中 */
  loading?: boolean
  /** 骨架列數 */
  rows?: number
  /** 每列寬度（百分比或陣列可逐列指定） */
  rowWidth?: number | string | Array<number | string>
  /** 行高（px） */
  rowHeight?: number | string
  /** 骨架底色 class */
  color?: string
  /** 是否全寬 */
  fullWidth?: boolean
}

const props = withDefaults(defineProps<ChptSkeletonProps>(), {
  loading: false,
  rows: 3,
  rowWidth: 100,
  rowHeight: 16,
  color: 'bg-surface-tertiary',
  fullWidth: false,
})

const percentMap = computed(() => {
  const widths = Array.isArray(props.rowWidth) ? props.rowWidth : Array(props.rows).fill(props.rowWidth)
  return widths.map((w) => {
    if (typeof w === 'number') return `${w}%`
    return String(w)
  })
})

function rowWidthStyle(index: number): string {
  return percentMap.value[index % percentMap.value.length]
}

function rowStyle(index: number): Record<string, string> {
  return {
    width: rowWidthStyle(index),
    height: typeof props.rowHeight === 'number' ? `${props.rowHeight}px` : props.rowHeight,
  }
}
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
