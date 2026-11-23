<template>
  <section class="flex flex-col gap-3" :aria-label="props.label || t.approval.label">
    <!-- 摘要：整體狀態、送出者、總共花了多久 -->
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium" :class="FLOW_CLASS[overall]">
        <span class="material-symbols-outlined text-sm" aria-hidden="true">{{ FLOW_ICON[overall] }}</span>{{ t.approval.flow[overall] }}
      </span>
      <span class="text-content-secondary">{{ t.approval.submitted(props.modelValue.submitter ?? '', timeText(props.modelValue.submittedAt)) }}</span>
      <span v-if="totalText" class="text-content-tertiary">{{ totalText }}</span>
    </div>

    <ol class="flex flex-col">
      <li v-for="(step, i) in props.modelValue.steps" :key="step.id" class="relative flex gap-3 pb-4 last:pb-0" :aria-current="statuses[i] === 'current' ? 'step' : undefined">
        <!-- 左側：狀態圓點與連接線 -->
        <div class="flex flex-col items-center">
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2"
            :style="dotStyle(statuses[i])"
            aria-hidden="true"
          >
            <span class="material-symbols-outlined text-base">{{ STEP_ICON[statuses[i]] }}</span>
          </span>
          <span v-if="i < props.modelValue.steps.length - 1" class="mt-1 w-0.5 flex-1" :style="{ background: statuses[i] === 'approved' ? role('success-solid') : role('stroke-light') }" aria-hidden="true"></span>
        </div>

        <div class="min-w-0 flex-1 pb-1">
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h4 class="text-sm font-semibold" :class="statuses[i] === 'upcoming' || statuses[i] === 'cancelled' ? 'text-content-tertiary' : 'text-content-primary'">{{ step.name }}</h4>
            <span v-if="step.approvers.length > 1" class="rounded bg-surface-tertiary px-1.5 py-0.5 text-[11px] text-content-secondary">{{ t.approval.mode[modeOf(step)] }}</span>
            <span class="text-xs" :class="STEP_TEXT[statuses[i]]">{{ t.approval.step[statuses[i]] }}</span>
            <span v-if="durationText(i)" class="text-xs text-content-tertiary">{{ durationText(i) }}</span>
            <span v-if="overdue(i)" class="inline-flex items-center gap-0.5 rounded bg-danger-subtle px-1.5 py-0.5 text-[11px] font-medium text-danger-on-subtle">
              <span class="material-symbols-outlined text-xs" aria-hidden="true">schedule</span>{{ t.approval.overdue(step.slaHours ?? 0) }}
            </span>
          </div>

          <ul class="mt-1.5 flex flex-col gap-1.5">
            <li v-for="a in step.approvers" :key="a.id" class="flex items-start gap-2">
              <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium"
                :class="a.status === 'approved' ? 'bg-success-subtle text-success-on-subtle' : a.status === 'rejected' ? 'bg-danger-subtle text-danger-on-subtle' : 'bg-surface-tertiary text-content-secondary'"
                aria-hidden="true"
              >{{ initials(a.delegatedTo?.name ?? a.name) }}</span>
              <div class="min-w-0 flex-1 text-sm">
                <div class="flex flex-wrap items-center gap-x-2">
                  <span :class="a.delegatedTo ? 'text-content-tertiary line-through' : 'text-content-primary'">{{ a.name }}</span>
                  <span v-if="a.title" class="text-xs text-content-tertiary">{{ a.title }}</span>
                  <template v-if="a.delegatedTo">
                    <span class="material-symbols-outlined text-sm text-content-tertiary" aria-hidden="true">arrow_forward</span>
                    <span class="text-content-primary">{{ t.approval.delegatedTo(a.delegatedTo.name) }}</span>
                  </template>
                  <span class="rounded px-1.5 py-0.5 text-[11px] font-medium" :class="APPROVER_CLASS[a.status ?? 'pending']">{{ approverStatusText(a, statuses[i]) }}</span>
                  <span v-if="a.actedAt" class="text-xs text-content-tertiary">{{ timeText(a.actedAt) }}</span>
                </div>
                <p v-if="a.comment" class="mt-1 whitespace-pre-wrap rounded border-l-2 border-stroke-default bg-surface-secondary px-2 py-1 text-xs text-content-secondary">{{ a.comment }}</p>
              </div>
            </li>
          </ul>

          <!-- 簽核：目前關卡、輪到 operator 的時候 -->
          <div v-if="acting && acting.stepIndex === i && !props.readonly" class="mt-3 rounded-md border border-stroke-default bg-surface-primary p-3">
            <p class="mb-2 text-sm font-medium text-content-primary">
              {{ acting.approver.delegatedTo ? t.approval.actOnBehalf(acting.approver.name) : t.approval.yourTurn }}
            </p>
            <label :for="`${uid}-comment`" class="mb-1 block text-xs text-content-secondary">{{ t.approval.comment }}</label>
            <textarea
              :id="`${uid}-comment`"
              v-model="comment"
              rows="2"
              class="w-full rounded-md border bg-surface-primary px-2 py-1.5 text-sm text-content-primary outline-none placeholder:text-content-disabled focus:ring-1 focus:ring-stroke-focus"
              :class="error ? 'border-danger' : 'border-stroke-default focus:border-stroke-focus'"
              :placeholder="t.approval.commentPlaceholder"
              :aria-invalid="!!error"
              :aria-describedby="error ? `${uid}-error` : undefined"
            ></textarea>
            <p v-if="error" :id="`${uid}-error`" class="mt-1 text-xs text-danger" role="alert">{{ error }}</p>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <ChptButton size="sm" color="success" icon="check" @click="submit('approved')">{{ t.approval.approve }}</ChptButton>
              <ChptButton size="sm" color="danger" is-outline icon="undo" @click="submit('rejected')">{{ t.approval.reject }}</ChptButton>
              <template v-if="canDelegate">
                <ChptButton size="sm" is-outline icon="forward" :aria-expanded="delegating" @click="delegating = !delegating">{{ t.approval.delegate }}</ChptButton>
              </template>
            </div>
            <div v-if="delegating" class="mt-2 flex flex-wrap items-center gap-2" role="group" :aria-label="t.approval.delegate">
              <span class="text-xs text-content-secondary">{{ t.approval.delegatePick }}</span>
              <ChptButton v-for="d in delegateOptions" :key="d.id" size="xs" is-outline @click="doDelegate(d)">
                {{ d.title ? `${d.name} · ${d.title}` : d.name }}
              </ChptButton>
            </div>
          </div>
        </div>
      </li>
    </ol>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import ChptButton from './ChptButton.vue'
