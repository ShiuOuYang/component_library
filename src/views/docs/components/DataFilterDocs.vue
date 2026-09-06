<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">📊</span>
        <h1 class="text-4xl font-bold text-neutral-900">資料呈現與過濾</h1>
      </div>
      <p class="text-neutral-600 text-lg max-w-4xl">
        ChptTable（通用表格）、ChptFixedTable（固定欄位表格）、ChptPagination（分頁）、
        ChptFilter（過濾選擇）、ChptFilterBar（多欄位過濾橫列）。每個元件都附「Props / Events / Slots」與注意事項。
      </p>
    </div>

    <!-- ============ ChptTable ============ -->
    <section id="chpt-table" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptTable 通用表格</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>以 <code>columns</code>＋<code>data</code> 驅動的中型資料表格；
        內建全文搜尋、欄位排序（可多欄）與分頁控制。適合報表／列表的快速呈現。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptTable } from '@/components/library'</code>
      </p>

      <ChptTable
        :columns="tableColumns"
        :data="tableData"
        search-placeholder="輸入關鍵字搜尋..."
        :default-page-size="5"
        pagination-position="bottom"
        @search="onSearch"
      />

      <div class="mt-6">
        <ChptCodeBlock :code="tableSample" />
      </div>

      <ApiTable title="Props" :rows="tableProps" />
      <ApiTable title="Events" :rows="tableEvents" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>欄位可設 <code>sortable</code>＋<code>sortType</code>（string/number）啟用排序；
        分頁位置以 <code>paginationPosition</code>（top/bottom/both）控制；可自訂樣式的 class prop 皆接受 Tailwind class。
      </p>
    </section>

    <!-- ============ ChptFixedTable ============ -->
    <section id="chpt-fixedtable" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptFixedTable 固定欄位表格</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>欄位多、需左右捲動的大表格；可固定表頭與特定欄位、逐欄篩選、全文搜尋，
        適合資料密集的明細／監控表。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptFixedTable } from '@/components/library'</code>
      </p>

      <ChptFixedTable
        :columns="fixedColumns"
        :data="tableData"
        :is-keep="true"
        :is-filter="true"
        :is-fixed="true"
        :viewport-offset="200"
        show-search
        v-model:fixed-columns="fixedCols"
      />
      <div class="mt-3 text-sm text-neutral-600">
        目前固定欄位：<span class="font-mono font-semibold">{{ fixedCols.join(', ') }}</span>
        （在欄位選單中可增減固定欄）
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="fixedTableSample" />
      </div>

      <ApiTable title="Props" :rows="fixedTableProps" />
      <ApiTable title="Events" :rows="fixedTableEvents" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>欄位以 <code>{ title, dataIndex, width }</code> 定義，設
        <code>defaultFixed</code> 可預設固定；已固定欄位可用 <code>v-model:fixed-columns</code> 外部同步。
      </p>
    </section>

    <!-- ============ ChptPagination ============ -->
    <section id="chpt-pagination" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptPagination 分頁</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>資料量大時切頁瀏覽；可獨立使用（<code>variant</code>：full／compact），
        也可作為表格分頁列。支援每頁筆數切換與總數摘要。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptPagination } from '@/components/library'</code>
      </p>

      <div class="grid md:grid-cols-2 gap-4">
        <div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <p class="text-sm font-semibold text-neutral-800 mb-2">variant="full"</p>
          <ChptPagination
            v-model:current-page="page"
            v-model:items-per-page="pageSize"
            :total-items="250"
            variant="full"
            show-summary
            show-page-size
            @change="onPageChange"
          />
        </div>
        <div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <p class="text-sm font-semibold text-neutral-800 mb-2">variant="compact"</p>
          <ChptPagination
            v-model:current-page="pageC"
            v-model:items-per-page="pageSize"
            :total-items="250"
            variant="compact"
            show-summary
            @change="onPageChange"
          />
        </div>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="paginationSample" />
      </div>

      <ApiTable title="Props" :rows="paginationProps" />
      <ApiTable title="Events" :rows="paginationEvents" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>頁碼與每頁筆數採 <code>v-model:current-page</code>／<code>v-model:items-per-page</code>
        雙向綁定；<code>totalItems</code> 為總資料筆數，元件自行計算總頁數。
      </p>
    </section>

    <!-- ============ ChptFilter ============ -->
    <section id="chpt-filter" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptFilter 過濾選擇</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>單一欄位的過濾器；以 <code>type</code> 切換三種樣式——
        select（單選下拉）、dropdown（多選下拉）、tag（可搜尋多選標籤）。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptFilter } from '@/components/library'</code>
      </p>

      <div class="grid md:grid-cols-3 gap-4">
        <div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <p class="text-sm font-semibold text-neutral-800 mb-2">select（單選）</p>
          <ChptFilter v-model="filterSelect" type="select" label="部門" :options="deptOptions" />
          <p class="text-xs text-neutral-500 mt-2">目前：{{ filterSelect || '全部' }}</p>
        </div>
        <div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <p class="text-sm font-semibold text-neutral-800 mb-2">dropdown（多選）</p>
          <ChptFilter v-model="filterDropdown" type="dropdown" placeholder="請選擇狀態" :options="statusOptions" />
        </div>
        <div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <p class="text-sm font-semibold text-neutral-800 mb-2">tag（帶搜尋多選）</p>
          <ChptFilter v-model="filterTag" type="tag" label="標籤" placeholder="搜尋..." :options="tagOptions" />
        </div>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="filterSample" />
      </div>

      <ApiTable title="Props" :rows="filterProps" />
      <ApiTable title="Events" :rows="filterEvents" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong><code>type="select"</code> 的 modelValue 為單一值；<code>dropdown</code>／
        <code>tag</code> 為陣列。選項可傳 primitive 或 <code>{ label, value }</code>，並以 <code>valueKey</code>／
        <code>labelKey</code> 指定鍵名。
      </p>
    </section>

    <!-- ============ ChptFilterBar ============ -->
    <section id="chpt-filterbar" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptFilterBar 多欄位過濾橫列</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>一次展示多個「單選過濾器」的橫列工具列；以 <code>filters</code> 描述欄位、
        單一物件 <code>modelValue</code> 雙向綁定，並可顯示總筆數。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptFilterBar } from '@/components/library'</code>
      </p>

      <div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
        <ChptFilterBar v-model="filterState" :filters="barFilters" :count="42" count-label="筆資料" />
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="filterBarSample" />
      </div>

      <ApiTable title="Props" :rows="filterBarProps" />
      <ApiTable title="Events" :rows="filterBarEvents" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>每個欄位以 <code>{ key, label, options, allLabel?, allCount? }</code> 描述；
        選項可附 <code>count</code> 顯示數量；目前選取結果由 <code>modelValue</code>（Record key→value）維護。
      </p>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  ChptTable,
  ChptFixedTable,
  ChptPagination,
  ChptFilter,
  ChptFilterBar,
  ChptCodeBlock,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

