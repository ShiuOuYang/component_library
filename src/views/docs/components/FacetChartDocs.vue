<template>
  <div class="w-full px-8 py-12">
    <div class="mb-10">
      <h1 class="text-4xl font-bold text-content-primary mb-3">分面圖</h1>
      <p class="text-lg text-content-secondary">
        把同一組資料依某個維度切成多張小圖並排比較：FacetedChart（上下堆疊、共用 X 軸）與 GridFacetChart（二維網格）。
      </p>
    </div>

    <!-- ============ FacetedChart ============ -->
    <section id="faceted-chart" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">FacetedChart 垂直分面</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>同一段時間的多個指標上下對照（產量、良率、停機時間）。所有分面共用 X 軸，
        框選縮放會同步；滑鼠移動時每個分面在同一個時間點畫一條十字線，一眼看出「良率掉下來的那天，停機是不是也變多」。
      </p>

      <div class="mb-3 flex flex-wrap items-center gap-4">
        <ChptSwitch v-model="facetOpts.sharedLegend" label="共用圖例" />
        <ChptSwitch v-model="facetOpts.crosshair" label="同步十字線" />
        <ChptSegmented v-model="facetOpts.labelPosition" :options="[{ label: '標題在左', value: 'left' }, { label: '標題在上', value: 'top' }]" aria-label="分面標題位置" size="xs" />
      </div>
      <div class="overflow-x-auto rounded-lg border border-stroke-light">
        <FacetedChart
          :key="`${facetOpts.labelPosition}`"
          :facets="lineFacets"
          :width="960"
          :total-height="560"
          title="SMT-01 近 30 天"
          x-scale-type="time"
          :x-axis-format="formatDay"
          :x-axis-label-rotate="0"
          :shared-legend="facetOpts.sharedLegend"
          :crosshair="facetOpts.crosshair"
          :facet-label-position="facetOpts.labelPosition"
        />
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="facetedSample" />
      </div>
      <ApiTable of="FacetedChart" title="Props（新增）" :rows="facetedProps" />
      <ApiTable of="FacetedChart" title="其他 Props" :rows="facetedBaseProps" />
      <ApiTable of="FacetedChart" title="Events" :rows="facetedEvents" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>共用圖例點一下會在<em>每個分面</em>同時隱藏該系列（色塊變空心並加刪除線，不只靠顏色表示）；
        各分面自己的圖例會自動關掉。預設 tooltip 會顯示「被滑到的那個圖層」的值，並依左右軸各自的格式化函式顯示。
      </p>
    </section>

    <!-- ============ GridFacetChart ============ -->
    <section id="grid-facet-chart" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">GridFacetChart 網格分面</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>兩個維度交叉比較（廠區 × 產線、機台 × 班別）。每一格是一張小圖，表頭在上方與左側。
      </p>

      <div class="mb-3 flex flex-wrap items-center gap-4">
        <span class="text-sm text-content-secondary">座標範圍</span>
        <ChptSegmented v-model="gridOpts.scales" :options="scaleOptions" aria-label="座標範圍" size="xs" />
        <ChptSwitch v-model="gridOpts.sharedLegend" label="共用圖例" />
      </div>
      <p class="mb-3 text-xs text-content-tertiary">
        切到 fixed 看看：FAB-B 的產量明顯比較高 —— free 模式下每格各自縮放，四張圖看起來差不多高，比較時容易誤判。
      </p>
      <div class="overflow-x-auto rounded-lg border border-stroke-light">
        <GridFacetChart
          :data="gridData"
          x-facet-var="site"
          y-facet-var="line"
          x-facet-label="廠區"
          y-facet-label="產線"
          :width="960"
          :height="560"
          :auto-resize="false"
          title="各廠各線週產量"
          x-scale-type="band"
          :x-axis-label-rotate="0"
          :scales="gridOpts.scales"
          :shared-legend="gridOpts.sharedLegend"
          :enable-brush="false"
        />
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="gridSample" />
      </div>
      <ApiTable of="GridFacetChart" title="Props（新增 / 變更）" :rows="gridProps" />
      <ApiTable of="GridFacetChart" title="其他 Props" :rows="gridBaseProps" />
      <ApiTable of="GridFacetChart" title="Events" :rows="gridEvents" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>修正：</strong>title 原本不會顯示（模板被註解掉）；有負值的長條原本會被左軸裁掉、全負值時軸會倒過來；
        框選同步模式下原本忽略每格自己的 domain；預設 tooltip 原本用 absolute 定位視窗座標，圖表不在頁面左上角時會離游標很遠。
      </p>
    </section>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { FacetedChart, GridFacetChart, ChptSwitch, ChptSegmented, ChptCodeBlock } from '@/components/library'
