<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">🖱️</span>
        <h1 class="text-4xl font-bold text-content-primary">互動元件</h1>
      </div>
      <p class="text-content-secondary text-lg max-w-4xl">
        互動與回饋類元件：ChptTabs（頁籤）、ChptToast（全域提示）、ChptButton（按鈕）、
        ChptProgress（進度條）、ChptAlert（提示條）、ChptAvatar（頭像）、ChptTooltip（文字提示）。每個元件都附「Props / Events / Slots」與注意事項。
      </p>
    </div>

    <!-- ============ ChptTabs ============ -->
    <section id="chpt-tabs" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptTabs 頁籤</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>同一視窗內切換多個內容區塊（非導向路由）；可帶 icon 與計數 badge。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptTabs } from '@/components/library'</code>
      </p>

      <ChptTabs v-model="activeTab" :tabs="tabs" />

      <div class="mt-6">
        <ChptCodeBlock :code="tabsSample" />
      </div>

      <ApiTable of="ChptTabs" title="Props" :rows="tabsProps" />
      <ApiTable of="ChptTabs" title="Events" :rows="tabsEvents" />
      <ApiTable of="ChptTabs" title="Slots" :rows="tabsSlots" />

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>以 <code>v-model</code> 綁定目前 index；選項可設 <code>disabled</code> 禁止點擊，
        內容建議用 <code>#panel- 前綴插槽</code>（如 #panel-0）自訂；若只是導向不同路由，請改用 ChptTabNavigation。
      </p>
    </section>

    <!-- ============ ChptToast ============ -->
    <section id="chpt-toast" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptToast 全域提示</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>全域操作回饋（成功/失敗/警告/資訊）。<strong>容器需在 App 根層掛載一次</strong>，
        任一頁面即可用 <code>useToast()</code> 呼叫。
      </p>

      <div class="flex flex-wrap gap-3">
        <ChptButton color="success" size="sm" @click="toast.success('操作成功')">Success</ChptButton>
        <ChptButton color="info" size="sm" @click="toast.info('此為資訊提示')">Info</ChptButton>
        <ChptButton color="warning" size="sm" @click="toast.warning('請留意此警告')">Warning</ChptButton>
        <ChptButton color="danger" size="sm" @click="toast.error('操作失敗')">Error</ChptButton>
      </div>

      <p class="text-sm text-content-tertiary mt-4">掛載與使用：</p>
      <div class="mt-2">
        <ChptCodeBlock :code="toastSample" />
      </div>

      <ApiTable of="-" title="useToast 方法" :rows="toastMethods" />

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>ChptToast 為 Teleport 到 body 的全域容器；同一 App 只掛載一份，
        過多同時出現會自動堆疊於頂端。圖示依賴 Material Symbols 字型，請確認字型已載入。
      </p>
    </section>

    <!-- ============ ChptButton ============ -->
    <section id="chpt-button" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptButton 按鈕</h2>
      <p class="text-sm text-content-secondary mb-4">
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

      <ApiTable of="ChptButton" title="Props" :rows="btnProps" />
      <ApiTable of="ChptButton" title="Events" :rows="btnEvents" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>同時帶 <code>loading</code> 會忽略點擊並顯示 spinner；角標 <code>badgeBgColor</code>
        接受語意鍵（primary/success/…）。
      </p>
    </section>

    <!-- ============ ChptProgress ============ -->
    <section id="chpt-progress" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptProgress 進度條</h2>
      <p class="text-sm text-content-secondary mb-4">
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
      <ApiTable of="ChptProgress" title="Props" :rows="progressProps" />
      <ApiTable of="ChptProgress" title="Events" :rows="progressEvents" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>modelValue 自動夾在 0–100；<code>trackColor</code> 傳的是 Tailwind class（預設 neutral-100）。
      </p>
    </section>

    <!-- ============ ChptAlert ============ -->
    <section id="chpt-alert" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptAlert 提示條</h2>
      <p class="text-sm text-content-secondary mb-4">
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
      <ApiTable of="ChptAlert" title="Props" :rows="alertProps" />
      <ApiTable of="ChptAlert" title="Events" :rows="alertEvents" />
      <ApiTable of="ChptAlert" title="Slots" :rows="alertSlots" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong><code>show</code> 預設 true 控制顯示；內容可用 <code>#default</code> 自訂取代 <code>message</code>。
        info / success 以 role="status" 禮貌報讀，warning / danger 以 role="alert" 立即報讀。
      </p>
    </section>

    <!-- ============ ChptAvatar ============ -->
    <section id="chpt-avatar" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptAvatar 頭像</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>使用者、負責人、簽核人。沒有照片時顯示姓名縮寫；照片載入失敗也會自動退回縮寫。
      </p>
      <div class="flex flex-wrap items-end gap-4">
        <ChptAvatar name="王小明" size="xs" />
        <ChptAvatar name="Amy Lin" size="sm" variant="primary" />
        <ChptAvatar name="陳建宏" variant="success" show-status />
        <ChptAvatar name="Kevin Wu" size="lg" shape="square" variant="warning" />
        <ChptAvatar src="/no-such-photo.jpg" name="李佩珊" size="xl" variant="info" />
      </div>
      <div class="mt-4">
        <ChptCodeBlock :code="avatarSample" />
      </div>
      <ApiTable of="ChptAvatar" title="Props" :rows="avatarProps" />
    </section>

    <!-- ============ ChptTooltip ============ -->
    <section id="chpt-tooltip" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptTooltip 文字提示</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>圖示按鈕的補充說明、截斷文字的完整內容。滑鼠停留或鍵盤聚焦都會出現；
        要放互動內容（按鈕、連結）請改用 ChptPopover。
      </p>
      <div class="flex flex-wrap items-center gap-4">
        <ChptTooltip content="重新整理資料（每 30 秒自動更新）">
          <ChptButton size="sm" is-outline aria-label="重新整理">
            <span class="material-symbols-outlined text-base" aria-hidden="true">refresh</span>
          </ChptButton>
        </ChptTooltip>
        <ChptTooltip content="下方顯示" placement="bottom" theme="light">
          <ChptButton size="sm" is-outline>bottom / light</ChptButton>
        </ChptTooltip>
        <ChptTooltip content="已停機 42 分鐘" placement="right" theme="error">
          <ChptButton size="sm" is-outline>right / error</ChptButton>
        </ChptTooltip>
      </div>
      <div class="mt-4">
        <ChptCodeBlock :code="tooltipSample" />
      </div>
      <ApiTable of="ChptTooltip" title="Props" :rows="tooltipProps" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>提示會以 aria-describedby 掛到觸發元素上（螢幕閱讀器聚焦按鈕時會唸出）；
        游標可以移到提示上不讓它消失、任何時候按 Esc 都能關閉（WCAG 1.4.13）。層級為 z-tooltip，放在 Modal 裡也不會被蓋住。
      </p>
    </section>

    <section id="chpt-kanban" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptKanban 看板</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>工單、異常單、改善提案這類有狀態流程的清單：每一欄是一個狀態，卡片拖到下一欄就是推進流程。
        卡片是一個陣列（v-model），每張卡片的 <code>column-field</code> 記錄它在哪一欄。欄的 <code>limit</code> 是在製上限，超過時標紅；
        <code>can-move</code> 自訂規則 —— 這個範例不能從「待處理」直接跳到「結案」，也不能跳過品檢。
        鍵盤：Tab 到卡片，<kbd class="rounded border border-stroke-default px-1 text-xs">空白鍵</kbd>拿起、方向鍵移動、再按空白鍵放下，Escape 取消。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptKanban } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <ChptKanban
          v-model="issues"
          :columns="issueColumns"
          :can-move="issueCanMove"
          :is-locked="(c) => c.locked"
          :max-height="360"
          @move="onIssueMove"
          @card-click="(c) => (issueLog = `開啟 ${c.id}：${c.title}`)"
        >
          <template #card="{ card }">
            <div class="flex items-start justify-between gap-2">
              <span class="font-medium">{{ card.title }}</span>
              <ChptTag size="sm" :color="card.level === '高' ? 'danger' : card.level === '中' ? 'warning' : 'secondary'">{{ card.level }}</ChptTag>
            </div>
            <div class="mt-1.5 flex items-center justify-between text-xs text-content-tertiary">
              <span>{{ card.id }} · {{ card.machine }}</span>
              <span>{{ card.owner }}<template v-if="card.locked"> · 🔒</template></span>
            </div>
          </template>
        </ChptKanban>
        <p class="mt-2 text-xs text-content-tertiary" aria-live="polite">{{ issueLog || '拖曳卡片或點一張卡片' }}</p>
      </div>
      <div class="mt-6">
        <ChptCodeBlock :code="kanbanSample" />
      </div>
      <ApiTable of="ChptKanban" title="Props" :rows="kanbanProps" />
      <ApiTable of="ChptKanban" title="Events" :rows="kanbanEvents" />
      <ApiTable of="ChptKanban" title="Slots" :rows="kanbanSlots" />
    </section>

    <!-- ============ ChptDefectAnnotator ============ -->
    <section id="chpt-defect-annotator" class="mb-12 bg-surface-primary rounded-xl shadow-md p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptDefectAnnotator 缺陷標註</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>目檢、IPQC、客訴分析時在產品照片或 PCB 圖上標出缺陷位置。點一下放編號標記，或切到「框」拖出範圍；
        標記可拖曳移動，選類型會套用到選取中的標記。座標存成 0–1 的比例，縮圖、全螢幕、列印都落在同一位置。
        鍵盤：在標註區按 <kbd class="rounded border border-stroke-default px-1 text-xs">Enter</kbd> 於中央新增，Tab 到標記後方向鍵微調（Shift 加大）、Delete 刪除。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptDefectAnnotator } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <ChptDefectAnnotator
          v-model="defectMarks"
          :src="pcbImage"
          alt="PCB-A12 正面"
          :defect-types="defectTypes"
          :max-height="360"
        />
        <div class="mt-3 flex items-center gap-3">
          <ChptSwitch v-model="defectReadonly" label="唯讀檢視" />
        </div>
        <ChptDefectAnnotator
          v-if="defectReadonly"
          class="mt-3"
          :model-value="defectMarks"
          :src="pcbImage"
          alt="PCB-A12 正面（唯讀）"
          :defect-types="defectTypes"
          :max-height="200"
          :show-list="false"
          readonly
        />
      </div>
      <ChptCodeBlock class="mt-6" :code="defectSample" />
      <ApiTable of="ChptDefectAnnotator" title="Props" :rows="defectProps" />
      <ApiTable of="ChptDefectAnnotator" title="Events" :rows="defectEvents" />
      <ApiTable of="ChptDefectAnnotator" title="方法（ref）" :rows="defectMethods" />
      <ApiTable of="-" title="DefectMark" :rows="defectMarkFields" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>標記的位置是相對於圖片的比例，所以要用同一張（或同比例的）圖片顯示，標記才會對得上。
        <code>defectTypes</code> 的顏色是任何 CSS 顏色，建議選在照片上分得出來的飽和色；圓點有白邊，在深色背景上也看得到。
      </p>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  ChptTabs,
  useToast,
  ChptButton,
  ChptProgress,
  ChptAlert,
  ChptAvatar,
  ChptTooltip,
  ChptCodeBlock,
  ChptKanban,
  ChptTag,
  ChptDefectAnnotator,
  ChptSwitch,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

