<template>
  <div class="min-h-screen bg-surface-secondary p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">WaterfallChart 瀑布圖</h1>
        <p class="text-lg text-content-secondary">
          從起點開始，一步一步加減到結果：良率損失拆解、營收或成本的增減。每根長條從前一根結束的地方開始，「每一步差多少」一眼看出來。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入；型別
          <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">WaterfallEvent</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">WaterfallKind</code> 也從同一個入口取得。
        </p>
      </div>

      <section id="yield" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">良率損失拆解</h2>
        <p class="text-sm text-content-secondary mb-4">
          第一項是投入數（起點），之後每一站的報廢是負數，<code>total-label="良品"</code> 自動補上最後的總計。
          <code>show-percent</code> 在每一站後面標出佔投入數的比例；滑過「良品」看到的「佔起點」就是良率。
          減少用紅色並標 −，增加用綠色並標 +，圖例也有 ▼▲，不只靠顏色。
          投入一萬多片、每站只報廢幾十片，從 0 開始畫各站會細到看不見 —— <code>:zero-baseline="false"</code> 讓軸從資料附近開始，
          起點與合計的長條底部有截斷記號，提醒它們的長度不是從 0 量起。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 380px">
            <WaterfallChart
              :data="yieldData"
              label-field="station"
              value-field="qty"
              total-label="良品"
              :show-percent="true"
              :zero-baseline="false"
              title="10 月 PCB 良率損失（片）"
              :auto-resize="true"
              @bar-click="(e) => (clicked = e)"
            />
          </div>
          <p class="mt-2 text-xs text-content-secondary" aria-live="polite">
            bar-click：{{ clicked ? `${clicked.label}（${clicked.kind}）${clicked.value}，佔起點 ${clicked.shareOfStart === null ? '—' : (clicked.shareOfStart * 100).toFixed(1) + '%'}` : '（點一根長條）' }}
          </p>
        </div>
        <ChptCodeBlock class="mt-4" :code="yieldCode" />
      </section>

      <section id="subtotal" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">小計與成本增減</h2>
        <p class="text-sm text-content-secondary mb-4">
          用 <code>type</code> 欄位標出種類：<code>start</code>（起點）、<code>delta</code>（增減）、<code>subtotal</code>（小計）、<code>total</code>（總計）；
          小計與總計畫到目前的累計值，資料裡的數值會被忽略。成本增加是壞事：<code>:increase-is-good="false"</code> 讓增加變紅色、減少變綠色。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 360px">
            <WaterfallChart
              :data="costData"
              :increase-is-good="false"
              :value-format="(v) => `${v.toFixed(1)} 萬`"
              title="單月製造成本變化"
              :auto-resize="true"
            />
          </div>
        </div>
        <ChptCodeBlock class="mt-4" :code="costCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-4">API</h2>
        <ApiTable of="WaterfallChart" title="Props" :rows="propsRows" />
        <ApiTable of="WaterfallChart" title="Events" :rows="eventRows" />
        <ApiTable of="WaterfallChart" title="Slots" :rows="slotRows" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptCodeBlock, WaterfallChart } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

const yieldData = [
  { station: '投入', qty: 12000 },
  { station: '內層 AOI', qty: -186 },
  { station: '壓合', qty: -74 },
  { station: '鑽孔', qty: -52 },
  { station: '電鍍', qty: -238 },
  { station: '外層線路', qty: -167 },
  { station: '防焊', qty: -91 },
  { station: '成型', qty: -35 },
  { station: '電測', qty: -312 },
]

const costData = [
  { label: '上月成本', value: 842.6, type: 'start' },
  { label: '原物料漲價', value: 38.4, type: 'delta' },
  { label: '產量增加', value: 56.2, type: 'delta' },
  { label: '人力', value: 12.8, type: 'delta' },
  { label: '變動前合計', type: 'subtotal' },
  { label: '良率改善', value: -24.5, type: 'delta' },
  { label: '節能專案', value: -9.3, type: 'delta' },
  { label: '匯率', value: -6.1, type: 'delta' },
  { label: '本月成本', type: 'total' },
]

const clicked = ref(null)

const yieldCode = `<WaterfallChart
  :data="[
    { station: '投入', qty: 12000 },     // 第一項是起點
    { station: '內層 AOI', qty: -186 },   // 之後是增減
    …
  ]"
  label-field="station"
  value-field="qty"
  total-label="良品"                      // 自動補最後的總計
  :show-percent="true"                    // 增減後面加上佔起點的比例
  :zero-baseline="false"                  // 軸從資料附近開始（起點、合計畫截斷記號）
/>`

