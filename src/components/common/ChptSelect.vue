<template>
  <div class="flex flex-col gap-1" :class="props.fullWidth ? 'w-full' : ''">
    <label v-if="props.label" :for="id" class="text-sm text-gray-600 whitespace-nowrap">
      {{ props.label }}
    </label>

    <select
      :id="id"
      :value="props.modelValue"
      :disabled="props.disabled"
      @change="handleChange"
      class="border rounded-md shadow-sm focus:outline-none focus:ring-1 transition-colors"
      :class="[
        sizeClass,
        props.fullWidth ? 'w-full' : '',
        props.errorText
          ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
        props.disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-white',
      ]"
    >
      <option v-if="props.placeholder" value="" disabled>
        {{ props.placeholder }}
      </option>
      <option
        v-for="option in props.options"
        :key="getOptionValue(option)"
        :value="getOptionValue(option)"
        :disabled="getOptionDisabled(option)"
      >
        {{ getOptionLabel(option) }}
      </option>
    </select>

    <p v-if="props.errorText" class="text-xs text-red-500">{{ props.errorText }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentSize, SelectOption } from './types/ui.types'

/**
 * ChptSelect（CHPT 主題） - 通用下拉選單元件
 *
 * 特性：
 * - v-model 支援
 * - 支援純字串陣列或物件陣列（value/label/disabled）
 * - 完整 Props 型別定義
 * - 一致性寫法
 */

interface ChptSelectProps {
  /** v-model 值 */
  modelValue?: string | number
  /** 選項：字串陣列或 SelectOption 物件陣列 */
  options?: Array<SelectOption | string | number>
  /** Label */
  label?: string
  /** 佔位符 */
  placeholder?: string
  /** 尺寸 */
  size?: ComponentSize
  /** 是否禁用 */
  disabled?: boolean
  /** 是否全寬 */
  fullWidth?: boolean
  /** 物件選項的 value key */
  valueKey?: string
  /** 物件選項的 label key */
  labelKey?: string
  /** 物件選項的 disabled key */
  disabledKey?: string
  /** 是否將值轉為數字 */
  numberValue?: boolean
  /** 錯誤訊息 */
  errorText?: string
}

const props = withDefaults(defineProps<ChptSelectProps>(), {
  modelValue: '',
  options: () => [],
  label: '',
  placeholder: '',
  size: 'sm',
  disabled: false,
  fullWidth: false,
  valueKey: '',
  labelKey: '',
  disabledKey: 'disabled',
  numberValue: false,
  errorText: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
}>()

/** 唯一 id */
const id = computed(() => `chpt-select-${Math.random().toString(36).slice(2, 11)}`)

/** 尺寸對應 class */
const sizeClass = computed(() => {
  const map: Record<ComponentSize, string> = {
    xs: 'text-xs py-0.5 px-2',
    sm: 'text-sm py-1 px-2',
    md: 'text-base py-1.5 px-3',
    lg: 'text-lg py-2 px-4',
    xl: 'text-xl py-2.5 px-5',
  }
  return map[props.size]
})

const isObject = (option: SelectOption | string | number): option is SelectOption =>
  typeof option === 'object' && option !== null

/** 取得選項的值 */
function getOptionValue(option: SelectOption | string | number): string | number {
  if (isObject(option)) {
    return props.valueKey ? (option as Record<string, never>)[props.valueKey] : option.value
  }
  return option
}

/** 取得選項的顯示文字 */
function getOptionLabel(option: SelectOption | string | number): string {
  if (isObject(option)) {
    return props.labelKey ? (option as Record<string, string>)[props.labelKey] : option.label
  }
  return String(option)
}

/** 取得選項是否禁用 */
function getOptionDisabled(option: SelectOption | string | number): boolean {
  if (isObject(option)) {
    return Boolean((option as Record<string, unknown>)[props.disabledKey])
  }
  return false
}

/** 變更事件 */
function handleChange(event: Event): void {
  let value: string | number = (event.target as HTMLSelectElement).value
  if (props.numberValue && value !== '') {
    value = Number(value)
  }
  emit('update:modelValue', value)
}
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
