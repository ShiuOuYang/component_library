<template>
  <div 
    ref="containerRef" 
    class="grid-facet-chart"
    :class="{ 'auto-resize': autoResize }"
    :style="containerStyle"
    role="group"
    :aria-label="title || '網格分面圖'"
  >
    <!-- 標題列：標題（左）+ 共用圖例（右）
         ⚠️ 原本標題的模板整段被註解掉，title prop 傳了也不會顯示 -->
    <div v-if="titleBarHeight" class="title-bar" :style="{ height: `${titleBarHeight}px` }">
      <span class="title-text">{{ title }}</span>
      <div v-if="sharedLegend && legendEntries.length" class="shared-legend" role="group" aria-label="圖例（點選可隱藏或顯示系列）">
        <button
          v-for="entry in legendEntries"
          :key="entry.label"
          type="button"
          class="legend-chip"
          :aria-pressed="!hiddenSeries.has(entry.label)"
          @click="toggleSeries(entry.label)"
        >
          <span class="legend-swatch" :class="entry.type === 'line' ? 'is-line' : ''" :style="{ backgroundColor: entry.color }" aria-hidden="true"></span>
          {{ entry.label }}
        </button>
      </div>
    </div>

    <!-- 列標題（X 軸分面變數）：有 xFacetLabel 時顯示「標籤：值」，否則只顯示值 -->
    <div
      v-for="(colValue, colIndex) in uniqueXValues"
      :key="`col-${colValue}`"
      class="col-header"
      :style="getColHeaderStyle(colIndex)"
    >
      <span class="header-text" :title="headerText(xFacetLabel, colValue)">{{ headerText(xFacetLabel, colValue) }}</span>
    </div>

    <!-- 行標題（Y 軸分面變數） -->
    <div
      v-for="(rowValue, rowIndex) in uniqueYValues"
      :key="`row-${rowValue}`"
      class="row-header"
      :style="getRowHeaderStyle(rowIndex)"
    >
      <span class="header-text" :title="headerText(yFacetLabel, rowValue)">{{ headerText(yFacetLabel, rowValue) }}</span>
    </div>
    
    <!-- 圖表網格 -->
    <div
      v-for="facetData in gridFacets"
      :key="facetData.id"
      class="grid-cell"
      :class="[
        `grid-row-${facetData.row}`,
        `grid-col-${facetData.col}`,
        { 'grid-row-last': facetData.row === rows - 1 },
        { 'grid-col-first': facetData.col === 0 },
        { 'grid-col-last': facetData.col === cols - 1 }
      ]"
      :style="getGridCellStyle(facetData.row, facetData.col)"
      role="group"
      :aria-label="`${headerText(xFacetLabel, facetData.xValue)}，${headerText(yFacetLabel, facetData.yValue)}`"
    >
      <DualAxisComboChart
        :key="`chart-${facetData.id}-v${chartVersion}-reset${resetTrigger}`"
        :width="cellWidth"
        :height="cellHeight"
        :auto-resize="false"
        :margin="getCellMargin(facetData.row, facetData.col)"
        :layers="applySharedLegend(facetData.layers, hiddenSeries, sharedLegend)"
        :x-scale-type="xScaleType"
        :x-domain="getFacetXDomain(facetData)"
        :x-axis-format="xAxisFormat || undefined"
        :x-axis-label-rotate="xAxisLabelRotate"
        :y-left-scale-type="facetData.yLeftScaleType || 'linear'"
        :y-left-domain="getFacetYLeftDomain(facetData)"
        :y-left-axis-format="facetData.yLeftAxisFormat"
        :y-right-scale-type="facetData.yRightScaleType"
        :y-right-domain="getFacetYRightDomain(facetData)"
        :y-right-axis-format="facetData.yRightAxisFormat"
        :trigger-lines="facetData.triggerLines || []"
        :enable-brush="enableBrush"
        :brush-mode="brushMode"
        :show-reset-button="false"
        :show-grid="showGrid"
        :animation-duration="300"
        :title="''"
        :enable-axis-drag="enableAxisDrag"
        @selection-change="handleSelectionChange($event, facetData.id)"
        @axis-drag="handleAxisDrag($event, facetData.id)"
        @zoom-reset="handleResetZoom"
      >
        <!-- Tooltip 插槽：payload 型別由子元件的 slot 定義推論而來 -->
        <template #tooltip="{ tooltipData, tooltipVisible }">
          <slot
            name="tooltip"
            :tooltip-data="tooltipData"
            :tooltip-visible="tooltipVisible"
            :facet="facetData"
          >
            <div
              v-if="tooltipVisible && tooltipData"
              class="default-tooltip"
              role="tooltip"
              :style="fixedTooltipStyle(tooltipData.position)"
            >
              <div class="tooltip-title">
                {{ headerText(xFacetLabel, facetData.xValue) }} · {{ headerText(yFacetLabel, facetData.yValue) }}
              </div>
              <template v-for="(info, i) in [tooltipInfo(tooltipData, facetData)]" :key="i">
                <div v-if="info.xRaw !== null" class="tooltip-x">{{ formatXValue(info.xRaw, xAxisFormat) }}</div>
                <div v-for="row in info.rows" :key="row.label" class="tooltip-row">
                  <span class="tooltip-swatch" :style="{ backgroundColor: row.color }" aria-hidden="true"></span>
                  <span class="tooltip-label">{{ row.label }}</span>
                  <span class="tooltip-value">{{ row.value }}</span>
                </div>
              </template>
            </div>
          </slot>
        </template>
      </DualAxisComboChart>
    </div>

    <!-- 重置按鈕（全域） -->
    <button
      v-if="showResetButton && hasAnyZoom()"
      type="button"
      class="reset-button"
      :style="{ top: `${titleBarHeight + 6}px` }"
      @click="handleResetZoom"
    >
      <span class="material-symbols-outlined" aria-hidden="true">zoom_out_map</span>
      重設縮放
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import DualAxisComboChart from './DualAxisComboChart.vue';
import { unionDomain, useFacetLayout, useGridFacetLayout } from './composables/faceChart/useFacetLayout'
import type { GridFacet, GridFacetDatum } from './composables/faceChart/useFacetLayout'
import type {
  FacetAxisDragEvent,
  FacetBrushEvent,
  FacetSyncMode,
} from './composables/faceChart/useFacetBrush'
import type { BrushMode, TooltipPayload, XDomain, XScaleType, YDomain } from './types/chart.types'
import { useFacetBrush } from './composables/faceChart/useFacetBrush';
import {
  applySharedLegend,
  collectLegend,
  fixedTooltipStyle,
  formatXValue,
  tooltipRows,
} from './composables/faceChart/facetHelpers';

