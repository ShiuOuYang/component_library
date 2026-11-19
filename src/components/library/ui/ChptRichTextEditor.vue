<template>
  <div class="chpt-rich-text-field">
    <div
      class="chpt-rich-text flex flex-col overflow-hidden rounded-md border bg-surface-primary"
      :class="[
        invalid || overLimit
          ? 'border-danger'
          : 'border-stroke-default focus-within:border-stroke-focus focus-within:ring-1 focus-within:ring-stroke-focus',
        props.disabled ? 'opacity-60' : '',
      ]"
    >
      <div
        v-if="!props.readonly && toolbarItems.length"
        ref="toolbarEl"
        role="toolbar"
        :aria-label="t.richText.toolbar"
        :aria-controls="id"
        class="flex flex-wrap items-center gap-0.5 border-b border-stroke-light bg-surface-secondary px-1.5 py-1"
        @keydown="onToolbarKey"
      >
        <template v-for="(tool, i) in toolbarItems" :key="tool === '|' ? `sep-${i}` : tool.name">
          <span v-if="tool === '|'" class="mx-1 h-5 w-px bg-stroke-light" aria-hidden="true"></span>
          <button
            v-else
            type="button"
            class="rt-btn"
            :class="{ 'is-active': tool.active?.() }"
            :tabindex="toolIndex(tool) === focusIndex ? 0 : -1"
            :aria-label="tool.label()"
            :title="tool.label()"
            :aria-pressed="tool.active ? !!tool.active() : undefined"
            :disabled="props.disabled || !editor || (tool.enabled ? !tool.enabled() : false)"
            :data-tool="tool.name"
            @mousedown.prevent
            @click="run(tool)"
          >
            <span v-if="tool.text" class="text-xs font-semibold">{{ tool.text }}</span>
            <ChptIcon v-else :size="18" color="current">{{ tool.icon }}</ChptIcon>
          </button>
        </template>
      </div>

      <!-- 連結網址（工具列下方的一列，不用瀏覽器的 prompt） -->
      <form
        v-if="linkOpen"
        class="flex items-center gap-2 border-b border-stroke-light bg-surface-secondary px-2 py-1.5"
        @submit.prevent="applyLink"
      >
        <label :for="`${id}-link`" class="shrink-0 text-xs text-content-secondary">{{
          t.richText.linkUrl
        }}</label>
        <input
          :id="`${id}-link`"
          ref="linkInput"
          v-model="linkUrl"
          type="url"
          placeholder="https://"
          class="h-7 min-w-0 flex-1 rounded border border-stroke-default bg-surface-primary px-2 text-sm text-content-primary focus:border-stroke-focus focus:outline-none"
          :aria-invalid="linkError ? true : undefined"
          :aria-describedby="linkError ? `${id}-link-error` : undefined"
          @keydown.esc.prevent="closeLink"
        />
        <ChptButton size="xs" type="submit">{{ t.richText.apply }}</ChptButton>
        <ChptButton size="xs" is-outline @click="closeLink">{{ t.common.cancel }}</ChptButton>
        <span v-if="linkError" :id="`${id}-link-error`" role="alert" class="text-xs text-danger">{{
          linkError
        }}</span>
      </form>

      <EditorContent
        :editor="editor"
        class="rt-content min-h-0 overflow-y-auto px-3 py-2 text-sm text-content-primary"
        :style="{
          minHeight: `${props.minHeight}px`,
          maxHeight: props.maxHeight ? `${props.maxHeight}px` : undefined,
        }"
      />

      <div
        v-if="props.showCount || props.maxLength"
        class="flex justify-end border-t border-stroke-light px-3 py-1 text-xs tabular-nums"
        :class="overLimit ? 'text-danger' : 'text-content-tertiary'"
      >
        <span :id="countId"
          >{{ t.richText.count(charCount, props.maxLength)
          }}<template v-if="overLimit"
            >（{{ t.richText.overLimit(props.maxLength!) }}）</template
          ></span
        >
      </div>
    </div>
    <p v-if="props.errorText" :id="errorId" role="alert" class="mt-1 text-xs text-danger">
      {{ props.errorText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { EditorContent, useEditor, type Editor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import ChptIcon from './ChptIcon.vue'
import ChptButton from './ChptButton.vue'
import { useFormField } from '../shared/formContext'
import { isSafeUrl } from '../shared/safeUrl'
import { useLocale } from '../shared/config'

/**
 * ChptRichTextEditor（CHPT 主題） - 富文字編輯器（Tiptap）
 *
 * 異常描述、改善報告、公告這類需要粗體、清單、連結的長文字。v-model 是 HTML 字串。
 *
 * - 工具列可以自訂（toolbar）；按鈕以 aria-pressed 表示目前格式，左右方向鍵在按鈕之間移動（roving tabindex）
 * - 連結只接受 http / https / mailto（擋掉 javascript: 這類網址）；輸入框在工具列下方，不用瀏覽器的 prompt
 * - 放在 ChptFormItem 裡：標籤、必填、錯誤訊息以 aria 屬性接到編輯區
 * - maxLength：顯示字數，超過時邊框變紅（不會截掉使用者打的字）
 * - 輸出只有 Tiptap schema 認得的標籤（貼上的 <script>、style 屬性會被丟掉）；顯示時仍請依你的環境做伺服器端過濾
 */

export type RichTextTool =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'codeBlock'
  | 'link'
  | 'undo'
  | 'redo'
  | 'clear'
  | '|'

interface ChptRichTextEditorProps {
  modelValue?: string
  placeholder?: string
  /** 工具列按鈕（'|' 是分隔線）；空陣列不顯示工具列 */
  toolbar?: RichTextTool[]
  disabled?: boolean
  /** 唯讀：不顯示工具列、不能編輯 */
  readonly?: boolean
  minHeight?: number
  maxHeight?: number
  /** 最多幾個字（只提示，不截斷） */
  maxLength?: number
  showCount?: boolean
  /** 沒有 ChptFormItem 時的名稱（螢幕閱讀器） */
  ariaLabel?: string
  errorText?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptRichTextEditorProps>(), {
  modelValue: '',
  placeholder: undefined,
  toolbar: () => [
    'bold',
    'italic',
    'underline',
    'strike',
    '|',
    'heading2',
    'heading3',
    '|',
    'bulletList',
    'orderedList',
    'blockquote',
    'codeBlock',
    '|',
    'link',
    '|',
    'undo',
    'redo',
    'clear',
  ],
  disabled: false,
  readonly: false,
  minHeight: 120,
  maxHeight: undefined,
  maxLength: undefined,
  showCount: false,
  ariaLabel: undefined,
  errorText: undefined,
})

const emit = defineEmits<{
  (e: 'update:modelValue', html: string): void
  (e: 'focus'): void
  (e: 'blur'): void
}>()

const { id, errorId, invalid, describedBy, required, labelledBy } = useFormField(
  () => props.errorText
)
const countId = `${id}-count`

const charCount = ref(0)
const overLimit = computed(() => props.maxLength !== undefined && charCount.value > props.maxLength)

/** 編輯區的 aria 屬性：跟著 FormItem 的狀態更新 */
function ariaAttributes(): Record<string, string> {
  const attrs: Record<string, string> = {
    id,
    role: 'textbox',
    'aria-multiline': 'true',
    class: 'rt-prose focus:outline-none',
  }
  if (labelledBy.value) attrs['aria-labelledby'] = labelledBy.value
  else attrs['aria-label'] = props.ariaLabel ?? props.placeholder ?? t.value.richText.placeholder
  const describe = [describedBy.value, props.showCount || props.maxLength ? countId : undefined]
    .filter(Boolean)
    .join(' ')
  if (describe) attrs['aria-describedby'] = describe
  if (invalid.value || overLimit.value) attrs['aria-invalid'] = 'true'
  if (required.value) attrs['aria-required'] = 'true'
  if (props.readonly || props.disabled) attrs['aria-readonly'] = 'true'
  return attrs
}

let lastEmitted = props.modelValue

const editor = useEditor({
  content: props.modelValue,
  editable: !props.disabled && !props.readonly,
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        isAllowedUri: (url) => isSafeUrl(url),
      },
    }),
    Placeholder.configure({ placeholder: () => props.placeholder ?? t.value.richText.placeholder }),
  ],
  editorProps: { attributes: ariaAttributes },
  onCreate: ({ editor: e }) => {
    charCount.value = e.getText().length
  },
  onUpdate: ({ editor: e }) => {
    charCount.value = e.getText().length
    // 空的編輯器輸出 ''（不是 <p></p>），表單的「必填」才判斷得出來
    const html = e.isEmpty ? '' : e.getHTML()
    lastEmitted = html
    emit('update:modelValue', html)
  },
  onFocus: () => emit('focus'),
  onBlur: () => emit('blur'),
})

