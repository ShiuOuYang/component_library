<template>
  <div class="relative inline-block">
    <!-- 標籤頁導航 -->
    <div class="flex items-center p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-inner">
      <router-link
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        class="relative px-6 py-2 font-medium rounded-lg transition-all duration-300 ease-out group min-w-[100px] text-center"
        :class="[
          fontSize,
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

<script setup>
import { useRoute } from 'vue-router'

const props = defineProps({
  tabs: {
    type: Array,
    required: true,
    default: () => []
  },
  fontSize: {
    type: String,
    default: 'text-sm'
  }
})

const route = useRoute()

// 判斷當前路由是否激活
const isActive = (path) => {
  return route.path === path
}
</script>


