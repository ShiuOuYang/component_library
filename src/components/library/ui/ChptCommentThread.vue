<template>
  <div class="comment-thread flex flex-col gap-3 text-sm">
    <div class="flex flex-wrap items-center gap-2">
      <h3 class="text-sm font-semibold text-content-primary">{{ props.title || t.comments.title(total) }}</h3>
      <div v-if="hasResolved" class="ml-auto inline-flex overflow-hidden rounded-md border border-stroke-default" role="group" :aria-label="t.comments.filter">
        <button
          v-for="f in (['all', 'open'] as const)"
          :key="f"
          type="button"
          class="px-2.5 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus"
          :class="filter === f ? 'bg-accent-solid text-white' : 'bg-surface-primary text-content-secondary hover:bg-surface-secondary'"
          :aria-pressed="filter === f"
          @click="filter = f"
        >
          {{ f === 'all' ? t.comments.all : t.comments.unresolved(openCount) }}
        </button>
      </div>
    </div>

    <p v-if="!visible.length" class="rounded-md border border-dashed border-stroke-default px-3 py-6 text-center text-content-tertiary">{{ props.emptyText ?? t.comments.empty }}</p>

    <ol class="flex flex-col gap-3" :aria-label="t.comments.listLabel">
      <li
        v-for="cm in visible"
        :key="cm.id"
        class="rounded-lg border bg-surface-primary"
        :class="cm.resolved ? 'border-stroke-light' : 'border-stroke-default'"
        :data-comment="cm.id"
      >
        <!-- 已解決：收起來 -->
        <div v-if="cm.resolved && !expanded.has(cm.id)" class="flex flex-wrap items-center gap-2 px-3 py-2 text-content-secondary">
          <span class="material-symbols-outlined text-base text-success" aria-hidden="true">check_circle</span>
          <span class="min-w-0 flex-1 truncate">{{ t.comments.resolvedSummary(cm.author.name, cm.resolvedBy?.name ?? '', 1 + (cm.replies?.length ?? 0)) }}</span>
          <button type="button" :class="linkBtn" @click="toggleExpand(cm.id)">{{ t.comments.show }}</button>
        </div>
        <template v-else>
          <div class="px-3 py-2">
            <article :aria-label="articleLabel(cm)">
              <CommentRow :c="cm" :top="true" />
            </article>
            <div v-if="cm.resolved" class="mt-1 flex flex-wrap items-center gap-2 text-xs text-success-on-subtle">
              <span class="inline-flex items-center gap-1 rounded-full bg-success-subtle px-2 py-0.5">
                <span class="material-symbols-outlined text-sm" aria-hidden="true">check_circle</span>{{ t.comments.resolvedBy(cm.resolvedBy?.name ?? '') }}
              </span>
              <button type="button" :class="linkBtn" @click="toggleExpand(cm.id)">{{ t.comments.hide }}</button>
            </div>
          </div>
          <!-- 回覆 -->
          <ol v-if="cm.replies?.length" class="ml-6 flex flex-col gap-2 border-l-2 border-stroke-light py-1 pl-3 pr-3" :aria-label="t.comments.repliesLabel(cm.author.name)">
            <li v-for="r in cm.replies" :key="r.id" :data-comment="r.id">
              <article :aria-label="articleLabel(r)">
                <CommentRow :c="r" :top="false" :parent="cm" />
              </article>
            </li>
          </ol>
          <div v-if="replyTo === cm.id" class="ml-6 border-l-2 border-stroke-light pb-3 pl-3 pr-3 pt-1" data-reply-box>
            <ChptMentionInput
              ref="replyInputEl"
              v-model="replyDraft"
              :triggers="props.triggers"
              :rows="2"
              :max-length="props.maxLength"
              :placeholder="t.comments.replyPlaceholder(cm.author.name)"
              :label="t.comments.replyPlaceholder(cm.author.name)"
              @submit="postReply(cm)"
            />
            <div class="mt-1 flex justify-end gap-2">
              <button type="button" :class="ghostBtn" @click="replyTo = null">{{ t.comments.cancel }}</button>
              <button type="button" :class="primaryBtn" :disabled="!canSend(replyDraft)" @click="postReply(cm)">{{ t.comments.reply }}</button>
            </div>
          </div>
        </template>
      </li>
    </ol>

    <!-- 新留言 -->
    <div v-if="canPost" class="flex gap-2" data-composer>
      <span class="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-content-primary" :style="avatarStyle(props.currentUser!)" aria-hidden="true">
        <img v-if="props.currentUser!.avatar" :src="props.currentUser!.avatar" alt="" class="h-full w-full rounded-full object-cover" />
        <template v-else>{{ initial(props.currentUser!.name) }}</template>
      </span>
      <div class="min-w-0 flex-1">
        <ChptMentionInput
          v-model="draft"
          :triggers="props.triggers"
          :rows="2"
          :max-length="props.maxLength"
          :placeholder="props.placeholder || t.comments.placeholder"
          :label="t.comments.placeholder"
          @submit="postTop"
        />
        <div class="mt-1 flex justify-end">
          <button type="button" :class="primaryBtn" :disabled="!canSend(draft)" @click="postTop">
            <span class="material-symbols-outlined text-base" aria-hidden="true">send</span>{{ t.comments.send }}
          </button>
        </div>
      </div>
    </div>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * ChptCommentThread 留言串 —— 異常處理紀錄、審查意見、工單討論。
 * 留言與回覆（兩層）、@ 提及（用 ChptMentionInput）、編輯、刪除（兩步確認；有回覆的留下「已刪除」佔位）、
 * 標記已解決（收起整串）/ 重新開啟、全部 / 未解決篩選、相對時間（每分鐘更新）、附件標籤。
 */
