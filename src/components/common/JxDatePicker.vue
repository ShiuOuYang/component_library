<template>
  <div class="flex flex-col gap-1" :class="fullWidth ? 'w-full' : ''">
    <label v-if="label" class="text-sm text-gray-600 whitespace-nowrap">
      {{ label }}
    </label>
    <VueDatePicker
      :model-value="modelValue"
      :range="range"
      :enable-time-picker="enableTimePicker"
      :format="format"
      :min-date="minDate"
      :max-date="maxDate"
      :disabled="disabled"
      :clearable="clearable"
      :auto-apply="autoApply"
      :placeholder="placeholder"
      class="jx-date-picker"
      :class="sizeClass"
      @update:model-value="handleUpdate"
    />
    <p v-if="errorText" class="text-xs text-red-500">{{ errorText }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

const props = defineProps({
  modelValue: {
    type: [String, Date, Array],
    default: null
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '選擇日期'
  },
  range: {
    type: Boolean,
    default: false
  },
  enableTimePicker: {
    type: Boolean,
    default: false
  },
  format: {
    type: String,
    default: 'yyyy-MM-dd'
  },
  minDate: {
    type: [String, Date],
    default: undefined
  },
  maxDate: {
    type: [String, Date],
    default: undefined
  },
  size: {
    type: String,
    default: 'sm',
    validator: (value) => ['xs', 'sm', 'md', 'lg'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  clearable: {
    type: Boolean,
    default: true
  },
  autoApply: {
    type: Boolean,
    default: false
  },
  fullWidth: {
    type: Boolean,
    default: false
  },
  errorText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'clear'])

const sizeClass = computed(() => `jx-date-picker--${props.size}`)

const handleUpdate = (value) => {
  emit('update:modelValue', value)
  if (!value) emit('clear')
}
</script>

<style scoped>
.jx-date-picker :deep(.dp__input) {
  border-radius: 0.375rem;
  border-color: rgb(209 213 219);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.jx-date-picker :deep(.dp__input:focus) {
  outline: none;
  box-shadow: 0 0 0 1px #3b82f6;
  border-color: #3b82f6;
}

.jx-date-picker :deep(.dp__input:disabled) {
  background-color: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}

.jx-date-picker--xs :deep(.dp__input) {
  height: 22px;
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
}

.jx-date-picker--sm :deep(.dp__input) {
  height: 28px;
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
}

.jx-date-picker--md :deep(.dp__input) {
  height: 36px;
  font-size: 1rem;
  padding: 0.375rem 0.75rem;
}

.jx-date-picker--lg :deep(.dp__input) {
  height: 44px;
  font-size: 1.125rem;
  padding: 0.5rem 1rem;
}

.jx-date-picker :deep(.dp__theme_light) {
  --dp-primary-color: #3b82f6;
  --dp-primary-text-color: #ffffff;
  --dp-secondary-color: #f3f4f6;
  --dp-text-color: #374151;
  --dp-hover-color: #f9fafb;
  --dp-hover-text-color: #374151;
  --dp-border-color: #d1d5db;
}
</style>
