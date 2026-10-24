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
