<template>
  <div class="min-h-screen bg-surface-secondary p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">GanttChart 甘特圖</h1>
        <p class="text-lg text-content-secondary">
          機台排程、工單、專案進度。每筆資料是一個任務（開始、結束、所在的列、狀態、進度），同一列可以排多個任務；
          沒有結束時間的任務畫成里程碑，任務之間可以畫相依箭頭。預設唯讀；開 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">editable</code> 後可以拖曳改排程。請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code>（或 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library/charts</code>）匯入；型別 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">GanttStatusDef</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">GanttRowInput</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">GanttTaskEvent</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">GanttTooltip</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">GanttTaskChange</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">GanttDependency</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">GanttSnap</code> 也從同一個入口取得。
        </p>
      </div>

      <!-- 機台排程 -->
      <section id="basic" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">機台排程</h2>
        <p class="text-sm text-content-secondary mb-4">
          每台機台一列，一列排多張工單。滾輪捲動列；<kbd>Ctrl</kbd>（Mac 為 <kbd>⌘</kbd>）+ 滾輪或觸控板捏合縮放時間軸，
          拖曳或左右滑動平移，雙擊回到預設範圍。時間軸依縮放程度在「月／日」與「日／時」之間切換。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 380px">
            <GanttChart
              :data="machineTasks"
              :rows="machines"
              row-field="machine"
              label-header="機台"
              :auto-resize="true"
              :show-counts="true"
              :highlight-key="selectedKey || null"
              @task-click="({ key }) => (selectedKey = key)"
            />
          </div>
          <p class="mt-2 text-xs text-content-tertiary" aria-live="polite">
            {{ selectedKey ? `已選取：${selectedKey}（highlightKey 會在圖上框出）` : '點任一張工單選取' }}
          </p>
        </div>
        <ChptCodeBlock class="mt-4" :code="basicCode" />
      </section>

      <!-- 專案進度 -->
      <section id="project" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">專案進度與里程碑</h2>
        <p class="text-sm text-content-secondary mb-4">
          沒有列欄位時每個任務自成一列。長條底部的細線是進度；沒有結束時間（或 <code>milestone</code> 為真）的任務畫成菱形。
          結束時間只寫日期（<code>'2026-11-06'</code>）時算到那一天結束（<code>inclusive-end-date</code>）。
          <code>auto-height</code> 讓高度依列數撐開、不捲動。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <GanttChart
            :data="projectTasks"
            :auto-resize="true"
            :auto-height="true"
            label-header="工作項目"
            title="新產線導入"
            :label-width="180"
          />
        </div>
        <ChptCodeBlock class="mt-4" :code="projectCode" />
      </section>

      <!-- 編輯排程 -->
      <section id="edit" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">編輯排程</h2>
        <p class="text-sm text-content-secondary mb-4">
          開 <code>editable</code> 後：拖曳長條移動、拖兩端調整長短、<kbd>Esc</kbd> 取消；
          用 <kbd>Tab</kbd> 選到任務後，方向鍵移動、<kbd>Shift</kbd> + 方向鍵調整結束、<kbd>Alt</kbd> + 方向鍵調整開始。
          時間依縮放程度吸附（看日時以天、放大到小時以 15 分）。
          <strong>元件不改資料</strong>：改動用 <code>task-change</code> 送出，由你更新 <code>data</code>（不更新就彈回原位，可以在這裡做檢查）。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <p class="text-sm text-content-secondary mb-2">
            專案計畫：<code>dependsOn</code> 畫出相依箭頭，後續任務開始得比前置任務結束早時箭頭變紅；
            <code>non-working-days</code> 與 <code>holidays</code> 把週末、假日畫上底色。
          </p>
          <GanttChart
            :data="planTasks"
            :auto-resize="true"
            :auto-height="true"
            :editable="true"
            :non-working-days="[0, 6]"
            :holidays="holidays"
            label-header="工作項目"
            :label-width="150"
            @task-change="onPlanChange"
          />
          <p class="mt-2 text-xs text-content-tertiary" aria-live="polite">{{ planMessage }}</p>
        </div>
        <div class="mt-4 bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <p class="text-sm text-content-secondary mb-2">
            機台換線：<code>allow-row-change</code> 讓工單可以拖到別台機台（或用上下鍵）。
          </p>
          <div style="height: 260px">
            <GanttChart
              :data="lineTasks"
              :rows="machines.slice(0, 4)"
              row-field="machine"
              label-header="機台"
              :auto-resize="true"
              :editable="true"
              :allow-row-change="true"
              :show-legend="false"
              @task-change="onLineChange"
            />
          </div>
          <p class="mt-2 text-xs text-content-tertiary" aria-live="polite">{{ lineMessage }}</p>
        </div>
        <ChptCodeBlock class="mt-4" :code="editCode" />
      </section>

      <!-- 大量資料 -->
      <section id="large" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">500 列、1 萬張工單</h2>
        <p class="text-sm text-content-secondary mb-4">
          只畫捲動視窗內的列與時間範圍內的任務，上千列也能順暢捲動。資料請用 <code>shallowRef</code> 或 <code>markRaw</code> 傳入。
          下方輸入工單號後呼叫 <code>ref.scrollToTask(key)</code>，會捲到那一列並把任務移進畫面。
        </p>
        <div class="mb-2 flex items-center gap-2 text-sm">
          <label for="gantt-find" class="text-content-secondary">工單號</label>
          <input
            id="gantt-find"
            v-model="findKey"
            class="h-control-sm w-40 rounded-md border border-stroke-default bg-surface-primary px-2 text-content-primary"
            placeholder="例如 WO-03210"
            @keydown.enter="findTask"
          />
          <ChptButton size="sm" @click="findTask">找出工單</ChptButton>
          <span class="text-xs text-content-tertiary" aria-live="polite">{{ findMessage }}</span>
        </div>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light" style="height: 480px">
          <GanttChart
            ref="largeRef"
            :data="largeTasks"
            row-field="machine"
            label-header="機台"
            :auto-resize="true"
            :row-height="28"
            :bar-height="18"
            :highlight-key="foundKey"
          />
        </div>
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="GanttChart" title="Props" :rows="propsRows" />
        <ApiTable of="GanttChart" title="Events" :rows="eventRows" />
        <ApiTable of="GanttChart" title="Slots" :rows="slotRows" />
        <ApiTable of="GanttChart" title="方法（ref）" :rows="methodRows" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, shallowRef } from 'vue'
