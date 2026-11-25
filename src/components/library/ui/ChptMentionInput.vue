<template>
  <div ref="rootEl" class="mention-input relative text-sm">
    <div
      class="relative rounded-md border bg-surface-primary focus-within:ring-2 focus-within:ring-stroke-focus"
      :class="[props.disabled ? 'opacity-60' : '', overLimit ? 'border-danger' : 'border-stroke-default']"
    >
      <!-- 標記層：和輸入框同樣排版，只畫出提及的底色 -->
      <div
        ref="mirrorEl"
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-3 py-2 text-transparent"
        :style="textStyle"
        data-mirror
      >
        <template v-for="(seg, i) in segments" :key="i">
          <span v-if="seg.kind === 'mention'" class="rounded-sm" :style="{ background: colorOf(seg.trigger), boxShadow: `0 0 0 1px ${colorOf(seg.trigger)}` }" data-mention>{{ seg.text }}</span>
          <span v-else-if="seg.kind === 'marker'" ref="markerEl" data-marker />
          <template v-else>{{ seg.text }}</template>
        </template>
        <!-- 結尾換行時撐出最後一行 -->
        <span>&#8203;</span>
      </div>
      <textarea
        ref="taEl"
        :rows="props.rows"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :aria-label="props.label || undefined"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="open"
        :aria-controls="`${uid}-list`"
        :aria-activedescendant="open && options.length ? `${uid}-opt-${active}` : undefined"
        :aria-describedby="`${uid}-hint`"
        :aria-invalid="overLimit || undefined"
        class="relative block w-full resize-none overflow-y-auto bg-transparent px-3 py-2 text-content-primary placeholder:text-content-tertiary focus:outline-none disabled:cursor-not-allowed"
        :style="{ ...textStyle, height: height ? `${height}px` : undefined }"
        @input="onInput"
        @keydown="onKeydown"
        @keyup="onCaretMove"
        @click="onCaretMove"
        @scroll="syncScroll"
        @blur="onBlur"
        @compositionstart="composing = true"
        @compositionend="onCompositionEnd"
      />
    </div>

    <!-- 候選清單 -->
    <ul
      v-show="open"
      :id="`${uid}-list`"
      role="listbox"
      :aria-label="currentTrigger?.label || t.mention.suggestions"
      class="absolute z-30 max-h-60 w-64 max-w-full overflow-y-auto rounded-md border border-stroke-default bg-surface-primary py-1 shadow-lg"
      :style="{ left: `${pos.left}px`, top: `${pos.top}px` }"
      data-listbox
    >
      <li v-if="loading" class="px-3 py-2 text-xs text-content-tertiary" role="presentation">{{ t.mention.loading }}</li>
      <li v-else-if="!options.length" class="px-3 py-2 text-xs text-content-tertiary" role="presentation">{{ t.mention.noMatch(query?.query ?? '') }}</li>
      <li
        v-for="(o, i) in options"
        v-else
        :id="`${uid}-opt-${i}`"
        :key="o.id"
        role="option"
        :aria-selected="i === active"
        class="flex cursor-pointer items-center gap-2 px-3 py-1.5"
        :class="i === active ? 'bg-accent-subtle text-accent-on-subtle' : 'text-content-primary hover:bg-surface-secondary'"
        @mousedown.prevent="choose(o)"
        @mouseenter="active = i"
      >
        <slot name="option" :option="o" :trigger="query?.trigger" :active="i === active">
          <span class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold" :style="{ background: colorOf(query?.trigger ?? '') }" aria-hidden="true">
            {{ initial(o.label) }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate">{{ o.label }}</span>
            <span v-if="o.description" class="block truncate text-xs text-content-secondary">{{ o.description }}</span>
          </span>
        </slot>
      </li>
    </ul>

    <div class="mt-1 flex items-center gap-2 text-[11px] text-content-tertiary">
      <span :id="`${uid}-hint`" class="min-w-0 flex-1 truncate">{{ hint }}</span>
      <span v-if="props.maxLength" class="tabular-nums" :class="overLimit ? 'text-danger' : ''" data-counter>{{ parsed.plain.length }} / {{ props.maxLength }}</span>
    </div>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * ChptMentionInput 提及輸入 —— 留言、交接紀錄、異常回報裡 @人員、#工單 / #設備。
 * 輸入觸發字元後列出候選（可非同步搜尋），↑↓ 選擇、Enter / Tab 確定；提及顯示成標籤，刪除時整個移除。
 * v-model 是帶標記的字串（`@[王小明](u01)`），change 事件另外給純文字與提及清單。Ctrl / ⌘ + Enter 送出。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useLocale } from '../shared/config'
