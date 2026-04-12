<template>
  <div class="svg-basics">
    <!-- Learning Guide -->
    <div class="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
      <h3 class="text-lg font-bold text-green-700 mb-2">學習重點：SVG 基礎形狀與屬性</h3>
      <ul class="list-disc list-inside text-gray-700 space-y-1">
        <li><strong>基本形狀：</strong> <code>&lt;rect&gt;</code> (矩形), <code>&lt;circle&gt;</code> (圓形), <code>&lt;line&gt;</code> (直線) 等。</li>
        <li><strong>外觀屬性：</strong> <code>fill</code> (填充顏色), <code>stroke</code> (邊框顏色), <code>stroke-width</code> (邊框寬度)。</li>
        <li><strong>路徑 (Path)：</strong> 最強大的繪圖元素，使用 <code>d</code> 屬性定義路徑指令 (M=移動, L=畫線, C=曲線, Z=閉合)。</li>
        <li><strong>群組 (Group)：</strong> <code>&lt;g&gt;</code> 標籤用於將多個元素分組，可統一設定樣式或變換。</li>
      </ul>
    </div>

    <div class="bg-gradient-to-r from-green-100 to-teal-100 border border-green-300 rounded-lg p-5 mb-6">
      <h3 class="text-xl font-bold text-green-800 mb-3 flex items-center gap-2">
        <span class="text-2xl">🎯</span>
        學習目標
      </h3>
      <p class="text-gray-700 leading-relaxed">
        熟悉 SVG 基本形狀、屬性，以及如何在 HTML 中使用 SVG。這是學習 D3.js 的第一步，因為 <strong>D3 本質上是在操作 SVG 元素</strong>。
      </p>
    </div>

    <h2 class="text-xl font-bold text-green-600 mb-4">1️⃣ 基本形狀 (Basic Shapes)</h2>
    <p class="text-gray-600 mb-4">
      SVG 提供了多種基本形狀元素，每種都有特定的屬性來控制其外觀。
    </p>
    
    <div class="svg-container mb-8">
      <svg width="100%" height="200" viewBox="0 0 800 200" class="border border-gray-200 bg-gray-50">
        <!-- 矩形 (Rectangle) -->
        <rect x="10" y="10" width="100" height="80" 
              fill="#4CAF50" 
              stroke="#2E7D32" 
              stroke-width="3"/>
        <text x="60" y="110" text-anchor="middle" fill="#333">矩形 (rect)</text>
        
        <!-- 圓形 (Circle) -->
        <circle cx="200" cy="50" r="40" 
                fill="#2196F3" 
                stroke="#1565C0" 
                stroke-width="3"/>
        <text x="200" y="110" text-anchor="middle" fill="#333">圓形 (circle)</text>
        
        <!-- 橢圓 (Ellipse) -->
        <ellipse cx="330" cy="50" rx="60" ry="40" 
                 fill="#FF9800" 
                 stroke="#E65100" 
                 stroke-width="3"/>
        <text x="330" y="110" text-anchor="middle" fill="#333">橢圓 (ellipse)</text>
        
        <!-- 直線 (Line) -->
        <line x1="420" y1="20" x2="500" y2="80" 
              stroke="#E91E63" 
              stroke-width="5" 
              stroke-linecap="round"/>
        <text x="460" y="110" text-anchor="middle" fill="#333">直線 (line)</text>
        
        <!-- 多邊形 (Polygon) -->
        <polygon points="570,20 620,80 520,80" 
                 fill="#9C27B0" 
                 stroke="#6A1B9A" 
                 stroke-width="3"/>
        <text x="570" y="110" text-anchor="middle" fill="#333">三角形 (polygon)</text>
        
        <!-- 折線 (Polyline) -->
        <polyline points="650,80 680,30 710,60 740,20" 
                  fill="none" 
                  stroke="#009688" 
                  stroke-width="4" 
                  stroke-linecap="round" 
                  stroke-linejoin="round"/>
        <text x="695" y="110" text-anchor="middle" fill="#333">折線 (polyline)</text>
      </svg>
    </div>

    <div class="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
      <h3 class="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
        <span>💡</span>
        關鍵屬性速查
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div class="bg-white p-3 rounded shadow-sm">
          <code class="text-green-600 font-bold">fill</code>
          <p class="text-gray-600 mt-1">填充顏色 (支援顏色名稱、Hex、RGB)</p>
          <code class="text-xs bg-gray-100 px-2 py-1 rounded mt-1 block">fill="#4CAF50"</code>
        </div>
        <div class="bg-white p-3 rounded shadow-sm">
          <code class="text-green-600 font-bold">stroke</code>
          <p class="text-gray-600 mt-1">邊框顏色</p>
          <code class="text-xs bg-gray-100 px-2 py-1 rounded mt-1 block">stroke="#2E7D32"</code>
        </div>
        <div class="bg-white p-3 rounded shadow-sm">
          <code class="text-green-600 font-bold">stroke-width</code>
          <p class="text-gray-600 mt-1">邊框寬度 (單位：px)</p>
          <code class="text-xs bg-gray-100 px-2 py-1 rounded mt-1 block">stroke-width="3"</code>
        </div>
        <div class="bg-white p-3 rounded shadow-sm">
          <code class="text-green-600 font-bold">stroke-linecap</code>
          <p class="text-gray-600 mt-1">線條端點樣式</p>
          <code class="text-xs bg-gray-100 px-2 py-1 rounded mt-1 block">butt | round | square</code>
        </div>
        <div class="bg-white p-3 rounded shadow-sm">
          <code class="text-green-600 font-bold">stroke-linejoin</code>
          <p class="text-gray-600 mt-1">線條轉角樣式</p>
          <code class="text-xs bg-gray-100 px-2 py-1 rounded mt-1 block">miter | round | bevel</code>
        </div>
      </div>
    </div>

    <h2 class="text-xl font-bold text-green-600 mb-4">2️⃣ 透明度與進階樣式</h2>
    <div class="svg-container mb-8">
      <svg width="100%" height="200" viewBox="0 0 800 200" class="border border-gray-200 bg-gray-50">
        <!-- 完全不透明 -->
        <rect x="50" y="50" width="100" height="100" fill="#4CAF50"/>
        <text x="100" y="170" text-anchor="middle">opacity: 1</text>
        
        <!-- 整體透明度 -->
        <rect x="200" y="50" width="100" height="100" fill="#4CAF50" opacity="0.5"/>
        <text x="250" y="170" text-anchor="middle">opacity: 0.5</text>
        
        <!-- 填充透明度 -->
        <rect x="350" y="50" width="100" height="100" 
              fill="#4CAF50" fill-opacity="0.3" 
              stroke="#2E7D32" stroke-width="5"/>
        <text x="400" y="170" text-anchor="middle">fill-opacity: 0.3</text>
        
        <!-- 邊框透明度 -->
        <rect x="500" y="50" width="100" height="100" 
              fill="#4CAF50" 
              stroke="#2E7D32" stroke-width="10" stroke-opacity="0.3"/>
        <text x="550" y="170" text-anchor="middle">stroke-opacity: 0.3</text>
        
        <!-- 組合效果 -->
        <rect x="650" y="50" width="100" height="100" 
              fill="#4CAF50" fill-opacity="0.6" 
              stroke="#2E7D32" stroke-width="5" stroke-opacity="0.8"/>
        <text x="700" y="170" text-anchor="middle">組合效果</text>
      </svg>
    </div>

    <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
      <h3 class="text-lg font-bold text-amber-800 mb-2 flex items-center gap-2">
        <span>🎯</span>
        練習任務
      </h3>
      <ol class="list-decimal list-inside text-gray-700 space-y-2">
        <li>在上方 SVG 中添加一個重疊的圓形，使用不同的透明度</li>
        <li>實驗不同的 <code>stroke-width</code> 值，觀察效果</li>
        <li>嘗試組合 <code>fill-opacity</code> 和 <code>stroke-opacity</code></li>
      </ol>
    </div>

    <h2 class="text-xl font-bold text-green-600 mb-4">3️⃣ Path 路徑基礎</h2>
    <div class="svg-container mb-8">
      <svg width="100%" height="250" viewBox="0 0 800 250" class="border border-gray-200 bg-gray-50">
        <!-- M (moveTo) 和 L (lineTo) -->
        <path d="M 50 50 L 150 50 L 150 150 L 50 150 Z" 
              fill="none" stroke="#4CAF50" stroke-width="3"/>
        <text x="100" y="180" text-anchor="middle">M + L (正方形)</text>
        
        <!-- 折線 -->
        <path d="M 200 100 L 250 50 L 300 80 L 350 30 L 400 90" 
              fill="none" stroke="#2196F3" stroke-width="3"/>
        <text x="300" y="180" text-anchor="middle">折線 (line chart)</text>
        
        <!-- 曲線 (C: cubic bezier) -->
        <path d="M 450 100 C 480 50, 520 50, 550 100" 
              fill="none" stroke="#FF9800" stroke-width="3"/>
        <text x="500" y="180" text-anchor="middle">曲線 (C 指令)</text>
        
        <!-- 波浪線 (C 指令連續) -->
        <path d="M 50 220
                 C 80 180, 120 180, 150 220
                 S 220 260, 250 220
                 S 320 180, 350 220
                 S 420 260, 450 220"
              fill="none" stroke="#0099ff" stroke-width="3"/>
        <text x="250" y="240" text-anchor="middle">波浪線 (C + S)</text>

        <!-- 填充的形狀 -->
        <path d="M 600 50 L 650 100 L 600 150 L 550 100 Z" 
              fill="#E91E63" fill-opacity="0.6" 
              stroke="#C2185B" stroke-width="2"/>
        <text x="600" y="180" text-anchor="middle">菱形 (填充)</text>
      </svg>
    </div>

    <div class="bg-purple-50 border border-purple-200 rounded-lg p-5 mb-6">
      <h3 class="text-lg font-bold text-purple-800 mb-3 flex items-center gap-2">
        <span>💡</span>
        Path 指令速查
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div class="bg-white p-3 rounded shadow-sm">
          <code class="text-purple-600 font-bold">M x y</code>
          <p class="text-gray-600 mt-1">移動到 (x, y)，不繪製線條</p>
          <code class="text-xs bg-gray-100 px-2 py-1 rounded mt-1 block">M 50 50</code>
        </div>
        <div class="bg-white p-3 rounded shadow-sm">
          <code class="text-purple-600 font-bold">L x y</code>
          <p class="text-gray-600 mt-1">從當前點畫直線到 (x, y)</p>
          <code class="text-xs bg-gray-100 px-2 py-1 rounded mt-1 block">L 150 50</code>
        </div>
        <div class="bg-white p-3 rounded shadow-sm">
          <code class="text-purple-600 font-bold">H x</code>
          <p class="text-gray-600 mt-1">水平線到 x 座標</p>
          <code class="text-xs bg-gray-100 px-2 py-1 rounded mt-1 block">H 200</code>
        </div>
        <div class="bg-white p-3 rounded shadow-sm">
          <code class="text-purple-600 font-bold">V y</code>
          <p class="text-gray-600 mt-1">垂直線到 y 座標</p>
          <code class="text-xs bg-gray-100 px-2 py-1 rounded mt-1 block">V 100</code>
        </div>
        <div class="bg-white p-3 rounded shadow-sm">
          <code class="text-purple-600 font-bold">C x1 y1, x2 y2, x y</code>
          <p class="text-gray-600 mt-1">三次貝茲曲線 (兩個控制點)</p>
          <code class="text-xs bg-gray-100 px-2 py-1 rounded mt-1 block">C 80 50, 120 50, 150 100</code>
        </div>
        <div class="bg-white p-3 rounded shadow-sm">
          <code class="text-purple-600 font-bold">S x2 y2, x y</code>
          <p class="text-gray-600 mt-1">平滑曲線 (延續上一個 C)</p>
          <code class="text-xs bg-gray-100 px-2 py-1 rounded mt-1 block">S 220 150, 250 100</code>
        </div>
        <div class="bg-white p-3 rounded shadow-sm">
          <code class="text-purple-600 font-bold">Z</code>
          <p class="text-gray-600 mt-1">關閉路徑 (回到起點)</p>
          <code class="text-xs bg-gray-100 px-2 py-1 rounded mt-1 block">Z</code>
        </div>
      </div>
    </div>

    <div class="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
      <h3 class="text-lg font-bold text-red-800 mb-2 flex items-center gap-2">
        <span>🎯</span>
        挑戰任務
      </h3>
      <ol class="list-decimal list-inside text-gray-700 space-y-2">
        <li>使用 <code>path</code> 繪製一個五角星</li>
        <li>使用 <code>C</code> 指令繪製一個波浪線 (已有範例可參考)</li>
        <li>結合 <code>M, L, C</code> 指令繪製一個簡單的圖標 (例如：心形、箭頭)</li>
      </ol>
    </div>

    <h2 class="text-xl font-bold text-green-600 mb-4">4️⃣ 文字元素 (Text)</h2>
    <div class="svg-container mb-8">
      <svg width="100%" height="300" viewBox="0 0 800 300" class="border border-gray-200 bg-gray-50">
        <!-- 基本文字 -->
        <text x="50" y="50" fill="#333" font-size="16">基本文字</text>
        
        <!-- text-anchor (對齊方式) -->
        <line x1="200" y1="30" x2="200" y2="120" stroke="#ddd" stroke-width="1"/>
        <text x="200" y="50" text-anchor="start" fill="#4CAF50">start (預設)</text>
        <text x="200" y="75" text-anchor="middle" fill="#2196F3">middle (置中)</text>
        <text x="200" y="100" text-anchor="end" fill="#FF9800">end (靠右)</text>
        
        <!-- dominant-baseline (垂直對齊) -->
        <line x1="350" y1="70" x2="550" y2="70" stroke="#ddd" stroke-width="1"/>
        <text x="360" y="70" dominant-baseline="hanging" fill="#4CAF50">hanging</text>
        <text x="440" y="70" dominant-baseline="middle" fill="#2196F3">middle</text>
        <text x="510" y="70" dominant-baseline="baseline" fill="#FF9800">baseline</text>
        
        <!-- 字體樣式 -->
        <text x="50" y="150" font-size="20" font-weight="bold" fill="#333">粗體文字</text>
        <text x="50" y="180" font-size="16" font-style="italic" fill="#666">斜體文字</text>
        <text x="50" y="210" font-size="14" font-family="monospace" fill="#999">等寬字體</text>
        
        <!-- 多行文字 (使用 tspan) -->
        <text x="300" y="150" fill="#333">
          <tspan x="300" dy="0" font-weight="bold">標題：第一行</tspan>
          <tspan x="300" dy="25">第二行內容</tspan>
          <tspan x="300" dy="25" fill="#999" font-size="12">第三行註解</tspan>
        </text>
        
        <!-- 沿路徑的文字 -->
        <defs>
          <path id="curve" d="M 500 200 Q 600 150, 700 200" fill="none"/>
        </defs>
        <use href="#curve" stroke="#ddd" stroke-width="1"/>
        <text fill="#E91E63" font-size="14">
          <textPath href="#curve">文字沿著曲線排列</textPath>
        </text>
      </svg>
    </div>

    <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-5 mb-6">
      <h3 class="text-lg font-bold text-indigo-800 mb-3 flex items-center gap-2">
        <span>💡</span>
        文字屬性速查
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div class="bg-white p-3 rounded shadow-sm">
          <code class="text-indigo-600 font-bold">x, y</code>
          <p class="text-gray-600 mt-1">文字的起始位置座標</p>
        </div>
        <div class="bg-white p-3 rounded shadow-sm">
          <code class="text-indigo-600 font-bold">text-anchor</code>
          <p class="text-gray-600 mt-1">水平對齊：start, middle, end</p>
        </div>
        <div class="bg-white p-3 rounded shadow-sm">
          <code class="text-indigo-600 font-bold">dominant-baseline</code>
          <p class="text-gray-600 mt-1">垂直對齊：hanging, middle, baseline</p>
        </div>
        <div class="bg-white p-3 rounded shadow-sm">
          <code class="text-indigo-600 font-bold">font-size, font-weight, font-family</code>
          <p class="text-gray-600 mt-1">字體樣式控制</p>
        </div>
        <div class="bg-white p-3 rounded shadow-sm">
          <code class="text-indigo-600 font-bold">&lt;tspan&gt;</code>
          <p class="text-gray-600 mt-1">用於多行文字或部分樣式變更</p>
        </div>
        <div class="bg-white p-3 rounded shadow-sm">
          <code class="text-indigo-600 font-bold">&lt;textPath&gt;</code>
          <p class="text-gray-600 mt-1">讓文字沿著路徑排列</p>
        </div>
      </div>
    </div>

    <h2 class="text-xl font-bold text-green-600 mb-4">5️⃣ 群組元素 (Group)</h2>
    <div class="svg-container mb-8">
      <svg width="100%" height="250" viewBox="0 0 800 250" class="border border-gray-200 bg-gray-50">
        <!-- 未使用群組 -->
        <rect x="50" y="50" width="40" height="60" fill="#4CAF50"/>
        <rect x="100" y="50" width="40" height="60" fill="#4CAF50"/>
        <rect x="150" y="50" width="40" height="60" fill="#4CAF50"/>
        <text x="120" y="130" text-anchor="middle">沒有使用群組</text>
        
        <!-- 使用群組 - 可以統一控制 -->
        <g fill="#2196F3" stroke="#1565C0" stroke-width="2">
          <rect x="250" y="50" width="40" height="60"/>
          <rect x="300" y="50" width="40" height="60"/>
          <rect x="350" y="50" width="40" height="60"/>
        </g>
        <text x="300" y="130" text-anchor="middle">使用群組 (統一樣式)</text>
        
        <!-- 群組與 transform -->
        <g transform="translate(500, 0)">
          <rect x="0" y="50" width="40" height="60" fill="#FF9800"/>
          <rect x="50" y="50" width="40" height="60" fill="#FF9800"/>
          <rect x="100" y="50" width="40" height="60" fill="#FF9800"/>
          <text x="70" y="130" text-anchor="middle">群組 + 位移</text>
        </g>
        
        <!-- 巢狀群組 -->
        <g transform="translate(250, 150)">
          <g fill="#E91E63">
            <circle cx="20" cy="20" r="15"/>
            <circle cx="60" cy="20" r="15"/>
          </g>
          <text x="40" y="60" text-anchor="middle" fill="#333">巢狀群組</text>
        </g>
      </svg>
    </div>

    <div class="bg-cyan-50 border border-cyan-200 rounded-lg p-5 mb-6">
      <h3 class="text-lg font-bold text-cyan-800 mb-3 flex items-center gap-2">
        <span>💡</span>
        群組的優勢
      </h3>
      <ul class="list-disc list-inside text-gray-700 space-y-2">
        <li>統一套用樣式 (<code>fill</code>, <code>stroke</code> 等)</li>
        <li>統一套用變換 (<code>transform</code>)</li>
        <li>便於管理和組織 SVG 結構</li>
        <li>在 D3 中，經常用 <code>&lt;g&gt;</code> 來組織圖表的各個部分 (軸、圖例、資料點等)</li>
      </ul>
    </div>

    <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
      <h3 class="text-lg font-bold text-amber-800 mb-2 flex items-center gap-2">
        <span>🎯</span>
        實戰練習：創建一個長條圖單元
      </h3>
      <p class="text-gray-700 mb-2">使用 <code>&lt;g&gt;</code> 包裹：</p>
      <ol class="list-decimal list-inside text-gray-700 space-y-2 ml-4">
        <li>一個 <code>&lt;rect&gt;</code> 作為長條</li>
        <li>一個 <code>&lt;text&gt;</code> 作為數值標籤</li>
        <li>一個 <code>&lt;text&gt;</code> 作為類別標籤</li>
      </ol>
      <p class="text-gray-700 mt-3">然後嘗試使用 <code>transform="translate()"</code> 移動整個單元</p>
    </div>

    <div class="bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl p-6 shadow-lg">
      <h3 class="text-2xl font-bold mb-4 flex items-center gap-2">
        <span>🎓</span>
        恭喜完成 SVG 基礎練習！
      </h3>
      <p class="mb-4">你已經掌握：</p>
      <ul class="space-y-2 mb-4">
        <li class="flex items-start gap-2">
          <span class="text-green-200">✅</span>
          <span>SVG 基本形狀 (rect, circle, ellipse, line, polygon, polyline)</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-green-200">✅</span>
          <span>Path 路徑的基本指令 (M, L, C, Z)</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-green-200">✅</span>
          <span>文字元素的使用與對齊</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-green-200">✅</span>
          <span>群組元素的組織與應用</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-green-200">✅</span>
          <span>透明度與樣式控制</span>
        </li>
      </ul>
      <div class="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
        <p class="font-bold mb-1">📌 下一步</p>
        <p>點擊左側選單「2. 座標系統與變換」，學習 SVG 座標系統和變換！</p>
      </div>
    </div>
  </div>
</template>

<script setup>
// 純靜態 SVG 展示，無需邏輯
</script>

<style scoped>
.svg-container {
  overflow-x: auto;
}
</style>
