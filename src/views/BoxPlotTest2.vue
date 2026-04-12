<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
    <div class="max-w-7xl mx-auto">
      <!-- 頁面標題 -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">BoxPlot Chart 測試頁面</h1>
        <p class="text-gray-600">測試所有改進功能：調色盤、時間解析、Station Scale Map、盒鬚圖計算</p>
      </div>

      <!-- 測試控制面板 -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 class="text-2xl font-semibold mb-4 text-gray-800">測試控制面板</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- 數據集選擇 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">數據集</label>
            <select 
              v-model="selectedDataset" 
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="normal">正常數據 (6 站點)</option>
              <option value="many-stations">多站點 (12 站點)</option>
              <option value="many-items">超多圖例 (15 項)</option>
              <option value="invalid-time">含無效時間</option>
              <option value="single-value">單一值測試</option>
            </select>
          </div>

          <!-- 圖例類型 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">圖例類型</label>
            <select 
              v-model="legendType" 
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="station">站點圖例</option>
              <option value="yield">良率範圍</option>
              <option value="status">狀態圖例</option>
              <option value="category">分類圖例</option>
            </select>
          </div>

          <!-- 數據點數量 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">數據點數: {{ dataPointCount }}</label>
            <input 
              v-model.number="dataPointCount" 
              type="range" 
              min="10" 
              max="2000" 
              step="10"
              class="w-full"
            >
          </div>

          <!-- 圖表高度 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">圖表高度: {{ chartHeight }}</label>
            <input 
              v-model.number="chartHeight" 
              type="range" 
              min="400" 
              max="1000" 
              step="50"
              class="w-full"
            >
          </div>
        </div>

        <!-- Dual Y / 行為控制 -->
        <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
            <span class="text-sm font-medium text-gray-700">顯示 Boxplot</span>
            <input v-model="showBoxplot" type="checkbox" class="w-4 h-4" />
          </div>

          <div class="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
            <span class="text-sm font-medium text-gray-700">顯示網格線</span>
            <input v-model="showGridLines" type="checkbox" class="w-4 h-4" />
          </div>

          <div class="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
            <span class="text-sm font-medium text-gray-700">允許閃爍</span>
            <input v-model="shouldBlink" type="checkbox" class="w-4 h-4" />
          </div>

          <div class="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
            <span class="text-sm font-medium text-gray-700">啟用 Right Y</span>
            <input v-model="enableRightAxis" type="checkbox" class="w-4 h-4" />
          </div>
        </div>

        <div v-if="enableRightAxis" class="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Right 欄位名稱</label>
            <input
              v-model="rightAxisField"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如: cycleTime"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Right 單位</label>
            <input
              v-model="rightAxisUnit"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如: s"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Right multiplier</label>
            <input
              v-model.number="rightAxisMultiplier"
              type="number"
              step="1"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Right 比例: {{ rightAxisRatio }}%</label>
            <input v-model.number="rightAxisRatio" type="range" min="0" max="100" step="5" class="w-full" />
            <p class="text-xs text-gray-500 mt-1">資料點會以此比例標記為 right</p>
          </div>
        </div>

        <!-- 操作按鈕 -->
        <div class="mt-6 flex flex-wrap gap-3">
          <button 
            @click="generateTestData" 
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            🔄 重新生成數據
          </button>
          <button 
            @click="testColorPalette" 
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            🎨 測試調色盤
          </button>
          <button 
            @click="testInvalidTime" 
            class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
          >
            ⏰測試無效時間
          </button>
          <button 
            @click="testPerformance" 
            class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            ⚡ 性能測試
          </button>
          <button 
            @click="clearLogs" 
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            🗑️ 清除日誌
          </button>
        </div>

        <!-- 測試結果統計 -->
        <div class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-blue-50 rounded-lg p-4">
            <div class="text-sm text-gray-600">總數據點</div>
            <div class="text-2xl font-bold text-blue-600">{{ chartData.length }}</div>
          </div>
          <div class="bg-green-50 rounded-lg p-4">
            <div class="text-sm text-gray-600">站點數量</div>
            <div class="text-2xl font-bold text-green-600">{{ uniqueStations.length }}</div>
          </div>
          <div class="bg-yellow-50 rounded-lg p-4">
            <div class="text-sm text-gray-600">時間範圍</div>
            <div class="text-sm font-bold text-yellow-600">{{ timeRange }}</div>
          </div>
          <div class="bg-purple-50 rounded-lg p-4">
            <div class="text-sm text-gray-600">良率範圍</div>
            <div class="text-sm font-bold text-purple-600">{{ yieldRange }}</div>
          </div>
        </div>
      </div>

      <!-- 圖表顯示區域 -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-semibold text-gray-800">BoxPlot Chart</h2>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600">圖例高亮:</span>
            <input 
              v-model="enableLegendHighlight" 
              type="checkbox" 
              class="w-4 h-4"
            >
          </div>
        </div>
        
        <BoxPlotChart
          v-if="chartData.length > 0"
          :data="chartData"
          :title="`${selectedDataset} - ${legendType}`"
          :chart-height="chartHeight"
          :legend-type="legendType"
          :enable-legend-highlight="enableLegendHighlight"
          :station-order="stationOrder"
          :custom-colors="customColors"
          :blinking-legends="blinkingLegends"
          :show-boxplot="showBoxplot"
          :show-grid-lines="showGridLines"
          :should-blink="shouldBlink"
          :right-value-axis-config="enableRightAxis ? rightValueAxisConfig : null"
          :value-axis-side-field="enableRightAxis ? valueAxisSideField : ''"
          @data-click="handleDataClick"
          @tooltip-show="handleTooltipShow"
          @tooltip-hide="handleTooltipHide"
          @station-click="handleStationClick"
          @outlier-click="handleOutlierClick"
        />
        
        <div v-else class="text-center py-12 text-gray-400">
          請選擇數據集或生成測試數據
        </div>
      </div>

      <!-- Tooltip 顯示（Vue 驅動 + Teleport） -->
      <Teleport to="body">
        <div
          v-if="tooltipVisible"
          class="fixed bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl z-50 pointer-events-none"
          :style="{
            left: tooltipPosition.x + 'px',
            top: tooltipPosition.y + 'px'
          }"
        >
          <div class="text-sm space-y-1">
            <div class="font-bold">{{ tooltipData.station }}</div>
            <div v-if="tooltipData.yield">Yield: {{ tooltipData.yield }}</div>
            <div v-if="enableRightAxis && tooltipData[rightAxisField]">{{ rightAxisField }}: {{ tooltipData[rightAxisField] }}</div>
            <div v-if="tooltipData.valueAxis" class="text-xs text-gray-300">Axis: {{ tooltipData.valueAxis }}</div>
            <div>批號: {{ tooltipData.lotnum }}</div>
            <div class="text-xs text-gray-300">{{ tooltipData.timestamp }}</div>
          </div>
        </div>
      </Teleport>

      <!-- 測試日誌 -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-semibold text-gray-800">測試日誌</h2>
          <span class="text-sm text-gray-500">最新 50 條</span>
        </div>
        
        <div class="max-h-96 overflow-y-auto bg-gray-50 rounded-lg p-4">
          <div 
            v-for="(log, index) in testLogs.slice().reverse()" 
            :key="index"
            class="text-sm py-2 border-b border-gray-200 last:border-b-0 font-mono"
            :class="{
              'text-green-600': log.type === 'success',
              'text-red-600': log.type === 'error',
              'text-yellow-600': log.type === 'warning',
              'text-blue-600': log.type === 'info'
            }"
          >
            <span class="text-gray-400">{{ log.timestamp }}</span> - 
            <span class="font-medium">{{ log.message }}</span>
          </div>
          <div v-if="testLogs.length === 0" class="text-gray-400 text-center py-8">
            暫無測試日誌
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import BoxPlotChart from '../components/BoxPlotChart_copy.vue'

