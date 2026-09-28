<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">🗂️</span>
        <h1 class="text-4xl font-bold text-content-primary">資料展示元件</h1>
      </div>
      <p class="text-content-secondary text-lg max-w-4xl">
        ChptStatistic（統計數值）、ChptDescriptions（描述清單）、ChptTimeline（時間軸）。
        呈現「一筆資料」與「一段歷程」—— 多筆資料請用 ChptTable。
      </p>
    </div>

    <!-- ============ ChptStatistic ============ -->
    <section id="chpt-statistic" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptStatistic 統計數值</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>儀表板上的關鍵數字與它和前期相比的變化。「變化的好壞」不一定等於「升降」：
        不良率上升是壞事，請設 <code>:higher-is-better="false"</code>，否則「不良率 +0.8%」會被畫成綠色。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptStatistic } from '@/components/library'</code>
      </p>

      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="rounded-lg border border-stroke-light bg-surface-secondary p-4">
          <ChptStatistic title="今日產出" :value="128450" suffix="pcs" :delta="4.2" description="較昨日" />
        </div>
        <div class="rounded-lg border border-stroke-light bg-surface-secondary p-4">
          <ChptStatistic title="綜合良率" :value="98.26" :precision="2" suffix="%" :delta="0.35" :delta-precision="2" description="較上週" />
        </div>
        <div class="rounded-lg border border-stroke-light bg-surface-secondary p-4">
          <ChptStatistic title="不良率" :value="1.74" :precision="2" suffix="%" :delta="0.8" :higher-is-better="false" description="較上週" />
        </div>
        <div class="rounded-lg border border-stroke-light bg-surface-secondary p-4">
          <ChptStatistic title="停機時間" :value="42" suffix="分" :delta="-12" delta-suffix=" 分" :delta-precision="0" :higher-is-better="false" description="較昨日" />
        </div>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-6">
        <ChptStatistic title="營收" :value="3862500" prefix="NT$" size="sm" />
        <ChptStatistic title="載入中" :value="0" loading size="sm" />
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="statisticSample" />
      </div>
      <ApiTable title="Props" :rows="statisticProps" />
      <ApiTable title="Slots" :rows="statisticSlots" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>趨勢除了顏色與箭頭，也會給螢幕閱讀器一段文字（「上升 0.8%（表現較差）」），
        色盲使用者也能從箭頭方向判斷。數字以遠離零的方式四捨五入，與 Excel 的 ROUND 一致。
      </p>
    </section>

    <!-- ============ ChptDescriptions ============ -->
    <section id="chpt-descriptions" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptDescriptions 描述清單</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>一筆資料的欄位與值 —— 工單明細、料號資訊、機台參數。語意上是
        <code>dl / dt / dd</code>，螢幕閱讀器會把欄位名與值配對唸出；窄螢幕自動變成一欄。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptDescriptions } from '@/components/library'</code>
      </p>

      <ChptDescriptions title="工單資訊" :items="orderItems" :column="3">
        <template #extra>
          <ChptTag label="生產中" color="success" />
        </template>
      </ChptDescriptions>

      <div class="mt-8">
        <ChptDescriptions title="機台參數（bordered）" :items="machineItems" :column="2" bordered label-width="8rem">
          <template #value="{ item }">
            <ChptTag v-if="item.key === 'status'" :label="String(item.value)" color="warning" />
            <template v-else>{{ item.value ?? '—' }}</template>
          </template>
        </ChptDescriptions>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="descriptionsSample" />
      </div>
      <ApiTable title="Props" :rows="descriptionsProps" />
      <ApiTable title="Slots" :rows="descriptionsSlots" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>值是 null／undefined／空字串時顯示 <code>emptyText</code>（預設「—」），
        不會出現空白格讓人以為還沒載入。<code>span</code> 超過 <code>column</code> 時以 column 為上限。
      </p>
    </section>

    <!-- ============ ChptTimeline ============ -->
    <section id="chpt-timeline" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptTimeline 時間軸</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>依時間排列「已經發生的事」—— 工單流程紀錄、設備異常歷程、審核軌跡。
        「接下來要做的步驟」請用 ChptSteps。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptTimeline } from '@/components/library'</code>
      </p>

      <div class="grid md:grid-cols-2 gap-8">
        <div>
          <h3 class="text-sm font-semibold text-content-secondary mb-3">工單流程</h3>
          <ChptTimeline :items="flowItems" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-content-secondary mb-3">設備事件（最新在上、圖示節點）</h3>
          <ChptTimeline :items="eventItems" reverse />
        </div>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="timelineSample" />
      </div>
      <ApiTable title="Props" :rows="timelineProps" />
      <ApiTable title="TimelineItem" :rows="timelineItemRows" />
      <ApiTable title="Slots" :rows="timelineSlots" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>時間請同時給顯示用的 <code>time</code> 與機器可讀的 <code>datetime</code>（ISO 8601）。
        通往「進行中」節點的連接線會畫成虛線。
      </p>
    </section>

    <!-- ============ ChptTree ============ -->
    <section id="chpt-tree" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptTree 樹狀清單</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>有階層的資料 —— 組織／廠區／產線、料號 BOM、權限設定。
        單選用 <code>v-model</code>，多選勾選用 <code>v-model:checked</code>（父子三態連動），可篩選並高亮。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptTree } from '@/components/library'</code>
      </p>

      <div class="grid gap-6 md:grid-cols-2">
        <div class="rounded-lg border border-stroke-light p-3">
          <div class="mb-2 flex items-center justify-between gap-2">
            <h3 class="text-sm font-semibold text-content-secondary">單選 + 篩選</h3>
            <ChptInput v-model="treeFilter" placeholder="篩選產線" prefix-icon="search" size="xs" clearable />
          </div>
          <ChptTree v-model="selectedLine" :data="plantTree" :filter-text="treeFilter" default-expand-all aria-label="廠區與產線">
            <template #extra="{ node }">
              <ChptTag v-if="node.status" :label="node.status" :color="node.status === '停機' ? 'danger' : 'success'" size="xs" />
            </template>
          </ChptTree>
          <p class="mt-2 text-xs text-content-tertiary">選取：{{ selectedLine ?? '（無）' }}</p>
        </div>
        <div class="rounded-lg border border-stroke-light p-3">
          <h3 class="mb-2 text-sm font-semibold text-content-secondary">勾選（權限設定）</h3>
          <ChptTree v-model:checked="grantedKeys" :data="permissionTree" checkable :selectable="false" default-expand-all aria-label="權限" />
          <p class="mt-2 text-xs text-content-tertiary break-all">已勾選：{{ grantedKeys.join('、') || '（無）' }}</p>
        </div>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="treeSample" />
      </div>
      <ApiTable title="Props" :rows="treeProps" />
      <ApiTable title="Events" :rows="treeEvents" />
      <ApiTable title="Slots / 方法" :rows="treeSlots" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>鍵盤照 WAI-ARIA tree：整棵樹一個 Tab 停駐點，↑↓ 移動、→ 展開／進入子節點、← 收合／回到父節點、
        Home／End、Enter 選取、Space 勾選、* 展開同層、打字跳轉。停用節點不會被勾父節點時一起勾選；
        <code>checked</code> 只含「完整勾選」的節點，部分勾選的父節點用 <code>getHalfCheckedKeys()</code> 取得。
      </p>
    </section>

    <!-- ============ ChptImage ============ -->
    <section id="chpt-image" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptImage 圖片 / ChptImageViewer 看圖</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>檢驗照片、瑕疵圖、產品圖。固定外框避免版面跳動，載入中顯示骨架、失敗時顯示圖示與替代文字；
        preview 可點開全螢幕檢視（縮放、旋轉、左右切換同一組圖）。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptImage, ChptImageViewer } from '@/components/library'</code>
      </p>

      <div class="bg-surface-secondary rounded-lg p-4">
        <p class="mb-2 text-sm text-content-secondary">AOI 瑕疵圖（點圖放大，可用 ← → 切換）</p>
        <div class="flex flex-wrap gap-3">
          <ChptImage
            v-for="img in defectImages"
            :key="img.src"
            :src="img.src"
            :alt="img.alt"
            :width="120"
            :height="90"
            preview
            :preview-src-list="defectImages"
          />
          <ChptImage src="/not-found.png" alt="SMT-02 第 3 片（檔案遺失）" :width="120" :height="90" />
        </div>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="imageSample" />
      </div>
      <ApiTable title="ChptImage Props" :rows="imageProps" />
      <ApiTable title="ChptImageViewer Props / Events" :rows="viewerProps" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>alt 是必填 —— 描述圖片內容（「焊點橋接」），純裝飾的圖傳 <code>alt=""</code>。
        檢視器是模態 dialog：焦點困在裡面、背景不捲動、關閉後回到原本的縮圖；← → 切換、+／− 或滾輪縮放、0 重設、R 旋轉、Esc 關閉，
        放大後可拖曳移動。
      </p>
    </section>

    <!-- ============ ChptList ============ -->
    <section id="chpt-list" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptList 清單</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>通知、待辦、最近活動這類「一筆一行」的清單。給 <code>items</code>（title / description / extra / avatar）就有預設版面，
        也可以用插槽自己排；<code>hasMore</code> 接「載入更多」，加 <code>infinite</code> 捲到底自動載入。上萬筆請改用 ChptVirtualList。
      </p>
      <div class="grid gap-6 lg:grid-cols-2">
        <ChptList :items="activities" header="最近活動" :has-more="activities.length < 9" :loading="listLoading" @load-more="loadActivities">
          <template #actions="{ item }">
            <ChptTag :label="item.level" :color="item.level === '警示' ? 'danger' : 'info'" size="xs" />
          </template>
        </ChptList>
        <ChptList :items="machines" :grid="150" :bordered="false" :split="false" size="sm">
          <template #default="{ item }">
            <p class="font-medium text-content-primary">{{ item.name }}</p>
            <p class="text-xs" :class="item.ok ? 'text-success' : 'text-danger'">{{ item.ok ? '運轉中' : '停機' }}</p>
          </template>
        </ChptList>
      </div>
      <ChptCodeBlock class="mt-6" :code="listSample" />
      <ApiTable title="Props / Events" :rows="listProps" />
    </section>

    <!-- ============ ChptQRCode ============ -->
    <section id="chpt-qrcode" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptQRCode QR Code</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>工單、序號標籤、登入連結、報表分享。SVG 繪製任何尺寸都銳利；中文內容以 UTF-8 編碼，掃出來是原文。
        深色模式也維持白底黑碼（很多掃描器讀不了反白的碼）。
      </p>
      <div class="flex flex-wrap items-start gap-6">
        <div class="space-y-2 text-center">
          <ChptQRCode ref="qrRef" :value="qrValue" :size="140" />
          <ChptButton size="sm" is-outline @click="qrRef?.download('wo-qrcode.png')">下載 PNG</ChptButton>
        </div>
        <ChptQRCode value="工單 WO-2609-101｜SMT-02｜回焊爐" :size="140" level="Q" title="工單 WO-2609-101 標籤" />
        <ChptQRCode value="https://example.com/login?token=abc" :size="140" :status="qrExpired ? 'expired' : 'active'" @refresh="qrExpired = false" />
        <div class="w-64">
          <ChptInput v-model="qrValue" label="內容" full-width />
          <ChptSwitch v-model="qrExpired" label="模擬過期" class="mt-3" />
        </div>
      </div>
      <ChptCodeBlock class="mt-6" :code="qrSample" />
      <ApiTable title="Props" :rows="qrProps" />
    </section>

  </div>
