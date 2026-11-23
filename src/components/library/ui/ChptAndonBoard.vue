<template>
  <div ref="rootRef" class="andon-board flex flex-col gap-3 bg-surface-primary" :class="isFullscreen ? 'h-full overflow-auto p-6' : ''">
    <!-- 摘要：各原因進行中的數量、時鐘、全螢幕 -->
    <div class="flex flex-wrap items-center gap-2" :class="tv ? 'text-lg' : 'text-sm'">
      <h3 v-if="props.title" class="font-semibold text-content-primary" :class="tv ? 'text-2xl' : 'text-base'">{{ props.title }}</h3>
      <span
        v-for="ty in types"
        :key="ty.key"
        class="inline-flex items-center gap-1 rounded-full border border-stroke-default px-2.5 py-0.5"
        :class="activeByType[ty.key] ? 'text-content-primary' : 'text-content-tertiary'"
      >
        <span class="material-symbols-outlined" :class="tv ? 'text-xl' : 'text-base'" aria-hidden="true">{{ ty.icon ?? 'notifications' }}</span>
        {{ ty.label }}
        <strong class="tabular-nums">{{ activeByType[ty.key] ?? 0 }}</strong>
      </span>
      <span class="ml-auto font-mono tabular-nums text-content-secondary" :class="tv ? 'text-2xl' : ''">{{ clockText }}</span>
      <ChptButton v-if="props.sound" size="xs" is-outline :icon="muted ? 'volume_off' : 'volume_up'" :aria-pressed="muted" @click="muted = !muted">
        {{ muted ? t.andon.unmute : t.andon.mute }}
      </ChptButton>
      <ChptButton v-if="canFullscreen" size="xs" is-outline :icon="isFullscreen ? 'fullscreen_exit' : 'fullscreen'" @click="toggleFullscreen()">
        {{ isFullscreen ? t.andon.exitFullscreen : t.andon.fullscreen }}
      </ChptButton>
    </div>

    <!-- 各站 -->
    <ul class="grid gap-3" :style="{ gridTemplateColumns: `repeat(auto-fill, minmax(${tv ? 300 : 220}px, 1fr))` }">
      <li
        v-for="s in cards"
        :key="s.station.id"
        class="relative flex flex-col overflow-hidden rounded-lg border-2"
        :style="cardStyle(s)"
        :aria-label="stationLabel(s)"
      >
        <div class="flex items-center gap-2 px-3 py-2" :style="headerStyle(s)">
          <span class="material-symbols-outlined" :class="[tv ? 'text-3xl' : 'text-xl', s.level === 2 ? 'motion-safe:animate-pulse' : '']" aria-hidden="true">{{ stateIcon(s) }}</span>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-semibold" :class="tv ? 'text-2xl' : 'text-base'">{{ s.station.name }}</span>
            <span v-if="s.station.group" class="block truncate opacity-80" :class="tv ? 'text-base' : 'text-xs'">{{ s.station.group }}</span>
          </span>
          <span class="font-medium" :class="tv ? 'text-lg' : 'text-xs'">{{ stateText(s) }}</span>
        </div>

        <ul v-if="s.active.length" class="flex flex-col divide-y divide-stroke-light bg-surface-primary">
          <li v-for="c in s.active" :key="c.id" class="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2">
            <span class="material-symbols-outlined" :class="tv ? 'text-2xl' : 'text-lg'" :style="{ color: callColor(c) }" aria-hidden="true">{{ typeOf(c.type).icon ?? 'notifications' }}</span>
            <span class="font-medium text-content-primary" :class="tv ? 'text-xl' : 'text-sm'">{{ typeOf(c.type).label }}</span>
            <span
              class="ml-auto font-mono font-semibold tabular-nums"
              :class="tv ? 'text-2xl' : 'text-sm'"
              :style="{ color: callColor(c) }"
            >{{ formatClock(callElapsed(c, nowMs)) }}</span>
            <span class="basis-full text-content-secondary" :class="tv ? 'text-base' : 'text-xs'">
              {{ callStatus(c) === 'open' ? t.andon.waiting(c.by ?? '') : t.andon.responding(c.responder ?? '') }}<template v-if="c.note"> · {{ c.note }}</template>
            </span>
            <div v-if="!props.readonly" class="flex basis-full gap-1.5">
              <ChptButton v-if="callStatus(c) === 'open'" :size="tv ? 'md' : 'xs'" icon="directions_run" @click="respond(c)">{{ t.andon.respond }}</ChptButton>
              <ChptButton :size="tv ? 'md' : 'xs'" color="success" :is-outline="callStatus(c) === 'open'" icon="check" @click="resolve(c)">{{ t.andon.resolve }}</ChptButton>
            </div>
          </li>
        </ul>
        <p v-else class="flex-1 bg-surface-primary px-3 py-3 text-content-tertiary" :class="tv ? 'text-lg' : 'text-sm'">{{ t.andon.normal }}</p>

        <!-- 呼叫按鈕 -->
        <div v-if="props.canRaise && !props.readonly" class="mt-auto flex flex-wrap gap-1 border-t border-stroke-light bg-surface-secondary px-2 py-1.5" role="group" :aria-label="t.andon.raiseFor(s.station.name)">
          <button
            v-for="ty in types"
            :key="ty.key"
            type="button"
            class="inline-flex items-center gap-1 rounded-md border border-stroke-default bg-surface-primary px-2 py-1 text-content-primary hover:bg-surface-tertiary disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
            :class="tv ? 'text-base' : 'text-xs'"
            :disabled="s.active.some((c) => c.type === ty.key)"
            :aria-label="t.andon.raise(s.station.name, ty.label)"
            @click="raise(s.station.id, ty.key)"
          >
            <span class="material-symbols-outlined text-base" aria-hidden="true">{{ ty.icon ?? 'notifications' }}</span>{{ ty.label }}
          </button>
        </div>
      </li>
    </ul>
    <span class="sr-only" aria-live="assertive">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ChptButton from './ChptButton.vue'