// ---- DefectAnnotator ----
/** 範例用的 PCB 示意圖（SVG） */
const pcbSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
<rect width="640" height="400" rx="16" fill="#14532d"/><rect x="8" y="8" width="624" height="384" rx="12" fill="#166534"/>
<g fill="#facc15"><circle cx="30" cy="30" r="9"/><circle cx="610" cy="30" r="9"/><circle cx="30" cy="370" r="9"/><circle cx="610" cy="370" r="9"/></g>
<g stroke="#ca8a04" stroke-width="3" fill="none" opacity=".8"><path d="M120 120H260V200H420"/><path d="M120 280H300V240H500"/><path d="M500 120V320"/></g>
<rect x="250" y="150" width="140" height="100" rx="6" fill="#111827"/>
<g fill="#d1d5db">${Array.from({ length: 10 }, (_, i) => `<rect x="${258 + i * 13}" y="140" width="6" height="10"/><rect x="${258 + i * 13}" y="250" width="6" height="10"/>`).join('')}</g>
<rect x="80" y="90" width="70" height="50" rx="4" fill="#1f2937"/><rect x="460" y="70" width="90" height="40" rx="4" fill="#1f2937"/>
<g fill="#78350f">${Array.from({ length: 6 }, (_, i) => `<rect x="${90 + i * 32}" y="310" width="18" height="36" rx="3"/>`).join('')}</g>
<g fill="#e5e7eb">${Array.from({ length: 6 }, (_, i) => `<rect x="${90 + i * 32}" y="306" width="18" height="6"/><rect x="${90 + i * 32}" y="342" width="18" height="6"/>`).join('')}</g>
<text x="460" y="370" font-family="monospace" font-size="16" fill="#f0fdf4">PCB-A12 R3</text></svg>`
const pcbImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pcbSvg)}`
const defectTypes = [
  { value: 'short', label: '短路', color: '#ef4444' },
  { value: 'open', label: '空焊', color: '#f59e0b' },
  { value: 'scratch', label: '刮傷', color: '#3b82f6' },
  { value: 'missing', label: '缺件', color: '#a855f7' },
]
const defectMarks = ref([
  { id: 'd1', x: 0.47, y: 0.37, type: 'short', note: 'U3 第 4、5 腳錫橋' },
  { id: 'd2', x: 0.13, y: 0.75, w: 0.21, h: 0.14, type: 'scratch' },
  { id: 'd3', x: 0.79, y: 0.24, type: 'open' },
])
const defectReadonly = ref(false)
const defectSample = `<ChptDefectAnnotator
  v-model="marks"
  :src="photoUrl"
  alt="PCB-A12 正面"
  :defect-types="[
    { value: 'short', label: '短路', color: '#ef4444' },
    { value: 'open', label: '空焊', color: '#f59e0b' },
  ]"
/>

// marks：[{ id: 'd1', x: 0.47, y: 0.37, type: 'short', note: 'U3 錫橋' },
//         { id: 'd2', x: 0.13, y: 0.75, w: 0.21, h: 0.14, type: 'open' }]`
const defectProps = [
  { name: 'modelValue', type: 'DefectMark[]', def: '[]', desc: '標記清單（v-model）' },
  { name: 'src / alt', type: 'string', def: '— / \'\'', desc: '圖片網址／替代文字（也會放進標註區的名稱）' },
  { name: 'defectTypes', type: 'DefectType[]', def: '一種「缺陷」', desc: '缺陷類型 { value, label, color }；工具列顯示各類型的數量' },
  { name: 'maxHeight', type: 'number', def: '480', desc: '圖片最大高度（px），寬度依比例' },
  { name: 'showList', type: 'boolean', def: 'true', desc: '顯示標記清單（編號、類型、備註、刪除）' },
  { name: 'defaultTool', type: "'point' | 'rect'", def: "'point'", desc: '預設標記方式：點一下或拖曳出框' },
  { name: 'readonly / disabled', type: 'boolean', def: 'false', desc: '唯讀（可點選看清單，不能修改）／禁用' },
]
const defectEvents = [
  { name: 'update:modelValue', params: '(marks: DefectMark[])', desc: '新增、移動、改類型、改備註、刪除時' },
  { name: 'add / remove', params: '(mark: DefectMark)', desc: '新增／刪除一個標記' },
  { name: 'select', params: '(id: string | null)', desc: '選取改變' },
]
const defectMethods = [{ name: 'select(id)', type: '(id: string | null) => void', desc: '選取並聚焦某個標記；null 取消選取' }]
const defectMarkFields = [
  { name: 'id', type: 'string', def: '—', desc: '新增時自動產生 d1、d2…' },
  { name: 'x / y', type: 'number（0–1）', def: '—', desc: '點的位置，或框的左上角（相對於圖片寬高的比例）' },
  { name: 'w / h', type: 'number（0–1）', def: '—', desc: '框的寬高；點沒有' },
  { name: 'type / note', type: 'string', def: '—', desc: '缺陷類型（defectTypes 的 value）／備註' },
]

