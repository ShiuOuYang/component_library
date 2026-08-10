<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <div class="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center">
          <span class="text-3xl">📝</span>
        </div>
        <div>
          <h1 class="text-4xl font-bold text-gray-900">Excel 編輯器</h1>
          <p class="text-lg text-gray-600 mt-1">ChptExcelEditor / ExcelEditor — 仿原生 Excel 試算表</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mt-6">
        <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">✓ 完成</span>
        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Vue 3</span>
        <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">公式引擎</span>
        <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">多工作表</span>
      </div>
    </div>

    <!-- 主要示範 -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">📊</span>完整試算表示範
      </h2>
      <p class="text-sm text-gray-500 mb-4">
        支援多工作表、就地編輯、公式（<code>=SUM(A2:A4)</code>）、格式化、合併儲存格、插入/刪除列欄、複製貼上、復原重做，並可匯出為 <code>.xlsx</code>。
      </p>

      <div class="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
        <ChptExcelEditor
          ref="editorRef"
          default-filename="銷售報表"
          default-sheet-name="銷售"
          @export-complete="handleExport"
        />
      </div>

      <ChptCodeBlock
        code='<ChptExcelEditor
  ref="editorRef"
  default-filename="銷售報表"
  default-sheet-name="銷售"
  @export-complete="handleExport"
/>'
        language="html"
      />
    </section>

    <!-- 功能特色 -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">✨</span>功能特色
      </h2>
      <div class="grid md:grid-cols-2 gap-4 text-sm">
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="font-semibold text-gray-800 mb-1">📑 多工作表</p>
          <p class="text-xs text-gray-600">可新增 / 重新命名 / 刪除工作表，底部頁籤切換。</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="font-semibold text-gray-800 mb-1">🧮 公式引擎與提示</p>
          <p class="text-xs text-gray-600"><code>SUM</code> / <code>AVERAGE</code> / <code>MIN</code> / <code>MAX</code> / <code>COUNT</code> / <code>IF</code>。公式列輸入 <code>=</code> 自動完成函式、輸入 <code>(</code> 後顯示<strong>參數提示</strong>，或點「fx」開啟函式面板。</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="font-semibold text-gray-800 mb-1">🎨 格式化工具列</p>
          <p class="text-xs text-gray-600">粗體 / 斜體 / 底線、對齊、插入/刪除列欄、合併儲存格、排序。</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="font-semibold text-gray-800 mb-1">⌨️ 鍵盤捷徑</p>
          <p class="text-xs text-gray-600">方向鍵移動、Enter/Tab、<code>F2</code> 編輯、<code>Delete</code> 清除、<code>Ctrl+Z/Y/C/X/V/B/I/U</code>。</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="font-semibold text-gray-800 mb-1">🖱️ 範圍選取 / 拖曳多選</p>
          <p class="text-xs text-gray-600">按住滑鼠拖曳多選矩形範圍；拖曳選取範圍右下角綠色把手可向下/向右填滿；點擊列/欄標題選取整列欄。</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="font-semibold text-gray-800 mb-1">📋 複製選取範圍</p>
          <p class="text-xs text-gray-600">複製單格後選取多格貼上會自動<strong>填滿整個選取範圍</strong>；複製同步寫入<strong>系統剪貼簿</strong>（TSV + HTML）可貼到 Excel / Word，也支援 <code>Ctrl+V</code> 貼入。</p>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="font-semibold text-gray-800 mb-1">📤 匯出 .xlsx</p>
          <p class="text-xs text-gray-600">保留樣式、合併儲存格、欄寬，多工作表一次匯出。</p>
        </div>
      </div>
    </section>

    <!-- 引入方式 -->
    <section class="bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">💻</span>引入方式與 API
      </h2>
      <ChptCodeBlock
        code='import { ChptExcelEditor, ExcelEditor } from "@/components/common"'
        language="js"
        class="mb-4"
      />

      <div class="grid md:grid-cols-2 gap-6 text-sm">
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="font-semibold text-gray-800 mb-2">Props</p>
          <ul class="space-y-1 text-xs text-gray-600">
            <li><code>modelValue</code> — 初始資料陣列（v-model）</li>
            <li><code>showToolbar</code> / <code>showSheetTabs</code></li>
            <li><code>rowCount</code> / <code>colCount</code> — 列數 / 欄數</li>
            <li><code>editable</code> — 是否可編輯</li>
            <li><code>enableFormula</code> — 是否啟用公式</li>
            <li><code>defaultFilename</code> / <code>defaultSheetName</code></li>
          </ul>
        </div>
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p class="font-semibold text-gray-800 mb-2">Events &amp; Methods</p>
          <ul class="space-y-1 text-xs text-gray-600">
            <li><code>update:modelValue</code> / <code>cell-change</code></li>
            <li><code>selection-change</code> / <code>sheet-add</code> / <code>sheet-remove</code></li>
            <li><code>export-start</code> / <code>export-complete</code> / <code>export-error</code></li>
            <li class="pt-2 border-t border-gray-200"><strong>Ref：</strong><code>exportExcel()</code>、<code>getData()</code>、<code>getCell(r,c)</code>、<code>undo()</code>、<code>redo()</code>、<code>addSheet()</code>、<code>clear()</code></li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ChptExcelEditor, ChptCodeBlock } from '@/components/common'

const editorRef = ref<InstanceType<typeof ChptExcelEditor> | null>(null)

function handleExport(payload: { filename: string }) {
  console.log('匯出完成:', payload)
}
</script>