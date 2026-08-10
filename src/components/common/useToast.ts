import { reactive } from 'vue'

/**
 * useToast（CHPT 主題） - 全域輕提示 composable
 *
 * 在 <script setup> 中呼叫 useToast() 取得 success/info/warning/danger 方法，
 * 即可在任何頁面觸發頂部的浮動提示。需在全域掛載 <ChptToast />。
 *
 * 用法：
 * ```ts
 * import { useToast } from '@/components/common/useToast'
 * import ChptToast from '@/components/common/ChptToast.vue'
 *
 * const toast = useToast()
 * toast.success('儲存成功')
 * toast.error('發生錯誤')
 * ```
 */

export interface ChptToastItem {
  id: number
  type: 'success' | 'info' | 'warning' | 'danger'
  content: string
}

// module-scoped 全域狀態，所有實例共享
const toasts = reactive<ChptToastItem[]>([])
let idCounter = 0

export function useToast() {
  function show(type: ChptToastItem['type'], content: string, duration = 3000): void {
    const id = ++idCounter
    toasts.push({ id, type, content })
    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }
  }

  function remove(id: number): void {
    const index = toasts.findIndex((t) => t.id === id)
    if (index !== -1) toasts.splice(index, 1)
  }

  function success(content: string, duration?: number): void {
    show('success', content, duration)
  }
  function info(content: string, duration?: number): void {
    show('info', content, duration)
  }
  function warning(content: string, duration?: number): void {
    show('warning', content, duration)
  }
  function error(content: string, duration?: number): void {
    show('danger', content, duration)
  }

  return { toasts, show, remove, success, info, warning, error }
}
