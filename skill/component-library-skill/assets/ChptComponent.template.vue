<template>
  <div :class="rootClasses">
    <!-- 標籤 -->
    <label v-if="props.label" class="mb-1 block text-sm text-gray-700">
      {{ props.label }}
    </label>

    <!-- 主體：Tailwind class 全部來自 computed 對照表，不做字串拼接 -->
    <button
      type="button"
      :class="[baseClass, sizeClass, colorClass, { 'opacity-50 cursor-not-allowed': props.disabled }]"
      :disabled="props.disabled"
      @click="handleClick"
    >
      <ChptIcon v-if="props.icon" class="mr-1">{{ props.icon }}</ChptIcon>
      <slot>{{ props.modelValue }}</slot>
    </button>

    <!-- 錯誤訊息 -->
    <p v-if="props.errorText" class="mt-1 text-xs text-red-600">{{ props.errorText }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChptIcon from './ChptIcon.vue'
import type { ComponentSize, ColorVariant } from '@/components/library/shared/types/ui.types'

/**
 * ChptXxx（CHPT 主題） - 一句話說明用途
 *
 * 特性：
 * - 完整 Props 型別定義（interface + withDefaults）
 * - 支援尺寸 / 顏色 / disabled 狀態
 * - 樣式全部使用 Tailwind utility class
 */

interface ChptXxxProps {
  /** 雙向綁定值 */
  modelValue?: string
  /** 標籤文字 */
  label?: string
  /** 圖示名稱（Material Symbols） */
  icon?: string
  /** 尺寸 */
  size?: Extract<ComponentSize, 'sm' | 'md' | 'lg'>
  /** 顏色 */
  color?: Extract<ColorVariant, 'primary' | 'secondary' | 'success' | 'warning' | 'danger'>
  /** 是否禁用 */
  disabled?: boolean
  /** 是否撐滿寬度 */
  fullWidth?: boolean
  /** 錯誤訊息 */
  errorText?: string
  /** 自訂 class */
  class?: string
}

const props = withDefaults(defineProps<ChptXxxProps>(), {
  modelValue: '',
  label: '',
  icon: '',
  size: 'md',
  color: 'primary',
  disabled: false,
  fullWidth: false,
  errorText: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'click', event: MouseEvent): void
}>()

/** 尺寸對應 class */
const sizeClass = computed(() => {
  const map: Record<string, string> = {
    sm: 'px-2 py-0.5 text-xs h-6',
    md: 'px-4 py-2 text-base h-10',
    lg: 'px-6 py-3 text-lg h-12',
  }
  return map[props.size] ?? map.md
})

/** 顏色對應 class（完整類名，避免被 Tailwind purge） */
const colorClass = computed(() => {
  const map: Record<string, string> = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700',
    secondary: 'bg-gray-500 text-white hover:bg-gray-600 active:bg-gray-700',
    success: 'bg-green-500 text-white hover:bg-green-600 active:bg-green-700',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600 active:bg-yellow-700',
    danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
  }
  return map[props.color] ?? map.primary
})

const baseClass = 'inline-flex items-center rounded-md transition-all duration-300 focus:outline-none'

const rootClasses = computed(() => [props.fullWidth ? 'w-full' : 'inline-block', props.class])

/** 點擊行為：禁用時忽略 */
function handleClick(event: MouseEvent): void {
  if (props.disabled) return
  emit('click', event)
  emit('update:modelValue', props.modelValue)
}
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
