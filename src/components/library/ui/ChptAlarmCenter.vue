<template>
  <div class="flex flex-col gap-2">
    <!-- 摘要：各嚴重度「未確認」數量（也是篩選）、靜音、全部確認 -->
    <div class="flex flex-wrap items-center gap-1.5">
      <div class="flex flex-wrap gap-1.5" role="group" :aria-label="t.alarm.filterLabel">
        <button
          v-for="s in ALARM_SEVERITIES"
          :key="s"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          :class="severities.includes(s) ? 'border-stroke-focus bg-accent-subtle text-accent-on-subtle' : 'border-stroke-default bg-surface-primary text-content-secondary hover:bg-surface-tertiary'"
          :aria-pressed="severities.includes(s)"
          @click="toggleSeverity(s)"
        >
          <span class="material-symbols-outlined text-sm" :style="{ color: SEVERITY_COLOR[s] }" aria-hidden="true">{{ SEVERITY_ICON[s] }}</span>
          {{ t.alarm.severity[s] }}
          <span class="font-semibold tabular-nums text-content-primary">{{ unackedCounts[s] }}</span>
        </button>
      </div>
      <div class="ml-auto flex items-center gap-1.5">
        <ChptButton
          v-if="props.sound"
          size="xs"
          is-outline
          :icon="muted ? 'volume_off' : 'volume_up'"
          :aria-pressed="muted"
          @click="muted = !muted"
        >{{ muted ? t.alarm.unmute : t.alarm.mute }}</ChptButton>
        <ChptButton v-if="!props.readonly" size="xs" icon="done_all" :disabled="!visibleUnacked.length" @click="ackIds(visibleUnacked.map((a) => a.id))">
          {{ t.alarm.ackAll(visibleUnacked.length) }}
        </ChptButton>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <ChptSegmented v-model="view" :options="viewOptions" :aria-label="t.alarm.viewLabel" size="xs" />
      <label v-if="props.searchable" class="relative ml-auto">
        <span class="sr-only">{{ t.alarm.search }}</span>
        <span class="material-symbols-outlined pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-base text-content-tertiary" aria-hidden="true">search</span>
        <input
          v-model="query"
          type="search"
          :placeholder="t.alarm.search"
          class="h-control-sm w-52 rounded-md border border-stroke-default bg-surface-primary pl-8 pr-2 text-sm text-content-primary outline-none placeholder:text-content-disabled focus:border-stroke-focus focus:ring-1 focus:ring-stroke-focus"
        />
      </label>
    </div>

    <p v-if="!visible.length" class="rounded-md border border-dashed border-stroke-default p-6 text-center text-sm text-content-tertiary">
      {{ props.modelValue.length ? t.alarm.noMatch : t.alarm.empty }}
    </p>
    <ul
      v-else
      class="flex flex-col gap-1.5 overflow-y-auto"
      :style="props.maxHeight ? { maxHeight: `${props.maxHeight}px` } : undefined"
      :aria-label="props.label || t.alarm.label"
    >
      <li
        v-for="a in visible"
        :key="a.id"
        :ref="(el) => setRowEl(a.id, el as HTMLElement | null)"
        :tabindex="a.id === activeId ? 0 : -1"
        :aria-label="rowLabel(a)"
        :aria-expanded="expanded === a.id"
        class="relative shrink-0 overflow-hidden rounded-md border bg-surface-primary pl-3 outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
        :class="stateOf(a) === 'unacked' ? 'border-stroke-default shadow-sm' : 'border-stroke-light'"
        @focus="activeId = a.id"
        @keydown="onRowKeydown($event, a)"
      >
        <!-- 左側嚴重度色條：未確認的嚴重警報閃動（減少動態效果時不閃） -->
        <span
          class="absolute inset-y-0 left-0 w-1.5"
          :class="stateOf(a) === 'unacked' && a.severity === 'critical' ? 'motion-safe:animate-pulse' : ''"
          :style="{ background: SEVERITY_COLOR[a.severity], opacity: stateOf(a) === 'closed' ? 0.4 : 1 }"
          aria-hidden="true"
        ></span>
        <div class="flex flex-wrap items-start gap-x-3 gap-y-1 px-2 py-2">
          <button type="button" tabindex="-1" class="flex min-w-0 flex-1 basis-48 items-start gap-2 text-left" @click="toggleExpand(a)">
            <span class="material-symbols-outlined mt-0.5 text-lg" :style="{ color: SEVERITY_COLOR[a.severity] }" aria-hidden="true">{{ SEVERITY_ICON[a.severity] }}</span>
            <span class="min-w-0">
              <span class="block break-words text-sm" :class="stateOf(a) === 'unacked' ? 'font-semibold text-content-primary' : 'text-content-secondary'">
                {{ a.title }}<span v-if="(a.count ?? 1) > 1" class="ml-1 rounded bg-surface-tertiary px-1 text-xs font-medium text-content-secondary">×{{ a.count }}</span>
              </span>
              <span class="block text-xs text-content-tertiary">
                {{ [t.alarm.severity[a.severity], a.code, a.source, a.group, sinceText(a)].filter(Boolean).join(' · ') }}
              </span>
            </span>
          </button>
          <span class="flex flex-wrap items-center gap-1.5">
            <span v-if="a.cleared && stateOf(a) !== 'closed'" class="rounded bg-success-subtle px-1.5 py-0.5 text-[11px] font-medium text-success-on-subtle">{{ t.alarm.cleared }}</span>
            <span v-if="a.escalated" class="rounded bg-warning-subtle px-1.5 py-0.5 text-[11px] font-medium text-warning-on-subtle">{{ t.alarm.escalatedN(a.escalated) }}</span>
            <span class="rounded px-1.5 py-0.5 text-[11px] font-medium" :class="STATE_CLASS[stateOf(a)]">{{ t.alarm.state[stateOf(a)] }}</span>
            <template v-if="!props.readonly">
              <ChptButton v-if="stateOf(a) === 'unacked'" size="2xs" icon="check" :tabindex="a.id === activeId ? 0 : -1" @click="ackIds([a.id])">{{ t.alarm.ack }}</ChptButton>
              <ChptButton v-if="stateOf(a) === 'shelved'" size="2xs" is-outline icon="notifications_active" :tabindex="a.id === activeId ? 0 : -1" @click="unshelve([a.id])">{{ t.alarm.unshelve }}</ChptButton>
              <ChptButton
                v-else-if="stateOf(a) !== 'closed'"
                size="2xs"
                is-outline
                icon="snooze"
                :tabindex="a.id === activeId ? 0 : -1"
                :aria-expanded="shelving === a.id"
                @click="toggleShelving(a)"
              >{{ t.alarm.shelve }}</ChptButton>
              <ChptButton v-if="stateOf(a) !== 'closed'" size="2xs" is-outline icon="campaign" :tabindex="a.id === activeId ? 0 : -1" @click="escalate([a.id])">{{ t.alarm.escalate }}</ChptButton>
            </template>
          </span>
        </div>
        <!-- 暫停時間選項（放在列裡，不用浮動面板：清單捲動時不會被裁掉） -->
        <div
          v-if="shelving === a.id"
          :ref="(el) => setShelveEl(el as HTMLElement | null)"
          role="group"
          :aria-label="t.alarm.shelve"
          class="flex flex-wrap items-center gap-1.5 border-t border-stroke-light px-2 py-2"
          @keydown.esc.stop="closeShelving(true)"
        >
          <ChptButton v-for="m in props.shelveOptions" :key="m" size="2xs" is-outline @click="shelve([a.id], m)">{{ t.alarm.shelveFor(m) }}</ChptButton>
          <ChptButton size="2xs" is-outline color="secondary" @click="closeShelving(true)">{{ t.alarm.cancel }}</ChptButton>
        </div>
        <!-- 展開：說明與歷程 -->
        <div v-if="expanded === a.id" class="border-t border-stroke-light px-2 py-2 text-xs text-content-secondary">
          <p v-if="a.detail" class="mb-1 whitespace-pre-wrap text-sm text-content-primary">{{ a.detail }}</p>
          <slot name="detail" :alarm="a"></slot>
          <ul class="space-y-0.5">
            <li>{{ t.alarm.raisedAt(timeText(a.raisedAt)) }}</li>
            <li v-if="a.acked">{{ t.alarm.ackedBy(a.ackedBy ?? '', timeText(a.ackedAt)) }}</li>
            <li v-if="a.cleared">{{ t.alarm.clearedAt(timeText(a.clearedAt)) }}</li>
            <li v-if="stateOf(a) === 'shelved'">{{ t.alarm.shelvedUntil(timeText(a.shelvedUntil)) }}</li>
          </ul>
        </div>
      </li>
    </ul>
    <p class="text-xs text-content-tertiary">{{ t.alarm.hint }}</p>
    <span class="sr-only" aria-live="assertive">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ChptButton from './ChptButton.vue'
