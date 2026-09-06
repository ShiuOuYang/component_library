<template>
  <div 
    ref="containerRef" 
    class="faceted-chart"
    :class="{ 'auto-resize': autoResize }"
    :style="containerStyle"
  >
    <!-- 全域標題 -->
    <div v-if="title" class="chart-title">
      {{ title }}
    </div>

    <!-- 分面容器 -->
    <div
      v-for="(facet, index) in facets"
      :key="facet.id"
      class="facet-item"
      :class="{ 'is-last': index === facets.length - 1 }"
      :style="getFacetStyle(index)"
    >
      <!-- 分面標題（左側旋轉） -->
      <div class="facet-label" :style="getFacetLabelStyle(index)">
        {{ facet.title }}
      </div>

      <!-- 圖表區域 -->
      <DualAxisComboChart
        :key="`chart-${index}-v${chartVersion}`"
        :width="chartWidth"
        :height="facetHeights[index]"
        :auto-resize="false"
        :margin="getFacetMargin(index)"
        :layers="facet.layers"
        :x-scale-type="xScaleType"
        :x-domain="syncBrush ? currentXDomain : facet.xDomain"
        :x-axis-format="xAxisFormat"
        :x-axis-label-rotate="xAxisLabelRotate"
        :y-left-scale-type="facet.yLeftScaleType || 'linear'"
        :y-left-domain="facet.yLeftDomain"
        :y-left-axis-format="facet.yLeftAxisFormat"
        :y-right-scale-type="facet.yRightScaleType"
        :y-right-domain="facet.yRightDomain"
        :y-right-axis-format="facet.yRightAxisFormat"
        :trigger-lines="facet.triggerLines || []"
        :enable-brush="enableBrush"
        :brush-mode="brushMode"
        :show-reset-button="false"
        :show-grid="facet.showGrid !== false"
        :animation-duration="300"
        :title="''"
        :enable-axis-drag="enableAxisDragging"
        @selection-change="handleSelectionChange($event, facet.id)"
        @axis-drag="handleAxisDrag($event, facet.id)"
        @zoom-reset="handleResetZoom"
      >
        <!-- Tooltip 插槽 -->
        <template #tooltip="{ tooltipData, tooltipVisible }">
          <slot 
            name="tooltip" 
            :tooltip-data="tooltipData" 
            :tooltip-visible="tooltipVisible" 
            :facet="facet"
          >
            <div
              v-if="tooltipVisible && tooltipData"
              class="default-tooltip"
              :style="getTooltipStyle(tooltipData)"
            >
              <div class="tooltip-title">{{ facet.title }}</div>
              <div v-if="tooltipData.data" class="tooltip-content">
                {{ formatTooltipValue(tooltipData.data, facet) }}
              </div>
            </div>
          </slot>
        </template>
      </DualAxisComboChart>
      
    </div>

    <!-- 重置按鈕（全域） -->
    <button
      v-if="showResetButton && hasAnyZoom"
      @click="handleResetZoom"
      class="reset-button"
    >
      🔄 Reset All
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import DualAxisComboChart from './DualAxisComboChart.vue';

