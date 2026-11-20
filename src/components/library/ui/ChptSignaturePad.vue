<template>
  <div class="flex flex-col gap-2" :style="{ width: props.width }">
    <!-- 簽名區：固定白底（像一張紙），深色模式也不反轉 —— 輸出的簽名是深色筆跡，放在深色底上會看不見 -->
    <div
      ref="paper"
      class="relative overflow-hidden rounded-md border"
      :class="[props.errorText ? 'border-danger' : 'border-stroke-default', props.disabled ? 'opacity-60' : '']"
      :style="{ height: `${props.height}px`, background: PAPER }"
    >
      <canvas
        ref="canvas"
        class="absolute inset-0 h-full w-full"
        :class="interactive ? 'cursor-crosshair' : 'cursor-not-allowed'"
        style="touch-action: none"
        role="img"
        :aria-label="t.signature.status(props.label || t.signature.label, empty ? t.signature.empty : t.signature.signed)"
        :aria-describedby="props.errorText ? errorId : undefined"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @lostpointercapture="onPointerUp"
      ></canvas>
      <!-- 簽名線與提示：空白時才顯示，不會被輸出 -->
      <div class="pointer-events-none absolute inset-x-6 bottom-[28%] flex items-end gap-2" aria-hidden="true">
        <span class="text-lg leading-none" :style="{ color: GUIDE }">×</span>
        <span class="flex-1 border-b" :style="{ borderColor: GUIDE }"></span>
      </div>
      <div
        v-if="empty"
        class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm"
        :style="{ color: GUIDE }"
        aria-hidden="true"
      >
        {{ props.placeholder || t.signature.placeholder }}
      </div>
    </div>

    <div v-if="props.showToolbar || props.errorText" class="flex items-center justify-between gap-2">
      <p v-if="props.errorText" :id="errorId" role="alert" class="text-xs text-danger">{{ props.errorText }}</p>
      <p v-else class="text-xs text-content-tertiary">{{ t.signature.hint }}</p>
      <div v-if="props.showToolbar" class="flex gap-1.5">
        <ChptButton size="xs" is-outline icon="undo" :disabled="!interactive || !strokes.length" @click="undo">
          {{ t.signature.undo }}
        </ChptButton>
        <ChptButton size="xs" is-outline icon="delete" :disabled="!interactive || empty" @click="clear">
          {{ t.signature.clear }}
        </ChptButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import ChptButton from './ChptButton.vue'
import { useLocale } from '../shared/config'
import {
  createWidthTracker,
  drawSegment,
  drawStroke,
  exportRect,
  signatureToSVG,
  type SignatureInput,
  type SignatureStroke,
} from '../shared/signature'

/**
 * ChptSignaturePad（CHPT 主題） - 簽名板
 *
 * 用途：簽收、點檢確認、放行簽核 —— 在平板上用手指或觸控筆簽名，存成圖片或 SVG。
 *   - 線條平滑、粗細隨速度（筆有壓力時隨壓力）變化，寫起來像真的簽名
 *   - 高解析度螢幕不糊（canvas 依 devicePixelRatio 放大）；簽名中不會捲動頁面（touch-action: none）
 *   - 多指觸控只取第一根手指，手掌碰到也不會亂畫
 *   - 每簽完一筆更新 v-model（PNG data URL；空白為 null），可復原上一筆、清除
 *   - 也可以輸出 SVG（toSVG()）或只裁出有簽名的範圍（trim）
 *
 * v-model 傳入既有的簽名圖（例如編輯舊單據）時會顯示在底下；清除會一併拿掉。
 */

