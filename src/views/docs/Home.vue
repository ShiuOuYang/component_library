<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
    <!-- Hero Section -->
    <section class="py-20 px-8">
      <div class="max-w-5xl mx-auto text-center">
        <div class="inline-flex items-center justify-center w-20 h-20 mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
          <span class="text-4xl text-white">📊</span>
        </div>
        
        <h1 class="text-5xl font-extrabold text-gray-900 mb-6">
          D3.js 組件庫文檔
        </h1>
        
        <p class="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
          基於 <span class="font-semibold text-blue-600">Vue 3</span> 和 
          <span class="font-semibold text-purple-600">D3.js</span> 打造的企業級數據視覺化組件庫。
          提供可重用、高性能的圖表組件，讓你快速構建美觀的數據儀表板。
        </p>

        <div class="flex flex-wrap justify-center gap-4 mb-12">
          <router-link
            to="/docs/components/dual-axis-chart"
            class="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
          >
            🚀 開始探索
          </router-link>
          
          <router-link
            to="/docs/guide/getting-started"
            class="px-8 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg shadow-md border-2 border-gray-200 transition-all duration-200"
          >
            📖 查看指南
          </router-link>
        </div>

        <!-- 技術棧標籤 -->
        <div class="flex flex-wrap justify-center gap-3">
          <span class="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            Vue 3 Composition API
          </span>
          <span class="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            D3.js v7
          </span>
          <span class="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
            TypeScript Ready
          </span>
          <span class="px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
            Tailwind CSS
          </span>
        </div>
      </div>
    </section>

<!-- 特性展示 -->
    <section class="py-16 px-4 bg-white">
      <div class="w-full">
        <h2 class="text-3xl font-bold text-gray-900 text-center mb-12">
          核心特性
        </h2>

        <div class="grid md:grid-cols-3 gap-8">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
            :class="feature.bg"
          >
            <div class="w-12 h-12 rounded-lg flex items-center justify-center mb-4" :class="feature.iconBg">
              <span class="text-2xl">{{ feature.icon }}</span>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-3">{{ feature.title }}</h3>
            <p class="text-gray-700">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 快速開始 -->
    <section class="py-16 px-8">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-3xl font-bold text-gray-900 text-center mb-12">
          快速開始
        </h2>

        <div class="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <span class="mr-2">1️⃣</span>
              引入組件
            </h3>
            <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-green-400 text-sm font-mono"><code>import DualAxisComboChart from '@/components/common/DualAxisComboChart.vue';</code></pre>
            </div>
          </div>

          <div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <span class="mr-2">2️⃣</span>
              準備數據
            </h3>
            <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-green-400 text-sm font-mono"><code>const layers = [
  {
    type: 'stacked-bar',
    data: yourData,
    yAxis: 'left',
    stackKeys: ['series1', 'series2'],
    xValue: d => d.category,
    colorScale: d3.scaleOrdinal(d3.schemeCategory10)
  }
];</code></pre>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <span class="mr-2">3️⃣</span>
              使用組件
            </h3>
            <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-green-400 text-sm font-mono"><code>&lt;DualAxisComboChart
  :layers="layers"
  :width="800"
  :height="500"
  title="我的圖表"
/&gt;</code></pre>
            </div>
          </div>
        </div>
      </div>
    </section>

