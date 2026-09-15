<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">🌗</span>
        <h1 class="text-4xl font-bold text-neutral-900">主題與工具元件</h1>
      </div>
      <p class="text-neutral-600 text-lg max-w-4xl">
        ChptDarkModeToggle（深色模式切換）、ChptHeaderLogoutButton（登出按鈕），以及 ChptPageSwitcher、
        ChptTabNavigation、ChptModalDock 等工具類包裝元件。
      </p>
    </div>

    <!-- ============ ChptDarkModeToggle ============ -->
    <section id="chpt-darkmodetoggle" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptDarkModeToggle 深色模式切換</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>App 右上角提供淺／深色主題切換；<code>variant</code> 分 fancy（SVG 動畫）與
        simple（按鈕）兩種外觀，可選擇是否同步到 body 元素。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptDarkModeToggle } from '@/components/library'</code>
      </p>

      <div class="grid md:grid-cols-2 gap-6">
        <div class="bg-neutral-50 rounded-lg p-6 border border-neutral-200 flex flex-col items-center gap-3">
          <p class="text-sm font-semibold text-neutral-800">variant="fancy"（SVG 動畫）</p>
          <ChptDarkModeToggle v-model:dark-mode="darkFancy" variant="fancy" :sync-body-by-default="false" />
          <p class="text-xs text-neutral-500">狀態：{{ darkFancy ? '深色' : '淺色' }}</p>
        </div>
        <div class="bg-neutral-50 rounded-lg p-6 border border-neutral-200 flex flex-col items-center gap-3">
          <p class="text-sm font-semibold text-neutral-800">variant="simple"（按鈕）</p>
          <ChptDarkModeToggle v-model:dark-mode="darkSimple" variant="simple" :sync-body-by-default="false" />
          <p class="text-xs text-neutral-500">狀態：{{ darkSimple ? '深色' : '淺色' }}</p>
        </div>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="darkModeSample" />
      </div>

      <ApiTable title="Props" :rows="darkModeProps" />
      <ApiTable title="Events" :rows="darkModeEvents" />
      <ApiTable title="Expose（ref）" :rows="darkModeExpose" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong><code>syncBodyByDefault</code> 預設為 true，會自動在 body 上寫
        <code>data-dark-mode</code> 並切換 <code>dark-mode</code>／<code>light-mode</code> class；
        若只想局部控制，請設為 false。
      </p>
    </section>

    <!-- ============ ChptHeaderLogoutButton ============ -->
    <section id="chpt-headerlogout" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptHeaderLogoutButton 登出按鈕</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>Header 右上角的登出按鈕；整合 <code>useAuth().logout()</code>，點擊先跳出確認、
        登出中顯示「登出…」，失敗以 alert 提示。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptHeaderLogoutButton } from '@/components/library'</code>
      </p>

      <div class="bg-warning-50 border border-warning-200 rounded-lg p-3 mb-4 text-sm text-warning-800">
        ⚠️ 以下為樣式預覽，<strong>請勿點擊</strong>（會觸發登出流程）。
      </div>
      <div class="flex flex-wrap items-center gap-4 bg-neutral-50 rounded-lg p-6 border border-neutral-200">
        <ChptHeaderLogoutButton size="sm" label="登出" />
        <ChptHeaderLogoutButton size="sm" variant="outline-gray" label="登出" />
        <ChptHeaderLogoutButton size="md" variant="solid-red" label="登出帳號" />
        <ChptHeaderLogoutButton size="md" variant="primary" label="結束工作階段" />
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="logoutSample" />
      </div>

      <ApiTable title="Props" :rows="logoutProps" />
      <ApiTable title="Events" :rows="logoutEvents" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>本元件是純展示元件，只負責「確認 → loading → 回報結果」，
        實際登出流程請透過 <code>on-logout</code> 注入。<code>variant</code> 支援
        soft-red／solid-red／outline-gray／ghost／primary 五種外觀。
      </p>
    </section>

    <!-- ============ 其他工具包裝 ============ -->
    <section class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">其他工具類包裝元件</h2>
      <p class="text-sm text-neutral-600 mb-4">
        以下元件由原 legacy 實作改名包裝為 Chpt 主題，統一自 <code>@/components/library</code> 匯入。
      </p>

      <div class="grid md:grid-cols-2 gap-4 text-sm">
        <div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <p class="font-semibold text-neutral-800 mb-1">🖱️ ChptPageSwitcher</p>
          <p class="text-xs text-neutral-600">左側頁面切換滑出面板（包裝 PageSwitcher）。</p>
        </div>
        <div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <p class="font-semibold text-neutral-800 mb-1">📑 ChptTabNavigation</p>
          <p class="text-xs text-neutral-600">頁籤式路由導覽（tabs 含 path/label、fontSize）。</p>
        </div>
        <div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <p class="font-semibold text-neutral-800 mb-1">🪟 ChptAvatar</p>
          <p class="text-xs text-neutral-600">頭像（圖片／首字／狀態圓點），詳見「UI 組件」各頁。</p>
        </div>
        <div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <p class="font-semibold text-neutral-800 mb-1">🗔 ChptModalDock / ChptModal</p>
          <p class="text-xs text-neutral-600">多視窗口袋列與模態框，詳見「浮層元件」。</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
