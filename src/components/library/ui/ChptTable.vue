<template>
  <div class="w-full font-sans mb-5 flex flex-col" :class="[props.containerBgColor, props.containerRounded, props.containerShadow, props.fontSize]">
    <!-- 搜尋和分頁控制區 -->
    <div class="flex justify-between items-center px-3 py-2 border-b border-neutral-100" :class="props.controlBgColor">
      <div class="flex items-center gap-2.5">
        <!-- 搜尋容器 -->
        <div class="relative flex items-center">
          <input
            type="text"
            v-model="searchQuery"
            :placeholder="searchPlaceholder"
            class="w-48 h-7 px-2.5 border border-neutral-300 rounded text-xs text-neutral-700 bg-white transition-colors shadow-inner focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            @keyup.enter="performSearch"
          />
        </div>
        
        <slot name="left-controls"></slot>
      </div>
      
      <div class="flex items-center gap-2.5">
        <!-- 分頁控制區 (top 或 both 時顯示) -->
        <ChptPagination
          v-if="paginationPosition === 'top' || paginationPosition === 'both'"
          variant="compact"
          :current-page="currentPage"
          :items-per-page="pageSize"
          :total-items="sortedAndFilteredData.length"
          bg-color="bg-neutral-50"
          @update:current-page="handlePageChange"
          @update:items-per-page="handlePageSizeChange"
        />
        
        <slot name="right-controls"></slot>
      </div>
    </div>

    <!-- 表格內容 -->
    <div class="w-full overflow-x-auto mb-0 border-t border-b border-neutral-200">
      <table class="w-full border-collapse text-xs whitespace-nowrap min-w-max">
        <thead>
          <tr>
            <th
              v-for="(column, index) in displayColumns"
              :key="index"
              :style="column.style"
              :class="[
                'bg-gradient-to-b font-medium py-2 px-1.5 text-center border-b border-neutral-300 sticky top-0 z-10 whitespace-nowrap tracking-wide shadow-sm',
                props.headerBgGradient,
                props.headerTextColor,
                {
                  'cursor-pointer select-none relative hover:from-primary-50 hover:to-primary-100': isColumnClickable(column),
                  'from-primary-50 to-primary-100': getColumnSortInfo(column.key) !== null,
                  'text-primary-500': getColumnSortInfo(column.key) !== null
                }
              ]"
              scope="col"
              :aria-sort="ariaSortFor(column)"
              :tabindex="isColumnClickable(column) ? 0 : undefined"
              @click="handleHeaderClick(column)"
              @keydown.enter.prevent="handleHeaderClick(column)"
              @keydown.space.prevent="handleHeaderClick(column)"
            >
              <div class="relative flex items-center justify-center min-h-[28px]">
                <span class="text-center px-4">{{ column.title }}</span>
                
                <!-- 排序圖標 - 使用絕對定位，支援多欄排序顯示 -->
                <span 
                  v-if="isColumnClickable(column)" 
                  aria-hidden="true"
                  class="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-all duration-200"
                  :class="getColumnSortInfo(column.key) !== null ? 'opacity-100' : 'opacity-30 hover:opacity-60'"
                >
                  <!-- 排序優先順序編號（多欄排序時顯示） -->
                  <span
                    v-if="sortColumns.length > 1 && getColumnSortInfo(column.key) !== null"
                    class="text-[9px] leading-none text-primary-500 font-bold min-w-[10px] text-center"
                  >{{ getColumnSortInfo(column.key)!.index + 1 }}</span>
                  <!-- 上下箭頭 -->
                  <span class="flex flex-col items-center gap-0">
                    <span
                      class="text-[10px] leading-none transition-all duration-200"
                      :class="getColumnSortInfo(column.key)?.direction === 'asc' 
                        ? 'text-primary-500 font-bold opacity-100'
                        : 'text-neutral-500'"
                    >▲</span>
                    <span
                      class="text-[10px] leading-none transition-all duration-200"
                      :class="getColumnSortInfo(column.key)?.direction === 'desc' 
                        ? 'text-primary-500 font-bold opacity-100'
                        : 'text-neutral-500'"
                    >▼</span>
                  </span>
                </span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="paginatedData.length === 0">
            <td :colspan="displayColumns.length" class="py-5 text-center text-neutral-500 italic bg-neutral-50">{{ noDataText }}</td>
          </tr>
          <template v-else>
            <slot
              name="table-row"
              v-for="(item, index) in paginatedData"
              :key="index"
              :item="item"
              :index="index + startIndex"
            ></slot>
          </template>
        </tbody>
        <!-- 表格底部 -->
        <tfoot v-if="hasFooterSlot">
          <slot name="footer"></slot>
        </tfoot>
      </table>
    </div>
    
    <!-- 分頁控制區 (下方) -->
    <div v-if="paginationPosition === 'bottom' || paginationPosition === 'both'" class="flex justify-between items-center px-3 py-2 border-t border-neutral-200" :class="props.bottomControlBgColor">
      <div class="flex items-center gap-2.5">
        <slot name="bottom-left-controls"></slot>
      </div>
      
      <div class="flex items-center gap-2.5">
        <ChptPagination
          variant="compact"
          :current-page="currentPage"
          :items-per-page="pageSize"
          :total-items="sortedAndFilteredData.length"
          bg-color="bg-white"
          @update:current-page="handlePageChange"
          @update:items-per-page="handlePageSizeChange"
        />
        
        <slot name="bottom-right-controls"></slot>
      </div>
    </div>

    <!-- 其他模態框或彈出內容的插槽 -->
    <slot name="modals"></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, useSlots, onMounted } from 'vue'
