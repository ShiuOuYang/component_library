# 變更紀錄

組件庫的對外行為變更都記在這裡。複製元件到其他專案、或同步更新時，先看「⚠️ 破壞性變更」。

- 格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)：新增 / 變更 / 修正 / 移除
- 版本號尚未啟用（`package.json` 為 `0.0.0`），先依日期分段；開始對外發布時再補版本號
- 改到 props、events、slots、對外型別或可觀察行為的 PR，都要在「未發布」補一筆

## 未發布

### ⚠️ 破壞性變更

- **內建文字的 prop 預設值改為 `undefined`**（多語系）：原本寫死中文預設值的 prop —— 例如 ChptPopconfirm 的
  `message` / `confirmText` / `cancelText`、ChptTransfer 的 `titles` / `buttonTexts`、ChptUpload 的 `buttonText`、
  各圖表的 `emptyText`、GanttChart 的 `statuses`、StateTimeline 的 `states`、ParetoChart 的各種 label ——
  預設改為不傳，沒傳時取語系。**畫面上的繁中文字不變**；只有「讀 props 預設值」的程式會看到差異
  （例如測試裡斷言 `wrapper.props('confirmText') === '確定'`）。
- **`useConfirm()` 佇列項目**：`ConfirmRequest` 的 `confirmText` / `cancelText` 沒傳時是 `undefined`，
  由 ChptConfirmHost 依語系決定。只有自己實作 Host 的專案需要調整。

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

- **ChptRichTextEditor 富文字編輯器**（Tiptap）：v-model 是 HTML（清空時為空字串，`required` 規則照常運作）。
  工具列可自訂（粗體、斜體、底線、刪除線、H2 / H3、清單、引用、程式碼區塊、連結、復原 / 重做、清除格式），
  按鈕以 aria-pressed 表示目前格式、左右方向鍵在按鈕間移動；連結輸入框在工具列下方，只接受 http / https / mailto 與站內路徑。
  放在 ChptFormItem 裡時標籤、必填、錯誤以 aria 接到編輯區；`maxLength` 顯示字數、超過時標紅（不截斷）。
  新增 `isSafeUrl()`（`shared/safeUrl.ts`）與語系群組 `richText`。
- **ChptKanban 看板**：卡片是一個扁平陣列（v-model），`columnField` 記錄所在欄、同一欄的順序就是陣列順序。
  滑鼠拖曳換欄與排序（即時預覽、Escape 取消）；鍵盤空白鍵拿起 → 方向鍵移動 → 空白鍵放下，每一步以 aria-live 念出；Enter 開啟卡片。
  欄的 `limit` 是在製上限（超過時標紅；`enforceLimit` 時不能放進已滿的欄）；`canMove(card, from, to)` 自訂流程規則
  （不允許的欄顯示禁止、鍵盤移動時跳過）；`isLocked` 鎖住卡片。資料計算的純函式（`moveCard`、`groupCards`…）在
  `shared/kanban.ts` 並匯出。新增語系群組 `kanban`。
- **ChptDashboardGrid 儀表板格線**：可拖曳移動、調整大小的區塊版面（v-model）。被擋到的區塊往下推、放開後往上靠攏，
  `static` 區塊固定不動；鍵盤 Tab 到把手後方向鍵移動、Shift + 方向鍵調整大小，以 aria-live 念出結果；Escape 取消拖曳。
  寬度小於 `stackBelow` 時改成一欄；`persistKey` 把版面記在 localStorage。版面計算的純函式（`moveItem`、`compact`、`collides`、
  `findSpace`…）在 `shared/gridLayout.ts` 並匯出。新增語系群組 `dashboardGrid`。
- **ChptCommandPalette 指令面板**：按 Ctrl / ⌘ + K（`hotkey` 可換或關閉）打幾個字就跳到頁面或執行動作。
  模糊搜尋標籤、keywords（英文代號、拼音）、群組與說明；方向鍵選擇（跳過停用的）、Enter 執行、Esc 關閉，關閉後焦點歸還。
  指令給 `to`（有 vue-router 時切換頁面）或 `perform`；`recentKey` 記住最近使用的指令。
  搜尋與快捷鍵的純函式（`fuzzyMatch`、`scoreCommand`、`matchHotkey`、`formatHotkey`…）也一併匯出。新增語系群組 `commandPalette`。
  文件站本身加上了指令面板（側欄的每一頁、每個元件錨點都搜得到）。
