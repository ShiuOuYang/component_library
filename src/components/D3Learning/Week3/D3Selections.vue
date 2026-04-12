<template>
  <div class="p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg">
    <h2 class="text-3xl font-bold mb-6 text-purple-800">📍 D3 Selections（選擇集）</h2>

    <!-- 學習目標 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-xl font-bold mb-4 text-purple-700">🎯 學習目標</h3>
      <ul class="list-disc list-inside space-y-2 text-gray-700">
        <li>理解 D3 選擇集的概念與 jQuery 的異同</li>
        <li>掌握 <code class="bg-purple-100 px-2 py-1 rounded">d3.select()</code> 和 <code class="bg-purple-100 px-2 py-1 rounded">d3.selectAll()</code> 的使用</li>
        <li>學會使用方法鏈（Method Chaining）優雅地操作 DOM</li>
        <li>理解選擇集的結構和 <code class="bg-purple-100 px-2 py-1 rounded">.nodes()</code> 方法</li>
        <li>實作互動式範例來鞏固學習</li>
      </ul>
    </section>

    <!-- 第一部分：什麼是選擇集 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-purple-700">1️⃣ 什麼是選擇集？</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          D3 的選擇集（Selection）是對 DOM 元素的抽象封裝，類似 jQuery 的 <code class="bg-gray-100 px-2 py-1 rounded">$(selector)</code>，
          但專為資料視覺化設計。選擇集提供了一組強大的方法來操作 DOM 元素。
        </p>
        
        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <p class="font-semibold text-blue-800 mb-2">🔑 核心概念：</p>
          <ul class="list-disc list-inside space-y-1 text-blue-700">
            <li><code>d3.select(selector)</code> - 選擇「第一個」符合的元素</li>
            <li><code>d3.selectAll(selector)</code> - 選擇「所有」符合的元素</li>
            <li>選擇集支援方法鏈（Method Chaining）</li>
            <li>選擇集內部儲存了對實際 DOM 節點的引用</li>
          </ul>
        </div>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>// 傳統 JavaScript
const circle = document.querySelector('circle');
circle.setAttribute('fill', 'red');
circle.setAttribute('r', 50);

// D3 方式（方法鏈）
d3.select('circle')
  .attr('fill', 'red')
  .attr('r', 50);

// 選擇所有圓形並批次修改
d3.selectAll('circle')
  .attr('fill', 'blue')
  .attr('opacity', 0.7);</code></pre>
        </div>
      </div>

      <!-- 互動範例 1：基本選擇 -->
      <div class="border-2 border-purple-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-purple-600">🎨 互動範例：基本選擇操作</h4>
        <div class="flex gap-4 mb-4">
          <button @click="demoSelect" class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            d3.select() - 選擇第一個
          </button>
          <button @click="demoSelectAll" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            d3.selectAll() - 選擇全部
          </button>
          <button @click="resetDemo1" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            重置
          </button>
        </div>
        <svg ref="demo1Svg" width="100%" height="120" class="bg-white rounded border">
          <circle cx="80" cy="60" r="30" fill="#e0e0e0" class="demo-circle" />
          <circle cx="200" cy="60" r="30" fill="#e0e0e0" class="demo-circle" />
          <circle cx="320" cy="60" r="30" fill="#e0e0e0" class="demo-circle" />
          <circle cx="440" cy="60" r="30" fill="#e0e0e0" class="demo-circle" />
        </svg>
        <div class="mt-2 text-sm text-gray-600">
          觀察：<code>select()</code> 只影響第一個圓形，<code>selectAll()</code> 影響所有圓形
        </div>
      </div>
    </section>

    <!-- 第二部分：方法鏈 (Method Chaining) -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-purple-700">2️⃣ 方法鏈（Method Chaining）</h3>
      
      <div class="mb-4">
        <p class="text-gray-700 leading-relaxed mb-4">
          D3 的強大之處在於方法鏈。幾乎所有操作選擇集的方法都會返回選擇集本身，讓你可以連續調用多個方法。
        </p>

        <div class="overflow-x-auto mb-4">
          <table class="min-w-full bg-white border">
            <thead class="bg-purple-100">
              <tr>
                <th class="px-4 py-2 border text-left">方法</th>
                <th class="px-4 py-2 border text-left">說明</th>
                <th class="px-4 py-2 border text-left">範例</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="px-4 py-2 border"><code>.attr(name, value)</code></td>
                <td class="px-4 py-2 border">設定或取得屬性</td>
                <td class="px-4 py-2 border"><code>.attr('fill', 'red')</code></td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border"><code>.style(name, value)</code></td>
                <td class="px-4 py-2 border">設定 CSS 樣式</td>
                <td class="px-4 py-2 border"><code>.style('opacity', 0.5)</code></td>
              </tr>
              <tr>
                <td class="px-4 py-2 border"><code>.text(value)</code></td>
                <td class="px-4 py-2 border">設定文字內容</td>
                <td class="px-4 py-2 border"><code>.text('Hello')</code></td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border"><code>.html(value)</code></td>
                <td class="px-4 py-2 border">設定 HTML 內容</td>
                <td class="px-4 py-2 border"><code>.html('&lt;b&gt;Bold&lt;/b&gt;')</code></td>
              </tr>
              <tr>
                <td class="px-4 py-2 border"><code>.classed(name, bool)</code></td>
                <td class="px-4 py-2 border">添加/移除 CSS 類別</td>
                <td class="px-4 py-2 border"><code>.classed('active', true)</code></td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border"><code>.property(name, value)</code></td>
                <td class="px-4 py-2 border">設定元素屬性（如 value）</td>
                <td class="px-4 py-2 border"><code>.property('checked', true)</code></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>// 方法鏈範例：創建並樣式化一個圓形
