<template>
  <div class="flex flex-col gap-2" role="group" :aria-label="props.label || t.timeScrubber.label">
    <!-- 工具列：上一個事件、播放、下一個事件、目前時間、倍速、範圍 -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex items-center gap-1">
        <ChptButton size="xs" is-outline icon="skip_previous" :aria-label="t.timeScrubber.prevEvent" :disabled="prevEventTime === null" @click="jumpEvent(-1)" />
        <ChptButton size="xs" :icon="isPlaying ? 'pause' : 'play_arrow'" :aria-label="isPlaying ? t.timeScrubber.pause : t.timeScrubber.play" :aria-pressed="isPlaying" @click="togglePlay()" />
        <ChptButton size="xs" is-outline icon="skip_next" :aria-label="t.timeScrubber.nextEvent" :disabled="nextEventTime === null" @click="jumpEvent(1)" />
      </div>
      <span class="min-w-[9rem] font-mono text-sm tabular-nums text-content-primary">{{ fmt(cursor) }}</span>
      <ChptSegmented :model-value="speed" :options="speedOptions" :aria-label="t.timeScrubber.speed" size="xs" @update:model-value="(v) => setSpeed(Number(v))" />
      <span v-if="props.range" class="ml-auto flex items-center gap-1 text-xs text-content-secondary">
        {{ t.timeScrubber.range(fmt(lo), fmt(hi)) }}
        <button
          type="button"
          class="rounded border border-stroke-default px-1.5 py-0.5 text-content-primary hover:bg-surface-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          @click="setRange(null)"
        >{{ t.timeScrubber.clearRange }}</button>
      </span>
    </div>

    <!-- 軌道 -->
    <div ref="track" class="relative h-16 select-none" style="touch-action: none" @pointerdown="onTrackDown" @pointermove="onTrackMove" @pointerup="onTrackUp" @pointercancel="onTrackUp">
      <!-- 底條與範圍 -->
      <div class="absolute inset-x-0 top-7 h-2 rounded-full bg-surface-tertiary"></div>
      <div v-if="props.range" class="absolute top-7 h-2" :style="{ left: pct(lo), width: pctW(lo, hi), background: 'color-mix(in srgb, rgb(var(--t-accent)) 22%, transparent)' }"></div>
      <div class="absolute top-7 h-2 rounded-l-full" :style="{ left: pct(lo), width: pctW(lo, cursor), background: 'rgb(var(--t-accent))' }"></div>

      <!-- 事件標記 -->
      <button
        v-for="(e, i) in markers"
        :key="e.key"
        type="button"
        class="group absolute top-0 z-[1] flex h-7 w-4 -translate-x-1/2 items-start justify-center focus:outline-none"
        :style="{ left: pct(e.ms) }"
        :aria-label="t.timeScrubber.eventLabel(fmt(e.ms), e.event.label)"
        :title="`${fmt(e.ms)} ${e.event.label}`"
        @pointerdown.stop
        @click="onEventClick(i)"
      >
        <span class="mt-1 h-2.5 w-2.5 rotate-45 rounded-[2px] ring-2 ring-transparent group-hover:scale-125 group-focus-visible:ring-stroke-focus" :style="{ background: e.color }"></span>
        <span class="absolute top-4 h-4 w-px" :style="{ background: e.color }" aria-hidden="true"></span>
      </button>

      <!-- 範圍把手 -->
      <template v-if="props.rangeSelectable">
        <span
          v-for="side in (['start', 'end'] as const)"
          :key="side"
          role="slider"
          tabindex="0"
          :aria-label="side === 'start' ? t.timeScrubber.rangeStart : t.timeScrubber.rangeEnd"
          :aria-valuemin="side === 'start' ? startMs : lo"
          :aria-valuemax="side === 'start' ? hi : endMs"
          :aria-valuenow="side === 'start' ? lo : hi"
          :aria-valuetext="fmt(side === 'start' ? lo : hi)"
          class="absolute top-[22px] z-[2] h-5 w-2 -translate-x-1/2 cursor-ew-resize rounded-sm border border-stroke-dark bg-surface-primary shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          :style="{ left: pct(side === 'start' ? lo : hi) }"
          @pointerdown.stop="onHandleDown($event, side)"
          @pointermove="onHandleMove"
          @pointerup="onHandleUp"
          @pointercancel="onHandleUp"
          @keydown="onRangeKeydown($event, side)"
        ></span>
      </template>

      <!-- 播放頭 -->
      <span
        ref="playhead"
        role="slider"
        tabindex="0"
        :aria-label="t.timeScrubber.playhead"
        :aria-valuemin="lo"
        :aria-valuemax="hi"
        :aria-valuenow="cursor"
        :aria-valuetext="fmt(cursor)"
        class="absolute top-[18px] z-[3] h-7 w-4 -translate-x-1/2 cursor-grab outline-none"
        :style="{ left: pct(cursor) }"
        @pointerdown.stop="onHeadDown"
        @pointermove="onTrackMove"
        @pointerup="onTrackUp"
        @pointercancel="onTrackUp"
        @keydown="onHeadKeydown"
      >
        <span class="absolute left-1/2 top-0 h-7 w-0.5 -translate-x-1/2" style="background: rgb(var(--t-accent))" aria-hidden="true"></span>
        <span class="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow" style="background: rgb(var(--t-surface-primary)); border-color: rgb(var(--t-accent))" aria-hidden="true"></span>
      </span>

      <!-- 刻度 -->
      <div class="pointer-events-none absolute inset-x-0 top-11" aria-hidden="true">
        <span
          v-for="tk in ticks"
          :key="tk"
          class="absolute whitespace-nowrap text-[11px] text-content-tertiary"
          :class="edgeAlign(tk)"
          :style="{ left: pct(tk) }"
        >{{ tickFmt(tk) }}</span>
      </div>
    </div>
    <p class="text-xs text-content-tertiary">{{ t.timeScrubber.hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import * as d3 from 'd3'
import ChptButton from './ChptButton.vue'
import ChptSegmented from './ChptSegmented.vue'
import { useLocale } from '../shared/config'
import { adjacentEvent, advance, clampTime, niceStep, snap, toMs, type TimelineEvent } from '../shared/timeScrubber'
import type { ChartSync } from '../charts/composables/useChartSync'

/**
 * ChptTimeScrubber（CHPT 主題） - 時間軸回放
 *
 * 用途：把一段時間的資料「重播」—— 異常前後機台參數怎麼變、一個班的狀態怎麼演變。
 *   - 播放頭（v-model）可拖曳、點軌道跳過去；播放時依倍速（v-model:speed）往前走，到結尾停止（或 loop）
 *   - 事件標記（警報、換線、停機）：點了跳到那個時間；上一個 / 下一個事件按鈕
 *   - 範圍（v-model:range）：拖兩端的把手只看一段，播放只在範圍內
 *   - sync：傳入 useChartSync() 的結果，播放頭同步到圖表的十字線、範圍同步到圖表的 X 軸
 *   - 鍵盤：播放頭 ←→ 步進（Shift ×10）、Home / End、PageUp / PageDown 上一個 / 下一個事件、空白鍵播放 / 暫停
 */

interface ChptTimeScrubberProps {
  start: string | number | Date
  end: string | number | Date
  /** v-model：播放頭的時間（毫秒） */
  modelValue?: string | number | Date | null
  /** v-model:range：只看這一段；null 為全部 */
  range?: [number, number] | null
  events?: TimelineEvent[]
  /** v-model:playing */
  playing?: boolean
  /** v-model:speed：倍速（1 = 真實時間） */
  speed?: number
  speeds?: number[]
  loop?: boolean
  /** 鍵盤步進（毫秒）；不給時依總長度 */
  step?: number | null
  rangeSelectable?: boolean
  /** useChartSync() 的結果：播放頭 → 十字線、範圍 → X 軸 */
  sync?: ChartSync | null
  timeFormat?: ((ms: number) => string) | null
  label?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptTimeScrubberProps>(), {
  modelValue: null,
  range: null,
  events: () => [],
  playing: false,
  speed: 60,
  speeds: () => [1, 10, 60, 600, 3600],
  loop: false,
  step: null,
  rangeSelectable: true,
  sync: null,
  timeFormat: null,
  label: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'update:range', value: [number, number] | null): void
  (e: 'update:playing', value: boolean): void
  (e: 'update:speed', value: number): void
  (e: 'event-click', event: TimelineEvent): void
}>()

// ---- 時間範圍 ----
const startMs = computed(() => toMs(props.start) ?? 0)
const endMs = computed(() => Math.max(startMs.value + 1, toMs(props.end) ?? startMs.value + 1))
const range = ref<[number, number] | null>(props.range)
watch(
  () => props.range,
  (v) => (range.value = v)
)
const lo = computed(() => (range.value ? clampTime(Math.min(...range.value), startMs.value, endMs.value) : startMs.value))
const hi = computed(() => (range.value ? clampTime(Math.max(...range.value), startMs.value, endMs.value) : endMs.value))
const span = computed(() => endMs.value - startMs.value)
const pct = (ms: number) => `${((clampTime(ms, startMs.value, endMs.value) - startMs.value) / span.value) * 100}%`
const pctW = (a: number, b: number) => `${(Math.max(0, clampTime(b, startMs.value, endMs.value) - clampTime(a, startMs.value, endMs.value)) / span.value) * 100}%`

// ---- 播放頭 ----
const cursor = ref(clampTime(toMs(props.modelValue) ?? startMs.value, startMs.value, endMs.value))
watch(
  () => props.modelValue,
  (v) => {
    const ms = toMs(v)
    if (ms !== null && ms !== cursor.value) cursor.value = clampTime(ms, startMs.value, endMs.value)
  }
)
function seek(ms: number): void {
  const next = clampTime(ms, lo.value, hi.value)
  if (next === cursor.value) return
  cursor.value = next
  emit('update:modelValue', next)
}
function setRange(v: [number, number] | null): void {
  range.value = v
  emit('update:range', v)
  if (v) seek(cursor.value) // 播放頭拉回範圍內
}

// ---- 格式 ----
const sameDay = computed(() => new Date(startMs.value).toDateString() === new Date(endMs.value).toDateString())
function fmt(ms: number): string {
  if (props.timeFormat) return props.timeFormat(ms)
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
  if (!sameDay.value) Object.assign(opts, { month: 'numeric', day: 'numeric' })
  return new Date(ms).toLocaleString(t.value.code, opts)
}
const width = ref(600)
const scale = computed(() => d3.scaleTime().domain([new Date(startMs.value), new Date(endMs.value)]))
const ticks = computed(() => scale.value.ticks(Math.max(2, Math.floor(width.value / 110))).map((d) => d.getTime()))
/** 刻度：午夜顯示日期，其他顯示 24 小時制的時:分（依語系） */
function tickFmt(ms: number): string {
  if (props.timeFormat) return props.timeFormat(ms)
  const d = new Date(ms)
  const midnight = d.getHours() === 0 && d.getMinutes() === 0
  return d.toLocaleString(t.value.code, midnight && !sameDay.value ? { month: 'numeric', day: 'numeric' } : { hour: '2-digit', minute: '2-digit', hour12: false })
}
/** 靠近兩端的刻度文字往內對齊，不會超出元件 */
const edgeAlign = (ms: number) => {
  const r = (ms - startMs.value) / span.value
  return r < 0.04 ? '' : r > 0.96 ? '-translate-x-full' : '-translate-x-1/2'
}

// ---- 事件 ----
const SEVERITY_COLOR: Record<NonNullable<TimelineEvent['severity']>, string> = {
  critical: 'rgb(var(--t-danger-solid))',
  major: 'rgb(var(--t-warning-solid))',
  minor: 'rgb(var(--t-info-solid))',
  info: 'rgb(var(--t-stroke-dark))',
}
const markers = computed(() =>
  props.events
    .map((e, i) => ({ event: e, ms: toMs(e.time), key: e.id ?? i, color: e.color ?? SEVERITY_COLOR[e.severity ?? 'info'] }))
    .filter((m): m is { event: TimelineEvent; ms: number; key: string | number; color: string } => m.ms !== null && m.ms >= startMs.value && m.ms <= endMs.value)
    .sort((a, b) => a.ms - b.ms)
)
const eventTimes = computed(() => markers.value.map((m) => m.ms).filter((ms) => ms >= lo.value && ms <= hi.value))
const prevEventTime = computed(() => adjacentEvent(eventTimes.value, cursor.value, -1))
const nextEventTime = computed(() => adjacentEvent(eventTimes.value, cursor.value, 1))
function jumpEvent(dir: 1 | -1): void {
  const target = dir > 0 ? nextEventTime.value : prevEventTime.value
  if (target !== null) seek(target)
}
function onEventClick(i: number): void {
  const m = markers.value[i]
  if (range.value && (m.ms < lo.value || m.ms > hi.value)) setRange(null)
  seek(m.ms)
  emit('event-click', m.event)
}

// ---- 播放 ----
const isPlaying = ref(props.playing)
const speed = ref(props.speed)
watch(
  () => props.playing,
  (v) => (v ? play() : pause())
)
watch(
  () => props.speed,
  (v) => (speed.value = v)
)
const speedOptions = computed(() => props.speeds.map((s) => ({ label: t.value.timeScrubber.speedOption(s), value: s })))
function setSpeed(v: number): void {
  speed.value = v
  emit('update:speed', v)
}
const raf = (cb: (t: number) => void): number =>
  typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : (setTimeout(() => cb(Date.now()), 16) as unknown as number)
const caf = (id: number) => (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id))
let frame: number | null = null
let lastTs: number | null = null
function tick(ts: number): void {
  if (!isPlaying.value) return
  const dt = lastTs === null ? 0 : Math.min(250, ts - lastTs) // 分頁切走再回來時不要一次跳太多
  lastTs = ts
  const r = advance(cursor.value, dt, speed.value, lo.value, hi.value, props.loop)
  seek(r.t)
  if (r.ended) return pause()
  frame = raf(tick)
}
function play(): void {
  if (isPlaying.value) return
  // 在結尾按播放：從頭開始
  if (cursor.value >= hi.value) seek(lo.value)
  isPlaying.value = true
  lastTs = null
  emit('update:playing', true)
  frame = raf(tick)
}
function pause(): void {
  if (frame !== null) caf(frame)
  frame = null
  if (!isPlaying.value) return
  isPlaying.value = false
  emit('update:playing', false)
}
const togglePlay = () => (isPlaying.value ? pause() : play())

// ---- 拖曳 ----
const track = useTemplateRef<HTMLDivElement>('track')
const playhead = useTemplateRef<HTMLSpanElement>('playhead')
const msAt = (clientX: number) => {
  const r = track.value!.getBoundingClientRect()
  return startMs.value + ((clientX - r.left) / Math.max(1, r.width)) * span.value
}
let dragPointer: number | null = null
function onTrackDown(e: PointerEvent): void {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  dragPointer = e.pointerId
  seek(msAt(e.clientX))
  playhead.value?.focus()
}
function onHeadDown(e: PointerEvent): void {
  onTrackDown(e)
}
function onTrackMove(e: PointerEvent): void {
  if (dragPointer === e.pointerId) seek(msAt(e.clientX))
}
function onTrackUp(e: PointerEvent): void {
  if (dragPointer === e.pointerId) dragPointer = null
}
let handleSide: 'start' | 'end' | null = null
let handlePointer: number | null = null
function onHandleDown(e: PointerEvent, side: 'start' | 'end'): void {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  handleSide = side
  handlePointer = e.pointerId
}
function moveHandle(side: 'start' | 'end', ms: number): void {
  const minGap = Math.max(1000, span.value / 200)
  const a = side === 'start' ? clampTime(ms, startMs.value, hi.value - minGap) : lo.value
  const b = side === 'end' ? clampTime(ms, lo.value + minGap, endMs.value) : hi.value
  // 拉回到全部時當作沒有範圍
  setRange(a <= startMs.value && b >= endMs.value ? null : [a, b])
}
function onHandleMove(e: PointerEvent): void {
  if (handlePointer === e.pointerId && handleSide) moveHandle(handleSide, msAt(e.clientX))
}
function onHandleUp(e: PointerEvent): void {
  if (handlePointer === e.pointerId) handlePointer = handleSide = null
}

// ---- 鍵盤 ----
const stepMs = computed(() => props.step ?? niceStep(span.value))
function onHeadKeydown(e: KeyboardEvent): void {
  const big = e.shiftKey ? 10 : 1
  let target: number | null = null
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') target = snap(cursor.value, stepMs.value, startMs.value) + stepMs.value * big
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') target = snap(cursor.value, stepMs.value, startMs.value) - stepMs.value * big
  else if (e.key === 'Home') target = lo.value
  else if (e.key === 'End') target = hi.value
  else if (e.key === 'PageDown') target = nextEventTime.value
  else if (e.key === 'PageUp') target = prevEventTime.value
  else if (e.key === ' ') {
    e.preventDefault()
    togglePlay()
    return
  } else return
  e.preventDefault()
  if (target !== null) seek(target)
}
function onRangeKeydown(e: KeyboardEvent, side: 'start' | 'end'): void {
  const cur = side === 'start' ? lo.value : hi.value
  const step = stepMs.value * (e.shiftKey ? 10 : 1)
  const map: Record<string, number> = { ArrowLeft: cur - step, ArrowDown: cur - step, ArrowRight: cur + step, ArrowUp: cur + step, Home: startMs.value, End: endMs.value }
  if (!(e.key in map)) return
  e.preventDefault()
  moveHandle(side, map[e.key])
}

// ---- 圖表同步 ----
watch(
  [cursor, () => props.sync],
  ([c, sync]) => {
    if (sync) sync.crosshairValue.value = new Date(c)
  },
  { immediate: true }
)
watch(
  [range, () => props.sync],
  ([r, sync]) => {
    if (sync) sync.xDomain.value = r ? [new Date(Math.min(...r)), new Date(Math.max(...r))] : null
  }
)

let observer: ResizeObserver | null = null
onMounted(() => {
  if (track.value?.clientWidth) width.value = track.value.clientWidth
  if (typeof ResizeObserver !== 'undefined' && track.value) {
    observer = new ResizeObserver(() => track.value && (width.value = track.value.clientWidth))
    observer.observe(track.value)
  }
  if (props.playing) {
    isPlaying.value = false
    play()
  }
})
onBeforeUnmount(() => {
  observer?.disconnect()
  if (frame !== null) caf(frame)
})

defineExpose({ play, pause, seek })
</script>
