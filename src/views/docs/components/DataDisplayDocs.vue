<template>
  <div class="w-full px-8 py-12">
    <div class="mb-12">
      <div class="flex items-center space-x-4 mb-4">
        <span class="text-3xl">🗂️</span>
        <h1 class="text-4xl font-bold text-content-primary">資料展示元件</h1>
      </div>
      <p class="text-content-secondary text-lg max-w-4xl">
        ChptStatistic（統計數值）、ChptDescriptions（描述清單）、ChptTimeline（時間軸）。
        呈現「一筆資料」與「一段歷程」—— 多筆資料請用 ChptTable。
      </p>
    </div>

    <!-- ============ ChptStatistic ============ -->
    <section id="chpt-statistic" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptStatistic 統計數值</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>儀表板上的關鍵數字與它和前期相比的變化。「變化的好壞」不一定等於「升降」：
        不良率上升是壞事，請設 <code>:higher-is-better="false"</code>，否則「不良率 +0.8%」會被畫成綠色。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptStatistic } from '@/components/library'</code>
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="rounded-lg border border-stroke-light bg-surface-secondary p-4">
          <ChptStatistic title="今日產出" :value="128450" suffix="pcs" :delta="4.2" description="較昨日" />
        </div>
        <div class="rounded-lg border border-stroke-light bg-surface-secondary p-4">
          <ChptStatistic title="綜合良率" :value="98.26" :precision="2" suffix="%" :delta="0.35" :delta-precision="2" description="較上週" />
        </div>
        <div class="rounded-lg border border-stroke-light bg-surface-secondary p-4">
          <ChptStatistic title="不良率" :value="1.74" :precision="2" suffix="%" :delta="0.8" :higher-is-better="false" description="較上週" />
        </div>
        <div class="rounded-lg border border-stroke-light bg-surface-secondary p-4">
          <ChptStatistic title="停機時間" :value="42" suffix="分" :delta="-12" delta-suffix=" 分" :delta-precision="0" :higher-is-better="false" description="較昨日" />
        </div>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-6">
        <ChptStatistic title="營收" :value="3862500" prefix="NT$" size="sm" />
        <ChptStatistic title="載入中" :value="0" loading size="sm" />
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="statisticSample" />
      </div>
      <ApiTable of="ChptStatistic" title="Props" :rows="statisticProps" />
      <ApiTable of="ChptStatistic" title="Slots" :rows="statisticSlots" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>趨勢除了顏色與箭頭，也會給螢幕閱讀器一段文字（「上升 0.8%（表現較差）」），
        色盲使用者也能從箭頭方向判斷。數字以遠離零的方式四捨五入，與 Excel 的 ROUND 一致。
      </p>
    </section>

    <!-- ============ ChptDescriptions ============ -->
    <section id="chpt-descriptions" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptDescriptions 描述清單</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>一筆資料的欄位與值 —— 工單明細、料號資訊、機台參數。語意上是
        <code>dl / dt / dd</code>，螢幕閱讀器會把欄位名與值配對唸出；窄螢幕自動變成一欄。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptDescriptions } from '@/components/library'</code>
      </p>

      <ChptDescriptions title="工單資訊" :items="orderItems" :column="3">
        <template #extra>
          <ChptTag label="生產中" color="success" />
        </template>
      </ChptDescriptions>

      <div class="mt-8">
        <ChptDescriptions title="機台參數（bordered）" :items="machineItems" :column="2" bordered label-width="8rem">
          <template #value="{ item }">
            <ChptTag v-if="item.key === 'status'" :label="String(item.value)" color="warning" />
            <template v-else>{{ item.value ?? '—' }}</template>
          </template>
        </ChptDescriptions>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="descriptionsSample" />
      </div>
      <ApiTable of="ChptDescriptions" title="Props" :rows="descriptionsProps" />
      <ApiTable of="ChptDescriptions" title="Slots" :rows="descriptionsSlots" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>值是 null／undefined／空字串時顯示 <code>emptyText</code>（預設「—」），
        不會出現空白格讓人以為還沒載入。<code>span</code> 超過 <code>column</code> 時以 column 為上限。
      </p>
    </section>

    <!-- ============ ChptTimeline ============ -->
    <section id="chpt-timeline" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptTimeline 時間軸</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>依時間排列「已經發生的事」—— 工單流程紀錄、設備異常歷程、審核軌跡。
        「接下來要做的步驟」請用 ChptSteps。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptTimeline } from '@/components/library'</code>
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 class="text-sm font-semibold text-content-secondary mb-3">工單流程</h3>
          <ChptTimeline :items="flowItems" />
        </div>
        <div>
          <h3 class="text-sm font-semibold text-content-secondary mb-3">設備事件（最新在上、圖示節點）</h3>
          <ChptTimeline :items="eventItems" reverse />
        </div>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="timelineSample" />
      </div>
      <ApiTable of="ChptTimeline" title="Props" :rows="timelineProps" />
      <ApiTable of="-" title="TimelineItem" :rows="timelineItemRows" />
      <ApiTable of="ChptTimeline" title="Slots" :rows="timelineSlots" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>時間請同時給顯示用的 <code>time</code> 與機器可讀的 <code>datetime</code>（ISO 8601）。
        通往「進行中」節點的連接線會畫成虛線。
      </p>
    </section>

    <!-- ============ ChptTree ============ -->
    <section id="chpt-tree" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptTree 樹狀清單</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>有階層的資料 —— 組織／廠區／產線、料號 BOM、權限設定。
        單選用 <code>v-model</code>，多選勾選用 <code>v-model:checked</code>（父子三態連動），可篩選並高亮。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptTree } from '@/components/library'</code>
      </p>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div class="rounded-lg border border-stroke-light p-3">
          <div class="mb-2 flex items-center justify-between gap-2">
            <h3 class="text-sm font-semibold text-content-secondary">單選 + 篩選</h3>
            <ChptInput v-model="treeFilter" placeholder="篩選產線" prefix-icon="search" size="xs" clearable />
          </div>
          <ChptTree v-model="selectedLine" :data="plantTree" :filter-text="treeFilter" default-expand-all aria-label="廠區與產線">
            <template #extra="{ node }">
              <ChptTag v-if="node.status" :label="node.status" :color="node.status === '停機' ? 'danger' : 'success'" size="xs" />
            </template>
          </ChptTree>
          <p class="mt-2 text-xs text-content-tertiary">選取：{{ selectedLine ?? '（無）' }}</p>
        </div>
        <div class="rounded-lg border border-stroke-light p-3">
          <h3 class="mb-2 text-sm font-semibold text-content-secondary">勾選（權限設定）</h3>
          <ChptTree v-model:checked="grantedKeys" :data="permissionTree" checkable :selectable="false" default-expand-all aria-label="權限" />
          <p class="mt-2 text-xs text-content-tertiary break-all">已勾選：{{ grantedKeys.join('、') || '（無）' }}</p>
        </div>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="treeSample" />
      </div>
      <ApiTable of="ChptTree" title="Props" :rows="treeProps" />
      <ApiTable of="ChptTree" title="Events" :rows="treeEvents" />
      <ApiTable of="ChptTree" title="Slots / 方法" :rows="treeSlots" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>鍵盤照 WAI-ARIA tree：整棵樹一個 Tab 停駐點，↑↓ 移動、→ 展開／進入子節點、← 收合／回到父節點、
        Home／End、Enter 選取、Space 勾選、* 展開同層、打字跳轉。停用節點不會被勾父節點時一起勾選；
        <code>checked</code> 只含「完整勾選」的節點，部分勾選的父節點用 <code>getHalfCheckedKeys()</code> 取得。
      </p>
    </section>

    <!-- ============ ChptImage ============ -->
    <section id="chpt-image" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptImage 圖片 / ChptImageViewer 看圖</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>檢驗照片、瑕疵圖、產品圖。固定外框避免版面跳動，載入中顯示骨架、失敗時顯示圖示與替代文字；
        preview 可點開全螢幕檢視（縮放、旋轉、左右切換同一組圖）。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptImage, ChptImageViewer } from '@/components/library'</code>
      </p>

      <div class="bg-surface-secondary rounded-lg p-4">
        <p class="mb-2 text-sm text-content-secondary">AOI 瑕疵圖（點圖放大，可用 ← → 切換）</p>
        <div class="flex flex-wrap gap-3">
          <ChptImage
            v-for="img in defectImages"
            :key="img.src"
            :src="img.src"
            :alt="img.alt"
            :width="120"
            :height="90"
            preview
            :preview-src-list="defectImages"
          />
          <ChptImage src="/not-found.png" alt="SMT-02 第 3 片（檔案遺失）" :width="120" :height="90" />
        </div>
      </div>

      <div class="mt-6">
        <ChptCodeBlock :code="imageSample" />
      </div>
      <ApiTable of="ChptImage" title="ChptImage Props" :rows="imageProps" />
      <ApiTable of="ChptImageViewer" title="ChptImageViewer Props / Events" :rows="viewerProps" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>alt 是必填 —— 描述圖片內容（「焊點橋接」），純裝飾的圖傳 <code>alt=""</code>。
        檢視器是模態 dialog：焦點困在裡面、背景不捲動、關閉後回到原本的縮圖；← → 切換、+／− 或滾輪縮放、0 重設、R 旋轉、Esc 關閉，
        放大後可拖曳移動。
      </p>
    </section>

    <!-- ============ ChptList ============ -->
    <section id="chpt-list" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptList 清單</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>通知、待辦、最近活動這類「一筆一行」的清單。給 <code>items</code>（title / description / extra / avatar）就有預設版面，
        也可以用插槽自己排；<code>hasMore</code> 接「載入更多」，加 <code>infinite</code> 捲到底自動載入。上萬筆請改用 ChptVirtualList。
      </p>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChptList :items="activities" header="最近活動" :has-more="activities.length < 9" :loading="listLoading" @load-more="loadActivities">
          <template #actions="{ item }">
            <ChptTag :label="item.level" :color="item.level === '警示' ? 'danger' : 'info'" size="xs" />
          </template>
        </ChptList>
        <ChptList :items="machines" :grid="150" :bordered="false" :split="false" size="sm">
          <template #default="{ item }">
            <p class="font-medium text-content-primary">{{ item.name }}</p>
            <p class="text-xs" :class="item.ok ? 'text-success' : 'text-danger'">{{ item.ok ? '運轉中' : '停機' }}</p>
          </template>
        </ChptList>
      </div>
      <ChptCodeBlock class="mt-6" :code="listSample" />
      <ApiTable of="ChptList" title="Props / Events" :rows="listProps" />
    </section>

    <!-- ============ ChptQRCode ============ -->
    <section id="chpt-qrcode" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptQRCode QR Code</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>工單、序號標籤、登入連結、報表分享。SVG 繪製任何尺寸都銳利；中文內容以 UTF-8 編碼，掃出來是原文。
        深色模式也維持白底黑碼（很多掃描器讀不了反白的碼）。
      </p>
      <div class="flex flex-wrap items-start gap-6">
        <div class="space-y-2 text-center">
          <ChptQRCode ref="qrRef" :value="qrValue" :size="140" />
          <ChptButton size="sm" is-outline @click="qrRef?.download('wo-qrcode.png')">下載 PNG</ChptButton>
        </div>
        <ChptQRCode value="工單 WO-2609-101｜SMT-02｜回焊爐" :size="140" level="Q" title="工單 WO-2609-101 標籤" />
        <ChptQRCode value="https://example.com/login?token=abc" :size="140" :status="qrExpired ? 'expired' : 'active'" @refresh="qrExpired = false" />
        <div class="w-64">
          <ChptInput v-model="qrValue" label="內容" full-width />
          <ChptSwitch v-model="qrExpired" label="模擬過期" class="mt-3" />
        </div>
      </div>
      <ChptCodeBlock class="mt-6" :code="qrSample" />
      <ApiTable of="ChptQRCode" title="Props" :rows="qrProps" />
    </section>

    <!-- ============ ChptBarcode ============ -->
    <section id="chpt-barcode" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptBarcode 一維條碼</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>工單、批號、箱號、儲位標籤 —— 大部分掃描槍都讀得到一維條碼，不一定支援 QR Code。
        Code 128（預設）可編完整 ASCII，連續數字自動兩位一組；Code 39 給只吃這種格式的舊系統或標籤機。
        SVG 繪製、模組寬度取整數像素（列印不糊）；白底黑條、左右留靜區，深色模式也不反轉。內容含無法編碼的字元時顯示錯誤，不會畫出掃不出來的條碼。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptBarcode } from '@/components/library'</code>
      </p>
      <div class="flex flex-wrap items-start gap-6">
        <div class="space-y-3">
          <ChptBarcode ref="barcodeRef" :value="barcodeValue" :format="barcodeFormat" :check-digit="barcodeFormat === 'code39'" />
          <div class="flex flex-wrap items-center gap-2">
            <ChptSegmented v-model="barcodeFormat" :options="[{ label: 'Code 128', value: 'code128' }, { label: 'Code 39', value: 'code39' }]" aria-label="條碼格式" size="xs" />
            <ChptButton size="sm" is-outline @click="downloadBarcode">下載 SVG</ChptButton>
          </div>
          <ChptInput v-model="barcodeValue" label="內容" class="w-72" />
        </div>
        <!-- 出貨箱標籤：條碼 + QR Code + 文字。印出來的標籤是白紙黑字，深色模式也不翻轉（用 style 而不是主題 class） -->
        <div class="w-[340px] rounded-md border border-stroke-default p-3" style="background: #fff; color: #000" aria-label="出貨箱標籤範例">
          <div class="flex items-start justify-between gap-2 border-b border-black pb-1 text-xs">
            <span class="font-semibold">出貨箱 CARTON</span>
            <span>2026/11/20</span>
          </div>
          <div class="mt-2 flex gap-3">
            <div class="flex-1 text-xs leading-5">
              <div>料號 P/N：<strong>PCB-A12-R3</strong></div>
              <div>數量 QTY：<strong>480</strong></div>
              <div>批號 LOT：<strong>2611A07</strong></div>
            </div>
            <ChptQRCode value="CTN-2611-00172|PCB-A12-R3|480|2611A07" :size="72" />
          </div>
          <ChptBarcode value="CTN-2611-00172" :module-width="1" :height="44" :font-size="12" class="mt-2" />
        </div>
      </div>
      <ChptCodeBlock class="mt-6" :code="barcodeSample" />
      <ApiTable of="ChptBarcode" title="Props" :rows="barcodeProps" />
      <ApiTable of="ChptBarcode" title="方法（ref）" :rows="barcodeMethods" />
    </section>

    <!-- ============ ChptLotTrace ============ -->
    <section id="chpt-lot-trace" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptLotTrace 批號追溯圖</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>客訴、召回、異常調查。資料是「投入 → 產出」的關係（<code>links: { from, to, qty }</code>）：
        往<strong>上游</strong>追這個批號用了哪些料（找原因），往<strong>下游</strong>找它做成了哪些產品、出給誰（找影響範圍）。
        查詢的批號在中間，上游在左、下游在右；點一個批號會高亮它與查詢批號之間的所有路徑。隔離（hold）與可疑（suspect）批號有標記；
        「清單」檢視是上游、下游各一棵樹。鍵盤：Tab 進入圖形後方向鍵移動、Enter 選取。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptLotTrace } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light space-y-3">
        <div class="flex flex-wrap items-center gap-2 text-sm text-content-secondary">
          <span>查詢批號：</span>
          <ChptSegmented v-model="traceRoot" :options="traceRoots" aria-label="查詢批號" size="xs" />
        </div>
        <ChptLotTrace
          :key="traceRoot"
          v-model:selected="traceSelected"
          :nodes="traceNodes"
          :links="traceLinks"
          :root-id="traceRoot"
          :kinds="traceKinds"
          :default-direction="traceRoot === 'SP-2610-33' ? 'forward' : 'both'"
        />
        <p class="text-sm text-content-secondary" aria-live="polite">選取：<span class="font-mono">{{ traceSelected ?? '（無）' }}</span></p>
      </div>
      <ChptCodeBlock class="mt-6" :code="traceSample" />
      <ApiTable of="ChptLotTrace" title="Props" :rows="traceProps" />
      <ApiTable of="-" title="TraceNode / TraceLink" :rows="traceDataRows" />
      <ApiTable of="ChptLotTrace" title="Events" :rows="traceEvents" />
      <ApiTable of="ChptLotTrace" title="方法（ref）" :rows="traceMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>同一個批號被好幾個產品用到時，在清單檢視會出現在好幾個分支；資料有循環（A 用了 B、B 又用了 A）時只展開一次並標示。
        追溯範圍很大時用 <code>max-depth</code> 限制層數。
      </p>
    </section>

    <!-- ============ ChptDiffViewer ============ -->
    <section id="chpt-diff-viewer" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptDiffViewer 參數比對</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>比對兩組巢狀參數 —— 配方 A / B、機台設定修改前後、兩條線同一台機的參數。
        狀態分為<strong>變更</strong>、<strong>新增</strong>（右邊才有）、<strong>刪除</strong>（左邊才有）、<strong>容許內</strong>（數值差在 <code>tolerance</code> 範圍內）與相同；
        數值顯示差值與百分比。依路徑設定容許差與單位（<code>oven.zones[*].temp</code>、<code>conveyor.*</code>）。
        樹狀顯示，群組摺疊時也標出底下有幾處不同；預設只顯示差異。上方各狀態數量也是篩選，搜尋比對路徑、名稱與值。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptDiffViewer } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <ChptDiffViewer
          v-model:only-diff="diffOnly"
          :left="recipeA"
          :right="recipeB"
          left-label="REF-A12 v3（量產）"
          right-label="REF-A12 v4（試產）"
          :tolerances="recipeTolerances"
          :units="recipeUnits"
          :labels="recipeLabels"
          :max-height="480"
        />
      </div>
      <ChptCodeBlock class="mt-6" :code="diffSample" />
      <ApiTable of="ChptDiffViewer" title="Props" :rows="diffProps" />
      <ApiTable of="ChptDiffViewer" title="Events" :rows="diffEvents" />
      <ApiTable of="ChptDiffViewer" title="方法（ref）" :rows="diffMethods" />
    </section>

    <!-- ============ ChptAuditTrail ============ -->
    <section id="chpt-audit-trail" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptAuditTrail 變更紀錄</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>MES 參數、配方、料號主檔的稽核軌跡（誰在何時把哪個欄位從什麼改成什麼）。依日期分組的時間軸，欄位變更以
        <strong>原值 → 新值</strong>呈現；可依人員、欄位、關鍵字與日期區間篩選。<strong>勾選兩筆</strong>可以比較那兩個時間點的完整內容
        （從變更紀錄推回當時的快照，不需要另外存版本）。<code>revertable</code> 時每個變更與每個版本都有還原按鈕，送出事件由使用端寫回。可匯出 CSV。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptAuditTrail, auditSnapshot } from '@/components/library'</code>
      </p>
      <ChptAuditTrail
        title="配方 R-102 回焊溫度曲線"
        :entries="auditEntries"
        :field-labels="auditFieldLabels"
        :format-value="auditFormat"
        revertable
        now="2026-11-27T10:00:00"
        @revert="(p) => (auditLast = `還原 ${auditFieldLabels[p.change.field]} → ${auditFormat(p.change.from, p.change.field)}`)"
        @revert-version="(p) => (auditLast = `還原到 ${p.entry?.user ?? ''} 的版本：${Object.keys(p.snapshot).length} 個欄位`)"
      />
      <p v-if="auditLast" class="mt-2 text-xs text-content-secondary">最後一個事件：{{ auditLast }}</p>
      <ChptCodeBlock class="mt-6" :code="auditSample" />
      <ApiTable of="ChptAuditTrail" title="Props" :rows="auditProps" />
      <ApiTable of="-" title="AuditEntry / AuditChange" :rows="auditDataRows" />
      <ApiTable of="ChptAuditTrail" title="Events" :rows="auditEvents" />
      <ApiTable of="ChptAuditTrail" title="方法（ref）" :rows="auditMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>版本快照用每個欄位最早一筆變更的「原值」當初始值，再依時間套用之後的「新值」；紀錄不完整（中間有改動沒記到）時快照也會跟著不完整。
        元件不會自己改資料：還原事件給你欄位與要寫回的值（或整個快照），寫回後再把新的紀錄加進 <code>entries</code>。
      </p>
    </section>

    <!-- ============ ChptPivotTable ============ -->
    <section id="chpt-pivot-table" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptPivotTable 樞紐分析表</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>交叉分析 —— 不良數依「線 × 不良代碼」、產量依「日期 × 機台」。把欄位拖到<strong>列</strong>、<strong>欄</strong>、<strong>值</strong>
        （或按欄位旁的「列 / 欄 / 值」；鍵盤也能操作），值可以加總、平均、計數、最小、最大、不重複計數。列可以多層，每一層有小計、可展開收合；
        另有總計欄與總計列。「熱度」依數值深淺上色。目前的設定用 <code>v-model:config</code> 綁定，可以存起來下次還原。下面是 3,000 筆不良紀錄。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptPivotTable } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <ChptPivotTable v-model:config="pivotConfig" :data="pivotData" :fields="pivotFields" :max-height="460" filename="不良分析" @cell-click="onPivotCell" />
        <p class="mt-2 text-xs text-content-secondary" aria-live="polite">{{ pivotClicked || '（點一格看它是哪些條件）' }}</p>
      </div>
      <ChptCodeBlock class="mt-6" :code="pivotSample" />
      <ApiTable of="ChptPivotTable" title="Props" :rows="pivotProps" />
      <ApiTable of="-" title="PivotField / PivotConfig" :rows="pivotDataRows" />
      <ApiTable of="ChptPivotTable" title="Events" :rows="pivotEvents" />
      <ApiTable of="ChptPivotTable" title="方法（ref）" :rows="pivotMethods" />
    </section>

    <!-- ============ ChptOrgChart ============ -->
    <section id="chpt-org-chart" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptOrgChart 組織圖</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>組織架構、產線責任歸屬（誰負責哪一線、哪一站）、簽核層級。節點下方的數字是底下有幾個節點，點一下展開或收合（被點的節點不會跳走）；
        拖曳平移、Ctrl + 滾輪 / 雙指 / 按鈕縮放；搜尋會自動展開上層並把結果移到畫面中央，Enter 跳下一個。方向鍵沿著樹移動、Enter 選取、空白鍵展開收合。可下載 PNG。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptOrgChart, orgFromFlat } from '@/components/library'</code>
      </p>
      <div class="flex flex-wrap items-center gap-3 mb-3">
        <ChptSegmented v-model="orgOrientation" :options="orgOrientations" aria-label="方向" size="xs" />
        <span class="text-xs text-content-secondary">選取：{{ orgSelectedText }}</span>
      </div>
      <ChptOrgChart v-model:selected="orgSelected" :data="orgPlant" :orientation="orgOrientation" :default-expand-depth="2" :height="460" export-name="plant-org" label="廠區組織圖" />
      <h3 class="text-base font-semibold text-content-primary mt-6 mb-2">自訂節點：產線責任歸屬</h3>
      <p class="text-sm text-content-secondary mb-3">用 <code>#node</code> slot 換成自己的卡片（例如顯示線別狀態與人數），版面、展開收合、鍵盤與搜尋照常運作。</p>
      <ChptOrgChart :data="orgLines" orientation="horizontal" :node-width="190" :node-height="56" :gap-y="36" :height="340" :searchable="false" :exportable="false" label="產線責任歸屬">
        <template #node="{ node, selected }">
          <div class="flex h-full w-full cursor-pointer items-center gap-2 rounded-md border bg-surface-primary pl-2 pr-4" :class="selected ? 'border-accent ring-2 ring-accent' : 'border-stroke-default'">
            <span class="h-8 w-1.5 shrink-0 rounded-full" :class="{ run: 'bg-success-solid', idle: 'bg-warning-solid', down: 'bg-danger-solid' }[node.status] ?? 'bg-stroke-dark'" aria-hidden="true" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-content-primary">{{ node.label }}</span>
              <span class="block truncate text-xs text-content-secondary">{{ node.title }}</span>
            </span>
            <span v-if="node.headcount" class="shrink-0 rounded bg-surface-tertiary px-1.5 text-xs tabular-nums text-content-secondary">{{ node.headcount }} 人</span>
          </div>
        </template>
      </ChptOrgChart>
      <ChptCodeBlock class="mt-6" :code="orgSample" />
      <ApiTable of="ChptOrgChart" title="Props" :rows="orgProps" />
      <ApiTable of="-" title="OrgNode" :rows="orgNodeRows" />
      <ApiTable of="ChptOrgChart" title="Events" :rows="orgEvents" />
      <ApiTable of="ChptOrgChart" title="Slots" :rows="orgSlots" />
      <ApiTable of="ChptOrgChart" title="方法（ref）" :rows="orgMethods" />
      <p class="text-sm text-content-secondary mt-4">
        <strong>注意：</strong>資料庫常見的平面清單（每筆有 <code>parentId</code>）先用 <code>orgFromFlat(rows)</code> 轉成樹。重複的 id 只取第一次出現的。
        PNG 以預設節點樣式繪製，自訂 slot 的內容不會出現在圖檔裡。上千個節點時建議 <code>default-expand-depth</code> 設 1～2，需要時再展開。
      </p>
    </section>

    <!-- ============ ChptBomTree ============ -->
    <section id="chpt-bom-tree" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptBomTree BOM 結構</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>多階 BOM 的檢視與備料。用量逐階連乘成「每台用量」，乘上生產數量就是需求；給了庫存就算缺料
        （<code>netting</code> 時先扣半成品庫存：電源模組有 120 個庫存，下階只要補 380 台份），關鍵料標驚嘆號。
        搜尋料號 / 品名 / 位置號會展開到那一層並列出用在哪裡（where-used）；給舊版次（<code>compare</code>）就標出新增、刪除、用量變更。
        ChptLotTrace 追的是「這批用了哪些批」，這裡是「這個產品該用哪些料」。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptBomTree } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <div class="mb-3 flex flex-wrap items-center gap-4">
          <ChptSwitch v-model="bomCompare" label="與 Rev.A 比對" />
        </div>
        <ChptBomTree
          v-model:build-qty="bomQty"
          :data="bomV2"
          :stock="bomStock"
          :compare="bomCompare ? bomV1 : null"
          title="GW-500 工業閘道器"
          :max-height="520"
          @row-click="(item) => (bomClicked = `${item.partNo} ${item.name ?? ''}`)"
        />
        <p class="mt-2 text-xs text-content-secondary" aria-live="polite">{{ bomClicked || '（點一列時顯示）' }}</p>
      </div>
      <ChptCodeBlock class="mt-6" :code="bomSample" />
      <ApiTable of="ChptBomTree" title="Props" :rows="bomProps" />
      <ApiTable of="ChptBomTree" title="Events" :rows="bomEvents" />
      <ApiTable of="ChptBomTree" title="方法（ref）" :rows="bomMethods" />
    </section>

    <!-- ============ ChptJsonViewer ============ -->
    <section id="chpt-json-viewer" class="mb-12 bg-surface-primary rounded-xl shadow-md p-4 sm:p-8 border border-stroke-light scroll-mt-24">
      <h2 class="text-2xl font-bold text-content-primary mb-2">ChptJsonViewer JSON 檢視器</h2>
      <p class="text-sm text-content-secondary mb-4">
        <strong>使用時機：</strong>看 API 回應、設定檔、設備上報的原始資料。樹狀展開 / 收合、依型別上色；搜尋鍵或值會展開到符合的位置；
        滑過一列可以複製值或路徑（例如 <code>response.data.alarms[1].message</code>）。很長的陣列分段顯示（下面的 <code>hourly</code> 有 160 筆）、
        很長的字串截斷。給 <code>compare</code> 就標出與舊版的差異。
      </p>
      <p class="text-sm text-content-secondary mb-4">
        <strong>引入：</strong><code class="bg-surface-tertiary px-1 py-0.5 rounded">import { ChptJsonViewer } from '@/components/library'</code>
      </p>
      <div class="bg-surface-secondary rounded-lg p-4 border border-stroke-light">
        <div class="mb-3 flex flex-wrap items-center gap-4">
          <ChptSwitch v-model="jvCompare" label="與上一次回應比對" />
        </div>
        <ChptJsonViewer
          :data="jvData"
          :compare="jvCompare ? jvBefore : undefined"
          :expand-depth="2"
          root-name="response"
          title="GET /api/lines/SMT-3/status"
          :max-height="460"
          @select="({ pathText, value }) => (jvLog = `${pathText || '（根）'}：${typeof value === 'object' && value !== null ? (Array.isArray(value) ? `陣列 ${value.length} 項` : '物件') : String(value)}`)"
        />
        <p class="mt-2 text-xs text-content-secondary" aria-live="polite">{{ jvLog || '（點一列時顯示路徑與值）' }}</p>
      </div>
      <ChptCodeBlock class="mt-6" :code="jvSample" />
      <ApiTable of="ChptJsonViewer" title="Props" :rows="jvProps" />
      <ApiTable of="ChptJsonViewer" title="Events" :rows="jvEvents" />
      <ApiTable of="ChptJsonViewer" title="方法（ref）" :rows="jvMethods" />
    </section>

  </div>
