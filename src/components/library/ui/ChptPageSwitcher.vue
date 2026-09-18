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
        class="absolute left-2 top-0 bg-surface-primary/95 backdrop-blur-md rounded-r-xl shadow-2xl border-2 border-accent-subtle-border overflow-hidden"
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
          <button type="button"
            v-for="page in resolvedPages"
            :key="page.path"
            @click="navigateToPage(page.path)"
            :class="[
              'w-full px-4 py-2.5 text-left text-sm transition-all duration-200 flex items-center gap-3',
              isCurrentPage(page.path)
                ? 'bg-accent-subtle text-accent-strong font-medium border-l-4 border-stroke-focus'
                : 'text-content-primary hover:bg-surface-secondary hover:text-accent border-l-4 border-transparent'
            ]"
          >
            <!-- 圖標（未提供時留一個等寬的空位，讓各列標題仍然對齊） -->
            <component v-if="page.icon" :is="page.icon" class="w-4 h-4 flex-shrink-0" />
            <span v-else class="w-4 h-4 flex-shrink-0" aria-hidden="true" />

            <!-- 標題 -->
            <span class="flex-1">{{ page.title }}</span>

            <!-- 當前頁面指示器 -->
            <svg
              v-if="isCurrentPage(page.path)"
              class="w-4 h-4 text-accent"
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
        <div class="px-4 py-2 bg-surface-secondary text-xs text-content-tertiary border-t border-stroke-light">
          {{ props.footerHint }}
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, type VNode } from 'vue'
import { useOptionalRouter } from '@/components/library/shared/useOptionalRouter'

/**
 * ChptPageSwitcher（CHPT 主題） - 側邊頁面切換器
 *
 * 左側邊緣滑出面板，支援自訂頁面清單與標題。
 *
 * 導覽方式（依序取用第一個可用的）：
 *   1. 監聽 @select 事件自行處理
 *   2. 環境中有 vue-router 時自動 router.push()
 *
 * 目前頁面由 activePath 決定；未提供時才回頭讀當前路由。
 *
 * 註：原本這裡內建了 /ncn-dashboard、/yield-monitor、/spc-monitor 三個預設頁面，
 * 那是某一個應用的路由設定，不屬於通用組件庫，已移除 —— pages 現在是必要輸入。
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
  /** 目前頁面路徑。提供時進入受控模式（不再讀取當前路由） */
  activePath?: string
}

const props = withDefaults(defineProps<ChptPageSwitcherProps>(), {
  title: '頁面切換',
  pages: () => [],
  footerHint: '滑鼠移開自動收起',
  activePath: undefined,
})

const emit = defineEmits<{
  (e: 'select', page: PageSwitchItem): void
}>()

const { router, currentPath } = useOptionalRouter()

// 狀態
const isExpanded = ref(false)
let hideTimeout: ReturnType<typeof setTimeout> | null = null
let collapseTimeout: ReturnType<typeof setTimeout> | null = null

const resolvedPages = computed<PageSwitchItem[]>(() => props.pages)

/** 判斷是否為當前頁面：activePath 優先，其次才看路由 */
function isCurrentPage(path: string): boolean {
  return props.activePath !== undefined ? props.activePath === path : currentPath.value === path
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
  const page = resolvedPages.value.find((p) => p.path === path)
  if (page) emit('select', page)

  // 有 router 就自動導航；沒有的話交給使用端在 @select 裡處理
  if (router && currentPath.value !== path) {
    router.push(path)
  }

  collapseTimeout = setTimeout(() => {
    isExpanded.value = false
  }, 200)
}

// 元件卸載時清掉計時器，避免在已銷毀的元件上改狀態
onBeforeUnmount(() => {
  if (hideTimeout) clearTimeout(hideTimeout)
  if (collapseTimeout) clearTimeout(collapseTimeout)
})
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
