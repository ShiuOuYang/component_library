<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">DoeEffectsChart 實驗設計效果圖</h1>
        <p class="text-lg text-content-secondary">
          2<sup>k</sup> 因子實驗做完之後：哪些因子、哪些交互作用真的有影響？三張圖切換——<strong>標準化效果柏拉圖</strong>（超過虛線的才顯著）、
          <strong>主效果圖</strong>（每個因子低 / 高水準的平均）、<strong>交互作用圖</strong>（兩條線不平行就有交互作用）。
          有重複實驗時用組內變異判斷顯著，沒有重複時用 Lenth 法。請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section id="replicated" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">回焊空洞率：2³ 全因子、重複 2 次</h2>
        <p class="text-sm text-content-secondary mb-4">
          三個因子各兩個水準：峰值溫度 240 / 250 °C、回焊時間 60 / 90 秒、輸送速度 70 / 80 cm/min，每個組合做 2 次（共 16 次），量 BGA 空洞率（%）。
          有重複，所以用同一組合兩次之間的差異估計誤差。溫度與時間的效果顯著，溫度 × 時間也有交互作用——
          溫度高的時候，拉長時間的改善更明顯；速度沒有影響，可以選產能較高的 80。
        </p>
        <div class="bg-surface-secondary rounded-xl p-3 sm:p-4 border border-stroke-light">
          <DoeEffectsChart
            v-model:view="reflowView"
            :data="reflow"
            :factors="['temp', 'time', 'speed']"
            response="voids"
            :factor-labels="{ temp: '峰值溫度', time: '回焊時間', speed: '輸送速度' }"
            title="BGA 空洞率（%）"
            unit="%"
            :auto-resize="true"
          />
        </div>
        <ChptCodeBlock class="mt-4" :code="reflowCode" />
      </section>

      <section id="lenth" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">沒有重複：2⁴ 篩選實驗（Lenth 法）</h2>
        <p class="text-sm text-content-secondary mb-4">
          四個因子、每個組合只做 1 次（16 次）。沒有重複就沒有組內變異可用，改用 Lenth 法：大部分效果應該接近 0，用它們的中位數估計誤差（PSE），
          明顯比 PSE 大的才算顯著。因子已經編碼成 −1 / +1 也可以直接用。這裡 A、C 與 AC 顯著。
        </p>
        <div class="bg-surface-secondary rounded-xl p-3 sm:p-4 border border-stroke-light">
          <DoeEffectsChart :data="screening" :factors="['A', 'B', 'C', 'D']" response="y" title="篩選實驗：拉力（N）" :auto-resize="true" />
        </div>
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="DoeEffectsChart" title="Props" :rows="doeProps" />
        <ApiTable of="DoeEffectsChart" title="Events" :rows="doeEvents" />
        <ApiTable of="DoeEffectsChart" title="方法（ref）" :rows="doeMethods" />
        <p class="text-sm text-content-secondary mt-4">
          <strong>注意：</strong>每個因子要剛好兩個水準（中心點等其他值的列會略過）；部分因子設計會有別名（例如 2⁴⁻¹ 中 AB 與 CD 無法分開），
          效果圖仍會列出，但要自己對照設計的別名結構解讀。效果 = 高水準平均 − 低水準平均；係數 = 效果 ÷ 2。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptCodeBlock, DoeEffectsChart } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

/** 可重現的雜訊（線性同餘 + Box–Muller） */
function noiseGen(seed) {
  let s = seed >>> 0
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return (s + 0.5) / 4294967296
  }
  return (sd) => sd * Math.sqrt(-2 * Math.log(rand())) * Math.cos(2 * Math.PI * rand())
}

// 回焊：空洞率 = 12 − 2.4·T − 1.2·t + 0 · S + 0.9·T·t（T、t、S 為 −1 / +1）
const n1 = noiseGen(11)
const reflow = []
for (const temp of [240, 250]) for (const time of [60, 90]) for (const speed of [70, 80]) {
  const T = temp === 250 ? 1 : -1
  const t = time === 90 ? 1 : -1
  for (let rep = 0; rep < 2; rep++) reflow.push({ temp, time, speed, voids: +(12 - 2.4 * T - 1.2 * t - 0.9 * T * t + n1(0.35)).toFixed(2) })
}
const reflowView = ref('pareto')

// 篩選：y = 50 + 4·A + 0.2·B + 3·C − 0.1·D + 2.5·A·C（已編碼）
const n2 = noiseGen(23)
const screening = []
for (const A of [-1, 1]) for (const B of [-1, 1]) for (const C of [-1, 1]) for (const D of [-1, 1]) {
  screening.push({ A, B, C, D, y: +(50 + 4 * A + 0.2 * B + 3 * C - 0.1 * D + 2.5 * A * C + n2(0.5)).toFixed(2) })
}

const reflowCode = `<DoeEffectsChart
  v-model:view="view"          // 'pareto' | 'main' | 'interaction'
  :data="runs"                 // 每一列一次實驗
  :factors="['temp', 'time', 'speed']"
  response="voids"
  :factor-labels="{ temp: '峰值溫度', time: '回焊時間', speed: '輸送速度' }"
  :max-order="2"               // 分析到二階交互作用
/>

const runs = [
  { temp: 240, time: 60, speed: 70, voids: 15.1 },
  { temp: 240, time: 60, speed: 70, voids: 14.6 },   // 重複
  …
]

// 只要數字：analyzeDoe(doeCodeDesign(runs, factors, 'voids').runs, factors.length)
// → { effects: [{ term: { key: 'AB' }, effect, coef, t, significant }], method, tCrit }`

const doeProps = [
  { name: 'data', type: 'Record<string, unknown>[]', def: '—', desc: '每一列一次實驗' },
  { name: 'factors', type: 'string[]', def: '—', desc: '因子欄位（依序為 A、B、C…；每個剛好兩個水準）' },
  { name: 'response', type: 'string', def: '—', desc: '反應值欄位' },
  { name: 'factorLabels', type: 'Record<string, string>', def: '{}', desc: '因子顯示名稱' },
  { name: 'levels', type: 'Record<string, [low, high]>', def: '自動', desc: '指定低 / 高水準（不給時用出現的兩個值，數字由小到大）' },
  { name: 'maxOrder', type: 'number', def: '2', desc: '分析到幾階交互作用（2 或 3）' },
  { name: 'view', type: "'pareto' | 'main' | 'interaction'", def: "'pareto'", desc: '顯示哪張圖（v-model:view）' },
  { name: 'width / height', type: 'number', def: '760 / 280', desc: '寬度 / 主效果圖高度（柏拉圖與交互作用圖依項目數決定）' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 100', desc: '跟著容器寬度調整' },
  { name: 'title / unit', type: 'string', def: "''", desc: '標題 / 反應值單位' },
  { name: 'valueFormat', type: '(v: number) => string', def: 'null', desc: '反應值格式' },
  { name: 'emptyText', type: 'string', def: '「沒有可分析的資料」', desc: '沒有資料時的文字' },
]
const doeEvents = [
  { name: 'update:view', params: "(view: 'pareto' | 'main' | 'interaction')", desc: '切換圖表' },
  { name: 'chart-resize', params: '({ width, height })', desc: 'autoResize 時尺寸改變' },
]
const doeMethods = [
  { name: 'analysis()', type: '() => DoeAnalysis', desc: '效果、係數、t 值、是否顯著、分析方法與 t 臨界值' },
]
</script>
