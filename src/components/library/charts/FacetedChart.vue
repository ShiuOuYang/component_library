<template>
  <div
    ref="containerRef"
    class="faceted-chart"
    :class="{ 'auto-resize': autoResize }"
    :style="containerStyle"
    role="group"
    :aria-label="title || '分面圖'"
    @mousemove="onMouseMove"
    @mouseleave="crosshairX = null"
  >
    <!-- 全域標題 -->
    <div v-if="title" class="chart-title">
      {{ title }}
    </div>

    <!-- 共用圖例：點一下在所有分面隱藏 / 顯示該系列 -->
    <div
      v-if="sharedLegend && legendEntries.length"
      class="shared-legend"
      role="group"
      aria-label="圖例（點選可隱藏或顯示系列）"
      :style="{ left: `${margin.left}px` }"
    >
      <button
        v-for="entry in legendEntries"
        :key="entry.label"
        type="button"
        class="legend-chip"
        :aria-pressed="!hiddenSeries.has(entry.label)"
        @click="toggleSeries(entry.label)"
      >
        <span
          class="legend-swatch"
          :class="entry.type === 'line' ? 'is-line' : ''"
          :style="{ backgroundColor: entry.color }"
          aria-hidden="true"
        ></span>
        {{ entry.label }}
      </button>
    </div>

    <!-- 分面容器 -->
    <div
      v-for="(facet, index) in facets"
      :key="facet.id"
      class="facet-item"
      :class="{ 'is-last': index === facets.length - 1 }"
      :style="getFacetStyle(index)"
      role="group"
      :aria-label="facet.title || `分面 ${index + 1}`"
    >
      <!-- 分面標題：左側旋轉（寬度 = 分面高度，長標題不會被擠成好幾行）或上方 -->
      <div
        v-if="facet.title"
        class="facet-label"
        :class="facetLabelPosition === 'top' ? 'is-top' : ''"
        :style="getFacetLabelStyle(index)"
        :title="facet.title"
      >
        {{ facet.title }}
      </div>

      <!-- 圖表區域 -->
      <DualAxisComboChart
        :key="`chart-${index}-v${chartVersion}`"
        :width="chartWidth"
        :height="facetHeights[index]"
        :auto-resize="false"
        :margin="getFacetMargin(index)"
        :layers="applySharedLegend(facet.layers, hiddenSeries, sharedLegend)"
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
              role="tooltip"
              :style="fixedTooltipStyle(tooltipData.position)"
            >
              <div class="tooltip-title">{{ facet.title }}</div>
              <template v-for="(info, i) in [tooltipInfo(tooltipData, facet)]" :key="i">
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

    <!-- 同步十字線：滑鼠在任一分面的繪圖區時，所有分面在同一個 X 位置畫一條線 -->
    <div
      v-if="crosshair && crosshairX !== null && facets.length"
      class="crosshair"
      aria-hidden="true"
      :style="crosshairStyle"
    >
      <span v-if="crosshairLabel" class="crosshair-label">{{ crosshairLabel }}</span>
    </div>

    <!-- 重置按鈕（全域） -->
    <button
      v-if="showResetButton && hasAnyZoom"
      type="button"
      class="reset-button"
      @click="handleResetZoom"
    >
      <span class="material-symbols-outlined" aria-hidden="true">zoom_out_map</span>
      重設縮放
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
  ChartLayer,
  ChartMargin,
  ContinuousScaleType,
  TooltipPayload,
  XDomain,
  XScaleType,
  YDomain,
} from './types/chart.types';
import type { TriggerLine } from './composables/faceChart/useFacetLayout';
import {
  applySharedLegend,
  collectLegend,
  fixedTooltipStyle,
  formatXValue,
  tooltipRows,
} from './composables/faceChart/facetHelpers';

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
  /** 同步十字線：滑鼠所在的 X 位置在所有分面畫一條線，並顯示 X 讀數 */
  crosshair?: boolean
  /** 所有分面共用一份圖例（點選可在每個分面同時隱藏 / 顯示該系列） */
  sharedLegend?: boolean
  /** 分面標題的位置：left（旋轉 90°）/ top（圖表上方，適合長標題） */
  facetLabelPosition?: 'left' | 'top'
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
  crosshair: true,
  sharedLegend: false,
  facetLabelPosition: 'left',
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

/**
 * 分面標題的位置。
 * 左側模式：先把寬度設成「分面高度」再旋轉 —— 原本固定 width: 50px，
 * 旋轉後標題最多只能有 50px 長，「SMT 印刷良率」這種標題會被擠成好幾行疊在 Y 軸上。
 */
const getFacetLabelStyle = (index: number): CSSProperties => {
  if (props.facetLabelPosition === 'top') {
    return { position: 'absolute', top: '4px', left: `${props.margin.left}px`, maxWidth: `${chartWidth.value - props.margin.left - props.margin.right}px` };
  }
  const h = facetHeights.value[index] - (index === props.facets.length - 1 ? getFacetMargin(index).bottom : 0);
  return {
    position: 'absolute',
    left: '14px',
    top: `${h / 2}px`,
    width: `${Math.max(40, h - 16)}px`,
    transform: 'translate(-50%, -50%) rotate(-90deg)',
    transformOrigin: 'center',
    textAlign: 'center',
  };
};

/**
 * 每個分面的內部邊距。
 * 只有最後一個分面要畫 X 軸刻度，因此下緣留比較多；
 * 標籤有旋轉時還要再多一些。標題放上方時，上緣留出一行字的空間。
 */
function getFacetMargin(index: number): ChartMargin {
  const isLast = index === props.facets.length - 1;
  const bottomMargin = isLast
    ? (Math.abs(props.xAxisLabelRotate) > 0 ? 60 : 50)
    : 10;

  return {
    top: props.facetLabelPosition === 'top' ? 28 : 10,
    right: props.margin.right,
    bottom: bottomMargin,
    left: props.margin.left,
  };
}

