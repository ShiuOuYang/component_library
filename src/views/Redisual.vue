<template>
  <div class="">
    <!-- 標籤頁導航與登出 -->
    <div class="mb-4 flex justify-between items-center ">
      <TabNavigation :tabs="navigationTabs" font-size="text-xs" />
      <div class="flex items-center gap-2.5">
        <button
          @click="showIntroModal = true"
          class="px-3 py-2 bg-blue-100 hover:bg-blue-100 text-blue-700 text-xs rounded-lg transition-colors flex items-center gap-1.5"
          title="系統說明"
        >
          <span class="material-symbols-outlined" style="font-size: 16px;">help</span>
          <span>使用說明</span>
        </button>
        <button
          v-if="hasData"
          @click="showWeeklySummaryModal = true"
          class="px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs rounded-lg transition-colors flex items-center gap-1.5"
          title="週別彙總"
        >
          <span class="material-symbols-outlined" style="font-size: 16px;">summarize</span>
          <span>週別彙總</span>
        </button>
        <ExcelExporter 
          :data="formattedExportData"
          :columns="exportColumns"
          :cell-styles="exportCellStyles"
          filename="Redisual_Data_Export" 
        />
        <HeaderLogoutButton size="sm" variant="outline-gray" />
      </div>
    </div>

    <!-- 側邊欄組件 -->
    <PartNumberSidebar
      :visible="showSidebar"
      :part-numbers="partNumbers"
      :loading="loadingPartNumbers"
      :selected-part-number="partNumber"
      @toggle="showSidebar = $event"
      @select="selectPartNumber"
    />

    

    <!-- 錯誤訊息 -->
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div class="flex items-center">
        <span class="text-red-600">⚠️ {{ error }}</span>
      </div>
    </div>

    <!-- 無資料提示 -->
    <div v-if="!loading && !hasData && !error" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div class="flex items-center">
        <span class="text-yellow-600">ℹ️ 請輸入 Lot Number 並點擊查詢按鈕</span>
      </div>
    </div>

    <!-- 資料表格 -->
    <div v-if="hasData" class="bg-white rounded-lg shadow">
      <JxFixedTable
        :key="layerColumns.join(',')"
        :columns="tableColumns"
        :data="tableData"
        :viewport-offset="200"
        :show-search="true"
        :is-fixed="true"
        :is-keep="true"
        :is-filter="true"
        :is-pagination="true"
        v-model:fixed-columns="fixedColumns"
        v-model:filter-columns="filterColumns"
        v-model:search-text="searchText"
        header-font-size="xs"
        cell-font-size="xs"
      >
        
        <!-- 自定義 traceBacks 欄位 -->
        <template #td-traceBacks="{ row }">
          <div class="">
            <button
              @click="showTraceBacksModal(row.traceBacks)"
              class="text-blue-600 hover:text-blue-800 underline text-xs"
            >
              查看 ({{ row.traceBacks?.length || 0 }})
            </button>
          </div>
        </template>

        <!-- 數值欄位格式化 -->
        <template #td-product_yield="{ row }">
          <div class="text-center leading-none ">
            <span :class="getYieldColor(row.product_yield)">
              {{ formatPercent(row.product_yield) }}
            </span>
          </div>
        </template>

        <template #td-AOI_alive="{ row }">
          <div class="text-center leading-none ">
            <span :class="getYieldColor(row.AOI_alive)">
              {{ formatPercent(row.AOI_alive) }}
            </span>
          </div>
        </template>
        <template #td-aoi_stack="{ row }">
          <div class="text-center leading-none ">
            <span :class="getYieldColor(row.aoi_stack)">
              {{ formatPercent(row.aoi_stack) }}
            </span>
          </div>
        </template>
        <template #td-inline="{ row }">
          <div class="text-center py-1 leading-tight " :class="getYieldColor(row.inline,'Inline')">
            <span :class="getYieldColor(row.inline,'Inline')">
              {{ formatPercent(row.inline,'Inline') }}
            </span>
          </div>
        </template>
        <template #td-current_yield="{ row }">
          <div class="text-center leading-none ">
            <span :class="getYieldColor(row.current_yield)">
              {{ formatPercent(row.current_yield) }}
            </span>
          </div>
        </template>
        <template #td-OAY="{ row }">
          <div 
            class="relative text-center py-1 leading-tight" 
            :class="getYieldColor(row.OAY,'OAY')"
          >
            <span :class="getYieldColor(row.OAY,'OAY')">
              {{ formatPercent(row.OAY,'OAY',row) }}
            </span>
          </div>
        </template>

        <!-- Layer 欄位格式化 -->
        <template v-for="layer in layerColumns" :key="`template-${layer}`" #[`td-${layer}`]="{ row }">
          <div 
            class="relative text-center py-1 leading-tight" 
            :class="getYieldColor(row[layer],layer,row[layer+'_time'])"
          >
            <span :class="getYieldColor(row[layer],layer)">
              {{ formatPercent(row[layer],layer,row) }}
            </span>
            <!-- 右上角 info 圖示：顯示詳細 Tooltip，有母批時變色 -->
            <span 
              v-if="row[layer+'_time']"
              class="material-symbols-outlined absolute top-0.5 right-0.5 cursor-help opacity-70 hover:opacity-100 pointer-events-auto transition-opacity"
              :class="getParentLot(row, layer) ? 'text-amber-400 hover:text-amber-600' : 'text-gray-400 hover:text-gray-600'"
              style="font-size: 15px !important; line-height: 1;"
              @mouseenter="(e) => handleTooltipEnter(e, row, layer)"
              @mouseleave="handleTooltipLeave"
              @click.stop="(e) => handleTooltipClick(e, row, layer)"
            >info</span>
          </div>
        </template>

        <!-- 時間欄位格式化 -->
        <template #td-rlsTime="{ row }">
          <div class=" text-center text-xs">
            {{ formatDateTime(row.rlsTime) }}
          </div>
        </template>
      </JxFixedTable>
    </div>

    <!-- TraceBack Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click="showModal = false">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6" @click.stop>
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-gray-800">TraceBack 資訊</h3>
          <button @click="showModal = false" class="text-gray-500 hover:text-gray-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="overflow-auto max-h-96">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700">Layer</th>
                <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700">Lot Number</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="(item, index) in modalData" :key="index" class="hover:bg-gray-50">
                <td class="px-4 py-2 text-sm text-gray-900">{{ item.layer }}</td>
                <td class="px-4 py-2 text-sm text-gray-900">{{ item.lotnum }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tooltip -->
    <AoiMappingProvider ref="aoiMappingProviderRef">
      <CommonTooltip
        :visible="tooltipVisible"
        :position="tooltipPosition"
        :data="tooltipData"
        :show-arrow="false"
        :theme="'light'"
        :interactive="isTooltipPinned"
        strategy="absolute"
        max-width="xl"
      >
        <template #default="{ data }">
          <div class="relative">
            <button 
              v-if="isTooltipPinned" 
              @click="closeTooltip" 
              class="absolute -top-4 -left-4 p-1 text-gray-500 hover:text-gray-700 z-50 rounded-full hover:bg-gray-100 transition-colors"
              title="關閉"
            >
              <span class="material-symbols-outlined" style="font-size: 18px !important;">close</span>
            </button>
            <YieldTooltipContent :data="data" />
          </div>
        </template>
      </CommonTooltip>
    </AoiMappingProvider>

    <!-- 週別彙總 Modal -->
    <WeeklySummaryModal
      v-model="showWeeklySummaryModal"
      :summary-data="weeklySummaryData"
      :columns="summaryTableColumns"
      :otd-summary-data="otdSummaryData"
      :otd-columns="otdSummaryTableColumns"
      :yield-column-keys="yieldColumnKeys"
      :get-yield-color="getYieldColor"
      :format-percent="formatPercent"
    />

    <!-- 系統說明 Modal -->
    <RedisualIntroModal v-model="showIntroModal" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import ExcelExporter from '../components/common/ExcelExporter.vue'
import JxFixedTable from '../components/common/JxFixedTable.vue'
import CommonTooltip from '../components/common/CommonTooltip.vue'
import YieldTooltipContent from '../components/yield/YieldTooltipContent.vue'
import AoiMappingProvider from '../components/aoi/AoiMappingProvider.vue'
import TabNavigation from '../components/common/TabNavigation.vue'
import PartNumberSidebar from '../components/redisual/PartNumberSidebar.vue'
import HeaderLogoutButton from '../components/common/HeaderLogoutButton.vue'
import RedisualIntroModal from '../components/redisual/RedisualIntroModal.vue'
import WeeklySummaryModal from '../components/redisual/WeeklySummaryModal.vue'
import { useRedisualData } from '../composables/redisual/useRedisualData.js'
import { useRedisualApi } from '../composables/redisual/useRedisualApi.js'
import { useYieldTooltip } from '../composables/yield/useYieldTooltip.js'
import { useWeeklySummary } from '../composables/redisual/useWeeklySummary.js'

// 導航標籤配置
const navigationTabs = [
  { path: '/redisual', label: 'WIP' },
  { path: '/predict-yield', label: '預估良率設定(料號)' }
]

// 使用 Redisual composable
const redisualData = useRedisualData()
const redisualApi = useRedisualApi()

// 從 composable 解構所需的數據和方法
const {
  redisualData: tableData,
  currentPartNumber,
  loading,
  error,
  hasData,
  layerColumns,
  tableColumns,
  searchRedisualData,
  formatPercent,
  formatDateTime,
  getYieldColor,
  currentProcess
} = redisualData

// 搜尋狀態
const searchText = ref('')

// 本地狀態
const partNumber = ref('2616453')
const fixedColumns = ref(['partNumber'])
const filterColumns = ref([])

// 側邊欄相關
const showSidebar = ref(false)
const partNumbers = ref('2616453')
const loadingPartNumbers = ref(false)

// Modal 相關
const showModal = ref(false)
const modalData = ref([])
const showIntroModal = ref(false)
const showWeeklySummaryModal = ref(false)

// 週別彙總
const { weeklySummaryData, summaryTableColumns, yieldColumnKeys, otdSummaryData, otdSummaryTableColumns } = useWeeklySummary(tableData, currentProcess, formatPercent)

// Tooltip 相關（使用可複用 composable）
const aoiMappingProviderRef = ref(null)
const {
  tooltipVisible,
  isTooltipPinned,
  tooltipPosition,
  tooltipData,
  handleTooltipEnter,
  handleTooltipClick,
  handleTooltipLeave,
  closeTooltip,
  getParentLot
} = useYieldTooltip({
  partNumber,
  aoiMappingProviderRef,
  buildTooltipData: (row, layer, parentLot) => ({
    raw: {
      part_rev: partNumber.value,
      lotnum: row.lotnum || 'Unknown',
      parentLot: parentLot || 'Unknown'
    },
    layerName: layer,
    timestamp: row[layer + '_time'],
    yield: row[layer] * 100,
    station: layer.includes('FB') ? 'Core' : row[layer]
  }),
  shouldLoadAoi: (layer) => layer.includes('FB')
})

// 載入料號清單
const loadPartNumbers = async () => {
  try {
    loadingPartNumbers.value = true
    const result = await redisualApi.fetchPartNumberList()
    if (result.status === 200) {
      partNumbers.value = result.data
      console.log('✅ 料號清單載入成功，共', partNumbers.value.length, '個')
    }
  } catch (err) {
    console.error('❌ 載入料號清單失敗:', err)
  } finally {
    loadingPartNumbers.value = false
  }
}

// 選擇料號
const selectPartNumber = (pn) => {
  partNumber.value = pn
  showSidebar.value = false
  fetchData()
}

// 獲取資料
const fetchData = async () => {
  const success = await searchRedisualData(partNumber.value)
  if (success) {
    console.log('✅ 資料載入成功')
  }
}

// 顯示 TraceBack Modal
const showTraceBacksModal = (traceBacks) => {
  modalData.value = traceBacks || []
  showModal.value = true
}

// 初始化
onMounted(async () => {
  await loadPartNumbers()
  await fetchData()
})

// 格式化匯出資料
const formattedExportData = computed(() => {
  if (!tableData.value || tableData.value.length === 0 || !currentProcess.value) return []
  
  return tableData.value.map((row, rowIndex) => {
    // 按照 tableColumns 的順序建立匯出資料
    const formatted = {
      // 基礎欄位
      料號: row.part_number || '',
      批號: row.lotnum || '',
      發料顆數: row.rls_unit || '',
      現在顆數: row.available_units || '',
      預估出貨數: row.estimated_shipment || '',
      入庫週別: row.OAY_week || '',
      站點: row.current_proccode || '',
      Layer: row.current_layer || ''
    }
    
    // 按照 tableColumns 的順序添加動態工序欄位
    // 1. 先添加 Core/Bu 工序（Store 已排序，直接使用）
    const coreColumns = currentProcess.value
      .filter(p => p.process === 'Bu' || p.process === 'Core')
      .map(p => p.fb)
    
    coreColumns.forEach(layer => {
      const value = row[layer]
      formatted[layer] = formatPercent(value, layer, row)
    })
    
    // 2. 添加 AOI 欄位
    formatted['aoi_stack'] = formatPercent(row.aoi_stack, 'aoi_stack', row)
    formatted['AOI_alive'] = formatPercent(row.AOI_alive, 'AOI_alive', row)
    
    // 3. 添加其他工序欄位（按照 Table 的 processedList 順序）
    const processedList = ['OST', 'BDT', 'FLI', 'BUMP', 'CC', 'VI', 'WPG']
    const otherColumns = currentProcess.value
      .filter(p => p.process !== 'Bu' && p.process !== 'Core' && p.process !== 'Inline' && p.process !== 'OST-')
      .slice() // 複製陣列避免修改原陣列
      .sort((a, b) => {
        const indexA = processedList.indexOf(a.fb)
        const indexB = processedList.indexOf(b.fb)
        return indexA - indexB
      })
      .map(p => p.fb)
    
    otherColumns.forEach(layer => {
      let value = row[layer]
      
      // OST 補值邏輯
      if ((value === null || value === undefined) && layer === 'OST') {
        let reduce = currentProcess.value.filter(p => p.fb === 'OST-')[0]?.default_yield
        if (reduce !== undefined && row.aoi_stack !== null && row.aoi_stack !== undefined) {
          value = row.aoi_stack - reduce
        }
      }
      
      formatted[layer] = formatPercent(value, layer, row)
    })
    
    // 4. 添加 Inline
    const inlineValue = row['inline'] !== null && row['inline'] !== undefined 
      ? row['inline'] 
      : row['Inline']
    formatted['Inline'] = formatPercent(inlineValue, 'Inline', row)
    
    // 5. 添加最終欄位
    formatted['PY'] = formatPercent(row.product_yield, 'PY', row)
    formatted['OAY'] = formatPercent(row.OAY, 'OAY', row)
    formatted['OTD'] = row.otd || ''
    
    return formatted
  })
})

// 定義 Excel 匯出的欄位順序（明確指定，避免 Object.keys() 的排序問題）
const exportColumns = computed(() => {
  if (!currentProcess.value) return []
  
  const columns = []
  
  // 1. 基礎欄位
  columns.push(
    { key: '料號', title: '料號' },
    { key: '批號', title: '批號' },
    { key: '發料顆數', title: '發料顆數' },
    { key: '現在顆數', title: '現在顆數' },
    { key: '預估出貨數', title: '預估出貨數' },
    { key: '入庫週別', title: '入庫週別' },
    { key: '站點', title: '站點' },
    { key: 'Layer', title: 'Layer' }
  )
  
  // 2. Core/Bu 工序（Store 已排序）
  const coreColumns = currentProcess.value
    .filter(p => p.process === 'Bu' || p.process === 'Core')
    .map(p => ({ key: p.fb, title: p.fb }))
  console.log('📊 Redisual exportColumns - currentProcess 中的 FB 順序:', 
    currentProcess.value.filter(p => p.process === 'Bu' || p.process === 'Core').map(p => p.fb))
  console.log('📊 Redisual exportColumns - coreColumns 順序:', coreColumns.map(c => c.key))
  columns.push(...coreColumns)
  
  // 3. AOI 欄位
  columns.push(
    { key: 'aoi_stack', title: 'aoi_stack' },
    { key: 'AOI_alive', title: 'AOI_alive' }
  )
  
  // 4. 其他工序欄位
  const processedList = ['OST', 'BDT', 'FLI', 'BUMP', 'CC', 'VI', 'WPG']
  const otherColumns = currentProcess.value
    .filter(p => p.process !== 'Bu' && p.process !== 'Core' && p.process !== 'Inline' && p.process !== 'OST-')
    .slice()
    .sort((a, b) => {
      const indexA = processedList.indexOf(a.fb)
      const indexB = processedList.indexOf(b.fb)
      return indexA - indexB
    })
    .map(p => ({ key: p.fb, title: p.fb }))
  columns.push(...otherColumns)
  
  // 5. Inline
  columns.push({ key: 'Inline', title: 'Inline' })
  
  // 6. 最終欄位
  columns.push(
    { key: 'PY', title: 'PY' },
    { key: 'OAY', title: 'OAY' },
    { key: 'OTD', title: 'OTD' }
  )
  
  return columns
})

// 計算需要套用樣式的儲存格（補值邏輯）
const exportCellStyles = computed(() => {
  if (!tableData.value || tableData.value.length === 0 || !currentProcess.value) return []
  
  const styles = []
  const grayStyle = {
    fill: { 
      patternType: "solid",
      fgColor: { rgb: "D1D5DB" } 
    },
    font: { 
      color: { rgb: "6B7280" } 
    }
  }
  
  tableData.value.forEach((row, rowIndex) => {
    // 檢查基礎欄位（使用格式化後的鍵名）
    const fieldsToCheck = [
      { key: 'PY', rawKeys: ['product_yield'] },
      { key: 'AOI_alive', rawKeys: ['AOI_alive'] },
      { key: 'aoi_stack', rawKeys: ['aoi_stack'] },
      { key: 'OAY', rawKeys: ['OAY'] }
    ]
    
    fieldsToCheck.forEach(({ key, rawKeys }) => {
      // 檢查所有可能的原始鍵名，找到第一個非 null/undefined 的值
      const originalValue = rawKeys.map(k => row[k]).find(v => v !== null && v !== undefined)
      const formattedValue = formattedExportData.value[rowIndex]?.[key]
      const isNull = originalValue === null || originalValue === undefined
      
      if (isNull && formattedValue && formattedValue !== '-') {
        styles.push({
          row: rowIndex,
          col: key,
          style: grayStyle
        })
      }
    })
    
    // 檢查所有工序欄位
    const allProcessColumns = [
      // Core/Bu 工序
      ...(currentProcess.value.filter(p => p.process === 'Bu' || p.process === 'Core').map(p => p.fb)),
      // 其他工序
      ...(currentProcess.value.filter(p => p.process !== 'Bu' && p.process !== 'Core' && p.process !== 'Inline' && p.process !== 'OST-').map(p => p.fb)),
      // Inline
      'Inline'
    ]
    
    allProcessColumns.forEach(layer => {
      // Inline 特殊處理：檢查 inline 和 Inline 兩個鍵
      const rawKeys = layer === 'Inline' ? ['inline', 'Inline'] : [layer]
      const originalValue = rawKeys.map(k => row[k]).find(v => v !== null && v !== undefined)
      const formattedValue = formattedExportData.value[rowIndex]?.[layer]
      const isNull = originalValue === null || originalValue === undefined

      if (isNull && formattedValue && formattedValue !== '-') {
        styles.push({
          row: rowIndex,
          col: layer,
          style: grayStyle
        })
      }
    })
  })
  
  return styles
})

</script>
