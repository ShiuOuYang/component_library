<template>
  <div class="w-full px-8 py-12">
    <!-- 頁面標題 -->
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
          <span class="text-3xl">🪟</span>
        </div>
        <div>
          <h1 class="text-4xl font-bold text-gray-900">DraggableModal + ModalDock</h1>
          <p class="text-lg text-gray-600 mt-1">可拖曳模態框 + 多視窗口袋停靠系統</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mt-6">
        <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">✓ 完成</span>
        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Vue 3</span>
        <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">TypeScript</span>
        <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">Tailwind CSS</span>
        <span class="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">多視窗</span>
      </div>
    </div>

    <!-- 架構概覽 -->
    <section class="mb-12 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-md p-8 border-2 border-indigo-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
        <span class="mr-3">🏗️</span>
        架構概覽
      </h2>
      <div class="grid md:grid-cols-3 gap-6 mt-6">
        <div class="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">🪟</span>
            <h3 class="font-bold text-gray-900">DraggableModal</h3>
          </div>
          <p class="text-sm text-gray-600">模態框主體。支援拖曳、調整大小、最大化、縮小到口袋。每個實例用 <code class="text-purple-600 bg-gray-100 px-1 rounded">id</code> 區分。</p>
        </div>
        <div class="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">📥</span>
            <h3 class="font-bold text-gray-900">ModalDock</h3>
          </div>
          <p class="text-sm text-gray-600">右下角口袋停靠區。自動顯示所有被縮小的視窗，可展開/收合、還原或關閉。</p>
        </div>
        <div class="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">🔗</span>
            <h3 class="font-bold text-gray-900">useModalManager</h3>
          </div>
          <p class="text-sm text-gray-600">全域 composable。管理所有縮小中的 Modal 註冊/反註冊，共享響應式狀態。</p>
        </div>
      </div>
      <div class="mt-6 bg-white/60 rounded-lg p-4 border border-indigo-200">
        <p class="text-sm text-gray-700">
          <strong>工作流程：</strong>
          點擊「—」縮小 → Modal 隱藏並透過 <code class="text-purple-600 bg-gray-100 px-1 rounded">useModalManager</code> 註冊到全域  
          → <code class="text-purple-600 bg-gray-100 px-1 rounded">ModalDock</code> 自動顯示標籤  
          → 點擊標籤還原或關閉
        </p>
      </div>
    </section>

    <!-- 組件描述 -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
        <span class="mr-3">📖</span>
        組件簡介
      </h2>
      <div class="prose prose-blue max-w-none">
        <p class="text-gray-700 leading-relaxed mb-4">
          <code class="px-2 py-1 bg-gray-100 text-purple-600 rounded">DraggableModal</code> 
          是一個功能強大的模態框組件，支援拖曳、調整大小、最大化/最小化、以及多視窗口袋停靠等功能。使用 Teleport 技術確保正確的層級關係，適合需要靈活交互的彈窗場景。
        </p>
        <h3 class="text-lg font-semibold text-gray-900 mb-3 mt-6">核心特性</h3>
        <ul class="space-y-2 text-gray-700">
          <li class="flex items-start">
            <span class="text-purple-500 mr-2">✓</span>
            <span><strong>自由拖曳</strong>：點擊標題欄拖動窗口位置</span>
          </li>
          <li class="flex items-start">
            <span class="text-purple-500 mr-2">✓</span>
            <span><strong>調整大小</strong>：拖動右下角調整窗口尺寸</span>
          </li>
          <li class="flex items-start">
            <span class="text-purple-500 mr-2">✓</span>
            <span><strong>最大化/還原</strong>：一鍵切換全屏顯示</span>
          </li>
          <li class="flex items-start">
            <span class="text-amber-500 mr-2">★</span>
            <span><strong>多視窗口袋</strong>：縮小視窗停靠在右下角，支援多個 Modal 同時縮小，用 ID 區分</span>
          </li>
          <li class="flex items-start">
            <span class="text-amber-500 mr-2">★</span>
            <span><strong>ModalDock 停靠區</strong>：口袋按鈕顯示數量徽章，展開後可逐一還原或關閉</span>
          </li>
          <li class="flex items-start">
            <span class="text-purple-500 mr-2">✓</span>
            <span><strong>Teleport 掛載</strong>：渲染到 body 確保層級正確</span>
          </li>
          <li class="flex items-start">
            <span class="text-amber-500 mr-2">★</span>
            <span><strong>自動 z-index 管理</strong>：最新點擊的視窗自動提升到最上層，無需手動設定</span>
          </li>
          <li class="flex items-start">
            <span class="text-purple-500 mr-2">✓</span>
            <span><strong>可配置樣式</strong>：支援自定義標題欄、邊框、圓角、陰影等</span>
          </li>
          <li class="flex items-start">
            <span class="text-purple-500 mr-2">✓</span>
            <span><strong>預設最大化</strong>：支援默認以最大化狀態打開</span>
          </li>
          <li class="flex items-start">
            <span class="text-purple-500 mr-2">✓</span>
            <span><strong>ESC 關閉</strong>：按 ESC 鍵快速關閉</span>
          </li>
          <li class="flex items-start">
            <span class="text-purple-500 mr-2">✓</span>
            <span><strong>邊界約束</strong>：自動限制在視窗範圍內</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- 互動示例 -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🎨</span>
        互動示例
      </h2>

      <div class="space-y-8">
        <!-- 多視窗口袋示例 -->
        <div class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-8 border-2 border-amber-300">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">多視窗口袋（重點功能）</h3>
          <p class="text-sm text-gray-600 mb-4">
            同時打開多個 Modal，按「—」縮小到右下角口袋。口袋中可逐一還原或關閉。點擊任一視窗會自動提升到最上層。
          </p>

          <div class="flex flex-wrap gap-3">
            <button
              @click="showPocketA = true"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              打開視窗 A（藍色）
            </button>
            <button
              @click="showPocketB = true"
              class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              打開視窗 B（綠色）
            </button>
            <button
              @click="showPocketC = true"
              class="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
            >
              打開視窗 C（紅色）
            </button>
            <button
              @click="showPocketA = true; showPocketB = true; showPocketC = true"
              class="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              全部打開
            </button>
          </div>

          <div class="mt-4 bg-white/80 rounded-lg p-4 border border-amber-200">
            <p class="text-sm text-gray-600">
              <strong>操作步驟：</strong><br>
              1. 點擊上方按鈕打開多個視窗<br>
              2. 點擊不同視窗，觀察 z-index 自動提升到最上層<br>
              3. 在每個視窗的標題欄點擊「—」縮小<br>
              4. 觀察右下角的口袋停靠區<br>
              5. 黎擊口袋中的標籤可以還原或關閉視窗
            </p>
          </div>

          <DraggableModal
            id="demo-pocket-a"
            v-model="showPocketA"
            title="視窗 A - 產品數據"
            :width="450"
            :height="300"
            :backdrop-opacity="0"
            header-bg-color="from-blue-50 to-indigo-50"
          >
            <div class="space-y-3">
              <p class="text-gray-700">這是視窗 A，使用藍色主題。</p>
              <p class="text-sm text-gray-500">點擊標題欄的「—」把我縮進口袋吧！</p>
              <div class="bg-blue-50 rounded-lg p-3">
                <p class="text-blue-800 text-sm font-medium">ID: demo-pocket-a</p>
              </div>
            </div>
          </DraggableModal>

          <DraggableModal
            id="demo-pocket-b"
            v-model="showPocketB"
            title="視窗 B - 報表分析"
            :width="450"
            :height="300"
            :backdrop-opacity="0"
            header-bg-color="from-emerald-50 to-green-50"
          >
            <div class="space-y-3">
              <p class="text-gray-700">這是視窗 B，使用綠色主題。</p>
              <p class="text-sm text-gray-500">我也可以被縮到口袋裡！</p>
              <div class="bg-emerald-50 rounded-lg p-3">
                <p class="text-emerald-800 text-sm font-medium">ID: demo-pocket-b</p>
              </div>
            </div>
          </DraggableModal>

          <DraggableModal
            id="demo-pocket-c"
            v-model="showPocketC"
            title="視窗 C - 異常警報"
            :width="450"
            :height="300"
            :backdrop-opacity="0"
            header-bg-color="from-rose-50 to-pink-50"
          >
            <div class="space-y-3">
              <p class="text-gray-700">這是視窗 C，使用紅色主題。</p>
              <p class="text-sm text-gray-500">三個視窗都可以縮小到同一個口袋中！</p>
              <div class="bg-rose-50 rounded-lg p-3">
                <p class="text-rose-800 text-sm font-medium">ID: demo-pocket-c</p>
              </div>
            </div>
          </DraggableModal>
        </div>

        <!-- 基礎示例 -->
        <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8 border-2 border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">基礎用法</h3>
          
          <button
            @click="showBasicModal = true"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            打開基礎模態框
          </button>

          <DraggableModal
            v-model="showBasicModal"
            title="基礎模態框"
            :width="500"
            :height="300"
          >
            <div class="space-y-4">
              <p class="text-gray-700">這是一個基礎的可拖曳模態框。</p>
              <p class="text-gray-600">你可以：</p>
              <ul class="list-disc list-inside text-gray-600 space-y-1">
                <li>拖動標題欄移動窗口</li>
                <li>拖動右下角調整大小</li>
                <li>點擊最大化按鈕全屏顯示</li>
                <li>點擊「—」縮小到口袋</li>
                <li>按 ESC 鍵關閉</li>
              </ul>
            </div>
            
            <template #footer>
              <div class="flex justify-end gap-2">
                <button
                  @click="showBasicModal = false"
                  class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  關閉
                </button>
              </div>
            </template>
          </DraggableModal>
        </div>

        <!-- 預設最大化 -->
        <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8 border-2 border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">預設最大化</h3>
          
          <button
            @click="showMaximizedModal = true"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            打開最大化模態框
          </button>

          <DraggableModal
            v-model="showMaximizedModal"
            title="預設最大化"
            :default-maximized="true"
            header-bg-color="from-blue-50 to-cyan-50"
          >
            <div class="space-y-4">
              <p class="text-gray-700">此模態框默認以最大化狀態打開。</p>
              <p class="text-gray-600">點擊還原按鈕可以恢復到默認大小。</p>
            </div>
          </DraggableModal>
        </div>

        <!-- 自定義樣式 -->
        <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8 border-2 border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">自定義樣式</h3>
          
          <button
            @click="showCustomModal = true"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            打開自定義模態框
          </button>

          <DraggableModal
            v-model="showCustomModal"
            title="自定義樣式"
            :width="600"
            :height="400"
            header-bg-color="from-green-50 to-emerald-50"
            header-text-color="text-green-800"
            border-class="border-2 border-green-300"
            rounded-class="rounded-2xl"
            shadow-class="shadow-2xl"
            content-padding="p-6"
            footer-bg-color="bg-green-50"
          >
            <div class="space-y-4">
              <p class="text-gray-700">這個模態框使用了自定義樣式配置。</p>
              <div class="bg-green-50 p-4 rounded-lg">
                <p class="text-green-800 font-medium">樣式配置：</p>
                <ul class="list-disc list-inside text-green-700 text-sm mt-2 space-y-1">
                  <li>綠色主題標題欄</li>
                  <li>2px 綠色邊框</li>
                  <li>更大的圓角</li>
                  <li>增強的陰影</li>
                </ul>
              </div>
            </div>
            
            <template #footer>
              <div class="flex justify-end gap-2">
                <button
                  @click="showCustomModal = false"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  確定
                </button>
              </div>
            </template>
          </DraggableModal>
        </div>
      </div>
    </section>

    <!-- 使用方式 -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">📝</span>
        使用方式
      </h2>

      <div class="space-y-6">
        <!-- Step 1 -->
        <div class="bg-gray-50 rounded-lg p-5 border border-gray-200">
          <h3 class="font-semibold text-gray-900 mb-3">1. 在根佈局放置 ModalDock（只需一次）</h3>
          <pre class="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto"><code>&lt;!-- App.vue 或主佈局中 --&gt;
