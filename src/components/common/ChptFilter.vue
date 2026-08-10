<template>
  <!-- select：單選下拉 -->
  <div v-if="type === 'select'" class="flex items-center gap-2">
    <label v-if="label" :for="id" class="text-sm text-gray-600 whitespace-nowrap">{{ label }}</label>
    <select
      :id="id"
      :value="modelValue"
      @change="handleSelectChange"
      :disabled="disabled"
      class="border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
      :class="[sizeClass, fullWidth ? 'w-full' : '', selectClass]"
    >
      <option v-if="showAllOption" :value="allValue">{{ placeholder }}</option>
      <option v-for="option in options" :key="getOptionValue(option)" :value="getOptionValue(option)">
        <slot :option="option">{{ getOptionLabel(option) }}</slot>
      </option>
    </select>
  </div>

  <!-- dropdown：多選下拉 -->
  <div v-else-if="type === 'dropdown'" class="relative" ref="rootRef">
    <button
      @click="isOpen = !isOpen"
      class="w-full px-3 py-1.5 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-700 truncate">{{ displayText }}</span>
        <span class="text-xs text-gray-400">▼</span>
      </div>
    </button>
    <div v-show="isOpen" class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-32 overflow-auto">
      <div class="px-2 py-1 border-b border-gray-200">
        <label class="flex items-center hover:bg-gray-50 cursor-pointer">
          <input type="checkbox" :checked="isAllSelected" :indeterminate="isIndeterminate" @change="toggleAll" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
          <span class="ml-2 text-xs font-medium text-gray-700">全部</span>
        </label>
      </div>
      <div class="py-1">
        <label v-for="option in options" :key="getOptionValue(option)" class="flex items-center px-2 py-1 hover:bg-gray-50 cursor-pointer">
          <input type="checkbox" :checked="arrayValue.includes(getOptionValue(option))" @change="toggleOption(getOptionValue(option))" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
          <span class="ml-2 text-xs text-gray-700">{{ getOptionLabel(option) }}</span>
        </label>
      </div>
    </div>
  </div>

  <!-- tag：帶搜尋的緊湊多選 -->
  <div v-else class="w-full bg-white rounded-lg border border-gray-200 shadow-sm">
    <div class="px-2 py-1 border-b border-gray-100">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-medium text-gray-800">{{ label || '篩選' }}</h3>
        <div class="flex items-center gap-1">
          <span v-if="arrayValue.length > 0" class="px-1 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded">{{ arrayValue.length }}</span>
          <button v-if="arrayValue.length > 0" @click="clearAll" class="w-4 h-4 text-[9px] text-red-600 hover:bg-red-50 rounded leading-none">×</button>
        </div>
      </div>
    </div>
    <div class="px-2 py-1 border-b border-gray-100">
      <input v-model="searchText" type="text" :placeholder="placeholder" class="block w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
    </div>
    <div class="px-2 py-1">
      <div class="space-y-0.5 max-h-18 overflow-y-auto">
        <div
          v-for="option in filteredOptions"
          :key="getOptionValue(option)"
          @click="toggleOption(getOptionValue(option))"
          class="flex items-center px-1 py-0.5 border border-gray-200 rounded text-xs cursor-pointer hover:border-blue-300"
          :class="arrayValue.includes(getOptionValue(option)) ? 'border-blue-500 bg-blue-50 text-blue-900' : 'hover:bg-gray-50 text-gray-700'"
        >
          <div class="w-2 h-2 rounded border mr-1 flex-shrink-0" :class="arrayValue.includes(getOptionValue(option)) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'"></div>
          <span class="truncate">{{ getOptionLabel(option) }}</span>
        </div>
        <div v-if="filteredOptions.length === 0" class="text-center py-1"><p class="text-xs text-gray-500">無選項</p></div>
      </div>
      <div v-if="filteredOptions.length > 0" class="flex justify-between items-center mt-1 pt-1 border-t border-gray-200">
        <span class="text-xs text-gray-500">{{ filteredOptions.length }}</span>
        <div class="flex gap-1">
          <button @click="selectAll" class="px-1 py-0.5 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100">全選</button>
          <button @click="unselectAll" class="px-1 py-0.5 text-xs text-gray-600 bg-gray-50 rounded hover:bg-gray-100">清空</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { ComponentSize } from './types/ui.types'
import type { SelectOption } from './types/ui.types'

/**
 * ChptFilter（CHPT 主題） - 過濾選擇元件
 *
 * 整合原 FilterSelect / FilterDropdown / TagFilterDropdown，以 type 切換：
 * - type="select"：單選下拉（原始 select）
 * - type="dropdown"：多選下拉（checkbox 面板 + 全選）
 * - type="tag"：帶搜尋的緊湊多選標籤面板
 *
 * 注意：modelValue 型別因 type 而異
 * - select → String | Number
 * - dropdown / tag → Array
 */

type ChptFilterType = 'select' | 'dropdown' | 'tag'

