import type { ComputedRef, InjectionKey } from 'vue'

/**
 * ChptMenu 與內部的 ChptMenuNode 之間共用的狀態（不對外匯出）。
 */

export type MenuKey = string | number

export interface MenuItem {
  key: MenuKey
  label?: string
  /** Material Symbols 圖示（收合模式下只剩圖示，頂層項目建議都給） */
  icon?: string
  /** vue-router 路徑（有 router 時用 router.push，沒有時當成一般連結） */
  to?: string
  /** 一般連結 */
  href?: string
  target?: string
  children?: MenuItem[]
  disabled?: boolean
  /** 右側徽章（數量、New） */
  badge?: string | number
  /** group：只是分組標題（children 直接列在下面）；divider：分隔線 */
  type?: 'group' | 'divider'
  [extra: string]: unknown
}

export interface MenuContext {
  /** 目前作用中的項目 key */
  activeKey: ComputedRef<MenuKey | null>
  /** 作用中項目的所有祖先（用來讓父層也標示「在這一支底下」） */
  activePath: ComputedRef<Set<MenuKey>>
  /** 子選單以浮出面板呈現（水平模式或收合模式）；否則是內嵌展開 */
  popup: ComputedRef<boolean>
  mode: ComputedRef<'vertical' | 'horizontal'>
  collapsed: ComputedRef<boolean>
  indent: ComputedRef<number>
  isOpen: (key: MenuKey) => boolean
  toggle: (item: MenuItem, level: number, parentKey: MenuKey | null) => void
  close: (key: MenuKey) => void
  select: (item: MenuItem, event: MouseEvent) => void
  hrefOf: (item: MenuItem) => string | undefined
  idOf: (key: MenuKey) => string
}

export const MENU_KEY: InjectionKey<MenuContext> = Symbol('chpt-menu')