- **多張圖同步 `useChartSync()`**：同一條時間軸的好幾張 DualAxisComboChart 上下排在一起時，`v-bind="sync.bind()"` 就能同步
  X 縮放（框選、滾輪、拖曳 X 軸）、十字線與高亮（同一個 key）。各圖自己的重設鈕收起來，改用整組的 `sync.reset()`；
  `sync.xDomain` / `crosshairValue` / `highlightKey` 可讀可寫（例如接外部的時間區間選擇器）。
- **DualAxisComboChart 十字線**：`crosshair` 開啟時滑鼠在繪圖區畫垂直十字線與 X 讀數，並送出 `crosshair-move`（X 值，類別軸為最近的類別）；
  `crosshairValue` 由外部指定位置（時間軸可給毫秒數）。
- **BulletChart 子彈圖**：一列一個指標 —— 區間底色、實際值細長條、目標直線、前期值淡色細線；區間格式與 GaugeChart 相同，
  有 label 時右側顯示狀態（圖示 + 文字）。共用 `bands` / `max` 讓多列刻度一致；每一列是 role="meter"；綁 `@item-click` 時每一列是按鈕。
- **YieldFunnel 良率漏斗**：依製程順序列出各站剩下的數量，兩站之間標出站良率與損失，標題列為直通率（RTY）；
  損失最多的站以紅字與「最大損失」標出。`align="center"` 為漏斗外觀；綁 `@step-click` 時每一站是按鈕。
  計算在 `charts/utils/bullet.ts`（`computeFunnel`）。新增語系群組 `bullet`、`funnel`。
- **WaferMap 晶圓圖／面板圖**：每筆資料是一顆晶粒的行列座標加上 bin 或量測值。bin 模式在標題列顯示良率、圖例顯示各 bin 顆數，
  點圖例淡化該 bin（`v-model:hidden-bins`）；給 `valueField` 是數值模式（預設 viridis 色階，可用 `valueColors` / `valueDomain` 自訂）。
  `rings` 分圈算分區良率（看邊緣良率損失）、`shape="panel"` 矩形面板、`notch` 定位缺口、`flipY`、`dieAspect`、固定 `grid` 讓多片並排大小一致。
  晶粒畫在 Canvas；方向鍵逐顆移動（跳過空格）、Enter 選取，目前晶粒以 aria-live 念出。事件 `die-click` / `die-hover`。
  純計算在 `charts/utils/waferMap.ts`。新增語系群組 `waferMap`。
- **ChptSchemaForm 依設定檔產生表單**：用 `fields` 陣列描述欄位（`type`：input / number / textarea / select / radio /
  checkbox / switch / date / time / section），產生整張表單；底下仍是 ChptForm + ChptFormItem，驗證與錯誤聚焦行為相同。
  `columns` + 欄位 `span` 排版（小螢幕一欄）、`visible(model)` 條件顯示（隱藏的欄位不驗證，`clearHidden` 時清掉值）、
  `options(model)` 依資料決定選項（線別 → 機台）、`disabled(model)`、`defaultValue`（model 缺少的欄位自動補上，巢狀路徑自動建立）；
  特殊欄位用 `#field-{prop}` 插槽或 `component` 自訂。新增語系群組 `schemaForm`（submit / reset）。
- **ChptFormList 動態列**：一筆單據裡有好幾列要輸入（多筆量測值、多個料號）時使用。綁定陣列（v-model），
  每一列的內容由插槽決定；`path('value')` 給出這一列的欄位路徑（`measures.0.value`）。`min` / `max` 限制列數、
  `sortable` 上下移動、新增後聚焦到新的一列、新增 / 刪除以 aria-live 念出；每列 key 穩定（刪除中間一列不會讓下面的輸入框「換人」）
- **ChptFormItem 萬用字元規則**：ChptForm 的 rules 找不到完全相同的路徑時，會把數字索引換成 `*` 再找
  （`'measures.*.value'` 套用到每一列）

