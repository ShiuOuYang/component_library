<template>
  <button
    @click="handleLogout"
    :disabled="isLoggingOut"
    class="group relative flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
    :class="[
      sizeClasses[size],
      variantClasses[variant],
      customClass
    ]"
    title="登出系統"
  >
    <!-- 載入動畫 -->
    <svg 
      v-if="isLoggingOut" 
      class="animate-spin mr-1.5"
      :class="iconValues[size]" 
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
      :class="iconValues[size]"
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
    
    <span v-if="!isLoggingOut">
      {{ label }}
    </span>
    <span v-if="isLoggingOut">
      登出...
    </span>
  </button>
</template>

<script setup>
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth.js'

defineProps({
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md'].includes(value)
  },
  variant: {
    type: String,
    default: 'soft-red',
    validator: (value) => ['soft-red', 'solid-red', 'outline-gray', 'ghost', 'primary'].includes(value)
  },
  label: {
    type: String,
    default: '登出'
  },
  customClass: {
    type: String,
    default: ''
  }
})

const { logout } = useAuth()
const isLoggingOut = ref(false)

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg'
}

const iconValues = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4'
}

const variantClasses = {
  'soft-red': 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300',
  'solid-red': 'bg-red-600 hover:bg-red-700 text-white border border-transparent shadow-sm hover:shadow',
  'outline-gray': 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400',
  'ghost': 'bg-transparent hover:bg-gray-100/10 text-gray-300 hover:text-white border border-transparent',
  'primary': 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent shadow-sm hover:shadow'
}

const handleLogout = async () => {
  if (isLoggingOut.value) return
  
  const confirmed = confirm('確定要登出嗎？')
  if (!confirmed) return
  
  try {
    isLoggingOut.value = true
    console.log('🚪 開始登出流程...')
    
    await logout()
    console.log('✅ 登出成功')
  } catch (error) {
    console.error('❌ 登出失敗:', error)
    alert('登出失敗，請稍後再試')
  } finally {
    isLoggingOut.value = false
  }
}
</script>
