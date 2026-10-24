<template>
  <div class="min-h-screen bg-surface-secondary p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">StateTimeline 機台狀態時間軸</h1>
        <p class="text-lg text-content-secondary">
          每台機台一列，畫出實際發生過的狀態（運轉、待機、故障、保養），右側統計稼動率與停機。
          甘特圖是「排程」，這裡是「紀錄」—— 資料量大很多，紀錄也常常只有開始時間。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入；型別
          <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">StateTimelineEvent</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">StateSummary</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">StateDef</code> 也從同一個入口取得。
        </p>
      </div>

      <section id="basic" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">產線一天的狀態</h2>
        <p class="text-sm text-content-secondary mb-4">
          資料只有 <code>start</code>（狀態開始的時間）：下一筆開始就是這一筆結束，每台最後一筆畫到 <code>open-end-time</code>。
          Ctrl + 滾輪以游標為中心縮放、縮放後拖曳平移，雙指左右滑也能平移；右側統計跟著目前看到的範圍。
          滑過色帶看每一段的時間；聚焦圖表後用上下鍵切換機台、左右鍵逐段查看。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <StateTimeline
            :data="dayData"
            :end-field="null"
            :rows="dayRows"
            :open-end-time="dayEnd"
            :time-domain="[dayStart, dayEnd]"
            title="SMT 產線 — 10/23"
            :auto-resize="true"
            @segment-click="(e) => (clicked = e)"
          />
          <p class="mt-2 text-xs text-content-secondary" aria-live="polite">
            segment-click：{{ clicked ? `${clicked.rowLabel} ${clicked.stateLabel}，${fmtTime(clicked.start)} 起 ${Math.round(clicked.duration / 60000)} 分鐘` : '（點一段色帶）' }}
          </p>
        </div>
        <ChptCodeBlock class="mt-4" :code="basicCode" />
      </section>

      <section id="summary" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">找出停最久的機台</h2>
        <p class="text-sm text-content-secondary mb-4">
          <code>sort-rows="downTime"</code> 把停機時間最多的排最上面（<code>"utilization"</code> 依稼動率由低到高）。
          稼動率 = 運轉時間 ÷（有紀錄的時間 − <code>exclude-states</code>），預設不計入計畫保養；門檻見 <code>utilization-thresholds</code>，
          低於門檻有 ✕ 與「偏低」文字，不只靠顏色。
          一個像素裡只要有故障就畫成紅色（<code>priority</code> 高的狀態優先），全覽時 30 秒的停機也看得到。
        </p>
        <div class="flex flex-wrap items-center gap-3 mb-3 text-sm text-content-secondary">
          <label class="flex items-center gap-2">排序
            <select v-model="sortRows" class="rounded border border-stroke-default bg-surface-primary px-2 py-1 text-content-primary">
              <option value="none">原順序</option>
              <option value="downTime">停機時間多到少</option>
              <option value="utilization">稼動率低到高</option>
            </select>
          </label>
        </div>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <StateTimeline
            :data="dayData"
            :end-field="null"
            :rows="dayRows"
            :open-end-time="dayEnd"
            :time-domain="[dayStart, dayEnd]"
            :sort-rows="sortRows"
            :show-legend="false"
            :auto-resize="true"
            @summary-change="(s) => (summary = s)"
          />
        </div>
        <ul v-if="worst" class="mt-3 text-sm text-content-secondary">
          <li>summary-change：停機最久的是 <strong class="text-content-primary">{{ worst.row }}</strong>，共 {{ Math.round(worst.downTime / 60000) }} 分鐘、{{ worst.downCount }} 次；
            最長一次 {{ fmtTime(worst.longestDown.start) }}～{{ fmtTime(worst.longestDown.end) }}，MTTR {{ Math.round(worst.mttr / 60000) }} 分鐘</li>
        </ul>
        <ChptCodeBlock class="mt-4" :code="summaryCode" />
      </section>

      <section id="large" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">大量資料：30 台 × 7 天</h2>
        <p class="text-sm text-content-secondary mb-4">
          {{ largeData.length.toLocaleString() }} 筆狀態紀錄。每列依像素合併後最多畫「寬度」個矩形，縮放時重新合併，資料再多也不卡。
          統計用 <code>summary-scope="all"</code>：不論放大到哪裡，都是整週的稼動率。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <StateTimeline
            :data="largeData"
            row-field="eq"
            state-field="status"
            start-field="from"
            end-field="to"
            :states="largeStates"
            :run-states="['RUN']"
            :down-states="['ALARM', 'WAIT']"
            :exclude-states="['PM']"
            summary-scope="all"
            :row-height="20"
            title="AOI 檢測機 — 一週"
            :auto-resize="true"
          />
        </div>
        <ChptCodeBlock class="mt-4" :code="largeCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-4">API</h2>
        <ApiTable of="StateTimeline" title="Props" :rows="propsRows" />
        <ApiTable of="StateTimeline" title="Events" :rows="eventRows" />
        <ApiTable of="StateTimeline" title="Slots 與方法" :rows="slotRows" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ChptCodeBlock, StateTimeline } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

