<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">🗔</span>
        <h1 class="text-4xl font-bold text-neutral-900">浮層元件</h1>
      </div>
      <p class="text-neutral-600 text-lg max-w-4xl">
        ChptModal（模態框：dialog / window 雙模式）、ChptDrawer（側滑抽屜）、
        ChptPopconfirm（彈出確認）、ChptModalDock（視窗口袋列）。每個元件都附「Props / Events / Slots」與注意事項。
      </p>
    </div>

    <!-- ============ ChptModal ============ -->
    <section id="chpt-modal" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold text-neutral-900">ChptModal 模態框</h2>
        <div class="flex gap-2">
          <ChptButton size="sm" @click="modalOpen = true">開啟 Dialog</ChptButton>
          <ChptButton size="sm" @click="windowA = true">開啟 Window A</ChptButton>
        </div>
      </div>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>需要使用者中斷當前流程並專注處理的對話（Dialog）或可並行作業的多視窗工作面板（Window）。
        統一整合拖曳、縮放、最大化／最小化到口袋等功能。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptModal, ChptModalDock } from '@/components/library'</code>
      </p>

      <!-- 模式說明 -->
      <div class="grid md:grid-cols-2 gap-4 mb-6 text-sm">
        <div class="bg-primary-50 rounded-lg p-4 border border-primary-100">
          <p class="font-semibold text-primary-700 mb-2">mode="dialog"</p>
          <p class="text-neutral-600 text-xs">簡潔置中的確認／編輯框。可調 size、遮罩點擊關閉，適合表單、確認、訊息對話框。</p>
        </div>
        <div class="bg-info-50 rounded-lg p-4 border border-info-100">
          <p class="font-semibold text-info-700 mb-2">mode="window"</p>
          <p class="text-neutral-600 text-xs">可拖曳／縮放／最大化／最小化到口袋的獨立視窗，多開時自動管理 z-index 置頂；需搭配 ChptModalDock 顯示最小化的視窗。</p>
        </div>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="modalSample" />
      </div>

      <ApiTable title="Props（通用＋dialog）" :rows="modalCommonProps" />
      <ApiTable title="Props（window 模式專屬）" :rows="modalWindowProps" />
      <ApiTable title="Events" :rows="modalEvents" />
      <ApiTable title="Slots" :rows="modalSlots" />

      <div class="mt-6 flex gap-2 flex-wrap">
        <ChptButton size="sm" is-outline color="secondary" @click="modalOpen = true">開啟編輯對話框（表單示範）</ChptButton>
        <ChptButton size="sm" color="success" @click="windowB = true">開啟視窗 B</ChptButton>
        <ChptButton size="sm" color="warning" is-outline @click="restoreAll">還原全部視窗</ChptButton>
      </div>
      <p class="text-sm text-neutral-600 mt-3">
        提示：Window 可拖曳、縮放；點右上角「─」會最小化到 <a href="#chpt-modaldock" class="text-primary-600 hover:underline">下方口袋列</a>。
      </p>

      <!-- Dialog Modal -->
      <ChptModal v-model="modalOpen" title="編輯資料" size="md" mode="dialog">
        <div class="space-y-4">
          <ChptInput v-model="editName" label="名稱" placeholder="請輸入名稱" full-width />
          <ChptTextarea v-model="editDesc" label="說明" placeholder="請輸入說明" rows="3" full-width />
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <ChptButton size="sm" is-outline @click="modalOpen = false">取消</ChptButton>
            <ChptButton size="sm" color="primary" @click="modalOpen = false">儲存</ChptButton>
          </div>
        </template>
      </ChptModal>

      <!-- Window Modal A -->
      <ChptModal
        v-model="windowA"
        mode="window"
        title="工作面板 A"
        id="doc-window-a"
        :width="520"
        :height="360"
        :minimizable="true"
        :maximizable="true"
        :draggable="true"
        :resizable="true"
      >
        <div class="space-y-3">
          <p class="text-sm text-neutral-600">這是一個可拖曳、可縮放的工作視窗。點擊右上角「─」可縮小到右下角的口袋列。</p>
          <ChptProgress :model-value="45" status="primary" />
          <ChptTag label="window 模式" color="primary" />
        </div>
      </ChptModal>

      <!-- Window Modal B -->
      <ChptModal
        v-model="windowB"
        mode="window"
        title="工作面板 B"
        id="doc-window-b"
        :width="460"
        :height="320"
        header-bg-color="from-success-50 to-teal-50"
      >
        <div class="space-y-3">
          <p class="text-sm text-neutral-600">兩個 window 同時開啟時，點擊任一視窗即自動置頂（z-index 自動管理）。</p>
          <ChptProgress :model-value="80" status="success" />
        </div>
      </ChptModal>

      <p class="text-sm text-neutral-600 mt-6">
        <strong>注意：</strong>window 模式需要唯一 <code>id</code>（供 z-index 與最小化管理）；最小化需在頁面安裝
        <code><ChptModalDock /></code> 才會顯示口袋列。
      </p>
    </section>

    <!-- ============ ChptDrawer ============ -->
    <section id="chpt-drawer" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold text-neutral-900">ChptDrawer 側滑抽屜</h2>
        <div class="flex gap-2">
          <ChptButton size="sm" is-outline @click="openDrawer('left')">左側</ChptButton>
          <ChptButton size="sm" @click="openDrawer('right')">右側</ChptButton>
        </div>
      </div>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>從畫面四邊滑出、不需打斷主內容的操作面板／詳細表單；可設定方向、寬高、遮罩關閉。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptDrawer } from '@/components/library'</code>
      </p>

      <div class="mt-2">
        <ChptCodeBlock :code="drawerSample" />
      </div>

      <ApiTable title="Props" :rows="drawerProps" />
      <ApiTable title="Events" :rows="drawerEvents" />
      <ApiTable title="Slots" :rows="drawerSlots" />

      <ChptDrawer v-model="drawerOpen" title="詳細資訊" :placement="drawerPlacement" :size="380">
        <div class="space-y-4">
          <ChptInput v-model="drawerName" label="名稱" placeholder="請輸入" full-width />
          <ChptProgress :model-value="62" status="primary" />
          <p class="text-sm text-neutral-600">這是一個 {{ drawerPlacement === 'left' ? '左' : '右' }}側滑出的抽屜面板，常用於展示表單或詳細資料。</p>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <ChptButton size="sm" is-outline @click="drawerOpen = false">取消</ChptButton>
            <ChptButton size="sm" color="primary" @click="drawerOpen = false">確認</ChptButton>
          </div>
        </template>
      </ChptDrawer>

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong><code>placement</code> 支援 left / right / top / bottom；水平方向以 <code>size</code>
        控寬度，垂直方向控高度。
      </p>
    </section>

    <!-- ============ ChptPopconfirm ============ -->
    <section id="chpt-popconfirm" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptPopconfirm 彈出確認</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>對高風險操作（刪除、發布、送出）在觸發元素旁彈出輕量確認，不需整頁跳轉或開 Modal。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptPopconfirm } from '@/components/library'</code>
      </p>

      <div class="flex items-center gap-4 flex-wrap">
        <ChptPopconfirm
          message="確定要刪除這筆資料嗎？此操作無法復原。"
          @confirm="onConfirmDelete"
        >
          <ChptButton size="sm" color="danger">刪除</ChptButton>
        </ChptPopconfirm>
        <ChptPopconfirm
          message="確定要發布此內容嗎？"
          color="success"
          confirm-text="發布"
          @confirm="onPublish"
        >
          <ChptButton size="sm" color="success">發布</ChptButton>
        </ChptPopconfirm>
        <ChptPopconfirm
          message="要不要順便儲存草稿？"
          color="warning"
          confirm-text="儲存"
          cancel-text="不要"
          @cancel="onCancel"
        >
          <ChptButton size="sm" is-outline color="warning">存草稿</ChptButton>
        </ChptPopconfirm>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="popconfirmSample" />
      </div>

      <ApiTable title="Props" :rows="popconfirmProps" />
      <ApiTable title="Events" :rows="popconfirmEvents" />
      <ApiTable title="Slots" :rows="popconfirmSlots" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>預設以 <code>color</code>（danger）上色確認按鈕；訊息可用 <code>#message</code> 插槽放自訂內容。
      </p>
    </section>

    <!-- ============ ChptModalDock ============ -->
    <section id="chpt-modaldock" class="mb-12 bg-white rounded-xl shadow-md p-8 border border-neutral-200 scroll-mt-24">
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">ChptModalDock 視窗口袋列</h2>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>使用時機：</strong>與 ChptModal 的 <code>window</code> 模式搭配，顯示被最小化的視窗；通常每頁掛載一次即可。
      </p>
      <p class="text-sm text-neutral-600 mb-4">
        <strong>引入：</strong><code class="bg-neutral-100 px-1 py-0.5 rounded">import { ChptModalDock } from '@/components/library'</code>
      </p>

      <div class="bg-neutral-50 rounded-lg p-4 text-sm text-neutral-600">
        先回到上方 <a href="#chpt-modal" class="text-primary-600 hover:underline">ChptModal Window 模式</a>開啟任一視窗，
        再點右上角「─」最小化，即可在右下角看到口袋列；點擊項目可還原視窗。
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="dockSample" />
      </div>

      <ApiTable title="Props" :rows="dockProps" />

      <p class="text-sm text-neutral-600 mt-4">
        <strong>注意：</strong>ChptModalDock 透過 Teleport 固定於右下角，僅在有最小化視窗時顯示；透過全域
        <code>useModalManager</code>（<code>restoreAll / closeAll</code>）可批次控制。
      </p>

      <!-- 口袋列（顯示被最小化的 window） -->
      <ChptModalDock />
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  ChptModal,
  ChptModalDock,
  ChptDrawer,
  ChptPopconfirm,
  ChptButton,
  ChptInput,
  ChptTextarea,
  ChptProgress,
  ChptTag,
  ChptCodeBlock,
} from '@/components/library'
import { useModalManager } from '@/composables/useModalManager'
import ApiTable from './_ApiTable.vue'

