<template>
  <div class="flex h-screen bg-surface-secondary">
    <!-- 左側導覽列 (Sidebar) -->
    <aside
      class="bg-surface-primary border-r border-stroke-light flex flex-col flex-shrink-0 transition-all duration-300"
      :class="isSidebarCollapsed ? 'w-16' : 'w-72'"
    >
      <div class="sticky top-0 bg-surface-primary z-10 border-b border-stroke-light">
        <!-- 展開狀態的標題 -->
        <div v-if="!isSidebarCollapsed" class="p-6 flex items-center justify-between">
          <router-link to="/docs" class="flex items-center space-x-3 group">
            <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center shadow-sm shrink-0">
              <span class="text-white text-xl">🧩</span>
            </div>
            <div>
              <h1 class="text-lg font-bold text-content-primary leading-tight group-hover:text-accent transition-colors">
                組件庫文檔
              </h1>
              <p class="text-xs text-content-tertiary">Vue 3 企業級組件</p>
            </div>
          </router-link>
          <button type="button"
            @click="toggleSidebar"
            class="p-2 text-content-disabled hover:text-content-primary hover:bg-surface-tertiary rounded-lg transition-colors"
            title="收合側邊欄"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
            </svg>
          </button>
        </div>

        <!-- 收合狀態的 Logo -->
        <div v-else class="py-3 flex items-center justify-center">
          <router-link to="/docs" class="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center group">
            <span class="text-white text-xl">🧩</span>
          </router-link>
        </div>
      </div>

      <!-- 導覽列表 (展開狀態) -->
      <nav v-if="!isSidebarCollapsed" class="flex-1 overflow-y-auto p-4 space-y-1">
        <!-- 首頁 -->
        <router-link to="/docs" class="nav-item" :class="{ 'nav-item-active': isActiveRoute('/docs', true) }">
          <span class="nav-icon">🏠</span>
          <span class="nav-text">首頁</span>
        </router-link>

        <!-- 各分類導覽項目（資料驅動） -->
        <template v-for="section in navSections" :key="section.title">
          <div class="mt-6 mb-2 flex items-center gap-2">
            <h3 class="px-3 text-xs font-semibold text-content-disabled uppercase tracking-wider">{{ section.title }}</h3>
            <div class="flex-1 h-px bg-surface-tertiary"></div>
          </div>

          <!-- 一般連結 -->
          <router-link
            v-for="item in plainItems(section.items)"
            :key="item.to"
            :to="item.to"
            class="nav-item"
            :class="{ 'nav-item-active': isActiveRoute(item.to) }"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-text">{{ item.label }}</span>
          </router-link>

          <!-- 可展開群組（有子元件錨點） -->
          <div v-for="item in groupItems(section.items)" :key="item.to" class="mb-1">
            <div class="flex items-center">
              <router-link
                :to="item.to"
                class="nav-item flex-1 min-w-0"
                :class="{ 'nav-item-active': isActiveRoute(item.to) }"
              >
                <span class="nav-icon">{{ item.icon }}</span>
                <span class="nav-text">{{ item.label }}</span>
              </router-link>
              <button
                type="button"
                class="flex items-center justify-center w-6 h-6 mr-1 rounded-md text-content-disabled hover:text-accent-on-subtle hover:bg-accent-subtle transition-all duration-200"
                :title="expanded[item.to] ? '收合' : '展開元件'"
                @click="toggleGroup(item.to)"
              >
                <svg
                  class="w-4 h-4 transition-transform duration-200"
                  :class="expanded[item.to] ? 'rotate-90' : ''"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>

            <div v-if="expanded[item.to]" class="ml-5 pl-2 border-l border-stroke-light space-y-0.5 mt-0.5">
              <button
                v-for="a in item.anchors"
                :key="a.id"
                type="button"
                class="block w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                :class="activeAnchor === a.id
                  ? 'bg-accent-subtle text-accent-on-subtle'
                  : 'text-content-tertiary hover:bg-surface-tertiary hover:text-content-primary'"
                @click="jump(item, a.id)"
              >
                {{ a.label }}
              </button>
            </div>
          </div>
        </template>
      </nav>

      <!-- 收合狀態的快捷圖標列表 -->
      <nav v-if="isSidebarCollapsed" class="flex-1 overflow-y-auto px-2 py-3 space-y-2 flex flex-col items-center">
        <button type="button"
          @click="toggleSidebar"
          class="p-2 text-content-disabled hover:text-accent-on-subtle hover:bg-accent-subtle rounded-lg transition-colors"
          title="展開側邊欄"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
          </svg>
        </button>
        <div class="w-8 h-px bg-surface-muted"></div>
        <router-link
          v-for="shortcut in collapsedShortcuts"
          :key="shortcut.to"
          :to="shortcut.to"
          class="p-2 hover:bg-accent-subtle hover:text-accent-on-subtle rounded-lg transition-colors"
          :class="{ 'bg-accent-subtle text-accent-on-subtle': isActiveRoute(shortcut.to) }"
          :title="shortcut.title"
        >
          <span class="text-xl">{{ shortcut.icon }}</span>
        </router-link>
      </nav>

      <!-- 底部版本資訊 -->
      <div v-if="!isSidebarCollapsed" class="mt-auto border-t border-stroke-light bg-surface-primary">
        <div class="px-6 py-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-2 h-2 rounded-full bg-success-500"></span>
            <span class="text-xs font-medium text-content-secondary">文件系統</span>
          </div>
          <div class="text-xs text-content-tertiary space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-content-disabled">版本</span>
              <span class="font-mono font-semibold text-content-primary">v1.0.0</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-content-disabled">更新日期</span>
              <span class="font-mono text-content-secondary">2026-09-06</span>
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
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const isSidebarCollapsed = ref(false);
const toggleSidebar = () => { isSidebarCollapsed.value = !isSidebarCollapsed.value; };