/* eslint-disable no-useless-escape -- 範例字串裡的結束標籤必須跳脫，否則 SFC 解析器會把 script 區塊提前收尾；ESLint 的 JS parser 看不到 SFC 這一層，故誤判 */
import { ref } from 'vue'
import {
  ChptDarkModeToggle,
  ChptHeaderLogoutButton,
  ChptCodeBlock,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

const darkFancy = ref(false)
const darkSimple = ref(false)

// ---- 程式碼範例（字串，避免模板解析） ----
const darkModeSample = `<ChptDarkModeToggle
  v-model:dark-mode="darkMode"
  variant="fancy"    <!-- 或 simple -->
  :show-controls="true"
/>`

const logoutSample = `<script setup>
import { useAuth } from '@/composables/useAuth'
const { logout } = useAuth()
<\/script>

<template>
  <ChptHeaderLogoutButton
    size="md"
    variant="soft-red"
    label="登出"
    :on-logout="logout"
    @error="(e) => toast.error('登出失敗')"
  />
</template>`

// ---- API 資料（與元件 props/emits 對齊） ----
const darkModeProps = [
  { name: 'variant', type: "'fancy'|'simple'", def: "'fancy'", desc: '外觀模式' },
  { name: 'darkMode', type: 'boolean', def: 'undefined', desc: '深色狀態（v-model:dark-mode）' },
  { name: 'initialDarkMode', type: 'boolean', def: 'false', desc: '初始狀態（未綁定 v-model 時）' },
  { name: 'showControls', type: 'boolean', def: 'false', desc: '顯示額外控制選項' },
  { name: 'syncBodyByDefault', type: 'boolean', def: 'true', desc: '@deprecated 已無作用；主題一律由 useDarkMode() 同步到 <html> 與 <body>' },
]
const darkModeEvents = [
  { name: 'update:darkMode', params: '(value: boolean)', desc: '狀態變更（v-model）' },
  { name: 'toggle', params: '(value: boolean)', desc: '每次切換時' },
]
const darkModeExpose = [
  { name: 'toggle()', params: '—', desc: '程式化切換' },
  { name: 'isDarkMode', params: 'computed', desc: '目前狀態' },
]

const logoutProps = [
  { name: 'onLogout', type: '() => void | Promise<void>', def: 'undefined', desc: '實際登出流程，由使用端注入；等待期間顯示 loading' },
  { name: 'size', type: "'sm'|'md'", def: "'md'", desc: '尺寸' },
  { name: 'variant', type: "'soft-red'|'solid-red'|'outline-gray'|'ghost'|'primary'", def: "'soft-red'", desc: '樣式變體' },
  { name: 'label', type: 'string', def: "'登出'", desc: '按鈕文字' },
  { name: 'loadingLabel', type: 'string', def: "'登出…'", desc: '載入中文字' },
  { name: 'title', type: 'string', def: "'登出系統'", desc: '按鈕的無障礙標題' },
  { name: 'confirm', type: 'boolean', def: 'true', desc: '點擊後是否先跳確認視窗' },
  { name: 'confirmMessage', type: 'string', def: "'確定要登出嗎？'", desc: '確認視窗訊息' },
  { name: 'customClass', type: 'string', def: "''", desc: '自訂 class' },
]

const logoutEvents = [
  { name: 'logout', params: '()', desc: '使用者確認登出（onLogout 執行前）' },
  { name: 'error', params: '(error: unknown)', desc: 'onLogout 執行失敗；錯誤如何呈現由使用端決定' },
]
</script>
