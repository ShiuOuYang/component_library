<template>
  <div class="p-8 bg-gray-50 min-h-screen">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-8">使用配置工廠的企業級範例</h1>

      <!-- 範例 1: 使用快速配置 -->
      <section class="mb-12 bg-white rounded-lg shadow-md p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gray-800">快速配置：銷售分析</h2>
          <button 
            @click="scenario = 'sales'"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            切換到銷售場景
          </button>
        </div>
        
        <DualAxisComboChart
          v-bind="salesConfig"
          @layer-click="handleLayerClick"
        />
      </section>

      <!-- 範例 2: 使用構建器模式 -->
      <section class="mb-12 bg-white rounded-lg shadow-md p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gray-800">構建器模式：自定義配置</h2>
          <div class="flex gap-2">
            <button 
              @click="toggleCurveType"
              class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              曲線類型: {{ curveType }}
            </button>
            <button 
              @click="toggleColorScheme"
              class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              配色: {{ colorScheme }}
            </button>
          </div>
        </div>
        
        <DualAxisComboChart
          v-bind="customConfig"
          @layer-hover="handleLayerHover"
        />
      </section>

      <!-- 範例 3: 場景工廠 - 多個預設場景 -->
      <section class="mb-12 bg-white rounded-lg shadow-md p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gray-800">場景切換</h2>
          <div class="flex gap-2">
            <button 
              v-for="s in scenarios"
              :key="s.key"
              @click="currentScenario = s.key"
              :class="[
                'px-4 py-2 rounded transition-colors',
                currentScenario === s.key 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              ]"
            >
              {{ s.label }}
            </button>
          </div>
        </div>
        
        <DualAxisComboChart
          v-bind="scenarioConfig"
          @chart-ready="handleChartReady"
        />
        
        <!-- 數據摘要 -->
        <div class="mt-4 grid grid-cols-4 gap-4">
          <div 
            v-for="stat in scenarioStats"
            :key="stat.label"
            class="bg-gray-50 rounded p-4"
          >
            <div class="text-sm text-gray-600">{{ stat.label }}</div>
            <div class="text-2xl font-bold text-gray-900">{{ stat.value }}</div>
            <div 
              :class="[
                'text-xs',
                stat.change >= 0 ? 'text-green-600' : 'text-red-600'
              ]"
            >
              {{ stat.change >= 0 ? '↑' : '↓' }} {{ Math.abs(stat.change) }}%
            </div>
          </div>
        </div>
      </section>

      <!-- 範例 4: 響應式圖表 -->
      <section class="bg-white rounded-lg shadow-md p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gray-800">響應式配置</h2>
          <div class="flex gap-2">
            <button 
              @click="chartSize = 'small'"
              :class="sizeButtonClass('small')"
            >
              小
            </button>
            <button 
              @click="chartSize = 'medium'"
              :class="sizeButtonClass('medium')"
            >
              中
            </button>
            <button 
              @click="chartSize = 'large'"
              :class="sizeButtonClass('large')"
            >
              大
            </button>
          </div>
        </div>
        
        <div class="transition-all duration-300">
          <DualAxisComboChart
            v-bind="responsiveConfig"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import * as d3 from 'd3';
import DualAxisComboChart from '@/components/library/charts/DualAxisComboChart.vue';
import {
  ChartConfigFactory,
  DualAxisChartBuilder,
  StackedBarLayerBuilder,
  LineLayerBuilder,
  AxisConfigBuilder,
  quickConfig,
  COLOR_SCHEMES,
  FORMATTERS
} from '../utils/chartConfigFactory';

// === 數據 ===
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

const productionData = ref([
  { week: 'W1', lineA: 1200, lineB: 1100, lineC: 900, yieldRate: 95.2 },
  { week: 'W2', lineA: 1300, lineB: 1150, lineC: 950, yieldRate: 96.1 },
  { week: 'W3', lineA: 1250, lineB: 1200, lineC: 1000, yieldRate: 94.8 },
  { week: 'W4', lineA: 1400, lineB: 1180, lineC: 980, yieldRate: 97.3 },
  { week: 'W5', lineA: 1350, lineB: 1220, lineC: 1020, yieldRate: 96.9 },
  { week: 'W6', lineA: 1500, lineB: 1250, lineC: 1050, yieldRate: 98.1 }
]);

