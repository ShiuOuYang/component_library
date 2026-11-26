<template>
  <div class="label-designer flex flex-col gap-2">
    <!-- 工具列 -->
    <div class="flex flex-wrap items-center gap-1" role="toolbar" :aria-label="t.ld.toolbar">
      <template v-if="editable">
        <button
          v-for="tool in tools"
          :key="tool.type"
          type="button"
          class="ld-btn"
          :title="t.ld.add(t.ld.types[tool.type])"
          :aria-label="t.ld.add(t.ld.types[tool.type])"
          :data-add="tool.type"
          @click="addElement(tool.type)"
        >
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">{{ tool.icon }}</span>
          <span class="hidden sm:inline">{{ t.ld.types[tool.type] }}</span>
        </button>
        <span class="mx-1 h-5 w-px bg-stroke-light" aria-hidden="true" />
        <button
          v-for="a in ALIGNS"
          :key="a.mode"
          type="button"
          class="ld-btn"
          :disabled="!selection.length"
          :title="t.ld.align[a.mode]"
          :aria-label="t.ld.align[a.mode]"
          :data-align="a.mode"
          @click="align(a.mode)"
        >
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">{{ a.icon }}</span>
        </button>
        <span class="mx-1 h-5 w-px bg-stroke-light" aria-hidden="true" />
        <button type="button" class="ld-btn" :disabled="!past.length" :title="t.ld.undo" :aria-label="t.ld.undo" data-action="undo" @click="undo">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">undo</span>
        </button>
        <button type="button" class="ld-btn" :disabled="!future.length" :title="t.ld.redo" :aria-label="t.ld.redo" data-action="redo" @click="redo">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">redo</span>
        </button>
      </template>
      <div class="ml-auto flex flex-wrap items-center gap-1">
        <button type="button" class="ld-btn" :title="t.ld.zoomOut" :aria-label="t.ld.zoomOut" data-action="zoom-out" @click="zoom = Math.max(0.25, zoom / 1.25)">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">remove</span>
        </button>
        <span class="w-12 text-center text-xs tabular-nums text-content-secondary" data-zoom>{{ Math.round(zoom * 100) }}%</span>
        <button type="button" class="ld-btn" :title="t.ld.zoomIn" :aria-label="t.ld.zoomIn" data-action="zoom-in" @click="zoom = Math.min(4, zoom * 1.25)">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
        </button>
        <button type="button" class="ld-btn" :title="t.ld.fit" :aria-label="t.ld.fit" data-action="fit" @click="zoom = 1">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">fit_screen</span>
        </button>
        <span class="mx-1 h-5 w-px bg-stroke-light" aria-hidden="true" />
        <button type="button" class="ld-btn" :class="previewing ? 'bg-accent-subtle text-accent-on-subtle' : ''" :aria-pressed="previewing" data-action="preview" @click="setPreview(!previewing)">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">visibility</span>
          <span class="hidden sm:inline">{{ t.ld.preview }}</span>
        </button>
        <button type="button" class="ld-btn" :title="t.ld.exportPng" :aria-label="t.ld.exportPng" data-action="png" @click="downloadPng()">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">download</span>
        </button>
        <button type="button" class="ld-btn" :title="t.ld.print" :aria-label="t.ld.print" data-action="print" @click="print()">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">print</span>
        </button>
      </div>
    </div>

    <div class="grid gap-3" :class="props.showPanel ? 'lg:grid-cols-[minmax(0,1fr)_17rem]' : ''">
      <!-- 畫布 -->
      <div
        ref="wrapRef"
        class="relative overflow-auto rounded-md border border-stroke-light bg-surface-tertiary outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
        :style="{ height: `${props.height}px` }"
        tabindex="0"
        role="application"
        :aria-label="props.label || t.ld.label"
        :aria-describedby="hintId"
        data-canvas-wrap
        @keydown="onKey"
      >
        <div class="flex min-h-full min-w-full items-center justify-center p-6">
          <svg
            ref="svgRef"
            :width="doc.width * scale"
            :height="doc.height * scale"
            :viewBox="`0 0 ${doc.width} ${doc.height}`"
            class="block shrink-0 shadow-md"
            :class="editable ? 'touch-none select-none' : ''"
            data-label-svg
            @pointerdown="onBgDown"
            @pointermove="onMove"
            @pointerup="onUp"
            @pointercancel="onUp"
          >
            <defs>
              <pattern :id="gridId" :width="props.grid" :height="props.grid" patternUnits="userSpaceOnUse">
                <circle :cx="0" :cy="0" :r="0.9 / scale" fill="#9ca3af" />
              </pattern>
            </defs>
            <rect :width="doc.width" :height="doc.height" fill="#fff" />
            <rect v-if="showGrid" :width="doc.width" :height="doc.height" :fill="`url(#${gridId})`" pointer-events="none" data-grid />
            <g
              v-for="el in doc.elements"
              :key="el.id"
              :data-el="el.id"
              :class="editable && !el.locked ? 'cursor-move' : editable ? 'cursor-default' : ''"
              @pointerdown.stop="onElDown($event, el)"
            >
              <!-- elementSvg 產生的 SVG 片段：文字與屬性都已跳脫（同一份也用於匯出與列印），不含使用者的原始 HTML -->
              <!-- eslint-disable-next-line vue/no-v-html -->
              <g v-html="elementSvg(el, props.data, !previewing)" />
              <rect :x="el.x" :y="el.y" :width="Math.max(el.w, 1)" :height="Math.max(el.h, 1)" fill="transparent" />
            </g>
            <!-- 選取框與控制點 -->
            <template v-if="!previewing">
              <rect
                v-for="el in selectedEls"
                :key="`s${el.id}`"
                :x="el.x"
                :y="el.y"
                :width="el.w"
                :height="el.h"
                fill="none"
                :stroke-width="1.5 / scale"
                :stroke-dasharray="`${4 / scale} ${3 / scale}`"
                :style="{ stroke: el.locked ? 'rgb(var(--t-content-tertiary))' : 'rgb(var(--t-accent))' }"
                pointer-events="none"
                data-selection
              />
              <template v-if="handlesFor">
                <rect
                  v-for="hd in HANDLES"
                  :key="hd"
                  :x="handlePos(hd).x - HS / scale / 2"
                  :y="handlePos(hd).y - HS / scale / 2"
                  :width="HS / scale"
                  :height="HS / scale"
                  fill="#fff"
                  :stroke-width="1.5 / scale"
                  :style="{ stroke: 'rgb(var(--t-accent))', cursor: `${hd}-resize` }"
                  :data-handle="hd"
                  @pointerdown.stop="onHandleDown($event, hd)"
                />
              </template>
              <line v-for="gx in guides.x" :key="`gx${gx}`" :x1="gx" :x2="gx" :y1="0" :y2="doc.height" stroke="#e11d8f" :stroke-width="1 / scale" pointer-events="none" data-guide />
              <line v-for="gy in guides.y" :key="`gy${gy}`" :x1="0" :x2="doc.width" :y1="gy" :y2="gy" stroke="#e11d8f" :stroke-width="1 / scale" pointer-events="none" data-guide />
            </template>
          </svg>
        </div>
      </div>

      <!-- 屬性面板 -->
      <aside v-if="props.showPanel" class="flex flex-col gap-3 rounded-md border border-stroke-light bg-surface-primary p-3 text-xs" data-panel>
        <template v-if="single && editable">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-content-primary">{{ t.ld.types[single.type] }}</span>
            <div class="flex gap-1">
              <button type="button" class="ld-btn" :title="t.ld.duplicate" :aria-label="t.ld.duplicate" data-action="duplicate" @click="duplicate">
                <span class="material-symbols-outlined text-[16px]" aria-hidden="true">content_copy</span>
              </button>
              <button type="button" class="ld-btn" :title="t.ld.front" :aria-label="t.ld.front" data-action="front" @click="reorder('front')">
                <span class="material-symbols-outlined text-[16px]" aria-hidden="true">flip_to_front</span>
              </button>
              <button type="button" class="ld-btn" :title="t.ld.back" :aria-label="t.ld.back" data-action="back" @click="reorder('back')">
                <span class="material-symbols-outlined text-[16px]" aria-hidden="true">flip_to_back</span>
              </button>
              <button type="button" class="ld-btn text-danger" :title="t.ld.remove" :aria-label="t.ld.remove" data-action="remove" @click="removeSelected">
                <span class="material-symbols-outlined text-[16px]" aria-hidden="true">delete</span>
              </button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <label v-for="k in GEOM" :key="k" class="ld-field">
              <span>{{ t.ld.geom[k] }}</span>
              <input type="number" step="0.1" min="0" class="ld-input" :value="single[k]" :data-prop="k" @change="setNum(k, $event)" />
            </label>
            <label class="ld-field">
              <span>{{ t.ld.rotation }}</span>
              <select class="ld-input" :value="single.rotation ?? 0" data-prop="rotation" @change="patch({ rotation: Number(($event.target as HTMLSelectElement).value) as LabelRotation })">
                <option v-for="r in [0, 90, 180, 270]" :key="r" :value="r">{{ r }}°</option>
              </select>
            </label>
            <label class="ld-field flex-row items-center gap-1 self-end pb-1">
              <input type="checkbox" :checked="!!single.locked" data-prop="locked" @change="patch({ locked: ($event.target as HTMLInputElement).checked })" />
              <span>{{ t.ld.locked }}</span>
            </label>
          </div>

          <!-- 依類型 -->
          <template v-if="single.type === 'text'">
            <label class="ld-field">
              <span>{{ t.ld.text }}</span>
              <textarea rows="2" class="ld-input h-auto py-1" :value="single.text" data-prop="text" @change="patch({ text: ($event.target as HTMLTextAreaElement).value })" />
            </label>
            <div class="grid grid-cols-2 gap-2">
              <label class="ld-field">
                <span>{{ t.ld.fontSize }}</span>
                <input type="number" step="1" min="4" class="ld-input" :value="single.fontSize" data-prop="fontSize" @change="setNum('fontSize', $event)" />
              </label>
              <label class="ld-field">
                <span>{{ t.ld.textAlign }}</span>
                <select class="ld-input" :value="single.align ?? 'left'" data-prop="align" @change="patch({ align: ($event.target as HTMLSelectElement).value as 'left' | 'center' | 'right' })">
                  <option v-for="a in ['left', 'center', 'right'] as const" :key="a" :value="a">{{ t.ld.textAligns[a] }}</option>
                </select>
              </label>
            </div>
            <label class="ld-field flex-row items-center gap-1">
              <input type="checkbox" :checked="!!single.bold" data-prop="bold" @change="patch({ bold: ($event.target as HTMLInputElement).checked })" />
              <span>{{ t.ld.bold }}</span>
            </label>
          </template>
          <template v-else-if="single.type === 'barcode' || single.type === 'qrcode'">
            <label class="ld-field">
              <span>{{ t.ld.value }}</span>
              <input type="text" class="ld-input" :value="single.value" data-prop="value" @change="patch({ value: ($event.target as HTMLInputElement).value })" />
            </label>
            <p v-if="invalidCode" class="text-danger" role="alert" data-invalid>{{ t.ld.invalidCode }}</p>
            <div v-if="single.type === 'barcode'" class="grid grid-cols-2 gap-2">
              <label class="ld-field">
                <span>{{ t.ld.format }}</span>
                <select class="ld-input" :value="single.format" data-prop="format" @change="patch({ format: ($event.target as HTMLSelectElement).value as BarcodeFormat })">
                  <option value="code128">Code 128</option>
                  <option value="code39">Code 39</option>
                </select>
              </label>
              <label class="ld-field flex-row items-center gap-1 self-end pb-1">
                <input type="checkbox" :checked="!!single.showText" data-prop="showText" @change="patch({ showText: ($event.target as HTMLInputElement).checked })" />
                <span>{{ t.ld.showText }}</span>
              </label>
            </div>
            <label v-else class="ld-field">
              <span>{{ t.ld.level }}</span>
              <select class="ld-input" :value="single.level ?? 'M'" data-prop="level" @change="patch({ level: ($event.target as HTMLSelectElement).value as 'L' | 'M' | 'Q' | 'H' })">
                <option v-for="l in ['L', 'M', 'Q', 'H']" :key="l" :value="l">{{ l }}</option>
              </select>
            </label>
          </template>
          <template v-else-if="single.type === 'line' || single.type === 'rect'">
            <div class="grid grid-cols-2 gap-2">
              <label class="ld-field">
                <span>{{ t.ld.thickness }}</span>
                <input type="number" step="0.1" min="0.1" class="ld-input" :value="single.thickness" data-prop="thickness" @change="setNum('thickness', $event)" />
              </label>
              <label v-if="single.type === 'rect'" class="ld-field">
                <span>{{ t.ld.radius }}</span>
                <input type="number" step="0.5" min="0" class="ld-input" :value="single.radius ?? 0" data-prop="radius" @change="setNum('radius', $event)" />
              </label>
            </div>
            <label v-if="single.type === 'rect'" class="ld-field flex-row items-center gap-1">
              <input type="checkbox" :checked="!!single.fill" data-prop="fill" @change="patch({ fill: ($event.target as HTMLInputElement).checked })" />
              <span>{{ t.ld.fill }}</span>
            </label>
          </template>
          <label v-else-if="single.type === 'image'" class="ld-field">
            <span>{{ t.ld.src }}</span>
            <input type="url" class="ld-input" :value="single.src" data-prop="src" @change="patch({ src: ($event.target as HTMLInputElement).value })" />
          </label>

          <label v-if="props.fields.length && (single.type === 'text' || single.type === 'barcode' || single.type === 'qrcode')" class="ld-field">
            <span>{{ t.ld.insertField }}</span>
            <select class="ld-input" value="" data-insert-field @change="insertField($event)">
              <option value="" disabled>{{ t.ld.chooseField }}</option>
              <option v-for="f in props.fields" :key="f" :value="f">{{ fieldLabel(f) }}</option>
            </select>
          </label>
        </template>

        <template v-else-if="selection.length > 1 && editable">
          <p class="text-sm text-content-primary" data-multi>{{ t.ld.selectedCount(selection.length) }}</p>
          <button type="button" class="ld-btn self-start text-danger" data-action="remove" @click="removeSelected">
            <span class="material-symbols-outlined text-[16px]" aria-hidden="true">delete</span>{{ t.ld.remove }}
          </button>
        </template>

        <template v-else-if="editable">
          <span class="text-sm font-semibold text-content-primary">{{ t.ld.labelSettings }}</span>
          <div class="grid grid-cols-2 gap-2">
            <label class="ld-field">
              <span>{{ t.ld.labelWidth }}</span>
              <input type="number" step="1" min="5" class="ld-input" :value="doc.width" data-doc="width" @change="setDocNum('width', $event)" />
            </label>
            <label class="ld-field">
              <span>{{ t.ld.labelHeight }}</span>
              <input type="number" step="1" min="5" class="ld-input" :value="doc.height" data-doc="height" @change="setDocNum('height', $event)" />
            </label>
            <label class="ld-field">
              <span>DPI</span>
              <select class="ld-input" :value="doc.dpi ?? 203" data-doc="dpi" @change="commit({ ...doc, dpi: Number(($event.target as HTMLSelectElement).value) })">
                <option v-for="d in [203, 300, 600]" :key="d" :value="d">{{ d }}</option>
              </select>
            </label>
          </div>
          <p v-if="usedFields.length" class="text-content-secondary" data-used-fields>{{ t.ld.usedFields(usedFields.join(', ')) }}</p>
        </template>

        <!-- 圖層 -->
        <div class="flex min-h-0 flex-col gap-1">
          <span class="text-sm font-semibold text-content-primary">{{ t.ld.layers }}</span>
          <p v-if="!doc.elements.length" class="text-content-tertiary">{{ t.ld.empty }}</p>
          <ul
            v-else
            class="max-h-48 overflow-auto rounded border border-stroke-light outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
            role="listbox"
            aria-multiselectable="true"
            :aria-label="t.ld.layers"
            :aria-activedescendant="selection.length ? `${uid}-layer-${selection[selection.length - 1]}` : undefined"
            tabindex="0"
            data-layers
            @keydown="onLayerKey"
          >
            <li
              v-for="el in [...doc.elements].reverse()"
              :id="`${uid}-layer-${el.id}`"
              :key="el.id"
              role="option"
              :aria-selected="selection.includes(el.id)"
              class="flex cursor-pointer items-center gap-1.5 px-2 py-1"
              :class="selection.includes(el.id) ? 'bg-accent-subtle text-accent-on-subtle' : 'text-content-secondary hover:bg-surface-secondary'"
              :data-layer="el.id"
              @click="pick(el.id, $event.shiftKey || $event.metaKey || $event.ctrlKey)"
            >
              <span class="material-symbols-outlined text-[14px]" aria-hidden="true">{{ ICON[el.type] }}</span>
              <span class="min-w-0 flex-1 truncate">{{ layerName(el) }}</span>
              <span v-if="el.locked" class="material-symbols-outlined text-[14px]" aria-hidden="true">lock</span>
            </li>
          </ul>
        </div>
      </aside>
    </div>
    <p :id="hintId" class="sr-only">{{ editable ? t.ld.hint : t.ld.hintReadonly }}</p>
    <span class="sr-only" aria-live="polite" data-live>{{ announcement }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useLocale } from '../shared/config'