const modalOpen = ref(false)
const editName = ref('')
const editDesc = ref('')

// window 多視窗示範
const windowA = ref(false)
const windowB = ref(false)
const { restoreAll } = useModalManager()

const drawerOpen = ref(false)
const drawerPlacement = ref('right')
const drawerName = ref('')

function openDrawer(placement) {
  drawerPlacement.value = placement
  drawerOpen.value = true
}

function onConfirmDelete() {
  console.log('已刪除')
}
function onPublish() {
  console.log('已發布')
}
function onCancel() {
  console.log('已取消')
}

// ---- 程式碼範例（字串，避免模板解析） ----
const modalSample = `<!-- Dialog 模式 -->
<ChptModal v-model="modalOpen" title="編輯資料" size="md" mode="dialog">
  <p>這裡是 Modal 內容</p>
  <template #footer>
    <ChptButton @click="modalOpen = false">取消</ChptButton>
    <ChptButton color="primary">儲存</ChptButton>
  </template>
</ChptModal>

<!-- Window 模式（多視窗 + 口袋） -->
<ChptModal
  v-model="windowA" mode="window"
  title="工作面板" id="win-a"
  :width="520" :height="360"
  :draggable="true" :resizable="true"
  :minimizable="true" :maximizable="true"
>
  <p>可拖曳、可縮放、可最小化到口袋</p>
</ChptModal>`

