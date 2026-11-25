<template>
  <div class="image-cropper flex flex-col gap-2 text-sm">
    <!-- 工具列 -->
    <div v-if="props.toolbar" class="flex flex-wrap items-center gap-2">
      <div v-if="props.aspectOptions.length" class="inline-flex overflow-hidden rounded-md border border-stroke-default" role="group" :aria-label="t.imageCropper.aspect">
        <button
          v-for="o in props.aspectOptions"
          :key="o.label"
          type="button"
          class="whitespace-nowrap px-2.5 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus disabled:opacity-50"
          :class="sameAspect(o.value) ? 'bg-accent-solid text-white' : 'bg-surface-primary text-content-secondary hover:bg-surface-secondary'"
          :aria-pressed="sameAspect(o.value)"
          :disabled="disabled"
          @click="setAspect(o.value)"
        >
          {{ o.label }}
        </button>
      </div>
      <div class="inline-flex gap-1">
        <button v-for="b in tools" :key="b.icon" type="button" :class="iconBtn" :aria-label="b.label" :title="b.label" :disabled="disabled" @click="b.run()">
          <span class="material-symbols-outlined text-lg" aria-hidden="true">{{ b.icon }}</span>
        </button>
      </div>
      <span v-if="rect" class="ml-auto tabular-nums text-xs text-content-secondary" data-size>{{ t.imageCropper.size(Math.round(rect.width), Math.round(rect.height)) }}</span>
    </div>

    <div class="flex flex-wrap items-start gap-3">
      <!-- 舞台 -->
      <div
        ref="stageEl"
        class="relative min-w-[240px] flex-1 touch-none select-none overflow-hidden rounded-md border border-stroke-default"
        :class="disabled ? '' : 'cursor-crosshair'"
        :style="{ height: px(props.height), background: 'repeating-conic-gradient(rgb(var(--t-surface-tertiary)) 0 25%, rgb(var(--t-surface-secondary)) 0 50%) 0 0 / 16px 16px' }"
        @pointerdown="onStageDown"
        @wheel="onWheel"
      >
        <img
          v-if="props.src"
          ref="imgEl"
          :src="props.src"
          :crossorigin="props.crossOrigin ?? undefined"
          alt=""
          draggable="false"
          class="pointer-events-none absolute left-0 top-0 max-w-none origin-top-left"
          :style="{ transform: imageTransform, visibility: loaded ? 'visible' : 'hidden' }"
          @load="onLoad"
          @error="onError"
        />
        <p v-if="!props.src || status !== 'ready'" class="absolute inset-0 flex items-center justify-center text-content-tertiary" :class="status === 'error' ? 'text-danger' : ''">
          {{ !props.src ? t.imageCropper.empty : status === 'error' ? t.imageCropper.error : t.imageCropper.loading }}
        </p>

        <!-- 裁切框（外面用陰影變暗） -->
        <div
          v-if="rect && loaded"
          ref="boxEl"
          class="absolute focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          :class="[props.shape === 'circle' ? 'rounded-full' : '', disabled ? '' : 'cursor-move']"
          :style="boxStyle"
          role="slider"
          tabindex="0"
          :aria-label="t.imageCropper.cropArea"
          :aria-valuetext="t.imageCropper.areaText(Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height))"
          :aria-describedby="`${uid}-hint`"
          :aria-disabled="disabled || undefined"
          data-box
          @keydown="onBoxKey"
        >
          <!-- 三分線 -->
          <template v-if="props.guides">
            <span v-for="g in [1, 2]" :key="`v${g}`" class="pointer-events-none absolute inset-y-0 w-px" :style="{ left: `${(g * 100) / 3}%`, background: guideColor }" />
            <span v-for="g in [1, 2]" :key="`h${g}`" class="pointer-events-none absolute inset-x-0 h-px" :style="{ top: `${(g * 100) / 3}%`, background: guideColor }" />
          </template>
          <template v-if="!disabled">
            <span
              v-for="h in CROP_HANDLES"
              :key="h"
              class="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm"
              :style="{ ...handlePos(h), background: 'rgb(var(--t-accent-solid))', border: '1px solid rgb(255 255 255 / 0.9)', cursor: `${h}-resize` }"
              :data-handle="h"
              aria-hidden="true"
            />
          </template>
        </div>
      </div>

      <!-- 預覽 -->
      <div v-if="props.preview" class="flex flex-col items-center gap-1">
        <canvas
          ref="previewEl"
          class="border border-stroke-default"
          :class="props.shape === 'circle' ? 'rounded-full' : 'rounded-md'"
          :width="previewSize.width"
          :height="previewSize.height"
          :aria-label="t.imageCropper.preview"
          role="img"
        />
        <span class="text-xs text-content-tertiary">{{ t.imageCropper.preview }}</span>
      </div>
    </div>
    <p :id="`${uid}-hint`" class="text-[11px] text-content-tertiary">{{ t.imageCropper.hint }}</p>
  </div>
