/**
 * Common Components Export (組件庫文檔)
 * 通用組件統一導出入口（barrel export）
 * ==========================================
 * 所有位於 common 資料夾的組件都應在此登記，
 * 方便以 `import { ChptButton } from '@/components/common'` 統一引入。
 * 新增組件時：把組件放在本資料夾 → 在此加入一行 export。
 */

// ===== 基礎表單原子元件（CHPT 主題，TypeScript） =====
export { default as ChptIcon } from './ChptIcon.vue';
export { default as ChptButton } from './ChptButton.vue';
export { default as ChptInput } from './ChptInput.vue';
export { default as ChptTextarea } from './ChptTextarea.vue';
export { default as ChptSelect } from './ChptSelect.vue';
export { default as ChptRadio } from './ChptRadio.vue';
export { default as ChptCheckbox } from './ChptCheckbox.vue';
export { default as ChptSwitch } from './ChptSwitch.vue';
export { default as ChptDatePicker } from './ChptDatePicker.vue';

// ===== 資料呈現 =====
export { default as ChptTable } from './ChptTable.vue';
export { default as ChptFixedTable } from './ChptFixedTable.vue';
export { default as FixedTable } from './ChptFixedTable.vue';
export { default as ChptPagination } from './ChptPagination.vue';
export { default as ChptCodeBlock } from './ChptCodeBlock.vue';
export { default as ChptTabNavigation } from './ChptTabNavigation.vue';
export { default as ChptPageSwitcher } from './ChptPageSwitcher.vue';
export { default as CommonTable } from './CommonTable.vue';
export { default as Pagination } from './Pagination.vue';
export { default as PaginationControls } from './PaginationControls.vue';
export { default as CodeBlock } from './CodeBlock.vue';
export { default as TabNavigation } from './TabNavigation.vue';
export { default as PageSwitcher } from './PageSwitcher.vue';

// ===== 基礎圖表 =====
export { default as DualAxisComboChart } from './DualAxisComboChart.vue';
export { default as EnterpriseHeatmap } from './EnterpriseHeatmap.vue';
export { default as EnterprisePareto } from './EnterprisePareto.vue';
export { default as ParetoChart } from './ParetoChart.vue';
export { default as GerberViewer } from './GerberViewer.vue';
export { default as PcbLayout } from './PcbLayout.vue';

// ===== 分面圖表 =====
export { default as FacetedChart } from './FacetedChart.vue';
export { default as GridFacetChart } from './GridFacetChart.vue';

// ===== 通用 Modal / 浮窗 =====
export { default as ChptModal } from './ChptModal.vue';
export { default as ChptDrawer } from './ChptDrawer.vue';
export { default as ChptPopconfirm } from './ChptPopconfirm.vue';
export { default as ChptModalDock } from './ChptModalDock.vue';
export { default as DraggableModal } from './DraggableModal.vue';
export { default as ModalDock } from './ModalDock.vue';

// ===== 顯示 / 反饋元件 =====
export { default as ChptTag } from './ChptTag.vue';
export { default as ChptAlert } from './ChptAlert.vue';
export { default as ChptSpinner } from './ChptSpinner.vue';
export { default as ChptEmpty } from './ChptEmpty.vue';
export { default as ChptSkeleton } from './ChptSkeleton.vue';
export { default as ChptProgress } from './ChptProgress.vue';
export { default as ChptBadge } from './ChptBadge.vue';
export { default as ChptAvatar } from './ChptAvatar.vue';

// ===== 佈局 / 容器 =====
export { default as ChptCard } from './ChptCard.vue';
export { default as ChptDivider } from './ChptDivider.vue';

// ===== 過濾器 / 搜尋 =====
export { default as ChptFilter } from './ChptFilter.vue';
export { default as ChptFilterBar } from './ChptFilterBar.vue';
export { default as FilterBar } from './FilterBar.vue';
export { default as FilterDropdown } from './FilterDropdown.vue';
export { default as FilterSelect } from './FilterSelect.vue';
export { default as TagFilterDropdown } from './TagFilterDropdown.vue';

// ===== 互動 / 提示 =====
export { default as ChptTooltip } from './ChptTooltip.vue';
export { default as CommonTooltip } from './CommonTooltip.vue';
export { default as ChptToast } from './ChptToast.vue';
export { useToast } from './useToast';

// ===== 導覽 / 流程 =====
export { default as ChptSteps } from './ChptSteps.vue';
export { default as ChptBreadcrumb } from './ChptBreadcrumb.vue';
export { default as ChptCollapse } from './ChptCollapse.vue';
export { default as ChptTabs } from './ChptTabs.vue';

// ===== 匯出上傳 / 工具 =====
export { default as ChptExcelExporter } from './ChptExcelExporter.vue';
export { default as ChptExcelUploader } from './ChptExcelUploader.vue';
export { default as ChptExcelEditor } from './ChptExcelEditor.vue';
export { default as ExcelExporter } from './ExcelExporter.vue';
export { default as ExcelUploader } from './ExcelUploader.vue';
export { default as ExcelEditor } from './ExcelEditor.vue';

// ===== 主題 / 導覽 =====
export { default as ChptDarkModeToggle } from './ChptDarkModeToggle.vue';
export { default as ChptHeaderLogoutButton } from './ChptHeaderLogoutButton.vue';
export { default as SimpleDarkModeToggle } from './SimpleDarkModeToggle.vue';
export { default as HeaderLogoutButton } from './HeaderLogoutButton.vue';

/**
 * 使用方式：
 * ```js
 * import { ChptButton, ChptInput, DualAxisComboChart } from '@/components/common'
 * ```
 */
