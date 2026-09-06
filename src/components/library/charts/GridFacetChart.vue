<template>
  <div 
    ref="containerRef" 
    class="grid-facet-chart"
    :class="{ 'auto-resize': autoResize }"
    :style="containerStyle"
  >
    <!-- 全域標題 -->
    <!-- 
     -->

    <!-- 列標題（X 軸分面變數） -->
    <div 
      v-for="(colValue, colIndex) in uniqueXValues" 
      :key="`col-${colValue}`"
      class="col-header"
      :style="getColHeaderStyle(colIndex)"
    >
      <span class="header-text">{{ xFacetLabel }}: {{ colValue }}</span>
    </div>
    
    <!-- 行標題（Y 軸分面變數） -->
    <div 
      v-for="(rowValue, rowIndex) in uniqueYValues" 
      :key="`row-${rowValue}`"
      class="row-header"
      :style="getRowHeaderStyle(rowIndex)"
    >
      <span class="header-text">{{ yFacetLabel }}: {{ rowValue }}</span>
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
    >
      <DualAxisComboChart
        :key="`chart-${facetData.id}-v${chartVersion}-reset${resetTrigger}`"
        :width="cellWidth"
        :height="cellHeight"
        :auto-resize="false"
        :margin="getCellMargin(facetData.row, facetData.col)"
        :layers="facetData.layers"
        :x-scale-type="xScaleType"
        :x-domain="getFacetXDomain(facetData)"
        :x-axis-format="xAxisFormat"
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
        <!-- Tooltip 插槽 -->
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
              :style="getTooltipStyle(tooltipData)"
            >
              <div class="tooltip-title">
                {{ xFacetLabel }}: {{ facetData.xValue }} | 
                {{ yFacetLabel }}: {{ facetData.yValue }}
              </div>
              <div v-if="tooltipData.data" class="tooltip-content">
                {{ formatTooltipValue(tooltipData.data, facetData) }}
              </div>
            </div>
          </slot>
        </template>
      </DualAxisComboChart>
    </div>

    <!-- 重置按鈕（全域） -->
    <button
      v-if="showResetButton && hasAnyZoom()"
      @click="handleResetZoom"
      class="reset-button"
    >
      🔄 Reset All
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import DualAxisComboChart from './DualAxisComboChart.vue';
import { useFacetLayout, useGridFacetLayout } from '@/composables/d3/faceChart/useFacetLayout';
import { useFacetBrush } from '@/composables/d3/faceChart/useFacetBrush';

const props = defineProps({
  // ===== 數據配置 =====
  data: {
    type: Array,
    required: true,
    // 期望格式：
    // [
    //   { 
    //     [xFacetVar]: 'A', 
    //     [yFacetVar]: '1', 
    //     layers: [...],
    //     xDomain: [...],
    //     yLeftDomain: [...],
    //     yRightDomain: [...]
    //   },
    //   ...
    // ]
  },
  xFacetVar: {
    type: String,
    required: true, // 例如 'region'
  },
  yFacetVar: {
    type: String,
    required: true, // 例如 'product'
  },
  xFacetLabel: {
    type: String,
    default: 'X Facet'
  },
  yFacetLabel: {
    type: String,
    default: 'Y Facet'
  },

  // ===== 尺寸配置 =====
  width: {
    type: Number,
    default: 1200,
  },
  height: {
    type: Number,
    default: 800,
  },
  autoResize: {
    type: Boolean,
    default: true,
  },
  headerHeight: {
    type: Number,
    default: 40,
  },
  headerWidth: {
    type: Number,
    default: 80,
  },

  // ===== 圖表配置 =====
  title: {
    type: String,
    default: '',
  },
  xScaleType: {
    type: String,
    default: 'time',
  },
  xAxisFormat: {
    type: Function,
    default: null,
  },
  xAxisLabelRotate: {
    type: Number,
    default: -45,
  },
  showGrid: {
    type: Boolean,
    default: true,
  },

  // ===== 互動配置 =====
  enableBrush: {
    type: Boolean,
    default: true,
  },
  brushMode: {
    type: String,
    default: 'xy', // 'xy' | 'x'
  },
  syncMode: {
    type: String,
    default: 'both', // 'all' | 'row' | 'col' | 'both' | 'none'
    validator: (value) => ['all', 'row', 'col', 'both', 'none'].includes(value)
  },
  enableAxisDrag: {
    type: Boolean,
    default: false,
  },
  showResetButton: {
    type: Boolean,
    default: true,
  }
});

