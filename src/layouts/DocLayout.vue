<template>
  <div class="flex h-screen bg-neutral-50">
    <!-- 左側導覽列 (Sidebar) -->
    <aside
      class="bg-white border-r border-neutral-200 flex flex-col flex-shrink-0 transition-all duration-300"
      :class="isSidebarCollapsed ? 'w-16' : 'w-72'"
    >
      <div class="sticky top-0 bg-white z-10 border-b border-neutral-200">
        <!-- 展開狀態的標題 -->
        <div v-if="!isSidebarCollapsed" class="p-6 flex items-center justify-between">
          <router-link
            to="/docs"
            class="flex items-center space-x-3 group"
          >
            <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center shadow-sm shrink-0">
              <span class="text-white text-xl">🧩</span>
            </div>
            <div>
              <h1 class="text-lg font-bold text-neutral-900 leading-tight group-hover:text-primary-600 transition-colors">
                組件庫文檔
              </h1>
              <p class="text-xs text-neutral-500">Vue 3 企業級組件</p>
            </div>
          </router-link>

          <!-- 收合按鈕 -->
          <button
            @click="toggleSidebar"
            class="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
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
            class="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center group"
          >
            <span class="text-white text-xl">🧩</span>
          </router-link>
        </div>
      </div>

      <!-- 導覽列表 (展開狀態) -->
      <nav v-if="!isSidebarCollapsed" class="flex-1 overflow-y-auto p-4 space-y-1">
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
          <div class="mt-6 mb-2 flex items-center gap-2">
            <h3 class="px-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              {{ section.title }}
            </h3>
            <div class="flex-1 h-px bg-neutral-100"></div>
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
          </router-link>
        </template>
      </nav>

      <!-- 收合狀態的快捷圖標列表 -->
      <nav v-if="isSidebarCollapsed" class="flex-1 overflow-y-auto px-2 py-3 space-y-2 flex flex-col items-center">
        <button
          @click="toggleSidebar"
          class="p-2 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          title="展開側邊欄"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
          </svg>
        </button>

        <div class="w-8 h-px bg-neutral-200"></div>

        <router-link
          v-for="shortcut in collapsedShortcuts"
          :key="shortcut.to"
          :to="shortcut.to"
          class="p-2 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
          :class="{ 'bg-primary-50 text-primary-600': isActiveRoute(shortcut.to) }"
          :title="shortcut.title"
        >
          <span class="text-xl">{{ shortcut.icon }}</span>
        </router-link>
      </nav>

      <!-- 底部版本資訊 -->
      <div v-if="!isSidebarCollapsed" class="mt-auto border-t border-neutral-200 bg-white">
        <div class="px-6 py-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-2 h-2 rounded-full bg-success-500"></span>
            <span class="text-xs font-medium text-neutral-600">文件系統</span>
          </div>
          <div class="text-xs text-neutral-500 space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-neutral-400">版本</span>
              <span class="font-mono font-semibold text-neutral-700">v1.0.0</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-neutral-400">更新日期</span>
              <span class="font-mono text-neutral-600">2026-09-06</span>
            </div>
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
 * 導覽分類與項目（資料驅動，對齊 @/components/library 群別）
 */
