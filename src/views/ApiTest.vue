<script setup>
import { ref, reactive } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import { useWipApi } from '../composables/useWipApi.js'
import { isMockEnabled } from '../api/mockData.js'

const wipApi = useWipApi()

// 測試狀態
const testResults = ref([])
const isRunningTests = ref(false)

// 表單數據
const testData = reactive({
  stationId: 'BU5',
  newValue: 8,
  filters: {
    customer: 'ALL',
    station: 'ALL'
  },
  timeRange: '24h'
})

// 添加測試結果
const addTestResult = (testName, status, data, error = null) => {
  testResults.value.unshift({
    id: Date.now(),
    testName,
    status, // 'success' | 'error' | 'loading'
    data,
    error,
    timestamp: new Date().toLocaleTimeString('zh-TW')
  })
}

// 測試 WIP 數據載入
const testLoadWipData = async () => {
  addTestResult('載入 WIP 數據', 'loading', null)
  try {
    const result = await wipApi.loadWipData(testData.filters)
    addTestResult('載入 WIP 數據', 'success', result)
  } catch (error) {
    addTestResult('載入 WIP 數據', 'error', null, error.message)
  }
}

// 測試趨勢數據載入
const testLoadTrendData = async () => {
  addTestResult('載入趨勢數據', 'loading', null)
  try {
    const result = await wipApi.loadTrendData(testData.timeRange)
    addTestResult('載入趨勢數據', 'success', result)
  } catch (error) {
    addTestResult('載入趨勢數據', 'error', null, error.message)
  }
}

// 測試系統狀態載入
const testLoadSystemStatus = async () => {
  addTestResult('載入系統狀態', 'loading', null)
  try {
    const result = await wipApi.loadSystemStatus()
    addTestResult('載入系統狀態', 'success', result)
  } catch (error) {
    addTestResult('載入系統狀態', 'error', null, error.message)
  }
}

// 測試更新站點數據
const testUpdateStation = async () => {
  addTestResult('更新站點數據', 'loading', null)
  try {
    const result = await wipApi.updateStationWip(testData.stationId, testData.newValue)
    addTestResult('更新站點數據', 'success', result)
  } catch (error) {
    addTestResult('更新站點數據', 'error', null, error.message)
  }
}

// 測試警報載入
const testLoadAlerts = async () => {
  addTestResult('載入警報數據', 'loading', null)
  try {
    const result = await wipApi.loadAlerts()
    addTestResult('載入警報數據', 'success', result)
  } catch (error) {
    addTestResult('載入警報數據', 'error', null, error.message)
  }
}

// 運行所有測試
const runAllTests = async () => {
  isRunningTests.value = true
  testResults.value = []
  
  try {
    await testLoadWipData()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await testLoadTrendData()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await testLoadSystemStatus()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await testLoadAlerts()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    await testUpdateStation()
  } finally {
    isRunningTests.value = false
  }
}

// 獲取狀態樣式
const getStatusStyle = (status) => {
  switch (status) {
    case 'success':
      return 'bg-green-50 border-green-200 text-green-800'
    case 'error':
      return 'bg-red-50 border-red-200 text-red-800'
    case 'loading':
      return 'bg-blue-50 border-blue-200 text-blue-800'
    default:
      return 'bg-gray-50 border-gray-200 text-gray-800'
  }
}

// 獲取狀態圖示
const getStatusIcon = (status) => {
  switch (status) {
    case 'success':
      return 'fas fa-check-circle text-green-500'
    case 'error':
      return 'fas fa-times-circle text-red-500'
    case 'loading':
      return 'fas fa-spinner fa-spin text-blue-500'
    default:
      return 'fas fa-question-circle text-gray-500'
  }
}
</script>

