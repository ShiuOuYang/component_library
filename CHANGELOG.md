# 變更紀錄

組件庫的對外行為變更都記在這裡。複製元件到其他專案、或同步更新時，先看「⚠️ 破壞性變更」。

- 格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)：新增 / 變更 / 修正 / 移除
- 版本號尚未啟用（`package.json` 為 `0.0.0`），先依日期分段；開始對外發布時再補版本號
- 改到 props、events、slots、對外型別或可觀察行為的 PR，都要在「未發布」補一筆

## 未發布

### ⚠️ 破壞性變更

- **移除舊的非 Chpt 元件與 `@/components/common` 入口**：`CodeBlock`、`CommonTable`、`CommonTooltip`、`DraggableModal`、
  `FilterBar`、`FilterDropdown`、`FilterSelect`、`TagFilterDropdown`、`HeaderLogoutButton`、`ModalDock`、`PageSwitcher`、
  `Pagination`、`PaginationControls`、`SimpleDarkModeToggle`、`TabNavigation`，別名 `FixedTable`、`ExcelEditor`、
  `ExcelExporter`、`ExcelUploader`，以及 `@/components/common`（相容 facade）。它們原本都只是轉發給 Chpt 元件的薄包裝、
  開發模式下會印棄用警告。改用對應的 Chpt 元件即可，對照表見 README 的「舊元件遷移對照表」；
  `npm run check:legacy` 隨之移除（`verify` 與 CI 不再執行）。`warnDeprecated()` 保留，供之後的棄用使用。
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

- **GageRRChart 量測系統分析圖**（charts）：量具的量測變異夠不夠小（Gage R&R，交叉設計、ANOVA 法）。二因子 ANOVA 拆出重複性、再現性（作業員與作業員 × 零件交互作用）與零件間變異，
  交互作用不顯著（`interactionAlpha`）時併入誤差重算；% 貢獻度、% 研究變異（`multiplier` 6 / 5.15）、% 公差（`tolerance`）、ndc，依 %GRR（< 10% / 10～30% / > 30%）判定。
  一次畫出六張標準圖（變異成分、依作業員的 R 圖與 X̄ 圖、依零件、依作業員盒鬚圖、交互作用圖，`panels` 可挑選），滑過同一零件跨圖高亮、作業員圖例可標示；
  附變異成分表與 ANOVA 表，依零件圖可用鍵盤 ←→ 逐一念出；資料不完整時顯示原因。工具函式 `analyzeGage`（數值已與 statsmodels / scipy 對照）。
