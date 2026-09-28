<template>
  <div ref="root" class="relative flex flex-col gap-1" :class="props.fullWidth ? 'w-full' : 'w-fit'" @focusout="onFocusOut">
    <label v-if="props.label" :id="labelId" :for="id" class="text-sm text-content-secondary whitespace-nowrap">{{ props.label }}</label>

    <div class="relative flex items-center" :class="props.fullWidth ? 'w-full' : 'self-start'">
      <button
        :id="id"
        ref="trigger"
        type="button"
        aria-haspopup="dialog"
        :aria-expanded="isOpen"
        :aria-controls="isOpen ? panelId : undefined"
        :aria-labelledby="buttonLabelledBy"
        :aria-invalid="invalid ? 'true' : undefined"
        :aria-describedby="describedBy"
        :aria-required="required || undefined"
        :disabled="props.disabled"
        class="flex min-h-control-sm min-w-[14rem] items-center gap-2 rounded-md border py-1 pl-3 pr-8 text-left text-sm shadow-sm transition-colors focus:outline-none focus:ring-1"
        :class="[
          props.fullWidth ? 'w-full' : '',
          invalid
            ? 'border-danger focus:border-danger focus:ring-danger'
            : 'border-stroke-default focus:border-stroke-focus focus:ring-stroke-focus',
          props.disabled ? 'cursor-not-allowed bg-surface-tertiary text-content-disabled' : 'bg-surface-primary',
        ]"
        @click="toggle"
        @keydown="onTriggerKeydown"
      >
        <span :id="valueId" class="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <template v-if="props.multiple && displayNodes.length">
            <span
              v-for="node in shownTags"
              :key="node.key"
              class="inline-flex max-w-[10rem] items-center truncate rounded bg-surface-tertiary px-1.5 text-xs leading-5 text-content-primary"
            >{{ node.label }}</span>
            <span v-if="hiddenCount" class="text-xs text-content-tertiary">+{{ hiddenCount }}</span>
          </template>
          <span v-else-if="!props.multiple && singleText" class="truncate" :class="props.disabled ? '' : 'text-content-primary'">{{ singleText }}</span>
          <span v-else class="truncate text-content-tertiary">{{ props.placeholder }}</span>
        </span>
      </button>
      <span class="pointer-events-none absolute right-2 inline-flex text-content-tertiary" aria-hidden="true">
        <ChptIcon v-if="!showClear" :size="16" color="current" class="transition-transform" :class="isOpen ? 'rotate-180' : ''">expand_more</ChptIcon>
      </span>
      <button
        v-if="showClear"
        type="button"
        aria-label="清除"
        class="absolute right-1.5 inline-flex h-control-xs min-w-control-xs items-center justify-center rounded text-content-disabled hover:text-content-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
        @click="clear"
      >
        <ChptIcon :size="16" color="current">close</ChptIcon>
      </button>
    </div>

    <div
      v-if="isOpen"
      :id="panelId"
      role="dialog"
      :aria-label="props.label ? `選擇${props.label}` : '選擇項目'"
      class="absolute left-0 top-full z-dropdown mt-1 flex w-full min-w-[16rem] flex-col rounded-lg border border-stroke-light bg-surface-primary shadow-lg"
      @keydown.esc.stop.prevent="close(true)"
    >
      <div v-if="props.filterable" class="border-b border-stroke-light p-2">
        <div class="relative flex items-center">
          <ChptIcon :size="16" class="pointer-events-none absolute left-2">search</ChptIcon>
          <input
            ref="search"
            v-model="query"
            type="search"
            :placeholder="props.filterPlaceholder"
            aria-label="搜尋"
            class="h-control-sm w-full rounded-md border border-stroke-default bg-surface-primary pl-8 pr-2 text-sm text-content-primary focus:border-stroke-focus focus:outline-none focus:ring-1 focus:ring-stroke-focus"
            @keydown.down.prevent="tree?.focus()"
          />
        </div>
      </div>
      <div class="overflow-auto p-1" :style="{ maxHeight: props.panelHeight }">
        <ChptTree
          ref="tree"
          :data="props.data"
          :model-value="props.multiple ? null : (props.modelValue as Key | null)"
          :selectable="!props.multiple"
          :checkable="props.multiple"
          :checked="props.multiple ? (props.modelValue as Key[] | null) ?? [] : []"
          :filter-text="query"
          :default-expand-all="props.defaultExpandAll"
          :expanded="expanded"
          :aria-label="props.label || '選項'"
          size="sm"
          @update:expanded="expanded = $event"
          @select="onSelect"
          @update:checked="onChecked"
        />
      </div>
    </div>

    <p v-if="props.errorText" :id="errorId" role="alert" class="text-xs text-danger">{{ props.errorText }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef } from 'vue'
