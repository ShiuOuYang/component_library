<template>
  <div class="min-h-screen bg-neutral-50 p-8">
    <div class="max-w-5xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-neutral-900 mb-2">ChptModal 模態框（dialog / window）</h1>
        <p class="text-lg text-neutral-600">
          取代舊 DraggableModal：mode="dialog" 置中確認框、mode="window" 多視窗（可拖曳/縮放/最小化到口袋）。
          請由 <code class="bg-neutral-100 px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <!-- dialog 模式 -->
      <section class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-2">Dialog 模式（置中確認框）</h2>
        <p class="text-sm text-neutral-600 mb-4">簡潔確認框：v-model 控制、遮罩點擊關閉、footer 插槽放按鈕。</p>
        <ChptButton color="primary" size="sm" @click="dialogOpen = true">開啟 Dialog</ChptButton>

        <ChptModal v-model="dialogOpen" mode="dialog" title="確認操作" size="sm">
          <p class="text-neutral-700 text-sm">確定要刪除這筆資料嗎？此動作無法復原。</p>
          <template #footer>
            <div class="flex justify-end gap-3">
              <ChptButton size="sm" is-outline color="secondary" @click="dialogOpen = false">取消</ChptButton>
              <ChptButton size="sm" color="danger" @click="dialogOpen = false">刪除</ChptButton>
            </div>
          </template>
        </ChptModal>

        <div class="mt-4">
          <ChptCodeBlock
            language="html"
            code='<ChptModal v-model="open" mode="dialog" title="確認" size="sm">...</ChptModal>'
          />
        </div>
      </section>

      <!-- window 模式 -->
      <section class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-2">Window 模式（可拖曳多視窗）</h2>
        <p class="text-sm text-neutral-600 mb-4">
          可拖曳、縮放、最大化與最小化；最小化後收進右下角 <ChptModalDock />。
          同頁可開多個 window 實例，自動管理 z-index。
        </p>
        <div class="flex gap-3">
          <ChptButton color="secondary" size="sm" @click="openWindow('報表設定')">開啟 Window 一</ChptButton>
          <ChptButton color="info" size="sm" @click="openWindow('資料分析')">開啟 Window 二</ChptButton>
        </div>

        <ChptModal
          v-model="windows['報表設定']"
          mode="window"
          title="報表設定"
          :width="520"
          :height="360"
          draggable
          resizable
          minimizable
          maximizable
        >
          <div class="p-4">
            <p class="text-sm text-neutral-600">這是可拖曳、縮放、最大化的視窗內容。拖曳標題列移動，右下角可調整大小。</p>
          </div>
        </ChptModal>

        <ChptModal
          v-model="windows['資料分析']"
          mode="window"
          title="資料分析"
          :width="460"
          :height="320"
          draggable
          resizable
          minimizable
          maximizable
        >
          <div class="p-4">
            <p class="text-sm text-neutral-600">第二個獨立視窗實例，可與第一個並存與比較。</p>
          </div>
        </ChptModal>

        <ChptModalDock :z-index="9999" />

        <div class="mt-4">
          <ChptCodeBlock
            language="html"
            code='<ChptModal v-model="open" mode="window" title="視窗" :width="520" :height="360" />\n<ChptModalDock />'
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ChptButton, ChptModal, ChptModalDock, ChptCodeBlock } from '@/components/library'

const dialogOpen = ref(false)
const windows = reactive({ '報表設定': false, '資料分析': false })

function openWindow(name) {
  windows[name] = true
}
</script>
