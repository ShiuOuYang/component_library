#!/usr/bin/env node
/**
 * 元件庫不得寫死淺色 palette
 *
 * 深色模式要能運作，元件的顏色就必須走主題化角色（content / surface / stroke /
 * accent / success …），而不是 `bg-white`、`text-neutral-700` 這類固定色。
 *
 * ⚠️ 這條規則會長回來的原因很具體：`bg-white` 看起來完全無害，而且在淺色模式下
 *    畫面是對的 —— 只有切到深色才會發現整塊還是白的。沒有自動檢查的話，
 *    一次 AI 生成或一次複製貼上就會再帶進來，而且沒有人會在 review 時抓到。
 *
 * 允許的例外（不是漏掉，是換了會錯）：
 *   1. bg-black / border-black 系列
 *      → modal 遮罩、canvas 疊層，兩個主題都該是黑的
 *   2. text-white / text-black
 *      → 實心色底上的文字。實心底（accent-solid 等）不隨主題變亮，
 *        所以白字在兩個主題都正確
 *   3. ChptTooltip / ChptDataTooltip
 *      → 這兩個元件有自己的 theme prop（dark / light / info / warning / error），
 *        是呼叫端指定的皮膚，不是 app 主題。把 light 皮膚接到主題化角色，
 *        會讓 <ChptTooltip theme="light"> 在深色模式下變深 —— 毀掉 prop 的意義
 *   4. GerberViewer / PcbLayout
 *      → 深色 canvas 上的疊層 UI，本來就固定是深色
 *   5. 帶數字的品牌色階（bg-success-500）
 *      → 刻意鎖定某個顏色時的逃生門；命名規則是「有數字 = 固定，無數字 = 跟主題」
 *   6. ChptTag / ChptRadio / ChptSwitch / ChptBadge
 *      → 色彩變體裡有叫 dark / light 的 key（<ChptTag color="dark">），
 *        同樣是呼叫端選的皮膚，不是 app 主題
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * 掃描範圍。
 *   元件庫本身：整份檔案
 *   文檔站（頁面與外框）：只掃 <template> 與 <style>
 *     → 文檔頁的 <script> 裡是給人看的程式碼範例字串，其中有些刻意示範「錯誤寫法」
 *       或 dark: 的用法，不是實際套用的 class
 *
 * ⚠️ 原本只掃元件庫。文檔站本身有 700 多處 bg-white / text-neutral-600，
 *    切到深色模式時元件變深了、外面的側欄與卡片還是白的 —— 深色元件放在白卡片上，
 *    API 表的欄位名幾乎看不見。
 */
const ROOTS = [
  { dir: 'src/components/library', scope: 'file' },
  { dir: 'src/views/docs', scope: 'markup' },
  { dir: 'src/layouts', scope: 'markup' },
]

/**
 * <style> 裡寫死的色值（#fafafa、rgb(55 65 81)）也會讓深色模式破功，
 * 而且上面的 class 檢查完全看不到。
 *
 * ⚠️ ChptTable 的儲存格文字（rgb(55 65 81)）與列分隔線（rgb(229 231 235)）就是這樣
 *    漏掉的：class 全部主題化了，深色模式下表格仍是深灰字、一條條白線。
 *
 * 用 rgb(var(--t-<角色>)) 取主題色。允許：
 *   - 黑色系的陰影與遮罩 rgba(0, 0, 0, …)：兩個主題都該是黑的
 *   - 同一行註明 theme-ok 的刻意固定色（例如品牌色的光暈）
 * 圖表（charts/）另有 D3 以 .attr() 設定的顏色，需要整批處理，暫不在此列。
 */
