<template>
  <div ref="containerRef" class="dual-axis-chart" :style="autoResize ? {} : { width: width + 'px', height: height + 'px' }">
    <svg ref="svgRef" :width="effectiveWidth" :height="effectiveHeight">
      <defs>
        <!-- 定義漸層、陰影等可重用的 SVG 元素 -->
        <clipPath :id="`clip-${chartId}`">
          <rect :width="chartWidth" :height="chartHeight" />
        </clipPath>
      </defs>

      <g :transform="`translate(${margin.left}, ${margin.top})`">
        <!-- 圖層順序很重要：背景 -> 網格 -> 圖表 -> 座標軸 -> 標題 -->
        <g ref="gridLayerRef" class="grid-layer"></g>
        
        <!-- ✅ 圖層容器：使用 clip-path 防止圖表超出範圍 -->
        <g :clip-path="`url(#clip-${chartId})`">
          <g ref="stackedBarLayerRef" class="stacked-bar-layer"></g>
          <g ref="lineLayerRef" class="line-layer"></g>
          <!-- ✅ Trigger 線圖層（在數據圖層之上，Brush 之下） -->
          <g ref="triggerLineLayerRef" class="trigger-line-layer"></g>
          <!-- ✅ Brush 圖層 (必須在最上層以接收事件) -->
          <g v-if="enableBrush" ref="brushLayerRef" class="brush-layer"></g>
        </g>

        <!-- 座標軸 -->
        <g ref="xAxisRef" :transform="`translate(0, ${chartHeight})`" class="x-axis"></g>
        <g ref="yAxisLeftRef" class="y-axis-left"></g>
        <g ref="yAxisRightRef" :transform="`translate(${chartWidth}, 0)`" class="y-axis-right"></g>
        
        <!-- 圖例和標題 -->
        <g ref="legendLayerRef" class="legend-layer"></g>
        <g ref="titleLayerRef" class="title-layer"></g>
      </g>
    </svg>

    <!-- ✅ 重置縮放按鈕 -->
    

  
<button
  v-if="resetBtnShow && enableBrush && showResetButton"
  @click="handleResetZoom"
  class="
    absolute top-2 right-2 px-3 py-1.5
    bg-white/30 hover:bg-white/80
    text-gray-600 text-sm
    rounded-md border border-gray-200
    backdrop-blur
    shadow-sm
    opacity-70 hover:opacity-100
    transition-all duration-200 z-10
  "
>
  🔄 Reset
</button>




    <!-- Vue 插槽：允許外部注入自定義 Tooltip -->
    <slot 
      name="tooltip" 
      :tooltip-data="tooltipData" 
      :tooltip-visible="tooltipVisible"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, watchEffect, onMounted, onUnmounted, type Ref } from 'vue';
import * as d3 from 'd3';
import { useD3Brush } from './composables/useD3Brush';
import { useChartScales } from './composables/useChartScales';
import { isBandScale } from './types/chart.types'
import type {
  BrushMode,
  ChartAxisSide,
  ChartDatum,
  ChartLayer,
  ChartMargin,
  ContinuousScaleType,
  XDomain,
  XAccessor,
  XScale,
  XScaleType,
  YAccessor,
  YDomain,
  YScale,
} from './types/chart.types'
import type { TriggerLine } from './composables/faceChart/useFacetLayout'

interface DualAxisComboChartProps {

  // === 基礎配置 ===
  width?: number
  height?: number
  autoResize?: boolean
  debounceDelay?: number
  margin?: ChartMargin

  // === 圖層配置 ===
  /**
   * 圖層陣列。一張圖可疊多個圖層（例如柱狀 + 折線雙軸），
   * 每個圖層各自帶資料與取值函式，並以 yAxis 指定掛在哪一側。
   */
  layers: ChartLayer[]

  // === X 軸配置 ===
  xScaleType?: XScaleType
  xDomain?: XDomain | null
  xAxisLabel?: string
  xAxisFormat?: ((value: never) => string) | null
  xAxisLabelRotate?: number

  // === 左 Y 軸配置 ===
  yLeftScaleType?: ContinuousScaleType
  yLeftDomain?: YDomain | null
  yLeftAxisLabel?: string
  yLeftAxisFormat?: ((value: number) => string) | null

  // === 右 Y 軸配置 ===
  yRightScaleType?: ContinuousScaleType
  yRightDomain?: YDomain | null
  yRightAxisLabel?: string
  yRightAxisFormat?: ((value: number) => string) | null

  // === 視覺配置 ===
  title?: string
  showGrid?: boolean
  animationDuration?: number

  // === 互動配置 ===
  enableBrush?: boolean
  brushMode?: BrushMode
  enableAxisDrag?: boolean
  showResetButton?: boolean

  // === Trigger 線配置（管制圖、良率分析圖） ===
  /** 參考線，例如規格上下限或良率門檻 */
  triggerLines?: TriggerLine[]
}

const props = withDefaults(defineProps<DualAxisComboChartProps>(), {
  width: 800,
  height: 500,
  autoResize: false,
  debounceDelay: 150,
  margin: () => ({ top: 60, right: 80, bottom: 60, left: 80 }),
  xScaleType: 'band',
  xDomain: null,
  xAxisLabel: '',
  xAxisFormat: null,
  xAxisLabelRotate: 0,
  yLeftScaleType: 'linear',
  yLeftDomain: null,
  yLeftAxisLabel: '',
  yLeftAxisFormat: null,
  yRightScaleType: 'linear',
  yRightDomain: null,
  yRightAxisLabel: '',
  yRightAxisFormat: null,
  title: '',
  showGrid: true,
  animationDuration: 750,
  enableBrush: true,
  brushMode: 'xy',
  enableAxisDrag: true,
  showResetButton: true,
  triggerLines: () => [],
})

const emit = defineEmits([
  'layer-click',
  'layer-hover',
  'tooltip-show',
  'tooltip-hide',
  'chart-ready',
  'chart-resize', // 圖表尺寸變化
  'selection-change', // Brush 選取範圍改變
  'zoom-reset', // 重置縮放
  'axis-drag' // 座標軸拖曳平移
]);

// === 圖例 ===

/** 圖例中一個項目的樣式種類 */
type LegendSymbol = 'rect' | 'line' | 'scatter' | 'trigger-line'

/** 圖例項 */
interface LegendItem {
  label: string
  color: string
  /** 決定要畫方塊、線段還是圓點 */
  type: LegendSymbol
  /** scatter 用的圓點半徑 */
  dotSize?: number
  /** trigger-line 用的虛線樣式 */
  strokeDasharray?: string | null
}

// === D3 事件與綁定資料的型別 ===

/** 綁在 SVG 元素上的資料（供 brush overlay 穿透時讀回） */
interface BoundDatum {
  rawData: ChartDatum
  layer: ChartLayer
  seriesKey?: string
}

/** brush 結束事件；x 模式的 selection 是一對座標，xy 模式是兩個角 */
interface BrushSelectionEvent {
  selection: [number, number] | [[number, number], [number, number]] | null
}

// === Tooltip 型別 ===

/** tooltip 的座標；containerX / containerY 在容器尚未掛載時為 null */
interface TooltipPosition {
  pageX: number
  pageY: number
  containerX: number | null
  containerY: number | null
}

/** 傳給 tooltip slot 的內容 */
interface TooltipPayload {
  /** 被懸停元素對應的資料列 */
  data: ChartDatum
  /** 該元素所屬的圖層設定 */
  layer: ChartLayer
  /** 堆疊圖的系列鍵；非堆疊圖為 undefined */
  seriesKey?: string
}

// === Refs ===
// 每個圖層是一個 <g>；D3 直接操作這些節點做 enter-update-exit
const containerRef = ref<HTMLDivElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const gridLayerRef = ref<SVGGElement | null>(null);
const stackedBarLayerRef = ref<SVGGElement | null>(null);
const lineLayerRef = ref<SVGGElement | null>(null);
const triggerLineLayerRef = ref<SVGGElement | null>(null);
const xAxisRef = ref<SVGGElement | null>(null);
const yAxisLeftRef = ref<SVGGElement | null>(null);
const yAxisRightRef = ref<SVGGElement | null>(null);
const legendLayerRef = ref<SVGGElement | null>(null);
const titleLayerRef = ref<SVGGElement | null>(null);
const brushLayerRef = ref<SVGGElement | null>(null);

/**
 * 每個實例的唯一 id。
 * 用來組 clip-path 的 id，避免同頁多張圖互相覆蓋彼此的裁切區域。
 */
