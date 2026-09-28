<template>
  <div ref="root" class="relative flex flex-col gap-1" :class="props.fullWidth ? 'w-full' : 'w-fit'">
    <label v-if="props.label" :id="labelId" :for="id" class="text-sm text-content-secondary whitespace-nowrap">
      {{ props.label }}
    </label>

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
        class="flex min-w-[12rem] items-center gap-2 rounded-md border text-left shadow-sm transition-colors focus:outline-none focus:ring-1"
        :class="[
          sizeClass,
          props.fullWidth ? 'w-full' : '',
          invalid
            ? 'border-danger focus:border-danger focus:ring-danger'
            : 'border-stroke-default focus:border-stroke-focus focus:ring-stroke-focus',
          props.disabled ? 'cursor-not-allowed bg-surface-tertiary text-content-disabled' : 'bg-surface-primary',
        ]"
        @click="toggle"
        @keydown="onTriggerKeydown"
      >
        <span :id="valueId" class="flex-1 truncate" :class="displayText ? (props.disabled ? '' : 'text-content-primary') : 'text-content-tertiary'">
          {{ displayText || props.placeholder }}
        </span>
        <ChptIcon
          :size="16"
          color="current"
          class="shrink-0 text-content-tertiary transition-transform"
          :class="[isOpen ? 'rotate-180' : '', showClear ? 'invisible' : '']"
        >expand_more</ChptIcon>
      </button>

      <button
        v-if="showClear"
        type="button"
        aria-label="清除"
        class="absolute right-2 inline-flex text-content-disabled hover:text-content-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus rounded"
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
      class="absolute left-0 top-full z-dropdown mt-1 flex max-w-[calc(100vw-2rem)] overflow-x-auto rounded-lg border border-stroke-light bg-surface-primary shadow-lg"
      @keydown="onPanelKeydown"
    >
      <ul
        v-for="(column, level) in columns"
        :key="level"
        role="listbox"
        :aria-label="level === 0 ? props.label || '第 1 層' : columnLabel(level)"
        class="max-h-64 w-44 shrink-0 overflow-auto border-r border-stroke-light py-1 last:border-r-0"
      >
        <li
          v-for="(node, index) in column.nodes"
          :key="String(node.value)"
          :ref="(el) => setOptionRef(level, index, el as HTMLElement | null)"
          role="option"
          :tabindex="focusLevel === level && focusIndex === index ? 0 : -1"
          :aria-selected="activePath[level] === node.value"
          :aria-disabled="node.disabled || undefined"
          class="flex h-control-sm cursor-pointer items-center gap-2 px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus"
          :class="
            node.disabled
              ? 'cursor-not-allowed text-content-disabled'
              : activePath[level] === node.value
                ? 'bg-accent-subtle font-medium text-accent-on-subtle'
                : 'text-content-primary hover:bg-surface-tertiary'
          "
          @click="onOptionClick(level, index)"
          @mouseenter="onOptionHover(level, index)"
        >
          <span class="flex-1 truncate">
            <slot name="option" :node="node" :level="level">{{ node.label }}</slot>
          </span>
          <ChptIcon
            v-if="loadingKey === keyOf([...activePath.slice(0, level), node.value])"
            :size="16"
            color="current"
            class="animate-spin"
          >progress_activity</ChptIcon>
          <template v-else-if="!isLeaf(node, level)">
            <ChptIcon :size="16" color="current">chevron_right</ChptIcon>
            <span class="sr-only">（有下一層）</span>
          </template>
        </li>
        <li v-if="!column.nodes.length" role="presentation" class="px-3 py-1.5 text-sm text-content-tertiary">
          {{ props.emptyText }}
        </li>
      </ul>
    </div>

    <p v-if="props.errorText" :id="errorId" role="alert" class="text-xs text-danger">{{ props.errorText }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, shallowReactive, useId, useTemplateRef } from 'vue'