const STYLE_COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d+[\s,]+\d+[\s,]+\d+[^)]*\)/g
const STYLE_COLOR_OK = /^rgba?\(\s*0[\s,]+0[\s,]+0\b/
const STYLE_SKIP_DIRS = ['src/components/library/charts/']

/** 整份跳過的檔案（理由見上方 3、4、6） */
const ALLOWED_FILES = new Set([
  // 自己的 theme prop（dark / light / info / warning / error 皮膚）
  'src/components/library/ui/ChptTooltip.vue',
  'src/components/library/ui/ChptDataTooltip.vue',
  // 色彩變體裡有叫 dark / light 的 key，同樣是呼叫端選的皮膚而非 app 主題
  'src/components/library/ui/ChptTag.vue',
  'src/components/library/ui/ChptRadio.vue',
  'src/components/library/ui/ChptSwitch.vue',
  'src/components/library/ui/ChptBadge.vue',
  // 終端機風格，兩個主題都刻意維持深色
  'src/components/library/ui/ChptCodeBlock.vue',
  // 深色模式切換鈕本身，自帶 dark: 樣式
  'src/components/library/ui/ChptDarkModeToggle.vue',
  // 深色 canvas 上的疊層 UI
  'src/components/library/viewer/GerberViewer.vue',
  'src/components/library/viewer/PcbLayout.vue',
])

/**
 * 禁止的 class。
 * 只抓「中性色」—— 那是深色模式真正會壞掉的部分（白底、灰字、灰框）。
 * 帶數字的品牌色階不在此列，見上方第 5 點。
 */
const FORBIDDEN = String.raw`(?:bg|text|border|ring|divide|placeholder|from|via|to)-(?:white|neutral-\d{2,3}|gray-\d{2,3}|slate-\d{2,3}|zinc-\d{2,3}|stone-\d{2,3})`

// variant 前綴（hover: / focus: / sm: …）與透明度後綴（/80）都要一起抓出來報告
const PATTERN = new RegExp(
  String.raw`(?<![\w/:-])((?:[a-z][a-z0-9-]*:)*)(${FORBIDDEN})(/\d{1,3})?(?![\w-])`,
  'g'
)

/**
 * ChptIcon 的 color prop 會組成 text-{color}（color="neutral-500" → text-neutral-500），
 * 上面的 class 檢查看不到這種寫法。
 * ⚠️ ChptInput 的放大鏡、ChptFixedTable 的釘選 / 篩選圖示都是這樣漏掉的：深色模式下仍是固定灰。
 */
const COLOR_PROP = /\b(?:color|hover-color|hoverColor)="((?:white|neutral|gray|slate|zinc|stone)(?:-\d{2,3})?)"/g

/** text-white / text-black 是實心底上的文字，兩個主題都正確 */
const EXEMPT_CLASS = /^(?:text-(?:white|black))$/

/**
 * 帶 dark: 前綴的 class 本身就是「只在深色模式生效」的寫法，是正確的，
 * 不能因為裡面含 neutral-800 就被擋下來。
 *
 * ⚠️ 這是第一版檢查器誤判的地方：它把 ChptDarkModeToggle 與
 *    ChptTabNavigation 既有的 dark:bg-neutral-800/80 當成違規，
 *    而那正是這兩個元件唯一做對的部分。
 */
const THEME_SCOPED_PREFIX = /(?:^|:)dark:/

async function collectVueFiles(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await collectVueFiles(full)))
    else if (entry.name.endsWith('.vue')) out.push(full)
  }
  return out
}

/** 把 <script> 區塊換成等量的空行（行號不變） */
function blankScripts(source) {
  return source.replace(/<script[\s\S]*?<\/script>/g, (block) => block.replace(/[^\n]/g, ''))
}

const offenders = []
let scanned = 0

for (const { dir, scope } of ROOTS) for (const file of await collectVueFiles(dir)) {
  const rel = file.replace(/\\/g, '/')
  if (ALLOWED_FILES.has(rel)) continue
  scanned += 1

  const raw = await readFile(file, 'utf8')
  const source = scope === 'markup' ? blankScripts(raw) : raw
  const lines = source.split('\n')

  // <style> 區塊裡的色值
  if (!STYLE_SKIP_DIRS.some((d) => rel.startsWith(d))) {
    for (const block of raw.matchAll(/<style[\s\S]*?<\/style>/g)) {
      const startLine = raw.slice(0, block.index).split('\n').length
      block[0].split('\n').forEach((line, i) => {
        if (line.includes('theme-ok') || /^\s*(\*|\/\*|\/\/)/.test(line)) return
        for (const m of line.matchAll(STYLE_COLOR)) {
          if (STYLE_COLOR_OK.test(m[0])) continue
          offenders.push({ where: `${rel}:${startLine + i}`, cls: `<style> ${m[0]}` })
        }
      })
    }
  }

  lines.forEach((line, idx) => {
    for (const m of line.matchAll(COLOR_PROP)) {
      offenders.push({ where: `${rel}:${idx + 1}`, cls: `color="${m[1]}"（ChptIcon → text-${m[1]}）` })
    }
    for (const m of line.matchAll(PATTERN)) {
      const cls = m[2]
      if (EXEMPT_CLASS.test(cls)) continue
      if (THEME_SCOPED_PREFIX.test(m[1])) continue
      offenders.push({ where: `${rel}:${idx + 1}`, cls: `${m[1]}${cls}${m[3] ?? ''}` })
    }
  })
}

if (offenders.length > 0) {
  console.error('✗ 元件庫或文檔站出現寫死的淺色 class —— 深色模式下這些地方不會跟著翻轉：\n')
  for (const o of offenders.slice(0, 40)) {
    console.error(`  ${o.where}  ${o.cls}`)
  }
  if (offenders.length > 40) console.error(`  …（其餘 ${offenders.length - 40} 處）`)
  console.error(
    '\n請改用主題化角色：\n' +
      '  bg-white          → bg-surface-primary\n' +
      '  bg-neutral-50     → bg-surface-secondary\n' +
      '  text-neutral-700  → text-content-primary\n' +
      '  text-neutral-600  → text-content-secondary\n' +
      '  text-neutral-500  → text-content-tertiary\n' +
      '  border-neutral-200→ border-stroke-light\n' +
      '  border-neutral-300→ border-stroke-default\n' +
      '\n完整對照見 docs/DESIGN_SYSTEM.md 的「深色模式」一節。'
  )
  process.exit(1)
}

console.log(`✓ 主題色 class 檢查通過（掃了 ${scanned} 個元件與文檔頁，無寫死的淺色）`)