&lt;template&gt;
  &lt;router-view /&gt;
  &lt;ModalDock /&gt;
&lt;/template&gt;

&lt;script setup&gt;
import ModalDock from '@/components/common/ModalDock.vue'
&lt;/script&gt;</code></pre>
        </div>

        <!-- Step 2 -->
        <div class="bg-gray-50 rounded-lg p-5 border border-gray-200">
          <h3 class="font-semibold text-gray-900 mb-3">2. 使用多個 DraggableModal（用 id 區分）</h3>
          <pre class="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto"><code>&lt;DraggableModal
  id="detail-window"
  v-model="showDetail"
  title="詳細資料"
  :backdrop-opacity="0"
&gt;
  &lt;p&gt;視窗內容...&lt;/p&gt;
&lt;/DraggableModal&gt;

&lt;DraggableModal
  id="chart-window"
  v-model="showChart"
  title="圖表分析"
  :backdrop-opacity="0"
  header-bg-color="from-green-50 to-emerald-50"
&gt;
  &lt;p&gt;另一個視窗...&lt;/p&gt;
&lt;/DraggableModal&gt;</code></pre>
        </div>

        <!-- 提示 -->
        <div class="bg-amber-50 rounded-lg p-5 border border-amber-200">
          <h3 class="font-semibold text-amber-800 mb-2">💡 提示</h3>
          <ul class="text-sm text-amber-700 space-y-1.5">
            <li>• 多視窗同時存在時，建議將 <code class="bg-amber-100 px-1 rounded">backdrop-opacity</code> 設為 <code class="bg-amber-100 px-1 rounded">0</code>，避免多層遮罩重疊</li>
            <li>• <code class="bg-amber-100 px-1 rounded">id</code> 可不傳，組件會自動產生；但傳入固定值有利於辨識</li>
            <li>• <code class="bg-amber-100 px-1 rounded">ModalDock</code> 只需要在整個 App 中放置一次，所有 Modal 會自動註冊</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- DraggableModal Props API -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">⚙️</span>
        DraggableModal Props
      </h2>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b-2 border-gray-200">
              <th class="px-4 py-3 text-left font-semibold text-gray-900">屬性名稱</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">類型</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">默認值</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">說明</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr class="hover:bg-amber-50 bg-amber-50/40">
              <td class="px-4 py-3 font-mono text-purple-600">id</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">自動產生</td>
              <td class="px-4 py-3 text-gray-700">視窗唯一 ID，用於口袋管理中識別不同視窗 <span class="text-amber-600 font-semibold">NEW</span></td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">modelValue</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">Boolean</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">false</td>
              <td class="px-4 py-3 text-gray-700">控制模態框顯示/隱藏（v-model）</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">title</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">'Modal'</td>
              <td class="px-4 py-3 text-gray-700">模態框標題（也會顯示在口袋標籤上）</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">width</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">String | Number</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">600</td>
              <td class="px-4 py-3 text-gray-700">初始寬度（像素）</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">height</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">String | Number</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">400</td>
              <td class="px-4 py-3 text-gray-700">初始高度（像素）</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">minWidth</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">Number</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">300</td>
              <td class="px-4 py-3 text-gray-700">最小寬度（像素）</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">minHeight</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">Number</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">200</td>
              <td class="px-4 py-3 text-gray-700">最小高度（像素）</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">draggable</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">Boolean</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">true</td>
              <td class="px-4 py-3 text-gray-700">是否可拖曳</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">resizable</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">Boolean</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">true</td>
              <td class="px-4 py-3 text-gray-700">是否可調整大小</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">closable</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">Boolean</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">true</td>
              <td class="px-4 py-3 text-gray-700">是否顯示關閉按鈕</td>
            </tr>
            <tr class="hover:bg-amber-50 bg-amber-50/40">
              <td class="px-4 py-3 font-mono text-purple-600">minimizable</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">Boolean</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">true</td>
              <td class="px-4 py-3 text-gray-700">是否顯示「縮小到口袋」按鈕 <span class="text-amber-600 font-semibold">NEW</span></td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">maximizable</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">Boolean</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">true</td>
              <td class="px-4 py-3 text-gray-700">是否顯示最大化按鈕</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">defaultMaximized</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">Boolean</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">false</td>
              <td class="px-4 py-3 text-gray-700">默認是否最大化</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">zIndex</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">Number</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">自動管理</td>
              <td class="px-4 py-3 text-gray-700">已由 useModalManager 自動管理，點擊視窗自動提升到最上層 <span class="text-amber-600 font-semibold">AUTO</span></td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">backdropOpacity</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">Number</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">0.5</td>
              <td class="px-4 py-3 text-gray-700">背景遮罩透明度 (0-1)，多視窗建議設 0</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">headerBgColor</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">'from-blue-50 to-indigo-50'</td>
              <td class="px-4 py-3 text-gray-700">標題欄背景漸變類（也用於口袋指示條）</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">headerTextColor</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">'text-gray-800'</td>
              <td class="px-4 py-3 text-gray-700">標題文字顏色類</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">borderClass</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">'border border-gray-300'</td>
              <td class="px-4 py-3 text-gray-700">邊框樣式類</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">roundedClass</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">'rounded-lg'</td>
              <td class="px-4 py-3 text-gray-700">圓角樣式類</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">shadowClass</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">'shadow-2xl'</td>
              <td class="px-4 py-3 text-gray-700">陰影樣式類</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">contentPadding</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">'p-4'</td>
              <td class="px-4 py-3 text-gray-700">內容區 padding 類</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">footerBgColor</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">'bg-gray-50'</td>
              <td class="px-4 py-3 text-gray-700">底部背景顏色類</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Events -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">📡</span>
        DraggableModal Events
      </h2>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b-2 border-gray-200">
              <th class="px-4 py-3 text-left font-semibold text-gray-900">事件名稱</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">參數</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">說明</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">update:modelValue</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">boolean</td>
              <td class="px-4 py-3 text-gray-700">模態框顯示狀態改變時觸發</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">open</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">-</td>
              <td class="px-4 py-3 text-gray-700">打開模態框時觸發</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">close</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">-</td>
              <td class="px-4 py-3 text-gray-700">關閉模態框時觸發（含從口袋關閉）</td>
            </tr>
            <tr class="hover:bg-amber-50 bg-amber-50/40">
              <td class="px-4 py-3 font-mono text-purple-600">minimize</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">boolean</td>
              <td class="px-4 py-3 text-gray-700">縮小/還原時觸發，true=縮小 false=還原 <span class="text-amber-600 font-semibold">NEW</span></td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">maximize</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">-</td>
              <td class="px-4 py-3 text-gray-700">最大化時觸發</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">restore</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">-</td>
              <td class="px-4 py-3 text-gray-700">從最大化還原時觸發</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Slots -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🎰</span>
        Slots
      </h2>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b-2 border-gray-200">
              <th class="px-4 py-3 text-left font-semibold text-gray-900">插槽名稱</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">說明</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">default</td>
              <td class="px-4 py-3 text-gray-700">模態框主要內容區域</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">title</td>
              <td class="px-4 py-3 text-gray-700">自定義標題內容（優先級高於 title prop）</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">footer</td>
              <td class="px-4 py-3 text-gray-700">底部按鈕區域</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Expose Methods -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🔧</span>
        暴露方法 / 屬性（defineExpose）
      </h2>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b-2 border-gray-200">
              <th class="px-4 py-3 text-left font-semibold text-gray-900">名稱</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">參數</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">說明</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr class="hover:bg-amber-50 bg-amber-50/40">
              <td class="px-4 py-3 font-mono text-purple-600">modalId</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">string（唯讀）</td>
              <td class="px-4 py-3 text-gray-700">該 Modal 實例的 ID <span class="text-amber-600 font-semibold">NEW</span></td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">open()</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">-</td>
              <td class="px-4 py-3 text-gray-700">打開模態框</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">close()</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">-</td>
              <td class="px-4 py-3 text-gray-700">關閉模態框（同時從口袋移除）</td>
            </tr>
            <tr class="hover:bg-amber-50 bg-amber-50/40">
              <td class="px-4 py-3 font-mono text-purple-600">minimize()</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">-</td>
              <td class="px-4 py-3 text-gray-700">縮小到口袋 <span class="text-amber-600 font-semibold">NEW</span></td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">maximize()</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">-</td>
              <td class="px-4 py-3 text-gray-700">最大化窗口</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">restore()</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">-</td>
              <td class="px-4 py-3 text-gray-700">還原窗口（從最大化或口袋還原）</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">setPosition(x, y)</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">x: number, y: number</td>
              <td class="px-4 py-3 text-gray-700">設置窗口位置</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">setSize(w, h)</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">w: number, h: number</td>
              <td class="px-4 py-3 text-gray-700">設置窗口大小</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">center()</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">-</td>
              <td class="px-4 py-3 text-gray-700">將窗口居中</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ModalDock API -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">📥</span>
        ModalDock 組件
      </h2>

      <div class="prose prose-blue max-w-none mb-6">
        <p class="text-gray-700 leading-relaxed">
          <code class="px-2 py-1 bg-gray-100 text-purple-600 rounded">ModalDock</code> 
          是配合 DraggableModal 使用的口袋停靠組件，固定顯示在畫面右下角。當有 Modal 被縮小時，自動出現帶有數量徽章的口袋按鈕。
        </p>
      </div>

      <h3 class="font-semibold text-gray-900 mb-3">Props</h3>
      <div class="overflow-x-auto mb-6">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b-2 border-gray-200">
              <th class="px-4 py-3 text-left font-semibold text-gray-900">屬性名稱</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">類型</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">默認值</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">說明</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">zIndex</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">Number</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">9999</td>
              <td class="px-4 py-3 text-gray-700">停靠區的 z-index，應高於所有 Modal</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 class="font-semibold text-gray-900 mb-3">功能說明</h3>
      <ul class="space-y-2 text-gray-700 text-sm">
        <li class="flex items-start">
          <span class="text-purple-500 mr-2">•</span>
          <span>自動監聽所有 DraggableModal 的縮小/還原/關閉狀態</span>
        </li>
        <li class="flex items-start">
          <span class="text-purple-500 mr-2">•</span>
          <span>顯示縮小視窗數量的藍色徽章</span>
        </li>
        <li class="flex items-start">
          <span class="text-purple-500 mr-2">•</span>
          <span>每個標籤顯示視窗標題和主題色指示條</span>
        </li>
        <li class="flex items-start">
          <span class="text-purple-500 mr-2">•</span>
          <span>標籤上有還原（□）和關閉（✕）按鈕</span>
        </li>
        <li class="flex items-start">
          <span class="text-purple-500 mr-2">•</span>
          <span>口袋可展開/收合，帶有平滑動畫</span>
        </li>
        <li class="flex items-start">
          <span class="text-purple-500 mr-2">•</span>
          <span>沒有縮小視窗時自動隱藏</span>
        </li>
      </ul>
    </section>

    <!-- useModalManager API -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🔗</span>
        useModalManager Composable
      </h2>

      <div class="prose prose-blue max-w-none mb-6">
        <p class="text-gray-700 leading-relaxed">
          全域共享的 composable，管理所有被縮小 Modal 的狀態。DraggableModal 和 ModalDock 內部已自動整合，通常不需要手動使用。但如果需要在程式中控制，可以直接引入。
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b-2 border-gray-200">
              <th class="px-4 py-3 text-left font-semibold text-gray-900">API</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">類型</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">說明</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">minimizedList</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">ComputedRef&lt;MinimizedModalInfo[]&gt;</td>
              <td class="px-4 py-3 text-gray-700">所有縮小中 Modal 的響應式列表</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">minimizedCount</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">ComputedRef&lt;number&gt;</td>
              <td class="px-4 py-3 text-gray-700">縮小中 Modal 的數量</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">restoreModal(id)</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">(id: string) =&gt; void</td>
              <td class="px-4 py-3 text-gray-700">依 ID 還原指定 Modal</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">closeModal(id)</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">(id: string) =&gt; void</td>
              <td class="px-4 py-3 text-gray-700">依 ID 關閉指定 Modal</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">restoreAll()</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">() =&gt; void</td>
              <td class="px-4 py-3 text-gray-700">還原所有縮小中的 Modal</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">closeAll()</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">() =&gt; void</td>
              <td class="px-4 py-3 text-gray-700">關閉所有縮小中的 Modal</td>
            </tr>
            <tr class="hover:bg-amber-50 bg-amber-50/40">
              <td class="px-4 py-3 font-mono text-purple-600">getZIndex(id)</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">(id: string) =&gt; number</td>
              <td class="px-4 py-3 text-gray-700">取得指定 Modal 的當前 z-index <span class="text-amber-600 font-semibold">NEW</span></td>
            </tr>
            <tr class="hover:bg-amber-50 bg-amber-50/40">
              <td class="px-4 py-3 font-mono text-purple-600">bringToFront(id)</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">(id: string) =&gt; void</td>
              <td class="px-4 py-3 text-gray-700">將指定 Modal 提升到最上層 <span class="text-amber-600 font-semibold">NEW</span></td>
            </tr>
            <tr class="hover:bg-amber-50 bg-amber-50/40">
              <td class="px-4 py-3 font-mono text-purple-600">registerZIndex(id)</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">(id: string) =&gt; void</td>
              <td class="px-4 py-3 text-gray-700">註冊 Modal 的 z-index（內部自動呼叫） <span class="text-amber-600 font-semibold">NEW</span></td>
            </tr>
            <tr class="hover:bg-amber-50 bg-amber-50/40">
              <td class="px-4 py-3 font-mono text-purple-600">unregisterZIndex(id)</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">(id: string) =&gt; void</td>
              <td class="px-4 py-3 text-gray-700">移除 Modal 的 z-index 註冊（內部自動呼叫） <span class="text-amber-600 font-semibold">NEW</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-6 bg-gray-50 rounded-lg p-5 border border-gray-200">
        <h3 class="font-semibold text-gray-900 mb-3">進階用法示例</h3>
        <pre class="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto"><code>import { useModalManager } from '@/composables/useModalManager'

