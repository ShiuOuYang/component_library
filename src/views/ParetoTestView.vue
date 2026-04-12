<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <div class="max-w-7xl mx-auto">
      <div class="mb-6 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-800">Pareto Chart 測試頁面</h1>
        <div class="space-x-2">
          <button 
            @click="generateData" 
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            重新生成數據
          </button>
          <button 
            @click="clearData" 
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            清空數據
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <!-- 控制面板 -->
        <div class="lg:col-span-1 space-y-6">
          <div class="bg-white p-4 rounded-lg shadow">
            <h2 class="text-lg font-semibold mb-4 text-gray-700">控制選項</h2>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  累積閾值 ({{ threshold }}%)
                </label>
                <input 
                  type="range" 
                  v-model.number="threshold" 
                  min="1" 
                  max="100" 
                  class="w-full"
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  圖表高度 ({{ height }}px)
                </label>
                <input 
                  type="range" 
                  v-model.number="height" 
                  min="200" 
                  max="800" 
                  step="50"
                  class="w-full"
                >
              </div>

              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  id="showStats" 
                  v-model="showStats"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                >
                <label for="showStats" class="ml-2 block text-sm text-gray-900">
                  顯示統計資訊
                </label>
              </div>
            </div>
          </div>

          <div class="bg-white p-4 rounded-lg shadow">
            <h2 class="text-lg font-semibold mb-4 text-gray-700">數據預覽</h2>
            <div class="overflow-auto max-h-96 text-xs">
              <pre>{{ JSON.stringify(inputData, null, 2) }}</pre>
            </div>
          </div>
        </div>

        <!-- 圖表區域 -->
        <div class="lg:col-span-3">
          <div class="bg-white p-6 rounded-lg shadow">
            <ParetoChart
              :pareto-input-data="inputData"
              :cumulative-threshold="threshold"
              :chart-height="height"
              :show-statistics="showStats"
              @chartRendered="onChartRendered"
              @error="onError"
            />
          </div>

          <div class="mt-6 bg-white p-4 rounded-lg shadow" v-if="processedData.length > 0">
            <h2 class="text-lg font-semibold mb-4 text-gray-700">處理後數據 (Top 5)</h2>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名稱</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">數量</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">佔比</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">累積佔比</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="item in processedData.slice(0, 5)" :key="item.name">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ item.name }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.count }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.percentage.toFixed(1) }}%</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.cumulative.toFixed(1) }}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ParetoChart from '../components/common/ParetoChart.vue'
import { transformToParetoData } from '../utils/d3ParetoUtils'

// 狀態
const inputData = ref([])
const processedData = ref([])
const threshold = ref(80)
const height = ref(400)
const showStats = ref(true)

// 生成隨機數據
const generateData = () => {
  const categories = [
    '刮傷', '異物', '髒污', '變形', '缺件', 
    '錯件', '短路', '斷路', '錫球', '空焊',
    '偏移', '破損', '氧化', '氣泡', '裂痕'
  ]
  
  // 隨機決定要生成多少項數據 (5-15項)
  const count = Math.floor(Math.random() * 10) + 5
  
  // 隨機選取類別並賦予數值
  const data = []
  const usedCategories = new Set()
  
  for (let i = 0; i < count; i++) {
    let category
    do {
      category = categories[Math.floor(Math.random() * categories.length)]
    } while (usedCategories.has(category))
    
    usedCategories.add(category)
    
    // 使用指數分佈模擬柏拉圖常見的數據分佈 (少數項目佔多數)
    const value = Math.floor(Math.pow(Math.random(), 3) * 1000) + 10
    
    data.push({
      name: category,
      count: value
    })
  }
  
  inputData.value = data
}

const clearData = () => {
  inputData.value = []
  processedData.value = []
}

const onChartRendered = (data) => {
  console.log('圖表已渲染', data)
  processedData.value = data
}

const onError = (error) => {
  console.error('圖表錯誤', error)
}

onMounted(() => {
  generateData()
})
</script>