import type { BarcodeFormat } from '../shared/barcode'
import {
  alignElements,
  barcodeOf,
  bindTemplate,
  boundsOf,
  clampInside,
  createElement,
  duplicateElements,
  elementSvg,
  labelSvg,
  mmToDots,
  moveElements,
  qrMatrix,
  removeElements,
  reorderElement,
  resizeBox,
  snapMove,
  snapTo,
  templateFields,
  toZpl,
  updateElement,
  type LabelAlign,
  type LabelDoc,
  type LabelElement,
  type LabelElementType,
  type LabelRotation,
  type ResizeHandle,
} from '../shared/labelDesigner'

/**
 * ChptLabelDesigner - 標籤設計器
 *
 * 產品標籤、棧板標籤：以 mm 為單位的畫布，放文字、一維條碼、QR code、線條、方框、圖片；
 * 拖曳移動、控制點改大小，貼齊格線與其他元素（顯示對齊參考線）；內容可綁定 {{lotNo}} 這類欄位，預覽時代入資料。
 * v-model 為版面 JSON（可存檔再編輯），另可輸出 PNG、列印、ZPL（工業標籤機）。
 */

export interface ChptLabelDesignerProps {
  /** 版面（v-model）；沒給時為 60 × 40 mm 空白標籤 */
  modelValue?: LabelDoc
  /** 欄位資料（設計時顯示、預覽 / 列印 / 匯出時代入） */
  data?: Record<string, unknown> | null
  /** 可以插入的欄位 */
  fields?: string[]
  /** 欄位的顯示名稱 */
  fieldLabels?: Record<string, string>
  /** 預覽模式（v-model:preview） */
  preview?: boolean
  readonly?: boolean
  /** 格線間距（mm）；0 = 不吸附 */
  grid?: number
  /** 顯示格線 */
  showGrid?: boolean
  /** 貼齊其他元素與標籤邊緣 */
  snap?: boolean
  /** 顯示屬性面板 */
  showPanel?: boolean
  allowImages?: boolean
  /** 畫布高度（px） */
  height?: number
  /** 下載檔名（不含副檔名） */
  exportName?: string
  /** 設計器名稱（螢幕閱讀器） */
  label?: string
}

