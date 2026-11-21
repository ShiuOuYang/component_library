<template>
  <div class="flex flex-col gap-3">
    <!-- 進度與篩選 -->
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div class="min-w-[12rem] flex-1">
        <div class="mb-1 flex items-baseline justify-between gap-2 text-sm">
          <span class="font-medium text-content-primary">{{ t.checklist.progress(summary.done, summary.total) }}</span>
          <span class="text-xs text-content-secondary">
            <span v-if="summary.ng" class="font-medium text-danger">{{ t.checklist.ngCount(summary.ng) }}</span>
            <span v-if="summary.ng && summary.na"> · </span>
            <span v-if="summary.na">{{ t.checklist.naCount(summary.na) }}</span>
          </span>
        </div>
        <div
          class="h-2 overflow-hidden rounded-full bg-surface-tertiary"
          role="progressbar"
          :aria-label="t.checklist.progressLabel"
          :aria-valuenow="summary.done"
          :aria-valuemin="0"
          :aria-valuemax="summary.total"
          :aria-valuetext="t.checklist.progress(summary.done, summary.total)"
        >
          <div class="h-full rounded-full transition-[width]" :class="summary.ng ? 'bg-danger-solid' : 'bg-success-solid'" :style="{ width: `${pct}%` }"></div>
        </div>
      </div>
      <ChptSegmented v-if="props.showFilter" v-model="filter" :options="filterOptions" :aria-label="t.checklist.filterLabel" size="xs" />
    </div>

    <p v-if="!visibleGroups.length" class="rounded-md border border-dashed border-stroke-default p-6 text-center text-sm text-content-tertiary">
      {{ filter === 'ng' ? t.checklist.noNg : t.checklist.allDone }}
    </p>

    <section v-for="g in visibleGroups" :key="g.section ?? '__none__'" class="flex flex-col gap-2" :aria-label="g.section ?? undefined">
      <h3 v-if="g.section" class="mt-1 text-sm font-semibold text-content-primary">{{ g.section }}</h3>
      <ol class="flex flex-col gap-2">
        <li
          v-for="item in g.items"
          :id="domId(item.id)"
          :key="item.id"
          class="rounded-md border bg-surface-primary p-3 transition-colors"
          :class="showIssue(item) ? 'border-danger' : 'border-stroke-light'"
        >
          <div class="flex flex-wrap items-start gap-x-4 gap-y-2">
            <div class="min-w-[12rem] flex-1">
              <div :id="`${domId(item.id)}-label`" class="font-medium text-content-primary">
                <span class="mr-1 tabular-nums text-content-tertiary">{{ numberOf(item.id) }}.</span>{{ item.label }}<span
                  v-if="item.required !== false"
                  class="ml-0.5 text-danger"
                  :title="t.checklist.required"
                  aria-hidden="true"
                >*</span>
                <span v-if="item.required !== false" class="sr-only">{{ t.checklist.requiredSr }}</span>
              </div>
              <p v-if="item.description" class="mt-0.5 text-xs text-content-secondary">{{ item.description }}</p>
              <p v-if="(item.type ?? 'check') === 'measure' && specText(item)" class="mt-0.5 text-xs tabular-nums text-content-tertiary">{{ specText(item) }}</p>
            </div>

            <!-- check：合格 / 不合格 / 不適用 -->
            <div
              v-if="(item.type ?? 'check') === 'check'"
              role="radiogroup"
              :aria-labelledby="`${domId(item.id)}-label`"
              :aria-required="item.required !== false || undefined"
              :aria-readonly="props.readonly || undefined"
              class="flex w-full gap-1.5 sm:w-auto"
            >
              <button
                v-for="(opt, oi) in optionsOf(item)"
                :key="opt"
                type="button"
                role="radio"
                :aria-checked="itemStatus(item, model[item.id]) === opt"
                :tabindex="rovingIndex(item) === oi ? 0 : -1"
                :disabled="props.disabled"
                class="inline-flex min-h-10 min-w-[4.5rem] flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md border px-3 text-sm font-medium transition-colors sm:flex-none focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
                :class="statusButtonClass(opt, itemStatus(item, model[item.id]) === opt)"
                @click="setStatus(item, opt)"
                @keydown="onRadioKeydown($event, item, oi)"
              >
                <span class="material-symbols-outlined text-base" aria-hidden="true">{{ STATUS_ICON[opt] }}</span>
                {{ t.checklist.status[opt] }}
              </button>
            </div>

            <!-- measure：量測值（自動判定） -->
            <div v-else-if="item.type === 'measure'" class="flex flex-wrap items-end gap-2">
              <ChptInputNumber
                :model-value="model[item.id]?.value ?? null"
                :label="item.unit ? `${t.checklist.value} (${item.unit})` : t.checklist.value"
                :precision="item.precision"
                :controls="false"
                :readonly="props.readonly"
                :disabled="props.disabled"
                size="md"
                @update:model-value="(v: number | null) => setValue(item, v)"
              />
              <ChptPopover
                v-if="props.numpad && !props.readonly && !props.disabled"
                :open="numpadFor === item.id"
                placement="bottom-end"
                :padded="false"
                :aria-label="t.checklist.numpadFor(item.label)"
                @update:open="(o: boolean) => (numpadFor = o ? item.id : null)"
              >
                <button
                  type="button"
                  class="inline-flex h-control-md min-w-control-md items-center justify-center rounded-md border border-stroke-default bg-surface-primary text-content-secondary hover:bg-surface-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
                  :aria-label="t.checklist.numpadFor(item.label)"
                >
                  <span class="material-symbols-outlined text-xl" aria-hidden="true">dialpad</span>
                </button>
                <template #content="{ close }">
                  <ChptNumpad
                    :model-value="model[item.id]?.value ?? null"
                    :label="item.label"
                    :unit="item.unit"
                    :precision="item.precision"
                    :allow-negative="(item.lsl ?? 0) < 0"
                    size="sm"
                    autofocus
                    class="border-0"
                    @confirm="(v: number | null) => { setValue(item, v); close() }"
                  />
                </template>
              </ChptPopover>
              <span
                v-if="itemStatus(item, model[item.id])"
                class="inline-flex h-control-md items-center gap-1 rounded-md px-2 text-sm font-medium"
                :class="itemStatus(item, model[item.id]) === 'ok' ? 'bg-success-subtle text-success-on-subtle' : 'bg-danger-subtle text-danger-on-subtle'"
                aria-live="polite"
              >
                <span class="material-symbols-outlined text-base" aria-hidden="true">{{ STATUS_ICON[itemStatus(item, model[item.id])!] }}</span>
                {{ itemStatus(item, model[item.id]) === 'ok' ? t.checklist.inSpec : t.checklist.outOfSpec }}
              </span>
            </div>

            <!-- text -->
            <div v-else class="w-full sm:w-64">
              <input
                :value="model[item.id]?.text ?? ''"
                type="text"
                :aria-labelledby="`${domId(item.id)}-label`"
                :aria-required="item.required !== false || undefined"
                :readonly="props.readonly"
                :disabled="props.disabled"
                class="h-control-md w-full rounded-md border border-stroke-default bg-surface-primary px-3 text-sm text-content-primary outline-none focus:border-stroke-focus focus:ring-1 focus:ring-stroke-focus disabled:cursor-not-allowed disabled:opacity-60"
                @change="setText(item, ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>

          <!-- 不合格原因 / 備註：不合格時一定出現；其他狀態有內容時才顯示 -->
          <div v-if="itemStatus(item, model[item.id]) === 'ng' || model[item.id]?.note" class="mt-2">
            <label :for="`${domId(item.id)}-note`" class="mb-1 block text-xs font-medium text-content-secondary">
              {{ itemStatus(item, model[item.id]) === 'ng' ? t.checklist.ngReason : t.checklist.note
              }}<span v-if="itemStatus(item, model[item.id]) === 'ng' && props.requireNoteOnNg" class="ml-0.5 text-danger" aria-hidden="true">*</span>
            </label>
            <textarea
              :id="`${domId(item.id)}-note`"
              :value="model[item.id]?.note ?? ''"
              rows="2"
              :placeholder="t.checklist.notePlaceholder"
              :aria-required="(itemStatus(item, model[item.id]) === 'ng' && props.requireNoteOnNg) || undefined"
              :aria-invalid="(showIssue(item) && itemIssue(item, model[item.id], props.requireNoteOnNg) === 'noteRequired') || undefined"
              :readonly="props.readonly"
              :disabled="props.disabled"
              class="w-full rounded-md border border-stroke-default bg-surface-primary px-3 py-2 text-sm text-content-primary outline-none focus:border-stroke-focus focus:ring-1 focus:ring-stroke-focus disabled:cursor-not-allowed disabled:opacity-60"
              @change="setNote(item, ($event.target as HTMLTextAreaElement).value)"
            ></textarea>
          </div>

          <!-- 照片 -->
          <div v-if="photosEnabled(item) && (!props.readonly || model[item.id]?.photos?.length)" class="mt-2 flex flex-wrap items-center gap-2">
            <div v-for="(src, pi) in model[item.id]?.photos ?? []" :key="pi" class="relative">
              <img :src="src" :alt="t.checklist.photoAlt(item.label, pi + 1)" class="h-16 w-16 rounded-md border border-stroke-light object-cover" />
              <button
                v-if="!props.readonly && !props.disabled"
                type="button"
                class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface-primary text-content-secondary shadow ring-1 ring-stroke-default hover:text-danger"
                :aria-label="t.checklist.removePhoto(item.label, pi + 1)"
                @click="removePhoto(item, pi)"
              >
                <span class="material-symbols-outlined text-sm" aria-hidden="true">close</span>
              </button>
            </div>
            <!-- 還沒有照片時是小按鈕（不要每一項都一大塊）；有照片後是和縮圖一樣大的格子 -->
            <label
              v-if="!props.readonly && !props.disabled"
              class="inline-flex cursor-pointer items-center gap-1 rounded-md border border-dashed border-stroke-default px-2.5 text-xs text-content-secondary hover:bg-surface-tertiary focus-within:ring-2 focus-within:ring-stroke-focus"
              :class="model[item.id]?.photos?.length ? 'h-16' : 'h-8'"
            >
              <span class="material-symbols-outlined text-lg" aria-hidden="true">add_a_photo</span>
              {{ t.checklist.addPhoto }}
              <input type="file" accept="image/*" capture="environment" multiple class="sr-only" @change="addPhotos(item, $event)" />
            </label>
          </div>

          <p v-if="showIssue(item)" class="mt-2 text-xs font-medium text-danger">
            {{ itemIssue(item, model[item.id], props.requireNoteOnNg) === 'missing' ? t.checklist.missing : t.checklist.noteRequired }}
          </p>
        </li>
      </ol>
    </section>

    <slot name="footer" :summary="summary" :validate="validate"></slot>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue'
