<template>
  <div class="flex h-screen bg-gray-50">
    <!-- 左側導覽列 (Sidebar) -->
    <aside 
      class="bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0 transition-all duration-300"
      :class="isSidebarCollapsed ? 'w-16' : 'w-72'"
    >
      <div class="sticky top-0 bg-white z-10 border-b border-gray-200">
        <!-- 展開狀態的標題 -->
        <div v-if="!isSidebarCollapsed" class="p-6 flex items-center justify-between">
          <router-link 
            to="/docs" 
            class="flex items-center space-x-3 group"
          >
            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span class="text-white text-xl font-bold">D3</span>
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                組件庫文檔
              </h1>
              <p class="text-xs text-gray-500">Component Library</p>
            </div>
          </router-link>
          
          <!-- 收合按鈕 -->
          <button
            @click="toggleSidebar"
            class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="收合側邊欄"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
            </svg>
          </button>
        </div>
        
        <!-- 收合狀態的 Logo -->
        <div v-else class="py-3 flex items-center justify-center">
          <router-link 
            to="/docs" 
            class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group"
          >
            <span class="text-white text-xl font-bold">D3</span>
          </router-link>
        </div>
      </div>

      <!-- 導覽列表 (展開狀態) -->
      <nav v-if="!isSidebarCollapsed" class="p-4 space-y-1">
        <!-- 首頁 -->
        <router-link
          to="/docs"
          class="nav-item"
          :class="{ 'nav-item-active': isActiveRoute('/docs', true) }"
        >
          <span class="nav-icon">🏠</span>
          <span class="nav-text">首頁</span>
        </router-link>

        <!-- 組件分類 -->
        <div class="mt-8 mb-3">
          <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            圖表組件
          </h3>
        </div>

        <!-- 雙軸組合圖 -->
        <router-link
          to="/docs/components/dual-axis-chart"
          class="nav-item"
          :class="{ 'nav-item-active': isActiveRoute('/docs/components/dual-axis-chart') }"
        >
          <span class="nav-icon">📊</span>
          <span class="nav-text">雙軸組合圖</span>
          <span class="ml-auto px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            完成
          </span>
        </router-link>

        <!-- 柏拉圖 -->
        <router-link
          to="/docs/components/pareto"
          class="nav-item"
          :class="{ 'nav-item-active': isActiveRoute('/docs/components/pareto') }"
        >
          <span class="nav-icon">📈</span>
          <span class="nav-text">柏拉圖</span>
          <span class="ml-auto px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            完成
          </span>
        </router-link>

        <!-- 儀表板 (預留) -->
        <router-link
          to="/docs/components/gauge"
          class="nav-item"
          :class="{ 'nav-item-active': isActiveRoute('/docs/components/gauge') }"
        >
          <span class="nav-icon">⏱️</span>
          <span class="nav-text">儀表板</span>
          <span class="ml-auto px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
            計畫中
          </span>
        </router-link>

        <!-- 熱力圖 -->
        <router-link
          to="/docs/components/heatmap"
          class="nav-item"
          :class="{ 'nav-item-active': isActiveRoute('/docs/components/heatmap') }"
        >
          <span class="nav-icon">🔥</span>
          <span class="nav-text">熱力圖</span>
          <span class="ml-auto px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            完成
          </span>
        </router-link>

        <!-- 甘特圖 (預留) -->
        <router-link
          to="/docs/components/gantt"
          class="nav-item"
          :class="{ 'nav-item-active': isActiveRoute('/docs/components/gantt') }"
        >
          <span class="nav-icon">📅</span>
          <span class="nav-text">甘特圖</span>
          <span class="ml-auto px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
            計畫中
          </span>
        </router-link>

        <!-- Gerber 檢視器 -->
        <router-link
          to="/docs/components/gerber-viewer"
          class="nav-item"
          :class="{ 'nav-item-active': isActiveRoute('/docs/components/gerber-viewer') }"
        >
          <span class="nav-icon">🔬</span>
          <span class="nav-text">Gerber 檢視器</span>
          <span class="ml-auto px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            完成
          </span>
        </router-link>

        <!-- 工具類組件分類 -->
        <div class="mt-8 mb-3">
          <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            工具組件
          </h3>
        </div>

        <!-- Tooltip -->
        <router-link
          to="/docs/components/tooltip"
          class="nav-item"
          :class="{ 'nav-item-active': isActiveRoute('/docs/components/tooltip') }"
        >
          <span class="nav-icon">💬</span>
          <span class="nav-text">Tooltip 提示框</span>
          <span class="ml-auto px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            完成
          </span>
        </router-link>

        <!-- CommonTable -->
        <router-link
          to="/docs/components/common-table"
          class="nav-item"
          :class="{ 'nav-item-active': isActiveRoute('/docs/components/common-table') }"
        >
          <span class="nav-icon">📋</span>
          <span class="nav-text">CommonTable 表格</span>
          <span class="ml-auto px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            完成
          </span>
        </router-link>

        <!-- FilterDropdown -->
        <router-link
          to="/docs/components/filter-dropdown"
          class="nav-item"
          :class="{ 'nav-item-active': isActiveRoute('/docs/components/filter-dropdown') }"
        >
          <span class="nav-icon">🔽</span>
          <span class="nav-text">FilterDropdown 過濾器</span>
          <span class="ml-auto px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            完成
          </span>
        </router-link>

        <!-- FilterBar -->
        <router-link
          to="/docs/components/filter-bar"
          class="nav-item"
          :class="{ 'nav-item-active': isActiveRoute('/docs/components/filter-bar') }"
        >
          <span class="nav-icon">🎛️</span>
          <span class="nav-text">FilterBar 過濾橫列</span>
          <span class="ml-auto px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            完成
          </span>
        </router-link>

        <!-- FilterSelect -->
        <router-link
          to="/docs/components/filter-select"
          class="nav-item"
          :class="{ 'nav-item-active': isActiveRoute('/docs/components/filter-select') }"
        >
          <span class="nav-icon">📝</span>
          <span class="nav-text">FilterSelect 單選器</span>
          <span class="ml-auto px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            完成
          </span>
        </router-link>

        <!-- TagFilterDropdown -->
        <router-link
          to="/docs/components/tag-filter-dropdown"
          class="nav-item"
          :class="{ 'nav-item-active': isActiveRoute('/docs/components/tag-filter-dropdown') }"
        >
          <span class="nav-icon">🏷️</span>
          <span class="nav-text">TagFilterDropdown 標籤過濾</span>
          <span class="ml-auto px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            完成
          </span>
        </router-link>

        <!-- DraggableModal -->
        <router-link
          to="/docs/components/draggable-modal"
          class="nav-item"
          :class="{ 'nav-item-active': isActiveRoute('/docs/components/draggable-modal') }"
        >
          <span class="nav-icon">🪟</span>
          <span class="nav-text">DraggableModal 可拖曳模態框</span>
          <span class="ml-auto px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            完成
          </span>
        </router-link>

        <!-- Legend (預留) -->
        <router-link
          to="/docs/components/legend"
          class="nav-item"
          :class="{ 'nav-item-active': isActiveRoute('/docs/components/legend') }"
        >
          <span class="nav-icon">🏷️</span>
          <span class="nav-text">Legend 圖例</span>
          <span class="ml-auto px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
            計畫中
          </span>
        </router-link>

        <!-- 指南分類 -->
        <div class="mt-8 mb-3">
          <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            開發指南
          </h3>
        </div>

        <router-link
          to="/docs/guide/getting-started"
          class="nav-item"
          :class="{ 'nav-item-active': isActiveRoute('/docs/guide/getting-started') }"
        >
          <span class="nav-icon">🚀</span>
          <span class="nav-text">快速開始</span>
        </router-link>

        <router-link
          to="/docs/guide/best-practices"
          class="nav-item"
          :class="{ 'nav-item-active': isActiveRoute('/docs/guide/best-practices') }"
        >
          <span class="nav-icon">✨</span>
          <span class="nav-text">最佳實踐</span>
        </router-link>
      </nav>

      <!-- 收合狀態的快捷圖標列表 -->
      <nav v-if="isSidebarCollapsed" class="p-2 space-y-2 flex flex-col items-center mt-4">
        <button
          @click="toggleSidebar"
          class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="展開側邊欄"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
          </svg>
        </button>
        
        <div class="w-8 h-px bg-gray-200"></div>
        
        <router-link to="/docs" class="p-2 hover:bg-gray-100 rounded-lg" title="首頁">
          <span class="text-xl">🏠</span>
        </router-link>
        <router-link to="/docs/components/dual-axis-chart" class="p-2 hover:bg-gray-100 rounded-lg" title="雙軸組合圖">
          <span class="text-xl">📊</span>
        </router-link>
        <router-link to="/docs/components/pareto" class="p-2 hover:bg-gray-100 rounded-lg" title="柏拉圖">
          <span class="text-xl">📈</span>
        </router-link>
        <router-link to="/docs/components/heatmap" class="p-2 hover:bg-gray-100 rounded-lg" title="熱力圖">
          <span class="text-xl">🔥</span>
        </router-link>
        <router-link to="/docs/components/tooltip" class="p-2 hover:bg-gray-100 rounded-lg" title="Tooltip">
          <span class="text-xl">💬</span>
        </router-link>
        <router-link to="/docs/components/common-table" class="p-2 hover:bg-gray-100 rounded-lg" title="CommonTable 表格">
          <span class="text-xl">📋</span>
        </router-link>
        <router-link to="/docs/components/filter-dropdown" class="p-2 hover:bg-gray-100 rounded-lg" title="FilterDropdown 過濾器">
          <span class="text-xl">🔽</span>
        </router-link>
        <router-link to="/docs/components/filter-bar" class="p-2 hover:bg-gray-100 rounded-lg" title="FilterBar 過濾橫列">
          <span class="text-xl">🎛️</span>
        </router-link>
        <router-link to="/docs/components/filter-select" class="p-2 hover:bg-gray-100 rounded-lg" title="FilterSelect 單選器">
          <span class="text-xl">📝</span>
        </router-link>
        <router-link to="/docs/components/tag-filter-dropdown" class="p-2 hover:bg-gray-100 rounded-lg" title="TagFilterDropdown 標籤過濾">
          <span class="text-xl">🏷️</span>
        </router-link>
        <router-link to="/docs/components/draggable-modal" class="p-2 hover:bg-gray-100 rounded-lg" title="DraggableModal 可拖曳模態框">
          <span class="text-xl">🪟</span>
        </router-link>
      </nav>

      <!-- 底部版本資訊 -->
      <div v-if="!isSidebarCollapsed" class="p-4 mt-auto border-t border-gray-200 bg-gray-50">
        <div class="text-xs text-gray-500 space-y-1">
          <div class="flex items-center justify-between">
            <span>版本</span>
            <span class="font-mono font-semibold text-gray-700">v1.0.0</span>
          </div>
          <div class="flex items-center justify-between">
            <span>更新日期</span>
            <span class="font-mono text-gray-600">2026-01-11</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- 右側內容區域 (Main Content) -->
    <main class="flex-1 overflow-y-auto">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router';
