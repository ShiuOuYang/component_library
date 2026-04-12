<template>
  <div class="svg-coordinates">
    <!-- Learning Objectives -->
    <div class="bg-gradient-to-r from-blue-100 to-cyan-100 border border-blue-300 rounded-lg p-5 mb-6">
      <h3 class="text-xl font-bold text-blue-800 mb-3 flex items-center gap-2">
        <span class="text-2xl">🎯</span>
        學習目標
      </h3>
      <p class="text-gray-700 leading-relaxed">
        理解 SVG 的座標系統，以及如何使用 <code>transform</code> 屬性來移動、旋轉和縮放元素。這些概念是 D3 中操作座標軸和圖表元素的基礎。
      </p>
    </div>

    <!-- Learning Guide -->
    <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
      <h3 class="text-lg font-bold text-blue-700 mb-2">學習重點：座標系統與變換</h3>
      <ul class="list-disc list-inside text-gray-700 space-y-1">
        <li><strong>座標原點：</strong> SVG 的 (0,0) 位於左上角，X 軸向右，Y 軸向下。</li>
        <li><strong>變換 (Transform)：</strong> 
          <ul class="list-disc list-inside ml-4">
            <li><code>translate(x, y)</code>: 位移</li>
            <li><code>rotate(deg)</code>: 旋轉 (預設以原點為中心)</li>
            <li><code>scale(x, y)</code>: 縮放</li>
          </ul>
        </li>
        <li><strong>Margin Convention：</strong> D3 常用的佈局慣例，預留邊界給座標軸與標題，將繪圖區移至內部。</li>
      </ul>
    </div>

    <h2 class="text-xl font-bold text-blue-600 mb-4">1️⃣ SVG 座標系統基礎</h2>
    <p class="text-gray-600 mb-4">
      SVG 的座標系統與數學座標系統不同：原點 (0, 0) 在<strong>左上角</strong>，Y 軸<strong>向下</strong>遞增。
    </p>
    
    <div class="svg-container mb-8">
      <svg width="100%" height="400" viewBox="0 0 600 400" class="border border-gray-200 bg-gray-50">
        <!-- 繪製網格 -->
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" class="grid-line"/>
          </pattern>
          <marker id="arrowX" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#333"/>
          </marker>
          <marker id="arrowY" markerWidth="10" markerHeight="10" refX="3" refY="5" orient="auto">
            <polygon points="0 0, 6 0, 3 10" fill="#333"/>
          </marker>
        </defs>
        <rect width="600" height="400" fill="url(#grid)"/>
        
        <!-- 繪製座標軸 -->
        <line x1="0" y1="0" x2="600" y2="0" class="axis-line"/>
        <line x1="0" y1="0" x2="0" y2="400" class="axis-line"/>
        
        <!-- 標示原點 -->
        <circle cx="0" cy="0" r="8" class="origin-point"/>
        <text x="15" y="25" fill="#e53935" font-weight="bold">原點 (0, 0)</text>
        
        <!-- 標示 X 軸 -->
        <text x="550" y="25" fill="#333" font-weight="bold">X 軸 →</text>
        <line x1="520" y1="15" x2="540" y2="15" stroke="#333" stroke-width="2" marker-end="url(#arrowX)"/>
        
        <!-- 標示 Y 軸 -->
        <text x="15" y="380" fill="#333" font-weight="bold">Y 軸 ↓</text>
        <line x1="25" y1="360" x2="25" y2="380" stroke="#333" stroke-width="2" marker-end="url(#arrowY)"/>
        
        <!-- 示範點 -->
        <circle cx="150" cy="100" r="6" fill="#4CAF50"/>
        <text x="160" y="105" fill="#4CAF50" font-weight="bold">(150, 100)</text>
        
        <circle cx="400" cy="250" r="6" fill="#2196F3"/>
        <text x="410" y="255" fill="#2196F3" font-weight="bold">(400, 250)</text>
        
        <!-- 繪製虛線輔助線 -->
        <line x1="150" y1="0" x2="150" y2="100" stroke="#4CAF50" stroke-width="1" stroke-dasharray="5,5" opacity="0.5"/>
        <line x1="0" y1="100" x2="150" y2="100" stroke="#4CAF50" stroke-width="1" stroke-dasharray="5,5" opacity="0.5"/>
        
        <line x1="400" y1="0" x2="400" y2="250" stroke="#2196F3" stroke-width="1" stroke-dasharray="5,5" opacity="0.5"/>
        <line x1="0" y1="250" x2="400" y2="250" stroke="#2196F3" stroke-width="1" stroke-dasharray="5,5" opacity="0.5"/>
      </svg>
    </div>

    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-5 mb-6">
      <h3 class="text-lg font-bold text-yellow-800 mb-3 flex items-center gap-2">
        <span>⚠️</span>
        重要觀念：Y 軸向下
      </h3>
      <p class="text-gray-700 mb-3">與數學座標系統最大的差異：</p>
      <div class="bg-white p-4 rounded shadow-sm">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="font-bold text-red-600 mb-2">✘ 數學座標系統</p>
            <ul class="text-sm space-y-1 text-gray-600">
              <li>• 原點在左下角</li>
              <li>• Y 軸<strong>向上</strong>遞增</li>
              <li>• (0, 100) 在原點<strong>上方</strong></li>
            </ul>
          </div>
          <div>
            <p class="font-bold text-green-600 mb-2">✔ SVG 座標系統</p>
            <ul class="text-sm space-y-1 text-gray-600">
              <li>• 原點在左上角</li>
              <li>• Y 軸<strong>向下</strong>遞增</li>
              <li>• (0, 100) 在原點<strong>下方</strong></li>
            </ul>
          </div>
        </div>
        <div class="mt-4 bg-gray-100 p-3 rounded">
          <p class="text-sm font-bold text-gray-700 mb-2">💡 實務影響：</p>
          <p class="text-sm text-gray-600">繪製長條圖時，rect 的 y 座標 = <code>SVG高度 - 邊界 - 長條高度</code></p>
        </div>
      </div>
    </div>

    <h2 class="text-xl font-bold text-blue-600 mb-4">2️⃣ Transform: Translate (位移)</h2>
    <div class="svg-container mb-8">
      <svg width="100%" height="300" viewBox="0 0 800 300" class="border border-gray-200 bg-gray-50">
        <!-- 原始位置的矩形 -->
        <rect x="50" y="50" width="80" height="60" fill="#E91E63" opacity="0.3"/>
        <text x="90" y="130" text-anchor="middle" fill="#999">原始位置</text>
        
        <!-- 使用 translate 位移 -->
        <g transform="translate(200, 0)">
          <rect x="50" y="50" width="80" height="60" fill="#E91E63"/>
          <text x="90" y="130" text-anchor="middle">translate(200, 0)</text>
          <line x1="0" y1="80" x2="50" y2="80" stroke="#999" stroke-dasharray="3,3"/>
          <text x="25" y="75" text-anchor="middle" fill="#999" font-size="12">200px</text>
        </g>
        
        <!-- Y 軸位移 -->
        <g transform="translate(400, 100)">
          <rect x="50" y="50" width="80" height="60" fill="#2196F3"/>
          <text x="90" y="130" text-anchor="middle">translate(400, 100)</text>
        </g>
        
        <!-- 結合 X 和 Y -->
        <g transform="translate(600, 50)">
          <rect x="50" y="50" width="80" height="60" fill="#4CAF50"/>
          <text x="90" y="130" text-anchor="middle">translate(600, 50)</text>
        </g>
        
        <!-- 繪製參考線 -->
        <line x1="50" y1="80" x2="130" y2="80" stroke="#E91E63" stroke-width="2" opacity="0.3"/>
        <line x1="250" y1="80" x2="330" y2="80" stroke="#E91E63" stroke-width="2"/>
        <line x1="450" y1="180" x2="530" y2="180" stroke="#2196F3" stroke-width="2"/>
        <line x1="650" y1="130" x2="730" y2="130" stroke="#4CAF50" stroke-width="2"/>
      </svg>
    </div>

    <div class="bg-pink-50 border border-pink-200 rounded-lg p-5 mb-6">
      <h3 class="text-lg font-bold text-pink-800 mb-3 flex items-center gap-2">
        <span>📝</span>
        Translate 語法說明
      </h3>
      <div class="bg-white p-4 rounded shadow-sm">
        <code class="text-pink-600 font-bold text-lg">transform="translate(x, y)"</code>
        <p class="text-gray-600 mt-3 mb-3">將元素或群組從當前位置移動 x 像素和 y 像素。</p>
        <div class="bg-gray-100 p-3 rounded">
          <p class="font-bold text-sm mb-2">範例：</p>
          <pre class="text-xs"><code>&lt;g transform="translate(100, 50)"&gt;
  &lt;rect x="0" y="0" width="50" height="50" fill="blue"/&gt;
  &lt;!-- 這個 rect 會顯示在 (100, 50) 位置 --&gt;
