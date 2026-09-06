<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <div class="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
          <span class="text-3xl">🗔</span>
        </div>
        <div>
          <h1 class="text-4xl font-bold text-gray-900">浮層元件</h1>
          <p class="text-lg text-gray-600 mt-1">ChptModal / ChptDrawer / ChptPopconfirm</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mt-6">
        <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">✓ 完成</span>
        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Vue 3</span>
        <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">Teleport</span>
      </div>
    </div>

    <!-- ChptModal -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-900 flex items-center">
          <span class="mr-3">🪟</span>ChptModal 模態框
        </h2>
        <ChptButton size="sm" @click="modalOpen = true">開啟 Dialog</ChptButton>
      </div>

      <p class="text-sm text-gray-500 mb-4">
        整合 DraggableModal 豐富功能的通用模態框，提供兩種佈局模式：
      </p>

      <div class="grid md:grid-cols-2 gap-4 mb-6 text-sm">
        <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p class="font-semibold text-blue-800 mb-2">mode="dialog"</p>
          <p class="text-gray-600 text-xs">簡潔置中確認框。適用表單、確認、訊息對話框。可調整尺寸、遮罩點擊關閉。</p>
        </div>
        <div class="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <p class="font-semibold text-purple-800 mb-2">mode="window"</p>
          <p class="text-gray-600 text-xs">完整多視窗工作面板。支援拖曳移動、拖曳縮放、最大化/還原、最小化到口袋（ModalDock）。</p>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-4 mb-6">
        <!-- Dialog 示範 -->
        <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">Dialog（確認框）</h3>
          <ChptButton size="sm" is-outline @click="modalOpen = true">開啟編輯對話框</ChptButton>
          <p class="text-xs text-gray-500 mt-2">參數：<code>v-model</code>、<code>title</code>、<code>size</code>、<code>#footer</code></p>
        </div>

        <!-- Window 示範 -->
        <div class="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-5 border border-purple-200">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">Window（多視窗）</h3>
          <div class="flex gap-2 flex-wrap">
            <ChptButton size="sm" @click="windowA = true">開啟視窗 A</ChptButton>
            <ChptButton size="sm" color="success" @click="windowB = true">開啟視窗 B</ChptButton>
            <ChptButton size="sm" color="warning" :is-outline="true" @click="restoreAll">還原全部</ChptButton>
          </div>
          <p class="text-xs text-gray-500 mt-2">參數：<code>mode="window"</code>、<code>draggable</code>、<code>resizable</code>、<code>minimizable</code>、<code>maximizable</code></p>
        </div>
      </div>

      <div class="bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>&lt;!-- Dialog 模式 --&gt;
&lt;ChptModal v-model="modalOpen" title="編輯資料" size="md"&gt;
  &lt;p&gt;這裡是 Modal 內容&lt;/p&gt;
  &lt;template #footer&gt;...&lt;/template&gt;
&lt;/ChptModal&gt;

&lt;!-- Window 模式（多視窗 + 口袋） --&gt;
&lt;ChptModal
  v-model="windowA" mode="window"
  title="工作面板" id="win-a"
  :draggable="true" :resizable="true"
  :minimizable="true" :maximizable="true"
&gt;
  &lt;p&gt;可拖曳、可縮放、可最小化到口袋&lt;/p&gt;
