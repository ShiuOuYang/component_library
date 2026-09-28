<template>
  <div
    class="chpt-list rounded-lg bg-surface-primary"
    :class="props.bordered ? 'border border-stroke-light' : ''"
    :aria-busy="props.loading || undefined"
  >
    <div v-if="$slots.header || props.header" class="border-b border-stroke-light px-4 py-3 text-sm font-semibold text-content-primary">
      <slot name="header">{{ props.header }}</slot>
    </div>

    <!-- 第一次載入：骨架 -->
    <div v-if="props.loading && !props.items.length" class="space-y-3 px-4 py-4" role="status" :aria-label="config.locale.loading">
      <div v-for="i in 3" :key="i" class="flex items-center gap-3" aria-hidden="true">
        <div v-if="hasAvatar" class="h-10 w-10 shrink-0 animate-pulse rounded-full bg-surface-tertiary"></div>
        <div class="flex-1 space-y-2">
          <div class="h-3 w-1/3 animate-pulse rounded bg-surface-tertiary"></div>
          <div class="h-3 w-2/3 animate-pulse rounded bg-surface-tertiary"></div>
        </div>
      </div>
    </div>

    <!-- 空狀態 -->
    <div v-else-if="!props.items.length" class="px-4 py-8 text-center text-sm text-content-tertiary">
      <slot name="empty">{{ props.emptyText ?? config.locale.empty }}</slot>
    </div>

    <ul
      v-else
      role="list"
      :class="[props.split ? 'divide-y divide-stroke-light' : '', props.grid ? 'grid gap-3 p-3' : '']"
      :style="props.grid ? { gridTemplateColumns: `repeat(auto-fill, minmax(${props.grid}px, 1fr))` } : undefined"
    >
      <li
        v-for="(item, index) in props.items"
        :key="keyOf(item, index)"
        :class="[paddingClass, props.grid ? 'rounded-lg border border-stroke-light' : '']"
      >
        <slot :item="item" :index="index">
          <!-- 預設版面：頭像 / 標題 + 說明 / 右側補充 -->
          <div class="flex items-start gap-3">
            <img
              v-if="field(item, 'avatar')"
              :src="String(field(item, 'avatar'))"
              alt=""
              class="h-10 w-10 shrink-0 rounded-full object-cover"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-content-primary">{{ field(item, 'title') }}</p>
              <p v-if="field(item, 'description')" class="mt-0.5 text-sm text-content-secondary">{{ field(item, 'description') }}</p>
            </div>
            <div v-if="field(item, 'extra') || $slots.actions" class="flex shrink-0 items-center gap-2 text-sm text-content-tertiary">
              <span v-if="field(item, 'extra')">{{ field(item, 'extra') }}</span>
              <slot name="actions" :item="item" :index="index" />
            </div>
          </div>
        </slot>
      </li>
    </ul>

    <!-- 載入更多：按鈕（預設）或捲到底自動載入（infinite） -->
    <div v-if="props.items.length && (props.hasMore || (props.loading && props.items.length))" class="border-t border-stroke-light px-4 py-2 text-center">
      <span v-if="props.loading" class="inline-flex items-center gap-2 text-sm text-content-tertiary" role="status">
        <span class="h-4 w-4 animate-spin rounded-full border-2 border-stroke-default border-t-accent-solid" aria-hidden="true"></span>
        {{ config.locale.loading }}
      </span>
      <button
        v-else-if="!props.infinite"
        type="button"
        class="inline-flex h-control-sm items-center rounded-md px-3 text-sm font-medium text-accent hover:bg-accent-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
        @click="emit('load-more')"
      >
        {{ props.loadMoreText }}
      </button>
      <div v-else ref="sentinelRef" class="h-px" aria-hidden="true"></div>
    </div>

    <div v-if="$slots.footer || props.footer" class="border-t border-stroke-light px-4 py-3 text-sm text-content-secondary">
      <slot name="footer">{{ props.footer }}</slot>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useConfig } from '@/components/library/shared/config'

/**
 * ChptList —— 通知、待辦、最近活動這類「一筆一行」的清單
 *
 * - 沒給插槽時用預設版面：item.avatar / title / description / extra
 * - loading 且還沒有資料：骨架；已有資料時在底部顯示「載入中」，不會整個清單閃掉
 * - hasMore：底部「載入更多」按鈕；加 infinite 則捲到底自動送出 load-more（IntersectionObserver）
 * - grid：卡片格狀排列（每張卡最小寬度 px）
 *
 * 上萬筆請用 ChptVirtualList；這個元件會把所有項目都畫出來。
 */
interface ChptListProps {
  items?: T[]
  /** 每筆的唯一鍵欄位（預設用 id，沒有時用索引） */
  itemKey?: string
  header?: string
  footer?: string
  bordered?: boolean
  /** 項目之間的分隔線 */
  split?: boolean
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  hasMore?: boolean
  infinite?: boolean
  loadMoreText?: string
  emptyText?: string
  /** 格狀排列：每張卡片的最小寬度（px） */
  grid?: number
}

const props = withDefaults(defineProps<ChptListProps>(), {
  items: () => [],
  itemKey: 'id',
  header: '',
  footer: '',
  bordered: true,
  split: true,
  size: 'md',
  loading: false,
  hasMore: false,
  infinite: false,
  loadMoreText: '載入更多',
  emptyText: undefined,
  grid: undefined,
})

const emit = defineEmits<{ 'load-more': [] }>()
const config = useConfig()

const paddingClass = computed(() => ({ sm: 'px-3 py-2', md: 'px-4 py-3', lg: 'px-5 py-4' })[props.size])

function field(item: T, name: string): unknown {
  return item && typeof item === 'object' ? (item as Record<string, unknown>)[name] : name === 'title' ? item : undefined
}

function keyOf(item: T, index: number): string | number {
  const v = field(item, props.itemKey)
  return typeof v === 'string' || typeof v === 'number' ? v : index
}

const hasAvatar = computed(() => props.items.length === 0 || props.items.some((i) => !!field(i, 'avatar')))

// ----- 無限捲動 -----
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

watch(
  sentinelRef,
  (el) => {
    observer?.disconnect()
    observer = null
    if (!el || typeof IntersectionObserver === 'undefined') return
    observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && props.hasMore && !props.loading) emit('load-more')
    })
    observer.observe(el)
  },
  { flush: 'post' }
)

onBeforeUnmount(() => observer?.disconnect())
</script>
