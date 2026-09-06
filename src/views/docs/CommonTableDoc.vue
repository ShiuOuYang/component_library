<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">📋</span>
        <h1 class="text-4xl font-bold text-neutral-900">ChptTable 表格文件</h1>
      </div>
      <p class="text-neutral-600 text-lg max-w-4xl">
        ChptTable（搜尋＋排序＋分頁）、ChptFixedTable（固定欄位＋欄位篩選＋#td-* 自訂）、
        ChptPagination（分頁）。進階整合細節另見 <router-link to="/docs/components/data-filter" class="text-primary-600 underline">資料呈現與過濾</router-link>。
      </p>
    </div>

    <!-- ============ ChptTable ============ -->
    <section id="chpt-table" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptTable 通用表格</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>輕量到中量資料的列表呈現；內建全文搜尋、點表頭排序、分頁，
        透過 <code>columns</code> 的 <code>sortable</code>／<code>sortType</code> 即可啟用排序。
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
      />

      <div class="mt-6">
        <ChptCodeBlock :code="tableSample" />
      </div>

      <ApiTable title="Props" :rows="tableProps" />
      <ApiTable title="Events" :rows="tableEvents" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>搜尋與排序皆於元件內部即時處理（<code>data</code> 為全量資料）；
        需要「伺服器端」過濾時可改用 <code>@search</code>／<code>@sort</code> 事件自行向 API 查詢。
      </p>
    </section>

    <!-- ============ ChptFixedTable ============ -->
    <section id="chpt-fixedtable" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptFixedTable 固定欄位表格</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>欄位很多的資料明細；可固定表頭（<code>is-fixed</code>）與指定欄位（<code>is-keep</code>）、
        逐欄篩選（<code>is-filter</code>），並以 <code>#td-{dataIndex}</code> 前綴插槽自訂每個 cell。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptFixedTable } from '@/components/library'</code>
      </p>

      <ChptFixedTable
        :columns="customColumns"
        :data="customData"
        :is-keep="true"
        :is-filter="true"
        :is-fixed="true"
        :viewport-offset="200"
      >
        <template #td-status="{ row }">
          <ChptTag :label="row.status" :color="statusColor(row.status)" />
        </template>
        <template #td-progress="{ row }">
          <div class="px-2 w-40">
            <ChptProgress :model-value="row.progress" :status="row.progress >= 90 ? 'success' : 'primary'" />
          </div>
        </template>
      </ChptFixedTable>

      <div class="mt-6">
        <ChptCodeBlock :code="fixedTableSample" />
      </div>

      <ApiTable title="Props" :rows="fixedTableProps" />
      <ApiTable title="Events" :rows="fixedTableEvents" />
      <ApiTable title="Slots" :rows="fixedTableSlots" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong><code>#td-{dataIndex}</code> 插槽作用域提供 <code>row</code>／<code>value</code>；
        此頁以 <code>#td-status</code>、<code>#td-progress</code> 將狀態與進度換成 ChptTag／ChptProgress。
      </p>
    </section>

    <!-- ============ ChptPagination ============ -->
    <section id="chpt-pagination" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptPagination 分頁</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>非表格場景（如卡片列表、報表清單）的獨立分頁；
        full／compact 兩種樣式，支援每頁筆數切換與總數摘要。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptPagination } from '@/components/library'</code>
      </p>

      <div class="flex items-center gap-4 flex-wrap">
        <span class="text-sm text-neutral-600 whitespace-nowrap">共 {{ totalItems }} 筆</span>
        <ChptPagination
          v-model:current-page="page"
          v-model:items-per-page="pageSize"
          :total-items="totalItems"
          variant="compact"
          show-summary
          show-page-size
        />
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="paginationSample" />
      </div>

      <ApiTable title="Props" :rows="paginationProps" />
      <ApiTable title="Events" :rows="paginationEvents" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>表格內建的分頁列即使用此元件；獨立使用時記得把目前頁碼／每頁筆數以 v-model 同步回自己的查詢邏輯。
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
  ChptTag,
  ChptProgress,
  ChptCodeBlock,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

// ===== ChptTable 示範 =====
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

// ===== ChptFixedTable（#td-* 自訂示範）=====
const customColumns = [
  { title: 'ID', dataIndex: 'id', width: 80, defaultFixed: true },
  { title: '姓名', dataIndex: 'name', width: 140 },
  { title: '部門', dataIndex: 'department', width: 140 },
  { title: '狀態', dataIndex: 'status', width: 130 },
  { title: '進度', dataIndex: 'progress', width: 180 },
]
const customData = [
  { id: 1, name: '張三', department: '研發部', status: '啟用', progress: 92 },
  { id: 2, name: '李四', department: '品保部', status: '審核中', progress: 55 },
  { id: 3, name: '王五', department: '製造部', status: '停用', progress: 30 },
  { id: 4, name: '趙六', department: '資訊部', status: '啟用', progress: 78 },
  { id: 5, name: '陳七', department: '設備部', status: '審核中', progress: 64 },
]
function statusColor(status) {
  if (status === '啟用') return 'success'
  if (status === '審核中') return 'warning'
  return 'danger'
}

// ===== ChptPagination 示範 =====
const totalItems = 237
const page = ref(1)
const pageSize = ref(20)

// ---- 程式碼範例（字串，避免模板解析） ----
const tableSample = `<ChptTable
  :columns="columns"
  :data="rows"
  search-placeholder="輸入關鍵字搜尋..."
  :default-page-size="5"
  pagination-position="bottom"
/>`

