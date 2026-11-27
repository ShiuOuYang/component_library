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
    <section id="chpt-tabs" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
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
    <section id="chpt-toast" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
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
    <section id="chpt-button" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
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
    <section id="chpt-progress" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
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
    <section id="chpt-alert" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
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
    <section id="chpt-avatar" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
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
    <section id="chpt-tooltip" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
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

    <section id="chpt-kanban" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
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
    <section id="chpt-defect-annotator" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
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

    <!-- ============ ChptImageCompare ============ -->
    <section id="chpt-image-compare" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptImageCompare 影像比對</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>比對兩張同視野的影像 —— 標準樣品與待測品、修改前後、上次與這次的 AOI 影像。
        三種方式：<strong>滑桿</strong>（拖分隔線看左右）、<strong>並排</strong>、<strong>疊圖</strong>（調透明度；「差異」模式相同處變黑、不同處發亮，缺件、偏移一眼看出）。
        三種方式與並排的兩格<strong>共用同一個縮放與位置</strong>：放大看某個零件後切換方式，看到的仍是同一塊。
        雙擊放大 / 還原、Ctrl + 滾輪或兩指縮放、放大後拖曳平移；鍵盤 + / − / 0 縮放、方向鍵平移，分隔線可用方向鍵移動（Shift 一次 10%）。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptImageCompare } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <ChptImageCompare v-model:mode="compareMode" :before="pcbImage" :after="pcbAfterImage" before-label="標準樣品" after-label="待測 #0427" />
        <p class="mt-3 text-sm text-content-secondary">待測品的差異：右上 IC 偏移旋轉、下排第 4 顆電容缺件、中間 IC 左側錫橋 —— 切到「疊圖 → 差異」最明顯。</p>
      </div>
      <ChptCodeBlock class="mt-6" :code="compareSample" />
      <ApiTable of="ChptImageCompare" title="Props" :rows="compareProps" />
      <ApiTable of="ChptImageCompare" title="Events" :rows="compareEvents" />
      <ApiTable of="ChptImageCompare" title="方法（ref）" :rows="compareMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>兩張影像要同視野、同解析度（相機固定、治具定位）；大小不同時 after 會拉伸到 before 的大小。
        跨網域的影像不影響顯示（只用 CSS 疊合，不讀像素）。
      </p>
    </section>

    <!-- ============ ChptTimeScrubber ============ -->
    <section id="chpt-time-scrubber" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptTimeScrubber 時間軸回放</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>把一段時間的資料「重播」—— 異常前後機台參數怎麼變、一個班的狀態怎麼演變。
        拖曳播放頭或點軌道跳到某個時間；按播放依倍速往前走（60× = 1 秒播 1 分鐘）。軌道上的菱形是事件（警報、換線），點了跳過去，
        也可以用「上一個 / 下一個事件」。拖兩端的把手只看一段，播放只在範圍內。
        傳入 <code>useChartSync()</code> 的結果，播放頭就是圖表的十字線、範圍就是圖表的 X 軸。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptTimeScrubber } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <ChptTimeScrubber
          v-model="replayAt"
          v-model:range="replayRange"
          v-model:playing="replayPlaying"
          :start="replayStart"
          :end="replayEnd"
          :events="replayEvents"
          :speeds="[60, 300, 900]"
          :speed="300"
          :sync="replaySync"
          @event-click="(e) => toast.info(e.label)"
        />
        <p class="mt-3 text-sm text-content-secondary">{{ replayReadout }}</p>
        <div v-for="c in replayCharts" :key="c.key" class="mt-2" style="height: 170px">
          <DualAxisComboChart
            v-bind="replaySync.bind()"
            auto-resize
            :layers="c.layers"
            x-scale-type="time"
            :x-axis-format="replayHHmm"
            :y-left-axis-label="c.label"
            :y-left-domain="c.domain"
            :margin="{ top: 12, right: 16, bottom: 32, left: 64 }"
            :animation-duration="0"
          />
        </div>
      </div>
      <ChptCodeBlock class="mt-6" :code="replaySample" />
      <ApiTable of="ChptTimeScrubber" title="Props" :rows="replayProps" />
      <ApiTable of="-" title="TimelineEvent（events 的每一筆）" :rows="replayEventRows" />
      <ApiTable of="ChptTimeScrubber" title="Events" :rows="replayEmits" />
      <ApiTable of="ChptTimeScrubber" title="方法（ref）" :rows="replayMethods" />
    </section>

    <!-- ============ ChptShiftRoster ============ -->
    <section id="chpt-shift-roster" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptShiftRoster 排班表</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>產線、品保、設備課的輪班表。<strong>填入</strong>：選好班別後點格子，按住拖曳填一整段、Shift + 點填到上一次點的位置；
        <strong>交換</strong>：把一格拖到同一天另一個人身上互換。下方是每天每班排了幾人 / 需要幾人（不足紅字 ▲）；
        兩班之間休息不足（例如中班接隔天早班只隔 8 小時）、連續上班太多天會標 ⚠ 提醒（不阻止）。
        鍵盤：方向鍵移動、按班別快捷鍵（D / E / N / O）直接填入、Delete 清除；交換模式空白鍵拿起、上下移動、空白鍵放下。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptShiftRoster } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <ChptShiftRoster
          v-model="roster"
          :people="rosterPeople"
          :shifts="rosterShifts"
          start="2026-11-23"
          :days="7"
          :requirements="rosterRequirement"
          label="SMT 一線 11/23 週排班"
        />
      </div>
      <ChptCodeBlock class="mt-6" :code="rosterSample" />
      <ApiTable of="ChptShiftRoster" title="Props" :rows="rosterProps" />
      <ApiTable of="-" title="RosterShift / RosterPerson" :rows="rosterDataRows" />
      <ApiTable of="ChptShiftRoster" title="Events" :rows="rosterEvents" />
      <ApiTable of="ChptShiftRoster" title="方法（ref）" :rows="rosterMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>休息時間用班別的 <code>start</code> / <code>end</code> 計算（下班時間 ≤ 上班時間表示跨夜，例如夜班 22:00 – 06:00）；
        沒給時間的班別不檢查。規則只提醒不阻止 —— 調班、支援常有例外，由排班的人決定。
      </p>
    </section>

    <!-- ============ ChptScheduler ============ -->
    <section id="chpt-scheduler" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptScheduler 週 / 日行事曆</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>設備預約、會議室、保養排程。週檢視看 7 天、日檢視可依<strong>資源</strong>（機台、會議室、人）分欄；時間重疊的事件自動並排。
        空白處拖曳建立（送出 <code>create</code>，由你決定要不要新增、要不要先開表單）、拖曳事件移動（可換天 / 換資源）、拉下緣調整長度，都會吸附到 15 分鐘；
        同一資源時間重疊標 ⚠。點週檢視的日期可跳到那天的日檢視。紅線是現在時間。
        鍵盤：Tab 到事件後方向鍵上下移動、左右換天 / 換資源、Shift + 上下調整長度、Delete 刪除。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptScheduler } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <div class="mb-3 flex flex-wrap items-center gap-3 text-sm text-content-secondary">
          <ChptSwitch v-model="schedByResource" label="日檢視依機台分欄" />
        </div>
        <ChptScheduler
          v-model:events="schedEvents"
          v-model:view="schedView"
          :resources="schedByResource ? schedResources : []"
          :day-start="6"
          :day-end="22"
          :height="460"
          @create="schedCreate"
          @change="({ event, kind }) => (schedLog = `${event.title} ${kind === 'move' ? '移到' : '改為'} ${schedTime(event.start)} – ${schedTime(event.end)}`)"
          @delete="(e) => ((schedEvents = schedEvents.filter((x) => x.id !== e.id)), (schedLog = `刪除 ${e.title}`))"
          @select="(e) => (schedLog = `選取 ${e.title}`)"
        />
        <p class="mt-2 text-xs text-content-secondary" aria-live="polite">{{ schedLog || '（建立、移動、調整時顯示）' }}</p>
      </div>
      <ChptCodeBlock class="mt-6" :code="schedSample" />
      <ApiTable of="ChptScheduler" title="Props" :rows="schedProps" />
      <ApiTable of="-" title="SchedEvent / SchedResource" :rows="schedDataRows" />
      <ApiTable of="ChptScheduler" title="Events" :rows="schedEmits" />
      <ApiTable of="ChptScheduler" title="方法（ref）" :rows="schedMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>時間一律用瀏覽器的本地時區；<code>start</code> / <code>end</code> 可以是毫秒、ISO 字串或 Date，元件改過的事件會回傳毫秒。
        跨午夜的事件會在兩天各畫一段。衝突只標示不阻止 —— 要不要允許重疊由使用端在 <code>change</code> 裡決定（可以把 <code>v-model:events</code> 改回原值）。
      </p>
    </section>

    <!-- ============ ChptSortableList ============ -->
    <section id="chpt-sortable-list" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptSortableList 拖曳排序清單</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>製程步驟順序、點檢項目、選單設定、工單排程。拖曳左側把手排序（觸控也可以）；<code>max-depth</code> 大於 1 時可以巢狀 ——
        拖曳時往右移成為上一項的子項、往左移回上一層；有子項的可以收合。<code>locked</code> 的項目固定不動。
        鍵盤：Tab 到把手後按空白鍵拿起、上下方向鍵移動、左右方向鍵調整層級、空白鍵放下、Esc 取消。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptSortableList } from '@/components/library'</code>
      </p>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
          <h3 class="text-sm font-semibold text-content-secondary mb-2">製程路線（兩層）</h3>
          <ChptSortableList v-model="sortRoute" :max-depth="2" label="製程路線" @change="sortOnChange" />
          <p class="mt-2 text-xs text-content-secondary" aria-live="polite">{{ sortLog || '（拖曳或用鍵盤調整）' }}</p>
          <p class="mt-1 text-xs text-content-tertiary">順序：{{ sortOrder }}</p>
        </div>
        <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
          <h3 class="text-sm font-semibold text-content-secondary mb-2">工單排程（兩個清單互相拖曳，<code>group="orders"</code>）</h3>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p class="mb-1 text-xs text-content-secondary">待排（{{ sortBacklog.length }}）</p>
              <ChptSortableList v-model="sortBacklog" group="orders" label="待排工單" :handle="false" />
            </div>
            <div>
              <p class="mb-1 text-xs text-content-secondary">今日 SMT 一線（{{ sortToday.length }}）</p>
              <ChptSortableList v-model="sortToday" group="orders" label="今日排程" :handle="false" empty-text="拖工單到這裡排入" @add="(c) => (sortLog2 = `排入 ${c.item.label}`)" />
            </div>
          </div>
          <p class="mt-2 text-xs text-content-secondary" aria-live="polite">{{ sortLog2 || '（整列都可以拖）' }}</p>
        </div>
      </div>
      <ChptCodeBlock class="mt-6" :code="sortSample" />
      <ApiTable of="ChptSortableList" title="Props" :rows="sortProps" />
      <ApiTable of="-" title="SortItem（modelValue 的每一項）" :rows="sortItemRows" />
      <ApiTable of="ChptSortableList" title="Events" :rows="sortEvents" />
      <ApiTable of="ChptSortableList" title="Slots" :rows="sortSlots" />
      <ApiTable of="ChptSortableList" title="方法（ref）" :rows="sortMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>拖曳用指標事件實作（不用 HTML5 拖放），所以手機、平板也能拖；按 Esc 可以取消正在進行的拖曳。
        <code>:handle="false"</code> 時整列都會攔下觸控，手指在列上無法捲動頁面 —— 清單長、主要在手機上用時建議保留把手。
        <code>can-drop</code> 可以加規則，例如「檢驗站底下不能再放子步驟」。鍵盤移動時先在畫面上預覽，放下才送出 <code>update:modelValue</code>。
      </p>
    </section>

    <!-- ============ ChptCommentThread ============ -->
    <section id="chpt-comment-thread" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptCommentThread 留言串</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>異常處理紀錄、審查意見、工單討論。留言與回覆（兩層）、用 <code>@</code> 提及同事（ChptMentionInput）、編輯、刪除（兩步確認，有回覆的留言改成「已刪除」佔位）；
        最上層的留言可以標記為已解決（整串收起來），也可以重新開啟；有已解決的留言時可篩選「未解決」。時間顯示「3 分鐘前」並每分鐘更新，滑過看完整時間。
        只能改自己的留言；<code>moderator</code> 可以改所有人的。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptCommentThread } from '@/components/library'</code>
      </p>
      <div class="mb-3 flex flex-wrap items-center gap-3 text-sm text-content-secondary">
        <ChptSegmented v-model="cmtUserId" :options="cmtUserOptions" aria-label="目前登入" size="xs" />
        <ChptSwitch v-model="cmtModerator" label="管理者（可改所有人的留言）" />
      </div>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <ChptCommentThread
          v-model="cmtItems"
          :current-user="cmtUser"
          :triggers="cmtTriggers"
          :moderator="cmtModerator"
          title="異常 #A-1125-03 爐溫偏高 討論"
          @create="({ mentions }) => (cmtLog = mentions.length ? `通知：${mentions.map((m) => m.label).join('、')}` : '已送出')"
          @resolve="({ resolved }) => (cmtLog = resolved ? '已結案' : '重新開啟')"
        />
        <p class="mt-2 text-xs text-content-secondary" aria-live="polite">{{ cmtLog || '（留言時 @ 到的人會收到通知）' }}</p>
      </div>
      <ChptCodeBlock class="mt-6" :code="cmtSample" />
      <ApiTable of="ChptCommentThread" title="Props" :rows="cmtProps" />
      <ApiTable of="-" title="CommentItem（modelValue 的每一則）" :rows="cmtItemRows" />
      <ApiTable of="ChptCommentThread" title="Events" :rows="cmtEvents" />
      <ApiTable of="ChptCommentThread" title="方法（ref）" :rows="cmtMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>元件只負責畫面與操作，存檔、權限檢查、通知請在 <code>create</code> / <code>edit</code> / <code>remove</code> / <code>resolve</code> 事件裡呼叫 API；
        <code>create</code> 與 <code>edit</code> 事件會給提及清單，方便通知被 @ 的人（編輯時只給新增的提及）。
        留言內容是提及標記字串，要在別處顯示時用 <code>parseMentions</code> 拆開。
      </p>
    </section>

    <!-- ============ ChptFishbone ============ -->
    <section id="chpt-fishbone" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptFishbone 魚骨圖（特性要因圖）</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>品質異常分析、8D 報告的 D4 根本原因。右邊魚頭是問題，大骨是分類（預設 5M1E：人員、機器、材料、方法、環境、量測），原因接在大骨上，最多 3 層。
        原因可以標記<strong>主要原因</strong>、<strong>已驗證</strong>、<strong>已排除</strong>。<code>editable</code> 時直接在圖上操作：點大骨旁的 + 新增原因、雙擊或 Enter 編輯、
        選取後用上方工具列標記或刪除；鍵盤 Insert 新增次要原因、Delete 刪除、P / V / X 標記。<code>v-model</code> 是結構化資料，可以存檔或輸出文字大綱。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptFishbone, fishboneOutline } from '@/components/library'</code>
      </p>
      <div class="flex flex-wrap items-center gap-3 mb-3">
        <ChptSwitch v-model="fishEditable" size="sm" label="編輯模式" />
        <ChptButton size="sm" variant="secondary" icon="content_copy" @click="fishShowOutline = !fishShowOutline">{{ fishShowOutline ? '隱藏' : '顯示' }}文字大綱</ChptButton>
      </div>
      <ChptFishbone v-model="fishData" :editable="fishEditable" label="SMT 二線錫橋不良的魚骨圖" @select="(id) => (fishSelected = id)" />
      <pre v-if="fishShowOutline" class="mt-3 max-h-64 overflow-auto rounded-md border border-stroke-light bg-surface-secondary p-3 text-xs text-content-primary">{{ fishOutline }}</pre>
      <ChptCodeBlock class="mt-6" :code="fishSample" />
      <ApiTable of="ChptFishbone" title="Props" :rows="fishProps" />
      <ApiTable of="-" title="FishboneData / FishCause" :rows="fishDataRows" />
      <ApiTable of="ChptFishbone" title="Events" :rows="fishEvents" />
      <ApiTable of="ChptFishbone" title="方法（ref）" :rows="fishMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>沒給 <code>v-model</code> 時以 5M1E 空白分類開始；分類可以自己定（例如 4M、6M 或依製程站別），分類名稱可以在圖上改。
        原因很多時圖會變寬，外框可以左右捲動；用 <code>max-height</code> 限制高度。主要原因與已排除互斥。
      </p>
    </section>

    <!-- ============ ChptFmeaTable ============ -->
    <section id="chpt-fmea-table" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptFmeaTable FMEA 分析表</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>製程 FMEA（PFMEA）與設計 FMEA（DFMEA）。每列一個失效模式，評<strong>嚴重度 S、發生度 O、偵測度 D</strong>（1–10），
        自動算出 <strong>RPN</strong>（S × O × D）與 AIAG-VDA 的<strong>處置優先等級 AP</strong>（H / M / L）。RPN 會讓不同組合乘出一樣的數字，
        AP 先看嚴重度、再看發生度、最後看偵測度，嚴重度高的失效不會被低分掩蓋，兩者都顯示。
        展開一列可以編輯影響、原因、管制、特殊特性（CC / SC）、改善對策（負責人、期限、完成），以及對策完成後的<strong>重新評分</strong>。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptFmeaTable, fmeaSummary } from '@/components/library'</code>
      </p>
      <div class="flex flex-wrap items-center gap-3 mb-3">
        <ChptSwitch v-model="fmeaEditable" size="sm" label="編輯模式" />
      </div>
      <ChptFmeaTable v-model="fmeaRows" :editable="fmeaEditable" title="SMT 二線 PFMEA" :threshold="100" today="2026-11-27" filename="smt-line2-pfmea" />
      <ChptCodeBlock class="mt-6" :code="fmeaSample" />
      <ApiTable of="ChptFmeaTable" title="Props" :rows="fmeaProps" />
      <ApiTable of="-" title="FmeaRow / FmeaAction" :rows="fmeaDataRows" />
      <ApiTable of="ChptFmeaTable" title="Events" :rows="fmeaEvents" />
      <ApiTable of="ChptFmeaTable" title="方法（ref）" :rows="fmeaMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>AP 依 AIAG-VDA FMEA 手冊（2019）的查表；嚴重度 1 一律為 L。RPN 門檻（<code>threshold</code>）只用來標紅，
        不影響 AP；只想看 AP 時設成 <code>Infinity</code>。對策期限當天不算逾期，用的是當地日期。匯出 CSV 匯出的是目前篩選與排序後的列。
      </p>
    </section>

    <!-- ============ ChptLabelDesigner ============ -->
    <section id="chpt-label-designer" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptLabelDesigner 標籤設計器</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>產品標籤、外箱 / 棧板標籤、物料標籤。以 mm 為單位設計：文字、Code 128 / Code 39 條碼、QR code、線條、方框、圖片；
        拖曳移動與改大小，會貼齊格線、其他元素與標籤中線（洋紅色參考線）。內容寫成 <code v-pre>{{lotNo}}</code> 這種欄位，預覽、列印、匯出時代入資料。
        <code>v-model</code> 是版面 JSON（存到資料庫、之後再編輯），另可下載 PNG（依標籤機 DPI）、列印（一筆資料一張）、輸出 ZPL 給 Zebra 標籤機。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptLabelDesigner, labelToZpl } from '@/components/library'</code>
      </p>
      <div class="flex flex-wrap items-center gap-3 mb-3">
        <ChptSegmented v-model="labelRecordIdx" :options="labelRecordOptions" aria-label="資料" size="xs" />
        <ChptButton size="sm" variant="secondary" icon="print" @click="labelRef?.print(labelRecords)">列印 3 筆</ChptButton>
        <ChptButton size="sm" variant="secondary" icon="code" @click="labelShowZpl = !labelShowZpl">{{ labelShowZpl ? '隱藏' : '顯示' }} ZPL</ChptButton>
      </div>
      <ChptLabelDesigner
        ref="labelRef"
        v-model="labelDoc"
        v-model:preview="labelPreview"
        :data="labelRecords[labelRecordIdx]"
        :fields="labelFields"
        :field-labels="labelFieldLabels"
        export-name="carton-label"
        label="外箱標籤"
      />
      <pre v-if="labelShowZpl" class="mt-3 max-h-64 overflow-auto rounded-md border border-stroke-light bg-surface-secondary p-3 text-xs text-content-primary" data-zpl>{{ labelZpl }}</pre>
      <ChptCodeBlock class="mt-6" :code="labelSample" />
      <ApiTable of="ChptLabelDesigner" title="Props" :rows="labelProps" />
      <ApiTable of="-" title="LabelDoc / LabelElement" :rows="labelDataRows" />
      <ApiTable of="ChptLabelDesigner" title="Events" :rows="labelEvents" />
      <ApiTable of="ChptLabelDesigner" title="方法（ref）" :rows="labelMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>條碼的寬度由元素寬度決定，左右請自行留白（靜區至少 10 倍模組寬，約 2～3 mm）才好掃。
        ZPL 的文字使用印表機內建字型 0（中文需要印表機有安裝對應字型），圖片不輸出；需要和畫面完全一樣時用 PNG 或列印。
        列印時頁面大小等於標籤大小，請在列印對話框把邊界設為「無」。
      </p>
    </section>

    <!-- ============ ChptSkillMatrix ============ -->
    <section id="chpt-skill-matrix" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptSkillMatrix 技能矩陣</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>作業員 × 工站 / 技能的多能工管理。等級 0–4 用圓餅圖示（ILUO：未訓練 → 可教導他人），可獨立作業以上且證照未過期算合格。
        最下列是每個技能的合格人數，低於需求（<code>required</code>）標紅；最右欄是每人合格的技能數。證照快到期（橘色圈）與已過期（紅色虛線圈）一眼看出。
        排班（ChptShiftRoster）時可以用它確認每班的人會不會做。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptSkillMatrix } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <ChptSkillMatrix
          v-model:matrix="smMatrix"
          :persons="smPersons"
          :skills="smSkills"
          title="SMT 二線技能矩陣"
          :max-height="460"
          @change="({ person, skill, to }) => (smLog = `${person.name} 的 ${skill.name} 改為 ${to} 級`)"
        />
        <p class="mt-2 text-xs text-content-secondary" aria-live="polite">{{ smLog || '（調整等級時顯示）' }}</p>
      </div>
      <ChptCodeBlock class="mt-6" :code="smSample" />
      <ApiTable of="ChptSkillMatrix" title="Props" :rows="smProps" />
      <ApiTable of="ChptSkillMatrix" title="Events" :rows="smEvents" />
      <ApiTable of="ChptSkillMatrix" title="方法（ref）" :rows="smMethods" />
    </section>

    <!-- ============ ChptValueStreamMap ============ -->
    <section id="chpt-value-stream-map" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptValueStreamMap 價值流圖</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>精實生產分析一條產品族從供應商到客戶的物流與時間。工站方塊列出週期時間 C/T、換線時間 C/O、稼動率、不良率與人數；
        工站之間是<strong>庫存三角</strong>（數量與天數）與物流方式（推式、拉式超市、先進先出）。底部<strong>時間梯</strong>：庫存天數在上、週期時間在下，
        合計<strong>前置時間、加值時間與流程效率</strong>。由客戶的每日需求與可用時間算出<strong>節拍時間</strong>，週期時間超過節拍的工站標紅並顯示負荷，最慢的工站標為瓶頸。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptValueStreamMap, vsmMetrics } from '@/components/library'</code>
      </p>
      <div class="flex flex-wrap items-center gap-3 mb-3 text-sm text-content-secondary">
        <span>每日需求</span>
        <ChptSegmented v-model="vsmDemand" size="sm" :options="[{ label: '400 件', value: 400 }, { label: '600 件', value: 600 }, { label: '800 件', value: 800 }]" />
        <span v-if="vsmSelected">已選取：{{ vsmProcesses.find((p) => p.id === vsmSelected)?.name }}</span>
      </div>
      <ChptValueStreamMap
        v-model:selected="vsmSelected"
        title="主機板組裝線（現況）"
        supplier="PCB 供應商"
        control="MRP / 生管"
        :customer="{ name: '組裝廠', demand: vsmDemand, availableTime: 27000 }"
        :processes="vsmProcesses"
        :finished-goods="{ qty: 1800 }"
      />
      <ChptCodeBlock class="mt-6" :code="vsmSample" />
      <ApiTable of="ChptValueStreamMap" title="Props" :rows="vsmProps" />
      <ApiTable of="-" title="VsmProcess / VsmCustomer / VsmInventory" :rows="vsmDataRows" />
      <ApiTable of="ChptValueStreamMap" title="Events" :rows="vsmEvents" />
      <ApiTable of="ChptValueStreamMap" title="方法（ref）" :rows="vsmMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>前置時間與加值時間換算成同一單位時，「一天」用客戶的每日可用時間（預設 27000 秒 = 7.5 小時），不是 24 小時。
        庫存有給 <code>days</code> 時直接用，否則用數量 ÷ 每日需求。畫面比外框寬時可以左右捲動（Tab 進入後用方向鍵）。
      </p>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
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
  ChptImageCompare,
  ChptTimeScrubber,
  DualAxisComboChart,
  useChartSync,
  ChptSwitch,
  ChptShiftRoster,
  ChptSkillMatrix,
  ChptValueStreamMap,
  ChptFishbone,
  ChptFmeaTable,
  ChptLabelDesigner,
  labelToZpl,
  fishboneOutline,
  ChptScheduler,
  ChptSortableList,
  ChptCommentThread,
  ChptSegmented,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

