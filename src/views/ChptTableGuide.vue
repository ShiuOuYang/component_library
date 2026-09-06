<template>
  <div class="min-h-screen bg-neutral-50 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- 標題 -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-neutral-900 mb-2">ChptFixedTable 使用指南</h1>
        <p class="text-lg text-neutral-600">
          企業級固定欄位表格：欄位固定、欄位篩選、全文搜尋與自訂格式。
        </p>
      </div>

      <!-- 章節索引 -->
      <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-4">章節目錄</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            v-for="section in sections"
            :key="section.id"
            @click="scrollToSection(section.id)"
            class="p-4 border border-neutral-200 rounded-lg hover:bg-primary-50 hover:border-primary-300 cursor-pointer transition-all"
          >
            <div class="flex items-center gap-2">
              <ChptIcon :color="section.color" size="24">{{ section.icon }}</ChptIcon>
              <span class="font-medium text-neutral-700">{{ section.title }}</span>
            </div>
          </a>
        </div>
      </div>

      <!-- 基本使用 -->
      <section id="basic-usage" class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-4 flex items-center gap-2">
          <ChptIcon color="primary-500" size="28">rocket_launch</ChptIcon>
          基本使用
        </h2>
        <div class="mb-6">
          <h3 class="text-lg font-medium text-neutral-700 mb-3">最小範例</h3>
          <div class="bg-neutral-50 rounded p-4 mb-4">
            <pre class="text-sm overflow-x-auto"><code><ChptFixedTable
  :columns="columns"
  :data="data"
  :is-fixed="true"
  :viewport-offset="200"
