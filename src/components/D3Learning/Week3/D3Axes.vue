<template>
  <div class="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg">
    <h2 class="text-3xl font-bold mb-6 text-orange-800">📐 D3 Axes（座標軸）</h2>

    <!-- 學習目標 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-xl font-bold mb-4 text-orange-700">🎯 學習目標</h3>
      <ul class="list-disc list-inside space-y-2 text-gray-700">
        <li>理解座標軸的作用：將抽象的比例尺視覺化</li>
        <li>掌握四個座標軸函數：<code class="bg-orange-100 px-2 py-1 rounded">axisBottom()</code>、<code class="bg-orange-100 px-2 py-1 rounded">axisLeft()</code>、<code class="bg-orange-100 px-2 py-1 rounded">axisTop()</code>、<code class="bg-orange-100 px-2 py-1 rounded">axisRight()</code></li>
        <li>學會使用 <code class="bg-orange-100 px-2 py-1 rounded">.call()</code> 方法調用座標軸</li>
        <li>自訂刻度數量、格式、樣式</li>
        <li>整合比例尺與座標軸創建完整圖表</li>
      </ul>
    </section>

    <!-- 第一部分：座標軸的概念 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-orange-700">1️⃣ 什麼是座標軸？</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          座標軸（Axis）是將比例尺視覺化的工具。它會自動生成刻度線、刻度標籤、座標軸線，
          讓觀眾理解資料的尺度和範圍。
        </p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <p class="font-semibold text-blue-800 mb-2">🔑 核心概念：</p>
          <ul class="list-disc list-inside space-y-1 text-blue-700">
            <li><strong>比例尺</strong>：數學函數（data → pixels）</li>
            <li><strong>座標軸</strong>：視覺化工具（顯示刻度與標籤）</li>
            <li>座標軸 = 比例尺 + SVG 元素生成器</li>
            <li>使用 <code>.call()</code> 方法將座標軸渲染到 SVG</li>
          </ul>
        </div>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>// 1. 創建比例尺
const xScale = d3.scaleLinear()
  .domain([0, 100])
  .range([0, 500]);

// 2. 創建座標軸生成器
const xAxis = d3.axisBottom(xScale);  // 刻度在下方

// 3. 將座標軸渲染到 SVG
svg.append('g')
  .attr('transform', 'translate(0, 200)')  // 定位座標軸
  .call(xAxis);  // 🔑 .call() 方法

// .call(xAxis) 等同於：
// xAxis(selection); // 座標軸函數會自動生成所有 SVG 元素</code></pre>
        </div>

        <div class="grid md:grid-cols-2 gap-4 mb-4">
          <div class="bg-white border-2 border-gray-300 p-4 rounded">
            <p class="font-semibold text-gray-800 mb-2">❌ 手動創建座標軸</p>
            <div class="text-xs text-gray-600">
              需要手動計算刻度位置、繪製線條、添加文字標籤...非常繁瑣！
            </div>
          </div>
          <div class="bg-green-50 border-2 border-green-500 p-4 rounded">
            <p class="font-semibold text-green-800 mb-2">✅ D3 座標軸（自動生成）</p>
            <div class="text-xs text-green-700">
              3 行程式碼：創建比例尺 → 創建座標軸 → .call() 渲染
            </div>
          </div>
        </div>
      </div>

      <!-- 互動範例 1：基本座標軸 -->
      <div class="border-2 border-orange-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-orange-600">🎨 互動範例：四種座標軸方向</h4>
        <div class="flex gap-4 mb-4">
          <button type="button" @click="axisDemo('bottom')" class="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
            axisBottom
          </button>
          <button type="button" @click="axisDemo('left')" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            axisLeft
          </button>
          <button type="button" @click="axisDemo('top')" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            axisTop
          </button>
          <button type="button" @click="axisDemo('right')" class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            axisRight
          </button>
        </div>
        <svg ref="demo1Svg" width="100%" height="300" class="bg-white rounded border"></svg>
        <div class="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
          觀察刻度線和標籤的位置變化
        </div>
      </div>
    </section>

    <!-- 第二部分：.call() 方法詳解 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-orange-700">2️⃣ .call() 方法詳解</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          <code class="bg-gray-100 px-2 py-1 rounded">.call(function)</code> 是 D3 選擇集的方法，
          它會將選擇集本身作為參數傳給函數。這是座標軸渲染的關鍵。
        </p>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>// .call() 的工作原理
const selection = svg.append('g');

// 這兩種寫法完全等價：
selection.call(xAxis);
xAxis(selection);

// .call() 的優勢：可以繼續鏈式調用
svg.append('g')
  .attr('transform', 'translate(50, 200)')
  .call(xAxis)
  .selectAll('text')  // 繼續操作座標軸的文字
    .attr('fill', 'blue');

