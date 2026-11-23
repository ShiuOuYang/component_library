<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">🧱</span>
        <h1 class="text-4xl font-bold text-content-primary">佈局與流程元件</h1>
      </div>
      <p class="text-content-secondary text-lg max-w-4xl">
        ChptCard（卡片）、ChptCollapse（摺疊面板）、ChptBreadcrumb（麵包屑）、
        ChptSteps（步驟條）、ChptDivider（分隔線）。每個元件都附「Props / Events / Slots」與注意事項。
      </p>
    </div>

    <!-- ============ ChptCard ============ -->
    <section id="chpt-card" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptCard 卡片</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>將同主題的內容／操作收進一個區塊容器；可帶標題列、右上角額外區（如狀態標籤）與底部列。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptCard } from '@/components/library'</code>
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChptCard title="基本卡片" icon="inbox">
          <p class="text-sm text-content-secondary">透過 <code>title</code> / <code>icon</code> 與 <code>#extra</code> 插槽自訂標題列。</p>
          <template #extra>
            <ChptTag label="啟用" color="success" />
          </template>
        </ChptCard>

        <ChptCard title="含底部＋hover" icon="touch_app" hoverable @click="onCardClick">
          <p class="text-sm text-content-secondary">設定 <code>hoverable</code> 後滑入有 hover 效果；點擊會觸發 click 事件。</p>
          <template #footer>
            <p class="text-xs text-content-tertiary">footer 插槽內容</p>
          </template>
        </ChptCard>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="cardSample" />
      </div>

      <ApiTable of="ChptCard" title="Props" :rows="cardProps" />
      <ApiTable of="ChptCard" title="Events" :rows="cardEvents" />
      <ApiTable of="ChptCard" title="Slots" :rows="cardSlots" />

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong><code>padding</code> 控制內容留白（none/sm/md/lg）；帶 <code>#footer</code> 時底部會自動加邊框分隔。
      </p>
    </section>

    <!-- ============ ChptCollapse ============ -->
    <section id="chpt-collapse" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptCollapse 摺疊面板</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>把 FAQ、群組設定等內容垂直摺疊；一次只開一個（預設）或多個同時展開（multiple）。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptCollapse } from '@/components/library'</code>
      </p>

      <ChptCollapse v-model="openPanels" :items="collapses" :multiple="true" />

      <div class="mt-6">
        <ChptCodeBlock :code="collapseSample" />
      </div>

      <ApiTable of="ChptCollapse" title="Props" :rows="collapseProps" />
      <ApiTable of="ChptCollapse" title="Events" :rows="collapseEvents" />

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>展開狀態可用 <code>v-model</code> 綁定為 index 陣列；內容想自訂時以
        <code>#content-{index}</code> 插槽覆寫。
      </p>
    </section>

    <!-- ============ ChptBreadcrumb ============ -->
    <section id="chpt-breadcrumb" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptBreadcrumb 麵包屑</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>顯示目前頁面的階層路徑；每項可為純文字或 <code>to</code>（RouterLink），並支援點擊事件與自訂分隔符。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptBreadcrumb } from '@/components/library'</code>
      </p>

      <ChptBreadcrumb :items="crumbs" />

      <div class="mt-6">
        <ChptCodeBlock :code="breadcrumbSample" />
      </div>

      <ApiTable of="ChptBreadcrumb" title="Props" :rows="breadcrumbProps" />
      <ApiTable of="ChptBreadcrumb" title="Events" :rows="breadcrumbEvents" />
      <ApiTable of="ChptBreadcrumb" title="Slots" :rows="breadcrumbSlots" />

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>最後一項通常為目前頁面（不可點）；每項文字可用 <code>#item-{index}</code> 插槽自訂。
      </p>
    </section>

    <!-- ============ ChptSteps ============ -->
    <section id="chpt-steps" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptSteps 步驟條</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>引導多步驟流程（表單分頁、申請流程）；以狀態區分 done / process / pending。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptSteps } from '@/components/library'</code>
      </p>

      <ChptSteps :steps="steps" />

      <div class="mt-6 flex gap-4 items-center">
        <ChptButton size="sm" is-outline @click="stepBack">上一步</ChptButton>
        <ChptButton size="sm" @click="stepNext">下一步</ChptButton>
        <span class="text-xs text-content-tertiary">目前進度：第 {{ currentStep + 1 }} / {{ steps.length }} 步</span>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="stepsSample" />
      </div>

      <ApiTable of="ChptSteps" title="Props" :rows="stepsProps" />

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong><code>steps</code> 每項為 <code>{ title, status }</code>；<code>status</code>
        為 pending / process / done，由呼叫端更新狀態（如上例切換按鈕）。
      </p>
    </section>

    <!-- ============ ChptDivider ============ -->
    <section id="chpt-divider" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptDivider 分隔線</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>水平／垂直分隔區塊；水平時中間可放文字（如「或」），例如登入頁切換登入方式的隔線。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptDivider } from '@/components/library'</code>
      </p>

      <div class="flex items-center gap-6 my-2">
        <p class="text-sm text-content-secondary whitespace-nowrap">水平分隔線：</p>
        <div class="flex-1"><ChptDivider text="或" /></div>
      </div>
      <div class="h-16 flex items-center gap-6">
        <p class="text-sm text-content-secondary whitespace-nowrap">垂直分隔線：</p>
        <ChptDivider direction="vertical" class="h-10" />
        <ChptDivider direction="vertical" color="primary-300" class="h-10" />
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="dividerSample" />
      </div>

      <ApiTable of="ChptDivider" title="Props" :rows="dividerProps" />
      <ApiTable of="ChptDivider" title="Slots" :rows="dividerSlots" />

      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>垂直分隔線需自訂高度（如 <code>h-10</code>）才有可見長度；<code>color</code>
        傳的是 Tailwind 色名（如 primary-300），不需加 border- 前綴。
      </p>
    </section>

    <section id="chpt-dashboard-grid" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptDashboardGrid 儀表板格線</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>戰情室、產線看板這類「每個人想看的東西不一樣」的頁面。打開編輯模式後，
        拖標題列左側的把手移動、拖右下角調整大小，其他區塊會被推開、放開後往上靠攏；
        鍵盤使用者 Tab 到把手，方向鍵移動、Shift + 方向鍵調整大小。版面用 v-model 存到後端，或用 <code>persist-key</code> 記在瀏覽器。
        寬度小於 640px 時改成一欄（手機）。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptDashboardGrid } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <div class="mb-3 flex flex-wrap items-center gap-3">
          <ChptSwitch v-model="dashEditable" label="編輯版面" />
          <ChptButton size="xs" is-outline @click="resetDashboard">還原預設版面</ChptButton>
        </div>
        <ChptDashboardGrid ref="dashRef" v-model="dashLayout" :cols="12" :row-height="64" :editable="dashEditable" persist-key="docs-dashboard">
          <template #oee>
            <p class="text-3xl font-semibold tabular-nums text-content-primary">87.4<span class="text-base text-content-tertiary">%</span></p>
            <p class="text-xs text-content-tertiary">目標 85%</p>
          </template>
          <template #output>
            <p class="text-3xl font-semibold tabular-nums text-content-primary">12,480</p>
            <p class="text-xs text-content-tertiary">今日產量（pcs）</p>
          </template>
          <template #yield>
            <p class="text-3xl font-semibold tabular-nums text-content-primary">98.6<span class="text-base text-content-tertiary">%</span></p>
            <p class="text-xs text-content-tertiary">FPY</p>
          </template>
          <template #alarm>
            <ul class="space-y-1 text-sm text-content-secondary">
              <li><span class="mr-3 tabular-nums text-content-tertiary">10:32</span>SMT-3 吸嘴堵塞（已排除）</li>
              <li><span class="mr-3 tabular-nums text-content-tertiary">11:05</span>AOI-1 誤判率偏高</li>
              <li><span class="mr-3 tabular-nums text-content-tertiary">13:47</span>回焊爐 A-03 溫度偏高</li>
            </ul>
          </template>
          <template #shift>
            <p class="text-sm text-content-secondary">早班：王小明（線長）</p>
            <p class="text-sm text-content-secondary">夜班：陳大文（線長）</p>
          </template>
          <template #actions="{ item }">
            <ChptTag v-if="item.static" size="sm">固定</ChptTag>
          </template>
        </ChptDashboardGrid>
      </div>
      <div class="mt-6">
        <ChptCodeBlock :code="dashboardSample" />
      </div>
      <ApiTable of="ChptDashboardGrid" title="Props" :rows="dashboardProps" />
      <ApiTable of="-" title="DashboardItem（版面的每一筆）" :rows="dashboardItemRows" />
      <ApiTable of="ChptDashboardGrid" title="Events" :rows="dashboardEvents" />
      <ApiTable of="ChptDashboardGrid" title="Slots" :rows="dashboardSlots" />
      <ApiTable of="ChptDashboardGrid" title="方法（ref）" :rows="dashboardMethods" />
    </section>

    <!-- ============ ChptEquipmentWall ============ -->
    <section id="chpt-equipment-wall" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptEquipmentWall 機台狀態牆</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>產線看板、值班畫面 —— 一眼看出哪幾台停了、停多久、為什麼。每台一張卡：狀態（顏色 + 圖示 + 文字）、
        已持續多久、警報原因、工單、稼動率與其他數值；停機的卡片整張帶紅。工具列的狀態數量也是篩選，可搜尋名稱、工單、料號。
        狀態改變時卡片閃一下外框，變成停機時以 aria-live 念出。鍵盤：整面牆一個 Tab 停駐點，方向鍵在卡片間移動。
        狀態名稱與 StateTimeline 相同，同一份 MES 資料可以兩邊共用。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptEquipmentWall } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <div class="mb-3 flex flex-wrap items-center gap-4">
          <ChptSwitch v-model="wallLive" label="模擬即時更新（每 3 秒）" />
          <ChptSwitch v-model="wallCompact" label="精簡" />
          <ChptSwitch v-model="wallSortStatus" label="停機排前面" />
        </div>
        <ChptEquipmentWall
          :items="machines"
          :density="wallCompact ? 'compact' : 'comfortable'"
          :sort-by="wallSortStatus ? 'status' : 'none'"
          @item-click="(m) => (pickedMachine = m.name)"
        />
        <p class="mt-3 text-sm text-content-secondary" aria-live="polite">{{ pickedMachine ? `開啟 ${pickedMachine} 的明細` : '點一張卡片開啟明細' }}</p>
      </div>
      <ChptCodeBlock class="mt-6" :code="wallSample" />
      <ApiTable of="ChptEquipmentWall" title="Props" :rows="wallProps" />
      <ApiTable of="-" title="EquipmentItem（items 的每一筆）" :rows="wallItemRows" />
      <ApiTable of="ChptEquipmentWall" title="Events" :rows="wallEvents" />
      <ApiTable of="ChptEquipmentWall" title="Slots" :rows="wallSlots" />
      <ApiTable of="ChptEquipmentWall" title="方法（ref）" :rows="wallMethods" />
    </section>

    <!-- ============ ChptFloorPlan ============ -->
    <section id="chpt-floor-plan" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptFloorPlan 廠區配置圖</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>把機台畫在廠區平面圖上，一眼看出停機的在哪一區。資料和上面的 ChptEquipmentWall <strong>是同一份</strong>
        （EquipmentItem 加上 <code>x</code> / <code>y</code>）—— 打開上面的「模擬即時更新」，這裡也會跟著變。平面圖可以是背景圖片或區域（zones），
        座標用自己的單位（這裡是公尺）。Ctrl + 滾輪或兩指縮放、拖曳平移；點機台看明細；圖例可只突顯某個狀態。
        鍵盤：Tab 進入後方向鍵依位置移動（移到畫面外會自動平移）、Enter 看明細、+ / − / 0 縮放。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptFloorPlan } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <ChptFloorPlan :items="placedMachines" :plan-width="60" :plan-height="32" :zones="floorZones" :height="380" label="二廠 1F 配置圖" />
      </div>
      <ChptCodeBlock class="mt-6" :code="floorSample" />
      <ApiTable of="ChptFloorPlan" title="Props" :rows="floorProps" />
      <ApiTable of="-" title="FloorPlanItem / FloorZone" :rows="floorDataRows" />
      <ApiTable of="ChptFloorPlan" title="Events" :rows="floorEvents" />
      <ApiTable of="ChptFloorPlan" title="Slots" :rows="floorSlots" />
      <ApiTable of="ChptFloorPlan" title="方法（ref）" :rows="floorMethods" />
    </section>

    <!-- ============ ChptAlarmCenter ============ -->
    <section id="chpt-alarm-center" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptAlarmCenter 警報中心</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>要有人處理的設備 / 品質警報（ChptLogViewer 是原始紀錄，這裡是待辦清單）。
        排序是「未確認 → 已確認 → 暫停 → 已結束」，同狀態再依嚴重度與時間；嚴重度同時用顏色、圖示與文字。
        可以<strong>確認</strong>（記下確認人與時間）、<strong>暫停</strong>一段時間（時間到自動回來）、<strong>升級</strong>（通知上一層）。
        條件已恢復但還沒人確認的警報仍算未確認、標「已恢復」—— 短暫的異常也要讓人知道發生過；確認後才結束。
        未確認的嚴重警報色條閃動（系統設定減少動態效果時不閃），新警報以 aria-live 念出；開啟 <code>sound</code> 時有未確認的嚴重 / 重要警報就定時響，可靜音。
        鍵盤：↑↓ 在警報間移動、A 確認、S 暫停、E 升級、Enter 展開說明。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptAlarmCenter } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <div class="mb-3 flex flex-wrap items-center gap-4">
          <ChptSwitch v-model="alarmLive" label="模擬新警報（每 5 秒）" />
          <ChptSwitch v-model="alarmSound" label="警報音" />
        </div>
        <ChptAlarmCenter
          v-model="alarms"
          operator="王小明"
          :sound="alarmSound"
          :max-height="460"
          @ack="(ids) => toast.success(`已確認 ${ids.length} 筆`)"
          @escalate="(ids) => toast.info(`已通知課長（${ids.length} 筆）`)"
        />
      </div>
      <ChptCodeBlock class="mt-6" :code="alarmSample" />
      <ApiTable of="ChptAlarmCenter" title="Props" :rows="alarmProps" />
      <ApiTable of="-" title="AlarmItem（v-model 的每一筆）" :rows="alarmItemRows" />
      <ApiTable of="ChptAlarmCenter" title="Events" :rows="alarmEvents" />
      <ApiTable of="ChptAlarmCenter" title="Slots" :rows="alarmSlots" />
      <ApiTable of="ChptAlarmCenter" title="方法（ref）" :rows="alarmMethods" />
    </section>

    <!-- ============ ChptAndonBoard ============ -->
    <section id="chpt-andon-board" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptAndonBoard 安東看板</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>給產線大螢幕的呼叫看板 —— 站點呼叫維修、缺料、品質、主管，大家都看得到誰在等、等多久。
        每站一張卡片：綠色是正常；有呼叫時依等待時間由黃轉紅（紅色閃動）。還沒人回應時依「等了多久」、處理中時依「處理了多久」升級
        （<code>thresholds</code>，分鐘；這裡為了示範設成很短）。呼叫、回應、完成都在卡片上操作；「電視模式」字更大，另有全螢幕按鈕。
        ChptAlarmCenter 是設備自己報的警報；安東是人按的呼叫，兩者可以並用。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptAndonBoard } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <div class="mb-3 flex flex-wrap items-center gap-4">
          <ChptSwitch v-model="andonLive" label="模擬現場呼叫（每 6 秒）" />
          <ChptSwitch v-model="andonTv" label="電視模式" />
          <ChptSwitch v-model="andonActiveFirst" label="有呼叫的站排前面" />
        </div>
        <ChptAndonBoard
          v-model="andonCalls"
          :stations="andonStations"
          :thresholds="{ respond: [0.5, 1.5], resolve: [2, 4] }"
          operator="陳技術員"
          :tv="andonTv"
          :active-first="andonActiveFirst"
          title="二廠 1F"
          @resolve="(c) => toast.success(`${c.station} 的呼叫已完成`)"
        />
      </div>
      <ChptCodeBlock class="mt-6" :code="andonSample" />
      <ApiTable of="ChptAndonBoard" title="Props" :rows="andonProps" />
      <ApiTable of="-" title="AndonStation / AndonCall / AndonCallType" :rows="andonDataRows" />
      <ApiTable of="ChptAndonBoard" title="Events" :rows="andonEvents" />
      <ApiTable of="ChptAndonBoard" title="方法（ref）" :rows="andonMethods" />
    </section>

    <!-- ============ ChptApprovalFlow ============ -->
    <section id="chpt-approval-flow" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptApprovalFlow 簽核流程</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>工程變更（ECN）、異常處理單、採購單的簽核進度與簽核動作。關卡依序進行；多人關卡可以是
        <strong>會簽</strong>（全部同意）或<strong>或簽</strong>（一人同意即可），任一人退回整份退回。每一關顯示花了 / 已經等了多久，
        超過 <code>slaHours</code> 標示逾時。簽核人可以<strong>委託</strong>給別人代理。輪到 <code>operator</code>（或他是代理人）時，
        該關卡下方出現簽核區：意見、同意、退回（退回要寫原因）、委託。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptApprovalFlow } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <div class="mb-3 flex flex-wrap items-center gap-3">
          <span class="text-sm text-content-secondary">以誰的身分檢視：</span>
          <ChptSegmented v-model="approvalOperator" :options="approvalOperators" aria-label="檢視身分" size="xs" />
          <ChptButton size="xs" is-outline icon="restart_alt" @click="approvalFlow = makeApprovalFlow()">重設</ChptButton>
        </div>
        <ChptApprovalFlow
          v-model="approvalFlow"
          :operator="approvalOperator"
          :delegates="approvalDelegates"
          @approve="() => toast.success('已同意（送出到後端）')"
          @reject="() => toast.warning('已退回')"
          @delegate="(p) => toast.info(`已委託給 ${p.to.name}`)"
        />
      </div>
      <ChptCodeBlock class="mt-6" :code="approvalSample" />
      <ApiTable of="ChptApprovalFlow" title="Props" :rows="approvalProps" />
      <ApiTable of="-" title="ApprovalFlowData / ApprovalStep / Approver" :rows="approvalDataRows" />
      <ApiTable of="ChptApprovalFlow" title="Events" :rows="approvalEvents" />
      <ApiTable of="ChptApprovalFlow" title="方法（ref）" :rows="approvalMethods" />
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  ChptCard,
  ChptCollapse,
  ChptBreadcrumb,
  ChptSteps,
  ChptDivider,
  ChptButton,
  ChptTag,
  ChptCodeBlock,
  ChptDashboardGrid,
  ChptSwitch,
  ChptEquipmentWall,
  ChptFloorPlan,
  ChptAlarmCenter,
  ChptAndonBoard,
  ChptApprovalFlow,
  ChptSegmented,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

