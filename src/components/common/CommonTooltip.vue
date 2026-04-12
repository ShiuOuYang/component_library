<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        ref="tooltipEl"
        class="z-50"
        :class="[{ 'pointer-events-none': !interactive && !persistent }, strategy, { 'cursor-pointer': persistent && clickToClose }]"
        :style="tooltipStyle"
        @click="handleTooltipClick"
      >
        <div 
          class="backdrop-blur-sm rounded-lg shadow-2xl border"
          :class="[themeClass, maxWidthClass]"
        >
          <!-- 箭頭指示器 -->
          <div 
            v-if="showArrow"
            class="absolute w-3 h-3 rotate-45"
            :class="[arrowClass, themeArrowClass]"
          ></div>
          
          <!-- 內容區域 -->
          <div class="relative z-10 p-3">
            <!-- 標題 -->
            <div v-if="data.title" class="font-semibold text-sm mb-1" :class="titleClass">
              {{ data.title }}
            </div>
            
            <!-- 主要內容 - 完全由外部控制 -->
            <div v-if="contentItems.length > 0" class="space-y-1">
              <div v-for="(item, index) in contentItems" :key="index" class="flex justify-between items-center">
                <span class="text-xs" :class="item.labelClass || labelClass">{{ item.label }}:</span>
                <span class="text-xs font-medium ml-2" :class="item.valueClass || defaultValueClass">{{ item.value }}</span>
              </div>
            </div>
            
            <!-- 額外信息 -->
            <div v-if="data.extra" class="mt-2 pt-2 border-t" :class="borderClass">
              <div class="text-xs" :class="extraClass">{{ data.extra }}</div>
            </div>
            
            <!-- 自定義插槽 -->
            <slot :data="data"></slot>
            
            <!-- 固定模式提示 -->
            <div v-if="persistent && clickToClose" class="mt-2 pt-2 border-t" :class="borderClass">
              <div class="text-xs text-center opacity-60" :class="extraClass">點擊關閉</div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  data: {
    type: Object,
    default: () => ({
      title: '',
      items: [], // 接收已格式化的項目陣列
      extra: ''
    })
  },
  theme: {
    type: String,
    default: 'info', // dark, light, info, warning, error
    validator: (value) => ['dark', 'light', 'info', 'warning', 'error'].includes(value)
  },
  placement: {
    type: String,
    default: 'top-right', // top, bottom, left, right, top-left, top-right, etc.
  },
  showArrow: {
    type: Boolean,
    default: true
  },
  offset: {
    type: Object,
    default: () => ({ x: 15, y: -40 })
  },
  maxWidth: {
    type: String,
    default: 'sm' // xs, sm, md, lg, xl, 2xl, none
  },
  interactive: {
    type: Boolean,
    default: false
  },
  strategy: {
    type: String,
    default: 'absolute', // 'fixed' | 'absolute'
    validator: (val) => ['fixed', 'absolute'].includes(val)
  },
  autoAdjustPosition: {
    type: Boolean,
    default: true  // 啟用自動邊界檢測與位置修正
  },
  persistent: {
    type: Boolean,
    default: false  // 點擊後固定顯示，不會因 mouseleave 而關閉
  },
  clickToClose: {
    type: Boolean,
    default: true  // persistent 模式下，是否允許點擊關閉
  }
})

const emit = defineEmits(['close'])

const tooltipEl = ref(null)
const actualSize = ref({ width: 0, height: 0 })
const adjustedPosition = ref({ left: 0, top: 0 })
let resizeObserver = null

// 處理點擊關閉
const handleTooltipClick = (event) => {
  if (props.persistent && props.clickToClose) {
    event.stopPropagation()
    emit('close')
  }
}

// 處理外部點擊關閉
const handleClickOutside = (event) => {
  if (props.persistent && tooltipEl.value && !tooltipEl.value.contains(event.target)) {
    emit('close')
  }
}

