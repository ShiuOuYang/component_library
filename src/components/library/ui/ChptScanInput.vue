<template>
  <div class="chpt-scan-input flex flex-col gap-1" :class="props.fullWidth ? 'w-full' : ''">
    <label v-if="props.label" :for="id" class="text-sm text-content-secondary whitespace-nowrap">{{ props.label }}</label>

    <div class="flex items-center gap-2" :class="props.fullWidth ? 'w-full' : 'self-start'">
      <div class="relative flex min-w-0 flex-1 items-center">
        <ChptIcon :size="18" class="pointer-events-none absolute left-2">barcode_scanner</ChptIcon>
        <input
          :id="id"
          ref="inputRef"
          v-model="text"
          type="text"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          :inputmode="props.hideKeyboard ? 'none' : undefined"
          :placeholder="props.placeholder ?? t.scanInput.placeholder"
          :disabled="props.disabled"
          :aria-invalid="invalid ? 'true' : undefined"
          :aria-describedby="[describedBy, statusId].filter(Boolean).join(' ') || undefined"
          :aria-required="required || undefined"
          class="w-full rounded-md border pl-8 font-mono shadow-sm transition-colors focus:outline-none focus:ring-1"
          :class="[
            sizeClass,
            invalid || lastResult?.status === 'rejected'
              ? 'border-danger focus:border-danger focus:ring-danger'
              : 'border-stroke-default focus:border-stroke-focus focus:ring-stroke-focus',
            props.disabled ? 'cursor-not-allowed bg-surface-tertiary text-content-disabled' : 'bg-surface-primary',
          ]"
          @keydown="onKeydown"
          @input="onInput"
          @compositionstart="onCompositionStart"
          @blur="onBlur"
        />
      </div>
      <ChptButton
        v-if="props.showSubmit"
        :size="size === 'xl' ? 'lg' : size"
        color="primary"
        :disabled="props.disabled || !text.trim()"
        @click="submitCurrent"
      >{{ t.scanInput.submit }}</ChptButton>
    </div>

    <!--
      狀態：成功用 polite（不打斷），錯誤用 role=alert（立刻念）。
      ⚠️ 兩個區域都一直在 DOM 裡、只換文字 —— live region 動態插入時，部分螢幕閱讀器不會念第一則
    -->
    <div :id="statusId" class="min-h-[1.25rem] text-xs">
      <p aria-live="polite" class="flex items-center gap-1" :class="okClass">
        <template v-if="lastResult && lastResult.status !== 'rejected'">
          <ChptIcon :size="14" color="current">{{ lastResult.status === 'duplicate' ? 'warning' : 'check_circle' }}</ChptIcon>
          {{ lastResult.message }}
        </template>
        <template v-else-if="imeWarning">
          <ChptIcon :size="14" color="current">keyboard</ChptIcon>
          {{ t.scanInput.imeHint }}
        </template>
      </p>
      <p role="alert" class="flex items-center gap-1 text-danger">
        <template v-if="lastResult?.status === 'rejected'">
          <ChptIcon :size="14" color="current">error</ChptIcon>
          {{ lastResult.message }}
        </template>
        <template v-else-if="props.errorText">{{ props.errorText }}</template>
      </p>
    </div>

    <!-- 掃描紀錄：最新的在最上面 -->
    <div v-if="props.showHistory && history.length" class="rounded-md border border-stroke-light">
      <div class="flex items-center justify-between border-b border-stroke-light px-3 py-1.5 text-xs text-content-secondary">
        <span>{{ t.scanInput.historyCount(history.length) }}</span>
        <button type="button" class="rounded px-1.5 py-0.5 text-accent hover:bg-accent-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus" @click="clearHistory">
          {{ t.scanInput.clearHistory }}
        </button>
      </div>
      <ol class="max-h-48 overflow-y-auto text-sm" :aria-label="t.scanInput.history">
        <li v-for="item in history" :key="item.id" class="flex items-center gap-2 border-b border-stroke-light px-3 py-1.5 last:border-b-0">
          <ChptIcon :size="16" :color="ITEM_STYLE[item.status].color">{{ ITEM_STYLE[item.status].icon }}</ChptIcon>
          <span class="min-w-0 flex-1 truncate font-mono" :class="item.status === 'rejected' ? 'text-content-tertiary line-through' : 'text-content-primary'">{{ item.value || item.raw }}</span>
          <span class="sr-only">{{ statusText(item.status) }}</span>
          <span class="shrink-0 rounded bg-surface-tertiary px-1.5 text-[11px] text-content-secondary">{{ item.source === 'scanner' ? t.scanInput.scanner : t.scanInput.manual }}</span>
          <time class="shrink-0 tabular-nums text-xs text-content-tertiary" :datetime="item.at.toISOString()">{{ timeFormat.format(item.at) }}</time>
        </li>
      </ol>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useId, useTemplateRef, watch } from 'vue'
