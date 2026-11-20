<template>
  <div
    ref="containerRef"
    class="dual-axis-chart"
    :style="autoResize ? {} : { width: width + 'px', height: height + 'px' }"
    @mousemove="onCrosshairMove"
    @mouseleave="onCrosshairLeave"
  >
    <!--
      ✅ 大量資料模式：散點與長條畫在 Canvas 上（數萬個 SVG 節點光排版就要好幾秒）。
      疊在 SVG 下方、對齊繪圖區；SVG 沒有底色，折線、參考線、brush 都在它上面。
      不用 <foreignObject> 放進 SVG：Safari 對變形／裁切中的 foreignObject 長期有繪製錯位的問題
    -->
    <canvas
      ref="canvasRef"
      class="canvas-layer"
      :style="{ left: `${margin.left}px`, top: `${margin.top}px` }"
      aria-hidden="true"
    ></canvas>
    <svg ref="svgRef" :width="effectiveWidth" :height="effectiveHeight" :class="{ 'is-panning': isPanning }">
      <defs>
        <!-- 定義漸層、陰影等可重用的 SVG 元素 -->
        <clipPath :id="`clip-${chartId}`">
          <rect :width="chartWidth" :height="chartHeight" />
        </clipPath>
      </defs>

      <g ref="plotRef" :transform="`translate(${margin.left}, ${margin.top})`">
        <!-- 圖層順序很重要：背景 -> 網格 -> 圖表 -> 座標軸 -> 標題 -->
        <g ref="gridLayerRef" class="grid-layer"></g>
        
        <!-- ✅ 圖層容器：使用 clip-path 防止圖表超出範圍 -->
        <g :clip-path="`url(#clip-${chartId})`">
          <g ref="stackedBarLayerRef" class="stacked-bar-layer"></g>
          <g ref="lineLayerRef" class="line-layer"></g>
          <!-- ✅ Trigger 線圖層（在數據圖層之上，Brush 之下） -->
          <g ref="triggerLineLayerRef" class="trigger-line-layer"></g>
          <!-- ✅ 連動高亮：highlightKey 對到的資料點／長條畫上標記（SVG 與 Canvas 模式通用） -->
          <g ref="highlightLayerRef" class="highlight-layer"></g>
          <!-- ✅ 大量資料模式的 hover 標記（Canvas 上的點沒有 DOM 元素可以放大） -->
          <g ref="hoverLayerRef" class="hover-layer"></g>
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

    <!-- 重設縮放：與 StatusScatterMap、分面圖同一個文字與樣式 -->
    <button
      data-export-ignore
      v-if="resetBtnShow && showResetButton && (enableBrush || enableWheelZoom || enableAxisDrag)"
      type="button"
      class="absolute right-2 top-2 z-20 rounded-md border border-stroke-light bg-surface-primary/80 px-2.5 py-1 text-xs text-content-secondary shadow-sm backdrop-blur hover:bg-surface-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-stroke-focus"
      @click="handleResetZoom"
    >
      {{ i18n.chart.resetZoom }}
    </button>

    <!-- 十字線：滑鼠所在的 X，或外部指定的 crosshairValue（多張圖同步） -->
    <div
      v-if="crosshairView"
      class="chart-crosshair"
      data-export-ignore
      aria-hidden="true"
      :style="{ left: `${margin.left + crosshairView.x}px`, top: `${margin.top}px`, height: `${Math.max(0, chartHeight)}px` }"
    >
      <span v-if="crosshairView.label" class="chart-crosshair-label">{{ crosshairView.label }}</span>
    </div>

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
import type {
  BrushMode,
  ChartAxisDomainEvent,
  ChartLayer,
  ChartLayerEvent,
  ChartMargin,
  ChartReadyEvent,
  ChartResizeEvent,
  ChartSelectionEvent,
  ContinuousScaleType,
  TooltipPayload,
  XDomain,
  XScaleType,
  YDomain,
} from './types/chart.types'
import type { TriggerLine } from './composables/faceChart/useFacetLayout'
import type { DualAxisContext } from './composables/dualAxis/context'
import { useTooltip } from './composables/dualAxis/useTooltip'
import { useHighlight } from './composables/dualAxis/useHighlight'
import { useLargeData } from './composables/dualAxis/useLargeData'
import { useBrushZoom } from './composables/dualAxis/useBrushZoom'
import { useAxisDrag } from './composables/dualAxis/useAxisDrag'
import { useWheelZoom } from './composables/dualAxis/useWheelZoom'
import { useCrosshair } from './composables/dualAxis/useCrosshair'
import { useFrameRenderers } from './composables/dualAxis/useFrameRenderers'
import { useLayerRenderers } from './composables/dualAxis/useLayerRenderers'
import { useLocale } from '../shared/config'

