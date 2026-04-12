<template>
  <div class="">
    <!-- 標籤頁導航與操作按鈕 -->
    <div class="mb-4 flex items-center justify-between ">
      <div class="flex items-center gap-4">
        <TabNavigation :tabs="navigationTabs" font-size="text-xs" />
        
        
      </div>

      <div class="flex items-center gap-2.5">
      <!-- 使用說明按鈕 -->
        <button
          @click="showIntroModal = true"
          class="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm flex items-center gap-1.5"
          title="查看使用說明"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          使用說明
        </button>
      <!-- 下載範本按鈕 -->
      <button
        @click="handleDownloadTemplate"
        class="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm flex items-center gap-1.5"
        title="下載 Excel 範本"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        下載範本
      </button>
      
      <!-- Excel 上傳按鈕 - 只有有權限的使用者才能看到 -->
      <ExcelUploader
        v-if="canEditImport"
        label="匯入良率"
        @data-loaded="handleExcelData"
        @error="handleExcelError"
        variant="outline-gray"
      />


      <!-- 權限管理按鈕 - 只有管理員可見 -->
      <button
        v-if="isAdmin"
        @click="router.push('/permission-management')"
        class="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-md hover:from-purple-600 hover:to-pink-600 transition-all shadow-md flex items-center gap-1.5"
        title="管理使用者權限"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        權限管理
      </button>
      
      <!-- 無權限提示 -->
      <div v-else class="flex items-center gap-2 px-3 py-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>僅限瀏覽</span>
      </div>
      
      <!-- <button
          @click="uploadDataHandler"
          :disabled="uploadData.length === 0"
          class="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-sm text-xs font-medium"
        >
          <span class="flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            上傳 ({{ uploadData.length }})
          </span>
        </button> -->
      <HeaderLogoutButton size="sm" variant="outline-gray" />
      </div>
    </div>

    <!-- 錯誤訊息 -->
    <!-- <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div class="flex items-center">
        <span class="text-red-600">⚠️ {{ error }}</span>
      </div>
    </div> -->

    <!-- 資料表格 -->
    <div v-if="hasData" class="bg-white rounded-lg shadow">
      <JxFixedTable
        :columns="tableColumns"
        :data="tableData"
        :viewport-offset="200"
        :show-search="true"
        v-model:search-text="searchText"
        :is-fixed="true"
        :is-keep="true"
        :is-filter="false"
        :is-pagination="true"
        header-font-size="xs"
        cell-font-size="xs"
      >
        <!-- Layer 欄位編輯 -->
        <template v-for="layer in layerSlotNameArray" :key="layer" #[`td-${layer}`]="{ column, row }">
          <div 
            class="flex py-1 px-1 w-full items-center h-full"
            :class="row[column.dataIndex] === 0 ? 'bg-gray-200 text-gray-400 justify-center' : 'text-gray-600 justify-center'"
          >
            <span class="">{{ formatYield(row[column.dataIndex]) }}</span>
            <!-- 只有有權限的使用者才能看到編輯按鈕 -->
            <button
              v-if="row[column.dataIndex] !== 0 && canEdit"
              @click="startEdit($event, column.dataIndex, row)"
              class="text-gray-400 hover:text-blue-600 transition-colors ml-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </template>

        <!-- 狀態欄位 -->
        <template #td-status="{ row }">
          <div class="flex justify-center py-1">
            <span
              class="w-4 h-4 rounded-full"
              :class="isComplete(row) ? 'bg-green-500' : 'bg-red-500'"
            ></span>
          </div>
        </template>

        <!-- 範例選擇 -->
        <template #td-example="{ row }">
          <div class="flex justify-center py-1">
            <input
              type="radio"
              :value="row.part_number"
              v-model="exampleRow"
              class="w-4 h-4 text-blue-600"
            />
          </div>
        </template>

        <!-- 目標選擇 -->
        <template #td-target="{ row }">
          <div class="flex justify-center gap-1 py-1" v-if="exampleRow !== row.part_number">
            <input
              type="checkbox"
              :value="row.part_number"
              v-model="targetRows"
              class="w-4 h-4 text-blue-600"
            />
          </div>
        </template>
      </JxFixedTable>
    </div>

    <!-- 操作按鈕區 -->
    <!-- <div v-if="hasData && exampleRow" class="mt-4 flex gap-2 justify-end">
      <button
        @click="selectAllTargets"
        class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
      >
        全選目標
      </button>
      <button
        @click="clearSelections"
        class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
      >
        清除選擇
      </button>
    </div> -->

    <!-- Floating Editor -->
    <div 
      v-if="editingCell.show"
      class="fixed z-50 bg-white shadow-xl  rounded flex items-center justify-between px-1"
      :style="{ 
        top: editingCell.top + 'px', 
        left: editingCell.left + 'px',
        width: editingCell.width + 'px',
        height: editingCell.height + 'px'
      }"
    >
      <input
        ref="inputField"
        v-model="editValue"
        type="number"
        step="0.001"
        min="0"
        max="1"
        class="flex-1 min-w-0 text-center text-xs outline-none border-b-2 border-blue-500 bg-white mr-1"
        @keyup.enter="saveEdit"
        @keyup.esc="cancelEdit"
      />
      <div class="flex shrink-0 gap-0.5">
        <button
          @click="saveEdit"
          class="text-green-600 hover:text-green-700 transition-colors"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button
          @click="cancelEdit"
          class="text-red-600 hover:text-red-700 transition-colors"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading Overlay -->
    <!-- <div v-if="loading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 shadow-xl">
        <div class="flex items-center gap-3">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="text-gray-700">載入中...</span>
        </div>
      </div>
    </div> -->

    <!-- Excel 預覽 Modal -->
    <ExcelPreviewModal
      v-model="showPreviewModal"
      :preview-data="previewData"
      @confirm="confirmUpload"
      @close="closePreviewModal"
    />

    <!-- 使用說明 Modal -->
    <PredictYieldIntroModal v-model="showIntroModal" />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import JxFixedTable from '../components/common/JxFixedTable.vue'