// ---- ShiftRoster ----
const rosterShifts = [
  { code: 'D', label: '早班', start: '06:00', end: '14:00' },
  { code: 'E', label: '中班', start: '14:00', end: '22:00' },
  { code: 'N', label: '夜班', start: '22:00', end: '06:00' },
  { code: 'O', label: '休', off: true },
]
const rosterPeople = [
  { id: 'p1', name: '王小明', group: '領班' },
  { id: 'p2', name: '陳怡君', group: '操作員' },
  { id: 'p3', name: '林志豪', group: '操作員' },
  { id: 'p4', name: '張雅婷', group: '操作員' },
  { id: 'p5', name: '李承恩', group: '操作員' },
  { id: 'p6', name: '黃柏翰', group: '技術員' },
  { id: 'p7', name: '吳佩珊', group: '技術員' },
]
const rosterDays = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29']
const rows = {
  p1: 'DDDDDOO',
  p2: 'DDDDOOD',
  p3: 'EEEEEOO',
  p4: 'EEDOOEE', // 中班接隔天早班：只休息 8 小時（提醒）
  p5: 'NNNNNOO',
  p6: 'NNOONND',
  p7: 'DDDDDDD', // 連續上班 7 天：第 7 天超過上限 6 天（提醒）
}
const roster = ref(Object.fromEntries(Object.entries(rows).map(([id, codes]) => [id, Object.fromEntries([...codes].map((c, i) => [rosterDays[i], c]))])))
// 平日早班 3 人、中班 / 夜班 2 人；週末各 1 人
const rosterRequirement = (date, code) => {
  const weekend = [0, 6].includes(new Date(`${date}T00:00:00`).getDay())
  return weekend ? 1 : code === 'D' ? 3 : 2
}
const rosterSample = `<ChptShiftRoster
  v-model="roster"
  :people="[{ id: 'p1', name: '王小明', group: '領班' }, …]"
  :shifts="[
    { code: 'D', label: '早班', start: '06:00', end: '14:00' },
    { code: 'E', label: '中班', start: '14:00', end: '22:00' },
    { code: 'N', label: '夜班', start: '22:00', end: '06:00' },   // 跨夜
    { code: 'O', label: '休', off: true },
  ]"
  start="2026-11-23" :days="7"
  :requirements="{ D: 3, E: 2, N: 2 }"
  :rules="{ minRestHours: 11, maxConsecutive: 6 }"
/>

// roster：{ p1: { '2026-11-23': 'D', '2026-11-24': 'D', … }, … }`
const rosterProps = [
  { name: 'people', type: 'RosterPerson[]', def: '—', desc: '人員（列）' },
  { name: 'shifts', type: 'RosterShift[]', def: '—', desc: '班別：代碼、名稱、顏色、上下班時間、是否休假、快捷鍵' },
  { name: 'modelValue', type: 'Roster', def: '{}', desc: '{ [人員 id]: { \'YYYY-MM-DD\': 班別代碼 } }（v-model）' },
  { name: 'start / days', type: 'string | Date / number', def: '— / 7', desc: '第一天與天數' },
  { name: 'requirements', type: 'Record<code, number> | (date, code) => number', def: '—', desc: '每天每班需要幾人（不足時紅字 ▲）' },
  { name: 'rules', type: '{ minRestHours?, maxConsecutive? }', def: '{ 11, 6 }', desc: '規則提醒；0 為不檢查' },
  { name: 'showStats / showWarnings', type: 'boolean', def: 'true', desc: '右側統計欄／下方列出規則提醒' },
  { name: 'readonly', type: 'boolean', def: 'false', desc: '唯讀（只能瀏覽）' },
  { name: 'label', type: 'string', def: '語系', desc: '表格名稱（螢幕閱讀器）' },
]
const rosterDataRows = [
  { name: 'RosterShift', type: '{ code, label, color?, start?, end?, off?, key? }', def: '—', desc: 'start / end 為 HH:mm，end ≤ start 表示跨夜；key 為鍵盤快捷鍵（預設代碼第一個字）' },
  { name: 'RosterPerson', type: '{ id, name, group? }', def: '—', desc: 'group 顯示在名字下面' },
]
const rosterEvents = [
  { name: 'update:modelValue', params: '(roster: Roster)', desc: '班表改變' },
  { name: 'change', params: '(cells: { personId, date, code }[])', desc: '一次操作改到的格子（填一段、交換兩格都只送一次）' },
]
const rosterMethods = [
  { name: 'shortages()', type: '() => { date, code, have, need }[]', desc: '目前人力不足的格子' },
  { name: 'warnings()', type: '() => RosterWarning[]', desc: '目前的規則提醒（休息不足、連續上班）' },
]

