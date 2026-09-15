<template>
  <div class="relative inline-block">
    <!-- 標籤頁導航 -->
    <div
      class="flex items-center p-1.5 bg-neutral-100/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-xl border border-neutral-200/50 dark:border-neutral-700/50 shadow-inner"
      role="tablist"
    >
      <component
        :is="linkTag"
        v-for="tab in props.tabs"
        :key="tab.path"
        v-bind="linkProps(tab.path)"
        role="tab"
        :aria-selected="isActive(tab.path)"
        class="relative px-6 py-2 font-medium rounded-lg transition-all duration-300 ease-out group min-w-[100px] text-center"
        :class="[
          props.fontSize,
          isActive(tab.path)
            ? 'bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.1)] ring-1 ring-black/5 dark:ring-white/10 transform scale-[1.02]'
            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-white/40 dark:hover:bg-neutral-900/40'
        ]"
        @click="handleSelect(tab)"
      >
        <span class="relative z-10">{{ tab.label }}</span>
      </component>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useOptionalRouter } from '@/components/library/shared/useOptionalRouter'

/**
 * ChptTabNavigation（CHPT 主題）- 頁籤導航
 *
 * 兩種使用模式：
 *
 * 1. 路由模式（預設）—— 環境中有 vue-router 時，以 <router-link> 導航，
 *    目前頁籤由當前路由自動判斷：
 *    ```vue
 *    <ChptTabNavigation :tabs="tabs" />
 *    ```
 *
 * 2. 受控模式 —— 傳入 activePath 即由外部決定選中項，
 *    不需要 router 也能運作（Storybook / 測試 / 非路由頁面）：
 *    ```vue
 *    <ChptTabNavigation :tabs="tabs" :active-path="current" @select="current = $event.path" />
 *    ```
 *
 * 之所以不再直接呼叫 useRoute()：那會讓元件硬性要求使用端一定要有 router 實例，
 * 沒有的話直接拿到 undefined 而崩潰。
 */

interface TabNavigationItem {
  path: string
  label: string
}

interface ChptTabNavigationProps {
  /** 頁籤清單 */
  tabs?: TabNavigationItem[]
  /** 字體大小 class */
  fontSize?: string
  /**
   * 目前選中的路徑。提供時進入受控模式（不再讀取當前路由）。
   */
  activePath?: string
}

const props = withDefaults(defineProps<ChptTabNavigationProps>(), {
  tabs: () => [],
  fontSize: 'text-sm',
  activePath: undefined,
})

const emit = defineEmits<{
  (e: 'select', tab: TabNavigationItem): void
}>()

const { hasRouter, currentPath } = useOptionalRouter()

/**
 * 有 router 時用 RouterLink，否則退回一般 <a>。
 * 直接 import 元件而非 resolveComponent('RouterLink')：後者只能在 setup / render
 * 期間呼叫，放進 computed 會讓 Vue 在每次求值時發出警告。
 */
const linkTag = computed(() => (hasRouter.value ? RouterLink : 'a'))

function linkProps(path: string): Record<string, unknown> {
  return hasRouter.value ? { to: path } : { href: path }
}

/** 判斷頁籤是否為當前項：activePath 優先，其次才看路由 */
function isActive(path: string): boolean {
  return props.activePath !== undefined ? props.activePath === path : currentPath.value === path
}

function handleSelect(tab: TabNavigationItem): void {
  emit('select', tab)
}
</script>
