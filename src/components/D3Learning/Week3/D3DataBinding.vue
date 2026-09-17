<template>
  <div class="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
    <h2 class="text-3xl font-bold mb-6 text-blue-800">🔗 D3 Data Binding（資料綁定）</h2>

    <!-- 學習目標 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-xl font-bold mb-4 text-blue-700">🎯 學習目標</h3>
      <ul class="list-disc list-inside space-y-2 text-gray-700">
        <li>理解 D3 資料驅動（Data-Driven）的核心概念</li>
        <li>掌握 <code class="bg-blue-100 px-2 py-1 rounded">.data()</code> 方法將資料與 DOM 綁定</li>
        <li>理解 Enter-Update-Exit 模式（傳統方法）</li>
        <li>學會使用 <code class="bg-blue-100 px-2 py-1 rounded">.join()</code> 語法（現代推薦）</li>
        <li>理解 Key Function 的重要性與使用場景</li>
        <li>實作動態資料更新的視覺化</li>
      </ul>
    </section>

    <!-- 第一部分：資料驅動的概念 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-blue-700">1️⃣ 什麼是資料驅動？</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          D3 的核心哲學是「資料驅動文檔」（Data-Driven Documents）。不同於傳統手動創建每個 DOM 元素，
          D3 讓你<strong>聲明資料與視覺元素的對應關係</strong>，然後自動處理創建、更新、刪除。
        </p>
        
        <div class="grid md:grid-cols-2 gap-4 mb-4">
          <div class="bg-red-50 border-l-4 border-red-500 p-4">
            <p class="font-semibold text-red-800 mb-2">❌ 傳統方式（命令式）</p>
            <div class="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
              <pre><code>// 手動創建每個圓形
const data = [10, 20, 30, 40];
const svg = document.querySelector('svg');

data.forEach((d, i) => {
  const circle = document.createElementNS(
    'http://www.w3.org/2000/svg', 
    'circle'
  );
  circle.setAttribute('cx', i * 50 + 25);
  circle.setAttribute('cy', 50);
  circle.setAttribute('r', d);
  svg.appendChild(circle);
});</code></pre>
            </div>
          </div>

          <div class="bg-green-50 border-l-4 border-green-500 p-4">
            <p class="font-semibold text-green-800 mb-2">✅ D3 方式（聲明式）</p>
            <div class="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
              <pre><code>// 聲明資料與圓形的對應關係
const data = [10, 20, 30, 40];

d3.select('svg')
  .selectAll('circle')
  .data(data)
  .join('circle')
    .attr('cx', (d, i) => i * 50 + 25)
    .attr('cy', 50)
    .attr('r', d => d);</code></pre>
            </div>
          </div>
        </div>

        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <p class="font-semibold text-blue-800 mb-2">🔑 核心概念：</p>
          <ul class="list-disc list-inside space-y-1 text-blue-700">
            <li><code>.data(array)</code> - 將資料陣列與選擇集綁定</li>
            <li><code>.join(element)</code> - 自動處理新增、更新、刪除（現代語法）</li>
            <li>資料改變 → 視覺自動更新（響應式）</li>
            <li>每個資料項對應一個 DOM 元素</li>
          </ul>
        </div>
      </div>

      <!-- 互動範例 1：基本資料綁定 -->
      <div class="border-2 border-blue-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-blue-600">🎨 互動範例：基本資料綁定</h4>
        <div class="flex gap-4 mb-4">
          <button type="button" @click="basicBinding" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            綁定資料並繪製
          </button>
          <button type="button" @click="updateData1" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            更新資料
          </button>
          <button type="button" @click="resetDemo1" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            重置
          </button>
        </div>
        <svg ref="demo1Svg" width="100%" height="120" class="bg-white rounded border"></svg>
        <div class="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
          <strong>當前資料：</strong> {{ currentData1.join(', ') }}
        </div>
      </div>
    </section>

    <!-- 第二部分：.data() 方法詳解 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-blue-700">2️⃣ .data() 方法詳解</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          <code class="bg-gray-100 px-2 py-1 rounded">.data()</code> 方法是 D3 資料綁定的核心。
          它將資料陣列與選擇集中的元素一一對應。
        </p>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>// .data() 方法的基本使用
const data = [5, 10, 15, 20, 25];

const circles = d3.select('svg')
  .selectAll('circle')  // 選擇所有圓形（可能還不存在）
  .data(data);          // 將資料與圓形綁定

// 此時 circles 包含三個「虛擬集合」：
// 1. update: 資料與現有元素匹配的部分
// 2. enter: 資料多於元素，需要新增的部分
// 3. exit: 元素多於資料，需要刪除的部分

