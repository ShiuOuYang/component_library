<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">MarimekkoChart 馬賽克圖</h1>
        <p class="text-lg text-content-secondary">
          兩個維度的組成：欄寬是各欄的總量（例如各產線的不良數），欄內高度是各類別的比例（例如不良類型）。
          寬的欄量大、同一種顏色在各欄高低不同就是組成不同；切到殘差模式，紅色的格子就是「這條線的這種不良特別多」。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section id="defects" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">各線不良類型組成</h2>
        <p class="text-sm text-content-secondary mb-4">
          本月 6 條 SMT 線的 AOI 不良。SMT 3 的不良數最多（欄最寬），而且錫橋占了快一半；切到「殘差」可以看到 SMT 3 錫橋、SMT 5 偏移是紅色（比預期多）。
          點圖例標示一種不良；點格子會送出 <code>cell-click</code>（例如帶出那幾片的 AOI 影像）。
        </p>
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <ChptSegmented v-model="mode" :options="modeOptions" aria-label="上色" size="xs" />
          <ChptSegmented v-model="sortColumns" :options="sortOptions" aria-label="欄排序" size="xs" />
          <span class="text-xs text-content-secondary">標示：{{ selected ?? '（無）' }}；點選：{{ clicked || '（無）' }}</span>
        </div>
        <div class="bg-surface-secondary rounded-xl p-3 sm:p-4 border border-stroke-light">
          <MarimekkoChart
            v-model:selected="selected"
            :data="defects"
            :mode="mode"
            :sort-columns="sortColumns"
            sort-segments="total"
            unit="件"
            title="AOI 不良（11 月）"
            :auto-resize="true"
            @cell-click="(c) => (clicked = `${c.x} ${c.y} ${c.value} 件`)"
          />
        </div>
        <p class="mt-2 text-xs text-content-secondary">卡方 χ² = {{ chi.chi2.toFixed(1) }}（自由度 {{ chi.df }}）—— 越大代表各線的組成越不一樣。</p>
        <ChptCodeBlock class="mt-4" :code="defectCode" />
      </section>

      <section id="returns" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">類別太多：客訴原因併成「其他」</h2>
        <p class="text-sm text-content-secondary mb-4">
          4 個產品系列 × 11 種客訴原因。<code>:max-segments="6"</code> 只保留總量前 5 名，其餘併成「其他」（灰色、固定在最上面）。
        </p>
        <div class="bg-surface-secondary rounded-xl p-3 sm:p-4 border border-stroke-light">
          <MarimekkoChart :data="returns" :max-segments="6" sort-segments="total" sort-columns="total" unit="件" title="客訴原因" :height="300" :auto-resize="true" />
        </div>
        <ChptCodeBlock class="mt-4" :code="returnCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="MarimekkoChart" title="Props" :rows="props" />
        <ApiTable of="-" title="資料格式" :rows="dataRows" />
        <ApiTable of="MarimekkoChart" title="Events" :rows="events" />
        <ApiTable of="MarimekkoChart" title="方法（ref）" :rows="methods" />
        <p class="text-sm text-content-secondary mt-4">
          <strong>殘差：</strong>每格的期望值 = 欄總量 × 類別總量 ÷ 全部（假設各欄組成一樣），Pearson 殘差 = (觀察 − 期望) ÷ √期望；
          絕對值大於 2 左右就值得看一下。<code>mekkoChiSquare()</code> 給整體的卡方值與自由度。
        </p>
        <p class="text-sm text-content-secondary mt-2">
          <strong>注意：</strong>欄太窄（小於 24px）時不顯示欄名、格子太小時不顯示百分比，可以從 tooltip 或鍵盤讀出。
          負值與 0 會略過。類別超過 8 個時建議用 <code>max-segments</code> 併成「其他」。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { MarimekkoChart, ChptCodeBlock, ChptSegmented, buildMekko, mekkoChiSquare } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

