<template>
  <div class="flex gap-4" :class="directionClass">
    <label
      v-for="item in props.items"
      :key="String(item.value)"
      class="flex items-center gap-2 cursor-pointer"
      :class="getLabelClasses(item)"
    >
      <div
        class="relative flex items-center justify-center rounded border-2"
        :class="[
          `w-${props.size} h-${props.size}`,
          isChecked(item) ? `bg-${props.bgColor} border-${props.bgColor}` : 'bg-surface-primary border-stroke-default',
          item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ]"
      >
        <input
          type="checkbox"
          :value="item.value"
          v-model="innerModelValue"
          :disabled="item.disabled"
          class="absolute opacity-0 w-0 h-0"
          :aria-label="item.label"
        />
        <!-- 打勾 SVG -->
        <svg
          v-if="isChecked(item)"
          class="w-3 h-3 text-white fill-current pointer-events-none"
          viewBox="0 0 12 10"
        >
          <path d="M4.5 7.5L1.5 4.5L0.5 5.5L4.5 9.5L11.5 2.5L10.5 1.5L4.5 7.5Z"/>
        </svg>
      </div>

      <span
        v-if="props.isLabelShow"
        :class="['select-none', { 'text-content-tertiary': item.disabled }]"
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
import type { Direction } from '@/components/library/shared/types/ui.types'

/**
 * ChptCheckbox（CHPT 主題） - 多選核取方塊元件
 *
 * 特性：
 * - v-model（陣列）支援
 * - 物件選項（label / value / disabled）
 * - 完整 Props / Emits 型別定義
 */

interface ChptCheckboxItem {
  label: string
  value: string | number | boolean
  disabled?: boolean
}

interface ChptCheckboxProps {
  /** v-model 值（選中的 value 陣列） */
  modelValue?: Array<string | number | boolean>
  /** 選項清單 */
  items?: ChptCheckboxItem[]
  /** 外框尺寸（數字代表 px） */
  size?: string
  /** 選中背景色 class */
  bgColor?: string
  /** 邊框色 class */
  borderColor?: string
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

const props = withDefaults(defineProps<ChptCheckboxProps>(), {
  modelValue: () => [],
  items: () => [],
  size: '4',
  bgColor: 'primary-500',
  borderColor: 'primary-500',
  errors: () => [],
  isLabelShow: true,
  labelSize: 'text-sm',
  labelColor: 'text-content-primary',
  direction: 'row',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Array<string | number | boolean>): void
  (e: 'click', item: ChptCheckboxItem): void
}>()

/** v-model 雙向綁定 */
const innerModelValue = computed({
  get: () => props.modelValue,
  set: (value: Array<string | number | boolean>) => emit('update:modelValue', value),
})

const isChecked = (item: ChptCheckboxItem): boolean =>
  props.modelValue.includes(item.value) && !item.disabled

/** label 樣式 */
function getLabelClasses(item: ChptCheckboxItem): Record<string, boolean | string> {
  return {
    'hover:opacity-80': !item.disabled,
    // 'opacity-50 cursor-not-allowed': item.disabled,
    [props.labelSize]: true,
    [props.labelColor]: true,
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