const drawerSample = `<ChptDrawer
  v-model="drawerOpen"
  title="詳細資訊"
  placement="right"
  :size="400"
>
  <p>抽屜內容</p>
  <template #footer>
    <ChptButton @click="drawerOpen = false">確認</ChptButton>
  </template>
</ChptDrawer>`

const popconfirmSample = `<ChptPopconfirm
  message="確定要刪除嗎？"
  color="danger"
  @confirm="handleDelete"
  @cancel="handleCancel"
>
  <ChptButton color="danger">刪除</ChptButton>
</ChptPopconfirm>`

const dockSample = `<!-- 每頁掛載一次即可 -->
<ChptModalDock />`

// ---- API 資料（與元件 props/emits 對齊） ----
const modalCommonProps = [
  { name: 'modelValue', type: 'boolean', def: 'false', desc: '開關（v-model）' },
  { name: 'mode', type: "'dialog'|'window'", def: "'dialog'", desc: '佈局模式' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'id', type: 'string', def: 'undefined', desc: 'window 模式唯一 ID（多實例管理）' },
  { name: 'width / height', type: 'string|number', def: 'undefined', desc: '寬／高（px 或百分比）' },
  { name: 'size', type: "'sm'|'md'|'lg'|'xl'", def: "'md'", desc: 'dialog 預設尺寸（400/600/800/1000px）' },
  { name: 'fullWidth', type: 'boolean', def: 'false', desc: '是否全寬' },
  { name: 'closable', type: 'boolean', def: 'true', desc: '是否顯示關閉按鈕' },
  { name: 'maskClosable', type: 'boolean', def: 'true', desc: '點擊遮罩關閉' },
  { name: 'backdropOpacity', type: 'number', def: '0.5', desc: '遮罩透明度 0~1' },
  { name: 'bodyHeight', type: 'number|string', def: 'undefined', desc: '內容區高度上限' },
]
const modalWindowProps = [
  { name: 'draggable', type: 'boolean', def: 'true', desc: '可拖曳移動' },
  { name: 'resizable', type: 'boolean', def: 'true', desc: '可拖曳縮放' },
  { name: 'minimizable', type: 'boolean', def: 'true', desc: '可最小化到口袋' },
  { name: 'maximizable', type: 'boolean', def: 'true', desc: '可最大化／還原' },
  { name: 'x / y', type: 'number|null', def: 'null', desc: '初始位置（px）' },
  { name: 'minWidth / minHeight', type: 'number', def: '300 / 200', desc: '縮放最小限制' },
  { name: 'defaultMaximized', type: 'boolean', def: 'false', desc: '開啟即最大化' },
  { name: 'headerBgColor', type: 'string', def: 'from-primary-50 to-primary-100', desc: '標題列漸層 class' },
  { name: 'headerTextColor', type: 'string', def: 'text-neutral-800', desc: '標題文字 class' },
  { name: 'borderClass / roundedClass / shadowClass', type: 'string', def: '…', desc: '外框／圓角／陰影 class' },
  { name: 'contentPadding / footerBgColor', type: 'string', def: 'p-4 / bg-neutral-50', desc: '內容留白／底部底色 class' },
]
const modalEvents = [
  { name: 'update:modelValue', params: '(value: boolean)', desc: '開關變更（v-model）' },
  { name: 'open', params: '—', desc: '開啟時' },
  { name: 'close', params: '—', desc: '關閉時' },
  { name: 'minimize', params: '(value: boolean)', desc: '最小化／還原狀態' },
  { name: 'maximize', params: '—', desc: '最大化時' },
  { name: 'restore', params: '—', desc: '還原時' },
]
const modalSlots = [
  { name: 'default', params: '—', desc: '主體內容' },
  { name: 'title', params: '—', desc: '自訂標題（取代 title）' },
  { name: 'footer', params: '—', desc: '底部操作列（dialog 置底、window 固定）' },
]

