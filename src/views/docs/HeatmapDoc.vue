<template>
  <div class="min-h-screen bg-neutral-50 p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-neutral-900 mb-2">EnterpriseHeatmap 熱力圖</h1>
        <p class="text-lg text-neutral-600">
          D3 企業級熱力圖：自訂色階、Brush 縮放、cell/row/column 高亮與 Tooltip。
          請由 <code class="bg-neutral-100 px-1.5 py-0.5 rounded text-sm">@/components/library/charts</code> 匯入。
        </p>
      </div>

      <!-- 基本示範 -->
      <section class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-2">基本示範</h2>
        <p class="text-sm text-neutral-600 mb-4">
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
      <section class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-2">自訂色階與高亮模式</h2>
        <p class="text-sm text-neutral-600 mb-4">
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
          <ChptCodeBlock
            language="html"
            code='<EnterpriseHeatmap :data="rows" :color-range="[\'#16a34a\',\'#eab308\',\'#dc2626\']" highlight-mode="both" show-cell-values />'
          />
        </div>
      </section>

      <!-- Props -->
      <section class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-4">常用 Props</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-neutral-100">
              <tr>
                <th class="px-4 py-2 text-left font-semibold">屬性</th>
                <th class="px-4 py-2 text-left font-semibold">型別/預設</th>
                <th class="px-4 py-2 text-left font-semibold">說明</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="p in propsList" :key="p.name">
                <td class="px-4 py-3 font-mono text-xs">{{ p.name }}</td>
                <td class="px-4 py-3 font-mono text-xs text-neutral-600">{{ p.def }}</td>
                <td class="px-4 py-3 text-neutral-700">{{ p.desc }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { EnterpriseHeatmap } from '@/components/library/charts'
import { ChptCodeBlock } from '@/components/library'

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

const propsList = [
  { name: 'data', def: 'Array (必填)', desc: '{ x, y, value } 資料點陣列' },
  { name: 'xField/yField/valueField', def: 'String', desc: '欄位名稱映射（預設 x/y/value）' },
  { name: 'xDomain/yDomain', def: 'Array|null', desc: '自訂座標順序，null 自動依資料' },
  { name: 'colorScheme', def: "'interpolateRdYlGn'", desc: 'D3 內建色階名（interpolate*/scheme*）' },
  { name: 'colorRange', def: 'Array|null', desc: '自訂色階 [起,中,終]，優先於 colorScheme' },
  { name: 'valueDomain', def: '[min,max]|null', desc: '數值範圍，null 自動計算' },
  { name: 'showCellValues', def: 'false', desc: '單元格內顯示數值' },
  { name: 'enableBrush', def: 'true', desc: '框選縮放' },
  { name: 'highlightMode', def: "'cell'", desc: 'cell/row/column/both 高亮' },
  { name: 'showColorLegend', def: 'true', desc: '顯示色階圖例' },
  { name: 'autoResize', def: 'false', desc: '依容器自動響應尺寸（ResizeObserver）' },
]
</script>
