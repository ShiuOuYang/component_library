<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-7xl mx-auto">
      <!-- 頁面標題 -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Line Chart 練習</h1>
        <p class="text-gray-600">學習 D3.js Line Chart 的各種配置和功能</p>
      </div>

      <!-- 控制面板 -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4 text-gray-800">圖表配置</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- 數據集選擇 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">數據集</label>
            <select 
              v-model="selectedDataset" 
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="sales">銷售數據</option>
              <option value="temperature">溫度變化</option>
              <option value="stock">股價數據</option>
              <option value="random">隨機數據</option>
            </select>
          </div>

          <!-- 曲線類型 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">曲線類型</label>
            <select 
              v-model="chartConfig.curve" 
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="curveLinear">直線</option>
              <option value="curveBasis">平滑曲線</option>
              <option value="curveMonotoneX">單調曲線</option>
              <option value="curveCardinal">Cardinal 曲線</option>
            </select>
          </div>

          <!-- 線條顏色 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">線條顏色</label>
            <input 
              v-model="chartConfig.strokeColor" 
              type="color"
              class="w-full h-10 px-1 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>

          <!-- 線條寬度 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">線條寬度: {{ chartConfig.strokeWidth }}</label>
            <input 
              v-model="chartConfig.strokeWidth" 
              type="range" 
              min="1" 
              max="10" 
              class="w-full"
            >
          </div>
        </div>

        <!-- 功能開關 -->
        <div class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <label class="flex items-center">
            <input 
              v-model="chartConfig.showArea" 
              type="checkbox" 
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            >
            <span class="ml-2 text-sm text-gray-700">顯示面積</span>
          </label>

          <label class="flex items-center">
            <input 
              v-model="chartConfig.showDots" 
              type="checkbox" 
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            >
            <span class="ml-2 text-sm text-gray-700">顯示數據點</span>
          </label>

          <label class="flex items-center">
            <input 
              v-model="chartConfig.showCrosshair" 
              type="checkbox" 
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            >
            <span class="ml-2 text-sm text-gray-700">顯示十字線</span>
          </label>

          <label class="flex items-center">
            <input 
              v-model="chartConfig.animate" 
              type="checkbox" 
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            >
            <span class="ml-2 text-sm text-gray-700">啟用動畫</span>
          </label>
        </div>

        <!-- 操作按鈕 -->
        <div class="mt-6 flex flex-wrap gap-3">
          <button 
            @click="generateRandomData" 
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            生成隨機數據
          </button>
          <button 
            @click="redrawChart" 
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            重新繪製
          </button>
          <button 
            @click="animateChart" 
            class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            重播動畫
          </button>
          <button 
            @click="exportChart" 
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            導出 SVG
          </button>
        </div>
      </div>

      <!-- 圖表區域 -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gray-800">Line Chart 示例</h2>
          <div class="text-sm text-gray-600">
            數據點數量: {{ currentData.length }}
          </div>
        </div>
        
        <D3LineChart
          ref="lineChartRef"
          :data="currentData"
          :width="800"
          :height="400"
          :stroke-color="chartConfig.strokeColor"
          :stroke-width="chartConfig.strokeWidth"
          :show-area="chartConfig.showArea"
          :show-dots="chartConfig.showDots"
          :show-crosshair="chartConfig.showCrosshair"
          :curve="chartConfig.curve"
          :animate="chartConfig.animate"
          @dot-click="handleDotClick"
          @dot-hover="handleDotHover"
          @chart-mousemove="handleChartMouseMove"
        />
      </div>

      <!-- 數據表格 -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gray-800">數據詳情</h2>
          <div class="flex gap-2">
            <button 
              @click="sortDataByDate" 
              class="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
            >
              按日期排序
            </button>
            <button 
              @click="sortDataByValue" 
              class="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
            >
              按數值排序
            </button>
          </div>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left">序號</th>
                <th class="px-4 py-2 text-left">日期</th>
                <th class="px-4 py-2 text-right">數值</th>
                <th class="px-4 py-2 text-right">變化</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="(item, index) in currentData" 
                :key="index" 
                class="border-t hover:bg-gray-50"
                :class="{ 'bg-blue-50': selectedDataIndex === index }"
              >
                <td class="px-4 py-2">{{ index + 1 }}</td>
                <td class="px-4 py-2">{{ formatDate(item.date) }}</td>
                <td class="px-4 py-2 text-right font-mono">{{ item.value.toFixed(1) }}</td>
                <td class="px-4 py-2 text-right">
                  <span 
                    v-if="index > 0"
                    :class="getChangeClass(item.value - currentData[index - 1].value)"
                  >
                    {{ getChangeText(item.value - currentData[index - 1].value) }}
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 事件日誌 -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gray-800">事件日誌</h2>
          <button 
            @click="eventLogs = []" 
            class="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
          >
            清除
          </button>
        </div>
        
        <div class="max-h-40 overflow-y-auto">
          <div 
            v-for="(log, index) in eventLogs.slice().reverse()" 
            :key="index"
            class="text-sm text-gray-600 py-1 border-b border-gray-100 last:border-b-0"
          >
            <span class="font-medium text-blue-600">{{ log.timestamp }}</span> - 
            <span class="text-gray-800">{{ log.message }}</span>
          </div>
          <div v-if="eventLogs.length === 0" class="text-gray-400 text-center py-4">
            暫無事件日誌
          </div>
        </div>
      </div>

      <!-- 學習筆記 -->
      <div class="bg-white rounded-lg shadow-lg p-6 mt-8">
        <h2 class="text-xl font-semibold mb-4 text-gray-800">D3.js Line Chart 學習筆記</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="font-medium text-gray-700 mb-3">核心概念</h3>
            <ul class="text-sm text-gray-600 space-y-2">
              <li class="flex items-start">
                <code class="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs mr-2 mt-0.5">d3.scaleTime()</code>
                <span>時間比例尺，將日期映射到像素座標</span>
              </li>
              <li class="flex items-start">
                <code class="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs mr-2 mt-0.5">d3.scaleLinear()</code>
                <span>線性比例尺，將數值映射到像素座標</span>
              </li>
              <li class="flex items-start">
                <code class="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs mr-2 mt-0.5">d3.line()</code>
                <span>線條生成器，根據數據點生成 SVG 路徑</span>
              </li>
              <li class="flex items-start">
                <code class="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs mr-2 mt-0.5">d3.area()</code>
                <span>面積生成器，創建填充區域</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 class="font-medium text-gray-700 mb-3">實用技巧</h3>
            <ul class="text-sm text-gray-600 space-y-2">
              <li>• 使用 <code class="bg-gray-100 px-1 rounded">d3.extent()</code> 自動計算數據範圍</li>
              <li>• 選擇合適的曲線插值方式影響視覺效果</li>
              <li>• 添加過渡動畫增強用戶體驗</li>
              <li>• 實現十字線提供精確的數據讀取</li>
              <li>• 響應滑鼠事件創建互動體驗</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import D3LineChart from '../components/D3LineChart.vue'