// 外部改了 v-model（例如重設表單）：同步到編輯器；自己剛送出的值不要再設回去（游標會跳）
watch(
  () => props.modelValue,
  (html) => {
    const e = editor.value
    if (!e || html === lastEmitted) return
    lastEmitted = html
    e.commands.setContent(html || '', { emitUpdate: false })
    charCount.value = e.getText().length
  }
)

watch(
  () => [props.disabled, props.readonly] as const,
  ([disabled, readonly]) => editor.value?.setEditable(!disabled && !readonly)
)

// aria 屬性（錯誤、必填、字數）改變時更新編輯區
watch([invalid, required, describedBy, labelledBy, overLimit], () => {
  editor.value?.setOptions({ editorProps: { attributes: ariaAttributes } })
})

onBeforeUnmount(() => editor.value?.destroy())

// === 工具列 ===

interface Tool {
  name: Exclude<RichTextTool, '|'>
  icon?: string
  text?: string
  label: () => string
  run: (e: Editor) => void
  active?: () => boolean
  enabled?: () => boolean
}

const chain = (e: Editor) => e.chain().focus()

const TOOLS: Record<Exclude<RichTextTool, '|'>, Tool> = {
  bold: {
    name: 'bold',
    icon: 'format_bold',
    label: () => t.value.richText.bold,
    run: (e) => chain(e).toggleBold().run(),
    active: () => !!editor.value?.isActive('bold'),
  },
  italic: {
    name: 'italic',
    icon: 'format_italic',
    label: () => t.value.richText.italic,
    run: (e) => chain(e).toggleItalic().run(),
    active: () => !!editor.value?.isActive('italic'),
  },
  underline: {
    name: 'underline',
    icon: 'format_underlined',
    label: () => t.value.richText.underline,
    run: (e) => chain(e).toggleUnderline().run(),
    active: () => !!editor.value?.isActive('underline'),
  },
  strike: {
    name: 'strike',
    icon: 'strikethrough_s',
    label: () => t.value.richText.strike,
    run: (e) => chain(e).toggleStrike().run(),
    active: () => !!editor.value?.isActive('strike'),
  },
  heading2: {
    name: 'heading2',
    text: 'H2',
    label: () => t.value.richText.heading(2),
    run: (e) => chain(e).toggleHeading({ level: 2 }).run(),
    active: () => !!editor.value?.isActive('heading', { level: 2 }),
  },
  heading3: {
    name: 'heading3',
    text: 'H3',
    label: () => t.value.richText.heading(3),
    run: (e) => chain(e).toggleHeading({ level: 3 }).run(),
    active: () => !!editor.value?.isActive('heading', { level: 3 }),
  },
  bulletList: {
    name: 'bulletList',
    icon: 'format_list_bulleted',
    label: () => t.value.richText.bulletList,
    run: (e) => chain(e).toggleBulletList().run(),
    active: () => !!editor.value?.isActive('bulletList'),
  },
  orderedList: {
    name: 'orderedList',
    icon: 'format_list_numbered',
    label: () => t.value.richText.orderedList,
    run: (e) => chain(e).toggleOrderedList().run(),
    active: () => !!editor.value?.isActive('orderedList'),
  },
  blockquote: {
    name: 'blockquote',
    icon: 'format_quote',
    label: () => t.value.richText.blockquote,
    run: (e) => chain(e).toggleBlockquote().run(),
    active: () => !!editor.value?.isActive('blockquote'),
  },
  codeBlock: {
    name: 'codeBlock',
    icon: 'code_blocks',
    label: () => t.value.richText.codeBlock,
    run: (e) => chain(e).toggleCodeBlock().run(),
    active: () => !!editor.value?.isActive('codeBlock'),
  },
  link: {
    name: 'link',
    icon: 'link',
    label: () => (editor.value?.isActive('link') ? t.value.richText.unlink : t.value.richText.link),
    run: (e) =>
      e.isActive('link') ? chain(e).extendMarkRange('link').unsetLink().run() : openLink(),
    active: () => !!editor.value?.isActive('link'),
  },
  undo: {
    name: 'undo',
    icon: 'undo',
    label: () => t.value.richText.undo,
    run: (e) => chain(e).undo().run(),
    enabled: () => !!editor.value?.can().undo(),
  },
  redo: {
    name: 'redo',
    icon: 'redo',
    label: () => t.value.richText.redo,
    run: (e) => chain(e).redo().run(),
    enabled: () => !!editor.value?.can().redo(),
  },
  clear: {
    name: 'clear',
    icon: 'format_clear',
    label: () => t.value.richText.clear,
    run: (e) => chain(e).unsetAllMarks().clearNodes().run(),
  },
}

