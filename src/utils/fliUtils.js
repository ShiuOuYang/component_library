/**
 * FLI 工具函數集
 * 職責：純函數，數據處理和轉換邏輯
 */

/**
 * 處理 Top3 缺陷圖片參數
 * @param {Array} mappingDataArray - Mapping 數據陣列
 * @param {Array} defectArray - 缺陷陣列 [Top_1, Top_2, Top_3]
 * @returns {Array} 處理後的 Top3 圖片參數陣列
 */
export function processFliTop3ImageParams(mappingDataArray, defectArray) {
  if (!mappingDataArray || !defectArray) return []
  
  // 去重並過濾空值
  const top3Defects = [...new Set(defectArray)].filter(
    d => d && d !== " " && d !== undefined && d !== null
  )
  
  // 根據缺陷類型過濾 Mapping 數據
  const top3MappingData = mappingDataArray.filter((i) => 
    top3Defects.includes(i.DefectCode || i.Classify)
  )
  
  // 構建圖片參數陣列
  const top3ImageParamsArray = top3Defects.map((defect) => {
    const params = top3MappingData
      .filter((i) => (i.DefectCode || i.Classify) === defect)
      .slice(0, 3) // 每個缺陷類型最多 3 張圖片
      .map((i) => ({
        ImagePath: i.ImagePath,
        DefectSeq: i.DefectSeq,
        BoardNo: i.BoardNo,
        Side: i.OutSide || i.Side,
        xValue: i.Xvalue || i.X,
        yValue: i.Yvalue || i.Y,
        factory: i.Factory || 'UMTC'
      }))
    
    return { defect, params }
  })
  
  return top3ImageParamsArray
}

/**
 * 組織圖片數據為二維陣列
 * @param {Array} imageResults - 圖片結果陣列
 * @param {Number} defectCount - 缺陷類型數量
 * @returns {Array} 二維圖片數據陣列 [row][col]
 */
export function organizeFliImageData(imageResults, defectCount) {
  if (!imageResults || imageResults.length === 0) return []
  
  const imageArray = []
  
  for (let row = 0; row < 3; row++) {
    const rowData = []
    for (let col = 0; col < defectCount; col++) {
      const index = col * 3 + row
      rowData.push(imageResults[index] || null)
    }
    imageArray.push(rowData)
  }
  
  return imageArray
}

/**
 * 提取板號陣列
 * @param {Array} mappingData - Mapping 數據
 * @returns {Array} 排序後的板號陣列
 */
export function extractFliBoardNumbers(mappingData) {
  if (!mappingData || mappingData.length === 0) return []
  
  return [...new Set(mappingData.map((i) => i.BoardNo))]
    .filter(Boolean)
    .sort((a, b) => a - b)
}

/**
 * 提取缺陷名稱陣列
 * @param {Array} top3PhotoData - Top3 照片數據
 * @returns {Array} 缺陷名稱陣列
 */
export function extractFliDefectNames(top3PhotoData) {
  if (!top3PhotoData || top3PhotoData.length === 0) return []
  
  return top3PhotoData.map((i) => i.defect).filter(Boolean)
}

/**
 * 格式化 Lot 資訊
 * @param {Array|Object} lotInfo - Lot 資訊（可能是陣列或物件）
 * @param {String|Number} headData - Head 數據
 * @returns {Object} 格式化後的 Lot 資訊
 */
export function formatFliLotInfo(lotInfo, headData) {
  if (!lotInfo) return {}
  
  // 如果是陣列，取第一個元素
  const info = Array.isArray(lotInfo) ? lotInfo[0] : lotInfo
  
  if (!info) return {}
  
  return {
    ...info,
    lotno: info.LotNum || info.lotno || '',
    partno: info.PN || info.partno || '',
    layer: info.Layer || info.layer || '-Outer',
    yield: info.Yield || info.yield || 0,
    target: info.Target || info.target || 0,
    trigger: info.Triger || info.trigger || 0,
    headData: headData || info.headData || ''
  }
}

/**
 * 計算排序後的板號陣列（FLI 版本）
 * 完全參考 AOI 實現
 * @param {String} boardsortProcName - 排序製程名稱
 * @param {Array} boardsortData - 排序數據
 * @param {Array} boardNoAry - 原始板號陣列
 * @returns {Array} 排序後的板號陣列
 */
