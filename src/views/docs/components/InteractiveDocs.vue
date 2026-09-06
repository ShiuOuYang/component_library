<template>
  <div class="w-full px-8 py-12">
    <!-- 全域 Toast 容器：示範用在此頁掛載一次（正式應用請於 App.vue 掛載） -->
    <ChptToast />

    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">🖱️</span>
        <h1 class="text-4xl font-bold text-neutral-900">互動元件</h1>
      </div>
      <p class="text-neutral-600 text-lg max-w-4xl">
        互動與回饋類元件：ChptTabs（頁籤）、ChptToast（全域提示）、ChptButton（按鈕）、
        ChptProgress（進度條）、ChptAlert（提示條）。每個元件都附「Props / Events / Slots」與注意事項。
      </p>
    </div>

    <!-- ============ ChptTabs ============ -->
    <section id="chpt-tabs" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptTabs 頁籤</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>同一視窗內切換多個內容區塊（非導向路由）；可帶 icon 與計數 badge。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptTabs } from '@/components/library'</code>
      </p>

      <ChptTabs v-model="activeTab" :tabs="tabs" />

      <div class="mt-6">
        <ChptCodeBlock :code="tabsSample" />
      </div>

      <ApiTable title="Props" :rows="tabsProps" />
      <ApiTable title="Events" :rows="tabsEvents" />
      <ApiTable title="Slots" :rows="tabsSlots" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>以 <code>v-model</code> 綁定目前 index；選項可設 <code>disabled</code> 禁止點擊，
        內容建議用 <code>#panel- 前綴插槽</code>（如 #panel-0）自訂；若只是導向不同路由，請改用 ChptTabNavigation。
      </p>
    </section>

    <!-- ============ ChptToast ============ -->
    <section id="chpt-toast" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptToast 全域提示</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>全域操作回饋（成功/失敗/警告/資訊）。<strong>容器需在 App 根層掛載一次</strong>，
        任一頁面即可用 <code>useToast()</code> 呼叫。
      </p>

      <div class="flex flex-wrap gap-3">
        <ChptButton color="success" size="sm" @click="toast.success('操作成功')">Success</ChptButton>
        <ChptButton color="info" size="sm" @click="toast.info('此為資訊提示')">Info</ChptButton>
        <ChptButton color="warning" size="sm" @click="toast.warning('請留意此警告')">Warning</ChptButton>
        <ChptButton color="danger" size="sm" @click="toast.error('操作失敗')">Error</ChptButton>
      </div>

      <p class="text-sm text-neutral-500 mt-4">掛載與使用：</p>
      <div class="mt-2">
        <ChptCodeBlock :code="toastSample" />
      </div>

      <ApiTable title="useToast 方法" :rows="toastMethods" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>ChptToast 為 Teleport 到 body 的全域容器；同一 App 只掛載一份，
        過多同時出現會自動堆疊於頂端。圖示依賴 Material Symbols 字型，請確認字型已載入。
      </p>
    </section>

    <!-- ============ ChptButton ============ -->
    <section id="chpt-button" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptButton 按鈕</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>任何可點擊的操作入口；支援語意色、實心/輪廓、尺寸、圓角、loading、badge 與前後置圖示。
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <ChptButton color="primary" size="sm" @click="progress = Math.min(100, progress + 10)">主操作 +10%</ChptButton>
        <ChptButton size="sm" is-outline color="secondary">次要按鈕</ChptButton>
        <ChptButton size="sm" color="success" :loading="loading">載入中</ChptButton>
        <ChptButton size="sm" color="danger" disabled>禁用</ChptButton>
        <ChptButton size="sm" color="warning" icon="star" icon-position="left" label="含圖示" />
      </div>

      <div class="mt-4">
        <ChptCodeBlock :code="btnSample" />
      </div>

      <ApiTable title="Props" :rows="btnProps" />
      <ApiTable title="Events" :rows="btnEvents" />
      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>同時帶 <code>loading</code> 會忽略點擊並顯示 spinner；角標 <code>badgeBgColor</code>
        接受語意鍵（primary/success/…）。
      </p>
    </section>

    <!-- ============ ChptProgress ============ -->
    <section id="chpt-progress" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptProgress 進度條</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>顯示 0–100 的進度/完成度；可換語意色、粗細、百分比標籤。
      </p>
      <div class="space-y-4 max-w-2xl">
        <div>
          <ChptProgress v-model="progress" status="primary" />
          <ChptProgress v-model="progress2" status="success" :stroke-width="12" />
          <ChptProgress v-model="progress" status="danger" :show-label="false" />
        </div>
      </div>
      <div class="mt-4">
        <ChptCodeBlock :code="progressSample" />
      </div>
      <ApiTable title="Props" :rows="progressProps" />
      <ApiTable title="Events" :rows="progressEvents" />
      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>modelValue 自動夾在 0–100；<code>trackColor</code> 傳的是 Tailwind class（預設 neutral-100）。
      </p>
    </section>

    <!-- ============ ChptAlert ============ -->
    <section id="chpt-alert" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptAlert 提示條</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>頁面內的區塊級訊息（成功/資訊/警告/錯誤）；可帶標題、可關閉、全寬。
      </p>
      <div class="space-y-3">
        <ChptAlert show type="success" title="完成" message="此區示範 Button / Progress / Alert 組合運用。" closable @close="onAlertClose" />
        <ChptAlert show type="info" title="提示" message="設計 token 色票讓各元件外觀一致。" />
        <ChptAlert show type="warning" title="注意" message="警示類訊息會以黃色呈現。" />
        <ChptAlert show type="danger" title="錯誤" message="錯誤訊息以紅色呈現。" />
      </div>
      <div class="mt-4">
        <ChptCodeBlock :code="alertSample" />
      </div>
      <ApiTable title="Props" :rows="alertProps" />
      <ApiTable title="Events" :rows="alertEvents" />
      <ApiTable title="Slots" :rows="alertSlots" />
      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong><code>show</code> 預設 true 控制顯示；內容可用 <code>#default</code> 自訂取代 <code>message</code>。
      </p>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  ChptTabs,
  ChptToast,
  useToast,
  ChptButton,
  ChptProgress,
  ChptAlert,
  ChptCodeBlock,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

