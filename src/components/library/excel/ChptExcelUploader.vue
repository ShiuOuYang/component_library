<template>
  <div class="flex items-center gap-2">
    <!--
      ⚠️ 原本是 class="hidden"（display: none）。display: none 的元素不可聚焦，
         而整個元件的觸發點是這個 input 的 <label> —— 也就是說鍵盤使用者
         完全無法選檔，違反 WCAG 2.1.1（所有功能都要能用鍵盤操作）。
         改用 sr-only 的定位手法把它藏起來但保留在可聚焦序列中，
         並讓 label 在 input 取得焦點時顯示 focus ring（見 label 的 peer-focus-visible）。
    -->
    <input
      :id="id"
      type="file"
      accept=".xlsx,.xls"
      class="peer sr-only"
      :disabled="loading"
      @change="handleFileUpload"
    />
    <label
      :for="id"
      class="group relative flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm cursor-pointer peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-stroke-focus peer-focus-visible:ring-offset-2"
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
    <span v-if="fileName && !loading && props.showFileName" class="text-xs text-content-secondary">{{ fileName }}</span>
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

const fileName = ref('')
const loading = ref(false)
const id = computed(() => props.inputId)

/**
 * 尺寸對應的幾何，高度一律取自 design tokens 的 control
 * （xs 24 / sm 32 / md 40 / lg 48px），與 ChptButton 及其他控制項一致。
 *
 * 原本是自己寫一組 padding（py-1.5 + text-xs 只有 28px），全庫掃出 20 種
 * 不同組合，並排時高度對不齊 —— 這就是畫面看起來參差的來源。
 * 高度改由 h-control-* 決定，文字靠 flex 置中，因此不需要 py-*。
 */
const sizeClasses: Record<UploaderSize, string> = {
  sm: 'h-control-sm px-3 text-sm rounded-md',
  md: 'h-control-md px-4 text-base rounded-lg',
}

const iconValues: Record<UploaderSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
}

const variantClasses: Record<UploaderVariant, string> = {
  'solid-green': 'bg-success-solid hover:bg-success-solid text-white border border-transparent',
  'solid-blue': 'bg-accent-solid hover:bg-accent-solid-hover text-white border border-transparent',
  'solid-red': 'bg-danger-solid hover:bg-red-700 text-white border border-transparent',
  'soft-blue': 'bg-info-subtle hover:bg-info-subtle-hover text-accent border border-info-subtle-border hover:border-info-subtle-border',
  'outline-gray': 'bg-surface-primary hover:bg-surface-secondary text-content-primary border border-stroke-default hover:border-stroke-medium',
  ghost: 'bg-transparent hover:bg-surface-tertiary/10 text-content-disabled hover:text-white border border-transparent',
  primary: 'bg-accent-solid hover:bg-accent-solid-hover text-white border border-transparent',
}

/**
 * 檔案簽章（magic number）白名單。
 *
 * ⚠️ input 上的 accept=".xlsx,.xls" 只是檔案選擇器的過濾提示，使用者切成
 *    「所有檔案」照樣選得到任何東西，拖放更是完全繞過。而 XLSX.read 對垃圾
 *    位元組非常寬容：不會拋錯，而是回傳一份只有空白 Sheet1 的 workbook。
 *    結果把 .txt 改名成 .xlsx 丟進來，使用端收到的是 upload-success 加一個
 *    空陣列 —— 看起來像「這個 Excel 是空的」，而不是「這根本不是 Excel」。
 *    兩者要採取的行動完全不同，所以必須在解析前先擋掉。
 */
const FILE_SIGNATURES: readonly { readonly bytes: readonly number[]; readonly label: string }[] = [
  // .xlsx / .xlsm：本質是 ZIP，開頭為 PK\x03\x04
  { bytes: [0x50, 0x4b, 0x03, 0x04], label: 'xlsx' },
  // .xls（BIFF8）：OLE2 複合文件
  { bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], label: 'xls' },
]

/** 位元組開頭是否符合任一支援的格式 */
function hasSupportedSignature(data: Uint8Array): boolean {
  return FILE_SIGNATURES.some(
    ({ bytes }) =>
      data.length >= bytes.length && bytes.every((b, i) => data[i] === b)
  )
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

      if (!hasSupportedSignature(data)) {
        throw new Error('檔案格式不是 Excel（僅支援 .xlsx 與 .xls）')
      }

      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      // 簽章對了但一張工作表都沒有：sheet_to_json(undefined) 會拋出
      // 難以理解的內部錯誤，這裡先換成使用端看得懂的訊息。
      if (firstSheetName === undefined) {
        throw new Error('這個 Excel 檔沒有任何工作表')
      }
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      emit('data-loaded', jsonData)
      emit('upload-success')
      // 清空 input 讓同一個檔案可以再選一次（change 事件才會再觸發）。
      //
      // ⚠️ 原本這裡也把 fileName 清掉了，於是
      //    v-if="fileName && !loading && showFileName" 永遠不成立：
      //    上傳中 !loading 是 false，上傳完 fileName 又是空的 ——
      //    showFileName 這個 prop 從來沒有任何效果。成功後保留檔名才符合
      //    「顯示已匯入哪個檔案」的原意。
      input.value = ''
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
