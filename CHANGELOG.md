# 變更紀錄

組件庫的對外行為變更都記在這裡。複製元件到其他專案、或同步更新時，先看「⚠️ 破壞性變更」。

- 格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)：新增 / 變更 / 修正 / 移除
- 版本號尚未啟用（`package.json` 為 `0.0.0`），先依日期分段；開始對外發布時再補版本號
- 改到 props、events、slots、對外型別或可觀察行為的 PR，都要在「未發布」補一筆

## 未發布

### ⚠️ 破壞性變更

- **移除沒有作用的 props**：ChptExcelExporter 的 `rawData`、EnterprisePareto 的 `highlightMode` 與
  `customRenderers`，連同型別 `ParetoHighlightMode`、`ParetoCustomRenderers`。這三個 props 從來沒被元件使用，
  傳了也不會有任何效果。請從呼叫端拿掉 —— 不拿掉不會報錯，但值會被當成一般 HTML 屬性掛在元件最外層
  （例如 `rawdata="[object Object],…"`，資料量大時字串很長）；從 `@/components/library` import 那兩個型別的
  TypeScript 程式會編譯失敗。

- **ChptExcelEditor**：`modelValue` 與 `ref.getData()` 改為依列位置輸出 —— 第 i 個元素就是第 i+1 列，
  中間（含開頭）的空白列是 `{}`，最後一列有內容之後的空白列不輸出。原本會跳過空白列，往返後資料換列。
  逐筆處理資料的程式要略過 `{}`。（#26）
- **EnterpriseHeatmap**：`chart-ready` 只在第一次畫完時發；之後每次重畫改發新的 `chart-rendered`。
  原本每次重畫都發 `chart-ready`。靠它偵測「重畫完成」的程式請改聽 `chart-rendered`。（#26）
- **ChptTable**：資料更新（即時同步、改某一列）時保留目前頁碼，只在頁數變少時拉回最後一頁。
  原本資料一變就回到第 1 頁。要從頭看時呼叫 `ref.resetPage()`。（#20）
- **ChptExcelEditor**：`modelValue` 成為完全受控 —— 父層傳入不同的資料或 `[]` 時，編輯器會換掉內容並清空復原紀錄。
  原本只在工作表是空的時候才載入。（#25）

### 新增

- **ChptTable**：多層表頭。欄位加上 `children` 就成為群組欄，標題橫跨底下的欄位，可以一直往下巢狀；
  沒有 children 的欄位自動延伸到最後一層。排序、欄寬只在最底層的欄位上，勾選欄、展開欄跟著橫跨所有表頭列。
  欄位設定參考 Vuetify 的 `v-data-table` headers，新增 `align`（`start` / `center` / `end`，也接受 `left` / `right`），表頭與儲存格一起對齊；
  `color`（`accent` / `success` / `warning` / `danger` / `info` / `neutral`）讓整欄的表頭與儲存格一起變色，設在群組上時底下的欄位沿用；
  `headerProps` 綁到這一欄的 `<th>`（class 或 style 有顏色時取代預設的表頭顏色）；
  `cellProps` 綁到每個 `<td>`，可以給函式依資料決定。
- **StateTimeline**（機台狀態時間軸）：每台機台一列，畫出實際發生的狀態（預設運轉、待機、保養、故障，可用 `states` 自訂）。
  紀錄可以只有開始時間（下一筆開始就是這一筆結束，最後一筆畫到 `openEndTime`）；每列依像素合併，資料再多也只畫寬度個矩形，
  一個像素裡有故障就畫故障（`priority`），短暫停機不會被蓋掉。右側統計稼動率（圖示 + 文字）、停機時間與次數，
  `sortRows` 依稼動率或停機時間排序；`summary-change` 送出 MTTR、MTBF 與最長的一次停機。Ctrl + 滾輪縮放、拖曳平移，
  統計跟著可見範圍（`summaryScope`）。滑鼠或方向鍵逐段查看。
