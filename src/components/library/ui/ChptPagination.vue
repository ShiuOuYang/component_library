<template>
  <div
    v-if="variant === 'full'"
    class="flex items-center justify-between border-t border-stroke-light bg-surface-primary px-4 py-3 sm:px-6"
  >
    <div class="flex flex-1 justify-between sm:hidden">
      <button type="button" @click="prevPage" :disabled="currentPage === 1" class="relative inline-flex items-center rounded-md border border-stroke-default bg-surface-primary h-control-sm px-4 text-sm font-medium text-content-primary hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed">上一頁</button>
      <button type="button" @click="nextPage" :disabled="currentPage === totalPages" class="relative ml-3 inline-flex items-center rounded-md border border-stroke-default bg-surface-primary h-control-sm px-4 text-sm font-medium text-content-primary hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed">下一頁</button>
    </div>
    <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
      <div class="flex items-center gap-4">
        <p v-if="showSummary" class="text-sm text-content-primary">
          顯示第 <span class="font-medium">{{ startItem }}</span> 至
          <span class="font-medium">{{ endItem }}</span> 項結果，共
          <span class="font-medium">{{ totalItems }}</span> 項
        </p>
        <div v-if="showPageSize" class="flex items-center gap-2">
          <select :value="itemsPerPage" @change="updateItemsPerPage" class="block w-full rounded-md border-0 py-1 pl-2 pr-8 text-content-primary ring-1 ring-inset ring-stroke-default focus:ring-2 focus:ring-stroke-focus sm:text-sm sm:leading-6 cursor-pointer">
            <option v-for="option in pageSizeOptions" :key="option" :value="option">{{ option }} 筆/頁</option>
          </select>
        </div>
      </div>
      <div>
        <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="分頁導航">
          <button type="button" @click="prevPage" :disabled="currentPage === 1" class="relative inline-flex items-center rounded-l-md h-control-sm px-2 text-content-disabled ring-1 ring-inset ring-stroke-default hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="sr-only">上一頁</span>
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd"/></svg>
          </button>
          <template v-for="page in displayedPages" :key="page">
            <button
              v-if="page !== '...'"
              type="button"
              :aria-label="`第 ${page} 頁`"
              :aria-current="page === currentPage ? 'page' : undefined"
              @click="changePage(page)"
              :class="[page === currentPage ? 'relative z-10 inline-flex items-center bg-accent-solid px-4 py-2 text-sm font-semibold text-white' : 'relative inline-flex items-center px-4 py-2 text-sm font-semibold text-content-primary ring-1 ring-inset ring-stroke-default hover:bg-surface-secondary']"
            >{{ page }}</button>
            <span v-else aria-hidden="true" class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-content-primary ring-1 ring-inset ring-stroke-default">...</span>
          </template>
          <button type="button" @click="nextPage" :disabled="currentPage === totalPages" class="relative inline-flex items-center rounded-r-md h-control-sm px-2 text-content-disabled ring-1 ring-inset ring-stroke-default hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="sr-only">下一頁</span>
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/></svg>
          </button>
        </nav>
      </div>
    </div>
  </div>

  <!-- Compact 模式（原 PaginationControls） -->
  <nav v-else aria-label="分頁導航" class="flex items-center gap-2.5">
    <div v-if="showSummary && totalItems > 0" class="text-xs text-content-tertiary mr-1 px-2 rounded h-control-sm flex items-center border border-stroke-default" :class="bgColor">共 {{ totalItems }} 筆</div>

    <div v-if="showPageSize" class="flex items-center gap-1 text-xs text-content-primary border border-stroke-default rounded px-2 h-control-sm" :class="bgColor">
      <span>每頁</span>
      <input type="number" :value="itemsPerPage" min="1" max="1000" aria-label="每頁筆數" class="w-12 h-control-xs border border-stroke-default rounded-sm text-center px-1 text-xs bg-surface-primary focus:outline-none focus:border-stroke-focus" @change="handlePageSizeInput" />
      <span>筆</span>
    </div>

    <div class="flex items-center rounded border border-stroke-default overflow-hidden" :class="bgColor">
      <button type="button" :class="btnClass" class="border-r" @click="changePage(1)" :disabled="currentPage === 1" title="第一頁" :aria-label="'第一頁'"><span aria-hidden="true" class="text-xs">«</span></button>
      <button type="button" :class="btnClass" class="border-r" @click="changePage(currentPage - 1)" :disabled="currentPage === 1" title="上一頁" :aria-label="'上一頁'"><span aria-hidden="true" class="text-xs">‹</span></button>
      <div class="flex items-center h-control-sm px-1 bg-surface-primary border-r border-stroke-default">
        <input type="number" :value="currentPage" min="1" :max="totalPages" aria-label="目前頁碼" class="w-10 h-control-xs text-center border border-stroke-default rounded-sm text-xs px-1 focus:outline-none focus:border-stroke-focus" @change="handlePageInput" />
        <span class="mx-1 text-content-primary text-xs">/</span>
        <span class="text-xs text-content-primary">{{ totalPages || 0 }}</span>
      </div>
      <button type="button" :class="btnClass" class="border-r" @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages || totalPages === 0" title="下一頁" :aria-label="'下一頁'"><span aria-hidden="true" class="text-xs">›</span></button>
      <button type="button" :class="btnClass" @click="changePage(totalPages)" :disabled="currentPage === totalPages || totalPages === 0" title="最後一頁" :aria-label="'最後一頁'"><span aria-hidden="true" class="text-xs">»</span></button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * ChptPagination（CHPT 主題） - 分頁元件
 *
 * 整合原 Pagination 與 PaginationControls 兩種分頁風格：
 * - variant="full"：完整分頁（頁碼按鈕 + 省略號 + 每頁筆數下拉 + 顯示範圍）
 * - variant="compact"：精簡控制（第一/上/下/最後一頁 + 當前頁輸入 + 每頁筆數）
 *
 * 特性：
 * - v-model:current-page / v-model:items-per-page 雙向綁定
 * - 完整 Props / Emits 型別定義
 */