import { onClickOutside } from '@vueuse/core'
import ChptIcon from './ChptIcon.vue'
import { useFormField } from '@/components/library/shared/formContext'
import type { ComponentSize } from '@/components/library/shared/types/ui.types'

/**
 * ChptCascader（CHPT 主題） - 級聯選擇
 *
 * 有層級的選項一欄一欄往右展開選：廠區 → 產線 → 機台、縣市 → 區 → 里。
 * v-model 是整條路徑的值陣列（['fab-a', 'smt', 'l1']），畫面顯示「FAB-A / SMT / Line 1」。
 *
 * - changeOnSelect：中間層也能當成答案（選到「SMT」就停）
 * - expandTrigger="hover"：滑過就展開下一層
 * - load(node)：子層用到才去查（節點沒有 children 且沒標 leaf: true 時視為還有下一層）
 *
 * 無障礙：
 *   - 觸發鈕開啟一個非模態 dialog，每一欄是一個 listbox（第 2 欄起以上一層的名稱命名）
 *   - ↑ ↓ 在同一欄移動、→ / Enter 進入下一層、← 回上一層、Home / End、Escape 關閉並歸還焦點
 *   - 有下一層的選項附帶「（有下一層）」給螢幕閱讀器
 */

export interface CascaderOption {
  value: string | number
  label: string
  children?: CascaderOption[]
  disabled?: boolean
  /** 明確標示為葉節點（搭配 load 時用：沒有這個標記的節點都會嘗試載入下一層） */
  leaf?: boolean
  [key: string]: unknown
}

type Value = string | number

interface ChptCascaderProps {
  /** v-model：路徑值陣列 */
  modelValue?: Value[] | null
  options?: CascaderOption[]
  label?: string
  placeholder?: string
  /** 顯示時各層之間的分隔 */
  separator?: string
  /** 顯示整條路徑；false 時只顯示最後一層 */
  showAllLevels?: boolean
  /** 中間層也可以選 */
  changeOnSelect?: boolean
  /** 展開下一層的方式 */
  expandTrigger?: 'click' | 'hover'
  /** 延遲載入子層 */
  load?: (node: CascaderOption, path: CascaderOption[]) => Promise<CascaderOption[]>
  clearable?: boolean
  disabled?: boolean
  size?: ComponentSize
  fullWidth?: boolean
  errorText?: string
  emptyText?: string
}

const props = withDefaults(defineProps<ChptCascaderProps>(), {
  modelValue: null,
  options: () => [],
  label: '',
  placeholder: '請選擇',
  separator: ' / ',
  showAllLevels: true,
  changeOnSelect: false,
  expandTrigger: 'click',
  load: undefined,
  clearable: false,
  disabled: false,
  size: 'sm',
  fullWidth: false,
  errorText: '',
  emptyText: '沒有資料',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Value[] | null): void
  (e: 'change', value: Value[] | null, nodes: CascaderOption[]): void
}>()

const { id, errorId, invalid, describedBy, required, labelledBy } = useFormField(() => props.errorText)
const uid = useId()
const panelId = `${uid}-panel`
const labelId = `${uid}-label`
const valueId = `${uid}-value`
/**
 * 觸發鈕的名稱 = 標籤 + 目前的值（「機台 FAB-A / SMT / SMT-01」）。
 * ⚠️ 只靠 <label for> 的話，按鈕的名稱會被標籤整個蓋掉，螢幕閱讀器只唸「機台，按鈕」，聽不到選了什麼。
 */
const buttonLabelledBy = computed(() =>
  [labelledBy.value ?? (props.label ? labelId : undefined), valueId].filter(Boolean).join(' ')
)

const root = useTemplateRef<HTMLElement>('root')
const trigger = useTemplateRef<HTMLButtonElement>('trigger')

const isOpen = ref(false)
/** 面板裡目前展開的路徑（還沒確定之前可以跟 modelValue 不同） */
const activePath = ref<Value[]>([])
const focusLevel = ref(0)
const focusIndex = ref(0)

