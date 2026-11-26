<template>
  <div class="flex flex-col gap-2">
    <!-- 工具列 -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex flex-wrap gap-1" role="group" :aria-label="t.logViewer.levels">
        <button
          v-for="lv in LOG_LEVELS"
          :key="lv"
          type="button"
          class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          :class="levelOn(lv) ? 'border-stroke-focus bg-accent-subtle text-accent-on-subtle' : 'border-stroke-default bg-surface-primary text-content-tertiary line-through'"
          :aria-pressed="levelOn(lv)"
          @click="toggleLevel(lv)"
        >
          <span class="h-2 w-2 rounded-full" :style="{ background: LEVEL_COLOR[lv] }" aria-hidden="true"></span>
          {{ t.logViewer.level[lv] }}
          <span class="tabular-nums">{{ counts[lv] }}</span>
        </button>
      </div>
      <label class="relative min-w-[12rem] flex-1 sm:max-w-xs">
        <span class="sr-only">{{ t.logViewer.search }}</span>
        <span class="material-symbols-outlined pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-base text-content-tertiary" aria-hidden="true">search</span>
        <input
          v-model="query"
          type="search"
          :placeholder="t.logViewer.searchPlaceholder"
          :aria-invalid="matcher.error ? 'true' : undefined"
          :aria-describedby="matcher.error ? `${uid}-search-err` : undefined"
          class="h-control-sm w-full rounded-md border bg-surface-primary pl-8 pr-2 font-mono text-xs text-content-primary outline-none placeholder:font-sans placeholder:text-content-disabled focus:ring-1"
          :class="matcher.error ? 'border-danger focus:ring-danger' : 'border-stroke-default focus:border-stroke-focus focus:ring-stroke-focus'"
        />
      </label>
      <ChptSwitch v-model="follow" :label="t.logViewer.follow" size="sm" />
      <div class="ml-auto flex gap-1.5">
        <ChptButton size="xs" is-outline icon="content_copy" :disabled="!visible.length" @click="copyVisible">{{ t.logViewer.copy }}</ChptButton>
        <ChptButton size="xs" is-outline icon="download" :disabled="!visible.length" @click="download">{{ t.logViewer.download }}</ChptButton>
      </div>
    </div>
    <p v-if="matcher.error" :id="`${uid}-search-err`" class="text-xs text-danger">{{ t.logViewer.regexError(matcher.error) }}</p>

    <!-- 清單（只畫看得到的列） -->
    <div class="relative">
      <div
        ref="scroller"
        role="listbox"
        :aria-label="props.label || t.logViewer.label"
        :aria-activedescendant="activeIndex !== null && visible[activeIndex] ? rowId(activeIndex) : undefined"
        tabindex="0"
        class="overflow-auto rounded-md border border-stroke-light bg-surface-secondary font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
        :style="{ height: `${props.height}px` }"
        @scroll="onScroll"
        @keydown="onKeydown"
      >
        <p v-if="!visible.length" class="p-4 text-center font-sans text-sm text-content-tertiary">
          {{ props.entries.length ? t.logViewer.noMatch : t.logViewer.empty }}
        </p>
        <div v-else class="relative" :style="{ height: `${visible.length * props.rowHeight}px`, minWidth: '100%' }">
          <div
            v-for="i in rangeIndices"
            :id="rowId(i)"
            :key="keyOf(visible[i], i)"
            role="option"
            :aria-selected="selectedIndex === i"
            class="absolute inset-x-0 flex cursor-pointer items-center gap-2 whitespace-nowrap px-2"
            :class="[
              selectedIndex === i ? 'bg-accent-subtle' : activeIndex === i ? 'bg-surface-tertiary' : i % 2 ? 'bg-surface-primary/40' : '',
              visible[i].level === 'error' || visible[i].level === 'fatal' ? 'text-danger' : 'text-content-primary',
            ]"
            :style="{ top: `${i * props.rowHeight}px`, height: `${props.rowHeight}px` }"
            :title="visible[i].message"
            @click="onRowClick(i)"
          >
            <span class="w-[6.5rem] flex-shrink-0 tabular-nums text-content-tertiary">{{ timeText(visible[i]) }}</span>
            <span
              class="w-12 flex-shrink-0 rounded px-1 text-center text-[10px] font-bold"
              :style="levelBadgeStyle(visible[i].level)"
            >{{ LEVEL_SHORT[visible[i].level] }}</span>
            <span v-if="hasSources" class="w-24 flex-shrink-0 truncate text-content-secondary">{{ visible[i].source ?? '' }}</span>
            <span class="min-w-0 flex-1 truncate">
              <template v-for="(seg, si) in matcher.segments(visible[i].message)" :key="si">
                <mark v-if="seg.match" class="rounded-sm bg-warning-subtle px-0.5 text-warning-on-subtle">{{ seg.text }}</mark>
                <template v-else>{{ seg.text }}</template>
              </template>
            </span>
          </div>
        </div>
      </div>
      <!-- 暫停跟隨時有新紀錄：跳到最新 -->
      <button
        v-if="follow && unseen > 0"
        type="button"
        class="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-accent-solid px-3 py-1 text-xs font-medium text-white shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus focus-visible:ring-offset-2"
        @click="scrollToEnd"
      >
        {{ t.logViewer.newEntries(unseen) }} ↓
      </button>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-content-tertiary">
      <span>{{ t.logViewer.showing(visible.length, props.entries.length) }}</span>
      <span v-if="!atBottom && follow" class="text-content-secondary">{{ t.logViewer.paused }}</span>
    </div>

    <!-- 選取的那一筆：完整內容 -->
    <div v-if="selected" class="rounded-md border border-stroke-light bg-surface-primary p-3 text-sm">
      <div class="mb-1 flex flex-wrap items-center gap-2 text-xs text-content-secondary">
        <span class="rounded px-1 font-bold" :style="levelBadgeStyle(selected.level)">{{ LEVEL_SHORT[selected.level] }}</span>
        <span class="font-mono">{{ fullTime(selected) }}</span>
        <span v-if="selected.source">{{ selected.source }}</span>
        <ChptButton size="2xs" is-outline icon="content_copy" class="ml-auto" @click="copyOne(selected)">{{ t.logViewer.copyOne }}</ChptButton>
      </div>
      <pre class="whitespace-pre-wrap break-words font-mono text-xs text-content-primary">{{ selected.message }}</pre>
    </div>

    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId, watch } from 'vue'