&lt;/ChptModal&gt;</code></pre>
      </div>

      <div class="grid md:grid-cols-2 gap-4 mt-6 text-sm">
        <div class="bg-gray-50 rounded-lg p-4">
          <p class="font-semibold text-gray-800 mb-2">通用 Props</p>
          <ul class="text-gray-600 space-y-1">
            <li><code>mode</code> dialog / window</li>
            <li><code>v-model</code> 開關</li>
            <li><code>title</code> 標題</li>
            <li><code>size</code> sm/md/lg/xl（dialog）</li>
            <li><code>width</code>/<code>height</code></li>
            <li><code>closable</code>/<code>maskClosable</code></li>
          </ul>
        </div>
        <div class="bg-gray-50 rounded-lg p-4">
          <p class="font-semibold text-gray-800 mb-2">window Props / 外部控制</p>
          <ul class="text-gray-600 space-y-1">
            <li><code>draggable</code>/<code>resizable</code></li>
            <li><code>minimizable</code>/<code>maximizable</code></li>
            <li>ref：<code>open/close/minimize/restore</code></li>
            <li>useModalManager：<code>restoreAll/closeAll</code></li>
            <li>鉤式：<code>#title</code>/<code>#footer</code></li>
          </ul>
        </div>
      </div>

      <!-- Dialog Modal -->
      <ChptModal v-model="modalOpen" title="編輯資料" size="md" mode="dialog">
        <div class="space-y-4">
          <ChptInput v-model="editName" label="名稱" placeholder="請輸入名稱" full-width />
          <ChptTextarea v-model="editDesc" label="說明" placeholder="請輸入說明" rows="3" full-width />
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <ChptButton size="sm" is-outline @click="modalOpen = false">取消</ChptButton>
            <ChptButton size="sm" color="primary" @click="modalOpen = false">儲存</ChptButton>
          </div>
        </template>
      </ChptModal>

      <!-- Window Modal A -->
      <ChptModal
        v-model="windowA"
        mode="window"
        title="工作面板 A"
        id="doc-window-a"
        :width="520"
        :height="360"
        :minimizable="true"
        :maximizable="true"
        :draggable="true"
        :resizable="true"
      >
        <div class="space-y-3">
          <p class="text-sm text-gray-600">這是一個可拖曳、可縮放的工作視窗。點擊右上角「─」可縮小到右下角的口袋列。</p>
          <ChptProgress :model-value="45" status="primary" />
          <ChptTag label="window 模式" color="primary" />
        </div>
      </ChptModal>

      <!-- Window Modal B -->
      <ChptModal
        v-model="windowB"
        mode="window"
        title="工作面板 B"
        id="doc-window-b"
        :width="460"
        :height="320"
        header-bg-color="from-emerald-50 to-teal-50"
      >
        <div class="space-y-3">
          <p class="text-sm text-gray-600">兩個 window 同時開啟時，點擊任一視窗即自動置頂（z-index 自動管理）。</p>
          <ChptProgress :model-value="80" status="success" />
        </div>
      </ChptModal>

      <!-- 口袋列（顯示被最小化的 window） -->
      <ChptModalDock />
    </section>

    <!-- ChptDrawer -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-gray-900 flex items-center">
          <span class="mr-3">📤</span>ChptDrawer 抽屜
        </h2>
        <div class="flex gap-2">
          <ChptButton size="sm" is-outline @click="openDrawer('left')">左側</ChptButton>
          <ChptButton size="sm" @click="openDrawer('right')">右側</ChptButton>
        </div>
      </div>
      <p class="text-sm text-gray-500 mb-4">
        側滑抽屜，四種方向滑出，適合放詳細表單或操作面板。
      </p>

      <div class="bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>&lt;ChptDrawer
  v-model="drawerOpen"
  title="詳細資訊"
  placement="right"
  :size="400"
&gt;
  &lt;p&gt;抽屜內容&lt;/p&gt;
  &lt;template #footer&gt;
    &lt;ChptButton&gt;確認&lt;/ChptButton&gt;
  &lt;/template&gt;
&lt;/ChptDrawer&gt;</code></pre>
      </div>

      <ChptDrawer v-model="drawerOpen" title="詳細資訊" :placement="drawerPlacement" :size="380">
        <div class="space-y-4">
          <ChptInput v-model="drawerName" label="名稱" placeholder="請輸入" full-width />
          <ChptProgress :model-value="62" status="primary" />
          <p class="text-sm text-gray-600">這是一個右側滑出的抽屜面板，常用於展示表單或詳細資料。</p>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <ChptButton size="sm" is-outline @click="drawerOpen = false">取消</ChptButton>
            <ChptButton size="sm" color="primary" @click="drawerOpen = false">確認</ChptButton>
          </div>
        </template>
      </ChptDrawer>
    </section>

    <!-- ChptPopconfirm -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">❓</span>ChptPopconfirm 確認彈窗
      </h2>
      <div class="flex items-center gap-4">
        <ChptPopconfirm
          message="確定要刪除這筆資料嗎？"
          @confirm="onConfirmDelete"
        >
          <ChptButton size="sm" color="danger">刪除</ChptButton>
        </ChptPopconfirm>
        <ChptPopconfirm
          message="確定要發布此內容嗎？"
          color="success"
          confirm-text="發布"
          @confirm="onPublish"
        >
          <ChptButton size="sm" color="success">發布</ChptButton>
        </ChptPopconfirm>
      </div>

      <div class="mt-6 bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>&lt;ChptPopconfirm
  message="確定要刪除嗎？"
  color="danger"
  @confirm="handleDelete"
&gt;
  &lt;ChptButton color="danger"&gt;刪除&lt;/ChptButton&gt;
&lt;/ChptPopconfirm&gt;</code></pre>
      </div>
      <p class="mt-4 text-sm text-gray-500">
        <strong>Props：</strong><code>message</code>、<code>confirmText</code>、<code>cancelText</code>、<code>color</code>。
        <strong>事件：</strong><code>confirm</code>, <code>cancel</code>。
      </p>
    </section>

    <section class="bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">💻</span>引入方式
      </h2>
      <div class="bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>import { ChptModal, ChptDrawer, ChptPopconfirm, ChptModalDock } from '@/components/library'</code></pre>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  ChptModal,
  ChptModalDock,
  ChptDrawer,
  ChptPopconfirm,
  ChptButton,
  ChptInput,
  ChptTextarea,
  ChptProgress,
  ChptTag
} from '@/components/library'
import { useModalManager } from '@/composables/useModalManager'

const modalOpen = ref(false)
const editName = ref('')
const editDesc = ref('')

// window 多視窗示範
const windowA = ref(false)
const windowB = ref(false)
const { restoreAll } = useModalManager()

const drawerOpen = ref(false)
const drawerPlacement = ref('right')
const drawerName = ref('')

function openDrawer(placement) {
  drawerPlacement.value = placement
  drawerOpen.value = true
}

function onConfirmDelete() {
  console.log('已刪除')
}

function onPublish() {
  console.log('已發布')
}
</script>
