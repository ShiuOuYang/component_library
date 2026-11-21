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

  </div>
</template>

<script setup>
import { ref, useTemplateRef } from 'vue'
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
</script>
