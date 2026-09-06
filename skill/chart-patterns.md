# D3 圖表組件開發規範

本專案的圖表組件（`DualAxisComboChart`、`EnterpriseHeatmap`、`EnterprisePareto`、`FacetedChart`、`GridFacetChart`）都是 **Vue 3 `<script setup>` (JS，非 TS) + D3 v7 命令式渲染**。修改或新增圖表時照抄以下模式。

## 1. 檔案骨架

```vue
<template>
  <div ref="containerRef" class="xxx-chart"
       :style="autoResize ? {} : { width: width + 'px', height: height + 'px' }">
    <svg ref="svgRef" :width="effectiveWidth" :height="effectiveHeight">
      <defs>
        <!-- clipPath 一定要帶唯一 id，避免同頁多實例互相覆蓋 -->
        <clipPath :id="`clip-${chartId}`"><rect :width="chartWidth" :height="chartHeight" /></clipPath>
      </defs>
      <g :transform="`translate(${margin.left}, ${margin.top})`">
        <!-- 圖層順序：背景 → 網格 → 資料 → 座標軸 → 圖例 / 標題 -->
        <g ref="gridLayerRef" class="grid-layer"></g>
        <g :clip-path="`url(#clip-${chartId})`">
          <g ref="barLayerRef"></g>
          <g ref="lineLayerRef"></g>
          <g v-if="enableBrush" ref="brushLayerRef" class="brush-layer"></g>  <!-- brush 必在最上層才收得到事件 -->
        </g>
        <g ref="xAxisRef" :transform="`translate(0, ${chartHeight})`" class="x-axis"></g>
        <g ref="yAxisLeftRef" class="y-axis-left"></g>
        <g ref="legendLayerRef"></g>
      </g>
    </svg>
    <slot name="tooltip" :tooltip-data="tooltipData" :tooltip-visible="tooltipVisible" />
  </div>
</template>
```

要點：
- **每個圖層一個 `<g ref>`**，D3 只在該 `<g>` 內操作，Vue 不碰 SVG 內部節點。
- `chartId` 用唯一值（例如 `Math.random().toString(36)` 或計數器）產生，避免 `clipPath` / `gradient` id 撞名。
- Tooltip 一律透過 **具名 slot `tooltip`** 對外開放，內建預設可用 `CommonTooltip`。

## 2. Props 分區（照這個順序寫，用 `// === 區段 ===` 分隔）

```js
const props = defineProps({
  // === 基礎配置 ===
  width: { type: Number, default: 800 },
  height: { type: Number, default: 500 },
  autoResize: { type: Boolean, default: false },
  debounceDelay: { type: Number, default: 150 },
  margin: { type: Object, default: () => ({ top: 60, right: 80, bottom: 60, left: 80 }) },

  // === 數據 / 圖層配置 ===
  layers: { type: Array, required: true },

  // === 欄位映射 ===
  xField: { type: String, default: 'x' },

  // === 軸配置 ===
  xScaleType: { type: String, default: 'band' },   // 'band' | 'linear' | 'time'
  xAxisFormat: { type: Function, default: null },
  xAxisLabelRotate: { type: Number, default: 0 },

  // === 色階配置 ===
  // === 互動配置 ===
  enableBrush: { type: Boolean, default: false },
  showResetButton: { type: Boolean, default: true },
})
```
每個 prop **都要有 `type` 與 `default`**，並加繁中行內註解。

## 3. `layers` 資料結構（DualAxisComboChart / FacetedChart / GridFacetChart 共用）

```js
layers: [
  {
    type: 'stacked-bar',              // 'stacked-bar' | 'bar' | 'line'
    data: [...],
    yAxis: 'left',                    // 'left' | 'right'
    stackKeys: ['pass', 'fail'],      // 堆疊系列
    xValue: d => d.category,          // 取 X 值函式
    yValue: d => d.value,             // line 用
    colorScale: d3.scaleOrdinal(d3.schemeCategory10),
    lineColor: '#ff6b6b',
    strokeWidth: 2,
    showDots: true,
    legend: { show: true, position: 'top-right' },
  },
]
```
`FacetedChart` 的 `facets` 是 `[{ id, title, layers: [...] }]`；`GridFacetChart` 則用 `data` + `xFacetVar` / `yFacetVar` 自行分組。

## 4. 共用 composables（別重造輪子）

| Composable | 位置 | 用途 |
|---|---|---|
| `useChartScales(props, chartWidth, chartHeight, currentXDomain, currentYLeftDomain, currentYRightDomain)` | `composables/d3/useChartScales.js` | 建立 x / yLeft / yRight scale、依 brush 範圍過濾資料、堆疊資料預處理、自動算 Y domain。回傳 `xScale, yLeftScale, yRightScale, leftLayers, rightLayers, originalXDomain, originalYLeftDomain, originalYRightDomain`。支援 `linear / log / sqrt / time / symlog`。 |
| `useD3Brush(emit)` | `composables/d3/useD3Brush.js` | 回傳 `resetBtnShow, createBrushInstance(dimensions, onBrushEnd), handleBrushEnd(event, scales, redraw), resetZoom(...)`，並自動 emit `selection-change` / `zoom-reset`。 |
| `createBrushX({ width, height, xScaleForBrush, onBrush, onEnd })` | `composables/useBrushX.js` | 只需要水平 brush 時用。 |
| `useFacetLayout(props, emit)` / `useVerticalFacetLayout` / `useGridFacetLayout` | `composables/d3/faceChart/useFacetLayout.js` | 分面佈局計算。 |
| `useFacetBrush()` | `composables/d3/faceChart/useFacetBrush.js` | 多面板 brush 同步。 |
| `useScales({ props, containerWidthRef, parseTime })`、`renderXAxis` / `renderValueAxesLeft` / `renderValueAxesRight` | `composables/boxplot/` | 箱形圖專用軸與尺度。 |

顏色：`import { chartColorPalette, DEFAULT_COLOR_PALETTE } from '@/config/colorPalette'`；一般工具在 `src/utils/chartUtils.js`（`getColor(index)`、`drawTotalLegend`）、`src/utils/d3ParetoUtils.js`（`transformToParetoData`）。

## 5. 響應式（autoResize）

用 `ResizeObserver` + debounce（`debounceDelay`，預設 150ms），更新 `effectiveWidth` / `effectiveHeight` 後重繪，並 emit `chart-resize`。`onUnmounted` 必須 `disconnect()`。

```js
let ro = null
onMounted(() => {
  if (!props.autoResize) return
  ro = new ResizeObserver(debounce(() => { /* 更新尺寸 → render() */ }, props.debounceDelay))
  ro.observe(containerRef.value)
})
onUnmounted(() => ro?.disconnect())
```

## 6. 重繪時機

用 `watch` / `watchEffect` 監聽 `props.data`、`props.layers`、尺寸、domain 變化後呼叫 `render()`。`render()` 內部一律：

1. `d3.select(layerRef.value).selectAll('*').remove()`（或用 join 更新）
2. 重新計算 scale
3. 繪製
4. 需要動畫時用 `.transition().duration(props.animationDuration)`

**不要**在 template 用 `v-for` 產生 SVG 資料元素再讓 D3 也去操作同一批節點。

## 7. Emits 命名慣例

`chart-ready`、`chart-resize`、`selection-change`、`zoom-reset`、`tooltip-show`、`tooltip-hide`、`{element}-click`、`{element}-hover`（例：`bar-click`、`cell-hover`、`layer-click`）。全部 kebab-case。

## 8. 對外方法

需要外部主動控制時用 `defineExpose`，既有慣例：`render()`、`forceRerender()`（圖表）、`zoomIn/zoomOut/resetView/toggleLayer`（Gerber / PCB 檢視器）。

## 9. Reset 按鈕

啟用 brush 時，右上角固定樣式的 Reset 按鈕：

```vue
<button v-if="resetBtnShow && enableBrush && showResetButton" @click="handleResetZoom"
  class="absolute top-2 right-2 px-3 py-1.5 bg-white/30 hover:bg-white/80 text-gray-600 text-sm
         rounded-md border border-gray-200 backdrop-blur shadow-sm opacity-70 hover:opacity-100
         transition-all duration-200 z-10">
  🔄 Reset
</button>
```
（容器需要 `relative`。）

## 10. 效能

- 資料量大時避免每次 `remove()` 全部重繪，改用 `.data(...).join(...)`。
- 事件用 `layer` 級委派，不要每個元素綁 `mousemove` 造成大量 listener。
- `EnterprisePareto`（44 props）、`EnterpriseHeatmap`（37 props）已經很龐大，新需求優先加 prop 或用 slot，不要 fork 一份新檔案。
