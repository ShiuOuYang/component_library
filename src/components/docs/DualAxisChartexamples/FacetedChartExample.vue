<template>
  <div class="mt-8">
    <h3 class="text-2xl font-semibold text-gray-800 mb-4">範例 G：分面圖表（多 Y 軸垂直堆疊）</h3>
    <p class="text-gray-600 mb-4">
      使用 <span class="font-semibold text-indigo-600">FacetedChart</span> 組件將多個不同 Y 軸的圖表垂直堆疊，
      適合<span class="font-semibold">良率分析</span>、<span class="font-semibold">多站點監控</span>等場景。
      所有分面共享 X 軸，並支援<span class="font-semibold text-green-600">同步縮放</span>功能。
    </p>
    
    <div class="grid lg:grid-cols-2 gap-6">
      <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div style="width: 100%; height: 600px;">
          <FacetedChart
            :facets="facetedData"
            :auto-resize="true"
            title="良率分析 - 分面圖"
            x-scale-type="time"
            :x-axis-format="d3.timeFormat('%m/%d')"
            :enable-brush="true"
            brush-mode="x"
            :sync-brush="true"
            enable-axis-dragging="true"
          />
        </div>
      </div>
      
      <CodeBlock
        language="vue"
        tip-type="info"
        tip="• 良率分析：多個製程站點的良率趨勢<br>• 多指標監控：同時觀察多個 KPI<br>• 對比分析：不同產品線、區域的數據對比<br>• 同步縮放：框選時所有分面同步更新範圍"
        tip-title="使用場景"
        :code="facetedCodeExample"
      />
    </div>
  </div>
</template>

<script setup>
import FacetedChart from '../../common/FacetedChart.vue';
import CodeBlock from '../../common/CodeBlock.vue';
import * as d3 from 'd3';

// 模擬不同站點的良率數據
const facetRawData = [
  { date: '2024-01-12', core: 87.8, bu: 88.6, osr: 91.5, bdh: 94.2, fi: 91.2, bump: 93.5 },
  { date: '2024-01-20', core: 89.2, bu: 87.9, osr: 91.8, bdh: 92.1, fi: 89.8, bump: 87.2 },
  { date: '2024-02-03', core: 86.5, bu: 88.1, osr: 91.0, bdh: 93.8, fi: 90.5, bump: 87.8 },
  { date: '2024-02-12', core: 90.1, bu: 89.2, osr: 88.0, bdh: 90.2, fi: 92.8, bump: 90.3 },
  { date: '2024-03-01', core: 88.8, bu: 86.5, osr: 92.5, bdh: 93.2, fi: 86.5, bump: 93.8 },
  { date: '2024-03-12', core: 93.2, bu: 89.6, osr: 89.8, bdh: 88.3, fi: 87.2, bump: 86.8 },
  { date: '2024-04-12', core: 89.5, bu: 92.1, osr: 93.2, bdh: 86.2, fi: 90.8, bump: 87.5 },
  { date: '2024-04-20', core: 93.8, bu: 86.5, osr: 91.8, bdh: 94.2, fi: 86.5, bump: 86.8 },
  { date: '2024-05-05', core: 86.2, bu: 88.8, osr: 94.2, bdh: 88.5, fi: 90.2, bump: 90.8 },
  { date: '2024-05-15', core: 88.9, bu: 86.8, osr: 89.5, bdh: 87.8, fi: 87.8, bump: 89.8 }
].map(d => ({ ...d, date: new Date(d.date) }));

// 顏色映射
const facetColorMap = {
  core: '#f97316',
  bu: '#ef4444',
  osr: '#06b6d4',
  bdh: '#3b82f6',
  fi: '#8b5cf6',
  bump: '#10b981'
};

