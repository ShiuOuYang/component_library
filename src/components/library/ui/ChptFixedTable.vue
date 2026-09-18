<template>
  <div class="relative">
    <slot name="header">
      <div class="flex justify-end" v-if="props.showSearch">
        <input
          type="text"
          v-model="internalSearchText"
          placeholder="Search..."
          class="mb-4 text-sm p-2 border rounded outline-none"
        />
      </div>
    </slot>

    <div class="rounded shadow-sm overflow-hidden">
      <div :style="tableContainerStyle" @scroll="handleScroll">
        <table>
          <thead class="bg-surface-secondary shadow-sm">
            <tr>
              <th
                class="py-[2px] px-[1px] bg-surface-primary border-b border-stroke-light"
                v-for="column of innerColumns"
                :key="column.dataIndex"
                :class="headerStickyClass(column)"
                :style="headerStyle(column)"
              >
                <div
                  class="relative flex items-center justify-center p-1 rounded transition-all duration-200"
                  :class="[column.defaultFixed ? 'bg-accent-subtle' : 'hover:bg-surface-tertiary']"
                  :style="{ width: `${column.width}px` }"
                  @mouseover="mouseoverFixedIcon(column)"
                  @mouseleave="mouseleaveFixedIcon(column)"
                >
                  <div class="flex items-center">
                    <span
                      class="truncate font-normal"
                      :class="[headerFontSizeClass, column.defaultFixed ? 'text-accent font-semibold' : 'text-content-primary']"
                    >
                      {{ column.title }}
                    </span>
                  </div>

                  <!-- 固定/取消固定按鈕 -->
                  <div
                    v-if="props.isKeep"
                    class="absolute right-0 top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    :class="{ 'opacity-100': column.showUnfixedIcon }"
                  >
                    <div
                      v-if="!column.defaultFixed"
                      class="absolute cursor-pointer hover:bg-surface-muted/30 bg-surface-primary rounded-md border flex justify-center items-center right-0 top-0 w-3 h-3 z-50"
                      @click="fixedColumn(column)"
                    >
                      <ChptIcon weight="500" color="neutral-500" size="10">keep</ChptIcon>
                    </div>
                    <div
                      v-else
                      class="absolute cursor-pointer hover:bg-surface-muted/30 bg-surface-primary rounded-md border flex justify-center items-center right-0 top-0 w-3 h-3 z-50"
                      @click="unFixedColumn(column)"
                    >
                      <ChptIcon weight="500" color="neutral-500" size="10">keep_off</ChptIcon>
                    </div>
                  </div>

                  <!-- 篩選按鈕 -->
                  <template v-if="props.isFilter && !hasActiveFilter(column.dataIndex)">
                    <div
                      class="absolute cursor-pointer hover:bg-surface-muted/30 bg-surface-primary rounded-md border flex justify-center items-center right-0 bottom-0 w-3 h-3"
                      @click="clickHandler($event, column)"
                    >
                      <ChptIcon weight="500" color="neutral-500" size="12">arrow_drop_down</ChptIcon>
                    </div>
                  </template>
                  <template v-if="props.isFilter && hasActiveFilter(column.dataIndex)">
                    <div
                      class="absolute cursor-pointer hover:bg-surface-muted/30 bg-surface-primary rounded-md border flex justify-center items-center right-0 bottom-0 w-3 h-3"
                      @click="clickHandler($event, column)"
                    >
                      <ChptIcon weight="300" color="neutral-500" size="12">filter_alt</ChptIcon>
                    </div>
                  </template>
                </div>
              </th>
            </tr>
          </thead>

          <tbody class="sticky top-4" :class="divideClasses">
            <tr v-for="(row, rowIndex) in displayData" :key="rowIndex" class="hover:bg-surface-secondary">
              <td
                v-for="column in innerColumns"
                :key="column.dataIndex"
                class="p-0"
                :class="[column.defaultFixed ? 'sticky left-0 bg-surface-primary z-10' : '', cellFontSizeClass]"
                :style="{
                  width: `${column.width}px`,
                  left: `${getAccumulatedWidthByDataIndex(column)}px`,
                }"
              >
                <slot
                  :name="`td-${column.dataIndex}`"
                  :column="column"
                  :row="row"
                  :row-index="rowIndex"
                >
                  <div class="text-center text-content-primary whitespace-nowrap leading-tight py-0.5">
                    {{ column.format ? column.format(row[column.dataIndex]) : row[column.dataIndex] }}
                  </div>
                </slot>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ChptDataTooltip
      :visible="tooltipInfo.opacity > 0"
      :position="{ x: tooltipInfo.x, y: tooltipInfo.y }"
      :data="{ items: [] }"
      theme="light"
      :show-arrow="false"
      :offset="{ x: 0, y: 0 }"
      max-width="none"
      :interactive="true"
      :auto-adjust-position="true"
      @close="clickHandler($event)"
    >
      <template #default>
        <div class="p-0 text-sm text-content-primary min-w-[200px]">
          <div class="flex items-center justify-end gap-1 mb-1.5">
            <input
              type="text"
              v-model="filterSearchText"
              placeholder="搜尋..."
              class="text-sm p-1 border rounded outline-none flex-1 min-w-0 focus:border-primary-400 focus:ring-1 focus:ring-primary-200 transition-all"
            />
            <button
              type="button"
              title="全選"
              class="p-1 cursor-pointer hover:bg-surface-tertiary rounded transition-all active:scale-90 active:bg-surface-tertiary"
              @click="selectAllHandler"
            >
              <ChptIcon weight="500" size="20" color="neutral-400">done_all</ChptIcon>
            </button>
            <button
              type="button"
              title="關閉"
              class="p-1 cursor-pointer hover:bg-surface-tertiary rounded transition-all active:scale-90 active:bg-surface-tertiary"
              @click="clickHandler($event)"
            >
              <ChptIcon weight="500" size="20" color="neutral-400">close</ChptIcon>
            </button>
          </div>

          <div class="max-h-60 overflow-auto custom-scrollbar">
            <ChptCheckbox
              direction="column"
              bg-color="success"
              v-model="filterColumnValueArray"
              :items="uniqueColumnValueArray"
            ></ChptCheckbox>
          </div>
        </div>
      </template>
    </ChptDataTooltip>

    <!-- 分頁組件 -->
    <ChptPagination
      v-if="props.isPagination"
      v-model:current-page="currentPage"
      v-model:items-per-page="itemsPerPage"
      :total-items="finishedData.length"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { CSSProperties } from 'vue'