const chartId = ref(`chart-${Math.random().toString(36).slice(2, 11)}`);
const tooltipData = ref<TooltipPayload | null>(null);
const tooltipVisible = ref(false);

// === 響應式尺寸管理 ===
const observedWidth = ref(props.width);
const observedHeight = ref(props.height);
let resizeObserver: ResizeObserver | null = null;
let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// === Brush 功能整合 ===
const { resetBtnShow } = useD3Brush(emit);

// 儲存當前的 domain（用於 Brush 縮放）
const currentXDomain = ref<XDomain | null>(null) as Ref<XDomain | null>;
const currentYLeftDomain = ref<YDomain | null>(null) as Ref<YDomain | null>;
const currentYRightDomain = ref<YDomain | null>(null) as Ref<YDomain | null>;

// 標記是否為本地 Brush 操作（用於區分自己 Brush vs 外部同步）
const isLocalBrush = ref(false);

// === 計算屬性 ===
// ✅ 根據 autoResize 決定使用觀察到的尺寸或 Props 尺寸
const effectiveWidth = computed(() => props.autoResize ? observedWidth.value : props.width);
const effectiveHeight = computed(() => props.autoResize ? observedHeight.value : props.height);

const chartWidth = computed(() => effectiveWidth.value - props.margin.left - props.margin.right);
const chartHeight = computed(() => effectiveHeight.value - props.margin.top - props.margin.bottom);

// === 使用 Chart Scales Composable ===
const {
  xScale,
  yLeftScale,
  yRightScale,
  processedLeftLayers,   // ✅ 已過濾數據的左側圖層
  processedRightLayers,  // ✅ 已過濾數據的右側圖層
  originalXDomain,
  originalYLeftDomain,
  originalYRightDomain
} = useChartScales(
  props,
  chartWidth,
  chartHeight,
  currentXDomain,
  currentYLeftDomain,
  currentYRightDomain
);

// === 計算屬性：動態動畫時長 ===
const effectiveAnimationDuration = computed(() => {
  // Brush 操作時禁用動畫以提升性能
  return resetBtnShow.value ? 0 : props.animationDuration;
});

/**
 * 把 X domain 的兩個端點轉成可做算術的數值。
 *
 * X 軸的 domain 依比例尺種類可能是數值、日期或類別字串；
 * 拖曳平移／縮放一律在數值域上計算，時間軸換成時間戳後再轉回 Date。
 */
function toNumericDomain(domain: XDomain, isTimeScale: boolean): [number, number] {
  const [a, b] = domain as [string | number | Date, string | number | Date];
  if (isTimeScale) {
    return [new Date(a).getTime(), new Date(b).getTime()];
  }
  return [Number(a), Number(b)];
}

/**
 * enter-update-exit 的 key 函式。
 * 圖層有自訂 keyFn 就用它（避免重繪時元素錯位），否則退回索引。
 */
function makeKeyFn(layer: ChartLayer): (d: BoundDatum, i: number) => string {
  const custom = layer.keyFn;
  if (custom) return (d, i) => custom(d.rawData, i);
  return (_d, i) => String(i);
}

/**
 * 取得堆疊系列的顏色。
 * colorScale 可以是 d3 的 ordinal scale（以 key 呼叫）或一張 key → 色碼的查表。
 */
function resolveSeriesColor(
  colorScale: ChartLayer['colorScale'] | Record<string, string> | undefined,
  seriesKey: string,
  seriesIndex: number
): string {
  if (typeof colorScale === 'function') return colorScale(seriesKey);
  if (colorScale && typeof colorScale === 'object') {
    const table = colorScale as Record<string, string>;
    const hit = table[seriesKey] ?? table[String(seriesIndex)];
    if (hit) return hit;
  }
  return d3.schemeCategory10[seriesIndex % 10];
}

/**
 * 建立一組把資料列換算成像素座標的函式。
 *
 * band scale 與連續型 scale 的呼叫方式不同（前者吃類別字串、後者吃數值），
 * 原本這段 band 判斷在 renderLines / renderScatter 裡各自重複了四次，
 * 其中 .defined() 的三元運算兩個分支還完全相同（copy-paste 殘留），
 * 導致 band scale 下 defined 檢查用的是 band 起點、而 .x() 用的是 band 中心。
 */
function makeAccessors(
  xs: XScale,
  ys: YScale,
  xValue: XAccessor,
  yValue: YAccessor
) {
  /** X 像素座標；band scale 取 band 中心。無法定位時回傳 undefined */
  const xPos = (d: ChartDatum): number | undefined => {
    const raw = xValue(d);
    if (isBandScale(xs)) {
      const start = xs(String(raw));
      return start === undefined ? undefined : start + xs.bandwidth() / 2;
    }
    return (xs as d3.ScaleContinuousNumeric<number, number>)(Number(raw));
  };

  /** Y 像素座標 */
  const yPos = (d: ChartDatum): number => ys(yValue(d));

  /** 這個資料點是否能畫出來（座標皆為有效數值） */
  const isDefined = (d: ChartDatum): boolean => {
    const x = xPos(d);
    const y = yPos(d);
    return x !== undefined && Number.isFinite(x) && Number.isFinite(y);
  };

  return { xPos, yPos, isDefined };
}

// === 渲染函數 ===

/**
 * 設置 Brush overlay 的 Tooltip 穿透檢測
 * @param {d3.Selection} overlay - Brush overlay 元素
 */
const setupTooltipDetection = (
  overlay: d3.Selection<SVGRectElement, unknown, null, undefined>
): void => {
  let isDragging = false;
  
  overlay
    .on('mousedown.tooltip', () => { isDragging = true; })
    .on('mouseup.tooltip', () => {
      isDragging = false;
      handleLayerLeave();
    })
    .on('mousemove.tooltip', function (this: SVGRectElement, event: MouseEvent) {
      if (isDragging) return;
      
      // 臨時穿透檢測底層元素
      d3.select(this).style('pointer-events', 'none');
      const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
      d3.select(this).style('pointer-events', 'all');
      
      // 檢查是否為圖表元素
      if (elementBelow?.classList.contains('stacked-bar') || 
          elementBelow?.classList.contains('line-dot')) {
        // ✅ 直接從 DOM 元素讀取已綁定的完整資料
        // 元素上綁的是 renderStackedBars / renderLines 在 .datum() 存進去的物件
        const boundData = d3.select(elementBelow).datum() as BoundDatum | undefined;
        if (boundData?.layer) {
          handleLayerHover(event, boundData.rawData, boundData.layer, boundData.seriesKey);
        }
      } else {
        handleLayerLeave();
      }
    })
    .on('mouseleave.tooltip', () => {
      isDragging = false;
      handleLayerLeave();
    });
};

/**
 * 處理 Brush 選取完成事件
 * @param {Object} event - D3 brush 事件
 */
const handleBrushSelection = (event: BrushSelectionEvent): void => {
  if (!event.selection) return;

  const xs = xScale.value;
  if (!xs) return;

  // 解析選取範圍。xy 模式是兩個角，x 模式只有一對 X 座標
  let x0: number, x1: number;
  let y0: number | undefined, y1: number | undefined;
  if (props.brushMode === 'xy') {
    const [[sx0, sy0], [sx1, sy1]] = event.selection as [[number, number], [number, number]];
    x0 = sx0; y0 = sy0; x1 = sx1; y1 = sy1;
  } else {
    const [sx0, sx1] = event.selection as [number, number];
    x0 = sx0; x1 = sx1;
  }

  // 計算 X 軸 domain
  let selectedXDomain: XDomain;
  if (isBandScale(xs)) {
    const allCategories = (originalXDomain.value as string[] | null) ?? xs.domain();
    const bandWidth = xs.bandwidth();
    selectedXDomain = allCategories.filter((d) => {
      // Band Scale 的長條結構：假設 bandWidth 為 50px
      // |----A----|----B----|----C----|
      //    50px      50px      50px
      // 與框選範圍有重疊就算選中（與 useD3Brush 的「必須完整落入」不同：
      // 這裡是圖表本身的框選，行為刻意較寬鬆）
      const bandStart = xs(d);
      if (bandStart === undefined) return false;
      return bandStart + bandWidth > x0 && bandStart < x1;
    });
  } else {
    const continuous = xs as d3.ScaleContinuousNumeric<number, number>;
    selectedXDomain = [continuous.invert(x0), continuous.invert(x1)];
  }

  if (selectedXDomain.length === 0) return;

  // 計算 Y 軸 domain（僅 xy 模式）
  let selectedYLeftDomain: YDomain | null = null;
  let selectedYRightDomain: YDomain | null = null;

  if (props.brushMode === 'xy') {
    if (yLeftScale.value && y0 !== undefined && y1 !== undefined) {
      selectedYLeftDomain = [yLeftScale.value.invert(y1), yLeftScale.value.invert(y0)];
    }
    if (yRightScale.value && y0 !== undefined && y1 !== undefined) {
      selectedYRightDomain = [yRightScale.value.invert(y1), yRightScale.value.invert(y0)];
    }
  }

  // 更新狀態
  isLocalBrush.value = true; // 標記為本地 Brush
  currentXDomain.value = selectedXDomain;
  currentYLeftDomain.value = selectedYLeftDomain;
  currentYRightDomain.value = selectedYRightDomain;
  resetBtnShow.value = true;

  // 發出事件
  emit('selection-change', {
    xDomain: selectedXDomain,
    yLeftDomain: selectedYLeftDomain,
    yRightDomain: selectedYRightDomain,
    mode: props.brushMode
  });

  // 清除選取框：move(selection, null) 會把 brush 的選取框收掉
  if (brushLayerRef.value) {
    const brushBehavior = props.brushMode === 'xy' ? d3.brush() : d3.brushX();
    brushBehavior.move(d3.select(brushLayerRef.value), null);
  }
};

