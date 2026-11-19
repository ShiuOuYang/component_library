<template>
  <div class="chpt-form-list flex flex-col gap-2" role="group" :aria-label="props.label || undefined">
    <div v-if="props.label || $slots.header" class="flex items-center justify-between">
      <slot name="header" :count="items.length">
        <span class="text-sm font-medium text-content-primary">{{ props.label }}</span>
      </slot>
      <span v-if="props.max !== undefined" class="text-xs text-content-tertiary">{{ items.length }} / {{ props.max }}</span>
    </div>

    <p v-if="!items.length" class="rounded-md border border-dashed border-stroke-default px-3 py-4 text-center text-sm text-content-tertiary">
      <slot name="empty">{{ props.emptyText ?? t.formList.empty }}</slot>
    </p>

    <ol v-else class="flex flex-col gap-2">
      <li
        v-for="(item, index) in items"
        :key="keyOf(item, index)"
        ref="rows"
        class="chpt-form-list-item flex items-start gap-2 rounded-md border border-stroke-light bg-surface-primary p-2"
        role="group"
        :aria-label="t.formList.item(props.label || props.itemLabel || '', index + 1)"
      >
        <span v-if="props.showIndex" class="mt-1.5 w-6 shrink-0 text-right text-xs tabular-nums text-content-tertiary" aria-hidden="true">{{ index + 1 }}</span>

        <div class="min-w-0 flex-1">
          <slot
            :item="item"
            :index="index"
            :path="(field?: string) => pathOf(index, field)"
            :remove="() => remove(index)"
            :move-up="() => move(index, -1)"
            :move-down="() => move(index, 1)"
            :can-remove="canRemove"
          ></slot>
        </div>

        <div class="flex shrink-0 items-center gap-0.5">
          <template v-if="props.sortable">
            <button
              type="button"
              class="list-btn"
              :disabled="props.disabled || index === 0"
              :aria-label="t.formList.moveUp(index + 1)"
              :title="t.formList.moveUp(index + 1)"
              @click="move(index, -1)"
            >
              <ChptIcon :size="18" color="current">arrow_upward</ChptIcon>
            </button>
            <button
              type="button"
              class="list-btn"
              :disabled="props.disabled || index === items.length - 1"
              :aria-label="t.formList.moveDown(index + 1)"
              :title="t.formList.moveDown(index + 1)"
              @click="move(index, 1)"
            >
              <ChptIcon :size="18" color="current">arrow_downward</ChptIcon>
            </button>
          </template>
          <button
            type="button"
            class="list-btn hover:!text-danger"
            :disabled="props.disabled || !canRemove"
            :aria-label="t.formList.remove(index + 1)"
            :title="t.formList.remove(index + 1)"
            @click="remove(index)"
          >
            <ChptIcon :size="18" color="current">delete</ChptIcon>
          </button>
        </div>
      </li>
    </ol>

    <div class="flex items-center gap-2">
      <ChptButton size="sm" is-outline :disabled="props.disabled || !canAdd" @click="add()">
        <ChptIcon :size="16" color="current">add</ChptIcon>
        {{ props.addText ?? t.formList.add }}
      </ChptButton>
      <span v-if="!canAdd && props.max !== undefined" class="text-xs text-content-tertiary">{{ t.formList.max(props.max) }}</span>
    </div>

    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import ChptButton from './ChptButton.vue'
import ChptIcon from './ChptIcon.vue'
import { useLocale } from '../shared/config'

/**
 * ChptFormList（CHPT 主題） - 動態增減的表單列
 *
 * 一筆單據裡有好幾列要輸入的情況：檢驗單的多筆量測值、工單的多個料號、出貨單的多個箱號…
 * 綁定一個陣列（v-model），每一列的內容由預設插槽決定。
 *
 * 搭配 ChptForm 驗證：插槽的 path('value') 給出這一列欄位的路徑（例如 measures.0.value），
 * 放在 <ChptFormItem :prop="path('value')"> 上；規則在 ChptForm 寫一次 'measures.*.value' 就套用到每一列。
 *
 * - min / max 限制列數（刪到 min 時刪除鈕停用、到 max 時新增鈕停用）
 * - 新增後聚焦到新的一列；新增 / 刪除以 aria-live 念出來
 * - sortable：每一列有上移 / 下移鈕
 */

