<template>
  <ChptFilterBar
    :filters="props.filters"
    :model-value="props.modelValue"
    :show-count="props.showCount"
    :count="props.count"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import ChptFilterBar from './ChptFilterBar.vue'
import { warnDeprecated } from '@/components/library/shared/warnDeprecated'

/**
 * FilterBar（@deprecated）—— 請改用 ChptFilterBar
 *
 * 兩者 API 相同，差別只在 legacy 版寫死 gray/blue 色碼、不走設計令牌。
 * 此檔改為薄包裝，行為完全交給 ChptFilterBar，不再維護第二份實作。
 */
interface FilterBarOption {
  value: string | number
  label: string
  count?: number
}

interface FilterBarConfig {
  key: string
  label: string
  allLabel?: string
  allCount?: number
  options: FilterBarOption[]
}

interface FilterBarProps {
  filters?: FilterBarConfig[]
  modelValue?: Record<string, string>
  showCount?: boolean
  count?: number
}

const props = withDefaults(defineProps<FilterBarProps>(), {
  filters: () => [],
  modelValue: () => ({}),
  showCount: true,
  count: 0,
})

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, string>]
}>()

warnDeprecated('FilterBar', 'ChptFilterBar')
</script>
