<template>
  <div class="grid-facet-test-page">
    <div class="page-header">
      <h1>GridFacetChart 測試頁面</h1>
      <p class="description">測試二維網格分面圖組件的各種功能</p>
    </div>

    <!-- 範例 1：銷售數據矩陣（地區 × 產品） -->
    <section class="example-section">
      <div class="section-header">
        <h2>範例 1：銷售數據矩陣（地區 × 產品）</h2>
        <div class="controls">
          <label>
            <input type="checkbox" v-model="example1SyncBrush" />
            同步 Brush
          </label>
          <label>
            <input type="checkbox" v-model="example1EnableBrush" />
            啟用 Brush
          </label>
        </div>
      </div>
      <GridFacetChart
        :data="salesMatrixData"
        x-facet-var="region"
        y-facet-var="product"
        x-facet-label="地區"
        y-facet-label="產品"
        title="2026 年各地區產品銷售趨勢"
        :width="1200"
        :height="800"
        :enable-brush="example1EnableBrush"
        :sync-brush="example1SyncBrush"
        brush-mode="x"
        x-scale-type="time"
        :x-axis-format="formatDate"
        :x-axis-label-rotate="-45"
        @selection-change="handleSelection"
        @zoom-reset="handleZoomReset"
      />
    </section>

    <!-- 範例 2：製程參數監控（機台 × 參數） -->
    <section class="example-section">
      <div class="section-header">
        <h2>範例 2：製程參數監控（機台 × 參數）</h2>
        <div class="controls">
          <label>
            <input type="checkbox" v-model="example2AxisDrag" />
            啟用座標軸拖曳
          </label>
        </div>
      </div>
      <GridFacetChart
        :data="processMatrixData"
        x-facet-var="machine"
        y-facet-var="parameter"
        x-facet-label="機台"
        y-facet-label="參數"
        title="製程參數即時監控"
        :width="1400"
        :height="900"
        :enable-brush="true"
        :sync-brush="true"
        :enable-axis-drag="example2AxisDrag"
        brush-mode="xy"
        @axis-drag="handleAxisDrag"
      />
    </section>

    <!-- 範例 3：雙軸組合圖（堆疊長條圖 + 良率） -->
    <section class="example-section">
      <div class="section-header">
        <h2>範例 3：產量與良率分析（左軸：堆疊長條圖 | 右軸：良率）</h2>
        <p class="hint">展示不同產線的產量組成（Pass/Fail）與良率趨勢</p>
      </div>
      <GridFacetChart
        :data="productionYieldData"
        x-facet-var="line"
        y-facet-var="shift"
        x-facet-label="產線"
        y-facet-label="班別"
        title="產線產量與良率分析（2026/01）"
        :width="1400"
        :height="900"
        :enable-brush="true"
        :sync-brush="true"
        brush-mode="x"
        x-scale-type="band"
        :x-axis-label-rotate="-45"
      />
    </section>

    <!-- 範例 4：自動響應式佈局 -->
    <section class="example-section">
      <div class="section-header">
        <h2>範例 4：自動響應式佈局</h2>
        <p class="hint">調整瀏覽器窗口大小查看效果</p>
      </div>
      <div class="responsive-container">
        <GridFacetChart
          :data="autoResizeData"
          x-facet-var="category"
          y-facet-var="metric"
          x-facet-label="分類"
          y-facet-label="指標"
          title="良率與缺陷率監控"
          :auto-resize="true"
        />
      </div>
    </section>

    <!-- 事件日誌 -->
    <section class="example-section">
      <div class="section-header">
        <h2>事件日誌</h2>
        <button @click="eventLog = []" class="clear-btn">清空</button>
      </div>
      <div class="event-log">
        <div v-if="eventLog.length === 0" class="empty-log">
          尚無事件...
        </div>
        <div
          v-for="(event, index) in eventLog"
          :key="index"
          class="log-item"
          :class="`log-${event.type}`"
        >
          <span class="log-time">{{ event.time }}</span>
          <span class="log-type">{{ event.type }}</span>
          <span class="log-message">{{ event.message }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { GridFacetChart } from '@/components/common';
import * as d3 from 'd3';

// ===== 控制狀態 =====
const example1SyncBrush = ref(true);
const example1EnableBrush = ref(true);
const example2AxisDrag = ref(true);
const eventLog = ref([]);

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
    yLeftAxisFormat: d => `${d}°C`,
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
    yLeftAxisFormat: d => `${d}Pa`,
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
    yLeftAxisFormat: d => `${d}°C`,
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
    yLeftAxisFormat: d => `${d}Pa`,
  },
]);

