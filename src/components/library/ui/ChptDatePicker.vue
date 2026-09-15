<template>
  <div class="flex flex-col gap-1" :class="props.fullWidth ? 'w-full' : ''">
    <label v-if="props.label" class="text-sm text-neutral-600 whitespace-nowrap">
      {{ props.label }}
    </label>

    <VueDatePicker
      :model-value="innerModelValue"
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

    <p v-if="props.errorText" class="text-xs text-danger-500">{{ props.errorText }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import type { ModelValue } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import type { ComponentSize } from '@/components/library/shared/types/ui.types'

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
  modelValue?: ChptDatePickerValue | null
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

/**
 * VueDatePicker 的 ModelValue 不含 null，也不接受 [Date | string, Date | string]
 * 這種混合元素的 tuple（它要的是 Date[] 或 string[] 同質陣列）。
 * 這裡把 null 收斂成 undefined，區間值交由 VueDatePicker 自行解析。
 */
const innerModelValue = computed<ModelValue | undefined>(() =>
  props.modelValue === null || props.modelValue === undefined
    ? undefined
    : (props.modelValue as ModelValue)
)

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
  border-color: rgb(212 212 212);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.chpt-date-picker :deep(.dp__input:focus) {
  outline: none;
  box-shadow: 0 0 0 1px #2563eb;
  border-color: #2563eb;
}

.chpt-date-picker :deep(.dp__input:disabled) {
  background-color: #f5f5f5;
  color: #a3a3a3;
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
  --dp-primary-color: #2563eb;
  --dp-primary-text-color: #ffffff;
  --dp-secondary-color: #f5f5f5;
  --dp-text-color: #404040;
  --dp-hover-color: #fafafa;
  --dp-hover-text-color: #404040;
  --dp-border-color: #d4d4d4;
}
</style>
