<template>
  <div class="min-h-screen bg-surface-secondary p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">ChptChartFrame 圖表外框與匯出</h1>
        <p class="text-lg text-content-secondary">
          任何一張圖放進外框，就有一致的標題、載入中、沒有資料、錯誤（附重試），以及匯出 PNG / SVG / CSV。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入
          <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">ChptChartFrame</code>；
          自己做匯出按鈕時也可以直接用 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">exportChart</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">csvBlob</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">downloadBlob</code>。
        </p>
      </div>

      <section id="basic" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">匯出圖片與資料</h2>
        <p class="text-sm text-content-secondary mb-4">
          右上角「匯出」：<strong>PNG</strong> 適合貼進通訊軟體與文件；<strong>SVG</strong> 是向量圖，貼進 PowerPoint 放大也清楚，
          而且是純 SVG（不靠 foreignObject），PowerPoint、Illustrator 都打得開；<strong>CSV</strong> 帶 BOM，Excel 直接開不會亂碼。
          圖例、標題這些 HTML 也會畫進圖片裡；工具列與重設縮放鈕不會。
        </p>
        <div class="grid gap-6 lg:grid-cols-2">
          <ChptChartFrame
            title="本週不良原因"
            description="SMT 線 · 11/10–11/16 · 單位：件"
            height="18rem"
            exportable
            filename="不良原因-第46週"
            :csv-data="defects"
            :csv-columns="[{ key: 'reason', title: '不良原因' }, { key: 'count', title: '數量' }]"
          >
            <HorizontalBarChart
              :data="defects"
              label-field="reason"
              value-field="count"
              :top-n="6"
              :show-others="true"
              :show-percent="true"
              :auto-resize="true"
              :auto-height="true"
            />
          </ChptChartFrame>

          <ChptChartFrame title="工單狀態" description="圖例是 HTML，一樣會出現在匯出的圖片裡" height="18rem" exportable :csv-data="orderStatus">
            <PieChart :data="orderStatus" label-field="status" value-field="count" center-label="張工單" :auto-resize="true" />
          </ChptChartFrame>
        </div>
        <ChptCodeBlock class="mt-4" :code="basicCode" />
      </section>

      <section id="states" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">載入中、沒有資料、錯誤</h2>
        <p class="text-sm text-content-secondary mb-4">
          三種狀態由外框統一處理，各圖表不必各自實作。重新查詢時舊的圖留在半透明遮罩下，不會整塊閃成空白；
          錯誤時送出 <code>retry</code> 事件。這些狀態下圖片匯出會停用。
        </p>
        <ChptSegmented v-model="demoState" :options="stateOptions" aria-label="示範狀態" size="xs" class="mb-3" />
        <ChptChartFrame
          title="各線產出"
          height="16rem"
          exportable
          :loading="demoState === 'loading'"
          :empty="demoState === 'empty'"
          :error="demoState === 'error' ? '連線逾時，無法取得產出資料' : false"
          @retry="demoState = 'normal'"
        >
          <HorizontalBarChart :data="output" label-field="name" value-field="qty" :auto-resize="true" :auto-height="true" />
        </ChptChartFrame>
        <ChptCodeBlock class="mt-4" :code="statesCode" />
      </section>

      <section id="custom" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">大量資料（Canvas）與自訂處理</h2>
        <p class="text-sm text-content-secondary mb-4">
          大量資料模式畫在 Canvas 上的點也會匯出。<code>:auto-download="false"</code> 時只送 <code>export</code> 事件、不下載 ——
          下面把匯出的 PNG 直接顯示出來（實務上可以上傳到伺服器、附在報告裡）。也可以用 ref 呼叫 <code>exportAs(format)</code> 取得 Blob。
        </p>
        <div class="grid gap-6 lg:grid-cols-2">
          <ChptChartFrame
            title="測試點分布"
            :description="`${scatterPoints.length.toLocaleString()} 個測試點（Canvas）`"
            height="20rem"
            :exportable="['png', 'svg']"
            :auto-download="false"
            @export="onExport"
          >
            <StatusScatterMap :data="scatterPoints" :auto-resize="true" />
          </ChptChartFrame>
          <div class="flex flex-col rounded-lg border border-dashed border-stroke-default p-4">
            <p class="mb-2 text-sm text-content-secondary">
              {{ preview ? `上一次匯出：${preview.filename}（${(preview.size / 1024).toFixed(0)} KB）` : '在左邊按「匯出」，結果會顯示在這裡' }}
            </p>
            <img v-if="preview" :src="preview.url" alt="匯出的圖表預覽" class="max-h-80 self-start rounded border border-stroke-light object-contain" />
          </div>
        </div>
        <ChptCodeBlock class="mt-4" :code="customCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-4">API</h2>
        <ApiTable of="ChptChartFrame" title="Props" :rows="frameProps" />
        <ApiTable of="ChptChartFrame" title="Events" :rows="frameEvents" />
        <ApiTable of="ChptChartFrame" title="Slots" :rows="frameSlots" />
        <ApiTable of="ChptChartFrame" title="方法（ref）" :rows="frameMethods" />
        <ApiTable of="-" title="匯出工具函式" :rows="exportUtils" />
        <p class="text-sm text-content-secondary mt-4">
          <strong>不會出現在匯出圖片裡的：</strong>隱藏的元素、螢幕閱讀器專用文字、Material Symbols 圖示，以及標了
          <code>data-export-ignore</code> 的元素 —— 自己的圖表有不想匯出的按鈕時加上這個屬性即可。
          圖表要跟著外框寬度：開 <code>auto-resize</code>，外框用 <code>height</code> 決定高度。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, shallowRef } from 'vue'
