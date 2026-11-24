<template>
  <div class="cron-input flex flex-col gap-3 text-sm">
    <!-- 模式 -->
    <div class="inline-flex max-w-full self-start overflow-x-auto rounded-md border border-stroke-default" role="group" :aria-label="t.cron.mode">
      <button
        v-for="m in modes"
        :key="m"
        type="button"
        class="shrink-0 whitespace-nowrap px-3 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus disabled:cursor-default"
        :class="simple.mode === m ? 'bg-accent-solid text-white' : 'bg-surface-primary text-content-secondary hover:bg-surface-secondary'"
        :aria-pressed="simple.mode === m"
        :disabled="props.readonly"
        @click="setMode(m)"
      >
        {{ t.cron.modes[m] }}
      </button>
    </div>

    <!-- 簡易設定 -->
    <div v-if="simple.mode !== 'custom'" class="flex flex-wrap items-center gap-2 text-content-primary">
      <template v-if="simple.mode === 'minutes'">
        <span>{{ t.cron.every }}</span>
        <select :class="selectClass" :value="simple.every" :disabled="props.readonly" :aria-label="t.cron.everyMinutes" @change="patch({ every: num($event) })">
          <option v-for="n in [1, 2, 5, 10, 15, 20, 30]" :key="n" :value="n">{{ n }}</option>
        </select>
        <span>{{ t.cron.minutesUnit }}</span>
      </template>
      <template v-else-if="simple.mode === 'hourly'">
        <span>{{ t.cron.everyHourAt }}</span>
        <select :class="selectClass" :value="simple.minute" :disabled="props.readonly" :aria-label="t.cron.minute" @change="patch({ minute: num($event) })">
          <option v-for="n in 60" :key="n" :value="n - 1">{{ pad(n - 1) }}</option>
        </select>
        <span>{{ t.cron.minuteUnit }}</span>
      </template>
      <template v-else>
        <!-- 每週：星期 -->
        <div v-if="simple.mode === 'weekly'" class="flex flex-wrap gap-1" role="group" :aria-label="t.cron.weekdaysLabel">
          <button
            v-for="d in [1, 2, 3, 4, 5, 6, 0]"
            :key="d"
            type="button"
            class="h-8 min-w-8 rounded-md border px-1.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:cursor-default"
            :class="simple.weekdays.includes(d) ? 'border-accent bg-accent-subtle text-content-primary' : 'border-stroke-default bg-surface-primary text-content-secondary'"
            :aria-pressed="simple.weekdays.includes(d)"
            :disabled="props.readonly"
            @click="toggleIn('weekdays', d)"
          >
            {{ t.cron.weekdayShort[d] }}
          </button>
        </div>
        <!-- 每月：日 -->
        <div v-if="simple.mode === 'monthly'" class="grid grid-cols-7 gap-1" role="group" :aria-label="t.cron.daysLabel">
          <button
            v-for="d in 31"
            :key="d"
            type="button"
            class="h-7 w-8 rounded border text-xs tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:cursor-default"
            :class="simple.days.includes(d) ? 'border-accent bg-accent-subtle text-content-primary' : 'border-stroke-default bg-surface-primary text-content-secondary'"
            :aria-pressed="simple.days.includes(d)"
            :aria-label="t.cron.dayN(d)"
            :disabled="props.readonly"
            @click="toggleIn('days', d)"
          >
            {{ d }}
          </button>
        </div>
        <span class="inline-flex items-center gap-1">
          <span>{{ t.cron.time }}</span>
          <select :class="selectClass" :value="simple.hour" :disabled="props.readonly" :aria-label="t.cron.hour" @change="patch({ hour: num($event) })">
            <option v-for="n in 24" :key="n" :value="n - 1">{{ pad(n - 1) }}</option>
          </select>
          <span>:</span>
          <select :class="selectClass" :value="simple.minute" :disabled="props.readonly" :aria-label="t.cron.minute" @change="patch({ minute: num($event) })">
            <option v-for="n in 60" :key="n" :value="n - 1">{{ pad(n - 1) }}</option>
          </select>
        </span>
      </template>
    </div>

    <!-- 表達式 -->
    <label class="flex flex-col gap-1">
      <span class="text-xs text-content-secondary">{{ t.cron.expression }}</span>
      <input
        :value="draft"
        type="text"
        spellcheck="false"
        autocomplete="off"
        class="h-control-sm w-full max-w-xs rounded-md border bg-surface-primary px-2 font-mono text-sm text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:opacity-70"
        :class="error ? 'border-danger' : 'border-stroke-default'"
        :disabled="props.readonly"
        :aria-invalid="!!error || undefined"
        :aria-describedby="`${uid}-desc`"
        @input="onDraft(($event.target as HTMLInputElement).value)"
        @change="commitDraft()"
        @keydown.enter.prevent="commitDraft()"
      />
      <span class="font-mono text-[11px] text-content-tertiary" aria-hidden="true">{{ t.cron.fieldsHint }}</span>
    </label>

    <!-- 說明與下次執行 -->
    <div :id="`${uid}-desc`" class="flex flex-col gap-1.5 rounded-md border px-3 py-2" :class="error ? 'border-danger bg-danger-subtle text-danger-on-subtle' : 'border-stroke-light bg-surface-secondary'" aria-live="polite">
      <template v-if="error">
        <span class="inline-flex items-center gap-1 font-medium"><span class="material-symbols-outlined text-base" aria-hidden="true">error</span>{{ errorText }}</span>
      </template>
      <template v-else-if="parsed">
        <strong class="text-content-primary">{{ description }}</strong>
        <div v-if="props.showNext > 0" class="text-xs text-content-secondary">
          <span>{{ t.cron.nextRuns }}</span>
          <ol class="mt-0.5 flex flex-col gap-0.5 tabular-nums">
            <li v-for="d in upcoming" :key="d.getTime()">{{ formatDate(d) }}</li>
            <li v-if="!upcoming.length" class="text-content-tertiary">{{ t.cron.never }}</li>
          </ol>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ChptCronInput 排程設定 —— 不用手寫 cron 也能設排程。
 * 選「每 N 分鐘 / 每小時 / 每天 / 每週 / 每月」再點選時間，或直接改表達式（兩邊同步）；
 * 顯示可讀的說明與接下來幾次執行時間，格式錯誤時指出哪一欄。
 */
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useLocale } from '../shared/config'
import {
  DEFAULT_SIMPLE,
  describeCron,
  fromSimple,
  isCronError,
  nextRuns,
  parseCron,
  toSimple,
  type CronMode,
  type CronSimple,
} from '../shared/cron'

