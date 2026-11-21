<template>
  <div class="flex flex-col gap-2">
    <!-- 工具列：模式、筆刷（要填入的班別）、提醒摘要 -->
    <div v-if="!props.readonly" class="flex flex-wrap items-center gap-2">
      <ChptSegmented v-model="mode" :options="modeOptions" :aria-label="t.shiftRoster.mode" size="xs" />
      <div v-if="mode === 'fill'" class="flex flex-wrap gap-1" role="radiogroup" :aria-label="t.shiftRoster.brush">
        <button
          v-for="s in brushOptions"
          :key="s.code ?? '__clear__'"
          type="button"
          role="radio"
          :aria-checked="brush === s.code"
          class="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          :class="brush === s.code ? 'border-stroke-focus ring-1 ring-stroke-focus' : 'border-stroke-default hover:bg-surface-tertiary'"
          :style="s.code ? { background: tint(s.code, 22) } : undefined"
          @click="brush = s.code"
        >
          <span v-if="!s.code" class="material-symbols-outlined text-sm" aria-hidden="true">ink_eraser</span>
          <span class="text-content-primary">{{ s.label }}</span>
          <kbd v-if="s.key" class="rounded border border-stroke-default px-1 text-[10px] text-content-tertiary">{{ s.key }}</kbd>
        </button>
      </div>
      <span class="ml-auto text-xs" :class="shortList.length || warnings.length ? 'text-danger' : 'text-content-tertiary'" aria-live="polite">
        {{ summaryText }}
      </span>
    </div>

    <div class="max-w-full overflow-x-auto rounded-md border border-stroke-light">
      <table
        role="grid"
        :aria-label="props.label || t.shiftRoster.label"
        :aria-readonly="props.readonly || undefined"
        :aria-describedby="props.readonly ? undefined : `${uid}-hint`"
        class="w-full border-collapse text-sm"
        @pointerup="endDrag"
        @pointerleave="endDrag"
      >
        <thead>
          <tr class="bg-surface-secondary">
            <th scope="col" class="sticky left-0 z-[1] min-w-[8rem] border-b border-r border-stroke-light bg-surface-secondary px-2 py-1.5 text-left text-xs font-semibold text-content-secondary">
              {{ t.shiftRoster.person }}
            </th>
            <th
              v-for="d in dates"
              :key="d"
              scope="col"
              class="min-w-[3.25rem] border-b border-stroke-light px-1 py-1.5 text-center text-xs font-medium"
              :class="isWeekend(d) ? 'bg-surface-tertiary text-content-secondary' : 'text-content-primary'"
            >
              <div class="tabular-nums">{{ shortDate(d) }}</div>
              <div class="text-[10px] text-content-tertiary">{{ weekday(d) }}</div>
            </th>
            <th v-if="props.showStats" scope="col" class="min-w-[5rem] border-b border-l border-stroke-light px-2 py-1.5 text-left text-xs font-semibold text-content-secondary">
              {{ t.shiftRoster.stats }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, ri) in props.people" :key="p.id" class="border-b border-stroke-light last:border-b-0">
            <th scope="row" class="sticky left-0 z-[1] border-r border-stroke-light bg-surface-primary px-2 py-1 text-left font-normal">
              <div class="truncate text-sm font-medium text-content-primary">{{ p.name }}</div>
              <div v-if="p.group" class="truncate text-[11px] text-content-tertiary">{{ p.group }}</div>
            </th>
            <td
              v-for="(d, ci) in dates"
              :key="d"
              :ref="(el) => setCellEl(ri, ci, el as HTMLElement | null)"
              role="gridcell"
              :tabindex="ri === focusRow && ci === focusCol ? 0 : -1"
              :aria-label="cellLabel(p, d)"
              :aria-selected="grab && grab.row === ri && grab.col === ci ? true : undefined"
              class="relative h-10 select-none p-0.5 text-center outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus"
              :class="[isWeekend(d) ? 'bg-surface-secondary' : 'bg-surface-primary', props.readonly ? '' : 'cursor-pointer']"
              @pointerdown="onCellDown($event, ri, ci)"
              @pointerenter="onCellEnter(ri, ci)"
              @focus="focusRow = ri; focusCol = ci"
              @keydown="onCellKeydown($event, ri, ci)"
            >
              <span
                v-if="shiftOf(model, p.id, d)"
                class="flex h-full w-full items-center justify-center rounded text-xs font-semibold text-content-primary"
                :class="grab && grab.row === ri && grab.col === ci ? 'ring-2 ring-stroke-focus' : ''"
                :style="{ background: tint(shiftOf(model, p.id, d)!, 26), boxShadow: `inset 0 0 0 1px ${colorOf(shiftOf(model, p.id, d)!)}` }"
              >{{ shiftOf(model, p.id, d) }}</span>
              <span v-else-if="grab && grab.row === ri && grab.col === ci" class="block h-full w-full rounded ring-2 ring-stroke-focus"></span>
              <span
                v-if="warningAt(p.id, d)"
                class="material-symbols-outlined absolute right-0 top-0 text-[13px] leading-none text-warning"
                aria-hidden="true"
              >warning</span>
            </td>
            <td v-if="props.showStats" class="border-l border-stroke-light px-2 py-1 text-xs text-content-secondary">
              <div class="font-medium tabular-nums text-content-primary">{{ t.shiftRoster.workDays(statsOf(p.id).work) }}</div>
              <div class="truncate tabular-nums text-content-tertiary">{{ statsDetail(p.id) }}</div>
            </td>
          </tr>
        </tbody>
        <!-- 人力：每天每個班別排了幾個 / 需要幾個 -->
        <tfoot v-if="workShifts.length">
          <tr v-for="s in workShifts" :key="s.code" class="border-t border-stroke-light bg-surface-secondary">
            <th scope="row" class="sticky left-0 z-[1] border-r border-stroke-light bg-surface-secondary px-2 py-1 text-left text-xs font-medium text-content-secondary">
              <span class="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle" :style="{ background: colorOf(s.code) }" aria-hidden="true"></span>{{ s.label }}
            </th>
            <td
              v-for="d in dates"
              :key="d"
              class="px-1 py-1 text-center text-xs tabular-nums"
              :class="isShort(d, s.code) ? 'font-semibold text-danger' : 'text-content-secondary'"
              :aria-label="t.shiftRoster.coverageLabel(shortDate(d), s.label, cov[d][s.code], required(props.requirements, d, s.code))"
            >
              <span v-if="isShort(d, s.code)" aria-hidden="true">▲</span>{{ cov[d][s.code] }}<template v-if="required(props.requirements, d, s.code)">/{{ required(props.requirements, d, s.code) }}</template>
            </td>
            <td v-if="props.showStats" class="border-l border-stroke-light"></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <ul v-if="warnings.length && props.showWarnings" class="space-y-0.5 text-xs text-content-secondary">
      <li v-for="(w, i) in warnings.slice(0, 6)" :key="i" class="flex items-center gap-1">
        <span class="material-symbols-outlined text-sm text-warning" aria-hidden="true">warning</span>{{ warningText(w) }}
      </li>
      <li v-if="warnings.length > 6" class="text-content-tertiary">{{ t.shiftRoster.more(warnings.length - 6) }}</li>
    </ul>
    <p v-if="!props.readonly" :id="`${uid}-hint`" class="text-xs text-content-tertiary">{{ mode === 'fill' ? t.shiftRoster.hintFill : t.shiftRoster.hintSwap }}</p>
    <span class="sr-only" aria-live="assertive">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue'
