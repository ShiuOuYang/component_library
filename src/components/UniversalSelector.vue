<template>
  <div class="relative">
    <!-- 簡單模式 - 下拉選單 -->
    <div v-if="mode === 'simple'" class="bg-white shadow-sm rounded-lg border border-gray-200">
      <label v-if="label" class="block text-xs font-medium text-gray-700 mb-1 px-3 pt-2">
        {{ label }}
      </label>
      <select 
        v-model="selectedValue"
        class="w-full px-3 py-1.5 text-xs bg-white border-0 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
        @change="handleChange"
        :disabled="disabled"
      >
        <!-- <option value="">{{ placeholder }}</option> -->
        <option 
          v-for="option in computedOptions" 
          :key="getOptionValue(option)" 
          :value="getOptionValue(option)"
        >
          {{ getOptionLabel(option) }}
        </option>
      </select>
    </div>

    <!-- 進階模式 - 下拉按鈕 -->
    <div v-else>
      <!-- 選擇器按鈕 -->
      <button
        @click="toggleDropdown"
        :disabled="disabled"
        :class="[
          'flex items-center justify-between w-full px-4 py-2 text-sm font-medium border rounded-lg transition-all shadow-sm',
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50'
            : 'border-gray-300 bg-white hover:bg-gray-50',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer'
        ]"
      >
        <div class="flex items-center space-x-2">
          <i v-if="icon" :class="['fas', icon, 'text-gray-500']"></i>
          <span class="text-gray-700">{{ displayText }}</span>
        </div>
        <i
          :class="[
            'fas fa-chevron-down text-gray-400 transition-transform duration-200',
            isOpen ? 'rotate-180' : ''
          ]"
        ></i>
      </button>

      <!-- 下拉選單 -->
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="isOpen"
          class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          <!-- 搜尋框（可選） -->
          <div v-if="searchable" class="p-3 border-b border-gray-200">
            <div class="relative">
              <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                v-model="searchQuery"
                type="text"
                :placeholder="searchPlaceholder"
                class="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <!-- 全選/清除按鈕（多選模式） -->
          <div v-if="multiple && showSelectAll && computedOptions.length > 0" class="p-3 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <button
                @click="selectAll"
                class="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                全選
              </button>
              <button
                @click="clearAll"
                class="text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                清除
              </button>
            </div>
          </div>

          <!-- 選項列表 -->
          <div class="py-2">
            <div
              v-for="option in filteredOptions"
              :key="getOptionValue(option)"
              @click="handleOptionClick(option)"
              :class="[
                'flex items-center px-4 py-2 text-sm cursor-pointer transition-colors',
                isSelected(option)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              ]"
            >
              <!-- 多選模式的勾選框 -->
              <div v-if="multiple" class="mr-3">
                <i
                  :class="[
                    'fas text-sm',
                    isSelected(option) 
                      ? 'fa-check-square text-blue-600' 
                      : 'fa-square text-gray-400'
                  ]"
                ></i>
              </div>

              <!-- 選項圖示（可選） -->
              <i 
                v-if="getOptionIcon(option)" 
                :class="['fas', getOptionIcon(option), 'mr-2 text-gray-500']"
              ></i>

              <!-- 選項文字 -->
              <span class="flex-1">{{ getOptionLabel(option) }}</span>

              <!-- 選項描述（可選） -->
              <span 
                v-if="getOptionDescription(option)" 
                class="text-xs text-gray-500 ml-2"
              >
                {{ getOptionDescription(option) }}
              </span>

              <!-- 單選模式的選中指示器 -->
              <i
                v-if="!multiple && isSelected(option)"
                class="fas fa-check text-blue-600 ml-2"
              ></i>
            </div>

            <!-- 無選項提示 -->
            <div
              v-if="filteredOptions.length === 0"
              class="px-4 py-3 text-sm text-gray-500 text-center"
            >
              {{ noOptionsText }}
            </div>
          </div>
        </div>
      </Transition>

      <!-- 背景遮罩（點擊關閉） -->
      <div
        v-if="isOpen"
        class="fixed inset-0 z-40"
        @click="closeDropdown"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
// import { useWipStore } from '../stores/wip.js'

const props = defineProps({
  // 基本屬性
  modelValue: {
    type: [String, Number, Array, Object],
    default: null
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '請選擇...'
  },
  
  // 顯示模式
  mode: {
    type: String,
    default: 'simple', // 'simple' | 'advanced'
    validator: (value) => ['simple', 'advanced'].includes(value)
  },
  
  // 選擇器類型（用於動態選項）
  type: {
    type: String,
    default: '',
    validator: (value) => !value || ['dataType', 'chartStack'].includes(value)
  },
  
  // 靜態選項
  options: {
    type: Array,
    default: () => []
  },
  
  // 選項配置
  valueKey: {
    type: String,
    default: 'value'
  },
  labelKey: {
    type: String,
    default: 'label'
  },
  iconKey: {
    type: String,
    default: 'icon'
  },
  descriptionKey: {
    type: String,
    default: 'description'
  },
  
  // 功能選項
  multiple: {
    type: Boolean,
    default: false
  },
  searchable: {
    type: Boolean,
    default: false
  },
  showSelectAll: {
    type: Boolean,
    default: true
  },
  showCount: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  
  // UI 選項
  icon: {
    type: String,
    default: ''
  },
  searchPlaceholder: {
    type: String,
    default: '搜尋選項...'
  },
  noOptionsText: {
    type: String,
    default: '沒有可用選項'
  }
})

