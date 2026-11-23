<template>
  <div class="flex flex-col gap-2">
    <div v-if="props.showToolbar" class="flex flex-wrap items-center gap-2">
      <ChptSegmented :model-value="mode" :options="modeOptions" :aria-label="t.imageCompare.modeLabel" size="xs" @update:model-value="(v) => setMode(v as CompareMode)" />
      <template v-if="mode === 'overlay'">
        <label class="flex items-center gap-2 text-xs text-content-secondary">
          {{ t.imageCompare.opacity }}
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            class="w-28 accent-[rgb(var(--t-accent))]"
            :value="opacity"
            :disabled="difference"
            :aria-valuetext="`${opacity}%`"
            @input="setOpacity(Number(($event.target as HTMLInputElement).value))"
          />
          <span class="w-9 tabular-nums">{{ opacity }}%</span>
        </label>
        <ChptButton size="xs" is-outline icon="difference" :aria-pressed="difference" :class="difference ? 'bg-accent-subtle' : ''" @click="setDifference(!difference)">
          {{ t.imageCompare.difference }}
        </ChptButton>
      </template>
      <div class="ml-auto flex items-center gap-1">
        <ChptButton size="xs" is-outline icon="remove" :aria-label="t.imageCompare.zoomOut" :disabled="rel <= 1.001" @click="zoomBy(1 / 1.5)" />
        <span class="w-12 text-center text-xs tabular-nums text-content-secondary" aria-live="polite">{{ Math.round(rel * 100) }}%</span>
        <ChptButton size="xs" is-outline icon="add" :aria-label="t.imageCompare.zoomIn" :disabled="rel >= props.maxZoom - 0.001" @click="zoomBy(1.5)" />
        <ChptButton size="xs" is-outline icon="fit_screen" :aria-label="t.imageCompare.fit" :disabled="!zoom" @click="fit()" />
      </div>
    </div>

    <div ref="frame" :style="{ height: `${frameHeight}px` }">
      <div class="grid h-full gap-1" :class="mode === 'side' ? 'grid-cols-2' : 'grid-cols-1'">
        <div
          v-for="pane in panes"
          :key="pane.key"
          class="relative isolate overflow-hidden rounded-md border border-stroke-light bg-surface-tertiary outline-none select-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          :class="dragging ? 'cursor-grabbing' : zoom ? 'cursor-grab' : 'cursor-zoom-in'"
          style="touch-action: none"
          tabindex="0"
          role="group"
          :aria-label="pane.label"
          :aria-describedby="`${uid}-hint`"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @wheel="onWheel"
          @dblclick="onDblClick"
          @keydown="onKeydown"
        >
          <div v-for="layer in pane.layers" :key="layer.which" class="absolute inset-0" :style="layer.style">
            <img
              v-if="srcOf(layer.which)"
              :src="srcOf(layer.which)"
              :alt="labelOf(layer.which)"
              draggable="false"
              class="absolute left-0 top-0 max-w-none origin-top-left"
              :style="imgStyle"
              @load="onLoad(layer.which, $event)"
              @error="failed[layer.which] = true"
            />
          </div>
          <!-- 標籤 -->
          <span
            v-for="tag in pane.tags"
            :key="tag.text"
            class="pointer-events-none absolute top-2 rounded px-1.5 py-0.5 text-xs font-medium"
            :class="tag.right ? 'right-2' : 'left-2'"
            style="background: rgb(0 0 0 / 0.6); color: #fff"
          >{{ tag.text }}</span>
          <!-- 載入失敗 -->
          <p
            v-if="pane.layers.some((l) => failed[l.which])"
            class="absolute inset-x-2 bottom-2 rounded bg-danger-subtle px-2 py-1 text-xs text-danger-on-subtle"
            role="alert"
          >
            {{ pane.layers.filter((l) => failed[l.which]).map((l) => t.imageCompare.loadError(labelOf(l.which))).join(' ') }}
          </p>
          <!-- 滑桿分隔線 -->
          <div
            v-if="mode === 'slider'"
            class="absolute inset-y-0 z-[1] w-6 -translate-x-1/2 cursor-ew-resize"
            :style="{ left: `${position}%` }"
            @pointerdown.stop="onHandleDown"
            @pointermove="onHandleMove"
            @pointerup="onHandleUp"
            @pointercancel="onHandleUp"
            @dblclick.stop
          >
            <span class="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2" style="background: #fff; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.35)" aria-hidden="true"></span>
            <span
              role="slider"
              tabindex="0"
              :aria-label="t.imageCompare.divider"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="Math.round(position)"
              :aria-valuetext="`${Math.round(position)}%`"
              class="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-md outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
              style="background: #fff; color: #1f2937"
              @keydown.stop="onHandleKeydown"
            >
              <span class="material-symbols-outlined text-lg" aria-hidden="true">code</span>
            </span>
          </div>
        </div>
      </div>
    </div>
    <p :id="`${uid}-hint`" class="text-xs text-content-tertiary">{{ t.imageCompare.hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, useId, useTemplateRef, watch, type CSSProperties } from 'vue'
import ChptButton from './ChptButton.vue'
import ChptSegmented from './ChptSegmented.vue'
import { useLocale } from '../shared/config'
import { clampImageView, clampPercent, percentAt, viewOf, zoomImageTo, zoomOf, type CompareMode, type ImageZoom } from '../shared/imageCompare'

/**
 * ChptImageCompare（CHPT 主題） - 影像比對
 *
 * 用途：比對兩張同視野的影像 —— 標準樣品與待測品、修改前後、上次與這次的 AOI 影像。
 *   - slider（滑桿）：上下兩張疊在一起，拖分隔線看左右（左 = before、右 = after）
 *   - side（並排）：左右兩格
 *   - overlay（疊圖）：after 半透明疊在 before 上；「差異」用 difference 混合，相同處變黑、不同處發亮
 *   - 三種模式共用同一個縮放與位置：放大看某個焊點後切換模式，看到的仍是同一塊
 * 兩張影像大小不同時，after 拉伸到 before 的大小（請用同視野、同解析度的影像）。
 */

type Which = 'before' | 'after'

interface ChptImageCompareProps {
  /** 基準影像（左邊 / 底層） */
  before: string
  /** 比對影像（右邊 / 上層） */
  after: string
  beforeLabel?: string
  afterLabel?: string
  /** v-model:mode */
  mode?: CompareMode
  /** v-model:position：滑桿分隔線位置（0–100） */
  position?: number
  /** v-model:opacity：疊圖時上層的不透明度（0–100） */
  opacity?: number
  /** v-model:difference：疊圖時用差異混合 */
  difference?: boolean
  /** 最大高度（px）；影像較扁時框會矮一點 */
  height?: number
  /** 最大放大倍數（相對於整張） */
  maxZoom?: number
  showToolbar?: boolean
  label?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptImageCompareProps>(), {
  beforeLabel: '',
  afterLabel: '',
  mode: 'slider',
  position: 50,
  opacity: 50,
  difference: false,
  height: 420,
  maxZoom: 8,
  showToolbar: true,
  label: '',
})

const emit = defineEmits<{
  (e: 'update:mode', value: CompareMode): void
  (e: 'update:position', value: number): void
  (e: 'update:opacity', value: number): void
  (e: 'update:difference', value: boolean): void
}>()

const uid = useId()

// ---- 受控 / 非受控狀態 ----
const mode = ref<CompareMode>(props.mode)
const position = ref(clampPercent(props.position))
const opacity = ref(Math.round(Math.min(100, Math.max(0, props.opacity))))
const difference = ref(props.difference)
watch(() => props.mode, (v) => (mode.value = v))
watch(() => props.position, (v) => (position.value = clampPercent(v)))
watch(() => props.opacity, (v) => (opacity.value = Math.round(Math.min(100, Math.max(0, v)))))
watch(() => props.difference, (v) => (difference.value = v))
function setMode(v: CompareMode): void {
  mode.value = v
  emit('update:mode', v)
}
function setPosition(v: number): void {
  position.value = clampPercent(v)
  emit('update:position', position.value)
}
function setOpacity(v: number): void {
  opacity.value = Math.round(Math.min(100, Math.max(0, v)))
  emit('update:opacity', opacity.value)
}
function setDifference(v: boolean): void {
  difference.value = v
  emit('update:difference', v)
}

const modeOptions = computed(() => (['slider', 'side', 'overlay'] as CompareMode[]).map((m) => ({ label: t.value.imageCompare.mode[m], value: m })))
const labelOf = (w: Which) => (w === 'before' ? props.beforeLabel || t.value.imageCompare.before : props.afterLabel || t.value.imageCompare.after)
const srcOf = (w: Which) => (w === 'before' ? props.before : props.after)

// ---- 影像大小 ----
const natural = reactive<Record<Which, { w: number; h: number } | null>>({ before: null, after: null })
const failed = reactive<Record<Which, boolean>>({ before: false, after: false })
watch(() => props.before, () => ((natural.before = null), (failed.before = false)))
watch(() => props.after, () => ((natural.after = null), (failed.after = false)))
function onLoad(w: Which, e: Event): void {
  const img = e.target as HTMLImageElement
  if (img.naturalWidth && img.naturalHeight) natural[w] = { w: img.naturalWidth, h: img.naturalHeight }
  failed[w] = false
}
/** 以 before 的大小為準（還沒載入時用 after 的、都沒有時 4:3） */
const img = computed(() => natural.before ?? natural.after ?? { w: 800, h: 600 })

// ---- 畫面大小 ----
const frame = useTemplateRef<HTMLDivElement>('frame')
const frameWidth = ref(600)
const GAP = 4
const paneW = computed(() => Math.max(1, mode.value === 'side' ? (frameWidth.value - GAP) / 2 : frameWidth.value))
/** 高度不超過 height，也不超過「影像照寬度縮放後的高度」（扁的影像不會留一大片空白） */
const frameHeight = computed(() => Math.max(160, Math.min(props.height, Math.round((paneW.value * img.value.h) / img.value.w))))
let observer: ResizeObserver | null = null
function measure(): void {
  if (frame.value?.clientWidth) frameWidth.value = frame.value.clientWidth
}
onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && frame.value) {
    observer = new ResizeObserver(() => measure())
    observer.observe(frame.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())

// ---- 縮放 / 平移（兩張共用） ----
/** null 為「整張」 */
const zoom = shallowRef<ImageZoom | null>(null)
const view = computed(() => viewOf(zoom.value, img.value.w, img.value.h, paneW.value, frameHeight.value))
const rel = computed(() => zoom.value?.rel ?? 1)
const imgStyle = computed<CSSProperties>(() => ({
  width: `${img.value.w}px`,
  height: `${img.value.h}px`,
  transform: `translate(${view.value.tx}px, ${view.value.ty}px) scale(${view.value.k})`,
}))
function setView(v: { k: number; tx: number; ty: number }): void {
  const { w, h } = img.value
  const clamped = clampImageView(v, w, h, paneW.value, frameHeight.value)
  const z = zoomOf(clamped, w, h, paneW.value, frameHeight.value)
  zoom.value = z.rel <= 1.0001 ? null : z
}
function zoomBy(factor: number, cx = paneW.value / 2, cy = frameHeight.value / 2): void {
  const fitK = view.value.k / rel.value
  setView(zoomImageTo(view.value, view.value.k * factor, cx, cy, fitK, fitK * props.maxZoom))
}
function fit(): void {
  zoom.value = null
}
function zoomTo(r: number): void {
  zoomBy(Math.min(props.maxZoom, Math.max(1, r)) / rel.value)
}

// ---- 每一格要畫什麼 ----
interface Pane {
  key: string
  label: string
  layers: Array<{ which: Which; style?: CSSProperties }>
  tags: Array<{ text: string; right?: boolean }>
}
const panes = computed<Pane[]>(() => {
  const name = props.label || t.value.imageCompare.label
  if (mode.value === 'side')
    return (['before', 'after'] as Which[]).map((w) => ({ key: w, label: `${name}: ${labelOf(w)}`, layers: [{ which: w }], tags: [{ text: labelOf(w) }] }))
  if (mode.value === 'overlay')
    return [
      {
        key: 'main',
        label: name,
        layers: [
          { which: 'before' },
          { which: 'after', style: difference.value ? { mixBlendMode: 'difference' } : { opacity: opacity.value / 100 } },
        ],
        tags: [{ text: difference.value ? t.value.imageCompare.diffTag(labelOf('before'), labelOf('after')) : `${labelOf('before')} + ${labelOf('after')} ${opacity.value}%` }],
      },
    ]
  return [
    {
      key: 'main',
      label: name,
      layers: [{ which: 'before' }, { which: 'after', style: { clipPath: `inset(0 0 0 ${position.value}%)` } }],
      tags: [{ text: labelOf('before') }, { text: labelOf('after'), right: true }],
    },
  ]
})

// ---- 拖曳平移、兩指縮放、Ctrl + 滾輪、雙擊 ----
const pointers = new Map<number, { x: number; y: number }>()
const dragging = ref(false)
let pinchDist = 0
function local(e: { clientX: number; clientY: number; currentTarget: EventTarget | null }) {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}
function onPointerDown(e: PointerEvent): void {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  pointers.set(e.pointerId, local(e))
  dragging.value = true
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
  }
}
function onPointerMove(e: PointerEvent): void {
  const prev = pointers.get(e.pointerId)
  if (!prev) return
  const p = local(e)
  pointers.set(e.pointerId, p)
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    const d = Math.hypot(a.x - b.x, a.y - b.y)
    if (pinchDist > 0) zoomBy(d / pinchDist, (a.x + b.x) / 2, (a.y + b.y) / 2)
    pinchDist = d
    return
  }
  if (!zoom.value) {
    // 沒放大時（沒東西可平移）在滑桿模式拖曳任何地方都是移動分隔線：手機上不用剛好按到把手
    if (mode.value === 'slider') setPosition(percentAt(p.x, paneW.value))
    return
  }
  const v = view.value
  setView({ k: v.k, tx: v.tx + p.x - prev.x, ty: v.ty + p.y - prev.y })
}
function onPointerUp(e: PointerEvent): void {
  pointers.delete(e.pointerId)
  if (pointers.size < 2) pinchDist = 0
  if (!pointers.size) dragging.value = false
}
function onWheel(e: WheelEvent): void {
  // 不按 Ctrl 時讓頁面照常捲動
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  const p = local(e)
  zoomBy(e.deltaY < 0 ? 1.2 : 1 / 1.2, p.x, p.y)
}
function onDblClick(e: MouseEvent): void {
  if (zoom.value) return fit()
  const p = local(e)
  zoomBy(2, p.x, p.y)
}
function onKeydown(e: KeyboardEvent): void {
  if (e.target !== e.currentTarget) return
  const step = 0.1
  const v = view.value
  if (e.key === '+' || e.key === '=') zoomBy(1.5)
  else if (e.key === '-' || e.key === '_') zoomBy(1 / 1.5)
  else if (e.key === '0') fit()
  else if (zoom.value && e.key === 'ArrowLeft') setView({ ...v, tx: v.tx + paneW.value * step })
  else if (zoom.value && e.key === 'ArrowRight') setView({ ...v, tx: v.tx - paneW.value * step })
  else if (zoom.value && e.key === 'ArrowUp') setView({ ...v, ty: v.ty + frameHeight.value * step })
  else if (zoom.value && e.key === 'ArrowDown') setView({ ...v, ty: v.ty - frameHeight.value * step })
  else return
  e.preventDefault()
}

// ---- 分隔線 ----
let handlePointer: number | null = null
function onHandleDown(e: PointerEvent): void {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  handlePointer = e.pointerId
  dragging.value = true
}
function onHandleMove(e: PointerEvent): void {
  if (handlePointer !== e.pointerId) return
  const pane = (e.currentTarget as HTMLElement).parentElement!
  setPosition(percentAt(e.clientX - pane.getBoundingClientRect().left, paneW.value))
}
function onHandleUp(e: PointerEvent): void {
  if (handlePointer !== e.pointerId) return
  handlePointer = null
  dragging.value = false
}
function onHandleKeydown(e: KeyboardEvent): void {
  const big = e.shiftKey ? 10 : 1
  const map: Record<string, number> = {
    ArrowLeft: position.value - big,
    ArrowDown: position.value - big,
    ArrowRight: position.value + big,
    ArrowUp: position.value + big,
    PageDown: position.value - 10,
    PageUp: position.value + 10,
    Home: 0,
    End: 100,
  }
  if (!(e.key in map)) return
  e.preventDefault()
  setPosition(map[e.key])
}

defineExpose({
  /** 回到整張 */
  fit,
  /** 縮放到相對於整張的 r 倍（以畫面中心） */
  zoomTo,
})
</script>
