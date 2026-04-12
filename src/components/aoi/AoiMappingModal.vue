<template>
  <DraggableModal
    v-model="isModalVisible"
    :title="modalTitle"
    :width="modalWidth"
    :height="modalHeight"
    :maximizable="true"
    @close="handleClose"
    :defaultMaximized="true"
  >
    <template #header-actions>
      <button
        class="btn btn-sm btn-outline-secondary"
        @click="handleRefresh"
        title="重新整理"
      >
        <i class="bi bi-arrow-clockwise"></i>
      </button>
    </template>

    <template #default>
      <div class="h-full flex flex-col bg-gray-100">
        <!-- 載入中狀態 -->
        <div v-if="isLoading || !isgfaDone" class="flex flex-col justify-center items-center h-[400px] text-gray-600">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">載入中...</span>
          </div>
          <p class="mt-2">正在載入 Mapping 數據...</p>
        </div>

        <!-- 主要內容 -->
        <div v-else class="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <!-- 批次資訊（保留 AOI 的 TableYield） -->
          <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-0 shadow-md rounded-lg">
            <AoiTableYield />
          </div>

          <!-- Mapping 區域（使用 FLI 的結構） -->
          <div class="bg-white rounded-lg shadow-sm overflow-hidden min-h-[500px]">
            <div class="flex justify-between items-center p-4 pb-2 border-b-2 border-gray-200">
              <h6 class="m-0 font-semibold text-gray-800 flex items-center">
                <i class="bi bi-diagram-3 me-2"></i>
                Defect Mapping
              </h6>
            </div>
            
            <!-- 控制面板 -->
            <AoiPanelControls />
            
            <div class="p-4 min-h-[400px]">
              <!-- Fold 模式：單個 Mapping -->
              <div v-if="isfoldMode && isMappingDataReady">
                <AoiMapping
                  :board="0"
                  :height="400"
                  :enable-image-tooltip="true"
                  :image-api-function="loadMappingImage"
                  @point-click="handleMappingPointClick"
                />
              </div>
              
              <!-- Unfold 模式：多個 Mapping -->
              <div v-else-if="!isfoldMode && isMappingDataReady" class="grid grid-cols-[repeat(auto-fit,minmax(500px,1fr))] gap-4 w-full">
                <AoiMapping
                  v-for="boardNo in boardNoAryValue"
                  :key="boardNo"
                  :board="boardNo"
                  :board-title="`Board ${boardNo}`"
                  :height="350"
                  :enable-image-tooltip="true"
                  :image-api-function="loadMappingImage"
                  @point-click="handleMappingPointClick"
                />
              </div>
              
              <!-- 無數據狀態 -->
              <div v-else class="flex justify-center items-center h-[400px] bg-gray-100 border border-gray-300 rounded-lg text-gray-600 text-sm">
                <i class="bi bi-info-circle me-2"></i>
                暫無 Mapping 數據
              </div>
            </div>
          </div>

          <!-- Top3 照片 -->
          <div class="bg-white rounded-lg p-4 shadow-sm min-h-[300px]">
            <AoiTop3Photo />
          </div>

          <!-- Distribution Chart -->
          <div class="bg-white rounded-lg p-4 shadow-sm min-h-[400px]">
            <div class="flex justify-between items-center mb-3 pb-2 border-b-2 border-gray-200">
              <h6 class="m-0 font-semibold text-gray-800 flex items-center">
                <i class="bi bi-bar-chart me-2"></i>
                板號缺點分布圖
              </h6>
              <div class="max-w-[300px]">
                <!-- 製程選擇器 -->
                <AoiBoardSortSelector />
              </div>
            </div>
            
            <div class="min-h-[350px]">
              <AoiDistribution />
            </div>
          </div>

          <!-- History & NCN Record -->
          <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div class="bg-white rounded-lg p-4 shadow-sm min-h-[400px]">
              <AoiHistory />
            </div>

            <div class="bg-white rounded-lg p-4 shadow-sm min-h-[400px]">
              <AoiNcnRecord />
            </div>
          </div>
        </div>
      </div>
    </template>
  </DraggableModal>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { aoiApi } from '../../api/services.js'

