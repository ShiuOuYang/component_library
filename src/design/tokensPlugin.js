/**
 * Tailwind Plugin — 將設計令牌注入 :root 成為 CSS 變數
 *
 * 目的：讓 tokens.js 成為唯一真實來源，CSS 變數不再手動維護。
 * 產出的變數名稱與專案原本的 src/style.css（已移除）完全一致（--color-primary-600、
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
import { designTokens, darkTokens, themed } from './tokens.js'

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

/**
 * 展開語意色階（semantic）為 CSS 變數
 * 每個語意色是 { DEFAULT, 50~900, hover } 色階物件：
 *   success → --color-success（DEFAULT）、--color-success-50~900、--color-success-hover
 * @param {Object} semantic 語意色階物件（key 為語意名稱）
 * @param {string} prefix 變數前綴（不含 --）
 * @param {Object} target 寫入目標
 */
function flattenShades(semantic, prefix, target) {
  Object.entries(semantic).forEach(([name, shades]) => {
    if (!shades || typeof shades !== 'object') return
    const base = `--${prefix}-${toKebab(name)}`
    Object.entries(shades).forEach(([key, value]) => {
      if (key === 'DEFAULT') {
        // 單色別名：--color-success
        target[base] = value
      } else if (key === 'hover') {
        // hover 別名：--color-success-hover
        target[`${base}-hover`] = value
      } else {
        // 色階：--color-success-500 …
        target[`${base}-${toKebab(key)}`] = value
      }
    })
  })
}

/**
 * #RRGGBB → "R G B"（空白分隔的通道值）
 *
 * ⚠️ 為什麼不能直接把十六進位塞進變數給 Tailwind 用：
 *    Tailwind 的透明度修飾（bg-surface-primary/80）會編成
 *        rgb(var(--x) / 0.8)
 *    而 rgb() 不吃十六進位，`rgb(#FFFFFF / 0.8)` 是無效值、整條規則會被丟掉。
 *    全庫有 39 處在用 bg-white/80、bg-black/60 這類寫法，所以必須存通道值。
 *
 *    十六進位版本（--color-bg-primary）仍然保留 —— styles/components.css
 *    的 .btn / .input / .card 有 19 處在用，那些是直接寫在 CSS 裡、不經過
 *    Tailwind，吃十六進位沒問題。
 */
export function hexToChannels(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex).trim())
  if (!m) throw new Error(`themed token 必須是 6 位十六進位色碼，收到：${hex}`)
  const n = parseInt(m[1], 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

/**
 * 產出主題化角色的通道變數。
 * @param {'light'|'dark'} theme
 */
export function buildThemedChannelVariables(theme) {
  const vars = {}
  Object.entries(themed).forEach(([role, value]) => {
    vars[`--t-${role}`] = hexToChannels(value[theme])
  })
  return vars
}

/** 建立完整的 CSS 變數表 */
export function buildCssVariables(tokens = designTokens) {
  const vars = {}
  const { colors, viz, shadows, borderRadius, transitions, typography, zIndex, duration, spacing, control } = tokens

  // --- 顏色：品牌色階 ---
  flatten(colors.primary, 'color-primary', vars, null)
  flatten(colors.secondary, 'color-secondary', vars, null)
  flatten(colors.neutral, 'color-neutral', vars)

  // --- 顏色：語意色（不帶 semantic 前綴，維持 --color-success 等原名）---

  // semantic 現為嵌套色階物件（{ DEFAULT, 50~900, hover }），改用 flattenShades 展開
  flattenShades(colors.semantic, 'color', vars)

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

  // --- 控制項幾何 ---
  // 產出 --control-height-sm / --control-padding-x-sm / --control-font-size-sm …
  // 讓手寫 CSS 也對得上 Tailwind 的 h-control-* 工具類
  Object.entries(control).forEach(([size, geometry]) => {
    vars[`--control-height-${size}`] = geometry.height
    vars[`--control-padding-x-${size}`] = geometry.paddingX
    vars[`--control-font-size-${size}`] = geometry.fontSize
  })

  // --- z-index ---
  flatten(zIndex, 'z', vars)

  // --- 動畫時長（數值需補上 ms 單位才能用在 CSS）---
  Object.entries(duration).forEach(([key, value]) => {
    vars[`--duration-${toKebab(key)}`] = `${value}ms`
  })

  return vars
}

/**
 * 建立深色主題要覆寫的 CSS 變數表
 *
 * 只產出「隨主題翻轉」的變數（文字 / 背景 / 邊框 / 圖表軸線），
 * 變數名稱與亮色版完全相同，因此掛上 `.dark` 之後
 * 所有 var(--color-text-primary) 之類的引用會自動跟著翻轉，
 * 元件的 scoped CSS 不需要任何修改。
 */
export function buildDarkCssVariables(tokens = darkTokens) {
  const vars = {}
  const { colors, viz } = tokens

  flatten(colors.text, 'color-text', vars)
  flatten(colors.background, 'color-bg', vars)
  flatten(colors.border, 'color-border', vars)

  flatten(viz.axis, 'viz-axis', vars)
  vars['--viz-missing'] = viz.missing
  vars['--viz-selection'] = viz.selection
  vars['--viz-highlight'] = viz.highlight

  // color-scheme 讓瀏覽器原生控制項（捲軸 / 表單 / date picker）跟著變深
  vars['color-scheme'] = 'dark'

  return vars
}

export default plugin(function ({ addBase }) {
  addBase({
    ':root': {
      ...buildCssVariables(),
      // 主題化角色的通道值，供 tailwind.config 的 content / surface / stroke /
      // accent / 語意色使用（見 hexToChannels 的說明）
      ...buildThemedChannelVariables('light'),
      'color-scheme': 'light',
    },

    // darkMode: 'class' —— 由 useDarkMode() 在 <html> 上掛 .dark
    '.dark': {
      ...buildDarkCssVariables(),
      ...buildThemedChannelVariables('dark'),
    },
  })
})

