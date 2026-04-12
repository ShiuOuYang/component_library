<template>
  <div class="flex items-center space-x-3">
    <span class="text-sm font-medium text-gray-700">資料類型</span>
    <div class="flex bg-gray-100 rounded-lg p-1 shadow-inner">
      <button 
        v-for="option in options"
        :key="option.value"
        :class="[
          'px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 flex items-center space-x-2',
          selectedKey === option.value 
            ? 'bg-white text-blue-600 shadow-sm transform scale-105' 
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
        ]" 
        @click="handleToggle(option.value)"
      >
        <i v-if="option.icon" :class="option.icon"></i>
        <span>{{ option.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: 'lamination'
  },
  options: {
    type: Array,
    default: () => [
      {
        label: '批量',
        value: 'lamination',
        icon: 'fas fa-layer-group'
      },
      {
        label: '片數',
        value: 'lotType',
        icon: 'fas fa-tags'
      }
    ]
  }
})

const emit = defineEmits(['update:modelValue'])

const selectedKey = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const handleToggle = (value) => {
  selectedKey.value = value
}
</script>
