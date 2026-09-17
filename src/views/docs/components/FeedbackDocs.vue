<template>
  <div class="w-full px-8 py-12">
    <!-- 全域 Toast 容器：示範用在此頁掛載一次（正式應用請於 App.vue 掛載） -->
    <ChptToast />

    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">🛎️</span>
        <h1 class="text-4xl font-bold text-neutral-900">反饋元件</h1>
      </div>
      <p class="text-neutral-600 text-lg max-w-4xl">
        ChptAlert（提示條）、ChptTag（標籤）、ChptBadge（徽章）、ChptToast（全域提示）、
        ChptProgress（進度條）、ChptSpinner（載入指示器）、ChptEmpty（空狀態）、
        ChptSkeleton（骨架屏）。每個元件都附「Props / Events / Slots」與注意事項。
      </p>
    </div>

    <!-- ============ ChptAlert ============ -->
    <section id="chpt-alert" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptAlert 提示條</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>頁面內「區塊級」訊息回饋（成功 / 資訊 / 警告 / 錯誤），可帶標題、
        可關閉、可全寬；適合放在表單頂端、操作結果旁或需要長時間停留的訊息。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptAlert } from '@/components/library'</code>
      </p>

      <div class="space-y-3">
        <ChptAlert type="success" title="操作成功" message="資料已成功儲存，可繼續編輯。" />
        <ChptAlert type="info" title="系統通知" message="系統將於今晚 22:00 進行例行維護。" />
        <ChptAlert type="warning" title="注意" message="偵測到潛在的資料不一致，請檢查後再送出。" />
        <ChptAlert type="danger" title="錯誤" message="連線逾時，請稍後再試。" closable @close="onAlertClose" />
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="alertSample" />
      </div>

      <ApiTable title="Props" :rows="alertProps" />
      <ApiTable title="Events" :rows="alertEvents" />
      <ApiTable title="Slots" :rows="alertSlots" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>以 <code>show</code> 控制顯示／隱藏（預設 true）；若需要自訂訊息排版，
        使用 <code>#default</code> 插槽取代 <code>message</code> 文字。
      </p>
    </section>

    <!-- ============ ChptTag ============ -->
    <section id="chpt-tag" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptTag 標籤</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>輕量的狀態／分類標記（膠囊樣式），例如審核狀態、欄位型別、可關閉的篩選條件。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptTag } from '@/components/library'</code>
      </p>

      <div class="flex flex-wrap items-center gap-3">
        <ChptTag label="Primary" color="primary" />
        <ChptTag label="Success" color="success" />
        <ChptTag label="Warning" color="warning" is-outline />
        <ChptTag label="Danger" color="danger" is-outline />
        <ChptTag label="Info" color="info" />
        <ChptTag label="含圖示" color="primary" icon="verified" />
        <ChptTag label="可關閉" color="primary" closable @close="onTagClose" />
        <ChptTag label="Dark" color="dark" />
        <ChptTag label="Light" color="light" />
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="tagSample" />
      </div>

      <ApiTable title="Props" :rows="tagProps" />
      <ApiTable title="Events" :rows="tagEvents" />
      <ApiTable title="Slots" :rows="tagSlots" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>文字可直接用 <code>label</code> 或放進 <code>#default</code>；前置圖示可經
        <code>icon</code>（Material Symbols 名稱）或 <code>#icon</code> 插槽自訂。
      </p>
    </section>

    <!-- ============ ChptBadge ============ -->
    <section id="chpt-badge" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptBadge 徽章</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>環繞子內容（按鈕／圖示／頭像）顯示未讀計數或線上狀態圓點；如通知數、購物車數量。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptBadge } from '@/components/library'</code>
      </p>

      <div class="flex items-center gap-10 flex-wrap">
        <div class="flex flex-col items-center gap-2">
          <ChptBadge :count="5">
            <button type="button" class="w-12 h-12 bg-neutral-100 rounded-lg border border-neutral-200 flex items-center justify-center text-lg">🔔</button>
          </ChptBadge>
          <span class="text-xs text-neutral-500">計數</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <ChptBadge is-dot status="success">
            <button type="button" class="w-12 h-12 bg-neutral-100 rounded-lg border border-neutral-200 flex items-center justify-center text-lg">👤</button>
          </ChptBadge>
          <span class="text-xs text-neutral-500">線上圓點</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <ChptBadge :count="102" :max="99">
            <button type="button" class="w-12 h-12 bg-neutral-100 rounded-lg border border-neutral-200 flex items-center justify-center text-lg">✉️</button>
          </ChptBadge>
          <span class="text-xs text-neutral-500">上限 99+</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <ChptBadge :count="3" status="primary">
            <button type="button" class="w-12 h-12 bg-neutral-100 rounded-lg border border-neutral-200 flex items-center justify-center text-lg">🛒</button>
          </ChptBadge>
          <span class="text-xs text-neutral-500">自訂狀態色</span>
        </div>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="badgeSample" />
      </div>

      <ApiTable title="Props" :rows="badgeProps" />
      <ApiTable title="Slots" :rows="badgeSlots" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong><code>count</code> 為 0 且未設 <code>showZero</code> 時不顯示；純圓點請設
        <code>is-dot</code>。透過 <code>position</code> 可把徽章移到四個角落。
      </p>
    </section>

    <!-- ============ ChptToast ============ -->
    <section id="chpt-toast" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptToast 全域提示</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>跨頁面的輕量操作回饋（成功／失敗／警告／資訊），自動淡入並於頂端堆疊。
        <strong>容器需在 App 根層掛載一次</strong>，之後任一段程式碼都能用 <code>useToast()</code> 呼叫。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptToast, useToast } from '@/components/library'</code>
      </p>

      <div class="flex flex-wrap gap-3">
        <ChptButton color="success" size="sm" @click="toast.success('操作成功')">Success</ChptButton>
        <ChptButton color="info" size="sm" @click="toast.info('此為資訊提示')">Info</ChptButton>
        <ChptButton color="warning" size="sm" @click="toast.warning('請留意此警告')">Warning</ChptButton>
        <ChptButton color="danger" size="sm" @click="toast.error('操作失敗')">Error</ChptButton>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="toastSample" />
      </div>

      <ApiTable title="useToast 方法" :rows="toastMethods" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>ChptToast 透過 Teleport 掛到 body 頂端；同一 App 只掛一份即可，過多訊息會自動堆疊。
        圖示依賴 Material Symbols 字型，請確認字型已載入。
      </p>
    </section>

    <!-- ============ ChptProgress ============ -->
    <section id="chpt-progress" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptProgress 進度條</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>顯示 0–100 的完成度或工作進度；支援 v-model、多種語意色、粗細與百分比標籤。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptProgress } from '@/components/library'</code>
      </p>

      <div class="space-y-5 max-w-2xl">
        <div>
          <div class="flex items-center justify-between mb-1 text-sm">
            <span class="text-neutral-600">互動示範（v-model）</span>
            <ChptButton size="3xs" is-outline color="secondary" @click="progress = Math.min(100, progress + 12)">+12%</ChptButton>
          </div>
          <ChptProgress v-model="progress" status="primary" />
        </div>
        <div>
          <p class="text-sm text-neutral-600 mb-1">狀態色</p>
          <ChptProgress :model-value="72" status="success" />
          <ChptProgress :model-value="45" status="info" :stroke-width="10" />
          <ChptProgress :model-value="88" status="warning" :show-label="false" />
          <ChptProgress :model-value="25" status="danger" />
        </div>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="progressSample" />
      </div>

      <ApiTable title="Props" :rows="progressProps" />
      <ApiTable title="Events" :rows="progressEvents" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong><code>modelValue</code> 會自動夾在 0–100；<code>trackColor</code> 傳的是
        Tailwind class（未傳時預設 neutral-100）。
      </p>
    </section>

    <!-- ============ ChptSpinner ============ -->
    <section id="chpt-spinner" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptSpinner 載入指示器</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>等待非同步操作完成時的輕量指示器；<code>loading</code> 為 false 時完全不渲染。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptSpinner } from '@/components/library'</code>
      </p>

      <div class="flex items-center gap-8 flex-wrap">
        <ChptSpinner :loading="true" :size="20" />
        <span class="text-primary-600">
          <ChptSpinner :loading="true" :size="28" text="載入中..." />
        </span>
        <span class="text-success-600">
          <ChptSpinner :loading="true" :size="32" />
        </span>
        <span class="text-danger-600">
          <ChptSpinner :loading="true" :size="32" />
        </span>
        <ChptSpinner :loading="true" :size="40" text="資料處理中" center />
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="spinnerSample" />
      </div>

      <ApiTable title="Props" :rows="spinnerProps" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>SVG 以 <code>currentColor</code> 上色；想指定顏色請在外層包一個帶
        <code>text-{color}</code> 的容器（如上示範）。<code>center</code> 時文字會落在圖示下方。
      </p>
    </section>

    <!-- ============ ChptEmpty ============ -->
    <section id="chpt-empty" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptEmpty 空狀態</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>表格／列表／搜尋結果沒有資料時的引導畫面；可自訂圖示、標題、說明與操作按鈕。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptEmpty } from '@/components/library'</code>
      </p>

      <div class="border border-dashed border-neutral-300 rounded-lg">
        <ChptEmpty
          icon="search_off"
          title="找不到相關資料"
          description="請嘗試調整搜尋條件後再試一次。"
        >
          <template #action>
            <ChptButton size="sm" color="primary" @click="onEmptyAction">清除條件</ChptButton>
          </template>
        </ChptEmpty>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="emptySample" />
      </div>

      <ApiTable title="Props" :rows="emptyProps" />
      <ApiTable title="Slots" :rows="emptySlots" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>操作按鈕放進 <code>#action</code> 插槽即可置中顯示；標題可經 <code>#default</code>
        插槽自訂為 HTML。
      </p>
    </section>

    <!-- ============ ChptSkeleton ============ -->
    <section id="chpt-skeleton" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptSkeleton 骨架屏</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>初次載入時以骨架佔位避免版面跳動；<code>loading</code> 為 false 時顯示
        預設插槽的實際內容。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptSkeleton } from '@/components/library'</code>
      </p>

      <div class="max-w-xl">
        <ChptSkeleton :loading="skeletonLoading" :rows="4" :row-width="[100, 85, 90, 60]">
          <div class="border border-neutral-200 rounded-lg p-4">
            <p class="text-sm text-neutral-700">載入完成後的實際內容會顯示在這裡。</p>
          </div>
        </ChptSkeleton>
      </div>
      <div class="mt-4">
        <ChptButton size="sm" is-outline color="secondary" @click="skeletonLoading = !skeletonLoading">
          {{ skeletonLoading ? '顯示內容' : '重新載入骨架' }}
        </ChptButton>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="skeletonSample" />
      </div>

      <ApiTable title="Props" :rows="skeletonProps" />
      <ApiTable title="Slots" :rows="skeletonSlots" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong><code>rowWidth</code> 可為單一數值／百分比，或以陣列逐列指定（如
        [100, 85, 90]）；底色 class 用 <code>color</code> 覆寫。
      </p>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  ChptAlert,
  ChptTag,
  ChptBadge,
  ChptToast,
  useToast,
  ChptProgress,
  ChptSpinner,
  ChptEmpty,
  ChptSkeleton,
  ChptButton,
  ChptCodeBlock,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

