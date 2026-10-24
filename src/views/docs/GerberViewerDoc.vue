<template>
  <div class="min-h-screen bg-surface-secondary p-8">
    <div class="max-w-5xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">GerberViewer 檢視器</h1>
        <p class="text-lg text-content-secondary">
          PCB Gerber（RS-274X）圖層檢視：圖層面板、全覽/全域載入、錯誤處理。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library/viewer</code> 匯入。
        </p>
      </div>

      <section class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-content-primary mb-4">引入方式</h2>
        <ChptCodeBlock
          language="html"
          code='import { GerberViewer } from "@/components/library/viewer"\n\n<GerberViewer />'
        />
        <p class="mt-3 text-sm text-content-secondary">
          實際渲染需提供 GBR 檔案（可經由應用端讀檔後餵入元件）；此頁僅說明 API。
        </p>
      </section>

      <section class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-content-primary mb-4">特色</h2>
        <ul class="space-y-2 text-sm text-content-primary list-disc pl-5">
          <li>多圖層顯示／隱藏與單獨檢視</li>
          <li>全域載入進度與致命錯誤／重試</li>
          <li>D02 移動軌跡（Move Path）顯示開關</li>
          <li>行為色圖例（BEHAVIOR_COLORS）</li>
        </ul>
      </section>

      <section class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="GerberViewer" title="Props" :rows="propsRows" />
        <ApiTable of="GerberViewer" title="Events" :rows="eventRows" />
        <ApiTable of="GerberViewer" title="方法（ref）" :rows="methodRows" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { ChptCodeBlock } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

const propsRows = [
  { name: 'layers', type: 'GerberLayerInput[]', def: '[]', desc: '多圖層：每層 { src? | gerberText?, name?, color?, visible? }；有給時優先於 src / gerberText' },
  { name: 'src / gerberText', type: 'string', def: "''", desc: '單一圖層的檔案網址或原始文字' },
  { name: 'fillColor', type: 'string', def: "'#00ff88'", desc: '單一圖層的顏色；改顏色只重畫、不重新抓檔' },
  { name: 'backgroundColor', type: 'string', def: "'#1a1a2e'", desc: '背景色' },
  { name: 'showInfo / showControls / showLayerPanel', type: 'boolean', def: 'true', desc: '資訊面板（單位、圖形數、尺寸）、縮放按鈕、圖層面板（多圖層時才出現）' },
  { name: 'showMovePath', type: 'boolean', def: 'false', desc: '顯示 D02 移動軌跡（EDA 工具路徑分析用）；也可在畫面上切換' },
  { name: 'autoResize', type: 'boolean', def: 'true', desc: '容器尺寸改變時重畫（不重新抓檔）' },
  { name: 'padding', type: 'number', def: '20', desc: '圖形四周留白（px）' },
  { name: 'minZoom / maxZoom', type: 'number', def: '0.1 / 200', desc: '縮放倍率範圍' },
]
const eventRows = [
  { name: 'loaded', params: '{ info, layerCount, successCount }', desc: '載入並畫完；src / layers 快速切換時只有最後一次會發' },
  { name: 'error', params: '{ message }', desc: '沒有來源、所有圖層都失敗、容器尺寸為 0 等' },
  { name: 'zoom-change', params: '{ zoom }', desc: '縮放倍率改變' },
]
const methodRows = [
  { name: 'zoomIn() / zoomOut() / resetView()', params: '—', desc: '放大、縮小、回到全覽' },
  { name: 'reload()', params: '—', desc: '重新抓檔並重畫' },
  { name: 'toggleLayer(layer)', params: '(layer)', desc: '切換某個圖層的顯示' },
]
</script>