</template>

<script setup>
import { computed, ref, useTemplateRef } from 'vue'
import {
  ChptStatistic,
  ChptDescriptions,
  ChptTimeline,
  ChptTag,
  ChptCodeBlock,
  ChptTree,
  ChptInput,
  ChptImage,
  ChptList,
  ChptQRCode,
  ChptBarcode,
  ChptSegmented,
  ChptButton,
  ChptSwitch,
  ChptLotTrace,
  ChptDiffViewer,
  ChptAuditTrail,
  ChptPivotTable,
  ChptBomTree,
  ChptOrgChart,
  orgFromFlat,
  ChptJsonViewer,
} from '@/components/library'
import ApiTable from './_ApiTable.vue'

// ---- ChptStatistic ----
const statisticSample = `<ChptStatistic title="綜合良率" :value="98.26" :precision="2" suffix="%" :delta="0.35" description="較上週" />

<!-- 越低越好的指標：上升顯示紅色 -->
<ChptStatistic title="不良率" :value="1.74" suffix="%" :delta="0.8" :higher-is-better="false" />`
const statisticProps = [
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'value', type: 'number | string | null', def: 'null', desc: '數值；字串原樣顯示、null 顯示 —' },
  { name: 'precision', type: 'number', def: '—', desc: '小數位數（遠離零四捨五入）' },
  { name: 'groupSeparator', type: 'boolean', def: 'true', desc: '千分位' },
  { name: 'prefix / suffix', type: 'string', def: "''", desc: '前綴（NT$）／後綴（%、pcs）' },
  { name: 'delta', type: 'number | null', def: 'null', desc: '與前期相比的變化；null 不顯示趨勢' },
  { name: 'deltaSuffix / deltaPrecision', type: 'string / number', def: "'%' / 1", desc: '變化量的單位與小數位數' },
  { name: 'higherIsBetter', type: 'boolean', def: 'true', desc: '數值越高越好；不良率、停機時間請設 false' },
  { name: 'description', type: 'string', def: "''", desc: '趨勢旁的說明（較上週）' },
  { name: 'valueClass', type: 'string', def: "''", desc: '數值的顏色 class（例如 text-danger）' },
  { name: 'size', type: "'sm' | 'md' | 'lg'", def: "'md'", desc: '尺寸' },
  { name: 'loading', type: 'boolean', def: 'false', desc: '載入中（骨架）' },
]
const statisticSlots = [
  { name: 'title / prefix / suffix', params: '—', desc: '覆寫標題、前後綴' },
  { name: 'footer', params: '—', desc: '數值下方的額外內容（例如迷你走勢圖）' },
]