import ChptIcon from './ChptIcon.vue'
import ChptCheckbox from './ChptCheckbox.vue'
import ChptPagination from './ChptPagination.vue'
import ChptDataTooltip from './ChptDataTooltip.vue'

/**
 * ChptFixedTable（CHPT 主題）- 固定欄位資料表格元件
 *
 * 原 ChptTable 改名保留。主打欄位固定（keep）與欄位篩選（filter）：
 * - 支援欄位固定（keep）與取消固定
 * - 內建欄位篩選（Filter）與全文搜尋
 * - 支援分頁
 * - 每個欄位可由外部透過 slot（td-<dataIndex>）自訂內容
 */

/** 欄位定義 */
interface ChptFixedTableColumn {
  title: string
  dataIndex: string
  width: number
  defaultFixed?: boolean
  format?: (value: unknown) => string
  showUnfixedIcon?: boolean
}

type ChptFixedTableRow = Record<string, unknown>

interface ChptFixedTableProps {
  /** 是否啟用欄位固定 */
  isKeep?: boolean
  /** 是否啟用欄位篩選 */
  isFilter?: boolean
  /** 已套用篩選的欄位（v-model:filter-columns） */
  filterColumns?: string[]
  /** 是否固定表格（垂直捲動） */
  isFixed?: boolean
  /** 欄位定義 */
  columns?: ChptFixedTableColumn[]
  /** 資料列 */
  data?: ChptFixedTableRow[]
  /** 捲動視口偏移（配合固定 header） */
  viewportOffset?: number | string
  /** 外部控制的已固定欄位（v-model:fixed-columns） */
  fixedColumns?: string[]
  /** 是否顯示搜尋框 */
  showSearch?: boolean
  /** 外部搜尋文字（v-model:search-text） */
  searchText?: string
  /** header 字級 */
  headerFontSize?: string
  /** cell 字級 */
  cellFontSize?: string
  /** 分隔線顏色 */
  divideColor?: string
  /** 分隔線透明度 */
  divideOpacity?: string
  /** 分隔線方向 */
  divideDirection?: 'x' | 'y' | 'xy'
  /** 分隔線粗細 */
  divideSize?: string
  /** 是否啟用分頁 */
  isPagination?: boolean
  /** 預設每頁筆數 */
  defaultPageSize?: number
}