// ===== ChptTable / ChptFixedTable 共用資料 =====
const tableColumns = [
  { key: 'id', title: 'ID', sortable: true, sortType: 'number' },
  { key: 'name', title: '姓名', sortable: true },
  { key: 'department', title: '部門' },
  { key: 'position', title: '職稱' },
  { key: 'status', title: '狀態' },
]
const tableData = [
  { id: 1, name: '張三', department: '研發部', position: '前端工程師', status: '啟用' },
  { id: 2, name: '李四', department: '品保部', position: '測試工程師', status: '啟用' },
  { id: 3, name: '王五', department: '製造部', position: '製程工程師', status: '停用' },
  { id: 4, name: '趙六', department: '資訊部', position: '後端工程師', status: '啟用' },
  { id: 5, name: '陳七', department: '設備部', position: '設備工程師', status: '停用' },
  { id: 6, name: '吳九', department: '研發部', position: 'UI 設計師', status: '啟用' },
  { id: 7, name: '鄭十', department: '業務部', position: '業務代表', status: '啟用' },
]
function onSearch(q) {
  console.log('搜尋：', q)
}

const fixedColumns = [
  { title: 'ID', dataIndex: 'id', width: 80, defaultFixed: true },
  { title: '姓名', dataIndex: 'name', width: 120 },
  { title: '部門', dataIndex: 'department', width: 150 },
  { title: '職稱', dataIndex: 'position', width: 150 },
  { title: '狀態', dataIndex: 'status', width: 120 },
]
const fixedCols = ref(['id'])

