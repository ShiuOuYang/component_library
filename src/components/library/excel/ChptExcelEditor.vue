<template>
  <div
    ref="containerRef"
    class="chpt-excel-editor w-full rounded-xl border border-stroke-light bg-surface-primary shadow-sm overflow-hidden select-none"
    @mousedown="onGridMouseDown"
    @mousemove="onGridMouseMove"
    @mouseup="onGridMouseUp"
    @keydown="handleKeydown"
    @paste="pasteFromSystem"
    tabindex="0"
  >
    <!-- ===== 主工具列 ===== -->
    <div v-if="showToolbar" class="border-b border-stroke-light bg-surface-secondary">
      <div class="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-stroke-light">
        <span class="px-2 text-xs font-semibold text-content-secondary">Excel 編輯器</span>

        <!-- 復原 / 重做 -->
        <button type="button" class="tb-btn" :disabled="!canUndo" @mousedown.prevent="undo" title="復原 (Ctrl+Z)">↩</button>
        <button type="button" class="tb-btn" :disabled="!canRedo" @mousedown.prevent="redo" title="重做 (Ctrl+Y)">↪</button>

        <span class="tb-sep"></span>

        <!-- 剪下 / 複製 / 貼上 -->
        <button type="button" class="tb-btn" @mousedown.prevent="cutSelection" title="剪下 (Ctrl+X)">✂</button>
        <button type="button" class="tb-btn" @mousedown.prevent="copySelection" title="複製 (Ctrl+C)">⧉</button>
        <button type="button" class="tb-btn" @mousedown.prevent="pasteSelection" title="貼上 (Ctrl+V)">📋</button>

        <span class="tb-sep"></span>

        <!-- 字型樣式 -->
        <button type="button" class="tb-btn" :class="{ active: activeCellStyle.bold }" @mousedown.prevent="toggleStyle('bold')" title="粗體 (Ctrl+B)"><b>B</b></button>
        <button type="button" class="tb-btn" :class="{ active: activeCellStyle.italic }" @mousedown.prevent="toggleStyle('italic')" title="斜體 (Ctrl+I)"><i>I</i></button>
        <button type="button" class="tb-btn" :class="{ active: activeCellStyle.underline }" @mousedown.prevent="toggleStyle('underline')" title="底線 (Ctrl+U)"><u>U</u></button>

        <span class="tb-sep"></span>

        <!-- 對齊 -->
        <button type="button" class="tb-btn" :class="{ active: activeCellStyle.align === 'left' }" @mousedown.prevent="setAlign('left')" title="靠左">⇤</button>
        <button type="button" class="tb-btn" :class="{ active: activeCellStyle.align === 'center' }" @mousedown.prevent="setAlign('center')" title="置中">⇔</button>
        <button type="button" class="tb-btn" :class="{ active: activeCellStyle.align === 'right' }" @mousedown.prevent="setAlign('right')" title="靠右">⇥</button>

        <span class="tb-sep"></span>

        <!-- 插入列 / 欄 -->
        <button type="button" class="tb-btn" @mousedown.prevent="insertRow" title="上方插入列">↑列</button>
        <button type="button" class="tb-btn" @mousedown.prevent="insertColumn" title="左側插入欄">+欄</button>
        <button type="button" class="tb-btn" @mousedown.prevent="deleteRow" title="刪除列">−列</button>
        <button type="button" class="tb-btn" @mousedown.prevent="deleteColumn" title="刪除欄">−欄</button>

        <span class="tb-sep"></span>

        <!-- 合併 / 排序 -->
        <button type="button" class="tb-btn" @mousedown.prevent="toggleMerge" title="合併儲存格">⊞</button>
        <button type="button" class="tb-btn" @mousedown.prevent="sortRange('asc')" title="依選取範圍升冪排序">A↑</button>
        <button type="button" class="tb-btn" @mousedown.prevent="sortRange('desc')" title="依選取範圍降冪排序">A↓</button>
        <button type="button" class="tb-btn" @mousedown.prevent="clearSelection" title="清除選取內容 (Delete)">🗑</button>

        <span class="tb-sep"></span>

        <!-- 凍結窗格 -->
        <button type="button" class="tb-btn" @mousedown.prevent="freezeToActive" title="凍結到目前儲存格左上方">凍結</button>
        <button type="button" class="tb-btn" @mousedown.prevent="unfreezePanes" title="取消凍結">解凍</button>

        <span class="tb-sep"></span>

        <!-- 數值格式 -->
        <select
          class="h-7 px-2 text-xs text-content-primary bg-surface-primary border border-stroke-light rounded focus:outline-none focus:ring-1 focus:ring-success"
          :value="activeNumFmt"
          @change="setNumFmt(($event.target as HTMLSelectElement).value)"
          title="套用數字格式"
        >
          <option value="">一般格式</option>
          <option value="0">整數</option>
          <option value="0.00">小數 2 位</option>
          <option value="#,##0">千分位整數</option>
          <option value="#,##0.00">千分位小數</option>
          <option value="0%">百分比整數</option>
          <option value="0.00%">百分比小數</option>
        </select>
      </div>

      <!-- ===== 名稱框 + 公式列 ===== -->
      <div class="relative flex items-center gap-1 px-2 py-1 border-b border-stroke-light bg-surface-primary">
        <input
          class="w-24 px-2 py-1 text-xs font-mono text-content-primary bg-surface-secondary border border-stroke-default rounded focus:outline-none focus:ring-1 focus:ring-success text-center"
          :value="activeCellRef"
          readonly
        />
        <span class="text-content-disabled">|</span>
        <button type="button"
          class="tb-btn !w-7"
          @click.stop="toggleFxPanel"
          title="插入函式"
        >
          fx
        </button>
        <input
          v-model="formulaBarValue"
          :disabled="!singleCellSelected"
          ref="formulaInputRef"
          class="flex-1 px-2 py-1 text-sm text-content-primary border border-stroke-default rounded focus:outline-none focus:ring-1 focus:ring-success"
          placeholder="輸入數值或公式，如 =SUM(A1:A3)"
          @input="onFormulaInput"
          @keydown.enter.prevent="commitFormulaBar"
          @blur.exact="commitFormulaBar"
          @keydown.esc="resetFormulaBar"
          @keydown.down.prevent="suggestionMove(1)"
          @keydown.up.prevent="suggestionMove(-1)"
          @keydown.tab.prevent="suggestionApply"
          @focus="onFormulaFocus"
        />

        <!-- 自動完成建議 -->
        <div
          v-if="formulaSuggestions.length > 0"
          class="absolute z-50 mt-1 w-72 max-h-56 overflow-auto bg-surface-primary border border-stroke-default rounded-lg shadow-lg py-1"
          style="top: 100%"
        >
          <div
            v-for="(fn, idx) in formulaSuggestions"
            :key="fn.name"
            class="px-3 py-1.5 cursor-pointer hover:bg-success-subtle"
            :class="{ 'bg-success-subtle-hover': idx === activeSuggestionIndex }"
            @mousedown.prevent="applySuggestion(fn)"
          >
            <span class="font-mono font-semibold text-success">{{ fn.name }}</span>
            <span class="text-xs text-content-tertiary ml-2">{{ fn.description }}</span>
          </div>
        </div>

        <!-- 函式參數提示 -->
        <div
          v-if="formulaHint"
          class="absolute left-24 right-2 z-40 mt-1 px-3 py-1.5 bg-info-subtle border border-info-subtle-border rounded-lg shadow-sm flex items-center gap-2"
          style="top: 100%"
        >
          <span class="font-mono font-semibold text-info-on-subtle">{{ formulaHint.name }}({{ formulaHint.args }})</span>
          <span class="text-xs text-accent">{{ formulaHint.description }}</span>
        </div>
      </div>
    </div>

    <!-- ===== 插入函式面板 ===== -->
    <div
      v-if="showFxPanel"
      class="border-b border-stroke-light bg-surface-secondary px-3 py-2 relative z-40"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold text-content-secondary">選擇函式</span>
        <button type="button" class="text-xs text-content-disabled hover:text-content-secondary" @click="showFxPanel = false">✕</button>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-40 overflow-auto">
        <button type="button"
          v-for="fn in FUNCTION_LIST"
          :key="fn.name"
          class="text-left px-2 py-1.5 text-xs bg-surface-primary border border-stroke-light rounded hover:border-green-400 hover:bg-success-subtle transition-colors"
          @click="insertFunction(fn.name)"
        >
          <span class="font-mono font-semibold text-success">{{ fn.name }}</span>
          <span class="block text-[10px] text-content-tertiary">{{ fn.description }}</span>
        </button>
      </div>
    </div>

    <!-- ===== 表格主體 ===== -->
    <div class="overflow-auto excel-grid">
      <table class="grid-table">
        <thead>
          <tr>
            <th class="grid-corner" @mousedown.prevent="selectAll"></th>
            <th
              v-for="c in colCount"
              :key="'c' + c"
              class="grid-col-header"
              :class="{ 'sticky-col': isFrozenCol(c) }"
              :style="colHeaderStyle(c)"
              @mousedown.prevent="selectColumn(c)"
            >
              {{ colName(c) }}
              <span
                class="col-resize-handle"
                @mousedown.stop.prevent="startResizeCol(c, $event)"
              ></span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rowCount" :key="'r' + r">
            <th
              class="grid-row-header"
              :class="{ 'sticky-row': isFrozenRow(r) }"
              :style="rowHeaderStyle(r)"
              @mousedown.prevent="selectRow(r)"
            >
              {{ r }}
              <span
                class="row-resize-handle"
                @mousedown.stop.prevent="startResizeRow(r, $event)"
              ></span>
            </th>
            <td
              v-for="c in colCount"
              :key="c"
              class="grid-cell"
              :data-rc="r + ',' + c"
              :class="[
                cellClass(r, c),
                isMergedChild(r, c) ? 'hidden' : '',
                isFrozenCol(c) ? 'sticky-col' : '',
                isFrozenRow(r) ? 'sticky-row' : ''
              ]"
              :style="[cellStyle(r, c), cellColWidth(c), cellRowHeight(r), frozenCellStyle(r, c)]"
              @mousedown.prevent="onCellMouseDown(r, c, $event)"
              @dblclick="startEditing(r, c)"
            >
              <input
                v-if="isEditingCell(r, c)"
                v-model="editValue"
                class="cell-editor"
                :ref="(el) => setEditorInput(el)"
                @blur="commitEditing"
                @keydown.stop="onEditorKeydown($event)"
              />
              <span v-else class="cell-display" :style="{ textAlign: cellAlign(r, c) }">
                {{ cellDisplay(r, c) }}
              </span>
              <!-- 拖曳填充把手 -->
              <span
                v-if="r === activeR && c === activeC && editable"
                class="fill-handle"
                @mousedown.prevent.stop="onFillHandleMouseDown"
              ></span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ===== 工作表頁籤 ===== -->
    <div v-if="showSheetTabs" class="flex items-center gap-1 px-2 py-1.5 border-t border-stroke-light bg-surface-secondary overflow-x-auto">
      <button type="button" class="sheet-add" @click="addSheet" title="新增工作表">＋</button>
      <div
        v-for="(sheet, idx) in sheets"
        :key="idx"
        class="sheet-tab"
        :class="{ active: idx === activeSheetIndex }"
        @click="switchSheet(idx)"
        @dblclick="startRenameSheet(idx)"
      >
        <input
          v-if="renameSheetIndex === idx"
          v-model="renameSheetValue"
          :ref="(el) => setRenameInput(el, idx)"
          class="sheet-rename-input"
          @mousedown.stop
          @click.stop
          @keydown.enter.prevent="confirmRenameSheet(idx)"
          @keydown.esc.prevent="cancelRenameSheet"
          @blur="confirmRenameSheet(idx)"
        />
        <span v-else class="px-2 py-0.5 rounded">{{ sheet.name }}</span>
        <button type="button" v-if="sheets.length > 1" class="sheet-close" @mousedown.stop @click.stop="removeSheet(idx)" title="刪除工作表">×</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import * as XLSX from 'xlsx-js-style'