d3.select('svg')
  .append('circle')           // 添加圓形元素
  .attr('cx', 100)            // 設定 x 座標
  .attr('cy', 100)            // 設定 y 座標
  .attr('r', 50)              // 設定半徑
  .attr('fill', 'steelblue')  // 設定填充色
  .attr('stroke', 'navy')     // 設定邊框色
  .attr('stroke-width', 3)    // 設定邊框寬度
  .style('opacity', 0.8)      // 設定透明度
  .classed('my-circle', true); // 添加 CSS 類別

// 每個方法都返回選擇集，所以可以繼續鏈下去</code></pre>
        </div>
      </div>

      <!-- 互動範例 2：方法鏈實戰 -->
      <div class="border-2 border-purple-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-purple-600">🎨 互動範例：方法鏈實戰</h4>
        <div class="flex gap-4 mb-4">
          <button @click="chainDemo1" class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            樣式化圓形
          </button>
          <button @click="chainDemo2" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            添加文字標籤
          </button>
          <button @click="resetDemo2" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            重置
          </button>
        </div>
        <svg ref="demo2Svg" width="100%" height="150" class="bg-white rounded border"></svg>
        <div class="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
          <strong>執行的程式碼：</strong><br>
          <code class="text-xs">{{ chainCodeDisplay }}</code>
        </div>
      </div>
    </section>

    <!-- 第三部分：選擇集的內部結構 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-purple-700">3️⃣ 選擇集的內部結構與進階操作</h3>
      
      <div class="mb-6">
        <h4 class="text-lg font-bold mb-3 text-purple-600">🔬 選擇集的本質</h4>
        <p class="text-gray-700 leading-relaxed mb-4">
          選擇集（Selection）是 D3 的核心資料結構，它是一個<strong>類陣列物件</strong>，內部以<strong>分組（Groups）</strong>的方式儲存 DOM 節點的引用。
          理解其內部結構對於掌握 D3 的資料綁定和進階操作至關重要。
        </p>

        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <p class="font-semibold text-blue-800 mb-2">🧩 選擇集的結構層次：</p>
          <ul class="list-disc list-inside space-y-2 text-blue-700">
            <li><strong>Selection 物件</strong> - 最外層，包含 _groups 和 _parents 屬性</li>
            <li><strong>_groups 陣列</strong> - 內部是一個二維陣列結構，每個元素是一個分組</li>
            <li><strong>分組（Group）</strong> - 包含實際的 DOM 節點引用</li>
            <li><strong>_parents 陣列</strong> - 儲存每個分組的父節點（用於子選擇）</li>
          </ul>
        </div>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>// 查看選擇集的內部結構
const selection = d3.selectAll('circle');
console.log(selection);
// Selection {
//   _groups: [[circle, circle, circle]],  // 二維陣列
//   _parents: [html]                       // 父節點陣列
// }

// 取得實際的 DOM 節點陣列
const nodes = selection.nodes();
console.log(nodes); // [circle, circle, circle, ...]

// 取得選擇集的大小（元素數量）
const size = selection.size();
console.log(size); // 3

// 判斷選擇集是否為空
const isEmpty = selection.empty();
console.log(isEmpty); // false

// 取得指定索引的節點
const firstNode = selection.node(); // 取得第一個節點
console.log(firstNode); // <circle>...</circle></code></pre>
        </div>

        <h4 class="text-lg font-bold mb-3 text-purple-600 mt-6">🔄 遍歷選擇集的方法</h4>
        
        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>// 方法 1: 使用 .each() 遍歷（推薦）
selection.each(function(d, i, nodes) {
  // this - 當前 DOM 元素（原生 DOM，非 D3 選擇集）
  // d - 綁定的資料（如果有的話）
  // i - 當前索引（從 0 開始）
  // nodes - 當前分組中的所有節點陣列
  
  console.log('索引:', i);
  console.log('DOM 元素:', this);
  console.log('標籤名稱:', this.tagName);
  
  // 如果要使用 D3 方法，需要重新選擇
  d3.select(this).attr('fill', 'red');
});

// 方法 2: 取得節點陣列後使用原生陣列方法
const nodes = selection.nodes();
nodes.forEach((node, i) => {
  console.log(`節點 ${i}:`, node);
  // 可以使用陣列的 map, filter, reduce 等方法
});

// 方法 3: 使用 .call() 執行自訂函數
selection.call(customFunction);
function customFunction(selection) {
  // selection 是完整的 D3 選擇集
  selection.attr('opacity', 0.5);
}</code></pre>
        </div>

        <h4 class="text-lg font-bold mb-3 text-purple-600 mt-6">🎯 選擇集的重要方法</h4>
        
        <div class="overflow-x-auto mb-4">
          <table class="min-w-full bg-white border">
            <thead class="bg-purple-100">
              <tr>
                <th class="px-4 py-2 border text-left">方法</th>
                <th class="px-4 py-2 border text-left">返回值</th>
                <th class="px-4 py-2 border text-left">用途</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="px-4 py-2 border"><code>.nodes()</code></td>
                <td class="px-4 py-2 border">Array</td>
                <td class="px-4 py-2 border">返回所有 DOM 節點的陣列</td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border"><code>.node()</code></td>
                <td class="px-4 py-2 border">Element | null</td>
                <td class="px-4 py-2 border">返回第一個 DOM 節點</td>
              </tr>
              <tr>
                <td class="px-4 py-2 border"><code>.size()</code></td>
                <td class="px-4 py-2 border">Number</td>
                <td class="px-4 py-2 border">返回選擇集中的元素數量</td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border"><code>.empty()</code></td>
                <td class="px-4 py-2 border">Boolean</td>
                <td class="px-4 py-2 border">判斷選擇集是否為空</td>
              </tr>
              <tr>
                <td class="px-4 py-2 border"><code>.each(callback)</code></td>
                <td class="px-4 py-2 border">Selection</td>
                <td class="px-4 py-2 border">遍歷每個元素並執行回調</td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border"><code>.call(function)</code></td>
                <td class="px-4 py-2 border">Selection</td>
                <td class="px-4 py-2 border">將選擇集傳入函數執行</td>
              </tr>
              <tr>
                <td class="px-4 py-2 border"><code>.filter(selector)</code></td>
                <td class="px-4 py-2 border">Selection</td>
                <td class="px-4 py-2 border">過濾元素，返回新選擇集</td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border"><code>.sort(comparator)</code></td>
                <td class="px-4 py-2 border">Selection</td>
                <td class="px-4 py-2 border">排序元素（在 DOM 中重新排列）</td>
              </tr>
              <tr>
                <td class="px-4 py-2 border"><code>.order()</code></td>
                <td class="px-4 py-2 border">Selection</td>
                <td class="px-4 py-2 border">根據資料順序重新排列 DOM</td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border"><code>.raise()</code></td>
                <td class="px-4 py-2 border">Selection</td>
                <td class="px-4 py-2 border">將元素移到父元素的最後（最上層）</td>
              </tr>
              <tr>
                <td class="px-4 py-2 border"><code>.lower()</code></td>
                <td class="px-4 py-2 border">Selection</td>
                <td class="px-4 py-2 border">將元素移到父元素的最前（最下層）</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 class="text-lg font-bold mb-3 text-purple-600 mt-6">🔍 進階操作範例</h4>

        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>// 1. 過濾選擇集
