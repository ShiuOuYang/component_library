import { nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'

/**
 * useOverlay — 浮層（Modal / Drawer / Popconfirm）共用的無障礙行為
 *
 * 集中處理四件原本各元件各自為政、或根本沒做的事：
 *
 * 1. **Escape 只關最上層**
 *    原本每個 Modal 實例各自綁 document 的 keydown，開三個視窗按一次 Escape
 *    會三個一起關。改為全域一個監聽器 + 一個堆疊，只有堆疊頂端會收到。
 *
 * 2. **焦點陷阱**
 *    Tab / Shift+Tab 只在浮層內循環，不會跑到背後的頁面。
 *
 * 3. **焦點歸還**
 *    開啟前記住觸發的元素，關閉後把焦點還回去 —— 否則鍵盤使用者關掉視窗後
 *    焦點會掉回 <body>，得從頭 Tab 一次。
 *
 * 4. **背景捲動鎖**
 *    以引用計數處理巢狀浮層，最後一個關閉時才還原，並補上捲軸寬度避免版面跳動。
 *
 * 用法：
 * ```ts
 * const panelRef = useTemplateRef<HTMLElement>('panel')
 * useOverlay(() => props.modelValue, panelRef, {
 *   onEscape: () => handleClose(),
 *   closeOnEscape: () => props.closable,
 * })
 * ```
 */

export interface UseOverlayOptions {
  /** 按下 Escape 且本浮層位於最上層時呼叫 */
  onEscape?: () => void
  /** 是否允許 Escape 關閉（每次按鍵即時求值） */
  closeOnEscape?: () => boolean
  /** 是否鎖住背景捲動 */
  lockScroll?: boolean
  /** 是否啟用焦點陷阱與焦點歸還 */
  trapFocus?: boolean
  /** 開啟後要自動聚焦的元素；未提供則聚焦浮層內第一個可聚焦元素 */
  initialFocus?: () => HTMLElement | null | undefined
}

interface OverlayEntry {
  id: number
  options: UseOverlayOptions
  container: Ref<HTMLElement | null | undefined>
}

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined'

// ===== 全域浮層堆疊（後進者在頂端）=====
const stack: OverlayEntry[] = []
let idCounter = 0
let keydownBound = false

// ===== 背景捲動鎖（引用計數）=====
let scrollLockCount = 0
let previousBodyOverflow = ''
let previousBodyPaddingRight = ''

/** 可聚焦元素選擇器；排除 disabled、tabindex="-1" 與隱藏的 input */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement
  )
}

function lockScroll(): void {
  if (!isBrowser) return
  scrollLockCount += 1
  if (scrollLockCount > 1) return

  previousBodyOverflow = document.body.style.overflow
  previousBodyPaddingRight = document.body.style.paddingRight

  // 補上捲軸佔用的寬度，避免鎖定瞬間版面往右跳
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
  if (scrollbarWidth > 0) {
    const current = parseFloat(window.getComputedStyle(document.body).paddingRight) || 0
    document.body.style.paddingRight = `${current + scrollbarWidth}px`
  }
  document.body.style.overflow = 'hidden'
}

function unlockScroll(): void {
  if (!isBrowser || scrollLockCount === 0) return
  scrollLockCount -= 1
  if (scrollLockCount > 0) return

  document.body.style.overflow = previousBodyOverflow
  document.body.style.paddingRight = previousBodyPaddingRight
}

function handleGlobalKeydown(event: KeyboardEvent): void {
  const top = stack[stack.length - 1]
  if (!top) return

  if (event.key === 'Escape') {
    if (top.options.closeOnEscape?.() === false) return
    event.stopPropagation()
    top.options.onEscape?.()
    return
  }

  if (event.key !== 'Tab' || top.options.trapFocus === false) return

  const container = top.container.value
  if (!container) return

  const focusable = getFocusable(container)
  if (focusable.length === 0) {
    // 浮層內沒有任何可聚焦元素：把焦點留在容器上，不要讓它跑到背景
    event.preventDefault()
    return
  }

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement as HTMLElement | null

  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

function ensureKeydownBound(): void {
  if (!isBrowser || keydownBound) return
  // capture 階段：確保在元件自己的 handler 之前判斷是否為最上層
  document.addEventListener('keydown', handleGlobalKeydown, true)
  keydownBound = true
}

export function useOverlay(
  isOpen: () => boolean,
  container: Ref<HTMLElement | null | undefined>,
  options: UseOverlayOptions = {}
): void {
  const entry: OverlayEntry = { id: ++idCounter, options, container }
  const isActive = ref(false)
  let previouslyFocused: HTMLElement | null = null

  function activate(): void {
    if (!isBrowser || isActive.value) return
    isActive.value = true

    ensureKeydownBound()
    stack.push(entry)

    if (options.lockScroll !== false) lockScroll()

    if (options.trapFocus !== false) {
      previouslyFocused = document.activeElement as HTMLElement | null
      // 等浮層內容實際掛上 DOM 之後再聚焦
      nextTick(() => {
        const target =
          options.initialFocus?.() ??
          (container.value ? getFocusable(container.value)[0] : null) ??
          container.value
        target?.focus?.()
      })
    }
  }

  function deactivate(): void {
    if (!isBrowser || !isActive.value) return
    isActive.value = false

    const index = stack.indexOf(entry)
    if (index !== -1) stack.splice(index, 1)

    if (options.lockScroll !== false) unlockScroll()

    if (options.trapFocus !== false && previouslyFocused?.isConnected) {
      previouslyFocused.focus()
    }
    previouslyFocused = null
  }

  watch(isOpen, (open) => (open ? activate() : deactivate()), { immediate: true })

  onBeforeUnmount(deactivate)
}

export default useOverlay