export interface ChptFormListProps<T> {
  modelValue: T[]
  /** 陣列在 ChptForm model 裡的路徑（例如 'measures'）；給插槽的 path() 用 */
  prop?: string
  /** 整組的標題（也是螢幕閱讀器念的群組名稱） */
  label?: string
  /** 每一列的名稱（沒有 label 時用來念「量測 第 2 筆」） */
  itemLabel?: string
  /** 新增一列時的初始值；不給時為空物件 */
  createItem?: () => T
  /** 最少幾列（刪到這個數量時不能再刪） */
  min?: number
  /** 最多幾列 */
  max?: number
  /** 顯示上移 / 下移鈕 */
  sortable?: boolean
  /** 每列左側顯示序號 */
  showIndex?: boolean
  disabled?: boolean
  addText?: string
  emptyText?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptFormListProps<T>>(), {
  prop: '',
  label: '',
  itemLabel: '',
  createItem: undefined,
  min: 0,
  max: undefined,
  sortable: false,
  showIndex: true,
  disabled: false,
  addText: undefined,
  emptyText: undefined,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: T[]): void
  (e: 'add', item: T, index: number): void
  (e: 'remove', item: T, index: number): void
}>()

const items = computed(() => props.modelValue ?? [])
const canAdd = computed(() => props.max === undefined || items.value.length < props.max)
const canRemove = computed(() => items.value.length > props.min)
const announcement = ref('')
const rows = useTemplateRef<HTMLElement[]>('rows')

/**
 * 每一列穩定的 key：物件用 WeakMap 記住第一次看到時給的編號 ——
 * 用索引當 key 的話，刪掉中間一列後，下面每一列的輸入框（含游標、IME 組字）都會被「換人」
 */
const ids = new WeakMap<object, number>()
let seq = 0
function keyOf(item: T, index: number): number | string {
  if (item && typeof item === 'object') {
    let id = ids.get(item as object)
    if (id === undefined) ids.set(item as object, (id = ++seq))
    return id
  }
  return `i${index}`
}

function pathOf(index: number, field?: string): string {
  const base = props.prop ? `${props.prop}.${index}` : String(index)
  return field ? `${base}.${field}` : base
}

function newItem(): T {
  if (props.createItem) return props.createItem()
  return {} as T
}

/** 新增一列（不給 item 時用 createItem）；回傳新的索引，超過 max 時回傳 -1 */
async function add(item?: T, at?: number): Promise<number> {
  if (props.disabled || !canAdd.value) return -1
  const value = item ?? newItem()
  const next = [...items.value]
  const index = at === undefined ? next.length : Math.max(0, Math.min(at, next.length))
  next.splice(index, 0, value)
  emit('update:modelValue', next)
  emit('add', value, index)
  announcement.value = t.value.formList.added(index + 1)
  // 等父層把新的陣列傳回來、新的一列畫出來，再聚焦到它的第一個輸入框
  await nextTick()
  const row = rows.value?.[index]
  row?.querySelector<HTMLElement>('input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus()
  return index
}

function remove(index: number): void {
  if (props.disabled || !canRemove.value || index < 0 || index >= items.value.length) return
  const next = [...items.value]
  const [removed] = next.splice(index, 1)
  emit('update:modelValue', next)
  emit('remove', removed, index)
  announcement.value = t.value.formList.removed(index + 1)
}

function move(index: number, delta: number): void {
  const to = index + delta
  if (props.disabled || to < 0 || to >= items.value.length) return
  const next = [...items.value]
  const [moved] = next.splice(index, 1)
  next.splice(to, 0, moved)
  emit('update:modelValue', next)
  announcement.value = t.value.formList.moved(index + 1, to + 1)
}

defineExpose({ add, remove, move })
</script>

<style scoped>
.list-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.375rem;
  color: rgb(var(--t-content-tertiary));
}

.list-btn:hover:not(:disabled) {
  background-color: rgb(var(--t-surface-tertiary));
  color: rgb(var(--t-content-primary));
}

.list-btn:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.list-btn:focus-visible {
  outline: 2px solid rgb(var(--t-stroke-focus));
  outline-offset: -2px;
}
</style>
