#!/usr/bin/env node
/**
 * <button> 必須明確標註 type
 *
 * HTML 規範裡 <button> 的 type 預設是 "submit"。因此 <button @click="…">
 * 放在 <form> 裡面時，點下去除了跑 @click 還會送出表單、整頁重新載入。
 *
 * 對元件庫來說這是特別嚴重的缺陷：使用端把 ChptPagination、ChptFilter
 * 或 ChptModal 包進自己的 <form> 是完全合理的用法，但表單被送出的行為
 * 發生在元件內部，使用端既看不出原因也無法從外部修正。
 *
 * 規則：每個 <button> 都要有 type="…" 或 :type="…"（動態綁定也算）。
 * 真正要送出表單的按鈕請明確寫 type="submit"，不要依賴預設值。
 *
 * ⚠️ 這支腳本刻意用 Vue 自己的 template compiler 產生 AST，而不是用正規式
 *    掃 <button[^>]*>。寫這條規則時第一版就是用正規式，結果踩到兩個坑：
 *      1. 屬性值裡的 > 會讓標籤提早結束
 *         （:disabled="arrayValue.length > 0"）
 *      2. 以第一個 </template> 當作模板結尾，但 <template v-for> /
 *         <template #slot> 的收尾也是 </template>，於是模板後半段整段沒掃到
 *    兩個坑都會讓檢查「通過」而漏掉真的有問題的按鈕 —— 比沒檢查更危險。
 *    用 compiler 就沒有這類猜測空間。
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse, compileTemplate } from 'vue/compiler-sfc'

const ROOT = 'src'

/** Vue AST 的節點型別（compiler-core 的 NodeTypes） */
const ELEMENT = 1
const ATTRIBUTE = 6
const DIRECTIVE = 7

async function collectVueFiles(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await collectVueFiles(full)))
    else if (entry.name.endsWith('.vue')) out.push(full)
  }
  return out
}

/** 這個節點有沒有標註 type（靜態屬性或 :type / v-bind:type 都算）？ */
function hasTypeAttr(node) {
  return node.props.some(
    (prop) =>
      (prop.type === ATTRIBUTE && prop.name === 'type') ||
      (prop.type === DIRECTIVE &&
        prop.name === 'bind' &&
        prop.arg?.content === 'type')
  )
}

function walk(node, file, found) {
  if (!node || typeof node !== 'object') return

  if (node.type === ELEMENT && node.tag === 'button' && !hasTypeAttr(node)) {
    found.push(`${file}:${node.loc.start.line}`)
  }

  for (const child of node.children ?? []) walk(child, file, found)
  // v-if / v-else-if / v-else 會被包成 branches，不走 children
  for (const branch of node.branches ?? []) walk(branch, file, found)
}

const files = await collectVueFiles(ROOT)
const offenders = []
let buttonCount = 0
let templateCount = 0

for (const file of files) {
  const source = await readFile(file, 'utf8')
  const { descriptor, errors } = parse(source, { filename: file })
  if (errors.length > 0) {
    console.error(`✗ ${file} 無法解析：${errors[0].message}`)
    process.exit(1)
  }
  if (!descriptor.template) continue
  templateCount += 1

  const { ast } = compileTemplate({
    source: descriptor.template.content,
    filename: file,
    id: file,
  })

  const found = []
  walk(ast, file, found)
  // 只為了印出統計，方便確認腳本真的掃到東西（而不是靜靜地掃了 0 顆）
  buttonCount += countButtons(ast)
  offenders.push(...found)
}

function countButtons(node) {
  if (!node || typeof node !== 'object') return 0
  let n = node.type === ELEMENT && node.tag === 'button' ? 1 : 0
  for (const child of node.children ?? []) n += countButtons(child)
  for (const branch of node.branches ?? []) n += countButtons(branch)
  return n
}

if (offenders.length > 0) {
  console.error('✗ 以下 <button> 沒有標註 type，放進 <form> 會誤觸表單送出：\n')
  for (const where of offenders) console.error(`  ${where}`)
  console.error(
    `\n共 ${offenders.length} 處。請補上 type="button"（或明確寫 type="submit"）。`
  )
  process.exit(1)
}

console.log(
  `✓ <button> type 檢查通過（${templateCount} 個模板、${buttonCount} 顆按鈕）`
)