/** 固定種子的亂數：每次打開文件看到的資料都一樣 */
function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const MIN = 60_000
const dayStart = new Date(2026, 9, 23, 0, 0).getTime()
const dayEnd = dayStart + 24 * 60 * MIN

const dayRows = ['SMT-01', 'SMT-02', 'SMT-03', 'SMT-04', 'SMT-05', 'SMT-06', 'SMT-07', 'SMT-08'].map((v, i) => ({
  value: v,
  label: `${v} ${['印刷機', '貼片機 A', '貼片機 B', '貼片機 C', '回焊爐', 'AOI', 'X-Ray', '分板機'][i]}`,
}))

/** 一天的紀錄：大多在運轉，偶爾待機、故障；SMT-03 下午有一次長停機、SMT-05 早上保養 */
const dayData = (() => {
  const rand = seeded(7)
  const out = []
  dayRows.forEach(({ value }, m) => {
    let t = dayStart
    while (t < dayEnd) {
      out.push({ machine: value, state: 'run', start: t })
      t += (40 + rand() * 120) * MIN
      if (t >= dayEnd) break
      const r = rand()
      const state = r < 0.55 ? 'idle' : 'down'
      out.push({ machine: value, state, start: t })
      t += (state === 'down' ? 5 + rand() * 30 : 5 + rand() * 20) * MIN
    }
    // 短暫停機（30 秒）：全覽時也要看得到
    out.push({ machine: value, state: 'down', start: dayStart + (3 + m) * 60 * MIN })
    out.push({ machine: value, state: 'run', start: dayStart + (3 + m) * 60 * MIN + 30_000 })
  })
  // 特殊事件
  out.push({ machine: 'SMT-03', state: 'down', start: dayStart + 14 * 60 * MIN })
  out.push({ machine: 'SMT-03', state: 'run', start: dayStart + 16.5 * 60 * MIN })
  out.push({ machine: 'SMT-05', state: 'maintenance', start: dayStart + 6 * 60 * MIN })
  out.push({ machine: 'SMT-05', state: 'run', start: dayStart + 8 * 60 * MIN })
  return clearInside(out)
})()

/** 特殊事件期間內的其他紀錄拿掉（示範資料用） */
function clearInside(rows) {
  const windows = [
    ['SMT-03', dayStart + 14 * 60 * MIN, dayStart + 16.5 * 60 * MIN],
    ['SMT-05', dayStart + 6 * 60 * MIN, dayStart + 8 * 60 * MIN],
  ]
  return rows.filter((r) => !windows.some(([m, a, b]) => r.machine === m && r.start > a && r.start < b))
}

const clicked = ref(null)
const sortRows = ref('downTime')
const summary = ref([])
const worst = computed(() => [...summary.value].filter((s) => s.longestDown).sort((a, b) => b.downTime - a.downTime)[0] ?? null)