import { onClickOutside } from '@vueuse/core'
import ChptIcon from './ChptIcon.vue'
import ChptTree, { type TreeNode } from './ChptTree.vue'
import { useFormField } from '@/components/library/shared/formContext'

/**
 * ChptTreeSelect（CHPT 主題） - 樹狀下拉選擇
 *
 * 選項有階層、又想收在一個欄位裡時用（部門、廠區 / 產線、料號分類）。
 * 裡面就是 ChptTree，所以鍵盤操作、搜尋高亮、父子三態勾選都一樣。
 *
 * - 單選：v-model 是節點 key；選到就關閉
 * - multiple：v-model 是勾選的 key 陣列（與 ChptTree 的 checked 相同：完整勾選的節點，含父節點）
 *   欄位上顯示的標籤由 displayStrategy 決定：
 *     parent（預設）整組都勾了就只顯示父節點；child 只顯示葉節點；all 全部顯示
 * - showPath：單選時顯示整條路徑（FAB-A / SMT / Line 1）
 *
 * 觸發鈕名稱 = 標籤 + 目前的值；面板是非模態 dialog，Escape 關閉並歸還焦點，
 * 搜尋框按 ↓ 進到樹裡。
 */

type Key = string | number

interface ChptTreeSelectProps {
  data: TreeNode[]
  modelValue?: Key | Key[] | null
  multiple?: boolean
  displayStrategy?: 'parent' | 'child' | 'all'
  /** 多選時欄位上最多顯示幾個標籤 */
  maxTagCount?: number
  showPath?: boolean
  separator?: string
  filterable?: boolean
  filterPlaceholder?: string
  defaultExpandAll?: boolean
  panelHeight?: string
  label?: string
  placeholder?: string
  clearable?: boolean
  disabled?: boolean
  fullWidth?: boolean
  errorText?: string
}

const props = withDefaults(defineProps<ChptTreeSelectProps>(), {
  modelValue: null,
  multiple: false,
  displayStrategy: 'parent',
  maxTagCount: 3,
  showPath: false,
  separator: ' / ',
  filterable: false,
  filterPlaceholder: '搜尋',
  defaultExpandAll: false,
  panelHeight: '18rem',
  label: '',
  placeholder: '請選擇',
  clearable: false,
  disabled: false,
  fullWidth: false,
  errorText: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Key | Key[] | null): void
  (e: 'change', value: Key | Key[] | null): void
}>()

const { id, errorId, invalid, describedBy, required, labelledBy } = useFormField(() => props.errorText)
const uid = useId()
const panelId = `${uid}-panel`
const labelId = `${uid}-label`
const valueId = `${uid}-value`
const buttonLabelledBy = computed(() =>
  [labelledBy.value ?? (props.label ? labelId : undefined), valueId].filter(Boolean).join(' ')
)

const root = useTemplateRef<HTMLElement>('root')
const trigger = useTemplateRef<HTMLButtonElement>('trigger')
const search = useTemplateRef<HTMLInputElement>('search')
const tree = useTemplateRef<{ focus: () => void }>('tree')

