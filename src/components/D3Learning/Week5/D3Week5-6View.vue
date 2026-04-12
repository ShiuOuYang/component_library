<template>
  <div class="p-6 max-w-7xl mx-auto">
    <h1 class="text-4xl font-bold mb-6 text-purple-800">
      📅 第 5-6 週：Vue + D3 整合（框架整合）
    </h1>
    
    <p class="text-lg text-gray-700 mb-8">
      學習如何在 Vue 3 中以「可延展、可擴充、可架構化」的方式整合 D3.js：三種整合模式只是起點，重點是 Frame + Layers、關注點分離與標準化事件。
    </p>

    <!-- Tab 導航 -->
    <div class="flex gap-2 mb-6 border-b border-gray-200">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="[
          'px-6 py-3 font-medium transition-colors',
          activeTab === tab.id
            ? 'border-b-2 border-purple-600 text-purple-600'
            : 'text-gray-600 hover:text-purple-600'
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab 內容 -->
    <div class="tab-content">
      <component :is="currentTabComponent" />
    </div>

    <!-- 完成狀態 -->
    <div class="mt-8 p-6 bg-purple-50 border-l-4 border-purple-600 rounded">
      <h3 class="text-lg font-bold text-purple-800 mb-2">✅ 學習進度檢查</h3>
      <div class="space-y-2">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="progress.integration" class="w-4 h-4 text-purple-600 rounded">
          <span class="text-gray-700">理解 Vue + D3 三種整合模式（純 D3、混合、純 Vue）</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="progress.components" class="w-4 h-4 text-purple-600 rounded">
          <span class="text-gray-700">用 Frame + Layers 封裝可重用圖表（可擴充到多 series / 混合圖）</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="progress.props" class="w-4 h-4 text-purple-600 rounded">
          <span class="text-gray-700">設計可注入的 Props（scale/axis factory、renderer）與標準化事件 payload</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="progress.rwd" class="w-4 h-4 text-purple-600 rounded">
          <span class="text-gray-700">實作響應式設計（RWD）並避免全清空重畫</span>
        </label>
      </div>
      <div class="mt-4 text-sm text-purple-700">
        <strong>完成度：</strong>{{ completionPercentage }}%
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import VueD3Integration from './VueD3Integration.vue';
import ReusableComponents from './ReusableComponents.vue';
import DualAxisExample from './examples/DualAxisExample.vue';
import AdvancedFactoryExample from './examples/AdvancedFactoryExample.vue';

const activeTab = ref('integration');

const tabs = [
  { id: 'integration', label: '⚛️ 整合模式' },
  { id: 'components', label: '🧩 可重用元件' },
  { id: 'dual-axis', label: '📊 雙軸組合圖' },
  { id: 'factory', label: '🏭 配置工廠' }
];

const currentTabComponent = computed(() => {
  switch (activeTab.value) {
    case 'integration':
      return VueD3Integration;
    case 'components':
      return ReusableComponents;
    case 'dual-axis':
      return DualAxisExample;
    case 'factory':
      return AdvancedFactoryExample;
    default:
      return VueD3Integration;
  }
});

// 學習進度
const progress = ref({
  integration: false,
  components: false,
  props: false,
  rwd: false
});

const completionPercentage = computed(() => {
  const total = Object.keys(progress.value).length;
  const completed = Object.values(progress.value).filter(Boolean).length;
  return Math.round((completed / total) * 100);
});
</script>

<style scoped>
.tab-content {
  min-height: 500px;
}
</style>
