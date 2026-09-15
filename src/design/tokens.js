/**
 * 設計令牌 — 單一真實來源（Single Source of Truth）
 *
 * 這是整個元件庫唯一手動維護顏色 / 尺寸 / 動效數值的地方。
 * 其餘兩處都由此檔衍生，不要再手抄一份：
 *   1. CSS 變數（--color-primary-600 …）→ 由 tokensPlugin.js 自動注入 :root
 *   2. Tailwind theme（bg-primary-600 …） → 由 tailwind.config.js 直接 import
 *
 * 使用時機：
 *   - Vue template / 一般樣式 → 用 Tailwind class（bg-primary-600）
 *   - scoped CSS / :deep() SVG → 用 CSS 變數（var(--color-primary-600)）
 *   - D3 需要真實色碼做插值 → 從此檔 import（d3.interpolateRgb 等）
 */

// ===== 顏色系統 =====
const colors = {
  /**
   * 主色調 — 品牌藍
   * 🔧 品牌主色是 600（#2563eb，Tailwind blue-600）。
   *    語意色 success 保留「綠」，用來表示成功狀態；品牌/CTA 一律走 primary（藍）。
   */
  primary: {
    DEFAULT: '#2563EB', // = 600，讓 bg-primary / text-primary 可直接使用
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // 次要色調 — 深青
  secondary: {
    DEFAULT: '#1F4E5C', // = 500
    50: '#E8F4F6',
    100: '#CCE3E9',
    200: '#99C6D3',
    300: '#66A9BD',
    400: '#338CA7',
    500: '#1F4E5C',
    600: '#1A3F4A',
    700: '#142F38',
    800: '#0F1F25',
    900: '#0A0F12',
  },

  /**
   * 中性色 — 灰階
   * 🔧 此色階與 Tailwind 內建 `neutral` 完全相同，因此 tailwind.config **不再宣告**，
   *    直接沿用 Tailwind 預設（還能多拿到 neutral-950）。
   *    這裡保留是為了產出 --color-neutral-* CSS 變數，供 scoped CSS 與捲軸樣式使用。
   */
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },

  // 語意色（狀態）— 完整色階，DEFAULT 保留單色別名，hover 鍵產生 --color-*-hover。
  semantic: {
    success: { DEFAULT: '#16A34A', 50: '#F0FDF4', 100: '#DCFCE7', 200: '#BBF7D0', 300: '#86EFAC', 400: '#4ADE80', 500: '#22C55E', 600: '#16A34A', 700: '#15803D', 800: '#166534', 900: '#14532D', hover: '#15803D' },
    warning: { DEFAULT: '#CA8A04', 50: '#FEFCE8', 100: '#FEF9C3', 200: '#FEF08A', 300: '#FDE047', 400: '#FACC15', 500: '#EAB308', 600: '#CA8A04', 700: '#A16207', 800: '#854D0E', 900: '#713F12', hover: '#A16207' },
    danger:  { DEFAULT: '#DC2626', 50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 300: '#FCA5A5', 400: '#F87171', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C', 800: '#991B1B', 900: '#7F1D1D', hover: '#B91C1C' },
    info:    { DEFAULT: '#0284C7', 50: '#F0F9FF', 100: '#E0F2FE', 200: '#BAE6FD', 300: '#7DD3FC', 400: '#38BDF8', 500: '#0EA5E9', 600: '#0284C7', 700: '#0369A1', 800: '#075985', 900: '#0C4A6E', hover: '#0369A1' },
  },

  // 文字顏色
  text: {
    primary: '#171717',   // neutral-900
    secondary: '#525252', // neutral-600
    tertiary: '#737373',  // neutral-500
    disabled: '#A3A3A3',  // neutral-400
    inverse: '#FFFFFF',
  },

  // 背景顏色
  background: {
    primary: '#FFFFFF',
    secondary: '#FAFAFA',   // neutral-50
    tertiary: '#F5F5F5',    // neutral-100
    highlighted: '#EFF6FF', // primary-50
  },

  // 邊框顏色
  border: {
    light: '#E5E5E5',   // neutral-200
    default: '#D4D4D4', // neutral-300
    medium: '#A3A3A3',  // neutral-400
    dark: '#737373',    // neutral-500
    focus: '#2563EB',   // primary-600
  },
}

/**
 * 深色主題覆寫（Dark Theme Overrides）
 *
 * 只覆寫「隨主題翻轉」的語意色：文字 / 背景 / 邊框 / 圖表軸線。
 * 品牌色階（primary / secondary）與語意色階（success / danger …）維持同一組色階，
 * 元件在深色下改用較淺的階（例如 primary-400 取代 primary-600）即可，
 * 不需要再維護第二份色票。
 *
 * 由 tokensPlugin.js 產出到 `.dark` 選擇器下，變數名稱與亮色完全相同，
 * 因此使用 var(--color-text-primary) 的 scoped CSS 會自動跟著翻轉。
 */
const darkColors = {
  text: {
    primary: '#F5F5F5',   // neutral-100
    secondary: '#D4D4D4', // neutral-300
    tertiary: '#A3A3A3',  // neutral-400
    disabled: '#737373',  // neutral-500
    inverse: '#171717',   // neutral-900
  },

  background: {
    primary: '#171717',     // neutral-900
    secondary: '#1F1F1F',
    tertiary: '#262626',    // neutral-800
    highlighted: '#1E3A8A', // primary-900
  },

  border: {
    light: '#262626',   // neutral-800
    default: '#404040', // neutral-700
    medium: '#525252',  // neutral-600
    dark: '#737373',    // neutral-500
    focus: '#60A5FA',   // primary-400（深色底下 600 對比不足）
  },
}

/** 深色主題的視覺化色彩覆寫（軸線 / 格線需要降低亮度，類別色階維持不變） */
const darkViz = {
  axis: {
    line: '#525252',  // neutral-600
    tick: '#525252',
    text: '#A3A3A3',  // neutral-400
    grid: '#404040',  // neutral-700
    label: '#D4D4D4', // neutral-300
  },
  missing: '#404040',
  selection: 'rgba(96, 165, 250, 0.22)', // primary-400
  highlight: '#60A5FA',
}

// ===== 資料視覺化色彩（D3 圖表專用）=====
// ✅ 收斂原本散在各圖表 scoped CSS 裡硬寫的 #6b7280 / #d1d5db 等色碼
const viz = {
  // 座標軸與格線
  axis: {
    line: '#D4D4D4',  // 軸線 / domain path
    tick: '#D4D4D4',  // 刻度線
    text: '#737373',  // 軸標文字
    grid: '#E5E5E5',  // 背景格線
    label: '#525252', // 軸名稱
  },

  // 類別色階（10 色，依序取用；以品牌綠青為首）
  categorical: [
    '#2563EB', // primary-600
    '#1F4E5C', // secondary-500
    '#0284C7',
    '#CA8A04',
    '#DC2626',
    '#7C3AED',
    '#0891B2',
    '#EA580C',
    '#65A30D',
    '#DB2777',
  ],

  // 連續色階（給 heatmap / choropleth，兩端點餵給 d3.interpolateRgb）
  sequential: {
    primary: ['#EFF6FF', '#1E40AF'],
    secondary: ['#E8F4F6', '#142F38'],
    neutral: ['#FAFAFA', '#404040'],
  },

  // 發散色階（給偏差值，中點為中性）
  diverging: {
    dangerToSuccess: ['#DC2626', '#FAFAFA', '#16A34A'],
    coolToWarm: ['#0284C7', '#FAFAFA', '#EA580C'],
  },

  // 缺失值 / 無資料
  missing: '#E5E5E5',

  // 參考線（如柏拉圖 80% 線、良率門檻線）
  reference: '#DC2626',

  // 選取 / 高亮
  selection: 'rgba(37, 99, 235, 0.15)',
  highlight: '#3B82F6',
}

// ===== 間距系統（4px 基準）=====
const spacing = {
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem',    // 96px
}

// ===== 圓角系統 =====
// 🔧 這些值 100% 等於 Tailwind 預設，保留是為了讓 CSS 變數（--radius-*）可用；
//    tailwind.config 不再重複宣告。
const borderRadius = {
  none: '0',
  sm: '0.125rem',  // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',  // 6px
  lg: '0.5rem',    // 8px
  xl: '0.75rem',   // 12px
  '2xl': '1rem',   // 16px
  '3xl': '1.5rem', // 24px
  full: '9999px',
}

// ===== 陰影系統 =====
const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  // 品牌陰影（Tailwind 無對應預設，這才是真正需要擴充的部分）
  primary: '0 4px 14px 0 rgba(37, 99, 235, 0.25)',
  'primary-lg': '0 10px 25px 0 rgba(37, 99, 235, 0.2)',
  secondary: '0 4px 14px 0 rgba(31, 78, 92, 0.25)',
}

