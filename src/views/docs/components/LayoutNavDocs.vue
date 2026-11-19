<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">🧱</span>
        <h1 class="text-4xl font-bold text-content-primary">佈局與流程元件</h1>
      </div>
      <p class="text-content-secondary text-lg max-w-4xl">
        ChptCard（卡片）、ChptCollapse（摺疊面板）、ChptBreadcrumb（麵包屑）、
        ChptSteps（步驟條）、ChptDivider（分隔線）。每個元件都附「Props / Events / Slots」與注意事項。
      </p>
    </div>

    <!-- ============ ChptCard ============ -->
    <section id="chpt-card" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptCard 卡片</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>將同主題的內容／操作收進一個區塊容器；可帶標題列、右上角額外區（如狀態標籤）與底部列。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptCard } from '@/components/library'</code>
      </p>

      <div class="grid md:grid-cols-2 gap-6">
        <ChptCard title="基本卡片" icon="inbox">
          <p class="text-sm text-content-secondary">透過 <code>title</code> / <code>icon</code> 與 <code>#extra</code> 插槽自訂標題列。</p>
          <template #extra>
            <ChptTag label="啟用" color="success" />
          </template>
        </ChptCard>

        <ChptCard title="含底部＋hover" icon="touch_app" hoverable @click="onCardClick">
          <p class="text-sm text-content-secondary">設定 <code>hoverable</code> 後滑入有 hover 效果；點擊會觸發 click 事件。</p>
          <template #footer>
            <p class="text-xs text-content-tertiary">footer 插槽內容</p>
          </template>
        </ChptCard>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="cardSample" />
      </div>

      <ApiTable of="ChptCard" title="Props" :rows="cardProps" />
      <ApiTable of="ChptCard" title="Events" :rows="cardEvents" />
      <ApiTable of="ChptCard" title="Slots" :rows="cardSlots" />

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong><code>padding</code> 控制內容留白（none/sm/md/lg）；帶 <code>#footer</code> 時底部會自動加邊框分隔。
      </p>
    </section>

    <!-- ============ ChptCollapse ============ -->
    <section id="chpt-collapse" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptCollapse 摺疊面板</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>把 FAQ、群組設定等內容垂直摺疊；一次只開一個（預設）或多個同時展開（multiple）。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptCollapse } from '@/components/library'</code>
      </p>

      <ChptCollapse v-model="openPanels" :items="collapses" :multiple="true" />

      <div class="mt-6">
        <ChptCodeBlock :code="collapseSample" />
      </div>

      <ApiTable of="ChptCollapse" title="Props" :rows="collapseProps" />
      <ApiTable of="ChptCollapse" title="Events" :rows="collapseEvents" />

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>展開狀態可用 <code>v-model</code> 綁定為 index 陣列；內容想自訂時以
        <code>#content-{index}</code> 插槽覆寫。
      </p>
    </section>

    <!-- ============ ChptBreadcrumb ============ -->
    <section id="chpt-breadcrumb" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptBreadcrumb 麵包屑</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>顯示目前頁面的階層路徑；每項可為純文字或 <code>to</code>（RouterLink），並支援點擊事件與自訂分隔符。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptBreadcrumb } from '@/components/library'</code>
      </p>

      <ChptBreadcrumb :items="crumbs" />

      <div class="mt-6">
        <ChptCodeBlock :code="breadcrumbSample" />
      </div>

      <ApiTable of="ChptBreadcrumb" title="Props" :rows="breadcrumbProps" />
      <ApiTable of="ChptBreadcrumb" title="Events" :rows="breadcrumbEvents" />
      <ApiTable of="ChptBreadcrumb" title="Slots" :rows="breadcrumbSlots" />

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>最後一項通常為目前頁面（不可點）；每項文字可用 <code>#item-{index}</code> 插槽自訂。
      </p>
    </section>

    <!-- ============ ChptSteps ============ -->
    <section id="chpt-steps" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptSteps 步驟條</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>引導多步驟流程（表單分頁、申請流程）；以狀態區分 done / process / pending。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptSteps } from '@/components/library'</code>
      </p>

      <ChptSteps :steps="steps" />

      <div class="mt-6 flex gap-4 items-center">
        <ChptButton size="sm" is-outline @click="stepBack">上一步</ChptButton>
        <ChptButton size="sm" @click="stepNext">下一步</ChptButton>
        <span class="text-xs text-content-tertiary">目前進度：第 {{ currentStep + 1 }} / {{ steps.length }} 步</span>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="stepsSample" />
      </div>

      <ApiTable of="ChptSteps" title="Props" :rows="stepsProps" />

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong><code>steps</code> 每項為 <code>{ title, status }</code>；<code>status</code>
        為 pending / process / done，由呼叫端更新狀態（如上例切換按鈕）。
      </p>
    </section>

    <!-- ============ ChptDivider ============ -->
    <section id="chpt-divider" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptDivider 分隔線</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>水平／垂直分隔區塊；水平時中間可放文字（如「或」），例如登入頁切換登入方式的隔線。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptDivider } from '@/components/library'</code>
      </p>

      <div class="flex items-center gap-6 my-2">
        <p class="text-sm text-content-secondary whitespace-nowrap">水平分隔線：</p>
        <div class="flex-1"><ChptDivider text="或" /></div>
      </div>
      <div class="h-16 flex items-center gap-6">
        <p class="text-sm text-content-secondary whitespace-nowrap">垂直分隔線：</p>
        <ChptDivider direction="vertical" class="h-10" />
        <ChptDivider direction="vertical" color="primary-300" class="h-10" />
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="dividerSample" />
      </div>

      <ApiTable of="ChptDivider" title="Props" :rows="dividerProps" />
      <ApiTable of="ChptDivider" title="Slots" :rows="dividerSlots" />

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>垂直分隔線需自訂高度（如 <code>h-10</code>）才有可見長度；<code>color</code>
        傳的是 Tailwind 色名（如 primary-300），不需加 border- 前綴。
      </p>
    </section>

    <section id="chpt-dashboard-grid" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptDashboardGrid 儀表板格線</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>戰情室、產線看板這類「每個人想看的東西不一樣」的頁面。打開編輯模式後，
        拖標題列左側的把手移動、拖右下角調整大小，其他區塊會被推開、放開後往上靠攏；
        鍵盤使用者 Tab 到把手，方向鍵移動、Shift + 方向鍵調整大小。版面用 v-model 存到後端，或用 <code>persist-key</code> 記在瀏覽器。
        寬度小於 640px 時改成一欄（手機）。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptDashboardGrid } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <div class="mb-3 flex flex-wrap items-center gap-3">
          <ChptSwitch v-model="dashEditable" label="編輯版面" />
          <ChptButton size="xs" is-outline @click="resetDashboard">還原預設版面</ChptButton>
        </div>
        <ChptDashboardGrid ref="dashRef" v-model="dashLayout" :cols="12" :row-height="64" :editable="dashEditable" persist-key="docs-dashboard">
          <template #oee>
            <p class="text-3xl font-semibold tabular-nums text-content-primary">87.4<span class="text-base text-content-tertiary">%</span></p>
            <p class="text-xs text-content-tertiary">目標 85%</p>
          </template>
          <template #output>
            <p class="text-3xl font-semibold tabular-nums text-content-primary">12,480</p>
            <p class="text-xs text-content-tertiary">今日產量（pcs）</p>
          </template>
          <template #yield>
            <p class="text-3xl font-semibold tabular-nums text-content-primary">98.6<span class="text-base text-content-tertiary">%</span></p>
            <p class="text-xs text-content-tertiary">FPY</p>
          </template>
          <template #alarm>
            <ul class="space-y-1 text-sm text-content-secondary">
              <li><span class="mr-3 tabular-nums text-content-tertiary">10:32</span>SMT-3 吸嘴堵塞（已排除）</li>
              <li><span class="mr-3 tabular-nums text-content-tertiary">11:05</span>AOI-1 誤判率偏高</li>
              <li><span class="mr-3 tabular-nums text-content-tertiary">13:47</span>回焊爐 A-03 溫度偏高</li>
            </ul>
          </template>
          <template #shift>
            <p class="text-sm text-content-secondary">早班：王小明（線長）</p>
            <p class="text-sm text-content-secondary">夜班：陳大文（線長）</p>
          </template>
          <template #actions="{ item }">
            <ChptTag v-if="item.static" size="sm">固定</ChptTag>
          </template>
        </ChptDashboardGrid>
      </div>
      <div class="mt-6">
        <ChptCodeBlock :code="dashboardSample" />
      </div>
      <ApiTable of="ChptDashboardGrid" title="Props" :rows="dashboardProps" />
      <ApiTable of="-" title="DashboardItem（版面的每一筆）" :rows="dashboardItemRows" />
      <ApiTable of="ChptDashboardGrid" title="Events" :rows="dashboardEvents" />
      <ApiTable of="ChptDashboardGrid" title="Slots" :rows="dashboardSlots" />
      <ApiTable of="ChptDashboardGrid" title="方法（ref）" :rows="dashboardMethods" />
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
  ChptDashboardGrid,
  ChptSwitch,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