import TabNavigation from '../components/common/TabNavigation.vue'
import PredictYieldIntroModal from '../components/predictYield/PredictYieldIntroModal.vue'
import HeaderLogoutButton from '../components/common/HeaderLogoutButton.vue'
import ExcelUploader from '../components/common/ExcelUploader.vue'
import ExcelPreviewModal from '../components/predictYield/ExcelPreviewModal.vue'
import { usePredictYieldData } from '../composables/predictYield/usePredictYieldData.js'
import { parseExcelData, downloadExcelTemplate } from '../utils/excelUtils.js'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const userStore = useUserStore()

// 權限檢查
const canEdit = computed(() => userStore.canEditPredictYield)
const isAdmin = computed(() => userStore.isAdmin)
const canEditImport = computed(() => userStore.canImportPredictYield)
// 如果沒有權限，顯示提示並可選擇性導向首頁
watch(() => canEdit.value, (hasPermission) => {
  if (!hasPermission && !userStore.isLoading) {
    console.warn('⚠️ 使用者無編輯預估良率權限')
  }
}, { immediate: true })

// 導航標籤配置
const navigationTabs = [
  { path: '/redisual', label: 'WIP' },
  { path: '/predict-yield', label: '預估良率設定(料號)' }
]

// 使用 PredictYield composable
const predictYieldData = usePredictYieldData()

const {
  tableData,
  tableColumns,
  partNoArray,
  currentPartNo,
  loading,
  error,
  hasData,
  fetchPredictYieldData,
  updateSingleYield,
  batchUpdateYields
} = predictYieldData

// 搜尋狀態
const searchText = ref('')

// 編輯狀態
const editingCell = ref({ column: '', row: '', show: false, top: 0, left: 0, width: 0, height: 0 })
const editValue = ref('')
const inputField = ref(null)

// 使用說明 Modal 狀態
const showIntroModal = ref(false)

// Excel 預覽狀態
const showPreviewModal = ref(false)
const previewData = ref(null)

// 選擇狀態
const exampleRow = ref('')
const targetRows = ref([])


// Layer 欄位名稱
const layerSlotNameArray = computed(() => {
  if (!tableColumns.value) return []
  
  return tableColumns.value
    .map(item => item.dataIndex)
    .filter(item => 
      item.includes('FB') || 
      item === 'BUMP' || 
      item === 'OST' || 
      item === 'VI' || 
      item === 'WPG' ||
      item === 'CC' ||
      item === 'BDT' ||
      item === '-Outer'||
      item === 'FLI' ||
      item === 'Inline'||
      item === 'OST-'
    )
})

// 轉換表格資料為 Excel 橫向格式
const convertTableDataToExcelFormat = () => {
  if (!tableData.value || tableData.value.length === 0) return []
  
  return tableData.value.map(row => {
    const excelRow = {
      '料號': row.part_number
    }
    
    // 遍歷所有站點欄位
    layerSlotNameArray.value.forEach(layer => {
      const value = row[layer]
      // 0 或 null 視為 N/A
      if (value === 0 || value === null || value === undefined) {
        excelRow[layer] = 'N/A'
      } else {
        excelRow[layer] = value
      }
    })
    
    return excelRow
  })
}

// 格式化良率顯示
const formatYield = (value) => {
  if (value === null || value === undefined || value === 0) return 'N/A'
  return (value ).toFixed(3) 
}

// 檢查是否正在編輯
const isEditing = (column, partNumber) => {
  return editingCell.value.show && 
         editingCell.value.column === column && 
         editingCell.value.row === partNumber
}

// 開始編輯
const startEdit = (event, column, row) => {
  // 權限檢查
  if (!canEdit.value) {
    alert('⚠️ 您沒有編輯權限，請聯絡管理員')
    return
  }

  // 如果良率為 0，表示沒有該站點，不允許編輯
  if (row[column] === 0) return

  const target = event.currentTarget.closest('div.flex') || event.currentTarget
  const rect = target.getBoundingClientRect()

  editingCell.value = {
    column,
    row: row.part_number,
    show: true,
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height
  }
  editValue.value = row[column]
  
  nextTick(() => {
    if (inputField.value) {
      inputField.value.focus()
    }
  })
}