/**
 * 渲染 Brush（框選縮放）功能 - 支援雙模式
 * 
 * @description 根據 brushMode 創建不同類型的選取框：
 *              - 'xy' 模式：使用 d3.brush()，可框選 X 和 Y 軸範圍，同時縮放兩軸
 *              - 'x' 模式：使用 d3.brushX()，只框選 X 軸範圍，Y 軸自動調整
 *              支援 Band Scale（離散數據）和連續型 Scale，自動計算選取範圍並更新座標軸 domain。
 *              選取完成後會顯示重置按鈕，並觸發 selection-change 事件。
 * 
 * @returns {void} 無回傳值，直接操作 SVG DOM 元素並更新響應式狀態
 * 
 * @fires selection-change - 當框選完成時觸發，傳遞新的 X、Y 軸 domain
 * 
 * @example
 * // 雙軸模式：框選會同時縮放 X 和 Y 軸
 * <DualAxisComboChart brush-mode="xy" :enable-brush="true" />
 * 
 * // 單軸模式：框選只縮放 X 軸，Y 軸自動調整以顯示選取範圍內的數據細節
 * <DualAxisComboChart brush-mode="x" :enable-brush="true" />
 */
const renderBrush = () => {
  if (!props.enableBrush || !brushLayerRef.value || !xScale.value) return;

  const brushLayer = d3.select(brushLayerRef.value);
  
  // 🔧 清除舊的 brush（避免重複渲染造成的多個 overlay）
  brushLayer.selectAll('.brush').remove();

  const brush = props.brushMode === 'xy' ? d3.brush() : d3.brushX();
  
  brush
    .extent([[0, 0], [chartWidth.value, chartHeight.value]])
    .on("end", handleBrushSelection);

  brushLayer.call(brush);
  setupTooltipDetection(brushLayer.select('.overlay'));
};


/**
 * 重置圖表縮放狀態
 * 
 * @description 將所有座標軸的 domain 恢復到原始狀態，清除 Brush 選取效果。
 *              隱藏重置按鈕並觸發 zoom-reset 事件通知父元件。
 * 
 * @returns {void} 無回傳值，更新響應式狀態並觸發事件
 * 
 * @fires zoom-reset - 當重置縮放時觸發
 * 
 * @example
 * // 點擊「Reset Zoom」按鈕時調用
 * handleResetZoom();
 */
const handleResetZoom = () => {
  isLocalBrush.value = false; // 重置標記
  currentXDomain.value = null;
  currentYLeftDomain.value = null;
  currentYRightDomain.value = null;
  resetBtnShow.value = false;
  
  // 🔧 清除 brush selection overlay
  if (brushLayerRef.value) {
    const brushLayer = d3.select(brushLayerRef.value);
    const brush = props.brushMode === 'xy' ? d3.brush() : d3.brushX();
    brushLayer.call(brush.move, null);
  }
  
  emit('zoom-reset');
};

/**
 * 渲染座標軸拖曳功能（平移）
 * 
 * @description 在 X/Y 軸上添加拖曳事件，允許用戶通過拖曳座標軸來平移視圖範圍。
 *              - X 軸：左右拖曳平移 X 軸範圍
 *              - Y 軸：上下拖曳平移 Y 軸範圍（左右 Y 軸獨立）
 *              拖曳時會顯示對應的游標樣式（ew-resize/ns-resize）。
 * 
 * @returns {void} 無回傳值，直接操作 DOM 元素並更新響應式狀態
 * 
 * @fires axis-drag - 當拖曳座標軸時觸發，傳遞新的 domain
 * 
 * @example
 * // 啟用座標軸拖曳功能
 * <DualAxisComboChart :enable-axis-drag="true" />
 */
const renderAxisDrag = () => {
  if (!props.enableAxisDrag) return;

  // X 軸拖曳
  if (xAxisRef.value && xScale.value && chartWidth.value > 0) {
    const xAxisGroup = d3.select(xAxisRef.value);
    
    // 創建一個透明覆蓋層來捕獲拖曳事件
    const overlay = xAxisGroup.selectAll('rect.axis-drag-overlay').data([null])
      .join('rect')
      .attr('class', 'axis-drag-overlay')
      .attr('x', 0)
      .attr('y', -10)
      .attr('width', chartWidth.value)
      .attr('height', 40)
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all')
      .style('cursor', 'ew-resize');
    
    // 移除舊的拖曳事件並重新綁定
    overlay.on('.drag', null);
    // 收窄成 SVGRectElement，drag behavior 的 selection 型別才對得上
    (overlay as d3.Selection<SVGRectElement, unknown, SVGGElement, unknown>).call(
      d3.drag<SVGRectElement, unknown>()
      .on('start', function (this: SVGRectElement) {
        d3.select(this).style('cursor', 'grabbing');
      })
      .on('drag', function (this: SVGRectElement, event: d3.D3DragEvent<SVGRectElement, unknown, unknown>) {
        handleXAxisDrag(event.dx, event.dy);
      })
      .on('end', function() {
        d3.select(this).style('cursor', 'ew-resize');
      })
    );
  }

  // 左 Y 軸拖曳
  if (yAxisLeftRef.value && yLeftScale.value && chartHeight.value > 0) {
    const yAxisGroup = d3.select(yAxisLeftRef.value);
    
    const overlay = yAxisGroup.selectAll('rect.axis-drag-overlay').data([null])
      .join('rect')
      .attr('class', 'axis-drag-overlay')
      .attr('x', -40)
      .attr('y', 0)
      .attr('width', 40)
      .attr('height', chartHeight.value)
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all')
      .style('cursor', 'ns-resize');
    
    overlay.on('.drag', null);
    // 收窄成 SVGRectElement，drag behavior 的 selection 型別才對得上
    (overlay as d3.Selection<SVGRectElement, unknown, SVGGElement, unknown>).call(
      d3.drag<SVGRectElement, unknown>()
      .on('start', function (this: SVGRectElement) {
        d3.select(this).style('cursor', 'grabbing');
      })
      .on('drag', function (this: SVGRectElement, event: d3.D3DragEvent<SVGRectElement, unknown, unknown>) {
        handleYAxisDrag(event.dx, event.dy, 'left');
      })
      .on('end', function() {
        d3.select(this).style('cursor', 'ns-resize');
      })
    );
  }

  // 右 Y 軸拖曳
  if (yAxisRightRef.value && yRightScale.value && chartHeight.value > 0) {
    const yAxisGroup = d3.select(yAxisRightRef.value);
    
    const overlay = yAxisGroup.selectAll('rect.axis-drag-overlay').data([null])
      .join('rect')
      .attr('class', 'axis-drag-overlay')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 40)
      .attr('height', chartHeight.value)
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all')
      .style('cursor', 'ns-resize');
    
    overlay.on('.drag', null);
    // 收窄成 SVGRectElement，drag behavior 的 selection 型別才對得上
    (overlay as d3.Selection<SVGRectElement, unknown, SVGGElement, unknown>).call(
      d3.drag<SVGRectElement, unknown>()
      .on('start', function (this: SVGRectElement) {
        d3.select(this).style('cursor', 'grabbing');
      })
      .on('drag', function (this: SVGRectElement, event: d3.D3DragEvent<SVGRectElement, unknown, unknown>) {
        handleYAxisDrag(event.dx, event.dy, 'right');
      })
      .on('end', function() {
        d3.select(this).style('cursor', 'ns-resize');
      })
    );
  }
};

