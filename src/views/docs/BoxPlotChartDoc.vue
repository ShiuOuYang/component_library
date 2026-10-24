<template>
  <div class="min-h-screen bg-surface-secondary p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">BoxPlotChart 箱型圖</h1>
        <p class="text-lg text-content-secondary">
          比較不同機台、班別、批次的分布：中位數、離散程度、離群值一張圖看完；也可以畫成小提琴圖看出雙峰或偏態。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入；型別
          <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">BoxPlotGroupEvent</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">BoxStats</code> 也從同一個入口取得。
        </p>
      </div>

      <section id="basic" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">四台貼片機的錫膏厚度</h2>
        <p class="text-sm text-content-secondary mb-4">
          箱子是 Q1～Q3（中間一半的資料），粗線是中位數，菱形是平均；鬚畫到 1.5 倍四分位距內最遠的點，外面的空心圓是離群值。
          紅色虛線是規格上下限（<code>reference-lines</code>）。滑過一組看完整統計、滑過離群值看是哪一筆；聚焦圖表後用左右鍵逐組查看。
          這裡 <code>highlight-key</code> 強調 B 機：它的中位數沒什麼不同，但箱子明顯比較寬 —— 變異比較大。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 380px">
            <BoxPlotChart
              :data="pasteData"
              group-field="machine"
              value-field="thickness"
              name-field="panel"
              :groups="machineGroups"
              :reference-lines="specLines"
              highlight-key="B"
              y-label="錫膏厚度（µm）"
              title="錫膏厚度 — 依貼片機"
              :auto-resize="true"
              @group-click="(e) => (clicked = e)"
            />
          </div>
          <p class="mt-2 text-xs text-content-secondary" aria-live="polite">
            group-click：{{ clicked ? `${clicked.label}：中位數 ${clicked.stats.median.toFixed(1)}、四分位距 ${clicked.stats.iqr.toFixed(1)}、標準差 ${clicked.stats.sd.toFixed(2)}` : '（點一組）' }}
          </p>
        </div>
        <ChptCodeBlock class="mt-4" :code="basicCode" />
      </section>

      <section id="violin" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">小提琴圖：看出雙峰</h2>
        <p class="text-sm text-content-secondary mb-4">
          夜班的資料混了兩種狀況（換線前後），箱型圖看起來只是比較寬，小提琴圖才看得出是兩個峰。
          <code>show-points="all"</code> 把每一筆都畫出來（左右散開，位置固定）。
        </p>
        <div class="flex flex-wrap items-center gap-3 mb-3 text-sm text-content-secondary">
          <label class="flex items-center gap-2">樣式
            <select v-model="mode" class="rounded border border-stroke-default bg-surface-primary px-2 py-1 text-content-primary">
              <option value="violin">小提琴</option>
              <option value="box">箱型</option>
            </select>
          </label>
          <label class="flex items-center gap-2">資料點
            <select v-model="showPoints" class="rounded border border-stroke-default bg-surface-primary px-2 py-1 text-content-primary">
              <option value="all">全部</option>
              <option value="outliers">只有離群值</option>
              <option value="none">不畫</option>
            </select>
          </label>
        </div>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 360px">
            <BoxPlotChart
              :data="shiftData"
              group-field="shift"
              :mode="mode"
              :show-points="showPoints"
              y-label="抗拉強度（N）"
              title="焊點抗拉強度 — 依班別"
              :auto-resize="true"
            />
          </div>
        </div>
        <ChptCodeBlock class="mt-4" :code="violinCode" />
      </section>

      <section id="minitab" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">四分位數算法</h2>
        <p class="text-sm text-content-secondary mb-4">
          四分位數有好幾種算法，資料少的時候差很多。預設 <code>inclusive</code> 與 Excel QUARTILE.INC、R 相同；
          要跟 Minitab 對數字時用 <code>quartile-method="exclusive"</code>（與 Excel QUARTILE.EXC 相同）。
        </p>
        <ApiTable of="-" title="同一組資料（1, 2, 3, 4, 5, 6, 7, 8）" :rows="quartileRows" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-4">API</h2>
        <ApiTable of="BoxPlotChart" title="Props" :rows="propsRows" />
        <ApiTable of="BoxPlotChart" title="Events" :rows="eventRows" />
        <ApiTable of="BoxPlotChart" title="Slots 與方法" :rows="slotRows" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { BoxPlotChart, ChptCodeBlock } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

