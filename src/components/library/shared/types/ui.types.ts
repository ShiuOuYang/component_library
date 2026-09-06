/**
 * UI 組件庫共用型別定義
 * ======================================
 * 所有組件的 Props、Emits、Slot 型別集中管理於此，
 * 確保跨組件的一致性並提供完整的型別提示。
 */

/** 通用尺寸 */
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/** 顏色語意 */
export type ColorVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'dark'
  | 'light'

/** 圓角選項 */
export type RadiusSize = 'none' | 'sm' | 'md' | 'lg' | 'full'

/** 泛型選項，用於 Select / Radio 等需要 value/label 的元件 */
export interface SelectOption<T = string | number> {
  label: string
  value: T
  disabled?: boolean
  description?: string
}

/** 通用鍵值物件 */
export type Recordable<T = unknown> = Record<string, T>

/** 分隔線方向 */
export type DividerDirection = 'horizontal' | 'vertical'

/** 對齊方式 */
export type Placement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'right'
  | 'right-start'
  | 'right-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'

// ==============================================
// 額外補強的共用型別（維持一致架構）
// ==============================================

/** 方向（Row / Column 佈局） */
export type Direction = 'row' | 'column'

/** 通用原生 button type */
export type ButtonNativeType = 'button' | 'submit' | 'reset'

/** 通用原生 input type（常用子集） */
export type InputNativeType =
  | 'text'
  | 'password'
  | 'email'
  | 'number'
  | 'tel'
  | 'url'
  | 'search'
  | 'date'
