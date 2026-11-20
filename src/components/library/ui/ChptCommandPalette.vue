<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-100"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-75"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-modal flex items-start justify-center p-4 pt-[12vh]">
        <div class="absolute inset-0 bg-black/40" aria-hidden="true" @click="close"></div>

        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="props.title ?? t.commandPalette.title"
          class="chpt-command-palette relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-stroke-light bg-surface-primary shadow-2xl"
        >
          <div class="flex items-center gap-2 border-b border-stroke-light px-3">
            <ChptIcon :size="20" color="current" class="shrink-0 text-content-tertiary" aria-hidden="true">search</ChptIcon>
            <input
              ref="input"
              v-model="query"
              type="text"
              role="combobox"
              aria-autocomplete="list"
              :aria-expanded="true"
              :aria-controls="listId"
              :aria-activedescendant="activeId"
              :aria-label="props.title ?? t.commandPalette.title"
              :placeholder="props.placeholder ?? t.commandPalette.placeholder"
              autocomplete="off"
              spellcheck="false"
              class="h-12 min-w-0 flex-1 bg-transparent text-base text-content-primary placeholder:text-content-tertiary focus:outline-none"
              @keydown="onKey"
            />
            <kbd class="hidden shrink-0 rounded border border-stroke-default px-1.5 py-0.5 text-[11px] text-content-tertiary sm:inline">Esc</kbd>
          </div>

          <div ref="scroller" class="min-h-0 flex-1 overflow-y-auto p-1.5">
            <ul :id="listId" role="listbox" :aria-label="props.title ?? t.commandPalette.title">
              <template v-for="section in sections" :key="section.name">
                <li v-if="section.name" role="presentation" class="px-2.5 pb-1 pt-2 text-xs font-medium text-content-tertiary">{{ section.name }}</li>
                <li
                  v-for="row in section.rows"
                  :id="optionId(row.index)"
                  :key="`${section.name}-${row.item.id}`"
                  role="option"
                  :aria-selected="row.index === active"
                  :aria-disabled="row.item.disabled || undefined"
                  class="chpt-command-item flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm"
                  :class="[
                    row.index === active ? 'bg-surface-tertiary text-content-primary' : 'text-content-secondary',
                    row.item.disabled ? 'cursor-not-allowed opacity-50' : '',
                  ]"
                  @mousemove="active = row.index"
                  @click="run(row.item)"
                >
                  <ChptIcon v-if="row.item.icon" :size="18" color="current" class="shrink-0" aria-hidden="true">{{ row.item.icon }}</ChptIcon>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-content-primary">
                      <template v-for="(part, i) in row.parts" :key="i"><mark v-if="part.match" class="bg-transparent font-semibold text-accent">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template>
                    </span>
                    <span v-if="row.item.description" class="block truncate text-xs text-content-tertiary">{{ row.item.description }}</span>
                  </span>
                  <span v-if="row.showGroup && row.item.group" class="shrink-0 text-xs text-content-tertiary">{{ row.item.group }}</span>
                  <span v-if="row.item.shortcut" class="flex shrink-0 gap-0.5" aria-hidden="true">
                    <kbd v-for="k in formatHotkey(row.item.shortcut)" :key="k" class="rounded border border-stroke-default bg-surface-secondary px-1.5 py-0.5 text-[11px] text-content-tertiary">{{ k }}</kbd>
                  </span>
                </li>
              </template>
            </ul>
            <p v-if="!flat.length" class="px-3 py-8 text-center text-sm text-content-tertiary">
              <slot name="empty" :query="query">{{ props.emptyText ?? t.commandPalette.empty }}</slot>
            </p>
          </div>

          <div class="hidden items-center gap-4 border-t border-stroke-light px-3 py-2 text-[11px] text-content-tertiary sm:flex" aria-hidden="true">
            <span><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> {{ t.commandPalette.navigate }}</span>
            <span><kbd class="kbd">↵</kbd> {{ t.commandPalette.run }}</span>
            <span><kbd class="kbd">Esc</kbd> {{ t.commandPalette.close }}</span>
          </div>
          <span class="sr-only" aria-live="polite">{{ query ? t.commandPalette.results(flat.length) : '' }}</span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, useTemplateRef, watch } from 'vue'