import ChptPagination from './ChptPagination.vue'

// === 型別定義 ===
type DataRow = Record<string, unknown> //=type DataRow = { [key: string]: unknown };

interface Column {
  key?: string
  title: string
  sortable?: boolean
  sortType?: 'string' | 'number' | 'date'
  style?: string | Record<string, string>
}

interface SortItem {
  key: string
  direction: 'asc' | 'desc'
}

interface DefaultSort {
  column: string | null
  direction: 'asc' | 'desc'
}

interface SortEvent {
  // 多欄排序陣列（依照點擊順序）
  sortColumns: SortItem[]
  // 向下相容：第一個排序欄位
  column: string | null
  direction: 'asc' | 'desc'
  columnConfig: Column
  enabledColumns: string[]
}

// === Props ===
const props = withDefaults(defineProps<{
  // 表格數據
  data?: DataRow[]
  // 表格列配置
  columns?: Column[]
  // 搜尋提示文字
  searchPlaceholder?: string
  // 無數據時顯示的文字
  noDataText?: string
  // 默認每頁顯示數量
  defaultPageSize?: number
  // 自訂過濾器函數
  customFilter?: ((data: DataRow[], query: string) => DataRow[]) | null
  // 默認排序欄位
  defaultSort?: DefaultSort
  // 分頁控制項位置: 'top' | 'bottom' | 'both'
  paginationPosition?: 'top' | 'bottom' | 'both'
  // 表格容器背景色
  containerBgColor?: string
  // 表格容器圓角
  containerRounded?: string
  // 表格容器陰影
  containerShadow?: string
  // 表頭背景漸層色
  headerBgGradient?: string
  // 表頭文字顏色
  headerTextColor?: string
  // 偶數行背景色
  evenRowBgColor?: string
  // Hover 行背景色
  hoverRowBgColor?: string
  // 控制列背景色
  controlBgColor?: string
  // 底部控制列背景色
  bottomControlBgColor?: string
  // 字體大小
  fontSize?: string
}>(), {
  data: () => [],
  columns: () => [],
  searchPlaceholder: '輸入關鍵字搜尋...',
  noDataText: '無資料',
  defaultPageSize: 5,
  customFilter: null,
  defaultSort: () => ({ column: null, direction: 'asc' }),
  paginationPosition: 'top',
  containerBgColor: 'bg-white',
  containerRounded: 'rounded-lg',
  containerShadow: 'shadow-sm',
  headerBgGradient: 'from-neutral-50 to-neutral-100',
  headerTextColor: 'text-neutral-600',
  evenRowBgColor: 'rgb(250 250 250)',
  hoverRowBgColor: 'rgb(232 245 239)',
  controlBgColor: 'bg-white',
  bottomControlBgColor: 'bg-neutral-50',
  fontSize: 'text-xs'
})

const emit = defineEmits<{
  'update:page': [page: number]
  'update:pageSize': [pageSize: number]
  'search': [query: string]
  'sort': [info: SortEvent]
}>()

// 獲取插槽信息
const slots = useSlots()
const hasFooterSlot = computed(() => !!slots.footer)