const financialData = ref([
  { quarter: 'Q1', revenue: 50000, cost: 35000, netMargin: 15.5 },
  { quarter: 'Q2', revenue: 60000, cost: 40000, netMargin: 18.2 },
  { quarter: 'Q3', revenue: 55000, cost: 38000, netMargin: 16.8 },
  { quarter: 'Q4', revenue: 70000, cost: 45000, netMargin: 20.1 }
]);

const customerData = ref([
  { month: '1月', new: 120, returning: 450, churned: 30, conversionRate: 12.5 },
  { month: '2月', new: 150, returning: 480, churned: 35, conversionRate: 14.2 },
  { month: '3月', new: 180, returning: 520, churned: 25, conversionRate: 15.8 },
  { month: '4月', new: 200, returning: 550, churned: 40, conversionRate: 13.9 },
  { month: '5月', new: 220, returning: 580, churned: 28, conversionRate: 16.5 },
  { month: '6月', new: 250, returning: 620, churned: 32, conversionRate: 17.3 }
]);

// === 狀態 ===
const scenario = ref('sales');
const curveType = ref('smooth');
const colorScheme = ref('business');
const currentScenario = ref('sales');
const chartSize = ref('medium');

// === 範例 1: 快速配置 ===
const salesConfig = computed(() => {
  return quickConfig.simpleSales(salesData.value);
});

// === 範例 2: 構建器模式 - 高度自定義 ===
const customConfig = computed(() => {
  const curves = {
    smooth: d3.curveMonotoneX,
    linear: d3.curveLinear,
    step: d3.curveStep,
    catmull: d3.curveCatmullRom.alpha(0.5)
  };

  return new DualAxisChartBuilder()
    .size(1000, 500)
    .title('自定義配置圖表')
    .margin({ top: 60, right: 80, bottom: 60, left: 80 })
    .addLayer(
      new StackedBarLayerBuilder()
        .data(salesData.value)
        .yAxis('left')
        .stackKeys(['online', 'offline'])
        .xValue(d => d.month)
        .useColorScheme(colorScheme.value)
        .keyFn(d => d.month)
        .legend({ show: true })
        .build()
    )
    .addLayer(
      new LineLayerBuilder()
        .data(salesData.value)
        .yAxis('right')
        .xValue(d => d.month)
        .yValue(d => d.profitRate)
        .lineColor(COLOR_SCHEMES.business.accent)
        .strokeWidth(3)
        .showDots(true)
        .curve(curves[curveType.value])
        .keyFn(d => d.month)
        .legend({ show: true, label: '利潤率' })
        .build()
    )
    .yLeftAxis(
      new AxisConfigBuilder()
        .label('銷售額 (萬元)')
        .useFormatter('currency', 0)
        .build()
    )
    .yRightAxis(
      new AxisConfigBuilder()
        .label('利潤率 (%)')
        .useFormatter('percent', 1)
        .build()
    )
    .showGrid(true)
    .animationDuration(750)
    .build();
});

// === 範例 3: 場景切換 ===
const scenarios = [
  { key: 'sales', label: '銷售分析' },
  { key: 'production', label: '生產監控' },
  { key: 'financial', label: '財務報表' },
  { key: 'customer', label: '客戶分析' }
];

const scenarioConfig = computed(() => {
  const configs = {
    sales: new DualAxisChartBuilder()
      .size(1000, 500)
      .title('2024 年銷售分析')
      .addLayers(ChartConfigFactory.salesAnalysis(salesData.value))
      .yLeftAxis(
        new AxisConfigBuilder()
          .label('銷售額 (萬元)')
          .useFormatter('abbreviated')
          .build()
      )
      .yRightAxis(
        new AxisConfigBuilder()
          .label('利潤率 (%)')
          .useFormatter('percent', 1)
          .build()
      )
      .build(),

    production: new DualAxisChartBuilder()
      .size(1000, 500)
      .title('產線生產監控')
      .addLayers(ChartConfigFactory.productionMonitoring(productionData.value))
      .yLeftAxis(
        new AxisConfigBuilder()
          .label('產量 (件)')
          .useFormatter('abbreviated')
          .build()
      )
      .yRightAxis(
        new AxisConfigBuilder()
          .label('良率 (%)')
          .domain([80, 100])
          .useFormatter('percent', 1)
          .build()
      )
      .build(),

    financial: new DualAxisChartBuilder()
      .size(1000, 500)
      .title('季度財務報表')
      .addLayers(ChartConfigFactory.financialReport(financialData.value))
      .yLeftAxis(
        new AxisConfigBuilder()
          .label('金額 ($)')
          .useFormatter('abbreviated')
          .build()
      )
      .yRightAxis(
        new AxisConfigBuilder()
          .label('淨利率 (%)')
          .useFormatter('percent', 1)
          .build()
      )
      .build(),

    customer: new DualAxisChartBuilder()
      .size(1000, 500)
      .title('客戶數據分析')
      .addLayers(ChartConfigFactory.customerAnalysis(customerData.value))
      .yLeftAxis(
        new AxisConfigBuilder()
          .label('客戶數')
          .useFormatter('abbreviated')
          .build()
      )
      .yRightAxis(
        new AxisConfigBuilder()
          .label('轉換率 (%)')
          .useFormatter('percent', 1)
          .build()
      )
      .build()
  };

  return configs[currentScenario.value];
});