import ChptSegmented from './ChptSegmented.vue'
import ChptInputNumber from './ChptInputNumber.vue'
import ChptPopover from './ChptPopover.vue'
import ChptNumpad from './ChptNumpad.vue'
import { useLocale } from '../shared/config'
import {
  checklistSummary,
  groupChecklist,
  itemIssue,
  itemStatus,
  updateResult,
  type ChecklistItem,
  type ChecklistResult,
  type ChecklistResults,
  type ChecklistStatus,
  type ChecklistSummary,
} from '../shared/checklist'

/**
 * ChptChecklist（CHPT 主題） - 點檢表
 *
 * 用途：設備日常點檢、首件檢查、IPQC 巡檢、出貨檢查 —— 平板上逐項打勾、量測、拍照。
 *   - check 項目：合格 / 不合格 / 不適用，大按鍵（手套也點得到）；顏色 + 圖示 + 文字
 *   - measure 項目：填量測值，依上下限自動判定（作業員不能自己選合格）；numpad 開啟時旁邊有數字鍵盤
 *   - 不合格時出現「不合格原因」，requireNoteOnNg 時必填
 *   - 每項可附照片（allowPhotos）；photoReader 可改成先上傳再存網址
 *   - 上方進度條、不合格數；篩選「未完成 / 不合格」
 *   - validate()：標出未填與缺原因的項目，捲到並聚焦第一個；footer 插槽放簽名與送出按鈕
 */

