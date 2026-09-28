<template>
  <div class="flex flex-col gap-1" :class="props.fullWidth ? 'w-full' : ''">
    <div v-if="props.label || props.showCount" class="flex justify-between items-center">
      <label v-if="props.label" :for="id" class="text-sm text-content-secondary whitespace-nowrap">
        {{ props.label }}
      </label>
      <!-- 沒設 maxlength 時原本顯示「5/」加上 undefined —— 只顯示字數 -->
      <span v-if="props.showCount" class="text-xs text-content-disabled">
        {{ String(props.modelValue || '').length }}<template v-if="props.maxlength">/{{ props.maxlength }}</template>
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
      :aria-invalid="invalid ? 'true' : undefined"
      :aria-describedby="describedBy"
        :aria-required="required || undefined"
      @input="handleInput"
      @blur="emit('blur', $event)"
      @focus="emit('focus', $event)"
      class="border rounded-md shadow-sm focus:outline-none focus:ring-1 transition-colors resize-y"
      :class="[
        sizeClass,
        props.fullWidth ? 'w-full' : '',
        props.autosize ? 'overflow-hidden' : '',
        invalid
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
import { computed, nextTick, ref, watch } from 'vue'
import { resolveSize, useConfig } from '@/components/library/shared/config'
import { useFormField } from '@/components/library/shared/formContext'
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
  // 沒傳時看 ChptConfigProvider，再沒有才是 'sm'（見 shared/config.ts）
  size: undefined,
  rows: 3,
  disabled: false,
  readonly: false,
  fullWidth: false,
  maxlength: undefined,
  showCount: false,
  autosize: false,
  errorText: '',
})

const config = useConfig()
const size = computed(() => resolveSize(props.size, config, 'sm'))

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
/**
 * id 與錯誤狀態：放在 ChptFormItem 裡時用 FormItem 給的 id（它的 <label for> 才指得到），
 * 驗證失敗時自動變紅框並以 aria-describedby 指向 FormItem 的錯誤訊息。
 */
const { id, errorId, invalid, describedBy, required } = useFormField(() => props.errorText)

/** 尺寸對應 class */
const sizeClass = computed(() => {
  const map: Record<ComponentSize, string> = {
    xs: 'text-xs py-0.5 px-2',
    sm: 'text-sm py-1 px-2',
    md: 'text-base py-1.5 px-3',
    lg: 'text-lg py-2 px-4',
    xl: 'text-xl py-2.5 px-5',
  }
  return map[size.value]
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

