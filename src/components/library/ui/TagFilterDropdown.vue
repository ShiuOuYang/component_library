<template>
  <ChptFilter
    type="tag"
    :model-value="props.modelValue"
    :options="props.options"
    :label="props.label"
    :placeholder="props.placeholder"
    :show-clear-all="props.isUnselectAll"
    @update:model-value="handleUpdate"
  />
</template>

<script setup lang="ts">
import ChptFilter from './ChptFilter.vue'
import { warnDeprecated } from '@/components/library/shared/warnDeprecated'
import type { SelectOption } from '@/components/library/shared/types/ui.types'

/**
 * TagFilterDropdown（@deprecated）—— 請改用 <ChptFilter type="tag" />
 *
 * props 對應：isUnselectAll → show-clear-all。
 */
interface TagFilterDropdownProps {
  label?: string
  options?: SelectOption[] | Array<string | number>
  modelValue?: Array<string | number>
  placeholder?: string
  /** 對應 ChptFilter 的 show-clear-all */
  isUnselectAll?: boolean
}

const props = withDefaults(defineProps<TagFilterDropdownProps>(), {
  label: '',
  options: () => [],
  modelValue: () => [],
  placeholder: '搜尋...',
  isUnselectAll: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: Array<string | number>]
}>()

/**
 * ChptFilter 的 modelValue 型別涵蓋三種模式，但這個薄包裝固定用
 * type="tag"（多選），實際只會收到陣列。這裡把型別收窄回
 * legacy 的多值介面。
 */
function handleUpdate(value: string | number | Array<string | number>): void {
  emit('update:modelValue', Array.isArray(value) ? value : [value])
}

warnDeprecated('TagFilterDropdown', 'ChptFilter（type="tag"）', 'isUnselectAll → show-clear-all')
</script>
