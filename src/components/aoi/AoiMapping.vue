<template>
  <div class="aoi-mapping">
    <UniversalMapping
      :data="aoiData.mappingData?.value || []"
      :layout-data="aoiData.layoutData?.value || []"
      :board="board"
      :side-filter="aoiData.sideStatus?.value || 'B'"
      :show-fake-points="aoiData.isShowfakePoint?.value || false"
      :repair-filter="aoiData.isRepair?.value || false"
      :board-title="boardTitle"
      :show-board-title="showBoardTitle"
      :show-zoom-controls="showZoomControls"
      :show-legend="showLegend"
      :enable-tooltip="enableTooltip"
      :enable-image-tooltip="enableImageTooltip"
      :loading="aoiData.isLoading?.value || false"
      :height="height"
      :width="width"
      :container-class="containerClass"
      :empty-message="emptyMessage"
      :image-api-function="imageApiFunction"
      @point-click="handlePointClick"
      @point-hover="handlePointHover"
      @point-leave="handlePointLeave"
      @zoom-change="handleZoomChange"
      @chart-ready="handleChartReady"
    />

    <!-- Tooltip -->
    <CommonTooltip
      :visible="tooltip.visible"
      :position="{ x: tooltip.x, y: tooltip.y }"
      :data="tooltipDataFormatted"
      :show-arrow="false"
      theme="light"
      strategy="absolute"
      max-width="xs"
    >
      <template #default>
        <!-- 缺點圖片 -->
        <div v-if="tooltip.image" class="mt-2 flex justify-center">
          <img 
            :src="tooltip.image" 
            alt="缺點圖片" 
            class="w-[200px] h-[200px] rounded border"
          />
        </div>
        
        <!-- 載入圖片提示 -->
        <div v-else-if="tooltip.loadingImage" class="mt-2 flex justify-center">
          <div class="w-[200px] h-[200px] bg-gray-100 rounded border flex items-center justify-center">
            <div class="text-center">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-1"></div>
              <span class="text-xs text-gray-500">載入圖片中...</span>
            </div>
          </div>
        </div>
      </template>
    </CommonTooltip>
  </div>
</template>

<script setup>
import { computed, inject, ref, watch, onUnmounted } from 'vue'
import { debounce } from 'lodash'
import UniversalMapping from '../UniversalMapping.vue'
import CommonTooltip from '../common/CommonTooltip.vue'

/**
 * AOI Mapping 組件
 * 使用 inject 接收來自上層的 aoiData
 */

const props = defineProps({
  board: {
    type: Number,
    default: 0
  },
  boardTitle: {
    type: String,
    default: ''
  },
  showBoardTitle: {
    type: Boolean,
    default: true
  },
  showZoomControls: {
    type: Boolean,
    default: true
  },
  showLegend: {
    type: Boolean,
    default: true
  },
  enableTooltip: {
    type: Boolean,
    default: true
  },
  enableImageTooltip: {
    type: Boolean,
    default: true
  },
  height: {
    type: Number,
    default: 400
  },
  width: {
    type: Number,
    default: 0
  },
  containerClass: {
    type: String,
    default: ''
  },
  emptyMessage: {
    type: String,
    default: 'AOI Mapping 圖表'
  },
  imageApiFunction: {
    type: Function,
    default: null
  }
})

const emit = defineEmits([
  'point-click',
  'point-hover', 
  'point-leave',
  'zoom-change',
  'chart-ready'
])

// 從上層組件 inject 數據（比照 FLI 的方式）
const aoiData = inject('aoiData', {
  mappingData: ref([]),
  layoutData: ref([]),
  isLoading: ref(false),
  sideStatus: ref('B'),
  isShowfakePoint: ref(false),
  isRepair: ref(false)
})

// Debug: 監聽數據變化
watch([() => aoiData.mappingData.value, () => aoiData.layoutData.value], ([mapData, layout]) => {
  console.log('🗺️ [AoiMapping] 數據更新:', {
    mappingDataCount: mapData|| 0,
    layoutDataCount: layout|| 0,
    board: props.board,
    aoiDataKeys: Object.keys(aoiData),
    hasMappingData: !!aoiData.mappingData,
    mappingDataValue: aoiData.mappingData?.value
  })
}, { immediate: true })

