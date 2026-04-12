<template>
  <div class="w-full px-8 py-12">
    <!-- 頁面標題 -->
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
          <span class="text-3xl">🪟</span>
        </div>
        <div>
          <h1 class="text-4xl font-bold text-gray-900">DraggableModal</h1>
          <p class="text-lg text-gray-600 mt-1">可拖曳調整的模態框組件</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mt-6">
        <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">✓ 完成</span>
        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Vue 3</span>
        <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">Composition API</span>
        <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">Tailwind CSS</span>
      </div>
    </div>

    <!-- 組件描述 -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
        <span class="mr-3">📖</span>
        組件簡介
      </h2>
      <div class="prose prose-blue max-w-none">
        <p class="text-gray-700 leading-relaxed mb-4">
          <code class="px-2 py-1 bg-gray-100 text-purple-600 rounded">DraggableModal</code> 
          是一個功能強大的模態框組件，支援拖曳、調整大小、最大化/最小化等豐富功能。使用 Teleport 技術確保正確的層級關係，適合需要靈活交互的彈窗場景。
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
            <span class="text-purple-500 mr-2">✓</span>
            <span><strong>Teleport 掛載</strong>：渲染到 body 確保層級正確</span>
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

    <!-- Props API -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">⚙️</span>
        Props API
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
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">modelValue</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">Boolean</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">false</td>
              <td class="px-4 py-3 text-gray-700">控制模態框顯示/隱藏</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">title</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">'Modal'</td>
              <td class="px-4 py-3 text-gray-700">模態框標題</td>
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
              <td class="px-4 py-3 font-mono text-xs text-gray-600">30</td>
              <td class="px-4 py-3 text-gray-700">層級 z-index</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">backdropOpacity</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">Number</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">0.5</td>
              <td class="px-4 py-3 text-gray-700">背景遮罩透明度 (0-1)</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">headerBgColor</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">String</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">'from-blue-50...'</td>
              <td class="px-4 py-3 text-gray-700">標題欄背景漸變類</td>
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
              <td class="px-4 py-3 font-mono text-xs text-gray-600">'border...'</td>
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
        Events
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
              <td class="px-4 py-3 font-mono text-xs text-gray-600">Boolean</td>
              <td class="px-4 py-3 text-gray-700">模態框顯示狀態改變時觸發</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">close</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">-</td>
              <td class="px-4 py-3 text-gray-700">關閉模態框時觸發</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">open</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">-</td>
              <td class="px-4 py-3 text-gray-700">打開模態框時觸發</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">maximize</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">-</td>
              <td class="px-4 py-3 text-gray-700">最大化時觸發</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">restore</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">-</td>
              <td class="px-4 py-3 text-gray-700">還原窗口時觸發</td>
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
        暴露方法
      </h2>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b-2 border-gray-200">
              <th class="px-4 py-3 text-left font-semibold text-gray-900">方法名稱</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">參數</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-900">說明</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">open()</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">-</td>
              <td class="px-4 py-3 text-gray-700">打開模態框</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">close()</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">-</td>
              <td class="px-4 py-3 text-gray-700">關閉模態框</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">maximize()</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">-</td>
              <td class="px-4 py-3 text-gray-700">最大化窗口</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">restore()</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">-</td>
              <td class="px-4 py-3 text-gray-700">還原窗口大小</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">setPosition(x, y)</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">x: Number, y: Number</td>
              <td class="px-4 py-3 text-gray-700">設置窗口位置</td>
            </tr>
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-purple-600">setSize(w, h)</td>
              <td class="px-4 py-3 font-mono text-xs text-gray-600">w: Number, h: Number</td>
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
  </div>
</template>

<script setup>
import { ref } from 'vue';
import DraggableModal from '@/components/common/DraggableModal.vue';

const showBasicModal = ref(false);
const showMaximizedModal = ref(false);
const showCustomModal = ref(false);
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