import ChptSegmented from './ChptSegmented.vue'
import { useLocale } from '../shared/config'
import {
  coverage,
  fillRange,
  personStats,
  required,
  rosterDates,
  rosterWarnings,
  setShift,
  shiftOf,
  shortages,
  swapShifts,
  type Roster,
  type RosterPerson,
  type RosterRules,
  type RosterWarning,
  type RosterShift,
  type ShiftRequirement,
} from '../shared/shiftRoster'

/**
 * ChptShiftRoster（CHPT 主題） - 排班表
 *
 * 用途：產線、品保、設備課的輪班表 —— 人員 × 日期，每格一個班別。
 *   - 填入模式：選一個班別（筆刷）後點格子；按住拖曳一次填一整段、Shift + 點填到上一次點的位置；橡皮擦清除
 *   - 交換模式：把一格拖到同一天另一個人身上，兩人互換班別（鍵盤：空白鍵拿起、方向鍵移動、空白鍵放下）
 *   - 下方顯示每天每班排了幾人 / 需要幾人（requirements），不足時紅字 ▲
 *   - 規則提醒：兩班之間休息不足（例如夜班接隔天早班）、連續上班太多天 —— 只提醒，不阻止
 *   - 鍵盤：表格一個 Tab 停駐點，方向鍵移動，按班別的快捷鍵直接填入，Delete 清除
 */

