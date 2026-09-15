/**
 * 組件庫正式入口 — 匯出 canonical 公開 API
 *
 * 新專案請改由此 import；既有專案過渡期仍可用 '@/components/common'（facade）。
 * legacy 元件不在此匯出（請用 canonical Chpt*）。
 */

// ===== ui：canonical 通用 UI =====
export {
  ChptAlert, ChptAvatar, ChptBadge, ChptBreadcrumb, ChptButton, ChptCard,
  ChptCheckbox, ChptCodeBlock, ChptCollapse, ChptDarkModeToggle, ChptDatePicker,
  ChptDivider, ChptDrawer, ChptEmpty, ChptFilter, ChptFilterBar, ChptFixedTable,
  ChptHeaderLogoutButton, ChptIcon, ChptInput, ChptModal, ChptModalDock,
  ChptPageSwitcher, ChptPagination, ChptPopconfirm, ChptProgress, ChptRadio,
  ChptSelect, ChptSkeleton, ChptSpinner, ChptSteps, ChptSwitch, ChptTable,
  ChptTabNavigation, ChptTabs, ChptTag, ChptTextarea, ChptToast, ChptTooltip,
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
export { useDarkMode, initDarkMode, THEME_STORAGE_KEY } from './shared/useDarkMode'