// ---- ChptScheduler ----
const schedMonday = (() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
})()
const schedAt = (day, h, m = 0) => schedMonday + day * 86_400_000 + (h * 60 + m) * 60_000
const schedResources = [
  { id: 'smt1', name: 'SMT 一線', color: 'rgb(var(--t-chart-1))' },
  { id: 'smt2', name: 'SMT 二線', color: 'rgb(var(--t-chart-2))' },
  { id: 'aoi', name: 'AOI', color: 'rgb(var(--t-chart-3))' },
  { id: 'reflow', name: '迴焊爐', color: 'rgb(var(--t-chart-4))' },
]
const schedEvents = ref([
  { id: 'e1', title: '鋼板更換', start: schedAt(0, 8), end: schedAt(0, 9, 30), resource: 'smt1' },
  { id: 'e2', title: '新機種試產', start: schedAt(0, 9), end: schedAt(0, 12), resource: 'smt2' },
  { id: 'e3', title: 'AOI 程式調整', start: schedAt(0, 10), end: schedAt(0, 11), resource: 'aoi' },
  { id: 'e4', title: '爐溫量測', start: schedAt(1, 7, 30), end: schedAt(1, 8, 30), resource: 'reflow' },
  { id: 'e5', title: '吸嘴保養', start: schedAt(1, 13), end: schedAt(1, 15), resource: 'smt1' },
  { id: 'e6', title: '客戶稽核', start: schedAt(1, 14), end: schedAt(1, 16), resource: 'smt1' },
  { id: 'e7', title: '月保養（鎖定）', start: schedAt(2, 6), end: schedAt(2, 10), resource: 'reflow', locked: true },
  { id: 'e8', title: '換線 A→B', start: schedAt(3, 12), end: schedAt(3, 13), resource: 'smt2' },
  { id: 'e9', title: '夜班試跑', start: schedAt(4, 20), end: schedAt(5, 2), resource: 'smt1' },
])
const schedView = ref('week')
const schedByResource = ref(true)
const schedLog = ref('')
let schedSeq = 10
const schedTime = (t) => {
  const d = new Date(t)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
function schedCreate({ start, end, resource }) {
  const id = `e${schedSeq++}`
  schedEvents.value = [...schedEvents.value, { id, title: `新預約 ${id}`, start, end, resource: resource ?? 'smt1' }]
  schedLog.value = `建立 ${schedTime(start)} – ${schedTime(end)}`
}
const schedSample = `<ChptScheduler
  v-model:events="events"
  v-model:view="view"
  :resources="machines"
  :day-start="6"
  :day-end="22"
  @create="({ start, end, resource }) => openBookingForm({ start, end, resource })"
  @change="({ event, previous, kind }) => save(event)"
  @delete="(e) => remove(e.id)"
/>

// events：{ id, title, start, end, resource?, color?, locked? }[]
// resources：{ id, name, color? }[]（日檢視依資源分欄）`
const schedProps = [
  { name: 'events', type: 'SchedEvent[]', def: '[]', desc: '事件（v-model:events；移動 / 調整後回傳新陣列）' },
  { name: 'view', type: "'week' | 'day'", def: "'week'", desc: '週 / 日檢視（v-model:view）' },
  { name: 'date', type: 'number | string | Date | null', def: 'null（今天）', desc: '顯示哪一天（週檢視為它所在的週；v-model:date）' },
  { name: 'resources', type: 'SchedResource[]', def: '[]', desc: '日檢視依資源分欄；週檢視用資源顏色' },
  { name: 'dayStart / dayEnd', type: 'number', def: '0 / 24', desc: '可見時段（時）' },
  { name: 'snapMinutes', type: 'number', def: '15', desc: '拖曳與鍵盤的吸附間隔（分鐘）' },
  { name: 'defaultDuration', type: 'number', def: '60', desc: '點一下空白處建立的預設長度（分鐘）' },
  { name: 'hourHeight', type: 'number', def: '48', desc: '一小時的高度（px）' },
  { name: 'height', type: 'number | string', def: '520', desc: '時間格最大高度（超過可捲動）' },
  { name: 'minColumnWidth', type: 'number', def: '96', desc: '每欄最小寬度（px；太窄時左右捲動，時間刻度固定在左側）' },
  { name: 'weekStartsOn', type: '0 | 1', def: '1', desc: '一週從星期日（0）或星期一（1）開始' },
  { name: 'initialHour', type: 'number', def: '8', desc: '一開始捲到幾點' },
  { name: 'now', type: 'number | Date | null', def: 'null', desc: '「現在」（紅線與「今天」）；不給時用現在並每分鐘更新' },
  { name: 'readonly', type: 'boolean', def: 'false', desc: '唯讀：不能建立、移動、調整、刪除' },
]
const schedDataRows = [
  { name: 'SchedEvent', type: '{ id, title, start, end, resource?, color?, locked? }', def: '—', desc: 'start / end 可為毫秒、ISO 字串或 Date；locked 不能拖曳 / 調整 / 刪除' },
  { name: 'SchedResource', type: '{ id, name, color? }', def: '—', desc: '事件沒指定 color 時用資源顏色' },
]
const schedEmits = [
  { name: 'update:events', params: '(events: SchedEvent[])', desc: '移動或調整後的新陣列' },
  { name: 'update:view / update:date', params: "('week' | 'day') / (day: number)", desc: '切換檢視、上一段 / 下一段 / 今天' },
  { name: 'create', params: '({ start, end, resource? })', desc: '空白處拖曳或點擊；元件不會自己新增' },
  { name: 'change', params: "({ event, previous, kind: 'move' | 'resize' })", desc: '移動或調整一個事件' },
  { name: 'select', params: '(event: SchedEvent)', desc: '點選事件' },
  { name: 'delete', params: '(event: SchedEvent)', desc: '在事件上按 Delete / Backspace；由使用端刪除' },
]
const schedMethods = [
  { name: 'scrollToHour(h)', type: '(h: number) => void', desc: '捲到某個小時' },
  { name: 'goTo(date)', type: '(date: number) => void', desc: '跳到某天（所在的週）' },
  { name: 'conflicts', type: 'string[]', desc: '同一資源時間重疊的事件 id' },
]

// ---- ChptSortableList ----
const sortRoute = ref([
  { id: 'feed', label: '投料 / 備料', description: '固定第一步', locked: true },
  { id: 'print', label: '錫膏印刷', children: [{ id: 'spi', label: 'SPI 錫膏檢查', leaf: true }] },
  {
    id: 'mount',
    label: '貼片',
    children: [
      { id: 'hs', label: '高速機（小零件）', leaf: true },
      { id: 'gp', label: '泛用機（IC、連接器）', leaf: true },
    ],
  },
  { id: 'reflow', label: '迴焊', description: '十溫區、氮氣' },
  { id: 'aoi', label: '爐後 AOI' },
  { id: 'ict', label: 'ICT' },
  { id: 'pack', label: '包裝' },
])
const sortLog = ref('')
function sortOnChange({ item, to }) {
  sortLog.value = `${item.label} 移到${to.parentId ? '子步驟' : '主流程'}第 ${to.index + 1} 項`
}
const sortOrder = computed(() => {
  const out = []
  const walk = (list, prefix) => list.forEach((x, i) => (out.push(`${prefix}${i + 1}. ${x.label}`), walk(x.children ?? [], `${prefix}${i + 1}.`)))
  walk(sortRoute.value, '')
  return out.join('、')
})
const sortBacklog = ref([
  { id: 'wo-1031', label: 'WO-1031 主機板 A', description: '500 片．交期 11/27' },
  { id: 'wo-1032', label: 'WO-1032 電源板', description: '1,200 片．交期 11/28' },
  { id: 'wo-1035', label: 'WO-1035 LED 驅動板', description: '800 片．交期 11/29' },
  { id: 'wo-1036', label: 'WO-1036 主機板 B', description: '300 片．交期 12/01' },
])
const sortToday = ref([{ id: 'wo-1029', label: 'WO-1029 控制板', description: '進行中', locked: true }])
const sortLog2 = ref('')
const sortSample = `<ChptSortableList v-model="route" :max-depth="2" label="製程路線" @change="save" />

// 兩個清單互相拖曳：同一個 group
<ChptSortableList v-model="backlog" group="orders" :handle="false" />
<ChptSortableList v-model="today" group="orders" :handle="false" @add="({ item }) => schedule(item)" />

// 項目：{ id, label, description?, children?, locked?, leaf? }
// 自訂內容
<ChptSortableList v-model="steps">
  <template #item="{ item, depth }">{{ item.label }} <ChptTag>{{ item.station }}</ChptTag></template>
</ChptSortableList>`
const sortProps = [
  { name: 'modelValue', type: 'SortItem[]', def: '[]', desc: '項目（v-model）；巢狀時用 children' },
  { name: 'maxDepth', type: 'number', def: '1', desc: '最多幾層（1 = 平面清單）' },
  { name: 'indent', type: 'number', def: '24', desc: '每層縮排（px），也是拖曳時左右換層的距離' },
  { name: 'handle', type: 'boolean', def: 'true', desc: '只能用把手拖；false 時整列都可以拖' },
  { name: 'group', type: 'string', def: "''", desc: '同名的清單之間可以互相拖曳' },
  { name: 'put', type: 'boolean', def: 'true', desc: '接受從同 group 的其他清單拖進來' },
  { name: 'canDrop', type: '(item, parent) => boolean', def: 'null', desc: '自訂規則：能不能放到 parent 底下（null 為最上層）' },
  { name: 'label', type: 'string', def: '語系', desc: '清單名稱（螢幕閱讀器）' },
  { name: 'emptyText', type: 'string', def: '語系', desc: '沒有項目時的文字' },
  { name: 'disabled', type: 'boolean', def: 'false', desc: '停用拖曳' },
]
const sortItemRows = [
  { name: 'id / label', type: 'string', def: '—', desc: '唯一 id 與顯示文字' },
  { name: 'description', type: 'string', def: '—', desc: '次要說明' },
  { name: 'children', type: 'SortItem[]', def: '—', desc: '子項（maxDepth > 1）' },
  { name: 'locked', type: 'boolean', def: 'false', desc: '固定不動（不能拖，鍵盤也不能拿起）' },
  { name: 'leaf', type: 'boolean', def: 'false', desc: '不能有子項' },
]
const sortEvents = [
  { name: 'update:modelValue', params: '(items: SortItem[])', desc: '放下後的新陣列' },
  { name: 'change', params: '({ item, from, to })', desc: '在清單內移動；from / to 為 { parentId, index }' },
  { name: 'add', params: '({ item, from, to })', desc: '從同 group 的其他清單拖進來' },
  { name: 'remove', params: '({ item, from, to })', desc: '拖到同 group 的其他清單' },
]
const sortSlots = [{ name: 'item', params: '{ item, depth, dragging, grabbed }', desc: '自訂每一項的內容（預設為 label 與 description）' }]
const sortMethods = [
  { name: 'toggle(id)', type: '(id: string) => void', desc: '收合 / 展開' },
  { name: 'expandAll() / collapseAll()', type: '() => void', desc: '全部展開 / 收合' },
  { name: 'isDescendant(ancestorId, id)', type: '(a: string, b: string) => boolean', desc: 'b 是否在 a 底下（含自己）' },
]

// ---- ChptCommentThread ----
const cmtPeople = [
  { id: 'u01', name: '王小明', description: 'SMT 一線．領班' },
  { id: 'u02', name: '陳怡君', description: '品保．IPQC' },
  { id: 'u03', name: '林志豪', description: '設備課' },
  { id: 'u04', name: '黃淑芬', description: '生管' },
]
const cmtUserId = ref('u01')
const cmtUserOptions = cmtPeople.slice(0, 2).map((p) => ({ label: `以 ${p.name} 登入`, value: p.id }))
const cmtUser = computed(() => {
  const p = cmtPeople.find((x) => x.id === cmtUserId.value)
  return { id: p.id, name: p.name }
})
const cmtModerator = ref(false)
const cmtTriggers = [{ char: '@', label: '人員', options: cmtPeople.map((p) => ({ id: p.id, label: p.name, description: p.description })) }]
const cmtAgo = (min) => Date.now() - min * 60_000
const cmtAuthor = (id) => ({ id, name: cmtPeople.find((p) => p.id === id).name })
const cmtItems = ref([
  {
    id: 'c1',
    author: cmtAuthor('u02'),
    body: '迴焊爐 A 第 7 區從 13:20 開始偏高，目前 236 °C（設定 230）。@[林志豪](u03) 麻煩確認加熱器與熱電偶。',
    createdAt: cmtAgo(180),
    attachments: [
      { name: '爐溫曲線_1125.png', size: 248_000 },
      { name: '異常單 A-1125-03.pdf', size: 1_320_000 },
    ],
    replies: [
      { id: 'c1r1', author: cmtAuthor('u03'), body: '第 7 區熱電偶接頭鬆動，已重新鎖緊，溫度回到 231 °C。', createdAt: cmtAgo(95) },
      { id: 'c1r2', author: cmtAuthor('u01'), body: '這段時間的產品要不要隔離？@[陳怡君](u02)', createdAt: cmtAgo(40), editedAt: cmtAgo(38) },
    ],
  },
  {
    id: 'c2',
    author: cmtAuthor('u04'),
    body: '受影響工單 WO-1031、WO-1032，已先暫停出貨。',
    createdAt: cmtAgo(60 * 26),
    resolved: true,
    resolvedBy: cmtAuthor('u02'),
    replies: [{ id: 'c2r1', author: cmtAuthor('u02'), body: '抽驗 32 片外觀與 X-ray 都正常，可以放行。', createdAt: cmtAgo(60 * 25) }],
  },
  { id: 'c3', author: cmtAuthor('u01'), body: '交接：夜班請每小時記錄一次第 7 區溫度。', createdAt: cmtAgo(2) },
])
const cmtLog = ref('')
const cmtSample = `<ChptCommentThread
  v-model="comments"
  :current-user="{ id: me.id, name: me.name }"
  :triggers="[{ char: '@', options: people, label: '人員' }]"
  title="異常 #A-1125-03 討論"
  @create="({ comment, parentId, mentions }) => api.post(comment, parentId).then(() => notify(mentions))"
  @edit="({ comment, addedMentions }) => api.update(comment).then(() => notify(addedMentions))"
  @remove="({ comment }) => api.remove(comment.id)"
  @resolve="({ comment, resolved }) => api.resolve(comment.id, resolved)"
/>

// comments：{ id, author: { id, name, avatar? }, body, createdAt, editedAt?, resolved?, resolvedBy?, replies?, attachments? }[]`
const cmtProps = [
  { name: 'modelValue', type: 'CommentItem[]', def: '[]', desc: '留言（v-model）；回覆放在 replies' },
  { name: 'currentUser', type: '{ id, name, avatar? } | null', def: 'null', desc: '目前登入的人；沒給時只能看' },
  { name: 'triggers', type: 'MentionTrigger[]', def: "[{ char: '@' }]", desc: '提及的來源（同 ChptMentionInput）' },
  { name: 'moderator', type: 'boolean', def: 'false', desc: '可以編輯 / 刪除別人的留言' },
  { name: 'order', type: "'oldest' | 'newest'", def: "'oldest'", desc: '最上層的排序（回覆一律由舊到新）' },
  { name: 'maxLength', type: 'number | null', def: '1000', desc: '每則字數上限' },
  { name: 'title / placeholder / emptyText', type: 'string', def: '語系', desc: '標題（預設「N 則留言」）／輸入提示／沒有留言時的文字' },
  { name: 'now', type: 'number | Date | null', def: 'null', desc: '相對時間的「現在」；不給時用現在並每分鐘更新' },
  { name: 'idFactory', type: '() => string', def: '自動產生', desc: '新留言的 id' },
  { name: 'readonly', type: 'boolean', def: 'false', desc: '唯讀' },
]
const cmtItemRows = [
  { name: 'id / author / body', type: 'string / { id, name, avatar? } / string', def: '—', desc: 'body 為提及標記字串' },
  { name: 'createdAt / editedAt', type: 'number | string | Date', def: '—', desc: '建立／最後編輯時間' },
  { name: 'resolved / resolvedBy', type: 'boolean / CommentAuthor', def: 'false', desc: '最上層留言的已解決狀態與標記的人' },
  { name: 'replies', type: 'CommentItem[]', def: '[]', desc: '回覆（只有一層）' },
  { name: 'attachments', type: '{ name, url?, size? }[]', def: '[]', desc: '附件（有 url 時可以點開）' },
  { name: 'deleted', type: 'boolean', def: 'false', desc: '已刪除但還有回覆時的佔位（元件自己設定）' },
]
const cmtEvents = [
  { name: 'update:modelValue', params: '(items: CommentItem[])', desc: '任何改動後的新陣列' },
  { name: 'create', params: '({ comment, parentId, mentions })', desc: '新增留言或回覆；mentions 為內容裡的提及' },
  { name: 'edit', params: '({ comment, before, addedMentions })', desc: '編輯；addedMentions 為新加的提及' },
  { name: 'remove', params: '({ comment, parentId })', desc: '刪除' },
  { name: 'resolve', params: '({ comment, resolved })', desc: '標記為已解決／重新開啟' },
]
const cmtMethods = [
  { name: 'count', type: 'number', desc: '留言總數（含回覆）' },
  { name: 'reply(id)', type: '(id: string) => void', desc: '開始回覆某一則（例如從通知連過來）' },
]

// ---- ChptFishbone ----
const fishEditable = ref(true)
const fishShowOutline = ref(false)
const fishSelected = ref(null)
const fishData = ref({
  problem: 'SMT 二線 QFP 錫橋不良率 1.8%（目標 < 0.3%）',
  categories: [
    { id: 'man', label: '人員', causes: [
      { id: 'm1', text: '新進作業員未依 SOP 擦拭鋼板', verified: true },
      { id: 'm2', text: '換線時未確認刮刀壓力', children: [{ id: 'm2a', text: '換線檢查表沒有這一項' }] },
    ] },
    { id: 'machine', label: '機器', causes: [
      { id: 'k1', text: '印刷機刮刀磨損', primary: true, verified: true, note: '量測刃口 0.3 mm 缺口', children: [
        { id: 'k1a', text: '刮刀更換週期過長', children: [{ id: 'k1a1', text: 'PM 計畫沿用舊機型' }] },
      ] },
      { id: 'k2', text: '迴焊爐第 5 區溫度偏高', ruledOut: true, note: 'Profile 量測正常' },
    ] },
    { id: 'material', label: '材料', causes: [
      { id: 't1', text: '錫膏回溫時間不足', verified: true },
      { id: 't2', text: 'PCB 防焊開窗過大' },
    ] },
    { id: 'method', label: '方法', causes: [
      { id: 'h1', text: '鋼板開孔比 1:1，未內縮', primary: true },
      { id: 'h2', text: '擦拭頻率每 10 片一次' },
    ] },
    { id: 'environment', label: '環境', causes: [{ id: 'e1', text: '夏季濕度 65%RH 偏高' }] },
    { id: 'measurement', label: '量測', causes: [{ id: 'q1', text: 'SPI 體積上限設太寬', children: [{ id: 'q1a', text: '沿用前一版程式' }] }] },
  ],
})
const fishOutline = computed(() => fishboneOutline(fishData.value))
const fishSample = `<ChptFishbone v-model="analysis" editable />

// analysis：
{
  problem: 'SMT 二線 QFP 錫橋不良率 1.8%',
  categories: [
    { id: 'machine', label: '機器', causes: [
      { id: 'k1', text: '印刷機刮刀磨損', primary: true, verified: true, note: '刃口 0.3 mm 缺口',
        children: [{ id: 'k1a', text: '刮刀更換週期過長' }] },
    ] },
    …
  ],
}

// 輸出文字大綱（貼到 8D 報告）
fishboneOutline(analysis)`
const fishProps = [
  { name: 'modelValue', type: 'FishboneData', def: '5M1E 空白分類', desc: '問題、分類與原因（v-model）' },
  { name: 'editable', type: 'boolean', def: 'false', desc: '可以在圖上新增、編輯、標記、刪除' },
  { name: 'maxHeight', type: 'number', def: '0', desc: '外框最大高度（0 = 不限制）' },
  { name: 'rowHeight / branchWidth', type: 'number', def: '24 / 170', desc: '每列原因的高度／第一層原因線的長度' },
  { name: 'label', type: 'string', def: "''", desc: '魚骨圖名稱（螢幕閱讀器）' },
]
const fishDataRows = [
  { name: 'FishboneData', type: '{ problem, categories: FishCategory[] }', def: '—', desc: 'FishCategory：{ id, label, causes: FishCause[] }' },
  { name: 'FishCause', type: '{ id, text, verified?, primary?, ruledOut?, note?, children? }', def: '—', desc: '最多 3 層；note 會出現在滑過提示與大綱裡' },
]
const fishEvents = [
  { name: 'update:modelValue', params: '(value: FishboneData)', desc: '新增、編輯、標記、刪除' },
  { name: 'select', params: '(id: string | null)', desc: '選取分類或原因' },
]
const fishMethods = [
  { name: 'value() / outline()', type: '() => FishboneData / string', desc: '目前的資料／文字大綱' },
  { name: 'addCause(parentId, text)', type: '(parentId, text) => string | null', desc: '新增原因（parentId 為分類或原因 id），回傳新 id' },
  { name: 'updateCause(id, patch) / removeCause(id)', type: '(id, patch?) => void', desc: '修改或標記／刪除原因' },
  { name: 'select(id)', type: '(id: string | null) => void', desc: '選取' },
]

// ---- ChptFmeaTable ----
const fmeaEditable = ref(true)
const fmeaRows = ref([
  {
    id: 'p1', item: '錫膏印刷', failureMode: '錫膏量不足', effect: '空焊、功能失效', special: 'SC', severity: 8,
    cause: '鋼板開孔堵塞', prevention: '每 5 片自動擦拭鋼板', occurrence: 6, detectionControl: 'SPI 全檢', detection: 3,
    actions: [{ id: 'a1', text: '擦拭改為每 3 片並加真空', owner: '林工程師', due: '2026-12-05', done: false }],
  },
  {
    id: 'p2', item: '錫膏印刷', failureMode: '印刷偏移', effect: '錫橋短路', severity: 7,
    cause: '基板定位銷磨損', prevention: '定位銷每月點檢', occurrence: 4, detectionControl: 'SPI 全檢', detection: 3,
    actions: [{ id: 'a2', text: '定位銷改為每週點檢', owner: '陳組長', due: '2026-11-20', done: false }],
  },
  {
    id: 'p3', item: '零件置件', failureMode: '極性反向', effect: '產品燒毀', special: 'CC', severity: 10,
    cause: '料捲方向放錯', prevention: '上料掃描防錯', occurrence: 3, detectionControl: 'AOI 極性檢查', detection: 4,
    actions: [{ id: 'a3', text: 'AOI 加入極性點辨識', owner: '王工程師', due: '2026-11-15', done: true }],
    revised: { severity: 10, occurrence: 2, detection: 2 },
  },
  {
    id: 'p4', item: '迴焊', failureMode: '冷焊', effect: '焊點強度不足', severity: 6,
    cause: '爐溫曲線偏低', prevention: '每日量測爐溫', occurrence: 3, detectionControl: '目視抽檢', detection: 7,
  },
  {
    id: 'p5', item: '清潔', failureMode: '助焊劑殘留', effect: '外觀不良', severity: 3,
    cause: '清洗時間不足', prevention: '作業標準書', occurrence: 4, detectionControl: '目視全檢', detection: 5,
  },
])
const fmeaSample = `<ChptFmeaTable v-model="rows" editable :threshold="100" filename="pfmea" />

// rows：FmeaRow[]
const rows = ref([
  {
    id: 'p1', item: '錫膏印刷', failureMode: '錫膏量不足', effect: '空焊',
    severity: 8, cause: '鋼板開孔堵塞', occurrence: 6, detectionControl: 'SPI 全檢', detection: 3,
    actions: [{ id: 'a1', text: '擦拭改為每 3 片', owner: '林', due: '2026-12-05', done: false }],
    revised: null, // 對策完成後重新評分：{ severity, occurrence, detection }
  },
])

// 也可以直接算：fmeaRpn(row)、fmeaActionPriority(row)、fmeaSummary(rows, { threshold: 100 })`
const fmeaProps = [
  { name: 'modelValue', type: 'FmeaRow[]', def: '[]', desc: 'FMEA 項目（v-model）' },
  { name: 'editable', type: 'boolean', def: 'false', desc: '評分下拉、展開後編輯文字與對策、新增 / 刪除項目' },
  { name: 'title', type: 'string', def: "''", desc: '標題（也是表格區域的名稱）' },
  { name: 'threshold', type: 'number', def: '100', desc: 'RPN 達此值時標紅；Infinity 表示不用 RPN 門檻' },
  { name: 'today', type: 'number | string | Date', def: '現在', desc: '判斷對策逾期的「今天」' },
  { name: 'defaultSort', type: "'none' | 'ap' | 'rpn' | 'severity'", def: "'none'", desc: '初始排序' },
  { name: 'maxHeight', type: 'number', def: '—', desc: '表格最大高度（px），超過時捲動、表頭固定' },
  { name: 'filename', type: 'string', def: "'fmea'", desc: '匯出 CSV 的檔名（不含副檔名）' },
]
const fmeaDataRows = [
  { name: 'FmeaRow', type: '{ id, item, failureMode, effect?, cause?, prevention?, detectionControl?, severity, occurrence, detection, special?, actions?, revised? }', def: '—', desc: "special：'CC' 關鍵 / 'SC' 重要；revised：改善後的 { severity, occurrence, detection }" },
  { name: 'FmeaAction', type: '{ id, text, owner?, due?, done? }', def: '—', desc: 'due 可以是 YYYY-MM-DD、epoch ms 或 Date' },
]
const fmeaEvents = [
  { name: 'update:modelValue', params: '(rows: FmeaRow[])', desc: '評分、文字、對策、重新評分、新增或刪除項目' },
]
const fmeaMethods = [
  { name: 'addRow(partial?)', type: '(partial?: Partial<FmeaRow>) => Promise<FmeaRow>', desc: '新增一列並展開、聚焦（會清掉篩選）' },
  { name: 'exportCsv(filename?)', type: '(filename?: string) => void', desc: '匯出目前篩選與排序後的列' },
  { name: 'expandAll() / collapseAll()', type: '() => void', desc: '展開 / 收合全部詳細內容' },
]

// ---- ChptLabelDesigner ----
const labelRef = ref(null)
const labelPreview = ref(false)
const labelShowZpl = ref(false)
const labelFields = ['partNo', 'partName', 'lotNo', 'qty', 'date', 'customer']
const labelFieldLabels = { partNo: '料號', partName: '品名', lotNo: '批號', qty: '數量', date: '日期', customer: '客戶' }
const labelRecords = [
  { partNo: 'PCB-A1024-R3', partName: '主機板 Rev.3', lotNo: 'L2611-0042', qty: 200, date: '2026-11-26', customer: 'ACME' },
  { partNo: 'PCB-A1024-R3', partName: '主機板 Rev.3', lotNo: 'L2611-0043', qty: 180, date: '2026-11-26', customer: 'ACME' },
  { partNo: 'PWR-5V-2A', partName: '電源板', lotNo: 'L2611-0101', qty: 500, date: '2026-11-27', customer: 'Globex' },
]
const labelRecordIdx = ref(0)
const labelRecordOptions = labelRecords.map((r, i) => ({ label: r.lotNo, value: i }))
const labelDoc = ref({
  width: 100,
  height: 60,
  dpi: 203,
  elements: [
    { id: 'frame', type: 'rect', x: 1, y: 1, w: 98, h: 58, thickness: 0.4, radius: 1.5, locked: true },
    { id: 'cust', type: 'text', x: 4, y: 3, w: 60, h: 7, text: '{{customer}}', fontSize: 16, bold: true },
    { id: 'date', type: 'text', x: 64, y: 3, w: 32, h: 7, text: '{{date}}', fontSize: 9, align: 'right' },
    { id: 'hr', type: 'line', x: 3, y: 11, w: 94, h: 0.5, thickness: 0.3 },
    { id: 'pn-l', type: 'text', x: 4, y: 13, w: 14, h: 5, text: 'P/N', fontSize: 8 },
    { id: 'pn', type: 'text', x: 18, y: 13, w: 52, h: 5, text: '{{partNo}}', fontSize: 11, bold: true },
    { id: 'name', type: 'text', x: 18, y: 18.5, w: 52, h: 5, text: '{{partName}}', fontSize: 9 },
    { id: 'pn-bc', type: 'barcode', x: 4, y: 24, w: 62, h: 12, value: '{{partNo}}', format: 'code128', showText: false },
    { id: 'lot-l', type: 'text', x: 4, y: 38, w: 14, h: 5, text: 'LOT', fontSize: 8 },
    { id: 'lot', type: 'text', x: 18, y: 38, w: 30, h: 5, text: '{{lotNo}}', fontSize: 11, bold: true },
    { id: 'qty', type: 'text', x: 48, y: 38, w: 20, h: 5, text: 'Q\'TY {{qty}}', fontSize: 10, align: 'right' },
    { id: 'lot-bc', type: 'barcode', x: 4, y: 44, w: 62, h: 12, value: '{{lotNo}}', format: 'code128', showText: true },
    { id: 'qr', type: 'qrcode', x: 72, y: 16, w: 24, h: 24, value: '{{partNo}};{{lotNo}};{{qty}}', level: 'M' },
    { id: 'note', type: 'text', x: 70, y: 44, w: 28, h: 10, text: 'MADE IN\nTAIWAN', fontSize: 8, align: 'center' },
  ],
})
const labelZpl = computed(() => labelToZpl(labelDoc.value, labelRecords[labelRecordIdx.value]))
const labelSample = `<ChptLabelDesigner
  v-model="layout"                 // 版面 JSON：{ width, height, dpi, elements: [...] }
  :data="{ lotNo: 'L2611-0042', partNo: 'PCB-A1024-R3', qty: 200 }"
  :fields="['partNo', 'lotNo', 'qty', 'date']"
  :field-labels="{ partNo: '料號', lotNo: '批號', qty: '數量', date: '日期' }"
/>

// 列印多筆、輸出給標籤機
labelRef.value.print(records)               // 每筆一張
labelRef.value.toZpl(record)                // ZPL II 字串，送到 Zebra（9100 埠或驅動程式）
const png = await labelRef.value.exportPng(record, 300)   // 300 dpi`
const labelProps = [
  { name: 'modelValue', type: 'LabelDoc', def: '60 × 40 mm 空白', desc: '版面（v-model）' },
  { name: 'data', type: 'Record<string, unknown> | null', def: 'null', desc: '欄位資料：設計時顯示、預覽 / 列印 / 匯出時代入；沒有的欄位設計時顯示原樣' },
  { name: 'fields / fieldLabels', type: 'string[] / Record<string, string>', def: '[] / {}', desc: '「插入欄位」選單的欄位與名稱' },
  { name: 'preview', type: 'boolean', def: 'false', desc: '預覽模式（v-model:preview）：代入資料、隱藏格線與選取框' },
  { name: 'readonly', type: 'boolean', def: 'false', desc: '唯讀（只能看、預覽與輸出）' },
  { name: 'grid / showGrid / snap', type: 'number / boolean / boolean', def: '1 / true / true', desc: '格線間距（mm）／顯示格線／貼齊其他元素與標籤' },
  { name: 'showPanel / allowImages', type: 'boolean', def: 'true / true', desc: '顯示屬性面板／可以放圖片' },
  { name: 'height', type: 'number', def: '420', desc: '畫布高度（px）' },
  { name: 'exportName / label', type: 'string', def: "'label' / ''", desc: '下載檔名／設計器名稱（螢幕閱讀器）' },
]
const labelDataRows = [
  { name: 'LabelDoc', type: '{ width, height, dpi?, elements }', def: '—', desc: '寬高為 mm；dpi 給 PNG 與 ZPL 用（203 / 300 / 600）' },
  { name: 'LabelElement', type: '{ id, type, x, y, w, h, rotation?, locked?, … }', def: '—', desc: "type：'text'（text, fontSize pt, bold, align）、'barcode'（value, format, showText）、'qrcode'（value, level）、'line' / 'rect'（thickness, radius, fill）、'image'（src）" },
]
const labelEvents = [
  { name: 'update:modelValue', params: '(doc: LabelDoc)', desc: '版面改變（拖曳結束時送一次）' },
  { name: 'update:preview', params: '(preview: boolean)', desc: '切換預覽' },
  { name: 'select', params: '(ids: string[])', desc: '選取的元素' },
]
const labelMethods = [
  { name: 'toSvg(data?) / printHtml(records?)', type: '(…) => string', desc: 'SVG 字串（寬高以 mm）／列印用的 HTML（每筆一頁）' },
  { name: 'exportPng(data?, dpi?)', type: '(…) => Promise<Blob | null>', desc: '依 DPI 輸出 PNG' },
  { name: 'print(records?)', type: '(records?) => void', desc: '列印（每筆資料一張）' },
  { name: 'toZpl(data?)', type: '(data?) => string', desc: 'ZPL II（Zebra 標籤機）' },
  { name: 'undo() / redo() / select(ids) / addElement(type)', type: '…', desc: '復原／重做／選取／新增元素' },
]

// ---- ChptValueStreamMap ----
const vsmDemand = ref(600)
const vsmSelected = ref(null)
const vsmProcesses = [
  { id: 'smt', name: 'SMT 置件', cycleTime: 38, changeover: 45, uptime: 85, operators: 2, scrap: 0.8, inventoryBefore: { qty: 4200 } },
  { id: 'reflow', name: '回焊', cycleTime: 30, changeover: 20, uptime: 95, operators: 1, inventoryBefore: { qty: 120 }, flowIn: 'fifo' },
  { id: 'dip', name: '手插件', cycleTime: 52, changeover: 10, uptime: 98, operators: 4, scrap: 1.5, inventoryBefore: { qty: 900 } },
  { id: 'test', name: '功能測試', cycleTime: 41, changeover: 5, uptime: 90, operators: 2, scrap: 2.0, inventoryBefore: { qty: 300 }, flowIn: 'pull' },
  { id: 'pack', name: '包裝', cycleTime: 25, operators: 1, inventoryBefore: { qty: 600 } },
]
const vsmSample = `<ChptValueStreamMap
  v-model:selected="selected"
  supplier="PCB 供應商"
  control="MRP / 生管"
  :customer="{ name: '組裝廠', demand: 600, availableTime: 27000 }"
  :processes="processes"
  :finished-goods="{ qty: 1800 }"
/>

const processes = [
  { id: 'smt', name: 'SMT 置件', cycleTime: 38, changeover: 45, uptime: 85, operators: 2, inventoryBefore: { qty: 4200 } },
  { id: 'reflow', name: '回焊', cycleTime: 30, inventoryBefore: { qty: 120 }, flowIn: 'fifo' },
  { id: 'test', name: '功能測試', cycleTime: 41, inventoryBefore: { days: 0.5 }, flowIn: 'pull' },
]

// 只要數字：vsmMetrics(processes, customer, finishedGoods)
// → { takt, leadTimeDays, valueAddedSeconds, pce, bottleneck, overTakt, steps }`
const vsmProps = [
  { name: 'processes', type: 'VsmProcess[]', def: '—', desc: '工站（依流程順序），每站可帶前面的庫存與物流方式' },
  { name: 'customer', type: 'VsmCustomer', def: '—', desc: '客戶：每日需求與可用時間（算節拍）' },
  { name: 'supplier', type: 'string', def: "''", desc: '供應商名稱' },
  { name: 'control', type: 'string', def: "''", desc: '生產管理方塊的文字；不給時不顯示' },
  { name: 'finishedGoods', type: 'VsmInventory | null', def: 'null', desc: '成品庫存' },
  { name: 'title', type: 'string', def: "''", desc: '標題（也是捲動區域的名稱）' },
  { name: 'selected', type: 'string | null', def: '—', desc: '選取的工站 id（v-model:selected；不給時元件自己記）' },
]
const vsmDataRows = [
  { name: 'VsmProcess', type: '{ id, name, cycleTime, changeover?, uptime?, operators?, scrap?, inventoryBefore?, flowIn? }', def: '—', desc: "cycleTime 秒、changeover 分鐘、uptime / scrap 百分比；flowIn：'push' | 'pull' | 'fifo'" },
  { name: 'VsmCustomer', type: '{ name, demand, availableTime? }', def: '—', desc: 'demand：件 / 天；availableTime：每日可用秒數（預設 27000）' },
  { name: 'VsmInventory', type: '{ qty?, days? }', def: '—', desc: '有 days 時直接用，否則以 qty ÷ 每日需求換算' },
]
const vsmEvents = [
  { name: 'update:selected', params: '(id: string | null)', desc: '點工站選取；再點一次取消' },
  { name: 'select', params: '(process: VsmProcess | null)', desc: '同上，帶完整工站資料' },
]
const vsmMethods = [
  { name: 'metrics()', type: '() => VsmMetrics', desc: '節拍、前置時間、加值時間、流程效率、瓶頸與超過節拍的工站' },
]

// ---- ChptSkillMatrix ----
const smSkills = [
  { id: 'print', name: '錫膏印刷', group: 'SMT', required: 3 },
  { id: 'mount', name: '貼片機操作', group: 'SMT', required: 4 },
  { id: 'reflow', name: '回焊爐', group: 'SMT', required: 2 },
  { id: 'aoi', name: 'AOI 判讀', group: 'SMT', required: 3 },
  { id: 'dip', name: '手插件', group: '後段', required: 3 },
  { id: 'solder', name: '手焊', group: '後段', required: 2 },
  { id: 'ict', name: 'ICT 測試', group: '測試', required: 2 },
  { id: 'fct', name: '功能測試', group: '測試', required: 2 },
  { id: 'pack', name: '包裝', group: '後段' },
]
const smPersons = [
  ['A01', '陳小明', '早班'], ['A02', '林美華', '早班'], ['A03', '王大偉', '早班'], ['A04', '張雅婷', '早班'], ['A05', '李志強', '早班'],
  ['B01', '黃淑芬', '中班'], ['B02', '吳建宏', '中班'], ['B03', '劉怡君', '中班'], ['B04', '蔡宗翰', '中班'],
  ['C01', '楊佩珊', '夜班'], ['C02', '許家豪', '夜班'], ['C03', '鄭雅雯', '夜班'],
].map(([id, name, team]) => ({ id, name, team }))
const smDay = 86_400_000
let smSeed = 5
const smRand = () => ((smSeed = (smSeed * 1103515245 + 12345) % 2147483648) / 2147483648)
const smMatrix = ref(
  Object.fromEntries(
    smPersons.map((p) => [
      p.id,
      Object.fromEntries(
        smSkills
          .map((s) => {
            const level = Math.min(4, Math.floor(smRand() * 5.4))
            if (!level) return null
            const r = smRand()
            const expiresAt = r < 0.08 ? Date.now() - 10 * smDay : r < 0.18 ? Date.now() + 12 * smDay : r < 0.6 ? Date.now() + 200 * smDay : null
            return [s.id, expiresAt ? { level, expiresAt } : { level }]
          })
          .filter(Boolean)
      ),
    ])
  )
)
const smLog = ref('')
const smSample = `<ChptSkillMatrix
  v-model:matrix="matrix"
  :persons="[{ id: 'A01', name: '陳小明', team: '早班' }, …]"
  :skills="[{ id: 'mount', name: '貼片機操作', group: 'SMT', required: 4 }, …]"
  :qualify-level="3"
  :warn-days="30"
  @change="({ person, skill, to }) => api.saveSkill(person.id, skill.id, to)"
/>

// matrix：人員 id → 技能 id → { level: 0–4, expiresAt? }
{ A01: { mount: { level: 4, expiresAt: '2027-03-31' }, aoi: { level: 2 } } }`
const smProps = [
  { name: 'persons', type: '{ id, name, team? }[]', def: '—', desc: '人員；team 可篩選（班別 / 組別）' },
  { name: 'skills', type: '{ id, name, group?, required? }[]', def: '—', desc: '技能；group 分區表頭；required 至少要幾個合格的人（低於時標紅）' },
  { name: 'v-model:matrix', type: 'Record<personId, Record<skillId, { level, expiresAt? }>>', def: '{}', desc: '等級 0–4（未訓練 / 訓練中 / 指導下作業 / 可獨立作業 / 可教導他人）與證照期限' },
  { name: 'qualifyLevel', type: 'number', def: '3', desc: '等級 ≥ 這個值且證照未過期才算合格' },
  { name: 'warnDays', type: 'number', def: '30', desc: '證照幾天內到期要提醒' },
  { name: 'now', type: 'number | Date | null', def: 'null', desc: '計算效期用的現在時間' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'readonly', type: 'boolean', def: 'false', desc: '只看' },
  { name: 'maxHeight', type: 'number | null', def: 'null', desc: '表格最大高度；超過時捲動，表頭與合格人數列固定' },
]
const smEvents = [
  { name: 'update:matrix', params: '(matrix)', desc: '調整等級後的矩陣' },
  { name: 'change', params: '({ person, skill, from, to })', desc: '某人某技能的等級改變（存檔用）' },
]
const smMethods = [
  { name: 'summary', type: 'SkillMatrixSummary', desc: '人力足夠的技能數、多能工人數、即將到期 / 已過期證照數' },
  { name: 'coverage', type: 'SkillCoverage[]', desc: '每個技能的合格人數與缺額' },
]
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

// ---- ImageCompare：待測品 = 標準樣品加上幾個缺陷 ----
const pcbAfterSvg = pcbSvg
  .replace('<rect x="460" y="70" width="90" height="40" rx="4" fill="#1f2937"/>', '<rect x="468" y="78" width="90" height="40" rx="4" fill="#1f2937" transform="rotate(6 513 98)"/>')
  .replace('</svg>', '<rect x="184" y="304" width="22" height="48" fill="#166534"/><path d="M226 182h28v14h-28z" fill="#d1d5db"/></svg>')
const pcbAfterImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pcbAfterSvg)}`
const compareMode = ref('slider')
const compareSample = `<ChptImageCompare
  v-model:mode="mode"
  :before="goldenUrl"
  :after="sampleUrl"
  before-label="標準樣品"
  after-label="待測 #0427"