// 座標工具與公式引擎都是純運算，抽到 formula/ 之下獨立測試
// （公式引擎原本整包寫在這個檔案裡，而且是用 new Function 求值）
import { cellRef, colName, parseRef } from './formula/cellRef'
import { evaluateFormula } from './formula/formulaEngine'

/**
 * ChptExcelEditor（CHPT 主題）- 仿原生 Excel 試算表元件
 *
 * 功能：
 * - 多工作表（新增 / 重新命名 / 刪除）
 * - 儲存格選取（單格 / 範圍 / 整列 / 整欄）
 * - 就地編輯 + 公式列 + 名稱框
 * - 公式引擎（SUM / AVERAGE / MIN / MAX / COUNT / IF 與四則運算）
 * - 格式化（粗體 / 斜體 / 底線 / 對齊 / 數字格式）
 * - 插入 / 刪除列欄、調整欄寬 / 列高
 * - 合併儲存格、凍結窗格
 * - 複製 / 剪下 / 貼上、復原 / 重做
 * - 匯出 .xlsx
 */

type CellAlign = 'left' | 'center' | 'right'

interface CellStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  color?: string
  bg?: string
  align?: CellAlign
  numFmt?: string
}

interface CellData {
  /** 原始輸入（可能為公式 `=SUM(...)`） */
  raw?: string | number
  /** 儲存格樣式 */
  style?: CellStyle
}

interface SheetData {
  name: string
  /** 以 "A1" 為鍵的儲存格 */
  cells: Record<string, CellData>
  /** 欄寬（index -> px） */
  colWidths: Record<number, number>
  /** 列高（rowIndex -> px） */
  rowHeights: Record<number, number>
  /** 合併範圍：左上角鍵 -> { r, c, rows, cols } */
  merges: Record<string, { r: number; c: number; rows: number; cols: number }>
  /** 凍結列數 / 欄數 */
  freezeRows: number
  freezeCols: number
}

interface ExcelEditorProps {
  /** 初始資料（v-model，可選） */
  modelValue?: Record<string, unknown>[]
  /** 是否顯示工具列 */
  showToolbar?: boolean
  /** 是否顯示工作表頁籤 */
  showSheetTabs?: boolean
  /** 列數（預設 25） */
  rowCount?: number
  /** 欄數（預設 26） */
  colCount?: number
  /** 是否可編輯 */
  editable?: boolean
  /** 是否啟用公式 */
  enableFormula?: boolean
  /** 預設檔案名稱 */
  defaultFilename?: string
  /** 預設工作表名稱 */
  defaultSheetName?: string
}

const props = withDefaults(defineProps<ExcelEditorProps>(), {
  modelValue: () => [],
  showToolbar: true,
  showSheetTabs: true,
  rowCount: 25,
  colCount: 26,
  editable: true,
  enableFormula: true,
  defaultFilename: 'Excel_Editor',
  defaultSheetName: 'Sheet1',
})

const emit = defineEmits<{
  (e: 'update:modelValue', data: Record<string, unknown>[]): void
  (e: 'cell-change', payload: { ref: string; value: unknown }): void
  (e: 'selection-change', payload: { start: string; end: string; range: string }): void
  (e: 'sheet-add', payload: { name: string }): void
  (e: 'sheet-remove', payload: { name: string }): void
  (e: 'export-start'): void
  (e: 'export-complete', payload: { filename: string }): void
  (e: 'export-error', error: unknown): void
}>()

// ===== 工作表狀態 =====
const sheets = reactive<SheetData[]>([
  { name: props.defaultSheetName, cells: {}, colWidths: {}, rowHeights: {}, merges: {}, freezeRows: 0, freezeCols: 0 },
])
const activeSheetIndex = ref(0)

const activeSheet = computed<SheetData>(() => sheets[activeSheetIndex.value])

// ===== 選取目前選取範圍 =====
const selection = reactive({ startR: 1, startC: 1, endR: 1, endC: 1 })
const activeR = ref(1)
const activeC = ref(1)

// ===== 編輯狀態 =====
const editing = ref<{ r: number; c: number } | null>(null)
const editValue = ref<string | number>('')
const formulaBarValue = ref('')