const lines = ['SMT 1', 'SMT 2', 'SMT 3', 'SMT 4', 'SMT 5', 'SMT 6']
const types = ['錫橋', '空焊', '偏移', '立碑', '缺件', '極性反']
const base = [
  [22, 30, 18, 9, 7, 3],
  [25, 28, 20, 11, 9, 2],
  [96, 34, 22, 12, 10, 4],
  [14, 19, 12, 6, 5, 1],
  [20, 22, 48, 8, 9, 3],
  [9, 12, 8, 4, 3, 1],
]
const defects = lines.flatMap((x, i) => types.map((y, j) => ({ x, y, value: base[i][j] })))
const chi = computed(() => mekkoChiSquare(buildMekko(defects)))
const families = ['電源模組', '控制板', 'LED 驅動', '感測器']
const reasons = ['外觀刮傷', '功能失效', '包裝破損', '標籤錯誤', '數量短少', '尺寸不符', '異音', '過熱', '連接器鬆脫', '韌體版本', '文件缺漏']
const returns = families.flatMap((x, i) => reasons.map((y, j) => ({ x, y, value: Math.max(1, Math.round(((i + 2) * (11 - j) * (1 + ((i * 7 + j * 3) % 5) / 4)) / 2)) })))

const mode = ref('share')
const modeOptions = [
  { label: '組成', value: 'share' },
  { label: '殘差', value: 'residual' },
]
const sortColumns = ref('input')
const sortOptions = [
  { label: '照順序', value: 'input' },
  { label: '依總量', value: 'total' },
]
const selected = ref(null)
const clicked = ref('')

const defectCode = `<MarimekkoChart
  v-model:selected="highlight"
  :data="[{ x: 'SMT 1', y: '錫橋', value: 22 }, { x: 'SMT 1', y: '空焊', value: 30 }, …]"
  mode="share"            // 或 'residual'：依 Pearson 殘差上色
  sort-segments="total"
  unit="件"
  auto-resize
  @cell-click="({ x, y, value }) => openAoiImages(x, y)"
/>`
const returnCode = `<MarimekkoChart :data="returns" :max-segments="6" sort-segments="total" sort-columns="total" />`

const props = [
  { name: 'data', type: 'MekkoInput[]', def: '—', desc: '{ x: 欄, y: 類別, value }；同一格多筆會加總，負值與 0 略過' },
  { name: 'mode', type: "'share' | 'residual'", def: "'share'", desc: '依類別上色／依 Pearson 殘差上色（紅多藍少）' },
  { name: 'sortColumns / sortSegments', type: "'input' | 'total'", def: "'input'", desc: '欄與類別的排序：照資料順序或總量由大到小' },
  { name: 'maxSegments', type: 'number', def: '8', desc: '最多幾個類別，其餘併成「其他」' },
  { name: 'selected', type: 'string | null', def: 'null', desc: '標示的類別（v-model:selected），其他類別淡化' },
  { name: 'residualMax', type: 'number', def: '4', desc: '殘差色階的上限' },
  { name: 'colors', type: 'string[] | null', def: '類別色', desc: '自訂類別顏色' },
  { name: 'width / height', type: 'number', def: '720 / 360', desc: '尺寸' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 100', desc: '寬度跟著容器／防抖毫秒' },
  { name: 'title / unit', type: 'string', def: "''", desc: '標題／數量單位' },
  { name: 'valueFormat', type: '(v: number) => string', def: '千分位', desc: '數量格式' },
  { name: 'emptyText', type: 'string', def: '語系', desc: '沒有資料時的文字' },
]
const dataRows = [
  { name: 'MekkoCell', type: '{ x, y, value, share, shareTotal, expected, residual }', def: '—', desc: 'share = 欄內比例、shareTotal = 占全部比例' },
  { name: 'MekkoData', type: '{ columns, segments, segmentTotals, total, folded }', def: '—', desc: 'buildMekko() 與 ref.result() 的回傳值；folded 為被併成「其他」的類別' },
]
const events = [
  { name: 'update:selected', params: '(segment: string | null)', desc: '點圖例標示／取消（Esc 取消）' },
  { name: 'cell-click', params: '(cell: MekkoCell)', desc: '點一格（或鍵盤 Enter）' },
  { name: 'chart-resize', params: '({ width, height })', desc: 'autoResize 時尺寸改變' },
]
const methods = [{ name: 'result()', type: '() => MekkoData', desc: '欄、類別、各格的值、比例與殘差' }]
</script>
