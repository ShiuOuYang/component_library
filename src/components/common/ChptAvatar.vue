<template>
  <span
    class="inline-flex items-center justify-center overflow-hidden rounded-full shrink-0 select-none"
    :class="[sizeClass, backgroundColorClass]"
    :style="bgStyle"
  >
    <!-- 圖片 -->
    <img
      v-if="props.src"
      :src="props.src"
      :alt="props.alt || ''"
      class="w-full h-full object-cover"
    />
    <!-- 圖示 -->
    <ChptIcon v-else-if="props.icon" :size="iconSize" color="white">{{ props.icon }}</ChptIcon>
    <!-- 首字母 -->
    <span v-else class="font-semibold text-white" :class="textSizeClass">
      {{ initial }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChptIcon from './ChptIcon.vue'

/**
 * ChptAvatar（CHPT 主題） - 頭像元件
 *
 * 特性：
 * - 支援圖片 / 圖示 / 首字母三種模式
 * - 多種尺寸
 * - 完整 Props 型別定義
 */

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface ChptAvatarProps {
  /** 圖片來源 */
  src?: string
  /** 圖示（Material Symbols） */
  icon?: string
  /** 名稱（用於產生首字母） */
  name?: string
  /** alt 替代文字 */
  alt?: string
  /** 尺寸 */
  size?: AvatarSize
  /** 背景顏色 class */
  backgroundColor?: string
}

const props = withDefaults(defineProps<ChptAvatarProps>(), {
  src: '',
  icon: '',
  name: '',
  alt: '',
  size: 'md',
  backgroundColor: '',
})

const sizeMap: Record<AvatarSize, { size: string; fontSize: string; icon: number }> = {
  xs: { size: 'w-6 h-6 text-[10px]', fontSize: 'text-[10px]', icon: 12 },
  sm: { size: 'w-8 h-8 text-xs', fontSize: 'text-xs', icon: 16 },
  md: { size: 'w-10 h-10 text-sm', fontSize: 'text-sm', icon: 20 },
  lg: { size: 'w-12 h-12 text-base', fontSize: 'text-base', icon: 24 },
  xl: { size: 'w-16 h-16 text-lg', fontSize: 'text-lg', icon: 32 },
}

const sizeClass = computed(() => sizeMap[props.size]?.size ?? sizeMap.md.size)
const textSizeClass = computed(() => sizeMap[props.size]?.fontSize ?? sizeMap.md.fontSize)
const iconSize = computed(() => sizeMap[props.size]?.icon ?? sizeMap.md.icon)

const backgroundColorClass = computed(() => props.backgroundColor || 'bg-blue-500')

/** 產生首字母 */
const initial = computed(() => {
  if (!props.name) return '?'
  const trimmed = props.name.trim()
  if (!trimmed) return '?'
  // 取第一個字母或數字
  return trimmed.charAt(0).toUpperCase()
})

/** 自訂背景色（若帶 color: 或 hex） */
const bgStyle = computed(() => {
  if (!props.backgroundColor) return {}
  if (props.backgroundColor.startsWith('#') || props.backgroundColor.startsWith('rgb')) {
    return { backgroundColor: props.backgroundColor }
  }
  return {}
})
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