- **ChptMaskedInput 格式化輸入**（ui）：序號、MAC、IP、電話、料號、日期碼這類固定格式。格式字串 `#` 數字、`A` 字母、`X` 英數、`H` 十六進位、`*` 任意，
  後面加 `?` 可省略（IP 每段 1～3 位數）、`\` 跳脫，也可用 `tokens` 自訂；分隔符號自動補上（自己打也接受）、不合格式的字元擋掉並提示（`reject`、螢幕閱讀器念出可輸入什麼），
  貼上時清掉多餘符號，Backspace / Delete 跳過分隔符號、游標位置正確；聚焦時以底線顯示還沒填的位置。`mask` 給陣列依長度自動選（市話 / 手機），
  `unmask` 只存填入字元，`uppercase`、`validate`（例如 `validIPv4`）、`complete` / `enter`（掃描槍）事件，可放進 ChptFormItem。
  常用格式 `MASK_PRESETS`（ipv4、mac、date、time、twMobile、twId）與工具函式 `formatMask`。
- **BumpChart 排名變化圖**（charts）：排名怎麼隨時間變（各線每月良率、供應商評分、各站停機時間）。每期依數值排名（`order` 大的或小的排前面，同分同名次）或直接給名次
  （`valueType="rank"`），名次 1 在最上、點裡寫名次，兩端標籤與首末期變化（▲ 進步 / ▼ 退步，名次相同時標籤錯開）；`display` 切換名次 / 實際值（實際值時標籤自動避讓）、
  `curve` 曲線 / 直線、缺期斷開。滑過或點選高亮一條（`v-model:selected`，高亮的疊在最上面但不改 DOM 順序，鍵盤焦點不會掉）、tooltip；
  鍵盤 ↑↓ 換序列、←→ 換期念出名次；期數多時變寬並左右捲動；隱藏名次表。工具函式 `bumpRows`、`rankPeriod`。
- **UpSetChart 集合交集圖**（charts）：哪些缺陷 / 警報 / 不良原因常一起出現（三個以上集合時取代文氏圖）。上方長條是每種組合的數量、下方矩陣的實心點與連線表示包含哪些集合、
  左側是各集合總數。資料可用 `items`（每個項目屬於哪些集合）或 `sets`（每個集合有哪些項目）；`mode` exclusive（剛好是這幾個，加總等於總數）/ inclusive（至少有這幾個）；
  `sort` 依數量 / 組合大小 / 集合順序，`minCount`、`minDegree` / `maxDegree`、`limit`、`includeEmpty` 篩選並標示略過數。滑過欄看數量與比例、滑過集合標出包含它的組合；
  點欄選取（`v-model:selected`、`combo-click` 附項目）；鍵盤 ←→ 移動、Enter 選取；窄畫面左右捲動；隱藏資料表。工具函式 `buildUpset`、`upsetCombos`。
- **ChptCommentThread 留言串**（ui）：異常處理紀錄、審查意見、工單討論。留言與回覆（兩層）、用 ChptMentionInput @ 提及、編輯（標示已編輯）、
  刪除（兩步確認；有回覆的留下「已刪除」佔位）、最上層可標記已解決（整串收起、可展開 / 重新開啟）、全部 / 未解決篩選、相對時間（每分鐘更新，滑過看完整時間）、
  附件標籤、頭像。只能改自己的留言（`moderator` 可改所有人的）、`readonly`。`create` / `edit` 事件附提及清單方便通知。資料函式 `addComment`、`updateComment`、
  `removeComment`、`countComments`。
- **HorizonChart 地平線圖**（charts）：幾十條時間序列放在同一張圖比較（各溫區、熱電偶、機台）。每條只佔一列，數值減掉基準線（`baseline`：0、`'mean'`
  或各序列的設定值）後，高於 / 低於基準各一種顏色、切成 `bands` 層摺疊，越深偏離越多；`scale` 每列各自比例或共用比例，`sort` 依最大偏離 / 平均 / 最新值 / 名稱。
  滑過時十字線對齊所有列、右側列出該時間的值與 tooltip（偏離量與基準），可用 `useChartSync` 跟 DualAxisComboChart 等同步十字線（`crosshairValue` / `crosshair-move`、`xDomain`）；
  缺值斷開；鍵盤 ←→ 移動時間、↑↓ 換列；隱藏統計表。工具函式 `horizonRows`、`sortHorizonRows`。
- **ChptMentionInput 提及輸入**（ui）：交接紀錄、異常回報、留言裡 @人員、#工單。輸入觸發字元後列出候選（`triggers` 各自給固定 `options` 或非同步 `search`，
  有防抖、丟掉過期結果），↑↓ 選擇、Enter / Tab 確定、Esc 關閉；提及以底色標籤顯示，刪除時整個移除、在名字中間打字變回一般文字；
  觸發字元前要是開頭、空白或標點（email 不會跳出）。v-model 為帶標記的字串 `@[名稱](id)`，`change` / `submit`（Ctrl / ⌘ + Enter）附純文字與提及清單，
  `mention-add` / `mention-remove`；字數上限與計數、自動長高、輸入法組字中不打斷。工具函式 `parseMentions`、`mentionMarkup`、`filterMentionOptions`。
- **ChptSortableList 拖曳排序清單**（ui）：製程步驟順序、點檢項目、選單設定、工單排程。拖曳把手排序（指標事件實作，觸控也能拖；`:handle="false"` 整列可拖），
  拖曳中有幽靈與放置指示線、Esc 取消；`maxDepth` > 1 時可巢狀（拖曳時往右成為上一項的子項、往左回上一層），有子項的可收合；
  同一個 `group` 的清單互相拖曳（`add` / `remove`、`put`）；`locked` 固定、`leaf` 不收子項、`canDrop` 自訂規則。鍵盤空白鍵拿起、方向鍵移動（←→ 調整層級）、
  空白鍵放下、Esc 取消，移動時以 aria-live 念出位置。樹狀工具函式 `sortMoveItem`、`sortFlattenTree`、`sortFindItem`。
- **ChptImageCropper 圖片裁切**（ui）：大頭照、缺陷照片、銘牌照片上傳前先裁好。拖曳框移動、拉 8 個把手調整大小、框外拖曳重畫；
  固定比例（`aspect` / 工具列 `aspectOptions`）、轉 90°（框跟著內容轉）、水平 / 垂直翻轉、滾輪與雙指縮放、中鍵平移；圓形遮罩（`shape="circle"`）、
  三分線、即時預覽。經 ref 取得 `getCanvas` / `getBlob` / `getDataURL`（指定 width / height / maxWidth、PNG / JPEG / WebP、底色）。
  鍵盤方向鍵移動、+ / − 調整大小；`v-model` 為轉過後的圖片像素座標。共用幾何函式 `cropResizeRect`、`cropRotateRect`、`cropOutputSize`。
- **RidgelineChart 山脊圖**（charts）：比較很多組的分佈形狀（各機台 / 各班 / 各批的量測值、每天的週期時間）。每組一條核密度曲線
  （頻寬 Silverman / Scott 或指定）、上下錯開部分重疊（`overlap`），曲線內畫中位數與 Q1 / Q3；`normalize` 選各自同高（比形狀）或共用比例
  （比集中程度）；`sort` 依中位數 / 平均 / 標準差 / 名稱。給 `spec`（LSL / USL / 目標）時畫規格線並在右側標出每組規格外比例。
  滑過 tooltip（n、平均 ± 標準差、中位數、Q1–Q3、範圍、規格外）、鍵盤 ↑↓ 移動、隱藏統計表。工具函式 `ridgelineGroups`、`sortRidgelineGroups`。
- **DumbbellChart 啞鈴圖 / 斜率圖**（charts）：每個項目「前 vs 後」—— 改善前後的不良率、上月與本月、目標與實際。空心點 = 前、實心點 = 後，
  依 `direction`（越大越好 / 越小越好 / 不判斷）以綠 ▲ / 紅 ▼ 標示變好或變差（`tolerance` 內算持平），圖例列出改善 / 變差 / 持平數量；
  右側變化欄（數值或百分比）、`sort` 依改善量 / 幅度 / 前值 / 後值 / 名稱排序、參考線、缺值只畫有的那一點。`mode="slope"` 改成斜率圖，
  兩側名稱自動避讓。滑過 tooltip、鍵盤 ↑↓ 移動、隱藏資料表；放不下的數值自動隱藏。工具函式 `dumbbellRows`、`sortDumbbellRows`、`dumbbellSummary`。
- **NetworkGraph 關係圖**（charts）：設備相依、警報關聯、物料共用這類「誰跟誰有關係」的資料。力導向版面（初始位置固定，同樣資料每次排出來一樣；
  資料小改時保留位置只微調）、節點大小 = 數值或連線數、線寬 = 權重、同群組同色並聚在一起；`directed` 畫箭頭。滑過 / 點選高亮相鄰節點，
  點選後 Shift + 點另一個節點顯示最短路徑（`path` 事件）；拖曳節點會釘住（雙擊放開）、拖曳空白處平移、Ctrl + 滾輪與按鈕縮放、全覽；
  點圖例隱藏群組；節點超過 `canvasThreshold` 改用 Canvas。鍵盤依連線數順序移動、Enter 選取；`v-model:selected`、`dropped-links` 回報略過的連線，
  expose `fit`、`zoomBy`、`showPath`、`relayout`、`graph`、`view`；工具函式 `buildNetwork`、`networkShortestPath`。
- **ChptScheduler 週 / 日行事曆**（ui）：設備預約、會議室、保養排程。週檢視 7 天、日檢視可依資源（`resources`）分欄；時間重疊的事件自動並排，
  跨午夜的事件兩天各畫一段。空白處拖曳建立（emit `create`，由使用端決定是否新增）、拖曳事件移動（可換天 / 換資源）、拉下緣調整長度，
  都吸附到 `snapMinutes`；同一資源時間重疊標 ⚠、`locked` 事件不能動。現在時間紅線、點週檢視日期跳到日檢視；鍵盤方向鍵移動、
  Shift + 上下調整長度、Delete 送出 `delete`。`v-model:events` / `v-model:view` / `v-model:date`，expose `scrollToHour`、`goTo`、`conflicts`；
  共用排版函式 `schedLayoutColumn`、`schedConflictsOf`、`schedWeekDays`。
- **ChptCronInput 排程設定**（ui）：不用手寫 cron 也能設排程。選「每 N 分鐘 / 每小時 / 每天 / 每週 / 每月」再點選時間，或直接改 5 欄 cron 表達式，
  兩邊同步（簡易設定表達不了的切到「自訂」）；顯示可讀說明與接下來幾次執行時間（`showNext`），表達式錯誤時指出哪一欄。
  支援範圍、清單、間隔、月份與星期名稱，日與週同時限制時其一符合。另匯出 `parseCron`、`cronNextRuns`、`describeCron`、`isCronError` 與型別。
- **ChptJsonViewer JSON 檢視器**（ui）：看 API 回應、設定檔、記錄內容。樹狀展開 / 收合（`expandDepth`）、依型別上色；搜尋鍵或值並展開到符合的位置
  （上一個 / 下一個）；複製值、路徑（`rootName` → `response.data.items[3].name`）或全部；長陣列分段顯示（`pageSize`）、長字串截斷（`maxStringLength`）。
  給 `compare` 時標出新增、刪除、變更。鍵盤：↑↓ 移動、← → 收合 / 展開、C 複製值。另匯出 `diffJson`、`searchJson`、`jsonPathString`、`jsonType` 與型別。
- **ChptQueryBuilder 條件建構器**（ui）：讓使用者自己組查詢條件。AND / OR 群組可巢狀（`maxDepth`）、可整組取反（`allowNot`）；
  欄位依型別（text / number / date / select / boolean）給對應的運算子與輸入（介於、屬於可複選、是空的）。條目可拖曳排序或拖到別的群組；
  下方顯示可讀的條件文字；`validate()` 標出沒填完整的條件。`v-model` 是條件 JSON。另匯出 `evaluateQuery`（前端篩選）、
  `validateQuery`、`describeQuery`、`createQueryRule`、`createQueryGroup`、`queryOperatorsFor` 與型別 `QbField`、`QbGroup`、`QbRule` 等。

- **ChptBomTree BOM 結構**（ui）：多階 BOM 的樹狀表格（treegrid）。用量逐階連乘成每台用量，乘上生產數量（`v-model:buildQty`）就是需求；
  給了庫存（`stock`）就算缺料，`netting` 時先扣半成品庫存、同料號多處使用時共用庫存，關鍵料標示並統計。搜尋料號 / 品名 / 位置號會展開
  到那一層並列出用在哪裡（where-used）；給舊版次（`compare`）就標出新增、刪除、用量變更。只看缺料、全部展開 / 收合、鍵盤操作、匯出 CSV。
  另匯出 `explodeBom`、`bomWhereUsed`、`diffBom`、`flattenBom` 與型別 `BomItem` 等。
- **ChptAqlSampling 抽樣檢驗**（ui）：依 ANSI/ASQ Z1.4（ISO 2859-1）單次抽樣、正常檢驗。輸入批量與檢驗水準，各缺點等級（`classes`）依 AQL
  查出樣本代字、樣本數、Ac / Re（表 II-A 的箭頭依標準換方案；樣本數 ≥ 批量時全檢）。邊檢驗邊記錄已檢數與不良數，達 Re 立刻判定拒收、
  檢完且 ≤ Ac 允收（`verdict` 事件）；依最近各批結果（`history`）提示轉換（加嚴、減量、停止）。`v-model` 保存整筆紀錄。
  另匯出 `aqlCodeLetter`、`aqlNormalPlan`、`aqlVerdict`、`aqlSwitchingAdvice`、`AQL_LEVELS`、`AQL_VALUES` 與型別 `AqlPlan` 等。
  加嚴與減量的方案表未內建。
- **ChptSkillMatrix 技能矩陣**（ui）：作業員 × 工站 / 技能的多能工管理。等級 0–4（ILUO）用圓餅圖示；等級 ≥ `qualifyLevel` 且證照未過期算合格。
  最下列每個技能的合格人數，低於 `required` 標紅；最右欄每人合格的技能數；證照快到期（`warnDays`）與已過期標示。
  篩選班別、搜尋人員；點格子循環等級（或選定等級後點）、鍵盤方向鍵移動與數字鍵 0–4 設定。`v-model:matrix` 與 `change` 事件。
  另匯出 `skillCoverage`、`skillMatrixSummary`、`setSkillLevel`、`isSkillQualified` 與型別 `SkillDef`、`SkillPerson`、`SkillMatrixData` 等。
- **ChptHourlyBoard 逐時產出看板**（ui）：產線的 hour-by-hour board。每個時段：計畫、實際（可填）、差異、累計差異、達成率；
  落後的已過時段要選原因（`reasons`），沒填的會標出來。上方摘要：目前應做（目前時段依時間比例）、實際、差異、達成率、班別預估。
  目前時段高亮、未來時段淡化；`now` 不給時用電腦時間。電視模式、匯出 CSV、跨午夜的班別。`v-model:slots` 與 `change` 事件。
  另匯出 `buildHourlySlots`（依班別、休息、產能產生時段）、`hourlySummary` 與型別 `HourlySlot` 等。
- **SunburstChart 旭日圖**（charts）：一次看好幾層的佔比（不良類別 → 原因 → 站別）。資料格式與 TreemapChart 相同；`levels` 圈數，
  點弧往下鑽、點中央或麵包屑回上層（`v-model:path`），最外圈送出 `node-click`。滑過時標出路徑、提示佔全部與佔上一層的比例；
  最內圈類別色、外圈沿用並漸淡；放得下的弧沿半徑放文字。鍵盤：← → 同一圈、↑ 往外、↓ 往內、Enter 往下、Esc 回上層。
  另匯出 `layoutSunburst` 與型別 `SunburstArc`。文件：新頁面「旭日圖」。
- **ProbabilityPlot 機率圖**（charts）：算 Cpk 前先確認分配。常態 / 對數常態 / Weibull（`v-model:distribution`），中位秩繪圖位置、
  配適線與 95% 信賴帶（帶外的點標紅），Anderson-Darling 檢定的 p 值與判定（`alpha`），算法與 Minitab 預設相同。`series` 可多組比較；
  統計表列出 N、平均 / 標準差（Weibull 為形狀 / 尺度）、AD、p 值。另匯出 `fitProbability`、`probabilityQuantile`、`normCdf`、`normInv`、
  `andersonDarling` 與型別 `ProbabilityFit` 等。文件：新頁面「機率圖（常態檢定）」。
- **LineBalanceChart 線平衡圖**（charts）：山積圖（Yamazumi）。每站一根堆疊長條（作業元素依 `kinds` 分類上色），疊上節拍線（`takt`），
  超過的站標紅；摘要顯示瓶頸、平衡率、總工時、理論最少人數。多人站週期 = 工時 ÷ 人數。`draggable` 時可把作業元素拖到別站
  （即時重新堆疊，鍵盤也能拿起 / 換站 / 放下），送出 `v-model:elements` 與 `move`。另匯出 `lineBalanceLoads`、`lineBalanceSummary`、
  `moveLineBalanceElement` 與型別 `LbStation`、`LbElement` 等。文件：新頁面「線平衡圖」。

- **ChptStorageMap 儲位圖**（ui）：倉庫 / 線邊倉的儲位配置與庫存。區 → 料架 → 層 → 格（缺的格位留空），依使用率、料號或效期上色（`v-model:mode`）；
  搜尋料號 / 品名 / 批號 / 儲位標出位置（`locate()` 可接掃描）。點儲位看明細；拖曳庫存或整格、或按「移動」再點目的儲位即可移庫
  （檢查停用與容量，`allowOverCapacity`），送出 `move` / `move-reject`。快到期（`warnDays`）與已過期標示；方向鍵在料架內移動。
  另匯出 `buildStorageLayout`、`searchStorageBins`、`checkStorageMove`、`moveStorageStocks`、`storageExpiryStatus` 與型別 `StorageBin`、`StorageStock` 等。
- **ChptFeederMap 上料防錯**（ui）：SMT / 插件線上料、換料防錯。掃站位（或點選）→ 掃料盤，跟 BOM 比對料號（含 `alternates` 代用料）：
  正確就上料並嗶一聲；錯料時紅色警示 + 警報音，必須確認才能繼續（`mismatch` 事件）。同一盤不能同時裝在兩個站位。
  站位圖依 `group` 分區，顯示料盤、剩餘數量（`lowQty` 低料、0 用完）、估計還能生產幾片（`perBoard`），可只看需要處理的。
  `v-model:loads`、`v-model:log`（含錯料）、匯出 CSV；`parseReel` 自訂料盤條碼格式。另匯出 `parseReelCode`、`feederSummary` 與型別 `FeederSlot` 等。
- **ChptWorkInstruction 作業指導書**（ui）：現場一步一步照著做（換線、保養、首件檢驗）。每一步有圖片（`marks` 編號標記）、說明、
  注意事項與規格；要勾選確認（`check.kind: 'confirm'`）或輸入量測值（`'measure'`，超出 `lsl` / `usl` 不能下一步）才能前進，
  `minSeconds` 要求至少停留幾秒。完成的步驟可以回去看、未完成的不能跳過；平板左右滑動、鍵盤 ← → 切換。
  `v-model:record` 保存每一步的時間與量測值（中斷後接著做），完成時送出 `complete(summary)`。另匯出
  `workInstructionBlockers`、`summarizeWorkInstruction`、`inSpec` 與型別 `WiStep` 等。
- **ChptAndonBoard 安東看板**：產線大螢幕的呼叫看板（維修、缺料、品質、主管，`types` 可自訂）。每站一張卡片：正常為綠；呼叫中依等待時間由藍轉黃轉紅
  （紅色閃動，`prefers-reduced-motion` 時不閃）；有人處理且未超時時為中性灰。未回應依「等了多久」、處理中依「處理了多久」升級（`thresholds`，分鐘）。
  呼叫、回應、完成都在卡片上操作（v-model 是呼叫清單；`raise` / `respond` / `resolve` 事件；同一站同一原因進行中時不重複）。
  `tv` 電視模式字更大、全螢幕按鈕、`activeFirst` 有呼叫的站排前面；新呼叫與「轉紅」以 aria-live 念出，`sound` 時響（可靜音）。
  新增 `shared/andon.ts` 與語系群組 `andon`。
- **CorrelationMatrix 相關矩陣**（charts）：找出哪些參數彼此相關、哪些跟良率有關。Pearson（線性）或 Spearman（等級，同分取平均排名），
  成對完整（缺值只排除那一對）；p 值用 t 分配（不完全 Beta 函數），不顯著（p ≥ `alpha`）的格子淡化。發散色階（`colors`），
  `v-model:clustered` 依相關性排序（平均連結聚類，距離 1 − |r|），`triangle="lower"` 只畫下三角。點一格（或 Enter）在下方畫這兩個參數的
  ScatterChart 與迴歸線、送出 `cell-click`。HTML 表格（`role="grid"`）：方向鍵、Home / End 移動，每一格有完整的 aria-label，
  目前格子的說明以 aria-live 念出；欄名直書，格子大小依寬度調整。新增 `charts/utils/correlation.ts`（`correlationMatrix`、
  `correlationPValue`、`correlationClusterOrder`）與語系群組 `correlation`；文件在「散佈圖、迴歸與相關」頁。
- **ParallelCoordinatesChart 平行座標圖**（charts）：多參數的製程視窗（哪些溫度 + 速度 + 壓力的組合良率高）。每個參數一條軸
  （`domain` 不給時依資料取整、`reverse` 越小越好），每一筆一條折線（缺值的軸斷開）。在軸上拖曳框選範圍、可多條軸一起框，
  拖動框選區平移、點一下軸清除；所有條件都符合的線保留顏色（`v-model:brushes`、`select`）。拖曳軸名稱換位置（`v-model:order`），
  鍵盤 ←→ 換位置、Delete 清除框選；窄的時候軸名稱上下交錯。`colorBy` 依數值（連續色階 `colorRange`）或文字（類別色）上色；
  線多於 `canvasThreshold` 時改畫在 Canvas。新增 `charts/utils/parallel.ts`、語系群組 `parallel` 與文件頁「平行座標圖」。
- **ChptPivotTable 樞紐分析表**：交叉分析（不良數依「線 × 不良代碼」、產量依「日期 × 機台」）。欄位拖到列、欄、值，或用欄位旁的按鈕
  （鍵盤可操作；區內可前後移、移除）；`v-model:config` 記住設定。值：加總、平均、計數、最小、最大、不重複計數（分組欄位只能計數），可同時多個。
  列可以多層，每一層小計、可展開收合（`defaultExpandDepth`）；多層欄合併標題；總計欄與總計列（`showTotals`）。熱度依數值深淺上色；
  `cell-click` 回傳這一格的條件與數值；匯出 CSV（最後一層的列 + 總計）。列多於 200 時只畫看得到的部分。
  分組值依欄位的 `order`、數字大小或字串（數字感知）排序，空白排最後。新增 `shared/pivot.ts`（`computePivot`…）與語系群組 `pivot`。
- **ChptTimeScrubber 時間軸回放**：把一段時間的資料重播（異常前後參數怎麼變、一個班怎麼演變）。播放頭（v-model，毫秒）可拖曳、
  點軌道跳過去；播放（`v-model:playing`）依倍速（`v-model:speed`、`speeds`）往前走，到結尾自動停止或 `loop`；分頁切走再回來時一次最多推進 250ms。
  事件標記（`events`：時間、說明、嚴重度或顏色）點了跳過去，另有上一個 / 下一個事件按鈕。範圍（`v-model:range`）拖兩端把手只看一段、播放只在範圍內。
  `sync` 傳入 `useChartSync()` 的結果時，播放頭同步到圖表十字線、範圍同步到 X 軸。播放頭與範圍把手都是 `role="slider"`：
  ←→（Shift ×10，步進依總長度自動取好讀的單位）、Home / End、PageUp / PageDown 跳事件、空白鍵播放。
  新增 `shared/timeScrubber.ts` 與語系群組 `timeScrubber`。
- **ChptApprovalFlow 簽核流程**：工程變更、異常處理單、採購單的簽核進度與簽核動作（v-model：`ApprovalFlowData`）。
  關卡依序進行；多人關卡可以是會簽（`mode: 'all'`，全部同意）或或簽（`'any'`，一人同意即可），任一人退回整份退回、後面的關卡不需簽核。
  每一關顯示花了 / 已經等了多久，超過 `slaHours` 標示逾時。委託（代理）：簽核人把這一關交給別人，由代理人決定。
  輪到 `operator`（或他是代理人）時出現簽核區：意見、同意、退回（`requireRejectComment` 時要寫原因）、委託（從 `delegates` 選，
  排除自己與這一關已經在簽的人）；送出 `approve` / `reject` / `delegate` 事件。新增 `shared/approval.ts` 與語系群組 `approval`。
- **TreemapChart 矩形樹圖**（charts）：階層的組成（不良依「廠 → 線 → 站 → 代碼」、成本依「部門 → 科目」）。面積是數量；
  點有子節點的方塊往下鑽，麵包屑回上層（`v-model:path`），最底層送出 `node-click`；`levels="2"` 一次看兩層（第一層有標題列）。
  `colorBy="group"` 每個子節點一個類別色，`"metric"` 依 `metric` 上色（群組依 value 加權平均）；`metricCenter` 設定時為發散色階
  （例如以目標值為中心），色階用 CSS `color-mix` 在主題色之間混色，亮 / 暗主題自動正確。放不下的方塊不放文字，文字有底色描邊。
  鍵盤：方向鍵依位置移動、Enter 往下、Esc / Backspace 回上層並把焦點放回原本那塊；附隱藏的資料表。
  新增 `charts/utils/treemap.ts`、語系群組 `treemap` 與文件頁「矩形樹圖」。
- **ScatterChart 散佈圖與迴歸**（charts）：看兩個變數的關係（爐溫與空焊率、錫膏厚度與良率）。分類用不同顏色、圖例可顯示 / 隱藏；
  直線迴歸 `regression`：`'all'`（全部一條虛線）/ `'category'`（每個分類一條）/ `'none'`，顯示迴歸式、R²、n；
  `showBand` 畫平均反應的 95% 信賴帶（t 分配）。拖曳框選 → `select` 事件，沒選到的點變淡並顯示選取數與平均；點一個點 → `point-click`。
  點數超過 `canvasThreshold`（預設 3000）時改畫在 Canvas，滑過與框選照常，主題切換時重畫；觸控時上下滑動仍可捲動頁面。
  附隱藏的迴歸統計表給螢幕閱讀器。新增 `charts/utils/scatter.ts`（`linearRegression`、`regressionBand`、`tQuantile975`）、
  語系群組 `scatter` 與文件頁「散佈圖與迴歸」。
- **ChptDiffViewer 參數比對**：比對兩組巢狀參數（配方 A / B、機台設定修改前後）。巢狀物件與陣列攤平成路徑比對，
  狀態分為變更、新增、刪除、容許內（數值差在 `tolerance` 內）與相同；數值顯示差值與百分比。`tolerances` / `units` 依路徑設定
  （`oven.zones[*].temp`、`conveyor.*`），`labels` 給路徑顯示名稱。樹狀顯示（只有一個子節點的群組併成一列，例如 `[1].temp`），
  群組摺疊時也標出底下幾處不同；`v-model:only-diff` 預設只顯示差異；各狀態數量也是篩選；搜尋路徑、名稱與值。
  窄於 560px 時改為「參數 | 基準 → 比對」兩欄，手機上不用左右捲動。新增 `shared/paramDiff.ts` 與語系群組 `diffViewer`。
- **ChptImageCompare 影像比對**：比對兩張同視野的影像（標準樣品與待測品、修改前後）。三種方式（`v-model:mode`）：
  滑桿（拖分隔線，`v-model:position`；沒放大時拖任何地方都會移動分隔線）、並排、疊圖（`v-model:opacity`，`v-model:difference`
  用差異混合：相同處變黑、缺件偏移發亮）。三種方式與並排兩格共用同一個縮放與位置 —— 縮放以「相對倍數 + 畫面中心的影像座標」記錄，
  切換方式、視窗縮放時看的仍是同一塊。雙擊放大 / 還原、Ctrl + 滾輪或兩指縮放、放大後拖曳平移（不會拖出空白）；
  鍵盤 + / − / 0、方向鍵，分隔線是 `role="slider"`。新增 `shared/imageCompare.ts` 與語系群組 `imageCompare`。
- **ChptAlarmCenter 警報中心**：要有人處理的設備 / 品質警報（v-model：`AlarmItem[]`）。依「未確認 → 已確認 → 暫停 → 已結束」、
  再依嚴重度與時間排序；嚴重度同時用顏色、圖示與文字。確認（記下 `operator` 與時間）、暫停（`shelveOptions` 分鐘，時間到自動回來）、
  升級；條件已恢復但沒人確認的仍算未確認、標「已恢復」。上方是各嚴重度未確認數量（也是篩選），檢視切換未處理 / 未確認 / 暫停 / 全部、
  搜尋訊息 / 代碼 / 來源、全部確認。未確認的嚴重警報色條閃動（`prefers-reduced-motion` 時不閃），新警報以 aria-live 念出；
  `sound` 時有未確認的嚴重 / 重要警報就定時響（可靜音）。鍵盤：↑↓ 移動、A 確認、S 暫停、E 升級、Enter 展開說明。
  事件 `ack` / `shelve` / `unshelve` / `escalate` 給後端；狀態與操作函式（`alarmState`、`sortAlarms`、`filterAlarms`、`ackAlarms`…）一併匯出。
- **RadarChart 雷達圖**（charts）：同時比較幾個對象在多個指標上的表現（供應商評分、各線 OEE 三率）。每一軸有自己的範圍
  （不給 max 時取最大值取整，`max` 讓所有軸共用刻度）；`lowerIsBetter` 的指標反轉方向、軸名稱標 ↓，整張圖「越大越好」一致。
  滑過點看數值、滑過圖例突顯、點圖例顯示 / 隱藏（aria-pressed，`visibility-change` 事件）；沒有值的軸畫在中心、不畫點。
  附隱藏的資料表（指標 × 系列）給螢幕閱讀器。新增 `charts/utils/radar.ts`（`radarScales()`、`radarRatio()`）與語系群組 `radar`。
- **ChptShiftRoster 排班表**：人員 × 日期的輪班表（v-model：`{ [人員 id]: { 'YYYY-MM-DD': 班別代碼 } }`）。填入模式：選筆刷後點格子、
  按住拖曳填一整段、Shift + 點填到上一次點的位置、橡皮擦清除（觸控拖曳是捲動，不填）；交換模式：拖到同一天另一個人身上互換。
  下方顯示每天每班排了幾人 / 需要幾人（`requirements` 可為函式，不足時紅字 ▲）；規則提醒（`rules`：兩班之間最少休息時數，含跨夜班；
  最多連續上班天數）以 ⚠ 標在格子上並列在下方，只提醒不阻止。右側統計上班天數。role="grid" 鍵盤操作：方向鍵、班別快捷鍵、
  Delete 清除、交換模式空白鍵拿起 / 放下；變更以 aria-live 念出。新增 `shared/shiftRoster.ts`（型別 `RosterShift`、`Roster` 與
  `rosterDates()`、`rosterCoverage()`、`rosterWarnings()`、`swapShifts()` 等）與語系群組 `shiftRoster`。
- **ChptFloorPlan 廠區配置圖**：把機台畫在廠區平面圖上。狀態資料與 ChptEquipmentWall 相同（`EquipmentItem` 加上 `x` / `y` / `w` / `h`），
  同一份資料可以兩種方式看。平面圖可用背景圖片（`backgroundSrc`）或區域（`zones`），座標用自己的單位。停機的外圈閃動（減少動態效果時不閃）；
  Ctrl + 滾輪 / 兩指縮放、拖曳平移、右下角按鈕（一般滾輪照常捲動頁面）；點機台看明細卡（`#detail` 插槽）；圖例可只突顯某個狀態。
  名稱放不下時縮短（放大後看到全名）、手機上框高跟著平面圖比例。鍵盤：方向鍵依位置移到最近的機台（移到畫面外會自動平移）、
  Enter / Esc、+ / − / 0 縮放。新增 `shared/floorPlan.ts`（`fitTransform()`、`zoomAt()`、`clampPan()`）與語系群組 `floorPlan`；
  狀態顏色與圖示移到 `shared/equipment.ts`（`EQUIPMENT_STATUS_COLOR`、`EQUIPMENT_STATUS_ICON`）與狀態牆共用。