</template>

<script setup lang="ts">
/**
 * ChptImageCropper 圖片裁切 —— 大頭照、缺陷照片、銘牌照片上傳前先裁好。
 * 拖曳移動裁切框、拉 8 個把手調整大小、空白處拖曳重畫；可固定比例、旋轉 90°、翻轉、滾輪 / 雙指縮放；
 * 輸出指定尺寸的 canvas / Blob / DataURL（getBlob 等，經 ref 呼叫）。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useLocale } from '../shared/config'
import {
  CROP_HANDLES,
  applyAspect,
  clampRect,
  fitView,
  flipRect,
  initialRect,
  isValidRect,
  moveRect,
  normalizeRotation,
  outputSize,
  rectFromDrag,
  resizeRect,
  rotateRect,
  rotatedSize,
  roundRect,
  scaleRect,
  zoomView,
  type CropHandle,
  type CropRect,
  type CropRotation,
  type CropView,
  type OutputSizeOptions,
  type Size,
} from '../shared/imageCropper'

export interface CropState {
  rect: CropRect
  rotation: CropRotation
  flipX: boolean
  flipY: boolean
}

export interface CropOutputOptions extends OutputSizeOptions {
  /** 'image/png'（預設）、'image/jpeg'、'image/webp' */
  type?: string
  /** jpeg / webp 的品質 0–1 */
  quality?: number
  /** 底色（jpeg 沒有透明，預設為黑色） */
  background?: string | null
}

export interface ChptImageCropperProps {
  /** 圖片網址或 DataURL */
  src?: string | null
  /** 裁切框（v-model，旋轉 / 翻轉後的圖片像素座標） */
  modelValue?: CropRect | null
  /** 寬 ÷ 高；null 為自由 */
  aspect?: number | null
  /** 工具列的比例選項（空陣列不顯示） */
  aspectOptions?: { label: string; value: number | null }[]
  /** 圓形遮罩（大頭照）；輸出 PNG 時圓外透明 */
  shape?: 'rect' | 'circle'
  /** 最小邊長（圖片像素） */
  minSize?: number
  /** 舞台高度 */
  height?: number | string
  toolbar?: boolean
  /** 顯示裁切後的即時預覽 */
  preview?: boolean
  /** 預覽最大邊長（px） */
  previewSize?: number
  /** 三分線 */
  guides?: boolean
  /** 最大放大倍率（相對全覽） */
  maxZoom?: number
  crossOrigin?: 'anonymous' | 'use-credentials' | null
  disabled?: boolean
}

