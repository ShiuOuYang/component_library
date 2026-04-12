/**
 * D3 柏拉圖工具函數
 */

/**
 * 將原始數據轉換為柏拉圖格式數據
 * @param {Array} data - 原始數據陣列
 * @param {string} categoryKey - 用於分類的屬性名稱 (例如 'defect_type')
 * @param {string} [valueKey] - 可選：用於加總的數值屬性名稱 (例如 'count')。如果不提供，則計算出現次數。
 * @returns {Array<{name: string, count: number}>} 轉換後的柏拉圖數據
 */
export const transformToParetoData = (data, categoryKey, valueKey = null) => {
  if (!Array.isArray(data) || data.length === 0) {
    return []
  }

  const map = new Map()

  data.forEach(item => {
    const category = item[categoryKey]
    // 跳過無效的類別
    if (category === undefined || category === null || category === '') {
      return
    }

    const currentCount = map.get(category) || 0
    let addValue = 1

    if (valueKey) {
      // 如果指定了數值欄位，則累加該欄位的值
      const val = Number(item[valueKey])
      addValue = isNaN(val) ? 0 : val
    }

    map.set(category, currentCount + addValue)
  })

  // 轉換為陣列格式
  const result = Array.from(map.entries()).map(([name, count]) => ({
    name: String(name),
    count
  }))

  // 按數量降序排序
  return result.sort((a, b) => b.count - a.count)
}