// ---- 延遲載入 ----

const keyOf = (path: Value[]) => JSON.stringify(path)
/** load 回來的子層，以路徑為 key */
const loaded = shallowReactive(new Map<string, CascaderOption[]>())
const loadingKey = ref<string | null>(null)

function childrenOf(node: CascaderOption, path: Value[]): CascaderOption[] | undefined {
  return node.children ?? loaded.get(keyOf(path))
}

function isLeaf(node: CascaderOption, level: number): boolean {
  if (node.leaf !== undefined) return node.leaf
  const path = [...activePath.value.slice(0, level), node.value]
  const children = childrenOf(node, path)
  if (children) return children.length === 0
  return !props.load
}

/** 從根依序走訪路徑，回傳每一層的節點（走不到的地方就停） */
function resolve(path: Value[]): CascaderOption[] {
  const nodes: CascaderOption[] = []
  let list: CascaderOption[] | undefined = props.options
  for (let i = 0; i < path.length && list; i++) {
    const node: CascaderOption | undefined = list.find((n) => n.value === path[i])
    if (!node) break
    nodes.push(node)
    list = childrenOf(node, path.slice(0, i + 1))
  }
  return nodes
}

const columns = computed(() => {
  const cols: { nodes: CascaderOption[] }[] = [{ nodes: props.options }]
  const nodes = resolve(activePath.value)
  nodes.forEach((node, i) => {
    const children = childrenOf(node, activePath.value.slice(0, i + 1))
    if (children && children.length) cols.push({ nodes: children })
  })
  return cols
})

function columnLabel(level: number): string {
  return resolve(activePath.value)[level - 1]?.label ?? `第 ${level + 1} 層`
}

const selectedNodes = computed(() => resolve(props.modelValue ?? []))

const displayText = computed(() => {
  const path = props.modelValue ?? []
  if (!path.length) return ''
  const nodes = selectedNodes.value
  // 延遲載入的子層還沒載過時，找不到的部分直接顯示值本身
  const labels = path.map((v, i) => nodes[i]?.label ?? String(v))
  return props.showAllLevels ? labels.join(props.separator) : labels[labels.length - 1]
})

const showClear = computed(() => props.clearable && !props.disabled && !!props.modelValue?.length)

// ---- 焦點 ----

const optionRefs = new Map<string, HTMLElement>()
function setOptionRef(level: number, index: number, el: HTMLElement | null): void {
  const key = `${level}:${index}`
  if (el) optionRefs.set(key, el)
  else optionRefs.delete(key)
}

async function focusOption(level: number, index: number): Promise<void> {
  focusLevel.value = level
  focusIndex.value = index
  await nextTick()
  optionRefs.get(`${level}:${index}`)?.focus()
}

function enabledIndexes(level: number): number[] {
  return (columns.value[level]?.nodes ?? []).flatMap((n, i) => (n.disabled ? [] : [i]))
}

// ---- 開關 ----

async function open(): Promise<void> {
  if (props.disabled || isOpen.value) return
  // 從目前的值開始（只保留還對得上選項的那一段）
  const nodes = resolve(props.modelValue ?? [])
  activePath.value = nodes.map((n) => n.value)
  isOpen.value = true
  const level = Math.max(0, nodes.length - 1)
  const column = columns.value[level]?.nodes ?? []
  const index = nodes.length ? column.findIndex((n) => n.value === nodes[level].value) : enabledIndexes(0)[0] ?? 0
  await focusOption(level, Math.max(0, index))
}

function close(returnFocus = false): void {
  if (!isOpen.value) return
  isOpen.value = false
  if (returnFocus) trigger.value?.focus()
}

function toggle(): void {
  if (isOpen.value) close()
  else open()
}

function commit(path: Value[]): void {
  const value = path.length ? [...path] : null
  emit('update:modelValue', value)
  emit('change', value, resolve(path))
}