</template>

<script setup>
import { ref, useTemplateRef } from 'vue'
import {
  ChptStatistic,
  ChptDescriptions,
  ChptTimeline,
  ChptTag,
  ChptCodeBlock,
  ChptTree,
  ChptInput,
  ChptImage,
  ChptList,
  ChptQRCode,
  ChptButton,
  ChptSwitch,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

// ---- ChptStatistic ----
const statisticSample = `<ChptStatistic title="綜合良率" :value="98.26" :precision="2" suffix="%" :delta="0.35" description="較上週" />

<!-- 越低越好的指標：上升顯示紅色 -->
<ChptStatistic title="不良率" :value="1.74" suffix="%" :delta="0.8" :higher-is-better="false" />`
const statisticProps = [
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'value', type: 'number | string | null', def: 'null', desc: '數值；字串原樣顯示、null 顯示 —' },
  { name: 'precision', type: 'number', def: '—', desc: '小數位數（遠離零四捨五入）' },
  { name: 'groupSeparator', type: 'boolean', def: 'true', desc: '千分位' },
  { name: 'prefix / suffix', type: 'string', def: "''", desc: '前綴（NT$）／後綴（%、pcs）' },
  { name: 'delta', type: 'number | null', def: 'null', desc: '與前期相比的變化；null 不顯示趨勢' },
  { name: 'deltaSuffix / deltaPrecision', type: 'string / number', def: "'%' / 1", desc: '變化量的單位與小數位數' },
  { name: 'higherIsBetter', type: 'boolean', def: 'true', desc: '數值越高越好；不良率、停機時間請設 false' },
  { name: 'description', type: 'string', def: "''", desc: '趨勢旁的說明（較上週）' },
  { name: 'valueClass', type: 'string', def: "''", desc: '數值的顏色 class（例如 text-danger）' },
  { name: 'size', type: "'sm' | 'md' | 'lg'", def: "'md'", desc: '尺寸' },
  { name: 'loading', type: 'boolean', def: 'false', desc: '載入中（骨架）' },
]
const statisticSlots = [
  { name: 'title / prefix / suffix', params: '—', desc: '覆寫標題、前後綴' },
  { name: 'footer', params: '—', desc: '數值下方的額外內容（例如迷你走勢圖）' },
]