interface ChptSignaturePadProps {
  /** v-model：PNG data URL（exportType 決定格式）；空白為 null */
  modelValue?: string | null
  /** 簽名區高度（px） */
  height?: number
  /** 寬度（CSS 值） */
  width?: string
  /** 筆跡顏色（簽名區固定白底，請用深色） */
  penColor?: string
  /** 最細線寬（px） */
  minWidth?: number
  /** 最粗線寬（px） */
  maxWidth?: number
  /** 標籤（螢幕閱讀器念的名稱） */
  label?: string
  /** 空白時的提示文字 */
  placeholder?: string
  /** 顯示下方的提示與復原 / 清除按鈕 */
  showToolbar?: boolean
  /** v-model 只輸出有簽名的範圍（四周留 8px） */
  trim?: boolean
  /** 輸出的背景色；不給為透明 */
  exportBackground?: string | null
  /** 輸出格式 */
  exportType?: 'image/png' | 'image/jpeg' | 'image/webp'
  /** 錯誤訊息（例如必填） */
  errorText?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 唯讀（顯示簽名，不能再畫） */
  readonly?: boolean
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptSignaturePadProps>(), {
  modelValue: null,
  height: 200,
  width: '100%',
  penColor: '#111827',
  minWidth: 0.8,
  maxWidth: 2.8,
  label: '',
  placeholder: '',
  showToolbar: true,
  trim: false,
  exportBackground: null,
  exportType: 'image/png',
  errorText: '',
  disabled: false,
  readonly: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | null): void
  /** 開始一筆 */
  (e: 'begin'): void
  /** 完成一筆；帶目前的筆數 */
  (e: 'end', strokeCount: number): void
  /** 清除時 */
  (e: 'clear'): void
}>()

/** 簽名區固定的「紙」與簽名線顏色（不跟主題：白紙黑字） */
const PAPER = '#ffffff'
const GUIDE = '#9ca3af'

const errorId = `${useId()}-error`
const paper = useTemplateRef<HTMLDivElement>('paper')
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')

const strokes = shallowRef<SignatureStroke[]>([])
/** v-model 傳進來的既有簽名圖（載入後畫在最底下） */
const baseImage = shallowRef<HTMLImageElement | null>(null)
const empty = computed(() => !strokes.value.length && !baseImage.value)
const interactive = computed(() => !props.disabled && !props.readonly)

/** 正在畫的那一筆 */
let current: SignatureStroke | null = null
let pointerId: number | null = null
let widthOf: ((input: SignatureInput) => number) | null = null
/** 最後一次送出的 v-model：父層傳回來時不要當成「外部換了簽名」 */
let lastEmitted: string | null | undefined
let size = { width: 0, height: 0 }

function context(): CanvasRenderingContext2D | null {
  return canvas.value?.getContext('2d') ?? null
}

/** 依顯示大小與 devicePixelRatio 設定 canvas 解析度，然後重畫 */
function resize(): void {
  const el = canvas.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  size = { width: rect.width || paper.value?.clientWidth || 0, height: rect.height || props.height }
  const dpr = window.devicePixelRatio || 1
  el.width = Math.round(size.width * dpr)
  el.height = Math.round(size.height * dpr)
  const ctx = context()
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  redraw()
}

function redraw(): void {
  const ctx = context()
  if (!ctx) return
  ctx.clearRect(0, 0, size.width, size.height)
  if (baseImage.value) ctx.drawImage(baseImage.value, 0, 0, size.width, size.height)
  for (const s of strokes.value) drawStroke(ctx, s)
  // 寫到一半時改變大小（例如平板轉向）：正在畫的那一筆也要重畫
  if (current) drawStroke(ctx, current)
}

function point(event: PointerEvent): SignatureInput {
  const rect = canvas.value!.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    t: event.timeStamp,
    pressure: event.pressure,
    pointerType: event.pointerType,
  }
}

function addPoint(input: SignatureInput): void {
  if (!current || !widthOf) return
  const pts = current.points
  const prev = pts[pts.length - 1]
  // 太近的點不要（同一個位置重複的 move 事件會讓線條變成一團）
  if (prev && Math.hypot(input.x - prev.x, input.y - prev.y) < 1.5) return
  pts.push({ x: input.x, y: input.y, w: widthOf(input) })
  const ctx = context()
  if (ctx && pts.length > 1) drawSegment(ctx, current, pts.length - 1, false)
}

function onPointerDown(event: PointerEvent): void {
  if (!interactive.value || pointerId !== null) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  event.preventDefault()
  pointerId = event.pointerId
  canvas.value?.setPointerCapture?.(event.pointerId)
  widthOf = createWidthTracker({ minWidth: props.minWidth, maxWidth: props.maxWidth })
  current = { color: props.penColor, points: [] }
  addPoint(point(event))
  emit('begin')
}

