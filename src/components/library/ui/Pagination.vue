<template>
  <ChptPagination
    variant="full"
    :current-page="props.currentPage"
    :items-per-page="props.itemsPerPage"
    :total-items="props.totalItems"
    :page-size-options="props.pageSizeOptions"
    @update:current-page="emit('update:currentPage', $event)"
    @update:items-per-page="emit('update:itemsPerPage', $event)"
    @change="emit('change', $event)"
  />
</template>

<script setup lang="ts">
import ChptPagination from './ChptPagination.vue'
import { warnDeprecated } from '@/components/library/shared/warnDeprecated'

/**
 * Pagination（@deprecated）—— 請改用 <ChptPagination variant="full" />
 *
 * props 與事件完全一致，此檔改為薄包裝。
 */
interface PaginationProps {
  totalItems: number
  itemsPerPage?: number
  currentPage?: number
  pageSizeOptions?: number[]
}

const props = withDefaults(defineProps<PaginationProps>(), {
  itemsPerPage: 20,
  currentPage: 1,
  pageSizeOptions: () => [10, 20, 50, 100, 200],
})

const emit = defineEmits<{
  'update:currentPage': [page: number]
  'update:itemsPerPage': [size: number]
  /** 頁碼（與 ChptPagination 一致） */
  change: [page: number]
}>()

warnDeprecated('Pagination', 'ChptPagination（variant="full"）')
</script>
