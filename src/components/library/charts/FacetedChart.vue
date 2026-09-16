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
        :layers="facet.layers ?? []"
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

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { CSSProperties } from 'vue';
import DualAxisComboChart from './DualAxisComboChart.vue';
import {
  computeFacetHeights,
  computeFacetOffsets,
} from './composables/useStackedFacetLayout';
import type {
  BrushMode,
  ChartDatum,
  ChartLayer,
  ChartMargin,
  ContinuousScaleType,
  TooltipPayload,
  XDomain,
  XScaleType,
  YDomain,
} from './types/chart.types';
import type { TriggerLine } from './composables/faceChart/useFacetLayout';

// ===== 型別 =====

/**
 * 一個垂直分面。
 *
 * height 的語意依「是否所有分面都指定」而定：全部指定時當權重按比例分配，
 * 只有部分指定時才是固定像素（詳見 useStackedFacetLayout）。
 */
export interface VerticalFacet {
  id: string | number
  title?: string
  layers?: ChartLayer[]
  height?: number
  xDomain?: XDomain | null
  yLeftScaleType?: ContinuousScaleType
  yLeftDomain?: YDomain | null
  yLeftAxisFormat?: (value: number) => string
  yRightScaleType?: ContinuousScaleType
  yRightDomain?: YDomain | null
  yRightAxisFormat?: (value: number) => string
  triggerLines?: TriggerLine[]
  showGrid?: boolean
}

interface FacetedChartProps {
  /** 垂直堆疊的分面；共用同一條 X 軸 */
  facets: VerticalFacet[]
  title?: string
  width?: number
  totalHeight?: number
  autoResize?: boolean
  margin?: ChartMargin
  /** 分面之間的間距 (px) */
  facetSpacing?: number
  xScaleType?: XScaleType
  xDomain?: XDomain | null
  xAxisFormat?: ((value: never) => string) | null
  xAxisLabelRotate?: number
  enableBrush?: boolean
  brushMode?: BrushMode
  /** 框選與拖曳是否同步到所有分面 */
  syncBrush?: boolean
  enableAxisDragging?: boolean
  showResetButton?: boolean
  /** 最後一個分面的額外高度（只有它要畫 X 軸刻度） */
  lastFacetExtraHeight?: number
}

const props = withDefaults(defineProps<FacetedChartProps>(), {
  title: '',
  width: 1200,
  totalHeight: 800,
  autoResize: false,
  margin: () => ({ top: 40, right: 80, bottom: 60, left: 80 }),
  facetSpacing: 10,
  xScaleType: 'time',
  xDomain: null,
  xAxisFormat: null,
  xAxisLabelRotate: -45,
  enableBrush: true,
  brushMode: 'x',
  syncBrush: true,
  enableAxisDragging: false,
  showResetButton: true,
  lastFacetExtraHeight: 50,
});

/** 子圖表回傳的框選結果 */
interface FacetSelectionEvent {
  xDomain?: XDomain | null
  [key: string]: unknown
}

/** 子圖表回傳的軸拖曳結果 */
interface FacetAxisDragEvent {
  axis?: string
  domain?: XDomain | null
  [key: string]: unknown
}

const emit = defineEmits<{
  'selection-change': [payload: FacetSelectionEvent & { facetId: string | number }]
  'axis-drag': [payload: FacetAxisDragEvent & { facetId: string | number }]
  'zoom-reset': []
  'chart-resize': [size: { width: number; height: number }]
}>();

// ===== State =====
const containerRef = ref<HTMLDivElement | null>(null);
const currentXDomain = ref<XDomain | null>(null);
const observedWidth = ref(props.width);
const observedHeight = ref(props.totalHeight);
/**
 * 強制刷新版本號。
 * 尺寸變更時遞增，讓子圖表的 key 改變而整個重建 —— D3 的渲染狀態
 * 綁在既有節點上，尺寸大幅變動時重建比逐一更新可靠。
 */
