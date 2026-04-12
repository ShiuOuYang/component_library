<template>
  <div class="component-preview">
    <!-- 通用表格預覽 -->
    <div v-if="component.id === 'common-table'" class="preview-item">
      <div class="preview-demo">
        <CommonTable 
          :data="tableData"
          :columns="tableColumns"
          :default-page-size="5"
          search-placeholder="搜尋員工..."
          @search="handleTableSearch"
          @sort="handleTableSort"
        />
      </div>
      <div class="preview-controls">
        <button class="control-button" @click="showNotification('點擊了表格行')">
          <i class="fas fa-table"></i>
          行點擊測試
        </button>
        <button class="control-button secondary" @click="showNotification('表格支持排序和篩選')">
          <i class="fas fa-sort"></i>
          排序測試
        </button>
      </div>
    </div>

    <!-- 甘特圖預覽 -->
    <div v-else-if="component.id === 'gantt-chart'" class="preview-item">
      <div class="preview-demo">
        <GantChart 
          :data="ganttChartData"
          :time="ganttTimeRange"
          @task-click="handleGanttTaskClick"
        />
      </div>
      <div class="preview-controls">
        <button class="control-button" @click="showNotification('點擊了甘特圖任務')">
          <i class="fas fa-chart-bar"></i>
          任務點擊測試
        </button>
        <button class="control-button secondary" @click="showNotification('甘特圖支持任務拖拽調整')">
          <i class="fas fa-edit"></i>
          編輯測試
        </button>
      </div>
    </div>

    <!-- 簡化甘特圖預覽 -->
    <div v-else-if="component.id === 'simple-gantt-chart'" class="preview-item">
      <div class="preview-demo">
        <SimpleGantChart 
          :data="simpleGanttChartData"
          :time="simpleGanttTimeRange"
          @task-click="handleSimpleGanttTaskClick"
        />
      </div>
      <div class="preview-controls">
        <button class="control-button" @click="showNotification('點擊了簡化甘特圖')">
          <i class="fas fa-chart-line"></i>
          點擊測試
        </button>
      </div>
    </div>

    <!-- 進階甘特圖預覽 -->
    <div v-else-if="component.id === 'gantt-chart-2'" class="preview-item">
      <div class="preview-demo">
        <GantChart2 
          :data="gantt2ChartData"
          :time="gantt2TimeRange"
          @task-click="handleGantt2TaskClick"
        />
      </div>
      <div class="preview-controls">
        <button class="control-button" @click="showNotification('點擊了進階甘特圖')">
          <i class="fas fa-project-diagram"></i>
          項目點擊測試
        </button>
        <button class="control-button secondary" @click="showNotification('支持任務拖拽')">
          <i class="fas fa-arrows-alt"></i>
          拖拽測試
        </button>
      </div>
    </div>

    <!-- 通用堆疊圖表預覽 -->
    <div v-else-if="component.id === 'universal-stacked-chart'" class="preview-item">
      <div class="preview-demo">
        <UniversalStackedChart 
          :data="stackedChartData"
          :stack-keys="['value1', 'value2', 'value3']"
          @bar-click="handleStackedChartClick"
        />
      </div>
      <div class="preview-controls">
        <button class="control-button" @click="showNotification('點擊了堆疊圖表')">
          <i class="fas fa-chart-area"></i>
          點擊測試
        </button>
        <button class="control-button secondary" @click="showNotification('支持多種圖表類型')">
          <i class="fas fa-exchange-alt"></i>
          切換類型
        </button>
      </div>
    </div>

    <!-- 可拖拽模態框預覽 -->
    <div v-else-if="component.id === 'draggable-modal'" class="preview-item">
      <div class="preview-demo">
        <button class="demo-button" @click="showModal = true">
          <i class="fas fa-window-maximize"></i>
          打開可拖拽模態框
        </button>
        <DraggableModal 
          v-model="showModal"
          :title="'可拖拽模態框演示'"
          :draggable="true"
          @close="showModal = false"
          @confirm="handleModalConfirm"
        >
          <div class="modal-content">
            <p>這是一個可拖拽的模態框示例，您可以拖拽標題欄來移動位置。</p>
            <div class="modal-actions">
              <button class="btn btn-primary" @click="showModal = false">確認</button>
              <button class="btn btn-secondary" @click="showModal = false">取消</button>
            </div>
          </div>
        </DraggableModal>
      </div>
      <div class="preview-controls">
        <button class="control-button" @click="showModal = true">
          <i class="fas fa-window-maximize"></i>
          打開模態框
        </button>
        <button class="control-button secondary" @click="showNotification('模態框支持拖拽移動')">
          <i class="fas fa-arrows-alt"></i>
          拖拽測試
        </button>
      </div>
    </div>

    <!-- 篩選下拉框預覽 -->
    <div v-else-if="component.id === 'filter-dropdown'" class="preview-item">
      <div class="preview-demo">
        <FilterDropdown 
          :label="'部門篩選'"
          :options="filterOptions"
          v-model="selectedFilterOptions"
          :placeholder="'選擇部門'"
        />
      </div>
      <div class="preview-controls">
        <button class="control-button" @click="showNotification('篩選條件已變更')">
          <i class="fas fa-filter"></i>
          篩選測試
        </button>
        <button class="control-button secondary" @click="selectedFilterOptions = []">
          <i class="fas fa-times"></i>
          清空選擇
        </button>
      </div>
    </div>

    <!-- 標籤篩選下拉框預覽 -->
    <div v-else-if="component.id === 'tag-filter-dropdown'" class="preview-item">
      <div class="preview-demo">
        <TagFilterDropdown 
          :options="tagFilterOptions.map(t => t.name)"
          v-model="selectedTags"
          :placeholder="'選擇標籤'"
          @update:model-value="handleTagSelect"
        />
      </div>
      <div class="preview-controls">
        <button class="control-button" @click="showNotification('標籤篩選已變更')">
          <i class="fas fa-tags"></i>
          標籤測試
        </button>
        <button class="control-button secondary" @click="selectedTags = []">
          <i class="fas fa-times"></i>
          清空標籤
        </button>
      </div>
    </div>

    <!-- 時間篩選器預覽 -->
    <div v-else-if="component.id === 'time-filter'" class="preview-item">
      <div class="preview-demo">
        <TimeFilter 
          v-model="timeFilterValue"
          @time-selected="handleTimeFilterChange"
        />
      </div>
      <div class="preview-controls">
        <button class="control-button" @click="showNotification('時間範圍已選擇')">
          <i class="fas fa-clock"></i>
          時間選擇測試
        </button>
        <button class="control-button secondary" @click="resetDates">
          <i class="fas fa-undo"></i>
          重置日期
        </button>
      </div>
    </div>

    <!-- Excel 導出器預覽 -->
    <div v-else-if="component.id === 'excel-exporter'" class="preview-item">
      <div class="preview-demo">
        <ExcelExporter 
          :data="excelExportData"
          :columns="excelExportColumns"
          @export-complete="handleExcelExport"
        />
      </div>
      <div class="preview-controls">
        <button class="control-button" @click="showNotification('開始導出 Excel 文件')">
          <i class="fas fa-download"></i>
          導出測試
        </button>
        <button class="control-button secondary" @click="showNotification('支持多種導出格式')">
          <i class="fas fa-cog"></i>
          格式設置
        </button>
      </div>
    </div>

    <!-- 全局通知預覽 -->
    <div v-else-if="component.id === 'global-notifications'" class="preview-item">
      <div class="preview-demo">
        <GlobalNotifications />
        <button class="demo-button" @click="addNotification">
          <i class="fas fa-bell"></i>
          添加通知
        </button>
      </div>
      <div class="preview-controls">
        <button class="control-button" @click="addNotification">
          <i class="fas fa-bell"></i>
          通知測試
        </button>
        <button class="control-button secondary" @click="showNotification('通知支持自動消失')">
          <i class="fas fa-clock"></i>
          定時測試
        </button>
      </div>
    </div>

    <!-- 通用選擇器預覽 -->
    <div v-else-if="component.id === 'universal-selector'" class="preview-item">
      <div class="preview-demo">
        <UniversalSelector 
          :options="universalSelectorOptions"
          v-model="selectedValue"
          :placeholder="'選擇選項'"
          @change="handleUniversalSelectorChange"
        />
      </div>
      <div class="preview-controls">
        <button class="control-button" @click="showNotification('選擇器已變更')">
          <i class="fas fa-list"></i>
          選擇測試
        </button>
        <button class="control-button secondary" @click="selectedValue = null">
          <i class="fas fa-times"></i>
          清空選擇
        </button>
      </div>
    </div>

    <!-- 數據類型選擇器預覽 -->
    <div v-else-if="component.id === 'data-type-selector'" class="preview-item">
      <div class="preview-demo">
        <DataTypeSelector 
          v-model="selectedDataType"
          @change="handleDataTypeChange"
        />
      </div>
      <div class="preview-controls">
        <button class="control-button" @click="showNotification('數據類型已變更')">
          <i class="fas fa-database"></i>
          類型測試
        </button>
      </div>
    </div>

    <!-- 圖表堆疊選擇器預覽 -->
    <div v-else-if="component.id === 'chart-stack-selector'" class="preview-item">
      <div class="preview-demo">
        <ChartStackSelector 
          v-model="selectedChartStack"
          @change="handleChartStackChange"
        />
      </div>
      <div class="preview-controls">
        <button class="control-button" @click="showNotification('堆疊方式已變更')">
          <i class="fas fa-layer-group"></i>
          堆疊測試
        </button>
      </div>
    </div>

    <!-- 堆疊鍵切換器預覽 -->
    <div v-else-if="component.id === 'stack-key-toggle'" class="preview-item">
      <div class="preview-demo">
        <StackKeyToggle 
          v-model="stackKeyEnabled"
          @change="handleStackKeyToggle"
        />
      </div>
      <div class="preview-controls">
        <button class="control-button" @click="showNotification('堆疊鍵已切換')">
          <i class="fas fa-toggle-on"></i>
          切換測試
        </button>
      </div>
    </div>

    <!-- 快速操作預覽 -->
    <div v-else-if="component.id === 'quick-actions'" class="preview-item">
      <div class="preview-demo">
        <QuickActions />
      </div>
      <div class="preview-controls">
        <button class="control-button" @click="showNotification('快速操作已點擊')">
          <i class="fas fa-bolt"></i>
          操作測試
        </button>
      </div>
    </div>

    <!-- 應用佈局預覽 -->
    <div v-else-if="component.id === 'app-layout'" class="preview-item">
      <div class="preview-demo">
        <AppLayout>
          <div class="p-4">
            <h3 class="font-semibold mb-2">主要內容區域</h3>
            <p class="text-sm text-gray-600">這是主要內容區域的示例</p>
          </div>
        </AppLayout>
      </div>
      <div class="preview-controls">
        <button class="control-button" @click="showNotification('佈局組件已加載')">
          <i class="fas fa-th-large"></i>
          佈局測試
        </button>
        <button class="control-button secondary" @click="showNotification('側邊欄已切換')">
          <i class="fas fa-bars"></i>
          側邊欄切換
        </button>
      </div>
    </div>

    <!-- 默認預覽 -->
    <div v-else class="preview-item">
      <div class="preview-demo">
        <div class="default-preview">
          <i :class="component.icon + ' text-4xl text-gray-400 mb-4'"></i>
          <h4 class="text-lg font-semibold text-gray-700 mb-2">{{ component.name }}</h4>
          <p class="text-gray-500 text-sm">{{ component.description }}</p>
          <div class="mt-4 p-3 bg-blue-50 rounded-lg">
            <p class="text-sm text-blue-700">組件預覽功能開發中</p>
            <p class="text-xs text-blue-600 mt-1">請查看文檔了解詳細用法</p>
          </div>
        </div>
      </div>
      <div class="preview-controls">
        <button class="control-button" @click="showNotification('組件功能演示')">
          <i class="fas fa-play"></i>
          功能演示
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import CommonTable from './common/CommonTable.vue'
import GantChart from './GantChart.vue'
import SimpleGantChart from './SimpleGantChart.vue'
import GantChart2 from './GantChart2.vue'
import UniversalStackedChart from './UniversalStackedChart.vue'
import DraggableModal from './common/DraggableModal.vue'
import FilterDropdown from './common/FilterDropdown.vue'
import TagFilterDropdown from './common/TagFilterDropdown.vue'
import TimeFilter from './TimeFilter.vue'
import ExcelExporter from './common/ExcelExporter.vue'
import GlobalNotifications from './GlobalNotifications.vue'
import UniversalSelector from './UniversalSelector.vue'
import DataTypeSelector from './DataTypeSelector.vue'
import ChartStackSelector from './ChartStackSelector.vue'
import StackKeyToggle from './StackKeyToggle.vue'
import QuickActions from './QuickActions.vue'
import AppLayout from './AppLayout.vue'