// 回調函數中可以訪問綁定的資料
circles.attr('r', d => d);  // d 就是綁定的資料值
circles.attr('fill', (d, i) => {
  // d: 當前資料值
  // i: 索引
  return i % 2 === 0 ? 'blue' : 'red';
});</code></pre>
        </div>

        <div class="overflow-x-auto mb-4">
          <table class="min-w-full bg-white border">
            <thead class="bg-blue-100">
              <tr>
                <th class="px-4 py-2 border text-left">參數</th>
                <th class="px-4 py-2 border text-left">說明</th>
                <th class="px-4 py-2 border text-left">範例</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="px-4 py-2 border"><code>d</code></td>
                <td class="px-4 py-2 border">當前綁定的資料值</td>
                <td class="px-4 py-2 border"><code>.attr('r', d => d * 2)</code></td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border"><code>i</code></td>
                <td class="px-4 py-2 border">當前元素的索引（從 0 開始）</td>
                <td class="px-4 py-2 border"><code>.attr('cx', (d, i) => i * 50)</code></td>
              </tr>
              <tr>
                <td class="px-4 py-2 border"><code>nodes</code></td>
                <td class="px-4 py-2 border">當前組的所有節點陣列</td>
                <td class="px-4 py-2 border"><code>(d, i, nodes) => nodes.length</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 互動範例 2：回調函數參數 -->
      <div class="border-2 border-blue-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-blue-600">🎨 互動範例：回調函數參數</h4>
        <div class="flex gap-4 mb-4">
          <button type="button" @click="demoCallback" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            使用 d, i 參數
          </button>
          <button type="button" @click="resetDemo2" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            重置
          </button>
        </div>
        <svg ref="demo2Svg" width="100%" height="150" class="bg-white rounded border"></svg>
        <div class="mt-2 text-sm bg-gray-50 p-2 rounded">
          <strong>範例：</strong>圓形大小來自資料 (d)，位置來自索引 (i)，顏色根據索引變化
        </div>
      </div>
    </section>

    <!-- 第三部分：Enter-Update-Exit 模式 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-blue-700">3️⃣ Enter-Update-Exit 模式（傳統）</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          在 D3 v5 之前，需要手動處理三種狀態。雖然現在推薦使用 <code>.join()</code>，
          但理解這個模式有助於深入了解 D3 的工作原理。
        </p>

        <div class="grid md:grid-cols-3 gap-4 mb-4">
          <div class="bg-green-50 border-2 border-green-500 p-4 rounded">
            <h4 class="font-bold text-green-800 mb-2">📥 Enter</h4>
            <p class="text-sm text-green-700">資料多於元素，需要新增</p>
            <div class="mt-2 bg-green-100 p-2 rounded text-xs">
              資料: [1, 2, 3]<br>
              元素: [•]<br>
              → 需要新增 2 個
            </div>
          </div>

          <div class="bg-blue-50 border-2 border-blue-500 p-4 rounded">
            <h4 class="font-bold text-blue-800 mb-2">🔄 Update</h4>
            <p class="text-sm text-blue-700">資料與元素匹配，需要更新</p>
            <div class="mt-2 bg-blue-100 p-2 rounded text-xs">
              資料: [1, 2, 3]<br>
              元素: [•, •, •]<br>
              → 全部匹配
            </div>
          </div>

          <div class="bg-red-50 border-2 border-red-500 p-4 rounded">
            <h4 class="font-bold text-red-800 mb-2">📤 Exit</h4>
            <p class="text-sm text-red-700">元素多於資料，需要刪除</p>
            <div class="mt-2 bg-red-100 p-2 rounded text-xs">
              資料: [1]<br>
              元素: [•, •, •]<br>
              → 需要刪除 2 個
            </div>
          </div>
        </div>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>// Enter-Update-Exit 完整範例
const data = [10, 20, 30, 40];

// 1. 綁定資料
const circles = d3.select('svg')
  .selectAll('circle')
  .data(data);

// 2. Enter: 處理新資料（需要新增元素）
circles.enter()
  .append('circle')
    .attr('cx', (d, i) => i * 60 + 30)
    .attr('cy', 50)
    .attr('r', 0)  // 初始大小為 0
    .attr('fill', 'steelblue')
  .transition()
    .duration(500)
    .attr('r', d => d);  // 動畫到實際大小

// 3. Update: 處理現有元素（更新屬性）
circles
  .transition()
  .duration(500)
  .attr('r', d => d)
  .attr('fill', 'orange');