import ChptButton from './ChptButton.vue'
import ChptSwitch from './ChptSwitch.vue'
import { useLocale } from '../shared/config'
import {
  LOG_LEVELS,
  compileSearch,
  countLevels,
  filterLogs,
  formatLogLine,
  formatLogTime,
  toDate,
  type LogEntry,
  type LogLevel,
} from '../shared/logViewer'

/**
 * ChptLogViewer（CHPT 主題） - 設備日誌檢視器
 *
 * 用途：設備、通訊、排程的即時日誌 —— 幾萬筆也順，只畫看得到的列。
 *   - 等級篩選（顯示各等級筆數）、搜尋並標出關鍵字；寫成 /pattern/i 時是正規式（寫錯時提示並退回一般搜尋）
 *   - 跟隨最新：新紀錄進來時自動捲到底；往上捲就暫停並顯示「N 筆新紀錄」，點一下回到最新
 *   - 點一列看完整內容（訊息可能很長、有換行）；複製或下載目前篩選後的紀錄
 *   - 鍵盤：清單一個 Tab 停駐點，↑↓ / PageUp / PageDown / Home / End 移動，Enter 看完整內容，Esc 取消
 *   - 新的 error / fatal 以 aria-live 念出（announceLevels）
 *
 * 筆數上限由呼叫端控制（例如只保留最後 5,000 筆）：元件不會自己丟掉資料。
 */

interface ChptLogViewerProps {
  entries: LogEntry[]
  /** 清單高度（px） */
  height?: number
  /** 每列高度（px） */
  rowHeight?: number
  /** 預設顯示的等級 */
  defaultLevels?: LogLevel[]
  /** 預設跟隨最新 */
  defaultFollow?: boolean
  /** 新紀錄是這些等級時以 aria-live 念出 */
  announceLevels?: LogLevel[]
  /** 時間顯示格式；預設 HH:mm:ss.SSS */
  timeFormat?: ((time: Date) => string) | null
  /** 下載的檔名（不含副檔名）；預設 log-時間 */
  fileName?: string
  /** 清單名稱（螢幕閱讀器） */
  label?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptLogViewerProps>(), {
  height: 360,
  rowHeight: 24,
  defaultLevels: () => ['info', 'warn', 'error', 'fatal'],
  defaultFollow: true,
  announceLevels: () => ['error', 'fatal'],
  timeFormat: null,
  fileName: '',
  label: '',
})

