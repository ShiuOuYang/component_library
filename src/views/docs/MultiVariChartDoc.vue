<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">MultiVariChart 多變異圖</h1>
        <p class="text-lg text-content-secondary">
          變異到底從哪裡來？把量測值依兩到三層因子（例如日期 → 機台 → 模穴）分組畫出來：最外層並排、中間層是位置、最內層錯開連線。
          一眼看出主要變異是「位置內」（模穴之間）、「位置間」（機台之間）還是「時間」（日期之間），上方列出各來源占總平方和的比例。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section id="molding" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">射出成型：卡扣長度</h2>
        <p class="text-sm text-content-secondary mb-4">
          3 天 × 3 台成型機 × 4 個模穴，每穴量 3 件（規格 25.00 ± 0.15 mm）。模穴 4 每台都偏長 —— 同一位置內的線都往同一邊翹，主要變異來源是模穴，
          要修的是模具，不是調機台參數。點圖例可以標出某個模穴。
        </p>
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <ChptSwitch v-model="showPoints" size="sm" label="顯示個別量測值" />
        </div>
        <div class="bg-surface-secondary rounded-xl p-3 sm:p-4 border border-stroke-light">
          <MultiVariChart
            :data="molding"
            value="length"
            :factors="['day', 'machine', 'cavity']"
            :factor-labels="{ day: '日期', machine: '機台', cavity: '模穴' }"
            :lsl="24.85"
            :usl="25.15"
            :target="25"
            :show-points="showPoints"
            unit="mm"
            title="卡扣長度"
            :auto-resize="true"
            @position-click="(p) => (clicked = p.cell.path.join(' / '))"
          />
        </div>
        <p class="mt-2 text-xs text-content-secondary">點選的位置：{{ clicked || '（無）' }}</p>
        <ChptCodeBlock class="mt-4" :code="moldingCode" />
      </section>

      <section id="shift" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">兩層因子：錫膏厚度（時段 × 板上位置）</h2>
        <p class="text-sm text-content-secondary mb-4">
          SPI 量測每 2 小時抽 4 片，每片量 5 個位置。位置之間差異小，但時段之間逐漸變厚（鋼板擦拭頻率不足），主要變異來源是時段。
        </p>
        <div class="bg-surface-secondary rounded-xl p-3 sm:p-4 border border-stroke-light">
          <MultiVariChart :data="paste" value="um" :factors="['slot', 'site']" :factor-labels="{ slot: '時段', site: '位置' }" :usl="150" :lsl="100" unit="µm" title="錫膏厚度" :height="280" :auto-resize="true" />
        </div>
        <ChptCodeBlock class="mt-4" :code="pasteCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="MultiVariChart" title="Props" :rows="props" />
        <ApiTable of="-" title="資料格式" :rows="dataRows" />
        <ApiTable of="MultiVariChart" title="Events" :rows="events" />
        <ApiTable of="MultiVariChart" title="方法（ref）" :rows="methods" />
        <p class="text-sm text-content-secondary mt-4">
          <strong>怎麼看：</strong>位置內的連線長（點散得開）→ 位置內變異大；菱形之間高低差大 → 位置間變異大；各區塊的虛線（區塊平均）差很多 → 時間或批次間變異大。
          平方和占比依巢狀拆解：每一層「組平均 − 上一層平均」的平方和，最後是同一格內重複量測的組內平方和，加總為 100%。
          這是看哪一族變異最大的探索工具；要正式檢定請再做 ANOVA。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { MultiVariChart, ChptCodeBlock, ChptSwitch } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

function rng(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}
function normal(r) {
  return Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(2 * Math.PI * r())
}

