<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">🚀</span>
        <h1 class="text-4xl font-bold text-neutral-900">快速開始</h1>
      </div>
      <p class="text-neutral-600 text-lg max-w-4xl">
        安裝、引入、以及使用端需要提供的前置條件。
      </p>
    </div>

    <!-- ============ 安裝 ============ -->
    <section id="install" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-4">安裝與啟動</h2>

      <ChptCodeBlock language="bash" :code="installCode" />

      <p class="text-sm text-neutral-600 mt-4">
        請用 <code class="bg-neutral-100 px-1 py-0.5 rounded">npm ci</code> 而不是
        <code class="bg-neutral-100 px-1 py-0.5 rounded">npm install</code>：後者會忽略
        <code class="bg-neutral-100 px-1 py-0.5 rounded">package-lock.json</code> 的鎖定版本並可能改寫它，
        讓建置不可重現。
      </p>

      <ChptAlert type="info" class="mt-4">
        品質檢查一次跑完：<code>npm run verify</code>
        （typecheck → 組件庫邊界 → legacy 相容層 → lint → build），CI 跑的就是這串。
      </ChptAlert>
    </section>

    <!-- ============ 引入元件 ============ -->
    <section id="import" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">引入元件</h2>
      <p class="text-sm text-neutral-600 mb-4">
        正式入口是 <code class="bg-neutral-100 px-1 py-0.5 rounded">@/components/library</code>。
        舊程式若使用 <code class="bg-neutral-100 px-1 py-0.5 rounded">@/components/common</code> 仍可運作（相容 facade），
        但新程式請改用正式入口。
      </p>

      <ChptCodeBlock language="vue" :code="importCode" />

      <p class="text-sm text-neutral-600 mt-4">
        圖表、檢視器、Excel 元件較重，可依群別引入以利 code splitting：
      </p>
      <ChptCodeBlock language="ts" :code="groupImportCode" />
    </section>

    <!-- ============ 前置條件 ============ -->
    <section id="prerequisites" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">使用端要提供什麼</h2>
      <p class="text-sm text-neutral-600 mb-4">
        組件庫刻意不在自己內部處理這些事，因為它們屬於應用程式層的設定。
      </p>

      <ApiTable title="前置條件" :rows="prerequisites" />

      <p class="text-sm text-neutral-600 mt-5 mb-2">
        <strong>應用程式進入點的最小設定：</strong>
      </p>
      <ChptCodeBlock language="js" :code="mainCode" />

      <p class="text-sm text-neutral-600 mt-4 mb-2">
        <strong>根元件需要掛載的全域容器：</strong>
      </p>
      <ChptCodeBlock language="vue" :code="appCode" />
    </section>

    <!-- ============ 第一個範例 ============ -->
    <section id="first-example" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">第一個範例</h2>
      <p class="text-sm text-neutral-600 mb-4">
        以下是一個可以直接跑的表單 + 提示範例。
      </p>

      <div class="bg-neutral-50 rounded-lg p-6 border border-neutral-200 mb-4">
        <div class="flex flex-wrap items-end gap-3">
          <ChptInput v-model="demoName" label="名稱" placeholder="請輸入名稱" />
          <ChptSelect v-model="demoRole" label="角色" :options="roleOptions" />
          <ChptButton color="primary" label="儲存" @click="handleSave" />
        </div>
        <p class="text-xs text-neutral-500 mt-3">
          目前值：{{ demoName || '（空）' }} / {{ demoRole || '（未選）' }}
        </p>
      </div>

      <ChptCodeBlock language="vue" :code="firstExampleCode" />
    </section>

    <!-- ============ 下一步 ============ -->
    <section id="next-steps" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-4">下一步</h2>
      <div class="grid md:grid-cols-2 gap-4">
        <RouterLink
          v-for="link in nextSteps"
          :key="link.to"
          :to="link.to"
          class="block p-5 rounded-lg border border-neutral-200 hover:border-primary-400 hover:bg-primary-50 transition-colors"
        >
          <p class="font-semibold text-neutral-800 mb-1">{{ link.icon }} {{ link.title }}</p>
          <p class="text-xs text-neutral-600">{{ link.description }}</p>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup>
/* eslint-disable no-useless-escape -- 範例字串裡的結束標籤必須跳脫，否則 SFC 解析器會把 script 區塊提前收尾 */
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ChptAlert,
  ChptButton,
  ChptCodeBlock,
  ChptInput,
  ChptSelect,
  useToast,
} from '@/components/library'
import ApiTable from '../components/_ApiTable.vue'

const toast = useToast()

const demoName = ref('')
const demoRole = ref('')
const roleOptions = [
  { label: '檢視者', value: 'viewer' },
  { label: '編輯者', value: 'editor' },
  { label: '管理員', value: 'admin' },
]

