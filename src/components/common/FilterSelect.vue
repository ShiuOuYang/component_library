<template>
  <div class="flex items-center gap-2">
    <label 
      v-if="label" 
      :for="id" 
      class="text-sm text-gray-600 whitespace-nowrap"
      :class="labelClass"
    >
      {{ label }}
    </label>
    <select 
      :id="id"
      :value="modelValue"
      @change="handleChange"
      :disabled="disabled"
      class="border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
      :class="[sizeClass, fullWidth ? 'w-full' : '', selectClass]"
    >
      <option v-if="showAllOption" :value="allValue">{{ placeholder }}</option>
      <option 
        v-for="option in options" 
        :key="getOptionValue(option)" 
        :value="getOptionValue(option)"
      >
        <slot :option="option">
          {{ getOptionLabel(option) }}
        </slot>
      </option>
    </select>
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
    required: true
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '全部'
  },
  allValue: {
    type: [String, Number],
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'sm', // 'xs', 'sm', 'md', 'lg'
    validator: (value) => ['xs', 'sm', 'md', 'lg'].includes(value)
  },
  fullWidth: {
    type: Boolean,
    default: false
  },
  // 如果 options 是對象數組，指定值和標籤的鍵名
  valueKey: {
    type: String,
    default: null
  },
  labelKey: {
    type: String,
    default: null
  },
  labelClass: {
    type: String,
    default: ''
  },
  selectClass: {
    type: String,
    default: ''
  },
  showAllOption: {
    type: Boolean,
    default: true
  },
  // 是否將值轉換為數字
  numberValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

// 處理變更事件
const handleChange = (event) => {
  let value = event.target.value
  if (props.numberValue && value !== '') {
    value = Number(value)
  }
  emit('update:modelValue', value)
}

// 生成唯一 ID
const id = computed(() => `filter-select-${Math.random().toString(36).substr(2, 9)}`)

// 根據 size 計算 class
const sizeClass = computed(() => {
  const sizeMap = {
    xs: 'text-xs py-0.5 px-2',
    sm: 'text-sm py-1 px-2',
    md: 'text-base py-1.5 px-3',
    lg: 'text-lg py-2 px-4'
  }
  return sizeMap[props.size]
})

// 獲取選項的值
const getOptionValue = (option) => {
  if (props.valueKey && typeof option === 'object') {
    return option[props.valueKey]
  }
  return typeof option === 'object' ? option.value : option
}

// 獲取選項的標籤
const getOptionLabel = (option) => {
  if (props.labelKey && typeof option === 'object') {
    return option[props.labelKey]
  }
  return typeof option === 'object' ? option.label : option
}
</script>
