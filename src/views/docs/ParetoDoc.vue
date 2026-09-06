<template>
  <div class="min-h-screen bg-neutral-50 p-8">
    <div class="max-w-6xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-neutral-900 mb-2">EnterprisePareto 柏拉圖</h1>
        <p class="text-lg text-neutral-600">
          長條圖＋累積百分比折線，自動降冪排序、支援 80/20 參考線與「其他」閾值收斂。
          請由 <code class="bg-neutral-100 px-1.5 py-0.5 rounded text-sm">@/components/library/charts</code> 匯入。
        </p>
      </div>

      <section class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-2">基本示範</h2>
        <p class="text-sm text-neutral-600 mb-4">
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

      <section class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-2">常用 Props</h2>
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
import { EnterprisePareto } from '@/components/library/charts'
import { ChptCodeBlock } from '@/components/library'

const defectData = [
  { category: '刮傷', value: 150 },
  { category: '異色', value: 96 },
  { category: '氣泡', value: 72 },
  { category: '偏移', value: 58 },
  { category: '污漬', value: 31 },
  { category: '其他', value: 22 },
]

const propsList = [
  { name: 'data', def: 'Array (必填)', desc: '{ category, value } 資料點陣列' },
  { name: 'categoryField/valueField', def: 'String', desc: '欄位映射（預設 category/value）' },
  { name: 'autoSort/sortOrder', def: 'true / desc', desc: '自動排序與順序（desc/asc/none）' },
  { name: 'barColor', def: "'#3b82f6'", desc: '長條顏色' },
  { name: 'showCumulativeLine', def: 'true', desc: '顯示累積百分比折線' },
  { name: 'showReferenceLine', def: 'true', desc: '顯示參考線（預設 80%）' },
  { name: 'referenceLinePercent', def: '80', desc: '參考線累積門檻' },
  { name: 'enableThresholdFilter', def: 'true', desc: '將超過閾值的尾項收斂為 Other' },
  { name: 'showValuesOnBars', def: 'false', desc: '長條上顯示數值' },
]
</script>