// Props
const props = defineProps({
  component: {
    type: Object,
    required: true
  }
})

// 響應式數據
const showModal = ref(false)
const selectedTags = ref(['技術部'])
const selectedFilterOptions = ref([])

// 表格相關數據
const tableSearchQuery = ref('')
const tablePageSize = ref(10)

// 表格數據和列配置
const tableData = ref([
  { name: '張三', position: '前端工程師', department: '技術部', status: '在職' },
  { name: '李四', position: '產品經理', department: '產品部', status: '在職' },
  { name: '王五', position: 'UI設計師', department: '設計部', status: '離職' },
  { name: '趙六', position: '後端工程師', department: '技術部', status: '在職' }
])

const tableColumns = ref([
  { key: 'name', label: '姓名', sortable: true },
  { key: 'position', label: '職位', sortable: true },
  { key: 'department', label: '部門', sortable: true },
  { key: 'status', label: '狀態', sortable: true }
])

// 篩選選項
const filterOptions = ref([
  '技術部',
  '產品部',
  '設計部'
])

// 標籤篩選選項
const tagFilterOptions = ref([
  { id: 1, name: '技術部', color: 'blue' },
  { id: 2, name: '產品部', color: 'green' },
  { id: 3, name: '設計部', color: 'purple' },
  { id: 4, name: '市場部', color: 'orange' }
])

