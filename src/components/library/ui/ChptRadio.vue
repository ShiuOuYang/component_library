<template>
  <div class="flex gap-4" :class="directionClass">
    <label
      v-for="item in props.items"
      :key="String(item.value)"
      class="flex items-center gap-2 cursor-pointer"
      :class="getLabelClasses(item)"
    >
      <div
        class="relative flex items-center justify-center rounded-full border-2"
        :class="[
          sizeClass,
          isChecked(item) ? borderColorClass : 'border-neutral-300',
          item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ]"
      >
        <input
          type="radio"
          :name="name"
          :value="item.value"
          v-model="innerModelValue"
          :disabled="item.disabled"
          class="absolute opacity-0 w-0 h-0"
          :aria-label="item.label"
        />
        <span
          v-if="isChecked(item)"
          class="rounded-full pointer-events-none"
          :class="[dotColorClass, dotSizeClass]"
        ></span>
      </div>

      <span
        v-if="props.isLabelShow"
        :class="['select-none', props.labelSize, item.disabled ? 'text-neutral-400' : props.labelColor]"
      >
        {{ item.label }}
      </span>
    </label>
  </div>

  <div v-if="props.errors?.length" class="flex items-center ml-2 mt-1">


    <ChptIcon class="mr-1" :size="20" weight="300" grade="-25" color="danger-400">info</ChptIcon>
    <p class="text-danger-400 text-sm">{{ props.errors[0] }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ChptIcon from './ChptIcon.vue'
import type { ColorVariant, Direction } from '@/components/library/shared/types/ui.types'

/**
 * ChptRadio（CHPT 主題） - 單選群組元件
 *
 * 特性：
 * - v-model 支援
 * - 物件選項（label / value / disabled）
 * - 完整 Props / Emits 型別
 * - 同時支援 String | Number | Boolean 值
 */

interface ChptRadioItem {
  label: string
  value: string | number | boolean
  disabled?: boolean
}

interface ChptRadioProps {
  /** v-model 值 */
  modelValue?: string | number | boolean
  /** 選項清單 */
  items?: ChptRadioItem[]
  /** radio group name */
  name?: string
  /** 尺寸（3~6 代表 px） */
  size?: '3' | '4' | '5' | '6'
  /** 顏色語意 */
  color?: ColorVariant
  /** 錯誤陣列 */
  errors?: string[]
  /** 是否顯示 label */
  isLabelShow?: boolean
  /** label 尺寸 class */
  labelSize?: string
  /** label 顏色 class */
  labelColor?: string
  /** 方向 */
  direction?: Direction
}

const props = withDefaults(defineProps<ChptRadioProps>(), {
  // 未選取時以 undefined 表示（modelValue 的型別不含 null）
  modelValue: undefined,
  items: () => [],
  name: () => `chpt-radio-${Math.random().toString(36).slice(2, 9)}`,
  size: '4',
  color: 'primary',
  errors: () => [],
  isLabelShow: true,
  labelSize: 'text-sm',
  labelColor: 'text-neutral-700',
  direction: 'row',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | boolean | null): void
}>()

/** v-model 雙向綁定 */
const innerModelValue = computed({
  get: () => props.modelValue,
  set: (value: string | number | boolean | null) => emit('update:modelValue', value),
})

const isChecked = (item: ChptRadioItem): boolean => innerModelValue.value === item.value

/** 外圈尺寸 class */
const sizeClass = computed(() => {
  const map: Record<string, string> = {
    '3': 'w-3 h-3',
    '4': 'w-4 h-4',
    '5': 'w-5 h-5',
    '6': 'w-6 h-6',
  }
  return map[props.size] ?? 'w-4 h-4'
})

/** 內圈圓點尺寸 class */
const dotSizeClass = computed(() => {
  const map: Record<string, string> = {
    '3': 'w-1 h-1',
    '4': 'w-1.5 h-1.5',
    '5': 'w-2 h-2',
    '6': 'w-2.5 h-2.5',
  }
  return map[props.size] ?? 'w-1.5 h-1.5'
})

/** 顏色對應 class */
const colorMap: Record<ColorVariant, { border: string; dot: string }> = {
















  primary: { border: 'border-primary-500', dot: 'bg-primary-500' },
  secondary: { border: 'border-secondary-500', dot: 'bg-secondary-500' },
  success: { border: 'border-success-500', dot: 'bg-success-500' },
  danger: { border: 'border-danger-500', dot: 'bg-danger-500' },
  warning: { border: 'border-warning-500', dot: 'bg-warning-500' },
  info: { border: 'border-info-500', dot: 'bg-info-500' },
  dark: { border: 'border-neutral-800', dot: 'bg-neutral-800' },
  light: { border: 'border-neutral-300', dot: 'bg-neutral-300' },
}

const borderColorClass = computed(() => colorMap[props.color]?.border ?? colorMap.primary.border)
const dotColorClass = computed(() => colorMap[props.color]?.dot ?? colorMap.primary.dot)

/** label 樣式 */
function getLabelClasses(item: ChptRadioItem): Record<string, boolean> {
  const disabled = Boolean(item.disabled)
  return {
    'hover:opacity-80': !disabled,
    'opacity-50 cursor-not-allowed': disabled,
  }
}

/** 方向 class */
const directionClass = computed(() =>
  props.direction === 'row' ? 'flex-row items-center' : 'flex-col'
)
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
