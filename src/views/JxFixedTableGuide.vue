<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- 標題區 -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">JxFixedTable 使用指南</h1>
        <p class="text-lg text-gray-600">
          一個功能強大的 Vue 3 表格元件，支援欄位固定、過濾和搜尋功能
        </p>
      </div>

      <!-- 目錄導航 -->
      <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">快速導航</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            v-for="section in sections"
            :key="section.id"
            @click="scrollToSection(section.id)"
            class="p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all"
          >
            <div class="flex items-center gap-2">
              <JxIcon :color="section.color" size="24">{{ section.icon }}</JxIcon>
              <span class="font-medium text-gray-700">{{ section.title }}</span>
            </div>
          </a>
        </div>
      </div>

      <!-- 基本用法 -->
      <section id="basic-usage" class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <JxIcon color="blue-500" size="28">rocket_launch</JxIcon>
          基本用法
        </h2>
        <div class="mb-6">
          <h3 class="text-lg font-medium text-gray-700 mb-3">簡單範例</h3>
          <div class="bg-gray-50 rounded p-4 mb-4">
            <pre class="text-sm overflow-x-auto"><code>&lt;JxFixedTable
  :columns="columns"
  :data="data"
  :is-fixed="true"
  :viewport-offset="200"
/&gt;</code></pre>
          </div>
          <JxFixedTable
            :columns="basicColumns"
            :data="basicData"
            :is-fixed="true"
            :viewport-offset="200"
          />
        </div>
      </section>

      <!-- 欄位固定功能 -->
      <section id="column-fixing" class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <JxIcon color="green-500" size="28">push_pin</JxIcon>
          欄位固定功能
        </h2>
        <div class="mb-4 p-4 bg-blue-50 rounded-lg">
          <p class="text-gray-700">
            <strong>💡 提示：</strong>將滑鼠移到表頭，點擊右上角的圖釘圖示即可固定/取消固定欄位
          </p>
        </div>
        <JxFixedTable
          :columns="fixingColumns"
          :data="basicData"
          :is-keep="true"
          :is-fixed="true"
          :viewport-offset="200"
          v-model:fixed-columns="fixedCols"
        />
        <div class="mt-4 p-4 bg-gray-50 rounded">
          <p class="text-sm text-gray-600">
            目前固定欄位：<span class="font-mono font-semibold">{{ fixedCols.join(', ') }}</span>
          </p>
        </div>
      </section>

      <!-- 過濾功能 -->
      <section id="filtering" class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <JxIcon color="purple-500" size="28">filter_alt</JxIcon>
          過濾功能
        </h2>
        <div class="mb-4 p-4 bg-blue-50 rounded-lg">
          <p class="text-gray-700">
            <strong>💡 提示：</strong>點擊表頭右下角的下拉箭頭圖示，可以選擇要顯示的資料
          </p>
        </div>
        <JxFixedTable
          :columns="filterColumns"
          :data="filterData"
          :is-filter="true"
          :is-fixed="true"
          :viewport-offset="200"
          :filter-columns="activeFilters"
          @update:filter-columns="handleFilterUpdate"
        />
        <div class="mt-4 p-4 bg-gray-50 rounded">
          <p class="text-sm text-gray-600 mb-2">目前過濾條件：</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(values, column) in displayFilters"
              :key="column"
              class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs"
            >
              {{ column }}: {{ values.join(', ') }}
            </span>
            <span v-if="Object.keys(displayFilters).length === 0" class="text-gray-400 text-xs"
              >無過濾條件</span
            >
          </div>
        </div>
      </section>

      <!-- 搜尋功能 -->
      <section id="searching" class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <JxIcon color="orange-500" size="28">search</JxIcon>
          搜尋功能
        </h2>
        <div class="mb-4 p-4 bg-blue-50 rounded-lg">
          <p class="text-gray-700">
            <strong>💡 提示：</strong>在搜尋框中輸入關鍵字，即可即時搜尋所有欄位
          </p>
        </div>
        <JxFixedTable
          :columns="searchColumns"
          :data="searchData"
          :show-search="true"
          :is-fixed="true"
          :viewport-offset="200"
          v-model:search-text="searchText"
        />
        <div class="mt-4 p-4 bg-gray-50 rounded">
          <p class="text-sm text-gray-600">
            搜尋關鍵字：<span class="font-mono font-semibold">{{ searchText || '(空)' }}</span>
          </p>
        </div>
      </section>

      <!-- 自訂格式 -->
      <section id="custom-format" class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <JxIcon color="red-500" size="28">palette</JxIcon>
          自訂格式與插槽
        </h2>
        <div class="mb-4 p-4 bg-blue-50 rounded-lg">
          <p class="text-gray-700 mb-2">
            <strong>💡 提示：</strong>使用 <code class="bg-white px-2 py-1 rounded">format</code>
            函數或具名插槽來自訂儲存格顯示
          </p>
        </div>
        <JxFixedTable
          :columns="customColumns"
          :data="customData"
          :is-fixed="true"
          :viewport-offset="200"
        >
          <template #td-status="{ row }">
            <div class="flex justify-center py-2">
              <span
                :class="[
                  'px-3 py-1 rounded-full text-xs font-medium',
                  row.status === '已完成'
                    ? 'bg-green-100 text-green-800'
                    : row.status === '進行中'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                ]"
              >
                {{ row.status }}
              </span>
            </div>
          </template>
          <template #td-progress="{ row }">
            <div class="px-2 py-2">
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-blue-500 h-2 rounded-full transition-all"
                    :style="{ width: row.progress + '%' }"
                  ></div>
                </div>
                <span class="text-xs text-gray-600 w-12 text-right">{{ row.progress }}%</span>
              </div>
            </div>
          </template>
        </JxFixedTable>
      </section>

      <!-- Props 參數說明 -->
      <section id="props" class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <JxIcon color="indigo-500" size="28">settings</JxIcon>
          Props 參數說明
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-100">
              <tr>
                <th class="px-4 py-2 text-left font-semibold">參數名稱</th>
                <th class="px-4 py-2 text-left font-semibold">類型</th>
                <th class="px-4 py-2 text-left font-semibold">預設值</th>
                <th class="px-4 py-2 text-left font-semibold">說明</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="prop in propsList" :key="prop.name">
                <td class="px-4 py-3 font-mono text-xs">{{ prop.name }}</td>
                <td class="px-4 py-3 text-gray-600">{{ prop.type }}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600">{{ prop.default }}</td>
                <td class="px-4 py-3 text-gray-700">{{ prop.description }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Events 事件說明 -->
      <section id="events" class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <JxIcon color="pink-500" size="28">bolt</JxIcon>
          Events 事件說明
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-100">
              <tr>
                <th class="px-4 py-2 text-left font-semibold">事件名稱</th>
                <th class="px-4 py-2 text-left font-semibold">參數</th>
                <th class="px-4 py-2 text-left font-semibold">說明</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="event in eventsList" :key="event.name">
                <td class="px-4 py-3 font-mono text-xs">{{ event.name }}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600">{{ event.params }}</td>
                <td class="px-4 py-3 text-gray-700">{{ event.description }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Slots 插槽說明 -->
      <section id="slots" class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <JxIcon color="teal-500" size="28">widgets</JxIcon>
          Slots 插槽說明
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-100">
              <tr>
                <th class="px-4 py-2 text-left font-semibold">插槽名稱</th>
                <th class="px-4 py-2 text-left font-semibold">作用域參數</th>
                <th class="px-4 py-2 text-left font-semibold">說明</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="slot in slotsList" :key="slot.name">
                <td class="px-4 py-3 font-mono text-xs">{{ slot.name }}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-600">{{ slot.params }}</td>
                <td class="px-4 py-3 text-gray-700">{{ slot.description }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import JxFixedTable from '../components/common/JxFixedTable.vue'
import JxIcon from '../components/common/JxIcon.vue'

// 導航區段
const sections = [
  { id: 'basic-usage', title: '基本用法', icon: 'rocket_launch', color: 'blue-500' },
  { id: 'column-fixing', title: '欄位固定', icon: 'push_pin', color: 'green-500' },
  { id: 'filtering', title: '過濾功能', icon: 'filter_alt', color: 'purple-500' },
  { id: 'searching', title: '搜尋功能', icon: 'search', color: 'orange-500' },
  { id: 'custom-format', title: '自訂格式', icon: 'palette', color: 'red-500' },
  { id: 'props', title: 'Props 參數', icon: 'settings', color: 'indigo-500' },
  { id: 'events', title: 'Events 事件', icon: 'bolt', color: 'pink-500' },
  { id: 'slots', title: 'Slots 插槽', icon: 'widgets', color: 'teal-500' }
]

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

// 基本範例資料
const basicColumns = [
  { title: 'ID', dataIndex: 'id', width: 80, defaultFixed: true },
  { title: '姓名', dataIndex: 'name', width: 120 },
  { title: '部門', dataIndex: 'department', width: 150 },
  { title: '職位', dataIndex: 'position', width: 150 }
]

const basicData = [
  { id: 1, name: '張小明', department: '研發部', position: '工程師' },
  { id: 2, name: '王美麗', department: '行銷部', position: '經理' },
  { id: 3, name: '李大華', department: '財務部', position: '專員' },
  { id: 4, name: '陳志明', department: '人資部', position: '主管' },
  { id: 5, name: '林美美', department: '客服部', position: '專員' }
]

// 欄位固定範例
const fixingColumns = [
  { title: 'ID', dataIndex: 'id', width: 80, defaultFixed: true },
  { title: '姓名', dataIndex: 'name', width: 120 },
  { title: '部門', dataIndex: 'department', width: 150 },
  { title: '職位', dataIndex: 'position', width: 150 },
  { title: '電子郵件', dataIndex: 'email', width: 200 }
]

const fixedCols = ref(['id'])

// 過濾功能範例
const filterColumns = [
  { title: 'ID', dataIndex: 'id', width: 80, defaultFixed: true },
  { title: '姓名', dataIndex: 'name', width: 120 },
  { title: '部門', dataIndex: 'department', width: 150 },
  { title: '職位', dataIndex: 'position', width: 150 },
  { title: '狀態', dataIndex: 'status', width: 120 }
]

const filterData = [
  { id: 1, name: '張小明', department: '研發部', position: '工程師', status: '在職' },
  { id: 2, name: '王美麗', department: '行銷部', position: '經理', status: '在職' },
  { id: 3, name: '李大華', department: '財務部', position: '專員', status: '休假' },
  { id: 4, name: '陳志明', department: '人資部', position: '主管', status: '在職' },
  { id: 5, name: '林美美', department: '客服部', position: '專員', status: '休假' },
  { id: 6, name: '黃建國', department: '研發部', position: '工程師', status: '在職' },
  { id: 7, name: '吳雅婷', department: '行銷部', position: '專員', status: '在職' }
]

const activeFilters = ref([])
const filterMap = ref({})

function handleFilterUpdate({ value, status }) {
  const { column, value: filterValue } = value

  if (status === 'add') {
    if (!filterMap.value[column]) {
      filterMap.value[column] = []
    }
    filterMap.value[column].push(...filterValue)
  } else if (status === 'remove') {
    if (filterMap.value[column]) {
      filterMap.value[column] = filterMap.value[column].filter((v) => !filterValue.includes(v))
      if (filterMap.value[column].length === 0) {
        delete filterMap.value[column]
      }
    }
  }
}

const displayFilters = computed(() => filterMap.value)

// 搜尋功能範例
const searchColumns = [
  { title: 'ID', dataIndex: 'id', width: 80, defaultFixed: true },
  { title: '產品名稱', dataIndex: 'product', width: 200 },
  { title: '類別', dataIndex: 'category', width: 120 },
  { title: '價格', dataIndex: 'price', width: 100, format: (val) => `$${val}` }
]

const searchData = [
  { id: 1, product: 'iPhone 15 Pro', category: '手機', price: 35900 },
  { id: 2, product: 'MacBook Air M2', category: '筆電', price: 37900 },
  { id: 3, product: 'iPad Pro', category: '平板', price: 29900 },
  { id: 4, product: 'AirPods Pro', category: '耳機', price: 7490 },
  { id: 5, product: 'Apple Watch Series 9', category: '手錶', price: 13900 }
]

const searchText = ref('')

// 自訂格式範例
const customColumns = [
  { title: 'ID', dataIndex: 'id', width: 80, defaultFixed: true },
  { title: '任務名稱', dataIndex: 'task', width: 200 },
  { title: '狀態', dataIndex: 'status', width: 120 },
  { title: '進度', dataIndex: 'progress', width: 200 },
  {
    title: '截止日期',
    dataIndex: 'deadline',
    width: 150,
    format: (val) => new Date(val).toLocaleDateString('zh-TW')
  }
]

const customData = [
  { id: 1, task: '完成專案文件', status: '已完成', progress: 100, deadline: '2025-12-20' },
  { id: 2, task: '開發新功能', status: '進行中', progress: 65, deadline: '2025-12-25' },
  { id: 3, task: '測試與修正', status: '進行中', progress: 40, deadline: '2025-12-28' },
  { id: 4, task: '部署上線', status: '待處理', progress: 0, deadline: '2025-12-30' }
]

// Props 參數列表
const propsList = [
  {
    name: 'columns',
    type: 'Array',
    default: '[]',
    description: '欄位設定陣列，每個欄位包含 title、dataIndex、width、defaultFixed 等屬性'
  },
  { name: 'data', type: 'Array', default: '[]', description: '表格資料陣列' },
  { name: 'isKeep', type: 'Boolean', default: 'true', description: '是否啟用欄位固定功能' },
  { name: 'isFilter', type: 'Boolean', default: 'true', description: '是否啟用過濾功能' },
  {
    name: 'filterColumns',
    type: 'Array',
    default: '[]',
    description: '目前已套用過濾的欄位陣列'
  },
  { name: 'isFixed', type: 'Boolean', default: 'true', description: '是否固定表頭' },
  {
    name: 'viewportOffset',
    type: 'Number/String',
    default: '0',
    description: '視窗偏移量，用於計算表格最大高度'
  },
  {
    name: 'fixedColumns',
    type: 'Array',
    default: '[]',
    description: '固定欄位的 dataIndex 陣列（支援 v-model）'
  },
  { name: 'showSearch', type: 'Boolean', default: 'true', description: '是否顯示搜尋框' },
  {
    name: 'searchText',
    type: 'String',
    default: "''",
    description: '搜尋關鍵字（支援 v-model）'
  },
  { name: 'headerFontSize', type: 'String', default: "'sm'", description: '表頭字體大小' },
  { name: 'cellFontSize', type: 'String', default: "'xs'", description: '儲存格字體大小' },
  { name: 'divideColor', type: 'String', default: "'black'", description: '分隔線顏色' },
  { name: 'divideOpacity', type: 'String', default: "'30'", description: '分隔線不透明度' },
  {
    name: 'divideDirection',
    type: 'String',
    default: "'y'",
    description: "分隔線方向 ('x', 'y', 'xy')"
  },
  { name: 'divideSize', type: 'String', default: "'1'", description: '分隔線粗細' }
]

// Events 事件列表
const eventsList = [
  {
    name: 'update:fixedColumns',
    params: 'Array',
    description: '當固定欄位變更時觸發，回傳固定欄位的 dataIndex 陣列'
  },
  {
    name: 'update:searchText',
    params: 'String',
    description: '當搜尋文字變更時觸發，回傳搜尋關鍵字'
  },
  {
    name: 'update:filterColumns',
    params: '{ value, status }',
    description:
      "當過濾條件變更時觸發，value 包含 column 和 value，status 為 'add' 或 'remove'"
  }
]

// Slots 插槽列表
const slotsList = [
  { name: 'header', params: '-', description: '自訂表格頂部區域，預設顯示搜尋框' },
  {
    name: 'td-{dataIndex}',
    params: '{ column, row, rowIndex }',
    description: '自訂特定欄位的儲存格內容'
  },
  { name: 'tooltip', params: '-', description: '自訂過濾選單的內容' }
]
</script>

<style scoped>
code {
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