// ===== 互動狀態 =====
const isSelecting = ref(false)
const mouseDownCell = ref<{ r: number; c: number; shift: boolean } | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const formulaInputRef = ref<HTMLInputElement | null>(null)
/** 目前編輯中的 input（普通變數，非 reactive，僅命令式使用） */
let editorInputEl: HTMLInputElement | null = null
const renameSheetIndex = ref<number | null>(null)
const renameSheetValue = ref('')
const renameInputEls = new Map<number, HTMLInputElement>()

const colResizeState = ref<{ c: number; startX: number; startWidth: number } | null>(null)
const rowResizeState = ref<{ r: number; startY: number; startHeight: number } | null>(null)

/** 函式 ref：捕捉目前編輯儲存格的 input 元素 */
function setEditorInput(el: unknown) {
  editorInputEl = el as HTMLInputElement | null
}

function setRenameInput(el: unknown, idx: number) {
  if (el instanceof HTMLInputElement) renameInputEls.set(idx, el)
  else renameInputEls.delete(idx)
}

// ===== 復原 / 重做 =====
const undoStack = ref<SheetData[]>([])
const redoStack = ref<SheetData[]>([])

const canUndo = computed(() => undoStack.value.length > 0)
const canRedo = computed(() => redoStack.value.length > 0)

/** 取得儲存格原始內容 */
function getCell(r: number, c: number): CellData | undefined {
  return activeSheet.value.cells[cellRef(r, c)]
}

/** 取得儲存格未計算的原始字串 */
function getCellRaw(r: number, c: number): string | number {
  const cell = getCell(r, c)
  return cell?.raw ?? ''
}

/** 取得儲存格的運算後顯示值（含公式解析） */
function getCellValue(r: number, c: number): string | number {
  const cell = getCell(r, c)
  if (!cell) return ''
  const raw = cell.raw
  if (typeof raw === 'string' && raw.startsWith('=') && props.enableFormula) {
    const result = evaluateFormula(raw.slice(1), activeSheet.value)
    if (result !== null) return result
    return raw
  }
  return raw ?? ''
}

/** 取得儲存格樣式（含合併主格） */
function getCellStyle(r: number, c: number): CellStyle {
  const cell = getCell(r, c)
  return cell?.style ?? {}
}

// ===== 顯示輔助 =====
const activeCellRef = computed(() => cellRef(activeR.value, activeC.value))
const singleCellSelected = computed(
  () => selection.startR === selection.endR && selection.startC === selection.endC
)

/** 合併主格：傳回所在合併範圍的左上角，否則同座標 */
function mergeOrigin(r: number, c: number): { r: number; c: number } {
  for (const key in activeSheet.value.merges) {
    const m = activeSheet.value.merges[key]
    if (r >= m.r && r < m.r + m.rows && c >= m.c && c < m.c + m.cols) {
      return { r: m.r, c: m.c }
    }
  }
  return { r, c }
}

function isMergedChild(r: number, c: number): boolean {
  const o = mergeOrigin(r, c)
  return o.r !== r || o.c !== c
}

function cellDisplay(r: number, c: number): string | number {
  const o = mergeOrigin(r, c)
  const v = getCellValue(o.r, o.c)
  const style = getCellStyle(o.r, o.c)
  if (style && style.numFmt && typeof v === 'number') {
    return formatNumber(v, style.numFmt)
  }
  return v === '' ? '' : v
}

function formatNumber(v: number, fmt: string): string {
  if (fmt === '0.00') return v.toFixed(2)
  if (fmt === '0.0') return v.toFixed(1)
  if (fmt === '#,##0') return Math.round(v).toLocaleString()
  if (fmt === '#,##0.00') return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (fmt === '0%') return (v * 100).toFixed(0) + '%'
  if (fmt === '0.00%') return (v * 100).toFixed(2) + '%'
  return String(v)
}

function cellAlign(r: number, c: number): CellAlign {
  const style = getCellStyle(r, c)
  return style.align || 'left'
}

function cellStyle(r: number, c: number): Record<string, string> {
  const style = getCellStyle(r, c)
  const out: Record<string, string> = {}
  if (style.bold) out.fontWeight = 'bold'
  if (style.italic) out.fontStyle = 'italic'
  if (style.underline) out.textDecoration = 'underline'
  if (style.color) out.color = style.color
  if (style.bg) out.backgroundColor = style.bg
  return out
}

function cellClass(r: number, c: number): string {
  const inSelection =
    r >= Math.min(selection.startR, selection.endR) &&
    r <= Math.max(selection.startR, selection.endR) &&
    c >= Math.min(selection.startC, selection.endC) &&
    c <= Math.max(selection.startC, selection.endC)
  if (r === activeR.value && c === activeC.value) return 'cell-active'
  if (inSelection) return 'cell-selected'
  return ''
}

function cellColWidth(c: number): Record<string, string> {
  const w = activeSheet.value.colWidths[c] ?? 80
  return { minWidth: w + 'px', width: w + 'px' }
}

function cellRowHeight(r: number): Record<string, string> {
  const h = activeSheet.value.rowHeights[r] ?? 24
  return { height: h + 'px' }
}

function isFrozenCol(c: number): boolean {
  return c <= activeSheet.value.freezeCols
}
function isFrozenRow(r: number): boolean {
  return r <= activeSheet.value.freezeRows
}

const activeCellStyle = computed<CellStyle>(() => {
  const o = mergeOrigin(activeR.value, activeC.value)
  return getCellStyle(o.r, o.c) || {}
})

const activeNumFmt = computed(() => activeCellStyle.value.numFmt || '')

const ROW_HEADER_WIDTH = 40
const COL_HEADER_HEIGHT = 24
const STICKY_EDGE_OVERLAP = 1

function frozenLeft(c: number): number {
  let left = ROW_HEADER_WIDTH - STICKY_EDGE_OVERLAP
  for (let i = 1; i < c; i++) {
    left += activeSheet.value.colWidths[i] ?? 80
  }
  return left
}

function frozenTop(r: number): number {
  let top = COL_HEADER_HEIGHT - STICKY_EDGE_OVERLAP
  for (let i = 1; i < r; i++) {
    top += activeSheet.value.rowHeights[i] ?? 24
  }
  return top
}

function colHeaderStyle(c: number): Record<string, string> {
  const style: Record<string, string> = { ...cellColWidth(c) }
  if (isFrozenCol(c)) {
    style.position = 'sticky'
    style.left = frozenLeft(c) + 'px'
    style.zIndex = '28'
  }
  return style
}

function rowHeaderStyle(r: number): Record<string, string> {
  const style: Record<string, string> = { ...cellRowHeight(r) }
  if (isFrozenRow(r)) {
    style.position = 'sticky'
    style.top = frozenTop(r) + 'px'
    style.left = '0px'
    style.backgroundColor = '#f3f4f6'
    style.zIndex = '24'
  }
  return style
}

function frozenCellStyle(r: number, c: number): Record<string, string> {
  const style: Record<string, string> = {}
  const frozenCol = isFrozenCol(c)
  const frozenRow = isFrozenRow(r)
  if (!frozenCol && !frozenRow) return style
  style.position = 'sticky'
  if (frozenCol) style.left = frozenLeft(c) + 'px'
  if (frozenRow) style.top = frozenTop(r) + 'px'
  style.backgroundColor = '#ffffff'
  style.zIndex = frozenCol && frozenRow ? '26' : '12'
  return style
}

// ===== 選取邏輯 =====
function normalizeSelection() {
  const s = selection
  const rs = Math.min(s.startR, s.endR)
  const re = Math.max(s.startR, s.endR)
  const cs = Math.min(s.startC, s.endC)
  const ce = Math.max(s.startC, s.endC)
  s.startR = rs
  s.endR = re
  s.startC = cs
  s.endC = ce
}

function setActive(r: number, c: number) {
  activeR.value = r
  activeC.value = c
  selection.startR = r
  selection.startC = c
  selection.endR = r
  selection.endC = c
  emitSelectionChange()
}

function emitSelectionChange() {
  emit('selection-change', {
    start: cellRef(selection.startR, selection.startC),
    end: cellRef(selection.endR, selection.endC),
    range:
      cellRef(selection.startR, selection.startC) +
      (singleCellSelected.value ? '' : ':' + cellRef(selection.endR, selection.endC)),
  })
}