const props = withDefaults(defineProps<ChptLabelDesignerProps>(), {
  modelValue: undefined,
  data: null,
  fields: () => [],
  fieldLabels: () => ({}),
  preview: false,
  readonly: false,
  grid: 1,
  showGrid: true,
  snap: true,
  showPanel: true,
  allowImages: true,
  height: 420,
  exportName: 'label',
  label: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: LabelDoc): void
  (e: 'update:preview', value: boolean): void
  (e: 'select', ids: string[]): void
}>()

const locale = useLocale()
const t = computed(() => ({ ld: locale.value.labelDesigner }))
const uid = useId()
const hintId = `${uid}-hint`
const gridId = `${uid}-grid`
const HS = 8
const HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const GEOM = ['x', 'y', 'w', 'h'] as const
const ICON: Record<LabelElementType, string> = { text: 'text_fields', barcode: 'barcode', qrcode: 'qr_code_2', line: 'horizontal_rule', rect: 'crop_square', image: 'image' }
const ALIGNS: { mode: LabelAlign; icon: string }[] = [
  { mode: 'left', icon: 'align_horizontal_left' },
  { mode: 'hcenter', icon: 'align_horizontal_center' },
  { mode: 'right', icon: 'align_horizontal_right' },
  { mode: 'top', icon: 'align_vertical_top' },
  { mode: 'vcenter', icon: 'align_vertical_center' },
  { mode: 'bottom', icon: 'align_vertical_bottom' },
]
const tools = computed(() =>
  (['text', 'barcode', 'qrcode', 'line', 'rect', 'image'] as LabelElementType[]).filter((x) => x !== 'image' || props.allowImages).map((type) => ({ type, icon: ICON[type] }))
)