const emit = defineEmits(['selection-change', 'axis-drag', 'zoom-reset', 'chart-resize']);

// ===== 使用 Composables =====
const {
  containerRef,
  effectiveWidth,
  effectiveHeight,
  containerStyle,
  chartVersion,
} = useFacetLayout(props, emit);

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
} = useGridFacetLayout(props, effectiveWidth, effectiveHeight);

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

// ===== 計算每個圖表的 Domain =====
const getFacetXDomain = (facet) => {
  return getXDomain(props.syncMode, facet.col, facet.xDomain);
};

const getFacetYLeftDomain = (facet) => {
  return getYLeftDomain(props.syncMode, facet.row, facet.yLeftDomain);
};

const getFacetYRightDomain = (facet) => {
  return getYRightDomain(props.syncMode, facet.row, facet.yRightDomain);
};

// ===== 事件處理（包裝 Composable 函數） =====
const handleSelectionChange = (event, facetId) => {
  const facet = gridFacets.value.find(f => f.id === facetId);
  if (facet) {
    handleSelection(event, facetId, props.syncMode, facet.row, facet.col, emit);
  }
};

const handleAxisDrag = (event, facetId) => {
  const facet = gridFacets.value.find(f => f.id === facetId);
  if (facet) {
    handleDrag(event, facetId, props.syncMode, facet.row, facet.col, emit);
  }
};

const handleResetZoom = () => {
  handleReset(emit);
};

// ===== Tooltip 樣式 =====
const getTooltipStyle = (tooltipData) => ({
  left: `${tooltipData.position?.pageX + 10}px`,
  top: `${tooltipData.position?.pageY - 10}px`,
});

const formatTooltipValue = (data, facet) => {
  if (!data) return '';
  
  const layer = facet.layers?.[0];
  if (layer?.yValue && typeof layer.yValue === 'function') {
    const value = layer.yValue(data);
    if (facet.yLeftAxisFormat) {
      return facet.yLeftAxisFormat(value);
    }
    return value;
  }
  
  return JSON.stringify(data);
};
</script>

<style lang="scss" scoped>
.grid-facet-chart {
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background-color: #fafafa;
  
  &.auto-resize {
    width: 100%;
    height: 100%;
    min-width: 600px;
    min-height: 400px;
  }
}

.chart-title {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  z-index: 20;
}

.col-header,
.row-header {
  background-color: #f9fafb;
  z-index: 10;
  
  .header-text {
    font-size: 0.875rem;
    color: #374151;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 8px;
  }
}

.grid-cell {
  background-color: #ffffff;
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
      stroke: #9ca3af;
      stroke-width: 1;
    }
    
    line {
      stroke: #d1d5db;
      stroke-width: 1;
    }
  }
  
  // 網格線
  :deep(.grid-layer line) {
    stroke: #e5e7eb;
    stroke-opacity: 0.5;
  }
}

.reset-button {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 8px 16px;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
  z-index: 30;
  
  &:hover {
    background-color: #f9fafb;
    border-color: #9ca3af;
    box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
}

.default-tooltip {
  position: absolute;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 0.5rem;
  font-size: 0.875rem;
  pointer-events: none;
  z-index: 50;
  
  .tooltip-title {
    font-weight: 600;
    margin-bottom: 0.25rem;
    color: #1f2937;
  }
  
  .tooltip-content {
    color: #6b7280;
  }
}
</style>
