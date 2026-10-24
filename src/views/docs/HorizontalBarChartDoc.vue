<template>
  <div class="min-h-screen bg-surface-secondary p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">HorizontalBarChart 水平長條圖</h1>
        <p class="text-lg text-content-secondary">
          排行榜：不良原因 Top 10、機台產量排名、客戶出貨量。類別名稱橫向排開，再長也讀得完整；預設由大到小排序，數值標在長條末端。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入；型別
          <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">HorizontalBarEvent</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">HorizontalBarTooltip</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">HorizontalBarReferenceLine</code> 也從同一個入口取得。
        </p>
      </div>

      <section id="basic" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">排行榜</h2>
        <p class="text-sm text-content-secondary mb-4">
          <code>top-n</code> 只取前幾名，<code>show-others</code> 把其餘併成「其他」；<code>show-percent</code> 在數值後加上佔比。
          <code>auto-height</code> 讓高度依列數撐開。滑過或用 <kbd>Tab</kbd> 選到某一列會顯示名次與佔比。
        </p>
        <div class="grid lg:grid-cols-2 gap-6 items-start">
          <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
            <HorizontalBarChart
              :data="defects"
              label-field="reason"
              value-field="count"
              title="本週不良原因 Top 6"
              :top-n="6"
              :show-others="true"
              :show-percent="true"
              :show-rank="true"
              :auto-resize="true"
              :auto-height="true"
              @bar-click="({ label }) => (clicked = label)"
            />
            <p class="mt-2 text-xs text-content-tertiary" aria-live="polite">{{ clicked ? `點了：${clicked}` : '點任一列' }}</p>
          </div>
          <ChptCodeBlock :code="basicCode" />
        </div>
      </section>

      <section id="emphasis" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">強調、目標線與負值</h2>
        <p class="text-sm text-content-secondary mb-4">
          <code>highlight-key</code> 強調一列、其餘轉灰（重點是「這一台」時，比一堆顏色清楚）；<code>reference-lines</code> 畫出目標。
          負值從基線往左長；<code>show-axis</code> 改用數值軸。
        </p>
        <div class="grid lg:grid-cols-2 gap-6 items-start">
          <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
            <div class="mb-2 flex items-center gap-2 text-sm">
              <label for="hbc-highlight" class="text-content-secondary">強調機台</label>
              <select id="hbc-highlight" v-model="highlight" class="h-control-sm rounded-md border border-stroke-default bg-surface-primary px-2 text-content-primary">
                <option value="">（無）</option>
                <option v-for="m in output" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
            </div>
            <HorizontalBarChart
              :data="output"
              label-field="name"
              value-field="qty"
              title="今日產量（pcs）"
              :highlight-key="highlight || null"
              :reference-lines="[{ value: 1200, label: '目標 1,200' }]"
              :auto-resize="true"
              :auto-height="true"
            />
          </div>
          <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
            <HorizontalBarChart
              :data="variance"
              label-field="line"
              value-field="diff"
              title="與上週良率差（百分點）"
              sort="none"
              :show-axis="true"
              :value-format="(v) => (v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1))"
              :auto-resize="true"
              :auto-height="true"
            />
          </div>
        </div>
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="HorizontalBarChart" title="Props" :rows="propsRows" />
        <ApiTable of="HorizontalBarChart" title="Events" :rows="eventRows" />
        <ApiTable of="HorizontalBarChart" title="Slots" :rows="slotRows" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptCodeBlock, HorizontalBarChart } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

const defects = [
  { reason: '錫橋（短路）', count: 132 },
  { reason: '空焊', count: 98 },
  { reason: '零件偏移', count: 76 },
  { reason: '立碑（墓碑效應）', count: 41 },
  { reason: '錫珠', count: 35 },
  { reason: '極性反向', count: 22 },
  { reason: '缺件', count: 18 },
  { reason: '錫量不足', count: 12 },
  { reason: '異物', count: 7 },
]
const clicked = ref('')

const output = [
  { id: 'SMT-01', name: 'SMT-01 貼片機', qty: 1380 },
  { id: 'SMT-02', name: 'SMT-02 貼片機', qty: 1124 },
  { id: 'SMT-03', name: 'SMT-03 貼片機', qty: 1251 },
  { id: 'SMT-04', name: 'SMT-04 貼片機', qty: 986 },
  { id: 'SMT-05', name: 'SMT-05 貼片機', qty: 1302 },
]
const highlight = ref('SMT-04')