type ChptPaginationVariant = 'full' | 'compact'

interface ChptPaginationProps {
  /** 分頁風格 */
  variant?: ChptPaginationVariant
  /** 目前頁數（v-model:current-page） */
  currentPage?: number
  /** 每頁筆數（v-model:items-per-page） */
  itemsPerPage?: number
  /** 總資料數 */
  totalItems?: number
  /** full 模式：每頁筆數選項 */
  pageSizeOptions?: number[]
  /** 是否顯示總數摘要 */
  showSummary?: boolean
  /** 是否顯示每頁筆數選擇器 */
  showPageSize?: boolean
  /** compact 模式：背景色 class */
  bgColor?: string
}

const props = withDefaults(defineProps<ChptPaginationProps>(), {
  variant: 'full',
  currentPage: 1,
  itemsPerPage: 20,
  totalItems: 0,
  pageSizeOptions: () => [10, 20, 50, 100, 200],
  showSummary: true,
  showPageSize: true,
  bgColor: '',
})

const emit = defineEmits<{
  (e: 'update:currentPage', value: number): void
  (e: 'update:itemsPerPage', value: number): void
  (e: 'change', page: number): void
}>()

/** 每頁筆數的合法範圍，與 compact 模式輸入框的 min / max 一致 */
const MIN_PAGE_SIZE = 1
const MAX_PAGE_SIZE = 1000

/**
 * 實際生效的每頁筆數。
 *
 * ⚠️ 不能直接信任 props.itemsPerPage：compact 模式的 <input type="number">
 *    上的 min/max 只是瀏覽器提示，使用者照樣能打 0 或負數送出 change。
 *    itemsPerPage = 0 會讓 Math.ceil(n / 0) 變成 Infinity，而 `|| 0` 擋不掉
 *    （Infinity 是 truthy），畫面上的總頁數就會直接顯示 "Infinity"，
 *    上一頁／下一頁的 disabled 判斷也跟著失效。
 */
const effectivePageSize = computed(() => {
  const size = Math.floor(Number(props.itemsPerPage))
  if (!Number.isFinite(size) || size < MIN_PAGE_SIZE) return MIN_PAGE_SIZE
  return Math.min(size, MAX_PAGE_SIZE)
})