&lt;/g&gt;</code></pre>
        </div>
        <p class="text-sm text-gray-600 mt-3">
          💡 <strong>實務技巧：</strong>在 D3 中，通常使用 translate 將繪圖區移動到留有邊界的位置，以便繪製座標軸。
        </p>
      </div>
    </div>

    <h2 class="text-xl font-bold text-blue-600 mb-4">3️⃣ Transform: Rotate (旋轉)</h2>
    <div class="svg-container mb-8">
      <svg width="100%" height="350" viewBox="0 0 800 350" class="border border-gray-200 bg-gray-50">
        <!-- 中心點參考 -->
        <circle cx="150" cy="150" r="3" fill="#e53935"/>
        <text x="150" y="170" text-anchor="middle" fill="#999" font-size="12">中心點</text>
        
        <!-- 繪製多個旋轉的矩形 -->
        <g transform="translate(150, 150)">
          <!-- 0 度 -->
          <rect x="-40" y="-20" width="80" height="40" fill="#4CAF50" opacity="0.3"/>
          
          <!-- 30 度 -->
          <rect x="-40" y="-20" width="80" height="40" fill="#4CAF50" opacity="0.5" 
                transform="rotate(30)"/>
          
          <!-- 60 度 -->
          <rect x="-40" y="-20" width="80" height="40" fill="#4CAF50" opacity="0.7" 
                transform="rotate(60)"/>
          
          <!-- 90 度 -->
          <rect x="-40" y="-20" width="80" height="40" fill="#4CAF50" 
                transform="rotate(90)"/>
        </g>
        <text x="150" y="240" text-anchor="middle">圍繞中心點旋轉</text>
        
        <!-- X 軸標籤旋轉示範 (常用於圖表) -->
        <g transform="translate(400, 100)">
          <text x="0" y="0" fill="#333" font-size="14">2024-01</text>
          <text x="0" y="0" fill="#2196F3" font-size="14" 
                transform="rotate(-45)" transform-origin="0 0">2024-01</text>
          <line x1="0" y1="10" x2="0" y2="30" stroke="#999"/>
          <text x="0" y="50" text-anchor="middle" fill="#999" font-size="12">標籤旋轉 -45°</text>
        </g>
        
        <!-- 時鐘示範 -->
        <g transform="translate(650, 150)">
          <circle cx="0" cy="0" r="80" fill="none" stroke="#ddd" stroke-width="2"/>
          
          <!-- 12 點方向 -->
          <line x1="0" y1="-60" x2="0" y2="-75" stroke="#333" stroke-width="3"/>
          
          <!-- 3 點方向 -->
          <line x1="0" y1="-60" x2="0" y2="-75" stroke="#333" stroke-width="3" 
                transform="rotate(90)"/>
          
          <!-- 6 點方向 -->
          <line x1="0" y1="-60" x2="0" y2="-75" stroke="#333" stroke-width="3" 
                transform="rotate(180)"/>
          
          <!-- 9 點方向 -->
          <line x1="0" y1="-60" x2="0" y2="-75" stroke="#333" stroke-width="3" 
                transform="rotate(270)"/>
          
          <!-- 時針 (指向 2 點) -->
          <line x1="0" y1="0" x2="0" y2="-40" stroke="#E91E63" stroke-width="4" 
                stroke-linecap="round" transform="rotate(60)"/>
          
          <!-- 分針 (指向 6 點) -->
          <line x1="0" y1="0" x2="0" y2="-55" stroke="#2196F3" stroke-width="3" 
                stroke-linecap="round" transform="rotate(180)"/>
          
          <circle cx="0" cy="0" r="5" fill="#333"/>
          <text x="0" y="100" text-anchor="middle" fill="#999" font-size="12">時鐘刻度</text>
        </g>
      </svg>
    </div>

    <div class="bg-purple-50 border border-purple-200 rounded-lg p-5 mb-6">
      <h3 class="text-lg font-bold text-purple-800 mb-3 flex items-center gap-2">
        <span>📝</span>
        Rotate 語法說明
      </h3>
      <div class="bg-white p-4 rounded shadow-sm space-y-3">
        <div>
          <code class="text-purple-600 font-bold">transform="rotate(degrees)"</code>
          <p class="text-gray-600 mt-2">以<strong>原點 (0,0)</strong> 為中心旋轉 degrees 度。</p>
        </div>
        <div>
          <code class="text-purple-600 font-bold">transform="rotate(degrees, cx, cy)"</code>
          <p class="text-gray-600 mt-2">以 <strong>(cx, cy)</strong> 為中心旋轉 degrees 度。</p>
        </div>
        <div class="bg-gray-100 p-3 rounded">
          <p class="font-bold text-sm mb-2">常見用法：</p>
          <pre class="text-xs"><code>&lt;!-- 旋轉 X 軸標籤 --&gt;
