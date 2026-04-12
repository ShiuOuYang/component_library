<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      
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
            並內建 <span class="font-semibold text-green-600">Brush 框選縮放</span>功能。
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
          <div class="lg:col-span-2 bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300">
            <DualAxisComboChart
              :width="playgroundWidth"
              :height="playgroundHeight"
              :margin="playgroundMargin"
              :layers="playgroundLayers"
              :title="playgroundTitle"
              :showGrid="playgroundShowGrid"
              :animationDuration="playgroundAnimationDuration"
              :enableBrush="playgroundEnableBrush"
              @layer-click="handleLayerClick"
              @layer-hover="handleLayerHover"
              @selection-change="handleSelectionChange"
            >
              <template #tooltip="{ tooltipData, tooltipVisible }">
                <div
                  v-if="tooltipVisible && tooltipData"
                  class="absolute bg-gray-900 text-white text-sm px-3 py-2 rounded shadow-lg pointer-events-none"
                  :style="tooltipStyle"
                >
                  <div v-if="tooltipData.seriesKey" class="font-semibold">{{ tooltipData.seriesKey }}</div>
                  <div v-if="tooltipData.data?.data">
                    {{ tooltipData.layer.xValue(tooltipData.data.data) }}: 
                    {{ tooltipData.data[1] - tooltipData.data[0] }}
                  </div>
                  <div v-else-if="tooltipData.data">
                    {{ tooltipData.layer.xValue(tooltipData.data) }}: 
                    {{ tooltipData.layer.yValue(tooltipData.data) }}
                  </div>
                </div>
              </template>
            </DualAxisComboChart>
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
        <div class="mb-8">
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">範例 A：銷售報表</h3>
          <p class="text-gray-600 mb-4">
            左軸顯示 <span class="font-semibold text-blue-600">線上與線下銷售額</span>（堆疊長條圖），
            右軸顯示 <span class="font-semibold text-red-600">利潤率趨勢</span>（折線圖）。
          </p>
          
          <div class="grid lg:grid-cols-2 gap-6">
            <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <DualAxisComboChart
                :width="600"
                :height="400"
                :layers="salesLayers"
                title="月度銷售與利潤率分析"
                :showGrid="true"
                :enableBrush="true"
              />
            </div>
            
            <div class="bg-gray-900 rounded-xl p-4 overflow-x-auto">
              <pre class="text-green-400 text-sm"><code>const salesLayers = [
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
];</code></pre>
            </div>
          </div>
        </div>

        <!-- 範例 B - 生產監控 -->
        <div>
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">範例 B：生產監控</h3>
          <p class="text-gray-600 mb-4">
            左軸顯示 <span class="font-semibold text-green-600">良品與不良品數量</span>（堆疊長條圖），
            右軸顯示 <span class="font-semibold text-orange-600">設備稼動率</span>（折線圖）。
          </p>
          
          <div class="grid lg:grid-cols-2 gap-6">
            <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <DualAxisComboChart
                :width="600"
                :height="400"
                :layers="productionLayers"
                title="生產良率與稼動率監控"
                :showGrid="true"
                :enableBrush="true"
              />
            </div>
            
            <div class="bg-gray-900 rounded-xl p-4 overflow-x-auto">
              <pre class="text-green-400 text-sm"><code>const productionLayers = [
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
];</code></pre>
            </div>
          </div>
        </div>
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
import DualAxisComboChart from '../components/common/DualAxisComboChart.vue';
import * as d3 from 'd3';

// ========== 互動操場狀態 ==========
const playgroundWidth = ref(700);
const playgroundHeight = ref(450);
const playgroundMargin = ref({ top: 60, right: 80, bottom: 60, left: 80 });
const playgroundTitle = ref('互動式雙軸組合圖');
const playgroundShowGrid = ref(true);
const playgroundEnableBrush = ref(true);
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

const tooltipStyle = ref({});
const eventLog = ref([]);

const addEventLog = (message) => {
  eventLog.value.unshift(`[${new Date().toLocaleTimeString()}] ${message}`);
  if (eventLog.value.length > 5) eventLog.value.pop();
};

const handleLayerClick = (payload) => {
  addEventLog(`🖱️ 點擊: ${JSON.stringify(payload.data?.data?.category || payload.data?.category)}`);
};

const handleLayerHover = (payload) => {
  tooltipStyle.value = {
    left: `${payload.position.containerX + 10}px`,
    top: `${payload.position.containerY - 10}px`
  };
};

const handleSelectionChange = (payload) => {
  addEventLog(`📐 Brush 選取: X=${payload.xDomain?.length || 0} 項`);
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

// ========== 範例 A - 銷售報表 ==========
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

// ========== 範例 B - 生產監控 ==========
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
    name: 'margin',
    type: 'Object',
    default: '{ top: 60, right: 80, bottom: 60, left: 80 }',
    description: '圖表邊距配置'
  },
  {
    name: 'layers',
    type: 'Array<Layer>',
    default: '必填',
    description: '圖層配置陣列，支援 stacked-bar、line、area 類型'
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
    params: '{ xDomain, yLeftDomain, yRightDomain }',
    description: '當 Brush 選取範圍改變時觸發'
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

/* 程式碼區塊滾動條樣式 */
pre {
  scrollbar-width: thin;
  scrollbar-color: #4b5563 #1f2937;
}

pre::-webkit-scrollbar {
  height: 8px;
}

pre::-webkit-scrollbar-track {
  background: #1f2937;
}

pre::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 4px;
}

pre::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
</style>