// ---- ChptDescriptions ----
const orderItems = [
  { label: '工單', value: 'WO-2026-0917' },
  { label: '料號', value: 'PCB-A12-R3' },
  { label: '客戶', value: '台灣精密' },
  { label: '投入', value: '1,200 pcs' },
  { label: '產出', value: '1,178 pcs' },
  { label: '交期', value: '2026-10-05' },
  { label: '備註', value: null, span: 3 },
]
const machineItems = [
  { key: 'id', label: '機台', value: 'SMT-L3-02' },
  { key: 'status', label: '狀態', value: '保養中' },
  { key: 'temp', label: '回焊溫度', value: '245 °C' },
  { key: 'speed', label: '輸送速度', value: '0.9 m/min' },
  { key: 'last', label: '上次保養', value: '2026-09-21 08:30', span: 2 },
]
const descriptionsSample = `<ChptDescriptions title="工單資訊" :items="items" :column="3">
  <template #extra><ChptTag label="生產中" color="success" /></template>
</ChptDescriptions>

<ChptDescriptions :items="items" :column="2" bordered label-width="8rem">
  <template #value="{ item }">
    <ChptTag v-if="item.key === 'status'" :label="item.value" />
    <template v-else>{{ item.value }}</template>
  </template>
</ChptDescriptions>

const items = [
  { label: '工單', value: 'WO-2026-0917' },
  { label: '備註', value: null, span: 3 },
]`
const descriptionsProps = [
  { name: 'items', type: 'DescriptionItem[]', def: '—', desc: '{ key?, label, value?, span? }' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'column', type: 'number', def: '3', desc: '一列幾欄（窄螢幕自動一欄）' },
  { name: 'bordered', type: 'boolean', def: 'false', desc: '表格式外框，標籤有底色' },
  { name: 'layout', type: "'horizontal' | 'vertical'", def: "'horizontal'", desc: '標籤與值左右並排或上下堆疊' },
  { name: 'labelWidth', type: 'string', def: "''", desc: '左右並排時標籤的固定寬度，讓值對齊' },
  { name: 'size', type: "'sm' | 'md'", def: "'sm'", desc: '文字大小' },
  { name: 'emptyText', type: 'string', def: "'—'", desc: '值是空的時顯示的文字' },
]
const descriptionsSlots = [
  { name: 'title / extra', params: '—', desc: '標題與右上角操作區' },
  { name: 'value', params: '{ item, index }', desc: '自訂值的呈現' },
]

