/**
 * Common Components — 相容 facade（@deprecated）
 *
 * 元件已分群搬移到 '@/components/library'（ui / charts / viewer / excel / shared）。
 * 此檔保留全部既有匯出名（含 legacy 與 alias stub），供既有專案與 docs 零改動遷移。
 * 新專案請改由 '@/components/library' 匯入正式公開 API。
 *
 * 使用方式：
 *   import { ChptButton, ChptInput, DualAxisComboChart } from '@/components/common'
 *   // 建議改用：
 *   import { ChptButton, ChptInput } from '@/components/library'
 *   import { DualAxisComboChart } from '@/components/library'
 */
export * from '@/components/library/ui'
export * from '@/components/library/charts'
export * from '@/components/library/excel'
export * from '@/components/library/viewer'
export { useToast } from '@/components/library/shared/useToast'
export { useDarkMode, initDarkMode } from '@/components/library/shared/useDarkMode'
