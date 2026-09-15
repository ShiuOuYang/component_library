import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

/**
 * Vitest 設定
 *
 * 沿用 vite.config.js 的 alias（@ → src）與 vue plugin，測試檔才能用
 * 和產品程式碼一樣的路徑寫法。
 *
 * ⚠️ 本專案的 vite 是 5.x，vitest 需搭配 2.x（vitest 3+ 起 peer 要求 vite 6+）。
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.js'],
      include: ['tests/**/*.spec.{js,ts}'],
      // 覆蓋率只看組件庫本體 —— docs 頁與 D3 教學檔不是產品程式碼
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/components/library/**', 'src/design/**'],
        exclude: [
          '**/*.example.vue',
          'src/components/library/**/index.js',
          // 純型別宣告，沒有執行期程式碼
          'src/components/library/shared/types/**',
        ],
        /**
         * 門檻設在「目前水準」而不是理想值 —— 目的是讓覆蓋率只能往上，
         * 而不是掛一個現在就過不了的數字讓 CI 永遠紅燈。
         *
         * 整體數字偏低是因為 40 多個元件還沒有測試把平均拉下來；
         * shared/ 與 design/ 是已經測透的部分，門檻拉高避免退步。
         */
        thresholds: {
          statements: 20,
          branches: 55,
          functions: 30,
          lines: 20,
          'src/components/library/shared/**': {
            statements: 90,
            branches: 75,
            functions: 90,
            lines: 90,
          },
          'src/design/**': {
            statements: 90,
            branches: 80,
            functions: 80,
            lines: 90,
          },
        },
      },
      restoreMocks: true,
      clearMocks: true,
    },
  })
)