interface GridFacetChartProps {
  // === 數據配置 ===
  /**
   * 網格分面資料。每一筆代表一格，需含 xFacetVar / yFacetVar 指定的欄位，
   * 以及該格的 layers；domain 未提供時由 layers 的資料自動推算。
   */
  data: GridFacetDatum[]
  /** 決定欄的欄位名稱（例如 'region'） */
  xFacetVar: string
  /** 決定列的欄位名稱（例如 'product'） */
  yFacetVar: string
  /** 欄方向的標題（給了才會顯示成「標題：值」） */
  xFacetLabel?: string
  /** 列方向的標題 */
  yFacetLabel?: string

  // === 尺寸配置 ===
  width?: number
  height?: number
  /** 是否隨容器自動調整大小 */
  autoResize?: boolean
  /** 欄表頭高度 */
  headerHeight?: number
  /** 列表頭寬度 */
  headerWidth?: number

  // === 圖表配置 ===
  title?: string
  /** X 軸比例尺種類 */
  xScaleType?: XScaleType
  /** X 軸刻度格式化函式 */
  xAxisFormat?: ((value: unknown) => string) | null
  /** X 軸標籤旋轉角度 */
  xAxisLabelRotate?: number
  /** 是否顯示格線 */
  showGrid?: boolean
  /**
   * 各格的座標軸範圍（同 ggplot 的 facet_wrap(scales = …)）：
   *   - free：每格依自己的資料（原本的行為；適合看各自的形狀）
   *   - fixed：所有格用同一個 X / Y 範圍（適合互相比大小 —— 小倍數圖的標準做法）
   *   - free_x / free_y：只有 X / 只有 Y 各自獨立
   */
  scales?: 'free' | 'fixed' | 'free_x' | 'free_y'
  /** 所有格共用一份圖例（放在標題列右側），點選可同時隱藏 / 顯示某系列 */
  sharedLegend?: boolean