import ChptSegmented from './ChptSegmented.vue'
import { useLocale } from '../shared/config'
import { durationParts } from '../shared/equipment'
import {
  ALARM_SEVERITIES,
  ackAlarms,
  alarmState,
  countUnacked,
  escalateAlarms,
  filterAlarms,
  playAlarmTone,
  shelveAlarms,
  sortAlarms,
  toMs,
  unshelveAlarms,
  type AlarmItem,
  type AlarmSeverity,
  type AlarmState,
  type AlarmView,
} from '../shared/alarm'

/**
 * ChptAlarmCenter（CHPT 主題） - 警報中心
 *
 * 用途：要有人處理的設備 / 品質警報（ChptLogViewer 是原始紀錄，這裡是待辦）。
 *   - 依「未確認 → 已確認 → 暫停 → 已結束」、再依嚴重度與時間排序；嚴重度用顏色 + 圖示 + 文字
 *   - 確認（記下確認人與時間）、暫停一段時間（時間到自動回來）、升級（通知上一層）
 *   - 條件已恢復但沒人確認的警報仍然算未確認（短暫異常也要讓人知道），標「已恢復」
 *   - 未確認的嚴重警報色條閃動；sound 時有未確認的嚴重 / 重要警報就定時響（可靜音）
 *   - 新警報以 aria-live 念出；鍵盤：↑↓ 移動、A 確認、S 暫停、E 升級、Enter 展開說明
 *
 * v-model 是警報清單：元件的操作直接改清單（並送出 ack / shelve / escalate 事件給後端）。
 */