// ---- 文件與歷史 ----
const doc = ref<LabelDoc>(props.modelValue ?? { width: 60, height: 40, dpi: 203, elements: [] })
watch(
  () => props.modelValue,
  (v) => {
    if (v && v !== doc.value) {
      doc.value = v
      selection.value = selection.value.filter((id) => v.elements.some((e) => e.id === id))
    }
  }
)
const past = ref<LabelDoc[]>([])
const future = ref<LabelDoc[]>([])
function commit(next: LabelDoc, before: LabelDoc = doc.value): void {
  past.value = [...past.value, before].slice(-50)
  future.value = []
  doc.value = next
  emit('update:modelValue', next)
}
function undo(): void {
  const prev = past.value[past.value.length - 1]
  if (!prev) return
  past.value = past.value.slice(0, -1)
  future.value = [...future.value, doc.value]
  doc.value = prev
  emit('update:modelValue', prev)
  selection.value = selection.value.filter((id) => prev.elements.some((e) => e.id === id))
  announcement.value = t.value.ld.undone
}
function redo(): void {
  const next = future.value[future.value.length - 1]
  if (!next) return
  future.value = future.value.slice(0, -1)
  past.value = [...past.value, doc.value]
  doc.value = next
  emit('update:modelValue', next)
  announcement.value = t.value.ld.redone
}