const props = withDefaults(defineProps<ChptFixedTableProps>(), {
  isKeep: true,
  isFilter: true,
  filterColumns: () => [],
  isFixed: true,
  columns: () => [],
  data: () => [],
  viewportOffset: 0,
  fixedColumns: () => [],
  showSearch: true,
  searchText: '',
  headerFontSize: 'sm',
  cellFontSize: 'xs',
  divideColor: 'neutral-200',
  divideOpacity: '100',
  divideDirection: 'y',
  divideSize: '1',
  isPagination: false,
  defaultPageSize: 50,
})

const emit = defineEmits<{
  (e: 'update:fixedColumns', value: string[]): void
  (e: 'update:searchText', value: string): void
  (e: 'update:filterColumns', value: string[]): void
}>()

// ===== 字級 =====
const headerFontSizeClass = computed(() =>
  props.headerFontSize.startsWith('text-') ? props.headerFontSize : `text-${props.headerFontSize}`
)
const cellFontSizeClass = computed(() =>
  props.cellFontSize.startsWith('text-') ? props.cellFontSize : `text-${props.cellFontSize}`
)

// ===== 欄位管理 =====
const innerColumns = ref<ChptFixedTableColumn[]>(props.columns)

// 欄位於原始 columns 中的位置（用於取消固定時的還原）
const tempObj = ref<Record<string, number>>({})
props.columns.forEach((column, index) => {
  tempObj.value[column.dataIndex] = index
})

// ===== fixedColumns 雙向綁定 =====
const fixedColumns = computed({
  get: () => props.fixedColumns,
  set: (value: string[]) => emit('update:fixedColumns', value),
})

// ===== 搜尋 =====
const internalSearchText = ref(props.searchText)

watch(internalSearchText, (value) => {
  emit('update:searchText', value)
})

watch(
  () => props.searchText,
  (value) => {
    if (value !== internalSearchText.value) {
      internalSearchText.value = value
    }
  },
  { immediate: true }
)

// ===== 資料處理（篩選 + 搜尋） =====
const filterState = ref(new Map<string, Array<string | number | boolean>>())

const finishedData = computed<ChptFixedTableRow[]>(() => {
  let result: ChptFixedTableRow[] = [...props.data]

  // 1. 欄位篩選
  if (props.isFilter && filterState.value.size > 0) {
    result = result.filter((item) => {
      for (const [columnKey, selectedValues] of filterState.value.entries()) {
        if (selectedValues.length > 0 && !selectedValues.includes(normalizeCellValue(item[columnKey]))) {
          return false
        }
      }
      return true
    })
  }

  // 2. 全文搜尋
  if (internalSearchText.value) {
    const lower = internalSearchText.value.toLowerCase()
    result = result.filter((item) =>
      Object.values(item).some((value) => String(value).toLowerCase().includes(lower))
    )
  }

  return result
})

// ===== 分頁 =====
const currentPage = ref(1)
const itemsPerPage = ref(props.defaultPageSize)

watch(internalSearchText, () => {
  if (props.isPagination) currentPage.value = 1
})

const displayData = computed<ChptFixedTableRow[]>(() => {
  if (!props.isPagination) return finishedData.value
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return finishedData.value.slice(start, end)
})

// ===== 分隔線樣式 =====
const divideClasses = computed(() => {
  const classes: string[] = []
  const { divideDirection, divideColor, divideOpacity, divideSize } = props
  if (divideDirection === 'x' || divideDirection === 'xy') classes.push('divide-x')
  if (divideDirection === 'y' || divideDirection === 'xy') classes.push('divide-y')
  if (divideColor) classes.push(`divide-${divideColor}`)
  if (divideOpacity && divideOpacity !== '100') classes.push(`divide-opacity-${divideOpacity}`)
  if (divideSize && divideSize !== '1') classes.push(`divide-${divideSize}`)
  return classes
})

// ===== 欄位固定邏輯 =====
function fixedColumn(clickedColumn: ChptFixedTableColumn): void {
  const currentFixed = innerColumns.value.filter((c) => c.defaultFixed)
  const target = innerColumns.value.find((c) => c.dataIndex === clickedColumn.dataIndex)
  if (!target) return
  target.showUnfixedIcon = false
  target.defaultFixed = true

  innerColumns.value = [
    ...currentFixed,
    target,
    ...innerColumns.value.filter(
      (c) => !c.defaultFixed && c.dataIndex !== clickedColumn.dataIndex
    ),
  ]
  fixedColumns.value = getFixedColumnIds()
}