  // === 互動配置 ===
  /** 是否啟用框選縮放 */
  enableBrush?: boolean
  /** 框選模式 */
  brushMode?: BrushMode
  /** 分面之間的同步模式 */
  syncMode?: FacetSyncMode
  /** 是否可拖曳座標軸平移 */
  enableAxisDrag?: boolean
  /** 是否顯示重置縮放按鈕 */
  showResetButton?: boolean
}

const props = withDefaults(defineProps<GridFacetChartProps>(), {
  xFacetLabel: '',
  yFacetLabel: '',
  width: 1200,
  height: 800,
  autoResize: true,
  headerHeight: 40,
  headerWidth: 80,
  title: '',
  xScaleType: 'time',
  xAxisFormat: null,
  xAxisLabelRotate: -45,
  showGrid: true,
  scales: 'free',
  sharedLegend: false,
  enableBrush: true,
  brushMode: 'xy',
  syncMode: 'both',
  enableAxisDrag: false,
  showResetButton: true,
})

const emit = defineEmits<{
  'selection-change': [payload: unknown]
  'axis-drag': [payload: unknown]
  'zoom-reset': []
  'chart-resize': [size: { width: number; height: number }]
}>();

/** 標題列高度：有標題或共用圖例時才佔位 */
const titleBarHeight = computed(() => (props.title || props.sharedLegend ? 36 : 0))

// ===== 使用 Composables =====
const {
  containerRef,
  effectiveWidth,
  effectiveHeight,
  containerStyle,
  chartVersion,
} = useFacetLayout(props, emit as (event: 'chart-resize', payload: { width: number; height: number }) => void);

/** 版面計算要扣掉標題列（getter：保持對 props 的反應性） */
const layoutProps = {
  get data() { return props.data },
  get xFacetVar() { return props.xFacetVar },
  get yFacetVar() { return props.yFacetVar },
  get xScaleType() { return props.xScaleType },
  get headerWidth() { return props.headerWidth },
  get headerHeight() { return props.headerHeight },
  get titleHeight() { return titleBarHeight.value },
}

const {
  uniqueXValues,
  uniqueYValues,
  cols,
  rows,
  cellWidth,
  cellHeight,
  gridFacets,
  getGridCellStyle,
  getColHeaderStyle,
  getRowHeaderStyle,
  getCellMargin,
} = useGridFacetLayout(layoutProps, effectiveWidth, effectiveHeight);

const {
  resetTrigger,
  getXDomain,
  getYLeftDomain,
  getYRightDomain,
  hasAnyZoom,
  handleSelectionChange: handleSelection,
  handleAxisDrag: handleDrag,
  handleResetZoom: handleReset,
} = useFacetBrush();

const headerText = (label: string, value: unknown): string => (label ? `${label}：${String(value)}` : String(value))

// ===== 共用座標範圍（scales） =====

const sharedX = computed(() => unionDomain<XDomain>(gridFacets.value.map((f) => f.xDomain)))
const sharedYLeft = computed(() => unionDomain<YDomain>(gridFacets.value.map((f) => f.yLeftDomain)))
const sharedYRight = computed(() => unionDomain<YDomain>(gridFacets.value.map((f) => f.yRightDomain)))
const fixX = computed(() => props.scales === 'fixed' || props.scales === 'free_y')
const fixY = computed(() => props.scales === 'fixed' || props.scales === 'free_x')

