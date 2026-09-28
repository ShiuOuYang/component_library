/**
 * 捲動相關的小工具（ChptAnchor / ChptBackTop 共用）
 */

export type ScrollTarget = Window | HTMLElement

const isBrowser = typeof window !== 'undefined'

/**
 * 元素實際在捲動的祖先。
 * ⚠️ 不能假設是 window：很多後台版面（包含本文檔站）是側欄固定、內容區 overflow-y: auto，
 *    監聽 window 的 scroll 永遠收不到事件。
 */
export function scrollParentOf(el: Element | null): ScrollTarget {
  if (!isBrowser) return undefined as unknown as Window
  for (let node = el?.parentElement ?? null; node && node !== document.body; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && node.scrollHeight > node.clientHeight) {
      return node
    }
  }
  return window
}

/** 字串選擇器 / 元素 / 未指定 → 捲動目標 */
export function resolveScrollTarget(target: string | HTMLElement | null | undefined, fallbackFrom?: Element | null): ScrollTarget {
  if (!isBrowser) return undefined as unknown as Window
  if (target instanceof HTMLElement) return target
  if (typeof target === 'string' && target) {
    const el = document.querySelector<HTMLElement>(target)
    if (el) return el
  }
  return fallbackFrom ? scrollParentOf(fallbackFrom) : window
}

export function scrollTopOf(target: ScrollTarget): number {
  return target === window ? window.scrollY : (target as HTMLElement).scrollTop
}

/** 目標的可視區域上緣（視窗座標） */
export function viewportTopOf(target: ScrollTarget): number {
  return target === window ? 0 : (target as HTMLElement).getBoundingClientRect().top
}

export function prefersReducedMotion(): boolean {
  // matchMedia 在舊瀏覽器與 jsdom 裡可能不存在：兩段都要 ?.
  return isBrowser && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
}

export function scrollToY(target: ScrollTarget, top: number, smooth = true): void {
  const behavior: ScrollBehavior = smooth && !prefersReducedMotion() ? 'smooth' : 'auto'
  const scrollable = target as { scrollTo?: (options: ScrollToOptions) => void }
  if (typeof scrollable.scrollTo === 'function') scrollable.scrollTo({ top, behavior })
  else if (target !== window) (target as HTMLElement).scrollTop = top
}

/** Window | HTMLElement 的聯集直接呼叫 addEventListener 會對不上多載，統一從 EventTarget 走 */
export function onScrollOf(target: ScrollTarget, handler: () => void): () => void {
  const t = target as EventTarget
  t.addEventListener('scroll', handler, { passive: true })
  return () => t.removeEventListener('scroll', handler)
}

/**
 * 把焦點移到某個區塊（跳到錨點 / 回到頂端之後，鍵盤與螢幕閱讀器的位置要跟著過去，
 * 否則下一次 Tab 又從原本的連結往下走）。不可聚焦的元素暫時給 tabindex=-1。
 */
export function focusWithoutScroll(el: HTMLElement): void {
  if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) {
    el.setAttribute('tabindex', '-1')
    el.addEventListener('blur', () => el.removeAttribute('tabindex'), { once: true })
  }
  el.focus({ preventScroll: true })
}
