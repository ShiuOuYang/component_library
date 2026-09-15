<template>
  <div class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
    <div class="flex flex-1 justify-between sm:hidden">
      <button
        @click="prevPage"
        :disabled="currentPage === 1"
        class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        上一頁
      </button>
      <button
        @click="nextPage"
        :disabled="currentPage === totalPages"
        class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        下一頁
      </button>
    </div>
    <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
      <div class="flex items-center gap-4">
        <p class="text-sm text-gray-700">
          顯示第
          <span class="font-medium">{{ startItem }}</span>
          至
          <span class="font-medium">{{ endItem }}</span>
          項結果，共
          <span class="font-medium">{{ totalItems }}</span>
          項
        </p>
        <div class="flex items-center gap-2">
          <select
            :value="itemsPerPage"
            @change="updateItemsPerPage"
            class="block w-full rounded-md border-0 py-1 pl-2 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6 cursor-pointer"
          >
            <option v-for="option in pageSizeOptions" :key="option" :value="option">
              {{ option }} 筆/頁
            </option>
          </select>
        </div>
      </div>
      <div>
        <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
          <button
            @click="prevPage"
            :disabled="currentPage === 1"
            class="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span class="sr-only">Previous</span>
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
            </svg>
          </button>
          
          <template v-for="page in displayedPages" :key="page">
             <button
                v-if="page !== '...'"
                @click="changePage(page)"
                :class="[
                  page === currentPage
                    ? 'relative z-10 inline-flex items-center bg-blue-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                    : 'relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                ]"
              >
                {{ page }}
              </button>
              <span
                v-else
                class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0"
              >...</span>
          </template>

          <button
            @click="nextPage"
            :disabled="currentPage === totalPages"
            class="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span class="sr-only">Next</span>
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
            </svg>
          </button>
        </nav>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  totalItems: {
    type: Number,
    required: true
  },
  itemsPerPage: {
    type: Number,
    default: 20
  },
  currentPage: {
    type: Number,
    default: 1
  },
  pageSizeOptions: {
    type: Array,
    default: () => [10, 20, 50, 100, 200]
  }
})

const emit = defineEmits(['update:currentPage', 'update:itemsPerPage', 'change'])

const totalPages = computed(() => Math.ceil(props.totalItems / props.itemsPerPage))

const startItem = computed(() => {
  if (props.totalItems === 0) return 0
  return (props.currentPage - 1) * props.itemsPerPage + 1
})

const endItem = computed(() => {
  const end = props.currentPage * props.itemsPerPage
  return end > props.totalItems ? props.totalItems : end
})

const displayedPages = computed(() => {
  const total = totalPages.value
  const current = props.currentPage
  const delta = 2
  const range = []
  const rangeWithDots = []
  let l

  range.push(1)

  if (total <= 1) return range

  for (let i = current - delta; i <= current + delta; i++) {
    if (i < total && i > 1) {
      range.push(i)
    }
  }
  range.push(total)

  for (const i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1)
      } else if (i - l !== 1) {
        rangeWithDots.push('...')
      }
    }
    rangeWithDots.push(i)
    l = i
  }

  return rangeWithDots
})

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    emit('update:currentPage', page)
    emit('change', page)
  }
}

const prevPage = () => {
  changePage(props.currentPage - 1)
}

const nextPage = () => {
  changePage(props.currentPage + 1)
}

const updateItemsPerPage = (event) => {
  const newSize = parseInt(event.target.value)
  emit('update:itemsPerPage', newSize)
  // 重置回第一頁，避免當前頁碼超過總頁數
  emit('update:currentPage', 1)
  emit('change', 1)
}
</script>
