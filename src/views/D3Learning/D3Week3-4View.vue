<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- 頁面標題 -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-4xl font-bold text-gray-800 mb-2">Week 3-4: D3 核心邏輯</h1>
            <p class="text-gray-600">掌握 D3.js 的核心概念：Selections、Data Binding、Scales 和 Axes</p>
          </div>
          <button type="button" 
            @click="$router.push('/d3-learning')"
            class="flex items-center px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-gray-700 hover:text-gray-900"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            返回總覽
          </button>
        </div>
      </div>

      <!-- 導航標籤 -->
      <div class="mb-6 bg-white rounded-lg shadow p-2 flex gap-2">
        <button type="button"
          v-for="(tab, index) in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'flex-1 py-3 px-4 rounded-lg font-semibold transition-all',
            activeTab === tab.id
              ? tab.activeClass
              : 'text-gray-600 hover:bg-gray-100'
          ]"
        >
          {{ index + 1 }}. {{ tab.name }}
        </button>
      </div>

      <!-- 內容區域 -->
      <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <component :is="currentComponent" />
      </div>

      <!-- 進度指示器 -->
      <div class="mt-8 bg-white rounded-lg shadow p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-gray-800">學習進度</h3>
          <span class="text-sm text-gray-600">{{ currentProgress }}/4 完成</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3">
          <div 
            class="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
            :style="{ width: progressPercentage + '%' }"
          ></div>
        </div>
        <div class="mt-4 grid grid-cols-4 gap-2">
          <div 
            v-for="tab in tabs"
            :key="tab.id"
            :class="[
              'text-center py-2 px-3 rounded text-sm font-semibold',
              activeTab === tab.id
                ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700'
                : 'bg-gray-50 text-gray-500'
            ]"
          >
            {{ tab.name }}
          </div>
        </div>
      </div>

      <!-- 導航按鈕 -->
      <div class="mt-6 flex justify-between">
        <button type="button"
          @click="previousTab"
          :disabled="activeTab === 'selections'"
          :class="[
            'flex items-center px-6 py-3 rounded-lg font-semibold transition-all',
            activeTab === 'selections'
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50 shadow hover:shadow-md'
          ]"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          上一個主題
        </button>
        
        <button type="button"
          @click="nextTab"
          :disabled="activeTab === 'axes'"
          :class="[
            'flex items-center px-6 py-3 rounded-lg font-semibold transition-all',
            activeTab === 'axes'
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
          ]"
        >
          下一個主題
          <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import D3Selections from '@/components/D3Learning/Week3/D3Selections.vue';
import D3DataBinding from '@/components/D3Learning/Week3/D3DataBinding.vue';
import D3Scales from '@/components/D3Learning/Week3/D3Scales.vue';
import D3Axes from '@/components/D3Learning/Week3/D3Axes.vue';

const activeTab = ref('selections');
const currentProgress = ref(0);

const tabs = [
  { 
    id: 'selections', 
    name: 'Selections', 
    component: D3Selections,
    activeClass: 'bg-purple-600 text-white shadow-lg'
  },
  { 
    id: 'dataBinding', 
    name: 'Data Binding', 
    component: D3DataBinding,
    activeClass: 'bg-blue-600 text-white shadow-lg'
  },
  { 
    id: 'scales', 
    name: 'Scales', 
    component: D3Scales,
    activeClass: 'bg-green-600 text-white shadow-lg'
  },
  { 
    id: 'axes', 
    name: 'Axes', 
    component: D3Axes,
    activeClass: 'bg-orange-600 text-white shadow-lg'
  }
];

const currentComponent = computed(() => {
  const tab = tabs.find(t => t.id === activeTab.value);
  return tab ? tab.component : D3Selections;
});

const progressPercentage = computed(() => {
  return (currentProgress.value / tabs.length) * 100;
});

const previousTab = () => {
  const currentIndex = tabs.findIndex(t => t.id === activeTab.value);
  if (currentIndex > 0) {
    activeTab.value = tabs[currentIndex - 1].id;
  }
};

const nextTab = () => {
  const currentIndex = tabs.findIndex(t => t.id === activeTab.value);
  if (currentIndex < tabs.length - 1) {
    activeTab.value = tabs[currentIndex + 1].id;
    if (currentIndex + 1 > currentProgress.value) {
      currentProgress.value = currentIndex + 1;
    }
  }
};
</script>
