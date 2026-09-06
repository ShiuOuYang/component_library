<template>
  <div class="flex items-center gap-2">
    <label
      :for="id"
      class="group relative flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm cursor-pointer"
      :class="[
        sizeClasses[props.size],
        variantClasses[props.variant],
        loading ? 'opacity-50 cursor-not-allowed' : '',
        props.customClass
      ]"
    >
      <!-- 載入動畫 -->
      <svg
        v-if="loading"
        class="animate-spin mr-1.5"
        :class="iconValues[props.size]"
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
        :class="iconValues[props.size]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>

      <span>{{ loading ? props.loadingText : props.label }}</span>
    </label>
    <input
      :id="id"
      ref="fileInput"
      type="file"
      accept=".xlsx,.xls"
      class="hidden"
      :disabled="loading"
      @change="handleFileUpload"
    />
    <span v-if="fileName && !loading && props.showFileName" class="text-xs text-neutral-600">{{ fileName }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'

/**
 * ChptExcelUploader（CHPT 主題）- 匯入 Excel
 *
 * 整合原 ExcelUploader：
 * - 完整 Props / Emits 型別定義
 * - 選擇 .xlsx / .xls 並以 sheet_to_json 解析
 */

type UploaderSize = 'sm' | 'md'
type UploaderVariant =
  | 'solid-green'
  | 'solid-blue'
  | 'solid-red'
  | 'outline-gray'
  | 'soft-blue'
  | 'ghost'
  | 'primary'

interface ChptExcelUploaderProps {
  /** 按鈕文字 */
  label?: string
  /** 載入中文字 */
  loadingText?: string
  /** input id */
  inputId?: string
  /** 尺寸 */
  size?: UploaderSize
  /** 樣式變體 */
  variant?: UploaderVariant
  /** 自訂 class */
  customClass?: string
  /** 顯示檔案名稱 */
  showFileName?: boolean
}

const props = withDefaults(defineProps<ChptExcelUploaderProps>(), {
  label: '匯入 Excel',
  loadingText: '上傳中...',
  inputId: 'excel-upload',
  size: 'sm',
  variant: 'solid-green',
  customClass: '',
  showFileName: false,
})

const emit = defineEmits<{
  (e: 'data-loaded', data: unknown[]): void
  (e: 'error', message: string): void
  (e: 'upload-start'): void
  (e: 'upload-success'): void
  (e: 'upload-error', error: unknown): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const fileName = ref('')
const loading = ref(false)
const id = computed(() => props.inputId)

const sizeClasses: Record<UploaderSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
}

const iconValues: Record<UploaderSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
}

const variantClasses: Record<UploaderVariant, string> = {
  'solid-green': 'bg-green-600 hover:bg-green-700 text-white border border-transparent',
  'solid-blue': 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent',
  'solid-red': 'bg-red-600 hover:bg-red-700 text-white border border-transparent',
  'soft-blue': 'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 hover:border-blue-300',
  'outline-gray': 'bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 hover:border-neutral-400',
  ghost: 'bg-transparent hover:bg-neutral-100/10 text-neutral-300 hover:text-white border border-transparent',
  primary: 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent',
}

async function handleFileUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  fileName.value = file.name
  loading.value = true
  emit('upload-start')

  const reader = new FileReader()

  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      emit('data-loaded', jsonData)
      emit('upload-success')
      input.value = ''
      fileName.value = ''
    } catch (error) {
      emit('error', (error as Error).message)
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
