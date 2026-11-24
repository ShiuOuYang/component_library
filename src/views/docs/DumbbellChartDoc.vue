<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">DumbbellChart 啞鈴圖 / 斜率圖</h1>
        <p class="text-lg text-content-secondary">
          每個項目「前 vs 後」：改善前後的不良率、上月與本月的產能、目標與實際。空心點是前、實心點是後，中間的線就是變化；
          依 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">direction</code> 判斷變好（綠 ▲）或變差（紅 ▼）。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section id="kaizen" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">改善前後</h2>
        <p class="text-sm text-content-secondary mb-4">
          各工站導入防錯治具前後的不良率（ppm，<code>direction="lower"</code>：越小越好）。依變化量排序時改善最多的在最上面；
          虛線是目標 500 ppm。右側變化欄可切換數值或百分比。滑過一列看前、後、變化量；鍵盤 Tab 進入後 ↑↓ 移動。
        </p>
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <ChptSegmented v-model="kSort" :options="sortOptions" aria-label="排序" size="xs" />
          <ChptSegmented v-model="kChange" :options="changeOptions" aria-label="變化欄" size="xs" />
        </div>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <DumbbellChart
            :data="kaizen"
            title="防錯治具導入前後不良率"
            before-label="導入前"
            after-label="導入後"
            direction="lower"
            unit="ppm"
            :sort="kSort"
            :show-change="kChange"
            :reference="500"
            reference-label="目標 500"
            :include-zero="true"
            :auto-resize="true"
            @item-click="(r) => (kLog = `${r.label}：${r.before} → ${r.after} ppm`)"
          />
          <p class="mt-2 text-xs text-content-secondary" aria-live="polite">{{ kLog || '（點一列）' }}</p>
        </div>
        <ChptCodeBlock class="mt-4" :code="kaizenCode" />
      </section>

      <section id="slope" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">斜率圖</h2>
        <p class="text-sm text-content-secondary mb-4">
          <code>mode="slope"</code>：左右兩條軸，每個項目一條線，適合看排名交錯與整體趨勢。兩側名稱會自動避開重疊。
          這裡是上月與本月各線的 OEE（越大越好）。
        </p>
        <div class="mb-3">
          <ChptSegmented v-model="sMode" :options="modeOptions" aria-label="圖形" size="xs" />
        </div>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <DumbbellChart
            :data="oee"
            title="各線 OEE"
            before-label="10 月"
            after-label="11 月"
            unit="%"
            :mode="sMode"
            :height="sMode === 'slope' ? 380 : 0"
            :tolerance="0.5"
            sort="after"
            :auto-resize="true"
          />
        </div>
        <ChptCodeBlock class="mt-4" :code="slopeCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="DumbbellChart" title="Props" :rows="props" />
        <ApiTable of="-" title="資料格式" :rows="dataRows" />
        <ApiTable of="DumbbellChart" title="Events" :rows="events" />
        <ApiTable of="DumbbellChart" title="方法（ref）" :rows="methods" />
        <p class="text-sm text-content-secondary mt-4">
          <strong>注意：</strong>好壞不只靠顏色：變化欄與 tooltip 都有 ▲ / ▼ 與文字。缺前值或後值的項目只畫有的那一點，排序時放最後。
          <code>direction="none"</code> 時不判斷好壞（例如兩條線的比較），線與點用同一個顏色，也可以每列指定 <code>color</code>。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptCodeBlock, ChptSegmented, DumbbellChart } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

const kaizen = [
  { label: '錫膏印刷', before: 1850, after: 620 },
  { label: '貼片（細間距）', before: 1420, after: 980 },
  { label: '迴焊', before: 760, after: 410 },
  { label: '波焊', before: 2300, after: 1150 },
  { label: '手焊', before: 980, after: 1040 },
  { label: '分板', before: 540, after: 260 },
  { label: '組裝鎖附', before: 880, after: 870 },
  { label: '包裝', before: 120, after: 90 },
  { label: '燒錄', before: 300, after: null },
]
const kSort = ref('change')
const kChange = ref('value')
const kLog = ref('')
const sortOptions = [
  { label: '原順序', value: 'none' },
  { label: '改善量', value: 'change' },
  { label: '導入前', value: 'before' },
  { label: '名稱', value: 'label' },
]
const changeOptions = [
  { label: '變化量', value: 'value' },
  { label: '百分比', value: 'percent' },
  { label: '不顯示', value: 'none' },
]
const kaizenCode = `<DumbbellChart
  :data="[{ label: '錫膏印刷', before: 1850, after: 620 }, { label: '手焊', before: 980, after: 1040 }, …]"
  before-label="導入前" after-label="導入後"
  direction="lower" unit="ppm" sort="change" show-change="value"
  :reference="500" reference-label="目標 500" include-zero auto-resize
/>`