interface ChptAlarmCenterProps {
  /** v-model：警報清單 */
  modelValue: AlarmItem[]
  /** 目前操作的人（確認時記錄） */
  operator?: string
  /** 暫停的選項（分鐘） */
  shelveOptions?: number[]
  /** 有未確認的嚴重 / 重要警報時定時響 */
  sound?: boolean
  /** 響的間隔（毫秒） */
  soundInterval?: number
  /** 清單最大高度（px），超過時捲動 */
  maxHeight?: number
  searchable?: boolean
  /** 預設顯示 */
  defaultView?: AlarmView
  readonly?: boolean
  /** 計算時間用的現在時間；不給時每 15 秒更新 */
  now?: number | Date | null
  label?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptAlarmCenterProps>(), {
  operator: '',
  shelveOptions: () => [15, 60, 240],
  sound: false,
  soundInterval: 10_000,
  maxHeight: 0,
  searchable: true,
  defaultView: 'open',
  readonly: false,
  now: null,
  label: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: AlarmItem[]): void
  (e: 'ack', ids: string[]): void
  (e: 'shelve', ids: string[], minutes: number): void
  (e: 'unshelve', ids: string[]): void
  (e: 'escalate', ids: string[]): void
}>()

const role = (name: string) => `rgb(var(--t-${name}))`
const SEVERITY_COLOR: Record<AlarmSeverity, string> = {
  critical: role('danger-solid'),
  major: role('warning-solid'),
  minor: role('info-solid'),
  info: role('stroke-dark'),
}
const SEVERITY_ICON: Record<AlarmSeverity, string> = { critical: 'error', major: 'warning', minor: 'info', info: 'notifications' }
const STATE_CLASS: Record<AlarmState, string> = {
  unacked: 'bg-danger-subtle text-danger-on-subtle',
  acked: 'bg-accent-subtle text-accent-on-subtle',
  shelved: 'bg-surface-tertiary text-content-secondary',
  closed: 'bg-surface-tertiary text-content-tertiary',
}

