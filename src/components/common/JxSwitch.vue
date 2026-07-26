<template>
  <label
    class="inline-flex items-center gap-2"
    :class="disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'"
  >
    <span
      class="relative inline-flex items-center rounded-full transition-colors duration-200 flex-shrink-0"
      :class="[trackSizeClass, modelValue ? onColorClass : 'bg-gray-300']"
      @click="toggle"
    >
      <input
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        class="absolute opacity-0 w-0 h-0"
        :aria-label="label"
        @change="toggle"
      />
      <span
        class="inline-block rounded-full bg-white shadow transform transition-transform duration-200 pointer-events-none"
        :class="[knobSizeClass, modelValue ? knobOnTranslateClass : 'translate-x-0.5']"
      ></span>
    </span>
    <span v-if="label" class="text-sm select-none" :class="disabled ? 'text-gray-400' : 'text-gray-700'">
      {{ label }}
    </span>
  </label>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  },
  color: {
    type: String,
    default: 'primary'
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const toggle = () => {
  if (props.disabled) return
  const next = !props.modelValue
  emit('update:modelValue', next)
  emit('change', next)
}

const trackSizeMap = {
  sm: 'w-8 h-4',
  md: 'w-10 h-5',
  lg: 'w-12 h-6'
}
const knobSizeMap = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5'
}
const knobOnTranslateMap = {
  sm: 'translate-x-4',
  md: 'translate-x-5',
  lg: 'translate-x-6'
}

const trackSizeClass = computed(() => trackSizeMap[props.size] || trackSizeMap.md)
const knobSizeClass = computed(() => knobSizeMap[props.size] || knobSizeMap.md)
const knobOnTranslateClass = computed(() => knobOnTranslateMap[props.size] || knobOnTranslateMap.md)

const onColorMap = {
  primary: 'bg-blue-500',
  secondary: 'bg-gray-500',
  success: 'bg-green-500',
  danger: 'bg-red-500',
  warning: 'bg-yellow-500'
}
const onColorClass = computed(() => onColorMap[props.color] || onColorMap.primary)
</script>
