#!/usr/bin/env node
/**
 * 組件庫不得寫死中文的使用者可見文字
 *
 * 元件內建的文字（按鈕、提示、aria-label、預設 placeholder …）一律從
 * `useLocale()`（shared/config.ts 的 ChptLocale）取得，才能讓
 * `<ChptConfigProvider :locale="enUS">` 真的把整個區塊切成英文，
 * 而不是只有分頁換了語言、其他地方還是中文，螢幕閱讀器也照念中文。
 *
 * 掃描範圍：src/components/library 底下的 .vue / .ts（語系檔本身除外）
 *   - template：文字節點、靜態屬性、v-bind / 事件等指令運算式裡的字串
 *   - script：字串字面值與樣板字面值（用 TypeScript 的 AST，不用正規式猜）
 *
 * 不算違規：
 *   - 註解（AST 本來就不包含）
 *   - console.* 與 warnDeprecated(...) 的參數：給開發者看的訊息，不會出現在畫面上
 *   - 同一行或上一行標了 `i18n-ignore` 的字串：資料本身就是中文的情況，
 *     例如 Excel 公式的中文函式別名、解析使用者檔案時比對的中文欄名
 *
 * ⚠️ 用 Vue compiler 與 TypeScript 的 AST，理由同 check-button-type.mjs：
 *    正規式會被屬性裡的 >、巢狀 </template> 與跨行字串騙過，讓檢查「通過」卻漏掉東西。
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { parse } from 'vue/compiler-sfc'
import ts from 'typescript'

const ROOT = 'src/components/library'
/** 語系檔：中文本來就該出現在這裡 */
const LOCALE_FILES = new Set(['src/components/library/shared/locale.ts'])

const HAN = /\p{Script=Han}/u

/** Vue AST 節點型別（compiler-core 的 NodeTypes） */
const ELEMENT = 1
const TEXT = 2
const INTERPOLATION = 5
const ATTRIBUTE = 6
const DIRECTIVE = 7
const SIMPLE_EXPRESSION = 4
const COMPOUND_EXPRESSION = 8
const TEXT_CALL = 12
const IF = 9
const FOR = 11

async function collect(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await collect(full)))
    else if (/\.(vue|ts)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) out.push(full)
  }
  return out
}

/** 掃一段 TS/JS 程式碼（script 區塊或 template 運算式），回傳違規的 [行號(相對), 字串] */
function scanCode(code, lineOffset, sourceLines) {
  const found = []
  const sf = ts.createSourceFile('x.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)

  const isDevMessage = (node) => {
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isCallExpression(p)) {
        const callee = p.expression.getText(sf)
        if (/^console\.\w+$/.test(callee) || callee === 'warnDeprecated') return true
      }
      // 型別位置的字串（字面值型別）不會出現在畫面上
      if (ts.isLiteralTypeNode(p)) return true
    }
    return false
  }

  const visit = (node) => {
    let text = null
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) text = node.text
    else if (ts.isTemplateExpression(node)) {
      text = node.head.text + node.templateSpans.map((s) => s.literal.text).join('')
    } else if (ts.isJsxText?.(node)) text = node.text

    if (text !== null && HAN.test(text) && !isDevMessage(node)) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + lineOffset
      if (!isIgnored(sourceLines, line)) found.push([line, text])
      if (ts.isTemplateExpression(node)) return // 不再往下重複回報 span
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return found
}

/** 1-based 行號；同一行或上一行有 i18n-ignore 就略過 */
function isIgnored(lines, line) {
  return /i18n-ignore/.test(lines[line - 1] ?? '') || /i18n-ignore/.test(lines[line - 2] ?? '')
}