import ChptIcon from './ChptIcon.vue'
import ChptButton from './ChptButton.vue'
import { resolveSize, useConfig, useLocale } from '../shared/config'
import { useFormField } from '../shared/formContext'
import { classifyKeystrokes, isCharacterKey, isEditableTarget, ScanBuffer, type ScanSource } from '../shared/scanDetector'
import type { ComponentSize } from '../shared/types/ui.types'

/**
 * ChptScanInput（CHPT 主題） - 條碼掃描輸入
 *
 * 產線的掃描站：掃描槍掃一下就送出、清空、繼續掃下一個，不用碰滑鼠。
 *   - 分辨掃描槍與手打（按鍵速度），可設定不接受手打（allowManual: false）
 *   - 重複條碼：允許 / 警告 / 拒絕（duplicate），可只在一段時間內算重複（duplicateWindow）
 *   - 格式驗證（pattern / validator）、最短長度、統一大小寫（transform）
 *   - 全頁接收（captureGlobal）：焦點不在任何輸入框時，掃描槍的輸入也收得到
 *   - 偵測到中文輸入法時提示切換（輸入法會把掃描槍打的字吃掉，這是掃描站最常見的「掃不進去」）
 *   - 回饋：狀態文字（螢幕閱讀器會念）、可選的嗶聲與震動、最近的掃描紀錄
 */

export type ScanStatus = 'ok' | 'duplicate' | 'rejected'
export type ScanRejectReason = 'manual' | 'tooShort' | 'invalid' | 'duplicate'

export interface ScanResult {
  /** 整理後的條碼（trim、transform 之後） */
  value: string
  /** 原始輸入 */
  raw: string
  source: ScanSource
  /** ok：接受；duplicate：重複但仍接受（duplicate='warn'）；rejected：拒絕 */
  status: ScanStatus
  /** 拒絕的原因 */
  reason?: ScanRejectReason
  /** 顯示給操作員的訊息 */
  message: string
  at: Date
}

interface HistoryItem extends ScanResult {
  id: number
}

export interface ChptScanInputProps {
  label?: string
  placeholder?: string
  size?: ComponentSize
  disabled?: boolean
  fullWidth?: boolean
  /** 掛載時自動聚焦（掃描站通常要） */
  autofocus?: boolean
  /** 點到頁面空白處而失去焦點時，自動聚焦回來（掃描站的「誤觸」）；焦點移到其他可操作元素時不搶 */
  keepFocus?: boolean
  /** 焦點不在任何輸入框時，也接收掃描槍的輸入 */
  captureGlobal?: boolean
  /** 接受手動輸入（false 時只接受掃描槍） */
  allowManual?: boolean
  /** 送出的按鍵（掃描槍設定的結尾字元）；Tab 只在有輸入內容時才攔下 */
  submitKeys?: string[]
  /** 平均按鍵間隔不超過這個值（ms）才算掃描槍 */
  scanSpeed?: number
  /** 條碼最短長度 */
  minLength?: number
  /** 格式（正規式或字串）；不符合時拒絕 */
  pattern?: RegExp | string | null
  /** 自訂驗證：通過回傳 true，否則回傳要顯示的訊息 */
  validator?: ((value: string) => true | string) | null
  /** 去掉前後空白（掃描槍常帶結尾的空白或換行） */
  trim?: boolean
  /** 統一大小寫或自訂轉換（例如去掉前綴碼） */
  transform?: 'upper' | 'lower' | ((value: string) => string) | null
  /** 重複條碼：allow 照常接受、warn 接受但提示、reject 拒絕 */
  duplicate?: 'allow' | 'warn' | 'reject'
  /** 多久之內算重複（ms）；0 為整個紀錄期間（直到 clearHistory） */
  duplicateWindow?: number
  /** 顯示最近的掃描紀錄 */
  showHistory?: boolean
  maxHistory?: number
  /** 嗶聲回饋（成功一聲高音、失敗兩聲低音） */
  sound?: boolean
  /** 震動回饋（手持裝置） */
  vibrate?: boolean
  /** 不跳出螢幕鍵盤（手持掃描器、平板） */
  hideKeyboard?: boolean
  /** 顯示「送出」鈕（觸控裝置手動輸入用） */
  showSubmit?: boolean
  /** 錯誤訊息（表單驗證用） */
  errorText?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptScanInputProps>(), {
  label: '',
  placeholder: undefined,
  size: undefined,
  disabled: false,
  fullWidth: true,
  autofocus: true,
  keepFocus: false,
  captureGlobal: false,
  allowManual: true,
  submitKeys: () => ['Enter'],
  scanSpeed: 40,
  minLength: 1,
  pattern: null,
  validator: null,
  trim: true,
  transform: null,
  duplicate: 'warn',
  duplicateWindow: 0,
  showHistory: false,
  maxHistory: 10,
  sound: false,
  vibrate: false,
  hideKeyboard: false,
  showSubmit: false,
  errorText: '',
})

