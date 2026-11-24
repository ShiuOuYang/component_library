<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2 break-words">ProbabilityPlot 機率圖</h1>
        <p class="text-lg text-content-secondary">
          算 Cpk 或畫管制圖之前，先確認資料符不符合假設的分配。點落在直線附近就是符合；彎曲、S 形、尾巴翹起表示偏態、雙峰或有離群值。
          附 Anderson-Darling 檢定的 p 值，與 Minitab 的機率圖相同算法。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section id="normal" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">常態檢定</h2>
        <p class="text-sm text-content-secondary mb-4">
          兩條線的螺絲扭力各 40 筆，用 <code>series</code> 一起比較。一線的點貼著直線（p 值大，符合常態，可以直接算 Cpk）；
          二線混了兩支起子、兩群資料，點呈 S 形，p 值小於 0.05。實線是配適的常態分配，虛線是 95% 信賴帶，帶外的點標紅。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 460px">
            <ProbabilityPlot
              :series="torque"
              title="鎖附扭力"
              unit="N·m"
              :show-picker="false"
              :value-format="(v) => v.toFixed(2)"
              :auto-resize="true"
            />
          </div>
        </div>
        <ChptCodeBlock class="mt-4" :code="normalCode" />
      </section>

      <section id="compare" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">比較分配</h2>
        <p class="text-sm text-content-secondary mb-4">
          維修時間是右偏的（大多很快修好，少數拖很久），用常態看尾巴明顯翹起。切到「對數常態」或「Weibull」看哪個貼得比較好 ——
          壽命、時間、強度這類資料常用這兩種。分配用 <code>v-model:distribution</code> 綁定；≤ 0 的值不適用於對數常態與 Weibull，會排除並在表中註明。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 400px">
            <ProbabilityPlot
              v-model:distribution="dist"
              :values="repair"
              title="維修時間"
              unit="分鐘"
              :auto-resize="true"
              @point-click="(p) => (clicked = `第 ${p.rank} 小：${p.value} 分鐘`)"
            />
          </div>
          <p class="mt-2 text-xs text-content-secondary" aria-live="polite">distribution：<code>{{ dist }}</code><span class="ml-3">{{ clicked }}</span></p>
        </div>
        <ChptCodeBlock class="mt-4" :code="compareCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="ProbabilityPlot" title="Props" :rows="props" />
        <ApiTable of="ProbabilityPlot" title="Events" :rows="events" />
        <ApiTable of="ProbabilityPlot" title="方法（ref）" :rows="methods" />
        <p class="text-sm text-content-secondary mt-4">
          <strong>算法：</strong>繪圖位置用中位秩 (i − 0.3) / (n + 0.4)。常態與對數常態用平均與樣本標準差配適，信賴帶以 Var(μ̂ + zσ̂) ≈ σ²/n·(1 + z²/2) 近似；
          Weibull 用最小平方（ln x 對 ln(−ln(1 − p)) 迴歸）。Anderson-Darling 的 p 值：常態與對數常態用 D'Agostino &amp; Stephens 的公式，
          Weibull 用 Lockhart &amp; Stephens 的臨界值表內插（只到 0.01–0.25，超出時顯示 &lt; 或 &gt;）。
          同樣的計算也匯出成 <code>fitProbability</code>、<code>probabilityQuantile</code>、<code>normCdf</code>、<code>normInv</code>、<code>andersonDarling</code>。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptCodeBlock, ProbabilityPlot } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

/** 固定種子的亂數與常態亂數（每次開頁面都一樣） */
function rng(seed) {
  let s = seed >>> 0
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
}
const rand = rng(29)
const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-12)) * Math.cos(2 * Math.PI * rand())
const r2 = (v) => Math.round(v * 100) / 100

const torque = [
  { name: '一線', values: Array.from({ length: 40 }, () => r2(1.2 + 0.035 * gauss())) },
  { name: '二線', values: Array.from({ length: 40 }, (_, i) => r2((i % 2 ? 1.14 : 1.26) + 0.018 * gauss())) },
]
const repair = Array.from({ length: 45 }, () => Math.round(Math.exp(3 + 0.55 * gauss()) * 10) / 10)
const dist = ref('normal')
const clicked = ref('')

const normalCode = `<ProbabilityPlot
  :series="[
    { name: '一線', values: line1Torque },
    { name: '二線', values: line2Torque },
  ]"
  unit="N·m"
  :show-picker="false"
/>`
const compareCode = `<ProbabilityPlot
  v-model:distribution="dist"
  :values="repairMinutes"
  unit="分鐘"
  @point-click="({ value, rank }) => …"
/>`

const props = [
  { name: 'values', type: 'number[]', def: '[]', desc: '一組資料（非數字的值會排除）' },
  { name: 'series', type: '{ name, values, color? }[] | null', def: 'null', desc: '多組資料一起比較；給了就不看 values' },
  { name: 'v-model:distribution', type: "'normal' | 'lognormal' | 'weibull'", def: "'normal'", desc: '配適的分配' },
  { name: 'showPicker', type: 'boolean', def: 'true', desc: '顯示分配切換' },
  { name: 'showBand', type: 'boolean', def: 'true', desc: '95% 信賴帶（帶外的點標紅）' },
  { name: 'showStats', type: 'boolean', def: 'true', desc: '統計表：N、平均 / 標準差（Weibull 為形狀 / 尺度）、AD、p 值、判定' },
  { name: 'alpha', type: 'number', def: '0.05', desc: 'p < alpha 判定不符合' },
  { name: 'title / unit', type: 'string', def: "''", desc: '標題與單位' },
  { name: 'width / height', type: 'number', def: '560 / 380', desc: '尺寸（autoResize 時跟著容器）' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 100', desc: '跟著容器大小' },
  { name: 'valueFormat', type: '(v) => string', def: 'null', desc: '數值格式' },
  { name: 'emptyText', type: 'string', def: '語系', desc: '少於 3 個有效值時的文字' },
]
const events = [
  { name: 'update:distribution', params: '(distribution)', desc: '切換分配' },
  { name: 'point-click', params: '({ series, value, index, rank, p })', desc: '點一個點（index 是原始資料的索引）' },
  { name: 'chart-resize', params: '({ width, height })', desc: 'autoResize 時尺寸改變' },
]
const methods = [{ name: 'fits', type: 'ProbabilityFit[]', desc: '各組的配適結果：參數、AD、p 值、點的繪圖位置' }]
</script>