interface ChptShiftRosterProps {
  people: RosterPerson[]
  shifts: RosterShift[]
  /** v-model：{ [人員 id]: { 'YYYY-MM-DD': 班別代碼 } } */
  modelValue?: Roster
  /** 第一天 */
  start: string | Date
  /** 顯示幾天 */
  days?: number
  /** 每天每班需要幾人 */
  requirements?: ShiftRequirement
  /** 規則：minRestHours（預設 11）、maxConsecutive（預設 6）；0 為不檢查 */
  rules?: RosterRules
  /** 右側統計欄 */
  showStats?: boolean
  /** 下方列出規則提醒 */
  showWarnings?: boolean
  readonly?: boolean
  label?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptShiftRosterProps>(), {
  modelValue: () => ({}),
  days: 7,
  requirements: undefined,
  rules: () => ({}),
  showStats: true,
  showWarnings: true,
  readonly: false,
  label: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Roster): void
  /** 一次操作改到的格子（填入一段、交換兩格都只送一次） */
  (e: 'change', cells: Array<{ personId: string; date: string; code: string | null }>): void
}>()

const uid = useId()
const model = computed(() => props.modelValue)
const dates = computed(() => rosterDates(props.start, props.days))

// ---- 班別顏色 ----
const role = (name: string) => `rgb(var(--t-${name}))`
const colorOf = (code: string) => {
  const i = props.shifts.findIndex((s) => s.code === code)
  const s = props.shifts[i]
  if (!s) return role('stroke-dark')
  return s.color ?? (s.off ? role('stroke-dark') : role(`chart-${(i % 8) + 1}`))
}
const tint = (code: string, pct: number) => `color-mix(in srgb, ${colorOf(code)} ${pct}%, transparent)`
const keyOf = (s: RosterShift) => (s.key ?? s.code[0]).toUpperCase()

// ---- 模式與筆刷 ----
const mode = ref<'fill' | 'swap'>('fill')
const modeOptions = computed(() => [
  { label: t.value.shiftRoster.fill, value: 'fill', icon: 'format_paint' },
  { label: t.value.shiftRoster.swap, value: 'swap', icon: 'swap_vert' },
])
const brush = ref<string | null>(props.shifts[0]?.code ?? null)
const brushOptions = computed(() => [
  ...props.shifts.map((s) => ({ code: s.code as string | null, label: s.label, key: keyOf(s) })),
  { code: null, label: t.value.shiftRoster.clear, key: 'Del' },
])

// ---- 日期文字 ----
const toDate = (d: string) => new Date(`${d}T00:00:00`)
const shortDate = (d: string) => `${toDate(d).getMonth() + 1}/${toDate(d).getDate()}`
const weekday = (d: string) => t.value.calendar.weekdaysShort[toDate(d).getDay()]
const isWeekend = (d: string) => [0, 6].includes(toDate(d).getDay())
const shiftLabel = (code: string | null) => (code === null ? t.value.shiftRoster.none : props.shifts.find((s) => s.code === code)?.label ?? code)