<section class="py-16 px-4 bg-gray-50">
      <div class="w-full">
        <h2 class="text-3xl font-bold text-gray-900 text-center mb-12">
          可用組件
        </h2>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <router-link
            v-for="comp in components"
            :key="comp.to"
            :to="comp.to"
            class="block p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-200 border-2 border-transparent group"
            :class="comp.hoverBorder"
          >
            <div class="flex items-start justify-between mb-3">
              <span class="text-4xl">{{ comp.icon }}</span>
              <span class="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
                {{ comp.badge }}
              </span>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2 group-hover:transition-colors" :class="comp.hoverText">
              {{ comp.title }}
            </h3>
            <p class="text-sm text-gray-600">
              {{ comp.description }}
            </p>
          </router-link>

          <!-- 更多組件 -->
          <div class="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-md border-2 border-blue-200">
            <div class="flex items-start justify-between mb-3">
              <span class="text-4xl">✨</span>
              <span class="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                持續新增
              </span>
            </div>
            <h3 class="text-lg font-bold text-blue-900 mb-2">
              更多組件
            </h3>
            <p class="text-sm text-blue-700">
              我們正在持續開發更多實用的圖表組件...
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- 底部 CTA -->
    <section class="py-16 px-8 bg-gradient-to-r from-blue-600 to-purple-600">
      <div class="max-w-4xl mx-auto text-center">
        <h2 class="text-3xl font-bold text-white mb-6">
          準備好開始了嗎？
        </h2>
        <p class="text-xl text-blue-100 mb-8">
          探索我們的組件文檔，開始構建你的數據視覺化專案
        </p>
        <router-link
          to="/docs/components/dual-axis-chart"
          class="inline-block px-8 py-4 bg-white hover:bg-gray-100 text-blue-600 font-bold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          查看組件文檔 →
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
// 純展示頁面，無需額外邏輯
// 可用組件卡片資料（資料驅動，統一維護）
// 核心特性資料（資料驅動，統一維護）
const features = [
  { icon: '⚡', title: '高性能', description: '使用 D3.js 的 enter-update-exit 模式，支援大數據集的高效渲染與平滑動畫過渡。', bg: 'bg-gradient-to-br from-blue-50 to-blue-100', iconBg: 'bg-blue-500' },
  { icon: '🎨', title: '高度可定制', description: '豐富的 Props 配置與 Slot 擴展點，支援自定義顏色、樣式、Tooltip 等各種視覺元素。', bg: 'bg-gradient-to-br from-green-50 to-green-100', iconBg: 'bg-green-500' },
  { icon: '🔄', title: '響應式更新', description: '深度整合 Vue 3 的響應式系統，數據變化時自動重新渲染，無需手動管理 DOM。', bg: 'bg-gradient-to-br from-purple-50 to-purple-100', iconBg: 'bg-purple-500' },
  { icon: '🎯', title: '互動體驗', description: '內建 Brush 縮放、Tooltip、點擊/懸停事件，提供豐富的用戶互動能力。', bg: 'bg-gradient-to-br from-orange-50 to-orange-100', iconBg: 'bg-orange-500' },
  { icon: '📦', title: '開箱即用', description: '零配置引入，預設合理的樣式與行為，同時保留完整的自定義能力。', bg: 'bg-gradient-to-br from-pink-50 to-pink-100', iconBg: 'bg-pink-500' },
  { icon: '📚', title: '完整文檔', description: '詳盡的 API 文檔、互動範例與最佳實踐指南，幫助你快速上手。', bg: 'bg-gradient-to-br from-indigo-50 to-indigo-100', iconBg: 'bg-indigo-500' },
];
const components = [
  { to: '/docs/components/dual-axis-chart', icon: '📊', title: '雙軸組合圖', description: '支援堆疊長條圖與折線圖混合，內建 Brush 縮放功能', badge: '完成', hoverBorder: 'hover:border-blue-500', hoverText: 'group-hover:text-blue-600' },
  { to: '/docs/components/pareto', icon: '📈', title: '企業級柏拉圖', description: '長條圖 + 累積百分比折線，支援自訂參考線、雙 Y 軸', badge: '完成', hoverBorder: 'hover:border-green-500', hoverText: 'group-hover:text-green-600' },
  { to: '/docs/components/heatmap', icon: '🔥', title: '企業級熱力圖', description: '支援自訂色階、Brush 縮放、多種高亮模式', badge: '完成', hoverBorder: 'hover:border-orange-500', hoverText: 'group-hover:text-orange-600' },
  { to: '/docs/components/tooltip', icon: '💬', title: 'Tooltip 提示框', description: '智能邊界檢測、多種主題、自動/手動定位', badge: '完成', hoverBorder: 'hover:border-indigo-500', hoverText: 'group-hover:text-indigo-600' },
  { to: '/docs/components/common-table', icon: '📋', title: 'CommonTable 表格', description: '搜尋、排序、分頁，自動排序類型檢測', badge: '完成', hoverBorder: 'hover:border-purple-500', hoverText: 'group-hover:text-purple-600' },
  { to: '/docs/components/filter-dropdown', icon: '🔽', title: 'FilterDropdown 過濾器', description: '多選下拉、全選功能、緊湊設計', badge: '完成', hoverBorder: 'hover:border-teal-500', hoverText: 'group-hover:text-teal-600' },
  { to: '/docs/components/filter-bar', icon: '🎛️', title: 'FilterBar 過濾橫列', description: '多過濾器並排、統一配置、內建計數', badge: '完成', hoverBorder: 'hover:border-indigo-500', hoverText: 'group-hover:text-indigo-600' },
  { to: '/docs/components/filter-select', icon: '📝', title: 'FilterSelect 單選器', description: '多尺寸、物件支援、高度靈活', badge: '完成', hoverBorder: 'hover:border-cyan-500', hoverText: 'group-hover:text-cyan-600' },
  { to: '/docs/components/form-atoms', icon: '🧩', title: '基礎表單元件', description: 'ChptInput、ChptRadio、ChptSwitch、ChptSelect、ChptDatePicker 一站式示範', badge: '完成', hoverBorder: 'hover:border-slate-500', hoverText: 'group-hover:text-slate-600' },
  { to: '/docs/components/tag-filter-dropdown', icon: '🏷️', title: 'TagFilterDropdown 標籤過濾', description: '超緊湊、搜尋功能、多選標籤', badge: '完成', hoverBorder: 'hover:border-blue-500', hoverText: 'group-hover:text-blue-600' },
  { to: '/docs/components/draggable-modal', icon: '🪟', title: 'DraggableModal 可拖曳模態框', description: '拖曳、調整大小、最大化', badge: '完成', hoverBorder: 'hover:border-purple-500', hoverText: 'group-hover:text-purple-600' },
  { to: '/docs/components/whiteboard', icon: '📝', title: 'Whiteboard 白板', description: '多頁白板、筆刷、幾何圖形、匯出 PNG / SVG', badge: '完成', hoverBorder: 'hover:border-teal-500', hoverText: 'group-hover:text-teal-600' },
];
</script>

<style scoped>
/* 程式碼區塊滾動條樣式 */
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
</style>
