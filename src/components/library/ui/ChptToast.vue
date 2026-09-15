<template>
  <Teleport to="body">
    <div
      class="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none"
      role="region"
      aria-label="通知訊息"
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
          :class="borderColor(toast.type)"
          :role="toast.type === 'danger' ? 'alert' : 'status'"
          :aria-live="toast.type === 'danger' ? 'assertive' : 'polite'"
        >
          <ChptIcon :size="18" :color="iconColor(toast.type)" aria-hidden="true">
            {{ iconName(toast.type) }}
          </ChptIcon>

          <!-- 訊息本體：原本整個元件從未渲染 toast.content，
               提示只會顯示一個圖示和關閉鈕，使用者看不到任何文字 -->
          <span class="text-sm text-neutral-700 whitespace-pre-line">{{ toast.content }}</span>

          <button
            type="button"
            class="flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label="關閉提示"
            @click="remove(toast.id)"
          >
            <ChptIcon :size="16" aria-hidden="true">close</ChptIcon>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import ChptIcon from './ChptIcon.vue'
import { useToast } from '@/components/library/shared/useToast'
import type { ChptToastItem } from '@/components/library/shared/useToast'

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
    success: 'success-500',
    info: 'info-500',
    warning: 'warning-600',
    danger: 'danger-500',
  }
  return map[type]
}

/** 左側色條（只靠圖示顏色區分類型，對色覺障礙者辨識度不足） */
function borderColor(type: ChptToastItem['type']): string {
  const map: Record<string, string> = {
    success: 'border-l-4 border-l-success-500',
    info: 'border-l-4 border-l-info-500',
    warning: 'border-l-4 border-l-warning-600',
    danger: 'border-l-4 border-l-danger-500',
  }
  return map[type]
}
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