// 常見用法：同時應用多個函數
svg.append('g')
  .call(xAxis)
  .call(g => g.select('.domain').remove())  // 移除軸線
  .call(g => g.selectAll('.tick line')       // 延長刻度線
    .attr('y2', -height));

// .call() 也可以傳入自定義函數
function customStyle(g) {
  g.attr('font-size', 14)
    .attr('font-weight', 'bold');
}

svg.append('g')
  .call(xAxis)
  .call(customStyle);</code></pre>
        </div>

        <div class="overflow-x-auto mb-4">
          <table class="min-w-full bg-white border">
            <thead class="bg-orange-100">
              <tr>
                <th class="px-4 py-2 border text-left">元素</th>
                <th class="px-4 py-2 border text-left">類別名稱</th>
                <th class="px-4 py-2 border text-left">說明</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="px-4 py-2 border">整個座標軸</td>
                <td class="px-4 py-2 border"><code>.axis</code></td>
                <td class="px-4 py-2 border">包含所有元素的 g 元素</td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border">軸線</td>
                <td class="px-4 py-2 border"><code>.domain</code></td>
                <td class="px-4 py-2 border">主軸線（path 元素）</td>
              </tr>
              <tr>
                <td class="px-4 py-2 border">刻度組</td>
                <td class="px-4 py-2 border"><code>.tick</code></td>
                <td class="px-4 py-2 border">每個刻度的 g 元素</td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border">刻度線</td>
                <td class="px-4 py-2 border"><code>.tick line</code></td>
                <td class="px-4 py-2 border">刻度的短線</td>
              </tr>
              <tr>
                <td class="px-4 py-2 border">刻度標籤</td>
                <td class="px-4 py-2 border"><code>.tick text</code></td>
                <td class="px-4 py-2 border">刻度的文字</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 互動範例 2：.call() 樣式化 -->
      <div class="border-2 border-orange-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-orange-600">🎨 互動範例：使用 .call() 自訂樣式</h4>
        <div class="flex flex-wrap gap-2 mb-4">
          <button type="button" @click="styleDemo1" class="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm">
            移除軸線
          </button>
          <button type="button" @click="styleDemo2" class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
            延長刻度線（網格）
          </button>
          <button type="button" @click="styleDemo3" class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
            自訂顏色
          </button>
          <button type="button" @click="resetDemo2" class="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">
            重置
          </button>
        </div>
        <svg ref="demo2Svg" width="100%" height="250" class="bg-white rounded border"></svg>
      </div>
    </section>

    <!-- 第三部分：刻度自訂 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-orange-700">3️⃣ 刻度數量與格式</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          D3 座標軸提供豐富的自訂選項，讓你精確控制刻度的外觀和行為。
        </p>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>const xScale = d3.scaleLinear().domain([0, 100]).range([0, 500]);
const xAxis = d3.axisBottom(xScale);

// 1. 控制刻度數量
xAxis.ticks(5);          // 建議 5 個刻度（D3 會自動調整到合適的數量）
xAxis.ticks(10);         // 建議 10 個刻度

// 2. 自訂刻度值（完全控制）
xAxis.tickValues([0, 25, 50, 75, 100]);  // 只顯示這些值

// 3. 刻度格式化
xAxis.tickFormat(d => d + '%');          // 30 → 30%
xAxis.tickFormat(d => '$' + d);          // 30 → $30
xAxis.tickFormat(d3.format('.2f'));      // 30 → 30.00

// 4. 刻度大小（線條長度）
xAxis.tickSize(6);       // 內刻度線長度
xAxis.tickSizeInner(6);  // 內刻度線長度
xAxis.tickSizeOuter(0);  // 外刻度線長度（端點）

// 5. 刻度間距（文字與刻度線的距離）
xAxis.tickPadding(10);   // 增加間距

// 常用格式化器
d3.format('.0f')         // 整數：123
d3.format('.2f')         // 兩位小數：123.45
d3.format('.0%')         // 百分比：12%
d3.format(',.0f')        // 千分位：1,234
d3.format('$,.2f')       // 貨幣：$1,234.56

