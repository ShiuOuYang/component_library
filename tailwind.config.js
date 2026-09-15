import { designTokens } from './src/design/tokens.js'
import tokensPlugin from './src/design/tokensPlugin.js'

const { colors, shadows, typography, duration, zIndex } = designTokens

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
      colors: {
        primary: colors.primary,
        secondary: colors.secondary,

        // 語意色
        success: colors.semantic.success,
        warning: colors.semantic.warning,
        danger: colors.semantic.danger,
        info: colors.semantic.info,

        // 語意化別名 → text-content / bg-surface / border-subtle 等
        content: colors.text,
        surface: colors.background,
        stroke: colors.border,
      },

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
