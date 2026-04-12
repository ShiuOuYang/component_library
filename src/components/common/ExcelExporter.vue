<template>
  <div class="inline-block">
    <!-- 匯出按鈕 -->
    <button
      @click="handleExport"
      :disabled="isExporting || !hasData"
      :class="buttonClasses"
      :title="!hasData ? '沒有資料可匯出' : '匯出 Excel 檔案'"
    >
      <!-- 載入動畫 -->
      <svg 
        v-if="isExporting" 
        class="animate-spin mr-1.5"
        :class="iconSizes[size]"
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
        :class="iconSizes[size]"
        fill="currentColor" 
        viewBox="0 0 24 24"
      >
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12.9,14.5L15.8,19H14L12,15.6L10,19H8.2L11.1,14.5L8.2,10H10L12,13.4L14,10H15.8L12.9,14.5Z" />
      </svg>
      
      <span>{{ isExporting ? "匯出中..." : buttonLabel }}</span>
    </button>

    <!-- 使用 DraggableModal 組件 -->
    <DraggableModal
      v-model="showOptionsModal"
      title="Excel 匯出設定"
      :width="500"
      :height="600"
      :resizable="false"
      :maximizable="false"
      :z-index="10000"
      @close="showOptionsModal = false"
    >
      <template #title>
        <div class="flex items-center">
          <i class="fas fa-file-excel text-green-600 mr-2"></i>
          Excel 匯出設定
        </div>
      </template>

      <!-- 檔案名稱設定 -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          <i class="fas fa-file-signature text-gray-500 mr-1"></i>
          檔案名稱
        </label>
        <input
          v-model="exportOptions.filename"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
          placeholder="輸入檔案名稱..."
        />
      </div>

      <!-- 工作表名稱設定 -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          <i class="fas fa-table text-gray-500 mr-1"></i>
          工作表名稱
        </label>
        <input
          v-model="exportOptions.sheetName"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
          placeholder="輸入工作表名稱..."
        />
      </div>

      <!-- 欄位選擇 -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          <i class="fas fa-columns text-gray-500 mr-1"></i>
          匯出欄位
        </label>
        <div
          class="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50"
        >
          <div class="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
            <button
              @click="toggleAllColumns"
              class="text-xs text-green-600 hover:text-green-700 font-medium transition-colors duration-200"
            >
              <i :class="['fas mr-1', allColumnsSelected ? 'fa-check-square' : 'fa-square']"></i>
              {{ allColumnsSelected ? "取消全選" : "全選" }}
            </button>
            <span class="text-xs text-gray-500">
              已選 {{ exportOptions.selectedColumns.length }} / {{ availableColumns.length }}
            </span>
          </div>
          <label
            v-for="column in availableColumns"
            :key="column.key"
            class="flex items-center space-x-2 text-sm cursor-pointer hover:bg-green-50 p-2 rounded transition-colors duration-200"
          >
            <input
              type="checkbox"
              v-model="exportOptions.selectedColumns"
              :value="column.key"
              class="rounded border-gray-300 text-green-600 focus:ring-green-500 transition-colors duration-200"
            />
            <span class="text-gray-700">{{ column.title }}</span>
          </label>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <button
            @click="showOptionsModal = false"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
          >
            取消
          </button>
          <button
            @click="confirmExport"
            :disabled="exportOptions.selectedColumns.length === 0"
            class="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-300 border border-transparent"
          >
            確認匯出
          </button>
        </div>
      </template>
    </DraggableModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import * as XLSX from "xlsx-js-style";
import DraggableModal from "./DraggableModal.vue";

const props = defineProps({
  // 要匯出的資料（格式化後）
  data: {
    type: Array,
    default: () => [],
  },
  // 原始資料（用於判斷補值）
  rawData: {
    type: Array,
    default: () => [],
  },
  // 欄位配置
  columns: {
    type: Array,
    default: () => [],
  },
  // 預設檔案名稱
  defaultFilename: {
    type: String,
    default: "WIP_Report",
  },
  // 預設工作表名稱
  defaultSheetName: {
    type: String,
    default: "WIP_Data",
  },
  // 是否顯示匯出選項
  showOptions: {
    type: Boolean,
    default: false,
  },
  // 按鈕尺寸
  size: {
    type: String,
    default: 'sm',
    validator: (value) => ['xs', 'sm', 'md', 'lg'].includes(value)
  },
  // 按鈕樣式變體
  variant: {
    type: String,
    default: 'green',
    validator: (value) => ['green', 'blue', 'primary', 'outline', 'soft'].includes(value)
  },
  // 按鈕文字
  buttonLabel: {
    type: String,
    default: '匯出 Excel'
  },
  // 自定義按鈕類別
  buttonClass: {
    type: String,
    default: ''
  },
  // 儲存格樣式配置 { row: number, col: string (key), style: object }
  cellStyles: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["export-start", "export-complete", "export-error"]);

// 響應式狀態
const isExporting = ref(false);
const showOptionsModal = ref(false);

// 尺寸樣式配置
const sizeClasses = {
  xs: 'px-2 py-1 text-xs rounded',
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-lg'
};

// 圖標尺寸配置
const iconSizes = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5'
};