/**
 * DualAxisComboChart —— 雙軸組合圖
 *
 * 這個檔案只放 props、狀態（縮放範圍、比例尺、尺寸）、生命週期與主渲染循環；
 * 框選、拖曳軸、滾輪縮放、大量資料、高亮、十字線與各圖層的繪製都在 composables/dualAxis/。
 */

export interface DualAxisComboChartProps {

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
  /**
   * 滑鼠滾輪縮放（像 Allegro）：在繪圖區以游標那一點為中心，X 與 Y 同時縮放；
   * 在 X 軸或左右 Y 軸的刻度上滾只縮放那一軸。觸控板左右滑動（或 Shift + 滾輪）平移 X 軸，
   * 按住滑鼠中鍵拖曳平移。已在全覽時往外滾會交還給頁面捲動。
   */
  enableWheelZoom?: boolean
  /** 在繪圖區滾動時縮放哪些軸：'xy' 同時縮放 X 與 Y（以游標為中心）；'x' 只縮放 X（Y 維持不動） */
  wheelZoomAxes?: 'xy' | 'x'
  /**
   * 縮小與平移限制在資料範圍內（全覽時往外滾交還給頁面捲動）。
   * 預設 false：像 Allegro，可以縮到比全覽還小、平移到資料範圍外 ——
   * 游標在圖上時滾輪一律由圖表處理，頁面上圖表很多時可搭配 wheelZoomModifier='ctrl'
   */
  limitZoomToData?: boolean
  /** 要按住哪個鍵才用滾輪縮放（'ctrl' 也接受 Mac 的 ⌘）；頁面上圖表很多時可設 'ctrl' 避免捲動頁面時誤觸 */
  wheelZoomModifier?: 'none' | 'ctrl' | 'alt'
  /** 最大放大倍率（相對全覽範圍） */
  maxZoomScale?: number

  // === 連動高亮 ===
  /**
   * 要高亮的資料鍵（例如表格滑過的那一列、外部選取的批號）。
   * 每筆資料的鍵由圖層的 keyFn(datum, index) 產生；沒有 keyFn 時用 X 值（Date 以 ISO 字串比對）。
   * 對到的點與長條畫上標記，其餘的 SVG 元素淡化；null 取消高亮。
   * 搭配 layer-hover / layer-click 事件帶出的 key，就能雙向連動。
   */
  highlightKey?: string | number | Date | null

  // === 大量資料 ===
  /**
   * 圖層「目前可見」的資料筆數超過此值時切換為大量資料模式：
   * 折線依像素降採樣（不畫圓點）、散點與長條改畫在 Canvas 上；滑鼠提示仍指到每一筆原始資料。
   * 放大到可見筆數低於此值時自動切回一般 SVG 模式。
   */
  largeDataThreshold?: number

  // === Trigger 線配置（管制圖、良率分析圖） ===
  /** 參考線，例如規格上下限或良率門檻 */
  triggerLines?: TriggerLine[]

  // === 十字線（多張圖同步） ===
  /** 滑鼠在繪圖區時畫一條垂直十字線並送出 crosshair-move（該位置的 X 值） */
  crosshair?: boolean
  /**
   * 由外部指定十字線的 X 值（例如另一張圖 crosshair-move 送出的值）。
   * 滑鼠在本圖的繪圖區時以滑鼠位置為準；搭配 useChartSync() 不必自己接線
   */
  crosshairValue?: number | string | Date | null
}

/**
 * 元件的事件（拆出去的 composables 用同一份型別）
 * @internal
 */
