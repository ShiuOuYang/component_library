<script setup>
import { ref, computed, watch } from 'vue'
import { useApiState } from '../composables/useApi.js'

const { isLoading, hasError, currentError, success, successMessage } = useApiState()

// 自動消失控制
const showError = ref(false)
const showSuccess = ref(false)
let errorTimer = null
let successTimer = null

const AUTO_DISMISS_MS = 3000

watch(hasError, (val) => {
  if (val) {
    showError.value = true
    clearTimeout(errorTimer)
    errorTimer = setTimeout(() => { showError.value = false }, AUTO_DISMISS_MS)
  } else {
    showError.value = false
  }
})

watch(success, (val) => {
  if (val) {
    showSuccess.value = true
    clearTimeout(successTimer)
    successTimer = setTimeout(() => { showSuccess.value = false }, AUTO_DISMISS_MS)
  } else {
    showSuccess.value = false
  }
})

// 通知類型樣式 - 更低調的設計
const getNotificationStyle = (type) => {
  switch (type) {
    case 'success':
      return 'bg-white/90 border-emerald-200 text-emerald-700 shadow-sm'
    case 'error':
      return 'bg-white/90 border-red-200 text-red-700 shadow-sm'
    case 'loading':
      return 'bg-white/90 border-blue-200 text-blue-700 shadow-sm'
    default:
      return 'bg-white/90 border-gray-200 text-gray-700 shadow-sm'
  }
}

// 通知圖示 - 更低調的圖示
const getNotificationIcon = (type) => {
  switch (type) {
    case 'success':
      return 'fas fa-check text-emerald-500'
    case 'error':
      return 'fas fa-exclamation-triangle text-red-500'
    case 'loading':
      return 'fas fa-spinner fa-spin text-blue-500'
    default:
      return 'fas fa-info-circle text-gray-500'
  }
}

// 格式化錯誤訊息
const formatErrorMessage = computed(() => {
  if (!currentError.value) return ''
  
  const error = currentError.value
  if (error.status) {
    return `${error.message} (${error.status})`
  }
  return error.message || '發生未知錯誤'
})

// 格式化成功訊息
const formatSuccessMessage = computed(() => {
  return successMessage.value || '操作已成功完成'
})
</script>

<template>
  <!-- 通知容器 - 左下角固定位置，更小更低調 -->
  <div class="fixed bottom-4 left-4 z-50 space-y-2">
    
    <!-- 載入通知 -->
    <Transition name="slide-up">
      <div 
        v-if="isLoading" 
        :class="getNotificationStyle('loading')" 
        class="px-3 py-2 rounded-lg border backdrop-blur-sm flex items-center space-x-3 min-w-[220px] max-w-[240px]"
      >
        <div class="flex-shrink-0">
          <i :class="getNotificationIcon('loading')" class="text-sm"></i>
        </div>
        <div class="flex-1">
          <p class="font-medium text-xs">載入中...</p>
          <p class="text-xs opacity-70 mt-0.5">正在處理請求</p>
        </div>
      </div>
    </Transition>

    <!-- 成功通知 -->
    <Transition name="slide-up">
      <div 
        v-if="showSuccess" 
        :class="getNotificationStyle('success')" 
        class="px-3 py-2 rounded-lg border backdrop-blur-sm flex items-center space-x-3 min-w-[220px] max-w-[240px]"
      >
        <div class="flex-shrink-0">
          <i :class="getNotificationIcon('success')" class="text-sm"></i>
        </div>
        <div class="flex-1">
          <p class="font-medium text-xs">操作成功</p>
          <p class="text-xs opacity-70 mt-0.5 truncate">{{ formatSuccessMessage }}</p>
        </div>
      </div>
    </Transition>

    <!-- 錯誤通知 -->
    <Transition name="slide-up">
      <div 
        v-if="showError" 
        :class="getNotificationStyle('error')" 
        class="px-3 py-2 rounded-lg border backdrop-blur-sm flex items-center space-x-3 min-w-[220px] max-w-[240px]"
      >
        <div class="flex-shrink-0">
          <i :class="getNotificationIcon('error')" class="text-sm"></i>
        </div>
        <div class="flex-1">
          <p class="font-medium text-xs">操作失敗</p>
          <p v-if="formatErrorMessage" class="text-xs opacity-70 mt-0.5 truncate">{{ formatErrorMessage }}</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* 滑入動畫 - 從下方滑入，更低調 */
.slide-up-enter-active {
  transition: all 0.3s ease-out;
}

.slide-up-leave-active {
  transition: all 0.2s ease-in;
}

.slide-up-enter-from {
  transform: translateY(20px);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>
