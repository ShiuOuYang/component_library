<template>
  <slot />
</template>

<script setup>
import { provide } from 'vue'
import { useAoiMapping } from '../../composables/aoi/useAoiMapping'

/**
 * 輕量級 AOI Mapping Provider
 * 
 * 📋 用途：
 * 只提供 Mapping 和 Layout 數據，不包含完整的 AOI 分析功能
 * 適合用於 Tooltip、快速預覽等輕量場景
 * 
 * 🎯 使用方式：
 * <AoiMappingProvider>
 *   <YieldTooltip />
 *   <QuickPreview />
 * </AoiMappingProvider>
 * 
 * ✅ 優勢：
 * 1. 輕量快速：只載入必要數據
 * 2. 獨立性：不影響完整的 AOI Store
 * 3. 可複用：可在多個地方使用
 * 4. 簡單清晰：職責單一
 * 
 * 🔄 與 AoiDataProvider 的區別：
 * - AoiDataProvider: 提供完整 AOI 功能（GFA、Top3、History 等）
 * - AoiMappingProvider: 只提供 Mapping/Layout 數據（輕量快速）
 */

const aoiMappingState = useAoiMapping()

// 提供 AOI Mapping 數據（與 AoiMapping 組件相容的格式）
provide('aoiData', {
  // 核心數據
  mappingData: aoiMappingState.mappingData,
  layoutData: aoiMappingState.layoutData,
  headData: aoiMappingState.headData,
  lotInfo: aoiMappingState.lotInfo,
  // UI 狀態
  sideStatus: aoiMappingState.sideStatus,
  isShowfakePoint: aoiMappingState.isShowfakePoint,
  isRepair: aoiMappingState.isRepair,
  
  // 載入狀態
  isLoading: aoiMappingState.isLoading,
  
  // 計算屬性
  boardNoAry: aoiMappingState.boardNoAry,
  isMappingDataReady: aoiMappingState.isMappingReady
})

// 提供輕量級操作方法
provide('aoiMappingActions', {
  loadMappingData: aoiMappingState.loadMappingData,
  reset: aoiMappingState.reset,
  toggleSide: aoiMappingState.toggleSide,
  toggleFakePoint: aoiMappingState.toggleFakePoint,
  toggleRepair: aoiMappingState.toggleRepair
})

// 提供狀態查詢
provide('aoiMappingStatus', {
  isLoading: aoiMappingState.isLoading,
  error: aoiMappingState.error,
  isMappingReady: aoiMappingState.isMappingReady,
  hasLayoutData: aoiMappingState.hasLayoutData,
  totalDataPoints: aoiMappingState.totalDataPoints,
  lotInfo: aoiMappingState.lotInfo
})

// Expose methods for template refs
defineExpose({
  loadMappingData: aoiMappingState.loadMappingData,
  reset: aoiMappingState.reset
})
</script>
