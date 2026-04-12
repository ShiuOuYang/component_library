const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const app = express()
const PORT = 3000

// 中間件
app.use(cors())
app.use(express.json())
app.use(morgan('combined'))

// 模擬數據
let wipData = [
  { station: 'Core1', value: 0 },
  { station: 'BU1', value: 2 },
  { station: 'BU2', value: 1 },
  { station: 'BU3', value: 3 },
  { station: 'BU4', value: 2 },
  { station: 'BU5', value: 5 },
  { station: 'BU6', value: 4 },
  { station: 'BU7', value: 5 },
  { station: 'SMK', value: 3 },
  { station: 'BE', value: 1 }
]

let systemStatus = {
  status: 'normal',
  activeConnections: 8,
  systemLoad: 23,
  lastUpdate: new Date().toISOString()
}

let alerts = [
  {
    id: 1,
    station: 'BU5',
    threshold: 4,
    type: 'warning',
    message: 'BU5 站點 WIP 過高',
    status: 'active',
    timestamp: new Date().toISOString()
  }
]

// API 路由

// WIP 相關路由
app.get('/api/wip/data', (req, res) => {
  const { customer, device, lotType } = req.query
  
  // 模擬濾鏡邏輯
  let filteredData = [...wipData]
  
  // 模擬延遲
  setTimeout(() => {
    res.json({
      success: true,
      stations: filteredData,
      timestamp: new Date().toISOString(),
      filters: { customer, device, lotType }
    })
  }, Math.random() * 1000 + 500) // 500-1500ms 隨機延遲
})

app.get('/api/wip/trend', (req, res) => {
  const { range = '24h' } = req.query
  
  // 生成模擬趨勢數據
  const trendData = []
  for (let i = 0; i < 24; i++) {
    const hour = String(i).padStart(2, '0')
    trendData.push({
      time: `${hour}:00`,
      total: Math.floor(Math.random() * 30) + 10
    })
  }
  
  setTimeout(() => {
    res.json({
      success: true,
      trend: trendData,
      range,
      timestamp: new Date().toISOString()
    })
  }, Math.random() * 800 + 200)
})

app.put('/api/wip/station/:stationId', (req, res) => {
  const { stationId } = req.params
  const { value } = req.body
  
  const station = wipData.find(item => item.station === stationId)
  if (station) {
    station.value = value
    
    setTimeout(() => {
      res.json({
        success: true,
        station: station,
        message: `站點 ${stationId} 更新成功`,
        timestamp: new Date().toISOString()
      })
    }, Math.random() * 500 + 200)
  } else {
    res.status(404).json({
      success: false,
      message: `站點 ${stationId} 不存在`
    })
  }
})

app.post('/api/wip/batch-update', (req, res) => {
  const { updates } = req.body
  
  updates.forEach(update => {
    const station = wipData.find(item => item.station === update.stationId)
    if (station) {
      station.value = update.value
    }
  })
  
  setTimeout(() => {
    res.json({
      success: true,
      message: '批量更新成功',
      updatedStations: updates.length,
      timestamp: new Date().toISOString()
    })
  }, Math.random() * 1000 + 500)
})

// 系統狀態路由
app.get('/api/system/status', (req, res) => {
  // 隨機更新系統狀態
  systemStatus.systemLoad = Math.floor(Math.random() * 100)
  systemStatus.activeConnections = Math.floor(Math.random() * 20) + 5
  systemStatus.lastUpdate = new Date().toISOString()
  
  setTimeout(() => {
    res.json({
      success: true,
      ...systemStatus
    })
  }, Math.random() * 300 + 100)
})

app.get('/api/system/health', (req, res) => {
  const health = systemStatus.systemLoad < 80 ? 'healthy' : 'warning'
  
  res.json({
    success: true,
    health,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  })
})

app.get('/api/system/load', (req, res) => {
  res.json({
    success: true,
    load: systemStatus.systemLoad,
    timestamp: new Date().toISOString()
  })
})

// 警報相關路由
app.get('/api/alerts', (req, res) => {
  const { status = 'active' } = req.query
  
  const filteredAlerts = alerts.filter(alert => 
    status === 'all' || alert.status === status
  )
  
  setTimeout(() => {
    res.json({
      success: true,
      alerts: filteredAlerts,
      count: filteredAlerts.length,
      timestamp: new Date().toISOString()
    })
  }, Math.random() * 400 + 100)
})

app.post('/api/alerts', (req, res) => {
  const alertData = req.body
  const newAlert = {
    id: alerts.length + 1,
    ...alertData,
    status: 'active',
    timestamp: new Date().toISOString()
  }
  
  alerts.push(newAlert)
  
  res.status(201).json({
    success: true,
    alert: newAlert,
    message: '警報創建成功'
  })
})

app.patch('/api/alerts/:alertId/acknowledge', (req, res) => {
  const { alertId } = req.params
  const alert = alerts.find(a => a.id === parseInt(alertId))
  
  if (alert) {
    alert.status = 'acknowledged'
    res.json({
      success: true,
      alert,
      message: '警報已確認'
    })
  } else {
    res.status(404).json({
      success: false,
      message: '警報不存在'
    })
  }
})

