import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * PredictYield Store
 * 管理預估良率的狀態
 */
export const usePredictYieldStore = defineStore('predictYield', () => {
  // =============== State ===============
  const predictYieldData = ref([])
  const currentPartNo = ref('')
  const partNoArray = ref([])
  const layerColumns = ref([])
  const loading = ref(false)
  const error = ref(null)

  // =============== Getters ===============
  const hasData = computed(() => predictYieldData.value && predictYieldData.value.length > 0)
  const dataCount = computed(() => predictYieldData.value.length)

  // =============== Actions ===============
  
  /**
   * 設置預估良率數據
   */
  const setPredictYieldData = (data) => {
    // console.log('🔥 設置預估良率數據，數量:', data.length)
    // console.log(data)
    predictYieldData.value = data
  }

  /**
   * 設置當前 Part Number
   */
  const setCurrentPartNo = (partNo) => {
    currentPartNo.value = partNo
  }

  /**
   * 設置 Part Number 列表
   */
  const setPartNoArray = (data) => {
    partNoArray.value = data
  }

  /**
   * 設置 Layer 欄位
   */
  const setLayerColumns = (data) => {
    layerColumns.value = data
  }

  /**
   * 設置載入狀態
   */
  const setLoading = (status) => {
    loading.value = status
  }

  /**
   * 設置錯誤訊息
   */
  const setError = (message) => {
    error.value = message
  }

  /**
   * 重置數據
   */
  const resetData = () => {
    predictYieldData.value = []
    layerColumns.value = []
    error.value = null
  }

  /**
   * 重置所有狀態
   */
  const resetAll = () => {
    predictYieldData.value = []
    currentPartNo.value = ''
    partNoArray.value = []
    layerColumns.value = []
    loading.value = false
    error.value = null
  }

  return {
    // State
    predictYieldData,
    currentPartNo,
    partNoArray,
    layerColumns,
    loading,
    error,
    
    // Getters
    hasData,
    dataCount,
    
    // Actions
    setPredictYieldData,
    setCurrentPartNo,
    setPartNoArray,
    setLayerColumns,
    setLoading,
    setError,
    resetData,
    resetAll
  }
})