// 4. Exit: 處理多餘元素（需要刪除）
circles.exit()
  .transition()
  .duration(500)
  .attr('r', 0)  // 縮小到 0
  .remove();     // 從 DOM 移除</code></pre>
        </div>
      </div>

      <!-- 互動範例 3：Enter-Update-Exit -->
      <div class="border-2 border-blue-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-blue-600">🎨 互動範例：Enter-Update-Exit 模式</h4>
        <div class="flex flex-wrap gap-2 mb-4">
          <button type="button" @click="enterDemo" class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
            📥 Enter（新增資料）
          </button>
          <button type="button" @click="updateDemo" class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
            🔄 Update（更新資料）
          </button>
          <button type="button" @click="exitDemo" class="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
            📤 Exit（減少資料）
          </button>
          <button type="button" @click="resetDemo3" class="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">
            重置
          </button>
        </div>
        <svg ref="demo3Svg" width="100%" height="120" class="bg-white rounded border"></svg>
        <div class="mt-2 text-sm bg-gray-50 p-2 rounded">
          <strong>當前資料：</strong> {{ currentData3.join(', ') }}<br>
          <strong>元素數量：</strong> <span ref="elementCount3">0</span> 個圓形
        </div>
      </div>
    </section>

    <!-- 第四部分：.join() 語法（現代推薦） -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-blue-700">4️⃣ .join() 語法（現代推薦）⭐</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          D3 v5+ 引入了 <code class="bg-blue-100 px-2 py-1 rounded">.join()</code> 方法，
          簡化了 Enter-Update-Exit 的處理。這是<strong>目前推薦的做法</strong>！
        </p>

        <div class="grid md:grid-cols-2 gap-4 mb-4">
          <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <p class="font-semibold text-yellow-800 mb-2">⚠️ 舊方式（冗長）</p>
            <div class="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
              <pre><code>const circles = svg
  .selectAll('circle')
  .data(data);

circles.enter()
  .append('circle')
  .merge(circles)
  .attr('r', d => d);

circles.exit().remove();</code></pre>
            </div>
          </div>

          <div class="bg-green-50 border-l-4 border-green-500 p-4">
            <p class="font-semibold text-green-800 mb-2">✅ 新方式（簡潔）</p>
            <div class="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
              <pre><code>svg
  .selectAll('circle')
  .data(data)
  .join('circle')
  .attr('r', d => d);</code></pre>
            </div>
          </div>
        </div>

        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <p class="font-semibold text-blue-800 mb-2">🔑 .join() 的三種用法：</p>
          <div class="space-y-3">
            <div>
              <p class="font-semibold text-blue-700">1️⃣ 簡單用法（最常用）</p>
              <div class="bg-gray-900 text-gray-100 p-2 rounded text-xs mt-1">
                <code>.join('circle')</code> - 自動處理所有情況
              </div>
            </div>
            <div>
              <p class="font-semibold text-blue-700">2️⃣ 自訂 Enter 行為</p>
              <div class="bg-gray-900 text-gray-100 p-2 rounded text-xs mt-1 overflow-x-auto">
                <pre><code>.join(
  enter => enter.append('circle').attr('r', 0),
  update => update.attr('fill', 'orange'),
  exit => exit.remove()
)</code></pre>
              </div>
            </div>
            <div>
              <p class="font-semibold text-blue-700">3️⃣ 帶動畫的完整控制</p>
              <div class="bg-gray-900 text-gray-100 p-2 rounded text-xs mt-1 overflow-x-auto">
                <pre><code>.join(
  enter => enter.append('circle')
    .attr('r', 0)
    .call(enter => enter.transition().attr('r', d => d)),
  update => update
    .call(update => update.transition().attr('fill', 'blue')),
  exit => exit
    .call(exit => exit.transition().attr('r', 0).remove())
)</code></pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 互動範例 4：.join() 實戰 -->
      <div class="border-2 border-blue-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-blue-600">🎨 互動範例：.join() 實戰</h4>
        <div class="flex flex-wrap gap-2 mb-4">
          <button type="button" @click="joinDemo1" class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
            簡單 join
          </button>
          <button type="button" @click="joinDemo2" class="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm">
            自訂 Enter 動畫
          </button>
          <button type="button" @click="joinDemo3" class="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm">
            完整控制（帶動畫）
          </button>
          <button type="button" @click="randomizeData" class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
            🎲 隨機資料
          </button>
          <button type="button" @click="resetDemo4" class="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">
            重置
          </button>
        </div>
        <svg ref="demo4Svg" width="100%" height="120" class="bg-white rounded border"></svg>
        <div class="mt-2 text-sm bg-gray-50 p-2 rounded">
          <strong>當前資料：</strong> {{ currentData4.join(', ') }}
        </div>
      </div>
    </section>

    <!-- 第五部分：Key Function -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-blue-700">5️⃣ Key Function（識別碼函數）</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          預設情況下，D3 用<strong>索引</strong>來匹配資料與元素。但當資料順序改變時，會導致錯誤的匹配。
          Key Function 讓你指定唯一識別碼，確保正確匹配。
        </p>

        <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p class="font-semibold text-red-800 mb-2">❌ 沒有 Key Function 的問題：</p>
          <div class="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
            <pre><code>// 初始資料
