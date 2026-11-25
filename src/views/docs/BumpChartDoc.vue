<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">BumpChart 排名變化圖</h1>
        <p class="text-lg text-content-secondary">
          排名怎麼隨時間變：各線每月良率排名、供應商評分排名、各站停機時間排名。名次 1 在最上面、每個點寫著名次，右側標出首末期的變化（▲ 進步、▼ 退步）；
          可以切換成實際值，看名次背後的差距有多大。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section id="yield" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">各線良率排名</h2>
        <p class="text-sm text-content-secondary mb-4">
          8 條 SMT 線一年的直通良率（越高越好，<code>order="desc"</code>）。SMT 6 換了新的錫膏印刷機後從第 7 名爬到第 1 名；SMT 8 三月才開線（之前缺期）。
          點一條線高亮（<code>v-model:selected</code>），切到「實際值」會發現前幾名其實只差 0.1%。
        </p>
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <ChptSegmented v-model="display" :options="displayOptions" aria-label="顯示" size="xs" />
          <ChptSegmented v-model="curve" :options="curveOptions" aria-label="線條" size="xs" />
          <span class="text-xs text-content-secondary">高亮：{{ selected ?? '（無）' }}</span>
        </div>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <BumpChart
            v-model:selected="selected"
            :series="lines"
            :periods="months"
            :display="display"
            :curve="curve"
            unit="%"
            :value-format="(v) => v.toFixed(2)"
            title="2026 各線直通良率排名"
            :auto-resize="true"
          />
        </div>
        <ChptCodeBlock class="mt-4" :code="yieldCode" />
      </section>

      <section id="suppliers" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">越小越好：供應商進料不良率</h2>
        <p class="text-sm text-content-secondary mb-4">
          <code>order="asc"</code>：數值越小名次越前。同分同名次（例如兩家都是 120 ppm，並列第 2，下一名是第 4）。名次已經算好時用 <code>value-type="rank"</code>。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <BumpChart :series="suppliers" :periods="quarters" order="asc" unit="ppm" title="被動元件供應商進料不良率排名" :row-gap="34" :auto-resize="true" />
        </div>
        <ChptCodeBlock class="mt-4" :code="supplierCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="BumpChart" title="Props" :rows="props" />
        <ApiTable of="-" title="資料格式" :rows="dataRows" />
        <ApiTable of="BumpChart" title="Events" :rows="events" />
        <ApiTable of="BumpChart" title="方法（ref）" :rows="methods" />
        <p class="text-sm text-content-secondary mt-4">
          <strong>注意：</strong>排名圖強調名次的「變化」，名次之間的距離都一樣，差 0.1% 和差 5% 看起來一樣遠 —— 需要看差距時切到 <code>display="value"</code>。
          項目多於 8 個時，第 9 個起用灰色，建議只標出要比較的幾條（點選高亮）。附有隱藏的名次表，螢幕閱讀器可以逐期讀出。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { BumpChart, ChptCodeBlock, ChptSegmented } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

const months = Array.from({ length: 12 }, (_, i) => `${i + 1} 月`)
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
const lines = (() => {
  const base = [98.6, 98.9, 98.2, 98.7, 98.4, 97.9, 98.5, 98.3]
  return base.map((b, i) => {
    const r = rng(i + 3)
    let v = b
    return {
      name: `SMT ${i + 1}`,
      values: months.map((_, m) => {
        if (i === 7 && m < 2) return null
        v += (r() - 0.5) * 0.25
        if (i === 5 && m >= 4) v = Math.min(99.4, v + 0.18)
        if (i === 1 && m >= 6) v -= 0.08
        return Math.round(v * 100) / 100
      }),
    }
  })
})()
const display = ref('rank')
const curve = ref('bump')
const selected = ref('SMT 6')
const displayOptions = [
  { label: '名次', value: 'rank' },
  { label: '實際值', value: 'value' },
]
const curveOptions = [
  { label: '曲線', value: 'bump' },
  { label: '直線', value: 'linear' },
]
const yieldCode = `<BumpChart
  v-model:selected="selected"
  :series="[{ name: 'SMT 1', values: [98.6, 98.7, …] }, { name: 'SMT 8', values: [null, null, 98.3, …] }, …]"
  :periods="['1 月', '2 月', …]"
  order="desc" display="rank" curve="bump" unit="%" auto-resize
/>`

const quarters = ['2025 Q3', '2025 Q4', '2026 Q1', '2026 Q2', '2026 Q3', '2026 Q4']
const suppliers = [
  { name: '甲電子', values: [180, 150, 120, 95, 80, 60] },
  { name: '乙科技', values: [90, 110, 120, 140, 160, 150] },
  { name: '丙電容', values: [120, 120, 130, 110, 90, 100] },
  { name: '丁被動', values: [250, 200, 210, 180, 170, 130] },
  { name: '戊精密', values: [60, 70, 65, 120, 200, 240] },
]
const supplierCode = `<BumpChart :series="suppliers" :periods="quarters" order="asc" unit="ppm" />
// 名次已經算好：value-type="rank"，values 為 [3, 2, 2, 1, …]`

const props = [
  { name: 'series', type: 'BumpSeriesInput[]', def: '—', desc: '{ name, values, color? }；values 與 periods 對應，null 為缺期' },
  { name: 'periods', type: 'string[]', def: '—', desc: '期別（x 軸），長度決定期數' },
  { name: 'order', type: "'desc' | 'asc'", def: "'desc'", desc: '數值大的排第 1（良率）／數值小的排第 1（不良率）；同分同名次' },
  { name: 'valueType', type: "'value' | 'rank'", def: "'value'", desc: 'values 是數值（自動排名）或已經是名次' },
  { name: 'display', type: "'rank' | 'value'", def: "'rank'", desc: 'y 軸：名次（等距）或實際值' },
  { name: 'selected', type: 'string | null', def: 'null', desc: '高亮的序列（v-model:selected）' },
  { name: 'curve', type: "'bump' | 'linear'", def: "'bump'", desc: '線條：平滑的 S 形或直線' },
  { name: 'width / height', type: 'number', def: '720 / 0', desc: '尺寸；height 0 = 依名次數自動' },
  { name: 'rowGap', type: 'number', def: '30', desc: '每個名次的間距（px）' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 100', desc: '寬度跟著容器／防抖毫秒' },
  { name: 'title / unit', type: 'string', def: "''", desc: '標題／數值單位' },
  { name: 'valueFormat', type: '(v: number) => string', def: '千分位', desc: '數值格式' },
  { name: 'emptyText', type: 'string', def: '語系', desc: '沒有資料時的文字' },
]
const dataRows = [{ name: 'BumpRow', type: '{ name, values, ranks, first, last, best, worst, change }', def: '—', desc: 'change = 第一期名次 − 最後一期名次（正的是進步）' }]
const events = [
  { name: 'update:selected', params: '(name: string | null)', desc: '點一條線（或 Enter）高亮／取消' },
  { name: 'series-click', params: '(row: BumpRow)', desc: '點一條線' },
  { name: 'chart-resize', params: '({ width, height })', desc: 'autoResize 時尺寸改變' },
]
const methods = [{ name: 'rows()', type: '() => BumpRow[]', desc: '各序列的名次與變化' }]
</script>