const costCode = `<WaterfallChart
  :data="[
    { label: '上月成本', value: 842.6, type: 'start' },
    { label: '原物料漲價', value: 38.4, type: 'delta' },
    { label: '變動前合計', type: 'subtotal' },   // 畫到目前的累計值
    …
    { label: '本月成本', type: 'total' },
  ]"
  :increase-is-good="false"                       // 成本增加是壞事：增加紅、減少綠
/>`

const propsRows = [
  { name: 'data', type: 'object[]', def: '—', desc: '依順序排列的項目' },
  { name: 'labelField / valueField', type: 'string', def: "'label' / 'value'", desc: '名稱與數值欄位；增減不是數字時當 0' },
  { name: 'kindField', type: 'string | null', def: "'type'", desc: "種類欄位：'start' | 'delta' | 'subtotal' | 'total'；沒有這個欄位（或值不認得）時第一項是起點、其餘是增減" },
  { name: 'keyField', type: 'string | null', def: "'id'", desc: '項目的 key；沒有時用名稱（重複的名稱自動加序號）' },
  { name: 'firstIsStart', type: 'boolean', def: 'true', desc: '沒有種類欄位時第一項當起點；false 時全部當增減，從 0 開始累計' },
  { name: 'totalLabel', type: 'string | null', def: 'null', desc: '最後自動加一根總計（最後一項已經是 total 時不加）' },
  { name: 'increaseIsGood', type: 'boolean', def: 'true', desc: '增加是好事（綠）還是壞事（紅）；成本、不良數用 false' },
  { name: 'totalColor', type: 'string | null', def: 'null', desc: '起點、小計、總計的顏色；未指定時用類別色第 1 號' },
  { name: 'zeroBaseline', type: 'boolean', def: 'true', desc: 'Y 軸從 0 開始。起點很大、增減很小時關掉：軸從資料附近開始，起點與合計的長條底部畫截斷記號' },
  { name: 'barMaxWidth', type: 'number', def: '40', desc: '長條最寬（px），最多佔每格的 60%' },
  { name: 'showConnectors / showValues', type: 'boolean', def: 'true / true', desc: '長條之間的連接線、長條上方的數值' },
  { name: 'showPercent', type: 'boolean', def: 'false', desc: '增減的數值後面加上佔起點的比例' },
  { name: 'showLegend', type: 'boolean', def: 'true', desc: '圖例（只列出有用到的：增加、減少、起點／合計）' },
  { name: 'valueFormat', type: '(v) => string', def: "',~f'", desc: '數值格式（增減會自動加上 + 或 −）' },
  { name: 'title / emptyText', type: 'string', def: "'' / '沒有資料'", desc: '標題、沒有資料時的提示' },
  { name: 'enableTooltip', type: 'boolean', def: 'true', desc: '滑過或用鍵盤選到長條時顯示提示框（增減的起訖、佔起點的比例）' },
  { name: 'customRenderers', type: '{ barColor?, tooltip? }', def: '{}', desc: 'barColor(event) 自訂顏色（回傳 null 用預設）；tooltip(event) 回傳每行文字' },
  { name: 'width / height / autoResize', type: 'number / boolean', def: '640 / 360 / false', desc: 'autoResize 時容器需有高度' },
  { name: 'margin / debounceDelay', type: '{ top, right, bottom, left } / number', def: '{ 20, 16, 8, 8 } / 150', desc: '四周留白（左邊另外依刻度文字加寬）；autoResize 的重畫延遲（ms）' },
]

const eventRows = [
  { name: 'bar-hover / bar-click', type: 'WaterfallEvent', desc: '{ key, label, kind, value, from, to, shareOfStart, datum }；自動加上的總計 datum 為 null。鍵盤 Enter 也算點擊' },
  { name: 'tooltip-show / tooltip-hide', type: 'WaterfallTooltip / —', desc: '提示框顯示與隱藏' },
  { name: 'chart-ready / chart-resize', type: '{ width, height }', desc: '掛載完成、autoResize 尺寸改變' },
]

const slotRows = [
  { name: '#tooltip', type: '{ tooltipData, tooltipVisible }', desc: '完全自訂提示框' },
]
</script>