// ---- Kanban ----
const issueColumns = [
  { id: 'todo', title: '待處理', color: 'rgb(var(--t-chart-8))' },
  { id: 'doing', title: '處理中', color: 'rgb(var(--t-chart-1))', limit: 3 },
  { id: 'qa', title: '品檢確認', color: 'rgb(var(--t-chart-4))' },
  { id: 'done', title: '結案', color: 'rgb(var(--t-success-solid))' },
]
const FLOW = ['todo', 'doing', 'qa', 'done']
/** 往前只能一次走一步（不能跳過品檢）；往回退可以 */
const issueCanMove = (_card, from, to) => FLOW.indexOf(to) <= FLOW.indexOf(from) + 1
const issues = ref([
  { id: 'AB-1021', title: 'SMT-3 吸嘴堵塞', machine: 'SMT-3', owner: '王小明', level: '高', status: 'todo' },
  { id: 'AB-1022', title: 'AOI 誤判率偏高', machine: 'AOI-1', owner: '陳大文', level: '中', status: 'todo' },
  { id: 'AB-1019', title: '回焊爐 A-03 溫度偏高', machine: 'RF-A03', owner: '林美華', level: '高', status: 'doing' },
  { id: 'AB-1017', title: '錫膏印刷偏移', machine: 'SP-2', owner: '王小明', level: '中', status: 'doing' },
  { id: 'AB-1015', title: '治具磨損', machine: 'ICT-1', owner: '張志強', level: '低', status: 'qa' },
  { id: 'AB-1009', title: '鋼板張力不足', machine: 'SP-1', owner: '林美華', level: '低', status: 'done', locked: true },
])
const issueLog = ref('')
function onIssueMove({ card, from, to }) {
  const title = (id) => issueColumns.find((c) => c.id === id).title
  issueLog.value = `${card.id}：${title(from)} → ${title(to)}`
}
const kanbanSample = `<ChptKanban v-model="issues" :columns="columns" :can-move="canMove" @move="save">
  <template #card="{ card }">
    <strong>{{ card.title }}</strong>
    <small>{{ card.id }} · {{ card.owner }}</small>
  </template>
</ChptKanban>

const columns = [
  { id: 'todo', title: '待處理' },
  { id: 'doing', title: '處理中', limit: 3 }, // 在製上限
  { id: 'qa', title: '品檢確認' },
  { id: 'done', title: '結案' },
]
// 卡片的 status 欄位記錄它在哪一欄（column-field 預設 'status'、key-field 預設 'id'）
const issues = ref([{ id: 'AB-1021', title: 'SMT-3 吸嘴堵塞', status: 'todo' }, ...])
// 往前只能一次走一步
const canMove = (card, from, to) => FLOW.indexOf(to) <= FLOW.indexOf(from) + 1`
const kanbanProps = [
  { name: 'modelValue', type: 'T[]', def: '—', desc: '卡片（v-model）；同一欄的順序就是陣列順序' },
  { name: 'columns', type: 'KanbanColumn[]', def: '—', desc: '{ id, title, limit?（在製上限）, color? }' },
  { name: 'keyField / columnField / titleField', type: 'string', def: "'id' / 'status' / 'title'", desc: '卡片的唯一鍵、所在欄、預設內容用的標題欄位' },
  { name: 'canMove', type: '(card, from, to) => boolean', def: '—', desc: '自訂移動規則；不允許的欄拖過去時顯示禁止、鍵盤移動時跳過' },
  { name: 'enforceLimit', type: 'boolean', def: 'false', desc: '不能放進已達在製上限的欄（沒開時可以放，但欄會標紅）' },
  { name: 'isLocked', type: '(card) => boolean', def: '—', desc: '不能拖曳的卡片' },
  { name: 'disabled', type: 'boolean', def: 'false', desc: '整個看板不能拖曳' },
  { name: 'columnWidth / maxHeight', type: 'number', def: '272 / —', desc: '欄寬；卡片區的最大高度（px，超過時捲動）' },
  { name: 'emptyText / ariaLabel', type: 'string', def: '語系', desc: '空欄的文字；區域名稱' },
]
const kanbanEvents = [
  { name: 'update:modelValue', params: '(cards: T[])', desc: '移動後的新陣列（被移的卡片是新物件，所在欄已更新）' },
  { name: 'move', params: '({ card, from, to, index })', desc: '移動了一張卡片（適合在這裡存到後端）' },
  { name: 'card-click', params: '(card: T)', desc: '點擊卡片（沒有拖曳）或在卡片上按 Enter' },
]
const kanbanSlots = [
  { name: 'card', params: '{ card, column }', desc: '卡片內容' },
  { name: 'column-header', params: '{ column, cards }', desc: '欄標題' },
  { name: 'column-footer', params: '{ column, cards }', desc: '欄底部（例如「新增卡片」按鈕）' },
  { name: 'empty', params: '{ column }', desc: '空欄的內容' },
]

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
  { name: 'disabledTab', type: '(tab) => boolean', def: '—', desc: '動態判斷某個頁籤是否停用；與 tab.disabled 任一為 true 即停用' },
]
const tabsEvents = [
  { name: 'update:modelValue', params: '(value: number)', desc: 'index 變更' },
  { name: 'change', params: '(index: number)', desc: '切換完成' },
]
const tabsSlots = [
  { name: 'panel-<index>', params: '{ tab }', desc: '第 index 個面板內容' },
  { name: 'panel', params: '{ tab, index }', desc: '未指定 panel-N 時的內容；兩者都沒給時顯示 tab.content' },
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
  { name: 'badgeBgColor / badgeTextColor', type: 'string', def: "'danger' / 'white'", desc: '角標的背景色與文字色' },
  { name: 'class', type: 'string', def: '—', desc: '附加在按鈕上的 class' },
]
const btnEvents = [{ name: 'click', params: '(event: MouseEvent)', desc: '點擊（禁用/載入中不觸發）' }]

