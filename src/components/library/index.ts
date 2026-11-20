/**
 * 組件庫正式入口 — 匯出 canonical 公開 API
 *
 * 一律由此 import（舊的 '@/components/common' 入口與非 Chpt 元件已移除）。
 */

// ===== ui：canonical 通用 UI =====
export {
  ChptAlert, ChptAvatar, ChptBadge, ChptBreadcrumb, ChptButton, ChptCard,
  ChptCheckbox, ChptCodeBlock, ChptCollapse, ChptDarkModeToggle, ChptDataTooltip,
  ChptDatePicker,
  ChptDivider, ChptDrawer, ChptEmpty, ChptFilter, ChptFilterBar, ChptFixedTable,
  ChptHeaderLogoutButton, ChptIcon, ChptInput, ChptModal, ChptModalDock,
  ChptPageSwitcher, ChptPagination, ChptPopconfirm, ChptProgress, ChptRadio,
  ChptSelect, ChptSkeleton, ChptSpinner, ChptSteps, ChptSwitch, ChptTable,
  ChptTabNavigation, ChptTabs, ChptTag, ChptTextarea, ChptToast, ChptTooltip,
  // 2026-09 新增
  ChptDescriptions, ChptDropdown, ChptInputNumber, ChptResult, ChptSegmented,
  ChptSlider, ChptStatistic, ChptTimeline,
  ChptForm, ChptFormItem, ChptUpload, ChptTree,
  ChptAutocomplete, ChptCalendar, ChptCascader, ChptColorPicker, ChptPopover, ChptRate,
  ChptTransfer,
  ChptAnchor, ChptBackTop, ChptConfirmHost, ChptImage, ChptImageViewer, ChptMenu,
  ChptTimePicker, ChptTreeSelect,
  ChptAffix, ChptCarousel, ChptNotificationHost, ChptSplitter, ChptVirtualList,
  ChptCopyButton, ChptCountdown, ChptEllipsis, ChptWatermark,
  ChptConfigProvider, ChptInputTag, ChptList, ChptQRCode, ChptSpace, ChptTour,
  ChptScanInput, ChptFormList, ChptSchemaForm, ChptCommandPalette, ChptDashboardGrid, ChptKanban, ChptRichTextEditor, ChptBarcode, ChptCameraScanner,
  ChptDefectAnnotator,
  ChptEquipmentWall,
  ChptSignaturePad,
  ChptNumpad,
} from './ui/index.js'

// ===== charts =====
export {
  DualAxisComboChart, EnterpriseHeatmap, EnterprisePareto, ParetoChart,
  FacetedChart, GridFacetChart, StatusScatterMap, GanttChart,
  HorizontalBarChart, PieChart, SparklineChart, GaugeChart, ControlChart, CapabilityHistogram,
  StateTimeline, BoxPlotChart, WaterfallChart, ChptChartFrame, ChptKpiCard, WaferMap,
  BulletChart, YieldFunnel, CalendarHeatmap,
  exportChart, elementToSvg, svgToPng, toCsv, csvBlob, downloadBlob, useChartSync,
} from './charts/index.js'

// ===== viewer =====
export { GerberViewer, PcbLayout } from './viewer/index.js'

// ===== excel =====
export {
  ChptExcelEditor, ChptExcelExporter, ChptExcelUploader,
} from './excel/index.js'

// ===== shared =====
export { useToast } from './shared/useToast'
export type { ChptToastItem } from './shared/useToast'
export { useConfirm } from './shared/useConfirm'
export { useNotification } from './shared/useNotification'
export { resolveDatePreset, resolvePresetValue, shiftRange, DEFAULT_DATE_PRESETS } from './shared/datePresets'
export type { DatePresetKey, DatePreset, CustomDatePreset, ShiftDef, DatePresetOptions } from './shared/datePresets'
export { fuzzyMatch, scoreCommand, highlightParts, matchHotkey, formatHotkey, parseHotkey } from './shared/commandSearch'
export type { CommandMatch, SearchableCommand } from './shared/commandSearch'
export { collides, compact, moveItem, clampItem, findSpace, sortLayout, sameLayout } from './shared/gridLayout'
export type { GridItem, GridCompact } from './shared/gridLayout'
export { moveCard, groupCards, indexInColumn, dropIndex } from './shared/kanban'
export type { KanbanCardLike } from './shared/kanban'
export { isSafeUrl } from './shared/safeUrl'
export { encodeBarcode, encodeCode128, encodeCode39, code39CheckChar, BarcodeError } from './shared/barcode'
export type { BarcodeFormat, BarcodeResult } from './shared/barcode'
export { applyNumpadKey, parseNumpad, numpadText, numpadRangeError, numpadKeyFromKeyboard } from './shared/numpad'
export type { NumpadKey, NumpadBufferOptions } from './shared/numpad'
export { createDetector, classifyCameraError, cameraAvailability, createDeduper } from './shared/cameraScan'
export type { ScanFormat, DetectedCode, CameraErrorKind, CodeDetector, ScanFrame } from './shared/cameraScan'
export { rectFromCorners, moveMark, nextMarkId, countByType, markCenter } from './shared/defectMarks'
export type { DefectMark, DefectType } from './shared/defectMarks'
export { filterEquipment, sortEquipment, groupEquipment, countEquipment, averageUtilization, EQUIPMENT_STATUSES } from './shared/equipment'
export type { EquipmentItem, EquipmentStatus, EquipmentMetric } from './shared/equipment'
export { createWidthTracker, signatureBounds, signatureToSVG, exportRect as signatureExportRect } from './shared/signature'
export type { SignaturePoint, SignatureStroke, SignatureWidthOptions, SignatureInput, SignatureBounds, SignatureSvgOptions } from './shared/signature'
export { useConfig, useLocale, provideConfig, zhTW, enUS, mergeLocale } from './shared/config'
export type { ChptConfig, ChptConfigInput, ChptLocale, ChptLocaleInput, ConfigSize } from './shared/config'
export type { NotificationOptions, NotificationAction, NotificationType } from './shared/useNotification'
export type { ConfirmOptions } from './shared/useConfirm'
export { useDarkMode, initDarkMode, THEME_STORAGE_KEY } from './shared/useDarkMode'
export type { ChptThemeMode } from './shared/useDarkMode'
export { useModalManager, generateModalId } from './shared/useModalManager'
export type { MinimizedModalInfo } from './shared/useModalManager'
export { useOptionalRouter } from './shared/useOptionalRouter'
export { useOverlay } from './shared/useOverlay'
export type { UseOverlayOptions } from './shared/useOverlay'
export { warnDeprecated } from './shared/warnDeprecated'
export { validateValue, checkRule } from './shared/formValidation'
export type { FormRule, FormRules, ValidationMessages } from './shared/formValidation'
export type {
  ComponentSize, ColorVariant, RadiusSize, SelectOption, Recordable, DividerDirection,
  Placement, Direction, ButtonNativeType, InputNativeType,
} from './shared/types/ui.types'

