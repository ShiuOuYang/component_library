<template>
  <section
    ref="root"
    class="chpt-chart-frame flex flex-col rounded-lg border border-stroke-light bg-surface-primary"
    :aria-labelledby="props.title ? titleId : undefined"
    :aria-label="props.title ? undefined : props.ariaLabel || undefined"
  >
    <header v-if="hasHeader" class="flex items-start gap-3 px-4 pt-3">
      <div class="min-w-0 flex-1">
        <h3 v-if="props.title" :id="titleId" class="truncate text-sm font-semibold text-content-primary">
          <slot name="title">{{ props.title }}</slot>
        </h3>
        <p v-if="props.description" class="mt-0.5 text-xs text-content-secondary">{{ props.description }}</p>
      </div>

      <!-- 工具列：不出現在匯出的圖片裡 -->
      <div v-if="$slots.actions || exportItems.length" class="flex shrink-0 items-center gap-2" data-export-ignore>
        <slot name="actions"></slot>
        <ChptDropdown
          v-if="exportItems.length"
          :items="exportItems"
          :label="exporting ? t.chartFrame.exporting : t.chartFrame.export"
          icon="download"
          size="xs"
          placement="bottom-end"
          :disabled="exporting"
          @select="onExportSelect"
        />
      </div>
    </header>

    <div
      class="chpt-chart-frame-body relative px-4 pb-3"
      :class="hasHeader ? 'pt-2' : 'pt-3'"
      :style="props.height ? { height: props.height } : undefined"
      :aria-busy="props.loading || undefined"
    >
      <!-- 錯誤：取代圖表，附重試 -->
      <div v-if="errorText" class="flex h-full min-h-[8rem] flex-col items-center justify-center gap-3 text-center" role="alert">
        <slot name="error" :message="errorText" :retry="retry">
          <ChptIcon :size="32" color="danger">error</ChptIcon>
          <p class="text-sm text-content-primary">{{ errorText }}</p>
          <ChptButton size="sm" is-outline @click="retry">{{ t.chartFrame.retry }}</ChptButton>
        </slot>
      </div>

      <!-- 沒有資料：載入中時不顯示（避免「沒有資料」閃一下才出現圖） -->
      <div v-else-if="props.empty && !props.loading" class="flex h-full min-h-[8rem] items-center justify-center">
        <slot name="empty">
          <ChptEmpty :title="props.emptyText ?? t.chart.noData" />
        </slot>
      </div>

      <slot v-else></slot>

      <!-- 載入中：保留舊的圖在底下（半透明遮罩），重新查詢時不會整塊閃成空白 -->
      <div
        v-if="props.loading"
        class="absolute inset-0 z-10 flex items-center justify-center rounded-b-lg bg-surface-primary/60"
        data-export-ignore
      >
        <ChptSpinner loading :text="t.loading" />
      </div>
    </div>

    <footer v-if="$slots.footer" class="border-t border-stroke-light px-4 py-2 text-xs text-content-secondary">
      <slot name="footer"></slot>
    </footer>

    <span class="sr-only" aria-live="polite">{{ liveMessage }}</span>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useId, useSlots, useTemplateRef } from 'vue'
import ChptDropdown, { type DropdownItem } from '../ui/ChptDropdown.vue'
import ChptButton from '../ui/ChptButton.vue'
import ChptEmpty from '../ui/ChptEmpty.vue'
import ChptIcon from '../ui/ChptIcon.vue'
import ChptSpinner from '../ui/ChptSpinner.vue'
import { useLocale } from '../shared/config'
import { csvBlob, downloadBlob, exportChart, type CsvColumn } from './utils/chartExport'

/**
 * ChptChartFrame（CHPT 主題） - 圖表外框
 *
 * 任何一張圖（組件庫的 17 種圖表、或自己畫的 SVG / Canvas）放進來，就有一致的：
 *   - 標題、說明、右上角的動作區
 *   - 載入中（半透明遮罩，舊的圖留在底下）、沒有資料、錯誤（附重試）
 *   - 匯出：PNG 圖片、SVG 向量圖（看得到的圖例、標題都在裡面，可直接貼進簡報）、CSV 資料
 *
 * 圖表要跟著外框的寬度：圖表開 autoResize（或寬度給 100%），外框用 height 決定圖的高度。
 */

export type ChartFrameExportFormat = 'png' | 'svg' | 'csv'

