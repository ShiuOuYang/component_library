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
} from './ui/index.js'

// ===== charts =====
export {
  DualAxisComboChart, EnterpriseHeatmap, EnterprisePareto, ParetoChart,
  FacetedChart, GridFacetChart,
} from './charts/index.js'

// ===== viewer =====
export { GerberViewer, PcbLayout } from './viewer/index.js'

// ===== excel =====
export {
  ChptExcelEditor, ChptExcelExporter, ChptExcelUploader,
} from './excel/index.js'

// ===== shared =====
export { useToast } from './shared/useToast'
export { useConfirm } from './shared/useConfirm'
export { useNotification } from './shared/useNotification'
export type { NotificationOptions, NotificationAction } from './shared/useNotification'
export type { ConfirmOptions } from './shared/useConfirm'
export { useDarkMode, initDarkMode, THEME_STORAGE_KEY } from './shared/useDarkMode'
export { useModalManager, generateModalId } from './shared/useModalManager'
export { useOptionalRouter } from './shared/useOptionalRouter'
export { useOverlay } from './shared/useOverlay'
export { warnDeprecated } from './shared/warnDeprecated'
export { validateValue, checkRule } from './shared/formValidation'
export type { FormRule, FormRules } from './shared/formValidation'
export type { UploadFile, UploadRequest } from './ui/ChptUpload.vue'
export type { TreeNode } from './ui/ChptTree.vue'
export type { AutocompleteSuggestion } from './ui/ChptAutocomplete.vue'
export type { CascaderOption } from './ui/ChptCascader.vue'
export type { TransferItem } from './ui/ChptTransfer.vue'
export type { MenuItem } from './ui/chptMenuContext'
export type { AnchorItem } from './ui/ChptAnchor.vue'
export type { ViewerImage } from './ui/ChptImageViewer.vue'