// 搜尋和分頁狀態
const searchQuery = ref<string>('')
const currentPage = ref<number>(1)
const pageSize = ref<number>(props.defaultPageSize)

// 排序狀態 - 支援多欄排序，依照點擊順序決定優先級
const sortColumns = ref<SortItem[]>(
  props.defaultSort.column
    ? [{ key: props.defaultSort.column, direction: props.defaultSort.direction }]
    : []
)

// 向下相容的 computed：取第一個排序欄位
/**
 * 欄位的 aria-sort 值。
 *
 * 原本表頭只有 @click，既沒有 tabindex 也沒有鍵盤事件 —— 排序功能對鍵盤
 * 使用者完全不存在；而排序狀態只靠視覺上的 ▲▼ 表示，螢幕閱讀器讀不到。
 * 注意不要在 <th> 上覆寫 role（例如改成 button），那會破壞表格語意；
 * 讓它維持 columnheader，再以 tabindex + keydown 提供鍵盤操作即可。
 */
function ariaSortFor(column: Column): 'ascending' | 'descending' | 'none' | undefined {
  // 只有可排序的欄位才需要 aria-sort；不可排序的欄位不應出現這個屬性
  if (!isColumnClickable(column)) return undefined
  const info = getColumnSortInfo(column.key)
  if (info === null) return 'none'
  return info.direction === 'asc' ? 'ascending' : 'descending'
}

const sortColumn = computed(() => sortColumns.value.length > 0 ? sortColumns.value[0].key : null)
const sortDirection = computed(() => sortColumns.value.length > 0 ? sortColumns.value[0].direction : 'asc')

// 查詢某欄位在多欄排序中的資訊
function getColumnSortInfo(columnKey: string | undefined): { index: number; direction: 'asc' | 'desc' } | null {
  if (!columnKey) return null
  const idx = sortColumns.value.findIndex(s => s.key === columnKey)
  if (idx === -1) return null
  return { index: idx, direction: sortColumns.value[idx].direction }
}

// 啟用排序的欄位集合 - 初始化時自動啟用所有有 key 的欄位
const enabledSortColumns = ref<Set<string>>(new Set())

// 如果父組件沒有傳 columns，自動從資料第一筆的 key 生成
const displayColumns = computed<Column[]>(() => {
  if (props.columns && props.columns.length > 0) {
    return props.columns
  }
  if (props.data && props.data.length > 0) {
    return Object.keys(props.data[0]).map(key => ({
      key,
      title: key,
      sortable: true
    }))
  }
  return []
})

// 在組件掛載時自動啟用所有可排序的欄位
onMounted(() => {
  displayColumns.value.forEach(column => {
    if (isColumnClickable(column) && column.key) {
      enabledSortColumns.value.add(column.key)
    }
  })
})

// 檢查欄位是否可以點擊排序（有 key 的欄位都可以點擊）
function isColumnClickable(column: Column): boolean {
  // 如果明確設定為 false，則不可點擊
  if (column.sortable === false) {
    return false
  }
  
  // 如果沒有 key，則不可點擊
  if (!column.key) {
    return false
  }
  
  return true
}

// 自動檢測欄位的排序類型
function detectSortType(column: Column, data: DataRow[]): 'string' | 'number' | 'date' {
  // 如果已經指定了排序類型，直接使用
  if (column.sortType) {
    return column.sortType
  }
  
  // 如果沒有數據，返回預設類型
  if (!data || data.length === 0 || !column.key) {
    return 'string'
  }
  
  // 檢查前幾個非空值來判斷類型
  const colKey = column.key as string
  const sampleValues = data
    .slice(0, Math.min(10, data.length))
    .map(item => item[colKey])
    .filter(val => val != null && val !== '')
  
  if (sampleValues.length === 0) {
    return 'string'
  }
  
  // 檢查是否為數字
  const isAllNumbers = sampleValues.every(val => {
    const num = parseFloat(String(val))
    return !isNaN(num) && isFinite(num)
  })
  
  if (isAllNumbers) {
    return 'number'
  }
  
  // 檢查是否為日期
  const isAllDates = sampleValues.every(val => {
    const date = new Date(String(val))
    return date instanceof Date && !isNaN(date.getTime())
  })
  
  if (isAllDates) {
    return 'date'
  }
  
  // 預設為字符串
  return 'string'
}

