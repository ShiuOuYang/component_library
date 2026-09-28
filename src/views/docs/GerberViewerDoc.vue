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
    </div>
  </div>
</template>

<script setup>
import { ChptCodeBlock } from '@/components/library'
</script>