// ---- 時間 ----
const clock = ref(Date.now())
let clockTimer: ReturnType<typeof setInterval> | null = null
const nowMs = computed(() => (props.now === null ? clock.value : props.now instanceof Date ? props.now.getTime() : props.now))
const stateOf = (a: AlarmItem) => alarmState(a, nowMs.value)
function sinceText(a: AlarmItem): string {
  const start = toMs(a.raisedAt)
  const p = start === null ? null : durationParts(Math.max(0, nowMs.value - start))
  return p ? t.value.alarm.since(t.value.equipment.duration(p.d, p.h, p.m)) : ''
}
const timeText = (v: AlarmItem['raisedAt'] | null | undefined) => {
  const ms = toMs(v)
  return ms === null ? '—' : new Date(ms).toLocaleString(t.value.code, { hour12: false })
}

// ---- 篩選 ----
const view = ref<AlarmView>(props.defaultView)
const severities = ref<AlarmSeverity[]>([])
const query = ref('')
function toggleSeverity(s: AlarmSeverity): void {
  severities.value = severities.value.includes(s) ? severities.value.filter((x) => x !== s) : [...severities.value, s]
}
const unackedCounts = computed(() => countUnacked(props.modelValue, nowMs.value))
const viewCount = (v: AlarmView) => filterAlarms(props.modelValue, nowMs.value, v, null).length
const viewOptions = computed(() =>
  (['open', 'unacked', 'shelved', 'all'] as AlarmView[]).map((v) => ({ label: `${t.value.alarm.view[v]} ${viewCount(v)}`, value: v }))
)
const visible = computed(() => sortAlarms(filterAlarms(props.modelValue, nowMs.value, view.value, severities.value, query.value), nowMs.value))
const visibleUnacked = computed(() => visible.value.filter((a) => stateOf(a) === 'unacked'))

// ---- 操作 ----
const announcement = ref('')
function update(next: AlarmItem[]): void {
  emit('update:modelValue', next)
}
function ackIds(ids: string[]): void {
  if (props.readonly || !ids.length) return
  update(ackAlarms(props.modelValue, ids, props.operator || undefined, nowMs.value))
  emit('ack', ids)
  announcement.value = t.value.alarm.ackedN(ids.length)
}
function shelve(ids: string[], minutes: number): void {
  if (props.readonly) return
  const wasPicking = shelving.value !== null && ids.includes(shelving.value)
  if (wasPicking) {
    // 從選項選的：該列離開清單，焦點留在同一個位置
    const i = visible.value.findIndex((x) => x.id === shelving.value)
    shelving.value = null
    keepFocus(Math.max(0, i))
  }
  update(shelveAlarms(props.modelValue, ids, minutes, nowMs.value))
  emit('shelve', ids, minutes)
  announcement.value = t.value.alarm.shelvedN(ids.length, minutes)
}
// ---- 暫停時間選項 ----
const shelving = ref<string | null>(null)
let shelveEl: HTMLElement | null = null
const setShelveEl = (el: HTMLElement | null) => (shelveEl = el)
function toggleShelving(a: AlarmItem): void {
  activeId.value = a.id
  if (shelving.value === a.id) return closeShelving(false)
  shelving.value = a.id
  void nextTick(() => shelveEl?.querySelector('button')?.focus())
}
function closeShelving(refocus: boolean): void {
  const id = shelving.value
  shelving.value = null
  if (refocus && id) void nextTick(() => rowEls.get(id)?.focus())
}
function unshelve(ids: string[]): void {
  if (props.readonly) return
  update(unshelveAlarms(props.modelValue, ids))
  emit('unshelve', ids)
}
function escalate(ids: string[]): void {
  if (props.readonly) return
  update(escalateAlarms(props.modelValue, ids))
  emit('escalate', ids)
  announcement.value = t.value.alarm.escalatedAnnounce(ids.length)
}

function rowLabel(a: AlarmItem): string {
  const parts = [t.value.alarm.severity[a.severity], a.title, a.source ?? '', t.value.alarm.state[stateOf(a)], sinceText(a)]
  if (a.cleared && stateOf(a) !== 'closed') parts.push(t.value.alarm.cleared)
  return parts.filter(Boolean).join(', ')
}

