<template>
  <div class="w-full font-sans mb-5 flex flex-col" :class="[props.containerBgColor, props.containerRounded, props.containerShadow, props.fontSize]">
    <!-- 搜尋和分頁控制區 -->
    <div class="flex justify-between items-center px-3 py-2 border-b border-stroke-light" :class="props.controlBgColor">
      <div class="flex items-center gap-2.5">
        <!-- 搜尋容器 -->
        <div class="relative flex items-center">
          <input
            type="text"
            v-model="searchQuery"
            :placeholder="searchPlaceholderText"
            :aria-label="searchPlaceholderText"
            class="w-48 h-7 px-2.5 border border-stroke-default rounded text-xs text-content-primary bg-surface-primary transition-colors shadow-inner focus:outline-none focus:border-stroke-focus focus:ring-2 focus:ring-primary-100"
            @keyup.enter="performSearch"
          />
        </div>

        <!-- 勾選狀態：有勾才出現，數字變動時禮貌報讀 -->
        <div v-if="selectionEnabled" class="flex items-center gap-2 text-xs" aria-live="polite">
          <template v-if="selectedKeySet.size > 0">
            <span class="font-medium text-content-secondary">{{ locale.selectedCount(selectedKeySet.size) }}</span>
            <button
              type="button"
              class="rounded px-1.5 py-0.5 text-accent hover:bg-accent-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
              @click="clearSelection"
            >{{ locale.clear }}</button>
            <slot name="selection-actions" :keys="[...selectedKeySet]" :rows="selectedRows" :clear="clearSelection"></slot>
          </template>
        </div>

        <slot name="left-controls"></slot>
      </div>

      <div class="flex items-center gap-2.5">
        <!-- 分頁控制區 (top 或 both 時顯示) -->
        <ChptPagination
          v-if="paginationPosition === 'top' || paginationPosition === 'both'"
          variant="compact"
          :aria-label="topNavLabel"
          :current-page="currentPage"
          :items-per-page="pageSize"
          :total-items="totalItems"
          bg-color="bg-surface-secondary"
          @update:current-page="handlePageChange"
          @update:items-per-page="handlePageSizeChange"
        />

        <slot name="right-controls"></slot>
      </div>
    </div>

    <!-- 表格內容 -->
    <div class="relative w-full overflow-x-auto mb-0 border-t border-b border-stroke-light">
      <table
        class="w-full border-collapse text-xs whitespace-nowrap min-w-max text-content-primary"
        :class="{ 'table-fixed': props.resizable }"
        :aria-busy="props.loading || undefined"
      >
        <!--
          表頭可以多層：columns 裡有 children 的是群組欄，標題橫跨底下所有欄位；
          沒有 children 的葉欄往下延伸到最後一層（rowspan）。排序、欄寬都只在葉欄上。
          sticky 掛在 <thead>：多列表頭時每一列不必各自算 top
        -->
        <thead class="sticky top-0 z-10">
          <tr v-for="(row, level) in headerRows" :key="level">
            <template v-if="level === 0">
              <th
                v-if="expandEnabled"
                scope="col"
                :rowspan="headerDepth > 1 ? headerDepth : undefined"
                class="lead-col header-cell bg-gradient-to-b"
                :class="[props.headerBgGradient]"
              ><span class="sr-only">展開</span></th>
              <th
                v-if="selectionEnabled"
                scope="col"
                :rowspan="headerDepth > 1 ? headerDepth : undefined"
                class="lead-col header-cell bg-gradient-to-b"
                :class="[props.headerBgGradient, { 'has-divider': expandEnabled }]"
              >
                <input
                  v-if="!singleSelect"
                  type="checkbox"
                  class="table-check"
                  :checked="pageSelectionState === 'all'"
                  :indeterminate="pageSelectionState === 'some'"
                  :disabled="selectablePageKeys.length === 0"
                  :aria-label="locale.selectPage"
                  @change="togglePageSelection"
                />
                <span v-else class="sr-only">{{ locale.select }}</span>
              </th>
            </template>

            <template v-for="cell in row" :key="cell.id">
              <!-- 群組欄：標題置中，橫跨底下的欄位 -->
              <th
                v-if="cell.isGroup"
                v-bind="cell.column.headerProps"
                scope="colgroup"
                :colspan="cell.colspan"
                class="header-cell group-cell font-semibold py-1.5 px-2 text-center whitespace-nowrap"
                :class="[headerBgClass(cell.column), headerTextClass(cell.column, props.groupHeaderTextColor), { 'has-divider': cell.divider }]"
                :style="cell.column.style"
              >{{ cell.column.title }}</th>

              <!-- 葉欄：可排序、可調整欄寬 -->
              <th
                v-else
                v-bind="cell.column.headerProps"
                scope="col"
                :rowspan="cell.rowspan > 1 ? cell.rowspan : undefined"
                :style="[cell.column.style, widthStyle(cell.column)]"
                :class="[
                  'header-cell leaf-cell font-medium py-2 px-2 whitespace-nowrap',
                  headerBgClass(cell.column),
                  getColumnSortInfo(cell.column.key) !== null ? 'text-accent' : headerTextClass(cell.column, props.headerTextColor),
                  {
                    'is-sortable': isColumnClickable(cell.column),
                    'is-sorted': getColumnSortInfo(cell.column.key) !== null,
                    'relative': props.resizable,
                    'has-divider': cell.divider,
                  }
                ]"
                :aria-sort="ariaSortFor(cell.column)"
                :tabindex="isColumnClickable(cell.column) ? 0 : undefined"
                @click="handleHeaderClick(cell.column)"
                @keydown.enter.self.prevent="handleHeaderClick(cell.column)"
                @keydown.space.self.prevent="handleHeaderClick(cell.column)"
              >
                <div class="flex items-center gap-1 min-h-[24px]" :class="justifyClass(cell.column)">
                  <span class="truncate">{{ cell.column.title }}</span>

                  <!-- 排序圖示：上下兩個小箭頭，目前的方向亮起；多欄排序時前面標出優先順序 -->
                  <span
                    v-if="isColumnClickable(cell.column)"
                    aria-hidden="true"
                    class="sort-indicator"
                    :class="getColumnSortInfo(cell.column.key)?.direction ? `is-${getColumnSortInfo(cell.column.key)!.direction}` : ''"
                  >
                    <span
                      v-if="sortColumns.length > 1 && getColumnSortInfo(cell.column.key) !== null"
                      class="sort-order"
                    >{{ getColumnSortInfo(cell.column.key)!.index + 1 }}</span>
                    <svg class="sort-arrows" viewBox="0 0 8 14" width="8" height="14" focusable="false">
                      <path class="arrow-up" d="M1 5.5 4 2.5 7 5.5" />
                      <path class="arrow-down" d="M1 8.5 4 11.5 7 8.5" />
                    </svg>
                  </span>
                </div>

                <!-- 欄寬拖曳把手：WAI-ARIA window splitter（可聚焦、左右鍵調整） -->
                <span
                  v-if="props.resizable && cell.column.resizable !== false"
                  role="separator"
                  aria-orientation="vertical"
                  tabindex="0"
                  :aria-label="`調整「${cell.column.title}」欄寬`"
                  :aria-valuenow="Math.round(currentWidthOf(cell.column))"
                  :aria-valuemin="minWidthOf(cell.column)"
                  class="col-resizer"
                  @click.stop
                  @pointerdown.stop.prevent="startResize($event, cell.column)"
                  @dblclick.stop="resetWidth(cell.column)"
                  @keydown.left.stop.prevent="nudgeWidth(cell.column, -10)"
                  @keydown.right.stop.prevent="nudgeWidth(cell.column, 10)"
                ></span>
              </th>
            </template>

            <!--
              resizable 用 table-layout: fixed；表格又要撐滿容器時，多出來的寬度會被平均分給
              每一欄 —— 拖到 120px 的欄實際變 180px。最後放一個不設寬度的填充欄吃掉剩餘空間
            -->
            <th
              v-if="props.resizable && level === 0"
              role="presentation"
              :rowspan="headerDepth > 1 ? headerDepth : undefined"
              class="filler-col header-cell bg-gradient-to-b"
              :class="[props.headerBgGradient]"
            ></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="paginatedData.length === 0">
            <td :colspan="totalColumnCount" class="py-5 text-center text-content-tertiary italic bg-surface-secondary">{{ props.loading ? '' : (props.noDataText ?? locale.noData) }}</td>
          </tr>
          <!--
            ⚠️ 原本資料列「只」能透過 table-row 插槽畫出來，沒有預設內容 ——
               照文件只傳 columns + data 時，分頁顯示「共 7 筆」，表身卻是空的（文檔頁的示範就是這樣）。
               現在預設依 columns 畫出每一格；要整列自訂仍可用 table-row，只改某一格用 cell。
               （用 table-row 整列自訂時，勾選欄、展開欄、row-click 都要自己處理）
          -->
          <template v-else>
            <template v-for="(item, index) in paginatedData" :key="keyOf(item, index + startIndex)">
              <slot name="table-row" :item="item" :index="index + startIndex">
                <tr
                  class="data-row"
                  :class="[
                    rowClassOf(item, index + startIndex),
                    {
                      'is-selected': selectedKeySet.has(keyOf(item, index + startIndex)),
                      'is-clickable': hasRowClickListener,
                    },
                  ]"
                  :aria-selected="selectionEnabled ? selectedKeySet.has(keyOf(item, index + startIndex)) : undefined"
                  :tabindex="hasRowClickListener ? 0 : undefined"
                  @click="onRowClick(item, index + startIndex, $event)"
                  @keydown.enter.self="onRowClick(item, index + startIndex, $event)"
                >
                  <td v-if="expandEnabled" class="lead-col">
                    <button
                      v-if="canExpandRow(item)"
                      type="button"
                      class="expand-toggle"
                      :aria-expanded="expandedKeySet.has(keyOf(item, index + startIndex))"
                      :aria-controls="expandIdOf(item, index + startIndex)"
                      :aria-label="expandedKeySet.has(keyOf(item, index + startIndex)) ? locale.collapseRow : locale.expandRow"
                      @click.stop="toggleExpand(item, index + startIndex)"
                    >
                      <span
                        class="material-symbols-outlined text-base transition-transform duration-150"
                        :class="{ 'rotate-90': expandedKeySet.has(keyOf(item, index + startIndex)) }"
                        aria-hidden="true"
                      >chevron_right</span>
                    </button>
                  </td>
                  <td v-if="selectionEnabled" class="lead-col">
                    <input
                      :type="singleSelect ? 'radio' : 'checkbox'"
                      class="table-check"
                      :name="singleSelect ? `${uid}-select` : undefined"
                      :checked="selectedKeySet.has(keyOf(item, index + startIndex))"
                      :disabled="!canSelectRow(item)"
                      :aria-label="`選取 ${rowLabelOf(item, index + startIndex)}`"
                      @click.stop
                      @change="toggleRow(item, index + startIndex)"
                    />
                  </td>
                  <td
                    v-for="column in displayColumns"
                    :key="column.key ?? column.title"
                    v-bind="cellPropsOf(column, item, index + startIndex)"
                    :class="toneOf(column) ? `tone-cell-${toneOf(column)}` : undefined"
                    :style="[column.style, widthStyle(column), alignStyle(column)]"
                  >
                    <slot
                      name="cell"
                      :item="item"
                      :column="column"
                      :value="column.key ? item[column.key] : undefined"
                    >{{ column.key ? item[column.key] : '' }}</slot>
                  </td>
                  <td v-if="props.resizable" role="presentation" class="filler-col"></td>
                </tr>
                <tr
                  v-if="expandEnabled && expandedKeySet.has(keyOf(item, index + startIndex))"
                  :id="expandIdOf(item, index + startIndex)"
                  class="expand-row"
                >
                  <td :colspan="totalColumnCount">
                    <slot name="expand" :item="item" :index="index + startIndex"></slot>
                  </td>
                </tr>
              </slot>
            </template>
          </template>
        </tbody>
        <!-- 表格底部 -->
        <tfoot v-if="hasFooterSlot">
          <slot name="footer"></slot>
        </tfoot>
      </table>

      <!-- 載入中：保留舊資料在底下（半透明遮罩），避免整張表閃成空白 -->
      <div
        v-if="props.loading"
        class="absolute inset-0 z-20 flex items-center justify-center bg-surface-primary/60"
      >
        <ChptSpinner loading :text="props.loadingText ?? locale.loading" />
      </div>
    </div>

    <!-- 分頁控制區 (下方) -->
    <div v-if="paginationPosition === 'bottom' || paginationPosition === 'both'" class="flex justify-between items-center px-3 py-2 border-t border-stroke-light" :class="props.bottomControlBgColor">
      <div class="flex items-center gap-2.5">
        <slot name="bottom-left-controls"></slot>
      </div>

      <div class="flex items-center gap-2.5">
        <ChptPagination
          variant="compact"
          :aria-label="bottomNavLabel"
          :current-page="currentPage"
          :items-per-page="pageSize"
          :total-items="totalItems"
          bg-color="bg-surface-primary"
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
import { ref, computed, watch, shallowReactive, useSlots, onMounted, onBeforeUnmount, getCurrentInstance, useId } from 'vue'
import ChptPagination from './ChptPagination.vue'
import ChptSpinner from './ChptSpinner.vue'
import { useConfig } from '../shared/config'

