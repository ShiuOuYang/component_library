<template>
  <DraggableModal
    v-model="isVisible"
    :title="`${selectedStation || 'AOI'} AOI 分析數據`"
    :width="1200"
    :height="700"
    :draggable="true"
    :resizable="true"
    :maximizable="true"
    @close="handleClose"
    :defaultMaximized="true"
  >
    <div class="aoi-table-container">
      <!-- 載入指示器 -->
      <div v-if="aoiData.stationAoiLoading.value" class="flex justify-center items-center h-40">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span class="ml-2 text-gray-600">載入 AOI 數據中...</span>
      </div>
      
      <!-- AOI 表格 -->
      <div v-else-if="aoiData.stationAoiData.value && aoiData.stationAoiData.value.length > 0">
        <CommonTable
          :data="aoiData.stationAoiData.value"
          :columns="columns"
          :defaultPageSize="10"
          searchPlaceholder="輸入關鍵字搜尋 AOI 數據..."
          noDataText="無 AOI 數據"
        >
          <!-- 自定義表格行 -->
          <template #table-row="{ item }">
            <tr :class="getRowClass(item)">
              <!-- 操作列 -->
              <td class="p-2">
                <button 
                  @click="handleOpenMapping(item)"
                  class="mapping-btn"
                >
                  Mapping
                </button>
              </td>
              <td class="p-2">{{ item.Factory }}</td>
              <td class="p-2">{{ item.LotType }}</td>
              <td class="p-2">{{ item.PartNo }}</td>
              <td class="p-2">{{ item.LotNum }}</td>
              <td class="p-2">{{ item.Layer }}</td>
              <td class="p-2">{{ item.pnl }}</td>
              <td class="p-2">{{ formatPercent(item.Triger) }}</td>
              <td class="p-2">{{ formatPercent(item.Target) }}</td>
              <td class="p-2" :class="getYieldClass(item.Yield, item.Triger)">{{ formatPercent(item.Yield) }}</td>
              <td class="p-2" :class="getYieldClass(item.Bef_Yield, item.Triger)">{{ formatPercent(item.Bef_Yield) }}</td>
              
              <!-- C Top 缺點 -->
              <td class="p-2">
                <button 
                  v-if="item.C_TOP_1" 
                  @click="handleViewDefectTrend(item, item.C_TOP_1)"
                  class="defect-btn"
                >
                  {{ item.C_TOP_1 }}
                </button>
              </td>
              <td class="p-2">{{ item.C_TOP1 }}</td>
              <td class="p-2">
                <button 
                  v-if="item.C_TOP_2" 
                  @click="handleViewDefectTrend(item, item.C_TOP_2)"
                  class="defect-btn"
                >
                  {{ item.C_TOP_2 }}
                </button>
              </td>
              <td class="p-2">{{ item.C_TOP2 }}</td>
              <td class="p-2">
                <button 
                  v-if="item.C_TOP_3" 
                  @click="handleViewDefectTrend(item, item.C_TOP_3)"
                  class="defect-btn"
                >
                  {{ item.C_TOP_3 }}
                </button>
              </td>
              <td class="p-2">{{ item.C_TOP3 }}</td>
              
              <!-- S Top 缺點 -->
              <td class="p-2">
                <button 
                  v-if="item.S_TOP_1" 
                  @click="handleViewDefectTrend(item, item.S_TOP_1)"
                  class="defect-btn"
                >
                  {{ item.S_TOP_1 }}
                </button>
              </td>
              <td class="p-2">{{ item.S_TOP1 }}</td>
              <td class="p-2">
                <button 
                  v-if="item.S_TOP_2" 
                  @click="handleViewDefectTrend(item, item.S_TOP_2)"
                  class="defect-btn"
                >
                  {{ item.S_TOP_2 }}
                </button>
              </td>
              <td class="p-2">{{ item.S_TOP2 }}</td>
              <td class="p-2">
                <button 
                  v-if="item.S_TOP_3" 
                  @click="handleViewDefectTrend(item, item.S_TOP_3)"
                  class="defect-btn"
                >
                  {{ item.S_TOP_3 }}
                </button>
              </td>
              <td class="p-2">{{ item.S_TOP3 }}</td>
              
              <td class="text-left px-2">
                <div class="max-w-[120px] text-xs overflow-hidden text-ellipsis">
                  {{ item.Remark || '' }}
                </div>
              </td>
            </tr>
          </template>
        </CommonTable>
      </div>
      
      <!-- 無數據提示 -->
      <div v-else class="flex justify-center items-center h-40">
        <div class="text-center text-gray-500">
          <span class="block text-2xl mb-2">📊</span>
          <span>暫無 {{ station }} AOI 數據</span>
        </div>
      </div>
    </div>
  </DraggableModal>
</template>

<script setup>
import { computed, inject, ref, watch } from 'vue'
import DraggableModal from '../common/DraggableModal.vue'
import CommonTable from '../common/CommonTable.vue'

/**
 * AOI Table Modal 組件
 * 使用 inject 接收來自 YieldMonitorV2 的 aoiData
 */

// Inject AOI 數據
const aoiData = inject('aoiData')