// 時間篩選器數據
const timeFilterValue = ref({
  mode: 'current',
  dateTime: null
})

// 甘特圖數據
const ganttChartData = ref({
  '項目A': {
    '開發': [
      { content: '需求分析', start: '2024-01-01', end: '2024-01-15', progress: 100 },
      { content: '設計階段', start: '2024-01-10', end: '2024-02-01', progress: 80 },
      { content: '開發階段', start: '2024-01-20', end: '2024-03-15', progress: 60 }
    ]
  }
})

const ganttTimeRange = ref([
  { year: 2024, month: 1 },
  { year: 2024, month: 3 }
])

const simpleGanttChartData = ref({
  '簡化項目': {
    '任務': [
      { content: '任務1', start: '2024-01-01', end: '2024-01-10' },
      { content: '任務2', start: '2024-01-05', end: '2024-01-20' }
    ]
  }
})

const simpleGanttTimeRange = ref([
  { year: 2024, month: 1 },
  { year: 2024, month: 2 }
])

const gantt2ChartData = ref({
  '進階項目': [
    { content: '項目A', start: '2024-01-01', end: '2024-02-01' },
    { content: '項目B', start: '2024-01-15', end: '2024-02-15' }
  ]
})

const gantt2TimeRange = ref([
  { year: 2024, month: 1 },
  { year: 2024, month: 2 }
])

