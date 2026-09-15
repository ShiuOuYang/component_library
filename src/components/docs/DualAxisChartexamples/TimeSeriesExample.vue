<template>
  <div class="mb-8">
    <h3 class="text-2xl font-semibold text-gray-800 mb-4">範例 D：時間軸圖表 (Time Series)</h3>
    <p class="text-gray-600 mb-4">
      使用 <span class="font-semibold text-purple-600">xScaleType="time"</span> 配置，
      支援 <span class="font-semibold">連續時間軸</span> 顯示，適合趨勢分析和時間序列數據。
    </p>
    
    <div class="grid lg:grid-cols-2 gap-6">
      <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div style="width: 100%; height: 400px;">
          <DualAxisComboChart
            :auto-resize="true"
            :layers="timeSeriesLayers"
            title="伺服器流量監控 (24小時)"
            :show-grid="true"
            :enable-brush="true"
            :x-scale-type="'time'"
            :x-axis-format="d3.timeFormat('%H:%M')"
          />
        </div>
      </div>
      
      <CodeBlock
        language="javascript"
        :code="timeSeriesCodeExample"
      />
    </div>
  </div>
</template>

<script setup>
import DualAxisComboChart from '@/components/library/charts/DualAxisComboChart.vue';
import CodeBlock from '@/components/library/ui/CodeBlock.vue';
import * as d3 from 'd3';

// 時間軸圖表數據
const now = new Date();
const timeSeriesData = Array.from({ length: 24 }, (_, i) => ({
  time: new Date(now.getTime() - (23 - i) * 3600000),
  requests: Math.floor(Math.random() * 5000) + 2000,
  errors: Math.floor(Math.random() * 100) + 10
}));

const timeSeriesLayers = [
  {
    type: 'line',
    data: timeSeriesData,
    yAxis: 'left',
    xValue: d => d.time,
    yValue: d => d.requests,
    lineColor: '#3b82f6',
    strokeWidth: 2,
    showDots: false,
    curve: d3.curveMonotoneX,
    legend: { show: true, label: '請求數' }
  },
  {
    type: 'line',
    data: timeSeriesData,
    yAxis: 'right',
    xValue: d => d.time,
    yValue: d => d.errors,
    lineColor: '#ef4444',
    strokeWidth: 2,
    showDots: false,
    curve: d3.curveMonotoneX,
    legend: { show: true, label: '錯誤數' }
  }
];

const timeSeriesCodeExample = `import * as d3 from 'd3';

// 生成時間序列數據
const now = new Date();
const timeData = Array.from({ length: 24 }, (_, i) => ({
  time: new Date(now.getTime() - (23 - i) * 3600000),
  requests: Math.floor(Math.random() * 5000) + 2000,
  errors: Math.floor(Math.random() * 100) + 10
}));

const layers = [
  {
    type: 'line',
    data: timeData,
    yAxis: 'left',
    xValue: d => d.time,
    yValue: d => d.requests,
    lineColor: '#3b82f6',
    strokeWidth: 2,
    showDots: false,
    curve: d3.curveMonotoneX,
    legend: { show: true, label: '請求數' }
  },
  {
    type: 'line',
    data: timeData,
    yAxis: 'right',
    xValue: d => d.time,
    yValue: d => d.errors,
    lineColor: '#ef4444',
    strokeWidth: 2,
    showDots: false,
    curve: d3.curveMonotoneX,
    legend: { show: true, label: '錯誤數' }
  }
];

// 時間格式化
// &lt;DualAxisComboChart
//   :x-scale-type="'time'"
//   :x-axis-format="d3.timeFormat('%H:%M')"
//   :layers="layers"
// /&gt;`;
</script>