import { useLocale } from '../shared/config'
import { playAlarmTone } from '../shared/alarm'
import {
  DEFAULT_ANDON_THRESHOLDS,
  DEFAULT_ANDON_TYPES,
  callElapsed,
  callLevel,
  callStatus,
  formatClock,
  raiseCall,
  resolveCall,
  respondCall,
  stationSummary,
  type AndonCall,
  type AndonCallType,
  type AndonLevel,
  type AndonStation,
  type AndonThresholds,
} from '../shared/andon'

/**
 * ChptAndonBoard（CHPT 主題） - 安東看板
 *
 * 用途：給產線大螢幕的呼叫看板 —— 站點呼叫維修、缺料、品質、主管，大家都看得到誰在等、等多久。
 *   - 每站一張卡片：沒有呼叫時是「正常」；有呼叫時依等待時間由黃轉紅（紅色閃動，減少動態效果時不閃）
 *   - 未回應時依「等了多久」、處理中時依「處理了多久」升級（thresholds，分鐘）
 *   - 呼叫、回應、完成都在卡片上操作；v-model 是呼叫清單，並送出 raise / respond / resolve 事件
 *   - 電視模式（tv）：字更大；全螢幕按鈕；sound 時新呼叫與轉紅時響（可靜音）
 *   - 新呼叫與轉紅以 aria-live 念出
 */

interface ChptAndonBoardProps {
  stations: AndonStation[]
  /** v-model：呼叫清單（包含已完成的，看板只顯示進行中的） */
  modelValue: AndonCall[]
  /** 呼叫原因；不給時用維修、缺料、品質、主管 */
  types?: AndonCallType[]
  /** 升級門檻（分鐘）：respond 未回應、resolve 處理中，各為 [黃, 紅] */
  thresholds?: AndonThresholds
  /** 回應的人（記在 responder）、呼叫的人（記在 by） */
  operator?: string
  /** 電視模式：字更大、卡片更寬 */
  tv?: boolean
  sound?: boolean
  canRaise?: boolean
  readonly?: boolean
  /** 進行中的站排前面 */
  activeFirst?: boolean
  /** 計時用的現在時間；不給時每秒更新 */
  now?: number | Date | null
  title?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptAndonBoardProps>(), {
  types: undefined,
  thresholds: () => DEFAULT_ANDON_THRESHOLDS,
  operator: '',
  tv: false,
  sound: false,
  canRaise: true,
  readonly: false,
  activeFirst: false,
  now: null,
  title: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: AndonCall[]): void
  (e: 'raise', call: AndonCall): void
  (e: 'respond', call: AndonCall): void
  (e: 'resolve', call: AndonCall): void
}>()

const tv = computed(() => props.tv)
const thresholds = computed(() => props.thresholds)
const role = (name: string) => `rgb(var(--t-${name}))`

// ---- 時間 ----
const clock = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  if (props.now === null) timer = setInterval(() => (clock.value = Date.now()), 1000)
})
const nowMs = computed(() => (props.now === null ? clock.value : props.now instanceof Date ? props.now.getTime() : props.now))
const clockText = computed(() => new Date(nowMs.value).toLocaleTimeString(t.value.code, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))

// ---- 原因 ----
const types = computed<AndonCallType[]>(() =>
  (props.types ?? DEFAULT_ANDON_TYPES).map((ty) => ({ ...ty, label: ty.label || (t.value.andon.type as Record<string, string>)[ty.key] || ty.key }))
)
const typeOf = (key: string) => types.value.find((ty) => ty.key === key) ?? { key, label: key, icon: 'notifications' }

