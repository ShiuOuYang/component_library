/**
 * NCN Dashboard 數據處理工具函數
 * 重構目標：清晰的數據結構、可維護的處理邏輯、易於測試
 */

// ========================
// 常量定義
// ========================

/** 排除的欄位（不是問題類型） */
export const EXCLUDED_FIELDS = [
  'Month', 'Week', 'Day', 'time', 'date', 'Time',
  'total', 'lot_type', 'Scrap_level', 'ncn_level', 
  'hvm_npi', 'NCN_RATE'
]

/** NCN 級別 */
export const NCN_LEVELS = ['A', 'B', 'C']

/** 時間類型 */
export const TIME_TYPES = {
  MONTH: 'Month',
  WEEK: 'Week',
  DAY: 'Day'
}

/** Rate Data 索引範圍 */
export const RATE_DATA_RANGES = {
  MONTH: { start: 0, end: 6 },
  WEEK: { start: 6, end: 12 },
  DAY: { start: 12, end: 18 }
}

// ========================
// 問題類型提取
// ========================

/**
 * 從數據行中提取所有問題類型欄位
 * @param {Array} rows - 原始數據行
 * @returns {Array<string>} - 排序後的問題類型陣列
 */
export function extractProblemTypes(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return []
  }

  const problemTypes = new Set()

  rows.forEach(row => {
    Object.keys(row).forEach(key => {
      const cleanKey = key.trim()
      
      // 篩選條件：不在排除清單、值是數字、不是 NaN
      if (
        !EXCLUDED_FIELDS.includes(cleanKey) &&
        typeof row[key] === 'number' &&
        !isNaN(row[key])
      ) {
        problemTypes.add(cleanKey)
      }
    })
  })

  return Array.from(problemTypes).sort()
}

// ========================
// 時間範圍生成
// ========================

/**
 * 計算週數
 * @param {Date} date
 * @returns {number}
 */
function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

/**
 * 生成時間範圍
 * @param {string} timeType - 'Month', 'Week', 'Day'
 * @param {number} count - 時間點數量
 * @returns {Array<string>} - 時間標籤陣列
 */
export function generateTimeRange(timeType, count = 6) {
  const now = new Date()
  const timeRange = []

  switch (timeType) {
    case TIME_TYPES.MONTH:
      for (let i = count - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const year = String(date.getFullYear()).slice(-2)
        const month = String(date.getMonth() + 1).padStart(2, '0')
        timeRange.push(`${year}/${month}`)
      }
      break

    case TIME_TYPES.WEEK: {
      const currentWeek = getWeekNumber(now)
      for (let i = count - 1; i >= 0; i--) {
        timeRange.push(`W${currentWeek - i}`)
      }
      break
    }

    case TIME_TYPES.DAY:
      for (let i = count - 1; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        timeRange.push(`${month}/${day}`)
      }
      break

    default:
      console.warn(`未知的時間類型: ${timeType}`)
  }

  return timeRange
}

// ========================
// Rate Data 處理
// ========================

/**
 * 建立 Rate Map（時間 → COUNT）
 * @param {Array} rateData - 原始 rateData
 * @param {string} timeType - 時間類型
 * @returns {Map<string, number>} - 時間 → COUNT 的映射
 */
export function buildRateMap(rateData, timeType) {
  const rateMap = new Map()
  
  if (!Array.isArray(rateData)) {
    return rateMap
  }

  const range = RATE_DATA_RANGES[timeType.toUpperCase()]
  if (!range) {
    console.warn(`未知的時間類型: ${timeType}`)
    return rateMap
  }

  rateData.slice(range.start, range.end).forEach(item => {
    if (item?.time) {
      rateMap.set(item.time, item.COUNT || 0)
    }
  })

  return rateMap
}

// ========================
// 數據聚合與異常率計算
// ========================

/**
 * 初始化數據點
 * @param {string} timeValue
 * @param {Array<string>} problemTypes
 * @returns {Object}
 */
function initDataPoint(timeValue, problemTypes) {
  const dataPoint = { Time: timeValue }
  problemTypes.forEach(type => {
    dataPoint[type] = 0
  })
  return dataPoint
}

/**
 * 計算總缺陷數
 * @param {Object} dataPoint
 * @param {Array<string>} problemTypes
 * @returns {number}
 */
function calculateTotalDefects(dataPoint, problemTypes) {
  return problemTypes.reduce((sum, type) => sum + (dataPoint[type] || 0), 0)
}

/**
 * 聚合數據並計算異常率
 * @param {Array} rows - 原始數據行
 * @param {string} timeField - 時間欄位 ('Month', 'Week', 'Day')
 * @param {Array<string>} problemTypes - 問題類型列表
 * @param {Map} rateMap - 時間 → COUNT 映射
 * @returns {Array<Object>} - 聚合後的數據
 */