- **ChptLogViewer 設備日誌**：設備、通訊、排程的即時日誌。固定列高的虛擬捲動（只畫看得到的列，幾萬筆也順）；等級篩選（含各等級筆數，
  debug 預設隱藏）、搜尋並標出關鍵字（`/pattern/i` 為正規式，寫錯時提示並退回一般搜尋）。跟隨最新：新紀錄進來時自動捲到底，
  往上捲就暫停並顯示「N 筆新紀錄」；以「上一次最後一筆」偵測新紀錄，呼叫端只保留最後 N 筆（筆數不變）時也正確。
  點一列看完整內容（多行訊息），可複製單筆或篩選後的全部、下載 .log。listbox + aria-activedescendant 鍵盤操作；新的 error / fatal 以
  aria-live 念出。新增 `shared/logViewer.ts`（`parseLogLine()`、`compileLogSearch()`、`filterLogs()`、`formatLogLine()` 等）與語系群組 `logViewer`。
- **SankeyChart 流向圖**（charts）：數量從哪裡流到哪裡 —— 各站流向與損失、不良品處置去向、物料到各線。線寬 = 數量；
  欄依最長路徑自動排、垂直位置來回調整減少交叉（自己實作，不引入 d3-sankey）；有循環的連線略過並以 `cycle` 事件回報。
  滑過節點高亮經過它的所有上下游流向、滑過連線看數量與佔來源流出比例；`linkColor`（來源 / 目標 / 中性）、`align`（justify / left）、
  節點自訂顏色、`autoResize`。窄的時候名稱依欄距截斷（完整名稱在 tooltip 與 aria-label）。鍵盤：↑↓ 同一欄、←→ 沿最大流量移動、
  Enter 點擊；附隱藏的資料表給螢幕閱讀器。新增 `charts/utils/sankey.ts`（`sankeyLayout()`、`sankeyLinkPath()`）、
  文件頁「流向圖」與語系群組 `sankey`。
