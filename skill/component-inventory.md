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
| `ChptIcon` | fill, weight, grade, size, color, hoverColor, opacity, class | – | default（圖示名，Material Symbols） |
| `ChptButton` | label, icon, iconPosition, iconColor, color, size(`3xs~lg`), rounded, type, isOutline, disabled, loading, hasBadge, badgeText, badgeBgColor, badgeTextColor, textColor, class | click | default |
| `ChptInput` | modelValue, type, label, placeholder, size, disabled, readonly, clearable, fullWidth, prefixIcon, maxlength, errorText | update:modelValue, blur, focus, clear | – |
| `ChptTextarea` | modelValue, label, placeholder, size, rows, disabled, readonly, fullWidth, maxlength, showCount, autosize, errorText | update:modelValue, blur, focus | – |
| `ChptSelect` | modelValue, options, label, placeholder, size, disabled, fullWidth, valueKey, labelKey, disabledKey, numberValue, errorText | update:modelValue | – |
| `ChptRadio` | modelValue, items, name, size, color, errors, isLabelShow, labelSize, labelColor, direction | update:modelValue | – |
| `ChptCheckbox` | modelValue, items, size, bgColor, borderColor, errors, isLabelShow, labelSize, labelColor, direction | update:modelValue, click | – |
| `ChptSwitch` | modelValue, label, size, color, disabled | update:modelValue, change | – |
| `ChptDatePicker` | modelValue, label, placeholder, range, enableTimePicker, format, minDate, maxDate, size, disabled, clearable, autoApply, fullWidth, errorText | update:modelValue, clear | – |

`ChptDatePicker` 底層是 `@vuepic/vue-datepicker`。

## 資料呈現

| 組件 | Props（重點） | Emits | Slots / Ref |
|---|---|---|---|
| `ChptTable` | data, columns, searchPlaceholder, noDataText, defaultPageSize, customFilter, defaultSort, paginationPosition(`top`/`bottom`/`both`), 以及整組外觀 props（containerBgColor, headerBgGradient, evenRowBgColor, hoverRowBgColor, fontSize…） | search, sort, update:page, update:pageSize | slots: `left-controls`, `right-controls`, `bottom-left-controls`, `bottom-right-controls`, `table-row`, `footer`, `modals`；ref: `refresh()`, `resetPage()`, `resetSort()`, `enableColumnSort()` |
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
| `ChptTooltip` | content, placement(top/bottom/left/right), theme(dark/light/info/warning/error), showArrow, maxWidth, disabled | show, hide | slot: default（觸發元素）、`content` |

`ChptModal` 同時提供 dialog（置中確認/表單）與 window（多視窗：拖曳/縮放/最大化/最小化）兩種模式；多視窗需搭配 `ChptModalDock`。

## 顯示 / 反饋

| 組件 | Props | Emits |
|---|---|---|
| `ChptAlert` | show, type(`success`/`info`/`warning`/`danger`), title, message, showIcon, closable, fullWidth | close |
| `ChptTag` | label, color(含 dark/light), isOutline, size, icon, closable | close |
| `ChptBadge` | count, isDot, max, showZero, status, position, offset, color | – |
| `ChptAvatar` | src, icon, name, alt, size, backgroundColor（真實 Avatar） | – |
| `ChptSpinner` | loading, size, text, color, fullWidth, center | – |
| `ChptSkeleton` | loading, rows, rowWidth, rowHeight, color, fullWidth | – |
| `ChptEmpty` | icon, title, description, iconSize, iconColor, fullWidth | slot: `action` |
| `ChptProgress` | modelValue, status, strokeWidth, trackColor, showLabel | update:modelValue |
| `ChptToast` | 無 props | 需全域掛載一次，配 `useToast()` |

`useToast()` → `success / info / warning / error`；型別 `'success'|'info'|'warning'|'danger'`。

## 佈局 / 導覽 / 流程

| 組件 | Props | Emits | Slots |
|---|---|---|---|
| `ChptCard` | title, icon, padding(none/sm/md/lg), fullWidth, hoverable | click | `header`, `extra`, `footer`, default |
| `ChptDivider` | direction(`horizontal`/`vertical`), text, color | – | default（中間內容） |
| `ChptTabs` | tabs, modelValue, centered | update:modelValue, change | `panel-<index>`、default |
| `ChptSteps` | steps(`{title,status:pending/process/done}`), showLabel | – | – |
| `ChptBreadcrumb` | items(`{label,to?}`), separator | select | `item-<index>` |
| `ChptCollapse` | items(`{title,content?}`), modelValue(`number[]`), multiple | update:modelValue | `content-<index>` |

