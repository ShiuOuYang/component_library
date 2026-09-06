<template>
  <div class="min-h-screen bg-neutral-50 p-8">
    <div class="max-w-5xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-neutral-900 mb-2">Whiteboard 白板</h1>
        <p class="text-lg text-neutral-600">
          多頁白板（獨立領域，位於 <code>@/components/whiteboard</code>）：筆刷、幾何圖形、匯出 PNG/SVG。
        </p>
      </div>

      <section class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-4">引入方式</h2>
        <ChptCodeBlock
          language="html"
          code='import WhiteboardCanvas from "@/components/whiteboard/WhiteboardCanvas.vue"\nimport WhiteboardToolbar from "@/components/whiteboard/WhiteboardToolbar.vue"\nimport WhiteboardPageRail from "@/components/whiteboard/WhiteboardPageRail.vue"'
        />
      </section>

      <section class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-4">元件對照</h2>
        <table class="w-full text-sm">
          <thead class="bg-neutral-100">
            <tr>
              <th class="px-4 py-2 text-left font-semibold">元件</th>
              <th class="px-4 py-2 text-left font-semibold">用途</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr><td class="px-4 py-3 font-mono text-xs">WhiteboardCanvas</td><td class="px-4 py-3 text-neutral-700">畫布主體（SVG）</td></tr>
            <tr><td class="px-4 py-3 font-mono text-xs">WhiteboardToolbar</td><td class="px-4 py-3 text-neutral-700">筆刷／形狀／顏色工具列</td></tr>
            <tr><td class="px-4 py-3 font-mono text-xs">WhiteboardPageRail</td><td class="px-4 py-3 text-neutral-700">頁面縮圖導覽列</td></tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ChptCodeBlock } from '@/components/library'
</script>