const emit = defineEmits<{
  /** 選取一筆（再點一次或 Esc 取消時為 null） */
  (e: 'select', entry: LogEntry | null): void
}>()

const uid = useId()
const rowId = (i: number) => `${uid}-row-${i}`

const role = (name: string) => `rgb(var(--t-${name}))`
const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: role('stroke-dark'),
  info: role('info-solid'),
  warn: role('warning-solid'),
  error: role('danger-solid'),
  fatal: role('danger-solid'),
}
const LEVEL_SHORT: Record<LogLevel, string> = { debug: 'DEBUG', info: 'INFO', warn: 'WARN', error: 'ERROR', fatal: 'FATAL' }
function levelBadgeStyle(lv: LogLevel): Record<string, string> {
  // fatal 實心底白字（最醒目）；其他是淡底 + 等級色文字
  if (lv === 'fatal') return { background: LEVEL_COLOR.fatal, color: '#fff' }
  // 淡底與文字用設計系統成對的 subtle / on-subtle（兩種主題都驗過對比）
  if (lv === 'debug') return { background: role('surface-tertiary'), color: role('content-secondary') }
  const tone = lv === 'info' ? 'info' : lv === 'warn' ? 'warning' : 'danger'
  return { background: role(`${tone}-subtle`), color: role(`${tone}-on-subtle`) }
}

// ---- 篩選 ----
const levels = ref<LogLevel[]>([...props.defaultLevels])
const levelOn = (lv: LogLevel) => levels.value.includes(lv)
function toggleLevel(lv: LogLevel): void {
  levels.value = levelOn(lv) ? levels.value.filter((x) => x !== lv) : [...levels.value, lv]
}
const query = ref('')
const matcher = computed(() => compileSearch(query.value))
const counts = computed(() => countLevels(props.entries))
const visible = computed(() => filterLogs(props.entries, levels.value, matcher.value))
const hasSources = computed(() => props.entries.some((e) => e.source))
const keyOf = (e: LogEntry, i: number) => e.id ?? `${i}`

const timeText = (e: LogEntry) => (props.timeFormat ? props.timeFormat(toDate(e.time)) : formatLogTime(e.time))
const fullTime = (e: LogEntry) => {
  const d = toDate(e.time)
  return Number.isNaN(d.getTime()) ? String(e.time) : d.toLocaleString(t.value.code, { hour12: false }) + `.${String(d.getMilliseconds()).padStart(3, '0')}`
}

// ---- 虛擬捲動：只畫看得到的列（上下多畫幾列緩衝） ----
const scroller = ref<HTMLDivElement | null>(null)
const scrollTop = ref(0)
const OVERSCAN = 8
const rangeIndices = computed(() => {
  const first = Math.max(0, Math.floor(scrollTop.value / props.rowHeight) - OVERSCAN)
  const count = Math.ceil(props.height / props.rowHeight) + OVERSCAN * 2
  const last = Math.min(visible.value.length, first + count)
  return Array.from({ length: Math.max(0, last - first) }, (_, k) => first + k)
})

// ---- 跟隨最新 ----
const follow = ref(props.defaultFollow)
const atBottom = ref(true)
const unseen = ref(0)
function measureBottom(): boolean {
  const el = scroller.value
  if (!el) return true
  return el.scrollTop + el.clientHeight >= el.scrollHeight - props.rowHeight
}
function onScroll(): void {
  const el = scroller.value!
  scrollTop.value = el.scrollTop
  atBottom.value = measureBottom()
  if (atBottom.value) unseen.value = 0
}
function scrollToEnd(): void {
  const el = scroller.value
  if (!el) return
  el.scrollTop = el.scrollHeight
  scrollTop.value = el.scrollTop
  atBottom.value = true
  unseen.value = 0
}
const announcement = ref('')
/**
 * 新紀錄偵測：看「上一次最後一筆」現在在哪裡，而不是看筆數 ——
 * 呼叫端通常只保留最後 N 筆（push 一筆、從前面 splice 一筆），筆數不變但其實有新紀錄。
 */
