<template>
  <Teleport to="body">
    <!-- dialog 模式：簡潔置中確認框 -->
    <Transition
      v-if="mode === 'dialog'"
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        :style="{ zIndex: dialogZIndex }"
      >
        <div
          class="absolute inset-0"
          aria-hidden="true"
          :style="{ backgroundColor: `rgba(0,0,0,${props.backdropOpacity})` }"
          @click="handleBackdrop"
        />

        <Transition
          appear
          enter-active-class="transition-all duration-200"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-150"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            ref="dialogPanel"
            role="dialog"
            aria-modal="true"
            :aria-label="props.title ? undefined : props.ariaLabel"
            :aria-labelledby="props.title ? titleId : undefined"
            tabindex="-1"
            class="relative bg-white rounded-xl shadow-2xl flex flex-col max-h-[85vh] focus:outline-none"
            :style="dialogBoxStyle"
          >
            <div
              v-if="props.title"
              class="flex items-center justify-between px-5 py-4 border-b border-neutral-100"
            >
              <h3 :id="titleId" class="font-semibold text-neutral-800">{{ props.title }}</h3>
              <button
                v-if="props.closable"
                type="button"
                class="flex items-center cursor-pointer text-neutral-400 hover:text-neutral-600 transition-colors"
                :aria-label="'關閉'"
                @click="handleClose"
              >
                <ChptIcon :size="20">close</ChptIcon>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto px-5 py-4" :style="dialogBodyStyle">
              <slot />
            </div>

            <div v-if="$slots.footer" class="px-5 py-3 border-t border-neutral-100 bg-neutral-50 rounded-b-xl">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- window 模式：完整多視窗，可拖曳/縮放/最大化/最小化到口袋 -->
    <Transition
      v-else
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        v-show="!isMinimized"
        class="fixed inset-0"
        :class="{ 'pointer-events-none': props.backdropOpacity === 0 }"
        :style="{ zIndex: currentZIndex }"
      >
        <div
          class="absolute inset-0"
          aria-hidden="true"
          :class="{ 'pointer-events-none': props.backdropOpacity === 0 }"
          :style="{ backgroundColor: `rgba(0, 0, 0, ${props.backdropOpacity})` }"
          @click="handleBackdrop"
        />

        <div
          ref="modalRef"
          role="dialog"
          :aria-modal="props.backdropOpacity > 0 ? 'true' : 'false'"
          :aria-label="props.title ? undefined : props.ariaLabel"
          :aria-labelledby="props.title ? titleId : undefined"
          tabindex="-1"
          class="relative bg-white overflow-hidden pointer-events-auto focus:outline-none"
          :class="[roundedClass, shadowClass, borderClass]"
          :style="windowStyle"
          @mousedown="handleBringToFront"
        >
          <div
            ref="headerRef"
            class="flex items-center justify-between px-4 py-3 bg-gradient-to-r border-b border-neutral-200 cursor-move select-none"
            :class="headerBgColor"
            @mousedown="startDrag"
          >
            <div class="flex items-center gap-2">
              <div
                v-show="props.draggable"
                class="text-neutral-400 hover:text-neutral-600 transition-colors"
                title="拖曳移動"
              >
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                </svg>
              </div>
              <h3 :id="titleId" class="text-lg font-semibold" :class="headerTextColor">
                <slot name="title">{{ title }}</slot>
              </h3>
            </div>

            <div class="flex items-center gap-1">
              <button
                v-if="showMinimizeButton"
                @click="toggleMinimize"
                class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-warning-50 active:bg-warning-100 transition-all text-neutral-500 hover:text-warning-600"
                :title="isMinimized ? '還原' : '縮小到口袋'"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" d="M5 12h14"/>
                </svg>
              </button>
              <button
                v-if="showMaximizeButton"
                @click="toggleMaximize"
                class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-200/60 active:bg-neutral-300/60 transition-all text-neutral-500 hover:text-neutral-700"
                :title="isMaximized ? '還原' : '最大化'"
              >
                <svg v-if="isMaximized" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                </svg>
              </button>
              <button
                v-if="showCloseButton"
                @click="handleClose"
                class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-danger-50 active:bg-danger-100 transition-all text-neutral-500 hover:text-danger-500"
                title="關閉"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/>
                </svg>
              </button>
            </div>
          </div>

          <div v-show="!isMinimized" class="relative" :style="windowContentStyle">
            <div class="max-h-full overflow-auto" :class="contentPadding">
              <slot></slot>
            </div>
            <div
              v-if="hasFooterSlot"
              class="px-4 py-3 border-t border-neutral-200"
              :class="footerBgColor"
            >
              <slot name="footer"></slot>
            </div>
          </div>

          <div
            v-if="props.resizable && !isMaximized && !isMinimized && mode === 'window'"
            class="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-60 hover:opacity-100 transition-opacity"
            @mousedown="startResize"
          >
            <svg class="w-4 h-4 text-neutral-400 rotate-45" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
            </svg>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {
  ref, computed, watch, onMounted, onUnmounted, useSlots, nextTick, type CSSProperties,
} from 'vue'
import ChptIcon from './ChptIcon.vue'
import { useId, useTemplateRef } from 'vue'
import { useModalManager, generateModalId } from '@/components/library/shared/useModalManager'
import { useOverlay } from '@/components/library/shared/useOverlay'

