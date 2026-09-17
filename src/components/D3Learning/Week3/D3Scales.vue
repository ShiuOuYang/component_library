<template>
  <div class="p-6 bg-gradient-to-br from-green-50 to-teal-50 rounded-lg">
    <h2 class="text-3xl font-bold mb-6 text-green-800">📏 D3 Scales（比例尺）</h2>

    <!-- 學習目標 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-xl font-bold mb-4 text-green-700">🎯 學習目標</h3>
      <ul class="list-disc list-inside space-y-2 text-gray-700">
        <li>理解比例尺（Scale）的概念：將資料值映射到視覺屬性</li>
        <li>掌握 <code class="bg-green-100 px-2 py-1 rounded">scaleLinear()</code> - 連續數值比例尺</li>
        <li>掌握 <code class="bg-green-100 px-2 py-1 rounded">scaleBand()</code> - 類別資料比例尺</li>
        <li>學習 <code class="bg-green-100 px-2 py-1 rounded">scaleTime()</code> - 時間序列比例尺</li>
        <li>學習 <code class="bg-green-100 px-2 py-1 rounded">scaleOrdinal()</code> - 顏色映射比例尺</li>
        <li>理解 Domain（定義域）和 Range（值域）的概念</li>
      </ul>
    </section>

    <!-- 第一部分：比例尺的核心概念 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-green-700">1️⃣ 什麼是比例尺？</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          比例尺（Scale）是 D3 中最重要的概念之一。它就像一個<strong>數學函數</strong>，
          將<strong>資料空間</strong>（Domain）的值映射到<strong>視覺空間</strong>（Range）的值。
        </p>
        
        <div class="grid md:grid-cols-2 gap-4 mb-4">
          <div class="bg-blue-50 border-l-4 border-blue-500 p-4">
            <p class="font-semibold text-blue-800 mb-2">📊 Domain（定義域）</p>
            <p class="text-sm text-blue-700 mb-2">資料的範圍</p>
            <div class="bg-white p-2 rounded font-mono text-xs">
              [0, 100] - 資料值<br>
              ['A', 'B', 'C'] - 類別<br>
              [Date1, Date2] - 時間
            </div>
          </div>

          <div class="bg-purple-50 border-l-4 border-purple-500 p-4">
            <p class="font-semibold text-purple-800 mb-2">🎨 Range（值域）</p>
            <p class="text-sm text-purple-700 mb-2">視覺屬性的範圍</p>
            <div class="bg-white p-2 rounded font-mono text-xs">
              [0, 500] - 像素位置<br>
              [10, 50] - 圓形半徑<br>
              ['red', 'blue'] - 顏色
            </div>
          </div>
        </div>

        <div class="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <p class="font-semibold text-green-800 mb-2">🔑 為什麼需要比例尺？</p>
          <ul class="list-disc list-inside space-y-1 text-green-700 text-sm">
            <li><strong>自動計算</strong>：不用手動計算每個值的視覺位置</li>
            <li><strong>響應式</strong>：資料範圍改變時，自動調整映射</li>
            <li><strong>可讀性</strong>：程式碼更簡潔易懂</li>
            <li><strong>標準化</strong>：統一處理不同類型的資料</li>
          </ul>
        </div>

        <div class="grid md:grid-cols-2 gap-4 mb-4">
          <div class="bg-red-50 border-l-4 border-red-500 p-4">
            <p class="font-semibold text-red-800 mb-2">❌ 不用比例尺（手動計算）</p>
            <div class="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
              <pre><code>const data = [10, 50, 80];
const max = 100;
const width = 500;

data.forEach((d, i) => {
  const x = (d / max) * width;
  // 每次都要手動計算...
});</code></pre>
            </div>
          </div>

          <div class="bg-green-50 border-l-4 border-green-500 p-4">
            <p class="font-semibold text-green-800 mb-2">✅ 使用比例尺（自動映射）</p>
            <div class="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
              <pre><code>const data = [10, 50, 80];

const xScale = d3.scaleLinear()
  .domain([0, 100])
  .range([0, 500]);