// ---- ChptTimeline ----
const flowItems = [
  { title: '建立工單', time: '09:02', datetime: '2026-09-28T09:02', content: '王小明 建立', color: 'primary' },
  { title: 'SMT 完成', time: '11:40', datetime: '2026-09-28T11:40', content: '良率 99.2%', color: 'success' },
  { title: 'AOI 異常', time: '13:15', datetime: '2026-09-28T13:15', content: '3 片偏移，已重工', color: 'warning', current: true },
  { title: '最終檢驗', pending: true },
]
const eventItems = [
  { title: '開機', time: '08:00', icon: 'power_settings_new', color: 'success' },
  { title: '溫度過高警報', time: '10:12', icon: 'warning', color: 'danger', content: '回焊區 3 超過 260 °C' },
  { title: '保養完成', time: '14:30', icon: 'build', color: 'info' },
]
const timelineSample = `<ChptTimeline :items="[
  { title: '建立工單', time: '09:02', datetime: '2026-09-28T09:02', color: 'primary' },
  { title: 'AOI 異常', time: '13:15', content: '3 片偏移', color: 'warning', current: true },
  { title: '最終檢驗', pending: true },
]" />`
const timelineProps = [
  { name: 'items', type: 'TimelineItem[]', def: '—', desc: '節點（見下表）' },
  { name: 'reverse', type: 'boolean', def: 'false', desc: '反轉順序（最新的在最上面）' },
]
const timelineItemRows = [
  { name: 'title / content', type: 'string', def: '—', desc: '標題與內容' },
  { name: 'time / datetime', type: 'string', def: '—', desc: '顯示用時間／機器可讀時間（ISO 8601）' },
  { name: 'color', type: "'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'", def: "'primary'", desc: '節點顏色' },
  { name: 'hollow / icon', type: 'boolean / string', def: '—', desc: '空心節點／以圖示取代圓點' },
  { name: 'pending / current', type: 'boolean', def: 'false', desc: '進行中（旋轉節點、虛線）／目前節點（aria-current）' },
]
const timelineSlots = [
  { name: 'dot', params: '{ item, index }', desc: '自訂節點' },
  { name: 'content', params: '{ item, index }', desc: '自訂內容' },
]