export interface ChptChartFrameProps {
  title?: string
  /** 標題下方的說明（資料範圍、單位…） */
  description?: string
  /** 圖表區的高度（CSS 值）；不給時由內容決定 */
  height?: string
  loading?: boolean
  /** 沒有資料：顯示空狀態取代圖表 */
  empty?: boolean
  emptyText?: string
  /** 錯誤：true 顯示預設訊息，字串則顯示該訊息；附重試鈕（retry 事件） */
  error?: boolean | string
  /**
   * 匯出選單：true 為 PNG + SVG（有 csvData 時加 CSV）；也可以指定格式，例如 ['png', 'csv']。
   * 載入中、錯誤、沒有資料時圖片匯出會停用
   */
  exportable?: boolean | ChartFrameExportFormat[]
  /** 下載檔名（不含副檔名）；不給時用 title，再沒有就是 chart */
  filename?: string
  /** CSV 匯出的資料列；給了才會出現 CSV 選項 */
  csvData?: Record<string, unknown>[]
  /** CSV 的欄位與標題；不給時用第一列的所有欄位 */
  csvColumns?: CsvColumn[]
  /** PNG 倍率（預設 2，投影也清楚） */
  exportScale?: number
  /** 匯出圖片的底色；不給時取外框的底色（深色模式就是深底），'transparent' 為透明 */
  exportBackground?: string
  /** false 時只送 export 事件、不自動下載（例如要上傳到伺服器） */
  autoDownload?: boolean
  /** 沒有 title 時整個區塊的名稱 */
  ariaLabel?: string
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const t = useLocale()
const props = withDefaults(defineProps<ChptChartFrameProps>(), {
  title: '',
  description: '',
  height: undefined,
  loading: false,
  empty: false,
  emptyText: undefined,
  error: false,
  exportable: false,
  filename: undefined,
  csvData: undefined,
  csvColumns: undefined,
  exportScale: 2,
  exportBackground: undefined,
  autoDownload: true,
  ariaLabel: '',
})

const emit = defineEmits<{
  /** 匯出完成（autoDownload 時也會送，可用來記錄或上傳） */
  (e: 'export', payload: { format: ChartFrameExportFormat; blob: Blob; filename: string }): void
  (e: 'export-error', payload: { format: ChartFrameExportFormat; error: unknown }): void
  /** 錯誤狀態下按了重試 */
  (e: 'retry'): void
}>()

const slots = useSlots()
const root = useTemplateRef<HTMLElement>('root')
const titleId = `${useId()}-title`
const exporting = ref(false)
const liveMessage = ref('')

const hasHeader = computed(() => !!props.title || !!props.description || !!slots.actions || exportItems.value.length > 0)
const errorText = computed(() => (props.error === true ? t.value.chartFrame.error : props.error || ''))

const formats = computed<ChartFrameExportFormat[]>(() => {
  if (!props.exportable) return []
  const wanted = props.exportable === true ? (['png', 'svg', 'csv'] as ChartFrameExportFormat[]) : props.exportable
  return wanted.filter((f) => f !== 'csv' || !!props.csvData)
})

/** 圖片匯出要有東西可畫 */
const imageDisabled = computed(() => props.loading || !!errorText.value || props.empty)

const exportItems = computed<DropdownItem[]>(() =>
  formats.value.map((format) => ({
    key: format,
    label: t.value.chartFrame[format],
    icon: format === 'csv' ? 'table_view' : format === 'svg' ? 'polyline' : 'image',
    disabled: format === 'csv' ? !props.csvData?.length : imageDisabled.value,
  }))
)

function baseName(): string {
  const raw = props.filename || props.title || 'chart'
  // 作業系統不允許的字元換掉
  return raw.replace(/[\\/:*?"<>|\n\r]+/g, '_').trim() || 'chart'
}

/** 產生匯出檔（不下載） */
async function exportAs(format: ChartFrameExportFormat): Promise<Blob> {
  if (format === 'csv') return csvBlob(props.csvData ?? [], props.csvColumns)
  if (!root.value) throw new Error('ChptChartFrame is not mounted')
  return exportChart(root.value, format, { scale: props.exportScale, background: props.exportBackground })
}

/** 匯出並（autoDownload 時）下載；回傳 Blob，失敗時丟出錯誤 */
async function download(format: ChartFrameExportFormat): Promise<Blob> {
  exporting.value = true
  liveMessage.value = ''
  try {
    const blob = await exportAs(format)
    const filename = `${baseName()}.${format}`
    if (props.autoDownload) downloadBlob(blob, filename)
    emit('export', { format, blob, filename })
    return blob
  } catch (error) {
    liveMessage.value = t.value.chartFrame.exportFailed
    emit('export-error', { format, error })
    throw error
  } finally {
    exporting.value = false
  }
}

function onExportSelect(item: DropdownItem): void {
  // 錯誤已透過 export-error 與 aria-live 告知；這裡不再往外丟
  download(item.key as ChartFrameExportFormat).catch(() => {})
}

function retry(): void {
  emit('retry')
}

defineExpose({
  /** 產生匯出檔（不下載） */
  exportAs,
  /** 匯出並下載（autoDownload 為 false 時只送 export 事件） */
  download,
})
</script>
