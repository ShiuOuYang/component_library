import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Redisual Store
 * 職責：只存放響應式狀態，不包含業務邏輯
 */
export const useRedisualStore = defineStore('redisual', () => {
  console.log('📦 Redisual Store: 初始化')

  // =============== 數據狀態 ===============
  
  // Redisual 主要數據
  const redisualData = ref([])
  const currentPartNumber = ref('')
  const currentProcess = ref([])
  const layerColumns = ref([])
  

  // =============== 計算屬性 ===============
  
  /**
   * 是否有資料
   */
  const hasData = computed(() => redisualData.value.length > 0)
  
  /**
   * 資料總數
   */
  const dataCount = computed(() => redisualData.value.length)
  
  /**
   * 平均產品良率
   */
  const avgProductYield = computed(() => {
    if (redisualData.value.length === 0) return 0
    const sum = redisualData.value.reduce((acc, row) => {
      return acc + (parseFloat(row.product_yield) || 0)
    }, 0)
    return sum / redisualData.value.length
  })
  
  /**
   * 平均釋放數量
   */
  const avgRlsQty = computed(() => {
    if (redisualData.value.length === 0) return 0
    const sum = redisualData.value.reduce((acc, row) => {
      return acc + (parseInt(row.rlsQty) || 0)
    }, 0)
    return Math.round(sum / redisualData.value.length)
  })
  
 

  // =============== Setter 方法 ===============
  
  const setRedisualData = (data) => {
    console.log('🔧 設置 Redisual 數據:', data)
    redisualData.value = Array.isArray(data) ? data : [data]

  }
  const setProcessData = (data) => {
    console.log('🔧 [Store] setProcessData 被調用')
    console.log('📊 [Store] 接收的 data FB 順序:', data.filter(d => d.fb.includes('FB')).map(d => d.fb))
    
    // 分離 FB 欄位和非 FB 欄位，分別排序
    const fbItems = data.filter(item => item.fb.includes('FB'))
    
    // FB 欄位按數字排序
    fbItems.sort((a, b) => {
      const numA = parseInt(a.fb.replace('FB', ''))
      const numB = parseInt(b.fb.replace('FB', ''))
      return numA - numB
    })
    
    console.log('📊 [Store] FB 排序後:', fbItems.map(f => f.fb))
    
    // 合併：保持原始資料中的順序結構
    // 找出第一個 FB 欄位在原始資料中的位置
    const firstFbIndex = data.findIndex(item => item.fb.includes('FB'))
    
    let sortedData
    if (firstFbIndex === -1) {
      // 沒有 FB 欄位，保持原順序
      sortedData = data
    } else {
      // 將 FB 欄位插入到原來第一個 FB 的位置
      sortedData = [
        ...data.slice(0, firstFbIndex),
        ...fbItems,
        ...data.slice(firstFbIndex).filter(item => !item.fb.includes('FB'))
      ]
    }
    
    currentProcess.value = sortedData
    layerColumns.value = sortedData.map(item => item.fb)
    
    console.log('✅ [Store] 最終 layerColumns FB 順序:', layerColumns.value.filter(l => l.includes('FB')))
  }
  
  const setCurrentPartNumber = (partNumber) => {
    currentPartNumber.value = partNumber
  }
  
  // =============== 重置方法 ===============
  
  const resetData = () => {
    redisualData.value = []
    currentProcess.value = []
    layerColumns.value = []
  }
  
  const resetAll = () => {
    redisualData.value = []
    currentPartNumber.value = ''
    currentProcess.value = []
    layerColumns.value = []
  }

  // =============== 用戶偏好 ===============
  
  const userPreferences = ref({
    autoRefresh: false,
    showAllColumns: false,
    defaultSortField: 'lotnum',
    defaultSortOrder: 'asc'
  })
  
  const updateUserPreferences = (newPrefs) => {
    userPreferences.value = { ...userPreferences.value, ...newPrefs }
    localStorage.setItem('redisual_user_preferences', JSON.stringify(userPreferences.value))
  }
  
  const loadUserPreferences = () => {
    try {
      const saved = localStorage.getItem('redisual_user_preferences')
      if (saved) {
        userPreferences.value = { ...userPreferences.value, ...JSON.parse(saved) }
      }
    } catch (error) {
      console.error('❌ 載入用戶偏好失敗:', error)
    }
  }

  // 初始化時載入用戶偏好
  loadUserPreferences()

  return {
    // 數據狀態
    redisualData,
    currentPartNumber,
    currentProcess,
    layerColumns,
    
    // 計算屬性
    hasData,
    dataCount,
    avgProductYield,
    avgRlsQty,
    
    // Setter 方法
    setRedisualData,
    setCurrentPartNumber,
    setProcessData,

    // 重置方法
    resetData,
    resetAll,
    
    // 用戶偏好
    userPreferences,
    updateUserPreferences,
    loadUserPreferences
  }
})