/**
 * ChptModal（CHPT 主題） - 通用模態框 / 多視窗
 *
 * 整合 DraggableModal 的豐富功能，提供兩種佈局模式：
 *
 * mode="dialog"：簡潔置中確認框（可調整尺寸、遮罩點擊關閉）
 *  - 適合：表單、確認、訊息對話框
 *
 * mode="window"：完整多視窗工作面板
 *  - 支援拖曳移動、拖曳縮放、最大化/還原、最小化到口袋（ModalDock）
 *  - 多個 window 同時開啟時自動管理 z-index
 *
 * 外部控制：透過 template ref 呼叫 open/close/minimize/maximize/restore，
 * 或使用 useModalManager() 的 restoreAll()/closeAll()。
 * 需搭配 <ModalDock /> 顯示被最小化的 window。
 */

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'
type ChptModalMode = 'dialog' | 'window'

interface ChptModalProps {
  /** v-model 值 */
  modelValue?: boolean
  /** 佈局模式：dialog 對話框 / window 多視窗 */
  mode?: ChptModalMode
  /**
   * 無標題時的無障礙名稱。
   * role="dialog" 一定要有可及名稱，否則螢幕閱讀器只會念「對話方塊」。
   */
  ariaLabel?: string
  /** 標題 */
  title?: string
  /** 視窗 ID（window 多實例時用） */
  id?: string
  /** 寬度（px/百分比） */
  width?: string | number
  /** 高度（px/百分比） */
  height?: string | number
  /** 預設尺寸（dialog 模式） */
  size?: ModalSize
  /** 是否全寬 */
  fullWidth?: boolean
  /** 是否顯示關閉按鈕 */
  closable?: boolean
  /** 點擊遮罩是否關閉 */
  maskClosable?: boolean
  /** 遮罩透明度（0~1） */
  backdropOpacity?: number
  /** 內容區高度上限 */
  bodyHeight?: number | string

  // ===== window 專屬 =====
  draggable?: boolean
  resizable?: boolean
  minimizable?: boolean
  maximizable?: boolean
  x?: number | null
  y?: number | null
  minWidth?: number
  minHeight?: number
  /**
   * window：最大寬度（px）。預設為視窗寬度減 40。
   * 自 DraggableModal 移植 —— 原本 ChptModal 把這個上限寫死在 constrainToViewport()。
   */
  maxWidth?: number
  /** window：最大高度（px）。預設為視窗高度減 40 */
  maxHeight?: number
  defaultMaximized?: boolean
  headerBgColor?: string
  headerTextColor?: string
  borderClass?: string
  roundedClass?: string
  shadowClass?: string
  contentPadding?: string
  footerBgColor?: string
}