// === 型別定義 ===
export type DataRow = Record<string, unknown>

export interface Column {
  key?: string
  title: string
  sortable?: boolean
  sortType?: 'string' | 'number' | 'date'
  style?: string | Record<string, string>
  /** 初始欄寬（px）；resizable 時為拖曳起點 */
  width?: number
  /** 拖曳時的最小欄寬（px，預設 48） */
  minWidth?: number
  /** resizable 開啟時，個別欄位可設 false 不給拖 */
  resizable?: boolean
  /** 表頭與儲存格的對齊（預設置中）；同 Vuetify 用 start / end，也接受 left / right。數字欄通常靠右（end） */
  align?: ColumnAlign
  /**
   * 子欄位：有 children 的是群組欄（多層表頭，同 Vuetify 的 headers.children），
   * 標題橫跨底下所有欄位，本身不排序、不顯示資料。可以一直往下巢狀
   */
  children?: Column[]
  /**
   * 這一欄表頭 <th> 的屬性（同 Vuetify 的 headerProps）：class、style、title、data-* 都可以。
   * class 或 style 裡有底色、文字色時，取代表格預設的表頭顏色 —— 例如 { class: 'bg-success-subtle text-success-on-subtle' }
   */
  headerProps?: Record<string, unknown>
  /**
   * 整欄的顏色：表頭用這個色系的淡底與深色字，儲存格加上同色系的半透明淡底（斑馬紋、hover 仍看得出來）。
   * 設在群組欄時底下所有欄位一起變色（子欄位可以再指定別的顏色）；深淺主題自動切換
   */
  color?: ColumnColor
  /** 這一欄每個儲存格 <td> 的屬性（同 Vuetify 的 cellProps）；給函式時依那一列決定 */
  cellProps?: Record<string, unknown> | ((ctx: CellContext) => Record<string, unknown> | undefined)
}

