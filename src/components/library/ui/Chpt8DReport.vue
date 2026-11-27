<template>
  <div class="eight-d flex flex-col gap-4 text-sm">
    <!-- 標頭：編號、主旨、進度、匯出 -->
    <div class="flex flex-wrap items-end gap-3">
      <label class="flex flex-col gap-1 text-xs text-content-secondary">
        {{ t.eightD.number }}
        <input
          v-if="editable"
          :value="report.number ?? ''"
          class="h-control-sm w-36 rounded-md border border-stroke-default bg-surface-primary px-2 text-sm text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          @change="commit({ ...report, number: inputValue($event) })"
        />
        <span v-else class="text-sm font-medium text-content-primary">{{ report.number || '—' }}</span>
      </label>
      <label class="flex min-w-60 flex-1 flex-col gap-1 text-xs text-content-secondary">
        {{ t.eightD.subject }}
        <input
          v-if="editable"
          :value="report.title"
          class="h-control-sm rounded-md border border-stroke-default bg-surface-primary px-2 text-sm text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
          @change="commit({ ...report, title: inputValue($event) })"
        />
        <span v-else class="text-base font-semibold text-content-primary">{{ report.title || t.eightD.untitled }}</span>
      </label>
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums"
          :class="progress.closed ? 'bg-success-subtle text-success-on-subtle' : 'bg-surface-secondary text-content-secondary'"
        >{{ progress.closed ? t.eightD.closed : t.eightD.progress(progress.done, progress.total) }}</span>
        <ChptButton size="sm" color="secondary" is-outline icon="description" @click="exportText()">{{ t.eightD.exportText }}</ChptButton>
        <ChptButton size="sm" color="secondary" is-outline icon="print" @click="print()">{{ t.eightD.print }}</ChptButton>
      </div>
    </div>
    <div class="h-1.5 overflow-hidden rounded-full bg-surface-tertiary" aria-hidden="true">
      <div class="h-full rounded-full transition-[width]" :style="{ width: `${(progress.done / progress.total) * 100}%`, background: role(progress.closed ? 'success-solid' : 'accent-solid') }"></div>
    </div>

    <div class="grid gap-4 md:grid-cols-[13rem_minmax(0,1fr)]">
      <!-- 步驟清單：手機上橫向捲動 -->
      <nav ref="navRef" :aria-label="t.eightD.stepsNav" class="-mx-1 overflow-x-auto px-1 md:mx-0 md:overflow-visible md:px-0">
        <ol class="flex gap-1.5 md:flex-col">
          <li v-for="key in EIGHT_D_STEPS" :key="key" class="shrink-0">
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
              :class="active === key ? 'border-accent bg-accent-subtle' : 'border-transparent hover:bg-surface-secondary'"
              :aria-current="active === key ? 'step' : undefined"
              :data-step="key"
              @click="goTo(key)"
            >
              <span class="material-symbols-outlined text-lg" :style="{ color: stateColor(key) }" aria-hidden="true">{{ STATE_ICON[stateOf(key)] }}</span>
              <span class="flex flex-col">
                <span class="whitespace-nowrap font-medium text-content-primary">{{ t.eightD.steps[key] }}</span>
                <!-- 逾期用成對的 subtle 底 / on-subtle 字：在選取中的藍底上也看得清楚 -->
                <span v-if="overdue(key)" class="self-start rounded bg-danger-subtle px-1 text-[11px] font-medium text-danger-on-subtle">{{ t.eightD.overdue }}</span>
                <span v-else class="text-[11px] text-content-secondary">{{ t.eightD.states[stateOf(key)] }}</span>
              </span>
            </button>
          </li>
        </ol>
      </nav>

      <!-- 目前步驟 -->
      <section :aria-labelledby="`${uid}-h`" class="flex min-w-0 flex-col gap-4 rounded-lg border border-stroke-light bg-surface-primary p-4">
        <header>
          <h3 :id="`${uid}-h`" ref="headingRef" tabindex="-1" class="text-base font-semibold text-content-primary focus:outline-none">{{ t.eightD.steps[active] }}</h3>
          <p class="mt-0.5 text-xs text-content-secondary">{{ t.eightD.hints[active] }}</p>
          <p v-if="step.done && step.completedAt" class="mt-1 text-xs" :style="{ color: role('success') }">{{ t.eightD.completedOn(step.completedAt) }}</p>
        </header>

        <!-- 負責人與期限 -->
        <div class="flex flex-wrap gap-3">
          <label class="flex flex-col gap-1 text-xs text-content-secondary">
            {{ t.eightD.owner }}
            <input v-if="editable" :value="step.owner ?? ''" :class="INPUT" class="w-36" @change="patch({ owner: inputValue($event) })" />
            <span v-else class="text-sm text-content-primary">{{ step.owner || '—' }}</span>
          </label>
          <label class="flex flex-col gap-1 text-xs text-content-secondary">
            {{ t.eightD.due }}
            <input v-if="editable" type="date" :value="dateText(step.due)" :class="INPUT" @change="patch({ due: inputValue($event) || null })" />
            <span v-else class="text-sm tabular-nums text-content-primary">{{ dateText(step.due) || '—' }}</span>
          </label>
        </div>

        <!-- D1 團隊 -->
        <div v-if="active === 'd1'" class="flex flex-col gap-2">
          <ul class="flex flex-col gap-2">
            <li v-for="m in step.members ?? []" :key="m.id" class="flex flex-wrap items-center gap-2" :data-member="m.id">
              <template v-if="editable">
                <input :value="m.name" :aria-label="t.eightD.member" :placeholder="t.eightD.member" :class="INPUT" class="w-32" @change="patchItem('members', m.id, { name: inputValue($event) })" />
                <input :value="m.role ?? ''" :aria-label="t.eightD.role" :placeholder="t.eightD.role" :class="INPUT" class="w-40" @change="patchItem('members', m.id, { role: inputValue($event) })" />
                <label class="inline-flex items-center gap-1 text-xs text-content-secondary">
                  <input type="radio" :name="`${uid}-leader`" :checked="!!m.leader" @change="setLeader(m.id)" />
                  {{ t.eightD.leader }}
                </label>
                <button type="button" :class="ICON_BTN" :aria-label="t.eightD.removeMember(m.name || t.eightD.untitled)" @click="removeItem('members', m.id)">
                  <span class="material-symbols-outlined text-lg" aria-hidden="true">close</span>
                </button>
              </template>
              <template v-else>
                <span class="font-medium text-content-primary">{{ m.name }}</span>
                <span v-if="m.role" class="text-xs text-content-secondary">{{ m.role }}</span>
                <span v-if="m.leader" class="rounded bg-accent-subtle px-1.5 text-[11px] font-medium text-accent-on-subtle">{{ t.eightD.leader }}</span>
              </template>
            </li>
          </ul>
          <ChptButton v-if="editable" class="self-start" size="xs" color="secondary" is-outline icon="person_add" @click="addItem('members', { name: '', role: '', leader: !(step.members ?? []).length })">{{ t.eightD.addMember }}</ChptButton>
        </div>

        <!-- D2 5W2H -->
        <div v-if="active === 'd2'" class="grid gap-3 sm:grid-cols-2">
          <label v-for="k in FIVE_W2H" :key="k" class="flex flex-col gap-1 text-xs text-content-secondary">
            {{ t.eightD.fiveW2H[k] }}
            <textarea
              v-if="editable"
              :value="step.fiveW2H?.[k] ?? ''"
              rows="2"
              :data-field="k"
              :class="TEXTAREA"
              @change="patch({ fiveW2H: { ...(step.fiveW2H ?? {}), [k]: inputValue($event) } })"
            ></textarea>
            <span v-else class="whitespace-pre-wrap text-sm text-content-primary">{{ step.fiveW2H?.[k] || '—' }}</span>
          </label>
        </div>

        <!-- D4 5 Why：發生與流出 -->
        <div v-if="active === 'd4'" class="grid gap-4 lg:grid-cols-2">
          <fieldset v-for="side in SIDES" :key="side" class="flex flex-col gap-2 rounded-md border border-stroke-light p-3">
            <legend class="px-1 text-xs font-semibold text-content-primary">{{ t.eightD[side] }}</legend>
            <ol class="flex flex-col gap-1.5">
              <li v-for="n in 5" :key="n" class="flex items-center gap-2">
                <span class="w-16 shrink-0 text-xs text-content-tertiary">{{ t.eightD.why(n) }}</span>
                <input
                  v-if="editable"
                  :value="step.whys?.[side]?.[n - 1] ?? ''"
                  :aria-label="t.eightD.labeled(t.eightD[side], t.eightD.why(n))"
                  :data-why="`${side}-${n}`"
                  :class="INPUT"
                  class="min-w-0 flex-1"
                  @change="setWhy(side, n - 1, inputValue($event))"
                />
                <span v-else class="text-sm text-content-primary">{{ step.whys?.[side]?.[n - 1] || '—' }}</span>
              </li>
            </ol>
            <label class="flex flex-col gap-1 text-xs font-medium text-content-secondary">
              {{ t.eightD.rootCause }}
              <input
                v-if="editable"
                :value="step.rootCause?.[side] ?? ''"
                :aria-label="t.eightD.labeled(t.eightD[side], t.eightD.rootCause)"
                :data-root="side"
                :class="INPUT"
                @change="patch({ rootCause: { ...(step.rootCause ?? {}), [side]: inputValue($event) } })"
              />
              <span v-else class="text-sm font-semibold text-content-primary">{{ step.rootCause?.[side] || '—' }}</span>
            </label>
          </fieldset>
          <label class="inline-flex items-center gap-2 text-sm text-content-primary lg:col-span-2">
            <input type="checkbox" :checked="!!step.rootCause?.verified" :disabled="!editable" @change="patch({ rootCause: { ...(step.rootCause ?? {}), verified: checkedValue($event) } })" />
            {{ t.eightD.verified }}
          </label>
          <slot name="d4" :report="report" />
        </div>

        <!-- D3 / D5 / D6 對策 -->
        <div v-if="ACTION_STEPS.includes(active)" class="flex flex-col gap-2">
          <ul class="flex flex-col gap-2">
            <li v-for="a in step.actions ?? []" :key="a.id" class="flex flex-wrap items-center gap-2 rounded-md border border-stroke-light px-2 py-1.5" :data-action="a.id">
              <template v-if="editable">
                <label class="inline-flex items-center gap-1 text-xs text-content-secondary">
                  <input type="checkbox" :checked="!!a.done" @change="patchItem('actions', a.id, { done: checkedValue($event) })" />
                  {{ t.eightD.actionDone }}
                </label>
                <input :value="a.text" :aria-label="t.eightD.action" :placeholder="t.eightD.action" :class="INPUT" class="min-w-48 flex-1" @change="patchItem('actions', a.id, { text: inputValue($event) })" />
                <input :value="a.owner ?? ''" :aria-label="t.eightD.owner" :placeholder="t.eightD.owner" :class="INPUT" class="w-28" @change="patchItem('actions', a.id, { owner: inputValue($event) })" />
                <input type="date" :value="dateText(a.due)" :aria-label="t.eightD.due" :class="INPUT" @change="patchItem('actions', a.id, { due: inputValue($event) || null })" />
                <button type="button" :class="ICON_BTN" :aria-label="t.eightD.removeAction(a.text || t.eightD.untitled)" @click="removeItem('actions', a.id)">
                  <span class="material-symbols-outlined text-lg" aria-hidden="true">delete</span>
                </button>
              </template>
              <template v-else>
                <span class="material-symbols-outlined text-base" :style="{ color: a.done ? role('success') : role('content-tertiary') }" aria-hidden="true">{{ a.done ? 'check_circle' : 'radio_button_unchecked' }}</span>
                <span class="flex-1 text-content-primary">{{ a.text }}<span class="sr-only">{{ a.done ? t.eightD.states.done : t.eightD.states.inProgress }}</span></span>
                <span v-if="a.owner" class="text-xs text-content-secondary">{{ a.owner }}</span>
                <span v-if="dateText(a.due)" class="text-xs tabular-nums text-content-secondary">{{ dateText(a.due) }}</span>
              </template>
            </li>
          </ul>
          <ChptButton v-if="editable" class="self-start" size="xs" color="secondary" is-outline icon="add" @click="addItem('actions', { text: '', owner: '', due: null, done: false })">{{ t.eightD.addAction }}</ChptButton>
        </div>

        <!-- D7 預防再發 -->
        <fieldset v-if="active === 'd7'" class="flex flex-col gap-1.5">
          <legend class="sr-only">{{ t.eightD.steps.d7 }}</legend>
          <label v-for="k in PREVENTION_ITEMS" :key="k" class="inline-flex items-center gap-2 text-sm text-content-primary">
            <input type="checkbox" :checked="!!step.prevention?.[k]" :disabled="!editable" :data-prevention="k" @change="patch({ prevention: { ...(step.prevention ?? {}), [k]: checkedValue($event) } })" />
            {{ t.eightD.prevention[k] }}
          </label>
        </fieldset>

        <!-- 說明（每一步都有） -->
        <label class="flex flex-col gap-1 text-xs text-content-secondary">
          {{ t.eightD.text }}
          <textarea v-if="editable" :value="step.text ?? ''" rows="3" data-field="text" :class="TEXTAREA" @change="patch({ text: inputValue($event) })"></textarea>
          <span v-else class="whitespace-pre-wrap text-sm text-content-primary">{{ step.text || '—' }}</span>
        </label>

        <!-- 必填檢查 -->
        <div v-if="errors.length" role="alert" class="rounded-md bg-danger-subtle px-3 py-2 text-xs text-danger-on-subtle">
          <p class="font-semibold">{{ t.eightD.cannotComplete }}</p>
          <ul class="mt-1 list-inside list-disc">
            <li v-for="e in errors" :key="e">{{ t.eightD.missing[e] }}</li>
          </ul>
        </div>

        <footer class="flex flex-wrap items-center gap-2 border-t border-stroke-light pt-3">
          <ChptButton size="sm" color="secondary" is-outline icon="chevron_left" :disabled="index === 0" @click="move(-1)">{{ t.eightD.prev }}</ChptButton>
          <ChptButton size="sm" color="secondary" is-outline icon="chevron_right" icon-position="right" :disabled="index === EIGHT_D_STEPS.length - 1" @click="move(1)">{{ t.eightD.next }}</ChptButton>
          <template v-if="editable">
            <ChptButton v-if="!step.done" class="ml-auto" size="sm" color="success" icon="task_alt" @click="complete()">{{ t.eightD.complete }}</ChptButton>
            <ChptButton v-else class="ml-auto" size="sm" color="secondary" is-outline icon="undo" @click="reopen()">{{ t.eightD.reopen }}</ChptButton>
          </template>
        </footer>
      </section>
    </div>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * Chpt8DReport 8D 報告 —— 客訴與品質異常的問題解決流程。
 *
 * 左邊是 D0–D8 步驟（狀態、逾期），右邊編輯目前的步驟：每步都有負責人、期限與說明，另外
 * D1 團隊成員（指定組長）、D2 5W2H、D3 / D5 / D6 對策、D4 發生與流出各一條 5 Why 與根本原因、D7 預防再發檢查項目。
 * 「標記完成」前檢查必填，沒填齊會列出缺什麼。v-model 是 EightDReport；可匯出文字（Markdown）與列印。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import ChptButton from './ChptButton.vue'