const toast = useToast()

function onAlertClose() {
  toast.info('Alert 已關閉')
}
function onTagClose() {
  toast.warning('標籤已關閉')
}
function onEmptyAction() {
  toast.success('已清除搜尋條件')
}

const progress = ref(24)
const skeletonLoading = ref(true)

// ---- 程式碼範例（字串，避免模板解析） ----
const alertSample = `<ChptAlert
  type="success"
  title="操作成功"
  message="資料已成功儲存。"
  closable
  @close="handleClose"
/>`

const tagSample = `<ChptTag label="狀態" color="success" />
<ChptTag label="含圖示" icon="verified" />
<ChptTag label="可關閉" closable @close="handleClose" />`

const badgeSample = `<ChptBadge :count="5">
  <button type="button">通知</button>
</ChptBadge>

<ChptBadge is-dot status="success">
  <ChptAvatar name="王小明" />
</ChptBadge>`

const toastSample = `<!-- App.vue：掛載一次 -->
<ChptToast />

<!-- 任一頁面 -->
import { useToast } from '@/components/library'
const toast = useToast()
toast.success('操作成功')
toast.error('操作失敗')`

const progressSample = `<ChptProgress v-model="p" status="success" :stroke-width="10" :show-label="true" />`

const spinnerSample = `<ChptSpinner :loading="isLoading" :size="28" text="載入中..." />`

