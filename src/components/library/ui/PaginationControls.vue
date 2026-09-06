<template>
  <div class="flex items-center gap-2.5">
    <!-- 精簡版分頁信息 -->
    <div v-if="total > 0" class="text-xs text-gray-500 mr-1 px-1.5 rounded h-6 flex items-center border border-gray-300" :class="bgColor">
      共 {{ total }} 筆
    </div>
    
    <!-- 每頁筆數選擇器 -->
    <div class="flex items-center gap-1 text-xs text-gray-700 border border-gray-300 rounded px-1.5 h-6" :class="bgColor">
      <span>每頁</span>
      <input
        type="number"
        :value="pageSize"
        min="1"
        max="1000"
        class="w-9 h-4.5 border border-gray-300 rounded-sm text-center px-0.5 text-xs bg-white focus:outline-none focus:border-blue-500"
        @change="handlePageSizeInput"
      />
      <span>筆</span>
    </div>
    
    <!-- 分頁控制器 -->
    <div class="flex items-center rounded border border-gray-300 overflow-hidden" :class="bgColor">
      <button
        :class="btnClass"
        class="border-r"
        @click="$emit('pageChange', 1)"
        :disabled="currentPage === 1"
        title="第一頁"
      >
        <span class="text-xs">«</span>
      </button>
      <button
        :class="btnClass"
        class="border-r"
        @click="$emit('pageChange', currentPage - 1)"
        :disabled="currentPage === 1"
        title="上一頁"
      >
        <span class="text-xs">‹</span>
      </button>
      
      <div class="flex items-center h-6 px-1 bg-white border-r border-gray-300">
        <input
          type="number"
          :value="currentPage"
          min="1"
          :max="totalPages"
          class="w-7 h-4.5 text-center border border-gray-300 rounded-sm text-xs px-0.5 focus:outline-none focus:border-blue-500"
          @change="handlePageInput"
        />
        <span class="mx-1 text-gray-700 text-xs">/</span>
        <span class="text-xs text-gray-700">{{ totalPages }}</span>
      </div>
      
      <button
        :class="btnClass"
        class="border-r"
        @click="$emit('pageChange', currentPage + 1)"
        :disabled="currentPage === totalPages || totalPages === 0"
        title="下一頁"
      >
        <span class="text-xs">›</span>
      </button>
      <button
        :class="btnClass"
        @click="$emit('pageChange', totalPages)"
        :disabled="currentPage === totalPages || totalPages === 0"
        title="最後一頁"
      >
        <span class="text-xs">»</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  currentPage: number
  totalPages: number
  pageSize: number
  total: number
  bgColor?: string
}>()

const emit = defineEmits<{
  pageChange: [page: number]
  pageSizeChange: [size: number]
}>()

const btnClass = 'h-6 min-w-6 flex items-center justify-center bg-transparent border-none border-gray-300 cursor-pointer px-1.5 text-gray-700 transition-colors text-xs hover:bg-blue-50 hover:text-blue-500 disabled:text-gray-400 disabled:cursor-not-allowed disabled:bg-gray-100'

function handlePageInput(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value)
  if (!isNaN(val)) {
    emit('pageChange', val)
  }
}

function handlePageSizeInput(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value)
  if (!isNaN(val)) {
    emit('pageSizeChange', val)
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
