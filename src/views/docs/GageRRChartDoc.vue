<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">GageRRChart 量測系統分析圖</h1>
        <p class="text-lg text-content-secondary">
          量具的量測變異夠小嗎？Gage R&amp;R（交叉設計、ANOVA 法）把總變異拆成重複性（設備）、再現性（人員）與零件間變異，
          一次給出六張標準圖、變異成分表與 ANOVA 表，並依 %GRR 與 ndc 判定。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section id="caliper" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">軸心外徑：數位卡尺</h2>
        <p class="text-sm text-content-secondary mb-4">
          10 支軸心 × 3 位檢驗員 × 各量 3 次，規格 12.00 ± 0.10 mm（公差 0.20）。給了 <code>tolerance</code> 就以 %公差 判定；
          X̄ 圖大部分點在界限外代表量具能分辨零件；R 圖超出 UCL 的紅點代表那一格的重複量測差異特別大（例如沒放正），要回頭確認那幾次量測。
        </p>
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <ChptSegmented v-model="useTol" :options="tolOptions" aria-label="判定依據" size="xs" />
          <ChptSegmented v-model="mult" :options="multOptions" aria-label="研究變異倍數" size="xs" />
        </div>
        <div class="bg-surface-secondary rounded-xl p-3 sm:p-4 border border-stroke-light">
          <GageRRChart :data="caliper" :tolerance="useTol === 'tol' ? 0.2 : null" :multiplier="mult" title="軸心外徑（mm）" :auto-resize="true" />
        </div>
        <ChptCodeBlock class="mt-4" :code="caliperCode" />
      </section>

      <section id="poor" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">需要改善的量測：手持測厚規</h2>
        <p class="text-sm text-content-secondary mb-4">
          檢驗員 C 量薄件時總是壓得比較緊（交互作用顯著，交互作用圖的線不平行），測頭磨損也讓重複性變差：%GRR 超過 30%、ndc 小於 5。
          只看重點時可以用 <code>panels</code> 挑要顯示的圖。
        </p>
        <div class="bg-surface-secondary rounded-xl p-3 sm:p-4 border border-stroke-light">
          <GageRRChart :data="thickness" :panels="['components', 'range', 'interaction', 'byOperator']" title="鋼片厚度（mm）" :auto-resize="true" />
        </div>
        <ChptCodeBlock class="mt-4" :code="poorCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="GageRRChart" title="Props" :rows="props" />
        <ApiTable of="-" title="資料格式" :rows="dataRows" />
        <ApiTable of="GageRRChart" title="Events" :rows="events" />
        <ApiTable of="GageRRChart" title="方法（ref）" :rows="methods" />
        <p class="text-sm text-content-secondary mt-4">
          <strong>計算方式：</strong>二因子交叉 ANOVA（零件 × 作業員，含交互作用）；交互作用 p 值大於 <code>interactionAlpha</code>（預設 0.05）時併入誤差項重算，
          與 Minitab 的「交叉 Gage R&amp;R（ANOVA）」相同。負的變異數估計值以 0 計。ndc = ⌊√2 × σ<sub>零件</sub> ÷ σ<sub>GRR</sub>⌋。
          判定：%GRR &lt; 10% 可接受、10～30% 視用途與成本而定、&gt; 30% 不可接受（AIAG MSA）。
        </p>
        <p class="text-sm text-content-secondary mt-2">
          <strong>注意：</strong>需要完整的交叉設計（每位作業員都量過每個零件，每格至少 2 次）；各格次數不同時只取每格最少的次數。
          零件要涵蓋製程的實際變異範圍，否則零件間變異偏小、%GRR 會被高估。不適用於破壞性量測（需改用巢狀設計）。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { GageRRChart, ChptCodeBlock, ChptSegmented } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

// 固定亂數（每次載入都一樣）
function rng(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}
function normal(r) {
  const u = Math.max(1e-9, r())
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r())
}
function study({ parts, operators, trials, seed, repeat, bias, interaction = () => 0, digits = 3 }) {
  const r = rng(seed)
  const rows = []
  parts.forEach((pv, i) => {
    operators.forEach((op, j) => {
      const ie = interaction(i, j, pv)
      for (let k = 0; k < trials; k++) {
        const v = pv + bias[j] + ie + normal(r) * repeat
        rows.push({ part: `#${String(i + 1).padStart(2, '0')}`, operator: op, value: Math.round(v * 10 ** digits) / 10 ** digits })
      }
    })
  })
  return rows
}

