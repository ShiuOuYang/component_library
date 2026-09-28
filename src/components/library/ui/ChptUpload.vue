<template>
  <div class="flex flex-col gap-2" :class="props.fullWidth ? 'w-full' : ''">
    <span v-if="props.label" :id="labelId" class="text-sm text-content-secondary">{{ props.label }}</span>

    <!--
      拖放區。整塊是 <label>：點任何地方都會開啟檔案選擇。
      input 用 sr-only 藏起來但保留在 Tab 順序裡（display: none 的 input 鍵盤完全操作不到），
      input 取得焦點時由 peer-focus-visible 在拖放區畫焦點框。
    -->
    <input
      :id="inputId"
      ref="input"
      type="file"
      class="peer sr-only"
      :accept="props.accept || undefined"
      :multiple="props.multiple"
      :disabled="isDisabled"
      :aria-labelledby="props.label ? labelId : undefined"
      :aria-describedby="hintId"
      @change="onPick"
    />
    <label
      v-if="props.drag"
      :for="inputId"
      class="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-stroke-focus peer-focus-visible:ring-offset-2"
      :class="[
        isDisabled
          ? 'cursor-not-allowed border-stroke-light bg-surface-tertiary text-content-disabled'
          : dragging
            ? 'cursor-copy border-stroke-focus bg-accent-subtle text-accent-on-subtle'
            : 'cursor-pointer border-stroke-default bg-surface-secondary text-content-secondary hover:border-stroke-focus hover:bg-accent-subtle',
      ]"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <ChptIcon :size="32" :weight="300" color="current">{{ dragging ? 'file_download' : 'cloud_upload' }}</ChptIcon>
      <span class="text-sm">
        <template v-if="dragging">放開以加入檔案</template>
        <template v-else>拖曳檔案到這裡，或<span class="font-medium text-accent underline underline-offset-2">點擊選擇</span></template>
      </span>
      <span :id="hintId" class="text-xs text-content-tertiary">{{ hintText }}</span>
    </label>
    <div v-else class="flex items-center gap-2">
      <label
        :for="inputId"
        class="inline-flex h-control-sm items-center gap-1.5 rounded-md border border-stroke-default bg-surface-primary px-3 text-sm font-medium text-content-primary shadow-sm transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-stroke-focus"
        :class="isDisabled ? 'cursor-not-allowed text-content-disabled' : 'cursor-pointer hover:bg-surface-secondary'"
      >
        <ChptIcon :size="16" color="current">upload</ChptIcon>
        {{ props.buttonText }}
      </label>
      <span :id="hintId" class="text-xs text-content-tertiary">{{ hintText }}</span>
    </div>

    <!-- 被拒絕的檔案（格式、大小、數量不符） -->
    <ul v-if="rejected.length" role="alert" class="flex flex-col gap-0.5 text-xs text-danger">
      <li v-for="r in rejected" :key="r.name + r.reason">{{ r.name }}：{{ r.reason }}</li>
    </ul>

    <!-- 檔案清單 -->
    <ul v-if="files.length" class="flex flex-col gap-1.5" aria-label="已選擇的檔案">
      <li
        v-for="file in files"
        :key="file.uid"
        class="flex flex-col gap-1 rounded-md border px-3 py-2"
        :class="file.status === 'error' ? 'border-danger-subtle-border bg-danger-subtle' : 'border-stroke-light bg-surface-primary'"
      >
        <div class="flex items-center gap-2 min-w-0">
          <ChptIcon :size="18" color="current" :class="statusColor(file)">{{ statusIcon(file) }}</ChptIcon>
          <span class="min-w-0 flex-1 truncate text-sm text-content-primary" :title="file.name">{{ file.name }}</span>
          <span class="flex-shrink-0 text-xs tabular-nums text-content-tertiary">{{ formatSize(file.size) }}</span>
          <button
            v-if="file.status === 'error' && props.request"
            type="button"
            class="inline-flex h-control-xs min-w-control-xs items-center justify-center rounded text-content-secondary hover:bg-surface-tertiary hover:text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
            :aria-label="`重試上傳 ${file.name}`"
            @click="upload(file)"
          >
            <ChptIcon :size="16" color="current">refresh</ChptIcon>
          </button>
          <button
            v-if="!props.disabled"
            type="button"
            class="inline-flex h-control-xs min-w-control-xs items-center justify-center rounded text-content-secondary hover:bg-surface-tertiary hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
            :aria-label="file.status === 'uploading' ? `取消上傳 ${file.name}` : `移除 ${file.name}`"
            @click="remove(file)"
          >
            <ChptIcon :size="16" color="current">close</ChptIcon>
          </button>
        </div>
        <div
          v-if="file.status === 'uploading'"
          role="progressbar"
          :aria-label="`${file.name} 上傳進度`"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="Math.round(file.percent ?? 0)"
          class="h-1 overflow-hidden rounded-full bg-surface-muted"
        >
          <div class="h-full rounded-full bg-accent-solid transition-[width] duration-200" :style="{ width: `${file.percent ?? 0}%` }"></div>
        </div>
        <p v-if="file.status === 'error' && file.error" class="text-xs text-danger-on-subtle">{{ file.error }}</p>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, useId, useTemplateRef, watch } from 'vue'