const props = withDefaults(defineProps<ChptModalProps>(), {
  modelValue: false,
  mode: 'dialog',
  ariaLabel: '對話方塊',
  title: '',
  id: undefined,
  width: undefined,
  height: undefined,
  size: 'md',
  fullWidth: false,
  closable: true,
  maskClosable: true,
  backdropOpacity: 0.5,
  bodyHeight: undefined,

  draggable: true,
  resizable: true,
  minimizable: true,
  maximizable: true,
  x: null,
  y: null,
  minWidth: 300,
  minHeight: 200,
  maxWidth: undefined,
  maxHeight: undefined,
  defaultMaximized: false,
  headerBgColor: 'from-primary-50 to-primary-100',
  headerTextColor: 'text-neutral-800',
  borderClass: 'border border-neutral-300',
  roundedClass: 'rounded-lg',
  shadowClass: 'shadow-2xl',
  contentPadding: 'p-4',
  footerBgColor: 'bg-neutral-50',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'open'): void
  (e: 'close'): void
  (e: 'minimize', value: boolean): void
  (e: 'maximize'): void
  (e: 'restore'): void
}>()

// ===== 共用 =====
const slots = useSlots()
const hasFooterSlot = computed(() => !!slots.footer)

// ===== dialog 尺寸 =====
const sizeWidthMap: Record<ModalSize, string> = {
  sm: '400px', md: '600px', lg: '800px', xl: '1000px',
}
const dialogBoxStyle = computed(() => {
  const width = props.fullWidth
    ? '100%'
    : props.width !== undefined
      ? typeof props.width === 'number' ? `${props.width}px` : props.width
      : sizeWidthMap[props.size]
  return { width }
})
const dialogBodyStyle = computed(() => {
  if (props.bodyHeight === undefined) return {}
  const height = typeof props.bodyHeight === 'number' ? `${props.bodyHeight}px` : props.bodyHeight
  return { maxHeight: height }
})
const dialogZIndex = computed(() => 50)

// ===== window: Modal 管理器 =====
const {
  registerMinimized, unregisterMinimized, getZIndex, bringToFront, registerZIndex, unregisterZIndex,
} = useModalManager()

const modalId = props.id ?? generateModalId()
const currentZIndex = computed(() => getZIndex(modalId))

// ===== 無障礙 =====
/** 標題元素的 id，供 aria-labelledby 指向 */
const titleId = `${useId()}-title`

// dialog / window 兩種模式各有自己的面板容器，焦點陷阱要套在目前這個上
const dialogPanelRef = useTemplateRef<HTMLElement>('dialogPanel')
const windowPanelRef = useTemplateRef<HTMLElement>('modalRef')
const panelRef = computed(() =>
  props.mode === 'dialog' ? dialogPanelRef.value : windowPanelRef.value
)


// ===== window state =====
const isMinimized = ref(false)
const isMaximized = ref(props.defaultMaximized)

const modalX = ref(0)
const modalY = ref(0)
const modalWidth = ref(0)
const modalHeight = ref(0)

interface ModalState { x: number; y: number; width: number; height: number }
const beforeMaximize = ref<ModalState>({
  x: 0, y: 0,
  width: typeof props.width === 'number' ? props.width : 600,
  height: typeof props.height === 'number' ? props.height : 400,
})

// ===== window 控制項顯示 =====
const showMinimizeButton = computed(() => props.minimizable && props.mode === 'window')
const showMaximizeButton = computed(() => props.maximizable && props.mode === 'window')
const showCloseButton = computed(() => props.closable)

// ===== window 初始化 =====
function initializeModal(): void {
  modalWidth.value = typeof props.width === 'number'
    ? props.width
    : typeof props.width === 'string' ? parseInt(props.width, 10) : 600
  modalHeight.value = typeof props.height === 'number'
    ? props.height
    : typeof props.height === 'string' ? parseInt(props.height, 10) : 400

  if (props.x !== null && props.y !== null) {
    modalX.value = props.x
    modalY.value = props.y
  } else {
    modalX.value = (window.innerWidth - modalWidth.value) / 2
    modalY.value = (window.innerHeight - modalHeight.value) / 2
  }

  if (props.defaultMaximized) {
    beforeMaximize.value = { x: modalX.value, y: modalY.value, width: modalWidth.value, height: modalHeight.value }
    isMaximized.value = true
  }
  constrainToViewport()
}