- **ChptLotTrace 批號追溯圖**：客訴、召回、異常調查用。資料是「投入 → 產出」的關係（`links: { from, to, qty, unit }`），
  可往上游（用了哪些料）、下游（做成了什麼、出給誰）或雙向追溯。圖形檢視：查詢的批號在中間、上游在左、下游在右，連線標用量，
  依鄰居位置排序減少交叉；點一個批號高亮它與查詢批號之間的所有路徑。hold（隔離）紅框 + HOLD、suspect（可疑）虛線黃框；
  搜尋時其他批號變淡。清單檢視：上游、下游各一棵 ChptTree（循環資料只展開一次）。鍵盤：方向鍵沿著連線 / 同一欄移動、Enter 選取。
  新增 `shared/lotTrace.ts`（`traceLayers()`、`layoutTrace()`、`tracePath()`、`traceTree()`）與語系群組 `lotTrace`。
- **ChptChecklist 點檢表**：設備點檢、首件檢查、IPQC 巡檢用。三種項目：check（合格 / 不合格 / 不適用，大按鍵、顏色 + 圖示 + 文字、
  radiogroup 鍵盤操作）、measure（填量測值，依 `lsl` / `usl` 自動判定，可選 `numpad` 數字鍵盤）、text（記錄批號等）。
  不合格時出現原因欄（`requireNoteOnNg` 預設必填）；`allowPhotos` 可附照片（`photoReader` 可改成上傳後存網址）。
  上方進度條與不合格數，可篩選待處理 / 不合格；`validate()` 標出未填與缺原因的項目並捲到、聚焦第一個；`#footer` 插槽放簽名與送出。
  新增 `shared/checklist.ts`（`ChecklistItem`、`ChecklistResult`、`judgeMeasure()`、`checklistSummary()` 等）與語系群組 `checklist`。