// 場景統計數據
const scenarioStats = computed(() => {
  const stats = {
    sales: [
      { label: '總銷售額', value: '2,965萬', change: 12.5 },
      { label: '線上銷售', value: '2,050萬', change: 15.8 },
      { label: '平均利潤率', value: '20.2%', change: 8.3 },
      { label: '增長趨勢', value: '向上', change: 5.2 }
    ],
    production: [
      { label: '總產量', value: '21,140件', change: 8.9 },
      { label: '平均良率', value: '96.4%', change: 2.1 },
      { label: '產線A', value: '8,000件', change: 11.2 },
      { label: '效率提升', value: '5.8%', change: 5.8 }
    ],
    financial: [
      { label: '總收入', value: '$235K', change: 18.5 },
      { label: '總成本', value: '$158K', change: 12.2 },
      { label: '平均淨利率', value: '17.7%', change: 6.3 },
      { label: '最佳季度', value: 'Q4', change: 20.1 }
    ],
    customer: [
      { label: '總客戶數', value: '4,170', change: 15.2 },
      { label: '新客戶', value: '1,120', change: 25.8 },
      { label: '平均轉換率', value: '15.0%', change: 8.9 },
      { label: '流失率', value: '4.8%', change: -12.5 }
    ]
  };

  return stats[currentScenario.value] || stats.sales;
});

// === 範例 4: 響應式配置 ===
const chartSizes = {
  small: { width: 600, height: 300 },
  medium: { width: 800, height: 400 },
  large: { width: 1200, height: 600 }
};

const responsiveConfig = computed(() => {
  const size = chartSizes[chartSize.value];
  
  return new DualAxisChartBuilder()
    .size(size.width, size.height)
    .title(`響應式圖表 (${chartSize.value.toUpperCase()})`)
    .addLayers(ChartConfigFactory.salesAnalysis(salesData.value))
    .yLeftAxis(
      new AxisConfigBuilder()
        .label('銷售額')
        .useFormatter('abbreviated')
        .build()
    )
    .yRightAxis(
      new AxisConfigBuilder()
        .label('利潤率')
        .useFormatter('percent')
        .build()
    )
    .animationDuration(chartSize.value === 'large' ? 1000 : 500)
    .build();
});

// === 工具函數 ===
const toggleCurveType = () => {
  const types = ['smooth', 'linear', 'step', 'catmull'];
  const currentIndex = types.indexOf(curveType.value);
  curveType.value = types[(currentIndex + 1) % types.length];
};

const toggleColorScheme = () => {
  const schemes = ['business', 'enterprise', 'colorblind'];
  const currentIndex = schemes.indexOf(colorScheme.value);
  colorScheme.value = schemes[(currentIndex + 1) % schemes.length];
};

const sizeButtonClass = (size) => {
  return [
    'px-4 py-2 rounded transition-colors',
    chartSize.value === size
      ? 'bg-blue-500 text-white'
      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
  ];
};

// === 事件處理 ===
const handleLayerClick = (event) => {
  console.log('Layer clicked:', event);
};

const handleLayerHover = (event) => {
  console.log('Layer hovered:', event);
};

const handleChartReady = (event) => {
  console.log('Chart ready:', event);
};
</script>

<style scoped>
button:active {
  transform: scale(0.98);
}

.transition-all {
  transition: all 0.3s ease-in-out;
}
</style>