<template>
  <AppLayout>
    <!-- 標題區域 -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">API 測試中心</h1>
      <p class="text-gray-600">測試 WIP 管理系統的 API 功能</p>
        
        <!-- 狀態指示器 -->
        <div class="mt-4 flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <div :class="isMockEnabled() ? 'bg-blue-500' : 'bg-green-500'" class="w-3 h-3 rounded-full"></div>
            <span class="text-sm font-medium text-gray-700">
              {{ isMockEnabled() ? '模擬模式' : '實際 API' }}
            </span>
          </div>
          <div class="flex items-center space-x-2">
            <div :class="wipApi.isOnline ? 'bg-green-500' : 'bg-red-500'" class="w-3 h-3 rounded-full"></div>
            <span class="text-sm font-medium text-gray-700">
              {{ wipApi.isOnline ? '網路連線正常' : '網路連線中斷' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 控制按鈕 -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-800 mb-4">測試控制</h2>
        <div class="flex space-x-4">
          <button
            @click="runAllTests"
            :disabled="isRunningTests"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <i :class="isRunningTests ? 'fas fa-spinner fa-spin' : 'fas fa-play'"></i>
            <span>{{ isRunningTests ? '執行中...' : '執行 API 測試' }}</span>
          </button>
          
          <button
            @click="clearResults"
            :disabled="isRunningTests"
            class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <i class="fas fa-trash"></i>
            <span>清除結果</span>
          </button>
        </div>
      </div>

      <!-- API 狀態顯示 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">載入狀態</span>
            <i :class="wipApi.isLoading ? 'fas fa-spinner fa-spin text-blue-500' : 'fas fa-check text-green-500'"></i>
          </div>
          <p class="text-lg font-semibold text-gray-800 mt-1">
            {{ wipApi.isLoading ? '載入中' : '空閒' }}
          </p>
        </div>

        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">錯誤狀態</span>
            <i :class="wipApi.hasError ? 'fas fa-exclamation-triangle text-red-500' : 'fas fa-check text-green-500'"></i>
          </div>
          <p class="text-lg font-semibold text-gray-800 mt-1">
            {{ wipApi.hasError ? '有錯誤' : '正常' }}
          </p>
        </div>

        <div class="bg-white rounded-lg shadow p-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">網路狀態</span>
            <i :class="wipApi.isOnline ? 'fas fa-wifi text-green-500' : 'fas fa-wifi-slash text-red-500'"></i>
          </div>
          <p class="text-lg font-semibold text-gray-800 mt-1">
            {{ wipApi.isOnline ? '已連線' : '離線' }}
          </p>
        </div>
      </div>

      <!-- 測試結果 -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <!-- 左側：測試控制區域 -->
        <div class="space-y-6">
          <!-- 快速測試 -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">快速測試</h3>
            
            <div class="space-y-4">
              <button
                @click="runAllTests"
                :disabled="isRunningTests"
                class="w-full px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <i :class="isRunningTests ? 'fas fa-spinner fa-spin' : 'fas fa-play'"></i>
                <span>{{ isRunningTests ? '執行中...' : '運行所有測試' }}</span>
              </button>
              
              <button
                @click="clearResults"
                class="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
              >
                <i class="fas fa-trash mr-2"></i>
                清除結果
              </button>
            </div>
          </div>

          <!-- 個別測試 -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">個別測試</h3>
            
            <div class="grid grid-cols-2 gap-3">
              <button
                @click="testLoadWipData"
                class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm"
              >
                <i class="fas fa-chart-bar mr-1"></i>
                WIP 數據
              </button>
              
              <button
                @click="testLoadTrendData"
                class="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm"
              >
                <i class="fas fa-chart-line mr-1"></i>
                趨勢數據
              </button>
              
              <button
                @click="testLoadSystemStatus"
                class="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 text-sm"
              >
                <i class="fas fa-server mr-1"></i>
                系統狀態
              </button>
              
              <button
                @click="testLoadAlerts"
                class="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200 text-sm"
              >
                <i class="fas fa-bell mr-1"></i>
                警報數據
              </button>
            </div>
          </div>

          <!-- 測試參數 -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">測試參數</h3>
            
            <div class="space-y-4">
              <!-- 站點更新測試 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">更新站點測試</label>
                <div class="grid grid-cols-2 gap-3">
                  <select v-model="testData.stationId" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                    <option value="Core1">Core1</option>
                    <option value="BU1">BU1</option>
                    <option value="BU2">BU2</option>
                    <option value="BU5">BU5</option>
                    <option value="SMK">SMK</option>
                  </select>
                  <input v-model.number="testData.newValue" type="number" min="0" max="20" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="新數值">
                </div>
                <button
                  @click="testUpdateStation"
                  class="mt-2 w-full px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm"
                >
                  <i class="fas fa-edit mr-1"></i>
                  測試更新
                </button>
              </div>

              <!-- 時間範圍 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">趨勢時間範圍</label>
                <select v-model="testData.timeRange" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="24h">24小時</option>
                  <option value="7d">7天</option>
                  <option value="30d">30天</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- 右側：測試結果 -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-800">測試結果</h3>
            <span class="text-sm text-gray-500">共 {{ testResults.length }} 筆結果</span>
          </div>
          
          <div class="space-y-3 max-h-96 overflow-y-auto">
            <div v-if="testResults.length === 0" class="text-center py-8 text-gray-500">
              <i class="fas fa-flask text-3xl mb-3"></i>
              <p>尚無測試結果</p>
              <p class="text-sm">點擊上方按鈕開始測試</p>
            </div>
            
            <div
              v-for="result in testResults"
              :key="result.id"
              :class="getStatusStyle(result.status)"
              class="p-4 rounded-lg border"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-start space-x-3">
                  <i :class="getStatusIcon(result.status)" class="mt-0.5"></i>
                  <div>
                    <h4 class="font-medium">{{ result.testName }}</h4>
                    <p class="text-sm opacity-75">{{ result.timestamp }}</p>
                    
                    <!-- 成功數據 -->
                    <div v-if="result.status === 'success' && result.data" class="mt-2">
                      <details class="text-sm">
                        <summary class="cursor-pointer hover:underline">查看數據</summary>
                        <pre class="mt-2 p-2 bg-black bg-opacity-10 rounded text-xs overflow-x-auto">{{ JSON.stringify(result.data, null, 2) }}</pre>
                      </details>
                    </div>
                    
                    <!-- 錯誤信息 -->
                    <div v-if="result.status === 'error' && result.error" class="mt-2">
                      <p class="text-sm font-medium">錯誤：{{ result.error }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 當前數據狀態 -->
      <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 class="font-medium text-gray-800 mb-2">WIP 數據</h4>
          <p class="text-2xl font-bold text-blue-600">{{ wipApi.totalWip }}</p>
          <p class="text-sm text-gray-500">{{ wipApi.activeStations }} 個活躍站點</p>
        </div>
        
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 class="font-medium text-gray-800 mb-2">趨勢數據</h4>
          <p class="text-2xl font-bold text-green-600">{{ wipApi.trendData.length }}</p>
          <p class="text-sm text-gray-500">個時間點</p>
        </div>
        
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 class="font-medium text-gray-800 mb-2">警報數據</h4>
          <p class="text-2xl font-bold text-red-600">{{ wipApi.criticalAlerts.length }}</p>
          <p class="text-sm text-gray-500">個重要警報</p>        </div>
      </div>
    </AppLayout>
</template>

<style scoped>
/* 自定義滾動條 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
