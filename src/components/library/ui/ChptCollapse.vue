<template>
  <div class="divide-y divide-stroke-light rounded-lg border border-stroke-light overflow-hidden bg-surface-primary">
    <div
      v-for="(item, index) in props.items"
      :key="index"
    >
      <!-- 標題 -->
      <button
        :id="headerId(index)"
        type="button"
        :aria-expanded="isOpen(index)"
        :aria-controls="panelId(index)"
        class="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-surface-secondary focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus"
        @click="toggle(index)"
      >
        <span class="font-medium text-content-primary text-sm">{{ item.title }}</span>
        <ChptIcon
          :size="18"
          color="neutral-500"
          aria-hidden="true"
          class="transition-transform duration-200"
          :class="isOpen(index) ? 'rotate-180' : ''"
        >
          arrow_drop_down
        </ChptIcon>
      </button>

      <!-- 內容 -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 max-h-0"
        enter-to-class="opacity-100 max-h-[500px]"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 max-h-[500px]"
        leave-to-class="opacity-0 max-h-0"
      >
        <div
          v-if="isOpen(index)"
          :id="panelId(index)"
          role="region"
          :aria-labelledby="headerId(index)"
          class="px-4 pb-4 text-sm text-content-secondary"
        >
          <slot :name="`content-${index}`" :item="item">
            {{ item.content }}
          </slot>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import ChptIcon from './ChptIcon.vue'

/**
 * ChptCollapse（CHPT 主題） - 摺疊面板元件
 *
 * 特性：
 * - items 陣列定義面板
 * - 支援多面板 / 單面板展開
 * - 可透過插槽自訂內容
 * - 完整 Props / Emits 型別定義
 */

interface CollapseItem {
  title: string
  content?: string
}

interface ChptCollapseProps {
  /** 面板定義 */
  items?: CollapseItem[]
  /** 展開的面板 index（v-model） */
  modelValue?: number[]
  /** 是否允許同時展開多個 */
  multiple?: boolean
}

const props = withDefaults(defineProps<ChptCollapseProps>(), {
  items: () => [],
  modelValue: () => [],
  multiple: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number[]): void
}>()

const openIndexes = ref([...(props.modelValue || [])])

watch(
  () => props.modelValue,
  (value) => {
    openIndexes.value = [...(value || [])]
  },
  { immediate: true }
)

const uid = useId()

/** 標題按鈕的 id，供內容區的 aria-labelledby 指向 */
function headerId(index: number): string {
  return `${uid}-header-${index}`
}

/** 內容區的 id，供標題按鈕的 aria-controls 指向 */
function panelId(index: number): string {
  return `${uid}-panel-${index}`
}

function isOpen(index: number): boolean {
  return openIndexes.value.includes(index)
}

function toggle(index: number): void {
  const current = new Set(openIndexes.value)
  if (current.has(index)) {
    current.delete(index)
  } else {
    if (!props.multiple) current.clear()
    current.add(index)
  }
  openIndexes.value = Array.from(current)
  emit('update:modelValue', openIndexes.value)
}
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
