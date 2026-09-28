<template>
  <span class="chpt-countdown inline-flex flex-col gap-0.5">
    <span v-if="props.title" class="text-sm text-content-secondary">{{ props.title }}</span>
    <!-- 每秒都在變的數字不放 live region（會一直打斷報讀）；改用 role="timer"，並在到期時報讀一次 -->
    <span
      role="timer"
      :aria-label="props.title ? `${props.title}：${spoken}` : spoken"
      class="font-semibold tabular-nums"
      :class="[sizeClass, urgent ? 'text-danger' : 'text-content-primary']"
    >
      <slot :parts="parts" :remaining="remaining" :text="display">{{ display }}</slot>
    </span>
    <span class="sr-only" aria-live="polite">{{ finished ? props.finishedText : '' }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

/**
 * ChptCountdown（CHPT 主題） - 倒數計時
 *
 * 保養倒數、換線倒數、報名截止：給目標時間（value），顯示剩餘時間。
 *
 * - 以「目標時間 − 現在」計算，不是每秒遞減一個計數器：分頁在背景被瀏覽器降頻、
 *   或電腦休眠醒來後，顯示的時間仍然正確
 * - format：'HH:mm:ss'、'D 天 HH:mm:ss'、'mm:ss' …（D / HH / mm / ss / SSS 會被取代）
 * - 剩餘時間少於 warningThreshold 時變紅
 * - 到期送出 finish 事件，並報讀一次 finishedText
 */

interface ChptCountdownProps {
  /** 目標時間（Date、毫秒時間戳或可被 Date 解析的字串） */
  value: Date | number | string
  title?: string
  format?: string
  /** 剩餘毫秒少於此值時顯示為警示色 */
  warningThreshold?: number
  finishedText?: string
  size?: 'sm' | 'md' | 'lg'
  /** 更新間隔（ms）；格式含毫秒時自動改用較短間隔 */
  interval?: number
}

const props = withDefaults(defineProps<ChptCountdownProps>(), {
  title: '',
  format: 'HH:mm:ss',
  warningThreshold: 0,
  finishedText: '時間到',
  size: 'md',
  interval: 1000,
})

const emit = defineEmits<{ (e: 'finish'): void; (e: 'change', remaining: number): void }>()

const target = computed(() => new Date(props.value).getTime())
const now = ref(Date.now())
const remaining = computed(() => Math.max(0, target.value - now.value))
const finished = computed(() => remaining.value === 0)
const urgent = computed(() => props.warningThreshold > 0 && !finished.value && remaining.value <= props.warningThreshold)

const parts = computed(() => {
  const ms = remaining.value
  const usesDays = props.format.includes('D')
  const days = usesDays ? Math.floor(ms / 86_400_000) : 0
  const hours = Math.floor((ms - days * 86_400_000) / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  const seconds = Math.floor((ms % 60_000) / 1000)
  const millis = ms % 1000
  return { days, hours, minutes, seconds, millis }
})

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

const display = computed(() => {
  const p = parts.value
  // 格式裡沒有 HH 時，小時併進分鐘（'mm:ss' 顯示 90:00 而不是 30:00）
  const minutes = props.format.includes('HH') ? p.minutes : p.minutes + p.hours * 60
  return props.format
    .replace('D', String(p.days))
    .replace('HH', pad(p.hours))
    .replace('mm', pad(minutes))
    .replace('ss', pad(p.seconds))
    .replace('SSS', pad(p.millis, 3))
})

/** 螢幕閱讀器用的完整說法（「1 小時 5 分 3 秒」），不是 01:05:03 */
const spoken = computed(() => {
  if (finished.value) return props.finishedText
  const p = parts.value
  const out: string[] = []
  if (p.days) out.push(`${p.days} 天`)
  if (p.hours) out.push(`${p.hours} 小時`)
  if (p.minutes) out.push(`${p.minutes} 分`)
  out.push(`${p.seconds} 秒`)
  return `剩餘 ${out.join(' ')}`
})

const sizeClass = computed(() => ({ sm: 'text-base', md: 'text-2xl', lg: 'text-4xl' })[props.size])

let timer: ReturnType<typeof setInterval> | null = null
function stop(): void {
  if (timer) clearInterval(timer)
  timer = null
}
function start(): void {
  stop()
  now.value = Date.now()
  if (finished.value) return
  const step = props.format.includes('SSS') ? Math.min(props.interval, 50) : props.interval
  timer = setInterval(() => {
    now.value = Date.now()
    emit('change', remaining.value)
    if (finished.value) {
      stop()
      emit('finish')
    }
  }, step)
}

watch(() => [props.value, props.interval, props.format], start, { immediate: true })
onBeforeUnmount(stop)

defineExpose({ remaining })
</script>
