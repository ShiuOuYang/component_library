<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2 break-words">ParallelCoordinatesChart 平行座標圖</h1>
        <p class="text-lg text-content-secondary">
          多參數的製程視窗：哪些「溫度 + 速度 + 壓力」的組合良率高。每個參數一條垂直軸，每一筆資料（一批）是一條折線；在軸上框選範圍，
          所有條件都符合的批次保留顏色。請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section id="window" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">找出製程視窗</h2>
        <p class="text-sm text-content-secondary mb-4">
          200 批回焊的參數與良率，依良率上色（藍 → 紅 = 低 → 高；<code>color-range</code> 可換）。先在「良率」軸上框出 98% 以上，
          就看得出好的批次集中在哪些溫度、速度；再到其他軸框選，看還剩幾批。拖動框選區可以平移、點一下軸清除。
          「空洞率」越小越好，設 <code>reverse</code> 讓它跟其他軸一樣「上面比較好」。
        </p>
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <ChptButton size="xs" is-outline @click="brushes = { yield: [98, 100] }">只看良率 ≥ 98%</ChptButton>
          <ChptButton size="xs" is-outline @click="brushes = { yield: [98, 100], peak: [242, 250] }">再限制峰溫 242–250 °C</ChptButton>
          <span class="text-xs text-content-secondary">brushes：<code>{{ JSON.stringify(roundBrushes) }}</code></span>
        </div>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 400px">
            <ParallelCoordinatesChart
              v-model:brushes="brushes"
              v-model:order="order"
              :data="lots"
              :axes="axes"
              color-by="yield"
              color-label="良率（%）"
              label-key="lot"
              title="回焊參數與良率（每條線一批）"
              :auto-resize="true"
              @select="(rows) => (picked = rows)"
            />
          </div>
          <p class="mt-2 text-xs text-content-secondary" aria-live="polite">
            {{ picked.length && picked.length < lots.length ? `符合的批號：${picked.slice(0, 6).map((r) => r.lot).join('、')}${picked.length > 6 ? ` 等 ${picked.length} 批` : ''}` : '（框選後列出符合的批號）' }}
          </p>
        </div>
        <ChptCodeBlock class="mt-4" :code="windowCode" />
      </section>

      <section id="large" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">大量資料與分類顏色</h2>
        <p class="text-sm text-content-secondary mb-4">
          3,000 片 SPI 量測，依產線上色（文字欄位用類別色）。線多於 <code>canvas-threshold</code>（預設 800）時改畫在 Canvas，框選照常。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 340px">
            <ParallelCoordinatesChart :data="spi" :axes="spiAxes" color-by="line" :line-opacity="0.25" :auto-resize="true" />
          </div>
        </div>
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="ParallelCoordinatesChart" title="Props" :rows="propsRows" />
        <ApiTable of="-" title="ParallelAxis（axes 的每一筆）" :rows="axisRows" />
        <ApiTable of="ParallelCoordinatesChart" title="Events" :rows="events" />
        <ApiTable of="ParallelCoordinatesChart" title="方法（ref）" :rows="methods" />
        <p class="text-sm text-content-secondary mt-4">
          <strong>注意：</strong>相鄰的兩條軸最好比較（線交叉成 X 表示負相關、平行表示正相關），把想比較的參數拖到隔壁。
          軸太多（超過 8 條）時線會糊成一片，先挑重要的參數。鍵盤：Tab 到軸名稱，←→ 換位置、Delete 清除那條軸的框選；
          框選也可以用 <code>v-model:brushes</code> 由表單輸入。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ChptButton, ChptCodeBlock, ParallelCoordinatesChart } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

function rng(seed) {
  let s = seed >>> 0
  const next = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
  const normal = () => Math.sqrt(-2 * Math.log(next() || 1e-9)) * Math.cos(2 * Math.PI * next())
  return { next, normal }
}
const r = rng(5)
const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d
const lots = Array.from({ length: 200 }, (_, i) => {
  const peak = 236 + r.next() * 18
  const speed = 70 + r.next() * 30
  const soak = 60 + r.next() * 60
  const thickness = 110 + r.normal() * 10
  // 良率在峰溫 245、速度 80–90、浸潤 80–100 秒附近最好
  const penalty = ((peak - 245) / 5) ** 2 + ((speed - 85) / 9) ** 2 + ((soak - 90) / 25) ** 2 + ((thickness - 112) / 14) ** 2
  const yieldPct = Math.min(99.9, 99.5 - penalty * 0.9 + r.normal() * 0.4)
  return { lot: `L${2611000 + i}`, peak: round(peak), speed: round(speed), soak: round(soak), thickness: round(thickness), void: round(Math.max(1, 4 + penalty * 2.5 + r.normal())), yield: round(yieldPct, 2) }
})
const axes = [
  { key: 'peak', label: '峰溫', unit: '°C' },
  { key: 'speed', label: '輸送速度', unit: 'cm/min' },
  { key: 'soak', label: '浸潤時間', unit: 's' },
  { key: 'thickness', label: '錫膏厚度', unit: 'µm' },
  { key: 'void', label: '空洞率', unit: '%', reverse: true },
  { key: 'yield', label: '良率', unit: '%' },
]
const brushes = ref({})
const order = ref(null)
const picked = ref([])
const roundBrushes = computed(() => Object.fromEntries(Object.entries(brushes.value).map(([k, [a, b]]) => [k, [round(a), round(b)]])))
const windowCode = `<ParallelCoordinatesChart
  v-model:brushes="brushes"
  :data="lots"
  :axes="[
    { key: 'peak', label: '峰溫', unit: '°C' },
    { key: 'speed', label: '輸送速度', unit: 'cm/min' },
    { key: 'void', label: '空洞率', unit: '%', reverse: true },
    { key: 'yield', label: '良率', unit: '%' },
  ]"
  color-by="yield" label-key="lot"
  @select="(rows) => showLots(rows)"
/>
// brushes：{ yield: [98, 100], peak: [242, 250] }`

