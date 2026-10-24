/**
 * 圖表共用的文字工具：估算文字寬度、在色塊上挑看得清楚的文字色
 */

import * as d3 from 'd3'

/**
 * 估算文字寬度（px）。jsdom 與 SSR 沒有 measureText，用字元寬度近似：
 * 中日韓全形字約一個字高、其他約 0.6 個字高。用來判斷標籤放不放得進長條、要預留多寬。
 */
export function estimateTextWidth(text: string, fontSize = 12): number {
  let w = 0
  for (const ch of text) {
    w += /[\u2E80-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF00-\uFFEF]/.test(ch) ? fontSize : fontSize * 0.6
  }
  return w
}

/**
 * 色塊（長條、扇形）上的文字要用深色還是白色：依底色的相對亮度（WCAG）選對比較高的那個。
 * 解析不了的顏色（例如沒解開的 CSS 變數）回傳白色。
 */
export function readableTextColor(background: string): '#ffffff' | '#111827' {
  const c = d3.color(background)?.rgb()
  if (!c) return '#ffffff'
  const lin = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const L = 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
  // 白字對比 (1.05) / (L + 0.05)；深字（#111827，L≈0.012）對比 (L + 0.05) / 0.062
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.062 ? '#ffffff' : '#111827'
}
