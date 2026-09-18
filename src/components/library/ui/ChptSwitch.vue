<template>
  <label
    class="inline-flex items-center gap-2"
    :class="props.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'"
  >
    <span
      class="relative inline-flex items-center rounded-full transition-colors duration-200 flex-shrink-0"

      :class="[trackSizeClass, props.modelValue ? onColorClass : 'bg-neutral-300']"
      @click="toggle"
    >
      <input
        type="checkbox"
        :checked="props.modelValue"
        :disabled="props.disabled"
        class="absolute opacity-0 w-0 h-0"
        :aria-label="props.label"
        @change="toggle"
      />
      <span
        class="inline-block rounded-full bg-surface-primary shadow transform transition-transform duration-200 pointer-events-none"
        :class="[knobSizeClass, props.modelValue ? knobOnTranslateClass : 'translate-x-0.5']"
      ></span>
    </span>

    <span
      v-if="props.label"
      :class="props.disabled ? 'text-content-disabled' : 'text-content-primary'"
    >
      {{ props.label }}
    </span>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ColorVariant } from '@/components/library/shared/types/ui.types'

/**
 * ChptSwitch（CHPT 主題） - 開關切換元件
 *
 * 特性：
 * - v-model（Boolean）支援
 * - 完整 Props / Emits 型別定義
 * - 尺寸與顏色語意
 */

type SwitchSize = 'sm' | 'md' | 'lg'

interface ChptSwitchProps {
  /** v-model 值 */
  modelValue?: boolean
  /** Label */
  label?: string
  /** 尺寸 */
  size?: SwitchSize
  /** 顏色語意 */
  color?: ColorVariant
  /** 是否禁用 */
  disabled?: boolean
}

const props = withDefaults(defineProps<ChptSwitchProps>(), {
  modelValue: false,
  label: '',
  size: 'md',
  color: 'primary',
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', value: boolean): void
}>()

/** 切換狀態 */
function toggle(): void {
  if (props.disabled) return
  const next = !props.modelValue
  emit('update:modelValue', next)
  emit('change', next)
}

/** 軌道尺寸 */
const trackSizeMap: Record<SwitchSize, string> = {
  sm: 'w-8 h-4',
  md: 'w-10 h-5',
  lg: 'w-12 h-6',
}

/** 旋鈕尺寸 */
const knobSizeMap: Record<SwitchSize, string> = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

/** 旋鈕開啟位移 */
const knobOnTranslateMap: Record<SwitchSize, string> = {
  sm: 'translate-x-4',
  md: 'translate-x-5',
  lg: 'translate-x-6',
}

const trackSizeClass = computed(() => trackSizeMap[props.size] ?? trackSizeMap.md)
const knobSizeClass = computed(() => knobSizeMap[props.size] ?? knobSizeMap.md)
const knobOnTranslateClass = computed(
  () => knobOnTranslateMap[props.size] ?? knobOnTranslateMap.md
)

/** 開啟時軌道顏色 */
const onColorMap: Record<ColorVariant, string> = {
  primary: 'bg-accent-solid',
  secondary: 'bg-secondary-500',
  success: 'bg-success-solid',
  danger: 'bg-danger-solid',
  warning: 'bg-warning-solid',
  info: 'bg-info-solid',
  dark: 'bg-neutral-800',
  light: 'bg-surface-tertiary',
}

const onColorClass = computed(() => onColorMap[props.color] ?? onColorMap.primary)
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