function constrainToViewport(): void {
  const maxX = window.innerWidth - modalWidth.value
  const maxY = window.innerHeight - modalHeight.value
  modalX.value = Math.max(0, Math.min(modalX.value, maxX))
  modalY.value = Math.max(0, Math.min(modalY.value, maxY))

  // 上限原本寫死為視窗尺寸減 40；改為可由 maxWidth / maxHeight 覆寫，
  // 未提供時維持原本的預設值。
  const limitWidth = props.maxWidth ?? window.innerWidth - 40
  const limitHeight = props.maxHeight ?? window.innerHeight - 40
  modalWidth.value = Math.max(props.minWidth, Math.min(modalWidth.value, limitWidth))
  modalHeight.value = Math.max(props.minHeight, Math.min(modalHeight.value, limitHeight))
}

// ===== window 樣式 =====
const windowStyle = computed<CSSProperties>(() => {
  if (isMaximized.value) {
    return { position: 'fixed', top: '0px', left: '0px', width: '100vw', height: '100vh', zIndex: currentZIndex.value }
  }
  if (isMinimized.value) {
    return { position: 'fixed', top: `${modalY.value}px`, left: `${modalX.value}px`, width: `${modalWidth.value}px`, height: 'auto', zIndex: currentZIndex.value }
  }
  return { position: 'fixed', top: `${modalY.value}px`, left: `${modalX.value}px`, width: `${modalWidth.value}px`, height: `${modalHeight.value}px`, zIndex: currentZIndex.value }
})
const windowContentStyle = computed<CSSProperties>(() => ({
  maxHeight: isMaximized.value ? 'calc(100vh - 60px)' : `${modalHeight.value - 60}px`,
  overflow: 'auto',
}))

// ===== 拖曳 =====
const isDragging = ref(false)
const dragStartX = ref(0); const dragStartY = ref(0)
const dragStartModalX = ref(0); const dragStartModalY = ref(0)

function startDrag(event: MouseEvent): void {
  if (!props.draggable || isMaximized.value) return
  event.preventDefault(); event.stopPropagation()
  bringToFront(modalId)
  isDragging.value = true
  dragStartX.value = event.clientX; dragStartY.value = event.clientY
  dragStartModalX.value = modalX.value; dragStartModalY.value = modalY.value
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
  document.body.style.userSelect = 'none'; document.body.style.cursor = 'move'
}
function handleDrag(event: MouseEvent): void {
  if (!isDragging.value) return
  modalX.value = dragStartModalX.value + (event.clientX - dragStartX.value)
  modalY.value = dragStartModalY.value + (event.clientY - dragStartY.value)
  constrainToViewport()
}
function stopDrag(): void {
  isDragging.value = false
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.body.style.userSelect = ''; document.body.style.cursor = ''
}

// ===== 調整大小 =====
const isResizing = ref(false)
const resizeStartX = ref(0); const resizeStartY = ref(0)
const resizeStartWidth = ref(0); const resizeStartHeight = ref(0)

function startResize(event: MouseEvent): void {
  if (!props.resizable) return
  event.preventDefault(); event.stopPropagation()
  isResizing.value = true
  resizeStartX.value = event.clientX; resizeStartY.value = event.clientY
  resizeStartWidth.value = modalWidth.value; resizeStartHeight.value = modalHeight.value
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.userSelect = 'none'; document.body.style.cursor = 'se-resize'
}
function handleResize(event: MouseEvent): void {
  if (!isResizing.value) return
  modalWidth.value = resizeStartWidth.value + (event.clientX - resizeStartX.value)
  modalHeight.value = resizeStartHeight.value + (event.clientY - resizeStartY.value)
  constrainToViewport()
}
function stopResize(): void {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.userSelect = ''; document.body.style.cursor = ''
}

// ===== 最小化 / 最大化 =====
function doMinimize(): void {
  if (props.mode !== 'window') return
  isMinimized.value = true
  registerMinimized({
    id: modalId,
    title: props.title,
    headerBgColor: props.headerBgColor,
    restore: doRestore,
    close: handleClose,
  })
  emit('minimize', true)
}
function doRestore(): void {
  isMinimized.value = false
  unregisterMinimized(modalId)
  emit('minimize', false)
}
function toggleMinimize(): void {
  if (props.mode !== 'window') return
  if (isMinimized.value) doRestore(); else doMinimize()
}
function toggleMaximize(): void {
  if (props.mode !== 'window') return
  if (!isMaximized.value) {
    beforeMaximize.value = { x: modalX.value, y: modalY.value, width: modalWidth.value, height: modalHeight.value }
    isMaximized.value = true
    emit('maximize')
  } else {
    modalX.value = beforeMaximize.value.x; modalY.value = beforeMaximize.value.y
    modalWidth.value = beforeMaximize.value.width; modalHeight.value = beforeMaximize.value.height
    isMaximized.value = false
    emit('restore')
  }
}

