import { defineStore } from 'pinia'

export const useViStore = defineStore('vi', {
  state: () => ({
    // VI 表格數據
    tableData: [],
    
    // VI 設備數據
    deviceData: [],
    
    // 選中的批次信息
    selectedLot: null,
    
    // 載入狀態
    isLoading: false,
    
    // Modal 顯示狀態
    showViTableModal: false,
    
    // NCN 數據
    ncnData: null,
    
    // 表格篩選條件
    tableFilters: {
      device: '',
      partNumber: ''
    }
  }),

  getters: {
    // 獲取設備列表
    deviceList: (state) => {
      return [...new Set(state.tableData.map(item => item.ProdClass))].sort()
    },
    
    // 獲取料號列表
    partNumberList: (state) => {
      return [...new Set(state.tableData.map(item => item.PartNum))].sort()
    },
    
    // 篩選後的表格數據
    filteredTableData: (state) => {
      let filtered = state.tableData
      
      if (state.tableFilters.device) {
        filtered = filtered.filter(item => item.ProdClass === state.tableFilters.device)
      }
      
      if (state.tableFilters.partNumber) {
        filtered = filtered.filter(item => item.PartNum === state.tableFilters.partNumber)
      }
      
      return filtered
    }
  },

  actions: {
    // 設置表格數據
    setTableData(data) {
      this.tableData = data || []
    },
    
    // 設置設備數據
    setDeviceData(data) {
      this.deviceData = data || []
    },
    
    // 設置選中的批次
    setSelectedLot(lot) {
      this.selectedLot = lot
    },
    
    // 設置 NCN 數據
    setNcnData(data) {
      this.ncnData = data
    },
    
    // 打開 Table Modal
    openTableModal() {
      this.showViTableModal = true
    },
    
    // 關閉 Table Modal
    closeTableModal() {
      this.showViTableModal = false
    },
    
    // 更新表格篩選條件
    updateTableFilters(filters) {
      this.tableFilters = { ...this.tableFilters, ...filters }
    },
    
    // 重置 VI Store
    resetViStore() {
      this.tableData = []
      this.deviceData = []
      this.selectedLot = null
      this.isLoading = false
      this.showViTableModal = false
      this.ncnData = null
      this.tableFilters = {
        device: '',
        partNumber: ''
      }
    }
  }
})