// ===== ChptPagination =====
const page = ref(1)
const pageC = ref(1)
const pageSize = ref(20)
function onPageChange(p) {
  console.log('切換到第', p, '頁')
}

// ===== ChptFilter =====
const filterSelect = ref('')
const filterDropdown = ref([])
const filterTag = ref([])
const deptOptions = [
  { value: 'rd', label: '研發部' },
  { value: 'qa', label: '品保部' },
  { value: 'mfg', label: '製造部' },
]
const statusOptions = ['啟用', '停用', '待審核', '已刪除']
const tagOptions = ['Vue', 'React', 'Angular', 'Svelte', 'Solid']

// ===== ChptFilterBar =====
const filterState = ref({})
const barFilters = [
  {
    key: 'status',
    label: '狀態',
    options: [
      { value: 'active', label: '啟用', count: 20 },
      { value: 'disabled', label: '停用', count: 12 },
      { value: 'pending', label: '待審核', count: 10 },
    ],
  },
  {
    key: 'dept',
    label: '部門',
    options: [
      { value: 'rd', label: '研發', count: 15 },
      { value: 'qa', label: '品保', count: 10 },
      { value: 'mfg', label: '製造', count: 17 },
    ],
  },
]

// ---- 程式碼範例（字串，避免模板解析） ----
const tableSample = `<ChptTable
  :columns="[{ key: 'name', title: '姓名', sortable: true }]"
  :data="rows"
  :default-page-size="5"
  pagination-position="bottom"
  @search="onSearch"
/>`

const fixedTableSample = `<ChptFixedTable
  :columns="[{ title: 'ID', dataIndex: 'id', width: 80, defaultFixed: true }]"
  :data="rows"
  is-keep
  is-filter
  show-search
  v-model:fixed-columns="fixedCols"
/>`

const paginationSample = `<ChptPagination
  v-model:current-page="page"
  v-model:items-per-page="size"
  :total-items="250"
  variant="full"
  show-summary
  @change="onPageChange"
/>`

const filterSample = `<ChptFilter v-model="value" type="select" label="部門" :options="options" />

<ChptFilter v-model="multi" type="dropdown" :options="options" />

<ChptFilter v-model="multi" type="tag" placeholder="搜尋..." :options="options" />`

const filterBarSample = `<ChptFilterBar
  v-model="state"
  :filters="barFilters"
  :count="42"
  count-label="筆資料"
/>`

// ---- API 資料（與元件 props/emits 對齊） ----
const tableProps = [
  { name: 'data', type: 'DataRow[]', def: '[]', desc: '資料列（每列為物件）' },
  { name: 'columns', type: 'Column[]', def: '[]', desc: '欄位：{ key, title, sortable?, sortType? }' },
  { name: 'searchPlaceholder', type: 'string', def: "'輸入關鍵字搜尋...'", desc: '搜尋框提示' },
  { name: 'noDataText', type: 'string', def: "'無資料'", desc: '空資料文字' },
  { name: 'defaultPageSize', type: 'number', def: '5', desc: '每頁預設筆數' },
  { name: 'defaultSort', type: 'object', def: '{ column: null, direction: asc }', desc: '預設排序' },
  { name: 'customFilter', type: '(data, query)=>[]|null', def: 'null', desc: '自訂過濾函數' },
  { name: 'paginationPosition', type: "'top'|'bottom'|'both'", def: "'top'", desc: '分頁列位置' },
  { name: 'containerBgColor / containerRounded / containerShadow', type: 'string', def: '…', desc: '容器樣式 class' },
  { name: 'headerBgGradient / headerTextColor', type: 'string', def: '…', desc: '表頭樣式 class' },
  { name: 'evenRowBgColor / hoverRowBgColor', type: 'string', def: 'rgb(250 250 250)', desc: '列底色 class/色值' },
  { name: 'fontSize', type: 'string', def: "'text-xs'", desc: '字級 class' },
]
const tableEvents = [
  { name: 'update:page', params: '(page: number)', desc: '頁碼變更' },
  { name: 'update:pageSize', params: '(pageSize: number)', desc: '每頁筆數變更' },
  { name: 'search', params: '(query: string)', desc: '搜尋文字變更' },
  { name: 'sort', params: '(info)', desc: '排序變更（多欄依點擊順序）' },
]

