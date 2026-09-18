<template>
  <div class="inline-block">
    <!-- 匯出按鈕 -->
    <button type="button"
      @click="handleExport"
      :disabled="isExporting || !hasData"
      :class="buttonClasses"
      :title="!hasData ? '沒有資料可匯出' : '匯出 Excel 檔案'"
    >
      <!-- 載入動畫 -->
      <svg
        v-if="isExporting"
        class="animate-spin mr-1.5"
        :class="iconSizes[props.size]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>

      <!-- Excel 圖標 -->
      <svg
        v-else
        class="mr-1.5 transition-colors duration-200"
        :class="iconSizes[props.size]"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12.9,14.5L15.8,19H14L12,15.6L10,19H8.2L11.1,14.5L8.2,10H10L12,13.4L14,10H15.8L12.9,14.5Z" />
      </svg>

      <span>{{ isExporting ? '匯出中...' : props.buttonLabel }}</span>
    </button>

    <!-- 使用 ChptModal（window 模式） -->
    <ChptModal
      v-model="showOptionsModal"
      title="Excel 匯出設定"
      :width="500"
      :height="600"
      mode="window"
    >
      <template #title>
        <div class="flex items-center">
          <i class="fas fa-file-excel text-success mr-2"></i>
          Excel 匯出設定
        </div>
      </template>

      <!-- 檔案名稱設定 -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-content-primary mb-2">
          <i class="fas fa-file-signature text-content-tertiary mr-1"></i>
          檔案名稱
        </label>
        <input
          v-model="exportOptions.filename"
          type="text"
          class="w-full px-3 py-2 border border-stroke-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-success focus:border-success transition-all duration-200"
          placeholder="輸入檔案名稱..."
        />
      </div>

      <!-- 工作表名稱設定 -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-content-primary mb-2">
          <i class="fas fa-table text-content-tertiary mr-1"></i>
          工作表名稱
        </label>
        <input
          v-model="exportOptions.sheetName"
          type="text"
          class="w-full px-3 py-2 border border-stroke-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-success focus:border-success transition-all duration-200"
          placeholder="輸入工作表名稱..."
        />
      </div>

      <!-- 欄位選擇 -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-content-primary mb-2">
          <i class="fas fa-columns text-content-tertiary mr-1"></i>
          匯出欄位
        </label>
        <div class="space-y-2 max-h-40 overflow-y-auto border border-stroke-light rounded-lg p-3 bg-surface-secondary">
          <div class="flex items-center justify-between mb-2 pb-2 border-b border-stroke-light">
            <button type="button"
              @click="toggleAllColumns"
              class="text-xs text-success hover:text-success font-medium transition-colors duration-200"
            >
              <i :class="['fas mr-1', allColumnsSelected ? 'fa-check-square' : 'fa-square']"></i>
              {{ allColumnsSelected ? '取消全選' : '全選' }}
            </button>
            <span class="text-xs text-content-tertiary">
              已選 {{ exportOptions.selectedColumns.length }} / {{ availableColumns.length }}
            </span>
          </div>
          <label
            v-for="column in availableColumns"
            :key="column.key"
            class="flex items-center space-x-2 text-sm cursor-pointer hover:bg-success-subtle p-2 rounded transition-colors duration-200"
          >
            <input
              type="checkbox"
              v-model="exportOptions.selectedColumns"
              :value="column.key"
              class="rounded border-stroke-default text-success focus:ring-success transition-colors duration-200"
            />
            <span class="text-content-primary">{{ column.title }}</span>
          </label>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <button type="button"
            @click="showOptionsModal = false"
            class="inline-flex items-center h-control-sm px-4 text-sm font-medium text-content-primary bg-surface-primary border border-stroke-default rounded-lg hover:bg-surface-secondary hover:border-stroke-medium transition-all duration-200 shadow-sm"
          >
            取消
          </button>
          <button type="button"
            @click="confirmExport"
            :disabled="exportOptions.selectedColumns.length === 0"
            class="inline-flex items-center h-control-sm px-4 text-sm font-medium bg-success-solid hover:bg-success-solid text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow disabled:bg-surface-muted disabled:text-content-tertiary disabled:cursor-not-allowed disabled:border-stroke-default border border-transparent"
          >
            確認匯出
          </button>
        </div>
      </template>
    </ChptModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import * as XLSX from 'xlsx-js-style'
import ChptModal from '@/components/library/ui/ChptModal.vue'

/**
 * ChptExcelExporter（CHPT 主題）- 匯出 Excel
 *
 * 整合原 ExcelExporter：
 * - 完整 Props / Emits 型別定義
 * - 使用 ChptModal（window 模式）提供匯出選項
 * - 支援欄位選擇、工作表命名、儲存格樣式
 */

type ExporterSize = 'xs' | 'sm' | 'md' | 'lg'
type ExporterVariant = 'green' | 'blue' | 'primary' | 'outline' | 'soft'

interface ExporterColumn {
  key: string
  title?: string
}

interface ExporterCellStyle {
  row: number
  col: string
  style: object
}

