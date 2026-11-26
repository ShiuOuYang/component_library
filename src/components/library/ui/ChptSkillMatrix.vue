<template>
  <div class="skill-matrix flex flex-col gap-3 text-sm">
    <!-- 工具列與摘要 -->
    <div class="flex flex-wrap items-center gap-2">
      <h3 v-if="props.title" class="text-base font-semibold text-content-primary">{{ props.title }}</h3>
      <label class="relative">
        <span class="sr-only">{{ t.skillMatrix.search }}</span>
        <span class="material-symbols-outlined pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-lg text-content-tertiary" aria-hidden="true">search</span>
        <input
          v-model="query"
          type="search"
          :placeholder="t.skillMatrix.search"
          class="h-control-sm w-44 rounded-md border border-stroke-default bg-surface-primary pl-8 pr-2 text-sm text-content-primary placeholder:text-content-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
        />
      </label>
      <label v-if="teams.length > 1" class="inline-flex items-center gap-1.5 text-content-secondary">
        {{ t.skillMatrix.team }}
        <select v-model="team" class="h-control-sm rounded-md border border-stroke-default bg-surface-primary px-2 text-sm text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus">
          <option value="">{{ t.skillMatrix.allTeams }}</option>
          <option v-for="tm in teams" :key="tm" :value="tm">{{ tm }}</option>
        </select>
      </label>
      <div v-if="!props.readonly" class="ml-auto inline-flex flex-wrap items-center gap-1 text-xs text-content-secondary" role="group" :aria-label="t.skillMatrix.brush">
        <span>{{ t.skillMatrix.brush }}</span>
        <button
          v-for="b in brushes"
          :key="String(b)"
          type="button"
          class="inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-md border px-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          :class="brush === b ? 'border-accent bg-accent-subtle text-content-primary' : 'border-stroke-default bg-surface-primary hover:bg-surface-secondary'"
          :aria-pressed="brush === b"
          :aria-label="b === 'cycle' ? t.skillMatrix.cycle : t.skillMatrix.levels[b]"
          @click="brush = b"
        >
          <span v-if="b === 'cycle'" class="material-symbols-outlined text-base" aria-hidden="true">autorenew</span>
          <svg v-else width="14" height="14" viewBox="-8 -8 16 16" aria-hidden="true"><path :d="pie(b, 7)" :style="{ fill: role('content-primary') }" /><circle r="7" fill="none" :style="{ stroke: role('content-primary') }" stroke-width="1.2" /></svg>
        </button>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-secondary">
      <span v-if="summary.requiredSkills" class="tabular-nums" :style="summary.coveredSkills < summary.requiredSkills ? { color: role('danger') } : undefined">
        {{ t.skillMatrix.covered(summary.coveredSkills, summary.requiredSkills) }}
      </span>
      <span class="tabular-nums">{{ t.skillMatrix.multiSkilled(summary.multiSkilled, summary.persons) }}</span>
      <span v-if="summary.soon" class="font-medium tabular-nums" :style="{ color: role('warning') }">{{ t.skillMatrix.soonCount(summary.soon) }}</span>
      <span v-if="summary.expired" class="font-medium tabular-nums" :style="{ color: role('danger') }">{{ t.skillMatrix.expiredCount(summary.expired) }}</span>
      <span class="ml-auto flex flex-wrap items-center gap-x-2.5 gap-y-1" :aria-label="t.skillMatrix.legend">
        <span v-for="lv in levels" :key="lv" class="inline-flex items-center gap-1">
          <svg width="14" height="14" viewBox="-8 -8 16 16" aria-hidden="true"><path :d="pie(lv, 7)" :style="{ fill: levelColor(lv) }" /><circle r="7" fill="none" :style="{ stroke: levelColor(lv) }" stroke-width="1.2" /></svg>{{ lv }} {{ t.skillMatrix.levels[lv] }}
        </span>
      </span>
    </div>

    <!-- 矩陣 -->
    <div class="overflow-auto rounded-lg border border-stroke-light" :style="{ maxHeight: props.maxHeight ? `${props.maxHeight}px` : undefined }">
      <table v-if="visiblePersons.length && props.skills.length" ref="tableRef" class="border-collapse" role="grid" :aria-label="props.title || t.skillMatrix.title" :aria-readonly="props.readonly || undefined">
        <thead class="sticky top-0 z-10 bg-surface-secondary text-xs text-content-secondary">
          <tr v-if="groups.length > 1 || groups[0]?.group">
            <th scope="col" class="sticky left-0 z-10 bg-surface-secondary"></th>
            <th v-for="g in groups" :key="g.group" scope="colgroup" :colspan="g.skills.length" class="border-l border-stroke-light bg-surface-secondary px-2 py-1 text-center font-medium">{{ g.group }}</th>
            <th scope="col" class="bg-surface-secondary"></th>
          </tr>
          <tr>
            <th scope="col" class="sticky left-0 z-10 bg-surface-secondary px-3 py-2 text-left font-medium">{{ t.skillMatrix.person }}</th>
            <th
              v-for="s in orderedSkills"
              :key="s.id"
              scope="col"
              class="border-l border-stroke-light bg-surface-secondary px-1 py-2 align-bottom font-medium"
            >
              <span class="mx-auto block max-h-36 overflow-hidden text-ellipsis whitespace-nowrap text-content-primary" style="writing-mode: vertical-rl" :title="s.name">{{ s.name }}</span>
            </th>
            <th scope="col" class="border-l border-stroke-light bg-surface-secondary px-2 py-2 align-bottom font-medium">{{ t.skillMatrix.qualifiedCol }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, ri) in visiblePersons" :key="p.id" class="border-t border-stroke-light">
            <th scope="row" class="sticky left-0 z-[1] whitespace-nowrap bg-surface-primary px-3 py-1 text-left font-normal">
              <span class="font-medium text-content-primary">{{ p.name }}</span>
              <span v-if="p.team" class="ml-1.5 text-xs text-content-tertiary">{{ p.team }}</span>
            </th>
            <td
              v-for="(s, ci) in orderedSkills"
              :key="s.id"
              role="gridcell"
              :tabindex="ri === focusRow && ci === focusCol ? 0 : -1"
              :data-cell="`${ri}:${ci}`"
              :aria-label="cellLabel(p, s)"
              class="relative border-l border-stroke-light bg-surface-primary p-0 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus"
              :class="props.readonly ? '' : 'cursor-pointer hover:bg-surface-secondary'"
              @click="onCellClick(p, s, ri, ci, $event)"
              @keydown="onKeydown($event, p, s, ri, ci)"
              @focus="focusRow = ri; focusCol = ci"
            >
              <span class="flex h-9 min-w-9 items-center justify-center" :title="cellTitle(p, s)">
                <svg width="20" height="20" viewBox="-10 -10 20 20" aria-hidden="true">
                  <path :d="pie(cell(p, s).level, 8)" :style="{ fill: levelColor(cell(p, s).level) }" />
                  <circle r="8" fill="none" :style="{ stroke: ringColor(p, s) }" :stroke-width="expiry(p, s) === 'expired' || expiry(p, s) === 'soon' ? 2 : 1.2" :stroke-dasharray="expiry(p, s) === 'expired' ? '3 2' : undefined" />
                </svg>
              </span>
            </td>
            <td class="border-l border-stroke-light px-2 text-center tabular-nums text-content-primary">{{ qualifiedOf(p) }}</td>
          </tr>
        </tbody>
        <tfoot class="sticky bottom-0 z-10 bg-surface-secondary text-xs">
          <tr class="border-t border-stroke-default">
            <th scope="row" class="sticky left-0 z-[1] bg-surface-secondary px-3 py-1.5 text-left font-medium text-content-secondary">{{ t.skillMatrix.coverage }}</th>
            <td
              v-for="c in coverage"
              :key="c.skill.id"
              class="border-l border-stroke-light bg-surface-secondary px-1 py-1.5 text-center font-medium tabular-nums"
              :style="{ color: c.short ? role('danger-solid') : role('content-primary') }"
              :title="c.skill.required ? t.skillMatrix.coverageTitle(c.qualified, c.skill.required) : undefined"
            >
              {{ c.qualified }}<span v-if="c.skill.required" class="font-normal text-content-tertiary">/{{ c.skill.required }}</span>
            </td>
            <td class="bg-surface-secondary"></td>
          </tr>
        </tfoot>
      </table>
      <p v-else class="px-3 py-6 text-center text-content-tertiary">{{ t.skillMatrix.empty }}</p>
    </div>
    <p v-if="!props.readonly" class="text-xs text-content-tertiary">{{ t.skillMatrix.hint }}</p>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * ChptSkillMatrix 技能矩陣 —— 作業員 × 工站 / 技能，0–4 級（ILUO）圓餅圖示。
 * 證照到期提醒、每個技能的合格人數低於需求時標紅、多能工統計；可篩選班別、搜尋人名；點格子或按數字鍵調整等級。
 */