const fixedTableProps = [
  { name: 'columns', type: 'ChptFixedTableColumn[]', def: '[]', desc: '欄位：{ title, dataIndex, width?, defaultFixed? }' },
  { name: 'data', type: 'Record<string, unknown>[]', def: '[]', desc: '資料列' },
  { name: 'isKeep', type: 'boolean', def: 'true', desc: '啟用欄位固定功能' },
  { name: 'isFilter', type: 'boolean', def: 'true', desc: '啟用欄位篩選' },
  { name: 'filterColumns', type: 'string[]', def: '[]', desc: '已套用篩選欄位（v-model:filter-columns）' },
  { name: 'isFixed', type: 'boolean', def: 'true', desc: '固定表頭（垂直捲動）' },
  { name: 'fixedColumns', type: 'string[]', def: '[]', desc: '已固定欄位（v-model:fixed-columns）' },
  { name: 'showSearch', type: 'boolean', def: 'true', desc: '顯示全文搜尋框' },
  { name: 'searchText', type: 'string', def: "''", desc: '外部搜尋文字（v-model:search-text）' },
  { name: 'viewportOffset', type: 'number|string', def: '0', desc: '視口偏移（配合固定 header）' },
  { name: 'isPagination', type: 'boolean', def: 'false', desc: '啟用分頁' },
  { name: 'defaultPageSize', type: 'number', def: '50', desc: '分頁每頁筆數' },
  { name: 'headerFontSize / cellFontSize', type: 'string', def: 'sm / xs', desc: '表頭／內容字級' },
  { name: 'divideColor / divideOpacity / divideDirection / divideSize', type: 'string', def: '…', desc: '格線樣式' },
]
const fixedTableEvents = [
  { name: 'update:fixedColumns', params: '(value: string[])', desc: '固定欄位變更' },
  { name: 'update:searchText', params: '(value: string)', desc: '搜尋文字變更' },
  { name: 'update:filterColumns', params: '(value: string[])', desc: '篩選欄位變更' },
]

const paginationProps = [
  { name: 'currentPage', type: 'number', def: '1', desc: '目前頁碼（v-model:current-page）' },
  { name: 'itemsPerPage', type: 'number', def: '—', desc: '每頁筆數（v-model:items-per-page）' },
  { name: 'totalItems', type: 'number', def: '0', desc: '總資料筆數' },
  { name: 'variant', type: "'full'|'compact'", def: "'full'", desc: '完整或精簡樣式' },
  { name: 'pageSizeOptions', type: 'number[]', def: '—', desc: '可選每頁筆數' },
  { name: 'showSummary', type: 'boolean', def: 'false', desc: '顯示總數摘要' },
  { name: 'showPageSize', type: 'boolean', def: 'false', desc: '顯示每頁筆數切換' },
  { name: 'bgColor', type: 'string', def: "''", desc: 'compact 背景 class' },
]
const paginationEvents = [
  { name: 'update:currentPage', params: '(page: number)', desc: '頁碼變更' },
  { name: 'update:itemsPerPage', params: '(size: number)', desc: '每頁筆數變更' },
  { name: 'change', params: '(page: number)', desc: '切頁完成' },
]

const filterProps = [
  { name: 'type', type: "'select'|'dropdown'|'tag'", def: "'select'", desc: '過濾器樣式' },
  { name: 'modelValue', type: 'string|number|Array', def: "''", desc: '選取值（select 單值；多選為陣列）' },
  { name: 'options', type: 'Array<string|number|{label,value}>', def: '[]', desc: '選項' },
  { name: 'label', type: 'string', def: "''", desc: '前置標籤' },
  { name: 'placeholder', type: 'string', def: "''", desc: '提示文字' },
  { name: 'valueKey / labelKey', type: 'string', def: "'value' / 'label'", desc: '物件選項鍵名' },
]
const filterEvents = [
  { name: 'update:modelValue', params: '(value)', desc: '選取值變更' },
]

const filterBarProps = [
  { name: 'filters', type: 'FilterItem[]', def: '[]', desc: '欄位：{ key, label, options, allLabel?, allCount? }' },
  { name: 'modelValue', type: 'Record<string,string>', def: '{}', desc: '各欄選取值（key→value）' },
  { name: 'showCount / count / countLabel', type: 'boolean/number/string', def: '—', desc: '結果筆數顯示' },
]
const filterBarEvents = [{ name: 'update:modelValue', params: '(value)', desc: '選取狀態變更' }]
</script>