export function calculateFliBoardArray(boardsortProcName, boardsortData, boardNoAry) {
  // 優先順序 1: 如果選擇了製程排序且有排序數據
  if (boardsortProcName !== 'default' && boardsortData && boardsortData.length > 0) {
    
    let boardArray = boardsortData[0]
      .map(item => item.CompID ? Number(item.CompID.slice(-3)) : null)
      .filter(Boolean)

    console.log('✅ [fliUtils] 使用 Board Sort 數據', { procName: boardsortProcName, boardArray })
      
    return boardArray.length > 0 ? boardArray : Array(48).fill(0).map((_, index) => index + 1)
  }
  
  // 優先順序 2: 使用 boardNoAry（從 mappingData 提取的板號）
  if (boardNoAry && boardNoAry.length > 0) {
    return boardNoAry
  }
  
  // 優先順序 3: 使用預設 48 板
  return Array(48).fill(0).map((_, index) => index + 1)
}

/**
 * 過濾渲染數據（根據假點設定） - FLI 版本
 * @param {Array} mappingData - Mapping 數據
 * @param {Boolean} isShowfakePoint - 是否顯示假點
 * @returns {Array} 過濾後的數據
 */
export function filterFliRenderData(mappingData, isShowfakePoint) {
  if (!mappingData || mappingData.length === 0) {
    return []
  }
  
  // FLI 使用 Classify 欄位，假點通常為 '0' 或空字串
  if (!isShowfakePoint) {
    return mappingData.filter((i) => 
      i.Classify && 
      i.Classify !== '0'
    )
  }
  
  return mappingData.filter((i) => i.Classify && i.Classify !== '0')
}

/**
 * 提取缺陷類別陣列 - FLI 版本
 * @param {Array} renderData - 渲染數據
 * @returns {Array} 排序後的缺陷類別陣列
 */
export function extractFliClassifyArray(renderData) {
  return [...new Set(renderData.map((i) => i.Classify))].filter(Boolean).sort()
}

/**
 * 計算分布數據（按板號和面別統計） - FLI 版本
 * 完全參考 AOI 實現
 * @param {Array} renderData - 渲染數據
 * @param {Array} boardAry - 板號陣列
 * @param {Array} classifyAry - 缺陷類別陣列
 * @param {Number} headData - Head 數量
 * @returns {Object} { C: [], S: [] } 分布數據
 */
export function calculateFliDistributionData(renderData, boardAry, classifyAry, headData) {
  console.log('🔍 [fliUtils] calculateFliDistributionData 參數:', {
    renderDataLength: renderData?.length || 0,
    renderDataSample: renderData?.slice(0, 3),
    boardAryLength: boardAry?.length || 0,
    boardArySample: boardAry?.slice(0, 5),
    classifyAry,
    headData
  })
  
  const result = { C: [], S: [] }
  
  ;['C', 'S'].forEach((side) => {
    const sideData = []
    
    boardAry.forEach((boardNo) => {
      // 初始化每個板號的數據物件
      const boardData = { Board: boardNo }
      classifyAry.forEach((classify) => {
        boardData[classify] = 0
      })
      
      // 過濾該板號該面的數據（FLI 使用 OutSide 欄位）
      const eachBoardData = renderData.filter(
        (i) => i.BoardNo === boardNo && i.OutSide === side
      )
      
      // 🔍 調試：如果第一個板號有數據，顯示詳細信息
      if (boardNo === boardAry[1] && eachBoardData.length > 0) {
        console.log(`🔍 [fliUtils] 第一個板號 ${boardNo} - ${side} 面數據:`, {
          eachBoardDataLength: eachBoardData.length,
          sample: eachBoardData.slice(0, 2),
          classifyValues: eachBoardData.map(i => i.Classify)
        })
      }
      
      // 累加各缺點數量，轉換為佔比（FLI 使用 Classify 欄位）
      eachBoardData.forEach((item) => {
        const classify = item.Classify
        if (boardData[classify] !== undefined) {
          boardData[classify] += 1 / headData[0].UPP
        }else {
          boardData[classify] =0
          boardData[classify] += 1 / headData[0].UPP
        }
      })
      
      sideData.push(boardData)
    })
    
    result[side] = sideData
  })
  
  console.log('✅ [fliUtils] calculateFliDistributionData 結果:', {
    CSample: result.C,
    SSample: result.S
  })
  
  return result
}

