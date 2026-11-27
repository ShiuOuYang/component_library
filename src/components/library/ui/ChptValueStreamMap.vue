<template>
  <div class="vsm flex flex-col gap-3 text-sm">
    <!-- 標題與摘要 -->
    <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
      <h3 v-if="props.title" class="text-base font-semibold text-content-primary">{{ props.title }}</h3>
      <span v-if="m.takt !== null" class="tabular-nums text-content-secondary">{{ t.valueStream.labeled(t.valueStream.takt, t.valueStream.seconds(fmt(m.takt, 1))) }}</span>
      <span class="tabular-nums text-content-secondary">{{ t.valueStream.labeled(t.valueStream.leadTime, t.valueStream.days(fmt(m.leadTimeDays, 1))) }}</span>
      <span class="tabular-nums text-content-secondary">{{ t.valueStream.labeled(t.valueStream.valueAdded, t.valueStream.seconds(fmt(m.valueAddedSeconds, 1))) }}</span>
      <span class="tabular-nums text-content-secondary">{{ t.valueStream.labeled(t.valueStream.pce, pctText(m.pce)) }}</span>
      <span v-if="m.overTakt.length" class="font-medium tabular-nums" :style="{ color: role('danger') }">{{ t.valueStream.overTaktCount(m.overTakt.length) }}</span>
    </div>

    <div
      class="overflow-auto rounded-lg border border-stroke-light bg-surface-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
      tabindex="0"
      role="region"
      :aria-label="props.title || t.valueStream.title"
    >
      <p v-if="!props.processes.length" class="px-3 py-6 text-center text-content-tertiary">{{ t.valueStream.empty }}</p>
      <div v-else class="min-w-max p-4">
        <!-- 上排：供應商、生產管理、客戶 -->
        <div class="mb-6 flex items-start justify-between gap-6">
          <div class="vsm-party flex w-40 flex-col items-center rounded-md border border-stroke-default bg-surface-secondary px-3 py-2 text-center">
            <span class="material-symbols-outlined text-3xl text-content-secondary" aria-hidden="true">factory</span>
            <span class="text-xs text-content-tertiary">{{ t.valueStream.supplier }}</span>
            <span class="font-medium text-content-primary">{{ supplierName }}</span>
          </div>
          <div v-if="props.control" class="vsm-control flex min-w-40 flex-col items-center rounded-md border border-stroke-default bg-surface-secondary px-3 py-2 text-center">
            <span class="text-xs text-content-tertiary">{{ t.valueStream.control }}</span>
            <span class="font-medium text-content-primary">{{ props.control }}</span>
          </div>
          <div class="vsm-party flex w-44 flex-col items-center rounded-md border border-stroke-default bg-surface-secondary px-3 py-2 text-center">
            <span class="material-symbols-outlined text-3xl text-content-secondary" aria-hidden="true">factory</span>
            <span class="text-xs text-content-tertiary">{{ t.valueStream.customer }}</span>
            <span class="font-medium text-content-primary">{{ props.customer.name }}</span>
            <span class="text-xs tabular-nums text-content-secondary">{{ t.valueStream.demand(fmt(props.customer.demand, 0)) }}</span>
            <span v-if="m.takt !== null" class="text-xs tabular-nums text-content-secondary">{{ t.valueStream.labeled(t.valueStream.takt, t.valueStream.seconds(fmt(m.takt, 1))) }}</span>
          </div>
        </div>

        <!-- 物流與時間梯：同一組欄位 -->
        <ol class="vsm-flow grid items-start gap-x-2" :style="{ gridTemplateColumns: gridCols }" :aria-label="t.valueStream.flowLabel">
          <template v-for="col in columns" :key="col.key">
            <!-- 庫存（三角形 I）與物流方式 -->
            <li v-if="col.kind === 'inventory'" class="flex flex-col items-center gap-1 pt-6 text-center" :data-inv="col.key">
              <span class="inline-flex items-center gap-1 text-xs text-content-secondary">
                <span class="material-symbols-outlined text-base" aria-hidden="true">{{ FLOW_ICON[col.flow] }}</span>
                {{ t.valueStream.flows[col.flow] }}
              </span>
              <svg v-if="col.inv" width="40" height="34" viewBox="0 0 40 34" aria-hidden="true">
                <path d="M20 2 L38 32 H2 Z" :style="{ fill: role('warning-subtle'), stroke: role('warning-solid') }" stroke-width="2" stroke-linejoin="round" />
                <text x="20" y="27" text-anchor="middle" font-size="13" font-weight="700" :style="{ fill: role('warning-on-subtle') }">I</text>
              </svg>
              <span v-else class="material-symbols-outlined text-2xl text-content-tertiary" aria-hidden="true">arrow_forward</span>
              <span class="text-xs font-medium text-content-primary">{{ col.label }}</span>
              <span v-if="col.inv && col.inv.qty !== undefined" class="text-xs tabular-nums text-content-secondary">{{ t.valueStream.pieces(fmt(col.inv.qty, 0)) }}</span>
              <span v-if="col.inv" class="text-xs tabular-nums text-content-secondary">{{ t.valueStream.days(fmt(col.days, 1)) }}</span>
            </li>

            <!-- 工站：名稱（可選取）＋資料框＋負荷 -->
            <li v-else-if="col.kind === 'process'" class="flex flex-col" :data-process="col.p.id">
              <button
                type="button"
                class="rounded-t-md border-2 px-2 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                :class="[
                  selectedId === col.p.id ? 'border-accent bg-accent-subtle' : isOver(col.p) ? 'border-danger-solid bg-surface-secondary hover:bg-surface-tertiary' : 'border-stroke-medium bg-surface-secondary hover:bg-surface-tertiary',
                ]"
                :aria-pressed="selectedId === col.p.id"
                :aria-describedby="`${uid}-d-${col.p.id}`"
                @click="select(col.p)"
              >
                <span class="flex items-center gap-1.5">
                  <span class="font-semibold text-content-primary">{{ col.p.name }}</span>
                  <span v-if="m.bottleneck === col.p.id && props.processes.length > 1" class="rounded bg-danger-subtle px-1 text-[11px] font-semibold text-danger-on-subtle">{{ t.valueStream.bottleneck }}</span>
                </span>
                <span v-if="col.p.operators" class="mt-0.5 inline-flex items-center gap-0.5 text-xs text-content-secondary">
                  <span class="material-symbols-outlined text-sm" aria-hidden="true">person</span>{{ t.valueStream.operators(col.p.operators) }}
                </span>
              </button>
              <dl :id="`${uid}-d-${col.p.id}`" class="grid grid-cols-[auto_1fr] gap-x-2 rounded-b-md border-2 border-t-0 px-2 py-1.5 text-xs" :class="isOver(col.p) ? 'border-danger-solid' : 'border-stroke-medium'">
                <dt class="text-content-tertiary">{{ t.valueStream.cycleTime }}</dt>
                <dd class="text-right tabular-nums" :class="isOver(col.p) ? 'font-semibold' : 'text-content-primary'" :style="isOver(col.p) ? { color: role('danger') } : undefined">
                  {{ t.valueStream.seconds(fmt(col.p.cycleTime, 1)) }}<span v-if="isOver(col.p)" class="sr-only">{{ t.valueStream.note(t.valueStream.overTakt) }}</span>
                </dd>
                <template v-if="col.p.changeover !== undefined">
                  <dt class="text-content-tertiary">{{ t.valueStream.changeover }}</dt>
                  <dd class="text-right tabular-nums text-content-primary">{{ t.valueStream.minutes(fmt(col.p.changeover, 1)) }}</dd>
                </template>
                <template v-if="col.p.uptime !== undefined">
                  <dt class="text-content-tertiary">{{ t.valueStream.uptime }}</dt>
                  <dd class="text-right tabular-nums text-content-primary">{{ t.valueStream.percent(fmt(col.p.uptime, 1)) }}</dd>
                </template>
                <template v-if="col.p.scrap !== undefined">
                  <dt class="text-content-tertiary">{{ t.valueStream.scrap }}</dt>
                  <dd class="text-right tabular-nums text-content-primary">{{ t.valueStream.percent(fmt(col.p.scrap, 1)) }}</dd>
                </template>
              </dl>
              <!-- 負荷：週期時間 ÷ 節拍 -->
              <div v-if="loadOf(col.p) !== null" class="mt-1.5" :title="t.valueStream.load(pctInt(loadOf(col.p)!))">
                <div class="relative h-1.5 overflow-hidden rounded-full bg-surface-tertiary" aria-hidden="true">
                  <div class="absolute inset-y-0 left-0 rounded-full" :style="{ width: `${Math.min(1, loadOf(col.p)!) * 100}%`, background: role(isOver(col.p) ? 'danger-solid' : 'accent-solid') }"></div>
                </div>
                <span class="text-[11px] tabular-nums" :class="isOver(col.p) ? 'font-medium' : 'text-content-secondary'" :style="isOver(col.p) ? { color: role('danger') } : undefined">{{ t.valueStream.load(pctInt(loadOf(col.p)!)) }}</span>
              </div>
            </li>

            <!-- 出貨 -->
            <li v-else class="flex flex-col items-center gap-1 pt-6 text-center text-xs text-content-secondary">
              <span class="material-symbols-outlined text-3xl" aria-hidden="true">local_shipping</span>
              {{ t.valueStream.shipping }}
            </li>
          </template>
        </ol>

        <!-- 時間梯：庫存在上（天）、工站在下（秒）；最右邊是合計 -->
        <div class="vsm-timeline mt-6 grid items-start gap-x-2" :style="{ gridTemplateColumns: gridCols }" role="group" :aria-label="t.valueStream.timeline">
          <template v-for="col in columns" :key="`tl-${col.key}`">
            <div v-if="col.kind === 'inventory'" class="relative pt-5">
              <span class="absolute inset-x-0 top-0 text-center text-xs tabular-nums text-content-secondary">{{ col.inv ? t.valueStream.days(fmt(col.days, 1)) : '' }}</span>
              <div class="h-8 border-t-2 border-content-secondary"></div>
            </div>
            <div v-else-if="col.kind === 'process'" class="pt-5">
              <div class="h-8 border-x-2 border-b-2 border-content-secondary"></div>
              <span class="block text-center text-xs tabular-nums" :class="isOver(col.p) ? 'font-semibold' : 'text-content-secondary'" :style="isOver(col.p) ? { color: role('danger') } : undefined">{{ t.valueStream.seconds(fmt(col.p.cycleTime, 1)) }}</span>
            </div>
            <dl v-else class="vsm-summary rounded-md border border-stroke-default bg-surface-secondary px-2 py-1.5 text-xs">
              <dt class="text-content-tertiary">{{ t.valueStream.leadTime }}</dt>
              <dd class="font-semibold tabular-nums text-content-primary">{{ t.valueStream.days(fmt(m.leadTimeDays, 1)) }}</dd>
              <dt class="mt-1 text-content-tertiary">{{ t.valueStream.valueAdded }}</dt>
              <dd class="font-semibold tabular-nums text-content-primary">{{ t.valueStream.seconds(fmt(m.valueAddedSeconds, 1)) }}</dd>
              <dt class="mt-1 text-content-tertiary">{{ t.valueStream.pce }}</dt>
              <dd class="font-semibold tabular-nums text-content-primary">{{ pctText(m.pce) }}</dd>
            </dl>
          </template>
        </div>
      </div>
    </div>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