import ApiTable from './_ApiTable.vue'

// 固定亂數：每次開文檔看到的圖一樣
function rng(seed) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) / 2147483647)
}

// ---- FacetedChart ----
const facetOpts = reactive({ sharedLegend: true, crosshair: true, labelPosition: 'left' })
const rand = rng(42)
const start = new Date(2026, 7, 30)
const days = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
  const dip = i === 17 || i === 18
  return {
    date,
    output: Math.round(4200 + rand() * 900 - (dip ? 1500 : 0)),
    yield: +(97.2 + rand() * 1.6 - (dip ? 3.4 : 0)).toFixed(2),
    defects: Math.round(20 + rand() * 25 + (dip ? 90 : 0)),
    downtime: Math.round(rand() * 25 + (dip ? 140 : 0)),
  }
})
const formatDay = (d) => `${d.getMonth() + 1}/${d.getDate()}`

const lineFacets = [
  {
    id: 'output',
    title: '產量與良率',
    height: 2,
    yLeftAxisFormat: (v) => v.toLocaleString(),
    yRightAxisFormat: (v) => `${v}%`,
    yRightDomain: [92, 100],
    layers: [
      { type: 'bar', name: '產量', color: '#3b82f6', data: days, yAxis: 'left', xValue: (d) => d.date, yValue: (d) => d.output },
      { type: 'line', legend: { label: '良率' }, lineColor: '#16a34a', strokeWidth: 2, showDots: true, data: days, yAxis: 'right', xValue: (d) => d.date, yValue: (d) => d.yield },
    ],
    triggerLines: [{ value: 96, yAxis: 'right', label: '良率目標 96%', color: '#dc2626', strokeDasharray: '4,4' }],
  },
  {
    id: 'defects',
    title: '不良數',
    height: 1,
    layers: [{ type: 'line', legend: { label: '不良數' }, lineColor: '#f97316', strokeWidth: 2, data: days, yAxis: 'left', xValue: (d) => d.date, yValue: (d) => d.defects }],
  },
  {
    id: 'downtime',
    title: '停機時間（分）',
    height: 1,
    layers: [{ type: 'bar', name: '停機時間', color: '#a855f7', data: days, yAxis: 'left', xValue: (d) => d.date, yValue: (d) => d.downtime }],
  },
]

const facetedSample = `<FacetedChart
  :facets="facets"
  x-scale-type="time"
  shared-legend
  crosshair
  facet-label-position="left"
/>

const facets = [
  { id: 'output', title: '產量與良率', height: 2, layers: [
    { type: 'bar', name: '產量', data, xValue: d => d.date, yValue: d => d.output },
    { type: 'line', legend: { label: '良率' }, yAxis: 'right', data, xValue: d => d.date, yValue: d => d.yield },
  ] },
  // height 要「全部」指定才是權重；只給一部分會被當成固定像素
  { id: 'defects', title: '不良數', height: 1, layers: [...] },
]`
const facetedProps = [
  { name: 'crosshair', type: 'boolean', def: 'true', desc: '同步十字線：所有分面在滑鼠所在的 X 位置畫一條線，並顯示 X 讀數' },
  { name: 'sharedLegend', type: 'boolean', def: 'false', desc: '所有分面共用一份圖例；點選在每個分面同時隱藏 / 顯示該系列' },
  { name: 'facetLabelPosition', type: "'left' | 'top'", def: "'left'", desc: '分面標題旋轉放左側，或放在圖表上方（長標題用）' },
  { name: 'facets[].height', type: 'number', def: '—', desc: '全部指定時當作權重（上例產量那格是其他格的兩倍高）' },
]

