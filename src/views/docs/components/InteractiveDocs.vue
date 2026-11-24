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
  ChptScheduler,
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