import { ChptChartFrame, ChptCodeBlock, ChptSegmented, HorizontalBarChart, PieChart, StatusScatterMap } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

const defects = [
  { reason: '錫橋（短路）', count: 132 },
  { reason: '空焊', count: 98 },
  { reason: '零件偏移', count: 76 },
  { reason: '立碑（墓碑效應）', count: 41 },
  { reason: '錫珠', count: 35 },
  { reason: '極性反向', count: 22 },
  { reason: '缺件', count: 18 },
  { reason: '錫量不足', count: 12 },
]
const orderStatus = [
  { status: '生產中', count: 42 },
  { status: '待料', count: 18 },
  { status: '已完工', count: 96 },
  { status: '暫停', count: 7 },
]
const output = [
  { name: 'SMT-01', qty: 1380 },
  { name: 'SMT-02', qty: 1124 },
  { name: 'SMT-03', qty: 968 },
  { name: 'DIP-01', qty: 742 },
]

const demoState = ref('normal')
const stateOptions = [
  { label: '正常', value: 'normal' },
  { label: '載入中', value: 'loading' },
  { label: '沒有資料', value: 'empty' },
  { label: '錯誤', value: 'error' },
]

// 固定亂數種子：每次重新整理畫面都一樣
function seeded(seed) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}
const scatterPoints = shallowRef(
  (() => {
    const rand = seeded(11)
    return Array.from({ length: 20_000 }, (_, i) => {
      const r = Math.sqrt(rand()) * 100
      const a = rand() * Math.PI * 2
      const edge = r > 85
      const p = rand()
      return {
        id: `P-${i}`,
        x: r * Math.cos(a),
        y: r * Math.sin(a),
        status: edge ? (p < 0.25 ? 'FAIL' : p < 0.5 ? 'NEARFAIL' : 'PASS') : p < 0.02 ? 'FAIL' : p < 0.06 ? 'NEARFAIL' : 'PASS',
      }
    })
  })()
)

const preview = shallowRef(null)
function onExport({ blob, filename, format }) {
  if (format !== 'png' && format !== 'svg') return
  if (preview.value) URL.revokeObjectURL(preview.value.url)
  preview.value = { url: URL.createObjectURL(blob), filename, size: blob.size }
}
onBeforeUnmount(() => preview.value && URL.revokeObjectURL(preview.value.url))

const basicCode = `<ChptChartFrame
  title="本週不良原因"
  description="SMT 線 · 單位：件"
  height="18rem"
  exportable
  filename="不良原因-第46週"
  :csv-data="defects"
  :csv-columns="[{ key: 'reason', title: '不良原因' }, { key: 'count', title: '數量' }]"
>
  <HorizontalBarChart :data="defects" label-field="reason" value-field="count" auto-resize />
</ChptChartFrame>`

const statesCode = `<ChptChartFrame
  title="各線產出"
  height="16rem"
  exportable
  :loading="loading"
  :empty="!loading && !rows.length"
  :error="errorMessage"
  @retry="fetchRows"
>
  <HorizontalBarChart :data="rows" label-field="name" value-field="qty" auto-resize />
</ChptChartFrame>`