&lt;text x="0" y="0" transform="rotate(-45)"&gt;Label&lt;/text&gt;

&lt;!-- 先移動到中心，再旋轉 --&gt;
&lt;g transform="translate(150, 150)"&gt;
  &lt;rect x="-40" y="-20" width="80" height="40" transform="rotate(30)"/&gt;
&lt;/g&gt;</code></pre>
        </div>
      </div>
    </div>

    <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
      <h3 class="text-lg font-bold text-amber-800 mb-2 flex items-center gap-2">
        <span>🎯</span>
        練習任務
      </h3>
      <ol class="list-decimal list-inside text-gray-700 space-y-2">
        <li>使用 rotate 創建一個簡單的時鐘 (已有範例)</li>
        <li>嘗試將文字標籤旋轉 -45°，模擬圖表的斜向標籤</li>
        <li>結合 translate 和 rotate 創建一個旋轉的矩形</li>
      </ol>
    </div>

    <h2 class="text-xl font-bold text-blue-600 mb-4">4️⃣ Transform: Scale (縮放)</h2>
    <div class="svg-container mb-8">
      <svg width="100%" height="300" viewBox="0 0 800 300" class="border border-gray-200 bg-gray-50">
        <!-- 原始大小 -->
        <g transform="translate(100, 150)">
          <rect x="-30" y="-30" width="60" height="60" fill="#4CAF50" opacity="0.3"/>
          <text x="0" y="50" text-anchor="middle" font-size="12">scale(1)</text>
        </g>
        
        <!-- 放大 1.5 倍 -->
        <g transform="translate(250, 150)">
          <rect x="-30" y="-30" width="60" height="60" fill="#4CAF50" opacity="0.5" 
                transform="scale(1.5)"/>
          <text x="0" y="70" text-anchor="middle" font-size="12">scale(1.5)</text>
        </g>
        
        <!-- 放大 2 倍 -->
        <g transform="translate(420, 150)">
          <rect x="-30" y="-30" width="60" height="60" fill="#4CAF50" 
                transform="scale(2)"/>
          <text x="0" y="90" text-anchor="middle" font-size="12">scale(2)</text>
        </g>
        
        <!-- X 和 Y 不同縮放 -->
        <g transform="translate(620, 150)">
          <rect x="-30" y="-30" width="60" height="60" fill="#2196F3" 
                transform="scale(1.5, 0.8)"/>
          <text x="0" y="60" text-anchor="middle" font-size="12">scale(1.5, 0.8)</text>
        </g>
      </svg>
    </div>

    <div class="bg-teal-50 border border-teal-200 rounded-lg p-5 mb-6">
      <h3 class="text-lg font-bold text-teal-800 mb-3 flex items-center gap-2">
        <span>📝</span>
        Scale 語法說明
      </h3>
      <div class="bg-white p-4 rounded shadow-sm space-y-3">
        <div>
          <code class="text-teal-600 font-bold">transform="scale(s)"</code>
          <p class="text-gray-600 mt-2">X 和 Y 軸同時縮放 s 倍。</p>
        </div>
        <div>
          <code class="text-teal-600 font-bold">transform="scale(sx, sy)"</code>
          <p class="text-gray-600 mt-2">X 軸縮放 sx 倍，Y 軸縮放 sy 倍。</p>
        </div>
        <div class="bg-gray-100 p-3 rounded">
          <p class="font-bold text-sm mb-2">範例：</p>
          <pre class="text-xs"><code>&lt;rect x="0" y="0" width="50" height="50" transform="scale(2)"/&gt;