const fixedTableSample = `<ChptFixedTable
  :columns="columns"
  :data="rows"
  is-keep
  is-filter
  is-fixed
  :viewport-offset="200"
>
  <!-- 以 #td-{dataIndex} 自訂欄位內容 -->
  <template #td-status="{ row }">
    <ChptTag :label="row.status" :color="statusColor(row.status)" />
  </template>
  <template #td-progress="{ row }">
    <ChptProgress :model-value="row.progress" />
  </template>
</ChptFixedTable>`

const paginationSample = `<ChptPagination
  v-model:current-page="page"
  v-model:items-per-page="size"
  :total-items="total"
  variant="compact"
  show-summary
/>`

// ---- API 資料 ----
const tableProps = [
  { name: 'data', type: 'DataRow[]', def: '[]', desc: '資料列' },
  { name: 'columns', type: 'Column[]', def: '[]', desc: '欄位：{ key, title, sortable?, sortType? }' },
  { name: 'searchPlaceholder', type: 'string', def: "'輸入關鍵字搜尋...'", desc: '搜尋框提示' },
  { name: 'noDataText', type: 'string', def: "'無資料'", desc: '空資料文字' },
  { name: 'defaultPageSize', type: 'number', def: '5', desc: '每頁預設筆數' },
  { name: 'customFilter', type: 'function|null', def: 'null', desc: '自訂過濾函數' },
  { name: 'defaultSort', type: 'object', def: '{ column: null, direction: asc }', desc: '預設排序' },
  { name: 'paginationPosition', type: "'top'|'bottom'|'both'", def: "'top'", desc: '分頁列位置' },
  { name: 'containerBgColor / containerRounded / containerShadow', type: 'string', def: '…', desc: '容器樣式 class' },
  { name: 'headerBgGradient / headerTextColor', type: 'string', def: '…', desc: '表頭樣式 class' },
  { name: 'evenRowBgColor / hoverRowBgColor', type: 'string', def: '…', desc: '列底色' },
]
const tableEvents = [
  { name: 'update:page', params: '(page: number)', desc: '頁碼變更' },
  { name: 'update:pageSize', params: '(size: number)', desc: '每頁筆數變更' },
  { name: 'search', params: '(query: string)', desc: '搜尋文字變更' },
  { name: 'sort', params: '(info)', desc: '排序變更' },
]

const fixedTableProps = [
  { name: 'columns', type: 'ChptFixedTableColumn[]', def: '[]', desc: '欄位：{ title, dataIndex, width?, defaultFixed? }' },
  { name: 'data', type: 'Record<string, unknown>[]', def: '[]', desc: '資料列' },
  { name: 'isKeep', type: 'boolean', def: 'true', desc: '啟用欄位固定' },
  { name: 'isFilter', type: 'boolean', def: 'true', desc: '啟用欄位篩選' },
  { name: 'filterColumns', type: 'string[]', def: '[]', desc: '已套用篩選（v-model:filter-columns）' },
  { name: 'isFixed', type: 'boolean', def: 'true', desc: '固定表頭（垂直捲動）' },
  { name: 'fixedColumns', type: 'string[]', def: '[]', desc: '已固定欄位（v-model:fixed-columns）' },
  { name: 'showSearch', type: 'boolean', def: 'true', desc: '顯示全文搜尋框' },
  { name: 'searchText', type: 'string', def: "''", desc: '外部搜尋文字（v-model:search-text）' },
  { name: 'viewportOffset', type: 'number|string', def: '0', desc: '視口偏移' },
  { name: 'isPagination', type: 'boolean', def: 'false', desc: '啟用分頁' },
  { name: 'defaultPageSize', type: 'number', def: '50', desc: '分頁每頁筆數' },
  { name: 'headerFontSize / cellFontSize', type: 'string', def: 'sm / xs', desc: '字級' },
  { name: 'divideColor / divideOpacity / divideDirection / divideSize', type: 'string', def: '…', desc: '格線樣式' },
]
const fixedTableEvents = [
  { name: 'update:fixedColumns', params: '(value: string[])', desc: '固定欄位變更' },
  { name: 'update:searchText', params: '(value: string)', desc: '搜尋文字變更' },
  { name: 'update:filterColumns', params: '(value: string[])', desc: '篩選欄位變更' },
]
const fixedTableSlots = [
  { name: 'td-{dataIndex}', params: '{ row, value }', desc: '自訂某欄位 cell（如 #td-status）' },
]

const paginationProps = [
  { name: 'currentPage', type: 'number', def: '1', desc: '目前頁碼（v-model:current-page）' },
  { name: 'itemsPerPage', type: 'number', def: '—', desc: '每頁筆數（v-model:items-per-page）' },
  { name: 'totalItems', type: 'number', def: '0', desc: '總資料筆數' },
  { name: 'variant', type: "'full'|'compact'", def: "'full'", desc: '樣式' },
  { name: 'pageSizeOptions', type: 'number[]', def: '—', desc: '可選每頁筆數' },
  { name: 'showSummary', type: 'boolean', def: 'false', desc: '總數摘要' },
  { name: 'showPageSize', type: 'boolean', def: 'false', desc: '每頁筆數切換' },
  { name: 'bgColor', type: 'string', def: "''", desc: 'compact 背景 class' },
]
const paginationEvents = [
  { name: 'update:currentPage', params: '(page: number)', desc: '頁碼變更' },
  { name: 'update:itemsPerPage', params: '(size: number)', desc: '每頁筆數變更' },
  { name: 'change', params: '(page: number)', desc: '切頁完成' },
]
</script>