const emit = defineEmits<{
  /** 接受的條碼（含 duplicate='warn' 時的重複） */
  (e: 'scan', result: ScanResult): void
  /** 拒絕的輸入（手動、太短、格式不符、重複） */
  (e: 'reject', result: ScanResult): void
  /** 偵測到中文輸入法（組字）—— 掃描槍的輸入會被吃掉 */
  (e: 'ime-detected'): void
}>()

const config = useConfig()
const size = computed(() => resolveSize(props.size, config, 'md'))
const sizeClass = computed(
  () =>
    ({
      xs: 'text-xs h-control-xs pr-2',
      sm: 'text-sm h-control-sm pr-3',
      md: 'text-base h-control-md pr-4',
      lg: 'text-lg h-control-lg pr-6',
      xl: 'text-xl h-control-xl pr-5',
    })[size.value]
)

const { id, invalid, describedBy, required } = useFormField(() => props.errorText)
const statusId = `${useId()}-status`
const inputRef = useTemplateRef<HTMLInputElement>('inputRef')

const text = ref('')
const history = shallowRef<HistoryItem[]>([])
const lastResult = shallowRef<ScanResult | null>(null)
const imeWarning = ref(false)
let seq = 0

// ---------------------------------------------------------------------------
// 判斷這次輸入是掃描還是手打
// ---------------------------------------------------------------------------
let keyTimes: number[] = []
/** 用了方向鍵、刪除、貼上、輸入法 —— 一定是人 */
let edited = false

function resetEntry(): void {
  keyTimes = []
  edited = false
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing || event.keyCode === 229) {
    onCompositionStart()
    return
  }
  if (props.submitKeys.includes(event.key)) {
    // Tab 沒有內容時照常移動焦點
    if (event.key === 'Tab' && !text.value) return
    event.preventDefault()
    submitCurrent()
    return
  }
  if (isCharacterKey(event)) keyTimes.push(now())
  else if (!['Shift', 'CapsLock'].includes(event.key)) edited = true
}

function onInput(event: Event): void {
  const type = (event as InputEvent).inputType
  if (type && type !== 'insertText') edited = true // 貼上、拖放、自動完成、刪除
  // 讀輸入框本身的值：這個 handler 比 v-model 先執行，text.value 這時還是上一次的值
  if (!(event.target as HTMLInputElement).value) resetEntry()
}

function onCompositionStart(): void {
  edited = true
  if (!imeWarning.value) emit('ime-detected')
  imeWarning.value = true
}

function submitCurrent(): void {
  const source: ScanSource = edited ? 'manual' : classifyKeystrokes(keyTimes, { maxInterval: props.scanSpeed })
  const raw = text.value
  text.value = ''
  resetEntry()
  process(raw, source)
  inputRef.value?.focus()
}

// ---------------------------------------------------------------------------
// 驗證、重複、紀錄、回饋
// ---------------------------------------------------------------------------
/** 接受過的條碼（判斷重複用） */
let accepted: { value: string; at: number }[] = []

function normalize(raw: string): string {
  let v = props.trim ? raw.trim() : raw
  if (props.transform === 'upper') v = v.toUpperCase()
  else if (props.transform === 'lower') v = v.toLowerCase()
  else if (typeof props.transform === 'function') v = props.transform(v)
  return v
}

function patternOk(value: string): boolean {
  if (!props.pattern) return true
  const re = typeof props.pattern === 'string' ? new RegExp(`^(?:${props.pattern})$`) : props.pattern
  re.lastIndex = 0
  return re.test(value)
}

function isDuplicate(value: string, at: number): boolean {
  return accepted.some((a) => a.value === value && (props.duplicateWindow <= 0 || at - a.at <= props.duplicateWindow))
}