// ---- 覆蓋、規則、統計 ----
const cov = computed(() => coverage(model.value, props.people, dates.value, props.shifts))
const shortList = computed(() => shortages(cov.value, props.requirements))
const isShort = (d: string, code: string) => shortList.value.some((x) => x.date === d && x.code === code)
const workShifts = computed(() => props.shifts.filter((s) => !s.off))
const warnings = computed(() => rosterWarnings(model.value, props.people, dates.value, props.shifts, props.rules))
const warningAt = (personId: string, date: string) => warnings.value.find((w) => w.personId === personId && w.date === date)
const nameOf = (id: string) => props.people.find((p) => p.id === id)?.name ?? id
function warningText(w: RosterWarning): string {
  return w.kind === 'rest'
    ? t.value.shiftRoster.restWarning(nameOf(w.personId), shortDate(w.date), Math.round(w.hours * 10) / 10)
    : t.value.shiftRoster.consecutiveWarning(nameOf(w.personId), shortDate(w.date), w.days)
}
const summaryText = computed(() => {
  if (!shortList.value.length && !warnings.value.length) return t.value.shiftRoster.allGood
  return t.value.shiftRoster.summary(shortList.value.length, warnings.value.length)
})
const statsOf = (id: string) => personStats(model.value, id, dates.value, props.shifts)
const statsDetail = (id: string) => {
  const s = statsOf(id)
  return workShifts.value.filter((x) => s.byCode[x.code]).map((x) => `${x.code}×${s.byCode[x.code]}`).join(' ')
}
function cellLabel(p: RosterPerson, d: string): string {
  const parts = [p.name, `${shortDate(d)} ${weekday(d)}`, shiftLabel(shiftOf(model.value, p.id, d))]
  const w = warningAt(p.id, d)
  if (w) parts.push(warningText(w))
  return parts.join(', ')
}

// ---- 寫入 ----
const announcement = ref('')
function commit(next: Roster, cells: Array<{ personId: string; date: string; code: string | null }>): void {
  if (props.readonly || !cells.length) return
  emit('update:modelValue', next)
  emit('change', cells)
}
function apply(ri: number, ci: number, code: string | null): void {
  const p = props.people[ri]
  const d = dates.value[ci]
  if (shiftOf(model.value, p.id, d) === code) return
  commit(setShift(model.value, p.id, d, code), [{ personId: p.id, date: d, code }])
  announcement.value = t.value.shiftRoster.assigned(p.name, shortDate(d), shiftLabel(code))
}
function applyRange(ri: number, fromCol: number, toCol: number, code: string | null): void {
  const p = props.people[ri]
  const ds = dates.value
  const lo = Math.min(fromCol, toCol)
  const hi = Math.max(fromCol, toCol)
  const cells = ds.slice(lo, hi + 1).map((date) => ({ personId: p.id, date, code }))
  commit(fillRange(model.value, p.id, ds, ds[lo], ds[hi], code), cells)
  announcement.value = t.value.shiftRoster.filled(p.name, shortDate(ds[lo]), shortDate(ds[hi]), shiftLabel(code))
}
function swap(col: number, rowA: number, rowB: number): void {
  if (rowA === rowB) return
  const d = dates.value[col]
  const a = props.people[rowA]
  const b = props.people[rowB]
  const next = swapShifts(model.value, d, a.id, b.id)
  commit(next, [
    { personId: a.id, date: d, code: shiftOf(next, a.id, d) },
    { personId: b.id, date: d, code: shiftOf(next, b.id, d) },
  ])
  announcement.value = t.value.shiftRoster.swapped(a.name, b.name, shortDate(d))
}

