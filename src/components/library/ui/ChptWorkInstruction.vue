<template>
  <section class="flex flex-col gap-3" :aria-label="props.title || t.workInstruction.label">
    <!-- 標題、進度、總計時 -->
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h3 v-if="props.title" class="text-base font-semibold text-content-primary">{{ props.title }}</h3>
      <span class="text-sm text-content-secondary">{{ done ? t.workInstruction.finished : t.workInstruction.progress(index + 1, props.steps.length) }}</span>
      <span class="ml-auto font-mono text-sm tabular-nums text-content-secondary">{{ t.workInstruction.total(clock(totalMs)) }}</span>
    </div>
    <div
      class="h-1.5 overflow-hidden rounded-full bg-surface-tertiary"
      role="progressbar"
      :aria-valuemin="0"
      :aria-valuemax="props.steps.length"
      :aria-valuenow="completedCount"
      :aria-label="t.workInstruction.progressLabel"
    >
      <div class="h-full rounded-full bg-accent transition-[width]" :style="{ width: `${(completedCount / Math.max(1, props.steps.length)) * 100}%` }"></div>
    </div>

    <!-- 步驟列：完成的與目前的可以點 -->
    <ol class="flex flex-wrap gap-1.5" :aria-label="t.workInstruction.stepsLabel">
      <li v-for="(s, i) in props.steps" :key="s.id">
        <button
          type="button"
          class="flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus disabled:cursor-not-allowed"
          :class="
            i === index && !done
              ? 'border-stroke-focus bg-accent-solid text-white'
              : isDone(s)
                ? 'border-success bg-success-subtle text-success-on-subtle'
                : 'border-stroke-default bg-surface-primary text-content-tertiary'
          "
          :disabled="!canJump(i)"
          :aria-current="i === index && !done ? 'step' : undefined"
          :aria-label="t.workInstruction.stepButton(i + 1, s.title, isDone(s))"
          @click="go(i)"
        >
          <span v-if="isDone(s) && (i !== index || done)" class="material-symbols-outlined text-sm" aria-hidden="true">check</span>
          <template v-else>{{ i + 1 }}</template>
        </button>
      </li>
    </ol>

    <!-- 完成 -->
    <div v-if="done" class="rounded-lg border border-success bg-success-subtle p-4 text-success-on-subtle">
      <p class="mb-2 flex items-center gap-2 text-base font-semibold">
        <span class="material-symbols-outlined" aria-hidden="true">task_alt</span>{{ t.workInstruction.doneTitle(clock(summary.durationMs ?? 0)) }}
      </p>
      <ul class="space-y-1 text-sm text-content-primary">
        <li v-for="(s, i) in summary.steps" :key="s.id" class="flex flex-wrap gap-x-2">
          <span class="tabular-nums text-content-tertiary">{{ i + 1 }}.</span>
          <span class="flex-1">{{ s.title }}</span>
          <span v-if="s.value !== undefined" class="font-mono" :class="s.ok ? '' : 'text-danger'">{{ valueText(s.value, props.steps[i]) }}</span>
          <span class="font-mono tabular-nums text-content-tertiary">{{ clock(s.durationMs ?? 0) }}</span>
        </li>
      </ul>
      <ChptButton v-if="!props.readonly" class="mt-3" size="sm" is-outline icon="restart_alt" @click="restart()">{{ t.workInstruction.restart }}</ChptButton>
    </div>

    <!-- 目前的步驟 -->
    <article
      v-else-if="step"
      :key="step.id"
      ref="article"
      tabindex="-1"
      class="flex flex-col gap-3 rounded-lg border border-stroke-light bg-surface-primary p-3 outline-none sm:p-4"
      style="touch-action: pan-y"
      :aria-labelledby="`${uid}-title`"
      @pointerdown="onSwipeStart"
      @pointerup="onSwipeEnd"
      @keydown="onKeydown"
    >
      <h4 :id="`${uid}-title`" class="flex items-baseline gap-2 text-lg font-semibold text-content-primary">
        <span class="text-accent">{{ index + 1 }}</span>{{ step.title }}
      </h4>

      <div v-if="step.image" class="relative overflow-hidden rounded-md border border-stroke-light bg-surface-secondary">
        <img :src="step.image" :alt="step.imageAlt ?? step.title" class="block h-auto w-full" draggable="false" />
        <span
          v-for="(m, k) in step.marks ?? []"
          :key="k"
          class="absolute flex h-7 min-w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 px-1 text-xs font-bold shadow"
          style="background: rgb(var(--t-danger-solid)); color: #fff; border-color: #fff"
          :style="{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }"
          :title="m.label"
        >{{ k + 1 }}</span>
      </div>
      <ol v-if="step.marks?.some((m) => m.label)" class="list-none space-y-0.5 text-sm text-content-secondary">
        <li v-for="(m, k) in step.marks" :key="k"><strong class="text-content-primary">{{ k + 1 }}</strong> {{ m.label }}</li>
      </ol>

      <p v-if="step.body" class="whitespace-pre-wrap text-sm text-content-primary">{{ step.body }}</p>

      <div v-if="step.cautions?.length" class="rounded-md border border-warning bg-warning-subtle p-2.5 text-sm text-warning-on-subtle" role="note">
        <p class="mb-1 flex items-center gap-1 font-medium"><span class="material-symbols-outlined text-base" aria-hidden="true">warning</span>{{ t.workInstruction.caution }}</p>
        <ul class="list-disc space-y-0.5 pl-5">
          <li v-for="(c, k) in step.cautions" :key="k">{{ c }}</li>
        </ul>
      </div>

      <dl v-if="step.specs?.length" class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md bg-surface-secondary p-2.5 text-sm">
        <template v-for="(sp, k) in step.specs" :key="k">
          <dt class="text-content-secondary">{{ sp.label }}</dt>
          <dd class="font-mono font-medium text-content-primary">{{ sp.value }}{{ sp.unit ? ` ${sp.unit}` : '' }}</dd>
        </template>
      </dl>

      <!-- 前進條件 -->
      <div v-if="step.check" class="rounded-md border border-stroke-default p-2.5">
        <label v-if="step.check.kind === 'confirm'" class="flex cursor-pointer items-center gap-3 text-sm text-content-primary">
          <input
            type="checkbox"
            class="h-6 w-6 accent-[rgb(var(--t-accent))]"
            :checked="!!rec?.confirmed"
            :disabled="props.readonly"
            @change="setConfirmed(($event.target as HTMLInputElement).checked)"
          />
          {{ step.check.label }}
        </label>
        <div v-else class="flex flex-wrap items-center gap-2">
          <label :for="`${uid}-measure`" class="text-sm text-content-primary">{{ step.check.label }}</label>
          <input
            :id="`${uid}-measure`"
            type="number"
            inputmode="decimal"
            :step="step.check.precision !== undefined ? 10 ** -step.check.precision : 'any'"
            class="h-control-md w-32 rounded-md border bg-surface-primary px-2 text-right font-mono text-base text-content-primary outline-none focus:ring-1 focus:ring-stroke-focus"
            :class="rec?.value !== undefined && rec?.value !== null && !rec?.ok ? 'border-danger' : 'border-stroke-default'"
            :value="rec?.value ?? ''"
            :disabled="props.readonly"
            :aria-invalid="rec?.value !== undefined && rec?.value !== null && !rec?.ok"
            :aria-describedby="`${uid}-range`"
            @input="setMeasure(($event.target as HTMLInputElement).value)"
          />
          <span v-if="step.check.unit" class="text-sm text-content-secondary">{{ step.check.unit }}</span>
          <span :id="`${uid}-range`" class="text-xs text-content-tertiary">{{ rangeText(step.check) }}</span>
          <span
            v-if="rec?.value !== undefined && rec?.value !== null"
            class="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium"
            :class="rec.ok ? 'bg-success-subtle text-success-on-subtle' : 'bg-danger-subtle text-danger-on-subtle'"
          >
            <span class="material-symbols-outlined text-sm" aria-hidden="true">{{ rec.ok ? 'check' : 'close' }}</span>{{ rec.ok ? t.workInstruction.pass : t.workInstruction.fail }}
          </span>
        </div>
      </div>

      <!-- 導覽 -->
      <div class="flex flex-wrap items-center gap-2 border-t border-stroke-light pt-3">
        <ChptButton size="md" is-outline icon="chevron_left" :disabled="index === 0" @click="go(index - 1)">{{ t.workInstruction.prev }}</ChptButton>
        <span class="font-mono text-xs tabular-nums text-content-tertiary">{{ t.workInstruction.stepTime(clock(stepElapsed)) }}</span>
        <p v-if="block.length" class="ml-auto text-xs text-content-secondary" :id="`${uid}-why`">{{ blockText }}</p>
        <ChptButton
          :class="block.length ? '' : 'ml-auto'"
          size="md"
          :icon="isLast ? 'task_alt' : 'chevron_right'"
          icon-position="right"
          :disabled="block.length > 0 || props.readonly"
          :aria-describedby="block.length ? `${uid}-why` : undefined"
          @click="next()"
        >{{ isLast ? t.workInstruction.finish : t.workInstruction.next }}</ChptButton>
      </div>
    </article>
    <p class="text-xs text-content-tertiary">{{ t.workInstruction.hint }}</p>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, useTemplateRef, watch } from 'vue'