import { useLocale } from '../shared/config'
import { downloadBlob } from '../shared/download'
import { localDayKey } from '../shared/fmea'
import {
  EIGHT_D_STEPS,
  FIVE_W2H,
  PREVENTION_ITEMS,
  createEightD,
  eightDMissing,
  eightDProgress,
  eightDText,
  stepOverdue,
  stepState,
  updateStep,
  type EightDMissing,
  type EightDReport,
  type EightDStep,
  type EightDStepKey,
  type EightDStepState,
} from '../shared/eightD'

export interface Chpt8DReportProps {
  /** 8D 報告（v-model） */
  modelValue?: EightDReport | null
  /** 唯讀 */
  readonly?: boolean
  /** 一開始顯示的步驟（預設第一個還沒完成的） */
  initialStep?: EightDStepKey
  /** 判斷逾期與完成日期的「今天」（預設現在） */
  today?: number | string | Date
  /** 匯出檔名（不含副檔名） */
  filename?: string
}

const props = withDefaults(defineProps<Chpt8DReportProps>(), {
  modelValue: null,
  readonly: false,
  initialStep: undefined,
  today: undefined,
  filename: '8d-report',
})

const emit = defineEmits<{
  'update:modelValue': [report: EightDReport]
  /** 某一步標記完成 */
  'step-complete': [key: EightDStepKey]
  /** 切換步驟 */
  'step-change': [key: EightDStepKey]
}>()

