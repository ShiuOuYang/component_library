<template>
  <div class="flex flex-col gap-1" :class="props.fullWidth ? 'w-full' : ''">
    <div v-if="props.label || props.showCount" class="flex justify-between items-center">
      <label v-if="props.label" :for="id" class="text-sm text-content-secondary whitespace-nowrap">
        {{ props.label }}
      </label>
      <span v-if="props.showCount" class="text-xs text-content-disabled">
        {{ String(props.modelValue || '').length }}/{{ props.maxlength }}
      </span>
    </div>

    <textarea
      :id="id"
      ref="textareaRef"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :readonly="props.readonly"
      :maxlength="props.maxlength"
      :rows="props.rows"
      :aria-invalid="props.errorText ? 'true' : undefined"
      :aria-describedby="props.errorText ? errorId : undefined"
      @input="handleInput"
      @blur="emit('blur', $event)"
      @focus="emit('focus', $event)"
      class="border rounded-md shadow-sm focus:outline-none focus:ring-1 transition-colors resize-y"
      :class="[
        sizeClass,
        props.fullWidth ? 'w-full' : '',
        props.autosize ? 'overflow-hidden' : '',
        props.errorText
          ? 'border-danger focus:border-danger focus:ring-danger'
          : 'border-stroke-default focus:border-stroke-focus focus:ring-stroke-focus',
        props.disabled ? 'bg-surface-tertiary cursor-not-allowed text-content-disabled' : 'bg-surface-primary',
      ]"
    />

    <p v-if="props.errorText" :id="errorId" role="alert" class="text-xs text-danger">
      {{ props.errorText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import type { ComponentSize } from '@/components/library/shared/types/ui.types'
/**
 * ChptTextarea（CHPT 主題） - 通用文字區域元件
 *
 * 特性：
 * - v-model 支援（modelValue）
 * - 完整 Props / Emits 型別定義
 * - 字數統計、自動高度、錯誤訊息
 * - 一致性寫法（interface + withDefaults + typed emits）
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
  /** 行數 */
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
  /** 自動高度 */
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

/** 自動調整高度 */
async function autoResize(): Promise<void> {
  if (!props.autosize || !textareaRef.value) return
  textareaRef.value.style.height = 'auto'
  textareaRef.value.style.height = `${textareaRef.value.scrollHeight}px`
}

/** 輸入事件 */
function handleInput(event: Event): void {
  const value = (event.target as HTMLTextAreaElement).value
  emit('update:modelValue', value)
  autoResize()
}

/** 監聽 modelValue 變化以觸發 autoResize */
watch(
  () => props.modelValue,
  () => {
    autoResize()
  }
)

/** 初次掛載時若 autosize，調整高度 */
watch(
  () => props.autosize,
  (val) => {
    if (val) {
      nextTick(() => autoResize())
    }
  },
  { immediate: true }
)
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>