import ChptButton from './ChptButton.vue'
import { useLocale } from '../shared/config'
import { blockers, formatClock, inSpec, patchRecord, summarize, type WiCheck, type WiRecord, type WiStep, type WiSummary } from '../shared/workInstruction'

/**
 * ChptWorkInstruction（CHPT 主題） - 作業指導書（SOP）
 *
 * 用途：現場一步一步照著做 —— 換線、設備保養、首件檢驗、組裝。
 *   - 每一步：圖片（可加編號標記）、說明、注意事項、規格（扭力、溫度…）
 *   - 前進條件：勾選確認或輸入量測值（超出上下限不能下一步）；minSeconds 至少停留幾秒
 *   - 步驟列：完成的步驟可以回去看；未完成的不能跳過
 *   - 平板上左右滑動切換、鍵盤 ← →；每一步與總共的計時
 *   - 完成時送出 complete（每一步的時間、量測值、是否合格），v-model:record 隨時保存（中斷後可以接著做）
 */

interface ChptWorkInstructionProps {
  steps: WiStep[]
  /** v-model:record：每一步的紀錄 */
  record?: WiRecord
  /** v-model:current：目前第幾步（0 起算） */
  current?: number
  title?: string
  readonly?: boolean
  /** 計時用的現在時間；不給時每秒更新 */
  now?: number | Date | null
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptWorkInstructionProps>(), {
  record: () => ({}),
  current: 0,
  title: '',
  readonly: false,
  now: null,
})

