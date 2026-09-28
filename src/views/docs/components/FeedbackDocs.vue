<template>
  <div class="w-full px-8 py-12">
    <!-- 全域 Toast 容器：示範用在此頁掛載一次（正式應用請於 App.vue 掛載） -->
    <ChptToast />

    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">🛎️</span>
        <h1 class="text-4xl font-bold text-content-primary">反饋元件</h1>
      </div>
      <p class="text-content-secondary text-lg max-w-4xl">
        ChptAlert（提示條）、ChptTag（標籤）、ChptBadge（徽章）、ChptToast（全域提示）、
        ChptProgress（進度條）、ChptSpinner（載入指示器）、ChptEmpty（空狀態）、
        ChptSkeleton（骨架屏）。每個元件都附「Props / Events / Slots」與注意事項。
      </p>
    </div>

    <!-- ============ ChptAlert ============ -->
    <section id="chpt-alert" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptAlert 提示條</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>頁面內「區塊級」訊息回饋（成功 / 資訊 / 警告 / 錯誤），可帶標題、
        可關閉、可全寬；適合放在表單頂端、操作結果旁或需要長時間停留的訊息。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptAlert } from '@/components/library'</code>
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

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>以 <code>show</code> 控制顯示／隱藏（預設 true）；若需要自訂訊息排版，
        使用 <code>#default</code> 插槽取代 <code>message</code> 文字。
      </p>
    </section>

    <!-- ============ ChptTag ============ -->
    <section id="chpt-tag" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptTag 標籤</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>輕量的狀態／分類標記（膠囊樣式），例如審核狀態、欄位型別、可關閉的篩選條件。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptTag } from '@/components/library'</code>
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

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>文字可直接用 <code>label</code> 或放進 <code>#default</code>；前置圖示可經
        <code>icon</code>（Material Symbols 名稱）或 <code>#icon</code> 插槽自訂。
      </p>
    </section>

    <!-- ============ ChptBadge ============ -->
    <section id="chpt-badge" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptBadge 徽章</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>環繞子內容（按鈕／圖示／頭像）顯示未讀計數或線上狀態圓點；如通知數、購物車數量。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptBadge } from '@/components/library'</code>
      </p>

      <div class="flex items-center gap-10 flex-wrap">
        <div class="flex flex-col items-center gap-2">
          <ChptBadge :count="5">
            <button type="button" class="w-12 h-12 bg-surface-tertiary rounded-lg border border-stroke-light flex items-center justify-center text-lg">🔔</button>
          </ChptBadge>
          <span class="text-xs text-content-tertiary">計數</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <ChptBadge is-dot status="success">
            <button type="button" class="w-12 h-12 bg-surface-tertiary rounded-lg border border-stroke-light flex items-center justify-center text-lg">👤</button>
          </ChptBadge>
          <span class="text-xs text-content-tertiary">線上圓點</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <ChptBadge :count="102" :max="99">
            <button type="button" class="w-12 h-12 bg-surface-tertiary rounded-lg border border-stroke-light flex items-center justify-center text-lg">✉️</button>
          </ChptBadge>
          <span class="text-xs text-content-tertiary">上限 99+</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <ChptBadge :count="3" status="primary">
            <button type="button" class="w-12 h-12 bg-surface-tertiary rounded-lg border border-stroke-light flex items-center justify-center text-lg">🛒</button>
          </ChptBadge>
          <span class="text-xs text-content-tertiary">自訂狀態色</span>
        </div>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="badgeSample" />
      </div>

      <ApiTable title="Props" :rows="badgeProps" />
      <ApiTable title="Slots" :rows="badgeSlots" />

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong><code>count</code> 為 0 且未設 <code>showZero</code> 時不顯示；純圓點請設
        <code>is-dot</code>。透過 <code>position</code> 可把徽章移到四個角落。
      </p>
    </section>

    <!-- ============ ChptToast ============ -->
    <section id="chpt-toast" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptToast 全域提示</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>跨頁面的輕量操作回饋（成功／失敗／警告／資訊），自動淡入並於頂端堆疊。
        <strong>容器需在 App 根層掛載一次</strong>，之後任一段程式碼都能用 <code>useToast()</code> 呼叫。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptToast, useToast } from '@/components/library'</code>
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

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>ChptToast 透過 Teleport 掛到 body 頂端；同一 App 只掛一份即可，過多訊息會自動堆疊。
        圖示依賴 Material Symbols 字型，請確認字型已載入。
      </p>
    </section>

    <!-- ============ useNotification ============ -->
    <section id="use-notification" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">useNotification 角落通知</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>有標題、說明、可能還有動作按鈕的通知（「匯出完成 —— 下載」「SMT-02 停機 —— 查看」）。
        只有一句話的結果回饋請用上面的 Toast。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptNotificationHost, useNotification } from '@/components/library'</code>
        —— <code>&lt;ChptNotificationHost /&gt;</code> 在 App 放一次。
      </p>
      <div class="flex flex-wrap gap-3">
        <ChptButton size="sm" color="success" @click="notifyExport">匯出完成（含動作）</ChptButton>
        <ChptButton size="sm" color="warning" @click="notifyDowntime">停機警告</ChptButton>
        <ChptButton size="sm" is-outline @click="notify.info({ title: '排程已更新', message: '明日早班 SMT-01 改為 07:30 開線。' })">一般通知</ChptButton>
        <span class="text-sm text-content-secondary self-center">最後動作：<span class="font-mono">{{ lastNotifyAction || '—' }}</span></span>
      </div>
      <ChptNotificationHost />
      <div class="mt-6">
        <ChptCodeBlock :code="notifySample" />
      </div>
      <ApiTable title="notify.open(options) / success / info / warning / error" :rows="notifyOptions" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>滑鼠停在通知上、或焦點在通知裡的按鈕時，倒數會暫停（WCAG 2.2.1：要有足夠時間讀完、按到按鈕）；
        有動作按鈕的通知預設不自動消失。warning / error 以 role="alert" 立即報讀。
      </p>
    </section>

    <!-- ============ ChptProgress ============ -->
    <section id="chpt-progress" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptProgress 進度條</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>顯示 0–100 的完成度或工作進度；支援 v-model、多種語意色、粗細與百分比標籤。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptProgress } from '@/components/library'</code>
      </p>

      <div class="space-y-5 max-w-2xl">
        <div>
          <div class="flex items-center justify-between mb-1 text-sm">
            <span class="text-content-secondary">互動示範（v-model）</span>
            <ChptButton size="3xs" is-outline color="secondary" @click="progress = Math.min(100, progress + 12)">+12%</ChptButton>
          </div>
          <ChptProgress v-model="progress" status="primary" />
        </div>
        <div>
          <p class="text-sm text-content-secondary mb-1">狀態色</p>
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

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong><code>modelValue</code> 會自動夾在 0–100；<code>trackColor</code> 傳的是
        Tailwind class（未傳時預設 neutral-100）。
      </p>
    </section>

    <!-- ============ ChptSpinner ============ -->
    <section id="chpt-spinner" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptSpinner 載入指示器</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>等待非同步操作完成時的輕量指示器；<code>loading</code> 為 false 時完全不渲染。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptSpinner } from '@/components/library'</code>
      </p>

      <div class="flex items-center gap-8 flex-wrap">
        <ChptSpinner :loading="true" :size="20" />
        <span class="text-accent">
          <ChptSpinner :loading="true" :size="28" text="載入中..." />
        </span>
        <span class="text-success">
          <ChptSpinner :loading="true" :size="32" />
        </span>
        <span class="text-danger">
          <ChptSpinner :loading="true" :size="32" />
        </span>
        <ChptSpinner :loading="true" :size="40" text="資料處理中" center />
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="spinnerSample" />
      </div>

      <ApiTable title="Props" :rows="spinnerProps" />

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>SVG 以 <code>currentColor</code> 上色；想指定顏色請在外層包一個帶
        <code>text-{color}</code> 的容器（如上示範）。<code>center</code> 時文字會落在圖示下方。
      </p>
    </section>

    <!-- ============ ChptEmpty ============ -->
    <section id="chpt-empty" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptEmpty 空狀態</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>表格／列表／搜尋結果沒有資料時的引導畫面；可自訂圖示、標題、說明與操作按鈕。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptEmpty } from '@/components/library'</code>
      </p>

      <div class="border border-dashed border-stroke-default rounded-lg">
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

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>操作按鈕放進 <code>#action</code> 插槽即可置中顯示；標題可經 <code>#default</code>
        插槽自訂為 HTML。
      </p>
    </section>

    <!-- ============ ChptSkeleton ============ -->
    <section id="chpt-skeleton" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptSkeleton 骨架屏</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>初次載入時以骨架佔位避免版面跳動；<code>loading</code> 為 false 時顯示
        預設插槽的實際內容。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptSkeleton } from '@/components/library'</code>
      </p>

      <div class="max-w-xl">
        <ChptSkeleton :loading="skeletonLoading" :rows="4" :row-width="[100, 85, 90, 60]">
          <div class="border border-stroke-light rounded-lg p-4">
            <p class="text-sm text-content-primary">載入完成後的實際內容會顯示在這裡。</p>
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

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong><code>rowWidth</code> 可為單一數值／百分比，或以陣列逐列指定（如
        [100, 85, 90]）；底色 class 用 <code>color</code> 覆寫。
      </p>
    </section>

    <!-- ============ ChptResult ============ -->
    <section id="chpt-result" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptResult 結果頁</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>一整塊區域就是一個結果 —— 送出成功、匯入失敗、沒有權限、找不到頁面，通常附上下一步的按鈕。
        短暫提示用 ChptToast、頁面中的一條訊息用 ChptAlert、「還沒有資料」用 ChptEmpty。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptResult } from '@/components/library'</code>
      </p>

      <div class="mb-3">
        <ChptSegmented v-model="resultStatus" :options="resultOptions" aria-label="結果狀態" size="xs" />
      </div>
      <div class="rounded-lg border border-stroke-light bg-surface-secondary">
        <ChptResult :status="resultStatus" :sub-title="resultSubTitle" compact>
          <template #extra>
            <ChptButton label="回到列表" color="primary" size="sm" />
            <ChptButton label="重新操作" color="primary" size="sm" is-outline />
          </template>
          <ul v-if="resultStatus === 'error'" class="list-disc pl-5 space-y-1">
            <li>第 3 列：料號格式錯誤</li>
            <li>第 8 列：數量不得為負數</li>
          </ul>
        </ChptResult>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="resultSample" />
      </div>

      <ApiTable title="Props" :rows="resultProps" />
      <ApiTable title="Slots" :rows="resultSlots" />

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>失敗類（error／warning／403／404／500）使用 <code>role="alert"</code>，螢幕閱讀器會立即唸出；
        success／info 使用 <code>role="status"</code>。
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
  useNotification,
  ChptNotificationHost,
  ChptProgress,
  ChptSpinner,
  ChptEmpty,
  ChptSkeleton,
  ChptButton,
  ChptCodeBlock,
  ChptResult,
  ChptSegmented,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'
