<template>
  <div class="vanilla-js-svg">
    <!-- Learning Objectives -->
    <div class="bg-gradient-to-r from-pink-100 to-rose-100 border border-pink-300 rounded-lg p-5 mb-6">
      <h3 class="text-xl font-bold text-pink-800 mb-3 flex items-center gap-2">
        <span class="text-2xl">🎯</span>
        學習目標
      </h3>
      <p class="text-gray-700 leading-relaxed">
        掌握如何使用 Vanilla JavaScript 動態創建和操作 SVG 元素。這是理解 <strong>D3 內部如何運作</strong>的關鍵——D3 就是封裝了這些操作，讓編碼更加優雅。
      </p>
    </div>

    <!-- Learning Guide -->
    <div class="bg-pink-50 border-l-4 border-pink-500 p-4 mb-6">
      <h3 class="text-lg font-bold text-pink-700 mb-2">學習重點：使用 JavaScript 操作 SVG</h3>
      <ul class="list-disc list-inside text-gray-700 space-y-1">
        <li><strong>命名空間 (Namespace)：</strong> 創建 SVG 元素必須使用 <code>document.createElementNS</code>，並指定 SVG NS URI (<code>http://www.w3.org/2000/svg</code>)。</li>
        <li><strong>屬性設定：</strong> 使用 <code>setAttribute</code> 設定 SVG 屬性 (如 x, y, width, fill)。</li>
        <li><strong>動態更新：</strong> 透過清除內容 (<code>innerHTML = ''</code>) 或修改現有元素的屬性來更新圖表。</li>
        <li><strong>互動性：</strong> 可以像 HTML 元素一樣添加事件監聽器 (<code>addEventListener</code>)。</li>
      </ul>
    </div>

    <h2 class="text-xl font-bold text-pink-600 mb-4">1️⃣ 創建 SVG 元素的正確方式</h2>
    <div class="mb-4">
      <div ref="chart1Container" class="border border-gray-200 bg-white h-[200px] mb-2"></div>
      <div class="flex gap-2">
        <button type="button" @click="createCircle" class="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 transition">創建圓形</button>
        <button type="button" @click="createRect" class="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 transition">創建矩形</button>
        <button type="button" @click="clearChart1" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition">清除所有</button>
      </div>
    </div>

    <div class="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
      <h3 class="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
        <span>💻</span>
        程式碼說明：創建 SVG 元素
      </h3>
      <div class="bg-white p-4 rounded shadow-sm">
        <div class="bg-red-50 border-l-4 border-red-400 p-3 mb-3">
          <p class="text-sm text-red-800"><strong>⚠️ 錯誤做法：</strong></p>
          <pre class="text-xs mt-2 bg-white p-2 rounded"><code>// ✘ 這樣不會工作！
const circle = document.createElement('circle');  // 錯！
circle.setAttribute('cx', 100);
svg.appendChild(circle);  // 不會顯示</code></pre>
        </div>
        <div class="bg-green-50 border-l-4 border-green-400 p-3">
          <p class="text-sm text-green-800"><strong>✔️ 正確做法：</strong></p>
          <pre class="text-xs mt-2 bg-white p-2 rounded"><code>// ✔ 必須使用 createElementNS
const svgNS = "http://www.w3.org/2000/svg";
const circle = document.createElementNS(svgNS, 'circle');
circle.setAttribute('cx', 100);
circle.setAttribute('cy', 50);
circle.setAttribute('r', 40);
circle.setAttribute('fill', '#4CAF50');
svg.appendChild(circle);  // 會正確顯示</code></pre>
        </div>
        <p class="text-sm text-gray-600 mt-3">
          💡 <strong>原因：</strong>SVG 元素屬於 XML 命名空間，與 HTML 不同，必須使用 <code>createElementNS</code> 並指定命名空間 URI。
        </p>
      </div>
    </div>

    <h2 class="text-xl font-bold text-pink-600 mb-4 mt-8">2️⃣ 動態生成長條圖</h2>
    <div class="mb-4">
      <div ref="chart2Container" class="border border-gray-200 bg-white h-[300px] mb-2"></div>
      <div class="flex gap-2">
        <button type="button" @click="generateBarChart" class="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 transition">生成長條圖</button>
        <button type="button" @click="updateData" class="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 transition">更新數據</button>
        <button type="button" @click="sortBars" class="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 transition">排序長條</button>
      </div>
    </div>

    <div class="bg-purple-50 border border-purple-200 rounded-lg p-5 mb-6">
      <h3 class="text-lg font-bold text-purple-800 mb-3 flex items-center gap-2">
        <span>💻</span>
        程式碼說明：動態生成長條圖
      </h3>
      <div class="bg-white p-4 rounded shadow-sm">
        <pre class="text-sm overflow-x-auto"><code>const data = [30, 50, 25, 70, 45, 60];

// 1. 清除舊內容
container.innerHTML = '';

// 2. 創建 SVG
const svg = document.createElementNS(svgNS, 'svg');
svg.setAttribute('width', '100%');
svg.setAttribute('height', '300');

// 3. 計算比例尺
const maxValue = Math.max(...data);  // 70
const barWidth = chartWidth / data.length;

// 4. 迴圈繪製長條
data.forEach((value, index) => {
  const barHeight = (value / maxValue) * chartHeight;
  const x = index * barWidth;
  const y = chartHeight - barHeight;  // 向上生長
  
  const rect = document.createElementNS(svgNS, 'rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', y);
  rect.setAttribute('width', barWidth * 0.8);
  rect.setAttribute('height', barHeight);
  rect.setAttribute('fill', '#4CAF50');
  
  svg.appendChild(rect);
});

container.appendChild(svg);</code></pre>
        <p class="text-sm text-blue-800 bg-blue-100 p-2 rounded mt-3">
          💡 <strong>重點：</strong>使用 <code>forEach</code> 迴圈處理數據，每個數據點生成一個 rect 元素。
        </p>
      </div>
    </div>

    <h2 class="text-xl font-bold text-pink-600 mb-4 mt-8">3️⃣ 完整的資料驅動圖表 (互動與動畫)</h2>
    <div class="mb-4">
      <div ref="chart5Container" class="border border-gray-200 bg-white h-[400px] mb-2"></div>
      <div class="flex gap-2 flex-wrap items-center">
        <div class="flex items-center gap-2">
          <label>新增數據：</label>
          <input type="number" v-model="newValue" min="0" max="100" class="border rounded px-2 py-1 w-20">
          <button type="button" @click="addDataPoint" class="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 transition">新增</button>
        </div>
        <button type="button" @click="removeLastBar" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition">刪除最後一個</button>
        <button type="button" @click="randomizeData" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition">隨機數據</button>
        <button type="button" @click="clearAllBars" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition">清除所有</button>
      </div>
    </div>

    <div class="bg-teal-50 border border-teal-200 rounded-lg p-5 mb-6">
      <h3 class="text-lg font-bold text-teal-800 mb-3 flex items-center gap-2">
        <span>💻</span>
        程式碼說明：添加互動與動畫
      </h3>
      <div class="bg-white p-4 rounded shadow-sm space-y-3">
        <div>
          <p class="font-bold text-sm mb-2">1. CSS 動畫：</p>
          <pre class="text-xs bg-gray-100 p-2 rounded"><code>rect.style.transition = 'all 0.3s ease';
rect.setAttribute('height', 0);  // 起始狀態

// 延遲觸發動畫
setTimeout(() => {
  rect.setAttribute('height', barHeight);
}, 100);</code></pre>
        </div>
        <div>
          <p class="font-bold text-sm mb-2">2. 事件監聽：</p>
          <pre class="text-xs bg-gray-100 p-2 rounded"><code>rect.addEventListener('mouseover', function() {
  this.setAttribute('fill', '#FF9800');  // 滑鼠移入變色
});

rect.addEventListener('mouseout', function() {
  this.setAttribute('fill', '#E91E63');  // 恢復顏色
});</code></pre>
        </div>
        <div>
          <p class="font-bold text-sm mb-2">3. Vue 整合：</p>
          <pre class="text-xs bg-gray-100 p-2 rounded"><code>// 使用 ref 管理 DOM
const chartContainer = ref(null);

// 在 onMounted 中操作
onMounted(() => {
  drawChart(chartContainer.value);
});</code></pre>
        </div>
      </div>
    </div>

    <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
      <h3 class="text-lg font-bold text-amber-800 mb-2 flex items-center gap-2">
        <span>🎯</span>
        練習任務
      </h3>
      <ol class="list-decimal list-inside text-gray-700 space-y-2">
        <li>嘗試修改事件監聽器，添加點擊事件</li>
        <li>實驗不同的 CSS transition 動畫效果</li>
        <li>嘗試創建一個新的互動圖表（例如：圆餅圖、散點圖）</li>
      </ol>
    </div>

    <div class="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl p-6 shadow-lg">
      <h3 class="text-2xl font-bold mb-4 flex items-center gap-2">
        <span>🎓</span>
        恭喜完成 Week 1-2 學習！
      </h3>
      <p class="mb-4">你已經掌握：</p>
      <ul class="space-y-2 mb-4">
        <li class="flex items-start gap-2">
          <span class="text-pink-200">✅</span>
          <span>使用 <code>createElementNS</code> 創建 SVG 元素</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-pink-200">✅</span>
          <span>使用 <code>setAttribute</code> 設定 SVG 屬性</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-pink-200">✅</span>
          <span>動態生成和更新圖表</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-pink-200">✅</span>
          <span>添加互動性和動畫效果</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-pink-200">✅</span>
          <span>與 Vue.js 整合 (ref, onMounted)</span>
        </li>
      </ul>
      <div class="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
        <p class="font-bold mb-2">📌 下一階段</p>
        <p class="mb-2">你已經完成 <strong>D3 學習的第一階段</strong>！現在你懂得：</p>
        <ul class="space-y-1 text-sm">
          <li>• SVG 的基本形狀、屬性和路徑</li>
          <li>• SVG 的座標系統和變換</li>
          <li>• 如何手動繪製長條圖</li>
          <li>• 如何用 JavaScript 操作 SVG</li>
        </ul>
        <p class="mt-3 font-bold">🚀 接下來就是 D3.js 的正式學習！</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

// SVG 命名空間
const svgNS = "http://www.w3.org/2000/svg";

// 練習 1 相關
const chart1Container = ref(null);

function createCircle() {
  let svg = chart1Container.value.querySelector('svg');
  if (!svg) {
    svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '200');
    chart1Container.value.appendChild(svg);
  }
  
  const circle = document.createElementNS(svgNS, 'circle');
  circle.setAttribute('cx', Math.random() * 580 + 10);
  circle.setAttribute('cy', Math.random() * 180 + 10);
  circle.setAttribute('r', Math.random() * 30 + 20);
  circle.setAttribute('fill', `hsl(${Math.random() * 360}, 70%, 60%)`);
  circle.setAttribute('opacity', '0.8');
  
  svg.appendChild(circle);
}