// ---- 滑鼠 / 觸控 ----
/** 拖曳中：填入模式記起點列與起點欄、交換模式記拿起的格子 */
let drag: { row: number; col: number; pointerType: string } | null = null
let lastClicked: { row: number; col: number } | null = null
const grab = ref<{ row: number; col: number } | null>(null)
function onCellDown(e: PointerEvent, ri: number, ci: number): void {
  if (props.readonly || (e.pointerType === 'mouse' && e.button !== 0)) return
  focusRow.value = ri
  focusCol.value = ci
  if (mode.value === 'swap') {
    grab.value = { row: ri, col: ci }
    drag = { row: ri, col: ci, pointerType: e.pointerType }
    return
  }
  if (e.shiftKey && lastClicked && lastClicked.row === ri) applyRange(ri, lastClicked.col, ci, brush.value)
  else apply(ri, ci, brush.value)
  lastClicked = { row: ri, col: ci }
  drag = { row: ri, col: ci, pointerType: e.pointerType }
}
function onCellEnter(ri: number, ci: number): void {
  // 觸控拖曳是捲動，不是填入
  if (!drag || drag.pointerType === 'touch' || mode.value !== 'fill' || ri !== drag.row) return
  applyRange(ri, drag.col, ci, brush.value)
}
function endDrag(e: PointerEvent): void {
  if (drag && mode.value === 'swap' && grab.value && e.type === 'pointerup') {
    const target = (e.target as HTMLElement).closest?.('td[role="gridcell"]') as HTMLElement | null
    const pos = target ? cellPos(target) : null
    if (pos && pos.col === grab.value.col) swap(pos.col, grab.value.row, pos.row)
    grab.value = null
  }
  drag = null
}

// ---- 鍵盤 ----
const focusRow = ref(0)
const focusCol = ref(0)
const cellEls = new Map<string, HTMLElement>()
function setCellEl(r: number, c: number, el: HTMLElement | null): void {
  if (el) cellEls.set(`${r},${c}`, el)
  else cellEls.delete(`${r},${c}`)
}
function cellPos(el: HTMLElement): { row: number; col: number } | null {
  for (const [k, v] of cellEls) if (v === el) return { row: Number(k.split(',')[0]), col: Number(k.split(',')[1]) }
  return null
}
function moveFocus(r: number, c: number): void {
  focusRow.value = Math.max(0, Math.min(props.people.length - 1, r))
  focusCol.value = Math.max(0, Math.min(dates.value.length - 1, c))
  void nextTick(() => cellEls.get(`${focusRow.value},${focusCol.value}`)?.focus())
}
function onCellKeydown(e: KeyboardEvent, ri: number, ci: number): void {
  const k = e.key
  if (k === 'ArrowRight' || k === 'ArrowLeft') {
    e.preventDefault()
    moveFocus(ri, ci + (k === 'ArrowRight' ? 1 : -1))
    return
  }
  if (k === 'ArrowDown' || k === 'ArrowUp') {
    e.preventDefault()
    // 交換模式拿著格子時只能上下移（同一天）
    moveFocus(ri + (k === 'ArrowDown' ? 1 : -1), ci)
    return
  }
  if (k === 'Home' || k === 'End') {
    e.preventDefault()
    moveFocus(ri, k === 'Home' ? 0 : dates.value.length - 1)
    return
  }
  if (props.readonly) return
  if (k === 'Escape' && grab.value) {
    e.preventDefault()
    grab.value = null
    announcement.value = t.value.shiftRoster.cancelled
    return
  }
  if (k === ' ' || k === 'Enter') {
    e.preventDefault()
    if (mode.value === 'fill') {
      apply(ri, ci, brush.value)
    } else if (!grab.value) {
      grab.value = { row: ri, col: ci }
      announcement.value = t.value.shiftRoster.picked(props.people[ri].name, shortDate(dates.value[ci]))
    } else {
      if (grab.value.col === ci) swap(ci, grab.value.row, ri)
      grab.value = null
    }
    return
  }
  if (k === 'Delete' || k === 'Backspace') {
    e.preventDefault()
    apply(ri, ci, null)
    return
  }
  // 班別快捷鍵：直接填入（兩種模式都可以）
  const s = k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey ? props.shifts.find((x) => keyOf(x) === k.toUpperCase()) : undefined
  if (s) {
    e.preventDefault()
    apply(ri, ci, s.code)
  }
}

defineExpose({
  /** 目前的人力不足清單 */
  shortages: () => shortList.value,
  /** 目前的規則提醒 */
  warnings: () => warnings.value,
})
</script>
