/**
 * 設計系統對外入口
 *
 * 一般樣式請用 Tailwind class；只有下列情況才 import 這裡：
 *   - D3 需要真實色碼做 scale / interpolate（CSS 變數在此處無法運算）
 *   - 動畫時長需要 Number（D3 .duration()）
 *   - JS 端判斷斷點（matchMedia）
 */

export { designTokens as default, designTokens } from './tokens.js'
export {
  colors,
  viz,
  spacing,
  borderRadius,
  shadows,
  typography,
  transitions,
  duration,
  zIndex,
  breakpoints,
} from './tokens.js'

export { buildCssVariables } from './tokensPlugin.js'

import { viz } from './tokens.js'

/**
 * 取得類別色（自動循環，避免類別數超過色盤長度時取到 undefined）
 * @param {number} index 類別索引
 * @returns {string} 色碼
 */
export function categoricalColor(index) {
  return viz.categorical[index % viz.categorical.length]
}

/**
 * 依類別清單建立 d3.scaleOrdinal 可直接使用的 range
 * @param {Array<string>} domain 類別清單
 * @returns {Array<string>} 對應長度的色碼陣列
 */
export function categoricalRange(domain = []) {
  return domain.map((_, i) => categoricalColor(i))
}

/**
 * 取得連續色階的兩端點
 * @param {'primary'|'secondary'|'neutral'} name 色階名稱
 * @returns {[string, string]} [起點色, 終點色]
 */
export function sequentialRange(name = 'primary') {
  return viz.sequential[name] ?? viz.sequential.primary
}
