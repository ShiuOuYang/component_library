<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">🧱</span>
        <h1 class="text-4xl font-bold text-neutral-900">佈局與流程元件</h1>
      </div>
      <p class="text-neutral-600 text-lg max-w-4xl">
        ChptCard（卡片）、ChptCollapse（摺疊面板）、ChptBreadcrumb（麵包屑）、
        ChptSteps（步驟條）、ChptDivider（分隔線）。每個元件都附「Props / Events / Slots」與注意事項。
      </p>
    </div>

    <!-- ============ ChptCard ============ -->
    <section id="chpt-card" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptCard 卡片</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>將同主題的內容／操作收進一個區塊容器；可帶標題列、右上角額外區（如狀態標籤）與底部列。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptCard } from '@/components/library'</code>
      </p>

      <div class="grid md:grid-cols-2 gap-6">
        <ChptCard title="基本卡片" icon="inbox">
          <p class="text-sm text-neutral-600">透過 <code>title</code> / <code>icon</code> 與 <code>#extra</code> 插槽自訂標題列。</p>
          <template #extra>
            <ChptTag label="啟用" color="success" />
          </template>
        </ChptCard>

        <ChptCard title="含底部＋hover" icon="touch_app" hoverable @click="onCardClick">
          <p class="text-sm text-neutral-600">設定 <code>hoverable</code> 後滑入有 hover 效果；點擊會觸發 click 事件。</p>
          <template #footer>
            <p class="text-xs text-neutral-400">footer 插槽內容</p>
          </template>
        </ChptCard>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="cardSample" />
      </div>

      <ApiTable title="Props" :rows="cardProps" />
      <ApiTable title="Events" :rows="cardEvents" />
      <ApiTable title="Slots" :rows="cardSlots" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong><code>padding</code> 控制內容留白（none/sm/md/lg）；帶 <code>#footer</code> 時底部會自動加邊框分隔。
      </p>
    </section>

    <!-- ============ ChptCollapse ============ -->
    <section id="chpt-collapse" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptCollapse 摺疊面板</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>把 FAQ、群組設定等內容垂直摺疊；一次只開一個（預設）或多個同時展開（multiple）。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptCollapse } from '@/components/library'</code>
      </p>

      <ChptCollapse v-model="openPanels" :items="collapses" :multiple="true" />

      <div class="mt-6">
        <ChptCodeBlock :code="collapseSample" />
      </div>

      <ApiTable title="Props" :rows="collapseProps" />
      <ApiTable title="Events" :rows="collapseEvents" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>展開狀態可用 <code>v-model</code> 綁定為 index 陣列；內容想自訂時以
        <code>#content-{index}</code> 插槽覆寫。
      </p>
    </section>

    <!-- ============ ChptBreadcrumb ============ -->
    <section id="chpt-breadcrumb" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptBreadcrumb 麵包屑</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>顯示目前頁面的階層路徑；每項可為純文字或 <code>to</code>（RouterLink），並支援點擊事件與自訂分隔符。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptBreadcrumb } from '@/components/library'</code>
      </p>

      <ChptBreadcrumb :items="crumbs" />

      <div class="mt-6">
        <ChptCodeBlock :code="breadcrumbSample" />
      </div>

      <ApiTable title="Props" :rows="breadcrumbProps" />
      <ApiTable title="Events" :rows="breadcrumbEvents" />
      <ApiTable title="Slots" :rows="breadcrumbSlots" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>最後一項通常為目前頁面（不可點）；每項文字可用 <code>#item-{index}</code> 插槽自訂。
      </p>
    </section>

    <!-- ============ ChptSteps ============ -->
    <section id="chpt-steps" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptSteps 步驟條</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>引導多步驟流程（表單分頁、申請流程）；以狀態區分 done / process / pending。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptSteps } from '@/components/library'</code>
      </p>

      <ChptSteps :steps="steps" />

      <div class="mt-6 flex gap-4 items-center">
        <ChptButton size="sm" is-outline @click="stepBack">上一步</ChptButton>
        <ChptButton size="sm" @click="stepNext">下一步</ChptButton>
        <span class="text-xs text-neutral-500">目前進度：第 {{ currentStep + 1 }} / {{ steps.length }} 步</span>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="stepsSample" />
      </div>

      <ApiTable title="Props" :rows="stepsProps" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong><code>steps</code> 每項為 <code>{ title, status }</code>；<code>status</code>
        為 pending / process / done，由呼叫端更新狀態（如上例切換按鈕）。
      </p>
    </section>

    <!-- ============ ChptDivider ============ -->
    <section id="chpt-divider" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptDivider 分隔線</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>水平／垂直分隔區塊；水平時中間可放文字（如「或」），例如登入頁切換登入方式的隔線。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptDivider } from '@/components/library'</code>
      </p>

      <div class="flex items-center gap-6 my-2">
        <p class="text-sm text-neutral-600 whitespace-nowrap">水平分隔線：</p>
        <div class="flex-1"><ChptDivider text="或" /></div>
      </div>
      <div class="h-16 flex items-center gap-6">
        <p class="text-sm text-neutral-600 whitespace-nowrap">垂直分隔線：</p>
        <ChptDivider direction="vertical" class="h-10" />
        <ChptDivider direction="vertical" color="primary-300" class="h-10" />
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="dividerSample" />
      </div>

      <ApiTable title="Props" :rows="dividerProps" />
      <ApiTable title="Slots" :rows="dividerSlots" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>垂直分隔線需自訂高度（如 <code>h-10</code>）才有可見長度；<code>color</code>
        傳的是 Tailwind 色名（如 primary-300），不需加 border- 前綴。
      </p>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  ChptCard,
  ChptCollapse,
  ChptBreadcrumb,
  ChptSteps,
  ChptDivider,
  ChptButton,
  ChptTag,
  ChptCodeBlock,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

