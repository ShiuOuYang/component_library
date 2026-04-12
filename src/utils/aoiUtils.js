/**
 * AOI 工具函數集
 * 職責：純函數，數據處理和轉換邏輯
 */

/**
 * 處理 Top3 缺陷圖片參數
 * @param {Array} mappingDataArray - Mapping 數據陣列
 * @param {Array} defectArray - 缺陷陣列
 * @param {String} factory - 工廠代碼
 * @returns {Array} 處理後的 Top3 圖片參數陣列
 */
export function processTop3ImageParams(mappingDataArray, defectArray, factory) {
  if (!mappingDataArray || !defectArray) return []
  
  // 去重並過濾空值
  const top3Defects = [...new Set(defectArray)].filter((i) => i !== " ")
  
  // 根據缺陷類型過濾 Mapping 數據
  const top3MappingData = mappingDataArray.filter((i) => top3Defects.includes(i.Classify))
  
  // 構建圖片參數陣列
  const top3ImageParamsArray = top3Defects.map((defect) => {
    const params = top3MappingData
      .filter((i) => i.Classify === defect)
      .slice(0, 3) // 每個缺陷類型最多 3 張圖片
      .map((i) => ({
        ImagePath: i.ImagePath,
        DefectSeq: i.DefectSeq,
        BoardNo: i.BoardNo,
        Side: i.OutSide,
        xValue: i.Xvalue,
        yValue: i.Yvalue,
        factory: factory,
      }))
    
    return { defect, params }
  })
  
  return top3ImageParamsArray
}

/**
 * 組織圖片數據為二維陣列
 * @param {Array} imageResults - 圖片結果陣列
 * @param {Number} defectCount - 缺陷類型數量
 * @returns {Array} 二維圖片數據陣列
 */
export function organizeImageData(imageResults, defectCount) {
  if (!imageResults || imageResults.length === 0) return []
  
  const imageArray = []
  
  // 每行最多 3 張圖片
  for (let idx = 0; idx < 3; idx++) {
    const innerArray = []
    
    for (let index = defectCount * idx; index < defectCount * (idx + 1); index++) {
      if (imageResults[index]) {
        innerArray.push(imageResults[index].data)
      } else {
        innerArray.push("")
      }
    }
    
    imageArray.push(innerArray)
  }
  
  return imageArray
}

/**
 * 從 Mapping 數據中提取唯一的 Board 編號
 * @param {Array} mappingData - Mapping 數據
 * @returns {Array} 唯一的 Board 編號陣列
 */
export function extractBoardNumbers(mappingData) {
  if (!mappingData || mappingData.length === 0) return []
  return [...new Set(mappingData.map((i) => i.BoardNo))]
}

/**
 * 從 Top3 照片數據中提取缺陷名稱
 * @param {Array} top3photoData - Top3 照片數據
 * @returns {Array} 缺陷名稱陣列
 */
export function extractDefectNames(top3photoData) {
  if (!top3photoData || top3photoData.length === 0) return []
  return top3photoData.map((i) => i.defect)
}

/**
 * 構建 Board Sort 選項
 * @param {Array} boardsortData - Board Sort 數據
 * @returns {Array} 選項陣列
 */
export function buildBoardSortOptions(boardsortData) {
  if (!boardsortData || boardsortData.length === 0) {
    return [{ value: 'default', label: '預設排序' }]
  }
  
  return [
    { value: 'default', label: '預設排序' },
    ...boardsortData.map(item => ({
      value: item.ProcName,
      label: item.ProcName
    }))
  ]
}

/**
 * 驗證 Lot 數據是否有效
 * @param {Object} lotData - Lot 數據
 * @returns {Boolean} 是否有效
 */
export function isValidLotData(lotData) {
  return lotData && lotData.LotNum && lotData.Layer
}

/**
 * 格式化 Lot 資訊
 * @param {Object} infoData - Lot 資訊數據
 * @param {Object} headData - Head 數據
 * @returns {Object|null} 格式化後的 Lot 資訊
 */
export function formatLotInfo(infoData, headData) {
  if (!infoData || infoData.length === 0) {
    return null
  }
  
  return {
    ...infoData[0],
    headData: headData || []
  }
}

/**
 * 重置 UI 狀態的預設值
 * @returns {Object} UI 狀態物件
 */
export function getDefaultUIState() {
  return {
    isShowfakePoint: false,
    isfoldMode: true,
    isZoomMode: false,
    sideStatus: "B",
    isRepair: false
  }
}

