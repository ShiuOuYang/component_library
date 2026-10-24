<template>
  <div class="min-h-screen bg-surface-secondary p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">SPC 管制圖與製程能力</h1>
        <p class="text-lg text-content-secondary">
          <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">ControlChart</code> 自動計算管制界限並用 Nelson 規則找出異常點；
          <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">CapabilityHistogram</code> 畫出分布並算出 Cp、Cpk、Pp、Ppk。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入；型別
          <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">ControlChartAnalysis</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">ControlChartPoint</code>、<code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">CapabilityResult</code> 等也從同一個入口取得。
        </p>
      </div>

      <section id="imr" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">I-MR 圖（個別值與移動全距）</h2>
        <p class="text-sm text-content-secondary mb-4">
          每筆量測一點，適合抽檢頻率低、無法分組的製程。σ̂ = MR̄ ÷ 1.128，界限 = 平均 ± 3σ̂。
          這裡用 <code>baseline-count="30"</code>：前 30 點建立界限，之後的點拿來監控 —— 第 36 點起製程往上偏，觸發規則 5、6；第 20 點是單點超出界限（規則 1）。
          異常點是紅色菱形加規則編號；滑過或聚焦圖表後用方向鍵查看每一點。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 440px">
            <ControlChart
              :data="imrData"
              value-field="thickness"
              label-field="time"
              title="銅厚（µm）"
              :baseline-count="30"
              :spec-limits="{ usl: 10.5, lsl: 9.5 }"
              :auto-resize="true"
              @analysis-change="(a) => (imrAnalysis = a)"
            />
          </div>
          <p v-if="imrAnalysis" class="mt-2 text-xs text-content-secondary" aria-live="polite">
            analysis-change：UCL {{ imrAnalysis.limits.ucl.toFixed(3) }}、CL {{ imrAnalysis.limits.cl.toFixed(3) }}、LCL {{ imrAnalysis.limits.lcl.toFixed(3) }}；
            異常點 {{ imrAnalysis.violations.map((v) => `#${v.index + 1}（規則 ${v.rules.join('、')}）`).join('、') || '無' }}
          </p>
        </div>
        <ChptCodeBlock class="mt-4" :code="imrCode" />
      </section>

      <section id="xbar" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">X̄-R 圖（子組平均與全距）</h2>
        <p class="text-sm text-content-secondary mb-4">
          每次抽 n 個（這裡 5 個）為一組。資料有 <code>subgroup</code> 欄位時同值的列為一組，沒有時依 <code>subgroup-size</code> 依序切。
          子組大於 10 請用 <code>type="xbar-s"</code>。<code>show-zones</code> 畫出 ±1σ、±2σ 區帶。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 420px">
            <ControlChart :data="xbarData" type="xbar-r" label-field="batch" title="錫膏厚度（µm）" :show-zones="true" :auto-resize="true" />
          </div>
        </div>
      </section>

      <section id="p" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">p 圖（不良率）</h2>
        <p class="text-sm text-content-secondary mb-4">
          每批的不良數與檢驗數（<code>defects-field</code>、<code>size-field</code>）。每批數量不同時界限逐批計算（階梯狀），數量越多界限越窄。
          缺點數用 <code>type="u"</code>（每單位缺點數）。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 320px">
            <ControlChart :data="pData" type="p" label-field="lot" defects-field="ng" size-field="qty" title="AOI 不良率" :auto-resize="true" />
          </div>
        </div>
      </section>

      <section id="rules" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">判異規則（Nelson）</h2>
        <p class="text-sm text-content-secondary mb-4">
          <code>rules</code> 指定要檢查哪幾條，預設 [1, 2, 3, 5, 6]。標出的是「讓規則成立的那一點」；副圖（MR／R／S）只檢查規則 1。
        </p>
        <ApiTable of="-" title="規則" :rows="ruleRows" />
      </section>

      <section id="capability" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">製程能力（直方圖 + Cpk）</h2>
        <p class="text-sm text-content-secondary mb-4">
          Cp、Cpk 用組內標準差（<code>subgroup-size</code> 為 1 時用移動全距，資料要依生產順序排列），Pp、Ppk 用整體標準差。
          Cpk 依 <code>cpk-thresholds</code>（預設 1.0／1.33）顯示「不足／尚可／達標」。完全落在規格外的組是紅色。
        </p>
        <div class="mb-3 flex flex-wrap items-center gap-3 text-sm">
          <label for="cap-shift" class="text-content-secondary">平均偏移</label>
          <input id="cap-shift" v-model.number="shift" type="range" min="-0.15" max="0.15" step="0.01" class="w-48" />
          <span class="tabular-nums text-content-primary">{{ shift >= 0 ? '+' : '' }}{{ shift.toFixed(2) }}</span>
          <label class="ml-4 inline-flex items-center gap-1.5 text-content-secondary">
            <input v-model="showWithin" type="checkbox" /> 組內曲線
          </label>
        </div>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 340px">
            <CapabilityHistogram
              :data="capData"
              :lsl="9.75"
              :usl="10.25"
              :target="10"
              title="銅厚（µm）"
              :show-within-curve="showWithin"
              :auto-resize="true"
            />
          </div>
        </div>
        <ChptCodeBlock class="mt-4" :code="capCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <h3 class="text-lg font-semibold text-content-primary mt-4">ControlChart</h3>
        <ApiTable of="ControlChart" title="Props" :rows="ccProps" />
        <ApiTable of="ControlChart" title="Events" :rows="ccEvents" />
        <ApiTable of="ControlChart" title="Slots 與方法" :rows="ccSlots" />
        <h3 class="text-lg font-semibold text-content-primary mt-6">CapabilityHistogram</h3>
        <ApiTable of="CapabilityHistogram" title="Props" :rows="chProps" />
        <ApiTable of="CapabilityHistogram" title="Events" :rows="chEvents" />
        <ApiTable of="CapabilityHistogram" title="Slots 與方法" :rows="chSlots" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { CapabilityHistogram, ChptCodeBlock, ControlChart } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