import { GanttChart } from '@/components/library/charts'
import { ChptButton, ChptCodeBlock } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

const HOUR = 3600000
const DAY = 24 * HOUR

/** 可重現的亂數 */
function seeded(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** 今天 00:00（示範資料以今天為中心，「今天」線才會在畫面中） */
const today = new Date()
today.setHours(0, 0, 0, 0)
const t0 = today.getTime()

const machines = [
  { value: 'SMT-01', label: 'SMT-01 貼片機' },
  { value: 'SMT-02', label: 'SMT-02 貼片機' },
  { value: 'REF-01', label: 'REF-01 迴焊爐' },
  { value: 'AOI-01', label: 'AOI-01 光學檢測' },
  { value: 'AOI-02', label: 'AOI-02 光學檢測' },
  { value: 'ICT-01', label: 'ICT-01 電測' },
  { value: 'FCT-01', label: 'FCT-01 功能測試' },
  { value: 'PKG-01', label: 'PKG-01 包裝' },
]

/** 依時間判斷狀態：已結束為完成（少數延遲）、正在做為進行中、還沒開始為計畫 */
function statusAt(start, end, rand) {
  if (end <= Date.now()) return rand() < 0.12 ? 'delayed' : 'done'
  if (start <= Date.now()) return rand() < 0.2 ? 'delayed' : 'running'
  return 'planned'
}

/** 每台機台從 6 天前排到 8 天後，工單 4～30 小時、中間空 0～6 小時 */
function makeMachineTasks(list, seed, prefix = 'WO') {
  const rand = seeded(seed)
  const rows = []
  for (const m of list) {
    let cursor = t0 - 6 * DAY + Math.floor(rand() * 12) * HOUR
    while (cursor < t0 + 8 * DAY) {
      const dur = (4 + Math.floor(rand() * 27)) * HOUR
      const start = cursor
      const end = cursor + dur
      const status = statusAt(start, end, rand)
      const progress = status === 'done' ? 100 : status === 'planned' ? 0 : Math.round(Math.min(1, (Date.now() - start) / dur) * 100)
      const id = `${prefix}-${String(rows.length + 1).padStart(5, '0')}`
      rows.push({ id, machine: m.value ?? m, name: id, start: new Date(start), end: new Date(end), status, progress })
      cursor = end + Math.floor(rand() * 7) * HOUR
    }
  }
  return rows
}

const machineTasks = shallowRef(makeMachineTasks(machines, 3))
const selectedKey = ref('')

/** yyyy-mm-dd（本地時間） */
function ymd(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const day = (n) => ymd(t0 + n * DAY)

/** 可編輯的專案計畫（日期字串）：前置任務寫在 dependsOn */
const planTasks = ref([
  { id: 'a', name: '需求確認', start: day(-3), end: day(-1), status: 'done' },
  { id: 'b', name: '設計審查', start: day(0), end: day(2), status: 'running', progress: 50, dependsOn: 'a' },
  { id: 'c', name: '治具製作', start: day(3), end: day(7), status: 'planned', dependsOn: 'b' },
  { id: 'd', name: '程式撰寫', start: day(3), end: day(9), status: 'planned', dependsOn: 'b' },
  { id: 'e', name: '試產', start: day(10), end: day(12), status: 'planned', dependsOn: ['c', 'd'] },
  { id: 'f', name: '量產', start: day(14), status: 'planned', dependsOn: 'e' },
])
/** 示範用假日：兩週後的星期三 */
const holidays = [ymd(t0 + (((3 - today.getDay() + 7) % 7) + 7) * DAY)]
const planMessage = ref('拖曳任務試試看：把「治具製作」往後拖過「試產」的開始日，箭頭會變紅')

const fmtDay = (d) => `${d.getMonth() + 1}/${d.getDate()}`
const fmtTime = (d) => `${fmtDay(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/** 日期字串的資料：存回 start 與 displayEnd（那一天），不是 end（隔天 00:00） */
function onPlanChange(change) {
  planTasks.value = planTasks.value.map((t) =>
    t.id === change.key ? { ...t, start: ymd(change.start), ...(t.end ? { end: ymd(change.displayEnd) } : {}) } : t
  )
  const t = planTasks.value.find((x) => x.id === change.key)
  planMessage.value = t.end ? `「${t.name}」改為 ${fmtDay(change.start)}～${fmtDay(change.displayEnd)}` : `「${t.name}」改為 ${fmtDay(change.start)}`
}

/** 可換機台的工單（Date 資料：直接存回 start、end） */
const lineTasks = ref(makeMachineTasks(machines.slice(0, 4), 21, 'LN').filter((t) => t.start.getTime() < t0 + 4 * DAY))
const lineMessage = ref('把工單拖到別台機台，或拖兩端調整工時')

function onLineChange(change) {
  lineTasks.value = lineTasks.value.map((t) =>
    t.id === change.key ? { ...t, start: change.start, end: change.end, machine: change.row } : t
  )
  const moved = change.row !== change.previous.row ? `，從 ${change.previous.row} 換到 ${change.row}` : ''
  lineMessage.value = `${change.key}：${fmtTime(change.start)}～${fmtTime(change.end)}${moved}`
}

const projectTasks = [
  { id: 'p1', name: '需求確認', start: day(-20), end: day(-14), status: 'done', progress: 100 },
  { id: 'p2', name: '設備採購', start: day(-15), end: day(-3), status: 'done', progress: 100 },
  { id: 'p3', name: '設備進廠', start: day(-2), status: 'done' },
  { id: 'p4', name: '安裝與配線', start: day(-2), end: day(4), status: 'running', progress: 60 },
  { id: 'p5', name: '治具製作', start: day(-6), end: day(2), status: 'delayed', progress: 70 },
  { id: 'p6', name: '試產', start: day(5), end: day(9), status: 'planned' },
  { id: 'p7', name: '良率驗證', start: day(9), end: day(15), status: 'planned' },
  { id: 'p8', name: '量產', start: day(16), status: 'planned', milestone: true },
]

/** 500 台機台、約 1 萬張工單 */
const largeMachines = Array.from({ length: 500 }, (_, i) => `M-${String(i + 1).padStart(3, '0')}`)
const largeTasks = shallowRef(makeMachineTasks(largeMachines, 9).slice(0, 10000))

const largeRef = ref(null)
const findKey = ref('')
const foundKey = ref(null)
const findMessage = ref('')

function findTask() {
  const key = findKey.value.trim()
  if (!key) return
  const ok = largeRef.value?.scrollToTask(key)
  foundKey.value = ok ? key : null
  findMessage.value = ok ? `已捲到 ${key}` : `找不到 ${key}`
}

const basicCode = `<GanttChart
  :data="tasks"          // [{ id, machine, name, start, end, status, progress }]
  :rows="machines"       // 列的順序與顯示文字：[{ value: 'SMT-01', label: 'SMT-01 貼片機' }, …]
  row-field="machine"
  label-header="機台"
  :highlight-key="selectedId"
  @task-click="({ key }) => (selectedId = key)"
/>

// 狀態與顏色可自訂；欄位名稱不同時用欄位映射
<GanttChart
  :data="rows"
  row-field="eqp" label-field="lot" start-field="trackIn" end-field="trackOut"
  :statuses="[
    { value: 'RUN', label: '生產中', color: '#2563eb' },
    { value: 'DOWN', label: '停機', color: '#dc2626' },
  ]"
/>`

const projectCode = `const tasks = [
  { id: 'p4', name: '安裝與配線', start: '2026-10-22', end: '2026-10-28', status: 'running', progress: 60 },
  { id: 'p3', name: '設備進廠', start: '2026-10-22' },                 // 沒有 end → 里程碑
  { id: 'p8', name: '量產', start: '2026-11-09', milestone: true },
]

<GanttChart :data="tasks" :auto-height="true" label-header="工作項目" />`

const editCode = `<GanttChart
  :data="tasks"
  :editable="true"
  :allow-row-change="true"            // 拖到別的列（例如換機台）
  :non-working-days="[0, 6]"          // 週六、週日畫底色
  :holidays="['2026-10-10']"
  @task-change="onChange"
/>

// 元件不改資料：在這裡更新（也可以先檢查，不合理就不更新 → 長條彈回原位）
function onChange({ key, start, end, displayEnd, row }) {
  const t = tasks.value.find((x) => x.id === key)
  t.start = start
  t.end = end              // 資料是日期字串時改存 ymd(displayEnd)（那一天，而不是隔天 00:00）
  t.machine = row
}

// 相依：任務的 dependsOn 寫前置任務的鍵（字串、陣列或 'a,b'），或另外給 :dependencies="[{ from: 'a', to: 'b' }]"
const tasks = ref([
  { id: 'a', name: '設計', start: '2026-10-01', end: '2026-10-03' },
  { id: 'b', name: '製作', start: '2026-10-06', end: '2026-10-09', dependsOn: 'a' },
])`

const propsRows = [
  { name: 'data', type: 'object[]', def: '—', desc: '任務；欄位由下列 *Field 指定。開始時間不合法的任務不畫（開發模式會警告）' },
  { name: 'rows', type: "(string | { value, label? })[] | null", def: 'null', desc: '列的順序與顯示文字；沒給時照資料出現的順序。清單外的列接在後面' },
  { name: 'rowField', type: 'string', def: "'row'", desc: '所在列（機台、工單、負責人…）；空白時任務自成一列，以名稱為列名' },
  { name: 'labelField', type: 'string', def: "'name'", desc: '任務名稱' },
  { name: 'startField / endField', type: 'string', def: "'start' / 'end'", desc: '起訖時間：Date、毫秒數或日期字串。只寫日期的字串一律當本地時間午夜；沒有結束時間 → 里程碑' },
  { name: 'progressField', type: 'string', def: "'progress'", desc: '進度（0～100），畫在長條底部' },
  { name: 'statusField', type: 'string', def: "'status'", desc: '狀態，決定顏色' },
  { name: 'milestoneField', type: 'string', def: "'milestone'", desc: '為真時畫成里程碑' },
  { name: 'dependencyField', type: 'string', def: "'dependsOn'", desc: "前置任務的鍵：一個鍵、陣列或 'a,b'。畫成完成才開始的箭頭；後續任務開始得比前置任務結束早時箭頭變紅" },
  { name: 'dependencies', type: 'GanttDependency[] | null', def: 'null', desc: '另外給的相依關係 { from, to }（與 dependencyField 合併）；找不到的鍵略過' },
  { name: 'showDependencies', type: 'boolean', def: 'true', desc: '畫出相依箭頭' },
  { name: 'nonWorkingDays / holidays', type: 'number[] / (Date | number | string)[]', def: '[] / []', desc: '非工作的星期（0 = 星期日）與假日，畫上底色；一天不到 2px 寬時不畫' },
  { name: 'editable', type: 'boolean', def: 'false', desc: '拖曳移動、拖兩端調整長短（Esc 取消），Tab 選到後用方向鍵微調。元件不改資料：用 task-change 送出' },
  { name: 'allowRowChange', type: 'boolean', def: 'false', desc: '拖曳或上下鍵可以換到別的列' },
  { name: 'snap', type: "'auto' | 'minute' | 'hour' | 'day' | number | null", def: "'auto'", desc: "吸附：auto 依縮放程度（看日以天、放大到小時以 15 分…）；數字為毫秒；null 不吸附。移動保留原本的時刻，拉邊對齊整點／整天" },
  { name: 'keyField / keyFn', type: 'string / (datum, index) => string', def: "'id' / null", desc: '任務鍵（highlightKey、事件的 key、scrollToTask）；沒有該欄位時用索引' },
  { name: 'statuses', type: '{ value, label?, color }[]', def: 'planned / running / done / delayed', desc: '狀態與顏色（預設：計畫、進行中、完成、延遲）。長條上的文字依底色自動選白或深色' },
  { name: 'otherColor', type: 'string', def: "'#6b7280'", desc: '不在 statuses 清單裡的狀態用的顏色（圖例歸為「其他」）' },
  { name: 'hiddenStatuses', type: 'string[]', def: '[]', desc: '隱藏的狀態，可用 v-model:hidden-statuses；點圖例也會切換' },
  { name: 'timeDomain', type: '[start, end] | null', def: 'null', desc: '預設顯示的時間範圍；未指定時依任務並外推 domainPadding。這是預設視窗：任務超出時往外縮或平移仍看得到' },
  { name: 'domainPadding', type: 'number', def: '0.02', desc: '自動範圍兩端外推的比例' },
  { name: 'inclusiveEndDate', type: 'boolean', def: 'true', desc: "結束時間只寫日期（'2026-10-24'）時算到那一天結束；有時間的值不受影響" },
  { name: 'timeFormat', type: '(date) => string', def: 'null', desc: '下層刻度格式；未指定時依縮放程度自動選（時:分、日、月）' },
  { name: 'rowHeight / barHeight', type: 'number', def: '36 / 22', desc: '每列高度、長條高度（px）' },
  { name: 'labelWidth / labelHeader', type: 'number / string', def: "160 / ''", desc: '左側列名欄寬與標題' },
  { name: 'barRadius', type: 'number', def: '3', desc: '長條圓角' },
  { name: 'showBarLabels', type: 'boolean', def: 'true', desc: '在長條上顯示名稱；放不下時放右邊，右邊也放不下（會壓到下一個任務）就不顯示' },
  { name: 'showProgress', type: 'boolean', def: 'true', desc: '在長條底部畫出進度；0% 與 100% 不畫（狀態已經說明了）' },
  { name: 'showToday / today', type: 'boolean / Date | number | string | null', def: 'true / null', desc: '標出今天；today 未指定時用現在時間（每分鐘更新）' },
  { name: 'showLegend / showCounts / showGrid', type: 'boolean', def: 'true / false / true', desc: '圖例、圖例筆數、格線' },
  { name: 'enableZoom', type: 'boolean', def: 'true', desc: '縮放時間軸、拖曳與左右滑動平移、雙擊重設' },
  { name: 'wheelZoomModifier', type: "'none' | 'ctrl' | 'alt'", def: "'ctrl'", desc: "按住哪個鍵才用滾輪縮放；預設 'ctrl'（也接受 ⌘ 與觸控板捏合），一般滾輪留給列的捲動" },
  { name: 'maxZoomScale', type: 'number', def: '500', desc: '最大放大倍率' },
  { name: 'showResetButton', type: 'boolean', def: 'true', desc: '縮放或平移後顯示「重設縮放」' },
  { name: 'highlightKey', type: 'string | number | null', def: 'null', desc: '框出這個鍵的任務（例如表格選取的那一列）' },
  { name: 'enableTooltip', type: 'boolean', def: 'true', desc: '滑過任務時顯示提示框' },
  { name: 'emptyText', type: 'string', def: "'沒有任務'", desc: '沒有任務時的提示' },
  { name: 'customRenderers', type: '{ barColor?, barLabel?, tooltip? }', def: '{}', desc: 'barColor(datum, task) 自訂顏色；barLabel(datum, task) 自訂長條文字；tooltip(datum, task) 回傳每行文字' },
  { name: 'width / height / autoResize / autoHeight', type: 'number / boolean', def: '960 / 420 / false / false', desc: 'autoResize 時容器需有高度；autoHeight 時高度依列數撐開、不捲動' },
  { name: 'margin / title', type: '{ top, right, bottom, left } / string', def: '{ 8, 16, 8, 8 } / ""', desc: '四周留白與標題' },
  { name: 'debounceDelay', type: 'number', def: '150', desc: 'autoResize 的重畫延遲（ms）' },
]

const eventRows = [
  { name: 'task-hover / task-click', type: 'GanttTaskEvent', desc: '滑過／點擊任務：{ datum, key, row, start, end, status, milestone, progress }（拖曳放開時不算點擊）' },
  { name: 'task-change', type: 'GanttTaskChange', desc: "editable 時拖曳或按鍵改了任務：{ datum, key, type: 'move' | 'resize-start' | 'resize-end', start, end, displayEnd, row, previous }。資料是日期字串時存回 displayEnd" },
  { name: 'row-click', type: '{ row, label, tasks }', desc: '點列名；tasks 是這一列的原始資料' },
  { name: 'tooltip-show / tooltip-hide', type: 'GanttTooltip / —', desc: '提示框顯示與隱藏' },
  { name: 'zoom-change / zoom-reset', type: '{ timeDomain, scale } / —', desc: '縮放或平移後、回到預設範圍時' },
  { name: 'legend-toggle', type: '{ status, hidden }', desc: '點圖例切換狀態' },
  { name: 'update:hiddenStatuses', type: 'string[]', desc: 'v-model:hidden-statuses' },
  { name: 'chart-ready / chart-resize', type: '{ width, height }', desc: '掛載完成、autoResize 尺寸改變' },
]

const slotRows = [
  { name: 'row-label', type: '{ row, index, tasks }', desc: '自訂列名（例如加上機台狀態燈號）' },
  { name: 'tooltip', type: '{ tooltipData, tooltipVisible }', desc: '完全自訂提示框；tooltipData 是 GanttTooltip' },
]

const methodRows = [
  { name: 'ref: resetZoom()', type: '—', desc: '回到預設時間範圍' },
  { name: 'ref: scrollToRow(row)', type: 'boolean', desc: '捲到某一列；找不到時回傳 false' },
  { name: 'ref: scrollToTask(key)', type: 'boolean', desc: '捲到任務所在的列，任務不在目前的時間範圍內時移到中間；找不到時回傳 false' },
]
</script>