// ---- ChptEquipmentWall ----
const minutesAgo = (m) => Date.now() - m * 60_000
const machines = ref([
  { id: 'm1', name: 'SMT-01 印刷機', group: 'SMT 一線', status: 'run', since: minutesAgo(184), utilization: 92, workOrder: 'WO-2611-0042', product: 'PCB-A12', metrics: [{ label: '產出', value: 1260, unit: 'pcs' }, { label: 'CT', value: 21.4, unit: 's' }] },
  { id: 'm2', name: 'SMT-02 貼片機', group: 'SMT 一線', status: 'down', since: minutesAgo(25), alarm: '吸嘴 N3 真空異常', utilization: 71, workOrder: 'WO-2611-0042', product: 'PCB-A12' },
  { id: 'm3', name: 'SMT-03 貼片機', group: 'SMT 一線', status: 'run', since: minutesAgo(312), utilization: 88, workOrder: 'WO-2611-0042', metrics: [{ label: '拋料率', value: 0.12, unit: '%' }] },
  { id: 'm4', name: 'SMT-04 回焊爐', group: 'SMT 一線', status: 'run', since: minutesAgo(600), utilization: 95, metrics: [{ label: '峰溫', value: 245, unit: '°C' }] },
  { id: 'm5', name: 'SMT-05 印刷機', group: 'SMT 二線', status: 'idle', since: minutesAgo(12), alarm: '等待物料', utilization: 64, workOrder: 'WO-2611-0051' },
  { id: 'm6', name: 'SMT-06 貼片機', group: 'SMT 二線', status: 'maintenance', since: minutesAgo(95), alarm: '週保養', utilization: 40 },
  { id: 'm7', name: 'SMT-07 貼片機', group: 'SMT 二線', status: 'run', since: minutesAgo(48), utilization: 83, workOrder: 'WO-2611-0051', product: 'PCB-B07' },
  { id: 'm8', name: 'SMT-08 回焊爐', group: 'SMT 二線', status: 'run', since: minutesAgo(1500), utilization: 90 },
  { id: 'm9', name: 'AOI-01', group: '檢測', status: 'run', since: minutesAgo(130), utilization: 86, metrics: [{ label: '誤判', value: 3.1, unit: '%' }] },
  { id: 'm10', name: 'AOI-02', group: '檢測', status: 'offline', since: minutesAgo(8) },
  { id: 'm11', name: 'ICT-01', group: '檢測', status: 'run', since: minutesAgo(75), utilization: 78, workOrder: 'WO-2611-0042' },
  { id: 'm12', name: 'FCT-01', group: '檢測', status: 'idle', since: minutesAgo(3), utilization: 58 },
])
const wallLive = ref(false)
const wallCompact = ref(false)
const wallSortStatus = ref(false)
const pickedMachine = ref('')
const ALARMS = ['吸嘴真空異常', '飛達卡料', '軌道卡板', '溫度超出規格']
let wallTimer = null
let tick = 0
watch(wallLive, (on) => {
  clearInterval(wallTimer)
  if (!on) return
  wallTimer = setInterval(() => {
    // 固定的輪替（不用亂數）：每次改一台機台的狀態
    tick++
    const m = machines.value[(tick * 5) % machines.value.length]
    const next = m.status === 'run' ? (tick % 3 === 0 ? 'down' : 'idle') : 'run'
    m.status = next
    m.since = Date.now()
    m.alarm = next === 'down' ? ALARMS[tick % ALARMS.length] : next === 'idle' ? '等待物料' : undefined
  }, 3000)
})
onBeforeUnmount(() => clearInterval(wallTimer))
// ---- ChptFloorPlan：同一份 machines 資料加上位置（公尺） ----
const machinePos = {
  m1: [4, 5], m2: [10, 5], m3: [16, 5], m4: [22, 4.5, 8, 4],
  m5: [4, 15], m6: [10, 15], m7: [16, 15], m8: [22, 14.5, 8, 4],
  m9: [38, 6], m10: [44, 6], m11: [38, 15], m12: [44, 15],
}
const placedMachines = computed(() =>
  machines.value.map((m) => {
    const [x, y, w, h] = machinePos[m.id]
    return { ...m, x, y, w: w ?? 5, h: h ?? 3 }
  })
)
const floorZones = [
  { id: 'z1', label: 'SMT 一線', x: 2, y: 2, w: 30, h: 8 },
  { id: 'z2', label: 'SMT 二線', x: 2, y: 12, w: 30, h: 8 },
  { id: 'z3', label: '檢測區', x: 36, y: 2, w: 16, h: 18 },
  { id: 'z4', label: '物料倉', x: 2, y: 23, w: 22, h: 7, color: 'rgb(var(--t-surface-muted))' },
  { id: 'z5', label: '出貨區', x: 36, y: 23, w: 22, h: 7, color: 'rgb(var(--t-surface-muted))' },
]
const floorSample = `<ChptFloorPlan :items="machines" :plan-width="60" :plan-height="32" :zones="zones" @item-click="openDetail">
  <template #detail="{ item }">…自訂明細…</template>
</ChptFloorPlan>

// machines：ChptEquipmentWall 的資料加上位置（平面圖單位）
//   { id: 'm2', name: 'SMT-02 貼片機', status: 'down', since, alarm, x: 10, y: 5, w: 5, h: 3 }
// zones：[{ id: 'z1', label: 'SMT 一線', x: 2, y: 2, w: 30, h: 8 }]
// 或用平面圖圖片：background-src="/floor-2f.png"`
const floorProps = [
  { name: 'items', type: 'FloorPlanItem[]', def: '—', desc: 'EquipmentItem 加上 x / y（左上角）與 w / h（預設 4 × 3）' },
  { name: 'planWidth / planHeight', type: 'number', def: '—', desc: '平面圖大小（自己的單位：公尺、格）' },
  { name: 'zones', type: 'FloorZone[]', def: '[]', desc: '區域（產線、倉庫）：虛線框與名稱' },
  { name: 'backgroundSrc', type: 'string', def: "''", desc: '平面圖圖片（拉伸到 planWidth × planHeight）' },
  { name: 'height', type: 'number', def: '420', desc: '高度（px），寬度跟著容器' },
  { name: 'minZoom / maxZoom', type: 'number', def: '0.5 / 8', desc: '相對於「整張」的縮放範圍' },
  { name: 'showLegend', type: 'boolean', def: 'true', desc: '圖例（各狀態數量，點了只突顯該狀態）' },
  { name: 'now', type: 'number | Date | null', def: 'null', desc: '計算持續時間用的現在時間；不給時每 30 秒更新' },
  { name: 'label', type: 'string', def: '語系', desc: '圖的名稱（螢幕閱讀器）' },
]
const floorDataRows = [
  { name: 'FloorPlanItem', type: 'EquipmentItem & { x, y, w?, h? }', def: '—', desc: '狀態欄位與 ChptEquipmentWall 相同' },
  { name: 'FloorZone', type: '{ id, label, x, y, w, h, color? }', def: '—', desc: '區域；color 為底色（任何 CSS 顏色）' },
]
const floorEvents = [{ name: 'item-click', params: '(item: FloorPlanItem)', desc: '點擊或 Enter 一台機台' }]
const floorSlots = [{ name: 'detail', params: '{ item }', desc: '明細卡的內容（預設：狀態、持續時間、警報、工單、稼動率）' }]
const floorMethods = [
  { name: 'fit()', type: '() => void', desc: '回到整張平面圖' },
  { name: 'select(id)', type: '(id: string | null) => void', desc: '選取並聚焦某一台；null 關閉明細' },
]

