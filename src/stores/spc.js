/**
 * SPC Dashboard Store
 * 管理 SPC 儀表板的所有狀態
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSpcStore = defineStore('spc', () => {
  // ========================
  // 狀態
  // ========================
  
  /** 載入狀態 */
  const loading = ref(true)
  
  /** 錯誤訊息 */
  const error = ref(null)
  
  /** 原始數據 - mainData (統計數據) */
  const rawMainData = ref([])
  
  /** 原始數據 - oosList (OOS 警報清單) */
  const rawOosList = ref([])
  
  /** 警報類型統計 */
  const alarmTypeStats = ref({})
  
  /** 最後更新時間 */
  const lastUpdateTime = ref(null)
  
  /** Type 篩選 (EQP, PRD, LAB, CPV, OTHER) */
  const selectedType = ref(null)
  
  /** AlarmType 篩選 (OOS, OOC) */
  const selectedAlarmType = ref(null)
  
  /** FileGroup 篩選 */
  const selectedFileGroup = ref(null)
  
  /** 時間範圍篩選 (Day, Week, Month) */
  const timeRange = ref('Day')

  // ========================
  // Getters (計算屬性)
  // ========================
  
  /**
   * 當前篩選條件
   */
  const currentFilters = computed(() => ({
    type: selectedType.value,
    alarmType: selectedAlarmType.value,
    fileGroup: selectedFileGroup.value,
    timeRange: timeRange.value
  }))

  /**
   * 是否有啟用篩選
   */
  const hasActiveFilters = computed(() => {
    return selectedType.value !== null || 
           selectedAlarmType.value !== null || 
           selectedFileGroup.value !== null ||
           timeRange.value !== 'Day'
  })

  /**
   * 是否有數據
   */
  const hasData = computed(() => {
    return rawMainData.value.length > 0
  })

  /**
   * 篩選後的主數據
   */
  const filteredMainData = computed(() => {
    if (!hasData.value) return []
    
    let filtered = [...rawMainData.value]
    
    // 按 Type 篩選
    if (selectedType.value) {
      filtered = filtered.filter(item => item.Type === selectedType.value)
    }
    
    // 按 AlarmType 篩選
    if (selectedAlarmType.value) {
      filtered = filtered.filter(item => item.AlarmType === selectedAlarmType.value)
    }
    
    // 按 FileGroup 篩選
    if (selectedFileGroup.value) {
      filtered = filtered.filter(item => item.FileGroup === selectedFileGroup.value)
    }
    
    return filtered
  })

  /**
   * 篩選後的 OOS 列表
   */
  const filteredOosList = computed(() => {
    if (rawOosList.value.length === 0) return []
    
    let filtered = [...rawOosList.value]
    
    // 按 Type 篩選
    if (selectedType.value) {
      filtered = filtered.filter(item => item.Type === selectedType.value)
    }
    
    // 按 FileGroup 篩選
    if (selectedFileGroup.value) {
      filtered = filtered.filter(item => item.FileGroup === selectedFileGroup.value)
    }
    // console.log('🔍 [SPC Store] filteredOosList:', { filteredCount: filtered })
    return filtered
  })

  /**
   * 所有可用的 Type 列表
   */
  const availableTypes = computed(() => {
    const types = new Set(rawMainData.value.map(item => item.Type))
    return Array.from(types).sort()
  })

  /**
   * 所有可用的 AlarmType 列表
   */
  const availableAlarmTypes = computed(() => {
    const types = new Set(rawMainData.value.map(item => item.AlarmType))
    return Array.from(types).sort()
  })

  /**
   * 所有可用的 FileGroup 列表
   */
  const availableFileGroups = computed(() => {
    const groups = new Set(rawMainData.value.map(item => item.FileGroup))
    return Array.from(groups).sort()
  })

  /**
   * 統計資訊
   */
  const stats = computed(() => ({
    totalRecords: rawMainData.value.length,
    oosRecords: rawOosList.value.length,
    alarmTypes: alarmTypeStats.value,
    filteredRecords: filteredMainData.value.length,
    filteredOosRecords: filteredOosList.value.length
  }))

  // ========================
  // Actions (方法)
  // ========================
  
  /**
   * 設置原始數據
   */
  function setRawData(mainData, oosList, lastUpdate, alarmStats) {
    console.log('📥 [SPC Store] 設置原始數據:', {
      mainDataCount: mainData?.length || 0,
      oosListCount: oosList?.length || 0,
      lastUpdate: lastUpdate
    })

    rawMainData.value = Array.isArray(mainData) ? mainData : []
    rawOosList.value = Array.isArray(oosList) ? oosList : []
    lastUpdateTime.value = lastUpdate || new Date().toISOString()
    alarmTypeStats.value = alarmStats || {}
    
    console.log('✅ [SPC Store] 數據更新完成')
  }

  /**
   * 更新 Type 篩選
   */
  function updateType(type) {
    console.log('🔍 [SPC Store] 更新 Type:', type)
    selectedType.value = type
  }

  /**
   * 更新 AlarmType 篩選
   */
  function updateAlarmType(type) {
    console.log('🔍 [SPC Store] 更新 AlarmType:', type)
    selectedAlarmType.value = type
  }

  /**
   * 更新 FileGroup 篩選
   */
  function updateFileGroup(group) {
    console.log('🔍 [SPC Store] 更新 FileGroup:', group)
    selectedFileGroup.value = group
  }

  /**
   * 更新時間範圍
   */
  function updateTimeRange(range) {
    console.log('🔍 [SPC Store] 更新時間範圍:', range)
    timeRange.value = range
  }

  /**
   * 重置所有篩選
   */
  function resetFilters() {
    console.log('🔄 [SPC Store] 重置篩選')
    selectedType.value = null
    selectedAlarmType.value = null
    selectedFileGroup.value = null
    timeRange.value = 'Day'
  }

  /**
   * 設置載入狀態
   */
  function setLoading(value) {
    loading.value = value
  }

  /**
   * 設置錯誤訊息
   */
  function setError(message) {
    error.value = message
  }

  /**
   * 清除錯誤
   */
  function clearError() {
    error.value = null
  }

  /**
   * 重置所有狀態
   */
  function resetState() {
    loading.value = true
    error.value = null
    rawMainData.value = []
    rawOosList.value = []
    alarmTypeStats.value = {}
    lastUpdateTime.value = null
    selectedType.value = null
    selectedAlarmType.value = null
    selectedFileGroup.value = null
    timeRange.value = 'Day'
    
    console.log('🔄 [SPC Store] 狀態已重置')
  }

  // ========================
  // 返回
  // ========================
  
  return {
    // 狀態
    loading,
    error,
    rawMainData,
    rawOosList,
    alarmTypeStats,
    lastUpdateTime,
    selectedType,
    selectedAlarmType,
    selectedFileGroup,
    timeRange,
    
    // Getters
    currentFilters,
    hasActiveFilters,
    hasData,
    filteredMainData,
    filteredOosList,
    availableTypes,
    availableAlarmTypes,
    availableFileGroups,
    stats,
    
    // Actions
    setRawData,
    updateType,
    updateAlarmType,
    updateFileGroup,
    updateTimeRange,
    resetFilters,
    setLoading,
    setError,
    clearError,
    resetState
  }
})
