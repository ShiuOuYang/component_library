<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="props.open && images.length"
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-label="dialogLabel"
        tabindex="-1"
        class="fixed inset-0 z-modal flex flex-col bg-black/85 focus:outline-none"
        @keydown="onKeydown"
        @wheel.prevent="onWheel"
      >
        <!-- 工具列 -->
        <div class="relative z-10 flex items-center justify-between gap-2 p-3 text-white">
          <span class="min-w-0 truncate text-sm" aria-live="polite">
            <span v-if="images.length > 1" class="mr-3 tabular-nums">{{ index + 1 }} / {{ images.length }}</span>{{ currentAlt }}
          </span>
          <div class="flex items-center gap-1">
            <button
              v-for="tool in tools"
              :key="tool.label"
              type="button"
              :aria-label="tool.label"
              :title="`${tool.label}（${tool.key}）`"
              :disabled="tool.disabled"
              class="inline-flex h-control-md min-w-control-md items-center justify-center rounded-md text-white/90 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40 disabled:hover:bg-transparent"
              @click="tool.action"
            >
              <ChptIcon :size="22" color="current">{{ tool.icon }}</ChptIcon>
            </button>
            <span class="mx-1 h-6 w-px bg-white/25" aria-hidden="true"></span>
            <button
              ref="closeButton"
              type="button"
              aria-label="關閉"
              title="關閉（Esc）"
              class="inline-flex h-control-md min-w-control-md items-center justify-center rounded-md text-white/90 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              @click="close"
            >
              <ChptIcon :size="24" color="current">close</ChptIcon>
            </button>
          </div>
        </div>

        <!-- 圖片 -->
        <div
          class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
          :class="scale > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''"
          @pointerdown="onPointerDown"
          @click.self="close"
        >
          <img
            :key="current.src"
            :src="current.src"
            :alt="currentAlt"
            draggable="false"
            class="max-h-full max-w-full select-none object-contain transition-transform duration-150"
            :class="dragging ? '!transition-none' : ''"
            :style="{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)` }"
          />

          <button
            v-if="images.length > 1"
            type="button"
            aria-label="上一張"
            class="absolute left-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            @click="go(-1)"
          >
            <ChptIcon :size="28" color="current">chevron_left</ChptIcon>
          </button>
          <button
            v-if="images.length > 1"
            type="button"
            aria-label="下一張"
            class="absolute right-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            @click="go(1)"
          >
            <ChptIcon :size="28" color="current">chevron_right</ChptIcon>
          </button>
        </div>

        <!-- 縮圖列 -->
        <div v-if="images.length > 1 && props.thumbnails" class="flex justify-center gap-2 overflow-x-auto p-3" role="group" aria-label="縮圖">
          <button
            v-for="(img, i) in images"
            :key="`${img.src}-${i}`"
            type="button"
            :aria-label="`第 ${i + 1} 張${img.alt ? `：${img.alt}` : ''}`"
            :aria-current="i === index ? 'true' : undefined"
            class="size-14 shrink-0 overflow-hidden rounded-md ring-2 transition focus:outline-none focus-visible:ring-white"
            :class="i === index ? 'ring-white' : 'ring-transparent opacity-60 hover:opacity-100'"
            @click="show(i)"
          >
            <img :src="img.src" alt="" class="size-full object-cover" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref, useTemplateRef, watch } from 'vue'
import ChptIcon from './ChptIcon.vue'
import { useOverlay } from '@/components/library/shared/useOverlay'

/**
 * ChptImageViewer（CHPT 主題） - 全螢幕圖片檢視
 *
 * ChptImage 點開預覽用的就是它；也可以單獨用來看一組圖（檢驗照片、AOI 瑕疵圖）：
 * ```vue
 * <ChptImageViewer v-model:open="open" v-model:index="i" :images="photos" />
 * ```
 *
 * 操作：
 *   - ← → 上 / 下一張，+ / − 或滾輪縮放，0 重設，R 旋轉，Esc 關閉
 *   - 放大後可以拖曳移動
 *   - 點圖片外的空白處關閉
 * 無障礙：模態 dialog（焦點困在裡面、背景不捲動、關閉後焦點回到原本的元素），
 * 目前第幾張與說明文字以 live region 報讀。
 */

export interface ViewerImage {
  src: string
  alt?: string
}

