<template>
  <div class="min-h-screen bg-neutral-50 p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-neutral-900 mb-2">ChptTable / ChptFixedTable 表格</h1>
        <p class="text-lg text-neutral-600">
          通用資料表格：ChptTable（搜尋＋排序＋分頁）、ChptFixedTable（固定欄位＋欄位篩選）、ChptPagination（分頁）。
          請由 <code class="bg-neutral-100 px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <!-- ChptTable -->
      <section class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-2">ChptTable — 通用表格</h2>
        <p class="text-sm text-neutral-600 mb-4">
          以 columns（key/title）＋ data 驅動，內建全文搜尋、欄位排序與分頁（PaginationControls）。
        </p>
        <ChptTable
          :columns="tableColumns"
          :data="tableData"
          search-placeholder="輸入關鍵字搜尋..."
          :default-page-size="5"
          pagination-position="bottom"
        />
        <div class="mt-4">
          <ChptCodeBlock
            language="html"
            code='<ChptTable :columns="columns" :data="rows" :default-page-size="5" pagination-position="bottom" />'
          />
        </div>
      </section>

      <!-- ChptFixedTable -->
      <section class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-2">ChptFixedTable — 固定欄位表格</h2>
        <p class="text-sm text-neutral-600 mb-4">
          欄位以 dataIndex/width 定義；啟用 is-keep 可固定欄位、is-filter 可欄位篩選、show-search 全文搜尋。
        </p>
        <ChptFixedTable
          :columns="fixedColumns"
          :data="tableData"
          :is-keep="true"
          :is-filter="true"
          :is-fixed="true"
          :viewport-offset="200"
          v-model:fixed-columns="fixedCols"
        />
        <div class="mt-4 text-sm text-neutral-600">
          目前固定欄位：<span class="font-mono font-semibold">{{ fixedCols.join(', ') }}</span>
        </div>
        <div class="mt-4">
          <ChptCodeBlock
            language="html"
            code='<ChptFixedTable :columns="columns" :data="rows" is-keep is-filter v-model:fixed-columns="fixed" />'
          />
        </div>
      </section>

      <!-- ChptPagination -->
      <section class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-2">ChptPagination — 分頁</h2>
        <p class="text-sm text-neutral-600 mb-4">
          可獨立使用（full / compact 兩型）；與 ChptTable／ChptFixedTable 分頁欄位共用。
        </p>
        <div class="flex items-center gap-4">
          <span class="text-sm text-neutral-600 whitespace-nowrap">共 {{ totalItems }} 筆</span>
          <ChptPagination
            v-model:current-page="page"
            v-model:items-per-page="pageSize"
            :total-items="totalItems"
            variant="compact"
            show-summary
          />
        </div>
        <div class="mt-4">
          <ChptCodeBlock
            language="html"
            code='<ChptPagination v-model:current-page="page" v-model:items-per-page="size" :total-items="total" />'
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  ChptTable,
  ChptFixedTable,
  ChptPagination,
  ChptCodeBlock,
} from '@/components/library'

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

const fixedColumns = [
  { title: 'ID', dataIndex: 'id', width: 80, defaultFixed: true },
  { title: '姓名', dataIndex: 'name', width: 120 },
  { title: '部門', dataIndex: 'department', width: 150 },
  { title: '職稱', dataIndex: 'position', width: 150 },
  { title: '狀態', dataIndex: 'status', width: 120 },
]

const fixedCols = ref(['id'])

const totalItems = 237
const page = ref(1)
const pageSize = ref(20)
</script>
