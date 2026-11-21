<template>
  <div class="min-h-screen bg-surface-secondary p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">SankeyChart 流向圖</h1>
        <p class="text-lg text-content-secondary">
          數量「從哪裡流到哪裡」：投入在各站之間的流向與損失、不良品的處置去向、物料從倉庫到各線。線寬就是數量，大宗流向與漏掉的部分一眼看出來。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <section id="defects" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">不良品去向</h2>
        <p class="text-sm text-content-secondary mb-4">
          各站發現的不良 → 判定 → 處置。欄依流向自動排；滑過一個節點會高亮經過它的所有上下游流向（例如「重工」來自哪些站、最後變成什麼），
          滑過連線看數量與佔來源流出的比例。鍵盤：Tab 進入後 ↑↓ 同一欄、←→ 沿最大流量移動、Enter 點擊。
        </p>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 380px">
            <SankeyChart
              :nodes="defectNodes"
              :links="defectLinks"
              title="11 月不良品去向（片）"
              unit="片"
              :auto-resize="true"
              @node-click="(n) => (clicked = `節點 ${n.label}：${n.value} 片`)"
              @link-click="(l) => (clicked = `${l.source} → ${l.target}：${l.value} 片`)"
            />
          </div>
          <p class="mt-2 text-xs text-content-secondary" aria-live="polite">{{ clicked || '（點一個節點或連線）' }}</p>
        </div>
        <ChptCodeBlock class="mt-4" :code="defectCode" />
      </section>

      <section id="material" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">物料流向與連線顏色</h2>
        <p class="text-sm text-content-secondary mb-4">
          <code>link-color="target"</code> 讓連線跟著去向上色（看「每條線各送了多少到哪裡」）；<code>align="left"</code> 讓沒有後續的節點留在最早能放的欄。
          節點可以指定 <code>color</code>。
        </p>
        <div class="flex flex-wrap items-center gap-3 mb-3">
          <ChptSegmented v-model="linkColor" :options="linkColorOptions" aria-label="連線顏色" size="xs" />
          <ChptSegmented v-model="align" :options="alignOptions" aria-label="對齊" size="xs" />
        </div>
        <div class="bg-surface-secondary rounded-xl p-4 border border-stroke-light">
          <div style="height: 320px">
            <SankeyChart :nodes="materialNodes" :links="materialLinks" unit="kg" :link-color="linkColor" :align="align" :auto-resize="true" />
          </div>
        </div>
        <ChptCodeBlock class="mt-4" :code="materialCode" />
      </section>

      <section id="api" class="bg-surface-primary rounded-lg shadow-sm p-4 sm:p-6 mb-8 scroll-mt-24">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="SankeyChart" title="Props" :rows="props" />
        <ApiTable of="-" title="資料格式" :rows="dataRows" />
        <ApiTable of="SankeyChart" title="Events" :rows="events" />
        <ApiTable of="SankeyChart" title="方法（ref）" :rows="methods" />
        <p class="text-sm text-content-secondary mt-4">
          <strong>注意：</strong>流向圖只能由左往右，有循環的連線（A → B → A）會被略過並以 <code>cycle</code> 事件回報。
          節點的高度是 max(流入, 流出)：兩者不相等時（例如一站有損失），差額就是「漏掉」的部分 —— 想讓它看得見，請加一個「損失」節點。
          圖表附有隱藏的資料表，螢幕閱讀器可以逐條念出流向。
        </p>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChptCodeBlock, ChptSegmented, SankeyChart } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

const clicked = ref('')
const defectNodes = [
  { id: 'smt', label: 'SMT 爐後 AOI' },
  { id: 'ict', label: 'ICT' },
  { id: 'fct', label: 'FCT' },
  { id: 'mrb', label: 'MRB 判定' },
  { id: 'false', label: '誤判（良品）' },
  { id: 'rework', label: '重工' },
  { id: 'scrap', label: '報廢' },
  { id: 'uai', label: '讓步放行' },
  { id: 'pass', label: '重工後良品' },
]
const defectLinks = [
  { source: 'smt', target: 'false', value: 120 },
  { source: 'smt', target: 'mrb', value: 260 },
  { source: 'ict', target: 'mrb', value: 140 },
  { source: 'ict', target: 'false', value: 30 },
  { source: 'fct', target: 'mrb', value: 90 },
  { source: 'mrb', target: 'rework', value: 330 },
  { source: 'mrb', target: 'scrap', value: 110 },
  { source: 'mrb', target: 'uai', value: 50 },
  { source: 'rework', target: 'pass', value: 290 },
  { source: 'rework', target: 'scrap', value: 40 },
]
const defectCode = `<SankeyChart
  :nodes="[{ id: 'smt', label: 'SMT 爐後 AOI' }, { id: 'mrb', label: 'MRB 判定' }, { id: 'rework', label: '重工' }, …]"
  :links="[{ source: 'smt', target: 'mrb', value: 260 }, { source: 'mrb', target: 'rework', value: 330 }, …]"
  title="11 月不良品去向（片）" unit="片" auto-resize
  @node-click="openNode" @link-click="openFlow"
/>`

