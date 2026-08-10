<template>
  <div class="relative inline-block">
    <!-- 標籤頁導航 -->
    <div class="flex items-center p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-inner">
      <router-link
        v-for="tab in props.tabs"
        :key="tab.path"
        :to="tab.path"
        class="relative px-6 py-2 font-medium rounded-lg transition-all duration-300 ease-out group min-w-[100px] text-center"
        :class="[
          props.fontSize,
          isActive(tab.path)
            ? 'bg-white text-slate-800 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.1)] ring-1 ring-black/5 transform scale-[1.02]'
            : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
        ]"
      >
        <span class="relative z-10">{{ tab.label }}</span>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

/**
 * ChptTabNavigation（CHPT 主題）- 頁籤導航
 *
 * 整合原 TabNavigation：
 * - 完整 Props 型別定義（interface + withDefaults）
 * - tabs 描述頁籤（path / label），以 router-link 導航
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
}

const props = withDefaults(defineProps<ChptTabNavigationProps>(), {
  tabs: () => [],
  fontSize: 'text-sm',
})

const route = useRoute()

/** 判斷當前路由是否激活 */
function isActive(path: string): boolean {
  return route.path === path
}
</script>