import { computed, nextTick, ref } from 'vue'
import { useLocale } from '../shared/config'
import {
  cellOf,
  groupSkills,
  personQualified,
  setSkillLevel,
  skillCoverage,
  skillExpiry,
  skillMatrixSummary,
  type SkillDef,
  type SkillLevel,
  type SkillMatrixData,
  type SkillPerson,
} from '../shared/skillMatrix'

export interface ChptSkillMatrixProps {
  persons: SkillPerson[]
  skills: SkillDef[]
  /** 人員 id → 技能 id → { level, expiresAt? }（v-model:matrix） */
  matrix?: SkillMatrixData
  /** 等級 ≥ 這個值算合格（預設 3 = 可獨立作業） */
  qualifyLevel?: number
  /** 證照幾天內到期要提醒 */
  warnDays?: number
  /** 計算效期用的現在時間 */
  now?: number | Date | null
  title?: string
  readonly?: boolean
  /** 表格最大高度（px）；超過時捲動，表頭與合計列固定 */
  maxHeight?: number | null
}

const t = useLocale()
const props = withDefaults(defineProps<ChptSkillMatrixProps>(), {
  matrix: () => ({}),
  qualifyLevel: 3,
  warnDays: 30,
  now: null,
  title: '',
  readonly: false,
  maxHeight: null,
})

