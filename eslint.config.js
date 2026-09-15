import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

/**
 * ESLint 設定（flat config）
 *
 * 分工：
 *   - 型別由 `npm run typecheck`（vue-tsc）負責，ESLint 不重複檢查型別
 *   - 排版由 Prettier 負責，skipFormatting 關掉所有會和 Prettier 打架的規則
 *   - ESLint 只管「會出錯或誤導人」的程式碼問題
 */
export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,ts,mts,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      // 設計系統的舊副本，待確認後移除；不納入檢查以免噪音
      'style/**',
      // 學習用途的獨立 HTML / 練習檔，不屬於組件庫
      'src/d3-learning/**',
      'public/**',
      // 技能封裝的樣板與說明資產（含刻意留白的 placeholder），不是應用程式碼
      'skill/**',
    ],
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  skipFormatting,

  {
    name: 'app/language-options',
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
  },

  {
    name: 'app/rules',
    rules: {
      // 元件庫不該把偵錯訊息帶進正式版；warn / error 仍然允許
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',

      // 未使用的變數一律報錯，底線開頭者視為刻意忽略
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // 元件庫對外的檔名一律 PascalCase 單檔元件，但 index.js / 文件頁沿用既有命名
      'vue/multi-word-component-names': 'off',

      // 這兩條在既有程式碼量下噪音大於價值，先設為 warn，日後再逐步收緊
      '@typescript-eslint/no-explicit-any': 'warn',
      'vue/no-v-html': 'warn',

      // --- 純排版規則：交給 Prettier，避免 300+ 筆和程式品質無關的噪音 ---
      'vue/attributes-order': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',

      // 本專案 JS 與 TS 元件並存（charts / viewer / excel 仍是 JS），
      // 強制每個 SFC 都要 lang="ts" 不符現況；型別由 vue-tsc 把關。
      'vue/block-lang': 'off',
    },
  },

  {
    // 組件庫本體不允許殘留 console —— 這些訊息會跟著打包進使用端
    name: 'library/no-console',
    files: ['src/components/library/**/*.{js,ts,vue}'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  {
    // Node 端的設定檔與腳本
    name: 'app/node-files',
    files: [
      '*.config.js',
      'server.js',
      'src/design/**/*.js',
      'eslint.config.js',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
)