// ===== 計算每個圖表的 Domain（框選同步優先，其次是 scales 設定） =====
const getFacetXDomain = (facet: GridFacet) => {
  return getXDomain(props.syncMode, facet.col, fixX.value ? sharedX.value : facet.xDomain);
};

const getFacetYLeftDomain = (facet: GridFacet) => {
  return getYLeftDomain(props.syncMode, facet.row, fixY.value ? sharedYLeft.value : facet.yLeftDomain);
};

const getFacetYRightDomain = (facet: GridFacet) => {
  return getYRightDomain(props.syncMode, facet.row, fixY.value ? sharedYRight.value : facet.yRightDomain);
};

// ===== 共用圖例 =====

const hiddenSeries = ref<Set<string>>(new Set())
const legendEntries = computed(() => collectLegend(props.data.map((d) => d.layers)))

function toggleSeries(label: string): void {
  const next = new Set(hiddenSeries.value)
  if (next.has(label)) next.delete(label)
  else next.add(label)
  hiddenSeries.value = next
}

// ===== 事件處理（包裝 Composable 函數） =====
type BrushEmit = Parameters<typeof handleSelection>[5]

const handleSelectionChange = (event: FacetBrushEvent, facetId: string): void => {
  const facet = gridFacets.value.find(f => f.id === facetId);
  if (facet) {
    handleSelection(event, facetId, props.syncMode, facet.row, facet.col, emit as unknown as BrushEmit);
  }
};

const handleAxisDrag = (event: FacetAxisDragEvent, facetId: string): void => {
  const facet = gridFacets.value.find(f => f.id === facetId);
  if (facet) {
    handleDrag(event, facetId, props.syncMode, facet.row, facet.col, emit as unknown as BrushEmit);
  }
};

const handleResetZoom = (): void => {
  handleReset(emit as unknown as BrushEmit);
};

// ===== 預設 tooltip =====
const tooltipInfo = (payload: TooltipPayload, facet: GridFacet) =>
  tooltipRows(payload, { yLeft: facet.yLeftAxisFormat, yRight: facet.yRightAxisFormat })

// 容器元素對外開放，方便呼叫端量測尺寸或截圖
defineExpose({ containerRef })
</script>

<style lang="scss" scoped>
.grid-facet-chart {
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background-color: rgb(var(--t-surface-secondary));
  
  &.auto-resize {
    width: 100%;
    height: 100%;
    min-width: 600px;
    min-height: 400px;
  }
}

.title-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px;

  .title-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 1rem;
    font-weight: 700;
    color: rgb(var(--t-content-primary));
  }

  .shared-legend {
    justify-content: flex-end;
  }
}

.col-header,
.row-header {
  background-color: rgb(var(--t-surface-secondary));
  z-index: 10;
  
  .header-text {
    font-size: 0.875rem;
    color: rgb(var(--t-content-primary));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 8px;
  }
}

/* 列表頭是窄欄（預設 80px）：允許換行，最多三行 */
.row-header .header-text {
  white-space: normal;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  line-height: 1.3;
}

.grid-cell {
  background-color: rgb(var(--t-surface-primary));
  transition: box-shadow 0.2s;
  
  &:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 5;
  }
  
  // 只在外圍顯示座標軸標籤
  &:not(.grid-col-first) :deep(.y-axis-left text) {
    display: none;
  }
  
  &:not(.grid-col-last) :deep(.y-axis-right text) {
    display: none;
  }
  
  &:not(.grid-row-last) :deep(.x-axis text) {
    display: none;
  }
  
  // 保留座標軸線條和刻度
  :deep(.x-axis),
  :deep(.y-axis-left),
  :deep(.y-axis-right) {
    path.domain {
      stroke: rgb(var(--t-stroke-medium));
      stroke-width: 1;
    }
    
    line {
      stroke: rgb(var(--t-stroke-default));
      stroke-width: 1;
    }
  }
  
  // 網格線
  :deep(.grid-layer line) {
    stroke: rgb(var(--t-stroke-light));
    stroke-opacity: 0.5;
  }
}

</style>

<style lang="scss" scoped src="./facetShared.scss"></style>
