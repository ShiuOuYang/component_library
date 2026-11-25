<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">UpSetChart 集合交集圖</h1>
        <p class="text-lg text-content-secondary">
          哪些缺陷、警報、不良原因常常一起出現？三個以上的集合用文氏圖畫不清楚，UpSet 把每一種組合排成一欄：上方長條是數量，
          下方矩陣的實心點代表包含哪些集合，左側是每個集合的總數。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section id="defects" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">AOI 缺陷組合</h2>
        <p class="text-sm text-content-secondary mb-4">
          1,200 片板子的 AOI 結果（<code>items</code>：每片出現了哪些缺陷）。「偏移 + 立碑」一起出現得特別多，指向同一個原因（貼片壓力 / 錫膏量不均）。
          <code>mode="exclusive"</code> 每片只算在一欄（剛好是這幾種），加起來等於總數；<code>inclusive</code> 看「至少有這幾種」。
          滑過集合（左側）會標出包含它的組合；點一欄選取，列出那些板子。
        </p>
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <ChptSegmented v-model="mode" :options="modeOptions" aria-label="交集算法" size="xs" />
          <ChptSegmented v-model="sort" :options="sortOptions" aria-label="排序" size="xs" />
          <ChptSwitch v-model="includeEmpty" label="含沒有缺陷的板子" />
        </div>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <UpSetChart
            v-model:selected="selected"
            :items="boards"
            :mode="mode"
            :sort="sort"
            :include-empty="includeEmpty"
            :min-count="2"
            title="11 月第 4 週 AOI 缺陷"
            unit="片"
            :auto-resize="true"
            @combo-click="(c) => (picked = c)"
          />
          <p class="mt-2 text-xs text-content-secondary" aria-live="polite">
            <template v-if="selected && picked">{{ picked.sets.join(' + ') || '沒有缺陷' }}：{{ picked.count }} 片，例如 {{ picked.items.slice(0, 6).join('、') }}{{ picked.count > 6 ? '…' : '' }}</template>
            <template v-else>（點一欄看是哪些板子）</template>
          </p>
        </div>
        <ChptCodeBlock class="mt-4" :code="defectCode" />
      </section>

      <section id="sets" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">用集合輸入：各警報出現在哪些機台</h2>
        <p class="text-sm text-content-secondary mb-4">
          資料是「每個集合有哪些項目」時用 <code>sets</code>。這裡是本週 24 台貼片機各出現了哪些警報；
          <code>set-order="input"</code> 保持輸入的順序，<code>sort="sets"</code> 依集合順序排欄。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <UpSetChart :sets="alarms" set-order="input" sort="sets" unit="台" title="本週警報（機台）" :bar-height="110" :auto-resize="true" />
        </div>
        <ChptCodeBlock class="mt-4" :code="setsCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="UpSetChart" title="Props" :rows="props" />
        <ApiTable of="-" title="資料格式" :rows="dataRows" />
        <ApiTable of="UpSetChart" title="Events" :rows="events" />
        <ApiTable of="UpSetChart" title="方法（ref）" :rows="methods" />
        <p class="text-sm text-content-secondary mt-4">
          <strong>注意：</strong>集合多時組合數會很多，預設只顯示前 30 欄（<code>limit</code>），數量少於 <code>min-count</code> 的也略過，標題旁會註明略過幾個。
          窄的畫面上欄寬最小 18px，放不下時可以左右捲動。附有隱藏的資料表（每個組合與數量），螢幕閱讀器可以讀出。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptCodeBlock, ChptSegmented, ChptSwitch, UpSetChart } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
const boards = (() => {
  const r = rng(11)
  return Array.from({ length: 1200 }, (_, i) => {
    const sets = []
    const shifted = r() < 0.09
    if (shifted) sets.push('偏移')
    if (r() < (shifted ? 0.55 : 0.03)) sets.push('立碑')
    const bridge = r() < 0.07
    if (bridge) sets.push('錫橋')
    if (r() < (bridge ? 0.02 : 0.05)) sets.push('少錫')
    if (r() < 0.04) sets.push('缺件')
    if (r() < (bridge ? 0.3 : 0.03)) sets.push('錫珠')
    return { id: `PCB-${String(i + 1).padStart(4, '0')}`, sets }
  })
})()
const mode = ref('exclusive')
const sort = ref('count')
const includeEmpty = ref(false)
const selected = ref(null)
const picked = ref(null)
const modeOptions = [
  { label: '剛好是這幾種', value: 'exclusive' },
  { label: '至少有這幾種', value: 'inclusive' },
]
const sortOptions = [
  { label: '依數量', value: 'count' },
  { label: '依組合大小', value: 'degree' },
]
const defectCode = `<UpSetChart
  v-model:selected="selected"
  :items="[{ id: 'PCB-0001', sets: ['偏移', '立碑'] }, { id: 'PCB-0002', sets: [] }, …]"
  mode="exclusive" sort="count" :min-count="2" unit="片" auto-resize
  @combo-click="(combo) => showBoards(combo.items)"
/>`

