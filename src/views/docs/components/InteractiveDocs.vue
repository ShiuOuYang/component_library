<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">🖱️</span>
        <h1 class="text-4xl font-bold text-neutral-900">互動元件</h1>
      </div>
      <p class="text-neutral-600 text-lg max-w-3xl">
        ChptTabs（頁籤）、ChptToast（全域提示）、ChptButton、ChptProgress、ChptAlert 等互動/回饋元件。
      </p>
    </div>

    <!-- ChptTabs -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptTabs 頁籤</h2>
      <p class="text-sm text-neutral-600 mb-4">
        以 tabs 陣列定義（label / icon / badge），支援 panel-N 插槽自訂每個面板內容。
      </p>

      <ChptTabs v-model="activeTab" :tabs="tabs" />

      <div class="mt-6 bg-neutral-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-success-400 text-sm font-mono"><code><ChptTabs v-model="activeTab" :tabs="tabs">
  <template #panel-0>頁籤一面板</template>
</ChptTabs></code></pre>
      </div>
    </section>

    <!-- ChptToast -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200">
      <h2 class="text-2xl font-bold text-neutral-900 mb-6 flex items-center">
        <span class="mr-3">🛎️</span>ChptToast 全域提示
      </h2>
      <div class="flex flex-wrap gap-3">
        <ChptButton color="success" size="sm" @click="toast.success('操作成功')">Success</ChptButton>
        <ChptButton color="info" size="sm" @click="toast.info('此為資訊提示')">Info</ChptButton>
        <ChptButton color="warning" size="sm" @click="toast.warning('請留意此警告')">Warning</ChptButton>
        <ChptButton color="danger" size="sm" @click="toast.error('操作失敗')">Error</ChptButton>
      </div>
      <p class="text-sm text-neutral-500 mt-4">
        於 App 根層掛載一次 <code><ChptToast /></code>，即可由任一頁面呼叫 <code>useToast()</code>。
      </p>

      <div class="mt-4 bg-neutral-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-success-400 text-sm font-mono"><code>import { ChptToast, useToast } from '@/components/library'
const toast = useToast()
toast.success('操作成功')</code></pre>
      </div>
    </section>

    <!-- 其他 -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200">
      <h2 class="text-2xl font-bold text-neutral-900 mb-6 flex items-center">
        <span class="mr-3">🧩</span>Button / Progress / Alert
      </h2>
      <div class="space-y-6">
        <div class="flex items-center gap-3">
          <ChptButton color="primary" size="sm" @click="progress = Math.min(100, progress + 10)">+10%</ChptButton>
          <ChptProgress v-model="progress" status="primary" style="max-width: 260px" />
        </div>
        <ChptAlert show type="success" title="完成" message="此區示範 Button / Progress / Alert 的組合運用。" />
        <ChptAlert show type="info" title="提示" message="設計 token 色票讓各元件外觀一致。" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  ChptTabs,
  ChptToast,
  useToast,
  ChptButton,
  ChptProgress,
  ChptAlert,
} from '@/components/library'

const activeTab = ref(0)
const tabs = [
  { label: '儀表板', icon: 'dashboard' },
  { label: '趨勢', icon: 'trending_up', badge: 3 },
  { label: '設定', icon: 'settings' },
]

const toast = useToast()
const progress = ref(30)
</script>
