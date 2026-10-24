<template>
  <div class="min-h-screen bg-surface-secondary p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">EnterpriseHeatmap 熱力圖</h1>
        <p class="text-lg text-content-secondary">
          D3 企業級熱力圖：自訂色階、Brush 縮放、cell/row/column 高亮與 Tooltip。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library/charts</code> 匯入。
        </p>
      </div>

      <!-- 基本示範 -->
      <section class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">基本示範</h2>
        <p class="text-sm text-content-secondary mb-4">
          data 為 <code>{ x, y, value }</code> 陣列；開啟 showCellValues 顯示數值，enableBrush 可框選縮放。
        </p>
        <EnterpriseHeatmap
          :data="matrixData"
          :width="860"
          :height="460"
          title="各站每週良率（%）"
          x-axis-label="週次"
          y-axis-label="工作站"
          :enable-brush="true"
          :highlight-mode="'cell'"
          :show-cell-values="false"
        />
        <div class="mt-4">
          <ChptCodeBlock
            language="html"
            code='<EnterpriseHeatmap :data="rows" :width="860" :height="460" title="良率" />'
          />
        </div>
      </section>

      <!-- 自訂色階 / 高亮 -->
      <section class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">自訂色階與高亮模式</h2>
        <p class="text-sm text-content-secondary mb-4">
          colorRange 可指定 [起, 中, 終] 自訂色；highlightMode 支援 cell / row / column / both。
        </p>
        <EnterpriseHeatmap
          :data="matrixData"
          :width="860"
          :height="460"
          title="客製色階（綠→黃→紅）"
          :color-range="['#16a34a', '#eab308', '#dc2626']"
          :highlight-mode="'both'"
          :show-cell-values="true"
          :value-domain="[0, 100]"
        />
        <div class="mt-4">
          <ChptCodeBlock language="html" :code="colorRangeSnippet" />
        </div>
      </section>

      <!-- Props -->
      <section class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">Props</h2>
        <ApiTable of="EnterpriseHeatmap" title="資料與尺寸 Props" :rows="dataProps" />
        <ApiTable of="EnterpriseHeatmap" title="座標軸 Props" :rows="axisProps" />
        <ApiTable of="EnterpriseHeatmap" title="色階與格子 Props" :rows="colorProps" />
        <ApiTable of="EnterpriseHeatmap" title="外觀與互動 Props" :rows="interactionProps" />
      </section>

      <!-- Events -->
      <section class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">事件</h2>
        <ApiTable of="EnterpriseHeatmap" title="Events" :rows="eventsList" />
      </section>
    </div>
  </div>
</template>

<script setup>

/**
 * 給 ChptCodeBlock 顯示用的範例片段。
 * 放在 script 而非直接寫在 HTML 屬性裡 —— HTML 屬性沒有 \' 這種跳脫，
 * 單引號屬性會在第一個 ' 就被截斷。
 */
const colorRangeSnippet =
  `<EnterpriseHeatmap :data="rows" :color-range="['#16a34a','#eab308','#dc2626']" highlight-mode="both" show-cell-values />`
import { computed } from 'vue'
import { EnterpriseHeatmap } from '@/components/library/charts'
import { ChptCodeBlock } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

const eventsList = [
  { name: 'cell-click / cell-hover', params: '{ event, data, … }', desc: '點擊／滑過格子' },
  { name: 'tooltip-show / tooltip-hide', params: '{ data, position } / —', desc: '提示框顯示與隱藏' },
  { name: 'chart-ready', params: '—', desc: '第一次畫完（只發一次）' },
  { name: 'chart-rendered', params: '—', desc: '每次畫完；資料、尺寸、範圍改變後的重畫都會發' },
  { name: 'chart-resize', params: '{ width, height }', desc: 'autoResize 量到新尺寸' },
  { name: 'selection-change / zoom-reset', params: '{ xDomain, yDomain } / —', desc: 'Brush 框選結束／按「重設縮放」' },
]

