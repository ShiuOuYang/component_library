<template>
  <div class="mt-8">
    <h3 class="text-2xl font-semibold text-content-primary mb-4">範例 G：分面圖（Faceted Chart）</h3>
    <p class="text-content-secondary mb-4">
      以 <span class="font-semibold text-accent">FacetedChart</span> 同時比較多個分面，
      每個分面皆可獨立設定其 Y 軸比例尺、領域與圖層。
    </p>

    <div class="grid lg:grid-cols-2 gap-6">
      <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
        <!--
          寬度跟著欄位走（原本寫死 600px，比雙欄版面的一欄寬）。
          X 軸是月份名稱，要用 band；FacetedChart 預設 time，原本整張圖畫不出任何長條
        -->
        <div style="width: 100%; height: 500px;">
          <FacetedChart :facets="facets" x-scale-type="band" auto-resize title="區域銷售分面" />
        </div>
      </div>

      <CodeBlock
        language="javascript"
        :code="facetCodeExample"
      />
    </div>
  </div>
</template>

<script setup>
import FacetedChart from '@/components/library/charts/FacetedChart.vue';
import CodeBlock from '@/components/library/ui/CodeBlock.vue';

const northData = [
  { month: 'Jan', online: 120, offline: 70, profit: 26 },
  { month: 'Feb', online: 145, offline: 85, profit: 29 },
  { month: 'Mar', online: 165, offline: 95, profit: 31 },
  { month: 'Apr', online: 190, offline: 105, profit: 34 },
  { month: 'May', online: 175, offline: 90, profit: 30 },
  { month: 'Jun', online: 205, offline: 115, profit: 36 },
];

const southData = [
  { month: 'Jan', online: 90, offline: 60, profit: 22 },
  { month: 'Feb', online: 110, offline: 72, profit: 24 },
  { month: 'Mar', online: 130, offline: 88, profit: 27 },
  { month: 'Apr', online: 150, offline: 96, profit: 30 },
  { month: 'May', online: 140, offline: 84, profit: 28 },
  { month: 'Jun', online: 175, offline: 108, profit: 33 },
];

const facets = [
  {
    id: 'north',
    title: '北區',
    layers: [
      {
        type: 'stacked-bar',
        data: northData,
        yAxis: 'left',
        stackKeys: ['online', 'offline'],
        xValue: (d) => d.month,
        colorScale: (key) => (key === 'online' ? '#3b82f6' : '#1f4e5c'),
        legend: { show: true },
      },
      {
        type: 'line',
        data: northData,
        yAxis: 'right',
        xValue: (d) => d.month,
        yValue: (d) => d.profit,
        lineColor: '#eab308',
        strokeWidth: 3,
        showDots: true,
        legend: { show: true, label: '利潤率 (%)' },
      },
    ],
  },
  {
    id: 'south',
    title: '南區',
    layers: [
      {
        type: 'stacked-bar',
        data: southData,
        yAxis: 'left',
        stackKeys: ['online', 'offline'],
        xValue: (d) => d.month,
        colorScale: (key) => (key === 'online' ? '#3b82f6' : '#1f4e5c'),
        legend: { show: true },
      },
      {
        type: 'line',
        data: southData,
        yAxis: 'right',
        xValue: (d) => d.month,
        yValue: (d) => d.profit,
        lineColor: '#eab308',
        strokeWidth: 3,
        showDots: true,
        legend: { show: true, label: '利潤率 (%)' },
      },
    ],
  },
];

const facetCodeExample = `const facets = [
  {
    id: 'north',
    title: '北區',
    layers: [
      {
        type: 'stacked-bar',
        data: northData,
        yAxis: 'left',
        stackKeys: ['online', 'offline'],
        xValue: (d) => d.month,
        colorScale: (key) => key === 'online' ? '#3b82f6' : '#1f4e5c',
        legend: { show: true }
      },
      { type: 'line', data: northData, yAxis: 'right',
        xValue: (d) => d.month, yValue: (d) => d.profit,
        lineColor: '#eab308', strokeWidth: 3, showDots: true }
    ]
  }
  // ... 更多分面
];

<FacetedChart :facets="facets" x-scale-type="band" title="區域銷售分面" />`;
</script>