const emit = defineEmits<{
  (e: 'update:record', value: WiRecord): void
  (e: 'update:current', value: number): void
  (e: 'complete', summary: WiSummary): void
}>()

const uid = useId()

// ---- 時間 ----
const clockNow = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  if (props.now === null) timer = setInterval(() => (clockNow.value = Date.now()), 1000)
})
onBeforeUnmount(() => timer && clearInterval(timer))
const nowMs = computed(() => (props.now === null ? clockNow.value : props.now instanceof Date ? props.now.getTime() : props.now))
const clock = formatClock

// ---- 狀態 ----
const record = shallowRef<WiRecord>(props.record)
watch(
  () => props.record,
  (v) => (record.value = v)
)
const index = ref(Math.min(Math.max(0, props.current), Math.max(0, props.steps.length - 1)))
watch(
  () => props.current,
  (v) => (index.value = Math.min(Math.max(0, v), Math.max(0, props.steps.length - 1)))
)
const step = computed(() => props.steps[index.value])
const rec = computed(() => (step.value ? record.value[step.value.id] : undefined))
const isDone = (s: WiStep) => record.value[s.id]?.completedAt !== undefined
const completedCount = computed(() => props.steps.filter(isDone).length)
const done = computed(() => props.steps.length > 0 && completedCount.value === props.steps.length && finished.value)
const finished = ref(props.steps.length > 0 && props.steps.every(isDone))
const isLast = computed(() => index.value === props.steps.length - 1)
const summary = computed(() => summarize(props.steps, record.value))

function setRecord(next: WiRecord): void {
  record.value = next
  emit('update:record', next)
}
/** 進入一步時記下開始時間（第一次進入才記） */
function enter(i: number): void {
  const s = props.steps[i]
  if (!s || props.readonly || record.value[s.id]?.startedAt !== undefined) return
  setRecord(patchRecord(record.value, s.id, { startedAt: nowMs.value }))
}
onMounted(() => {
  if (!finished.value) enter(index.value)
})

const stepElapsed = computed(() => {
  const r = rec.value
  if (!r?.startedAt) return 0
  return (r.completedAt ?? nowMs.value) - r.startedAt
})
const totalMs = computed(() => {
  const s = summary.value
  if (s.startedAt === null) return 0
  return (done.value && s.completedAt !== null ? s.completedAt : nowMs.value) - s.startedAt
})