// ---- DashboardGrid ----
const defaultDashboard = () => [
  { id: 'oee', title: 'OEE', x: 0, y: 0, w: 3, h: 2 },
  { id: 'output', title: '產量', x: 3, y: 0, w: 3, h: 2 },
  { id: 'yield', title: '良率', x: 6, y: 0, w: 3, h: 2 },
  { id: 'shift', title: '值班', x: 9, y: 0, w: 3, h: 2, static: true },
  { id: 'alarm', title: '今日異常', x: 0, y: 2, w: 9, h: 2 },
]
const dashEditable = ref(true)
const dashLayout = ref(defaultDashboard())
const dashRef = ref(null)
function resetDashboard() {
  dashLayout.value = defaultDashboard()
  dashRef.value?.clearSaved()
}
const dashboardSample = `<ChptDashboardGrid v-model="layout" :cols="12" :row-height="64" editable persist-key="line-a">
  <!-- 每個區塊的內容：插槽名稱 = 區塊 id（或用 default 插槽的 { item } 自己判斷） -->
  <template #oee><OeeGauge /></template>
  <template #output><OutputChart /></template>
</ChptDashboardGrid>

const layout = ref([
  { id: 'oee', title: 'OEE', x: 0, y: 0, w: 3, h: 2 },
  { id: 'output', title: '產量', x: 3, y: 0, w: 6, h: 2, minW: 3 },
  { id: 'shift', title: '值班', x: 9, y: 0, w: 3, h: 2, static: true }, // 固定不動
])`
const dashboardProps = [
  { name: 'modelValue', type: 'DashboardItem[]', def: '—', desc: '版面（v-model）；拖曳、調整大小、鍵盤操作後送出新的陣列' },
  { name: 'cols / rowHeight / gap', type: 'number', def: '12 / 72 / 12', desc: '欄數；一列的高度與區塊間距（px）' },
  { name: 'editable', type: 'boolean', def: 'false', desc: '可以拖曳移動、調整大小' },
  { name: 'compact', type: "'vertical' | 'none'", def: "'vertical'", desc: '往上靠攏，或保留空位' },
  { name: 'stackBelow', type: 'number', def: '640', desc: '容器寬度小於這個值（px）時改成一欄由上到下排列、不能編輯；0 為不切換' },
  { name: 'persistKey', type: 'string', def: '—', desc: '把版面記在 localStorage（chpt-dashboard:{persistKey}），掛載時套用' },
  { name: 'ariaLabel', type: 'string', def: '語系（繁中「儀表板」）', desc: '區域名稱' },
]
const dashboardItemRows = [
  { name: 'id / title', type: 'string', def: '—', desc: '唯一鍵（也是內容插槽的名稱）；標題列文字' },
  { name: 'x / y / w / h', type: 'number', def: '—', desc: '位置與大小（以格為單位）' },
  { name: 'minW / maxW / minH / maxH', type: 'number', def: '—', desc: '調整大小的限制' },
  { name: 'static', type: 'boolean', def: 'false', desc: '固定不動：不能拖、不會被推開' },
]
const dashboardEvents = [
  { name: 'update:modelValue', params: '(layout: DashboardItem[])', desc: '版面改變' },
  { name: 'layout-change', params: '(layout: DashboardItem[])', desc: '拖曳、調整大小或鍵盤操作結束且版面有變（適合在這裡存到後端）' },
]
const dashboardSlots = [
  { name: '{id}', params: '{ item }', desc: '該區塊的內容（插槽名稱 = 區塊 id）' },
  { name: 'default', params: '{ item }', desc: '沒有專屬插槽的區塊用這個' },
  { name: 'actions', params: '{ item }', desc: '標題列右側（例如更多選單、重新整理鈕）' },
]
const dashboardMethods = [
  { name: 'layout()', type: '() => DashboardItem[]', desc: '目前（整理過的）版面' },
  { name: 'clearSaved()', type: '() => void', desc: '清掉 persistKey 記住的版面' },
]

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
