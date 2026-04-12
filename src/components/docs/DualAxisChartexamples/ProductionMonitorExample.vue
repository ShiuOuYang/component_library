<template>
  <div class="mb-8">
    <h3 class="text-2xl font-semibold text-gray-800 mb-4">範例 B：生產監控</h3>
    <p class="text-gray-600 mb-4">
      左軸顯示 <span class="font-semibold text-green-600">良品與不良品數量</span>（堆疊長條圖），
      右軸顯示 <span class="font-semibold text-orange-600">設備稼動率</span>（折線圖）。
    </p>
    
    <div class="grid lg:grid-cols-2 gap-6">
      <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div style="width: 100%; height: 400px;">
          <DualAxisComboChart
            :auto-resize="true"
            :layers="productionLayers"
            title="生產良率與稼動率監控"
            :showGrid="true"
            :enableBrush="true"
          />
        </div>
      </div>
      
      <CodeBlock
        language="javascript"
        :code="productionCodeExample"
      />
    </div>
  </div>
</template>

<script setup>
import DualAxisComboChart from '../../common/DualAxisComboChart.vue';
import CodeBlock from '../../common/CodeBlock.vue';

// 生產監控數據
const productionLayers = [
  {
    type: 'stacked-bar',
    data: [
      { day: 'Mon', good: 950, defect: 50 },
      { day: 'Tue', good: 980, defect: 20 },
      { day: 'Wed', good: 920, defect: 80 },
      { day: 'Thu', good: 990, defect: 10 },
      { day: 'Fri', good: 960, defect: 40 }
    ],
    yAxis: 'left',
    stackKeys: ['good', 'defect'],
    xValue: d => d.day,
    colorScale: (key) => key === 'good' ? '#10b981' : '#ef4444',
    legend: { show: true }
  },
  {
    type: 'line',
    data: [
      { day: 'Mon', oee: 85 },
      { day: 'Tue', oee: 92 },
      { day: 'Wed', oee: 78 },
      { day: 'Thu', oee: 95 },
      { day: 'Fri', oee: 88 }
    ],
    yAxis: 'right',
    xValue: d => d.day,
    yValue: d => d.oee,
    lineColor: '#f59e0b',
    strokeWidth: 3,
    showDots: true,
    legend: { show: true, label: '稼動率 (%)' }
  }
];

const productionCodeExample = `const productionLayers = [
  {
    type: 'stacked-bar',
    data: [
      { day: 'Mon', good: 950, defect: 50 },
      { day: 'Tue', good: 980, defect: 20 },
      { day: 'Wed', good: 920, defect: 80 },
      { day: 'Thu', good: 990, defect: 10 },
      { day: 'Fri', good: 960, defect: 40 }
    ],
    yAxis: 'left',
    stackKeys: ['good', 'defect'],
    xValue: d => d.day,
    colorScale: (key) => 
      key === 'good' ? '#10b981' : '#ef4444',
    legend: { show: true }
  },
  {
    type: 'line',
    data: [
      { day: 'Mon', oee: 85 },
      { day: 'Tue', oee: 92 },
      { day: 'Wed', oee: 78 },
      { day: 'Thu', oee: 95 },
      { day: 'Fri', oee: 88 }
    ],
    yAxis: 'right',
    xValue: d => d.day,
    yValue: d => d.oee,
    lineColor: '#f59e0b',
    strokeWidth: 3,
    showDots: true,
    legend: { show: true, label: '稼動率 (%)' }
  }
];`;
</script>