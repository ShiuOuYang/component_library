<template>
  <div class="simple-dark-toggle">
    <!-- 控制選項 -->
    <div v-if="showControls" class="controls mb-2">
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" :checked="followSystem" @change="handleFollowSystem($event.target.checked)" />
        跟隨系統
      </label>
    </div>
    
    <!-- 簡單切換按鈕 -->
    <button 
      type="button"
      :aria-pressed="isDarkMode"
      :aria-label="toggleLabel"
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
import { computed, onMounted, watch } from 'vue'
import { useDarkMode } from '@/components/library/shared/useDarkMode'

/**
 * SimpleDarkModeToggle（@deprecated）
 *
 * 請改用 <ChptDarkModeToggle variant="simple" />。
 * 此檔保留以免破壞既有呼叫端，狀態已改為委派給 useDarkMode()，
 * 與 ChptDarkModeToggle 共用同一份全域狀態。
 */
const props = defineProps({
  initialDarkMode: { type: Boolean, default: false },
  showControls: { type: Boolean, default: false },
  /** @deprecated 已無作用，主題一律同步到 <html> 與 <body> */
  syncBodyByDefault: { type: Boolean, default: true },
})

const emit = defineEmits(['update:darkMode', 'toggle'])

const { isDark, mode, setMode, toggle } = useDarkMode()

const isDarkMode = computed(() => isDark.value)
const toggleLabel = computed(() => (isDark.value ? '切換為淺色模式' : '切換為深色模式'))
const followSystem = computed(() => mode.value === 'system')

watch(
  () => props.initialDarkMode,
  (value) => {
    if (value && mode.value === 'system') setMode('dark')
  }
)

onMounted(() => {
  if (props.initialDarkMode && mode.value === 'system') setMode('dark')
})

function handleToggle() {
  toggle()
  emit('update:darkMode', isDark.value)
  emit('toggle', isDark.value)
}

function handleFollowSystem(checked) {
  setMode(checked ? 'system' : isDark.value ? 'dark' : 'light')
  emit('update:darkMode', isDark.value)
}

defineExpose({ toggle: handleToggle, isDarkMode })
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