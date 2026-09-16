/**
 * library/ui — 通用 UI 元件（表單 / 資料 / 浮層 / 反饋 / 導覽）
 *
 * 這是正式入口之一。
 *
 * 檔末的 legacy 項目全部已收斂為薄包裝 —— 每一個都只是把 props / emits / slots
 * 轉發給對應的 canonical 元件，不再有第二份實作需要維護（原本合計 1830 行的
 * 重複實作，收斂後剩 455 行的轉發層）。
 *
 * 它們在開發模式會印一次 deprecation 警告（見 shared/warnDeprecated.ts），
 * 並預定於下一個主要版本移除。對照表見 README 的「Legacy 對照表」。
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
export { default as ChptDataTooltip } from './ChptDataTooltip.vue'
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

// ===== legacy 相容層（@deprecated — 全部為轉發用的薄包裝） =====
//
// 每一項後面標的是它實際轉發到的 canonical 元件。
// 開發模式下使用時會在 console 印一次 deprecation 警告。
export { default as CodeBlock } from './CodeBlock.vue'                       // → ChptCodeBlock
export { default as CommonTooltip } from './CommonTooltip.vue'               // → ChptDataTooltip
export { default as DraggableModal } from './DraggableModal.vue'             // → ChptModal mode="window"
export { default as FilterBar } from './FilterBar.vue'                       // → ChptFilterBar
export { default as FilterDropdown } from './FilterDropdown.vue'             // → ChptFilter type="dropdown"
export { default as FilterSelect } from './FilterSelect.vue'                 // → ChptFilter type="select"
export { default as TagFilterDropdown } from './TagFilterDropdown.vue'       // → ChptFilter type="tag"
export { default as Pagination } from './Pagination.vue'                     // → ChptPagination variant="full"
export { default as PaginationControls } from './PaginationControls.vue'     // → ChptPagination variant="compact"
export { default as SimpleDarkModeToggle } from './SimpleDarkModeToggle.vue' // → ChptDarkModeToggle variant="simple"
export { default as CommonTable } from './CommonTable.vue'                   // → ChptTable
export { default as ModalDock } from './ModalDock.vue'                       // → ChptModalDock
export { default as PageSwitcher } from './PageSwitcher.vue'                 // → ChptPageSwitcher
export { default as TabNavigation } from './TabNavigation.vue'               // → ChptTabNavigation
export { default as HeaderLogoutButton } from './HeaderLogoutButton.vue'     // → ChptHeaderLogoutButton
export { default as FixedTable } from './ChptFixedTable.vue'                 // → ChptFixedTable