// 時間格式化
d3.timeFormat('%Y-%m-%d')      // 2024-01-15
d3.timeFormat('%B %d')         // January 15
d3.timeFormat('%H:%M')         // 14:30</code></pre>
        </div>

        <div class="overflow-x-auto mb-4">
          <table class="min-w-full bg-white border">
            <thead class="bg-orange-100">
              <tr>
                <th class="px-4 py-2 border text-left">方法</th>
                <th class="px-4 py-2 border text-left">說明</th>
                <th class="px-4 py-2 border text-left">範例</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="px-4 py-2 border"><code>.ticks(count)</code></td>
                <td class="px-4 py-2 border">建議刻度數量</td>
                <td class="px-4 py-2 border"><code>.ticks(10)</code></td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border"><code>.tickValues(array)</code></td>
                <td class="px-4 py-2 border">指定刻度值</td>
                <td class="px-4 py-2 border"><code>.tickValues([0, 50, 100])</code></td>
              </tr>
              <tr>
                <td class="px-4 py-2 border"><code>.tickFormat(fn)</code></td>
                <td class="px-4 py-2 border">格式化函數</td>
                <td class="px-4 py-2 border"><code>.tickFormat(d => d + '%')</code></td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border"><code>.tickSize(size)</code></td>
                <td class="px-4 py-2 border">刻度線長度</td>
                <td class="px-4 py-2 border"><code>.tickSize(10)</code></td>
              </tr>
              <tr>
                <td class="px-4 py-2 border"><code>.tickPadding(px)</code></td>
                <td class="px-4 py-2 border">標籤間距</td>
                <td class="px-4 py-2 border"><code>.tickPadding(8)</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 互動範例 3：刻度自訂 -->
      <div class="border-2 border-orange-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-orange-600">🎨 互動範例：刻度自訂</h4>
        <div class="mb-4">
          <label class="block text-sm font-semibold mb-2">刻度數量：{{ tickCount }}</label>
          <input 
            v-model.number="tickCount" 
            type="range" 
            min="3" 
            max="20" 
            class="w-full"
            @input="updateTickDemo"
          />
        </div>
        <div class="flex gap-4 mb-4">
          <button type="button" @click="formatDemo('percent')" class="px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm">
            百分比格式
          </button>
          <button type="button" @click="formatDemo('currency')" class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
            貨幣格式
          </button>
          <button type="button" @click="formatDemo('decimal')" class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
            小數格式
          </button>
        </div>
        <svg ref="demo3Svg" width="100%" height="150" class="bg-white rounded border"></svg>
      </div>
    </section>

    <!-- 第四部分：實戰整合 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-orange-700">4️⃣ 完整圖表實戰</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          現在整合所有知識：比例尺 + 座標軸 + 資料綁定，創建完整的圖表。
        </p>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>// 完整長條圖範例
const data = [
  { category: 'A', value: 30 },
  { category: 'B', value: 50 },
  { category: 'C', value: 40 }
];

const width = 600;
const height = 400;
const margin = { top: 20, right: 20, bottom: 40, left: 60 };
const chartWidth = width - margin.left - margin.right;
const chartHeight = height - margin.top - margin.bottom;

// 創建 SVG 和圖表區域
const svg = d3.select('svg')
  .attr('width', width)
  .attr('height', height);

