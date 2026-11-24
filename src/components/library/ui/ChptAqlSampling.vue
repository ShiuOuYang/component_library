<template>
  <div class="aql-sampling flex flex-col gap-3 text-sm">
    <h3 v-if="props.title" class="text-base font-semibold text-content-primary">{{ props.title }}</h3>

    <!-- 批量與檢驗水準 -->
    <div class="flex flex-wrap items-end gap-3">
      <label class="flex flex-col gap-1">
        <span class="text-xs text-content-secondary">{{ t.aql.lotSize }}</span>
        <input
          type="number"
          inputmode="numeric"
          min="2"
          class="h-control-sm w-32 rounded-md border border-stroke-default bg-surface-primary px-2 text-right tabular-nums text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:opacity-70"
          :value="record.lotSize ?? ''"
          :disabled="props.readonly"
          @change="onLotSize(($event.target as HTMLInputElement).value)"
        />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-xs text-content-secondary">{{ t.aql.level }}</span>
        <select
          class="h-control-sm rounded-md border border-stroke-default bg-surface-primary px-2 text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:opacity-70"
          :value="record.level"
          :disabled="props.readonly"
          @change="patch({ level: ($event.target as HTMLSelectElement).value as AqlLevel })"
        >
          <option v-for="lv in AQL_LEVELS" :key="lv" :value="lv">{{ t.aql.levelName(lv) }}</option>
        </select>
      </label>
      <span v-if="letter" class="pb-1.5 text-xs text-content-secondary">{{ t.aql.letter(letter) }}</span>
      <span class="ml-auto inline-flex items-center gap-1.5 rounded-full border border-stroke-default px-2.5 py-0.5 pb-0.5 text-xs text-content-secondary">
        {{ t.aql.severity }}
        <strong class="text-content-primary">{{ t.aql.severities[props.severity] }}</strong>
      </span>
    </div>

    <p v-if="advice" class="flex items-start gap-2 rounded-md px-3 py-2" :class="advice === 'discontinue' || advice === 'toTightened' ? 'bg-danger-subtle text-danger-on-subtle' : 'bg-warning-subtle text-warning-on-subtle'" role="status">
      <span class="material-symbols-outlined text-lg" aria-hidden="true">{{ advice === 'discontinue' ? 'block' : 'swap_vert' }}</span>
      {{ t.aql.advice[advice] }}
    </p>

    <p v-if="!letter" class="rounded-md bg-surface-secondary px-3 py-4 text-center text-content-tertiary">{{ t.aql.enterLot }}</p>
    <template v-else>
      <!-- 各缺點等級的方案 -->
      <div class="overflow-x-auto rounded-lg border border-stroke-light">
        <table class="w-full whitespace-nowrap">
          <caption class="sr-only">{{ t.aql.plans }}</caption>
          <thead class="bg-surface-secondary text-left text-xs text-content-secondary">
            <tr>
              <th scope="col" class="px-3 py-2 font-medium">{{ t.aql.class }}</th>
              <th scope="col" class="px-3 py-2 font-medium">AQL</th>
              <th scope="col" class="px-3 py-2 text-right font-medium">{{ t.aql.sampleSize }}</th>
              <th scope="col" class="px-3 py-2 text-right font-medium">Ac</th>
              <th scope="col" class="px-3 py-2 text-right font-medium">Re</th>
              <th scope="col" class="px-3 py-2 text-right font-medium">{{ t.aql.defects }}</th>
              <th scope="col" class="px-3 py-2 font-medium">{{ t.aql.verdict }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stroke-light">
            <tr v-for="r in rows" :key="r.cls.key" class="bg-surface-primary text-content-primary">
              <th scope="row" class="px-3 py-1.5 text-left font-medium">{{ r.label }}</th>
              <td class="px-3 py-1.5">
                <select
                  class="rounded border border-stroke-default bg-surface-primary px-1.5 py-0.5 text-sm text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:opacity-70"
                  :value="r.aql"
                  :disabled="props.readonly"
                  :aria-label="t.aql.aqlFor(r.label)"
                  @change="onAql(r.cls.key, ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="v in AQL_VALUES" :key="v" :value="v">{{ v }}</option>
                </select>
              </td>
              <td class="px-3 py-1.5 text-right tabular-nums">
                {{ r.plan ? r.plan.sampleSize : '—' }}
                <span v-if="r.plan?.arrow" class="block text-xs text-content-tertiary">{{ t.aql.arrow(r.plan.planLetter, r.plan.arrow) }}</span>
                <span v-if="r.plan?.fullInspection" class="block text-xs text-content-tertiary">{{ t.aql.full }}</span>
              </td>
              <td class="px-3 py-1.5 text-right tabular-nums">{{ r.plan?.ac ?? '—' }}</td>
              <td class="px-3 py-1.5 text-right tabular-nums">{{ r.plan?.re ?? '—' }}</td>
              <td class="px-3 py-1.5 text-right">
                <span class="inline-flex items-center gap-1">
                  <button
                    v-if="!props.readonly"
                    type="button"
                    class="flex h-7 w-7 items-center justify-center rounded-md border border-stroke-default bg-surface-primary hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:opacity-40"
                    :disabled="!r.defects"
                    :aria-label="t.aql.decrease(r.label)"
                    @click="addDefect(r.cls.key, -1)"
                  >
                    <span class="material-symbols-outlined text-base" aria-hidden="true">remove</span>
                  </button>
                  <strong class="w-8 text-center text-base tabular-nums" :style="{ color: r.verdict === 'reject' ? role('danger-solid') : undefined }">{{ r.defects }}</strong>
                  <button
                    v-if="!props.readonly"
                    type="button"
                    class="flex h-7 w-7 items-center justify-center rounded-md border border-stroke-default bg-surface-primary hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                    :aria-label="t.aql.increase(r.label)"
                    @click="addDefect(r.cls.key, 1)"
                  >
                    <span class="material-symbols-outlined text-base" aria-hidden="true">add</span>
                  </button>
                </span>
              </td>
              <td class="px-3 py-1.5">
                <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium" :class="verdictClass(r.verdict)">{{ t.aql.verdicts[r.verdict] }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 已檢數量 -->
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-content-secondary">{{ t.aql.inspected }}</span>
        <template v-if="!props.readonly">
          <ChptButton size="xs" is-outline icon="remove" :disabled="!record.inspected" :aria-label="t.aql.inspectedMinus" @click="addInspected(-1)" />
          <input
            type="number"
            inputmode="numeric"
            min="0"
            class="h-control-sm w-24 rounded-md border border-stroke-default bg-surface-primary px-2 text-right tabular-nums text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
            :value="record.inspected"
            :aria-label="t.aql.inspected"
            @change="onInspected(($event.target as HTMLInputElement).value)"
          />
          <ChptButton size="xs" is-outline icon="add" :aria-label="t.aql.inspectedPlus" @click="addInspected(1)" />
          <ChptButton size="xs" is-outline @click="addInspected(10)">+10</ChptButton>
        </template>
        <strong v-else class="tabular-nums text-content-primary">{{ record.inspected }}</strong>
        <span class="tabular-nums text-content-secondary">/ {{ target }}</span>
        <span class="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-surface-tertiary" role="progressbar" :aria-valuenow="Math.min(record.inspected, target)" aria-valuemin="0" :aria-valuemax="target" :aria-label="t.aql.inspected">
          <span class="block h-full rounded-full bg-accent-solid" :style="{ width: `${target ? Math.min(100, (record.inspected / target) * 100) : 0}%` }"></span>
        </span>
        <ChptButton v-if="!props.readonly" size="xs" is-outline icon="restart_alt" @click="reset()">{{ t.aql.reset }}</ChptButton>
      </div>

      <!-- 整批判定 -->
      <div
        class="flex flex-wrap items-center gap-3 rounded-lg px-4 py-3"
        :class="overall === 'reject' ? 'bg-danger-subtle text-danger-on-subtle' : overall === 'accept' ? 'bg-success-subtle text-success-on-subtle' : 'bg-surface-secondary text-content-primary'"
        role="status"
        aria-live="polite"
      >
        <span class="material-symbols-outlined text-3xl" aria-hidden="true">{{ overall === 'reject' ? 'cancel' : overall === 'accept' ? 'check_circle' : 'pending' }}</span>
        <span class="flex-1">
          <strong class="block text-lg">{{ t.aql.overall[overall] }}</strong>
          <span class="text-xs">{{ overallDetail }}</span>
        </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * ChptAqlSampling 抽樣檢驗 —— ANSI/ASQ Z1.4（ISO 2859-1）單次抽樣、正常檢驗。
 * 輸入批量、檢驗水準、各缺點等級的 AQL → 樣本代字、樣本數、Ac / Re（依表上的箭頭換方案）；
 * 邊檢驗邊記錄已檢數與不良數，即時判定允收 / 拒收；依最近各批結果提示轉換（加嚴、減量、停止）。
 */
import { computed, watch } from 'vue'
import ChptButton from './ChptButton.vue'
import { useLocale } from '../shared/config'
import {
  AQL_LEVELS,
  AQL_VALUES,
  aqlVerdict,
  codeLetter,
  normalPlan,
  switchingAdvice,
  type AqlLevel,
  type AqlSeverity,
  type AqlVerdict,
} from '../shared/aql'

export interface AqlDefectClass {
  key: string
  /** 名稱；不給時用語系（critical / major / minor） */
  label?: string
  /** 預設 AQL */
  aql: number
}

export interface AqlRecord {
  lotSize: number | null
  level: AqlLevel
  /** 已檢數量 */
  inspected: number
  /** 缺點等級 → 不良數 */
  defects: Record<string, number>
  /** 缺點等級 → AQL（覆寫 classes 的預設值） */
  aqls?: Record<string, number>
}

export interface ChptAqlSamplingProps {
  /** v-model：批量、檢驗水準、已檢數、不良數 */
  modelValue?: AqlRecord
  /** 缺點等級與 AQL */
  classes?: AqlDefectClass[]
  /** 目前的檢驗嚴格度（只用來給轉換建議；方案一律為正常檢驗） */
  severity?: AqlSeverity
  /** 最近各批結果（舊 → 新，true = 允收），算轉換建議 */
  history?: boolean[]
  title?: string
  readonly?: boolean
}

const t = useLocale()
const props = withDefaults(defineProps<ChptAqlSamplingProps>(), {
  modelValue: () => ({ lotSize: null, level: 'II', inspected: 0, defects: {} }),
  classes: () => [
    { key: 'major', aql: 1 },
    { key: 'minor', aql: 2.5 },
  ],
  severity: 'normal',
  history: () => [],
  title: '',
  readonly: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', record: AqlRecord): void
  /** 整批判定變成允收或拒收時 */
  (e: 'verdict', verdict: Exclude<AqlVerdict, 'pending'>, record: AqlRecord): void
}>()

const role = (name: string) => `rgb(var(--t-${name}))`
const record = computed(() => props.modelValue)
function patch(p: Partial<AqlRecord>): void {
  if (props.readonly) return
  emit('update:modelValue', { ...record.value, ...p })
}

// ---- 方案 ----
const letter = computed(() => (record.value.lotSize ? codeLetter(record.value.lotSize, record.value.level) : null))
const labelOf = (key: string, label?: string) => label ?? (t.value.aql.classes as Record<string, string>)[key] ?? key
const rows = computed(() =>
  props.classes.map((cls) => {
    const aql = record.value.aqls?.[cls.key] ?? cls.aql
    const plan = record.value.lotSize ? normalPlan(record.value.lotSize, record.value.level, aql) : null
    const defects = record.value.defects[cls.key] ?? 0
    const verdict: AqlVerdict = plan ? aqlVerdict(plan, record.value.inspected, defects) : 'pending'
    return { cls, label: labelOf(cls.key, cls.label), aql, plan, defects, verdict }
  })
)
const target = computed(() => Math.max(0, ...rows.value.map((r) => r.plan?.sampleSize ?? 0)))
const overall = computed<AqlVerdict>(() => {
  if (rows.value.some((r) => r.verdict === 'reject')) return 'reject'
  return rows.value.length && rows.value.every((r) => r.verdict === 'accept') ? 'accept' : 'pending'
})
const overallDetail = computed(() => {
  const a = t.value.aql
  if (overall.value === 'reject') return a.rejectDetail(rows.value.filter((r) => r.verdict === 'reject').map((r) => r.label).join(' / '))
  if (overall.value === 'accept') return a.acceptDetail(record.value.inspected)
  return a.pendingDetail(Math.max(0, target.value - record.value.inspected))
})
const advice = computed(() => switchingAdvice(props.history, props.severity))
const verdictClass = (v: AqlVerdict) =>
  v === 'reject' ? 'bg-danger-subtle text-danger-on-subtle' : v === 'accept' ? 'bg-success-subtle text-success-on-subtle' : 'bg-surface-tertiary text-content-secondary'

watch(overall, (v, old) => {
  if (v !== 'pending' && v !== old) emit('verdict', v, record.value)
})

// ---- 輸入 ----
function onLotSize(raw: string): void {
  const n = Math.round(Number(raw))
  patch({ lotSize: raw.trim() && n >= 2 ? n : null })
}
function onAql(key: string, raw: string): void {
  patch({ aqls: { ...(record.value.aqls ?? {}), [key]: Number(raw) } })
}
function onInspected(raw: string): void {
  const n = Math.round(Number(raw))
  patch({ inspected: Number.isFinite(n) && n > 0 ? n : 0 })
}
const addInspected = (d: number) => patch({ inspected: Math.max(0, record.value.inspected + d) })
function addDefect(key: string, d: number): void {
  const cur = record.value.defects[key] ?? 0
  patch({ defects: { ...record.value.defects, [key]: Math.max(0, cur + d) } })
}
/** 清除已檢數與不良數（批量與水準保留） */
function reset(): void {
  patch({ inspected: 0, defects: {} })
}

defineExpose({
  reset,
  /** 各缺點等級的方案與判定 */
  rows,
  overall,
})
</script>