const variance = [
  { line: 'A 線', diff: 1.8 },
  { line: 'B 線', diff: 0.6 },
  { line: 'C 線', diff: -0.4 },
  { line: 'D 線', diff: -2.3 },
  { line: 'E 線', diff: 0.2 },
]

const basicCode = `<HorizontalBarChart
  :data="defects"            // [{ reason: '錫橋', count: 132 }, …]
  label-field="reason"
  value-field="count"
  :top-n="6"
  :show-others="true"        // 第 7 名以後併成「其他」
  :show-percent="true"
  :auto-height="true"
  @bar-click="({ label, datum }) => …"
/>`

const propsRows = [
  { name: 'data', type: 'object[]', def: '—', desc: '資料列；數值不是數字的列略過' },
  { name: 'labelField / valueField', type: 'string', def: "'label' / 'value'", desc: '名稱與數值欄位' },
  { name: 'keyField / keyFn', type: 'string / (datum, index) => string', def: "'id' / null", desc: '資料鍵（highlightKey、事件的 key）；沒有時用名稱' },
  { name: 'sort', type: "'desc' | 'asc' | 'none'", def: "'desc'", desc: '排序；none 照資料順序' },
  { name: 'topN / showOthers / othersLabel', type: 'number | null / boolean / string', def: "null / false / '其他'", desc: '只顯示前 N 名；showOthers 把其餘加總成一列（放最後）' },
  { name: 'valueDomain', type: '[min, max] | null', def: 'null', desc: '數值範圍；未指定時 [min(0, 最小值), max(0, 最大值)]' },
  { name: 'valueFormat', type: '(v) => string', def: "d3.format(',~f')", desc: '長條末端與提示框的數值格式' },
  { name: 'showValues / showPercent / showRank', type: 'boolean', def: 'true / false / false', desc: '末端數值、數值後加佔比、名稱前加名次' },
  { name: 'showAxis / showGrid', type: 'boolean', def: 'false / true', desc: '底部數值軸（1,000 以上用 1k 簡寫）與格線' },
  { name: 'labelWidth', type: 'number | null', def: 'null', desc: '名稱欄寬；未指定時依最長的名稱（最多圖寬的 40%），太長的截斷並加「…」，完整名稱在提示框' },
  { name: 'barThickness / rowHeight', type: 'number', def: '20 / 32', desc: '長條粗細（最多 24px）、autoHeight 時每列高度' },
  { name: 'color', type: 'string | null', def: 'null', desc: '長條顏色；未指定時用類別色第 1 號；「其他」固定灰色' },
  { name: 'highlightKey', type: 'string | number | null', def: 'null', desc: '強調這一列，其餘轉灰' },
  { name: 'referenceLines', type: 'HorizontalBarReferenceLine[]', def: '[]', desc: '參考線 { value, label?, color? }，例如目標值' },
  { name: 'title / emptyText', type: 'string', def: "'' / '沒有資料'", desc: '標題、沒有資料時的提示' },
  { name: 'enableTooltip', type: 'boolean', def: 'true', desc: '滑過或 Tab 選到列時顯示提示框（數值、名次、佔比）' },
  { name: 'customRenderers', type: '{ barColor?, valueLabel?, tooltip? }', def: '{}', desc: 'barColor(datum, item) 自訂顏色；valueLabel(datum, item) 自訂末端文字；tooltip(datum, item) 回傳每行文字' },
  { name: 'width / height / autoResize / autoHeight', type: 'number / boolean', def: '560 / 320 / false / false', desc: 'autoResize 時跟著容器寬度；autoHeight 時高度依列數撐開' },
  { name: 'margin / debounceDelay', type: '{ top, right, bottom, left } / number', def: '{ 8, 16, 8, 8 } / 150', desc: '四周留白、autoResize 的重畫延遲（ms）' },
]

const eventRows = [
  { name: 'bar-hover / bar-click', type: 'HorizontalBarEvent', desc: '{ datum, key, label, value, rank, share, isOthers, members }；「其他」的 datum 為 null、members 是併進去的資料' },
  { name: 'tooltip-show / tooltip-hide', type: 'HorizontalBarTooltip / —', desc: '提示框顯示與隱藏' },
  { name: 'chart-ready / chart-resize', type: '{ width, height }', desc: '掛載完成、autoResize 尺寸改變' },
]

const slotRows = [{ name: 'tooltip', type: '{ tooltipData, tooltipVisible }', desc: '完全自訂提示框' }]
</script>