const fmtTime = (t) => {
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const largeStates = [
  { value: 'RUN', label: '運轉', color: 'rgb(var(--t-success-solid))', priority: 0 },
  { value: 'IDLE', label: '待機', color: 'rgb(var(--t-warning-solid))', priority: 1 },
  { value: 'WAIT', label: '等料', color: 'rgb(var(--t-chart-5))', priority: 2 },
  { value: 'PM', label: '保養', color: 'rgb(var(--t-info-solid))', priority: 2 },
  { value: 'ALARM', label: '警報', color: 'rgb(var(--t-danger-solid))', priority: 3 },
]

/** 30 台 × 7 天，大約每 1～50 分鐘一筆（有結束時間） */
const largeData = (() => {
  const rand = seeded(42)
  const out = []
  const start = new Date(2026, 9, 17).getTime()
  const end = start + 7 * 24 * 60 * MIN
  for (let m = 1; m <= 30; m++) {
    const eq = `AOI-${String(m).padStart(2, '0')}`
    // 每台的狀況不同：少數幾台警報特別多
    const alarm = m % 7 === 3 ? 0.16 : m % 5 === 1 ? 0.1 : 0.05
    let t = start
    while (t < end) {
      const r = rand()
      const status = r < 0.72 - alarm ? 'RUN' : r < 0.86 - alarm ? 'IDLE' : r < 0.93 - alarm ? 'WAIT' : r < 0.995 ? 'ALARM' : 'PM'
      const len = (status === 'PM' ? 120 + rand() * 120 : status === 'RUN' ? 10 + rand() * 40 : 1 + rand() * 10) * MIN
      const to = Math.min(end, t + len)
      out.push({ eq, status, from: t, to })
      t = to
    }
  }
  return out
})()

const basicCode = `<StateTimeline
  :data="records"
  :end-field="null"
  :rows="[{ value: 'SMT-01', label: 'SMT-01 印刷機' }, …]"
  :time-domain="[dayStart, dayEnd]"
  :open-end-time="dayEnd"
  @segment-click="onSegmentClick"
/>

// records：只有開始時間，下一筆開始就是這一筆結束
// [{ machine: 'SMT-01', state: 'run', start: '2026-10-23 08:00' }, …]
// 預設狀態：run 運轉、idle 待機、maintenance 保養、down 故障（可用 states 自訂）`

const summaryCode = `<StateTimeline
  :data="records"
  sort-rows="downTime"
  :run-states="['run']"
  :down-states="['down']"
  :exclude-states="['maintenance']"
  :utilization-thresholds="[0.6, 0.85]"
  @summary-change="(list) => …"
/>

// StateSummary：{ row, durations, covered, planned, utilization, downTime, downCount,
//                 longestDown: { start, end, state }, mttr, mtbf }`

const largeCode = `<StateTimeline
  :data="records"            // 7 天 × 30 台，約 1.5 萬筆
  row-field="eq" state-field="status" start-field="from" end-field="to"
  :states="[
    { value: 'RUN', label: '運轉', color: '…', priority: 0 },
    { value: 'ALARM', label: '警報', color: '…', priority: 3 },   // 一個像素裡有警報就畫警報
    …
  ]"
  :down-states="['ALARM', 'WAIT']"
  summary-scope="all"
/>`

const propsRows = [
  { name: 'data', type: 'object[]', def: '—', desc: '狀態紀錄，每筆一段狀態' },
  { name: 'rowField / stateField / startField', type: 'string', def: "'machine' / 'state' / 'start'", desc: '機台、狀態、開始時間的欄位。時間可以是 Date、毫秒或字串（只有日期的字串當本地午夜）' },
  { name: 'endField', type: 'string | null', def: "'end'", desc: '結束時間欄位；null 或某筆空白時用同一台下一筆的開始時間。紀錄重疊時以後開始的為準' },
  { name: 'rows', type: '(string | { value, label })[]', def: '[]', desc: '列的順序與顯示文字；沒列到的機台依出現順序接在後面' },
  { name: 'states', type: 'StateDef[]', def: '運轉／待機／保養／故障', desc: '{ value, label?, color, priority? }。同一個像素裡有好幾種狀態時 priority 大的優先畫' },
  { name: 'unknownStateColor', type: 'string', def: '灰色', desc: '不在 states 裡的狀態用的顏色（圖例會列出來）' },
  { name: 'timeDomain', type: '[time, time] | null', def: 'null', desc: '顯示的時間範圍；未指定時用資料的範圍' },
  { name: 'openEndTime', type: 'time | null', def: 'null', desc: '每台最後一筆沒有結束時間時畫到哪裡；未指定時用 timeDomain 的結束，再沒有就用現在' },
  { name: 'showNow / now', type: 'boolean / time | null', def: 'false / null', desc: '畫出「現在」的線；now 未指定時用目前時間（每分鐘更新）' },
  { name: 'timeFormat', type: '(d: Date) => string', def: 'null', desc: '下層刻度格式；未指定時依縮放程度自動決定' },
  { name: 'showSummary / summaryWidth', type: 'boolean / number', def: 'true / 240', desc: '右側統計欄（稼動率、停機時間與次數）' },
  { name: 'summaryScope', type: "'view' | 'all'", def: "'view'", desc: '統計目前看到的範圍，或全部資料' },
  { name: 'runStates / downStates / excludeStates', type: 'string[]', def: "['run'] / ['down'] / ['maintenance']", desc: '算運轉、算停機、不計入稼動率分母的狀態' },
  { name: 'utilizationThresholds', type: '[number, number]', def: '[0.6, 0.85]', desc: '稼動率門檻：≥ 第二個「達標」、≥ 第一個「尚可」、其餘「偏低」' },
  { name: 'sortRows', type: "'none' | 'utilization' | 'downTime'", def: "'none'", desc: '原順序、稼動率由低到高、停機時間由多到少' },
  { name: 'rowHeight / labelWidth', type: 'number / number | null', def: '28 / null', desc: '列高（圖高 = 列高 × 機台數）；左側名稱欄寬（未指定時依名稱，最多 25%）' },
  { name: 'title / showLegend / emptyText', type: 'string / boolean / string', def: "'' / true / '沒有資料'", desc: '標題、圖例、沒有資料時的提示' },
  { name: 'enableTooltip', type: 'boolean', def: 'true', desc: '滑過或用鍵盤選到段落時顯示提示框' },
  { name: 'enableZoom / wheelZoomModifier', type: "boolean / 'none' | 'ctrl' | 'alt'", def: "true / 'ctrl'", desc: '滾輪縮放（按住修飾鍵）；縮放後可拖曳或左右滑平移' },
  { name: 'minVisibleSpan', type: 'number', def: '600000', desc: '最多放大到畫面只剩這麼長的時間（毫秒）' },
  { name: 'customRenderers', type: '{ tooltip? }', def: '{}', desc: 'tooltip(event) 回傳每行文字，加在時間範圍之下' },
  { name: 'width / height / autoResize', type: 'number / boolean', def: '800 / 320 / false', desc: 'autoResize 時寬度跟著容器；高度由列數決定' },
  { name: 'margin / debounceDelay', type: '{ top, right, bottom, left } / number', def: '{ 4, 12, 8, 8 } / 150', desc: '四周留白；autoResize 的重畫延遲（ms）' },
]

const eventRows = [
  { name: 'segment-hover / segment-click', type: 'StateTimelineEvent', desc: '{ datum, row, rowLabel, state, stateLabel, start, end, duration, openEnded }；鍵盤 Enter 也算點擊' },
  { name: 'summary-change', type: 'StateSummary[]', desc: '統計改變時（掛載、換資料、縮放且 summaryScope 為 view）' },
  { name: 'zoom-change / zoom-reset', type: '{ timeDomain: [Date, Date] } / —', desc: '縮放或平移、回到全覽' },
  { name: 'tooltip-show / tooltip-hide', type: 'StateTimelineTooltip / —', desc: '提示框顯示與隱藏' },
  { name: 'chart-ready / chart-resize', type: '{ width, height }', desc: '掛載完成、autoResize 尺寸改變' },
]

const slotRows = [
  { name: '#tooltip', type: '{ tooltipData, tooltipVisible }', desc: '完全自訂提示框' },
  { name: 'ref: getSummary()', type: 'StateSummary[]', desc: '目前統計範圍內每台的統計' },
  { name: 'ref: zoomTo(start, end) / resetZoom()', type: '—', desc: '縮放到某個時間範圍、回到全覽' },
]
</script>
