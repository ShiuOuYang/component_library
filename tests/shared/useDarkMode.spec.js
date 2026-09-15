import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * useDarkMode 的狀態是 module-scoped 單例，測試之間必須重置模組，
 * 否則前一個測試設定的 mode 會殘留。
 */
async function freshModule({ systemPrefersDark = false, stored = null } = {}) {
  vi.resetModules()

  const listeners = []
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: systemPrefersDark,
    media: query,
    addEventListener: (_type, cb) => listeners.push(cb),
    removeEventListener: vi.fn(),
    addListener: (cb) => listeners.push(cb),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))

  if (stored !== null) localStorage.setItem('chpt-theme', stored)

  const mod = await import('@/components/library/shared/useDarkMode')
  return { ...mod, listeners }
}

describe('useDarkMode', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('預設為 system，跟隨作業系統偏好', async () => {
    const { useDarkMode } = await freshModule({ systemPrefersDark: true })
    const { isDark, mode } = useDarkMode()

    expect(mode.value).toBe('system')
    expect(isDark.value).toBe(true)
  })

  it('在 <html> 掛上 .dark —— 這是 Tailwind darkMode:class 生效的唯一條件', async () => {
    const { useDarkMode } = await freshModule()
    const { toggle } = useDarkMode()

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    toggle()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('同時維護 <body> 的舊 class，既有樣式零改動', async () => {
    const { useDarkMode } = await freshModule()
    useDarkMode().setMode('dark')

    expect(document.body.classList.contains('dark-mode')).toBe(true)
    expect(document.body.classList.contains('light-mode')).toBe(false)
    expect(document.body.getAttribute('data-dark-mode')).toBe('true')
  })

  it('選擇會寫入 localStorage', async () => {
    const { useDarkMode } = await freshModule()
    useDarkMode().setMode('dark')
    expect(localStorage.getItem('chpt-theme')).toBe('dark')
  })

  it('重新載入時沿用先前的選擇', async () => {
    const { useDarkMode } = await freshModule({ stored: 'dark', systemPrefersDark: false })
    const { isDark, mode } = useDarkMode()

    expect(mode.value).toBe('dark')
    expect(isDark.value).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('明確指定的模式優先於系統偏好', async () => {
    const { useDarkMode } = await freshModule({ stored: 'light', systemPrefersDark: true })
    expect(useDarkMode().isDark.value).toBe(false)
  })

  it('mode=system 時系統偏好變化會即時反映', async () => {
    const { useDarkMode, listeners } = await freshModule({ systemPrefersDark: false })
    const { isDark, setMode } = useDarkMode()

    setMode('system')
    expect(isDark.value).toBe(false)

    listeners.forEach((cb) => cb({ matches: true }))
    expect(isDark.value).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('mode 為明確值時，系統偏好變化不影響結果', async () => {
    const { useDarkMode, listeners } = await freshModule({ systemPrefersDark: false })
    const { isDark, setMode } = useDarkMode()

    setMode('light')
    listeners.forEach((cb) => cb({ matches: true }))
    expect(isDark.value).toBe(false)
  })

  it('所有呼叫端共用同一份狀態', async () => {
    const { useDarkMode } = await freshModule()
    const a = useDarkMode()
    const b = useDarkMode()

    a.setMode('dark')
    expect(b.isDark.value).toBe(true)
  })

  it('localStorage 不可用時不會拋錯', async () => {
    // freshModule() 會重建 matchMedia mock —— 直接呼叫 vi.resetModules() 而不重建，
    // 會因為 restoreMocks 已清掉前一個 mock 而讓 matchMedia 回傳 undefined。
    const { useDarkMode } = await freshModule()

    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('私密瀏覽模式')
    }

    try {
      expect(() => useDarkMode().setMode('dark')).not.toThrow()
      // 寫入失敗不影響當次切換
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    } finally {
      Storage.prototype.setItem = original
    }
  })

  it('儲存的值不合法時退回 system', async () => {
    const { useDarkMode } = await freshModule({ stored: '???' })
    expect(useDarkMode().mode.value).toBe('system')
  })
})
