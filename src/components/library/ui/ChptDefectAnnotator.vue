<template>
  <div class="flex flex-col gap-3">
    <!-- 工具列：標記方式、缺陷類型（含數量）、刪除選取 -->
    <div v-if="!props.readonly" class="flex flex-wrap items-center gap-2">
      <ChptSegmented v-model="tool" :options="toolOptions" :aria-label="t.defect.tool" size="xs" :disabled="props.disabled" />
      <div class="flex flex-wrap gap-1.5" role="radiogroup" :aria-label="t.defect.typeLabel">
        <button
          v-for="c in counts"
          :key="c.type"
          type="button"
          role="radio"
          :aria-checked="activeType === c.type"
          :disabled="props.disabled"
          class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          :class="activeType === c.type ? 'border-stroke-focus bg-accent-subtle text-accent-on-subtle' : 'border-stroke-default bg-surface-primary text-content-secondary hover:bg-surface-tertiary'"
          @click="pickType(c.type)"
        >
          <span class="h-2.5 w-2.5 rounded-full" :style="{ background: colorOf(c.type) }" aria-hidden="true"></span>
          {{ c.label }}
          <span class="tabular-nums text-content-tertiary">{{ c.count }}</span>
        </button>
      </div>
      <ChptButton v-if="selected" size="xs" is-outline color="danger" icon="delete" class="ml-auto" :disabled="props.disabled" @click="remove(selected.id)">
        {{ t.defect.remove }}
      </ChptButton>
    </div>

    <div class="flex flex-col gap-3" :class="props.showList ? 'lg:flex-row lg:items-start' : ''">
      <!-- 圖片 + 標記層 -->
      <div class="relative inline-block max-w-full self-start select-none overflow-hidden rounded-md border border-stroke-light bg-surface-secondary">
        <img
          :src="props.src"
          :alt="props.alt"
          class="block h-auto max-w-full"
          :style="{ maxHeight: props.maxHeight ? `${props.maxHeight}px` : undefined }"
          draggable="false"
        />
        <div
          ref="layer"
          class="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-focus"
          :class="interactive ? 'cursor-crosshair' : ''"
          style="touch-action: none"
          role="group"
          :aria-label="props.alt ? t.defect.regionWithAlt(props.alt) : t.defect.regionLabel"
          :aria-describedby="interactive ? hintId : undefined"
          :tabindex="interactive ? 0 : -1"
          @pointerdown="onLayerDown"
          @pointermove="onLayerMove"
          @pointerup="onLayerUp"
          @pointercancel="cancelDraft"
          @keydown="onLayerKeydown"
        >
          <!-- 框 -->
          <div
            v-for="m in boxMarks"
            :key="`box-${m.id}`"
            class="pointer-events-none absolute border-2"
            :class="m.id === selectedId ? 'border-dashed' : ''"
            :style="{
              left: pct(m.x),
              top: pct(m.y),
              width: pct(m.w ?? 0),
              height: pct(m.h ?? 0),
              borderColor: colorOf(m.type),
              background: m.id === hoverId || m.id === selectedId ? `color-mix(in srgb, ${colorOf(m.type)} 15%, transparent)` : undefined,
            }"
            aria-hidden="true"
          ></div>
          <!-- 拖曳中的框 -->
          <div
            v-if="draftRect"
            class="pointer-events-none absolute border-2 border-dashed"
            :style="{ left: pct(draftRect.x), top: pct(draftRect.y), width: pct(draftRect.w), height: pct(draftRect.h), borderColor: colorOf(activeType) }"
            aria-hidden="true"
          ></div>
          <!-- 編號圓點（點的位置、框的中心）：可聚焦、可拖曳 -->
          <button
            v-for="(m, i) in model"
            :key="m.id"
            :ref="(el) => setMarkEl(m.id, el as HTMLElement | null)"
            type="button"
            class="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold text-white shadow-md outline-none transition-transform focus-visible:ring-2 focus-visible:ring-stroke-focus focus-visible:ring-offset-1"
            :class="[m.id === selectedId ? 'scale-125' : '', interactive ? 'cursor-move' : 'cursor-pointer']"
            :style="{ left: pct(markCenter(m).x), top: pct(markCenter(m).y), background: colorOf(m.type), borderColor: RING }"
            :aria-label="t.defect.mark(i + 1, labelOf(m.type), m.note ?? '')"
            :aria-pressed="m.id === selectedId"
            @pointerdown.stop="onMarkDown($event, m)"
            @pointermove="onMarkMove($event)"
            @pointerup="onMarkUp($event)"
            @pointercancel="onMarkUp($event)"
            @keydown="onMarkKeydown($event, m)"
            @focus="select(m.id)"
            @mouseenter="hoverId = m.id"
            @mouseleave="hoverId = null"
          >
            {{ i + 1 }}
          </button>
        </div>
      </div>

      <!-- 清單：編號、類型、備註 -->
      <div v-if="props.showList" class="min-w-0 flex-1 lg:max-w-sm">
        <div class="mb-1.5 flex items-baseline justify-between text-sm">
          <span class="font-medium text-content-primary">{{ t.defect.listLabel }}</span>
          <span class="text-xs text-content-tertiary">{{ t.defect.count(model.length) }}</span>
        </div>
        <p v-if="!model.length" class="rounded-md border border-dashed border-stroke-default p-4 text-center text-sm text-content-tertiary">
          {{ t.defect.empty }}
        </p>
        <ol v-else class="max-h-80 space-y-1 overflow-auto">
          <li
            v-for="(m, i) in model"
            :key="m.id"
            class="flex items-center gap-2 rounded-md border px-2 py-1.5"
            :class="m.id === selectedId ? 'border-stroke-focus bg-accent-subtle' : 'border-stroke-light bg-surface-primary'"
            @mouseenter="hoverId = m.id"
            @mouseleave="hoverId = null"
          >
            <button
              type="button"
              class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              :style="{ background: colorOf(m.type) }"
              :aria-label="t.defect.mark(i + 1, labelOf(m.type), m.note ?? '')"
              @click="focusMark(m.id)"
            >
              {{ i + 1 }}
            </button>
            <span class="w-16 flex-shrink-0 truncate text-xs text-content-secondary">{{ labelOf(m.type) }}</span>
            <input
              :value="m.note ?? ''"
              :placeholder="props.readonly ? '' : t.defect.notePlaceholder"
              :aria-label="t.defect.noteLabel(i + 1)"
              :readonly="props.readonly"
              :disabled="props.disabled"
              class="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm text-content-primary outline-none placeholder:text-content-disabled hover:border-stroke-default focus:border-stroke-focus disabled:cursor-not-allowed"
              @focus="select(m.id)"
              @change="setNote(m.id, ($event.target as HTMLInputElement).value)"
            />
            <button
              v-if="interactive"
              type="button"
              class="flex-shrink-0 rounded p-0.5 text-content-tertiary hover:bg-surface-tertiary hover:text-danger"
              :aria-label="t.defect.removeN(i + 1)"
              @click="remove(m.id)"
            >
              <span class="material-symbols-outlined text-base" aria-hidden="true">close</span>
            </button>
          </li>
        </ol>
      </div>
    </div>

    <p v-if="interactive" :id="hintId" class="text-xs text-content-tertiary">{{ tool === 'rect' ? t.defect.hintRect : t.defect.hint }}</p>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import ChptButton from './ChptButton.vue'