function selectAll() {
  selection.startR = 1
  selection.startC = 1
  selection.endR = props.rowCount
  selection.endC = props.colCount
  activeR.value = 1
  activeC.value = 1
  emitSelectionChange()
}

function selectColumn(c: number) {
  selection.startR = 1
  selection.endR = props.rowCount
  selection.startC = c
  selection.endC = c
  activeR.value = 1
  activeC.value = c
  emitSelectionChange()
}

function selectRow(r: number) {
  selection.startR = r
  selection.endR = r
  selection.startC = 1
  selection.endC = props.colCount
  activeR.value = r
  activeC.value = 1
  emitSelectionChange()
}

function onCellMouseDown(r: number, c: number, event: MouseEvent) {
  if (!props.editable) return
  if (event.shiftKey) {
    selection.endR = r
    selection.endC = c
    activeR.value = r
    activeC.value = c
    normalizeSelection()
  } else {
    isSelecting.value = true
    mouseDownCell.value = { r, c, shift: event.shiftKey }
    setActive(r, c)
    // 掛載 document 層級監聽，確保滑鼠移出容器仍能持續拖曳選取
    document.addEventListener('mousemove', onDocumentMouseMove)
    document.addEventListener('mouseup', onDocumentMouseUp)
  }
}

/** 依據滑鼠座標計算所在儲存格（不依賴事件綁定元素） */
function cellFromPoint(clientX: number, clientY: number): { r: number; c: number } | null {
  const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null
  const cell = el?.closest('[data-rc]') as HTMLElement | null
  if (cell && cell.dataset.rc) {
    const [rr, cc] = cell.dataset.rc.split(',').map(Number)
    return { r: rr, c: cc }
  }
  return null
}

function onDocumentMouseMove(e: MouseEvent) {
  if (!isSelecting.value || !mouseDownCell.value) return
  const pos = cellFromPoint(e.clientX, e.clientY)
  if (!pos) return
  selection.endR = pos.r
  selection.endC = pos.c
  // active 儲存格為拖曳的終點
  activeR.value = pos.r
  activeC.value = pos.c
  emitSelectionChange()
}

function onDocumentMouseUp() {
  if (isSelecting.value) {
    normalizeSelection()
  }
  isSelecting.value = false
  mouseDownCell.value = null
  document.removeEventListener('mousemove', onDocumentMouseMove)
  document.removeEventListener('mouseup', onDocumentMouseUp)
}

function onGridMouseDown(e: MouseEvent) {
  // 點擊容器任一處時取得焦點，使鍵盤事件能觸發
  if (containerRef.value) containerRef.value.focus()
  e.preventDefault?.()
}

function onGridMouseMove(_e: MouseEvent) {
  // 已改由 document 層級監聽處理拖曳，此處保留為相容 no-op
}

function onGridMouseUp() {
  onDocumentMouseUp()
}

// ===== 拖曳填充 =====
const isFilling = ref(false)
const fillOrigin = ref<{ rs: number; re: number; cs: number; ce: number } | null>(null)

function onFillHandleMouseDown() {
  if (!props.editable) return
  isFilling.value = true
  fillOrigin.value = getSelectionRange()
  document.addEventListener('mousemove', onFillMouseMove)
  document.addEventListener('mouseup', onFillMouseUp)
}

function onFillMouseMove(e: MouseEvent) {
  if (!isFilling.value || !fillOrigin.value) return
  const pos = cellFromPoint(e.clientX, e.clientY)
  if (!pos) return
  const { rs, re, cs, ce } = fillOrigin.value
  const rows = re - rs + 1
  const cols = ce - cs + 1
  // 計算填充擴展範圍（向下 / 向右）
  const endR = Math.max(pos.r, re)
  const endC = Math.max(pos.c, ce)
  // 即時顯示填充預覽範圍（可選：僅更新 selection 視覺）
  selection.startR = rs
  selection.startC = cs
  selection.endR = endR
  selection.endC = endC
  activeR.value = endR
  activeC.value = endC
  emitSelectionChange()
  void rows
  void cols
}

function onFillMouseUp() {
  if (isFilling.value && fillOrigin.value) {
    performFill()
  }
  isFilling.value = false
  fillOrigin.value = null
  document.removeEventListener('mousemove', onFillMouseMove)
  document.removeEventListener('mouseup', onFillMouseUp)
}

/** 執行程式填充：沿選取範圍向下 / 向右重複填入 */
function performFill() {
  const { rs, re, cs, ce } = fillOrigin.value!
  const endR = Math.max(selection.endR, re)
  const endC = Math.max(selection.endC, ce)
  if (endR === re && endC === ce) return
  const rows = re - rs + 1
  const cols = ce - cs + 1
  pushUndo()
  // 向下填充
  if (endR > re) {
    for (let r = re + 1; r <= endR; r++) {
      const srcR = rs + ((r - rs) % rows)
      for (let c = cs; c <= ce; c++) {
        const src = getCell(srcR, c)
        const key = cellRef(r, c)
        if (src) activeSheet.value.cells[key] = { ...src }
        else delete activeSheet.value.cells[key]
      }
    }
  }
  // 向右填充
  if (endC > ce) {
    for (let c = ce + 1; c <= endC; c++) {
      const srcC = cs + ((c - cs) % cols)
      for (let r = rs; r <= re; r++) {
        const src = getCell(r, srcC)
        const key = cellRef(r, c)
        if (src) activeSheet.value.cells[key] = { ...src }
        else delete activeSheet.value.cells[key]
      }
    }
  }
  emit('update:modelValue', toModelValue())
}

// ===== 就地編輯 =====
function isEditingCell(r: number, c: number): boolean {
  return editing.value !== null && editing.value.r === r && editing.value.c === c
}

function startEditing(r: number, c: number, initial?: string) {
  if (!props.editable) return
  const o = mergeOrigin(r, c)
  editing.value = { r: o.r, c: o.c }
  const value = initial !== undefined ? initial : getCellRaw(o.r, o.c)
  editValue.value = value
  formulaBarValue.value = String(value)
  nextTick(() => {
    editorInputEl?.focus()
    if (initial !== undefined) {
      editorInputEl?.setSelectionRange(1, 1)
    } else {
      editorInputEl?.select()
    }
  })
}

async function commitEditing() {
  if (editing.value === null) return
  const { r, c } = editing.value
  const key = cellRef(r, c)
  const prev = activeSheet.value.cells[key]?.raw
  const newVal = String(editValue.value)
  if (String(prev ?? '') !== newVal) {
    pushUndo()
    if (newVal === '') {
      delete activeSheet.value.cells[key]
    } else {
      const existing = activeSheet.value.cells[key] || {}
      activeSheet.value.cells[key] = { ...existing, raw: newVal }
    }
    emit('cell-change', { ref: key, value: newVal })
    emit('update:modelValue', toModelValue())
  }
  editing.value = null
  formulaBarValue.value = String(getCellRaw(r, c))
  containerRef.value?.focus()
  await nextTick()
}

function onEditorKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
    commitEditing()
    moveActive(1, 0)
  } else if (e.key === 'Tab') {
    e.preventDefault()
    e.stopPropagation()
    commitEditing()
    moveActive(0, e.shiftKey ? -1 : 1)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    editing.value = null
    formulaBarValue.value = String(getCellRaw(activeR.value, activeC.value))
    containerRef.value?.focus()
  }
}

function moveActive(dr: number, dc: number) {
  const r = Math.min(Math.max(activeR.value + dr, 1), props.rowCount)
  const c = Math.min(Math.max(activeC.value + dc, 1), props.colCount)
  setActive(r, c)
  containerRef.value?.focus()
}

// ===== 復原 / 重做 =====
function snapshot(): SheetData {
  return JSON.parse(JSON.stringify(activeSheet.value))
}

function pushUndo() {
  undoStack.value.push(snapshot())
  if (undoStack.value.length > 100) undoStack.value.shift()
  redoStack.value = []
}

function restore(snap: SheetData) {
  const sheet = activeSheet.value
  sheet.name = snap.name
  sheet.cells = snap.cells
  sheet.colWidths = snap.colWidths
  sheet.rowHeights = snap.rowHeights
  sheet.merges = snap.merges
  sheet.freezeRows = snap.freezeRows
  sheet.freezeCols = snap.freezeCols
}

