<template>
  <span class="relative inline-block">
    <!-- 觸發內容 -->
    <span @click="toggle">
      <slot />
    </span>

    <!-- 彈出層 -->
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        class="absolute z-30 mt-2 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 w-60"
      >
        <p class="text-sm text-gray-700 mb-3">
          <slot name="message">{{ props.message }}</slot>
        </p>
        <div class="flex justify-end gap-2">
          <ChptButton
            size="sm"
            is-outline
            @click="handleCancel"
          >
            {{ props.cancelText }}
          </ChptButton>
          <ChptButton
            size="sm"
            :color="props.color"
            @click="handleConfirm"
          >
            {{ props.confirmText }}
          </ChptButton>
        </div>
      </div>
    </Transition>
  </span>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ChptButton from './ChptButton.vue'

/**
 * ChptPopconfirm（CHPT 主題） - 彈出式確認元件
 *
 * 特性：
 * - 點擊觸發顯示確認彈窗
 * - 確認 / 取消按鈕
 * - 完整 Props / Emits 型別定義
 */

interface ChptPopconfirmProps {
  /** 確認訊息 */
  message?: string
  /** 確認按鈕文字 */
  confirmText?: string
  /** 取消按鈕文字 */
  cancelText?: string
  /** 確認按鈕顏色（ChptButton color） */
  color?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning'
}

const props = withDefaults(defineProps<ChptPopconfirmProps>(), {
  message: '確定要執行此操作嗎？',
  confirmText: '確定',
  cancelText: '取消',
  color: 'danger',
})

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const visible = ref(false)

function toggle(): void {
  visible.value = !visible.value
}

function handleConfirm(): void {
  visible.value = false
  emit('confirm')
}

function handleCancel(): void {
  visible.value = false
  emit('cancel')
}
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