const r2 = rng(9)
const lines = ['SMT 一線', 'SMT 二線', 'SMT 三線']
const spi = Array.from({ length: 3000 }, (_, i) => {
  const li = i % 3
  const t = 110 + r2.normal() * 8 + li * 4
  return { line: lines[li], height: round(t), area: round(80 + (t - 110) * 0.9 + r2.normal() * 4), volume: round(90 + (t - 110) * 1.2 + r2.normal() * 5), offsetX: round(r2.normal() * 15 + li * 5), offsetY: round(r2.normal() * 15) }
})
const spiAxes = [
  { key: 'height', label: '高度', unit: 'µm' },
  { key: 'area', label: '面積比', unit: '%' },
  { key: 'volume', label: '體積比', unit: '%' },
  { key: 'offsetX', label: 'X 偏移', unit: 'µm' },
  { key: 'offsetY', label: 'Y 偏移', unit: 'µm' },
]

const propsRows = [
  { name: 'data', type: 'Record<string, unknown>[]', def: '—', desc: '每一筆一條線' },
  { name: 'axes', type: 'ParallelAxis[]', def: '—', desc: '軸（參數）；至少兩條' },
  { name: 'width / height', type: 'number', def: '720 / 380', desc: '尺寸（autoResize 時跟著容器）' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 100', desc: '跟著容器大小' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'colorBy / colorLabel', type: 'string', def: "''", desc: '依這個欄位上色（數值：連續色階；文字：類別色）與它的名稱' },
  { name: 'colorRange', type: '[string, string]', def: '圖表色 / 危險色', desc: '連續色階的兩端（任何 CSS 顏色）' },
  { name: 'v-model:brushes', type: 'Record<string, [number, number]>', def: '{}', desc: '每條軸的框選範圍（資料單位）' },
  { name: 'v-model:order', type: 'string[] | null', def: 'null', desc: '軸的順序；null 為 axes 的順序' },
  { name: 'labelKey', type: 'string', def: "''", desc: '提示裡的名稱欄位（批號）' },
  { name: 'lineOpacity', type: 'number', def: '0.55', desc: '選到的線的透明度（線很多時調低）' },
  { name: 'canvasThreshold', type: 'number', def: '800', desc: '線多於這個數量時改用 Canvas' },
  { name: 'valueFormat', type: '(v: number) => string', def: 'null', desc: '刻度與提示的數字格式' },
  { name: 'emptyText', type: 'string', def: '語系', desc: '沒有資料時的文字' },
]
const axisRows = [
  { name: 'key / label', type: 'string', def: '—', desc: '欄位與名稱' },
  { name: 'unit', type: 'string', def: '—', desc: '單位（軸下方、提示）' },
  { name: 'domain', type: '[number, number]', def: '依資料', desc: '範圍；不給時依資料取整' },
  { name: 'reverse', type: 'boolean', def: 'false', desc: '反轉（越小越好：小的在上面，名稱標 ↓）' },
]
const events = [
  { name: 'update:brushes', params: '(brushes)', desc: '框選改變' },
  { name: 'update:order', params: '(order: string[])', desc: '軸換位置' },
  { name: 'select', params: '(rows)', desc: '框選完成後符合條件的資料' },
  { name: 'line-click', params: '(row)', desc: '點一條線（SVG 模式）' },
  { name: 'chart-resize', params: '({ width, height })', desc: 'autoResize 時尺寸改變' },
]
const methods = [
  { name: 'clearBrushes()', type: '() => void', desc: '清除所有框選' },
  { name: 'setBrush(key, range)', type: '(key: string, range: [number, number] | null) => void', desc: '設定或清除某條軸的框選' },
  { name: 'selected', type: 'Record<string, unknown>[]', desc: '目前符合框選的資料' },
]
</script>