- **ChptEquipmentWall 機台狀態牆**：產線看板、值班畫面用。每台一張卡：狀態（顏色 + 圖示 + 文字）、已持續多久、警報原因、
  工單 / 料號、稼動率與最多三個數值；停機的卡片整張帶紅。工具列的各狀態數量也是篩選（可多選），可搜尋名稱、編號、工單、料號，
  顯示平均稼動率。依 `group` 分組（標題顯示各狀態數量）、`sortBy="status"` 停機排前面、`density="compact"`。
  狀態改變時卡片閃外框，變成 `announceStatuses`（預設停機）時以 aria-live 念出。整面牆一個 Tab 停駐點、方向鍵依視覺位置移動。
  狀態名稱與 StateTimeline 相同（另有 offline）。新增 `shared/equipment.ts`（`EquipmentItem`、`EquipmentStatus`、
  `filterEquipment()`、`sortEquipment()`、`groupEquipment()`、`countEquipment()`、`averageUtilization()`）與語系群組 `equipment`。
- **CalendarHeatmap 日曆熱圖**（charts）：每天一格、顏色深淺代表數值；一欄一週、一列一個星期幾（`weekStart` 週一 / 週日），
  週期性規律一眼可見。預設把最小～最大值等分成 5 級（主色由淺到深），可用 `thresholds` + `colors` 改成門檻分級、
  `domain` 固定刻度；同一天多筆加總，沒有資料的日子只畫外框（和 0 不同），今天加粗外框。範圍比容器寬時可水平捲動、
  一開始捲到最近的日子，星期標籤固定在左側。鍵盤：↑↓ 一天、←→ 一週、Home / End、Enter 送出 `cell-click`，目前的格子以 aria-live 念出；
  ref 方法 `focusDate()`。新增 `charts/utils/calendarHeatmap.ts`、型別 `CalendarDatum` / `CalendarCell` 與語系群組 `calendarHeatmap`。
