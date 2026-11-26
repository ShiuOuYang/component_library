<template>
  <div class="fishbone flex flex-col gap-2">
    <!-- 摘要與操作列 -->
    <div class="flex min-h-[28px] flex-wrap items-center gap-x-3 gap-y-2 text-xs text-content-secondary">
      <span data-summary>{{ t.fishbone.summary(stats.categories, stats.causes, stats.primary, stats.verified) }}</span>
      <div v-if="props.editable && selected" class="ml-auto flex flex-wrap items-center gap-1" role="toolbar" :aria-label="t.fishbone.selected(selectedText)" data-toolbar>
        <span class="mr-1 max-w-[12rem] truncate text-content-primary">{{ t.fishbone.selected(selectedText) }}</span>
        <button type="button" class="fb-btn" :disabled="!canAddChild" data-action="add" @click="addChild(selected)">
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">add</span>{{ selectedCause ? t.fishbone.addSub : t.fishbone.addCause }}
        </button>
        <button type="button" class="fb-btn" data-action="edit" @click="startEdit(selected)">
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">edit</span>{{ selectedCause ? t.fishbone.edit : t.fishbone.editCategory }}
        </button>
        <template v-if="selectedCause">
          <button v-for="f in FLAGS" :key="f" type="button" class="fb-btn" :class="selectedCause[f] ? FLAG_ON[f] : ''" :aria-pressed="!!selectedCause[f]" :data-action="f" @click="toggleFlag(selected, f)">
            <span class="material-symbols-outlined text-[16px]" aria-hidden="true">{{ FLAG_ICON[f] }}</span>{{ t.fishbone[f] }}
          </button>
          <button type="button" class="fb-btn text-danger" data-action="remove" @click="remove(selected)">
            <span class="material-symbols-outlined text-[16px]" aria-hidden="true">delete</span>{{ t.fishbone.remove }}
          </button>
        </template>
      </div>
    </div>

    <div class="relative overflow-auto rounded-md border border-stroke-light bg-surface-primary" :style="{ maxHeight: props.maxHeight ? `${props.maxHeight}px` : undefined }">
      <div class="relative" :style="{ width: `${L.width}px`, height: `${L.height}px` }" data-canvas>
        <!-- 線 -->
        <svg class="pointer-events-none absolute left-0 top-0" :width="L.width" :height="L.height" aria-hidden="true">
          <defs>
            <marker :id="arrowId" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" :style="{ fill: 'rgb(var(--t-content-primary))' }" />
            </marker>
          </defs>
          <line :x1="L.spineX1" :x2="L.spineX2" :y1="L.spineY" :y2="L.spineY" stroke-width="3" :marker-end="`url(#${arrowId})`" :style="{ stroke: 'rgb(var(--t-content-primary))' }" />
          <line v-for="b in L.bones" :key="b.category.id" :x1="b.x1" :y1="b.y1" :x2="b.x2" :y2="b.y2" stroke-width="2" :style="{ stroke: 'rgb(var(--t-content-secondary))' }" />
          <template v-for="r in L.rows" :key="r.location.cause.id">
            <line
              :x1="r.x1"
              :x2="r.x2"
              :y1="r.y"
              :y2="r.y"
              :stroke-width="r.location.cause.primary ? 2.5 : 1.2"
              :stroke-dasharray="r.location.cause.ruledOut ? '4 3' : undefined"
              :style="{ stroke: r.location.cause.primary ? 'rgb(var(--t-danger))' : 'rgb(var(--t-stroke-dark))' }"
            />
            <line v-if="r.link" :x1="r.link.x" :x2="r.link.x" :y1="r.link.y1" :y2="r.link.y2" stroke-width="1" :style="{ stroke: 'rgb(var(--t-stroke-dark))' }" />
          </template>
        </svg>

        <!-- 魚頭（問題） -->
        <div
          class="absolute flex items-center justify-center rounded-lg border-2 border-stroke-dark bg-surface-secondary px-3 text-center text-sm font-semibold text-content-primary outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          :class="props.editable ? 'cursor-text' : ''"
          :style="box(L.head)"
          :tabindex="0"
          :role="props.editable ? 'button' : undefined"
          :aria-label="t.fishbone.headAria(data.problem || t.fishbone.problemPlaceholder)"
          data-head
          @dblclick="props.editable && startEdit(HEAD)"
          @keydown.enter.prevent="props.editable && startEdit(HEAD)"
          @keydown.f2.prevent="props.editable && startEdit(HEAD)"
        >
          <span class="line-clamp-3 break-words" :class="data.problem ? '' : 'font-normal text-content-tertiary'">{{ data.problem || t.fishbone.problemPlaceholder }}</span>
        </div>

        <!-- 分類與原因 -->
        <div role="tree" :aria-label="props.label || t.fishbone.label" :aria-describedby="hintId">
          <template v-for="b in L.bones" :key="b.category.id">
            <div
              :ref="(el) => setItemEl(b.category.id, el as HTMLElement | null)"
              role="treeitem"
              aria-level="1"
              aria-expanded="true"
              :aria-selected="selected === b.category.id"
              :aria-label="t.fishbone.categoryAria(b.category.label, countOf(b.category.id))"
              :tabindex="tabStop === b.category.id ? 0 : -1"
              class="absolute flex cursor-pointer items-center justify-center truncate rounded-md border px-2 text-sm font-semibold outline-none"
              :class="[
                selected === b.category.id ? 'border-accent bg-accent-subtle text-accent-on-subtle ring-2 ring-accent' : 'border-stroke-default bg-surface-tertiary text-content-primary',
                focusVisible === b.category.id ? 'outline outline-2 outline-offset-2 outline-stroke-focus' : '',
              ]"
              :style="box(b.label)"
              :data-category="b.category.id"
              @click="select(b.category.id)"
              @dblclick="props.editable && startEdit(b.category.id)"
              @keydown="onKey($event, b.category.id)"
              @focus="onFocus(b.category.id)"
            >
              {{ b.category.label }}
            </div>
            <button
              v-if="props.editable"
              type="button"
              tabindex="-1"
              class="absolute flex h-4 w-4 items-center justify-center rounded-full border border-stroke-default bg-surface-primary text-[12px] leading-none text-content-secondary hover:border-accent hover:text-accent"
              :style="{ left: `${b.addAt.x - 8}px`, top: `${b.addAt.y}px` }"
              :aria-label="t.fishbone.addCauseTo(b.category.label)"
              :title="t.fishbone.addCause"
              :data-add="b.category.id"
              @click="addChild(b.category.id)"
            >
              +
            </button>
          </template>
          <div
            v-for="r in L.rows"
            :key="r.location.cause.id"
            :ref="(el) => setItemEl(r.location.cause.id, el as HTMLElement | null)"
            role="treeitem"
            :aria-level="r.location.depth + 2"
            :aria-selected="selected === r.location.cause.id"
            :aria-label="causeAria(r.location.cause)"
            :tabindex="tabStop === r.location.cause.id ? 0 : -1"
            class="group absolute flex cursor-pointer items-end gap-1 rounded-sm px-1 pb-0.5 text-xs leading-tight outline-none"
            :class="[
              selected === r.location.cause.id ? 'bg-accent-subtle' : 'hover:bg-surface-secondary',
              focusVisible === r.location.cause.id ? 'outline outline-2 outline-stroke-focus' : '',
            ]"
            :style="{ left: `${r.x1}px`, top: `${r.y - props.rowHeight + 3}px`, width: `${r.x2 - r.x1}px`, height: `${props.rowHeight - 4}px` }"
            :title="r.location.cause.note ? `${r.location.cause.text}\n${r.location.cause.note}` : r.location.cause.text"
            :data-cause="r.location.cause.id"
            @click="select(r.location.cause.id)"
            @dblclick="props.editable && startEdit(r.location.cause.id)"
            @keydown="onKey($event, r.location.cause.id)"
            @focus="onFocus(r.location.cause.id)"
          >
            <span v-if="r.location.cause.primary" class="material-symbols-outlined shrink-0 text-[14px] leading-none text-danger" aria-hidden="true" data-mark="primary">star</span>
            <span v-if="r.location.cause.verified" class="material-symbols-outlined shrink-0 text-[14px] leading-none text-success" aria-hidden="true" data-mark="verified">check_circle</span>
            <span v-if="r.location.cause.ruledOut" class="material-symbols-outlined shrink-0 text-[14px] leading-none text-content-tertiary" aria-hidden="true" data-mark="ruledOut">block</span>
            <span
              class="min-w-0 flex-1 truncate"
              :class="[
                r.location.cause.primary ? 'font-semibold text-danger' : 'text-content-primary',
                r.location.cause.ruledOut ? 'text-content-tertiary line-through' : '',
                r.location.depth > 0 ? 'text-[11px]' : '',
              ]"
            >{{ r.location.cause.text || t.fishbone.untitled }}</span>
            <button
              v-if="props.editable && r.location.depth < FISHBONE_MAX_DEPTH - 1"
              type="button"
              tabindex="-1"
              class="ml-auto hidden h-4 w-4 shrink-0 items-center justify-center rounded-full border border-stroke-default bg-surface-primary text-[12px] leading-none text-content-secondary hover:border-accent hover:text-accent group-hover:flex"
              :class="selected === r.location.cause.id ? '!flex' : ''"
              :aria-label="t.fishbone.addSub"
              :title="t.fishbone.addSub"
              :data-add="r.location.cause.id"
              @click.stop="addChild(r.location.cause.id)"
            >
              +
            </button>
          </div>
        </div>

        <!-- 行內編輯 -->
        <input
          v-if="editing"
          ref="editorRef"
          v-model="draft"
          class="absolute z-10 rounded border border-stroke-focus bg-surface-primary px-1 text-sm text-content-primary shadow-md outline-none ring-2 ring-stroke-focus"
          :style="editorBox"
          :aria-label="editing.id === HEAD ? t.fishbone.problemLabel : t.fishbone.editInput"
          :placeholder="editing.id === HEAD ? t.fishbone.problemPlaceholder : ''"
          data-editor
          @keydown.enter.prevent="commitEdit()"
          @keydown.esc.prevent="cancelEdit()"
          @blur="commitEdit()"
        />
      </div>
    </div>

    <!-- 圖例 -->
    <div class="flex flex-wrap items-center gap-3 text-xs text-content-secondary" data-legend>
      <span v-for="f in FLAGS" :key="f" class="inline-flex items-center gap-1">
        <span class="material-symbols-outlined text-[14px]" :class="FLAG_TEXT[f]" aria-hidden="true">{{ FLAG_ICON[f] }}</span>{{ t.fishbone[f] }}
      </span>
    </div>
    <p :id="hintId" class="sr-only">{{ props.editable ? t.fishbone.hintEditable : t.fishbone.hint }}</p>
    <span class="sr-only" aria-live="polite" data-live>{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { useLocale } from '../shared/config'
import {
  FISHBONE_5M1E,
  FISHBONE_MAX_DEPTH,
  addCause,
  createFishbone,
  findCause,
  fishStats,
  fishboneOutline,
  flattenCauses,
  layoutFishbone,
  removeCause,
  updateCategory,
  updateCause,
  type FishCause,
  type FishboneData,
} from '../shared/fishbone'

/**
 * ChptFishbone - 魚骨圖（特性要因圖）
 *
 * 品質異常分析（8D 的 D4 根本原因）：右邊魚頭是問題，大骨是分類（預設 5M1E：人、機、料、法、環、測），
 * 原因接在大骨上，最多 3 層。原因可標記已驗證、主要原因、已排除。
 * editable 時可以直接在圖上新增、修改（雙擊或 Enter）、刪除；鍵盤沿著樹移動。v-model 為結構化資料。
 */

export interface ChptFishboneProps {
  /** v-model；沒給時以 5M1E 空白分類開始 */
  modelValue?: FishboneData
  editable?: boolean
  /** 外框最大高度（超過時捲動） */
  maxHeight?: number
  rowHeight?: number
  /** 第一層原因線的長度 */
  branchWidth?: number
  /** 魚骨圖名稱（螢幕閱讀器） */
  label?: string
}

const props = withDefaults(defineProps<ChptFishboneProps>(), {
  modelValue: undefined,
  editable: false,
  maxHeight: 0,
  rowHeight: 24,
  branchWidth: 170,
  label: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: FishboneData): void
  (e: 'select', id: string | null): void
}>()

const t = useLocale()
const uid = useId()
const hintId = `${uid}-hint`
const arrowId = `${uid}-arrow`
const HEAD = '__head__'
type Flag = 'primary' | 'verified' | 'ruledOut'
const FLAGS: Flag[] = ['primary', 'verified', 'ruledOut']
const FLAG_ICON: Record<Flag, string> = { primary: 'star', verified: 'check_circle', ruledOut: 'block' }
const FLAG_TEXT: Record<Flag, string> = { primary: 'text-danger', verified: 'text-success', ruledOut: 'text-content-tertiary' }
const FLAG_ON: Record<Flag, string> = {
  primary: 'border-danger bg-danger-subtle text-danger-on-subtle',
  verified: 'border-success bg-success-subtle text-success-on-subtle',
  ruledOut: 'border-stroke-dark bg-surface-tertiary text-content-primary',
}

// ---- 資料 ----
function defaults(): FishboneData {
  const c = t.value.fishbone.categories
  return createFishbone('', FISHBONE_5M1E.map((id) => ({ id, label: c[id] })))
}
const data = ref<FishboneData>(props.modelValue ?? defaults())
watch(
  () => props.modelValue,
  (v) => {
    if (v && v !== data.value) data.value = v
  }
)
function commit(next: FishboneData): void {
  data.value = next
  emit('update:modelValue', next)
}
const L = computed(() => layoutFishbone(data.value, { rowH: props.rowHeight, branchW: props.branchWidth }))
const stats = computed(() => fishStats(data.value))
const countOf = (catId: string) => flattenCauses(data.value).filter((l) => l.category.id === catId).length
/** 鍵盤順序：分類 → 底下的原因（深度優先）→ 下一個分類 */
const order = computed(() => {
  const flat = flattenCauses(data.value)
  return data.value.categories.flatMap((c) => [c.id, ...flat.filter((l) => l.category === c).map((l) => l.cause.id)])
})
const box = (b: { x: number; y: number; w: number; h: number }) => ({ left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` })

function causeAria(c: FishCause): string {
  const s = t.value.fishbone
  const flags = FLAGS.filter((f) => c[f]).map((f) => s[f])
  return s.causeAria(c.text || s.untitled, flags, c.note ?? '')
}

// ---- 選取 ----
const selected = ref<string | null>(null)
const selectedCause = computed(() => (selected.value ? (findCause(data.value, selected.value)?.cause ?? null) : null))
const selectedText = computed(() => {
  const id = selected.value
  if (!id) return ''
  return selectedCause.value?.text || data.value.categories.find((c) => c.id === id)?.label || t.value.fishbone.untitled
})
const canAddChild = computed(() => {
  const id = selected.value
  if (!id) return false
  const loc = findCause(data.value, id)
  return loc ? loc.depth < FISHBONE_MAX_DEPTH - 1 : true
})
watch(order, (o) => {
  if (selected.value && !o.includes(selected.value)) selected.value = null
})
function select(id: string): void {
  selected.value = id
  tabStopId.value = id
  emit('select', id)
}

// ---- 編輯 ----
const editing = ref<{ id: string; isNew: boolean } | null>(null)
const draft = ref('')
const editorRef = ref<HTMLInputElement | null>(null)
const editorBox = computed(() => {
  const id = editing.value?.id
  if (!id) return {}
  if (id === HEAD) return { ...box({ ...L.value.head, y: L.value.head.y + L.value.head.h / 2 - 16, h: 32 }) }
  const bone = L.value.bones.find((b) => b.category.id === id)
  if (bone) return box({ x: bone.label.x - 20, y: bone.label.y, w: bone.label.w + 40, h: bone.label.h })
  const row = L.value.rows.find((r) => r.location.cause.id === id)!
  return box({ x: row.x1, y: row.y - props.rowHeight + 1, w: Math.max(row.x2 - row.x1, 160), h: props.rowHeight })
})
function startEdit(id: string, isNew = false): void {
  if (!props.editable) return
  editing.value = { id, isNew }
  draft.value = id === HEAD ? data.value.problem : (findCause(data.value, id)?.cause.text ?? data.value.categories.find((c) => c.id === id)?.label ?? '')
  void nextTick(() => {
    editorRef.value?.focus()
    editorRef.value?.select()
  })
}
function commitEdit(): void {
  const e = editing.value
  if (!e) return
  editing.value = null
  const text = draft.value.trim()
  if (e.id === HEAD) {
    if (text !== data.value.problem) commit({ ...data.value, problem: text })
    return refocus(null)
  }
  if (data.value.categories.some((c) => c.id === e.id)) {
    if (text && text !== data.value.categories.find((c) => c.id === e.id)!.label) commit(updateCategory(data.value, e.id, text))
    return refocus(e.id)
  }
  if (!text) {
    // 空白：新的原因就取消新增；原本的原因保留原文字
    if (e.isNew) {
      const parent = findCause(data.value, e.id)
      commit(removeCause(data.value, e.id))
      return refocus(parent?.parentId ?? parent?.category.id ?? null)
    }
    return refocus(e.id)
  }
  if (text !== findCause(data.value, e.id)?.cause.text) commit(updateCause(data.value, e.id, { text }))
  if (e.isNew) announcement.value = t.value.fishbone.added(text)
  refocus(e.id)
}
function cancelEdit(): void {
  const e = editing.value
  if (!e) return
  editing.value = null
  if (e.isNew) {
    const loc = findCause(data.value, e.id)
    commit(removeCause(data.value, e.id))
    return refocus(loc?.parentId ?? loc?.category.id ?? null)
  }
  refocus(e.id === HEAD ? null : e.id)
}
function refocus(id: string | null): void {
  if (id === null) return
  select(id)
  void nextTick(() => itemEls.get(id)?.focus())
}
function addChild(parentId: string | null): void {
  if (!props.editable || !parentId) return
  const res = addCause(data.value, parentId, '')
  if (!res) return
  commit(res.data)
  select(res.id)
  startEdit(res.id, true)
}
function remove(id: string | null): void {
  if (!props.editable || !id) return
  const loc = findCause(data.value, id)
  if (!loc) return
  const idx = order.value.indexOf(id)
  commit(removeCause(data.value, id))
  announcement.value = t.value.fishbone.removed(loc.cause.text || t.value.fishbone.untitled)
  // 焦點移到前一個項目
  const next = order.value[Math.max(0, Math.min(idx - 1, order.value.length - 1))] ?? null
  refocus(next)
}
function toggleFlag(id: string | null, f: Flag): void {
  if (!props.editable || !id) return
  const c = findCause(data.value, id)?.cause
  if (!c) return
  const on = !c[f]
  const patch: Partial<FishCause> = { [f]: on }
  // 主要原因與已排除互斥
  if (on && f === 'primary') patch.ruledOut = false
  if (on && f === 'ruledOut') patch.primary = false
  commit(updateCause(data.value, id, patch))
  announcement.value = t.value.fishbone.toggled(t.value.fishbone[f], on)
}

// ---- 鍵盤 ----
const itemEls = new Map<string, HTMLElement>()
function setItemEl(id: string, el: HTMLElement | null): void {
  if (el) itemEls.set(id, el)
  else itemEls.delete(id)
}
const tabStopId = ref<string | null>(null)
const tabStop = computed(() => (tabStopId.value && order.value.includes(tabStopId.value) ? tabStopId.value : (order.value[0] ?? null)))
const focusVisible = ref<string | null>(null)
const announcement = ref('')
function onFocus(id: string): void {
  tabStopId.value = id
  focusVisible.value = itemEls.get(id)?.matches?.(':focus-visible') ? id : null
}
function move(to: string | null | undefined): void {
  if (!to) return
  tabStopId.value = to
  void nextTick(() => itemEls.get(to)?.focus())
}
function onKey(e: KeyboardEvent, id: string): void {
  if (editing.value) return
  const o = order.value
  const i = o.indexOf(id)
  const loc = findCause(data.value, id)
  const k = e.key
  const nav: Record<string, () => string | null | undefined> = {
    ArrowDown: () => o[i + 1],
    ArrowUp: () => o[i - 1],
    Home: () => o[0],
    End: () => o[o.length - 1],
    ArrowLeft: () => (loc ? (loc.parentId ?? loc.category.id) : null),
    ArrowRight: () => {
      if (loc) return loc.cause.children?.[0]?.id
      return data.value.categories.find((c) => c.id === id)?.causes[0]?.id
    },
  }
  if (nav[k]) {
    e.preventDefault()
    move(nav[k]())
    return
  }
  if (k === 'Enter' || k === 'F2') {
    e.preventDefault()
    select(id)
    if (props.editable) startEdit(id)
    return
  }
  if (k === ' ') {
    e.preventDefault()
    select(id)
    return
  }
  if (!props.editable) return
  if (k === 'Insert' || k === '+') {
    e.preventDefault()
    addChild(id)
  } else if ((k === 'Delete' || k === 'Backspace') && loc) {
    e.preventDefault()
    remove(id)
  } else if (loc && (k === 'p' || k === 'v' || k === 'x')) {
    e.preventDefault()
    toggleFlag(id, ({ p: 'primary', v: 'verified', x: 'ruledOut' } as const)[k])
  }
}

defineExpose({
  /** 目前的資料 */
  value: () => data.value,
  /** 文字大綱（貼到 8D 報告） */
  outline: () => fishboneOutline(data.value),
  addCause: (parentId: string, text: string) => {
    const res = addCause(data.value, parentId, text)
    if (res) commit(res.data)
    return res?.id ?? null
  },
  removeCause: (id: string) => commit(removeCause(data.value, id)),
  updateCause: (id: string, patch: Partial<Omit<FishCause, 'id' | 'children'>>) => commit(updateCause(data.value, id, patch)),
  select: (id: string | null) => {
    selected.value = id
    if (id) tabStopId.value = id
  },
})
</script>

<style scoped>
.fb-btn {
  @apply inline-flex h-7 items-center gap-1 rounded-md border border-stroke-light bg-surface-primary px-2 text-xs text-content-secondary hover:bg-surface-tertiary hover:text-content-primary disabled:cursor-not-allowed disabled:opacity-40;
}
</style>
