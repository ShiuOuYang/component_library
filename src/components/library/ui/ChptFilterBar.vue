<template>
  <div class="flex items-center gap-3 px-1 flex-wrap">
    <!-- 篩選器循環渲染 -->
    <div v-for="filter in props.filters" :key="filter.key" class="flex items-center gap-2">
      <label class="text-sm font-medium text-content-primary whitespace-nowrap">
        {{ filter.label }}:
      </label>
      <select
        :value="props.modelValue[filter.key]"
        @change="handleChange(filter.key, ($event.target as HTMLSelectElement).value)"
        class="px-3 py-1.5 text-sm border border-stroke-default rounded-lg focus:outline-none focus:ring-2 focus:ring-stroke-focus focus:border-stroke-focus bg-surface-primary transition-all shadow-sm hover:border-primary-400"
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
    <div v-if="props.showCount" class="ml-auto text-sm text-content-secondary">
      共 <span class="font-semibold text-accent">{{ props.count }}</span> 筆{{ props.countLabel }}
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ChptFilterBar（CHPT 主題） - 多欄位過濾橫列
 *
 * 整合原 FilterBar：以 filters 陣列描述多個單選過濾器，
 * 並以單一物件 modelValue 雙向綁定所有欄位的值。
 *
 * 與單一過濾元件 ChptFilter（type="select"）搭配使用。
 */

interface FilterOption {
  value: string | number
  label: string
  count?: number
}

interface FilterConfig {
  key: string
  label: string
  allLabel?: string
  allCount?: number
  options: FilterOption[]
}

interface ChptFilterBarProps {
  /** 過濾器配置 */
  filters?: FilterConfig[]
  /** v-model 綁定值（{ key: value }） */
  modelValue?: Record<string, string>
  /** 是否顯示計數 */
  showCount?: boolean
  /** 計數數值 */
  count?: number
  /** 計數標籤 */
  countLabel?: string
}

const props = withDefaults(defineProps<ChptFilterBarProps>(), {
  filters: () => [],
  modelValue: () => ({}),
  showCount: true,
  count: 0,
  countLabel: '項目',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, string>): void
}>()

function handleChange(key: string, value: string): void {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}
</script>

<style scoped>
select:hover { border-color: #33A276; }
select:focus { box-shadow: 0 0 0 3px rgba(0, 138, 85, 0.1); }
</style>