// ===== 範例 3：產量與良率（堆疊長條圖 + 折線圖） =====
// 預先生成數據，確保每個單元格的圖層共享同一份數據
const line1EarlyData = generateProductionData(10);
const line1NightData = generateProductionData(10);
const line2EarlyData = generateProductionData(10);
const line2NightData = generateProductionData(10);

const productionYieldData = ref([
  {
    line: 'Line 1',
    shift: '早班',
    layers: [
      // 左軸：堆疊長條圖（Pass 和 Fail）
      {
        type: 'stacked-bar',
        data: line1EarlyData,
        stackKeys: ['pass', 'fail'], // 堆疊的 key
        xValue: d => d.date,
        colorScale: {
          pass: '#10b981',
          fail: '#ef4444',
        },
        yAxis: 'left',
      },
      // 右軸：良率折線圖
      {
        type: 'line',
        data: line1EarlyData,
        xValue: d => d.date,
        yValue: d => d.yield,
        yAxis: 'right',
        lineColor: '#3b82f6',
        strokeWidth: 2,
        showDots: true,
      },
    ],
    yLeftDomain: [0, 1200],
    yLeftAxisFormat: d => `${d}`,
    yRightDomain: [80, 100],
    yRightAxisFormat: d => `${d}%`,
    yRightScaleType: 'linear',
  },
  {
    line: 'Line 1',
    shift: '晚班',
    layers: [
      {
        type: 'stacked-bar',
        data: line1NightData,
        stackKeys: ['pass', 'fail'],
        xValue: d => d.date,
        colorScale: {
          pass: '#10b981',
          fail: '#ef4444',
        },
        yAxis: 'left',
      },
      {
        type: 'line',
        data: line1NightData,
        xValue: d => d.date,
        yValue: d => d.yield,
        yAxis: 'right',
        lineColor: '#3b82f6',
        strokeWidth: 2,
        showDots: true,
      },
    ],
    yLeftDomain: [0, 1200],
    yLeftAxisFormat: d => `${d}`,
    yRightDomain: [80, 100],
    yRightAxisFormat: d => `${d}%`,
  },
  {
    line: 'Line 2',
    shift: '早班',
    layers: [
      {
        type: 'stacked-bar',
        data: line2EarlyData,
        stackKeys: ['pass', 'fail'],
        xValue: d => d.date,
        colorScale: {
          pass: '#10b981',
          fail: '#ef4444',
        },
        yAxis: 'left',
      },
      {
        type: 'line',
        data: line2EarlyData,
        xValue: d => d.date,
        yValue: d => d.yield,
        yAxis: 'right',
        lineColor: '#3b82f6',
        strokeWidth: 2,
        showDots: true,
      },
    ],
    yLeftDomain: [0, 1200],
    yLeftAxisFormat: d => `${d}`,
    yRightDomain: [80, 100],
    yRightAxisFormat: d => `${d}%`,
  },
  {
    line: 'Line 2',
    shift: '晚班',
    layers: [
      {
        type: 'stacked-bar',
        data: line2NightData,
        stackKeys: ['pass', 'fail'],
        xValue: d => d.date,
        colorScale: {
          pass: '#10b981',
          fail: '#ef4444',
        },
        yAxis: 'left',
      },
      {
        type: 'line',
        data: line2NightData,
        xValue: d => d.date,
        yValue: d => d.yield,
        yAxis: 'right',
        lineColor: '#3b82f6',
        strokeWidth: 2,
        showDots: true,
      },
    ],
    yLeftDomain: [0, 1200],
    yLeftAxisFormat: d => `${d}`,
    yRightDomain: [80, 100],
    yRightAxisFormat: d => `${d}%`,
  },
]);

