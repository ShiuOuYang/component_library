/**
 * 組件庫正式入口 — 匯出 canonical 公開 API
 *
 * 新專案請改由此 import；既有專案過渡期仍可用 '@/components/common'（facade）。
 * legacy 元件不在此匯出（請用 canonical Chpt*）。
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
} from './ui/index.js'

// ===== charts =====
export {
  DualAxisComboChart, EnterpriseHeatmap, EnterprisePareto, ParetoChart,
  FacetedChart, GridFacetChart, StatusScatterMap,
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
export { useConfig, provideConfig, zhTW, enUS } from './shared/config'
export type { ChptConfig, ChptConfigInput, ChptLocale, ConfigSize } from './shared/config'
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
export type { FormRule, FormRules } from './shared/formValidation'
export type {
  ComponentSize, ColorVariant, RadiusSize, SelectOption, Recordable, DividerDirection,
  Placement, Direction, ButtonNativeType, InputNativeType,
} from './shared/types/ui.types'

// ===== 各子入口的型別（props 的資料形狀與事件 payload） =====
export type {
  AnchorItem, AutocompleteSuggestion, CascaderOption, ChptDatePickerValue, DescriptionItem,
  DropdownItem, ChptFixedTableColumn, ChptFixedTableRow, ViewerImage, MenuItem, MenuKey,
  SegmentOption, SliderMark, TableColumn, TableRow, TableRowKey, TableSortItem,
  TableDefaultSort, TableChangeEvent, TableSortEvent, TimelineItem, TourStep, TransferItem,
  TreeNode, UploadFile, UploadRequest, UploadStatus,
} from './ui/index.js'
export type {
  ChartDatum, XAccessor, YAccessor, ContinuousScaleType, XScaleType, XDomain, YDomain,
  ChartLayerType, ChartAxisSide, ChartLayerLegend, ChartLayer,
  BrushMode, BrushSelectionPayload, ChartMargin, TooltipPosition, TooltipPayload, XScale, YScale,
  ChartLayerEvent, ChartSelectionEvent, ChartAxisDomainEvent, ChartResizeEvent, ChartReadyEvent,
  GridFacetCell, TriggerLine, FacetConfig, GridFacet, GridFacetDatum, ParetoDatum, ParetoSortOrder,
  HeatmapDatum, ColorLegendPosition, HeatmapHighlightMode, HeatmapColorScale, HeatmapCell,
  GradientStop, HeatmapCustomRenderers, ParetoHighlightMode, ParetoCustomRenderers,
  VerticalFacet, ParetoInputItem, ParetoChartDatum, StatusDef, StatusScatterTooltip,
} from './charts/index.js'
export type {
  GerberLayerInput, GerberImageInfo, PcbBoardInfo, PcbElementEvent,
  PcbElementType, PcbPadShape, PcbPoint, PcbOutline, PcbRegion, PcbTrace, PcbPad, PcbVia,
  PcbSilk, PcbComponent, PcbElement, PcbLayerInput, PcbBoard, PcbData,
} from './viewer/index.js'
export type {
  ExcelExporterColumn, ExcelExporterCellStyle, ExcelExporterSize, ExcelExporterVariant,
} from './excel/index.js'