const navSections = [
  {
    title: 'UI 組件',
    items: [
      { to: '/docs/components/form-atoms', icon: '🧩', label: '基礎表單元件' },
      { to: '/docs/components/data-filter', icon: '📊', label: '資料呈現與過濾元件' },
      { to: '/docs/components/common-table', icon: '📋', label: 'ChptTable 表格' },
      { to: '/docs/components/feedback', icon: '🛎️', label: '反饋元件' },
      { to: '/docs/components/interactive', icon: '🖱️', label: '互動元件' },
      { to: '/docs/components/overlay', icon: '🗔', label: '浮層元件' },
      { to: '/docs/components/draggable-modal', icon: '🪟', label: 'ChptModal 多視窗' },
      { to: '/docs/components/tooltip', icon: '💬', label: 'ChptTooltip 提示框' },
      { to: '/docs/components/layout-nav', icon: '🧱', label: '佈局與流程元件' },
      { to: '/docs/components/theme-tools', icon: '🌗', label: '主題與工具元件' },
    ],
  },
  {
    title: '圖表 Charts',
    items: [
      { to: '/docs/components/dual-axis-chart', icon: '📊', label: '雙軸組合圖' },
      { to: '/docs/components/pareto', icon: '📈', label: '柏拉圖' },
      { to: '/docs/components/heatmap', icon: '🔥', label: '熱力圖' },
    ],
  },
  {
    title: '檢視器 Viewer',
    items: [
      { to: '/docs/components/gerber-viewer', icon: '🔬', label: 'Gerber 檢視器' },
      { to: '/docs/components/pcb-layout', icon: '🖥️', label: 'PCB Layout' },
      { to: '/docs/components/schematic-viewer', icon: '🔌', label: 'Schematic Viewer' },
    ],
  },
  {
    title: 'Excel',
    items: [
      { to: '/docs/components/excel-editor', icon: '📑', label: 'ChptExcelEditor' },
    ],
  },
  {
    title: '進階範例',
    items: [
      { to: '/docs/components/whiteboard', icon: '📝', label: 'Whiteboard 白板' },
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
 * 收合側邊欄時顯示的快捷項目（各分類代表性項目）
 */
const collapsedShortcuts = [
  { to: '/docs', icon: '🏠', title: '首頁' },
  { to: '/docs/components/form-atoms', icon: '🧩', title: '基礎表單' },
  { to: '/docs/components/data-filter', icon: '📊', title: '資料呈現與過濾' },
  { to: '/docs/components/feedback', icon: '🛎️', title: '反饋元件' },
  { to: '/docs/components/overlay', icon: '🗔', title: '浮層元件' },
  { to: '/docs/components/dual-axis-chart', icon: '📈', title: '圖表' },
  { to: '/docs/components/excel-editor', icon: '📑', title: 'Excel' },
];

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
  @apply relative flex items-center px-3 py-2.5 text-sm font-medium text-neutral-700 rounded-lg transition-all duration-150;
  @apply hover:bg-primary-50 hover:text-primary-700;
}

/* 導覽項目啟用狀態：左側指示條 */
.nav-item::before {
  content: '';
  @apply absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-transparent rounded-r transition-all duration-150;
}

.nav-item-active {
  @apply bg-primary-50 text-primary-700 font-semibold;
}

.nav-item-active::before {
  @apply bg-primary-600 h-6;
}

/* 導覽圖示 */
.nav-icon {
  @apply mr-3 text-lg flex-shrink-0 transition-transform duration-150;
}

.nav-item:hover .nav-icon {
  @apply scale-110;
}

.nav-item-active .nav-icon {
  @apply scale-110;
}

/* 導覽文字 */
.nav-text {
  @apply flex-1 truncate;
}

/* 滾動條樣式：側邊欄導覽 */
nav {
  scrollbar-width: thin;
  scrollbar-color: #d4d4d4 #f5f5f5;
}

nav::-webkit-scrollbar {
  width: 6px;
}

nav::-webkit-scrollbar-track {
  background: #f5f5f5;
}

nav::-webkit-scrollbar-thumb {
  background: #d4d4d4;
  border-radius: 3px;
}

nav::-webkit-scrollbar-thumb:hover {
  background: #a3a3a3;
}

main {
  scrollbar-width: thin;
  scrollbar-color: #d4d4d4 #fafafa;
}

main::-webkit-scrollbar {
  width: 8px;
}

main::-webkit-scrollbar-track {
  background: #fafafa;
}

main::-webkit-scrollbar-thumb {
  background: #d4d4d4;
  border-radius: 4px;
}

main::-webkit-scrollbar-thumb:hover {
  background: #a3a3a3;
}
</style>