function handleSave() {
  if (!demoName.value) {
    toast.warning('請先輸入名稱')
    return
  }
  toast.success(`已儲存：${demoName.value}`)
}

const installCode = `npm ci          # 依 lockfile 安裝（不要用 npm install）
npm run dev     # 開發 / 文件站
npm run verify  # typecheck → 邊界 → legacy → lint → build`

const importCode = `<script setup>
import { ChptButton, ChptInput, ChptTable } from '@/components/library'
<\/script>

<template>
  <ChptInput v-model="name" label="名稱" />
  <ChptTable :columns="columns" :data="rows" />
  <ChptButton color="primary" label="儲存" @click="save" />
</template>`

const groupImportCode = `import { DualAxisComboChart, EnterprisePareto } from '@/components/library/charts'
import { GerberViewer, PcbLayout } from '@/components/library/viewer'
import { ChptExcelEditor } from '@/components/library/excel'`

const mainCode = `import { createApp } from 'vue'
import '@/styles/index.css'
import 'material-symbols/outlined.css'
import { initDarkMode } from '@/components/library'
import App from './App.vue'

// 在掛載前套用使用者上次選擇的主題，避免畫面先閃一下亮色
initDarkMode()

createApp(App).mount('#app')`

const appCode = `<template>
  <RouterView />

  <!-- useToast() 的提示要有地方顯示 -->
  <ChptToast />

  <!-- 使用 ChptModal mode="window" 的最小化功能時需要 -->
  <ChptModalDock />
</template>`

const firstExampleCode = `<script setup>
import { ref } from 'vue'
import { ChptButton, ChptInput, ChptSelect, useToast } from '@/components/library'

const toast = useToast()
const name = ref('')
const role = ref('')
const roleOptions = [
  { label: '檢視者', value: 'viewer' },
  { label: '編輯者', value: 'editor' },
  { label: '管理員', value: 'admin' },
]

function save() {
  if (!name.value) {
    toast.warning('請先輸入名稱')
    return
  }
  toast.success(\\\`已儲存：\\\${name.value}\\\`)
}
<\/script>

<template>
  <div class="flex items-end gap-3">
    <ChptInput v-model="name" label="名稱" placeholder="請輸入名稱" />
    <ChptSelect v-model="role" label="角色" :options="roleOptions" />
    <ChptButton color="primary" label="儲存" @click="save" />
  </div>
</template>`

const prerequisites = [
  {
    name: 'vue ^3.5',
    type: 'peer dependency',
    desc: '必要。元件使用 useId() / useTemplateRef() 等 3.5 的 API',
  },
  {
    name: 'vue-router ^4',
    type: 'peer dependency（選用）',
    desc: '只有 ChptTabNavigation / ChptPageSwitcher 會用到；沒有安裝時它們會退回 activePath + @select 的受控模式',
  },
  {
    name: 'Material Symbols CSS',
    type: "import 'material-symbols/outlined.css'",
    desc: '用到 ChptIcon（以及任何內含圖示的元件）時必要',
  },
  {
    name: '<ChptToast />',
    type: '根元件掛載一次',
    desc: 'useToast() 的提示需要一個渲染容器；忘記掛載時呼叫 toast 不會有任何畫面',
  },
  {
    name: '<ChptModalDock />',
    type: '根元件掛載一次',
    desc: '使用 ChptModal mode="window" 的最小化到口袋功能時必要',
  },
  {
    name: 'initDarkMode()',
    type: '進入點呼叫一次',
    desc: '套用使用者上次選擇的主題。未呼叫時第一個用到 useDarkMode() 的元件會自動補上，但畫面可能先閃一下亮色',
  },
  {
    name: 'Tailwind + postcss-import',
    type: '建置設定',
    desc: '設計令牌經 tailwind.config.js 的 tokensPlugin 注入；darkMode 必須設為 class',
  },
]

const nextSteps = [
  { to: '/docs/guide/best-practices', icon: '✨', title: '最佳實踐', description: '設計令牌、深色模式、無障礙與組件庫邊界的使用準則' },
  { to: '/docs/components/form-atoms', icon: '🧩', title: '表單元件', description: 'Input / Select / Radio / Checkbox / Switch / DatePicker' },
  { to: '/docs/components/data-filter', icon: '📊', title: '資料與過濾', description: 'ChptTable / ChptFixedTable / ChptPagination / ChptFilter' },
  { to: '/docs/components/dual-axis-chart', icon: '📈', title: '圖表 Charts', description: '雙軸組合 / 柏拉圖 / 熱力圖（D3、可縮放）' },
]
</script>