d3.selectAll('circle')
  .filter(function(d, i) {
    return i % 2 === 0; // 只選擇偶數索引的圓形
  })
  .attr('fill', 'red');

// 也可以使用選擇器字串過濾
d3.selectAll('circle')
  .filter('.active')  // 只選擇有 active 類別的圓形
  .attr('stroke', 'blue');

// 2. 使用 .call() 組織程式碼
function makeCircleInteractive(selection) {
  selection
    .style('cursor', 'pointer')
    .on('click', function() {
      d3.select(this).attr('r', 50);
    });
}

d3.selectAll('circle')
  .call(makeCircleInteractive)
  .attr('fill', 'green');

// 3. 排序元素
d3.selectAll('circle')
  .sort((a, b) => {
    // 根據半徑排序（會改變 DOM 中的順序）
    return d3.select(a).attr('r') - d3.select(b).attr('r');
  });

// 4. 提升層級（對 SVG 很有用）
d3.select('circle.selected')
  .raise(); // 將選中的圓形移到最上層

// 5. 取得選擇集中的特定節點
const selection = d3.selectAll('circle');
const firstCircle = selection.node();      // 第一個
const allCircles = selection.nodes();      // 全部
const thirdCircle = allCircles[2];         // 第三個</code></pre>
        </div>

        <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
          <p class="font-semibold text-yellow-800 mb-2">⚠️ 重要觀念：</p>
          <ul class="list-disc list-inside space-y-2 text-yellow-700">
            <li><strong>選擇集 ≠ 陣列</strong>：不能直接使用 <code>.map()</code>、<code>.filter()</code> 等陣列方法（但 D3 提供了 <code>.filter()</code>）</li>
            <li><strong>使用 <code>.nodes()</code></strong> 可以取得實際的 DOM 節點陣列，然後就能使用所有陣列方法</li>
            <li><strong><code>.each()</code> 中的 <code>this</code></strong> 是原生 DOM 元素，不是 D3 選擇集，需要用 <code>d3.select(this)</code> 包裝</li>
            <li><strong>箭頭函數問題</strong>：在 <code>.each()</code> 中使用箭頭函數會導致 <code>this</code> 指向錯誤，建議使用傳統函數</li>
            <li><strong>方法鏈的返回值</strong>：大部分方法返回選擇集本身，但 <code>.nodes()</code>、<code>.node()</code>、<code>.size()</code> 等返回其他類型</li>
          </ul>
        </div>

        <h4 class="text-lg font-bold mb-3 text-purple-600 mt-6">🎨 子選擇（Sub-Selection）</h4>
        
        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>// 在選擇集的基礎上繼續選擇
const groups = d3.selectAll('g.group');

// select() - 為每個分組選擇一個子元素
groups.select('circle')
  .attr('fill', 'red');  // 每個 g 中的第一個 circle 變紅色

// selectAll() - 為每個分組選擇所有子元素
groups.selectAll('circle')
  .attr('opacity', 0.5); // 每個 g 中的所有 circle 半透明