const facetedBaseProps = [
  { name: 'facets', type: 'VerticalFacet[]', def: '—', desc: '垂直堆疊的分面（必填），共用同一條 X 軸；每個分面有 id、title、layers，以及自己的 Y 軸設定與參考線' },
  { name: 'title', type: 'string', def: "''", desc: '整張圖的標題' },
  { name: 'width / totalHeight', type: 'number', def: '1200 / 800', desc: '寬度與所有分面加總的高度（px）；autoResize 時寬度跟著容器' },
  { name: 'autoResize', type: 'boolean', def: 'false', desc: '跟著容器大小重畫' },
  { name: 'margin', type: 'ChartMargin', def: '{ top: 40, right: 80, bottom: 40, left: 80 }', desc: '外框四周留白' },
  { name: 'facetSpacing', type: 'number', def: '10', desc: '分面之間的間距（px）' },
  { name: 'lastFacetExtraHeight', type: 'number', def: '50', desc: '最後一個分面多留的高度（只有它畫 X 軸刻度）' },
  { name: 'xScaleType / xDomain', type: 'XScaleType / XDomain | null', def: "'time' / null", desc: '共用 X 軸的比例尺與範圍' },
  { name: 'xAxisFormat / xAxisLabelRotate', type: '(v) => string / number', def: 'null / -45', desc: 'X 軸刻度格式與旋轉角度' },
  { name: 'enableBrush / brushMode', type: "boolean / 'x' | 'xy' | 'none'", def: "true / 'x'", desc: '框選縮放' },
  { name: 'syncBrush', type: 'boolean', def: 'true', desc: '框選、拖曳、滾輪縮放 X 軸時同步到所有分面' },
  { name: 'enableAxisDragging', type: 'boolean', def: 'false', desc: '拖曳座標軸平移' },
  { name: 'enableWheelZoom', type: 'boolean', def: 'false', desc: '滾輪縮放 X 軸；預設關閉，分面圖通常很高，滾輪應該捲動頁面' },
  { name: 'showResetButton', type: 'boolean', def: 'true', desc: '縮放後顯示「重設縮放」' },
]
const facetedEvents = [
  { name: 'selection-change', params: 'ChartSelectionEvent & { facetId }', desc: '某個分面框選結束' },
  { name: 'axis-drag / wheel-zoom', params: 'ChartAxisDomainEvent & { facetId }', desc: '拖曳座標軸、滾輪縮放；wheel-zoom 的 domain 為 null 代表回到全覽' },
  { name: 'zoom-reset', params: '—', desc: '按「重設縮放」' },
  { name: 'chart-resize', params: '{ width, height }', desc: 'autoResize 量到新尺寸' },
]

// ---- GridFacetChart ----
const gridOpts = reactive({ scales: 'fixed', sharedLegend: true })
const scaleOptions = [
  { label: 'fixed', value: 'fixed' },
  { label: 'free', value: 'free' },
  { label: 'free_x', value: 'free_x' },
  { label: 'free_y', value: 'free_y' },
]
const weeks = ['W36', 'W37', 'W38', 'W39']
const r2 = rng(7)
function weekly(base) {
  return weeks.map((week) => ({ week, good: Math.round(base * (0.9 + r2() * 0.2)), ng: Math.round(base * 0.03 * (0.5 + r2())) }))
}
const colorScale = (key) => (key === 'good' ? '#3b82f6' : '#f97316')
function cell(site, line, base) {
  const data = weekly(base)
  return {
    site,
    line,
    layers: [
      { type: 'stacked-bar', stackKeys: ['good', 'ng'], colorScale, data, yAxis: 'left', xValue: (d) => d.week },
    ],
  }
}
const gridData = [cell('FAB-A', 'L1', 1800), cell('FAB-B', 'L1', 5200), cell('FAB-A', 'L2', 1500), cell('FAB-B', 'L2', 4700)]