// 樣式變體配置
const variantClasses = {
  green: 'bg-green-600 hover:bg-green-700 text-white border border-transparent hover:shadow',
  blue: 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent hover:shadow',
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent hover:shadow',
  outline: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400',
  soft: 'bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 hover:border-green-300'
};

// 禁用狀態樣式
const disabledClass = 'bg-gray-300 text-gray-500 border border-gray-300';

// 計算按鈕類別
const buttonClasses = computed(() => [
  'group relative flex items-center justify-center font-medium transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed',
  sizeClasses[props.size],
  (hasData.value && !isExporting.value) ? variantClasses[props.variant] : disabledClass,
  props.buttonClass
]);

// 匯出選項
const exportOptions = ref({
  filename: "",
  sheetName: "",
  selectedColumns: [],
});

// 可用欄位列表
const availableColumns = computed(() => {
  if (props.columns.length > 0) {
    console.log('📊 ExcelExporter availableColumns - props.columns FB 順序:', 
      props.columns.filter(c => c.key.includes('FB')).map(c => c.key))
    return props.columns.filter((col) => col.key); // 只顯示有 key 的欄位
  }

  // 如果沒有提供欄位配置，從資料中自動產生
  if (props.data.length > 0) {
    const firstItem = props.data[0];
    const keys = Object.keys(firstItem);
    return keys.map((key) => ({
      key,
      title: formatColumnTitle(key), // 自動格式化標題
    }));
  }

  return [];
});

// 檢查是否有資料可匯出
const hasData = computed(() => {
  return props.data && props.data.length > 0;
});

// 檢查是否全選欄位
const allColumnsSelected = computed(() => {
  return (
    exportOptions.value.selectedColumns.length ===
      availableColumns.value.length && availableColumns.value.length > 0
  );
});

// 初始化設定
onMounted(() => {
  initializeExportOptions();
});

// 監聽 availableColumns 變化，當欄位變化時同步更新 selectedColumns
watch(
  availableColumns,
  (newColumns, oldColumns) => {
    if (newColumns.length === 0) return;
    
    const newKeys = newColumns.map(col => col.key);
    const oldSelectedKeys = exportOptions.value.selectedColumns;
    
    // 如果是首次初始化（selectedColumns 為空），全選所有欄位
    if (oldSelectedKeys.length === 0) {
      exportOptions.value.selectedColumns = newKeys;
      return;
    }
    
    // 如果欄位有變化，智能更新 selectedColumns
    // 重要：保持 newKeys 的順序（即 availableColumns/columns prop 的順序）
    const oldSelectedSet = new Set(oldSelectedKeys);
    const updatedSelectedKeys = newKeys.filter(key => {
      // 保留已選的欄位 + 自動添加新欄位
      return oldSelectedSet.has(key) || !oldColumns?.some(col => col.key === key);
    });
    
    // 比較時不使用 sort，直接比較陣列內容
    const hasChanged = JSON.stringify(updatedSelectedKeys) !== JSON.stringify(oldSelectedKeys);
    if (hasChanged) {
      exportOptions.value.selectedColumns = updatedSelectedKeys;
    }
  },
  { immediate: true, deep: true }
);

// 初始化匯出選項
function initializeExportOptions() {
  exportOptions.value.filename = props.defaultFilename;
  exportOptions.value.sheetName = props.defaultSheetName;

  // 如果有可用欄位，預設全選
  if (availableColumns.value.length > 0) {
    exportOptions.value.selectedColumns = availableColumns.value.map(
      (col) => col.key
    );
  }
}

