<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center" :role="props.ariaLabel ? 'group' : undefined" :aria-label="props.ariaLabel || undefined">
    <section
      v-for="side in sides"
      :key="side.key"
      :aria-labelledby="`${uid}-${side.key}-title`"
      class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-stroke-default bg-surface-primary sm:w-64 sm:flex-none"
      :class="side.key === 'target' ? 'order-3' : 'order-1'"
    >
      <!-- 標頭：全選（三態）+ 標題 + 數量 -->
      <header class="flex h-control-md items-center gap-2 border-b border-stroke-light bg-surface-secondary px-3">
        <input
          type="checkbox"
          class="size-4 shrink-0 accent-[rgb(var(--t-accent-solid))]"
          :checked="side.allState === 'all'"
          :indeterminate="side.allState === 'some'"
          :disabled="props.disabled || !side.selectable.length"
          :aria-label="`全選${side.title}`"
          @change="toggleAll(side.key)"
        />
        <h3 :id="`${uid}-${side.key}-title`" class="flex-1 truncate text-sm font-medium text-content-primary">{{ side.title }}</h3>
        <span class="shrink-0 text-xs tabular-nums text-content-tertiary">
          <template v-if="side.checked.length">{{ side.checked.length }} / </template>{{ side.items.length }}
        </span>
      </header>

      <div v-if="props.filterable" class="border-b border-stroke-light p-2">
        <div class="relative flex items-center">
          <ChptIcon :size="16" class="pointer-events-none absolute left-2">search</ChptIcon>
          <input
            v-model="query[side.key]"
            type="search"
            :placeholder="props.filterPlaceholder"
            :aria-label="`搜尋${side.title}`"
            :disabled="props.disabled"
            class="h-control-sm w-full rounded-md border border-stroke-default bg-surface-primary pl-8 pr-2 text-sm text-content-primary focus:border-stroke-focus focus:outline-none focus:ring-1 focus:ring-stroke-focus"
          />
        </div>
      </div>

      <ul class="overflow-auto py-1" :style="{ height: props.listHeight }" :aria-labelledby="`${uid}-${side.key}-title`">
        <li v-for="item in side.visible" :key="String(item.key)">
          <label
            class="flex min-h-control-sm items-center gap-2 px-3 py-1 text-sm"
            :class="
              item.disabled || props.disabled
                ? 'cursor-not-allowed text-content-disabled'
                : 'cursor-pointer text-content-primary hover:bg-surface-tertiary'
            "
          >
            <input
              type="checkbox"
              class="size-4 shrink-0 accent-[rgb(var(--t-accent-solid))]"
              :checked="checked[side.key].has(item.key)"
              :disabled="item.disabled || props.disabled"
              @change="toggleOne(side.key, item.key)"
            />
            <span class="min-w-0 flex-1">
              <slot name="item" :item="item" :side="side.key">
                <span class="block truncate">{{ item.label }}</span>
                <span v-if="item.description" class="block truncate text-xs text-content-tertiary">{{ item.description }}</span>
              </slot>
            </span>
          </label>
        </li>
        <li v-if="!side.visible.length" class="flex h-full flex-col items-center justify-center gap-1 text-sm text-content-tertiary">
          <ChptIcon :size="24">inbox</ChptIcon>
          {{ query[side.key] ? '找不到符合的項目' : props.emptyText }}
        </li>
      </ul>

      <footer v-if="$slots.footer" class="border-t border-stroke-light px-3 py-2">
        <slot name="footer" :side="side.key"></slot>
      </footer>
    </section>

    <!-- 中間的移動按鈕（窄螢幕時上下排列，箭頭跟著轉向） -->
    <div class="order-2 flex justify-center gap-2 sm:flex-col">
      <button
        type="button"
        :disabled="props.disabled || !checked.source.size"
        class="inline-flex h-control-sm items-center justify-center gap-1 rounded-md border border-stroke-default bg-surface-primary px-2 text-sm text-content-primary shadow-sm transition-colors hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:cursor-not-allowed disabled:text-content-disabled disabled:hover:bg-surface-primary"
        @click="move('target')"
      >
        <ChptIcon :size="18" color="current" class="rotate-90 sm:rotate-0">chevron_right</ChptIcon>
        <span>{{ props.buttonTexts[0] }}</span>
        <span v-if="checked.source.size" class="tabular-nums">({{ checked.source.size }})</span>
      </button>
      <button
        type="button"
        :disabled="props.disabled || !checked.target.size"
        class="inline-flex h-control-sm items-center justify-center gap-1 rounded-md border border-stroke-default bg-surface-primary px-2 text-sm text-content-primary shadow-sm transition-colors hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:cursor-not-allowed disabled:text-content-disabled disabled:hover:bg-surface-primary"
        @click="move('source')"
      >
        <ChptIcon :size="18" color="current" class="-rotate-90 sm:rotate-0">chevron_left</ChptIcon>
        <span>{{ props.buttonTexts[1] }}</span>
        <span v-if="checked.target.size" class="tabular-nums">({{ checked.target.size }})</span>
      </button>
    </div>

    <span class="sr-only" aria-live="polite">{{ liveMessage }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import ChptIcon from './ChptIcon.vue'

/**
 * ChptTransfer（CHPT 主題） - 穿梭框
 *
 * 從左邊的清單挑一批項目移到右邊（權限指派、報表欄位、要通知的人員）。
 * v-model 是右邊（已選）的 key 陣列。
 *
 * 做法刻意用原生 checkbox + 按鈕：勾選、全選、搜尋、移動都是一般表單操作，
 * 鍵盤與螢幕閱讀器不需要學新的互動方式。移動後以 live region 報讀「已移動 3 項」。
 *
 * - 全選只作用在「目前看得到（搜尋後）且未停用」的項目
 * - targetOrder="push"：新移過去的排在右邊最後面；預設照資料原本的順序
 */

export interface TransferItem {
  key: string | number
  label: string
  description?: string
  disabled?: boolean
  [extra: string]: unknown
}

type Key = string | number
type Side = 'source' | 'target'

interface ChptTransferProps {
  /** v-model：右邊（已選）的 key */
  modelValue?: Key[]
  data?: TransferItem[]
  /** 左右標題 */
  titles?: [string, string]
  /** 移動按鈕文字 */
  buttonTexts?: [string, string]
  /** 顯示搜尋框 */
  filterable?: boolean
  filterPlaceholder?: string
  /** 自訂搜尋 */
  filterMethod?: (query: string, item: TransferItem) => boolean
  /** 右邊的排序：照原本資料順序 / 新加入的放最後 */
  targetOrder?: 'original' | 'push'
  /** 清單高度（CSS 值） */
  listHeight?: string
  emptyText?: string
  disabled?: boolean
  /** 整個元件的名稱（放在 ChptFormItem 外單獨使用時建議設定） */
  ariaLabel?: string
}

const props = withDefaults(defineProps<ChptTransferProps>(), {
  modelValue: () => [],
  data: () => [],
  titles: () => ['可選項目', '已選項目'],
  buttonTexts: () => ['加入', '移除'],
  filterable: false,
  filterPlaceholder: '搜尋',
  filterMethod: undefined,
  targetOrder: 'original',
  listHeight: '16rem',
  emptyText: '沒有資料',
  disabled: false,
  ariaLabel: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Key[]): void
  (e: 'change', value: Key[], direction: 'left' | 'right', movedKeys: Key[]): void
}>()

const uid = useId()

const query = reactive<Record<Side, string>>({ source: '', target: '' })
const checked = reactive<Record<Side, Set<Key>>>({ source: new Set(), target: new Set() })
const liveMessage = ref('')

const byKey = computed(() => new Map(props.data.map((item) => [item.key, item])))

const targetItems = computed(() => {
  if (props.targetOrder === 'push') {
    return props.modelValue.map((k) => byKey.value.get(k)).filter((x): x is TransferItem => !!x)
  }
  const set = new Set(props.modelValue)
  return props.data.filter((item) => set.has(item.key))
})

const sourceItems = computed(() => {
  const set = new Set(props.modelValue)
  return props.data.filter((item) => !set.has(item.key))
})

function matches(item: TransferItem, q: string): boolean {
  if (!q.trim()) return true
  if (props.filterMethod) return props.filterMethod(q, item)
  return item.label.toLowerCase().includes(q.trim().toLowerCase())
}

const sides = computed(() =>
  (['source', 'target'] as const).map((key) => {
    const items = key === 'source' ? sourceItems.value : targetItems.value
    const visible = props.filterable ? items.filter((item) => matches(item, query[key])) : items
    const selectable = visible.filter((item) => !item.disabled)
    const checkedVisible = selectable.filter((item) => checked[key].has(item.key))
    const allState: 'none' | 'some' | 'all' =
      !checkedVisible.length ? 'none' : checkedVisible.length === selectable.length ? 'all' : 'some'
    return {
      key,
      title: key === 'source' ? props.titles[0] : props.titles[1],
      items,
      visible,
      selectable,
      checked: [...checked[key]],
      allState,
    }
  })
)

// 資料或已選值從外面改掉時，清掉已經不在該側的勾選
watch(
  () => [props.modelValue, props.data],
  () => {
    const sets = { source: new Set(sourceItems.value.map((i) => i.key)), target: new Set(targetItems.value.map((i) => i.key)) }
    for (const side of ['source', 'target'] as const) {
      for (const key of [...checked[side]]) if (!sets[side].has(key)) checked[side].delete(key)
    }
  },
  { deep: true }
)

function toggleOne(side: Side, key: Key): void {
  if (checked[side].has(key)) checked[side].delete(key)
  else checked[side].add(key)
}

function toggleAll(side: Side): void {
  const info = sides.value.find((s) => s.key === side)!
  if (info.allState === 'all') info.selectable.forEach((item) => checked[side].delete(item.key))
  else info.selectable.forEach((item) => checked[side].add(item.key))
}

function move(to: Side): void {
  const from: Side = to === 'target' ? 'source' : 'target'
  // 只移動勾選且未停用的（停用的項目理論上勾不到，但 v-model 可能從外面塞進來）
  const moving = [...checked[from]].filter((k) => !byKey.value.get(k)?.disabled)
  if (!moving.length) return
  const movingSet = new Set(moving)
  let next: Key[]
  if (to === 'target') {
    next = props.targetOrder === 'push'
      ? [...props.modelValue, ...props.data.filter((i) => movingSet.has(i.key)).map((i) => i.key)]
      : props.data.filter((i) => movingSet.has(i.key) || props.modelValue.includes(i.key)).map((i) => i.key)
  } else {
    next = props.modelValue.filter((k) => !movingSet.has(k))
  }
  moving.forEach((k) => checked[from].delete(k))
  emit('update:modelValue', next)
  emit('change', next, to === 'target' ? 'right' : 'left', moving)
  const title = to === 'target' ? props.titles[1] : props.titles[0]
  liveMessage.value = `已將 ${moving.length} 項移到${title}`
}

defineExpose({
  clearChecked: () => {
    checked.source.clear()
    checked.target.clear()
  },
  clearQuery: () => {
    query.source = ''
    query.target = ''
  },
})
</script>
