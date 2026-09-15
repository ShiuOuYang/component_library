<template>
  <div class="flex flex-col gap-1" :class="props.fullWidth ? 'w-full' : ''">
    <label v-if="props.label" :for="id" class="text-sm text-neutral-600 whitespace-nowrap">
      {{ props.label }}
    </label>

    <select
      :id="id"
      :value="props.modelValue"
      :disabled="props.disabled"
      :aria-invalid="props.errorText ? 'true' : undefined"
      :aria-describedby="props.errorText ? errorId : undefined"
      @change="handleChange"
      class="border rounded-md shadow-sm focus:outline-none focus:ring-1 transition-colors"
      :class="[
        sizeClass,
        props.fullWidth ? 'w-full' : '',
        props.errorText
          ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-500'
          : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500',
        props.disabled ? 'bg-neutral-100 cursor-not-allowed text-neutral-400' : 'bg-white',
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

    <p v-if="props.errorText" :id="errorId" role="alert" class="text-xs text-danger-500">
      {{ props.errorText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import type { ComponentSize, Recordable, SelectOption } from '@/components/library/shared/types/ui.types'

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
/**
 * 元件內部使用的 id。
 * 原本是 computed(() => `…${Math.random()}`)：computed 沒有反應式相依所以值其實穩定，
 * 但 SSR 時伺服器與用戶端會算出不同的值，造成 hydration 不一致。
 * useId()（Vue 3.5+）就是為此設計的。
 */
const id = useId()
/** 錯誤訊息的 id，供 aria-describedby 指向 */
const errorId = `${id}-error`

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

/**
 * 用 valueKey / labelKey / disabledKey 取值時，選項其實可以是任意形狀的物件
 * （SelectOption 只是最常見的那一種），而 SelectOption 沒有索引簽章，
 * 直接 `as Record<...>` 會被 TS 擋下。統一從這裡經 unknown 轉一次。
 */
const asRecord = (option: SelectOption): Recordable => option as unknown as Recordable

/** 取得選項的值 */
function getOptionValue(option: SelectOption | string | number): string | number {
  if (isObject(option)) {
    return props.valueKey
      ? (asRecord(option)[props.valueKey] as string | number)
      : option.value
  }
  return option
}

/** 取得選項的顯示文字 */
function getOptionLabel(option: SelectOption | string | number): string {
  if (isObject(option)) {
    return props.labelKey ? String(asRecord(option)[props.labelKey]) : option.label
  }
  return String(option)
}

/** 取得選項是否禁用 */
function getOptionDisabled(option: SelectOption | string | number): boolean {
  if (isObject(option)) {
    return Boolean(asRecord(option)[props.disabledKey])
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