// ---- ChptDescriptions ----
const orderItems = [
  { label: '工單', value: 'WO-2026-0917' },
  { label: '料號', value: 'PCB-A12-R3' },
  { label: '客戶', value: '台灣精密' },
  { label: '投入', value: '1,200 pcs' },
  { label: '產出', value: '1,178 pcs' },
  { label: '交期', value: '2026-10-05' },
  { label: '備註', value: null, span: 3 },
]
const machineItems = [
  { key: 'id', label: '機台', value: 'SMT-L3-02' },
  { key: 'status', label: '狀態', value: '保養中' },
  { key: 'temp', label: '回焊溫度', value: '245 °C' },
  { key: 'speed', label: '輸送速度', value: '0.9 m/min' },
  { key: 'last', label: '上次保養', value: '2026-09-21 08:30', span: 2 },
]
const descriptionsSample = `<ChptDescriptions title="工單資訊" :items="items" :column="3">
  <template #extra><ChptTag label="生產中" color="success" /></template>
</ChptDescriptions>

<ChptDescriptions :items="items" :column="2" bordered label-width="8rem">
  <template #value="{ item }">
    <ChptTag v-if="item.key === 'status'" :label="item.value" />
    <template v-else>{{ item.value }}</template>
  </template>
</ChptDescriptions>

const items = [
  { label: '工單', value: 'WO-2026-0917' },
  { label: '備註', value: null, span: 3 },
]`
const descriptionsProps = [
  { name: 'items', type: 'DescriptionItem[]', def: '—', desc: '{ key?, label, value?, span? }' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'column', type: 'number', def: '3', desc: '一列幾欄（窄螢幕自動一欄）' },
  { name: 'bordered', type: 'boolean', def: 'false', desc: '表格式外框，標籤有底色' },
  { name: 'layout', type: "'horizontal' | 'vertical'", def: "'horizontal'", desc: '標籤與值左右並排或上下堆疊' },
  { name: 'labelWidth', type: 'string', def: "''", desc: '左右並排時標籤的固定寬度，讓值對齊' },
  { name: 'size', type: "'sm' | 'md'", def: "'sm'", desc: '文字大小' },
  { name: 'emptyText', type: 'string', def: "'—'", desc: '值是空的時顯示的文字' },
]
const descriptionsSlots = [
  { name: 'title / extra', params: '—', desc: '標題與右上角操作區' },
  { name: 'value', params: '{ item, index }', desc: '自訂值的呈現' },
]

