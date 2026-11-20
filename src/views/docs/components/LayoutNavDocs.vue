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
    <section id="chpt-card" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptCard 卡片</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>將同主題的內容／操作收進一個區塊容器；可帶標題列、右上角額外區（如狀態標籤）與底部列。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptCard } from '@/components/library'</code>
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
    <section id="chpt-collapse" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
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
    <section id="chpt-breadcrumb" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
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
    <section id="chpt-steps" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
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
    <section id="chpt-divider" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
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

    <section id="chpt-dashboard-grid" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
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

    <!-- ============ ChptEquipmentWall ============ -->
    <section id="chpt-equipment-wall" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptEquipmentWall 機台狀態牆</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>產線看板、值班畫面 —— 一眼看出哪幾台停了、停多久、為什麼。每台一張卡：狀態（顏色 + 圖示 + 文字）、
        已持續多久、警報原因、工單、稼動率與其他數值；停機的卡片整張帶紅。工具列的狀態數量也是篩選，可搜尋名稱、工單、料號。
        狀態改變時卡片閃一下外框，變成停機時以 aria-live 念出。鍵盤：整面牆一個 Tab 停駐點，方向鍵在卡片間移動。
        狀態名稱與 StateTimeline 相同，同一份 MES 資料可以兩邊共用。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptEquipmentWall } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <div class="mb-3 flex flex-wrap items-center gap-4">
          <ChptSwitch v-model="wallLive" label="模擬即時更新（每 3 秒）" />
          <ChptSwitch v-model="wallCompact" label="精簡" />
          <ChptSwitch v-model="wallSortStatus" label="停機排前面" />
        </div>
        <ChptEquipmentWall
          :items="machines"
          :density="wallCompact ? 'compact' : 'comfortable'"
          :sort-by="wallSortStatus ? 'status' : 'none'"
          @item-click="(m) => (pickedMachine = m.name)"
        />
        <p class="mt-3 text-sm text-content-secondary" aria-live="polite">{{ pickedMachine ? `開啟 ${pickedMachine} 的明細` : '點一張卡片開啟明細' }}</p>
      </div>
      <ChptCodeBlock class="mt-6" :code="wallSample" />
      <ApiTable of="ChptEquipmentWall" title="Props" :rows="wallProps" />
      <ApiTable of="-" title="EquipmentItem（items 的每一筆）" :rows="wallItemRows" />
      <ApiTable of="ChptEquipmentWall" title="Events" :rows="wallEvents" />
      <ApiTable of="ChptEquipmentWall" title="Slots" :rows="wallSlots" />
      <ApiTable of="ChptEquipmentWall" title="方法（ref）" :rows="wallMethods" />
    </section>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
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
  ChptEquipmentWall,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