const isOpen = ref(false)
const query = ref('')
/** 展開狀態留在這裡：關掉再打開時維持使用者上次展開的樣子 */
const expanded = ref<Key[] | undefined>(undefined)

// ---- 索引 ----

const index = computed(() => {
  const byKey = new Map<Key, TreeNode>()
  const parent = new Map<Key, Key | null>()
  const walk = (nodes: TreeNode[], p: Key | null) => {
    for (const n of nodes) {
      byKey.set(n.key, n)
      parent.set(n.key, p)
      if (n.children?.length) walk(n.children, n.key)
    }
  }
  walk(props.data, null)
  return { byKey, parent }
})

function pathOf(key: Key): TreeNode[] {
  const out: TreeNode[] = []
  let cur: Key | null | undefined = key
  while (cur !== null && cur !== undefined) {
    const node = index.value.byKey.get(cur)
    if (!node) break
    out.unshift(node)
    cur = index.value.parent.get(cur)
  }
  return out
}

// ---- 顯示 ----

const selectedKeys = computed<Key[]>(() => {
  const v = props.modelValue
  if (v === null || v === undefined) return []
  return Array.isArray(v) ? v : [v]
})

const singleText = computed(() => {
  const key = selectedKeys.value[0]
  if (key === undefined) return ''
  const path = pathOf(key)
  if (!path.length) return String(key)
  return props.showPath ? path.map((n) => n.label).join(props.separator) : path[path.length - 1].label
})

const displayNodes = computed<TreeNode[]>(() => {
  const set = new Set(selectedKeys.value)
  const nodes = selectedKeys.value.map((k) => index.value.byKey.get(k)).filter((n): n is TreeNode => !!n)
  if (props.displayStrategy === 'child') return nodes.filter((n) => !n.children?.length)
  if (props.displayStrategy === 'parent') {
    // 祖先已經整個勾選的節點不重複顯示
    return nodes.filter((n) => {
      let p = index.value.parent.get(n.key)
      while (p !== null && p !== undefined) {
        if (set.has(p)) return false
        p = index.value.parent.get(p)
      }
      return true
    })
  }
  return nodes
})

const shownTags = computed(() => displayNodes.value.slice(0, props.maxTagCount))
const hiddenCount = computed(() => Math.max(0, displayNodes.value.length - props.maxTagCount))
const showClear = computed(() => props.clearable && !props.disabled && selectedKeys.value.length > 0)

// ---- 開關 ----

async function open(): Promise<void> {
  if (props.disabled || isOpen.value) return
  isOpen.value = true
  // 第一次打開：展開到已選的節點
  if (expanded.value === undefined) {
    const ancestors = new Set<Key>()
    for (const k of selectedKeys.value) pathOf(k).slice(0, -1).forEach((n) => ancestors.add(n.key))
    expanded.value = props.defaultExpandAll ? undefined : [...ancestors]
  }
  await nextTick()
  if (props.filterable) search.value?.focus()
  else tree.value?.focus()
}

function close(returnFocus = false): void {
  if (!isOpen.value) return
  isOpen.value = false
  query.value = ''
  if (returnFocus) trigger.value?.focus()
}

function toggle(): void {
  if (isOpen.value) close()
  else open()
}

function commit(value: Key | Key[] | null): void {
  emit('update:modelValue', value)
  emit('change', value)
}

function onSelect(node: TreeNode): void {
  if (props.multiple || node.disabled) return
  commit(node.key)
  close(true)
}

function onChecked(keys: Key[]): void {
  if (props.multiple) commit(keys)
}

function clear(): void {
  commit(props.multiple ? [] : null)
  trigger.value?.focus()
}

function onTriggerKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    open()
  }
}

function onFocusOut(event: FocusEvent): void {
  const next = event.relatedTarget as Node | null
  if (next && !root.value?.contains(next)) close()
}

onClickOutside(root, () => close())

defineExpose({ open, close: () => close() })
</script>
