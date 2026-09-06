<template>
  <div class="min-h-screen bg-neutral-50">
    <!-- Hero Section -->
    <section class="py-16 px-8 bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <div class="max-w-5xl mx-auto text-center">
        <div class="inline-flex items-center justify-center w-20 h-20 mb-6 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl shadow-lg">
          <span class="text-4xl text-white">🧩</span>
        </div>

        <h1 class="text-5xl font-extrabold text-neutral-900 mb-6">
          Vue 3 企業級組件庫
        </h1>

        <p class="text-xl text-neutral-600 mb-8 max-w-3xl mx-auto leading-relaxed">
          一套以<span class="font-semibold text-primary-600">設計 token</span>驅動的組件庫，
          涵蓋表單、資料、反饋、浮層、佈局、圖表、檢視器與 Excel。
          統一色票、圓角、動效，企業專案開箱即用。
        </p>

        <div class="flex flex-wrap justify-center gap-4 mb-12">
          <router-link
            to="/docs/components/form-atoms"
            class="px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
          >
            🚀 開始探索
          </router-link>

          <router-link
            to="/docs/guide/getting-started"
            class="px-8 py-3 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold rounded-lg shadow-md border-2 border-neutral-200 transition-all duration-200"
          >
            📖 查看指南
          </router-link>
        </div>

        <!-- 技術棧標籤 -->
        <div class="flex flex-wrap justify-center gap-3">
          <span class="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">Vue 3 + TypeScript</span>
          <span class="px-4 py-2 bg-success-100 text-success-700 rounded-full text-sm font-medium">Tailwind + 設計 Token</span>
          <span class="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-full text-sm font-medium">統一設計系統</span>
          <span class="px-4 py-2 bg-warning-100 text-warning-800 rounded-full text-sm font-medium">企業級元件</span>
        </div>
      </div>
    </section>

    <!-- 分類速覽 -->
    <section class="py-14 px-4">
      <div class="w-full">
        <h2 class="text-3xl font-bold text-neutral-900 text-center mb-12">元件總覽</h2>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <router-link
            v-for="group in groups"
            :key="group.to"
            :to="group.to"
            class="block p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-neutral-200 group"
          >
            <div class="flex items-start justify-between mb-3">
              <span class="text-4xl">{{ group.icon }}</span>
              <span class="px-2 py-1 text-xs font-semibold bg-primary-100 text-primary-700 rounded-full">
                {{ group.badge }}
              </span>
            </div>
            <h3 class="text-lg font-bold text-neutral-900 mb-2 group-hover:text-primary-600 transition-colors">
              {{ group.title }}
            </h3>
            <p class="text-sm text-neutral-600">{{ group.description }}</p>
          </router-link>
        </div>
      </div>
    </section>

    <!-- 快速開始 -->
    <section class="py-14 px-8">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-3xl font-bold text-neutral-900 text-center mb-12">快速開始</h2>

        <div class="bg-white rounded-xl shadow-lg p-8 border border-neutral-200">
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-neutral-900 mb-3 flex items-center">
              <span class="mr-2">1️⃣</span> 引入正式入口
            </h3>
            <div class="bg-neutral-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-success-400 text-sm font-mono"><code>import { ChptButton, ChptInput, ChptTable } from '@/components/library'</code></pre>
            </div>
          </div>

          <div class="mb-6">
            <h3 class="text-lg font-semibold text-neutral-900 mb-3 flex items-center">
              <span class="mr-2">2️⃣</span> 圖表 / 檢視器 / Excel 分群引入
            </h3>
            <div class="bg-neutral-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-success-400 text-sm font-mono"><code>import { DualAxisComboChart } from '@/components/library/charts'
import { GerberViewer } from '@/components/library/viewer'
import { ChptExcelEditor } from '@/components/library/excel'</code></pre>
            </div>
          </div>

          <div>
            <h3 class="text-lg font-semibold text-neutral-900 mb-3 flex items-center">
              <span class="mr-2">3️⃣</span> 使用元件
            </h3>
            <div class="bg-neutral-900 rounded-lg p-4 overflow-x-auto">
              <pre class="text-success-400 text-sm font-mono"><code><template>
  <ChptButton color="primary" label="儲存" />
  <ChptTable :columns="columns" :data="rows" />
</template></code></pre>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 底部 CTA -->
    <section class="py-16 px-8 bg-gradient-to-r from-primary-600 to-secondary-600">
      <div class="max-w-4xl mx-auto text-center">
        <h2 class="text-3xl font-bold text-white mb-6">準備好開始了嗎？</h2>
        <p class="text-xl text-primary-100 mb-8">探索每一群元件文檔，快速建置你的企業應用</p>
        <router-link
          to="/docs/components/form-atoms"
          class="inline-block px-8 py-4 bg-white hover:bg-neutral-100 text-primary-600 font-bold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          查看組件文檔 →
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
// 純展示頁面（資料驅動）
const groups = [
  { to: '/docs/components/form-atoms', icon: '🧩', title: '表單元件', badge: 'UI', description: 'Input / Select / Radio / Checkbox / Switch / DatePicker / Textarea' },
  { to: '/docs/components/data-filter', icon: '📊', title: '資料與過濾', badge: 'UI', description: 'ChptTable / ChptFixedTable / ChptPagination / ChptFilter / ChptFilterBar' },
  { to: '/docs/components/feedback', icon: '🛎️', title: '反饋元件', badge: 'UI', description: 'Alert / Badge / Tag / Toast / Progress / Spinner / Empty / Skeleton' },
  { to: '/docs/components/interactive', icon: '🖱️', title: '互動元件', badge: 'UI', description: 'Button / Avatar / Icon / Tabs / Steps' },
  { to: '/docs/components/overlay', icon: '🗔', title: '浮層元件', badge: 'UI', description: 'Modal / Drawer / Popconfirm / ModalDock / Toast' },
  { to: '/docs/components/layout-nav', icon: '🧱', title: '佈局與流程', badge: 'UI', description: 'Card / Collapse / Breadcrumb / Divider / TabNavigation' },
  { to: '/docs/components/dual-axis-chart', icon: '📈', title: '圖表 Charts', badge: 'Charts', description: '雙軸組合 / 柏拉圖 / 熱力圖（D3、可縮放）' },
  { to: '/docs/components/gerber-viewer', icon: '🔬', title: '檢視器 Viewer', badge: 'Viewer', description: 'Gerber / PCB / Schematic 領域檢視器' },
  { to: '/docs/components/excel-editor', icon: '📑', title: 'Excel', badge: 'Excel', description: '線上試算表編輯器 / 匯出 / 匯入' },
  { to: '/docs/components/whiteboard', icon: '📝', title: 'Whiteboard', badge: 'Demo', description: '多頁白板、筆刷、幾何圖形、匯出 PNG/SVG' },
  { to: '/docs/guide/getting-started', icon: '🚀', title: '開發指南', badge: 'Guide', description: '快速開始、安裝與最佳實踐' },
];
</script>

<style scoped>
/* 程式碼區塊滾動條樣式 */
pre {
  scrollbar-width: thin;
  scrollbar-color: #525252 #262626;
}

pre::-webkit-scrollbar {
  height: 6px;
}

pre::-webkit-scrollbar-track {
  background: #262626;
}

pre::-webkit-scrollbar-thumb {
  background: #525252;
  border-radius: 3px;
}

pre::-webkit-scrollbar-thumb:hover {
  background: #737373;
}
</style>