const { minimizedCount, restoreAll, closeAll } = useModalManager()

// 在某個按鈕中批次操作
function handleRestoreAll() {
  restoreAll() // 還原所有縮小的視窗
}

function handleCloseAll() {
  closeAll() // 關閉所有縮小的視窗
}</code></pre>
      </div>
    </section>

    <!-- 相關組件 -->
    <section class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-md p-8 border-2 border-purple-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🔗</span>
        相關組件
      </h2>

      <div class="grid md:grid-cols-2 gap-4">
        <router-link
          to="/docs/components/filter-dropdown"
          class="group p-4 bg-white rounded-lg border border-gray-200 hover:border-teal-400 hover:shadow-lg transition-all cursor-pointer"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">🔽</span>
            <div>
              <h3 class="font-semibold text-gray-900 group-hover:text-teal-600">FilterDropdown</h3>
              <p class="text-sm text-gray-600">多選下拉過濾器</p>
            </div>
          </div>
        </router-link>

        <router-link
          to="/docs/components/filter-bar"
          class="group p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-400 hover:shadow-lg transition-all cursor-pointer"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">🎛️</span>
            <div>
              <h3 class="font-semibold text-gray-900 group-hover:text-purple-600">FilterBar</h3>
              <p class="text-sm text-gray-600">過濾器列組件</p>
            </div>
          </div>
        </router-link>
      </div>
    </section>

    <!-- ModalDock 停靠區（本頁示例用）-->
    <ModalDock />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import DraggableModal from '@/components/common/DraggableModal.vue'
import ModalDock from '@/components/common/ModalDock.vue'

const showBasicModal = ref(false)
const showMaximizedModal = ref(false)
const showCustomModal = ref(false)

// 多視窗口袋示例
const showPocketA = ref(false)
const showPocketB = ref(false)
const showPocketC = ref(false)
</script>

<style scoped>
/* 程式碼區塊樣式 */
pre {
  scrollbar-width: thin;
  scrollbar-color: #4b5563 #1f2937;
}

pre::-webkit-scrollbar {
  height: 6px;
}

pre::-webkit-scrollbar-track {
  background: #1f2937;
}

pre::-webkit-scrollbar-thumb {
  background: #4b5563;
  border-radius: 3px;
}

pre::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

/* Details 元素樣式 */
details summary::-webkit-details-marker {
  display: none;
}
</style>