import ChptSegmented from './ChptSegmented.vue'
import { useLocale } from '../shared/config'
import {
  clamp01,
  countByType,
  markCenter,
  moveMark,
  nextMarkId,
  rectFromCorners,
  type DefectMark,
  type DefectType,
} from '../shared/defectMarks'

/**
 * ChptDefectAnnotator（CHPT 主題） - 缺陷標註
 *
 * 用途：在產品照片、PCB 圖、圖面上標出缺陷位置與類型（目檢、IPQC、客訴分析）。
 *   - 點一下放一個編號標記，或切到「框」拖出範圍；標記可拖曳移動
 *   - 座標存成 0–1 的比例：縮圖、全螢幕、列印都落在同一位置
 *   - 每個標記有類型（顏色）與備註；旁邊的清單可編輯備註、刪除
 *   - 鍵盤：標記是按鈕（Tab 依序經過），方向鍵微調（Shift 加大），Delete 刪除；
 *     標註區聚焦時按 Enter 在中央新增一個點，再用方向鍵移到位置
 */

interface ChptDefectAnnotatorProps {
  /** v-model：標記清單 */
  modelValue?: DefectMark[]
  /** 圖片網址 */
  src: string
  /** 圖片的替代文字（也會放進標註區的名稱） */
  alt?: string
  /** 缺陷類型（顏色、名稱）；不給時只有一種「缺陷」 */
  defectTypes?: DefectType[]
  /** 圖片最大高度（px）；寬度依比例 */
  maxHeight?: number
  /** 顯示右側的標記清單 */
  showList?: boolean
  /** 預設的標記方式 */
  defaultTool?: 'point' | 'rect'
  /** 唯讀：只顯示標記（可點選、看清單），不能新增、移動、刪除 */
  readonly?: boolean
  /** 禁用 */
  disabled?: boolean
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptDefectAnnotatorProps>(), {
  modelValue: () => [],
  alt: '',
  defectTypes: undefined,
  maxHeight: 480,
  showList: true,
  defaultTool: 'point',
  readonly: false,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: DefectMark[]): void
  /** 新增一個標記 */
  (e: 'add', mark: DefectMark): void
  /** 刪除一個標記 */
  (e: 'remove', mark: DefectMark): void
  /** 選取改變（null 為取消選取） */
  (e: 'select', id: string | null): void
}>()

