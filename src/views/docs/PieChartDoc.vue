<template>
  <div class="min-h-screen bg-surface-secondary p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">PieChart 圓餅圖／環圈圖</h1>
        <p class="text-lg text-content-secondary">
          一眼看佔比：良品與不良比例、各產線產量佔比、工單狀態分布。最多 6 塊（其餘併成「其他」）；
          數值很接近、需要比較大小時，請改用 <router-link to="/docs/components/horizontal-bar-chart" class="text-accent underline">水平長條圖</router-link>。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入；型別
          <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">PieSliceEvent</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">PieTooltip</code> 也從同一個入口取得。
        </p>
      </div>

      <section id="basic" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">環圈圖</h2>
        <p class="text-sm text-content-secondary mb-4">
          中央顯示總數，滑過某一塊時換成那一塊的數值與佔比。點圖例隱藏／顯示（<code>v-model:hidden-keys</code>），
          隱藏後百分比依剩下的重算 —— 顏色跟著項目走，其他塊不會換色。
        </p>
        <div class="grid lg:grid-cols-2 gap-6 items-start">
          <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
            <div style="height: 260px">
              <PieChart
                v-model:hidden-keys="hiddenStatus"
                :data="orderStatus"
                label-field="status"
                value-field="count"
                title="工單狀態"
                center-label="張工單"
                :auto-resize="true"
              />
            </div>
            <p class="mt-2 text-xs text-content-tertiary">隱藏中：{{ hiddenStatus.length ? hiddenStatus.join('、') : '無' }}</p>
          </div>
          <ChptCodeBlock :code="basicCode" />
        </div>
      </section>

      <section id="pie" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">圓餅、「其他」與圖例位置</h2>
        <p class="text-sm text-content-secondary mb-4">
          <code>:inner-radius-ratio="0"</code> 是圓餅。資料超過 <code>max-slices</code>（預設 6）時，最小的幾塊併成灰色的「其他」，
          滑過可看合計幾項。<code>legend-position="bottom"</code> 把圖例放下方。
        </p>
        <div class="grid lg:grid-cols-2 gap-6 items-start">
          <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
            <div style="height: 300px">
              <PieChart
                :data="lineOutput"
                label-field="line"
                value-field="qty"
                title="各產線產量佔比（10 條產線）"
                :inner-radius-ratio="0"
                legend-position="bottom"
                :auto-resize="true"
              />
            </div>
          </div>
          <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
            <div style="height: 300px">
              <PieChart
                :data="yieldSplit"
                title="今日良率"
                :color-map="{ pass: 'rgb(var(--t-success-solid))', fail: 'rgb(var(--t-danger-solid))' }"
                center-label="總投入"
                :auto-resize="true"
              />
            </div>
            <p class="mt-2 text-xs text-content-tertiary">
              <code>color-map</code> 指定某些項目的顏色（這裡良品／不良用狀態色）。只有兩塊時，其實一個數字（良率 98.6%）就夠了 —— 見 KPI 小圖。
            </p>
          </div>
        </div>
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="PieChart" title="Props" :rows="propsRows" />
        <ApiTable of="PieChart" title="Events" :rows="eventRows" />
        <ApiTable of="PieChart" title="Slots" :rows="slotRows" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptCodeBlock, PieChart } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

const orderStatus = [
  { status: '生產中', count: 42 },
  { status: '待料', count: 18 },
  { status: '已完工', count: 96 },
  { status: '暫停', count: 7 },
  { status: '待檢', count: 23 },
]
const hiddenStatus = ref([])

const lineOutput = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map((l, i) => ({
  line: `${l} 線`,
  qty: [5200, 4100, 3800, 3300, 2100, 900, 640, 420, 310, 150][i],
}))

const yieldSplit = [
  { id: 'pass', label: '良品', value: 9862 },
  { id: 'fail', label: '不良', value: 138 },
]

const basicCode = `<PieChart
  v-model:hidden-keys="hidden"
  :data="orders"            // [{ status: '生產中', count: 42 }, …]
  label-field="status"
  value-field="count"
  center-label="張工單"
/>

// 圓餅：:inner-radius-ratio="0"；指定顏色：:color-map="{ pass: '#047857' }"`