const materialNodes = [
  { id: 'wh', label: '原料倉', color: 'rgb(var(--t-chart-8))' },
  { id: 'l1', label: 'SMT 一線' },
  { id: 'l2', label: 'SMT 二線' },
  { id: 'l3', label: '手插線' },
  { id: 'used', label: '實際用量' },
  { id: 'loss', label: '損耗', color: 'rgb(var(--t-danger-solid))' },
  { id: 'back', label: '退料' },
]
const materialLinks = [
  { source: 'wh', target: 'l1', value: 42 },
  { source: 'wh', target: 'l2', value: 31 },
  { source: 'wh', target: 'l3', value: 12 },
  { source: 'l1', target: 'used', value: 39 },
  { source: 'l1', target: 'loss', value: 2 },
  { source: 'l1', target: 'back', value: 1 },
  { source: 'l2', target: 'used', value: 28 },
  { source: 'l2', target: 'loss', value: 3 },
  { source: 'l3', target: 'used', value: 11.5 },
  { source: 'l3', target: 'loss', value: 0.5 },
]
const linkColor = ref('target')
const align = ref('justify')
const linkColorOptions = [
  { label: '跟來源', value: 'source' },
  { label: '跟去向', value: 'target' },
  { label: '中性', value: 'neutral' },
]
const alignOptions = [
  { label: 'justify', value: 'justify' },
  { label: 'left', value: 'left' },
]
const materialCode = `<SankeyChart :nodes="nodes" :links="links" unit="kg" link-color="target" align="left" />
// 節點可指定顏色：{ id: 'loss', label: '損耗', color: 'rgb(var(--t-danger-solid))' }`

const props = [
  { name: 'nodes', type: 'SankeyNodeInput[]', def: '—', desc: '{ id, label?, color? }；連線裡出現但沒列的節點會自動補上' },
  { name: 'links', type: 'SankeyLinkInput[]', def: '—', desc: '{ source, target, value }（value ≤ 0 略過）' },
  { name: 'width / height', type: 'number', def: '720 / 360', desc: '尺寸（autoResize 時跟著容器）' },
  { name: 'autoResize / debounceDelay', type: 'boolean / number', def: 'false / 100', desc: '跟著容器大小（容器要有高度）／防抖毫秒' },
  { name: 'title / unit', type: 'string', def: "''", desc: '標題／單位' },
  { name: 'valueFormat', type: '(v: number) => string', def: '千分位', desc: '數值格式' },
  { name: 'nodeWidth / nodePadding', type: 'number', def: '14 / 14', desc: '節點寬度／同一欄節點間距（px）' },
  { name: 'align', type: "'justify' | 'left'", def: "'justify'", desc: '終點都放最後一欄／每個節點放最早能放的欄' },
  { name: 'linkColor', type: "'source' | 'target' | 'neutral'", def: "'source'", desc: '連線顏色跟來源、跟去向，或一律中性灰' },
  { name: 'showValues', type: 'boolean', def: 'true', desc: '節點名稱後面顯示數量' },
  { name: 'emptyText', type: 'string', def: '語系', desc: '沒有連線時的文字' },
]
const dataRows = [
  { name: 'SankeyNodeInput', type: '{ id, label?, color? }', def: '—', desc: '沒有 color 時依序用圖表色' },
  { name: 'SankeyLinkInput', type: '{ source, target, value }', def: '—', desc: 'source / target 為節點 id' },
]
const events = [
  { name: 'node-click', params: '({ id, label, value })', desc: '點擊或 Enter 一個節點' },
  { name: 'link-click', params: '({ source, target, value })', desc: '點擊一條連線' },
  { name: 'cycle', params: '(links: SankeyLinkInput[])', desc: '有連線因為形成循環而沒有畫出' },
  { name: 'chart-resize', params: '({ width, height })', desc: 'autoResize 時尺寸改變' },
]
const methods = [{ name: 'layout()', type: '() => SankeyLayout', desc: '目前的版面（節點與連線的位置）' }]
</script>