// ---- ChptEquipmentWall ----
const minutesAgo = (m) => Date.now() - m * 60_000
const machines = ref([
  { id: 'm1', name: 'SMT-01 印刷機', group: 'SMT 一線', status: 'run', since: minutesAgo(184), utilization: 92, workOrder: 'WO-2611-0042', product: 'PCB-A12', metrics: [{ label: '產出', value: 1260, unit: 'pcs' }, { label: 'CT', value: 21.4, unit: 's' }] },
  { id: 'm2', name: 'SMT-02 貼片機', group: 'SMT 一線', status: 'down', since: minutesAgo(25), alarm: '吸嘴 N3 真空異常', utilization: 71, workOrder: 'WO-2611-0042', product: 'PCB-A12' },
  { id: 'm3', name: 'SMT-03 貼片機', group: 'SMT 一線', status: 'run', since: minutesAgo(312), utilization: 88, workOrder: 'WO-2611-0042', metrics: [{ label: '拋料率', value: 0.12, unit: '%' }] },
  { id: 'm4', name: 'SMT-04 回焊爐', group: 'SMT 一線', status: 'run', since: minutesAgo(600), utilization: 95, metrics: [{ label: '峰溫', value: 245, unit: '°C' }] },
  { id: 'm5', name: 'SMT-05 印刷機', group: 'SMT 二線', status: 'idle', since: minutesAgo(12), alarm: '等待物料', utilization: 64, workOrder: 'WO-2611-0051' },
  { id: 'm6', name: 'SMT-06 貼片機', group: 'SMT 二線', status: 'maintenance', since: minutesAgo(95), alarm: '週保養', utilization: 40 },
  { id: 'm7', name: 'SMT-07 貼片機', group: 'SMT 二線', status: 'run', since: minutesAgo(48), utilization: 83, workOrder: 'WO-2611-0051', product: 'PCB-B07' },
  { id: 'm8', name: 'SMT-08 回焊爐', group: 'SMT 二線', status: 'run', since: minutesAgo(1500), utilization: 90 },
  { id: 'm9', name: 'AOI-01', group: '檢測', status: 'run', since: minutesAgo(130), utilization: 86, metrics: [{ label: '誤判', value: 3.1, unit: '%' }] },
  { id: 'm10', name: 'AOI-02', group: '檢測', status: 'offline', since: minutesAgo(8) },
  { id: 'm11', name: 'ICT-01', group: '檢測', status: 'run', since: minutesAgo(75), utilization: 78, workOrder: 'WO-2611-0042' },
  { id: 'm12', name: 'FCT-01', group: '檢測', status: 'idle', since: minutesAgo(3), utilization: 58 },
])
const wallLive = ref(false)
const wallCompact = ref(false)
const wallSortStatus = ref(false)
const pickedMachine = ref('')
const ALARMS = ['吸嘴真空異常', '飛達卡料', '軌道卡板', '溫度超出規格']
let wallTimer = null
let tick = 0
watch(wallLive, (on) => {
  clearInterval(wallTimer)
  if (!on) return
  wallTimer = setInterval(() => {
    // 固定的輪替（不用亂數）：每次改一台機台的狀態
    tick++
    const m = machines.value[(tick * 5) % machines.value.length]
    const next = m.status === 'run' ? (tick % 3 === 0 ? 'down' : 'idle') : 'run'
    m.status = next
    m.since = Date.now()
    m.alarm = next === 'down' ? ALARMS[tick % ALARMS.length] : next === 'idle' ? '等待物料' : undefined
  }, 3000)
})
onBeforeUnmount(() => clearInterval(wallTimer))
const wallSample = `<ChptEquipmentWall :items="machines" sort-by="status" @item-click="openDetail">
  <template #extra="{ item }">
    <ChptButton v-if="item.status === 'down'" size="xs" @click.stop="callTech(item)">呼叫技術員</ChptButton>
  </template>
</ChptEquipmentWall>

// machines：[{ id: 'm2', name: 'SMT-02 貼片機', group: 'SMT 一線', status: 'down',
//              since: '2026-11-20T08:35:00', alarm: '吸嘴 N3 真空異常', utilization: 71,
//              workOrder: 'WO-2611-0042', metrics: [{ label: '產出', value: 1260, unit: 'pcs' }] }]`
const wallProps = [
  { name: 'items', type: 'EquipmentItem[]', def: '—', desc: '機台清單；狀態改變時傳新陣列或直接改物件都可以' },
  { name: 'groupBy', type: 'boolean', def: '有 group 就分組', desc: '依 group（產線、區域）分組，每組標題顯示各狀態數量' },
  { name: 'sortBy', type: "'none' | 'status' | 'name'", def: "'none'", desc: '排序：保持原順序／停機 > 保養 > 待機 > 離線 > 運轉／名稱（數字自然排序）' },
  { name: 'minCardWidth', type: 'number', def: '200', desc: '卡片最小寬度（px），欄數依容器寬度自動決定' },
  { name: 'density', type: "'comfortable' | 'compact'", def: "'comfortable'", desc: '精簡模式只顯示名稱、狀態、時間與警報' },
  { name: 'showToolbar / searchable', type: 'boolean', def: 'true', desc: '工具列（狀態數量＝篩選、平均稼動率）／搜尋框' },
  { name: 'announceStatuses', type: 'EquipmentStatus[]', def: "['down']", desc: '變成這些狀態時以 aria-live 念出' },
  { name: 'now', type: 'number | Date | null', def: 'null', desc: '計算持續時間用的現在時間；不給時每 30 秒自己更新' },
]
const wallItemRows = [
  { name: 'id / name', type: 'string', def: '—', desc: '唯一鍵／顯示名稱' },
  { name: 'status', type: "'run' | 'idle' | 'maintenance' | 'down' | 'offline'", def: '—', desc: '狀態（顏色 + 圖示 + 文字）' },
  { name: 'group', type: 'string', def: '—', desc: '分組（產線、區域）' },
  { name: 'since', type: 'string | number | Date', def: '—', desc: '進入目前狀態的時間（顯示「已停機 25 分」）' },
  { name: 'alarm', type: 'string', def: '—', desc: '警報或停機原因（停機時紅字）' },
  { name: 'utilization', type: 'number（0–100）', def: '—', desc: '稼動率（進度條）' },
  { name: 'workOrder / product', type: 'string', def: '—', desc: '目前工單／料號（可搜尋）' },
  { name: 'metrics', type: '{ label, value, unit? }[]', def: '—', desc: '其他數值，顯示前三個' },
]
const wallEvents = [{ name: 'item-click', params: '(item: EquipmentItem)', desc: '點擊或 Enter 一張卡片（有綁時卡片是按鈕）' }]
const wallSlots = [{ name: 'extra', params: '{ item }', desc: '卡片最下方的自訂內容（按鈕請加 @click.stop）' }]
const wallMethods = [
  { name: 'setStatusFilter(statuses)', type: '(statuses: EquipmentStatus[]) => void', desc: '設定狀態篩選（空陣列為全部）' },
  { name: 'setQuery(q)', type: '(q: string) => void', desc: '設定搜尋文字' },
]
import { useToast } from '@/components/library'

/** 文件示範的事件回饋（DocLayout 掛了全域 ChptToast） */
const toast = useToast()

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
  toast.info('卡片被點擊')
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
