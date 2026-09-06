<template>
  <div class="flex flex-col gap-1" :class="props.fullWidth ? 'w-full' : ''">
    <label v-if="props.label" :for="id" class="text-sm text-neutral-600 whitespace-nowrap">
      {{ props.label }}
    </label>

    <div class="relative flex items-center" :class="props.fullWidth ? 'w-full' : ''">
      <ChptIcon
        v-if="props.prefixIcon"
        :size="16"

        color="neutral-400"
        class="absolute left-2 pointer-events-none"
      >
        {{ props.prefixIcon }}
      </ChptIcon>

      <input
        :id="id"
        ref="inputRef"
        :type="props.type"
        :value="props.modelValue"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :maxlength="props.maxlength"
        @input="handleInput"
        @blur="emit('blur', $event)"
        @focus="emit('focus', $event)"
        class="border rounded-md shadow-sm focus:outline-none focus:ring-1 transition-colors"
        :class="[
          sizeClass,
          props.fullWidth ? 'w-full' : '',
          props.prefixIcon ? 'pl-8' : '',
          props.clearable && props.modelValue ? 'pr-8' : '',
          props.errorText
            ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-500'
            : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500',
          props.disabled ? 'bg-neutral-100 cursor-not-allowed text-neutral-400' : 'bg-white',
        ]"
      />

      <button
        v-if="props.clearable && props.modelValue && !props.disabled"
        type="button"
        class="absolute right-2 text-neutral-400 hover:text-neutral-600"
        @click="handleClear"
      >
        <ChptIcon :size="16">close</ChptIcon>
      </button>
    </div>

    <p v-if="props.errorText" class="text-xs text-danger-500">{{ props.errorText }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ChptIcon from './ChptIcon.vue'
import type { ComponentSize, InputNativeType } from '@/components/library/shared/types/ui.types'

/**
 * ChptInput（CHPT 主題） - 通用輸入框元件
 *
 * 特性：
 * - v-model 支援（modelValue）
 * - 完整 Props / Emits 型別定義
 * - 前綴圖示、可清除、錯誤訊息
 * - 一致性寫法（interface + withDefaults + typed emits）
 */

interface ChptInputProps {
  /** v-model 值 */
  modelValue?: string | number
  /** 原生 input type */
  type?: InputNativeType
  /** Label */
  label?: string
  /** 佔位符 */
  placeholder?: string
  /** 尺寸 */
  size?: ComponentSize
  /** 是否禁用 */
  disabled?: boolean
  /** 是否唯讀 */
  readonly?: boolean
  /** 可否清除 */
  clearable?: boolean
  /** 是否全寬 */
  fullWidth?: boolean
  /** 前方圖示（Material Symbols） */
  prefixIcon?: string
  /** 最大長度 */
  maxlength?: number | string
  /** 錯誤訊息 */
  errorText?: string
}

const props = withDefaults(defineProps<ChptInputProps>(), {
  modelValue: '',
  type: 'text',
  label: '',
  placeholder: '',
  size: 'sm',
  disabled: false,
  readonly: false,
  clearable: false,
  fullWidth: false,
  prefixIcon: '',
  maxlength: undefined,
  errorText: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'clear'): void
  (e: 'blur', event: FocusEvent): void
  (e: 'focus', event: FocusEvent): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)

/** 唯一 id */
const id = computed(() => `chpt-input-${Math.random().toString(36).slice(2, 11)}`)

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

/** 輸入事件 */
function handleInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
}

/** 清除事件 */
function handleClear(): void {
  emit('update:modelValue', '')
  emit('clear')
  inputRef.value?.focus()
}
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>

