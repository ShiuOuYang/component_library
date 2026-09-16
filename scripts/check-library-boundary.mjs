#!/usr/bin/env node
/**
 * 組件庫邊界檢查
 *
 * src/components/library/ 必須能被整包複製到另一個專案而不需要修改。
 * 因此它只能相依：
 *   - node_modules 的套件（vue / d3 / @vueuse/core …）
 *   - library 內部（@/components/library/… 或相對路徑）
 *   - @/design（設計令牌，是組件庫的一部分）
 *
 * 任何指向 @/composables、@/stores、@/api、@/utils、@/views、@/router 的 import
 * 都會讓組件庫綁死在這個應用上 —— 這支腳本就是為了擋住它再長回來。
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const LIBRARY_ROOT = 'src/components/library'
const ALLOWED_ALIAS_PREFIXES = ['@/components/library', '@/design']

/**
 * 取出模組路徑，涵蓋四種寫法：
 *   import x from '…' / export … from '…'   → from 分支
 *   import '…'                              → 純副作用匯入（原本漏掉）
 *   await import('…')                        → 動態匯入（原本漏掉）
 *   require('…')                             → CJS（原本漏掉）
 *
 * ⚠️ 原本只比對 `from '…'`，因此 `import '@/stores/setup'` 這種沒有綁定的
 *    副作用匯入完全躲得過檢查 —— 那正是最容易讓組件庫偷偷綁回應用程式的寫法。
 */
const IMPORT_RE =
  /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g

async function collectFiles(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await collectFiles(full)))
    else if (/\.(vue|ts|js|mts|mjs)$/.test(entry.name)) out.push(full)
  }
  return out
}

/**
 * canonical（Chpt*）元件不得內部相依 legacy 相容層。
 * ChptTable 曾經內部使用 PaginationControls，導致使用者只要用 ChptTable
 * 就會收到一則與自己無關的 PaginationControls deprecation 警告。
 */
const LEGACY_COMPONENTS = [
  'CodeBlock', 'CommonTable', 'CommonTooltip', 'DraggableModal',
  'FilterBar', 'FilterDropdown', 'FilterSelect', 'HeaderLogoutButton',
  'ModalDock', 'PageSwitcher', 'Pagination', 'PaginationControls',
  'SimpleDarkModeToggle', 'TabNavigation', 'TagFilterDropdown',
]

const violations = []

for (const file of await collectFiles(LIBRARY_ROOT)) {
  const source = await readFile(file, 'utf8')

  // 去掉區塊註解與行註解，避免說明文字裡的範例被誤判
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

  for (const match of code.matchAll(IMPORT_RE)) {
    const spec = match[1]
    if (!spec.startsWith('@/')) continue
    if (ALLOWED_ALIAS_PREFIXES.some((p) => spec === p || spec.startsWith(p + '/'))) continue

    const line = code.slice(0, match.index).split('\n').length
    violations.push({ file: relative('.', file), line, spec })
  }

  // canonical 不得 import legacy。
  // 兩種檔案不受此限：legacy 本身（薄包裝當然要 import canonical，反向也可能
  // 互相引用），以及 barrel index.js（匯出 legacy 正是它的職責）。
  const base = file.split('/').pop()
  if (base === 'index.js' || base === 'index.ts') continue
  if (LEGACY_COMPONENTS.includes(base.replace(/\.vue$/, ''))) continue

  for (const match of code.matchAll(IMPORT_RE)) {
    const spec = match[1]
    const imported = spec.split('/').pop().replace(/\.vue$/, '')
    if (!LEGACY_COMPONENTS.includes(imported)) continue

    const line = code.slice(0, match.index).split('\n').length
    violations.push({
      file: relative('.', file),
      line,
      spec,
      reason: `canonical 元件不得內部使用 legacy 相容層（${imported}）`,
    })
  }
}

if (violations.length > 0) {
  console.error('組件庫邊界檢查失敗\n')
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  →  ${v.spec}`)
    if (v.reason) console.error(`      ${v.reason}`)
  }
  console.error(
    '\n處理方式：若該模組本來就屬於組件庫，請搬進 src/components/library/；' +
      '\n若它是應用程式的邏輯（auth / store / api），請改由 props 或 emit 注入。'
  )
  process.exit(1)
}

console.log('組件庫邊界檢查通過：無對應用程式內部模組的相依。')