// 組件導入
import DraggableModal from '../common/DraggableModal.vue'

// 使用 AOI 的組件
import AoiMapping from './AoiMapping.vue'
import AoiTableYield from './AoiTableYield.vue'
import AoiPanelControls from './AoiPanelControls.vue'
import AoiTop3Photo from './AoiTop3Photo.vue'
import AoiDistribution from './AoiDistribution.vue'
import AoiHistory from './AoiHistory.vue'
import AoiNcnRecord from './AoiNcnRecord.vue'
import AoiBoardSortSelector from './AoiBoardSortSelector.vue'

/**
 * AOI Mapping Modal 組件
 * 使用 inject 接收來自 AoiDataProvider 的 aoiData
 * 所有子組件都使用 inject('aoiData') 模式，架構完全可複用
 */

// Inject AOI 數據（提供默認值避免 undefined）
const aoiData = inject('aoiData', {
  isaoiShowModal: ref(false),
  isgfaDone: ref(false),
  gfalotNum: ref(''),
  isfoldMode: ref(false),
  boardNoAry: ref([]),
  infoData: ref([]),
  mappingData: ref([]),
  layoutData: ref([]),
  top3photoData: ref({ C: [], S: [] }),
  top3base64Data: ref({ C: [], S: [] }),
  historyData: ref([]),
  ncnrecordData: ref([]),
  boardsortData: ref([]),
  boardsortProcName: ref('default'),
  selectedLotInfo: computed(() => null),
  isLoading: ref(false),
  isMappingDataReady: computed(() => false),
  sideStatus: ref('B'),
  isShowfakePoint: ref(false),
  isRepair: ref(false),
  handleBoardSortChange: () => {},
  closeModal: () => console.warn('closeModal not provided')
})

// 解構使用（比照 FLI 的方式）
const {
  isaoiShowModal,
  isgfaDone,
  gfalotNum,
  isfoldMode,
  boardNoAry,
  infoData,
  mappingData,
  layoutData,
  top3photoData,
  top3base64Data,
  historyData,
  ncnrecordData,
  boardsortData,
  boardsortProcName,
  selectedLotInfo,
  isLoading,
  isMappingDataReady,
  sideStatus,
  isShowfakePoint,
  isRepair,
  handleBoardSortChange: handleBoardSortChangeComposable,
  closeModal: closeModalComposable
} = aoiData

// =============== 不需要 provide，所有子組件直接 inject('aoiData') ===============

// 創建本地 computed 來解包 boardNoAry
const boardNoAryValue = computed(() => {
  const value = boardNoAry?.value || []
  console.log('🔍 [AoiMappingModal] boardNoAryValue computed:', value)
  return value
})

// Top3 照片數據處理
const top3PhotoData = computed(() => top3photoData.value || { C: [], S: [] })
const top3Base64Data = computed(() => top3base64Data.value || { C: [], S: [] })

// Modal 狀態
const isModalVisible = computed({
  get: () => isaoiShowModal?.value || false,
  set: (value) => {
    if (isaoiShowModal) {
      isaoiShowModal.value = value
    }
    if (!value) {
      closeModalComposable()
    }
  }
})

const modalTitle = computed(() => {
  const lotInfoValue = selectedLotInfo?.value
  if (lotInfoValue && lotInfoValue.LotNum) {
    return `AOI Mapping 分析 - ${lotInfoValue.PartNo || ''} / ${lotInfoValue.LotNum}`
  }
  return `AOI Mapping 分析 - ${gfalotNum?.value || ''}`
})

const modalWidth = ref('95%')
const modalHeight = ref('90vh')

// =============== 事件處理 ===============

/**
 * 處理照片點擊
 */
const handlePhotoClick = (photo) => {
  console.log('🎯 [AoiMappingModal] 照片點擊:', photo)
  // TODO: 可以在這裡實作照片放大預覽
}

/**
 * 處理 Mapping 點擊事件
 */
const handleMappingPointClick = (data) => {
  console.log('🎯 [AoiMappingModal] Mapping 點擊事件:', data)
  // TODO: 可以在這裡實作點擊後的操作，例如顯示詳細資訊
}

