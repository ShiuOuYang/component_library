# YM Dashboard 元件庫

基於 Vue 3 + D3.js 的企業級 UI 元件庫，提供圖表、資料表格、篩選器與彈窗等可重用元件。

## 快速開始

```bash
npm install
npm run dev   # http://localhost:4000/docs
```

啟動後前往 `/docs` 即可瀏覽互動文件。

---

## 圖表元件

### DualAxisComboChart

雙 Y 軸複合圖表，支援堆疊柱狀圖與折線圖任意組合。

```vue
<DualAxisComboChart
  :layers="[
    { type: 'stacked-bar', data, yAxis: 'left', stackKeys, xValue, colorScale, legend },
    { type: 'line',        data, yAxis: 'right', xValue, colorScale, legend }
  ]"
  :auto-resize="true"
  :enable-brush="true"
  x-scale-type="time"
/>
```

| Prop | 類型 | 說明 |
|---|---|---|
| `layers` | `Array` | 圖層設定，每層含 `type`、`data`、`yAxis`、`stackKeys`、`colorScale` |
| `xScaleType` | `'band'` \| `'linear'` \| `'time'` | X 軸刻度類型 |
| `enableBrush` | `Boolean` | 開啟 brush 縮放（含 Reset 按鈕） |
| `autoResize` | `Boolean` | ResizeObserver 自動調整尺寸 |
| `triggerLines` | `Array` | 標記用橫向參考線 |

**Emits:** `selection-change`、`zoom-reset`  
**Slot:** `#tooltip`（自訂 Tooltip 內容）

---

### EnterprisePareto

柏拉圖（降冪柱狀 + 累積百分比折線），內建 80% 參考線與自動排序。

```vue
<EnterprisePareto
  :data="items"
  category-field="defect"
  value-field="count"
  auto-sort
  x-axis-angle="-45"
/>
```

| Prop | 類型 | 說明 |
|---|---|---|
| `data` | `Array` | 資料陣列 |
| `categoryField` | `String` | 分類欄位名稱 |
| `valueField` | `String` | 數值欄位名稱 |
| `autoSort` | `Boolean` | 自動依數值降冪排序 |
| `sortOrder` | `'desc'` \| `'asc'` \| `'none'` | 排序方向 |

**Slot:** `#tooltip`

---

### EnterpriseHeatmap

熱力圖，支援 brush 縮放與色階圖例（右側或底部）。

```vue
<EnterpriseHeatmap
  :data="matrix"
  :auto-resize="true"
  :enable-brush="true"
  color-legend-position="right"
/>
```

---

### FacetedChart

垂直堆疊多面板圖表，共用同一 X 軸，適合多產品線 / 機台時序對比。

```vue
<FacetedChart
  :facets="[
    { id: 'lineA', title: 'Line A', layers: [...] },
    { id: 'lineB', title: 'Line B', layers: [...] }
  ]"
  :sync-brush="true"
  x-scale-type="time"
/>
```

---

### GridFacetChart

2D 格狀（行 × 列）分面圖表，適合 Region × Product 矩陣分析。

---

### BoxPlotChart

D3 箱形圖 / 散點疊加，用於站點良率分佈分析。

| Prop | 說明 |
|---|---|
| `data` | 站點資料陣列 |
| `legendType` | 圖例欄位名稱或 `'status'` |
| `enableLegendHighlight` | 點擊圖例高亮切換 |
| `blinkingLegends` | 指定閃爍的圖例項目 |

**Emits:** `data-click`、`tooltip-show`、`tooltip-hide`

---

### D3BarChartWithBrush

帶 brush 縮放的柱狀圖，支援堆疊模式與雙層 X 軸分組。

| Prop | 說明 |
|---|---|
| `useStackedBar` | 啟用堆疊模式 |
| `xGroupKey` | 雙層 X 軸的上層分組鍵 |
| `seriesKeyArray` | 多系列鍵值陣列 |

**Emits:** `bar-click`、`selection-change`  
**Slot:** `#tooltip`

---

### UniversalStackedChart

通用堆疊柱狀圖，接受預處理資料或原始 store 資料，高度可設定。

```vue
<UniversalStackedChart
  :raw-data="storeData"
  :stack-keys="['pass', 'fail']"
  x-key="station"
  value-label-mode="both"
  x-axis-label-mode="rotate"
/>
```

---

### D3LineChart

簡易折線圖，支援曲線類型切換、面積填充、動畫與十字準線。

| Prop | 可選值 |
|---|---|
| `curve` | `'curveBasis'` \| `'curveLinear'` \| `'curveMonotoneX'` \| `'curveCardinal'` |
| `showArea` | 面積填充 |
| `showCrosshair` | 十字準線 |

---

### GantChart

甘特圖，支援計畫 / 實際雙條對比、縮放與成員顯示。