/**
 * ChptValueStreamMap 價值流圖 —— 精實生產分析一條產品族從供應商到客戶的物流與時間。
 *
 * 工站方塊列出週期時間 C/T、換線時間 C/O、稼動率、不良率與人數；工站之間是庫存三角（數量與天數）
 * 與物流方式（推式、拉式超市、先進先出）。底部時間梯：庫存天數在上、週期時間在下，
 * 合計前置時間、加值時間與流程效率。週期時間超過節拍的工站標紅並顯示負荷，最慢的工站標為瓶頸。
 */
import { computed, ref, useId } from 'vue'
import { useLocale } from '../shared/config'
import { inventoryDays, processLoad, vsmMetrics, type VsmCustomer, type VsmFlow, type VsmInventory, type VsmProcess } from '../shared/valueStream'

export interface ChptValueStreamMapProps {
  /** 工站（依流程順序）；每站可帶前面的庫存與物流方式 */
  processes: VsmProcess[]
  /** 客戶：每日需求與可用時間（算節拍） */
  customer: VsmCustomer
  /** 供應商名稱 */
  supplier?: string
  /** 生產管理（例如「MRP / 生管」）；不給時不顯示 */
  control?: string
  /** 成品庫存 */
  finishedGoods?: VsmInventory | null
  /** 標題 */
  title?: string
  /** 選取的工站 id（v-model:selected） */
  selected?: string | null
}