import { useLocale } from '../shared/config'
import { durationParts } from '../shared/equipment'
import {
  act,
  actingApprover,
  delegate as delegateFlow,
  flowStatus,
  inStep,
  isOverdue,
  stepDuration,
  stepFinishedAt,
  stepStatuses,
  toMs,
  type ApprovalAction,
  type ApprovalFlowData,
  type ApprovalStep,
  type Approver,
  type Delegate,
  type FlowStatus,
  type StepStatus,
} from '../shared/approval'

/**
 * ChptApprovalFlow（CHPT 主題） - 簽核流程
 *
 * 用途：表單、工程變更（ECN）、異常處理單的簽核進度與簽核動作。
 *   - 關卡依序進行；多人關卡可以是會簽（全部同意）或或簽（一人同意）；任一人退回整份退回
 *   - 每一關顯示花了 / 已經等了多久，超過 slaHours 標示逾時
 *   - 委託（代理）：簽核人把這一關交給別人，由代理人決定
 *   - 輪到 operator 時（自己或代理）顯示簽核區：意見、同意、退回（退回要寫意見）、委託
 *
 * v-model 是整份流程資料：簽核動作直接改這份資料，並送出 approve / reject / delegate 事件給後端。
 */

interface ChptApprovalFlowProps {
  modelValue: ApprovalFlowData
  /** 目前操作的人（id）；輪到他（或他是代理人）時顯示簽核區 */
  operator?: string
  /** 可以委託的人 */
  delegates?: Delegate[]
  /** 退回時一定要寫意見 */
  requireRejectComment?: boolean
  readonly?: boolean
  /** 計算等待時間用的現在時間；不給時每分鐘更新 */
  now?: number | Date | null
  label?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptApprovalFlowProps>(), {
  operator: '',
  delegates: () => [],
  requireRejectComment: true,
  readonly: false,
  now: null,
  label: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: ApprovalFlowData): void
  (e: 'approve', payload: { stepId: string; approverId: string; comment: string }): void
  (e: 'reject', payload: { stepId: string; approverId: string; comment: string }): void
  (e: 'delegate', payload: { stepId: string; approverId: string; to: Delegate }): void
}>()

const uid = useId()
const role = (name: string) => `rgb(var(--t-${name}))`