/**
 * 處理 X 軸拖曳事件
 * @param {number} dx - X 方向的拖曳距離（像素）
 * @param {number} dy - Y 方向的拖曳距離（像素）
 */
const handleXAxisDrag = (dx: number, dy: number): void => {
  if (!xScale.value || !originalXDomain.value) return;
  
  // ✅ Band Scale（類別型）預設不支援拖曳
  if (props.xScaleType === 'band') return;
  
  const currentDomain = currentXDomain.value || originalXDomain.value;
  if (currentDomain.length < 2) return;

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  let newDomain: XDomain;
  
  // ✅ 時間軸需要轉換為數字（時間戳）進行計算
  const isTimeScale = props.xScaleType === 'time';
  const [domainMin, domainMax] = toNumericDomain(currentDomain, isTimeScale);
  
  // 判斷主要拖曳方向（參照 Y 軸邏輯）
  if (absDx > absDy && absDx >= 1) {
    // 水平拖曳 => 平移
    const range = domainMax - domainMin;
    const pixelToValue = range / chartWidth.value;
    const shift = -dx * pixelToValue;
    
    const newMin = domainMin + shift;
    const newMax = domainMax + shift;
    
    // ✅ 時間軸轉回 Date 對象
    newDomain = isTimeScale 
      ? [new Date(newMin), new Date(newMax)]
      : [newMin, newMax];
  } else if (absDy > absDx && absDy >= 1) {
    // 垂直拖曳 => 縮放
    const range = domainMax - domainMin;
    const center = (domainMin + domainMax) / 2;
    
    const zoomFactor = 1 + (dy / chartHeight.value) * 2;
    const newRange = Math.max(range * 0.01, range * zoomFactor);
    
    const newMin = center - newRange / 2;
    const newMax = center + newRange / 2;
    
    // ✅ 時間軸轉回 Date 對象
    newDomain = isTimeScale
      ? [new Date(newMin), new Date(newMax)]
      : [newMin, newMax];
  } else {
    return;
  }

  currentXDomain.value = newDomain;
  resetBtnShow.value = true;
  
  emit('axis-drag', {
    axis: 'x',
    domain: currentXDomain.value
  });
};

/**
 * 處理 Y 軸拖曳事件
 * @param {number} dx - X 方向的拖曳距離（像素）
 * @param {number} dy - Y 方向的拖曳距離（像素）
 * @param {string} side - 'left' | 'right' - 哪一側的 Y 軸
 */
const handleYAxisDrag = (dx: number, dy: number, side: ChartAxisSide): void => {
  const yScale = side === 'left' ? yLeftScale.value : yRightScale.value;
  const originalDomain = side === 'left' ? originalYLeftDomain.value : originalYRightDomain.value;
  
  if (!yScale || !originalDomain) return;

  const currentDomain = (side === 'left' ? currentYLeftDomain.value : currentYRightDomain.value) || originalDomain;
  
  if (currentDomain.length < 2) return;

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  let newDomain: YDomain;
  
  // 判斷主要拖曳方向
  if (absDy > absDx && absDy >= 1) {
    // 垂直拖曳 => 平移
    const range = currentDomain[1] - currentDomain[0];
    const pixelToValue = range / chartHeight.value;
    const shift = dy * pixelToValue;
    
    const newMin = currentDomain[0] + shift;
    const newMax = currentDomain[1] + shift;
    newDomain = [newMin, newMax];
  } else if (absDx > absDy && absDx >= 1) {
    // 水平拖曳 => 縮放
    const range = currentDomain[1] - currentDomain[0];
    const center = (currentDomain[0] + currentDomain[1]) / 2;
    
    // 向右拖（dx > 0）=> 縮小（放大範圍），向左拖（dx < 0）=> 放大（縮小範圍）
    const zoomFactor = 1 + (dx / chartWidth.value) * 2;
    const newRange = Math.max(range * 0.01, range * zoomFactor);
    
    const newMin = center - newRange / 2;
    const newMax = center + newRange / 2;
    newDomain = [newMin, newMax];
  } else {
    return;
  }
  
  if (side === 'left') {
    currentYLeftDomain.value = [newDomain[0], newDomain[1]];
  } else {
    currentYRightDomain.value = [newDomain[0], newDomain[1]];
  }

  resetBtnShow.value = true;
  
  emit('axis-drag', {
    axis: side === 'left' ? 'yLeft' : 'yRight',
    domain: newDomain
  });
};

/**
 * 渲染圖表背景網格線
 * 
 * @description 根據左側 Y 軸的刻度繪製水平網格線，提供視覺參考輔助線。
 *              網格線會橫跨整個圖表寬度，並在 showGrid 為 false 時不顯示。
 * 
 * @returns {void} 無回傳值，直接操作 DOM 元素
 * 
 * @example
 * // 當 props.showGrid 為 true 且存在左 Y 軸時，會自動渲染網格線
 * renderGrid();
 */
const renderGrid = () => {
  if (!gridLayerRef.value) return;

  const g = d3.select(gridLayerRef.value);

  // ✅ 如果不顯示網格，移除所有網格線
  if (!props.showGrid) {
    g.selectAll('*').remove();
    return;
  }

  // Y 軸網格線
  if (yLeftScale.value) {
    // tickFormat 要傳函式；原本傳字串 '' 只是碰巧被 d3 忽略
    const gridLeft = d3
      .axisLeft<number>(yLeftScale.value)
      .tickSize(-chartWidth.value)
      .tickFormat(() => '');

    g.selectAll<SVGGElement, null>('.grid-left')
      .data([null])
      .join('g')
      .attr('class', 'grid-left')
      .call(gridLeft)
      .selectAll('line')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-opacity', 0.5);
  }

  // 移除 domain 線
  g.selectAll('.domain').remove();
};

/**
 * 渲染堆疊長條圖圖層（支援 Brush 縮放）
 * 
 * @description 處理所有類型為 'stacked-bar' 的圖層，使用 D3 的 stack 佈局生成器
 *              將多個數據系列堆疊顯示。支援動畫過渡、滑鼠互動事件、自定義顏色配置。
 *              使用 composable 預處理好的數據，避免重複過濾。
 * 
 * @returns {void} 無回傳值，直接操作 SVG DOM 元素
 * 
 * @fires layer-hover - 當滑鼠懸停在長條上時觸發
 * @fires layer-click - 當點擊長條時觸發
 * 
 * @example
 * // 自動從 processedLeftLayers 中篩選出堆疊圖層並渲染
 * // 數據已經根據 Brush 範圍過濾好
 * renderStackedBars();
 */
const renderStackedBars = () => {
  if (!stackedBarLayerRef.value) return;

  const g = d3.select(stackedBarLayerRef.value);
  // ✅ 使用預處理好的圖層（數據已過濾）
  const stackedLayers = processedLeftLayers.value.filter(l => l.type === 'stacked-bar');

  if (!stackedLayers.length) {
    g.selectAll('*').remove();
    return;
  }

  // ✅ 完全清除所有內容，從頭開始渲染
  g.selectAll('*').remove();

  stackedLayers.forEach((layer, layerIndex) => {
    const { data, stackKeys, xValue, colorScale } = layer;
    const xs = xScale.value;
    const yScale = yLeftScale.value;

    // 堆疊柱狀圖必須是 band scale（每根柱子佔一個類別的寬度）；
    // 缺少 xValue、stackKeys 或比例尺時無法定位，靜默跳過
    if (!data || !data.length || !stackKeys || !xValue || !yScale || !isBandScale(xs)) return;

    // D3 stack 生成器
    const stack = d3
      .stack<ChartDatum>()
      .keys(stackKeys)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const series = stack(data);

    // 為每個 layer 創建獨立的 group
    const layerGroup = g.append('g')
      .attr('class', `layer-${layerIndex}`);

    // 渲染每個系列
    series.forEach((seriesData, seriesIndex) => {
      const seriesKey = seriesData.key;
      // colorScale 可以是 d3 的 ordinal scale（函式）或一張查表；
      // 兩者都支援，最後退回 d3 內建色盤
      const color = resolveSeriesColor(colorScale, seriesKey, seriesIndex);

      // ✅ 直接使用 append 建立元素，完全避免 data join
      seriesData.forEach((d, _dataIndex) => {
        const x = xs(String(xValue(d.data)));
        const y0 = yScale(d[0]);
        const y1 = yScale(d[1]);
        const height = y0 - y1;
        const bandwidth = xs.bandwidth();

        // 跳過無效數據
        if (x === undefined || !Number.isFinite(height) || height < 0) return;

        const bar = layerGroup.append('rect')
          .attr('class', `layer-${layerIndex}-series-${seriesIndex} stacked-bar`)
          .attr('x', x)
          .attr('width', bandwidth)
          .attr('fill', color)
          .style('cursor', 'pointer')
          .datum({ rawData: d.data, layer, seriesKey })
          .on('mouseenter', function (this: SVGRectElement, event: MouseEvent) {
            const barData = d3.select(this).datum() as BoundDatum;
            handleLayerHover(event, barData.rawData, barData.layer, barData.seriesKey);
          })
          .on('mouseleave', () => {
            handleLayerLeave();
          })
          .on('click', function (this: SVGRectElement) {
            const barData = d3.select(this).datum() as BoundDatum;
            emit('layer-click', {
              data: barData.rawData,
              layer: barData.layer,
              series: barData.seriesKey,
            });
          });

        // ✅ 動畫處理
        if (effectiveAnimationDuration.value > 0) {
          bar.attr('y', chartHeight.value)
            .attr('height', 0)
            .transition()
            .duration(effectiveAnimationDuration.value)
            .ease(d3.easeCubicOut)
            .attr('y', y1)
            .attr('height', height);
        } else {
          bar.attr('y', y1)
            .attr('height', height);
        }
      });
    });
  });
};