const propsRows = [
  { name: 'data', type: 'object[]', def: '—', desc: '資料列；數值不是正數的略過（扇形沒有負的面積）' },
  { name: 'labelField / valueField', type: 'string', def: "'label' / 'value'", desc: '名稱與數值欄位' },
  { name: 'keyField / keyFn', type: 'string / (datum, index) => string', def: "'id' / null", desc: '資料鍵（hiddenKeys、colorMap、事件的 key）；沒有時用名稱' },
  { name: 'maxSlices / othersLabel', type: 'number / string', def: "6 / '其他'", desc: '最多幾塊（含「其他」）；超過時最小的幾塊併成灰色的「其他」' },
  { name: 'sort', type: "'desc' | 'none'", def: "'desc'", desc: '從 12 點鐘方向起由大到小，或照資料順序；「其他」永遠在最後' },
  { name: 'colors / colorMap', type: 'string[] | null / Record<key, color> | null', def: 'null / null', desc: '類別色依資料順序取用（預設 8 色、淺深色各自驗過色盲區分）；colorMap 指定某些項目的顏色' },
  { name: 'innerRadiusRatio', type: 'number', def: '0.6', desc: '內半徑比例：0 為圓餅，0.6 為環圈' },
  { name: 'gap', type: 'number', def: '2', desc: '扇形之間的縫（px，內外圈一樣寬）' },
  { name: 'sliceLabel', type: "'percent' | 'value' | 'none'", def: "'percent'", desc: '扇形上的文字；只在放得下的扇形上標，文字色依底色自動選白或深色' },
  { name: 'legendPosition / legendWidth', type: "'right' | 'bottom' | 'none' / number", def: "'right' / 200", desc: '圖例位置與右側圖例寬度' },
  { name: 'showLegendValues', type: 'boolean', def: 'true', desc: '圖例顯示數值與百分比' },
  { name: 'showCenter / centerLabel', type: 'boolean / string', def: "true / '總計'", desc: '環圈中央顯示總數與說明文字' },
  { name: 'valueFormat', type: '(v) => string', def: "d3.format(',~f')", desc: '數值格式' },
  { name: 'hiddenKeys', type: 'string[]', def: '[]', desc: '隱藏的項目，可 v-model:hidden-keys；點圖例也會切換' },
  { name: 'highlightKey', type: 'string | number | null', def: 'null', desc: '強調某一塊（突出、其他塊變淡）' },
  { name: 'title / emptyText', type: 'string', def: "'' / '沒有資料'", desc: '標題、沒有資料時的提示' },
  { name: 'enableTooltip', type: 'boolean', def: 'true', desc: '滑過或 Tab 選到扇形時顯示提示框' },
  { name: 'customRenderers', type: '{ sliceColor?, tooltip? }', def: '{}', desc: 'sliceColor(datum, slice) 自訂顏色；tooltip(datum, slice) 回傳每行文字' },
  { name: 'width / height / autoResize', type: 'number / boolean', def: '480 / 280 / false', desc: 'autoResize 時容器需有高度' },
  { name: 'margin / debounceDelay', type: '{ top, right, bottom, left } / number', def: '{ 8, 8, 8, 8 } / 150', desc: '四周留白、autoResize 的重畫延遲（ms）' },
]

const eventRows = [
  { name: 'slice-hover / slice-click', type: 'PieSliceEvent', desc: '{ datum, key, label, value, share, isOthers, members }' },
  { name: 'legend-toggle', type: '{ key, hidden }', desc: '點圖例切換' },
  { name: 'update:hiddenKeys', type: 'string[]', desc: 'v-model:hidden-keys' },
  { name: 'tooltip-show / tooltip-hide', type: 'PieTooltip / —', desc: '提示框顯示與隱藏' },
  { name: 'chart-ready / chart-resize', type: '{ width, height }', desc: '掛載完成、autoResize 尺寸改變' },
]

const slotRows = [
  { name: 'center', type: '{ total, active }', desc: '自訂環圈中央；active 是滑過中的扇形（PieSliceEvent 或 null）' },
  { name: 'tooltip', type: '{ tooltipData, tooltipVisible }', desc: '完全自訂提示框' },
]
</script>