- **ChptTable 欄位設定與記憶**：`columnSettings` 在右上角加「欄位」按鈕，使用者勾選要顯示的欄位
  （多層表頭標上群組名稱；至少留一欄；群組底下全部隱藏時群組表頭也拿掉）；`v-model:hidden-columns`。
  `persistKey` 把隱藏的欄位與拖曳過的欄寬記在 localStorage，重新整理後還在（讀寫失敗時不影響表格）；
  ref 方法 `resetColumnSettings()`

- **ChptTable 樹狀資料**：`tree` 開啟後，`childrenKey`（預設 children）裡的子列縮排顯示在父列下方，第一欄有展開 / 收合鈕
  （`aria-expanded`、列帶 `aria-level`）。
  - 排序在同一層的兄弟之間進行，不打亂父子關係；搜尋保留符合的列與它的上層並自動展開（清除後恢復原本的展開狀態）
  - 分頁以最上層計算，子列跟著父列；搭配虛擬捲動、勾選（全選本頁含展開的子列）、固定欄可用
  - `v-model:tree-expanded-keys`、`defaultExpandAll`、`treeIndent`；ref 方法 `expandAllTree()`、`collapseAllTree()`

- **ChptTable 固定欄與合計列**
  - 欄位 `fixed: 'start' | 'end'`（也接受 left / right / true）：橫向捲動時固定在左 / 右側，勾選欄、展開欄跟著固定在最左；
    設在最上層欄位（含群組），左固定自動排到最前、右固定排到最後；依實際欄寬計算位置（不必給 width）；
    固定格的底色跟著斑馬紋、hover、勾選、警告列與欄位顏色；捲動時固定區邊緣有陰影
  - 欄位 `summary`（sum / avg / min / max / count 或 `(values, rows) => 值`）與 `summaryFormat`：表格底部出現合計列；
    預設對篩選後的全部資料計算（`summaryScope: 'page'` 只算這一頁）；`summaryLabel`、`#summary-cell` 插槽；
    虛擬捲動時合計列固定在底部

- **ChptDatePicker 快捷選項**：`presets` 在日曆旁加一排快捷按鈕（今天、昨天、本週、近 7 天、本月、上月；
  另有上週、近 30 天、本季、今年，以及班別的「本班 / 上一班」）。也可自訂 `{ label, value }`。
  - 區間在點下去那一刻才計算；以日為單位的區間含結束當天（到 23:59:59.999）
  - `shifts` 設定班別，夜班跨午夜正確（凌晨的「本班」是前一天開始的晚班）；`weekStart` 設定一週起始日（預設週一）
  - 純函式 `resolveDatePreset`、`resolvePresetValue`、`shiftRange` 也從正式入口匯出

- **ChptScanInput 條碼掃描輸入**：產線掃描站用，掃描槍掃一下就送出、清空、繼續掃下一個。
  - 以按鍵速度分辨掃描槍與手打（`scanSpeed`，容許前綴碼後的一次停頓）；`allowManual: false` 只接受掃描槍
  - 重複條碼 `duplicate`（allow / warn / reject）與 `duplicateWindow`；`pattern`、`validator`、`minLength`、`trim`、`transform`
  - `captureGlobal`：焦點不在任何輸入框時也接收掃描槍（只攔掃描槍速度的按鍵）；`keepFocus` 點到空白處自動聚焦回來
  - 偵測中文輸入法組字並提示切換（`ime-detected`）—— 掃描站「掃不進去」最常見的原因
  - 回饋：狀態文字（成功 polite、錯誤 alert）、`sound` 嗶聲、`vibrate` 震動、`showHistory` 掃描紀錄；
    ref `submit(value)` 供相機掃碼、RFID 走同樣的驗證
  - 判斷邏輯在 `shared/scanDetector.ts`（純函式）

