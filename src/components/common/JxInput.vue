<template>
  <div class="flex flex-col gap-1" :class="fullWidth ? 'w-full' : ''">
    <label v-if="label" :for="id" class="text-sm text-gray-600 whitespace-nowrap">
      {{ label }}
    </label>
    <div class="relative flex items-center" :class="fullWidth ? 'w-full' : ''">
      <JxIcon
        v-if="prefixIcon"
        :size="16"
        color="gray-400"
        class="absolute left-2 pointer-events-none"
        >{{ prefixIcon }}</JxIcon
      >
      <input
        :id="id"
        ref="inputRef"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxlength"
        @input="handleInput"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
        class="border rounded-md shadow-sm focus:outline-none focus:ring-1 transition-colors"
        :class="[
          sizeClass,
          fullWidth ? 'w-full' : '',
          prefixIcon ? 'pl-8' : '',
          clearable && modelValue ? 'pr-8' : '',
          errorText
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
          disabled ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-white',
        ]"
      />
      <button
        v-if="clearable && modelValue && !disabled"
        type="button"
        class="absolute right-2 text-gray-400 hover:text-gray-600"
        @click="handleClear"
      >
        <JxIcon :size="16">close</JxIcon>
      </button>
    </div>
    <p v-if="errorText" class="text-xs text-red-500">{{ errorText }}</p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import JxIcon from './JxIcon.vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text'
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
  readonly: {
    type: Boolean,
    default: false
  },
  clearable: {
    type: Boolean,
    default: false
  },
  fullWidth: {
    type: Boolean,
    default: false
  },
  prefixIcon: {
    type: String,
    default: ''
  },
  maxlength: {
    type: [String, Number],
    default: undefined
  },
  errorText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'clear', 'blur', 'focus'])

const inputRef = ref(null)
const id = computed(() => `jx-input-${Math.random().toString(36).substr(2, 9)}`)

const sizeClass = computed(() => {
  const sizeMap = {
    xs: 'text-xs py-0.5 px-2',
    sm: 'text-sm py-1 px-2',
    md: 'text-base py-1.5 px-3',
    lg: 'text-lg py-2 px-4'
  }
  return sizeMap[props.size]
})

const handleInput = (event) => {
  let value = event.target.value
  if (props.type === 'number' && value !== '') {
    value = Number(value)
  }
  emit('update:modelValue', value)
}

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
  inputRef.value?.focus()
}
</script>
