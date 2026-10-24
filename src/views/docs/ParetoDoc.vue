<template>
  <div class="min-h-screen bg-surface-secondary p-8">
    <div class="max-w-6xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">EnterprisePareto 柏拉圖</h1>
        <p class="text-lg text-content-secondary">
          長條圖＋累積百分比折線，自動降冪排序、支援 80/20 參考線與「其他」閾值收斂。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library/charts</code> 匯入。
        </p>
      </div>

      <section class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">基本示範</h2>
        <p class="text-sm text-content-secondary mb-4">
          data 為 <code>{ category, value }</code>；autoSort 降冪、顯示累積曲線與 80% 參考線。
        </p>
        <EnterprisePareto
          :data="defectData"
          :width="880"
          :height="500"
          title="缺陷柏拉圖分析"
          x-axis-label="缺陷類型"
          y-axis-left-label="數量"
          :bar-color="'#2563eb'"
          :reference-line-color="'#dc2626'"
          :reference-line-percent="80"
          :show-values-on-bars="true"
        />
        <div class="mt-4">
          <ChptCodeBlock
            language="html"
            code='<EnterprisePareto :data="rows" title="缺陷分析" />'
          />
        </div>
      </section>

      <section class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">EnterprisePareto API</h2>
        <ApiTable of="EnterprisePareto" title="資料與尺寸 Props" :rows="dataProps" />
        <ApiTable of="EnterprisePareto" title="座標軸 Props" :rows="axisProps" />
        <ApiTable of="EnterprisePareto" title="長條、累積線與參考線 Props" :rows="seriesProps" />
        <ApiTable of="EnterprisePareto" title="其他 Props" :rows="otherProps" />
        <ApiTable of="EnterprisePareto" title="Events / Slots" :rows="eventRows" />
      </section>

      <section class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">ParetoChart（簡易版）</h2>
        <p class="text-sm text-content-secondary mb-4">
          較早期的柏拉圖，內建統計資訊卡與載入／空狀態，輸入格式是 <code>{ name, count }</code>。
          新程式建議用上面的 EnterprisePareto。
        </p>
        <ApiTable of="ParetoChart" title="ParetoChart Props / Events" :rows="simpleParetoProps" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { EnterprisePareto } from '@/components/library/charts'
import { ChptCodeBlock } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

const defectData = [
  { category: '刮傷', value: 150 },
  { category: '異色', value: 96 },
  { category: '氣泡', value: 72 },
  { category: '偏移', value: 58 },
  { category: '污漬', value: 31 },
  { category: '其他', value: 22 },
]