```vue
<GantChart ref="gantt" :data="projectData" :time="[{year:2026, month:4}]" />
```

透過 `ref` 呼叫 `zoomIn()`、`zoomOut()`、`resetZoom()`。

---

### GerberViewer

PCB Gerber 檔案渲染器，含圖層切換面板（深色主題）。

---

## 資料表格元件

### CommonTable

功能完整的資料表格，內建搜尋、分頁、欄位排序。

```vue
<CommonTable :data="rows" :columns="cols" :page-size="20" pagination="bottom">
  <template #right-controls>
    <ExcelExporter :data="rows" />
  </template>
</CommonTable>
```

**Slots:** `#left-controls`、`#right-controls`（工具列插槽）

---

### JxFixedTable

固定標題 / 固定欄位的捲動表格，適合大量欄位資料。

```vue
<JxFixedTable :columns="cols" :data="rows" />
```

欄位設定加上 `defaultFixed: true` 即可釘住該欄。

---

## 篩選器元件

### FilterDropdown

多選核取方塊下拉選單，支援全選 / 取消全選。

```vue
<FilterDropdown v-model="selected" label="站點" :options="stationOptions" />
```

---

### FilterBar

水平篩選列，整合多個 `<select>` 下拉，可顯示資料筆數。

```vue
<FilterBar v-model="filters" :filters="filterConfig" show-count :count="total" />
```

---

### FilterSelect

單選下拉，支援「全部」選項與 disabled 狀態。

---

### TagFilterDropdown

標籤式多選下拉，含內建搜尋、選取數量徽章與一鍵清除。

```vue
<TagFilterDropdown v-model="tags" label="料號" :options="partNumbers" />
```

---

## UI / 彈窗元件

### DraggableModal

可拖曳、可最大化的浮動彈窗（Teleport 至 body）。

```vue
<DraggableModal v-model="show" title="詳細資訊" :maximizable="true">
  <template #default>...</template>
</DraggableModal>
```

| Prop | 說明 |
|---|---|
| `draggable` | 可拖曳標題列 |
| `maximizable` | 最大化 / 還原按鈕 |
| `backdropOpacity` | 背景遮罩透明度 |

---

### CommonTooltip

彈性 Tooltip（Teleport 至 body），支援自訂內容槽、鍵值列表與互動模式。

```vue
<CommonTooltip :visible="show" :position="pos" :data="{ title: '站點A', items: [...] }" />
```

---

## 其他工具元件

| 元件 | 說明 |
|---|---|
| `ExcelExporter` | 將資料陣列匯出為 `.xlsx` 檔案 |
| `ExcelUploader` | 上傳並解析 Excel 檔案 |
| `CodeBlock` | 語法高亮程式碼片段展示 |
| `TabNavigation` | 頁籤導航列 |
| `Pagination` / `PageSwitcher` | 獨立分頁控制元件 |
| `JxButton` / `JxCheckBox` / `JxIcon` | 基礎 UI 原子元件 |
| `JxInput` | 文字輸入框，支援 clearable、前綴圖示、錯誤訊息 |
| `JxRadio` | 單選按鈕群組 |
| `JxSwitch` | 開關切換元件 |
| `JxSelect` | 通用單選下拉選單（非篩選用，無「全部」選項） |
| `JxDatePicker` | 日期 / 日期時間選擇器 |

---

## 所有元件路徑

所有核心元件統一從 `src/components/common/index.js` 匯出：

```js
import {
  DualAxisComboChart, EnterprisePareto, EnterpriseHeatmap,
  FacetedChart, GridFacetChart,
  CommonTable, JxFixedTable,
  FilterDropdown, FilterBar, FilterSelect, TagFilterDropdown,
  DraggableModal, CommonTooltip,
  ExcelExporter, ExcelUploader, CodeBlock,
  JxInput, JxRadio, JxSwitch, JxSelect, JxDatePicker
} from '@/components/common'
```

---

## 文件頁面

啟動開發伺服器後，各元件的互動文件與範例位於：

| 路徑 | 說明 |
|---|---|
| `/docs/components/dual-axis-chart` | DualAxisComboChart 文件 |
| `/docs/components/pareto` | EnterprisePareto 文件 |
| `/docs/components/heatmap` | EnterpriseHeatmap 文件 |
| `/docs/components/tooltip` | CommonTooltip 文件 |
| `/docs/components/common-table` | CommonTable 文件 |
| `/docs/components/filter-dropdown` | FilterDropdown 文件 |
| `/docs/components/filter-bar` | FilterBar 文件 |
| `/docs/components/filter-select` | FilterSelect 文件 |
| `/docs/components/tag-filter-dropdown` | TagFilterDropdown 文件 |
| `/docs/components/draggable-modal` | DraggableModal 文件 |
| `/docs/components/gerber-viewer` | GerberViewer 文件 |