// ---- ChptTree ----
const treeFilter = ref('')
const selectedLine = ref(null)
const plantTree = [
  {
    key: 'hsinchu', label: '新竹廠', icon: 'factory',
    children: [
      { key: 'hc-smt', label: 'SMT 區', children: [
        { key: 'hc-smt-1', label: 'SMT Line 1', status: '運轉' },
        { key: 'hc-smt-2', label: 'SMT Line 2', status: '停機' },
      ] },
      { key: 'hc-aoi', label: 'AOI 區', children: [{ key: 'hc-aoi-1', label: 'AOI Line 1', status: '運轉' }] },
    ],
  },
  {
    key: 'taichung', label: '台中廠', icon: 'factory',
    children: [
      { key: 'tc-smt-1', label: 'SMT Line 1', status: '運轉' },
      { key: 'tc-test', label: '測試區（建置中）', disabled: true },
    ],
  },
]
const grantedKeys = ref(['report-view'])
const permissionTree = [
  { key: 'report', label: '報表', children: [
    { key: 'report-view', label: '檢視' },
    { key: 'report-export', label: '匯出' },
  ] },
  { key: 'order', label: '工單', children: [
    { key: 'order-view', label: '檢視' },
    { key: 'order-edit', label: '編輯' },
    { key: 'order-delete', label: '刪除（需主管）', disabled: true },
  ] },
  { key: 'admin', label: '系統管理' },
]
const treeSample = `<ChptTree v-model="lineKey" :data="plants" :filter-text="keyword" default-expand-all aria-label="產線">
  <template #extra="{ node }"><ChptTag :label="node.status" /></template>
</ChptTree>

<ChptTree v-model:checked="granted" :data="permissions" checkable :selectable="false" />

const plants = [
  { key: 'hsinchu', label: '新竹廠', children: [{ key: 'l1', label: 'SMT Line 1' }] },
]`
const treeProps = [
  { name: 'data', type: 'TreeNode[]', def: '—', desc: '{ key, label, children?, disabled?, icon?, ...自訂欄位 }' },
  { name: 'modelValue', type: 'string | number | null', def: 'null', desc: '單選的節點 key（v-model）' },
  { name: 'selectable', type: 'boolean', def: 'true', desc: '可以點選節點' },
  { name: 'checkable', type: 'boolean', def: 'false', desc: '顯示勾選框（v-model:checked）' },
  { name: 'checked', type: 'Key[]', def: '[]', desc: '完整勾選的節點 key（含父節點）' },
  { name: 'expanded', type: 'Key[]', def: '—', desc: '展開的節點（v-model:expanded；不給時自己管理）' },
  { name: 'defaultExpandAll', type: 'boolean', def: 'false', desc: '預設全部展開' },
  { name: 'filterText', type: 'string', def: "''", desc: '篩選：顯示符合的節點與祖先、自動展開、高亮' },
  { name: 'indent / size', type: "number / 'sm' | 'md'", def: "20 / 'md'", desc: '每層縮排（px）／列高' },
  { name: 'ariaLabel / emptyText', type: 'string', def: '—', desc: '樹的名稱（給報讀器）／沒有資料時的文字' },
]
const treeEvents = [
  { name: 'update:modelValue / select', params: '(key) / (node)', desc: '選取節點' },
  { name: 'update:checked / check', params: '(keys) / (node, checked, keys)', desc: '勾選變更' },
  { name: 'update:expanded / expand', params: '(keys) / (node, expanded)', desc: '展開變更' },
]
const treeSlots = [
  { name: '#label', params: '{ node, level }', desc: '自訂節點文字' },
  { name: '#extra', params: '{ node, level }', desc: '節點右側（狀態標籤、操作按鈕）' },
  { name: 'expandAll / collapseAll', params: '()', desc: '全部展開／收合（ref 方法）' },
  { name: 'getCheckedNodes / getHalfCheckedKeys', params: '()', desc: '勾選的節點／部分勾選的父節點 key（ref 方法）' },
]