&lt;!-- 會變成 100x100 的矩形 --&gt;

&lt;rect x="0" y="0" width="50" height="50" transform="scale(2, 0.5)"/&gt;
&lt;!-- 寬度 100，高度 25 --&gt;</code></pre>
        </div>
        <p class="text-sm text-gray-600 mt-3">
          ⚠️ <strong>注意：</strong>縮放會影響所有屬性，包括 stroke-width。
        </p>
      </div>
    </div>

    <h2 class="text-xl font-bold text-blue-600 mb-4">5️⃣ D3 Margin Convention (圖表邊界慣例)</h2>
    <div class="svg-container mb-8">
      <svg width="100%" height="400" viewBox="0 0 800 400" class="border border-gray-200 bg-gray-50">
        <!-- 外框 (完整的 SVG 區域) -->
        <rect x="0" y="0" width="800" height="400" fill="none" stroke="#999" stroke-width="2"/>
        <text x="400" y="20" text-anchor="middle" fill="#999" font-weight="bold">
          完整 SVG 區域 (800 x 400)
        </text>
        
        <!-- Margin 標註 -->
        <text x="400" y="60" text-anchor="middle" fill="#E91E63" font-size="12">
          margin.top = 60
        </text>
        <text x="50" y="200" text-anchor="middle" fill="#E91E63" font-size="12" 
              transform="rotate(-90, 50, 200)">
          margin.left = 80
        </text>
        <text x="400" y="380" text-anchor="middle" fill="#E91E63" font-size="12">
          margin.bottom = 40
        </text>
        <text x="750" y="200" text-anchor="middle" fill="#E91E63" font-size="12" 
              transform="rotate(90, 750, 200)">
          margin.right = 60
        </text>
        
        <!-- 實際繪圖區域 -->
        <g transform="translate(80, 60)">
          <!-- 繪圖區域邊框 -->
          <rect x="0" y="0" width="660" height="300" fill="#e3f2fd" stroke="#2196F3" stroke-width="2"/>
          <text x="330" y="150" text-anchor="middle" fill="#2196F3" font-size="16" font-weight="bold">
            繪圖區域 (width: 660, height: 300)
          </text>
          <text x="330" y="175" text-anchor="middle" fill="#2196F3" font-size="14">
            transform="translate(margin.left, margin.top)"
          </text>
          
          <!-- 模擬圖表內容 -->
          <rect x="50" y="50" width="80" height="200" fill="#4CAF50" opacity="0.7"/>
          <rect x="150" y="100" width="80" height="150" fill="#4CAF50" opacity="0.7"/>
          <rect x="250" y="80" width="80" height="170" fill="#4CAF50" opacity="0.7"/>
          <rect x="350" y="120" width="80" height="130" fill="#4CAF50" opacity="0.7"/>
          <rect x="450" y="60" width="80" height="190" fill="#4CAF50" opacity="0.7"/>
          
          <!-- 模擬座標軸 -->
          <line x1="0" y1="250" x2="660" y2="250" stroke="#333" stroke-width="2"/>
          <line x1="0" y1="0" x2="0" y2="250" stroke="#333" stroke-width="2"/>
        </g>
      </svg>
    </div>

    <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-5 mb-6">
      <h3 class="text-lg font-bold text-indigo-800 mb-3 flex items-center gap-2">
        <span>💻</span>
        Margin Convention 程式碼範例
      </h3>
      <div class="bg-white p-4 rounded shadow-sm">
        <pre class="text-sm overflow-x-auto"><code>// 1. 定義 SVG 尺寸和邊界
