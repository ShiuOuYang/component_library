<template>
  <div class="hourly-board flex flex-col gap-3" :class="tv ? 'text-lg' : 'text-sm'">
    <!-- 標題與摘要 -->
    <div class="flex flex-wrap items-center gap-2">
      <h3 v-if="props.title" class="font-semibold text-content-primary" :class="tv ? 'text-2xl' : 'text-base'">{{ props.title }}</h3>
      <span v-if="nowMin !== null" class="font-mono tabular-nums text-content-secondary" :class="tv ? 'text-2xl' : ''">{{ fromMinutes(nowMin) }}</span>
      <span v-if="summary.missingReasons" class="inline-flex items-center gap-1 rounded-full bg-warning-subtle px-2.5 py-0.5 text-xs font-medium text-warning-on-subtle">
        <span class="material-symbols-outlined text-sm" aria-hidden="true">edit_note</span>{{ t.hourlyBoard.missing(summary.missingReasons) }}
      </span>
      <ChptButton class="ml-auto" size="xs" is-outline icon="download" :disabled="!props.slots.length" @click="exportCsv()">{{ t.hourlyBoard.exportCsv }}</ChptButton>
    </div>
    <dl v-if="props.slots.length" class="grid gap-2" :class="tv ? 'grid-cols-2 lg:grid-cols-5' : 'grid-cols-2 sm:grid-cols-5'">
      <div v-for="k in kpis" :key="k.key" class="rounded-lg border border-stroke-light bg-surface-primary px-3 py-2">
        <dt class="text-xs text-content-secondary" :class="tv ? 'text-base' : ''">{{ k.label }}</dt>
        <dd class="font-semibold tabular-nums" :class="tv ? 'text-4xl' : 'text-2xl'" :style="k.color ? { color: k.color } : undefined">{{ k.value }}</dd>
        <dd v-if="k.sub" class="text-xs tabular-nums text-content-tertiary" :class="tv ? 'text-base' : ''">{{ k.sub }}</dd>
      </div>
    </dl>

    <!-- 逐時 -->
    <div class="overflow-x-auto rounded-lg border border-stroke-light">
      <table v-if="props.slots.length" class="w-full border-collapse">
        <caption class="sr-only">{{ props.title || t.hourlyBoard.title }}</caption>
        <thead class="bg-surface-secondary text-left text-xs text-content-secondary" :class="tv ? 'text-base' : ''">
          <tr>
            <th scope="col" class="whitespace-nowrap px-3 py-2 font-medium">{{ t.hourlyBoard.slot }}</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2 text-right font-medium">{{ t.hourlyBoard.plan }}</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2 text-right font-medium">{{ t.hourlyBoard.actual }}</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2 text-right font-medium">{{ t.hourlyBoard.diff }}</th>
            <th scope="col" class="whitespace-nowrap px-3 py-2 text-right font-medium">{{ t.hourlyBoard.cumDiff }}</th>
            <th scope="col" class="min-w-24 px-3 py-2 font-medium">{{ t.hourlyBoard.achievement }}</th>
            <th v-if="props.reasons.length" scope="col" class="whitespace-nowrap px-3 py-2 font-medium">{{ t.hourlyBoard.reason }}</th>
            <th v-if="props.showNote" scope="col" class="whitespace-nowrap px-3 py-2 font-medium">{{ t.hourlyBoard.note }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stroke-light">
          <tr
            v-for="r in summary.rows"
            :key="r.slot.id"
            :aria-current="r.state === 'current' ? 'time' : undefined"
            :class="[r.state === 'current' ? 'bg-accent-subtle/50' : 'bg-surface-primary', r.state === 'future' ? 'text-content-tertiary' : 'text-content-primary']"
          >
            <th scope="row" class="whitespace-nowrap px-3 py-1.5 text-left font-normal" :style="r.state === 'current' ? { boxShadow: `inset 4px 0 0 ${role('accent-solid')}` } : undefined">
              <span class="font-mono tabular-nums">{{ r.slot.start }}–{{ r.slot.end }}</span>
              <span v-if="r.state === 'current'" class="ml-1.5 rounded bg-accent-solid px-1.5 text-xs text-white">{{ t.hourlyBoard.now }}</span>
              <span v-if="r.slot.breakMinutes" class="block text-xs text-content-tertiary">{{ t.hourlyBoard.breakMin(r.slot.breakMinutes) }}</span>
            </th>
            <td class="px-3 py-1.5 text-right tabular-nums">{{ fmt(r.slot.plan) }}</td>
            <td class="px-3 py-1.5 text-right tabular-nums">
              <input
                v-if="!props.readonly && r.state !== 'future'"
                type="number"
                inputmode="numeric"
                min="0"
                class="w-20 rounded border border-stroke-default bg-surface-primary px-1.5 py-0.5 text-right tabular-nums text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                :class="tv ? 'text-lg' : 'text-sm'"
                :value="r.slot.actual ?? ''"
                :aria-label="t.hourlyBoard.actualLabel(slotText(r.slot))"
                @change="onActual(r.slot, ($event.target as HTMLInputElement).value)"
              />
              <span v-else>{{ r.slot.actual === null || r.slot.actual === undefined ? '' : fmt(r.slot.actual) }}</span>
            </td>
            <td class="px-3 py-1.5 text-right font-medium tabular-nums" :style="{ color: diffColor(r.diff) }">{{ signed(r.diff) }}</td>
            <td class="px-3 py-1.5 text-right tabular-nums" :style="{ color: diffColor(r.cumDiff) }">{{ signed(r.cumDiff) }}</td>
            <td class="px-3 py-1.5">
              <span v-if="r.slot.plan > 0 && r.slot.actual !== null && r.slot.actual !== undefined" class="flex items-center gap-1.5">
                <span class="relative h-2 min-w-16 flex-1 overflow-hidden rounded-full bg-surface-tertiary" aria-hidden="true">
                  <span class="absolute inset-y-0 left-0 rounded-full" :style="{ width: `${Math.min(100, (r.slot.actual / r.slot.plan) * 100)}%`, background: diffColor(r.diff) }"></span>
                </span>
                <span class="w-11 text-right text-xs tabular-nums">{{ pct(r.slot.actual / r.slot.plan) }}</span>
              </span>
            </td>
            <td v-if="props.reasons.length" class="px-3 py-1.5">
              <span v-if="r.diff !== null && r.diff < 0" class="flex items-center gap-1">
                <select
                  :disabled="props.readonly"
                  class="max-w-40 rounded border bg-surface-primary px-1.5 py-0.5 text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:opacity-70"
                  :class="[r.needsReason ? 'border-warning-solid' : 'border-stroke-default', tv ? 'text-base' : 'text-sm']"
                  :value="r.slot.reason ?? ''"
                  :aria-label="t.hourlyBoard.reasonLabel(slotText(r.slot))"
                  :aria-invalid="r.needsReason || undefined"
                  @change="onReason(r.slot, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">{{ r.needsReason ? t.hourlyBoard.needReason : t.hourlyBoard.noReason }}</option>
                  <option v-for="o in props.reasons" :key="o.code" :value="o.code">{{ o.label }}</option>
                </select>
                <span v-if="r.needsReason" class="material-symbols-outlined text-base" :style="{ color: role('warning') }" aria-hidden="true">warning</span>
              </span>
            </td>
            <td v-if="props.showNote" class="px-3 py-1.5">
              <input
                v-if="!props.readonly && r.state !== 'future'"
                type="text"
                class="w-full min-w-28 rounded border border-stroke-default bg-surface-primary px-1.5 py-0.5 text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                :class="tv ? 'text-base' : 'text-sm'"
                :value="r.slot.note ?? ''"
                :aria-label="t.hourlyBoard.noteLabel(slotText(r.slot))"
                @change="onNote(r.slot, ($event.target as HTMLInputElement).value)"
              />
              <span v-else>{{ r.slot.note ?? '' }}</span>
            </td>
          </tr>
        </tbody>
        <tfoot class="bg-surface-secondary font-medium text-content-primary">
          <tr>
            <th scope="row" class="px-3 py-2 text-left">{{ t.hourlyBoard.total }}</th>
            <td class="px-3 py-2 text-right tabular-nums">{{ fmt(summary.totalPlan) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ fmt(totalActual) }}</td>
            <td class="px-3 py-2" :colspan="3 + (props.reasons.length ? 1 : 0) + (props.showNote ? 1 : 0)"></td>
          </tr>
        </tfoot>
      </table>
      <p v-else class="px-3 py-6 text-center text-content-tertiary">{{ t.hourlyBoard.empty }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ChptHourlyBoard 逐時產出看板 —— 產線的 hour-by-hour board。
 * 每個時段：計畫、實際（可填）、差異、累計差異、達成率；落後時要選原因。
 * 上方摘要：目前應做、實際、差異、達成率、照目前效率的班別預估。目前時段高亮、未來時段淡化。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import ChptButton from './ChptButton.vue'
import { useLocale } from '../shared/config'
import { csvBlob, downloadBlob } from '../charts/utils/chartExport'
import { fromMinutes, hourlySummary, patchSlot, type HourlySlot } from '../shared/hourlyBoard'

export interface HourlyReason {
  code: string
  label: string
}

export interface ChptHourlyBoardProps {
  /** 時段（v-model:slots）；可用 buildHourlySlots 產生 */
  slots: HourlySlot[]
  /** 落後原因代碼 */
  reasons?: HourlyReason[]
  /** 班別開始（跨午夜判斷用）；預設第一個時段的開始 */
  shiftStart?: string
  /** 現在時間：不給（undefined）時用電腦時間、每 30 秒更新；null 為不判斷目前時段（只看已填的） */
  now?: number | Date | null
  title?: string
  /** 電視模式（字更大） */
  tv?: boolean
  readonly?: boolean
  /** 備註欄 */
  showNote?: boolean
  /** 匯出檔名（不含副檔名） */
  filename?: string
}

const t = useLocale()
const props = withDefaults(defineProps<ChptHourlyBoardProps>(), {
  reasons: () => [],
  shiftStart: undefined,
  now: undefined,
  title: '',
  tv: false,
  readonly: false,
  showNote: true,
  filename: 'hourly-board',
})

const emit = defineEmits<{
  (e: 'update:slots', slots: HourlySlot[]): void
  /** 某個時段的實際、原因或備註改變 */
  (e: 'change', detail: { slot: HourlySlot; field: 'actual' | 'reason' | 'note' }): void
}>()

const role = (name: string) => `rgb(var(--t-${name}))`
const tv = computed(() => props.tv)

// ---- 時間 ----
const clock = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  if (props.now === undefined) timer = setInterval(() => (clock.value = Date.now()), 30_000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
const nowMin = computed<number | null>(() => {
  if (props.now === null) return null
  const d = props.now === undefined ? new Date(clock.value) : props.now instanceof Date ? props.now : new Date(props.now)
  return d.getHours() * 60 + d.getMinutes()
})
const shiftStart = computed(() => props.shiftStart ?? props.slots[0]?.start ?? '00:00')

// ---- 計算 ----
const summary = computed(() => hourlySummary(props.slots, nowMin.value, shiftStart.value))
const totalActual = computed(() => props.slots.reduce((s, x) => s + (x.actual ?? 0), 0))
const fmt = (n: number) => Math.round(n).toLocaleString()
const pct = (r: number) => `${Math.round(r * 100)}%`
const signed = (n: number | null) => (n === null ? '' : n > 0 ? `+${fmt(n)}` : fmt(n))
/** 差異是文字：用文字色（深色模式會變亮），不用 *-solid 填色 */
const diffColor = (n: number | null) => (n === null ? undefined : n < 0 ? role('danger') : role('success'))
const slotText = (s: HourlySlot) => `${s.start}–${s.end}`

const kpis = computed(() => {
  const s = summary.value
  const h = t.value.hourlyBoard
  const gap = s.actualToNow - Math.round(s.planToNow)
  const list: { key: string; label: string; value: string; sub?: string; color?: string }[] = [
    { key: 'plan', label: h.planToNow, value: fmt(s.planToNow), sub: h.ofTotal(fmt(s.totalPlan)) },
    { key: 'actual', label: h.actualToNow, value: fmt(s.actualToNow) },
    { key: 'gap', label: h.gap, value: signed(gap), color: diffColor(gap) },
    { key: 'rate', label: h.achievementLabel, value: s.achievement === null ? '—' : pct(s.achievement), color: s.achievement === null ? undefined : diffColor(s.achievement >= 1 ? 0 : -1) },
  ]
  if (s.forecast !== null) {
    const short = s.forecast - s.totalPlan
    list.push({ key: 'forecast', label: h.forecast, value: fmt(s.forecast), sub: h.forecastGap(signed(short)), color: diffColor(short) })
  } else list.push({ key: 'forecast', label: h.forecast, value: '—', sub: h.ofTotal(fmt(s.totalPlan)) })
  return list
})

// ---- 編輯 ----
function update(slot: HourlySlot, patch: Partial<HourlySlot>, field: 'actual' | 'reason' | 'note'): void {
  if (props.readonly) return
  const next = patchSlot(props.slots, slot.id, patch)
  emit('update:slots', next)
  emit('change', { slot: next.find((s) => s.id === slot.id)!, field })
}
function onActual(slot: HourlySlot, raw: string): void {
  const v = raw.trim() === '' ? null : Math.max(0, Math.round(Number(raw)))
  update(slot, { actual: v === null || Number.isNaN(v) ? null : v }, 'actual')
}
const onReason = (slot: HourlySlot, code: string) => update(slot, { reason: code || null }, 'reason')
const onNote = (slot: HourlySlot, note: string) => update(slot, { note }, 'note')

// ---- 匯出 ----
function exportCsv(): void {
  const h = t.value.hourlyBoard
  const label = (code: string | null | undefined) => (code ? props.reasons.find((r) => r.code === code)?.label ?? code : '')
  const rows = summary.value.rows.map((r) => ({
    slot: slotText(r.slot),
    plan: r.slot.plan,
    actual: r.slot.actual ?? '',
    diff: r.diff ?? '',
    cumPlan: r.cumPlan,
    cumActual: r.cumActual ?? '',
    cumDiff: r.cumDiff ?? '',
    reason: label(r.slot.reason),
    note: r.slot.note ?? '',
  }))
  const columns = [
    { key: 'slot', title: h.slot },
    { key: 'plan', title: h.plan },
    { key: 'actual', title: h.actual },
    { key: 'diff', title: h.diff },
    { key: 'cumPlan', title: h.cumPlan },
    { key: 'cumActual', title: h.cumActual },
    { key: 'cumDiff', title: h.cumDiff },
    { key: 'reason', title: h.reason },
    { key: 'note', title: h.note },
  ]
  downloadBlob(csvBlob(rows, columns), `${props.filename}.csv`)
}

defineExpose({ exportCsv, summary })
</script>
