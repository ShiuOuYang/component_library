/**
 * library/charts — 資料視覺化圖表
 */
export { default as DualAxisComboChart } from './DualAxisComboChart.vue'
export { default as EnterpriseHeatmap } from './EnterpriseHeatmap.vue'
export { default as EnterprisePareto } from './EnterprisePareto.vue'
export { default as ParetoChart } from './ParetoChart.vue'
export { default as FacetedChart } from './FacetedChart.vue'
export { default as GridFacetChart } from './GridFacetChart.vue'
export { default as StatusScatterMap } from './StatusScatterMap.vue'
export { default as GanttChart } from './GanttChart.vue'
export { default as HorizontalBarChart } from './HorizontalBarChart.vue'
export { default as PieChart } from './PieChart.vue'
export { default as SparklineChart } from './SparklineChart.vue'
export { default as GaugeChart } from './GaugeChart.vue'
export { default as ControlChart } from './ControlChart.vue'
export { default as CapabilityHistogram } from './CapabilityHistogram.vue'
export { default as StateTimeline } from './StateTimeline.vue'
export { default as BoxPlotChart } from './BoxPlotChart.vue'
export { default as WaterfallChart } from './WaterfallChart.vue'

// ===== 型別（props 的資料形狀與事件 payload） =====
export type {
  ChartDatum, XAccessor, YAccessor, ContinuousScaleType, XScaleType, XDomain, YDomain,
  ChartLayerType, ChartAxisSide, ChartLayerLegend, ChartLayer,
  BrushMode, BrushSelectionPayload, ChartMargin, TooltipPosition, TooltipPayload, XScale, YScale,
  ChartLayerEvent, ChartSelectionEvent, ChartAxisDomainEvent, ChartResizeEvent, ChartReadyEvent,
  GridFacetCell,
} from './types/chart.types'
export type { TriggerLine, FacetConfig, GridFacet, GridFacetDatum } from './composables/faceChart/useFacetLayout'
export type { ParetoDatum, ParetoSortOrder } from './composables/useParetoData'
export type {
  HeatmapDatum, ColorLegendPosition, HighlightMode as HeatmapHighlightMode, HeatmapColorScale,
  HeatmapCell, GradientStop, HeatmapCustomRenderers,
} from './EnterpriseHeatmap.vue'
export type { VerticalFacet } from './FacetedChart.vue'
export type { ParetoInputItem, ParetoChartDatum } from './ParetoChart.vue'
export type { StatusDef, StatusScatterTooltip } from './StatusScatterMap.vue'
export type {
  GanttStatusDef, GanttRowInput, GanttTaskEvent, GanttTooltip, GanttTaskChange, GanttChangeType, GanttDependency,
} from './GanttChart.vue'
export type { GanttSnap } from './utils/gantt'
export type { HorizontalBarEvent, HorizontalBarTooltip, HorizontalBarReferenceLine } from './HorizontalBarChart.vue'
export type { PieSliceEvent, PieTooltip } from './PieChart.vue'
export type { SparklinePoint, SparklineTooltip } from './SparklineChart.vue'
export type { GaugeBand } from './GaugeChart.vue'
export type { ControlChartPoint, ControlChartTooltip, ControlChartAnalysis, ControlChartSpec } from './ControlChart.vue'
export type { HistogramBin, HistogramTooltip } from './CapabilityHistogram.vue'
export type {
  ControlChartType, FixedLimits as ControlChartLimits, Violation as ControlChartViolation, CapabilityResult,
} from './utils/spc'
export type { StateTimelineEvent, StateTimelineTooltip, StateTimelineRowInput } from './StateTimeline.vue'
export type { StateDef, StateSummary } from './utils/stateTimeline'
export type {
  BoxPlotGroupEvent, BoxPlotPointEvent, BoxPlotTooltip, BoxPlotReferenceLine, BoxPlotGroupInput,
} from './BoxPlotChart.vue'
export type { BoxStats, QuartileMethod } from './utils/boxPlot'
export type { WaterfallEvent, WaterfallTooltip } from './WaterfallChart.vue'
export type { WaterfallKind } from './utils/waterfall'