const props = defineProps({
  facets: {
    type: Array,
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
  width: {
    type: Number,
    default: 1200,
  },
  totalHeight: {
    type: Number,
    default: 800,
  },
  autoResize: {
    type: Boolean,
    default: false,
  },
  margin: {
    type: Object,
    default: () => ({ top: 40, right: 80, bottom: 60, left: 80 }),
  },
  facetSpacing: {
    type: Number,
    default: 10,
  },
  xScaleType: {
    type: String,
    default: 'time',
  },
  xDomain: {
    type: Array,
    default: null,
  },
  xAxisFormat: {
    type: Function,
    default: null,
  },
  xAxisLabelRotate: {
    type: Number,
    default: -45,
  },
  enableBrush: {
    type: Boolean,
    default: true,
  },
  brushMode: {
    type: String,
    default: 'x',
  },
  syncBrush: {
    type: Boolean,
    default: true,
  },
  enableAxisDragging: {
    type: Boolean,
    default: false,
  },
  showResetButton: {
    type: Boolean,
    default: true,
  },
  lastFacetExtraHeight: {
    type: Number,
    default: 50,
  }
});

const emit = defineEmits(['selection-change', 'axis-drag', 'zoom-reset', 'chart-resize']);

// ===== State =====
const containerRef = ref(null);
const currentXDomain = ref(null);
const observedWidth = ref(props.width);
const observedHeight = ref(props.totalHeight);
const chartVersion = ref(0); // 強制刷新版本號

let resizeObserver = null;
let resizeDebounceTimer = null;

// ===== Computed Properties =====
const effectiveWidth = computed(() => 
  props.autoResize ? observedWidth.value : props.width
);

const effectiveHeight = computed(() => 
  props.autoResize ? observedHeight.value : props.totalHeight
);

const chartWidth = computed(() => effectiveWidth.value);

const availableHeight = computed(() => 
  effectiveHeight.value - props.margin.top - props.margin.bottom - 
  (props.facets.length - 1) * props.facetSpacing
);

// 計算每個分面的高度
const facetHeights = computed(() => {
  const allHaveHeight = props.facets.every(f => f.height);
  const someHaveHeight = props.facets.some(f => f.height);
  
  if (allHaveHeight) {
    // 所有 facet 都有 height，當作權重分配
    const totalWeight = props.facets.reduce((sum, f) => sum + (f.height || 1), 0);
    return props.facets.map((facet, index) => {
      const weight = facet.height || 1;
      const baseHeight = Math.floor(availableHeight.value * (weight / totalWeight));
      const isLast = index === props.facets.length - 1;
      return Math.max(baseHeight + (isLast ? props.lastFacetExtraHeight : 0), 100);
    });
  } else if (someHaveHeight) {
    // 部分有 height，固定高度 + 均分剩餘
    const totalCustomHeight = props.facets.reduce((sum, f) => sum + (f.height || 0), 0);
    const remainingCount = props.facets.filter(f => !f.height).length;
    const remainingHeight = availableHeight.value - totalCustomHeight;
    const defaultHeight = remainingCount > 0 ? remainingHeight / remainingCount : 0;
    
    return props.facets.map((f, index) => {
      const baseHeight = f.height || defaultHeight;
      const isLast = index === props.facets.length - 1;
      return Math.max(baseHeight + (isLast ? props.lastFacetExtraHeight : 0), 100);
    });
  } else {
    // 全部均分
    const baseHeight = Math.floor(availableHeight.value / props.facets.length);
    return props.facets.map((_, index) => {
      const isLast = index === props.facets.length - 1;
      return Math.max(baseHeight + (isLast ? props.lastFacetExtraHeight : 0), 100);
    });
  }
});

// 計算每個分面的偏移
const facetOffsets = computed(() => {
  const offsets = [];
  let currentY = props.margin.top;
  
  facetHeights.value.forEach((height, i) => {
    offsets.push(currentY);
    currentY += height + props.facetSpacing;
  });
  
  return offsets;
});

// 檢查是否有任何縮放
const hasAnyZoom = computed(() => {
  return currentXDomain.value !== null;
});

// ===== Style Helpers =====
const containerStyle = computed(() => {
  if (props.autoResize) {
    return {};
  }
  return {
    width: `${props.width}px`,
    height: `${props.totalHeight}px`,
  };
});

const getFacetStyle = (index) => ({
  position: 'absolute',
  top: `${facetOffsets.value[index]}px`,
  left: '0px',
  width: `${chartWidth.value}px`,
  height: `${facetHeights.value[index]}px`,
});

const getFacetLabelStyle = (index) => {
  const labelWidth = 50; // 固定標籤寬度
  return {
    position: 'absolute',
    left: '10px',
    top: `${facetHeights.value[index] / 2}px`,
    transform: 'translateY(-50%) rotate(-90deg)',
    width: `${labelWidth}px`,
    textAlign: 'center',
  };
};

const getFacetMargin = (index) => {
  const isLast = index === props.facets.length - 1;
  // 根據旋轉角度動態調整最後一個分面的 bottom margin
  const bottomMargin = isLast 
    ? (Math.abs(props.xAxisLabelRotate) > 0 ? 60 : 50)
    : 10;
  
  return {
    top: 10,
    right: props.margin.right,
    bottom: bottomMargin,
    left: props.margin.left,
  };
};

const getTooltipStyle = (tooltipData) => ({
  left: `${tooltipData.position?.pageX + 10}px`,
  top: `${tooltipData.position?.pageY - 10}px`,
});

// ===== Event Handlers =====
const handleSelectionChange = (event, facetId) => {
  if (props.syncBrush && event.xDomain) {
    currentXDomain.value = event.xDomain;
  }
  emit('selection-change', { ...event, facetId });
};

const handleAxisDrag = (event, facetId) => {
  // ✅ 同步 X 軸拖曳到所有 facet
  if (props.syncBrush && event.axis === 'x' && event.domain) {
    currentXDomain.value = event.domain;
  }
  emit('axis-drag', { ...event, facetId });
};

const handleResetZoom = () => {
  currentXDomain.value = null;
  emit('zoom-reset');
};

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

// ===== Watch for size changes =====
watch([observedWidth, observedHeight], () => {
  chartVersion.value += 1;
});

// ===== ResizeObserver =====
onMounted(() => {
  if (props.autoResize && containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = setTimeout(() => {
        if (entries[0]) {
          const { width, height } = entries[0].contentRect;
          const newWidth = Math.max(width, 400);
          const newHeight = Math.max(height, 300);
          
          if (Math.abs(observedWidth.value - newWidth) > 5 || 
              Math.abs(observedHeight.value - newHeight) > 5) {
            observedWidth.value = newWidth;
            observedHeight.value = newHeight;
            emit('chart-resize', { width: newWidth, height: newHeight });
          }
        }
      }, 150);
    });
    
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  
  if (resizeDebounceTimer) {
    clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = null;
  }
});
</script>