export type ColumnAlign = 'start' | 'center' | 'end' | 'left' | 'right'

/** 欄位顏色（語意色） */
export type ColumnColor = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

/** cellProps 函式拿到的內容 */
export interface CellContext {
  item: DataRow
  value: unknown
  column: Column
  index: number
}

export type RowKey = string | number

export interface SortItem {
  key: string
  direction: 'asc' | 'desc'
}

export interface DefaultSort {
  column: string | null
  direction: 'asc' | 'desc'
}

/** remote 模式下，任何會影響查詢的變動都會送出這個 payload（交給 API） */
export interface ChangeEvent {
  page: number
  pageSize: number
  sortColumns: SortItem[]
  query: string
  /** 這次是因為什麼而變動 */
  reason: 'page' | 'pageSize' | 'sort' | 'search'
}

export interface SortEvent {
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
  /**
   * 分頁導航（<nav>）的名稱。同一頁有多個表格時請各給一個（例如「工單分頁」），
   * 螢幕閱讀器的地標清單才分得出是哪個表格的分頁（WCAG landmark 名稱要唯一）。
   */
  paginationLabel?: string
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
  /** 群組表頭（有 children 的欄位）的文字顏色 */
  groupHeaderTextColor?: string
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

  // ===== 企業用擴充 =====
  /** 每列的唯一鍵：欄位名或函式。勾選 / 展開跨頁保留都靠它（預設 'id'，沒有時退回列序） */
  rowKey?: string | ((row: DataRow) => RowKey)
  /** 勾選列：true 為多選（含全選本頁），'single' 為單選 */
  selectable?: boolean | 'single'
  /** 已勾選的鍵（v-model:selected-keys） */
  selectedKeys?: RowKey[]
  /** 哪些列可以勾（例如已結案的不給勾） */
  isRowSelectable?: (row: DataRow) => boolean
  /** 已展開的鍵（v-model:expanded-keys）；有 #expand 插槽才會出現展開欄 */
  expandedKeys?: RowKey[]
  /** 哪些列可以展開 */
  isRowExpandable?: (row: DataRow) => boolean
  /** 伺服器端模式：不在前端過濾 / 排序 / 分頁，改送 change 事件，data 只放當頁 */
  remote?: boolean
  /** 伺服器端模式的總筆數（分頁用） */
  total?: number
  /** 載入中：表格蓋上半透明遮罩與 Spinner，並設 aria-busy */
  loading?: boolean
  loadingText?: string
  /** 可拖曳調整欄寬（也可 Tab 到把手用 ← → 調整，雙擊還原） */
  resizable?: boolean
  /** 每列額外的 class（例如依狀態上色） */
  rowClass?: string | ((row: DataRow, index: number) => string | Record<string, boolean> | undefined)
}>(), {
  data: () => [],
  columns: () => [],
  // 文字預設取自 ChptConfigProvider 的 locale（預設繁中）
  searchPlaceholder: undefined,
  noDataText: undefined,
  defaultPageSize: 5,
  customFilter: null,
  defaultSort: () => ({ column: null, direction: 'asc' }),
  paginationPosition: 'top',
  paginationLabel: '',
  containerBgColor: 'bg-surface-primary',
  containerRounded: 'rounded-lg',
  containerShadow: 'shadow-sm',
  headerBgGradient: 'from-accent-subtle to-accent-subtle',
  headerTextColor: 'text-content-primary',
  groupHeaderTextColor: 'text-accent',
  // ⚠️ 原本寫死 rgb(250 250 250) / rgb(232 245 239)：深色模式下偶數列與 hover 列還是淺色，
  //    整張表變成黑白相間。check:theme 只掃 Tailwind class，抓不到這種色值，要用主題變數
  evenRowBgColor: 'rgb(var(--t-surface-secondary))',
  hoverRowBgColor: 'rgb(var(--t-accent-subtle))',
  controlBgColor: 'bg-surface-primary',
  bottomControlBgColor: 'bg-surface-secondary',
  fontSize: 'text-xs',
  rowKey: 'id',
  selectable: false,
  selectedKeys: undefined,
  isRowSelectable: undefined,
  expandedKeys: undefined,
  isRowExpandable: undefined,
  remote: false,
  total: undefined,
  loading: false,
  loadingText: undefined,
  resizable: false,
  rowClass: undefined,
})