import { computed } from 'vue'

// ---- ChptResult ----
const resultStatus = ref('success')
const resultOptions = [
  { label: '成功', value: 'success' },
  { label: '失敗', value: 'error' },
  { label: '警告', value: 'warning' },
  { label: '403', value: '403' },
  { label: '404', value: '404' },
]
const resultSubTitle = computed(
  () =>
    ({
      success: '工單 WO-2026-0917 已送出審核，預計 2 小時內完成。',
      error: '有 2 列資料未通過檢查，請修正後重新上傳。',
      warning: '部分欄位使用了預設值，請確認後再送出。',
      '403': '你沒有檢視這份報表的權限，請聯絡系統管理員。',
      '404': '頁面可能已被移除，或網址有誤。',
    })[resultStatus.value]
)
const resultSample = `<ChptResult status="error" title="匯入失敗" sub-title="有 2 列資料未通過檢查">
  <template #extra>
    <ChptButton label="重新上傳" color="primary" />
  </template>
  <ul><li>第 3 列：料號格式錯誤</li></ul>
</ChptResult>`
const resultProps = [
  { name: 'status', type: "'success' | 'error' | 'warning' | 'info' | '403' | '404' | '500'", def: "'info'", desc: '決定圖示、顏色與預設標題' },
  { name: 'title', type: 'string', def: "''", desc: '標題；不給時用狀態的預設標題' },
  { name: 'subTitle', type: 'string', def: "''", desc: '說明發生了什麼、接下來可以怎麼做' },
  { name: 'compact', type: 'boolean', def: 'false', desc: '精簡版（放在卡片或對話框裡）' },
]
const resultSlots = [
  { name: 'extra', params: '—', desc: '下一步的按鈕' },
  { name: 'default', params: '—', desc: '補充內容（例如失敗原因清單），以淡底方塊呈現' },
  { name: 'icon / title / subTitle', params: '—', desc: '覆寫圖示、標題、副標題' },
]

