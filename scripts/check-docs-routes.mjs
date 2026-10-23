#!/usr/bin/env node
/**
 * 文件站路由檢查
 *
 * 擋下兩種曾經存在的問題：
 *
 * 1. 指向不存在檔案的路由 —— 點下去是執行期錯誤。
 * 2. 佔位頁路由 —— 側欄或首頁連過去卻是一片「開發中」，
 *    而其中四個（圓餅圖 / 儀表板 / 甘特圖 / Legend）連側欄入口都沒有，
 *    是只能手打 URL 才到得了的孤兒路由。元件做出來再把路由加回來。
 * 3. 孤兒文件頁 —— src/views/docs 底下沒有任何路由或檔案 import 的頁面。
 *    沒人看得到，卻還是會被當成「文件」維護、搜尋時誤導人
 *    （CommonTableDoc / DraggableModal / TagFilterDropdown 曾經這樣放了很久，內容早已過時）。
 */
import { readFile, access, readdir } from 'node:fs/promises'
import { dirname, resolve, join } from 'node:path'

const ROUTER = 'src/router/index.js'
const rawSource = await readFile(ROUTER, 'utf8')
const routerDir = dirname(ROUTER)

/**
 * 去掉區塊註解與行註解後再比對。
 *
 * 被註解掉的 import 不是路由，不該被當成「引用了不存在的檔案」；
 * 同理，註解裡提到 Placeholder 也不代表真的掛了佔位頁。
 */
const source = rawSource
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

const problems = []

// --- 1. 每個 component 指向的檔案都必須存在 ---
// 同時涵蓋靜態 import 與路由層的 () => import("…")
const specs = new Set()
for (const m of source.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)) specs.add(m[1])
// 靜態 import 的綁定可能是 default、具名或混合，因此不限定成單一識別字
for (const m of source.matchAll(/\bfrom\s*["']([^"']+)["']/g)) specs.add(m[1])

for (const spec of specs) {
  if (!spec.startsWith('.')) continue
  const path = resolve(routerDir, spec)
  try {
    await access(path)
  } catch {
    problems.push(`${ROUTER} 引用了不存在的檔案：${spec}`)
  }
}

// --- 2. 不得再出現佔位頁 ---
const PLACEHOLDER_PATTERNS = [/ComponentPlaceholder/, /Placeholder\.vue/]
for (const pattern of PLACEHOLDER_PATTERNS) {
  if (pattern.test(source)) {
    problems.push(
      `${ROUTER} 出現佔位頁（${pattern.source}）。` +
        '\n    元件還沒做好就先不要掛路由 —— 側欄連到一片「開發中」比沒有這個項目更糟。'
    )
  }
}

// --- 3. 文件頁都要有人引用（路由或其他檔案的 import） ---
async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(p)))
    else out.push(p)
  }
  return out
}

const srcFiles = (await walk('src')).filter((f) => /\.(vue|js|ts)$/.test(f))
const referenced = new Set()
for (const file of srcFiles) {
  const code = await readFile(file, 'utf8')
  for (const m of code.matchAll(/(?:from\s*|import\s*\(\s*)["']([^"']+\.vue)["']/g)) {
    const spec = m[1]
    if (spec.startsWith('@/')) referenced.add(resolve('src', spec.slice(2)))
    else if (spec.startsWith('.')) referenced.add(resolve(dirname(file), spec))
  }
}
for (const page of srcFiles.filter((f) => f.startsWith(join('src', 'views', 'docs')) && f.endsWith('.vue'))) {
  if (!referenced.has(resolve(page))) {
    problems.push(`${page} 沒有任何路由或檔案引用（孤兒文件頁）。要用就掛上路由，不用就刪掉。`)
  }
}

if (problems.length > 0) {
  console.error('文件站路由檢查失敗：\n')
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}

const routeCount = [...source.matchAll(/^\s*path:\s*["']/gm)].length
console.log(`文件站路由檢查通過：${routeCount} 條路由，無佔位頁、無斷掉的引用、無孤兒文件頁。`)