const g = svg.append('g')
  .attr('transform', \`translate(\${margin.left}, \${margin.top})\`);

// 比例尺
const xScale = d3.scaleBand()
  .domain(data.map(d => d.category))
  .range([0, chartWidth])
  .padding(0.2);

const yScale = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.value)])
  .range([chartHeight, 0])
  .nice();

// 座標軸
const xAxis = d3.axisBottom(xScale);
const yAxis = d3.axisLeft(yScale).ticks(5);

// 渲染座標軸
g.append('g')
  .attr('class', 'x-axis')
  .attr('transform', \`translate(0, \${chartHeight})\`)
  .call(xAxis);

g.append('g')
  .attr('class', 'y-axis')
  .call(yAxis);

// 繪製長條
g.selectAll('.bar')
  .data(data)
  .join('rect')
    .attr('class', 'bar')
    .attr('x', d => xScale(d.category))
    .attr('y', d => yScale(d.value))
    .attr('width', xScale.bandwidth())
    .attr('height', d => chartHeight - yScale(d.value))
    .attr('fill', 'steelblue');</code></pre>
        </div>
      </div>

      <!-- 互動範例 4：完整長條圖 -->
      <div class="border-2 border-orange-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-orange-600">🎨 互動範例：完整長條圖</h4>
        <div class="flex gap-4 mb-4">
          <button type="button" @click="fullChartDemo" class="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
            生成圖表
          </button>
          <button type="button" @click="updateChartData" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            更新資料
          </button>
          <button type="button" @click="resetDemo4" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            重置
          </button>
        </div>
        <svg ref="demo4Svg" width="100%" height="350" class="bg-white rounded border"></svg>
      </div>
    </section>

    <!-- 第五部分：實戰練習 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-orange-700">5️⃣ 實戰練習</h3>
      
      <div class="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
        <p class="font-semibold text-green-800 mb-2">📝 練習任務：</p>
        <ol class="list-decimal list-inside space-y-2 text-green-700">
          <li>創建一個完整的折線圖，包含 X 軸（時間）和 Y 軸（數值）</li>
          <li>使用 <code>scaleTime()</code> 和 <code>scaleLinear()</code></li>
          <li>添加網格線（延長刻度線）</li>
          <li>自訂座標軸標籤格式</li>
          <li>實作資料更新時的動畫過渡</li>
        </ol>
      </div>

      <div class="border-2 border-green-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-green-600">🎯 練習區域</h4>
        <div class="flex gap-4 mb-4">
          <button type="button" @click="practiceGenerate" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            生成圖表
          </button>
          <button type="button" @click="practiceUpdate" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            更新資料
          </button>
          <button type="button" @click="resetPractice" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            重置
          </button>
        </div>
        <svg ref="practiceSvg" width="100%" height="300" class="bg-white rounded border"></svg>
      </div>

      <!-- ⚠️ 重要觀念：d3.extent() 詳解 -->
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
        <h4 class="font-bold text-lg mb-2 text-blue-800">🔍 深入理解：d3.extent() 函數</h4>
        
        <div class="bg-white p-4 rounded-lg mb-3">
          <p class="text-sm text-gray-700 mb-3">
            <code class="bg-gray-100 px-2 py-1 rounded">d3.extent()</code> 是 D3 提供的陣列統計函數，
            用來<strong>同時找出陣列中的最小值和最大值</strong>，返回 <code>[min, max]</code> 陣列。
          </p>
          
          <div class="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs mb-3">
            <div class="text-green-400 mb-2">// 基本用法</div>
            <div class="text-white">const numbers = [10, 45, 23, 67, 34];</div>
            <div class="text-white">const extent = d3.extent(numbers);</div>
            <div class="text-yellow-300">console.log(extent);  <span class="text-gray-400">// [10, 67]</span></div>
            <div class="text-gray-400 mt-2">
              // 等同於：<br>
              const min = d3.min(numbers);  // 10<br>
              const max = d3.max(numbers);  // 67<br>
              const extent = [min, max];    // [10, 67]
            </div>
            <div class="text-green-400 mt-3 mb-2">// 搭配存取器函數使用</div>
            <div class="text-white">const data = [</div>
            <div class="text-white">  { date: new Date('2024-01-01'), value: 30 },</div>
            <div class="text-white">  { date: new Date('2024-01-15'), value: 45 },</div>
            <div class="text-white">  { date: new Date('2024-02-01'), value: 35 }</div>
            <div class="text-white">];</div>
            <div class="text-yellow-300 mt-2">
              const dateExtent = d3.extent(data, d => d.date);<br>
              <span class="text-gray-400">// [Date(2024-01-01), Date(2024-02-01)]</span>
            </div>
            <div class="text-yellow-300 mt-1">
              const valueExtent = d3.extent(data, d => d.value);<br>
              <span class="text-gray-400">// [30, 45]</span>
            </div>
          </div>

          <div class="bg-purple-50 border-l-4 border-purple-500 p-3 rounded mb-3">
            <p class="font-semibold text-purple-800 text-sm mb-2">🔑 為什麼使用 d3.extent()？</p>
            <div class="grid md:grid-cols-2 gap-3 text-xs">
              <div class="bg-white p-2 rounded border">
                <div class="font-semibold text-red-800 mb-2">❌ 分開計算（較繁瑣）</div>
                <div class="bg-gray-900 text-gray-100 p-2 rounded font-mono">
                  <div class="text-white">const min = d3.min(data, d => d.date);</div>
                  <div class="text-white">const max = d3.max(data, d => d.date);</div>
                  <div class="text-white">const xScale = d3.scaleTime()</div>
                  <div class="text-yellow-300">  .domain([min, max])</div>
                  <div class="text-white">  .range([0, width]);</div>
                </div>
              </div>
              <div class="bg-white p-2 rounded border">
                <div class="font-semibold text-green-800 mb-2">✅ 使用 extent()（簡潔）</div>
                <div class="bg-gray-900 text-gray-100 p-2 rounded font-mono">
                  <div class="text-white">const xScale = d3.scaleTime()</div>
                  <div class="text-green-300">  .domain(d3.extent(data, d => d.date))</div>
                  <div class="text-white">  .range([0, width]);</div>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-green-50 border-l-4 border-green-500 p-3 rounded">
            <p class="font-semibold text-green-800 text-sm mb-2">📊 相關函數對比</p>
            <div class="overflow-x-auto">
              <table class="min-w-full text-xs bg-white border">
                <thead class="bg-gray-100">
                  <tr>
                    <th class="px-2 py-1 border text-left">函數</th>
                    <th class="px-2 py-1 border text-left">返回值</th>
                    <th class="px-2 py-1 border text-left">用途</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="px-2 py-1 border"><code>d3.min(array, accessor)</code></td>
                    <td class="px-2 py-1 border">最小值</td>
                    <td class="px-2 py-1 border">找最小值</td>
                  </tr>
                  <tr>
                    <td class="px-2 py-1 border"><code>d3.max(array, accessor)</code></td>
                    <td class="px-2 py-1 border">最大值</td>
                    <td class="px-2 py-1 border">找最大值</td>
                  </tr>
                  <tr class="bg-yellow-50">
                    <td class="px-2 py-1 border"><code>d3.extent(array, accessor)</code></td>
                    <td class="px-2 py-1 border"><code>[最小值, 最大值]</code></td>
                    <td class="px-2 py-1 border">同時找最小和最大值</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="mt-3 p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded border-l-4 border-purple-500">
            <p class="text-sm font-bold text-purple-800">
              💡 記憶口訣：「extent = 一次抓出 [min, max]，完美適配 domain()！」
            </p>
          </div>
        </div>
      </div>

      <!-- ⚠️ 重要觀念：.datum() vs .data() 詳解 -->
      <div class="bg-purple-50 border-l-4 border-purple-500 p-4 mb-4">
        <h4 class="font-bold text-lg mb-2 text-purple-800">🔍 深入理解：.datum() 單一資料綁定</h4>
        
        <div class="bg-white p-4 rounded-lg mb-3">
          <p class="text-sm text-gray-700 mb-3">
            <code class="bg-gray-100 px-2 py-1 rounded">.datum()</code> 用於將<strong>單一資料綁定到元素</strong>，
            與 <code class="bg-gray-100 px-2 py-1 rounded">.data()</code> 的「一對一綁定多個元素」不同，
            <code>.datum()</code> 常用於<strong>折線圖、區域圖等需要單一 path 元素的場景</strong>。
          </p>
          
          <div class="bg-orange-50 border-l-4 border-orange-500 p-3 rounded mb-3">
            <p class="font-semibold text-orange-800 text-sm mb-2">🔑 核心差異</p>
            <div class="grid md:grid-cols-2 gap-3 text-xs">
              <div class="bg-white p-2 rounded border">
                <div class="font-semibold text-blue-800 mb-2">.data() - 一對一綁定（多個元素）</div>
                <div class="bg-gray-900 text-gray-100 p-2 rounded font-mono">
                  <div class="text-white">const data = [10, 20, 30];</div>
                  <div class="text-white mt-1">svg.selectAll('circle')</div>
                  <div class="text-yellow-300">  .data(data)  <span class="text-gray-400">// 每筆對應一個元素</span></div>
                  <div class="text-white">  .join('circle')</div>
                  <div class="text-white">    .attr('r', d => d);</div>
                  <div class="text-gray-400 mt-1">// 結果：3 個 circle</div>
                </div>
              </div>
              <div class="bg-white p-2 rounded border">
                <div class="font-semibold text-green-800 mb-2">.datum() - 整體綁定（單一元素）</div>
                <div class="bg-gray-900 text-gray-100 p-2 rounded font-mono">
                  <div class="text-white">const data = [10, 20, 30];</div>
                  <div class="text-white mt-1">svg.append('path')</div>
                  <div class="text-green-300">  .datum(data)  <span class="text-gray-400">// 整個陣列綁定</span></div>
                  <div class="text-white">  .attr('d', line);</div>
                  <div class="text-gray-400 mt-2">// 結果：1 個 path</div>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs mb-3">
            <div class="text-green-400 mb-2">// 為什麼折線圖不用 .join()？</div>
            <div class="text-white">const data = [</div>
            <div class="text-white">  { date: new Date('2024-01-01'), value: 30 },</div>
            <div class="text-white">  { date: new Date('2024-01-02'), value: 40 }</div>
            <div class="text-white">];</div>
            <div class="text-white mt-2">const line = d3.line()</div>
            <div class="text-white">  .x(d => xScale(d.date))</div>
            <div class="text-white">  .y(d => yScale(d.value));</div>
            <div class="text-red-400 mt-2">// ❌ 錯誤：會創建多個 path（每筆資料一個）</div>
            <div class="text-white">svg.selectAll('path')</div>
            <div class="text-white">  .data(data)</div>
            <div class="text-white">  .join('path')</div>
            <div class="text-white">    .attr('d', line);</div>
            <div class="text-green-400 mt-2">// ✅ 正確：創建一個 path，綁定整個陣列</div>
            <div class="text-white">let path = g.select('.line');</div>
            <div class="text-white">if (path.empty()) {</div>
            <div class="text-white">  path = g.append('path').attr('class', 'line');</div>
            <div class="text-white">}</div>
            <div class="text-yellow-300">path.datum(data)  <span class="text-gray-400">// 整個陣列綁定到這個 path</span></div>
            <div class="text-white">  .attr('fill', 'none')</div>
            <div class="text-white">  .attr('stroke', 'blue')</div>
            <div class="text-white">  .attr('d', line);  <span class="text-gray-400">// line(data) 處理所有點</span></div>
          </div>

          <div class="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
            <p class="font-semibold text-blue-800 text-sm mb-2">📊 .datum() vs .data() 對比表</p>
            <div class="overflow-x-auto">
              <table class="min-w-full text-xs bg-white border">
                <thead class="bg-gray-100">
                  <tr>
                    <th class="px-2 py-1 border text-left">特性</th>
                    <th class="px-2 py-1 border text-left">.datum()</th>
                    <th class="px-2 py-1 border text-left">.data()</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="px-2 py-1 border">用途</td>
                    <td class="px-2 py-1 border">單一資料綁定到元素</td>
                    <td class="px-2 py-1 border">陣列資料一對一綁定</td>
                  </tr>
                  <tr>
                    <td class="px-2 py-1 border">搭配方法</td>
                    <td class="px-2 py-1 border">不使用 .join()</td>
                    <td class="px-2 py-1 border">通常搭配 .join()</td>
                  </tr>
                  <tr class="bg-yellow-50">
                    <td class="px-2 py-1 border">常見場景</td>
                    <td class="px-2 py-1 border">折線圖、區域圖</td>
                    <td class="px-2 py-1 border">長條圖、散點圖</td>
                  </tr>
                  <tr>
                    <td class="px-2 py-1 border">元素數量</td>
                    <td class="px-2 py-1 border">單一元素</td>
                    <td class="px-2 py-1 border">多個元素</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="mt-3 p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded border-l-4 border-pink-500">
            <p class="text-sm font-bold text-pink-800">
              💡 記憶口訣：「datum() = 整包資料給一個元素，data() = 拆開資料分給多個元素！」
            </p>
          </div>
        </div>
      </div>

      <details class="bg-gray-50 p-4 rounded">
        <summary class="cursor-pointer font-semibold text-orange-700">💡 查看參考解答</summary>
        <div class="mt-3 bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
          <pre class="text-sm"><code>// 生成最近 30 天的資料
const now = new Date();
const data = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000),
  value: Math.random() * 50 + 20
}));

// 設定 margin 和尺寸
const margin = { top: 20, right: 30, bottom: 50, left: 60 };
const width = 600 - margin.left - margin.right;
const height = 300 - margin.top - margin.bottom;

// 比例尺
const xScale = d3.scaleTime()
  .domain(d3.extent(data, d => d.date))  // 🔑 使用 extent 自動找出時間範圍
  .range([0, width]);

const yScale = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.value)])
  .range([height, 0])
  .nice();

// 座標軸（含網格線）
const xAxis = d3.axisBottom(xScale)
  .ticks(d3.timeDay.every(5))
  .tickFormat(d3.timeFormat('%m/%d'));

const yAxis = d3.axisLeft(yScale)
  .ticks(5)
  .tickSize(-width);  // 負值創建網格線

// 折線生成器
const line = d3.line()
  .x(d => xScale(d.date))
  .y(d => yScale(d.value));

// 繪製
const g = svg.append('g')
  .attr('transform', \`translate(\${margin.left}, \${margin.top})\`);

// Y 軸（網格線）
g.append('g')
  .attr('class', 'y-axis')
  .call(yAxis)
  .call(g => g.select('.domain').remove())
  .call(g => g.selectAll('.tick line')
    .attr('stroke', '#e0e0e0')
    .attr('stroke-dasharray', '2,2'));

// X 軸
g.append('g')
  .attr('class', 'x-axis')
  .attr('transform', \`translate(0, \${height})\`)
  .call(xAxis);

// 折線
g.append('path')
  .datum(data)
  .attr('fill', 'none')
  .attr('stroke', 'steelblue')
  .attr('stroke-width', 2)
  .attr('d', line);

// 資料點
g.selectAll('circle')
  .data(data)
  .join('circle')
    .attr('cx', d => xScale(d.date))
    .attr('cy', d => yScale(d.value))
    .attr('r', 4)
    .attr('fill', 'steelblue');</code></pre>
        </div>
      </details>
    </section>

    <!-- 學習總結 -->
    <section class="p-6 bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg">
      <h3 class="text-2xl font-bold mb-4 text-orange-800">✅ 學習總結</h3>
      <div class="grid md:grid-cols-2 gap-4">
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="font-bold text-orange-700 mb-2">🎯 核心知識點</h4>
          <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>四種座標軸：Bottom, Left, Top, Right</li>
            <li><code>.call()</code> 方法渲染座標軸</li>
            <li>自訂刻度數量、格式、樣式</li>
            <li>整合比例尺與座標軸創建圖表</li>
            <li>網格線技巧：負的 tickSize</li>
          </ul>
        </div>
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="font-bold text-amber-700 mb-2">🎉 恭喜完成 Week 3-4！</h4>
          <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>✅ 掌握 D3 核心概念</li>
            <li>✅ 能創建完整的資料視覺化</li>
            <li>✅ 準備進入框架整合階段</li>
            <li>🚀 下一步：Vue + D3 整合</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import * as d3 from 'd3';

const demo1Svg = ref(null);
const demo2Svg = ref(null);
const demo3Svg = ref(null);
const demo4Svg = ref(null);
const practiceSvg = ref(null);

const tickCount = ref(10);

// Demo 1: 四種座標軸方向
const axisDemo = (direction) => {
  const svg = d3.select(demo1Svg.value);
  svg.selectAll('*').remove();
  
  const scale = d3.scaleLinear().domain([0, 100]).range([0, 400]);
  
  let axis, x, y;
  switch (direction) {
    case 'bottom':
      axis = d3.axisBottom(scale);
      x = 100;
      y = 150;
      break;
    case 'left':
      axis = d3.axisLeft(scale);
      x = 300;
      y = 50;
      break;
    case 'top':
      axis = d3.axisTop(scale);
      x = 100;
      y = 150;
      break;
    case 'right':
      axis = d3.axisRight(scale);
      x = 300;
      y = 50;
      break;
  }
  
  svg.append('g')
    .attr('transform', `translate(${x}, ${y})`)
    .call(axis)
    
    ;
  
  svg.append('text')
    .attr('x', 300)
    .attr('y', 30)
    .attr('text-anchor', 'middle')
    .attr('font-size', '18')
    .attr('font-weight', 'bold')
    .attr('fill', '#ea580c')
    .text(`d3.axis${direction.charAt(0).toUpperCase() + direction.slice(1)}()`);
};

// Demo 2: .call() 樣式化
const styleDemo1 = () => {
  createBasicAxisDemo();
  
  d3.select(demo2Svg.value)
    .select('.x-axis')
    .call(g => g.select('.domain').remove());
  
  d3.select(demo2Svg.value)
    .select('.y-axis')
    .call(g => g.select('.domain').remove());
};

const styleDemo2 = () => {
  createBasicAxisDemo();
  
  
  d3.select(demo2Svg.value)
    .select('.y-axis')
    .call(g => g.selectAll('.tick line')
      .attr('x2', 400)
      .attr('stroke', '#e0e0e0')
      .attr('stroke-dasharray', '2,2'));
};

const styleDemo3 = () => {
  createBasicAxisDemo();
  
  d3.select(demo2Svg.value)
    .select('.x-axis')
    .call(g => g.selectAll('text')
      .attr('fill', '#3b82f6')
      .attr('font-weight', 'bold'));
  
  d3.select(demo2Svg.value)
    .select('.y-axis')
    .call(g => g.selectAll('text')
      .attr('fill', '#10b981')
      .attr('font-weight', 'bold'));
};

const createBasicAxisDemo = () => {
  const svg = d3.select(demo2Svg.value);
  svg.selectAll('*').remove();
  
  const margin = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartHeight = 150;
  
  const xScale = d3.scaleLinear().domain([0, 100]).range([0, 400]);
  const yScale = d3.scaleLinear().domain([0, 100]).range([chartHeight, 0]);
  
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);
  
  g.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${chartHeight})`)
    .call(d3.axisBottom(xScale));
  
  g.append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(yScale));
};