const toast = useToast()

// ---- useNotification ----
const notify = useNotification()
const lastNotifyAction = ref('')
function notifyExport() {
  notify.success({
    title: '匯出完成',
    message: '9 月良率報表（xlsx，2.3 MB）',
    actions: [
      { label: '下載', onClick: () => (lastNotifyAction.value = '下載報表') },
      { label: '寄給我', onClick: () => (lastNotifyAction.value = '寄送報表') },
    ],
  })
}
function notifyDowntime() {
  notify.warning({
    title: 'SMT-02 停機',
    message: '錫膏印刷機異常，已停線 5 分鐘。',
    actions: [{ label: '查看', onClick: () => (lastNotifyAction.value = '查看停機') }],
  })
}
const notifySample = `// App.vue：放一次
<ChptNotificationHost placement="top-right" />

const notify = useNotification()
notify.warning({
  title: 'SMT-02 停機',
  message: '錫膏印刷機異常，已停線 5 分鐘。',
  actions: [{ label: '查看', onClick: () => router.push('/lines/smt-02') }],
})
const { close } = notify.info({ title: '上傳中…', duration: 0 })`
const notifyOptions = [
  { name: 'title / message', type: 'string', def: '—', desc: '標題（必填）與說明' },
  { name: 'type', type: "'info' | 'success' | 'warning' | 'danger'", def: "'info'", desc: '用 success / warning / error 捷徑時自動帶入' },
  { name: 'duration', type: 'number', def: '4500（有 actions 時 0）', desc: '自動關閉的毫秒數；0 = 不自動關閉' },
  { name: 'actions', type: '{ label, onClick, keepOpen? }[]', def: '[]', desc: '動作按鈕；第一個是主要按鈕' },
  { name: 'closable / onClose', type: 'boolean / () => void', def: 'true', desc: '× 按鈕／關閉時呼叫' },
  { name: 'Host props', type: "placement / max / ariaLabel", def: "'top-right' / 5 / '通知'", desc: '位置、同時最多幾則' },
]

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
  { name: 'color', type: 'string', def: "'bg-surface-tertiary'", desc: '骨架底色 class' },
  { name: 'fullWidth', type: 'boolean', def: 'false', desc: '是否全寬' },
]
const skeletonSlots = [{ name: 'default', params: '—', desc: '載入完成後顯示的實際內容' }]
</script>