const currentStep = ref(0)
const steps = ref([
  { title: '填寫資料', status: 'done' },
  { title: '確認資訊', status: 'process' },
  { title: '完成', status: 'pending' },
])

function stepNext() {
  if (currentStep.value >= steps.value.length - 1) return
  currentStep.value++
  updateSteps()
}
function stepBack() {
  if (currentStep.value <= 0) return
  currentStep.value--
  updateSteps()
}
function updateSteps() {
  steps.value = steps.value.map((s, i) => ({
    ...s,
    status: i < currentStep.value ? 'done' : i === currentStep.value ? 'process' : 'pending',
  }))
}

const crumbs = [
  { label: '首頁' },
  { label: '報表' },
  { label: '良率分析' },
]

const collapses = [
  { title: '為什麼需要此功能？', content: '提升資料操作的效率與一致性，並提供良好的使用者體驗。' },
  { title: '如何開始？', content: '透過 imports 統一引出組件後即可在畫面上使用。' },
  { title: '注意事項', content: '部分元件需搭配正確的 data 型別，請參考各元件之 Props 定義。' },
]
const openPanels = ref([0])

function onCardClick() {
  console.log('卡片被點擊')
}

// ---- 程式碼範例（字串，避免模板解析） ----
const cardSample = `<ChptCard title="標題" icon="inbox" hoverable @click="onClick">
  <p>內容</p>
  <template #extra>
    <ChptTag label="啟用" color="success" />
  </template>
  <template #footer>
    <p>底部</p>
  </template>
</ChptCard>`

const collapseSample = `<ChptCollapse
  v-model="openPanels"
  :items="[{ title: '面板一', content: '內容...' }]"
  :multiple="true"
/>`

const breadcrumbSample = `<ChptBreadcrumb
  :items="[{ label: '首頁' }, { label: '報表' }, { label: '良率分析' }]"
  @select="handleSelect"
/>`

const stepsSample = `<ChptSteps :steps="[
  { title: '填寫資料', status: 'done' },
  { title: '確認資訊', status: 'process' },
  { title: '完成', status: 'pending' }
]" />`

const dividerSample = `<ChptDivider text="或" />
<ChptDivider direction="vertical" class="h-10" />`

// ---- API 資料（與元件 props/emits 對齊） ----
const cardProps = [
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'icon', type: 'string', def: "''", desc: '前置 Material Symbols 圖示名' },
  { name: 'padding', type: "'none'|'sm'|'md'|'lg'", def: "'sm'", desc: '內容內邊距' },
  { name: 'fullWidth', type: 'boolean', def: 'false', desc: '是否全寬' },
  { name: 'hoverable', type: 'boolean', def: 'false', desc: '滑入 hover 效果' },
]
const cardEvents = [{ name: 'click', params: '(event: MouseEvent)', desc: '點擊卡片時' }]
const cardSlots = [
  { name: 'header', params: '—', desc: '整列標題（含 title+icon+extra）' },
  { name: 'extra', params: '—', desc: '標題列右側內容（如標籤／按鈕）' },
  { name: 'default', params: '—', desc: '主要內容' },
  { name: 'footer', params: '—', desc: '底部列（自動加分隔邊框）' },
]

const collapseProps = [
  { name: 'items', type: 'CollapseItem[]', def: '[]', desc: '面板定義：{ title, content? }' },
  { name: 'modelValue', type: 'number[]', def: '[]', desc: '展開的 index 陣列（v-model）' },
  { name: 'multiple', type: 'boolean', def: 'false', desc: '是否可同時展開多個' },
]
const collapseEvents = [{ name: 'update:modelValue', params: '(value: number[])', desc: '展開狀態變更' }]

const breadcrumbProps = [
  { name: 'items', type: 'BreadcrumbItem[]', def: '[]', desc: '項目：{ label, to? }' },
  { name: 'separator', type: 'string', def: "'chevron_right'", desc: '分隔符 Material Symbols 圖示名' },
]
const breadcrumbEvents = [{ name: 'select', params: '(item)', desc: '點擊非路由項目時' }]
const breadcrumbSlots = [
  { name: 'item-<index>', params: '{ item }', desc: '自訂第 index 個項目的內容' },
]

const stepsProps = [
  { name: 'steps', type: 'StepItem[]', def: '[]', desc: '步驟：{ title, status? }' },
  { name: 'showLabel', type: 'boolean', def: 'true', desc: '是否顯示步驟文字' },
]

const dividerProps = [
  { name: 'direction', type: "'horizontal'|'vertical'", def: "'horizontal'", desc: '方向' },
  { name: 'text', type: 'string', def: "''", desc: '水平分隔線中間文字' },
  { name: 'color', type: 'string', def: "'neutral-200'", desc: '線條色名（不加 border- 前綴）' },
]
const dividerSlots = [{ name: 'default', params: '—', desc: '中間內容（取代 text）' }]
</script>
