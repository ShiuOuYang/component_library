<template>
  <div class="p-6 space-y-6">
    <h2 class="text-2xl font-bold text-gray-800">BoxPlot Legend 測試</h2>
    
    <!-- 控制面板 -->
    <div class="bg-white p-4 rounded-lg border shadow-sm">
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          選擇圖例類型：
        </label>
        <div class="flex flex-wrap gap-4">
          <label class="flex items-center">
            <input 
              type="radio" 
              v-model="currentLegendType" 
              value="station"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm text-gray-700">站點</span>
          </label>
          <label class="flex items-center">
            <input 
              type="radio" 
              v-model="currentLegendType" 
              value="yield"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm text-gray-700">良率範圍</span>
          </label>
          <label class="flex items-center">
            <input 
              type="radio" 
              v-model="currentLegendType" 
              value="time"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm text-gray-700">時間點</span>
          </label>
          <label class="flex items-center">
            <input 
              type="radio" 
              v-model="currentLegendType" 
              value="category"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm text-gray-700">分類</span>
          </label>
          <label class="flex items-center">
            <input 
              type="radio" 
              v-model="currentLegendType" 
              value="priority"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm text-gray-700">優先級</span>
          </label>
          <label class="flex items-center">
            <input 
              type="radio" 
              v-model="currentLegendType" 
              value="department"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm text-gray-700">部門</span>
          </label>
          <label class="flex items-center">
            <input 
              type="radio" 
              v-model="currentLegendType" 
              value="none"
              class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
            />
            <span class="ml-2 text-sm text-gray-700">無圖例</span>
          </label>
        </div>
      </div>
      
      <!-- 自訂屬性輸入 -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          或輸入自訂屬性名稱：
        </label>
        <div class="flex gap-2">
          <input 
            type="text" 
            v-model="customProperty"
            placeholder="例如：status, level, team 等"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
          <button 
            @click="currentLegendType = customProperty"
            :disabled="!customProperty"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
          >
            套用
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-1">
          可用屬性：{{ availableProperties.join(', ') }}
        </p>
      </div>
      
      <div class="text-sm text-gray-600">
        當前圖例類型: <span class="font-medium">{{ currentLegendType }}</span>
      </div>
    </div>
    
    <!-- 圖表組件 -->
    <BoxPlotChart 
      :data="testData"
      :legend-type="currentLegendType"
      title="Legend 類型測試"
      :chart-height="400"
      @data-click="handleDataClick"
    />
    
    <!-- 使用說明 -->
    <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
      <h3 class="text-lg font-medium text-blue-800 mb-2">使用說明</h3>
      <ul class="text-sm text-blue-700 space-y-1">
        <li><strong>預設類型:</strong></li>
        <li>&nbsp;&nbsp;• <strong>站點:</strong> 依照站點名稱分組，每個站點有不同顏色</li>
        <li>&nbsp;&nbsp;• <strong>良率範圍:</strong> 依照良率值分組 (0-60%, 60-80%, 80-90%, 90-100%)</li>
        <li>&nbsp;&nbsp;• <strong>時間點:</strong> 依照時間戳分組，用藍色系漸變顯示</li>
        <li>&nbsp;&nbsp;• <strong>無圖例:</strong> 不顯示圖例，所有點用灰色</li>
        <li><strong>自訂屬性:</strong> 可以使用數據中的任何屬性名稱，如 category、priority、department、status 等</li>
        <li><strong>動態顏色:</strong> 系統會根據屬性值的數量自動選擇合適的色彩方案</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import BoxPlotChart from '../components/BoxPlotChart.vue'

const currentLegendType = ref('station')
const customProperty = ref('')

// 測試數據 - 包含更多屬性
const testData = ref([
  { station: 'Core', yield: 95.5, timestamp: '2025/08/25 10', category: 'A級', priority: '高', department: '製造部', status: 'OK' },
  { station: 'Core', yield: 94.2, timestamp: '2025/08/25 11', category: 'A級', priority: '高', department: '製造部', status: 'OK' },
  { station: 'Core', yield: 96.1, timestamp: '2025/08/25 12', category: 'A級', priority: '高', department: '製造部', status: 'Warning' },
  { station: 'AOI', yield: 88.5, timestamp: '2025/08/25 10', category: 'B級', priority: '中', department: '品保部', status: 'OK' },
  { station: 'AOI', yield: 89.2, timestamp: '2025/08/25 11', category: 'B級', priority: '中', department: '品保部', status: 'Warning' },
  { station: 'AOI', yield: 87.8, timestamp: '2025/08/25 12', category: 'B級', priority: '中', department: '品保部', status: 'Error' },
  { station: 'OST', yield: 92.3, timestamp: '2025/08/25 10', category: 'A級', priority: '高', department: '測試部', status: 'OK' },
  { station: 'OST', yield: 93.1, timestamp: '2025/08/25 11', category: 'A級', priority: '高', department: '測試部', status: 'OK' },
  { station: 'OST', yield: 91.7, timestamp: '2025/08/25 12', category: 'A級', priority: '高', department: '測試部', status: 'Warning' },
  { station: 'VI', yield: 85.2, timestamp: '2025/08/25 10', category: 'C級', priority: '低', department: '品保部', status: 'OK' },
  { station: 'VI', yield: 86.8, timestamp: '2025/08/25 11', category: 'C級', priority: '低', department: '品保部', status: 'Warning' },
  { station: 'VI', yield: 84.9, timestamp: '2025/08/25 12', category: 'C級', priority: '低', department: '品保部', status: 'Error' },
  // 添加一些低良率數據來測試良率範圍圖例
  { station: 'Test1', yield: 45.2, timestamp: '2025/08/25 10', category: 'D級', priority: '低', department: '研發部', status: 'Error' },
  { station: 'Test2', yield: 65.8, timestamp: '2025/08/25 11', category: 'C級', priority: '中', department: '研發部', status: 'Warning' },
  { station: 'Test3', yield: 75.3, timestamp: '2025/08/25 12', category: 'B級', priority: '中', department: '研發部', status: 'OK' },
])

// 獲取數據中所有可用的屬性
const availableProperties = computed(() => {
  if (testData.value.length === 0) return []
  return Object.keys(testData.value[0]).sort()
})

const handleDataClick = (data) => {
  console.log('點擊數據:', data)
}
</script>
