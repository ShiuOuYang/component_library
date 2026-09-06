<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">💬</span>
        <h1 class="text-4xl font-bold text-neutral-900">ChptTooltip 提示框</h1>
      </div>
      <p class="text-neutral-600 text-lg max-w-4xl">
        以 slot 包裝觸發元素，hover／focus 顯示浮動提示；內建多主題、四向定位、箭頭控制、
        最大寬度與邊界校正。本頁分「主題／位置／自訂內容」三種用法。
      </p>
    </div>

    <!-- ============ 主題 ============ -->
    <section id="chpt-tooltip-theme" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">主題 theme</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>以 <code>theme</code> 快速切換配色——dark（預設深色）、light（淺色卡片）、
        info／warning／error（語意色）。語意主題常用於狀態提示。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptTooltip } from '@/components/library'</code>
      </p>

      <div class="flex flex-wrap gap-6">
        <ChptTooltip v-for="t in themes" :key="t.value" :content="t.label" :theme="t.value" placement="top">
          <ChptButton :color="t.color" size="sm">{{ t.label }}</ChptButton>
        </ChptTooltip>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="themeSample" />
      </div>

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong><code>theme</code> 支援 dark／light／info／warning／error；自訂外觀請用
        <code>#content</code> 插槽自訂樣式，而不只是換色。
      </p>
    </section>

    <!-- ============ 位置 ============ -->
    <section id="chpt-tooltip-placement" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">位置 placement</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>以 <code>placement</code> 指定顯示於觸發元素的上／下／左／右；
        元件會自動做邊界校正，接近視窗邊緣時避免溢出。
      </p>

      <div class="flex flex-wrap gap-6">
        <ChptTooltip v-for="p in placements" :key="p" :content="`顯示於 ${p} 方`" :placement="p">
          <ChptButton color="secondary" variant-color="outline" size="sm">{{ p }}</ChptButton>
        </ChptTooltip>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="placementSample" />
      </div>

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>placement 支援 top／bottom／left／right；於窄容器建議搭配
        <code>show-arrow="false"</code> 與 <code>max-width</code> 避免貼邊。
      </p>
    </section>

    <!-- ============ 自訂內容 ============ -->
    <section id="chpt-tooltip-content" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">自訂內容 #content</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>提示不只是單行文字時（說明＋圖示、清單、圖片等），以
        <code>#content</code> 插槽放入任何內容，並用 <code>max-width</code> 控制寬度。
      </p>

      <div class="flex flex-wrap items-start gap-6">
        <ChptTooltip theme="light" :show-arrow="false" max-width="max-w-xs">
          <ChptButton color="primary" size="sm">Hover 我（自訂內容）</ChptButton>
          <template #content>
            <div>
              <p class="font-semibold text-neutral-800 mb-1">自訂提示</p>
              <p class="text-neutral-500 text-xs">可以是圖片、清單或任何元件內容。</p>
              <div class="mt-2 flex gap-2">
                <ChptTag label="可互動" color="info" />
              </div>
            </div>
          </template>
        </ChptTooltip>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="contentSample" />
      </div>

      <ApiTable title="Props" :rows="tooltipProps" />
      <ApiTable title="Events" :rows="tooltipEvents" />
      <ApiTable title="Slots" :rows="tooltipSlots" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong><code>content</code> 提供純文字快速提示；有複雜內容時用 <code>#content</code>
        插槽（會取代 content）。<code>disabled</code> 可暫時停用提示。
      </p>
    </section>
  </div>
</template>

<script setup>
import { ChptTooltip, ChptButton, ChptTag, ChptCodeBlock } from '@/components/library'
import ApiTable from './components/_ApiTable.vue'

const themes = [
  { value: 'dark', label: 'Dark', color: 'secondary' },
  { value: 'light', label: 'Light', color: 'secondary' },
  { value: 'info', label: 'Info', color: 'info' },
  { value: 'warning', label: 'Warning', color: 'warning' },
  { value: 'error', label: 'Error', color: 'danger' },
]

const placements = ['top', 'bottom', 'left', 'right']

// ---- 程式碼範例（字串，避免模板解析） ----
const themeSample = `<ChptTooltip content="文字說明" theme="dark" placement="top">
  <ChptButton>按鈕</ChptButton>
</ChptTooltip>`

const placementSample = `<ChptTooltip content="提示文字" placement="right">
  <ChptButton>被提示的元素</ChptButton>
</ChptTooltip>`

const contentSample = `<ChptTooltip theme="light" :show-arrow="false" max-width="max-w-xs">
  <ChptButton>Hover 我</ChptButton>
  <template #content>
    <p class="font-semibold mb-1">自訂提示</p>
    <p class="text-xs">可以是任何元件內容。</p>
  </template>
</ChptTooltip>`

// ---- API 資料（與元件 props/emits 對齊） ----
const tooltipProps = [
  { name: 'content', type: 'string', def: "''", desc: '提示文字（無 #content 時顯示）' },
  { name: 'placement', type: "'top'|'bottom'|'left'|'right'", def: "'top'", desc: '顯示位置' },
  { name: 'theme', type: "'dark'|'light'|'info'|'warning'|'error'", def: "'dark'", desc: '主題配色' },
  { name: 'showArrow', type: 'boolean', def: 'true', desc: '是否顯示箭頭' },
  { name: 'maxWidth', type: 'string', def: "'max-w-xs'", desc: '最大寬度 Tailwind class' },
  { name: 'disabled', type: 'boolean', def: 'false', desc: '停用提示' },
]
const tooltipEvents = [
  { name: 'show', params: '—', desc: '顯示時' },
  { name: 'hide', params: '—', desc: '隱藏時' },
]
const tooltipSlots = [
  { name: 'default', params: '—', desc: '觸發元素（hover／focus 顯示提示）' },
  { name: 'content', params: '—', desc: '自訂提示內容（取代 content）' },
]
</script>