interface ChptChecklistProps {
  items: ChecklistItem[]
  /** v-model：{ [項目 id]: 結果 } */
  modelValue?: ChecklistResults
  /** 不合格時必須填寫原因 */
  requireNoteOnNg?: boolean
  /** 可以附照片 */
  allowPhotos?: boolean
  /** 讀取照片：預設讀成 data URL；可以改成上傳後回傳網址 */
  photoReader?: (file: File) => Promise<string>
  /** measure 項目旁邊顯示數字鍵盤按鈕（觸控工作站） */
  numpad?: boolean
  /** 顯示「全部 / 未完成 / 不合格」篩選 */
  showFilter?: boolean
  readonly?: boolean
  disabled?: boolean
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptChecklistProps>(), {
  modelValue: () => ({}),
  requireNoteOnNg: true,
  allowPhotos: false,
  photoReader: undefined,
  numpad: false,
  showFilter: true,
  readonly: false,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: ChecklistResults): void
  /** 某一項改變 */
  (e: 'change', itemId: string, result: ChecklistResult): void
}>()

const uid = useId()
const domId = (id: string) => `${uid}-item-${id}`
const model = computed(() => props.modelValue)
const summary = computed(() => checklistSummary(props.items, model.value, props.requireNoteOnNg))
const pct = computed(() => (summary.value.total ? Math.round((summary.value.done / summary.value.total) * 100) : 0))
const numberOf = (id: string) => props.items.findIndex((i) => i.id === id) + 1

