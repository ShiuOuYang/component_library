// 模擬數據管理器
class MockDataManager {
  constructor() {
    this.isEnabled = import.meta.env.VITE_ENABLE_MOCK_DATA !== 'false'
    this.mockDelay = 500 // 模擬網路延遲
    
    // 初始化模擬數據
    this.initMockData()
  }
  
  initMockData() {
    // WIP 站點數據
    this.wipStations = [
      { station: 'Core1', value: 0, lastUpdate: new Date() },
      { station: 'BU1', value: 0, lastUpdate: new Date() },
      { station: 'BU2', value: 0, lastUpdate: new Date() },
      { station: 'BU3', value: 0, lastUpdate: new Date() },
      { station: 'BU4', value: 2, lastUpdate: new Date() },
      { station: 'BU5', value: 5, lastUpdate: new Date() },
      { station: 'BU6', value: 4, lastUpdate: new Date() },
      { station: 'BU7', value: 5, lastUpdate: new Date() },
      { station: 'SMK', value: 3, lastUpdate: new Date() },
      { station: 'BE', value: 1, lastUpdate: new Date() }
    ]
    
    // 趨勢數據
    this.trendData = this.generateTrendData()
    
    // 系統狀態
    this.systemStatus = {
      status: 'normal',
      systemLoad: 23,
      activeConnections: 8,
      uptime: '2天 14小時 32分鐘',
      memoryUsage: 65,
      cpuUsage: 23,
      lastUpdate: new Date().toISOString()
    }
    
    // 警報數據
    this.alerts = [
      {
        id: 'alert_001',
        type: 'warning',
        station: 'BU5',
        message: 'BU5 站點 WIP 數量過高',
        threshold: 4,
        currentValue: 5,
        status: 'active',
        timestamp: new Date().toISOString()
      },
      {
        id: 'alert_002',
        type: 'info',
        station: 'SMK',
        message: 'SMK 站點需要關注',
        threshold: 2,
        currentValue: 3,
        status: 'active',
        timestamp: new Date().toISOString()
      }
    ]
    
    // 用戶數據
    this.currentUser = {
      id: 'A4378',
      name: '歐陽結',
      department: '生產管理部',
      role: 'manager',
      status: 'online',
      lastLogin: new Date().toISOString()
    }
  }
  
  // 生成趨勢數據
  generateTrendData() {
    const data = []
    const baseTime = new Date()
    baseTime.setHours(8, 0, 0, 0) // 從早上8點開始
    
    for (let i = 0; i < 8; i++) {
      const time = new Date(baseTime)
      time.setHours(time.getHours() + i)
      
      data.push({
        time: time.toTimeString().slice(0, 5),
        total: Math.floor(Math.random() * 10) + 15,
        timestamp: time.toISOString()
      })
    }
    
    return data
  }
  
  // 模擬網路延遲
  async delay() {
    if (this.isEnabled) {
      await new Promise(resolve => setTimeout(resolve, this.mockDelay))
    }
  }
  
  // 模擬隨機錯誤（10%機率）
  simulateError() {
    if (this.isEnabled && Math.random() < 0.1) {
      throw new Error('模擬網路錯誤')
    }
  }
  
  // 獲取 WIP 數據
  async getWipData(filters = {}) {
    await this.delay()
    this.simulateError()
    
    let filteredData = [...this.wipStations]
    
    // 應用篩選器（如果有的話）
    if (filters.station && filters.station !== 'ALL') {
      filteredData = filteredData.filter(item => 
        item.station.toLowerCase().includes(filters.station.toLowerCase())
      )
    }
    
    // 模擬數據變化
    this.updateWipValues()
    
    return {
      success: true,
      data: {
        stations: filteredData,
        totalCount: filteredData.length,
        lastUpdate: new Date().toISOString(),
        filters: filters
      }
    }
  }
  
