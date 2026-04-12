/**
 * SPC 數據處理工具
 * 將後端返回的 SPC 數據轉換為適合 D3 圖表的格式
 */

/**
 * 將 SPC mainData 轉換為堆疊條狀圖數據
 * @param {Array} mainData - 後端返回的 mainData
 * @returns {Object} 包含 chartData 和 metadata 的對象
 */
export function transformSpcMainDataToStackedBar(mainData) {
  if (!mainData || !Array.isArray(mainData)) {
    return { chartData: [], fileGroups: [], stages: [] }
  }

  const chartData = []
  const fileGroups = []
  const stages = new Set()

  // 遍歷每個 FileGroup
  mainData.forEach(groupObj => {
    const fileGroupName = Object.keys(groupObj)[0]
    const items = groupObj[fileGroupName]
    
    if (!items || !Array.isArray(items)) return

    fileGroups.push(fileGroupName)

    // 數據已經整理好，直接使用
    items.forEach(item => {

      
      // 直接加入 chartData
      chartData.push({
        ...item,
        FileGroup: fileGroupName
      })
    })
  })
  console.log("transformSpcMainDataToStackedBar chartData:", {
    length: chartData,
    fileGroups,
    stages: [...new Set(chartData.map(d => d.stage))].sort()
    })
  return {
    chartData,
    fileGroups,
    stages: [...new Set(chartData.map(d => d.stage))].sort()
  }
}

/**
 * 將 SPC mainData 轉換為普通條狀圖數據（按 Type 分組）
 * @param {Array} mainData - 後端返回的 mainData
 * @param {Object} filters - 篩選條件 { alarmType, type, fileGroup }
 * @returns {Array} 條狀圖數據
 */
export function transformSpcMainDataToBar(mainData, filters = {}) {
  if (!mainData || !Array.isArray(mainData)) {
    return []
  }

  const chartData = []

  mainData.forEach(groupObj => {
    const fileGroupName = Object.keys(groupObj)[0]
    const items = groupObj[fileGroupName]
    
    if (!items || !Array.isArray(items)) return

    items.forEach(item => {
      // 應用篩選
      if (filters.alarmType && item.AlarmType !== filters.alarmType) return
      if (filters.type && item.Type !== filters.type) return
      if (filters.fileGroup && fileGroupName !== filters.fileGroup) return

      chartData.push({
        xKey: `${fileGroupName}-${item.AlarmType}-${item.Type}`,
        xLabel: `${item.Type}`,
        xGroup: fileGroupName,
        value: item.count || 0,
        series: item.AlarmType,
        FileGroup: fileGroupName,
        AlarmType: item.AlarmType,
        Type: item.Type,
        checkpoint: item.checkpoint || `${item.AlarmType}-${item.Type}`
      })
    })
  })

  return chartData
}

/**
 * 按 FileGroup 分組計算 xCountArray
 * @param {Array} chartData - 圖表數據
 * @returns {Array} 每組的數量陣列
 */
export function calculateXCountArray(chartData) {
  if (!chartData || chartData.length === 0) return []

  const groups = {}
  
  chartData.forEach(item => {
    const group = item.xGroup || item.FileGroup
    if (!groups[group]) {
      groups[group] = 0
    }
    groups[group]++
  })

  return Object.values(groups)
}

/**
 * 獲取所有唯一的 FileGroup 列表
 * @param {Array} mainData - 後端返回的 mainData
 * @returns {Array} FileGroup 名稱陣列
 */
export function getFileGroups(mainData) {
  if (!mainData || !Array.isArray(mainData)) {
    return []
  }

  return mainData.map(groupObj => Object.keys(groupObj)[0])
}

/**
 * 按 FileGroup 和 AlarmType 聚合數據
 * @param {Array} mainData - 後端返回的 mainData
 * @returns {Array} 聚合後的數據
 */
export function aggregateByFileGroupAndAlarmType(mainData) {
  if (!mainData || !Array.isArray(mainData)) {
    return []
  }

  const chartData = []

  mainData.forEach(groupObj => {
    const fileGroupName = Object.keys(groupObj)[0]
    const items = groupObj[fileGroupName]
    
    if (!items || !Array.isArray(items)) return

    // 按 AlarmType 聚合
    const alarmTypeSums = {}
    
    items.forEach(item => {
      const alarmType = item.AlarmType
      if (!alarmTypeSums[alarmType]) {
        alarmTypeSums[alarmType] = {
          FileGroup: fileGroupName,
          AlarmType: alarmType,
          EQP: 0,
          PRD: 0,
          LAB: 0,
          CPV: 0,
          OTHER: 0,
          total: 0
        }
      }
      
      const type = item.Type
      const count = item.count || 0
      
      alarmTypeSums[alarmType][type] = (alarmTypeSums[alarmType][type] || 0) + count
      alarmTypeSums[alarmType].total += count
    })

    // 轉換為陣列格式
    Object.values(alarmTypeSums).forEach(data => {
      chartData.push({
        xKey: `${fileGroupName}-${data.AlarmType}`,
        xLabel: data.AlarmType,
        xGroup: fileGroupName,
        FileGroup: fileGroupName,
        AlarmType: data.AlarmType,
        ...data
      })
    })
  })

  return chartData
}

/**
 * 簡化版：將數據扁平化為簡單的條狀圖格式
 * @param {Array} mainData - 後端返回的 mainData
 * @returns {Array} 扁平化的數據
 */
export function flattenSpcData(mainData) {
  if (!mainData || !Array.isArray(mainData)) {
    return []
  }

  const result = []

  mainData.forEach(groupObj => {
    const fileGroupName = Object.keys(groupObj)[0]
    const items = groupObj[fileGroupName]
    
    if (!items || !Array.isArray(items)) return

    items.forEach(item => {
      result.push({
        FileGroup: fileGroupName,
        AlarmType: item.AlarmType,
        Type: item.Type,
        count: item.count || 0,
        checkpoint: item.checkpoint,
        stage: item.stage
      })
    })
  })

  return result
}
