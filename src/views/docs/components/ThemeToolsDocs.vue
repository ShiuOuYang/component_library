<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <div class="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl flex items-center justify-center">
          <span class="text-3xl">🌗</span>
        </div>
        <div>
          <h1 class="text-4xl font-bold text-gray-900">主題與工具元件</h1>
          <p class="text-lg text-gray-600 mt-1">ChptDarkModeToggle / ChptExcelExporter / ChptExcelUploader / ChptTooltip</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mt-6">
        <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">✓ 完成</span>
        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Vue 3</span>
        <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">改名包裝</span>
      </div>
    </div>

    <!-- ChptDarkModeToggle -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🌗</span>ChptDarkModeToggle 深色模式切換
      </h2>

      <p class="text-sm text-gray-500 mb-4">
        整合原 <code>DarkModeToggle</code> 與 <code>SimpleDarkModeToggle</code>，以 <code>variant</code> 切換兩種外觀。
      </p>

      <div class="grid md:grid-cols-2 gap-6 mb-6">
        <div class="bg-gray-50 rounded-lg p-6 border border-gray-200 flex flex-col items-center gap-3">
          <p class="text-sm font-semibold text-gray-800">variant="fancy"（華麗動畫）</p>
          <ChptDarkModeToggle v-model:dark-mode="darkFancy" variant="fancy" />
          <p class="text-xs text-gray-500">狀態：{{ darkFancy ? '深色' : '淺色' }}</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-6 border border-gray-200 flex flex-col items-center gap-3">
          <p class="text-sm font-semibold text-gray-800">variant="simple"（簡單按鈕）</p>
          <ChptDarkModeToggle v-model:dark-mode="darkSimple" variant="simple" />
          <p class="text-xs text-gray-500">狀態：{{ darkSimple ? '深色' : '淺色' }}</p>
        </div>
      </div>

      <ChptCodeBlock
        code='<ChptDarkModeToggle
  v-model:dark-mode="darkMode"
  variant="fancy"    <!-- 或 simple -->
/>'
        language="html"
      />

      <div class="mt-4 text-sm text-gray-500">
        <strong>Props：</strong><code>variant</code>（fancy/simple）、<code>initialDarkMode</code>、<code>showControls</code>、<code>syncBodyByDefault</code>、<code>darkMode</code>（v-model:dark-mode）。
        <strong>事件：</strong><code>update:darkMode</code>、<code>toggle</code>。透過 <code>syncBodyByDefault</code> 可自動同步 <code>&lt;body&gt;</code> 的 class / data-dark-mode。
      </div>
    </section>

    <!-- ChptExcelExporter -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">📤</span>ChptExcelExporter 匯出 Excel
      </h2>
      <p class="text-sm text-gray-500 mb-4">
        改名包裝原 <code>ExcelExporter</code>。一鍵將表格資料匯出為 <code>.xlsx</code>，支援欄位選擇、工作表命名與儲存格樣式。
      </p>

      <div class="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
        <ChptExcelExporter
          :data="exportData"
          :columns="exportColumns"
          button-label="匯出範例 Excel"
          variant="green"
          show-options
        />
      </div>

      <ChptCodeBlock
        code='<ChptExcelExporter
  :data="rows"
  :columns="[{ key: "name", title: "名稱" }]"
  default-filename="Report"
  default-sheet-name="Sheet1"
  :show-options="true"
  @export-complete="handleDone"
/>'
        language="html"
      />

      <p class="mt-4 text-sm text-gray-500">
        <strong>Props：</strong><code>data</code>、<code>columns</code>（key/title）、<code>defaultFilename</code>、<code>defaultSheetName</code>、<code>showOptions</code>、<code>size</code>、<code>variant</code>、<code>cellStyles</code>。
        <strong>事件：</strong><code>export-start</code> / <code>export-complete</code> / <code>export-error</code>。ref 可呼叫 <code>exportExcel()</code>、<code>showExportOptions()</code>。
      </p>
    </section>

    <!-- ChptExcelUploader -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">📥</span>ChptExcelUploader 匯入 Excel
      </h2>
      <p class="text-sm text-gray-500 mb-4">
        改名包裝原 <code>ExcelUploader</code>。讓使用者選擇 <code>.xlsx/.xls</code> 檔案並解析為 JSON 陣列。
      </p>

      <div class="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
        <ChptExcelUploader
          label="匯入範例"
          variant="soft-blue"
          show-file-name
          @data-loaded="onDataLoaded"
        />
        <p v-if="uploadPreview.length" class="text-xs text-gray-600 mt-2">
          已載入 {{ uploadPreview.length }} 筆：<code>{{ JSON.stringify(uploadPreview[0]) }}</code>
        </p>
      </div>

      <ChptCodeBlock
        code='<ChptExcelUploader
  label="匯入 Excel"
  variant="soft-blue"
  show-file-name
  @data-loaded="(rows) => console.log(rows)"
  @upload-success="handleSuccess"