/** 可重現的常態亂數（Box–Muller） */
function normalGen(seed) {
  let s = seed >>> 0
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return (s + 0.5) / 4294967296
  }
  return (mu, sigma) => mu + sigma * Math.sqrt(-2 * Math.log(rand())) * Math.cos(2 * Math.PI * rand())
}

const pad = (n) => String(n).padStart(2, '0')

// I-MR：前 30 點穩定，第 20 點單點異常，第 36 點起往上偏
const g1 = normalGen(5)
const imrData = Array.from({ length: 50 }, (_, i) => {
  let v = g1(10, 0.08)
  if (i === 19) v = 10.42
  if (i >= 35) v += 0.13
  return { time: `${pad(8 + Math.floor(i / 6))}:${pad((i % 6) * 10)}`, thickness: +v.toFixed(3) }
})
const imrAnalysis = ref(null)

// X̄-R：25 組 × 5
const g2 = normalGen(17)
const xbarData = Array.from({ length: 125 }, (_, i) => ({
  batch: `B${pad(Math.floor(i / 5) + 1)}`,
  subgroup: Math.floor(i / 5) + 1,
  value: +g2(120 + (Math.floor(i / 5) === 17 ? 3.5 : 0), 2).toFixed(2),
}))

// p 圖：每批 150～250 片，第 14 批異常
const g3 = normalGen(29)
const pData = Array.from({ length: 25 }, (_, i) => {
  const qty = 150 + Math.round(Math.abs(g3(0, 1)) * 60)
  const rate = i === 13 ? 0.09 : 0.03
  return { lot: `L${pad(i + 1)}`, qty, ng: Math.max(0, Math.round(qty * rate + g3(0, 1.5))) }
})

// 製程能力：200 筆
const g4 = normalGen(41)
const capBase = Array.from({ length: 200 }, () => g4(10.02, 0.07))
const shift = ref(0)
const showWithin = ref(false)
const capData = computed(() => capBase.map((v) => +(v + shift.value).toFixed(4)))

const imrCode = `<ControlChart
  :data="rows"                 // [{ time: '08:00', thickness: 10.03 }, …]
  value-field="thickness"
  label-field="time"
  :baseline-count="30"         // 前 30 點建立界限
  :spec-limits="{ usl: 10.5, lsl: 9.5 }"
  @analysis-change="(a) => …"  // { limits, violations, sigma, … }
/>

// X̄-R：type="xbar-r"（資料有 subgroup 欄位，或用 :subgroup-size="5" 依序切）
// p 圖：type="p" defects-field="ng" size-field="qty"
// 已核定的界限：:limits="{ cl: 10, ucl: 10.3, lcl: 9.7 }"`