const activeTab = ref(0)
const tabs = [
  { label: '儀表板', icon: 'dashboard' },
  { label: '趨勢', icon: 'trending_up', badge: 3 },
  { label: '設定', icon: 'settings' },
]

const toast = useToast()
const progress = ref(30)
const progress2 = ref(72)

// ---- 程式碼範例（字串，避免模板解析） ----
const tabsSample = `<ChptTabs v-model="activeTab" :tabs="tabs">
  <template #panel-0>頁籤一面板</template>
</ChptTabs>

const tabs = [{ label: '儀表板', icon: 'dashboard' }]`

const toastSample = `<!-- App.vue：掛載一次 -->
<ChptToast />

<!-- 任一頁面 -->
import { useToast } from '@/components/library'
const toast = useToast()
toast.success('操作成功')`

const btnSample = `<ChptButton color="primary" :loading="loading" @click="submit">送出</ChptButton>
<ChptButton color="primary" is-outline label="取消" />`

const progressSample = `<ChptProgress v-model="p" status="success" />`

const alertSample = `<ChptAlert type="success" title="完成" message="..." closable @close="..." />`
const loading = ref(false)

function onAlertClose() {
  toast.info('Alert 已關閉')
}

// ---- API 資料（與元件 props/emits 對齊） ----
const tabsProps = [
  { name: 'tabs', type: 'ChptTabItem[]', def: '[]', desc: '頁籤定義：{ label, icon?, content?, badge?, disabled? }' },
  { name: 'modelValue', type: 'number', def: '0', desc: '目前 index（v-model）' },
  { name: 'centered', type: 'boolean', def: 'false', desc: '頁籤列水平置中' },
]
const tabsEvents = [
  { name: 'update:modelValue', params: '(value: number)', desc: 'index 變更' },
  { name: 'change', params: '(index: number)', desc: '切換完成' },
]
const tabsSlots = [
  { name: 'panel-<index>', params: '{ tab }', desc: '第 index 個面板內容' },
  { name: 'default', params: '{ tab, index }', desc: '未指定 panel-N 時的內容' },
]

const toastMethods = [
  { name: 'success(msg)', params: 'string', desc: '綠色成功提示' },
  { name: 'info(msg)', params: 'string', desc: '資訊提示' },
  { name: 'warning(msg)', params: 'string', desc: '警示提示' },
  { name: 'error(msg)', params: 'string', desc: '錯誤提示' },
]

const btnProps = [
  { name: 'label', type: 'string', def: "''", desc: '按鈕文字' },
  { name: 'color', type: "'primary'|'secondary'|'success'|'danger'|'warning'", def: "'primary'", desc: '語意色' },
  { name: 'isOutline', type: 'boolean', def: 'false', desc: '輪廓樣式' },
  { name: 'size', type: "'3xs'…'lg'", def: "'md'", desc: '尺寸' },
  { name: 'rounded', type: "'sm'|'md'|'lg'|'full'", def: "'md'", desc: '圓角' },
  { name: 'icon', type: 'string', def: "''", desc: 'Material Symbols 圖示名' },
  { name: 'iconPosition', type: "'left'|'right'", def: "'left'", desc: '圖示位置' },
  { name: 'iconColor', type: 'string', def: "''", desc: '圖示色 class' },
  { name: 'type', type: "'button'|'submit'|'reset'", def: "'button'", desc: '原生 type' },
  { name: 'disabled', type: 'boolean', def: 'false', desc: '禁用' },
  { name: 'loading', type: 'boolean', def: 'false', desc: '載入中（忽略點擊）' },
  { name: 'hasBadge / badgeText', type: 'boolean/…', def: 'false/0', desc: '角標與文字' },
]
const btnEvents = [{ name: 'click', params: '(event: MouseEvent)', desc: '點擊（禁用/載入中不觸發）' }]

const progressProps = [
  { name: 'modelValue', type: 'number', def: '0', desc: '進度 0–100（v-model）' },
  { name: 'status', type: "'primary'|'success'|'warning'|'danger'|'info'", def: "'primary'", desc: '狀態色' },
  { name: 'strokeWidth', type: 'number', def: '8', desc: '進度條高度(px)' },
  { name: 'trackColor', type: 'string', def: "''（neutral-100）", desc: '軌道底色 class' },
  { name: 'showLabel', type: 'boolean', def: 'true', desc: '右側百分比標籤' },
]
const progressEvents = [{ name: 'update:modelValue', params: '(value: number)', desc: '數值變更' }]

const alertProps = [
  { name: 'show', type: 'boolean', def: 'true', desc: '是否顯示' },
  { name: 'type', type: "'success'|'info'|'warning'|'danger'", def: "'info'", desc: '語意類型' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'message', type: 'string', def: "''", desc: '主要訊息' },
  { name: 'showIcon', type: 'boolean', def: 'true', desc: '左側圖示' },
  { name: 'closable', type: 'boolean', def: 'false', desc: '可關閉（✕）' },
  { name: 'fullWidth', type: 'boolean', def: 'false', desc: '是否全寬' },
]
const alertEvents = [{ name: 'close', params: '(event: MouseEvent)', desc: '點關閉時' }]
const alertSlots = [{ name: 'default', params: '—', desc: '自訂訊息內容（取代 message）' }]
</script>
