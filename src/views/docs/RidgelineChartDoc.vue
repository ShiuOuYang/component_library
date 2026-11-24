<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">RidgelineChart 山脊圖</h1>
        <p class="text-lg text-content-secondary">
          比較很多組的分佈形狀：各機台 / 各班 / 各批的量測值、每天的週期時間。每組一條核密度曲線，上下錯開並部分重疊，
          哪組偏移、變寬、出現雙峰一眼看出來。比一張張直方圖或一排箱型圖更省空間。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section id="spec" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">各機台量測值與規格</h2>
        <p class="text-sm text-content-secondary mb-4">
          10 台印刷機的錫膏厚度（μm），規格 100 – 160、目標 130。曲線內的白色實線是中位數、虛線是 Q1 / Q3；
          右側紅字是規格外比例。可以看出 P-07 整體偏高、P-04 有兩個峰（兩種刮刀壓力混用）、P-09 變異大。
          <code>normalize="shared"</code> 時各組共用高度比例，集中的組會比較高。
        </p>
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <ChptSegmented v-model="sort" :options="sortOptions" aria-label="排序" size="xs" />
          <ChptSegmented v-model="normalize" :options="normalizeOptions" aria-label="高度比例" size="xs" />
          <ChptSegmented v-model="overlap" :options="overlapOptions" aria-label="重疊" size="xs" />
        </div>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <RidgelineChart
            :series="machines"
            title="錫膏厚度（各印刷機，最近 500 片）"
            unit="μm"
            :spec="{ lsl: 100, usl: 160, target: 130 }"
            :sort="sort"
            :normalize="normalize"
            :overlap="overlap"
            :auto-resize="true"
            @group-click="(g) => (log = `${g.name}：平均 ${g.stats?.mean.toFixed(1)} μm`)"
          />
          <p class="mt-2 text-xs text-content-secondary" aria-live="polite">{{ log || '（點一組）' }}</p>
        </div>
        <ChptCodeBlock class="mt-4" :code="specCode" />
      </section>

      <section id="daily" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">每天的週期時間</h2>
        <p class="text-sm text-content-secondary mb-4">
          依時間排列的組別（例如每天）用單一顏色（<code>color</code>）比較清楚，看分佈怎麼隨時間移動。
          這條線換新治具後（第 8 天起）週期時間明顯縮短、也更穩定。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <RidgelineChart :series="days" title="組裝站週期時間（秒）" unit="秒" color="rgb(var(--t-chart-2))" :row-height="24" :overlap="1.6" :auto-resize="true" />
        </div>
        <ChptCodeBlock class="mt-4" :code="dailyCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="RidgelineChart" title="Props" :rows="props" />
        <ApiTable of="-" title="資料格式" :rows="dataRows" />
        <ApiTable of="RidgelineChart" title="Events" :rows="events" />
        <ApiTable of="RidgelineChart" title="方法（ref）" :rows="methods" />
        <p class="text-sm text-content-secondary mt-4">
          <strong>注意：</strong>密度曲線是用高斯核估計的平滑曲線，資料很少（例如 &lt; 10 筆）時形狀參考價值有限，tooltip 會列出 n。
          頻寬預設用 Silverman 經驗法則；多峰的資料可以改小一點（<code>bandwidth</code> 給數字）讓峰分開。
          四分位數算法與箱型圖相同（<code>quartile-method</code>）。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptCodeBlock, ChptSegmented, RidgelineChart } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

// 決定性的常態亂數
function normals(seed, n, mean, sd) {
  let s = seed
  const u = () => ((s = (s * 1103515245 + 12345) % 2147483648) + 1) / 2147483649
  return Array.from({ length: n }, () => mean + sd * Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u()))
}
const machines = [
  { name: 'P-01', values: normals(1, 500, 130, 7) },
  { name: 'P-02', values: normals(2, 500, 128, 6) },
  { name: 'P-03', values: normals(3, 500, 133, 8) },
  { name: 'P-04', values: [...normals(4, 260, 118, 5), ...normals(44, 240, 142, 5)] },
  { name: 'P-05', values: normals(5, 500, 131, 6.5) },
  { name: 'P-06', values: normals(6, 500, 126, 7.5) },
  { name: 'P-07', values: normals(7, 500, 149, 7) },
  { name: 'P-08', values: normals(8, 500, 129, 5.5) },
  { name: 'P-09', values: normals(9, 500, 131, 15) },
  { name: 'P-10', values: normals(10, 500, 135, 6) },
]
const sort = ref('none')
const normalize = ref('each')
const overlap = ref(1)
const log = ref('')
const sortOptions = [
  { label: '原順序', value: 'none' },
  { label: '中位數', value: 'median' },
  { label: '標準差', value: 'sd' },
  { label: '名稱', value: 'name' },
]
const normalizeOptions = [
  { label: '各自同高', value: 'each' },
  { label: '共用比例', value: 'shared' },
]
const overlapOptions = [
  { label: '不重疊', value: 0 },
  { label: '重疊 0.6', value: 0.6 },
  { label: '重疊 1', value: 1 },
]
const specCode = `<RidgelineChart
  :series="[{ name: 'P-01', values: [128.4, 131.2, …] }, { name: 'P-02', values: […] }, …]"
  unit="μm"
  :spec="{ lsl: 100, usl: 160, target: 130 }"
  sort="median" normalize="each" :overlap="1" auto-resize
  @group-click="(g) => openMachine(g.name)"
/>`

