<template>
  <Teleport to="body">
    <Transition
      name="modal"
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
        :style="{ zIndex: props.zIndex }"
      >
        <!-- 使用內聯樣式確保背景透明度正確 -->
        <div 
          class="absolute inset-0"
          :class="{ 'pointer-events-none': props.backdropOpacity === 0 }"
          :style="{ backgroundColor: `rgba(0, 0, 0, ${props.backdropOpacity})` }"
          @click="handleBackdropClick"
        ></div>
        
        <!-- Modal 容器 -->
        <div
          ref="modalRef"
          class="relative bg-white overflow-hidden pointer-events-auto"
          :class="[props.roundedClass, props.shadowClass, props.borderClass]"
          :style="modalStyle"
          @mousedown="handleModalClick"
        >
          <!-- Modal 標題欄 -->
          <div
            ref="headerRef"
            class="flex items-center justify-between px-4 py-3 bg-gradient-to-r border-b border-gray-200 cursor-move select-none"
            :class="props.headerBgColor"
            @mousedown="startDrag"
          >
            <div class="flex items-center gap-2" >
              <!-- 拖曳圖示 -->
              <div class="text-gray-400 hover:text-gray-600 transition-colors" v-show="props.draggable" title="拖曳移動">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" >
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                </svg>
              </div>
              
              <!-- 標題 -->
              <h3 class="text-lg font-semibold" :class="props.headerTextColor">
                <slot name="title">{{ title }}</slot>
              </h3>
            </div>
            
            <!-- 控制按鈕 -->
            <div class="flex items-center gap-1">
              <!-- 最小化按鈕 -->
              <button
                v-if="minimizable"
                @click="toggleMinimize"
                class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-50 active:bg-amber-100 transition-all text-slate-500 hover:text-amber-600"
                title="縮小到口袋"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" d="M5 12h14"/>
                </svg>
              </button>
              
              <!-- 最大化/還原按鈕 -->
              <button
                v-if="maximizable"
                @click="toggleMaximize"
                class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200/60 active:bg-slate-300/60 transition-all text-slate-500 hover:text-slate-700"
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
              
              <!-- 關閉按鈕 -->
              <button
                v-if="closable"
                @click="handleClose"
                class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 active:bg-red-100 transition-all text-slate-500 hover:text-red-500"
                title="關閉"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Modal 內容 -->
          <div
            v-show="!isMinimized"
            class="relative"
            :style="contentStyle"
          >
            <!-- 內容區域 -->
            <div class="max-h-full overflow-auto" :class="props.contentPadding">
              <!-- 預設插槽 -->
              <slot></slot>
            </div>
            
            <!-- 底部按鈕區 -->
            <div v-if="hasFooterSlot" class="px-4 py-3 border-t border-gray-200" :class="props.footerBgColor">
              <slot name="footer"></slot>
            </div>
          </div>
          
          <!-- 調整大小控制點 -->
          <div
            v-if="resizable && !isMaximized && !isMinimized"
            class="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-60 hover:opacity-100 transition-opacity"
            @mousedown="startResize"
          >
            <svg class="w-4 h-4 text-gray-400 rotate-45" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
            </svg>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, useSlots, nextTick, type CSSProperties } from 'vue'
import { useModalManager, generateModalId } from '../../composables/useModalManager'

interface ModalState {
  x: number
  y: number
  width: number
  height: number
}

interface Props {
  id?: string
  modelValue?: boolean
  title?: string
  width?: string | number
  height?: string | number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  x?: number | null
  y?: number | null
  draggable?: boolean
  resizable?: boolean
  closable?: boolean
  minimizable?: boolean
  maximizable?: boolean
  zIndex?: number
  defaultMaximized?: boolean
  headerBgColor?: string
  headerTextColor?: string
  borderClass?: string
  roundedClass?: string
  shadowClass?: string
  backdropOpacity?: number
  contentPadding?: string
  footerBgColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  modelValue: false,
  title: 'Modal',
  width: 600,
  height: 400,
  minWidth: 300,
  minHeight: 200,
  maxWidth: () => window.innerWidth - 40,
  maxHeight: () => window.innerHeight - 40,
  x: null,
  y: null,
  draggable: true,
  resizable: true,
  closable: true,
  minimizable: true,
  maximizable: true,
  zIndex: 30,
  defaultMaximized: false,
  headerBgColor: 'from-blue-50 to-indigo-50',
  headerTextColor: 'text-gray-800',
  borderClass: 'border border-gray-300',
  roundedClass: 'rounded-lg',
  shadowClass: 'shadow-2xl',
  backdropOpacity: 0.5,
  contentPadding: 'p-4',
  footerBgColor: 'bg-gray-50',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
  open: []
  minimize: [value: boolean]
  maximize: []
  restore: []
}>()

// Modal 管理器（多視窗支援）
const { registerMinimized, unregisterMinimized } = useModalManager()
const modalId = props.id ?? generateModalId()

// 獲取插槽信息
const slots = useSlots()
const hasFooterSlot = computed(() => !!slots.footer)

