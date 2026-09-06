# 組件清單（src/components/common/）

> 此清單由實際原始碼萃取，**以此為準，不要相信 README.md**（README 提到的 `Jx*`、`GantChart`、`BoxPlotChart`、`UniversalStackedChart`、`D3LineChart`、`D3BarChartWithBrush`、`JxFixedTable` 在 repo 內不存在）。
> 統一引入方式：`import { ChptButton, ChptTable } from '@/components/common'`

## 目錄
- [相容別名對照](#相容別名對照)
- [基礎表單原子元件（TS）](#基礎表單原子元件ts)
- [資料呈現](#資料呈現)
- [Modal / 浮層](#modal--浮層)
- [顯示 / 反饋](#顯示--反饋)
- [佈局 / 導覽 / 流程](#佈局--導覽--流程)
- [過濾器](#過濾器)
- [圖表（JS + D3）](#圖表js--d3)
- [Excel / 匯出上傳](#excel--匯出上傳)
- [主題 / 其他](#主題--其他)
- [文檔路由對照](#文檔路由對照)

---

## 相容別名對照

以下檔案只是 3~6 行的 re-export shim，**改樣式或邏輯請改右邊的本尊**：

| 別名檔 | 實體 |
|---|---|
| `CommonTable.vue` | `ChptTable.vue` |
| `ExcelEditor.vue` | `ChptExcelEditor.vue` |
| `ExcelExporter.vue` | `ChptExcelExporter.vue` |
| `ExcelUploader.vue` | `ChptExcelUploader.vue` |
| `TabNavigation.vue` | `ChptTabNavigation.vue` |
| `PageSwitcher.vue` | `ChptPageSwitcher.vue` |
| `ModalDock.vue` | `ChptModalDock.vue` |
| `HeaderLogoutButton.vue` | `ChptHeaderLogoutButton.vue` |
| `FixedTable`（僅 index.js 匯出名） | `ChptFixedTable.vue` |

**非別名、真的是獨立實作**（新舊兩套並存，功能重疊，選一套用即可）：
`FilterBar.vue`、`FilterSelect.vue`、`FilterDropdown.vue`、`TagFilterDropdown.vue`、`Pagination.vue`、`PaginationControls.vue`、`CodeBlock.vue`、`CommonTooltip.vue`、`DraggableModal.vue`、`ParetoChart.vue`、`SimpleDarkModeToggle.vue`。

選用建議：新頁面優先用 `Chpt*`（TS、型別完整）；`DraggableModal` 與 `ChptModal`（`mode="window"`）功能重疊，新程式碼用 `ChptModal`。

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
| `ChptTable` | data, columns, searchPlaceholder, noDataText, defaultPageSize, customFilter, defaultSort, paginationPosition(`top`/`bottom`/`both`), 以及一整組外觀 props（containerBgColor, headerBgGradient, evenRowBgColor, hoverRowBgColor, fontSize…） | search, sort, update:page, update:pageSize | slots: `left-controls`, `right-controls`, `bottom-left-controls`, `bottom-right-controls`, `table-row`, `footer`, `modals`；ref: `refresh()`, `resetPage()`, `resetSort()`, `enableColumnSort()` |
| `ChptFixedTable` | columns, data, isFixed, fixedColumns, isFilter, filterColumns, isKeep, viewportOffset, showSearch, searchText, headerFontSize, cellFontSize, divideColor/Opacity/Direction/Size, isPagination, defaultPageSize | update:fixedColumns, update:filterColumns, update:searchText | slot: `header` |
| `ChptPagination` | variant, currentPage, itemsPerPage, totalItems, pageSizeOptions, showSummary, showPageSize, bgColor | change, update:currentPage, update:itemsPerPage | – |
| `PaginationControls` | currentPage, totalPages, pageSize, total, bgColor | – | 精簡版，`ChptTable` 內部使用 |
| `Pagination` | totalItems, itemsPerPage, currentPage, pageSizeOptions | change, update:currentPage, update:itemsPerPage | 舊版獨立實作 |
| `ChptCodeBlock` / `CodeBlock` | code, language, trimIndent, tip, tipType, tipTitle | – | slot: `tip` |
| `ChptTabNavigation` | tabs, fontSize | – | – |
| `ChptPageSwitcher` | title, pages, footerHint | – | – |

`Column` 型別：`{ key?, title, sortable?, sortType?: 'string'|'number'|'date', style? }`

## Modal / 浮層

| 組件 | Props（重點） | Emits | Ref 方法 |
|---|---|---|---|
| `ChptModal` | modelValue, mode(`dialog`/`window`), title, id, width, height, size, closable, maskClosable, backdropOpacity, bodyHeight, draggable, resizable, minimizable, maximizable, x, y, minWidth, minHeight, defaultMaximized, headerBgColor, headerTextColor, borderClass | update:modelValue, open, close, minimize, maximize, restore | modalId, open, close, minimize, maximize, restore |
| `DraggableModal` | 同上一組（26 個），偏 window 模式 | update:modelValue | modalId, open, close, minimize, maximize, restore |
| `ChptDrawer` | modelValue, title, placement, size, closable, maskClosable, backdropOpacity | update:modelValue, close | slot: `footer` |
| `ChptPopconfirm` | message, confirmText, cancelText, color | confirm, cancel | slot: `message` |
| `ChptModalDock` | zIndex | – | 最小化視窗停靠列，配合 `useModalManager` |
| `ChptTooltip` | content, placement, theme, showArrow, maxWidth, disabled | show, hide | slot: `content`（包裹式，hover 觸發） |
| `CommonTooltip` | visible, position, data, theme, placement, showArrow, offset, maxWidth, interactive, strategy, autoAdjustPosition, persistent, clickToClose | close | 受控式（自行管理 visible/position），圖表 tooltip 常用 |

## 顯示 / 反饋

| 組件 | Props | Emits |
|---|---|---|
| `ChptAlert` | show, type(`success`/`info`/`warning`/`danger`), title, message, showIcon, closable, fullWidth | close |
| `ChptTag` | label, color, isOutline, size, icon, closable | close |
| `ChptBadge` | count, isDot, max, showZero, status, position, offset, color | – |
| `ChptAvatar` | src, icon, name, alt, size, backgroundColor | – |
| `ChptSpinner` | loading, size, text, color, fullWidth, center | – |
| `ChptSkeleton` | loading, rows, rowWidth, rowHeight, color, fullWidth | – |
| `ChptEmpty` | icon, title, description, iconSize, iconColor, fullWidth | slot: `action` |
| `ChptProgress` | modelValue, status, strokeWidth, trackColor, showLabel | update:modelValue |
| `ChptToast` | 無 props | 需全域掛載一次，搭配 `useToast()` |

`useToast()` → `success / info / warning / error / show / remove`，型別 `'success'|'info'|'warning'|'danger'`。

## 佈局 / 導覽 / 流程

| 組件 | Props | Emits | Slots |
|---|---|---|---|
| `ChptCard` | title, icon, padding, fullWidth, hoverable | click | `header`, `extra`, `footer`, default |
| `ChptDivider` | direction, text, color | – | – |
| `ChptTabs` | tabs, modelValue, centered | update:modelValue, change | `panel` |
| `ChptSteps` | steps, showLabel | – | – |
| `ChptBreadcrumb` | items, separator | select | – |
| `ChptCollapse` | items, modelValue, multiple | update:modelValue | – |

## 過濾器

| 組件 | Props | Emits | 備註 |
|---|---|---|---|
| `ChptFilter` | type, modelValue, label, options, placeholder, allValue, showAllOption, disabled, size, fullWidth, valueKey, labelKey, selectClass, labelClass | update:modelValue | 統一入口，`type` 決定形態 |
| `ChptFilterBar` / `FilterBar` | filters, modelValue, showCount, count, countLabel | update:modelValue | 水平多篩選列 |
| `FilterSelect` | modelValue, options, label, placeholder, allValue, disabled, size, fullWidth, valueKey, labelKey, showAllOption, numberValue | update:modelValue | 單選 + 「全部」 |
| `FilterDropdown` | label, options, modelValue, placeholder | update:modelValue | 多選 checkbox 下拉 |
| `TagFilterDropdown` | label, options, modelValue, placeholder, isUnselectAll | update:modelValue | 標籤式多選 + 搜尋 |

## 圖表（JS + D3）

詳細用法見 `chart-patterns.md`。

| 組件 | 關鍵 Props | Emits | Slot / Ref |
|---|---|---|---|
| `DualAxisComboChart` | layers(必填), width, height, autoResize, debounceDelay, margin, xScaleType(`band`/`linear`/`time`), xDomain, xAxisLabel, xAxisFormat, xAxisLabelRotate, yLeft*/yRight*(ScaleType/Domain/AxisLabel/AxisFormat), title, showGrid, animationDuration, enableBrush, brushMode, triggerLines, showResetButton | layer-click, layer-hover, tooltip-show, tooltip-hide, selection-change, zoom-reset, chart-ready, chart-resize, axis-drag | slot `tooltip`（`tooltipData`, `tooltipVisible`） |
| `EnterpriseHeatmap` | data, xField, yField, valueField, colorScheme, colorRange, valueDomain, reverseColorScale, cellPadding/BorderRadius/BorderWidth/BorderColor, xAxisAngle, autoResize, enableBrush, colorLegendPosition | cell-click, cell-hover, tooltip-show/hide, selection-change, zoom-reset, chart-ready, chart-resize | slot `tooltip` |
| `EnterprisePareto` | data, categoryField, valueField, autoSort, sortOrder, barColor, barHoverColor, barPadding, showValuesOnBars, yAxisLeft*/yAxisRight*, xAxisAngle（共 44 個 props） | bar-click, bar-hover, tooltip-show/hide, chart-ready, chart-resize | slot `tooltip`；ref `render()`, `forceRerender()` |
| `ParetoChart` | paretoInputData, cumulativeThreshold, chartWidth, chartHeight, showStatistics, colorScheme, 各種 label | update:paretoData, chartRendered, error | 舊版柏拉圖，含統計區塊 |
| `FacetedChart` | facets, title, width, totalHeight, autoResize, margin, facetSpacing, xScaleType, xDomain, xAxisFormat, enableBrush, brushMode, syncBrush, enableAxisDragging, lastFacetExtraHeight | selection-change, zoom-reset, chart-resize, axis-drag | 垂直堆疊多面板，共用 X 軸 |
| `GridFacetChart` | data, xFacetVar, yFacetVar, xFacetLabel, yFacetLabel, headerHeight, headerWidth, xScaleType, enableBrush, syncMode, enableAxisDrag | selection-change, zoom-reset, chart-resize, axis-drag | 2D 行×列分面 |
| `GerberViewer` | src, gerberText, fillColor, layers, backgroundColor, showInfo, showControls, showLayerPanel, autoResize, padding, maxZoom, minZoom, showMovePath | loaded, error, zoom-change | ref `zoomIn/zoomOut/resetView/reload/toggleLayer` |
| `PcbLayout` | data, backgroundColor, colorMap, showInfo, showControls, showLayerPanel, autoResize, padding, maxZoom, minZoom, defaultTraceWidth, defaultPadSize, showRefDes | loaded, error, element-click, element-hover, zoom-change | ref `zoomIn/zoomOut/resetView/toggleLayer/forceRender` |

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
| `ChptDarkModeToggle` | variant, initialDarkMode, showControls, syncBodyByDefault, darkMode | toggle, update:darkMode | toggle, isDarkMode |
| `SimpleDarkModeToggle` | initialDarkMode, showControls, syncBodyByDefault | toggle, update:darkMode | toggle, isDarkMode |
| `ChptHeaderLogoutButton` | size, variant, label, customClass | – | – |

其他非 common 目錄組件：`src/components/SchematicViewer.vue`、`src/components/GlobalNotifications.vue`、`src/components/whiteboard/*`（WhiteboardCanvas / Toolbar / PageRail）。

---

## 文檔路由對照

| 路由 | 檔案 |
|---|---|
| `/docs` | `views/docs/Home.vue` |
| `/docs/components/dual-axis-chart` | `views/docs/DualAxisChartDoc.vue` |
| `/docs/components/pareto` | `views/docs/ParetoDoc.vue` |
| `/docs/components/heatmap` | `views/docs/HeatmapDoc.vue` |
| `/docs/components/tooltip` | `views/docs/TooltipDoc.vue` |
| `/docs/components/common-table` | `views/docs/CommonTableDoc.vue` |
| `/docs/components/gerber-viewer` | `views/docs/GerberViewerDoc.vue` |
| `/docs/components/pcb-layout` | `views/docs/PcbLayoutDoc.vue` |
| `/docs/components/whiteboard` | `views/docs/WhiteboardDoc.vue` |
| `/docs/components/form-atoms` | `views/docs/components/FormAtoms.vue` |
| `/docs/components/feedback` | `views/docs/components/FeedbackDocs.vue` |
| `/docs/components/interactive` | `views/docs/components/InteractiveDocs.vue` |
| `/docs/components/overlay` | `views/docs/components/OverlayDocs.vue` |
| `/docs/components/layout-nav` | `views/docs/components/LayoutNavDocs.vue` |
| `/docs/components/data-filter` | `views/docs/components/DataFilterDocs.vue` |
| `/docs/components/theme-tools` | `views/docs/components/ThemeToolsDocs.vue` |
| `/docs/components/excel-editor` | `views/docs/components/ExcelEditorDocs.vue` |
| `/docs/components/filter-dropdown` `/filter-bar` `/filter-select` `/tag-filter-dropdown` `/draggable-modal` | `views/docs/components/` 同名檔 |
| `/docs/components/pie-chart` `/gauge` `/gantt` `/legend` `/guide/*` | `ComponentPlaceholder.vue`（**尚未實作，可接手補**） |