const STATUS_ICON: Record<ChecklistStatus, string> = { ok: 'check_circle', ng: 'cancel', na: 'remove_circle' }

// ---- 篩選 ----
const filter = ref<'all' | 'todo' | 'ng'>('all')
const filterOptions = computed(() => [
  { label: t.value.checklist.filterAll, value: 'all' },
  { label: t.value.checklist.filterTodo, value: 'todo' },
  { label: t.value.checklist.filterNg, value: 'ng' },
])
const visibleGroups = computed(() => {
  const keep = (item: ChecklistItem) => {
    if (filter.value === 'todo') return itemIssue(item, model.value[item.id], props.requireNoteOnNg) !== null
    if (filter.value === 'ng') return itemStatus(item, model.value[item.id]) === 'ng'
    return true
  }
  return groupChecklist(props.items)
    .map((g) => ({ ...g, items: g.items.filter(keep) }))
    .filter((g) => g.items.length)
})

// ---- 寫入 ----
const interactive = computed(() => !props.readonly && !props.disabled)
function patch(item: ChecklistItem, p: Partial<ChecklistResult>): void {
  if (!interactive.value) return
  const next = updateResult(item, model.value, p)
  emit('update:modelValue', next)
  emit('change', item.id, next[item.id]!)
}
function setStatus(item: ChecklistItem, status: ChecklistStatus): void {
  patch(item, { status })
}
function setValue(item: ChecklistItem, value: number | null): void {
  patch(item, { value })
}
function setText(item: ChecklistItem, text: string): void {
  patch(item, { text })
}
function setNote(item: ChecklistItem, note: string): void {
  patch(item, { note: note.trim() ? note : undefined })
}

// ---- 照片 ----
const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
async function addPhotos(item: ChecklistItem, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  if (!files.length) return
  const read = props.photoReader ?? readAsDataUrl
  const urls = (await Promise.all(files.map((f) => read(f).catch(() => null)))).filter((u): u is string => !!u)
  if (urls.length) patch(item, { photos: [...(model.value[item.id]?.photos ?? []), ...urls] })
}
function removePhoto(item: ChecklistItem, index: number): void {
  const photos = [...(model.value[item.id]?.photos ?? [])]
  photos.splice(index, 1)
  patch(item, { photos })
}

