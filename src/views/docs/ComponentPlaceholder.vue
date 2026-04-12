<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-8">
    <div class="w-full">
      
      <!-- 標題與簡介 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <div class="border-l-4 border-purple-600 pl-6">
          <h1 class="text-4xl font-bold text-gray-900 mb-4">
            {{ componentName }}
          </h1>
          <p class="text-lg text-gray-600 leading-relaxed">
            {{ componentDescription }}
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Vue 3</span>
            <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">D3.js</span>
            <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">Composition API</span>
            <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">Tailwind CSS</span>
          </div>
        </div>
      </div>

      <!-- 開發中提示 -->
      <div class="bg-yellow-50 border-2 border-yellow-200 rounded-2xl shadow-lg p-12 mb-8 text-center">
        <div class="inline-flex items-center justify-center w-20 h-20 mb-6 bg-yellow-100 rounded-full">
          <span class="text-5xl">🚧</span>
        </div>
        <h2 class="text-3xl font-bold text-gray-900 mb-4">
          {{ statusText }}
        </h2>
        <p class="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
          {{ statusMessage }}
        </p>
        <div class="inline-flex items-center px-6 py-3 bg-yellow-100 text-yellow-800 rounded-lg font-medium">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
          </svg>
          預計完成時間：{{ estimatedDate }}
        </div>
      </div>

      <!-- 互動操場 (Interactive Playground) - 佔位區域 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-blue-600 mr-3">🎮</span>
          互動操場 (Interactive Playground)
        </h2>
        
        <div class="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
          <span class="text-6xl mb-4 block">📊</span>
          <p class="text-gray-500 text-lg">組件預覽區域（開發中）</p>
        </div>
      </div>

      <!-- 場景範例 (Use Cases) - 佔位區域 -->
      <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-green-600 mr-3">📊</span>
          場景範例 (Use Cases)
        </h2>

        <div class="grid md:grid-cols-2 gap-6">
          <div class="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
            <span class="text-4xl mb-3 block">💡</span>
            <h3 class="text-lg font-semibold text-gray-700 mb-2">範例 A</h3>
            <p class="text-gray-500">使用場景範例 1</p>
          </div>
          
          <div class="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
            <span class="text-4xl mb-3 block">💡</span>
            <h3 class="text-lg font-semibold text-gray-700 mb-2">範例 B</h3>
            <p class="text-gray-500">使用場景範例 2</p>
          </div>
        </div>
      </div>

      <!-- API 文件 (Props & Events) -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <span class="text-purple-600 mr-3">📚</span>
          API 文件
        </h2>

        <!-- Props -->
        <div class="mb-8">
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">Props</h3>
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p class="text-gray-500">Props 文檔（待補充）</p>
          </div>
        </div>

        <!-- Events -->
        <div>
          <h3 class="text-2xl font-semibold text-gray-800 mb-4">Events</h3>
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p class="text-gray-500">Events 文檔（待補充）</p>
          </div>
        </div>
      </div>

      <!-- 貢獻指南 -->
      <div class="mt-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
        <h3 class="text-2xl font-bold mb-4">想要貢獻？</h3>
        <p class="text-blue-100 mb-6">
          如果你對這個組件有想法或願意協助開發，歡迎提交 Pull Request 或在團隊會議中提出討論！
        </p>
        <div class="flex gap-4">
          <button class="px-6 py-3 bg-white hover:bg-gray-100 text-blue-600 font-semibold rounded-lg transition-colors">
            查看開發指南
          </button>
          <button class="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg transition-colors">
            聯繫團隊
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// ========== 組件資訊配置 ==========
// 📝 複製此範本時，請修改以下資訊

const componentName = ref('組件名稱');
const componentDescription = ref('在此處填寫組件的簡短描述，說明其主要功能與適用場景。');

// 開發狀態：'planning' | 'in-progress' | 'completed'
const status = ref('planning');

const statusConfig = {
  planning: {
    text: '開發計畫中',
    message: '此組件目前處於規劃階段，我們正在收集需求與設計 API。',
    estimatedDate: '待定'
  },
  'in-progress': {
    text: '開發進行中',
    message: '此組件正在積極開發中，預計近期完成。',
    estimatedDate: '2 週內'
  },
  completed: {
    text: '已完成',
    message: '此組件已完成開發並可供使用。',
    estimatedDate: '-'
  }
};

const statusText = ref(statusConfig[status.value].text);
const statusMessage = ref(statusConfig[status.value].message);
const estimatedDate = ref(statusConfig[status.value].estimatedDate);

// ========== 使用說明 ==========
/**
 * 📋 如何使用此範本：
 * 
 * 1. 複製此檔案到 src/views/docs/ 目錄
 * 2. 重新命名為你的組件名稱，例如：PieChartDoc.vue
 * 3. 修改上方的 componentName、componentDescription、status
 * 4. 在 router/index.js 中新增路由
 * 5. 在 DocLayout.vue 的側邊欄中新增連結
 * 6. 開始填寫組件文檔內容
 * 
 * 💡 建議開發順序：
 * 1. 先完成「標題與簡介」區塊
 * 2. 實作「互動操場」（最重要）
 * 3. 新增 2-3 個「場景範例」
 * 4. 整理「API 文件」表格
 * 5. 最後調整樣式與細節
 */
</script>

<style scoped>
/* 此範本使用 Tailwind CSS，無需額外樣式 */
</style>