// ---- ChptImage ----
/** 示範用的圖：就地產生 SVG，文檔站離線也看得到 */
function demoImage(label, hue) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
<rect width="640" height="480" fill="hsl(${hue} 35% 22%)"/>
<g stroke="hsl(${hue} 60% 60%)" stroke-width="6" fill="none" opacity=".7">
<rect x="80" y="90" width="200" height="120" rx="8"/><rect x="360" y="90" width="200" height="120" rx="8"/>
<path d="M180 210v90h280v-90"/><circle cx="320" cy="360" r="42"/></g>
<circle cx="320" cy="300" r="26" fill="none" stroke="#f87171" stroke-width="5"/>
<text x="32" y="450" font-family="sans-serif" font-size="30" fill="#fff">${label}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
const defectImages = [
  { src: demoImage('#1 焊點橋接', 210), alt: 'SMT-01 第 1 片：焊點橋接' },
  { src: demoImage('#2 元件偏移', 160), alt: 'SMT-01 第 2 片：元件偏移' },
  { src: demoImage('#3 缺件', 30), alt: 'SMT-01 第 3 片：缺件' },
]
const imageSample = `<ChptImage :src="url" alt="SMT-01 第 1 片：焊點橋接" :width="120" :height="90" preview />

<!-- 一組圖：預覽時可左右切換 -->
<ChptImage v-for="img in photos" :key="img.src" v-bind="img" preview :preview-src-list="photos" />

<!-- 單獨使用檢視器 -->
<ChptImageViewer v-model:open="open" v-model:index="i" :images="photos" />`
const imageProps = [
  { name: 'src / alt', type: 'string', def: '—', desc: '圖片網址與替代文字（alt 必填；裝飾圖傳空字串）' },
  { name: 'width / height', type: 'number | string', def: '—', desc: '外框大小（數字 = px）' },
  { name: 'fit', type: "'cover' | 'contain' | 'fill' | 'none' | 'scale-down'", def: "'cover'", desc: 'object-fit' },
  { name: 'lazy', type: 'boolean', def: 'true', desc: 'loading="lazy"' },
  { name: 'rounded', type: "'none' | 'sm' | 'md' | 'lg' | 'full'", def: "'md'", desc: '圓角' },
  { name: 'preview / previewSrcList', type: 'boolean / (string | { src, alt })[]', def: 'false / []', desc: '點擊放大；可切換的整組圖' },
  { name: 'Events', type: 'load / error / preview(index)', def: '—', desc: '載入完成、失敗、開啟預覽' },
  { name: '#error', type: 'slot', def: '—', desc: '自訂載入失敗的內容' },
]
const viewerProps = [
  { name: 'open', type: 'boolean', def: 'false', desc: 'v-model:open' },
  { name: 'images', type: '(string | { src, alt })[]', def: '—', desc: '要看的圖' },
  { name: 'index', type: 'number', def: '0', desc: 'v-model:index：目前第幾張' },
  { name: 'loop / thumbnails', type: 'boolean', def: 'true / true', desc: '頭尾循環／下方縮圖列' },
  { name: 'minScale / maxScale', type: 'number', def: '0.25 / 8', desc: '縮放範圍' },
  { name: 'Events', type: 'update:open / update:index / close', def: '—', desc: '' },
]