function undo() {
  if (!canUndo.value) return
  redoStack.value.push(snapshot())
  restore(undoStack.value.pop()!)
  emit('update:modelValue', toModelValue())
}

function redo() {
  if (!canRedo.value) return
  undoStack.value.push(snapshot())
  restore(redoStack.value.pop()!)
  emit('update:modelValue', toModelValue())
}

// ===== 格式化 =====
function toggleStyle(prop: 'bold' | 'italic' | 'underline') {
  if (!props.editable) return
  const rs = Math.min(selection.startR, selection.endR)
  const re = Math.max(selection.startR, selection.endR)
  const cs = Math.min(selection.startC, selection.endC)
  const ce = Math.max(selection.startC, selection.endC)
  pushUndo()
  const next = !getCellStyle(activeR.value, activeC.value)[prop]
  for (let r = rs; r <= re; r++) {
    for (let c = cs; c <= ce; c++) {
      const key = cellRef(r, c)
      const cell = activeSheet.value.cells[key] || { raw: '' }
      cell.style = { ...(cell.style || {}), [prop]: next }
      activeSheet.value.cells[key] = cell
    }
  }
  emit('update:modelValue', toModelValue())
}

function setAlign(align: CellAlign) {
  if (!props.editable) return
  const rs = Math.min(selection.startR, selection.endR)
  const re = Math.max(selection.startR, selection.endR)
  const cs = Math.min(selection.startC, selection.endC)
  const ce = Math.max(selection.startC, selection.endC)
  pushUndo()
  for (let r = rs; r <= re; r++) {
    for (let c = cs; c <= ce; c++) {
      const key = cellRef(r, c)
      const cell = activeSheet.value.cells[key] || { raw: '' }
      cell.style = { ...(cell.style || {}), align }
      activeSheet.value.cells[key] = cell
    }
  }
  emit('update:modelValue', toModelValue())
}

function setNumFmt(numFmt: string) {
  if (!props.editable) return
  const rs = Math.min(selection.startR, selection.endR)
  const re = Math.max(selection.startR, selection.endR)
  const cs = Math.min(selection.startC, selection.endC)
  const ce = Math.max(selection.startC, selection.endC)
  pushUndo()
  for (let r = rs; r <= re; r++) {
    for (let c = cs; c <= ce; c++) {
      const key = cellRef(r, c)
      const cell = activeSheet.value.cells[key] || { raw: '' }
      const style = { ...(cell.style || {}) }
      if (numFmt) style.numFmt = numFmt
      else delete style.numFmt
      cell.style = style
      activeSheet.value.cells[key] = cell
    }
  }
  emit('update:modelValue', toModelValue())
}

// ===== 公式列 =====
function commitFormulaBar() {
  if (!singleCellSelected.value) return
  const r = activeR.value
  const c = activeC.value
  const key = cellRef(r, c)
  const prev = getCellRaw(r, c)
  const newVal = formulaBarValue.value
  if (String(prev) !== String(newVal)) {
    pushUndo()
    if (newVal === '') delete activeSheet.value.cells[key]
    else activeSheet.value.cells[key] = { ...(activeSheet.value.cells[key] || {}), raw: newVal }
    emit('cell-change', { ref: key, value: newVal })
    emit('update:modelValue', toModelValue())
  }
  formulaSuggestions.value = []
  formulaHint.value = null
  containerRef.value?.focus()
}

function resetFormulaBar() {
  formulaBarValue.value = String(getCellRaw(activeR.value, activeC.value))
  formulaSuggestions.value = []
  formulaHint.value = null
  containerRef.value?.focus()
}

// ===== 公式插入 / 自動完成 =====
interface FunctionDef {
  name: string
  description: string
  args: string
}

const FUNCTION_LIST: FunctionDef[] = [
  { name: 'SUM', description: '加總', args: 'number1, number2, ...' },
  { name: 'AVERAGE', description: '平均', args: 'number1, number2, ...' },
  { name: 'MIN', description: '最小值', args: 'number1, number2, ...' },
  { name: 'MAX', description: '最大值', args: 'number1, number2, ...' },
  { name: 'COUNT', description: '數字個數', args: 'value1, value2, ...' },
  { name: 'IF', description: '條件判斷', args: 'condition, true, false' },
]

const showFxPanel = ref(false)
const formulaSuggestions = ref<FunctionDef[]>([])
const activeSuggestionIndex = ref(0)
/** 目前匹配函式的參數 / 語法提示 */
const formulaHint = ref<FunctionDef | null>(null)

function toggleFxPanel() {
  showFxPanel.value = !showFxPanel.value
  // 關閉面板時清除建議
  if (!showFxPanel.value) {
    formulaSuggestions.value = []
    formulaHint.value = null
  }
}

function onFormulaInput() {
  updateFormulaSuggestions()
}

function onFormulaFocus() {
  updateFormulaSuggestions()
}