- **ChptDefectAnnotator 缺陷標註**：在產品照片、PCB 圖上標出缺陷位置與類型。點一下放編號標記、或切到「框」拖出範圍；
  標記可拖曳移動，選類型會套用到選取中的標記，工具列顯示各類型數量；旁邊的清單可改備註、刪除。座標存成 0–1 的比例
  （縮圖、全螢幕、列印都落在同一位置）。鍵盤：標註區按 Enter 於中央新增，標記是按鈕、方向鍵微調（Shift 加大）、Delete 刪除；
  新增 / 刪除以 aria-live 念出。`readonly` 只檢視。新增 `shared/defectMarks.ts`（`DefectMark`、`DefectType`、`rectFromCorners()`、
  `moveMark()`、`nextMarkId()`、`countByType()`、`markCenter()`）與語系群組 `defect`。
- **ChptSignaturePad 簽名板**：簽收、點檢確認、放行簽核用。線條平滑（二次貝茲曲線）、粗細隨書寫速度變化（筆有壓力值時隨壓力），
  高解析度螢幕不糊；簽名中不捲動頁面、多指觸控只取第一根手指。每簽完一筆更新 v-model（PNG data URL，空白為 null），
  可復原上一筆、清除；`trim` 只輸出有簽名的範圍、`exportBackground` / `exportType` 決定輸出格式；ref 方法 `toDataURL()`、
  `toSVG()`（向量）、`getStrokes()` / `setStrokes()`。v-model 傳入既有簽名圖時顯示在底下。簽名區固定白底（深色模式不反轉）。
  新增 `shared/signature.ts`（`createWidthTracker()`、`signatureBounds()`、`signatureToSVG()`、`signatureExportRect()`）與語系群組 `signature`。
