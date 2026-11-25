<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">HorizonChart 地平線圖</h1>
        <p class="text-lg text-content-secondary">
          幾十條時間序列放在同一張圖比較：每條只佔一列，數值減掉基準線後，高於基準一種顏色、低於基準另一種顏色，切成幾層摺疊、越深代表偏離越多。
          二十幾個溫區、熱電偶、機台的趨勢一頁看完，哪一條什麼時候偏掉一眼就看出來。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section id="zones" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">迴焊爐各溫區相對設定值</h2>
        <p class="text-sm text-content-secondary mb-4">
          兩台迴焊爐共 20 個溫區一天的溫度（每 5 分鐘），每條的 <code>baseline</code> 是該區的設定值。紅色是高於設定、藍色是低於設定，顏色越深偏離越多。
          可以看出 A 爐第 7 區下午開始偏高、B 爐第 3 區 14 點左右掉溫。滑過時所有列對齊同一時間、右側列出該時間的溫度；
          <code>scale="shared"</code> 讓每一層代表同樣的度數，才能比較誰偏離最多。
        </p>
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <ChptSegmented v-model="scale" :options="scaleOptions" aria-label="比例" size="xs" />
          <ChptSegmented v-model="bands" :options="bandOptions" aria-label="層數" size="xs" />
          <ChptSegmented v-model="sort" :options="sortOptions" aria-label="排序" size="xs" />
        </div>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <HorizonChart
            :series="zones"
            title="迴焊爐溫區（相對設定值）"
            unit="°C"
            :scale="scale"
            :bands="bands"
            :sort="sort"
            :auto-resize="true"
            :row-height="22"
            @row-click="(r) => (log = `${r.name}：最大偏離 ${r.stats?.maxAbs.toFixed(1)} °C`)"
          />
          <p class="mt-2 text-xs text-content-secondary" aria-live="polite">{{ log || '（點一列）' }}</p>
        </div>
        <ChptCodeBlock class="mt-4" :code="zonesCode" />
      </section>

      <section id="sync" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">和其他圖表同步十字線</h2>
        <p class="text-sm text-content-secondary mb-4">
          搭配 <code>useChartSync()</code>：在地平線圖上滑過，下方的不良率折線圖同一時間畫十字線，反過來也一樣。
          這裡是 8 台貼片機的拋料率（<code>baseline="mean"</code>：各自跟自己的平均比），可以對照不良率上升時是哪台機台在拋料。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light flex flex-col gap-3">
          <HorizonChart v-bind="sync.bind()" :series="mounters" title="貼片機拋料率（相對各自平均）" unit="%" baseline="mean" scale="shared" :auto-resize="true" :row-height="24" :value-format="(v) => v.toFixed(2)" />
          <div style="height: 200px">
            <DualAxisComboChart
              v-bind="sync.bind()"
              auto-resize
              :layers="defectLayers"
              x-scale-type="time"
              :x-axis-format="hhmm"
              y-left-axis-label="AOI 不良率 (%)"
              :margin="{ top: 12, right: 16, bottom: 32, left: 64 }"
              :animation-duration="0"
            />
          </div>
        </div>
        <ChptCodeBlock class="mt-4" :code="syncCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="HorizonChart" title="Props" :rows="props" />
        <ApiTable of="-" title="資料格式" :rows="dataRows" />
        <ApiTable of="HorizonChart" title="Events" :rows="events" />
        <ApiTable of="HorizonChart" title="方法（ref）" :rows="methods" />
        <p class="text-sm text-content-secondary mt-4">
          <strong>注意：</strong>地平線圖適合看「什麼時候偏離、偏多少」，不適合讀精確數值 —— 數值請看右側讀數或 tooltip。
          層數 2–4 比較好讀；層數越多同樣高度能看的範圍越大，但顏色越難分辨。缺值（<code>v: null</code>）的地方會斷開。
          附有隱藏的統計表（每條的基準、最小、最大、平均、最新），螢幕閱讀器可以讀出。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptCodeBlock, ChptSegmented, DualAxisComboChart, HorizonChart, useChartSync } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

const day0 = (() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
})()
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)

// ---- 溫區 ----
const zones = (() => {
  const out = []
  const sets = [150, 165, 175, 185, 195, 210, 230, 245, 250, 240]
  for (const oven of ['A', 'B']) {
    sets.forEach((sp, z) => {
      const r = rng(z * 7 + (oven === 'A' ? 1 : 101))
      let drift = 0
      const data = Array.from({ length: 288 }, (_, i) => {
        const h = i / 12
        drift = drift * 0.95 + (r() - 0.5) * 0.6
        let v = sp + Math.sin(i / 20 + z) * 0.8 + drift
        if (oven === 'A' && z === 6 && h > 13) v += Math.min(6, (h - 13) * 1.6)
        if (oven === 'B' && z === 2 && h > 13.5 && h < 15) v -= 7 * Math.sin(((h - 13.5) / 1.5) * Math.PI)
        if (oven === 'B' && z === 8 && h > 9 && h < 9.4) return { t: day0 + i * 300_000, v: null }
        return { t: day0 + i * 300_000, v }
      })
      out.push({ name: `${oven} 爐 第 ${z + 1} 區`, baseline: sp, data })
    })
  }
  return out
})()
const scale = ref('shared')
const bands = ref(3)
const sort = ref('none')
const log = ref('')
const scaleOptions = [
  { label: '每列各自比例', value: 'row' },
  { label: '共用比例', value: 'shared' },
]
const bandOptions = [
  { label: '2 層', value: 2 },
  { label: '3 層', value: 3 },
  { label: '4 層', value: 4 },
]
const sortOptions = [
  { label: '原順序', value: 'none' },
  { label: '最大偏離', value: 'maxAbs' },
  { label: '最新值', value: 'last' },
]
const zonesCode = `<HorizonChart
  :series="[{ name: 'A 爐 第 1 區', baseline: 150, data: [{ t: '2026-11-25T00:00', v: 150.4 }, …] }, …]"
  unit="°C" scale="shared" :bands="3" sort="maxAbs" auto-resize
  @row-click="(row) => openZone(row.name)"
/>`