// 響應式數據
const selectedDataset = ref('normal')
const legendType = ref('station')
const dataPointCount = ref(50)
const chartHeight = ref(600)
const enableLegendHighlight = ref(true)
const chartData = ref([])
const testLogs = ref([])
const tooltipVisible = ref(false)
const tooltipPosition = ref({ x: 0, y: 0 })
const tooltipData = ref({})

// 行為控制 / Dual Y
const showBoxplot = ref(false)
const showGridLines = ref(true)
const shouldBlink = ref(true)
const enableRightAxis = ref(false)
const valueAxisSideField = ref('valueAxisSide')
const rightAxisField = ref('cycleTime')
const rightAxisUnit = ref('s')
const rightAxisMultiplier = ref(1)
const rightAxisRatio = ref(30)

const rightValueAxisConfig = computed(() => {
  return {
    field: rightAxisField.value,
    unit: rightAxisUnit.value,
    multiplier: rightAxisMultiplier.value
  }
})

// 配置
const stationOrder = ref([])
const customColors = ref({})
const blinkingLegends = ref([])

// 站點列表
const normalStations = ['Core', 'Bu', 'OST', 'BDT', 'FLI', 'BUMP']
const manyStations = ['Core', 'Bu', 'OST', 'BDT', 'FLI', 'BUMP', 'CC', 'WPG', 'VI', 'TEST', 'QA', 'SHIP']