// ---- ChptTimeline ----
const flowItems = [
  { title: '建立工單', time: '09:02', datetime: '2026-09-28T09:02', content: '王小明 建立', color: 'primary' },
  { title: 'SMT 完成', time: '11:40', datetime: '2026-09-28T11:40', content: '良率 99.2%', color: 'success' },
  { title: 'AOI 異常', time: '13:15', datetime: '2026-09-28T13:15', content: '3 片偏移，已重工', color: 'warning', current: true },
  { title: '最終檢驗', pending: true },
]
const eventItems = [
  { title: '開機', time: '08:00', icon: 'power_settings_new', color: 'success' },
  { title: '溫度過高警報', time: '10:12', icon: 'warning', color: 'danger', content: '回焊區 3 超過 260 °C' },
  { title: '保養完成', time: '14:30', icon: 'build', color: 'info' },
]
const timelineSample = `<ChptTimeline :items="[
  { title: '建立工單', time: '09:02', datetime: '2026-09-28T09:02', color: 'primary' },
  { title: 'AOI 異常', time: '13:15', content: '3 片偏移', color: 'warning', current: true },
  { title: '最終檢驗', pending: true },
]" />`
const timelineProps = [
  { name: 'items', type: 'TimelineItem[]', def: '—', desc: '節點（見下表）' },
  { name: 'reverse', type: 'boolean', def: 'false', desc: '反轉順序（最新的在最上面）' },
]
const timelineItemRows = [
  { name: 'title / content', type: 'string', def: '—', desc: '標題與內容' },
  { name: 'time / datetime', type: 'string', def: '—', desc: '顯示用時間／機器可讀時間（ISO 8601）' },
  { name: 'color', type: "'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'", def: "'primary'", desc: '節點顏色' },
  { name: 'hollow / icon', type: 'boolean / string', def: '—', desc: '空心節點／以圖示取代圓點' },
  { name: 'pending / current', type: 'boolean', def: 'false', desc: '進行中（旋轉節點、虛線）／目前節點（aria-current）' },
]
const timelineSlots = [
  { name: 'dot', params: '{ item, index }', desc: '自訂節點' },
  { name: 'content', params: '{ item, index }', desc: '自訂內容' },
]

// ---- ChptTree ----
const treeFilter = ref('')
const selectedLine = ref(null)
const plantTree = [
  {
    key: 'hsinchu', label: '新竹廠', icon: 'factory',
    children: [
      { key: 'hc-smt', label: 'SMT 區', children: [
        { key: 'hc-smt-1', label: 'SMT Line 1', status: '運轉' },
        { key: 'hc-smt-2', label: 'SMT Line 2', status: '停機' },
      ] },
      { key: 'hc-aoi', label: 'AOI 區', children: [{ key: 'hc-aoi-1', label: 'AOI Line 1', status: '運轉' }] },
    ],
  },
  {
    key: 'taichung', label: '台中廠', icon: 'factory',
    children: [
      { key: 'tc-smt-1', label: 'SMT Line 1', status: '運轉' },
      { key: 'tc-test', label: '測試區（建置中）', disabled: true },
    ],
  },
]
const grantedKeys = ref(['report-view'])
const permissionTree = [
  { key: 'report', label: '報表', children: [
    { key: 'report-view', label: '檢視' },
    { key: 'report-export', label: '匯出' },
  ] },
  { key: 'order', label: '工單', children: [
    { key: 'order-view', label: '檢視' },
    { key: 'order-edit', label: '編輯' },
    { key: 'order-delete', label: '刪除（需主管）', disabled: true },
  ] },
  { key: 'admin', label: '系統管理' },
]
const treeSample = `<ChptTree v-model="lineKey" :data="plants" :filter-text="keyword" default-expand-all aria-label="產線">
  <template #extra="{ node }"><ChptTag :label="node.status" /></template>
</ChptTree>

<ChptTree v-model:checked="granted" :data="permissions" checkable :selectable="false" />

const plants = [
  { key: 'hsinchu', label: '新竹廠', children: [{ key: 'l1', label: 'SMT Line 1' }] },
]`
const treeProps = [
  { name: 'data', type: 'TreeNode[]', def: '—', desc: '{ key, label, children?, disabled?, icon?, ...自訂欄位 }' },
  { name: 'modelValue', type: 'string | number | null', def: 'null', desc: '單選的節點 key（v-model）' },
  { name: 'selectable', type: 'boolean', def: 'true', desc: '可以點選節點' },
  { name: 'checkable', type: 'boolean', def: 'false', desc: '顯示勾選框（v-model:checked）' },
  { name: 'checked', type: 'Key[]', def: '[]', desc: '完整勾選的節點 key（含父節點）' },
  { name: 'expanded', type: 'Key[]', def: '—', desc: '展開的節點（v-model:expanded；不給時自己管理）' },
  { name: 'defaultExpandAll', type: 'boolean', def: 'false', desc: '預設全部展開' },
  { name: 'filterText', type: 'string', def: "''", desc: '篩選：顯示符合的節點與祖先、自動展開、高亮' },
  { name: 'indent / size', type: "number / 'sm' | 'md'", def: "20 / 'md'", desc: '每層縮排（px）／列高' },
  { name: 'ariaLabel / emptyText', type: 'string', def: '—', desc: '樹的名稱（給報讀器）／沒有資料時的文字' },
]
const treeEvents = [
  { name: 'update:modelValue / select', params: '(key) / (node)', desc: '選取節點' },
  { name: 'update:checked / check', params: '(keys) / (node, checked, keys)', desc: '勾選變更' },
  { name: 'update:expanded / expand', params: '(keys) / (node, expanded)', desc: '展開變更' },
]
const treeSlots = [
  { name: '#label', params: '{ node, level }', desc: '自訂節點文字' },
  { name: '#extra', params: '{ node, level }', desc: '節點右側（狀態標籤、操作按鈕）' },
  { name: 'expandAll / collapseAll', params: '()', desc: '全部展開／收合（ref 方法）' },
  { name: 'getCheckedNodes / getHalfCheckedKeys', params: '()', desc: '勾選的節點／部分勾選的父節點 key（ref 方法）' },
]

// ---- ChptImage ----
/** 示範用的圖：就地產生 SVG，文檔站離線也看得到 */
function demoImage(label, hue) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
<rect width="640" height="480" fill="hsl(${hue} 35% 22%)"/>
<g stroke="hsl(${hue} 60% 60%)" stroke-width="6" fill="none" opacity=".7">
<rect x="80" y="90" width="200" height="120" rx="8"/><rect x="360" y="90" width="200" height="120" rx="8"/>
<path d="M180 210v90h280v-90"/><circle cx="320" cy="360" r="42"/></g>
<circle cx="320" cy="300" r="26" fill="none" stroke="#f87171" stroke-width="5"/>
<text x="32" y="450" font-family="sans-serif" font-size="30" fill="#fff">${label}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
const defectImages = [
  { src: demoImage('#1 焊點橋接', 210), alt: 'SMT-01 第 1 片：焊點橋接' },
  { src: demoImage('#2 元件偏移', 160), alt: 'SMT-01 第 2 片：元件偏移' },
  { src: demoImage('#3 缺件', 30), alt: 'SMT-01 第 3 片：缺件' },
]
const imageSample = `<ChptImage :src="url" alt="SMT-01 第 1 片：焊點橋接" :width="120" :height="90" preview />

<!-- 一組圖：預覽時可左右切換 -->
<ChptImage v-for="img in photos" :key="img.src" v-bind="img" preview :preview-src-list="photos" />

<!-- 單獨使用檢視器 -->
<ChptImageViewer v-model:open="open" v-model:index="i" :images="photos" />`
const imageProps = [
  { name: 'src / alt', type: 'string', def: '—', desc: '圖片網址與替代文字（alt 必填；裝飾圖傳空字串）' },
  { name: 'width / height', type: 'number | string', def: '—', desc: '外框大小（數字 = px）' },
  { name: 'fit', type: "'cover' | 'contain' | 'fill' | 'none' | 'scale-down'", def: "'cover'", desc: 'object-fit' },
  { name: 'lazy', type: 'boolean', def: 'true', desc: 'loading="lazy"' },
  { name: 'rounded', type: "'none' | 'sm' | 'md' | 'lg' | 'full'", def: "'md'", desc: '圓角' },
  { name: 'preview / previewSrcList', type: 'boolean / (string | { src, alt })[]', def: 'false / []', desc: '點擊放大；可切換的整組圖' },
  { name: 'Events', type: 'load / error / preview(index)', def: '—', desc: '載入完成、失敗、開啟預覽' },
  { name: '#error', type: 'slot', def: '—', desc: '自訂載入失敗的內容' },
]
const viewerProps = [
  { name: 'open', type: 'boolean', def: 'false', desc: 'v-model:open' },
  { name: 'images', type: '(string | { src, alt })[]', def: '—', desc: '要看的圖' },
  { name: 'index', type: 'number', def: '0', desc: 'v-model:index：目前第幾張' },
  { name: 'loop / thumbnails', type: 'boolean', def: 'true / true', desc: '頭尾循環／下方縮圖列' },
  { name: 'minScale / maxScale', type: 'number', def: '0.25 / 8', desc: '縮放範圍' },
  { name: 'Events', type: 'update:open / update:index / close', def: '—', desc: '' },
]