- **ChptNumpad 數字鍵盤**：產線平板、觸控工作站用的大按鍵數字鍵盤（`size` sm / md / lg = 48 / 56 / 72px）。
  原本的值是選取狀態，直接按數字就取代；按「確定」（或 Enter）才更新 v-model 並檢查 `min` / `max`，超出範圍時顯示原因、
  不送出也不夾限。`precision`（0 = 只能整數）、`allowNegative`（有設負的 `min` 時自動顯示 ±）、`maxDigits`、
  `quickValues` 常用值、`layout`（calculator / phone）、`autofocus`（放進 ChptPopover 打開就能用實體鍵盤）。
  整組一個 Tab 停駐點，點按鍵不搶焦點；實體鍵盤支援數字、小數點（含逗號）、Backspace、Delete、Enter、Esc（只有改過時才攔下）。
  新增 `shared/numpad.ts`（`applyNumpadKey()`、`parseNumpad()`、`numpadText()`、`numpadRangeError()`、`numpadKeyFromKeyboard()`）
  與語系群組 `numpad`。
- **ChptCameraScanner 相機掃碼**：用手機或平板的相機讀條碼與 QR Code。優先用瀏覽器內建的 BarcodeDetector
  （QR、Code128、Code39、EAN 等），沒有時退回 jsQR（動態載入，只能讀 QR，畫面會提示）。`v-model:active` 開關相機；
  同一個碼在 `dedupeMs` 內只送一次 `scan`；`continuous=false` 掃到一次就關。掃到時嗶聲 / 震動 / 閃一下（`feedback`），
  並以 aria-live 念出。權限被拒、找不到相機、相機被占用、非 HTTPS 都有說明（可重試的才有重試鈕）；
  有多顆鏡頭時可切換；分頁切到背景時自動關相機、回來再開。新增 `shared/cameraScan.ts`
  （`createDetector()`、`classifyCameraError()`、`cameraAvailability()`、`createDeduper()`）與語系群組 `cameraScanner`；
  `jsqr` 從 devDependencies 移到 dependencies。

