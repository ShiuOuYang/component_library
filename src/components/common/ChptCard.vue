<template>
  <div
    class="rounded-xl border border-gray-200 bg-white shadow-sm"
    :class="[
      props.fullWidth ? 'w-full' : '',
      paddingClass,
      props.hoverable ? 'transition-shadow hover:shadow-md cursor-pointer' : '',
    ]"
    @click="handleClick"
  >
    <slot name="header">
      <div
        v-if="props.title || $slots.extra"
        class="flex items-center justify-between border-b border-gray-100 px-5 py-3.5"
      >
        <div class="flex items-center gap-2">
          <ChptIcon v-if="props.icon" :size="18" color="gray-500">{{ props.icon }}</ChptIcon>
          <h3 v-if="props.title" class="font-semibold text-gray-800 text-sm">
            {{ props.title }}
          </h3>
        </div>
        <slot name="extra" />
      </div>
    </slot>

    <slot />

    <div v-if="$slots.footer" class="border-t border-gray-100 bg-gray-50 rounded-b-xl px-5 py-3">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChptIcon from './ChptIcon.vue'

/**
 * ChptCard（CHPT 主題） - 卡片容器元件
 *
 * 特性：
 * - 統一的標題 / 內容 / 底部插槽結構
 * - 支援 header、extra、footer 插槽
 * - 完整 Props 型別定義
 */

type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface ChptCardProps {
  /** 標題 */
  title?: string
  /** 前置圖示（Material Symbols） */
  icon?: string
  /** 內邊距 */
  padding?: CardPadding
  /** 是否全寬 */
  fullWidth?: boolean
  /** 是否可 hover 效果 */
  hoverable?: boolean
}

const props = withDefaults(defineProps<ChptCardProps>(), {
  title: '',
  icon: '',
  padding: 'sm',
  fullWidth: false,
  hoverable: false,
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const paddingClass = computed(() => {
  // 若含 header/footer 結構，內容區縮排統一用 sm；none 代表內容零間距
  const map: Record<CardPadding, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }
  return map[props.padding]
})

function handleClick(event: MouseEvent): void {
  emit('click', event)
}
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