// 子選擇會創建新的分組結構
console.log(groups.selectAll('circle'));
// Selection {
//   _groups: [
//     [circle, circle],  // 第一個 g 中的 circles
//     [circle, circle],  // 第二個 g 中的 circles
//   ],
//   _parents: [g, g]     // 每個分組的父節點
// }</code></pre>
        </div>

        <div class="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-4">
          <p class="font-semibold text-indigo-800 mb-2">💡 效能優化技巧：</p>
          <ul class="list-disc list-inside space-y-2 text-indigo-700">
            <li><strong>快取選擇集</strong>：如果需要多次操作同一個選擇集，先儲存起來避免重複查詢</li>
            <li><strong>批次操作</strong>：盡量使用方法鏈一次完成多個操作，減少 DOM 操作次數</li>
            <li><strong>使用 <code>.classed()</code></strong>：修改類別比直接修改樣式更高效</li>
            <li><strong>避免過度選擇</strong>：使用更具體的選擇器，減少需要過濾的元素數量</li>
          </ul>
        </div>

        <!-- 互動範例：_groups 和 _parents 視覺化 -->
        <div class="border-2 border-indigo-200 rounded-lg p-4 mb-6 mt-6">
          <h4 class="font-bold text-lg mb-3 text-indigo-600">🎨 互動範例：_groups 和 _parents 視覺化</h4>
          
          <div class="flex gap-4 mb-4 flex-wrap">
            <button @click="visualizeStructure" class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
              視覺化選擇集結構
            </button>
            <button @click="visualizeSubSelection" class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
              視覺化子選擇結構
            </button>
            <button @click="resetStructureDemo" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
              重置
            </button>
          </div>

          <svg ref="structureSvg" width="100%" height="180" class="bg-white rounded border mb-3">
            <!-- 第一組 -->
            <g class="demo-group" transform="translate(0, 0)">
              <rect x="20" y="20" width="200" height="140" fill="#e0e7ff" stroke="#6366f1" stroke-width="2" rx="8" />
              <text x="30" y="45" fill="#4338ca" font-weight="bold" font-size="14">Group 1 (g)</text>
              <circle cx="80" cy="90" r="20" fill="#a5b4fc" class="group1-circle" />
              <circle cx="160" cy="90" r="20" fill="#a5b4fc" class="group1-circle" />
            </g>
            
            <!-- 第二組 -->
            <g class="demo-group" transform="translate(240, 0)">
              <rect x="20" y="20" width="200" height="140" fill="#fef3c7" stroke="#f59e0b" stroke-width="2" rx="8" />
              <text x="30" y="45" fill="#d97706" font-weight="bold" font-size="14">Group 2 (g)</text>
              <circle cx="80" cy="90" r="20" fill="#fbbf24" class="group2-circle" />
              <circle cx="160" cy="90" r="20" fill="#fbbf24" class="group2-circle" />
            </g>
          </svg>

          <div class="bg-gray-50 p-4 rounded font-mono text-xs overflow-x-auto">
            <div class="mb-2"><strong class="text-purple-700">選擇集結構：</strong></div>
            <pre class="text-gray-800">{{ structureDisplay }}</pre>
          </div>

          <div class="mt-3 bg-blue-50 border-l-4 border-blue-500 p-3 text-sm">
            <p class="font-semibold text-blue-800 mb-2">💡 理解重點：</p>
            <ul class="list-disc list-inside space-y-1 text-blue-700">
              <li><strong>簡單選擇</strong>：_groups 只有一個分組，_parents 是 [html]</li>
              <li><strong>子選擇</strong>：_groups 有多個分組（每個父元素一組），_parents 對應每個父元素</li>
              <li>分組數量 = _groups.length = _parents.length</li>
              <li>_groups[i] 的父元素是 _parents[i]</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 互動範例 3：選擇集檢視 -->
      <div class="border-2 border-purple-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-purple-600">🎨 互動範例：選擇集檢視器</h4>
        <div class="flex gap-4 mb-4">
          <button @click="inspectSelection" class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            檢視選擇集
          </button>
          <button @click="eachDemo" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            使用 .each() 添加編號
          </button>
          <button @click="resetDemo3" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            重置
          </button>
        </div>
        <svg ref="demo3Svg" width="100%" height="120" class="bg-white rounded border">
          <circle cx="80" cy="60" r="25" fill="#9333ea" />
          <circle cx="200" cy="60" r="25" fill="#3b82f6" />
          <circle cx="320" cy="60" r="25" fill="#10b981" />
        </svg>
        <div class="mt-2 text-sm bg-gray-50 p-3 rounded font-mono">
          <div><strong>選擇集資訊：</strong></div>
          <div>{{ selectionInfo }}</div>
        </div>
      </div>
    </section>

    <!-- 第四部分：事件處理與 this 指向 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-purple-700">4️⃣ 事件處理與 this 指向</h3>
      
      <div class="mb-6">
        <h4 class="text-lg font-bold mb-3 text-purple-600">🎯 在 D3 中，this 是什麼？</h4>
        <p class="text-gray-700 leading-relaxed mb-4">
          在 D3 的事件處理器和 <code>.each()</code> 回調函數中，<code>this</code> 關鍵字有特殊含義。
          理解 <code>this</code> 的指向是掌握 D3 互動操作的關鍵。
        </p>

        <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p class="font-semibold text-red-800 mb-2">⚠️ 核心概念：</p>
          <ul class="list-disc list-inside space-y-2 text-red-700">
            <li><strong>在傳統函數中</strong>：<code>this</code> 指向<strong>當前觸發事件的 DOM 元素</strong>（原生 DOM，非 D3 選擇集）</li>
            <li><strong>在箭頭函數中</strong>：<code>this</code> 指向<strong>外層作用域</strong>（通常是 Vue 元件實例），❌ 無法使用</li>
            <li>需要使用 <code>d3.select(this)</code> 將原生 DOM 包裝成 D3 選擇集才能使用 D3 方法</li>
          </ul>
        </div>

        <h4 class="text-lg font-bold mb-3 text-purple-600 mt-6">📖 基礎範例</h4>
        
        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>// ✅ 正確：使用傳統函數
d3.selectAll('circle')
  .on('click', function() {
    console.log(this);           // &lt;circle cx="100" cy="100" r="50"&gt;
    console.log(this.tagName);   // 'circle'
    
    // this 是原生 DOM 元素，沒有 D3 方法
    // ❌ this.attr('fill', 'red');  // 錯誤！
    
    // ✅ 必須用 d3.select(this) 包裝
    d3.select(this).attr('fill', 'red');
  });

// ❌ 錯誤：使用箭頭函數
d3.selectAll('circle')
  .on('click', () => {
    console.log(this);  // Vue 元件實例，不是 DOM 元素
    d3.select(this).attr('fill', 'red');  // 💥 無法運作
  });</code></pre>
        </div>

        <h4 class="text-lg font-bold mb-3 text-purple-600 mt-6">🎨 事件處理器的完整參數</h4>
        
        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>d3.selectAll('rect')
  .on('click', function(event, d) {
    // 參數 1: event - 原生瀏覽器事件物件
    console.log('事件類型:', event.type);           // 'click'
    console.log('滑鼠座標:', event.clientX, event.clientY);
    console.log('目標元素:', event.target);         // 實際被點擊的元素
    console.log('當前元素:', event.currentTarget);  // 等同於 this
    
    // 參數 2: d - 綁定到此元素的資料（如果有的話）
    console.log('綁定資料:', d);  // undefined（如果還沒綁定資料）
    
    // this - 當前 DOM 元素（原生 DOM）
    console.log('DOM 元素:', this);
    console.log('元素標籤:', this.tagName);  // 'rect'
    
    // 使用 D3 方法必須先包裝
    d3.select(this)
      .attr('fill', 'steelblue')
      .attr('stroke', 'navy');
  });</code></pre>
        </div>

        <h4 class="text-lg font-bold mb-3 text-purple-600 mt-6">🔍 實戰範例：完整的互動處理</h4>
        
        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>// 範例：點擊切換矩形的選中狀態