import {
  applyPlainEdit,
  diffMentions,
  filterMentionOptions,
  findMentionQuery,
  insertMention,
  parseMentions,
  type Mention,
  type MentionOption,
  type MentionQuery,
} from '../shared/mention'

export interface MentionTrigger {
  /** 觸發字元（例如 @、#） */
  char: string
  /** 固定的候選清單（依輸入過濾） */
  options?: MentionOption[]
  /** 自訂搜尋（可回傳 Promise）；有給時不用 options */
  search?: (query: string) => MentionOption[] | Promise<MentionOption[]>
  /** 候選清單的名稱（螢幕閱讀器），例如「人員」 */
  label?: string
  /** 標籤顏色 */
  color?: 'accent' | 'info' | 'success' | 'warning' | 'danger'
}

export interface MentionValue {
  /** 帶標記的字串（同 v-model） */
  value: string
  /** 純文字 */
  text: string
  mentions: Mention[]
}

export interface ChptMentionInputProps {
  modelValue?: string
  triggers?: MentionTrigger[]
  placeholder?: string
  rows?: number
  /** 自動長高的上限（行） */
  maxRows?: number
  /** 字數上限（純文字） */
  maxLength?: number | null
  /** 查詢字可以有空白（英文全名） */
  allowSpaces?: boolean
  /** 最多列出幾個候選 */
  limit?: number
  /** 輸入框名稱（螢幕閱讀器） */
  label?: string
  disabled?: boolean
  readonly?: boolean
}

const t = useLocale()
const props = withDefaults(defineProps<ChptMentionInputProps>(), {
  modelValue: '',
  triggers: () => [{ char: '@' }],
  placeholder: '',
  rows: 3,
  maxRows: 8,
  maxLength: null,
  allowSpaces: false,
  limit: 8,
  label: '',
  disabled: false,
  readonly: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: MentionValue): void
  /** 從候選清單選了一個 */
  (e: 'select', payload: { trigger: string; option: MentionOption }): void
  (e: 'mention-add', mentions: Mention[]): void
  (e: 'mention-remove', mentions: Mention[]): void
  /** Ctrl / ⌘ + Enter */
  (e: 'submit', value: MentionValue): void
}>()

const uid = useId()
const rootEl = ref<HTMLElement | null>(null)
const taEl = ref<HTMLTextAreaElement | null>(null)
const mirrorEl = ref<HTMLElement | null>(null)
const markerEl = ref<HTMLElement[] | HTMLElement | null>(null)
const LINE = 20
const textStyle = { lineHeight: `${LINE}px`, fontSize: '14px', fontFamily: 'inherit', letterSpacing: 'normal', overflowWrap: 'break-word' as const }

// ---- 值 ----
const composing = ref(false)
const inner = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => {
    if (v !== inner.value) inner.value = v
  }
)
const chars = computed(() => props.triggers.map((x) => x.char))
const parsed = computed(() => parseMentions(inner.value, chars.value))
const overLimit = computed(() => props.maxLength !== null && parsed.value.plain.length > props.maxLength)
// 輸入框的內容由這裡寫入（不綁 :value —— Vue 每次重新渲染都會把 value 寫回，組字中會打斷輸入法）
function syncTextarea(): void {
  const ta = taEl.value
  if (ta && !composing.value && ta.value !== parsed.value.plain) ta.value = parsed.value.plain
}
watch(() => parsed.value.plain, syncTextarea, { flush: 'post' })
onMounted(() => {
  syncTextarea()
  autoSize()
})
const snapshot = (value = inner.value): MentionValue => {
  const p = parseMentions(value, chars.value)
  return { value, text: p.plain, mentions: p.mentions }
}

function commit(next: string): void {
  if (next === inner.value) return
  const before = parsed.value.mentions
  inner.value = next
  const after = parsed.value.mentions
  emit('update:modelValue', next)
  emit('change', snapshot(next))
  const { added, removed } = diffMentions(before, after)
  if (added.length) emit('mention-add', added)
  if (removed.length) emit('mention-remove', removed)
}