// ===== ChptList =====
const levels = ['資訊', '警示']
const makeActivity = (i) => ({
  id: i,
  title: ['SMT-01 換線完成', 'AOI 誤判率上升', '回焊爐溫度恢復', 'ICT 治具更換', '錫膏批號變更'][i % 5],
  description: `${8 + (i % 9)}:${String((i * 7) % 60).padStart(2, '0')} · ${['王小明', '陳建宏', '李佩珊'][i % 3]}`,
  extra: `${i * 3 + 2} 分鐘前`,
  level: levels[i % 3 === 1 ? 1 : 0],
})
const activities = ref([0, 1, 2].map(makeActivity))
const listLoading = ref(false)
function loadActivities() {
  listLoading.value = true
  setTimeout(() => {
    const n = activities.value.length
    activities.value = [...activities.value, ...[n, n + 1, n + 2].map(makeActivity)]
    listLoading.value = false
  }, 600)
}
const machines = ['SMT-01', 'SMT-02', 'AOI-01', 'ICT-01', 'FCT-02', 'Reflow-1'].map((name, i) => ({ id: name, name, ok: i !== 4 }))
const listSample = `<ChptList :items="activities" header="最近活動" :has-more="hasMore" :loading="loading" @load-more="fetchMore">
  <template #actions="{ item }"><ChptTag :label="item.level" size="xs" /></template>
</ChptList>

<!-- 格狀卡片 -->
<ChptList :items="machines" :grid="150">
  <template #default="{ item }">{{ item.name }}</template>
</ChptList>`
const listProps = [
  { name: 'items / itemKey', type: 'T[] / string', def: "[] / 'id'", desc: '資料；預設版面讀 avatar / title / description / extra' },
  { name: 'header / footer', type: 'string（或插槽）', def: "''", desc: '標題列 / 頁尾' },
  { name: 'loading', type: 'boolean', def: 'false', desc: '沒有資料時顯示骨架；已有資料時在底部顯示載入中（清單不會閃掉）' },
  { name: 'hasMore / infinite', type: 'boolean', def: 'false', desc: '載入更多按鈕；infinite 為捲到底自動載入' },
  { name: 'grid', type: 'number', def: '—', desc: '格狀排列，每張卡的最小寬度（px）' },
  { name: 'bordered / split / size / emptyText', type: '—', def: 'true / true / md / locale', desc: '外框、分隔線、內距、空狀態文字' },
  { name: '@load-more', type: 'event', def: '—', desc: '按下載入更多或捲到底' },
]

// ===== ChptQRCode =====
const qrRef = useTemplateRef('qrRef')
const qrValue = ref('https://example.com/wo/2609-101')
const qrExpired = ref(true)
const qrSample = `<ChptQRCode :value="url" :size="160" />
<ChptQRCode :value="loginUrl" :status="expired ? 'expired' : 'active'" @refresh="renew" />

qrRef.value.download('label.png')   // 下載 PNG`
const qrProps = [
  { name: 'value', type: 'string', def: '—', desc: '內容（支援中文；上限約 2.9KB）' },
  { name: 'size / margin', type: 'number', def: '160 / 2', desc: '邊長 px；四周留白模組數' },
  { name: 'level', type: "'L'|'M'|'Q'|'H'", def: "'M'", desc: '容錯等級；有 icon 時自動用 H' },
  { name: 'color / bgColor', type: 'string', def: '黑 / 白', desc: '顏色；兩者要有足夠對比才掃得出來' },
  { name: 'icon / iconRatio', type: 'string / number', def: "'' / 0.22", desc: '中央 Logo' },
  { name: 'status / expiredText', type: "'active'|'expired'|'loading'", def: "'active'", desc: '過期時顯示重新產生（@refresh）' },
  { name: 'title', type: 'string', def: '「QR Code：內容」', desc: '螢幕閱讀器唸的名稱' },
  { name: 'ref: toDataURL(scale) / download(filename)', type: '—', def: '—', desc: '輸出 PNG' },
]
</script>