- **ChptTable 虛擬捲動**：`virtual` 開啟後不分頁，表身固定高度（`height`）上下捲，只畫看得到的列，
  5 萬筆也能順暢捲動。每列固定 `rowHeight`（預設 32px）以便直接算出捲動位置；展開的明細列高度自動量測。
  - 排序、搜尋（回到最上面）、勾選（全選是全部資料）、展開、多層表頭、拖曳欄寬照常可用；表頭固定在頂端
  - 斑馬紋依絕對列序，捲動時不閃動；`aria-rowcount` / `aria-rowindex` 讓螢幕閱讀器讀到實際位置
  - `remote` 時監聽 `reach-bottom` 做無限捲動；ref 方法 `scrollToIndex(i)`、`scrollToKey(key)`
  - 新 props：`virtual`、`height`、`rowHeight`、`overscan`、`reachBottomThreshold`

- **ChptChartFrame 圖表外框與匯出**：任何一張圖放進外框，就有一致的標題 / 說明、載入中（半透明遮罩，舊的圖留在底下）、
  沒有資料、錯誤（附重試）。原本 17 張圖只有 1 張有載入狀態，空資料的處理也各自不同。
  - 匯出 PNG / SVG / CSV：圖片是「看到什麼畫什麼」—— 圖表 SVG 連同計算後的樣式、Canvas 圖層（大量資料模式）、
    HTML 圖例與標題都會畫進去；SVG 是純 SVG（不用 foreignObject），PowerPoint、Illustrator 打得開；深色模式匯出深底
  - CSV 帶 BOM（Excel 不會亂碼），以 `= + - @` 開頭的文字加上單引號，避免被試算表當成公式執行
  - `autoDownload: false` 時只送 `export` 事件（可上傳到伺服器）；ref 方法 `exportAs(format)`、`download(format)`
  - 匯出工具也可單獨使用：`exportChart`、`elementToSvg`、`svgToPng`、`toCsv`、`csvBlob`、`downloadBlob`；
    不想出現在匯出圖片裡的元素加上 `data-export-ignore`（各圖表的重設縮放鈕已加上）

- **ChptKpiCard KPI 卡片**：數字、與前期比較、趨勢線、是否達標，一個元件做完（組合 ChptStatistic 與 SparklineChart）。
  - `previous` 自動算出變化（`deltaMode`：相對 % 或差值）；前期為 0 時不顯示百分比
  - `target` / `thresholds`（[接近, 達標]）判定達標 / 接近 / 未達標：左側色條、圖示與文字一起表示，目標畫成趨勢線上的參考線；
    `higherIsBetter: false` 時門檻與好壞都反過來（不良率下降是綠色）
  - `clickable` 時整張卡片可點、鍵盤可操作（延伸點擊區，`actions` 插槽的按鈕不會變成巢狀按鈕）；`loading`、`size`

- **多語系涵蓋整個組件庫**：`ChptConfigProvider :locale="enUS"` 現在會切換所有元件的內建文字 ——
  ui 元件、圖表（螢幕閱讀器摘要、tooltip、即時播報）、PCB / Gerber 檢視器、Excel 編輯 / 匯入 / 匯出。
  原本只有分頁、空狀態、表格等十幾個字串有接語系，其餘 600 多處寫死中文。
  - 語系檔搬到 `shared/locale.ts`，`ChptLocale` 依元件分群；帶參數的句子寫成函式，語序交給各語系
  - `locale` 可巢狀部分覆寫（`{ modal: { close: '關閉視窗' } }`），群組逐層合併
  - 新增 `useLocale()`、`mergeLocale()`、型別 `ChptLocaleInput`、`ValidationMessages`
  - 純函式加上可選的語系參數（不傳為繁中）：`checkRule` / `validateValue`（`messages`）、`formatDuration`、
    `timeTiers`、`layerLabel` 等；分面圖的數字與日期格式改用語系代碼，不再寫死 `zh-TW`

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

- **ChptFixedTable**：搜尋框寫死英文「Search...」，改為依語系。

- **ChptDatePicker 日曆語系**：原本沒有把語系傳給底層的 vue-datepicker，月份、星期、「Select / Cancel」一直是英文；
  現在跟著 ChptConfigProvider（繁中為「週一…週日」「取消 / 確定」）。

- **StatusScatterMap**：繪圖區還沒有尺寸時（容器剛掛載、尚未排版，例如放進外框或分頁），
  `createImageData(0, h)` 丟出 IndexSizeError。現在沒有尺寸時跳過繪製，等尺寸量到再畫。

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