- **BoxPlotChart**（箱型圖／小提琴圖）：依組別比較分布，箱子 Q1～Q3、中位數、平均、1.5 倍 IQR 的鬚與離群值；
  `mode="violin"` 畫出核密度形狀（看得出雙峰）；`quartileMethod="exclusive"` 與 Minitab 一致；`showPoints` 畫出離群值或每一筆；
  參考線（規格上下限）、`highlightKey`、依中位數排序。滑過組看統計、滑過離群值看是哪一筆，方向鍵逐組查看。
- **WaterfallChart**（瀑布圖）：起點、增減、小計、總計（`kindField`），`totalLabel` 自動補最後的總計；
  增減帶 ▲▼ 與正負號（不只靠顏色），`increaseIsGood` 決定增加是綠還是紅；`showPercent` 標出佔起點的比例（總計就是良率）；
  `zeroBaseline=false` 讓軸從資料附近開始，起點與合計畫截斷記號。滑鼠或方向鍵逐項查看。
- **ControlChart**（SPC 管制圖）：I-MR、X̄-R、X̄-S、p、u 五種，計量值圖附副圖（MR／R／S）。
  自動計算中心線與 ±3σ 界限（子組大小或樣本數不同時逐點計算）；Nelson 8 條判異規則可選（預設 1、2、3、5、6），
  異常點畫成紅色菱形並標上規則編號；`baselineCount` 用前 N 點建立界限、`limits` 指定已核定的界限；規格線、±1σ／2σ 區帶；
  `analysis-change` 送出界限與異常點。滑鼠或方向鍵逐點查看。
- **CapabilityHistogram**（直方圖 + 製程能力）：Cp、Cpk（組內 σ：移動全距、子組全距或標準差）、Pp、Ppk（整體 σ）、
  規格外 PPM（實際與常態預估）；Cpk 依門檻顯示「達標／尚可／不足」（圖示 + 文字）；規格外的組標紅、疊常態曲線。
- **HorizontalBarChart**（水平長條圖／排行榜）：名稱橫向排開、預設由大到小；`topN` + `showOthers` 把尾巴併成「其他」；
  數值標在末端（預留空間不會被裁）、可加佔比與名次；`highlightKey` 強調一列其餘轉灰；參考線（目標）；負值往左長；選用數值軸。
- **PieChart**（圓餅圖／環圈圖）：最多 `maxSlices`（預設 6）塊，其餘併成「其他」；顏色依資料順序指定 ——
  隱藏某一塊或數值變動時其他塊不換色；圖例一定有名稱、數值與百分比，可點擊隱藏（`v-model:hidden-keys`）；
  環圈中央顯示總數，滑過時換成那一塊；只在放得下的扇形上標百分比，文字色依底色自動選。
- **SparklineChart**（迷你趨勢線）：線、面積、長條；走勢用淡化色、最新一點用強調色；最高最低點、目標線；
  可放進 `ChptStatistic` 的 `footer` 插槽做 KPI 卡片。
- **GaugeChart**（儀表）：`bands` 定義區間（未達標／注意／達標），填色代表目前的區間、軌道是同色的淡色，
  狀態同時顯示圖示與文字；目標刻度；`role="meter"`。
- **圖表類別色 `chart-1`～`chart-8`**（themed token，可用 `bg-chart-1` 等 class）：8 色、淺深色各自挑過的階，
  用調色盤驗證腳本對本專案背景驗過色盲區分。新圖表的預設色都從這裡取（`chartPalette`）；既有圖表不受影響。
- **GanttChart**：甘特圖（唯讀第一版），用於機台排程、工單、專案進度。同一列可排多個任務、沒有結束時間的任務畫成里程碑、
  依狀態著色並可從圖例隱藏、底部進度線、「今天」線、兩層時間軸（月／日、日／時…）；Ctrl（⌘）+ 滾輪或捏合縮放時間軸、
  拖曳或左右滑動平移；只畫看得到的列，上千列也能順暢捲動。`ref.scrollToTask(key)` 可捲到指定任務。
  只寫日期的字串（`'2026-10-24'`）一律當本地時間午夜，結束日預設算到那一天結束。（#30）
