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
 */
import { readFile, access } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const ROUTER = 'src/router/index.js'
const source = await readFile(ROUTER, 'utf8')
const routerDir = dirname(ROUTER)

const problems = []

// --- 1. 每個 component 指向的檔案都必須存在 ---
// 同時涵蓋靜態 import 與路由層的 () => import("…")
const specs = new Set()
for (const m of source.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)) specs.add(m[1])
for (const m of source.matchAll(/^import\s+\w+\s+from\s+["']([^"']+)["'];?$/gm)) specs.add(m[1])

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

if (problems.length > 0) {
  console.error('文件站路由檢查失敗：\n')
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}

const routeCount = [...source.matchAll(/^\s*path:\s*["']/gm)].length
console.log(`文件站路由檢查通過：${routeCount} 條路由，無佔位頁、無斷掉的引用。`)