import ChptIcon from './ChptIcon.vue'

/**
 * ChptUpload（CHPT 主題） - 檔案上傳
 *
 * 用途：一般的檔案上傳（附件、圖片、報表）。要把 Excel 讀成資料請用 ChptExcelUploader。
 *
 * v-model 是檔案清單（UploadFile[]），每個檔案有自己的狀態：
 *   ready（選好還沒傳）→ uploading（有進度）→ success / error
 *
 * 上傳方式由呼叫端決定：給 request 函式（拿到 File、進度回呼與 AbortSignal），
 * 元件負責排程、進度、取消與重試；不給 request 就只收集檔案，送出表單時再一起處理。
 *
 * 做了哪些常漏掉的事：
 *   - 選檔前就擋掉格式、大小、數量不符的檔案，並說明原因（role="alert"）
 *     accept 只是檔案對話框的「建議」，使用者可以選「所有檔案」，拖放更是完全不受限
 *   - 上傳中按移除會真的中止請求（AbortSignal），不是只把它從清單拿掉
 *   - 拖放區整塊可點、可用鍵盤開啟；拖曳進出子元素時不會閃爍
 */

export type UploadStatus = 'ready' | 'uploading' | 'success' | 'error'

export interface UploadFile {
  uid: string
  name: string
  size: number
  type: string
  status: UploadStatus
  /** 0~100 */
  percent?: number
  /** 失敗訊息 */
  error?: string
  /** 伺服器回應（request 的 resolve 值） */
  response?: unknown
  /** 原始檔案（已上傳過的檔案可以沒有） */
  raw?: File
  /** 已存在的檔案網址（編輯既有資料時） */
  url?: string
}

export type UploadRequest = (
  file: File,
  options: { onProgress: (percent: number) => void; signal: AbortSignal }
) => Promise<unknown>

interface ChptUploadProps {
  /** v-model：檔案清單 */
  modelValue?: UploadFile[]
  /** 允許的檔案類型（同 input accept：'.xlsx,.csv'、'image/*'） */
  accept?: string
  /** 可多選 */
  multiple?: boolean
  /** 單檔大小上限（bytes） */
  maxSize?: number
  /** 清單最多幾個檔案 */
  maxCount?: number
  /** 上傳函式；不給就只收集檔案 */
  request?: UploadRequest
  /** 選好檔案後立即上傳（有 request 時） */
  autoUpload?: boolean
  /** 拖放區樣式；false 時只有一顆按鈕 */
  drag?: boolean
  /** 標籤 */
  label?: string
  /** 按鈕文字（drag=false 時） */
  buttonText?: string
  /** 補充說明；不給時依 accept / maxSize / maxCount 自動產生 */
  hint?: string
  disabled?: boolean
  fullWidth?: boolean
}

