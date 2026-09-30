<template>
  <div
    ref="viewport"
    class="chpt-virtual-list relative overflow-y-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus"
    :style="{ height: props.height }"
    tabindex="0"
    role="list"
    :aria-label="props.ariaLabel || undefined"
    :aria-busy="props.loading || undefined"
    @scroll.passive="onScroll"
  >
    <!-- 撐出完整高度，捲軸才會是真的長度 -->
    <div :style="{ height: `${totalHeight}px` }" class="relative">
      <div class="absolute inset-x-0 top-0" :style="{ transform: `translateY(${offsetY}px)` }">
        <div
          v-for="row in visible"
          :key="keyOf(row.item, row.index)"
          role="listitem"
          :aria-setsize="props.items.length"
          :aria-posinset="row.index + 1"
          :style="{ height: `${props.itemHeight}px` }"
          class="overflow-hidden"
        >
          <slot :item="row.item" :index="row.index"></slot>
        </div>
      </div>
    </div>

    <div v-if="props.loading" class="sticky bottom-0 flex justify-center bg-surface-primary/90 py-2 text-sm text-content-tertiary" role="status">
      <slot name="loading">載入中…</slot>
    </div>
    <div v-else-if="!props.items.length" class="flex h-full items-center justify-center text-sm text-content-tertiary">
      <slot name="empty">{{ props.emptyText }}</slot>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'

/**
 * ChptVirtualList（CHPT 主題） - 虛擬捲動清單
 *
 * 上萬筆的清單（料號、序號、Log）只畫看得到的那幾十列，捲起來還是順的。
 * 每一列同樣高（itemHeight）—— 這是讓捲動位置能直接算出來、不必量測每一列的前提。
 *
 * - 滾到接近底部時送出 reach-bottom，用來做「無限捲動」載入下一頁（loading 時不會重複送）
 * - 螢幕閱讀器：只有畫出來的列在 DOM 裡，所以每列帶 aria-setsize / aria-posinset，
 *   讀到的是「第 1,234 項，共 10,000 項」而不是「共 30 項」
 * - ref 方法 scrollToIndex(i) 跳到某一列
 */

interface ChptVirtualListProps {
  items: T[]
  /** 每一列的高度（px） */
  itemHeight: number
  /** 清單高度（CSS 值） */
  height?: string
  /** 可視範圍上下各多畫幾列（捲快時不會看到空白） */
  overscan?: number
  /** 取 key 的欄位；不給時用索引 */
  keyField?: string
  /** 距離底部多少 px 時送出 reach-bottom */
  threshold?: number
  loading?: boolean
  emptyText?: string
  ariaLabel?: string
}

const props = withDefaults(defineProps<ChptVirtualListProps>(), {
  height: '24rem',
  overscan: 6,
  keyField: undefined,
  threshold: 120,
  loading: false,
  emptyText: '沒有資料',
  ariaLabel: '',
})

const emit = defineEmits<{
  (e: 'reach-bottom'): void
  (e: 'scroll', scrollTop: number): void
}>()

const viewport = useTemplateRef<HTMLElement>('viewport')
const scrollTop = ref(0)
const viewportHeight = ref(0)

const totalHeight = computed(() => props.items.length * props.itemHeight)
const first = computed(() => Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.overscan))
const last = computed(() =>
  Math.min(props.items.length, Math.ceil((scrollTop.value + viewportHeight.value) / props.itemHeight) + props.overscan)
)
const offsetY = computed(() => first.value * props.itemHeight)
const visible = computed(() => {
  const out: { item: T; index: number }[] = []
  for (let i = first.value; i < last.value; i++) out.push({ item: props.items[i], index: i })
  return out
})

function keyOf(item: T, index: number): string | number {
  if (props.keyField && item && typeof item === 'object') {
    const v = (item as Record<string, unknown>)[props.keyField]
    if (typeof v === 'string' || typeof v === 'number') return v
  }
  return index
}

let bottomArmed = true
function onScroll(): void {
  const el = viewport.value
  if (!el) return
  scrollTop.value = el.scrollTop
  emit('scroll', el.scrollTop)
  const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - props.threshold
  // 到底只送一次；離開底部區域後才重新啟用（避免捲動事件一直觸發 → 重複載入同一頁）
  if (nearBottom && bottomArmed && !props.loading && props.items.length) {
    bottomArmed = false
    emit('reach-bottom')
  } else if (!nearBottom) {
    bottomArmed = true
  }
}

// 新資料進來（載入下一頁完成）後，允許再次觸發
watch(
  () => props.items.length,
  () => (bottomArmed = true)
)

let observer: ResizeObserver | null = null
onMounted(() => {
  const el = viewport.value
  if (!el) return
  viewportHeight.value = el.clientHeight
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => (viewportHeight.value = el.clientHeight))
    observer.observe(el)
  }
})
onBeforeUnmount(() => observer?.disconnect())

function scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start'): void {
  const el = viewport.value
  if (!el) return
  const i = Math.min(Math.max(0, index), Math.max(0, props.items.length - 1))
  let top = i * props.itemHeight
  if (align === 'center') top -= (el.clientHeight - props.itemHeight) / 2
  if (align === 'end') top -= el.clientHeight - props.itemHeight
  el.scrollTop = Math.max(0, top)
  onScroll()
}

defineExpose({ scrollToIndex })
</script>
