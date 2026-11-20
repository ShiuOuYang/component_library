<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">DualAxisComboChart 雙軸組合圖</h1>
        <p class="text-lg text-content-secondary">
          D3 圖表：支援長條／堆疊／折線混合、左右雙 Y 軸、Brush 縮放與 Tooltip。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library/charts</code> 匯入。
        </p>
      </div>

      <!-- 基本示範 -->
      <section id="basic" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">基本示範</h2>
        <p class="text-sm text-content-secondary mb-4">
          layers 陣列定義多個圖層；每個圖層可為 bar / stacked-bar / line / area / scatter，指定左（left）或右（right）軸（省略時為左軸）。
        </p>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
            <!-- 寬度跟著欄位走：寫死 560px 會超出雙欄版面的一欄 -->
            <div style="width: 100%; height: 400px;">
              <DualAxisComboChart
                :auto-resize="true"
                :layers="demoLayers"
                title="月度銷售與利潤率"
                :show-grid="true"
                :enable-brush="true"
              />
            </div>
          </div>
          <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
            <ChptCodeBlock :code="demoCode" />
          </div>
        </div>
      </section>

      <!-- 進階範例 -->
      <section id="examples" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">進階範例</h2>
        <p class="text-sm text-content-secondary mb-4">SalesReport／ProductionMonitor／ControlChart／TimeSeries／ScatterPlot／ResponsiveDashboard／FacetedChart 等組合示範。</p>
        <SalesReportExample />
        <ProductionMonitorExample />
        <ControlChartExample />
        <TimeSeriesExample />
        <ScatterPlotExample />
        <ResponsiveDashboardExample />
        <FacetedChartExample />
        <LargeDataExample />
      </section>

      <!-- 連動高亮 -->
      <section id="highlight" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">連動高亮（highlightKey）</h2>
        <p class="text-sm text-content-secondary mb-4">
          傳入 <code>highlightKey</code>，鍵相同的點與長條會畫上標記、其餘淡化。每筆資料的鍵來自圖層的
          <code>keyFn</code>，沒有時用 X 值。滑過圖表時 <code>layer-hover</code> 會帶出同一套 <code>key</code>，
          回填 <code>highlightKey</code> 就是雙向連動 —— 試著點下方月份，或直接滑過圖表。
        </p>
        <div class="mb-3">
          <ChptSegmented v-model="highlightMonth" :options="highlightOptions" aria-label="高亮月份" />
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
            <div style="width: 100%; height: 360px;">
              <DualAxisComboChart
                :auto-resize="true"
                :layers="demoLayers"
                :highlight-key="highlightMonth || null"
                title="月度銷售與利潤率"
                @layer-hover="({ key }) => key && (highlightMonth = key)"
              />
            </div>
          </div>
          <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
            <ChptCodeBlock :code="highlightCode" />
          </div>
        </div>
        <ApiTable of="DualAxisComboChart" title="Props" :rows="highlightProps" />
      </section>

      <!-- 多張圖同步 -->
      <section id="sync" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">多張圖同步（十字線、縮放、高亮）</h2>
        <p class="text-sm text-content-secondary mb-4">
          同一條時間軸的好幾張圖上下排在一起時，用 <code>useChartSync()</code> 把它們連起來：在任一張框選或滾輪縮放，其他張縮到同一段；
          滑鼠移到任一張，每一張都在同一個時間畫十字線；滑到某個點，其他張同一個 key 的點一起標出。
          每張圖的左右 <code>margin</code> 要一樣，X 軸才會上下對齊。各圖自己的「重設縮放」鈕會收起來，改用一個整組的重設。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div class="mb-2 flex items-center justify-between gap-3">
            <p class="text-xs text-content-tertiary">爐 A-03 · 今日 08:00 起 12 小時（每 5 分鐘一筆）</p>
            <ChptButton size="xs" is-outline :disabled="!syncDomain" @click="sync.reset()">重設縮放</ChptButton>
          </div>
          <div v-for="c in syncCharts" :key="c.key" style="height: 200px">
            <DualAxisComboChart
              v-bind="sync.bind()"
              auto-resize
              :layers="c.layers"
              x-scale-type="time"
              :x-axis-format="hhmm"
              :y-left-axis-label="c.label"
              :y-left-domain="c.domain"
              :margin="syncMargin"
              brush-mode="x"
              wheel-zoom-axes="x"
              :animation-duration="0"
            />
          </div>
        </div>
        <ChptCodeBlock class="mt-4" :code="syncCode" />
        <ApiTable of="DualAxisComboChart" title="Props" :rows="syncProps" />
        <ApiTable of="DualAxisComboChart" title="Events" :rows="syncEvents" />
        <ApiTable of="-" title="useChartSync(options)" :rows="syncApi" />
      </section>

      <!-- 大量資料與縮放 API -->
      <section id="large-data-api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">大量資料與滾輪縮放</h2>
        <p class="text-sm text-content-secondary">
          10 萬筆等級的資料請用 <code>shallowRef</code> 或 <code>markRaw</code> 傳入，避免 Vue 把每一筆包成響應式代理。
          大量資料模式下折線不畫圓點；長條與散點畫在 Canvas 上，沒有個別元素的 hover 樣式，改以標記顯示指到的那一筆。
        </p>
        <p class="text-sm text-content-secondary mt-2">
          滾輪縮放像 Allegro：在繪圖區滾動時，<strong>以游標那一點為中心、X 與 Y 同時縮放</strong>（游標底下的資料點留在原地）；
          只想調一個軸時，把游標移到那一軸的刻度上再滾。放大後按住<strong>滑鼠中鍵拖曳</strong>平移，觸控板左右滑動平移 X；
          縮小與平移不受資料範圍限制（可以縮到比全覽還小、移到資料外），「重設縮放」回到全覽。
          只想縮放時間範圍、Y 不動時設 <code>wheel-zoom-axes="x"</code>；要限制在資料範圍內（全覽時滾輪交還頁面捲動）設 <code>limit-zoom-to-data</code>。
        </p>
        <ApiTable of="DualAxisComboChart" title="Props" :rows="largeDataProps" />
        <ApiTable of="DualAxisComboChart" title="Events" :rows="largeDataEvents" />
      </section>

      <!-- 完整 Props -->
      <section id="props" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">Props</h2>
        <p class="text-sm text-content-secondary mb-4">
          大量資料、滾輪縮放與連動高亮的 props 另見上方各區段。
        </p>
        <ApiTable of="DualAxisComboChart" title="尺寸與圖層 Props" :rows="baseProps" />
        <ApiTable of="DualAxisComboChart" title="座標軸 Props" :rows="axisProps" />
        <ApiTable of="DualAxisComboChart" title="外觀與互動 Props" :rows="interactionProps" />
      </section>

      <!-- 事件 -->
      <section id="events" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">事件</h2>
        <p class="text-sm text-content-secondary mb-4">
          payload 的型別都可從 <code>@/components/library</code> 以 <code>import type</code> 取得。
        </p>
        <ApiTable of="DualAxisComboChart" title="Events" :rows="allEvents" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { DualAxisComboChart, useChartSync } from '@/components/library/charts'