function updateFormulaSuggestions() {
  const v = formulaBarValue.value
  if (!v.startsWith('=')) {
    formulaSuggestions.value = []
    formulaHint.value = null
    return
  }
  const body = v.slice(1)
  const typed = body.toUpperCase()
  // 已選定函式並輸入 "("：顯示該函式的參數提示
  const fnOpen = typed.match(/^([A-Z]+)\($/)
  if (fnOpen) {
    const fnDef = FUNCTION_LIST.find((f) => f.name === fnOpen[1])
    formulaSuggestions.value = []
    formulaHint.value = fnDef || null
    return
  }
  // 若已超過函式名稱（有數字 / 符號作參數），顯示已用函式的提示
  const usedFn = typed.match(/^([A-Z]+)\(/)
  if (usedFn) {
    formulaHint.value = FUNCTION_LIST.find((f) => f.name === usedFn[1]) || null
    formulaSuggestions.value = []
    return
  }
  // 輸入函式名稱前綴：顯示匹配的函式建議
  if (/^[A-Z]*$/.test(typed)) {
    formulaSuggestions.value = FUNCTION_LIST.filter((fn) => fn.name.startsWith(typed))
    activeSuggestionIndex.value = 0
    formulaHint.value = null
  } else {
    formulaSuggestions.value = []
    formulaHint.value = null
  }
}

function suggestionMove(dir: number) {
  if (formulaSuggestions.value.length === 0) return
  activeSuggestionIndex.value =
    (activeSuggestionIndex.value + dir + formulaSuggestions.value.length) % formulaSuggestions.value.length
}

function suggestionApply() {
  if (formulaSuggestions.value.length === 0) return
  applySuggestion(formulaSuggestions.value[activeSuggestionIndex.value])
}

function applySuggestion(fn: FunctionDef) {
  // 保留已輸入的 = 前綴，替換為函式
  formulaBarValue.value = '=' + fn.name + '('
  formulaSuggestions.value = []
  formulaHint.value = fn
  // focus 回公式列
  nextTick(() => {
    formulaInputRef.value?.focus()
  })
}

function insertFunction(name: string) {
  // 從函式面板插入：在目前儲存格寫入
  const r = activeR.value
  const c = activeC.value
  const key = cellRef(r, c)
  pushUndo()
  activeSheet.value.cells[key] = { ...(activeSheet.value.cells[key] || {}), raw: '=' + name + '(' }
  emit('cell-change', { ref: key, value: '=' + name + '(' })
  emit('update:modelValue', toModelValue())
  formulaBarValue.value = '=' + name + '('
  showFxPanel.value = false
  // 開始編輯該儲存格，方便繼續輸入參數
  startEditing(r, c, '=' + name + '(')
}

// ===== 剪貼簿 =====
const clipboard = ref<{ raw: string | number; style?: CellStyle }[][] | null>(null)

/** 取得目前選取範圍（歸一化後） */
function getSelectionRange() {
  const rs = Math.min(selection.startR, selection.endR)
  const re = Math.max(selection.startR, selection.endR)
  const cs = Math.min(selection.startC, selection.endC)
  const ce = Math.max(selection.startC, selection.endC)
  return { rs, re, cs, ce }
}

/** 讀取選取範圍的顯示值矩陣 */
function getSelectionValues(): (string | number)[][] {
  const { rs, re, cs, ce } = getSelectionRange()
  const rows: (string | number)[][] = []
  for (let r = rs; r <= re; r++) {
    const row: (string | number)[] = []
    for (let c = cs; c <= ce; c++) {
      row.push(getCellValue(r, c))
    }
    rows.push(row)
  }
  return rows
}

/** 將矩陣轉為 TSV（tab 分隔）文字 */
function valuesToTSV(rows: (string | number)[][]): string {
  return rows.map((row) => row.map((v) => String(v)).join('\t')).join('\n')
}

/** 將矩陣轉為 HTML 表格（供貼到 Excel / Word 保留格式） */
function valuesToHTML(rows: (string | number)[][]): string {
  const body = rows
    .map(
      (row) =>
        '<tr>' + row.map((v) => `<td>${escapeHtml(String(v))}</td>`).join('') + '</tr>'
    )
    .join('')
  return `<table>${body}</table>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 寫入系統剪貼簿（TSV + HTML） */
async function writeSystemClipboard(rows: (string | number)[][]) {
  const tsv = valuesToTSV(rows)
  const html = valuesToHTML(rows)
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({
        'text/plain': new Blob([tsv], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' }),
      })
      await navigator.clipboard.write([item])
    } else {
      // 備援：execCommand（相容舊瀏覽器）
      const ta = document.createElement('textarea')
      ta.value = tsv
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  } catch (e) {
    console.warn('寫入系統剪貼簿失敗', e)
  }
}

function copySelection() {
  if (editing.value) return
  const rows = getSelectionValues()
  clipboard.value = []
  const { rs, re, cs, ce } = getSelectionRange()
  for (let r = rs; r <= re; r++) {
    const row: { raw: string | number; style?: CellStyle }[] = []
    for (let c = cs; c <= ce; c++) {
      const cell = getCell(r, c)
      row.push({ raw: cell?.raw ?? '', style: cell?.style ? { ...cell.style } : undefined })
    }
    clipboard.value.push(row)
  }
  writeSystemClipboard(rows)
}

function cutSelection() {
  if (!props.editable) return
  copySelection()
  pushUndo()
  const { rs, re, cs, ce } = getSelectionRange()
  for (let r = rs; r <= re; r++) {
    for (let c = cs; c <= ce; c++) delete activeSheet.value.cells[cellRef(r, c)]
  }
  emit('update:modelValue', toModelValue())
}

function pasteSelection() {
  if (!props.editable || !clipboard.value) return
  pushUndo()
  const cp = clipboard.value
  const cpRows = cp.length
  const cpCols = cp[0]?.length ?? 0
  // 目標範圍：若目前選取範圍大於剪貼簿，則填滿整個選取範圍（Excel 行為）
  const { rs, re, cs, ce } = getSelectionRange()
  const targetRows = re - rs + 1
  const targetCols = ce - cs + 1
  const effRows = Math.max(targetRows, cpRows)
  const effCols = Math.max(targetCols, cpCols)
  for (let i = 0; i < effRows; i++) {
    for (let j = 0; j < effCols; j++) {
      const r = rs + i
      const c = cs + j
      if (r > props.rowCount || c > props.colCount) continue
      const key = cellRef(r, c)
      // 依選取範圍大小自動平鋪（tile）剪貼簿內容
      const val = cp[i % cpRows][j % cpCols]
      if (!val) continue
      if (val.raw === '' && !val.style) {
        delete activeSheet.value.cells[key]
      } else {
        activeSheet.value.cells[key] = { raw: val.raw, style: val.style }
      }
    }
  }
  emit('update:modelValue', toModelValue())
}

/** 從系統剪貼簿貼上（container 的 paste 事件觸發） */
async function pasteFromSystem(e: ClipboardEvent) {
  if (!props.editable) return
  const text = e.clipboardData?.getData('text/plain')
  if (!text) return
  e.preventDefault()
  const rows = text.split('\n').map((line) => line.split('\t'))
  if (rows.length === 0 || (rows.length === 1 && rows[0].length === 1 && rows[0][0] === '')) return
  pushUndo()
  const topR = activeR.value
  const leftC = activeC.value
  for (let i = 0; i < rows.length; i++) {
    for (let j = 0; j < rows[i].length; j++) {
      const r = topR + i
      const c = leftC + j
      if (r > props.rowCount || c > props.colCount) continue
      const key = cellRef(r, c)
      const v = rows[i][j]
      if (v === '') delete activeSheet.value.cells[key]
      else activeSheet.value.cells[key] = { ...(activeSheet.value.cells[key] || {}), raw: v }
    }
  }
  emit('update:modelValue', toModelValue())
}

// ===== 插入 / 刪除列欄 =====
function insertRow() {
  if (!props.editable) return
  pushUndo()
  const atR = activeR.value
  const cells = activeSheet.value.cells
  const newCells: Record<string, CellData> = {}
  for (const key in cells) {
    const { r, c } = parseRef(key)
    if (r >= atR) newCells[cellRef(r + 1, c)] = cells[key]
    else newCells[key] = cells[key]
  }
  activeSheet.value.cells = newCells
  emit('update:modelValue', toModelValue())
}

function deleteRow() {
  if (!props.editable) return
  pushUndo()
  const atR = activeR.value
  const cells = activeSheet.value.cells
  const newCells: Record<string, CellData> = {}
  for (const key in cells) {
    const { r, c } = parseRef(key)
    if (r === atR) continue
    if (r > atR) newCells[cellRef(r - 1, c)] = cells[key]
    else newCells[key] = cells[key]
  }
  activeSheet.value.cells = newCells
  activeR.value = Math.max(1, activeR.value - 1)
  emit('update:modelValue', toModelValue())
}

function insertColumn() {
  if (!props.editable) return
  pushUndo()
  const atC = activeC.value
  const cells = activeSheet.value.cells
  const newCells: Record<string, CellData> = {}
  for (const key in cells) {
    const { r, c } = parseRef(key)
    if (c >= atC) newCells[cellRef(r, c + 1)] = cells[key]
    else newCells[key] = cells[key]
  }
  activeSheet.value.cells = newCells
  emit('update:modelValue', toModelValue())
}

function deleteColumn() {
  if (!props.editable) return
  pushUndo()
  const atC = activeC.value
  const cells = activeSheet.value.cells
  const newCells: Record<string, CellData> = {}
  for (const key in cells) {
    const { r, c } = parseRef(key)
    if (c === atC) continue
    if (c > atC) newCells[cellRef(r, c - 1)] = cells[key]
    else newCells[key] = cells[key]
  }
  activeSheet.value.cells = newCells
  activeC.value = Math.max(1, activeC.value - 1)
  emit('update:modelValue', toModelValue())
}

function freezeToActive() {
  pushUndo()
  activeSheet.value.freezeRows = Math.max(activeR.value - 1, 0)
  activeSheet.value.freezeCols = Math.max(activeC.value - 1, 0)
}

function unfreezePanes() {
  if (activeSheet.value.freezeRows === 0 && activeSheet.value.freezeCols === 0) return
  pushUndo()
  activeSheet.value.freezeRows = 0
  activeSheet.value.freezeCols = 0
}

// ===== 合併儲存格 =====
function toggleMerge() {
  if (!props.editable) return
  const rs = Math.min(selection.startR, selection.endR)
  const re = Math.max(selection.startR, selection.endR)
  const cs = Math.min(selection.startC, selection.endC)
  const ce = Math.max(selection.startC, selection.endC)
  const key = cellRef(rs, cs)
  pushUndo()
  if (activeSheet.value.merges[key]) {
    delete activeSheet.value.merges[key]
  } else {
    activeSheet.value.merges[key] = { r: rs, c: cs, rows: re - rs + 1, cols: ce - cs + 1 }
  }
  emit('update:modelValue', toModelValue())
}

// ===== 排序 =====
function sortRange(direction: 'asc' | 'desc' = 'asc') {
  if (!props.editable) return
  const rs = Math.min(selection.startR, selection.endR)
  const re = Math.max(selection.startR, selection.endR)
  const cs = Math.min(selection.startC, selection.endC)
  const ce = Math.max(selection.startC, selection.endC)
  if (re - rs < 1) return
  pushUndo()
  const rows: { r: number; cells: (CellData | null)[] }[] = []
  for (let r = rs; r <= re; r++) {
    const rowCells: (CellData | null)[] = []
    for (let c = cs; c <= ce; c++) {
      const cell = getCell(r, c)
      rowCells.push(cell ? { ...cell } : null)
    }
    rows.push({ r, cells: rowCells })
  }
  rows.sort((a, b) => {
    const va = getCellValue(a.r, cs)
    const vb = getCellValue(b.r, cs)
    const order = compareValues(va, vb)
    return direction === 'desc' ? -order : order
  })
  for (let i = 0; i < rows.length; i++) {
    const src = rows[i]
    for (let offset = 0; offset < src.cells.length; offset++) {
      const c = cs + offset
      const key = cellRef(rs + i, c)
      const data = src.cells[offset]
      if (data) activeSheet.value.cells[key] = data
      else delete activeSheet.value.cells[key]
    }
  }
  emit('update:modelValue', toModelValue())
}

function compareValues(a: string | number, b: string | number): number {
  const an = typeof a === 'number' ? a : Number(a)
  const bn = typeof b === 'number' ? b : Number(b)
  if (!isNaN(an) && !isNaN(bn)) return an - bn
  return String(a).localeCompare(String(b))
}

// ===== 工作表操作 =====
function addSheet() {
  const base = props.defaultSheetName || 'Sheet'
  const name = uniqueSheetName(base)
  sheets.push({ name, cells: {}, colWidths: {}, rowHeights: {}, merges: {}, freezeRows: 0, freezeCols: 0 })
  activeSheetIndex.value = sheets.length - 1
  emit('sheet-add', { name })
}

function uniqueSheetName(base: string): string {
  const names = new Set(sheets.map((s) => s.name))
  if (!names.has(base)) return base
  let i = 2
  while (names.has(base + i)) i++
  return base + i
}

function switchSheet(idx: number) {
  activeSheetIndex.value = idx
  selection.startR = 1
  selection.startC = 1
  selection.endR = 1
  selection.endC = 1
  activeR.value = 1
  activeC.value = 1
  editing.value = null
}

function startRenameSheet(idx: number) {
  renameSheetValue.value = sheets[idx].name
  renameSheetIndex.value = idx
  nextTick(() => {
    const input = renameInputEls.get(idx)
    input?.focus()
    input?.select()
  })
}

function confirmRenameSheet(idx: number) {
  const target = sheets[idx]
  if (!target) {
    renameSheetIndex.value = null
    return
  }
  const rawName = renameSheetValue.value.trim()
  if (rawName !== '') {
    const names = new Set(sheets.map((s, i) => (i === idx ? '' : s.name)))
    let nextName = rawName
    let seq = 2
    while (names.has(nextName)) {
      nextName = `${rawName}_${seq}`
      seq++
    }
    target.name = nextName
  }
  renameSheetIndex.value = null
}

function cancelRenameSheet() {
  renameSheetIndex.value = null
}

function startResizeCol(c: number, e: MouseEvent) {
  if (!props.editable) return
  pushUndo()
  colResizeState.value = {
    c,
    startX: e.clientX,
    startWidth: activeSheet.value.colWidths[c] ?? 80,
  }
  document.addEventListener('mousemove', onColResizeMove)
  document.addEventListener('mouseup', onColResizeUp)
}

function onColResizeMove(e: MouseEvent) {
  if (!colResizeState.value) return
  const { c, startX, startWidth } = colResizeState.value
  const width = Math.max(48, startWidth + (e.clientX - startX))
  activeSheet.value.colWidths[c] = width
}

function onColResizeUp() {
  colResizeState.value = null
  document.removeEventListener('mousemove', onColResizeMove)
  document.removeEventListener('mouseup', onColResizeUp)
}

function startResizeRow(r: number, e: MouseEvent) {
  if (!props.editable) return
  pushUndo()
  rowResizeState.value = {
    r,
    startY: e.clientY,
    startHeight: activeSheet.value.rowHeights[r] ?? 24,
  }
  document.addEventListener('mousemove', onRowResizeMove)
  document.addEventListener('mouseup', onRowResizeUp)
}

function onRowResizeMove(e: MouseEvent) {
  if (!rowResizeState.value) return
  const { r, startY, startHeight } = rowResizeState.value
  const height = Math.max(20, startHeight + (e.clientY - startY))
  activeSheet.value.rowHeights[r] = height
}

function onRowResizeUp() {
  rowResizeState.value = null
  document.removeEventListener('mousemove', onRowResizeMove)
  document.removeEventListener('mouseup', onRowResizeUp)
}

function removeSheet(idx: number) {
  if (sheets.length <= 1) return
  const removed = sheets.splice(idx, 1)[0]
  if (activeSheetIndex.value >= sheets.length) activeSheetIndex.value = sheets.length - 1
  emit('sheet-remove', { name: removed.name })
}

// ===== 資料轉換（v-model） =====
function toModelValue(): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  const max = props.rowCount
  const cols = props.colCount
  for (let r = 1; r <= max; r++) {
    const row: Record<string, unknown> = {}
    let hasContent = false
    for (let c = 1; c <= cols; c++) {
      const v = getCellValue(r, c)
      if (v !== '' && v !== null && v !== undefined) {
        row[colName(c)] = v
        hasContent = true
      }
    }
    if (hasContent) rows.push(row)
  }
  return rows
}

// ===== 匯出 .xlsx =====
function getCellValueOfSheet(sheet: SheetData, r: number, c: number): string | number {
  const key = cellRef(r, c)
  const cell = sheet.cells[key]
  if (!cell) return ''
  const raw = cell.raw
  if (typeof raw === 'string' && raw.startsWith('=') && props.enableFormula) {
    const v = evaluateFormula(raw.slice(1), sheet)
    return v === null ? raw : v
  }
  return raw ?? ''
}

function sheetToXlsxSheet(sheet: SheetData): XLSX.WorkSheet {
  const aoa: (string | number)[][] = []
  for (let r = 1; r <= props.rowCount; r++) {
    const rowArr: (string | number)[] = []
    for (let c = 1; c <= props.colCount; c++) {
      rowArr.push(getCellValueOfSheet(sheet, r, c))
    }
    aoa.push(rowArr)
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const colsArr: { wch?: number }[] = []
  for (let c = 1; c <= props.colCount; c++) {
    const w = sheet.colWidths[c]
    colsArr.push({ wch: w ? Math.round(w / 7) : undefined })
  }
  ws['!cols'] = colsArr
  const merges = Object.values(sheet.merges).map((m) => ({
    s: { r: m.r - 1, c: m.c - 1 },
    e: { r: m.r + m.rows - 2, c: m.c + m.cols - 2 },
  }))
  if (merges.length) ws['!merges'] = merges
  applySheetCellStyles(ws, sheet)
  return ws
}

function applySheetCellStyles(ws: XLSX.WorkSheet, sheet: SheetData) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet.cells[cellRef(r + 1, c + 1)]
      if (!cell?.style) continue
      const st = cell.style
      const addr = XLSX.utils.encode_cell({ r, c })
      const cellObj = ws[addr]
      if (!cellObj) continue
      const s: Record<string, unknown> = {
        font: {
          bold: st.bold || false,
          italic: st.italic || false,
          underline: st.underline ? true : undefined,
          color: st.color ? { rgb: st.color.replace('#', '') } : undefined,
        },
        fill: st.bg ? { fgColor: { rgb: st.bg.replace('#', '') } } : undefined,
        alignment: st.align ? { horizontal: st.align } : undefined,
      }
      if (st.numFmt) s.numFmt = st.numFmt
      cellObj.s = s as XLSX.CellStyle
    }
  }
}

async function performExport(): Promise<void> {
  try {
    emit('export-start')
    const wb = XLSX.utils.book_new()
    for (const sheet of sheets) {
      const ws = sheetToXlsxSheet(sheet)
      XLSX.utils.book_append_sheet(wb, ws, sheet.name)
    }
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
    const filename = `${props.defaultFilename}_${timestamp}.xlsx`
    try {
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      XLSX.writeFile(wb, filename)
    }
    emit('export-complete', { filename })
  } catch (error) {
    emit('export-error', error)
  }
}

// ===== 鍵盤快捷鍵 =====
function handleKeydown(e: KeyboardEvent) {
  // 編輯模式交由輸入框處理
  if (editing.value) return
  // 若焦點在輸入框（公式列等），交由輸入框處理，避免誤觸發開始編輯
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return
  }
  // 一般字元 / 數字：直接開始編輯 active 儲存格
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault()
    startEditing(activeR.value, activeC.value, e.key)
    return
  }
  if (e.ctrlKey || e.metaKey) {
    const k = e.key.toLowerCase()
    if (k === 'z') {
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    } else if (k === 'y') {
      e.preventDefault()
      redo()
    } else if (k === 'c') {
      e.preventDefault()
      copySelection()
    } else if (k === 'x') {
      e.preventDefault()
      cutSelection()
    } else if (k === 'v') {
      e.preventDefault()
      pasteSelection()
    } else if (k === 'b') {
      e.preventDefault()
      toggleStyle('bold')
    } else if (k === 'i') {
      e.preventDefault()
      toggleStyle('italic')
    } else if (k === 'u') {
      e.preventDefault()
      toggleStyle('underline')
    }
    return
  }
  switch (e.key) {
    case 'ArrowUp': e.preventDefault(); moveActive(-1, 0); break
    case 'ArrowDown': e.preventDefault(); moveActive(1, 0); break
    case 'ArrowLeft': e.preventDefault(); moveActive(0, -1); break
    case 'ArrowRight': e.preventDefault(); moveActive(0, 1); break
    case 'Tab':
      e.preventDefault()
      moveActive(0, e.shiftKey ? -1 : 1)
      break
    case 'Enter':
      e.preventDefault()
      moveActive(1, 0)
      break
    case 'Delete':
    case 'Backspace':
      e.preventDefault()
      clearSelection()
      break
    case 'F2':
      e.preventDefault()
      startEditing(activeR.value, activeC.value)
      break
  }
}

function clearSelection() {
  if (!props.editable) return
  pushUndo()
  const rs = Math.min(selection.startR, selection.endR)
  const re = Math.max(selection.startR, selection.endR)
  const cs = Math.min(selection.startC, selection.endC)
  const ce = Math.max(selection.startC, selection.endC)
  for (let r = rs; r <= re; r++) {
    for (let c = cs; c <= ce; c++) delete activeSheet.value.cells[cellRef(r, c)]
  }
  emit('update:modelValue', toModelValue())
}

// ===== 初始化 / watch =====
watch(
  () => activeSheet.value.cells,
  () => {
    formulaBarValue.value = String(getCellRaw(activeR.value, activeC.value))
  },
  { deep: true }
)

watch(
  () => props.modelValue,
  (val) => {
    if (val && val.length > 0 && Object.keys(activeSheet.value.cells).length === 0) {
      loadModelValue(val)
    }
  },
  { immediate: true }
)

function loadModelValue(data: Record<string, unknown>[]) {
  const cells: Record<string, CellData> = {}
  data.forEach((row, idx) => {
    const r = idx + 1
    for (const key in row) {
      const col = colIndexFromName(key)
      const v = row[key]
      if (v !== '' && v !== null && v !== undefined) {
        cells[cellRef(r, col)] = { raw: typeof v === 'number' ? v : String(v) }
      }
    }
  })
  activeSheet.value.cells = cells
}

function colIndexFromName(name: string): number {
  let col = 0
  for (const ch of name.toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64)
  return col
}

onMounted(() => {
  containerRef.value?.focus()
})

onBeforeUnmount(() => {
  onDocumentMouseUp()
  onFillMouseUp()
  onColResizeUp()
  onRowResizeUp()
})

// 公開 API
defineExpose({
  exportExcel: performExport,
  getData: toModelValue,
  getCell: (r: number, c: number) => getCellValue(r, c),
  undo,
  redo,
  addSheet,
  removeSheet,
  switchSheet,
  clear: clearSelection,
})
</script>

<style scoped>
/* ===== 工具列按鈕 ===== */
.tb-btn {
  @apply inline-flex items-center justify-center w-8 h-7 px-1 text-sm font-medium text-content-primary bg-surface-primary border border-stroke-light rounded transition-colors duration-150;
  @apply hover:bg-surface-tertiary hover:border-stroke-default disabled:opacity-40 disabled:cursor-not-allowed;
}
.tb-btn.active {
  @apply bg-success-subtle-hover text-success border-success-subtle-border;
}
.tb-sep {
  @apply w-px h-5 bg-surface-muted mx-1;
}

.excel-grid {
  max-height: 480px;
}

/* ===== 表格 =====
 * table 使用 border-collapse: separate 而非 collapse。
 * 原因：collapse 模式下相鄰儲存格會「共用同一條邊框線」，
 * 當其中一格是 position: sticky（會被瀏覽器提升為獨立合成層）
 * 而相鄰格是一般文件流時，Chromium/Edge 對這條共用邊框線的
 * 算繪會出現鋸齒/虛線的已知 bug（凍結窗格交界處線條斷續消失）。
 * 改用 separate 後，每條格線都只由「單一元素」擁有
 * （右邊框/下邊框），不再有共用邊框，從根本避免此算繪缺陷。
 */
.grid-table {
  border-collapse: separate;
  border-spacing: 0;
}
.grid-corner {
  @apply sticky z-30 top-0 left-0 w-10 min-w-[40px] h-6 min-h-[24px] bg-surface-tertiary border border-stroke-default;
}
.grid-col-header {
  @apply sticky top-0 text-center text-xs font-semibold text-content-secondary bg-surface-tertiary border-t border-r border-b border-stroke-default h-6 min-h-[24px] px-1 whitespace-nowrap;
  z-index: 22;
  position: sticky;
  user-select: none;
}
.grid-row-header {
  @apply sticky z-20 left-0 text-center text-xs font-semibold text-content-secondary bg-surface-tertiary border-l border-r border-b border-stroke-default w-10 min-w-[40px] px-1;
  position: sticky;
  user-select: none;
}
.grid-cell {
  @apply border-r border-b border-stroke-light p-0 m-0 align-middle;
  height: 24px;
  min-height: 24px;
  position: relative;
}
.cell-display {
  @apply block w-full h-full px-1.5 py-0.5 text-sm text-content-primary overflow-hidden whitespace-nowrap;
  line-height: 1.4;
}
.cell-editor {
  @apply w-full h-full px-1.5 py-0.5 text-sm text-content-primary border-2 border-success bg-surface-primary outline-none;
}
.cell-selected {
  @apply bg-success-subtle-hover/40;
}
.cell-active {
  @apply outline outline-2 outline-offset-[-2px] outline-green-600 bg-surface-primary;
}

/* 拖曳填充把手 */
.fill-handle {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 6px;
  height: 6px;
  background: #16a34a;
  border: 1px solid #fff;
  cursor: crosshair;
  z-index: 20;
}

/* ===== 凍結窗格 ===== */
.sticky-col {
  position: sticky;
  background: inherit;
}
.sticky-row {
  position: sticky;
  background: inherit;
}

.col-resize-handle {
  position: absolute;
  top: 0;
  right: -2px;
  width: 6px;
  height: 100%;
  cursor: col-resize;
}

.row-resize-handle {
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 100%;
  height: 6px;
  cursor: row-resize;
}

/* ===== 工作表頁籤 ===== */
.sheet-add {
  @apply flex items-center justify-center w-6 h-6 text-lg font-bold text-content-tertiary hover:text-success hover:bg-success-subtle rounded transition-colors;
}
.sheet-tab {
  @apply flex items-center gap-1 px-1 py-0.5 text-sm text-content-secondary border border-stroke-default rounded-md cursor-pointer transition-colors;
}
.sheet-tab.active {
  @apply bg-success-solid text-white border-green-600;
}
.sheet-close {
  @apply flex items-center justify-center w-4 h-4 text-xs rounded hover:bg-surface-primary/20;
}

.sheet-rename-input {
  @apply w-24 px-1.5 py-0.5 text-xs text-content-primary bg-surface-primary border border-success-subtle-border rounded outline-none;
}
</style>