function scanTemplate(ast, templateStartLine, sourceLines) {
  const found = []
  const report = (loc, text) => {
    const line = loc.start.line + templateStartLine - 1
    if (!isIgnored(sourceLines, line)) found.push([line, text])
  }
  const scanExpr = (exp) => {
    if (!exp) return
    if (exp.type === SIMPLE_EXPRESSION) {
      if (!exp.content || !HAN.test(exp.content)) return
      const line = exp.loc.start.line + templateStartLine - 1
      // 用 TS 解析運算式，只抓字串字面值；註解或識別字不算
      for (const [l, t] of scanCode(`(${exp.content})`, line, sourceLines)) found.push([l, t])
    } else if (exp.type === COMPOUND_EXPRESSION) {
      for (const c of exp.children) if (typeof c === 'object') scanExpr(c)
    }
  }
  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    switch (node.type) {
      case TEXT:
        if (HAN.test(node.content)) report(node.loc, node.content.trim())
        break
      case INTERPOLATION:
        scanExpr(node.content)
        break
      case TEXT_CALL:
        walk(node.content)
        break
      case COMPOUND_EXPRESSION:
        for (const c of node.children) if (typeof c === 'object') walk(c)
        break
      case ELEMENT:
        for (const prop of node.props) {
          if (prop.type === ATTRIBUTE && prop.value && HAN.test(prop.value.content)) {
            report(prop.loc, `${prop.name}="${prop.value.content}"`)
          } else if (prop.type === DIRECTIVE) {
            scanExpr(prop.exp)
          }
        }
        break
      case IF:
        break
      case FOR:
        scanExpr(node.source)
        break
    }
    for (const child of node.children ?? []) walk(child)
    for (const branch of node.branches ?? []) {
      scanExpr(branch.condition)
      walk(branch)
    }
  }
  walk(ast)
  return found
}

const files = (await collect(ROOT)).filter((f) => !LOCALE_FILES.has(f))
const offenders = []

for (const file of files) {
  const source = await readFile(file, 'utf8')
  const lines = source.split('\n')

  if (file.endsWith('.ts')) {
    for (const [line, text] of scanCode(source, 1, lines)) offenders.push({ file, line, text })
    continue
  }

  const { descriptor, errors } = parse(source, { filename: file })
  if (errors.length > 0) {
    console.error(`✗ ${file} 無法解析：${errors[0].message}`)
    process.exit(1)
  }
  for (const block of [descriptor.script, descriptor.scriptSetup]) {
    if (!block) continue
    const startLine = block.loc.start.line
    for (const [line, text] of scanCode(block.content, startLine, lines)) {
      offenders.push({ file, line, text })
    }
  }
  if (descriptor.template?.ast) {
    // 用 parse 階段的原始 AST（不經 transform）：transform 之後 v-if / v-for 的節點結構會變，
    // 第一版就因此漏掉 v-if 按鈕上的 :title。原始 AST 的行號是相對整個 .vue 檔。
    for (const [line, text] of scanTemplate(descriptor.template.ast, 1, lines)) offenders.push({ file, line, text })
  }
}

if (process.argv.includes('--summary')) {
  const byFile = new Map()
  for (const o of offenders) byFile.set(o.file, (byFile.get(o.file) ?? 0) + 1)
  for (const [f, n] of [...byFile].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(4)}  ${relative(ROOT, f)}`)
  console.log(`total ${offenders.length}`)
  process.exit(offenders.length ? 1 : 0)
}

if (offenders.length > 0) {
  console.error('✗ 組件庫裡有寫死的中文文字，切換語系時不會跟著變：\n')
  for (const o of offenders) {
    const snippet = o.text.replace(/\s+/g, ' ').slice(0, 60)
    console.error(`  ${relative('.', o.file)}:${o.line}  ${snippet}`)
  }
  console.error(
    `\n共 ${offenders.length} 處。請把文字加進 shared/locale.ts 的 ChptLocale（zhTW 與 enUS 都要），` +
      '\n元件裡用 useLocale() 讀取；確定是資料而不是介面文字時，在該行或上一行加註解 i18n-ignore。'
  )
  process.exit(1)
}

console.log(`✓ 組件庫多語系檢查通過（${files.length} 個檔案，沒有寫死的中文文字）`)