import { ref } from 'vue'
import { ChptButton, ChptCodeBlock, ChptSegmented } from '@/components/library'
import SalesReportExample from '../../components/docs/DualAxisChartexamples/SalesReportExample.vue'
import ProductionMonitorExample from '../../components/docs/DualAxisChartexamples/ProductionMonitorExample.vue'
import ControlChartExample from '../../components/docs/DualAxisChartexamples/ControlChartExample.vue'
import TimeSeriesExample from '../../components/docs/DualAxisChartexamples/TimeSeriesExample.vue'
import ScatterPlotExample from '../../components/docs/DualAxisChartexamples/ScatterPlotExample.vue'
import ResponsiveDashboardExample from '../../components/docs/DualAxisChartexamples/ResponsiveDashboardExample.vue'
import FacetedChartExample from '../../components/docs/DualAxisChartexamples/FacetedChartExample.vue'
import LargeDataExample from '../../components/docs/DualAxisChartexamples/LargeDataExample.vue'
import ApiTable from './components/_ApiTable.vue'

const largeDataProps = [
  { name: 'enableWheelZoom', type: 'boolean', def: 'true', desc: '滾輪縮放（像 Allegro）：在繪圖區以游標那一點為中心，X 與 Y 同時縮放；在 X 軸或左右 Y 軸的刻度上只縮放那一軸。左右滑動或 Shift + 滾輪平移 X，按住滑鼠中鍵拖曳平移 X 與 Y。已在全覽時往外滾會交還給頁面捲動' },
  { name: 'wheelZoomAxes', type: "'xy' | 'x'", def: "'xy'", desc: "繪圖區的滾輪縮放哪些軸：'xy' X 與 Y 同時；'x' 只縮放 X（Y 維持不動，只想看時間範圍時用）" },
  { name: 'limitZoomToData', type: 'boolean', def: 'false', desc: "縮小與平移限制在資料範圍內，全覽時往外滾交還給頁面捲動。預設不限制（像 Allegro，可縮到比全覽小、平移到資料外），游標在圖上時滾輪一律由圖表處理；頁面上圖表很多時可搭配 wheelZoomModifier='ctrl'。類別軸與對數軸一律限制" },
  { name: 'wheelZoomModifier', type: "'none' | 'ctrl' | 'alt'", def: "'none'", desc: "按住哪個鍵才縮放；頁面上圖表很多時可設 'ctrl'（Mac 的 ⌘ 也算）避免捲動頁面時誤觸" },
  { name: 'maxZoomScale', type: 'number', def: '10000', desc: '最大放大倍率（相對全覽範圍）' },
  { name: 'largeDataThreshold', type: 'number', def: '2000', desc: '圖層目前可見筆數超過此值時：折線依像素降採樣、散點與長條改用 Canvas；放大到低於此值自動切回 SVG' },
]
const highlightMonth = ref('Mar')
const highlightOptions = [
  { label: '無', value: '' },
  ...['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m) => ({ label: m, value: m })),
]
// ---- 多張圖同步 ----
const sync = useChartSync({ zoom: true, crosshair: true, highlight: true })
const syncDomain = sync.xDomain
const syncMargin = { top: 16, right: 24, bottom: 36, left: 72 }
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const syncSeries = (() => {
  const t0 = new Date()
  t0.setHours(8, 0, 0, 0)
  let seed = 7
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  return Array.from({ length: 145 }, (_, i) => {
    const t = new Date(t0.getTime() + i * 5 * 60_000)
    // 10:30 左右溫度飆高，壓力跟著掉、不良率上升
    const spike = Math.exp(-(((i - 30) / 4) ** 2))
    return {
      t,
      key: t.toISOString(),
      temp: 245 + Math.sin(i / 12) * 3 + spike * 18 + (rand() - 0.5) * 2,
      pressure: 1.8 - spike * 0.35 + (rand() - 0.5) * 0.04,
      defect: 0.6 + spike * 3.2 + rand() * 0.4,
    }
  })
})()
const syncLine = (field, color) => ({
  type: 'line',
  data: syncSeries,
  xValue: (d) => d.t,
  yValue: (d) => d[field],
  keyFn: (d) => d.key,
  color,
  showDots: false,
  legend: { show: false },
})
const syncCharts = [
  { key: 'temp', label: '溫度 (°C)', domain: [235, 270], layers: [syncLine('temp', 'rgb(var(--t-chart-1))')] },
  { key: 'pressure', label: '壓力 (bar)', domain: [1.3, 1.9], layers: [syncLine('pressure', 'rgb(var(--t-chart-2))')] },
  { key: 'defect', label: '不良率 (%)', domain: null, layers: [syncLine('defect', 'rgb(var(--t-chart-4))')] },
]
const syncCode = `import { useChartSync } from '@/components/library'

const sync = useChartSync({ zoom: true, crosshair: true, highlight: true })
const margin = { top: 16, right: 24, bottom: 36, left: 72 } // 每張一樣，X 軸才會對齊

<ChptButton :disabled="!sync.xDomain.value" @click="sync.reset()">重設縮放</ChptButton>
<DualAxisComboChart v-bind="sync.bind()" :layers="tempLayers" x-scale-type="time" :margin="margin" />
<DualAxisComboChart v-bind="sync.bind()" :layers="pressureLayers" x-scale-type="time" :margin="margin" />
<DualAxisComboChart v-bind="sync.bind()" :layers="defectLayers" x-scale-type="time" :margin="margin" />`
const syncProps = [
  { name: 'crosshair', type: 'boolean', def: 'false', desc: '滑鼠在繪圖區時畫垂直十字線（底下顯示 X 讀數）並送出 crosshair-move' },
  { name: 'crosshairValue', type: 'number | string | Date | null', def: 'null', desc: '外部指定十字線的 X 值（例如另一張圖的 crosshair-move）；滑鼠在本圖時以滑鼠為準。時間軸可給毫秒數' },
]
const syncEvents = [
  { name: 'crosshair-move', params: '(value: number | string | Date | null)', desc: '十字線移動：滑鼠所在的 X 值（類別軸是最近的類別）；離開繪圖區時為 null' },
]
const syncApi = [
  { name: 'options.zoom', type: 'boolean', def: 'true', desc: '同步 X 縮放（框選、滾輪、拖曳 X 軸、重設）' },
  { name: 'options.crosshair', type: 'boolean', def: 'true', desc: '同步十字線' },
  { name: 'options.highlight', type: 'boolean', def: 'false', desc: '同步高亮：提示框出現時，其他圖標出同一個 key（需要圖層 keyFn）' },
  { name: 'options.xDomain', type: 'XDomain | null', def: 'null', desc: '一開始的 X 範圍' },
  { name: 'bind()', type: '() => props', def: '—', desc: '套到每張圖：v-bind="sync.bind()"（在模板裡呼叫）' },
  { name: 'xDomain / crosshairValue / highlightKey', type: 'Ref', def: '—', desc: '目前的同步狀態；可以讀，也可以自己改（例如外部的時間區間選擇器）' },
  { name: 'reset()', type: '() => void', def: '—', desc: '回到全覽並清掉十字線與高亮' },
]

const highlightProps = [
  { name: 'highlightKey', type: 'string | number | Date | null', def: 'null', desc: '要高亮的資料鍵；對到的點與長條畫標記、其餘 SVG 元素淡化（大量資料的 Canvas 只畫標記）。換鍵只重畫標記，不會整張圖重繪' },
  { name: 'layer.keyFn', type: '(datum, index) => string', def: '—', desc: '資料鍵的來源（同時用於元素比對）；沒有時用 X 值，Date 以 ISO 字串比對。index 是目前顯示資料中的位置，縮放後會變，請由資料欄位組出鍵' },
  { name: '@layer-hover / @layer-click / @tooltip-show', type: '{ …, key }', desc: '事件多帶 key，可直接回填 highlightKey 做雙向連動' },
]
const highlightCode = `const layers = [
  { type: 'stacked-bar', data: orders, stackKeys: ['online', 'offline'],
    xValue: d => d.month, keyFn: d => d.month },
  { type: 'line', data: profits, yAxis: 'right',
    xValue: d => d.month, yValue: d => d.profit, keyFn: d => d.month },
]
const highlight = ref(null)   // 例如表格滑過的那一列

<DualAxisComboChart
  :layers="layers"
  :highlight-key="highlight"
  @layer-hover="({ key }) => (highlight = key)"
/>`

const baseProps = [
  { name: 'layers', type: 'ChartLayer[]', def: '—', desc: '圖層陣列（必填）。可疊多個圖層（長條、堆疊長條、折線、面積、散點、參考線），各自帶資料、取值函式與 yAxis（左／右）' },
  { name: 'width / height', type: 'number', def: '800 / 500', desc: '圖表尺寸（px）；autoResize 時改由容器決定' },
  { name: 'autoResize', type: 'boolean', def: 'false', desc: '跟著容器大小重畫（容器需有高度）' },
  { name: 'debounceDelay', type: 'number', def: '150', desc: 'autoResize 的重畫延遲（ms）' },
  { name: 'margin', type: 'ChartMargin', def: '{ top: 60, right: 80, bottom: 60, left: 80 }', desc: '繪圖區四周留白（放座標軸、標題與圖例）' },
  { name: 'title', type: 'string', def: "''", desc: '圖表標題' },
  { name: 'triggerLines', type: 'TriggerLine[]', def: '[]', desc: '參考線，例如規格上下限或良率門檻' },
]

const axisProps = [
  { name: 'xScaleType', type: "'band' | 'linear' | 'log' | 'sqrt' | 'time' | 'symlog'", def: "'band'", desc: 'X 軸比例尺；band 為類別，time 為時間序列' },
  { name: 'xDomain', type: 'XDomain | null', def: 'null', desc: 'X 軸範圍；null 依資料決定。這是預設視窗，縮放仍可超出' },
  { name: 'xAxisLabel / xAxisFormat', type: 'string / (v) => string', def: "'' / null", desc: 'X 軸標題與刻度格式' },
  { name: 'xAxisLabelRotate', type: 'number', def: '0', desc: 'X 軸刻度文字旋轉角度（度），類別名稱長時使用' },
  { name: 'yLeftScaleType / yRightScaleType', type: "'linear' | 'log' | 'sqrt' | 'time' | 'symlog'", def: "'linear'", desc: '左／右 Y 軸比例尺' },
  { name: 'yLeftDomain / yRightDomain', type: '[number, number] | null', def: 'null', desc: '左／右 Y 軸範圍；null 依資料決定（並取整）。縮放仍可超出' },
  { name: 'yLeftAxisLabel / yRightAxisLabel', type: 'string', def: "''", desc: '左／右 Y 軸標題' },
  { name: 'yLeftAxisFormat / yRightAxisFormat', type: '(v: number) => string', def: 'null', desc: '左／右 Y 軸刻度格式' },
]

const interactionProps = [
  { name: 'showGrid', type: 'boolean', def: 'true', desc: '背景格線' },
  { name: 'animationDuration', type: 'number', def: '750', desc: '轉場動畫時間（ms）；0 關閉' },
  { name: 'enableBrush / brushMode', type: "boolean / 'x' | 'xy' | 'none'", def: "true / 'xy'", desc: '框選縮放；x 只選 X 範圍、xy 同時選左右 Y 軸' },
  { name: 'enableAxisDrag', type: 'boolean', def: 'true', desc: '拖曳座標軸平移' },
  { name: 'showResetButton', type: 'boolean', def: 'true', desc: '縮放後在右上角顯示「重設縮放」' },
]

const allEvents = [
  { name: 'layer-click / layer-hover', type: 'ChartLayerEvent', desc: '點擊／滑過資料元素：{ data, layer, seriesKey?, key? }（參考線沒有 key）' },
  { name: 'tooltip-show / tooltip-hide', type: 'TooltipPayload / —', desc: '提示框顯示（含滑鼠位置 position）與隱藏' },
  { name: 'selection-change', type: 'ChartSelectionEvent', desc: 'Brush 框選結束：{ xDomain, yLeftDomain, yRightDomain, mode }；x 模式時 Y 軸為 null' },
  { name: 'axis-drag / wheel-zoom', type: 'ChartAxisDomainEvent', desc: '拖曳座標軸或中鍵拖曳平移（axis-drag）、滾輪縮放（wheel-zoom）後：{ axis, domain }；繪圖區的滾輪會依序送 X、左 Y、右 Y 各一次；wheel-zoom 的 domain 為 null 代表回到全覽' },
  { name: 'zoom-reset', type: '—', desc: '按「重設縮放」' },
  { name: 'chart-ready', type: 'ChartReadyEvent', desc: '首次掛載完成：{ scales, dimensions }' },
  { name: 'chart-resize', type: 'ChartResizeEvent', desc: 'autoResize 量到新尺寸：{ width, height, chartWidth, chartHeight }' },
]

const largeDataEvents = [
  { name: 'wheel-zoom', type: "{ axis: 'x' | 'yLeft' | 'yRight', domain }", desc: '滾輪縮放或平移後送出（繪圖區的滾輪依序送 X、左 Y、右 Y）；domain 為 null 代表回到全覽' },
]

const demoLayers = [
  {
    type: 'stacked-bar',
    data: [
      { month: 'Jan', online: 120, offline: 80 },
      { month: 'Feb', online: 150, offline: 90 },
      { month: 'Mar', online: 180, offline: 100 },
      { month: 'Apr', online: 200, offline: 110 },
      { month: 'May', online: 170, offline: 95 },
      { month: 'Jun', online: 220, offline: 120 },
    ],
    yAxis: 'left',
    stackKeys: ['online', 'offline'],
    xValue: (d) => d.month,
    colorScale: (key) => (key === 'online' ? '#3b82f6' : '#1f4e5c'),
    legend: { show: true },
  },
  {
    type: 'line',
    data: [
      { month: 'Jan', profit: 25 },
      { month: 'Feb', profit: 28 },
      { month: 'Mar', profit: 32 },
      { month: 'Apr', profit: 35 },
      { month: 'May', profit: 30 },
      { month: 'Jun', profit: 38 },
    ],
    yAxis: 'right',
    xValue: (d) => d.month,
    yValue: (d) => d.profit,
    lineColor: '#eab308',
    strokeWidth: 3,
    showDots: true,
    legend: { show: true, label: '利潤率 (%)' },
  },
]

const demoCode = `const layers = [
  {
    type: 'stacked-bar', data: rows, yAxis: 'left',
    stackKeys: ['online', 'offline'], xValue: d => d.month,
    colorScale: key => key === 'online' ? '#3b82f6' : '#1f4e5c'
  },
  {
    type: 'line', data: rows2, yAxis: 'right',
    xValue: d => d.month, yValue: d => d.profit,
    lineColor: '#eab308', strokeWidth: 3, showDots: true
  }
];
<DualAxisComboChart :layers="layers" title="月度分析" />`
</script>