const stations = ['電鍍站', '蝕刻站', '曝光站', '壓合站', '鑽孔站', '印刷站']
const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8']

const matrixData = computed(() => {
  const rows = []
  weeks.forEach((w, wi) => {
    stations.forEach((s, si) => {
      const base = 82 + ((wi * 7 + si * 3) % 16)
      rows.push({ x: w, y: s, value: base + ((wi + si) % 4) * 0.8 })
    })
  })
  return rows
})

const dataProps = [
  { name: 'data', type: 'HeatmapDatum[]', def: '—', desc: '資料點陣列（必填），每列一格，例如 { x, y, value }' },
  { name: 'xField / yField / valueField', type: 'string', def: "'x' / 'y' / 'value'", desc: '欄位名稱映射' },
  { name: 'width / height', type: 'number', def: '800 / 600', desc: '圖表尺寸（px）；autoResize 時改由容器決定' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 150', desc: '跟著容器大小重畫（容器需有高度）與重畫延遲（ms）' },
  { name: 'margin', type: 'ChartMargin', def: '{ top: 80, right: 120, bottom: 80, left: 100 }', desc: '繪圖區四周留白' },
  { name: 'title', type: 'string', def: "''", desc: '圖表標題' },
]
const axisProps = [
  { name: 'xDomain / yDomain', type: '(string | number)[] | null', def: 'null', desc: '自訂座標順序；null 依資料出現的順序' },
  { name: 'xAxisLabel / yAxisLabel', type: 'string', def: "''", desc: '座標軸標題' },
  { name: 'xAxisFormat / yAxisFormat', type: '(v: string) => string', def: 'null', desc: '刻度文字格式' },
  { name: 'xAxisAngle', type: 'number', def: '-45', desc: 'X 軸刻度文字旋轉角度（度）' },
]
const colorProps = [
  { name: 'colorScheme', type: 'string', def: "'interpolateRdYlGn'", desc: 'D3 內建色階名稱（interpolate* / scheme*）' },
  { name: 'colorRange', type: 'string[] | null', def: 'null', desc: '自訂色階顏色，例如 [低, 中, 高]；優先於 colorScheme' },
  { name: 'valueDomain', type: '[min, max] | null', def: 'null', desc: '數值範圍；null 依資料計算' },
  { name: 'reverseColorScale', type: 'boolean', def: 'false', desc: '反轉色階（高值冷色、低值暖色）' },
  { name: 'cellPadding / cellBorderRadius', type: 'number', def: '2 / 2', desc: '格子間距與圓角（px）' },
  { name: 'cellBorderWidth / cellBorderColor', type: 'number / string', def: '1 / 圖表底色', desc: '格子邊框；預設用圖表底色，深色模式下不會是一格格白框' },
  { name: 'showCellValues / cellValueFormat', type: 'boolean / (v: number) => string', def: 'false / 小數 1 位', desc: '在格子內顯示數值與其格式' },
  { name: 'missingValueColor / showMissingValues', type: 'string / boolean', def: '圖表淡底色 / true', desc: '沒有資料的格子顏色、是否畫出來' },
  { name: 'showColorLegend / colorLegendPosition / colorLegendTitle', type: "boolean / 'right' | 'bottom' / string", def: "true / 'right' / 'Value'", desc: '色階圖例' },
]
const interactionProps = [
  { name: 'enableBrush', type: 'boolean', def: 'true', desc: '框選縮放；縮放後出現「重設縮放」' },
  { name: 'enableTooltip', type: 'boolean', def: 'true', desc: '滑過格子時顯示提示框（也可用 #tooltip 插槽自訂）' },
  { name: 'highlightMode', type: "'cell' | 'row' | 'column' | 'both'", def: "'cell'", desc: '滑過時高亮格子、整列、整欄或十字' },
  { name: 'animationDuration', type: 'number', def: '500', desc: '轉場動畫時間（ms）' },
  { name: 'customRenderers', type: '{ cell?(selection, data, colorScale) }', def: '{}', desc: '自訂格子的繪製方式' },
]
</script>