/**
 * 渲染折線圖圖層（支援 Brush 縮放）
 * 
 * @description 處理所有類型為 'line' 的圖層，使用 D3 的 line 生成器繪製平滑曲線。
 *              支援自定義曲線類型、線條顏色、粗細，以及可選的數據點圓圈顯示。
 *              支援左右兩側 Y 軸。使用 composable 預處理好的數據，避免重複過濾。
 * 
 * @returns {void} 無回傳值，直接操作 SVG DOM 元素
 * 
 * @fires layer-hover - 當滑鼠懸停在數據點上時觸發
 * @fires layer-click - 當點擊數據點時觸發
 * 
 * @example
 * // 自動從 processedLeftLayers 和 processedRightLayers 中篩選出折線圖層並渲染
 * // 數據已經根據 Brush 範圍過濾好
 * renderLines();
 */
const renderLines = () => {
  if (!lineLayerRef.value) return;

  const g = d3.select(lineLayerRef.value);
  // ✅ 使用預處理好的圖層（數據已過濾）- 支援左右兩側 Y 軸
  const leftLineLayers = processedLeftLayers.value.filter(l => l.type === 'line');
  const rightLineLayers = processedRightLayers.value.filter(l => l.type === 'line');
  const lineLayers = [...leftLineLayers, ...rightLineLayers];

  if (!lineLayers.length) {
    g.selectAll('*').remove();
    return;
  }

  lineLayers.forEach((layer, layerIndex) => {
    const { data, xValue, yValue, lineColor, strokeWidth, showDots, curve, yAxis } = layer;

    // ✅ 根據 yAxis 選擇對應的 scale
    const ys = yAxis === 'right' ? yRightScale.value : yLeftScale.value;
    const xs = xScale.value;

    // 缺少任一必要條件就畫不出這個圖層；靜默跳過而不是產生 NaN 座標
    if (!data || !xValue || !yValue || !xs || !ys) return;

    const { xPos, yPos, isDefined } = makeAccessors(xs, ys, xValue, yValue);
    const color = lineColor || '#ef4444';

    // 線條生成器
    const lineGenerator = d3
      .line<ChartDatum>()
      .defined(isDefined)
      .x((d) => xPos(d) ?? 0)
      .y(yPos)
      .curve(curve || d3.curveMonotoneX);
    /**       
      * 常見曲線類型：
        d3.curveLinear：直線連接（折線圖）
        d3.curveMonotoneX：平滑曲線，保證單調性（不會上下震盪）
        d3.curveStep：階梯狀（適合離散事件）
        d3.curveBasis：貝塞爾曲線（非常平滑） */

    // 渲染線條
    g.selectAll(`path.line-${layerIndex}`)
      .data([data]) // ✅ 直接使用已過濾的 data
      .join(
        enter => enter.append('path')
          .attr('class', `line-${layerIndex} line`)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', strokeWidth || 2)
          .attr('d', lineGenerator),
        update => update,
        exit => exit.remove()
      )
      .transition()
      .duration(effectiveAnimationDuration.value)
      .ease(d3.easeCubicOut)
      .attr('d', lineGenerator)
      .attr('stroke', color)
      .attr('stroke-width', strokeWidth || 2);

    // 渲染數據點
    if (showDots) {
      // ✅ 過濾掉會產生 NaN 的數據點
      const validData = data.filter(isDefined);

      g.selectAll<SVGCircleElement, BoundDatum>(`circle.dot-${layerIndex}`)
        .data(
          validData.map((d) => ({ rawData: d, layer })),
          makeKeyFn(layer)
        )
        .join(
          enter => enter.append('circle')
            .attr('class', `dot-${layerIndex} line-dot`)
            .attr('r', 0)
            .attr('fill', color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseenter', (event: MouseEvent, d) => {
              d3.select(event.target as SVGCircleElement).attr('r', 6);
              handleLayerHover(event, d.rawData, d.layer);
            })
            .on('mouseleave', (event: MouseEvent) => {
              d3.select(event.target as SVGCircleElement).attr('r', 4);
              handleLayerLeave();
            })
            .on('click', (_event: MouseEvent, d) => {
              emit('layer-click', { data: d.rawData, layer: d.layer });
            }),
          update => update,
          exit => exit.transition()
            .duration(effectiveAnimationDuration.value / 2)
            .attr('r', 0)
            .remove()
        )
        .transition()
        .duration(effectiveAnimationDuration.value)
        .ease(d3.easeCubicOut)
        .attr('cx', (d) => xPos(d.rawData) ?? 0)
        .attr('cy', (d) => yPos(d.rawData))
        .attr('r', 4);
    }
  });
};

/**
 * 渲染散點圖圖層（支援 Brush 縮放）
 * 
 * @description 處理所有類型為 'scatter' 的圖層，繪製散點圖（僅顯示數據點，無連接線）。
 *              支援自定義點的大小、顏色、形狀等。可用於相關性分析、分佈圖等場景。
 *              支援左右兩側 Y 軸。使用 composable 預處理好的數據，避免重複過濾。
 * 
 * @returns {void} 無回傳值，直接操作 SVG DOM 元素
 * 
 * @fires layer-hover - 當滑鼠懸停在數據點上時觸發
 * @fires layer-click - 當點擊數據點時觸發
 * 
 * @example
 * // 自動從 processedLeftLayers 和 processedRightLayers 中篩選出散點圖層並渲染
 * // 數據已經根據 Brush 範圍過濾好
 * renderScatter();
 */
const renderScatter = () => {
  if (!lineLayerRef.value) return;

  const g = d3.select(lineLayerRef.value);
  // ✅ 使用預處理好的圖層（數據已過濾）- 支援左右兩側 Y 軸
  const leftScatterLayers = processedLeftLayers.value.filter(l => l.type === 'scatter');
  const rightScatterLayers = processedRightLayers.value.filter(l => l.type === 'scatter');
  const scatterLayers = [...leftScatterLayers, ...rightScatterLayers];

  if (!scatterLayers.length) {
    // 不移除所有元素，因為可能有折線圖
    return;
  }

  scatterLayers.forEach((layer, layerIndex) => {
    const { 
      data, 
      xValue, 
      yValue, 
      dotColor, 
      dotSize,
      dotOpacity,
      yAxis 
    } = layer;
    // ✅ 根據 yAxis 選擇對應的 scale
    const ys = yAxis === 'right' ? yRightScale.value : yLeftScale.value;
    const xs = xScale.value;

    // 缺少任一必要條件就畫不出這個圖層
    if (!data || !xValue || !yValue || !xs || !ys) return;

    const { xPos, yPos } = makeAccessors(xs, ys, xValue, yValue);
    const color = dotColor || '#3b82f6';
    const size = dotSize || 4;
    const opacity = dotOpacity ?? 0.7;

    // 渲染散點
    g.selectAll<SVGCircleElement, BoundDatum>(`circle.scatter-dot-${layerIndex}`)
      .data(
        data.map((d) => ({ rawData: d, layer })),
        makeKeyFn(layer)
      )
      .join(
        enter => enter.append('circle')
          .attr('class', `scatter-dot-${layerIndex} scatter-dot`)
          .attr('r', 0)
          .attr('fill', color)
          .attr('fill-opacity', opacity)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1)
          .style('cursor', 'pointer')
          .on('mouseenter', (event: MouseEvent, d) => {
            d3.select(event.target as SVGCircleElement)
              .attr('r', size * 1.5)
              .attr('fill-opacity', 1)
              .attr('stroke-width', 2);
            handleLayerHover(event, d.rawData, d.layer);
          })
          .on('mouseleave', (event: MouseEvent) => {
            d3.select(event.target as SVGCircleElement)
              .attr('r', size)
              .attr('fill-opacity', opacity)
              .attr('stroke-width', 1);
            handleLayerLeave();
          })
          .on('click', (_event: MouseEvent, d) => {
            emit('layer-click', { data: d.rawData, layer: d.layer });
          }),
        update => update,
        exit => exit.transition()
          .duration(effectiveAnimationDuration.value / 2)
          .attr('r', 0)
          .remove()
      )
      .transition()
      .duration(effectiveAnimationDuration.value)
      .ease(d3.easeCubicOut)
      .attr('cx', (d) => xPos(d.rawData) ?? 0)
      .attr('cy', (d) => yPos(d.rawData))
      .attr('r', size)
      .attr('fill', color)
      .attr('fill-opacity', opacity);
  });
};

