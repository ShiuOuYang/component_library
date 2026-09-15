<template>
  <div class="mb-8">
    <h3 class="text-2xl font-semibold text-gray-800 mb-4">範例 F：響應式儀表板</h3>
    <p class="text-gray-600 mb-4">
      啟用 <span class="font-semibold text-pink-600">autoResize</span> 屬性，
      圖表會自動響應容器大小變化。試著調整瀏覽器視窗大小或使用開發者工具的響應式模式。
    </p>
    
    <div class="grid lg:grid-cols-2 gap-6">
      <div class="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-4 border-2 border-pink-200">
        <div style="width: 100%; height: 400px;">
          <DualAxisComboChart
            :auto-resize="true"
            :debounce-delay="200"
            :layers="responsiveLayers"
            title="響應式圖表（試著調整窗口大小）"
            :show-grid="true"
            :enable-brush="true"
            @chart-resize="logResize"
          />
        </div>
        <div class="mt-4 p-3 bg-white rounded-lg">
          <p class="text-sm text-gray-600 font-mono">
            {{ resizeLog || '等待調整大小...' }}
          </p>
        </div>
      </div>
      
      <CodeBlock
        language="vue"
        tip-type="warning"
        tip="啟用 autoResize 時，圖表會忽略 width 和 height props，<br>改為使用父容器的實際尺寸。"
        :code="responsiveCodeExample"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import DualAxisComboChart from '@/components/library/charts/DualAxisComboChart.vue';
import CodeBlock from '@/components/library/ui/CodeBlock.vue';

// 響應式圖表數據
const responsiveLayers = [
  {
    type: 'stacked-bar',
    data: [
      { week: 'W1', desktop: 450, mobile: 320 },
      { week: 'W2', desktop: 480, mobile: 350 },
      { week: 'W3', desktop: 520, mobile: 380 },
      { week: 'W4', desktop: 500, mobile: 360 }
    ],
    yAxis: 'left',
    stackKeys: ['desktop', 'mobile'],
    xValue: d => d.week,
    colorScale: (key) => key === 'desktop' ? '#8b5cf6' : '#ec4899',
    legend: { show: true }
  },
  {
    type: 'line',
    data: [
      { week: 'W1', conversion: 3.2 },
      { week: 'W2', conversion: 3.5 },
      { week: 'W3', conversion: 3.8 },
      { week: 'W4', conversion: 3.6 }
    ],
    yAxis: 'right',
    xValue: d => d.week,
    yValue: d => d.conversion,
    lineColor: '#14b8a6',
    strokeWidth: 3,
    showDots: true,
    legend: { show: true, label: '轉換率 (%)' }
  }
];

const resizeLog = ref('');

const logResize = (payload) => {
  resizeLog.value = `📏 當前尺寸: ${payload.width}px × ${payload.height}px | 繪圖區域: ${payload.chartWidth}px × ${payload.chartHeight}px`;
};

const responsiveCodeExample = `&lt;template&gt;
  &lt;!-- 父容器設定固定或百分比尺寸 --&gt;
  &lt;div style="width: 100%; height: 400px;"&gt;
    &lt;DualAxisComboChart
      :auto-resize="true"
      :debounce-delay="200"
      :layers="chartLayers"
      @chart-resize="handleResize"
    /&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup&gt;
const handleResize = ({ width, height }) => {
  console.log(\`圖表調整為: \${width}x\${height}\`);
};
&lt;/script&gt;`;
</script>