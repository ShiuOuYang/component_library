<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <div class="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
          <span class="text-3xl">📊</span>
        </div>
        <div>
          <h1 class="text-4xl font-bold text-gray-900">資料呈現與過濾元件</h1>
          <p class="text-lg text-gray-600 mt-1">ChptPagination / ChptFilter / ChptFilterBar / ChptCodeBlock</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mt-6">
        <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">✓ 整合完成</span>
        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Vue 3 + TS</span>
        <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">Tailwind CSS</span>
      </div>
    </div>

    <!-- ChptPagination -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🔢</span>ChptPagination 分頁
      </h2>

      <p class="text-sm text-gray-500 mb-4">
        整合原 <code>Pagination</code> 與 <code>PaginationControls</code>，以 <code>variant</code> 切換兩種風格。
      </p>

      <div class="grid md:grid-cols-2 gap-4 mb-6">
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="text-sm font-semibold text-gray-800 mb-2">variant="full"（完整分頁）</p>
          <ChptPagination
            v-model:current-page="page"
            :total-items="250"
            :items-per-page="20"
            variant="full"
            @change="onPageChange"
          />
        </div>
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="text-sm font-semibold text-gray-800 mb-2">variant="compact"（精簡控制）</p>
          <ChptPagination
            v-model:current-page="pageC"
            :total-items="250"
            :items-per-page="20"
            variant="compact"
            show-summary
            @change="onPageChange"
          />
        </div>
      </div>

      <ChptCodeBlock
        code='<ChptPagination
  v-model:current-page="page"
  :total-items="250"
  :items-per-page="20"
  variant="full"
  @change="onPageChange"
/>'
        language="html"
      />

      <div class="grid md:grid-cols-2 gap-4 mt-4 text-sm">
        <div class="bg-gray-50 rounded-lg p-4">
          <p class="font-semibold text-gray-800 mb-2">Props</p>
          <ul class="text-gray-600 space-y-1 text-xs">
            <li><code>variant</code> full / compact</li>
            <li><code>currentPage</code>（v-model:current-page）</li>
            <li><code>itemsPerPage</code>（v-model:items-per-page）</li>
            <li><code>totalItems</code> 總資料數</li>
            <li><code>pageSizeOptions</code> 每頁筆數選項</li>
          </ul>
        </div>
        <div class="bg-gray-50 rounded-lg p-4">
          <p class="font-semibold text-gray-800 mb-2">Events / 選項</p>
          <ul class="text-gray-600 space-y-1 text-xs">
            <li><code>update:currentPage</code> / <code>update:itemsPerPage</code></li>
            <li><code>change(page)</code></li>
            <li><code>showSummary</code> 顯示總數摘要</li>
            <li><code>showPageSize</code> 顯示每頁筆數</li>
            <li><code>bgColor</code>（compact 背景 class）</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ChptFilter -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🔽</span>ChptFilter 過濾選擇
      </h2>

      <p class="text-sm text-gray-500 mb-4">
        整合原 <code>FilterSelect</code> / <code>FilterDropdown</code> / <code>TagFilterDropdown</code>，以 <code>type</code> 切換三種樣式。
      </p>

      <div class="grid md:grid-cols-3 gap-4 mb-6">
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="text-sm font-semibold text-gray-800 mb-2">select（單選）</p>
          <ChptFilter v-model="filterSelect" type="select" label="部門" :options="deptOptions" />
          <p class="text-xs text-gray-500 mt-2">目前：{{ filterSelect || '全部' }}</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="text-sm font-semibold text-gray-800 mb-2">dropdown（多選）</p>
          <ChptFilter v-model="filterDropdown" type="dropdown" placeholder="請選擇狀態" :options="statusOptions" />
        </div>
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="text-sm font-semibold text-gray-800 mb-2">tag（帶搜尋多選）</p>
          <ChptFilter v-model="filterTag" type="tag" label="標籤" placeholder="搜尋..." :options="tagOptions" />
        </div>
      </div>

      <ChptCodeBlock
        code='<ChptFilter v-model="value" type="select" label="部門" :options="options" />

<ChptFilter v-model="multi" type="dropdown" :options="options" />