const previewing = ref(props.preview)
watch(
  () => props.preview,
  (v) => (previewing.value = v)
)
function setPreview(v: boolean): void {
  previewing.value = v
  emit('update:preview', v)
}
const editable = computed(() => !props.readonly)
const canEdit = computed(() => editable.value && !previewing.value)
const showGrid = computed(() => props.showGrid && !previewing.value && props.grid > 0 && props.grid * scale.value >= 4)
const usedFields = computed(() => templateFields(doc.value))
const fieldLabel = (f: string) => props.fieldLabels[f] ?? f

// ---- 縮放：1 = 放進畫布 ----
const wrapRef = ref<HTMLElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const wrapW = ref(600)
let observer: ResizeObserver | undefined
onMounted(() => {
  const measure = () => {
    if (wrapRef.value?.clientWidth) wrapW.value = wrapRef.value.clientWidth
  }
  measure()
  if (typeof ResizeObserver !== 'undefined' && wrapRef.value) {
    observer = new ResizeObserver(measure)
    observer.observe(wrapRef.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())
const zoom = ref(1)
/** px / mm */
const scale = computed(() => {
  const fit = Math.min((wrapW.value - 48) / doc.value.width, (props.height - 48) / doc.value.height)
  return Math.max(1, Math.min(16, fit)) * zoom.value
})

// ---- 選取 ----
const selection = ref<string[]>([])
const selectedEls = computed(() => doc.value.elements.filter((e) => selection.value.includes(e.id)))
const single = computed(() => (selectedEls.value.length === 1 ? selectedEls.value[0] : null))
const handlesFor = computed(() => (canEdit.value && single.value && !single.value.locked ? single.value : null))
function setSelection(ids: string[]): void {
  selection.value = ids
  emit('select', ids)
}
function pick(id: string, additive: boolean): void {
  if (additive) setSelection(selection.value.includes(id) ? selection.value.filter((x) => x !== id) : [...selection.value, id])
  else setSelection([id])
}
const invalidCode = computed(() => {
  const el = single.value
  if (!el) return false
  const v = bindTemplate(el.type === 'barcode' || el.type === 'qrcode' ? el.value : '', props.data, false)
  if (el.type === 'barcode') return !barcodeOf(v, el.format)
  if (el.type === 'qrcode') return !qrMatrix(v, el.level)
  return false
})

// ---- 編輯 ----
const announcement = ref('')
function addElement(type: LabelElementType): void {
  const def = createElement(type, { x: 0, y: 0 }, { text: type === 'text' ? t.value.ld.newText : type === 'image' ? '' : undefined })
  const at = clampInside({ ...def, x: snapTo((doc.value.width - def.w) / 2, props.grid), y: snapTo((doc.value.height - def.h) / 2, props.grid) }, doc.value)
  const el = { ...def, ...at } as LabelElement
  commit({ ...doc.value, elements: [...doc.value.elements, el] })
  setSelection([el.id])
  announcement.value = t.value.ld.added(t.value.ld.types[type])
}
function patch(p: Partial<LabelElement>): void {
  if (!single.value) return
  commit(updateElement(doc.value, single.value.id, p))
}
function setNum(k: string, e: Event): void {
  const v = parseFloat((e.target as HTMLInputElement).value)
  if (!Number.isFinite(v) || v < 0) return
  patch({ [k]: Math.round(v * 100) / 100 } as Partial<LabelElement>)
}
function setDocNum(k: 'width' | 'height', e: Event): void {
  const v = parseFloat((e.target as HTMLInputElement).value)
  if (!Number.isFinite(v) || v < 5) return
  commit({ ...doc.value, [k]: Math.round(v * 10) / 10 })
}
function insertField(e: Event): void {
  const sel = e.target as HTMLSelectElement
  const f = sel.value
  sel.value = ''
  const el = single.value
  if (!f || !el) return
  const token = `{{${f}}}`
  if (el.type === 'text') patch({ text: el.text + token })
  else if (el.type === 'barcode' || el.type === 'qrcode') patch({ value: el.value + token })
}
function removeSelected(): void {
  if (!selection.value.length) return
  const n = selection.value.length
  commit(removeElements(doc.value, selection.value))
  setSelection([])
  announcement.value = t.value.ld.removed(n)
}
function duplicate(): void {
  if (!selection.value.length) return
  const res = duplicateElements(doc.value, selection.value, Math.max(props.grid, 1) * 2)
  commit(res.doc)
  setSelection(res.ids)
}
function align(mode: LabelAlign): void {
  if (!selection.value.length) return
  commit(alignElements(doc.value, selection.value, mode))
  announcement.value = t.value.ld.align[mode]
}
function reorder(to: 'front' | 'back' | 'forward' | 'backward'): void {
  if (single.value) commit(reorderElement(doc.value, single.value.id, to))
}

// ---- 拖曳移動 / 改大小 ----
type Drag =
  | { kind: 'move'; start: { x: number; y: number }; before: LabelDoc; ids: string[]; box: { x: number; y: number; w: number; h: number }; moved: boolean }
  | { kind: 'resize'; start: { x: number; y: number }; before: LabelDoc; id: string; handle: ResizeHandle; moved: boolean }
let drag: Drag | null = null
const guides = ref<{ x: number[]; y: number[] }>({ x: [], y: [] })
function toMm(e: { clientX: number; clientY: number }) {
  const r = svgRef.value!.getBoundingClientRect()
  return { x: (e.clientX - r.left) / scale.value, y: (e.clientY - r.top) / scale.value }
}
function onBgDown(): void {
  if (!previewing.value) setSelection([])
}
function onElDown(e: PointerEvent, el: LabelElement): void {
  if (previewing.value) return
  if (e.pointerType === 'mouse' && e.button !== 0) return
  wrapRef.value?.focus({ preventScroll: true })
  const additive = e.shiftKey || e.metaKey || e.ctrlKey
  if (additive) pick(el.id, true)
  else if (!selection.value.includes(el.id)) setSelection([el.id])
  if (!canEdit.value) return
  const ids = selection.value.filter((id) => !doc.value.elements.find((x) => x.id === id)!.locked)
  if (!ids.length) return
  svgRef.value?.setPointerCapture?.(e.pointerId)
  drag = { kind: 'move', start: toMm(e), before: doc.value, ids, box: boundsOf(doc.value.elements.filter((x) => ids.includes(x.id)))!, moved: false }
}
function onHandleDown(e: PointerEvent, handle: ResizeHandle): void {
  if (!handlesFor.value) return
  svgRef.value?.setPointerCapture?.(e.pointerId)
  drag = { kind: 'resize', start: toMm(e), before: doc.value, id: handlesFor.value.id, handle, moved: false }
}
function onMove(e: PointerEvent): void {
  if (!drag) return
  const p = toMm(e)
  let dx = p.x - drag.start.x
  let dy = p.y - drag.start.y
  if (!drag.moved && Math.hypot(dx, dy) * scale.value < 3) return
  drag.moved = true
  const D = drag.before
  if (drag.kind === 'move') {
    const b = drag.box
    const ids = drag.ids
    if (props.snap) {
      const others = D.elements.filter((x) => !ids.includes(x.id))
      const s = snapMove({ ...b, x: b.x + dx, y: b.y + dy }, others, D, { threshold: 6 / scale.value, grid: props.grid })
      dx += s.dx
      dy += s.dy
      guides.value = s.guides
    }
    // 整組不超出標籤
    dx = Math.max(-b.x, Math.min(D.width - b.x - b.w, dx))
    dy = Math.max(-b.y, Math.min(D.height - b.y - b.h, dy))
    doc.value = moveElements(D, ids, dx, dy, false)
  } else {
    const el = D.elements.find((x) => x.id === (drag as Extract<Drag, { kind: 'resize' }>).id)!
    let box = resizeBox(el, drag.handle, dx, dy, 0.5, el.type === 'qrcode')
    if (props.snap && props.grid > 0) {
      const x2 = snapTo(box.x + box.w, props.grid)
      const y2 = snapTo(box.y + box.h, props.grid)
      if (drag.handle.includes('w')) box = { ...box, x: snapTo(box.x, props.grid), w: Math.max(0.5, el.x + el.w - snapTo(box.x, props.grid)) }
      if (drag.handle.includes('e')) box = { ...box, w: Math.max(0.5, x2 - box.x) }
      if (drag.handle.includes('n')) box = { ...box, y: snapTo(box.y, props.grid), h: Math.max(0.5, el.y + el.h - snapTo(box.y, props.grid)) }
      if (drag.handle.includes('s')) box = { ...box, h: Math.max(0.5, y2 - box.y) }
    }
    // QR code 保持正方形（吸附格線後寬高可能差一點）
    if (el.type === 'qrcode') {
      const side = Math.min(Math.max(box.w, box.h), D.width, D.height)
      box = { ...box, w: side, h: side, y: drag.handle.includes('n') ? el.y + el.h - side : box.y, x: drag.handle.includes('w') ? el.x + el.w - side : box.x }
    }
    box = { ...box, w: Math.min(box.w, D.width), h: Math.min(box.h, D.height) }
    doc.value = updateElement(D, el.id, clampInside(box, D))
  }
}
function onUp(): void {
  if (!drag) return
  const d = drag
  drag = null
  guides.value = { x: [], y: [] }
  if (d.moved) commit(doc.value, d.before)
}
function handlePos(h: ResizeHandle): { x: number; y: number } {
  const el = handlesFor.value!
  const x = h.includes('w') ? el.x : h.includes('e') ? el.x + el.w : el.x + el.w / 2
  const y = h.includes('n') ? el.y : h.includes('s') ? el.y + el.h : el.y + el.h / 2
  return { x, y }
}

// ---- 鍵盤 ----
function onKey(e: KeyboardEvent): void {
  const mod = e.ctrlKey || e.metaKey
  if (!canEdit.value) return
  const k = e.key.toLowerCase()
  if (mod && k === 'z') {
    e.preventDefault()
    if (e.shiftKey) redo()
    else undo()
    return
  }
  if (mod && k === 'y') {
    e.preventDefault()
    redo()
    return
  }
  if (mod && k === 'a') {
    e.preventDefault()
    setSelection(doc.value.elements.map((x) => x.id))
    return
  }
  if (mod && k === 'd') {
    e.preventDefault()
    duplicate()
    return
  }
  if (e.key === 'Escape') {
    setSelection([])
    return
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && selection.value.length) {
    e.preventDefault()
    removeSelected()
    return
  }
  const dirs: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
  const dir = dirs[e.key]
  if (dir && selection.value.length) {
    e.preventDefault()
    const step = e.altKey ? 0.1 : (props.grid || 1) * (e.shiftKey ? 10 : 1)
    commit(moveElements(doc.value, selection.value, dir[0] * step, dir[1] * step))
    const b = boundsOf(selectedEls.value)!
    announcement.value = t.value.ld.position(b.x, b.y)
  }
}
function onLayerKey(e: KeyboardEvent): void {
  const order = [...doc.value.elements].reverse().map((x) => x.id)
  if (!order.length) return
  const cur = selection.value[selection.value.length - 1]
  const i = cur ? order.indexOf(cur) : -1
  let next: number | null = null
  if (e.key === 'ArrowDown') next = Math.min(order.length - 1, i + 1)
  else if (e.key === 'ArrowUp') next = Math.max(0, i - 1)
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = order.length - 1
  else if ((e.key === 'Delete' || e.key === 'Backspace') && canEdit.value) {
    e.preventDefault()
    removeSelected()
    return
  }
  if (next === null) return
  e.preventDefault()
  pick(order[next], e.shiftKey)
}
function layerName(el: LabelElement): string {
  const s = t.value.ld
  const content = el.type === 'text' ? el.text : el.type === 'barcode' || el.type === 'qrcode' ? el.value : ''
  return content ? s.layerName(s.types[el.type], content.replace(/\s+/g, ' ')) : s.types[el.type]
}

// ---- 輸出 ----
function toSvg(data: Record<string, unknown> | null = props.data): string {
  return labelSvg(doc.value, data, false)
}
/** 以標籤機解析度輸出 PNG（每 mm 的點數 = dpi / 25.4） */
function exportPng(data: Record<string, unknown> | null = props.data, dpi = doc.value.dpi ?? 203): Promise<Blob | null> {
  const svg = toSvg(data)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = mmToDots(doc.value.width, dpi)
      canvas.height = mmToDots(doc.value.height, dpi)
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(null)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((b) => resolve(b), 'image/png')
    }
    img.onerror = () => resolve(null)
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}
async function downloadPng(): Promise<void> {
  const blob = await exportPng()
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.exportName}.png`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
/** 列印：每筆資料一張標籤（每頁一張，頁面大小 = 標籤大小） */
function printHtml(records: (Record<string, unknown> | null)[] = [props.data]): string {
  const w = doc.value.width
  const h = doc.value.height
  const pages = records.map((r) => `<div class="p">${labelSvg(doc.value, r, false)}</div>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${w}mm ${h}mm;margin:0}html,body{margin:0}.p{width:${w}mm;height:${h}mm;page-break-after:always;overflow:hidden}.p svg{display:block}</style></head><body>${pages}</body></html>`
}
function print(records?: (Record<string, unknown> | null)[]): HTMLIFrameElement | null {
  if (typeof document === 'undefined') return null
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  frame.setAttribute('aria-hidden', 'true')
  document.body.appendChild(frame)
  const w = frame.contentWindow
  w?.document.open()
  w?.document.write(printHtml(records))
  w?.document.close()
  setTimeout(() => {
    try {
      w?.focus()
      w?.print()
    } finally {
      setTimeout(() => frame.remove(), 1000)
    }
  }, 100)
  return frame
}

defineExpose({
  /** 目前的版面 */
  value: () => doc.value,
  toSvg,
  exportPng,
  /** ZPL II（Zebra 標籤機） */
  toZpl: (data: Record<string, unknown> | null = props.data) => toZpl(doc.value, data),
  printHtml,
  print,
  undo,
  redo,
  select: (ids: string[]) => setSelection(ids),
  addElement,
})
</script>

<style scoped>
.ld-btn {
  @apply inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-xs text-content-secondary hover:bg-surface-tertiary hover:text-content-primary disabled:cursor-not-allowed disabled:opacity-40;
}
.ld-field {
  @apply flex flex-col gap-0.5 text-content-secondary;
}
.ld-input {
  @apply h-7 w-full rounded border border-stroke-default bg-surface-primary px-1.5 text-xs text-content-primary focus:border-stroke-focus focus:outline-none focus:ring-1 focus:ring-stroke-focus;
}
</style>