const molding = (() => {
  const r = rng(17)
  const rows = []
  const days = ['11/24', '11/25', '11/26']
  const machines = ['M01', 'M02', 'M03']
  const dayShift = [0, 0.012, -0.008]
  const machineShift = [0.01, -0.015, 0.004]
  const cavityShift = [-0.02, 0.005, -0.01, 0.07]
  days.forEach((d, di) =>
    machines.forEach((m, mi) =>
      [1, 2, 3, 4].forEach((c, ci) => {
        for (let k = 0; k < 3; k++) rows.push({ day: d, machine: m, cavity: `C${c}`, length: Math.round((25 + dayShift[di] + machineShift[mi] + cavityShift[ci] + normal(r) * 0.012) * 1000) / 1000 })
      })
    )
  )
  return rows
})()
const paste = (() => {
  const r = rng(5)
  const rows = []
  ;['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'].forEach((slot, si) =>
    ['左上', '右上', '中央', '左下', '右下'].forEach((site, pi) => {
      for (let k = 0; k < 4; k++) rows.push({ slot, site, um: Math.round(118 + si * 4.5 + [0, 1.5, -1, 0.5, 1][pi] + normal(r) * 2.2) })
    })
  )
  return rows
})()
const showPoints = ref(true)
const clicked = ref('')

const moldingCode = `<MultiVariChart
  :data="rows"                         // [{ day: '11/24', machine: 'M01', cavity: 'C1', length: 24.991 }, …]
  value="length"
  :factors="['day', 'machine', 'cavity']"   // 由外到內
  :factor-labels="{ day: '日期', machine: '機台', cavity: '模穴' }"
  :lsl="24.85" :usl="25.15" :target="25"
  unit="mm"
  auto-resize
/>`
const pasteCode = `<MultiVariChart :data="spi" value="um" :factors="['slot', 'site']" :usl="150" :lsl="100" unit="µm" />

// 只要數字
import { buildMultiVari } from '@/components/library'
const { sources, dominant } = buildMultiVari(rows, { value: 'length', factors: ['day', 'machine', 'cavity'] })`

const props = [
  { name: 'data', type: 'Record<string, unknown>[]', def: '—', desc: '每筆一個量測值；缺值或非數字的會略過' },
  { name: 'value', type: 'string', def: "'value'", desc: '量測值欄位' },
  { name: 'factors', type: 'string[]', def: '—', desc: '因子欄位，由外到內 1～3 個：3 個時最外層並排成區塊' },
  { name: 'factorLabels', type: 'Record<string, string>', def: '{}', desc: '因子的顯示名稱' },
  { name: 'levelOrder', type: "'appearance' | 'natural'", def: "'appearance'", desc: '水準排序：出現順序或自然排序（1、2、10）' },
  { name: 'showPoints', type: 'boolean', def: 'true', desc: '畫出個別量測值' },
  { name: 'showSummary', type: 'boolean', def: 'true', desc: '上方顯示各變異來源的平方和占比' },
  { name: 'lsl / usl / target', type: 'number | null', def: 'null', desc: '規格線' },
  { name: 'width / height', type: 'number', def: '760 / 320', desc: '尺寸；位置太多時變寬並左右捲動' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 100', desc: '寬度跟著容器／防抖毫秒' },
  { name: 'title / unit', type: 'string', def: "''", desc: '標題／單位' },
  { name: 'valueFormat', type: '(v: number) => string', def: '4 位有效數字', desc: '數值格式' },
  { name: 'emptyText', type: 'string', def: '語系', desc: '沒有資料時的文字' },
]
const dataRows = [
  { name: 'MultiVariData', type: '{ factors, panels, innerLevels, all, sources, dominant }', def: '—', desc: 'buildMultiVari() 與 ref.result() 的回傳值' },
  { name: 'MVSource', type: '{ source, ss, pct }', def: '—', desc: "source 為因子欄位或 'within'（同一格內的重複量測）" },
]
const events = [
  { name: 'position-click', params: '(position: MVPosition)', desc: '點一個位置（或聚焦時按 Enter）' },
  { name: 'chart-resize', params: '({ width, height })', desc: 'autoResize 時尺寸改變' },
]
const methods = [{ name: 'result()', type: '() => MultiVariData', desc: '分組結果與變異來源占比' }]
</script>