const alarms = (() => {
  const r = rng(5)
  const machines = Array.from({ length: 24 }, (_, i) => `M${String(i + 1).padStart(2, '0')}`)
  const pick = (p) => machines.filter(() => r() < p)
  const vac = pick(0.35)
  return [
    { name: '真空異常', items: vac },
    { name: '吸嘴堵塞', items: machines.filter((m) => (vac.includes(m) ? r() < 0.6 : r() < 0.1)) },
    { name: '供料器卡料', items: pick(0.3) },
    { name: '影像辨識失敗', items: pick(0.2) },
  ]
})()
const setsCode = `<UpSetChart
  :sets="[{ name: '真空異常', items: ['M01', 'M03', …] }, { name: '吸嘴堵塞', items: [ … ] }, …]"
  set-order="input" sort="sets" unit="台"
/>`

const props = [
  { name: 'items', type: 'UpsetItemInput[]', def: '[]', desc: '每個項目屬於哪些集合：{ id, sets: string[] }' },
  { name: 'sets', type: 'UpsetSetInput[]', def: '[]', desc: '或：每個集合有哪些項目：{ name, items: string[] }（兩種可以混用）' },
  { name: 'mode', type: "'exclusive' | 'inclusive'", def: "'exclusive'", desc: '剛好是這幾個（加起來等於總數）／至少有這幾個' },
  { name: 'sort', type: "'count' | 'degree' | 'sets'", def: "'count'", desc: '依數量、組合大小或集合順序排欄' },
  { name: 'setOrder', type: "'size' | 'input'", def: "'size'", desc: '集合（列）依大小或照輸入順序' },
  { name: 'minCount / minDegree / maxDegree', type: 'number', def: '1 / 0 / ∞', desc: '篩選組合' },
  { name: 'limit', type: 'number', def: '30', desc: '最多顯示幾欄' },
  { name: 'includeEmpty', type: 'boolean', def: 'false', desc: '顯示「不屬於任何集合」的一欄' },
  { name: 'selected', type: 'string | null', def: 'null', desc: '選取的組合鍵（v-model:selected）' },
  { name: 'width / autoResize / debounceDelay', type: 'number / boolean / number', def: '720 / false / 100', desc: '寬度（高度依集合數）' },
  { name: 'barHeight', type: 'number', def: '150', desc: '上方長條區高度' },
  { name: 'title / unit', type: 'string', def: "''", desc: '標題／數量單位' },
  { name: 'color', type: 'string | null', def: '類別色 1', desc: '長條顏色' },
  { name: 'valueFormat', type: '(v: number) => string', def: '千分位', desc: '數量格式' },
  { name: 'emptyText', type: 'string', def: '語系', desc: '沒有資料時的文字' },
]
const dataRows = [
  { name: 'UpsetCombo', type: '{ key, sets, degree, count, items }', def: '—', desc: 'key 為組合鍵（v-model:selected 用）、items 為項目 id' },
  { name: 'UpsetSet', type: '{ name, size, index }', def: '—', desc: '集合與它的總數' },
]
const events = [
  { name: 'update:selected', params: '(key: string | null)', desc: '選取 / 取消選取一欄' },
  { name: 'combo-click', params: '(combo: UpsetCombo)', desc: '點一欄（或 Enter）' },
  { name: 'set-click', params: '(set: UpsetSet)', desc: '點左側的集合' },
  { name: 'chart-resize', params: '({ width, height })', desc: 'autoResize 時尺寸改變' },
]
const methods = [
  { name: 'combos()', type: '() => UpsetCombo[]', desc: '目前顯示的組合' },
  { name: 'sets()', type: '() => UpsetSet[]', desc: '集合與大小' },
  { name: 'selectedItems()', type: '() => string[]', desc: '選取組合的項目' },
]
</script>