const config = useConfig()
const locale = computed(() => config.value.locale)

/** 上下都有分頁時兩個 <nav> 要不同名；有給 paginationLabel 就用它當前綴 */
const topNavLabel = computed(() => {
  if (props.paginationPosition !== 'both') return props.paginationLabel || undefined
  const top = locale.value.pagination.navTop
  return props.paginationLabel ? `${props.paginationLabel}（${top}）` : top
})
const bottomNavLabel = computed(() => {
  if (props.paginationPosition !== 'both') return props.paginationLabel || undefined
  const bottom = locale.value.pagination.navBottom
  return props.paginationLabel ? `${props.paginationLabel}（${bottom}）` : bottom
})
const searchPlaceholderText = computed(() => props.searchPlaceholder ?? locale.value.searchPlaceholder)

const emit = defineEmits<{
  'update:page': [page: number]
  'update:pageSize': [pageSize: number]
  'search': [query: string]
  'sort': [info: SortEvent]
  'change': [info: ChangeEvent]
  'update:selectedKeys': [keys: RowKey[]]
  'selection-change': [keys: RowKey[], rows: DataRow[]]
  'update:expandedKeys': [keys: RowKey[]]
  'row-click': [row: DataRow, index: number, event: MouseEvent | KeyboardEvent]
  'column-resize': [info: { key: string; width: number }]
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

/** 有 children 的是群組欄 */
const isGroup = (column: Column): boolean => !!column.children && column.children.length > 0

/** 底下的葉欄（真正顯示資料的欄位），依左到右的順序 */
function leavesOf(columns: Column[]): Column[] {
  return columns.flatMap((c) => (isGroup(c) ? leavesOf(c.children!) : [c]))
}

/** 表頭有幾層 */
function depthOf(columns: Column[]): number {
  return columns.reduce((max, c) => Math.max(max, isGroup(c) ? 1 + depthOf(c.children!) : 1), 0)
}

// 如果父組件沒有傳 columns，自動從資料第一筆的 key 生成；有群組欄時只取葉欄
const displayColumns = computed<Column[]>(() => {
  if (props.columns && props.columns.length > 0) {
    return leavesOf(props.columns)
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

/** 每個欄位實際的顏色：自己有指定就用自己的，否則沿用最近的群組 */
const colorMap = computed(() => {
  const map = new Map<Column, ColumnColor>()
  const walk = (columns: Column[], inherited: ColumnColor | undefined) => {
    for (const c of columns) {
      const color = c.color ?? inherited
      if (color) map.set(c, color)
      if (isGroup(c)) walk(c.children!, color)
    }
  }
  walk(props.columns, undefined)
  return map
})

const toneOf = (column: Column): ColumnColor | undefined => colorMap.value.get(column)

interface HeaderCell {
  id: string
  column: Column
  isGroup: boolean
  colspan: number
  rowspan: number
  /** 左邊要不要畫分隔線（表格最左邊那格不用） */
  divider: boolean
}

const headerDepth = computed(() => Math.max(1, props.columns.length ? depthOf(props.columns) : 1))

/**
 * 表頭的每一列：群組欄的 colspan 是底下的葉欄數；葉欄的 rowspan 延伸到最後一層。
 * 沒有群組欄時只有一列，與原本的單層表頭相同
 */
const headerRows = computed<HeaderCell[][]>(() => {
  const source = props.columns.length ? props.columns : displayColumns.value
  const depth = headerDepth.value
  const rows: HeaderCell[][] = Array.from({ length: depth }, () => [])
  const lead = (expandEnabled.value ? 1 : 0) + (selectionEnabled.value ? 1 : 0)
  let leafIndex = 0
  const walk = (columns: Column[], level: number, path: string) => {
    columns.forEach((column, i) => {
      const id = `${path}${i}`
      const divider = leafIndex > 0 || lead > 0
      if (isGroup(column)) {
        rows[level].push({ id, column, isGroup: true, colspan: leavesOf(column.children!).length, rowspan: 1, divider })
        walk(column.children!, level + 1, `${id}-`)
      } else {
        rows[level].push({ id, column, isGroup: false, colspan: 1, rowspan: depth - level, divider })
        leafIndex++
      }
    })
  }
  walk(source, 0, '')
  return rows
})

/** 把 class 綁定（字串、陣列、物件）攤平成 class 名稱 */
function classNames(value: unknown): string[] {
  if (!value) return []
  if (typeof value === 'string') return value.split(/\s+/).filter(Boolean)
  if (Array.isArray(value)) return value.flatMap(classNames)
  if (typeof value === 'object') return Object.entries(value as Record<string, unknown>).filter(([, on]) => on).map(([name]) => name)
  return []
}

/** style 綁定（字串、物件、陣列）裡有哪些屬性（kebab-case） */
function styleKeys(value: unknown): string[] {
  if (!value) return []
  if (typeof value === 'string') return value.split(';').map((d) => d.split(':')[0].trim().toLowerCase()).filter(Boolean)
  if (Array.isArray(value)) return value.flatMap(styleKeys)
  if (typeof value === 'object') return Object.keys(value).map((k) => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`))
  return []
}

/** text- 開頭但不是顏色的 Tailwind class（字級、對齊、換行） */
const NON_COLOR_TEXT = /^text-(xs|sm|base|lg|[2-9]?xl|left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip)$/

/** headerProps 有沒有自己指定底色、文字色（有的話不套表格預設，免得兩個 class 打架） */
function customHeaderColors(column: Column): { bg: boolean; text: boolean } {
  const hp = column.headerProps
  if (!hp) return { bg: false, text: false }
  const names = classNames(hp.class)
  const keys = styleKeys(hp.style)
  return {
    bg: names.some((n) => n.startsWith('bg-')) || keys.some((k) => k.startsWith('background')),
    text: names.some((n) => n.startsWith('text-') && !NON_COLOR_TEXT.test(n)) || keys.includes('color'),
  }
}

/** 表頭底色：headerProps 有指定就用它的，其次是欄位的 color，最後是表格的漸層 */
function headerBgClass(column: Column): string[] {
  if (customHeaderColors(column).bg) return []
  const tone = toneOf(column)
  return tone ? [`tone-bg-${tone}`] : ['bg-gradient-to-b', props.headerBgGradient]
}

/** 表頭文字色：headerProps 有指定就用它的，其次是欄位的 color */
function headerTextClass(column: Column, fallback: string): string {
  if (customHeaderColors(column).text) return ''
  const tone = toneOf(column)
  return tone ? `tone-text-${tone}` : fallback
}

/** 對齊統一成 left / center / right */
function alignOf(column: Column): 'left' | 'center' | 'right' | undefined {
  const a = column.align
  if (a === 'start' || a === 'left') return 'left'
  if (a === 'end' || a === 'right') return 'right'
  return a === 'center' ? 'center' : undefined
}

/** 葉欄表頭內容的水平對齊 */
function justifyClass(column: Column): string {
  const a = alignOf(column)
  return a === 'left' ? 'justify-start' : a === 'right' ? 'justify-end' : 'justify-center'
}

/** 儲存格的對齊（沒指定時沿用預設的置中） */
function alignStyle(column: Column): Record<string, string> | undefined {
  const a = alignOf(column)
  return a ? { textAlign: a } : undefined
}

/** 儲存格的額外屬性（cellProps） */
function cellPropsOf(column: Column, item: DataRow, index: number): Record<string, unknown> | undefined {
  const cp = column.cellProps
  if (!cp) return undefined
  return typeof cp === 'function' ? cp({ item, value: column.key ? item[column.key] : undefined, column, index }) : cp
}

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
  // 如果明確設定為 false，或是群組欄，則不可點擊
  if (column.sortable === false || isGroup(column)) {
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
  emitChange('sort')
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
  // 伺服器端模式：資料已經是 API 過濾、排序、分頁後的當頁結果
  if (props.remote) return props.data
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
  return props.remote ? filteredData.value : sortData(filteredData.value)
})

/** 分頁用的總筆數：remote 時由父層告知 */
const totalItems = computed(() =>
  props.remote ? (props.total ?? props.data.length) : sortedAndFilteredData.value.length
)

// 計算總頁數
const totalPages = computed(() => {
  return Math.ceil(totalItems.value / pageSize.value) || 1
})

// 分頁後的數據
const startIndex = computed(() => (currentPage.value - 1) * pageSize.value)
const endIndex = computed(() => startIndex.value + pageSize.value)

const paginatedData = computed(() => {
  if (props.remote) return props.data
  return sortedAndFilteredData.value.slice(startIndex.value, endIndex.value)
})

// 處理頁面變化
function handlePageChange(page: number): void {
  if (page < 1) page = 1
  if (page > totalPages.value) page = totalPages.value
  currentPage.value = page
  
  emit('update:page', currentPage.value)
  emitChange('page')
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
  emitChange('pageSize')
}

// 執行搜尋
function performSearch() {
  currentPage.value = 1
  emit('search', searchQuery.value)
  emitChange('search')
}

function emitChange(reason: ChangeEvent['reason']): void {
  emit('change', {
    page: currentPage.value,
    pageSize: pageSize.value,
    sortColumns: [...sortColumns.value],
    query: searchQuery.value,
    reason,
  })
}

// 資料更新時保留頁碼，只在超出總頁數時拉回最後一頁
// ⚠️ 原本 deep watch props.data 一變就回第 1 頁：即時同步、改某一列的值都會把正在看第 5 頁的人打回第 1 頁，
//    而且每次都要走遍整份資料。回第 1 頁只留給搜尋 / 排序（performSearch、handleSort）；
//    父層換了一批不相干的資料要從頭看時，呼叫 expose 的 resetPage()。
//    （remote 模式的頁碼與總筆數由父層決定，這裡不動）
watch(totalPages, (pages) => {
  if (props.remote) return
  if (currentPage.value > pages) currentPage.value = pages
})

// 監聽搜尋查詢變化
watch(searchQuery, (newVal) => {
  if (!newVal) {
    performSearch()
  }
})

// ===================================================================
// 列鍵、勾選、展開、row-click、欄寬
// ===================================================================
const uid = useId()
const instance = getCurrentInstance()

/** 每列的唯一鍵；沒有 rowKey 欄位時退回列序（跨頁 / 資料變動時不穩定，建議給 id） */
function keyOf(row: DataRow, index: number): RowKey {
  if (typeof props.rowKey === 'function') return props.rowKey(row)
  const v = row[props.rowKey]
  return typeof v === 'string' || typeof v === 'number' ? v : `__row_${index}`
}

function rowClassOf(row: DataRow, index: number) {
  if (!props.rowClass) return undefined
  return typeof props.rowClass === 'function' ? props.rowClass(row, index) : props.rowClass
}

/** 螢幕閱讀器用的列名稱：第一個有值的欄位 */
function rowLabelOf(row: DataRow, index: number): string {
  for (const col of displayColumns.value) {
    if (col.key && row[col.key] != null && row[col.key] !== '') return String(row[col.key])
  }
  return `第 ${index + 1} 列`
}

// ----- 勾選 -----
const selectionEnabled = computed(() => props.selectable !== false)
const singleSelect = computed(() => props.selectable === 'single')
const innerSelected = ref<RowKey[]>(props.selectedKeys ?? [])
watch(() => props.selectedKeys, (keys) => { if (keys) innerSelected.value = [...keys] })
const selectedKeySet = computed(() => new Set(innerSelected.value))

/**
 * 看過的列（鍵 → 列）：remote 模式下其他頁的資料不在 props.data 裡，
 * selection-change 仍要能回傳跨頁勾選的完整列。
 *
 * ⚠️ 必須是響應式的 Map：原本是一般的 Map，selectedRows 只依賴勾選的鍵，
 *    父層更新了已勾選那列的內容（同一個鍵、新的資料）時不會重算，
 *    selection-actions 插槽與 ref 的 selectedRows 停在舊資料。
 *    用 shallowReactive：只追蹤 Map 的增刪改，不把每一列包成深層 Proxy。
 */
const seenRows = shallowReactive(new Map<RowKey, DataRow>())
watch(() => props.data, (rows) => {
  const current = new Set<RowKey>()
  rows.forEach((row, i) => {
    const key = keyOf(row, i)
    current.add(key)
    seenRows.set(key, row)
  })
  // 只留這次的資料與勾選中的列：remote 長時間翻頁時快取才不會一直長大
  const selected = selectedKeySet.value
  for (const key of seenRows.keys()) {
    if (!current.has(key) && !selected.has(key)) seenRows.delete(key)
  }
}, { immediate: true })

const selectedRows = computed(() =>
  innerSelected.value.map((k) => seenRows.get(k)).filter((r): r is DataRow => !!r)
)

function canSelectRow(row: DataRow): boolean {
  return props.isRowSelectable ? props.isRowSelectable(row) : true
}

function commitSelection(keys: RowKey[]): void {
  innerSelected.value = keys
  emit('update:selectedKeys', [...keys])
  emit('selection-change', [...keys], selectedRows.value)
}

function toggleRow(row: DataRow, index: number): void {
  if (!canSelectRow(row)) return
  const key = keyOf(row, index)
  if (singleSelect.value) {
    commitSelection(selectedKeySet.value.has(key) ? [] : [key])
    return
  }
  commitSelection(
    selectedKeySet.value.has(key)
      ? innerSelected.value.filter((k) => k !== key)
      : [...innerSelected.value, key]
  )
}

/** 本頁可勾的列鍵 */
const selectablePageKeys = computed(() =>
  paginatedData.value
    .map((row, i) => (canSelectRow(row) ? keyOf(row, i + startIndex.value) : null))
    .filter((k): k is RowKey => k !== null)
)

/** 表頭全選框的狀態：本頁全勾 / 部分 / 都沒勾 */
const pageSelectionState = computed<'all' | 'some' | 'none'>(() => {
  const keys = selectablePageKeys.value
  const picked = keys.filter((k) => selectedKeySet.value.has(k)).length
  if (picked === 0) return 'none'
  return picked === keys.length ? 'all' : 'some'
})

/** 全選本頁；已全選時取消本頁（其他頁的勾選保留） */
function togglePageSelection(): void {
  const pageKeys = new Set(selectablePageKeys.value)
  if (pageSelectionState.value === 'all') {
    commitSelection(innerSelected.value.filter((k) => !pageKeys.has(k)))
  } else {
    const next = [...innerSelected.value]
    pageKeys.forEach((k) => { if (!selectedKeySet.value.has(k)) next.push(k) })
    commitSelection(next)
  }
}

function clearSelection(): void {
  commitSelection([])
}

// ----- 展開 -----
const expandEnabled = computed(() => !!slots.expand)
const innerExpanded = ref<RowKey[]>(props.expandedKeys ?? [])
watch(() => props.expandedKeys, (keys) => { if (keys) innerExpanded.value = [...keys] })
const expandedKeySet = computed(() => new Set(innerExpanded.value))

function canExpandRow(row: DataRow): boolean {
  return props.isRowExpandable ? props.isRowExpandable(row) : true
}

function expandIdOf(row: DataRow, index: number): string {
  return `${uid}-expand-${String(keyOf(row, index)).replace(/\s+/g, '_')}`
}

function toggleExpand(row: DataRow, index: number): void {
  const key = keyOf(row, index)
  innerExpanded.value = expandedKeySet.value.has(key)
    ? innerExpanded.value.filter((k) => k !== key)
    : [...innerExpanded.value, key]
  emit('update:expandedKeys', [...innerExpanded.value])
}

const totalColumnCount = computed(() =>
  displayColumns.value.length +
  (selectionEnabled.value ? 1 : 0) +
  (expandEnabled.value ? 1 : 0) +
  (props.resizable ? 1 : 0)
)

// ----- row-click -----
/** 有人監聽 row-click 時，列才可聚焦、滑鼠變手指（沒監聽就不要假裝能點） */
const hasRowClickListener = computed(() => !!instance?.vnode.props?.onRowClick)

const INTERACTIVE = 'a, button, input, select, textarea, label, [role="button"], [role="checkbox"], [role="switch"], [contenteditable="true"]'

function onRowClick(row: DataRow, index: number, event: MouseEvent | KeyboardEvent): void {
  if (!hasRowClickListener.value) return
  // 點的是列裡的按鈕 / 連結 / 輸入框時，不當成點整列
  const target = event.target as HTMLElement | null
  const row_el = event.currentTarget as HTMLElement | null
  const hit = target?.closest(INTERACTIVE)
  if (hit && hit !== row_el && row_el?.contains(hit)) return
  emit('row-click', row, index, event)
}

// ----- 欄寬 -----
const DEFAULT_MIN_WIDTH = 48
const colWidths = ref<Record<string, number>>({})

function colId(column: Column): string {
  return column.key ?? column.title
}

function minWidthOf(column: Column): number {
  return column.minWidth ?? DEFAULT_MIN_WIDTH
}

function currentWidthOf(column: Column): number {
  return colWidths.value[colId(column)] ?? column.width ?? (props.resizable ? DEFAULT_RESIZABLE_WIDTH : 0)
}

/** resizable（table-layout: fixed）時沒給 width 的欄位用這個寬度，否則會被填充欄擠到 0 */
const DEFAULT_RESIZABLE_WIDTH = 140

function widthStyle(column: Column): Record<string, string> | undefined {
  const w = colWidths.value[colId(column)] ?? column.width ?? (props.resizable ? DEFAULT_RESIZABLE_WIDTH : undefined)
  if (!w) return undefined
  return { width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px` }
}

function setWidth(column: Column, width: number): void {
  const w = Math.max(minWidthOf(column), Math.round(width))
  colWidths.value = { ...colWidths.value, [colId(column)]: w }
}

function measuredWidth(el: HTMLElement | null, column: Column): number {
  const current = currentWidthOf(column)
  if (current) return current
  return el?.getBoundingClientRect().width || DEFAULT_RESIZABLE_WIDTH
}

let stopResize: (() => void) | null = null

function startResize(event: PointerEvent, column: Column): void {
  if (event.button !== 0) return
  const th = (event.currentTarget as HTMLElement).closest('th')
  const startX = event.clientX
  const startWidth = measuredWidth(th, column)
  const onMove = (e: PointerEvent) => setWidth(column, startWidth + (e.clientX - startX))
  const onUp = () => {
    stopResize?.()
    emit('column-resize', { key: colId(column), width: currentWidthOf(column) })
  }
  stopResize = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    document.body.style.removeProperty('cursor')
    stopResize = null
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  document.body.style.cursor = 'col-resize'
}

function nudgeWidth(column: Column, delta: number): void {
  const el = document.activeElement?.closest('th') as HTMLElement | null
  setWidth(column, measuredWidth(el, column) + delta)
  emit('column-resize', { key: colId(column), width: currentWidthOf(column) })
}

function resetWidth(column: Column): void {
  const next = { ...colWidths.value }
  delete next[colId(column)]
  colWidths.value = next
}

onBeforeUnmount(() => stopResize?.())

// defineExpose - 暴露組件方法和狀態
defineExpose({
  clearSelection,
  selectedRows,
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

/*
 * ⚠️ 以下原本全是寫死的淺色（rgb(55 65 81) 的字、rgb(229 231 235) 的線…）：
 *    深色模式下儲存格文字是深灰配深底、列與列之間是一條條白線。
 *    check:theme 只檢查 Tailwind class，看不到 <style> 裡的色值，所以一直沒被發現。
 */

/* 警告行樣式 */
:deep(.warning-row) {
  background-color: rgb(var(--t-danger-subtle)) !important;
}

:deep(.warning-row:hover) {
  background-color: rgb(var(--t-danger-subtle-hover)) !important;
}

/* 指標未達標的樣式 */
:deep(.below-trigger) {
  color: rgb(var(--t-danger));
  font-weight: 600;
}

/* 表格單元格樣式 */
:deep(td) {
  padding: 0.375rem;
  text-align: center;
  border-bottom: 1px solid rgb(var(--t-stroke-light));
  /* 文字色由 <table> 繼承，不寫在這裡：這條規則帶 scoped 屬性選擇器，會蓋掉 cellProps 傳進來的文字色 class */
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

/* ===== 表頭 ===== */
.header-cell {
  border-bottom: 1px solid rgb(var(--t-stroke-light));
}

/* 欄與欄之間的分隔線（最左邊那格不畫） */
.header-cell.has-divider {
  border-left: 1px solid rgb(var(--t-stroke-light));
}

.leaf-cell.is-sortable {
  cursor: pointer;
  user-select: none;
}

.leaf-cell.is-sortable:hover {
  background-image: none;
  background-color: rgb(var(--t-accent-subtle-hover));
}

.leaf-cell:focus-visible {
  outline: 2px solid rgb(var(--t-stroke-focus));
  outline-offset: -2px;
}

/* 排序圖示：沒排序時兩個箭頭都淡；排序中的方向用強調色 */
.sort-indicator {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 1px;
  color: rgb(var(--t-content-tertiary));
}

.sort-arrows {
  display: block;
}

.sort-arrows path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.55;
  transition: opacity 0.15s, color 0.15s;
}

.leaf-cell.is-sortable:hover .sort-arrows path {
  opacity: 0.9;
}

.sort-indicator.is-asc .arrow-up,
.sort-indicator.is-desc .arrow-down {
  stroke: rgb(var(--t-accent));
  stroke-width: 1.8;
  opacity: 1;
}

.sort-indicator.is-asc .arrow-down,
.sort-indicator.is-desc .arrow-up {
  opacity: 0.3;
}

.sort-order {
  min-width: 10px;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  color: rgb(var(--t-accent));
}

/* ===== 欄位顏色（color）：表頭淡底深字，儲存格半透明淡底 ===== */
.tone-bg-accent {
  background-color: rgb(var(--t-accent-subtle));
}

.tone-text-accent {
  color: rgb(var(--t-accent-on-subtle));
}

.tone-cell-accent {
  background-color: rgb(var(--t-accent-subtle) / 0.55);
}

.tone-bg-success {
  background-color: rgb(var(--t-success-subtle));
}

.tone-text-success {
  color: rgb(var(--t-success-on-subtle));
}

.tone-cell-success {
  background-color: rgb(var(--t-success-subtle) / 0.55);
}

.tone-bg-warning {
  background-color: rgb(var(--t-warning-subtle));
}

.tone-text-warning {
  color: rgb(var(--t-warning-on-subtle));
}

.tone-cell-warning {
  background-color: rgb(var(--t-warning-subtle) / 0.55);
}

.tone-bg-danger {
  background-color: rgb(var(--t-danger-subtle));
}

.tone-text-danger {
  color: rgb(var(--t-danger-on-subtle));
}

.tone-cell-danger {
  background-color: rgb(var(--t-danger-subtle) / 0.55);
}

.tone-bg-info {
  background-color: rgb(var(--t-info-subtle));
}

.tone-text-info {
  color: rgb(var(--t-info-on-subtle));
}

.tone-cell-info {
  background-color: rgb(var(--t-info-subtle) / 0.55);
}

.tone-bg-neutral {
  background-color: rgb(var(--t-surface-tertiary));
}

.tone-text-neutral {
  color: rgb(var(--t-content-secondary));
}

.tone-cell-neutral {
  background-color: rgb(var(--t-surface-tertiary) / 0.5);
}

/* ===== 勾選 / 展開 / 可點列 / 欄寬把手 ===== */
.filler-col {
  padding: 0 !important;
}

.lead-col {
  width: 2.5rem;
  min-width: 2.5rem;
  max-width: 2.5rem;
  padding: 0 !important;
  text-align: center;
}

.table-check {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
  accent-color: rgb(var(--t-accent-solid));
  vertical-align: middle;
}

.table-check:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.expand-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.375rem;
  color: rgb(var(--t-content-secondary));
}

.expand-toggle:hover {
  background-color: rgb(var(--t-surface-tertiary));
  color: rgb(var(--t-content-primary));
}

.table-check:focus-visible,
.expand-toggle:focus-visible,
.col-resizer:focus-visible,
tr.is-clickable:focus-visible {
  outline: 2px solid rgb(var(--t-stroke-focus));
  outline-offset: -2px;
}

/* 勾選中的列：比斑馬紋與 hover 優先 */
:deep(tbody tr.is-selected) {
  background-color: rgb(var(--t-accent-subtle));
}

/* 另外加一條左側強調線：rowClass（例如 warning-row）用 !important 蓋掉底色時，勾選狀態仍看得出來 */
:deep(tbody tr.is-selected > td:first-child) {
  box-shadow: inset 3px 0 0 rgb(var(--t-accent-solid));
}

tr.is-clickable {
  cursor: pointer;
}

/* 展開的明細列：不參與 hover 上色，左側一條強調線表示從屬於上一列 */
:deep(tbody tr.expand-row),
:deep(tbody tr.expand-row:hover) {
  background-color: rgb(var(--t-surface-secondary));
}

:deep(tbody tr.expand-row > td) {
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  text-align: left;
  white-space: normal;
  max-width: none;
  box-shadow: inset 3px 0 0 rgb(var(--t-accent-solid));
}

.col-resizer {
  position: absolute;
  top: 0;
  right: -3px;
  z-index: 1;
  width: 7px;
  height: 100%;
  cursor: col-resize;
  touch-action: none;
}

.col-resizer::after {
  content: '';
  position: absolute;
  top: 25%;
  left: 3px;
  width: 1px;
  height: 50%;
  background-color: rgb(var(--t-stroke-default));
}

.col-resizer:hover::after,
.col-resizer:focus-visible::after {
  top: 0;
  height: 100%;
  width: 2px;
  left: 2px;
  background-color: rgb(var(--t-accent-solid));
}

/* 表格底部樣式 */
:deep(tfoot td) {
  padding: 0.5rem 0;
  text-align: center;
  background-color: rgb(var(--t-surface-secondary));
  font-size: 0.75rem;
  border-top: 1px solid rgb(var(--t-stroke-light));
}

:deep(tfoot .summary-row) {
  background-color: rgb(var(--t-surface-secondary));
  font-size: 0.875rem;
  padding: 0.625rem 0;
  text-align: center;
}
</style>