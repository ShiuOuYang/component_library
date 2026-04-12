<template>
  <div class="d3-learning-index p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
    <!-- Header -->
    <div class="max-w-7xl mx-auto">
      <div class="bg-white rounded-xl shadow-lg p-8 mb-8">
        <h1 class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          D3.js 企業級學習路線圖
        </h1>
        <p class="text-gray-600 text-lg">
          從基礎原理到企業實戰應用的 10 週高強度學習計畫
        </p>
      </div>

      <!-- Learning Path -->
      <div class="space-y-6">
        <!-- Phase 1: Foundations (Week 1-2) -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
          <div class="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-2xl font-bold mb-2">🚀 階段一：基石與原理</h2>
                <p class="text-green-100">第 1-2 週 | 不依賴 D3，深刻理解網頁如何繪圖</p>
              </div>
              <div class="text-right">
                <div class="text-3xl font-bold">{{ phase1Progress }}%</div>
                <div class="text-sm text-green-100">完成度</div>
              </div>
            </div>
          </div>
          
          <div class="p-6">
            <div class="mb-6">
              <h3 class="font-bold text-lg text-gray-800 mb-3">核心主題：</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div class="font-semibold text-green-800 mb-2">📐 SVG 深度解析</div>
                  <ul class="text-sm text-gray-600 space-y-1">
                    <li>• 基本形狀與屬性</li>
                    <li>• Path 路徑指令</li>
                    <li>• 群組與文字元素</li>
                  </ul>
                </div>
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div class="font-semibold text-blue-800 mb-2">🎯 DOM 座標系</div>
                  <ul class="text-sm text-gray-600 space-y-1">
                    <li>• SVG 座標系統</li>
                    <li>• Transform 變換</li>
                    <li>• Margin Convention</li>
                  </ul>
                </div>
                <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div class="font-semibold text-purple-800 mb-2">⚡ ES6+ JavaScript</div>
                  <ul class="text-sm text-gray-600 space-y-1">
                    <li>• Array methods</li>
                    <li>• DOM 操作</li>
                    <li>• 資料處理</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="mb-6">
              <h3 class="font-bold text-lg text-gray-800 mb-3">實作練習：</h3>
              <div class="space-y-3">
                <router-link 
                  to="/d3-learning/week1"
                  class="block bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-4 rounded-lg hover:shadow-md transition"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="font-semibold text-gray-800 mb-1">✅ Week 1-2 練習模組</div>
                      <div class="text-sm text-gray-600">SVG 基礎、座標系統、手寫長條圖、Vanilla JS 操作</div>
                    </div>
                    <span class="text-green-600 font-bold">已完成</span>
                  </div>
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <!-- Phase 2: D3 Core (Week 3-4) -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
          <div class="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 text-white">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-2xl font-bold mb-2">🛠️ 階段二：D3 核心邏輯</h2>
                <p class="text-blue-100">第 3-4 週 | 掌握「將資料綁定到 DOM」的獨特思維</p>
              </div>
              <div class="text-right">
                <div class="text-sm text-blue-100">50% 完成</div>
              </div>
            </div>
          </div>
          
          <div class="p-6">
            <div class="mb-4">
              <h3 class="font-bold text-lg text-gray-800 mb-3">核心主題：</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div class="font-semibold text-blue-800 mb-2">🔍 Selections & Data Binding</div>
                  <ul class="text-sm text-gray-600 space-y-1">
                    <li>• d3.select & selectAll</li>
                    <li>• Enter, Update, Exit 模式</li>
                    <li>• join() 語法</li>
                  </ul>
                </div>
                <div class="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                  <div class="font-semibold text-cyan-800 mb-2">📊 Scales & Axes</div>
                  <ul class="text-sm text-gray-600 space-y-1">
                    <li>• scaleLinear, scaleBand</li>
                    <li>• scaleTime, scaleOrdinal</li>
                    <li>• 自動生成座標軸</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="mb-6">
              <h3 class="font-bold text-lg text-gray-800 mb-3">實作練習：</h3>
              <div class="space-y-3">
                <router-link 
                  to="/d3-learning/week3-4"
                  class="block bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 p-4 rounded-lg hover:shadow-md transition"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="font-semibold text-gray-800 mb-1">🚀 Week 3-4 練習模組</div>
                      <div class="text-sm text-gray-600">Selections、Data Binding、Scales、Axes 互動教學</div>
                    </div>
                    <span class="text-blue-600 font-bold">立即學習 →</span>
                  </div>
                </router-link>
              </div>
            </div>

            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <div class="font-semibold text-yellow-800 mb-2">🎯 實作目標：</div>
              <p class="text-sm text-gray-700">製作動態長條圖，點擊按鈕更新資料，舊柱子消失、新柱子生長（使用 join 語法）</p>
            </div>
          </div>
        </div>

        <!-- Phase 3: Framework Integration (Week 5-6) -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
          <div class="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-2xl font-bold mb-2">⚛️ 階段三：現代框架整合</h2>
                <p class="text-purple-100">第 5-6 週 | 企業級關鍵 - 在 React/Vue 中優雅使用 D3</p>
              </div>
              <div class="text-right">
                <span class="px-3 py-1 bg-white/20 rounded-full text-sm">企業級</span>
              </div>
            </div>
          </div>
          
          <div class="p-6">
            <div class="mb-4">
              <h3 class="font-bold text-lg text-gray-800 mb-3">核心主題：</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div class="font-semibold text-purple-800 mb-2">🎨 權責分離</div>
                  <ul class="text-sm text-gray-600 space-y-1">
                    <li>• 三種整合模式對比</li>
                    <li>• D3 負責計算，Vue 負責渲染</li>
                    <li>• watchEffect 響應式更新</li>
                  </ul>
                </div>
                <div class="bg-pink-50 border border-pink-200 rounded-lg p-4">
                  <div class="font-semibold text-pink-800 mb-2">♻️ 可重用元件</div>
                  <ul class="text-sm text-gray-600 space-y-1">
                    <li>• Props 設計模式</li>
                    <li>• 插槽（Slots）自訂</li>
                    <li>• 事件發射與互動</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="mb-6">
              <h3 class="font-bold text-lg text-gray-800 mb-3">實作練習：</h3>
              <div class="space-y-3">
                <router-link 
                  to="/d3-learning/week5-6"
                  class="block bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-500 p-4 rounded-lg hover:shadow-md transition"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="font-semibold text-gray-800 mb-1">🚀 Week 5-6 練習模組</div>
                      <div class="text-sm text-gray-600">Vue + D3 整合、可重用元件封裝、響應式設計</div>
                    </div>
                    <span class="text-purple-600 font-bold">立即學習 →</span>
                  </div>
                </router-link>
              </div>
            </div>

            <div class="bg-purple-50 border-l-4 border-purple-400 p-4 rounded">
              <div class="font-semibold text-purple-800 mb-2">🎯 實作目標：</div>
              <p class="text-sm text-gray-700">封裝可重用的 BarChart 和 LineChart 元件，支援自訂配色、Tooltip、RWD</p>
            </div>
          </div>
        </div>

        <!-- Phase 4: Advanced Visualizations (Week 7-8) -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden opacity-50">
          <div class="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-2xl font-bold mb-2">🎨 階段四：進階視覺化與互動</h2>
                <p class="text-orange-100">第 7-8 週 | 複雜圖表與使用者體驗優化</p>
              </div>
            </div>
          </div>
          
          <div class="p-6">
            <div class="text-sm text-gray-600">
              Line chart、Area chart、Pie chart、Tree layouts、Tooltips、Brushing、Zooming、Animation...
            </div>
          </div>
        </div>

        <!-- Phase 5: Enterprise Optimization (Week 9-10) -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden opacity-40">
          <div class="bg-gradient-to-r from-slate-700 to-gray-900 p-6 text-white">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-2xl font-bold mb-2">🏆 階段五：企業級優化</h2>
                <p class="text-slate-300">第 9-10 週 | 效能、RWD、無障礙設計</p>
              </div>
            </div>
          </div>
          
          <div class="p-6">
            <div class="text-sm text-gray-600">
              Responsive Design、Performance (Canvas)、Accessibility、TypeScript、Capstone Project...
            </div>
          </div>
        </div>
      </div>

      <!-- Resources -->
      <div class="mt-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-lg p-8 text-white">
        <h2 class="text-2xl font-bold mb-4">💡 學習資源推薦</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="font-semibold mb-3">官方與權威範例：</h3>
            <ul class="space-y-2 text-sm">
              <li>
                <a href="https://observablehq.com" target="_blank" class="hover:underline flex items-center gap-2">
                  <span>🔗</span>
                  <span>Observable - D3 作者 Mike Bostock 的主場</span>
                </a>
              </li>
              <li>
                <a href="https://d3-graph-gallery.com" target="_blank" class="hover:underline flex items-center gap-2">
                  <span>🔗</span>
                  <span>D3 Graph Gallery - 快速查找特定圖表</span>
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 class="font-semibold mb-3">推薦書籍：</h3>
            <ul class="space-y-2 text-sm">
              <li>📚 Interactive Data Visualization for the Web (Scott Murray)</li>
            </ul>
            <h3 class="font-semibold mt-4 mb-3">企業級開發 Tips：</h3>
            <ul class="space-y-2 text-sm">
              <li>✅ D3 更像是「計算庫」而非「DOM 操作庫」</li>
              <li>✅ 模組化引入，減少 Bundle Size (Tree-shaking)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

// 計算階段一完成度（基於已完成的模組）
const phase1Progress = computed(() => {
  // Week 1-2 的四個模組都已完成
  return 100;
});
</script>

<style scoped>
/* 添加一些平滑過渡效果 */
.router-link-active {
  transform: scale(1.02);
}
</style>