const t = useLocale()
const props = withDefaults(defineProps<ChptImageCropperProps>(), {
  src: null,
  modelValue: null,
  aspect: null,
  aspectOptions: () => [],
  shape: 'rect',
  minSize: 16,
  height: 360,
  toolbar: true,
  preview: false,
  previewSize: 120,
  guides: true,
  maxZoom: 8,
  crossOrigin: null,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', rect: CropRect): void
  (e: 'update:aspect', aspect: number | null): void
  /** 框、旋轉或翻轉改變（拖曳結束、按鈕、鍵盤） */
  (e: 'change', state: CropState): void
  (e: 'load', size: Size): void
  (e: 'error'): void
}>()

const uid = useId()
const px = (v: number | string) => (typeof v === 'number' ? `${v}px` : v)
const iconBtn =
  'inline-flex h-7 w-7 items-center justify-center rounded-md border border-stroke-default bg-surface-primary text-content-secondary hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:opacity-50'
const guideColor = 'rgb(255 255 255 / 0.45)'
const disabled = computed(() => props.disabled || status.value !== 'ready')

// ---- 狀態 ----
const stageEl = ref<HTMLElement | null>(null)
const imgEl = ref<HTMLImageElement | null>(null)
const boxEl = ref<HTMLElement | null>(null)
const previewEl = ref<HTMLCanvasElement | null>(null)
const status = ref<'idle' | 'loading' | 'ready' | 'error'>(props.src ? 'loading' : 'idle')
const loaded = computed(() => status.value === 'ready')
const natural = ref<Size>({ width: 0, height: 0 })
const rotation = ref<CropRotation>(0)
const flipX = ref(false)
const flipY = ref(false)
const rect = ref<CropRect | null>(null)
const aspectNow = ref<number | null>(props.aspect)
watch(
  () => props.aspect,
  (a) => {
    aspectNow.value = a
    if (rect.value && a) {
      rect.value = applyAspect(rect.value, a, bounds.value)
      commit()
    }
  }
)
const bounds = computed(() => rotatedSize(natural.value, rotation.value))
const stage = ref<Size>({ width: 600, height: 360 })
const view = ref<CropView>({ k: 1, x: 0, y: 0 })
const fit = computed(() => fitView(stage.value, bounds.value))

watch(
  () => props.src,
  (s) => {
    status.value = s ? 'loading' : 'idle'
    rect.value = null
  }
)
watch(
  () => props.modelValue,
  (v) => {
    if (!loaded.value || !v || !isValidRect(v, bounds.value)) return
    const r = rect.value
    if (r && Math.round(r.x) === v.x && Math.round(r.y) === v.y && Math.round(r.width) === v.width && Math.round(r.height) === v.height) return
    rect.value = { ...v }
  }
)

function measure(): void {
  const el = stageEl.value
  if (!el) return
  const w = el.clientWidth || 600
  const h = el.clientHeight || (typeof props.height === 'number' ? props.height : 360)
  stage.value = { width: w, height: h }
}
let observer: ResizeObserver | null = null
onMounted(() => {
  measure()
  // 已經在快取裡的圖片不一定會觸發 load
  if (imgEl.value?.complete && imgEl.value.naturalWidth) onLoad()
  if (typeof ResizeObserver !== 'undefined' && stageEl.value) {
    observer = new ResizeObserver(() => {
      const before = view.value.k / fit.value.k
      measure()
      if (Math.abs(before - 1) < 1e-6) view.value = fit.value
    })
    observer.observe(stageEl.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())

function onLoad(): void {
  const img = imgEl.value
  if (!img || !img.naturalWidth) return
  natural.value = { width: img.naturalWidth, height: img.naturalHeight }
  rotation.value = 0
  flipX.value = false
  flipY.value = false
  status.value = 'ready'
  measure()
  view.value = fit.value
  rect.value = props.modelValue && isValidRect(props.modelValue, bounds.value) ? { ...props.modelValue } : initialRect(bounds.value, aspectNow.value)
  emit('load', { ...natural.value })
  commit()
}
function onError(): void {
  status.value = 'error'
  emit('error')
}

// ---- 呈現 ----
const imageTransform = computed(() => {
  const v = view.value
  const B = bounds.value
  const N = natural.value
  // 先把圖片中心移到原點 → 縮放 → 旋轉 → 翻轉（畫面方向）→ 移到旋轉後圖片的中心
  return `translate(${v.x + (B.width * v.k) / 2}px, ${v.y + (B.height * v.k) / 2}px) scale(${flipX.value ? -1 : 1}, ${flipY.value ? -1 : 1}) rotate(${rotation.value}deg) scale(${v.k}) translate(${-N.width / 2}px, ${-N.height / 2}px)`
})
const boxStyle = computed(() => {
  const r = rect.value!
  const v = view.value
  return {
    left: `${v.x + r.x * v.k}px`,
    top: `${v.y + r.y * v.k}px`,
    width: `${r.width * v.k}px`,
    height: `${r.height * v.k}px`,
    boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.5)',
    outline: '1px solid rgb(255 255 255 / 0.9)',
  }
})
function handlePos(h: CropHandle) {
  const left = h.includes('w') ? '0%' : h.includes('e') ? '100%' : '50%'
  const top = h.includes('n') ? '0%' : h.includes('s') ? '100%' : '50%'
  return { left, top }
}
const sameAspect = (a: number | null) => (a === null ? aspectNow.value === null : aspectNow.value !== null && Math.abs(a - aspectNow.value) < 1e-6)

// ---- 輸出 ----
function emitRect(): void {
  if (rect.value) emit('update:modelValue', roundRect(rect.value))
}
function commit(): void {
  if (!rect.value) return
  emitRect()
  emit('change', { rect: roundRect(rect.value), rotation: rotation.value, flipX: flipX.value, flipY: flipY.value })
  void nextTick(drawPreview)
}
function getCanvas(o: CropOutputOptions = {}): HTMLCanvasElement | null {
  const img = imgEl.value
  const r = rect.value
  if (!img || !r || !loaded.value) return null
  const size = outputSize(r, o)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  render(ctx, img, r, size, o.background ?? null, o.type === 'image/jpeg')
  return canvas
}
function render(ctx: CanvasRenderingContext2D, img: HTMLImageElement, r: CropRect, size: Size, background: string | null, opaque: boolean): void {
  const B = bounds.value
  const N = natural.value
  ctx.save()
  if (background || opaque) {
    ctx.fillStyle = background ?? '#000'
    ctx.fillRect(0, 0, size.width, size.height)
  }
  if (props.shape === 'circle') {
    ctx.beginPath()
    ctx.ellipse(size.width / 2, size.height / 2, size.width / 2, size.height / 2, 0, 0, Math.PI * 2)
    ctx.clip()
  }
  ctx.scale(size.width / r.width, size.height / r.height)
  ctx.translate(-r.x + B.width / 2, -r.y + B.height / 2)
  ctx.scale(flipX.value ? -1 : 1, flipY.value ? -1 : 1)
  ctx.rotate((rotation.value * Math.PI) / 180)
  ctx.drawImage(img, -N.width / 2, -N.height / 2)
  ctx.restore()
}
function getDataURL(o: CropOutputOptions = {}): string | null {
  return getCanvas(o)?.toDataURL(o.type ?? 'image/png', o.quality) ?? null
}
function getBlob(o: CropOutputOptions = {}): Promise<Blob | null> {
  const c = getCanvas(o)
  if (!c) return Promise.resolve(null)
  return new Promise((resolve) => c.toBlob((b) => resolve(b), o.type ?? 'image/png', o.quality))
}
const previewSize = computed(() => {
  const r = rect.value
  if (!r) return { width: props.previewSize, height: props.previewSize }
  return outputSize(r, r.width >= r.height ? { width: props.previewSize } : { height: props.previewSize })
})
function drawPreview(): void {
  const c = previewEl.value
  const img = imgEl.value
  if (!props.preview || !c || !img || !rect.value || !loaded.value) return
  const ctx = c.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, c.width, c.height)
  render(ctx, img, rect.value, previewSize.value, null, false)
}

// ---- 工具列 ----
function setAspect(a: number | null): void {
  aspectNow.value = a
  emit('update:aspect', a)
  if (rect.value && a) {
    rect.value = applyAspect(rect.value, a, bounds.value)
    commit()
  }
}
function rotate(dir: 1 | -1): void {
  if (!rect.value) return
  const before = bounds.value
  rect.value = rotateRect(rect.value, before, dir)
  rotation.value = normalizeRotation(rotation.value + dir * 90)
  // 翻轉狀態在畫面方向：轉 90° 時水平 / 垂直對調
  if (flipX.value !== flipY.value) {
    flipX.value = !flipX.value
    flipY.value = !flipY.value
  }
  view.value = fit.value
  commit()
}
function flip(axis: 'x' | 'y'): void {
  if (!rect.value) return
  rect.value = flipRect(rect.value, bounds.value, axis)
  if (axis === 'x') flipX.value = !flipX.value
  else flipY.value = !flipY.value
  commit()
}
function zoom(factor: number, cx = stage.value.width / 2, cy = stage.value.height / 2): void {
  view.value = zoomView(view.value, factor, cx, cy, fit.value.k * 0.5, fit.value.k * props.maxZoom)
}
function reset(): void {
  if (!loaded.value) return
  rotation.value = 0
  flipX.value = false
  flipY.value = false
  view.value = fit.value
  rect.value = initialRect(bounds.value, aspectNow.value)
  commit()
}
const tools = computed(() => {
  const s = t.value.imageCropper
  return [
    { icon: 'rotate_left', label: s.rotateLeft, run: () => rotate(-1) },
    { icon: 'rotate_right', label: s.rotateRight, run: () => rotate(1) },
    { icon: 'flip', label: s.flipX, run: () => flip('x') },
    { icon: 'swap_vert', label: s.flipY, run: () => flip('y') },
    { icon: 'zoom_in', label: s.zoomIn, run: () => zoom(1.25) },
    { icon: 'zoom_out', label: s.zoomOut, run: () => zoom(0.8) },
    { icon: 'restart_alt', label: s.reset, run: reset },
  ]
})

// ---- 指標：移動 / 把手 / 畫新框 / 平移（中鍵或兩指）/ 雙指縮放 ----
type Drag =
  | { kind: 'move'; start: CropRect; x: number; y: number }
  | { kind: 'resize'; start: CropRect; handle: CropHandle; x: number; y: number }
  | { kind: 'draw'; ax: number; ay: number; moved: boolean }
  | { kind: 'pan'; view: CropView; x: number; y: number }
  | { kind: 'pinch'; view: CropView; dist: number; cx: number; cy: number }
let drag: Drag | null = null
const pointers = new Map<number, { x: number; y: number }>()
const local = (e: { clientX: number; clientY: number }) => {
  const r = stageEl.value!.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}
const toImage = (p: { x: number; y: number }) => ({ x: (p.x - view.value.x) / view.value.k, y: (p.y - view.value.y) / view.value.k })

function onStageDown(e: PointerEvent): void {
  if (disabled.value || !rect.value) return
  pointers.set(e.pointerId, local(e))
  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    drag = { kind: 'pinch', view: { ...view.value }, dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }
    listen()
    return
  }
  const p = local(e)
  const target = e.target as HTMLElement
  const handle = target.dataset?.handle as CropHandle | undefined
  if (e.pointerType === 'mouse' && e.button === 1) drag = { kind: 'pan', view: { ...view.value }, x: p.x, y: p.y }
  else if (e.pointerType === 'mouse' && e.button !== 0) return
  else if (handle) drag = { kind: 'resize', start: { ...rect.value }, handle, x: p.x, y: p.y }
  else if (target === boxEl.value || boxEl.value?.contains(target)) drag = { kind: 'move', start: { ...rect.value }, x: p.x, y: p.y }
  else {
    const a = toImage(p)
    drag = { kind: 'draw', ax: Math.max(0, Math.min(bounds.value.width, a.x)), ay: Math.max(0, Math.min(bounds.value.height, a.y)), moved: false }
  }
  e.preventDefault()
  boxEl.value?.focus?.({ preventScroll: true })
  listen()
}
function onMove(e: PointerEvent): void {
  if (!drag) return
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, local(e))
  const p = local(e)
  const k = view.value.k
  const opts = { bounds: bounds.value, aspect: aspectNow.value, min: props.minSize }
  if (drag.kind === 'pinch') {
    const [a, b] = [...pointers.values()]
    if (!a || !b) return
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    const base = drag.view
    const z = zoomView(base, d / drag.dist, drag.cx, drag.cy, fit.value.k * 0.5, fit.value.k * props.maxZoom)
    view.value = { ...z, x: z.x + (a.x + b.x) / 2 - drag.cx, y: z.y + (a.y + b.y) / 2 - drag.cy }
  } else if (drag.kind === 'pan') view.value = { ...drag.view, x: drag.view.x + p.x - drag.x, y: drag.view.y + p.y - drag.y }
  else if (drag.kind === 'move') rect.value = moveRect(drag.start, (p.x - drag.x) / k, (p.y - drag.y) / k, bounds.value)
  else if (drag.kind === 'resize') rect.value = resizeRect(drag.start, drag.handle, (p.x - drag.x) / k, (p.y - drag.y) / k, opts)
  else {
    const b = toImage(p)
    if (!drag.moved && Math.hypot(b.x - drag.ax, b.y - drag.ay) * k < 4) return
    drag.moved = true
    const next = rectFromDrag({ x: drag.ax, y: drag.ay }, b, opts)
    // 在圖片外拖曳（例如從邊上往外拉）畫不出最小尺寸的框：保留原本的框
    if (next.width < Math.min(props.minSize, bounds.value.width) || next.height < Math.min(props.minSize, bounds.value.height)) return
    rect.value = next
  }
  emitRect()
}
function onUp(e: PointerEvent): void {
  pointers.delete(e.pointerId)
  if (drag?.kind === 'pinch' && pointers.size) return
  const d = drag
  drag = null
  unlisten()
  pointers.clear()
  if (d && d.kind !== 'pan' && d.kind !== 'pinch' && !(d.kind === 'draw' && !d.moved)) commit()
}
function listen(): void {
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}
function unlisten(): void {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onUp)
}
onBeforeUnmount(unlisten)