// 監聽外部點擊
watch(() => props.visible, (newVisible) => {
  if (newVisible && props.persistent) {
    // 延遲添加監聽器，避免立即觸發
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 100)
  } else {
    document.removeEventListener('click', handleClickOutside)
  }
})

const updateSize = () => {
  if (tooltipEl.value) {
    const rect = tooltipEl.value.getBoundingClientRect()
    const newSize = {
      width: Math.ceil(rect.width),  // 使用 ceil 避免小數誤差
      height: Math.ceil(rect.height)
    }
    
    // 只有在尺寸真的變化時才更新（避免無限循環）
    if (newSize.width !== actualSize.value.width ||
        newSize.height !== actualSize.value.height) {
      actualSize.value = newSize
      
      // 只有在啟用自動調整時才重新計算位置
      if (props.autoAdjustPosition) {
        nextTick(() => {
          calculatePosition()
        })
      }
    }
  }
}

// 計算並設定 tooltip 位置
const calculatePosition = () => {
  const { x, y } = props.position
  const { x: offsetX, y: offsetY } = props.offset
  
  let left = x + offsetX
  let top = y + offsetY
  
  // 只有在啟用自動調整時才進行邊界檢測
  if (props.autoAdjustPosition && typeof window !== 'undefined') {
    const padding = 30  // 增加 padding 避免貼邊
    
    // 優先使用實際測量的寬高，如果還沒測量到則使用預估值
    const widthMap = {
      xs: 320, sm: 384, md: 448, lg: 512, xl: 576, '2xl': 672, none: 800
    }
    const fallbackWidth = widthMap[props.maxWidth] || 320
    
    // 使用實際尺寸，如果沒有則使用預估值
    const currentWidth = actualSize.value.width > 0 ? actualSize.value.width : fallbackWidth
    const currentHeight = actualSize.value.height > 0 ? actualSize.value.height : 400
    
    const maxLeft = window.innerWidth - currentWidth - padding 
    const maxTop = window.innerHeight - currentHeight - padding 
    
    // 確保不超出邊界
    left = Math.max(padding, Math.min(left, maxLeft))
    top = Math.max(padding, Math.min(top, maxTop))
  }

  // 處理捲動偏移（無論是否啟用自動調整都需要）
  if (props.strategy === 'absolute' && typeof window !== 'undefined') {
    left += window.scrollX
    top += window.scrollY
  }
  
  adjustedPosition.value = { 
    left: Math.round(left),  // 四捨五入避免亞像素誤差
    top: Math.round(top) 
  }
}

// 監聽顯示狀態來管理 ResizeObserver
watch(() => props.visible, async (newVisible) => {
  if (newVisible) {
    // ✅ 立即計算位置
    calculatePosition()
    
    // 只有在啟用自動調整時才進行二次精確計算和持續監測
    if (props.autoAdjustPosition) {
      await nextTick()
      // 延遲一點點確保 DOM 完全渲染後再次精確計算
      setTimeout(() => {
        if (tooltipEl.value) {
          updateSize() // 測量實際尺寸並重新計算位置
          
          if (!resizeObserver) {
            try {
              resizeObserver = new ResizeObserver(updateSize)
            } catch (error) {
              console.warn('ResizeObserver initialization failed:', error)
              return
            }
          }
          resizeObserver.observe(tooltipEl.value)
        }
      }, 10)
    }
  } else {
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
  }
}, { immediate: true })

// 監聽 position 變化重新計算位置
watch(() => props.position, () => {
  if (props.visible) {
    calculatePosition()
  }
}, { deep: true })

