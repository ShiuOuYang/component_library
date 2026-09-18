<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50"
      >
        <!-- 遮罩 -->
        <div
          class="absolute inset-0"
          aria-hidden="true"
          :style="{ backgroundColor: `rgba(0,0,0,${props.backdropOpacity})` }"
          @click="handleBackdrop"
        />

        <!-- 抽屜 -->
        <Transition
          appear
          :enter-active-class="`transition-all duration-300 ${enterClass}`"
          :leave-active-class="`transition-all duration-200 ${leaveClass}`"
        >
          <div
            ref="panel"
            role="dialog"
            aria-modal="true"
            :aria-label="props.title ? undefined : props.ariaLabel"
            :aria-labelledby="props.title ? titleId : undefined"
            tabindex="-1"
            class="absolute bg-surface-primary shadow-2xl flex flex-col focus:outline-none"
            :class="[panelClasses]"
            :style="panelStyle"
          >
            <div
              v-if="props.title"
              class="flex items-center justify-between px-5 py-4 border-b border-stroke-light"
            >
              <h3 :id="titleId" class="font-semibold text-content-primary">{{ props.title }}</h3>
              <button
                v-if="props.closable"
                type="button"
                class="flex items-center cursor-pointer text-content-disabled hover:text-content-secondary transition-colors"
                :aria-label="'關閉'"
                @click="handleClose"
              >
                <ChptIcon :size="20">close</ChptIcon>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto px-5 py-4">
              <slot />
            </div>

            <div v-if="$slots.footer" class="px-5 py-3 border-t border-stroke-light bg-surface-secondary">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, useId, useTemplateRef } from 'vue'
import ChptIcon from './ChptIcon.vue'
import { useOverlay } from '@/components/library/shared/useOverlay'

/**
 * ChptDrawer（CHPT 主題） - 抽屜 / 側滑面板
 *
 * 特性：
 * - v-model 控制開關
 * - 四個方向滑出、可設定尺寸
 * - Teleport 掛載到 body
 * - 完整 Props / Emits 型別定義
 * - 無障礙：role="dialog"、焦點陷阱與歸還、背景捲動鎖、Escape 關閉
 *   （原本這三件事一件都沒有，鍵盤使用者打開後 Tab 會直接跑到背後的頁面）
 */

type DrawerPlacement = 'left' | 'right' | 'top' | 'bottom'

interface ChptDrawerProps {
  /** v-model 值 */
  modelValue?: boolean
  /** 標題 */
  title?: string
  /** 滑出方向 */
  placement?: DrawerPlacement
  /** 尺寸（水平放寬度，垂直放高度，px/百分比） */
  size?: number | string
  /** 是否顯示關閉按鈕 */
  closable?: boolean
  /** 點擊遮罩是否關閉 */
  maskClosable?: boolean
  /** 遮罩透明度 */
  backdropOpacity?: number
  /** 無標題時的無障礙名稱（role="dialog" 一定要有可及名稱） */
  ariaLabel?: string
  /** 按 Escape 是否關閉 */
  closeOnEscape?: boolean
}

const props = withDefaults(defineProps<ChptDrawerProps>(), {
  modelValue: false,
  title: '',
  placement: 'right',
  size: 360,
  closable: true,
  maskClosable: true,
  backdropOpacity: 0.4,
  ariaLabel: '側邊面板',
  closeOnEscape: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
}>()

/** 面板定位 class */
const panelClasses = computed(() => {
  const map: Record<DrawerPlacement, string> = {
    left: 'left-0 top-0 bottom-0 border-r border-stroke-light',
    right: 'right-0 top-0 bottom-0 border-l border-stroke-light',
    top: 'top-0 left-0 right-0 border-b border-stroke-light',
    bottom: 'bottom-0 left-0 right-0 border-t border-stroke-light',
  }
  return map[props.placement]
})

/** 面板尺寸 */
const panelStyle = computed(() => {
  const size =
    typeof props.size === 'number' ? `${props.size}px` : props.size
  if (props.placement === 'left' || props.placement === 'right') {
    return { width: size }
  }
  return { height: size }
})

/** Transition 進場 class */
const enterClass = computed(() => {
  const map: Record<DrawerPlacement, string> = {
    left: '-translate-x-full',
    right: 'translate-x-full',
    top: '-translate-y-full',
    bottom: 'translate-y-full',
  }
  return map[props.placement]
})

/** Transition 出場 class */
const leaveClass = enterClass

function handleClose(): void {
  emit('update:modelValue', false)
  emit('close')
}

function handleBackdrop(): void {
  if (props.maskClosable) handleClose()
}

// ===== 無障礙 =====
/** 標題元素的 id，供 aria-labelledby 指向 */
const titleId = `${useId()}-title`
const panelRef = useTemplateRef<HTMLElement>('panel')

// 放在 handleClose 之後：useOverlay 的 watch 是 immediate 的，提前呼叫會撞上 TDZ
useOverlay(() => props.modelValue, panelRef, {
  onEscape: () => handleClose(),
  closeOnEscape: () => props.closable && props.closeOnEscape,
})
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