function onPointerMove(event: PointerEvent): void {
  if (event.pointerId !== pointerId || !current) return
  // 一格畫面之間的移動合併成一個事件；拿回所有點，快速簽名時線條才不會變成折線
  const events = event.getCoalescedEvents?.() ?? []
  for (const e of events.length ? events : [event]) addPoint(point(e))
}

function onPointerUp(event: PointerEvent): void {
  if (event.pointerId !== pointerId || !current) return
  pointerId = null
  const stroke = current
  current = null
  strokes.value = [...strokes.value, stroke]
  redraw()
  emit('end', strokes.value.length)
  emitValue()
}

function emitValue(): void {
  lastEmitted = empty.value ? null : toDataURL()
  emit('update:modelValue', lastEmitted)
}

/** 復原上一筆 */
function undo(): void {
  if (!strokes.value.length) return
  strokes.value = strokes.value.slice(0, -1)
  redraw()
  emitValue()
}

/** 清除（包含 v-model 傳進來的既有簽名） */
function clear(): void {
  strokes.value = []
  baseImage.value = null
  redraw()
  emit('clear')
  emitValue()
}

/** 輸出成圖片（data URL）；空白時為空字串 */
function toDataURL(options: { type?: string; quality?: number; trim?: boolean; background?: string | null } = {}): string {
  if (empty.value) return ''
  const trim = (options.trim ?? props.trim) && !baseImage.value
  const background = options.background === undefined ? props.exportBackground : options.background
  const rect = exportRect(strokes.value, size, trim)
  const scale = Math.max(1, window.devicePixelRatio || 1)
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(rect.width * scale))
  out.height = Math.max(1, Math.round(rect.height * scale))
  const ctx = out.getContext('2d')
  if (!ctx) return ''
  ctx.setTransform(scale, 0, 0, scale, -rect.x * scale, -rect.y * scale)
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
  }
  if (baseImage.value) ctx.drawImage(baseImage.value, 0, 0, size.width, size.height)
  for (const s of strokes.value) drawStroke(ctx, s)
  return out.toDataURL(options.type ?? props.exportType, options.quality)
}

/** 輸出成 SVG（只含這次畫的筆跡，不含 v-model 傳進來的既有圖片）；空白時為空字串 */
function toSVG(options: { trim?: boolean; background?: string | null } = {}): string {
  if (!strokes.value.length) return ''
  return signatureToSVG(strokes.value, {
    ...size,
    trim: options.trim ?? props.trim,
    background: options.background === undefined ? props.exportBackground : options.background,
  })
}

/** 取得 / 設定筆跡資料（存回後端再載入、或做簽名比對時用） */
function getStrokes(): SignatureStroke[] {
  return strokes.value.map((s) => ({ color: s.color, points: s.points.map((p) => ({ ...p })) }))
}
function setStrokes(next: SignatureStroke[]): void {
  strokes.value = next.map((s) => ({ color: s.color, points: s.points.map((p) => ({ ...p })) }))
  baseImage.value = null
  redraw()
  emitValue()
}

// 外部換了 v-model（載入既有簽名、或父層清空）
watch(
  () => props.modelValue,
  (v) => {
    if (v === lastEmitted) return
    lastEmitted = v
    strokes.value = []
    baseImage.value = null
    if (v) loadImage(v)
    else redraw()
  }
)

function loadImage(src: string): void {
  const img = new Image()
  img.onload = () => {
    if (props.modelValue !== src) return
    baseImage.value = img
    redraw()
  }
  img.src = src
  redraw()
}

let observer: ResizeObserver | null = null
onMounted(() => {
  resize()
  if (props.modelValue) {
    lastEmitted = props.modelValue
    loadImage(props.modelValue)
  }
  if (typeof ResizeObserver !== 'undefined' && paper.value) {
    observer = new ResizeObserver(() => resize())
    observer.observe(paper.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())

defineExpose({ clear, undo, isEmpty: () => empty.value, toDataURL, toSVG, getStrokes, setStrokes })
</script>