const emit = defineEmits(['update:modelValue', 'change'])
const wipStore = useWipStore()

// 響應式狀態
const isOpen = ref(false)
const searchQuery = ref('')

// 根據類型計算選項
const computedOptions = computed(() => {
  // 如果有靜態選項，直接使用
  if (props.options.length > 0) {
    return props.options
  }
  
  // 動態選項（基於類型）
  if (props.type === 'dataType') {
    return [
      { label: '批數', value: '批數' },
      { label: '顆數', value: '顆數' }
    ]
  }
  
  if (props.type === 'chartStack') {
    return [
      {
        label: props.showCount 
          ? `膠種 (${wipStore.wipLaminationList?.length || 0} 項)`
          : '膠種',
        value: 'lamination'
      },
      {
        label: props.showCount 
          ? `批型 (${wipStore.wipLotTypeList?.length || 0} 項)`
          : '批型',
        value: 'lotType'
      },
      {
        label: props.showCount 
          ? `料號 (${wipStore.wipPartNumberList?.length || 0} 項)`
          : '料號',
        value: 'partNumber'
      }
    ]
  }
  
  return []
})

// 簡單模式的雙向綁定
const selectedValue = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
    emit('change', value)
  }
})

// 進階模式的顯示文字
const displayText = computed(() => {
  if (props.multiple) {
    const selectedCount = Array.isArray(props.modelValue) ? props.modelValue.length : 0
    if (selectedCount === 0) {
      return props.placeholder
    } else if (selectedCount === 1) {
      const selectedOption = computedOptions.value.find(opt => 
        getOptionValue(opt) === props.modelValue[0]
      )
      return selectedOption ? getOptionLabel(selectedOption) : props.placeholder
    } else {
      return `已選擇 ${selectedCount} 項`
    }
  } else {
    if (props.modelValue === null || props.modelValue === undefined || props.modelValue === '') {
      return props.placeholder
    }
    const selectedOption = computedOptions.value.find(opt => 
      getOptionValue(opt) === props.modelValue
    )
    return selectedOption ? getOptionLabel(selectedOption) : props.placeholder
  }
})

// 過濾後的選項
const filteredOptions = computed(() => {
  if (!props.searchable || !searchQuery.value) {
    return computedOptions.value
  }
  
  return computedOptions.value.filter(option => {
    const label = getOptionLabel(option).toLowerCase()
    const value = String(getOptionValue(option)).toLowerCase()
    const query = searchQuery.value.toLowerCase()
    
    return label.includes(query) || value.includes(query)
  })
})

// 工具方法
function getOptionValue(option) {
  return typeof option === 'object' && option !== null
    ? option[props.valueKey]
    : option
}

function getOptionLabel(option) {
  return typeof option === 'object' && option !== null
    ? option[props.labelKey] || option[props.valueKey] || String(option)
    : String(option)
}

function getOptionIcon(option) {
  return typeof option === 'object' && option !== null
    ? option[props.iconKey]
    : ''
}

function getOptionDescription(option) {
  return typeof option === 'object' && option !== null
    ? option[props.descriptionKey]
    : ''
}

function isSelected(option) {
  const value = getOptionValue(option)
  
  if (props.multiple) {
    return Array.isArray(props.modelValue) && props.modelValue.includes(value)
  } else {
    return props.modelValue === value
  }
}

// 事件處理
function toggleDropdown() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  
  if (isOpen.value) {
    searchQuery.value = ''
  }
}

function closeDropdown() {
  isOpen.value = false
}

function handleOptionClick(option) {
  const value = getOptionValue(option)
  
  if (props.multiple) {
    const currentValue = Array.isArray(props.modelValue) ? [...props.modelValue] : []
    const index = currentValue.indexOf(value)
    
    if (index > -1) {
      currentValue.splice(index, 1)
    } else {
      currentValue.push(value)
    }
    
    emit('update:modelValue', currentValue)
    emit('change', currentValue)
  } else {
    emit('update:modelValue', value)
    emit('change', value)
    closeDropdown()
  }
}

function selectAll() {
  if (!props.multiple) return
  
  const allValues = filteredOptions.value.map(option => getOptionValue(option))
  emit('update:modelValue', allValues)
  emit('change', allValues)
}

function clearAll() {
  if (!props.multiple) return
  
  emit('update:modelValue', [])
  emit('change', [])
}

function handleChange() {
  console.log(`${props.label}切換為:`, selectedValue.value)
}

// 鍵盤事件處理
function handleKeydown(event) {
  if (event.key === 'Escape' && isOpen.value) {
    closeDropdown()
  }
}

// 生命週期
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
/* 自定義滾動條樣式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>