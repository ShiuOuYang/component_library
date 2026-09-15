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

// 從 import / export ... from '…' 取出模組路徑
const IMPORT_RE = /\bfrom\s+['"]([^'"]+)['"]/g

async function collectFiles(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await collectFiles(full)))
    else if (/\.(vue|ts|js|mts|mjs)$/.test(entry.name)) out.push(full)
  }
  return out
}

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
}

if (violations.length > 0) {
  console.error('組件庫邊界檢查失敗：library 不得相依應用程式內部模組\n')
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  →  ${v.spec}`)
  }
  console.error(
    '\n處理方式：若該模組本來就屬於組件庫，請搬進 src/components/library/；' +
      '\n若它是應用程式的邏輯（auth / store / api），請改由 props 或 emit 注入。'
  )
  process.exit(1)
}

console.log('組件庫邊界檢查通過：無對應用程式內部模組的相依。')