import ChptIcon from './ChptIcon.vue'
import { useOverlay } from '../shared/useOverlay'
import { useOptionalRouter } from '../shared/useOptionalRouter'
import { readStoredJSON, writeStoredJSON } from '../shared/safeStorage'
import { formatHotkey, highlightParts, matchHotkey, scoreCommand } from '../shared/commandSearch'
import { useLocale } from '../shared/config'

/**
 * ChptCommandPalette（CHPT 主題） - 指令面板（Ctrl / ⌘ + K）
 *
 * 系統頁面一多，選單要點好幾層才找得到。指令面板讓使用者打幾個字就跳到頁面或執行動作：
 * 「工單」「spc」「切換深色」…
 *
 * - 模糊搜尋標籤、關鍵字、群組與說明（打「gd」也找得到 keywords 有 'gongdan' 的「工單查詢」）
 * - 方向鍵選擇、Enter 執行、Esc 關閉；input 是 combobox，結果以 aria-activedescendant 指向
 * - 指令可以給 to（有 vue-router 時切換頁面）或 perform（執行函式）
 * - recentKey：記住最近用過的指令（localStorage），沒輸入時列在最上面
 * - hotkey：全域快捷鍵（預設 mod+k，mod 在 Mac 是 ⌘、其他是 Ctrl）；false 為不綁
 */

export interface CommandItem {
  id: string
  label: string
  /** 分組名稱（沒輸入時依此分組；搜尋時顯示在右側） */
  group?: string
  /** 額外的搜尋字（英文代號、拼音、舊名稱…） */
  keywords?: string[]
  description?: string
  /** Material Symbols 圖示名稱 */
  icon?: string
  /** 顯示用的快捷鍵（例如 'mod+s'）；只顯示，不會綁定 */
  shortcut?: string
  disabled?: boolean
  /** 切換到這個路由（需要 vue-router） */
  to?: string
  /** 執行的動作 */
  perform?: () => void | Promise<void>
}

interface ChptCommandPaletteProps {
  /** 是否開啟（v-model） */
  modelValue?: boolean
  commands: CommandItem[]
  /** 全域快捷鍵；false 為不綁 */
  hotkey?: string | false
  placeholder?: string
  emptyText?: string
  /** 對話框名稱（螢幕閱讀器念的） */
  title?: string
  /** 記住最近使用的指令（localStorage 的鍵）；不給則不記 */
  recentKey?: string
  /** 最近使用最多列幾個 */
  maxRecent?: number
  /** 搜尋結果最多列幾個 */
  maxResults?: number
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptCommandPaletteProps>(), {
  modelValue: false,
  hotkey: 'mod+k',
  placeholder: undefined,
  emptyText: undefined,
  title: undefined,
  recentKey: undefined,
  maxRecent: 5,
  maxResults: 50,
})

const emit = defineEmits<{
  (e: 'update:modelValue', open: boolean): void
  /** 執行了一個指令（在 perform / 切換頁面之前送出） */
  (e: 'select', item: CommandItem): void
}>()

const { router } = useOptionalRouter()
const panel = useTemplateRef<HTMLElement>('panel')
const input = useTemplateRef<HTMLInputElement>('input')
const scroller = useTemplateRef<HTMLElement>('scroller')

const open = computed(() => props.modelValue)
const query = ref('')
const active = ref(0)
const uid = useId()
const listId = `${uid}-list`
const optionId = (i: number) => `${uid}-opt-${i}`

function setOpen(value: boolean): void {
  emit('update:modelValue', value)
}
function close(): void {
  setOpen(false)
}

useOverlay(() => open.value, panel, {
  onEscape: close,
  initialFocus: () => input.value,
})

// === 最近使用 ===

const recentIds = ref<string[]>([])
function loadRecent(): void {
  if (!props.recentKey) return
  const raw = readStoredJSON<unknown[]>(`chpt-command:${props.recentKey}`, [], Array.isArray)
  recentIds.value = raw.filter((v): v is string => typeof v === 'string')
}
function remember(id: string): void {
  if (!props.recentKey) return
  recentIds.value = [id, ...recentIds.value.filter((v) => v !== id)].slice(0, Math.max(0, props.maxRecent))
  // 無痕模式或空間不足時只是記不住，不影響使用
  writeStoredJSON(`chpt-command:${props.recentKey}`, recentIds.value)
}

// === 結果 ===

interface Row {
  item: CommandItem
  index: number
  parts: Array<{ text: string; match: boolean }>
  showGroup: boolean
}

