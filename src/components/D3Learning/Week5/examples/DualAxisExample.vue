<template>
  <div class="p-8 bg-gray-50 min-h-screen">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">企業級雙軸組合圖範例</h1>

      <!-- 範例 1: 銷售額（堆疊長條圖）+ 利潤率（折線圖） -->
      <section class="mb-12 bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-800">範例 1：月度銷售分析</h2>
        
        <DualAxisComboChart
          :width="1000"
          :height="500"
          :layers="salesLayers"
          title="2024 年銷售額與利潤率分析"
          :show-grid="true"
          y-left-axis-label="銷售額 (萬元)"
          y-right-axis-label="利潤率 (%)"
          :y-left-axis-format="formatCurrency"
          :y-right-axis-format="formatPercent"
          @layer-click="handleClick"
        >
          <template #tooltip="{ tooltipData, tooltipVisible }">
            <div 
              v-if="tooltipVisible && tooltipData"
              class="absolute bg-gray-900 text-white px-4 py-2 rounded shadow-lg text-sm pointer-events-none"
              :style="{
                left: tooltipPosition.x + 'px',
                top: tooltipPosition.y + 'px',
                transform: 'translate(-50%, -120%)'
              }"
            >
              <div class="font-semibold mb-1">{{ tooltipData.data?.data?.month || tooltipData.data?.month }}</div>
              <div v-if="tooltipData.seriesKey">
                {{ tooltipData.seriesKey }}: {{ formatValue(tooltipData.data.data[tooltipData.seriesKey]) }}
              </div>
              <div v-else-if="tooltipData.layer.type === 'line'">
                利潤率: {{ tooltipData.data.profitRate }}%
              </div>
            </div>
          </template>
        </DualAxisComboChart>

        <!-- 控制面板 -->
        <div class="mt-6 flex gap-4">
          <button 
            @click="toggleSeries('online')"
            :class="['px-4 py-2 rounded transition-colors', 
              showSeries.online ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700']"
          >
            線上銷售
          </button>
          <button 
            @click="toggleSeries('offline')"
            :class="['px-4 py-2 rounded transition-colors',
              showSeries.offline ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700']"
          >
            實體店銷售
          </button>
          <button 
            @click="refreshData"
            class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
          >
            刷新數據
          </button>
        </div>
      </section>

      <!-- 範例 2: 生產數據（多堆疊）+ 良率（折線） -->
      <section class="mb-12 bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-800">範例 2：生產良率監控</h2>
        
        <DualAxisComboChart
          :width="1000"
          :height="500"
          :layers="productionLayers"
          title="產線生產數量與良率趨勢"
          :show-grid="true"
          y-left-axis-label="產量 (件)"
          y-right-axis-label="良率 (%)"
          :y-right-domain="[80, 100]"
          @layer-hover="handleHover"
        >
          <template #tooltip="{ tooltipData, tooltipVisible }">
            <div 
              v-if="tooltipVisible && tooltipData"
              class="absolute bg-white border-2 border-gray-300 px-4 py-3 rounded-lg shadow-xl text-sm pointer-events-none"
              :style="{
                left: tooltipPosition.x + 'px',
                top: tooltipPosition.y + 'px',
                transform: 'translate(-50%, -120%)'
              }"
            >
              <div class="font-bold text-gray-800 mb-2">
                {{ tooltipData.data?.data?.week || tooltipData.data?.week }}
              </div>
              <div v-if="tooltipData.seriesKey" class="space-y-1">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded" :style="{ backgroundColor: getSeriesColor(tooltipData.seriesKey) }"></div>
                  <span class="text-gray-700">{{ tooltipData.seriesKey }}: {{ tooltipData.data.data[tooltipData.seriesKey] }} 件</span>
                </div>
              </div>
              <div v-else-if="tooltipData.layer.type === 'line'" class="text-green-600 font-semibold">
                良率: {{ tooltipData.data.yieldRate }}%
              </div>
            </div>
          </template>
        </DualAxisComboChart>
      </section>

      <!-- 範例 3: 複雜業務場景 -->
      <section class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold mb-4 text-gray-800">範例 3：多維度業務分析</h2>
        
        <DualAxisComboChart
          :width="1000"
          :height="500"
          :layers="complexLayers"
          title="客戶獲取成本與轉換率分析"
          :show-grid="true"
          y-left-axis-label="成本 ($)"
          y-right-axis-label="轉換率 (%)"
          :animation-duration="1000"
        />
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import * as d3 from 'd3';
import DualAxisComboChart from '../../../common/DualAxisComboChart.vue';

// === 數據狀態 ===
const showSeries = reactive({
  online: true,
  offline: true
});

const tooltipPosition = reactive({ x: 0, y: 0 });

// === 範例 1: 銷售數據 ===
const salesData = ref([
  { month: '1月', online: 120, offline: 80, profitRate: 15.2 },
  { month: '2月', online: 150, offline: 90, profitRate: 16.5 },
  { month: '3月', online: 180, offline: 110, profitRate: 18.3 },
  { month: '4月', online: 200, offline: 95, profitRate: 17.8 },
  { month: '5月', online: 220, offline: 120, profitRate: 19.2 },
  { month: '6月', online: 250, offline: 130, profitRate: 20.5 },
  { month: '7月', online: 280, offline: 140, profitRate: 21.8 },
  { month: '8月', online: 260, offline: 135, profitRate: 20.9 },
  { month: '9月', online: 290, offline: 145, profitRate: 22.3 },
  { month: '10月', online: 320, offline: 155, profitRate: 23.1 },
  { month: '11月', online: 350, offline: 170, profitRate: 24.5 },
  { month: '12月', online: 400, offline: 190, profitRate: 25.8 }
]);