/**
 * 載入 Mapping 圖片
 */
const loadMappingImage = async (params, options = {}) => {
  try {
    console.log('�️ [AoiMappingModal] 載入 Mapping 圖片:', params)
    
    // 準備照片參數
    const photoParams = {
      ImagePath: params.ImagePath,
      DefectSeq: params.DefectSeq,
      BoardNo: params.BoardNo,
      Side: params.Side || params.OutSide,
      xValue: params.xValue || params.Xvalue || params.X,
      yValue: params.yValue || params.Yvalue || params.Y,
      factory: infoData.value?.[0]?.Factory || 'unknown'
    }
    
    console.log('📸 [AoiMappingModal] 照片參數:', photoParams)
    
    const response = await aoiApi.getPhotoData(photoParams, options)
    console.log('✅ [AoiMappingModal] 圖片載入成功:', response)
    return response
  } catch (error) {
    console.error('❌ [AoiMappingModal] 載入圖片失敗:', error)
    return null
  }
}


/**
 * 處理重新整理
 */
const handleRefresh = () => {
  console.log('🔄 [AoiMappingModal] 重新整理')
  const lotInfo = selectedLotInfo?.value
  if (lotInfo && (lotInfo.LotNum || lotInfo.lotno)) {
    // TODO: 重新載入所有數據
  }
}

/**
 * 處理關閉
 */
const handleClose = () => {
  console.log('🔄 [AoiMappingModal] 關閉 Modal')
  isModalVisible.value = false
}

// =============== 監聽 ===============

watch(() => isaoiShowModal?.value, (newVal) => {
  console.log('👁️ [AoiMappingModal] Modal 顯示狀態變更:', newVal)
  if (newVal) {
    // Modal 開啟時的初始化邏輯
    
    // 🔍 調試：輸出當前數據狀態
    console.log('🔍 [AoiMappingModal] Modal 開啟時的數據狀態:', {
      mappingDataLength: mappingData.value?.length || 0,
      layoutDataLength: layoutData.value?.length || 0,
      infoDataLength: infoData.value?.length || 0,
      top3photoDataLength: top3photoData.value?.C?.length || 0,
      top3base64DataLength: top3base64Data.value?.C?.length || 0,
      historyDataLength: historyData.value?.length || 0,
      ncnrecordDataLength: ncnrecordData.value?.length || 0,
      boardNoAry: boardNoAry?.value || [],
      selectedLotInfo: selectedLotInfo?.value,
      isLoading: isLoading.value,
      isgfaDone: isgfaDone.value,
      isMappingDataReady: isMappingDataReady?.value || false,
      isfoldMode: isfoldMode.value
    })
  }
})

// 🔍 監聽關鍵數據變化
watch([mappingData, layoutData, isgfaDone], ([map, layout, done]) => {
  console.log('🔍 [AoiMappingModal] 關鍵數據變化:', {
    mappingDataLength: map?.length || 0,
    layoutDataLength: layout?.length || 0,
    isgfaDone: done,
    boardNoAry: boardNoAry?.value || [],
    isMappingDataReady: isMappingDataReady?.value || false
  })
}, { deep: true })

// 🔍 監聽照片數據變化
watch([top3photoData, top3base64Data], ([photoData, base64Data]) => {
  console.log('🔍 [AoiMappingModal] 照片數據變化:', {
    photoData: photoData,
    base64Data: base64Data,
    photoCLength: photoData?.C?.length || 0,
    photoSLength: photoData?.S?.length || 0,
    base64CLength: base64Data?.C?.length || 0,
    base64SLength: base64Data?.S?.length || 0
  })
}, { deep: true, immediate: true })

// 🔍 監聽 boardsortData 變化
watch([boardsortData, boardsortProcName], ([sortData, procName]) => {
  console.log('🔍 [AoiMappingModal] BoardSort 數據變化:', {
    procName: procName,
    sortDataLength: sortData?.length || 0,
    sortData: sortData
  })
}, { deep: true, immediate: true })
</script>