// 數據集
const datasets = {
  sales: [
    { date: new Date('2024-01-01'), value: 100 },
    { date: new Date('2024-02-01'), value: 150 },
    { date: new Date('2024-03-01'), value: 120 },
    { date: new Date('2024-04-01'), value: 200 },
    { date: new Date('2024-05-01'), value: 180 },
    { date: new Date('2024-06-01'), value: 250 },
    { date: new Date('2024-07-01'), value: 220 },
    { date: new Date('2024-08-01'), value: 300 },
    { date: new Date('2024-09-01'), value: 280 }
  ],
  temperature: [
    { date: new Date('2024-01-01'), value: 5 },
    { date: new Date('2024-02-01'), value: 8 },
    { date: new Date('2024-03-01'), value: 15 },
    { date: new Date('2024-04-01'), value: 20 },
    { date: new Date('2024-05-01'), value: 25 },
    { date: new Date('2024-06-01'), value: 30 },
    { date: new Date('2024-07-01'), value: 35 },
    { date: new Date('2024-08-01'), value: 33 },
    { date: new Date('2024-09-01'), value: 28 },
    { date: new Date('2024-10-01'), value: 20 },
    { date: new Date('2024-11-01'), value: 12 },
    { date: new Date('2024-12-01'), value: 6 }
  ],
  stock: [
    { date: new Date('2024-01-01'), value: 100 },
    { date: new Date('2024-01-15'), value: 105 },
    { date: new Date('2024-02-01'), value: 98 },
    { date: new Date('2024-02-15'), value: 110 },
    { date: new Date('2024-03-01'), value: 115 },
    { date: new Date('2024-03-15'), value: 108 },
    { date: new Date('2024-04-01'), value: 120 },
    { date: new Date('2024-04-15'), value: 125 },
    { date: new Date('2024-05-01'), value: 118 }
  ],
  random: []
}

