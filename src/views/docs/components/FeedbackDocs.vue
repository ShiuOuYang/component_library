<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <div class="w-16 h-16 bg-gradient-to-br from-amber-500 to-red-500 rounded-xl flex items-center justify-center">
          <span class="text-3xl">🛎️</span>
        </div>
        <div>
          <h1 class="text-4xl font-bold text-gray-900">反饋元件</h1>
          <p class="text-lg text-gray-600 mt-1">ChptAlert / ChptTag / ChptBadge / ChptSpinner / ChptSkeleton / ChptEmpty / ChptProgress</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mt-6">
        <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">✓ 完成</span>
        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Vue 3</span>
        <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">TypeScript</span>
        <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">Tailwind CSS</span>
      </div>
    </div>

    <!-- ChptAlert -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🔔</span>ChptAlert 提示條
      </h2>
      <div class="space-y-3">
        <ChptAlert type="success" title="操作成功" message="資料已成功儲存。" />
        <ChptAlert type="info" title="系統通知" message="系統將於今晚 22:00 進行維護。" />
        <ChptAlert type="warning" title="警告" message="偵測到潛在的資料不一致。" closable />
        <ChptAlert type="danger" title="錯誤" message="連線逾時，請稍後再試。" closable />
      </div>

      <div class="mt-8 bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>&lt;ChptAlert
  type="success"
  title="操作成功"
  message="資料已成功儲存。"
  :closable="true"
/&gt;</code></pre>
      </div>
      <p class="mt-4 text-sm text-gray-500">
        <strong>Props：</strong><code>type</code>（success/info/warning/danger）、<code>title</code>、<code>message</code>、<code>closable</code>、<code>showIcon</code>。
        <strong>事件：</strong><code>close</code>。
      </p>
    </section>

    <!-- ChptTag -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🏷️</span>ChptTag 標籤
      </h2>
      <div class="flex flex-wrap items-center gap-3">
        <ChptTag label="Primary" color="primary" />
        <ChptTag label="Success" color="success" />
        <ChptTag label="Warning" color="warning" is-outline />
        <ChptTag label="Danger" color="danger" is-outline />
        <ChptTag label="Info" color="info" />
        <ChptTag label="可關閉" color="primary" closable @close="onTagClose" />
      </div>

      <div class="mt-8 bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>&lt;ChptTag
  label="狀態"
  color="success"
  :closable="true"
  @close="handleClose"
/&gt;</code></pre>
      </div>
      <p class="mt-4 text-sm text-gray-500">
        <strong>Props：</strong><code>color</code>（primary/secondary/success/warning/danger/info）、<code>isOutline</code>、<code>closable</code>、<code>icon</code>。
      </p>
    </section>

    <!-- ChptBadge 與 ChptAvatar -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🔢</span>ChptBadge 與 ChptAvatar
      </h2>
      <div class="flex items-center gap-10">
        <div>
          <p class="text-sm text-gray-500 mb-3">ChptBadge 計數</p>
          <ChptBadge :count="5">
            <button class="w-10 h-10 bg-gray-100 rounded-lg border border-gray-200"></button>
          </ChptBadge>
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-3">ChptBadge 圓點</p>
          <ChptBadge is-dot status="success">
            <button class="w-10 h-10 bg-gray-100 rounded-lg border border-gray-200"></button>
          </ChptBadge>
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-3">ChptBadge 上限</p>
          <ChptBadge :count="102" :max="99">
            <button class="w-10 h-10 bg-gray-100 rounded-lg border border-gray-200"></button>
          </ChptBadge>
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-3">ChptAvatar 圖示</p>
          <ChptAvatar icon="person" backgroundColor="bg-blue-500" />
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-3">ChptAvatar 首字</p>
          <ChptAvatar name="王小明" size="lg" backgroundColor="bg-purple-500" />
        </div>
      </div>

      <div class="mt-8 bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>&lt;ChptBadge :count="5"&gt;
  &lt;button&gt;通知&lt;/button&gt;
&lt;/ChptBadge&gt;

