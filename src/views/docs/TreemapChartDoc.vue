<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">TreemapChart 矩形樹圖</h1>
        <p class="text-lg text-content-secondary">
          階層的組成：不良依「廠 → 線 → 站 → 不良代碼」、成本依「部門 → 科目」、庫存依「倉 → 料號」。面積是數量，最大的一塊一眼看出；
          點方塊往下鑽，上方的路徑回上層。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section id="group" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">鑽取與分組顏色</h2>
        <p class="text-sm text-content-secondary mb-4">
          11 月的不良數（片）。<code>levels="2"</code> 一次看兩層：第一層是標題列、第二層是裡面的方塊。點任何方塊往下一層，最底層的方塊送出 <code>node-click</code>。
          目前位置用 <code>v-model:path</code> 綁定（可以從網址或其他圖表帶入）。放不下的方塊不放文字，滑過看提示。
        </p>
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <ChptSegmented v-model="levels" :options="levelOptions" aria-label="一次顯示幾層" size="xs" />
          <span class="text-xs text-content-secondary">path：<code>{{ JSON.stringify(path) }}</code></span>
        </div>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 440px">
            <TreemapChart
              v-model:path="path"
              :data="defects"
              title="11 月不良數"
              unit="片"
              :levels="levels"
              :auto-resize="true"
              @node-click="(n, p) => (clicked = `${p.join(' / ')}：${n.value} 片`)"
            />
          </div>
          <p class="mt-2 text-xs text-content-secondary" aria-live="polite">{{ clicked || '（點到最底層的方塊時顯示）' }}</p>
        </div>
        <ChptCodeBlock class="mt-4" :code="groupCode" />
      </section>

      <section id="metric" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">依指標上色</h2>
        <p class="text-sm text-content-secondary mb-4">
          面積是產量、顏色是不良率（ppm）。<code>color-by="metric"</code>；<code>metric-center</code> 設成目標值 500 ppm 時是發散色階：
          高於目標偏紅、低於目標偏藍，越深差越多。群組沒給指標時用子節點依產量加權平均。
        </p>
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <ChptSwitch v-model="useCenter" label="以目標 500 ppm 為中心" />
        </div>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 380px">
            <TreemapChart
              :data="output"
              title="各線產量與不良率"
              unit="片"
              color-by="metric"
              metric-label="不良率（ppm）"
              :metric-center="useCenter ? 500 : null"
              :metric-colors="useCenter ? { low: 'rgb(var(--t-chart-1))', high: 'rgb(var(--t-danger-solid))' } : { high: 'rgb(var(--t-danger-solid))' }"
              :levels="2"
              :auto-resize="true"
            />
          </div>
        </div>
        <ChptCodeBlock class="mt-4" :code="metricCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="TreemapChart" title="Props" :rows="props" />
        <ApiTable of="-" title="TreemapNode" :rows="dataRows" />
        <ApiTable of="TreemapChart" title="Events" :rows="events" />
        <ApiTable of="TreemapChart" title="方法（ref）" :rows="methods" />
        <p class="text-sm text-content-secondary mt-4">
          <strong>注意：</strong>矩形樹圖適合「看組成、找最大的那塊」，不適合精確比較兩塊差多少 —— 要比較請用長條圖。
          同一層超過 20 項時小方塊會很多，建議把尾巴併成「其他」。鍵盤：Tab 進入後方向鍵依位置移動、Enter 往下、Esc 或 Backspace 回上層；
          圖表附有隱藏的資料表（目前這一層的名稱、數量、佔比）。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptCodeBlock, ChptSegmented, ChptSwitch, TreemapChart } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

/** 固定種子的亂數（每次開頁面都一樣） */
function rng(seed) {
  let s = seed >>> 0
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
}
const rand = rng(11)
const CODES = ['空焊', '短路', '偏移', '立碑', '缺件', '極性反', '錫珠', '異物']
const STATIONS = ['印刷', '貼片', '回焊', 'AOI', 'ICT']
const station = (name, scale) => ({
  name,
  children: CODES.slice(0, 3 + Math.floor(rand() * 5)).map((c) => ({ name: c, value: Math.round(scale * (0.2 + rand() * rand() * 3)) })),
})
const line = (name, scale) => ({ name, children: STATIONS.slice(0, 3 + Math.floor(rand() * 3)).map((s, i) => station(s, scale * (i === 2 ? 2.2 : 1))) })
const defects = {
  name: '全部',
  children: [
    { name: '一廠', children: [line('SMT 一線', 30), line('SMT 二線', 22), line('SMT 三線', 12)] },
    { name: '二廠', children: [line('SMT 五線', 26), line('SMT 六線', 9)] },
    { name: '三廠', children: [line('DIP 一線', 14)] },
  ],
}
const levels = ref(2)
const levelOptions = [
  { label: '一層', value: 1 },
  { label: '兩層', value: 2 },
]
const path = ref([])
const clicked = ref('')
const groupCode = `<TreemapChart
  v-model:path="path"
  :data="{ name: '全部', children: [
    { name: '一廠', children: [{ name: 'SMT 一線', children: [{ name: '回焊', children: [{ name: '空焊', value: 120 }, …] }] }] },
  ] }"
  unit="片" :levels="2"
  @node-click="(node, path) => openDefect(path)"
/>`

