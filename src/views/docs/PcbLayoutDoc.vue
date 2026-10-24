<template>
  <div class="min-h-screen bg-surface-secondary p-8">
    <div class="max-w-5xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-content-primary mb-2">PcbLayout 檢視器</h1>
        <p class="text-lg text-content-secondary">
          PCB 佈局圖層檢視器：圖層面板、圖形類別圖例與資訊卡。
          請由 <code class="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm">@/components/library/viewer</code> 匯入。
        </p>
      </div>

      <section class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-content-primary mb-4">引入方式</h2>
        <ChptCodeBlock
          language="html"
          code='import { PcbLayout } from "@/components/library/viewer"\n\n<PcbLayout />'
        />
        <p class="mt-3 text-sm text-content-secondary">
          實際渲染需提供 PCB 佈局來源資料；此頁僅說明 API。
        </p>
      </section>

      <section class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-content-primary mb-4">特色</h2>
        <ul class="space-y-2 text-sm text-content-primary list-disc pl-5">
          <li>內建圖層顯示／隱藏與單獨檢視</li>
          <li>圖形類別圖例（銅箔、線路、文字等）</li>
          <li>點選檢視板件資訊</li>
        </ul>
      </section>

      <section class="bg-surface-primary rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-content-primary mb-2">API</h2>
        <ApiTable of="PcbLayout" title="Props" :rows="propsRows" />
        <ApiTable of="PcbLayout" title="Events" :rows="eventRows" />
        <ApiTable of="PcbLayout" title="方法（ref）" :rows="methodRows" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { ChptCodeBlock } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

const propsRows = [
  { name: 'data', type: 'PcbData', def: '—', desc: '板子資料（必填，結構化 JSON）：有 layers 時依圖層分組，否則用 elements 並依 type 自動分層' },
  { name: 'colorMap', type: 'Partial<Record<PcbElementType, string>>', def: '{}', desc: '各元素類型的顏色，例如 { trace: …, pad: … }' },
  { name: 'backgroundColor', type: 'string', def: "'#1a1a2e'", desc: '背景色' },
  { name: 'defaultTraceWidth / defaultPadSize', type: 'number', def: '0.2 / 0.6', desc: '資料沒給時的走線寬度、焊盤大小（mm）' },
  { name: 'showRefDes', type: 'boolean', def: 'true', desc: '顯示元件的 refDes 標籤（R1、C3…）' },
  { name: 'showInfo / showControls / showLayerPanel', type: 'boolean', def: 'true', desc: '資訊面板、縮放按鈕、圖層面板' },
  { name: 'autoResize', type: 'boolean', def: 'true', desc: '容器尺寸改變時重畫' },
  { name: 'padding', type: 'number', def: '20', desc: '圖形四周留白（px）' },
  { name: 'minZoom / maxZoom', type: 'number', def: '0.1 / 200', desc: '縮放倍率範圍' },
]
const eventRows = [
  { name: 'loaded', params: '{ info, layerCount }', desc: '畫完；info 含單位、元素數、板子尺寸' },
  { name: 'error', params: '{ message }', desc: '資料無法繪製' },
  { name: 'zoom-change', params: '{ zoom }', desc: '縮放倍率改變' },
  { name: 'element-click / element-hover', params: '{ event, data } / … | null', desc: '點擊／滑過走線、焊盤、元件等元素；離開元素時 element-hover 送 null' },
]
const methodRows = [
  { name: 'zoomIn() / zoomOut() / resetView()', params: '—', desc: '放大、縮小、回到全覽' },
  { name: 'toggleLayer(layer)', params: '(layer)', desc: '切換某個圖層的顯示' },
  { name: 'forceRender()', params: '—', desc: '立即重畫（例如容器尺寸被外部改變但沒有觸發 resize）' },
]
</script>
