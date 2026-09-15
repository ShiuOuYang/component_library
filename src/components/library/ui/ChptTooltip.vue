<template>
  <span
    ref="triggerEl"
    class="inline-flex"
    :aria-describedby="visible ? tooltipId : undefined"
    @mouseenter="handleEnter"
    @mouseleave="handleLeave"
    @focusin="handleFocusIn"
    @focusout="handleFocusOut"
    @keydown.esc="handleLeave"
  >
    <slot></slot>

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
          :id="tooltipId"
          ref="tooltipEl"
          role="tooltip"
          class="fixed z-50"
          :style="{ left: left + 'px', top: top + 'px' }"
          :class="themeClass"
        >
          <!-- 箭頭指示器（純視覺） -->
          <div
            v-if="props.showArrow"
            aria-hidden="true"
            class="absolute w-3 h-3 rotate-45"
            :class="arrowClass"
          ></div>

          <div class="relative z-10 px-3 py-2 text-xs rounded-lg shadow-xl border break-words"
               :class="[themeClass, maxWidthClass]">
            <slot name="content" :content="props.content">{{ props.content }}</slot>
          </div>
        </div>
      </Transition>
    </Teleport>
  </span>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, useId } from 'vue'

/**
 * ChptTooltip（CHPT 主題）- 通用提示框
 *
 * 整合原 CommonTooltip，提供直覺的 content 觸發：
 * - 透過 slot 包裝觸發元素（hover / focus）即顯示
 * - content prop + #content 插槽自訂內容
 * - placement 定位 + showArrow 箭頭 + theme 主題
 */

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'
type TooltipTheme = 'dark' | 'light' | 'info' | 'warning' | 'error'

interface ChptTooltipProps {
  /** 提示內容 */
  content?: string
  /** 位置 */
  placement?: TooltipPlacement
  /** 主題 */
  theme?: TooltipTheme
  /** 顯示箭頭 */
  showArrow?: boolean
  /** 最大寬度（Tailwind max-w class） */
  maxWidth?: string
  /** 是否禁用 */
  disabled?: boolean
}

const props = withDefaults(defineProps<ChptTooltipProps>(), {
  content: '',
  placement: 'top',
  theme: 'dark',
  showArrow: true,
  maxWidth: 'max-w-xs',
  disabled: false,
})

const emit = defineEmits<{
  (e: 'show'): void
  (e: 'hide'): void
}>()

const triggerEl = ref<HTMLElement | null>(null)
const tooltipEl = ref<HTMLElement | null>(null)
const visible = ref(false)

/** tooltip 的 id，供觸發元素的 aria-describedby 指向 */
const tooltipId = `${useId()}-tooltip`
const left = ref(0)
const top = ref(0)
let hideTimer: ReturnType<typeof setTimeout> | null = null

/** 主題對應 class */
const themeClass = computed(() => {
  const map: Record<TooltipTheme, string> = {
    dark: 'bg-neutral-800/95 border-neutral-600/50 text-white',
    light: 'bg-white/95 border-neutral-200 text-neutral-800 shadow-lg',
    info: 'bg-info-800/95 border-info-600/50 text-info-50',
    warning: 'bg-warning-800/95 border-warning-600/50 text-warning-50',
    error: 'bg-danger-800/95 border-danger-600/50 text-danger-50',
  }
  return map[props.theme] ?? map.dark
})

/** 箭頭位置 class */
const arrowClass = computed(() => {
  const map: Record<TooltipPlacement, string> = {
    top: '-bottom-1.5 left-1/2 -translate-x-1/2',
    bottom: '-top-1.5 left-1/2 -translate-x-1/2',
    left: '-right-1.5 top-1/2 -translate-y-1/2',
    right: '-left-1.5 top-1/2 -translate-y-1/2',
  }
  return map[props.placement] ?? map.top
})

const maxWidthClass = computed(() => props.maxWidth)

/** 計算 tooltip 位置 */
function computePosition(): void {
  if (!triggerEl.value || !tooltipEl.value) return
  const trigger = triggerEl.value.getBoundingClientRect()
  const tooltip = tooltipEl.value.getBoundingClientRect()
  const gap = 8

  let l = 0
  let t = 0
  switch (props.placement) {
    case 'top':
      l = trigger.left + trigger.width / 2 - tooltip.width / 2
      t = trigger.top - tooltip.height - gap
      break
    case 'bottom':
      l = trigger.left + trigger.width / 2 - tooltip.width / 2
      t = trigger.bottom + gap
      break
    case 'left':
      l = trigger.left - tooltip.width - gap
      t = trigger.top + trigger.height / 2 - tooltip.height / 2
      break
    case 'right':
      l = trigger.right + gap
      t = trigger.top + trigger.height / 2 - tooltip.height / 2
      break
  }

  // 邊界限制
  const padding = 8
  l = Math.max(padding, Math.min(l, window.innerWidth - tooltip.width - padding))
  t = Math.max(padding, Math.min(t, window.innerHeight - tooltip.height - padding))

  left.value = l
  top.value = t
}

function show(): void {
  if (props.disabled) return
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  visible.value = true
  emit('show')
  nextTick(() => computePosition())
}

function hide(): void {
  hideTimer = setTimeout(() => {
    visible.value = false
    emit('hide')
  }, 100)
}

function handleEnter(): void {
  show()
}

function handleLeave(): void {
  hide()
}

function handleFocusIn(): void {
  show()
}

function handleFocusOut(): void {
  hide()
}

/** 視窗調整時重新定位 */
function handleResize(): void {
  if (visible.value) computePosition()
}

onMounted(() => window.addEventListener('resize', handleResize))
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (hideTimer) clearTimeout(hideTimer)
})

watch(() => props.placement, () => {
  if (visible.value) nextTick(() => computePosition())
})
</script>

<style scoped>
.rotate-45 {
  border-left: inherit;
  border-bottom: inherit;
}
</style>
