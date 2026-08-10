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
              <p class="text-xs text-gray-500">組件庫文檔</p>
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

        <!-- 各分類導覽項目（資料驅動） -->
        <template v-for="section in navSections" :key="section.title">
          <div class="mt-8 mb-3">
            <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {{ section.title }}
            </h3>
          </div>

          <router-link
            v-for="item in section.items"
            :key="item.to"
            :to="item.to"
            class="nav-item"
            :class="{ 'nav-item-active': isActiveRoute(item.to) }"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-text">{{ item.label }}</span>
            <span
              v-if="item.status"
              class="ml-auto px-2 py-0.5 text-xs font-medium rounded-full"
              :class="statusBadge(item.status).cls"
            >
              {{ statusBadge(item.status).text }}
            </span>
          </router-link>
        </template>
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
        
        <router-link
          v-for="shortcut in collapsedShortcuts"
          :key="shortcut.to"
          :to="shortcut.to"
          class="p-2 hover:bg-gray-100 rounded-lg"
          :title="shortcut.title"
        >
          <span class="text-xl">{{ shortcut.icon }}</span>
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
 * 導覽分類與項目（資料驅動，統一維護）
 * status: 'done'（完成）| 'planned'（計畫中）| 省略（無標籤）
 */
const navSections = [
  {
    title: '圖表組件',
    items: [
      { to: '/docs/components/dual-axis-chart', icon: '📊', label: '雙軸組合圖', status: 'done' },
      { to: '/docs/components/pareto', icon: '📈', label: '柏拉圖', status: 'done' },
      { to: '/docs/components/gauge', icon: '⏱️', label: '儀表板', status: 'planned' },
      { to: '/docs/components/heatmap', icon: '🔥', label: '熱力圖', status: 'done' },
      { to: '/docs/components/gantt', icon: '📅', label: '甘特圖', status: 'planned' },
      { to: '/docs/components/gerber-viewer', icon: '🔬', label: 'Gerber 檢視器', status: 'done' },
      { to: '/docs/components/pcb-layout', icon: '🖥️', label: 'PCB Layout', status: 'done' },
    ],
  },
  {
    title: '工具組件',
    items: [
      { to: '/docs/components/tooltip', icon: '💬', label: 'Tooltip 提示框', status: 'done' },
      { to: '/docs/components/common-table', icon: '📋', label: 'CommonTable 表格', status: 'done' },
      { to: '/docs/components/filter-dropdown', icon: '🔽', label: 'FilterDropdown 過濾器', status: 'done' },
      { to: '/docs/components/filter-bar', icon: '🎛️', label: 'FilterBar 過濾橫列', status: 'done' },
      { to: '/docs/components/filter-select', icon: '📝', label: 'FilterSelect 單選器', status: 'done' },
      { to: '/docs/components/form-atoms', icon: '🧩', label: '基礎表單元件', status: 'done' },
      { to: '/docs/components/feedback', icon: '🛎️', label: '反饋元件', status: 'done' },
      { to: '/docs/components/interactive', icon: '🖱️', label: '互動元件', status: 'done' },
      { to: '/docs/components/overlay', icon: '🗔', label: '浮層元件', status: 'done' },
      { to: '/docs/components/layout-nav', icon: '🧱', label: '佈局與流程', status: 'done' },
      { to: '/docs/components/data-filter', icon: '📊', label: '資料呈現與過濾元件', status: 'done' },
      { to: '/docs/components/theme-tools', icon: '🌗', label: '主題與工具元件', status: 'done' },
      { to: '/docs/components/excel-editor', icon: '📝', label: 'Excel 編輯器', status: 'done' },
      { to: '/docs/components/tag-filter-dropdown', icon: '🏷️', label: 'TagFilterDropdown 標籤過濾', status: 'done' },
      { to: '/docs/components/draggable-modal', icon: '🪟', label: 'DraggableModal 可拖曳模態框', status: 'done' },
      { to: '/docs/components/whiteboard', icon: '📝', label: 'Whiteboard 白板', status: 'done' },
      { to: '/docs/components/legend', icon: '🏷️', label: 'Legend 圖例', status: 'planned' },
    ],
  },
  {
    title: '開發指南',
    items: [
      { to: '/docs/guide/getting-started', icon: '🚀', label: '快速開始' },
      { to: '/docs/guide/best-practices', icon: '✨', label: '最佳實踐' },
    ],
  },
];

/**
 * 收合側邊欄時顯示的快捷項目（首頁 + 各分類代表性項目）
 */
const collapsedShortcuts = [
  { to: '/docs', icon: '🏠', title: '首頁' },
  { to: '/docs/components/dual-axis-chart', icon: '📊', title: '雙軸組合圖' },
  { to: '/docs/components/pareto', icon: '📈', title: '柏拉圖' },
  { to: '/docs/components/heatmap', icon: '🔥', title: '熱力圖' },
  { to: '/docs/components/tooltip', icon: '💬', title: 'Tooltip' },
  { to: '/docs/components/common-table', icon: '📋', title: 'CommonTable 表格' },
  { to: '/docs/components/filter-dropdown', icon: '🔽', title: 'FilterDropdown 過濾器' },
  { to: '/docs/components/filter-bar', icon: '🎛️', title: 'FilterBar 過濾橫列' },
  { to: '/docs/components/form-atoms', icon: '🧩', title: '基礎表單元件' },
  { to: '/docs/components/feedback', icon: '🛎️', title: '反饋元件' },
  { to: '/docs/components/interactive', icon: '🖱️', title: '互動元件' },
  { to: '/docs/components/overlay', icon: '🗔', title: '浮層元件' },
  { to: '/docs/components/layout-nav', icon: '🧱', title: '佈局與流程' },
  { to: '/docs/components/data-filter', icon: '📊', title: '資料呈現與過濾元件' },
  { to: '/docs/components/theme-tools', icon: '🌗', title: '主題與工具元件' },
  { to: '/docs/components/excel-editor', icon: '📝', title: 'Excel 編輯器' },
  { to: '/docs/components/tag-filter-dropdown', icon: '🏷️', title: 'TagFilterDropdown 標籤過濾' },
  { to: '/docs/components/draggable-modal', icon: '🪟', title: 'DraggableModal 可拖曳模態框' },
  { to: '/docs/components/whiteboard', icon: '📝', title: 'Whiteboard 白板' },
];

/** 狀態標籤輔助函式 */
const statusBadge = (status) => {
  if (status === 'planned') {
    return { text: '計畫中', cls: 'bg-gray-100 text-gray-500' };
  }
  return { text: '完成', cls: 'bg-green-100 text-green-700' };
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
