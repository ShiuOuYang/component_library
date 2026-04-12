<template>
  <div class="manual-bar-chart">
    <!-- Learning Objectives -->
    <div class="bg-gradient-to-r from-orange-100 to-red-100 border border-orange-300 rounded-lg p-5 mb-6">
      <h3 class="text-xl font-bold text-orange-800 mb-3 flex items-center gap-2">
        <span class="text-2xl">🎯</span>
        學習目標
      </h3>
      <p class="text-gray-700 leading-relaxed">
        學習如何手動繪製長條圖，理解<strong>數據映射到視覺元素</strong>的過程。這是 D3 的核心概念——將數據轉換為圖形。
      </p>
    </div>

    <!-- Learning Guide -->
    <div class="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6">
      <h3 class="text-lg font-bold text-orange-700 mb-2">學習重點：手動繪製圖表</h3>
      <ul class="list-disc list-inside text-gray-700 space-y-1">
        <li><strong>資料映射：</strong> 將數據數值轉換為像素座標 (例如：數值 100 -> 高度 200px)。</li>
        <li><strong>座標軸繪製：</strong> 手動繪製線條與文字標籤來模擬座標軸。</li>
        <li><strong>長條圖邏輯：</strong> 
          <ul class="list-disc list-inside ml-4">
            <li><code>x</code>: 根據索引 (index) 計算水平位置。</li>
            <li><code>y</code>: <code>SVG高度 - 邊界 - 長條高度</code> (因為 Y 軸向下)。</li>
            <li><code>height</code>: 根據數據數值計算。</li>
          </ul>
        </li>
      </ul>
    </div>

    <h2 class="text-xl font-bold text-orange-500 mb-4">1️⃣ 最簡單的長條圖</h2>
    <p class="text-gray-600 mb-4">
      手動計算每個長條的位置和高度。數據：[10, 25, 15, 30, 20]
    </p>
    
    <div class="svg-container mb-8">
      <svg width="100%" height="250" viewBox="0 0 600 250" class="border border-gray-200 bg-white">
        <!-- 長條 1: 數值 10 -->
        <rect x="50" y="150" width="80" height="50" fill="#4CAF50"/>
        <text x="90" y="220" text-anchor="middle" font-size="14">10</text>
        
        <!-- 長條 2: 數值 25 -->
        <rect x="150" y="75" width="80" height="125" fill="#4CAF50"/>
        <text x="190" y="220" text-anchor="middle" font-size="14">25</text>
        
        <!-- 長條 3: 數值 15 -->
        <rect x="250" y="125" width="80" height="75" fill="#4CAF50"/>
        <text x="290" y="220" text-anchor="middle" font-size="14">15</text>
        
        <!-- 長條 4: 數值 30 (最高) -->
        <rect x="350" y="50" width="80" height="150" fill="#4CAF50"/>
        <text x="390" y="220" text-anchor="middle" font-size="14">30</text>
        
        <!-- 長條 5: 數值 20 -->
        <rect x="450" y="100" width="80" height="100" fill="#4CAF50"/>
        <text x="490" y="220" text-anchor="middle" font-size="14">20</text>
        
        <!-- 基準線 -->
        <line x1="40" y1="200" x2="540" y2="200" stroke="#333" stroke-width="2"/>
      </svg>
    </div>

    <div class="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
      <h3 class="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
        <span>📝</span>
        計算遏輯說明
      </h3>
      <div class="bg-white p-4 rounded shadow-sm">
        <p class="text-gray-700 mb-3">假設數據：<code>[10, 25, 15, 30, 20]</code></p>
        <p class="text-gray-700 mb-3">設定：</p>
        <ul class="list-disc list-inside text-sm text-gray-600 mb-4 space-y-1">
          <li>SVG 高度 = 250px</li>
          <li>基準線位置 = 200px</li>
          <li>最大數值 = 30</li>
          <li>每個長條寬度 = 80px，間隔 = 20px</li>
        </ul>
        <div class="bg-gray-100 p-3 rounded">
          <p class="font-bold text-sm mb-2">以第 2 個長條（數值 25）為例：</p>
          <pre class="text-xs"><code>// 1. 計算 x 座標