// 處理表頭點擊 - 支援多欄排序，依照點擊順序決定優先級
function handleHeaderClick(column: Column): void {
  // 1) 守門：不可排序的欄位直接 return
  if (!isColumnClickable(column)) return

  // 2) 找這個欄位是否「已經在排序清單裡」
  const existingIdx = sortColumns.value.findIndex(s => s.key === column.key)

  if (existingIdx !== -1) {
    // 已在清單中
    const current = sortColumns.value[existingIdx]
    if (current.direction === 'asc') {
      // 狀態 asc → 切成 desc
      // console.log(`切換 ${column.key} 的排序方向為 desc`, current, existingIdx)
      sortColumns.value[existingIdx] = { ...current, direction: 'desc' }
    } else {
      // 狀態 desc → 移除這個欄位（不再參與排序）
      sortColumns.value.splice(existingIdx, 1)
    }
  } else {
    // 不在清單中 → 加到「末尾」，方向 asc
    // 末尾 = 優先級最低
    sortColumns.value.push({ key: column.key!, direction: 'asc' })
  }

  // 3) 觸發響應式更新（因為 splice/push 在某些情況下 Vue 追蹤不到）
  sortColumns.value = [...sortColumns.value]
  
  // 4)排序後重置到第一頁
  currentPage.value = 1
  
  // 發出排序事件（向下相容 + 新的多欄排序資訊）
  emit('sort', {
    sortColumns: [...sortColumns.value],
    column: sortColumn.value,
    direction: sortDirection.value,
    columnConfig: column,
    enabledColumns: Array.from(enabledSortColumns.value)
  })
}

// 比較單一欄位的值
function compareValues(a: unknown, b: unknown, sortType: 'string' | 'number' | 'date', direction: 'asc' | 'desc'): number {
  let valueA = a
  let valueB = b
  
  // 處理空值
  if (valueA == null && valueB == null) return 0
  if (valueA == null) return direction === 'asc' ? 1 : -1
  if (valueB == null) return direction === 'asc' ? -1 : 1
  
  // 根據檢測到的類型進行排序
  switch (sortType) {
    case 'number':
      valueA = parseFloat(valueA as string) || 0
      valueB = parseFloat(valueB as string) || 0
      break
    case 'date':
      valueA = new Date(valueA as string)
      valueB = new Date(valueB as string)
      break
    default:
      valueA = String(valueA).toLowerCase()
      valueB = String(valueB).toLowerCase()
  }
  
  let result = 0
  if ((valueA as number | string | Date) < (valueB as number | string | Date)) result = -1
  else if ((valueA as number | string | Date) > (valueB as number | string | Date)) result = 1
  
  return direction === 'desc' ? -result : result
}

// 排序函數 - 支援多欄排序
function sortData(data: DataRow[]): DataRow[] {
  if (sortColumns.value.length === 0 || !data || data.length === 0) {
    return data
  }
  
  // Step 1: 預先解析每個排序欄位的 column config 和 sortType
  const sortConfigs = sortColumns.value
    .map(sc => {
      const col = displayColumns.value.find(c => c.key === sc.key)
      if (!col) return null
      return {
        key: sc.key,
        direction: sc.direction,
        sortType: detectSortType(col, data) // 'string' | 'number' | 'date'
      }
    })
    .filter(Boolean) as { key: string; direction: 'asc' | 'desc'; sortType: 'string' | 'number' | 'date' }[]
  
  if (sortConfigs.length === 0) return data
  
  // Step 2: 用 Array.sort 做多欄排序
  return [...data].sort((a, b) => {
    for (const config of sortConfigs) {
      const result = compareValues(
        a[config.key], b[config.key],
        config.sortType, config.direction
      )
      if (result !== 0) return result  // 這欄分出勝負了，直接回傳
      // result === 0 → 這欄相同，繼續比下一欄
    }
    return 0  // 所有欄都相同
  })
}

// 過濾後的數據
const filteredData = computed(() => {
  if (props.customFilter) {
    return props.customFilter(props.data, searchQuery.value)
  }
  
  if (!searchQuery.value.trim()) {
    return props.data
  }
  
  const query = searchQuery.value.toLowerCase().trim()
  return props.data.filter(item => {
    return Object.values(item).some(val => {
      if (val !== null && val !== undefined) {
        return String(val).toLowerCase().includes(query)
      }
      return false
    })
  })
})

// 排序和過濾後的數據
const sortedAndFilteredData = computed(() => {
  return sortData(filteredData.value)
})