/></code></pre>
          </div>
          <ChptFixedTable
            :columns="basicColumns"
            :data="basicData"
            :is-fixed="true"
            :viewport-offset="200"
          />
        </div>
      </section>

      <!-- 欄位固定 -->
      <section id="column-fixing" class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-4 flex items-center gap-2">
          <ChptIcon color="success-500" size="28">push_pin</ChptIcon>
          欄位固定
        </h2>
        <div class="mb-4 p-4 bg-primary-50 rounded-lg">
          <p class="text-neutral-700">
            <strong>提示：</strong>開啟 <code class="bg-white px-2 py-1 rounded">is-keep</code>
            後，欄位表頭會出現固定／取消固定按鈕，可動態釘住任一欄。
          </p>
        </div>
        <ChptFixedTable
          :columns="fixingColumns"
          :data="basicData"
          :is-keep="true"
          :is-fixed="true"
          :viewport-offset="200"
          v-model:fixed-columns="fixedCols"
        />
        <div class="mt-4 p-4 bg-neutral-50 rounded">
          <p class="text-sm text-neutral-600">
            目前固定的欄位：<span class="font-mono font-semibold">{{ fixedCols.join(', ') }}</span>
          </p>
        </div>
      </section>

      <!-- 欄位篩選 -->
      <section id="filtering" class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-4 flex items-center gap-2">
          <ChptIcon color="info-500" size="28">filter_alt</ChptIcon>
          欄位篩選
        </h2>
        <div class="mb-4 p-4 bg-primary-50 rounded-lg">
          <p class="text-neutral-700">
            <strong>提示：</strong>開啟 <code class="bg-white px-2 py-1 rounded">is-filter</code>
            後，各欄右下角出現篩選圖示，可依欄位值多選過濾。
          </p>
        </div>
        <ChptFixedTable
          :columns="filterColumns"
          :data="filterData"
          :is-filter="true"
          :is-fixed="true"
          :viewport-offset="200"
          :filter-columns="activeFilters"
          @update:filter-columns="handleFilterUpdate"
        />
        <div class="mt-4 p-4 bg-neutral-50 rounded">
          <p class="text-sm text-neutral-600 mb-2">已套用篩選：</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(values, column) in displayFilters"
              :key="column"
              class="px-3 py-1 bg-info-100 text-info-700 rounded-full text-xs"
            >
              {{ column }}: {{ values.join(', ') }}
            </span>
            <span v-if="Object.keys(displayFilters).length === 0" class="text-neutral-400 text-xs">
              尚未套用任何篩選
            </span>
          </div>
        </div>
      </section>

      <!-- 全文搜尋 -->
      <section id="searching" class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-4 flex items-center gap-2">
          <ChptIcon color="warning-500" size="28">search</ChptIcon>
          全文搜尋
        </h2>
        <div class="mb-4 p-4 bg-primary-50 rounded-lg">
          <p class="text-neutral-700">
            <strong>提示：</strong>開啟 <code class="bg-white px-2 py-1 rounded">show-search</code>
            並以 <code class="bg-white px-2 py-1 rounded">v-model:search-text</code> 綁定即可全文搜尋。
          </p>
        </div>
        <ChptFixedTable
          :columns="searchColumns"
          :data="searchData"
          :show-search="true"
          :is-fixed="true"
          :viewport-offset="200"
          v-model:search-text="searchText"
        />
        <div class="mt-4 p-4 bg-neutral-50 rounded">
          <p class="text-sm text-neutral-600">
            目前關鍵字：<span class="font-mono font-semibold">{{ searchText || '(空)' }}</span>
          </p>
        </div>
      </section>

      <!-- 自訂格式 -->
      <section id="custom-format" class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-4 flex items-center gap-2">
          <ChptIcon color="danger-500" size="28">palette</ChptIcon>
          自訂格式（Slot）
        </h2>
        <div class="mb-4 p-4 bg-primary-50 rounded-lg">
          <p class="text-neutral-700 mb-2">
            <strong>提示：</strong>以 <code class="bg-white px-2 py-1 rounded">#td- 前綴插槽（例如 #td-status）</code>
            自訂欄位內容（例如狀態標籤、進度條）。
          </p>
        </div>
        <ChptFixedTable
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
                  row.status === '啟用'
                    ? 'bg-success-100 text-success-800'
                    : row.status === '審核中'
                      ? 'bg-warning-100 text-warning-800'
                      : 'bg-neutral-100 text-neutral-800',
                ]"
              >
                {{ row.status }}
              </span>
            </div>
          </template>
          <template #td-progress="{ row }">
            <div class="px-2 py-2">
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-neutral-200 rounded-full h-2">
                  <div
                    class="bg-primary-500 h-2 rounded-full transition-all"
                    :style="{ width: row.progress + '%' }"
                  ></div>
                </div>
                <span class="text-xs text-neutral-600 w-12 text-right">{{ row.progress }}%</span>
              </div>
            </div>
          </template>
        </ChptFixedTable>
      </section>

      <!-- Props 屬性表 -->
      <section id="props" class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-4 flex items-center gap-2">
          <ChptIcon color="secondary-500" size="28">settings</ChptIcon>
          Props 屬性表
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-neutral-100">
              <tr>
                <th class="px-4 py-2 text-left font-semibold">屬性名稱</th>
                <th class="px-4 py-2 text-left font-semibold">型別</th>
                <th class="px-4 py-2 text-left font-semibold">預設值</th>
                <th class="px-4 py-2 text-left font-semibold">說明</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="prop in propsList" :key="prop.name">
                <td class="px-4 py-3 font-mono text-xs">{{ prop.name }}</td>
                <td class="px-4 py-3 text-neutral-600">{{ prop.type }}</td>
                <td class="px-4 py-3 font-mono text-xs text-neutral-600">{{ prop.default }}</td>
                <td class="px-4 py-3 text-neutral-700">{{ prop.description }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Events 事件表 -->
      <section id="events" class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-4 flex items-center gap-2">
          <ChptIcon color="danger-500" size="28">bolt</ChptIcon>
          Events 事件表
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-neutral-100">
              <tr>
                <th class="px-4 py-2 text-left font-semibold">事件名稱</th>
                <th class="px-4 py-2 text-left font-semibold">參數</th>
                <th class="px-4 py-2 text-left font-semibold">說明</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="event in eventsList" :key="event.name">
                <td class="px-4 py-3 font-mono text-xs">{{ event.name }}</td>
                <td class="px-4 py-3 font-mono text-xs text-neutral-600">{{ event.params }}</td>
                <td class="px-4 py-3 text-neutral-700">{{ event.description }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Slots 插槽表 -->
      <section id="slots" class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-4 flex items-center gap-2">
          <ChptIcon color="success-500" size="28">widgets</ChptIcon>
          Slots 插槽表
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-neutral-100">
              <tr>
                <th class="px-4 py-2 text-left font-semibold">插槽名稱</th>
                <th class="px-4 py-2 text-left font-semibold">作用域</th>
                <th class="px-4 py-2 text-left font-semibold">說明</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="slot in slotsList" :key="slot.name">
                <td class="px-4 py-3 font-mono text-xs">{{ slot.name }}</td>
                <td class="px-4 py-3 font-mono text-xs text-neutral-600">{{ slot.params }}</td>
                <td class="px-4 py-3 text-neutral-700">{{ slot.description }}</td>
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
import { ChptFixedTable, ChptIcon } from '@/components/library'

// 章節索引
const sections = [
  { id: 'basic-usage', title: '基本使用', icon: 'rocket_launch', color: 'primary-500' },
  { id: 'column-fixing', title: '欄位固定', icon: 'push_pin', color: 'success-500' },
  { id: 'filtering', title: '欄位篩選', icon: 'filter_alt', color: 'info-500' },
  { id: 'searching', title: '全文搜尋', icon: 'search', color: 'warning-500' },
  { id: 'custom-format', title: '自訂格式', icon: 'palette', color: 'danger-500' },
  { id: 'props', title: 'Props', icon: 'settings', color: 'secondary-500' },
  { id: 'events', title: 'Events', icon: 'bolt', color: 'danger-500' },
  { id: 'slots', title: 'Slots', icon: 'widgets', color: 'success-500' },
]

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

// 基本使用範例
const basicColumns = [
  { title: 'ID', dataIndex: 'id', width: 80, defaultFixed: true },
  { title: '姓名', dataIndex: 'name', width: 120 },
  { title: '部門', dataIndex: 'department', width: 150 },
  { title: '職稱', dataIndex: 'position', width: 150 },
]

const basicData = [
  { id: 1, name: '張三', department: '研發部', position: '前端工程師' },
  { id: 2, name: '李四', department: '品保部', position: '測試工程師' },
  { id: 3, name: '王五', department: '製造部', position: '製程工程師' },
  { id: 4, name: '趙六', department: '資訊部', position: '後端工程師' },
  { id: 5, name: '陳七', department: '設備部', position: '設備工程師' },
]

// 欄位固定範例
const fixingColumns = [
  { title: 'ID', dataIndex: 'id', width: 80, defaultFixed: true },
  { title: '姓名', dataIndex: 'name', width: 120 },
  { title: '部門', dataIndex: 'department', width: 150 },
  { title: '職稱', dataIndex: 'position', width: 150 },
  { title: 'Email', dataIndex: 'email', width: 200 },
]

const fixedCols = ref(['id'])

// 欄位篩選範例
const filterColumns = [
  { title: 'ID', dataIndex: 'id', width: 80, defaultFixed: true },
  { title: '姓名', dataIndex: 'name', width: 120 },
  { title: '部門', dataIndex: 'department', width: 150 },
  { title: '職稱', dataIndex: 'position', width: 150 },
  { title: '狀態', dataIndex: 'status', width: 120 },
]

const filterData = [
  { id: 1, name: '張三', department: '研發部', position: '前端工程師', status: '啟用' },
  { id: 2, name: '李四', department: '品保部', position: '測試工程師', status: '啟用' },
  { id: 3, name: '王五', department: '製造部', position: '製程工程師', status: '停用' },
  { id: 4, name: '趙六', department: '資訊部', position: '後端工程師', status: '啟用' },
  { id: 5, name: '陳七', department: '設備部', position: '設備工程師', status: '停用' },
  { id: 6, name: '吳九', department: '研發部', position: 'UI 設計師', status: '啟用' },
]

const activeFilters = ref({})
function handleFilterUpdate(filters) {
  activeFilters.value = filters
}
const displayFilters = computed(() => activeFilters.value || {})

// 全文搜尋範例
const searchColumns = [
  { title: 'ID', dataIndex: 'id', width: 80, defaultFixed: true },
  { title: '姓名', dataIndex: 'name', width: 120 },
  { title: '部門', dataIndex: 'department', width: 150 },
  { title: '職稱', dataIndex: 'position', width: 150 },
  { title: '狀態', dataIndex: 'status', width: 120 },
]
const searchData = filterData.map((row) => ({ ...row }))
const searchText = ref('')

// 自訂格式範例
const customColumns = [
  { title: 'ID', dataIndex: 'id', width: 80, defaultFixed: true },
  { title: '專案', dataIndex: 'name', width: 160 },
  { title: '狀態', dataIndex: 'status', width: 120 },
  { title: '進度', dataIndex: 'progress', width: 200 },
]
const customData = [
  { id: 1, name: '元件庫重構', status: '啟用', progress: 80 },
  { id: 2, name: '報表系統', status: '審核中', progress: 45 },
  { id: 3, name: '資料看板', status: '停用', progress: 20 },
]

// 靜態文件表
const propsList = [
  { name: 'columns', type: 'Array', default: '[]', description: '欄位定義（title / dataIndex / width / defaultFixed）' },
  { name: 'data', type: 'Array', default: '[]', description: '資料列' },
  { name: 'isKeep', type: 'Boolean', default: 'false', description: '是否啟用欄位固定' },
  { name: 'isFilter', type: 'Boolean', default: 'false', description: '是否啟用欄位篩選' },
  { name: 'showSearch', type: 'Boolean', default: 'false', description: '是否顯示全文搜尋框' },
  { name: 'isPagination', type: 'Boolean', default: 'false', description: '是否顯示分頁' },
  { name: 'fixedColumns', type: 'Array', default: '—', description: '已固定欄位（v-model:fixed-columns）' },
  { name: 'filterColumns', type: 'Object', default: '—', description: '已套用篩選（v-model:filter-columns）' },
  { name: 'searchText', type: 'String', default: '—', description: '搜尋文字（v-model:search-text）' },
]
const eventsList = [
  { name: 'update:fixed-columns', params: 'string[]', description: '固定欄位變更' },
  { name: 'update:filter-columns', params: 'Record', description: '篩選條件變更' },
  { name: 'update:search-text', params: 'string', description: '搜尋文字變更' },
]
const slotsList = [
  { name: 'td-<dataIndex>', params: '{ row }', description: '自訂欄位內容' },
  { name: 'header', params: '—', description: '自訂上方工具列（預設顯示搜尋框）' },
]
</script>