// Modal 狀態
const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})
const isMinimized = ref(false)
const isMaximized = ref(props.defaultMaximized)

// Modal 位置和大小
const modalX = ref(0)
const modalY = ref(0)
const modalWidth = ref(0)
const modalHeight = ref(0)

// 拖曳狀態
const isDragging = ref(false)
const isResizing = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragStartModalX = ref(0)
const dragStartModalY = ref(0)

// 調整大小狀態
const resizeStartX = ref(0)
const resizeStartY = ref(0)
const resizeStartWidth = ref(0)
const resizeStartHeight = ref(0)

// 保存最大化前的狀態
const beforeMaximize = ref<ModalState>({
  x: 0,
  y: 0,
  width: typeof props.width === 'string' ? parseInt(props.width) : props.width,
  height: typeof props.height === 'string' ? parseInt(props.height) : props.height
})

// 模板引用
const modalRef = ref<HTMLDivElement | null>(null)
const headerRef = ref<HTMLDivElement | null>(null)

// 初始化 Modal 位置和大小
function initializeModal(): void {
  // 設置初始大小
  modalWidth.value = typeof props.width === 'string' ? parseInt(props.width) : props.width
  modalHeight.value = typeof props.height === 'string' ? parseInt(props.height) : props.height
  
  // 設置初始位置 (居中)
  if (props.x !== null && props.y !== null) {
    modalX.value = props.x
    modalY.value = props.y
  } else {
    modalX.value = (window.innerWidth - modalWidth.value) / 2
    modalY.value = (window.innerHeight - modalHeight.value) / 2
  }
  
  // 🔧 修正：如果預設最大化，設定正確的狀態
  if (props.defaultMaximized) {
    // 保存正常大小狀態
    beforeMaximize.value = {
      x: modalX.value,
      y: modalY.value,
      width: modalWidth.value,
      height: modalHeight.value
    }
    isMaximized.value = true
  }
  
  // 確保 Modal 在視窗範圍內
  constrainToViewport()
}

// 限制 Modal 在視窗範圍內
function constrainToViewport(): void {
  const maxX = window.innerWidth - modalWidth.value
  const maxY = window.innerHeight - modalHeight.value
  
  modalX.value = Math.max(0, Math.min(modalX.value, maxX))
  modalY.value = Math.max(0, Math.min(modalY.value, maxY))
  
  // 限制大小
  modalWidth.value = Math.max(props.minWidth, Math.min(modalWidth.value, props.maxWidth))
  modalHeight.value = Math.max(props.minHeight, Math.min(modalHeight.value, props.maxHeight))
}

// Modal 樣式
const modalStyle = computed<CSSProperties>(() => {
  if (isMaximized.value) {
    return {
      position: 'fixed',
      top: '0px',
      left: '0px',
      width: '100vw',
      height: '100vh',
      transform: 'none',
      zIndex: props.zIndex
    }
  }
  
  if (isMinimized.value) {
    return {
      position: 'fixed',
      top: `${modalY.value}px`,
      left: `${modalX.value}px`,
      width: `${modalWidth.value}px`,
      height: 'auto',
      transform: 'none',
      zIndex: props.zIndex
    }
  }
  
  return {
    position: 'fixed',
    top: `${modalY.value}px`,
    left: `${modalX.value}px`,
    width: `${modalWidth.value}px`,
    height: `${modalHeight.value}px`,
    transform: 'none',
    zIndex: props.zIndex
  }
})

// 內容區域樣式
const contentStyle = computed<CSSProperties>(() => {
  if (isMaximized.value) {
    return {
      maxHeight: 'calc(100vh - 60px)', // 減去標題欄高度
      overflow: 'auto'
    }
  }
  
  return {
    maxHeight: `${modalHeight.value - 60}px`, // 減去標題欄高度
    overflow: 'auto'
  }
})

// 開始拖曳
function startDrag(event: MouseEvent): void {
  if (!props.draggable || isMaximized.value) return
  
  event.preventDefault()
  event.stopPropagation()
  
  isDragging.value = true
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY
  dragStartModalX.value = modalX.value
  dragStartModalY.value = modalY.value
  
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'move'
}

// 處理拖曳
function handleDrag(event: MouseEvent): void {
  if (!isDragging.value) return
  
  const deltaX = event.clientX - dragStartX.value
  const deltaY = event.clientY - dragStartY.value
  
  modalX.value = dragStartModalX.value + deltaX
  modalY.value = dragStartModalY.value + deltaY
  
  constrainToViewport()
}

// 停止拖曳
function stopDrag(): void {
  isDragging.value = false
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
}

// 開始調整大小
function startResize(event: MouseEvent): void {
  if (!props.resizable) return
  
  event.preventDefault()
  event.stopPropagation()
  
  isResizing.value = true
  resizeStartX.value = event.clientX
  resizeStartY.value = event.clientY
  resizeStartWidth.value = modalWidth.value
  resizeStartHeight.value = modalHeight.value
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'se-resize'
}