export interface ChptCronInputProps {
  /** cron 表達式（v-model，5 欄：分 時 日 月 週） */
  modelValue?: string
  /** 列出接下來幾次執行時間（0 不列） */
  showNext?: number
  /** 計算下次執行的起點；不給時用現在 */
  now?: number | Date | null
  readonly?: boolean
}

const t = useLocale()
const props = withDefaults(defineProps<ChptCronInputProps>(), {
  modelValue: '0 8 * * *',
  showNext: 5,
  now: null,
  readonly: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', expr: string): void
}>()

const uid = useId()
const selectClass =
  'h-control-xs rounded-md border border-stroke-default bg-surface-primary px-1.5 text-sm tabular-nums text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:opacity-70'
const pad = (n: number) => String(n).padStart(2, '0')
const num = (e: Event) => Number((e.target as HTMLSelectElement).value)
const modes: CronMode[] = ['minutes', 'hourly', 'daily', 'weekly', 'monthly', 'custom']

// ---- 狀態：表達式為主，簡易設定由它推出（custom 時保留使用者選的模式） ----
const draft = ref(props.modelValue)
const forcedCustom = ref(false)
watch(
  () => props.modelValue,
  (v) => {
    if (v !== draft.value) draft.value = v
  }
)
const parsed = computed(() => {
  const r = parseCron(draft.value)
  return isCronError(r) ? null : r
})
const error = computed(() => {
  const r = parseCron(draft.value)
  return isCronError(r) ? r.error : null
})
const errorText = computed(() => {
  const e = error.value!
  return e.field === 'count' ? t.value.cron.errors.count(Number(e.token)) : t.value.cron.errors.field(t.value.cron.fieldNames[e.field], e.token)
})
const simple = computed<CronSimple>(() => {
  const s = parsed.value ? toSimple(draft.value) : { ...DEFAULT_SIMPLE, mode: 'custom' as CronMode }
  return forcedCustom.value ? { ...s, mode: 'custom' } : s
})

function emitExpr(expr: string): void {
  if (props.readonly) return
  draft.value = expr
  if (!isCronError(parseCron(expr))) emit('update:modelValue', expr)
}
function setMode(m: CronMode): void {
  if (m === 'custom') {
    forcedCustom.value = true
    return
  }
  forcedCustom.value = false
  const cur = simple.value
  emitExpr(fromSimple({ ...cur, mode: m })!)
}
function patch(p: Partial<CronSimple>): void {
  const next = fromSimple({ ...simple.value, ...p })
  if (next) emitExpr(next)
}
function toggleIn(key: 'weekdays' | 'days', v: number): void {
  const cur = simple.value[key]
  const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]
  if (!next.length) return
  patch({ [key]: next })
}
function onDraft(v: string): void {
  draft.value = v
}
function commitDraft(): void {
  if (props.readonly || error.value) return
  const expr = draft.value.trim().split(/\s+/).join(' ')
  draft.value = expr
  if (expr !== props.modelValue) emit('update:modelValue', expr)
}

// ---- 說明與下次執行 ----
const description = computed(() => {
  const c = t.value.cron
  return describeCron(parsed.value!, {
    everyMinute: c.text.everyMinute,
    everyNMinutes: c.text.everyNMinutes,
    everyNMinutesInHours: c.text.everyNMinutesInHours,
    atMinuteEveryHour: c.text.atMinuteEveryHour,
    at: c.text.at,
    minutesOfHours: c.text.minutesOfHours,
    everyDay: c.text.everyDay,
    weekdays: c.text.weekdays,
    monthDays: c.text.monthDays,
    months: c.text.months,
    dayOrWeek: c.text.dayOrWeek,
    join: c.text.join,
    weekdayNames: c.weekdayShort,
    monthNames: c.monthNames,
  })
})
const clock = ref(Date.now())
const timer = setInterval(() => (clock.value = Date.now()), 60_000)
onBeforeUnmount(() => clearInterval(timer))
const from = computed(() => (props.now === null ? new Date(clock.value) : props.now instanceof Date ? props.now : new Date(props.now)))
const upcoming = computed(() => (parsed.value && props.showNext > 0 ? nextRuns(parsed.value, from.value, props.showNext) : []))
const formatDate = (d: Date) => t.value.cron.dateTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, t.value.cron.weekdayShort[d.getDay()], `${pad(d.getHours())}:${pad(d.getMinutes())}`)

defineExpose({
  /** 目前是否有效 */
  valid: computed(() => !error.value),
  /** 可讀說明 */
  description,
})
</script>