const drawerProps = [
  { name: 'modelValue', type: 'boolean', def: 'false', desc: '開關（v-model）' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'placement', type: "'left'|'right'|'top'|'bottom'", def: "'right'", desc: '滑出方向' },
  { name: 'size', type: 'number|string', def: '360', desc: '寬／高（px 或百分比）' },
  { name: 'closable', type: 'boolean', def: 'true', desc: '是否顯示關閉按鈕' },
  { name: 'maskClosable', type: 'boolean', def: 'true', desc: '點擊遮罩關閉' },
  { name: 'backdropOpacity', type: 'number', def: '0.4', desc: '遮罩透明度 0~1' },
]
const drawerEvents = [
  { name: 'update:modelValue', params: '(value: boolean)', desc: '開關變更（v-model）' },
  { name: 'close', params: '—', desc: '關閉時' },
]
const drawerSlots = [
  { name: 'default', params: '—', desc: '主體內容' },
  { name: 'footer', params: '—', desc: '底部操作列' },
]

const popconfirmProps = [
  { name: 'message', type: 'string', def: "'確定要執行此操作嗎？'", desc: '確認訊息' },
  { name: 'confirmText', type: 'string', def: "'確定'", desc: '確認按鈕文字' },
  { name: 'cancelText', type: 'string', def: "'取消'", desc: '取消按鈕文字' },
  { name: 'color', type: "'primary'|'secondary'|'success'|'danger'|'warning'", def: "'danger'", desc: '確認按鈕顏色' },
]
const popconfirmEvents = [
  { name: 'confirm', params: '—', desc: '按下確認時' },
  { name: 'cancel', params: '—', desc: '按下取消時' },
]
const popconfirmSlots = [
  { name: 'default', params: '—', desc: '觸發元素（點擊展開確認）' },
  { name: 'message', params: '—', desc: '自訂確認訊息' },
]

const dockProps = [
  { name: 'zIndex', type: 'number', def: '9999', desc: '口袋列 z-index 層級' },
]
</script>
