# 變更紀錄

組件庫的對外行為變更都記在這裡。複製元件到其他專案、或同步更新時，先看「⚠️ 破壞性變更」。

- 格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)：新增 / 變更 / 修正 / 移除
- 版本號尚未啟用（`package.json` 為 `0.0.0`），先依日期分段；開始對外發布時再補版本號
- 改到 props、events、slots、對外型別或可觀察行為的 PR，都要在「未發布」補一筆

## 未發布

### ⚠️ 破壞性變更

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

- **StatusScatterMap**：依 PASS / NEARFAIL / FAIL 著色的座標散佈圖，Canvas 繪製、可撐數萬點。（#16）
- **DualAxisComboChart**：10 萬筆資料渲染（Canvas + 降採樣）與滑鼠滾輪縮放（#14）；`highlightKey` 連動高亮與圖層 `keyFn`（#15）。
- **事件 payload 型別**：`ChartLayerEvent`、`ChartSelectionEvent`、`ChartAxisDomainEvent`、`ChartResizeEvent`、
  `ChartReadyEvent`、`GridFacetCell`；DualAxisComboChart、FacetedChart、GridFacetChart 的事件都有明確型別。（#24）
- **對外型別**：`ChartLayer`、`TooltipPayload`、`TableColumn`、`TableChangeEvent`、`PcbData`、`ComponentSize` 等
  統一從 `@/components/library` 以 `import type` 取得，不必再 import 元件內部檔案。（#22）
- **EnterpriseHeatmap**：`chart-rendered` 事件（見上）。（#26）
- **DualAxisComboChart**：長條圖的 `layer-click` 補上 `seriesKey`（與 `layer-hover` 同名；舊名 `series` 仍保留）。（#24）

### 變更

- **重設縮放按鈕**：DualAxisComboChart、EnterpriseHeatmap 的「🔄 Reset」改為與其他圖表一致的「重設縮放」。（#25）
- **ParetoChart**：事件 `chartRendered` 改名為 `chart-rendered`；模板寫 `@chartRendered` 或 `@chart-rendered` 都接得到。（#24）
- **DualAxisComboChart / StatusScatterMap**：設定軸範圍後，滾輪縮放可以超出該範圍看到其餘資料；
  「重設縮放」回到設定的範圍。（#17、#18）

### 修正

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

- 沒有路由連到、內容過時的文件頁：`/chpt-table-guide`、CommonTableDoc、DraggableModal、TagFilterDropdown、
  FilterBar、FilterDropdown、FilterSelect 示範頁。對應元件以現行文件頁為準。（#23、#25）

### 文件與工具

- `npm run check:doc-api`：文件 API 表列的 props / events / 插槽 / 方法必須是元件真的有的。（#23）
- `npm run check:docs` 會擋下沒有路由連到的孤兒文件頁。（#23）
- 對外 API 測試：子入口的元件與對外型別都必須能從正式入口取得。（#21、#22）

## 2026-09

組件庫重構至 `@/components/library` 後的第一輪整理（#2–#13）。重點：

- 全庫 TypeScript 化；legacy 元件收斂為轉發給 canonical `Chpt*` 的薄包裝（預定下一個主要版本移除）
- 深色模式真正生效：語意色接上 CSS 變數，遷移全庫寫死的淺色，並加 CI 檢查
- 新增 Form / FormItem、Upload、Tree、Popover、Autocomplete、Cascader、Transfer、Rate、ColorPicker、Calendar、
  Menu、TimePicker、TreeSelect、Image / ImageViewer、Anchor、BackTop、Notification、ConfigProvider 等元件
- ChptExcelEditor 對齊 Office Excel（數字格式、排序、合併、鍵盤操作），公式引擎改為語法樹、支援跨工作表
- 建置：宣告 `sideEffects`，初始載入 gzip 減少 389 kB；拆包與無障礙（axe）修正
