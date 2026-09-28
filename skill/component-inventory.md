# 組件清單（src/components/library/）

> 此清單由實際原始碼萃取，**以此為準，不要相信舊 README**（舊 README 提到的 `Jx*`、`GantChart`、
> `BoxPlotChart`、`UniversalStackedChart` 等從未存在於 repo）。
> 統一引入方式：`import { ChptButton, ChptTable } from '@/components/library'`
> `@/components/common` 只是 @deprecated 相容 facade（re-export library），新程式不要用。

## 目錄
- [存放位置與入口](#存放位置與入口)
- [相容別名 / 已收斂元件對照](#相容別名--已收斂元件對照)
- [基礎表單原子元件（TS）](#基礎表單原子元件ts)
- [資料呈現](#資料呈現)
- [Modal / 浮層](#modal--浮層)
- [顯示 / 反饋](#顯示--反饋)
- [佈局 / 導覽 / 流程](#佈局--導覽--流程)
- [過濾器](#過濾器)
- [圖表（JS + D3）](#圖表js--d3)
- [Excel / 匯出上傳](#excel--匯出上傳)
- [主題 / 其他](#主題--其他)
- [非 library 元件](#非-library-元件)
- [文檔路由對照](#文檔路由對照)

---

## 存放位置與入口

```
@/components/library
  ui/       通用 UI（Chpt*：表單/資料/反饋/浮層/導覽/主題工具）  → ui/index.js
  charts/   D3 圖表（雙軸/柏拉圖/熱力/分面）                    → charts/index.js
  viewer/   領域檢視器（Gerber / PCB）                          → viewer/index.js
  excel/    Excel 編輯/匯出/匯入                                → excel/index.js
  shared/   types/ui.types.ts、useToast.ts
  index.js  正式公開 API（new code 一律由此 import）
```

新增組件 → 放對應資料夾、在**該資料夾 index.js** 匯出；需要對外公開再補到 `library/index.js`。

## 相容別名 / 已收斂元件對照

**A. 3~6 行 re-export alias（改樣式/邏輯請改右邊 Chpt* 本尊）**：

| 別名檔（放同資料夾） | 實體 |
|---|---|
| `CommonTable.vue`（ui） | `ChptTable.vue` |
| `Pagination.vue` / `PaginationControls.vue`（ui） | `ChptPagination.vue` |
| `CodeBlock.vue`（ui） | `ChptCodeBlock.vue` |
| `TabNavigation.vue`（ui） | `ChptTabNavigation.vue` |
| `PageSwitcher.vue`（ui） | `ChptPageSwitcher.vue` |
| `ModalDock.vue`（ui） | `ChptModalDock.vue` |
| `HeaderLogoutButton.vue`（ui） | `ChptHeaderLogoutButton.vue` |
| `SimpleDarkModeToggle.vue`（ui） | `ChptDarkModeToggle.vue` |
| `ExcelEditor.vue` / `ExcelExporter.vue` / `ExcelUploader.vue`（excel） | `ChptExcelEditor.vue` / `ChptExcelExporter.vue` / `ChptExcelUploader.vue` |

**B. 舊獨立實作（功能已被 Chpt* 收斂，新程式改用 Chpt*；檔案保留過渡）**：

| 舊元件 | 改用 |
|---|---|
| `DraggableModal.vue`（ui） | `ChptModal`（`mode="dialog"/"window"` 一體涵蓋）＋`ChptModalDock` |
| `FilterBar.vue`（ui） | `ChptFilterBar` |
| `FilterSelect.vue` / `FilterDropdown.vue` / `TagFilterDropdown.vue`（ui） | `ChptFilter`（`type="select/dropdown/tag"`） |
| `ParetoChart.vue`（charts，含統計區塊） | `EnterprisePareto`（新專案優先） |
| `CommonTooltip.vue`（ui，受控式） | 新增優先 `ChptTooltip`；**圖表 tooltip 仍用受控式 CommonTooltip**，勿改 |

> 2026-09-06 已刪除這些舊版的**文檔路由**（`common-table`、`draggable-modal`、
> `filter-select`、`filter-dropdown`、`filter-bar`、`tag-filter-dropdown`），內容由
> `DataFilterDocs`（ChptTable/ChptFixedTable/ChptPagination/ChptFilter/ChptFilterBar）與
> `OverlayDocs`（ChptModal/ChptDrawer/ChptPopconfirm/ChptModalDock）覆蓋。

---

## 基礎表單原子元件（TS）

| 組件 | Props | Emits | Slots |
|---|---|---|---|
| `ChptIcon` | fill, weight, grade, size, color（`text-{color}` 後綴，預設 `content-tertiary`；`current` = 跟隨文字色）, hoverColor, opacity；`class` 直接落到根節點 | – | default（圖示名，Material Symbols） |
| `ChptButton` | label, icon, iconPosition, iconColor, color, size(`3xs~lg`), rounded, type, isOutline, disabled, loading, hasBadge, badgeText, badgeBgColor, badgeTextColor, textColor, class | click | default |
| `ChptInput` | modelValue, type, label, placeholder, size, disabled, readonly, clearable, fullWidth, prefixIcon, maxlength, errorText | update:modelValue, blur, focus, clear | – |
| `ChptTextarea` | modelValue, label, placeholder, size, rows, disabled, readonly, fullWidth, maxlength, showCount, autosize, errorText | update:modelValue, blur, focus | – |
| `ChptSelect` | modelValue, options, label, placeholder, size, disabled, fullWidth, valueKey, labelKey, disabledKey, numberValue, errorText | update:modelValue | – |
| `ChptRadio` | modelValue, items, name, size, color, errors, isLabelShow, labelSize, labelColor, direction | update:modelValue | – |
| `ChptCheckbox` | modelValue, items, size, bgColor, borderColor, errors, isLabelShow, labelSize, labelColor, direction | update:modelValue, click | – |
| `ChptSwitch` | modelValue, label, size, color, disabled | update:modelValue, change | – |
| `ChptDatePicker` | modelValue, label, placeholder, range, enableTimePicker, format, minDate, maxDate, size, disabled, clearable, autoApply, fullWidth, errorText | update:modelValue, clear | – |
| `ChptInputNumber` | modelValue(`number\|null`), min, max, step, precision, label, placeholder, unit, size(`xs~xl`), controls, disabled, readonly, fullWidth, errorText | update:modelValue, change(value, old), focus, blur | ref: `focus()`, `blur()` |
| `ChptSlider` | modelValue, min, max, step, label, showValue, formatter, marks(`SliderMark[]\|Record<number,string>`), disabled, fullWidth | update:modelValue（拖曳中）, change（放開） | – |
| `ChptForm` | model, rules(`Record<path, FormRule\|FormRule[]>`), labelPosition(`top/left`), labelWidth, gap, disabled | submit(model), invalid(errors) | ref: validate(fields?), validateField, resetFields, clearValidate, submit；失敗時聚焦第一個錯誤欄位 |
| `ChptFormItem` | prop（可 a.b.c）, label, required, rules, hint, labelWidth, showMessage | – | default（`{ error, invalid }`）、`label`；裡面的 ChptInput/Select/Textarea/InputNumber/Autocomplete/Cascader/ColorPicker/Rate 自動接上 id（Rate 以 aria-labelledby）、aria-invalid、aria-describedby；ChptDatePicker 驗證失敗時也會變紅框 |
| `ChptUpload` | modelValue(`UploadFile[]`), accept, multiple, maxSize, maxCount, request(`(file,{onProgress,signal})=>Promise`), autoUpload, drag, label, buttonText, hint, disabled, fullWidth | update:modelValue, add, remove, reject(file, reason), success, error | ref: submit(), open(), addFiles() |
| `ChptSegmented` | modelValue, options(`{label,value,icon?,disabled?}\|string`), size(`xs~lg`), block, disabled, ariaLabel | update:modelValue, change | – |
| `ChptAutocomplete` | modelValue(`string`), options(`string\|{value,label?,description?,disabled?}`), fetchSuggestions(`(q)=>Suggestion[]\|Promise`), filter, debounce, openOnFocus, autoHighlight, maxItems, label, placeholder, prefixIcon, size, clearable, disabled, fullWidth, errorText, emptyText, loadingText | update:modelValue, select(item), focus, blur | `option`（`{ item, query }`）；WAI-ARIA combobox；值可自由輸入（只能選清單時用 ChptSelect） |
| `ChptCascader` | modelValue(`(string\|number)[]\|null` 路徑), options(`{value,label,children?,disabled?,leaf?}`), separator, showAllLevels, changeOnSelect, expandTrigger(`click/hover`), load(`(node,path)=>Promise<Option[]>`), label, placeholder, clearable, disabled, size, fullWidth, errorText | update:modelValue, change(path, nodes) | `option`（`{ node, level }`）；ref: open, close, getCheckedNodes |
| `ChptTransfer` | modelValue(右側 keys), data(`{key,label,description?,disabled?}`), titles, buttonTexts, filterable, filterPlaceholder, filterMethod, targetOrder(`original/push`), listHeight, emptyText, disabled, ariaLabel | update:modelValue, change(keys, 'left'\|'right', movedKeys) | `item`（`{ item, side }`）, `footer`；ref: clearChecked, clearQuery |
| `ChptColorPicker` | modelValue(`#rrggbb\|null`), presets, label, showText, clearable, disabled, size, fullWidth, errorText | update:modelValue, change | 面板：原生取色器 + 色碼輸入（#abc 會正規化）+ 預設色 |
| `ChptRate` | modelValue(0 = 未評分), count, icon, texts, showText, allowClear, readonly（role=img）, disabled, size(`sm/md/lg`), color(`warning/danger/accent`), ariaLabel | update:modelValue, change | WAI-ARIA radiogroup；在 FormItem 裡以標籤命名 |
| `ChptTimePicker` | modelValue(`'HH:mm'\|'HH:mm:ss'\|null`), showSeconds, minuteStep, secondStep, min, max, label, placeholder, clearable, disabled, size, fullWidth, errorText | update:modelValue, change | 可打字（930 → 09:30，打錯還原）；面板時/分/秒各一個 listbox；ref: open, close, focus |
| `ChptTreeSelect` | data(`TreeNode[]`), modelValue(`Key\|Key[]\|null`), multiple, displayStrategy(`parent/child/all`), maxTagCount, showPath, separator, filterable, filterPlaceholder, defaultExpandAll, panelHeight, label, placeholder, clearable, disabled, fullWidth, errorText | update:modelValue, change | 內部是 ChptTree；觸發鈕名稱 = 標籤 + 值；ref: open, close |

`ChptDatePicker` 底層是 `@vuepic/vue-datepicker`。

## 資料呈現

| 組件 | Props（重點） | Emits | Slots / Ref |
|---|---|---|---|
| `ChptTable` | data, columns（`{ key, title, sortable, sortType, width, minWidth, resizable }`）, searchPlaceholder, noDataText, defaultPageSize, customFilter, defaultSort, paginationPosition(`top`/`bottom`/`both`), **rowKey**（預設 `'id'`）, **selectable**（`true`/`'single'`）, **selectedKeys**（v-model）, **isRowSelectable**, **expandedKeys**（v-model）, **isRowExpandable**, **remote** + **total**（伺服器端分頁排序搜尋）, **loading**/loadingText, **resizable**, **rowClass**, 以及整組外觀 props（containerBgColor, headerBgGradient, evenRowBgColor, hoverRowBgColor, fontSize…） | search, sort, update:page, update:pageSize, **change**（`{ page, pageSize, sortColumns, query, reason }`）, **update:selectedKeys**, **selection-change**（keys, rows；含其他頁的列）, **update:expandedKeys**, **row-click**（有監聽時列可聚焦、Enter 觸發）, **column-resize** | slots: `left-controls`, `right-controls`, `bottom-left-controls`, `bottom-right-controls`, `table-row`（整列自訂；此時勾選／展開／row-click 要自己處理）、`cell`（`{ item, column, value }`）, **`expand`**（`{ item, index }`，提供時多一個展開欄）, **`selection-actions`**（`{ keys, rows, clear }`）, `footer`, `modals`；ref: `refresh()`, `resetPage()`, `resetSort()`, `enableColumnSort()`, `clearSelection()`, `selectedRows` |
| `ChptFixedTable` | columns, data, isFixed, fixedColumns, isFilter, filterColumns, isKeep, viewportOffset, showSearch, searchText, headerFontSize, cellFontSize, divideColor/Opacity/Direction/Size, isPagination, defaultPageSize | update:fixedColumns, update:filterColumns, update:searchText | slot: `td-{dataIndex}`（`{ row, value }`）、`header` |
| `ChptPagination` | variant(`full`/`compact`), currentPage, itemsPerPage, totalItems, pageSizeOptions, showSummary, showPageSize, bgColor | change, update:currentPage, update:itemsPerPage | – |
| `ChptCodeBlock` | code, language, trimIndent, tip, tipType, tipTitle | – | slot: `tip` |
| `ChptTabNavigation` | tabs, fontSize | – | – |
| `ChptPageSwitcher` | title, pages, footerHint | – | – |

`Column` 型別：`{ key?, title, sortable?, sortType?: 'string'|'number'|'date', style? }`；`ChptFixedTable` 欄位另含 `dataIndex/width/defaultFixed`。

## Modal / 浮層

| 組件 | Props（重點） | Emits | Ref 方法 |
|---|---|---|---|
| `ChptModal` | modelValue, mode(`dialog`/`window`), title, id, width, height, size(sm~xl), fullWidth, closable, maskClosable, backdropOpacity, bodyHeight, draggable, resizable, minimizable, maximizable, x, y, minWidth, minHeight, defaultMaximized, headerBgColor, headerTextColor, borderClass | update:modelValue, open, close, minimize, maximize, restore | modalId, open, close, minimize, maximize, restore |
| `ChptDrawer` | modelValue, title, placement(`left/right/top/bottom`), size, closable, maskClosable, backdropOpacity | update:modelValue, close | slot: `footer` |
| `ChptPopconfirm` | message, confirmText, cancelText, color | confirm, cancel | slot: `message` |
| `ChptModalDock` | zIndex | – | 最小化視窗停靠列，配 `useModalManager` |
| `ChptTooltip` | content, placement(top/bottom/left/right), theme(dark/light/info/warning/error), showArrow, maxWidth, disabled | show, hide | slot: default（觸發元素）、`content`；aria-describedby 掛到觸發元素內可聚焦的元素、提示可滑鼠停留、Esc 任何時候可關、z-tooltip |
| `ChptDropdown` | items(`{key?,label,icon?,disabled?,danger?,divided?,shortcut?}`), label, icon, placement(`bottom-start/bottom-end/top-start/top-end`), size, disabled | select(item), open, close | slot: `trigger`（`{ open, toggle, attrs }`，attrs 需 v-bind）；ref: open, close |
| `ChptPopover` | open（v-model:open）, trigger(`click/hover/focus/manual`), placement(`top*/bottom*/left/right`), title, content, width, ariaLabel, padded, openDelay, closeDelay, disabled | update:open | slot: default（觸發元素，`{ open, toggle, attrs }`；aria 會自動補上）、`title`、`content`（`{ close }`）；ref: open, close, toggle |
| `useConfirm()` + `ChptConfirmHost` | `confirm({ title, message?, type?(info/success/warning/danger), confirmText?, cancelText?, requireText?, focus? })` → `Promise<boolean>`；`alert(...)` → `Promise<true>` | – | Host 在 App 放一次；role=alertdialog、排隊顯示、danger 預設焦點在取消、requireText 需照打才能確定 |

`ChptModal` 同時提供 dialog（置中確認/表單）與 window（多視窗：拖曳/縮放/最大化/最小化）兩種模式；多視窗需搭配 `ChptModalDock`。

## 顯示 / 反饋

| 組件 | Props | Emits |
|---|---|---|
| `ChptAlert` | show, type(`success`/`info`/`warning`/`danger`), title, message, showIcon, closable, fullWidth | close |
| `ChptTag` | label, color(含 dark/light), isOutline, size, icon, closable | close |
| `ChptBadge` | count, isDot, max, showZero, status, position, offset, color | – |
| `ChptAvatar` | src, alt, name, size(xs–xl), shape(circle/square), variant, showStatus, statusColor | – | 圖片載入失敗退回縮寫；文字頭像 role=img + 姓名；中文姓名取名（後兩字），xs/sm 取姓 |
| `ChptSpinner` | loading, size, text, color, fullWidth, center | – |
| `ChptSkeleton` | loading, rows, rowWidth, rowHeight, color（底色 class，預設 bg-surface-tertiary）, fullWidth | – | role=status「載入中」 |
| `ChptEmpty` | icon, title, description, iconSize, iconColor, fullWidth | slot: `action` |
| `ChptProgress` | modelValue, status, strokeWidth, trackColor, showLabel | update:modelValue |
| `ChptToast` | 無 props | 需全域掛載一次，配 `useToast()` |
| `ChptResult` | status(`success/error/warning/info/403/404/500`), title, subTitle, compact | slots: `extra`、default（補充內容）、`icon`、`title`、`subTitle` |

| `ChptNotificationHost` + `useNotification()` | Host: placement(`top-right/top-left/bottom-right/bottom-left`), max, ariaLabel；`notify.open/success/info/warning/error({ title, message?, duration?, actions?: {label,onClick,keepOpen?}[], closable?, onClose? })` → `{ id, close }` | 有標題 / 說明 / 動作的角落通知；滑鼠停留或聚焦時暫停倒數；有 actions 時預設不自動關閉；warning / error 為 role=alert |

`useToast()` → `success / info / warning / error`；型別 `'success'|'info'|'warning'|'danger'`。

## 佈局 / 導覽 / 流程

| 組件 | Props | Emits | Slots |
|---|---|---|---|
| `ChptCard` | title, icon, padding(none/sm/md/lg), fullWidth, hoverable | click | `header`, `extra`, `footer`, default |
| `ChptDivider` | direction(`horizontal`/`vertical`), text, color（預設 `stroke-light`） | – | default（中間內容）；純線時 role=separator |
| `ChptTabs` | tabs, modelValue, centered | update:modelValue, change | `panel-<index>`、default |
| `ChptSteps` | steps(`{title,status:pending/process/done}`), showLabel | – | – |
| `ChptBreadcrumb` | items(`{label,to?}`), separator | select | `item-<index>` |
| `ChptCollapse` | items(`{title,content?}`), modelValue(`number[]`), multiple | update:modelValue | `content-<index>` |
| `ChptMenu` | items(`{key,label?,icon?,to?,href?,target?,children?,disabled?,badge?,type?:'group'\|'divider'}`), modelValue（不綁時依路由比對 to）, openKeys（v-model:openKeys）, mode(`vertical/horizontal`), collapsed, accordion, indent, width, ariaLabel | update:modelValue, update:openKeys, select(item) | disclosure navigation（非 role=menu）；aria-current=page；ref: open(key), close(key), closeAll |
| `ChptAnchor` | items(`{href:'#id',title,children?}`), container（預設自動偵測捲動容器）, offset, title, ariaLabel, updateHash | change(href), click(href) | scroll spy；aria-current=location；點擊後焦點移到區塊；ref: refresh |
| `ChptBackTop` | target（預設自動偵測）, visibilityHeight, right, bottom, label | click | slot: default；回頂端後焦點移到最上面的標題 |

## 版面與實用

| 組件 | Props | Emits | Slots / Ref |
|---|---|---|---|
| `ChptSplitter` | modelValue（第一個面板 %）, direction(`horizontal/vertical`), min, max, step, disabled, ariaLabel | update:modelValue, resize-end | `start`, `end`；WAI-ARIA window splitter（方向鍵、Home/End、Enter 收合） |
| `ChptVirtualList` | items, itemHeight（固定）, height, overscan, keyField, threshold, loading, emptyText, ariaLabel | reach-bottom, scroll | default（`{ item, index }`）、`loading`、`empty`；ref: scrollToIndex(i, align) |
| `ChptAffix` | offsetTop, affixedClass, zIndex | change(affixed) | default（`{ affixed }`）；CSS sticky |
| `ChptCarousel` | items, ariaLabel（必填）, modelValue, autoplay, interval, loop, arrows, indicators, height | update:modelValue, change(index, prev) | default（`{ item, index, active }`）；ref: next, prev, goTo |
| `ChptCopyButton` | text, label, subject, tooltip, copiedText, resetAfter, disabled | copy(text), error | ref: copy() |
| `ChptEllipsis` | text, lines, expandable, tooltip, expandText, collapseText, block | toggle(expanded) | default |
| `ChptCountdown` | value（目標時間）, title, format(`HH:mm:ss`/`D 天 HH:mm:ss`/`mm:ss`…), warningThreshold, finishedText, size, interval | finish, change(remaining) | default（`{ parts, remaining, text }`）；role=timer |
| `ChptWatermark` | content(`string\|string[]`), rotate, fontSize, color, gap, zIndex | – | default（被覆蓋的內容） |

## 資料展示

| 組件 | Props | Emits | Slots |
|---|---|---|---|
| `ChptStatistic` | title, value, precision, groupSeparator, prefix, suffix, delta, deltaSuffix, deltaPrecision, higherIsBetter（不良率等請設 false）, description, valueClass, size, loading | – | `title`, `prefix`, `suffix`, `footer` |
| `ChptDescriptions` | items(`{key?,label,value?,span?}`), title, column, bordered, layout(`horizontal/vertical`), labelWidth, size, emptyText | – | `title`, `extra`, `value`（`{ item, index }`） |
| `ChptTree` | data(`{key,label,children?,disabled?,icon?}`), modelValue, selectable, checkable, checked, expanded, defaultExpandAll, filterText, indent, size, ariaLabel, emptyText | update:modelValue, update:checked, update:expanded, select, check, expand | `label`, `extra`（`{ node, level }`）；ref: expandAll, collapseAll, getCheckedNodes, getHalfCheckedKeys |
| `ChptImage` | src, alt（必填；裝飾圖傳 ''）, width, height, fit, lazy, rounded, preview, previewSrcList | load, error, preview(index) | `error`；載入中骨架、失敗顯示圖示與 alt |
| `ChptImageViewer` | open（v-model:open）, images(`(string\|{src,alt})[]`), index（v-model:index）, loop, thumbnails, minScale, maxScale | update:open, update:index, close | 模態看圖：←→ 切換、+/−/滾輪縮放、0 重設、R 旋轉、拖曳平移；ref: zoomIn, zoomOut, reset, rotate, next, prev |
| `ChptCalendar` | modelValue(`'YYYY-MM-DD'\|Date\|null`), month（v-model:month `'YYYY-MM'`）, firstDayOfWeek, disabledDate, compact, showToday, valueType(`string/date`) | update:modelValue, update:month, select(date, dateString) | `date-cell`（`{ date, dateString, day, isToday, isSelected, inMonth }`）, `header`；ref: goTo(date)；WAI-ARIA grid |
| `ChptTimeline` | items(`{title?,content?,time?,datetime?,color?,hollow?,icon?,pending?,current?}`), reverse | – | `dot`, `content`（`{ item, index }`） |

## 過濾器

| 組件 | Props | Emits | 備註 |
|---|---|---|---|
| `ChptFilter` | type(`select`/`dropdown`/`tag`), modelValue, label, options, placeholder, allValue, showAllOption, disabled, size, fullWidth, valueKey, labelKey, selectClass, labelClass | update:modelValue | 統一入口，`type` 決定形態 |
| `ChptFilterBar` | filters(`{key,label,options,allLabel?,allCount?}`), modelValue(`Record`), showCount, count, countLabel | update:modelValue | 水平多篩選列 |

## 圖表（JS + D3）

詳細用法見 `chart-patterns.md`。

| 組件 | 關鍵 Props | Emits | Slot / Ref |
|---|---|---|---|
| `DualAxisComboChart` | layers(必填), width, height, autoResize, debounceDelay, margin, xScaleType(`band`/`linear`/`time`), xDomain, xAxisLabel, xAxisFormat, xAxisLabelRotate, yLeft*/yRight*, title, showGrid, animationDuration, enableBrush, brushMode, triggerLines, showResetButton | layer-click, layer-hover, tooltip-show, tooltip-hide, selection-change, zoom-reset, chart-ready, chart-resize, axis-drag | slot `tooltip`（`tooltipData`, `tooltipVisible`）；layer.type：`bar` / `stacked-bar` / `line` / `area` / `scatter`，yAxis 省略＝左軸；Y 刻度數依高度自動調整 |
| `EnterpriseHeatmap` | data, xField, yField, valueField, colorScheme, colorRange, valueDomain, reverseColorScale, cellPadding/BorderRadius/BorderWidth/BorderColor, xAxisAngle, autoResize, enableBrush, colorLegendPosition | cell-click, cell-hover, tooltip-show/hide, selection-change, zoom-reset, chart-ready, chart-resize | slot `tooltip` |
| `EnterprisePareto` | data, categoryField, valueField, autoSort, sortOrder, barColor, barHoverColor, barPadding, showValuesOnBars, yAxisLeft*/yAxisRight*, xAxisAngle（共 44 props） | bar-click, bar-hover, tooltip-show/hide, chart-ready, chart-resize | slot `tooltip`；ref `render()`, `forceRerender()` |
| `FacetedChart` | facets, title, width, totalHeight, autoResize, margin, facetSpacing, xScaleType, xDomain, xAxisFormat, enableBrush, brushMode, syncBrush, enableAxisDragging, lastFacetExtraHeight, **crosshair**（同步十字線，預設 true）, **sharedLegend**, **facetLabelPosition**(`left/top`；左側長標題最多兩行)；margin 預設 `{ top: 40, right: 80, bottom: 40, left: 80 }`，外框下緣只補 X 軸區不夠的部分 | selection-change, zoom-reset, chart-resize, axis-drag | 垂直堆疊多面板，共用 X 軸；slot `tooltip`（`{ tooltipData, tooltipVisible, facet }`） |
| `GridFacetChart` | data, xFacetVar, yFacetVar, xFacetLabel, yFacetLabel（空字串時表頭只顯示值）, title, headerHeight, headerWidth, xScaleType, **scales**(`free/fixed/free_x/free_y`), **sharedLegend**, enableBrush, syncMode, enableAxisDrag | selection-change, zoom-reset, chart-resize, axis-drag | 2D 行×列分面；scales='fixed' 讓各格可互相比較 |

圖表的軸線 / 格線 / 文字 / tooltip 一律走 `charts/chartTheme.ts`（主題 CSS 變數，D3 用 `.style()` 設定），深色模式自動跟著變；資料系列色由呼叫端決定。

檢視器與白板不屬 charts：

| 組件 | 關鍵 Props | Emits | Ref |
|---|---|---|---|
| `GerberViewer`（viewer/） | src, gerberText, fillColor, layers, backgroundColor, showInfo, showControls, showLayerPanel, autoResize, padding, maxZoom, minZoom, showMovePath | loaded, error, zoom-change | zoomIn/zoomOut/resetView/reload/toggleLayer |
| `PcbLayout`（viewer/） | data, backgroundColor, colorMap, showInfo, showControls, showLayerPanel, autoResize, padding, maxZoom, minZoom, defaultTraceWidth, defaultPadSize, showRefDes | loaded, error, element-click, element-hover, zoom-change | zoomIn/zoomOut/resetView/toggleLayer/forceRender |

## Excel / 匯出上傳

| 組件 | Props | Emits | Ref 方法 |
|---|---|---|---|
| `ChptExcelEditor` | modelValue, showToolbar, showSheetTabs, rowCount, colCount, editable, enableFormula, defaultFilename, defaultSheetName | update:modelValue, cell-change, selection-change, sheet-add, sheet-remove, export-start/complete/error | exportExcel, getData, getCell(r,c), undo, redo, addSheet, removeSheet, switchSheet, clear |
| `ChptExcelExporter` | data, rawData, columns, defaultFilename, defaultSheetName, showOptions, size, variant, buttonLabel, buttonClass, cellStyles | export-start, export-complete, export-error | exportExcel, showExportOptions |
| `ChptExcelUploader` | label, loadingText, inputId, size, variant, customClass, showFileName | upload-start, upload-success, upload-error, data-loaded, error | – |

底層：`xlsx` + `xlsx-js-style`；共用解析工具在 `src/utils/excelUtils.js`、欄位對照在 `src/config/excelFieldMapping.js`。

## 主題 / 其他

| 組件 | Props | Emits | Ref |
|---|---|---|---|
| `ChptDarkModeToggle` | variant(`fancy`/`simple`), initialDarkMode, showControls, syncBodyByDefault, darkMode | toggle, update:darkMode | toggle, isDarkMode |
| `ChptHeaderLogoutButton` | size(sm/md), variant(soft-red/solid-red/outline-gray/ghost/primary), label, customClass | – | – |

## 非 library 元件

`src/components/SchematicViewer.vue`、`src/components/GlobalNotifications.vue`、
`src/components/whiteboard/*`（WhiteboardCanvas / WhiteboardToolbar / WhiteboardPageRail）。

---

## 文檔路由對照（2026-09-06 現況）

| 路由 | 檔案 | 側欄群組（anchors 子項） |
|---|---|---|
| `/docs` | `views/docs/Home.vue` | – |
| `/docs/components/form-atoms` | `views/docs/components/FormAtoms.vue` | UI 組件（chpt-input/select/radio/switch/datepicker/inputnumber/slider/segmented） |
| `/docs/components/data-filter` | `views/docs/components/DataFilterDocs.vue` | UI 組件（chpt-table/fixedtable/pagination/filter/filterbar） |
| `/docs/components/form` | `views/docs/components/FormDocs.vue` | UI 組件（form/upload） |
| `/docs/components/data-display` | `views/docs/components/DataDisplayDocs.vue` | UI 組件（statistic/descriptions/timeline/tree） |
| `/docs/components/feedback` | `views/docs/components/FeedbackDocs.vue` | UI 組件（alert/tag/badge/toast/progress/spinner/empty/skeleton/result） |
| `/docs/components/interactive` | `views/docs/components/InteractiveDocs.vue` | UI 組件（tabs/toast/button/progress/alert） |
| `/docs/components/overlay` | `views/docs/components/OverlayDocs.vue` | UI 組件（modal/drawer/popconfirm/dropdown/modaldock） |
| `/docs/components/tooltip` | `views/docs/TooltipDoc.vue` | UI 組件（theme/placement/content） |
| `/docs/components/layout-nav` | `views/docs/components/LayoutNavDocs.vue` | UI 組件（card/collapse/breadcrumb/steps/divider） |
| `/docs/components/theme-tools` | `views/docs/components/ThemeToolsDocs.vue` | UI 組件（darkmodetoggle/headerlogout） |
| `/docs/components/utilities` | `views/docs/components/UtilityDocs.vue` | UI 組件（splitter/virtuallist/affix/carousel/small-utils） |
| `/docs/components/facet-charts` | `views/docs/components/FacetChartDocs.vue` | 圖表（faceted-chart/grid-facet-chart） |
| `/docs/components/dual-axis-chart` | `views/docs/DualAxisChartDoc.vue` | 圖表（basic/examples） |
| `/docs/components/pareto` | `views/docs/ParetoDoc.vue` | 圖表（無子項） |
| `/docs/components/heatmap` | `views/docs/HeatmapDoc.vue` | 圖表（無子項） |
| `/docs/components/gerber-viewer` | `views/docs/GerberViewerDoc.vue` | 檢視器 |
| `/docs/components/pcb-layout` | `views/docs/PcbLayoutDoc.vue` | 檢視器 |
| `/docs/components/schematic-viewer` | `src/components/SchematicViewer.vue` | 檢視器 |
| `/docs/components/excel-editor` | `views/docs/components/ExcelEditorDocs.vue` | Excel |
| `/docs/components/whiteboard` | `views/docs/WhiteboardDoc.vue` | 進階範例 |
| `/docs/guide/getting-started`、`best-practices` | `ComponentPlaceholder.vue` | 開發指南 |
| `/docs/components/pie-chart` `/gauge` `/gantt` `/legend` | `ComponentPlaceholder.vue` | **尚未實作（未在側欄）** |

> 已移除（2026-09-06）：`common-table`、`draggable-modal`、`filter-select`、`filter-dropdown`、
> `filter-bar`、`tag-filter-dropdown`——內容由 data-filter／overlay 覆蓋；對應 .vue 檔案若未刪，
> 屬未被引用的殘留，可 `git rm`。

`DocLayout.vue` 側欄規則：有 `anchors` 的 item 會顯示成「可展開→點子項捲動到頁面 `<section :id>`」；
無 `anchors` 的 item 為普通跳頁。新頁面要加子項跳轉＝「navSections 加 anchors + 頁面放對應 section id」。