// ---- 輸入 ----
function onInput(e: Event): void {
  const ta = e.target as HTMLTextAreaElement
  autoSize()
  // 組字中不送出：值一改，Vue 就會改到輸入框、打斷輸入法；組字結束再一起處理
  if (composing.value) return
  handleInput(ta)
}
function handleInput(ta: HTMLTextAreaElement): void {
  const nextPlain = ta.value
  const next = applyPlainEdit(inner.value, nextPlain, chars.value)
  commit(next)
  const plain = parsed.value.plain
  // 刪到提及時整個刪掉：輸入框內容要跟著改，游標放在刪除的位置
  if (plain !== nextPlain) {
    let p = 0
    while (p < plain.length && plain[p] === nextPlain[p]) p++
    ta.value = plain
    ta.setSelectionRange(p, p)
  }
  detect()
}
function onCompositionEnd(): void {
  composing.value = false
  if (taEl.value) handleInput(taEl.value)
}

// ---- 自動長高 ----
const height = ref<number | null>(null)
function autoSize(): void {
  const ta = taEl.value
  if (!ta) return
  ta.style.height = 'auto'
  const max = props.maxRows * LINE + 16
  const min = props.rows * LINE + 16
  height.value = Math.max(min, Math.min(max, ta.scrollHeight))
  ta.style.height = ''
}
function syncScroll(): void {
  if (mirrorEl.value && taEl.value) mirrorEl.value.scrollTop = taEl.value.scrollTop
}

// ---- 查詢與候選 ----
const query = ref<MentionQuery | null>(null)
const dismissedAt = ref<number | null>(null)
const options = ref<MentionOption[]>([])
const active = ref(0)
const loading = ref(false)
const open = computed(() => !!query.value && !props.disabled && !props.readonly)
const currentTrigger = computed(() => props.triggers.find((x) => x.char === query.value?.trigger))
let requestId = 0
let timer: ReturnType<typeof setTimeout> | null = null
onBeforeUnmount(() => timer && clearTimeout(timer))

function caret(): number | null {
  const ta = taEl.value
  if (!ta || ta.selectionStart !== ta.selectionEnd) return null
  return ta.selectionStart
}
function detect(): void {
  const c = caret()
  const q = c === null ? null : findMentionQuery(parsed.value.plain, c, chars.value, parsed.value.mentions, { allowSpaces: props.allowSpaces })
  if (q && dismissedAt.value === q.start) {
    query.value = null
    return
  }
  dismissedAt.value = null
  const changed = q?.query !== query.value?.query || q?.start !== query.value?.start
  query.value = q
  if (!q) {
    options.value = []
    return
  }
  if (changed) search(q)
}
function search(q: MentionQuery): void {
  const trig = props.triggers.find((x) => x.char === q.trigger)!
  const id = ++requestId
  active.value = 0
  if (!trig.search) {
    options.value = filterMentionOptions(trig.options ?? [], q.query, props.limit)
    announce()
    return
  }
  loading.value = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(async () => {
    try {
      const res = await trig.search!(q.query)
      if (id !== requestId) return
      options.value = res.slice(0, props.limit)
    } catch {
      if (id === requestId) options.value = []
    } finally {
      if (id === requestId) {
        loading.value = false
        announce()
      }
    }
  }, 120)
}
function announce(): void {
  announcement.value = options.value.length ? t.value.mention.count(options.value.length) : t.value.mention.noMatch(query.value?.query ?? '')
}
const announcement = ref('')