function createRect() {
  let svg = chart1Container.value.querySelector('svg');
  if (!svg) {
    svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '200');
    chart1Container.value.appendChild(svg);
  }
  
  const rect = document.createElementNS(svgNS, 'rect');
  rect.setAttribute('x', Math.random() * 550);
  rect.setAttribute('y', Math.random() * 150);
  rect.setAttribute('width', Math.random() * 50 + 30);
  rect.setAttribute('height', Math.random() * 50 + 30);
  rect.setAttribute('fill', `hsl(${Math.random() * 360}, 70%, 60%)`);
  rect.setAttribute('opacity', '0.8');
  rect.setAttribute('rx', '5');
  
  svg.appendChild(rect);
}

function clearChart1() {
  chart1Container.value.innerHTML = '';
}

// 練習 2 相關
const chart2Container = ref(null);
let chart2Data = [30, 50, 25, 70, 45, 60];

function generateBarChart() {
  chart2Container.value.innerHTML = '';
  
  const width = 700;
  const height = 300;
  const margin = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  
  const g = document.createElementNS(svgNS, 'g');
  g.setAttribute('transform', `translate(${margin.left}, ${margin.top})`);
  svg.appendChild(g);
  
  const maxValue = Math.max(...chart2Data);
  const barWidth = chartWidth / chart2Data.length;
  
  chart2Data.forEach((value, index) => {
    const barHeight = (value / maxValue) * chartHeight;
    const x = index * barWidth;
    const y = chartHeight - barHeight;
    
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', x + barWidth * 0.1);
    rect.setAttribute('y', y);
    rect.setAttribute('width', barWidth * 0.8);
    rect.setAttribute('height', barHeight);
    rect.setAttribute('fill', '#4CAF50');
    rect.style.transition = 'all 0.3s ease';
    
    g.appendChild(rect);
    
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', x + barWidth / 2);
    text.setAttribute('y', y - 5);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '14');
    text.setAttribute('fill', '#333');
    text.textContent = value;
    
    g.appendChild(text);
  });
  
  const axisLine = document.createElementNS(svgNS, 'line');
  axisLine.setAttribute('x1', 0);
  axisLine.setAttribute('y1', chartHeight);
  axisLine.setAttribute('x2', chartWidth);
  axisLine.setAttribute('y2', chartHeight);
  axisLine.setAttribute('stroke', '#333');
  axisLine.setAttribute('stroke-width', '2');
  g.appendChild(axisLine);
  
  chart2Container.value.appendChild(svg);
}

