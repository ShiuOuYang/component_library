<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-8">
    <div class="w-full">
      
      <!-- 標題與簡介 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <div class="border-l-4 border-blue-600 pl-6">
          <h1 class="text-4xl font-bold text-gray-900 mb-4">
            DualAxisComboChart
          </h1>
          <p class="text-lg text-gray-600 leading-relaxed">
            一個基於 <span class="font-semibold text-blue-600">D3.js</span> 的企業級 Vue 3 圖表組件，
            支援<span class="font-semibold">雙 Y 軸</span>配置、
            <span class="font-semibold">堆疊長條圖</span>與<span class="font-semibold">折線圖</span>混合顯示，
            並內建 <span class="font-semibold text-green-600">Brush 框選縮放</span>功能
            （支援 <span class="font-semibold text-purple-600">雙軸模式 (XY)</span> 與 
            <span class="font-semibold text-orange-600">單軸模式 (X)</span>）、
            <span class="font-semibold text-pink-600">ResizeObserver 自動響應式</span>尺寸調整。
            適用於需要同時展示多維度數據趨勢的儀表板場景。
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Vue 3</span>
            <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">D3.js</span>
            <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">Composition API</span>
            <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">Tailwind CSS</span>
          </div>
        </div>
      </div>

      <!-- 互動操場 (Interactive Playground) -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-blue-600 mr-3">🎮</span>
          互動操場 (Interactive Playground)
        </h2>
        
        <div class="grid lg:grid-cols-3 gap-6">
          <!-- 圖表區域 (左側 2/3) -->
          <div class="lg:col-span-2 bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300" >
            <div style="width: 100%; height: 400px;">
            <DualAxisComboChart
              
              :auto-resize="true"
              :margin="playgroundMargin"
              :layers="playgroundLayers"
              :title="playgroundTitle"
              :showGrid="playgroundShowGrid"
              :animationDuration="playgroundAnimationDuration"
              :enableBrush="playgroundEnableBrush"
              :brushMode="playgroundBrushMode"
              @layer-click="handleLayerClick"
              @tooltip-show="handleTooltipShow"
              @tooltip-hide="handleLayerLeave"
              @selection-change="handleSelectionChange"
              @chart-resize="handleChartResize"
            />
            
            <!-- 使用 CommonTooltip -->
            <CommonTooltip
              :visible="tooltipVisible"
              :position="tooltipPosition"
              :data="tooltipData"
              theme="light"
              :show-arrow="false"
              :offset="{ x: 15, y: -10 }"
              max-width="sm"
              strategy="fixed"
            />
            </div>
          </div>

          <!-- 控制面板 (右側 1/3) -->
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <span class="mr-2">⚙️</span>
              控制面板
            </h3>
            
            <div class="space-y-4">
              <!-- 標題 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">圖表標題</label>
                <input
                  v-model="playgroundTitle"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="輸入標題..."
                />
              </div>

              <!-- 顯示網格 -->
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700">顯示網格</label>
                <button
                  @click="playgroundShowGrid = !playgroundShowGrid"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    playgroundShowGrid ? 'bg-blue-600' : 'bg-gray-300'
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      playgroundShowGrid ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
              </div>
              <!-- Brush 縮放 -->
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium text-gray-700">Brush 縮放</label>
                <button
                  @click="playgroundEnableBrush = !playgroundEnableBrush"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    playgroundEnableBrush ? 'bg-green-600' : 'bg-gray-300'
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      playgroundEnableBrush ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
              </div>

              <!-- Brush 模式 -->
              <div v-if="playgroundEnableBrush">
                <label class="block text-sm font-medium text-gray-700 mb-2">Brush 模式</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    @click="playgroundBrushMode = 'xy'"
                    :class="[
                      'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                      playgroundBrushMode === 'xy'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    ]"
                  >
                    📐 雙軸 (XY)
                  </button>
                  <button
                    @click="playgroundBrushMode = 'x'"
                    :class="[
                      'px-3 py-2 text-sm font-medium rounded-lg transition-all',
                      playgroundBrushMode === 'x'
                        ? 'bg-orange-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    ]"
                  >
                    📊 單軸 (X)
                  </button>
                </div>
                <p class="mt-2 text-xs text-gray-500">
                  {{ playgroundBrushMode === 'xy' 
                    ? '框選會同時縮放 X 和 Y 軸' 
                    : '框選只縮放 X 軸，Y 軸自動調整' }}
                </p>
              </div>

              <!-- 動畫時長 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  動畫時長: <span class="text-blue-600 font-semibold">{{ playgroundAnimationDuration }}ms</span>
                </label>
                <input
                  v-model.number="playgroundAnimationDuration"
                  type="range"
                  min="0"
                  max="2000"
                  step="50"
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              <!-- 隨機數據 -->
              <button
                @click="generateRandomData"
                class="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
              >
                🎲 隨機生成數據
              </button>

              <!-- 事件日誌 -->
              <div class="mt-6 pt-4 border-t border-blue-200">
                <h4 class="text-sm font-semibold text-gray-700 mb-2">事件日誌</h4>
                <div class="bg-white rounded p-3 max-h-32 overflow-y-auto text-xs font-mono text-gray-600">
                  <div v-if="eventLog.length === 0" class="text-gray-400">無事件</div>
                  <div v-for="(event, i) in eventLog" :key="i" class="mb-1">
                    {{ event }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 場景範例 (Use Cases) -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-green-600 mr-3">📊</span>
          場景範例 (Use Cases)
        </h2>

        <!-- 範例 A - 銷售報表 -->
        <SalesReportExample />

        <!-- 範例 B - 生產監控 -->
        <ProductionMonitorExample />

        <!-- 範例 C - 管制圖 (Control Chart) -->
        <ControlChartExample />

        <!-- 範例 D - 時間軸圖表 -->
        <TimeSeriesExample />

        <!-- 範例 E - 散點圖 (Scatter Plot) -->
        <ScatterPlotExample />

        <!-- 範例 F - 響應式儀表板 -->
        <ResponsiveDashboardExample />

        <!-- 範例 G - 分面圖表（多 Y 軸垂直堆疊） -->
        <FacetedChartExample />
      </div>

      <!-- API 文件 (Props & Events) -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-purple-600 mr-3">📚</span>
          API 文件
        </h2>

        <!-- Props -->
        <div class="mb-8">
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">Props</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-300">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    屬性名稱
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    型別
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    預設值
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    說明
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="prop in propsDoc" :key="prop.name">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                    {{ prop.name }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {{ prop.type }}
                  </td>
                  <td class="px-6 py-4 text-sm font-mono text-gray-500">
                    {{ prop.default }}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-700">
                    {{ prop.description }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Events -->
        <div>
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">Events</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-300">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    事件名稱
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    參數
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    說明
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="event in eventsDoc" :key="event.name">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-purple-600">
                    @{{ event.name }}
                  </td>
                  <td class="px-6 py-4 text-sm font-mono text-gray-900">
                    {{ event.params }}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-700">
                    {{ event.description }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import DualAxisComboChart from '../../components/common/DualAxisComboChart.vue';
import FacetedChart from '../../components/common/FacetedChart.vue';
import CommonTooltip from '../../components/common/CommonTooltip.vue';
import CodeBlock from '../../components/common/CodeBlock.vue';
import SalesReportExample from '../../components/docs/DualAxisChartexamples/SalesReportExample.vue';
import ProductionMonitorExample from '../../components/docs/DualAxisChartexamples/ProductionMonitorExample.vue';
import ControlChartExample from '../../components/docs/DualAxisChartexamples/ControlChartExample.vue';
import TimeSeriesExample from '../../components/docs/DualAxisChartexamples/TimeSeriesExample.vue';
import ScatterPlotExample from '../../components/docs/DualAxisChartexamples/ScatterPlotExample.vue';
import ResponsiveDashboardExample from '../../components/docs/DualAxisChartexamples/ResponsiveDashboardExample.vue';
import FacetedChartExample from '../../components/docs/DualAxisChartexamples/FacetedChartExample.vue';
import * as d3 from 'd3';

// ========== 互動操場狀態 ==========
const playgroundWidth = ref(500);
const playgroundHeight = ref(450);
const playgroundMargin = ref({ top: 60, right: 80, bottom: 60, left: 80 });
const playgroundTitle = ref('互動式雙軸組合圖');
const playgroundShowGrid = ref(true);
const playgroundAutoResize = ref(false);
const playgroundEnableBrush = ref(true);
const playgroundBrushMode = ref('x'); // 'xy' | 'x'
const playgroundAnimationDuration = ref(750);

const playgroundData = ref([
  { category: 'A', value1: 100, value2: 80, line: 25 },
  { category: 'B', value1: 150, value2: 120, line: 32 },
  { category: 'C', value1: 200, value2: 90, line: 28 },
  { category: 'D', value1: 180, value2: 110, line: 35 },
  { category: 'E', value1: 220, value2: 130, line: 40 }
]);

const playgroundLayers = computed(() => [
  {
    type: 'stacked-bar',
    data: playgroundData.value,
    yAxis: 'left',
    stackKeys: ['value1', 'value2'],
    xValue: d => d.category,
    colorScale: (key) => key === 'value1' ? '#3b82f6' : '#10b981',
    legend: { show: true }
  },
  {
    type: 'line',
    data: playgroundData.value,
    yAxis: 'right',
    xValue: d => d.category,
    yValue: d => d.line,
    lineColor: '#ef4444',
    strokeWidth: 2,
    showDots: true,
    legend: { show: true, label: '趨勢線' }
  }
]);

const tooltipVisible = ref(false);
const tooltipPosition = ref({ x: 0, y: 0 });
const tooltipData = ref({ title: '', items: [] });
const eventLog = ref([]);

const addEventLog = (message) => {
  eventLog.value.unshift(`[${new Date().toLocaleTimeString()}] ${message}`);
  if (eventLog.value.length > 5) eventLog.value.pop();
};

const handleLayerClick = (payload) => {
  addEventLog(`🖱️ 點擊: ${JSON.stringify(payload.data?.data?.category || payload.data?.category)}`);
};

const handleTooltipShow = (payload) => {
  const { data, layer, seriesKey, position } = payload;
  
  // 設定 tooltip 位置
  tooltipPosition.value = {
    x: position.pageX,
    y: position.pageY
  };
  
  // 格式化 tooltip 數據
  const items = [];
  
  // 堆疊長條圖數據
  if (data?.data) {
    const xValue = layer.xValue(data.data);
    const value = data[1] - data[0];
    items.push({
      label: xValue,
      value: value.toFixed(0)
    });
  }
  // 折線圖數據
  else if (data) {
    const xValue = layer.xValue(data);
    const yValue = layer.yValue(data);
    items.push({
      label: xValue,
      value: yValue.toFixed(2)
    });
  }
  
  tooltipData.value = {
    title: seriesKey || '數據',
    items
  };
  
  tooltipVisible.value = true;
};

const handleLayerLeave = () => {
  tooltipVisible.value = false;
};

const handleSelectionChange = (payload) => {
  addEventLog(`📐 Brush 選取: X=${payload.xDomain?.length || 0} 項`);
};

const handleChartResize = (payload) => {
  addEventLog(`📏 圖表調整大小: ${payload.width}x${payload.height}`);
};

const generateRandomData = () => {
  const categories = ['A', 'B', 'C', 'D', 'E', 'F'];
  playgroundData.value = categories.map(cat => ({
    category: cat,
    value1: Math.floor(Math.random() * 200) + 50,
    value2: Math.floor(Math.random() * 150) + 50,
    line: Math.floor(Math.random() * 50) + 20
  }));
  addEventLog('🎲 數據已重新生成');
};

// ========== API 文件數據 ==========
const propsDoc = [
  {
    name: 'width',
    type: 'Number',
    default: '800',
    description: '圖表寬度（像素）'
  },
  {
    name: 'height',
    type: 'Number',
    default: '500',
    description: '圖表高度（像素）'
  },
  {
    name: 'autoResize',
    type: 'Boolean',
    default: 'false',
    description: '啟用自動響應容器大小變化（使用 ResizeObserver）'
  },
  {
    name: 'debounceDelay',
    type: 'Number',
    default: '150',
    description: 'ResizeObserver 防抖延遲時間（毫秒）'
  },
  {
    name: 'margin',
    type: 'Object',
    default: '{ top: 60, right: 80, bottom: 60, left: 80 }',
    description: '圖表邊距配置'
  },
  {
    name: 'layers',
    type: 'Array&lt;Layer&gt;',
    default: '必填',
    description: '圖層配置陣列，支援 stacked-bar、line、scatter、area 類型'
  },
  {
    name: 'title',
    type: 'String',
    default: '\'\'',
    description: '圖表標題'
  },
  {
    name: 'showGrid',
    type: 'Boolean',
    default: 'true',
    description: '是否顯示背景網格線'
  },
  {
    name: 'xScaleType',
    type: 'String',
    default: '\'band\'',
    description: 'X 軸類型：band | linear | time'
  },
  {
    name: 'yLeftScaleType',
    type: 'String',
    default: '\'linear\'',
    description: '左 Y 軸類型：linear | log | sqrt'
  },
  {
    name: 'yRightScaleType',
    type: 'String',
    default: '\'linear\'',
    description: '右 Y 軸類型：linear | log | sqrt'
  },
  {
    name: 'animationDuration',
    type: 'Number',
    default: '750',
    description: '動畫過渡時長（毫秒）'
  },
  {
    name: 'enableBrush',
    type: 'Boolean',
    default: 'true',
    description: '是否啟用框選縮放功能'
  },
  {
    name: 'brushMode',
    type: 'String',
    default: '\'x\'',
    description: 'Brush 模式："xy" (雙軸框選) 或 "x" (單軸框選，Y 軸自動調整)'
  },
  {
    name: 'triggerLines',
    type: 'Array&lt;TriggerLine&gt;',
    default: '[]',
    description: 'Trigger 線配置陣列，用於繪製管制圖的參考線（UCL/LCL/CL）'
  },
  {
    name: 'xAxisLabel',
    type: 'String',
    default: '\'\'',
    description: 'X 軸標籤文字'
  },
  {
    name: 'yLeftAxisLabel',
    type: 'String',
    default: '\'\'',
    description: '左 Y 軸標籤文字'
  },
  {
    name: 'yRightAxisLabel',
    type: 'String',
    default: '\'\'',
    description: '右 Y 軸標籤文字'
  }
];

const eventsDoc = [
  {
    name: 'layer-click',
    params: '{ data, layer, series }',
    description: '當點擊圖表元素時觸發'
  },
  {
    name: 'layer-hover',
    params: '{ data, layer, seriesKey }',
    description: '當滑鼠懸停在圖表元素時觸發'
  },
  {
    name: 'tooltip-show',
    params: '{ position, data, layer, seriesKey }',
    description: '當 tooltip 顯示時觸發'
  },
  {
    name: 'tooltip-hide',
    params: '-',
    description: '當 tooltip 隱藏時觸發'
  },
  {
    name: 'selection-change',
    params: '{ xDomain, yLeftDomain, yRightDomain, mode }',
    description: '當 Brush 選取範圍改變時觸發（mode 表示當前模式："xy" 或 "x"）'
  },
  {
    name: 'zoom-reset',
    params: '-',
    description: '當重置縮放時觸發'
  },
  {
    name: 'chart-ready',
    params: '{ scales, dimensions }',
    description: '當圖表初始化完成時觸發'
  },
  {
    name: 'chart-resize',
    params: '{ width, height, chartWidth, chartHeight }',
    description: '當圖表尺寸變化時觸發（僅在 autoResize 為 true 時）'
  }
];

</script>

<style scoped>
/* 自定義 Range Slider 樣式 */
.slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  cursor: pointer;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  cursor: pointer;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  border: none;
}


</style>