// 計算渲染數據數量
const renderDataCount = computed(() => {
  if (!aoiData.mappingData.value) return 0
  
  let filteredData = aoiData.mappingData.value
  
  // 根據 board 篩選
  if (props.board !== 0) {
    filteredData = filteredData.filter(item => item.BoardNo === props.board)
  }
  
  // 根據側面篩選
  if (aoiData.sideStatus.value !== 'B') {
    filteredData = filteredData.filter(item => item.OutSide === aoiData.sideStatus.value)
  }
  
  return filteredData.length
})

// 事件處理函數
// Tooltip 狀態
const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  data: null,
  image: null,
  loadingImage: false
})

const currentImageRequest = ref(null)

// 格式化 Tooltip 數據
const tooltipDataFormatted = computed(() => {
  const d = tooltip.value.data
  if (!d) return {}
  return {
    title: `缺點: ${d.Classify}`,
    items: [
      { label: '板號', value: d.BoardNo },
      { label: '面次', value: d.OutSide },
      { label: '座標', value: `(${d.Xvalue?.toFixed(3)}, ${d.Yvalue?.toFixed(3)})` },
      { label: '修補', value: d.Repair ? '是' : '否' },
      { label: '判報', value: d.Scrapped ? '是' : '否' }
    ]
  }
})

// 防抖的圖片載入函數
const debouncedLoadImage = debounce(async (data) => {
  // console.log('🖼️ [AoiMapping] try load image:', data)
  if (!props.enableImageTooltip || !props.imageApiFunction) return
  
  // 取消之前的請求
  if (currentImageRequest.value) {
    currentImageRequest.value.abort()
  }
  
  tooltip.value.loadingImage = true
  tooltip.value.image = null
  
  try {
    currentImageRequest.value = new AbortController()
    
    // Debug: 檢查數據欄位
    // if (!data.ImagePath) console.warn('⚠️ [AoiMapping] Missing ImagePath in data:', data)

    const imageData = await props.imageApiFunction({
      ImagePath: data.ImagePath,
      DefectSeq: data.DefectSeq,
      BoardNo: data.BoardNo,
      Side: data.OutSide,
      xValue: data.Xvalue,
      yValue: data.Yvalue
    }, {
      signal: currentImageRequest.value.signal
    })
    
    if (!currentImageRequest.value.signal.aborted && imageData?.data) {
      tooltip.value.image = `data:image/jpeg;base64,${imageData.data}`
    } else if (!currentImageRequest.value.signal.aborted) {
      // 無圖片數據
      // console.log('⚠️ [AoiMapping] No image data returned')
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('載入圖片失敗:', error)
    }
  } finally {
    tooltip.value.loadingImage = false
    currentImageRequest.value = null
  }
}, 100)

const handlePointClick = (data) => {
  console.log('🎯 AOI Mapping 點擊事件:', data)
  emit('point-click', data)
}

const handlePointHover = (payload) => {
  // payload 包含 { event, data, position }
  // 如果是舊版 UniversalMapping 可能只傳 data，這裡做個兼容
  const data = payload.data || payload
  const position = payload.position || { x: 0, y: 0 }
  
  tooltip.value.visible = true
  tooltip.value.data = data
  tooltip.value.x = position.x + 15
  tooltip.value.y = position.y - 250
  tooltip.value.image = null
  tooltip.value.loadingImage = false
  
  // 載入圖片
  if (props.enableImageTooltip) {
    debouncedLoadImage(data)
  }
  
  emit('point-hover', data)
}

const handlePointLeave = () => {
  tooltip.value.visible = false
  tooltip.value.data = null
  tooltip.value.image = null
  tooltip.value.loadingImage = false
  
  // 取消圖片載入
  debouncedLoadImage.cancel()
  if (currentImageRequest.value) {
    currentImageRequest.value.abort()
  }
  
  emit('point-leave')
}

onUnmounted(() => {
  debouncedLoadImage.cancel()
  if (currentImageRequest.value) {
    currentImageRequest.value.abort()
  }
})

const handleZoomChange = (transform) => {
  emit('zoom-change', transform)
}

const handleChartReady = (chartInfo) => {
  console.log('🎯 AOI Mapping 圖表準備完成')
  emit('chart-ready', chartInfo)
}
</script>