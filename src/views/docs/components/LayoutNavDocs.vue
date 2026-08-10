<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <div class="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center">
          <span class="text-3xl">🧱</span>
        </div>
        <div>
          <h1 class="text-4xl font-bold text-gray-900">佈局與流程元件</h1>
          <p class="text-lg text-gray-600 mt-1">ChptCard / ChptDivider / ChptSteps / ChptBreadcrumb / ChptCollapse</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mt-6">
        <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">✓ 完成</span>
        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Vue 3</span>
        <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">Tailwind CSS</span>
      </div>
    </div>

    <!-- ChptCard 與 ChptDivider -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">📇</span>ChptCard 卡片 與 ChptDivider 分隔線
      </h2>

      <div class="grid md:grid-cols-2 gap-6">
        <ChptCard title="基本卡片" icon="inbox">
          <p class="text-sm text-gray-600">這是一張卡片，透過 <code>title</code> 與 <code>#extra</code> 插槽自訂標題區。</p>
          <template #extra>
            <ChptTag label="啟用" color="success" />
          </template>
        </ChptCard>

        <ChptCard title="含底部" hoverable @click="onCardClick">
          <p class="text-sm text-gray-600">點擊卡片會有 hover 效果。</p>
          <template #footer>
            <p class="text-xs text-gray-400">footer 插槽內容</p>
          </template>
        </ChptCard>
      </div>

      <div class="flex items-center gap-6 my-6">
        <p class="text-sm text-gray-600">水平分隔線：</p>
        <div class="flex-1"><ChptDivider text="或" /></div>
      </div>
      <div class="h-16 flex items-center gap-6">
        <p class="text-sm text-gray-600">垂直分隔線：</p>
        <ChptDivider direction="vertical" class="h-8" />
      </div>

      <div class="mt-8 bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>&lt;ChptCard title="標題" icon="inbox" hoverable&gt;
  &lt;p&gt;內容&lt;/p&gt;
  &lt;template #footer&gt;&lt;/template&gt;
&lt;/ChptCard&gt;

&lt;ChptDivider text="或" /&gt;</code></pre>
      </div>
      <p class="mt-4 text-sm text-gray-500">
        <strong>ChptCard：</strong><code>title</code>、<code>icon</code>、<code>padding</code>、<code>hoverable</code>、<code>#header/#extra/#footer</code> 插槽。
        <strong>ChptDivider：</strong><code>direction</code>（horizontal/vertical）、<code>text</code>。
      </p>
    </section>

    <!-- ChptSteps -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🪜</span>ChptSteps 步驟條
      </h2>
      <ChptSteps :steps="steps" />
      <div class="mt-6 flex gap-4 items-center">
        <ChptButton size="sm" is-outline @click="stepBack">上一步</ChptButton>
        <ChptButton size="sm" @click="stepNext">下一步</ChptButton>
      </div>

      <div class="mt-8 bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>const steps = [
  { title: '填寫資料', status: 'done' },
  { title: '確認資訊', status: 'process' },
  { title: '完成', status: 'pending' }
]

&lt;ChptSteps :steps="steps" /&gt;</code></pre>
      </div>
      <p class="mt-4 text-sm text-gray-500">
        <strong>Props：</strong><code>steps</code>（含 <code>title</code> 與 <code>status</code>=pending/process/done）。
      </p>
    </section>

    <!-- ChptBreadcrumb -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">🧭</span>ChptBreadcrumb 麵包屑
      </h2>
      <ChptBreadcrumb :items="crumbs" />

      <div class="mt-8 bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>const crumbs = [
  { label: '首頁' },
  { label: '報表' },
  { label: '良率分析' }
]

&lt;ChptBreadcrumb :items="crumbs" /&gt;</code></pre>
      </div>
      <p class="mt-4 text-sm text-gray-500">
        <strong>Props：</strong><code>items</code>（含 <code>label</code> 與可選 <code>to</code> router-link）、<code>separator</code>（分隔符圖示）。
      </p>
    </section>

    <!-- ChptCollapse -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">📂</span>ChptCollapse 摺疊面板
      </h2>
      <ChptCollapse :items="collapses" :multiple="true" />

      <div class="mt-8 bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>&lt;ChptCollapse
  :items="[{ title: '面板一', content: '內容...' }]"
  :multiple="true"
/&gt;</code></pre>
      </div>
      <p class="mt-4 text-sm text-gray-500">
        <strong>Props：</strong><code>items</code>（<code>title</code>/<code>content</code>）、<code>modelValue</code>（展開 index 陣列）、<code>multiple</code>。
        支援 <code>#content-0</code> 等插槽自訂內容。
      </p>
    </section>

    <section class="bg-white rounded-xl shadow-md p-8 border border-gray-200">
      <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        <span class="mr-3">💻</span>引入方式
      </h2>
      <div class="bg-gray-900 rounded-lg p-5 overflow-x-auto">
        <pre class="text-green-400 text-sm font-mono"><code>import {
  ChptCard,
  ChptDivider,
  ChptSteps,
  ChptBreadcrumb,
  ChptCollapse
} from '@/components/common'</code></pre>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  ChptCard,
  ChptDivider,
  ChptSteps,
  ChptBreadcrumb,
  ChptCollapse,
  ChptButton,
  ChptTag
} from '@/components/common'

const currentStep = ref(0)
const steps = ref([
  { title: '填寫資料', status: 'done' },
  { title: '確認資訊', status: 'done' },
  { title: '完成', status: 'pending' }
])

function stepNext() {
  if (currentStep.value >= 2) return
  currentStep.value++
  updateSteps()
}
function stepBack() {
  if (currentStep.value <= 0) return
  currentStep.value--
  updateSteps()
}
function updateSteps() {
  const statuses = ['pending', 'process', 'done']
  steps.value = steps.value.map((s, i) => ({
    ...s,
    status: i < currentStep.value ? 'done' : i === currentStep.value ? 'process' : 'pending'
  }))
}

const crumbs = [
  { label: '首頁' },
  { label: '報表' },
  { label: '良率分析' }
]

const collapses = [
  { title: '為什麼需要此功能？', content: '提升資料操作的效率與一致性，並提供良好的使用者體驗。' },
  { title: '如何開始？', content: '透過 imports 統一引出組件後即可在畫面上使用。' },
  { title: '注意事項', content: '部分元件需搭配 proper data 型別，請參考各元件之 Props 定義。' }
]

function onCardClick() {
  console.log('卡片被點擊')
}
</script>
