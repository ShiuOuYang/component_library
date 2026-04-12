<template>
  <div class="h-full flex flex-col">
    <div class="p-2 bg-gray-50 rounded border border-gray-300 mb-2">
      <h6 class="m-0 font-bold flex items-center">
        <i class="bi bi-images mr-2"></i>
        Top3 缺陷照片 ({{ currentSide }} 面)
      </h6>
      <!-- Debug 資訊 -->
      <div class="text-xs text-gray-600 mt-1">
        PhotoData: {{ top3photoData?.length || 0 }} | 
        Base64Data: {{ top3base64Data?.length || 0 }} | 
        PhotoRows: {{ photoRows?.length || 0 }} | 
        FilteredParams: {{ filteredPhotoParams?.length || 0 }}
      </div>
    </div>

    <div class="flex-1 overflow-auto border border-gray-300 rounded bg-white p-3">
      <table class="w-full border-collapse" v-if="defectHeaders.length > 0">
        <thead>
          <tr>
            <th v-for="defectCode in defectHeaders" :key="defectCode" class="p-2 text-center border border-gray-300 bg-gray-50">
              <span class="inline-block px-3 py-1 bg-blue-500 text-white rounded font-semibold text-sm">{{ defectCode }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(rowPhotos, rowIndex) in photoRows" :key="rowIndex" class="border-b border-gray-300">
            <td v-for="(photo, colIndex) in rowPhotos" :key="colIndex" class="p-2 text-center border border-gray-300 align-middle">
              <div v-if="photo && hasValidPhoto(photo)" class="relative inline-block cursor-pointer rounded overflow-hidden shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-lg group" @click="handlePhotoClick(photo)">
                <img
                  :src="renderPhoto(photo)"
                  :alt="`缺陷 ${photo.defectCode || ''} 照片 ${rowIndex + 1}`"
                  class="w-[110px] h-[110px] object-cover block"
                  @error="handleImageError"
                />
                <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <i class="bi bi-zoom-in text-white text-2xl"></i>
                </div>
              </div>
              <div v-else class="w-[110px] h-[110px] flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded text-gray-500 mx-auto">
                <i class="bi bi-card-image text-3xl mb-2"></i>
                <span class="text-xs">無照片</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="flex items-center justify-center h-[200px] text-gray-500 text-sm">
        <i class="bi bi-image mr-2"></i>
        暫無 Top3 缺陷照片
      </div>
    </div>

    <!-- 載入狀態 -->
    <div v-if="isLoading" class="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-10">
      <div class="w-8 h-8 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-3"></div>
      <p class="m-0 text-gray-600">正在載入照片...</p>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, ref } from 'vue'

/**
 * AOI Top3 Photo 組件
 * 顯示 Top3 缺陷的照片
 * AOI 格式：
 * - top3photoData: [{ defect: 'S5', params: [{ Side: 'C', ... }, { Side: 'S', ... }] }, ...]
 * - top3base64Data: [[row1_images], [row2_images], [row3_images]]
 */

// Inject AOI 數據
const aoiData = inject('aoiData', {
  top3photoData: ref([]),
  top3base64Data: ref([]),
  theadName: ref([]),
  isLoading: ref(false),
  sideStatus: ref('B')
})

const {
  top3photoData,
  top3base64Data,
  theadName,
  isLoading,
  sideStatus
} = aoiData

/**
 * 當前顯示的面（C 或 S）
 */
const currentSide = computed(() => {
  // 如果 sideStatus 是 'C' 或 'S'，則顯示該面
  // 如果是 'B'，則默認顯示 C 面
  if (sideStatus.value === 'S') return 'S'
  return 'C'
})

/**
 * 缺陷代碼列表（表頭）- 從 theadName 取得
 */
const defectHeaders = computed(() => {
  const headers = theadName.value || []
  console.log('🔍 [AoiTop3Photo] defectHeaders (from theadName):', headers)
  return headers
})

/**
 * 過濾當前面的照片參數
 * 從 top3photoData 中過濾出當前面的照片
 */
const filteredPhotoParams = computed(() => {
  if (!top3photoData.value || !Array.isArray(top3photoData.value)) {
    console.log('⚠️ [AoiTop3Photo] 無 photoData')
    return []
  }

  const filtered = top3photoData.value.map(item => {
    const sideParams = (item.params || []).filter(param => param.Side === currentSide.value)
    return {
      defect: item.defect,
      params: sideParams
    }
  })

  console.log(`🔍 [AoiTop3Photo] 過濾 ${currentSide.value} 面的照片參數:`, filtered)
  return filtered
})

/**
 * 照片行數據（將數據轉換為行列格式）
 * AOI 格式：[[row1], [row2], [row3]]
 * 每個 row 包含多個缺陷的圖片 base64
 */
const photoRows = computed(() => {
  if (!top3base64Data.value || !Array.isArray(top3base64Data.value) || top3base64Data.value.length === 0) {
    console.log('⚠️ [AoiTop3Photo] 無 base64 數據')
    return []
  }

  console.log('🔍 [AoiTop3Photo] 處理 base64 數據:', {
    base64DataLength: top3base64Data.value.length,
    defectHeadersLength: defectHeaders.value.length,
    currentSide: currentSide.value,
    filteredPhotoParams: filteredPhotoParams.value
  })

  // top3base64Data 格式：[[row1_images], [row2_images], [row3_images]]
  // 每個 row 包含所有缺陷的圖片（依照 theadName 順序）
  
  const rows = top3base64Data.value.map((row, rowIndex) => {
    if (!Array.isArray(row)) {
      console.warn('⚠️ [AoiTop3Photo] row 不是陣列:', row)
      return []
    }
    
    // 根據 defectHeaders 和當前面來過濾照片
    return row.map((base64, colIndex) => {
      const defectCode = defectHeaders.value[colIndex] || ''
      
      // 從 filteredPhotoParams 找到對應的參數
      const photoParam = filteredPhotoParams.value[colIndex]
      const hasPhotoForCurrentSide = photoParam && photoParam.params && photoParam.params.length > rowIndex
      
      // 如果當前缺陷在當前面沒有照片，返回 null
      if (!hasPhotoForCurrentSide) {
        return null
      }
      
      return {
        defectCode,
        base64,
        rowIndex,
        colIndex
      }
    }).filter(Boolean) // 過濾掉 null
  }).filter(row => row.length > 0) // 過濾掉空行
  
  console.log('✅ [AoiTop3Photo] 處理後的 rows:', {
    rowCount: rows.length,
    firstRow: rows[0]
  })
  
  return rows
})

/**
 * 檢查是否有有效照片
 */
const hasValidPhoto = (photo) => {
  return photo && photo.base64 && photo.base64.length > 0
}

/**
 * 渲染照片 Base64
 */
const renderPhoto = (photo) => {
  if (!photo || !photo.base64) return ''
  return `data:image/jpeg;base64,${photo.base64}`
}

/**
 * 處理圖片載入錯誤
 */
const handleImageError = (event) => {
  console.warn('❌ [AoiTop3Photo] 圖片載入失敗:', event.target.src)
  event.target.style.display = 'none'
}

/**
 * 處理照片點擊
 */
const handlePhotoClick = (photo) => {
  console.log('🎯 [AoiTop3Photo] 照片點擊:', photo)
  // TODO: 可以在這裡實作照片放大預覽
}
</script>