data.forEach(d => {
  const x = xScale(d); // 自動映射！
});</code></pre>
            </div>
          </div>
        </div>
      </div>

      <!-- 互動範例 1：比例尺視覺化 -->
      <div class="border-2 border-green-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-green-600">🎨 互動範例：比例尺映射視覺化</h4>
        <div class="mb-4">
          <label class="block text-sm font-semibold mb-2">輸入資料值（0-100）：{{ inputValue }}</label>
          <input 
            v-model.number="inputValue" 
            type="range" 
            min="0" 
            max="100" 
            class="w-full"
            @input="updateScaleDemo"
          />
        </div>
        <svg ref="demo1Svg" width="100%" height="150" class="bg-white rounded border"></svg>
        <div class="mt-2 text-sm bg-gray-50 p-3 rounded font-mono">
          <div class="grid grid-cols-2 gap-2">
            <div><strong>Domain:</strong> [0, 100]</div>
            <div><strong>Range:</strong> [0, 500]</div>
            <div class="text-blue-600"><strong>輸入值:</strong> {{ inputValue }}</div>
            <div class="text-purple-600"><strong>映射結果:</strong> {{ mappedValue }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 第二部分：scaleLinear（線性比例尺） -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-green-700">2️⃣ scaleLinear() - 線性比例尺</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          <code class="bg-gray-100 px-2 py-1 rounded">scaleLinear()</code> 是最常用的比例尺，
          用於將<strong>連續數值</strong>映射到另一個連續範圍。適合處理數量、溫度、價格等數值資料。
        </p>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>// 創建線性比例尺
const xScale = d3.scaleLinear()
  .domain([0, 100])      // 資料範圍：0 到 100
  .range([0, 500]);      // 映射到：0 到 500 像素

// 使用比例尺
console.log(xScale(0));    // 0
console.log(xScale(50));   // 250
console.log(xScale(100));  // 500

// 反向映射（從視覺值回推資料值）
console.log(xScale.invert(250)); // 50

// 動態更新 domain
const data = [10, 45, 67, 89];
xScale.domain([0, d3.max(data)]); // domain 變成 [0, 89]

// 常用方法
xScale.clamp(true);        // 限制輸出範圍（超出 domain 的值會被裁切）
xScale.nice();             // 將 domain 擴展到「好看」的整數</code></pre>
        </div>

        <div class="overflow-x-auto mb-4">
          <table class="min-w-full bg-white border">
            <thead class="bg-green-100">
              <tr>
                <th class="px-4 py-2 border text-left">方法</th>
                <th class="px-4 py-2 border text-left">說明</th>
                <th class="px-4 py-2 border text-left">範例</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="px-4 py-2 border"><code>.domain([min, max])</code></td>
                <td class="px-4 py-2 border">設定資料範圍</td>
                <td class="px-4 py-2 border"><code>.domain([0, 100])</code></td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border"><code>.range([min, max])</code></td>
                <td class="px-4 py-2 border">設定視覺範圍</td>
                <td class="px-4 py-2 border"><code>.range([0, 500])</code></td>
              </tr>
              <tr>
                <td class="px-4 py-2 border"><code>.invert(value)</code></td>
                <td class="px-4 py-2 border">反向映射</td>
                <td class="px-4 py-2 border"><code>scale.invert(250)</code></td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border"><code>.clamp(bool)</code></td>
                <td class="px-4 py-2 border">限制輸出在 range 內</td>
                <td class="px-4 py-2 border"><code>.clamp(true)</code></td>
              </tr>
              <tr>
                <td class="px-4 py-2 border"><code>.nice()</code></td>
                <td class="px-4 py-2 border">擴展到整數邊界</td>
                <td class="px-4 py-2 border"><code>.nice()</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 互動範例 2：scaleLinear 實戰 -->
      <div class="border-2 border-green-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-green-600">🎨 互動範例：scaleLinear 長條圖</h4>
        <div class="flex gap-4 mb-4">
          <button type="button" @click="linearDemo1" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            生成隨機資料
          </button>
          <button type="button" @click="toggleClamp" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            切換 Clamp: {{ clampEnabled ? 'ON' : 'OFF' }}
          </button>
          <button type="button" @click="resetDemo2" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            重置
          </button>
        </div>
        <svg ref="demo2Svg" width="100%" height="200" class="bg-white rounded border"></svg>
        <div class="mt-2 text-sm bg-gray-50 p-2 rounded">
          <strong>資料：</strong>{{ linearData.join(', ') }}
        </div>
      </div>
    </section>

    <!-- 第三部分：scaleBand（帶狀比例尺） -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-green-700">3️⃣ scaleBand() - 帶狀比例尺</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          <code class="bg-gray-100 px-2 py-1 rounded">scaleBand()</code> 專門用於<strong>類別資料</strong>，
          如「蘋果、香蕉、橘子」或「週一、週二、週三」。它會將每個類別映射到一個「帶狀」區域，
          常用於<strong>長條圖的 X 軸</strong>。
        </p>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>// 創建帶狀比例尺
const xScale = d3.scaleBand()
  .domain(['Apple', 'Banana', 'Orange'])  // 類別資料
  .range([0, 500])                        // 總寬度
  .padding(0.1);                          // 間距（0-1，0.1 表示 10% 間距）

// 使用比例尺
console.log(xScale('Apple'));    // 0 (起始位置)
console.log(xScale('Banana'));   // 約 166
console.log(xScale('Orange'));   // 約 333

// 取得每個帶的寬度
console.log(xScale.bandwidth()); // 約 150

// 取得帶的中心位置（用於放置文字標籤）
const center = xScale('Apple') + xScale.bandwidth() / 2;

// 調整間距
xScale.paddingInner(0.2);   // 帶與帶之間的間距
xScale.paddingOuter(0.1);   // 首尾的間距
xScale.align(0.5);          // 對齊方式（0=左, 0.5=中, 1=右）</code></pre>
        </div>

        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <p class="font-semibold text-blue-800 mb-2">🔑 scaleBand 的關鍵概念：</p>
          <ul class="list-disc list-inside space-y-1 text-blue-700 text-sm">
            <li><code>.bandwidth()</code> - 取得每個帶的寬度（考慮 padding 後）</li>
            <li><code>.step()</code> - 取得每個帶的步進距離（包含 padding）</li>
            <li><code>.padding(0.1)</code> - 設定整體間距比例</li>
            <li><code>.paddingInner()</code> - 只設定帶之間的間距</li>
            <li><code>.paddingOuter()</code> - 只設定首尾的間距</li>
          </ul>
        </div>

        <div class="grid md:grid-cols-2 gap-4 mb-4">
          <div class="bg-white border-2 border-gray-300 p-4 rounded">
            <p class="font-semibold text-gray-800 mb-2">📊 Padding = 0 (無間距)</p>
            <svg width="100%" height="60" class="bg-gray-100">
              <rect x="0" y="10" width="80" height="40" fill="#3b82f6" />
              <rect x="80" y="10" width="80" height="40" fill="#10b981" />
              <rect x="160" y="10" width="80" height="40" fill="#f59e0b" />
            </svg>
          </div>
          <div class="bg-white border-2 border-gray-300 p-4 rounded">
            <p class="font-semibold text-gray-800 mb-2">📊 Padding = 0.2 (20% 間距)</p>
            <svg width="100%" height="60" class="bg-gray-100">
              <rect x="5" y="10" width="70" height="40" fill="#3b82f6" />
              <rect x="85" y="10" width="70" height="40" fill="#10b981" />
              <rect x="165" y="10" width="70" height="40" fill="#f59e0b" />
            </svg>
          </div>
        </div>
      </div>

      <!-- ⚠️ 重要觀念：Padding、Step 和 Bandwidth 的真實關係 -->
      <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
        <h4 class="font-bold text-lg mb-2 text-yellow-800">🔍 深入理解：scaleBand 的數學原理</h4>

        <div class="bg-white p-4 rounded-lg mb-3">
          <p class="text-sm text-gray-700 mb-3">
            很多人以為 <code class="bg-gray-100 px-2 py-1 rounded">step</code> 是固定的，
            但實際上 <strong class="text-red-600">step 會隨著 padding 改變而變小</strong>！
          </p>

          <div class="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs mb-3">
            <div class="text-green-400 mb-2">// D3 內部的實際計算公式</div>
            <div class="text-white">totalRange = range[1] - range[0]  <span class="text-gray-400">// 總可用寬度（固定）</span></div>
            <div class="text-white">n = domain.length                  <span class="text-gray-400">// 類別數量</span></div>
            <div class="text-white">padding = 0.1                      <span class="text-gray-400">// padding 值 (0-1)</span></div>
            <div class="text-yellow-300 mt-2">
              step = totalRange / (n - padding + padding × 2)<br>
              step = totalRange / (n + padding)  <span class="text-red-400">← 關鍵公式！</span>
            </div>
            <div class="text-blue-300 mt-2">
              bandwidth = step × (1 - padding)
            </div>
          </div>

          <div class="grid md:grid-cols-3 gap-3 mb-3 text-xs">
            <div class="bg-blue-50 p-2 rounded border border-blue-200">
              <div class="font-semibold text-blue-800 mb-1">Padding = 0.1</div>
              <div class="text-gray-700">
                step = 620 / 4.1 ≈ <strong class="text-blue-600">151.2px</strong><br>
                bandwidth = 151.2 × 0.9 ≈ <strong>136px</strong>
              </div>
            </div>
            <div class="bg-purple-50 p-2 rounded border border-purple-200">
              <div class="font-semibold text-purple-800 mb-1">Padding = 0.3</div>
              <div class="text-gray-700">
                step = 620 / 4.3 ≈ <strong class="text-purple-600">144.2px</strong><br>
                bandwidth = 144.2 × 0.7 ≈ <strong>101px</strong>
              </div>
            </div>
            <div class="bg-pink-50 p-2 rounded border border-pink-200">
              <div class="font-semibold text-pink-800 mb-1">Padding = 0.5</div>
              <div class="text-gray-700">
                step = 620 / 4.5 ≈ <strong class="text-pink-600">137.8px</strong><br>
                bandwidth = 137.8 × 0.5 ≈ <strong>69px</strong>
              </div>
            </div>
          </div>

          <div class="bg-green-50 border-l-4 border-green-500 p-3 rounded">
            <p class="font-semibold text-green-800 text-sm mb-2">✅ 關鍵理解</p>
            <ul class="list-disc list-inside space-y-1 text-xs text-green-700">
              <li><strong>總寬度固定</strong>（range 決定），無論 padding 如何調整</li>
              <li><strong>Padding 增加</strong> → 需要更多空間留給間距</li>
              <li><strong>Step 被壓縮</strong> → 每個「格子」變小來騰出空間</li>
              <li><strong>Bandwidth 跟著縮</strong> → 長條寬度 = step × (1 - padding)</li>
            </ul>
          </div>

          <div class="mt-3 p-3 bg-gradient-to-r from-yellow-100 to-orange-100 rounded border-l-4 border-orange-500">
            <p class="text-sm font-bold text-orange-800">
              💡 記憶口訣：「總寬度固定，padding 搶空間，step 被壓縮，bandwidth 跟著縮！」
            </p>
          </div>
        </div>
      </div>

      <!-- 互動範例 3：scaleBand 實戰 -->
      <div class="border-2 border-green-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-green-600">🎨 互動範例：scaleBand 長條圖</h4>
        <p class="text-sm text-gray-600 mb-3">
          調整 padding 滑桿，觀察 <strong class="text-red-600">Step 會變小</strong>，
          <strong class="text-blue-600">Bandwidth 也跟著變小</strong>！
        </p>
        <div class="mb-4">
          <label class="block text-sm font-semibold mb-2">Padding: {{ paddingValue.toFixed(2) }}</label>
          <input 
            v-model.number="paddingValue" 
            type="range" 
            min="0" 
            max="0.5" 
            step="0.05"
            class="w-full"
            @input="updateBandDemo"
          />
        </div>
        <svg ref="demo3Svg" width="100%" height="250" class="bg-white rounded border"></svg>
        <div class="mt-2 text-sm bg-gray-50 p-2 rounded">
          <strong>Bandwidth:</strong> {{ bandwidthValue.toFixed(1) }} px | 
          <strong>Step:</strong> {{ stepValue.toFixed(1) }} px
        </div>
      </div>
    </section>

    <!-- 第四部分：scaleTime（時間比例尺） -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-green-700">4️⃣ scaleTime() - 時間比例尺</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          <code class="bg-gray-100 px-2 py-1 rounded">scaleTime()</code> 專門處理<strong>時間序列資料</strong>，
          是 scaleLinear 的變體，但專為 JavaScript Date 物件優化，常用於<strong>折線圖的 X 軸</strong>。
        </p>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>// 創建時間比例尺
const xScale = d3.scaleTime()
  .domain([new Date(2024, 0, 1), new Date(2024, 11, 31)])  // 2024 年全年
  .range([0, 500]);

// 使用比例尺
console.log(xScale(new Date(2024, 0, 1)));   // 0
console.log(xScale(new Date(2024, 5, 15)));  // 約 250 (年中)
console.log(xScale(new Date(2024, 11, 31))); // 500

// 反向映射
console.log(xScale.invert(250)); // Date 物件（約 6 月中）

// 常用範例：最近 7 天
const now = new Date();
const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

const timeScale = d3.scaleTime()
  .domain([sevenDaysAgo, now])
  .range([0, 600]);</code></pre>
        </div>
      </div>

      <!-- ⚠️ 重要觀念：d3.line() 與曲線插值 -->
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
        <h4 class="font-bold text-lg mb-2 text-blue-800">🔍 深入理解：d3.line() 線條生成器</h4>

        <div class="bg-white p-4 rounded-lg mb-3">
          <p class="text-sm text-gray-700 mb-3">
            <code class="bg-gray-100 px-2 py-1 rounded">d3.line()</code> 是一個<strong>函數工廠</strong>，
            它返回一個函數，該函數可以將資料陣列轉換為 SVG 的 <code>&lt;path&gt;</code> 元素的 <code>d</code> 屬性字串。
          </p>

          <div class="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs mb-3">
            <div class="text-green-400 mb-2">// 建立線條生成器</div>
            <div class="text-white">const line = d3.line()</div>
            <div class="text-white">  .x(d => xScale(d.date))   <span class="text-gray-400">// 設定 X 座標存取器</span></div>
            <div class="text-white">  .y(d => yScale(d.value)); <span class="text-gray-400">// 設定 Y 座標存取器</span></div>
            <div class="text-yellow-300 mt-2">
              // 使用線條生成器<br>
              svg.append('path')<br>
              &nbsp;&nbsp;.datum(data)         <span class="text-gray-400">// 綁定資料</span><br>
              &nbsp;&nbsp;.attr('d', line)     <span class="text-gray-400">// line(data) 生成路徑字串</span><br>
              &nbsp;&nbsp;.attr('fill', 'none')<br>
              &nbsp;&nbsp;.attr('stroke', 'blue');
            </div>
          </div>

          <div class="bg-purple-50 border-l-4 border-purple-500 p-3 rounded mb-3">
            <p class="font-semibold text-purple-800 text-sm mb-2">💡 常見變化與進階用法</p>
            <div class="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs">
              <div class="text-green-400 mb-2">// 1. 曲線插值（Curve Interpolation）</div>
              <div class="text-white">const line = d3.line()</div>
              <div class="text-white">  .x(d => xScale(d.date))</div>
              <div class="text-white">  .y(d => yScale(d.value))</div>
              <div class="text-yellow-300">  .curve(d3.curveMonotoneX);  <span class="text-gray-400">// 平滑曲線</span></div>
              <div class="text-gray-400 mt-2">
                // 常用曲線類型：<br>
                // d3.curveLinear      - 直線（預設）<br>
                // d3.curveMonotoneX   - 平滑曲線（保持單調性）<br>
                // d3.curveBasis       - B-spline 曲線<br>
                // d3.curveCardinal    - Cardinal spline<br>
                // d3.curveStep        - 階梯狀
              </div>
              <div class="text-green-400 mt-3 mb-2">// 2. 處理缺失值</div>
              <div class="text-white">const line = d3.line()</div>
              <div class="text-white">  .x(d => xScale(d.date))</div>
              <div class="text-white">  .y(d => yScale(d.value))</div>
              <div class="text-yellow-300">  .defined(d => d.value !== null);  <span class="text-gray-400">// 跳過 null 值</span></div>
            </div>
          </div>

          <div class="bg-green-50 border-l-4 border-green-500 p-3 rounded">
            <p class="font-semibold text-green-800 text-sm mb-2">🎨 視覺化對比</p>
            <div class="grid md:grid-cols-2 gap-3 text-xs">
              <div class="bg-white p-2 rounded border">
                <div class="font-semibold text-gray-800 mb-2">❌ 不用 d3.line()（手動計算）</div>
                <div class="bg-gray-900 text-gray-100 p-2 rounded font-mono">
                  <div class="text-white">const pathData = data.map((d, i) => {</div>
                  <div class="text-white">  const x = xScale(d.date);</div>
                  <div class="text-white">  const y = yScale(d.value);</div>
                  <div class="text-yellow-300">  return i === 0</div>
                  <div class="text-yellow-300">    ? `M ${x} ${y}`</div>
                  <div class="text-yellow-300">    : `L ${x} ${y}`;</div>
                  <div class="text-white">}).join(' ');</div>
                </div>
              </div>
              <div class="bg-white p-2 rounded border">
                <div class="font-semibold text-gray-800 mb-2">✅ 使用 d3.line()（自動生成）</div>
                <div class="bg-gray-900 text-gray-100 p-2 rounded font-mono">
                  <div class="text-white">const line = d3.line()</div>
                  <div class="text-white">  .x(d => xScale(d.date))</div>
                  <div class="text-white">  .y(d => yScale(d.value));</div>
                  <div class="text-green-400 mt-2">svg.append('path')</div>
                  <div class="text-green-400">  .attr('d', line(data));</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 互動範例 4：scaleTime 實戰 -->
      <div class="border-2 border-green-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-green-600">🎨 互動範例：scaleTime 折線圖</h4>
        <div class="flex gap-4 mb-4">
          <button type="button" @click="timeDemo1" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            最近 7 天
          </button>
          <button type="button" @click="timeDemo2" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            最近 30 天
          </button>
          <button type="button" @click="resetDemo4" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            重置
          </button>
        </div>
        <svg ref="demo4Svg" width="100%" height="200" class="bg-white rounded border"></svg>
      </div>
    </section>

    <!-- 第五部分：scaleOrdinal（序數比例尺） -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-green-700">5️⃣ scaleOrdinal() - 序數比例尺</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          <code class="bg-gray-100 px-2 py-1 rounded">scaleOrdinal()</code> 用於將<strong>離散值映射到離散值</strong>，
          最常用於<strong>顏色映射</strong>，如「類別 A → 紅色、類別 B → 藍色」。
        </p>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>// 創建顏色比例尺
const colorScale = d3.scaleOrdinal()
  .domain(['Apple', 'Banana', 'Orange'])
  .range(['#ef4444', '#fbbf24', '#f97316']);

console.log(colorScale('Apple'));   // '#ef4444'
console.log(colorScale('Banana'));  // '#fbbf24'
console.log(colorScale('Orange'));  // '#f97316'

// 使用 D3 內建的配色方案
const color1 = d3.scaleOrdinal(d3.schemeCategory10);  // 10 種顏色
const color2 = d3.scaleOrdinal(d3.schemeSet3);        // 12 種柔和色
const color3 = d3.scaleOrdinal(d3.schemePaired);      // 12 種成對色

// 自動分配顏色（不需要明確設定 domain）
const autoColor = d3.scaleOrdinal(d3.schemeCategory10);
console.log(autoColor('A'));  // 第一種顏色
console.log(autoColor('B'));  // 第二種顏色
console.log(autoColor('C'));  // 第三種顏色</code></pre>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <div class="bg-white border p-2 rounded">
            <div class="font-semibold text-xs mb-2">Category10</div>
            <div class="flex gap-1">
              <div v-for="color in ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728']" :key="color" 
                   :style="{backgroundColor: color}" class="w-8 h-8 rounded"></div>
            </div>
          </div>
          <div class="bg-white border p-2 rounded">
            <div class="font-semibold text-xs mb-2">Set3</div>
            <div class="flex gap-1">
              <div v-for="color in ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072']" :key="color" 
                   :style="{backgroundColor: color}" class="w-8 h-8 rounded"></div>
            </div>
          </div>
          <div class="bg-white border p-2 rounded">
            <div class="font-semibold text-xs mb-2">Paired</div>
            <div class="flex gap-1">
              <div v-for="color in ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c']" :key="color" 
                   :style="{backgroundColor: color}" class="w-8 h-8 rounded"></div>
            </div>
          </div>
          <div class="bg-white border p-2 rounded">
            <div class="font-semibold text-xs mb-2">Dark2</div>
            <div class="flex gap-1">
              <div v-for="color in ['#1b9e77', '#d95f02', '#7570b3', '#e7298a']" :key="color" 
                   :style="{backgroundColor: color}" class="w-8 h-8 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 互動範例 5：scaleOrdinal 實戰 -->
      <div class="border-2 border-green-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-green-600">🎨 互動範例：scaleOrdinal 分組長條圖</h4>
        <div class="flex gap-4 mb-4">
          <button type="button" @click="ordinalDemo1" class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
            Category10
          </button>
          <button type="button" @click="ordinalDemo2" class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
            Set3
          </button>
          <button type="button" @click="ordinalDemo3" class="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm">
            Paired
          </button>
          <button type="button" @click="resetDemo5" class="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">
            重置
          </button>
        </div>
        <svg ref="demo5Svg" width="100%" height="200" class="bg-white rounded border"></svg>
      </div>
    </section>

    <!-- 第六部分：實戰練習 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-green-700">6️⃣ 實戰練習：綜合應用</h3>
      
      <div class="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
        <p class="font-semibold text-green-800 mb-2">📝 練習任務：</p>
        <ol class="list-decimal list-inside space-y-2 text-green-700">
          <li>創建一個分組長條圖，使用 <code>scaleBand</code> 處理 X 軸</li>
          <li>使用 <code>scaleLinear</code> 處理 Y 軸（長條高度）</li>
          <li>使用 <code>scaleOrdinal</code> 為不同組別分配顏色</li>
          <li>實作資料更新時的平滑過渡動畫</li>
        </ol>
      </div>

      <div class="border-2 border-green-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-green-600">🎯 練習區域：分組長條圖</h4>
        <div class="flex gap-4 mb-4">
          <button type="button" @click="practiceUpdate1" class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
            更新資料
          </button>
          <button type="button" @click="practiceAddGroup" class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
            新增類別
          </button>
          <button type="button" @click="practiceRemoveGroup" class="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
            移除類別
          </button>
          <button type="button" @click="resetPractice" class="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">
            重置
          </button>
        </div>
        <svg ref="practiceSvg" width="100%" height="300" class="bg-white rounded border"></svg>
      </div>

      <details class="bg-gray-50 p-4 rounded">
        <summary class="cursor-pointer font-semibold text-green-700">💡 查看參考解答</summary>
        <div class="mt-3 bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
          <pre class="text-sm"><code>const data = [
  { category: 'Q1', values: [30, 45, 35] },
  { category: 'Q2', values: [40, 50, 38] },
  { category: 'Q3', values: [35, 48, 42] }
];

const groups = ['Product A', 'Product B', 'Product C'];

// 比例尺設定
const xScale = d3.scaleBand()
  .domain(data.map(d => d.category))
  .range([0, width])
  .padding(0.2);

const xSubScale = d3.scaleBand()
  .domain(groups)
  .range([0, xScale.bandwidth()])
  .padding(0.05);

const yScale = d3.scaleLinear()
  .domain([0, d3.max(data, d => d3.max(d.values))])
  .range([height, 0])
  .nice();

const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
  .domain(groups);

// 繪製長條
data.forEach(d => {
  svg.selectAll(\`.bar-\${d.category}\`)
    .data(d.values)
    .join('rect')
      .attr('class', \`bar-\${d.category}\`)
      .attr('x', (v, i) => xScale(d.category) + xSubScale(groups[i]))
      .attr('y', v => yScale(v))
      .attr('width', xSubScale.bandwidth())
      .attr('height', v => height - yScale(v))
      .attr('fill', (v, i) => colorScale(groups[i]));
});</code></pre>
        </div>
      </details>
    </section>

    <!-- 學習總結 -->
    <section class="p-6 bg-gradient-to-r from-green-100 to-teal-100 rounded-lg">
      <h3 class="text-2xl font-bold mb-4 text-green-800">✅ 學習總結</h3>
      <div class="grid md:grid-cols-2 gap-4">
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="font-bold text-green-700 mb-2">🎯 核心知識點</h4>
          <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li><code>scaleLinear()</code> - 連續數值映射</li>
            <li><code>scaleBand()</code> - 類別資料映射</li>
            <li><code>scaleTime()</code> - 時間序列映射</li>
            <li><code>scaleOrdinal()</code> - 顏色映射</li>
            <li>Domain 和 Range 的概念</li>
          </ul>
        </div>
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="font-bold text-teal-700 mb-2">🚀 下一步</h4>
          <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>學習 Axes（座標軸）</li>
            <li>將比例尺轉換為可視化的刻度</li>
            <li>使用 <code>.call()</code> 方法</li>
            <li>自訂座標軸樣式與格式</li>
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
const demo5Svg = ref(null);
const practiceSvg = ref(null);

const inputValue = ref(50);
const mappedValue = ref(250);
const linearData = ref([30, 45, 60, 35, 50]);
const clampEnabled = ref(false);
const paddingValue = ref(0.1);
const bandwidthValue = ref(0);
const stepValue = ref(0);
const practiceData=ref([
  { category: 'A', values: [30, 50, 70] },
  { category: 'B', values: [40, 60, 80] },
  { category: 'C', values: [20, 40, 60] }
]);

// Demo 1: 比例尺映射視覺化
const updateScaleDemo = () => {
  const scale = d3.scaleLinear().domain([0, 100]).range([0, 500]);
  mappedValue.value = Math.round(scale(inputValue.value));
  
  const svg = d3.select(demo1Svg.value);
  
  // 計算座標
  const inputX = 50 + (inputValue.value / 100) * 500;
  const outputX = 50 + mappedValue.value;

  // --- 1. 靜態背景層 (軸線) ---
  // 這裡我們可以用一個簡單的技巧：給予 class，如果選不到就 append，選得到就略過
  // 或者使用 join 綁定固定資料
  const axesData = [
    { y: 50, color: '#3b82f6', label: '0', labelX: 25, label2: '100', label2X: 575 },
    { y: 100, color: '#8b5cf6', label: '0', labelX: 25, label2: '500', label2X: 575 }
  ];

  // 使用 group (g) 來包裝軸線相關元素
  svg.selectAll('.axis-group')
    .data(axesData)
    .join(
      enter => {
        const g = enter.append('g').attr('class', 'axis-group');
        // 軸線
        g.append('line')
          .attr('x1', 50).attr('x2', 550)
          .attr('y1', d => d.y).attr('y2', d => d.y)
          .attr('stroke', d => d.color).attr('stroke-width', 2);
        // 左標籤
        g.append('text')
          .attr('x', d => d.labelX).attr('y', d => d.y + 5)
          .attr('text-anchor', 'end').attr('fill', d => d.color).text(d => d.label);
        // 右標籤
        g.append('text')
          .attr('x', d => d.label2X).attr('y', d => d.y + 5)
          .attr('text-anchor', 'start').attr('fill', d => d.color).text(d => d.label2);
          //  console.log('enter', g.size());
        return g;
       
      }
    );

  // --- 2. 動態互動層 ---
  
  // 連接線 (使用 join 確保只有一條線被更新)
  svg.selectAll('.connector-line')
    .data([1]) // 綁定虛擬資料
    .join('line')
    .attr('class', 'connector-line')
    .attr('stroke', '#10b981').attr('stroke-width', 2).attr('stroke-dasharray', '5,5')
    // 只有這裡會隨著數值改變而更新
    .attr('x1', inputX).attr('y1', 56)
    .attr('x2', outputX).attr('y2', 94);
      
  // 圓點 (將兩個圓點視為一組資料)
  const circlesData = [
    { x: inputX, y: 50, color: '#3b82f6' },
    { x: outputX, y: 100, color: '#8b5cf6' }
  ];

  svg.selectAll('.data-point')
    .data(circlesData)
    .join('circle')
    .attr('class', 'data-point')
    .attr('r', 6)
    .attr('fill', d => d.color)
    // 平滑過渡效果 (這是 remove() 做不到的)
    .transition().duration(100) 
    .attr('cx', d => d.x)
    .attr('cy', d => d.y);
};

// Demo 2: scaleLinear 長條圖
const linearDemo1 = () => {
  linearData.value = Array.from({ length: 5 }, () => Math.floor(Math.random() * 80) + 20);
  updateLinearDemo();
};

const toggleClamp = () => {
  clampEnabled.value = !clampEnabled.value;
  updateLinearDemo();
};

const updateLinearDemo = () => {
  const svg = d3.select(demo2Svg.value);
  svg.selectAll('*').remove();
  
  const width = 500;
  const height = 200;
  const xScale = d3.scaleBand()
    .domain(linearData.value.map((d, i) => i))
    .range([50, width - 50])
    .padding(0.2);
  
  const yScale = d3.scaleLinear()
    .domain([0, 100])
    .range([height - 40, 20]);
  
  if (clampEnabled.value) yScale.clamp(true);
  
  svg.selectAll('rect')
    .data(linearData.value)
    .join('rect')
      .attr('x', (d, i) => xScale(i))
      .attr('y', d => yScale(d))
      .attr('width', xScale.bandwidth())
      .attr('height', d => height - 40 - yScale(d))
      .attr('fill', '#3b82f6');
  
  svg.selectAll('text')
    .data(linearData.value)
    .join('text')
      .attr('x', (d, i) => xScale(i) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d) - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#374151')
      .attr('font-size', '12')
      .text(d => d);
};

const resetDemo2 = () => {
  linearData.value = [30, 45, 60, 35, 50];
  clampEnabled.value = false;
  d3.select(demo2Svg.value).selectAll('*').remove();
};

// Demo 3: scaleBand
const updateBandDemo = () => {
  const svg = d3.select(demo3Svg.value);
  svg.selectAll('*').remove();
  
  const data = [
    { category: 'Apple', value: 45 },
    { category: 'Banana', value: 60 },
    { category: 'Orange', value: 35 },
    { category: 'Grape', value: 50 }
  ];
  
  const width = 680;
  const height = 250;
  const margin = { top: 20, right: 20, bottom: 60, left: 60 };
  
  const xScale = d3.scaleBand()
    .domain(data.map(d => d.category))
    .range([margin.left, width - margin.right])
    .padding(paddingValue.value);
  
  const yScale = d3.scaleLinear()
    .domain([0, 80])
    .range([height - margin.bottom, margin.top]);
  
  bandwidthValue.value = xScale.bandwidth();
  stepValue.value = xScale.step();
  
  const colors = ['#ef4444', '#fbbf24', '#f97316', '#8b5cf6'];
  
  svg.selectAll('rect')
    .data(data)
    .join('rect')
      .attr('x', d => xScale(d.category))
      .attr('y', d => yScale(d.value))
      .attr('width', xScale.bandwidth())
      .attr('height', d => height - margin.bottom - yScale(d.value))
      .attr('fill', (d, i) => colors[i]);
  
  svg.selectAll('text')
    .data(data)
    .join('text')
      .attr('x', d => xScale(d.category) + xScale.bandwidth() / 2)
      .attr('y', height - margin.bottom + 20)
      .attr('text-anchor', 'middle')
      .attr('fill', '#374151')
      .attr('font-size', '14')
      .text(d => d.category);
};

// Demo 4: scaleTime
const timeDemo1 = () => {
  generateTimeData(7);
};

const timeDemo2 = () => {
  generateTimeData(30);
};

const generateTimeData = (days) => {
  const svg = d3.select(demo4Svg.value);
  svg.selectAll('*').remove();
  
  const now = new Date();
  const data = Array.from({ length: days }, (_, i) => ({
    date: new Date(now.getTime() - (days - i - 1) * 24 * 60 * 60 * 1000),
    value: Math.random() * 50 + 20
  }));
  console.log(data);
  
  const width = 500;
  const height = 200;
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
  
  const xScale = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([margin.left, width - margin.right]);
  
  console.log(data,xScale.domain(),xScale.range());
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)])
    .range([height - margin.bottom, margin.top]);
  
  const line = d3.line()
    .x(d => xScale(d.date))
    .y(d => yScale(d.value));
    console.log('line path:', line(data));
  
  svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', '#3b82f6')
    .attr('stroke-width', 2)
    .attr('d', line);
  
  svg.selectAll('circle')
    .data(data)
    .join('circle')
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(d.value))
      .attr('r', 4)
      .attr('fill', '#3b82f6');
};

const resetDemo4 = () => {
  d3.select(demo4Svg.value).selectAll('*').remove();
};

// Demo 5: scaleOrdinal
const ordinalDemo1 = () => {
  updateOrdinalDemo(d3.schemeCategory10);
};

const ordinalDemo2 = () => {
  updateOrdinalDemo(d3.schemeSet3);
};

const ordinalDemo3 = () => {
  updateOrdinalDemo(d3.schemePaired);
};

const updateOrdinalDemo = (scheme) => {
  const svg = d3.select(demo5Svg.value);
  svg.selectAll('*').remove();
  
  const data = [
    { category: 'A', values: [30, 40, 35] },
    { category: 'B', values: [45, 50, 38] },
    { category: 'C', values: [40, 45, 42] }
  ];
  
  const groups = ['Group 1', 'Group 2', 'Group 3'];
  const colorScale = d3.scaleOrdinal(scheme).domain(groups);
  
  const width = 500;
  const height = 200;
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
  
  const xScale = d3.scaleBand()
    .domain(data.map(d => d.category))
    .range([margin.left, width - margin.right])
    .padding(0.2);
  
  const xSubScale = d3.scaleBand()
    .domain(groups)
    .range([0, xScale.bandwidth()])
    .padding(0.05);
  
  const yScale = d3.scaleLinear()
    .domain([0, 60])
    .range([height - margin.bottom, margin.top]);
  
    // 繪製長條(教學用法)
  // data.forEach(d => {
  //   d.values.forEach((v, i) => {
  //     svg.append('rect')
  //       .attr('x', xScale(d.category) + xSubScale(groups[i]))
  //       .attr('y', yScale(v))
  //       .attr('width', xSubScale.bandwidth())
  //       .attr('height', height - margin.bottom - yScale(v))
  //       .attr('fill', colorScale(groups[i]));
  //   });
  // });
  // 標準寫法
  svg.selectAll('g.group')
    .data(data)
    .join('g')
      .attr('class', 'group')
      .attr('transform', d => `translate(${xScale(d.category)}, 0)`)
    .selectAll('rect')
    .data(d => d.values)
    .join('rect')
      .attr('x', (v, i) => xSubScale(groups[i]))
      .attr('y', v => yScale(v))
      .attr('width', xSubScale.bandwidth())
      .attr('height', v => height - margin.bottom - yScale(v))
      .attr('fill', (v, i) => colorScale(groups[i]));
};

const resetDemo5 = () => {
  d3.select(demo5Svg.value).selectAll('*').remove();
};

// Practice



const practiceUpdate1 = () => {
  // 留給學生實作
  const svg = d3.select(practiceSvg.value);
  svg.selectAll('*').remove();
  
  const groups = ['Group 1', 'Group 2', 'Group 3'];
  const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(groups);
  
  const width = 800;
  const height = 300;
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
  
  const xScale = d3.scaleBand()
    .domain(practiceData.value.map(d => d.category))
    .range([margin.left, width - margin.right])
    .padding(0.2);
  
  const xSubScale = d3.scaleBand()
    .domain(groups)
    .range([0, xScale.bandwidth()])
    .padding(0.05);
  
  const yScale = d3.scaleLinear()
    .domain([0, Math.max(...practiceData.value.map(d => Math.max(...d.values)))])
    .range([height - margin.bottom, margin.top]);
  
    // 繪製長條(教學用法)
  // data.forEach(d => {
  //   d.values.forEach((v, i) => {
  //     svg.append('rect')
  //       .attr('x', xScale(d.category) + xSubScale(groups[i]))
  //       .attr('y', yScale(v))
  //       .attr('width', xSubScale.bandwidth())
  //       .attr('height', height - margin.bottom - yScale(v))
  //       .attr('fill', colorScale(groups[i]));
  //   });
  // });
  // 標準寫法
  svg.selectAll('g.group')
    .data(practiceData.value)
    .join('g')
      .attr('class', 'group')
      .attr('transform', d => `translate(${xScale(d.category)}, 0)`)
    .selectAll('rect')
    .data(d => d.values)
    .join('rect')
      .attr('x', (v, i) => xSubScale(groups[i]))
      .attr('y', v => yScale(v))
      .attr('width', xSubScale.bandwidth())
      .attr('height', v => height - margin.bottom - yScale(v))
      .attr('fill', (v, i) => colorScale(groups[i]));
};

const practiceAddGroup = () => {
  // 自動產生下一個類別名稱 (D, E, F...)
  const newCategory = String.fromCharCode(65 + practiceData.value.length);
  
  // 新增一個類別到資料中
  practiceData.value.push({
    category: newCategory,
    values: [
      Math.floor(Math.random() * 60) + 20,  // Group 1 的隨機值
      Math.floor(Math.random() * 60) + 20,  // Group 2 的隨機值
      Math.floor(Math.random() * 60) + 20   // Group 3 的隨機值
    ]
  });
  
  // 重新繪製圖表
  practiceUpdate1();
};

const practiceRemoveGroup = () => {
  // 確保至少保留一個類別
  if (practiceData.value.length > 1) {
    practiceData.value.pop();  // 移除最後一個類別
    practiceUpdate1();
  }
};

const resetPractice = () => {
  practiceData.value = [
    { category: 'A', values: [30, 50, 70] },
    { category: 'B', values: [40, 60, 80] },
    { category: 'C', values: [20, 40, 60] }
  ];
  d3.select(practiceSvg.value).selectAll('*').remove();
};


// 初始化
setTimeout(() => {
  updateScaleDemo();
  updateBandDemo();
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
