<template>
  <div class="flex flex-col gap-1" :class="props.fullWidth ? 'w-full' : ''">
    <label v-if="props.label" class="text-sm text-gray-600 whitespace-nowrap">
      {{ props.label }}
    </label>

    <VueDatePicker
      :model-value="props.modelValue"
      :range="props.range"
      :enable-time-picker="props.enableTimePicker"
      :format="props.format"
      :min-date="props.minDate"
      :max-date="props.maxDate"
      :disabled="props.disabled"
      :clearable="props.clearable"
      :auto-apply="props.autoApply"
      :placeholder="props.placeholder"
      class="chpt-date-picker"
      :class="sizeClass"
      @update:model-value="handleUpdate"
    />

    <p v-if="props.errorText" class="text-xs text-red-500">{{ props.errorText }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import type { ComponentSize } from './types/ui.types'

/**
 * ChptDatePicker（CHPT 主題） - 日期選擇元件
 *
 * 基於 @vuepic/vue-datepicker 封裝，
 * 支援單日、日期區間、時間選擇。
 *
 * 特性：
 * - v-model 支援
 * - 完整 Props 型別定義
 * - 尺寸樣式統一
 */

export type ChptDatePickerValue = string | Date | [Date | string, Date | string] | null

interface ChptDatePickerProps {
  /** v-model 值 */
  modelValue?: ChptDatePickerValue
  /** Label */
  label?: string
  /** 佔位符 */
  placeholder?: string
  /** 是否為日期區間 */
  range?: boolean
  /** 是否啟用時間選擇 */
  enableTimePicker?: boolean
  /** 顯示格式 */
  format?: string
  /** 最小日期 */
  minDate?: string | Date
  /** 最大日期 */
  maxDate?: string | Date
  /** 尺寸 */
  size?: ComponentSize
  /** 是否禁用 */
  disabled?: boolean
  /** 可否清除 */
  clearable?: boolean
  /** 是否自動套用 */
  autoApply?: boolean
  /** 是否全寬 */
  fullWidth?: boolean
  /** 錯誤訊息 */
  errorText?: string
}

const props = withDefaults(defineProps<ChptDatePickerProps>(), {
  modelValue: null,
  label: '',
  placeholder: '選擇日期',
  range: false,
  enableTimePicker: false,
  format: 'yyyy-MM-dd',
  minDate: undefined,
  maxDate: undefined,
  size: 'sm',
  disabled: false,
  clearable: true,
  autoApply: false,
  fullWidth: false,
  errorText: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: ChptDatePickerValue): void
  (e: 'clear'): void
}>()

/** 尺寸 class */
const sizeClass = computed(() => `chpt-date-picker--${props.size}`)

/** 值變更事件 */
function handleUpdate(value: ChptDatePickerValue): void {
  emit('update:modelValue', value)
  if (!value) emit('clear')
}
</script>

<style scoped>
.chpt-date-picker :deep(.dp__input) {
  border-radius: 0.375rem;
  border-color: rgb(209 213 219);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.chpt-date-picker :deep(.dp__input:focus) {
  outline: none;
  box-shadow: 0 0 0 1px #3b82f6;
  border-color: #3b82f6;
}

.chpt-date-picker :deep(.dp__input:disabled) {
  background-color: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}

.chpt-date-picker--xs :deep(.dp__input) {
  height: 22px;
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
}

.chpt-date-picker--sm :deep(.dp__input) {
  height: 28px;
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
}

.chpt-date-picker--md :deep(.dp__input) {
  height: 36px;
  font-size: 1rem;
  padding: 0.375rem 0.75rem;
}

.chpt-date-picker--lg :deep(.dp__input) {
  height: 44px;
  font-size: 1.125rem;
  padding: 0.5rem 1rem;
}

.chpt-date-picker--xl :deep(.dp__input) {
  height: 52px;
  font-size: 1.25rem;
  padding: 0.5rem 1rem;
}

.chpt-date-picker :deep(.dp__theme_light) {
  --dp-primary-color: #3b82f6;
  --dp-primary-text-color: #ffffff;
  --dp-secondary-color: #f3f4f6;
  --dp-text-color: #374151;
  --dp-hover-color: #f9fafb;
  --dp-hover-text-color: #374151;
  --dp-border-color: #d1d5db;
}
</style>