const emptySample = `<ChptEmpty
  icon="search_off"
  title="找不到相關資料"
  description="請調整搜尋條件"
>
  <template #action>
    <ChptButton size="sm">清除條件</ChptButton>
  </template>
</ChptEmpty>`

const skeletonSample = `<ChptSkeleton :loading="isLoading" :rows="3" :row-width="[100, 85, 90]">
  <!-- 載入完成後的實際內容 -->
  <YourContent />
</ChptSkeleton>`

// ---- API 資料（與元件 props/emits 對齊） ----
const alertProps = [
  { name: 'show', type: 'boolean', def: 'true', desc: '是否顯示（v-if 於內部）' },
  { name: 'type', type: "'success'|'info'|'warning'|'danger'", def: "'info'", desc: '語意類型' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'message', type: 'string', def: "''", desc: '主要訊息' },
  { name: 'showIcon', type: 'boolean', def: 'true', desc: '左側圖示' },
  { name: 'closable', type: 'boolean', def: 'false', desc: '可關閉（✕）' },
  { name: 'fullWidth', type: 'boolean', def: 'false', desc: '是否全寬' },
]
const alertEvents = [{ name: 'close', params: '(event: MouseEvent)', desc: '點擊關閉時觸發' }]
const alertSlots = [{ name: 'default', params: '—', desc: '自訂訊息內容（取代 message）' }]