const width = 800;
const height = 400;
const margin = { top: 60, right: 60, bottom: 40, left: 80 };

// 2. 計算繪圖區尺寸
const chartWidth = width - margin.left - margin.right;   // 660
const chartHeight = height - margin.top - margin.bottom; // 300

// 3. 創建 SVG
const svg = d3.select("body")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// 4. 創建繪圖群組，移動到正確位置
const g = svg.append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

// 5. 在 g 中繪製圖表內容，座標範圍是 (0, 0) 到 (chartWidth, chartHeight)
g.append("rect")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", chartWidth)
  .attr("height", chartHeight);</code></pre>
      </div>
      <div class="bg-yellow-100 p-3 rounded mt-3">
        <p class="text-sm font-bold text-yellow-800 mb-1">💡 為什麼要這樣做？</p>
        <ul class="text-sm text-gray-700 space-y-1">
          <li>• 留出空間給座標軸、標題、圖例</li>
          <li>• 讓繪圖邏輯更清晰，座標從 (0, 0) 開始</li>
          <li>• D3 社群的標準做法，易於閱讀和維護</li>
        </ul>
      </div>
    </div>

    <div class="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl p-6 shadow-lg">
      <h3 class="text-2xl font-bold mb-4 flex items-center gap-2">
        <span>🎓</span>
        恭喜完成座標系統與變換！
      </h3>
      <p class="mb-4">你已經掌握：</p>
      <ul class="space-y-2 mb-4">
        <li class="flex items-start gap-2">
          <span class="text-cyan-200">✅</span>
          <span>SVG 座標系統的特性 (原點在左上角，Y 軸向下)</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-cyan-200">✅</span>
          <span>translate 位移變換，移動元素或群組</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-cyan-200">✅</span>
          <span>rotate 旋轉變換，旋轉元素 (常用於標籤)</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-cyan-200">✅</span>
          <span>scale 縮放變換，放大或縮小元素</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-cyan-200">✅</span>
          <span>D3 Margin Convention，標準的圖表布局慣例</span>
        </li>
      </ul>
      <div class="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
        <p class="font-bold mb-1">📌 下一步</p>
        <p>點擊左側選單「3. 手寫長條圖」，學習如何手動繪製圖表！</p>
      </div>
    </div>
  </div>
</template>

<script setup>
// 純靜態 SVG 展示
</script>

<style scoped>
.grid-line {
  stroke: #e0e0e0;
  stroke-width: 0.5;
}

.axis-line {
  stroke: #999;
  stroke-width: 1;
}

.origin-point {
  fill: #e53935;
}

.svg-container {
  overflow-x: auto;
}
</style>