/**
 * 檢查是否需要載入 Board Sort 數據
 * @param {String} procName - 製程名稱
 * @param {Object} infoData - Lot 資訊
 * @returns {Boolean} 是否需要載入
 */
export function shouldLoadBoardSort(procName, infoData) {
  return procName !== 'default' && infoData && infoData.length > 0
}

/**
 * 計算排序後的板號陣列
 * @param {String} boardsortProcName - 排序製程名稱
 * @param {Array} boardsortData - 排序數據
 * @param {Array} boardNoAry - 原始板號陣列
 * @returns {Array} 排序後的板號陣列
 */
export function calculateBoardArray(boardsortProcName, boardsortData, boardNoAry) {
  // 優先順序 1: 如果選擇了製程排序且有排序數據
  if (boardsortProcName !== 'default' && boardsortData && boardsortData.length > 0) {
    
    let boardArray =boardsortData[0]
      .map(item => item.CompID?Number(item.CompID.slice(-3)):null)
      

      console.log('使用 Board Sort 數據計算板號陣列', boardsortProcName[0], boardsortData,
      boardArray
    )
      
    return boardArray.length > 0 ? boardArray : Array(48).fill(0).map((_, index) => index + 1);
  }
  
  // 優先順序 2: 使用 boardNoAry（從 mappingData 提取的板號）
  if (boardNoAry && boardNoAry.length > 0) {
    return boardNoAry
  }
  
  // 優先順序 3: 使用預設 48 板
  return Array(48).fill(0).map((_, index) => index + 1)
}

/**
 * 過濾渲染數據（根據假點設定）
 * @param {Array} mappingData - Mapping 數據
 * @param {Boolean} isShowfakePoint - 是否顯示假點
 * @returns {Array} 過濾後的數據
 */
export function filterRenderData(mappingData, isShowfakePoint) {
  if (!mappingData || mappingData.length === 0) {
    return []
  }
  
  // 如果不顯示假點，過濾掉假點（Classify 為 '0' 或 'PASS'）
  if (!isShowfakePoint) {
    return mappingData.filter((i) => i.Classify && i.Classify !== '0' && i.Classify !== 'PASS')
  }
  
  return mappingData.filter((i) => i.Classify && i.Classify !== '0')
}

/**
 * 提取缺陷類別陣列
 * @param {Array} renderData - 渲染數據
 * @returns {Array} 排序後的缺陷類別陣列
 */
export function extractClassifyArray(renderData) {
  return [...new Set(renderData.map((i) => i.Classify))].filter(Boolean).sort()
}

/**
 * 計算分布數據（按板號和面別統計）
 * @param {Array} renderData - 渲染數據
 * @param {Array} boardAry - 板號陣列
 * @param {Array} classifyAry - 缺陷類別陣列
 * @param {Number} headData - Head 數量
 * @returns {Object} { C: [], S: [] } 分布數據
 */
export function calculateDistributionData(renderData, boardAry, classifyAry, headData) {
  const result = { C: [], S: [] }
  
  ;['C', 'S'].forEach((side) => {
    const sideData = []
    
    boardAry.forEach((boardNo) => {
      // 初始化每個板號的數據物件
      const boardData = { Board: boardNo }
      classifyAry.forEach((classify) => {
        boardData[classify] = 0
      })
      
      // 過濾該板號該面的數據
      const eachBoardData = renderData.filter(
        (i) => i.BoardNo === boardNo && i.OutSide === side
      )
      
      // 累加各缺點數量，轉換為佔比
      eachBoardData.forEach((item) => {
        const classify = item.Classify
        if (boardData[classify] !== undefined) {
          boardData[classify] += 1 / headData
        }
      })
      
      sideData.push(boardData)
    })
    
    result[side] = sideData
  })
  
  return result
}

/**
 * 計算分布數據的最大值
 * @param {Object} distributionData - 分布數據 { C: [], S: [] }
 * @param {Array} classifyAry - 缺陷類別陣列
 * @returns {Number} 最大值
 */
export function calculateMaxValue(distributionData, classifyAry) {
  const maxArray = []
  
  // C 面
  distributionData.C.forEach((boardData) => {
    let boardMax = 0
    classifyAry.forEach((classify) => {
      boardMax += boardData[classify]
    })
    maxArray.push(boardMax)
  })
  
  // S 面
  distributionData.S.forEach((boardData) => {
    let boardMax = 0
    classifyAry.forEach((classify) => {
      boardMax += boardData[classify]
    })
    maxArray.push(boardMax)
  })
  
  return Math.max(...maxArray, 0.01) // 至少 0.01 避免除以零
}
