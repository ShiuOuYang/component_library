<template>
  <Teleport to="body">
    <div
      class="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none"
    >
      <TransitionGroup
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-3"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-to-class="opacity-0 translate-y-3"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-center gap-3 rounded-lg shadow-lg px-4 py-3 border bg-white"
        >
          <ChptIcon :size="18" :color="iconColor(toast.type)">{{ iconName(toast.type) }}</ChptIcon>
          <span class="text-sm font-medium text-gray-700">{{ toast.content }}</span>
          <ChptIcon
            :size="16"
            color="gray-400"
            class="cursor-pointer hover:text-gray-600 transition-colors"
            @click="remove(toast.id)"
          >
            close
          </ChptIcon>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import ChptIcon from './ChptIcon.vue'
import { useToast } from './useToast'
import type { ChptToastItem } from './useToast'

/**
 * ChptToast（CHPT 主題） - 全域輕提示容器
 *
 * 在全域掛載一次（例如 App.vue）：
 * ```vue
 * <ChptToast />
 * ```
 * 之後任何頁面皆可：
 * ```ts
 * const toast = useToast()
 * toast.success('成功') / toast.error('失敗') / toast.info(...) / toast.warning(...)
 * ```
 */

const { toasts, remove } = useToast()

function iconName(type: ChptToastItem['type']): string {
  const map: Record<string, string> = {
    success: 'check_circle',
    info: 'info',
    warning: 'warning',
    danger: 'error',
  }
  return map[type]
}

function iconColor(type: ChptToastItem['type']): string {
  const map: Record<string, string> = {
    success: 'green-500',
    info: 'blue-500',
    warning: 'yellow-600',
    danger: 'red-500',
  }
  return map[type]
}
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
