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
         * 門檻設在「目前水準略低一點」，留幾個百分點的緩衝 ——
         * 目的是讓覆蓋率只能往上，而不是讓一次小重構就把 CI 弄紅。
         *
         * 已抽出的純函式模組都接近全覆蓋，各自掛上獨立門檻，避免日後被改回去。
         *
         * ⚠️ 整體門檻原本是 64 / 79 / 61 / 64（當年被沒有測試的元件拉低時定的），
         *    補完測試後實際已到 94 / 87 / 88.5 / 94 —— 門檻沒跟上，覆蓋率掉 30 點 CI 也不會擋。
         *    2026-10 調到現況減 2～3 點。之後覆蓋率明顯上升時，記得再把門檻往上調。
         */
        thresholds: {
          statements: 92,
          branches: 85,
          functions: 86,
          lines: 92,

          // 已測透的部分：各自訂門檻，不讓整體平均掩護退步
          'src/components/library/shared/**': {
            statements: 95,
            branches: 85,
            functions: 95,
            lines: 95,
          },
          'src/design/**': {
            statements: 90,
            branches: 80,
            functions: 80,
            lines: 90,
          },
          // 公式引擎：曾經用 new Function 求值，是最禁不起無測試改動的地方
          'src/components/library/excel/formula/**': {
            statements: 95,
            branches: 85,
            functions: 95,
            lines: 95,
          },
          // 匯入 / 匯出：會碰使用者的檔案，退步的代價是資料出錯
          'src/components/library/excel/ChptExcelExporter.vue': {
            statements: 90,
            branches: 82,
            functions: 88,
            lines: 90,
          },
          'src/components/library/excel/ChptExcelUploader.vue': {
            statements: 90,
            branches: 88,
            functions: 95,
            lines: 90,
          },
          'src/components/library/viewer/gerber/**': {
            statements: 95,
            branches: 95,
            functions: 95,
            lines: 95,
          },
          'src/components/library/viewer/pcb/**': {
            statements: 95,
            branches: 95,
            functions: 95,
            lines: 95,
          },
          'src/components/library/viewer/shared/**': {
            statements: 95,
            branches: 95,
            functions: 95,
            lines: 95,
          },
          'src/components/library/charts/utils/**': {
            statements: 95,
            branches: 95,
            functions: 95,
            lines: 95,
          },
        },
      },
      restoreMocks: true,
      clearMocks: true,
    },
  })
)