let data = [
  { id: 'A', value: 10 },
  { id: 'B', value: 20 },
  { id: 'C', value: 30 }
];

// 綁定資料（依索引匹配）
svg.selectAll('circle')
  .data(data)
  .join('circle')
  .attr('fill', d => d.id === 'A' ? 'red' : 'blue');

// 改變順序
data = [
  { id: 'C', value: 30 },  // 索引 0
  { id: 'A', value: 10 },  // 索引 1
  { id: 'B', value: 20 }   // 索引 2
];

// 問題：原本紅色的圓形（索引 0）現在顯示 C 的資料！</code></pre>
            </div>
          </div>

        <div class="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <p class="font-semibold text-green-800 mb-2">✅ 使用 Key Function 解決：</p>
          <div class="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
            <pre><code>// 使用 id 作為 key
svg.selectAll('circle')
  .data(data, d => d.id)  // 第二個參數是 key function
  .join('circle')
  .attr('fill', d => d.id === 'A' ? 'red' : 'blue');

// 現在無論順序如何改變，A 始終是紅色！</code></pre>
          </div>
        </div>

        <div class="overflow-x-auto mb-4">
          <table class="min-w-full bg-white border">
            <thead class="bg-blue-100">
              <tr>
                <th class="px-4 py-2 border text-left">情境</th>
                <th class="px-4 py-2 border text-left">是否需要 Key Function</th>
                <th class="px-4 py-2 border text-left">說明</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="px-4 py-2 border">資料順序固定</td>
                <td class="px-4 py-2 border">❌ 不需要</td>
                <td class="px-4 py-2 border">用索引匹配即可</td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border">資料會排序</td>
                <td class="px-4 py-2 border">✅ 需要</td>
                <td class="px-4 py-2 border">確保元素跟著資料移動</td>
              </tr>
              <tr>
                <td class="px-4 py-2 border">資料會增刪</td>
                <td class="px-4 py-2 border">✅ 需要</td>
                <td class="px-4 py-2 border">正確識別哪些要刪除/新增</td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border">動畫過渡</td>
                <td class="px-4 py-2 border">✅ 強烈建議</td>
                <td class="px-4 py-2 border">讓動畫更流暢合理</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 互動範例 5：Key Function 對比 -->
      <div class="border-2 border-blue-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-blue-600">🎨 互動範例：Key Function 對比</h4>
        <div class="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <h5 class="font-semibold text-red-700 mb-2">❌ 沒有 Key Function</h5>
            <div class="flex gap-2 mb-2">
              <button type="button" @click="sortNoKey" class="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                排序
              </button>
              <button type="button" @click="shuffleNoKey" class="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                打亂
              </button>
            </div>
            <svg ref="demo5aSvg" width="100%" height="100" class="bg-white rounded border"></svg>
          </div>
          <div>
            <h5 class="font-semibold text-green-700 mb-2">✅ 有 Key Function</h5>
            <div class="flex gap-2 mb-2">
              <button type="button" @click="sortWithKey" class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                排序
              </button>
              <button type="button" @click="shuffleWithKey" class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                打亂
              </button>
            </div>
            <svg ref="demo5bSvg" width="100%" height="100" class="bg-white rounded border"></svg>
          </div>
        </div>
        <div class="text-sm bg-yellow-50 border-l-4 border-yellow-500 p-3">
          <strong>觀察：</strong>左側圓形顏色會混亂（因為依索引匹配），右側圓形顏色始終正確（依 id 匹配）
        </div>
      </div>
    </section>

    <!-- 第六部分：比例尺預習 (Scales Preview) -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-blue-700">6️⃣ 比例尺預習 (Scales Preview)</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          在實作長條圖之前，我們需要先了解兩個最常用的比例尺：<code>scaleBand</code> 和 <code>scaleLinear</code>。
          比例尺本質上是<strong>數學轉換函數</strong>，負責將「資料數值」轉換為「螢幕像素座標」。
        </p>

        <div class="grid md:grid-cols-2 gap-6 mb-6">
          <!-- scaleBand 介紹 -->
          <div class="bg-indigo-50 border-2 border-indigo-200 p-4 rounded-lg">
            <h4 class="font-bold text-indigo-800 mb-2 text-lg">📊 d3.scaleBand()</h4>
            <p class="text-sm text-indigo-700 mb-3">專門處理<strong>類別資料</strong>（如 A, B, C），常用於長條圖的 X 軸。</p>
            
            <div class="bg-white p-3 rounded border border-indigo-100 mb-3">
              <div class="text-xs font-mono text-gray-600 mb-1">輸入 (Domain): ['A', 'B', 'C']</div>
              <div class="h-8 bg-gray-100 rounded relative flex items-center">
                <div class="absolute h-6 bg-indigo-400 rounded opacity-80 flex items-center justify-center text-white text-xs" style="left: 5%; width: 25%">A</div>
                <div class="absolute h-6 bg-indigo-400 rounded opacity-80 flex items-center justify-center text-white text-xs" style="left: 37.5%; width: 25%">B</div>
                <div class="absolute h-6 bg-indigo-400 rounded opacity-80 flex items-center justify-center text-white text-xs" style="left: 70%; width: 25%">C</div>
              </div>
              <div class="text-xs font-mono text-gray-600 mt-1">輸出 (Range): [0, width]</div>
            </div>

            <ul class="list-disc list-inside text-sm text-indigo-800 space-y-1">
              <li><code>.domain(['A', 'B'])</code>: 設定類別清單</li>
              <li><code>.range([0, width])</code>: 設定繪圖範圍</li>
              <li><code>.padding(0.2)</code>: 設定間距比例 (0~1)</li>
              <li><code>x('A')</code>: 取得 A 的起始座標</li>
              <li><code>x.bandwidth()</code>: 取得每個長條的寬度</li>
            </ul>
          </div>

          <!-- scaleLinear 介紹 -->
          <div class="bg-pink-50 border-2 border-pink-200 p-4 rounded-lg">
            <h4 class="font-bold text-pink-800 mb-2 text-lg">📈 d3.scaleLinear()</h4>
            <p class="text-sm text-pink-700 mb-3">處理<strong>連續數值</strong>（如 0~100），常用於長條圖的高度或 Y 軸。</p>
            
            <div class="bg-white p-3 rounded border border-pink-100 mb-3">
              <div class="flex justify-between text-xs font-mono text-gray-600 mb-1">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
              <div class="h-2 bg-gradient-to-r from-white to-pink-500 rounded mb-1"></div>
              <div class="flex justify-between text-xs font-mono text-gray-600">
                <span>height</span>
                <span>height/2</span>
                <span>0</span>
              </div>
            </div>

            <ul class="list-disc list-inside text-sm text-pink-800 space-y-1">
              <li><code>.domain([0, 100])</code>: 設定數值範圍</li>
              <li><code>.range([height, 0])</code>: 設定像素範圍</li>
              <li>⚠️ 注意 Y 軸通常是反轉的 (height -> 0)</li>
              <li><code>y(50)</code>: 取得數值 50 對應的座標</li>
            </ul>
          </div>
        </div>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>// 實戰應用：定義比例尺