const salesLayers = computed(() => {
  const stackKeys = [];
  if (showSeries.online) stackKeys.push('online');
  if (showSeries.offline) stackKeys.push('offline');

  return [
    {
      type: 'stacked-bar',
      yAxis: 'left',
      data: salesData.value,
      stackKeys: stackKeys,
      xValue: d => d.month,
      colorScale: (key) => {
        const colors = {
          online: '#3b82f6',
          offline: '#10b981'
        };
        return colors[key] || '#6b7280';
      },
      keyFn: d => d.month,
      legend: { show: true }
    },
    {
      type: 'line',
      yAxis: 'right',
      data: salesData.value,
      xValue: d => d.month,
      yValue: d => d.profitRate,
      lineColor: '#ef4444',
      strokeWidth: 3,
      showDots: true,
      keyFn: d => d.month,
      legend: { show: true, label: '利潤率' }
    }
  ];
});

// === 範例 2: 生產數據 ===
const productionData = ref([
  { week: 'W1', lineA: 1200, lineB: 1100, lineC: 900, yieldRate: 95.2 },
  { week: 'W2', lineA: 1300, lineB: 1150, lineC: 950, yieldRate: 96.1 },
  { week: 'W3', lineA: 1250, lineB: 1200, lineC: 1000, yieldRate: 94.8 },
  { week: 'W4', lineA: 1400, lineB: 1180, lineC: 980, yieldRate: 97.3 },
  { week: 'W5', lineA: 1350, lineB: 1220, lineC: 1020, yieldRate: 96.9 },
  { week: 'W6', lineA: 1500, lineB: 1250, lineC: 1050, yieldRate: 98.1 }
]);

const productionLayers = computed(() => [
  {
    type: 'stacked-bar',
    yAxis: 'left',
    data: productionData.value,
    stackKeys: ['lineA', 'lineB', 'lineC'],
    xValue: d => d.week,
    colorScale: d3.scaleOrdinal()
      .domain(['lineA', 'lineB', 'lineC'])
      .range(['#8b5cf6', '#ec4899', '#f59e0b']),
    keyFn: d => d.week
  },
  {
    type: 'line',
    yAxis: 'right',
    data: productionData.value,
    xValue: d => d.week,
    yValue: d => d.yieldRate,
    lineColor: '#10b981',
    strokeWidth: 3,
    showDots: true,
    keyFn: d => d.week
  }
]);

// === 範例 3: 複雜業務數據 ===
const complexData = ref([
  { quarter: 'Q1', advertising: 50000, events: 30000, referral: 20000, conversionRate: 12.5 },
  { quarter: 'Q2', advertising: 60000, events: 35000, referral: 25000, conversionRate: 14.2 },
  { quarter: 'Q3', advertising: 55000, events: 40000, referral: 30000, conversionRate: 15.8 },
  { quarter: 'Q4', advertising: 70000, events: 45000, referral: 35000, conversionRate: 17.3 }
]);

const complexLayers = computed(() => [
  {
    type: 'stacked-bar',
    yAxis: 'left',
    data: complexData.value,
    stackKeys: ['advertising', 'events', 'referral'],
    xValue: d => d.quarter,
    colorScale: (key) => ({
      advertising: '#f59e0b',
      events: '#8b5cf6',
      referral: '#06b6d4'
    }[key]),
    keyFn: d => d.quarter
  },
  {
    type: 'line',
    yAxis: 'right',
    data: complexData.value,
    xValue: d => d.quarter,
    yValue: d => d.conversionRate,
    lineColor: '#dc2626',
    strokeWidth: 3,
    showDots: true,
    curve: d3.curveCatmullRom.alpha(0.5),
    keyFn: d => d.quarter
  }
]);

// === 工具函數 ===
const formatCurrency = (value) => `${value}萬`;
const formatPercent = (value) => `${value}%`;
const formatValue = (value) => `${value}萬元`;

const getSeriesColor = (key) => {
  const colors = {
    lineA: '#8b5cf6',
    lineB: '#ec4899',
    lineC: '#f59e0b'
  };
  return colors[key] || '#6b7280';
};

// === 事件處理 ===
const handleClick = (event) => {
  console.log('Clicked:', event);
  alert(`點擊了: ${JSON.stringify(event.data?.data || event.data, null, 2)}`);
};

const handleHover = (event) => {
  // 可以在這裡添加更複雜的 hover 邏輯
};

const toggleSeries = (series) => {
  showSeries[series] = !showSeries[series];
};

const refreshData = () => {
  salesData.value = salesData.value.map(d => ({
    ...d,
    online: Math.round(d.online * (0.9 + Math.random() * 0.2)),
    offline: Math.round(d.offline * (0.9 + Math.random() * 0.2)),
    profitRate: +(d.profitRate * (0.95 + Math.random() * 0.1)).toFixed(1)
  }));
};

// 追蹤滑鼠位置用於 tooltip
const updateTooltipPosition = (event) => {
  tooltipPosition.x = event.clientX;
  tooltipPosition.y = event.clientY;
};

if (typeof window !== 'undefined') {
  window.addEventListener('mousemove', updateTooltipPosition);
}
</script>

<style scoped>
button:active {
  transform: scale(0.98);
}
</style>