// 響應式數據
const selectedDataset = ref('sales')
const lineChartRef = ref(null)
const eventLogs = ref([])
const selectedDataIndex = ref(-1)

const chartConfig = ref({
  strokeColor: '#3b82f6',
  strokeWidth: 3,
  showArea: true,
  showDots: true,
  showCrosshair: true,
  curve: 'curveBasis',
  animate: true
})

// 當前數據
const currentData = computed(() => {
  if (selectedDataset.value === 'random' && datasets.random.length === 0) {
    generateRandomData()
  }
  return datasets[selectedDataset.value] || []
})

// 生成隨機數據
function generateRandomData() {
  const data = []
  const startDate = new Date('2024-01-01')
  
  for (let i = 0; i < 20; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i * 7) // 每週一個數據點
    
    const value = Math.random() * 100 + 50 + Math.sin(i * 0.5) * 30
    data.push({ date, value })
  }
  
  datasets.random = data
  addEventLog('生成了新的隨機數據')
}

// 重新繪製圖表
function redrawChart() {
  if (lineChartRef.value && lineChartRef.value.redraw) {
    lineChartRef.value.redraw()
    addEventLog('重新繪製圖表')
  }
}

// 重播動畫
function animateChart() {
  if (lineChartRef.value && lineChartRef.value.animate) {
    lineChartRef.value.animate()
    addEventLog('重播圖表動畫')
  }
}

// 導出 SVG
function exportChart() {
  if (lineChartRef.value) {
    // 這裡可以實現 SVG 導出功能
    addEventLog('SVG 導出功能待實現')
  }
}

// 排序數據
function sortDataByDate() {
  const sortedData = [...currentData.value].sort((a, b) => a.date - b.date)
  datasets[selectedDataset.value] = sortedData
  addEventLog('數據已按日期排序')
}

function sortDataByValue() {
  const sortedData = [...currentData.value].sort((a, b) => b.value - a.value)
  datasets[selectedDataset.value] = sortedData
  addEventLog('數據已按數值排序')
}

// 處理數據點點擊
function handleDotClick(event) {
  const { data, index } = event
  selectedDataIndex.value = index
  addEventLog(`點擊數據點: ${formatDate(data.date)}, 值: ${data.value.toFixed(1)}`)
}

// 處理數據點懸停
function handleDotHover(event) {
  const { data } = event
  addEventLog(`懸停數據點: ${formatDate(data.date)}, 值: ${data.value.toFixed(1)}`)
}

// 處理圖表滑鼠移動
function handleChartMouseMove(event) {
  // 這個事件會很頻繁，所以我們不記錄到日誌中
}

// 添加事件日誌
function addEventLog(message) {
  const timestamp = new Date().toLocaleTimeString()
  eventLogs.value.push({ timestamp, message })
  
  // 限制日誌數量
  if (eventLogs.value.length > 50) {
    eventLogs.value = eventLogs.value.slice(-50)
  }
}

// 格式化日期
function formatDate(date) {
  return date.toLocaleDateString('zh-TW')
}

// 獲取變化樣式類別
function getChangeClass(change) {
  if (change > 0) return 'text-green-600 font-medium'
  if (change < 0) return 'text-red-600 font-medium'
  return 'text-gray-500'
}

// 獲取變化文字
function getChangeText(change) {
  if (change > 0) return `+${change.toFixed(1)}`
  if (change < 0) return change.toFixed(1)
  return '0'
}

// 監聽數據集變化
watch(selectedDataset, (newVal) => {
  selectedDataIndex.value = -1
  addEventLog(`切換到數據集: ${newVal}`)
})

// 監聽圖表配置變化
watch(() => chartConfig.value, (newConfig, oldConfig) => {
  if (oldConfig) {
    addEventLog('圖表配置已更新')
  }
}, { deep: true })

onMounted(() => {
  addEventLog('Line Chart 練習頁面已載入')
})
</script>

<style scoped>
/* 自定義樣式 */
/* .chart-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
} */

/* 表格滾動條樣式 */
.overflow-x-auto::-webkit-scrollbar {
  height: 6px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>