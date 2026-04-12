<template>
  <div class="p-6 bg-gray-100 min-h-screen">
    <div class="max-w-7xl mx-auto">
      <!-- 頁面標題 -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">散點圖測試頁面</h1>
        <p class="text-gray-600">測試 ScatterPlotChart 元件的各項功能，包括圖例控制、互動功能等。</p>
      </div>

      <!-- 控制面板 -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-800 mb-4">測試控制面板</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- 資料生成控制 -->
          <div class="space-y-4">
            <h3 class="text-sm font-medium text-gray-700">資料生成</h3>
            
            <div class="flex items-center space-x-2">
              <label class="text-sm text-gray-600">站點數量:</label>
              <input 
                v-model.number="dataConfig.stationCount" 
                type="range" 
                min="2" 
                max="8" 
                step="1"
                class="flex-1"
              >
              <span class="text-sm font-medium text-gray-800 min-w-8">{{ dataConfig.stationCount }}</span>
            </div>
            
            <div class="flex items-center space-x-2">
              <label class="text-sm text-gray-600">每站點數據點:</label>
              <input 
                v-model.number="dataConfig.pointsPerStation" 
                type="range" 
                min="10" 
                max="100" 
                step="10"
                class="flex-1"
              >
              <span class="text-sm font-medium text-gray-800 min-w-8">{{ dataConfig.pointsPerStation }}</span>
            </div>
            
            <div class="flex items-center space-x-2">
              <label class="text-sm text-gray-600">良率範圍:</label>
              <select v-model="dataConfig.yieldRange" class="px-2 py-1 border border-gray-300 rounded text-sm">
                <option value="wide">寬範圍 (60-98%)</option>
                <option value="medium">中範圍 (75-95%)</option>
                <option value="narrow">窄範圍 (85-98%)</option>
              </select>
            </div>
            
            <button 
              @click="generateTestData"
              class="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              重新生成資料
            </button>
          </div>
          
          <!-- 圖表配置 -->
          <div class="space-y-4">
            <h3 class="text-sm font-medium text-gray-700">圖表配置</h3>
            
            <div class="flex items-center space-x-2">
              <label class="text-sm text-gray-600">圖表高度:</label>
              <input 
                v-model.number="chartConfig.height" 
                type="range" 
                min="300" 
                max="800" 
                step="50"
                class="flex-1"
              >
              <span class="text-sm font-medium text-gray-800 min-w-12">{{ chartConfig.height }}px</span>
            </div>
            
            <div class="flex items-center space-x-2">
              <input 
                id="showTitle" 
                type="checkbox" 
                v-model="chartConfig.showTitle"
                class="w-4 h-4 text-blue-600"
              >
              <label for="showTitle" class="text-sm text-gray-600">顯示標題</label>
            </div>
            
            <div v-if="chartConfig.showTitle" class="space-y-2">
              <label class="text-sm text-gray-600">自定義標題:</label>
              <input 
                v-model="chartConfig.customTitle" 
                type="text" 
                placeholder="輸入圖表標題"
                class="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
            </div>
          </div>
          
          <!-- 測試場景 -->
          <div class="space-y-4">
            <h3 class="text-sm font-medium text-gray-700">測試場景</h3>
            
            <button 
              @click="loadScenario('normal')"
              class="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
            >
              正常生產場景
            </button>
            
            <button 
              @click="loadScenario('unstable')"
              class="w-full px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors text-sm"
            >
              不穩定生產場景
            </button>
            
            <button 
              @click="loadScenario('trend')"
              class="w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm"
            >
              趨勢變化場景
            </button>
            
            <button 
              @click="loadScenario('sparse')"
              class="w-full px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
            >
              稀疏資料場景
            </button>
          </div>
        </div>
        
        <!-- 資料統計資訊 -->
        <div class="mt-6 pt-4 border-t border-gray-200">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div class="bg-blue-50 p-3 rounded-lg">
              <div class="text-sm text-blue-600 font-medium">總資料點數</div>
              <div class="text-lg font-bold text-blue-800">{{ testData.length }}</div>
            </div>
            <div class="bg-green-50 p-3 rounded-lg">
              <div class="text-sm text-green-600 font-medium">站點數量</div>
              <div class="text-lg font-bold text-green-800">{{ uniqueStations.length }}</div>
            </div>
            <div class="bg-yellow-50 p-3 rounded-lg">
              <div class="text-sm text-yellow-600 font-medium">時間跨度</div>
              <div class="text-lg font-bold text-yellow-800">{{ timeSpanText }}</div>
            </div>
            <div class="bg-purple-50 p-3 rounded-lg">
              <div class="text-sm text-purple-600 font-medium">良率範圍</div>
              <div class="text-lg font-bold text-purple-800">{{ yieldRangeText }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 散點圖元件 -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <ScatterPlotChart
          :data="testData"
          :title="chartConfig.showTitle ? (chartConfig.customTitle || '良率散點圖測試') : ''"
          :chartHeight="chartConfig.height"
          @point-click="handlePointClick"
          @point-hover="handlePointHover"
        />
      </div>

      <!-- 互動事件日誌 -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-800">互動事件日誌</h2>
          <div class="flex space-x-2">
            <button 
              @click="clearEventLog"
              class="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              清除日誌
            </button>
            <div class="flex items-center space-x-2">
              <input 
                id="autoScroll" 
                type="checkbox" 
                v-model="autoScrollLog"
                class="w-4 h-4 text-blue-600"
              >
              <label for="autoScroll" class="text-sm text-gray-600">自動捲動</label>
            </div>
          </div>
        </div>
        
        <div 
          ref="eventLogContainer"
          class="bg-gray-50 rounded border p-4 h-64 overflow-y-auto font-mono text-sm"
        >
          <div v-if="eventLog.length === 0" class="text-gray-500 italic">
            尚無互動事件，請點擊或懸停散點圖中的資料點...
          </div>
          <div 
            v-for="(event, index) in eventLog" 
            :key="index"
            class="mb-2 p-2 rounded transition-colors"
            :class="{
              'bg-blue-100 border-l-4 border-blue-400': event.type === 'click',
              'bg-yellow-100 border-l-4 border-yellow-400': event.type === 'hover'
            }"
          >
            <div class="flex items-center space-x-2">
              <span class="font-bold" :class="{
                'text-blue-700': event.type === 'click',
                'text-yellow-700': event.type === 'hover'
              }">
                {{ event.type === 'click' ? '🖱️ CLICK' : '👆 HOVER' }}
              </span>
              <span class="text-gray-500">{{ event.timestamp }}</span>
            </div>
            <div class="mt-1 ml-6 text-gray-700">
              <div><strong>站點:</strong> {{ event.data.station }}</div>
              <div><strong>良率:</strong> {{ event.data.yield }}%</div>
              <div><strong>時間:</strong> {{ formatTimestamp(event.data.timestamp) }}</div>
              <div><strong>狀態:</strong> {{ event.data.status || 'N/A' }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import ScatterPlotChart from '../components/ScatterPlotChart.vue'

// 響應式變數
const testData = ref([])
const eventLog = ref([])
const eventLogContainer = ref(null)
const autoScrollLog = ref(true)

// 資料生成配置
const dataConfig = ref({
  stationCount: 4,
  pointsPerStation: 50,
  yieldRange: 'medium'
})

// 圖表配置
const chartConfig = ref({
  height: 500,
  showTitle: true,
  customTitle: '良率散點圖測試'
})

// 計算屬性
const uniqueStations = computed(() => {
  if (!testData.value || testData.value.length === 0) return []
  return [...new Set(testData.value.map(d => d.station))].sort()
})

const timeSpanText = computed(() => {
  if (!testData.value || testData.value.length === 0) return 'N/A'
  
  const timestamps = testData.value.map(d => new Date(d.timestamp))
  const minTime = Math.min(...timestamps)
  const maxTime = Math.max(...timestamps)
  const timeDiff = maxTime - minTime
  
  const hours = Math.floor(timeDiff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days}天${hours % 24}小時`
  } else {
    return `${hours}小時`
  }
})

const yieldRangeText = computed(() => {
  if (!testData.value || testData.value.length === 0) return 'N/A'
  
  const yields = testData.value.map(d => d.yield)
  const minYield = Math.min(...yields)
  const maxYield = Math.max(...yields)
  
  return `${minYield.toFixed(1)}% - ${maxYield.toFixed(1)}%`
})

// 生成測試資料
const generateTestData = () => {
  const data = []
  const stations = []
  
  // 生成站點名稱
  for (let i = 1; i <= dataConfig.value.stationCount; i++) {
    stations.push(`Station-${i.toString().padStart(2, '0')}`)
  }
  
  const now = new Date()
  const statuses = ['PASS', 'FAIL', 'WARN', 'OK']
  
  // 根據良率範圍設定參數
  let yieldParams = {}
  switch (dataConfig.value.yieldRange) {
    case 'wide':
      yieldParams = { min: 60, max: 98, sigma: 8 }
      break
    case 'medium':
      yieldParams = { min: 75, max: 95, sigma: 5 }
      break
    case 'narrow':
      yieldParams = { min: 85, max: 98, sigma: 3 }
      break
    default:
      yieldParams = { min: 75, max: 95, sigma: 5 }
  }
  
  stations.forEach(station => {
    for (let i = 0; i < dataConfig.value.pointsPerStation; i++) {
      // 生成隨機時間 (過去24小時內)
      const timeOffset = Math.random() * 24 * 60 * 60 * 1000
      const timestamp = new Date(now.getTime() - timeOffset)
      
      // 生成隨機良率 (正態分佈)
      const u1 = Math.random()
      const u2 = Math.random()
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      
      const mean = (yieldParams.min + yieldParams.max) / 2
      let yieldValue = mean + z * yieldParams.sigma
      
      // 限制在範圍內
      yieldValue = Math.max(yieldParams.min, Math.min(yieldParams.max, yieldValue))
      
      data.push({
        station,
        yield: parseFloat(yieldValue.toFixed(2)),
        timestamp: timestamp.toISOString(),
        status: statuses[Math.floor(Math.random() * statuses.length)]
      })
    }
  })
  
  // 按時間排序
  data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  testData.value = data
  
  // 清除事件日誌
  eventLog.value = []
}

// 載入預設場景
const loadScenario = (scenarioType) => {
  let scenario = {}
  
  switch (scenarioType) {
    case 'normal':
      scenario = {
        stationCount: 5,
        pointsPerStation: 60,
        yieldRange: 'medium'
      }
      break
    case 'unstable':
      scenario = {
        stationCount: 3,
        pointsPerStation: 80,
        yieldRange: 'wide'
      }
      break
    case 'trend':
      scenario = {
        stationCount: 4,
        pointsPerStation: 40,
        yieldRange: 'medium'
      }
      generateTrendData()
      return
    case 'sparse':
      scenario = {
        stationCount: 6,
        pointsPerStation: 20,
        yieldRange: 'narrow'
      }
      break
  }
  
  dataConfig.value = scenario
  generateTestData()
}

// 生成趨勢變化資料
const generateTrendData = () => {
  const data = []
  const stations = ['Station-A', 'Station-B', 'Station-C', 'Station-D']
  const now = new Date()
  const pointsPerStation = 40
  
  stations.forEach((station, stationIndex) => {
    for (let i = 0; i < pointsPerStation; i++) {
      const timeOffset = (i / pointsPerStation) * 24 * 60 * 60 * 1000
      const timestamp = new Date(now.getTime() - timeOffset)
      
      // 模擬趨勢變化
      const trendFactor = Math.sin((i / pointsPerStation) * Math.PI * 2) * 10
      const baseYield = 85 + stationIndex * 2 + trendFactor
      const randomNoise = (Math.random() - 0.5) * 6
      
      let yieldValue = baseYield + randomNoise
      yieldValue = Math.max(70, Math.min(98, yieldValue))
      
      data.push({
        station,
        yield: parseFloat(yieldValue.toFixed(2)),
        timestamp: timestamp.toISOString(),
        status: yieldValue > 90 ? 'PASS' : yieldValue > 80 ? 'WARN' : 'FAIL'
      })
    }
  })
  
  data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  testData.value = data
  eventLog.value = []
}

// 事件處理函數
const handlePointClick = (data) => {
  addEventLog('click', data)
}

const handlePointHover = (data) => {
  addEventLog('hover', data)
}

const addEventLog = (type, data) => {
  const event = {
    type,
    data,
    timestamp: new Date().toLocaleTimeString()
  }
  
  eventLog.value.unshift(event) // 新事件加到最前面
  
  // 限制日誌長度
  if (eventLog.value.length > 100) {
    eventLog.value = eventLog.value.slice(0, 100)
  }
  
  // 自動捲動到頂部
  if (autoScrollLog.value) {
    nextTick(() => {
      if (eventLogContainer.value) {
        eventLogContainer.value.scrollTop = 0
      }
    })
  }
}

const clearEventLog = () => {
  eventLog.value = []
}

const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleString()
}

// 組件掛載時生成初始資料
onMounted(() => {
  generateTestData()
})
</script>

<style scoped>
/* 滑塊樣式 */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: #2563eb;
  transform: scale(1.1);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
}

input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

input[type="range"]::-moz-range-thumb:hover {
  background: #2563eb;
  transform: scale(1.1);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
}

/* 按鈕 hover 效果 */
button {
  transition: all 0.2s ease;
}

button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 選擇器樣式 */
select, input[type="text"] {
  transition: all 0.2s ease;
}

select:focus, input[type="text"]:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
}

/* 事件日誌動畫 */
.bg-blue-100, .bg-yellow-100 {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

/* 統計卡片 hover 效果 */
.bg-blue-50:hover,
.bg-green-50:hover,
.bg-yellow-50:hover,
.bg-purple-50:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

/* 捲動條樣式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