interface ChptImageViewerProps {
  open?: boolean
  images: (string | ViewerImage)[]
  /** v-model:index：目前第幾張 */
  index?: number
  /** 到最後一張再往後時回到第一張 */
  loop?: boolean
  thumbnails?: boolean
  minScale?: number
  maxScale?: number
}

const props = withDefaults(defineProps<ChptImageViewerProps>(), {
  open: false,
  index: 0,
  loop: true,
  thumbnails: true,
  minScale: 0.25,
  maxScale: 8,
})

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'update:index', value: number): void
  (e: 'close'): void
}>()

const panel = useTemplateRef<HTMLElement>('panel')
const closeButton = useTemplateRef<HTMLButtonElement>('closeButton')

const images = computed<ViewerImage[]>(() => props.images.map((img) => (typeof img === 'string' ? { src: img } : img)))
const index = ref(props.index)
watch(
  () => props.index,
  (i) => (index.value = i)
)
const current = computed(() => images.value[Math.min(index.value, images.value.length - 1)] ?? { src: '' })
const currentAlt = computed(() => current.value.alt ?? '')
const dialogLabel = computed(() => (currentAlt.value ? `圖片檢視：${currentAlt.value}` : '圖片檢視'))

// ---- 縮放 / 旋轉 / 平移 ----

const scale = ref(1)
const rotation = ref(0)
const offset = reactive({ x: 0, y: 0 })

function reset(): void {
  scale.value = 1
  rotation.value = 0
  offset.x = 0
  offset.y = 0
}

function zoom(factor: number): void {
  const next = Math.min(props.maxScale, Math.max(props.minScale, +(scale.value * factor).toFixed(3)))
  scale.value = next
  if (next <= 1) {
    offset.x = 0
    offset.y = 0
  }
}

function rotate(): void {
  rotation.value = (rotation.value + 90) % 360
}

function onWheel(event: WheelEvent): void {
  zoom(event.deltaY < 0 ? 1.15 : 1 / 1.15)
}

const dragging = ref(false)
function onPointerDown(event: PointerEvent): void {
  if (scale.value <= 1 || event.button !== 0) return
  if ((event.target as HTMLElement).closest('button')) return
  dragging.value = true
  const start = { x: event.clientX - offset.x, y: event.clientY - offset.y }
  const move = (e: PointerEvent) => {
    offset.x = e.clientX - start.x
    offset.y = e.clientY - start.y
  }
  const up = () => {
    dragging.value = false
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

// ---- 切換 ----

function show(i: number): void {
  const n = images.value.length
  if (!n) return
  const next = props.loop ? (i + n) % n : Math.min(n - 1, Math.max(0, i))
  if (next === index.value) return
  index.value = next
  reset()
  emit('update:index', next)
}

function go(dir: 1 | -1): void {
  show(index.value + dir)
}

function close(): void {
  emit('update:open', false)
  emit('close')
}

const tools = computed(() => [
  { label: '縮小', icon: 'zoom_out', key: '−', action: () => zoom(1 / 1.25), disabled: scale.value <= props.minScale },
  { label: '放大', icon: 'zoom_in', key: '+', action: () => zoom(1.25), disabled: scale.value >= props.maxScale },
  { label: '重設', icon: 'fit_screen', key: '0', action: reset, disabled: false },
  { label: '旋轉', icon: 'rotate_right', key: 'R', action: rotate, disabled: false },
])

function onKeydown(event: KeyboardEvent): void {
  // 焦點在按鈕上時，Enter / Space 留給按鈕
  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      go(-1)
      break
    case 'ArrowRight':
      event.preventDefault()
      go(1)
      break
    case '+':
    case '=':
      event.preventDefault()
      zoom(1.25)
      break
    case '-':
    case '_':
      event.preventDefault()
      zoom(1 / 1.25)
      break
    case '0':
      event.preventDefault()
      reset()
      break
    case 'r':
    case 'R':
      event.preventDefault()
      rotate()
      break
  }
}

// 每次打開都從原始大小開始
watch(
  () => props.open,
  (open) => {
    if (open) {
      index.value = props.index
      reset()
    }
  }
)

useOverlay(() => props.open && images.value.length > 0, panel, {
  onEscape: close,
  initialFocus: () => closeButton.value,
})

defineExpose({ zoomIn: () => zoom(1.25), zoomOut: () => zoom(1 / 1.25), reset, rotate, next: () => go(1), prev: () => go(-1) })
</script>
