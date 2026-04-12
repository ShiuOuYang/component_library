<template>
  <div class="flex items-center gap-2">
    <label
      :for="inputId"
      class="group relative flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm cursor-pointer"
      :class="[
        sizeClasses[size],
        variantClasses[variant],
        loading ? 'opacity-50 cursor-not-allowed' : '',
        customClass
      ]"
    >
      <!-- 載入動畫 -->
      <svg 
        v-if="loading" 
        class="animate-spin mr-1.5"
        :class="iconValues[size]" 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      
      <!-- 上傳圖標 -->
      <svg 
        v-else
        class="mr-1.5 transition-colors duration-200"
        :class="iconValues[size]"
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      
      <span>
        {{ loading ? loadingText : label }}
      </span>
    </label>
    <input
      :id="inputId"
      ref="fileInput"
      type="file"
      accept=".xlsx,.xls"
      class="hidden"
      :disabled="loading"
      @change="handleFileUpload"
    />
    <span v-if="fileName && !loading && showFileName" class="text-xs text-gray-600">{{ fileName }}</span>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import * as XLSX from 'xlsx'

const props = defineProps({
  label: {
    type: String,
    default: '匯入 Excel'
  },
  loadingText: {
    type: String,
    default: '上傳中...'
  },
  inputId: {
    type: String,
    default: 'excel-upload'
  },
  size: {
    type: String,
    default: 'sm',
    validator: (value) => ['sm', 'md'].includes(value)
  },
  variant: {
    type: String,
    default: 'solid-green',
    validator: (value) => ['solid-green', 'solid-blue', 'solid-red', 'outline-gray', 'soft-blue', 'ghost', 'primary'].includes(value)
  },
  customClass: {
    type: String,
    default: ''
  },
  showFileName: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['data-loaded', 'error', 'upload-start', 'upload-success', 'upload-error'])

const fileInput = ref(null)
const fileName = ref('')
const loading = ref(false)

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg'
}

const iconValues = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4'
}

const variantClasses = {
  'solid-green': 'bg-green-600 hover:bg-green-700 text-white border border-transparent',
  'solid-blue': 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent',
  'solid-red': 'bg-red-600 hover:bg-red-700 text-white border border-transparent',
  'soft-blue': 'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 hover:border-blue-300',
  'outline-gray': 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400',
  'ghost': 'bg-transparent hover:bg-gray-100/10 text-gray-300 hover:text-white border border-transparent',
  'primary': 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent'
}

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  fileName.value = file.name
  loading.value = true
  emit('upload-start')

  const reader = new FileReader()
  
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      
      // 讀取第一個工作表
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      
      // 轉換為 JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      
      // 發送資料給父元件處理上傳
      emit('data-loaded', jsonData)
      
      emit('upload-success')
      
      // 清空 input
      event.target.value = ''
      fileName.value = ''
    } catch (error) {
      emit('error', error.message)
      emit('upload-error', error)
      fileName.value = ''
    } finally {
      loading.value = false
    }
  }

  reader.onerror = () => {
    emit('error', '讀取檔案失敗')
    emit('upload-error', new Error('讀取檔案失敗'))
    fileName.value = ''
    loading.value = false
  }

  reader.readAsArrayBuffer(file)
}
</script>