/**
 * 渲染圖表的三個座標軸
 * 
 * @description 繪製 X 軸、左 Y 軸和右 Y 軸，並應用自定義的刻度格式化函式。
 *              使用 D3 的過渡動畫平滑更新座標軸變化（Brush 縮放時會禁用動畫以提升性能）。
 * 
 * @returns {void} 無回傳值，直接操作 SVG DOM 元素
 * 
 * @example
 * // 根據當前的 xScale, yLeftScale, yRightScale 自動渲染座標軸
 * renderAxes();
 */
const renderAxes = () => {
  // X 軸
  if (xAxisRef.value && xScale.value) {
    // XScale 是 band / 連續型的聯集，d3.axisBottom 需要一個具體的 AxisScale；
    // 兩者在座標軸的用法相同，這裡統一視為 AxisScale<d3.AxisDomain>
    const xAxis = d3.axisBottom(xScale.value as d3.AxisScale<d3.AxisDomain>);
    if (props.xAxisFormat) {
      const format = props.xAxisFormat as unknown as (value: d3.AxisDomain) => string;
      xAxis.tickFormat((value) => format(value));
    }

    d3.select(xAxisRef.value)
      .transition()
      .duration(effectiveAnimationDuration.value)
      .call(xAxis as unknown as (t: d3.Transition<SVGGElement, unknown, null, undefined>) => void)
      .selectAll('text')
      .style('text-anchor', props.xAxisLabelRotate !== 0 ? 'end' : 'middle')
      .attr('dx', props.xAxisLabelRotate !== 0 ? '-.8em' : '0')
      .attr('dy', props.xAxisLabelRotate !== 0 ? '.15em' : '.71em')
      .attr('transform', `rotate(${props.xAxisLabelRotate})`);
  }

  // 左 Y 軸
  if (yAxisLeftRef.value && yLeftScale.value) {
    const yAxis = d3.axisLeft<number>(yLeftScale.value);
    if (props.yLeftAxisFormat) {
      const format = props.yLeftAxisFormat;
      yAxis.tickFormat((value) => format(Number(value)));
    }

    d3.select(yAxisLeftRef.value)
      .transition()
      .duration(effectiveAnimationDuration.value)
      .call(yAxis as unknown as (t: d3.Transition<SVGGElement, unknown, null, undefined>) => void);
  }

  // 右 Y 軸
  if (yAxisRightRef.value && yRightScale.value) {
    const yAxis = d3.axisRight<number>(yRightScale.value);
    if (props.yRightAxisFormat) {
      const format = props.yRightAxisFormat;
      yAxis.tickFormat((value) => format(Number(value)));
    }

    d3.select(yAxisRightRef.value)
      .transition()
      .duration(effectiveAnimationDuration.value)
      .call(yAxis as unknown as (t: d3.Transition<SVGGElement, unknown, null, undefined>) => void);
  }
};

/**
 * 渲染圖表標題
 * 
 * @description 在圖表頂部中央顯示標題文字。標題樣式使用 Tailwind CSS 類別。
 *              當 props.title 為空時不顯示標題。
 * 
 * @returns {void} 無回傳值，直接操作 SVG DOM 元素
 * 
 * @example
 * // 當 props.title = '銷售趨勢分析' 時，會在圖表上方顯示標題
 * renderTitle();
 */
const renderTitle = () => {
  if (!titleLayerRef.value) return;

  const g = d3.select(titleLayerRef.value);
  const titleData = props.title ? [props.title] : [];

  g.selectAll('text.chart-title')
    .data(titleData)
    .join(
      enter => enter.append('text').attr('class', 'chart-title'),
      update => update,
      exit => exit.remove()
    )
    .attr('x', chartWidth.value / 2)
    .attr('y', -20)
    .attr('text-anchor', 'middle')
    .attr('class', 'chart-title text-xl font-semibold text-gray-800')
    .text(d => d);
};

/**
 * 渲染圖表圖例
 * 
 * @description 在圖表右上角顯示所有圖層的圖例項目。
 *              堆疊圖會顯示每個堆疊系列的顏色方塊，折線圖會顯示線條樣式。
 *              支援通過 layer.legend.show 控制是否顯示特定圖層的圖例。
 * 
 * @returns {void} 無回傳值，直接操作 SVG DOM 元素
 * 
 * @example
 * // 自動收集所有圖層的圖例配置並渲染
 * renderLegend();
 */
const renderLegend = () => {
  if (!legendLayerRef.value) return;

  const g = d3.select(legendLayerRef.value);
  const legendItems: LegendItem[] = [];

  // 收集所有需要圖例的項目
  props.layers.forEach(layer => {
    if (layer.legend?.show !== false) {
      if (layer.type === 'stacked-bar' && layer.stackKeys) {
        layer.stackKeys.forEach((key, i) => {
          const color = resolveSeriesColor(layer.colorScale, key, i);
          legendItems.push({ label: key, color, type: 'rect' });
        });
      } else if (layer.type === 'line') {
        legendItems.push({
          label: layer.legend?.label || 'Line',
          color: layer.lineColor || '#ef4444',
          type: 'line'
        });
      } else if (layer.type === 'scatter') {
        legendItems.push({
          label: layer.legend?.label || 'Scatter',
          color: layer.dotColor || '#3b82f6',
          type: 'scatter',
          dotSize: layer.dotSize || 4
        });
      }
    }
  });

  // ✅ 收集 Trigger 線圖例
  props.triggerLines.forEach(triggerLine => {
    if (triggerLine.showInLegend !== false && triggerLine.label) {
      legendItems.push({
        label: triggerLine.label,
        color: triggerLine.color || '#9ca3af',
        type: 'trigger-line',
        strokeDasharray: triggerLine.strokeDasharray
      });
    }
  });

  const itemWidth = 100;
  // ✅ 圖例放置在圖表下方，水平居中
  const totalWidth = legendItems.length * itemWidth;
  const startX = (chartWidth.value - totalWidth) / 2;
  const startY = chartHeight.value + 30; // 圖表底部下方 30px

  g.selectAll<SVGGElement, LegendItem>('g.legend-item')
    .data(legendItems)
    .join(
      enter => {
        const item = enter.append('g').attr('class', 'legend-item');
        item.append('rect').attr('class', 'legend-symbol');
        item.append('line').attr('class', 'legend-line');
        item.append('text').attr('class', 'legend-text');
        return item;
      },
      update => update,
      exit => exit.remove()
    )
    .attr('transform', (_d, i) => `translate(${startX + i * itemWidth}, ${startY})`)
    .each(function (this: SVGGElement, d) {
      const item = d3.select(this);
      
      if (d.type === 'rect') {
        item.select('.legend-symbol')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 15)
          .attr('height', 15)
          .attr('fill', d.color);
        item.select('.legend-line').remove();
      } else if (d.type === 'trigger-line') {
        // ✅ Trigger 線樣式（支援虛線）
        item.select('.legend-line')
          .attr('x1', 0)
          .attr('x2', 15)
          .attr('y1', 7)
          .attr('y2', 7)
          .attr('stroke', d.color)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', d.strokeDasharray || null);
        item.select('.legend-symbol').remove();
      } else if (d.type === 'scatter') {
        // ✅ 散點圖樣式
        item.select('.legend-symbol')
          .attr('cx', 7.5)
          .attr('cy', 7.5)
          .attr('r', d.dotSize || 4)
          .attr('fill', d.color)
          .attr('fill-opacity', 0.7)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);
        // 將 rect 改為 circle
        const symbol = item.select('.legend-symbol');
        if ((symbol.node() as Element | null)?.tagName === 'rect') {
          symbol.remove();
          item.insert('circle', '.legend-text')
            .attr('class', 'legend-symbol')
            .attr('cx', 7.5)
            .attr('cy', 7.5)
            .attr('r', d.dotSize || 4)
            .attr('fill', d.color)
            .attr('fill-opacity', 0.7)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1);
        }
        item.select('.legend-line').remove();
      } else {
        item.select('.legend-line')
          .attr('x1', 0)
          .attr('x2', 15)
          .attr('y1', 7)
          .attr('y2', 7)
          .attr('stroke', d.color)
          .attr('stroke-width', 2);
        item.select('.legend-symbol').remove();
      }

      item.select('.legend-text')
        .attr('x', 20)
        .attr('y', 12)
        .attr('class', 'legend-text text-sm text-gray-700')
        .text(d.label);
    });
};