// ===== 字體系統 =====
const typography = {
  fontFamily: {
    sans: "'Noto Sans TC', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  fontSize: {
    '2xs': '0.625rem', // 10px — 密集資料表格 / 圖表軸標用
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
}

// ===== 過渡（CSS 字串）=====
const transitions = {
  fast: '0.15s ease',
  DEFAULT: '0.2s ease',
  slow: '0.3s ease',
  slower: '0.4s ease',
  // 常用屬性組合
  common: 'all 0.2s ease',
  color: 'color 0.15s ease',
  background: 'background-color 0.15s ease',
  border: 'border-color 0.15s ease',
  transform: 'transform 0.2s ease-out',
  opacity: 'opacity 0.2s ease',
  shadow: 'box-shadow 0.2s ease',
}

// ===== 動畫時長（數值，毫秒）=====
// 🔧 刻意用 Number 而非字串：D3 的 .duration() 只吃數字。
//    以前這裡是 '150ms' 字串，傳進 D3 會失效。
const duration = {
  quick: 150,
  fast: 200,
  normal: 300,
  slow: 400,
  slower: 500,
  // 圖表專用
  chartEnter: 500,  // 圖元進場
  chartUpdate: 300, // 資料更新
  chartExit: 200,   // 圖元離場
}

// ===== z-index 層級 =====
// 🔧 修正原本兩份檔案互相衝突的問題，統一為以下語意順序。
//    排序依據本元件庫的實際堆疊需求：
//    JxFixedTable 固定表頭(sticky) < Teleport 下拉(dropdown)
//    < 遮罩 < DraggableModal < popover < CommonTooltip < Toast
const zIndex = {
  base: '0',
  raised: '10',
  sticky: '100',   // JxFixedTable 固定表頭 / 固定欄
  dropdown: '200', // FilterDropdown / TagFilterDropdown / JxSelect（Teleport）
  backdrop: '300', // Modal 遮罩
  modal: '400',    // DraggableModal
  popover: '500',
  tooltip: '600',  // CommonTooltip —— 必須高於 modal，否則彈窗內的 tooltip 會被吃掉
  toast: '700',
}

// ===== 視窗斷點 =====
// 值與 Tailwind 預設相同，保留供 JS 端（如 matchMedia）使用
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}

export const designTokens = {
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
}

/**
 * 深色主題令牌 — 只含需要覆寫的鍵，其餘沿用 designTokens。
 * tokensPlugin 用它產生 `.dark` 下的 CSS 變數。
 */
export const darkTokens = {
  colors: darkColors,
  viz: darkViz,
}

// 快捷具名匯出
export {
  colors,
  darkColors,
  darkViz,
  viz,
  spacing,
  borderRadius,
  shadows,
  typography,
  transitions,
  duration,
  zIndex,
  breakpoints,
}

export default designTokens
