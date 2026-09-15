<script setup>
import { onMounted } from 'vue'
import { useAuth } from './composables/useAuth.js'
import GlobalNotifications from './components/GlobalNotifications.vue'

// 初始化認證狀態
useAuth() // 這會自動初始化認證狀態（內部以 onMounted 觸發，不需取回任何值）

// App 現在只需要提供路由出口
onMounted(() => {
  console.log('🚀 應用程式啟動')
})
</script>

<template>
  <router-view />
  
  <!-- 全域通知系統 -->
  <GlobalNotifications />
</template>

<style scoped>
/* Custom styles can be added here if needed */
</style>