// ---- 規格文字、按鈕樣式 ----
function specText(item: ChecklistItem): string {
  const fmt = (n: number) => (item.precision !== undefined ? n.toFixed(item.precision) : String(n))
  const unit = item.unit ? ` ${item.unit}` : ''
  const { lsl, usl, target } = item
  let range = ''
  if (lsl !== undefined && usl !== undefined) range = `${fmt(lsl)} – ${fmt(usl)}${unit}`
  else if (lsl !== undefined) range = `≥ ${fmt(lsl)}${unit}`
  else if (usl !== undefined) range = `≤ ${fmt(usl)}${unit}`
  if (!range) return ''
  return target !== undefined ? t.value.checklist.specWithTarget(range, `${fmt(target)}${unit}`) : t.value.checklist.spec(range)
}
/** 照片：item.photos 優先；否則 allowPhotos 時 check 與 measure 項目可以附（text 項目預設不用） */
const photosEnabled = (item: ChecklistItem) => item.photos ?? (props.allowPhotos && (item.type ?? 'check') !== 'text')
const optionsOf = (item: ChecklistItem): ChecklistStatus[] => (item.allowNA === false ? ['ok', 'ng'] : ['ok', 'ng', 'na'])
function statusButtonClass(opt: ChecklistStatus, selected: boolean): string {
  if (!selected) return 'border-stroke-default bg-surface-primary text-content-secondary hover:bg-surface-tertiary'
  if (opt === 'ok') return 'border-transparent bg-success-solid text-white'
  if (opt === 'ng') return 'border-transparent bg-danger-solid text-white'
  return 'border-transparent bg-content-secondary text-surface-primary'
}

// ---- 鍵盤：每組 radiogroup 一個 Tab 停駐點，方向鍵移動並選取 ----
function rovingIndex(item: ChecklistItem): number {
  const i = optionsOf(item).indexOf(itemStatus(item, model.value[item.id]) as ChecklistStatus)
  return i < 0 ? 0 : i
}
function onRadioKeydown(event: KeyboardEvent, item: ChecklistItem, index: number): void {
  const opts = optionsOf(item)
  let next = index
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % opts.length
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + opts.length) % opts.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = opts.length - 1
  else return
  event.preventDefault()
  setStatus(item, opts[next])
  const group = (event.currentTarget as HTMLElement).parentElement
  void nextTick(() => (group?.children[next] as HTMLElement | undefined)?.focus())
}

// ---- 檢查 ----
/** validate() 之後才標出問題（還沒按送出時，不要一打開就一片紅） */
const issuesShown = ref(false)
const showIssue = (item: ChecklistItem) => issuesShown.value && itemIssue(item, model.value[item.id], props.requireNoteOnNg) !== null
const announcement = ref('')
const numpadFor = ref<string | null>(null)

/** 檢查是否可以送出；有問題時標出、捲到並聚焦第一個問題項目 */
function validate(): ChecklistSummary {
  issuesShown.value = true
  const s = summary.value
  const firstId = props.items.find((i) => s.missing.includes(i.id) || s.noteRequired.includes(i.id))?.id
  announcement.value = s.complete ? t.value.checklist.allDone : t.value.checklist.issues(s.missing.length + s.noteRequired.length)
  if (firstId) {
    // 被篩選藏起來的項目要先顯示出來
    filter.value = 'all'
    void nextTick(() => focusItem(firstId))
  }
  return s
}

/** 捲到某一項並聚焦它的第一個輸入（原因欄缺內容時聚焦原因欄） */
function focusItem(id: string): void {
  const el = document.getElementById(domId(id))
  if (!el) return
  el.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  const item = props.items.find((i) => i.id === id)
  const needNote = item && itemIssue(item, model.value[id], props.requireNoteOnNg) === 'noteRequired'
  const target = (needNote ? el.querySelector('textarea') : null) ?? el.querySelector<HTMLElement>('[tabindex="0"], input, textarea')
  target?.focus()
}

/** 清除所有結果 */
function reset(): void {
  issuesShown.value = false
  emit('update:modelValue', {})
}

defineExpose({ validate, focusItem, reset, summary: () => summary.value })
</script>