const props = withDefaults(defineProps<ChptValueStreamMapProps>(), {
  supplier: '',
  control: '',
  finishedGoods: null,
  title: '',
  selected: undefined,
})

const emit = defineEmits<{
  'update:selected': [id: string | null]
  select: [process: VsmProcess | null]
}>()

const t = useLocale()
const uid = useId()
const role = (name: string) => `rgb(var(--t-${name}))`
const FLOW_ICON: Record<VsmFlow, string> = { push: 'double_arrow', pull: 'storefront', fifo: 'format_list_numbered' }

const m = computed(() => vsmMetrics(props.processes, props.customer, props.finishedGoods))
const supplierName = computed(() => props.supplier || '—')

type Column =
  | { kind: 'inventory'; key: string; inv: VsmInventory | null; days: number; flow: VsmFlow; label: string }
  | { kind: 'process'; key: string; p: VsmProcess }
  | { kind: 'ship'; key: string }

const columns = computed<Column[]>(() => {
  const cols: Column[] = []
  props.processes.forEach((p, i) => {
    const inv = p.inventoryBefore ?? null
    cols.push({
      kind: 'inventory',
      key: `inv-${p.id}`,
      inv,
      days: inventoryDays(inv, props.customer.demand),
      flow: p.flowIn ?? 'push',
      label: i === 0 ? t.value.valueStream.rawMaterial : t.value.valueStream.wip,
    })
    cols.push({ kind: 'process', key: `p-${p.id}`, p })
  })
  const fg = props.finishedGoods ?? null
  cols.push({ kind: 'inventory', key: 'inv-finished', inv: fg, days: inventoryDays(fg, props.customer.demand), flow: 'push', label: t.value.valueStream.finishedGoods })
  cols.push({ kind: 'ship', key: 'ship' })
  return cols
})
/**
 * 庫存欄窄、工站欄寬；最後一欄放出貨（時間梯那一列放合計）。
 * 物流與時間梯是兩個 grid，欄寬要固定，兩排才會對齊。
 */