// 計算總頁數
const totalPages = computed(() => {
  return Math.ceil(sortedAndFilteredData.value.length / pageSize.value) || 1
})

// 分頁後的數據
const startIndex = computed(() => (currentPage.value - 1) * pageSize.value)
const endIndex = computed(() => startIndex.value + pageSize.value)

const paginatedData = computed(() => {
  return sortedAndFilteredData.value.slice(startIndex.value, endIndex.value)
})

// 處理頁面變化
function handlePageChange(page: number): void {
  if (page < 1) page = 1
  if (page > totalPages.value) page = totalPages.value
  currentPage.value = page
  
  emit('update:page', currentPage.value)
}

// 處理分頁大小變更
function handlePageSizeChange(size?: number) {
  if (size != null) {
    pageSize.value = size
  }
  if (!pageSize.value || pageSize.value < 1) {
    pageSize.value = 10
  } else if (pageSize.value > 1000) {
    pageSize.value = 1000
  }
  
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value || 1
  }
  
  emit('update:pageSize', pageSize.value)
}

// 執行搜尋
function performSearch() {
  currentPage.value = 1
  emit('search', searchQuery.value)
}

// 監聽表格數據變化，重置到第一頁
watch(() => props.data, () => {
  currentPage.value = 1
}, { deep: true })

// 監聽搜尋查詢變化
watch(searchQuery, (newVal) => {
  if (!newVal) {
    performSearch()
  }
})

// defineExpose - 暴露組件方法和狀態
defineExpose({
  refresh: performSearch,
  resetPage: () => { currentPage.value = 1 },
  resetSort: () => { 
    sortColumns.value = []
  },
  clearEnabledSort: () => {
    enabledSortColumns.value.clear()
  },
  enableColumnSort: (columnKey: string) => {
    enabledSortColumns.value.add(columnKey)
  },
  // 向下相容：設定單一排序（會清除多欄排序）
  setSorting: (column: string | null, direction: 'asc' | 'desc') => {
    sortColumns.value = column ? [{ key: column, direction }] : []
  },
  // 新增：加入多欄排序
  addSort: (column: string, direction: 'asc' | 'desc') => {
    const idx = sortColumns.value.findIndex(s => s.key === column)
    if (idx !== -1) {
      sortColumns.value[idx] = { key: column, direction }
    } else {
      sortColumns.value.push({ key: column, direction })
    }
    sortColumns.value = [...sortColumns.value]
  },
  // 暴露 computed / ref 對象
  filteredData,
  sortedAndFilteredData,
  paginatedData,
  currentPage,
  pageSize,
  totalPages,
  startIndex,
  endIndex,
  sortColumns,
  sortColumn,
  sortDirection,
  enabledSortColumns
})

// 監聽 columns/data 變化，自動啟用新的可排序欄位
watch(displayColumns, (newColumns) => {
  newColumns.forEach(column => {
    if (isColumnClickable(column) && column.key) {
      enabledSortColumns.value.add(column.key)
    }
  })
}, { deep: true, immediate: true })
</script>

<style scoped>
/* 表格行的懸停和交替顏色效果 nth-child(even):套用在偶數行 */
:deep(tbody tr:nth-child(even)) {
  background-color: v-bind('props.evenRowBgColor');
}

:deep(tbody tr:hover) {
  background-color: v-bind('props.hoverRowBgColor');
}

/* 警告行樣式 */
:deep(.warning-row) {
  background-color: rgb(254 242 242) !important;
}

:deep(.warning-row:hover) {
  background-color: rgb(254 226 226) !important;
}

/* 指標未達標的樣式 */
:deep(.below-trigger) {
  color: rgb(239 68 68);
  font-weight: 600;
}

/* 表格單元格樣式 */
:deep(td) {
  padding: 0.375rem;
  text-align: center;
  border-bottom: 1px solid rgb(229 231 235);
  color: rgb(55 65 81);
  transition: background-color 0.2s;
  max-width: 20rem;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}


/* 按鈕容器確保居中 */
:deep(td button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

/* 表格底部樣式 */
:deep(tfoot td) {
  padding: 0.5rem 0;
  text-align: center;
  background-color: rgb(249 250 251);
  font-size: 0.75rem;
  border-top: 1px solid rgb(229 231 235);
}

:deep(tfoot .summary-row) {
  background-color: rgb(249 250 251);
  font-size: 0.875rem;
  padding: 0.625rem 0;
  text-align: center;
}
</style>