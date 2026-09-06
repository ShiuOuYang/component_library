<template>
  <div class="min-h-screen bg-neutral-50 p-8">
    <div class="max-w-5xl mx-auto">
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-neutral-900 mb-2">ChptTooltip 提示框</h1>
        <p class="text-lg text-neutral-600">
          以 slot 包裝觸發元素，hover / focus 顯示；內建邊界校正與多種主題。
          請由 <code class="bg-neutral-100 px-1.5 py-0.5 rounded text-sm">@/components/library</code> 匯入。
        </p>
      </div>

      <!-- 主題 -->
      <section class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-4">主題</h2>
        <div class="flex flex-wrap gap-6">
          <ChptTooltip v-for="t in themes" :key="t.value" :content="t.label" :theme="t.value" placement="top">
            <ChptButton :color="t.color" size="sm">{{ t.label }}</ChptButton>
          </ChptTooltip>
        </div>
        <div class="mt-4">
          <ChptCodeBlock
            language="html"
            code='<ChptTooltip content="文字說明" theme="dark"><ChptButton>按鈕</ChptButton></ChptTooltip>'
          />
        </div>
      </section>

      <!-- 位置 -->
      <section class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-4">位置 placement</h2>
        <div class="flex flex-wrap gap-6">
          <ChptTooltip v-for="p in placements" :key="p" :content="`顯示於 ${p} 方`" :placement="p">
            <ChptButton color="secondary" variant-color="outline" size="sm">{{ p }}</ChptButton>
          </ChptTooltip>
        </div>
        <div class="mt-4">
          <ChptCodeBlock
            language="html"
            code='<ChptTooltip content="提示" placement="right">...</ChptTooltip>'
          />
        </div>
      </section>

      <!-- 自訂內容 -->
      <section class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-semibold text-neutral-800 mb-2">自訂內容插槽</h2>
        <p class="text-sm text-neutral-600 mb-4">透過 #content 插槽放入任何內容；可關閉箭頭、限制最大寬度。</p>
        <ChptTooltip theme="light" :show-arrow="false" max-width="max-w-xs">
          <ChptButton color="primary" size="sm">Hover 我</ChptButton>
          <template #content>
            <div>
              <p class="font-semibold text-neutral-800 mb-1">自訂提示</p>
              <p class="text-neutral-500 text-xs">可以是圖片、清單或任何元件內容。</p>
            </div>
          </template>
        </ChptTooltip>
        <div class="mt-4">
          <ChptCodeBlock
            language="html"
            code='<ChptTooltip theme="light"><ChptButton>Hover</ChptButton><template #content>...</template></ChptTooltip>'
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ChptTooltip, ChptButton, ChptCodeBlock } from '@/components/library'

const themes = [
  { value: 'dark', label: 'Dark', color: 'secondary' },
  { value: 'light', label: 'Light', color: 'secondary' },
  { value: 'info', label: 'Info', color: 'info' },
  { value: 'warning', label: 'Warning', color: 'warning' },
  { value: 'error', label: 'Error', color: 'danger' },
]

const placements = ['top', 'bottom', 'left', 'right']
</script>
