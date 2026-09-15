import { computed, readonly, ref, type ComputedRef, type Ref } from 'vue'

/**
 * useDarkMode（CHPT 主題） - 深色模式的唯一真實來源
 *
 * 在此之前專案有四套互不相通的機制：tailwind.config 沒設 darkMode（落回 media）、
 * 切換鈕往 <body> 加 .dark-mode、元件寫 Tailwind 的 dark: 前綴、style.css 用
 * prefers-color-scheme。結果按下切換鈕時 dark: 一個都不會生效。
 *
 * 現在統一為 class 策略：
 *   1. tailwind.config.js 設 darkMode: 'class'
 *   2. 本 composable 在 <html> 掛 / 卸 `.dark` → Tailwind 的 dark: 生效
 *   3. tokensPlugin.js 在 `.dark` 下覆寫 CSS 變數 → scoped CSS 自動翻轉
 *   4. 同時保留 <body> 的 .dark-mode / data-dark-mode，舊有樣式零改動
 *
 * 用法：
 * ```ts
 * import { useDarkMode } from '@/components/library/shared/useDarkMode'
 *
 * const { isDark, mode, toggle, setMode } = useDarkMode()
 * toggle()            // light ⇄ dark
 * setMode('system')   // 跟隨作業系統
 * ```
 *
 * 應用程式進入點請呼叫一次 `initDarkMode()`（main.js 已接），
 * 以便在首次渲染前套用使用者上次的選擇。
 */

/** 主題模式：明確指定亮/暗，或跟隨作業系統 */
export type ChptThemeMode = 'light' | 'dark' | 'system'

/** localStorage 鍵名 */
export const THEME_STORAGE_KEY = 'chpt-theme'

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

/** 讀取先前儲存的偏好；讀不到或值不合法則回傳 'system' */
function readStoredMode(): ChptThemeMode {
  if (!isBrowser) return 'system'
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    // Safari 無痕模式等情境會丟例外，忽略即可
  }
  return 'system'
}

/** 目前作業系統是否偏好深色 */
function prefersDark(): boolean {
  if (!isBrowser || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// ===== module-scoped 全域狀態（所有呼叫端共享同一份）=====
const mode: Ref<ChptThemeMode> = ref<ChptThemeMode>(readStoredMode())
const systemDark = ref(prefersDark())

const isDark: ComputedRef<boolean> = computed(() =>
  mode.value === 'system' ? systemDark.value : mode.value === 'dark'
)

/** 把目前狀態寫進 DOM */
function applyToDom(): void {
  if (!isBrowser) return
  const dark = isDark.value

  // 主要機制：<html class="dark"> → Tailwind dark: 與 tokensPlugin 的 .dark 變數
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')

  // 相容既有樣式：<body class="dark-mode"> / data-dark-mode
  document.body?.classList.toggle('dark-mode', dark)
  document.body?.classList.toggle('light-mode', !dark)
  document.body?.setAttribute('data-dark-mode', String(dark))
}

/** 設定主題模式 */
function setMode(next: ChptThemeMode): void {
  mode.value = next
  if (isBrowser) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // 寫入失敗不影響當次切換
    }
  }
  applyToDom()
}

/** 明暗互切；目前為 system 時，切到與現況相反的明確模式 */
function toggle(): void {
  setMode(isDark.value ? 'light' : 'dark')
}

let initialized = false
let mediaQuery: MediaQueryList | null = null

/**
 * 初始化：套用已儲存的偏好並開始監聽作業系統變化。
 * 可重複呼叫，只有第一次會真正執行。
 */
export function initDarkMode(): void {
  if (!isBrowser || initialized) return
  initialized = true

  if (typeof window.matchMedia === 'function') {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => {
      systemDark.value = event.matches
      // 只有跟隨系統時才需要重新套用
      if (mode.value === 'system') applyToDom()
    }
    // Safari < 14 沒有 addEventListener，退回 addListener
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onChange)
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(onChange)
    }
  }

  applyToDom()
}

export function useDarkMode() {
  // 元件先用到時才初始化，應用程式沒接 initDarkMode() 也能運作
  initDarkMode()

  return {
    /** 目前是否為深色（唯讀） */
    isDark,
    /** 目前模式：light / dark / system（唯讀，請用 setMode 變更） */
    mode: readonly(mode),
    /** 作業系統是否偏好深色（唯讀） */
    systemDark: readonly(systemDark),
    setMode,
    toggle,
  }
}

export default useDarkMode
