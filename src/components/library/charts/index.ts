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