// 堆疊圖表數據
const stackedChartData = ref([
  { category: 'Q1', value1: 100, value2: 80, value3: 60 },
  { category: 'Q2', value1: 120, value2: 90, value3: 70 },
  { category: 'Q3', value1: 90, value2: 110, value3: 80 },
  { category: 'Q4', value1: 140, value2: 100, value3: 90 }
])



// 通用選擇器選項
const universalSelectorOptions = ref([
  { value: 'option1', label: '選項1' },
  { value: 'option2', label: '選項2' },
  { value: 'option3', label: '選項3' }
])

const selectedValue = ref(null)

// 數據類型選擇器
const selectedDataType = ref('string')

// 圖表堆疊選擇器
const selectedChartStack = ref('normal')

// 堆疊鍵切換器
const stackKeyEnabled = ref(false)





// Excel 導出數據
const excelExportData = ref([
  { name: '張三', position: '前端工程師', department: '技術部' },
  { name: '李四', position: '產品經理', department: '產品部' },
  { name: '王五', position: 'UI設計師', department: '設計部' }
])

const excelExportColumns = ref([
  { key: 'name', title: '姓名' },
  { key: 'position', title: '職位' },
  { key: 'department', title: '部門' }
])

// 方法
const showNotification = (message) => {
  console.log('通知:', message)
  alert(message)
}