function onWheel(e: WheelEvent): void {
  if (disabled.value) return
  e.preventDefault()
  const p = local(e)
  zoom(Math.exp(-e.deltaY * 0.0015), p.x, p.y)
}

// ---- 鍵盤：方向鍵移動（Shift ×10）、+ / − 縮放框 ----
function onBoxKey(e: KeyboardEvent): void {
  if (disabled.value || !rect.value) return
  const step = (e.shiftKey ? 10 : 1) / view.value.k
  const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
  const opts = { bounds: bounds.value, aspect: aspectNow.value, min: props.minSize }
  if (moves[e.key]) rect.value = moveRect(rect.value, moves[e.key][0], moves[e.key][1], bounds.value)
  else if (e.key === '+' || e.key === '=') rect.value = scaleRect(rect.value, 1.1, opts)
  else if (e.key === '-' || e.key === '_') rect.value = scaleRect(rect.value, 1 / 1.1, opts)
  else return
  e.preventDefault()
  commit()
}

// 外部改 minSize 等不影響現有框；圖片大小改變時確保在範圍內
watch(bounds, (b) => {
  if (rect.value) rect.value = clampRect(rect.value, b)
})
watch(
  () => props.preview,
  () => nextTick(drawPreview)
)

defineExpose({
  /** 裁切後的 canvas（給 width / height / maxWidth / maxHeight 決定輸出大小） */
  getCanvas,
  /** 裁切後的 Blob（預設 PNG） */
  getBlob,
  /** 裁切後的 DataURL */
  getDataURL,
  /** 旋轉 90°（1 = 順時針） */
  rotate,
  /** 水平（x）或垂直（y）翻轉 */
  flip,
  /** 放大縮小畫面（不改裁切框） */
  zoom,
  /** 回到初始：不旋轉、不翻轉、全覽、預設框 */
  reset,
  /** 目前的框、旋轉、翻轉 */
  state: computed<CropState | null>(() => (rect.value ? { rect: roundRect(rect.value), rotation: rotation.value, flipX: flipX.value, flipY: flipY.value } : null)),
})
</script>