const gridCols = computed(() => columns.value.map((c) => (c.kind === 'process' ? '9.5rem' : c.kind === 'ship' ? '8rem' : '5.5rem')).join(' '))

const isOver = (p: VsmProcess) => m.value.overTakt.includes(p.id)
const loadOf = (p: VsmProcess) => processLoad(p, m.value.takt)

/** 數字：最多 digits 位小數，去掉多餘的 0 */
function fmt(v: number | undefined, digits: number): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return String(Number(n.toFixed(digits)))
}
const pctInt = (ratio: number) => Math.round(ratio * 100)
/** 流程效率常常不到 1%：小於 1% 時多顯示兩位小數 */
const pctText = (ratio: number) => t.value.valueStream.percent(fmt(ratio * 100, ratio * 100 < 1 ? 2 : 1))

// ---- 選取（可受控） ----
const innerSelected = ref<string | null>(null)
const selectedId = computed(() => (props.selected !== undefined ? props.selected : innerSelected.value))
const announcement = ref('')
function select(p: VsmProcess) {
  const next = selectedId.value === p.id ? null : p.id
  innerSelected.value = next
  emit('update:selected', next)
  emit('select', next ? p : null)
  announcement.value = next ? t.value.valueStream.selected(p.name) : ''
}

defineExpose({
  /** 目前的計算結果（節拍、前置時間、加值時間、流程效率、瓶頸） */
  metrics: () => m.value,
})
</script>