// Props 定義 (保留必要的 props)
const props = defineProps({
  visible: {
    type: Boolean,
    required: true,
    default: false
  },
  station: {
    type: String,
    default: ''
  }
})

// Emits 定義
const emit = defineEmits(['update:visible', 'close', 'openMapping', 'viewDefectTrend'])

// 本地狀態 - 儲存選中的站點名稱
const selectedStation = ref(props.station)

// 監聽 station prop 變化
watch(() => props.station, (newStation) => {
  selectedStation.value = newStation
})

// 雙向綁定 visible
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// AOI 表格列定義
const columns = [
  { key: 'actions', title: '操作', width: '80px', sortable: false },
  { key: 'Factory', title: 'Factory', width: '80px', sortable: true },
  { key: 'LotType', title: 'Lot Type', width: '90px', sortable: true },
  { key: 'PartNo', title: 'Part No', width: '100px', sortable: true },
  { key: 'LotNum', title: 'Lot Num', width: '120px', sortable: true },
  { key: 'Layer', title: 'Layer', width: '80px', sortable: true },
  { key: 'pnl', title: 'PNL', width: '60px', sortable: true },
  { key: 'Triger', title: 'Trigger', width: '80px', sortable: true },
  { key: 'Target', title: 'Target', width: '80px', sortable: true },
  { key: 'Yield', title: 'Yield', width: '80px', sortable: true },
  { key: 'Bef_Yield', title: 'Bef Yield', width: '90px', sortable: true },
  { key: 'C_TOP_1', title: 'C Top 1', width: '80px', sortable: true },
  { key: 'C_TOP1', title: 'C1', width: '80px', sortable: true },
  { key: 'C_TOP_2', title: 'C Top 2', width: '80px', sortable: true },
  { key: 'C_TOP2', title: 'C2', width: '80px', sortable: true },
  { key: 'C_TOP_3', title: 'C Top 3', width: '80px', sortable: true },
  { key: 'C_TOP3', title: 'C3', width: '80px', sortable: true },
  { key: 'S_TOP_1', title: 'S Top 1', width: '80px', sortable: true },
  { key: 'S_TOP1', title: 'S1', width: '80px', sortable: true },
  { key: 'S_TOP_2', title: 'S Top 2', width: '80px', sortable: true },
  { key: 'S_TOP2', title: 'S2', width: '80px', sortable: true },
  { key: 'S_TOP_3', title: 'S Top 3', width: '80px', sortable: true },
  { key: 'S_TOP3', title: 'S3', width: '80px', sortable: true },
  { key: 'Remark', title: 'Remark', width: '150px', sortable: false }
]

// 事件處理方法
const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

const handleOpenMapping = async (item) => {
  console.log('🎯 [AoiTableModal] 開啟 Mapping:', item)
  
  try {
    // 直接調用 aoiData 的方法載入 Mapping 數據
    await aoiData.loadAoiLotData(item.LotNum, item.Layer)
    
    // 也可以發送事件通知父組件
    emit('openMapping', item)
  } catch (error) {
    console.error('❌ [AoiTableModal] 開啟 Mapping 失敗:', error)
    alert('開啟 AOI Mapping 失敗')
  }
}

const handleViewDefectTrend = (item, defectType) => {
  emit('viewDefectTrend', { item, defectType })
}

// 格式化方法
const formatPercent = (value) => {
  if (value === null || value === undefined) return 'N/A'
  return `${(value * 100).toFixed(2)}%`
}

const getYieldClass = (yieldValue, trigger) => {
  if (yieldValue === null || yieldValue === undefined) return ''
  if (trigger && yieldValue < trigger) return 'text-red-600 font-bold'
  return 'text-gray-600'
}

const getRowClass = (item) => {
  const classes = ['hover:bg-gray-50']
  if (item.Yield && item.Triger && item.Yield < item.Triger) {
    classes.push('bg-red-50')
  }
  return classes.join(' ')
}
</script>

<style scoped>
/* AOI 表格按鈕樣式強制覆蓋 */
.aoi-table-container button {
  border: none !important;
  cursor: pointer !important;
  display: inline-block !important;
  font-family: inherit !important;
}

/* Mapping 按鈕樣式 */
.aoi-table-container .mapping-btn {
  background-color: #75a8fa !important;
  color: white !important;
  padding: 0.25rem 0.75rem !important;
  font-size: 0.75rem !important;
  line-height: 1rem !important;
  border-radius: 0.25rem !important;
  font-weight: 500 !important;
  transition: background-color 0.2s !important;
}

.aoi-table-container .mapping-btn:hover {
  background-color: #2563eb !important;
}

/* 缺點趨勢按鈕樣式 */
.aoi-table-container .defect-btn {
  background-color: #73d1e0 !important;
  color: white !important;
  padding: 0.25rem 0.5rem !important;
  font-size: 0.75rem !important;
  line-height: 1rem !important;
  border-radius: 0.25rem !important;
  font-weight: 500 !important;
  min-width: 4rem !important;
  transition: background-color 0.2s !important;
}

.aoi-table-container .defect-btn:hover {
  background-color: #4b5563 !important;
}
</style>