d3.selectAll('.practice-rect')
  .style('cursor', 'pointer')           // 設定游標樣式
  
  // 滑鼠進入：半透明效果
  .on('mouseenter', function() {
    d3.select(this)                     // this = 當前滑鼠進入的矩形
      .transition()
      .duration(200)
      .attr('opacity', 0.7);
  })
  
  // 滑鼠離開：恢復不透明
  .on('mouseleave', function() {
    d3.select(this)                     // this = 當前滑鼠離開的矩形
      .transition()
      .duration(200)
      .attr('opacity', 1);
  })
  
  // 點擊：切換邊框狀態
  .on('click', function() {
    // 步驟 1: 取得當前邊框寬度
    const current = d3.select(this).attr('stroke-width') || '2';
    
    // 步驟 2: 根據當前狀態切換樣式
    d3.select(this)
      .transition()
      .duration(200)
      .attr('stroke-width', current === '2' ? 5 : 2)
      .attr('stroke', current === '2' ? '#dc2626' : '#1f2937');
    
    // 解釋：
    // - 如果當前邊框是 '2'（未選中），變成 5 並改為紅色（選中）
    // - 如果當前邊框是 5（已選中），變回 2 並改為深灰（取消選中）
  });</code></pre>
        </div>

        <h4 class="text-lg font-bold mb-3 text-purple-600 mt-6">📊 this 指向對照表</h4>
        
        <div class="overflow-x-auto mb-4">
          <table class="min-w-full bg-white border">
            <thead class="bg-purple-100">
              <tr>
                <th class="px-4 py-2 border text-left">情境</th>
                <th class="px-4 py-2 border text-left">函數類型</th>
                <th class="px-4 py-2 border text-left">this 指向</th>
                <th class="px-4 py-2 border text-left">是否可用</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="px-4 py-2 border">事件處理器</td>
                <td class="px-4 py-2 border"><code>function() {}</code></td>
                <td class="px-4 py-2 border">當前 DOM 元素</td>
                <td class="px-4 py-2 border">✅ 可用</td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border">事件處理器</td>
                <td class="px-4 py-2 border"><code>() => {}</code></td>
                <td class="px-4 py-2 border">外層作用域</td>
                <td class="px-4 py-2 border">❌ 不可用</td>
              </tr>
              <tr>
                <td class="px-4 py-2 border"><code>.each()</code> 回調</td>
                <td class="px-4 py-2 border"><code>function(d, i) {}</code></td>
                <td class="px-4 py-2 border">當前 DOM 元素</td>
                <td class="px-4 py-2 border">✅ 可用</td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border"><code>.each()</code> 回調</td>
                <td class="px-4 py-2 border"><code>(d, i) => {}</code></td>
                <td class="px-4 py-2 border">外層作用域</td>
                <td class="px-4 py-2 border">❌ 不可用</td>
              </tr>
              <tr>
                <td class="px-4 py-2 border">屬性函數</td>
                <td class="px-4 py-2 border"><code>.attr('x', function(d) {})</code></td>
                <td class="px-4 py-2 border">當前 DOM 元素</td>
                <td class="px-4 py-2 border">✅ 可用</td>
              </tr>
              <tr class="bg-gray-50">
                <td class="px-4 py-2 border">屬性函數</td>
                <td class="px-4 py-2 border"><code>.attr('x', (d) => {})</code></td>
                <td class="px-4 py-2 border">外層作用域</td>
                <td class="px-4 py-2 border">⚠️ 通常不需要 this</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
          <p class="font-semibold text-yellow-800 mb-2">💡 最佳實踐：</p>
          <ul class="list-disc list-inside space-y-2 text-yellow-700">
            <li><strong>事件處理器</strong>：必須使用傳統函數 <code>function() {}</code></li>
            <li><strong>.each() 遍歷</strong>：必須使用傳統函數 <code>function(d, i) {}</code></li>
            <li><strong>屬性設定器</strong>：如果不需要 this，可以使用箭頭函數 <code>(d, i) => d.value</code></li>
            <li><strong>替代方案</strong>：如果堅持使用箭頭函數，可以用 <code>event.currentTarget</code> 代替 <code>this</code></li>
          </ul>
        </div>

        <h4 class="text-lg font-bold mb-3 text-purple-600 mt-6">🛠️ 常見錯誤與解決方案</h4>
        
        <div class="bg-gray-900 text-gray-100 p-4 rounded-lg mb-4 overflow-x-auto">
          <pre class="text-sm"><code>// ❌ 錯誤 1：直接對 this 使用 D3 方法
.on('click', function() {
  this.attr('fill', 'red');  // ❌ this 是原生 DOM，沒有 .attr() 方法
})

// ✅ 修正：先用 d3.select() 包裝
.on('click', function() {
  d3.select(this).attr('fill', 'red');
})

// ❌ 錯誤 2：在箭頭函數中使用 this
.on('click', () => {
  d3.select(this).attr('fill', 'red');  // ❌ this 指向錯誤
})

// ✅ 修正方案 1：使用傳統函數
.on('click', function() {
  d3.select(this).attr('fill', 'red');
})

// ✅ 修正方案 2：使用 event.currentTarget
.on('click', (event) => {
  d3.select(event.currentTarget).attr('fill', 'red');
})

// ❌ 錯誤 3：混淆 event.target 和 this
.on('click', function(event) {
  d3.select(event.target).attr('fill', 'red');  
  // ⚠️ event.target 可能是子元素
})