const resetDemo2 = () => {
  d3.select(demo2Svg.value).selectAll('*').remove();
};

// Demo 3: 刻度自訂
const updateTickDemo = () => {
  const svg = d3.select(demo3Svg.value);
  svg.selectAll('*').remove();
  
  const scale = d3.scaleLinear().domain([0, 100]).range([0, 500]);
  const axis = d3.axisBottom(scale).ticks(tickCount.value);
  
  svg.append('g')
    .attr('transform', 'translate(50, 80)')
    .call(axis);
};

const formatDemo = (type) => {
  const svg = d3.select(demo3Svg.value);
  svg.selectAll('*').remove();
  
  const scale = d3.scaleLinear().domain([0, 100]).range([0, 500]);
  let axis;
  
  switch (type) {
    case 'percent':
      axis = d3.axisBottom(scale).tickFormat(d => d + '%');
      break;
    case 'currency':
      axis = d3.axisBottom(scale).tickFormat(d => '$' + d);
      break;
    case 'decimal':
      axis = d3.axisBottom(scale).tickFormat(d3.format('.2f'));
      break;
  }
  
  svg.append('g')
    .attr('transform', 'translate(50, 80)')
    .call(axis);
};

// Demo 4: 完整長條圖
const fullChartDemo = () => {
  const svg = d3.select(demo4Svg.value);
  svg.selectAll('*').remove();
  
  const data = [
    { category: 'A', value: 30 },
    { category: 'B', value: 50 },
    { category: 'C', value: 40 },
    { category: 'D', value: 60 },
    { category: 'E', value: 35 }
  ];
  
  renderFullChart(data);
};