const toolbarItems = computed<Array<Tool | '|'>>(() =>
  props.toolbar.map((n) => (n === '|' ? '|' : TOOLS[n])).filter((v): v is Tool | '|' => !!v)
)
const buttons = computed(() => toolbarItems.value.filter((v): v is Tool => v !== '|'))
const toolIndex = (tool: Tool) => buttons.value.indexOf(tool)

function run(tool: Tool): void {
  if (!editor.value || props.disabled) return
  focusIndex.value = toolIndex(tool)
  tool.run(editor.value)
}

// 工具列：左右方向鍵在按鈕之間移動（roving tabindex），Home / End 到頭尾
const toolbarEl = useTemplateRef<HTMLElement>('toolbarEl')
const focusIndex = ref(0)
function onToolbarKey(e: KeyboardEvent): void {
  const n = buttons.value.length
  if (!n) return
  let next = focusIndex.value
  if (e.key === 'ArrowRight') next = (next + 1) % n
  else if (e.key === 'ArrowLeft') next = (next - 1 + n) % n
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = n - 1
  else return
  e.preventDefault()
  focusIndex.value = next
  nextTick(() =>
    toolbarEl.value
      ?.querySelector<HTMLElement>(`[data-tool="${buttons.value[next].name}"]`)
      ?.focus()
  )
}