export interface DualAxisComboChartEmits {
  'layer-click': [payload: ChartLayerEvent]
  'layer-hover': [payload: ChartLayerEvent]
  'tooltip-show': [payload: TooltipPayload]
  'tooltip-hide': []
  'chart-ready': [payload: ChartReadyEvent]
  /** 圖表尺寸變化（autoResize） */
  'chart-resize': [payload: ChartResizeEvent]
  /** Brush 選取範圍改變 */
  'selection-change': [payload: ChartSelectionEvent]
  /** 重置縮放 */
  'zoom-reset': []
  /** 座標軸拖曳平移 */
  'axis-drag': [payload: ChartAxisDomainEvent]
  /** 滾輪縮放／平移；domain 為 null 代表回到全覽 */
  'wheel-zoom': [payload: ChartAxisDomainEvent]
  /** 十字線移動（crosshair 開啟時）：滑鼠所在的 X 值；離開繪圖區時為 null */
  'crosshair-move': [value: number | string | Date | null]
}

/** 元件內建文字（ChptConfigProvider 的 locale；預設繁中） */
const i18n = useLocale()
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
  enableWheelZoom: true,
  wheelZoomAxes: 'xy',
  limitZoomToData: false,
  wheelZoomModifier: 'none',
  maxZoomScale: 10000,
  largeDataThreshold: 2000,
  highlightKey: null,
  triggerLines: () => [],
  crosshair: false,
  crosshairValue: null,
})

const emit = defineEmits<DualAxisComboChartEmits>();

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
const plotRef = ref<SVGGElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const hoverLayerRef = ref<SVGGElement | null>(null);
const highlightLayerRef = ref<SVGGElement | null>(null);

/**
 * 每個實例的唯一 id。
 * 用來組 clip-path 的 id，避免同頁多張圖互相覆蓋彼此的裁切區域。
 */
const chartId = ref(`chart-${Math.random().toString(36).slice(2, 11)}`);
// === 響應式尺寸管理 ===
const observedWidth = ref(props.width);
const observedHeight = ref(props.height);
let resizeObserver: ResizeObserver | null = null;
let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// === Brush 功能整合 ===
// 框選事件由本元件的 handleBrushEnd 自己發（含 mode 與左右 Y 軸），不經過 composable
const { resetBtnShow } = useD3Brush();

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

/**
 * 依繪圖區大小決定刻度數量。d3 預設約 10 個刻度，不管高度 ——
 * 分面圖裡 100px 高的小圖也塞 10 個，標籤疊成一團。約每 32px 一個 Y 刻度、每 70px 一個 X 刻度。
 */
const yTickCount = computed(() => Math.max(2, Math.min(10, Math.floor(chartHeight.value / 32))));
const xTickCount = computed(() => Math.max(2, Math.min(12, Math.floor(chartWidth.value / 70))));


