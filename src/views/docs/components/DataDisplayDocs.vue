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
  </div>
</template>

<script setup>
import { ChptStatistic, ChptDescriptions, ChptTimeline, ChptTag, ChptCodeBlock } from '@/components/library'
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
</script>