- **ChptBarcode 一維條碼**（Code 128 / Code 39）：工單、批號、箱號標籤用。Code 128 可編完整 ASCII、自動切換字集
  （連續數字兩位一組）；Code 39 可加 mod 43 檢查碼。SVG 繪製、模組寬度取整數像素、左右留靜區，深色模式不反轉；
  內容含無法編碼的字元時顯示錯誤。`toSVG()` 取得 SVG 原始碼。編碼純函式（`encodeBarcode`、`encodeCode128`、
  `encodeCode39`…）在 `shared/barcode.ts` 並匯出；以 ZXing 解碼器驗證過各種字集切換的情況都能正確讀回。新增語系群組 `barcode`。
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

- **ChptTable / ChptPagination**：窄螢幕（手機、平板直式）時上方工具列、下方分頁列與 compact 分頁器不會換行，
  分頁與欄位設定被推到表格外面（整頁出現水平捲軸）。改為 flex-wrap：放不下時換行、右側那組靠右。寬螢幕的外觀不變。
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

- **文件站手機版**：側欄原本固定佔 288px，手機上內容區只剩一百多 px、每個區塊被擠到約 66px 寬。
  寬度小於 1024px 時側欄改成從左側滑出的抽屜（頂端列有選單、站名、搜尋；遮罩、Esc、換頁都會關閉；
  打開時焦點移進抽屜、關閉時還給選單鈕，關閉時以 inert 移出 Tab 順序）。各頁也一併修正：
  沒有寫基本欄數的 grid 補上 `grid-cols-1`（否則單欄會被長程式碼撐到 800 多 px）、區塊內距在手機上縮小、
  固定寬度的圖表範例在自己的框裡水平捲動。37 頁在手機（412px）與平板直式（768px）都沒有水平溢出；桌面版畫面不變。
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