// 計算屬性
const uniqueStations = computed(() => {
  return [...new Set(chartData.value.map(d => d.station))]
})

const timeRange = computed(() => {
  if (chartData.value.length === 0) return 'N/A'
  const times = chartData.value.map(d => new Date(d.timestamp))
  const min = new Date(Math.min(...times))
  const max = new Date(Math.max(...times))
  return `${min.toLocaleDateString()} - ${max.toLocaleDateString()}`
})

const yieldRange = computed(() => {
  if (chartData.value.length === 0) return 'N/A'
  const yields = chartData.value.map(d => d.yield * 100)
  const min = Math.min(...yields).toFixed(1)
  const max = Math.max(...yields).toFixed(1)
  return `${min}% - ${max}%`
})

// 生成測試數據
function generateTestData() {
  addLog('開始生成測試數據...', 'info')
  const startTime = performance.now()
  
  let stations = normalStations
  let data = []
  
  switch (selectedDataset.value) {
    case 'normal':
      stations = normalStations
      data = generateNormalData(stations, dataPointCount.value)
      stationOrder.value = stations
      addLog(`生成正常數據: ${data.length} 個數據點`, 'success')
      break
      
    case 'many-stations':
      stations = manyStations
      data = generateNormalData(stations, dataPointCount.value)
      stationOrder.value = stations
      addLog(`生成多站點數據: ${stations.length} 個站點`, 'success')
      break
      
    case 'many-items':
      // 測試超過 10 個圖例項目（測試調色盤）
      data = generateManyItemsData(dataPointCount.value)
      addLog(`生成多圖例數據: ${data.length} 個數據點，15 個分類`, 'warning')
      break
      
    case 'invalid-time':
      data = generateInvalidTimeData(normalStations, dataPointCount.value)
      addLog(`生成含無效時間數據: 包含 20% 無效時間戳`, 'warning')
      break
      
    case 'single-value':
      data = generateSingleValueData(normalStations)
      addLog(`生成單一值測試數據: 每站點只有一個值`, 'info')
      break
  }
  
  chartData.value = data
  const endTime = performance.now()
  addLog(`數據生成完成，耗時: ${(endTime - startTime).toFixed(2)}ms`, 'success')
}

// 生成正常測試數據
function generateNormalData(stations, count) {
  const data = []
  const startDate = new Date('2024-01-01')
  
  for (let i = 0; i < count; i++) {
    const station = stations[Math.floor(Math.random() * stations.length)]
    const date = new Date(startDate)
    date.setHours(date.getHours() + i * 2)
    
    const baseYield = 0.85 + Math.random() * 0.1
    const statusOptions = ['Good', 'Warning', 'Critical', 'Normal']
    const categoryOptions = ['A', 'B', 'C', 'D', 'E']
    
    const isRight = enableRightAxis.value && Math.random() * 100 < rightAxisRatio.value

    const row = {
      station,
      yield: baseYield,
      timestamp: date.toISOString(),
      status: statusOptions[Math.floor(Math.random() * statusOptions.length)],
      category: categoryOptions[Math.floor(Math.random() * categoryOptions.length)],
      [valueAxisSideField.value]: isRight ? 'right' : 'left',
      [rightAxisField.value]: isRight ? (10 + Math.random() * 30) : null,
      raw: {
        lotnum: `LOT${1000 + i}`,
        part_number: `PN-${station}-${i}`
      }
    }

    data.push(row)
  }
  
  return data
}