const hintId = `${useId()}-hint`
const layer = useTemplateRef<HTMLDivElement>('layer')
/** 編號圓點的白邊：照片上什麼顏色都有，白邊讓圓點在深色、同色背景上都分得出來（不跟主題） */
const RING = '#ffffff'

const model = computed(() => props.modelValue)
const types = computed<DefectType[]>(() => props.defectTypes?.length ? props.defectTypes : [{ value: 'defect', label: t.value.defect.defaultType, color: '#ef4444' }])
const counts = computed(() => countByType(model.value, types.value))
const boxMarks = computed(() => model.value.filter((m) => m.w !== undefined && m.h !== undefined))
const interactive = computed(() => !props.readonly && !props.disabled)

const tool = ref<'point' | 'rect'>(props.defaultTool)
const toolOptions = computed(() => [
  { label: t.value.defect.toolPoint, value: 'point', icon: 'location_on' },
  { label: t.value.defect.toolRect, value: 'rect', icon: 'crop_square' },
])
const activeType = ref(types.value[0].value)
watch(types, (list) => {
  if (!list.some((x) => x.value === activeType.value)) activeType.value = list[0].value
})

const selectedId = ref<string | null>(null)
const hoverId = ref<string | null>(null)
const selected = computed(() => model.value.find((m) => m.id === selectedId.value) ?? null)
const announcement = ref('')

const pct = (n: number) => `${Math.round(n * 1e6) / 1e4}%`
const colorOf = (type: string) => types.value.find((x) => x.value === type)?.color || '#6b7280'
const labelOf = (type: string) => types.value.find((x) => x.value === type)?.label ?? type
const numberOf = (id: string) => model.value.findIndex((m) => m.id === id) + 1

function commit(next: DefectMark[]): void {
  emit('update:modelValue', next)
}

function select(id: string | null): void {
  if (selectedId.value === id) return
  selectedId.value = id
  emit('select', id)
}

function add(partial: Omit<DefectMark, 'id' | 'type'>): void {
  const mark: DefectMark = { id: nextMarkId(model.value), type: activeType.value, ...partial }
  commit([...model.value, mark])
  emit('add', mark)
  selectedId.value = mark.id
  emit('select', mark.id)
  announcement.value = t.value.defect.added(model.value.length + 1, labelOf(mark.type))
}

function remove(id: string): void {
  const i = model.value.findIndex((m) => m.id === id)
  if (i < 0 || !interactive.value) return
  const mark = model.value[i]
  commit(model.value.filter((m) => m.id !== id))
  emit('remove', mark)
  announcement.value = t.value.defect.removed(i + 1)
  if (selectedId.value === id) select(null)
}

function update(id: string, patch: (m: DefectMark) => DefectMark): void {
  commit(model.value.map((m) => (m.id === id ? patch(m) : m)))
}

function setNote(id: string, note: string): void {
  if (!interactive.value) return
  update(id, (m) => ({ ...m, note: note.trim() || undefined }))
}

/** 選類型：之後新增的標記用這個類型；有選取的標記時也改它的類型 */
function pickType(type: string): void {
  activeType.value = type
  if (selected.value && interactive.value && selected.value.type !== type) update(selected.value.id, (m) => ({ ...m, type }))
}

// ---- 標註區：點一下新增點、拖曳新增框 ----
/** 指標位置 → 圖片上的比例座標 */
function toRatio(event: PointerEvent): { x: number; y: number } {
  const rect = layer.value!.getBoundingClientRect()
  return { x: clamp01((event.clientX - rect.left) / (rect.width || 1)), y: clamp01((event.clientY - rect.top) / (rect.height || 1)) }
}