const dataProps = [
  { name: 'data', type: 'ChartDatum[]', def: '—', desc: '每列一個類別（必填），例如 { category, value }' },
  { name: 'categoryField / valueField', type: 'string', def: "'category' / 'value'", desc: '欄位名稱映射' },
  { name: 'autoSort / sortOrder', type: "boolean / 'desc' | 'asc' | 'none'", def: "true / 'desc'", desc: '依數值排序；關閉時照傳入順序' },
  { name: 'enableThresholdFilter / otherLabel', type: 'boolean / string', def: "true / 'Other'", desc: '累積超過參考線百分比之後的尾巴併成一筆「其他」' },
  { name: 'width / height', type: 'number', def: '800 / 600', desc: '圖表尺寸（px）；autoResize 時改由容器決定' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 150', desc: '跟著容器大小重畫與重畫延遲（ms）' },
  { name: 'margin', type: 'ChartMargin', def: '{ top: 80, right: 80, bottom: 80, left: 80 }', desc: '繪圖區四周留白' },
  { name: 'title', type: 'string', def: "''", desc: '圖表標題' },
]
const axisProps = [
  { name: 'xAxisLabel / xAxisFormat / xAxisAngle', type: 'string / (v) => string / number', def: "'' / null / -45", desc: 'X 軸標題、刻度格式與文字旋轉角度' },
  { name: 'yAxisLeftLabel / yAxisLeftFormat', type: 'string / (v) => string', def: "'數量' / null", desc: '左軸（數量）標題與格式' },
  { name: 'valueDomain', type: '[min, max] | null', def: 'null', desc: '左軸範圍；null 依資料並多留 10%' },
  { name: 'yAxisRightLabel / yAxisRightFormat', type: 'string / (v) => string', def: "'累積百分比 (%)' / v => `${v}%`", desc: '右軸（累積百分比）標題與格式' },
]
const seriesProps = [
  { name: 'barColor / barHoverColor', type: 'string', def: "'#3b82f6' / '#2563eb'", desc: '長條與滑過時的顏色' },
  { name: 'barPadding', type: 'number', def: '0.2', desc: '長條間距（band 的比例）' },
  { name: 'barBorderRadius / barCornerRadius', type: 'number', def: '2 / null', desc: '長條圓角；barCornerRadius 是別名，有值時優先' },
  { name: 'showValuesOnBars / valueFormat', type: 'boolean / (v) => string', def: 'false / 整數', desc: '在長條上方顯示數值與其格式' },
  { name: 'showCumulativeLine / lineColor / lineWidth', type: 'boolean / string / number', def: "true / '#ef4444' / 2", desc: '累積百分比曲線' },
  { name: 'showLinePoints / showCumulativePoints', type: 'boolean', def: 'true / null', desc: '曲線上的圓點；showCumulativePoints 是別名，有值時優先' },
  { name: 'pointRadius / pointFillColor', type: 'number / string', def: "4 / '#ef4444'", desc: '圓點大小與顏色' },
  { name: 'showReferenceLine / referenceLinePercent', type: 'boolean / number', def: 'true / 80', desc: '參考線（80/20 法則）與它的百分比' },
  { name: 'referenceLineColor / referenceLineWidth / referenceLineDash', type: 'string / number / number[]', def: "'#10b981' / 2 / [5, 5]", desc: '參考線樣式' },
]
const otherProps = [
  { name: 'enableTooltip', type: 'boolean', def: 'true', desc: '滑過長條顯示提示框（也可用 #tooltip 插槽自訂）' },
  { name: 'animationDuration', type: 'number', def: '500', desc: '轉場動畫時間（ms）' },
]
const eventRows = [
  { name: '@bar-click / @bar-hover', type: '{ event, data, … }', def: '—', desc: '點擊／滑過長條' },
  { name: '@tooltip-show / @tooltip-hide', type: '{ data, position } / —', def: '—', desc: '提示框顯示與隱藏' },
  { name: '@chart-ready', type: '—', def: '—', desc: '第一次畫完（只發一次）' },
  { name: '@chart-resize', type: '{ width, height }', def: '—', desc: 'autoResize 量到新尺寸' },
  { name: '#tooltip', type: 'slot { tooltipData, tooltipVisible }', def: '—', desc: '完全自訂提示框' },
]
const simpleParetoProps = [
  { name: 'paretoInputData', type: '{ name, count }[]', def: '[]', desc: '輸入資料' },
  { name: 'cumulativeThreshold', type: 'number', def: '80', desc: '累積百分比門檻（%）；超過的項目歸為 Other' },
  { name: 'chartWidth / chartHeight', type: 'number', def: '0 / 400', desc: '圖表尺寸；寬度 0 表示跟著容器' },
  { name: 'colorScheme', type: 'string[]', def: '紅、橙、黃、綠、藍…', desc: '長條顏色' },
  { name: 'showStatistics / statisticsTitle', type: 'boolean / string', def: "true / '統計資訊'", desc: '圖表下方的統計資訊卡' },
  { name: 'countLabel / typeLabel / maxLabel', type: 'string', def: "'總數量' / '類型數' / '最大項'", desc: '統計資訊的欄位名稱' },
  { name: 'yAxisLeftLabel / yAxisRightLabel / thresholdLabel', type: 'string', def: "'數量' / '累積百分比' / '閾值'", desc: '座標軸與門檻線標籤' },
  { name: 'loadingText / emptyText', type: 'string', def: "'載入 Pareto 數據...' / '暫無數據'", desc: '載入中與沒有資料時的文字' },
  { name: '@update:paretoData', type: 'event (data)', def: '—', desc: '處理後（排序、累積、歸併 Other）的資料' },
  { name: '@chart-rendered', type: 'event (data)', def: '—', desc: '每次畫完' },
  { name: '@error', type: 'event (error)', def: '—', desc: '計算或繪製失敗' },
]
</script>
