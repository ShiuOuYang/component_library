<template>
  <div>
    <!-- 導覽列 -->
    <div
      class="flex border-b border-neutral-200"
      :class="{ 'justify-center': props.centered }"
      role="tablist"
    >
      <button
        v-for="(tab, index) in props.tabs"
        :key="index"
        type="button"
        class="px-4 py-2.5 text-sm transition-colors relative cursor-pointer whitespace-nowrap"
        :class="[
          isActive(index)
            ? 'text-primary-600 font-medium'
            : 'text-neutral-500 hover:text-neutral-700',
          isDisabled(tab) ? 'opacity-50 cursor-not-allowed' : '',
        ]"
        role="tab"
        :aria-selected="isActive(index)"
        :disabled="isDisabled(tab)"
        @click="select(index, tab)"
      >
        <span class="flex items-center gap-2">
          <ChptIcon v-if="tab.icon" :size="16" :color="isActive(index) ? 'primary-600' : 'neutral-500'">
            {{ tab.icon }}
          </ChptIcon>
          <span>{{ tab.label }}</span>
          <ChptBadge v-if="tab.badge !== undefined" :count="tab.badge" status="danger" size="sm" />
        </span>

        <!-- 底線 indicator -->
        <span
          class="absolute left-0 right-0 -bottom-[1px] h-0.5 rounded-full transition-all"
          :class="isActive(index) ? 'bg-primary-600' : 'bg-transparent'"
        />
      </button>
    </div>

    <!-- 內容 -->
    <div class="pt-5">
      <template v-for="(tab, index) in props.tabs" :key="index">
        <div v-if="isActive(index)" class="chpt-tabs-panel">
          <slot :name="`panel-${index}`" :tab="tab" :index="index">
            <slot name="panel" :tab="tab" :index="index">
              {{ tab.content }}
            </slot>
          </slot>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import ChptIcon from './ChptIcon.vue'
import ChptBadge from './ChptBadge.vue'

/**
 * ChptTabs（CHPT 主題） - 選項卡元件
 *
 * 特性：
 * - tabs 陣列定義頁籤，可搭配 icon / badge
 * - v-model 控制目前 index
 * - 支援 panel-N 插槽自訂每個面板內容
 * - 完整 Props / Emits 型別定義
 */

interface ChptTabItem {
  label: string
  icon?: string
  content?: string
  badge?: number
  disabled?: boolean
}

interface ChptTabsProps {
  /** 頁籤定義 */
  tabs?: ChptTabItem[]
  /** 目前 index（v-model） */
  modelValue?: number
  /** 是否水平置中 */
  centered?: boolean
  /**
   * 動態判斷某個頁籤是否停用。
   * 與 ChptTabItem.disabled 同時存在時，任一為 true 即停用。
   */
  disabledTab?: (tab: ChptTabItem) => boolean
}

const props = withDefaults(defineProps<ChptTabsProps>(), {
  tabs: () => [],
  modelValue: 0,
  centered: false,
  disabledTab: undefined,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
  (e: 'change', index: number): void
}>()

const activeIndex = ref(props.modelValue || 0)

watch(
  () => props.modelValue,
  (value) => {
    activeIndex.value = value || 0
  },
  { immediate: true }
)

function isActive(index: number): boolean {
  return activeIndex.value === index
}

/** 頁籤是否停用：item 自身的 disabled 或 disabledTab() 任一成立 */
function isDisabled(tab: ChptTabItem): boolean {
  return Boolean(tab.disabled) || Boolean(props.disabledTab?.(tab))
}

function select(index: number, tab: ChptTabItem): void {
  if (isDisabled(tab)) return
  activeIndex.value = index
  emit('update:modelValue', index)
  emit('change', index)
}
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