// ===== ChptList =====
const levels = ['資訊', '警示']
const makeActivity = (i) => ({
  id: i,
  title: ['SMT-01 換線完成', 'AOI 誤判率上升', '回焊爐溫度恢復', 'ICT 治具更換', '錫膏批號變更'][i % 5],
  description: `${8 + (i % 9)}:${String((i * 7) % 60).padStart(2, '0')} · ${['王小明', '陳建宏', '李佩珊'][i % 3]}`,
  extra: `${i * 3 + 2} 分鐘前`,
  level: levels[i % 3 === 1 ? 1 : 0],
})
const activities = ref([0, 1, 2].map(makeActivity))
const listLoading = ref(false)
function loadActivities() {
  listLoading.value = true
  setTimeout(() => {
    const n = activities.value.length
    activities.value = [...activities.value, ...[n, n + 1, n + 2].map(makeActivity)]
    listLoading.value = false
  }, 600)
}
const machines = ['SMT-01', 'SMT-02', 'AOI-01', 'ICT-01', 'FCT-02', 'Reflow-1'].map((name, i) => ({ id: name, name, ok: i !== 4 }))
const listSample = `<ChptList :items="activities" header="最近活動" :has-more="hasMore" :loading="loading" @load-more="fetchMore">
  <template #actions="{ item }"><ChptTag :label="item.level" size="xs" /></template>
</ChptList>

<!-- 格狀卡片 -->
<ChptList :items="machines" :grid="150">
  <template #default="{ item }">{{ item.name }}</template>
</ChptList>`
const listProps = [
  { name: 'items / itemKey', type: 'T[] / string', def: "[] / 'id'", desc: '資料；預設版面讀 avatar / title / description / extra' },
  { name: 'header / footer', type: 'string（或插槽）', def: "''", desc: '標題列 / 頁尾' },
  { name: 'loading', type: 'boolean', def: 'false', desc: '沒有資料時顯示骨架；已有資料時在底部顯示載入中（清單不會閃掉）' },
  { name: 'hasMore / infinite', type: 'boolean', def: 'false', desc: '載入更多按鈕；infinite 為捲到底自動載入' },
  { name: 'grid', type: 'number', def: '—', desc: '格狀排列，每張卡的最小寬度（px）' },
  { name: 'bordered / split / size / emptyText', type: '—', def: 'true / true / md / locale', desc: '外框、分隔線、內距、空狀態文字' },
  { name: '@load-more', type: 'event', def: '—', desc: '按下載入更多或捲到底' },
  { name: 'loadMoreText', type: 'string', def: "'載入更多'", desc: '「載入更多」按鈕的文字' },
]

