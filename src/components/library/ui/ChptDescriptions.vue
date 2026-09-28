<template>
  <section class="w-full">
    <header v-if="props.title || $slots.title || $slots.extra" class="mb-3 flex items-center justify-between gap-3">
      <h3 class="text-base font-semibold text-content-primary">
        <slot name="title">{{ props.title }}</slot>
      </h3>
      <div v-if="$slots.extra" class="flex items-center gap-2">
        <slot name="extra"></slot>
      </div>
    </header>

    <!-- 外框只畫上、左兩邊，右、下由每一格自己的邊框補上 —— 否則外緣會是兩條線疊成 2px -->
    <dl
      class="chpt-descriptions grid"
      :class="props.bordered ? 'overflow-hidden rounded-lg border-t border-l border-stroke-light' : 'gap-x-6 gap-y-3'"
      :style="{ '--chpt-desc-cols': String(props.column) }"
    >
      <div
        v-for="(item, index) in props.items"
        :key="item.key ?? index"
        class="chpt-descriptions__item min-w-0"
        :class="[
          props.layout === 'vertical' ? 'flex flex-col gap-1' : 'flex',
          props.bordered ? 'border-b border-r border-stroke-light' : '',
        ]"
        :style="{ '--chpt-desc-span': String(Math.min(item.span ?? 1, props.column)) }"
      >
        <dt
          class="flex-shrink-0 text-content-secondary"
          :class="[
            textSize,
            props.bordered ? 'bg-surface-secondary px-3 py-2 font-medium' : '',
            props.layout === 'horizontal' && props.bordered ? 'border-r border-stroke-light' : '',
            props.layout === 'horizontal' && !props.bordered ? 'mr-1' : '',
          ]"
          :style="props.layout === 'horizontal' && props.labelWidth ? { width: props.labelWidth } : undefined"
        >
          {{ item.label }}<template v-if="props.layout === 'horizontal' && !props.bordered">：</template>
        </dt>
        <dd
          class="min-w-0 break-words text-content-primary"
          :class="[textSize, props.bordered ? 'px-3 py-2 flex-1' : 'flex-1']"
        >
          <slot name="value" :item="item" :index="index">
            {{ isEmpty(item.value) ? props.emptyText : item.value }}
          </slot>
        </dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * ChptDescriptions（CHPT 主題） - 描述清單
 *
 * 用途：呈現一筆資料的欄位與值 —— 工單明細、料號資訊、機台參數。
 * 比用 ChptTable 塞一列資料好讀，也比手刻 grid 一致。
 *
 * 語意上是 <dl> / <dt> / <dd>，螢幕閱讀器會把欄位名與值配對唸出。
 * 窄螢幕（< 640px）自動變成一欄。
 */

export interface DescriptionItem {
  /** 識別值（預設用索引） */
  key?: string | number
  label: string
  value?: string | number | null
  /** 佔幾欄（不超過 column） */
  span?: number
}

interface ChptDescriptionsProps {
  items: DescriptionItem[]
  /** 標題 */
  title?: string
  /** 一列幾欄 */
  column?: number
  /** 表格式外框（標籤有底色） */
  bordered?: boolean
  /** 標籤與值：左右並排或上下堆疊 */
  layout?: 'horizontal' | 'vertical'
  /** 左右並排時標籤的固定寬度（例如 '6rem'），讓值對齊 */
  labelWidth?: string
  /** 文字大小 */
  size?: 'sm' | 'md'
  /** 值是空的（null / undefined / ''）時顯示的文字 */
  emptyText?: string
}

const props = withDefaults(defineProps<ChptDescriptionsProps>(), {
  title: '',
  column: 3,
  bordered: false,
  layout: 'horizontal',
  labelWidth: '',
  size: 'sm',
  emptyText: '—',
})

const textSize = computed(() => (props.size === 'md' ? 'text-base' : 'text-sm'))

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === ''
}
</script>

<style scoped>
.chpt-descriptions {
  grid-template-columns: repeat(var(--chpt-desc-cols), minmax(0, 1fr));
}

.chpt-descriptions__item {
  grid-column: span var(--chpt-desc-span) / span var(--chpt-desc-span);
}

/* 窄螢幕一律一欄：三欄的標籤 + 值塞在手機寬度裡會擠成一個字一行 */
@media (max-width: 639px) {
  .chpt-descriptions {
    grid-template-columns: minmax(0, 1fr);
  }
  .chpt-descriptions__item {
    grid-column: auto;
  }
}
</style>