const updateChartData = () => {
  const data = [
    { category: 'A', value: Math.random() * 60 + 20 },
    { category: 'B', value: Math.random() * 60 + 20 },
    { category: 'C', value: Math.random() * 60 + 20 },
    { category: 'D', value: Math.random() * 60 + 20 },
    { category: 'E', value: Math.random() * 60 + 20 }
  ];
  
  renderFullChart(data);
};

const renderFullChart = (data) => {
  const svg = d3.select(demo4Svg.value);
  const width = 600;
  const height = 350;
  const margin = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  let g = svg.select('g.chart');
  if (g.empty()) {
    g = svg.append('g')
      .attr('class', 'chart')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
  }
  
  const xScale = d3.scaleBand()
    .domain(data.map(d => d.category))
    .range([0, chartWidth])
    .padding(0.2);
  
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)])
    .range([chartHeight, 0])
    .nice();
  
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale).ticks(5);
  
  // 更新或創建 X 軸
  let xAxisG = g.select('.x-axis');
  if (xAxisG.empty()) {
    xAxisG = g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${chartHeight})`);
  }
  xAxisG.transition().duration(500).call(xAxis);
  
  // 更新或創建 Y 軸
  let yAxisG = g.select('.y-axis');
  if (yAxisG.empty()) {
    yAxisG = g.append('g').attr('class', 'y-axis');
  }
  yAxisG.transition().duration(500).call(yAxis);
  
  // 繪製長條
  g.selectAll('.bar')
    .data(data, d => d.category)
    .join(
      enter => enter.append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.category))
        .attr('y', chartHeight)
        .attr('width', xScale.bandwidth())
        .attr('height', 0)
        .attr('fill', 'steelblue')
        .call(enter => enter.transition().duration(500)
          .attr('y', d => yScale(d.value))
          .attr('height', d => chartHeight - yScale(d.value))),
      update => update
        .call(update => update.transition().duration(500)
          .attr('x', d => xScale(d.category))
          .attr('y', d => yScale(d.value))
          .attr('height', d => chartHeight - yScale(d.value)))
    );
};

const resetDemo4 = () => {
  d3.select(demo4Svg.value).selectAll('*').remove();
};

// Practice
const practiceGenerate = () => {
  // 確保 SVG 元素存在
  if (!practiceSvg.value) {
    console.error('SVG element not found');
    return;
  }
  
  const now = new Date();  // ✅ 加上這行
  const data = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000),
    value: Math.random() * 50 + 20
  }));
  const svg = d3.select(practiceSvg.value);
  const width = 600;
  const height = 250;
  const margin = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  let g = svg.select('g.chart');
  if (g.empty()) {
    g = svg.append('g')
      .attr('class', 'chart')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
  }

  // X軸比例尺
  const xScale = d3.scaleTime()
  .domain(d3.extent(data, d => d.date))
  .range([0, chartWidth]);
  // Y軸比例尺
  const yScale = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.value)])
  .range([chartHeight, 0])
  .nice();
  const xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat('%m/%d'));
  const yAxis = d3.axisLeft(yScale).ticks(5);
  // 更新或創建 X 軸
  let xAxisG = g.select('.x-axis');
  
  if (xAxisG.empty()) {
    xAxisG = g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${chartHeight})`);
  }
  xAxisG.transition().duration(500).call(xAxis);
  
  // 更新或創建 Y 軸
  let yAxisG = g.select('.y-axis');
  if (yAxisG.empty()) {
    yAxisG = g.append('g').attr('class', 'y-axis');
  }
  yAxisG.transition().duration(500).call(yAxis);
  // 折線生成器
  const line = d3.line()
    .x(d => xScale(d.date)) 
    .y(d => yScale(d.value));
  // 繪製折線路徑
  let path = g.select('.line');
  if (path.empty()) {
    path = g.append('path')
      .attr('class', 'line')
      .attr('fill', 'none')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 2);
  }
  path.datum(data)
    .transition()
    .duration(500)
    .attr('d', line);
  
  // 繪製資料點
  g.selectAll('.dot')
    .data(data)
    .join(
      enter => enter.append('circle')
        .attr('class', 'dot')
        .attr('cx', d => xScale(d.date))
        .attr('cy', d => yScale(d.value))
        .attr('r', 0)
        .attr('fill', 'steelblue')
        .call(enter => enter.transition().duration(500)
          .attr('r', 4)),
      update => update
        .call(update => update.transition().duration(500)
          .attr('cx', d => xScale(d.date))
          .attr('cy', d => yScale(d.value))),
      exit => exit
        .call(exit => exit.transition().duration(500)
          .attr('r', 0)
          .remove())
    );
};

const practiceUpdate = () => {
  // 留給學生實作
};

const resetPractice = () => {
  d3.select(practiceSvg.value).selectAll('*').remove();
};

// 初始化
setTimeout(() => {
  updateTickDemo();
}, 100);
</script>

<style scoped>
code {
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

pre code {
  font-size: 0.85em;
  line-height: 1.5;
}
</style>