// ✅ 修正：使用 this 或 event.currentTarget
.on('click', function(event) {
  d3.select(this).attr('fill', 'red');           // 推薦
  d3.select(event.currentTarget).attr('fill', 'red');  // 也可以
})</code></pre>
        </div>

        <div class="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-4">
          <p class="font-semibold text-indigo-800 mb-2">🎓 記憶口訣：</p>
          <div class="text-indigo-700 space-y-2">
            <p><strong>"在 D3 中需要操作當前元素，就用傳統函數！"</strong></p>
            <ul class="list-disc list-inside ml-4 space-y-1">
              <li><code>function() {}</code> → <code>this</code> = DOM 元素 ✅</li>
              <li><code>() => {}</code> → <code>this</code> = 外層作用域 ❌</li>
              <li>原生 DOM 元素需要 <code>d3.select(this)</code> 包裝才能用 D3 方法</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 互動範例：事件處理實戰 -->
      <div class="border-2 border-purple-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-purple-600">🎨 互動範例：事件處理實戰</h4>
        <p class="text-gray-600 text-sm mb-4">
          嘗試與下方的矩形互動：<strong>滑鼠懸停</strong>會變半透明，<strong>點擊</strong>會切換邊框狀態
        </p>
        <div class="flex gap-4 mb-4">
          <button @click="setupEventDemo" class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            啟用互動
          </button>
          <button @click="resetEventDemo" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            重置
          </button>
        </div>
        <svg ref="eventDemoSvg" width="100%" height="150" class="bg-white rounded border mb-3">
          <rect class="event-rect" x="50" y="40" width="100" height="70" fill="#9333ea" rx="8" />
          <rect class="event-rect" x="180" y="40" width="100" height="70" fill="#3b82f6" rx="8" />
          <rect class="event-rect" x="310" y="40" width="100" height="70" fill="#10b981" rx="8" />
          <rect class="event-rect" x="440" y="40" width="100" height="70" fill="#f59e0b" rx="8" />
        </svg>
        <div class="bg-gray-50 p-3 rounded text-sm">
          <strong>當前狀態：</strong> {{ eventDemoStatus }}
        </div>
      </div>
    </section>

    <!-- 第五部分：實戰練習 -->
    <section class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <h3 class="text-2xl font-bold mb-4 text-purple-700">5️⃣ 實戰練習</h3>
      
      <div class="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
        <p class="font-semibold text-green-800 mb-2">📝 練習任務：</p>
        <ol class="list-decimal list-inside space-y-2 text-green-700">
          <li>使用 <code>d3.selectAll()</code> 選擇所有矩形，並將它們的填充色改為漸層色（提示：使用索引 i）</li>
          <li>使用方法鏈為每個矩形添加邊框、圓角和陰影效果</li>
          <li>使用 <code>.each()</code> 遍歷矩形，並在下方添加文字標籤顯示其索引</li>
          <li>實作滑鼠互動：hover 時改變顏色，click 時切換選中狀態</li>
        </ol>
      </div>

      <div class="border-2 border-green-200 rounded-lg p-4 mb-4">
        <h4 class="font-bold text-lg mb-3 text-green-600">🎯 練習區域</h4>
        <div class="flex gap-4 mb-4">
          <button @click="practiceTask1" class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
            任務 1: 漸層色
          </button>
          <button @click="practiceTask2" class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
            任務 2: 樣式美化
          </button>
          <button @click="practiceTask3" class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
            任務 3: 添加標籤
          </button>
          <button @click="practiceTask4" class="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
            任務 4: 互動
          </button>
          <button @click="resetPractice" class="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">
            重置
          </button>
        </div>
        <svg ref="practiceSvg" width="100%" height="200" class="bg-white rounded border">
          <rect class="practice-rect" x="50" y="50" width="80" height="100" fill="#e0e0e0" />
          <rect class="practice-rect" x="160" y="50" width="80" height="100" fill="#e0e0e0" />
          <rect class="practice-rect" x="270" y="50" width="80" height="100" fill="#e0e0e0" />
          <rect class="practice-rect" x="380" y="50" width="80" height="100" fill="#e0e0e0" />
          <rect class="practice-rect" x="490" y="50" width="80" height="100" fill="#e0e0e0" />
        </svg>
      </div>

      <details class="bg-gray-50 p-4 rounded">
        <summary class="cursor-pointer font-semibold text-purple-700">💡 查看參考解答</summary>
        <div class="mt-3 bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
          <pre class="text-sm"><code>// 任務 1: 漸層色
d3.selectAll('.practice-rect')
  .attr('fill', (d, i) => {
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
    return colors[i];
  });

// 任務 2: 樣式美化
d3.selectAll('.practice-rect')
  .attr('stroke', '#1f2937')
  .attr('stroke-width', 2)
  .attr('rx', 8)
  .style('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))');

// 任務 3: 添加標籤
const svg = d3.select('svg');
d3.selectAll('.practice-rect').each(function(d, i) {
  const rect = d3.select(this);
  const x = +rect.attr('x') + 40; // 矩形中心 x
  const y = +rect.attr('y') + 130; // 矩形下方
  
  svg.append('text')
    .attr('x', x)
    .attr('y', y)
    .attr('text-anchor', 'middle')
    .attr('fill', '#374151')
    .text(`Item ${i + 1}`);
});

// 任務 4: 互動
d3.selectAll('.practice-rect')
  .on('mouseenter', function() {
    d3.select(this).attr('opacity', 0.7);
  })
  .on('mouseleave', function() {
    d3.select(this).attr('opacity', 1);
  })
  .on('click', function() {
    const current = d3.select(this).attr('stroke-width');
    d3.select(this).attr('stroke-width', current === '2' ? 5 : 2);
  });</code></pre>
        </div>
      </details>
    </section>

    <!-- 學習總結 -->
    <section class="p-6 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
      <h3 class="text-2xl font-bold mb-4 text-purple-800">✅ 學習總結</h3>
      <div class="grid md:grid-cols-2 gap-4">
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="font-bold text-purple-700 mb-2">🎯 核心知識點</h4>
          <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li><code>d3.select()</code> 選擇第一個元素</li>
            <li><code>d3.selectAll()</code> 選擇所有元素</li>
            <li>方法鏈讓程式碼更簡潔優雅</li>
            <li><code>.nodes()</code> 取得 DOM 節點陣列</li>
            <li><code>.each()</code> 遍歷選擇集</li>
          </ul>
        </div>
        <div class="bg-white p-4 rounded shadow-sm">
          <h4 class="font-bold text-blue-700 mb-2">🚀 下一步</h4>
          <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>學習 Data Binding（資料綁定）</li>
            <li>理解 Enter-Update-Exit 模式</li>
            <li>使用 <code>.data()</code> 將資料與 DOM 綁定</li>
            <li>實作動態資料驅動的視覺化</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import * as d3 from 'd3';