&lt;ChptAvatar name="王小明" backgroundColor="bg-purple-500" /&gt;</code></pre>
      </div>
      <p class="mt-4 text-sm text-gray-500">
        <strong>ChptBadge Props：</strong><code>count</code>、<code>max</code>、<code>isDot</code>、<code>status</code>、<code>position</code>。
        <strong>ChptAvatar Props：</strong><code>src</code>（圖片）、<code>name</code>（首字）、<code>icon</code>、<code>size</code>。
      </p>
    </section>

    <!-- ChptSpinner -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">⏳</span>ChptSpinner 載入指示器
      </h2>
      <div class="flex items-center gap-10">
        <ChptSpinner :loading="true" :size="20" />
        <ChptSpinner :loading="true" :size="28" text="載入中..." color="green-500" />
        <ChptSpinner :loading="true" :size="40" text="資料處理中" center />
      </div>

      <div class="mt-8 bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>&lt;ChptSpinner
  :loading="isLoading"
  :size="28"
  text="載入中..."
/&gt;</code></pre>
      </div>
      <p class="mt-4 text-sm text-gray-500">
        <strong>Props：</strong><code>loading</code>、<code>size</code>、<code>text</code>、<code>color</code>、<code>center</code>。
        當 <code>loading</code> 為 <code>false</code> 時不渲染任何元素。
      </p>
    </section>

    <!-- ChptProgress -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">📊</span>ChptProgress 進度條
      </h2>
      <div class="space-y-4">
        <ChptProgress :model-value="45" status="primary" />
        <ChptProgress :model-value="72" status="success" />
        <ChptProgress :model-value="100" status="warning" :stroke-width="12" />
        <ChptProgress :model-value="25" status="danger" :show-label="false" />
      </div>

      <div class="mt-8 bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>&lt;ChptProgress
  :model-value="progress"
  status="success"
  :stroke-width="10"
/&gt;</code></pre>
      </div>
      <p class="mt-4 text-sm text-gray-500">
        <strong>Props：</strong><code>modelValue</code>（0~100）、<code>status</code>、<code>strokeWidth</code>、<code>showLabel</code>。
      </p>
    </section>

    <!-- ChptSkeleton -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🦴</span>ChptSkeleton 骨架屏
      </h2>
      <div class="max-w-xl">
        <ChptSkeleton :loading="true" :rows="4" :row-width="[100, 85, 90, 60]" />
      </div>
      <p class="mt-3 text-sm text-gray-500">當 <code>loading</code> 為 false 時，顯示預設插槽的實際內容。</p>

      <div class="mt-6 bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>&lt;ChptSkeleton :loading="isLoading" :rows="3"&gt;
  &lt;!-- 實際內容，載入完成後顯示 --&gt;
  &lt;YourContent /&gt;
&lt;/ChptSkeleton&gt;</code></pre>
      </div>
      <p class="mt-4 text-sm text-gray-500">
        <strong>Props：</strong><code>loading</code>、<code>rows</code>、<code>rowWidth</code>、<code>rowHeight</code>、<code>color</code>。
      </p>
    </section>

    <!-- ChptEmpty -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🪹</span>ChptEmpty 空狀態
      </h2>
      <ChptEmpty
        icon="search_off"
        title="找不到相關資料"
        description="請嘗試調整搜尋條件後再試一次。"
      >
        <template #action>
          <ChptButton size="sm" color="primary" @click="onEmptyAction">清除條件</ChptButton>
        </template>
      </ChptEmpty>

      <div class="mt-6 bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>&lt;ChptEmpty
  title="找不到相關資料"
  description="請調整搜尋條件"
&gt;
  &lt;template #action&gt;
    &lt;ChptButton&gt;清除條件&lt;/ChptButton&gt;
  &lt;/template&gt;
&lt;/ChptEmpty&gt;</code></pre>
      </div>
      <p class="mt-4 text-sm text-gray-500">
        <strong>Props：</strong><code>icon</code>、<code>title</code>、<code>description</code>、<code>iconSize</code>。支援 <code>action</code> 插槽。
      </p>
    </section>

    <section class="bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">💻</span>引入方式
      </h2>
      <div class="bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>import {
  ChptAlert,
  ChptTag,
  ChptBadge,
  ChptAvatar,
  ChptSpinner,
  ChptProgress,
  ChptSkeleton,
  ChptEmpty
} from '@/components/common'</code></pre>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  ChptAlert,
  ChptTag,
  ChptBadge,
  ChptAvatar,
  ChptSpinner,
  ChptProgress,
  ChptSkeleton,
  ChptEmpty,
  ChptButton
} from '@/components/common'

function onTagClose() {
  console.log('標籤已關閉')
}

function onEmptyAction() {
  console.log('執行清除條件')
}
</script>
