/**
 * 全域設定（ChptConfigProvider）
 *
 * 讓一個區塊（或整個 App）統一：
 *   - size：表單元件與按鈕的預設尺寸（密集的後台表格頁用 sm、觸控面板用 lg）
 *   - locale：元件內建的文字（「無資料」「載入中」「已選 N 筆」…）
 *
 * 規則：元件自己有傳 prop 時一律以 prop 為準；沒傳才看最近的 ConfigProvider；
 * 都沒有就用預設（繁體中文、原本的尺寸）—— 沒有 Provider 的既有頁面行為完全不變。
 * Provider 可以巢狀，內層只覆寫它有給的欄位。
 */
import { computed, inject, provide, type ComputedRef, type InjectionKey } from 'vue'

export type ConfigSize = 'sm' | 'md' | 'lg'

/** 元件內建文字 */
export interface ChptLocale {
  /** BCP 47 語系代碼，給 Intl / lang 屬性用 */
  code: string
  empty: string
  loading: string
  searchPlaceholder: string
  noData: string
  selectedCount: (n: number) => string
  clear: string
  selectPage: string
  select: string
  expandRow: string
  collapseRow: string
  pagination: {
    nav: string
    prev: string
    next: string
    first: string
    last: string
    page: (n: number) => string
    current: string
    perPageBefore: string
    perPageAfter: string
    perPageLabel: string
    pageSizeOption: (n: number) => string
    total: (n: number) => string
    range: (start: number, end: number, total: number) => string
  }
}

export const zhTW: ChptLocale = {
  code: 'zh-TW',
  empty: '暫無資料',
  loading: '載入中',
  searchPlaceholder: '輸入關鍵字搜尋...',
  noData: '無資料',
  selectedCount: (n) => `已選 ${n} 筆`,
  clear: '清除',
  selectPage: '全選本頁',
  select: '選取',
  expandRow: '展開明細',
  collapseRow: '收合明細',
  pagination: {
    nav: '分頁導航',
    prev: '上一頁',
    next: '下一頁',
    first: '第一頁',
    last: '最後一頁',
    page: (n) => `第 ${n} 頁`,
    current: '目前頁碼',
    perPageBefore: '每頁',
    perPageAfter: '筆',
    perPageLabel: '每頁筆數',
    pageSizeOption: (n) => `${n} 筆/頁`,
    total: (n) => `共 ${n} 筆`,
    range: (a, b, t) => `顯示第 ${a} 至 ${b} 項結果，共 ${t} 項`,
  },
}

export const enUS: ChptLocale = {
  code: 'en-US',
  empty: 'No data',
  loading: 'Loading',
  searchPlaceholder: 'Search…',
  noData: 'No data',
  selectedCount: (n) => `${n} selected`,
  clear: 'Clear',
  selectPage: 'Select all on this page',
  select: 'Select',
  expandRow: 'Expand row',
  collapseRow: 'Collapse row',
  pagination: {
    nav: 'Pagination',
    prev: 'Previous page',
    next: 'Next page',
    first: 'First page',
    last: 'Last page',
    page: (n) => `Page ${n}`,
    current: 'Current page',
    perPageBefore: 'Show',
    perPageAfter: 'per page',
    perPageLabel: 'Items per page',
    pageSizeOption: (n) => `${n} / page`,
    total: (n) => `${n} items`,
    range: (a, b, t) => `Showing ${a}–${b} of ${t}`,
  },
}

export interface ChptConfig {
  /** undefined = 各元件自己的預設尺寸 */
  size?: ConfigSize
  locale: ChptLocale
}

export interface ChptConfigInput {
  size?: ConfigSize
  /** 可以只給部分欄位，其餘沿用外層（或預設）語系 */
  locale?: Partial<ChptLocale>
}

const DEFAULT_CONFIG: ChptConfig = { size: undefined, locale: zhTW }
const CONFIG_KEY: InjectionKey<ComputedRef<ChptConfig>> = Symbol('chpt-config')

/** 讀取最近一層的設定（沒有 Provider 時回傳預設值） */
export function useConfig(): ComputedRef<ChptConfig> {
  return inject(CONFIG_KEY, computed(() => DEFAULT_CONFIG))
}

/** 提供設定給子元件；與外層設定合併 */
export function provideConfig(input: () => ChptConfigInput): ComputedRef<ChptConfig> {
  const parent = useConfig()
  const merged = computed<ChptConfig>(() => {
    const own = input()
    return {
      size: own.size ?? parent.value.size,
      locale: { ...parent.value.locale, ...own.locale },
    }
  })
  provide(CONFIG_KEY, merged)
  return merged
}

/**
 * 表單元件的尺寸：prop 優先，其次 Provider，最後是元件自己的預設。
 * ConfigSize 與表單元件的 ComponentSize 同名的值直接對應。
 */
export function resolveSize<T extends string>(
  own: T | undefined,
  config: ComputedRef<ChptConfig>,
  fallback: T
): T {
  return own ?? ((config.value.size as T | undefined) ?? fallback)
}
