<template>
  <ChptFilter
    type="dropdown"
    :model-value="props.modelValue"
    :options="props.options"
    :placeholder="props.placeholder"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup>
import ChptFilter from './ChptFilter.vue'
import { warnDeprecated } from '@/components/library/shared/warnDeprecated'

/**
 * FilterDropdown（@deprecated）—— 請改用 <ChptFilter type="dropdown" />
 *
 * 兩者行為相同，ChptFilter 另外支援物件型選項（valueKey / labelKey）。
 *
 * 註：原本宣告了 required 的 label prop，但模板從未使用它（檔案裡的 label
 * 全是 <label> 標籤）。此處保留為選用，避免既有呼叫端噴 prop 警告。
 */
const props = defineProps({
  label: { type: String, default: '' },
  options: { type: Array, required: true },
  modelValue: { type: Array, default: () => [] },
  placeholder: { type: String, default: '請選擇...' },
})

const emit = defineEmits(['update:modelValue'])

warnDeprecated('FilterDropdown', 'ChptFilter（type="dropdown"）')
</script>