const oee = [
  { label: 'SMT 1', before: 78.2, after: 82.5 },
  { label: 'SMT 2', before: 81.0, after: 79.4 },
  { label: 'SMT 3', before: 69.5, after: 76.1 },
  { label: 'SMT 4', before: 84.3, after: 84.6 },
  { label: 'DIP 1', before: 72.8, after: 70.2 },
  { label: 'DIP 2', before: 66.0, after: 71.9 },
  { label: '組裝 A', before: 75.4, after: 80.8 },
  { label: '組裝 B', before: 79.9, after: 77.3 },
]
const sMode = ref('slope')
const modeOptions = [
  { label: '斜率圖', value: 'slope' },
  { label: '啞鈴圖', value: 'dumbbell' },
]
const slopeCode = `<DumbbellChart :data="oee" mode="slope" before-label="10 月" after-label="11 月" unit="%" :tolerance="0.5" :height="380" auto-resize />
// tolerance：變化在 ±0.5 以內算持平`

const props = [
  { name: 'data', type: 'DumbbellDatum[]', def: '—', desc: '{ label, before, after, color? }；缺值時只畫有的那一點' },
  { name: 'beforeLabel / afterLabel', type: 'string', def: '語系（前 / 後）', desc: '圖例、斜率圖軸上與 tooltip 的名稱' },
  { name: 'direction', type: "'higher' | 'lower' | 'none'", def: "'higher'", desc: '越大越好 / 越小越好 / 不判斷好壞' },
  { name: 'tolerance', type: 'number', def: '0', desc: '變化量的絕對值不超過它算持平' },
  { name: 'sort', type: "'none' | 'change' | 'absChange' | 'before' | 'after' | 'label'", def: "'none'", desc: '排序：change = 改善最多的在上' },
  { name: 'sortDescending', type: 'boolean', def: 'true', desc: 'false 時反過來（缺值仍在最後）' },
  { name: 'mode', type: "'dumbbell' | 'slope'", def: "'dumbbell'", desc: '啞鈴圖或斜率圖' },
  { name: 'width / height', type: 'number', def: '640 / 0', desc: '尺寸；height 0 = 依列數自動' },
  { name: 'rowHeight', type: 'number', def: '28', desc: '啞鈴圖自動高度時每列的高度' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 100', desc: '寬度跟著容器（height > 0 時高度也跟著）／防抖毫秒' },
  { name: 'title / unit', type: 'string', def: "''", desc: '標題／單位' },
  { name: 'valueFormat', type: '(v: number) => string', def: '千分位', desc: '數值格式' },
  { name: 'showValues', type: 'boolean', def: 'true', desc: '點旁邊顯示數值' },
  { name: 'showChange', type: "'value' | 'percent' | 'none'", def: "'value'", desc: '啞鈴圖右側的變化欄' },
  { name: 'reference / referenceLabel', type: 'number | null / string', def: 'null / 數值', desc: '參考線（例如目標）與標籤' },
  { name: 'domain', type: '[number, number] | null', def: 'null', desc: '數值範圍；不給時依資料與參考線' },
  { name: 'includeZero', type: 'boolean', def: 'false', desc: '範圍包含 0' },
  { name: 'emptyText', type: 'string', def: '語系', desc: '沒有資料時的文字' },
]
const dataRows = [
  { name: 'DumbbellDatum', type: '{ label, before, after, color? }', def: '—', desc: 'before / after 為數字、null 或 undefined；color 覆蓋後值的顏色' },
  { name: 'DumbbellRow', type: '{ label, before, after, delta, pct, status, index }', def: '—', desc: "status：'better' | 'worse' | 'same' | 'neutral'" },
]
const events = [
  { name: 'item-click', params: '(row: DumbbellRow)', desc: '點擊或 Enter 一列' },
  { name: 'chart-resize', params: '({ width, height })', desc: 'autoResize 時尺寸改變' },
]
const methods = [
  { name: 'rows()', type: '() => DumbbellRow[]', desc: '排序後的列（含變化量與好壞）' },
  { name: 'summary()', type: '() => DumbbellSummary', desc: '{ better, worse, same, compared, meanDelta }' },
]
</script>