// 監聽 autoAdjustPosition 變化，立即重新計算位置
watch(() => props.autoAdjustPosition, (newValue) => {
  if (props.visible) {
    calculatePosition()
    
    // 如果啟用自動調整且還沒有 ResizeObserver，則啟用
    if (newValue && !resizeObserver && tooltipEl.value) {
      try {
        resizeObserver = new ResizeObserver(updateSize)
        resizeObserver.observe(tooltipEl.value)
      } catch (error) {
        console.warn('ResizeObserver initialization failed:', error)
      }
    }
    // 如果禁用自動調整，則停止監測
    else if (!newValue && resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  document.removeEventListener('click', handleClickOutside)
})


// 最大寬度樣式
const maxWidthClass = computed(() => {
  const widths = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    none: 'max-w-none'
  }
  return widths[props.maxWidth] || widths.xs
})

// 主題樣式
const themeClass = computed(() => {
  const themes = {
    dark: 'bg-slate-800/95 border-slate-600/50 text-white',
    light: 'bg-white/95 border-gray-200 text-gray-800 shadow-lg',
    info: 'bg-blue-800/95 border-blue-600/50 text-blue-50',
    warning: 'bg-amber-800/95 border-amber-600/50 text-amber-50',
    error: 'bg-red-800/95 border-red-600/50 text-red-50'
  }
  return themes[props.theme] || themes.dark
})

// 箭頭主題樣式
const themeArrowClass = computed(() => {
  const themes = {
    dark: 'bg-slate-800/95 border-slate-600/50',
    light: 'bg-white/95 border-gray-200',
    info: 'bg-blue-800/95 border-blue-600/50',
    warning: 'bg-amber-800/95 border-amber-600/50',
    error: 'bg-red-800/95 border-red-600/50'
  }
  return themes[props.theme] || themes.dark
})

// 文字顏色樣式
const titleClass = computed(() => {
  const themes = {
    dark: 'text-slate-100',
    light: 'text-gray-800',
    info: 'text-blue-50',
    warning: 'text-amber-50',
    error: 'text-red-50'
  }
  return themes[props.theme] || themes.dark
})

const labelClass = computed(() => {
  const themes = {
    dark: 'text-slate-300',
    light: 'text-gray-600',
    info: 'text-blue-200',
    warning: 'text-amber-200',
    error: 'text-red-200'
  }
  return themes[props.theme] || themes.dark
})

const defaultValueClass = computed(() => {
  const themes = {
    dark: 'text-white',
    light: 'text-gray-800',
    info: 'text-blue-50',
    warning: 'text-amber-50',
    error: 'text-red-50'
  }
  return themes[props.theme] || themes.dark
})

const extraClass = computed(() => {
  const themes = {
    dark: 'text-slate-400',
    light: 'text-gray-500',
    info: 'text-blue-300',
    warning: 'text-amber-300',
    error: 'text-red-300'
  }
  return themes[props.theme] || themes.dark
})

const borderClass = computed(() => {
  const themes = {
    dark: 'border-slate-600/50',
    light: 'border-gray-200',
    info: 'border-blue-600/50',
    warning: 'border-amber-600/50',
    error: 'border-red-600/50'
  }
  return themes[props.theme] || themes.dark
})

// 箭頭位置
const arrowClass = computed(() => {
  const positions = {
    'top': '-bottom-1.5 left-1/2 -translate-x-1/2',
    'bottom': '-top-1.5 left-1/2 -translate-x-1/2',
    'left': '-right-1.5 top-1/2 -translate-y-1/2',
    'right': '-left-1.5 top-1/2 -translate-y-1/2',
    'top-left': '-bottom-1.5 left-4',
    'top-right': '-bottom-1.5 right-4',
    'bottom-left': '-top-1.5 left-4',
    'bottom-right': '-top-1.5 right-4'
  }
  return positions[props.placement] || positions['top-right']
})

// 計算 tooltip 位置（使用預先計算好的位置）
const tooltipStyle = computed(() => {
  return {
    left: `${adjustedPosition.value.left}px`,
    top: `${adjustedPosition.value.top}px`,
    transform: 'translateZ(0)' // 硬體加速
  }
})

// ✅ 直接使用傳入的 items,不做任何業務邏輯處理
const contentItems = computed(() => props.data.items || [])
</script>

<style scoped>
/* 確保 Teleport 的 z-index 層級正確 */
.fixed {
  z-index: 9999;
}

/* 箭頭邊框樣式 */
.rotate-45 {
  border-left: inherit;
  border-bottom: inherit;
}
</style>
