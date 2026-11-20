<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">WaferMap 晶圓圖／面板圖</h1>
        <p class="text-lg text-content-secondary">
          每筆資料是一顆晶粒的行列座標加上 bin（分類）或量測值。bin 模式在標題列顯示良率，圖例點一下淡化該 bin；
          給 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">value-field</code> 就是數值模式，用連續色階看參數在晶圓上的分佈。
          晶粒畫在 Canvas（數萬顆也順）。請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <!-- bin 模式 -->
      <section id="bin" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">Bin 圖與分區良率</h2>
        <p class="text-sm text-content-secondary mb-4">
          <code>rings</code> 把晶圓分成幾圈同心環，各圈分別算良率 —— 這片的不良集中在外圈與一道刮痕。
          點圖例淡化某個 bin（不移除，位置分佈本身就是資訊）；Tab 進入圖後可用方向鍵逐顆移動、Enter 選取。
        </p>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
            <div class="mb-3 flex flex-wrap items-center gap-3 text-sm text-content-secondary">
              <span aria-hidden="true">分圈</span>
              <ChptSegmented v-model="rings" :options="[{ label: '不分', value: 0 }, { label: '3 圈', value: 3 }, { label: '5 圈', value: 5 }]" aria-label="分圈" size="xs" />
            </div>
            <div style="height: 460px">
              <WaferMap
                v-model:hidden-bins="hiddenBins"
                :data="wafer"
                :bins="bins"
                :rings="rings"
                title="LOT N2611-07 · Wafer #12"
                auto-resize
                @die-click="(d) => (picked = d)"
              />
            </div>
            <p class="mt-2 text-xs text-content-tertiary" aria-live="polite">
              {{ picked ? `已選取 (${picked.x}, ${picked.y})：${picked.binLabel}` : '點一顆晶粒選取' }}
            </p>
          </div>
          <ChptCodeBlock :code="binCode" />
        </div>
      </section>

      <!-- 數值模式 -->
      <section id="value" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">數值模式（參數分佈）</h2>
        <p class="text-sm text-content-secondary mb-4">
          給 <code>value-field</code> 後依數值上連續色階（預設 viridis，對色覺差異友善、深淺色模式都清楚）；
          用 <code>value-colors</code> 自訂色階、<code>value-domain</code> 固定範圍（多片比較時色階才一致）。
        </p>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
            <div class="max-lg:overflow-x-auto"><!-- 固定寬度的圖表：手機上在自己的框裡水平捲動，不把整頁撐寬 -->
              <WaferMap :data="wafer" value-field="vth" :value-format="(v) => `${v.toFixed(3)} V`" title="Vth 分佈" :width="420" :height="380" />
            </div>
          </div>
          <ChptCodeBlock :code="valueCode" />
        </div>
      </section>

      <!-- 多片比較 -->
      <section id="lot" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">整批比較</h2>
        <p class="text-sm text-content-secondary mb-4">
          並排多片時給同一個 <code>grid</code>，每片的晶粒大小才一致；關掉圖例，只看位置分佈與良率。
        </p>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div v-for="w in lot" :key="w.id" class="rounded-lg border border-stroke-light bg-surface-secondary p-2">
            <WaferMap :data="w.dies" :bins="bins" :grid="lotGrid" :title="`#${w.id}`" :show-legend="false" :width="150" :height="150" :die-gap="0" />
          </div>
        </div>
      </section>

      <!-- 面板 -->
      <section id="panel" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">面板圖</h2>
        <p class="text-sm text-content-secondary mb-4">
          <code>shape="panel"</code> 外框改為矩形、沒有定位缺口；<code>die-aspect</code> 是晶粒寬高比（例如顯示面板的 cell）。
          <code>flip-y</code> 讓第 0 列在最下面（座標原點在左下）。
        </p>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
            <div class="max-lg:overflow-x-auto"><!-- 固定寬度的圖表：手機上在自己的框裡水平捲動，不把整頁撐寬 -->
              <WaferMap :data="panel" :bins="panelBins" shape="panel" :die-aspect="1.6" flip-y title="Panel P-0193" :width="440" :height="220" />
            </div>
          </div>
          <ChptCodeBlock :code="panelCode" />
        </div>
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-4">API</h2>
        <ApiTable of="WaferMap" title="Props" :rows="propsRows" />
        <ApiTable of="WaferMap" title="Events" :rows="eventRows" />
        <ApiTable of="WaferMap" title="方法（ref）" :rows="methodRows" />
        <p class="text-sm text-content-secondary mt-4">
          <strong>無障礙：</strong>整張圖是一個可聚焦的區塊，名稱念出晶粒數與良率；方向鍵逐顆移動（跳過沒有晶粒的位置），
          目前的晶粒以框線標出並由 aria-live 念出座標與 bin，Enter 等同點擊、Escape 離開。
          bin 顏色只是輔助：提示框與念出的文字都有 bin 名稱，圖例標出哪些 bin 算良品。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { WaferMap, ChptCodeBlock, ChptSegmented } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

