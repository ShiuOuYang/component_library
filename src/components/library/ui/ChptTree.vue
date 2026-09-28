<template>
  <div
    ref="root"
    role="tree"
    :aria-label="props.ariaLabel || undefined"
    :aria-multiselectable="props.checkable ? 'true' : undefined"
    class="flex flex-col text-sm"
    @keydown="onKeydown"
  >
    <div
      v-for="row in rows"
      :key="row.node.key"
      :ref="(el) => setRowRef(row.node.key, el)"
      role="treeitem"
      :aria-level="row.level"
      :aria-setsize="row.setSize"
      :aria-posinset="row.posInSet"
      :aria-expanded="row.hasChildren ? isExpanded(row.node.key) : undefined"
      :aria-selected="props.selectable && !props.checkable ? row.node.key === props.modelValue : undefined"
      :aria-checked="props.checkable ? ariaChecked(row.node) : undefined"
      :aria-disabled="row.node.disabled ? 'true' : undefined"
      :tabindex="row.node.key === focusKey ? 0 : -1"
      class="group flex items-center gap-1 rounded-md pr-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus"
      :class="[
        rowHeight,
        row.node.disabled
          ? 'cursor-not-allowed text-content-disabled'
          : props.selectable && row.node.key === props.modelValue && !props.checkable
            ? 'cursor-pointer bg-accent-subtle text-accent-on-subtle'
            : 'cursor-pointer text-content-primary hover:bg-surface-tertiary',
      ]"
      :style="{ paddingLeft: `${(row.level - 1) * props.indent + 4}px` }"
      @click="onRowClick(row.node)"
      @focus="focusKey = row.node.key"
    >
      <!-- 展開箭頭（葉節點留同寬空位，文字才會對齊） -->
      <span
        class="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-content-tertiary"
        :class="row.hasChildren ? 'hover:bg-surface-muted hover:text-content-primary' : ''"
        aria-hidden="true"
        @click.stop="row.hasChildren && toggleExpand(row.node.key)"
      >
        <ChptIcon
          v-if="row.hasChildren"
          :size="18"
          color="current"
          class="transition-transform duration-150"
          :class="isExpanded(row.node.key) ? 'rotate-90' : ''"
        >chevron_right</ChptIcon>
      </span>

      <!-- 勾選框（純視覺；狀態由 treeitem 的 aria-checked 表達，點整列即可切換） -->
      <span
        v-if="props.checkable"
        class="inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors"
        :class="checkboxClass(row.node)"
        aria-hidden="true"
        @click.stop="toggleCheck(row.node)"
      >
        <ChptIcon v-if="checkState(row.node) === 'checked'" :size="14" :weight="600" color="current">check</ChptIcon>
        <span v-else-if="checkState(row.node) === 'mixed'" class="h-0.5 w-2 rounded bg-current"></span>
      </span>

      <ChptIcon v-if="row.node.icon" :size="16" color="current" class="flex-shrink-0 opacity-70">{{ row.node.icon }}</ChptIcon>

      <span class="min-w-0 flex-1 truncate">
        <slot name="label" :node="row.node" :level="row.level">
          <template v-for="(part, i) in highlight(row.node.label)" :key="i">
            <mark v-if="part.match" class="rounded-sm bg-warning-subtle px-0.5 text-warning-on-subtle">{{ part.text }}</mark>
            <template v-else>{{ part.text }}</template>
          </template>
        </slot>
      </span>

      <span v-if="$slots.extra" class="flex-shrink-0" @click.stop>
        <slot name="extra" :node="row.node" :level="row.level"></slot>
      </span>
    </div>

    <p v-if="!rows.length" class="px-2 py-3 text-content-tertiary">{{ props.filterText ? '找不到符合的項目' : props.emptyText }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import ChptIcon from './ChptIcon.vue'

/**
 * ChptTree（CHPT 主題） - 樹狀清單
 *
 * 用途：有階層的資料 —— 組織 / 廠區 / 產線、料號 BOM、權限設定。
 * 支援單選（v-model）與多選勾選（v-model:checked，父子三態連動）、篩選並高亮。
 *
 * 行為照 WAI-ARIA 的 tree：
 *   - 整棵樹只有一個 Tab 停駐點；↑ ↓ 在看得到的節點間移動
 *   - → 展開，已展開時移到第一個子節點；← 收合，已收合時移到父節點
 *   - Home / End 到頭尾；Enter 選取；Space 勾選（checkable）或選取；* 展開同層所有節點
 *   - 打字跳到該字開頭的節點
 *
 * 勾選規則：勾父節點 = 勾所有未停用的子孫；子節點部分勾選時父節點是「部分」（aria-checked="mixed"）。
 * v-model:checked 回傳所有「完整勾選」的節點 key（含父節點），與 Element Plus 的 getCheckedKeys 相同。
 */

export interface TreeNode {
  key: string | number
  label: string
  children?: TreeNode[]
  disabled?: boolean
  /** Material Symbols 圖示 */
  icon?: string
  [extra: string]: unknown
}

type Key = string | number

interface ChptTreeProps {
  data: TreeNode[]
  /** v-model：單選的節點 key */
  modelValue?: Key | null
  /** 可以點選（單選）節點 */
  selectable?: boolean
  /** 顯示勾選框（多選） */
  checkable?: boolean
  /** v-model:checked：勾選的 key */
  checked?: Key[]
  /** v-model:expanded：展開的 key；不給時元件自己管理 */
  expanded?: Key[]
  /** 預設全部展開 */
  defaultExpandAll?: boolean
  /** 篩選文字：顯示符合的節點與其祖先，並自動展開、高亮 */
  filterText?: string
  /** 每一層縮排（px） */
  indent?: number
  /** 列高 */
  size?: 'sm' | 'md'
  /** 樹的名稱（給螢幕閱讀器） */
  ariaLabel?: string
  /** 沒有資料時的文字 */
  emptyText?: string
}

const props = withDefaults(defineProps<ChptTreeProps>(), {
  modelValue: null,
  selectable: true,
  checkable: false,
  checked: () => [],
  expanded: undefined,
  defaultExpandAll: false,
  filterText: '',
  indent: 20,
  size: 'md',
  ariaLabel: '',
  emptyText: '沒有資料',
})

const emit = defineEmits<{
  (e: 'update:modelValue', key: Key): void
  (e: 'update:checked', keys: Key[]): void
  (e: 'update:expanded', keys: Key[]): void
  /** 點選節點 */
  (e: 'select', node: TreeNode): void
  /** 勾選變更：節點、是否勾選、全部勾選的 key */
  (e: 'check', node: TreeNode, checked: boolean, keys: Key[]): void
  (e: 'expand', node: TreeNode, expanded: boolean): void
}>()

const rowHeight = computed(() => (props.size === 'sm' ? 'h-7' : 'h-8'))

// ---------------------------------------------------------------------------
// 索引：父節點、所有節點
// ---------------------------------------------------------------------------

const index = computed(() => {
  const parent = new Map<Key, TreeNode | null>()
  const byKey = new Map<Key, TreeNode>()
  const walk = (nodes: TreeNode[], p: TreeNode | null) => {
    for (const n of nodes) {
      parent.set(n.key, p)
      byKey.set(n.key, n)
      if (n.children?.length) walk(n.children, n)
    }
  }
  walk(props.data, null)
  return { parent, byKey }
})

const hasChildren = (n: TreeNode) => !!n.children?.length

// ---------------------------------------------------------------------------
// 展開（可受控）
// ---------------------------------------------------------------------------

function allParentKeys(nodes: TreeNode[], out: Key[] = []): Key[] {
  for (const n of nodes) {
    if (hasChildren(n)) {
      out.push(n.key)
      allParentKeys(n.children!, out)
    }
  }
  return out
}

const innerExpanded = ref<Set<Key>>(new Set(props.defaultExpandAll ? allParentKeys(props.data) : []))
const expandedSet = computed(() => (props.expanded ? new Set(props.expanded) : innerExpanded.value))

function setExpanded(next: Set<Key>): void {
  if (!props.expanded) innerExpanded.value = next
  emit('update:expanded', [...next])
}

/** 篩選中使用者手動收合的節點（篩選文字一改就重設） */
const filterCollapsed = ref<Set<Key>>(new Set())

function isExpanded(key: Key): boolean {
  // 篩選中：有符合的子孫就自動展開（不改使用者原本的展開狀態，清掉篩選後還原）
  if (filterActive.value) return hasMatchingDescendant.value.has(key) && !filterCollapsed.value.has(key)
  return expandedSet.value.has(key)
}

function toggleExpand(key: Key, force?: boolean): void {
  const node = index.value.byKey.get(key)
  if (!node || !hasChildren(node)) return
  const open = force ?? !isExpanded(key)
  if (filterActive.value) {
    const collapsed = new Set(filterCollapsed.value)
    if (open) collapsed.delete(key)
    else collapsed.add(key)
    filterCollapsed.value = collapsed
    emit('expand', node, open)
    return
  }
  const next = new Set(expandedSet.value)
  if (open) next.add(key)
  else next.delete(key)
  setExpanded(next)
  emit('expand', node, open)
}

// ---------------------------------------------------------------------------
// 篩選
// ---------------------------------------------------------------------------

const needle = computed(() => props.filterText.trim().toLowerCase())
const filterActive = computed(() => needle.value !== '')
watch(needle, () => {
  filterCollapsed.value = new Set()
})

/** 篩選中看得到的節點（本身符合或有子孫符合） */
const filterVisible = computed(() => {
  const visible = new Set<Key>()
  if (!filterActive.value) return visible
  const walk = (nodes: TreeNode[]): boolean => {
    let any = false
    for (const n of nodes) {
      const self = n.label.toLowerCase().includes(needle.value)
      const child = n.children ? walk(n.children) : false
      if (self || child) {
        visible.add(n.key)
        any = true
      }
    }
    return any
  }
  walk(props.data)
  return visible
})

const hasMatchingDescendant = computed(() => {
  const set = new Set<Key>()
  for (const key of filterVisible.value) {
    let p = index.value.parent.get(key)
    while (p) {
      set.add(p.key)
      p = index.value.parent.get(p.key) ?? null
    }
  }
  return set
})

function highlight(label: string): { text: string; match: boolean }[] {
  if (!filterActive.value) return [{ text: label, match: false }]
  const lower = label.toLowerCase()
  const parts: { text: string; match: boolean }[] = []
  let i = 0
  while (i < label.length) {
    const at = lower.indexOf(needle.value, i)
    if (at === -1) {
      parts.push({ text: label.slice(i), match: false })
      break
    }
    if (at > i) parts.push({ text: label.slice(i, at), match: false })
    parts.push({ text: label.slice(at, at + needle.value.length), match: true })
    i = at + needle.value.length
  }
  return parts
}

// ---------------------------------------------------------------------------
// 攤平成看得到的列
// ---------------------------------------------------------------------------

interface Row {
  node: TreeNode
  level: number
  setSize: number
  posInSet: number
  hasChildren: boolean
}

const rows = computed<Row[]>(() => {
  const out: Row[] = []
  const walk = (nodes: TreeNode[], level: number) => {
    const shown = filterActive.value ? nodes.filter((n) => filterVisible.value.has(n.key)) : nodes
    shown.forEach((node, i) => {
      out.push({ node, level, setSize: shown.length, posInSet: i + 1, hasChildren: hasChildren(node) })
      if (hasChildren(node) && isExpanded(node.key)) walk(node.children!, level + 1)
    })
  }
  walk(props.data, 1)
  return out
})

// ---------------------------------------------------------------------------
// 勾選（三態）
// ---------------------------------------------------------------------------

const checkedSet = computed(() => new Set(props.checked))

type CheckState = 'checked' | 'unchecked' | 'mixed'

/** 節點的勾選狀態：葉節點看自己；父節點看所有未停用的子孫葉節點 */
const stateCache = computed(() => {
  const cache = new Map<Key, CheckState>()
  const visit = (n: TreeNode): CheckState => {
    let state: CheckState
    if (!hasChildren(n)) {
      state = checkedSet.value.has(n.key) ? 'checked' : 'unchecked'
    } else {
      const states = n.children!.filter((c) => !c.disabled).map(visit)
      n.children!.filter((c) => c.disabled).forEach(visit)
      if (!states.length) state = checkedSet.value.has(n.key) ? 'checked' : 'unchecked'
      else if (states.every((s) => s === 'checked')) state = 'checked'
      else if (states.every((s) => s === 'unchecked')) state = 'unchecked'
      else state = 'mixed'
    }
    cache.set(n.key, state)
    return state
  }
  props.data.forEach(visit)
  return cache
})

function checkState(n: TreeNode): CheckState {
  return stateCache.value.get(n.key) ?? 'unchecked'
}

function ariaChecked(n: TreeNode): 'true' | 'false' | 'mixed' {
  const s = checkState(n)
  return s === 'checked' ? 'true' : s === 'mixed' ? 'mixed' : 'false'
}

function checkboxClass(n: TreeNode): string {
  const s = checkState(n)
  if (n.disabled) return 'border-stroke-light bg-surface-tertiary text-content-disabled'
  if (s === 'unchecked') return 'border-stroke-medium bg-surface-primary group-hover:border-stroke-focus'
  return 'border-accent-solid bg-accent-solid text-white'
}

/** 勾選 / 取消：影響自己與所有未停用的子孫，再重算祖先 */
function toggleCheck(node: TreeNode): void {
  if (node.disabled) return
  const turnOn = checkState(node) !== 'checked'
  const next = new Set(checkedSet.value)
  const apply = (n: TreeNode) => {
    if (n.disabled) return
    if (turnOn) next.add(n.key)
    else next.delete(n.key)
    n.children?.forEach(apply)
  }
  apply(node)

  // 祖先：所有未停用子節點都勾了才算勾，否則移除
  let p = index.value.parent.get(node.key) ?? null
  while (p) {
    const kids = p.children!.filter((c) => !c.disabled)
    if (kids.length && kids.every((c) => next.has(c.key))) next.add(p.key)
    else next.delete(p.key)
    p = index.value.parent.get(p.key) ?? null
  }

  const keys = [...next]
  emit('update:checked', keys)
  emit('check', node, turnOn, keys)
}

// ---------------------------------------------------------------------------
// 選取與焦點
// ---------------------------------------------------------------------------

const focusKey = ref<Key | null>(null)
const rowEls = new Map<Key, HTMLElement>()

function setRowRef(key: Key, el: unknown): void {
  if (el instanceof HTMLElement) rowEls.set(key, el)
  else rowEls.delete(key)
}

/** 焦點所在的節點不再可見（收合、篩選）時，移到第一個可見節點 */
watch(
  rows,
  (list) => {
    if (!list.length) {
      focusKey.value = null
      return
    }
    if (focusKey.value === null || !list.some((r) => r.node.key === focusKey.value)) {
      const selected = list.find((r) => r.node.key === props.modelValue)
      focusKey.value = (selected ?? list[0]).node.key
    }
  },
  { immediate: true }
)

function focusRow(key: Key): void {
  focusKey.value = key
  nextTick(() => rowEls.get(key)?.focus())
}

function select(node: TreeNode): void {
  if (node.disabled) return
  if (props.selectable && node.key !== props.modelValue) emit('update:modelValue', node.key)
  emit('select', node)
}

function onRowClick(node: TreeNode): void {
  focusKey.value = node.key
  if (node.disabled) return
  if (props.checkable) toggleCheck(node)
  else select(node)
}

function onKeydown(event: KeyboardEvent): void {
  const list = rows.value
  const i = list.findIndex((r) => r.node.key === focusKey.value)
  if (i === -1) return
  const row = list[i]
  const node = row.node
  const move = (j: number) => {
    event.preventDefault()
    if (j >= 0 && j < list.length) focusRow(list[j].node.key)
  }

  switch (event.key) {
    case 'ArrowDown':
      return move(i + 1)
    case 'ArrowUp':
      return move(i - 1)
    case 'Home':
      return move(0)
    case 'End':
      return move(list.length - 1)
    case 'ArrowRight':
      event.preventDefault()
      if (!row.hasChildren) return
      if (!isExpanded(node.key)) toggleExpand(node.key, true)
      else move(i + 1)
      return
    case 'ArrowLeft': {
      event.preventDefault()
      if (row.hasChildren && isExpanded(node.key)) {
        toggleExpand(node.key, false)
        return
      }
      const parent = index.value.parent.get(node.key)
      if (parent) focusRow(parent.key)
      return
    }
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (node.disabled) return
      if (props.checkable) toggleCheck(node)
      else select(node)
      return
    case '*': {
      // 展開同層所有節點
      event.preventDefault()
      const parent = index.value.parent.get(node.key)
      const siblings = parent ? parent.children! : props.data
      const next = new Set(expandedSet.value)
      for (const s of siblings) if (hasChildren(s)) next.add(s.key)
      setExpanded(next)
      return
    }
    default:
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const ch = event.key.toLowerCase()
        for (let step = 1; step <= list.length; step++) {
          const r = list[(i + step) % list.length]
          if (r.node.label.toLowerCase().startsWith(ch)) {
            focusRow(r.node.key)
            break
          }
        }
      }
  }
}

defineExpose({
  expandAll: () => setExpanded(new Set(allParentKeys(props.data))),
  collapseAll: () => setExpanded(new Set()),
  /** 所有完整勾選的節點（含父節點） */
  getCheckedNodes: () => props.checked.map((k) => index.value.byKey.get(k)).filter(Boolean) as TreeNode[],
  /** 部分勾選的父節點 key（例如送出「有權限的模組」時需要一起帶上） */
  getHalfCheckedKeys: () => [...stateCache.value].filter(([, s]) => s === 'mixed').map(([k]) => k),
  focus: () => focusKey.value !== null && focusRow(focusKey.value),
})
</script>