// ---- 前進條件 ----
const block = computed(() => (step.value && !isDone(step.value) ? blockers(step.value, rec.value, stepElapsed.value) : []))
const blockText = computed(() => {
  const s = step.value
  return block.value
    .map((b) => (b === 'wait' && s?.minSeconds ? t.value.workInstruction.block.wait(Math.max(0, Math.ceil(s.minSeconds - stepElapsed.value / 1000))) : t.value.workInstruction.block[b as 'confirm' | 'measure' | 'outOfSpec']))
    .join(t.value.workInstruction.sep)
})
function setConfirmed(v: boolean): void {
  if (!step.value || props.readonly) return
  setRecord(patchRecord(record.value, step.value.id, { confirmed: v }))
}
function setMeasure(raw: string): void {
  const s = step.value
  if (!s || s.check?.kind !== 'measure' || props.readonly) return
  const v = raw.trim() === '' ? null : Number(raw)
  const value = v === null || !Number.isFinite(v) ? null : v
  setRecord(patchRecord(record.value, s.id, { value, ok: inSpec(value, s.check.lsl, s.check.usl) }))
}
function rangeText(c: Extract<WiCheck, { kind: 'measure' }>): string {
  const u = c.unit ? ` ${c.unit}` : ''
  if (c.lsl !== undefined && c.usl !== undefined) return t.value.workInstruction.range(`${c.lsl}`, `${c.usl}${u}`)
  if (c.lsl !== undefined) return t.value.workInstruction.min(`${c.lsl}${u}`)
  if (c.usl !== undefined) return t.value.workInstruction.max(`${c.usl}${u}`)
  return ''
}
const valueText = (v: number | null | undefined, s: WiStep) => {
  if (v === null || v === undefined) return '—'
  const c = s.check?.kind === 'measure' ? s.check : null
  return `${c?.precision !== undefined ? v.toFixed(c.precision) : v}${c?.unit ? ` ${c.unit}` : ''}`
}

// ---- 導覽 ----
const article = useTemplateRef<HTMLElement>('article')
const announcement = ref('')
/** 可以跳到：完成的步驟、目前的步驟、第一個未完成的步驟 */
const firstOpen = computed(() => {
  const i = props.steps.findIndex((s) => !isDone(s))
  return i < 0 ? props.steps.length - 1 : i
})
const canJump = (i: number) => i <= firstOpen.value || isDone(props.steps[i])
function go(i: number): void {
  if (i < 0 || i >= props.steps.length || !canJump(i)) return
  finished.value = false
  index.value = i
  emit('update:current', i)
  enter(i)
  announcement.value = t.value.workInstruction.announceStep(i + 1, props.steps[i].title)
  void nextTick(() => article.value?.focus())
}
function next(): void {
  const s = step.value
  if (!s || block.value.length || props.readonly) return
  if (!isDone(s)) setRecord(patchRecord(record.value, s.id, { completedAt: nowMs.value }))
  if (isLast.value) {
    if (props.steps.every(isDone)) {
      finished.value = true
      emit('complete', summarize(props.steps, record.value))
      announcement.value = t.value.workInstruction.finished
    } else go(firstOpen.value)
    return
  }
  go(index.value + 1)
}
function restart(): void {
  setRecord({})
  finished.value = false
  index.value = 0
  emit('update:current', 0)
  enter(0)
}

// ---- 滑動、鍵盤 ----
let swipe: { x: number; y: number; id: number } | null = null
function onSwipeStart(e: PointerEvent): void {
  const target = e.target as HTMLElement
  if (target.closest('input, button, label, select, textarea')) return
  swipe = { x: e.clientX, y: e.clientY, id: e.pointerId }
}
function onSwipeEnd(e: PointerEvent): void {
  const s = swipe
  swipe = null
  if (!s || s.id !== e.pointerId) return
  const dx = e.clientX - s.x
  const dy = e.clientY - s.y
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
  if (dx < 0) next()
  else go(index.value - 1)
}
function onKeydown(e: KeyboardEvent): void {
  if ((e.target as HTMLElement).closest('input, textarea, select')) return
  if (e.key === 'ArrowRight' || e.key === 'PageDown') {
    e.preventDefault()
    next()
  } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
    e.preventDefault()
    go(index.value - 1)
  }
}

defineExpose({ next, prev: () => go(index.value - 1), go, restart, summary })
</script>