interface ChptExcelExporterProps {
  /** 格式化後要匯出的資料 */
  data?: Record<string, unknown>[]
  /** 原始資料（用於補值判斷） */
  rawData?: Record<string, unknown>[]
  /** 欄位配置 */
  columns?: ExporterColumn[]
  /** 預設檔案名稱 */
  defaultFilename?: string
  /** 預設工作表名稱 */
  defaultSheetName?: string
  /** 是否顯示匯出選項 */
  showOptions?: boolean
  /** 按鈕尺寸 */
  size?: ExporterSize
  /** 按鈕樣式變體 */
  variant?: ExporterVariant
  /** 按鈕文字 */
  buttonLabel?: string
  /** 自訂按鈕 class */
  buttonClass?: string
  /** 儲存格樣式配置 */
  cellStyles?: ExporterCellStyle[]
}

const props = withDefaults(defineProps<ChptExcelExporterProps>(), {
  data: () => [],
  rawData: () => [],
  columns: () => [],
  defaultFilename: 'WIP_Report',
  defaultSheetName: 'WIP_Data',
  showOptions: false,
  size: 'sm',
  variant: 'green',
  buttonLabel: '匯出 Excel',
  buttonClass: '',
  cellStyles: () => [],
})

const emit = defineEmits<{
  (e: 'export-start'): void
  (e: 'export-complete', payload: { filename: string; recordCount: number }): void
  (e: 'export-error', error: unknown): void
}>()

const isExporting = ref(false)
const showOptionsModal = ref(false)

/**
 * 尺寸對應的幾何，高度一律取自 design tokens 的 control
 * （xs 24 / sm 32 / md 40 / lg 48px），與 ChptButton 及其他控制項一致。
 *
 * 原本是自己寫一組 padding（py-1.5 + text-xs 只有 28px），全庫掃出 20 種
 * 不同組合，並排時高度對不齊 —— 這就是畫面看起來參差的來源。
 * 高度改由 h-control-* 決定，文字靠 flex 置中，因此不需要 py-*。
 */
const sizeClasses: Record<ExporterSize, string> = {
  xs: 'h-control-xs px-2 text-xs rounded',
  sm: 'h-control-sm px-3 text-sm rounded-md',
  md: 'h-control-md px-4 text-base rounded-lg',
  lg: 'h-control-lg px-6 text-lg rounded-lg',
}

const iconSizes: Record<ExporterSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

const variantClasses: Record<ExporterVariant, string> = {
  green: 'bg-success-solid hover:bg-success-solid text-white border border-transparent hover:shadow',
  blue: 'bg-accent-solid hover:bg-accent-solid-hover text-white border border-transparent hover:shadow',
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent hover:shadow',
  outline: 'bg-surface-primary hover:bg-surface-secondary text-content-primary border border-stroke-default hover:border-stroke-medium',
  soft: 'bg-success-subtle hover:bg-success-subtle-hover text-success border border-success-subtle-border hover:border-success-subtle-border',
}

const disabledClass = 'bg-surface-muted text-content-tertiary border border-stroke-default'

const buttonClasses = computed(() => [
  'group relative flex items-center justify-center font-medium transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed',
  sizeClasses[props.size],
  hasData.value && !isExporting.value ? variantClasses[props.variant] : disabledClass,
  props.buttonClass,
])

const exportOptions = ref<{
  filename: string
  sheetName: string
  selectedColumns: string[]
}>({
  filename: '',
  sheetName: '',
  selectedColumns: [],
})

const availableColumns = computed<ExporterColumn[]>(() => {
  if (props.columns.length > 0) {
    // 補上 title：沒給時以 key 當標題。
    // ⚠️ 原本直接回傳 props.columns，title 為 undefined 的欄位在勾選清單裡
    //    會顯示成空白（樣板是 {{ column.title }}），使用者看不出那是哪一欄；
    //    但匯出的標題列又有 `col.title || col.key` 的後備，兩邊不一致。
    return props.columns
      .filter((col) => col.key)
      .map((col) => ({ key: col.key, title: col.title || col.key }))
  }
  if (props.data.length > 0) {
    return Object.keys(props.data[0]).map((key) => ({
      key,
      title: formatColumnTitle(key),
    }))
  }
  return []
})

const hasData = computed(() => props.data && props.data.length > 0)

const allColumnsSelected = computed(
  () =>
    exportOptions.value.selectedColumns.length === availableColumns.value.length &&
    availableColumns.value.length > 0
)

onMounted(() => {
  initializeExportOptions()
})

watch(
  availableColumns,
  (newColumns, oldColumns) => {
    if (newColumns.length === 0) return
    const newKeys = newColumns.map((col) => col.key)
    if (exportOptions.value.selectedColumns.length === 0) {
      exportOptions.value.selectedColumns = newKeys
      return
    }
    const oldSelectedSet = new Set(exportOptions.value.selectedColumns)
    const updated = newKeys.filter(
      (key) => oldSelectedSet.has(key) || !oldColumns?.some((col) => col.key === key)
    )
    const hasChanged = JSON.stringify(updated) !== JSON.stringify(exportOptions.value.selectedColumns)
    if (hasChanged) exportOptions.value.selectedColumns = updated
  },
  { immediate: true, deep: true }
)

