import * as XLSX from 'xlsx'
import { 
  findPartNumber,
  findLayerValue,
  validateYieldValue,
  LAYER_FIELD_MAPPING
} from '../config/excelFieldMapping.js'

/**
 * 解析 Excel 資料 - 橫向格式
 * @param {Array} jsonData - xlsx 解析後的 JSON 資料
 * @returns {Object} { success: boolean, data: Array, errors: Array, summary: Object }
 */
export function parseExcelData(jsonData) {
  const results = []
  const errors = []
  const allLayers = Object.keys(LAYER_FIELD_MAPPING)

  if (!jsonData || jsonData.length === 0) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, field: 'Excel', error: '檔案沒有資料' }],
      summary: { totalRows: 0, validRecords: 0, errorCount: 1 }
    }
  }

  jsonData.forEach((row, index) => {
    const rowNumber = index + 2 // Excel 列號 (1-based + header)

    // 取得料號
    const partNumber = findPartNumber(row)
    
    // 如果沒有料號，跳過這一列（可能是空白列）
    if (!partNumber) {
      return
    }

    // 遍歷所有站點
    allLayers.forEach(layerName => {
      const value = findLayerValue(row, layerName)
      
      // 如果沒有這個站點或是 N/A，跳過
      if (value === null) return

      // 驗證良率數值
      const validation = validateYieldValue(value)
      
      if (!validation.isValid) {
        errors.push({
          row: rowNumber,
          field: `${partNumber} - ${layerName}`,
          error: validation.error
        })
      } else {
        results.push({
          part_number: partNumber,
          layer_name: layerName,
          value: validation.value
        })
      }
    })
  })

  return {
    success: errors.length === 0,
    data: results,
    errors,
    summary: {
      totalRows: jsonData.length,
      validRecords: results.length,
      errorCount: errors.length
    }
  }
}

/**
 * 產生 Excel 範本檔案 - 橫向格式
 * @param {Array} data - 要匯出的資料
 * @returns {Blob} Excel 檔案 Blob
 */
export function generateExcelTemplate(data) {
  if (!data || data.length === 0) {
    throw new Error('沒有資料可以匯出')
  }
  
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '良率資料')

  // 設定欄寬
  const columnWidths = [
    { wch: 12 }, // 料號
    ...Object.keys(LAYER_FIELD_MAPPING).slice(0, 10).map(() => ({ wch: 8 })) // 各站點
  ]
  worksheet['!cols'] = columnWidths

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  })
}

/**
 * 下載 Excel 範本
 * @param {Array} data - 要匯出的資料
 */
export function downloadExcelTemplate(data) {
  try {
    const blob = generateExcelTemplate(data)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const fileName = `良率資料_${new Date().toISOString().split('T')[0]}.xlsx`
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('下載範本失敗:', error)
    throw new Error('下載範本失敗')
  }
}