/** 固定種子的常態亂數（Box–Muller）：每次打開文件看到的資料都一樣 */
function normal(seed) {
  let s = seed
  const u = () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return (s + 1) / 4294967297
  }
  return (mean, sd) => mean + sd * Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u())
}

const machineGroups = [
  { value: 'A', label: 'A 機' },
  { value: 'B', label: 'B 機' },
  { value: 'C', label: 'C 機' },
  { value: 'D', label: 'D 機' },
]

const pasteData = (() => {
  const rand = normal(11)
  const spec = { A: [120, 3], B: [120.5, 6.5], C: [118.5, 3.2], D: [121, 2.6] }
  const out = []
  for (const [machine, [mean, sd]] of Object.entries(spec)) {
    for (let i = 0; i < 60; i++) out.push({ machine, thickness: +rand(mean, sd).toFixed(1), panel: `${machine}-${String(i + 1).padStart(3, '0')}` })
  }
  // 幾個離群值
  out.push({ machine: 'A', thickness: 134.2, panel: 'A-061' }, { machine: 'C', thickness: 104.8, panel: 'C-061' }, { machine: 'D', thickness: 131.5, panel: 'D-061' })
  return out
})()

const specLines = [
  { value: 108, label: 'LSL 108' },
  { value: 132, label: 'USL 132' },
]

const shiftData = (() => {
  const rand = normal(5)
  const out = []
  for (let i = 0; i < 80; i++) out.push({ shift: '早班', value: +rand(52, 2.2).toFixed(2) })
  for (let i = 0; i < 80; i++) out.push({ shift: '中班', value: +rand(51, 2.6).toFixed(2) })
  // 夜班：換線前後兩個分布
  for (let i = 0; i < 45; i++) out.push({ shift: '夜班', value: +rand(47.5, 1.4).toFixed(2) })
  for (let i = 0; i < 45; i++) out.push({ shift: '夜班', value: +rand(54, 1.4).toFixed(2) })
  return out
})()

const clicked = ref(null)
const mode = ref('violin')
const showPoints = ref('all')

const basicCode = `<BoxPlotChart
  :data="rows"                 // [{ machine: 'A', thickness: 120.3, panel: 'A-001' }, …]
  group-field="machine"
  value-field="thickness"
  name-field="panel"           // 離群值的提示框顯示是哪一片
  :groups="[{ value: 'A', label: 'A 機' }, …]"
  :reference-lines="[{ value: 108, label: 'LSL 108' }, { value: 132, label: 'USL 132' }]"
  highlight-key="B"
  y-label="錫膏厚度（µm）"
/>`

const violinCode = `<BoxPlotChart
  :data="rows"
  group-field="shift"
  mode="violin"                // 密度形狀；中間是窄的箱子
  show-points="all"            // 'outliers'（預設）| 'all' | 'none'
/>`

const quartileRows = [
  { name: 'inclusive（預設）', type: 'Q1 2.75、中位數 4.5、Q3 6.25', desc: '位置 (n − 1)p：Excel QUARTILE.INC、R 預設、numpy' },
  { name: 'exclusive', type: 'Q1 2.25、中位數 4.5、Q3 6.75', desc: '位置 (n + 1)p：Minitab、Excel QUARTILE.EXC、SPSS' },
]

