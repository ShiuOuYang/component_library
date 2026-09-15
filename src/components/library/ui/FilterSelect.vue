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
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #default="{ option }">
      <slot :option="option" />
    </template>
  </ChptFilter>
</template>

<script setup>
import ChptFilter from './ChptFilter.vue'
import { warnDeprecated } from '@/components/library/shared/warnDeprecated'

/**
 * FilterSelect（@deprecated）—— 請改用 <ChptFilter type="select" />
 *
 * 兩者模板結構相同，差別只在 legacy 版寫死 gray/blue 色碼、不走設計令牌。
 */
const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, required: true },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '全部' },
  allValue: { type: [String, Number], default: '' },
  showAllOption: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  size: {
    type: String,
    default: 'sm',
    validator: (value) => ['xs', 'sm', 'md', 'lg'].includes(value),
  },
  fullWidth: { type: Boolean, default: false },
  valueKey: { type: String, default: '' },
  labelKey: { type: String, default: '' },
  selectClass: { type: String, default: '' },
  labelClass: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

warnDeprecated('FilterSelect', 'ChptFilter（type="select"）')
</script>
