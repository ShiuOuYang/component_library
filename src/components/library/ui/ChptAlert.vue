<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    leave-active-class="transition-opacity duration-200"
    leave-to-class="opacity-0"
  >
    <div
      v-if="props.show"
      role="alert"
      class="flex items-start gap-3 rounded-lg border p-4"
      :class="[alertClass, props.fullWidth ? 'w-full' : '']"
    >
      <ChptIcon v-if="props.showIcon" :size="20" :class="iconColorClass">
        {{ iconName }}
      </ChptIcon>

      <div class="flex-1 min-w-0">
        <p v-if="props.title" class="font-semibold text-sm mb-0.5">{{ props.title }}</p>
        <slot>
          <p v-if="props.message" class="text-sm">{{ props.message }}</p>
        </slot>
      </div>

      <button
        v-if="props.closable"
        type="button"
        class="flex items-center cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
        :aria-label="'關閉提示'"
        @click="handleClose"
      >
        <ChptIcon :size="18">close</ChptIcon>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChptIcon from './ChptIcon.vue'

/**
 * ChptAlert（CHPT 主題） - 提示條 / 警告元件
 *
 * 特性：
 * - 多種語意色（success / info / warning / danger）
 * - 可選標題、圖示、可關閉
 * - 完整 Props / Emits 型別定義
 */

type AlertType = 'success' | 'info' | 'warning' | 'danger'

interface ChptAlertProps {
  /** 顯示狀態 */
  show?: boolean
  /** 類型 */
  type?: AlertType
  /** 標題 */
  title?: string
  /** 主要訊息 */
  message?: string
  /** 是否顯示圖示 */
  showIcon?: boolean
  /** 是否可關閉 */
  closable?: boolean
  /** 是否全寬 */
  fullWidth?: boolean
}

const props = withDefaults(defineProps<ChptAlertProps>(), {
  show: true,
  type: 'info',
  title: '',
  message: '',
  showIcon: true,
  closable: false,
  fullWidth: false,
})

const emit = defineEmits<{
  (e: 'close', event: MouseEvent): void
}>()

/** 外框樣式 */
const alertClass = computed(() => {
  const map: Record<AlertType, string> = {
    success: 'bg-success-subtle border-success-subtle-border text-success-on-subtle',
    info: 'bg-info-subtle border-info-subtle-border text-info-on-subtle',
    warning: 'bg-warning-subtle border-warning-subtle-border text-warning-on-subtle',
    danger: 'bg-danger-subtle border-danger-subtle-border text-danger-on-subtle',
  }
  return map[props.type]
})

/** 圖示色 */
const iconColorClass = computed(() => {
  const map: Record<AlertType, string> = {
    success: 'text-success-500',
    info: 'text-info-500',
    warning: 'text-warning-500',
    danger: 'text-danger',
  }
  return map[props.type]
})

/** 圖示名稱 */
const iconName = computed(() => {
  const map: Record<AlertType, string> = {
    success: 'check_circle',
    info: 'info',
    warning: 'warning',
    danger: 'error',
  }
  return map[props.type]
})

/** 關閉事件 */
function handleClose(event: MouseEvent): void {
  emit('close', event)
}
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
