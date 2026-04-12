import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * WPG Store
 * 職責：狀態存儲、狀態變更方法
 * 不包含：業務邏輯、計算屬性（由 Composable 負責）
 */
export const useWpgStore = defineStore('wpg', () => {
  console.log('🏪 初始化 WPG Store')

  // =============== 數據狀態 ===============
  
  /**
   * 表格數據
   */
  const tableData = ref([])
  
  /**
   * 設備數據
   */
  const deviceData = ref([])
  
  /**
   * 趨勢數據
   */
  const trendData = ref([])
  
  /**
   * 選中的批次資訊
   */
  const selectedLot = ref(null)
  
  /**
   * 選中的設備類型
   */
  const selectedDevice = ref('')

  // =============== UI 狀態 ===============
  
  /**
   * 載入狀態
   */
  const isLoading = ref(false)
  
  /**
   * Table Modal 顯示狀態
   */
  const showWpgTableModal = ref(false)
  
  /**
   * 當前模式 (normal/OSAT)
   */
  const currentWpgMode = ref('normal')

  // =============== 表格篩選狀態 ===============
  
  /**
   * 表格篩選條件
   */
  const tableFilters = ref({
    deviceRecord: '',
    partRecord: '',
    searchKeyword: ''
  })

  // =============== Setter 方法 ===============
  
  /**
   * 設置表格數據
   */
  const setTableData = (data) => {
    tableData.value = data || []
    console.log('📊 [WPG Store] 設置表格數據:', tableData.value.length, '筆')
  }
  
  /**
   * 設置設備數據
   */
  const setDeviceData = (data) => {
    deviceData.value = data || []
    console.log('📊 [WPG Store] 設置設備數據:', deviceData.value.length, '筆')
  }
  
  /**
   * 設置趨勢數據
   */
  const setTrendData = (data) => {
    trendData.value = data || []
    console.log('📊 [WPG Store] 設置趨勢數據:', trendData.value.length, '筆')
  }
  
  /**
   * 設置選中的批次
   */
  const setSelectedLot = (lot) => {
    selectedLot.value = lot
    console.log('📊 [WPG Store] 設置選中批次:', lot)
  }
  
  /**
   * 設置選中的設備
   */
  const setSelectedDevice = (device) => {
    selectedDevice.value = device
    console.log('📊 [WPG Store] 設置選中設備:', device)
  }
  
  /**
   * 設置載入狀態
   */
  const setLoading = (loading) => {
    isLoading.value = loading
  }
  
  /**
   * 更新表格篩選條件
   */
  const updateTableFilters = (filters) => {
    tableFilters.value = { ...tableFilters.value, ...filters }
    console.log('📊 [WPG Store] 更新篩選條件:', tableFilters.value)
  }

  // =============== Modal 控制方法 ===============
  
  /**
   * 開啟 Table Modal
   */
  const openTableModal = () => {
    showWpgTableModal.value = true
    console.log('📊 [WPG Store] 開啟 Table Modal')
  }
  
  /**
   * 關閉 Table Modal
   */
  const closeTableModal = () => {
    showWpgTableModal.value = false
    console.log('📊 [WPG Store] 關閉 Table Modal')
  }
  
  /**
   * 關閉所有 Modal
   */
  const closeModal = () => {
    showWpgTableModal.value = false
    console.log('📊 [WPG Store] 關閉所有 Modal')
  }

  // =============== 重置方法 ===============
  
  /**
   * 重置 WPG Store
   */
  const resetWpgStore = () => {
    tableData.value = []
    deviceData.value = []
    trendData.value = []
    selectedLot.value = null
    selectedDevice.value = ''
    isLoading.value = false
    showWpgTableModal.value = false
    currentWpgMode.value = 'normal'
    tableFilters.value = {
      deviceRecord: '',
      partRecord: '',
      searchKeyword: ''
    }
    console.log('🔄 [WPG Store] Store 已重置')
  }

  return {
    // 數據狀態
    tableData,
    deviceData,
    trendData,
    selectedLot,
    selectedDevice,
    
    // UI 狀態
    isLoading,
    showWpgTableModal,
    currentWpgMode,
    
    // 篩選狀態
    tableFilters,
    
    // Setter 方法
    setTableData,
    setDeviceData,
    setTrendData,
    setSelectedLot,
    setSelectedDevice,
    setLoading,
    updateTableFilters,
    
    // Modal 控制
    openTableModal,
    closeTableModal,
    closeModal,
    
    // 重置方法
    resetWpgStore
  }
})