const tagProps = [
  { name: 'label', type: 'string', def: "''", desc: '標籤文字' },
  { name: 'color', type: "'primary'|'secondary'|'success'|'warning'|'danger'|'info'|'dark'|'light'", def: "'primary'", desc: '顏色語意' },
  { name: 'isOutline', type: 'boolean', def: 'false', desc: '輪廓（邊框）樣式' },
  { name: 'size', type: "'xs'|'sm'|'md'|'lg'|'xl'", def: "'sm'", desc: '尺寸' },
  { name: 'icon', type: 'string', def: "''", desc: '前置 Material Symbols 圖示名' },
  { name: 'closable', type: 'boolean', def: 'false', desc: '可關閉（✕）' },
]
const tagEvents = [{ name: 'close', params: '(event: MouseEvent)', desc: '點擊關閉時觸發' }]
const tagSlots = [
  { name: 'default', params: '—', desc: '標籤內容（取代 label）' },
  { name: 'icon', params: '—', desc: '自訂前置圖示' },
]

const badgeProps = [
  { name: 'count', type: 'number', def: 'undefined', desc: '顯示數量（undefined 不顯示）' },
  { name: 'isDot', type: 'boolean', def: 'false', desc: '純圓點樣式' },
  { name: 'max', type: 'number', def: '99', desc: '上限，超過顯示 max+' },
  { name: 'showZero', type: 'boolean', def: 'false', desc: 'count=0 時仍顯示' },
  { name: 'status', type: "'primary'|'success'|'warning'|'danger'|'info'|'dark'", def: "'danger'", desc: '狀態色' },
  { name: 'position', type: "'top-right'|'top-left'|'bottom-right'|'bottom-left'", def: "'top-right'", desc: '角落位置' },
  { name: 'offset', type: 'number', def: '0', desc: '向外偏移量(px)' },
  { name: 'color', type: 'string', def: "''", desc: '自訂背景 class（優先於 status）' },
]
const badgeSlots = [{ name: 'default', params: '—', desc: '被包覆的內容（按鈕／圖示／頭像）' }]