function process(raw: string, source: ScanSource): ScanResult | null {
  const value = normalize(raw)
  if (!value) return null
  const at = new Date()
  const s = t.value.scanInput
  const reject = (reason: ScanRejectReason, message: string): ScanResult => ({ value, raw, source, status: 'rejected', reason, message, at })

  let result: ScanResult
  if (source === 'manual' && !props.allowManual) result = reject('manual', s.manualNotAllowed)
  else if (value.length < props.minLength) result = reject('tooShort', s.tooShort(props.minLength))
  else if (!patternOk(value)) result = reject('invalid', s.invalid(value))
  else {
    const custom = props.validator ? props.validator(value) : true
    if (custom !== true) result = reject('invalid', custom || s.invalid(value))
    else if (isDuplicate(value, at.getTime())) {
      result =
        props.duplicate === 'reject'
          ? reject('duplicate', s.duplicate(value))
          : { value, raw, source, status: props.duplicate === 'warn' ? 'duplicate' : 'ok', message: props.duplicate === 'warn' ? s.duplicateWarn(value) : s.ok(value), at }
    } else {
      result = { value, raw, source, status: 'ok', message: s.ok(value), at }
    }
  }

  if (result.status !== 'rejected') accepted.push({ value, at: at.getTime() })
  history.value = [{ ...result, id: ++seq }, ...history.value].slice(0, Math.max(0, props.maxHistory))
  lastResult.value = result
  imeWarning.value = false
  feedback(result.status)
  if (result.status === 'rejected') emit('reject', result)
  else emit('scan', result)
  return result
}

// 嗶聲：WebAudio（不需要音檔）。AudioContext 在第一次使用時才建立（瀏覽器要求在使用者操作之後）
let audio: AudioContext | null = null
function beep(frequency: number, duration: number, delay = 0): void {
  const Ctx = typeof window !== 'undefined' ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined
  if (!Ctx) return
  try {
    audio ??= new Ctx()
    const start = audio.currentTime + delay
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0.15, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
    osc.connect(gain).connect(audio.destination)
    osc.start(start)
    osc.stop(start + duration)
  } catch {
    /* 音效失敗不影響掃描 */
  }
}

function feedback(status: ScanStatus): void {
  if (props.sound) {
    if (status === 'rejected') {
      beep(220, 0.18)
      beep(220, 0.18, 0.22)
    } else {
      beep(status === 'duplicate' ? 660 : 1320, 0.09)
    }
  }
  if (props.vibrate && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(status === 'rejected' ? [120, 80, 120] : 40)
  }
}

const okClass = computed(() => (lastResult.value?.status === 'duplicate' || (!lastResult.value && imeWarning.value) ? 'text-warning' : 'text-success'))

const ITEM_STYLE: Record<ScanStatus, { icon: string; color: string }> = {
  ok: { icon: 'check_circle', color: 'success' },
  duplicate: { icon: 'warning', color: 'warning' },
  rejected: { icon: 'cancel', color: 'danger' },
}
function statusText(status: ScanStatus): string {
  return t.value.scanInput.status[status]
}

const timeFormat = computed(() => new Intl.DateTimeFormat(t.value.code, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))

function clearHistory(): void {
  history.value = []
  accepted = []
  lastResult.value = null
  inputRef.value?.focus()
}

// ---------------------------------------------------------------------------
// 焦點與全頁接收
// ---------------------------------------------------------------------------
function onBlur(): void {
  if (!props.keepFocus || props.disabled) return
  // 等焦點真的移到下一個元素再判斷：移到其他可操作的元素（按鈕、別的欄位）時不搶回來
  setTimeout(() => {
    const active = document.activeElement
    if (!active || active === document.body) inputRef.value?.focus()
  }, 0)
}

const buffer = new ScanBuffer(500)

function onGlobalKeydown(event: KeyboardEvent): void {
  if (props.disabled || event.target === inputRef.value || isEditableTarget(event.target)) return
  if (props.submitKeys.includes(event.key)) {
    const value = buffer.value
    if (value && classifyKeystrokes(buffer.timestamps, { maxInterval: props.scanSpeed }) === 'scanner') {
      event.preventDefault()
      event.stopPropagation()
      process(value, 'scanner')
    }
    buffer.clear()
    return
  }
  if (isCharacterKey(event)) buffer.push(event.key, now())
}

watch(
  () => props.captureGlobal,
  (on) => {
    if (typeof document === 'undefined') return
    if (on) document.addEventListener('keydown', onGlobalKeydown, true)
    else document.removeEventListener('keydown', onGlobalKeydown, true)
  },
  { immediate: true }
)

onMounted(() => {
  if (props.autofocus && !props.disabled) inputRef.value?.focus()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onGlobalKeydown, true)
  audio?.close().catch(() => {})
  audio = null
})

defineExpose({
  focus: () => inputRef.value?.focus(),
  /** 清除紀錄（也重置重複判斷） */
  clearHistory,
  /** 最近的紀錄（最新在前） */
  history,
  /**
   * 以程式送入一筆（例如相機掃碼、RFID 讀卡）；走同樣的驗證、重複判斷與回饋。
   * 回傳結果；空字串回傳 null
   */
  submit: (value: string, source: ScanSource = 'scanner') => process(value, source),
})
</script>
