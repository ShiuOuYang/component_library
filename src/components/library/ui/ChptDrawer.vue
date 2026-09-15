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
            class="absolute bg-white shadow-2xl flex flex-col"
            :class="[panelClasses]"
            :style="panelStyle"
          >
            <div
              v-if="props.title"
              class="flex items-center justify-between px-5 py-4 border-b border-neutral-100"
            >
              <h3 class="font-semibold text-neutral-800">{{ props.title }}</h3>
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

            <div class="flex-1 overflow-y-auto px-5 py-4">
              <slot />
            </div>

            <div v-if="$slots.footer" class="px-5 py-3 border-t border-neutral-100 bg-neutral-50">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChptIcon from './ChptIcon.vue'

/**
 * ChptDrawer（CHPT 主題） - 抽屜 / 側滑面板
 *
 * 特性：
 * - v-model 控制開關
 * - 四個方向滑出、可設定尺寸
 * - Teleport 掛載到 body
 * - 完整 Props / Emits 型別定義
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
}

const props = withDefaults(defineProps<ChptDrawerProps>(), {
  modelValue: false,
  title: '',
  placement: 'right',
  size: 360,
  closable: true,
  maskClosable: true,
  backdropOpacity: 0.4,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
}>()

/** 面板定位 class */
const panelClasses = computed(() => {
  const map: Record<DrawerPlacement, string> = {
    left: 'left-0 top-0 bottom-0 border-r border-neutral-200',
    right: 'right-0 top-0 bottom-0 border-l border-neutral-200',
    top: 'top-0 left-0 right-0 border-b border-neutral-200',
    bottom: 'bottom-0 left-0 right-0 border-t border-neutral-200',
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
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
