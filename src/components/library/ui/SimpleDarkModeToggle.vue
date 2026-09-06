<template>
  <div class="simple-dark-toggle">
    <!-- 控制選項 -->
    <div v-if="showControls" class="controls mb-2">
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" v-model="syncWithBody" />
        Sync &lt;body&gt;
      </label>
    </div>
    
    <!-- 簡單切換按鈕 -->
    <button 
      @click="handleToggle"
      :class="[
        'toggle-btn',
        isDarkMode ? 'dark' : 'light'
      ]"
      class="px-4 py-2 rounded-lg border transition-all duration-300"
    >
      {{ isDarkMode ? '🌙 Dark' : '☀️ Light' }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

// Props
const props = defineProps({
  initialDarkMode: {
    type: Boolean,
    default: false
  },
  showControls: {
    type: Boolean,
    default: false
  },
  syncBodyByDefault: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits(['update:darkMode', 'toggle'])

// 響應式狀態
const isDarkMode = ref(props.initialDarkMode)
const syncWithBody = ref(props.syncBodyByDefault)

// 切換處理函數
const handleToggle = () => {
  isDarkMode.value = !isDarkMode.value
  
  // 同步到 body 元素
  if (syncWithBody.value) {
    document.body.setAttribute('data-dark-mode', isDarkMode.value.toString())
    
    if (isDarkMode.value) {
      document.body.classList.add('dark-mode')
      document.body.classList.remove('light-mode')
    } else {
      document.body.classList.add('light-mode')
      document.body.classList.remove('dark-mode')
    }
  }
  
  // 發出事件
  emit('update:darkMode', isDarkMode.value)
  emit('toggle', isDarkMode.value)
  
  console.log('🌙 Dark Mode Toggled:', isDarkMode.value)
}

// 監聽外部變化
watch(() => props.initialDarkMode, (newValue) => {
  isDarkMode.value = newValue
})

// 組件掛載時設置初始狀態
onMounted(() => {
  if (syncWithBody.value) {
    document.body.setAttribute('data-dark-mode', isDarkMode.value.toString())
    if (isDarkMode.value) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.add('light-mode')
    }
  }
})

// 暴露方法
defineExpose({
  toggle: handleToggle,
  isDarkMode: computed(() => isDarkMode.value)
})
</script>

<style scoped>
.simple-dark-toggle {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.controls {
  margin-bottom: 0.5rem;
}

.toggle-btn {
  min-width: 100px;
  font-weight: 500;
  cursor: pointer;
}

.toggle-btn.light {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}

.toggle-btn.light:hover {
  background-color: #e5e7eb;
}

.toggle-btn.dark {
  background-color: #374151;
  border-color: #6b7280;
  color: #f9fafb;
}

.toggle-btn.dark:hover {
  background-color: #4b5563;
}
</style>