/>
<!-- mode：'slider'（滑桿）| 'side'（並排）| 'overlay'（疊圖，可切「差異」） -->`
const compareProps = [
  { name: 'before / after', type: 'string', def: '—', desc: '基準影像（左邊 / 底層）與比對影像（右邊 / 上層）的網址' },
  { name: 'beforeLabel / afterLabel', type: 'string', def: '語系', desc: '影像名稱（角落標籤、替代文字）' },
  { name: 'v-model:mode', type: "'slider' | 'side' | 'overlay'", def: "'slider'", desc: '比對方式' },
  { name: 'v-model:position', type: 'number', def: '50', desc: '滑桿分隔線位置（0–100）' },
  { name: 'v-model:opacity', type: 'number', def: '50', desc: '疊圖時上層的不透明度（0–100）' },
  { name: 'v-model:difference', type: 'boolean', def: 'false', desc: '疊圖時用差異混合（相同處變黑）' },
  { name: 'height', type: 'number', def: '420', desc: '最大高度（px）；影像較扁時框會矮一點' },
  { name: 'maxZoom', type: 'number', def: '8', desc: '最大放大倍數（相對於整張）' },
  { name: 'showToolbar', type: 'boolean', def: 'true', desc: '顯示上方工具列（方式、透明度、縮放）' },
  { name: 'label', type: 'string', def: '語系', desc: '比對區的名稱（螢幕閱讀器）' },
]
const compareEvents = [
  { name: 'update:mode', params: '(mode: CompareMode)', desc: '切換比對方式' },
  { name: 'update:position', params: '(position: number)', desc: '移動分隔線' },
  { name: 'update:opacity', params: '(opacity: number)', desc: '調整透明度' },
  { name: 'update:difference', params: '(on: boolean)', desc: '切換差異混合' },
]
const compareMethods = [
  { name: 'fit()', type: '() => void', desc: '回到整張' },
  { name: 'zoomTo(r)', type: '(r: number) => void', desc: '縮放到相對於整張的 r 倍（以畫面中心）' },
]
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
// ---- ChptTimeScrubber：回放一個班的爐溫與不良率 ----
const replayStart = (() => {
  const d = new Date()
  d.setHours(8, 0, 0, 0)
  return d.getTime()
})()
const replayEnd = replayStart + 8 * 3_600_000
const replaySeries = (() => {
  let seed = 3
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  return Array.from({ length: 8 * 60 + 1 }, (_, i) => {
    const t = new Date(replayStart + i * 60_000)
    const spike = Math.exp(-(((i - 150) / 12) ** 2))
    return { t, key: String(i), temp: 245 + Math.sin(i / 40) * 2 + spike * 16 + (rand() - 0.5) * 1.5, defect: 0.5 + spike * 2.8 + rand() * 0.3 }
  })
})()
const replayLine = (field, color) => ({ type: 'line', data: replaySeries, xValue: (d) => d.t, yValue: (d) => d[field], keyFn: (d) => d.key, color, showDots: false, legend: { show: false } })
const replayCharts = [
  { key: 'temp', label: '爐溫 (°C)', domain: [238, 266], layers: [replayLine('temp', 'rgb(var(--t-chart-1))')] },
  { key: 'defect', label: '不良率 (%)', domain: null, layers: [replayLine('defect', 'rgb(var(--t-chart-4))')] },
]
const replayHHmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
const replayEvents = [
  { time: replayStart + 132 * 60_000, label: '爐溫偏高（第 6 區）', severity: 'major' },
  { time: replayStart + 148 * 60_000, label: '爐溫超限，自動降速', severity: 'critical' },
  { time: replayStart + 175 * 60_000, label: 'AOI 不良率超標', severity: 'critical' },
  { time: replayStart + 300 * 60_000, label: '換線 PCB-A12 → B07', severity: 'info' },
  { time: replayStart + 410 * 60_000, label: '吸嘴更換', severity: 'minor' },
]
const replayAt = ref(replayStart + 120 * 60_000)
const replayRange = ref(null)
const replayPlaying = ref(false)
const replaySync = useChartSync({ zoom: true, crosshair: true })
const replayReadout = computed(() => {
  const i = Math.max(0, Math.min(replaySeries.length - 1, Math.round((replayAt.value - replayStart) / 60_000)))
  const d = replaySeries[i]
  return `${replayHHmm(d.t)} · 爐溫 ${d.temp.toFixed(1)} °C · 不良率 ${d.defect.toFixed(2)} %`
})
const replaySample = `const sync = useChartSync({ zoom: true, crosshair: true })