// 取消編輯
const cancelEdit = () => {
  editingCell.value = { column: '', row: '', show: false, top: 0, left: 0, width: 0, height: 0 }
  editValue.value = ''
}

// 儲存編輯
const saveEdit = async () => {
  const { column, row } = editingCell.value
  const value = parseFloat(editValue.value)
  
  if (isNaN(value) || value < 0 || value > 1) {
    alert('請輸入 0-1 之間的數值')
    return
  }

  const success = await updateSingleYield({
    part_number: row,
    layer: column,
    value
  })

  if (success) {
    cancelEdit()
    await fetchPredictYieldData()
  }
}

// 檢查是否完整
const isComplete = (row) => {
  return Object.values(row).every(val => val !== 1)
}

// 監聽範例選擇
watch(exampleRow, (newVal) => {
  if (targetRows.value.includes(newVal)) {
    targetRows.value = targetRows.value.filter(item => item !== newVal)
  }
})

// 全選目標
const selectAllTargets = () => {
  const allRows = tableData.value
    .map(item => item.part_number)
    .filter(item => item !== exampleRow.value)
  
  targetRows.value = allRows
}

// 清除選擇
const clearSelections = () => {
  exampleRow.value = ''
  targetRows.value = []
}

// 計算上傳資料
const uploadData = computed(() => {
  if (!exampleRow.value || targetRows.value.length === 0) return []

  const exampleData = tableData.value.find(
    item => item.part_number === exampleRow.value
  )

  if (!exampleData) return []

  const dataToUpload = []

  targetRows.value.forEach(part_number => {
    layerSlotNameArray.value.forEach(column => {
      if (exampleData[column] !== 1) {
        dataToUpload.push({
          part_number,
          layer_name: column,
          value: exampleData[column]
        })
      }
    })
  })

  return dataToUpload
})

// 上傳資料
const uploadDataHandler = async () => {
  if (uploadData.value.length === 0) return

  const success = await batchUpdateYields(uploadData.value)
  
  if (success) {
    clearSelections()
    await fetchPredictYieldData()
  }
}

// 處理 Excel 資料並上傳到後端
const handleExcelData = async (jsonData) => {
  // 權限檢查
  if (!canEdit.value) {
    alert('⚠️ 您沒有匯入權限，請聯絡管理員')
    return
  }

  try {
    // 使用橫向格式解析
    const parseResult = parseExcelData(jsonData)

    // 顯示解析摘要
    console.log('解析結果:', parseResult.summary)

    // 如果有錯誤，顯示詳細錯誤訊息
    if (!parseResult.success) {
      const errorMessages = parseResult.errors
        .slice(0, 10) // 最多顯示 10 個錯誤
        .map(err => `第 ${err.row} 列 [${err.field}]: ${err.error}`)
        .join('\n')
      
      const moreErrors = parseResult.errors.length > 10 
        ? `\n... 還有 ${parseResult.errors.length - 10} 個錯誤` 
        : ''
      
      alert(`❌ Excel 資料格式錯誤 (共 ${parseResult.errors.length} 個):\n\n${errorMessages}${moreErrors}\n\n請修正後重新上傳`)
      return
    }

    if (parseResult.data.length === 0) {
      alert('⚠️ 沒有找到有效的資料，請確認 Excel 格式是否正確')
      return
    }

    // 儲存預覽資料並顯示預覽 Modal
    previewData.value = parseResult
    showPreviewModal.value = true
  } catch (error) {
    console.error('處理 Excel 資料時發生錯誤:', error)
    alert(`❌ 處理資料時發生錯誤: ${error.message}`)
  }
}

// 確認上傳
const confirmUpload = async () => {
  if (!previewData.value) return

  try {
    // 上傳到後端
    const success = await batchUpdateYields(previewData.value.data)
    
    if (success) {
      alert(`✅ 成功匯入 ${previewData.value.data.length} 筆資料`)
      await fetchPredictYieldData()
      closePreviewModal()
    }
  } catch (error) {
    console.error('上傳資料時發生錯誤:', error)
    alert(`❌ 上傳失敗: ${error.message}`)
  }
}

// 關閉預覽 Modal
const closePreviewModal = () => {
  showPreviewModal.value = false
  previewData.value = null
}

const handleExcelError = (errorMsg) => {
  alert(`❌ 上傳失敗: ${errorMsg}`)
}

// 下載範本
const handleDownloadTemplate = () => {
  try {
    // 轉換當前資料為 Excel 格式
    const excelData = convertTableDataToExcelFormat()
    
    if (excelData.length === 0) {
      alert('⚠️ 沒有資料可下載，請先載入預估良率資料')
      return
    }
    
    downloadExcelTemplate(excelData)
  } catch (error) {
    console.error('下載範本失敗:', error)
    alert('下載範本失敗，請稍後再試')
  }
}

// 自動載入資料
onMounted(async () => {
  await fetchPredictYieldData()
})
</script>