const demo1Svg = ref(null);
const demo2Svg = ref(null);
const demo3Svg = ref(null);
const practiceSvg = ref(null);
const structureSvg = ref(null);
const eventDemoSvg = ref(null);

const chainCodeDisplay = ref('');
const selectionInfo = ref('點擊「檢視選擇集」按鈕');
const structureDisplay = ref('點擊按鈕查看選擇集結構');
const eventDemoStatus = ref('尚未啟用互動，點擊「啟用互動」按鈕');

// Demo 1: 基本選擇
const demoSelect = () => {
  d3.select(demo1Svg.value)
    .select('.demo-circle')
    .transition()
    .duration(500)
    .attr('fill', '#9333ea')
    .attr('r', 40);
};

const demoSelectAll = () => {
  d3.select(demo1Svg.value)
    .selectAll('.demo-circle')
    .transition()
    .duration(500)
    .attr('fill', '#3b82f6')
    .attr('r', 35);
};

const resetDemo1 = () => {
  d3.select(demo1Svg.value)
    .selectAll('.demo-circle')
    .transition()
    .duration(300)
    .attr('fill', '#e0e0e0')
    .attr('r', 30);
};

// Demo 2: 方法鏈
const chainDemo1 = () => {
  chainCodeDisplay.value = "d3.select(svg).append('circle').attr('cx', 100).attr('cy', 75).attr('r', 40).attr('fill', 'steelblue').attr('stroke', 'navy').attr('stroke-width', 3);";
  
  d3.select(demo2Svg.value).selectAll('*').remove();
  
  d3.select(demo2Svg.value)
    .append('circle')
    .attr('cx', 100)
    .attr('cy', 75)
    .attr('r', 40)
    .attr('fill', 'steelblue')
    .attr('stroke', 'navy')
    .attr('stroke-width', 3)
    .style('opacity', 0)
    .transition()
    .duration(800)
    .style('opacity', 10);
};

const chainDemo2 = () => {
  chainCodeDisplay.value = "先創建圓形，再用 .each() 添加文字標籤";
  
  d3.select(demo2Svg.value).selectAll('*').remove();
  
  const svg = d3.select(demo2Svg.value);
  const data = [
    { x: 80, y: 75, label: 'A' },
    { x: 200, y: 75, label: 'B' },
    { x: 320, y: 75, label: 'C' },
    { x: 440, y: 75, label: 'D' }
  ];
  
  data.forEach(d => {
    svg.append('circle')
      .attr('cx', d.x)
      .attr('cy', d.y)
      .attr('r', 30)
      .attr('fill', '#10b981')
      .attr('opacity', 0)
      .transition()
      .duration(500)
      .attr('opacity', 0.7);
      
    svg.append('text')
      .attr('x', d.x)
      .attr('y', d.y + 5)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '20')
      .attr('font-weight', 'bold')
      .text(d.label)
      .style('opacity', 0)
      .transition()
      .delay(300)
      .duration(500)
      .style('opacity', 1);
  });
};

const resetDemo2 = () => {
  chainCodeDisplay.value = '';
  d3.select(demo2Svg.value).selectAll('*').remove();
};

// Demo 3: 選擇集檢視
const inspectSelection = () => {
  const selection = d3.select(demo3Svg.value).selectAll('circle');
  const nodes = selection.nodes();
  const size = selection.size();
  const isEmpty = selection.empty();
  
  selectionInfo.value = `
節點數量: ${size}
是否為空: ${isEmpty}
節點類型: ${nodes.map(n => n.tagName).join(', ')}
  `.trim();
};

const eachDemo = () => {
  const svg = d3.select(demo3Svg.value);
  svg.selectAll('text').remove();
  
  d3.select(demo3Svg.value)
    .selectAll('circle')
    .each(function(d, i) {
      const circle = d3.select(this);
      const cx = +circle.attr('cx');
      const cy = +circle.attr('cy');
      
      svg.append('text')
        .attr('x', cx)
        .attr('y', cy + 5)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-weight', 'bold')
        .attr('font-size', '16')
        .text(i + 1);
    });
};

const resetDemo3 = () => {
  d3.select(demo3Svg.value).selectAll('text').remove();
  selectionInfo.value = '點擊「檢視選擇集」按鈕';
};

// Structure Demo: _groups 和 _parents 視覺化
const visualizeStructure = () => {
  // 簡單選擇：選擇所有圓形
  const circles = d3.select(structureSvg.value).selectAll('circle');
  
  structureDisplay.value = `// 簡單選擇：d3.selectAll('circle')
Selection {
  _groups: [
    [circle, circle, circle, circle]  // 一個分組包含所有圓形
  ],
  _parents: [html]  // 父節點是 html 元素
}

總共 ${circles.size()} 個圓形在 1 個分組中`;

  // 視覺化效果
  circles
    .transition()
    .duration(500)
    .attr('r', 25)
    .attr('stroke', '#dc2626')
    .attr('stroke-width', 3);
};

