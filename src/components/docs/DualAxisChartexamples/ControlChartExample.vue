<template>
  <div class="mb-8">
    <h3 class="text-2xl font-semibold text-gray-800 mb-4">範例 C：管制圖 (Control Chart) - 異常檢測</h3>
    <p class="text-gray-600 mb-4">
      使用 <span class="font-semibold text-red-600">Trigger Lines</span> 功能繪製
      <span class="font-semibold text-blue-600">UCL（上控制限）</span>、
      <span class="font-semibold text-green-600">CL（中心線）</span>、
      <span class="font-semibold text-blue-600">LCL（下控制限）</span>。
      <span class="font-semibold text-orange-600">父組件自動檢測</span>超出管制界線的異常點並標記為紅色。
    </p>
    
    <div class="grid lg:grid-cols-2 gap-6">
      <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div style="width: 100%; height: 400px;">
          <DualAxisComboChart
            :auto-resize="true"
            :layers="controlChartLayersWithOutliers"
            :trigger-lines="controlChartTriggers"
            title="製程管制圖 (X̄-Chart) - 自動異常檢測"
            :show-grid="true"
            :enable-brush="true"
            :y-left-domain="[95, 105]"
          />
          <!-- 顯示異常統計 -->
          <div class="mt-2 p-2 bg-red-50 border border-red-200 rounded">
            <p class="text-xs text-red-700">
              ⚠️ 檢測到 <strong>{{ outlierCount }}</strong> 個異常點（超出管制界線）
            </p>
          </div>
        </div>
      </div>
      
      <CodeBlock
        language="javascript"
        :code="controlChartCodeExample"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import DualAxisComboChart from '@/components/library/charts/DualAxisComboChart.vue';
import CodeBlock from '@/components/library/ui/CodeBlock.vue';

// 定義管制界線
const UCL = 103;
const LCL = 97;

// 原始測量數據
const controlChartRawData = [
  { sample: '1', value: 100.2 },
  { sample: '2', value: 99.8 },
  { sample: '3', value: 104.5 },  // 異常！超過 UCL
  { sample: '4', value: 96.1 },   // 異常！低於 LCL
  { sample: '5', value: 100.8 },
  { sample: '6', value: 101.2 },
  { sample: '7', value: 99.5 },
  { sample: '8', value: 100.9 },
  { sample: '9', value: 103.8 },  // 異常！超過 UCL
  { sample: '10', value: 100.3 }
];

// 在父組件中自動分類正常點和異常點
const normalPoints = computed(() => 
  controlChartRawData.filter(d => d.value >= LCL && d.value <= UCL)
);
const outlierPoints = computed(() => 
  controlChartRawData.filter(d => d.value < LCL || d.value > UCL)
);
const outlierCount = computed(() => outlierPoints.value.length);

// 使用多圖層策略：折線 + 正常散點 + 異常散點
const controlChartLayersWithOutliers = computed(() => [
  // 基礎連線（淺灰色）
  {
    type: 'line',
    data: controlChartRawData,
    yAxis: 'left',
    xValue: d => d.sample,
    yValue: d => d.value,
    lineColor: '#94a3b8',
    strokeWidth: 1.5,
    showDots: false,
    legend: { show: false }
  },
  // 正常數據點（藍色）
  {
    type: 'scatter',
    data: normalPoints.value,
    yAxis: 'left',
    xValue: d => d.sample,
    yValue: d => d.value,
    dotColor: '#3b82f6',
    dotSize: 5,
    dotOpacity: 0.8,
    legend: { show: false }
  },
  // 異常數據點（紅色）
  {
    type: 'scatter',
    data: outlierPoints.value,
    yAxis: 'left',
    xValue: d => d.sample,
    yValue: d => d.value,
    dotColor: '#ef4444',
    dotSize: 5,
    dotOpacity: 1,
    legend: { show: false, label: `異常點 (${outlierCount.value})` }
  }
]);

const controlChartTriggers = [
  {
    type: 'horizontal',
    value: 103,
    yAxis: 'left',
    label: 'UCL',
    color: '#ef4444',
    strokeWidth: 2,
    strokeDasharray: '5,5',
    showInLegend: true,
    interactive: true,
    labelPosition: 'end'
  },
  {
    type: 'horizontal',
    value: 100,
    yAxis: 'left',
    label: 'CL',
    color: '#10b981',
    strokeWidth: 2,
    showInLegend: true,
    interactive: true,
    labelPosition: 'end'
  },
  {
    type: 'horizontal',
    value: 97,
    yAxis: 'left',
    label: 'LCL',
    color: '#ef4444',
    strokeWidth: 2,
    strokeDasharray: '5,5',
    showInLegend: true,
    interactive: true,
    labelPosition: 'end'
  }
];

const controlChartCodeExample = `// 定義管制界線
const UCL = 103, CL = 100, LCL = 97;

// 原始數據
const rawData = [
  { sample: '1', value: 100.2 },
  { sample: '2', value: 99.8 },
  { sample: '3', value: 104.5 },  // 異常！超過 UCL
  { sample: '4', value: 96.1 },   // 異常！低於 LCL
  { sample: '5', value: 100.8 }
];

// 在父組件中檢測異常點
const normalPoints = rawData.filter(
  d => d.value >= LCL && d.value <= UCL
);
const outlierPoints = rawData.filter(
  d => d.value < LCL || d.value > UCL
);

// 使用多圖層：折線圖 + 正常點 + 異常點
const layers = [
  // 基礎折線圖
  {
    type: 'line',
    data: rawData,
    yAxis: 'left',
    xValue: d => d.sample,
    yValue: d => d.value,
    lineColor: '#94a3b8',
    strokeWidth: 1.5,
    showDots: false
  },
  // 正常數據點（藍色）
  {
    type: 'scatter',
    data: normalPoints,
    yAxis: 'left',
    xValue: d => d.sample,
    yValue: d => d.value,
    dotColor: '#3b82f6',
    dotSize: 5,
    legend: { show: true, label: '正常點' }
  },
  // 異常數據點（紅色）
  {
    type: 'scatter',
    data: outlierPoints,
    yAxis: 'left',
    xValue: d => d.sample,
    yValue: d => d.value,
    dotColor: '#ef4444',
    dotSize: 7,
    legend: { show: true, label: '異常點' }
  }
];`;
</script>