<ChptFilter v-model="multi" type="tag" placeholder="搜尋..." :options="options" />'
        language="html"
      />

      <div class="mt-4 text-sm">
        <p class="font-semibold text-gray-800 mb-2">型別注意</p>
        <p class="text-gray-600 text-xs mb-1"><strong>select：</strong><code>modelValue</code> 為 `String | Number`（單選值）。</p>
        <p class="text-gray-600 text-xs mb-1"><strong>dropdown / tag：</strong><code>modelValue</code> 為 `Array`（多選值）。</p>
        <p class="text-gray-600 text-xs">選項可傳 primitive（`['A','B']`）或物件（`[{ label, value }]`），可用 <code>valueKey</code>/<code>labelKey</code> 指定鍵名。</p>
      </div>
    </section>

    <!-- ChptFilterBar -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🎛️</span>ChptFilterBar 多欄位過濾橫列
      </h2>

      <p class="text-sm text-gray-500 mb-4">
        整合原 <code>FilterBar</code>，以 <code>filters</code> 陣列描述多個單選過濾器，並以單一物件 <code>modelValue</code> 雙向綁定。
      </p>

      <div class="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
        <ChptFilterBar v-model="filterState" :filters="barFilters" :count="42" count-label="筆資料" />
      </div>

      <ChptCodeBlock
        code='const barFilters = [
  { key: "status", label: "狀態", options: [
    { value: "active", label: "啟用", count: 20 },
    { value: "disabled", label: "停用", count: 22 }
  ]},
  { key: "dept", label: "部門", options: [
    { value: "rd", label: "研發" },
    { value: "qa", label: "品保" }
  ]}
]

<ChptFilterBar v-model="state" :filters="barFilters" :count="42" count-label="筆資料" />'
        language="html"
      />

      <p class="mt-4 text-sm text-gray-500">
        <strong>Props：</strong><code>filters</code>（key/label/options/allLabel/allCount）、<code>modelValue</code>（Record&lt;string,string&gt;）、<code>showCount</code>/<code>count</code>/<code>countLabel</code>。
        <strong>事件：</strong><code>update:modelValue</code>。
      </p>
    </section>

    <!-- ChptCodeBlock -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">💻</span>ChptCodeBlock 程式碼區塊
      </h2>
      <p class="text-sm text-gray-500 mb-4">
        改名的通用程式碼展示區塊（re-export <code>CodeBlock</code>）。本頁所有程式範例皆使用它呈現。
      </p>
      <ChptCodeBlock
        code='<ChptCodeBlock code="..." language="html" :tip="..." tip-type="info" />'
        language="html"
        tip="使用 code prop 傳入內容，可搭配 tip / tipType 顯示提示訊息。"
        tip-type="info"
        tip-title="用法提示"
      />
    </section>

    <section class="bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">💻</span>引入方式
      </h2>
      <ChptCodeBlock
        code='import { ChptPagination, ChptFilter, ChptFilterBar, ChptCodeBlock } from "@/components/common"'
        language="js"
      />
      <p class="mt-4 text-sm text-gray-500">
        提醒：進階資料表格請使用 <strong>ChptTable</strong>（整合欄位固定、篩選、全文搜尋、分頁），並可搭配 <code>CommonTable</code> 的排序與分頁位置設定。文件可參考 <router-link to="/docs/components/common-table" class="text-blue-600 underline">CommonTable 文件</router-link>。
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  ChptPagination,
  ChptFilter,
  ChptFilterBar,
  ChptCodeBlock
} from '@/components/common'

// ===== ChptPagination =====
const page = ref(1)
const pageC = ref(1)
function onPageChange(p: number) {
  console.log('切換到第', p, '頁')
}

// ===== ChptFilter =====
const filterSelect = ref('')
const filterDropdown = ref([])
const filterTag = ref([])
const deptOptions = [
  { value: 'rd', label: '研發部' },
  { value: 'qa', label: '品保部' },
  { value: 'mfg', label: '製造部' }
]
const statusOptions = ['啟用', '停用', '待審核', '已刪除']
const tagOptions = ['Vue', 'React', 'Angular', 'Svelte', 'Solid']

// ===== ChptFilterBar =====
const filterState = ref<Record<string, string>>({})
const barFilters = [
  {
    key: 'status',
    label: '狀態',
    options: [
      { value: 'active', label: '啟用', count: 20 },
      { value: 'disabled', label: '停用', count: 12 },
      { value: 'pending', label: '待審核', count: 10 }
    ]
  },
  {
    key: 'dept',
    label: '部門',
    options: [
      { value: 'rd', label: '研發', count: 15 },
      { value: 'qa', label: '品保', count: 10 },
      { value: 'mfg', label: '製造', count: 17 }
    ]
  }
]
</script>