const propsRows = [
  { name: 'data', type: 'object[]', def: '—', desc: '每筆一個量測值；不是數字的值會略過' },
  { name: 'groupField / valueField', type: 'string', def: "'group' / 'value'", desc: '組別與數值欄位' },
  { name: 'nameField', type: 'string | null', def: 'null', desc: '資料點提示框顯示的名稱（例如批號、序號）' },
  { name: 'groups', type: '(string | { value, label })[]', def: '[]', desc: '組的順序與顯示文字；沒列到的組依出現順序接在後面，沒有資料的組也會佔一格' },
  { name: 'sort', type: "'none' | 'median-asc' | 'median-desc'", def: "'none'", desc: '依中位數排序（沒有資料的組放最後）' },
  { name: 'quartileMethod', type: "'inclusive' | 'exclusive'", def: "'inclusive'", desc: '四分位數算法（見上表）' },
  { name: 'whisker', type: "number | 'minmax'", def: '1.5', desc: '鬚的長度（倍 IQR），外面的點是離群值；minmax 時鬚畫到最小、最大值' },
  { name: 'mode', type: "'box' | 'violin'", def: "'box'", desc: '箱型圖或小提琴圖（Silverman 頻寬的高斯核密度，各組同一個比例，寬度可以比較）' },
  { name: 'showMean / showCount', type: 'boolean', def: 'true / true', desc: '畫出平均（菱形）、組名下方標出筆數' },
  { name: 'showPoints', type: "'outliers' | 'all' | 'none'", def: "'outliers'", desc: '畫出資料點：只畫離群值、全部（左右散開）、不畫' },
  { name: 'referenceLines', type: '{ value, label?, color? }[]', def: '[]', desc: '參考線（規格上下限、目標），預設紅色虛線' },
  { name: 'valueDomain / valueFormat', type: '[number, number] | null / (v) => string', def: "null / ',.4~f'", desc: '數值範圍（未指定時涵蓋資料與參考線）、數值格式' },
  { name: 'yLabel / title / emptyText', type: 'string', def: "'' / '' / '沒有資料'", desc: 'Y 軸名稱、標題、沒有資料時的提示' },
  { name: 'color', type: 'string | null', def: 'null', desc: '箱子顏色；未指定時用類別色第 1 號' },
  { name: 'highlightKey', type: 'string | number | null', def: 'null', desc: '強調這一組，其餘轉灰' },
  { name: 'enableTooltip', type: 'boolean', def: 'true', desc: '滑過或用鍵盤選到組時顯示統計' },
  { name: 'customRenderers', type: '{ tooltip? }', def: '{}', desc: 'tooltip(event) 回傳 [名稱, 值][]，取代預設的統計列表' },
  { name: 'width / height / autoResize', type: 'number / boolean', def: '640 / 360 / false', desc: 'autoResize 時容器需有高度' },
  { name: 'margin / debounceDelay', type: '{ top, right, bottom, left } / number', def: '{ 16, 16, 8, 8 } / 150', desc: '四周留白（左邊另外依刻度文字加寬）；autoResize 的重畫延遲（ms）' },
]

const eventRows = [
  { name: 'group-hover / group-click', type: 'BoxPlotGroupEvent', desc: '{ key, label, stats, rows }；stats 為 { n, min, max, q1, median, q3, iqr, mean, sd, lowerFence, upperFence, whiskerLow, whiskerHigh, outliers }。鍵盤 Enter 也算點擊' },
  { name: 'point-hover / point-click', type: 'BoxPlotPointEvent', desc: '{ group, groupLabel, value, outlier, datum }' },
  { name: 'stats-change', type: 'BoxPlotGroupEvent[]', desc: '統計改變時（掛載時也送一次）' },
  { name: 'tooltip-show / tooltip-hide', type: 'BoxPlotTooltip / —', desc: '提示框顯示與隱藏' },
  { name: 'chart-ready / chart-resize', type: '{ width, height }', desc: '掛載完成、autoResize 尺寸改變' },
]

const slotRows = [
  { name: '#tooltip', type: '{ tooltipData, tooltipVisible }', desc: '完全自訂提示框' },
  { name: 'ref: getStats()', type: 'BoxPlotGroupEvent[]', desc: '每組的統計' },
]
</script>