const handleModalConfirm = () => {
  showModal.value = false
  showNotification('模態框已確認')
}

const handleTableRowClick = (row) => {
  showNotification(`點擊了 ${row.name} 的行`)
}

const handleTableSearch = (query) => {
  showNotification(`搜尋: ${query}`)
}

const handleTableSort = (column, direction) => {
  showNotification(`排序: ${column} ${direction}`)
}

const handleTagSelect = (tags) => {
  showNotification(`選擇的標籤: ${tags.join(', ')}`)
}

const handleTimeFilterChange = (value) => {
  showNotification(`時間篩選變更: ${value.mode} ${value.dateTime ? value.dateTime.toLocaleString() : ''}`)
}

const handleGanttTaskClick = (task) => {
  showNotification(`點擊了甘特圖任務: ${task.name}`)
}

const handleSimpleGanttTaskClick = (task) => {
  showNotification(`點擊了簡化甘特圖任務: ${task.name}`)
}

const handleGantt2TaskClick = (task) => {
  showNotification(`點擊了進階甘特圖任務: ${task.name}`)
}

const handleStackedChartClick = (data) => {
  showNotification(`點擊了堆疊圖表: ${data.category}`)
}

const handleUniversalSelectorChange = (value) => {
  showNotification(`選擇器變更: ${value}`)
}

const handleDataTypeChange = (type) => {
  showNotification(`數據類型變更: ${type}`)
}

const handleChartStackChange = (stack) => {
  showNotification(`圖表堆疊變更: ${stack}`)
}

const handleStackKeyToggle = (enabled) => {
  showNotification(`堆疊鍵切換: ${enabled ? '開啟' : '關閉'}`)
}





const handleExcelExport = (data) => {
  showNotification('Excel 文件導出成功')
}

const addNotification = () => {
  showNotification('添加了一個測試通知')
}

const resetDates = () => {
  timeFilterValue.value = {
    mode: 'current',
    dateTime: null
  }
  showNotification('日期已重置')
}
</script>

<style scoped>
.component-preview {
  width: 100%;
}

.preview-item {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preview-demo {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-controls {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.control-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.control-button:hover {
  background: #2563eb;
}

.control-button.secondary {
  background: #6b7280;
}

.control-button.secondary:hover {
  background: #4b5563;
}

.demo-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.demo-button:hover {
  background: #059669;
}

.modal-content {
  padding: 1rem;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.demo-header {
  padding: 1rem;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
}

.demo-sidebar {
  padding: 1rem;
  background: #f9fafb;
  min-height: 200px;
}

.sidebar-item {
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.sidebar-item:hover {
  background: #f3f4f6;
}

.demo-main {
  padding: 2rem;
  background: white;
  min-height: 200px;
}

.default-preview {
  text-align: center;
  color: #6b7280;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .preview-controls {
    flex-direction: column;
    align-items: center;
  }
  
  .control-button {
    width: 100%;
    max-width: 200px;
    justify-content: center;
  }
}
</style>