let lastSeen: LogEntry | undefined = props.entries[props.entries.length - 1]
watch(
  () => [props.entries.length, props.entries[props.entries.length - 1]] as const,
  () => {
    const list = props.entries
    const prevIdx = lastSeen ? list.lastIndexOf(lastSeen) : -1
    // 找不到上一次的最後一筆：整份換掉了（重新載入），全部算新的但不念出
    const added = prevIdx >= 0 ? list.length - 1 - prevIdx : 0
    lastSeen = list[list.length - 1]
    if (!added) {
      if (follow.value && atBottom.value) void nextTick(scrollToEnd)
      return
    }
    const fresh = list.slice(-added)
    const loud = fresh.filter((e) => props.announceLevels.includes(e.level))
    if (loud.length) announcement.value = t.value.logViewer.announce(loud.length, loud[loud.length - 1].message)
    if (!follow.value) return
    if (atBottom.value) void nextTick(scrollToEnd)
    else unseen.value += fresh.filter((e) => visible.value.includes(e)).length
  }
)
watch(follow, (on) => {
  if (on) void nextTick(scrollToEnd)
})
onMounted(() => {
  if (follow.value) scrollToEnd()
})

// ---- 選取與鍵盤 ----
const activeIndex = ref<number | null>(null)
const selectedEntry = ref<LogEntry | null>(null)
const selectedIndex = computed(() => (selectedEntry.value ? visible.value.indexOf(selectedEntry.value) : -1))
const selected = computed(() => (selectedIndex.value >= 0 ? selectedEntry.value : null))
function select(i: number | null): void {
  const e = i === null ? null : visible.value[i] ?? null
  selectedEntry.value = e && e === selectedEntry.value ? null : e
  emit('select', selectedEntry.value)
}
function onRowClick(i: number): void {
  activeIndex.value = i
  select(i)
}
function reveal(i: number): void {
  const el = scroller.value
  if (!el) return
  const top = i * props.rowHeight
  if (top < el.scrollTop) el.scrollTop = top
  else if (top + props.rowHeight > el.scrollTop + el.clientHeight) el.scrollTop = top + props.rowHeight - el.clientHeight
  scrollTop.value = el.scrollTop
  atBottom.value = measureBottom()
}
function onKeydown(event: KeyboardEvent): void {
  const n = visible.value.length
  if (!n) return
  const page = Math.max(1, Math.floor(props.height / props.rowHeight) - 1)
  const cur = activeIndex.value ?? (event.key === 'ArrowUp' || event.key === 'End' ? n : -1)
  let next: number | null = null
  switch (event.key) {
    case 'ArrowDown':
      next = Math.min(n - 1, cur + 1)
      break
    case 'ArrowUp':
      next = Math.max(0, cur - 1)
      break
    case 'PageDown':
      next = Math.min(n - 1, Math.max(0, cur) + page)
      break
    case 'PageUp':
      next = Math.max(0, cur - page)
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = n - 1
      break
    case 'Enter':
    case ' ':
      if (activeIndex.value !== null) {
        event.preventDefault()
        select(activeIndex.value)
      }
      return
    case 'Escape':
      if (selectedEntry.value) {
        event.preventDefault()
        select(null)
      }
      return
    default:
      return
  }
  event.preventDefault()
  activeIndex.value = next
  reveal(next)
}
// 篩選改變時：游標可能超出範圍；原本在最下面（跟隨中）就繼續停在最下面
watch([levels, query], () => {
  const list = visible.value
  if (activeIndex.value !== null && activeIndex.value >= list.length) activeIndex.value = list.length ? list.length - 1 : null
  if (follow.value && atBottom.value) void nextTick(scrollToEnd)
})

// ---- 複製、下載 ----
async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
async function copyVisible(): Promise<void> {
  const ok = await writeClipboard(visible.value.map(formatLogLine).join('\n'))
  announcement.value = ok ? t.value.logViewer.copied(visible.value.length) : t.value.logViewer.copyFailed
}
async function copyOne(e: LogEntry): Promise<void> {
  const ok = await writeClipboard(formatLogLine(e))
  announcement.value = ok ? t.value.logViewer.copied(1) : t.value.logViewer.copyFailed
}
function download(): void {
  const blob = new Blob([visible.value.map(formatLogLine).join('\n') + '\n'], { type: 'text/plain;charset=utf-8' })
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${props.fileName || `log-${stamp}`}.log`
  a.click()
  URL.revokeObjectURL(a.href)
}

defineExpose({
  scrollToEnd,
  /** 目前篩選後的紀錄 */
  visibleEntries: () => visible.value,
})
</script>
