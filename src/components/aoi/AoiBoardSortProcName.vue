<template>
  <div class="p-3 bg-gray-50 rounded border border-gray-300">
    <label class="flex items-center text-sm font-bold text-gray-900 mb-2">
      <i class="bi bi-funnel mr-2"></i>
      製程站點排序
    </label>
    <select
      class="w-full text-sm px-3 py-2 border border-gray-300 rounded bg-white cursor-pointer transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none hover:border-blue-500"
      v-model="selectedProcName"
      @change="handleProcNameChange"
    >
      <option value="default">預設</option>
      <option v-for="option in boardSortOptions" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<script setup>
import { computed, inject, ref } from 'vue'

/**
 * AOI Board Sort ProcName 組件
 * 選擇製程站點來重新排序 Board
 * 參照 FLI 的實作方式
 */

// Inject AOI 數據
const aoiData = inject('aoiData', {
  boardsortProcName: ref('default'),
  boardSortOptions: computed(() => [{ value: 'default', label: '預設排序' }]),
  handleBoardSortChange: () => {}
})

const {
  boardsortProcName,
  boardSortOptions,
  handleBoardSortChange
} = aoiData

// 選中的製程名稱
const selectedProcName = computed({
  get: () => boardsortProcName.value,
  set: (value) => {
    boardsortProcName.value = value
  }
})

/**
 * 處理製程名稱變更
 */
const handleProcNameChange = async () => {
  console.log('🎯 [AoiBoardSortProcName] 製程變更:', selectedProcName.value)
  
  if (handleBoardSortChange) {
    try {
      await handleBoardSortChange(selectedProcName.value)
    } catch (error) {
      console.error('❌ [AoiBoardSortProcName] 處理製程變更失敗:', error)
    }
  }
}
</script>