const x = d3.scaleBand()
  .domain(data.map(d => d.id))  // ['A', 'B', 'C', 'D']
  .range([0, chartWidth])
  .padding(0.2);

const y = d3.scaleLinear()
  .domain([0, 100])             // 假設數值最大為 100
  .range([chartHeight, 0]);     // 0 對應底部，100 對應頂部

// 使用比例尺繪圖
rect
  .attr('x', d => x(d.id))      // 自動計算 x 座標
  .attr('y', d => y(d.value))   // 自動計算 y 座標
  .attr('width', x.bandwidth()) // 自動計算寬度
  .attr('height', d => chartHeight - y(d.value)); // 計算高度</code></pre>
        </div>
      </div>
    </section>

    <!-- 第七部分：實戰練習 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-blue-700">7️⃣ 實戰練習：動態長條圖</h3>
      
      <div class="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
        <p class="font-semibold text-green-800 mb-2">📝 練習任務：</p>
        <ol class="list-decimal list-inside space-y-2 text-green-700">
          <li>使用 <code>.join()</code> 創建動態長條圖</li>
          <li>實作「新增資料」、「更新資料」、「刪除資料」功能</li>
          <li>使用 Key Function 確保動畫流暢</li>
          <li>添加數值標籤顯示長條高度</li>
        </ol>
      </div>

      <div class="border-2 border-green-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-green-600">🎯 練習區域：動態長條圖</h4>
        <div class="flex flex-wrap gap-2 mb-4">
          <button type="button" @click="practiceAdd" class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
            ➕ 新增資料
          </button>
          <button type="button" @click="practiceUpdate" class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
            🔄 隨機更新
          </button>
          <button type="button" @click="practiceRemove" class="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
            ➖ 刪除最後一個
          </button>
          <button type="button" @click="practiceSort" class="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm">
            📊 排序
          </button>
          <button type="button" @click="resetPractice" class="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">
            重置
          </button>
        </div>
        <svg ref="practiceSvg" width="100%" height="250" class="bg-white rounded border"></svg>
        <div class="mt-2 text-sm bg-gray-50 p-2 rounded">
          <strong>當前資料：</strong> {{ practiceData.map(d => `${d.id}:${d.value}`).join(', ') }}
        </div>
      </div>

      <details class="bg-gray-50 p-4 rounded">
        <summary class="cursor-pointer font-semibold text-blue-700">💡 查看參考解答</summary>
        <div class="mt-3 bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
          <pre class="text-sm"><code>const margin = { top: 20, right: 20, bottom: 40, left: 40 };
