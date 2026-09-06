/**
 * Tailwind Plugin — 將設計令牌注入 :root 成為 CSS 變數
 *
 * 目的：讓 tokens.js 成為唯一真實來源，CSS 變數不再手動維護。
 * 產出的變數名稱與專案原本的 style.css 完全一致（--color-primary-600、
 * --color-bg-primary、--shadow-sm、--radius-lg …），因此既有元件的
 * scoped CSS 不需要任何修改。
 *
 * 命名對照：
 *   colors.primary[600]       → --color-primary-600
 *   colors.neutral[100]       → --color-neutral-100
 *   colors.semantic.success   → --color-success        （不加 semantic 前綴）
 *   colors.text.primary       → --color-text-primary
 *   colors.background.primary → --color-bg-primary     （background 縮寫為 bg）
 *   colors.border.light       → --color-border-light
 *   viz.axis.line             → --viz-axis-line
 *   shadows.md                → --shadow-md
 *   borderRadius.lg           → --radius-lg
 *   transitions.fast          → --transition-fast
 *   transitions.DEFAULT       → --transition-default
 *   typography.fontSize.sm    → --font-size-sm
 *   zIndex.modal              → --z-modal
 *   duration.normal           → --duration-normal      （附加 ms 單位）
 */

// 🔧 專案 package.json 是 "type": "module"，ESM 解析需要完整副檔名，
//    寫成 'tailwindcss/plugin' 會 ERR_MODULE_NOT_FOUND
import plugin from 'tailwindcss/plugin.js'
import { designTokens } from './tokens.js'

/** kebab-case 轉換：successHover → success-hover */
const toKebab = (str) => str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

/**
 * 展開單層物件為 CSS 變數
 * @param {Object} obj 來源物件
 * @param {string} prefix 變數前綴（不含 --）
 * @param {Object} target 寫入目標
 * @param {string|null} fallbackName DEFAULT 鍵的命名；傳 null 則不加後綴（--color-primary）
 *
 * 🔧 這裡不能把 DEFAULT 對應成某個數字階（例如 '500'）：
 *    JS 物件會把類數字鍵排在字串鍵之前，DEFAULT 最後才被寫入，
 *    會反過來蓋掉真正的 primary-500。改成無後綴即可避開。
 */
function flatten(obj, prefix, target, fallbackName = 'default') {
  Object.entries(obj).forEach(([key, value]) => {
    if (value === null || typeof value === 'object') return
    if (key === 'DEFAULT') {
      target[fallbackName === null ? `--${prefix}` : `--${prefix}-${fallbackName}`] = value
      return
    }
    target[`--${prefix}-${toKebab(key)}`] = value
  })
}

/** 建立完整的 CSS 變數表 */
export function buildCssVariables(tokens = designTokens) {
  const vars = {}
  const { colors, viz, shadows, borderRadius, transitions, typography, zIndex, duration, spacing } = tokens

  // --- 顏色：品牌色階 ---
  flatten(colors.primary, 'color-primary', vars, null)
  flatten(colors.secondary, 'color-secondary', vars, null)
  flatten(colors.neutral, 'color-neutral', vars)

  // --- 顏色：語意色（不帶 semantic 前綴，維持 --color-success 等原名）---
  flatten(colors.semantic, 'color', vars)

  // --- 顏色：文字 / 背景 / 邊框 ---
  flatten(colors.text, 'color-text', vars)
  flatten(colors.background, 'color-bg', vars)
  flatten(colors.border, 'color-border', vars)

  // --- 視覺化 ---
  flatten(viz.axis, 'viz-axis', vars)
  vars['--viz-missing'] = viz.missing
  vars['--viz-reference'] = viz.reference
  vars['--viz-selection'] = viz.selection
  vars['--viz-highlight'] = viz.highlight
  // 類別色階展開為 --viz-cat-1 ~ --viz-cat-10，方便 scoped CSS 直接引用
  viz.categorical.forEach((c, i) => {
    vars[`--viz-cat-${i + 1}`] = c
  })

  // --- 陰影 / 圓角 / 過渡 ---
  flatten(shadows, 'shadow', vars)
  flatten(borderRadius, 'radius', vars)
  flatten(transitions, 'transition', vars)

  // --- 字體 ---
  vars['--font-sans'] = typography.fontFamily.sans
  vars['--font-mono'] = typography.fontFamily.mono
  flatten(typography.fontSize, 'font-size', vars)
  flatten(typography.fontWeight, 'font-weight', vars)
  flatten(typography.lineHeight, 'line-height', vars)

  // --- 間距 ---
  flatten(spacing, 'spacing', vars)

  // --- z-index ---
  flatten(zIndex, 'z', vars)

  // --- 動畫時長（數值需補上 ms 單位才能用在 CSS）---
  Object.entries(duration).forEach(([key, value]) => {
    vars[`--duration-${toKebab(key)}`] = `${value}ms`
  })

  return vars
}

export default plugin(function ({ addBase }) {
  addBase({
    ':root': buildCssVariables(),
  })
})
