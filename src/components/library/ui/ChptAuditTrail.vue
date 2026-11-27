<template>
  <div class="audit-trail flex flex-col gap-3 text-sm">
    <!-- 工具列 -->
    <h3 v-if="props.title" class="text-base font-semibold text-content-primary">{{ props.title }}</h3>
    <div class="flex flex-wrap items-end gap-2">
      <label class="relative">
        <span class="sr-only">{{ t.auditTrail.search }}</span>
        <span class="material-symbols-outlined pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-lg text-content-tertiary" aria-hidden="true">search</span>
        <input v-model="query" type="search" :placeholder="t.auditTrail.search" :class="CONTROL" class="w-56 max-w-full pl-8" />
      </label>
      <label v-if="users.length > 1" class="flex flex-col gap-0.5 text-xs text-content-secondary">
        {{ t.auditTrail.user }}
        <select v-model="user" :class="CONTROL">
          <option value="">{{ t.auditTrail.allUsers }}</option>
          <option v-for="u in users" :key="u" :value="u">{{ u }}</option>
        </select>
      </label>
      <label v-if="fields.length > 1" class="flex flex-col gap-0.5 text-xs text-content-secondary">
        {{ t.auditTrail.field }}
        <select v-model="field" :class="CONTROL">
          <option value="">{{ t.auditTrail.allFields }}</option>
          <option v-for="f in fields" :key="f.field" :value="f.field">{{ labelOf(f.field, f.label) }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-0.5 text-xs text-content-secondary">
        {{ t.auditTrail.from }}
        <input v-model="dateFrom" type="date" :class="CONTROL" />
      </label>
      <label class="flex flex-col gap-0.5 text-xs text-content-secondary">
        {{ t.auditTrail.to }}
        <input v-model="dateTo" type="date" :class="CONTROL" />
      </label>
      <ChptButton class="ml-auto" size="sm" color="secondary" is-outline icon="download" :disabled="!filtered.length" @click="exportCsv()">{{ t.auditTrail.exportCsv }}</ChptButton>
    </div>
    <p class="flex flex-wrap gap-x-3 text-xs text-content-secondary">
      <span class="tabular-nums">{{ t.auditTrail.count(Math.min(limit, filtered.length), filtered.length) }}</span>
      <span v-if="props.compare && compareIds.length < 2">{{ t.auditTrail.compareHint }}</span>
    </p>

    <!-- 版本比較 -->
    <section v-if="comparison" class="rounded-lg border border-accent bg-surface-primary p-3" :aria-labelledby="`${uid}-cmp`">
      <div class="mb-2 flex flex-wrap items-center gap-2">
        <h4 :id="`${uid}-cmp`" class="font-semibold text-content-primary">{{ t.auditTrail.compareTitle }}</h4>
        <span class="text-xs text-content-secondary">{{ comparison.changedCount ? t.auditTrail.differences(comparison.changedCount) : t.auditTrail.noDifferences }}</span>
        <ChptButton class="ml-auto" size="xs" color="secondary" is-outline icon="close" @click="compareIds = []">{{ t.auditTrail.clearCompare }}</ChptButton>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-xs">
          <thead class="text-content-secondary">
            <tr>
              <th scope="col" class="border-b border-stroke-light px-2 py-1 text-left font-medium">{{ t.auditTrail.field }}</th>
              <th v-for="v in comparison.versions" :key="v.id" scope="col" class="border-b border-stroke-light px-2 py-1 text-left font-medium">
                <span class="block text-content-primary">{{ v.name }}</span>
                <span class="font-normal tabular-nums">{{ v.label }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in comparison.rows" :key="row.field" :class="row.changed ? 'bg-warning-subtle text-warning-on-subtle' : 'text-content-primary'">
              <th scope="row" class="px-2 py-1 text-left font-medium">{{ labelOf(row.field) }}</th>
              <td class="px-2 py-1 tabular-nums">{{ fmt(row.a, row.field) }}</td>
              <td class="px-2 py-1 tabular-nums">{{ fmt(row.b, row.field) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="props.revertable" class="mt-2 flex flex-wrap gap-2">
        <ChptButton v-for="v in comparison.versions" :key="v.id" size="xs" color="secondary" is-outline icon="history" @click="emit('revert-version', { entry: v.entry, snapshot: v.snapshot })">
          {{ t.auditTrail.revertToVersion(v.name) }}
        </ChptButton>
      </div>
    </section>

    <!-- 時間軸 -->
    <div class="overflow-auto" :style="{ maxHeight: props.maxHeight ? `${props.maxHeight}px` : undefined }" :tabindex="props.maxHeight ? 0 : undefined" :role="props.maxHeight ? 'region' : undefined" :aria-label="props.maxHeight ? props.title || t.auditTrail.title : undefined">
      <p v-if="!filtered.length" class="px-3 py-6 text-center text-content-tertiary">{{ t.auditTrail.empty }}</p>
      <section v-for="day in days" :key="day.key" class="mb-3" :aria-labelledby="`${uid}-d${day.key}`">
        <h4 :id="`${uid}-d${day.key}`" class="sticky top-0 z-[1] mb-1 bg-surface-primary py-1 text-xs font-semibold text-content-secondary">{{ dayLabel(day) }}</h4>
        <ol class="relative ml-3 border-l border-stroke-default">
          <li v-for="e in day.entries" :key="e.id" class="relative pb-3 pl-5" :data-entry="e.id">
            <span class="absolute -left-[13px] top-0 flex size-6 items-center justify-center rounded-full border border-stroke-default bg-surface-secondary text-[10px] font-semibold text-content-primary" aria-hidden="true">{{ initials(e.user) }}</span>
            <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <time :datetime="isoOf(e.at)" class="text-xs tabular-nums text-content-secondary">{{ timeOf(e.at) }}</time>
              <span class="font-medium text-content-primary">{{ e.user }}</span>
              <span v-if="e.action" class="rounded px-1.5 text-[11px] font-medium" :class="ACTION_CLASS[e.action] ?? 'bg-surface-tertiary text-content-secondary'">{{ actionLabel(e.action) }}</span>
              <span v-if="e.target" class="text-content-secondary">{{ e.target }}</span>
              <label v-if="props.compare" class="ml-auto inline-flex items-center gap-1 text-xs text-content-secondary">
                <input
                  type="checkbox"
                  :checked="compareIds.includes(e.id)"
                  :disabled="!compareIds.includes(e.id) && compareIds.length >= 2"
                  :aria-label="t.auditTrail.compareLabel(`${dateOf(e.at)} ${timeOf(e.at)}`, e.user)"
                  @change="toggleCompare(e.id)"
                />
                {{ t.auditTrail.compare }}
              </label>
            </div>
            <ul v-if="e.changes?.length" class="mt-1 flex flex-col gap-0.5">
              <li v-for="(c, ci) in e.changes" :key="ci" class="flex flex-wrap items-center gap-x-1.5 text-xs">
                <span class="sr-only">{{ t.auditTrail.changeLine(labelOf(c.field, c.label), fmt(c.from, c.field), fmt(c.to, c.field)) }}</span>
                <span class="text-content-secondary" aria-hidden="true">{{ labelOf(c.field, c.label) }}</span>
                <del v-if="e.action !== 'create'" class="rounded bg-danger-subtle px-1 text-danger-on-subtle decoration-1" :title="t.auditTrail.oldValue" aria-hidden="true">{{ fmt(c.from, c.field) }}</del>
                <span v-if="e.action !== 'create'" class="text-content-tertiary" aria-hidden="true">→</span>
                <ins class="rounded bg-success-subtle px-1 font-medium text-success-on-subtle no-underline" :title="t.auditTrail.newValue" aria-hidden="true">{{ fmt(c.to, c.field) }}</ins>
                <button
                  v-if="props.revertable && e.action !== 'create'"
                  type="button"
                  class="rounded px-1 text-[11px] text-accent-on-subtle hover:bg-accent-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                  :aria-label="t.auditTrail.revertLabel(labelOf(c.field, c.label), fmt(c.from, c.field))"
                  @click="emit('revert', { entry: e, change: c })"
                >
                  {{ t.auditTrail.revert }}
                </button>
              </li>
            </ul>
            <p v-if="e.note" class="mt-1 whitespace-pre-wrap text-xs italic text-content-secondary">{{ e.note }}</p>
          </li>
        </ol>
      </section>
      <ChptButton v-if="filtered.length > limit" size="sm" color="secondary" is-outline @click="limit += props.pageSize">{{ t.auditTrail.showMore(filtered.length - limit) }}</ChptButton>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ChptAuditTrail 變更紀錄 —— MES 參數、配方、主檔的稽核軌跡。
 *
 * 依日期分組的時間軸：誰在何時對什麼做了什麼，欄位層級的變更以「原值 → 新值」呈現。
 * 可依人員、欄位、關鍵字、日期區間篩選；勾選兩筆比較那兩個時間點的完整內容（從變更推回快照）；
 * revertable 時可以送出還原單一欄位或整個版本的事件（實際寫回由使用端處理）。匯出 CSV。
 */
import { computed, ref, useId, watch } from 'vue'
import ChptButton from './ChptButton.vue'
import { useLocale } from '../shared/config'
import { csvBlob, downloadBlob, type CsvColumn } from '../charts/utils/chartExport'
import { localDayKey } from '../shared/fmea'
import { toTime } from '../shared/storage'
import {
  auditFields,
  auditSnapshot,
  auditUsers,
  compareSnapshots,
  filterAudit,
  groupAuditByDay,
  sortAudit,
  type AuditChange,
  type AuditDay,
  type AuditEntry,
} from '../shared/auditTrail'

export interface ChptAuditTrailProps {
  /** 紀錄（順序不拘，元件依時間由新到舊排列） */
  entries: AuditEntry[]
  /** 標題 */
  title?: string
  /** 欄位 key → 顯示名稱（變更本身有 label 時以 label 為準） */
  fieldLabels?: Record<string, string>
  /** 值的顯示方式；不給時：空值顯示「（空）」、布林顯示是 / 否、日期顯示 YYYY-MM-DD HH:mm、物件顯示 JSON */
  formatValue?: (value: unknown, field: string) => string
  /** 顯示還原按鈕（送出 revert / revert-version 事件） */
  revertable?: boolean
  /** 可勾選兩筆比較版本 */
  compare?: boolean
  /** 一次顯示幾筆（其餘按「顯示更多」） */
  pageSize?: number
  /** 時間軸最大高度（px） */
  maxHeight?: number
  /** 判斷「今天 / 昨天」用的現在時間 */
  now?: number | string | Date
  /** 匯出檔名（不含副檔名） */
  filename?: string
}

const props = withDefaults(defineProps<ChptAuditTrailProps>(), {
  title: '',
  fieldLabels: () => ({}),
  formatValue: undefined,
  revertable: false,
  compare: true,
  pageSize: 50,
  maxHeight: undefined,
  now: undefined,
  filename: 'audit-trail',
})

const emit = defineEmits<{
  /** 還原單一欄位：把 change.field 改回 change.from */
  revert: [payload: { entry: AuditEntry; change: AuditChange }]
  /** 還原整個版本：snapshot 是那一筆之後的完整欄位值 */
  'revert-version': [payload: { entry: AuditEntry | null; snapshot: Record<string, unknown> }]
}>()

const t = useLocale()
const uid = useId()
const CONTROL = 'h-control-sm rounded-md border border-stroke-default bg-surface-primary px-2 text-sm text-content-primary placeholder:text-content-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus'
const ACTION_CLASS: Record<string, string> = {
  create: 'bg-success-subtle text-success-on-subtle',
  update: 'bg-info-subtle text-info-on-subtle',
  delete: 'bg-danger-subtle text-danger-on-subtle',
}

const query = ref('')
const user = ref('')
const field = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const limit = ref(props.pageSize)
watch([query, user, field, dateFrom, dateTo], () => (limit.value = props.pageSize))

const sorted = computed(() => sortAudit(props.entries, 'desc'))
const users = computed(() => auditUsers(sorted.value))
const fields = computed(() => auditFields(sorted.value))
const labelOf = (f: string, own?: string) => own || props.fieldLabels[f] || fields.value.find((x) => x.field === f)?.label || f
const filtered = computed(() =>
  filterAudit(
    sorted.value,
    { query: query.value, users: user.value ? [user.value] : undefined, fields: field.value ? [field.value] : undefined, from: dateFrom.value || null, to: dateTo.value || null },
    (f) => labelOf(f),
  ),
)
const days = computed(() => groupAuditByDay(filtered.value.slice(0, limit.value)))

// ---- 顯示格式 ----
const pad = (n: number) => String(n).padStart(2, '0')
const dateObj = (v: AuditEntry['at']) => new Date(toTime(v) ?? 0)
const dateOf = (v: AuditEntry['at']) => {
  const d = dateObj(v)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const timeOf = (v: AuditEntry['at']) => {
  const d = dateObj(v)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const isoOf = (v: AuditEntry['at']) => dateObj(v).toISOString()
function dayLabel(day: AuditDay): string {
  const nowKey = localDayKey(props.now ?? Date.now())
  if (nowKey === day.key) return `${day.date} · ${t.value.auditTrail.today}`
  const y = new Date(toTime(props.now ?? Date.now()) ?? 0)
  y.setDate(y.getDate() - 1)
  return localDayKey(y) === day.key ? `${day.date} · ${t.value.auditTrail.yesterday}` : day.date
}
const actionLabel = (a: string) => (a in t.value.auditTrail.actions ? t.value.auditTrail.actions[a as 'create'] : a)
const initials = (name: string) => {
  const s = name.trim()
  if (!s) return '?'
  // 英文取前兩個單字的首字母；中文取第一個字（姓，名字後面常接職稱）
  if (/^[\x20-\x7e]+$/.test(s)) return s.split(/\s+/).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
  return [...s][0]!
}
function fmt(value: unknown, f: string): string {
  if (props.formatValue) return props.formatValue(value, f)
  if (value === null || value === undefined || value === '') return t.value.auditTrail.emptyValue
  if (typeof value === 'boolean') return value ? t.value.auditTrail.yes : t.value.auditTrail.no
  if (value instanceof Date) return `${dateOf(value)} ${timeOf(value)}`
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

// ---- 版本比較 ----
const compareIds = ref<string[]>([])
watch(
  () => props.entries,
  () => (compareIds.value = compareIds.value.filter((id) => props.entries.some((e) => e.id === id))),
)
function toggleCompare(id: string) {
  compareIds.value = compareIds.value.includes(id) ? compareIds.value.filter((x) => x !== id) : [...compareIds.value, id].slice(-2)
}
const comparison = computed(() => {
  if (compareIds.value.length !== 2) return null
  // 舊的當 A、新的當 B
  const chosen = sortAudit(props.entries.filter((e) => compareIds.value.includes(e.id)), 'asc')
  // 指定的 id 不在 entries 裡（compareWith 給錯、紀錄還沒載入）：不比較
  if (chosen.length !== 2) return null
  const allFields = fields.value.map((f) => f.field)
  const versions = chosen.map((entry, i) => ({
    id: entry.id,
    entry,
    name: i === 0 ? t.value.auditTrail.versionA : t.value.auditTrail.versionB,
    label: `${dateOf(entry.at)} ${timeOf(entry.at)} · ${t.value.auditTrail.by(entry.user)}`,
    snapshot: auditSnapshot(props.entries, entry.id),
  }))
  const rows = compareSnapshots(versions[0].snapshot, versions[1].snapshot, allFields)
  return { versions, rows, changedCount: rows.filter((r) => r.changed).length }
})

// ---- 匯出 ----
/** 匯出目前篩選後的紀錄：每個欄位變更一列（沒有變更的紀錄一列） */
function exportCsv(filename = props.filename) {
  const c = t.value.auditTrail.csv
  const columns: CsvColumn[] = [
    { key: 'time', title: c.time },
    { key: 'user', title: c.user },
    { key: 'action', title: c.action },
    { key: 'target', title: c.target },
    { key: 'field', title: c.field },
    { key: 'from', title: c.from },
    { key: 'to', title: c.to },
    { key: 'note', title: c.note },
  ]
  const rows = filtered.value.flatMap((e) => {
    const base = { time: `${dateOf(e.at)} ${timeOf(e.at)}`, user: e.user, action: e.action ? actionLabel(e.action) : '', target: e.target ?? '', note: e.note ?? '' }
    const changes = e.changes ?? []
    if (!changes.length) return [{ ...base, field: '', from: '', to: '' }]
    return changes.map((ch) => ({ ...base, field: labelOf(ch.field, ch.label), from: fmt(ch.from, ch.field), to: fmt(ch.to, ch.field) }))
  })
  downloadBlob(csvBlob(rows, columns), `${filename}.csv`)
}

defineExpose({
  /** 某一筆之後的完整欄位值（null：初始狀態） */
  snapshot: (id: string | null) => auditSnapshot(props.entries, id),
  /** 匯出目前篩選後的紀錄 */
  exportCsv,
  /** 設定要比較的兩筆紀錄 id */
  compareWith: (a: string, b: string) => (compareIds.value = [a, b]),
})
</script>
