<template>
  <!-- 觸發區域：左側邊緣的細長條 -->
  <div
    class="fixed left-0 top-1/2 -translate-y-1/2 z-50 transition-all duration-300"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- 永久可見的觸發條 -->
    <div
      class="w-1.5 h-40 bg-gradient-to-b from-primary-400 via-primary-500 to-primary-400 opacity-50 hover:opacity-90 hover:w-2 transition-all duration-300 cursor-pointer rounded-r-full shadow-lg"
    ></div>

    <!-- 展開的菜單面板 -->
    <transition name="slide-fade">
      <div
        v-if="isExpanded"
        class="absolute left-2 top-0 bg-white/98 backdrop-blur-md rounded-r-xl shadow-2xl border-2 border-primary-200 overflow-hidden"
        style="min-width: 220px"
      >
        <!-- 頂部標題 -->
        <div class="px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-semibold flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12M8 12h12M8 17h12M3 7h.01M3 12h.01M3 17h.01"/>
          </svg>
          {{ props.title }}
        </div>

        <!-- 頁面選項 -->
        <div class="py-1">
          <button
            v-for="page in resolvedPages"
            :key="page.path"
            @click="navigateToPage(page.path)"
            :class="[
              'w-full px-4 py-2.5 text-left text-sm transition-all duration-200 flex items-center gap-3',
              isCurrentPage(page.path)
                ? 'bg-primary-50 text-primary-700 font-medium border-l-4 border-primary-600'
                : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary-600 border-l-4 border-transparent'
            ]"
          >
            <!-- 圖標 -->
            <component :is="page.icon || fallbackIcon" class="w-4 h-4 flex-shrink-0" />

            <!-- 標題 -->
            <span class="flex-1">{{ page.title }}</span>

            <!-- 當前頁面指示器 -->
            <svg
              v-if="isCurrentPage(page.path)"
              class="w-4 h-4 text-primary-600"
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
        <div class="px-4 py-2 bg-neutral-50 text-xs text-neutral-500 border-t border-neutral-200">
          {{ props.footerHint }}
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, type VNode } from 'vue'
import { useRouter, useRoute } from 'vue-router'

/**
 * ChptPageSwitcher（CHPT 主題） - 側邊頁面切換器
 *
 * 整合原 PageSwitcher：
 * - 完整 Props 型別定義（interface + withDefaults）
 * - 左側邊緣滑出面板，支援自訂頁面清單與標題
 */

interface PageSwitchItem {
  path: string
  title: string
  icon?: VNode
}

interface ChptPageSwitcherProps {
  /** 面板標題 */
  title?: string
  /** 頁面選項清單 */
  pages?: PageSwitchItem[]
  /** 底部提示文字 */
  footerHint?: string
}

const props = withDefaults(defineProps<ChptPageSwitcherProps>(), {
  title: '頁面切換',
  pages: () => [],
  footerHint: '滑鼠移開自動收起',
})

// Router
const router = useRouter()
const route = useRoute()

// 狀態
const isExpanded = ref(false)
let hideTimeout: ReturnType<typeof setTimeout> | null = null

/** 內建預設頁面配置 */
const fallbackIcon = h('svg', { class: 'w-4 h-4' })

const defaultPages: PageSwitchItem[] = [
  { path: '/ncn-dashboard', title: 'NCN Monitor' },
  { path: '/yield-monitor', title: 'Yield Monitor' },
  { path: '/spc-monitor', title: 'SPC Monitor' },
]

/** 解析後的頁面清單（未提供時使用內建預設） */
const resolvedPages = computed<PageSwitchItem[]>(() =>
  props.pages.length > 0 ? props.pages : defaultPages
)

/** 判斷是否為當前頁面 */
function isCurrentPage(path: string): boolean {
  return route.path === path
}

function handleMouseEnter(): void {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
  isExpanded.value = true
}

function handleMouseLeave(): void {
  hideTimeout = setTimeout(() => {
    isExpanded.value = false
  }, 300)
}

function navigateToPage(path: string): void {
  if (route.path !== path) {
    router.push(path)
  }
  setTimeout(() => {
    isExpanded.value = false
  }, 200)
}
</script>

<style scoped>
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
  background: linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.1), transparent);
  transition: width 0.3s ease;
}
button:hover::before {
  width: 100%;
}
</style>