const wallSample = `<ChptEquipmentWall :items="machines" sort-by="status" @item-click="openDetail">
  <template #extra="{ item }">
    <ChptButton v-if="item.status === 'down'" size="xs" @click.stop="callTech(item)">呼叫技術員</ChptButton>
  </template>
</ChptEquipmentWall>

// machines：[{ id: 'm2', name: 'SMT-02 貼片機', group: 'SMT 一線', status: 'down',
//              since: '2026-11-20T08:35:00', alarm: '吸嘴 N3 真空異常', utilization: 71,
//              workOrder: 'WO-2611-0042', metrics: [{ label: '產出', value: 1260, unit: 'pcs' }] }]`
const wallProps = [
  { name: 'items', type: 'EquipmentItem[]', def: '—', desc: '機台清單；狀態改變時傳新陣列或直接改物件都可以' },
  { name: 'groupBy', type: 'boolean', def: '有 group 就分組', desc: '依 group（產線、區域）分組，每組標題顯示各狀態數量' },
  { name: 'sortBy', type: "'none' | 'status' | 'name'", def: "'none'", desc: '排序：保持原順序／停機 > 保養 > 待機 > 離線 > 運轉／名稱（數字自然排序）' },
  { name: 'minCardWidth', type: 'number', def: '200', desc: '卡片最小寬度（px），欄數依容器寬度自動決定' },
  { name: 'density', type: "'comfortable' | 'compact'", def: "'comfortable'", desc: '精簡模式只顯示名稱、狀態、時間與警報' },
  { name: 'showToolbar / searchable', type: 'boolean', def: 'true', desc: '工具列（狀態數量＝篩選、平均稼動率）／搜尋框' },
  { name: 'announceStatuses', type: 'EquipmentStatus[]', def: "['down']", desc: '變成這些狀態時以 aria-live 念出' },
  { name: 'now', type: 'number | Date | null', def: 'null', desc: '計算持續時間用的現在時間；不給時每 30 秒自己更新' },
]
const wallItemRows = [
  { name: 'id / name', type: 'string', def: '—', desc: '唯一鍵／顯示名稱' },
  { name: 'status', type: "'run' | 'idle' | 'maintenance' | 'down' | 'offline'", def: '—', desc: '狀態（顏色 + 圖示 + 文字）' },
  { name: 'group', type: 'string', def: '—', desc: '分組（產線、區域）' },
  { name: 'since', type: 'string | number | Date', def: '—', desc: '進入目前狀態的時間（顯示「已停機 25 分」）' },
  { name: 'alarm', type: 'string', def: '—', desc: '警報或停機原因（停機時紅字）' },
  { name: 'utilization', type: 'number（0–100）', def: '—', desc: '稼動率（進度條）' },
  { name: 'workOrder / product', type: 'string', def: '—', desc: '目前工單／料號（可搜尋）' },
  { name: 'metrics', type: '{ label, value, unit? }[]', def: '—', desc: '其他數值，顯示前三個' },
]
const wallEvents = [{ name: 'item-click', params: '(item: EquipmentItem)', desc: '點擊或 Enter 一張卡片（有綁時卡片是按鈕）' }]
const wallSlots = [{ name: 'extra', params: '{ item }', desc: '卡片最下方的自訂內容（按鈕請加 @click.stop）' }]
const wallMethods = [
  { name: 'setStatusFilter(statuses)', type: '(statuses: EquipmentStatus[]) => void', desc: '設定狀態篩選（空陣列為全部）' },
  { name: 'setQuery(q)', type: '(q: string) => void', desc: '設定搜尋文字' },
]
import { useToast } from '@/components/library'

