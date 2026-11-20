/**
 * DualAxisComboChart 拆出去的各個 composable 共用的 context
 *
 * 元件本身只負責 props、狀態（縮放範圍、比例尺）與生命週期；框選、拖曳軸、滾輪縮放、
 * 大量資料、高亮、十字線與各圖層的繪製各自在 composables/dualAxis/ 裡。
 * 它們需要的共用狀態都放在這個 ctx 裡傳進去 —— 各自只解構用得到的欄位。
 * @internal
 */
import type { ComputedRef, Ref } from 'vue'
import type * as d3 from 'd3'
import type { ChptLocale } from '../../../shared/locale'
import type { ChartDatum, ChartLayer } from '../../types/chart.types'
import type { DualAxisComboChartEmits, DualAxisComboChartProps } from '../../DualAxisComboChart.vue'
import type { useChartScales } from '../useChartScales'
import type { HighlightMark, LargeHitStore, RectBatch } from './types'

/** 解析過預設值的 props（每個欄位都有值） */
export type DualAxisResolvedProps = Readonly<Required<DualAxisComboChartProps>>

/** 元件的 emit */
export type DualAxisEmit = <K extends keyof DualAxisComboChartEmits>(event: K, ...args: DualAxisComboChartEmits[K]) => void

/**
 * 有動畫時長就回傳 transition，時長為 0 時直接回傳 selection（見元件裡的 animate）
 */
export type AnimateFn = <E extends d3.BaseType, D, P extends d3.BaseType, PD>(
  selection: d3.Selection<E, D, P, PD>,
  duration?: number,
  ease?: (t: number) => number
) => d3.Selection<E, D, P, PD>

type Scales = ReturnType<typeof useChartScales>

export interface DualAxisContext
  extends Pick<
    Scales,
    | 'xScale'
    | 'yLeftScale'
    | 'yRightScale'
    | 'processedLeftLayers'
    | 'processedRightLayers'
    | 'originalXDomain'
    | 'originalYLeftDomain'
    | 'originalYRightDomain'
    | 'xZoomBounds'
    | 'yLeftBaseDomain'
    | 'yRightBaseDomain'
    | 'yLeftZoomBounds'
    | 'yRightZoomBounds'
    | 'baseXDomain'
  > {
  props: DualAxisResolvedProps
  emit: DualAxisEmit
  i18n: ComputedRef<ChptLocale>

  // 每個圖層是一個 <g>；D3 直接操作這些節點
  containerRef: Ref<HTMLDivElement | null>
  svgRef: Ref<SVGSVGElement | null>
  gridLayerRef: Ref<SVGGElement | null>
  stackedBarLayerRef: Ref<SVGGElement | null>
  lineLayerRef: Ref<SVGGElement | null>
  triggerLineLayerRef: Ref<SVGGElement | null>
  xAxisRef: Ref<SVGGElement | null>
  yAxisLeftRef: Ref<SVGGElement | null>
  yAxisRightRef: Ref<SVGGElement | null>
  legendLayerRef: Ref<SVGGElement | null>
  titleLayerRef: Ref<SVGGElement | null>
  brushLayerRef: Ref<SVGGElement | null>
  plotRef: Ref<SVGGElement | null>
  canvasRef: Ref<HTMLCanvasElement | null>
  hoverLayerRef: Ref<SVGGElement | null>
  highlightLayerRef: Ref<SVGGElement | null>

  /** 繪圖區大小（扣掉 margin） */
  chartWidth: ComputedRef<number>
  chartHeight: ComputedRef<number>
  xTickCount: ComputedRef<number>
  yTickCount: ComputedRef<number>

  /** 目前的縮放範圍（null 為沒有縮放） */
  currentXDomain: Scales['originalXDomain']
  currentYLeftDomain: Scales['originalYLeftDomain']
  currentYRightDomain: Scales['originalYRightDomain']
  /** 這次 domain 變更是本圖自己造成的（分面圖同步回來時不當成外部變更清掉） */
  isLocalBrush: Ref<boolean>
  /** 有縮放（顯示重設鈕，同時關閉動畫） */
  resetBtnShow: Ref<boolean>

  effectiveAnimationDuration: ComputedRef<number>
  animate: AnimateFn
}

/** 滑鼠提示（useTooltip） */
export interface HoverHandlers {
  handleLayerHover: (event: MouseEvent, data: ChartDatum, layer: ChartLayer, seriesKey?: string, key?: string) => void
  handleLayerLeave: () => void
}

/** useBrushZoom 需要的其他功能 */
export interface BrushDeps extends HoverHandlers {
  hoverLargeAt: (event: MouseEvent) => boolean
  clearLargeHover: (emitLeave?: boolean) => void
}

/** useLayerRenderers 需要的其他功能 */
export interface LayerRendererDeps extends HoverHandlers {
  addHighlightSource: (find: (target: string) => HighlightMark[]) => void
  registerPointHighlights: (
    layer: ChartLayer,
    data: ChartDatum[],
    xPos: (d: ChartDatum) => number | undefined,
    yPos: (d: ChartDatum) => number,
    color: string,
    radius: number
  ) => void
  isLargeLayer: (count: number) => boolean
  projectPoints: (
    data: ChartDatum[],
    xPos: (d: ChartDatum) => number | undefined,
    yPos: (d: ChartDatum) => number
  ) => { px: Float32Array; py: Float32Array }
  drawPointsOnCanvas: (
    layer: ChartLayer,
    data: ChartDatum[],
    px: Float32Array,
    py: Float32Array,
    options: { color: string; radius: number; opacity: number }
  ) => void
  createRectBatch: (n: number, colors: string[], withSeries: boolean) => RectBatch
  drawRectsOnCanvas: (layer: ChartLayer, batch: RectBatch, count: number) => void
  registerLargeHits: (store: LargeHitStore) => void
}