function unFixedColumn(currentColumn: ChptFixedTableColumn): void {
  const target = innerColumns.value.find((c) => c.dataIndex === currentColumn.dataIndex)
  if (target) {
    target.showUnfixedIcon = false
    target.defaultFixed = false
  }

  const unfixed = Object.entries(tempObj.value)
    .sort((a, b) => a[1] - b[1])
    .map(([dataIndex]) => innerColumns.value.find((c) => c.dataIndex === dataIndex))
    .filter((c): c is ChptFixedTableColumn => c !== undefined && !c.defaultFixed)

  innerColumns.value = [...innerColumns.value.filter((c) => c.defaultFixed), ...unfixed]
  fixedColumns.value = getFixedColumnIds()
}

function mouseoverFixedIcon(currentColumn: ChptFixedTableColumn): void {
  const target = innerColumns.value.find((c) => c.dataIndex === currentColumn.dataIndex)
  if (target) target.showUnfixedIcon = true
}

function mouseleaveFixedIcon(currentColumn: ChptFixedTableColumn): void {
  const target = innerColumns.value.find((c) => c.dataIndex === currentColumn.dataIndex)
  if (target) target.showUnfixedIcon = false
}

function getFixedColumnIds(): string[] {
  return innerColumns.value
    .filter((c) => c.defaultFixed)
    .map((c) => c.dataIndex)
}

// 監聽外部 fixedColumns 變化以重排欄位
watch(
  () => fixedColumns.value,
  (newValue) => {
    const newFixed = newValue
      .map((dataIndex) => innerColumns.value.find((c) => c.dataIndex === dataIndex))
      .filter((c): c is ChptFixedTableColumn => Boolean(c))

    const newIds = newValue
    const others = innerColumns.value.filter(
      (c) => !newIds.includes(c.dataIndex) && !c.defaultFixed
    )
    const newlyFixed = innerColumns.value.filter(
      (c) => newIds.includes(c.dataIndex) && !c.defaultFixed
    )
    innerColumns.value = [...newFixed, ...newlyFixed, ...others]
  }
)

// ===== 累積寬度（固定欄位） =====
const accumlatedMap = ref(new Map<string, number>())

watch(
  innerColumns,
  (newVal) => {
    newVal.forEach((column) => {
      accumlatedMap.value.set(column.dataIndex, getAccumulatedWidth(column))
    })
  },
  { immediate: true, deep: true }
)

function getAccumulatedWidth(column: ChptFixedTableColumn): number {
  const currentIndex = innerColumns.value.findIndex(
    (c) => c.dataIndex === column.dataIndex
  )
  if (column.defaultFixed) {
    return innerColumns.value
      .slice(0, currentIndex)
      .filter((c) => c.defaultFixed)
      .reduce((acc, c) => acc + (c.width ?? 0) + 2, 0)
  }
  return 0
}

function getAccumulatedWidthByDataIndex(column: ChptFixedTableColumn): number {
  return accumlatedMap.value.get(column.dataIndex) ?? 0
}

// ===== 捲動方向 =====
type ScrollDirection = '' | 'horizontal' | 'vertical'
const currentScrollDirection = ref<ScrollDirection>('')
const prevScrollLeft = ref(0)
const prevScrollTop = ref(0)

function handleScroll(event: Event): void {
  const target = event.target as HTMLElement
  const { scrollLeft, scrollTop } = target
  if (prevScrollLeft.value !== scrollLeft) currentScrollDirection.value = 'horizontal'
  else if (prevScrollTop.value !== scrollTop) currentScrollDirection.value = 'vertical'
  prevScrollLeft.value = scrollLeft
  prevScrollTop.value = scrollTop
}

const tableContainerStyle = computed<CSSProperties>(() => {
  if (!props.isFixed) return {}
  return {
    maxHeight: `calc(100vh - ${props.viewportOffset}px)`,
    overflowY: 'auto',
  }
})

/** header 固定 class */
function headerStickyClass(column: ChptFixedTableColumn): string[] {
  if (currentScrollDirection.value === 'vertical') {
    return [column.defaultFixed ? 'sticky top-0 bg-surface-primary z-20' : 'sticky top-0 bg-surface-primary z-10']
  }
  if (currentScrollDirection.value === 'horizontal') {
    return [column.defaultFixed ? 'sticky top-0 left-0 bg-surface-primary z-20' : 'sticky top-0 bg-surface-primary z-10']
  }
  return []
}

/** header 樣式 */
function headerStyle(column: ChptFixedTableColumn): CSSProperties {
  return {
    width: `${column.width}px`,
    left: `${getAccumulatedWidthByDataIndex(column)}px`,
  }
}

