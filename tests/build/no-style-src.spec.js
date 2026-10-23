import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * 組件庫的 SFC 不用 <style src="…">
 *
 * ⚠️ 多個元件共用同一個外部樣式檔時（例如 FacetedChart / GridFacetChart 共用 facetShared.scss），
 *    @vitejs/plugin-vue 會把外部檔案當成「屬於某個元件的第 N 個 style 區塊」來處理，
 *    並靠快取找回該元件的描述。快取找不到時（開發伺服器重啟後 .scss 的請求先抵達、
 *    Windows 上 E: / e: 路徑大小寫不一致…）會退回只有 styles[0] 的暫時描述；
 *    共用區塊若不是第 1 個 style，就會在開發時噴出
 *      [plugin:vite:vue] Cannot read properties of undefined (reading 'scoped')
 *    build 與測試都不會出現這個錯誤，所以需要這個測試盯著。
 *
 * 共用樣式請在元件自己的 <style scoped> 開頭用 Sass 內嵌：@use './facetShared';
 */

const LIBRARY = 'src/components/library'

function collectVueFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectVueFiles(full))
    else if (entry.name.endsWith('.vue')) out.push(full)
  }
  return out
}

describe('組件庫 SFC 不以 <style src> 引入樣式', () => {
  it('沒有任何 <style … src="…">', () => {
    const offenders = collectVueFiles(LIBRARY)
      .filter((file) => {
        // 先拿掉註解：說明這個問題的註解本身會提到 <style src>
        const code = readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
        return /<style\b[^>]*\bsrc\s*=/.test(code)
      })
      .map((file) => relative('.', file))
    expect(offenders).toEqual([])
  })
})