// 格式化欄位標題
function formatColumnTitle(key) {
  const titleMap = {
    // 保持空的對應表，讓系統自動格式化
  };

  // 將英文欄位名稱轉換成較友善的格式
  return (
    titleMap[key] ||
    key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

// 切換全選狀態
function toggleAllColumns() {
  if (allColumnsSelected.value) {
    exportOptions.value.selectedColumns = [];
  } else {
    exportOptions.value.selectedColumns = availableColumns.value.map(
      (col) => col.key
    );
  }
}

// 處理匯出按鈕點擊
function handleExport() {
  if (!hasData.value) return;

  // 確保有選中的欄位，如果沒有則預設全選
  if (exportOptions.value.selectedColumns.length === 0) {
    exportOptions.value.selectedColumns = availableColumns.value.map(
      (col) => col.key
    );
  }

  if (props.showOptions) {
    showOptionsModal.value = true;
  } else {
    performExport();
  }
}

// 確認匯出
function confirmExport() {
  showOptionsModal.value = false;
  performExport();
}

// 執行匯出
async function performExport() {
  if (!hasData.value || exportOptions.value.selectedColumns.length === 0)
    return;

  try {
    isExporting.value = true;
    emit("export-start");

    // 準備匯出資料
    const { exportData, columnMap, orderedHeaders } = prepareExportData();

    // 建立工作簿（明確指定列順序，避免 Object.keys() 的排序問題）
    const worksheet = XLSX.utils.json_to_sheet(exportData, { header: orderedHeaders });
    const workbook = XLSX.utils.book_new();

    // 設定欄寬
    const columnWidths = exportOptions.value.selectedColumns.map((colKey) => {
      const column = availableColumns.value.find((col) => col.key === colKey);
      return { wch: getColumnWidth(colKey, column?.title || colKey) };
    });
    worksheet["!cols"] = columnWidths;

    // 套用自定義儲存格樣式
    if (props.cellStyles && props.cellStyles.length > 0) {
      applyCellStyles(worksheet, props.cellStyles, columnMap);
    }

    // 添加工作表
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      exportOptions.value.sheetName
    );

    // 產生檔案名稱
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:-]/g, "");
    const filename = `${exportOptions.value.filename}_${timestamp}.xlsx`;

    // 匯出檔案（使用支援樣式的方法）
    try {
      // 使用 write 產生 buffer，然後創建 Blob 下載
      const wbout = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'array',
        cellStyles: true  // 啟用儲存格樣式
      });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      
      // 創建下載連結
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (writeError) {
      console.error('寫入檔案時發生錯誤:', writeError);
      // 降級使用原始方法
      XLSX.writeFile(workbook, filename);
    }

    emit("export-complete", { filename, recordCount: exportData.length });
  } catch (error) {
    console.error("Excel 匯出失敗:", error);
    emit("export-error", error);
  } finally {
    isExporting.value = false;
  }
}

// 準備匯出資料
function prepareExportData() {
  const selectedCols = exportOptions.value.selectedColumns;
  const selectedSet = new Set(selectedCols);
  const columnMap = {};
  const orderedHeaders = []; // 明確的列順序
  const orderedKeys = []; // 按順序的 key 列表

  // 重要：按照 availableColumns 的順序（這是從 columns prop 傳入的正確順序）
  availableColumns.value.forEach((col) => {
    if (selectedSet.has(col.key)) {
      columnMap[col.key] = col.title;
      orderedHeaders.push(col.title);
      orderedKeys.push(col.key);
    }
  });

  // 轉換資料格式（按照 orderedKeys 的順序）
  const exportData = props.data.map((item, rowIndex) => {
    const exportItem = {};
    
    orderedKeys.forEach((colKey) => {
      const columnTitle = columnMap[colKey];
      const value = item[colKey];
      exportItem[columnTitle] = value || "";
    });
    return exportItem;
  });

  return { exportData, columnMap, orderedHeaders };
}

// 計算欄位寬度
function getColumnWidth(key, title) {
  const widthMap = {
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
  };

  return widthMap[key] || Math.max(title.length + 2, 10);
}

// 套用儲存格樣式
function applyCellStyles(worksheet, cellStyles, columnMap) {
  if (!cellStyles || cellStyles.length === 0) return;
  
  // 建立工作表列標題到列索引的映射
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  const headerRowMap = {}; // { "標題名稱": 列索引 }
  
  for (let col = 0; col <= range.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    const headerValue = worksheet[cellRef]?.v;
    if (headerValue) {
      headerRowMap[headerValue] = col;
    }
  }
  
  let appliedCount = 0;
  cellStyles.forEach((styleConfig) => {
    const { row, col: colKey, style } = styleConfig;
    const colTitle = columnMap[colKey];
    
    if (!colTitle) return;
    
    const actualCol = headerRowMap[colTitle];
    if (actualCol === undefined) return;
    
    // row 是資料行號（從 0 開始），需要 +1 因為有標題行
    const cellRef = XLSX.utils.encode_cell({ r: row + 1, c: actualCol });
    
    if (worksheet[cellRef]) {
      worksheet[cellRef].s = style;
      appliedCount++;
    }
  });
  
  console.log(`✅ 套用了 ${appliedCount} 個補值樣式`)
}

// 暴露方法給父組件
defineExpose({
  exportExcel: performExport,
  showExportOptions: () => {
    showOptionsModal.value = true;
  },
});
</script>

<style scoped>
/* 自定義樣式補充 */
.export-modal-enter-active,
.export-modal-leave-active {
  transition: opacity 0.3s ease;
}

.export-modal-enter-from,
.export-modal-leave-to {
  opacity: 0;
}
</style>