// === 事件處理 ===

/**
 * 渲染 Trigger 線（管制圖參考線）
 * 
 * @description 繪製水平或垂直的參考線，常用於管制圖的 UCL/LCL/CL 線，
 *              或良率分析圖的目標線、警告線等。支援虛線樣式、自定義顏色、
 *              標籤顯示、滑鼠互動等功能。
 * 
 * @returns {void} 無回傳值，直接操作 SVG DOM 元素
 * 
 * @fires layer-hover - 當滑鼠懸停在 trigger 線上時觸發（需 interactive: true）
 * @fires layer-click - 當點擊 trigger 線時觸發（需 interactive: true）
 * 
 * @example
 * // 繪製上控制限線（UCL）
 * triggerLines: [
 *   {
 *     type: 'horizontal',
 *     value: 100,
 *     yAxis: 'left',
 *     label: 'UCL',
 *     color: '#ef4444',
 *     strokeDasharray: '5,5',
 *     showInLegend: true
 *   }
 * ]
 */
const renderTriggerLines = () => {
  if (!triggerLineLayerRef.value || !props.triggerLines.length) {
    if (triggerLineLayerRef.value) {
      d3.select(triggerLineLayerRef.value).selectAll('*').remove();
    }
    return;
  }

  const g = d3.select(triggerLineLayerRef.value);

  // 為每條 trigger 線創建一個 group
  const lineGroups = g
    .selectAll<SVGGElement, TriggerLine>('g.trigger-line-group')
    .data(props.triggerLines, (d, i) => d.id ?? String(i))
    .join(
      enter => enter.append('g').attr('class', 'trigger-line-group'),
      update => update,
      exit => exit.remove()
    );

  lineGroups.each(function (this: SVGGElement, triggerLine) {
    const lineGroup = d3.select(this);
    const {
      type = 'horizontal',
      value,
      yAxis = 'left',
      label,
      color = '#9ca3af',
      strokeWidth = 2,
      strokeDasharray = null,
      interactive = true,
      labelPosition = 'end'
    } = triggerLine;

    /**
     * 參考線的 hover / click payload。
     * 參考線不是資料圖層，但沿用 layer-hover / layer-click 讓使用端
     * 能用同一組事件處理 —— 這是既有的對外行為。
     */
    const triggerLineDatum: ChartDatum = { value, label, type, yAxis };
    const triggerLinePseudoLayer: ChartLayer = { ...triggerLine, type: 'trigger-line' };

    // 選擇對應的 scale
    const yScale = yAxis === 'left' ? yLeftScale.value : yRightScale.value;

    if (!yScale) return;

    let x1, y1, x2, y2;

    if (type === 'horizontal') {
      // 水平線
      const yPos = yScale(value);
      x1 = 0;
      y1 = yPos;
      x2 = chartWidth.value;
      y2 = yPos;
    } else {
      // 垂直線（未來擴展）
      const xs = xScale.value;
      if (!xs) return;
      const xPos = isBandScale(xs)
        ? (xs(String(value)) ?? 0) + xs.bandwidth() / 2
        : (xs as d3.ScaleContinuousNumeric<number, number>)(value);
      x1 = xPos;
      y1 = 0;
      x2 = xPos;
      y2 = chartHeight.value;
    }

    // 渲染線條
    lineGroup
      .selectAll<SVGLineElement, TriggerLine>('line.trigger-line')
      .data([triggerLine])
      .join(
        (enter) => {
          const line = enter
            .append('line')
            .attr('class', 'trigger-line')
            .attr('stroke', color)
            .attr('stroke-width', strokeWidth)
            .attr('stroke-dasharray', strokeDasharray)
            .style('cursor', interactive ? 'pointer' : 'default');

          // 只在需要互動時才綁事件。
          // 原本寫 `.on('mouseenter', interactive ? fn : null)` —— 傳入
          // 「函式 | null」的聯集會讓 d3 的 .on() 多載無法解析，而且即使
          // interactive 為 false 也白走一次綁定。
          if (interactive) {
            line
              .on('mouseenter', function (this: SVGLineElement, event: MouseEvent) {
                d3.select(this).attr('stroke-width', strokeWidth + 1);
                handleLayerHover(event, triggerLineDatum, triggerLinePseudoLayer);
              })
              .on('mouseleave', function (this: SVGLineElement) {
                d3.select(this).attr('stroke-width', strokeWidth);
                handleLayerLeave();
              })
              .on('click', () => {
                emit('layer-click', {
                  data: triggerLineDatum,
                  layer: triggerLinePseudoLayer,
                });
              });
          }

          return line;
        },
        update => update,
        exit => exit.remove()
      )
      .transition()
      .duration(effectiveAnimationDuration.value)
      .attr('x1', x1)
      .attr('y1', y1)
      .attr('x2', x2)
      .attr('y2', y2)
      .attr('stroke', color)
      .attr('stroke-width', strokeWidth)
      .attr('stroke-dasharray', strokeDasharray);

    // 渲染標籤
    if (label) {
      let labelX, labelY, textAnchor;

      if (type === 'horizontal') {
        labelY = y1;
        if (labelPosition === 'start') {
          labelX = 5;
          textAnchor = 'start';
        } else if (labelPosition === 'middle') {
          labelX = chartWidth.value / 2;
          textAnchor = 'middle';
        } else {
          labelX = chartWidth.value - 5;
          textAnchor = 'end';
        }
      } else {
        labelX = x1;
        if (labelPosition === 'start') {
          labelY = chartHeight.value - 5;
          textAnchor = 'middle';
        } else if (labelPosition === 'middle') {
          labelY = chartHeight.value / 2;
          textAnchor = 'middle';
        } else {
          labelY = 10;
          textAnchor = 'middle';
        }
      }

      lineGroup.selectAll('text.trigger-label')
        .data([label])
        .join(
          enter => enter.append('text')
            .attr('class', 'trigger-label')
            .attr('fill', color)
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .style('pointer-events', 'none'),
          update => update,
          exit => exit.remove()
        )
        .transition()
        .duration(effectiveAnimationDuration.value)
        .attr('x', labelX)
        .attr('y', labelY - 3)
        .attr('text-anchor', textAnchor)
        .attr('fill', color)
        .text(label);
    }
  });
};

/**
 * 處理圖層元素的滑鼠懸停事件
 * 
 * @description 當用戶將滑鼠懸停在圖表元素（長條、數據點等）上時觸發。
 *              更新 tooltip 的資料和可見性，並發出相關事件供父元件監聽。
 * 
 * @param {MouseEvent} event - 原生滑鼠事件物件，用於計算 tooltip 位置
 * @param {Object} data - 被懸停元素所對應的資料物件
 * @param {Object} layer - 圖層配置物件，包含圖層類型、樣式等資訊
 * @param {string} [seriesKey] - 堆疊圖的系列鍵值（僅堆疊圖使用）
 * 
 * @returns {void} 無回傳值，透過 emit 發出事件
 * 
 * @fires layer-hover - 發出圖層懸停事件，傳遞資料和圖層資訊
 * @fires tooltip-show - 發出顯示 tooltip 事件，傳遞位置和內容資訊
 * 
 * @example
 * // D3 事件監聽器中使用
 * .on('mouseenter', (event, d) => {
 *   handleLayerHover(event, d, layer, 'series1');
 * })
 */
