/**
 * warnDeprecated — 過渡期元件的執行期提示
 *
 * 在此之前，legacy 元件只在原始碼註解裡標 `@deprecated`。
 * 使用端把它 import 進去照樣能跑，完全不會知道自己用的是即將移除的東西 ——
 * 註解只有讀原始碼的人看得到。
 *
 * 這支函式在開發模式印一次警告（同一個元件不重複印），production build
 * 會因為 `import.meta.env.DEV` 為 false 而被打包工具整段移除，不影響正式版。
 */

const warned = new Set<string>()

/**
 * @param deprecated 即將移除的元件或 API 名稱
 * @param replacement 建議改用的對象
 * @param note 額外說明（例如 props 對應關係）
 */
export function warnDeprecated(deprecated: string, replacement: string, note?: string): void {
  if (!import.meta.env.DEV) return
  if (warned.has(deprecated)) return
  warned.add(deprecated)

  console.warn(
    `[chpt] ${deprecated} 已過時，請改用 ${replacement}。` +
      (note ? `\n  ${note}` : '') +
      '\n  過渡期相容元件會在下一個主要版本移除。'
  )
}

export default warnDeprecated