// ===== 預設 tooltip =====

const tooltipInfo = (payload: TooltipPayload, facet: VerticalFacet) =>
  tooltipRows(payload, { yLeft: facet.yLeftAxisFormat, yRight: facet.yRightAxisFormat });

// ===== 共用圖例 =====

const hiddenSeries = ref<Set<string>>(new Set());
const legendEntries = computed(() => collectLegend(props.facets.map((f) => f.layers)));

function toggleSeries(label: string): void {
  const next = new Set(hiddenSeries.value);
  if (next.has(label)) next.delete(label);
  else next.add(label);
  hiddenSeries.value = next;
}

// ===== 同步十字線 =====

const crosshairX = ref<number | null>(null);

/** 繪圖區的左右界（相對容器）；所有分面共用同一條 X 軸，所以左右界相同 */
const plotLeft = computed(() => props.margin.left);
const plotRight = computed(() => chartWidth.value - props.margin.right);
const plotTop = computed(() => (facetOffsets.value[0] ?? 0) + getFacetMargin(0).top);
const plotBottom = computed(() => {
  const last = props.facets.length - 1;
  if (last < 0) return 0;
  return (facetOffsets.value[last] ?? 0) + (facetHeights.value[last] ?? 0) - getFacetMargin(last).bottom;
});

function onMouseMove(event: MouseEvent): void {
  if (!props.crosshair || !containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const inside = x >= plotLeft.value && x <= plotRight.value && y >= plotTop.value && y <= plotBottom.value;
  crosshairX.value = inside ? x : null;
}

const crosshairStyle = computed<CSSProperties>(() => ({
  left: `${crosshairX.value}px`,
  top: `${plotTop.value}px`,
  height: `${Math.max(0, plotBottom.value - plotTop.value)}px`,
}));

/** 目前 X 範圍：縮放中的範圍 > 呼叫端指定的 > 由所有分面的資料推算 */
const effectiveXDomain = computed<[number, number] | null>(() => {
  const domain = (currentXDomain.value ?? props.xDomain) as unknown[] | null;
  const toNum = (v: unknown) => (v instanceof Date ? v.getTime() : Number(v));
  if (domain && domain.length === 2 && domain.every((v) => Number.isFinite(toNum(v)))) {
    return [toNum(domain[0]), toNum(domain[1])];
  }
  let min = Infinity;
  let max = -Infinity;
  for (const facet of props.facets) {
    for (const layer of facet.layers ?? []) {
      if (!layer.xValue || !layer.data) continue;
      for (const d of layer.data) {
        const n = toNum(layer.xValue(d));
        if (!Number.isFinite(n)) continue;
        if (n < min) min = n;
        if (n > max) max = n;
      }
    }
  }
  return Number.isFinite(min) && Number.isFinite(max) && max > min ? [min, max] : null;
});

/** 十字線的 X 讀數（類別軸沒有「中間值」，不顯示） */
const crosshairLabel = computed(() => {
  if (crosshairX.value === null || props.xScaleType === 'band') return '';
  const domain = effectiveXDomain.value;
  if (!domain) return '';
  const ratio = (crosshairX.value - plotLeft.value) / Math.max(1, plotRight.value - plotLeft.value);
  const raw = domain[0] + ratio * (domain[1] - domain[0]);
  const value = props.xScaleType === 'time' ? new Date(raw) : raw;
  return formatXValue(value, props.xAxisFormat);
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
  background-color: rgb(var(--t-surface-secondary));
  
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
  color: rgb(var(--t-content-primary));
  z-index: 10;
}

.facet-item {
  background-color: rgb(var(--t-surface-primary));
  border-bottom: 2px solid rgb(var(--t-stroke-default));
  
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
      stroke: rgb(var(--t-stroke-dark));
      stroke-width: 2;
    }
    
    line {
      stroke: rgb(var(--t-stroke-medium));
      stroke-width: 1;
    }
    
    text {
      fill: rgb(var(--t-content-primary));
      font-size: 11px;
      font-weight: 500;
    }
  }
  
  // X 軸樣式（只在最後分面顯示）
  &.is-last :deep(.x-axis) {
    visibility: visible;
    
    path.domain {
      stroke: rgb(var(--t-stroke-dark));
      stroke-width: 2;
    }
    
    line {
      stroke: rgb(var(--t-stroke-medium));
      stroke-width: 1;
    }
    
    text {
      fill: rgb(var(--t-content-primary));
      font-size: 11px;
      font-weight: 500;
    }
  }
  
  // 網格線
  :deep(.grid-layer line) {
    stroke: rgb(var(--t-stroke-light));
    stroke-opacity: 0.6;
  }
}

.facet-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgb(var(--t-content-primary));
  z-index: 5;

  &.is-top {
    font-size: 0.8125rem;
  }
}

/* 共用圖例：左上角（標題在正中間）；外觀見 facetShared.scss */
.shared-legend {
  position: absolute;
  top: 8px;
  z-index: 20;
  max-width: 45%;
}

/* 同步十字線 */
.crosshair {
  position: absolute;
  z-index: 15;
  width: 0;
  border-left: 1px dashed rgb(var(--t-content-tertiary));
  pointer-events: none;
}

.crosshair-label {
  position: absolute;
  bottom: -22px;
  left: 0;
  transform: translateX(-50%);
  white-space: nowrap;
  padding: 1px 6px;
  border-radius: 4px;
  background-color: rgb(var(--t-content-primary));
  color: rgb(var(--t-surface-primary));
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
}

</style>

<style lang="scss" scoped src="./facetShared.scss"></style>
