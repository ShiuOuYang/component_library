#!/usr/bin/env node
/**
 * 文件 API 表與元件實際 API 的一致性檢查
 *
 * 文件站的 API 表（<ApiTable>）是手寫的，元件改了 prop 名稱或拿掉 event，
 * 文件不會跟著壞，只會默默說錯。這個檢查第一次跑就抓到：
 *   - ChptTabs 的文件說有 default 插槽，元件只有 panel / panel-N —— 照文件寫 #default 什麼都不會出現
 *   - DualAxisComboChart 把事件列在 Props 表、ChptConfigProvider 把 useConfig() 列成 prop
 *
 * 做法：
 *   每張 <ApiTable> 用 of="元件名" 標明在說哪個元件（可空白分隔列多個；
 *   不是元件 API 的表格寫 of="-"）。依 title 判斷表格種類：
 *     Props → props、Events → emits、Slots → 模板裡的 <slot>、方法 / Expose → defineExpose
 *   （「Props / Events」這類混合表格取聯集）
 *   表格每一列的 name 拆開後（'width / height'、'v-model'、'@change'、'reset()'…）
 *   都必須是該元件真的有的 API。
 *
 * 只檢查「文件寫了、元件沒有」——寫錯比漏寫更糟：照著文件寫的程式會靜靜地不生效。
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, basename, relative } from 'node:path'
import { parse, compileScript, babelParse } from '@vue/compiler-sfc'

const LIB = 'src/components/library'
const DOCS = 'src/views'
const KIND_LABEL = { props: 'prop', emits: 'event', slots: '插槽', expose: '方法（ref）' }

function walk(dir, ext) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p, ext))
    else if (p.endsWith(ext)) out.push(p)
  }
  return out
}

// ===== 元件實際的 API =====

const componentFiles = new Map(walk(LIB, '.vue').map((f) => [basename(f, '.vue'), f]))
const apiCache = new Map()

/** 物件或陣列常值的鍵：{ a: …, 'b-c': … } → [a, b-c]；['a', 'b'] → [a, b] */
function keysOf(node) {
  if (!node) return []
  if (node.type === 'CallExpression') return keysOf(node.arguments[0]) // _mergeDefaults({…}, {…})
  if (node.type === 'TSAsExpression') return keysOf(node.expression)
  if (node.type === 'ArrayExpression') return node.elements.filter((e) => e?.type === 'StringLiteral').map((e) => e.value)
  if (node.type === 'ObjectExpression') {
    return node.properties.map((p) => p.key?.name ?? p.key?.value).filter((k) => typeof k === 'string')
  }
  return []
}

/** 編譯後元件選項裡的 props / emits */
function optionsOf(code) {
  const ast = babelParse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] })
  const decl = ast.program.body.find((n) => n.type === 'ExportDefaultDeclaration')?.declaration
  const options = decl?.type === 'CallExpression' ? decl.arguments[0] : decl
  const result = { props: [], emits: [] }
  for (const prop of options?.properties ?? []) {
    const key = prop.key?.name
    if (key === 'props' || key === 'emits') result[key] = keysOf(prop.value)
  }
  return result
}