export function aggregateDataByTime(rows, timeField, problemTypes, rateMap) {
  // 生成完整時間範圍
  const fullTimeRange = generateTimeRange(timeField, 6)

  // 如果沒有數據，返回空數據結構
  if (!Array.isArray(rows) || rows.length === 0) {
    return fullTimeRange.map(timeValue => {
      const dataPoint = initDataPoint(timeValue, problemTypes)
      dataPoint.NCN_RATE = 0
      return dataPoint
    })
  }

  // Step 1: 依時間分組並累加
  const timeMap = new Map()

  rows.forEach(row => {
    const timeValue = row[timeField]
    if (!timeValue) return

    // 初始化時間數據點
    if (!timeMap.has(timeValue)) {
      timeMap.set(timeValue, initDataPoint(timeValue, problemTypes))
    }

    const timeData = timeMap.get(timeValue)

    // 累加問題數量（排除元數據欄位）
    Object.keys(row).forEach(key => {
      if (!EXCLUDED_FIELDS.includes(key) && typeof row[key] === 'number') {
        timeData[key] = (timeData[key] || 0) + row[key]
      }
    })
  })

  // Step 2: 生成完整時間範圍並計算異常率
  return fullTimeRange.map(timeValue => {
    const dataPoint = timeMap.get(timeValue) || initDataPoint(timeValue, problemTypes)
    
    // 計算異常率
    const count = rateMap.get(timeValue) || 0
    if (count > 0) {
      const totalDefects = calculateTotalDefects(dataPoint, problemTypes)
      dataPoint.NCN_RATE = totalDefects / count
    } else {
      dataPoint.NCN_RATE = 0
    }

    return dataPoint
  })
}

// ========================
// 數據過濾
// ========================

/**
 * 依照 Scrap_level 和 hvm_npi 過濾數據
 * @param {Array} rows - 原始數據
 * @param {Object} filters - 過濾條件
 * @param {string|null} filters.scrapLevel - Scrap 級別
 * @param {string|null} filters.hvmNpi - HVM/NPI 類型
 * @returns {Array} - 過濾後的數據
 */
export function filterData(rows, filters = {}) {
  if (!Array.isArray(rows)) {
    return []
  }

  return rows.filter(row => {
    // Scrap Level 過濾
    if (filters.scrapLevel && row.Scrap_level !== filters.scrapLevel) {
      return false
    }

    // HVM/NPI 過濾
    if (filters.hvmNpi && row.hvm_npi !== filters.hvmNpi) {
      return false
    }

    return true
  })
}

// ========================
// 完整數據處理流程
// ========================

/**
 * 處理單一級別的所有時間維度數據
 * @param {Array} levelData - 該級別的原始數據
 * @param {Array<string>} problemTypes - 問題類型列表
 * @param {Array} rateData - Rate 數據
 * @returns {Array<Array>} - [monthData, weekData, dayData]
 */
export function processLevelData(levelData, problemTypes, rateData) {
  const monthRateMap = buildRateMap(rateData, TIME_TYPES.MONTH)
  const weekRateMap = buildRateMap(rateData, TIME_TYPES.WEEK)
  const dayRateMap = buildRateMap(rateData, TIME_TYPES.DAY)

  return [
    aggregateDataByTime(levelData, TIME_TYPES.MONTH, problemTypes, monthRateMap),
    aggregateDataByTime(levelData, TIME_TYPES.WEEK, problemTypes, weekRateMap),
    aggregateDataByTime(levelData, TIME_TYPES.DAY, problemTypes, dayRateMap)
  ]
}

/**
 * 處理完整的 NCN 數據（所有級別、所有時間維度）
 * @param {Array} mainData - 原始主數據
 * @param {Array} rateData - Rate 數據
 * @param {Object} filters - 過濾條件
 * @returns {Object} - { chartData, problemTypes }
 */
export function processNcnData(mainData, rateData, filters = {}) {
  if (!Array.isArray(mainData)) {
    console.warn('mainData 不是陣列:', mainData)
    return { chartData: Array(9).fill([]), problemTypes: [] }
  }

  // Step 1: 提取問題類型
  const allRows = mainData
  const problemTypes = extractProblemTypes(allRows)

  // Step 2: 處理每個級別
  const chartData = []

  NCN_LEVELS.forEach(level => {
    // 過濾該級別的數據
    let levelData = mainData.filter(row => row.ncn_level === level)
    
    // 應用篩選條件
    levelData = filterData(levelData, filters)

    // 處理三個時間維度
    const [monthData, weekData, dayData] = processLevelData(
      levelData,
      problemTypes,
      rateData
    )

    chartData.push(monthData, weekData, dayData)
  })

  // 確保有 9 個圖表
  while (chartData.length < 9) {
    chartData.push([])
  }

  return { chartData, problemTypes }
}