- **GanttChart 第二版**：
  - `editable`：拖曳移動、拖兩端調整長短（`Esc` 取消），`Tab` 選到任務後用方向鍵微調；`allowRowChange` 可拖到別的列（換機台）。
    元件不改資料 —— 改動用 `task-change` 送出（含 `previous`；資料是日期字串時存回 `displayEnd`），由呼叫端更新 `data`。
    時間依縮放程度吸附（`snap`，預設 `'auto'`：看日以天、放大到小時以 15 分）。
  - 相依箭頭：任務的 `dependsOn`（或另給 `dependencies`）畫成完成才開始的箭頭，後續任務開始得比前置任務結束早時標紅。
  - `nonWorkingDays` / `holidays`：週末、假日畫上底色。
  - 縮放中資料範圍或圖表寬度改變時，保留目前看到的時間範圍（原本會跳回全覽）。
- **StatusScatterMap**：依 PASS / NEARFAIL / FAIL 著色的座標散佈圖，Canvas 繪製、可撐數萬點。（#16）
- **DualAxisComboChart**：10 萬筆資料渲染（Canvas + 降採樣）與滑鼠滾輪縮放（#14）；`highlightKey` 連動高亮與圖層 `keyFn`（#15）。
- **事件 payload 型別**：`ChartLayerEvent`、`ChartSelectionEvent`、`ChartAxisDomainEvent`、`ChartResizeEvent`、
  `ChartReadyEvent`、`GridFacetCell`；DualAxisComboChart、FacetedChart、GridFacetChart 的事件都有明確型別。（#24）
- **對外型別**：`ChartLayer`、`TooltipPayload`、`TableColumn`、`TableChangeEvent`、`PcbData`、`ComponentSize` 等
  統一從 `@/components/library` 以 `import type` 取得，不必再 import 元件內部檔案。（#22）
- **EnterpriseHeatmap**：`chart-rendered` 事件（見上）。（#26）
- **DualAxisComboChart**：長條圖的 `layer-click` 補上 `seriesKey`（與 `layer-hover` 同名；舊名 `series` 仍保留）。（#24）

### 變更

- **ChptTable**：表頭改為淡藍底（`headerBgGradient` 預設 `from-accent-subtle to-accent-subtle`）、標題用主要文字色，
  欄與欄之間加分隔線；群組標題用強調色（新 prop `groupHeaderTextColor`）。排序圖示從標題右緣的 ▲▼ 改成緊接在標題後面的上下箭頭，
  排序中的方向用強調色。要維持舊的灰底，傳 `header-bg-gradient="from-surface-secondary to-surface-tertiary"`、
  `header-text-color="text-content-secondary"`。
- **DualAxisComboChart 滾輪縮放改成像 Allegro**：在繪圖區滾動時，以游標那一點為中心 **X 與 Y 同時縮放**
  （雙 Y 軸用同一個倍率、游標底下的資料點留在原地）；原本只縮放 X。在 X 軸或左右 Y 軸的刻度上滾仍只縮放那一軸。
  新增**按住滑鼠中鍵拖曳平移** X 與 Y（送出 `axis-drag`）。要維持只縮放 X，設 `wheel-zoom-axes="x"`。
  **縮小與平移不再受資料範圍限制**：可以縮到比全覽還小、平移到資料範圍外（沒縮放時也能平移）；
  因此游標在圖上時滾輪一律由圖表處理、不再「全覽時交還頁面捲動」，往外縮也不會自動回到全覽（按「重設縮放」）。
  要恢復原本的限制設 `limit-zoom-to-data`；類別軸與對數軸一律限制。
  繪圖區的一次滾動現在會依序送出 X、左 Y、右 Y 各一個 `wheel-zoom` 事件（原本只有 X）。分面圖的 Y 只縮放游標所在的那一格。
- **重設縮放按鈕**：DualAxisComboChart、EnterpriseHeatmap 的「🔄 Reset」改為與其他圖表一致的「重設縮放」。（#25）
- **ParetoChart**：事件 `chartRendered` 改名為 `chart-rendered`；模板寫 `@chartRendered` 或 `@chart-rendered` 都接得到。（#24）
- **DualAxisComboChart / StatusScatterMap**：設定軸範圍後，滾輪縮放可以超出該範圍看到其餘資料；
  「重設縮放」回到設定的範圍。（#17、#18）

