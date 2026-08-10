<template>
  <nav aria-label="breadcrumb" class="flex items-center flex-wrap gap-1">
    <template v-for="(item, index) in props.items" :key="index">
      <!-- 分隔符 -->
      <ChptIcon v-if="index > 0" :size="16" color="gray-400" class="mx-1">
        {{ props.separator }}
      </ChptIcon>

      <!-- 最後一項為目前位置 -->
      <span
        v-if="index === props.items.length - 1"
        class="text-gray-800 font-medium text-sm"
      >
        <slot :name="`item-${index}`" :item="item">
          {{ item.label }}
        </slot>
      </span>

      <!-- 可點擊項 -->
      <router-link
        v-else-if="item.to"
        :to="item.to"
        class="text-gray-500 hover:text-blue-600 transition-colors text-sm cursor-pointer"
      >
        <slot :name="`item-${index}`" :item="item">
          {{ item.label }}
        </slot>
      </router-link>

      <span
        v-else
        class="text-gray-500 hover:text-blue-600 transition-colors text-sm cursor-pointer"
        @click="handleClick(item)"
      >
        <slot :name="`item-${index}`" :item="item">
          {{ item.label }}
        </slot>
      </span>
    </template>
  </nav>
</template>

<script setup lang="ts">
import ChptIcon from './ChptIcon.vue'

/**
 * ChptBreadcrumb（CHPT 主題） - 麵包屑導覽元件
 *
 * 特性：
 * - 支援 router-link 或點擊事件
 * - 可自訂分隔符與插槽
 * - 完整 Props / Emits 型別定義
 */

interface BreadcrumbItem {
  label: string
  to?: string | Record<string, unknown>
}

interface ChptBreadcrumbProps {
  /** 麵包屑項目 */
  items?: BreadcrumbItem[]
  /** 分隔符（Material Symbols 圖示名） */
  separator?: string
}

const props = withDefaults(defineProps<ChptBreadcrumbProps>(), {
  items: () => [],
  separator: 'chevron_right',
})

const emit = defineEmits<{
  (e: 'select', item: BreadcrumbItem): void
}>()

function handleClick(item: BreadcrumbItem): void {
  emit('select', item)
}
</script>

<style scoped>
/* 使用 Tailwind 工具類，無需額外樣式 */
</style>