// === 連結 ===

const linkOpen = ref(false)
const linkUrl = ref('')
const linkError = ref('')
const linkInput = useTemplateRef<HTMLInputElement>('linkInput')

function openLink(): void {
  linkUrl.value = (editor.value?.getAttributes('link').href as string | undefined) ?? ''
  linkError.value = ''
  linkOpen.value = true
  nextTick(() => linkInput.value?.focus())
}

function closeLink(): void {
  linkOpen.value = false
  editor.value?.commands.focus()
}

function applyLink(): void {
  const e = editor.value
  if (!e) return
  const url = linkUrl.value.trim()
  if (!url) {
    chain(e).extendMarkRange('link').unsetLink().run()
    linkOpen.value = false
    return
  }
  if (!isSafeUrl(url)) {
    linkError.value = t.value.richText.invalidUrl
    return
  }
  // 沒選取文字時，把網址本身插入成連結文字
  if (e.state.selection.empty && !e.isActive('link')) {
    chain(e)
      .insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href: url } }] })
      .run()
  } else {
    chain(e).extendMarkRange('link').setLink({ href: url }).run()
  }
  linkOpen.value = false
}

defineExpose({
  /** Tiptap 的 editor 實例（進階用途） */
  editor,
  focus: () => editor.value?.commands.focus(),
  /** 純文字內容 */
  getText: () => editor.value?.getText() ?? '',
})
</script>

<style scoped>
.rt-btn {
  display: inline-flex;
  min-width: 1.75rem;
  height: 1.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  padding: 0 0.25rem;
  color: rgb(var(--t-content-secondary));
}

.rt-btn:hover:not(:disabled) {
  background-color: rgb(var(--t-surface-tertiary));
  color: rgb(var(--t-content-primary));
}

.rt-btn.is-active {
  background-color: rgb(var(--t-accent-subtle));
  color: rgb(var(--t-accent-on-subtle));
}

.rt-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.rt-btn:focus-visible {
  outline: 2px solid rgb(var(--t-stroke-focus));
  outline-offset: -2px;
}

/* 編輯區的排版（ProseMirror 產生的 DOM 不經過 scoped 屬性，要用 :deep） */
.rt-content :deep(.rt-prose) {
  min-height: inherit;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.rt-content :deep(.rt-prose > * + *) {
  margin-top: 0.5em;
}

.rt-content :deep(h2) {
  font-size: 1.25em;
  font-weight: 600;
}

.rt-content :deep(h3) {
  font-size: 1.1em;
  font-weight: 600;
}

.rt-content :deep(ul) {
  list-style: disc;
  padding-left: 1.5em;
}

.rt-content :deep(ol) {
  list-style: decimal;
  padding-left: 1.5em;
}

.rt-content :deep(blockquote) {
  border-left: 3px solid rgb(var(--t-stroke-medium));
  padding-left: 0.75em;
  color: rgb(var(--t-content-secondary));
}

.rt-content :deep(pre) {
  border-radius: 0.375rem;
  background-color: rgb(var(--t-surface-tertiary));
  padding: 0.5em 0.75em;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9em;
  white-space: pre-wrap;
}

.rt-content :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.rt-content :deep(a) {
  color: rgb(var(--t-accent));
  text-decoration: underline;
}

.rt-content :deep(p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
  color: rgb(var(--t-content-tertiary));
}
</style>
