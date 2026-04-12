<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-7xl mx-auto">
      <!-- 頁面標題 -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">D3.js 圖表練習</h1>
        <p class="text-gray-600">練習使用 D3.js 創建 Bar Chart 和 Line Chart</p>
      </div>

      <!-- 控制面板 -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">控制面板</h2>
        <div class="flex flex-wrap gap-4 items-center">
          <button
            @click="generateRandomData"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            生成新數據
          </button>
          <button
            @click="animateCharts"
            class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            動畫效果
          </button>
          <label class="flex items-center gap-2">
            <span class="text-gray-700">數據點數量:</span>
            <input
              v-model.number="dataCount"
              type="number"
              min="5"
              max="20"
              class="px-2 py-1 border border-gray-300 rounded text-center w-16"
            >
          </label>
          <label class="flex items-center gap-2">
            <span class="text-gray-700">曲線類型:</span>
            <select 
              v-model="curveType" 
              class="px-2 py-1 border border-gray-300 rounded"
            >
              <option value="curveBasis">平滑曲線</option>
              <option value="curveLinear">直線</option>
              <option value="curveMonotoneX">單調曲線</option>
              <option value="curveCardinal">Cardinal曲線</option>
            </select>
          </label>
        </div>
      </div>

      <!-- 圖表區域 -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <!-- Bar Chart -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold mb-4 text-center">Bar Chart - 銷售數據</h2>
          <D3BarChart
            ref="barChartRef"
            :data="barData"
            :width="500"
            :height="320"
            :animate="true"
            @bar-click="handleBarClick"
            @bar-hover="handleBarHover"
          />
          <div class="mt-4 text-sm text-gray-600">
            <p><strong>功能：</strong>滑鼠懸停顯示數值，點擊高亮顯示</p>
            <p v-if="selectedBar" class="mt-2 text-blue-600">
              <strong>已選擇:</strong> {{ selectedBar.category }} ({{ selectedBar.value }})
            </p>
          </div>
        </div>

        <!-- Line Chart -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold mb-4 text-center">Line Chart - 趨勢分析</h2>
          <D3LineChart
            ref="lineChartRef"
            :data="lineData"
            :width="500"
            :height="320"
            :curve="curveType"
            :show-area="showArea"
            :show-dots="showDots"
            :show-crosshair="showCrosshair"
            :animate="true"
            @dot-click="handleDotClick"
            @dot-hover="handleDotHover"
            @chart-mousemove="handleChartMouseMove"
          />
          <div class="mt-4 text-sm text-gray-600">
            <p><strong>功能：</strong>滑鼠跟蹤顯示座標，點擊添加標記點</p>
            <div class="flex gap-4 mt-2">
              <label class="flex items-center gap-1">
                <input v-model="showArea" type="checkbox" class="text-blue-500">
                <span class="text-xs">顯示面積</span>
              </label>
              <label class="flex items-center gap-1">
                <input v-model="showDots" type="checkbox" class="text-blue-500">
                <span class="text-xs">顯示數據點</span>
              </label>
              <label class="flex items-center gap-1">
                <input v-model="showCrosshair" type="checkbox" class="text-blue-500">
                <span class="text-xs">顯示十字線</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- 數據表格 -->
      <div class="bg-white rounded-lg shadow-md p-6 mt-8">
        <h2 class="text-xl font-semibold mb-4">當前數據</h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 class="font-medium text-gray-700 mb-2">Bar Chart 數據</h3>
            <div class="overflow-auto max-h-40">
              <table class="w-full text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-3 py-2 text-left">類別</th>
                    <th class="px-3 py-2 text-right">數值</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in barData" :key="item.category" class="border-t">
                    <td class="px-3 py-2">{{ item.category }}</td>
                    <td class="px-3 py-2 text-right">{{ item.value }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 class="font-medium text-gray-700 mb-2">Line Chart 數據</h3>
            <div class="overflow-auto max-h-40">
              <table class="w-full text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-3 py-2 text-left">日期</th>
                    <th class="px-3 py-2 text-right">數值</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in lineData" :key="item.date" class="border-t">
                    <td class="px-3 py-2">{{ formatDate(item.date) }}</td>
                    <td class="px-3 py-2 text-right">{{ item.value.toFixed(1) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- D3.js 學習筆記 -->
      <div class="bg-white rounded-lg shadow-md p-6 mt-8">
        <h2 class="text-xl font-semibold mb-4">D3.js 學習筆記</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="font-medium text-gray-700 mb-2">Bar Chart 重點</h3>
            <ul class="text-sm text-gray-600 space-y-1">
              <li>• 使用 <code class="bg-gray-100 px-1 rounded">d3.scaleBand()</code> 處理類別軸</li>
              <li>• 使用 <code class="bg-gray-100 px-1 rounded">d3.scaleLinear()</code> 處理數值軸</li>
              <li>• <code class="bg-gray-100 px-1 rounded">selection.join()</code> 處理數據綁定</li>
              <li>• 設定 padding 調整柱狀間距</li>
              <li>• 添加滑鼠事件增強互動性</li>
            </ul>
          </div>
          <div>
            <h3 class="font-medium text-gray-700 mb-2">Line Chart 重點</h3>
            <ul class="text-sm text-gray-600 space-y-1">
              <li>• 使用 <code class="bg-gray-100 px-1 rounded">d3.line()</code> 創建線條生成器</li>
              <li>• <code class="bg-gray-100 px-1 rounded">d3.scaleTime()</code> 處理時間軸</li>
              <li>• <code class="bg-gray-100 px-1 rounded">d3.curveBasis</code> 設定曲線插值</li>
              <li>• 添加圓點標記數據點</li>
              <li>• 實現滑鼠跟蹤和十字線</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'
import D3BarChart from '../components/D3BarChart.vue'
import D3LineChart from '../components/D3LineChart.vue'

// 響應式數據
const barChartRef = ref(null)
const lineChartRef = ref(null)
const dataCount = ref(8)

// 圖表配置
const curveType = ref('curveBasis')
const showArea = ref(true)
const showDots = ref(true)
const showCrosshair = ref(true)

// 選中的數據
const selectedBar = ref(null)

// 圖表數據
const barData = ref([])
const lineData = ref([])

// 生成隨機的 Bar Chart 數據
function generateBarData() {
  const categories = ['產品A', '產品B', '產品C', '產品D', '產品E', '產品F', '產品G', '產品H']
  barData.value = categories.slice(0, dataCount.value).map(category => ({
    category,
    value: Math.floor(Math.random() * 100) + 10
  }))
}

// 生成隨機的 Line Chart 數據
function generateLineData() {
  const startDate = new Date(2024, 0, 1)
  lineData.value = Array.from({ length: dataCount.value }, (_, i) => {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i * 7) // 每週一個數據點
    return {
      date,
      value: Math.random() * 50 + 25 + Math.sin(i * 0.5) * 10 // 添加一些趨勢
    }
  })
}

// 生成新的隨機數據
function generateRandomData() {
  generateBarData()
  generateLineData()
}

// 動畫效果
function animateCharts() {
  // 使用組件的動畫方法
  if (barChartRef.value) {
    barChartRef.value.animate()
  }
  if (lineChartRef.value) {
    lineChartRef.value.animate()
  }
}

// 處理 Bar Chart 事件
function handleBarClick({ event, data, element }) {
  selectedBar.value = data
  console.log('Bar clicked:', data)
}

function handleBarHover({ event, data, element }) {
  console.log('Bar hovered:', data)
}

// 處理 Line Chart 事件
function handleDotClick({ event, data, element }) {
  console.log('Dot clicked:', data)
}

function handleDotHover({ event, data, element }) {
  console.log('Dot hovered:', data)
}

function handleChartMouseMove({ event, data, mouseX }) {
  // console.log('Chart mouse move:', data)
}



// 格式化日期
function formatDate(date) {
  return d3.timeFormat('%Y/%m/%d')(date)
}

// 監聽數據數量變化
watch(dataCount, () => {
  generateRandomData()
})

// 組件掛載後初始化
onMounted(() => {
  generateRandomData()
})
</script>

<style scoped>
code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
</style>