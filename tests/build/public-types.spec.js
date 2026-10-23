import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'

/**
 * 對外型別都要能從正式入口（@/components/library）取得
 *
 * ⚠️ 型別漏匯出時什麼都不會壞：typecheck 過、測試過、畫面正常，
 *    只有使用端想替 props 標型別時，得去 import 元件內部檔案
 *    （例如 DualAxisComboChart 的 ChartLayer 曾經只能從 charts/types/chart.types 拿）。
 *    執行期又看不到型別，public-api.spec.js 抓不到，所以這裡直接讀原始碼比對。
 *
 * 「對外型別」的來源：
 *   1. 公開元件（charts / viewer 全部；ui / excel 只算 Chpt*）裡 export 的型別
 *   2. 專放對外型別的模組（PUBLIC_TYPE_MODULES）
 *   3. 正式入口有匯出執行期 API 的 shared 模組（例如 useToast 的 ChptToastItem）
 * 這些來源裡 `export interface / export type` 的型別都必須出現在正式入口，
 * 確定是內部用的，在 JSDoc 標 @internal。
 */

const LIB = 'src/components/library'
const ENTRY = `${LIB}/index.ts`
const SUB_ENTRIES = { ui: true, charts: false, viewer: false, excel: true } // true = 只算 Chpt*
const PUBLIC_TYPE_MODULES = [
  `${LIB}/charts/types/chart.types.ts`,
  `${LIB}/shared/types/ui.types.ts`,
  `${LIB}/viewer/pcb/pcb.types.ts`,
]

const read = (file) => readFileSync(file, 'utf8')

/** './x.js' / './x' → 實際檔案路徑 */
function resolveSpec(fromFile, spec) {
  const p = normalize(join(dirname(fromFile), spec)).replace(/\.js$/, '')
  if (p.endsWith('.vue') || p.endsWith('.ts')) return p
  for (const cand of [`${p}.ts`, `${p}/index.ts`]) {
    try {
      readFileSync(cand)
      return cand
    } catch {
      // 試下一個
    }
  }
  return p
}

/** `export type { A, B as C } from '...'` → [{ exported, original, source }] */
function typeReExports(file) {
  const out = []
  for (const m of read(file).matchAll(/export type \{([^}]+)\} from '([^']+)'/g)) {
    const source = resolveSpec(file, m[2])
    for (const part of m[1].split(',').map((s) => s.trim()).filter(Boolean)) {
      const [original, exported = original] = part.split(/\s+as\s+/)
      out.push({ exported, original, source })
    }
  }
  return out
}

/** `export { a, b } from '...'`（執行期匯出）的來源檔 */
function valueReExportSources(file) {
  return [...read(file).matchAll(/^export \{[^}]+\} from '([^']+)'/gm)].map((m) => resolveSpec(file, m[1]))
}

/** 檔案裡宣告並 export 的型別，排除 JSDoc 標了 @internal 的 */
function declaredPublicTypes(file) {
  const names = []
  for (const m of read(file).matchAll(/(\/\*\*(?:(?!\*\/)[\s\S])*\*\/\s*)?^export (?:interface|type) (\w+)/gm)) {
    if (m[1]?.includes('@internal')) continue
    names.push(m[2])
  }
  return names
}

/** 子入口匯出的公開元件檔 */
function publicComponentFiles() {
  const files = []
  for (const [sub, chptOnly] of Object.entries(SUB_ENTRIES)) {
    const index = `${LIB}/${sub}/index.ts`
    for (const m of read(index).matchAll(/export \{ default as (\w+) \} from '([^']+\.vue)'/g)) {
      if (chptOnly && !m[1].startsWith('Chpt')) continue
      files.push(resolveSpec(index, m[2]))
    }
  }
  return files
}

/** 正式入口實際涵蓋的（來源檔, 原始名稱）；經過子入口的會追到原始檔 */
function coveredByEntry() {
  const covered = new Set()
  for (const { original, source } of typeReExports(ENTRY)) {
    const viaSub = typeReExports(source).find((e) => e.exported === original)
    if (viaSub) covered.add(`${viaSub.source}#${viaSub.original}`)
    else covered.add(`${source}#${original}`)
  }
  return covered
}

const sharedValueModules = () => valueReExportSources(ENTRY).filter((f) => f.includes('/shared/'))

describe('對外型別都能從正式入口取得', () => {
  const covered = coveredByEntry()
  const missing = (files) =>
    files.flatMap((file) => declaredPublicTypes(file).map((name) => `${file}#${name}`)).filter((k) => !covered.has(k))

  it('公開元件裡 export 的型別', () => {
    const files = publicComponentFiles()
    expect(files.length).toBeGreaterThan(80)
    expect(missing(files)).toEqual([])
  })

  it('對外型別模組（chart.types / ui.types / pcb.types）', () => {
    expect(missing(PUBLIC_TYPE_MODULES)).toEqual([])
  })

  it('有對外執行期 API 的 shared 模組', () => {
    const files = sharedValueModules()
    expect(files).toContain(`${LIB}/shared/useToast.ts`)
    expect(missing(files)).toEqual([])
  })

  it('子入口匯出的型別，正式入口也都有', () => {
    const notInEntry = Object.keys(SUB_ENTRIES).flatMap((sub) =>
      typeReExports(`${LIB}/${sub}/index.ts`)
        .map((e) => `${e.source}#${e.original}`)
        .filter((k) => !covered.has(k))
    )
    expect(notInEntry).toEqual([])
  })

  it('標了 @internal 的型別不算對外型別', () => {
    const chartTypes = declaredPublicTypes(`${LIB}/charts/types/chart.types.ts`)
    expect(chartTypes).toContain('ChartLayer')
    expect(chartTypes).not.toContain('ChartScalesProps')
  })
})