app.delete('/api/alerts/:alertId', (req, res) => {
  const { alertId } = req.params
  const alertIndex = alerts.findIndex(a => a.id === parseInt(alertId))
  
  if (alertIndex !== -1) {
    alerts.splice(alertIndex, 1)
    res.json({
      success: true,
      message: '警報已刪除'
    })
  } else {
    res.status(404).json({
      success: false,
      message: '警報不存在'
    })
  }
})

// OST 相關路由
app.get('/api/ost/daily', (req, res) => {
  const { st, et } = req.query
  
  // 模擬 OST 表格數據
  const tableData = [
    {
      partno: 'PN001',
      lotno: 'LOT001',
      lot_type: 'Production',
      Yield: 0.92,
      target: 0.95,
      Triger: 0.90,
      ProdClass: 'Client',
      Bin7: 1.2,
      Bin8: 2.3,
      Bin10: 0.8,
      Bin21: 1.5,
      Bin22: 0.9,
      Bin23: 1.1,
      LtL: 0.7,
      AOI: 1.4,
      Bin32: 0.6,
      Bin33: 0.8,
      Bin91: 0.3,
      Bin92: 0.4,
      Bin99: 0.2
    },
    {
      partno: 'PN002',
      lotno: 'LOT002',
      lot_type: 'Engineering',
      Yield: 0.88,
      target: 0.95,
      Triger: 0.90,
      ProdClass: 'Server',
      Bin7: 2.1,
      Bin8: 3.2,
      Bin10: 1.5,
      Bin21: 2.3,
      Bin22: 1.8,
      Bin23: 1.9,
      LtL: 1.2,
      AOI: 2.1,
      Bin32: 1.1,
      Bin33: 1.3,
      Bin91: 0.8,
      Bin92: 0.9,
      Bin99: 0.5
    }
  ]
  
  const deviceData = [
    { ProdClass: 'Client', count: 15 },
    { ProdClass: 'Server', count: 8 }
  ]
  
  const trendData = [
    { date: '2024-01-01', yield: 0.92 },
    { date: '2024-01-02', yield: 0.94 },
    { date: '2024-01-03', yield: 0.91 }
  ]
  
  res.json({
    success: true,
    tableData,
    deviceData,
    trendData,
    params: { st, et }
  })
})

app.get('/api/ost/rawdata/:type/:lot/:part', (req, res) => {
  const { type, lot, part } = req.params
  
  // 模擬 OST Mapping 原始數據
  const rawData = [
    {
      Panel_X: 1,
      Panel_Y: 1,
      BoardNo: 1,
      NgBin: type,
      Count: 5,
      DefectRate: 0.025,
      VrsCode: 'VRS001'
    },
    {
      Panel_X: 2,
      Panel_Y: 1,
      BoardNo: 1,
      NgBin: type,
      Count: 3,
      DefectRate: 0.015,
      VrsCode: 'VRS001'
    },
    {
      Panel_X: 1,
      Panel_Y: 2,
      BoardNo: 1,
      NgBin: type,
      Count: 8,
      DefectRate: 0.040,
      VrsCode: 'VRS001'
    },
    {
      Panel_X: 2,
      Panel_Y: 2,
      BoardNo: 1,
      NgBin: type,
      Count: 2,
      DefectRate: 0.010,
      VrsCode: 'VRS001'
    },
    {
      Panel_X: 1,
      Panel_Y: 1,
      BoardNo: 2,
      NgBin: type,
      Count: 7,
      DefectRate: 0.035,
      VrsCode: 'VRS002'
    },
    {
      Panel_X: 2,
      Panel_Y: 1,
      BoardNo: 2,
      NgBin: type,
      Count: 4,
      DefectRate: 0.020,
      VrsCode: 'VRS002'
    }
  ]
  
  res.json({
    success: true,
    chartData: rawData,  // API 服務期望的欄位名稱
    rawData,
    layoutData: [],
    params: { type, lot, part }
  })
})

// 用戶相關路由
app.get('/api/user/profile', (req, res) => {
  const user = {
    id: 'A4378',
    name: '歐陽結',
    department: '生產管理部',
    email: 'ouyang.jie@company.com',
    role: 'supervisor',
    lastLogin: new Date().toISOString()
  }
  
  res.json({
    success: true,
    user
  })
})

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    success: false,
    message: '內部伺服器錯誤',
    error: process.env.NODE_ENV === 'development' ? err.message : '發生未知錯誤'
  })
})

// 404 處理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API 端點 ${req.originalUrl} 不存在`
  })
})

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 Mock API 伺服器運行在 http://localhost:${PORT}`)
  console.log(`📊 WIP 數據端點: http://localhost:${PORT}/api/wip/data`)
  console.log(`📈 趨勢數據端點: http://localhost:${PORT}/api/wip/trend`)
  console.log(`⚡ 系統狀態端點: http://localhost:${PORT}/api/system/status`)
  console.log(`🚨 警報端點: http://localhost:${PORT}/api/alerts`)
  console.log(`🔍 OST 數據端點: http://localhost:${PORT}/api/ost/daily`)
  console.log(`🗺️ OST Mapping 端點: http://localhost:${PORT}/api/ost/rawdata/:type/:lot/:part`)
  console.log(`👤 用戶資料端點: http://localhost:${PORT}/api/user/profile`)
})