const caliper = study({
  parts: [11.962, 12.031, 11.985, 12.054, 11.94, 12.012, 11.998, 12.071, 11.951, 12.027],
  operators: ['王', '陳', '林'],
  trials: 3,
  seed: 21,
  repeat: 0.0026,
  bias: [0, 0.0015, -0.001],
})
const thickness = study({
  parts: [0.82, 0.95, 0.88, 1.02, 0.79, 0.91, 0.99, 0.86, 0.93, 0.84],
  operators: ['A', 'B', 'C'],
  trials: 2,
  seed: 5,
  repeat: 0.028,
  bias: [0, 0.006, -0.01],
  interaction: (i, j, pv) => (j === 2 ? (pv < 0.9 ? -0.06 : 0.025) : 0),
})

const useTol = ref('tol')
const mult = ref(6)
const tolOptions = [
  { label: '對公差', value: 'tol' },
  { label: '對研究變異', value: 'sv' },
]
const multOptions = [
  { label: '6σ', value: 6 },
  { label: '5.15σ', value: 5.15 },
]

const caliperCode = `<GageRRChart
  :data="[
    { part: '#01', operator: '王', value: 11.963 },
    { part: '#01', operator: '王', value: 11.960 },   // 同一人同一件量 2 次以上
    …
  ]"
  :tolerance="0.2"        // USL − LSL，給了才算 % 公差
  :multiplier="6"
  title="軸心外徑（mm）"
  auto-resize
/>`
const poorCode = `<GageRRChart :data="rows" :panels="['components', 'range', 'interaction', 'byOperator']" />

// 只要數字：
import { analyzeGage } from '@/components/library'
const { result, error } = analyzeGage(rows, { tolerance: 0.2 })
result.grrPercent // %GRR
result.ndc        // 可分辨類別數
result.verdict    // 'acceptable' | 'marginal' | 'unacceptable'`

const props = [
  { name: 'data', type: 'GageRow[]', def: '—', desc: '{ part, operator, value }；每位作業員對每個零件量 2 次以上' },
  { name: 'tolerance', type: 'number | null', def: 'null', desc: '公差（USL − LSL）；給了才算 % 公差' },
  { name: 'multiplier', type: 'number', def: '6', desc: '研究變異倍數（6 或舊版 AIAG 的 5.15）' },
  { name: 'interactionAlpha', type: 'number', def: '0.05', desc: '交互作用 p 值大於它就併入誤差項' },
  { name: 'basis', type: "'auto' | 'studyVar' | 'tolerance'", def: "'auto'", desc: '判定依據；auto = 有公差用 % 公差，否則 % 研究變異' },
  { name: 'panels', type: 'GagePanel[]', def: '六張全部', desc: "要顯示的圖與順序：'components' | 'range' | 'mean' | 'byPart' | 'byOperator' | 'interaction'" },
  { name: 'showTables', type: 'boolean', def: 'true', desc: '顯示變異成分表與 ANOVA 表' },
  { name: 'width / panelHeight', type: 'number', def: '900 / 200', desc: '寬度（≥ 760 時兩欄）／每張小圖的高度' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 100', desc: '寬度跟著容器／防抖毫秒' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'valueFormat', type: '(v: number) => string', def: '4 位有效數字', desc: '量測值、標準差、SS / MS 的格式' },
  { name: 'emptyText', type: 'string', def: '語系', desc: '沒有資料時的文字（其他資料問題會顯示原因）' },
]
const dataRows = [
  { name: 'GageResult', type: '{ components, anova, anovaReduced, ndc, grrPercent, verdict, … }', def: '—', desc: 'analyzeGage() 與 ref.result() 的回傳值' },
  { name: 'GageComponent', type: '{ source, variance, sd, studyVar, contribution, pctStudyVar, pctTolerance }', def: '—', desc: "source：'grr' | 'repeatability' | 'reproducibility' | 'operator' | 'interaction' | 'part' | 'total'" },
]
const events = [{ name: 'chart-resize', params: '({ width, height })', desc: 'autoResize 時尺寸改變' }]
const methods = [
  { name: 'result()', type: '() => GageResult | null', desc: '完整的分析結果' },
  { name: 'error()', type: "() => 'empty' | 'parts' | 'operators' | 'trials' | 'missing' | null", desc: '資料問題的原因' },
]
</script>
