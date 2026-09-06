<template>
  <div class="flex items-center gap-3 px-1">
    <!-- 篩選器循環渲染 -->
    <div
      v-for="filter in filters"
      :key="filter.key"
      class="flex items-center gap-2"
    >
      <label class="text-sm font-medium text-gray-700 whitespace-nowrap">
        {{ filter.label }}:
      </label>
      <select
        :value="modelValue[filter.key]"
        @change="handleChange(filter.key, $event.target.value)"
        class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all shadow-sm hover:border-blue-400"
      >
        <option value="All">
          {{ filter.allLabel || '全部' }}
          <template v-if="filter.allCount !== undefined"> ({{ filter.allCount }})</template>
        </option>
        <option
          v-for="option in filter.options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
          <template v-if="option.count !== undefined"> ({{ option.count }})</template>
        </option>
      </select>
    </div>

    <!-- 顯示計數（可選） -->
    <div v-if="showCount" class="ml-auto text-sm text-gray-600">
      共 <span class="font-semibold text-blue-600">{{ count }}</span> 筆{{ countLabel }}
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  // 篩選器配置
  filters: {
    type: Array,
    required: true,
    // 格式: [
    //   {
    //     key: 'partNumber',
    //     label: '料號',
    //     allLabel: '全部', // 可選，預設為「全部」
    //     options: [
    //       { value: 'ABC123', label: 'ABC123' },
    //       { value: 'DEF456', label: 'DEF456' }
    //     ]
    //   }
    // ]
  },
  
  // v-model 綁定的篩選值
  modelValue: {
    type: Object,
    required: true,
    // 格式: { partNumber: 'All', status: 'All' }
  },
  
  // 是否顯示計數
  showCount: {
    type: Boolean,
    default: true
  },
  
  // 計數數值
  count: {
    type: Number,
    default: 0
  },
  
  // 計數標籤
  countLabel: {
    type: String,
    default: '項目'
  }
})

const emit = defineEmits(['update:modelValue'])

function handleChange(key, value) {
  const newValue = {
    ...props.modelValue,
    [key]: value
  }
  emit('update:modelValue', newValue)
}
</script>

<style scoped>
/* 下拉選單懸停效果 */
select:hover {
  border-color: #60a5fa;
}

/* 選中狀態樣式 */
select:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
</style>