### 修正

- **DualAxisComboChart**：拖曳、平移、滾輪縮放更順。
  - 沒縮放就直接用中鍵平移時，原本每次移動都跑 750ms 動畫，畫面一路落後游標、放開後還在滑，也沒有「重設縮放」。
  - 動畫關閉時，折線、散點、參考線和座標軸改成立刻更新。原本會比長條慢一個 frame，拖曳時看起來在抖。
- **DualAxisComboChart**：類別軸（band）連續滾幾格放大時，游標底下的類別會被推出畫面 —— 現在一定留在游標底下。
- **GerberViewer**：`src` / `layers` 快速切換時，舊請求不再蓋掉新結果或誤報「所有圖層均載入失敗」；
  只改顏色不再重新抓檔，並保留目前的縮放。（#24）
- **ChptAutocomplete**：debounce 期間舊查詢的結果不再短暫顯示。（#26）
- **ChptTable**：已勾選列的內容更新後，`selection-actions` 插槽與 `selectedRows` 跟著更新（#25）；
  跨頁勾選的快取只保留需要的列（#20）。
- **ChptCheckbox**：宣告了 `click` 事件卻從未發出 —— 現在切換選項時會送出該選項。（#24）
- **ChptVirtualList**：資料變少時校正捲動位置，不會畫出空白；`itemHeight` 不是正數時退回 1px。（#26）
- **useOverlay**：焦點被移到浮層外時，正向 Tab 也會拉回浮層。（#26）
- **ChptModal**：window 模式拖曳或縮放到一半被卸載時，body 的游標（move）與 user-select: none 會留著，
  整頁游標卡住、文字選不起來 —— 卸載時一併還原。
- **正式入口**：補上漏匯出的 StatusScatterMap。（#21）
- **開發環境**：`facetShared.scss` 造成的 `Cannot read properties of undefined (reading 'scoped')`（#19）；
  qrcode-generator 的 504 Outdated Optimize Dep。

### 移除

- ChptExcelExporter `rawData`、EnterprisePareto `highlightMode` / `customRenderers` 與其型別（見上方破壞性變更）。
- 沒有路由連到、內容過時的文件頁：`/chpt-table-guide`、CommonTableDoc、DraggableModal、TagFilterDropdown、
  FilterBar、FilterDropdown、FilterSelect 示範頁。對應元件以現行文件頁為準。（#23、#25）

### 文件與工具

- `npm run check:doc-api`：文件 API 表列的 props / events / 插槽 / 方法必須是元件真的有的。（#23）
- `npm run check:docs` 會擋下沒有路由連到的孤兒文件頁。（#23）
- 對外 API 測試：子入口的元件與對外型別都必須能從正式入口取得。（#21、#22）
- 文件補齊：所有有 props / events 的公開元件都有 API 表（原本 18 個元件沒有任何表，例如 EnterprisePareto、
  GerberViewer、PcbLayout、ChptExcelExporter / Uploader）；`check:doc-api` 改為雙向，漏寫也會擋。

## 2026-09

組件庫重構至 `@/components/library` 後的第一輪整理（#2–#13）。重點：

- 全庫 TypeScript 化；legacy 元件收斂為轉發給 canonical `Chpt*` 的薄包裝（預定下一個主要版本移除）
- 深色模式真正生效：語意色接上 CSS 變數，遷移全庫寫死的淺色，並加 CI 檢查
- 新增 Form / FormItem、Upload、Tree、Popover、Autocomplete、Cascader、Transfer、Rate、ColorPicker、Calendar、
  Menu、TimePicker、TreeSelect、Image / ImageViewer、Anchor、BackTop、Notification、ConfigProvider 等元件
- ChptExcelEditor 對齊 Office Excel（數字格式、排序、合併、鍵盤操作），公式引擎改為語法樹、支援跨工作表
- 建置：宣告 `sideEffects`，初始載入 gzip 減少 389 kB；拆包與無障礙（axe）修正