const width = 600 - margin.left - margin.right;
const height = 250 - margin.top - margin.bottom;

const svg = d3.select('svg')
  .attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom)
  .append('g')
  .attr('transform', \`translate(\${margin.left}, \${margin.top})\`);

function update(data) {
  // 比例尺
  const x = d3.scaleBand()
    .domain(data.map(d => d.id))
    .range([0, width])
    .padding(0.2);
  
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)])
    .range([height, 0]);

  // 更新長條
  svg.selectAll('.bar')
    .data(data, d => d.id)  // Key function!
    .join(
      enter => enter.append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.id))
        .attr('y', height)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', 'steelblue')
        .call(enter => enter.transition()
          .duration(500)
          .attr('y', d => y(d.value))
          .attr('height', d => height - y(d.value))
        ),
      update => update
        .call(update => update.transition()
          .duration(500)
          .attr('x', d => x(d.id))
          .attr('y', d => y(d.value))
          .attr('width', x.bandwidth())
          .attr('height', d => height - y(d.value))
        ),
      exit => exit
        .call(exit => exit.transition()
          .duration(500)
          .attr('y', height)
          .attr('height', 0)
          .remove()
        )
    );

  // 更新文字標籤
  svg.selectAll('.label')
    .data(data, d => d.id)
    .join('text')
      .attr('class', 'label')
      .attr('x', d => x(d.id) + x.bandwidth() / 2)
      .attr('y', d => y(d.value) - 5)
      .attr('text-anchor', 'middle')
      .text(d => d.value);
}</code></pre>
        </div>
      </details>
    </section>

    <!-- 學習總結 -->
    <section class="p-6 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg">
      <h3 class="text-2xl font-bold mb-4 text-blue-800">✅ 學習總結</h3>
      <div class="grid md:grid-cols-2 gap-4">
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="font-bold text-blue-700 mb-2">🎯 核心知識點</h4>
          <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li><code>.data(array)</code> 綁定資料與 DOM</li>
            <li><code>.join(element)</code> 自動處理增刪改</li>
            <li>Enter-Update-Exit 三種狀態</li>
            <li>Key Function 確保正確匹配</li>
            <li>回調函數參數：d, i, nodes</li>
          </ul>
        </div>
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="font-bold text-indigo-700 mb-2">🚀 下一步</h4>
          <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>學習 Scales（比例尺）</li>
            <li>將資料值映射到視覺屬性</li>
            <li>使用 scaleLinear, scaleBand</li>
            <li>實作更複雜的圖表</li>
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
const demo5aSvg = ref(null);
const demo5bSvg = ref(null);
const practiceSvg = ref(null);
const elementCount3 = ref(null);

const currentData1 = ref([15, 25, 35, 20, 30]);
const currentData3 = ref([20, 30, 40]);
const currentData4 = ref([15, 25, 35, 20]);
const practiceData = ref([
  { id: 'A', value: 30 },
  { id: 'B', value: 50 },
  { id: 'C', value: 40 },
  { id: 'D', value: 60 }
]);

let dataNoKey = [
  { id: 'A', value: 30, color: '#ef4444' },
  { id: 'B', value: 50, color: '#3b82f6' },
  { id: 'C', value: 40, color: '#10b981' }
];

let dataWithKey = [...dataNoKey];

// Demo 1: 基本資料綁定
const basicBinding = () => {
  d3.select(demo1Svg.value)
    .selectAll('circle')
    .data(currentData1.value)
    .join('circle')
      .attr('cx', (d, i) => i * 80 + 50)
      .attr('cy', 60)
      .attr('r', 0)
      .attr('fill', 'steelblue')
    .transition()
    .duration(800)
      .attr('r', d => d);
};

const updateData1 = () => {
  currentData1.value = Array.from({ length: 6 }, () => Math.floor(Math.random() * 30) + 10);
  
  d3.select(demo1Svg.value)
    .selectAll('circle')
    .data(currentData1.value)
    .join('circle')
      .attr('cx', (d, i) => i * 80 + 50)
      .attr('cy', 60)
      .attr('fill', 'orange')
    .transition()
    .duration(500)
      .attr('r', d => d);
};

const resetDemo1 = () => {
  currentData1.value = [15, 25, 35, 20, 30];
  d3.select(demo1Svg.value).selectAll('*').remove();
};

// Demo 2: 回調函數參數
const demoCallback = () => {
  const data = [20, 30, 25, 40, 35];
  
  d3.select(demo2Svg.value).selectAll('*').remove();
  
  d3.select(demo2Svg.value)
    .selectAll('circle')
    .data(data)
    .join('circle')
      .attr('cx', (d, i) => i * 90 + 50)  // i 用於位置
      .attr('cy', 75)
      .attr('r', d => d)  // d 用於大小
      .attr('fill', (d, i) => i % 2 === 0 ? '#3b82f6' : '#8b5cf6')  // i 用於顏色
      .attr('opacity', 0)
    .transition()
    .duration(800)
      .attr('opacity', 0.8);
  
  d3.select(demo2Svg.value)
    .selectAll('text')
    .data(data)
    .join('text')
      .attr('x', (d, i) => i * 90 + 50)
      .attr('y', 140)
      .attr('text-anchor', 'middle')
      .attr('fill', '#374151')
      .attr('font-size', '12')
      .text((d, i) => `i=${i}, d=${d}`);
};

const resetDemo2 = () => {
  d3.select(demo2Svg.value).selectAll('*').remove();
};

// Demo 3: Enter-Update-Exit
const enterDemo = () => {
  currentData3.value = [...currentData3.value, Math.floor(Math.random() * 30) + 20];
  updateDemo3Traditional();
};

const updateDemo = () => {
  currentData3.value = currentData3.value.map(() => Math.floor(Math.random() * 30) + 20);
  updateDemo3Traditional();
};

const exitDemo = () => {
  if (currentData3.value.length > 0) {
    currentData3.value = currentData3.value.slice(0, -1);
  }
  updateDemo3Traditional();
};

const updateDemo3Traditional = () => {
  const circles = d3.select(demo3Svg.value)
    .selectAll('circle')
    .data(currentData3.value);
  
  // Enter
  circles.enter()
    .append('circle')
      .attr('cx', (d, i) => i * 80 + 50)
      .attr('cy', 60)
      .attr('r', 0)
      .attr('fill', 'steelblue')
    .merge(circles)
    .transition()
    .duration(500)
      .attr('cx', (d, i) => i * 80 + 50)
      .attr('r', d => d);
  
  // Exit
  circles.exit()
    .transition()
    .duration(500)
      .attr('r', 0)
      .remove()
      .on('end', () => {
        if (elementCount3.value) {
          elementCount3.value.textContent = currentData3.value.length;
        }
      });
  
  if (elementCount3.value) {
    elementCount3.value.textContent = currentData3.value.length;
  }
};

const resetDemo3 = () => {
  currentData3.value = [20, 30, 40];
  d3.select(demo3Svg.value).selectAll('*').remove();
  if (elementCount3.value) {
    elementCount3.value.textContent = '0';
  }
};

// Demo 4: .join() 語法
const joinDemo1 = () => {
  d3.select(demo4Svg.value)
    .selectAll('circle')
    .data(currentData4.value)
    .join('circle')
      .attr('cx', (d, i) => i * 70 + 40)
      .attr('cy', 60)
      .attr('r', d => d)
      .attr('fill', '#3b82f6');
};

const joinDemo2 = () => {
  currentData4.value = Array.from({ length: 5 }, () => Math.floor(Math.random() * 25) + 15);
  
  d3.select(demo4Svg.value)
    .selectAll('circle')
    .data(currentData4.value)
    .join(
      enter => enter.append('circle')
        .attr('cx', (d, i) => i * 70 + 40)
        .attr('cy', 60)
        .attr('r', 0)
        .attr('fill', '#10b981')
        .call(enter => enter.transition().duration(500).attr('r', d => d))
    );
};

const joinDemo3 = () => {
  currentData4.value = Array.from({ length: Math.floor(Math.random() * 5) + 3 }, () => Math.floor(Math.random() * 25) + 15);
  
  d3.select(demo4Svg.value)
    .selectAll('circle')
    .data(currentData4.value)
    .join(
      enter => enter.append('circle')
        .attr('cx', (d, i) => i * 70 + 40)
        .attr('cy', 60)
        .attr('r', 0)
        .attr('fill', '#8b5cf6')
        .call(enter => enter.transition().duration(500).attr('r', d => d)),
      update => update
        .call(update => update.transition().duration(500)
          .attr('cx', (d, i) => i * 70 + 40)
          .attr('fill', '#f59e0b')
          .attr('r', d => d)),
      exit => exit
        .call(exit => exit.transition().duration(500).attr('r', 0).remove())
    );
};

const randomizeData = () => {
  currentData4.value = Array.from({ length: Math.floor(Math.random() * 6) + 2 }, () => Math.floor(Math.random() * 25) + 15);
  joinDemo3();
};

const resetDemo4 = () => {
  currentData4.value = [15, 25, 35, 20];
  d3.select(demo4Svg.value).selectAll('*').remove();
};

// Demo 5: Key Function 對比
const initDemo5 = () => {
  updateDemo5(demo5aSvg.value, dataNoKey, false);
  updateDemo5(demo5bSvg.value, dataWithKey, true);
};

const updateDemo5 = (svg, data, useKey) => {
  d3.select(svg)
    .selectAll('circle')
    .data(data, useKey ? d => d.id : null)
    .join('circle')
      .attr('cx', (d, i) => i * 100 + 60)
      .attr('cy', 50)
      .attr('r', 25)
      .attr('fill', d => d.color)
    .transition()
    .duration(800);
  
  d3.select(svg)
    .selectAll('text')
    .data(data, useKey ? d => d.id : null)
    .join('text')
      .attr('x', (d, i) => i * 100 + 60)
      .attr('y', 55)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-weight', 'bold')
      .text(d => d.id)
    .transition()
    .duration(800);
};

const sortNoKey = () => {
  dataNoKey = [...dataNoKey].sort((a, b) => a.value - b.value);
  updateDemo5(demo5aSvg.value, dataNoKey, false);
};

const shuffleNoKey = () => {
  dataNoKey = [...dataNoKey].sort(() => Math.random() - 0.5);
  updateDemo5(demo5aSvg.value, dataNoKey, false);
};

const sortWithKey = () => {
  dataWithKey = [...dataWithKey].sort((a, b) => a.value - b.value);
  updateDemo5(demo5bSvg.value, dataWithKey, true);
};

const shuffleWithKey = () => {
  dataWithKey = [...dataWithKey].sort(() => Math.random() - 0.5);
  updateDemo5(demo5bSvg.value, dataWithKey, true);
};

// Practice: 動態長條圖
let idCounter = 5;

const updatePracticeChart = () => {
  const svg = d3.select(practiceSvg.value);
  const width = 600;
  const height = 250;
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  let g = svg.select('g.chart-group');
  if (g.empty()) {
    g = svg.append('g')
      .attr('class', 'chart-group')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
  }

  const x = d3.scaleBand()
    .domain(practiceData.value.map(d => d.id))
    .range([0, chartWidth])
    .padding(0.2);
  // console.log('x domain:', x.domain(), x.range(),x('A'), x.bandwidth(), x('B'), x('C'));
  const y = d3.scaleLinear()
    .domain([0, d3.max(practiceData.value, d => d.value) || 100])
    .range([chartHeight, 0]);
  // console.log('y domain:', y.domain(), y.range());
  g.selectAll('.bar')
    .data(practiceData.value, d => d.id)
    .join(
      enter => enter.append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.id))
        .attr('y', chartHeight)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', 'steelblue')
        .call(enter => enter.transition().duration(500)
          .attr('y', d => y(d.value))
          .attr('height', d => chartHeight - y(d.value))
        )
        ,
      update => update
        .call(update => update.transition().duration(500)
          .attr('x', d => x(d.id))
          .attr('y', d => y(d.value))
          .attr('width', x.bandwidth())
          .attr('height', d => chartHeight - y(d.value))),
      exit => exit
        .call(exit => exit.transition().duration(500)
          .attr('y', chartHeight)
          .attr('height', 0)
          .remove())
    );

  g.selectAll('.label')
    .data(practiceData.value, d => d.id)
    .join('text')
      .attr('class', 'label')
      .attr('x', d => x(d.id) + x.bandwidth() / 2)
      .attr('y', d => y(d.value) - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#374151')
      .attr('font-size', '14')
      .attr('font-weight', 'bold')
      .text(d => d.value);
};

const practiceAdd = () => {
  practiceData.value.push({
    id: String.fromCharCode(64 + idCounter++),
    value: Math.floor(Math.random() * 50) + 20
  });
  updatePracticeChart();
};

const practiceUpdate = () => {
  practiceData.value = practiceData.value.map(d => ({
    ...d,
    value: Math.floor(Math.random() * 50) + 20
  }));
  updatePracticeChart();
};

const practiceRemove = () => {
  if (practiceData.value.length > 1) {
    practiceData.value.pop();
    updatePracticeChart();
  }
};

const practiceSort = () => {
  practiceData.value.sort((a, b) => b.value - a.value);
  updatePracticeChart();
};

const resetPractice = () => {
  idCounter = 5;
  practiceData.value = [
    { id: 'A', value: 30 },
    { id: 'B', value: 50 },
    { id: 'C', value: 40 },
    { id: 'D', value: 60 }
  ];
  d3.select(practiceSvg.value).selectAll('*').remove();
};

// 初始化 Demo 5
setTimeout(() => {
  initDemo5();
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