const toastMethods = [
  { name: 'success(msg)', params: 'string', desc: '綠色成功提示' },
  { name: 'info(msg)', params: 'string', desc: '資訊提示' },
  { name: 'warning(msg)', params: 'string', desc: '警示提示' },
  { name: 'error(msg)', params: 'string', desc: '錯誤提示' },
]

const progressProps = [
  { name: 'modelValue', type: 'number', def: '0', desc: '進度 0–100（v-model）' },
  { name: 'status', type: "'primary'|'success'|'warning'|'danger'|'info'", def: "'primary'", desc: '狀態色' },
  { name: 'strokeWidth', type: 'number', def: '8', desc: '進度條高度(px)' },
  { name: 'trackColor', type: 'string', def: "''（neutral-100）", desc: '軌道底色 class' },
  { name: 'showLabel', type: 'boolean', def: 'true', desc: '右側百分比標籤' },
]
const progressEvents = [{ name: 'update:modelValue', params: '(value: number)', desc: '數值變更（v-model）' }]

const spinnerProps = [
  { name: 'loading', type: 'boolean', def: 'false', desc: '是否載入中（false 不渲染）' },
  { name: 'size', type: 'number|string', def: '24', desc: '圖示尺寸(px)' },
  { name: 'text', type: 'string', def: "''", desc: '可選說明文字' },
  { name: 'color', type: 'string', def: "'primary-500'", desc: '顏色 class（現以 currentColor 呈現）' },
  { name: 'fullWidth', type: 'boolean', def: 'false', desc: '是否全寬' },
  { name: 'center', type: 'boolean', def: 'false', desc: '文字置於圖示下方' },
]

const emptyProps = [
  { name: 'icon', type: 'string', def: "'inbox'", desc: 'Material Symbols 圖示名' },
  { name: 'title', type: 'string', def: "'暫無資料'", desc: '標題' },
  { name: 'description', type: 'string', def: "''", desc: '說明文字' },
  { name: 'iconSize', type: 'number|string', def: '48', desc: '圖示尺寸(px)' },
  { name: 'iconColor', type: 'string', def: "'neutral-300'", desc: '圖示顏色 class' },
  { name: 'fullWidth', type: 'boolean', def: 'false', desc: '是否全寬' },
]
const emptySlots = [
  { name: 'default', params: '—', desc: '標題內容（取代 title）' },
  { name: 'action', params: '—', desc: '操作按鈕群組' },
]

const skeletonProps = [
  { name: 'loading', type: 'boolean', def: 'false', desc: '是否載入中（true 顯示骨架）' },
  { name: 'rows', type: 'number', def: '3', desc: '骨架列數' },
  { name: 'rowWidth', type: 'number|string|Array', def: '100', desc: '寬度（%），陣列可逐列指定' },
  { name: 'rowHeight', type: 'number|string', def: '16', desc: '行高(px)' },
  { name: 'color', type: 'string', def: "'bg-neutral-200'", desc: '骨架底色 class' },
  { name: 'fullWidth', type: 'boolean', def: 'false', desc: '是否全寬' },
]
const skeletonSlots = [{ name: 'default', params: '—', desc: '載入完成後顯示的實際內容' }]
</script>
