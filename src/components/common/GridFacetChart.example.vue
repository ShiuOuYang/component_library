<template>
  <div class="example-container">
    <h1>GridFacetChart 使用範例</h1>

    <!-- 範例 1：銷售數據矩陣（地區 × 產品） -->
    <section class="example-section">
      <h2>範例 1：銷售數據矩陣（地區 × 產品）</h2>
      <GridFacetChart
        :data="salesMatrixData"
        x-facet-var="region"
        y-facet-var="product"
        x-facet-label="地區"
        y-facet-label="產品"
        :width="1200"
        :height="800"
        :enable-brush="true"
        :sync-brush="true"
        :brush-mode="x"
        x-scale-type="time"
        :x-axis-format="formatDate"
        :x-axis-label-rotate="-45"
      />
    </section>

    <!-- 範例 2：製程參數監控（機台 × 參數） -->
    <section class="example-section">
      <h2>範例 2：製程參數監控（機台 × 參數）</h2>
      <GridFacetChart
        :data="processMatrixData"
        x-facet-var="machine"
        y-facet-var="parameter"
        x-facet-label="機台"
        y-facet-label="參數"
        :width="1400"
        :height="900"
        :enable-brush="true"
        :sync-brush="false"
        :enable-axis-drag="true"
        brush-mode="xy"
      />
    </section>

    <!-- 範例 3：自動響應式佈局 -->
    <section class="example-section" style="height: 600px;">
      <h2>範例 3：自動響應式佈局</h2>
      <GridFacetChart
        :data="autoResizeData"
        x-facet-var="category"
        y-facet-var="metric"
        x-facet-label="分類"
        y-facet-label="指標"
        :auto-resize="true"
      />
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { GridFacetChart } from './index';
import * as d3 from 'd3';

// ===== 範例 1：銷售數據矩陣 =====
const salesMatrixData = ref([
  {
    region: '北區',
    product: 'A產品',
    layers: [
      {
        type: 'line',
        data: generateTimeSeriesData(30, 100, 200),
        xValue: d => new Date(d.date),
        yValue: d => d.sales,
        yAxis: 'left',
        lineColor: '#3b82f6',
        strokeWidth: 2,
        showDots: true,
      }
    ],
    yLeftDomain: [0, 300],
    yLeftAxisFormat: d => `${d}萬`,
  },
  {
    region: '北區',
    product: 'B產品',
    layers: [
      {
        type: 'line',
        data: generateTimeSeriesData(30, 80, 150),
        xValue: d => new Date(d.date),
        yValue: d => d.sales,
        yAxis: 'left',
        lineColor: '#10b981',
        strokeWidth: 2,
        showDots: true,
      }
    ],
    yLeftDomain: [0, 300],
    yLeftAxisFormat: d => `${d}萬`,
  },
  {
    region: '南區',
    product: 'A產品',
    layers: [
      {
        type: 'line',
        data: generateTimeSeriesData(30, 120, 250),
        xValue: d => new Date(d.date),
        yValue: d => d.sales,
        yAxis: 'left',
        lineColor: '#3b82f6',
        strokeWidth: 2,
        showDots: true,
      }
    ],
    yLeftDomain: [0, 300],
    yLeftAxisFormat: d => `${d}萬`,
  },
  {
    region: '南區',
    product: 'B產品',
    layers: [
      {
        type: 'line',
        data: generateTimeSeriesData(30, 90, 180),
        xValue: d => new Date(d.date),
        yValue: d => d.sales,
        yAxis: 'left',
        lineColor: '#10b981',
        strokeWidth: 2,
        showDots: true,
      }
    ],
    yLeftDomain: [0, 300],
    yLeftAxisFormat: d => `${d}萬`,
  },
  {
    region: '東區',
    product: 'A產品',
    layers: [
      {
        type: 'line',
        data: generateTimeSeriesData(30, 110, 220),
        xValue: d => new Date(d.date),
        yValue: d => d.sales,
        yAxis: 'left',
        lineColor: '#3b82f6',
        strokeWidth: 2,
        showDots: true,
      }
    ],
    yLeftDomain: [0, 300],
    yLeftAxisFormat: d => `${d}萬`,
  },
  {
    region: '東區',
    product: 'B產品',
    layers: [
      {
        type: 'line',
        data: generateTimeSeriesData(30, 70, 140),
        xValue: d => new Date(d.date),
        yValue: d => d.sales,
        yAxis: 'left',
        lineColor: '#10b981',
        strokeWidth: 2,
        showDots: true,
      }
    ],
    yLeftDomain: [0, 300],
    yLeftAxisFormat: d => `${d}萬`,
  },
]);

