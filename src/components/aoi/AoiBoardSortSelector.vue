<template>
  <div class="aoi-board-sort-selector">
    <div class="flex items-center gap-3">
      <!-- 類型選擇 -->
      <div class="type-selector flex gap-1">
        <button 
          v-for="type in typeOptions" 
          :key="type"
          @click="selectType(type)"
          :class="{ 'border-blue-500 bg-blue-500 text-white': selectedType === type, 'border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-50': selectedType !== type }"
          class="px-3 py-1.5 border bg-white rounded cursor-pointer transition-all text-sm"
        >
          {{ type }}
        </button>
      </div>

      <!-- 製程選擇 -->
      <div class="proc-selector">
        <select 
          v-model="selectedProcName" 
          @change="handleProcNameChange"
          class="px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-700 text-sm min-w-30 cursor-pointer focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          :disabled="isLoading"
        >
          <option value="default">預設</option>
          <option 
            v-for="procname in currentProcNames" 
            :key="procname" 
            :value="procname"
          >
            {{ procname }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'

/**
 * AOI Board Sort Selector 組件
 * 選擇製程站點來重新排序 Board
 * 參照 FLI 的實作方式，使用 inject 模式
 */

// Inject AOI 數據
const aoiData = inject('aoiData', {
  boardsortProcName: ref('default'),
  isLoading: ref(false),
  handleBoardSortChange: () => {}
})

const {
  boardsortProcName,
  isLoading,
  handleBoardSortChange
} = aoiData

// 類型選項
const typeOptions = ref(['Core', 'Bu'])
const selectedType = ref('Bu')

// Core 製程名稱
const coreProcesses = [
  "PTHELS_1",
  "PTHDEM_2", 
  "PTHELS_2",
  "PTHPCU_1",
  "PLSRBG_3",
  "PTHELS_3",
  "PTHPCU_2",
  "LTHDES_1"
]

// Bu 製程名稱
const buProcesses = [
  "ABFMEC_1",
  "ABFBZO_1",
  "ABFABF_1", 
  "ABFABF_2",
  "LDLCOL_1",
  "LDLCOL_2",
  "SAPDEM_1",
  "SAPDEM_2",
  "SAPECU_1",
  "SAPPEC_1",
  "LTHCLN_1",
  "LTHADF_1",
  "LTHSEP_1",
  "LTHDFV_1",
  "PTHCUM_1",
  "PTHSAC_1",
  "AOIAEI_1",
  "PTHFCU_1"
]

// 當前製程名稱
const currentProcNames = computed(() => {
  return selectedType.value === 'Core' ? coreProcesses : buProcesses
})

// 選中的製程名稱
const selectedProcName = computed({
  get: () => boardsortProcName.value,
  set: (value) => {
    boardsortProcName.value = value
  }
})

/**
 * 選擇類型
 */
const selectType = (type) => {
  selectedType.value = type
  // 重置製程選擇
  selectedProcName.value = 'default'
  console.log('🔄 [AoiBoardSortSelector] 切換類型到:', type)
  
  // 觸發 Board Sort 變更
  if (handleBoardSortChange) {
    handleBoardSortChange('default')
  }
}

/**
 * 處理製程名稱變更
 */
const handleProcNameChange = async () => {
  console.log('🎯 [AoiBoardSortSelector] 製程變更:', selectedProcName.value)
  
  if (handleBoardSortChange) {
    try {
      await handleBoardSortChange(selectedProcName.value)
    } catch (error) {
      console.error('❌ [AoiBoardSortSelector] 處理製程變更失敗:', error)
    }
  }
}
</script>