const emit = defineEmits<{
  (e: 'update:matrix', matrix: SkillMatrixData): void
  /** 某人某技能的等級改變 */
  (e: 'change', detail: { person: SkillPerson; skill: SkillDef; from: SkillLevel; to: SkillLevel }): void
}>()

const role = (name: string) => `rgb(var(--t-${name}))`
const nowMs = computed(() => (props.now === null ? Date.now() : props.now instanceof Date ? props.now.getTime() : props.now))
const levels: SkillLevel[] = [0, 1, 2, 3, 4]

// ---- 篩選 ----
const query = ref('')
const team = ref('')
const teams = computed(() => [...new Set(props.persons.map((p) => p.team).filter((x): x is string => !!x))])
const visiblePersons = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.persons.filter((p) => (!team.value || p.team === team.value) && (!q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)))
})
const groups = computed(() => groupSkills(props.skills))
const orderedSkills = computed(() => groups.value.flatMap((g) => g.skills))

// ---- 計算 ----
const cell = (p: SkillPerson, s: SkillDef) => cellOf(props.matrix, p.id, s.id)
const expiry = (p: SkillPerson, s: SkillDef) => {
  const c = cell(p, s)
  return c.level === 0 ? 'none' : skillExpiry(c, nowMs.value, props.warnDays)
}
const coverage = computed(() => skillCoverage(visiblePersons.value, orderedSkills.value, props.matrix, nowMs.value, props.qualifyLevel))
const summary = computed(() => skillMatrixSummary(visiblePersons.value, props.skills, props.matrix, nowMs.value, props.qualifyLevel, props.warnDays))
const qualifiedOf = (p: SkillPerson) => personQualified(p, props.skills, props.matrix, nowMs.value, props.qualifyLevel)