<style lang="scss" scoped>
.faceted-chart {
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background-color: #fafafa;
  
  &.auto-resize {
    width: 100%;
    height: 100%;
    min-width: 400px;
    min-height: 300px;
  }
}

.chart-title {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.125rem;
  font-weight: 700;
  color: #1f2937;
  z-index: 10;
}

.facet-item {
  background-color: #ffffff;
  border-bottom: 2px solid #d1d5db;
  
  &.is-last {
    border-bottom: none;
  }
  
  // 隱藏非最後分面的 X 軸
  &:not(.is-last) :deep(.x-axis) {
    visibility: hidden;
  }
  
  // 確保 Y 軸顯示
  :deep(.y-axis-left),
  :deep(.y-axis-right) {
    display: block;
    opacity: 1;
    
    path.domain {
      stroke: #4b5563;
      stroke-width: 2;
    }
    
    line {
      stroke: #9ca3af;
      stroke-width: 1;
    }
    
    text {
      fill: #374151;
      font-size: 11px;
      font-weight: 500;
    }
  }
  
  // X 軸樣式（只在最後分面顯示）
  &.is-last :deep(.x-axis) {
    visibility: visible;
    
    path.domain {
      stroke: #4b5563;
      stroke-width: 2;
    }
    
    line {
      stroke: #9ca3af;
      stroke-width: 1;
    }
    
    text {
      fill: #374151;
      font-size: 11px;
      font-weight: 500;
    }
  }
  
  // 網格線
  :deep(.grid-layer line) {
    stroke: #e5e7eb;
    stroke-opacity: 0.6;
  }
}

.facet-label {
  white-space: nowrap;
  pointer-events: none;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
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
  }
  
  .tooltip-content {
    color: #6b7280;
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
</style>