import { ref } from 'vue';

const route = useRoute();

// 側邊欄收合狀態
const isSidebarCollapsed = ref(false);

/**
 * 切換側邊欄收合狀態
 */
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
};

/**
 * 判斷路由是否為啟用狀態
 * @param {string} path - 路由路徑
 * @param {boolean} exact - 是否精確匹配
 */
const isActiveRoute = (path, exact = false) => {
  if (exact) {
    return route.path === path;
  }
  return route.path.startsWith(path);
};
</script>

<style scoped>
/* 導覽項目基礎樣式 */
.nav-item {
  @apply flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg transition-all duration-150;
  @apply hover:bg-blue-50 hover:text-blue-700;
}

/* 導覽項目啟用狀態 */
.nav-item-active {
  @apply bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md;
  @apply hover:from-blue-600 hover:to-blue-700 hover:text-white;
}

/* 導覽圖示 */
.nav-icon {
  @apply mr-3 text-lg flex-shrink-0;
}

/* 導覽文字 */
.nav-text {
  @apply flex-1;
}

/* 滾動條樣式 */
aside {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
}

aside::-webkit-scrollbar {
  width: 6px;
}

aside::-webkit-scrollbar-track {
  background: #f1f5f9;
}

aside::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

aside::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

main {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f9fafb;
}

main::-webkit-scrollbar {
  width: 8px;
}

main::-webkit-scrollbar-track {
  background: #f9fafb;
}

main::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

main::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