// 生成多圖例項目數據（測試調色盤越界）
function generateManyItemsData(count) {
  const data = []
  const stations = normalStations
  const startDate = new Date('2024-01-01')
  
  // 創建 15 個不同的分類
  const categories = Array.from({ length: 15 }, (_, i) => `Category-${String.fromCharCode(65 + i)}`)
  
  for (let i = 0; i < count; i++) {
    const station = stations[Math.floor(Math.random() * stations.length)]
    const date = new Date(startDate)
    date.setHours(date.getHours() + i * 2)
    
    const isRight = enableRightAxis.value && Math.random() * 100 < rightAxisRatio.value

    const row = {
      station,
      yield: 0.80 + Math.random() * 0.15,
      timestamp: date.toISOString(),
      status: categories[i % categories.length],
      category: categories[Math.floor(Math.random() * categories.length)],
      [valueAxisSideField.value]: isRight ? 'right' : 'left',
      [rightAxisField.value]: isRight ? (10 + Math.random() * 30) : null,
      raw: {
        lotnum: `LOT${1000 + i}`,
        part_number: `PN-${station}-${i}`
      }
    }

    data.push(row)
  }
  
  return data
}

// 生成含無效時間的數據（測試時間解析）
function generateInvalidTimeData(stations, count) {
  const data = []
  const startDate = new Date('2024-01-01')
  
  for (let i = 0; i < count; i++) {
    const station = stations[Math.floor(Math.random() * stations.length)]
    
    // 20% 的機率產生無效時間
    let timestamp
    if (Math.random() < 0.2) {
      const invalidFormats = [
        'invalid-date',
        '2024-13-45',  // 無效月份和日期
        'not-a-date',
        '2024/99/99',
        ''
      ]
      timestamp = invalidFormats[Math.floor(Math.random() * invalidFormats.length)]
    } else {
      const date = new Date(startDate)
      date.setHours(date.getHours() + i * 2)
      timestamp = date.toISOString()
    }
    
    const isRight = enableRightAxis.value && Math.random() * 100 < rightAxisRatio.value

    const row = {
      station,
      yield: 0.85 + Math.random() * 0.1,
      timestamp,
      status: 'Normal',
      category: 'A',
      [valueAxisSideField.value]: isRight ? 'right' : 'left',
      [rightAxisField.value]: isRight ? (10 + Math.random() * 30) : null,
      raw: {
        lotnum: `LOT${1000 + i}`,
        part_number: `PN-${station}-${i}`
      }
    }

    data.push(row)
  }
  
  return data
}

// 生成單一值數據（測試 Scale Map）
function generateSingleValueData(stations) {
  const data = []
  const date = new Date('2024-01-01')
  
  stations.forEach((station, index) => {
    const isRight = enableRightAxis.value && (index % 2 === 0)

    const row = {
      station,
      yield: 0.85 + (index * 0.02),
      timestamp: date.toISOString(),
      status: 'Normal',
      category: 'A',
      [valueAxisSideField.value]: isRight ? 'right' : 'left',
      [rightAxisField.value]: isRight ? (10 + index * 2) : null,
      raw: {
        lotnum: `LOT${1000 + index}`,
        part_number: `PN-${station}-${index}`
      }
    }

    data.push(row)
  })
  
  return data
}

// 測試調色盤
function testColorPalette() {
  addLog('開始測試調色盤...', 'info')
  
  // 測試 6 項
  legendType.value = 'station'
  selectedDataset.value = 'normal'
  generateTestData()
  addLog('✓ 測試 6 項圖例（應使用預設 6 色）', 'success')
  
  setTimeout(() => {
    // 測試 12 項
    selectedDataset.value = 'many-stations'
    generateTestData()
    addLog('✓ 測試 12 項圖例（應使用 Tableau10 + 動態生成）', 'success')
    
    setTimeout(() => {
      // 測試 15 項
      selectedDataset.value = 'many-items'
      legendType.value = 'category'
      generateTestData()
      addLog('✓ 測試 15 項圖例（應使用 interpolateTurbo 動態生成）', 'success')
      addLog('調色盤測試完成！請檢查圖表顯示是否正常', 'success')
    }, 1000)
  }, 1000)
}