const sections = computed<Array<{ name: string; rows: Row[] }>>(() => {
  const q = query.value.trim()
  let index = 0
  if (q) {
    const ranked = props.commands
      .map((item, order) => ({ item, order, m: scoreCommand(q, item) }))
      .filter((r) => r.m.score > 0)
      .sort((a, b) => b.m.score - a.m.score || a.order - b.order)
      .slice(0, props.maxResults)
    return [{ name: '', rows: ranked.map((r) => ({ item: r.item, index: index++, parts: highlightParts(r.item.label, r.m.indices), showGroup: true })) }]
  }
  const out: Array<{ name: string; rows: Row[] }> = []
  const byId = new Map(props.commands.map((c) => [c.id, c]))
  const recent = recentIds.value.map((id) => byId.get(id)).filter((c): c is CommandItem => !!c)
  if (recent.length) {
    out.push({ name: t.value.commandPalette.recent, rows: recent.map((item) => ({ item, index: index++, parts: [{ text: item.label, match: false }], showGroup: true })) })
  }
  const groups = new Map<string, CommandItem[]>()
  for (const c of props.commands) {
    const g = c.group ?? ''
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g)!.push(c)
  }
  for (const [name, items] of groups) {
    out.push({ name, rows: items.map((item) => ({ item, index: index++, parts: [{ text: item.label, match: false }], showGroup: false })) })
  }
  return out
})

const flat = computed(() => sections.value.flatMap((s) => s.rows))
const activeId = computed(() => (flat.value[active.value] ? optionId(active.value) : undefined))

/** 第一個可以執行的位置（跳過停用的） */
function firstEnabled(from: number, dir: 1 | -1): number {
  const n = flat.value.length
  for (let k = 0; k < n; k++) {
    const i = (from + dir * k + n * 2) % n
    if (!flat.value[i].item.disabled) return i
  }
  return -1
}

watch(query, () => {
  active.value = flat.value.length ? Math.max(0, firstEnabled(0, 1)) : 0
})

watch(open, async (value) => {
  if (!value) return
  query.value = ''
  loadRecent()
  await nextTick()
  active.value = flat.value.length ? Math.max(0, firstEnabled(0, 1)) : 0
})

function scrollActiveIntoView(): void {
  nextTick(() => {
    const el = scroller.value?.querySelector<HTMLElement>(`#${CSS.escape(optionId(active.value))}`)
    el?.scrollIntoView?.({ block: 'nearest' })
  })
}

function move(delta: number): void {
  const n = flat.value.length
  if (!n) return
  const next = firstEnabled((active.value + delta + n) % n, delta > 0 ? 1 : -1)
  if (next >= 0) active.value = next
  scrollActiveIntoView()
}

function onKey(e: KeyboardEvent): void {
  if (e.isComposing) return
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      move(1)
      break
    case 'ArrowUp':
      e.preventDefault()
      move(-1)
      break
    case 'Home':
      if (!query.value) {
        e.preventDefault()
        active.value = Math.max(0, firstEnabled(0, 1))
        scrollActiveIntoView()
      }
      break
    case 'End':
      if (!query.value) {
        e.preventDefault()
        active.value = Math.max(0, firstEnabled(flat.value.length - 1, -1))
        scrollActiveIntoView()
      }
      break
    case 'Enter': {
      e.preventDefault()
      const row = flat.value[active.value]
      if (row) run(row.item)
      break
    }
  }
}

async function run(item: CommandItem): Promise<void> {
  if (item.disabled) return
  emit('select', item)
  remember(item.id)
  close()
  // 等面板關掉、焦點歸還之後再執行：動作若開了另一個對話框，焦點才不會被搶回來
  await nextTick()
  if (item.to && router) await router.push(item.to)
  await item.perform?.()
}

// === 全域快捷鍵 ===

function onGlobalKey(e: KeyboardEvent): void {
  if (!props.hotkey || e.isComposing) return
  if (!matchHotkey(e, props.hotkey)) return
  e.preventDefault()
  setOpen(!open.value)
}
onMounted(() => window.addEventListener('keydown', onGlobalKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKey))

defineExpose({
  open: () => setOpen(true),
  close,
  toggle: () => setOpen(!open.value),
})
</script>

<style scoped>
.kbd {
  display: inline-block;
  margin-right: 2px;
  border-radius: 0.25rem;
  border: 1px solid rgb(var(--t-stroke-default));
  padding: 0 0.3rem;
  font-family: inherit;
}
</style>