/>'
        language="html"
      />

      <p class="mt-4 text-sm text-gray-500">
        <strong>Props：</strong><code>label</code>、<code>loadingText</code>、<code>size</code>、<code>variant</code>、<code>showFileName</code>。
        <strong>事件：</strong><code>data-loaded(jsonData)</code>、<code>error</code>、<code>upload-start</code> / <code>upload-success</code> / <code>upload-error</code>。
      </p>
    </section>

    <!-- ChptTooltip -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">💬</span>ChptTooltip 提示框
      </h2>
      <p class="text-sm text-gray-500 mb-4">
        改名包裝原 <code>CommonTooltip</code>（完整浮動提示），是相對 <code>Tooltip</code> 的高階版本，支援 interactivity、限制寬度、定位策略。
      </p>

      <div class="flex items-start gap-8 bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
        <ChptTooltip content="這是上方提示" placement="top" :max-width="200">
          <ChptButton size="sm" is-outline>上方提示</ChptButton>
        </ChptTooltip>
        <ChptTooltip content="這是右側提示，較長文字會自動換行" placement="right">
          <ChptButton size="sm" is-outline>右側提示</ChptButton>
        </ChptTooltip>
      </div>

      <ChptCodeBlock
        code='<ChptTooltip content="提示文字" placement="top" :max-width="200">
  <ChptButton>被提示的元素</ChptButton>
</ChptTooltip>'
        language="html"
      />

      <p class="mt-4 text-sm text-gray-500">
        <strong>常見 Props：</strong><code>content</code>、<code>placement</code>（top/right/bottom/left）、<code>maxWidth</code>、<code>interactive</code>、<code>persistent</code>。詳細請參考 <router-link to="/docs/components/tooltip" class="text-blue-600 underline">Tooltip 文件</router-link>。
      </p>
    </section>

    <!-- 其他改名包裝元件 -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🎁</span>其他改名包裝元件
      </h2>

      <div class="grid md:grid-cols-2 gap-4 text-sm">
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="font-semibold text-gray-800 mb-1">🏷️ ChptModalDock</p>
          <p class="text-xs text-gray-600">包裝 <code>ModalDock</code>，顯示被最小化的 window 模式視窗口袋列。搭配 <code>ChptModal mode="window"</code> 使用。</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="font-semibold text-gray-800 mb-1">🖱️ ChptPageSwitcher</p>
          <p class="text-xs text-gray-600">包裝 <code>PageSwitcher</code> 左側頁面切換滑出面板。</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="font-semibold text-gray-800 mb-1">📑 ChptTabNavigation</p>
          <p class="text-xs text-gray-600">包裝 <code>TabNavigation</code> 頁籤導航（<code>tabs</code> 含 <code>path</code>/<code>label</code>、<code>fontSize</code>）。</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="font-semibold text-gray-800 mb-1">🚪 ChptHeaderLogoutButton</p>
          <p class="text-xs text-gray-600">包裝 <code>HeaderLogoutButton</code> 登出按鈕（<code>size</code>/<code>variant</code>/<code>label</code>），整合 <code>useAuth</code> 登出流程。</p>
        </div>
      </div>
    </section>

    <section class="bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">💻</span>引入方式
      </h2>
      <ChptCodeBlock
        code='import {
  ChptDarkModeToggle,
  ChptExcelExporter,
  ChptExcelUploader,
  ChptTooltip,
  ChptModalDock,
  ChptPageSwitcher,
  ChptTabNavigation,
  ChptHeaderLogoutButton
} from "@/components/common"'
        language="js"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  ChptDarkModeToggle,
  ChptExcelExporter,
  ChptExcelUploader,
  ChptTooltip,
  ChptButton,
  ChptCodeBlock
} from '@/components/common'

const darkFancy = ref(false)
const darkSimple = ref(false)

// ExcelExporter 範例資料
const exportColumns = [
  { key: 'name', title: '名稱' },
  { key: 'age', title: '年齡' }
]
const exportData = [
  { name: '張三', age: 28 },
  { name: '李四', age: 34 }
]

// ExcelUploader 範例
const uploadPreview = ref<any[]>([])
function onDataLoaded(rows: any[]) {
  uploadPreview.value = rows
}
</script>