const visualizeSubSelection = () => {
  // 子選擇：先選擇分組，再選擇每組的圓形
  const groups = d3.select(structureSvg.value).selectAll('.demo-group');
  const circles = groups.selectAll('circle');
  
  const group1Circles = d3.select(structureSvg.value).selectAll('.group1-circle');
  const group2Circles = d3.select(structureSvg.value).selectAll('.group2-circle');
  
  structureDisplay.value = `// 子選擇：groups.selectAll('circle')
Selection {
  _groups: [
    [circle, circle],  // Group 1 的 2 個圓形
    [circle, circle]   // Group 2 的 2 個圓形
  ],
  _parents: [g.demo-group, g.demo-group]  // 每個分組對應一個父 g 元素
}

總共 ${circles.size()} 個圓形在 ${groups.size()} 個分組中
每個分組對應一個父元素 (g.demo-group)`;

  // 視覺化效果：分組高亮
  group1Circles
    .transition()
    .duration(500)
    .attr('r', 25)
    .attr('stroke', '#6366f1')
    .attr('stroke-width', 3);
    
  group2Circles
    .transition()
    .delay(300)
    .duration(500)
    .attr('r', 25)
    .attr('stroke', '#f59e0b')
    .attr('stroke-width', 3);
};

const resetStructureDemo = () => {
  d3.select(structureSvg.value)
    .selectAll('circle')
    .transition()
    .duration(300)
    .attr('r', 20)
    .attr('stroke', 'none')
    .attr('stroke-width', 0);
    
  structureDisplay.value = '點擊按鈕查看選擇集結構';
};

// Event Demo: 事件處理實戰
const setupEventDemo = () => {
  eventDemoStatus.value = '✅ 互動已啟用！試試滑鼠懸停和點擊矩形';
  
  d3.select(eventDemoSvg.value)
    .selectAll('.event-rect')
    .style('cursor', 'pointer')
    
    // 滑鼠進入事件
    .on('mouseenter', function() {
      // this 指向當前滑鼠進入的矩形
      eventDemoStatus.value = '🎯 滑鼠進入矩形，變半透明';
      
      d3.select(this)
        .transition()
        .duration(200)
        .attr('opacity', 0.7);
    })
    
    // 滑鼠離開事件
    .on('mouseleave', function() {
      // this 指向當前滑鼠離開的矩形
      eventDemoStatus.value = '✅ 互動已啟用！試試滑鼠懸停和點擊矩形';
      
      d3.select(this)
        .transition()
        .duration(200)
        .attr('opacity', 1);
    })
    
    // 點擊事件
    .on('click', function() {
      // this 指向被點擊的矩形
      const current = d3.select(this).attr('stroke-width') || '0';
      const isSelected = current !== '0' && current !== '2';
      
      eventDemoStatus.value = isSelected 
        ? '❌ 取消選中矩形' 
        : '✨ 選中矩形，邊框加粗變紅';
      
      d3.select(this)
        .transition()
        .duration(200)
        .attr('stroke-width', isSelected ? 2 : 5)
        .attr('stroke', isSelected ? '#1f2937' : '#dc2626');
    });
};

const resetEventDemo = () => {
  eventDemoStatus.value = '尚未啟用互動，點擊「啟用互動」按鈕';
  
  d3.select(eventDemoSvg.value)
    .selectAll('.event-rect')
    .style('cursor', 'default')
    .attr('opacity', 1)
    .attr('stroke', 'none')
    .attr('stroke-width', 0)
    .on('mouseenter', null)
    .on('mouseleave', null)
    .on('click', null);
};

// Practice: 練習任務
const practiceTask1 = () => {
  d3.select(practiceSvg.value)
    .selectAll('.practice-rect')
    .transition()
    .duration(500)
    .attr('fill', (d, i) => {
      const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
      return colors[i];
    });
};

const practiceTask2 = () => {
  d3.select(practiceSvg.value)
    .selectAll('.practice-rect')
    .attr('stroke', '#1f2937')
    .attr('stroke-width', 2)
    .attr('rx', 8)
    .style('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))');
};

const practiceTask3 = () => {
  const svg = d3.select(practiceSvg.value);
  svg.selectAll('text').remove();
  
  d3.select(practiceSvg.value)
    .selectAll('.practice-rect')
    .each(function(d, i) {
      const rect = d3.select(this);
      const x = +rect.attr('x') + 40;
      const y = +rect.attr('y') + 120;
      
      svg.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', 'middle')
        .attr('fill', '#374151')
        .attr('font-weight', 'bold')
        .text(`Item ${i + 1}`)
        .style('opacity', 0)
        .transition()
        .duration(500)
        .style('opacity', 1);
    });
};

const practiceTask4 = () => {
  d3.select(practiceSvg.value)           // 1️⃣ 選擇 SVG 容器
    .selectAll('.practice-rect')          // 2️⃣ 選擇所有矩形
    .style('cursor', 'pointer')           // 3️⃣ 設定游標樣式
    .on('mouseenter', function() {        // 4️⃣ 滑鼠進入事件
      d3.select(this)                     // 👈 this 指向當前觸發事件的 DOM 元素
        .transition()
        .duration(200)
        .attr('opacity', 0.7);
    })
    .on('mouseleave', function() {        // 5️⃣ 滑鼠離開事件
      d3.select(this)                     // 👈 this 指向當前觸發事件的 DOM 元素
        .transition()
        .duration(200)
        .attr('opacity', 1);
    })
    .on('click', function() {             // 6️⃣ 點擊事件
      const current = d3.select(this).attr('stroke-width') || '2';
      d3.select(this)                     // 👈 this 指向當前觸發事件的 DOM 元素
        .transition()
        .duration(200)
        .attr('stroke-width', current === '2' ? 5 : 2)
        .attr('stroke', current === '2' ? '#dc2626' : '#1f2937');
    });
};

const resetPractice = () => {
  const svg = d3.select(practiceSvg.value);
  svg.selectAll('text').remove();
  
  svg.selectAll('.practice-rect')
    .attr('fill', '#e0e0e0')
    .attr('stroke', 'none')
    .attr('stroke-width', 0)
    .attr('rx', 0)
    .attr('opacity', 1)
    .style('filter', 'none')
    .style('cursor', 'default')
    .on('mouseenter', null)
    .on('mouseleave', null)
    .on('click', null);
};
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