// 分面配置
const facetedData = [
  {
    id: 'core',
    title: 'Core',
    height: 100,
    layers: [
      // 折線圖層
      {
        type: 'line',
        data: facetRawData,
        yAxis: 'left',
        xValue: d => d.date,
        yValue: d => d.core,
        lineColor: facetColorMap.core,
        strokeWidth: 2,
        showDots: false,
        curve: d3.curveMonotoneX,
        legend: { show: false }
      },
      // 散點圖層
      {
        type: 'scatter',
        data: facetRawData,
        yAxis: 'left',
        xValue: d => d.date,
        yValue: d => d.core,
        dotColor: facetColorMap.core,
        dotSize: 4,
        dotOpacity: 0.9,
        legend: { show: false }
      }
    ],
    yLeftDomain: [85, 95],
    yLeftAxisFormat: d => d + '%',
    triggerLines: [{
      type: 'horizontal',
      value: 90,
      yAxis: 'left',
      label: 'Target',
      color: '#10b981',
      strokeDasharray: '5,5',
      showInLegend: false
    }]
  },
  {
    id: 'bu',
    title: 'BU',
    height: 100,
    layers: [
      {
        type: 'line',
        data: facetRawData,
        yAxis: 'left',
        xValue: d => d.date,
        yValue: d => d.bu,
        lineColor: facetColorMap.bu,
        strokeWidth: 2,
        showDots: false,
        curve: d3.curveMonotoneX
      },
      {
        type: 'scatter',
        data: facetRawData,
        yAxis: 'left',
        xValue: d => d.date,
        yValue: d => d.bu,
        dotColor: facetColorMap.bu,
        dotSize: 4,
        dotOpacity: 0.9
      }
    ],
    yLeftDomain: [85, 93],
    yLeftAxisFormat: d => d + '%'
  },
  {
    id: 'osr',
    title: 'OSR',
    height: 100,
    layers: [
      {
        type: 'line',
        data: facetRawData,
        yAxis: 'left',
        xValue: d => d.date,
        yValue: d => d.osr,
        lineColor: facetColorMap.osr,
        strokeWidth: 2,
        showDots: false,
        curve: d3.curveMonotoneX
      },
      {
        type: 'scatter',
        data: facetRawData,
        yAxis: 'left',
        xValue: d => d.date,
        yValue: d => d.osr,
        dotColor: facetColorMap.osr,
        dotSize: 4,
        dotOpacity: 0.9
      }
    ],
    yLeftDomain: [87, 95],
    yLeftAxisFormat: d => d + '%'
  }
];

const facetedCodeExample = `&lt;template&gt;
  &lt;div style="height: 600px;"&gt;
    &lt;div style="width: 100%; height: 100%;"&gt;
      &lt;FacetedChart
        :facets="facets"
        :auto-resize="true"
        title="良率分析 - 分面圖"
        x-scale-type="time"
        :x-axis-format="d3.timeFormat('%m/%d')"
        :enable-brush="true"
        brush-mode="x"
        :sync-brush="true"
      /&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup&gt;
import FacetedChart from '@/components/common/FacetedChart.vue';
import * as d3 from 'd3';

const rawData = [
  { date: '2024-01-12', core: 87.8, bu: 88.6, osr: 91.5 },
  { date: '2024-01-20', core: 89.2, bu: 87.9, osr: 91.8 },
  // ...
];

const facets = [
  {
    id: 'core',
    title: 'Core',
    layers: [
      // 折線圖層
      {
        type: 'line',
        data: rawData,
        yAxis: 'left',
        xValue: d => new Date(d.date),
        yValue: d => d.core,
        lineColor: '#f97316',
        strokeWidth: 2,
        showDots: false,
        curve: d3.curveMonotoneX
      },
      // 散點圖層
      {
        type: 'scatter',
        data: rawData,
        yAxis: 'left',
        xValue: d => new Date(d.date),
        yValue: d => d.core,
        dotColor: '#f97316',
        dotSize: 4
      }
    ],
    yLeftDomain: [86, 95],
    yLeftAxisFormat: d => d + '%',
    triggerLines: [{
      type: 'horizontal',
      value: 90,
      yAxis: 'left',
      label: 'Target',
      color: '#10b981',
      strokeDasharray: '5,5'
    }]
  }
];
&lt;/script&gt;`;
</script>