<template>
  <div class="aoi-panel-controls">
    <div class="p-4 bg-white border-b border-slate-200">
      <div class="flex justify-between items-center flex-wrap gap-5">
        <!-- 修前/修後切換 -->
        <div class="repair-controls flex gap-4">
          <label class="flex items-center gap-1.5 cursor-pointer select-none">
            <input 
              type="radio" 
              :value="false" 
              v-model="isRepair" 
              name="repair-mode"
              class="m-0 w-4 h-4"
            />
            <span class="font-semibold text-gray-700">修前</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer select-none">
            <input 
              type="radio" 
              :value="true" 
              v-model="isRepair" 
              name="repair-mode"
              class="m-0 w-4 h-4"
            />
            <span class="font-semibold text-gray-700">修後</span>
          </label>
        </div>

        <!-- C/S 面切換 -->
        <div class="side-controls flex gap-2">
          <button 
            @click="changeSide('C')"
            :class="{ 'border-blue-500 text-blue-500 bg-blue-50': isCSideActive, 'border-gray-300 text-gray-500': !isCSideActive }"
            class="px-4 py-2 border-2 bg-white font-semibold rounded-md cursor-pointer transition-all hover:border-gray-400"
          >
            C
          </button>
          <button 
            @click="changeSide('S')"
            :class="{ 'border-blue-500 text-blue-500 bg-blue-50': isSSideActive, 'border-gray-300 text-gray-500': !isSSideActive }"
            class="px-4 py-2 border-2 bg-white font-semibold rounded-md cursor-pointer transition-all hover:border-gray-400"
          >
            S
          </button>
        </div>

        <!-- 功能按鈕 -->
        <div class="function-controls flex gap-2">
          <button 
            @click="toggleFakePoint"
            :class="{ 'border-blue-500 text-blue-500 bg-blue-50': isShowfakePoint, 'border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-50': !isShowfakePoint }"
            class="px-3 py-2 border border-gray-300 bg-white rounded-md cursor-pointer transition-all text-sm"
            title="顯示/隱藏假點"
          >
            假點
          </button>

          <button 
            @click="toggleFoldMode"
            :class="{ 'border-blue-500 text-blue-500 bg-blue-50': isfoldMode, 'border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-50': !isfoldMode }"
            class="p-2 border border-gray-300 bg-white rounded-md cursor-pointer transition-all flex items-center justify-center"
            title="整體 Mapping"
          >
            <span class="material-symbols-outlined text-lg">stacks</span>
          </button>

          <button 
            @click="toggleFoldMode"
            :class="{ 'border-blue-500 text-blue-500 bg-blue-50': !isfoldMode, 'border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-50': isfoldMode }"
            class="p-2 border border-gray-300 bg-white rounded-md cursor-pointer transition-all flex items-center justify-center"
            title="分板 Mapping"
          >
            <span class="material-symbols-outlined text-lg">view_cozy</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, ref } from 'vue'

/**
 * AOI Panel Controls 組件
 * 提供 Mapping 面板的控制功能：修前/修後切換、C/S 面切換、假點顯示、摺疊模式等
 * 參照 FLI 的資料串接模式，使用 inject 獲取數據
 */

// Inject AOI 數據
const aoiData = inject('aoiData', {
  isRepair: ref(false),
  sideStatus: ref('B'),
  isShowfakePoint: ref(false),
  isfoldMode: ref(false),
  boardNoAry: ref([])
})

const {
  isRepair,
  sideStatus,
  isShowfakePoint,
  isfoldMode,
  boardNoAry
} = aoiData

// 計算 C/S 面的啟動狀態
const isCSideActive = computed(() => {
  return sideStatus.value === 'C' || sideStatus.value === 'B'
})

const isSSideActive = computed(() => {
  return sideStatus.value === 'S' || sideStatus.value === 'B'
})

/**
 * 切換面別
 */
const changeSide = (side) => {
  const currentSide = sideStatus.value
  
  if ((currentSide === side || currentSide === 'B') && side === 'S') {
    sideStatus.value = 'C'
  } else if ((currentSide === side || currentSide === 'B') && side === 'C') {
    sideStatus.value = 'S'
  } else {
    sideStatus.value = 'B'
  }
  
  console.log('🔄 [AoiPanelControls] 切換面別到:', sideStatus.value)
}

/**
 * 切換假點顯示
 */
const toggleFakePoint = () => {
  isShowfakePoint.value = !isShowfakePoint.value
  console.log('🔄 [AoiPanelControls] 假點顯示:', isShowfakePoint.value)
}

/**
 * 切換摺疊模式
 */
const toggleFoldMode = () => {
  isfoldMode.value = !isfoldMode.value
  console.log('🔄 [AoiPanelControls] 摺疊模式:', isfoldMode.value)
}
</script>