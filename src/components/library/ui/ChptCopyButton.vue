<template>
  <span class="inline-flex">
  <button
    type="button"
    :aria-label="props.label ? undefined : copied ? `已複製：${ariaSubject}` : `複製：${ariaSubject}`"
    :title="copied ? props.copiedText : props.tooltip"
    :disabled="props.disabled"
    class="inline-flex items-center justify-center gap-1 rounded text-content-tertiary transition-colors hover:bg-surface-tertiary hover:text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:cursor-not-allowed disabled:opacity-50"
    :class="[props.label ? 'h-control-xs px-2 text-xs' : 'h-control-xs min-w-control-xs', copied ? '!text-success' : '']"
    @click="copy"
  >
    <ChptIcon :size="16" color="current">{{ copied ? 'check' : failed ? 'error' : 'content_copy' }}</ChptIcon>
    <span v-if="props.label">{{ copied ? props.copiedText : props.label }}</span>
  </button>
  <!-- 結果要唸出來：按鈕的文字變了但焦點沒動，螢幕閱讀器不會自己報讀。
       放在按鈕外面：放裡面會變成按鈕名稱的一部分（「已複製 已複製」） -->
  <span class="sr-only" aria-live="polite">{{ copied ? props.copiedText : failed ? '複製失敗' : '' }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import ChptIcon from './ChptIcon.vue'

/**
 * ChptCopyButton（CHPT 主題） - 複製到剪貼簿
 *
 * 放在工單號、序號、API 金鑰、程式碼旁邊。按下後圖示變勾勾 2 秒，並以 live region 報讀「已複製」。
 *
 * 用 navigator.clipboard；不支援（非 https、舊瀏覽器）時退回 execCommand('copy')，
 * 兩者都失敗才顯示錯誤圖示並送出 error 事件。
 */

interface ChptCopyButtonProps {
  /** 要複製的文字 */
  text: string
  /** 按鈕上的文字；不給時只有圖示 */
  label?: string
  /** 只有圖示時，螢幕閱讀器要唸的對象（「工單號」）；不給時唸出內容本身 */
  subject?: string
  tooltip?: string
  copiedText?: string
  /** 「已複製」狀態維持多久（ms） */
  resetAfter?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<ChptCopyButtonProps>(), {
  label: '',
  subject: '',
  tooltip: '複製',
  copiedText: '已複製',
  resetAfter: 2000,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'copy', text: string): void
  (e: 'error', error: unknown): void
}>()

const copied = ref(false)
const failed = ref(false)
const ariaSubject = computed(() => props.subject || props.text)
let timer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(timer))

function legacyCopy(text: string): boolean {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  const active = document.activeElement as HTMLElement | null
  ta.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  ta.remove()
  active?.focus()
  return ok
}

async function copy(): Promise<void> {
  if (props.disabled) return
  clearTimeout(timer)
  failed.value = false
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(props.text)
    else if (!legacyCopy(props.text)) throw new Error('execCommand copy failed')
    copied.value = true
    emit('copy', props.text)
  } catch (error) {
    // clipboard API 被權限擋下時再試一次舊方法
    if (legacyCopy(props.text)) {
      copied.value = true
      emit('copy', props.text)
    } else {
      failed.value = true
      emit('error', error)
    }
  }
  timer = setTimeout(() => {
    copied.value = false
    failed.value = false
  }, props.resetAfter)
}

defineExpose({ copy })
</script>
