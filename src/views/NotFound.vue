<template>
  <div class="min-h-screen flex items-center justify-center px-6 py-16 bg-surface-secondary">
    <div class="w-full max-w-md text-center">
      <p class="text-6xl font-bold text-primary-600 tabular-nums">404</p>

      <h1 class="mt-4 text-2xl font-bold text-neutral-900">找不到這個頁面</h1>

      <p class="mt-3 text-sm text-neutral-600">
        路徑 <code class="bg-neutral-100 px-1.5 py-0.5 rounded font-mono text-xs break-all">{{ attemptedPath }}</code>
        不存在，可能已經改名或被移除。
      </p>

      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <ChptButton color="primary" label="回文件首頁" @click="goHome" />
        <ChptButton is-outline label="回上一頁" @click="goBack" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChptButton } from '@/components/library'

/**
 * NotFound - 404 頁
 *
 * 在此之前 router 沒有 catch-all 路由，打錯網址會得到一片白畫面
 * （RouterView 沒有匹配到任何元件，也不會有任何錯誤訊息）。
 */
const route = useRoute()
const router = useRouter()

const attemptedPath = computed(() => route.fullPath)

function goHome() {
  router.push('/docs')
}

function goBack() {
  // 沒有上一頁可回時（例如直接貼網址進來）退回文件首頁
  if (window.history.length > 1) router.back()
  else router.push('/docs')
}
</script>
