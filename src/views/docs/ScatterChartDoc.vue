<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">ScatterChart 散佈圖與迴歸</h1>
        <p class="text-lg text-content-secondary">
          看兩個變數的關係：爐溫與空焊率、錫膏厚度與良率、機台速度與拋料率。直線迴歸顯示迴歸式、R² 與 95% 信賴帶；拖曳框選一群點看它們是哪幾批。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section id="basic" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">分類與迴歸</h2>
        <p class="text-sm text-content-secondary mb-4">
          回焊峰溫與空焊率，三條線各一個分類。<code>regression="category"</code> 每條線各一條迴歸線（看得出二線的斜率特別陡），
          <code>"all"</code> 全部一條虛線。陰影是迴歸線的 95% 信賴帶：資料越少、越靠兩端越寬 —— 不是個別點的範圍。
          拖曳框出一群點 → <code>select</code> 事件；點一下空白處取消。點圖例可隱藏分類，迴歸會跟著重算。
        </p>
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <ChptSegmented v-model="regression" :options="regressionOptions" aria-label="迴歸線" size="xs" />
          <ChptSwitch v-model="showBand" label="信賴帶" />
        </div>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 420px">
            <ScatterChart
              :data="ovenData"
              title="回焊峰溫 vs 空焊率（每點一批）"
              x-label="峰溫"
              x-unit="°C"
              y-label="空焊率"
              y-unit="%"
              :regression="regression"
              :show-band="showBand"
              :auto-resize="true"
              @select="(pts) => (picked = pts)"
              @point-click="(p) => (picked = [p])"
            />
          </div>
          <p class="mt-2 text-xs text-content-secondary" aria-live="polite">
            {{ picked.length ? `選取的批號：${picked.slice(0, 8).map((p) => p.label).join('、')}${picked.length > 8 ? ` 等 ${picked.length} 批` : ''}` : '（拖曳框選或點一個點）' }}
          </p>
        </div>
        <ChptCodeBlock class="mt-4" :code="basicCode" />
      </section>

      <section id="large" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">大量資料</h2>
        <p class="text-sm text-content-secondary mb-4">
          20,000 個量測點（錫膏厚度 vs 面積比）。點數超過 <code>canvas-threshold</code>（預設 3000）時改畫在 Canvas，
          滑過、框選、迴歸都照常；框選後沒選到的點變淡。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 380px">
            <ScatterChart :data="spiData" title="SPI 錫膏厚度 vs 面積比" x-label="厚度" x-unit="µm" y-label="面積比" y-unit="%" :point-radius="1.6" :auto-resize="true" />
          </div>
        </div>
        <ChptCodeBlock class="mt-4" :code="largeCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="ScatterChart" title="Props" :rows="props" />
        <ApiTable of="-" title="ScatterPoint（data 的每一筆）" :rows="dataRows" />
        <ApiTable of="ScatterChart" title="Events" :rows="events" />
        <ApiTable of="ScatterChart" title="方法（ref）" :rows="methods" />
        <p class="text-sm text-content-secondary mt-4">
          <strong>注意：</strong>R² 只說明「直線」解釋了多少變異：曲線關係、或被一兩個離群點拉動的直線都可能誤導，請一定搭配圖看。
          迴歸與信賴帶也可以單獨用：<code>linearRegression(points)</code>、<code>regressionBand(reg, x0, x1)</code>。
          圖表附有隱藏的統計表（各組的 n、迴歸式、R²），螢幕閱讀器念得到。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptCodeBlock, ChptSegmented, ChptSwitch, ScatterChart } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

/** 固定種子的亂數（每次開頁面都一樣） */
function rng(seed) {
  let s = seed >>> 0
  const next = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
  const normal = () => Math.sqrt(-2 * Math.log(next() || 1e-9)) * Math.cos(2 * Math.PI * next())
  return { next, normal }
}

