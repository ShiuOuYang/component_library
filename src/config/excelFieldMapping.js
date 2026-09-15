/**
 * Excel 欄位映射配置 - 橫向表格格式
 * 格式: 料號 | 1FB | 2FB | 3FB | BUMP | OST | ...
 */

// 支援的料號欄位名稱
export const PART_NUMBER_FIELDS = [
  'part_number',
  'Part Number',
  'Part_Number',
  'PartNumber',
  'PartNo',
  'Part No',
  'Part Num',
  '料號',
  '料号'
]

// 支援的站點欄位名稱對應
export const LAYER_FIELD_MAPPING = {
  '1FB': ['1FB', 'FB1', '1st FB'],
  '2FB': ['2FB', 'FB2', '2nd FB'],
  '3FB': ['3FB', 'FB3', '3rd FB'],
  '4FB': ['4FB', 'FB4', '4th FB'],
  '5FB': ['5FB', 'FB5', '5th FB'],
  '6FB': ['6FB', 'FB6', '6th FB'],
  '7FB': ['7FB', 'FB7', '7th FB'],
  '8FB': ['8FB', 'FB8', '8th FB'],
  '9FB': ['9FB', 'FB9', '9th FB'],
  '10FB': ['10FB', 'FB10', '10th FB'],
  '11FB': ['11FB', 'FB11', '11th FB'],
  '12FB': ['12FB', 'FB12', '12th FB'],
  '13FB': ['13FB', 'FB13', '13th FB'],
  '14FB': ['14FB', 'FB14', '14th FB'],
  '15FB': ['15FB', 'FB15', '15th FB'],
  '16FB': ['16FB', 'FB16', '16th FB'],
  '17FB': ['17FB', 'FB17', '17th FB'],
  '18FB': ['18FB', 'FB18', '18th FB'],
  '19FB': ['19FB', 'FB19', '19th FB'],
  '20FB': ['20FB', 'FB20', '20th FB'],
  'BUMP': ['BUMP', 'Bump', 'bump'],
  'OST': ['OST', 'Ost', 'ost'],
  'VI': ['VI', 'vi', 'Vi'],
  'WPG': ['WPG', 'Wpg', 'wpg','LCOP'],
  'CC': ['CC', 'Cc', 'cc'],
  'BDT': ['BDT', 'Bdt', 'bdt','Bridge'],
  '-Outer': ['-Outer', 'Outer', 'outer', '-outer'],
  'FLI': ['FLI', 'Fli', 'fli'],
  'Inline': ['Inline', 'inline', 'InLine', 'INLINE'],
  'OST-': ['OST-', 'Ost-', 'ost-' ],
}

/**
 * 尋找料號欄位值
 * @param {Object} row - Excel 單列資料
 * @returns {string|null} 料號值
 */
export function findPartNumber(row) {
  for (const field of PART_NUMBER_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(row, field) && row[field]) {
      return String(row[field]).trim()
    }
  }
  return null
}

/**
 * 尋找站點欄位值
 * @param {Object} row - Excel 單列資料
 * @param {string} standardLayerName - 標準站點名稱 (如 '1FB', 'BUMP')
 * @returns {number|null} 良率數值或 null
 */
export function findLayerValue(row, standardLayerName) {
  const possibleNames = LAYER_FIELD_MAPPING[standardLayerName] || [standardLayerName]
  
  for (const fieldName of possibleNames) {
    if (Object.prototype.hasOwnProperty.call(row, fieldName)) {
      const value = row[fieldName]
      
      // 處理 N/A 或空值
      if (value === 'N/A' || value === 'NA' || value === '' || value === null || value === undefined) {
        return null
      }
      
      // 轉換為數值
      const numValue = parseFloat(value)
      return isNaN(numValue) ? null : numValue
    }
  }
  
  return null
}

/**
 * Excel 範本資料 - 橫向格式
 */
export const EXCEL_TEMPLATE_DATA = [
  {
    '料號': '2140026',
    '1FB': 1.000,
    '2FB': 'N/A',
    '3FB': 1.000,
    '4FB': 1.000,
    '5FB': 1.000,
    '6FB': 1.000,
    '7FB': 1.000,
    '8FB': 1.000,
    'BUMP': 1.000,
    'OST': 1.000
  },
  {
    '料號': '2140027',
    '1FB': 1.000,
    '2FB': 'N/A',
    '3FB': 1.000,
    '4FB': 1.000,
    '5FB': 1.000,
    '6FB': 1.000,
    '7FB': 1.000,
    '8FB': 1.000,
    'BUMP': 1.000,
    'OST': 1.000
  },
  {
    '料號': '2231651',
    '1FB': 'N/A',
    '2FB': 'N/A',
    '3FB': 'N/A',
    '4FB': 'N/A',
    '5FB': 'N/A',
    '6FB': 'N/A',
    '7FB': 'N/A',
    '8FB': 'N/A',
    'BUMP': 'N/A',
    'OST': 'N/A'
  },
  {
    '料號': '2293010',
    '1FB': 1.000,
    '2FB': 1.000,
    '3FB': 1.000,
    '4FB': 1.000,
    '5FB': 1.000,
    '6FB': 1.000,
    '7FB': 1.000,
    '8FB': 1.000,
    'BUMP': 'N/A',
    'OST': 'N/A'
  }
]

/**
 * 驗證良率數值
 * @param {any} value - 要驗證的值
 * @returns {Object} { isValid: boolean, value?: number, error?: string }
 */
export function validateYieldValue(value) {
  if (value === null || value === undefined) {
    return { isValid: true, value: null } // N/A 是合法的
  }
  
  const numValue = parseFloat(value)
  
  if (isNaN(numValue)) {
    return { isValid: false, error: '必須是數值或 N/A' }
  }
  
  if (numValue < 0 || numValue > 1) {
    return { isValid: false, error: '良率必須在 0-1 之間' }
  }
  
  return { isValid: true, value: numValue }
}