<ChptTimeScrubber
  v-model="at" v-model:range="range" v-model:playing="playing"
  :start="shiftStart" :end="shiftEnd"
  :events="[{ time: '2026-11-23T10:28', label: '爐溫超限', severity: 'critical' }, …]"
  :sync="sync"
/>
<DualAxisComboChart v-bind="sync.bind()" :layers="tempLayers" x-scale-type="time" />
<DualAxisComboChart v-bind="sync.bind()" :layers="defectLayers" x-scale-type="time" />`
const replayProps = [
  { name: 'start / end', type: 'string | number | Date', def: '—', desc: '整段時間' },
  { name: 'v-model', type: 'number（毫秒）', def: 'start', desc: '播放頭的時間' },
  { name: 'v-model:range', type: '[number, number] | null', def: 'null', desc: '只看這一段；播放只在範圍內；拉回全部時為 null' },
  { name: 'v-model:playing', type: 'boolean', def: 'false', desc: '播放中' },
  { name: 'v-model:speed', type: 'number', def: '60', desc: '倍速（1 = 真實時間；60 = 1 秒播 1 分鐘）' },
  { name: 'speeds', type: 'number[]', def: '[1, 10, 60, 600, 3600]', desc: '倍速選項' },
  { name: 'events', type: 'TimelineEvent[]', def: '[]', desc: '事件標記（警報、換線、停機）' },
  { name: 'loop', type: 'boolean', def: 'false', desc: '播到結尾時從頭開始' },
  { name: 'step', type: 'number | null', def: 'null', desc: '鍵盤步進（毫秒）；不給時依總長度（約 1/100，取好讀的單位）' },
  { name: 'rangeSelectable', type: 'boolean', def: 'true', desc: '顯示範圍把手' },
  { name: 'sync', type: 'ChartSync | null', def: 'null', desc: 'useChartSync() 的結果：播放頭 → 十字線、範圍 → X 軸' },
  { name: 'timeFormat', type: '(ms) => string', def: 'null', desc: '時間格式（目前時間、刻度、事件）' },
  { name: 'label', type: 'string', def: '語系', desc: '區塊名稱（螢幕閱讀器）' },
]
const replayEventRows = [
  { name: 'time', type: 'string | number | Date', def: '—', desc: '發生時間' },
  { name: 'label', type: 'string', def: '—', desc: '說明（提示、螢幕閱讀器）' },
  { name: 'severity', type: "'critical' | 'major' | 'minor' | 'info'", def: "'info'", desc: '決定顏色（同 ChptAlarmCenter）' },
  { name: 'color / id', type: 'string / string | number', def: '—', desc: '自訂顏色、識別碼' },
]
const replayEmits = [
  { name: 'update:modelValue', params: '(ms: number)', desc: '播放頭移動（拖曳、播放、跳事件）' },
  { name: 'update:range', params: '(range: [number, number] | null)', desc: '範圍改變' },
  { name: 'update:playing', params: '(playing: boolean)', desc: '開始 / 停止播放（播到結尾會自動停止）' },
  { name: 'update:speed', params: '(speed: number)', desc: '切換倍速' },
  { name: 'event-click', params: '(event: TimelineEvent)', desc: '點一個事件標記' },
]
const replayMethods = [
  { name: 'play() / pause()', type: '() => void', desc: '播放 / 暫停' },
  { name: 'seek(ms)', type: '(ms: number) => void', desc: '跳到某個時間（限制在範圍內）' },
]
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
