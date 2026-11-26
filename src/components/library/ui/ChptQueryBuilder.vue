<template>
  <div class="query-builder flex flex-col gap-2 text-sm">
    <ul class="flex flex-col gap-1.5" role="tree" :aria-label="props.title || t.queryBuilder.title">
      <li
        v-for="row in rows"
        :key="`${row.kind}:${row.node.id}`"
        :role="row.kind === 'end' ? 'group' : 'treeitem'"
        :aria-label="row.kind === 'end' ? `${t.queryBuilder.addRule} / ${t.queryBuilder.addGroup}` : undefined"
        :aria-level="row.kind === 'end' ? undefined : row.depth + 1"
        class="flex flex-wrap items-center gap-1.5 rounded-md"
        :class="[
          row.kind === 'group' ? 'bg-surface-secondary px-2 py-1.5' : row.kind === 'rule' ? 'px-2 py-1' : 'px-2 pb-1',
          dropTarget === `${row.kind}:${row.node.id}` ? 'ring-2 ring-stroke-focus' : '',
          row.kind === 'rule' && errorOf(row.node.id) ? 'bg-danger-subtle' : '',
        ]"
        :style="rowStyle(row)"
        :draggable="!props.readonly && row.kind !== 'end' && row.depth > 0"
        @dragstart="onDragStart($event, row)"
        @dragover="onDragOver($event, row)"
        @dragleave="dropTarget = null"
        @drop="onDrop($event, row)"
        @dragend="dragId = null; dropTarget = null"
      >
        <!-- 群組標題 -->
        <template v-if="row.kind === 'group'">
          <span v-if="!props.readonly && row.depth > 0" class="material-symbols-outlined cursor-grab text-base text-content-tertiary" aria-hidden="true">drag_indicator</span>
          <div class="inline-flex overflow-hidden rounded-md border border-stroke-default" role="group" :aria-label="t.queryBuilder.combinator">
            <button
              v-for="c in (['and', 'or'] as const)"
              :key="c"
              type="button"
              class="px-2.5 py-0.5 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus disabled:cursor-default"
              :class="(row.node as QbGroup).combinator === c ? 'bg-accent-solid text-white' : 'bg-surface-primary text-content-secondary hover:bg-surface-tertiary'"
              :aria-pressed="(row.node as QbGroup).combinator === c"
              :disabled="props.readonly"
              @click="update(row.node.id, { combinator: c })"
            >
              {{ c === 'and' ? t.queryBuilder.and : t.queryBuilder.or }}
            </button>
          </div>
          <label v-if="props.allowNot" class="inline-flex items-center gap-1 text-xs text-content-secondary">
            <input type="checkbox" class="h-3.5 w-3.5 accent-[rgb(var(--t-accent-solid))]" :checked="!!(row.node as QbGroup).not" :disabled="props.readonly" @change="update(row.node.id, { not: ($event.target as HTMLInputElement).checked })" />
            {{ t.queryBuilder.not }}
          </label>
          <span class="text-xs text-content-tertiary">{{ t.queryBuilder.groupHint((row.node as QbGroup).combinator === 'and') }}</span>
          <span v-if="errorOf(row.node.id) === 'emptyGroup'" class="text-xs" :style="{ color: role('danger') }">{{ t.queryBuilder.errors.emptyGroup }}</span>
          <button
            v-if="!props.readonly && row.depth > 0"
            type="button"
            class="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-content-tertiary hover:bg-surface-tertiary hover:text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
            :aria-label="t.queryBuilder.removeGroup"
            @click="remove(row.node.id)"
          >
            <span class="material-symbols-outlined text-lg" aria-hidden="true">delete</span>
          </button>
        </template>

        <!-- 規則 -->
        <template v-else-if="row.kind === 'rule'">
          <span v-if="!props.readonly" class="material-symbols-outlined cursor-grab text-base text-content-tertiary" aria-hidden="true">drag_indicator</span>
          <select
            :class="selectClass"
            :value="(row.node as QbRule).field"
            :disabled="props.readonly"
            :aria-label="t.queryBuilder.field"
            @change="changeField(row.node as QbRule, ($event.target as HTMLSelectElement).value)"
          >
            <option v-if="!fieldOf(row.node as QbRule)" :value="(row.node as QbRule).field" disabled>{{ (row.node as QbRule).field }}</option>
            <option v-for="f in props.fields" :key="f.key" :value="f.key">{{ f.label }}</option>
          </select>
          <template v-if="fieldOf(row.node as QbRule)">
            <select
              :class="selectClass"
              :value="(row.node as QbRule).op"
              :disabled="props.readonly"
              :aria-label="t.queryBuilder.operator"
              @change="changeOp(row.node as QbRule, ($event.target as HTMLSelectElement).value as QbOperator)"
            >
              <option v-for="op in operatorsFor(fieldOf(row.node as QbRule)!)" :key="op" :value="op">{{ t.queryBuilder.ops[op] }}</option>
            </select>
            <!-- 值 -->
            <template v-for="f in [fieldOf(row.node as QbRule)!]" :key="f.key">
              <template v-if="valueArity((row.node as QbRule).op) === 1">
                <select
                  v-if="f.type === 'select' || f.type === 'boolean'"
                  :class="selectClass"
                  :value="String((row.node as QbRule).value ?? '')"
                  :disabled="props.readonly"
                  :aria-label="t.queryBuilder.value"
                  @change="setValue(row.node as QbRule, parseOption(f, ($event.target as HTMLSelectElement).value))"
                >
                  <option v-if="f.type === 'select'" value="" disabled>{{ t.queryBuilder.choose }}</option>
                  <option v-for="o in optionsOf(f)" :key="String(o.value)" :value="String(o.value)">{{ o.label }}</option>
                </select>
                <input
                  v-else
                  :type="inputType(f)"
                  :class="inputClass"
                  :value="(row.node as QbRule).value ?? ''"
                  :disabled="props.readonly"
                  :placeholder="t.queryBuilder.valuePlaceholder"
                  :aria-label="t.queryBuilder.value"
                  @change="setValue(row.node as QbRule, parseInput(f, ($event.target as HTMLInputElement).value))"
                />
              </template>
              <span v-else-if="valueArity((row.node as QbRule).op) === 2" class="inline-flex items-center gap-1">
                <input
                  v-for="k in [0, 1]"
                  :key="k"
                  :type="inputType(f)"
                  :class="inputClass"
                  :value="rangeOf(row.node as QbRule)[k] ?? ''"
                  :disabled="props.readonly"
                  :aria-label="k === 0 ? t.queryBuilder.from : t.queryBuilder.to"
                  @change="setRange(row.node as QbRule, k, parseInput(f, ($event.target as HTMLInputElement).value))"
                />
              </span>
              <span v-else-if="valueArity((row.node as QbRule).op) === 'list'" class="inline-flex flex-wrap gap-1" role="group" :aria-label="t.queryBuilder.value">
                <button
                  v-for="o in optionsOf(f)"
                  :key="String(o.value)"
                  type="button"
                  class="rounded-full border px-2 py-0.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:cursor-default"
                  :class="listOf(row.node as QbRule).includes(o.value) ? 'border-accent bg-accent-subtle text-content-primary' : 'border-stroke-default bg-surface-primary text-content-secondary'"
                  :aria-pressed="listOf(row.node as QbRule).includes(o.value)"
                  :disabled="props.readonly"
                  @click="toggleList(row.node as QbRule, o.value)"
                >
                  {{ o.label }}
                </button>
              </span>
            </template>
          </template>
          <span v-if="errorOf(row.node.id)" class="text-xs" :style="{ color: role('danger') }" role="alert">{{ t.queryBuilder.errors[errorOf(row.node.id)!] }}</span>
          <button
            v-if="!props.readonly"
            type="button"
            class="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-content-tertiary hover:bg-surface-tertiary hover:text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
            :aria-label="t.queryBuilder.removeRule"
            @click="remove(row.node.id)"
          >
            <span class="material-symbols-outlined text-lg" aria-hidden="true">close</span>
          </button>
        </template>

        <!-- 群組結尾：新增 -->
        <template v-else-if="!props.readonly">
          <ChptButton size="xs" is-outline icon="add" :disabled="!props.fields.length" @click="addRule(row.node.id)">{{ t.queryBuilder.addRule }}</ChptButton>
          <ChptButton v-if="row.depth < props.maxDepth" size="xs" is-outline icon="account_tree" :disabled="!props.fields.length" @click="addGroup(row.node.id)">{{ t.queryBuilder.addGroup }}</ChptButton>
        </template>
      </li>
    </ul>

    <!-- 條件文字 -->
    <p v-if="props.showText" class="rounded-md border border-stroke-light bg-surface-secondary px-3 py-2 text-xs text-content-secondary">
      <span class="font-medium text-content-primary">{{ t.queryBuilder.summary }}</span>
      {{ text }}
    </p>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * ChptQueryBuilder 條件建構器 —— 讓使用者自己組查詢條件：AND / OR 群組可巢狀，欄位依型別給運算子與輸入。
 * v-model 是條件的 JSON（給後端轉成 SQL / API 參數）；evaluateQuery 可直接在前端篩選。
 */
