/**
 * PostCSS 設定
 *
 * postcss-import 必須排在第一個，否則 styles/index.css 裡的 @import
 * 不會被內聯，@layer base / @layer components 就無法被 Tailwind 正確處理。
 *
 * 安裝：npm i -D postcss-import
 */
export default {
  plugins: {
    'postcss-import': {},
    tailwindcss: {},
    autoprefixer: {},
  },
}