const handleLayerHover = (
  event: MouseEvent,
  data: ChartDatum,
  layer: ChartLayer,
  seriesKey?: string
): void => {
  tooltipData.value = { data, layer, seriesKey };
  tooltipVisible.value = true;
  emit('layer-hover', { data, layer, seriesKey });
  emit('tooltip-show', { 
    position: buildTooltipPosition(event), 
    data, 
    layer,
    seriesKey 
  });
};

/**
 * 處理圖層元素的滑鼠離開事件
 * 
 * @description 當用戶將滑鼠移出圖表元素時觸發，隱藏 tooltip 並發出事件。
 * 
 * @returns {void} 無回傳值，透過 emit 發出事件
 * 
 * @fires tooltip-hide - 發出隱藏 tooltip 事件
 * 
 * @example
 * // D3 事件監聽器中使用
 * .on('mouseleave', () => {
 *   handleLayerLeave();
 * })
 */
const handleLayerLeave = (): void => {
  tooltipVisible.value = false;
  emit('tooltip-hide');
};

/**
 * 建立 tooltip 的位置資訊物件
 * 
 * @description 根據滑鼠事件計算 tooltip 應該顯示的位置，包含頁面座標和相對於容器的座標。
 *              提供兩種座標系統供 tooltip 元件選擇使用。
 * 
 * @param {MouseEvent} event - 滑鼠事件物件，包含 clientX 和 clientY 屬性
 * 
 * @returns {Object} 位置資訊物件
 * @returns {number} returns.pageX - 相對於整個頁面的 X 座標
 * @returns {number} returns.pageY - 相對於整個頁面的 Y 座標
 * @returns {number|null} returns.containerX - 相對於圖表容器的 X 座標（容器不存在時為 null）
 * @returns {number|null} returns.containerY - 相對於圖表容器的 Y 座標（容器不存在時為 null）
 * 
 * @example
 * const position = buildTooltipPosition(mouseEvent);
 * // { pageX: 450, pageY: 300, containerX: 120, containerY: 80 }
 */
const buildTooltipPosition = (event: MouseEvent): TooltipPosition => {
  const rect = containerRef.value?.getBoundingClientRect?.();
  return {
    pageX: event.clientX,
    pageY: event.clientY,
    containerX: rect ? event.clientX - rect.left : null,
    containerY: rect ? event.clientY - rect.top : null
  };
};

// === 主渲染循環 ===
watchEffect(() => {
  renderGrid();
  renderAxes();
  renderStackedBars();
  renderLines();
  renderScatter(); // ✅ 渲染散點圖
  renderTriggerLines(); // ✅ 渲染 Trigger 線（管制圖參考線）
  renderTitle();
  renderLegend();
  renderBrush(); // ✅ 渲染 Brush 功能
  renderAxisDrag(); // ✅ 渲染座標軸拖曳功能
});

// === 🔧 監聽外部 domain 變化（處理分面同步） ===
watch(
  () => [props.xDomain, props.yLeftDomain, props.yRightDomain],
  (newDomains, oldDomains) => {
    // 只有當不是本地 Brush 且 domain 確實改變時，才清除 selection
    if (!isLocalBrush.value && brushLayerRef.value) {
      const [newX, newYLeft, newYRight] = newDomains;
      const [oldX, oldYLeft, oldYRight] = oldDomains || [];
      
      const hasChange = 
        JSON.stringify(newX) !== JSON.stringify(oldX) ||
        JSON.stringify(newYLeft) !== JSON.stringify(oldYLeft) ||
        JSON.stringify(newYRight) !== JSON.stringify(oldYRight);
      
      if (hasChange) {
        // 外部 domain 改變（其他分面 Brush），清除本地的 selection overlay
        const brushLayer = d3.select(brushLayerRef.value);
        const brush = props.brushMode === 'xy' ? d3.brush() : d3.brushX();
        brushLayer.call(brush.move, null);
        
        // 同步更新 currentDomain（避免顯示舊的縮放）
        currentXDomain.value = null;
        currentYLeftDomain.value = null;
        currentYRightDomain.value = null;
      }
    }
    
    // 重置 isLocalBrush 標記（下次 Brush 時會重新設置）
    if (isLocalBrush.value) {
      isLocalBrush.value = false;
    }
  },
  { deep: true }
);

/**
 * 設置 ResizeObserver 以監聽容器尺寸變化
 * 
 * @description 當 autoResize 為 true 時，監聽父容器的尺寸變化並自動更新圖表。
 *              使用防抖機制避免過於頻繁的重繪，提升性能。
 * 
 * @example
 * // 啟用自動響應式
 * <DualAxisComboChart :auto-resize="true" :debounce-delay="200" />
 */
onMounted(() => {
  // ✅ 設置 ResizeObserver（僅在啟用 autoResize 時）
  if (props.autoResize && containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // 清除之前的防抖計時器
        if (resizeDebounceTimer) {
          clearTimeout(resizeDebounceTimer);
        }

        // 設置新的防抖計時器
        resizeDebounceTimer = setTimeout(() => {
          const { width, height } = entry.contentRect;
          
          // 只有當尺寸真的改變時才更新
          if (width !== observedWidth.value || height !== observedHeight.value) {
            observedWidth.value = Math.floor(width);
            observedHeight.value = Math.floor(height);
            
            // 觸發 resize 事件
            emit('chart-resize', {
              width: observedWidth.value,
              height: observedHeight.value,
              chartWidth: chartWidth.value,
              chartHeight: chartHeight.value
            });
          }
        }, props.debounceDelay);
      }
    });

    resizeObserver.observe(containerRef.value);
  }

  emit('chart-ready', {
    scales: { x: xScale.value, yLeft: yLeftScale.value, yRight: yRightScale.value },
    dimensions: { width: chartWidth.value, height: chartHeight.value }
  });
});

/**
 * 清理 ResizeObserver
 * 
 * @description 組件卸載時斷開 ResizeObserver 連接並清除防抖計時器，避免記憶體洩漏。
 */
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

// SVG 與容器對外開放，方便呼叫端截圖或量測
defineExpose({ containerRef, svgRef })
</script>

<style scoped>
.dual-axis-chart {
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* ✅ 自動響應式模式：容器填滿父元素 */
.dual-axis-chart:has(svg) {
  width: 100%;
  height: 100%;
}

.dual-axis-chart svg {
  display: block;
}

.stacked-bar:hover {
  opacity: 0.8;
}

.line-dot:hover {
  stroke-width: 3;
}

:deep(.x-axis) text,
:deep(.y-axis-left) text,
:deep(.y-axis-right) text {
  font-size: 12px;
  fill: #6b7280;
}

:deep(.x-axis) path,
:deep(.y-axis-left) path,
:deep(.y-axis-right) path {
  stroke: #d1d5db;
}

:deep(.x-axis) line,
:deep(.y-axis-left) line,
:deep(.y-axis-right) line {
  stroke: #d1d5db;
}

.legend-item {
  cursor: pointer;
}

.legend-item:hover {
  opacity: 0.7;
}

/* ✅ Brush 樣式 - 支援雙模式 */
:deep(.brush-layer .selection) {
  fill: #3b82f6;
  fill-opacity: 0.15;
  stroke: #3b82f6;
  stroke-width: 2;
}

/* BrushX 模式的垂直手柄 */
:deep(.brush-layer .handle--w),
:deep(.brush-layer .handle--e) {
  fill: #3b82f6;
  fill-opacity: 0.8;
}

/* Brush(XY) 模式的所有手柄 */
:deep(.brush-layer .handle) {
  fill: #3b82f6;
  fill-opacity: 0.6;
}

/* 選取框懸停效果 */
:deep(.brush-layer .selection:hover) {
  fill-opacity: 0.25;
}

/* overlay 游標樣式 */
:deep(.brush-layer .overlay) {
  cursor: crosshair;
}

/* ✅ Trigger 線樣式 */
:deep(.trigger-line-layer .trigger-line) {
  shape-rendering: crispEdges;
}

:deep(.trigger-line-layer .trigger-line:hover) {
  filter: brightness(1.2);
}

:deep(.trigger-line-layer .trigger-label) {
  user-select: none;
  text-shadow: 0 0 3px white, 0 0 3px white, 0 0 3px white;
}

/* ✅ 座標軸拖曳樣式 */
:deep(.axis-drag-overlay) {
  cursor: inherit;
}

:deep(.x-axis .axis-drag-overlay:hover),
:deep(.y-axis-left .axis-drag-overlay:hover),
:deep(.y-axis-right .axis-drag-overlay:hover) {
  fill: rgba(59, 130, 246, 0.05);
}
</style>
