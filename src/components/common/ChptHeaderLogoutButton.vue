<template>
  <button
    @click="handleLogout"
    :disabled="isLoggingOut"
    class="group relative flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
    :class="[
      sizeClasses[props.size],
      variantClasses[props.variant],
      props.customClass
    ]"
    title="登出系統"
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

    <span>{{ isLoggingOut ? '登出…' : props.label }}</span>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth.js'

/**
 * ChptHeaderLogoutButton（CHPT 主題） - 登出按鈕
 *
 * 整合原 HeaderLogoutButton：
 * - 完整 Props 型別定義（interface + withDefaults）
 * - 整合 useAuth 登出流程
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
  /** 自訂 class */
  customClass?: string
}

const props = withDefaults(defineProps<ChptHeaderLogoutButtonProps>(), {
  size: 'md',
  variant: 'soft-red',
  label: '登出',
  customClass: '',
})

const { logout } = useAuth()
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
  'soft-red': 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300',
  'solid-red': 'bg-red-600 hover:bg-red-700 text-white border border-transparent shadow-sm hover:shadow',
  'outline-gray': 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400',
  ghost: 'bg-transparent hover:bg-gray-100/10 text-gray-300 hover:text-white border border-transparent',
  primary: 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent shadow-sm hover:shadow',
}

async function handleLogout(): Promise<void> {
  if (isLoggingOut.value) return

  const confirmed = window.confirm('確定要登出嗎？')
  if (!confirmed) return

  try {
    isLoggingOut.value = true
    await logout()
  } catch (error) {
    window.alert('登出失敗，請稍後再試')
  } finally {
    isLoggingOut.value = false
  }
}
</script>
