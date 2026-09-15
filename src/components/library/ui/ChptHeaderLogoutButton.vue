<template>
  <button
    type="button"
    @click="handleLogout"
    :disabled="isLoggingOut"
    :aria-busy="isLoggingOut"
    class="group relative flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
    :class="[
      sizeClasses[props.size],
      variantClasses[props.variant],
      props.customClass
    ]"
    :title="props.title"
  >
    <!-- 載入動畫 -->
    <svg
      v-if="isLoggingOut"
      class="animate-spin mr-1.5"
      :class="iconValues[props.size]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>

    <!-- 登出圖標 -->
    <svg
      v-else
      class="mr-1.5 transition-colors duration-200"
      :class="iconValues[props.size]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>

    <span>{{ isLoggingOut ? props.loadingLabel : props.label }}</span>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'

/**
 * ChptHeaderLogoutButton（CHPT 主題） - 登出按鈕
 *
 * 純展示元件：只負責「確認 → 顯示載入中 → 回報結果」，
 * 實際的登出流程由使用端透過 onLogout 注入。
 *
 * 之前這裡直接 import 應用程式的 useAuth（它又相依 Pinia store 與 vue-router），
 * 等於把某一個應用的登入實作綁死在通用組件庫裡 —— 換一個專案就無法使用。
 *
 * ```vue
 * <script setup>
 * import { useAuth } from '@/composables/useAuth'
 * const { logout } = useAuth()
 * <\/script>
 *
 * <template>
 *   <ChptHeaderLogoutButton :on-logout="logout" @error="notify" />
 * </template>
 * ```
 */

type LogoutButtonSize = 'sm' | 'md'
type LogoutButtonVariant =
  | 'soft-red'
  | 'solid-red'
  | 'outline-gray'
  | 'ghost'
  | 'primary'

interface ChptHeaderLogoutButtonProps {
  /** 尺寸 */
  size?: LogoutButtonSize
  /** 樣式變體 */
  variant?: LogoutButtonVariant
  /** 按鈕文字 */
  label?: string
  /** 載入中的文字 */
  loadingLabel?: string
  /** 按鈕的無障礙標題 */
  title?: string
  /** 自訂 class */
  customClass?: string
  /**
   * 實際的登出流程。可回傳 Promise，元件會在等待期間顯示載入狀態。
   * 未提供時只會發出 logout 事件。
   */
  onLogout?: () => void | Promise<void>
  /** 點擊後是否先跳出確認視窗 */
  confirm?: boolean
  /** 確認視窗的訊息 */
  confirmMessage?: string
}

const props = withDefaults(defineProps<ChptHeaderLogoutButtonProps>(), {
  size: 'md',
  variant: 'soft-red',
  label: '登出',
  loadingLabel: '登出…',
  title: '登出系統',
  customClass: '',
  onLogout: undefined,
  confirm: true,
  confirmMessage: '確定要登出嗎？',
})

const emit = defineEmits<{
  /** 使用者確認登出（onLogout 執行前） */
  (e: 'logout'): void
  /** onLogout 執行失敗 */
  (e: 'error', error: unknown): void
}>()

const isLoggingOut = ref(false)

const sizeClasses: Record<LogoutButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
}

const iconValues: Record<LogoutButtonSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
}

const variantClasses: Record<LogoutButtonVariant, string> = {
  'soft-red': 'bg-danger-50 hover:bg-danger-100 text-danger-600 border border-danger-200 hover:border-danger-300',
  'solid-red': 'bg-danger-600 hover:bg-danger-700 text-white border border-transparent shadow-sm hover:shadow',
  'outline-gray': 'bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 hover:border-neutral-400',
  ghost: 'bg-transparent hover:bg-neutral-100/10 text-neutral-300 hover:text-white border border-transparent',
  primary: 'bg-primary-600 hover:bg-primary-700 text-white border border-transparent shadow-sm hover:shadow',
}

async function handleLogout(): Promise<void> {
  if (isLoggingOut.value) return

  if (props.confirm && !window.confirm(props.confirmMessage)) return

  emit('logout')
  if (!props.onLogout) return

  try {
    isLoggingOut.value = true
    await props.onLogout()
  } catch (error) {
    // 不再自行 window.alert —— 錯誤如何呈現由使用端決定（Toast / 對話框 / 靜默）
    emit('error', error)
  } finally {
    isLoggingOut.value = false
  }
}
</script>
