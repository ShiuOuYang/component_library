<template>
  <div class="w-full px-8 py-12">
    <!-- 頁首 -->
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
          <span class="text-3xl">🧩</span>
        </div>
        <div>
          <h1 class="text-4xl font-bold text-gray-900">XXX 元件</h1>
          <p class="text-lg text-gray-600 mt-1">ChptXxx / ChptYyy</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mt-6">
        <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">✓ 完成</span>
        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Vue 3</span>
        <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">TypeScript</span>
        <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">Tailwind CSS</span>
      </div>
    </div>

    <!-- 每個組件一個 section：展示 → 程式碼 → Props/事件說明 -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🔔</span>ChptXxx 元件名稱
      </h2>

      <!-- 實際渲染的範例 -->
      <div class="space-y-3">
        <ChptXxx label="範例" color="primary" />
        <ChptXxx label="停用" color="secondary" disabled />
      </div>

      <!-- 程式碼片段：黑底綠字，HTML entity 轉義 -->
      <div class="mt-8 bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>&lt;ChptXxx
  label="範例"
  color="primary"
  :disabled="false"
  @click="handleClick"
/&gt;</code></pre>
      </div>

      <p class="mt-4 text-sm text-gray-500">
        <strong>Props：</strong><code>label</code>、<code>color</code>（primary/secondary/success/warning/danger）、<code>size</code>、<code>disabled</code>。
        <strong>事件：</strong><code>click</code>、<code>update:modelValue</code>。
      </p>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptXxx } from '@/components/library'

// 範例互動狀態
const value = ref('')

function handleClick() {
  console.log('clicked')
}
</script>