// ---- 同步 ----
const sync = useChartSync({ zoom: false, crosshair: true })
const mounters = Array.from({ length: 8 }, (_, m) => {
  const r = rng(m + 31)
  return {
    name: `貼片機 ${m + 1}`,
    data: (() => {
      let noise = 0
      return Array.from({ length: 96 }, (_, i) => {
        noise = noise * 0.8 + (r() - 0.5) * 0.04
        let v = 0.3 + noise
        if (m === 4 && i > 50 && i < 64) v += 0.9 * Math.sin(((i - 50) / 14) * Math.PI)
        if (m === 1 && i > 20 && i < 26) v += 0.35
        return { t: day0 + 8 * 3_600_000 + i * 300_000, v }
      })
    })(),
  }
})
const defectSeries = Array.from({ length: 96 }, (_, i) => {
  const bump = i > 52 && i < 68 ? 1.6 * Math.sin(((i - 52) / 16) * Math.PI) : 0
  return { t: new Date(day0 + 8 * 3_600_000 + i * 300_000), key: String(i), v: 0.6 + bump + ((i * 37) % 10) / 40 }
})
const defectLayers = [{ type: 'line', data: defectSeries, xValue: (d) => d.t, yValue: (d) => d.v, keyFn: (d) => d.key, color: 'rgb(var(--t-chart-4))', showDots: false, legend: { show: false } }]
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const syncCode = `const sync = useChartSync({ crosshair: true })

<HorizonChart v-bind="sync.bind()" :series="mounters" baseline="mean" scale="shared" unit="%" />
<DualAxisComboChart v-bind="sync.bind()" :layers="defectLayers" x-scale-type="time" />`

const props = [
  { name: 'series', type: 'HorizonSeriesInput[]', def: '—', desc: '{ name, data: { t, v }[], baseline?, unit? }；t 為毫秒、ISO 字串或 Date' },
  { name: 'width', type: 'number', def: '720', desc: '寬度（高度依列數）' },
  { name: 'rowHeight', type: 'number', def: '28', desc: '每列高度（px）' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 100', desc: '寬度跟著容器／防抖毫秒' },
  { name: 'title / unit', type: 'string', def: "''", desc: '標題／預設單位（序列的 unit 優先）' },
  { name: 'bands', type: 'number', def: '3', desc: '每一邊切幾層' },
  { name: 'baseline', type: "number | 'mean'", def: '0', desc: '基準線；mean 為每條各自的平均（序列的 baseline 優先）' },
  { name: 'scale', type: "'row' | 'shared'", def: "'row'", desc: '每列各自比例（看形狀）／共用比例（比偏離大小）' },
  { name: 'sort', type: "'none' | 'name' | 'maxAbs' | 'mean' | 'last'", def: "'none'", desc: '依最大偏離、平均偏離、最新偏離（由大到小）或名稱排序' },
  { name: 'positiveColor / negativeColor', type: 'string', def: '紅 / 藍', desc: '高於／低於基準的顏色（越外層越深）' },
  { name: 'xDomain', type: '[number | Date, number | Date] | null', def: 'null', desc: '顯示的時間範圍（可跟 useChartSync 同步）' },
  { name: 'crosshair / crosshairValue', type: 'boolean / time | null', def: 'true / null', desc: '十字線與外部的十字線位置（useChartSync）' },
  { name: 'showValues', type: 'boolean', def: 'true', desc: '右側列出十字線時間（沒有時為最新）的值' },
  { name: 'valueFormat / timeFormat', type: '(v) => string / (d: Date) => string', def: '—', desc: '數值／時間格式' },
  { name: 'emptyText', type: 'string', def: '語系', desc: '沒有資料時的文字' },
]
const dataRows = [
  { name: 'HorizonSeriesInput', type: '{ name, data, baseline?, unit? }', def: '—', desc: 'data 為 { t, v }[]，v 為 null 時斷開' },
  { name: 'HorizonRow', type: '{ name, baseline, points, stats }', def: '—', desc: 'stats：min、max、mean、last、maxAbs（最大偏離）、n' },
]
const events = [
  { name: 'crosshair-move', params: '(t: Date | null)', desc: '十字線移動（離開時 null）；給 useChartSync' },
  { name: 'row-click', params: '(row: HorizonRow)', desc: '點一列' },
  { name: 'chart-resize', params: '({ width, height })', desc: 'autoResize 時尺寸改變' },
]
const methods = [{ name: 'rows()', type: '() => HorizonRow[]', desc: '排序後的列（含基準與統計）' }]
</script>