  // 獲取趨勢數據
  async getWipTrend(timeRange = '24h') {
    await this.delay()
    this.simulateError()
    
    // 根據時間範圍生成不同的數據
    let data = [...this.trendData]
    if (timeRange === '7d') {
      data = this.generateWeeklyTrendData()
    } else if (timeRange === '30d') {
      data = this.generateMonthlyTrendData()
    }
    
    return {
      success: true,
      data: {
        trend: data,
        timeRange: timeRange,
        generatedAt: new Date().toISOString()
      }
    }
  }
  
  // 獲取系統狀態
  async getSystemStatus() {
    await this.delay()
    this.simulateError()
    
    // 模擬系統狀態變化
    this.systemStatus.systemLoad = Math.floor(Math.random() * 40) + 10
    this.systemStatus.activeConnections = Math.floor(Math.random() * 15) + 5
    this.systemStatus.memoryUsage = Math.floor(Math.random() * 30) + 50
    this.systemStatus.cpuUsage = Math.floor(Math.random() * 40) + 10
    this.systemStatus.lastUpdate = new Date().toISOString()
    
    return {
      success: true,
      data: this.systemStatus
    }
  }
  
  // 更新 WIP 數據
  async updateWipData(stationId, value) {
    await this.delay()
    this.simulateError()
    
    const station = this.wipStations.find(s => s.station === stationId)
    if (!station) {
      throw new Error(`找不到站點: ${stationId}`)
    }
    
    station.value = value
    station.lastUpdate = new Date()
    
    return {
      success: true,
      data: {
        station: stationId,
        newValue: value,
        updatedAt: new Date().toISOString()
      }
    }
  }
  
  // 獲取警報
  async getAlerts(status = 'active') {
    await this.delay()
    this.simulateError()
    
    let filteredAlerts = [...this.alerts]
    if (status !== 'all') {
      filteredAlerts = filteredAlerts.filter(alert => alert.status === status)
    }
    
    return {
      success: true,
      data: {
        alerts: filteredAlerts,
        totalCount: filteredAlerts.length,
        status: status
      }
    }
  }
  
  // 確認警報
  async acknowledgeAlert(alertId) {
    await this.delay()
    this.simulateError()
    
    const alert = this.alerts.find(a => a.id === alertId)
    if (!alert) {
      throw new Error(`找不到警報: ${alertId}`)
    }
    
    alert.status = 'acknowledged'
    alert.acknowledgedAt = new Date().toISOString()
    
    return {
      success: true,
      data: alert
    }
  }
  
  // 關閉警報
  async dismissAlert(alertId) {
    await this.delay()
    this.simulateError()
    
    const alertIndex = this.alerts.findIndex(a => a.id === alertId)
    if (alertIndex === -1) {
      throw new Error(`找不到警報: ${alertId}`)
    }
    
    this.alerts.splice(alertIndex, 1)
    
    return {
      success: true,
      data: { deletedAlertId: alertId }
    }
  }
  
  // 獲取用戶資訊
  async getCurrentUser() {
    await this.delay()
    this.simulateError()
    
    return {
      success: true,
      data: this.currentUser
    }
  }
  
  // 內部方法：更新 WIP 值（模擬變化）
  updateWipValues() {
    this.wipStations.forEach(station => {
      // 有20%機率數值變化
      if (Math.random() < 0.2) {
        const change = Math.floor(Math.random() * 3) - 1 // -1, 0, 1
        station.value = Math.max(0, station.value + change)
        station.lastUpdate = new Date()
      }
    })
  }
  
  // 生成週趨勢數據
  generateWeeklyTrendData() {
    const data = []
    const today = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      data.push({
        time: date.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }),
        total: Math.floor(Math.random() * 15) + 15,
        timestamp: date.toISOString()
      })
    }
    
    return data
  }
  
  // 生成月趨勢數據
  generateMonthlyTrendData() {
    const data = []
    const today = new Date()
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      data.push({
        time: date.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }),
        total: Math.floor(Math.random() * 20) + 10,
        timestamp: date.toISOString()
      })
    }
    
    return data
  }
}

// 創建單例實例
export const mockDataManager = new MockDataManager()

// 檢查是否啟用模擬數據
export const isMockEnabled = () => {
  return import.meta.env.VITE_ENABLE_MOCK_DATA !== 'false'
}