function onCaretMove(e: Event): void {
  if (e instanceof KeyboardEvent && open.value && ['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(e.key)) return
  detect()
}
function onBlur(): void {
  // 讓候選的 mousedown 先執行（已 prevent，不會失焦）；其他情況收起
  query.value = null
}

function choose(o: MentionOption): void {
  const q = query.value
  const c = caret()
  if (!q || c === null) return
  const r = insertMention(inner.value, q.start, c, q.trigger, o, chars.value)
  commit(r.value)
  emit('select', { trigger: q.trigger, option: o })
  query.value = null
  options.value = []
  announcement.value = t.value.mention.inserted(o.label)
  void nextTick(() => {
    const ta = taEl.value
    if (!ta) return
    ta.value = parsed.value.plain
    ta.focus()
    ta.setSelectionRange(r.caret, r.caret)
    autoSize()
  })
}

function onKeydown(e: KeyboardEvent): void {
  if (open.value) {
    const n = options.value.length
    if (e.key === 'ArrowDown' && n) {
      e.preventDefault()
      active.value = (active.value + 1) % n
      return
    }
    if (e.key === 'ArrowUp' && n) {
      e.preventDefault()
      active.value = (active.value - 1 + n) % n
      return
    }
    if ((e.key === 'Enter' || e.key === 'Tab') && n && !e.isComposing && !loading.value) {
      e.preventDefault()
      choose(options.value[active.value])
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      dismissedAt.value = query.value!.start
      query.value = null
      return
    }
  }
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.isComposing) {
    e.preventDefault()
    if (!overLimit.value && !props.disabled) emit('submit', snapshot())
  }
}

// ---- 呈現 ----
interface Segment {
  kind: 'text' | 'mention' | 'marker'
  text: string
  trigger: string
}
const segments = computed<Segment[]>(() => {
  const { plain, mentions } = parsed.value
  const markerAt = open.value ? query.value!.start : -1
  const out: Segment[] = []
  let last = 0
  const pushText = (to: number) => {
    if (markerAt >= last && markerAt < to) {
      out.push({ kind: 'text', text: plain.slice(last, markerAt), trigger: '' }, { kind: 'marker', text: '', trigger: '' })
      last = markerAt
    }
    if (to > last) out.push({ kind: 'text', text: plain.slice(last, to), trigger: '' })
    last = to
  }
  for (const m of mentions) {
    pushText(m.start)
    out.push({ kind: 'mention', text: plain.slice(m.start, m.end), trigger: m.trigger })
    last = m.end
  }
  pushText(plain.length)
  if (markerAt === plain.length) out.push({ kind: 'marker', text: '', trigger: '' })
  return out
})
const pos = computed(() => {
  void segments.value
  const marker = Array.isArray(markerEl.value) ? markerEl.value[0] : markerEl.value
  const mirror = mirrorEl.value
  const width = rootEl.value?.clientWidth ?? 0
  if (!marker || !mirror) return { left: 0, top: (props.rows * LINE) + 20 }
  const left = Math.max(0, Math.min(marker.offsetLeft, Math.max(0, width - 256)))
  return { left, top: marker.offsetTop - mirror.scrollTop + LINE + 4 }
})
const palette: Record<NonNullable<MentionTrigger['color']>, string> = {
  accent: 'rgb(var(--t-accent-subtle))',
  info: 'rgb(var(--t-info-subtle))',
  success: 'rgb(var(--t-success-subtle))',
  warning: 'rgb(var(--t-warning-subtle))',
  danger: 'rgb(var(--t-danger-subtle))',
}
const colorOf = (trigger: string) => palette[props.triggers.find((x) => x.char === trigger)?.color ?? (trigger === props.triggers[0]?.char ? 'accent' : 'info')]
const initial = (label: string) => [...label.trim()][0]?.toUpperCase() ?? '?'
const hint = computed(() => t.value.mention.hint(chars.value.join(' ')))

defineExpose({
  focus: () => taEl.value?.focus(),
  /** 清空 */
  clear: () => commit(''),
  /** 在游標處插入觸發字元並開啟候選（例如工具列的「@」按鈕） */
  insertTrigger: (char = chars.value[0]) => {
    const ta = taEl.value
    if (!ta || props.disabled || props.readonly) return
    const c = ta.selectionStart ?? parsed.value.plain.length
    const plain = parsed.value.plain
    const needSpace = c > 0 && !/\s/.test(plain[c - 1])
    const add = `${needSpace ? ' ' : ''}${char}`
    commit(applyPlainEdit(inner.value, plain.slice(0, c) + add + plain.slice(c), chars.value))
    void nextTick(() => {
      ta.value = parsed.value.plain
      ta.focus()
      ta.setSelectionRange(c + add.length, c + add.length)
      detect()
    })
  },
  /** 純文字 */
  text: computed(() => parsed.value.plain),
  /** 目前的提及 */
  mentions: computed(() => parsed.value.mentions),
})
</script>