// ===== ChptQRCode =====
// ---- ChptBarcode ----
const barcodeRef = useTemplateRef('barcodeRef')
const barcodeValue = ref('WO-2611-0042')
const barcodeFormat = ref('code128')
function downloadBarcode() {
  const svg = barcodeRef.value?.toSVG()
  if (!svg) return
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${barcodeValue.value}.svg`
  a.click()
  URL.revokeObjectURL(url)
}
const barcodeSample = `<ChptBarcode value="WO-2611-0042" />
<ChptBarcode value="CTN-2611-00172" :module-width="1" :height="44" />
<!-- 只吃 Code 39 的標籤機：加 mod 43 檢查碼 -->
<ChptBarcode value="LOT2611A07" format="code39" check-digit />`
const barcodeProps = [
  { name: 'value', type: 'string', def: '—', desc: '要編碼的內容' },
  { name: 'format', type: "'code128' | 'code39'", def: "'code128'", desc: 'Code 128：完整 ASCII、自動切換字集；Code 39：大寫英數與 - . 空白 $ / + %（小寫自動轉大寫）' },
  { name: 'moduleWidth', type: 'number', def: '2', desc: '一個窄模組的寬度（px，取整數）；標籤列印建議 2 以上' },
  { name: 'height', type: 'number', def: '60', desc: '條的高度（px）' },
  { name: 'quietZone', type: 'number', def: '10', desc: '左右靜區（模組數）；太窄掃描槍會找不到起點' },
  { name: 'showText / text', type: 'boolean / string', def: 'true / 內容', desc: '在條碼下方顯示文字；自訂顯示的文字' },
  { name: 'fontSize / textGap', type: 'number', def: '14 / 4', desc: '文字大小；條與文字的間距（px）' },
  { name: 'color / background', type: 'string', def: "'#000000' / '#ffffff'", desc: '條與背景的顏色（請維持深條淺底）' },
  { name: 'padding', type: 'number', def: '0', desc: '外框留白（px）' },
  { name: 'checkDigit', type: 'boolean', def: 'false', desc: 'Code 39 加上 mod 43 檢查碼（顯示在文字最後）' },
]
// ---- ChptLotTrace ----
const traceKinds = {
  material: { label: '原料' },
  wip: { label: '半成品' },
  product: { label: '成品' },
  shipment: { label: '出貨' },
}
const traceNodes = [
  { id: 'PCB-R3-2609A', label: 'PCB-R3-2609A', kind: 'material', sublabel: '板廠 A' },
  { id: 'IC-7731-L22', label: 'IC-7731-L22', kind: 'material', sublabel: 'MCU' },
  { id: 'RES-0402-R88', label: 'RES-0402-R88', kind: 'material', sublabel: '電阻料捲' },
  { id: 'SP-2610-33', label: 'SP-2610-33', kind: 'material', sublabel: '錫膏', status: 'suspect' },
  { id: 'PCBA-2611-A07', label: 'PCBA-2611-A07', kind: 'wip', sublabel: 'SMT 一線' },
  { id: 'PCBA-2611-A09', label: 'PCBA-2611-A09', kind: 'wip', sublabel: 'SMT 二線' },
  { id: 'HSG-2610-12', label: 'HSG-2610-12', kind: 'material', sublabel: '外殼' },
  { id: 'FG-2611-0042', label: 'FG-2611-0042', kind: 'product', sublabel: '控制器 C12' },
  { id: 'FG-2611-0051', label: 'FG-2611-0051', kind: 'product', sublabel: '控制器 C12', status: 'hold' },
  { id: 'DN-88120', label: 'DN-88120', kind: 'shipment', sublabel: '客戶 甲' },
  { id: 'DN-88131', label: 'DN-88131', kind: 'shipment', sublabel: '客戶 乙' },
]
const traceLinks = [
  { from: 'PCB-R3-2609A', to: 'PCBA-2611-A07', qty: 480, unit: 'pcs' },
  { from: 'IC-7731-L22', to: 'PCBA-2611-A07', qty: 480, unit: 'pcs' },
  { from: 'RES-0402-R88', to: 'PCBA-2611-A07', qty: 9600, unit: 'pcs' },
  { from: 'SP-2610-33', to: 'PCBA-2611-A07', qty: 1.2, unit: 'kg' },
  { from: 'SP-2610-33', to: 'PCBA-2611-A09', qty: 0.8, unit: 'kg' },
  { from: 'PCB-R3-2609A', to: 'PCBA-2611-A09', qty: 320, unit: 'pcs' },
  { from: 'PCBA-2611-A07', to: 'FG-2611-0042', qty: 480, unit: 'pcs' },
  { from: 'HSG-2610-12', to: 'FG-2611-0042', qty: 480, unit: 'pcs' },
  { from: 'PCBA-2611-A09', to: 'FG-2611-0051', qty: 320, unit: 'pcs' },
  { from: 'FG-2611-0042', to: 'DN-88120', qty: 300, unit: 'pcs' },
  { from: 'FG-2611-0042', to: 'DN-88131', qty: 180, unit: 'pcs' },
]
const traceRoots = [
  { label: '成品 FG-2611-0042（客訴）', value: 'FG-2611-0042' },
  { label: '錫膏 SP-2610-33（可疑料）', value: 'SP-2610-33' },
]
const traceRoot = ref('FG-2611-0042')
const traceSelected = ref(null)
const traceSample = `<ChptLotTrace
  v-model:selected="selected"
  :nodes="nodes"
  :links="links"
  root-id="FG-2611-0042"
  :kinds="{ material: { label: '原料' }, wip: { label: '半成品' }, product: { label: '成品' } }"
/>

// nodes：[{ id: 'SP-2610-33', label: 'SP-2610-33', kind: 'material', sublabel: '錫膏', status: 'suspect' }, ...]
// links：[{ from: 'SP-2610-33', to: 'PCBA-2611-A07', qty: 1.2, unit: 'kg' }, ...]  // from 投入 → to 產出`
const traceProps = [
  { name: 'nodes / links', type: 'TraceNode[] / TraceLink[]', def: '—', desc: '批號與「投入 → 產出」關係' },
  { name: 'rootId', type: 'string', def: '—', desc: '查詢的批號（放在中間）' },
  { name: 'selected', type: 'string | null', def: 'null', desc: '選取的批號（v-model:selected）；高亮它與查詢批號之間的路徑' },
  { name: 'defaultDirection', type: "'backward' | 'forward' | 'both'", def: "'both'", desc: '預設追溯方向（工具列可切換）' },
  { name: 'defaultView', type: "'graph' | 'list'", def: "'graph'", desc: '預設檢視方式（工具列可切換）' },
  { name: 'maxDepth', type: 'number', def: 'Infinity', desc: '最多追幾層' },
  { name: 'kinds', type: 'Record<string, { label, color? }>', def: '{}', desc: '種類名稱與顏色（node.kind）；沒給顏色時依序用圖表色' },
  { name: 'showQty', type: 'boolean', def: 'true', desc: '連線上顯示用量' },
]
const traceDataRows = [
  { name: 'TraceNode.id / label', type: 'string', def: '—', desc: '批號／顯示名稱' },
  { name: 'TraceNode.kind / sublabel', type: 'string', def: '—', desc: '種類（顏色）／第二行小字' },
  { name: 'TraceNode.status', type: "'normal' | 'hold' | 'suspect'", def: '—', desc: '隔離（紅框、HOLD）／可疑（虛線黃框）' },
  { name: 'TraceLink.from / to', type: 'string', def: '—', desc: '投入的批號 → 產出的批號' },
  { name: 'TraceLink.qty / unit', type: 'number / string', def: '—', desc: '用量（連線上與清單裡顯示）' },
]
const traceEvents = [
  { name: 'update:selected', params: '(id: string | null)', desc: '選取改變' },
  { name: 'node-click', params: '(node: TraceNode)', desc: '點選（或 Enter）一個批號' },
]
const traceMethods = [{ name: 'select(id)', type: '(id: string | null) => void', desc: '選取某個批號；null 取消選取' }]

const barcodeMethods = [{ name: 'toSVG()', type: '() => string', desc: '目前條碼的 SVG 原始碼（列印、下載用）；無法編碼時為空字串' }]

const qrRef = useTemplateRef('qrRef')
const qrValue = ref('https://example.com/wo/2609-101')
const qrExpired = ref(true)
const qrSample = `<ChptQRCode :value="url" :size="160" />
<ChptQRCode :value="loginUrl" :status="expired ? 'expired' : 'active'" @refresh="renew" />

qrRef.value.download('label.png')   // 下載 PNG`
const qrProps = [
  { name: 'value', type: 'string', def: '—', desc: '內容（支援中文；上限約 2.9KB）' },
  { name: 'size / margin', type: 'number', def: '160 / 2', desc: '邊長 px；四周留白模組數' },
  { name: 'level', type: "'L'|'M'|'Q'|'H'", def: "'M'", desc: '容錯等級；有 icon 時自動用 H' },
  { name: 'color / bgColor', type: 'string', def: '黑 / 白', desc: '顏色；兩者要有足夠對比才掃得出來' },
  { name: 'icon / iconRatio', type: 'string / number', def: "'' / 0.22", desc: '中央 Logo' },
  { name: 'status / expiredText', type: "'active'|'expired'|'loading'", def: "'active'", desc: '過期時顯示重新產生（@refresh）' },
  { name: 'title', type: 'string', def: '「QR Code：內容」', desc: '螢幕閱讀器唸的名稱' },
  { name: 'ref: toDataURL(scale) / download(filename)', type: '—', def: '—', desc: '輸出 PNG' },
  { name: 'bordered', type: 'boolean', def: 'true', desc: '外框' },
  { name: '@refresh', type: 'event', def: '—', desc: 'status 為 expired 時按「重新產生」' },
]
// ---- ChptAuditTrail ----
const auditLast = ref('')
const auditFieldLabels = { peak: '峰值溫度', soak: '恆溫時間', speed: '輸送速度', n2: '氮氣保護', approved: '核准' }
const auditFormat = (v, f) => {
  if (v === null || v === undefined || v === '') return '（空）'
  if (f === 'peak') return `${v} °C`
  if (f === 'soak') return `${v} 秒`
  if (f === 'speed') return `${v} cm/min`
  if (typeof v === 'boolean') return v ? '是' : '否'
  return String(v)
}
const auditEntries = [
  { id: 'e1', at: '2026-11-20T09:12:00', user: '林工程師', action: 'create', target: '配方 R-102', changes: [{ field: 'peak', to: 245 }, { field: 'soak', to: 90 }, { field: 'speed', to: 80 }, { field: 'n2', to: false }] },
  { id: 'e2', at: '2026-11-24T14:30:00', user: '林工程師', action: 'update', target: '配方 R-102', changes: [{ field: 'peak', from: 245, to: 250 }, { field: 'soak', from: 90, to: 75 }], note: 'BGA 空焊改善：提高峰值、縮短恆溫' },
  { id: 'e3', at: '2026-11-25T08:05:00', user: '陳經理', action: 'update', target: '配方 R-102', changes: [{ field: 'approved', from: false, to: true }], note: '試產 200 片 X-ray 無空焊，核准' },
  { id: 'e4', at: '2026-11-26T16:42:00', user: '王組長', action: 'update', target: '配方 R-102', changes: [{ field: 'speed', from: 80, to: 75 }, { field: 'n2', from: false, to: true }] },
  { id: 'e5', at: '2026-11-27T09:20:00', user: '林工程師', action: 'update', target: '配方 R-102', changes: [{ field: 'peak', from: 250, to: 248 }], note: '零件廠商建議峰值上限 248 °C' },
]
const auditSample = `<ChptAuditTrail
  :entries="entries"
  :field-labels="{ peak: '峰值溫度', soak: '恆溫時間' }"
  :format-value="(v, field) => field === 'peak' ? \`\${v} °C\` : String(v ?? '（空）')"
  revertable
  @revert="({ change }) => save(change.field, change.from)"
  @revert-version="({ snapshot }) => saveAll(snapshot)"
/>

const entries = [
  { id: 'e1', at: '2026-11-20T09:12:00', user: '林工程師', action: 'create', target: '配方 R-102',
    changes: [{ field: 'peak', to: 245 }, { field: 'soak', to: 90 }] },
  { id: 'e2', at: '2026-11-24T14:30:00', user: '林工程師', action: 'update',
    changes: [{ field: 'peak', from: 245, to: 250 }], note: 'BGA 空焊改善' },
]

// 某一筆之後的完整內容：auditSnapshot(entries, 'e2') → { peak: 250, soak: 90 }`
const auditProps = [
  { name: 'entries', type: 'AuditEntry[]', def: '—', desc: '紀錄（順序不拘，依時間由新到舊顯示）' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'fieldLabels', type: 'Record<string, string>', def: '{}', desc: '欄位 key → 顯示名稱（變更本身有 label 時以 label 為準）' },
  { name: 'formatValue', type: '(value, field) => string', def: '—', desc: '值的顯示方式；不給時空值顯示「（空）」、布林顯示是 / 否、日期顯示 YYYY-MM-DD HH:mm、物件顯示 JSON' },
  { name: 'revertable', type: 'boolean', def: 'false', desc: '顯示還原按鈕（送出 revert / revert-version）' },
  { name: 'compare', type: 'boolean', def: 'true', desc: '可勾選兩筆比較版本' },
  { name: 'pageSize', type: 'number', def: '50', desc: '一次顯示幾筆，其餘按「顯示更多」' },
  { name: 'maxHeight', type: 'number', def: '—', desc: '時間軸最大高度（px），超過時捲動' },
  { name: 'now', type: 'number | string | Date', def: '現在', desc: '判斷「今天 / 昨天」用' },
  { name: 'filename', type: 'string', def: "'audit-trail'", desc: '匯出 CSV 的檔名（不含副檔名）' },
]
const auditDataRows = [
  { name: 'AuditEntry', type: '{ id, at, user, action?, target?, changes?, note? }', def: '—', desc: "action：'create' | 'update' | 'delete' 或自訂文字；at：epoch ms、ISO 字串或 Date" },
  { name: 'AuditChange', type: '{ field, label?, from?, to? }', def: '—', desc: '新增時通常只有 to' },
]
const auditEvents = [
  { name: 'revert', params: '({ entry, change })', desc: '還原單一欄位：把 change.field 改回 change.from' },
  { name: 'revert-version', params: '({ entry, snapshot })', desc: '還原整個版本：snapshot 是那一筆之後的完整欄位值' },
]
const auditMethods = [
  { name: 'snapshot(id)', type: '(id: string | null) => Record<string, unknown>', desc: '某一筆之後的完整欄位值（null：初始狀態）' },
  { name: 'compareWith(a, b)', type: '(a: string, b: string) => void', desc: '設定要比較的兩筆紀錄' },
  { name: 'exportCsv(filename?)', type: '(filename?: string) => void', desc: '匯出目前篩選後的紀錄（每個欄位變更一列）' },
]

// ---- ChptDiffViewer ----
const recipeA = {
  product: 'PCB-A12',
  revision: 3,
  oven: { profile: 'SAC305-std', conveyorSpeed: 85, zones: [{ temp: 150 }, { temp: 175 }, { temp: 190 }, { temp: 220 }, { temp: 245 }], nitrogen: true },
  printer: { squeegeePressure: 6.5, speed: 40, separation: { speed: 1.5, distance: 2 }, cleanEvery: 5 },
  mounter: { nozzles: ['N1', 'N2', 'N3'], vacuumLimit: -60, placementOffset: { x: 0, y: 0 } },
  aoi: { program: 'A12-R3', falseCallLimit: 3 },
}
const recipeB = {
  product: 'PCB-A12',
  revision: 4,
  oven: { profile: 'SAC305-lowvoid', conveyorSpeed: 82, zones: [{ temp: 150 }, { temp: 176 }, { temp: 192 }, { temp: 228 }, { temp: 247 }], nitrogen: true },
  printer: { squeegeePressure: 6.5, speed: 35, separation: { speed: 1.5, distance: 2 } },
  mounter: { nozzles: ['N1', 'N2', 'N3', 'N4'], vacuumLimit: -60, placementOffset: { x: 0.02, y: 0 } },
  aoi: { program: 'A12-R4', falseCallLimit: 3, ignoreFiducial: true },
}
const recipeTolerances = { 'oven.zones[*].temp': 2, 'mounter.placementOffset.*': 0.05 }
const recipeUnits = { 'oven.zones[*].temp': '°C', 'oven.conveyorSpeed': 'cm/min', 'printer.squeegeePressure': 'kg', 'printer.speed': 'mm/s', 'mounter.vacuumLimit': 'kPa', 'mounter.placementOffset.*': 'mm' }
const recipeLabels = { 'oven.conveyorSpeed': '輸送帶速度', 'printer.squeegeePressure': '刮刀壓力', 'printer.speed': '印刷速度', 'printer.cleanEvery': '每幾片擦網', 'aoi.falseCallLimit': '誤判上限（%）' }
const diffOnly = ref(true)
const diffSample = `<ChptDiffViewer
  v-model:only-diff="onlyDiff"
  :left="recipeV3"
  :right="recipeV4"
  left-label="v3（量產）"
  right-label="v4（試產）"
  :tolerances="{ 'oven.zones[*].temp': 2 }"
  :units="{ 'oven.zones[*].temp': '°C' }"
  :labels="{ 'oven.conveyorSpeed': '輸送帶速度' }"
/>`
const diffProps = [
  { name: 'left / right', type: 'ParamValue', def: '—', desc: '兩邊的參數（物件、陣列可巢狀）' },
  { name: 'leftLabel / rightLabel', type: 'string', def: '語系', desc: '欄位標題' },
  { name: 'tolerance', type: 'number', def: '0', desc: '數值的容許差（絕對值），差在範圍內算「容許內」' },
  { name: 'tolerances', type: 'Record<string, number>', def: '—', desc: "依路徑的容許差；* 對任何一段、[*] 對任何 index、結尾 .* 對底下所有路徑" },
  { name: 'units', type: 'Record<string, string>', def: '—', desc: '依路徑的單位（規則同 tolerances）' },
  { name: 'labels', type: 'Record<string, string>', def: '—', desc: '完整路徑 → 顯示名稱（顯示在路徑下方，也可搜尋）' },
  { name: 'v-model:onlyDiff', type: 'boolean', def: 'true', desc: '只顯示有差異的（包含容許內）' },
  { name: 'searchable', type: 'boolean', def: 'true', desc: '顯示搜尋框' },
  { name: 'maxHeight', type: 'number', def: '0', desc: '最大高度（px），超過時捲動（標題列固定）' },
  { name: 'defaultExpandDepth', type: 'number', def: 'Infinity', desc: '預設展開幾層' },
  { name: 'label', type: 'string', def: '語系', desc: '表格名稱（螢幕閱讀器）' },
]
const diffEvents = [{ name: 'update:onlyDiff', params: '(value: boolean)', desc: '切換「只顯示差異」' }]
const diffMethods = [
  { name: 'expandAll() / collapseAll()', type: '() => void', desc: '全部展開 / 摺疊' },
  { name: 'rows', type: 'DiffRow[]', desc: '比對結果（含相同的列）：{ path, left, right, status, delta?, pct? }' },
]
// ---- ChptJsonViewer ----
const jvData = {
  status: 200,
  requestId: 'req_7f3a9c21',
  data: {
    line: 'SMT-3',
    shift: { name: '早班', start: '08:00', end: '17:00', leader: null },
    oee: { availability: 0.91, performance: 0.87, quality: 0.993, value: 0.786 },
    alarms: [
      { code: 'E203', message: '吸嘴真空異常', severity: 'major', at: '2026-11-24T09:12:33+08:00', acked: true },
      { code: 'W118', message: '錫膏印刷偏移超過 50 µm，請檢查鋼板張力與刮刀壓力；若連續三片超出規格請停機並通知製程工程師處理。', severity: 'minor', at: '2026-11-24T10:41:05+08:00', acked: false },
    ],
    hourly: Array.from({ length: 160 }, (_, i) => ({ hour: i % 24, output: 100 + ((i * 37) % 30) })),
    tags: ['automotive', 'lead-free'],
    'x-trace-id': 'a1b2c3',
  },
}
const jvBefore = {
  ...jvData,
  requestId: 'req_7f3a9c20',
  data: { ...jvData.data, oee: { availability: 0.91, performance: 0.82, quality: 0.993 }, tags: ['automotive'], operator: '陳小明', hourly: jvData.data.hourly.slice(0, 150) },
}
const jvCompare = ref(false)
const jvLog = ref('')
const jvSample = `<ChptJsonViewer
  :data="response"
  :expand-depth="2"
  root-name="response"
  :compare="previousResponse"
  @select="({ pathText, value }) => …"
/>`
const jvProps = [
  { name: 'data', type: 'unknown', def: '—', desc: '要顯示的資料（物件、陣列或基本型別）' },
  { name: 'compare', type: 'unknown', def: 'undefined', desc: '舊版資料；給了就標出新增、刪除、變更（物件依鍵、陣列依索引比對）' },
  { name: 'expandDepth', type: 'number', def: '1', desc: '一開始展開幾層（0 = 只有根）' },
  { name: 'rootName', type: 'string', def: "''", desc: "複製路徑時的開頭，例如 'response' → response.data.items[0]" },
  { name: 'maxStringLength', type: 'number', def: '120', desc: '字串超過這個長度時截斷（可點「顯示全部」）' },
  { name: 'pageSize', type: 'number', def: '100', desc: '陣列 / 物件一次顯示幾個子項，其餘收成「還有 N 項」' },
  { name: 'toolbar / searchable / copyable', type: 'boolean', def: 'true', desc: '工具列、搜尋、複製' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'maxHeight', type: 'number | null', def: 'null', desc: '最大高度（px），超過時捲動' },
]
const jvEvents = [
  { name: 'select', params: '({ path, pathText, value })', desc: '點一列' },
  { name: 'copy', params: "({ text, kind: 'value' | 'path' | 'all' })", desc: '複製了值、路徑或全部' },
]
const jvMethods = [
  { name: 'expandAll() / collapseAll()', type: '() => void', desc: '全部展開 / 收合' },
  { name: 'reveal(path)', type: '(path: (string | number)[]) => void', desc: '展開到某個路徑並捲到那裡' },
]
// ---- ChptOrgChart ----
const orgRows = [
  { id: 'gm', parentId: null, label: '張志明', title: '廠長', color: 'rgb(var(--t-accent))' },
  { id: 'mfg', parentId: 'gm', label: '李美玲', title: '製造部 經理' },
  { id: 'qa', parentId: 'gm', label: '王建國', title: '品保部 經理' },
  { id: 'eq', parentId: 'gm', label: '陳俊宏', title: '設備部 經理' },
  { id: 'pc', parentId: 'gm', label: '黃雅婷', title: '生管課 課長' },
  { id: 'smt', parentId: 'mfg', label: '林家豪', title: 'SMT 課 課長' },
  { id: 'dip', parentId: 'mfg', label: '吳淑芬', title: 'DIP 課 課長' },
  { id: 'assy', parentId: 'mfg', label: '鄭文傑', title: '組裝課 課長' },
  { id: 'smt1', parentId: 'smt', label: '周子豪', title: 'SMT 一線 領班' },
  { id: 'smt2', parentId: 'smt', label: '許怡君', title: 'SMT 二線 領班' },
  { id: 'smt3', parentId: 'smt', label: 'Ken Liu', title: 'SMT 三線 領班' },
  { id: 'smt1a', parentId: 'smt1', label: '蔡明哲', title: '技術員' },
  { id: 'smt1b', parentId: 'smt1', label: '謝佳穎', title: '技術員' },
  { id: 'dip1', parentId: 'dip', label: '楊宗翰', title: 'DIP 一線 領班' },
  { id: 'assy1', parentId: 'assy', label: '劉雅雯', title: '組裝 A 線 領班' },
  { id: 'assy2', parentId: 'assy', label: '洪志偉', title: '組裝 B 線 領班' },
  { id: 'iqc', parentId: 'qa', label: '高婉婷', title: 'IQC 組長' },
  { id: 'ipqc', parentId: 'qa', label: '曾冠宇', title: 'IPQC 組長' },
  { id: 'oqc', parentId: 'qa', label: 'Amy Chen', title: 'OQC 組長' },
  { id: 'eq1', parentId: 'eq', label: '羅志成', title: 'SMT 設備 工程師' },
  { id: 'eq2', parentId: 'eq', label: '江雅琪', title: '治具 工程師' },
]
const orgPlant = orgFromFlat(orgRows)
const orgSelected = ref('smt2')
const orgOrientation = ref('vertical')
const orgOrientations = [
  { label: '由上往下', value: 'vertical' },
  { label: '由左往右', value: 'horizontal' },
]
const orgSelectedText = computed(() => {
  const r = orgRows.find((x) => x.id === orgSelected.value)
  return r ? `${r.label}（${r.title}）` : '（無）'
})
const orgLines = {
  id: 'f2', label: '二廠 SMT', title: '林家豪 課長', headcount: 48,
  children: [
    { id: 'l1', label: 'SMT 一線', title: '周子豪', status: 'run', headcount: 14, children: [
      { id: 'l1p', label: '印刷 / SPI', title: '蔡明哲', status: 'run' },
      { id: 'l1m', label: '置件 NXT', title: '謝佳穎', status: 'run' },
      { id: 'l1r', label: '迴焊 / AOI', title: '楊佩珊', status: 'idle' },
    ] },
    { id: 'l2', label: 'SMT 二線', title: '許怡君', status: 'down', headcount: 16, children: [
      { id: 'l2p', label: '印刷 / SPI', title: '張宏達', status: 'down' },
      { id: 'l2m', label: '置件 NXT', title: '吳品妤', status: 'run' },
    ] },
    { id: 'l3', label: 'SMT 三線', title: 'Ken Liu', status: 'run', headcount: 18 },
  ],
}
const orgSample = `<ChptOrgChart
  v-model:selected="selected"
  :data="orgFromFlat(rows)"          // rows：{ id, parentId, label, title, avatar?, color? }[]
  orientation="vertical"
  :default-expand-depth="2"
  :height="460"
/>

<!-- 自訂節點 -->
<ChptOrgChart :data="tree" orientation="horizontal" :node-width="190" :node-height="56">
  <template #node="{ node, selected, expanded, match }">
    <MyLineCard :line="node" :active="selected" />
  </template>
</ChptOrgChart>`
const orgProps = [
  { name: 'data', type: 'OrgNode | OrgNode[]', def: '—', desc: '樹狀資料，可以有多個根節點；平面清單用 orgFromFlat() 轉換' },
  { name: 'orientation', type: "'vertical' | 'horizontal'", def: "'vertical'", desc: '由上往下／由左往右' },
  { name: 'selected', type: 'string | number | null', def: 'null', desc: '選取的節點（v-model:selected），外部改值時會展開上層並移到中央' },
  { name: 'defaultExpandDepth', type: 'number', def: 'Infinity', desc: '一開始展開到第幾層（0 = 只有根節點）' },
  { name: 'nodeWidth / nodeHeight', type: 'number', def: '200 / 64', desc: '節點大小（px）' },
  { name: 'gapX / gapY', type: 'number', def: '20 / 44', desc: '兄弟之間／上下層之間的距離' },
  { name: 'height', type: 'number', def: '480', desc: '畫布高度' },
  { name: 'searchable / searchPlaceholder / searchFields', type: 'boolean / string / string[]', def: "true / 語系 / ['label', 'title']", desc: '搜尋框與比對的欄位' },
  { name: 'exportable / exportName', type: 'boolean / string', def: "true / 'org-chart'", desc: '下載 PNG 按鈕與檔名' },
  { name: 'minZoom / maxZoom', type: 'number', def: '0.2 / 2', desc: '縮放範圍' },
  { name: 'label / emptyText', type: 'string', def: "'' / 語系", desc: '組織圖名稱（螢幕閱讀器）／沒有資料時的文字' },
]
const orgNodeRows = [
  { name: 'id / label', type: 'string | number / string', def: '—', desc: '唯一 id／名稱' },
  { name: 'title / avatar / color', type: 'string', def: '—', desc: '職稱／頭像網址（沒有時顯示縮寫）／頂端色條' },
  { name: 'children', type: 'OrgNode[]', def: '—', desc: '下層；其他欄位會原樣傳給 #node slot' },
]
const orgEvents = [
  { name: 'update:selected', params: '(id: string | number | null)', desc: '點選或 Enter 選取節點' },
  { name: 'node-click', params: '(node: OrgNode)', desc: '點選節點' },
  { name: 'expand / collapse', params: '(node: OrgNode)', desc: '展開／收合' },
]
const orgSlots = [{ name: 'node', params: '{ node, depth, expanded, selected, match, descendants }', desc: '自訂節點內容（大小由 nodeWidth / nodeHeight 決定）' }]
const orgMethods = [
  { name: 'expandAll() / collapseAll()', type: '() => void', desc: '全部展開／收合' },
  { name: 'expand(id) / collapse(id)', type: '(id) => void', desc: '展開／收合一個節點' },
  { name: 'reveal(id)', type: '(id) => void', desc: '展開上層並移到畫面中央' },
  { name: 'fit() / zoomIn() / zoomOut()', type: '() => void', desc: '全部顯示／放大／縮小' },
  { name: 'exportPng(scale?)', type: '(scale = 2) => Promise<Blob | null>', desc: '以預設節點樣式輸出 PNG' },
  { name: 'layout() / expandedKeys()', type: '() => OrgLayout / string[]', desc: '目前的版面／展開的節點' },
]

// ---- ChptBomTree ----
const part = (partNo, name, qty, extra = {}) => ({ partNo, name, qty, unit: 'pcs', ...extra })
const bomV2 = {
  partNo: 'GW-500',
  name: '工業閘道器 GW-500（Rev.B）',
  qty: 1,
  children: [
    {
      partNo: 'PCBA-500-MB',
      name: '主板組件',
      qty: 1,
      children: [
        part('PCB-500-MB', '主板空板 6L', 1),
        part('IC-MCU-H7', 'MCU H7 系列 LQFP144', 1, { critical: true, ref: 'U1' }),
        part('IC-PHY-ETH', '乙太網 PHY', 2, { ref: 'U5, U6' }),
        part('IC-DDR4-4G', 'DDR4 4Gb', 2, { critical: true, ref: 'U3, U4' }),
        part('RC0402-10K', '電阻 10KΩ 0402', 24, { ref: 'R1–R24' }),
        part('CC0402-100N', '電容 100nF 0402', 36, { ref: 'C1–C36' }),
        part('CN-RJ45-2', 'RJ45 雙口連接器', 1, { ref: 'J1' }),
      ],
    },
    {
      partNo: 'PSU-24V-MOD',
      name: '電源模組',
      qty: 1,
      children: [part('PCB-PSU', '電源板', 1), part('IC-DCDC-5A', 'DC-DC 5A', 2, { critical: true, ref: 'U1, U2' }), part('L-10UH', '電感 10µH', 2, { ref: 'L1, L2' }), part('CC0402-100N', '電容 100nF 0402', 8, { ref: 'C1–C8' })],
    },
    part('CASE-500-AL', '鋁擠外殼', 1),
    part('SCREW-M3-6', '螺絲 M3×6', 8),
    part('LBL-500', '銘牌標籤', 1),
  ],
}
const bomV1 = {
  ...bomV2,
  name: '工業閘道器 GW-500（Rev.A）',
  children: [
    { ...bomV2.children[0], children: [...bomV2.children[0].children.filter((c) => c.partNo !== 'IC-PHY-ETH'), part('IC-PHY-ETH', '乙太網 PHY', 1), part('IC-RTC', 'RTC 時鐘', 1)] },
    bomV2.children[1],
    bomV2.children[2],
    part('SCREW-M3-6', '螺絲 M3×6', 6),
  ],
}
const bomStock = {
  'PSU-24V-MOD': 120,
  'PCB-500-MB': 600,
  'IC-MCU-H7': 380,
  'IC-PHY-ETH': 1500,
  'IC-DDR4-4G': 700,
  'RC0402-10K': 50000,
  'CC0402-100N': 12000,
  'CN-RJ45-2': 520,
  'PCB-PSU': 200,
  'IC-DCDC-5A': 900,
  'L-10UH': 2000,
  'CASE-500-AL': 450,
  'SCREW-M3-6': 10000,
  'LBL-500': 3000,
}
const bomQty = ref(500)
const bomCompare = ref(false)
const bomClicked = ref('')
const bomSample = `<ChptBomTree
  v-model:build-qty="qty"
  :data="{ partNo: 'GW-500', name: '工業閘道器', qty: 1, children: [
    { partNo: 'PCBA-500-MB', name: '主板組件', qty: 1, children: [
      { partNo: 'IC-MCU-H7', name: 'MCU', qty: 1, critical: true, ref: 'U1' }, …
    ] }, …
  ] }"
  :stock="{ 'IC-MCU-H7': 380, 'PSU-24V-MOD': 120, … }"
  :compare="previousRevision"
/>`
const bomProps = [
  { name: 'data', type: 'BomItem', def: '—', desc: '成品（根）與各階子件：{ partNo, name?, qty, unit?, critical?, ref?, children? }' },
  { name: 'v-model:buildQty', type: 'number', def: '1', desc: '生產數量；需求 = 每台用量 × 生產數量' },
  { name: 'stock', type: 'Record<partNo, number> | null', def: 'null', desc: '庫存；給了才顯示庫存與缺料欄' },
  { name: 'netting', type: 'boolean', def: 'true', desc: '扣抵半成品庫存（半成品有庫存時，下階少用）；同料號多處使用時共用庫存' },
  { name: 'compare', type: 'BomItem | null', def: 'null', desc: '舊版次；給了就標出新增、刪除、用量變更' },
  { name: 'expandDepth', type: 'number', def: '2', desc: '一開始展開幾階' },
  { name: 'showRef', type: 'boolean', def: 'true', desc: '位置號欄' },
  { name: 'title', type: 'string', def: "''", desc: '標題' },
  { name: 'maxHeight', type: 'number | null', def: 'null', desc: '表格最大高度；超過時捲動，表頭固定' },
  { name: 'filename', type: 'string', def: "'bom'", desc: '匯出 CSV 的檔名' },
]
const bomEvents = [
  { name: 'update:buildQty', params: '(qty: number)', desc: '改生產數量' },
  { name: 'row-click', params: '(item: BomItem, key: string)', desc: '點一列（key 是根到這一層的路徑）' },
]
const bomMethods = [
  { name: 'expandAll() / collapseAll()', type: '() => void', desc: '全部展開 / 收合' },
  { name: 'exportCsv()', type: '() => void', desc: '下載全部展開的攤平表（階、料號、用量、需求、庫存、缺料）' },
  { name: 'parts', type: 'BomPartNeed[]', desc: '各採購件的需求、庫存、缺料' },
]
// ---- ChptPivotTable ----
const pivotData = (() => {
  let seed = 21
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  const pick = (arr, w) => {
    let r = rand() * w.reduce((a, b) => a + b, 0)
    for (let i = 0; i < arr.length; i++) if ((r -= w[i]) <= 0) return arr[i]
    return arr[arr.length - 1]
  }
  const lines = [['一廠', 'SMT 一線'], ['一廠', 'SMT 二線'], ['一廠', 'SMT 三線'], ['二廠', 'SMT 五線'], ['二廠', 'SMT 六線'], ['三廠', 'DIP 一線']]
  const codes = ['空焊', '短路', '偏移', '立碑', '缺件', '錫珠', '極性反']
  const stations = ['印刷', '貼片', '回焊', 'AOI', 'ICT']
  return Array.from({ length: 3000 }, () => {
    const [plant, line] = pick(lines, [5, 6, 3, 4, 2, 2])
    const code = pick(codes, [8, 5, 4, 2, 3, 2, 1])
    const qty = 1 + Math.floor(rand() * rand() * 12)
    return {
      month: `2026-${String(8 + Math.floor(rand() * 4)).padStart(2, '0')}`,
      plant,
      line,
      station: pick(stations, [2, 3, 6, 4, 2]),
      shift: pick(['D', 'E', 'N'], [5, 4, 3]),
      code,
      qty,
      cost: Math.round(qty * (code === '缺件' ? 120 : 35) * (0.8 + rand() * 0.4)),
      operator: `OP-${100 + Math.floor(rand() * 40)}`,
    }
  })
})()
const pivotFields = [
  { key: 'plant', label: '廠區', order: ['一廠', '二廠', '三廠'] },
  { key: 'line', label: '產線', order: ['SMT 一線', 'SMT 二線', 'SMT 三線', 'SMT 五線', 'SMT 六線', 'DIP 一線'] },
  { key: 'station', label: '站別', order: ['印刷', '貼片', '回焊', 'AOI', 'ICT'] },
  { key: 'code', label: '不良代碼' },
  { key: 'month', label: '月份' },
  { key: 'shift', label: '班別', order: ['D', 'E', 'N'] },
  { key: 'operator', label: '作業員' },
  { key: 'qty', label: '不良數', kind: 'measure' },
  { key: 'cost', label: '損失金額', kind: 'measure', format: (v) => `$${Math.round(v).toLocaleString()}` },
]
const pivotConfig = ref({ rows: ['plant', 'line'], cols: ['month'], values: [{ field: 'qty', agg: 'sum' }] })
const pivotClicked = ref('')
function onPivotCell({ rowPath, colKey, value, result }) {
  const where = [...rowPath, ...(colKey ?? ['全部月份'])].join(' / ') || '全部'
  pivotClicked.value = `${where}：${value.field} ${value.agg} = ${result === null ? '—' : result.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}
const pivotSample = `<ChptPivotTable
  v-model:config="config"
  :data="defects"
  :fields="[
    { key: 'line', label: '產線' },
    { key: 'shift', label: '班別', order: ['D', 'E', 'N'] },
    { key: 'qty', label: '不良數', kind: 'measure' },
    { key: 'cost', label: '損失金額', kind: 'measure', format: (v) => '$' + v.toLocaleString() },
  ]"
/>

// config：{ rows: ['plant', 'line'], cols: ['month'], values: [{ field: 'qty', agg: 'sum' }] }`
const pivotProps = [
  { name: 'data', type: 'Record<string, unknown>[]', def: '—', desc: '原始資料（每筆一個物件）' },
  { name: 'fields', type: 'PivotField[]', def: '—', desc: '可用的欄位' },
  { name: 'v-model:config', type: 'PivotConfig', def: '{ rows: [], cols: [], values: [] }', desc: '列、欄、值的設定' },
  { name: 'configurable', type: 'boolean', def: 'true', desc: '顯示欄位設定（可收起）' },
  { name: 'heatmap', type: 'boolean', def: 'false', desc: '熱度上色的初始值（工具列可切換）' },
  { name: 'showTotals', type: 'boolean', def: 'true', desc: '總計欄與總計列' },
  { name: 'maxHeight', type: 'number', def: '520', desc: '表格最大高度（px）；列多於 200 時只畫看得到的部分；0 為不限' },
  { name: 'defaultExpandDepth', type: 'number', def: 'Infinity', desc: '預設展開幾層' },
  { name: 'filename', type: 'string', def: "'pivot'", desc: '匯出 CSV 的檔名（不含副檔名）' },
  { name: 'label', type: 'string', def: '語系', desc: '表格名稱（螢幕閱讀器）' },
]
const pivotDataRows = [
  { name: 'PivotField', type: "{ key, label, kind?: 'dimension' | 'measure', order?, format? }", def: '—', desc: 'measure 只能放到值；order 是分組值的自訂順序' },
  { name: 'PivotConfig', type: '{ rows: string[], cols: string[], values: { field, agg }[] }', def: '—', desc: "agg：'sum' | 'avg' | 'count' | 'min' | 'max' | 'countDistinct'" },
]
const pivotEvents = [
  { name: 'update:config', params: '(config: PivotConfig)', desc: '設定改變（v-model:config）' },
  { name: 'cell-click', params: '({ rowPath, colKey, value, result })', desc: '點一格：rowPath 為 [] 是總計列、colKey 為 null 是總計欄' },
]
const pivotMethods = [
  { name: 'expandAll() / collapseAll()', type: '() => void', desc: '全部展開 / 收合' },
  { name: 'exportCsv()', type: '() => void', desc: '匯出 CSV（最後一層的列與總計）' },
]
</script>
