import { describe, expect, it } from 'vitest'
import pkg from '../../package.json'

/**
 * package.json 的 sideEffects 宣告
 *
 * ⚠️ 這個欄位看起來無關緊要，刪掉不會有任何測試失敗、不會有 lint 錯誤、
 *    畫面也完全正常 —— 只是 build 產物默默變大 389 kB（gzip）。
 *    正因為沒有任何可見症狀，它需要一個測試盯著。
 *
 * 背景：元件庫有一個 barrel（src/components/library/index.ts）同時 re-export
 * ui / charts / viewer / excel 四組元件。只要有人寫
 *
 *     import { ChptButton } from '@/components/library'
 *
 * 而 package.json 沒有宣告 sideEffects，Rollup 就只能假設每個模組都有副作用、
 * 不能丟掉沒用到的 re-export —— 於是 SheetJS（xlsx）與 d3 會跟著被拉進
 * **每一個**路由 chunk。實測連 NotFound 與 WhiteboardDoc 這種完全用不到
 * 試算表的頁面都含有整份 SheetJS。
 *
 * 加上宣告之後（實測數字）：
 *     index.js   1,657.24 kB → 826.46 kB（gzip 625.93 → 243.86）
 *     index.css    236.10 kB → 195.74 kB（gzip  52.85 →  46.03）
 *     SheetJS 從「每個 chunk 都有」變成只在 ExcelEditorDocs 一個 chunk
 *
 * 為什麼是 ['**\/*.css', '**\/*.scss'] 而不是 false：
 * 樣式檔是真的有副作用（載入即生效），列進來才不會被搖掉。已驗證改動後
 * 主題化 class（bg-surface-primary / text-accent）、.dark 區塊與 48 個
 * --t-* 變數都還在產物裡 —— CSS 少掉的 40 kB 是未使用元件的 scoped 樣式，
 * 不是需要的樣式被砍。
 */
describe('package.json：sideEffects', () => {
  it('有宣告 sideEffects，barrel 才能被 tree-shake', () => {
    expect(pkg.sideEffects).toBeDefined()
  })

  it('是陣列而不是 false —— 樣式檔必須保留副作用', () => {
    // sideEffects: false 會讓 Rollup 連 CSS import 都丟掉，樣式會整批消失
    expect(Array.isArray(pkg.sideEffects)).toBe(true)
  })

  it('涵蓋 css 與 scss', () => {
    expect(pkg.sideEffects).toContain('**/*.css')
    expect(pkg.sideEffects).toContain('**/*.scss')
  })

  it('不包含 js / ts / vue —— 列進去等於整個宣告失效', () => {
    for (const pattern of pkg.sideEffects) {
      expect(pattern, pattern).not.toMatch(/\.(js|ts|vue)$/)
    }
  })
})
