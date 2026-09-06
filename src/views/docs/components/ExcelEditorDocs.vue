<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">📑</span>
        <h1 class="text-4xl font-bold text-neutral-900">Excel 編輯器</h1>
      </div>
      <p class="text-neutral-600 text-lg max-w-4xl">
        ChptExcelEditor — 仿原生 Excel 的試算表元件：多工作表、就地編輯、公式引擎、
        格式化、合併儲存格、複製貼上、復原重做，並可匯出 <code>.xlsx</code>。
      </p>
    </div>

    <!-- ============ 主要示範 ============ -->
    <section id="excel-demo" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">完整試算表示範</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>需要在網頁內直接編輯表格資料（如報表填寫、資料匯入前檢核）。
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptExcelEditor } from '@/components/library/excel'</code>
      </p>

      <div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200 mb-4">
        <ChptExcelEditor
          ref="editorRef"
          default-filename="銷售報表"
          default-sheet-name="銷售"
          @export-complete="handleExport"
        />
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="editorSample" />
      </div>

      <ApiTable title="Props" :rows="editorProps" />
      <ApiTable title="Events" :rows="editorEvents" />
      <ApiTable title="Expose（ref）" :rows="editorExpose" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>範例提供工具列與工作表頁籤；資料可經 <code>v-model</code> 或
        <code>ref.getData()</code> 取得，匯出功能直接輸出 <code>.xlsx</code> 檔。
      </p>
    </section>

    <!-- ============ 功能特色 ============ -->
    <section id="excel-features" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">功能特色</h2>
      <div class="grid md:grid-cols-2 gap-4 text-sm">
        <div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <p class="font-semibold text-neutral-800 mb-1">📑 多工作表</p>
          <p class="text-xs text-neutral-600">可新增／重新命名／刪除工作表，底部頁籤切換。</p>
        </div>
        <div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <p class="font-semibold text-neutral-800 mb-1">🧮 公式引擎與提示</p>
          <p class="text-xs text-neutral-600">
            <code>SUM</code>／<code>AVERAGE</code>／<code>MIN</code>／<code>MAX</code>／<code>COUNT</code>／<code>IF</code>。
            輸入 <code>=</code> 自動完成函式、<code>(</code> 後顯示<strong>參數提示</strong>，或點「fx」開啟函式面板。
          </p>
        </div>
        <div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <p class="font-semibold text-neutral-800 mb-1">🎨 格式化工具列</p>
          <p class="text-xs text-neutral-600">粗體／斜體／底線、對齊、插入／刪除列欄、合併儲存格、排序。</p>
        </div>
        <div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <p class="font-semibold text-neutral-800 mb-1">⌨️ 鍵盤捷徑</p>
          <p class="text-xs text-neutral-600">方向鍵移動、Enter／Tab、<code>F2</code> 編輯、<code>Delete</code> 清除、<code>Ctrl+Z/Y/C/X/V/B/I/U</code>。</p>
        </div>
        <div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <p class="font-semibold text-neutral-800 mb-1">🖱️ 範圍選取／拖曳多選</p>
          <p class="text-xs text-neutral-600">拖曳多選矩形範圍；拖曳右下角綠色把手可向下／向右填滿；點擊列／欄標題選取整列欄。</p>
        </div>
        <div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <p class="font-semibold text-neutral-800 mb-1">📋 複製選取範圍</p>
          <p class="text-xs text-neutral-600">複製單格後多選貼上會自動<strong>填滿整個範圍</strong>；同時寫入<strong>系統剪貼簿</strong>（TSV＋HTML），可貼到 Excel／Word，也支援 <code>Ctrl+V</code> 貼入。</p>
        </div>
        <div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <p class="font-semibold text-neutral-800 mb-1">📤 匯出 .xlsx</p>
          <p class="text-xs text-neutral-600">保留樣式、合併儲存格、欄寬，多工作表一次匯出。</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptExcelEditor, ChptCodeBlock } from '@/components/library'
import ApiTable from './_ApiTable.vue'

const editorRef = ref(null)

function handleExport(payload) {
  console.log('匯出完成:', payload)
}

// ---- 程式碼範例（字串，避免模板解析） ----
const editorSample = `<ChptExcelEditor
  ref="editorRef"
  default-filename="銷售報表"
  default-sheet-name="銷售"
  @export-complete="handleExport"
/>`

// ---- API 資料（依元件使用方式整理，細節以元件為準） ----
const editorProps = [
  { name: 'modelValue', type: 'Array', def: '—', desc: '初始資料陣列（v-model）' },
  { name: 'showToolbar', type: 'boolean', def: 'true', desc: '顯示格式化工具列' },
  { name: 'showSheetTabs', type: 'boolean', def: 'true', desc: '顯示工作表頁籤' },
  { name: 'rowCount / colCount', type: 'number', def: '—', desc: '預設列數／欄數' },
  { name: 'editable', type: 'boolean', def: 'true', desc: '是否可編輯' },
  { name: 'enableFormula', type: 'boolean', def: 'true', desc: '是否啟用公式' },
  { name: 'defaultFilename', type: 'string', def: "''", desc: '匯出預設檔名' },
  { name: 'defaultSheetName', type: 'string', def: "''", desc: '第一個工作表名稱' },
]
const editorEvents = [
  { name: 'update:modelValue', params: '(data)', desc: '資料變更（v-model）' },
  { name: 'cell-change', params: '(cell)', desc: '儲存格變更' },
  { name: 'selection-change', params: '(range)', desc: '選取範圍變更' },
  { name: 'sheet-add / sheet-remove', params: '(sheet)', desc: '新增／移除工作表' },
  { name: 'export-start / export-complete / export-error', params: '(payload)', desc: '匯出流程事件' },
]
const editorExpose = [
  { name: 'exportExcel()', params: '—', desc: '程式化匯出 .xlsx' },
  { name: 'getData()', params: '—', desc: '取得全部資料' },
  { name: 'getCell(r, c)', params: '(row, col)', desc: '取得指定儲存格' },
  { name: 'undo() / redo()', params: '—', desc: '復原／重做' },
  { name: 'addSheet()', params: '—', desc: '新增工作表' },
  { name: 'clear()', params: '—', desc: '清空內容' },
]
</script>
