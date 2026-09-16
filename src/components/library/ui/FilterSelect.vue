<template>
  <ChptFilter
    type="select"
    :model-value="props.modelValue"
    :options="props.options"
    :label="props.label"
    :placeholder="props.placeholder"
    :all-value="props.allValue"
    :show-all-option="props.showAllOption"
    :disabled="props.disabled"
    :size="props.size"
    :full-width="props.fullWidth"
    :value-key="props.valueKey"
    :label-key="props.labelKey"
    :select-class="props.selectClass"
    :label-class="props.labelClass"
    @update:model-value="handleUpdate"
  >
    <template #default="{ option }">
      <slot :option="option" />
    </template>
  </ChptFilter>
</template>

<script setup lang="ts">
import ChptFilter from './ChptFilter.vue'
import { warnDeprecated } from '@/components/library/shared/warnDeprecated'
import type { ComponentSize, SelectOption } from '@/components/library/shared/types/ui.types'

/**
 * FilterSelect（@deprecated）—— 請改用 <ChptFilter type="select" />
 *
 * 兩者模板結構相同，差別只在 legacy 版寫死 gray/blue 色碼、不走設計令牌。
 */
interface FilterSelectProps {
  modelValue?: string | number
  options?: SelectOption[] | Array<string | number>
  label?: string
  placeholder?: string
  allValue?: string | number
  showAllOption?: boolean
  disabled?: boolean
  size?: ComponentSize | 'xs' | 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  valueKey?: string
  labelKey?: string
  selectClass?: string
  labelClass?: string
}

const props = withDefaults(defineProps<FilterSelectProps>(), {
  modelValue: '',
  options: () => [],
  label: '',
  placeholder: '全部',
  allValue: '',
  showAllOption: true,
  disabled: false,
  size: 'sm',
  fullWidth: false,
  valueKey: '',
  labelKey: '',
  selectClass: '',
  labelClass: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

/**
 * ChptFilter 的 modelValue 型別涵蓋三種模式（select 為純量、
 * dropdown / tag 為陣列），但這個薄包裝固定用 type="select"，
 * 實際只會收到純量。這裡把型別收窄回 legacy 的單值介面。
 */
function handleUpdate(value: string | number | Array<string | number>): void {
  emit('update:modelValue', Array.isArray(value) ? value[0] ?? '' : value)
}

warnDeprecated('FilterSelect', 'ChptFilter（type="select"）')
</script>