const gridSample = `<GridFacetChart
  :data="cells"
  x-facet-var="site"  x-facet-label="廠區"
  y-facet-var="line"  y-facet-label="產線"
  title="各廠各線週產量"
  scales="fixed"
  shared-legend
/>

// 每一格一筆：用 site / line 決定位置
const cells = [
  { site: 'FAB-A', line: 'L1', layers: [{ type: 'stacked-bar', stackKeys: ['good', 'ng'], data, xValue: d => d.week }] },
  { site: 'FAB-B', line: 'L1', layers: [...] },
]`
const gridBaseProps = [
  { name: 'data', type: 'GridFacetDatum[]', def: '—', desc: '每筆一格（必填）：含 xFacetVar / yFacetVar 指定的欄位與該格的 layers' },
  { name: 'xFacetVar / yFacetVar', type: 'string', def: '—', desc: '決定欄、列的欄位名稱（必填），例如 region / product' },
  { name: 'width / height', type: 'number', def: '1200 / 800', desc: '圖表尺寸（px）；autoResize 時跟著容器' },
  { name: 'autoResize', type: 'boolean', def: 'true', desc: '跟著容器大小重畫' },
  { name: 'headerHeight / headerWidth', type: 'number', def: '40 / 80', desc: '欄表頭高度、列表頭寬度（px）' },
  { name: 'xScaleType', type: 'XScaleType', def: "'time'", desc: 'X 軸比例尺' },
  { name: 'xAxisFormat / xAxisLabelRotate', type: '(v) => string / number', def: 'null / -45', desc: 'X 軸刻度格式與旋轉角度' },
  { name: 'showGrid', type: 'boolean', def: 'true', desc: '背景格線' },
  { name: 'enableBrush / brushMode', type: "boolean / 'x' | 'xy' | 'none'", def: "true / 'xy'", desc: '框選縮放' },
  { name: 'syncMode', type: "'all' | 'row' | 'col' | 'both' | 'none'", def: "'both'", desc: '框選後怎麼同步：全部、同列共用 Y、同欄共用 X、兩者、或各自獨立' },
  { name: 'enableAxisDrag', type: 'boolean', def: 'false', desc: '拖曳座標軸平移' },
  { name: 'enableWheelZoom', type: 'boolean', def: 'false', desc: '滾輪縮放（各格獨立）；預設關閉，滾輪預設捲動頁面' },
  { name: 'showResetButton', type: 'boolean', def: 'true', desc: '縮放後顯示「重設縮放」' },
]
const gridEvents = [
  { name: 'selection-change', params: 'ChartSelectionEvent & GridFacetCell', desc: '某一格框選結束，帶出 facetId、row、col' },
  { name: 'axis-drag', params: 'ChartAxisDomainEvent & GridFacetCell', desc: '某一格拖曳座標軸' },
  { name: 'zoom-reset', params: '—', desc: '按「重設縮放」' },
  { name: 'chart-resize', params: '{ width, height }', desc: 'autoResize 量到新尺寸' },
]

const gridProps = [
  { name: 'scales', type: "'free' | 'fixed' | 'free_x' | 'free_y'", def: "'free'", desc: '各格座標範圍：fixed 全部共用（互相比大小時用）；free 各自縮放（看形狀時用）' },
  { name: 'sharedLegend', type: 'boolean', def: 'false', desc: '圖例放在標題列右側，所有格共用；點選同時隱藏 / 顯示' },
  { name: 'title', type: 'string', def: "''", desc: '標題列（原本不會顯示，已修正）' },
  { name: 'xFacetLabel / yFacetLabel', type: 'string', def: "''（原本是 'X Facet'）", desc: '有給時表頭顯示「標籤：值」，否則只顯示值' },
]
</script>