const t = useLocale()
const uid = useId()
const role = (name: string) => `rgb(var(--t-${name}))`
const INPUT = 'h-control-sm rounded-md border border-stroke-default bg-surface-primary px-2 text-sm text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus'
const TEXTAREA = 'resize-y rounded-md border border-stroke-default bg-surface-primary px-2 py-1 text-sm text-content-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus'
const ICON_BTN = 'inline-flex size-7 items-center justify-center rounded-md text-content-secondary hover:bg-surface-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus'
const STATE_ICON: Record<EightDStepState, string> = { done: 'check_circle', inProgress: 'pending', empty: 'radio_button_unchecked' }
const ACTION_STEPS: EightDStepKey[] = ['d3', 'd5', 'd6']
const SIDES = ['occurrence', 'escape'] as const

const editable = computed(() => !props.readonly)
const report = computed<EightDReport>(() => props.modelValue ?? createEightD())
const progress = computed(() => eightDProgress(report.value, props.today))

const active = ref<EightDStepKey>(props.initialStep ?? progress.value.current ?? 'd0')
const index = computed(() => EIGHT_D_STEPS.indexOf(active.value))
const step = computed<EightDStep>(() => report.value.steps?.[active.value] ?? {})
const errors = ref<EightDMissing[]>([])
const announcement = ref('')
const headingRef = ref<HTMLElement | null>(null)
watch(active, () => {
  errors.value = []
  void nextTick(revealActive)
})

