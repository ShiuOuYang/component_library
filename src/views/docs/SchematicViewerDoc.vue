<template>
  <div class="min-h-screen bg-neutral-50 p-8">
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-neutral-900 mb-2">Schematic Viewer</h1>
      <p class="text-lg text-neutral-600 max-w-4xl">
        電路圖檢視器：節點與連線繪製、元件屬性面板、載入 <code class="bg-neutral-100 px-1.5 py-0.5 rounded text-sm">.json</code>
        / <code class="bg-neutral-100 px-1.5 py-0.5 rounded text-sm">.xml</code> 電路圖檔。
      </p>
    </div>

    <ChptAlert type="warning" class="mb-8 max-w-4xl">
      <strong>這不是組件庫元件。</strong>
      <code>SchematicViewer</code> 位於 <code>src/components/</code>，是一個自帶 header 與工具列的
      <strong>整頁應用</strong>，不在 <code>@/components/library</code> 的公開 API 裡，也不適合嵌進其他版面。
      要在自己的頁面放電路圖，請另外抽出繪圖部分。
    </ChptAlert>

    <section class="bg-white rounded-lg shadow-sm p-6 mb-8 max-w-4xl">
      <h2 class="text-2xl font-semibold text-neutral-800 mb-4">引入方式</h2>
      <ChptCodeBlock language="vue" :code="importCode" />
      <p class="mt-3 text-sm text-neutral-600">
        <code>data</code> 為選用；未提供時會載入內建的示範電路（二階 RC 低通濾波器）。
      </p>
    </section>

    <section class="bg-white rounded-lg shadow-sm p-6 mb-8 max-w-4xl">
      <h2 class="text-2xl font-semibold text-neutral-800 mb-4">特色</h2>
      <ul class="space-y-2 text-sm text-neutral-700 list-disc pl-5">
        <li>節點 / 連線 / 元件符號繪製</li>
        <li>元件屬性面板與網路（net）清單</li>
        <li>支援載入 <code>.json</code> / <code>.xml</code> 電路圖檔</li>
        <li>縮放與平移</li>
      </ul>
    </section>

    <section class="bg-white rounded-lg shadow-sm p-6 max-w-none">
      <h2 class="text-2xl font-semibold text-neutral-800 mb-4">實際畫面</h2>
      <div class="border border-neutral-200 rounded-lg overflow-hidden">
        <SchematicViewer />
      </div>
    </section>
  </div>
</template>

<script setup>
/* eslint-disable no-useless-escape -- 範例字串裡的結束標籤必須跳脫，否則 SFC 解析器會把 script 區塊提前收尾 */
import { ChptAlert, ChptCodeBlock } from '@/components/library'
import SchematicViewer from '@/components/SchematicViewer.vue'

const importCode = `<script setup>
import SchematicViewer from '@/components/SchematicViewer.vue'
<\/script>

<template>
  <!-- data 選用；未提供時載入內建示範電路 -->
  <SchematicViewer :data="schematicData" />
</template>`
</script>
