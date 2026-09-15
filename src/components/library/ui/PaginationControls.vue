<template>
  <ChptPagination
    variant="compact"
    :current-page="props.currentPage"
    :items-per-page="props.pageSize"
    :total-items="props.total"
    @update:current-page="emit('pageChange', $event)"
    @update:items-per-page="emit('pageSizeChange', $event)"
  />
</template>

<script setup lang="ts">
import ChptPagination from './ChptPagination.vue'
import { warnDeprecated } from '@/components/library/shared/warnDeprecated'

/**
 * PaginationControls（@deprecated）—— 請改用 <ChptPagination variant="compact" />
 *
 * props 對應：pageSize → items-per-page、total → total-items
 * 事件對應：pageChange → update:current-page、pageSizeChange → update:items-per-page
 *
 * ⚠️ totalPages 不再是輸入值。ChptPagination 由 total-items / items-per-page
 *    自行推算，兩者不一致時以推算結果為準（原本可以傳入互相矛盾的組合）。
 */
const props = withDefaults(
  defineProps<{
    currentPage?: number
    /** @deprecated 已改由 total / pageSize 推算，傳入不再有作用 */
    totalPages?: number
    pageSize?: number
    total?: number
  }>(),
  { currentPage: 1, totalPages: 0, pageSize: 20, total: 0 }
)

const emit = defineEmits<{
  pageChange: [page: number]
  pageSizeChange: [size: number]
}>()

warnDeprecated(
  'PaginationControls',
  'ChptPagination（variant="compact"）',
  'pageSize → items-per-page、total → total-items；totalPages 改為自動推算'
)
</script>