const props = withDefaults(defineProps<ChptUploadProps>(), {
  modelValue: () => [],
  accept: '',
  multiple: false,
  maxSize: undefined,
  maxCount: undefined,
  request: undefined,
  autoUpload: true,
  drag: true,
  label: '',
  buttonText: '選擇檔案',
  hint: '',
  disabled: false,
  fullWidth: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', files: UploadFile[]): void
  /** 加入的檔案（通過檢查的） */
  (e: 'add', files: UploadFile[]): void
  (e: 'remove', file: UploadFile): void
  /** 被拒絕的檔案與原因 */
  (e: 'reject', file: File, reason: string): void
  (e: 'success', file: UploadFile, response: unknown): void
  (e: 'error', file: UploadFile, error: unknown): void
}>()

const uid = useId()
const inputId = `${uid}-input`
const labelId = `${uid}-label`
const hintId = `${uid}-hint`
const input = useTemplateRef<HTMLInputElement>('input')

const dragging = ref(false)
/** dragenter / dragleave 會在經過子元素時成對觸發：用計數判斷是否真的離開 */
let dragDepth = 0
const rejected = ref<{ name: string; reason: string }[]>([])
const controllers = new Map<string, AbortController>()

/**
 * 本地的檔案清單。
 * 上傳進度是非同步、而且可能好幾個檔案同時在更新；props 要等父元件重繪後才會同步回來，
 * 直接拿 props.modelValue 改會互相蓋掉。所以以本地清單為準，
 * 父元件傳進「不是我們剛送出去的」陣列時（例如整個清空）才同步。
 */
const files = shallowRef<UploadFile[]>([...props.modelValue])
let lastEmitted: UploadFile[] | null = null
watch(
  () => props.modelValue,
  (v) => {
    if (v !== lastEmitted) files.value = [...v]
  }
)
function current(): UploadFile[] {
  return files.value
}
function commit(next: UploadFile[]): void {
  lastEmitted = next
  files.value = next
  emit('update:modelValue', next)
}

const isFull = computed(() => props.maxCount !== undefined && files.value.length >= props.maxCount)
const isDisabled = computed(() => props.disabled || isFull.value)

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let v = bytes / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`
}

const hintText = computed(() => {
  if (props.hint) return props.hint
  const parts: string[] = []
  if (props.accept) parts.push(`格式：${props.accept.split(',').map((s) => s.trim()).join('、')}`)
  if (props.maxSize) parts.push(`單檔上限 ${formatSize(props.maxSize)}`)
  if (props.maxCount) parts.push(isFull.value ? `已達 ${props.maxCount} 個檔案上限` : `最多 ${props.maxCount} 個檔案`)
  return parts.join('，')
})

/** 檔案是否符合 accept（副檔名 .xlsx、MIME image/*、完整 MIME） */
function matchesAccept(file: File): boolean {
  if (!props.accept) return true
  const name = file.name.toLowerCase()
  const type = (file.type || '').toLowerCase()
  return props.accept
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => {
      if (rule.startsWith('.')) return name.endsWith(rule)
      if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1))
      return type === rule
    })
}

let seq = 0
function toUploadFile(file: File): UploadFile {
  return { uid: `${uid}-${++seq}`, name: file.name, size: file.size, type: file.type, status: 'ready', raw: file }
}

function addFiles(list: FileList | File[]): void {
  if (props.disabled) return
  rejected.value = []
  const incoming = Array.from(list)
  const picked = props.multiple ? incoming : incoming.slice(0, 1)
  const accepted: UploadFile[] = []
  const base = props.multiple ? current() : []
  for (const file of picked) {
    let reason = ''
    if (!matchesAccept(file)) reason = `格式不符（允許 ${props.accept}）`
    else if (props.maxSize !== undefined && file.size > props.maxSize) reason = `超過大小上限 ${formatSize(props.maxSize)}`
    else if (props.maxCount !== undefined && base.length + accepted.length >= props.maxCount) reason = `超過 ${props.maxCount} 個檔案上限`
    if (reason) {
      rejected.value.push({ name: file.name, reason })
      emit('reject', file, reason)
    } else {
      accepted.push(toUploadFile(file))
    }
  }
  if (!props.multiple) {
    // 單檔模式：新檔案取代舊的（進行中的上傳一併取消）
    for (const f of current()) controllers.get(f.uid)?.abort()
  }
  if (accepted.length) {
    commit([...base, ...accepted])
    emit('add', accepted)
    if (props.request && props.autoUpload) for (const f of accepted) upload(f)
  }
}

function patch(target: string, changes: Partial<UploadFile>): UploadFile | undefined {
  let updated: UploadFile | undefined
  const next = current().map((f) => (f.uid === target ? (updated = { ...f, ...changes }) : f))
  if (updated) commit(next)
  return updated
}

/** 上傳（也用於重試）；回傳是否成功 */
async function upload(file: UploadFile): Promise<boolean> {
  if (!props.request || !file.raw) return false
  controllers.get(file.uid)?.abort()
  const controller = new AbortController()
  controllers.set(file.uid, controller)
  patch(file.uid, { status: 'uploading', percent: 0, error: undefined })
  try {
    const response = await props.request(file.raw, {
      signal: controller.signal,
      onProgress: (p) => {
        if (!controller.signal.aborted) patch(file.uid, { percent: Math.max(0, Math.min(100, p)) })
      },
    })
    if (controller.signal.aborted) return false
    const done = patch(file.uid, { status: 'success', percent: 100, response })
    if (done) emit('success', done, response)
    return true
  } catch (err) {
    if (controller.signal.aborted) return false
    const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '上傳失敗'
    const failed = patch(file.uid, { status: 'error', error: message })
    if (failed) emit('error', failed, err)
    return false
  } finally {
    if (controllers.get(file.uid) === controller) controllers.delete(file.uid)
  }
}

function remove(file: UploadFile): void {
  // 上傳中：真的中止請求，不是只從清單拿掉
  controllers.get(file.uid)?.abort()
  controllers.delete(file.uid)
  commit(current().filter((f) => f.uid !== file.uid))
  emit('remove', file)
}

function onPick(event: Event): void {
  const el = event.target as HTMLInputElement
  if (el.files?.length) addFiles(el.files)
  // 清空，否則再選同一個檔案不會觸發 change
  el.value = ''
}

function onDragEnter(): void {
  if (isDisabled.value) return
  dragDepth++
  dragging.value = true
}
function onDragOver(event: DragEvent): void {
  if (event.dataTransfer) event.dataTransfer.dropEffect = isDisabled.value ? 'none' : 'copy'
}
function onDragLeave(): void {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragging.value = false
}
function onDrop(event: DragEvent): void {
  dragDepth = 0
  dragging.value = false
  if (isDisabled.value) return
  const list = event.dataTransfer?.files
  if (list?.length) addFiles(list)
}

function statusIcon(f: UploadFile): string {
  return { ready: 'draft', uploading: 'progress_activity', success: 'check_circle', error: 'error' }[f.status]
}
function statusColor(f: UploadFile): string {
  return {
    ready: 'text-content-tertiary',
    uploading: 'text-accent animate-spin',
    success: 'text-success',
    error: 'text-danger',
  }[f.status]
}

onBeforeUnmount(() => {
  for (const c of controllers.values()) c.abort()
})

defineExpose({
  /** 開啟檔案選擇 */
  open: () => input.value?.click(),
  /** 上傳所有還沒上傳的檔案（autoUpload=false 時手動觸發）；回傳是否全部成功 */
  submit: async () => {
    const pending = current().filter((f) => f.status === 'ready' || f.status === 'error')
    const results = await Promise.all(pending.map((f) => upload(f)))
    return results.every(Boolean)
  },
  /** 以程式加入檔案（例如從剪貼簿貼上） */
  addFiles,
})
</script>