let draftStart: { x: number; y: number; pointerId: number } | null = null
const draftRect = ref<{ x: number; y: number; w: number; h: number } | null>(null)

function onLayerDown(event: PointerEvent): void {
  if (!interactive.value || (event.pointerType === 'mouse' && event.button !== 0) || draftStart) return
  event.preventDefault()
  layer.value?.focus({ preventScroll: true })
  layer.value?.setPointerCapture?.(event.pointerId)
  draftStart = { ...toRatio(event), pointerId: event.pointerId }
}

function onLayerMove(event: PointerEvent): void {
  if (!draftStart || event.pointerId !== draftStart.pointerId || tool.value !== 'rect') return
  const p = toRatio(event)
  draftRect.value = rectFromCorners(draftStart.x, draftStart.y, p.x, p.y)
}

function onLayerUp(event: PointerEvent): void {
  if (!draftStart || event.pointerId !== draftStart.pointerId) return
  const start = draftStart
  const rect = draftRect.value
  cancelDraft()
  if (tool.value === 'rect') {
    // 太小的框（其實是點一下）不算
    if (rect && rect.w > 0.01 && rect.h > 0.01) add(rect)
    else select(null)
    return
  }
  add({ x: start.x, y: start.y })
}

function cancelDraft(): void {
  draftStart = null
  draftRect.value = null
}

function onLayerKeydown(event: KeyboardEvent): void {
  if (event.target !== layer.value || !interactive.value) return
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    add(tool.value === 'rect' ? { x: 0.4, y: 0.4, w: 0.2, h: 0.2 } : { x: 0.5, y: 0.5 })
    void nextTick(() => focusMark(selectedId.value!))
  } else if (event.key === 'Escape' && selectedId.value) {
    select(null)
  }
}

// ---- 標記：拖曳移動、鍵盤微調與刪除 ----
const markEls = new Map<string, HTMLElement>()
function setMarkEl(id: string, el: HTMLElement | null): void {
  if (el) markEls.set(id, el)
  else markEls.delete(id)
}
function focusMark(id: string): void {
  markEls.get(id)?.focus()
  select(id)
}

let drag: { id: string; pointerId: number; start: { x: number; y: number }; origin: DefectMark; moved: boolean } | null = null

function onMarkDown(event: PointerEvent, mark: DefectMark): void {
  select(mark.id)
  if (!interactive.value || (event.pointerType === 'mouse' && event.button !== 0)) return
  event.preventDefault()
  ;(event.currentTarget as HTMLElement).focus({ preventScroll: true })
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
  drag = { id: mark.id, pointerId: event.pointerId, start: toRatio(event), origin: mark, moved: false }
}

function onMarkMove(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) return
  const p = toRatio(event)
  const dx = p.x - drag.start.x
  const dy = p.y - drag.start.y
  if (!drag.moved && Math.hypot(dx, dy) < 0.005) return
  drag.moved = true
  const moved = moveMark(drag.origin, dx, dy)
  update(drag.id, () => moved)
}

function onMarkUp(event: PointerEvent): void {
  if (drag && event.pointerId === drag.pointerId) drag = null
}

function onMarkKeydown(event: KeyboardEvent, mark: DefectMark): void {
  if (!interactive.value) return
  const step = event.shiftKey ? 0.05 : 0.01
  const delta: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  }
  if (delta[event.key]) {
    event.preventDefault()
    const [dx, dy] = delta[event.key]
    update(mark.id, (m) => moveMark(m, dx, dy))
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    const n = numberOf(mark.id)
    remove(mark.id)
    // 焦點移到下一個（或上一個）標記，沒有時回到標註區
    void nextTick(() => {
      const next = model.value[Math.min(n - 1, model.value.length - 1)]
      if (next) focusMark(next.id)
      else layer.value?.focus()
    })
  } else if (event.key === 'Escape') {
    select(null)
    layer.value?.focus()
  }
}

// 外部拿掉了選取中的標記
watch(model, (list) => {
  if (selectedId.value && !list.some((m) => m.id === selectedId.value)) select(null)
})

defineExpose({
  /** 選取（並聚焦）某個標記；null 取消選取 */
  select: (id: string | null) => (id ? focusMark(id) : select(null)),
})
</script>