function updateData() {
  chart2Data = chart2Data.map(() => Math.floor(Math.random() * 80) + 20);
  generateBarChart();
}

function sortBars() {
  chart2Data.sort((a, b) => b - a);
  generateBarChart();
}

// 練習 5 相關
const chart5Container = ref(null);
const newValue = ref(50);
let chart5Data = [45, 30, 55, 20, 40];

function drawChart5() {
  chart5Container.value.innerHTML = '';
  
  const width = 800;
  const height = 400;
  const margin = { top: 40, right: 40, bottom: 60, left: 80 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  
  const title = document.createElementNS(svgNS, 'text');
  title.setAttribute('x', width / 2);
  title.setAttribute('y', 25);
  title.setAttribute('text-anchor', 'middle');
  title.setAttribute('font-size', '18');
  title.setAttribute('font-weight', 'bold');
  title.textContent = '動態資料視覺化';
  svg.appendChild(title);
  
  const g = document.createElementNS(svgNS, 'g');
  g.setAttribute('transform', `translate(${margin.left}, ${margin.top})`);
  svg.appendChild(g);
  
  if (chart5Data.length === 0) {
    const emptyText = document.createElementNS(svgNS, 'text');
    emptyText.setAttribute('x', chartWidth / 2);
    emptyText.setAttribute('y', chartHeight / 2);
    emptyText.setAttribute('text-anchor', 'middle');
    emptyText.setAttribute('font-size', '16');
    emptyText.setAttribute('fill', '#999');
    emptyText.textContent = '沒有資料，請新增數據點';
    g.appendChild(emptyText);
  } else {
    const maxValue = Math.max(...chart5Data, 100); // 固定最大值以便比較
    const barWidth = chartWidth / chart5Data.length;
    
    chart5Data.forEach((value, index) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = index * barWidth;
      const y = chartHeight - barHeight;
      
      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', x + barWidth * 0.1);
      rect.setAttribute('y', chartHeight);
      rect.setAttribute('width', barWidth * 0.8);
      rect.setAttribute('height', 0);
      rect.setAttribute('fill', '#E91E63');
      rect.style.transition = 'all 0.3s ease';
      rect.style.cursor = 'pointer';
      
      setTimeout(() => {
        rect.setAttribute('y', y);
        rect.setAttribute('height', barHeight);
      }, index * 50);
      
      rect.addEventListener('mouseover', function() {
        this.setAttribute('fill', '#FF9800');
      });
      
      rect.addEventListener('mouseout', function() {
        this.setAttribute('fill', '#E91E63');
      });
      
      g.appendChild(rect);
      
      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', x + barWidth / 2);
      text.setAttribute('y', y - 5);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', 'bold');
      text.textContent = value;
      
      g.appendChild(text);
    });
  }
  
  const yAxis = document.createElementNS(svgNS, 'line');
  yAxis.setAttribute('x1', 0);
  yAxis.setAttribute('y1', 0);
  yAxis.setAttribute('x2', 0);
  yAxis.setAttribute('y2', chartHeight);
  yAxis.setAttribute('stroke', '#333');
  yAxis.setAttribute('stroke-width', '2');
  g.appendChild(yAxis);
  
  const xAxis = document.createElementNS(svgNS, 'line');
  xAxis.setAttribute('x1', 0);
  xAxis.setAttribute('y1', chartHeight);
  xAxis.setAttribute('x2', chartWidth);
  xAxis.setAttribute('y2', chartHeight);
  xAxis.setAttribute('stroke', '#333');
  xAxis.setAttribute('stroke-width', '2');
  g.appendChild(xAxis);
  
  chart5Container.value.appendChild(svg);
}

function addDataPoint() {
  const value = parseInt(newValue.value) || 50;
  chart5Data.push(value);
  drawChart5();
}

function removeLastBar() {
  if (chart5Data.length > 0) {
    chart5Data.pop();
    drawChart5();
  }
}

function randomizeData() {
  chart5Data = Array.from({ length: 6 }, () => Math.floor(Math.random() * 80) + 20);
  drawChart5();
}

function clearAllBars() {
  chart5Data = [];
  drawChart5();
}

onMounted(() => {
  generateBarChart();
  drawChart5();
});
</script>
