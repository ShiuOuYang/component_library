<template>
  <div class="min-h-screen bg-surface-secondary p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">DualAxisComboChart 雙軸組合圖</h1>
        <p class="text-lg text-content-secondary">
          D3 圖表：支援長條／堆疊／折線混合、左右雙 Y 軸、Brush 縮放與 Tooltip。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library/charts</code> 匯入。
        </p>
      </div>

      <!-- 基本示範 -->
      <section id="basic" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">基本示範</h2>
        <p class="text-sm text-content-secondary mb-4">
          layers 陣列定義多個圖層；每個圖層可為 bar / stacked-bar / line / area / scatter，指定左（left）或右（right）軸（省略時為左軸）。
        </p>
        <div class="grid lg:grid-cols-2 gap-6">
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
      <section id="examples" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
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
      <section id="highlight" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">連動高亮（highlightKey）</h2>
        <p class="text-sm text-content-secondary mb-4">
          傳入 <code>highlightKey</code>，鍵相同的點與長條會畫上標記、其餘淡化。每筆資料的鍵來自圖層的
          <code>keyFn</code>，沒有時用 X 值。滑過圖表時 <code>layer-hover</code> 會帶出同一套 <code>key</code>，
          回填 <code>highlightKey</code> 就是雙向連動 —— 試著點下方月份，或直接滑過圖表。
        </p>
        <div class="mb-3">
          <ChptSegmented v-model="highlightMonth" :options="highlightOptions" aria-label="高亮月份" />
        </div>
        <div class="grid lg:grid-cols-2 gap-6">
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

      <!-- 大量資料與縮放 API -->
      <section id="large-data-api" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">大量資料與滾輪縮放</h2>
        <p class="text-sm text-content-secondary">
          10 萬筆等級的資料請用 <code>shallowRef</code> 或 <code>markRaw</code> 傳入，避免 Vue 把每一筆包成響應式代理。
          大量資料模式下折線不畫圓點；長條與散點畫在 Canvas 上，沒有個別元素的 hover 樣式，改以標記顯示指到的那一筆。
        </p>
        <ApiTable of="DualAxisComboChart" title="Props" :rows="largeDataProps" />
        <ApiTable of="DualAxisComboChart" title="Events" :rows="largeDataEvents" />
      </section>

      <!-- 完整 Props -->
      <section id="props" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">Props</h2>
        <p class="text-sm text-content-secondary mb-4">
          大量資料、滾輪縮放與連動高亮的 props 另見上方各區段。
        </p>
        <ApiTable of="DualAxisComboChart" title="尺寸與圖層 Props" :rows="baseProps" />
        <ApiTable of="DualAxisComboChart" title="座標軸 Props" :rows="axisProps" />
        <ApiTable of="DualAxisComboChart" title="外觀與互動 Props" :rows="interactionProps" />
      </section>

      <!-- 事件 -->
      <section id="events" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
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
import { DualAxisComboChart } from '@/components/library/charts'
import { ref } from 'vue'
import { ChptCodeBlock, ChptSegmented } from '@/components/library'
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
  { name: 'enableWheelZoom', type: 'boolean', def: 'true', desc: '滾輪縮放：繪圖區縮放 X 軸（以游標為中心）、左右 Y 軸上縮放該軸；左右滑動或 Shift + 滾輪平移。已在全覽時往外滾會交還給頁面捲動' },
  { name: 'wheelZoomModifier', type: "'none' | 'ctrl' | 'alt'", def: "'none'", desc: "按住哪個鍵才縮放；頁面上圖表很多時可設 'ctrl'（Mac 的 ⌘ 也算）避免捲動頁面時誤觸" },
  { name: 'maxZoomScale', type: 'number', def: '10000', desc: '最大放大倍率（相對全覽範圍）' },
  { name: 'largeDataThreshold', type: 'number', def: '2000', desc: '圖層目前可見筆數超過此值時：折線依像素降採樣、散點與長條改用 Canvas；放大到低於此值自動切回 SVG' },
]
const highlightMonth = ref('Mar')
const highlightOptions = [
  { label: '無', value: '' },
  ...['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m) => ({ label: m, value: m })),
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
  { name: 'axis-drag / wheel-zoom', type: 'ChartAxisDomainEvent', desc: '拖曳座標軸、滾輪縮放後：{ axis, domain }；wheel-zoom 的 domain 為 null 代表回到全覽' },
  { name: 'zoom-reset', type: '—', desc: '按「重設縮放」' },
  { name: 'chart-ready', type: 'ChartReadyEvent', desc: '首次掛載完成：{ scales, dimensions }' },
  { name: 'chart-resize', type: 'ChartResizeEvent', desc: 'autoResize 量到新尺寸：{ width, height, chartWidth, chartHeight }' },
]

const largeDataEvents = [
  { name: 'wheel-zoom', type: "{ axis: 'x' | 'yLeft' | 'yRight', domain }", desc: '滾輪縮放或平移後送出；domain 為 null 代表回到全覽' },
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