// 處理調整大小
function handleResize(event: MouseEvent): void {
  if (!isResizing.value) return
  
  const deltaX = event.clientX - resizeStartX.value
  const deltaY = event.clientY - resizeStartY.value
  
  modalWidth.value = resizeStartWidth.value + deltaX
  modalHeight.value = resizeStartHeight.value + deltaY
  
  constrainToViewport()
}

// 停止調整大小
function stopResize(): void {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
}

// 縮小到口袋 (Dock)
function doMinimize(): void {
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

// 從口袋還原
function doRestore(): void {
  isMinimized.value = false
  unregisterMinimized(modalId)
  emit('minimize', false)
}

// 切換最小化
function toggleMinimize(): void {
  if (isMinimized.value) {
    doRestore()
  } else {
    doMinimize()
  }
}

// 切換最大化
function toggleMaximize(): void {
  if (!isMaximized.value) {
    // 保存當前狀態
    beforeMaximize.value = {
      x: modalX.value,
      y: modalY.value,
      width: modalWidth.value,
      height: modalHeight.value
    }
    isMaximized.value = true
    emit('maximize')
  } else {
    // 還原之前的狀態
    modalX.value = beforeMaximize.value.x
    modalY.value = beforeMaximize.value.y
    modalWidth.value = beforeMaximize.value.width
    modalHeight.value = beforeMaximize.value.height
    isMaximized.value = false
    emit('restore')
  }
}

// 處理關閉
function handleClose(): void {
  if (isMinimized.value) {
    isMinimized.value = false
    unregisterMinimized(modalId)
  }
  emit('update:modelValue', false)
  emit('close')
}

// 處理背景點擊
function handleBackdropClick(_event: MouseEvent): void {
  // // 如果是遮罩點擊
  // if (event.target === event.currentTarget && props.maskClosable) {
  //   handleClose()
  // }
}

// 處理 Modal 點擊 (防止冒泡)
function handleModalClick(event: MouseEvent): void {
  event.stopPropagation()
}

// 監聽鍵盤事件
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.modelValue && props.closable) {
    handleClose()
  }
}

// 監聽視窗大小變化
function handleWindowResize(): void {
  if (props.modelValue) {
    constrainToViewport()
  }
}

// 監聽 modelValue 變化
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    nextTick(() => {
      initializeModal()
      emit('open')
    })
  } else {
    // 重置狀態
    if (isMinimized.value) {
      unregisterMinimized(modalId)
    }
    isMinimized.value = false
    // 只有當不是預設最大化時才重置 isMaximized
    if (!props.defaultMaximized) {
      isMaximized.value = false
      beforeMaximize.value = {
        x: 0,
        y: 0,
        width: typeof props.width === 'string' ? parseInt(props.width) : props.width,
        height: typeof props.height === 'string' ? parseInt(props.height) : props.height
      }
    }
  }
})

// 監聯 defaultMaximized 變化（保持現有邏輯）
watch(() => props.defaultMaximized, (newVal) => {
  isMaximized.value = newVal
  if (newVal && props.modelValue) {
    // 如果切換為預設最大化且 Modal 已開啟，保存當前狀態
    if (!beforeMaximize.value.width || beforeMaximize.value.width === 0) {
      beforeMaximize.value = {
        x: modalX.value,
        y: modalY.value,
        width: modalWidth.value,
        height: modalHeight.value
      }
    }
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', handleWindowResize)
  
  // 🔧 修正：如果 Modal 一開始就是顯示狀態，立即初始化
  if (props.modelValue) {
    nextTick(() => {
      initializeModal()
      emit('open')
    })
  }
})

onUnmounted(() => {
  // 如果組件卸載時仍在口袋中，清理註冊
  if (isMinimized.value) {
    unregisterMinimized(modalId)
  }
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleWindowResize)
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})

// 暴露方法
defineExpose({
  modalId,
  open: () => {
    emit('update:modelValue', true)
  },
  close: handleClose,
  minimize: doMinimize,
  maximize: () => {
    if (!isMaximized.value) {
      toggleMaximize()
    }
  },
  restore: () => {
    if (isMaximized.value) {
      toggleMaximize()
    }
    if (isMinimized.value) {
      doRestore()
    }
  },
  setPosition: (x: number, y: number) => {
    modalX.value = x
    modalY.value = y
    constrainToViewport()
  },
  setSize: (width: number, height: number) => {
    modalWidth.value = width
    modalHeight.value = height
    constrainToViewport()
  },
  center: () => {
    modalX.value = (window.innerWidth - modalWidth.value) / 2
    modalY.value = (window.innerHeight - modalHeight.value) / 2
    constrainToViewport()
  }
})
</script>

<style scoped>
/* 動畫效果 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* 防止文字選擇 */
.select-none {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

/* 拖曳時的樣式 */
.cursor-move {
  cursor: move !important;
}

.cursor-se-resize {
  cursor: se-resize !important;
}

/* 調整滾動條樣式 */
.overflow-auto::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.overflow-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 確保 Modal 在最上層 */
/* .fixed {
  z-index: v-bind(zIndex);
} */
</style>