const capCode = `<CapabilityHistogram
  :data="values"          // 數字陣列或 [{ value }]
  :lsl="9.75" :usl="10.25" :target="10"
  :subgroup-size="1"      // 組內 σ：1 用移動全距，2～10 用全距
  @capability-change="(c) => …"  // { cp, cpk, pp, ppk, ppmObserved, … }
/>`

const ruleRows = [
  { name: '1', type: '1 點超出管制界限（±3σ）', desc: '突發的特殊原因（換料、設備異常）' },
  { name: '2', type: '連續 9 點在中心線同一側', desc: '平均偏移' },
  { name: '3', type: '連續 6 點持續上升或下降', desc: '趨勢（刀具磨耗、藥水老化）' },
  { name: '4', type: '連續 14 點上下交錯', desc: '兩個來源輪流（雙機台、雙班）' },
  { name: '5', type: '連續 3 點中有 2 點在同一側的 2σ 之外', desc: '中等程度的偏移' },
  { name: '6', type: '連續 5 點中有 4 點在同一側的 1σ 之外', desc: '小幅偏移' },
  { name: '7', type: '連續 15 點都在 1σ 之內', desc: '變異太小：界限算錯或資料分層' },
  { name: '8', type: '連續 8 點都在 1σ 之外（兩側都有）', desc: '混合了兩個分布' },
]

const ccProps = [
  { name: 'data', type: '(object | number)[]', def: '—', desc: '量測資料（I-MR、X̄ 圖）或每批的不良數（p、u 圖）；I-MR 可以直接給數字陣列' },
  { name: 'type', type: "'imr' | 'xbar-r' | 'xbar-s' | 'p' | 'u'", def: "'imr'", desc: '管制圖種類；計量值圖下方有副圖（MR／R／S）' },
  { name: 'valueField / labelField', type: 'string', def: "'value' / 'label'", desc: '量測值、X 軸標籤（沒有時用序號；X̄ 圖用子組值）' },
  { name: 'subgroupField / subgroupSize', type: 'string / number', def: "'subgroup' / 5", desc: 'X̄ 圖分組：同值的列為一組；沒有此欄位時依大小依序切（不完整的最後一組不算）。全距圖支援 2～10' },
  { name: 'defectsField / sizeField', type: 'string', def: "'defects' / 'size'", desc: 'p、u 圖的不良數（缺點數）與樣本數（檢驗單位數）' },
  { name: 'limits / secondaryLimits', type: 'ControlChartLimits | null', def: 'null', desc: '指定已核定的主圖／副圖界限 { cl, ucl, lcl }，優先於計算值' },
  { name: 'baselineCount', type: 'number | null', def: 'null', desc: '只用前 N 點計算界限（第一階段建立界限，之後監控）' },
  { name: 'rules', type: 'number[]', def: '[1, 2, 3, 5, 6]', desc: 'Nelson 判異規則（見上表）' },
  { name: 'specLimits', type: '{ lsl?, usl?, target? } | null', def: 'null', desc: '規格界限（畫在主圖，與管制界限不同）' },
  { name: 'showZones', type: 'boolean', def: 'false', desc: '畫出 ±1σ、±2σ 區帶' },
  { name: 'showSecondary / secondaryRatio', type: 'boolean / number', def: 'true / 0.32', desc: '計量值圖顯示副圖、副圖佔的高度比例' },
  { name: 'showPoints', type: 'boolean | null', def: 'null', desc: '畫出每一點；null 時點數少於 80 才畫（異常點一定畫）' },
  { name: 'valueFormat', type: '(v) => string', def: "p 圖 '.2%'，其他 ',.4~f'", desc: '數值格式' },
  { name: 'title / emptyText', type: 'string', def: "'' / '沒有資料'", desc: '標題、沒有資料時的提示' },
  { name: 'enableTooltip', type: 'boolean', def: 'true', desc: '滑過或方向鍵選到點時顯示提示框（數值、副圖值、界限、觸發的規則）' },
  { name: 'customRenderers', type: '{ tooltip? }', def: '{}', desc: 'tooltip(point) 回傳每行文字' },
  { name: 'width / height / autoResize', type: 'number / boolean', def: '800 / 440 / false', desc: 'autoResize 時容器需有高度' },
  { name: 'margin / debounceDelay', type: '{ top, right, bottom, left } / number', def: '{ 20, 84, 28, 56 } / 150', desc: '右邊留給界限數值；autoResize 的重畫延遲（ms）' },
]