- 文件站外殼：`GlobalNotifications.vue` 與 `composables/useApi.js`（全域 API 狀態）。唯一會改變那份狀態的 `useApiCall()` 從來沒有人呼叫，
  通知元件永遠不會出現；`httpStatus.js` 只被它用到的四個分類函式一併移除。
- `useAuth()` 的 `getAvatarUrl()` 與沒有人用的 `useUser()`：預設頭像會把使用者名稱送到第三方網站（ui-avatars.com）。
- 沒有程式使用的相依套件：`lodash`、`plotly.js-dist-min`。
- 文件站不再載入 FontAwesome：全站只有全域通知用到 4 個圖示，改用組件庫統一的 Material Symbols（入口 CSS 少約 100 KB，另有字型檔）。
- ChptExcelExporter `rawData`、EnterprisePareto `highlightMode` / `customRenderers` 與其型別（見上方破壞性變更）。
- 沒有路由連到、內容過時的文件頁：`/chpt-table-guide`、CommonTableDoc、DraggableModal、TagFilterDropdown、
  FilterBar、FilterDropdown、FilterSelect 示範頁。對應元件以現行文件頁為準。（#23、#25）

### 文件與工具

- 文件站外殼不再於啟動時初始化認證：原本 `App.vue` 呼叫 `useAuth()`，每次打開文件站都載入使用者 store 與 axios，
  瀏覽器存著舊 token 時還會打一次後端驗證。需要登入的頁面由路由守衛延遲初始化（行為不變）。
- 移除外殼程式（App、路由守衛、使用者 store、API 攔截器）的除錯用 `console.log`，以及把使用者資料與權限印到 console 的警告；
  錯誤仍以 `console.error` / `console.warn` 記錄。
- **DualAxisComboChart 拆分**（行為不變）：原本 3,340 行的單一檔案拆成元件本身（props、狀態、生命週期、主渲染循環，約 790 行）
  與 `charts/composables/dualAxis/` 下的模組 —— `useBrushZoom`（框選、重設）、`useAxisDrag`（拖曳座標軸）、
  `useWheelZoom`（滾輪縮放、中鍵平移）、`useLargeData`（Canvas 與命中測試）、`useHighlight`（連動高亮）、
  `useCrosshair`（十字線）、`useTooltip`、`useLayerRenderers`（長條、堆疊、折線、散點、參考線）、
  `useFrameRenderers`（網格、座標軸、標題、圖例），共用狀態由 `context.ts` 的 `DualAxisContext` 傳入。
  程式本體逐段搬移、沒有改寫；文件站 21 張圖的截圖與 18 個互動情境（hover、滾輪縮放、中鍵平移、框選、拖曳軸、重設）
  拆分前後逐位元組相同。新增對外型別 `DualAxisComboChartProps`。
- 內部整理（行為不變）：localStorage 的安全讀寫收斂到 `shared/safeStorage.ts`（ChptTable、ChptCommandPalette、
  ChptDashboardGrid、useDarkMode 原本各寫一份 try/catch）；四張圖表各自的滾輪修飾鍵判斷收斂為 `wheelModifierPressed()`。
- 文件站在 DocLayout 掛一份全域 ChptToast（原本各頁自己掛，同一則提示可能出現兩次）；文件示範的事件回饋從 `console.log` 改為 toast。
- 組件庫、文件頁與測試的 lint 警告清零（ChptButton 的 `class` 預設值、ChptCodeBlock `tip` 的 v-html 加上說明）。
- `npm run check:i18n`：用 Vue 與 TypeScript 的 AST 掃描組件庫裡寫死的中文介面文字（含 template 運算式），
  已加入 `verify` 與 CI。確定是資料（例如 Excel 自動填滿要辨識的「星期一」）時以 `i18n-ignore` 註解標註。
- 測試：zhTW / enUS 的欄位與函式參數必須一致、enUS 不得含中文、切換 enUS 後元件文字正確。

- `npm run check:boundary`：組件庫內部不再允許任何 `@/` 別名（含 `@/components/library` 與 `@/design`），一律用相對路徑 ——
  組件庫要打包給其他 repo 安裝，別名在使用端會解析失敗。應用程式端照樣用 `@/components/library`。（#44）
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