x = 50 + (index * 100) = 50 + (1 * 100) = 150

// 2. 計算長條高度
height = (value / maxValue) * maxHeight
       = (25 / 30) * 150
       = 125px

// 3. 計算 y 座標 (關鍵！)
y = baselineY - height
  = 200 - 125
  = 75px

// 4. 繪製矩形
&lt;rect x="150" y="75" width="80" height="125" fill="#4CAF50"/&gt;</code></pre>
        </div>
        <p class="text-sm text-yellow-800 bg-yellow-100 p-2 rounded mt-3">
          💡 <strong>重點：</strong>y 座標 = 基準線 - 長條高度，因為 SVG 的 Y 軸向下！
        </p>
      </div>
    </div>

    <h2 class="text-xl font-bold text-orange-500 mb-4">2️⃣ 帶完整座標軸的長條圖</h2>
    <div class="svg-container mb-8">
      <svg width="100%" height="500" viewBox="0 0 800 500" class="border border-gray-200 bg-white">
        <!-- 標題 -->
        <text x="400" y="25" text-anchor="middle" font-size="20" font-weight="bold" fill="#333">
          水果銷售數量 (單位：箱)
        </text>
        
        <!-- 使用 margin convention -->
        <g transform="translate(80, 40)">
          <!-- Y 軸 -->
          <line x1="0" y1="0" x2="0" y2="400" stroke="#333" stroke-width="2"/>
          
          <!-- Y 軸刻度和標籤 -->
          <!-- 60 -->
          <line x1="-5" y1="0" x2="0" y2="0" stroke="#333" stroke-width="2"/>
          <text x="-10" y="5" text-anchor="end" font-size="14" fill="#333">60</text>
          <line x1="0" y1="0" x2="680" y2="0" stroke="#e0e0e0" stroke-width="1"/>
          
          <!-- 50 -->
          <line x1="-5" y1="67" x2="0" y2="67" stroke="#333" stroke-width="2"/>
          <text x="-10" y="72" text-anchor="end" font-size="14" fill="#333">50</text>
          <line x1="0" y1="67" x2="680" y2="67" stroke="#e0e0e0" stroke-width="1"/>
          
          <!-- 40 -->
          <line x1="-5" y1="133" x2="0" y2="133" stroke="#333" stroke-width="2"/>
          <text x="-10" y="138" text-anchor="end" font-size="14" fill="#333">40</text>
          <line x1="0" y1="133" x2="680" y2="133" stroke="#e0e0e0" stroke-width="1"/>
          
          <!-- 30 -->
          <line x1="-5" y1="200" x2="0" y2="200" stroke="#333" stroke-width="2"/>
          <text x="-10" y="205" text-anchor="end" font-size="14" fill="#333">30</text>
          <line x1="0" y1="200" x2="680" y2="200" stroke="#e0e0e0" stroke-width="1"/>
          
          <!-- 20 -->
          <line x1="-5" y1="267" x2="0" y2="267" stroke="#333" stroke-width="2"/>
          <text x="-10" y="272" text-anchor="end" font-size="14" fill="#333">20</text>
          <line x1="0" y1="267" x2="680" y2="267" stroke="#e0e0e0" stroke-width="1"/>
          
          <!-- 10 -->
          <line x1="-5" y1="333" x2="0" y2="333" stroke="#333" stroke-width="2"/>
          <text x="-10" y="338" text-anchor="end" font-size="14" fill="#333">10</text>
          <line x1="0" y1="333" x2="680" y2="333" stroke="#e0e0e0" stroke-width="1"/>
          
          <!-- 0 -->
          <line x1="-5" y1="400" x2="0" y2="400" stroke="#333" stroke-width="2"/>
          <text x="-10" y="405" text-anchor="end" font-size="14" fill="#333">0</text>
          
          <!-- X 軸 -->
          <line x1="0" y1="400" x2="680" y2="400" stroke="#333" stroke-width="2"/>
          
          <!-- 長條與標籤 -->
          <!-- Apple: 45 -->
          <rect x="40" y="100" width="100" height="300" fill="#FF6B6B"/>
          <text x="90" y="430" text-anchor="middle" font-size="14" fill="#333">Apple</text>
          <text x="90" y="90" text-anchor="middle" font-size="12" font-weight="bold" fill="#333">45</text>
          
          <!-- Banana: 30 -->
          <rect x="176" y="200" width="100" height="200" fill="#FFD93D"/>
          <text x="226" y="430" text-anchor="middle" font-size="14" fill="#333">Banana</text>
          <text x="226" y="190" text-anchor="middle" font-size="12" font-weight="bold" fill="#333">30</text>
          
          <!-- Cherry: 55 -->
          <rect x="312" y="33" width="100" height="367" fill="#E91E63"/>
          <text x="362" y="430" text-anchor="middle" font-size="14" fill="#333">Cherry</text>
          <text x="362" y="23" text-anchor="middle" font-size="12" font-weight="bold" fill="#333">55</text>
          
          <!-- Date: 20 -->
          <rect x="448" y="267" width="100" height="133" fill="#A0522D"/>
          <text x="498" y="430" text-anchor="middle" font-size="14" fill="#333">Date</text>
          <text x="498" y="257" text-anchor="middle" font-size="12" font-weight="bold" fill="#333">20</text>
          
          <!-- Elderberry: 40 -->
          <rect x="584" y="133" width="100" height="267" fill="#9C27B0"/>
          <text x="634" y="430" text-anchor="middle" font-size="14" fill="#333">Elderberry</text>
          <text x="634" y="123" text-anchor="middle" font-size="12" font-weight="bold" fill="#333">40</text>
          
          <!-- Y 軸標題 (垂直) -->
          <text x="-50" y="200" text-anchor="middle" font-size="16" font-weight="bold" fill="#333"
                transform="rotate(-90, -50, 200)">
            數量 (箱)
          </text>
          
          <!-- X 軸標題 -->
          <text x="340" y="460" text-anchor="middle" font-size="16" font-weight="bold" fill="#333">
            水果種類
          </text>
        </g>
      </svg>
    </div>

    <div class="bg-purple-50 border border-purple-200 rounded-lg p-5 mb-6">
      <h3 class="text-lg font-bold text-purple-800 mb-3 flex items-center gap-2">
        <span>📝</span>
        座標軸繪製技巧
      </h3>
      <div class="bg-white p-4 rounded shadow-sm space-y-3">
        <div>
          <p class="font-bold text-sm mb-2">Y 軸刻度計算：</p>
          <pre class="text-xs bg-gray-100 p-2 rounded"><code>// 假設 Y 軸範圍：0-60，繪圖區高度：400px