// ===== 範例 2：製程參數監控 =====
const processMatrixData = ref([
  {
    machine: 'M1',
    parameter: '溫度',
    layers: [
      {
        type: 'line',
        data: generateTimeSeriesData(50, 200, 250),
        xValue: d => new Date(d.date),
        yValue: d => d.value,
        yAxis: 'left',
        lineColor: '#ef4444',
        strokeWidth: 2,
      }
    ],
    triggerLines: [
      { type: 'horizontal', value: 240, yAxis: 'left', label: 'UCL', color: '#dc2626', strokeDasharray: '5,5' },
      { type: 'horizontal', value: 210, yAxis: 'left', label: 'LCL', color: '#dc2626', strokeDasharray: '5,5' },
    ],
    yLeftDomain: [180, 260],
  },
  {
    machine: 'M1',
    parameter: '壓力',
    layers: [
      {
        type: 'line',
        data: generateTimeSeriesData(50, 80, 120),
        xValue: d => new Date(d.date),
        yValue: d => d.value,
        yAxis: 'left',
        lineColor: '#3b82f6',
        strokeWidth: 2,
      }
    ],
    yLeftDomain: [60, 140],
  },
  {
    machine: 'M2',
    parameter: '溫度',
    layers: [
      {
        type: 'line',
        data: generateTimeSeriesData(50, 205, 245),
        xValue: d => new Date(d.date),
        yValue: d => d.value,
        yAxis: 'left',
        lineColor: '#ef4444',
        strokeWidth: 2,
      }
    ],
    triggerLines: [
      { type: 'horizontal', value: 240, yAxis: 'left', label: 'UCL', color: '#dc2626', strokeDasharray: '5,5' },
      { type: 'horizontal', value: 210, yAxis: 'left', label: 'LCL', color: '#dc2626', strokeDasharray: '5,5' },
    ],
    yLeftDomain: [180, 260],
  },
  {
    machine: 'M2',
    parameter: '壓力',
    layers: [
      {
        type: 'line',
        data: generateTimeSeriesData(50, 85, 115),
        xValue: d => new Date(d.date),
        yValue: d => d.value,
        yAxis: 'left',
        lineColor: '#3b82f6',
        strokeWidth: 2,
      }
    ],
    yLeftDomain: [60, 140],
  },
]);

// ===== 範例 3：自動響應式 =====
const autoResizeData = ref([
  {
    category: 'A',
    metric: 'Yield',
    layers: [
      {
        type: 'line',
        data: generateTimeSeriesData(20, 85, 95),
        xValue: d => new Date(d.date),
        yValue: d => d.value,
        yAxis: 'left',
        lineColor: '#8b5cf6',
        strokeWidth: 2,
      }
    ],
    yLeftDomain: [80, 100],
    yLeftAxisFormat: d => `${d}%`,
  },
  {
    category: 'A',
    metric: 'Defect',
    layers: [
      {
        type: 'line',
        data: generateTimeSeriesData(20, 2, 8),
        xValue: d => new Date(d.date),
        yValue: d => d.value,
        yAxis: 'left',
        lineColor: '#f59e0b',
        strokeWidth: 2,
      }
    ],
    yLeftDomain: [0, 10],
  },
  {
    category: 'B',
    metric: 'Yield',
    layers: [
      {
        type: 'line',
        data: generateTimeSeriesData(20, 88, 96),
        xValue: d => new Date(d.date),
        yValue: d => d.value,
        yAxis: 'left',
        lineColor: '#8b5cf6',
        strokeWidth: 2,
      }
    ],
    yLeftDomain: [80, 100],
    yLeftAxisFormat: d => `${d}%`,
  },
  {
    category: 'B',
    metric: 'Defect',
    layers: [
      {
        type: 'line',
        data: generateTimeSeriesData(20, 1, 6),
        xValue: d => new Date(d.date),
        yValue: d => d.value,
        yAxis: 'left',
        lineColor: '#f59e0b',
        strokeWidth: 2,
      }
    ],
    yLeftDomain: [0, 10],
  },
]);

// ===== 工具函數 =====
function generateTimeSeriesData(days, min, max) {
  const data = [];
  const now = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(now.getTime() - (days - i) * 24 * 60 * 60 * 1000);
    const value = Math.random() * (max - min) + min;
    data.push({
      date: date.toISOString(),
      value: Math.round(value * 10) / 10,
      sales: Math.round(value * 10) / 10,
    });
  }
  
  return data;
}

const formatDate = d3.timeFormat('%m/%d');
</script>

<style scoped>
.example-container {
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
}

.example-section {
  margin-bottom: 3rem;
  padding: 1.5rem;
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 2rem;
  color: #1f2937;
}

h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #374151;
}
</style>