const progressProps = [
  { name: 'modelValue', type: 'number', def: '0', desc: '進度 0–100（v-model）' },
  { name: 'status', type: "'primary'|'success'|'warning'|'danger'|'info'", def: "'primary'", desc: '狀態色' },
  { name: 'strokeWidth', type: 'number', def: '8', desc: '進度條高度(px)' },
  { name: 'trackColor', type: 'string', def: "''（neutral-100）", desc: '軌道底色 class' },
  { name: 'showLabel', type: 'boolean', def: 'true', desc: '右側百分比標籤' },
  { name: 'ariaLabel', type: 'string', def: "'進度'", desc: '進度條的無障礙名稱' },
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

// ===== ChptAvatar / ChptTooltip =====
const avatarSample = `<ChptAvatar name="王小明" />
<ChptAvatar :src="user.photo" :name="user.name" size="lg" show-status />`
const avatarProps = [
  { name: 'src / alt', type: 'string', def: "''", desc: '照片與替代文字（載入失敗時退回縮寫）' },
  { name: 'name', type: 'string', def: "''", desc: '姓名：產生縮寫，也是文字頭像的可及名稱' },
  { name: 'size', type: "'xs'|'sm'|'md'|'lg'|'xl'", def: "'md'", desc: '尺寸' },
  { name: 'shape', type: "'circle'|'square'", def: "'circle'", desc: '形狀' },
  { name: 'variant', type: "'primary'|'success'|'warning'|'danger'|'info'|'neutral'…", def: "'neutral'", desc: '文字頭像底色' },
  { name: 'showStatus / statusColor', type: 'boolean / string', def: "false / 'bg-success-solid'", desc: '右下角狀態點' },
]
const tooltipSample = `<ChptTooltip content="重新整理資料" placement="top">
  <ChptButton aria-label="重新整理">…</ChptButton>
</ChptTooltip>`
const tooltipProps = [
  { name: 'content', type: 'string', def: "''", desc: '提示文字（或用 #content 插槽）' },
  { name: 'placement', type: "'top'|'bottom'|'left'|'right'", def: "'top'", desc: '位置（超出視窗時會夾回畫面內）' },
  { name: 'theme', type: "'dark'|'light'|'info'|'warning'|'error'", def: "'dark'", desc: '配色' },
  { name: 'showArrow / maxWidth / disabled', type: 'boolean / string / boolean', def: "true / 'max-w-xs' / false", desc: '箭頭、最大寬度 class、停用' },
]
</script>
