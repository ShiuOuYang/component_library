<template>
  <div class="d3-learning-container p-6">
    <h1 class="text-2xl font-bold mb-6 text-gray-800 border-b-2 border-blue-500 pb-2">
      D3.js 學習之旅 - 階段一：基石與原理
    </h1>
    
    <div class="flex flex-col md:flex-row gap-6">
      <!-- 側邊導航 -->
      <div class="w-full md:w-64 flex-shrink-0">
        <div class="bg-white rounded-lg shadow-md p-4 sticky top-4">
          <h2 class="text-lg font-semibold mb-4 text-gray-700">課程目錄</h2>
          <nav class="flex flex-col space-y-2">
            <button type="button" 
              v-for="tab in tabs" 
              :key="tab.id"
              @click="currentTab = tab.id"
              class="text-left px-4 py-2 rounded transition-colors duration-200"
              :class="currentTab === tab.id ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100 text-gray-600'"
            >
              {{ tab.name }}
            </button>
          </nav>
        </div>
      </div>

      <!-- 內容區域 -->
      <div class="flex-1 bg-white rounded-lg shadow-md p-6 min-h-[600px]">
        <component :is="currentTabComponent" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import SvgBasics from '@/components/D3Learning/Week1/SvgBasics.vue';
import SvgCoordinates from '@/components/D3Learning/Week1/SvgCoordinates.vue';
import ManualBarChart from '@/components/D3Learning/Week1/ManualBarChart.vue';
import VanillaJsSvg from '@/components/D3Learning/Week1/VanillaJsSvg.vue';

const tabs = [
  { id: 'basics', name: '1. SVG 基礎形狀', component: SvgBasics },
  { id: 'coordinates', name: '2. 座標系統與變換', component: SvgCoordinates },
  { id: 'manual-chart', name: '3. 手寫長條圖', component: ManualBarChart },
  { id: 'vanilla-js', name: '4. Vanilla JS 操作 SVG', component: VanillaJsSvg },
];

const currentTab = ref('basics');

const currentTabComponent = computed(() => {
  const tab = tabs.find(t => t.id === currentTab.value);
  return tab ? tab.component : SvgBasics;
});
</script>

<style scoped>
.d3-learning-container {
  background-color: #f3f4f6;
  min-height: 100vh;
}
</style>