/** 可重現的亂數 */
function seeded(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** 產生一片晶圓：半徑 R 顆的圓內的格子；外圈、刮痕上的不良率較高 */
function makeWafer(seed, R = 16, { scratch = true, edgeLoss = 0.25 } = {}) {
  const rand = seeded(seed)
  const dies = []
  for (let y = -R; y <= R; y++) {
    for (let x = -R; x <= R; x++) {
      const r = Math.hypot(x, y) / R
      if (r > 0.98) continue
      let bin = 1
      const p = rand()
      if (r > 0.85 && p < edgeLoss) bin = 8
      else if (scratch && Math.abs(y - (x * 0.6 - 2)) < 0.6 && x > -10 && x < 8) bin = 3
      else if (p < 0.03) bin = 2
      else if (p < 0.045) bin = 5
      const vth = 0.42 + 0.03 * (1 - r * r) + (rand() - 0.5) * 0.006
      dies.push({ x: x + R, y: y + R, bin, vth: Math.round(vth * 10000) / 10000 })
    }
  }
  return dies
}

const bins = [
  { value: 1, label: 'Pass', color: 'rgb(var(--t-success-solid))', pass: true },
  { value: 2, label: 'Open', color: 'rgb(var(--t-chart-2))' },
  { value: 3, label: 'Short', color: 'rgb(var(--t-chart-4))' },
  { value: 5, label: 'Leakage', color: 'rgb(var(--t-chart-5))' },
  { value: 8, label: 'Edge', color: 'rgb(var(--t-chart-8))' },
]

const wafer = makeWafer(12)
const rings = ref(3)
const hiddenBins = ref([])
const picked = ref(null)

const lot = Array.from({ length: 6 }, (_, i) => ({ id: String(i + 1).padStart(2, '0'), dies: makeWafer(100 + i, 16, { scratch: i === 3, edgeLoss: 0.1 + i * 0.06 }) }))
const lotGrid = { minX: 0, maxX: 32, minY: 0, maxY: 32 }

const panel = (() => {
  const rand = seeded(7)
  const out = []
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 16; x++) {
      const p = rand()
      out.push({ x, y, bin: x > 11 && y < 3 && p < 0.6 ? 'MURA' : p < 0.04 ? 'DOT' : 'OK' })
    }
  return out
})()
const panelBins = [
  { value: 'OK', label: '良品', color: 'rgb(var(--t-success-solid))', pass: true },
  { value: 'MURA', label: 'Mura', color: 'rgb(var(--t-chart-2))' },
  { value: 'DOT', label: '亮點', color: 'rgb(var(--t-chart-5))' },
]

const binCode = `<!-- dies：[{ x: 12, y: 3, bin: 1 }, …] -->
<WaferMap
  v-model:hidden-bins="hiddenBins"
  :data="dies"
  :bins="bins"
  :rings="3"
  title="LOT N2611-07 · Wafer #12"
  auto-resize
  @die-click="(d) => (picked = d)"
/>

const bins = [
  { value: 1, label: 'Pass', color: 'rgb(var(--t-success-solid))', pass: true },
  { value: 3, label: 'Short', color: 'rgb(var(--t-chart-4))' },
  { value: 8, label: 'Edge', color: 'rgb(var(--t-chart-8))' },
]
// 沒寫在 bins 裡的 bin 自動配色；沒寫 pass 時，passBins（預設 1 / PASS / OK…）算良品`

const valueCode = `<!-- dies：[{ x, y, vth: 0.4412 }, …]；多片比較時用 value-domain 固定範圍 -->
<WaferMap
  :data="dies"
  value-field="vth"
  :value-format="(v) => \`\${v.toFixed(3)} V\`"
  :value-domain="[0.40, 0.46]"
/>`