/** 記錄各群組是否展開（key = 群組頁 to） */
const expanded = ref({});

/** 目前高亮的子元件錨點 id（僅視覺用，跳轉後設值） */
const activeAnchor = ref('');

const plainItems = (items) => items.filter((i) => !i.anchors || i.anchors.length === 0);
const groupItems = (items) => items.filter((i) => i.anchors && i.anchors.length > 0);

function isActiveRoute(path, exact = false) {
  return exact ? route.path === path : route.path.startsWith(path);
}

function toggleGroup(to) {
  expanded.value = { ...expanded.value, [to]: !expanded.value[to] };
}

/** 點子元件：確保在該頁，再捲動到錨點 */
function jump(item, id) {
  activeAnchor.value = id;
  const go = () => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  if (route.path === item.to) {
    go();
  } else {
    router.push(item.to);
    // 等路由元件掛載後再捲動
    setTimeout(go, 120);
  }
}

/**
 * 導覽分類與項目（資料驅動，對齊 @/components/library 群別）
 * anchors：該頁各元件區塊的 { label, id }；id 需與頁面 <section :id> 一致。
 */
const navSections = [
  {
    title: 'UI 組件',
    items: [
      {
        to: '/docs/components/form-atoms', icon: '🧩', label: '基礎表單元件',
        anchors: [
          { label: 'ChptInput', id: 'chpt-input' },
          { label: 'ChptSelect', id: 'chpt-select' },
          { label: 'ChptRadio', id: 'chpt-radio' },
          { label: 'ChptSwitch', id: 'chpt-switch' },
          { label: 'ChptDatePicker', id: 'chpt-datepicker' },
          { label: 'ChptInputNumber', id: 'chpt-inputnumber' },
          { label: 'ChptSlider', id: 'chpt-slider' },
          { label: 'ChptSegmented', id: 'chpt-segmented' },
          { label: 'ChptCheckbox', id: 'chpt-checkbox' },
          { label: 'ChptTextarea', id: 'chpt-textarea' },
        ],
      },
      {
        to: '/docs/components/pickers', icon: '🎯', label: '進階選擇元件',
        anchors: [
          { label: 'ChptAutocomplete', id: 'chpt-autocomplete' },
          { label: 'ChptCascader', id: 'chpt-cascader' },
          { label: 'ChptTransfer', id: 'chpt-transfer' },
          { label: 'ChptColorPicker', id: 'chpt-colorpicker' },
          { label: 'ChptRate', id: 'chpt-rate' },
          { label: 'ChptTimePicker', id: 'chpt-timepicker' },
          { label: 'ChptTreeSelect', id: 'chpt-treeselect' },
          { label: 'ChptCalendar', id: 'chpt-calendar' },
          { label: 'ChptInputTag', id: 'chpt-inputtag' },
        ],
      },
      {
        to: '/docs/components/form', icon: '📝', label: '表單驗證與上傳',
        anchors: [
          { label: 'ChptForm', id: 'chpt-form' },
          { label: 'ChptUpload', id: 'chpt-upload' },
        ],
      },
      {
        to: '/docs/components/data-filter', icon: '📊', label: '資料呈現與過濾',
        anchors: [
          { label: 'ChptTable', id: 'chpt-table' },
          { label: 'ChptFixedTable', id: 'chpt-fixedtable' },
          { label: 'ChptPagination', id: 'chpt-pagination' },
          { label: 'ChptFilter', id: 'chpt-filter' },
          { label: 'ChptFilterBar', id: 'chpt-filterbar' },
        ],
      },
      {
        to: '/docs/components/data-display', icon: '🗂️', label: '資料展示元件',
        anchors: [
          { label: 'ChptStatistic', id: 'chpt-statistic' },
          { label: 'ChptDescriptions', id: 'chpt-descriptions' },
          { label: 'ChptTimeline', id: 'chpt-timeline' },
          { label: 'ChptTree', id: 'chpt-tree' },
          { label: 'ChptImage', id: 'chpt-image' },
          { label: 'ChptList', id: 'chpt-list' },
          { label: 'ChptQRCode', id: 'chpt-qrcode' },
        ],
      },
      {
        to: '/docs/components/feedback', icon: '🛎️', label: '反饋元件',
        anchors: [
          { label: 'ChptAlert', id: 'chpt-alert' },
          { label: 'ChptTag', id: 'chpt-tag' },
          { label: 'ChptBadge', id: 'chpt-badge' },
          { label: 'ChptToast', id: 'chpt-toast' },
          { label: 'useNotification', id: 'use-notification' },
          { label: 'ChptProgress', id: 'chpt-progress' },
          { label: 'ChptSpinner', id: 'chpt-spinner' },
          { label: 'ChptEmpty', id: 'chpt-empty' },
          { label: 'ChptSkeleton', id: 'chpt-skeleton' },
          { label: 'ChptResult', id: 'chpt-result' },
        ],
      },
      {
        to: '/docs/components/interactive', icon: '🖱️', label: '互動元件',
        anchors: [
          { label: 'ChptTabs', id: 'chpt-tabs' },
          { label: 'ChptToast', id: 'chpt-toast' },
          { label: 'ChptButton', id: 'chpt-button' },
          { label: 'ChptProgress', id: 'chpt-progress' },
          { label: 'ChptAlert', id: 'chpt-alert' },
          { label: 'ChptAvatar', id: 'chpt-avatar' },
          { label: 'ChptTooltip', id: 'chpt-tooltip' },
        ],
      },
      {
        to: '/docs/components/overlay', icon: '🗔', label: '浮層元件',
        anchors: [
          { label: 'ChptModal', id: 'chpt-modal' },
          { label: 'ChptDrawer', id: 'chpt-drawer' },
          { label: 'ChptPopconfirm', id: 'chpt-popconfirm' },
          { label: 'ChptDropdown', id: 'chpt-dropdown' },
          { label: 'ChptPopover', id: 'chpt-popover' },
          { label: 'useConfirm', id: 'use-confirm' },
          { label: 'ChptModalDock', id: 'chpt-modaldock' },
          { label: 'ChptTour', id: 'chpt-tour' },
        ],
      },
      {
        to: '/docs/components/tooltip', icon: '💬', label: 'ChptTooltip 提示框',
        anchors: [
          { label: '主題', id: 'chpt-tooltip-theme' },
          { label: '位置', id: 'chpt-tooltip-placement' },
          { label: '自訂內容', id: 'chpt-tooltip-content' },
        ],
      },
      {
        to: '/docs/components/utilities', icon: '🧰', label: '版面與實用元件',
        anchors: [
          { label: 'ChptSplitter', id: 'chpt-splitter' },
          { label: 'ChptVirtualList', id: 'chpt-virtuallist' },
          { label: 'ChptAffix', id: 'chpt-affix' },
          { label: 'ChptCarousel', id: 'chpt-carousel' },
          { label: 'CopyButton / Ellipsis / Countdown / Watermark', id: 'chpt-small-utils' },
          { label: 'ChptSpace', id: 'chpt-space' },
        ],
      },
      {
        to: '/docs/components/navigation', icon: '🧭', label: '導覽元件',
        anchors: [
          { label: 'ChptMenu', id: 'chpt-menu' },
          { label: 'ChptAnchor', id: 'chpt-anchor' },
          { label: 'ChptBackTop', id: 'chpt-backtop' },
        ],
      },
      {
        to: '/docs/components/layout-nav', icon: '🧱', label: '佈局與流程元件',
        anchors: [
          { label: 'ChptCard', id: 'chpt-card' },
          { label: 'ChptCollapse', id: 'chpt-collapse' },
          { label: 'ChptBreadcrumb', id: 'chpt-breadcrumb' },
          { label: 'ChptSteps', id: 'chpt-steps' },
          { label: 'ChptDivider', id: 'chpt-divider' },
        ],
      },
      {
        to: '/docs/components/theme-tools', icon: '🌗', label: '主題與工具元件',
        anchors: [
          { label: 'ChptDarkModeToggle', id: 'chpt-darkmodetoggle' },
          { label: 'ChptHeaderLogoutButton', id: 'chpt-headerlogout' },
          { label: 'ChptConfigProvider', id: 'chpt-config-provider' },
        ],
      },
    ],
  },
  {
    title: '圖表 Charts',
    items: [
      {
        to: '/docs/components/dual-axis-chart', icon: '📊', label: '雙軸組合圖',
        anchors: [{ label: '基本示範', id: 'basic' }, { label: '進階範例', id: 'examples' }],
      },
      {
        to: '/docs/components/facet-charts', icon: '🧮', label: '分面圖',
        anchors: [{ label: 'FacetedChart', id: 'faceted-chart' }, { label: 'GridFacetChart', id: 'grid-facet-chart' }],
      },
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

const collapsedShortcuts = [
  { to: '/docs', icon: '🏠', title: '首頁' },
  { to: '/docs/components/form-atoms', icon: '🧩', title: '基礎表單' },
  { to: '/docs/components/pickers', icon: '🎯', title: '進階選擇元件' },
  { to: '/docs/components/form', icon: '📝', title: '表單驗證與上傳' },
  { to: '/docs/components/data-filter', icon: '📊', title: '資料呈現與過濾' },
  { to: '/docs/components/data-display', icon: '🗂️', title: '資料展示' },
  { to: '/docs/components/feedback', icon: '🛎️', title: '反饋元件' },
  { to: '/docs/components/overlay', icon: '🗔', title: '浮層元件' },
  { to: '/docs/components/navigation', icon: '🧭', title: '導覽元件' },
  { to: '/docs/components/utilities', icon: '🧰', title: '版面與實用元件' },
  { to: '/docs/components/dual-axis-chart', icon: '📈', title: '圖表' },
  { to: '/docs/components/excel-editor', icon: '📑', title: 'Excel' },
];

/** 切頁後自動展開所在群組（navSections 需已定義，故置於此） */
watch(
  () => route.path,
  (path) => {
    const next = { ...expanded.value };
    navSections.forEach((s) =>
      s.items.forEach((i) => {
        if (i.anchors && path.startsWith(i.to)) next[i.to] = true;
      })
    );
    expanded.value = next;
    activeAnchor.value = '';
  },
  { immediate: true }
);

</script>
<style scoped>
/* 導覽項目基礎樣式 */
.nav-item {
  @apply relative flex items-center px-3 py-2.5 text-sm font-medium text-content-primary rounded-lg transition-all duration-150;
  @apply hover:bg-accent-subtle hover:text-accent-on-subtle;
}
.nav-item::before {
  content: '';
  @apply absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-transparent rounded-r transition-all duration-150;
}
.nav-item-active {
  @apply bg-accent-subtle text-accent-on-subtle font-semibold;
}
.nav-item-active::before {
  @apply bg-primary-600 h-6;
}
.nav-icon {
  @apply mr-3 text-lg flex-shrink-0 transition-transform duration-150;
}
.nav-item:hover .nav-icon, .nav-item-active .nav-icon {
  @apply scale-110;
}
.nav-text {
  @apply flex-1 truncate;
}

/* 滾動條 */
/* 用主題變數：原本寫死淺灰，深色模式下側欄與內容區各有一條白色捲軸 */
nav {
  scrollbar-width: thin;
  scrollbar-color: rgb(var(--t-stroke-default)) rgb(var(--t-surface-tertiary));
}
nav::-webkit-scrollbar { width: 6px; }
nav::-webkit-scrollbar-track { background: rgb(var(--t-surface-tertiary)); }
nav::-webkit-scrollbar-thumb { background: rgb(var(--t-stroke-default)); border-radius: 3px; }
nav::-webkit-scrollbar-thumb:hover { background: rgb(var(--t-stroke-medium)); }

main {
  scrollbar-width: thin;
  scrollbar-color: rgb(var(--t-stroke-default)) rgb(var(--t-surface-secondary));
}
main::-webkit-scrollbar { width: 8px; }
main::-webkit-scrollbar-track { background: rgb(var(--t-surface-secondary)); }
main::-webkit-scrollbar-thumb { background: rgb(var(--t-stroke-default)); border-radius: 4px; }
main::-webkit-scrollbar-thumb:hover { background: rgb(var(--t-stroke-medium)); }
</style>
