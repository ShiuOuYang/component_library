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
    </div>
  </div>
</template>

<script setup>
import { ChptCodeBlock } from '@/components/library'
</script>
