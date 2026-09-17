<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <h1 class="text-3xl font-bold mb-8 text-gray-800">ReusableBarChart 測試頁面</h1>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Case 1: Basic Usage -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4 text-gray-700">1. 基本用法 (Basic Usage)</h2>
        <p class="text-gray-500 mb-4 text-sm">使用預設設定，僅傳入 data。</p>
        <ReusableBarChart 
          :data="basicData" 
          :width="500" 
          :height="300"
          title="季度銷售額"
          @tooltip-show="showTooltip"
          @tooltip-move="moveTooltip"
          @tooltip-hide="hideTooltip"
        />
      </div>

      <!-- Case 2: Custom Accessors & Colors -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4 text-gray-700">2. 自定義 Accessor 與顏色</h2>
        <p class="text-gray-500 mb-4 text-sm">自定義 x/y 欄位、顏色比例尺、顯示數值標籤。</p>
        <ReusableBarChart 
          :data="fruitData" 
          :width="500" 
          :height="300"
          :x-value="d => d.fruit"
          :y-value="d => d.count"
          :key-fn="d => d.fruit"
          :color-scale="fruitColorScale"
          :show-labels="true"
          :format-value="d => d + ' 個'"
          title="水果庫存量"
          @tooltip-show="showTooltip"
          @tooltip-move="moveTooltip"
          @tooltip-hide="hideTooltip"
        />
      </div>

      <!-- Case 3: Custom Scale Factory (Log Scale) -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4 text-gray-700">3. 進階：注入 Scale Factory (Log Scale)</h2>
        <p class="text-gray-500 mb-4 text-sm">使用 yScaleFactory 注入對數刻度 (Log Scale) 來處理差異巨大的數據。</p>
        <ReusableBarChart 
          :data="exponentialData" 
          :width="500" 
          :height="300"
          :y-scale-factory="logScaleFactory"
          :y-axis-factory="logAxisFactory"
          title="指數成長數據 (Log Scale)"
          color-scale="#8884d8"
          :show-labels="true"
          @tooltip-show="showTooltip"
          @tooltip-move="moveTooltip"
          @tooltip-hide="hideTooltip"
        />
      </div>

      <!-- Case 4: Interactive Data Update -->
      <div class="bg-white p-6 rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4 text-gray-700">4. 動態數據更新</h2>
        <div class="flex gap-2 mb-4">
          <button type="button" @click="randomizeData" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition">隨機數據</button>
          <button type="button" @click="addData" class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition">新增一筆</button>
          <button type="button" @click="removeData" class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition">移除一筆</button>
        </div>
        <ReusableBarChart 
          :data="dynamicData" 
          :width="500" 
          :height="300"
          title="即時監控數據"
          color-scale="#82ca9d"
          :show-labels="true"
          @tooltip-show="showTooltip"
          @tooltip-move="moveTooltip"
          @tooltip-hide="hideTooltip"
        />
      </div>
    </div>

    <!-- Global Tooltip -->
    <div 
      v-if="tooltip.visible"
      class="fixed bg-gray-900 text-white text-sm px-3 py-2 rounded shadow-lg pointer-events-none z-50 transform -translate-x-1/2 -translate-y-full mt-[-8px]"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >
      <div class="font-bold">{{ tooltip.title }}</div>
      <div>數值: {{ tooltip.value }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import * as d3 from 'd3';
import ReusableBarChart from './components/ReusableBarChart.vue';

// --- Data for Case 1 ---
const basicData = [
  { name: 'Q1', value: 120 },
  { name: 'Q2', value: 200 },
  { name: 'Q3', value: 150 },
  { name: 'Q4', value: 280 },
];

// --- Data for Case 2 ---
const fruitData = [
  { fruit: 'Apple', count: 50 },
  { fruit: 'Banana', count: 80 },
  { fruit: 'Cherry', count: 30 },
  { fruit: 'Date', count: 60 },
];
const fruitColorScale = d3.scaleOrdinal()
  .domain(['Apple', 'Banana', 'Cherry', 'Date'])
  .range(['#ff6b6b', '#feca57', '#ff9ff3', '#54a0ff']);

// --- Data for Case 3 (Log Scale) ---
const exponentialData = [
  { name: '10^1', value: 10 },
  { name: '10^2', value: 100 },
  { name: '10^3', value: 1000 },
  { name: '10^4', value: 10000 },
  { name: '10^5', value: 100000 },
];

const logScaleFactory = ({ d3, data, yValue, height }) => {
  return d3.scaleLog()
    .domain([1, d3.max(data, yValue)]) // Log scale domain cannot include 0
    .range([height, 0])
    .nice();
};

const logAxisFactory = ({ d3, yScale }) => {
  return d3.axisLeft(yScale).ticks(5, "~s"); // Format ticks for log scale
};

// --- Data for Case 4 (Dynamic) ---
const dynamicData = ref([
  { name: 'A', value: 30 },
  { name: 'B', value: 80 },
  { name: 'C', value: 45 },
  { name: 'D', value: 60 },
  { name: 'E', value: 20 },
  { name: 'F', value: 90 },
]);

const randomizeData = () => {
  dynamicData.value = dynamicData.value.map(d => ({
    ...d,
    value: Math.floor(Math.random() * 100) + 10
  }));
};

const addData = () => {
  const nextChar = String.fromCharCode(65 + dynamicData.value.length); // A, B, C...
  dynamicData.value.push({
    name: nextChar,
    value: Math.floor(Math.random() * 100) + 10
  });
};

const removeData = () => {
  if (dynamicData.value.length > 0) {
    dynamicData.value.pop();
  }
};

// --- Tooltip Logic ---
const tooltip = reactive({
  visible: false,
  x: 0,
  y: 0,
  title: '',
  value: ''
});

const showTooltip = ({ position, data }) => {
  tooltip.visible = true;
  tooltip.x = position.pageX;
  tooltip.y = position.pageY;
  
  // Determine title/value based on data structure (simple heuristic)
  if (data.fruit) {
    tooltip.title = data.fruit;
    tooltip.value = data.count;
  } else {
    tooltip.title = data.name;
    tooltip.value = data.value;
  }
};

const moveTooltip = ({ position }) => {
  tooltip.x = position.pageX;
  tooltip.y = position.pageY;
};

const hideTooltip = () => {
  tooltip.visible = false;
};
</script>