const output = {
  name: '全廠',
  children: [
    { name: '一廠', children: [{ name: 'SMT 一線', value: 48000, metric: 320 }, { name: 'SMT 二線', value: 41000, metric: 860 }, { name: 'SMT 三線', value: 22000, metric: 410 }, { name: 'DIP 一線', value: 9000, metric: 1250 }] },
    { name: '二廠', children: [{ name: 'SMT 五線', value: 52000, metric: 280 }, { name: 'SMT 六線', value: 18000, metric: 540 }, { name: '組裝線', value: 12000, metric: 150 }] },
    { name: '三廠', children: [{ name: 'SMT 七線', value: 30000, metric: 620 }, { name: 'SMT 八線', value: 26000, metric: 470 }] },
  ],
}
const useCenter = ref(true)
const metricCode = `<TreemapChart
  :data="{ name: '全廠', children: [{ name: '一廠', children: [{ name: 'SMT 一線', value: 48000, metric: 320 }, …] }] }"
  color-by="metric" metric-label="不良率（ppm）" :metric-center="500"
  :metric-colors="{ low: 'rgb(var(--t-chart-1))', high: 'rgb(var(--t-danger-solid))' }"
/>`

const props = [
  { name: 'data', type: 'TreemapNode', def: '—', desc: '根節點；葉節點給 value，群組自動加總' },
  { name: 'width / height', type: 'number', def: '640 / 400', desc: '尺寸（autoResize 時跟著容器）' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 100', desc: '跟著容器大小' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'levels', type: '1 | 2', def: '1', desc: '一次畫幾層；2 時第一層有標題列' },
  { name: 'v-model:path', type: 'string[]', def: '[]', desc: '目前所在的節點（每層的 id 或 name）' },
  { name: 'colorBy', type: "'group' | 'metric'", def: "'group'", desc: '依分組（類別色）或依 metric（連續色階）' },
  { name: 'metricDomain', type: '[number, number] | null', def: 'null', desc: '指標範圍；不給時依目前這一層的資料' },
  { name: 'metricCenter', type: 'number | null', def: 'null', desc: '發散色階的中心（例如目標值）；兩邊範圍對稱' },
  { name: 'metricColors', type: '{ low?, high? }', def: '圖表色 / 危險色', desc: '色階兩端的顏色；low 只用於發散色階' },
  { name: 'metricLabel / metricFormat', type: 'string / (v) => string', def: "'' / null", desc: '指標名稱與格式（色階、提示、資料表）' },
  { name: 'unit / valueFormat', type: 'string / (v) => string', def: "'' / null", desc: '數量的單位與格式' },
  { name: 'emptyText', type: 'string', def: '語系', desc: '沒有資料時的文字' },
]
const dataRows = [
  { name: 'id / name', type: 'string', def: '—', desc: 'id 不給時用 name（同一層要不重複）' },
  { name: 'value', type: 'number', def: '—', desc: '葉節點的大小；群組的值是子節點加總' },
  { name: 'metric', type: 'number', def: '—', desc: "上色用的指標（colorBy='metric'）；群組不給時依 value 加權平均" },
  { name: 'color', type: 'string', def: '—', desc: '指定顏色（任何 CSS 顏色）' },
  { name: 'children', type: 'TreemapNode[]', def: '—', desc: '子節點' },
]
const events = [
  { name: 'update:path', params: '(path: string[])', desc: '鑽取或回上層' },
  { name: 'node-click', params: '(node: TreemapNode, path: string[])', desc: '點一個沒有子節點的方塊（或 Enter）' },
  { name: 'chart-resize', params: '({ width, height })', desc: 'autoResize 時尺寸改變' },
]
const methods = [
  { name: 'up()', type: '() => void', desc: '回上一層' },
  { name: 'reset()', type: '() => void', desc: '回到最上層' },
  { name: 'drillTo(path)', type: '(path: string[]) => void', desc: '前往某個節點' },
]
</script>