type ChptFilterValue = SelectOption['value'] | SelectOption['value'][]

interface ChptFilterProps {
  /** 過濾型態 */
  type?: ChptFilterType
  /** v-model 值 */
  modelValue?: ChptFilterValue
  /** 標籤 */
  label?: string
  /** 選項（primitive 或 { label, value }） */
  options?: SelectOption[] | Array<string | number>
  /** 佔位符 / 全部文字 */
  placeholder?: string
  /** all 選項的值（select 用） */
  allValue?: string | number
  /** 是否顯示 all 選項 */
  showAllOption?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 尺寸（select） */
  size?: ComponentSize | 'xs' | 'sm' | 'md' | 'lg'
  /** 是否全寬 */
  fullWidth?: boolean
  /** select 模式：物件的 value/label 鍵 */
  valueKey?: string
  labelKey?: string
  selectClass?: string
  labelClass?: string
}

const props = withDefaults(defineProps<ChptFilterProps>(), {
  type: 'select',
  modelValue: undefined,
  label: '',
  options: () => [],
  placeholder: '全部',
  allValue: '',
  showAllOption: true,
  disabled: false,
  size: 'sm',
  fullWidth: false,
  valueKey: undefined,
  labelKey: undefined,
  selectClass: '',
  labelClass: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: ChptFilterValue): void
}>()

const id = computed(() => `chpt-filter-${Math.random().toString(36).slice(2, 9)}`)

// ===== 通用選項處理 =====
function getOptionValue(option: SelectOption | string | number): SelectOption['value'] {
  if (option && typeof option === 'object') {
    if (props.valueKey) return (option as Record<string, unknown>)[props.valueKey] as SelectOption['value']
    return (option as SelectOption).value
  }
  return option as SelectOption['value']
}

function getOptionLabel(option: SelectOption | string | number): string {
  if (option && typeof option === 'object') {
    if (props.labelKey) return String((option as Record<string, unknown>)[props.labelKey])
    return String((option as SelectOption).label)
  }
  return String(option)
}

// ===== select =====
const sizeClass = computed(() => {
  const map: Record<string, string> = {
    xs: 'text-xs py-0.5 px-2',
    sm: 'text-sm py-1 px-2',
    md: 'text-base py-1.5 px-3',
    lg: 'text-lg py-2 px-4',
  }
  return map[props.size] ?? map.sm
})

function handleSelectChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  emit('update:modelValue', value)
}

// ===== dropdown / tag（多選） =====
const arrayValue = computed<SelectOption['value'][]>(() =>
  Array.isArray(props.modelValue) ? (props.modelValue as SelectOption['value'][]) : []
)

const displayText = computed(() => {
  if (arrayValue.value.length === 0) return props.placeholder
  if (arrayValue.value.length === 1) return String(arrayValue.value[0])
  return `已選擇 ${arrayValue.value.length} 項`
})

const allOptionValues = computed(() => props.options.map(getOptionValue))
const isAllSelected = computed(
  () => arrayValue.value.length > 0 && arrayValue.value.length === allOptionValues.value.length
)
const isIndeterminate = computed(
  () => arrayValue.value.length > 0 && arrayValue.value.length < allOptionValues.value.length
)

function toggleOption(value: SelectOption['value']): void {
  const now = [...arrayValue.value]
  const index = now.indexOf(value)
  if (index > -1) now.splice(index, 1)
  else now.push(value)
  emit('update:modelValue', now)
}

function toggleAll(): void {
  emit('update:modelValue', isAllSelected.value ? [] : [...allOptionValues.value])
}

function clearAll(): void {
  emit('update:modelValue', [])
}

// ===== tag 專屬：搜尋 =====
const isOpen = ref(false)
const searchText = ref('')

const filteredOptions = computed(() => {
  if (!searchText.value) return props.options
  return props.options.filter((opt) =>
    getOptionLabel(opt).toLowerCase().includes(searchText.value.toLowerCase())
  )
})

function selectAll(): void {
  const merged = [...new Set([...arrayValue.value, ...filteredOptions.value.map(getOptionValue)])]
  emit('update:modelValue', merged)
}

function unselectAll(): void {
  const filteredValues = filteredOptions.value.map(getOptionValue)
  const remaining = arrayValue.value.filter((v) => !filteredValues.includes(v))
  emit('update:modelValue', remaining)
}

// ===== 點擊外部關閉 dropdown =====
const rootRef = ref<HTMLElement | null>(null)
function handleOutsideClick(event: MouseEvent): void {
  if (rootRef.value && !rootRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', handleOutsideClick))
onUnmounted(() => document.removeEventListener('click', handleOutsideClick))
</script>

<style scoped>
.overflow-y-auto::-webkit-scrollbar { width: 3px; }
.overflow-y-auto::-webkit-scrollbar-track { background: #f8fafc; }
.overflow-y-auto::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 1px; }
</style>
