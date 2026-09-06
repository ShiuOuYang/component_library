/**
 * library/ui — 通用 UI 元件（表單 / 資料 / 浮層 / 反饋 / 導覽）
 *
 * 這是正式入口之一。檔末的 legacy 項目（CodeBlock、CommonTooltip、DraggableModal、
 * FilterBar、FilterDropdown、FilterSelect、TagFilterDropdown、Pagination、
 * PaginationControls、SimpleDarkModeToggle 與各相容 alias stub）僅為過渡期相容，
 * 建議改用對應 canonical（Chpt*），於 Phase 3 移除。
 */

// ===== canonical（Chpt*，TypeScript、設計 token） =====
export { default as ChptAlert } from './ChptAlert.vue'
export { default as ChptAvatar } from './ChptAvatar.vue'
export { default as ChptBadge } from './ChptBadge.vue'
export { default as ChptBreadcrumb } from './ChptBreadcrumb.vue'
export { default as ChptButton } from './ChptButton.vue'
export { default as ChptCard } from './ChptCard.vue'
export { default as ChptCheckbox } from './ChptCheckbox.vue'
export { default as ChptCodeBlock } from './ChptCodeBlock.vue'
export { default as ChptCollapse } from './ChptCollapse.vue'
export { default as ChptDarkModeToggle } from './ChptDarkModeToggle.vue'
export { default as ChptDatePicker } from './ChptDatePicker.vue'
export { default as ChptDivider } from './ChptDivider.vue'
export { default as ChptDrawer } from './ChptDrawer.vue'
export { default as ChptEmpty } from './ChptEmpty.vue'
export { default as ChptFilter } from './ChptFilter.vue'
export { default as ChptFilterBar } from './ChptFilterBar.vue'
export { default as ChptFixedTable } from './ChptFixedTable.vue'
export { default as ChptHeaderLogoutButton } from './ChptHeaderLogoutButton.vue'
export { default as ChptIcon } from './ChptIcon.vue'
export { default as ChptInput } from './ChptInput.vue'
export { default as ChptModal } from './ChptModal.vue'
export { default as ChptModalDock } from './ChptModalDock.vue'
export { default as ChptPageSwitcher } from './ChptPageSwitcher.vue'
export { default as ChptPagination } from './ChptPagination.vue'
export { default as ChptPopconfirm } from './ChptPopconfirm.vue'
export { default as ChptProgress } from './ChptProgress.vue'
export { default as ChptRadio } from './ChptRadio.vue'
export { default as ChptSelect } from './ChptSelect.vue'
export { default as ChptSkeleton } from './ChptSkeleton.vue'
export { default as ChptSpinner } from './ChptSpinner.vue'
export { default as ChptSteps } from './ChptSteps.vue'
export { default as ChptSwitch } from './ChptSwitch.vue'
export { default as ChptTable } from './ChptTable.vue'
export { default as ChptTabNavigation } from './ChptTabNavigation.vue'
export { default as ChptTabs } from './ChptTabs.vue'
export { default as ChptTag } from './ChptTag.vue'
export { default as ChptTextarea } from './ChptTextarea.vue'
export { default as ChptToast } from './ChptToast.vue'
export { default as ChptTooltip } from './ChptTooltip.vue'

// ===== legacy / 相容（@deprecated — 建議改用 canonical） =====
export { default as CodeBlock } from './CodeBlock.vue'
export { default as CommonTooltip } from './CommonTooltip.vue'
export { default as DraggableModal } from './DraggableModal.vue'
export { default as FilterBar } from './FilterBar.vue'
export { default as FilterDropdown } from './FilterDropdown.vue'
export { default as FilterSelect } from './FilterSelect.vue'
export { default as TagFilterDropdown } from './TagFilterDropdown.vue'
export { default as Pagination } from './Pagination.vue'
export { default as PaginationControls } from './PaginationControls.vue'
export { default as SimpleDarkModeToggle } from './SimpleDarkModeToggle.vue'

// ===== 相容 alias stub（@deprecated — 直接使用 canonical） =====
export { default as CommonTable } from './CommonTable.vue'
export { default as ModalDock } from './ModalDock.vue'
export { default as PageSwitcher } from './PageSwitcher.vue'
export { default as TabNavigation } from './TabNavigation.vue'
export { default as HeaderLogoutButton } from './HeaderLogoutButton.vue'
export { default as FixedTable } from './ChptFixedTable.vue'
