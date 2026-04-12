<script setup>
const quickActions = [
  { 
    icon: 'fas fa-question-circle', 
    tooltip: '說明文件',
    color: 'hover:text-blue-400',
    action: 'help' 
  },
  { 
    icon: 'fas fa-bell', 
    tooltip: '通知設定',
    color: 'hover:text-yellow-400',
    action: 'notifications' 
  },
  { 
    icon: 'fas fa-sign-out-alt', 
    tooltip: '登出系統',
    color: 'hover:text-red-400',
    action: 'logout' 
  }
]

const handleAction = (action) => {
  console.log(`執行動作: ${action}`)
  // 這裡可以添加實際的功能邏輯
}
</script>

<template><template>
  <div class="flex space-x-2">
    <button 
      v-for="action in quickActions" 
      :key="action.action"
      @click="handleAction(action.action)"
      :title="action.tooltip"
      class="flex-1 bg-slate-600/40 hover:bg-slate-500/60 border border-slate-500/30 rounded-xl p-4 transition-all duration-300 group relative overflow-hidden hover:shadow-lg"
    >
      <!-- 背景動畫效果 -->
      <div class="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
      
      <!-- 圖標 -->
      <i :class="[
        action.icon, 
        'text-slate-300 group-hover:text-white text-lg transition-all duration-300 relative z-10',
        action.color
      ]"></i>
      
      <!-- 懸停時的發光效果 -->
      <div class="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300">
        <div class="w-full h-full bg-gradient-to-br from-teal-400/60 to-blue-400/60 rounded-xl blur-sm"></div>
      </div>
    </button>
  </div>
</template>
</template>

<style scoped>
button:hover {
  transform: translateY(-0.5px);
}

button:active {
  transform: translateY(0px);
}
</style>
