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

<script setup>
import ChptPagination from './ChptPagination.vue'
import { warnDeprecated } from '@/components/library/shared/warnDeprecated'

/**
 * Pagination（@deprecated）—— 請改用 <ChptPagination variant="full" />
 *
 * props 與事件完全一致，此檔改為薄包裝。
 */
const props = defineProps({
  totalItems: { type: Number, required: true },
  itemsPerPage: { type: Number, default: 20 },
  currentPage: { type: Number, default: 1 },
  pageSizeOptions: { type: Array, default: () => [10, 20, 50, 100, 200] },
})

const emit = defineEmits(['update:currentPage', 'update:itemsPerPage', 'change'])

warnDeprecated('Pagination', 'ChptPagination（variant="full"）')
</script>