// ---- 圖示 ----
/** 等級 n → 填滿 n/4 的扇形（從 12 點鐘順時針） */
function pie(level: number, r: number): string {
  if (level <= 0) return ''
  if (level >= 4) return `M0,${-r}A${r},${r} 0 1 1 0,${r}A${r},${r} 0 1 1 0,${-r}Z`
  const a = (level / 4) * 2 * Math.PI
  const x = Math.sin(a) * r
  const y = -Math.cos(a) * r
  return `M0,0L0,${-r}A${r},${r} 0 ${level > 2 ? 1 : 0} 1 ${x.toFixed(3)},${y.toFixed(3)}Z`
}
const levelColor = (lv: number) => (lv >= props.qualifyLevel ? role('success-solid') : lv > 0 ? role('accent-solid') : role('stroke-dark'))
function ringColor(p: SkillPerson, s: SkillDef): string {
  const e = expiry(p, s)
  if (e === 'expired') return role('danger-solid')
  if (e === 'soon') return role('warning-solid')
  return levelColor(cell(p, s).level)
}
const dateText = (v: unknown) => {
  const d = new Date(v as string | number | Date)
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function cellTitle(p: SkillPerson, s: SkillDef): string {
  const c = cell(p, s)
  const e = expiry(p, s)
  const parts = [`${c.level} ${t.value.skillMatrix.levels[c.level]}`]
  if (e !== 'none') parts.push(t.value.skillMatrix.expiry[e](dateText(c.expiresAt)))
  return parts.join(' · ')
}
function cellLabel(p: SkillPerson, s: SkillDef): string {
  return t.value.skillMatrix.cellLabel(p.name, s.name, cellTitle(p, s))
}

// ---- 編輯 ----
type Brush = 'cycle' | SkillLevel
const brushes: Brush[] = ['cycle', 0, 1, 2, 3, 4]
const brush = ref<Brush>('cycle')
const announcement = ref('')
function setLevel(p: SkillPerson, s: SkillDef, level: SkillLevel): void {
  if (props.readonly) return
  const from = cell(p, s).level
  if (from === level) return
  emit('update:matrix', setSkillLevel(props.matrix, p.id, s.id, level))
  emit('change', { person: p, skill: s, from, to: level })
  announcement.value = t.value.skillMatrix.changed(p.name, s.name, `${level} ${t.value.skillMatrix.levels[level]}`)
}
function onCellClick(p: SkillPerson, s: SkillDef, ri: number, ci: number, e: MouseEvent): void {
  focusRow.value = ri
  focusCol.value = ci
  if (props.readonly) return
  const cur = cell(p, s).level
  const next: SkillLevel = brush.value === 'cycle' ? (((cur + (e.shiftKey ? 4 : 1)) % 5) as SkillLevel) : brush.value
  setLevel(p, s, next)
}

// ---- 鍵盤：方向鍵移動、數字鍵 0–4 設定、Home / End ----
const tableRef = ref<HTMLTableElement | null>(null)
const focusRow = ref(0)
const focusCol = ref(0)
function focusCell(r: number, c: number): void {
  focusRow.value = r
  focusCol.value = c
  void nextTick(() => tableRef.value?.querySelector<HTMLElement>(`[data-cell="${r}:${c}"]`)?.focus())
}
function onKeydown(e: KeyboardEvent, p: SkillPerson, s: SkillDef, r: number, c: number): void {
  const rows = visiblePersons.value.length
  const cols = orderedSkills.value.length
  if (/^[0-4]$/.test(e.key)) {
    e.preventDefault()
    setLevel(p, s, Number(e.key) as SkillLevel)
    return
  }
  const moves: Record<string, [number, number]> = {
    ArrowUp: [Math.max(0, r - 1), c],
    ArrowDown: [Math.min(rows - 1, r + 1), c],
    ArrowLeft: [r, Math.max(0, c - 1)],
    ArrowRight: [r, Math.min(cols - 1, c + 1)],
    Home: [r, 0],
    End: [r, cols - 1],
  }
  const m = moves[e.key]
  if (!m) return
  e.preventDefault()
  focusCell(m[0], m[1])
}

defineExpose({ summary, coverage })
</script>
