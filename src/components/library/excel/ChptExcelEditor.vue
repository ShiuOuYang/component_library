<template>
  <div
    ref="containerRef"
    class="chpt-excel-editor w-full rounded-xl border border-stroke-light bg-surface-primary shadow-sm overflow-hidden select-none"
    @mousedown="onGridMouseDown"
    @mousemove="onGridMouseMove"
    @mouseup="onGridMouseUp"
    @keydown="handleKeydown"
    @copy="onCopy"
    @cut="onCut"
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
          ref="formulaInputRef"
          class="formula-input flex-1 px-2 py-1 text-sm text-content-primary border border-stroke-default rounded focus:outline-none focus:ring-1 focus:ring-success"
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
            <!--
              合併範圍：主格用 colspan / rowspan 撐開，被蓋住的格子不算繪。
              ⚠️ 原本主格沒有 colspan，只把被蓋住的格子設成 display:none ——
                 那一列少了幾個 <td>，右邊的格子整排往左位移（合併 A1:C1 後 D1 跑到 B 欄底下）。
            -->
            <template v-for="c in colCount" :key="c">
            <td
              v-if="!isMergedChild(r, c)"
              class="grid-cell"
              :data-rc="r + ',' + c"
              :colspan="mergeAt(r, c)?.cols"
              :rowspan="mergeAt(r, c)?.rows"
              :class="[
                cellClass(r, c),
                isFrozenCol(c) ? 'sticky-col' : '',
                isFrozenRow(r) ? 'sticky-row' : ''
              ]"
              :style="[cellStyle(r, c), cellSpanSize(r, c), frozenCellStyle(r, c)]"
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
                v-if="r === fillHandleCell.r && c === fillHandleCell.c && editable"
                class="fill-handle"
                @mousedown.prevent.stop="onFillHandleMouseDown"
              ></span>
            </td>
            </template>
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
import { cellRef, colName } from './formula/cellRef'
import { evaluateFormula } from './formula/formulaEngine'
import { applyStructuralChange } from './sheetOps'
import { parseTSV, toTSV } from './clipboard'
import { buildWorkbook } from './xlsxExport'
import { extendSeries } from './autofill'
import { formatValue, generalAlign, sortCompare, type CellAlign } from './values'
import { shiftFormula } from './formula/refRewrite'

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
/**
 * 輸入模式（直接打字開始）：方向鍵提交並移動
 * 編輯模式（F2 / 雙擊）：方向鍵在文字裡移動游標
 */
const editMode = ref<'enter' | 'edit'>('edit')
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
/**
 * 一筆復原紀錄 = 某一張工作表在某個時間點的完整快照。
 *
 * ⚠️ 原本只存 SheetData、沒記是哪一張表，restore() 一律寫進「目前這張」。
 *    於是在第二張表輸入、切回第一張表按 Ctrl+Z，會把第二張表的快照
 *    整張覆蓋到第一張 —— 真實瀏覽器實測：非空儲存格 2 → 0，資料全部消失。
 */
interface UndoEntry {
  sheetIndex: number
  data: SheetData
}
const undoStack = ref<UndoEntry[]>([])
const redoStack = ref<UndoEntry[]>([])

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

type MergeRange = SheetData['merges'][string]

/**
 * 每個被合併的格子 → 它所屬的合併範圍。
 * 算繪時每一格都要問「我在不在合併範圍裡」，原本每次都掃過全部合併範圍（格數 × 合併數）。
 */
const mergeIndex = computed(() => {
  const index = new Map<string, MergeRange>()
  for (const key in activeSheet.value.merges) {
    const m = activeSheet.value.merges[key]
    for (let r = m.r; r < m.r + m.rows; r++) {
      for (let c = m.c; c < m.c + m.cols; c++) index.set(r + ',' + c, m)
    }
  }
  return index
})

/** (r, c) 所在的合併範圍（沒有則 undefined） */
function mergeContaining(r: number, c: number): MergeRange | undefined {
  return mergeIndex.value.get(r + ',' + c)
}

/** (r, c) 是合併主格時傳回合併範圍 */
function mergeAt(r: number, c: number): MergeRange | undefined {
  const m = mergeContaining(r, c)
  return m && m.r === r && m.c === c ? m : undefined
}

/** 合併主格：傳回所在合併範圍的左上角，否則同座標 */
function mergeOrigin(r: number, c: number): { r: number; c: number } {
  const m = mergeContaining(r, c)
  return m ? { r: m.r, c: m.c } : { r, c }
}

function isMergedChild(r: number, c: number): boolean {
  const o = mergeOrigin(r, c)
  return o.r !== r || o.c !== c
}

/**
 * 儲存格顯示的文字。
 * 數字格式對「手打的數字」與「公式算出的數字」一視同仁（見 values.ts）。
 */
function cellDisplay(r: number, c: number): string | number {
  const o = mergeOrigin(r, c)
  const v = getCellValue(o.r, o.c)
  if (v === '') return ''
  return formatValue(v, getCellStyle(o.r, o.c).numFmt)
}