const chartVersion = ref(0);

let resizeObserver: ResizeObserver | null = null;
let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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

/** 每個分面的高度（三種分配規則見 useStackedFacetLayout） */
const facetHeights = computed(() =>
  computeFacetHeights({
    availableHeight: availableHeight.value,
    heights: props.facets.map((f) => f.height),
    lastFacetExtraHeight: props.lastFacetExtraHeight,
  })
);

/** 每個分面的垂直偏移 */
const facetOffsets = computed(() =>
  computeFacetOffsets(facetHeights.value, props.margin.top, props.facetSpacing)
);

/** 是否有任何縮放（決定重置按鈕要不要出現） */
const hasAnyZoom = computed(() => currentXDomain.value !== null);

// ===== Style Helpers =====
const containerStyle = computed<CSSProperties>(() => {
  if (props.autoResize) return {};
  return {
    width: `${props.width}px`,
    height: `${props.totalHeight}px`,
  };
});

const getFacetStyle = (index: number): CSSProperties => ({
  position: 'absolute',
  top: `${facetOffsets.value[index]}px`,
  left: '0px',
  width: `${chartWidth.value}px`,
  height: `${facetHeights.value[index]}px`,
});

const getFacetLabelStyle = (index: number): CSSProperties => ({
  position: 'absolute',
  left: '10px',
  top: `${facetHeights.value[index] / 2}px`,
  transform: 'translateY(-50%) rotate(-90deg)',
  width: '50px',
  textAlign: 'center',
});

/**
 * 每個分面的內部邊距。
 * 只有最後一個分面要畫 X 軸刻度，因此下緣留比較多；
 * 標籤有旋轉時還要再多一些。
 */
const getFacetMargin = (index: number): ChartMargin => {
  const isLast = index === props.facets.length - 1;
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

/** tooltip 擺在游標右下方一點，避免蓋住被懸停的元素 */
const getTooltipStyle = (tooltipData: TooltipPayload): CSSProperties => ({
  left: `${tooltipData.position.pageX + 10}px`,
  top: `${tooltipData.position.pageY - 10}px`,
});

// ===== Event Handlers =====
const handleSelectionChange = (
  event: FacetSelectionEvent,
  facetId: string | number
): void => {
  if (props.syncBrush && event.xDomain) {
    currentXDomain.value = event.xDomain;
  }
  emit('selection-change', { ...event, facetId });
};

const handleAxisDrag = (event: FacetAxisDragEvent, facetId: string | number): void => {
  // X 軸拖曳同步到所有分面
  if (props.syncBrush && event.axis === 'x' && event.domain) {
    currentXDomain.value = event.domain;
  }
  emit('axis-drag', { ...event, facetId });
};

const handleResetZoom = (): void => {
  currentXDomain.value = null;
  emit('zoom-reset');
};

const formatTooltipValue = (
  data: ChartDatum | undefined,
  facet: VerticalFacet
): string => {
  if (!data) return '';

  const layer = facet.layers?.[0];
  if (layer?.yValue && typeof layer.yValue === 'function') {
    const value = layer.yValue(data);
    if (facet.yLeftAxisFormat) {
      return facet.yLeftAxisFormat(value);
    }
    return String(value);
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
      if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = setTimeout(() => {
        resizeDebounceTimer = null;
        const entry = entries[0];
        if (!entry) return;

        const { width, height } = entry.contentRect;
        const newWidth = Math.max(width, 400);
        const newHeight = Math.max(height, 300);

        // 差距太小就不重建圖表（重建成本高，抖動幾像素不值得）
        if (
          Math.abs(observedWidth.value - newWidth) > 5 ||
          Math.abs(observedHeight.value - newHeight) > 5
        ) {
          observedWidth.value = newWidth;
          observedHeight.value = newHeight;
          emit('chart-resize', { width: newWidth, height: newHeight });
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
