<template>
  <div class="flex flex-col gap-1" :class="props.fullWidth ? 'w-full' : ''">
    <label v-if="props.label" :for="id" class="text-sm text-gray-600 whitespace-nowrap">
      {{ props.label }}
    </label>

    <textarea
      :id="id"
      ref="textareaRef"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :readonly="props.readonly"
      :maxlength="props.maxlength"
      :rows="props.rows"
      :autosize="props.autosize"
      @input="handleInput"
      @blur="emit('blur', $event)"
      @focus="emit('focus', $event)"
      class="border rounded-md shadow-sm focus:outline-none focus:ring-1 transition-colors resize-y w-full"
      :class="[
        sizeClass,
        props.errorText
          ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
        props.disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-white',
      ]"
    />

    <div v-if="props.maxlength && props.showCount" class="flex justify-end">
      <span class="text-xs text-gray-400">
        {{ String(props.modelValue).length }} / {{ typeof props.maxlength === 'number' ? props.maxlength : Number(props.maxlength) }}
      </span>
    </div>

    <p v-if="props.errorText" class="text-xs text-red-500">{{ props.errorText }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ComponentSize } from './types/ui.types'

/**
 * ChptTextarea（CHPT 主題） - 多行文字輸入框
 *
 * 特性：
 * - v-model 支援（modelValue）
 * - 完整 Props / Emits 型別定義
 * - 可調整高度、字數統計、錯誤訊息
 * - 與 ChptInput 一致的表單風格
 */

interface ChptTextareaProps {
  /** v-model 值 */
  modelValue?: string
  /** Label */
  label?: string
  /** 佔位符 */
  placeholder?: string
  /** 尺寸 */
  size?: ComponentSize
  /** 顯示行數 */
  rows?: number
  /** 是否禁用 */
  disabled?: boolean
  /** 是否唯讀 */
  readonly?: boolean
  /** 是否全寬 */
  fullWidth?: boolean
  /** 最大長度 */
  maxlength?: number | string
  /** 顯示字數統計 */
  showCount?: boolean
  /** 是否自適應高度 */
  autosize?: boolean
  /** 錯誤訊息 */
  errorText?: string
}

const props = withDefaults(defineProps<ChptTextareaProps>(), {
  modelValue: '',
  label: '',
  placeholder: '',
  size: 'sm',
  rows: 3,
  disabled: false,
  readonly: false,
  fullWidth: false,
  maxlength: undefined,
  showCount: false,
  autosize: false,
  errorText: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'blur', event: FocusEvent): void
  (e: 'focus', event: FocusEvent): void
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)

/** 唯一 id */
const id = computed(() => `chpt-textarea-${Math.random().toString(36).slice(2, 11)}`)

/** 尺寸對應 class */
const sizeClass = computed(() => {
  const map: Record<ComponentSize, string> = {
    xs: 'text-xs py-1 px-2',
    sm: 'text-sm py-1.5 px-2.5',
    md: 'text-base py-2 px-3',
    lg: 'text-lg py-2.5 px-4',
    xl: 'text-xl py-3 px-5',
  }
  return map[props.size]
})

/** 輸入事件 */
function handleInput(event: Event): void {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
  if (props.autosize) autoResize()
}

/** 自動調整高度 */
function autoResize(): void {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