// ===== 範例 4：自動響應式 =====
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

function generateProductionData(days) {
  const data = [];
  const dates = ['01/20', '01/21', '01/22', '01/23', '01/24', '01/25', '01/26', '01/27', '01/28', '01/29'];
  
  for (let i = 0; i < Math.min(days, dates.length); i++) {
    const pass = Math.floor(Math.random() * 200 + 800); // 800-1000
    const fail = Math.floor(Math.random() * 50 + 20);   // 20-70
    const total = pass + fail;
    const yieldRate = ((pass / total) * 100).toFixed(2);
    
    data.push({
      date: dates[i],
      pass,
      fail,
      total,
      yield: parseFloat(yieldRate),
    });
  }
  
  return data;
}

const formatDate = d3.timeFormat('%m/%d');

// ===== 事件處理 =====
function addLog(type, message) {
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  
  eventLog.value.unshift({ type, message, time });
  
  // 限制日誌數量
  if (eventLog.value.length > 20) {
    eventLog.value = eventLog.value.slice(0, 20);
  }
}

function handleSelection(event) {
  const { facetId, xDomain } = event;
  let message = `選取範圍變更 - 單元格: ${facetId}`;
  
  if (xDomain) {
    const start = new Date(xDomain[0]).toLocaleDateString();
    const end = new Date(xDomain[1]).toLocaleDateString();
    message += ` | 時間範圍: ${start} ~ ${end}`;
  }
  
  addLog('selection', message);
}

function handleAxisDrag(event) {
  const { facetId, axis, domain } = event;
  const message = `座標軸拖曳 - 單元格: ${facetId} | 軸: ${axis} | 新範圍: [${domain[0].toFixed(2)}, ${domain[1].toFixed(2)}]`;
  addLog('drag', message);
}

function handleZoomReset() {
  addLog('reset', '所有縮放已重置');
}
</script>

<style scoped>
.grid-facet-test-page {
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
  background-color: #f9fafb;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 2rem;
  text-align: center;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.page-header .description {
  font-size: 1rem;
  color: #6b7280;
}

.example-section {
  margin-bottom: 3rem;
  padding: 1.5rem;
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
}

.section-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.section-header .hint {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0.5rem 0 0 0;
}

.controls {
  display: flex;
  gap: 1.5rem;
}

.controls label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  user-select: none;
}

.controls input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.responsive-container {
  width: 100%;
  height: 600px;
  border: 2px dashed #d1d5db;
  border-radius: 0.375rem;
}

.clear-btn {
  padding: 0.5rem 1rem;
  background-color: #ef4444;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.clear-btn:hover {
  background-color: #dc2626;
}

.event-log {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 1rem;
  max-height: 300px;
  overflow-y: auto;
}

.empty-log {
  text-align: center;
  color: #9ca3af;
  padding: 2rem;
  font-size: 0.875rem;
}

.log-item {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  border-left: 3px solid transparent;
}

.log-item:last-child {
  margin-bottom: 0;
}

.log-selection {
  background-color: #dbeafe;
  border-left-color: #3b82f6;
}

.log-drag {
  background-color: #fef3c7;
  border-left-color: #f59e0b;
}

.log-reset {
  background-color: #fee2e2;
  border-left-color: #ef4444;
}

.log-time {
  font-weight: 600;
  color: #6b7280;
  min-width: 4rem;
}

.log-type {
  font-weight: 600;
  text-transform: uppercase;
  min-width: 5rem;
}

.log-selection .log-type {
  color: #2563eb;
}

.log-drag .log-type {
  color: #d97706;
}

.log-reset .log-type {
  color: #dc2626;
}

.log-message {
  color: #374151;
  flex: 1;
}
</style>