// 測試無效時間
function testInvalidTime() {
  addLog('開始測試無效時間解析...', 'warning')
  selectedDataset.value = 'invalid-time'
  generateTestData()
  
  setTimeout(() => {
    const validCount = chartData.value.filter(d => {
      const parsed = new Date(d.timestamp)
      return !isNaN(parsed.getTime())
    }).length
    
    addLog(`有效時間數據點: ${validCount} / ${chartData.value.length}`, 'info')
    addLog('請檢查 Console 是否有 "Invalid date format" 錯誤訊息', 'warning')
    addLog('無效時間測試完成！圖表應該只顯示有效數據點', 'success')
  }, 500)
}

// 性能測試
function testPerformance() {
  addLog('開始性能測試...', 'info')
  
  const testSizes = [50, 100, 150, 200]
  let currentIndex = 0
  
  function runTest() {
    if (currentIndex >= testSizes.length) {
      addLog('性能測試完成！', 'success')
      return
    }
    
    const size = testSizes[currentIndex]
    dataPointCount.value = size
    
    const startTime = performance.now()
    generateTestData()
    const endTime = performance.now()
    
    addLog(`${size} 數據點渲染時間: ${(endTime - startTime).toFixed(2)}ms`, 'info')
    
    currentIndex++
    setTimeout(runTest, 1500)
  }
  
  runTest()
}

// 處理數據點擊
function handleDataClick(data) {
  const v = typeof data?.value === 'number' ? data.value : null
  const unit = data?.valueField === 'yield' ? '%' : (rightAxisUnit.value || '')
  const label = data?.valueField || 'value'
  addLog(
    `點擊數據點: ${data.station} - ${label}: ${v === null ? 'N/A' : v.toFixed(1)}${unit} (${data?.valueAxis || 'left'})`,
    'info'
  )
  console.log('Data clicked:', data)
}

function handleStationClick(payload) {
  addLog(`點擊站點: ${payload?.station || payload?.category}`, 'info')
}

function handleOutlierClick(payload) {
  const v = typeof payload?.value === 'number' ? payload.value : null
  const unit = payload?.valueField === 'yield' ? '%' : (rightAxisUnit.value || '')
  addLog(`Outlier: ${payload?.station} - ${payload?.valueField}: ${v === null ? 'N/A' : v.toFixed(1)}${unit}`, 'warning')
}

// 處理 Tooltip 顯示
function handleTooltipShow({ position, data }) {
  // position.x/y 是圖表傳來的「頁面座標 anchor」；這裡做 offset + clamp，避免超出視窗
  const offsetX = 12
  const offsetY = -12
  const approxWidth = 260
  const approxHeight = 120

  const rawX = (position?.x ?? 0) + offsetX
  const rawY = (position?.y ?? 0) + offsetY

  const pad = 8
  const maxX = Math.max(pad, window.innerWidth - approxWidth - pad)
  const maxY = Math.max(pad, window.innerHeight - approxHeight - pad)

  tooltipVisible.value = true
  tooltipPosition.value = {
    x: Math.max(pad, Math.min(rawX, maxX)),
    y: Math.max(pad, Math.min(rawY, maxY))
  }
  tooltipData.value = data
}

// 處理 Tooltip 隱藏
function handleTooltipHide() {
  tooltipVisible.value = false
}

// 添加日誌
function addLog(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString()
  testLogs.value.push({ timestamp, message, type })
  
  // 限制日誌數量
  if (testLogs.value.length > 50) {
    testLogs.value = testLogs.value.slice(-50)
  }
}

// 清除日誌
function clearLogs() {
  testLogs.value = []
  addLog('日誌已清除', 'info')
}

// 監聽數據集變化
watch(selectedDataset, () => {
  generateTestData()
})

// 組件掛載後初始化
onMounted(() => {
  addLog('BoxPlot Chart 測試頁面已載入', 'success')
  generateTestData()
})
</script>

<style scoped>
/* 滾動條樣式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