/** 手機上步驟清單是橫向捲動：把目前的步驟捲進來（只動清單自己的 scrollLeft，不捲整頁） */
const navRef = ref<HTMLElement | null>(null)
function revealActive() {
  const nav = navRef.value
  const btn = nav?.querySelector<HTMLElement>(`[data-step="${active.value}"]`)
  if (!nav || !btn || nav.scrollWidth <= nav.clientWidth) return
  const left = btn.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft
  if (left < nav.scrollLeft || left + btn.offsetWidth > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = Math.max(0, left - 8)
}
// 掛載當下版面還不是最後的樣子：圖示字型還沒載入時，圖示名稱（radio_button_unchecked…）會先以文字排版，
// 清單寬一倍。字型載入完再對齊一次；外框尺寸改變（轉向）時也重新對齊。
let navObserver: ResizeObserver | null = null
onMounted(() => {
  revealActive()
  if (typeof document !== 'undefined') document.fonts?.ready.then(revealActive, () => {})
  if (typeof ResizeObserver !== 'undefined' && navRef.value) {
    navObserver = new ResizeObserver(() => revealActive())
    navObserver.observe(navRef.value)
  }
})
onBeforeUnmount(() => navObserver?.disconnect())

const stateOf = (k: EightDStepKey) => stepState(report.value.steps?.[k])
const overdue = (k: EightDStepKey) => stepOverdue(report.value.steps?.[k], props.today)
function stateColor(k: EightDStepKey): string {
  if (overdue(k)) return role('danger')
  const st = stateOf(k)
  return st === 'done' ? role('success') : st === 'inProgress' ? role('accent') : role('content-tertiary')
}

function dateText(v: EightDStep['due']): string {
  const k = localDayKey(v)
  if (k === null) return ''
  const s = String(k)
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}
const inputValue = (e: Event) => (e.target as HTMLInputElement).value
const checkedValue = (e: Event) => (e.target as HTMLInputElement).checked

function commit(next: EightDReport) {
  emit('update:modelValue', next)
}
function patch(p: Partial<EightDStep>) {
  commit(updateStep(report.value, active.value, p))
  if (errors.value.length) errors.value = eightDMissing(active.value, { ...step.value, ...p })
}

let seq = 0
const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(++seq).toString(36)}`
type ListKey = 'members' | 'actions'
async function addItem(list: ListKey, item: Record<string, unknown>) {
  const id = newId(list === 'members' ? 'm' : 'a')
  patch({ [list]: [...((step.value[list] as { id: string }[] | undefined) ?? []), { id, ...item }] })
  await nextTick()
  if (typeof document !== 'undefined') document.querySelector<HTMLInputElement>(`[data-${list === 'members' ? 'member' : 'action'}="${id}"] input:not([type])`)?.focus()
}
function patchItem(list: ListKey, id: string, p: Record<string, unknown>) {
  patch({ [list]: ((step.value[list] as { id: string }[] | undefined) ?? []).map((x) => (x.id === id ? { ...x, ...p } : x)) })
}
function removeItem(list: ListKey, id: string) {
  patch({ [list]: ((step.value[list] as { id: string }[] | undefined) ?? []).filter((x) => x.id !== id) })
}
function setLeader(id: string) {
  patch({ members: (step.value.members ?? []).map((m) => ({ ...m, leader: m.id === id })) })
}
function setWhy(side: (typeof SIDES)[number], i: number, value: string) {
  const list = [...(step.value.whys?.[side] ?? [])]
  while (list.length < i) list.push('')
  list[i] = value
  patch({ whys: { ...(step.value.whys ?? {}), [side]: list } })
}

async function goTo(key: EightDStepKey) {
  if (key === active.value) return
  active.value = key
  emit('step-change', key)
  await nextTick()
  headingRef.value?.focus()
}
const move = (d: number) => goTo(EIGHT_D_STEPS[Math.min(EIGHT_D_STEPS.length - 1, Math.max(0, index.value + d))])

/** 標記完成：必填沒填齊時列出缺什麼；完成後跳到下一個還沒完成的步驟 */
function complete(): boolean {
  const miss = eightDMissing(active.value, step.value)
  errors.value = miss
  if (miss.length) return false
  const key = active.value
  const next = updateStep(report.value, key, { done: true, completedAt: dateText(props.today ?? Date.now()) })
  commit(next)
  emit('step-complete', key)
  announcement.value = t.value.eightD.stepCompleted(t.value.eightD.steps[key])
  const following = EIGHT_D_STEPS.slice(EIGHT_D_STEPS.indexOf(key) + 1).find((k) => !next.steps[k]?.done)
  if (following) void goTo(following)
  return true
}
function reopen() {
  commit(updateStep(report.value, active.value, { done: false, completedAt: null }))
  announcement.value = t.value.eightD.stepReopened(t.value.eightD.steps[active.value])
}

const textLabels = computed(() => ({
  steps: t.value.eightD.steps,
  fiveW2H: t.value.eightD.fiveW2H,
  prevention: t.value.eightD.prevention,
  owner: t.value.eightD.owner,
  due: t.value.eightD.due,
  leader: t.value.eightD.leader,
  occurrence: t.value.eightD.occurrence,
  escape: t.value.eightD.escape,
  rootCause: t.value.eightD.rootCause,
  verified: t.value.eightD.verified,
  done: t.value.eightD.done,
  why: t.value.eightD.why,
}))
/** 報告的 Markdown 文字 */
const toText = () => eightDText(report.value, textLabels.value)
function exportText(filename = props.filename) {
  downloadBlob(new Blob([toText()], { type: 'text/markdown;charset=utf-8' }), `${filename}.md`)
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
/** 列印：在隱藏的 iframe 裡排版整份報告（不受目前顯示哪一步影響），印完移除 */
function print() {
  if (typeof document === 'undefined') return
  const lines = toText().split('\n')
  const body = lines
    .map((l) => {
      if (l.startsWith('# ')) return `<h1>${escapeHtml(l.slice(2))}</h1>`
      if (l.startsWith('## ')) return `<h2>${escapeHtml(l.slice(3))}</h2>`
      if (l.startsWith('### ')) return `<h3>${escapeHtml(l.slice(4))}</h3>`
      return l ? `<p>${escapeHtml(l)}</p>` : ''
    })
    .join('')
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0'
  frame.setAttribute('aria-hidden', 'true')
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  const win = frame.contentWindow
  if (doc && win) {
    doc.open()
    doc.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(report.value.title)}</title><style>/* theme-ok: paper is always dark text on white */body{font:12pt/1.5 system-ui,sans-serif;margin:16mm;color:#111}h1{font-size:18pt}h2{font-size:13pt;margin:14pt 0 4pt;border-bottom:1px solid #999}h3{font-size:11pt;margin:8pt 0 2pt}p{margin:2pt 0;white-space:pre-wrap}</style></head><body>${body}</body></html>`,
    )
    doc.close()
    try {
      win.focus()
      win.print()
    } catch {
      /* 有些環境（測試、受限的 iframe）沒有 print */
    }
  }
  setTimeout(() => frame.remove(), 1000)
}

defineExpose({
  /** 切換到某一步 */
  goTo,
  /** 標記目前步驟完成（必填沒填齊時回傳 false 並顯示缺少的欄位） */
  complete,
  /** 報告的 Markdown 文字 */
  toText,
  /** 下載 Markdown 檔 */
  exportText,
  /** 列印整份報告 */
  print,
})
</script>