import { computed, ref } from 'vue'
import ChptButton from './ChptButton.vue'
import { useLocale } from '../shared/config'
import {
  appendNode,
  createGroup,
  createRule,
  defaultValue,
  depthOf,
  describeQuery,
  findNode,
  isGroup,
  moveNode,
  operatorsFor,
  removeNode,
  updateNode,
  validateQuery,
  valueArity,
  type QbError,
  type QbField,
  type QbGroup,
  type QbNode,
  type QbOperator,
  type QbOption,
  type QbRule,
} from '../shared/queryBuilder'

export interface ChptQueryBuilderProps {
  /** 可用的欄位 */
  fields: QbField[]
  /** 條件（v-model）；不給時從一個空的 AND 群組開始 */
  modelValue?: QbGroup | null
  /** 最多幾層群組（根 = 1） */
  maxDepth?: number
  /** 允許整組取反（NOT） */
  allowNot?: boolean
  /** 顯示可讀的條件文字 */
  showText?: boolean
  /** 一直顯示錯誤（不然要等呼叫 validate()） */
  showErrors?: boolean
  readonly?: boolean
  title?: string
}

const t = useLocale()
const props = withDefaults(defineProps<ChptQueryBuilderProps>(), {
  modelValue: null,
  maxDepth: 3,
  allowNot: false,
  showText: true,
  showErrors: false,
  readonly: false,
  title: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', query: QbGroup): void
}>()

const role = (name: string) => `rgb(var(--t-${name}))`
const selectClass =
  'h-control-xs rounded-md border border-stroke-default bg-surface-primary px-1.5 text-sm text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:opacity-70'
const inputClass =
  'h-control-xs w-36 rounded-md border border-stroke-default bg-surface-primary px-2 text-sm text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:opacity-70'

// ---- 狀態 ----
const fallback = createGroup()
const query = computed<QbGroup>(() => props.modelValue ?? fallback)
function commit(next: QbGroup): void {
  if (props.readonly) return
  emit('update:modelValue', next)
}
const update = (id: string, patch: Partial<QbRule> | Partial<QbGroup>) => commit(updateNode(query.value, id, patch))
const announcement = ref('')
function remove(id: string): void {
  commit(removeNode(query.value, id))
  announcement.value = t.value.queryBuilder.removed
}
function addRule(groupId: string): void {
  commit(appendNode(query.value, groupId, createRule(props.fields[0])))
  announcement.value = t.value.queryBuilder.added
}
function addGroup(groupId: string): void {
  commit(appendNode(query.value, groupId, createGroup([createRule(props.fields[0])])))
  announcement.value = t.value.queryBuilder.added
}

// ---- 攤平成列（不用遞迴元件） ----
interface Row {
  kind: 'group' | 'rule' | 'end'
  node: QbNode
  depth: number
  parentId: string | null
  index: number
}
const rows = computed<Row[]>(() => {
  const out: Row[] = []
  const walk = (g: QbGroup, depth: number, parentId: string | null, index: number) => {
    out.push({ kind: 'group', node: g, depth, parentId, index })
    g.rules.forEach((n, i) => (isGroup(n) ? walk(n, depth + 1, g.id, i) : out.push({ kind: 'rule', node: n, depth: depth + 1, parentId: g.id, index: i })))
    out.push({ kind: 'end', node: g, depth: depth + 1, parentId: g.id, index: g.rules.length })
  }
  walk(query.value, 0, null, 0)
  return out
})
const depthColors = ['accent-solid', 'chart-2', 'chart-3', 'chart-4', 'chart-5']
function rowStyle(row: Row): Record<string, string> {
  if (row.depth === 0) return {}
  // 群組標題與它的子項同色
  const c = role(depthColors[(row.kind === 'group' ? row.depth : row.depth - 1) % depthColors.length])
  return { marginLeft: `${(row.depth - (row.kind === 'group' ? 0 : 1)) * 18}px`, borderLeft: `3px solid color-mix(in srgb, ${c} 55%, transparent)` }
}

// ---- 欄位與值 ----
const fieldOf = (r: QbRule) => props.fields.find((f) => f.key === r.field)
function changeField(r: QbRule, key: string): void {
  const f = props.fields.find((x) => x.key === key)!
  const ops = operatorsFor(f)
  const op = ops.includes(r.op) && f.type === fieldOf(r)?.type ? r.op : ops[0]
  update(r.id, { field: key, op, value: f.type === fieldOf(r)?.type ? r.value : defaultValue(f, op) })
}
function changeOp(r: QbRule, op: QbOperator): void {
  const f = fieldOf(r)!
  const keep = valueArity(op) === valueArity(r.op)
  update(r.id, { op, value: keep ? r.value : defaultValue(f, op) })
}
const setValue = (r: QbRule, value: unknown) => update(r.id, { value })
const rangeOf = (r: QbRule) => (Array.isArray(r.value) ? (r.value as unknown[]) : [null, null])
function setRange(r: QbRule, k: number, v: unknown): void {
  const next = [...rangeOf(r)]
  next[k] = v
  update(r.id, { value: next })
}
const listOf = (r: QbRule) => (Array.isArray(r.value) ? (r.value as unknown[]) : [])
function toggleList(r: QbRule, v: unknown): void {
  const cur = listOf(r)
  update(r.id, { value: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] })
}
function optionsOf(f: QbField): QbOption[] {
  if (f.type === 'boolean') return [{ label: t.value.queryBuilder.yes, value: true }, { label: t.value.queryBuilder.no, value: false }]
  return f.options ?? []
}
function parseOption(f: QbField, raw: string): unknown {
  return optionsOf(f).find((o) => String(o.value) === raw)?.value ?? raw
}
const inputType = (f: QbField) => (f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text')
function parseInput(f: QbField, raw: string): unknown {
  if (raw === '') return null
  if (f.type === 'number') {
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }
  return raw
}

// ---- 驗證與文字 ----
const forceErrors = ref(false)
const errors = computed(() => validateQuery(query.value, props.fields))
const errorOf = (id: string): QbError | null => (props.showErrors || forceErrors.value ? errors.value.get(id) ?? null : null)
/** 驗證並顯示錯誤；回傳是否全部正確 */
function validate(): boolean {
  forceErrors.value = true
  return errors.value.size === 0
}
const text = computed(() => {
  const q = t.value.queryBuilder
  return describeQuery(query.value, props.fields, { and: q.and, or: q.or, not: q.not, ops: q.ops, between: q.between, list: q.list, yes: q.yes, no: q.no, empty: q.noCondition })
})

// ---- 拖曳排序 ----
const dragId = ref<string | null>(null)
const dropTarget = ref<string | null>(null)
function onDragStart(e: DragEvent, row: Row): void {
  if (props.readonly || row.kind === 'end' || row.depth === 0) return
  dragId.value = row.node.id
  e.dataTransfer?.setData('text/plain', row.node.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
/** 放在某一列上：插在它前面（同一群組）；放在群組結尾：加到最後；放在群組標題：加到該群組最前面 */
function dropPlace(row: Row): { group: string; index: number } | null {
  if (row.kind === 'end') return { group: row.node.id, index: row.index }
  if (row.kind === 'group') return { group: row.node.id, index: 0 }
  return { group: row.parentId!, index: row.index }
}
function onDragOver(e: DragEvent, row: Row): void {
  if (!dragId.value || dragId.value === row.node.id) return
  e.preventDefault()
  dropTarget.value = `${row.kind}:${row.node.id}`
}
function onDrop(e: DragEvent, row: Row): void {
  e.preventDefault()
  const id = dragId.value
  dragId.value = null
  dropTarget.value = null
  const place = dropPlace(row)
  if (!id || !place || id === row.node.id) return
  const moving = findNode(query.value, id)
  // 群組移動後不能超過最大深度
  if (moving && isGroup(moving) && depthOf(query.value, place.group) + groupHeight(moving) > props.maxDepth) return
  // 同一群組往後移：先移除再插入，位置要減一
  const from = rows.value.find((r) => r.kind !== 'end' && r.node.id === id)!
  const index = from.parentId === place.group && from.index < place.index ? place.index - 1 : place.index
  commit(moveNode(query.value, id, place.group, index))
  announcement.value = t.value.queryBuilder.moved
}
const groupHeight = (g: QbGroup): number => 1 + Math.max(0, ...g.rules.filter(isGroup).map(groupHeight))

defineExpose({
  validate,
  /** 目前的錯誤（節點 id → 原因） */
  errors,
  /** 可讀的條件文字 */
  text,
})
</script>
