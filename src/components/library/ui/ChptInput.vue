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
        :aria-invalid="props.errorText ? 'true' : undefined"
        :aria-describedby="props.errorText ? errorId : undefined"
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

    <p v-if="props.errorText" :id="errorId" role="alert" class="text-xs text-danger-500">
      {{ props.errorText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
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
/**
 * 尺寸對應的幾何，高度取自 design tokens 的 control
 * （xs 24 / sm 32 / md 40 / lg 48 / xl 56px），與按鈕同一套。
 *
 * ⚠️ 原本靠 py-* 撐高度，算出來是 22 / 30 / 38 / 46px —— 比同尺寸的按鈕
 *    各矮 2px。工具列上輸入框與按鈕並排時，就是這 2px 讓整列看起來沒對齊。
 *    改用 h-control-* 後兩者完全一致（Tailwind 的 border-box 已把邊框算進去）。
 */
const sizeClass = computed(() => {
  const map: Record<ComponentSize, string> = {
    xs: 'text-xs h-control-xs px-2',
    sm: 'text-sm h-control-sm px-3',
    md: 'text-base h-control-md px-4',
    lg: 'text-lg h-control-lg px-6',
    xl: 'text-xl h-control-xl px-5',
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

