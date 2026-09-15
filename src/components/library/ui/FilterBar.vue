<template>
  <ChptFilterBar
    :filters="props.filters"
    :model-value="props.modelValue"
    :show-count="props.showCount"
    :count="props.count"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup>
import ChptFilterBar from './ChptFilterBar.vue'
import { warnDeprecated } from '@/components/library/shared/warnDeprecated'

/**
 * FilterBar（@deprecated）—— 請改用 ChptFilterBar
 *
 * 兩者 API 相同，差別只在 legacy 版寫死 gray/blue 色碼、不走設計令牌。
 * 此檔改為薄包裝，行為完全交給 ChptFilterBar，不再維護第二份實作。
 */
const props = defineProps({
  filters: { type: Array, required: true },
  modelValue: { type: Object, required: true },
  showCount: { type: Boolean, default: true },
  count: { type: Number, default: 0 },
})

const emit = defineEmits(['update:modelValue'])

warnDeprecated('FilterBar', 'ChptFilterBar')
</script>