// === 使用 Chart Scales Composable ===
const {
  xScale,
  yLeftScale,
  yRightScale,
  processedLeftLayers,   // ✅ 已過濾數據的左側圖層
  processedRightLayers,  // ✅ 已過濾數據的右側圖層
  originalXDomain,
  originalYLeftDomain,
  originalYRightDomain,
  xZoomBounds,
  yLeftBaseDomain,
  yRightBaseDomain,
  yLeftZoomBounds,
  yRightZoomBounds,
  baseXDomain
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
 * 有動畫時長就回傳 transition，時長為 0 時直接回傳 selection（立刻套用）。
 * 🔧 duration(0) 的 transition 要等下一個 animation frame 才生效：拖曳、縮放時長條（直接設定）
 *    會比折線、散點、座標軸早一個 frame 到位，畫面跟著抖；座標軸的 transition 還會逐個刻度讀 computed style
 * 回傳型別標成 selection 方便串接，所以後面只能接兩者共有的方法（attr、style、text、call、remove）
 */
function animate<E extends d3.BaseType, D, P extends d3.BaseType, PD>(
  selection: d3.Selection<E, D, P, PD>,
  duration: number = effectiveAnimationDuration.value,
  ease: (t: number) => number = d3.easeCubicOut,
): d3.Selection<E, D, P, PD> {
  if (duration <= 0) {
    // 還在跑的舊動畫（例如剛重設縮放）要先停掉，不然下一個 frame 又會被它蓋回去；座標軸的動畫在刻度上，子元素一起停
    selection.interrupt().selectAll('*').interrupt();
    return selection;
  }
  return selection.transition().duration(duration).ease(ease) as unknown as d3.Selection<E, D, P, PD>;
}

// === 拆出去的功能（composables/dualAxis/*）===
// 共用的狀態與比例尺放進 ctx；各 composable 只拿自己需要的
const ctx: DualAxisContext = {
  props,
  emit,
  i18n,
  containerRef,
  svgRef,
  gridLayerRef,
  stackedBarLayerRef,
  lineLayerRef,
  triggerLineLayerRef,
  xAxisRef,
  yAxisLeftRef,
  yAxisRightRef,
  legendLayerRef,
  titleLayerRef,
  brushLayerRef,
  plotRef,
  canvasRef,
  hoverLayerRef,
  highlightLayerRef,
  chartWidth,
  chartHeight,
  xTickCount,
  yTickCount,
  xScale,
  yLeftScale,
  yRightScale,
  processedLeftLayers,
  processedRightLayers,
  originalXDomain,
  originalYLeftDomain,
  originalYRightDomain,
  xZoomBounds,
  yLeftBaseDomain,
  yRightBaseDomain,
  yLeftZoomBounds,
  yRightZoomBounds,
  baseXDomain,
  currentXDomain,
  currentYLeftDomain,
  currentYRightDomain,
  isLocalBrush,
  resetBtnShow,
  effectiveAnimationDuration,
  animate,
};

const { tooltipData, tooltipVisible, handleLayerHover, handleLayerLeave } = useTooltip(ctx);
const { renderHighlight, registerPointHighlights, addHighlightSource, resetHighlightSources } = useHighlight(ctx);
const large = useLargeData(ctx, { handleLayerHover, handleLayerLeave });
const { renderBrush, handleResetZoom } = useBrushZoom(ctx, {
  handleLayerHover,
  handleLayerLeave,
  hoverLargeAt: large.hoverLargeAt,
  clearLargeHover: large.clearLargeHover,
});
const { renderAxisDrag } = useAxisDrag(ctx);
const { onWheel, onPanMouseDown, isPanning, disposeWheelZoom } = useWheelZoom(ctx);
const { onCrosshairMove, onCrosshairLeave, crosshairView } = useCrosshair(ctx);
const { renderGrid, renderAxes, renderTitle, renderLegend } = useFrameRenderers(ctx);
const { renderStackedBars, renderLines, renderScatter, renderTriggerLines } = useLayerRenderers(ctx, {
  handleLayerHover,
  handleLayerLeave,
  addHighlightSource,
  registerPointHighlights,
  isLargeLayer: large.isLargeLayer,
  projectPoints: large.projectPoints,
  drawPointsOnCanvas: large.drawPointsOnCanvas,
  createRectBatch: large.createRectBatch,
  drawRectsOnCanvas: large.drawRectsOnCanvas,
  registerLargeHits: large.registerLargeHits,
});
const { onSvgMouseMove, onSvgMouseLeave } = large;

// === 主渲染循環 ===
watchEffect(() => {
  resetHighlightSources(); // 各圖層渲染時重新登記高亮來源
  large.beginCanvasFrame(); // ✅ 大量資料模式的 Canvas 與命中測試資料每輪重建
  renderGrid();
  renderAxes();
  renderStackedBars();
  renderLines();
  renderScatter(); // ✅ 渲染散點圖
  renderTriggerLines(); // ✅ 渲染 Trigger 線（管制圖參考線）
  renderHighlight(); // ✅ 連動高亮（要在所有資料圖層之後）
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
        // 🔧 縮放狀態清掉了，重置按鈕也要跟著收起
        resetBtnShow.value = false;
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
/** 註冊了滾輪與 hover 監聽的 SVG 元素 */
let listenerTarget: SVGSVGElement | null = null;

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

  // 滾輪要能 preventDefault（攔下頁面捲動），必須註冊成非 passive。
  // 🔧 記住元素本身：卸載時 template ref 已被清成 null，拿 svgRef 會移除不到監聽
  listenerTarget = svgRef.value;
  listenerTarget?.addEventListener('wheel', onWheel, { passive: false });
  listenerTarget?.addEventListener('mousemove', onSvgMouseMove);
  listenerTarget?.addEventListener('mouseleave', onSvgMouseLeave);
  listenerTarget?.addEventListener('mousedown', onPanMouseDown);

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

  // 滾輪縮放與大量資料 hover
  disposeWheelZoom();
  listenerTarget?.removeEventListener('wheel', onWheel);
  listenerTarget?.removeEventListener('mousemove', onSvgMouseMove);
  listenerTarget?.removeEventListener('mouseleave', onSvgMouseLeave);
  listenerTarget?.removeEventListener('mousedown', onPanMouseDown);
  listenerTarget = null;
  large.disposeLargeData();
});

// SVG 與容器對外開放，方便呼叫端截圖或量測
defineExpose({ containerRef, svgRef })
</script>

<style scoped>
/* 中鍵拖曳平移中 */
svg.is-panning,
svg.is-panning * {
  cursor: grabbing !important;
}

.dual-axis-chart {
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* 十字線：與 FacetedChart 同一個樣式 */
.chart-crosshair {
  position: absolute;
  z-index: 15;
  width: 0;
  border-left: 1px dashed rgb(var(--t-content-tertiary));
  pointer-events: none;
}

.chart-crosshair-label {
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

/* ✅ 自動響應式模式：容器填滿父元素 */
.dual-axis-chart:has(svg) {
  width: 100%;
  height: 100%;
}

.dual-axis-chart svg {
  display: block;
  /* 疊在 Canvas 之上（定位元素的繪製順序高於一般元素） */
  position: relative;
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
  fill: rgb(var(--t-content-secondary));
}

:deep(.x-axis) path,
:deep(.y-axis-left) path,
:deep(.y-axis-right) path {
  stroke: rgb(var(--t-stroke-medium));
}

:deep(.x-axis) line,
:deep(.y-axis-left) line,
:deep(.y-axis-right) line {
  stroke: rgb(var(--t-stroke-medium));
}

/* D3 加上的 text-content-primary 只設 color，SVG 文字吃的是 fill（預設黑色）——
   沒有這條，暗色模式下圖例與標題是黑字壓在深色底上 */
:deep(.legend-text),
:deep(.chart-title) {
  fill: rgb(var(--t-content-primary));
}

.legend-item {
  cursor: pointer;
}

.legend-item:hover {
  opacity: 0.7;
}

/* ✅ Brush 樣式 - 支援雙模式 */
:deep(.brush-layer .selection) {
  fill: rgb(var(--t-accent-solid));
  fill-opacity: 0.15;
  stroke: rgb(var(--t-accent-solid));
  stroke-width: 2;
}

/* BrushX 模式的垂直手柄 */
:deep(.brush-layer .handle--w),
:deep(.brush-layer .handle--e) {
  fill: rgb(var(--t-accent-solid));
  fill-opacity: 0.8;
}

/* Brush(XY) 模式的所有手柄 */
:deep(.brush-layer .handle) {
  fill: rgb(var(--t-accent-solid));
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
  /*
   * 文字外圈用圖表底色（深色模式下不能是一圈白光）。
   * 原本用 3px 模糊的 text-shadow：壓在實心長條上時外圈太淡，紅字疊藍柱幾乎讀不出來。
   * 改用 SVG 的描邊光暈（先畫描邊再畫填色），邊緣清楚且不吃字重
   */
  paint-order: stroke fill;
  stroke: rgb(var(--t-surface-primary));
  stroke-width: 3px;
  stroke-linejoin: round;
}

/* ✅ 連動高亮：其餘資料元素淡化；標記不攔截滑鼠 */
:deep(.is-dimmed) {
  opacity: 0.25;
  transition: opacity 150ms ease-out;
}

:deep(.highlight-layer) {
  pointer-events: none;
}

/* ✅ 大量資料模式的 Canvas：不攔截滑鼠，事件交給上層的 brush / SVG 處理 */
.canvas-layer {
  position: absolute;
  display: block;
  pointer-events: none;
}

:deep(.hover-layer) {
  pointer-events: none;
}

/* ✅ 座標軸拖曳樣式 */
:deep(.axis-drag-overlay) {
  cursor: inherit;
}

:deep(.x-axis .axis-drag-overlay:hover),
:deep(.y-axis-left .axis-drag-overlay:hover),
:deep(.y-axis-right .axis-drag-overlay:hover) {
  fill: rgb(var(--t-accent-solid) / 0.05);
}
</style>