function initializeExportOptions(): void {
  exportOptions.value.filename = props.defaultFilename
  exportOptions.value.sheetName = props.defaultSheetName
  if (availableColumns.value.length > 0) {
    exportOptions.value.selectedColumns = availableColumns.value.map((col) => col.key)
  }
}

function formatColumnTitle(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

function toggleAllColumns(): void {
  exportOptions.value.selectedColumns = allColumnsSelected.value
    ? []
    : availableColumns.value.map((col) => col.key)
}

function handleExport(): void {
  if (!hasData.value) return
  if (exportOptions.value.selectedColumns.length === 0) {
    exportOptions.value.selectedColumns = availableColumns.value.map((col) => col.key)
  }
  if (props.showOptions) {
    showOptionsModal.value = true
  } else {
    performExport()
  }
}

function confirmExport(): void {
  showOptionsModal.value = false
  performExport()
}

async function performExport(): Promise<void> {
  if (!hasData.value || exportOptions.value.selectedColumns.length === 0) return
  try {
    isExporting.value = true
    emit('export-start')

    const { exportData, columnMap, orderedHeaders } = prepareExportData()
    const worksheet = XLSX.utils.json_to_sheet(exportData, { header: orderedHeaders })
    const workbook = XLSX.utils.book_new()

    const columnWidths = exportOptions.value.selectedColumns.map((colKey) => {
      const column = availableColumns.value.find((col) => col.key === colKey)
      return { wch: getColumnWidth(colKey, column?.title || colKey) }
    })
    worksheet['!cols'] = columnWidths

    if (props.cellStyles && props.cellStyles.length > 0) {
      applyCellStyles(worksheet, props.cellStyles, columnMap)
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, exportOptions.value.sheetName)

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
    const filename = `${exportOptions.value.filename}_${timestamp}.xlsx`

    try {
      const wbout = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
        cellStyles: true,
      })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      XLSX.writeFile(workbook, filename)
    }

    emit('export-complete', { filename, recordCount: exportData.length })
  } catch (error) {
    emit('export-error', error)
  } finally {
    isExporting.value = false
  }
}

function prepareExportData(): {
  exportData: Record<string, unknown>[]
  columnMap: Record<string, string>
  orderedHeaders: string[]
} {
  const selectedCols = exportOptions.value.selectedColumns
  const selectedSet = new Set(selectedCols)
  const columnMap: Record<string, string> = {}
  const orderedHeaders: string[] = []
  const orderedKeys: string[] = []

  availableColumns.value.forEach((col) => {
    if (selectedSet.has(col.key)) {
      columnMap[col.key] = col.title || col.key
      orderedHeaders.push(col.title || col.key)
      orderedKeys.push(col.key)
    }
  })

  const exportData = props.data.map((item) => {
    const exportItem: Record<string, unknown> = {}
    orderedKeys.forEach((colKey) => {
      // ⚠️ 原本是 `item[colKey] || ''`：0 與 false 都是 falsy，會被換成空字串。
      //    數量欄位（unit_qty / pnp_qty）填 0 是很正常的資料，匯出後卻變成
      //    空白格 —— 那是靜默的資料遺失。只有 null / undefined 該補空字串。
      exportItem[columnMap[colKey]] = item[colKey] ?? ''
    })
    return exportItem
  })

  return { exportData, columnMap, orderedHeaders }
}

function getColumnWidth(key: string, title: string): number {
  const widthMap: Record<string, number> = {
    part_number: 15,
    lot_number: 18,
    prod_class: 20,
    device: 20,
    change_time: 20,
    lot_type: 15,
    lamination: 12,
    pnp_qty: 10,
    unit_qty: 10,
    curr_proc: 12,
    group_code: 12,
    status: 15,
    section: 12,
  }
  return widthMap[key] || Math.max(title.length + 2, 10)
}

function applyCellStyles(
  worksheet: XLSX.WorkSheet,
  cellStyles: ExporterCellStyle[],
  columnMap: Record<string, string>
): void {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
  const headerRowMap: Record<string, number> = {}
  for (let col = 0; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col })
    const headerValue = worksheet[cellRef]?.v
    if (headerValue !== undefined) headerRowMap[String(headerValue)] = col
  }

  cellStyles.forEach((styleConfig) => {
    const colTitle = columnMap[styleConfig.col]
    if (!colTitle) return
    const actualCol = headerRowMap[colTitle]
    if (actualCol === undefined) return
    const cellRef = XLSX.utils.encode_cell({ r: styleConfig.row + 1, c: actualCol })
    if (worksheet[cellRef]) {
      worksheet[cellRef].s = styleConfig.style
    }
  })
}

defineExpose({
  exportExcel: performExport,
  showExportOptions: () => {
    showOptionsModal.value = true
  },
})
</script>