/** 文件示範的事件回饋（DocLayout 掛了全域 ChptToast） */
const toast = useToast()

// ---- ChptAndonBoard ----
const andonStations = [
  { id: 's1', name: 'SMT-01 印刷', group: 'SMT 一線' },
  { id: 's2', name: 'SMT-02 貼片', group: 'SMT 一線' },
  { id: 's3', name: 'SMT-04 回焊', group: 'SMT 一線' },
  { id: 's4', name: 'AOI-01', group: '檢測' },
  { id: 's5', name: '手插 A', group: 'DIP 線' },
  { id: 's6', name: '波焊', group: 'DIP 線' },
  { id: 's7', name: 'ICT-01', group: '檢測' },
  { id: 's8', name: '包裝', group: '出貨' },
]
const secondsAgo = (s) => Date.now() - s * 1000
const andonCalls = ref([
  { id: 'c1', station: 's2', type: 'maintenance', raisedAt: secondsAgo(130), by: '林作業員', note: '吸嘴 N3 真空異常' },
  { id: 'c2', station: 's4', type: 'quality', raisedAt: secondsAgo(40), by: '王檢驗員' },
  { id: 'c3', station: 's5', type: 'material', raisedAt: secondsAgo(200), respondedAt: secondsAgo(90), responder: '倉管小李' },
  { id: 'c4', station: 's8', type: 'supervisor', raisedAt: secondsAgo(500), respondedAt: secondsAgo(480), resolvedAt: secondsAgo(300), responder: '張組長' },
])
const andonLive = ref(false)
const andonTv = ref(false)
const andonActiveFirst = ref(false)
let andonTimer = null
let andonTick = 0
watch(andonLive, (on) => {
  clearInterval(andonTimer)
  if (!on) return
  andonTimer = setInterval(() => {
    // 固定輪替：某一站呼叫某種原因（同一站同一原因進行中時不會重複）
    andonTick++
    const station = andonStations[(andonTick * 3) % andonStations.length].id
    const type = ['maintenance', 'material', 'quality', 'supervisor'][andonTick % 4]
    if (andonCalls.value.some((c) => c.station === station && c.type === type && !c.resolvedAt)) return
    andonCalls.value = [...andonCalls.value, { id: `live-${andonTick}`, station, type, raisedAt: Date.now(), by: '作業員' }]
  }, 6000)
})
onBeforeUnmount(() => clearInterval(andonTimer))
const andonSample = `<ChptAndonBoard
  v-model="calls"
  :stations="[{ id: 's1', name: 'SMT-01 印刷', group: 'SMT 一線' }, …]"
  :thresholds="{ respond: [3, 10], resolve: [20, 45] }"
  :operator="user.name"
  tv sound
  @raise="api.raise" @respond="api.respond" @resolve="api.resolve"
/>

// calls：[{ id: 'c1', station: 's2', type: 'maintenance', raisedAt: '2026-11-23T09:12', by: '林作業員', note: '吸嘴異常' }]
// 回應後：respondedAt、responder；完成後：resolvedAt（看板只顯示進行中的呼叫）`
const andonProps = [
  { name: 'stations', type: 'AndonStation[]', def: '—', desc: '站點（每站一張卡片）' },
  { name: 'v-model', type: 'AndonCall[]', def: '—', desc: '呼叫清單（可以包含已完成的）' },
  { name: 'types', type: 'AndonCallType[]', def: '維修、缺料、品質、主管', desc: '呼叫原因（key、label、icon）；預設的名稱依語系' },
  { name: 'thresholds', type: '{ respond: [黃, 紅], resolve: [黃, 紅] }', def: '{ respond: [3, 10], resolve: [20, 45] }', desc: '升級門檻（分鐘）：未回應等了多久、處理中處理了多久' },
  { name: 'operator', type: 'string', def: "''", desc: '目前操作的人（呼叫記在 by、回應記在 responder）' },
  { name: 'tv', type: 'boolean', def: 'false', desc: '電視模式：字更大、卡片更寬' },
  { name: 'sound', type: 'boolean', def: 'false', desc: '新呼叫與轉紅時響（可靜音）' },
  { name: 'canRaise', type: 'boolean', def: 'true', desc: '卡片下方的呼叫按鈕' },
  { name: 'readonly', type: 'boolean', def: 'false', desc: '只顯示（例如走廊的大螢幕）' },
  { name: 'activeFirst', type: 'boolean', def: 'false', desc: '有呼叫的站（越嚴重越前面）排前面' },
  { name: 'now', type: 'number | Date | null', def: 'null', desc: '計時用的現在時間；不給時每秒更新' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
]
const andonDataRows = [
  { name: 'AndonStation', type: '{ id, name, group? }', def: '—', desc: '站點' },
  { name: 'AndonCall', type: '{ id, station, type, raisedAt, by?, note?, respondedAt?, responder?, resolvedAt? }', def: '—', desc: '狀態：未回應 → 處理中（respondedAt）→ 完成（resolvedAt）' },
  { name: 'AndonCallType', type: '{ key, label, icon? }', def: '—', desc: 'icon 是 Material Symbols 名稱' },
]
const andonEvents = [
  { name: 'update:modelValue', params: '(calls: AndonCall[])', desc: '呼叫清單更新（v-model）' },
  { name: 'raise', params: '(call: AndonCall)', desc: '新增呼叫（同一站同一原因進行中時不會重複）' },
  { name: 'respond', params: '(call: AndonCall)', desc: '回應' },
  { name: 'resolve', params: '(call: AndonCall)', desc: '完成' },
]
const andonMethods = [
  { name: 'raise(stationId, type)', type: '(stationId: string, type: string) => void', desc: '由程式呼叫（例如設備自動觸發）' },
  { name: 'toggleFullscreen()', type: '() => Promise<void>', desc: '切換全螢幕' },
]

// ---- ChptApprovalFlow ----
const hoursAgo = (h) => Date.now() - h * 3_600_000
const makeApprovalFlow = () => ({
  submittedAt: hoursAgo(30),
  submitter: '張工程師',
  steps: [
    { id: 's1', name: '申請單位主管', approvers: [{ id: 'u-lee', name: '李組長', title: 'SMT 組長', status: 'approved', actedAt: hoursAgo(27), comment: '同意，請製程確認回焊曲線。' }], slaHours: 8 },
    {
      id: 's2',
      name: '製程 / 品保會簽',
      mode: 'all',
      slaHours: 24,
      approvers: [
        { id: 'u-chen', name: '陳工程師', title: '製程', status: 'approved', actedAt: hoursAgo(20) },
        { id: 'u-wu', name: '吳課長', title: '品保', delegatedTo: { id: 'u-lin', name: '林副課長', title: '品保' }, delegatedAt: hoursAgo(10) },
        { id: 'u-huang', name: '黃工程師', title: '設備' },
      ],
    },
    { id: 's3', name: '廠長核准', mode: 'any', approvers: [{ id: 'u-ho', name: '何廠長' }, { id: 'u-tsai', name: '蔡副廠長' }], slaHours: 8 },
  ],
})
const approvalFlow = ref(makeApprovalFlow())
const approvalOperator = ref('u-huang')
const approvalOperators = [
  { label: '黃工程師（待簽）', value: 'u-huang' },
  { label: '林副課長（代理）', value: 'u-lin' },
  { label: '何廠長', value: 'u-ho' },
  { label: '訪客', value: 'guest' },
]
const approvalDelegates = [
  { id: 'u-kao', name: '高工程師', title: '設備' },
  { id: 'u-lin', name: '林副課長', title: '品保' },
  { id: 'u-ho', name: '何廠長' },
]
const approvalSample = `<ChptApprovalFlow v-model="flow" :operator="user.id" :delegates="colleagues" @approve="api.approve" @reject="api.reject" @delegate="api.delegate" />

// flow：
// { submittedAt: '2026-11-22T09:00', submitter: '張工程師', steps: [
//   { id: 's1', name: '申請單位主管', approvers: [{ id: 'u-lee', name: '李組長', status: 'approved', actedAt: … }], slaHours: 8 },
//   { id: 's2', name: '製程 / 品保會簽', mode: 'all', approvers: [{ id: 'u-chen', name: '陳工程師' }, { id: 'u-wu', name: '吳課長' }] },
//   { id: 's3', name: '廠長核准', mode: 'any', approvers: [{ id: 'u-ho', name: '何廠長' }, { id: 'u-tsai', name: '蔡副廠長' }] },
// ] }`
const approvalProps = [
  { name: 'v-model', type: 'ApprovalFlowData', def: '—', desc: '整份流程資料；簽核動作直接改這份資料' },
  { name: 'operator', type: 'string', def: "''", desc: '目前操作的人（id）；輪到他（或他是代理人）時顯示簽核區' },
  { name: 'delegates', type: '{ id, name, title? }[]', def: '[]', desc: '可以委託的人（自動排除自己與同一關的簽核人）' },
  { name: 'requireRejectComment', type: 'boolean', def: 'true', desc: '退回時一定要寫原因' },
  { name: 'readonly', type: 'boolean', def: 'false', desc: '只顯示進度，不顯示簽核區' },
  { name: 'now', type: 'number | Date | null', def: 'null', desc: '計算等待時間用的現在時間；不給時每分鐘更新' },
  { name: 'label', type: 'string', def: '語系', desc: '區塊名稱（螢幕閱讀器）' },
]
const approvalDataRows = [
  { name: 'ApprovalFlowData', type: '{ submittedAt, submitter?, steps }', def: '—', desc: '送出時間、送出者、關卡' },
  { name: 'ApprovalStep', type: '{ id, name, mode?, approvers, slaHours? }', def: '—', desc: "mode：'single' | 'all'（會簽）| 'any'（或簽）；多人時預設 all" },
  { name: 'Approver', type: '{ id, name, title?, status?, actedAt?, comment?, delegatedTo?, delegatedAt? }', def: '—', desc: "status：'pending' | 'approved' | 'rejected'；委託時記的是代理人的決定" },
]
const approvalEvents = [
  { name: 'update:modelValue', params: '(flow: ApprovalFlowData)', desc: '簽核後的流程資料（v-model）' },
  { name: 'approve', params: '({ stepId, approverId, comment })', desc: '同意' },
  { name: 'reject', params: '({ stepId, approverId, comment })', desc: '退回' },
  { name: 'delegate', params: '({ stepId, approverId, to })', desc: '委託' },
]
const approvalMethods = [{ name: 'acting', type: '{ stepIndex, approver } | null', desc: '目前輪到 operator 簽的關卡與簽核人' }]

// ---- ChptAlarmCenter ----
const alarms = ref([
  { id: 'a1', title: '吸嘴 N3 真空異常', severity: 'critical', code: 'E-1023', source: 'SMT-02 貼片機', group: 'SMT 一線', raisedAt: minutesAgo(25), count: 3, detail: '真空值低於 -60 kPa 持續 5 秒。\n建議：檢查吸嘴是否堵塞、真空管是否脫落。' },
  { id: 'a2', title: '回焊爐第 6 區溫度偏高', severity: 'major', code: 'T-0602', source: 'SMT-08 回焊爐', group: 'SMT 二線', raisedAt: minutesAgo(9), cleared: true, clearedAt: minutesAgo(4), detail: '實測 252 °C，上限 250 °C（已回到規格內，仍需確認）。' },
  { id: 'a3', title: '飛達 F12 即將缺料', severity: 'minor', code: 'M-0112', source: 'SMT-07 貼片機', group: 'SMT 二線', raisedAt: minutesAgo(6) },
  { id: 'a4', title: 'AOI-02 通訊中斷', severity: 'major', code: 'N-0001', source: 'AOI-02', group: '檢測', raisedAt: minutesAgo(8), acked: true, ackedBy: '陳技術員', ackedAt: minutesAgo(5) },
  { id: 'a5', title: '週保養到期', severity: 'info', code: 'PM-W', source: 'SMT-06 貼片機', group: 'SMT 二線', raisedAt: minutesAgo(95), acked: true, ackedBy: '李組長', ackedAt: minutesAgo(90) },
  { id: 'a6', title: '誤判率超過 3%', severity: 'minor', code: 'Q-0310', source: 'AOI-01', group: '檢測', raisedAt: minutesAgo(40), shelvedUntil: minutesAgo(-50) },
  { id: 'a7', title: '軌道卡板', severity: 'major', code: 'E-2001', source: 'SMT-03 貼片機', group: 'SMT 一線', raisedAt: minutesAgo(130), acked: true, ackedBy: '陳技術員', ackedAt: minutesAgo(128), cleared: true, clearedAt: minutesAgo(120) },
])
const alarmLive = ref(false)
const alarmSound = ref(false)
const NEW_ALARMS = [
  { title: '飛達卡料', severity: 'major', code: 'E-1101', source: 'SMT-01 印刷機', group: 'SMT 一線' },
  { title: '錫膏黏度超出規格', severity: 'minor', code: 'Q-0021', source: 'SMT-05 印刷機', group: 'SMT 二線' },
  { title: '緊急停止按鈕被按下', severity: 'critical', code: 'S-0000', source: 'SMT-04 回焊爐', group: 'SMT 一線' },
  { title: 'ICT 治具計數到期', severity: 'info', code: 'PM-F', source: 'ICT-01', group: '檢測' },
]
let alarmTimer = null
let alarmTick = 0
watch(alarmLive, (on) => {
  clearInterval(alarmTimer)
  if (!on) return
  alarmTimer = setInterval(() => {
    // 固定輪替：新增一筆警報，並讓最舊的一筆未恢復警報恢復
    alarmTick++
    const base = NEW_ALARMS[alarmTick % NEW_ALARMS.length]
    const open = alarms.value.find((a) => !a.cleared)
    alarms.value = [
      { ...base, id: `live-${alarmTick}`, raisedAt: Date.now() },
      ...alarms.value.map((a) => (alarmTick % 2 === 0 && a === open ? { ...a, cleared: true, clearedAt: Date.now() } : a)),
    ]
  }, 5000)
})
onBeforeUnmount(() => clearInterval(alarmTimer))
const alarmSample = `<ChptAlarmCenter v-model="alarms" :operator="user.name" sound @ack="(ids) => api.ack(ids)" @escalate="notifyManager" />

// alarms：
//   { id: 'a1', title: '吸嘴 N3 真空異常', severity: 'critical', code: 'E-1023', source: 'SMT-02 貼片機',
//     raisedAt: '2026-11-23T08:15:00', count: 3, detail: '建議：檢查吸嘴是否堵塞' }
// 設備回報恢復時：把該筆設成 cleared: true（確認過的就結束，沒確認的仍要人確認）`
const alarmProps = [
  { name: 'v-model', type: 'AlarmItem[]', def: '—', desc: '警報清單；確認、暫停、升級會直接改這份清單' },
  { name: 'operator', type: 'string', def: "''", desc: '目前操作的人（確認時記在 ackedBy）' },
  { name: 'shelveOptions', type: 'number[]', def: '[15, 60, 240]', desc: '暫停的選項（分鐘）；S 鍵用第一個' },
  { name: 'sound', type: 'boolean', def: 'false', desc: '有未確認的嚴重 / 重要警報時定時響（瀏覽器要使用者先互動過才會出聲）' },
  { name: 'soundInterval', type: 'number', def: '10000', desc: '響的間隔（毫秒）' },
  { name: 'maxHeight', type: 'number', def: '0', desc: '清單最大高度（px），超過時捲動；0 為不限' },
  { name: 'searchable', type: 'boolean', def: 'true', desc: '顯示搜尋框（比對訊息、代碼、來源）' },
  { name: 'defaultView', type: "'open' | 'unacked' | 'shelved' | 'all'", def: "'open'", desc: '預設顯示；open = 未結束且未暫停' },
  { name: 'readonly', type: 'boolean', def: 'false', desc: '只顯示，不能操作' },
  { name: 'now', type: 'number | Date | null', def: 'null', desc: '計算時間用的現在時間；不給時每 15 秒更新' },
  { name: 'label', type: 'string', def: '語系', desc: '清單名稱（螢幕閱讀器）' },
]
const alarmItemRows = [
  { name: 'id / title', type: 'string', def: '—', desc: '識別碼、警報訊息' },
  { name: 'severity', type: "'critical' | 'major' | 'minor' | 'info'", def: '—', desc: '嚴重度' },
  { name: 'raisedAt', type: 'string | number | Date', def: '—', desc: '發生時間' },
  { name: 'code / source / group', type: 'string', def: '—', desc: '警報代碼、來源（機台）、分組（產線）' },
  { name: 'detail', type: 'string', def: '—', desc: '說明、建議處置（展開時顯示）' },
  { name: 'count', type: 'number', def: '1', desc: '重複發生次數（大於 1 時顯示 ×n）' },
  { name: 'acked / ackedBy / ackedAt', type: 'boolean / string / 時間', def: '—', desc: '確認狀態' },
  { name: 'cleared / clearedAt', type: 'boolean / 時間', def: '—', desc: '條件已恢復（設備回報正常）' },
  { name: 'shelvedUntil', type: '時間 | null', def: '—', desc: '暫停提醒到這個時間' },
  { name: 'escalated', type: 'number', def: '0', desc: '已升級次數' },
]
const alarmEvents = [
  { name: 'update:modelValue', params: '(alarms: AlarmItem[])', desc: '清單更新（v-model）' },
  { name: 'ack', params: '(ids: string[])', desc: '確認了哪些警報（送給後端）' },
  { name: 'shelve', params: '(ids: string[], minutes: number)', desc: '暫停' },
  { name: 'unshelve', params: '(ids: string[])', desc: '恢復提醒' },
  { name: 'escalate', params: '(ids: string[])', desc: '升級' },
]
const alarmSlots = [{ name: 'detail', params: '{ alarm }', desc: '展開時的自訂內容（例如趨勢圖、處置 SOP 連結）' }]
const alarmMethods = [{ name: 'ack(ids?)', type: '(ids?: string[]) => void', desc: '確認指定的警報；不給時確認畫面上所有未確認的' }]

// ---- DashboardGrid ----
const defaultDashboard = () => [
  { id: 'oee', title: 'OEE', x: 0, y: 0, w: 3, h: 2 },
  { id: 'output', title: '產量', x: 3, y: 0, w: 3, h: 2 },
  { id: 'yield', title: '良率', x: 6, y: 0, w: 3, h: 2 },
  { id: 'shift', title: '值班', x: 9, y: 0, w: 3, h: 2, static: true },
  { id: 'alarm', title: '今日異常', x: 0, y: 2, w: 9, h: 2 },
]
const dashEditable = ref(true)
const dashLayout = ref(defaultDashboard())
const dashRef = ref(null)
function resetDashboard() {
  dashLayout.value = defaultDashboard()
  dashRef.value?.clearSaved()
}
const dashboardSample = `<ChptDashboardGrid v-model="layout" :cols="12" :row-height="64" editable persist-key="line-a">
  <!-- 每個區塊的內容：插槽名稱 = 區塊 id（或用 default 插槽的 { item } 自己判斷） -->
  <template #oee><OeeGauge /></template>
  <template #output><OutputChart /></template>
</ChptDashboardGrid>

const layout = ref([
  { id: 'oee', title: 'OEE', x: 0, y: 0, w: 3, h: 2 },
  { id: 'output', title: '產量', x: 3, y: 0, w: 6, h: 2, minW: 3 },
  { id: 'shift', title: '值班', x: 9, y: 0, w: 3, h: 2, static: true }, // 固定不動
])`
const dashboardProps = [
  { name: 'modelValue', type: 'DashboardItem[]', def: '—', desc: '版面（v-model）；拖曳、調整大小、鍵盤操作後送出新的陣列' },
  { name: 'cols / rowHeight / gap', type: 'number', def: '12 / 72 / 12', desc: '欄數；一列的高度與區塊間距（px）' },
  { name: 'editable', type: 'boolean', def: 'false', desc: '可以拖曳移動、調整大小' },
  { name: 'compact', type: "'vertical' | 'none'", def: "'vertical'", desc: '往上靠攏，或保留空位' },
  { name: 'stackBelow', type: 'number', def: '640', desc: '容器寬度小於這個值（px）時改成一欄由上到下排列、不能編輯；0 為不切換' },
  { name: 'persistKey', type: 'string', def: '—', desc: '把版面記在 localStorage（chpt-dashboard:{persistKey}），掛載時套用' },
  { name: 'ariaLabel', type: 'string', def: '語系（繁中「儀表板」）', desc: '區域名稱' },
]
const dashboardItemRows = [
  { name: 'id / title', type: 'string', def: '—', desc: '唯一鍵（也是內容插槽的名稱）；標題列文字' },
  { name: 'x / y / w / h', type: 'number', def: '—', desc: '位置與大小（以格為單位）' },
  { name: 'minW / maxW / minH / maxH', type: 'number', def: '—', desc: '調整大小的限制' },
  { name: 'static', type: 'boolean', def: 'false', desc: '固定不動：不能拖、不會被推開' },
]
const dashboardEvents = [
  { name: 'update:modelValue', params: '(layout: DashboardItem[])', desc: '版面改變' },
  { name: 'layout-change', params: '(layout: DashboardItem[])', desc: '拖曳、調整大小或鍵盤操作結束且版面有變（適合在這裡存到後端）' },
]
const dashboardSlots = [
  { name: '{id}', params: '{ item }', desc: '該區塊的內容（插槽名稱 = 區塊 id）' },
  { name: 'default', params: '{ item }', desc: '沒有專屬插槽的區塊用這個' },
  { name: 'actions', params: '{ item }', desc: '標題列右側（例如更多選單、重新整理鈕）' },
]
const dashboardMethods = [
  { name: 'layout()', type: '() => DashboardItem[]', desc: '目前（整理過的）版面' },
  { name: 'clearSaved()', type: '() => void', desc: '清掉 persistKey 記住的版面' },
]

const currentStep = ref(0)
const steps = ref([
  { title: '填寫資料', status: 'done' },
  { title: '確認資訊', status: 'process' },
  { title: '完成', status: 'pending' },
])

function stepNext() {
  if (currentStep.value >= steps.value.length - 1) return
  currentStep.value++
  updateSteps()
}
function stepBack() {
  if (currentStep.value <= 0) return
  currentStep.value--
  updateSteps()
}
function updateSteps() {
  steps.value = steps.value.map((s, i) => ({
    ...s,
    status: i < currentStep.value ? 'done' : i === currentStep.value ? 'process' : 'pending',
  }))
}

const crumbs = [
  { label: '首頁' },
  { label: '報表' },
  { label: '良率分析' },
]

const collapses = [
  { title: '為什麼需要此功能？', content: '提升資料操作的效率與一致性，並提供良好的使用者體驗。' },
  { title: '如何開始？', content: '透過 imports 統一引出組件後即可在畫面上使用。' },
  { title: '注意事項', content: '部分元件需搭配正確的 data 型別，請參考各元件之 Props 定義。' },
]
const openPanels = ref([0])

function onCardClick() {
  toast.info('卡片被點擊')
}

// ---- 程式碼範例（字串，避免模板解析） ----
const cardSample = `<ChptCard title="標題" icon="inbox" hoverable @click="onClick">
  <p>內容</p>
  <template #extra>
    <ChptTag label="啟用" color="success" />
  </template>
  <template #footer>
    <p>底部</p>
  </template>
</ChptCard>`

const collapseSample = `<ChptCollapse
  v-model="openPanels"
  :items="[{ title: '面板一', content: '內容...' }]"
  :multiple="true"
/>`

const breadcrumbSample = `<ChptBreadcrumb
  :items="[{ label: '首頁' }, { label: '報表' }, { label: '良率分析' }]"
  @select="handleSelect"
/>`

const stepsSample = `<ChptSteps :steps="[
  { title: '填寫資料', status: 'done' },
  { title: '確認資訊', status: 'process' },
  { title: '完成', status: 'pending' }
]" />`

const dividerSample = `<ChptDivider text="或" />
<ChptDivider direction="vertical" class="h-10" />`

// ---- API 資料（與元件 props/emits 對齊） ----
const cardProps = [
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'icon', type: 'string', def: "''", desc: '前置 Material Symbols 圖示名' },
  { name: 'padding', type: "'none'|'sm'|'md'|'lg'", def: "'sm'", desc: '內容內邊距' },
  { name: 'fullWidth', type: 'boolean', def: 'false', desc: '是否全寬' },
  { name: 'hoverable', type: 'boolean', def: 'false', desc: '滑入 hover 效果' },
]
const cardEvents = [{ name: 'click', params: '(event: MouseEvent)', desc: '點擊卡片時' }]
const cardSlots = [
  { name: 'header', params: '—', desc: '整列標題（含 title+icon+extra）' },
  { name: 'extra', params: '—', desc: '標題列右側內容（如標籤／按鈕）' },
  { name: 'default', params: '—', desc: '主要內容' },
  { name: 'footer', params: '—', desc: '底部列（自動加分隔邊框）' },
]

