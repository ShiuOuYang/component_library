<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <div class="w-16 h-16 bg-gradient-to-br from-lime-500 to-green-600 rounded-xl flex items-center justify-center">
          <span class="text-3xl">🖱️</span>
        </div>
        <div>
          <h1 class="text-4xl font-bold text-gray-900">互動元件</h1>
          <p class="text-lg text-gray-600 mt-1">ChptTabs / ChptToast</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mt-6">
        <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">✓ 完成</span>
        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Vue 3</span>
        <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">Composable</span>
      </div>
    </div>

    <!-- ChptTabs -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">📑</span>ChptTabs 選項卡
      </h2>

      <ChptTabs v-model="activeTab" :tabs="tabs" @change="onTabChange">
        <template #panel-0>
          <p class="text-sm text-gray-600">這是第一個面板的內容。</p>
        </template>
        <template #panel-1>
          <div class="flex items-center gap-4">
            <ChptProgress :model-value="80" status="success" class="flex-1" />
            <span class="text-sm text-gray-500">進度 80%</span>
          </div>
        </template>
        <template #panel-2>
          <ChptAlert type="info" message="此面板展示 ChptAlert 元件" />
        </template>
      </ChptTabs>

      <div class="mt-8 bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>const tabs = [
  { label: '總覽', icon: 'dashboard' },
  { label: '進度', icon: 'trending_up', badge: 3 },
  { label: '設定', icon: 'settings' }
]

&lt;ChptTabs v-model="activeTab" :tabs="tabs"&gt;
  &lt;template #panel-0&gt;第一個面板&lt;/template&gt;
  &lt;template #panel-1&gt;第二個面板&lt;/template&gt;
&lt;/ChptTabs&gt;</code></pre>
      </div>
      <p class="mt-4 text-sm text-gray-500">
        <strong>Props：</strong><code>tabs</code>（<code>label</code>/<code>icon</code>/<code>badge</code>）、<code>modelValue</code>、<code>centered</code>。
        <strong>插槽：</strong><code>#panel-0</code> 等逐項對應面板。
      </p>
    </section>

    <!-- ChptToast -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-900 flex items-center">
          <span class="mr-3">🔔</span>ChptToast 輕提示
        </h2>
        <div class="flex gap-2">
          <ChptButton size="sm" color="success" @click="toast.success('儲存成功！')">成功</ChptButton>
          <ChptButton size="sm" color="warning" @click="toast.info('這是一則資訊')">資訊</ChptButton>
          <ChptButton size="sm" color="danger" @click="toast.error('發生錯誤')">錯誤</ChptButton>
        </div>
      </div>

      <p class="text-sm text-gray-500 mb-4">
        使用 <code>useToast</code> composable 觸發頂部浮動提示。先在全域（例如 App.vue）掛載 <code>&lt;ChptToast /&gt;</code>。
      </p>

      <div class="bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>// App.vue 掛載一次
import ChptToast from '@/components/common/ChptToast.vue'

&lt;template&gt;
  &lt;router-view /&gt;
  &lt;ChptToast /&gt;
&lt;/template&gt;

// 任意頁面觸發
import { useToast } from '@/components/common'
const toast = useToast()

toast.success('儲存成功')   // 綠
toast.info('資訊')          // 藍
toast.warning('警告')       // 黃
toast.error('錯誤')         // 紅</code></pre>
      </div>

      <!-- 掛載 Toast -->
      <ChptToast />
    </section>

    <section class="bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">💻</span>引入方式
      </h2>
      <div class="bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>import { ChptTabs, ChptToast, useToast } from '@/components/common'</code></pre>
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
  ChptAlert
} from '@/components/common'

const activeTab = ref(0)
const tabs = [
  { label: '總覽', icon: 'dashboard' },
  { label: '進度', icon: 'trending_up', badge: 3 },
  { label: '設定', icon: 'settings' }
]

const toast = useToast()

function onTabChange(index) {
  console.log('切換到頁籤', index)
}
</script>