// ===== 各子入口的型別（props 的資料形狀與事件 payload） =====
export type {
  AnchorItem, AutocompleteSuggestion, CascaderOption, ChptDatePickerValue, DescriptionItem,
  DropdownItem, ChptFixedTableColumn, ChptFixedTableRow, ViewerImage, MenuItem, MenuKey,
  SegmentOption, SliderMark, TableColumn, TableRow, TableRowKey, TableSortItem,
  TableDefaultSort, TableChangeEvent, TableSortEvent, TableColumnAlign, TableCellContext, TableColumnColor, TableColumnFixed, TableSummaryType, TimelineItem, TourStep, TransferItem,
  ScanResult, ScanStatus, ScanRejectReason, ChptScanInputProps, ScanSource, ChptFormListProps,
  SchemaFormField, SchemaFieldType, SchemaFieldOption, CommandItem, DashboardItem, KanbanColumn, KanbanMoveEvent, RichTextTool,
  TreeNode, UploadFile, UploadRequest, UploadStatus,
} from './ui/index.js'
export type {
  ChartDatum, XAccessor, YAccessor, ContinuousScaleType, XScaleType, XDomain, YDomain,
  ChartLayerType, ChartAxisSide, ChartLayerLegend, ChartLayer,
  BrushMode, BrushSelectionPayload, ChartMargin, TooltipPosition, TooltipPayload, XScale, YScale,
  ChartLayerEvent, ChartSelectionEvent, ChartAxisDomainEvent, ChartResizeEvent, ChartReadyEvent,
  GridFacetCell, TriggerLine, FacetConfig, GridFacet, GridFacetDatum, ParetoDatum, ParetoSortOrder,
  HeatmapDatum, ColorLegendPosition, HeatmapHighlightMode, HeatmapColorScale, HeatmapCell,
  GradientStop, HeatmapCustomRenderers,
  VerticalFacet, ParetoInputItem, ParetoChartDatum, StatusDef, StatusScatterTooltip,
  GanttStatusDef, GanttRowInput, GanttTaskEvent, GanttTooltip, GanttTaskChange, GanttChangeType, GanttDependency,
  GanttSnap,
  HorizontalBarEvent, HorizontalBarTooltip, HorizontalBarReferenceLine, PieSliceEvent, PieTooltip,
  SparklinePoint, SparklineTooltip, GaugeBand,
  ControlChartPoint, ControlChartTooltip, ControlChartAnalysis, ControlChartSpec, HistogramBin, HistogramTooltip,
  ControlChartType, ControlChartLimits, ControlChartViolation, CapabilityResult,
  StateTimelineEvent, StateTimelineTooltip, StateTimelineRowInput, StateDef, StateSummary,
  DualAxisComboChartProps,
  WaferBin, WaferDieInfo, WaferGrid, WaferShape, WaferNotch, YieldSummary, RingYield,
  BulletItem, FunnelStep, FunnelRow, FunnelResult, CalendarDatum, CalendarCell, ChartSync, ChartSyncOptions, CrosshairValue,
  BoxPlotGroupEvent, BoxPlotPointEvent, BoxPlotTooltip, BoxPlotReferenceLine, BoxPlotGroupInput, BoxStats, QuartileMethod,
  WaterfallEvent, WaterfallTooltip, WaterfallKind,
  ChartFrameExportFormat, ChptChartFrameProps, ChartExportFormat, ChartExportOptions, CsvColumn, KpiStatus, ChptKpiCardProps,
} from './charts/index.js'
export type {
  GerberLayerInput, GerberImageInfo, PcbBoardInfo, PcbElementEvent,
  PcbElementType, PcbPadShape, PcbPoint, PcbOutline, PcbRegion, PcbTrace, PcbPad, PcbVia,
  PcbSilk, PcbComponent, PcbElement, PcbLayerInput, PcbBoard, PcbData,
} from './viewer/index.js'
export type {
  ExcelExporterColumn, ExcelExporterCellStyle, ExcelExporterSize, ExcelExporterVariant,
} from './excel/index.js'