const collapseProps = [
  { name: 'items', type: 'CollapseItem[]', def: '[]', desc: '面板定義：{ title, content? }' },
  { name: 'modelValue', type: 'number[]', def: '[]', desc: '展開的 index 陣列（v-model）' },
  { name: 'multiple', type: 'boolean', def: 'false', desc: '是否可同時展開多個' },
]
const collapseEvents = [{ name: 'update:modelValue', params: '(value: number[])', desc: '展開狀態變更' }]

const breadcrumbProps = [
  { name: 'items', type: 'BreadcrumbItem[]', def: '[]', desc: '項目：{ label, to? }' },
  { name: 'separator', type: 'string', def: "'chevron_right'", desc: '分隔符 Material Symbols 圖示名' },
]
const breadcrumbEvents = [{ name: 'select', params: '(item)', desc: '點擊非路由項目時' }]
const breadcrumbSlots = [
  { name: 'item-<index>', params: '{ item }', desc: '自訂第 index 個項目的內容' },
]

const stepsProps = [
  { name: 'steps', type: 'StepItem[]', def: '[]', desc: '步驟：{ title, status? }' },
  { name: 'showLabel', type: 'boolean', def: 'true', desc: '是否顯示步驟文字' },
]

const dividerProps = [
  { name: 'direction', type: "'horizontal'|'vertical'", def: "'horizontal'", desc: '方向' },
  { name: 'text', type: 'string', def: "''", desc: '水平分隔線中間文字' },
  { name: 'color', type: 'string', def: "'neutral-200'", desc: '線條色名（不加 border- 前綴）' },
]
const dividerSlots = [{ name: 'default', params: '—', desc: '中間內容（取代 text）' }]
</script>