const yScale = 400 / 60;  // 6.67 px per unit

// 刻度 50 的位置
y = (60 - 50) * yScale = 10 * 6.67 = 67px</code></pre>
        </div>
        <div>
          <p class="font-bold text-sm mb-2">網格線：</p>
          <pre class="text-xs bg-gray-100 p-2 rounded"><code>&lt;line x1="0" y1="67" x2="680" y2="67" 
      stroke="#e0e0e0" stroke-width="1"/&gt;</code></pre>
        </div>
        <div>
          <p class="font-bold text-sm mb-2">長條高度計算：</p>
          <pre class="text-xs bg-gray-100 p-2 rounded"><code>// Apple: 45 箱
height = 45 * yScale = 45 * (400/60) = 300px
y = 400 - 300 = 100px</code></pre>
        </div>
      </div>
    </div>

    <div class="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
      <h3 class="text-lg font-bold text-amber-800 mb-2 flex items-center gap-2">
        <span>🎯</span>
        練習任務
      </h3>
      <ol class="list-decimal list-inside text-gray-700 space-y-2">
        <li>嘗試修改數據，觀察長條高度變化</li>
        <li>新增一個 Y 軸刻度 (例如：35)</li>
        <li>嘗試使用不同顏色來區分不同數值範圍</li>
      </ol>
    </div>

    <h2 class="text-xl font-bold text-orange-500 mb-4">3️⃣ 水平長條圖 (Horizontal Bar Chart)</h2>
    <div class="svg-container mb-8">
      <svg width="100%" height="400" viewBox="0 0 700 400" class="border border-gray-200 bg-white">
        <!-- 標題 -->
        <text x="350" y="25" text-anchor="middle" font-size="18" font-weight="bold" fill="#333">
          員工滿意度調查 (滿分 100)
        </text>
        
        <g transform="translate(150, 50)">
          <!-- Y 軸 (現在是類別軸) -->
          <line x1="0" y1="0" x2="0" y2="300" stroke="#333" stroke-width="2"/>
          
          <!-- 類別標籤 -->
          <text x="-10" y="35" text-anchor="end" font-size="14" fill="#333">工作環境</text>
          <text x="-10" y="95" text-anchor="end" font-size="14" fill="#333">薪資福利</text>
          <text x="-10" y="155" text-anchor="end" font-size="14" fill="#333">職涯發展</text>
          <text x="-10" y="215" text-anchor="end" font-size="14" fill="#333">團隊氛圍</text>
          <text x="-10" y="275" text-anchor="end" font-size="14" fill="#333">工作彈性</text>
          
          <!-- X 軸 (現在是數值軸) -->
          <line x1="0" y1="300" x2="500" y2="300" stroke="#333" stroke-width="2"/>
          
          <!-- X 軸刻度 -->
          <line x1="0" y1="295" x2="0" y2="305" stroke="#333" stroke-width="2"/>
          <text x="0" y="320" text-anchor="middle" font-size="12" fill="#333">0</text>
          
          <line x1="125" y1="295" x2="125" y2="305" stroke="#333" stroke-width="2"/>
          <text x="125" y="320" text-anchor="middle" font-size="12" fill="#333">25</text>
          
          <line x1="250" y1="295" x2="250" y2="305" stroke="#333" stroke-width="2"/>
          <text x="250" y="320" text-anchor="middle" font-size="12" fill="#333">50</text>
          
          <line x1="375" y1="295" x2="375" y2="305" stroke="#333" stroke-width="2"/>
          <text x="375" y="320" text-anchor="middle" font-size="12" fill="#333">75</text>
          
          <line x1="500" y1="295" x2="500" y2="305" stroke="#333" stroke-width="2"/>
          <text x="500" y="320" text-anchor="middle" font-size="12" fill="#333">100</text>
          
          <!-- 網格線 -->
          <line x1="125" y1="0" x2="125" y2="300" stroke="#e0e0e0" stroke-width="1"/>
          <line x1="250" y1="0" x2="250" y2="300" stroke="#e0e0e0" stroke-width="1"/>
          <line x1="375" y1="0" x2="375" y2="300" stroke="#e0e0e0" stroke-width="1"/>
          <line x1="500" y1="0" x2="500" y2="300" stroke="#e0e0e0" stroke-width="1"/>
          
          <!-- 水平長條 -->
          <!-- 工作環境: 85 -->
          <rect x="0" y="10" width="425" height="40" fill="#4CAF50"/>
          <text x="435" y="35" font-size="14" font-weight="bold" fill="#333">85</text>
          
          <!-- 薪資福利: 72 -->
          <rect x="0" y="70" width="360" height="40" fill="#2196F3"/>
          <text x="370" y="95" font-size="14" font-weight="bold" fill="#333">72</text>
          
          <!-- 職涯發展: 68 -->
          <rect x="0" y="130" width="340" height="40" fill="#FF9800"/>
          <text x="350" y="155" font-size="14" font-weight="bold" fill="#333">68</text>
          
          <!-- 團隊氛圍: 92 -->
          <rect x="0" y="190" width="460" height="40" fill="#E91E63"/>
          <text x="470" y="215" font-size="14" font-weight="bold" fill="#333">92</text>
          
          <!-- 工作彈性: 78 -->
          <rect x="0" y="250" width="390" height="40" fill="#9C27B0"/>
          <text x="400" y="275" font-size="14" font-weight="bold" fill="#333">78</text>
        </g>
      </svg>
    </div>

    <div class="bg-teal-50 border border-teal-200 rounded-lg p-5 mb-6">
      <h3 class="text-lg font-bold text-teal-800 mb-3 flex items-center gap-2">
        <span>🔄</span>
        水平與垂直的區別
      </h3>
      <div class="bg-white p-4 rounded shadow-sm">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="font-bold text-sm mb-2 text-blue-600">垂直長條圖：</p>
            <ul class="text-xs space-y-1 text-gray-600">
              <li>• X 軸：類別</li>
              <li>• Y 軸：數值</li>
              <li>• <code>x</code> 根據索引計算</li>
              <li>• <code>y</code> 根據數值計算 (從上往下)</li>
            </ul>
          </div>
          <div>
            <p class="font-bold text-sm mb-2 text-teal-600">水平長條圖：</p>
            <ul class="text-xs space-y-1 text-gray-600">
              <li>• Y 軸：類別</li>
              <li>• X 軸：數值</li>
              <li>• <code>y</code> 根據索引計算</li>
              <li>• <code>width</code> 根據數值計算 (從左往右)</li>
            </ul>
          </div>
        </div>
        <div class="bg-gray-100 p-3 rounded mt-3">
          <p class="font-bold text-sm mb-2">水平長條範例：</p>
          <pre class="text-xs"><code>// 工作環境: 85 分 (滿分 100)