const ccEvents = [
  { name: 'analysis-change', type: 'ControlChartAnalysis', desc: '界限或異常點改變時（掛載時也送一次）：{ type, limits, secondaryLimits, sigma, violations, secondaryViolations }' },
  { name: 'point-hover / point-click', type: 'ControlChartPoint', desc: '{ index, label, value, secondary, n, rows, violations, ucl, cl, lcl }；鍵盤 Enter 也算點擊' },
  { name: 'tooltip-show / tooltip-hide', type: 'ControlChartTooltip / —', desc: '提示框顯示與隱藏' },
  { name: 'chart-ready / chart-resize', type: '{ width, height }', desc: '掛載完成、autoResize 尺寸改變' },
]

const ccSlots = [
  { name: '#tooltip', type: '{ tooltipData, tooltipVisible }', desc: '完全自訂提示框' },
  { name: 'ref: getAnalysis()', type: 'ControlChartAnalysis', desc: '目前的界限與異常點' },
]

const chProps = [
  { name: 'data', type: '(number | object)[]', def: '—', desc: '量測值；物件時用 valueField。請依生產順序排列（組內標準差用到順序）' },
  { name: 'valueField', type: 'string', def: "'value'", desc: '數值欄位' },
  { name: 'lsl / usl / target', type: 'number | null', def: 'null', desc: '規格上下限與目標；只有單邊規格時 Cp、Pp 為「—」，Cpk 取有規格的那一邊' },
  { name: 'subgroupSize', type: 'number', def: '1', desc: '組內標準差：1 用移動全距 ÷ 1.128，2～10 用全距 ÷ d2，更大用標準差 ÷ c4' },
  { name: 'binCount', type: 'number | null', def: 'null', desc: '組數；未指定時依 Freedman–Diaconis 自動決定（5～60）' },
  { name: 'cpkThresholds', type: '[number, number]', def: '[1.0, 1.33]', desc: 'Cpk 判定門檻：低於第一個「不足」、到第二個「尚可」、以上「達標」' },
  { name: 'showCurve / showWithinCurve', type: 'boolean', def: 'true / false', desc: '整體常態曲線（實線）、組內常態曲線（虛線）' },
  { name: 'showStats / statsPosition / statsWidth', type: "boolean / 'right' | 'bottom' / number", def: "true / 'right' / 210", desc: '統計面板：樣本數、平均、標準差、Cp／Cpk／Pp／Ppk、規格外 PPM' },
  { name: 'valueFormat', type: '(v) => string', def: "',.4~f'", desc: '數值格式' },
  { name: 'title / emptyText', type: 'string', def: "'' / '沒有資料'", desc: '標題、沒有資料時的提示' },
  { name: 'enableTooltip', type: 'boolean', def: 'true', desc: '滑過或方向鍵選到組時顯示筆數、比例與範圍' },
  { name: 'customRenderers', type: '{ barColor?, tooltip? }', def: '{}', desc: 'barColor(bin) 自訂顏色；tooltip(bin) 回傳每行文字' },
  { name: 'width / height / autoResize', type: 'number / boolean', def: '760 / 340 / false', desc: 'autoResize 時容器需有高度' },
  { name: 'margin / debounceDelay', type: '{ top, right, bottom, left } / number', def: '{ 30, 16, 28, 44 } / 150', desc: '四周留白、autoResize 的重畫延遲（ms）' },
]

const chEvents = [
  { name: 'capability-change', type: 'CapabilityResult', desc: '指標改變時（掛載時也送一次）：{ n, mean, sigmaOverall, sigmaWithin, cp, cpk, cpl, cpu, pp, ppk, ppmObserved, ppmExpected }' },
  { name: 'bin-hover / bin-click', type: 'HistogramBin', desc: '{ index, x0, x1, count, share, outOfSpec, values }' },
  { name: 'tooltip-show / tooltip-hide', type: 'HistogramTooltip / —', desc: '提示框顯示與隱藏' },
  { name: 'chart-ready / chart-resize', type: '{ width, height }', desc: '掛載完成、autoResize 尺寸改變' },
]

const chSlots = [
  { name: '#tooltip', type: '{ tooltipData, tooltipVisible }', desc: '完全自訂提示框' },
  { name: 'ref: getCapability()', type: 'CapabilityResult', desc: '目前的製程能力指標' },
]
</script>