function clear(): void {
  commit([])
  trigger.value?.focus()
}

// ---- 展開 / 選取 ----

/** 展開某一欄的某個節點；回傳是否有下一層 */
async function expand(level: number, index: number): Promise<boolean> {
  const node = columns.value[level]?.nodes[index]
  if (!node || node.disabled) return false
  const path = [...activePath.value.slice(0, level), node.value]
  activePath.value = path
  focusLevel.value = level
  focusIndex.value = index

  if (!node.children && props.load && node.leaf !== true && !loaded.has(keyOf(path))) {
    const key = keyOf(path)
    loadingKey.value = key
    try {
      const children = await props.load(node, resolve(path))
      loaded.set(key, children ?? [])
    } catch {
      loaded.set(key, [])
    } finally {
      if (loadingKey.value === key) loadingKey.value = null
    }
    // 載入期間使用者可能已經改點別的
    if (keyOf(activePath.value) !== key) return false
  }
  return !isLeaf(node, level)
}

async function activate(level: number, index: number, viaKeyboard: boolean): Promise<void> {
  const hasChildren = await expand(level, index)
  if (hasChildren) {
    if (props.changeOnSelect) commit(activePath.value)
    if (viaKeyboard) {
      const next = enabledIndexes(level + 1)
      if (next.length) await focusOption(level + 1, next[0])
    }
    return
  }
  const node = columns.value[level]?.nodes[index]
  if (!node || node.disabled || activePath.value[level] !== node.value) return
  commit(activePath.value)
  close(true)
}

function onOptionClick(level: number, index: number): void {
  activate(level, index, false)
}

function onOptionHover(level: number, index: number): void {
  if (props.expandTrigger !== 'hover') return
  const node = columns.value[level]?.nodes[index]
  if (!node || node.disabled || isLeaf(node, level)) return
  expand(level, index)
}

// ---- 鍵盤 ----

function onTriggerKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    open()
  }
}

function moveWithin(dir: 1 | -1): void {
  const enabled = enabledIndexes(focusLevel.value)
  if (!enabled.length) return
  const pos = enabled.indexOf(focusIndex.value)
  const next = pos === -1 ? enabled[0] : enabled[(pos + dir + enabled.length) % enabled.length]
  focusOption(focusLevel.value, next)
}

function onPanelKeydown(event: KeyboardEvent): void {
  const level = focusLevel.value
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      moveWithin(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      moveWithin(-1)
      break
    case 'Home':
    case 'End': {
      event.preventDefault()
      const enabled = enabledIndexes(level)
      if (enabled.length) focusOption(level, event.key === 'Home' ? enabled[0] : enabled[enabled.length - 1])
      break
    }
    case 'ArrowRight': {
      event.preventDefault()
      const node = columns.value[level]?.nodes[focusIndex.value]
      if (node && !node.disabled && !isLeaf(node, level)) activate(level, focusIndex.value, true)
      break
    }
    case 'ArrowLeft':
      event.preventDefault()
      if (level > 0) {
        const parentIndex = columns.value[level - 1].nodes.findIndex((n) => n.value === activePath.value[level - 1])
        activePath.value = activePath.value.slice(0, level)
        focusOption(level - 1, Math.max(0, parentIndex))
      }
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      activate(level, focusIndex.value, true)
      break
    case 'Escape':
      event.preventDefault()
      event.stopPropagation()
      close(true)
      break
    case 'Tab':
      close()
      break
  }
}

onClickOutside(root, () => close())

const sizeClass = computed(() => {
  const map: Record<ComponentSize, string> = {
    xs: 'text-xs h-control-xs px-2',
    sm: 'text-sm h-control-sm px-3',
    md: 'text-base h-control-md px-4',
    lg: 'text-lg h-control-lg px-6',
    xl: 'text-xl h-control-xl px-5',
  }
  return map[props.size]
})

defineExpose({ open, close: () => close(), getCheckedNodes: () => selectedNodes.value })
</script>