const value = 85;
const maxValue = 100;
const maxWidth = 500;

// 計算長條寬度
const width = (value / maxValue) * maxWidth;
             = (85 / 100) * 500
             = 425px

&lt;rect x="0" y="10" width="425" height="40" fill="#4CAF50"/&gt;</code></pre>
        </div>
      </div>
    </div>

    <h2 class="text-xl font-bold text-orange-500 mb-4">4️⃣ 堆疊長條圖 (Stacked Bar Chart)</h2>
    <div class="svg-container mb-8">
      <svg width="100%" height="400" viewBox="0 0 700 400" class="border border-gray-200 bg-white">
        <text x="350" y="25" text-anchor="middle" font-size="18" font-weight="bold" fill="#333">
          季度產品銷售組成
        </text>
        
        <g transform="translate(100, 50)">
          <!-- Y 軸 -->
          <line x1="0" y1="0" x2="0" y2="300" stroke="#333" stroke-width="2"/>
          
          <!-- Y 軸刻度 -->
          <line x1="-5" y1="0" x2="0" y2="0" stroke="#333" stroke-width="2"/>
          <text x="-10" y="5" text-anchor="end" font-size="12" fill="#333">70</text>
          
          <line x1="-5" y1="100" x2="0" y2="100" stroke="#333" stroke-width="2"/>
          <text x="-10" y="105" text-anchor="end" font-size="12" fill="#333">50</text>
          
          <line x1="-5" y1="200" x2="0" y2="200" stroke="#333" stroke-width="2"/>
          <text x="-10" y="205" text-anchor="end" font-size="12" fill="#333">30</text>
          
          <line x1="-5" y1="300" x2="0" y2="300" stroke="#333" stroke-width="2"/>
          <text x="-10" y="305" text-anchor="end" font-size="12" fill="#333">0</text>
          
          <!-- X 軸 -->
          <line x1="0" y1="300" x2="500" y2="300" stroke="#333" stroke-width="2"/>
          
          <!-- January 堆疊 (總計 45: A=20, B=15, C=10) -->
          <!-- 比例尺: 300px / 70 = 4.29px per unit -->
          <g transform="translate(80, 0)">
            <!-- Product C (10): height=43px, y=257 -->
            <rect x="0" y="257" width="80" height="43" fill="#9C27B0"/>
            <!-- Product B (15): height=64px, y=193 -->
            <rect x="0" y="193" width="80" height="64" fill="#2196F3"/>
            <!-- Product A (20): height=86px, y=107 -->
            <rect x="0" y="107" width="80" height="86" fill="#4CAF50"/>
            
            <text x="40" y="320" text-anchor="middle" font-size="14" fill="#333">Jan</text>
          </g>
          
          <!-- February 堆疊 (總計 57: A=25, B=20, C=12) -->
          <g transform="translate(230, 0)">
            <!-- Product C (12): height=51px, y=249 -->
            <rect x="0" y="249" width="80" height="51" fill="#9C27B0"/>
            <!-- Product B (20): height=86px, y=163 -->
            <rect x="0" y="163" width="80" height="86" fill="#2196F3"/>
            <!-- Product A (25): height=107px, y=56 -->
            <rect x="0" y="56" width="80" height="107" fill="#4CAF50"/>
            
            <text x="40" y="320" text-anchor="middle" font-size="14" fill="#333">Feb</text>
          </g>
          
          <!-- March 堆疊 (總計 63: A=30, B=18, C=15) -->
          <g transform="translate(380, 0)">
            <!-- Product C (15): height=64px, y=236 -->
            <rect x="0" y="236" width="80" height="64" fill="#9C27B0"/>
            <!-- Product B (18): height=77px, y=159 -->
            <rect x="0" y="159" width="80" height="77" fill="#2196F3"/>
            <!-- Product A (30): height=129px, y=30 -->
            <rect x="0" y="30" width="80" height="129" fill="#4CAF50"/>
            
            <text x="40" y="320" text-anchor="middle" font-size="14" fill="#333">Mar</text>
          </g>
          
          <!-- 圖例 -->
          <g transform="translate(350, 10)">
            <rect x="0" y="0" width="15" height="15" fill="#4CAF50"/>
            <text x="20" y="12" font-size="12" fill="#333">Product A</text>
            
            <rect x="0" y="20" width="15" height="15" fill="#2196F3"/>
            <text x="20" y="32" font-size="12" fill="#333">Product B</text>
            
            <rect x="0" y="40" width="15" height="15" fill="#9C27B0"/>
            <text x="20" y="52" font-size="12" fill="#333">Product C</text>
          </g>
        </g>
      </svg>
    </div>

    <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-5 mb-6">
      <h3 class="text-lg font-bold text-indigo-800 mb-3 flex items-center gap-2">
        <span>💻</span>
        堆疊長條圖計算
      </h3>
      <div class="bg-white p-4 rounded shadow-sm">
        <p class="text-gray-700 mb-3">以 February 為例：A=25, B=20, C=12，總計=57</p>
        <pre class="text-sm"><code>// 設定
 const pixelPerUnit = 300 / 70;  // 4.29 px/unit
 const baseY = 300;              // 基準線
 