// ---- 各站 ----
const cards = computed(() => {
  const list = props.stations.map((station, i) => ({ station, i, ...stationSummary(station.id, props.modelValue, nowMs.value, thresholds.value) }))
  if (props.activeFirst) list.sort((a, b) => b.level - a.level || Number(b.active.length > 0) - Number(a.active.length > 0) || a.i - b.i)
  return list
})
const activeByType = computed(() => {
  const out: Record<string, number> = {}
  for (const c of props.modelValue) if (callStatus(c) !== 'resolved') out[c.type] = (out[c.type] ?? 0) + 1
  return out
})
type Card = (typeof cards.value)[number]
const levelColor = (l: AndonLevel) => (l === 2 ? role('danger-solid') : l === 1 ? role('warning-solid') : role('info-solid'))
/** 呼叫中（等人）：藍 → 黃 → 紅；已經有人在處理而且還沒超時：中性灰，不搶眼 */
const callColor = (c: AndonCall) => {
  const l = callLevel(c, nowMs.value, thresholds.value)
  return l > 0 || callStatus(c) === 'open' ? levelColor(l) : role('content-secondary')
}
const cardColor = (s: Card) => (s.hasOpen || s.level > 0 ? levelColor(s.level) : role('stroke-dark'))
function cardStyle(s: Card) {
  if (!s.active.length) return { borderColor: role('success-solid') }
  return { borderColor: cardColor(s) }
}
function headerStyle(s: Card) {
  if (!s.active.length) return { background: `color-mix(in srgb, ${role('success-solid')} 14%, ${role('surface-primary')})`, color: role('content-primary') }
  const c = cardColor(s)
  return s.level === 2 ? { background: c, color: '#fff' } : { background: `color-mix(in srgb, ${c} 22%, ${role('surface-primary')})`, color: role('content-primary') }
}
const stateIcon = (s: Card) => (!s.active.length ? 'check_circle' : s.level === 2 ? 'error' : s.hasOpen ? 'notifications_active' : 'engineering')
const stateText = (s: Card) => (!s.active.length ? t.value.andon.normal : s.hasOpen ? t.value.andon.calling : t.value.andon.handling)
function stationLabel(s: Card): string {
  if (!s.active.length) return t.value.andon.stationNormal(s.station.name)
  const parts = s.active.map((c) =>
    t.value.andon.callLabel(typeOf(c.type).label, callStatus(c) === 'open' ? t.value.andon.calling : t.value.andon.handling, formatClock(callElapsed(c, nowMs.value)))
  )
  return t.value.andon.stationCalls(s.station.name, parts)
}

// ---- 操作 ----
const announcement = ref('')
function update(next: AndonCall[]): void {
  emit('update:modelValue', next)
}
function raise(stationId: string, type: string): void {
  if (props.readonly) return
  const next = raiseCall(props.modelValue, stationId, type, nowMs.value, props.operator || undefined)
  if (next === props.modelValue) return
  update(next)
  emit('raise', next[next.length - 1])
}
function respond(c: AndonCall): void {
  if (props.readonly) return
  const next = respondCall(props.modelValue, c.id, props.operator || undefined, nowMs.value)
  update(next)
  emit('respond', next.find((x) => x.id === c.id)!)
}
function resolve(c: AndonCall): void {
  if (props.readonly) return
  const next = resolveCall(props.modelValue, c.id, nowMs.value)
  update(next)
  emit('resolve', next.find((x) => x.id === c.id)!)
}

// ---- 新呼叫、轉紅：念出、響 ----
const muted = ref(false)
let audio: AudioContext | null = null
function beep(): void {
  if (!props.sound || muted.value) return
  const Ctx = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext
  try {
    audio ??= Ctx ? new Ctx() : null
  } catch {
    audio = null
  }
  playAlarmTone(audio, 'critical')
}
const stationName = (id: string) => props.stations.find((s) => s.id === id)?.name ?? id
let known = new Set(props.modelValue.map((c) => c.id))
watch(
  () => props.modelValue,
  (list) => {
    const fresh = list.filter((c) => !known.has(c.id) && callStatus(c) === 'open')
    known = new Set(list.map((c) => c.id))
    if (!fresh.length) return
    const c = fresh[fresh.length - 1]
    announcement.value = t.value.andon.newCall(stationName(c.station), typeOf(c.type).label)
    beep()
  }
)
const redIds = () => props.modelValue.filter((c) => callLevel(c, nowMs.value, thresholds.value) === 2).map((c) => c.id)
// 一開始就已經是紅的不念（只念「轉」紅的）
let red = new Set<string>(redIds())
watch(
  redIds,
  (ids) => {
    const fresh = ids.filter((id) => !red.has(id))
    red = new Set(ids)
    if (!fresh.length) return
    const c = props.modelValue.find((x) => x.id === fresh[0])!
    announcement.value = t.value.andon.escalated(stationName(c.station), typeOf(c.type).label)
    beep()
  }
)

// ---- 全螢幕 ----
const rootRef = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)
const canFullscreen = computed(() => typeof document !== 'undefined' && !!document.fullscreenEnabled)
async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await rootRef.value?.requestFullscreen()
  } catch {
    /* 瀏覽器不允許時就不切換 */
  }
}
const onFsChange = () => (isFullscreen.value = document.fullscreenElement === rootRef.value)
onMounted(() => document.addEventListener('fullscreenchange', onFsChange))
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  document.removeEventListener('fullscreenchange', onFsChange)
  void audio?.close?.()
})

defineExpose({
  /** 由程式呼叫（例如設備自動觸發） */
  raise,
  toggleFullscreen,
})
</script>