import { computed, defineComponent, h, nextTick, onBeforeUnmount, ref, type PropType } from 'vue'
import ChptMentionInput, { type MentionTrigger } from './ChptMentionInput.vue'
import { useLocale } from '../shared/config'
import { diffMentions, parseMentions, type Mention } from '../shared/mention'
import {
  addComment,
  commentId,
  countComments,
  formatBytes,
  relativeTime,
  removeComment,
  sortComments,
  toMs,
  updateComment,
  type CommentAuthor,
  type CommentItem,
} from '../shared/commentThread'

export interface ChptCommentThreadProps {
  /** 留言（v-model） */
  modelValue?: CommentItem[]
  /** 目前登入的人；沒給時只能看（不能留言） */
  currentUser?: CommentAuthor | null
  /** @ / # 提及的來源（同 ChptMentionInput） */
  triggers?: MentionTrigger[]
  /** 可以編輯 / 刪除別人的留言 */
  moderator?: boolean
  /** 最上層的排序 */
  order?: 'oldest' | 'newest'
  /** 字數上限 */
  maxLength?: number | null
  title?: string
  placeholder?: string
  emptyText?: string
  /** 「現在」（相對時間）；不給時用現在並每分鐘更新 */
  now?: number | Date | null
  /** 新留言的 id；不給時自動產生 */
  idFactory?: (() => string) | null
  readonly?: boolean
}