/**
 * 計算分布數據的最大值 - FLI 版本
 * @param {Object} distributionData - 分布數據 { C: [], S: [] }
 * @param {Array} classifyAry - 缺陷類別陣列
 * @returns {Number} 最大值
 */
export function calculateFliMaxValue(distributionData, classifyAry) {
  if (!distributionData || !distributionData.C || !distributionData.S) {
    console.warn('⚠️ [fliUtils] calculateFliMaxValue: distributionData 結構不正確', distributionData)
    return 0.01
  }
  
  if (!classifyAry || classifyAry.length === 0) {
    console.warn('⚠️ [fliUtils] calculateFliMaxValue: classifyAry 是空的')
    return 0.01
  }
  
  const maxArray = []
  
  // C 面
  distributionData.C.forEach((boardData) => {
    let boardMax = 0
    classifyAry.forEach((classify) => {
      const value = boardData[classify] || 0
      boardMax += value
    })
    maxArray.push(boardMax)
  })
  
  // S 面
  distributionData.S.forEach((boardData) => {
    let boardMax = 0
    classifyAry.forEach((classify) => {
      const value = boardData[classify] || 0
      boardMax += value
    })
    maxArray.push(boardMax)
  })
  
  const result = Math.max(...maxArray, 0.01)
  
  if (isNaN(result)) {
    console.error('❌ [fliUtils] calculateFliMaxValue 返回 NaN:', { maxArray, classifyAry, distributionData })
    return 0.01
  }
  
  return result
}

/**
 * 處理 Top3 數據格式化
 * @param {Array} rawTop3Data - 原始 Top3 數據
 * @returns {Array} 格式化後的 Top3 數據
 */
export function processFliTop3Data(rawTop3Data) {
  if (!Array.isArray(rawTop3Data) || rawTop3Data.length === 0) {
    return []
  }

  return rawTop3Data
    .slice(0, 3)
    .filter(item => item && (item.defect_code || item.DefectCode))
    .map((item, index) => ({
      rank: index + 1,
      defectCode: item.defect_code || item.DefectCode || `Defect${index + 1}`,
      defectName: item.defect_name || item.DefectName || `缺陷${index + 1}`,
      count: parseInt(item.count || item.Count || 0, 10),
      rate: parseFloat(item.rate || item.Rate || 0).toFixed(2),
      hasPhoto: !!item.photo_base64 || !!item.PhotoBase64
    }))
}

/**
 * 取得缺陷顏色
 * @param {String} defectCode - 缺陷代碼
 * @returns {String} 顏色代碼
 */
export function getFliDefectColor(defectCode) {
  const colorMap = {
    '01': '#ff0000', // 紅
    '02': '#00ff00', // 綠
    '03': '#0000ff', // 藍
    '04': '#ffff00', // 黃
    '05': '#ff00ff', // 洋紅
    '06': '#00ffff', // 青
    '07': '#ffa500', // 橙
    '08': '#800080', // 紫
    '09': '#ffc0cb', // 粉紅
    '10': '#a52a2a'  // 棕
  }

  return colorMap[defectCode] || '#808080' // 預設灰色
}

/**
 * 建立 Board Sort 選項
 * @param {Array} boardsortData - Board Sort 數據
 * @returns {Array} Board Sort 選項陣列
 */
export function buildFliBoardSortOptions(boardsortData) {
  if (!boardsortData || boardsortData.length === 0) {
    return [{ value: 'default', label: '預設排序' }]
  }
  
  const options = [{ value: 'default', label: '預設排序' }]
  
  // 從 boardsortData 提取製程名稱
  const procNames = [...new Set(boardsortData.map(item => item.ProcName || item.procName))]
    .filter(Boolean)
  
  procNames.forEach(procName => {
    options.push({
      value: procName,
      label: procName
    })
  })
  
  return options
}

/**
 * 檢查是否需要載入 Board Sort 數據
 * @param {String} procName - 製程名稱
 * @param {Object} lotInfo - Lot 資訊
 * @returns {Boolean} 是否需要載入
 */
export function shouldLoadFliBoardSort(procName, lotInfo) {
  return procName !== 'default' && lotInfo && Object.keys(lotInfo).length > 0
}

/**
 * 取得預設 UI 狀態
 * @returns {Object} 預設 UI 狀態
 */
export function getDefaultFliFUIState() {
  return {
    isfoldMode: true,
    isShowfakePoint: false,
    isZoomMode: false,
    sideStatus: 'B'
  }
}