/** 總頁數 */
const totalPages = computed(() => {
  if (props.totalItems <= 0) return 0
  return Math.ceil(props.totalItems / effectivePageSize.value)
})

/** 起始項目 */
const startItem = computed(() => {
  if (props.totalItems <= 0) return 0
  return (props.currentPage - 1) * effectivePageSize.value + 1
})

/** 結束項目 */
const endItem = computed(() => {
  const end = props.currentPage * effectivePageSize.value
  return end > props.totalItems ? props.totalItems : end
})

/** full 模式顯示的頁碼（含省略號） */
const displayedPages = computed<(number | string)[]>(() => {
  const total = totalPages.value
  const current = props.currentPage
  const delta = 2
  const range: number[] = []
  const rangeWithDots: (number | string)[] = []
  let l: number | undefined

  range.push(1)
  if (total <= 1) return range

  for (let i = current - delta; i <= current + delta; i++) {
    if (i < total && i > 1) range.push(i)
  }
  range.push(total)

  for (const i of range) {
    if (l) {
      if (i - l === 2) rangeWithDots.push(l + 1)
      else if (i - l !== 1) rangeWithDots.push('...')
    }
    rangeWithDots.push(i)
    l = i
  }
  return rangeWithDots
})

const btnClass =
  'h-control-sm min-w-control-sm flex items-center justify-center bg-transparent border-none border-stroke-default cursor-pointer px-1.5 text-content-primary transition-colors text-xs hover:bg-accent-subtle hover:text-accent disabled:text-content-disabled disabled:cursor-not-allowed disabled:bg-surface-tertiary'

/**
 * 切換頁碼。
 * displayedPages 的型別是 (number | string)[]（含省略號 '...'），
 * 模板的 v-if="page !== '...'" 收窄無法傳遞到事件處理器，因此這裡自行容錯：
 * 非數字一律忽略，不要送出 NaN 的頁碼。
 */
function changePage(page: number | string): void {
  const n = Number(page)
  if (!Number.isFinite(n)) return
  const p = Math.max(1, Math.min(n, totalPages.value))
  if (p !== props.currentPage) {
    emit('update:currentPage', p)
    emit('change', p)
  }
}
const prevPage = () => changePage(props.currentPage - 1)
const nextPage = () => changePage(props.currentPage + 1)

function updateItemsPerPage(event: Event): void {
  const size = parseInt((event.target as HTMLSelectElement).value, 10)
  emit('update:itemsPerPage', size)
  emit('update:currentPage', 1)
  emit('change', 1)
}

function handlePageInput(event: Event): void {
  const val = parseInt((event.target as HTMLInputElement).value, 10)
  if (!isNaN(val)) changePage(val)
}

/**
 * compact 模式的每頁筆數輸入。
 *
 * 輸入框上的 min="1" max="1000" 只是瀏覽器提示，使用者仍可打 0、負數或
 * 極大值送出，所以這裡自己夾在合法範圍內再送出去 —— 不要把壞值丟給使用端。
 * 切換每頁筆數會改變總頁數，因此一併把頁碼歸零回第 1 頁，
 * 行為與 full 模式的 updateItemsPerPage 一致。
 */
function handlePageSizeInput(event: Event): void {
  const input = event.target as HTMLInputElement
  const val = parseInt(input.value, 10)
  if (isNaN(val)) {
    // 清空或打了非數字：把輸入框還原成目前生效的值，不要送出 NaN
    input.value = String(effectivePageSize.value)
    return
  }
  const size = Math.min(Math.max(val, MIN_PAGE_SIZE), MAX_PAGE_SIZE)
  // 夾過之後要把畫面上的值同步回來，否則輸入框會停在使用者打的 0
  if (size !== val) input.value = String(size)
  if (size === props.itemsPerPage) return
  emit('update:itemsPerPage', size)
  if (props.currentPage !== 1) {
    emit('update:currentPage', 1)
    emit('change', 1)
  }
}
</script>

<style scoped>
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