// ---- 時間 ----
const clock = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  if (props.now === null) timer = setInterval(() => (clock.value = Date.now()), 60_000)
})
onBeforeUnmount(() => timer && clearInterval(timer))
const nowMs = computed(() => (props.now === null ? clock.value : props.now instanceof Date ? props.now.getTime() : props.now))
const timeText = (v: string | number | Date | undefined) => {
  const ms = toMs(v)
  return ms === null ? '—' : new Date(ms).toLocaleString(t.value.code, { hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
const durText = (ms: number) => {
  const p = durationParts(ms)
  return p ? t.value.equipment.duration(p.d, p.h, p.m) : ''
}

// ---- 狀態 ----
const statuses = computed(() => stepStatuses(props.modelValue))
const overall = computed(() => flowStatus(props.modelValue))
const modeOf = (s: ApprovalStep) => s.mode ?? (s.approvers.length > 1 ? 'all' : 'single')
function durationText(i: number): string {
  const s = statuses.value[i]
  if (s === 'upcoming' || s === 'cancelled') return ''
  const d = stepDuration(props.modelValue, i, nowMs.value)
  if (d === null) return ''
  return s === 'current' ? t.value.approval.waiting(durText(d)) : t.value.approval.took(durText(d))
}
const overdue = (i: number) => statuses.value[i] !== 'upcoming' && statuses.value[i] !== 'cancelled' && isOverdue(props.modelValue, i, nowMs.value)
const totalText = computed(() => {
  const start = toMs(props.modelValue.submittedAt)
  if (start === null) return ''
  if (overall.value === 'in-progress') return t.value.approval.elapsed(durText(nowMs.value - start))
  // 已結束：最後完成的那一關的時間
  const ends = props.modelValue.steps.map(stepFinishedAt).filter((x): x is number => x !== null)
  return ends.length ? t.value.approval.total(durText(Math.max(...ends) - start)) : ''
})
function approverStatusText(a: Approver, step: StepStatus): string {
  const s = a.status ?? 'pending'
  if (s !== 'pending') return t.value.approval.approver[s]
  // 或簽已經有人同意 / 流程已退回：沒簽的人不用簽了
  if (step === 'approved' || step === 'rejected' || step === 'cancelled') return t.value.approval.approver.skipped
  return step === 'current' ? t.value.approval.approver.pending : t.value.approval.approver.waiting
}
const initials = (name: string) => [...name.trim()].slice(0, name.match(/[㐀-鿿]/) ? 1 : 2).join('').toUpperCase()

const STEP_ICON: Record<StepStatus, string> = { approved: 'check', rejected: 'close', current: 'hourglass_top', upcoming: 'more_horiz', cancelled: 'remove' }
const STEP_TEXT: Record<StepStatus, string> = {
  approved: 'text-success',
  rejected: 'text-danger',
  current: 'font-medium text-accent',
  upcoming: 'text-content-tertiary',
  cancelled: 'text-content-tertiary',
}
function dotStyle(s: StepStatus) {
  const c = { approved: role('success-solid'), rejected: role('danger-solid'), current: role('accent'), upcoming: role('stroke-default'), cancelled: role('stroke-default') }[s]
  return s === 'approved' || s === 'rejected'
    ? { background: c, borderColor: c, color: role('surface-primary') }
    : { background: role('surface-primary'), borderColor: c, color: s === 'current' ? c : role('content-tertiary') }
}
const FLOW_CLASS: Record<FlowStatus, string> = {
  approved: 'bg-success-subtle text-success-on-subtle',
  rejected: 'bg-danger-subtle text-danger-on-subtle',
  'in-progress': 'bg-accent-subtle text-accent-on-subtle',
}
const FLOW_ICON: Record<FlowStatus, string> = { approved: 'task_alt', rejected: 'cancel', 'in-progress': 'pending' }
const APPROVER_CLASS: Record<string, string> = {
  approved: 'bg-success-subtle text-success-on-subtle',
  rejected: 'bg-danger-subtle text-danger-on-subtle',
  pending: 'bg-surface-tertiary text-content-secondary',
}

// ---- 簽核 ----
const acting = computed(() => actingApprover(props.modelValue, props.operator))
const comment = ref('')
const error = ref('')
const delegating = ref(false)
const announcement = ref('')
watch(
  () => acting.value?.approver.id,
  () => {
    comment.value = ''
    error.value = ''
    delegating.value = false
  }
)
watch(comment, () => (error.value = ''))
const delegateOptions = computed(() => {
  const a = acting.value
  if (!a) return []
  const busy = inStep(props.modelValue.steps[a.stepIndex])
  return props.delegates.filter((d) => d.id !== props.operator && !busy.has(d.id))
})
const canDelegate = computed(() => !!acting.value && !acting.value.approver.delegatedTo && delegateOptions.value.length > 0)

function submit(action: ApprovalAction): void {
  const a = acting.value
  if (!a || props.readonly) return
  if (action === 'rejected' && props.requireRejectComment && !comment.value.trim()) {
    error.value = t.value.approval.rejectNeedsComment
    return
  }
  const next = act(props.modelValue, props.operator, action, comment.value, nowMs.value)
  if (!next) return
  const payload = { stepId: props.modelValue.steps[a.stepIndex].id, approverId: a.approver.id, comment: comment.value.trim() }
  emit('update:modelValue', next)
  if (action === 'approved') emit('approve', payload)
  else emit('reject', payload)
  announcement.value = action === 'approved' ? t.value.approval.approvedAnnounce : t.value.approval.rejectedAnnounce
}
function doDelegate(to: Delegate): void {
  const a = acting.value
  if (!a || props.readonly) return
  const next = delegateFlow(props.modelValue, props.operator, to, nowMs.value)
  if (!next) return
  emit('update:modelValue', next)
  emit('delegate', { stepId: props.modelValue.steps[a.stepIndex].id, approverId: a.approver.id, to })
  announcement.value = t.value.approval.delegatedAnnounce(to.name)
}

defineExpose({
  /** 目前輪到 operator 簽的關卡與簽核人（沒有時為 null） */
  acting,
})
</script>