const customCode = `<!-- 不自動下載：拿到 Blob 自己處理 -->
<ChptChartFrame :exportable="['png', 'svg']" :auto-download="false" @export="upload">…</ChptChartFrame>

// 或用 ref
const blob = await frame.value.exportAs('png')

// 不用外框，直接把畫面上任一塊區域匯出
import { exportChart, downloadBlob } from '@/components/library'
downloadBlob(await exportChart(el, 'svg'), '報表.svg')`

const frameProps = [
  { name: 'title / description', type: 'string', def: "''", desc: '標題與說明（資料範圍、單位…）；會畫進匯出的圖片' },
  { name: 'height', type: 'string', def: '—', desc: '圖表區的高度（CSS 值）；圖表開 auto-resize 跟著外框' },
  { name: 'loading', type: 'boolean', def: 'false', desc: '半透明遮罩＋Spinner，舊的圖留在底下；設 aria-busy' },
  { name: 'empty / emptyText', type: 'boolean / string', def: 'false / 語系（繁中「沒有資料」）', desc: '沒有資料：以空狀態取代圖表（載入中時不顯示）' },
  { name: 'error', type: 'boolean | string', def: 'false', desc: '錯誤：true 顯示預設訊息、字串顯示該訊息；附重試鈕' },
  { name: 'exportable', type: "boolean | ('png' | 'svg' | 'csv')[]", def: 'false', desc: '匯出選單；true 為 PNG + SVG（有 csvData 時加 CSV）' },
  { name: 'filename', type: 'string', def: 'title', desc: '下載檔名（不含副檔名）；不允許的字元會換成 _' },
  { name: 'csvData / csvColumns', type: 'object[] / { key, title? }[]', def: '—', desc: 'CSV 匯出的資料與欄位；有 csvData 才出現 CSV 選項。以 = + - @ 開頭的文字會加上單引號，避免被試算表當成公式' },
  { name: 'exportScale', type: 'number', def: '2', desc: 'PNG 倍率' },
  { name: 'exportBackground', type: 'string', def: '外框底色', desc: "匯出圖片的底色；深色模式就是深底，'transparent' 為透明" },
  { name: 'autoDownload', type: 'boolean', def: 'true', desc: 'false 時只送 export 事件、不下載' },
  { name: 'ariaLabel', type: 'string', def: "''", desc: '沒有 title 時整個區塊的名稱' },
]
const frameEvents = [
  { name: 'export', params: '({ format, blob, filename })', desc: '匯出完成（自動下載時也會送）' },
  { name: 'export-error', params: '({ format, error })', desc: '匯出失敗（同時以 aria-live 告知）' },
  { name: 'retry', params: '—', desc: '錯誤狀態下按了重試' },
]
const frameSlots = [
  { name: 'default', params: '—', desc: '圖表' },
  { name: 'title', params: '—', desc: '自訂標題內容（有 title 時才出現）' },
  { name: 'actions', params: '—', desc: '右上角、匯出選單左邊的動作（不會出現在匯出圖片）' },
  { name: 'empty', params: '—', desc: '自訂空狀態' },
  { name: 'error', params: '{ message, retry }', desc: '自訂錯誤畫面' },
  { name: 'footer', params: '—', desc: '底部說明（資料來源、更新時間…）' },
]
const frameMethods = [
  { name: 'exportAs(format)', type: "(format) => Promise<Blob>", desc: '產生匯出檔，不下載' },
  { name: 'download(format)', type: "(format) => Promise<Blob>", desc: '匯出並下載（autoDownload 為 false 時只送 export 事件）' },
]
const exportUtils = [
  { name: 'exportChart(el, format, options?)', type: "(HTMLElement, 'png' | 'svg', { scale?, background?, padding? }) => Promise<Blob>", desc: '把畫面上任一塊區域匯出成圖片' },
  { name: 'elementToSvg(el, options?)', type: '(HTMLElement, options) => { svg, width, height }', desc: '轉成 SVG 字串' },
  { name: 'toCsv(rows, columns?) / csvBlob(rows, columns?)', type: '→ string / Blob', desc: 'CSV 字串（不含 BOM）/ 帶 BOM 的 Blob' },
  { name: 'downloadBlob(blob, filename)', type: '(Blob, string) => void', desc: '觸發瀏覽器下載' },
]
</script>
