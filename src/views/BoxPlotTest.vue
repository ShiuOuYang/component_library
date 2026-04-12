<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
    <!-- 頁面標題 -->
    <div class="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4 shadow-sm">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            盒鬚圖測試
          </h1>
          <p class="text-gray-600 text-sm mt-1">Box Plot Visualization Test</p>
        </div>
        <div class="flex items-center space-x-3">
          <button 
            @click="generateNewData"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all shadow-sm"
          >
            生成新數據
          </button>
          <button 
            @click="exportData"
            class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-sm"
          >
            匯出數據
          </button>
        </div>
      </div>
    </div>

    <div class="p-6 space-y-6">
      <!-- 數據統計面板 -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span class="text-sm font-medium text-gray-700">總數據點</span>
          </div>
          <div class="text-2xl font-bold text-gray-900 mt-2">{{ boxPlotData.length }}</div>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-green-500 rounded-full"></div>
            <span class="text-sm font-medium text-gray-700">分組數量</span>
          </div>
          <div class="text-2xl font-bold text-gray-900 mt-2">{{ uniqueGroups.length }}</div>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span class="text-sm font-medium text-gray-700">平均良率</span>
          </div>
          <div class="text-2xl font-bold text-gray-900 mt-2">{{ averageYield.toFixed(1) }}%</div>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div class="flex items-center space-x-2">
            <div class="w-3 h-3 bg-red-500 rounded-full"></div>
            <span class="text-sm font-medium text-gray-700">時間範圍</span>
          </div>
          <div class="text-sm font-bold text-gray-900 mt-2">{{ timeRangeText }}</div>
        </div>
      </div>

      <!-- 盒鬚圖組件 -->
      <div class="bg-white rounded-lg shadow-sm overflow-hidden">
        <div class="p-6">
          <BoxPlotChart 
            :data="boxPlotData"
            :chart-height="600"
            title="各站點良率分布盒鬚圖"
            @data-click="onDataClick"
            @station-click="onStationClick"
            @outlier-click="onOutlierClick"
            :show-boxplot="showBoxplot"
            :show-grid-lines="showGridLines"
            legend-type="status"
          />
        </div>
      </div>

      <!-- 數據表格 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800">原始數據預覽</h3>
          <p class="text-sm text-gray-600 mt-1">顯示前 100 筆數據</p>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  站點
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  良率 (%)
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  時間戳
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  狀態
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="(item, index) in displayData" :key="index" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {{ item.station }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span 
                    :class="[
                      'px-2 py-1 rounded-full text-xs font-medium',
                      item.yield >= 95 ? 'bg-green-100 text-green-800' :
                      item.yield >= 85 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    ]"
                  >
                    {{ item.yield.toFixed(2) }}%
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatTime(item.timestamp) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    :class="[
                      'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                      item.status === 'MeetTarget' ? 'bg-green-100 text-green-800' :
                      item.status === 'Trigger' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    ]"
                  >
                    {{ item.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 點擊事件的對話框 -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="closeModal">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4" @click.stop>
        <h3 class="text-lg font-semibold text-gray-800 mb-4">{{ modalTitle }}</h3>
        <div class="space-y-2">
          <p v-for="(value, key) in modalData" :key="key" class="text-sm">
            <span class="font-medium text-gray-700">{{ key }}:</span>
            <span class="text-gray-900 ml-2">{{ value }}</span>
          </p>
        </div>
        <div class="mt-6 flex justify-end">
          <button 
            @click="closeModal"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import BoxPlotChart from '../components/BoxPlotChart.vue'

// 響應式數據
const boxPlotData = ref([])
const showModal = ref(false)
const modalTitle = ref('')
const modalData = ref({})
const showBoxplot = ref(false)
const showGridLines = ref(true)

// 計算屬性
const uniqueStations = computed(() => {
  return [...new Set(boxPlotData.value.map(d => d.station))].sort()
})

const uniqueGroups = computed(() => {
  return [...new Set(boxPlotData.value.map(d => d.station))].sort()
})

const uniqueStatuses = computed(() => {
  return [...new Set(boxPlotData.value.map(d => d.status))].sort()
})

const averageYield = computed(() => {
  if (boxPlotData.value.length === 0) return 0
  const sum = boxPlotData.value.reduce((acc, d) => acc + d.yield, 0)
  return sum / boxPlotData.value.length
})

const timeRangeText = computed(() => {
  if (boxPlotData.value.length === 0) return '無數據'
  const timestamps = boxPlotData.value.map(d => new Date(d.timestamp))
  const min = new Date(Math.min(...timestamps))
  const max = new Date(Math.max(...timestamps))
  const diffHours = Math.round((max - min) / (1000 * 60 * 60))
  return `${diffHours} 小時`
})

const displayData = computed(() => {
  return boxPlotData.value.slice(0, 100)
})

// 生成模擬數據
const generateNewData = () => {
  const stations = ['Core', 'AOI', 'OST', 'VI']
  const now = new Date()
  const data = []

  stations.forEach(station => {
    // 每個站點生成過去24小時的數據
    for (let hour = 0; hour < 24; hour++) {
      // 每小時生成多個數據點
      const pointsPerHour = Math.floor(Math.random() * 5) + 3 // 3-7個數據點
        
      for (let point = 0; point < pointsPerHour; point++) {
        const timestamp = new Date(now.getTime() - (23 - hour) * 60 * 60 * 1000 + point * (60 * 60 * 1000 / pointsPerHour))
          
        // 基礎良率，每個站點有不同的特性
        let baseYield
        switch (station) {
          case 'Core':
            baseYield = 92
            break
          case 'AOI':
            baseYield = 88
            break
          case 'OST':
            baseYield = 95
            break
          case 'VI':
            baseYield = 85
            break
          default:
            baseYield = 90
        }
          
        // 添加隨機變化
        let yield_value = baseYield + (Math.random() - 0.5) * 8
          
        // 偶爾添加異常值
        if (Math.random() < 0.05) { // 5% 機率產生異常值
          yield_value = Math.random() < 0.5 ? 
            baseYield - Math.random() * 20 : // 低異常值
            Math.min(100, baseYield + Math.random() * 15) // 高異常值
        }
          
        // 確保良率在合理範圍內
        yield_value = Math.max(0, Math.min(100, yield_value))
        
        // 根據良率決定狀態
        let status
        if (yield_value >= baseYield + 2) {
          status = 'MeetTarget'
        } else if (yield_value < baseYield - 3) {
          status = 'Trigger'
        } else {
          status = 'Normal'
        }
          
        data.push({
          station: station,
          yield: yield_value,
          timestamp: timestamp.toISOString(),
          status: status // 添加狀態字段
        })
      }
    }
  })

  boxPlotData.value = data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
}

// 匯出數據
const exportData = () => {
  const dataStr = JSON.stringify(boxPlotData.value, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `box_plot_data_${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 格式化時間
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 數據點點擊事件（散點圖點）
const onDataClick = (dataPoint) => {
  console.log('📊 Data point clicked:', dataPoint)
  modalTitle.value = '數據點詳情'
  modalData.value = {
    '站點': dataPoint.station,
    '良率': `${dataPoint.yield.toFixed(2)}%`,
    '時間': formatTime(dataPoint.timestamp),
    '狀態': dataPoint.status || 'N/A'
  }
  showModal.value = true
}

// 站點點擊事件
const onStationClick = (event) => {
  console.log('📊 Station clicked:', event)
  modalTitle.value = '站點詳細信息'
  modalData.value = {
    '站點': event.station,
    'Q1': `${event.data.q1.toFixed(2)}%`,
    '中位數': `${event.data.median.toFixed(2)}%`,
    'Q3': `${event.data.q3.toFixed(2)}%`,
    '最小值': `${event.data.min.toFixed(2)}%`,
    '最大值': `${event.data.max.toFixed(2)}%`,
    '異常值數量': event.data.outliers.length,
    '樣本數': event.data.count,
    '時間': formatTime(event.data.timestamp)
  }
  showModal.value = true
}

// 異常值點擊事件
const onOutlierClick = (event) => {
  console.log('📊 Outlier clicked:', event)
  modalTitle.value = '異常值詳情'
  modalData.value = {
    '站點': event.station,
    '異常值': `${event.value.toFixed(2)}%`,
    '時間': formatTime(event.data.timestamp),
    '樣本數': event.data.count,
    '中位數': `${event.data.median.toFixed(2)}%`
  }
  showModal.value = true
}

// 關閉對話框
const closeModal = () => {
  console.log('📊 Closing modal')
  showModal.value = false
  modalTitle.value = ''
  modalData.value = {}
}

// 組件掛載時生成初始數據
onMounted(() => {
  generateNewData()
})
</script>

<style scoped>
.transition-all {
  transition: all 0.3s ease;
}

/* 表格樣式優化 */
table {
  font-variant-numeric: tabular-nums;
}

/* 模態框動畫 */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
</style>