// ===== 篩選 Tooltip =====
interface TooltipInfo {
  x: number
  y: number
  opacity: number
  column: ChptFixedTableColumn | null
}

const tooltipInfo = ref<TooltipInfo>({ x: 0, y: 0, opacity: 0, column: null })
const uniqueColumnValueArray = ref<ChptRadioItem[]>([])
const filterColumnValueArray = ref<Array<string | number | boolean>>([])
const originalData = ref<ChptFixedTableRow[]>([])
const filterSearchText = ref('')

/** 欄位篩選用的選項。label 必須是 string —— ChptCheckbox 的 items 要求如此 */
interface ChptRadioItem {
  label: string
  value: string | number | boolean
  disabled?: boolean
}

/**
 * 把儲存格的值正規化為可比較 / 可顯示的原始值。
 *
 * 資料列型別是 Record<string, unknown>，值可能是 null / undefined / 物件。
 * 原本兩處各自寫 `item ?? ''`，物件值會被當成選項的 value 直接存起來，
 * 之後 includes() 以參考比對必定落空 —— 篩選會無聲失效，label 也會顯示
 * [object Object]。統一走這個函式後兩邊規則一致。
 */
function normalizeCellValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return ''
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return value as string | number | boolean
  return String(value)
}

/** 由儲存格值建立篩選選項 */
function toFilterOption(value: unknown): ChptRadioItem {
  const v = normalizeCellValue(value)
  return { value: v, label: String(v) }
}

watch(
  () => tooltipInfo.value.column,
  (newValue) => {
    if (newValue) {
      uniqueColumnValueArray.value = [
        ...new Set(originalData.value.map((item) => item[newValue.dataIndex])),
      ].map(toFilterOption)
    }
  }
)

watch(filterSearchText, (newValue) => {
  const column = tooltipInfo.value.column
  if (!column) return
  if (newValue) {
    const all = [...new Set(originalData.value.map((item) => item[column.dataIndex]))]
    uniqueColumnValueArray.value = all
      .filter((value) => String(value).toLowerCase().includes(newValue.toLowerCase()))
      .map(toFilterOption)
  } else {
    uniqueColumnValueArray.value = [
      ...new Set(originalData.value.map((item) => item[column.dataIndex])),
    ].map(toFilterOption)
  }
})

watch(filterColumnValueArray, (newValue) => {
  const column = tooltipInfo.value.column
  if (!column) return
  const columnKey = column.dataIndex
  if (newValue.length > 0) {
    filterState.value.set(columnKey, [...newValue])
  } else {
    filterState.value.delete(columnKey)
  }
  emit('update:filterColumns', Array.from(filterState.value.keys()))
})

function selectAllHandler(): void {
  const column = tooltipInfo.value.column
  if (!column) return
  if (filterColumnValueArray.value.length !== uniqueColumnValueArray.value.length) {
    filterColumnValueArray.value = uniqueColumnValueArray.value.map((item) => item.value)
  } else {
    filterColumnValueArray.value = []
  }
}

function clickHandler(e: MouseEvent | undefined, column?: ChptFixedTableColumn): void {
  if (!column || column?.dataIndex === tooltipInfo.value.column?.dataIndex) {
    tooltipInfo.value = { x: 0, y: 0, opacity: 0, column: null }
    filterSearchText.value = ''
    return
  }
  tooltipInfo.value.x = e!.clientX
  tooltipInfo.value.y = e!.clientY - Number(props.viewportOffset)
  tooltipInfo.value.opacity = 1
  tooltipInfo.value.column = column

  if (filterState.value.has(column.dataIndex)) {
    filterColumnValueArray.value = [...filterState.value.get(column.dataIndex)!]
  } else {
    filterColumnValueArray.value = []
  }
}

function hasActiveFilter(columnKey: string): boolean {
  const values = filterState.value.get(columnKey)
  return Boolean(values && values.length > 0)
}

onMounted(() => {
  originalData.value = [...props.data]
  fixedColumns.value = getFixedColumnIds()
})
</script>

<style scoped>
/* 篩選選單淡入淡出動畫 */
.filter-fade-enter-active,
.filter-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.filter-fade-enter-from,
.filter-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.filter-fade-enter-to,
.filter-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

/* 自定義滾動條樣式 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
  transition: background 0.2s;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

.custom-scrollbar::-webkit-scrollbar-thumb:active {
  background: #888;
}
</style>