const t = useLocale()
const props = withDefaults(defineProps<ChptCommentThreadProps>(), {
  modelValue: () => [],
  currentUser: null,
  triggers: () => [{ char: '@' }],
  moderator: false,
  order: 'oldest',
  maxLength: 1000,
  title: '',
  placeholder: '',
  emptyText: undefined,
  now: null,
  idFactory: null,
  readonly: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', items: CommentItem[]): void
  (e: 'create', payload: { comment: CommentItem; parentId: string | null; mentions: Mention[] }): void
  (e: 'edit', payload: { comment: CommentItem; before: CommentItem; addedMentions: Mention[] }): void
  (e: 'remove', payload: { comment: CommentItem; parentId: string | null }): void
  (e: 'resolve', payload: { comment: CommentItem; resolved: boolean }): void
}>()

const linkBtn = 'rounded px-1 text-xs text-accent-on-subtle hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus'
const ghostBtn =
  'inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-xs text-content-secondary hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus'
const primaryBtn =
  'inline-flex h-7 items-center gap-1 rounded-md bg-accent-solid px-3 text-xs text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:cursor-not-allowed disabled:opacity-50'
const dangerBtn =
  'inline-flex h-7 items-center gap-1 rounded-md bg-danger-solid px-3 text-xs text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus'

const chars = computed(() => props.triggers.map((x) => x.char))
const total = computed(() => countComments(props.modelValue))
const sorted = computed(() => sortComments(props.modelValue, props.order))
const hasResolved = computed(() => props.modelValue.some((c) => c.resolved))
const openCount = computed(() => props.modelValue.filter((c) => !c.resolved && !c.deleted).length)
const filter = ref<'all' | 'open'>('all')
const visible = computed(() => (filter.value === 'open' ? sorted.value.filter((c) => !c.resolved) : sorted.value))
const expanded = ref(new Set<string>())
function toggleExpand(id: string): void {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

// ---- 時間 ----
const clock = ref(Date.now())
const timer = setInterval(() => (clock.value = Date.now()), 60_000)
onBeforeUnmount(() => clearInterval(timer))
const nowMs = computed(() => (props.now === null ? clock.value : toMs(props.now)))
const pad = (n: number) => String(n).padStart(2, '0')
const absTime = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function relTime(at: number | string | Date): string {
  const ms = toMs(at)
  const r = relativeTime(ms, nowMs.value)
  const s = t.value.comments
  if (r.unit === 'now') return s.justNow
  if (r.unit === 'minute') return s.minutesAgo(r.n)
  if (r.unit === 'hour') return s.hoursAgo(r.n)
  if (r.unit === 'day') return s.daysAgo(r.n)
  return absTime(ms).slice(0, 10)
}

// ---- 權限 ----
const canPost = computed(() => !props.readonly && !!props.currentUser)
const isMine = (c: CommentItem) => !!props.currentUser && c.author.id === props.currentUser.id
const canModify = (c: CommentItem) => canPost.value && !c.deleted && (isMine(c) || props.moderator)
const canSend = (body: string) => {
  const text = parseMentions(body, chars.value).plain
  return !!text.trim() && (props.maxLength === null || text.length <= props.maxLength)
}

// ---- 新增 ----
const draft = ref('')
const replyDraft = ref('')
const replyTo = ref<string | null>(null)
const replyInputEl = ref<{ focus: () => void }[] | { focus: () => void } | null>(null)
const announcement = ref('')
const newId = () => (props.idFactory ? props.idFactory() : commentId())
function make(body: string): CommentItem {
  return { id: newId(), author: props.currentUser!, body: body.trim(), createdAt: Date.now(), replies: [] }
}
function create(body: string, parentId: string | null): void {
  const c = make(body)
  if (parentId !== null) delete c.replies
  emit('update:modelValue', addComment(props.modelValue, c, parentId))
  emit('create', { comment: c, parentId, mentions: parseMentions(c.body, chars.value).mentions })
  announcement.value = parentId ? t.value.comments.replied : t.value.comments.posted
}
function postTop(): void {
  if (!canPost.value || !canSend(draft.value)) return
  create(draft.value, null)
  draft.value = ''
}
function startReply(c: CommentItem): void {
  replyTo.value = c.id
  replyDraft.value = ''
  void nextTick(() => {
    const el = Array.isArray(replyInputEl.value) ? replyInputEl.value[0] : replyInputEl.value
    el?.focus()
  })
}
function postReply(parent: CommentItem): void {
  if (!canPost.value || !canSend(replyDraft.value)) return
  create(replyDraft.value, parent.id)
  replyDraft.value = ''
  replyTo.value = null
}

// ---- 編輯 / 刪除 / 解決 ----
const editingId = ref<string | null>(null)
const editDraft = ref('')
const confirmId = ref<string | null>(null)
function startEdit(c: CommentItem): void {
  editingId.value = c.id
  editDraft.value = c.body
  confirmId.value = null
}
function saveEdit(c: CommentItem): void {
  if (!canSend(editDraft.value)) return
  const body = editDraft.value.trim()
  editingId.value = null
  if (body === c.body) return
  const next = { ...c, body, editedAt: Date.now() }
  emit('update:modelValue', updateComment(props.modelValue, c.id, { body, editedAt: next.editedAt }))
  const added = diffMentions(parseMentions(c.body, chars.value).mentions, parseMentions(body, chars.value).mentions).added
  emit('edit', { comment: next, before: c, addedMentions: added })
  announcement.value = t.value.comments.saved
}
function remove(c: CommentItem, parentId: string | null): void {
  confirmId.value = null
  emit('update:modelValue', removeComment(props.modelValue, c.id))
  emit('remove', { comment: c, parentId })
  announcement.value = t.value.comments.removed
}
function setResolved(c: CommentItem, resolved: boolean): void {
  emit('update:modelValue', updateComment(props.modelValue, c.id, { resolved, resolvedBy: resolved ? props.currentUser : null }))
  emit('resolve', { comment: c, resolved })
  if (!resolved) {
    const next = new Set(expanded.value)
    next.delete(c.id)
    expanded.value = next
  }
  announcement.value = resolved ? t.value.comments.markedResolved : t.value.comments.reopened
}

// ---- 呈現 ----
const initial = (name: string) => [...name.trim()][0]?.toUpperCase() ?? '?'
function avatarStyle(a: CommentAuthor) {
  let hash = 0
  for (const ch of a.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return { background: `color-mix(in srgb, rgb(var(--t-chart-${(hash % 8) + 1})) 28%, rgb(var(--t-surface-primary)))` }
}
const mentionColor = (trigger: string) => {
  const c = props.triggers.find((x) => x.char === trigger)?.color ?? (trigger === chars.value[0] ? 'accent' : 'info')
  return `rgb(var(--t-${c}-subtle))`
}
function segments(body: string) {
  const { plain, mentions } = parseMentions(body, chars.value)
  const out: { text: string; mention?: Mention }[] = []
  let last = 0
  for (const m of mentions) {
    if (m.start > last) out.push({ text: plain.slice(last, m.start) })
    out.push({ text: plain.slice(m.start, m.end), mention: m })
    last = m.end
  }
  if (last < plain.length) out.push({ text: plain.slice(last) })
  return out
}
const articleLabel = (c: CommentItem) => (c.deleted ? t.value.comments.deleted : t.value.comments.byAt(c.author.name, relTime(c.createdAt)))

/** 一則留言（頭像、名字、時間、內容、附件、動作）；用 render function 讓留言與回覆共用 */
const CommentRow = defineComponent({
  props: {
    c: { type: Object as PropType<CommentItem>, required: true },
    top: { type: Boolean, required: true },
    parent: { type: Object as PropType<CommentItem | null>, default: null },
  },
  setup(p) {
    return () => {
      const c = p.c
      const s = t.value.comments
      const parentId = p.parent?.id ?? null
      if (c.deleted)
        return h('div', { class: 'flex items-center gap-2 py-1 text-content-tertiary italic', 'data-deleted': '' }, [
          h('span', { class: 'material-symbols-outlined text-base not-italic', 'aria-hidden': 'true' }, 'block'),
          s.deleted,
        ])
      const editing = editingId.value === c.id
      const actions: ReturnType<typeof h>[] = []
      if (canPost.value && p.top && !c.resolved) actions.push(h('button', { type: 'button', class: linkBtn, onClick: () => startReply(c) }, s.reply))
      if (canPost.value && p.top) actions.push(h('button', { type: 'button', class: linkBtn, onClick: () => setResolved(c, !c.resolved) }, c.resolved ? s.reopen : s.resolve))
      if (canModify(c) && !editing) {
        actions.push(h('button', { type: 'button', class: linkBtn, onClick: () => startEdit(c) }, s.edit))
        actions.push(h('button', { type: 'button', class: `${linkBtn} text-danger`, onClick: () => (confirmId.value = c.id) }, s.delete))
      }
      return h('div', { class: 'flex gap-2' }, [
        h(
          'span',
          { class: 'inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-content-primary', style: avatarStyle(c.author), 'aria-hidden': 'true' },
          c.author.avatar ? [h('img', { src: c.author.avatar, alt: '', class: 'h-full w-full object-cover' })] : initial(c.author.name)
        ),
        h('div', { class: 'min-w-0 flex-1' }, [
          h('div', { class: 'flex flex-wrap items-baseline gap-x-2' }, [
            h('span', { class: 'font-medium text-content-primary' }, c.author.name),
            isMine(c) ? h('span', { class: 'text-[11px] text-content-tertiary' }, s.you) : null,
            h('time', { class: 'text-xs text-content-tertiary', datetime: new Date(toMs(c.createdAt)).toISOString(), title: absTime(toMs(c.createdAt)) }, relTime(c.createdAt)),
            c.editedAt ? h('span', { class: 'text-xs text-content-tertiary', title: absTime(toMs(c.editedAt)) }, s.edited) : null,
          ]),
          editing
            ? h('div', { class: 'mt-1', 'data-edit-box': '' }, [
                h(ChptMentionInput, {
                  modelValue: editDraft.value,
                  'onUpdate:modelValue': (v: string) => (editDraft.value = v),
                  triggers: props.triggers,
                  rows: 2,
                  maxLength: props.maxLength,
                  label: s.edit,
                  onSubmit: () => saveEdit(c),
                }),
                h('div', { class: 'mt-1 flex justify-end gap-2' }, [
                  h('button', { type: 'button', class: ghostBtn, onClick: () => (editingId.value = null) }, s.cancel),
                  h('button', { type: 'button', class: primaryBtn, disabled: !canSend(editDraft.value), onClick: () => saveEdit(c) }, s.save),
                ]),
              ])
            : h(
                'p',
                { class: 'mt-0.5 whitespace-pre-wrap break-words text-content-primary', 'data-body': '' },
                segments(c.body).map((seg) =>
                  seg.mention ? h('span', { class: 'rounded px-0.5', style: { background: mentionColor(seg.mention.trigger) }, 'data-mention': seg.mention.id }, seg.text) : seg.text
                )
              ),
          c.attachments?.length
            ? h(
                'ul',
                { class: 'mt-1 flex flex-wrap gap-1.5', 'aria-label': s.attachments },
                c.attachments.map((a) =>
                  h('li', { key: a.name }, [
                    h(
                      a.url ? 'a' : 'span',
                      {
                        class: 'inline-flex items-center gap-1 rounded-md border border-stroke-default bg-surface-secondary px-2 py-0.5 text-xs text-content-primary',
                        ...(a.url ? { href: a.url, target: '_blank', rel: 'noopener noreferrer' } : {}),
                      },
                      [h('span', { class: 'material-symbols-outlined text-sm', 'aria-hidden': 'true' }, 'attach_file'), a.name, a.size ? h('span', { class: 'text-content-tertiary' }, formatBytes(a.size)) : null]
                    ),
                  ])
                )
              )
            : null,
          confirmId.value === c.id
            ? h('div', { class: 'mt-1 flex flex-wrap items-center gap-2 rounded-md bg-danger-subtle px-2 py-1 text-xs text-danger-on-subtle', role: 'alert' }, [
                h('span', { class: 'flex-1' }, c.replies?.length ? s.confirmDeleteWithReplies : s.confirmDelete),
                h('button', { type: 'button', class: ghostBtn, onClick: () => (confirmId.value = null) }, s.cancel),
                h('button', { type: 'button', class: dangerBtn, onClick: () => remove(c, parentId) }, s.delete),
              ])
            : actions.length
              ? h('div', { class: 'mt-0.5 flex flex-wrap gap-1' }, actions)
              : null,
        ]),
      ])
    }
  },
})

defineExpose({
  /** 留言總數（含回覆） */
  count: total,
  /** 開始回覆某一則 */
  reply: (id: string) => {
    const c = props.modelValue.find((x) => x.id === id)
    if (c && canPost.value) startReply(c)
  },
})
</script>
