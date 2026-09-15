<script setup>
import { ref, computed, useTemplateRef } from 'vue'
import { onClickOutside } from '@vueuse/core'

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  options: {
    type: Array,
    required: true
  },
  modelValue: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: '請選擇...'
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)

// 計算顯示文字
const displayText = computed(() => {
  if (props.modelValue.length === 0) {
    return props.placeholder
  }
  if (props.modelValue.length === 1) {
    return props.modelValue[0]
  }
  return `已選擇 ${props.modelValue.length} 項`
})

// 切換選項
function toggleOption(option) {
  const newValue = [...props.modelValue]
  const index = newValue.indexOf(option)
  
  if (index > -1) {
    newValue.splice(index, 1)
  } else {
    newValue.push(option)
  }
  
  emit('update:modelValue', newValue)
}

// 全選/取消全選
function toggleAll() {
  if (props.modelValue.length === props.options.length) {
    emit('update:modelValue', [])
  } else {
    emit('update:modelValue', [...props.options])
  }
}

// 點擊外部關閉
function closeDropdown() {
  isOpen.value = false
}
/**
 * 點擊元件外部時關閉下拉。
 *
 * 原本用的是 main.js 全域註冊的 v-click-outside 指令 —— 那是應用程式層的設定，
 * 組件庫不該假設使用端一定註冊過同名指令（沒註冊時只會靜默失效，不會報錯）。
 * 改用既有相依 @vueuse/core 的 onClickOutside，元件自給自足。
 */
const rootRef = useTemplateRef('root')
onClickOutside(rootRef, () => closeDropdown())
</script>

<template>
  <div ref="root" class="relative">
    <!-- 下拉按鈕 - 移除標籤，緊湊設計 -->
    <button
      @click="isOpen = !isOpen"
      class="w-full px-3 py-1.5 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-700 truncate">{{ displayText }}</span>
        <i 
          :class="[
            'fas fa-chevron-down text-gray-400 text-xs transition-transform duration-200',
            isOpen ? 'rotate-180' : ''
          ]"
        ></i>
      </div>
    </button>
    
    <!-- 下拉選單 -->
    <div
      v-show="isOpen"
      class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-32 overflow-auto"
    >
      <!-- 全選選項 -->
      <div class="px-2 py-1 border-b border-gray-200">
        <label class="flex items-center hover:bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            :checked="modelValue.length === options.length && options.length > 0"
            :indeterminate="modelValue.length > 0 && modelValue.length < options.length"
            @change="toggleAll"
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          >
          <span class="ml-2 text-xs font-medium text-gray-700">全部</span>
        </label>
      </div>
      
      <!-- 選項列表 -->
      <div class="py-1">
        <label
          v-for="option in options"
          :key="option"
          class="flex items-center px-2 py-1 hover:bg-gray-50 cursor-pointer"
        >
          <input
            type="checkbox"
            :checked="modelValue.includes(option)"
            @change="toggleOption(option)"
            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          >
          <span class="ml-2 text-xs text-gray-700">{{ option }}</span>
        </label>
      </div>
    </div>
  </div>
</template>