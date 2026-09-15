/**
 * 測試環境共用設定
 *
 * jsdom 缺少幾個元件會用到的瀏覽器 API，在這裡補上最小實作。
 */
import { beforeEach, vi } from 'vitest'

// matchMedia：useDarkMode 用它判斷系統偏好
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

// ResizeObserver：圖表與表格元件會用到
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

beforeEach(() => {
  // 每個測試從乾淨的 DOM 與 localStorage 開始，
  // 否則 useDarkMode / useOverlay 這類 module-scoped 狀態會互相污染
  document.documentElement.className = ''
  document.documentElement.removeAttribute('data-theme')
  document.body.className = ''
  document.body.removeAttribute('data-dark-mode')
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
  localStorage.clear()
})