const panelCode = `<WaferMap
  :data="cells"
  :bins="panelBins"
  shape="panel"
  :die-aspect="1.6"
  flip-y
/>`

const propsRows = [
  { name: 'data', type: 'Record<string, unknown>[]', def: '—', desc: '每筆一顆晶粒' },
  { name: 'xField / yField', type: 'string', def: "'x' / 'y'", desc: '行列座標欄位（整數）' },
  { name: 'binField', type: 'string', def: "'bin'", desc: 'bin 欄位' },
  { name: 'valueField', type: 'string', def: '—', desc: '給了就是數值模式：依這個欄位上色' },
  { name: 'keyField', type: 'string', def: '—', desc: '資料鍵欄位（highlightKey 用）；沒有時用索引' },
  { name: 'width / height', type: 'number', def: '360 / 360', desc: '繪圖區大小（不含標題與圖例）' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 100', desc: '跟著容器大小調整（容器需有高度）' },
  { name: 'shape', type: "'wafer' | 'panel'", def: "'wafer'", desc: '外形：圓形晶圓或矩形面板' },
  { name: 'notch', type: "'top' | 'bottom' | 'left' | 'right' | 'none'", def: "'bottom'", desc: '定位缺口的位置（只有晶圓有）' },
  { name: 'flipY', type: 'boolean', def: 'false', desc: 'y 往上增加（第 0 列在最下面）' },
  { name: 'dieAspect', type: 'number', def: '1', desc: '晶粒寬高比（寬 / 高）' },
  { name: 'dieGap', type: 'number', def: '1', desc: '晶粒間隙（像素）；晶粒小於 4px 時自動不留' },
  { name: 'grid', type: 'WaferGrid | null', def: 'null', desc: '固定行列範圍 { minX, maxX, minY, maxY }；多片並排時給同一個' },
  { name: 'bins', type: 'WaferBin[]', def: '[]', desc: '{ value, label?, color, pass? }；資料裡有但沒設定的 bin 自動配色' },
  { name: 'passBins', type: 'Array<string | number>', def: "[1, 'PASS', 'OK', …]", desc: 'bins 沒寫 pass 時，哪些 bin 算良品' },
  { name: 'hiddenBins', type: 'Array<string | number>', def: '—', desc: '淡化的 bin（v-model:hidden-bins）；不給時元件自己記' },
  { name: 'valueDomain', type: '[number, number] | null', def: 'null', desc: '數值模式的色階範圍；不給時依資料' },
  { name: 'valueColors', type: 'string[] | null', def: 'null（viridis）', desc: '數值模式的色階（低 → 高，兩個以上的實際顏色）' },
  { name: 'valueFormat', type: '(v: number) => string', def: '—', desc: '數值的顯示格式（色階兩端、提示框）' },
  { name: 'rings', type: 'number', def: '0', desc: '分成幾圈算分區良率（0 為不分）' },
  { name: 'title', type: 'string', def: "''", desc: '標題（也是圖的名稱）' },
  { name: 'showYield / showLegend', type: 'boolean', def: 'true / true', desc: '顯示良率 / 圖例' },
  { name: 'enableTooltip', type: 'boolean', def: 'true', desc: '滑鼠提示框' },
  { name: 'tooltipFormatter', type: '(info: WaferDieInfo) => string[]', def: '—', desc: '自訂提示框內容（每行一個字串；也是鍵盤移動時念出的內容）' },
  { name: 'highlightKey', type: 'string | number | null', def: 'null', desc: '框出某顆晶粒（對應 keyField）' },
  { name: 'emptyText', type: 'string', def: '語系（繁中「沒有晶粒資料」）', desc: '沒有資料時的文字' },
]
const eventRows = [
  { name: 'die-click', params: '(info: WaferDieInfo)', desc: '點擊（或鍵盤 Enter）一顆晶粒：{ x, y, bin, binLabel, value, pass, datum, index }' },
  { name: 'die-hover', params: '(info: WaferDieInfo | null)', desc: '滑鼠移到晶粒上；離開時為 null' },
  { name: 'update:hiddenBins', params: '(bins: string[])', desc: '點圖例淡化 / 恢復' },
]
const methodRows = [
  { name: 'summary()', type: '() => YieldSummary', desc: '{ total, pass, yield, counts }' },
  { name: 'redraw()', type: '() => void', desc: '重新繪製' },
]
</script>
