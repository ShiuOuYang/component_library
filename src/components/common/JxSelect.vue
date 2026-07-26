<template>
  <div class="flex flex-col gap-1" :class="fullWidth ? 'w-full' : ''">
    <label v-if="label" :for="id" class="text-sm text-gray-600 whitespace-nowrap">
      {{ label }}
    </label>
    <select
      :id="id"
      :value="modelValue"
      :disabled="disabled"
      @change="handleChange"
      class="border rounded-md shadow-sm focus:outline-none focus:ring-1 transition-colors"
      :class="[
        sizeClass,
        fullWidth ? 'w-full' : '',
        errorText
          ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
        disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-white',
      ]"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option
        v-for="option in options"
        :key="getOptionValue(option)"
        :value="getOptionValue(option)"
        :disabled="getOptionDisabled(option)"
      >
        {{ getOptionLabel(option) }}
      </option>
    </select>
    <p v-if="errorText" class="text-xs text-red-500">{{ errorText }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  options: {
    type: Array,
    required: true,
    default: () => []
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
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
  fullWidth: {
    type: Boolean,
    default: false
  },
  valueKey: {
    type: String,
    default: null
  },
  labelKey: {
    type: String,
    default: null
  },
  disabledKey: {
    type: String,
    default: 'disabled'
  },
  numberValue: {
    type: Boolean,
    default: false
  },
  errorText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const id = computed(() => `jx-select-${Math.random().toString(36).substr(2, 9)}`)

const sizeClass = computed(() => {
  const sizeMap = {
    xs: 'text-xs py-0.5 px-2',
    sm: 'text-sm py-1 px-2',
    md: 'text-base py-1.5 px-3',
    lg: 'text-lg py-2 px-4'
  }
  return sizeMap[props.size]
})

const getOptionValue = (option) => {
  if (props.valueKey && typeof option === 'object') {
    return option[props.valueKey]
  }
  return typeof option === 'object' ? option.value : option
}

const getOptionLabel = (option) => {
  if (props.labelKey && typeof option === 'object') {
    return option[props.labelKey]
  }
  return typeof option === 'object' ? option.label : option
}

const getOptionDisabled = (option) => {
  return typeof option === 'object' ? Boolean(option[props.disabledKey]) : false
}

const handleChange = (event) => {
  let value = event.target.value
  if (props.numberValue && value !== '') {
    value = Number(value)
  }
  emit('update:modelValue', value)
}
</script>
