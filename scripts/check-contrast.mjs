#!/usr/bin/env node
/**
 * 主題色對比度檢查（WCAG 2.1 SC 1.4.3 / 1.4.11）
 *
 * 深色模式不是「把顏色反過來」就好 —— 同一個品牌色階在淺色底與深色底上的
 * 對比度差很多。primary-600（#2563EB）在白底上是 5.17:1（過 AA），
 * 但在深色底 #171717 上只有 3.47:1（不過 AA 的 4.5:1）。
 *
 * 因此 themed token 的深色值必須逐一驗算，不能憑感覺挑色階。
 * 這支腳本把「前景 × 它實際會出現的背景」全部組合算一遍，任何一組
 * 低於門檻就讓 CI 失敗。
 *
 * 門檻：
 *   - 一般文字            4.5:1（AA）
 *   - 大字（≥18.66px bold 或 ≥24px）3:1（AA Large）
 *   - 非文字（邊框 / icon / 焦點框）3:1（SC 1.4.11）
 */
import { themed } from '../src/design/tokens.js'

const AA_TEXT = 4.5
const AA_NON_TEXT = 3

/** #RRGGBB → [r, g, b]（0-255） */
function parseHex(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) throw new Error(`不是 6 位十六進位色碼：${hex}`)
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** WCAG 相對亮度 */
function luminance(hex) {
  const [r, g, b] = parseHex(hex).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** 對比度（1~21） */
function contrast(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/**
 * 要檢查的組合。
 * 每一組寫成 [說明, 前景 role, 背景 role, 門檻]，兩個主題各算一次。
 */
const PAIRS = [
  // --- 文字 × 背景 ---
  ['主要文字 × 主背景', 'content-primary', 'surface-primary', AA_TEXT],
  ['主要文字 × 次背景', 'content-primary', 'surface-secondary', AA_TEXT],
  ['主要文字 × 第三背景', 'content-primary', 'surface-tertiary', AA_TEXT],
  ['次要文字 × 主背景', 'content-secondary', 'surface-primary', AA_TEXT],
  ['次要文字 × 次背景', 'content-secondary', 'surface-secondary', AA_TEXT],
  ['第三文字 × 主背景', 'content-tertiary', 'surface-primary', AA_TEXT],
  ['實心底白字 × 實心品牌底', 'content-on-solid', 'accent-solid', AA_TEXT],

  // --- 品牌 / 語意前景 × 背景 ---
  ['品牌前景 × 主背景', 'accent', 'surface-primary', AA_TEXT],
  ['品牌前景 × 次背景', 'accent', 'surface-secondary', AA_TEXT],
  ['品牌前景 × 品牌淡底', 'accent-on-subtle', 'accent-subtle', AA_TEXT],
  ['成功前景 × 主背景', 'success', 'surface-primary', AA_TEXT],
  ['成功前景 × 成功淡底', 'success-on-subtle', 'success-subtle', AA_TEXT],
  ['警告前景 × 主背景', 'warning', 'surface-primary', AA_TEXT],
  ['警告前景 × 警告淡底', 'warning-on-subtle', 'warning-subtle', AA_TEXT],
  ['危險前景 × 主背景', 'danger', 'surface-primary', AA_TEXT],
  ['危險前景 × 危險淡底', 'danger-on-subtle', 'danger-subtle', AA_TEXT],
  ['資訊前景 × 主背景', 'info', 'surface-primary', AA_TEXT],
  ['資訊前景 × 資訊淡底', 'info-on-subtle', 'info-subtle', AA_TEXT],

  // --- 淡底的 hover 狀態：背景變了，文字仍須達標 ---
  ['品牌前景 × 品牌淡底hover', 'accent-on-subtle', 'accent-subtle-hover', AA_TEXT],
  ['成功前景 × 成功淡底hover', 'success-on-subtle', 'success-subtle-hover', AA_TEXT],
  ['警告前景 × 警告淡底hover', 'warning-on-subtle', 'warning-subtle-hover', AA_TEXT],
  ['危險前景 × 危險淡底hover', 'danger-on-subtle', 'danger-subtle-hover', AA_TEXT],
  ['資訊前景 × 資訊淡底hover', 'info-on-subtle', 'info-subtle-hover', AA_TEXT],

  // --- 實心底上的白字（按鈕）---
  ['實心底白字 × 實心成功底', 'content-on-solid', 'success-solid', AA_TEXT],
  ['實心底白字 × 實心警告底', 'content-on-solid', 'warning-solid', AA_TEXT],
  ['實心底白字 × 實心危險底', 'content-on-solid', 'danger-solid', AA_TEXT],
  ['實心底白字 × 實心資訊底', 'content-on-solid', 'info-solid', AA_TEXT],

  // --- 非文字：邊框與焦點框（3:1）---
  // ⚠️ 刻意不檢查 stroke-light / stroke-default / stroke-medium。
  //    WCAG 1.4.11 要求的是「辨識元件所必需的視覺邊界」達 3:1，
  //    而這三個角色的實際用途是表格分隔線、卡片外框這類裝飾性邊界。
  //    以 #D4D4D4 on #FFFFFF 來說只有 1.6:1 —— 業界（含 Tailwind 預設）
  //    普遍如此，硬拉到 3:1 會讓整個 UI 變成粗黑框。
  //    真正屬於 1.4.11 範圍的焦點指示器則必須檢查：
  ['焦點框 × 主背景', 'stroke-focus', 'surface-primary', AA_NON_TEXT],
  ['焦點框 × 次背景', 'stroke-focus', 'surface-secondary', AA_NON_TEXT],
]

const failures = []
const rows = []

for (const theme of ['light', 'dark']) {
  for (const [label, fg, bg, threshold] of PAIRS) {
    const fgHex = themed[fg]?.[theme]
    const bgHex = themed[bg]?.[theme]
    if (!fgHex || !bgHex) {
      failures.push(`${theme} / ${label}：找不到 role（${fg} 或 ${bg}）`)
      continue
    }
    const ratio = contrast(fgHex, bgHex)
    const pass = ratio >= threshold
    rows.push({ theme, label, fgHex, bgHex, ratio, threshold, pass })
    if (!pass) {
      failures.push(
        `${theme} / ${label}：${fgHex} on ${bgHex} = ${ratio.toFixed(2)}:1，` +
          `低於門檻 ${threshold}:1`
      )
    }
  }
}

// 只在失敗或 --verbose 時印出完整表格，避免 CI log 太吵
if (failures.length > 0 || process.argv.includes('--verbose')) {
  const pad = (s, n) => String(s).padEnd(n, ' ')
  console.log(
    `\n${pad('主題', 6)}${pad('組合', 26)}${pad('前景', 10)}${pad('背景', 10)}${pad('對比', 8)}門檻`
  )
  console.log('-'.repeat(72))
  for (const r of rows) {
    console.log(
      `${r.pass ? ' ' : '✗'}${pad(r.theme, 5)}${pad(r.label, 26)}${pad(r.fgHex, 10)}` +
        `${pad(r.bgHex, 10)}${pad(r.ratio.toFixed(2) + ':1', 8)}${r.threshold}:1`
    )
  }
  console.log()
}

if (failures.length > 0) {
  console.error('✗ 主題色對比度未達 WCAG AA：\n')
  for (const f of failures) console.error(`  ${f}`)
  console.error(
    `\n共 ${failures.length} 組。請調整 src/design/tokens.js 的 themed 色階` +
      '（深色底通常要往較亮的階移，例如 600 → 400）。'
  )
  process.exit(1)
}

console.log(
  `✓ 主題色對比度檢查通過（淺色 / 深色各 ${PAIRS.length} 組，共 ${rows.length} 組）`
)
