<template>
  <slot />
</template>

<script setup>
import { provide, computed } from 'vue'
import { useAoiData } from '../../composables/aoi/useAoiData'
import { useAoiStore } from '../../stores/aoi'

/**
 * AOI 數據提供者組件
 * 
 * 📋 用途：
 * 為所有子組件提供統一的 AOI 數據訪問，避免在每個頁面重複 provide
 * 
 * 🎯 使用方式：
 * <AoiDataProvider>
 *   <AoiTableModal />
 *   <AoiMappingModal />
 * </AoiDataProvider>
 * 
 * ✅ 優勢：
 * 1. 可複用：任何頁面都可以使用
 * 2. 單一職責：只負責提供數據
 * 3. 易維護：provide 邏輯集中管理
 * 4. 靈活：可以選擇性包裹需要的組件
 */

// 取得 AOI 數據和 Store
const aoiData = useAoiData()
const aoiStore = useAoiStore()

// 🔍 調試：監控數據變化
console.log('🎯 [AoiDataProvider] 初始化，數據:', {
  top3photoData: aoiData.top3photoData?.value,
  top3base64Data: aoiData.top3base64Data?.value,
  mappingData: aoiData.mappingData?.value?.length || 0,
  boardsortData: aoiData.boardsortData?.value?.length || 0,
  boardNoAry: aoiData.boardNoAry?.value
})

// 統一 provide AOI Store（用於直接操作）
provide('aoiStore', aoiStore)

// 統一 provide AOI 數據給所有子組件
provide('aoiData', {
  // Mapping 數據
  mappingData: aoiData.mappingData,
  layoutData: aoiData.layoutData,
  headData: aoiData.headData,
  boardsortData: aoiData.boardsortData,
  boardsortProcName: aoiData.boardsortProcName,
  top3photoData: aoiData.top3photoData,
  top3base64Data: aoiData.top3base64Data,
  infoData: aoiData.infoData,
  tempinfoData: aoiData.tempinfoData,
  historyData: aoiData.historyData,
  ncnrecordData: aoiData.ncnrecordData,
  LotData: aoiData.LotData,
  LotDataList: aoiData.LotDataList,
  
  // 站點數據
  stationAoiData: aoiData.stationAoiData,
  stationAoiLoading: aoiData.stationAoiLoading,
  stationAoiError: aoiData.stationAoiError,
  
  // UI 狀態
  isShowfakePoint: aoiData.isShowfakePoint,
  isfoldMode: aoiData.isfoldMode,
  isZoomMode: aoiData.isZoomMode,
  sideStatus: aoiData.sideStatus,
  isRepair: aoiData.isRepair,
  isaoiShowModal: computed(() => aoiData.isaoiShowModal.value),
  isaoiOpenModal: computed(() => aoiData.isaoiOpenModal.value),
  isgfaDone: aoiData.isgfaDone,
  
  // 計算屬性
  boardNoAry: aoiData.boardNoAry,
  theadName: aoiData.theadName,
  gfalotNum: aoiData.gfalotNum,
  hasSelectedLot: aoiData.hasSelectedLot,
  selectedLotInfo: aoiData.selectedLotInfo,
  isMappingDataReady: aoiData.isMappingDataReady,
  isLoading: aoiData.isLoading,
  processedTop3PhotoData: aoiData.processedTop3PhotoData,
  processedTop3Base64Data: aoiData.processedTop3Base64Data,
  boardSortOptions: aoiData.boardSortOptions,
  
  // Distribution 相關計算屬性
  sortedBoardArray: aoiData.sortedBoardArray,
  filteredRenderData: aoiData.filteredRenderData,
  classifyArray: aoiData.classifyArray,
  allClassifyArray: aoiData.allClassifyArray,
  distributionData: aoiData.distributionData,
  distributionMaxValue: aoiData.distributionMaxValue,
  
  // 方法
  loadAoiLotData: aoiData.loadAoiLotData,
  loadStationAoiData: aoiData.loadStationAoiData,
  handleBoardSortChange: aoiData.handleBoardSortChange,
  toggleFoldMode: aoiData.toggleFoldMode,
  toggleFakePoint: aoiData.toggleFakePoint,
  toggleSide: aoiData.toggleSide,
  closeModal: aoiData.closeAoiModal,
  resetData: aoiData.resetAllAoiData
})
</script>
