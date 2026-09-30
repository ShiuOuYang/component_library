<template>
  <div class="mb-8">
    <h3 class="text-2xl font-semibold text-content-primary mb-4">範例 A：銷售報表</h3>
    <p class="text-content-secondary mb-4">
      左軸顯示 <span class="font-semibold text-accent">線上與線下銷售額</span>（堆疊長條圖），
      右軸顯示 <span class="font-semibold text-danger">利潤率趨勢</span>（折線圖）。
    </p>
    
    <div class="grid lg:grid-cols-2 gap-6">
      <!-- 寬度跟著欄位走（原本寫死 600px，比雙欄版面的一欄寬，右軸壓到旁邊的程式碼區塊上） -->
      <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
        <div style="width: 100%; height: 400px;">
          <DualAxisComboChart
            :auto-resize="true"
            :layers="salesLayers"
            title="月度銷售與利潤率分析"
            :show-grid="true"
            :enable-brush="true"
          />
        </div>
      </div>
      
      <CodeBlock
        language="javascript"
        :code="salesCodeExample"
      />
    </div>
  </div>
</template>

<script setup>
import DualAxisComboChart from '@/components/library/charts/DualAxisComboChart.vue';
import CodeBlock from '@/components/library/ui/CodeBlock.vue';

// 銷售報表數據
const salesLayers = [
  {
    type: 'stacked-bar',
    data: [
      { month: 'Jan', online: 120, offline: 80 },
      { month: 'Feb', online: 150, offline: 90 },
      { month: 'Mar', online: 180, offline: 100 },
      { month: 'Apr', online: 200, offline: 110 },
      { month: 'May', online: 170, offline: 95 },
      { month: 'Jun', online: 220, offline: 120 }
    ],
    yAxis: 'left',
    stackKeys: ['online', 'offline'],
    xValue: d => d.month,
    colorScale: (key) => key === 'online' ? '#3b82f6' : '#10b981',
    legend: { show: true }
  },
  {
    type: 'line',
    data: [
      { month: 'Jan', profit: 25 },
      { month: 'Feb', profit: 28 },
      { month: 'Mar', profit: 32 },
      { month: 'Apr', profit: 35 },
      { month: 'May', profit: 30 },
      { month: 'Jun', profit: 38 }
    ],
    yAxis: 'right',
    xValue: d => d.month,
    yValue: d => d.profit,
    lineColor: '#ef4444',
    strokeWidth: 3,
    showDots: true,
    legend: { show: true, label: '利潤率 (%)' }
  }
];

const salesCodeExample = `const salesLayers = [
  {
    type: 'stacked-bar',
    data: [
      { month: 'Jan', online: 120, offline: 80 },
      { month: 'Feb', online: 150, offline: 90 },
      { month: 'Mar', online: 180, offline: 100 },
      { month: 'Apr', online: 200, offline: 110 }
    ],
    yAxis: 'left',
    stackKeys: ['online', 'offline'],
    xValue: d => d.month,
    colorScale: (key) => 
      key === 'online' ? '#3b82f6' : '#10b981',
    legend: { show: true }
  },
  {
    type: 'line',
    data: [
      { month: 'Jan', profit: 25 },
      { month: 'Feb', profit: 28 },
      { month: 'Mar', profit: 32 },
      { month: 'Apr', profit: 35 }
    ],
    yAxis: 'right',
    xValue: d => d.month,
    yValue: d => d.profit,
    lineColor: '#ef4444',
    strokeWidth: 3,
    showDots: true,
    legend: { show: true, label: '利潤率 (%)' }
  }
];`;
</script>