// Product C (最下層)
const heightC = 12 * pixelPerUnit = 51px;
const yC = baseY - heightC = 300 - 51 = 249px;

// Product B (中間層)
const heightB = 20 * pixelPerUnit = 86px;
const yB = yC - heightB = 249 - 86 = 163px;

// Product A (最上層)
const heightA = 25 * pixelPerUnit = 107px;
const yA = yB - heightA = 163 - 107 = 56px;</code></pre>
        <p class="text-sm text-blue-800 bg-blue-100 p-2 rounded mt-3">
          💡 <strong>關鍵概念：</strong>從下往上堆疊，每一層的 y 座標 = 上一層的 y - 當前層的高度。
        </p>
      </div>
    </div>

    <div class="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl p-6 shadow-lg">
      <h3 class="text-2xl font-bold mb-4 flex items-center gap-2">
        <span>🎓</span>
        恭喜完成手寫長條圖！
      </h3>
      <p class="mb-4">你已經掌握：</p>
      <ul class="space-y-2 mb-4">
        <li class="flex items-start gap-2">
          <span class="text-orange-200">✅</span>
          <span>數據到像素的映射計算（比例尺）</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-orange-200">✅</span>
          <span>長條圖的 x, y 座標計算遏輯</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-orange-200">✅</span>
          <span>座標軸的手動繪製（刻度、標籤、網格線）</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-orange-200">✅</span>
          <span>水平長條圖與垂直長條圖的區別</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-orange-200">✅</span>
          <span>堆疊長條圖的分層計算</span>
        </li>
      </ul>
      <div class="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
        <p class="font-bold mb-1">📌 下一步</p>
        <p>點擊左側選單「4. Vanilla JS 操作 SVG」，學習如何用 JavaScript 動態生成圖表！</p>
      </div>
    </div>
  </div>
</template>

<script setup>
// 純靜態 SVG 展示
</script>

<style scoped>
.svg-container {
  overflow-x: auto;
}
</style>
