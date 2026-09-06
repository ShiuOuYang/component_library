<template>
  <div class="min-h-screen bg-neutral-50 p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-neutral-900 mb-2">DualAxisComboChart 雙軸組合圖</h1>
        <p class="text-lg text-neutral-600">
          D3 圖表：支援長條／堆疊／折線混合、左右雙 Y 軸、Brush 縮放與 Tooltip。
          請由 <code class="bg-neutral-100 px-1.5 py-0.5 rounded text-sm">@/components/library/charts</code> 匯入。
        </p>
      </div>

      <!-- 基本示範 -->
      <section class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-2">基本示範</h2>
        <p class="text-sm text-neutral-600 mb-4">
          layers 陣列定義多個圖層；每個圖層可為 stacked-bar / line，指定左（left）或右（right）軸。
        </p>
        <div class="grid lg:grid-cols-2 gap-6">
          <div class="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
            <DualAxisComboChart
              :width="560"
              :height="400"
              :layers="demoLayers"
              title="月度銷售與利潤率"
              :show-grid="true"
              :enable-brush="true"
            />
          </div>
          <div class="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
            <ChptCodeBlock :code="demoCode" />
          </div>
        </div>
      </section>

      <!-- 進階範例 -->
      <section class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-2">進階範例</h2>
        <p class="text-sm text-neutral-600 mb-4">SalesReport／ProductionMonitor／ControlChart／TimeSeries／ScatterPlot／ResponsiveDashboard／FacetedChart 等組合示範。</p>
        <SalesReportExample />
        <ProductionMonitorExample />
        <ControlChartExample />
        <TimeSeriesExample />
        <ScatterPlotExample />
        <ResponsiveDashboardExample />
        <FacetedChartExample />
      </section>
    </div>
  </div>
</template>

<script setup>
import { DualAxisComboChart } from '@/components/library/charts'
import { ChptCodeBlock } from '@/components/library'
import SalesReportExample from '../../components/docs/DualAxisChartexamples/SalesReportExample.vue'
import ProductionMonitorExample from '../../components/docs/DualAxisChartexamples/ProductionMonitorExample.vue'
import ControlChartExample from '../../components/docs/DualAxisChartexamples/ControlChartExample.vue'
import TimeSeriesExample from '../../components/docs/DualAxisChartexamples/TimeSeriesExample.vue'
import ScatterPlotExample from '../../components/docs/DualAxisChartexamples/ScatterPlotExample.vue'
import ResponsiveDashboardExample from '../../components/docs/DualAxisChartexamples/ResponsiveDashboardExample.vue'
import FacetedChartExample from '../../components/docs/DualAxisChartexamples/FacetedChartExample.vue'

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