## 過濾器

| 組件 | Props | Emits | 備註 |
|---|---|---|---|
| `ChptFilter` | type(`select`/`dropdown`/`tag`), modelValue, label, options, placeholder, allValue, showAllOption, disabled, size, fullWidth, valueKey, labelKey, selectClass, labelClass | update:modelValue | 統一入口，`type` 決定形態 |
| `ChptFilterBar` | filters(`{key,label,options,allLabel?,allCount?}`), modelValue(`Record`), showCount, count, countLabel | update:modelValue | 水平多篩選列 |

## 圖表（JS + D3）

詳細用法見 `chart-patterns.md`。

| 組件 | 關鍵 Props | Emits | Slot / Ref |
|---|---|---|---|
| `DualAxisComboChart` | layers(必填), width, height, autoResize, debounceDelay, margin, xScaleType(`band`/`linear`/`time`), xDomain, xAxisLabel, xAxisFormat, xAxisLabelRotate, yLeft*/yRight*, title, showGrid, animationDuration, enableBrush, brushMode, triggerLines, showResetButton | layer-click, layer-hover, tooltip-show, tooltip-hide, selection-change, zoom-reset, chart-ready, chart-resize, axis-drag | slot `tooltip`（`tooltipData`, `tooltipVisible`） |
| `EnterpriseHeatmap` | data, xField, yField, valueField, colorScheme, colorRange, valueDomain, reverseColorScale, cellPadding/BorderRadius/BorderWidth/BorderColor, xAxisAngle, autoResize, enableBrush, colorLegendPosition | cell-click, cell-hover, tooltip-show/hide, selection-change, zoom-reset, chart-ready, chart-resize | slot `tooltip` |
| `EnterprisePareto` | data, categoryField, valueField, autoSort, sortOrder, barColor, barHoverColor, barPadding, showValuesOnBars, yAxisLeft*/yAxisRight*, xAxisAngle（共 44 props） | bar-click, bar-hover, tooltip-show/hide, chart-ready, chart-resize | slot `tooltip`；ref `render()`, `forceRerender()` |
| `FacetedChart` | facets, title, width, totalHeight, autoResize, margin, facetSpacing, xScaleType, xDomain, xAxisFormat, enableBrush, brushMode, syncBrush, enableAxisDragging, lastFacetExtraHeight | selection-change, zoom-reset, chart-resize, axis-drag | 垂直堆疊多面板，共用 X 軸 |
| `GridFacetChart` | data, xFacetVar, yFacetVar, xFacetLabel, yFacetLabel, headerHeight, headerWidth, xScaleType, enableBrush, syncMode, enableAxisDrag | selection-change, zoom-reset, chart-resize, axis-drag | 2D 行×列分面 |

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
| `/docs/components/form-atoms` | `views/docs/components/FormAtoms.vue` | UI 組件（chpt-input/select/radio/switch/datepicker） |
| `/docs/components/data-filter` | `views/docs/components/DataFilterDocs.vue` | UI 組件（chpt-table/fixedtable/pagination/filter/filterbar） |
| `/docs/components/feedback` | `views/docs/components/FeedbackDocs.vue` | UI 組件（alert/tag/badge/toast/progress/spinner/empty/skeleton） |
| `/docs/components/interactive` | `views/docs/components/InteractiveDocs.vue` | UI 組件（tabs/toast/button/progress/alert） |
| `/docs/components/overlay` | `views/docs/components/OverlayDocs.vue` | UI 組件（modal/drawer/popconfirm/modaldock） |
| `/docs/components/tooltip` | `views/docs/TooltipDoc.vue` | UI 組件（theme/placement/content） |
| `/docs/components/layout-nav` | `views/docs/components/LayoutNavDocs.vue` | UI 組件（card/collapse/breadcrumb/steps/divider） |
| `/docs/components/theme-tools` | `views/docs/components/ThemeToolsDocs.vue` | UI 組件（darkmodetoggle/headerlogout） |
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
