<template>
  <div class="mb-8">
    <h3 class="text-2xl font-semibold text-gray-800 mb-4">範例 E：散點圖 (Scatter Plot)</h3>
    <p class="text-gray-600 mb-4">
      使用 <span class="font-semibold text-indigo-600">type="scatter"</span> 繪製散點圖，
      適合展示 <span class="font-semibold">相關性分析</span>、<span class="font-semibold">分佈圖</span>、
      <span class="font-semibold">異常值檢測</span> 等場景。
    </p>
    
    <div class="grid lg:grid-cols-2 gap-6">
      <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div style="width: 100%; height: 400px;">
          <DualAxisComboChart
            :auto-resize="true"
            :layers="scatterLayers"
            title="溫度 vs 銷售量相關性分析"
            :showGrid="true"
            :enableBrush="true"
            :x-scale-type="'linear'"
          />
        </div>
      </div>
      
      <CodeBlock
        language="javascript"
        :code="scatterCodeExample"
      />
    </div>
  </div>
</template>

<script setup>
import DualAxisComboChart from '../../common/DualAxisComboChart.vue';
import CodeBlock from '../../common/CodeBlock.vue';

// 散點圖數據
const scatterData = Array.from({ length: 20 }, () => ({
  temp: Math.floor(Math.random() * 20) + 15,
  sales: Math.floor(Math.random() * 400) + 300
}));

const scatterLayers = [
  {
    type: 'scatter',
    data: scatterData,
    yAxis: 'left',
    xValue: d => d.temp,
    yValue: d => d.sales,
    dotColor: '#8b5cf6',
    dotSize: 6,
    dotOpacity: 0.7,
    legend: { show: true, label: '銷售數據點' }
  }
];

const scatterCodeExample = `// 散點圖數據
const scatterData = [
  { temp: 15, sales: 320 },
  { temp: 18, sales: 380 },
  { temp: 22, sales: 450 },
  { temp: 25, sales: 520 },
  { temp: 28, sales: 580 },
  { temp: 32, sales: 650 }
];

const layers = [
  {
    type: 'scatter',
    data: scatterData,
    yAxis: 'left',
    xValue: d => d.temp,
    yValue: d => d.sales,
    dotColor: '#8b5cf6',
    dotSize: 6,
    dotOpacity: 0.7,
    legend: { show: true, label: '銷售數據點' }
  }
];

// &lt;DualAxisComboChart
//   :x-scale-type="'linear'"
//   :layers="layers"
// /&gt;`;
</script>