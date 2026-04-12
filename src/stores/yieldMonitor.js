import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useYieldMonitorStore = defineStore('yieldMonitor', () => {
  // ===== 響應式狀態 =====
  
  // 主要數據狀態
  const stations = ref([])
  const alerts = ref([])
  const systemStatus = ref('disconnected')
  const isConnected = ref(false)
  const connectionStatus = ref('初始化中...')
  
  // 顯示模式控制狀態
  const displayMode = ref('all')
  const currentCarouselIndex = ref(0)
  const carouselAutoPlay = ref(true)
  const availablePartNumbers = ref(['All'])
  
  // 警報篩選狀態
  const alertFilterValues = ref({
    partNumber: 'All',
    status: 'All'
  })
  
  // ===== 計算屬性 =====
  
  // 檢查是否有真實數據（WebSocket 數據）
  const hasWebSocketData = computed(() => {
    return stations.value.length > 0
  })
  
  // 顯示的站點數據（WebSocket 數據優先）
  const displayStations = computed(() => {
    return hasWebSocketData.value ? stations.value : []
  })

  // ===== Actions =====
  
  // 更新站點數據
  const updateStations = (newStations) => {
    stations.value = newStations
  }

  // 更新警報數據
  const updateAlerts = (newAlerts) => {
    console.log('🔄 更新警報數據，總數:123', newAlerts)
    alerts.value = newAlerts
  }

  // 添加單一警報
  const addAlert = (newAlert) => {
    if (!newAlert) {
      console.warn('⚠️ 嘗試添加空警報')
      return
    }

    const alertId = newAlert.alertId || newAlert.id
    
    if (!alertId) {
      console.warn('⚠️ 警報缺少 ID:', newAlert)
      return
    }

    // 檢查是否已存在相同的警報(去重邏輯)
    const existingIndex = alerts.value.findIndex(
      alert => (alert.alertId === alertId) || (alert.id === alertId)
    )
    
    if (existingIndex !== -1) {
      // 如果已存在，檢查是否需要更新
      const existingAlert = alerts.value[existingIndex]
      const existingTime = new Date(existingAlert.updatedAt || existingAlert.createdAt || 0)
      const newTime = new Date(newAlert.updatedAt || newAlert.createdAt || new Date())
      
      // 只有新警報更新時間較晚才更新
      if (newTime >= existingTime) {
        alerts.value[existingIndex] = {
          ...existingAlert,
          ...newAlert,
          updatedAt: new Date()
        }
        console.log('✅ 警報已更新:', alertId)
      } else {
        console.log('⏭️ 跳過舊警報:', alertId)
      }
    } else {
      // 如果不存在，添加新警報到開頭(最新的在前)
      alerts.value.unshift({
        ...newAlert,
        createdAt: newAlert.createdAt || new Date(),
        updatedAt: new Date()
      })
      console.log('✅ 新警報已添加:', alertId, {
        總數: alerts.value.length,
        站點: newAlert.stationName || newAlert.station,
        料號: newAlert.partNumber
      })
    }
  }

  // 移除警報
  const removeAlert = (alertId) => {
    const index = alerts.value.findIndex(
      alert => alert.id === alertId || alert.alertId === alertId
    )
    if (index !== -1) {
      alerts.value.splice(index, 1)
      console.log('✅ 警報已移除:', alertId)
    }
  }

  // 更新單一警報
  const updateAlert = (alertId, updatedData) => {
    const index = alerts.value.findIndex(
      alert => alert.id === alertId || alert.alertId === alertId
    )
    if (index !== -1) {
      alerts.value[index] = { 
        ...alerts.value[index], 
        ...updatedData,
        updatedAt: new Date()
      }
      console.log('✅ 警報已更新:', alertId)
    }
  }

  // 更新系統狀態
  const updateSystemStatus = (status) => {
    systemStatus.value = status
  }

  // 更新連接狀態
  const updateConnectionStatus = (connected, status) => {
    isConnected.value = connected
    connectionStatus.value = status
  }

  // ===== 輪播控制 Actions =====
  
  // 設置顯示模式
  const setDisplayMode = (mode) => {
    displayMode.value = mode
  }

  // 設置輪播索引
  const setCarouselIndex = (index) => {
    currentCarouselIndex.value = index
  }

  // 設置輪播自動播放
  const setCarouselAutoPlay = (autoPlay) => {
    carouselAutoPlay.value = autoPlay
  }

  return {
    // 狀態
    stations,
    alerts,
    systemStatus,
    isConnected,
    connectionStatus,
    displayMode,
    currentCarouselIndex,
    carouselAutoPlay,
    availablePartNumbers,
    alertFilterValues,
    
    // 計算屬性
    hasWebSocketData,
    displayStations,
    
    // Actions - 數據操作
    updateStations,
    updateAlerts,
    addAlert,
    removeAlert,
    updateAlert,
    updateSystemStatus,
    updateConnectionStatus,
    
    // Actions - 輪播控制
    setDisplayMode,
    setCarouselIndex,
    setCarouselAutoPlay
  }
})
