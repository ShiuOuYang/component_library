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
import { zhTW, mergeLocale, type ChptLocale, type ChptLocaleInput } from './locale'

export type ConfigSize = 'sm' | 'md' | 'lg'

export { zhTW, enUS, mergeLocale } from './locale'
export type { ChptLocale, ChptLocaleInput } from './locale'

export interface ChptConfig {
  /** undefined = 各元件自己的預設尺寸 */
  size?: ConfigSize
  locale: ChptLocale
}

export interface ChptConfigInput {
  size?: ConfigSize
  /** 可以只給部分欄位（群組可巢狀部分覆寫），其餘沿用外層（或預設）語系 */
  locale?: ChptLocaleInput
}

const DEFAULT_CONFIG: ChptConfig = { size: undefined, locale: zhTW }
const CONFIG_KEY: InjectionKey<ComputedRef<ChptConfig>> = Symbol('chpt-config')

/** 讀取最近一層的設定（沒有 Provider 時回傳預設值） */
export function useConfig(): ComputedRef<ChptConfig> {
  return inject(CONFIG_KEY, computed(() => DEFAULT_CONFIG))
}

/**
 * 讀取元件內建文字（最近一層 ChptConfigProvider 的 locale；沒有時為繁中）。
 * template 裡直接 `t.modal.close`（頂層 ref 自動解包），script 裡用 `t.value.modal.close`。
 */
export function useLocale(): ComputedRef<ChptLocale> {
  const config = useConfig()
  return computed(() => config.value.locale)
}

/** 提供設定給子元件；與外層設定合併 */
export function provideConfig(input: () => ChptConfigInput): ComputedRef<ChptConfig> {
  const parent = useConfig()
  const merged = computed<ChptConfig>(() => {
    const own = input()
    return {
      size: own.size ?? parent.value.size,
      locale: mergeLocale(parent.value.locale, own.locale),
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
