<template>
  <ChptFilter
    type="tag"
    :model-value="props.modelValue"
    :options="props.options"
    :label="props.label"
    :placeholder="props.placeholder"
    :show-clear-all="props.isUnselectAll"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup>
import ChptFilter from './ChptFilter.vue'
import { warnDeprecated } from '@/components/library/shared/warnDeprecated'

/**
 * TagFilterDropdown（@deprecated）—— 請改用 <ChptFilter type="tag" />
 *
 * props 對應：isUnselectAll → show-clear-all。
 */
const props = defineProps({
  label: { type: String, default: '' },
  options: { type: Array, required: true },
  modelValue: { type: Array, default: () => [] },
  placeholder: { type: String, default: '搜尋...' },
  isUnselectAll: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

warnDeprecated('TagFilterDropdown', 'ChptFilter（type="tag"）', 'isUnselectAll → show-clear-all')
</script>
