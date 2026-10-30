/// <reference types="vite/client" />

/** 建置時由 vite.config.js 的 define 帶入：package.json 的版本、最後一次 commit 的日期 */
declare const __DOCS_VERSION__: string
declare const __DOCS_UPDATED__: string

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

// 讓 .vue 檔案可以被 TypeScript 視為模組匯入
declare module '*.vue' {
  import type { ComponentOptions } from 'vue'
  const component: ComponentOptions
  export default component
}