function componentApi(name) {
  if (apiCache.has(name)) return apiCache.get(name)
  const file = componentFiles.get(name)
  if (!file) return null
  const source = readFileSync(file, 'utf8')
  const { descriptor } = parse(source, { filename: file })
  const compiled = compileScript(descriptor, {
    id: name,
    fs: { fileExists: existsSync, readFile: (p) => readFileSync(p, 'utf8') },
  })

  // 從編譯結果的 export default { props, emits } 取鍵名。
  // 不用 compiled.bindings：setup 裡有同名變數（例如 const size = computed(...)）時，
  // prop 的 binding 會被蓋掉；非 <script setup> 的元件也沒有 bindings。
  const { props, emits } = optionsOf(compiled.content)
  const template = descriptor.template?.content ?? ''
  const slots = new Set()
  let dynamicSlots = false
  for (const m of template.matchAll(/<slot\b([^>]*)>/g)) {
    const named = m[1].match(/(?:^|\s)name="([^"]+)"/)
    if (named) slots.add(named[1])
    else if (/:name=|v-bind:name=/.test(m[1])) dynamicSlots = true
    else slots.add('default')
  }

  // render 函式或 script 裡用到的插槽（slots.split、$slots.footer、slots['x']）
  for (const m of source.matchAll(/\$?\bslots\.([A-Za-z_]\w*)|\$?\bslots\[['"]([\w-]+)['"]\]/g)) {
    slots.add(m[1] ?? m[2])
  }

  const expose = []
  const ast = compiled.scriptSetupAst ?? []
  const visit = (node) => {
    if (!node || typeof node !== 'object') return
    if (node.type === 'CallExpression' && node.callee?.name === 'defineExpose' && node.arguments[0]?.type === 'ObjectExpression') {
      for (const p of node.arguments[0].properties) {
        const key = p.key?.name ?? p.key?.value
        if (key) expose.push(key)
      }
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit)
      else if (value && typeof value.type === 'string') visit(value)
    }
  }
  ast.forEach(visit)

  const api = { file, props, emits, slots: [...slots], dynamicSlots, expose }
  apiCache.set(name, api)
  return api
}

// ===== 文件 API 表 =====

/** 比對用：不分大小寫、忽略連字號（update:page-size ≡ update:pageSize） */
const norm = (s) => s.toLowerCase().replace(/-/g, '')

/**
 * 一列的 name 拆成實際的 API 名稱；說明文字（中文、含空白）略過。
 * `#x` 一定是插槽、`@x` 一定是事件（混在 Props 表裡也照它的前綴檢查）；
 * `layer.keyFn` 這種是某個 prop 物件裡的欄位，不在元件 API 層級，略過。
 */
function namesOf(raw) {
  const out = []
  for (let token of raw.split(/\s*[/,、]\s*/)) {
    token = token.trim().replace(/\(.*\)$/, '')
    let kind = null
    if (token.startsWith('#')) kind = 'slots'
    else if (token.startsWith('@')) kind = 'emits'
    token = token.replace(/^[#@:]/, '').replace(/<(\w+)>/g, '{$1}')
    if (token === 'v-model') token = 'modelValue'
    else if (token.startsWith('v-model:')) token = token.slice('v-model:'.length)
    if (token.includes('.')) continue
    if (/^[A-Za-z][\w:{}-]*$/.test(token)) out.push({ name: token, kind })
  }
  return out
}

/** 取出 `const NAME = [ {…}, {…} ]` 的每一列物件原文（括號配對，略過字串裡的括號） */
function rowsOf(script, varName) {
  const start = script.search(new RegExp(`const ${varName}\\s*=\\s*\\[`))
  if (start < 0) return null
  const rows = []
  let depth = 0
  let quote = null
  let rowStart = -1
  for (let i = script.indexOf('[', start); i < script.length; i++) {
    const c = script[i]
    if (quote) {
      if (c === '\\') i++
      else if (c === quote) quote = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') quote = c
    else if (c === '[' || c === '{') {
      if (c === '{' && depth === 1) rowStart = i
      depth++
    } else if (c === ']' || c === '}') {
      depth--
      if (c === '}' && depth === 1) rows.push(script.slice(rowStart, i + 1))
      if (depth === 0) return rows
    }
  }
  return rows
}

/** 列物件裡某個欄位的字串值 */
const field = (row, key) => row.match(new RegExp(`\\b${key}:\\s*(['"\`])((?:(?!\\1).)*)\\1`))?.[2]

function kindsOf(title) {
  const kinds = []
  if (/Props/i.test(title)) kinds.push('props')
  if (/Events/i.test(title)) kinds.push('emits')
  if (/Slots/i.test(title)) kinds.push('slots')
  if (/方法|Expose/i.test(title)) kinds.push('expose')
  return kinds
}

const problems = []
let tableCount = 0
let checkedNames = 0

for (const docFile of walk(DOCS, '.vue')) {
  const source = readFileSync(docFile, 'utf8')
  const scriptStart = source.indexOf('<script')
  const template = scriptStart >= 0 ? source.slice(0, scriptStart) : source
  const script = scriptStart >= 0 ? source.slice(scriptStart) : ''
  const where = relative('.', docFile)

  for (const m of template.matchAll(/<ApiTable\b([^>]*?)\/?>/g)) {
    const attrs = m[1]
    const title = attrs.match(/\btitle="([^"]*)"/)?.[1] ?? ''
    const rowsVar = attrs.match(/:rows="([^"]+)"/)?.[1]
    const of = attrs.match(/\bof="([^"]*)"/)?.[1]

    if (of === undefined) {
      problems.push(`${where}：<ApiTable title="${title}"> 沒有標 of="元件名"（不是元件 API 的表格寫 of="-"）`)
      continue
    }
    if (of === '-') continue
    tableCount++

    const kinds = kindsOf(title)
    if (kinds.length === 0) {
      problems.push(`${where}：「${title}」看不出是 Props / Events / Slots / 方法 哪一種；不是元件 API 的表格寫 of="-"`)
      continue
    }

    const apis = of.split(/\s+/).map((name) => [name, componentApi(name)])
    const unknown = apis.filter(([, api]) => !api).map(([name]) => name)
    if (unknown.length) {
      problems.push(`${where}：of="${of}" 找不到元件 ${unknown.join(', ')}`)
      continue
    }

    const literalRows = rowsVar && rowsOf(script, rowsVar)
    if (!literalRows) {
      problems.push(`${where}：找不到 :rows="${rowsVar}" 的陣列`)
      continue
    }

    /** 這些元件在這幾種 API 裡有沒有這個名稱 */
    const has = (name, kindList) => {
      const key = norm(name)
      return apis.some(([, api]) =>
        kindList.some((kind) => {
          if (kind === 'slots' && name.includes('{')) return api.dynamicSlots
          if (api[kind].some((n) => norm(n) === key)) return true
          // v-model:x 的 prop 與 update:x 的 event 是同一組
          return kind === 'emits' && api.props.some((p) => norm(`update:${p}`) === key)
        })
      )
    }

    for (const row of literalRows) {
      let raw = field(row, 'name')
      if (raw === undefined) continue
      let rowKinds = kinds
      if (raw.startsWith('ref:')) {
        // 'ref: open(key) / close(key)' —— 透過 ref 呼叫的方法
        raw = raw.slice(4)
        rowKinds = ['expose']
      } else if (raw === 'Events') {
        // Props 表裡的「Events」一列：事件名稱寫在型別欄
        raw = field(row, 'type') ?? field(row, 'params') ?? ''
        rowKinds = ['emits']
      }
      for (const { name, kind } of namesOf(raw)) {
        checkedNames++
        const lookIn = kind ? [kind] : rowKinds
        if (!has(name, lookIn)) {
          problems.push(`${where}：「${title}」列了 ${name}，但 ${of} 沒有這個 ${lookIn.map((k) => KIND_LABEL[k]).join(' / ')}`)
        }
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`文件 API 表檢查失敗（${problems.length} 項）：\n`)
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}

console.log(`文件 API 表檢查通過：${tableCount} 張表、${checkedNames} 個名稱都對得上元件實際的 API。`)
