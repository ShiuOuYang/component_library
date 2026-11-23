<template>
  <div class="feeder-map flex flex-col gap-3">
    <!-- 摘要 -->
    <div class="flex flex-wrap items-center gap-2 text-sm">
      <h3 v-if="props.title" class="text-base font-semibold text-content-primary">{{ props.title }}</h3>
      <span
        class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium"
        :class="summary.ready ? 'bg-success-subtle text-success-on-subtle' : 'bg-warning-subtle text-warning-on-subtle'"
      >
        <span class="material-symbols-outlined text-base" aria-hidden="true">{{ summary.ready ? 'check_circle' : 'pending' }}</span>
        {{ summary.ready ? t.feeder.ready : t.feeder.notReady }}
      </span>
      <span class="rounded-full border border-stroke-default px-2.5 py-0.5 tabular-nums text-content-primary">{{ t.feeder.loaded(summary.loaded, summary.total) }}</span>
      <span v-if="summary.wrong" class="rounded-full border px-2.5 py-0.5 tabular-nums" :style="chipStyle('danger')">{{ t.feeder.wrong }} {{ summary.wrong }}</span>
      <span v-if="summary.empty" class="rounded-full border px-2.5 py-0.5 tabular-nums" :style="chipStyle('danger')">{{ t.feeder.empty }} {{ summary.empty }}</span>
      <span v-if="summary.low" class="rounded-full border px-2.5 py-0.5 tabular-nums" :style="chipStyle('warning')">{{ t.feeder.low }} {{ summary.low }}</span>
      <span v-if="summary.minBoards !== null" class="tabular-nums text-content-secondary">{{ t.feeder.minBoards(fmt(summary.minBoards)) }}</span>
      <span class="ml-auto flex flex-wrap gap-1.5">
        <ChptButton v-if="props.sound && !props.readonly" size="xs" is-outline :icon="muted ? 'volume_off' : 'volume_up'" :aria-pressed="muted" @click="muted = !muted">
          {{ muted ? t.feeder.unmute : t.feeder.mute }}
        </ChptButton>
        <ChptButton size="xs" is-outline icon="download" :disabled="!props.log.length" @click="exportCsv()">{{ t.feeder.exportCsv }}</ChptButton>
      </span>
    </div>

    <!-- 掃描 -->
    <div v-if="!props.readonly" class="flex flex-col gap-2 rounded-lg border border-stroke-light bg-surface-secondary p-3">
      <ol class="flex flex-wrap items-center gap-2 text-sm" :aria-label="t.feeder.steps">
        <li class="inline-flex items-center gap-1.5" :aria-current="pending ? undefined : 'step'">
          <span class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold" :class="pending ? 'bg-success-solid text-white' : 'bg-accent-solid text-white'">
            <span v-if="pending" class="material-symbols-outlined text-sm" aria-hidden="true">check</span><template v-else>1</template>
          </span>
          <span :class="pending ? 'text-content-secondary' : 'font-medium text-content-primary'">{{ t.feeder.step1 }}</span>
          <strong v-if="pendingSlot" class="font-mono text-content-primary">{{ pendingSlot.id }}</strong>
        </li>
        <li class="material-symbols-outlined text-base text-content-tertiary" aria-hidden="true">chevron_right</li>
        <li class="inline-flex items-center gap-1.5" :aria-current="pending ? 'step' : undefined">
          <span class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold" :class="pending ? 'bg-accent-solid text-white' : 'border border-stroke-default text-content-tertiary'">2</span>
          <span :class="pending ? 'font-medium text-content-primary' : 'text-content-tertiary'">{{ t.feeder.step2 }}</span>
          <span v-if="pendingSlot" class="font-mono text-content-secondary">{{ t.feeder.needs(pendingSlot.partNo) }}</span>
        </li>
        <li v-if="pending" class="ml-auto">
          <ChptButton size="xs" is-outline icon="close" @click="selectSlot(null)">{{ t.feeder.cancel }}</ChptButton>
        </li>
      </ol>
      <ChptScanInput
        ref="scanRef"
        :label="pendingSlot ? t.feeder.scanReel(pendingSlot.id) : t.feeder.scanSlot"
        :placeholder="t.feeder.placeholder"
        :autofocus="props.autofocus"
        :disabled="!!mismatch"
        duplicate="allow"
        show-submit
        @scan="(r) => scan(r.value)"
      />

      <!-- 結果 -->
      <div
        v-if="mismatch"
        class="flex flex-wrap items-center gap-3 rounded-lg p-3 text-white motion-safe:animate-pulse"
        :style="{ background: role('danger-solid') }"
        role="alert"
      >
        <span class="material-symbols-outlined text-4xl" aria-hidden="true">dangerous</span>
        <span class="min-w-0 flex-1">
          <strong class="block text-lg">{{ t.feeder.ngTitle }}</strong>
          <span class="block text-sm">{{ t.feeder.ngDetail(mismatch.slot, mismatch.expected, mismatch.partNo) }}</span>
        </span>
        <button
          ref="ackRef"
          type="button"
          class="rounded-md border-2 bg-transparent px-3 py-1.5 text-sm font-semibold text-white hover:bg-black/15 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style="border-color: #fff; outline-color: #fff"
          @click="acknowledge()"
        >
          {{ t.feeder.acknowledge }}
        </button>
      </div>
      <div v-else-if="notice" class="flex items-start gap-2 rounded-md px-3 py-2 text-sm" :class="notice.ok ? 'bg-success-subtle text-success-on-subtle' : 'bg-warning-subtle text-warning-on-subtle'">
        <span class="material-symbols-outlined text-lg" aria-hidden="true">{{ notice.ok ? 'check_circle' : 'warning' }}</span>
        <span><strong v-if="notice.ok" class="mr-1.5">{{ t.feeder.okTitle }}</strong>{{ notice.text }}</span>
      </div>
    </div>

    <!-- 站位圖 -->
    <div class="flex items-center gap-2 text-sm">
      <label class="inline-flex cursor-pointer items-center gap-1.5 text-content-secondary">
        <input v-model="attentionOnly" type="checkbox" class="h-4 w-4 accent-[rgb(var(--t-accent-solid))]" />
        {{ t.feeder.attentionOnly }}
      </label>
    </div>
    <section v-for="g in groups" :key="g.group" class="flex flex-col gap-2" :aria-label="g.group || undefined">
      <h4 v-if="g.group" class="text-sm font-semibold text-content-secondary">{{ g.group }}</h4>
      <ul class="grid gap-2" style="grid-template-columns: repeat(auto-fill, minmax(132px, 1fr))">
        <li v-for="s in g.slots" :key="s.id">
          <button
            type="button"
            class="flex h-full w-full flex-col gap-0.5 rounded-md border bg-surface-primary px-2.5 py-2 text-left text-xs transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
            :class="[props.readonly ? 'cursor-default' : 'hover:bg-surface-secondary', status(s) === 'unloaded' ? 'border-dashed' : '']"
            :style="tileStyle(s)"
            :aria-pressed="props.readonly ? undefined : pending === s.id"
            :aria-label="slotLabel(s)"
            :disabled="props.readonly"
            @click="selectSlot(pending === s.id ? null : s.id)"
          >
            <span class="flex items-center gap-1">
              <strong class="min-w-0 flex-1 truncate font-mono text-sm text-content-primary">{{ s.id }}</strong>
              <span class="material-symbols-outlined text-base" :style="{ color: statusColor(s) }" aria-hidden="true">{{ statusIcon(s) }}</span>
            </span>
            <span class="truncate font-mono text-content-primary" :title="s.partNo">{{ s.partNo }}</span>
            <span v-if="s.description" class="truncate text-content-tertiary" :title="s.description">{{ s.description }}</span>
            <template v-if="loadOf(s)">
              <span class="truncate font-mono text-content-tertiary" :title="loadOf(s)!.reelId">{{ loadOf(s)!.reelId }}</span>
              <span class="mt-auto flex items-baseline gap-1 pt-1">
                <strong class="tabular-nums" :style="{ color: statusColor(s) }">{{ t.feeder.qty(fmt(loadOf(s)!.qty)) }}</strong>
                <span v-if="boardsLeft(s, loadOf(s)) !== null" class="ml-auto tabular-nums text-content-tertiary">{{ t.feeder.boards(fmt(boardsLeft(s, loadOf(s))!)) }}</span>
              </span>
            </template>
            <span v-else class="mt-auto pt-1 text-content-tertiary">{{ t.feeder.unloaded }}</span>
          </button>
        </li>
      </ul>
    </section>
    <p v-if="!groups.length" class="py-6 text-center text-sm text-content-tertiary">{{ attentionOnly ? t.feeder.allGood : t.feeder.noSlots }}</p>

    <!-- 紀錄 -->
    <details class="rounded-lg border border-stroke-light">
      <summary class="cursor-pointer select-none px-3 py-2 text-sm font-medium text-content-primary">{{ t.feeder.log(props.log.length) }}</summary>
      <div class="max-h-72 overflow-auto border-t border-stroke-light">
        <table v-if="props.log.length" class="w-full text-xs">
          <thead class="sticky top-0 bg-surface-secondary text-left text-content-secondary">
            <tr>
              <th v-for="c in logColumns" :key="c.key" scope="col" class="whitespace-nowrap px-2 py-1.5 font-medium">{{ c.title }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stroke-light">
            <tr v-for="(e, i) in recentLog" :key="i" :class="e.result === 'mismatch' ? 'bg-danger-subtle text-danger-on-subtle' : 'text-content-primary'">
              <td class="whitespace-nowrap px-2 py-1 tabular-nums">{{ clockOf(e.at) }}</td>
              <td class="whitespace-nowrap px-2 py-1 font-mono">{{ e.slot }}</td>
              <td class="whitespace-nowrap px-2 py-1">{{ e.result === 'ok' ? t.feeder.resultOk : t.feeder.resultNg }}</td>
              <td class="whitespace-nowrap px-2 py-1 font-mono">{{ e.expected }}</td>
              <td class="whitespace-nowrap px-2 py-1 font-mono">{{ e.partNo }}</td>
              <td class="whitespace-nowrap px-2 py-1 font-mono">{{ e.reelId }}</td>
              <td class="whitespace-nowrap px-2 py-1 text-right tabular-nums">{{ fmt(e.qty) }}</td>
              <td class="whitespace-nowrap px-2 py-1">{{ e.lot ?? '' }}</td>
              <td class="whitespace-nowrap px-2 py-1">{{ e.operator ?? '' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="px-3 py-3 text-sm text-content-tertiary">{{ t.feeder.logEmpty }}</p>
      </div>
    </details>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * ChptFeederMap 上料防錯 —— 掃站位 → 掃料盤，跟 BOM 比對料號，錯料時紅色警示 + 警報音，必須確認才能繼續。
 * 站位圖顯示每個站位裝的料盤、剩餘數量（低料 / 用完）、估計還能生產幾片；上料紀錄可匯出 CSV。
 */
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef } from 'vue'
import ChptButton from './ChptButton.vue'
import ChptScanInput from './ChptScanInput.vue'
import { useLocale } from '../shared/config'
import { playAlarmTone } from '../shared/alarm'
import { beep } from '../shared/cameraScan'
import { csvBlob, downloadBlob } from '../charts/utils/chartExport'
import {
  boardsLeft,
  feederStock,
  feederSummary,
  findSlot,
  groupSlots,
  matchesSlot,
  parseReelCode,
  reelInUse,
  type FeederLoad,
  type FeederLoads,
  type FeederLogEntry,
  type FeederReel,
  type FeederSlot,
} from '../shared/feeder'

/** 掃描被拒絕的原因 */
export type FeederRejectReason = 'needSlot' | 'unknownCode' | 'badReel' | 'reelInUse' | 'locked'

export interface ChptFeederMapProps {
  /** 站位（BOM） */
  slots: FeederSlot[]
  /** 站位 id → 目前裝的料盤（數量由父層依生產扣減） */
  loads?: FeederLoads
  /** 上料紀錄（含錯料） */
  log?: FeederLogEntry[]
  /** 數量 ≤ 這個值算低料 */
  lowQty?: number
  /** 料盤條碼解析；預設 `料號|數量|料盤號[|批號]` */
  parseReel?: (code: string) => FeederReel | null
  /** 操作員（寫進紀錄） */
  operator?: string
  title?: string
  /** 正確嗶一聲、錯料響警報 */
  sound?: boolean
  /** 只看（不能掃描、選站位） */
  readonly?: boolean
  /** 掃描框自動取得焦點 */
  autofocus?: boolean
  /** 紀錄最多保留幾筆 */
  maxLog?: number
  /** 匯出檔名（不含副檔名） */
  filename?: string
  /** 紀錄時間；不給時用 Date.now() */
  now?: number | Date | null
}

const t = useLocale()
const props = withDefaults(defineProps<ChptFeederMapProps>(), {
  loads: () => ({}),
  log: () => [],
  lowQty: 200,
  parseReel: parseReelCode,
  operator: '',
  title: '',
  sound: true,
  readonly: false,
  autofocus: false,
  maxLog: 1000,
  filename: 'feeder-log',
  now: null,
})

const emit = defineEmits<{
  (e: 'update:loads', loads: FeederLoads): void
  (e: 'update:log', log: FeederLogEntry[]): void
  /** 料號正確，已上料 */
  (e: 'load', entry: FeederLogEntry): void
  /** 料號不符 BOM（沒有上料） */
  (e: 'mismatch', entry: FeederLogEntry): void
  /** 選到的站位（掃描或點選）；取消為 null */
  (e: 'select', slotId: string | null): void
  /** 掃描被拒絕 */
  (e: 'reject', detail: { reason: FeederRejectReason; code: string }): void
}>()

const role = (name: string) => `rgb(var(--t-${name}))`
const fmt = (n: number) => n.toLocaleString()
const pad = (n: number) => String(n).padStart(2, '0')
const clockOf = (ms: number) => {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
const nowMs = () => (props.now === null ? Date.now() : props.now instanceof Date ? props.now.getTime() : props.now)

// ---- 狀態 ----
const summary = computed(() => feederSummary(props.slots, props.loads, props.lowQty))
const loadOf = (s: FeederSlot): FeederLoad | undefined => props.loads[s.id]
type SlotStatus = 'unloaded' | 'ok' | 'low' | 'empty' | 'wrong'
function status(s: FeederSlot): SlotStatus {
  const l = loadOf(s)
  if (l && !matchesSlot(s, l.partNo)) return 'wrong'
  return feederStock(l, props.lowQty)
}
const statusText = (s: FeederSlot) => t.value.feeder[status(s)]
const statusIcon = (s: FeederSlot) => ({ unloaded: 'radio_button_unchecked', ok: 'check_circle', low: 'warning', empty: 'block', wrong: 'dangerous' })[status(s)]
function statusColor(s: FeederSlot): string {
  const st = status(s)
  return st === 'ok' ? role('success-solid') : st === 'low' ? role('warning-solid') : st === 'unloaded' ? role('content-tertiary') : role('danger-solid')
}
const chipStyle = (kind: 'danger' | 'warning') => ({ borderColor: role(`${kind}-solid`), color: role(`${kind}-solid`) })

const flash = ref<{ slot: string; ok: boolean } | null>(null)
function tileStyle(s: FeederSlot) {
  const st = status(s)
  const c = statusColor(s)
  const style: Record<string, string> = {
    borderColor: st === 'unloaded' ? role('stroke-default') : c,
    borderLeftWidth: st === 'unloaded' ? '1px' : '4px',
  }
  if (st === 'wrong' || st === 'empty') style.background = `color-mix(in srgb, ${c} 10%, ${role('surface-primary')})`
  if (pending.value === s.id) style.boxShadow = `0 0 0 3px ${role('accent-solid')}`
  else if (flash.value?.slot === s.id) style.boxShadow = `0 0 0 3px ${flash.value.ok ? role('success-solid') : role('danger-solid')}`
  return style
}
function slotLabel(s: FeederSlot): string {
  const l = loadOf(s)
  const b = boardsLeft(s, l)
  return t.value.feeder.slotLabel(s.id, s.partNo, statusText(s), l ? fmt(l.qty) : '', b === null ? '' : fmt(b))
}

const attentionOnly = ref(false)
const groups = computed(() =>
  groupSlots(attentionOnly.value ? props.slots.filter((s) => status(s) !== 'ok') : props.slots)
)
const recentLog = computed(() => [...props.log].reverse())

// ---- 掃描流程 ----
const pending = ref<string | null>(null)
const pendingSlot = computed(() => (pending.value ? props.slots.find((s) => s.id === pending.value) ?? null : null))
const mismatch = ref<FeederLogEntry | null>(null)
const notice = ref<{ ok: boolean; text: string } | null>(null)
const announcement = ref('')
const scanRef = useTemplateRef<{ focus: () => void }>('scanRef')
const ackRef = useTemplateRef<HTMLButtonElement>('ackRef')

function selectSlot(id: string | null): void {
  if (props.readonly || mismatch.value) return
  pending.value = id
  notice.value = null
  emit('select', id)
  if (id) {
    const s = pendingSlot.value!
    announcement.value = t.value.feeder.selected(s.id, s.partNo)
    scanRef.value?.focus()
  }
}

function reject(reason: FeederRejectReason, code: string, text: string): void {
  notice.value = { ok: false, text }
  announcement.value = text
  emit('reject', { reason, code })
}

function appendLog(entry: FeederLogEntry): void {
  const next = [...props.log, entry]
  emit('update:log', next.length > props.maxLog ? next.slice(next.length - props.maxLog) : next)
}

/** 處理一筆掃描（站位條碼或料盤條碼） */
function scan(raw: string): void {
  const code = raw.trim()
  if (props.readonly || !code) return
  const f = t.value.feeder
  if (mismatch.value) return reject('locked', code, f.reject.locked)
  const slot = findSlot(props.slots, code)
  if (slot) return selectSlot(slot.id)
  const reel = props.parseReel(code)
  if (!pending.value) return reject(reel ? 'needSlot' : 'unknownCode', code, reel ? f.reject.needSlot : f.reject.unknownCode(code))
  if (!reel) return reject('badReel', code, f.reject.badReel(code))
  const target = pendingSlot.value!
  const other = reelInUse(props.loads, reel.reelId, target.id)
  if (other) return reject('reelInUse', code, f.reject.reelInUse(reel.reelId, other))

  const at = nowMs()
  const ok = matchesSlot(target, reel.partNo)
  const entry: FeederLogEntry = {
    at,
    slot: target.id,
    expected: target.partNo,
    reelId: reel.reelId,
    partNo: reel.partNo,
    qty: reel.qty,
    ...(reel.lot ? { lot: reel.lot } : {}),
    result: ok ? 'ok' : 'mismatch',
    ...(props.operator ? { operator: props.operator } : {}),
  }
  appendLog(entry)
  showFlash(target.id, ok)
  if (ok) {
    const load: FeederLoad = { ...reel, loadedAt: at, ...(props.operator ? { operator: props.operator } : {}) }
    emit('update:loads', { ...props.loads, [target.id]: load })
    emit('load', entry)
    pending.value = null
    emit('select', null)
    notice.value = { ok: true, text: f.okDetail(target.id, reel.partNo, fmt(reel.qty)) }
    announcement.value = `${f.okTitle} ${notice.value.text}`
    if (props.sound && !muted.value) beep()
  } else {
    mismatch.value = entry
    notice.value = null
    announcement.value = `${f.ngTitle} ${f.ngDetail(entry.slot, entry.expected, entry.partNo)}`
    emit('mismatch', entry)
    alarm()
    void nextTick(() => ackRef.value?.focus())
  }
}

/** 確認錯料（已取下）；回到掃料盤 */
function acknowledge(): void {
  if (!mismatch.value) return
  mismatch.value = null
  notice.value = null
  void nextTick(() => scanRef.value?.focus())
}

let flashTimer: ReturnType<typeof setTimeout> | undefined
function showFlash(slot: string, ok: boolean): void {
  flash.value = { slot, ok }
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flash.value = null), 1500)
}

// ---- 聲音 ----
const muted = ref(false)
let audio: AudioContext | null = null
function alarm(): void {
  if (!props.sound || muted.value) return
  const Ctx = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext
  try {
    audio ??= Ctx ? new Ctx() : null
  } catch {
    audio = null
  }
  playAlarmTone(audio, 'critical')
}
onBeforeUnmount(() => {
  clearTimeout(flashTimer)
  void audio?.close?.()
})

// ---- 匯出 ----
const logColumns = computed(() => {
  const c = t.value.feeder.cols
  return [
    { key: 'time', title: c.time },
    { key: 'slot', title: c.slot },
    { key: 'result', title: c.result },
    { key: 'expected', title: c.expected },
    { key: 'partNo', title: c.partNo },
    { key: 'reelId', title: c.reelId },
    { key: 'qty', title: c.qty },
    { key: 'lot', title: c.lot },
    { key: 'operator', title: c.operator },
  ]
})
function exportCsv(): void {
  const f = t.value.feeder
  const rows = props.log.map((e) => ({
    time: new Date(e.at).toISOString(),
    slot: e.slot,
    result: e.result === 'ok' ? f.resultOk : f.resultNg,
    expected: e.expected,
    partNo: e.partNo,
    reelId: e.reelId,
    qty: e.qty,
    lot: e.lot ?? '',
    operator: e.operator ?? '',
  }))
  downloadBlob(csvBlob(rows, logColumns.value), `${props.filename}.csv`)
}

defineExpose({ scan, selectSlot, acknowledge, exportCsv })
</script>
