<template>
  <!-- 觸發區域：左側邊緣的細長條 -->
  <div
    class="fixed left-0 top-1/2 -translate-y-1/2 z-50 transition-all duration-300"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- 永久可見的觸發條 - 提升存在感 -->
    <div
      class="w-1.5 h-40 bg-gradient-to-b from-indigo-400 via-indigo-500 to-indigo-400 opacity-50 hover:opacity-90 hover:w-2 transition-all duration-300 cursor-pointer rounded-r-full shadow-lg"
    ></div>

    <!-- 展開的菜單面板 -->
    <transition name="slide-fade">
      <div
        v-if="isExpanded"
        class="absolute left-2 top-0 bg-white/98 backdrop-blur-md rounded-r-xl shadow-2xl border-2 border-indigo-200 overflow-hidden"
        style="min-width: 220px"
      >
        <!-- 頂部標題 -->
        <div class="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12M8 12h12M8 17h12M3 7h.01M3 12h.01M3 17h.01"/>
          </svg>
          頁面切換
        </div>

        <!-- 頁面選項 -->
        <div class="py-1">
          <button
            v-for="page in pages"
            :key="page.path"
            @click="navigateToPage(page.path)"
            :class="[
              'w-full px-4 py-2.5 text-left text-sm transition-all duration-200 flex items-center gap-3',
              isCurrentPage(page.path)
                ? 'bg-indigo-50 text-indigo-700 font-medium border-l-4 border-indigo-600'
                : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600 border-l-4 border-transparent'
            ]"
          >
            <!-- 圖標 -->
            <component :is="page.icon" class="w-4 h-4 flex-shrink-0" />
            
            <!-- 標題 -->
            <span class="flex-1">{{ page.title }}</span>
            
            <!-- 當前頁面指示器 -->
            <svg
              v-if="isCurrentPage(page.path)"
              class="w-4 h-4 text-indigo-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>

        <!-- 底部提示 -->
        <div class="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-200">
          滑鼠移開自動收起
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'

// Router
const router = useRouter()
const route = useRoute()

// 狀態
const isExpanded = ref(false)
let hideTimeout = null

// 頁面配置
const pages = [
  {
    path: '/ncn-dashboard',
    title: 'NCN Monitor',
    icon: h('svg', {
      class: 'w-4 h-4',
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24'
    }, [
      h('path', {
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-width': '2',
        d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
      })
    ])
  },
  {
    path: '/yield-monitor',
    title: 'Yield Monitor',
    icon: h('svg', {
      class: 'w-4 h-4',
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24'
    }, [
      h('path', {
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-width': '2',
        d: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z'
      })
    ])
  },
  {
    path: '/spc-monitor',
    title: 'SPC Monitor',
    icon: h('svg', {
      class: 'w-4 h-4',
      fill: 'none',
      stroke: 'currentColor',
      viewBox: '0 0 24 24'
    }, [
      h('path', {
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'stroke-width': '2',
        d: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z'
      })
    ])
  }
]

// 計算屬性
const isCurrentPage = (path) => {
  return route.path === path
}

// 方法
const handleMouseEnter = () => {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
  isExpanded.value = true
}

const handleMouseLeave = () => {
  hideTimeout = setTimeout(() => {
    isExpanded.value = false
  }, 300) // 300ms 延遲，避免意外關閉
}

const navigateToPage = (path) => {
  if (route.path !== path) {
    router.push(path)
  }
  // 導航後稍微延遲關閉，讓用戶看到選中效果
  setTimeout(() => {
    isExpanded.value = false
  }, 200)
}
</script>

<style scoped>
/* 滑入滑出動畫 */
.slide-fade-enter-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from {
  transform: translateX(-10px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-10px);
  opacity: 0;
}

/* 按鈕懸停效果 */
button {
  position: relative;
  overflow: hidden;
}

button::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
  transition: width 0.3s ease;
}

button:hover::before {
  width: 100%;
}
</style>
