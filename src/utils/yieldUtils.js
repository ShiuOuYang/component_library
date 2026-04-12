/**
 * Yield Monitor 相關的工具函數
 */

// ===== 站點判斷 =====

/**
 * 判斷是否為 AOI 站點（Core/BU）
 * @param {string} station - 站點名稱
 * @returns {boolean}
 */
export const isAoiStation = (station) => {
  return station === 'Core' || station === 'BU'
}

/**
 * 判斷是否為 OST 站點
 * @param {string} station - 站點名稱
 * @returns {boolean}
 */
export const isOstStation = (station) => {
  return station === 'OST'
}

/**
 * 判斷是否為 BDT 站點
 * @param {string} station - 站點名稱
 * @returns {boolean}
 */
export const isBdtStation = (station) => {
  return station === 'BDT'
}

/**
 * 判斷是否為 FLI 站點
 * @param {string} station - 站點名稱
 * @returns {boolean}
 */
export const isFliStation = (station) => {
  return station === 'FLI'
}

/**
 * 判斷是否為 CC 站點
 * @param {string} station - 站點名稱
 * @returns {boolean}
 */
export const isCcStation = (station) => {
  return station === 'CC'
}

/**
 * 判斷是否為 WPG 站點
 * @param {string} station - 站點名稱
 * @returns {boolean}
 */
export const isWpgStation = (station) => {
  return station === 'WPG' || station === 'Wpg'
}

/**
 * 判斷是否為 VI 站點
 * @param {string} station - 站點名稱
 * @returns {boolean}
 */
export const isViStation = (station) => {
  return station === 'VI' || station === 'Vi'
}

/**
 * 判斷是否為 Bump 站點
 * @param {string} station - 站點名稱
 * @returns {boolean}
 */
export const isBumpStation = (station) => {
  return station === 'Bump' || station === 'BUMP'
}

// ===== 站點常量 =====

/**
 * AOI 站點列表
 */
export const AOI_STATIONS = ['Core', 'BU']

/**
 * 所有支援的站點列表
 */
export const ALL_STATIONS = ['Core', 'BU', 'OST', 'BDT', 'FLI', 'Bump', 'CC', 'WPG', 'VI']

// ===== 良率相關 =====

/**
 * 格式化良率值
 * @param {number|string} yieldValue - 良率值
 * @returns {string} 格式化後的良率字串
 */
export const formatYield = (yieldValue) => {
  if (yieldValue === undefined || yieldValue === null) return 'N/A'
  
  const value = typeof yieldValue === 'number' 
    ? (yieldValue < 1 ? yieldValue * 100 : yieldValue)
    : parseFloat(yieldValue) || 0
  
  return `${value.toFixed(1)}%`
}

/**
 * 根據良率值返回對應的顏色類別
 * @param {number|string} yieldValue - 良率值
 * @returns {string} Tailwind CSS 顏色類別
 */
export const getYieldColorClass = (yieldValue) => {
  if (yieldValue === undefined || yieldValue === null) return 'text-gray-300'
  
  const value = typeof yieldValue === 'number' 
    ? (yieldValue < 1 ? yieldValue * 100 : yieldValue)
    : parseFloat(yieldValue) || 0
  
  if (value >= 95) return 'text-green-300'
  if (value >= 85) return 'text-yellow-300'
  return 'text-red-300'
}

/**
 * 根據良率值返回狀態
 * @param {number|string} yieldValue - 良率值
 * @param {number|string} targetValue - 目標值
 * @returns {string} 狀態: 'normal', 'warning', 'error'
 */
export const getYieldStatus = (yieldValue, targetValue) => {
  if (!yieldValue || !targetValue) return 'normal'
  
  const yieldNum = typeof yieldValue === 'number' ? yieldValue : parseFloat(yieldValue)
  const targetNum = typeof targetValue === 'number' ? targetValue : parseFloat(targetValue)
  
  if (yieldNum < targetNum * 0.95) return 'error'
  if (yieldNum < targetNum) return 'warning'
  return 'normal'
}