const r1 = rng(42)
const LINES = [
  { name: 'SMT 一線', base: 0.4, slope: 0.035, n: 60 },
  { name: 'SMT 二線', base: 0.3, slope: 0.09, n: 50 },
  { name: 'SMT 三線', base: 0.6, slope: 0.02, n: 40 },
]
const ovenData = LINES.flatMap((l, li) =>
  Array.from({ length: l.n }, (_, i) => {
    const x = 236 + r1.next() * 16
    return {
      x: Math.round(x * 10) / 10,
      y: Math.max(0, Math.round((l.base + l.slope * (x - 236) + r1.normal() * 0.12) * 100) / 100),
      category: l.name,
      label: `L${li + 1}-${String(2611000 + i * 7 + li).slice(-5)}`,
    }
  })
)
const regression = ref('category')
const showBand = ref(true)
const regressionOptions = [
  { label: '每個分類', value: 'category' },
  { label: '全部', value: 'all' },
  { label: '不畫', value: 'none' },
]
const picked = ref([])
const basicCode = `<ScatterChart
  :data="[{ x: 243.5, y: 0.82, category: 'SMT 一線', label: 'L1-11000' }, …]"
  x-label="峰溫" x-unit="°C" y-label="空焊率" y-unit="%"
  regression="category"
  @select="(points) => showLots(points)"
/>`

const r2 = rng(7)
const spiData = Array.from({ length: 20000 }, () => {
  const t = 110 + r2.normal() * 9
  return { x: Math.round(t * 10) / 10, y: Math.round((70 + (t - 110) * 0.55 + r2.normal() * 4.5) * 10) / 10 }
})
const largeCode = `<ScatterChart :data="measurements" :point-radius="1.6" regression="all" />
<!-- 超過 canvas-threshold（預設 3000）個點時自動改用 Canvas -->`

const props = [
  { name: 'data', type: 'ScatterPoint[]', def: '—', desc: '資料點；x / y 不是有限數值的會略過' },
  { name: 'width / height', type: 'number', def: '640 / 400', desc: '尺寸（autoResize 時跟著容器）' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 100', desc: '跟著容器大小' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'xLabel / yLabel / xUnit / yUnit', type: 'string', def: "''", desc: '軸名稱與單位（軸標題、提示）' },
  { name: 'xDomain / yDomain', type: '[number, number] | null', def: 'null', desc: '軸範圍；不給時依資料（留 5% 邊再取整）' },
  { name: 'categoryColors', type: 'Record<string, string>', def: '—', desc: '分類顏色；不給時依出現順序用圖表色' },
  { name: 'regression', type: "'none' | 'all' | 'category'", def: "'all'", desc: '迴歸線：不畫、全部一條（虛線）、每個分類一條' },
  { name: 'showBand', type: 'boolean', def: 'true', desc: '迴歸的 95% 信賴帶（平均反應）' },
  { name: 'brushable', type: 'boolean', def: 'true', desc: '拖曳框選' },
  { name: 'pointRadius', type: 'number', def: '3.5', desc: '點的半徑（px）' },
  { name: 'canvasThreshold', type: 'number', def: '3000', desc: '點數超過時改用 Canvas' },
  { name: 'showLegend', type: 'boolean', def: 'true', desc: '分類圖例（點了顯示 / 隱藏）' },
  { name: 'valueFormat', type: "(v, axis: 'x' | 'y') => string", def: 'null', desc: '刻度與提示的數字格式' },
  { name: 'emptyText', type: 'string', def: '語系', desc: '沒有資料時的文字' },
]
const dataRows = [
  { name: 'x / y', type: 'number', def: '—', desc: '座標' },
  { name: 'category', type: 'string', def: '—', desc: '分類（顏色、分組迴歸）' },
  { name: 'label', type: 'string', def: '—', desc: '提示裡的名稱（批號、序號）' },
  { name: 'id', type: 'string | number', def: '—', desc: '自訂識別碼（原樣回傳）' },
]
const events = [
  { name: 'select', params: '(points: ScatterPoint[])', desc: '框選完成；取消選取時為空陣列' },
  { name: 'point-click', params: '(point: ScatterPoint)', desc: '點一個點（沒拖動）' },
  { name: 'visibility-change', params: '(visible: string[])', desc: '圖例切換後顯示中的分類' },
  { name: 'chart-resize', params: '({ width, height })', desc: 'autoResize 時尺寸改變' },
]
const methods = [
  { name: 'clearSelection()', type: '() => void', desc: '取消框選' },
  { name: 'selected', type: 'ScatterPoint[]', desc: '目前框選的點' },
  { name: 'regressions', type: 'Array<Regression & { group: string | null }>', desc: '各組的迴歸結果（slope、intercept、r2、n、se…）' },
]
</script>