// ---- 展開、鍵盤 ----
const expanded = ref<string | null>(null)
function toggleExpand(a: AlarmItem): void {
  expanded.value = expanded.value === a.id ? null : a.id
  activeId.value = a.id
}
const rowEls = new Map<string, HTMLElement>()
function setRowEl(id: string, el: HTMLElement | null): void {
  if (el) rowEls.set(id, el)
  else rowEls.delete(id)
}
const activeId = ref<string | null>(null)
watch(
  visible,
  (list) => {
    if (!list.some((a) => a.id === activeId.value)) activeId.value = list[0]?.id ?? null
  },
  { immediate: true }
)
/** 操作後該列可能離開清單（確認後結束、暫停）：焦點留在同一個位置的列，不掉到 body */
function keepFocus(index: number): void {
  void nextTick(() => {
    const list = visible.value
    const target = list[Math.min(index, list.length - 1)]
    if (!target) return
    activeId.value = target.id
    rowEls.get(target.id)?.focus()
  })
}
function onRowKeydown(e: KeyboardEvent, a: AlarmItem): void {
  if (e.target !== e.currentTarget) return // 按鈕上的按鍵交給按鈕
  const list = visible.value
  const i = list.findIndex((x) => x.id === a.id)
  let next: AlarmItem | undefined
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
  if (key === 'ArrowDown') next = list[i + 1]
  else if (key === 'ArrowUp') next = list[i - 1]
  else if (key === 'Home') next = list[0]
  else if (key === 'End') next = list[list.length - 1]
  else if (key === 'Enter' || key === ' ') {
    e.preventDefault()
    toggleExpand(a)
    return
  } else if (!props.readonly && key === 'a' && stateOf(a) === 'unacked') {
    ackIds([a.id])
    keepFocus(i)
    return
  } else if (!props.readonly && key === 's' && stateOf(a) !== 'closed') {
    if (stateOf(a) === 'shelved') unshelve([a.id])
    else shelve([a.id], props.shelveOptions[0] ?? 15)
    keepFocus(i)
    return
  } else if (!props.readonly && key === 'e' && stateOf(a) !== 'closed') {
    escalate([a.id])
    return
  } else return
  e.preventDefault()
  if (!next) return
  activeId.value = next.id
  const id = next.id
  void nextTick(() => rowEls.get(id)?.focus())
}

// ---- 新警報：念出、響 ----
const muted = ref(false)
let audio: AudioContext | null = null
function audioCtx(): AudioContext | null {
  if (audio) return audio
  const Ctx = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext
  try {
    audio = Ctx ? new Ctx() : null
  } catch {
    audio = null
  }
  return audio
}
const loud = (a: AlarmItem) => (a.severity === 'critical' || a.severity === 'major') && stateOf(a) === 'unacked'
let known = new Set(props.modelValue.map((a) => a.id))
watch(
  () => props.modelValue,
  (list) => {
    if (props.now === null) clock.value = Date.now() // 清單更新時順便更新時間，新警報不會顯示成負的經過時間
    const fresh = list.filter((a) => !known.has(a.id) && stateOf(a) === 'unacked')
    known = new Set(list.map((a) => a.id))
    if (!fresh.length) return
    const top = sortAlarms(fresh, nowMs.value)[0]
    announcement.value = t.value.alarm.newAlarm(t.value.alarm.severity[top.severity], top.source ?? '', top.title, fresh.length)
    if (props.sound && !muted.value && loud(top)) playAlarmTone(audioCtx(), top.severity)
  }
)
let soundTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  if (props.now === null) clockTimer = setInterval(() => (clock.value = Date.now()), 15_000)
  if (props.sound)
    soundTimer = setInterval(() => {
      if (muted.value) return
      const worst = sortAlarms(props.modelValue.filter(loud), nowMs.value)[0]
      if (worst) playAlarmTone(audioCtx(), worst.severity)
    }, props.soundInterval)
})
onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (soundTimer) clearInterval(soundTimer)
  void audio?.close?.()
})

defineExpose({
  /** 確認指定的警報（沒給時確認目前畫面上所有未確認的） */
  ack: (ids?: string[]) => ackIds(ids ?? visibleUnacked.value.map((a) => a.id)),
})
</script>
