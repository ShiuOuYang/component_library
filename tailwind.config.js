import { designTokens, themed } from './src/design/tokens.js'
import tokensPlugin from './src/design/tokensPlugin.js'

const { colors, shadows, typography, duration, zIndex, control } = designTokens

/**
 * Tailwind 設定
 *
 * 原則：只宣告「Tailwind 預設沒有」的東西。
 * 以下項目已從舊版設定移除，因為它們與 Tailwind 內建值完全相同，留著只是噪音：
 *   ✗ neutral / emerald / green 色階  → 直接用內建（還能多拿到 950 階）
 *   ✗ borderRadius 整段            → 全部等於預設
 *   ✗ spacing 的 1 / 1.5 / 2.5 / 3.5 → 全部等於預設（只留 4.5）
 *   ✗ boxShadow 的 sm~2xl / inner   → 全部等於預設（只留品牌陰影）
 *   ✗ zIndex 的 0~50               → 全部等於預設
 *
 * 所有數值來自 src/design/tokens.js，不在此檔硬寫色碼。
 */
/** @type {import('tailwindcss').Config} */
/**
 * 把 themed 的角色併進 Tailwind 的 colors，讓語意 class 真的會隨主題翻轉。
 *
 * ⚠️ 這裡原本是 `content: colors.text` / `surface: colors.background` ——
 *    直接指向 tokens.js 的**淺色十六進位常數**。實測編出來是：
 *
 *        .bg-surface-primary { background-color: rgb(255 255 255) }
 *
 *    也就是說語意別名根本不會跟著主題翻轉：就算元件乖乖用了
 *    `bg-surface-primary`（看起來最「正確」的寫法），深色模式下它還是白的。
 *    而 tokensPlugin 產出的 `.dark { --color-bg-primary: #171717 }`，
 *    整份 CSS 裡只有 1 條規則在讀（:root 的 body 預設色）—— 深色 token 是死的。
 *
 *    改成指向 `--t-*` 通道變數後，同一個 class 會隨 `.dark` 翻轉，
 *    而 `<alpha-value>` 讓 `bg-surface-primary/80` 這類透明度修飾照樣可用。
 *
 * 產出的對應：
 *   'content-primary'  → colors.content.primary   （text-content-primary）
 *   'accent'           → colors.accent.DEFAULT    （text-accent）
 *   'accent-on-subtle' → colors.accent.onSubtle   （text-accent-on-subtle）
 *
 * 命名規則：**有數字的色階固定不變，沒數字的角色跟著主題翻轉。**
 *   bg-primary-600 → 永遠 #2563EB
 *   text-accent    → 淺色 primary-700 / 深色 primary-400
 *
 * 🔧 必須是「合併」而不是展開覆蓋：success / warning / danger / info 同時
 *    擁有完整色階與主題化角色，直接 `...themedColors()` 會把 50~900 整組
 *    蓋掉，全庫 349 處 bg-success-500 之類的寫法會一起壞掉。
 */
function withThemedRoles(base) {
  /** 角色名的第一段就是 Tailwind 的色群名 */
  const GROUPS = ['content', 'surface', 'stroke', 'accent', 'success', 'warning', 'danger', 'info']
  const out = { ...base }

  for (const role of Object.keys(themed)) {
    const value = `rgb(var(--t-${role}) / <alpha-value>)`
    const group = GROUPS.find((g) => role === g || role.startsWith(`${g}-`))
    if (!group) throw new Error(`themed role 的前綴不在 GROUPS 內：${role}`)

    // 淺拷貝既有色階，再疊上主題化角色
    out[group] = { ...(out[group] ?? {}) }

    if (role === group) {
      out[group].DEFAULT = value
      continue
    }
    /**
     * 直接用 kebab 後綴當 key：accent-on-subtle → colors.accent['on-subtle']，
     * Tailwind 產出 text-accent-on-subtle。
     *
     * ⚠️ 不要轉 camelCase。Tailwind 不會把色彩 key 再 kebab 化回來，
     *    onSubtle 產出的是 `text-accent-onSubtle` —— 於是元件裡寫的
     *    `text-accent-on-subtle` 變成不存在的 class，在 template 裡
     *    完全不會報錯、只是靜靜沒有顏色。這次是 ChptExcelEditor 的
     *    @apply 才把它炸出來（@apply 找不到 class 會讓 build 失敗），
     *    否則整批遷移會看起來成功但其實沒有套到色。
     */
    out[group][role.slice(group.length + 1)] = value
  }
  return out
}

export default {
  // 深色模式採 class 策略：由 useDarkMode() 在 <html> 掛 .dark 切換。
  // 不可省略 —— 省略時 Tailwind 會落回 'media'，只聽作業系統偏好，切換鈕會完全失效。
  darkMode: 'class',

  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: withThemedRoles({
        primary: colors.primary,
        secondary: colors.secondary,

        // 語意色（完整色階；bg-success-500 這類帶數字的寫法固定不變）
        success: colors.semantic.success,
        warning: colors.semantic.warning,
        danger: colors.semantic.danger,
        info: colors.semantic.info,
      }),

      fontFamily: {
        sans: typography.fontFamily.sans.split(',').map((s) => s.trim().replace(/^'|'$/g, '')),
        mono: typography.fontFamily.mono.split(',').map((s) => s.trim().replace(/^'|'$/g, '')),
      },

      // 只補 Tailwind 沒有的 10px
      fontSize: {
        '2xs': typography.fontSize['2xs'],
      },

      // 只保留品牌陰影
      boxShadow: {
        primary: shadows.primary,
        'primary-lg': shadows['primary-lg'],
        secondary: shadows.secondary,
      },

      // 只補 4.5（18px）
      spacing: {
        4.5: '1.125rem',
      },

      /**
       * 控制項高度：h-control-xs / sm / md / lg（24 / 32 / 40 / 48px）
       *
       * 按鈕、輸入框這類可點擊控制項一律用這組，不要各自寫 py-*。
       * 理由見 tokens.js 的 control 區塊 —— 沒有共同基準時，每個元件
       * 都會自己猜一組 padding，畫面就參差了。
       */
      height: Object.fromEntries(
        Object.entries(control).map(([size, g]) => [`control-${size}`, g.height])
      ),
      minHeight: Object.fromEntries(
        Object.entries(control).map(([size, g]) => [`control-${size}`, g.height])
      ),
      /**
       * 純圖示按鈕（× / ‹ / › 這類沒有文字的）要用
       * `h-control-xs min-w-control-xs` 做成正方形。
       *
       * WCAG 2.5.8 要求的是 24×24，兩個方向都要算 —— 只給高度的話，
       * 一顆 `h-control-xs px-1` 的 × 只有 24×18，還是點不到。
       */
      minWidth: Object.fromEntries(
        Object.entries(control).map(([size, g]) => [`control-${size}`, g.height])
      ),

      // 語意化 z-index：z-modal / z-tooltip / z-dropdown
      zIndex,

      transitionDuration: {
        250: '250ms',
        350: '350ms',
      },

      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-out-right': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'fade-in': `fade-in ${duration.fast}ms ease-out`,
        'fade-out': `fade-out ${duration.quick}ms ease-out`,
        'slide-up': `slide-up ${duration.normal}ms ease-out`,
        'slide-down': `slide-down ${duration.normal}ms ease-out`,
        'scale-in': `scale-in ${duration.fast}ms ease-out`,
        'slide-in-right': `slide-in-right ${duration.normal}ms ease-out`,
        'slide-out-right': `slide-out-right ${duration.fast}ms ease-out`,
        'spin-slow': 'spin-slow 1s linear infinite',
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [tokensPlugin],
}