const days = Array.from({ length: 14 }, (_, d) => ({
  name: `11/${String(d + 10).padStart(2, '0')}`,
  values: d < 7 ? normals(100 + d, 300, 48 + d * 0.4, 4.5) : normals(100 + d, 300, 41 - (d - 7) * 0.2, 2.2),
}))
const dailyCode = `<RidgelineChart :series="days" unit="秒" color="rgb(var(--t-chart-2))" :row-height="24" :overlap="1.6" auto-resize />`

const props = [
  { name: 'series', type: 'RidgelineSeries[]', def: '—', desc: '{ name, values, color? }；values 裡的 null、NaN 會略過' },
  { name: 'width / height', type: 'number', def: '720 / 0', desc: '尺寸；height 0 = 依組數自動（rowHeight × 組數）' },
  { name: 'rowHeight', type: 'number', def: '36', desc: '每組佔的高度（px）' },
  { name: 'overlap', type: 'number', def: '1', desc: '曲線最高可以伸進上面幾列（0 = 不重疊）' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 100', desc: '寬度跟著容器（height > 0 時高度也跟著）／防抖毫秒' },
  { name: 'title / unit', type: 'string', def: "''", desc: '標題／單位' },
  { name: 'valueFormat', type: '(v: number) => string', def: '千分位、5 位有效數字', desc: '數值格式' },
  { name: 'bandwidth', type: "number | 'silverman' | 'scott'", def: "'silverman'", desc: '核密度的頻寬（越小曲線越細碎）' },
  { name: 'resolution', type: 'number', def: '120', desc: '曲線的取樣點數' },
  { name: 'domain', type: '[number, number] | null', def: 'null', desc: 'X 範圍；不給時依資料與規格' },
  { name: 'sort', type: "'none' | 'median' | 'mean' | 'sd' | 'name'", def: "'none'", desc: '排序；沒有資料的組在最後' },
  { name: 'sortDescending', type: 'boolean', def: 'true', desc: '由大到小（name 為 A → Z）；false 反過來' },
  { name: 'normalize', type: "'each' | 'shared'", def: "'each'", desc: '每組最高點同高（比形狀）／共用比例（比集中程度）' },
  { name: 'showQuartiles', type: 'boolean', def: 'true', desc: '曲線內畫中位數（實線）與 Q1 / Q3（虛線）' },
  { name: 'spec', type: '{ lsl?, usl?, target? } | null', def: 'null', desc: '規格線；有 LSL / USL 時右側列出每組規格外比例' },
  { name: 'color', type: 'string | null', def: 'null', desc: '所有組用同一個顏色（不給時依序用類別色）' },
  { name: 'fillOpacity', type: 'number', def: '0.75', desc: '曲線填色的不透明度' },
  { name: 'quartileMethod', type: "'inclusive' | 'exclusive'", def: "'inclusive'", desc: '四分位數算法（與箱型圖相同）' },
  { name: 'emptyText', type: 'string', def: '語系', desc: '沒有任何組時的文字' },
]
const dataRows = [
  { name: 'RidgelineSeries', type: '{ name, values, color? }', def: '—', desc: '一組資料' },
  { name: 'RidgelineGroup', type: '{ name, stats, bandwidth, density, peak, belowLsl, aboveUsl, … }', def: '—', desc: 'stats：n、mean、sd、min、q1、median、q3、max…（與箱型圖相同）' },
]
const events = [
  { name: 'group-click', params: '(group: RidgelineGroup)', desc: '點擊或 Enter 一組' },
  { name: 'chart-resize', params: '({ width, height })', desc: 'autoResize 時尺寸改變' },
]
const methods = [
  { name: 'groups()', type: '() => RidgelineGroup[]', desc: '排序後的各組（統計、密度、規格外比例）' },
  { name: 'grid()', type: '() => number[]', desc: '密度的取樣格點' },
]
</script>