// ===== 關閉 / 遮罩 =====
function handleClose(): void {
  if (props.mode === 'window' && isMinimized.value) {
    isMinimized.value = false
    unregisterMinimized(modalId)
  }
  emit('update:modelValue', false)
  emit('close')
}
function handleBackdrop(): void {
  if (props.maskClosable) handleClose()
}

/**
 * 浮層無障礙行為：焦點陷阱、焦點歸還、背景捲動鎖、Escape 只關最上層。
 *
 * ⚠️ 必須放在 isMinimized 與 handleClose 宣告之後 —— useOverlay 內部的 watch
 *    是 immediate 的，會立刻求值傳進來的 getter，提前呼叫會撞上 const 的 TDZ。
 */
useOverlay(
  // window 模式最小化到口袋時不算開啟，否則焦點會被困在看不見的面板裡
  () => props.modelValue && !(props.mode === 'window' && isMinimized.value),
  panelRef,
  {
    onEscape: () => handleClose(),
    closeOnEscape: () => props.closable,
    // window 模式是非模態的多視窗（背景仍可操作），不鎖捲動也不困住焦點
    lockScroll: props.mode === 'dialog',
    trapFocus: props.mode === 'dialog',
  }
)
function handleBringToFront(): void {
  if (props.mode === 'window') bringToFront(modalId)
}

// ===== 鍵盤 / resize =====
/**
 * Escape 的處理已移交 useOverlay 的全域堆疊。
 *
 * 原本每個 Modal 實例各自綁 document 的 keydown，同時開三個視窗時
 * 按一次 Escape 會三個一起關；現在只有堆疊最上層會收到。
 */
function handleWindowResize(): void {
  if (props.mode === 'window' && props.modelValue) constrainToViewport()
}

// ===== watch modelValue =====
watch(() => props.modelValue, (newVal) => {
  if (!newVal) return
  if (props.mode === 'window') {
    nextTick(() => { registerZIndex(modalId); bringToFront(modalId); initializeModal(); emit('open') })
  } else {
    emit('open')
  }
})

watch(() => props.defaultMaximized, (newVal) => {
  if (props.mode !== 'window') return
  isMaximized.value = newVal
})

onMounted(() => {
  window.addEventListener('resize', handleWindowResize)
  if (props.modelValue && props.mode === 'window') {
    nextTick(() => { registerZIndex(modalId); bringToFront(modalId); initializeModal() })
  }
})

onUnmounted(() => {
  unregisterZIndex(modalId)
  if (isMinimized.value) unregisterMinimized(modalId)
  window.removeEventListener('resize', handleWindowResize)
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})

// ===== 外部控制 API =====
defineExpose({
  modalId,
  open: () => emit('update:modelValue', true),
  close: handleClose,
  minimize: doMinimize,
  maximize: () => { if (props.mode === 'window' && !isMaximized.value) toggleMaximize() },
  restore: () => {
    if (props.mode === 'window' && isMaximized.value) toggleMaximize()
    if (isMinimized.value) doRestore()
  },
  setPosition: (x: number, y: number) => { if (props.mode !== 'window') return; modalX.value = x; modalY.value = y; constrainToViewport() },
  setSize: (width: number, height: number) => { if (props.mode !== 'window') return; modalWidth.value = width; modalHeight.value = height; constrainToViewport() },
  center: () => { if (props.mode !== 'window') return; modalX.value = (window.innerWidth - modalWidth.value) / 2; modalY.value = (window.innerHeight - modalHeight.value) / 2; constrainToViewport() },
})
</script>

<style scoped>
.select-none { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }
.cursor-move { cursor: move !important; }
.cursor-se-resize { cursor: se-resize !important; }
.overflow-auto::-webkit-scrollbar { width: 6px; height: 6px; }
.overflow-auto::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px; }
.overflow-auto::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 3px; }
.overflow-auto::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
</style>
