<template>
  <div class="flex gap-4" :class="directionClass">
    <label
      v-for="item in items"
      :key="item.value"
      class="flex items-center gap-2 cursor-pointer"
      :class="getLabelClasses(item)"
    >
      <div
        class="relative flex items-center justify-center rounded-full border-2"
        :class="[
          sizeClass,
          isChecked(item) ? borderColorClass : 'border-gray-300',
          item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        ]"
      >
        <input
          type="radio"
          :name="name"
          :value="item.value"
          v-model="innerModelValue"
          :disabled="item.disabled"
          class="absolute opacity-0 w-0 h-0"
          :aria-label="item.label"
        />
        <span
          v-if="isChecked(item)"
          class="rounded-full pointer-events-none"
          :class="[dotColorClass, dotSizeClass]"
        ></span>
      </div>
      <span v-if="isLabelShow" :class="['select-none', labelSize, item.disabled ? 'text-gray-400' : labelColor]">{{
        item.label
      }}</span>
    </label>
  </div>
  <div v-if="errors.length" class="flex items-center ml-2 mt-1">
    <JxIcon class="mr-1" :size="20" :weight="300" :grade="-25" color="text-error-light">info</JxIcon>
    <p class="text-error-light text-sm">
      {{ errors[0] }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import JxIcon from './JxIcon.vue'

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: null
  },
  items: {
    type: Array,
    required: true,
    default: () => [],
    validator: (value) => value.every((item) => 'value' in item && 'label' in item)
  },
  name: {
    type: String,
    default: () => `jx-radio-${Math.random().toString(36).substr(2, 9)}`
  },
  size: {
    type: String,
    default: '4'
  },
  color: {
    type: String,
    default: 'primary'
  },
  errors: {
    type: Array,
    default: () => []
  },
  isLabelShow: {
    type: Boolean,
    default: true
  },
  labelSize: {
    type: String,
    default: 'text-sm'
  },
  labelColor: {
    type: String,
    default: 'text-gray-700'
  },
  direction: {
    type: String,
    default: 'row'
  }
})

const emit = defineEmits(['update:modelValue'])

const innerModelValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isChecked = (item) => innerModelValue.value === item.value

const sizeClass = computed(() => {
  const sizeMap = { '3': 'w-3 h-3', '4': 'w-4 h-4', '5': 'w-5 h-5', '6': 'w-6 h-6' }
  return sizeMap[props.size] || 'w-4 h-4'
})

const dotSizeClass = computed(() => {
  const dotSizeMap = { '3': 'w-1 h-1', '4': 'w-1.5 h-1.5', '5': 'w-2 h-2', '6': 'w-2.5 h-2.5' }
  return dotSizeMap[props.size] || 'w-1.5 h-1.5'
})

const colorMap = {
  primary: { border: 'border-blue-500', dot: 'bg-blue-500' },
  secondary: { border: 'border-gray-500', dot: 'bg-gray-500' },
  success: { border: 'border-green-500', dot: 'bg-green-500' },
  danger: { border: 'border-red-500', dot: 'bg-red-500' },
  warning: { border: 'border-yellow-500', dot: 'bg-yellow-500' }
}

const borderColorClass = computed(() => (colorMap[props.color] || colorMap.primary).border)
const dotColorClass = computed(() => (colorMap[props.color] || colorMap.primary).dot)

const getLabelClasses = (item) => ({
  'hover:opacity-80': !item.disabled,
  'opacity-50 cursor-not-allowed': item.disabled
})

const directionClass = computed(() => {
  return props.direction === 'row' ? 'flex-row items-center' : 'flex-col'
})
</script>
