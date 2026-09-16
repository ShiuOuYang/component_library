<template>
  <ChptFilter
    type="dropdown"
    :model-value="props.modelValue"
    :options="props.options"
    :placeholder="props.placeholder"
    @update:model-value="handleUpdate"
  />
</template>

<script setup lang="ts">
import ChptFilter from './ChptFilter.vue'
import { warnDeprecated } from '@/components/library/shared/warnDeprecated'
import type { SelectOption } from '@/components/library/shared/types/ui.types'

/**
 * FilterDropdown（@deprecated）—— 請改用 <ChptFilter type="dropdown" />
 *
 * 兩者行為相同，ChptFilter 另外支援物件型選項（valueKey / labelKey）。
 *
 * 註：原本宣告了 required 的 label prop，但模板從未使用它（檔案裡的 label
 * 全是 <label> 標籤）。此處保留為選用，避免既有呼叫端噴 prop 警告。
 */
interface FilterDropdownProps {
  label?: string
  options?: SelectOption[] | Array<string | number>
  modelValue?: Array<string | number>
  placeholder?: string
}

const props = withDefaults(defineProps<FilterDropdownProps>(), {
  label: '',
  options: () => [],
  modelValue: () => [],
  placeholder: '請選擇...',
})

const emit = defineEmits<{
  'update:modelValue': [value: Array<string | number>]
}>()

/**
 * ChptFilter 的 modelValue 型別涵蓋三種模式，但這個薄包裝固定用
 * type="dropdown"（多選），實際只會收到陣列。這裡把型別收窄回
 * legacy 的多值介面。
 */
function handleUpdate(value: string | number | Array<string | number>): void {
  emit('update:modelValue', Array.isArray(value) ? value : [value])
}

warnDeprecated('FilterDropdown', 'ChptFilter（type="dropdown"）')
</script>