/** 有指定對齊就照指定；沒有就用 Excel「通用」格式的規則（數字靠右） */
function cellAlign(r: number, c: number): CellAlign {
  const o = mergeOrigin(r, c)
  return getCellStyle(o.r, o.c).align ?? generalAlign(getCellValue(o.r, o.c))
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

/** 儲存格的寬高；合併主格是它涵蓋的所有欄寬 / 列高的總和 */
function cellSpanSize(r: number, c: number): Record<string, string> {
  const m = mergeAt(r, c)
  if (!m) return { ...cellColWidth(c), ...cellRowHeight(r) }
  let w = 0
  for (let i = m.c; i < m.c + m.cols; i++) w += activeSheet.value.colWidths[i] ?? 80
  let h = 0
  for (let i = m.r; i < m.r + m.rows; i++) h += activeSheet.value.rowHeights[i] ?? 24
  return { minWidth: w + 'px', width: w + 'px', height: h + 'px' }
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
    // 走主題變數：寫死 #f3f4f6 在深色模式下會是一條亮灰色的凍結列標頭
    style.backgroundColor = 'rgb(var(--t-surface-tertiary))'
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
  // ⚠️ 原本寫死 #ffffff —— 深色模式下凍結的儲存格整塊是白的。
  //    上一輪的 check:theme 只掃 Tailwind class，抓不到 inline style 的色碼。
  style.backgroundColor = 'rgb(var(--t-surface-primary))'
  style.zIndex = frozenCol && frozenRow ? '26' : '12'
  return style
}

// ===== 選取邏輯 =====
function clampR(r: number): number {
  return Math.min(Math.max(r, 1), props.rowCount)
}
function clampC(c: number): number {
  return Math.min(Math.max(c, 1), props.colCount)
}

/** 設定選取範圍（一律擴大到完整涵蓋相交的合併格） */
function setSelectionRange(range: { rs: number; re: number; cs: number; ce: number }) {
  const { rs, re, cs, ce } = expandToMerges(range)
  selection.startR = rs
  selection.endR = re
  selection.startC = cs
  selection.endC = ce
}

/** 點選單一儲存格：作用中儲存格與選取範圍都是它（在合併範圍內時是整個合併格） */
function setActive(r: number, c: number) {
  const o = mergeOrigin(clampR(r), clampC(c))
  activeR.value = o.r
  activeC.value = o.c
  setSelectionRange({ rs: o.r, re: o.r, cs: o.c, ce: o.c })
  emitSelectionChange()
  scrollActiveIntoView()
}

/**
 * 選取範圍中「會動的那一角」：作用中儲存格的對角。
 *
 * ⚠️ 原本 Shift+點擊與拖曳都把作用中儲存格移到終點，而且沒有 Shift+方向鍵。
 *    Excel 的作用中儲存格固定在起點（錨點），Shift+方向鍵 / Shift+點擊 / 拖曳
 *    只移動對角 —— 之後輸入的內容、Ctrl+D 的來源、合併的判斷都以錨點為準。
 */
function selectionExtent(): { r: number; c: number } {
  return {
    r: activeR.value === selection.startR ? selection.endR : selection.startR,
    c: activeC.value === selection.startC ? selection.endC : selection.startC,
  }
}

/** 把選取範圍延伸到 (r, c)，作用中儲存格不動 */
function extendSelection(r: number, c: number) {
  r = clampR(r)
  c = clampC(c)
  setSelectionRange({
    rs: Math.min(activeR.value, r),
    re: Math.max(activeR.value, r),
    cs: Math.min(activeC.value, c),
    ce: Math.max(activeC.value, c),
  })
  emitSelectionChange()
  scrollCellIntoView(r, c)
}

/** 選取範圍是不是只有作用中那一格（含合併格） */
function isSingleArea(): boolean {
  const m = mergeContaining(activeR.value, activeC.value)
  const rows = m?.rows ?? 1
  const cols = m?.cols ?? 1
  return (
    selection.startR === activeR.value &&
    selection.startC === activeC.value &&
    selection.endR - selection.startR + 1 === rows &&
    selection.endC - selection.startC + 1 === cols
  )
}

/** 填充控點在選取範圍的右下角（Excel）；原本跟著作用中儲存格 */
const fillHandleCell = computed(() => mergeOrigin(selection.endR, selection.endC))

function scrollCellIntoView(r: number, c: number) {
  nextTick(() => {
    const o = mergeOrigin(r, c)
    const el = containerRef.value?.querySelector(`[data-rc="${o.r},${o.c}"]`) as HTMLElement | null
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  })
}

function scrollActiveIntoView() {
  scrollCellIntoView(activeR.value, activeC.value)
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
  const o = mergeOrigin(1, c)
  activeR.value = o.r
  activeC.value = o.c
  setSelectionRange({ rs: 1, re: props.rowCount, cs: c, ce: c })
  emitSelectionChange()
}

function selectRow(r: number) {
  const o = mergeOrigin(r, 1)
  activeR.value = o.r
  activeC.value = o.c
  setSelectionRange({ rs: r, re: r, cs: 1, ce: props.colCount })
  emitSelectionChange()
}

function onCellMouseDown(r: number, c: number, event: MouseEvent) {
  if (!props.editable) return
  tabStartC = null
  if (event.shiftKey) {
    extendSelection(r, c)
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
  // 作用中儲存格留在拖曳起點（Excel 行為）
  extendSelection(pos.r, pos.c)
}

function onDocumentMouseUp() {
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
/**
 * 填充控點。
 *
 * ⚠️ 原本只會往下 / 往右循環複製：=A1+B1 往下拉還是 =A1+B1（結果全錯），
 *    1、2 往下拉是 1、2、1、2，週一往下拉還是週一。
 *
 * 現在與 Excel 相同：
 *   - 公式的相對參照跟著平移（shiftFormula）
 *   - 數字、「項目 1」、星期、月份延伸成數列（autofill.ts）
 *   - 四個方向都能拉；以拖曳距離較遠的那個軸為準
 */
const isFilling = ref(false)
const fillOrigin = ref<{ rs: number; re: number; cs: number; ce: number } | null>(null)
const fillTarget = ref<{ axis: 'row' | 'col'; dir: 1 | -1; to: number } | null>(null)

function onFillHandleMouseDown() {
  if (!props.editable) return
  isFilling.value = true
  fillOrigin.value = getSelectionRange()
  fillTarget.value = null
  document.addEventListener('mousemove', onFillMouseMove)
  document.addEventListener('mouseup', onFillMouseUp)
}

function onFillMouseMove(e: MouseEvent) {
  if (!isFilling.value || !fillOrigin.value) return
  const pos = cellFromPoint(e.clientX, e.clientY)
  if (!pos) return
  const { rs, re, cs, ce } = fillOrigin.value
  const down = pos.r - re
  const up = rs - pos.r
  const right = pos.c - ce
  const left = cs - pos.c
  const vert = Math.max(down, up, 0)
  const horiz = Math.max(right, left, 0)

  // 還在來源範圍內：沒有要填
  let next: typeof fillTarget.value = null
  if (vert > 0 || horiz > 0) {
    next =
      vert >= horiz
        ? { axis: 'row', dir: down > 0 ? 1 : -1, to: pos.r }
        : { axis: 'col', dir: right > 0 ? 1 : -1, to: pos.c }
  }
  fillTarget.value = next

  // 預覽：選取框涵蓋來源加上要填的範圍
  selection.startR = next?.axis === 'row' && next.dir === -1 ? next.to : rs
  selection.endR = next?.axis === 'row' && next.dir === 1 ? next.to : re
  selection.startC = next?.axis === 'col' && next.dir === -1 ? next.to : cs
  selection.endC = next?.axis === 'col' && next.dir === 1 ? next.to : ce
  emitSelectionChange()
}

function onFillMouseUp() {
  if (isFilling.value && fillOrigin.value && fillTarget.value) performFill()
  isFilling.value = false
  fillOrigin.value = null
  fillTarget.value = null
  document.removeEventListener('mousemove', onFillMouseMove)
  document.removeEventListener('mouseup', onFillMouseUp)
}

/**
 * 沿一條線（一欄或一列）往外填 count 格。
 * @param line 來源座標，依填充軸由小到大排列
 */
function fillLine(line: { r: number; c: number }[], count: number, dir: 1 | -1, axis: 'row' | 'col') {
  const n = line.length
  const src = line.map((p) => getCell(p.r, p.c))
  const values = src.map((cell) => cell?.raw ?? '')
  const series = extendSeries(values, count, dir)
  const anchor = dir === 1 ? line[n - 1] : line[0]

  for (let k = 0; k < count; k++) {
    const offset = dir * (k + 1)
    const target = axis === 'row' ? { r: anchor.r + offset, c: anchor.c } : { r: anchor.r, c: anchor.c + offset }
    if (target.r < 1 || target.c < 1 || target.r > props.rowCount || target.c > props.colCount) continue
    const key = cellRef(target.r, target.c)

    // 循環對應的來源：往下 / 右是 0,1,2,0…；往上 / 左是從最後一個往回
    const si = dir === 1 ? k % n : n - 1 - (k % n)
    const from = src[si]
    const style = from?.style ? { ...from.style } : undefined

    if (series) {
      activeSheet.value.cells[key] = { raw: series[k], style }
      continue
    }
    const raw = from?.raw
    if (raw === undefined || raw === '') {
      if (style) activeSheet.value.cells[key] = { style }
      else delete activeSheet.value.cells[key]
      continue
    }
    const shifted =
      typeof raw === 'string' && raw.startsWith('=')
        ? '=' + shiftFormula(raw.slice(1), target.r - line[si].r, target.c - line[si].c)
        : raw
    activeSheet.value.cells[key] = { raw: shifted, style }
  }
}

function performFill() {
  const { rs, re, cs, ce } = fillOrigin.value!
  const t = fillTarget.value!
  const count = t.axis === 'row' ? (t.dir === 1 ? t.to - re : rs - t.to) : t.dir === 1 ? t.to - ce : cs - t.to
  if (count <= 0) return
  pushUndo()
  if (t.axis === 'row') {
    for (let c = cs; c <= ce; c++) {
      const line = Array.from({ length: re - rs + 1 }, (_, i) => ({ r: rs + i, c }))
      fillLine(line, count, t.dir, 'row')
    }
  } else {
    for (let r = rs; r <= re; r++) {
      const line = Array.from({ length: ce - cs + 1 }, (_, i) => ({ r, c: cs + i }))
      fillLine(line, count, t.dir, 'col')
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
  editMode.value = initial !== undefined ? 'enter' : 'edit'
  formulaBarValue.value = String(value)
  nextTick(() => {
    editorInputEl?.focus()
    // 游標放在最後（Excel 的 F2）；原本是全選，一按鍵就把整格內容蓋掉
    const end = String(value).length
    editorInputEl?.setSelectionRange(end, end)
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

/**
 * 編輯中的按鍵。
 *
 *   Enter / Tab         提交並移動（多格選取時在選取範圍內循環）；Shift 反向
 *   Ctrl+Enter          提交到選取範圍內的每一格（公式的相對參照逐格平移）
 *   方向鍵              「輸入模式」（直接打字開始的）提交並移動；「編輯模式」（F2 / 雙擊）移動游標
 *   F2                  切換輸入模式 / 編輯模式
 *   F4                  切換游標所在參照的 $（A1 → $A$1 → A$1 → $A1 → A1）
 */
function onEditorKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
    if (e.ctrlKey || e.metaKey) {
      commitToSelection()
      return
    }
    commitEditing()
    moveEnter(e.shiftKey ? -1 : 1)
  } else if (e.key === 'Tab') {
    e.preventDefault()
    e.stopPropagation()
    commitEditing()
    moveTab(e.shiftKey ? -1 : 1)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    editing.value = null
    formulaBarValue.value = String(getCellRaw(activeR.value, activeC.value))
    containerRef.value?.focus()
  } else if (e.key === 'F2') {
    e.preventDefault()
    editMode.value = editMode.value === 'enter' ? 'edit' : 'enter'
  } else if (e.key === 'F4') {
    e.preventDefault()
    const input = e.target as HTMLInputElement
    const next = toggleAbsoluteAt(String(editValue.value), input.selectionStart ?? 0)
    if (next) {
      editValue.value = next.text
      nextTick(() => input.setSelectionRange(next.caret, next.caret))
    }
  } else if (ARROWS[e.key] && editMode.value === 'enter' && !String(editValue.value).startsWith('=')) {
    // 公式在 Excel 裡是「指向模式」（方向鍵插入參照），這裡還沒有 —— 公式先讓方向鍵移動游標，不提交
    e.preventDefault()
    e.stopPropagation()
    commitEditing()
    const [dr, dc] = ARROWS[e.key]
    moveActive(dr, dc)
  }
}

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

/** 往 (dr, dc) 移動一格；在合併格上時跳過整個合併範圍 */
function moveActive(dr: number, dc: number) {
  const m = mergeContaining(activeR.value, activeC.value)
  let r = activeR.value
  let c = activeC.value
  if (m && dr > 0) r = m.r + m.rows - 1
  if (m && dc > 0) c = m.c + m.cols - 1
  setActive(r + dr, c + dc)
  containerRef.value?.focus()
}

/**
 * Tab 之後按 Enter 回到開始 Tab 的那一欄（Excel：一列一列輸入表單時的行為）。
 * 任何其他移動都會重設。
 */
let tabStartC: number | null = null

/**
 * Enter：往下（Shift 往上）。
 * 多格選取時在選取範圍內移動，到底換下一欄，選取範圍不變。
 */
function moveEnter(dir: 1 | -1) {
  if (!isSingleArea()) {
    cycleInSelection('col', dir)
    return
  }
  if (tabStartC !== null && dir === 1) {
    const c = tabStartC
    tabStartC = null
    const m = mergeContaining(activeR.value, activeC.value)
    setActive((m ? m.r + m.rows - 1 : activeR.value) + 1, c)
    containerRef.value?.focus()
    return
  }
  tabStartC = null
  moveActive(dir, 0)
}

/** Tab：往右（Shift 往左）。多格選取時在選取範圍內移動，到邊換列 */
function moveTab(dir: 1 | -1) {
  if (!isSingleArea()) {
    cycleInSelection('row', dir)
    return
  }
  if (tabStartC === null) tabStartC = activeC.value
  moveActive(0, dir)
}

/**
 * 在選取範圍內循環移動作用中儲存格，選取範圍不變。
 * major = 'col'：先往下，到底換欄（Enter）；major = 'row'：先往右，到邊換列（Tab）。
 * 會跳過被合併格蓋住的格子。
 */
function cycleInSelection(major: 'row' | 'col', dir: 1 | -1) {
  const { startR: rs, endR: re, startC: cs, endC: ce } = selection
  const rows = re - rs + 1
  const cols = ce - cs + 1
  const total = rows * cols
  // 把格子攤平成一維序號
  const toIndex = (r: number, c: number) =>
    major === 'col' ? (c - cs) * rows + (r - rs) : (r - rs) * cols + (c - cs)
  const fromIndex = (i: number) =>
    major === 'col'
      ? { r: rs + (i % rows), c: cs + Math.floor(i / rows) }
      : { r: rs + Math.floor(i / cols), c: cs + (i % cols) }
  let i = toIndex(activeR.value, activeC.value)
  for (let step = 0; step < total; step++) {
    i = (((i + dir) % total) + total) % total
    const { r, c } = fromIndex(i)
    if (!isMergedChild(r, c)) {
      activeR.value = r
      activeC.value = c
      break
    }
  }
  emitSelectionChange()
  scrollActiveIntoView()
  containerRef.value?.focus()
}

/** 儲存格本身有沒有內容（Excel 的 Ctrl+方向鍵看的是儲存格，不是顯示值） */
function hasContent(r: number, c: number): boolean {
  return getCellRaw(r, c) !== ''
}

/**
 * Ctrl+方向鍵：跳到資料區的邊緣（Excel 規則）
 *   - 目前這格與下一格都有內容 → 沿著連續的資料走到最後一格
 *   - 否則 → 跳到下一個有內容的格子；沒有就到工作表邊界
 */
function dataEdge(r: number, c: number, dr: number, dc: number): { r: number; c: number } {
  const inside = (rr: number, cc: number) =>
    rr >= 1 && rr <= props.rowCount && cc >= 1 && cc <= props.colCount
  if (!inside(r + dr, c + dc)) return { r, c }
  if (hasContent(r, c) && hasContent(r + dr, c + dc)) {
    while (inside(r + dr, c + dc) && hasContent(r + dr, c + dc)) {
      r += dr
      c += dc
    }
    return { r, c }
  }
  r += dr
  c += dc
  while (!hasContent(r, c) && inside(r + dr, c + dc)) {
    r += dr
    c += dc
  }
  return { r, c }
}

/** 最後一個有內容的列與欄（Ctrl+End） */
function usedRangeEnd(): { r: number; c: number } {
  let r = 1
  let c = 1
  for (const key in activeSheet.value.cells) {
    const raw = activeSheet.value.cells[key].raw
    if (raw === undefined || raw === '') continue
    const m = key.match(/^([A-Z]+)(\d+)$/)
    if (!m) continue
    r = Math.max(r, Number(m[2]))
    c = Math.max(c, colIndexFromName(m[1]))
  }
  return { r, c }
}

/** 一頁有幾列（PageUp / PageDown） */
function pageRows(): number {
  const h = containerRef.value?.querySelector('.excel-grid')?.clientHeight ?? 0
  return Math.max(1, Math.floor(h / 24) - 1) || 20
}

/**
 * 導覽鍵：移動作用中儲存格；按著 Shift 時改成延伸選取範圍（作用中儲存格不動）。
 * 回傳 false 表示不是導覽鍵。
 */
function navigate(e: KeyboardEvent): boolean {
  const ctrl = e.ctrlKey || e.metaKey
  const from = e.shiftKey ? selectionExtent() : { r: activeR.value, c: activeC.value }
  let to: { r: number; c: number }
  const arrow = ARROWS[e.key]
  if (arrow) {
    const [dr, dc] = arrow
    if (ctrl) {
      to = dataEdge(from.r, from.c, dr, dc)
    } else if (!e.shiftKey) {
      tabStartC = null
      moveActive(dr, dc)
      return true
    } else {
      // Shift+方向鍵：碰到合併格時要一次跨過整個合併格，選取範圍才會改變
      const key = () => `${selection.startR},${selection.endR},${selection.startC},${selection.endC}`
      const before = key()
      let r = from.r
      let c = from.c
      while (key() === before) {
        const nr = clampR(r + dr)
        const nc = clampC(c + dc)
        if (nr === r && nc === c) break
        r = nr
        c = nc
        extendSelection(r, c)
      }
      tabStartC = null
      containerRef.value?.focus()
      return true
    }
  } else if (e.key === 'Home') {
    to = ctrl ? { r: 1, c: 1 } : { r: from.r, c: 1 }
  } else if (e.key === 'End' && ctrl) {
    to = usedRangeEnd()
  } else if (e.key === 'PageDown' || e.key === 'PageUp') {
    to = { r: from.r + (e.key === 'PageDown' ? 1 : -1) * pageRows(), c: from.c }
  } else {
    return false
  }
  tabStartC = null
  if (e.shiftKey) extendSelection(to.r, to.c)
  else setActive(to.r, to.c)
  containerRef.value?.focus()
  return true
}

/**
 * F4：把游標所在（或緊接在游標前）的儲存格參照依序切換成
 *     A1 → $A$1 → A$1 → $A1 → A1
 */
function toggleAbsoluteAt(text: string, caret: number): { text: string; caret: number } | null {
  const re = /(\$?)([A-Za-z]{1,3})(\$?)(\d+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const start = m.index
    const end = start + m[0].length
    // 更長識別字的一部分（LOG10、ATAN2）不算
    if (/[A-Za-z0-9_]/.test(text[start - 1] ?? '')) continue
    if (/[A-Za-z0-9_(]/.test(text[end] ?? '')) continue
    if (caret < start || caret > end) continue
    const [, absCol, col, absRow, row] = m
    // 狀態位元：2 = 欄絕對、1 = 列絕對。循環 0 → 3 → 1 → 2 → 0
    const state = (absCol ? 2 : 0) + (absRow ? 1 : 0)
    const nextState = ({ 0: 3, 3: 1, 1: 2, 2: 0 } as Record<number, number>)[state]
    const ref = (nextState & 2 ? '$' : '') + col + (nextState & 1 ? '$' : '') + row
    return { text: text.slice(0, start) + ref + text.slice(end), caret: start + ref.length }
  }
  return null
}

/**
 * Ctrl+D / Ctrl+R：向下 / 向右填滿（複製第一列 / 第一欄）。
 * 選取範圍只有一列（一欄）時，來源是上面那一列（左邊那一欄）。
 * 公式的相對參照逐格平移，格式一起複製（與 Excel 相同）。
 */
function fillFromEdge(axis: 'row' | 'col') {
  if (!props.editable) return
  const range = getSelectionRange()
  let { rs, cs } = range
  const { re, ce } = range
  if (axis === 'row' && rs === re) rs = Math.max(1, rs - 1)
  if (axis === 'col' && cs === ce) cs = Math.max(1, cs - 1)
  if ((axis === 'row' && rs === re) || (axis === 'col' && cs === ce)) return
  pushUndo()
  const cells = activeSheet.value.cells
  for (let r = rs; r <= re; r++) {
    for (let c = cs; c <= ce; c++) {
      const sr = axis === 'row' ? rs : r
      const sc = axis === 'col' ? cs : c
      if (sr === r && sc === c) continue
      const src = cells[cellRef(sr, sc)]
      const key = cellRef(r, c)
      if (!src) {
        delete cells[key]
        continue
      }
      const raw =
        typeof src.raw === 'string' && src.raw.startsWith('=')
          ? '=' + shiftFormula(src.raw.slice(1), r - sr, c - sc)
          : src.raw
      const next: CellData = {}
      if (raw !== undefined) next.raw = raw
      if (src.style) next.style = { ...src.style }
      cells[key] = next
    }
  }
  emit('update:modelValue', toModelValue())
}

/**
 * Ctrl+Enter：把編輯中的內容寫進選取範圍的每一格。
 * 公式以作用中儲存格為準，其他格子的相對參照跟著平移。
 */
function commitToSelection() {
  if (!editing.value) return
  const value = String(editValue.value)
  const { r: ar, c: ac } = editing.value
  const { rs, re, cs, ce } = getSelectionRange()
  pushUndo()
  const cells = activeSheet.value.cells
  for (let r = rs; r <= re; r++) {
    for (let c = cs; c <= ce; c++) {
      if (isMergedChild(r, c)) continue
      const key = cellRef(r, c)
      const raw = value.startsWith('=') ? '=' + shiftFormula(value.slice(1), r - ar, c - ac) : value
      if (raw === '') {
        const style = cells[key]?.style
        if (style) cells[key] = { style }
        else delete cells[key]
      } else {
        cells[key] = { ...(cells[key] || {}), raw }
      }
    }
  }
  editing.value = null
  formulaBarValue.value = String(getCellRaw(activeR.value, activeC.value))
  emit('update:modelValue', toModelValue())
  containerRef.value?.focus()
}

// ===== 復原 / 重做 =====
function snapshotOf(sheetIndex: number): UndoEntry {
  return { sheetIndex, data: JSON.parse(JSON.stringify(sheets[sheetIndex])) }
}

function pushUndo() {
  undoStack.value.push(snapshotOf(activeSheetIndex.value))
  if (undoStack.value.length > 100) undoStack.value.shift()
  redoStack.value = []
}

/** 把快照寫回它原本所屬的工作表，並切換過去（Excel 也會帶你回到被復原的那張表） */
function restore(entry: UndoEntry) {
  const sheet = sheets[entry.sheetIndex]
  if (!sheet) return
  const snap = entry.data
  sheet.name = snap.name
  sheet.cells = snap.cells
  sheet.colWidths = snap.colWidths
  sheet.rowHeights = snap.rowHeights
  sheet.merges = snap.merges
  sheet.freezeRows = snap.freezeRows
  sheet.freezeCols = snap.freezeCols
  if (activeSheetIndex.value !== entry.sheetIndex) switchSheet(entry.sheetIndex)
}

function undo() {
  if (!canUndo.value) return
  const entry = undoStack.value.pop()!
  // 重做紀錄要存「被復原的那張表」現在的樣子，而不是目前顯示的表
  redoStack.value.push(snapshotOf(entry.sheetIndex))
  restore(entry)
  emit('update:modelValue', toModelValue())
}

function redo() {
  if (!canRedo.value) return
  const entry = redoStack.value.pop()!
  undoStack.value.push(snapshotOf(entry.sheetIndex))
  restore(entry)
  emit('update:modelValue', toModelValue())
}

/**
 * 刪除工作表後修正復原紀錄：被刪那張表的紀錄丟掉，
 * 後面的表索引往前移一格 —— 否則復原會寫進錯的表。
 */
function reindexHistory(removedIndex: number) {
  const fix = (stack: UndoEntry[]) =>
    stack
      .filter((e) => e.sheetIndex !== removedIndex)
      .map((e) => (e.sheetIndex > removedIndex ? { ...e, sheetIndex: e.sheetIndex - 1 } : e))
  undoStack.value = fix(undoStack.value)
  redoStack.value = fix(redoStack.value)
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
  // 多格選取時編輯的是作用中儲存格（Excel）；原本整個公式列被停用
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
/**
 * 內部剪貼簿：保留原始公式與樣式，並記住來源位置，
 * 貼上時才能把相對參照平移（B1 的 =A1*2 貼到 B2 → =A2*2）。
 *
 * text 是同一次複製寫進系統剪貼簿的文字。貼上時若系統剪貼簿的內容
 * 與它相同，代表使用者貼的是自己剛複製的東西 → 走內部路徑（保留公式）；
 * 否則是從外部（Excel、網頁）複製來的 → 當成純文字解析。
 */
interface ClipboardCell {
  raw: string | number
  style?: CellStyle
}
const clipboard = ref<{ origin: { r: number; c: number }; cells: ClipboardCell[][]; text: string } | null>(null)

/** 取得目前選取範圍（歸一化後） */
function getSelectionRange() {
  const rs = Math.min(selection.startR, selection.endR)
  const re = Math.max(selection.startR, selection.endR)
  const cs = Math.min(selection.startC, selection.endC)
  const ce = Math.max(selection.startC, selection.endC)
  return { rs, re, cs, ce }
}

/** 讀取選取範圍的顯示值矩陣（寫進系統剪貼簿的是畫面上看到的值，與 Excel 相同） */
function getSelectionValues(): (string | number)[][] {
  const { rs, re, cs, ce } = getSelectionRange()
  const rows: (string | number)[][] = []
  for (let r = rs; r <= re; r++) {
    const row: (string | number)[] = []
    for (let c = cs; c <= ce; c++) row.push(cellDisplay(r, c))
    rows.push(row)
  }
  return rows
}

/** 將矩陣轉為 HTML 表格（供貼到 Excel / Word 保留格線） */
function valuesToHTML(rows: (string | number)[][]): string {
  const body = rows
    .map((row) => '<tr>' + row.map((v) => `<td>${escapeHtml(String(v))}</td>`).join('') + '</tr>')
    .join('')
  return `<table>${body}</table>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 建立內部剪貼簿，回傳要寫進系統剪貼簿的文字與 HTML */
function captureSelection(): { text: string; html: string } {
  const values = getSelectionValues()
  const { rs, re, cs, ce } = getSelectionRange()
  const cells: ClipboardCell[][] = []
  for (let r = rs; r <= re; r++) {
    const row: ClipboardCell[] = []
    for (let c = cs; c <= ce; c++) {
      const cell = getCell(r, c)
      row.push({ raw: cell?.raw ?? '', style: cell?.style ? { ...cell.style } : undefined })
    }
    cells.push(row)
  }
  const text = toTSV(values)
  clipboard.value = { origin: { r: rs, c: cs }, cells, text }
  return { text, html: valuesToHTML(values) }
}

/** 焦點在輸入框（儲存格編輯器、公式列、工作表改名）時，剪貼簿交給瀏覽器原生處理 */
function isTextInputTarget(e: Event): boolean {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}

/**
 * 原生 copy 事件：同步寫入 clipboardData。
 *
 * 比 navigator.clipboard.write() 可靠 —— 後者是非同步、需要權限，
 * 在部分瀏覽器與 iframe 內會直接失敗（原本只 console.warn）。
 */
function onCopy(e: ClipboardEvent) {
  if (isTextInputTarget(e) || editing.value) return
  const { text, html } = captureSelection()
  e.clipboardData?.setData('text/plain', text)
  e.clipboardData?.setData('text/html', html)
  e.preventDefault()
}

function onCut(e: ClipboardEvent) {
  if (isTextInputTarget(e) || editing.value || !props.editable) return
  onCopy(e)
  clearRange(getSelectionRange(), { keepStyle: false })
}

/** 工具列的「複製」按鈕：沒有原生事件可用，改走非同步剪貼簿 API */
async function copySelection() {
  if (editing.value) return
  const { text, html } = captureSelection()
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ])
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    }
  } catch (e) {
    // 權限被拒時內部剪貼簿仍然可用（工具列的貼上按鈕走內部路徑）
    console.warn('寫入系統剪貼簿失敗，改用內部剪貼簿', e)
  }
}

function cutSelection() {
  if (!props.editable) return
  copySelection()
  clearRange(getSelectionRange(), { keepStyle: false })
}

/**
 * 貼上內部剪貼簿：保留公式與樣式，相對參照依位移量平移。
 * 目標範圍大於剪貼簿時平鋪填滿（Excel 行為）。
 */
function pasteInternal() {
  if (!props.editable || !clipboard.value) return
  const { origin, cells: cp } = clipboard.value
  const cpRows = cp.length
  const cpCols = cp[0]?.length ?? 0
  if (cpRows === 0 || cpCols === 0) return

  const { rs, re, cs, ce } = getSelectionRange()
  // 選取範圍剛好是剪貼簿尺寸的整數倍才平鋪；否則只貼一份（Excel 行為）
  const tileRows = (re - rs + 1) % cpRows === 0 ? re - rs + 1 : cpRows
  const tileCols = (ce - cs + 1) % cpCols === 0 ? ce - cs + 1 : cpCols

  pushUndo()
  for (let i = 0; i < tileRows; i++) {
    for (let j = 0; j < tileCols; j++) {
      const r = rs + i
      const c = cs + j
      if (r > props.rowCount || c > props.colCount) continue
      const src = cp[i % cpRows][j % cpCols]
      const key = cellRef(r, c)
      if (src.raw === '' && !src.style) {
        delete activeSheet.value.cells[key]
        continue
      }
      let raw = src.raw
      if (typeof raw === 'string' && raw.startsWith('=')) {
        const srcR = origin.r + (i % cpRows)
        const srcC = origin.c + (j % cpCols)
        raw = '=' + shiftFormula(raw.slice(1), r - srcR, c - srcC)
      }
      activeSheet.value.cells[key] = { raw, style: src.style ? { ...src.style } : undefined }
    }
  }
  emit('update:modelValue', toModelValue())
}

/** 貼上外部文字（從 Excel、網頁複製來的 TSV） */
function pasteText(text: string) {
  const rows = parseTSV(text)
  if (rows.length === 0) return
  const { rs, cs } = getSelectionRange()
  pushUndo()
  for (let i = 0; i < rows.length; i++) {
    for (let j = 0; j < rows[i].length; j++) {
      const r = rs + i
      const c = cs + j
      if (r > props.rowCount || c > props.colCount) continue
      const key = cellRef(r, c)
      const v = rows[i][j]
      // 區塊內的空白格清空目標格內容，但保留格式（與 Excel 貼上純文字相同）
      if (v === '') {
        const existing = activeSheet.value.cells[key]
        if (existing?.style) activeSheet.value.cells[key] = { style: existing.style }
        else delete activeSheet.value.cells[key]
      } else {
        activeSheet.value.cells[key] = { ...(activeSheet.value.cells[key] || {}), raw: v }
      }
    }
  }
  emit('update:modelValue', toModelValue())
}

/**
 * 原生 paste 事件（Ctrl+V / 右鍵貼上 / 選單貼上都會走這裡）。
 *
 * ⚠️ 原本 handleKeydown 在 Ctrl+V 時 preventDefault()，
 *    這會讓瀏覽器根本不觸發 paste 事件 —— 真實 Chromium 實測 paste 事件 0 次，
 *    從 Excel 複製過來按 Ctrl+V 完全沒反應。這支 handler 雖然一直存在，
 *    卻從來沒被鍵盤觸發過。
 */
function pasteFromSystem(e: ClipboardEvent) {
  // 貼進公式列或儲存格編輯器時交給瀏覽器，不要順便貼進網格
  if (isTextInputTarget(e) || editing.value) return
  if (!props.editable) return
  const text = e.clipboardData?.getData('text/plain') ?? ''
  e.preventDefault()
  if (clipboard.value && text === clipboard.value.text) {
    pasteInternal()
  } else if (text) {
    pasteText(text)
  }
}

/** 工具列的「貼上」按鈕：讀不到系統剪貼簿時退回內部剪貼簿 */
async function pasteSelection() {
  if (!props.editable) return
  try {
    const text = navigator.clipboard ? await navigator.clipboard.readText() : ''
    if (text && (!clipboard.value || text !== clipboard.value.text)) {
      pasteText(text)
      return
    }
  } catch {
    // 沒有讀取權限：用內部剪貼簿
  }
  pasteInternal()
}

// ===== 插入 / 刪除列欄 =====
/**
 * 插入 / 刪除列欄都走 applyStructuralChange（見 sheetOps.ts）。
 *
 * ⚠️ 原本四個函式各自只搬動儲存格的 key，公式、合併、列高欄寬、
 *    凍結窗格全部留在原地 —— A3 的 =A1+A2 在上方插入一列後
 *    從 30 默默變成 10（已在真實瀏覽器重現）。
 *
 * 與 Excel 相同：選取幾列就插入 / 刪除幾列，不再固定只動一列。
 */
function applyChange(axis: 'row' | 'col', mode: 'insert' | 'delete') {
  if (!props.editable) return
  const { rs, re, cs, ce } = getSelectionRange()
  const at = axis === 'row' ? rs : cs
  const span = axis === 'row' ? re - rs + 1 : ce - cs + 1
  pushUndo()
  const next = applyStructuralChange(activeSheet.value, {
    axis,
    at,
    count: mode === 'insert' ? span : -span,
  })
  const sheet = activeSheet.value
  sheet.cells = next.cells
  sheet.rowHeights = next.rowHeights
  sheet.colWidths = next.colWidths
  sheet.merges = next.merges
  sheet.freezeRows = next.freezeRows
  sheet.freezeCols = next.freezeCols

  // 刪除後游標留在原位置（Excel 行為），但不能超出網格
  if (mode === 'delete') {
    const r = Math.min(activeR.value, props.rowCount)
    const c = Math.min(activeC.value, props.colCount)
    setActive(axis === 'row' ? Math.min(rs, props.rowCount) : r, axis === 'col' ? Math.min(cs, props.colCount) : c)
  }
  emit('update:modelValue', toModelValue())
}

function insertRow() {
  applyChange('row', 'insert')
}

function deleteRow() {
  applyChange('row', 'delete')
}

function insertColumn() {
  applyChange('col', 'insert')
}

function deleteColumn() {
  applyChange('col', 'delete')
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
/** 把範圍擴大到完整涵蓋與它相交的合併範圍（Excel 的選取不會只選到合併格的一部分） */
function expandToMerges(range: { rs: number; re: number; cs: number; ce: number }) {
  let { rs, re, cs, ce } = range
  let changed = true
  while (changed) {
    changed = false
    for (const key in activeSheet.value.merges) {
      const m = activeSheet.value.merges[key]
      const mre = m.r + m.rows - 1
      const mce = m.c + m.cols - 1
      const intersects = m.r <= re && mre >= rs && m.c <= ce && mce >= cs
      if (!intersects) continue
      if (m.r < rs || mre > re || m.c < cs || mce > ce) {
        rs = Math.min(rs, m.r)
        re = Math.max(re, mre)
        cs = Math.min(cs, m.c)
        ce = Math.max(ce, mce)
        changed = true
      }
    }
  }
  return { rs, re, cs, ce }
}

/**
 * 「合併儲存格」按鈕（Excel 的「跨欄置中」切換）：
 *   - 作用中儲存格在合併範圍內 → 取消選取範圍內的所有合併
 *   - 否則把選取範圍合併成一格；範圍內原有的合併併入新的合併
 *
 * 合併只保留一個值：左上角那格；左上角是空的就取第一個有值的格子（由左到右、由上到下），
 * 移到左上角。其餘格子的內容與格式清掉 —— 與 Excel 一致。
 *
 * ⚠️ 原本合併時其他格子的值原封不動留在 cells 裡：畫面上看不到，
 *    但 SUM 照樣算進去、匯出也照樣寫出，取消合併後又冒出來。
 */
function toggleMerge() {
  if (!props.editable) return
  const merges = activeSheet.value.merges
  const range = expandToMerges(getSelectionRange())
  const within = (m: MergeRange) =>
    m.r >= range.rs && m.r + m.rows - 1 <= range.re && m.c >= range.cs && m.c + m.cols - 1 <= range.ce

  if (mergeContaining(activeR.value, activeC.value)) {
    pushUndo()
    for (const key of Object.keys(merges)) {
      if (within(merges[key])) delete merges[key]
    }
    emit('update:modelValue', toModelValue())
    return
  }

  if (range.rs === range.re && range.cs === range.ce) return

  pushUndo()
  const cells = activeSheet.value.cells
  const originKey = cellRef(range.rs, range.cs)
  let kept: CellData['raw'] | undefined
  for (let r = range.rs; r <= range.re && kept === undefined; r++) {
    for (let c = range.cs; c <= range.ce; c++) {
      const raw = cells[cellRef(r, c)]?.raw
      if (raw !== undefined && raw !== '') {
        kept = raw
        break
      }
    }
  }
  for (let r = range.rs; r <= range.re; r++) {
    for (let c = range.cs; c <= range.ce; c++) {
      const key = cellRef(r, c)
      if (key !== originKey) delete cells[key]
    }
  }
  if (kept !== undefined) cells[originKey] = { ...cells[originKey], raw: kept }

  for (const key of Object.keys(merges)) {
    if (within(merges[key])) delete merges[key]
  }
  merges[originKey] = { r: range.rs, c: range.cs, rows: range.re - range.rs + 1, cols: range.ce - range.cs + 1 }

  selection.startR = range.rs
  selection.startC = range.cs
  selection.endR = range.re
  selection.endC = range.ce
  activeR.value = range.rs
  activeC.value = range.cs
  emit('update:modelValue', toModelValue())
}

// ===== 排序 =====
/**
 * 依作用中儲存格所在的那一欄排序選取範圍內的列（Excel「從 A 到 Z 排序」）。
 *
 * ⚠️ 原本的三個問題：
 *   1. Number('') 是 0 —— 空白格被當成 0，排在正負數之間（見 values.ts）
 *   2. 排序鍵固定是選取範圍的第一欄；Excel 用的是作用中儲存格那一欄
 *   3. 整列搬家時公式原封不動：C2 的 =A2*B2 搬到第 5 列還是 =A2*B2，
 *      算的是別人那一列的資料。Excel 會把相對參照當成「複製到新位置」改寫。
 */
function sortRange(direction: 'asc' | 'desc' = 'asc') {
  if (!props.editable) return
  const { rs, re, cs, ce } = getSelectionRange()
  if (re - rs < 1) return
  // 範圍內有合併格時 Excel 拒絕排序（被蓋住的格子會被搬到合併範圍外）
  for (const key in activeSheet.value.merges) {
    const m = activeSheet.value.merges[key]
    if (m.r <= re && m.r + m.rows - 1 >= rs && m.c <= ce && m.c + m.cols - 1 >= cs) return
  }
  const keyC = activeC.value >= cs && activeC.value <= ce ? activeC.value : cs

  // 排序鍵只算一次（比較函式裡重算公式會是 O(n log n) 次求值）
  const rows = Array.from({ length: re - rs + 1 }, (_, i) => {
    const r = rs + i
    return {
      r,
      key: getCellValue(r, keyC),
      cells: Array.from({ length: ce - cs + 1 }, (_, j) => {
        const cell = getCell(r, cs + j)
        return cell ? { ...cell } : null
      }),
    }
  })
  rows.sort((a, b) => sortCompare(a.key, b.key, direction))
  if (rows.every((row, i) => row.r === rs + i)) return // 已經是這個順序

  pushUndo()
  rows.forEach((row, i) => {
    const r = rs + i
    row.cells.forEach((data, j) => {
      const key = cellRef(r, cs + j)
      if (!data) {
        delete activeSheet.value.cells[key]
        return
      }
      const raw = data.raw
      activeSheet.value.cells[key] =
        typeof raw === 'string' && raw.startsWith('=') && r !== row.r
          ? { ...data, raw: '=' + shiftFormula(raw.slice(1), r - row.r, 0) }
          : data
    })
  })
  emit('update:modelValue', toModelValue())
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
  // 先把編輯中的內容寫回「目前這張」表，再切換（Excel 行為）。
  // ⚠️ 用滑鼠點頁籤時輸入框會先 blur 而自動提交，但透過公開 API
  //    switchSheet() 切換時沒有 blur，輸入到一半的內容原本會直接消失
  //    （真實瀏覽器實測：C3 從 TYPED_THEN_API 變成空白）。
  if (editing.value) commitEditing()
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
  reindexHistory(idx)
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
// 工作表 → WorkBook 的轉換在 xlsxExport.ts（純函式，可以對真正的 .xlsx 位元組做往返測試）

async function performExport(): Promise<void> {
  try {
    emit('export-start')
    const wb = buildWorkbook(sheets, props.enableFormula)
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
  const ctrl = e.ctrlKey || e.metaKey
  // Shift+空白鍵選取整列、Ctrl+空白鍵選取整欄（要在「打字開始編輯」之前判斷）
  if (e.key === ' ' && (e.shiftKey || ctrl) && !(e.shiftKey && ctrl)) {
    e.preventDefault()
    if (e.shiftKey) selectRow(activeR.value)
    else selectColumn(activeC.value)
    return
  }
  // 一般字元 / 數字：直接開始編輯 active 儲存格
  if (e.key.length === 1 && !ctrl && !e.altKey) {
    e.preventDefault()
    startEditing(activeR.value, activeC.value, e.key)
    return
  }
  if (navigate(e)) {
    e.preventDefault()
    return
  }
  if (ctrl) {
    const k = e.key.toLowerCase()
    if (k === 'z') {
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    } else if (k === 'y') {
      e.preventDefault()
      redo()
    } else if (k === 'c' || k === 'x' || k === 'v') {
      // 不要 preventDefault：讓瀏覽器觸發原生 copy / cut / paste 事件，
      // 由 onCopy / onCut / pasteFromSystem 處理（才讀寫得到系統剪貼簿）
      return
    } else if (k === 'a') {
      e.preventDefault()
      selectAll()
    } else if (k === 'd') {
      e.preventDefault()
      fillFromEdge('row')
    } else if (k === 'r') {
      e.preventDefault()
      fillFromEdge('col')
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
    case 'Tab':
      e.preventDefault()
      moveTab(e.shiftKey ? -1 : 1)
      break
    case 'Enter':
      e.preventDefault()
      moveEnter(e.shiftKey ? -1 : 1)
      break
    case 'Delete':
      e.preventDefault()
      clearSelection()
      break
    case 'Backspace':
      // Excel：Backspace 只清掉作用中那一格並進入輸入模式（Delete 才是清除整個選取範圍）
      e.preventDefault()
      startEditing(activeR.value, activeC.value, '')
      break
    case 'F2':
      e.preventDefault()
      startEditing(activeR.value, activeC.value)
      break
  }
}

/**
 * 清除一個範圍。
 *
 * keepStyle: true  → 只清內容、保留格式（Delete 鍵；Excel 的「清除內容」）
 * keepStyle: false → 內容與格式一起清（剪下）
 *
 * ⚠️ 原本 Delete 鍵連格式一起刪掉，與 Excel 不同：在 Excel 裡設好粗體與底色的
 *    表頭，按 Delete 清掉文字後重新輸入，格式應該還在。
 */
function clearRange(
  range: { rs: number; re: number; cs: number; ce: number },
  { keepStyle }: { keepStyle: boolean }
) {
  if (!props.editable) return
  pushUndo()
  for (let r = range.rs; r <= range.re; r++) {
    for (let c = range.cs; c <= range.ce; c++) {
      const key = cellRef(r, c)
      const style = activeSheet.value.cells[key]?.style
      if (keepStyle && style) activeSheet.value.cells[key] = { style }
      else delete activeSheet.value.cells[key]
    }
  }
  emit('update:modelValue', toModelValue())
}

function clearSelection() {
  clearRange(getSelectionRange(), { keepStyle: true })
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
  /* Excel 的填充控點是綠色；外圈用背景色隔開，深色模式下才不會是一圈白邊 */
  background: rgb(var(--t-success-solid));
  border: 1px solid rgb(var(--t-surface-primary));
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